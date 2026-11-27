/* ============================================================================
 * Buy Me a Coffee payments (mounted on ww-discord-auth)   -   replaced PayPal, Nov 2026
 *
 * Everything that costs money on the site is bought on Buy Me a Coffee (buymeacoffee.com/raykevin71b):
 *   - Werewolf passes, Tiers 1-3 (tiers.js): Overlay Studio + the Twitch extension
 *   - Survive3D shop packs (games/mobile)
 *
 * How a purchase is matched to the right person:
 *   1. The page asks this server for a CLAIM:   POST /bmc/claim   -> { claim: "WW-7KQ3M", price, url }
 *      The claim remembers who is paying and for what (friend code + pack, or streaming account + plan)
 *      and the price (set HERE, server side, so a page can't change it).
 *   2. The buyer pays on Buy Me a Coffee and types the claim code in the message box.
 *      (If they forget, the e-mail they gave on the page is used as a backup.)
 *   3. Buy Me a Coffee calls   POST /bmc/webhook   (signed with the webhook secret).
 *      We check the signature, record the event once (bmc_events/{id}), find the claim,
 *      check the amount, and grant it exactly like the PayPal version did:
 *        packs   -> user/{CODE}/platform/mobile/game/{game}_shop/orders/BMC-{claim}   (the game adds it once)
 *        overlay -> overlay_pro/{account}  until += 31 or 365 days
 *      Ledger row purchases/bmc_{claim} (create() fails if it exists = never paid out twice).
 *   4. The page polls   GET /bmc/claim/:id   and shows "Payment received".
 *   Payments that can't be matched are kept in Firestore bmc_unmatched/{eventId} so they can be sorted out by hand.
 *
 * Key: Key Vault (Keys sheet -> Firebase user_secrets/{DISCORD_APP_OWNER_KEY}/bmc_webhook_secret).
 *      Env BMC_WEBHOOK_SECRET overrides it.
 * ========================================================================== */
'use strict';
const crypto = require('crypto');
const express = require('express');
const { FOUNDER_LIMIT, TERMS_VERSION } = require('./tiers');

const BMC_PAGE = 'https://buymeacoffee.com/raykevin71b';
const BMC_SHOP = BMC_PAGE + '/extras';
// Optional direct links to each Buy Me a Coffee item (paste them here once they're made). Missing ones open the shop.
// Passes: pass_t{1|2|3}_{month|year|lifetime|founder}   (one pass covers Overlay Studio + the Twitch extension)
const ITEM_LINKS = {
  // pass_t1_month: '', pass_t1_year: '', pass_t1_lifetime: '', pass_t1_founder: '', ... pass_t3_founder: '',
  // survive_starter: '', survive_2000: '', survive_vault: '', survive_gems: '', survive_coal: '', survive_overdrive: '', ally_pack: ''
};

// what can be bought in the games. Prices are set HERE (server side).
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
const CURRENCY = 'USD';
const DAY = 86400000;
const CLAIM_LIFE = 14 * DAY;   // an unpaid claim stays usable for two weeks
const money = v => (Math.round(parseFloat(v) * 100) / 100).toFixed(2);
const cents = v => Math.round(parseFloat(v) * 100);
const PAY_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];
const CLAIM_RE = /\bWW-?([A-HJ-NP-Z2-9]{5})\b/i;   // WW-7KQ3M  (no 0/O/1/I so it's easy to type)
const CLAIM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const okEmail = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);

function newClaimId() {
  const b = crypto.randomBytes(5); let s = '';
  for (let i = 0; i < 5; i++) s += CLAIM_CHARS[b[i] % CLAIM_CHARS.length];
  return 'WW-' + s;
}
// every string anywhere in the payload (note, message, extras answers ... field names vary)
function strings(o, out, depth) {
  out = out || []; depth = depth || 0; if (depth > 6 || o == null) return out;
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach(x => strings(x, out, depth + 1));
  else if (typeof o === 'object') Object.keys(o).forEach(k => strings(o[k], out, depth + 1));
  return out;
}
// pull what we need out of a Buy Me a Coffee webhook body (written loosely so small format changes don't break it)
function readEvent(body) {
  const d = (body && (body.data || body.response)) || body || {};
  const type = String(body.type || body.event || body.event_type || '').toLowerCase();
  const amt = [d.amount, d.total_amount_charged, d.total_amount, d.support_amount, d.membership_level_price, d.price]
    .map(parseFloat).find(x => isFinite(x) && x > 0) || 0;
  const coffees = parseFloat(d.support_coffees || d.coffee_count || d.quantity || 0) || 0;
  const unit = parseFloat(d.support_coffee_price || d.coffee_price || 0) || 0;
  const total = amt || (coffees && unit ? coffees * unit : 0);
  const email = String(d.supporter_email || d.payer_email || d.email || (d.supporter && d.supporter.email) || '').trim().toLowerCase();
  const all = strings(d).join(' \n ');
  const m = all.match(CLAIM_RE);
  const status = String(d.status || d.payment_status || '').toLowerCase();
  const currency = String(d.currency || d.support_currency || CURRENCY).toUpperCase();
  const item = String(d.membership_level_name || d.extra_title || d.title || d.name || (Array.isArray(d.extras) && d.extras[0] && (d.extras[0].title || d.extras[0].name)) || '').slice(0, 120);
  return {
    id: String(body.event_id || body.id || d.transaction_id || d.id || ''),
    type, amount: total ? money(total) : '0.00', currency, email,
    claim: m ? 'WW-' + m[1].toUpperCase() : '',
    note: String(d.support_note || d.note || d.message || '').slice(0, 300),
    name: String(d.supporter_name || d.payer_name || '').slice(0, 80),
    status, item, live: body.live_mode !== false
  };
}
const isRefund = t => /refund|chargeback|dispute/.test(t);
const isNoPay = t => /cancel|delet|pause|fail|expir/.test(t);

