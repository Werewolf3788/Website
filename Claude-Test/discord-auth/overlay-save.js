/* ============================================================================
 * Overlay Studio - save overlays to GitHub (mounted on ww-discord-auth)
 *
 * Saved overlays live in the Website repo as small JSON files:
 *     overlay/saves/{id}.json   { id, name, channel, c, editHash, created, updated }
 *   c        = the packed design (same string the #c=... links use)
 *   editHash = sha256 of the private edit key the builder keeps; only that key can overwrite the file
 *
 *   POST /overlay/save   c, name, [id, key]  -> { id, key }     new save (no id) or update (id + key)
 *   GET  /overlay/get/:id                    -> { id, name, channel, c, updated }   (OBS polls this)
 *
 * GitHub key: Key Vault  user_secrets/{DISCORD_APP_OWNER_KEY}/github_token   (env GITHUB_TOKEN overrides)
 * Commits say [skip ci] so saving never runs the site's deploy/sync workflows.
 * Nothing goes to Firebase except reading the key.
 * ========================================================================== */
'use strict';
const crypto = require('crypto');
const zlib = require('zlib');

const REPO = process.env.OVERLAY_REPO || 'Werewolf3788/website';
const BRANCH = process.env.OVERLAY_BRANCH || 'main';
const DIR = 'overlay/saves';
const SITE_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];
const MAX_CODE = 16000;              // packed design size limit (a normal one is ~300-1500 chars)
const SAVES_PER_HOUR = 30;           // per visitor IP

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const okId = id => /^[a-z0-9]{10}$/.test(String(id || ''));
const newId = () => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const b = crypto.randomBytes(10); for (let i = 0; i < 10; i++) s += a[b[i] % a.length]; return s; };

// unpack the design so junk can't be saved (same format as overlay-core.js)
function unpack(code) {
  code = String(code || '');
  if (!/^[zj][A-Za-z0-9_-]+$/.test(code) || code.length > MAX_CODE) return null;
  try {
    const buf = Buffer.from(code.slice(1).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const json = code[0] === 'z' ? zlib.inflateRawSync(buf, { maxOutputLength: 200000 }).toString('utf8') : buf.toString('utf8');
    const o = JSON.parse(json);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch (e) { return null; }
}

function mountOverlaySave(app, { admin, fetchFn, cors: baseCors }) {
  const db = () => admin.database();
  const cors = (req, res) => {
    const o = req.headers.origin;
    if (o && SITE_ORIGINS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    else baseCors(req, res);
  };

  let tok = { v: '', at: 0 };
  async function ghToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
    if (tok.v && Date.now() - tok.at < 300000) return tok.v;
    const owner = process.env.DISCORD_APP_OWNER_KEY; let v = '';
    if (owner) { try { v = String((await db().ref('user_secrets/' + owner + '/github_token').once('value')).val() || '').trim(); } catch (e) { console.error('[overlay save key]', e && e.message); } }
    tok = { v, at: Date.now() }; return v;
  }
  async function gh(method, path, body) {
    const t = await ghToken(); if (!t) throw Object.assign(new Error('no github_token in Key Vault'), { code: 'NOKEY' });
    const r = await fetchFn('https://api.github.com/repos/' + REPO + '/contents/' + path + (method === 'GET' ? '?ref=' + BRANCH : ''), {
      method, headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ww-overlay-studio', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  }

  const cache = new Map();   // id -> { at, doc, sha }   keeps OBS polling off GitHub
  async function load(id, fresh) {
    const hit = cache.get(id);
    if (hit && !fresh && Date.now() - hit.at < 10 * 60000) return hit;
    const r = await gh('GET', DIR + '/' + id + '.json');
    if (r.status === 404) { const miss = { at: Date.now(), doc: null, sha: '' }; cache.set(id, miss); return miss; }
    if (r.status !== 200 || !r.json || !r.json.content) throw new Error('GitHub read failed (' + r.status + ')');
    const doc = JSON.parse(Buffer.from(r.json.content, 'base64').toString('utf8'));
    const out = { at: Date.now(), doc, sha: r.json.sha }; cache.set(id, out); return out;
  }
  const pub = d => ({ id: d.id, name: d.name, channel: d.channel, c: d.c, updated: d.updated });

  app.get('/overlay/get/:id', async (req, res) => {
    cors(req, res); res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase(); if (!okId(id)) return res.status(404).json({ error: 'not found' });
    try { const h = await load(id); if (!h.doc) return res.status(404).json({ error: 'not found' }); res.json(pub(h.doc)); }
    catch (e) { console.error('[overlay get]', e && e.message); res.status(502).json({ error: 'try again' }); }
  });

  const hits = new Map();   // ip -> [times]
  function limited(ip) {
    const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600000);
    list.push(now); hits.set(ip, list); if (hits.size > 5000) hits.clear();
    return list.length > SAVES_PER_HOUR;
  }

  app.post('/overlay/save', async (req, res) => {
    cors(req, res);
    try {
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return res.status(429).json({ error: 'Too many saves - wait a bit and try again.' });
      const b = req.body || {}, code = String(b.c || ''), cfg = unpack(code);
      if (!cfg) return res.status(400).json({ error: 'That design could not be read.' });
      const name = String(b.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) || 'My overlay';
      const channel = String(cfg.channel || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25);

      let id = String(b.id || '').toLowerCase(), key = String(b.key || ''), sha, created = Date.now();
      if (id) {                                         // update: must own it
        if (!okId(id) || key.length < 20) return res.status(403).json({ error: 'You can only change overlays you saved.' });
        const h = await load(id, true);
        if (!h.doc) return res.status(404).json({ error: 'That saved overlay no longer exists.' });
        if (h.doc.editHash !== sha256(key)) return res.status(403).json({ error: 'You can only change overlays you saved.' });
        sha = h.sha; created = h.doc.created || created;
      } else {                                          // new save
        do { id = newId(); } while ((await load(id, true)).doc);
        key = crypto.randomBytes(18).toString('base64url');
      }

      const doc = { id, name, channel, c: code, editHash: sha256(key), created, updated: Date.now() };
      const body = { message: 'Overlay Studio: save ' + id + (channel ? ' (' + channel + ')' : '') + ' [skip ci]',
        content: Buffer.from(JSON.stringify(doc, null, 1)).toString('base64'), branch: BRANCH,
        committer: { name: 'Overlay Studio', email: 'overlay-studio@users.noreply.github.com' } };
      if (sha) body.sha = sha;
      let r = await gh('PUT', DIR + '/' + id + '.json', body);
      if (r.status === 409 || r.status === 422) {       // someone else's commit landed first: refresh sha, try once more
        const h = await load(id, true); if (h.sha) body.sha = h.sha; r = await gh('PUT', DIR + '/' + id + '.json', body);
      }
      if (r.status !== 200 && r.status !== 201) { console.error('[overlay save]', r.status, JSON.stringify(r.json).slice(0, 300)); return res.status(502).json({ error: 'GitHub didn’t accept the save (' + r.status + '). Try again.' }); }
      cache.set(id, { at: Date.now(), doc, sha: r.json && r.json.content && r.json.content.sha });
      console.log('[overlay] saved', id, channel);
      res.json({ id, key, updated: doc.updated });
    } catch (e) {
      console.error('[overlay save]', e && e.message);
      res.status(e && e.code === 'NOKEY' ? 503 : 500).json({ error: e && e.code === 'NOKEY' ? 'Saving isn’t set up yet (no GitHub key).' : 'Could not save right now. Try again.' });
    }
  });
}
module.exports = { mountOverlaySave, unpack };
