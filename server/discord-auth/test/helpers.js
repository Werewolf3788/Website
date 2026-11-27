'use strict';
// In-memory stand-ins for firebase-admin (RTDB + Firestore + Auth) and a tiny HTTP client for the app.
const crypto = require('crypto');

function fakeAdmin(rtdb, users) {
  const store = {};
  const clone = d => JSON.parse(JSON.stringify(d));
  function docRef(p) {
    return {
      id: p.split('/').pop(), path: p,
      get: async () => ({ exists: p in store, id: p.split('/').pop(), data: () => clone(store[p]), ref: docRef(p) }),
      create: async d => { if (p in store) throw new Error('exists'); store[p] = clone(d); },
      set: async (d, o) => { store[p] = o && o.merge ? deepMerge(store[p] || {}, clone(d)) : clone(d); },
      update: async d => { store[p] = deepMerge(store[p] || {}, clone(d)); },
      delete: async () => { delete store[p]; },
      collection: c => col(p + '/' + c)
    };
  }
  function deepMerge(a, b) {
    Object.keys(b).forEach(k => {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') a[k] = deepMerge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }
  function col(c) {
    const q = f => ({
      where: (k, op, v) => q(f.concat([[k, v]])),
      get: async () => ({ docs: Object.keys(store).filter(p => p.startsWith(c + '/') && p.split('/').length === c.split('/').length + 1 && f.every(([k, v]) => store[p][k] === v))
        .map(p => ({ id: p.split('/').pop(), data: () => clone(store[p]), ref: docRef(p) })) })
    });
    return Object.assign({ doc: id => docRef(c + '/' + id) }, q([]));
  }
  const admin = {
    database: () => ({ ref: p => ({ once: async () => ({ val: () => rtdb[p] }) }) }),
    firestore: () => ({ collection: col, runTransaction: async fn => fn({ get: r => r.get(), set: (r, d, o) => r.set(d, o), update: (r, d) => r.update(d) }) }),
    auth: () => ({ verifyIdToken: async t => users[t] ? users[t] : Promise.reject(new Error('bad token')) })
  };
  return { admin, store };
}

// fetch stand-in for Twitch: names containing "bigstar" are partners; "nobody" doesn't exist
const fakeFetch = async url => ({ ok: true, status: 200, json: async () => url.includes('oauth2') ? { access_token: 't', expires_in: 3600 }
  : url.includes('nobody') ? { data: [] } : { data: [{ broadcaster_type: url.includes('bigstar') ? 'partner' : '' }] } });

function start(app) {
  const srv = app.listen(0), base = 'http://127.0.0.1:' + srv.address().port;
  return {
    srv, base,
    get: p => fetch(base + p).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) })),
    post: (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) })),
    hook: (obj, secret) => { const raw = JSON.stringify(obj); return fetch(base + '/bmc/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature-sha256': crypto.createHmac('sha256', secret).update(raw).digest('hex') }, body: raw }).then(async r => r.status + ' ' + await r.text()); }
  };
}
module.exports = { fakeAdmin, fakeFetch, start };
