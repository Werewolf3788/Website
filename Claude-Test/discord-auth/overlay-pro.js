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
 * Passes are paid up front (not auto-renewing): month = 31 days for $5, year = 365 days for $50.
 * No sign-in needed - the pass belongs to the Twitch channel typed in the Overlay Studio.
 * Uses the same PayPal keys as the game shop (Key Vault: paypal_client_id, paypal_secret, paypal_mode).
 * ========================================================================== */
'use strict';

const PLANS = {
  month: { name: 'Overlay Studio - 1 month, no watermark', price: '5.00', days: 31 },
  year:  { name: 'Overlay Studio - 1 year, no watermark',  price: '50.00', days: 365 }
};
const CURRENCY = 'USD';
const DAY = 86400000;
const money = v => (Math.round(parseFloat(v) * 100) / 100).toFixed(2);
const cleanChan = c => String(c || '').trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\/(www\.)?twitch\.tv\//, '').split(/[/?#]/)[0];
const okChan = c => /^[a-z0-9_]{3,25}$/.test(c);

const SITE_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];

function mountOverlayPro(app, { admin, fetchFn, cors: baseCors, paypal }) {
  const fs = () => admin.firestore();
  const cors = (req, res) => {   // the site's own origins always allowed, plus whatever the server already allows
    const o = req.headers.origin;
    if (o && SITE_ORIGINS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    else baseCors(req, res);
  };
  const proCache = new Map();   // channel -> { at, body }   keeps Firestore reads tiny

  app.get('/overlay/pro/:channel', async (req, res) => {
    cors(req, res);
    const ch = cleanChan(req.params.channel); if (!okChan(ch)) return res.json({ pro: false });
    const hit = proCache.get(ch); if (hit && Date.now() - hit.at < 5 * 60000) return res.json(hit.body);
    try {
      const d = await fs().collection('overlay_pro').doc(ch).get();
      const until = d.exists ? Number(d.data().until || 0) : 0;
      const body = { pro: until > Date.now(), until };
      proCache.set(ch, { at: Date.now(), body }); res.json(body);
    } catch (e) { console.error('[overlay pro]', e && e.message); res.json({ pro: false }); }
  });

  app.get('/overlay/plans', async (req, res) => {
    cors(req, res); const k = await paypal.keys();
    const plans = {}; Object.keys(PLANS).forEach(id => { plans[id] = { name: PLANS[id].name, price: PLANS[id].price, days: PLANS[id].days }; });
    res.json({ clientId: k.id && k.secret ? k.id : '', currency: CURRENCY, mode: k.mode, plans });
  });

  app.post('/overlay/create', async (req, res) => {
    cors(req, res);
    try {
      const ch = cleanChan(req.body && req.body.channel), planId = String((req.body && req.body.plan) || ''), P = PLANS[planId];
      if (!okChan(ch)) return res.status(400).json({ error: 'Type your Twitch username first.' });
      if (!P) return res.status(400).json({ error: 'Pick monthly or yearly.' });
      const k = await paypal.keys(); if (!k.id || !k.secret) return res.status(503).json({ error: 'Payments aren’t set up yet.' });
      const r = await paypal.papi(k, '/v2/checkout/orders', { intent: 'CAPTURE',
        purchase_units: [{ reference_id: 'overlay_' + planId, custom_id: 'overlay|' + ch + '|' + planId + '|' + P.price, description: (P.name + ' for twitch.tv/' + ch).slice(0, 127), amount: { currency_code: CURRENCY, value: P.price } }],
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
      const [tag, ch, planId, want] = String(pu.custom_id || cap.custom_id || '').split('|'), P = PLANS[planId], amt = cap.amount || pu.amount || {};
      if (o.status !== 'COMPLETED' || cap.status !== 'COMPLETED') return res.status(402).json({ error: 'PayPal hasn’t completed this payment (' + (cap.status || o.status || r.status) + ').' });
      if (tag !== 'overlay' || !P || !okChan(ch)) return res.status(400).json({ error: 'That isn’t an overlay order.' });
      if (amt.currency_code !== CURRENCY || money(amt.value) !== money(P.price) || want !== P.price) return res.status(402).json({ error: 'Payment amount doesn’t match.' });

      const row = { kind: 'overlay', channel: ch, plan: planId, price: money(amt.value), currency: CURRENCY, capture: cap.id || '', payer: ((o.payer || {}).email_address) || '', mode: k.mode, at: Date.now() };
      try { await ledger.create(row); } catch (e) { return res.json({ ok: true, already: true }); }   // recorded already: credit once only

      const ref = fs().collection('overlay_pro').doc(ch);
      const until = await fs().runTransaction(async t => {
        const cur = await t.get(ref), d = cur.exists ? cur.data() : {};
        const start = Math.max(Date.now(), Number(d.until || 0));
        const next = start + P.days * DAY;
        t.set(ref, { channel: ch, until: next, plan: planId, payer: row.payer, updated: Date.now(), orders: (d.orders || []).concat(orderId).slice(-50) }, { merge: true });
        return next;
      });
      proCache.delete(ch);
      console.log('[overlay] paid', ch, planId, orderId);
      res.json({ ok: true, until });
    } catch (e) { console.error('[overlay capture]', e && e.message); res.status(500).json({ error: 'Could not confirm the payment. If you were charged, message the site owner with your PayPal receipt.' }); }
  });
}
module.exports = { mountOverlayPro, PLANS };
