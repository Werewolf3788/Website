/* ============================================================================
 * PayPal shop for the mobile games (mounted on ww-discord-auth)
 *
 *   GET  /pay/config                 -> { clientId, currency, packs }   (client id is public; the game loads PayPal's buttons with it)
 *   POST /pay/create   idToken, pack -> { id }     creates a PayPal order for that pack's fixed price
 *   POST /pay/capture  idToken, orderId -> { ok, grant }
 *        The server captures the order with PayPal itself and only pays out when PayPal says
 *        COMPLETED, for exactly the pack's price in USD, for THIS player's order, never used before.
 *        Then it writes the grant to Firestore:
 *          user/{FRIEND_CODE}/platform/mobile/game/{game}_shop/{orderId}  { pack, res, price, at }
 *        and a ledger row purchases/{orderId} (create() fails if it already exists = no double pay-outs).
 *        The game reads that collection and adds the resources once (it remembers used order ids in its save).
 *
 * Keys come from the Key Vault (Firebase user_secrets/{DISCORD_APP_OWNER_KEY}/...):
 *   paypal_client_id, paypal_secret, paypal_mode ("live" or "sandbox"; default live)
 * Env PAYPAL_CLIENT_ID / PAYPAL_SECRET / PAYPAL_MODE override them.
 * ========================================================================== */
'use strict';

// what can be bought. Prices are set HERE (server side) so a page can't change them.
// boostPlayMs: Overdrive, +50% production counted only while the player is in the game.
const PACKS = {
  survive_starter:   { game: 'survive3', name: 'Starter Pack',          icon: '🎒', desc: '500 wood, food and metal',                     price: '1.99', res: { wood: 500, food: 500, metal: 500 } },
  survive_2000:      { game: 'survive3', name: 'Survivor Supply Crate', icon: '📦', desc: '2,000 wood, food and metal',                   price: '4.99', res: { wood: 2000, food: 2000, metal: 2000 } },
  survive_vault:     { game: 'survive3', name: "Builder's Vault",       icon: '🏗️', desc: '6,000 wood, food and metal + 25 gems',         price: '9.99', res: { wood: 6000, food: 6000, metal: 6000, gems: 25 } },
  survive_gems:      { game: 'survive3', name: 'Gem Pouch',             icon: '💎', desc: '60 gems (skip upgrade timers)',                price: '2.99', res: { gems: 60 } },
  survive_coal:      { game: 'survive3', name: 'Coal Cart',             icon: '⚫', desc: '300 coal',                                     price: '1.99', res: { coal: 300 } },
  survive_overdrive: { game: 'survive3', name: 'Overdrive',             icon: '🔥', desc: '+50% production for 8 hours of play time (only counts down while you play)', price: '8.00', res: {}, boostPlayMs: 8 * 3600000 }
};
// allies (anyone on the owner's friends list) never pay more than this for any item
const ALLY_CAP = '5.00';
const money = v => (Math.round(parseFloat(v) * 100) / 100).toFixed(2);
const CURRENCY = 'USD';
const PAY_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];

