/* ============================================================================
 * ww-discord-auth  -  "Sign in with Discord" for the Werewolf site
 *
 *   browser  ->  GET /login?next=<page>          -> redirect to Discord
 *   Discord  ->  GET /callback?code&state        -> we verify, look up the verified
 *                                                   Discord email, find-or-create the
 *                                                   Firebase user with that SAME email,
 *                                                   mint a custom token
 *   browser  <-  redirect to <page>#ww_discord_token=...   (ww-auth.js signs in with it)
 *
 * Because the Firebase user is matched by e-mail, a Discord sign-in lands on the same
 * account (users/{emailKey}) as Google sign-in - same friends, profile, chat.
 * Unverified Discord e-mails are refused.
 *
 * Env: DISCORD_CLIENT_SECRET, FIREBASE_SERVICE_ACCOUNT (JSON), STATE_SECRET, PUBLIC_URL,
 *      ALLOWED_ORIGINS (comma separated, e.g. https://werewolf3788.github.io)
 *      The Discord Application ID (= OAuth client id) is read from Firebase:
 *      users/{DISCORD_APP_OWNER_KEY}/discord_signin_id  (saved from Settings).
 *      DISCORD_CLIENT_ID can override it.
 * ========================================================================== */
'use strict';
const crypto = require('crypto');
const express = require('express');

const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://werewolf3788.github.io').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const STATE_SECRET = process.env.STATE_SECRET || '';
const REDIRECT_URI = PUBLIC_URL + '/callback';

// Application ID lives in Firebase (Settings > Discord sign-in); cached for 5 minutes.
let idCache = { v: '', at: 0 };
async function getClientId(admin) {
  if (process.env.DISCORD_CLIENT_ID) return process.env.DISCORD_CLIENT_ID;
  if (idCache.v && Date.now() - idCache.at < 300000) return idCache.v;
  const key = process.env.DISCORD_APP_OWNER_KEY;
  if (!key) return '';
  const v = (await admin.database().ref('users/' + key + '/discord_signin_id').once('value')).val();
  idCache = { v: /^\d{17,20}$/.test(String(v || '')) ? String(v) : '', at: Date.now() };
  return idCache.v;
}

/* ---------- signed state (CSRF + remembers where to send the user back) ---------- */
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', STATE_SECRET).update(data).digest('base64url');
function makeState(payload) { const d = b64(JSON.stringify(payload)); return d + '.' + sign(d); }
function readState(state) {
  const [d, sig] = String(state || '').split('.');
  if (!d || !sig) return null;
  const want = sign(d);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const p = JSON.parse(Buffer.from(d, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
// Only send people back to our own pages
function safeNext(next) {
  try { const u = new URL(String(next)); return ALLOWED.includes(u.origin) ? u.origin + u.pathname + u.search : null; } catch (e) { return null; }
}
const cookie = (req, name) => (String(req.headers.cookie || '').split(/;\s*/).map(c => c.split('=')).find(c => c[0] === name) || [])[1];

function backWithError(res, next, msg) {
  const to = safeNext(next);
  if (!to) return res.status(400).send('Sign-in problem: ' + msg);
  res.redirect(to + '#ww_discord_error=' + encodeURIComponent(msg));
}

/* ---------- app ---------- */
function createApp(deps) {
  const { admin, fetchFn } = deps;
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => res.send('ok'));

  app.get('/login', async (req, res) => {
    const next = safeNext(req.query.next);
    if (!next) return res.status(400).send('Bad or missing "next" address.');
    let clientId = '';
    try { clientId = await getClientId(admin); } catch (e) { console.error('[client id]', e && e.message); }
    if (!clientId) return backWithError(res, next, 'Discord sign-in is not set up yet (no Application ID saved).');
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = makeState({ next, nonce, exp: Date.now() + 10 * 60 * 1000 });
    res.setHeader('Set-Cookie', `wwds=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    const q = new URLSearchParams({ client_id: clientId, redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'identify email', state, prompt: 'none' });
    res.redirect('https://discord.com/oauth2/authorize?' + q);
  });

  app.get('/callback', async (req, res) => {
    const st = readState(req.query.state);
    if (!st || cookie(req, 'wwds') !== st.nonce) return res.status(400).send('Sign-in expired or invalid. Go back and try again.');
    res.setHeader('Set-Cookie', 'wwds=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    if (req.query.error || !req.query.code) return backWithError(res, st.next, 'Discord sign-in was cancelled.');
    try {
      const tr = await fetchFn('https://discord.com/api/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: await getClientId(admin), client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: REDIRECT_URI })
      });
      const tok = await tr.json();
      if (!tok.access_token) {
        // No secrets here: only Discord's reason and which redirect address we sent.
        console.error('[token] Discord refused:', tr.status, tok.error, tok.error_description, '| redirect_uri =', REDIRECT_URI,
          '| secret set:', !!process.env.DISCORD_CLIENT_SECRET);
      }
      if (!tok.access_token) return backWithError(res, st.next, 'Discord did not accept the sign-in. Try again.');
      const me = await (await fetchFn('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok.access_token } })).json();
      const email = String(me.email || '').toLowerCase();
      if (!email || me.verified !== true) return backWithError(res, st.next, 'Your Discord email is missing or not verified. Verify it in Discord, then try again.');

      let user;
      try { user = await admin.auth().getUserByEmail(email); }
      catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
        const avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : undefined;
        user = await admin.auth().createUser({ email, emailVerified: true, displayName: me.global_name || me.username, photoURL: avatar });
      }
      const token = await admin.auth().createCustomToken(user.uid, { discord_id: String(me.id) });
      res.redirect(st.next + '#ww_discord_token=' + encodeURIComponent(token));
    } catch (e) {
      console.error('[callback]', e && e.message);
      backWithError(res, st.next, 'Something went wrong signing in with Discord.');
    }
  });
  return app;
}

module.exports = { createApp, makeState, readState, safeNext };

if (require.main === module) {
  for (const k of ['DISCORD_CLIENT_SECRET', 'FIREBASE_SERVICE_ACCOUNT', 'STATE_SECRET', 'PUBLIC_URL']) {
    if (!process.env[k]) { console.error('Missing env var ' + k); process.exit(1); }
  }
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: 'https://entertainment-71888-default-rtdb.firebaseio.com' });
  createApp({ admin, fetchFn: fetch }).listen(process.env.PORT || 3000, () => console.log('ww-discord-auth listening'));
}