function mountBmc(app, { admin, overlay }) {
  const db = () => admin.database(), fs = () => admin.firestore();
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  const cors = (req, res) => { const o = req.headers.origin; if (o && (PAY_ORIGINS.includes(o) || extra.includes(o))) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); } };

  let secretCache = { v: '', at: 0 };
  async function secret() {
    if (process.env.BMC_WEBHOOK_SECRET) return process.env.BMC_WEBHOOK_SECRET.trim();
    if (secretCache.v && Date.now() - secretCache.at < 300000) return secretCache.v;
    const owner = process.env.DISCORD_APP_OWNER_KEY; let v = '';
    if (owner) { try { v = String((await db().ref('user_secrets/' + owner + '/bmc_webhook_secret').once('value')).val() || '').trim(); } catch (e) { console.error('[bmc key]', e && e.message); } }
    secretCache = { v, at: Date.now() }; return v;
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
    return /^[A-Z0-9]{4,12}$/.test(code) ? { uid: u.uid, code, email: String(u.email).toLowerCase() } : null;
  }
  const linkFor = id => ITEM_LINKS[id] || BMC_SHOP;

  // Founder lifetime: 25 spots, counted when a claim is made (so a buyer holding a code always gets it).
  // Unpaid Founder claims give their spot back once they expire.
  async function takeFounderSlot() {
    const meta = fs().collection('ext_meta').doc('founders');
    const tryTake = () => fs().runTransaction(async t => {
      const m = await t.get(meta), taken = Number((m.exists && m.data().taken) || 0);
      if (taken >= FOUNDER_LIMIT) return false;
      t.set(meta, { taken: taken + 1, updated: Date.now() }, { merge: true }); return true;
    });
    if (await tryTake()) return true;
    const open = await fs().collection('bmc_claims').where('term', '==', 'founder').where('status', '==', 'waiting').get();
    const dead = open.docs.filter(x => (x.data().expires || 0) < Date.now());
    if (!dead.length) return false;
    for (const x of dead) await x.ref.set({ status: 'expired', updated: Date.now() }, { merge: true });
    await fs().runTransaction(async t => { const m = await t.get(meta); t.set(meta, { taken: Math.max(0, Number((m.exists && m.data().taken) || 0) - dead.length) }, { merge: true }); });
    return tryTake();
  }

  // ---------------- game shop ----------------
  app.get('/pay/config', async (req, res) => {
    cors(req, res);
    const packs = {}; Object.keys(PACKS).forEach(id => { const p = PACKS[id]; packs[id] = { game: p.game, name: p.name, icon: p.icon, desc: p.desc, price: money(p.price), res: p.res, boostPlayMs: p.boostPlayMs || 0 }; });
    res.json({ provider: 'bmc', open: !!(await secret()), page: BMC_PAGE, currency: CURRENCY, allyCap: ALLY_CAP, packs });
  });
  app.post('/pay/me', async (req, res) => {   // the signed-in player's own prices (allies get the ally price)
    cors(req, res);
    const me = await who(req.body && req.body.idToken); if (!me) return res.status(401).json({ error: 'Sign in (with a friend code) to buy.' });
    const ally = await isAlly(me.code).catch(() => false), prices = {};
    Object.keys(PACKS).forEach(id => { prices[id] = priceFor(PACKS[id], ally); });
    res.json({ code: me.code, ally, prices, email: me.email });
  });

  // ---------------- claims ----------------
  // kind=pack:    idToken, pack, email?
  // kind=overlay: platform, channel, plan (month|year), email?
  app.post('/bmc/claim', async (req, res) => {
    cors(req, res);
    try {
      if (!(await secret())) return res.status(503).json({ error: 'Payments aren’t switched on yet. Check back soon!' });
      const b = req.body || {}, kind = String(b.kind || ''); let email = String(b.email || '').trim().toLowerCase();
      if (email && !okEmail(email)) return res.status(400).json({ error: 'That e-mail doesn’t look right.' });
      let claim;
      if (kind === 'pack') {
        const me = await who(b.idToken); if (!me) return res.status(401).json({ error: 'Sign in (with a friend code) to buy.' });
        const packId = String(b.pack || ''), P = PACKS[packId]; if (!P) return res.status(400).json({ error: 'Unknown pack.' });
        const ally = await isAlly(me.code).catch(() => false), price = priceFor(P, ally);
        email = email || me.email;
        claim = { kind, code: me.code, uid: me.uid, pack: packId, game: P.game, name: P.name, price, ally: price !== money(P.price) ? 1 : 0,
          url: linkFor(price !== money(P.price) ? 'ally_pack' : packId) };
      } else if (kind === 'overlay') {
        if (!overlay) return res.status(503).json({ error: 'Passes aren’t available right now.' });
        const term = String(b.term || b.plan || ''), tier = Number(b.tier || 1);   // (plan = older pages: month/year at Tier 1)
        if (term === 'founder' && String(b.agree) !== '1') return res.status(400).json({ error: 'Tick the box to agree to the Founder lifetime terms first.' });
        const q = await overlay.quote(b.platform, b.channel, tier, term);
        if (q.error) return res.status(q.status || 400).json({ error: q.error });
        if (term === 'founder' && !(await takeFounderSlot())) return res.status(409).json({ error: 'All 25 Founder spots are taken. Full lifetime is still available.' });
        claim = { kind, account: q.id, label: q.label, tier: q.tier, term: q.term, days: q.days, name: q.name, price: q.price,
          url: linkFor('pass_t' + q.tier + '_' + q.term) };
        if (term === 'founder') claim.agreement = { terms: TERMS_VERSION, at: Date.now() };
      } else return res.status(400).json({ error: 'Unknown purchase.' });

      let id = '';
      for (let i = 0; i < 5 && !id; i++) {
        const tryId = newClaimId();
        try { await fs().collection('bmc_claims').doc(tryId).create(Object.assign(claim, { id: tryId, email, status: 'waiting', created: Date.now(), expires: Date.now() + CLAIM_LIFE })); id = tryId; } catch (e) { /* taken, try another */ }
      }
      if (!id) return res.status(500).json({ error: 'Could not start the purchase. Try again.' });
      res.json({ claim: id, price: claim.price, name: claim.name, url: claim.url, page: BMC_PAGE });
    } catch (e) { console.error('[bmc claim]', e && e.message); res.status(500).json({ error: 'Could not start the purchase.' }); }
  });

  app.get('/bmc/claim/:id', async (req, res) => {
    cors(req, res);
    const id = String(req.params.id || '').toUpperCase(); if (!/^WW-[A-Z0-9]{5}$/.test(id)) return res.status(400).json({ error: 'Bad code.' });
    try {
      const d = await fs().collection('bmc_claims').doc(id).get(); if (!d.exists) return res.status(404).json({ error: 'Unknown code.' });
      const c = d.data();
      res.json({ claim: id, status: c.status, kind: c.kind, name: c.name, price: c.price, paid: c.paid || '', until: c.until || 0, grant: c.status === 'paid' && c.kind === 'pack' ? c.grant || null : null, orderId: c.orderId || '' });
    } catch (e) { res.status(500).json({ error: 'Could not check.' }); }
  });

  // find the claim for a payment: the code in the message first, then the newest waiting claim with that e-mail
  // whose price fits the amount paid.
  async function findClaim(ev) {
    if (ev.claim) { const d = await fs().collection('bmc_claims').doc(ev.claim).get(); if (d.exists) return d; }
    if (!ev.email) return null;
    const q = await fs().collection('bmc_claims').where('email', '==', ev.email).where('status', '==', 'waiting').get();
    const now = Date.now(), paid = cents(ev.amount);
    const fit = q.docs.filter(x => (x.data().expires || 0) > now && cents(x.data().price) <= paid)
      .sort((a, b) => (cents(b.data().price) - cents(a.data().price)) || (b.data().created - a.data().created));   // the priciest thing they could have meant, newest first
    return fit[0] || null;
  }

  async function grant(claimDoc, ev) {
    const c = claimDoc.data(), id = c.id, ref = claimDoc.ref;
    if (c.status === 'paid') return { already: true };
    if (cents(ev.amount) + 1 < cents(c.price) || ev.currency !== CURRENCY) {
      await ref.set({ status: 'short', paid: ev.amount, event: ev.id, updated: Date.now() }, { merge: true });
      return { short: true };
    }
    const ledger = fs().collection('purchases').doc('bmc_' + id);
    const row = { kind: c.kind, claim: id, price: c.price, paid: ev.amount, currency: CURRENCY, event: ev.id, payer: ev.email, provider: 'bmc', at: Date.now() };
    if (c.kind === 'pack') Object.assign(row, { code: c.code, uid: c.uid || '', pack: c.pack, game: c.game, ally: c.ally || 0 });
    else Object.assign(row, { channel: c.account, tier: c.tier || 1, term: c.term || c.plan });
    try { await ledger.create(row); } catch (e) { return { already: true }; }   // recorded already: pay out once only

    if (c.kind === 'pack') {
      const P = PACKS[c.pack]; const orderId = 'BMC-' + id.slice(3);
      const g = { pack: c.pack, name: P.name, res: P.res, boostPlayMs: P.boostPlayMs || 0, price: c.price, ally: c.ally || 0, at: Date.now(), via: 'Buy Me a Coffee' };
      await fs().collection('user').doc(c.code).collection('platform').doc('mobile').collection('game').doc(P.game + '_shop').collection('orders').doc(orderId).set(g);
      await ref.set({ status: 'paid', paid: ev.amount, event: ev.id, orderId, grant: g, updated: Date.now() }, { merge: true });
      console.log('[bmc] pack paid', c.code, c.pack, id);
    } else {
      const until = await overlay.grantPass(c.account, c.tier || 1, c.term || c.plan, 'bmc_' + id, ev.email, { agreement: c.agreement || null, paid: c.price });
      await ref.set({ status: 'paid', paid: ev.amount, event: ev.id, until, updated: Date.now() }, { merge: true });
      console.log('[bmc] pass paid', c.account, 'tier', c.tier, c.term, id);
    }
    return { ok: true };
  }

  // ---------------- webhook ----------------
  app.post('/bmc/webhook', express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ''));
    const key = await secret(); if (!key) return res.status(503).send('not set up');
    const sig = String(req.headers['x-signature-sha256'] || req.headers['x-bmc-signature'] || req.headers['x-signature'] || '').trim().replace(/^sha256=/i, '');
    const want = crypto.createHmac('sha256', key).update(raw).digest('hex');
    if (!sig || sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) { console.warn('[bmc] bad signature'); return res.status(401).send('bad signature'); }
    let body; try { body = JSON.parse(raw.toString('utf8')); } catch (e) { return res.status(400).send('bad json'); }
    const ev = readEvent(body);
    const eid = (ev.id || crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)).replace(/[\/#?\s]/g, '_').slice(0, 120);
    try {
      try { await fs().collection('bmc_events').doc(eid).create({ type: ev.type, amount: ev.amount, currency: ev.currency, email: ev.email, claim: ev.claim, item: ev.item, note: ev.note, live: ev.live, at: Date.now(), raw: raw.toString('utf8').slice(0, 20000) }); }
      catch (e) { return res.send('already handled'); }   // Buy Me a Coffee retried: handled once only

      if (isRefund(ev.type)) { console.warn('[bmc] refund', eid, ev.email, ev.amount); return res.send('noted'); }
      if (isNoPay(ev.type) || /fail|pending/.test(ev.status) || cents(ev.amount) <= 0) return res.send('noted');

      const doc = await findClaim(ev);
      if (!doc) {
        await fs().collection('bmc_unmatched').doc(eid).set({ type: ev.type, amount: ev.amount, email: ev.email, name: ev.name, note: ev.note, item: ev.item, claim: ev.claim, at: Date.now() });
        console.warn('[bmc] unmatched payment', eid, ev.email, ev.amount);
        return res.send('unmatched');
      }
      const r = await grant(doc, ev);
      if (r.short || r.already) await fs().collection('bmc_unmatched').doc(eid).set({ type: ev.type, amount: ev.amount, email: ev.email, name: ev.name, note: ev.note, item: ev.item, claim: doc.id,
        reason: r.short ? 'paid less than ' + doc.data().price : 'this code was already paid for (second payment?)', at: Date.now() });
      await fs().collection('bmc_events').doc(eid).set({ claim: doc.id, result: r.ok ? 'granted' : r.short ? 'short' : 'already' }, { merge: true });
      res.send('ok');
    } catch (e) {
      console.error('[bmc webhook]', e && e.message);
      try { await fs().collection('bmc_events').doc(eid).delete(); } catch (x) {}   // let Buy Me a Coffee's retry try again
      res.status(500).send('error');
    }
  });
}
module.exports = { mountBmc, PACKS, readEvent, newClaimId, CLAIM_RE };