function mountPayPal(app, { admin, fetchFn }) {
  const db = () => admin.database(), fs = () => admin.firestore();
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  const cors = (req, res) => { const o = req.headers.origin; if (o && (PAY_ORIGINS.includes(o) || extra.includes(o))) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); } };

  const cache = { keys: null, at: 0, tok: '', tokEnd: 0 };
  async function keys() {
    if (cache.keys && Date.now() - cache.at < 300000) return cache.keys;
    let v = {}; const owner = process.env.DISCORD_APP_OWNER_KEY;
    if (owner) { try { v = (await db().ref('user_secrets/' + owner).once('value')).val() || {}; } catch (e) { console.error('[paypal keys]', e && e.message); } }
    const s = x => String(x || '').trim();
    const k = {
      id: s(process.env.PAYPAL_CLIENT_ID || v.paypal_client_id),
      secret: s(process.env.PAYPAL_SECRET || v.paypal_secret),
      mode: s(process.env.PAYPAL_MODE || v.paypal_mode || 'live').toLowerCase() === 'sandbox' ? 'sandbox' : 'live'
    };
    k.api = k.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    if (!cache.keys || cache.keys.id !== k.id || cache.keys.mode !== k.mode || cache.keys.secret !== k.secret) { cache.tok = ''; cache.tokEnd = 0; }   // switched sandbox <-> live (or new keys): log in to PayPal again
    cache.keys = k; cache.at = Date.now(); return k;
  }
  async function token(k) {
    if (cache.tok && Date.now() < cache.tokEnd && cache.tokFor === k.mode + k.id) return cache.tok;
    const r = await fetchFn(k.api + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(k.id + ':' + k.secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error('PayPal sign-in failed (' + r.status + ')');
    cache.tokFor = k.mode + k.id; cache.tok = j.access_token; cache.tokEnd = Date.now() + Math.max(60, (j.expires_in || 300) - 120) * 1000; return cache.tok;
  }
  async function papi(k, path, body) {
    const r = await fetchFn(k.api + path, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(k), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  }
  // is this friend code on the owner's friends list? (users/{owner}/friends: keyed by code, or entries with friend_code)
  const allyCache = { set: null, at: 0 };
  async function isAlly(code) {
    const owner = process.env.DISCORD_APP_OWNER_KEY; if (!owner) return false;
    if (!allyCache.set || Date.now() - allyCache.at > 60000) {
      const fr = (await db().ref('users/' + owner + '/friends').once('value')).val() || {}, set = new Set();
      Object.keys(fr).forEach(k => { set.add(String(k).toUpperCase()); const fc = fr[k] && fr[k].friend_code; if (fc) set.add(String(fc).toUpperCase()); });
      try { const mine = (await db().ref('users/' + owner + '/friend_code').once('value')).val(); if (mine) set.add(String(mine).toUpperCase()); } catch (e) {}
      allyCache.set = set; allyCache.at = Date.now();
    }
    return allyCache.set.has(code);
  }
  const priceFor = (P, ally) => ally && parseFloat(P.price) > parseFloat(ALLY_CAP) ? ALLY_CAP : money(P.price);
  // signed-in player -> their friend code (same accounts the rest of the site uses)
  async function who(idToken) {
    let u; try { u = await admin.auth().verifyIdToken(String(idToken || '')); } catch (e) { return null; }
    if (!u.email) return null;
    const key = String(u.email).toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_');
    const code = String((await db().ref('users/' + key + '/friend_code').once('value')).val() || '').toUpperCase();
    return /^[A-Z0-9]{4,12}$/.test(code) ? { uid: u.uid, code } : null;
  }

  app.get('/pay/config', async (req, res) => {
    cors(req, res); const k = await keys();
    const packs = {}; Object.keys(PACKS).forEach(id => { const p = PACKS[id]; packs[id] = { game: p.game, name: p.name, icon: p.icon, desc: p.desc, price: money(p.price), res: p.res, boostPlayMs: p.boostPlayMs || 0 }; });
    res.json({ clientId: k.id && k.secret ? k.id : '', currency: CURRENCY, mode: k.mode, allyCap: ALLY_CAP, packs });
  });
  // the signed-in player's own prices (allies get the ally price)
  app.post('/pay/me', async (req, res) => {
    cors(req, res);
    const me = await who(req.body && req.body.idToken); if (!me) return res.status(401).json({ error: 'Sign in (with a friend code) to buy.' });
    const ally = await isAlly(me.code).catch(() => false), prices = {};
    Object.keys(PACKS).forEach(id => { prices[id] = priceFor(PACKS[id], ally); });
    res.json({ code: me.code, ally, prices });
  });

  app.post('/pay/create', async (req, res) => {
    cors(req, res);
    try {
      const me = await who(req.body && req.body.idToken); if (!me) return res.status(401).json({ error: 'Sign in (with a friend code) to buy.' });
      const packId = String(req.body.pack || ''), P = PACKS[packId]; if (!P) return res.status(400).json({ error: 'Unknown pack.' });
      const k = await keys(); if (!k.id || !k.secret) return res.status(503).json({ error: 'The shop isn’t set up yet.' });
      const ally = await isAlly(me.code).catch(() => false), price = priceFor(P, ally);
      const r = await papi(k, '/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ reference_id: packId, custom_id: me.code + '|' + packId + '|' + price, description: (P.name + ': ' + P.desc + (ally && price !== money(P.price) ? ' (ally price)' : '')).slice(0, 127), amount: { currency_code: CURRENCY, value: price } }],
        application_context: { brand_name: 'Werewolf Games', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } });
      if (r.status >= 300 || !r.json || !r.json.id) { console.error('[pay create]', r.status, JSON.stringify(r.json)); return res.status(502).json({ error: 'PayPal could not start the order.' }); }
      res.json({ id: r.json.id });
    } catch (e) { console.error('[pay create]', e && e.message); res.status(500).json({ error: 'Could not start the order.' }); }
  });

  app.post('/pay/capture', async (req, res) => {
    cors(req, res);
    try {
      const me = await who(req.body && req.body.idToken); if (!me) return res.status(401).json({ error: 'Sign in again, then retry.' });
      const orderId = String(req.body.orderId || ''); if (!/^[A-Z0-9]{8,32}$/.test(orderId)) return res.status(400).json({ error: 'Bad order.' });
      const k = await keys(); if (!k.id || !k.secret) return res.status(503).json({ error: 'The shop isn’t set up yet.' });
      const ledger = fs().collection('purchases').doc(orderId);
      const had = await ledger.get(); if (had.exists) return res.json(had.data().code === me.code ? { ok: true, already: true, pack: had.data().pack } : { error: 'That order belongs to someone else.' });
      let r = await papi(k, '/v2/checkout/orders/' + orderId + '/capture');
      if (r.status === 422 && r.json && JSON.stringify(r.json).indexOf('ORDER_ALREADY_CAPTURED') >= 0) r = { status: 200, json: (await fetchFn(k.api + '/v2/checkout/orders/' + orderId, { headers: { Authorization: 'Bearer ' + await token(k) } }).then(x => x.json())) };
      const o = r.json || {}, pu = (o.purchase_units || [])[0] || {}, cap = (((pu.payments || {}).captures) || [])[0] || {};
      const [code, packId, want] = String(pu.custom_id || cap.custom_id || '').split('|'), P = PACKS[packId];
      const amt = cap.amount || pu.amount || {};
      if (o.status !== 'COMPLETED' || cap.status !== 'COMPLETED') return res.status(402).json({ error: 'PayPal hasn’t completed this payment (' + (cap.status || o.status || r.status) + ').' });
      if (!P || code !== me.code) return res.status(403).json({ error: 'That order isn’t yours.' });
      const ok = want ? (want === money(P.price) || want === ALLY_CAP) && money(amt.value) === want : money(amt.value) === money(P.price);   // the price set when the order was made: full, or the ally price
      if (amt.currency_code !== CURRENCY || !ok) return res.status(402).json({ error: 'Payment amount doesn’t match.' });
      const row = { code, uid: me.uid, pack: packId, game: P.game, price: money(amt.value), ally: money(amt.value) !== money(P.price) ? 1 : 0, currency: CURRENCY, capture: cap.id || '', payer: ((o.payer || {}).email_address) || '', mode: k.mode, at: Date.now() };
      try { await ledger.create(row); } catch (e) { return res.json({ ok: true, already: true, pack: packId }); }   // someone else just recorded it: pay out once only
      const grant = { pack: packId, name: P.name, res: P.res, boostPlayMs: P.boostPlayMs || 0, price: money(amt.value), ally: row.ally, at: row.at };
      await fs().collection('user').doc(code).collection('platform').doc('mobile').collection('game').doc(P.game + '_shop').collection('orders').doc(orderId).set(grant);
      console.log('[pay] paid', code, packId, orderId);
      res.json({ ok: true, orderId, grant });
    } catch (e) { console.error('[pay capture]', e && e.message); res.status(500).json({ error: 'Could not confirm the payment. If you were charged, it will show up next time you open the game.' }); }
  });
  return { keys, token, papi };   // shared with overlay-pro.js (same PayPal account)
}
module.exports = { mountPayPal, PACKS };
