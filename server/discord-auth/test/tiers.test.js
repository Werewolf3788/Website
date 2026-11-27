'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.DISCORD_APP_OWNER_KEY = 'owner';
const { TIERS, FOUNDER_LIMIT, effectiveTier, priceFor } = require('../tiers');
const { fakeAdmin, fakeFetch, start } = require('./helpers');

const NOW = Date.UTC(2026, 10, 27), DAY = 86400000;

test('prices are the locked ones', () => {
  assert.deepStrictEqual(TIERS[1], { month: '5.00', year: '50.00', lifetime: '125.00', founder: '99.00' });
  assert.deepStrictEqual(TIERS[2], { month: '10.00', year: '100.00', lifetime: '250.00', founder: '199.00' });
  assert.deepStrictEqual(TIERS[3], { month: '20.00', year: '200.00', lifetime: '500.00', founder: '399.00' });
  assert.strictEqual(FOUNDER_LIMIT, 25);
});
test('effectiveTier picks highest live tier', () => {
  const doc = { tiers: { 1: { until: NOW + 10 * DAY }, 3: { until: NOW + DAY } } };
  assert.strictEqual(effectiveTier(doc, NOW, false).tier, 3);
});
test('expired tier falls back', () => {
  const doc = { tiers: { 1: { until: NOW + 10 * DAY }, 3: { until: NOW - 1 } } };
  assert.strictEqual(effectiveTier(doc, NOW, false).tier, 1);
});
test('legacy pass is tier 1', () => {
  assert.strictEqual(effectiveTier({ until: NOW + DAY }, NOW, false).tier, 1);
  assert.strictEqual(effectiveTier({ until: NOW - DAY }, NOW, false).tier, 0);
});
test('lifetime never expires and founder is flagged', () => {
  const r = effectiveTier({ tiers: { 2: { lifetime: true, founder: true } } }, NOW, false);
  assert.deepStrictEqual([r.tier, r.lifetime, r.founder], [2, true, true]);
});
test('ally is tier 3', () => {
  assert.strictEqual(effectiveTier(null, NOW, true).tier, 3);
});
test('lifetime upgrade pays the difference', () => {
  assert.strictEqual(priceFor(3, 'lifetime', { lifetimePaid: '125.00' }), '375.00');
  assert.strictEqual(priceFor(1, 'lifetime', { lifetimePaid: '250.00' }), '0.00');
  assert.strictEqual(priceFor(2, 'month', { lifetimePaid: '125.00' }), '10.00');
});

// ---- through the server: claims, founder limit, grants ----
function boot(extraStore) {
  const f = fakeAdmin({ 'user_secrets/owner/bmc_webhook_secret': 'sekret', 'users/owner/friends': {}, 'user_secrets/owner/twitch_client_id': 'x', 'user_secrets/owner/twitch_client_secret': 'y' }, {});
  Object.assign(f.store, extraStore || {});
  const { createApp } = require('../server.js');
  return Object.assign(start(createApp({ admin: f.admin, fetchFn: fakeFetch })), { store: f.store });
}

test('overlay claim carries tier and term with the locked price', async () => {
  const h = boot();
  try {
    const r = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'bigstar', tier: '3', term: 'year' });
    assert.strictEqual(r.j.price, '200.00');   // one price for everyone, partners too
    await h.hook({ type: 'extra_purchase.created', event_id: 'e1', data: { amount: 200, support_note: r.j.claim } }, 'sekret');
    const p = await h.get('/overlay/pro/bigstar');
    assert.strictEqual(p.j.tier, 3);
    assert.strictEqual(p.j.pro, true);
  } finally { h.srv.close(); }
});

test('founder needs the terms checkbox and is saved with the agreement', async () => {
  const h = boot();
  try {
    const no = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'smallguy', tier: '1', term: 'founder' });
    assert.strictEqual(no.s, 400);
    const yes = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'smallguy', tier: '1', term: 'founder', agree: '1' });
    assert.strictEqual(yes.j.price, '99.00');
    await h.hook({ type: 'extra_purchase.created', event_id: 'e2', data: { amount: 99, support_note: yes.j.claim } }, 'sekret');
    const doc = h.store['overlay_pro/smallguy'];
    assert.strictEqual(doc.tiers[1].lifetime, true);
    assert.strictEqual(doc.tiers[1].founder, true);
    assert.ok(doc.agreement && doc.agreement.terms);
    assert.strictEqual(doc.lifetimePaid, '99.00');
  } finally { h.srv.close(); }
});

