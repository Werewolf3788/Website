'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.DISCORD_APP_OWNER_KEY = 'owner';
const { fakeAdmin, fakeFetch, start } = require('./helpers');

function boot() {
  const f = fakeAdmin({
    'user_secrets/owner/bmc_webhook_secret': 'sekret', 'users/owner/friends': { ALLY1: {} },
    'users/a_at_b_com/friend_code': 'ABCD12', 'users/c_at_d_com/friend_code': 'ALLY1',
    'user_secrets/owner/twitch_client_id': 'x', 'user_secrets/owner/twitch_client_secret': 'y'
  }, { tokA: { uid: 'u1', email: 'a@b.com' }, tokAlly: { uid: 'u2', email: 'c@d.com' } });
  const { createApp } = require('../server.js');
  return Object.assign(start(createApp({ admin: f.admin, fetchFn: fakeFetch })), { store: f.store });
}
const orders = st => Object.keys(st).filter(p => p.includes('/survive3_shop/orders/BMC-'));

test('pack: signature, grant once, retry, second payment flagged', async () => {
  const h = boot();
  try {
    const c = await h.post('/bmc/claim', { kind: 'pack', idToken: 'tokA', pack: 'survive_vault' });
    assert.strictEqual(c.j.price, '9.99');
    assert.ok((await h.hook({ type: 'donation.created', event_id: 'e1', data: { amount: 9.99, support_note: c.j.claim } }, 'wrong')).startsWith('401'));
    assert.match(await h.hook({ type: 'extra_purchase.created', event_id: 'e1', data: { amount: 9.99, support_note: 'hi ' + c.j.claim.toLowerCase() } }, 'sekret'), /ok/);
    assert.match(await h.hook({ type: 'extra_purchase.created', event_id: 'e1', data: { amount: 9.99, support_note: c.j.claim } }, 'sekret'), /already/);
    await h.hook({ type: 'extra_purchase.created', event_id: 'e1b', data: { amount: 9.99, support_note: c.j.claim } }, 'sekret');
    assert.strictEqual(orders(h.store).length, 1);
    assert.ok(h.store['bmc_unmatched/e1b'], 'second payment kept for Kevin');
    const st = await h.get('/bmc/claim/' + c.j.claim);
    assert.strictEqual(st.j.status, 'paid'); assert.strictEqual(st.j.grant.res.gems, 25);
  } finally { h.srv.close(); }
});

test('pack: ally price, email backup, short payment, unmatched, refund', async () => {
  const h = boot();
  try {
    assert.strictEqual((await h.post('/bmc/claim', { kind: 'pack', idToken: 'tokAlly', pack: 'survive_vault' })).j.price, '5.00');
    const g = await h.post('/bmc/claim', { kind: 'pack', idToken: 'tokA', pack: 'survive_gems', email: 'Pay@X.com' });
    await h.hook({ type: 'donation.created', event_id: 'e3', data: { amount: 2.99, supporter_email: 'pay@x.com', support_note: 'forgot' } }, 'sekret');
    assert.strictEqual((await h.get('/bmc/claim/' + g.j.claim)).j.status, 'paid');
    const s = await h.post('/bmc/claim', { kind: 'pack', idToken: 'tokA', pack: 'survive_2000' });
    await h.hook({ type: 'donation.created', event_id: 'e4', data: { amount: 1, support_note: s.j.claim } }, 'sekret');
    assert.strictEqual((await h.get('/bmc/claim/' + s.j.claim)).j.status, 'short');
    assert.match(await h.hook({ type: 'donation.created', event_id: 'e5', data: { amount: 3, supporter_email: 'nobody@x.com' } }, 'sekret'), /unmatched/);
    assert.match(await h.hook({ type: 'donation.refunded', event_id: 'e6', data: { amount: 3 } }, 'sekret'), /noted/);
  } finally { h.srv.close(); }
});
