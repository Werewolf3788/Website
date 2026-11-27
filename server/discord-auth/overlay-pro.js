/* ============================================================================
 * Overlay Studio "Remove watermark" passes (mounted on ww-discord-auth next to the game shop)
 *
 *   GET  /overlay/pro/:channel           -> { pro, until }   is this Twitch channel paid up? (the live overlay asks)
 *   GET  /overlay/plans                  -> { currency, tier, plans }
 *   Paying happens on Buy Me a Coffee (bmc.js): the page gets a claim code from POST /bmc/claim (kind=overlay),
 *   and when the payment webhook arrives bmc.js calls grantPass() below.
 *        Firestore:  overlay_pro/{channel}   { until, plan, orders[], payer, updated }
 *                    purchases/bmc_{claim}   ledger row (create() fails on reuse = no double credit)
 *        Buying again while still paid adds the time on to the end.
 *
 * Passes are paid up front (not auto-renewing): month = 31 days, year = 365 days.
 * Price depends on the channel: Twitch Affiliates/Partners pay the 'earner' price (checked with Twitch by the server,
 * using twitch_client_id / twitch_client_secret from the Key Vault). See PRICES below.
 * No sign-in needed - the pass belongs to the Twitch channel typed in the Overlay Studio.
 * ========================================================================== */
'use strict';