test('founder limit counts paid and open claims', async () => {
  const h = boot({ 'ext_meta/founders': { taken: 24 } });
  try {
    const a = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'first', tier: '1', term: 'founder', agree: '1' });
    assert.ok(a.j.claim, 'the 25th founder spot is still open');
    const b = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'second', tier: '1', term: 'founder', agree: '1' });
    assert.strictEqual(b.s, 409);
    // the holder of the 25th claim still gets it when they pay
    await h.hook({ type: 'extra_purchase.created', event_id: 'e3', data: { amount: 99, support_note: a.j.claim } }, 'sekret');
    assert.strictEqual(h.store['overlay_pro/first'].tiers[1].founder, true);
  } finally { h.srv.close(); }
});

test('lifetime upgrade claim charges only the difference', async () => {
  const h = boot({ 'overlay_pro/upper': { tiers: { 1: { lifetime: true } }, lifetimePaid: '125.00' } });
  try {
    const r = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'upper', tier: '3', term: 'lifetime' });
    assert.strictEqual(r.j.price, '375.00');
    await h.hook({ type: 'extra_purchase.created', event_id: 'e4', data: { amount: 375, support_note: r.j.claim } }, 'sekret');
    assert.strictEqual(h.store['overlay_pro/upper'].lifetimePaid, '500.00');
    assert.strictEqual((await h.get('/overlay/pro/upper')).j.tier, 3);
  } finally { h.srv.close(); }
});

test('switching tiers keeps the time left on the old one', async () => {
  const h = boot({ 'overlay_pro/keeper': { tiers: { 1: { until: Date.now() + 20 * DAY } } } });
  try {
    const r = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'keeper', tier: '2', term: 'month' });
    await h.hook({ type: 'extra_purchase.created', event_id: 'e5', data: { amount: 10, support_note: r.j.claim } }, 'sekret');
    const d = h.store['overlay_pro/keeper'];
    assert.ok(d.tiers[1].until > Date.now() + 50 * DAY, 'tier 1 time is pushed back by the tier 2 month (kept, not burned)');
    assert.ok(d.tiers[2].until > Date.now() + 30 * DAY);
  } finally { h.srv.close(); }
});

test('plans route lists tiers and founder spots left', async () => {
  const h = boot({ 'ext_meta/founders': { taken: 3 } });
  try {
    const r = await h.get('/overlay/plans?channel=smallguy&platform=twitch');
    assert.strictEqual(r.j.tiers[2].month, '10.00');
    assert.strictEqual(r.j.founderLeft, 22);
  } finally { h.srv.close(); }
});

test('same account gets its open founder claim back (no spot hoarding)', async () => {
  const h = boot({ 'ext_meta/founders': { taken: 0 } });
  try {
    const a = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'clicker', tier: '1', term: 'founder', agree: '1' });
    const b = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'clicker', tier: '1', term: 'founder', agree: '1' });
    assert.strictEqual(b.j.claim, a.j.claim);
    assert.strictEqual(h.store['ext_meta/founders'].taken, 1);
  } finally { h.srv.close(); }
});

test('founder spot is held 24 hours, then released and the old code is not honoured', async () => {
  const h = boot({ 'ext_meta/founders': { taken: 24 } });
  try {
    const a = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'slowpay', tier: '1', term: 'founder', agree: '1' });
    const c = h.store['bmc_claims/' + a.j.claim];
    assert.ok(c.expires - c.created <= DAY, 'held for at most a day');
    h.store['bmc_claims/' + a.j.claim].expires = Date.now() - 1;   // a day later, unpaid
    const b = await h.post('/bmc/claim', { kind: 'overlay', platform: 'twitch', channel: 'nextbuyer', tier: '1', term: 'founder', agree: '1' });
    assert.ok(b.j.claim, 'the released spot goes to the next buyer');
    assert.strictEqual(h.store['ext_meta/founders'].taken, 25);
    await h.hook({ type: 'extra_purchase.created', event_id: 'late', data: { amount: 99, support_note: a.j.claim } }, 'sekret');
    assert.ok(!h.store['overlay_pro/slowpay'], 'no 26th founder');
    assert.ok(h.store['bmc_unmatched/late'], 'late payment kept for Kevin');
  } finally { h.srv.close(); }
});
