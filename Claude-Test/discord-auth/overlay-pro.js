/* ============================================================================
 * Overlay Studio "Remove watermark" passes (mounted on ww-discord-auth next to the game shop)
 *
 *   GET  /overlay/pro/:channel           -> { pro, until }   is this Twitch channel paid up? (the live overlay asks)
 *   GET  /overlay/plans                  -> { clientId, currency, plans }
 *   POST /overlay/create  channel, plan  -> { id }            PayPal order for that plan's fixed price
 *   POST /overlay/capture orderId        -> { ok, until }
 *        Captured with PayPal by the server; only COMPLETED payments for the exact price count, each order once.
 *        Firestore:  overlay_pro/{channel}   { until, plan, orders[], payer, updated }
 *                    purchases/{orderId}     ledger row (create() fails on reuse = no double credit)
 *        Buying again while still paid adds the time on to the end.
 *
 * Passes are paid up front (not auto-renewing): month = 31 days, year = 365 days.
 * Price depends on the channel: Twitch Affiliates/Partners pay the 'earner' price (checked with Twitch by the server,
 * using twitch_client_id / twitch_client_secret from the Key Vault). See PRICES below.
 * No sign-in needed - the pass belongs to the Twitch channel typed in the Overlay Studio.
 * Uses the same PayPal keys as the game shop (Key Vault: paypal_client_id, paypal_secret, paypal_mode).
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

function mountOverlayPro(app, { admin, fetchFn, cors: baseCors, paypal }) {
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
    cors(req, res); const k = await paypal.keys();
    const a = account(req.query.platform, req.query.channel); let info = { tier: 'standard', type: '', found: !!a };
    if (a && a.platform === 'twitch') { try { info = await channelTier(a.name); } catch (e) { console.error('[overlay tier]', e && e.message); return res.status(502).json({ error: 'Could not check that channel with Twitch. Try again.' }); } }
    const plans = {}; Object.keys(PLAN_DAYS).forEach(id => { plans[id] = plan(info.tier, id); });
    res.json({ clientId: k.id && k.secret ? k.id : '', currency: CURRENCY, mode: k.mode, tier: info.tier, broadcasterType: info.type, found: info.found,
      platform: a ? a.platform : '', account: a ? a.label : '', plans, prices: PRICES });
  });

  app.post('/overlay/create', async (req, res) => {
    cors(req, res);
    try {
      const b = req.body || {}, a = account(b.platform, b.channel), planId = String(b.plan || '');
      if (!a) return res.status(400).json({ error: 'Type your streaming username first.' });
      if (!PLAN_DAYS[planId]) return res.status(400).json({ error: 'Pick monthly or yearly.' });
      const ch = a.id;
      let info = { tier: 'standard', found: true };
      if (a.platform === 'twitch') {
        try { info = await channelTier(a.name); } catch (e) { console.error('[overlay tier]', e && e.message); return res.status(502).json({ error: 'Could not check your channel with Twitch. Try again.' }); }
        if (!info.found) return res.status(400).json({ error: 'Couldn’t find twitch.tv/' + a.name + ' - check the spelling.' });
      }
      const P = plan(info.tier, planId);
      const k = await paypal.keys(); if (!k.id || !k.secret) return res.status(503).json({ error: 'Payments aren’t set up yet.' });
      const r = await paypal.papi(k, '/v2/checkout/orders', { intent: 'CAPTURE',
        purchase_units: [{ reference_id: 'overlay_' + planId, custom_id: 'overlay|' + ch + '|' + planId + '|' + P.price + '|' + info.tier, description: (P.name + ' for ' + a.label).slice(0, 127), amount: { currency_code: CURRENCY, value: P.price } }],
        application_context: { brand_name: 'Werewolf Overlay Studio', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } });
      if (r.status >= 300 || !r.json || !r.json.id) { console.error('[overlay create]', r.status, JSON.stringify(r.json)); return res.status(502).json({ error: 'PayPal could not start the order.' }); }
      res.json({ id: r.json.id });
    } catch (e) { console.error('[overlay create]', e && e.message); res.status(500).json({ error: 'Could not start the order.' }); }
  });

  app.post('/overlay/capture', async (req, res) => {
    cors(req, res);
    try {
      const orderId = String((req.body && req.body.orderId) || ''); if (!/^[A-Z0-9]{8,32}$/.test(orderId)) return res.status(400).json({ error: 'Bad order.' });
      const k = await paypal.keys(); if (!k.id || !k.secret) return res.status(503).json({ error: 'Payments aren’t set up yet.' });
      const ledger = fs().collection('purchases').doc(orderId);
      const had = await ledger.get();
      if (had.exists) { const pd = await fs().collection('overlay_pro').doc(had.data().channel || '_').get(); return res.json({ ok: true, already: true, until: pd.exists ? pd.data().until : 0 }); }

      let r = await paypal.papi(k, '/v2/checkout/orders/' + orderId + '/capture');
      if (r.status === 422 && r.json && JSON.stringify(r.json).indexOf('ORDER_ALREADY_CAPTURED') >= 0)
        r = { status: 200, json: await fetchFn(k.api + '/v2/checkout/orders/' + orderId, { headers: { Authorization: 'Bearer ' + await paypal.token(k) } }).then(x => x.json()) };
      const o = r.json || {}, pu = (o.purchase_units || [])[0] || {}, cap = (((pu.payments || {}).captures) || [])[0] || {};
      const [tag, ch, planId, want, tierRaw] = String(pu.custom_id || cap.custom_id || '').split('|'), tier = tierRaw || 'standard', P = plan(tier, planId), amt = cap.amount || pu.amount || {};
      if (o.status !== 'COMPLETED' || cap.status !== 'COMPLETED') return res.status(402).json({ error: 'PayPal hasn’t completed this payment (' + (cap.status || o.status || r.status) + ').' });
      if (tag !== 'overlay' || !P || !okId(ch)) return res.status(400).json({ error: 'That isn’t an overlay order.' });
      if (amt.currency_code !== CURRENCY || money(amt.value) !== money(P.price) || want !== P.price) return res.status(402).json({ error: 'Payment amount doesn’t match.' });

      const row = { kind: 'overlay', channel: ch, plan: planId, tier, price: money(amt.value), currency: CURRENCY, capture: cap.id || '', payer: ((o.payer || {}).email_address) || '', mode: k.mode, at: Date.now() };
      try { await ledger.create(row); } catch (e) { return res.json({ ok: true, already: true }); }   // recorded already: credit once only

      const ref = fs().collection('overlay_pro').doc(ch);
      const until = await fs().runTransaction(async t => {
        const cur = await t.get(ref), d = cur.exists ? cur.data() : {};
        const start = Math.max(Date.now(), Number(d.until || 0));
        const next = start + P.days * DAY;
        t.set(ref, { channel: ch, platform: ch.indexOf(':') > 0 ? ch.split(':')[0] : 'twitch', name: ch.split(':').pop(), until: next, plan: planId, tier, payer: row.payer, updated: Date.now(), orders: (d.orders || []).concat(orderId).slice(-50) }, { merge: true });
        return next;
      });
      proCache.delete(ch);
      console.log('[overlay] paid', ch, planId, orderId);
      res.json({ ok: true, until });
    } catch (e) { console.error('[overlay capture]', e && e.message); res.status(500).json({ error: 'Could not confirm the payment. If you were charged, message the site owner with your PayPal receipt.' }); }
  });
}
module.exports = { mountOverlayPro, PLANS };