// ---- PRICES (change them here) ----
//   standard = regular streamers;  earner = Twitch Affiliates and Partners (they're making money from streaming)
const PRICES = {
  standard: { month: '5.00', year: '50.00' },
  earner:   { month: '8.00', year: '80.00' }
};
const PLAN_DAYS = { month: 31, year: 365 };
const PLAN_NAME = { month: 'Overlay Studio - 1 month, no watermark', year: 'Overlay Studio - 1 year, no watermark' };
function plan(tier, id) { const p = (PRICES[tier] || {})[id]; return p ? { name: PLAN_NAME[id], price: p, days: PLAN_DAYS[id] } : null; }
const PLANS = PRICES;   // kept for anything that imported it
const CURRENCY = 'USD';
const DAY = 86400000;
const money = v => (Math.round(parseFloat(v) * 100) / 100).toFixed(2);
const cleanChan = c => String(c || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.|m\.)?(twitch\.tv|kick\.com|youtube\.com)\/((channel|c|user)\/)?/, '').replace(/^@/, '').split(/[/?#\s]/)[0];
const okChan = c => /^[a-z0-9_]{3,25}$/.test(c);
// The pass belongs to a streaming account: platform + username. No sign-up needed.
//   doc id in Firestore overlay_pro:  twitch -> "name" (as before),  youtube -> "youtube:name",  kick -> "kick:name"
const PLAT = { twitch: /^[a-z0-9_]{3,25}$/, youtube: /^[a-z0-9_.-]{3,30}$/, kick: /^[a-z0-9_-]{3,25}$/ };
const HOST = { twitch: 'twitch.tv/', youtube: 'youtube.com/@', kick: 'kick.com/' };
function account(platform, name) {
  platform = PLAT[platform] ? platform : 'twitch'; name = cleanChan(name);
  if (!PLAT[platform].test(name)) return null;
  return { platform, name, id: platform === 'twitch' ? name : platform + ':' + name, label: HOST[platform] + name };
}
const okId = id => /^([a-z]+:)?[a-z0-9_.-]{3,30}$/.test(String(id || ''));

const SITE_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];

function mountOverlayPro(app, { admin, fetchFn, cors: baseCors }) {
  const fs = () => admin.firestore();
  const cors = (req, res) => {   // the site's own origins always allowed, plus whatever the server already allows
    const o = req.headers.origin;
    if (o && SITE_ORIGINS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    else baseCors(req, res);
  };
  const proCache = new Map();   // channel -> { at, body }   keeps Firestore reads tiny

  // ---- Is this channel a Twitch Affiliate / Partner? (Twitch app login, keys from the Key Vault) ----
  let tw = { token: '', exp: 0 }; const tierCache = new Map();
  async function vault(name) {
    const owner = process.env.DISCORD_APP_OWNER_KEY; if (!owner) return '';
    try { return String((await admin.database().ref('user_secrets/' + owner + '/' + name).once('value')).val() || '').trim(); } catch (e) { return ''; }
  }
  async function twitchToken() {
    if (tw.token && Date.now() < tw.exp) return tw;
    const id = process.env.TWITCH_CLIENT_ID || await vault('twitch_client_id'), secret = process.env.TWITCH_CLIENT_SECRET || await vault('twitch_client_secret');
    if (!id || !secret) throw new Error('twitch keys missing from Key Vault');
    const r = await fetchFn('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }).toString() });
    const j = await r.json(); if (!j.access_token) throw new Error('twitch token failed (' + r.status + ')');
    tw = { token: j.access_token, id, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 }; return tw;
  }
  // -> { tier: 'standard'|'earner', type: ''|'affiliate'|'partner', found }
  async function channelTier(ch) {
    const hit = tierCache.get(ch); if (hit && Date.now() - hit.at < 3600000) return hit.v;
    const t = await twitchToken();
    const r = await fetchFn('https://api.twitch.tv/helix/users?login=' + encodeURIComponent(ch), { headers: { 'Client-Id': t.id, Authorization: 'Bearer ' + t.token } });
    if (r.status === 401) { tw.exp = 0; throw new Error('twitch auth expired'); }
    const j = await r.json(), u = (j.data || [])[0];
    const type = u ? String(u.broadcaster_type || '') : '';
    const v = { tier: type === 'affiliate' || type === 'partner' ? 'earner' : 'standard', type, found: !!u };
    tierCache.set(ch, { at: Date.now(), v }); return v;
  }

  // ---- Allies: the owner's friends list (users/{owner}/friends) gets "Match my game" free ----
  // friend code -> accounts/friend_codes/{CODE} -> user key -> users/{key}/twitch_username
  // Kept as a set of lower-case Twitch names, rebuilt at most every 10 minutes.
  let allies = { at: 0, set: new Set() };
  async function allyChannels() {
    if (Date.now() - allies.at < 10 * 60000) return allies.set;
    const owner = process.env.DISCORD_APP_OWNER_KEY, db = admin.database(), set = new Set();
    try {
      const keys = new Set(owner ? [owner] : []);
      const friends = owner ? (await db.ref('users/' + owner + '/friends').once('value')).val() || {} : {};
      await Promise.all(Object.keys(friends).map(async code => {
        const f = friends[code] || {}, c = String(f.friend_code || code).toUpperCase();
        const k = (await db.ref('accounts/friend_codes/' + c).once('value')).val();
        if (typeof k === 'string' && k) keys.add(k);
      }));
      await Promise.all([...keys].map(async k => {
        const t = cleanChan((await db.ref('users/' + k + '/twitch_username').once('value')).val() || '');
        if (okChan(t)) set.add(t);
      }));
      allies = { at: Date.now(), set };
    } catch (e) { console.error('[overlay allies]', e && e.message); }
    return allies.set;
  }

  // /overlay/pro/:name?platform=twitch|youtube|kick  -> { pro, until, tier, month, year, ally, games }
  //   ally  = this Twitch channel belongs to the owner or someone on his friends list
  //   games = "Match my game" is unlocked (paid pass OR ally)
  app.get('/overlay/pro/:channel', async (req, res) => {
    cors(req, res);
    const a = account(req.query.platform, req.params.channel); if (!a) return res.json({ pro: false });
    const hit = proCache.get(a.id); if (hit && Date.now() - hit.at < 5 * 60000) return res.json(hit.body);
    try {
      const d = await fs().collection('overlay_pro').doc(a.id).get();
      const until = d.exists ? Number(d.data().until || 0) : 0;
      let tier = 'standard'; if (a.platform === 'twitch') { try { tier = (await channelTier(a.name)).tier; } catch (e) { /* Twitch unreachable: regular price */ } }
      let ally = false; if (a.platform === 'twitch') { try { ally = (await allyChannels()).has(a.name); } catch (e) { /* keep false */ } }
      const pro = until > Date.now();
      const body = { pro, until, tier, month: PRICES[tier].month, year: PRICES[tier].year, account: a.label, ally, games: pro || ally };
      proCache.set(a.id, { at: Date.now(), body }); res.json(body);
    } catch (e) { console.error('[overlay pro]', e && e.message); res.json({ pro: false }); }
  });

  app.get('/overlay/plans', async (req, res) => {
    cors(req, res);
    const a = account(req.query.platform, req.query.channel); let info = { tier: 'standard', type: '', found: !!a };
    if (a && a.platform === 'twitch') { try { info = await channelTier(a.name); } catch (e) { console.error('[overlay tier]', e && e.message); return res.status(502).json({ error: 'Could not check that channel with Twitch. Try again.' }); } }
    const plans = {}; Object.keys(PLAN_DAYS).forEach(id => { plans[id] = plan(info.tier, id); });
    res.json({ provider: 'bmc', currency: CURRENCY, tier: info.tier, broadcasterType: info.type, found: info.found,
      platform: a ? a.platform : '', account: a ? a.label : '', plans, prices: PRICES });
  });

  // ---- used by bmc.js (Buy Me a Coffee) ----
  // price for an account + plan, checked with Twitch for Affiliate/Partner pricing
  async function quote(platform, channel, planId) {
    const a = account(platform, channel);
    if (!a) return { error: 'Type your streaming username first.' };
    if (!PLAN_DAYS[planId]) return { error: 'Pick monthly or yearly.' };
    let info = { tier: 'standard', found: true };
    if (a.platform === 'twitch') {
      try { info = await channelTier(a.name); } catch (e) { console.error('[overlay tier]', e && e.message); return { status: 502, error: 'Could not check your channel with Twitch. Try again.' }; }
      if (!info.found) return { error: 'Couldn’t find twitch.tv/' + a.name + ' - check the spelling.' };
    }
    const P = plan(info.tier, planId);
    return { id: a.id, label: a.label, plan: planId, tier: info.tier, days: P.days, name: P.name + ' for ' + a.label, price: P.price };
  }
  // add the pass time (on top of any time left). ref = ledger id, for the history list.
  async function grantPass(ch, planId, tier, ref, payer) {
    const days = PLAN_DAYS[planId] || 0; if (!okId(ch) || !days) throw new Error('bad pass');
    const doc = fs().collection('overlay_pro').doc(ch);
    const until = await fs().runTransaction(async t => {
      const cur = await t.get(doc), d = cur.exists ? cur.data() : {};
      const start = Math.max(Date.now(), Number(d.until || 0));
      const next = start + days * DAY;
      t.set(doc, { channel: ch, platform: ch.indexOf(':') > 0 ? ch.split(':')[0] : 'twitch', name: ch.split(':').pop(), until: next, plan: planId, tier, payer: payer || '', updated: Date.now(), orders: (d.orders || []).concat(ref).slice(-50) }, { merge: true });
      return next;
    });
    proCache.delete(ch);
    return until;
  }
  return { quote, grantPass };
}
module.exports = { mountOverlayPro, PLANS };
