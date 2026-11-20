// Shared helpers for the Mobilegames board-game hub: Firebase init, Google login,
// friend codes (same accounts/friend_codes + /users/{emailKey}/friend_code as the Game Tracker), and saves under the
// friend code in Firestore (user/{CODE}/platform/mobile/game/{game}). Live rooms and "now playing" stay in the Realtime Database.
(function () {
  var cfg = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c"
  };
  var app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(cfg);
  var auth = firebase.auth(app), db = firebase.database(app);
  var WW = window.WW = { auth: auth, db: db, user: null, friendCode: null, serverOffset: 0 };

  db.ref('.info/serverTimeOffset').on('value', function (s) { WW.serverOffset = s.val() || 0; });
  WW.now = function () { return Date.now() + WW.serverOffset; };

  WW.emailKey = function (email) { return String(email).toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_'); };


  // ---- Local (offline / guest) database: same tiny API as the Firebase refs we use, saved in localStorage.
  function makeLocal() {
    var KEY = 'werewolf_mobilegames_local_v1', store = {}, ls = {};
    try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
    function parts(p) { return p.split('/').filter(Boolean); }
    function get(p) {
      var o = store; parts(p).forEach(function (k) { o = (o && typeof o === 'object') ? o[k] : undefined; });
      return o === undefined ? null : JSON.parse(JSON.stringify(o));
    }
    function fix(v) {
      if (v && typeof v === 'object') {
        if (v['.sv'] === 'timestamp') return Date.now();
        Object.keys(v).forEach(function (k) { v[k] = fix(v[k]); });
      }
      return v;
    }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
    function snap(p) { var v = get(p); return { val: function () { return v; }, exists: function () { return v !== null; } }; }
    function fire() { Object.keys(ls).forEach(function (p) { ls[p].forEach(function (cb) { cb(snap(p)); }); }); }
    function put(p, v) {
      var ks = parts(p), o = store;
      for (var i = 0; i < ks.length - 1; i++) { if (!o[ks[i]] || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
      if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = fix(JSON.parse(JSON.stringify(v)));
      persist(); fire();
    }
    function ref(p) {
      return {
        child: function (c) { return ref(p + '/' + c); },
        set: function (v) { put(p, v); return Promise.resolve(); },
        remove: function () { put(p, null); return Promise.resolve(); },
        update: function (o) { Object.keys(o || {}).forEach(function (k) { put(p + '/' + k, o[k]); }); return Promise.resolve(); },
        once: function () { return Promise.resolve(snap(p)); },
        on: function (e, cb) { (ls[p] = ls[p] || []).push(cb); cb(snap(p)); },
        transaction: function (fn, done) {
          var r = fn(get(p));
          if (r !== undefined) { put(p, r); done && done(null, true, snap(p)); } else done && done(null, false, snap(p));
        },
        onDisconnect: function () { return { remove: function () {} }; }
      };
    }
    return { ref: ref };
  }
  var local = makeLocal();
  WW.mode = 'cloud'; // 'cloud' = Firebase (signed in), 'local' = this device only
  WW.useLocal = function () { WW.mode = 'local'; };
  WW.roomRef = function (game, code) { return WW.mode === 'cloud' ? db.ref('mobilegames/rooms/' + game + '/' + code) : local.ref('game_rooms/' + game + '/solo'); };
  WW.onError = function (msg) { alert(msg); };

  WW.signIn = function () {
    var p = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(p).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        return auth.signInWithRedirect(p);
      }
      var c = e && e.code, m = (e && e.message) || String(e);
      if (c === 'auth/unauthorized-domain') m = 'This site\u2019s address (' + location.hostname + ') is not in Firebase > Authentication > Settings > Authorized domains.';
      else if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') m = 'Sign-in window was closed before finishing.';
      WW.onError('Sign-in problem: ' + m);
    });
  };
  WW.signOut = function () { return auth.signOut(); };

  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function randomCode() {
    var s = ''; for (var i = 0; i < 8; i++) s += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
    return s;
  }

  // Reuses the tracker's friend code; creates one (same format) only if the user has none yet.

  // friend_codes/{CODE} is the owner's user key (text) in newer records, a profile-style object in older ones. Returns the key if it can be worked out.
  async function ownerKeyOfCode(v, code) {
    if (typeof v === 'string') return v || null;
    if (!v || typeof v !== 'object') return null;
    var cands = [];
    function add(x) { if (typeof x !== 'string') return; x = x.trim(); if (!x || x.length > 120) return; cands.push(x.indexOf('@') > -1 ? x.toLowerCase().replace(/\./g, '_').replace('@', '_at_') : x); }
    ['user_key', 'userKey', 'email_key', 'emailKey', 'key', 'owner', 'uid', 'email', 'user'].forEach(function (f) { add(v[f]); });
    Object.keys(v).forEach(function (f) { add(v[f]); });
    var seen = {};
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i]; if (seen[c] || /[.$#\[\]\/]/.test(c)) continue; seen[c] = 1;
      try { var fc = (await db.ref('users/' + c + '/friend_code').once('value')).val(); if (String(fc || '').toUpperCase() === String(code).toUpperCase()) return c; } catch (e) {}
    }
    return null;
  }
  WW.ensureFriendCode = async function (user) {
    var key = WW.emailKey(user.email);
    var ref = db.ref('users/' + key + '/friend_code');
    var existing = (await ref.once('value')).val();
    if (existing) {   // older accounts have users/{key}/friend_code but no friend_codes/{code} entry: add it so friends can find us
      try { if (!(await db.ref('accounts/friend_codes/' + existing).once('value')).exists()) await db.ref('accounts/friend_codes/' + existing).set(key); } catch (e) {}
      return existing;
    }
    for (var i = 0; i < 6; i++) {
      var code = randomCode();
      var taken = (await db.ref('accounts/friend_codes/' + code).once('value')).exists();
      if (taken) continue;
      await db.ref('accounts/friend_codes/' + code).set(key);
      await ref.set(code);
      return code;
    }
    throw new Error('Could not create a friend code');
  };

  // ---- Player saves live in Firestore under the FRIEND CODE: user/{CODE}/platform/mobile/game/{saveKey}
  //   { save: "<json>", saveAt }  (stored as text so any shape of save fits Firestore)
  // Every save is kept on this device right away; Firestore gets at most one write per game every 30 seconds
  // (plus one when the page is hidden or closed), which keeps a long farming session inside the free plan.
  // A save still sitting in the old Realtime Database place is read once and moved over on the next save.
  var fsP = null;
  WW.fs = function () {
    if (!fsP) fsP = new Promise(function (res) {
      if (firebase.firestore) return res(firebase.firestore(app));
      var sc = document.createElement('script'); sc.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js';
      sc.onload = function () { try { res(firebase.firestore(app)); } catch (e) { console.warn('firestore', e); res(null); } };
      sc.onerror = function () { console.warn('firestore script failed to load'); res(null); };
      document.head.appendChild(sc);
    });
    return fsP;
  };
  function cloudOn() { return WW.mode === 'cloud' && WW.user && WW.friendCode; }
  function docId(k) { return String(k).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'game'; }
  WW.mobileDoc = async function (id, code) {
    var f = await WW.fs(); code = code || WW.friendCode; if (!f || !code) return null;
    return f.collection('user').doc(String(code).toUpperCase()).collection('platform').doc('mobile').collection('game').doc(docId(id));
  };
  var deviceKey = function (game) { return 'ww_save_' + (WW.friendCode || 'guest') + '_' + game; };
  function keepOnDevice(game, data) { try { localStorage.setItem(deviceKey(game), JSON.stringify(data)); } catch (e) {} }
  function fromDevice(game) { try { return JSON.parse(localStorage.getItem(deviceKey(game))); } catch (e) { return null; } }
  WW.loadSave = async function (game) {
    if (!cloudOn()) return (await local.ref('games_saves/local/' + game).once('value')).val();
    var cloud = null, dev = fromDevice(game);
    try { var d = await (await WW.mobileDoc(game)).get(); if (d.exists && d.data().save) cloud = JSON.parse(d.data().save); } catch (e) { console.warn('load save', e); }
    if (!cloud) { try { cloud = (await db.ref('mobilegames/saves/' + WW.user.uid + '/' + game).once('value')).val(); } catch (e) {} }   // older save, moved on next write
    if (dev && (!cloud || (dev.updatedAt || 0) > (cloud.updatedAt || 0))) return dev;   // this device has something newer than the cloud
    return cloud;
  };
  var pend = {}, lastPush = {};
  async function pushSave(game) {
    var data = pend[game]; if (!data) return; delete pend[game]; lastPush[game] = Date.now();
    try { await (await WW.mobileDoc(game)).set({ save: JSON.stringify(data), saveAt: data.updatedAt || Date.now() }, { merge: true }); }
    catch (e) { console.warn('cloud save failed (kept on this device):', e && (e.code || e.message)); }
  }
  WW.writeSave = function (game, data) {
    if (!cloudOn()) { data.updatedAt = Date.now(); return local.ref('games_saves/local/' + game).set(data); }
    data.updatedAt = WW.now(); keepOnDevice(game, data); pend[game] = data;
    var wait = 30000 - (Date.now() - (lastPush[game] || 0));
    if (wait <= 0) return pushSave(game);
    clearTimeout(pend['_t' + game]); pend['_t' + game] = setTimeout(function () { pushSave(game); }, wait);
    return Promise.resolve();
  };
  WW.flushSaves = function () { Object.keys(pend).forEach(function (g) { if (g.indexOf('_t') !== 0) { clearTimeout(pend['_t' + g]); pushSave(g); } }); };
  document.addEventListener('visibilitychange', function () { if (document.hidden) WW.flushSaves(); });
  addEventListener('pagehide', function () { WW.flushSaves(); });

  // ---- avatar (same users/{emailKey}/avatar_url the rest of the site uses)
  function secure(u) { u = String(u || ''); if (u.indexOf('//') === 0) return 'https:' + u; return u.replace(/^http:\/\//, 'https://'); }
  WW.secureUrl = secure; WW.avatar = '';
  WW.loadAvatar = async function (user) {
    try { var v = (await db.ref('users/' + WW.emailKey(user.email) + '/avatar_url').once('value')).val(); WW.avatar = typeof v === 'string' ? secure(v) : ''; } catch (e) {}
    try { var nk = (await db.ref('users/' + WW.emailKey(user.email) + '/username').once('value')).val(); WW.nick = typeof nk === 'string' ? nk.trim().slice(0, 16) : ''; } catch (e) {}   // the site nickname (Settings > username)
    return WW.avatar;
  };
  WW.avatarHtml = function (url, name, px) {
    px = px || 22; var ini = String(name || '?').trim().charAt(0).toUpperCase();
    if (url) return '<img src="' + secure(url) + '" alt="" width="' + px + '" height="' + px + '" style="border-radius:50%;object-fit:cover;flex:none" onerror="this.style.display=\'none\'">';
    return '<span style="display:inline-flex;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:#475569;color:#fff;font-size:' + Math.round(px * .5) + 'px;font-weight:700;align-items:center;justify-content:center;flex:none">' + ini + '</span>';
  };

  // ---- player shapes: 0 circle, 1 triangle, 2 square, 3 egg
  WW.SHAPE_NAMES = ['Circle', 'Triangle', 'Square', 'Egg'];
  WW.shape = function (p, r, fill, stroke, sw) {
    var a = ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"';
    if (p === 0) return '<circle r="' + r + '"' + a + '/>';
    if (p === 1) return '<polygon points="0,' + (-1.15 * r) + ' ' + (1.05 * r) + ',' + (.85 * r) + ' ' + (-1.05 * r) + ',' + (.85 * r) + '"' + a + ' stroke-linejoin="round"/>';
    if (p === 2) return '<rect x="' + (-.9 * r) + '" y="' + (-.9 * r) + '" width="' + (1.8 * r) + '" height="' + (1.8 * r) + '" rx="' + (.18 * r) + '"' + a + '/>';
    var f = function (x, y) { return (x * r) + ',' + (y * r); };
    return '<path d="M' + f(0, -1.15) + ' C' + f(.95, -1.15) + ' ' + f(1.1, .2) + ' ' + f(1.1, .5) + ' C' + f(1.1, 1.05) + ' ' + f(.6, 1.2) + ' ' + f(0, 1.2) + ' C' + f(-.6, 1.2) + ' ' + f(-1.1, 1.05) + ' ' + f(-1.1, .5) + ' C' + f(-1.1, .2) + ' ' + f(-.95, -1.15) + ' ' + f(0, -1.15) + 'Z"' + a + '/>';
  };
  WW.shapeIcon = function (p, px, color) {
    return '<svg width="' + px + '" height="' + px + '" viewBox="-1.5 -1.5 3 3" style="vertical-align:middle;flex:none">' + WW.shape(p, 1, color, '#fff', .14) + '</svg>';
  };

  // ---- "now playing" status shown to friends. Keyed by the player's FRIEND CODE (game_rooms/presence/{code}), because that is
  // what every friends list stores, so no other lookup is needed. (Also mirrored to users/{key}/now_playing for older readers.)
  function playRef() { return (WW.mode === 'cloud' && WW.user && WW.user.email) ? db.ref('users/' + (WW.playKey || WW.emailKey(WW.user.email)) + '/now_playing') : null; }
  function presenceRef() { return (WW.mode === 'cloud' && WW.user && WW.friendCode) ? db.ref('mobilegames/rooms/presence/' + WW.friendCode) : null; }
  WW.publishPlaying = function (info) {
    var who = String((WW.user && WW.user.displayName) || '').split(' ')[0] || 'Friend';
    [presenceRef(), playRef()].forEach(function (r, i) {
      if (!r) return;
      try {
        r.onDisconnect().remove();
        r.set(Object.assign({ platform: 'mobile', n: who }, info, { t: firebase.database.ServerValue.TIMESTAMP }))
          .then(function () { if (i === 0) WW.presenceError = null; })
          .catch(function (e) { if (i === 0) WW.presenceError = e; console.warn('now-playing write failed (friends will not see you playing):', e && (e.code || e.message)); });
      } catch (e) { if (i === 0) WW.presenceError = e; }
    });
  };
  // ---- progress shown on the player's profile page: Firestore user/{CODE}/platform/mobile/game/{game}.progress = { title, icon, line, stats..., t }
  // Each game sends a small summary now and then (at most once a minute per game, and only when it changed).
  // Saved with the game in Firestore: user/{CODE}/platform/mobile/game/{game}.progress
  var progLast = {};
  WW.publishProgress = function (game, info) {
    if (!cloudOn() || !/^[a-z0-9_-]{2,24}$/.test(game)) return;
    var body = JSON.stringify(info), now = Date.now(), L = progLast[game];
    if (L && (L.body === body || now - L.t < 60000)) { if (L.body !== body) L.pending = info; return; }
    progLast[game] = { body: body, t: now };
    WW.mobileDoc(game).then(function (d) { return d && d.set({ progress: Object.assign({}, info, { t: WW.now() }) }, { merge: true }); }).catch(function () {});
  };
  setInterval(function () { Object.keys(progLast).forEach(function (g) { var L = progLast[g]; if (L.pending) { var p = L.pending; L.pending = null; L.t = 0; WW.publishProgress(g, p); } }); }, 60000);
  WW.clearPlaying = function () { [presenceRef(), playRef()].forEach(function (r) { if (r) r.remove().catch(function () {}); }); };

  // ---- win / loss history (games_saves/{uid}/history, private to each player)
  // Finished games: Firestore user/{CODE}/platform/mobile/game/{game}.history.{key} (last 200 per game)
  function localHist() { return local.ref('games_saves/local/history'); }
  WW.recordResult = async function (key, rec) {
    try {
      key = String(key).replace(/[^A-Za-z0-9_-]/g, '_');
      if (!cloudOn()) {
        var r = localHist().child(key), ex = (await r.once('value')).val(); if (ex !== null && ex !== undefined) return false;
        rec.t = Date.now(); await r.set(rec); return true;
      }
      var d = await WW.mobileDoc(rec.game || 'other'), cur = await d.get(), h = (cur.exists && cur.data().history) || {};
      if (h[key]) return false;
      rec.t = Date.now(); var up = {}; up[key] = rec;
      var keys = Object.keys(h).sort(function (a, b) { return (h[a].t || 0) - (h[b].t || 0); });
      var del = keys.slice(0, Math.max(0, keys.length + 1 - 200));
      await d.set({ history: up }, { merge: true });
      if (del.length) { var rm = {}; del.forEach(function (k) { rm['history.' + k] = firebase.firestore.FieldValue.delete(); }); d.update(rm).catch(function () {}); }
      WW.syncLeaders(); return true;
    } catch (e) { console.warn('history', e); return false; }
  };

  // ---- shared leaderboard (game_leaders/{game}/{uid}; everyone signed in can read, each player writes only their own row)
  // The row is rebuilt from the player's own win / loss history, so it fixes itself and old games count too.
  function leadersOn() { return WW.mode === 'cloud' && WW.user; }
  function myTag() { var av = WW.avatar || ''; if (!/^https:\/\//.test(av) || av.length > 500) av = ''; return { n: String(WW.nick || WW.user.displayName || 'Player').split(' ')[0].slice(0, 16), av: av, t: Date.now() }; }
  WW.syncLeaders = async function () {
    if (!leadersOn()) return;
    try {
      var list = await WW.loadHistory(), per = {};
      list.forEach(function (r) {
        if (!r || !r.game) return; var g = per[r.game] = per[r.game] || { w: 0, l: 0, bw: 0, bl: 0 };
        var people = (r.opp || []).some(function (o) { return o && !o.b; });
        if (r.result === 'win') g[people ? 'w' : 'bw']++; else g[people ? 'l' : 'bl']++;
      });
      var tag = myTag(), up = {};
      Object.keys(per).forEach(function (g) { if (!/^[a-z0-9_-]{2,24}$/.test(g)) return; ['w', 'l', 'bw', 'bl'].forEach(function (k) { up[g + '/' + WW.user.uid + '/' + k] = per[g][k]; }); ['n', 'av', 't'].forEach(function (k) { up[g + '/' + WW.user.uid + '/' + k] = tag[k]; }); });
      if (Object.keys(up).length) await db.ref('mobilegames/leaders').update(up);
      Object.keys(per).forEach(function (g) { if (!/^[a-z0-9_-]{2,24}$/.test(g)) return; var p = per[g]; WW.publishProgress(g, { kind: 'record', w: p.w, l: p.l, bw: p.bw, bl: p.bl }); });
    } catch (e) { console.warn('leaders', e); }
  };
  // best score for a game: higher is better unless lowerIsBetter (e.g. fewest shots)
  WW.postBest = async function (game, score, lowerIsBetter) {
    if (!leadersOn() || !(score > 0)) return;
    try {
      var ref = db.ref('mobilegames/leaders/' + game + '/' + WW.user.uid), cur = (await ref.child('best').once('value')).val();
      var tag = myTag(); if (typeof cur !== 'number' || (lowerIsBetter ? score < cur : score > cur)) tag.best = score;
      await ref.update(tag);
    } catch (e) { console.warn('leaders', e); }
  };
  WW.loadLeaders = async function () { if (!leadersOn()) return null; try { return (await db.ref('mobilegames/leaders').once('value')).val() || {}; } catch (e) { console.warn('leaders', e); return null; } };
  WW.loadHistory = async function () {
    var all = {};
    try {
      if (!cloudOn()) { all = (await localHist().once('value')).val() || {}; }
      else {
        var f = await WW.fs(), snap = await f.collection('user').doc(WW.friendCode).collection('platform').doc('mobile').collection('game').get();
        snap.forEach(function (d) { var h = d.data().history || {}; Object.keys(h).forEach(function (k) { all[k] = h[k]; }); });
        try { var old = (await db.ref('mobilegames/saves/' + WW.user.uid + '/history').once('value')).val() || {}; Object.keys(old).forEach(function (k) { if (!all[k]) all[k] = old[k]; }); } catch (e) {}   // older results
      }
    } catch (e) { console.warn('history', e); }
    return Object.keys(all).map(function (k) { return all[k]; }).filter(Boolean).sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  WW.esc = esc;
  WW.historyHtml = function (list, game) {
    if (game) list = list.filter(function (r) { return r.game === game; });
    if (!list.length) return '<div style="color:#94a3b8;font-size:.85rem">No finished games yet.</div>';
    var w = 0, l = 0, vs = {};
    list.forEach(function (r) {
      if (r.result === 'win') w++; else l++;
      var opp = r.opp || [];
      if (r.result === 'win') opp.forEach(function (o) { var k = o.b ? 'bots' : (o.u || o.n); vs[k] = vs[k] || { n: o.b ? 'Bots' : o.n, w: 0, l: 0 }; vs[k].w++; });
      else if (r.winner) { var o = r.winner, k = o.b ? 'bots' : (o.u || o.n); vs[k] = vs[k] || { n: o.b ? 'Bots' : o.n, w: 0, l: 0 }; vs[k].l++; }
    });
    var h = '<div style="font-size:.9rem;margin-bottom:6px"><b>' + (game ? '' : 'All games: ') + w + ' won · ' + l + ' lost</b></div>';
    h += '<div style="font-size:.8rem;color:#94a3b8;margin:6px 0 2px">Versus</div>';
    Object.keys(vs).sort(function (a, b) { return (vs[b].w + vs[b].l) - (vs[a].w + vs[a].l); }).forEach(function (k) {
      h += '<div style="display:flex;justify-content:space-between;font-size:.85rem;padding:2px 0"><span>' + esc(vs[k].n) + '</span><span>' + vs[k].w + ' W · ' + vs[k].l + ' L</span></div>';
    });
    h += '<div style="font-size:.8rem;color:#94a3b8;margin:10px 0 2px">Recent games</div>';
    list.slice(0, 20).forEach(function (r) {
      var d = new Date(r.t || 0), names = (r.opp || []).map(function (o) { return o.n; }).join(', ');
      h += '<div style="font-size:.8rem;padding:3px 0;border-top:1px solid #334155">' + (r.result === 'win' ? '✅ Won' : '❌ Lost') + ' · ' + esc(r.title || r.game) + ' · ' + (d.getMonth() + 1) + '/' + d.getDate() +
        '<div style="color:#94a3b8">vs ' + esc(names || 'bots') + (r.result !== 'win' && r.winner ? ' · winner: ' + esc(r.winner.n) : '') + '</div></div>';
    });
    return h;
  };

  // ---- what friends are playing right now (mobile games live, plus PlayStation / Steam when the site has it)
  WW.loadFriendsNow = async function () {
    if (!WW.user || !WW.user.email) return [];
    var key = WW.emailKey(WW.user.email), out = [], now = WW.now();
    var friends = (await db.ref('users/' + key + '/friends').once('value')).val() || {};
    await Promise.all(Object.keys(friends).map(async function (fk) {
      var fo = friends[fk] || {}, code = fo.friend_code || fk;
      var item = { code: code, name: fo.username || code, avatar: fo.avatar_url || '', plays: [] };
      try {
        // 1) the friend's status, straight from their friend code
        var pr = (await db.ref('mobilegames/rooms/presence/' + code).once('value')).val();
        if (pr && pr.t && now - pr.t < 150000) item.plays.push({ kind: 'mobile', game: pr.game, title: pr.title, status: pr.status || '', room: pr.room || code, open: pr.open | 0, solo: !!pr.solo });
      } catch (e) { console.warn('friend presence', e); }
      try {
        // 2) optional extras (avatar, privacy setting, PlayStation / Steam) when their profile can be found
        var uk = await ownerKeyOfCode((await db.ref('accounts/friend_codes/' + code).once('value')).val(), code);
        if (uk) {
          var prof = (await db.ref('users/' + uk).once('value')).val() || {};
          var scope = prof.tracking_scope || 'friends';
          if (scope === 'private') { out.push({ code: code, name: item.name, avatar: item.avatar, plays: [], note: 'private' }); return; }
          item.name = prof.username || prof.display_name || fo.username || code; item.avatar = prof.avatar_url || fo.avatar_url || '';
          var np = prof.now_playing;
          if (!item.plays.length && np && np.t && now - np.t < 150000) item.plays.push({ kind: 'mobile', game: np.game, title: np.title, status: np.status || '', room: np.room, open: np.open | 0 });
          var tag = prof.psn_username || fo.psn_username;
          if (tag) {
            // PlayStation presence lives in the playstation-stats database, not the site's own one.
            var ps = null, psTags = [tag]; if (String(tag).toLowerCase() !== tag) psTags.push(String(tag).toLowerCase());
            for (var pi = 0; pi < psTags.length && !ps; pi++) { try { var pr2 = await fetch('https://playstation-stats-default-rtdb.firebaseio.com/psn/gamertags/' + encodeURIComponent(psTags[pi]) + '.json?t=' + Date.now()); if (pr2.ok) ps = await pr2.json(); } catch (e) {} }
            if (ps && (ps.online === true || ps.online === 'true') && ps.currentGame && !/^(idle|standby)$/i.test(String(ps.currentGame))) { var gs = String(ps.gameStatus || ps.currentGameActivity || '').trim(); item.plays.push({ kind: 'console', platform: ps.displayPlatform || ps.platform || 'PlayStation', title: ps.currentGame, status: gs && gs.toLowerCase() !== String(ps.currentGame).toLowerCase() ? gs : '' }); }
          }
          var xt = String(prof.xbox_gamertag || fo.xbox_gamertag || '').trim();
          if (xt) { try { var xr = await fetch('https://playstation-stats-default-rtdb.firebaseio.com/xbox/gamertags/' + encodeURIComponent(xt) + '.json?t=' + Date.now()); var xd = xr.ok ? await xr.json() : null; if (xd && /online/i.test(xd.presenceState || '') && xd.presenceText && !/^(home|online)$/i.test(String(xd.presenceText).trim())) item.plays.push({ kind: 'console', platform: 'Xbox', title: String(xd.presenceText), status: '' }); } catch (e) {} }
          var sid = String(prof.steam_id || '').trim();
          if (sid) {
            if (!/^7656119\d{10}$/.test(sid)) { var vn = (await db.ref('platforms/steam_vanity/' + sid.toLowerCase()).once('value')).val(); sid = typeof vn === 'string' ? vn : ''; }
            if (sid) { var sp = (await db.ref('platforms/steam_users/' + sid + '/profile').once('value')).val(); if (sp && sp.currentGame) item.plays.push({ kind: 'console', platform: 'Steam', title: sp.currentGame, status: '' }); }
          }
        }
      } catch (e) { console.warn('friend extras', e); }
      out.push(item);
    }));
    return out;
  };

  // ---- "My color": one colour each player picks for themselves in every game (frog, car, tractor ...).
  // Saved on this device and, when signed in, at users/{key}/game_color so it follows you to other devices.
  // Falls back to the site profile colour (users/{key}/primary_color). Games listen for the 'ww-color' event.
  WW.GAME_COLORS = ['#22c55e', '#16a34a', '#a3e635', '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#6366f1', '#a855f7', '#e879f9', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#facc15', '#f8fafc', '#94a3b8', '#78350f', '#1f2937'];
  var COLOR_KEY = 'mg_my_color';
  function hexOk(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c.trim()); }
  WW.myColor = function (fallback) { try { var c = localStorage.getItem(COLOR_KEY); if (hexOk(c)) return c; } catch (e) {} return fallback || null; };
  WW.setMyColor = function (c) {
    if (!hexOk(c)) return; c = c.trim().toLowerCase();
    try { localStorage.setItem(COLOR_KEY, c); } catch (e) {}
    if (WW.user && WW.user.email) db.ref('users/' + WW.emailKey(WW.user.email) + '/game_color').set(c).catch(function (e) { console.warn('game_color save failed', e && (e.code || e.message)); });
    try { window.dispatchEvent(new CustomEvent('ww-color', { detail: c })); } catch (e) {}
  };
  async function loadCloudColor(user) {
    try {
      var r = db.ref('users/' + WW.emailKey(user.email)), gc = (await r.child('game_color').once('value')).val();
      if (!hexOk(gc) && !WW.myColor()) gc = (await r.child('primary_color').once('value')).val();   // never picked one: start from the profile colour
      else if (!hexOk(gc) && WW.myColor()) { r.child('game_color').set(WW.myColor()).catch(function () {}); return; }   // picked one before signing in: keep it
      if (hexOk(gc) && gc.toLowerCase() !== (WW.myColor() || '').toLowerCase()) { localStorage.setItem(COLOR_KEY, gc.trim().toLowerCase()); window.dispatchEvent(new CustomEvent('ww-color', { detail: gc.trim().toLowerCase() })); }
    } catch (e) {}
  }
  WW.openColorPicker = function () {
    var cur = WW.myColor('#22c55e'), ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:1001;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px;font-family:system-ui,sans-serif';
    var sw = WW.GAME_COLORS.map(function (c) { return '<button data-c="' + c + '" title="' + c + '" style="width:40px;height:40px;border-radius:50%;cursor:pointer;background:' + c + ';border:3px solid ' + (c === cur ? '#fff' : 'transparent') + ';box-shadow:0 0 0 1px #0006 inset"></button>'; }).join('');
    ov.innerHTML = '<div style="background:#1e293b;color:#e2e8f0;border-radius:16px;padding:16px;width:min(94vw,380px)">'
      + '<div style="font-weight:800;font-size:1.1rem;margin-bottom:4px">🎨 My color</div>'
      + '<div style="font-size:.8rem;color:#94a3b8;margin-bottom:12px">Your frog, car and tractor use this color in every game, and friends see it too.</div>'
      + '<div style="display:grid;grid-template-columns:repeat(5,40px);gap:10px;justify-content:center">' + sw + '</div>'
      + '<label style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;font-size:.88rem">Any other color: <input type="color" value="' + cur + '" style="width:52px;height:36px;border:0;background:none;padding:0;cursor:pointer"></label>'
      + '<button data-close style="margin-top:14px;width:100%;background:#475569;color:#fff;border:0;border-radius:10px;padding:11px;font:inherit;cursor:pointer">Done</button></div>';
    document.body.appendChild(ov);
    function pick(c) { WW.setMyColor(c); ov.querySelectorAll('[data-c]').forEach(function (b) { b.style.borderColor = b.getAttribute('data-c') === c.toLowerCase() ? '#fff' : 'transparent'; }); }
    ov.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) pick(b.getAttribute('data-c')); else if (e.target === ov || e.target.hasAttribute('data-close')) ov.remove(); });
    ov.querySelector('input').addEventListener('input', function (e) { pick(e.target.value); });
    ov.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') ov.remove(); }, true);
  };

  // cb(user|null, friendCode|null) on every auth change
  WW.onReady = function (cb) {
    auth.onAuthStateChanged(async function (user) {
      WW.user = user || null; WW.friendCode = null;
      if (user && user.email) await loadCloudColor(user);
      if (user) { try { WW.friendCode = await WW.ensureFriendCode(user); } catch (e) { console.error(e); } }
      if (user && WW.friendCode) { try { var pk = (await db.ref('accounts/friend_codes/' + WW.friendCode).once('value')).val(); WW.playKey = (await ownerKeyOfCode(pk, WW.friendCode)) || null; } catch (e) { WW.playKey = null; } }   // friends read us at the key our friend code points to
      if (user) await WW.loadAvatar(user);
      cb(WW.user, WW.friendCode);
    });
  };
})();

// ---- mobile zoom guard: no double-tap / input-focus zoom, and a "Reset zoom" button if the page ever ends up zoomed in
(function () {
  try {
    var st = document.createElement('style');
    st.textContent = '@media (orientation:landscape) and (max-height:560px){#main{grid-template-columns:minmax(0,calc(100vh - 64px)) minmax(0,1fr)!important;max-width:none!important;align-items:start} #boardWrap,#left{max-width:calc(100vh - 64px)!important}} html,body,button,a,label,summary{touch-action:manipulation}@media (pointer:coarse){input,select,textarea{font-size:16px!important}}';
    document.head.appendChild(st);
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });          // iOS pinch
    var vv = window.visualViewport, btn = null;
    function reset() {
      var m = document.querySelector('meta[name=viewport]'); if (!m) return;
      var old = m.getAttribute('content'); m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      setTimeout(function () { m.setAttribute('content', old); window.scrollTo(0, 0); }, 120);
    }
    function check() {
      var zoomed = vv && vv.scale > 1.02;
      if (zoomed && !btn) {
        btn = document.createElement('button'); btn.textContent = '🔍 Reset zoom';
        btn.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;padding:10px 16px;border-radius:999px;border:2px solid #fff;background:#0f172a;color:#fff;font:700 14px system-ui,sans-serif';
        btn.onclick = function () { reset(); btn.remove(); btn = null; }; document.body.appendChild(btn);
      } else if (!zoomed && btn) { btn.remove(); btn = null; }
    }
    if (vv) { vv.addEventListener('resize', check); vv.addEventListener('scroll', check); }
  } catch (e) {}
})();

// site-wide achievement pop-ups (shared with the rest of the site)
(function () { try { var s = document.createElement('script'); s.src = '../Claude-Test/ww-ach-toast.js'; s.defer = true; document.head.appendChild(s); } catch (e) {} })();

// friend-message pop-ups while playing (who it's from + a short preview, with quick reply)
(function () { try { var s = document.createElement('script'); s.src = '../Claude-Test/ww-msg-toast.js'; s.defer = true; document.head.appendChild(s); } catch (e) {} })();

// ---- play offline: the site's service worker keeps a copy of the game files (and Firebase's library), so a game you've
// opened before still starts with no signal. Progress saved meanwhile syncs to your account when you're back online.
(function () { try { if ('serviceWorker' in navigator) { var root = location.pathname.split('/Mobilegames/')[0] + '/'; navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(function () {}); } } catch (e) {} })();
(function () {
  var bar = null;
  function show(on) {
    if (!document.body) return;
    if (!bar) { bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;background:#7c2d12;color:#fff;font:600 12px system-ui,sans-serif;padding:5px 12px;border-radius:999px;box-shadow:0 4px 14px #0007;pointer-events:none'; document.body.appendChild(bar); }
    bar.textContent = on ? '📴 Offline: keep playing, your progress syncs when you\u2019re back online' : '✅ Back online: syncing your progress';
    bar.style.display = 'block'; clearTimeout(show.t); if (!on) show.t = setTimeout(function () { bar.style.display = 'none'; }, 4000);
  }
  addEventListener('offline', function () { show(true); });
  addEventListener('online', function () { show(false); });
  addEventListener('load', function () { if (navigator.onLine === false) show(true); });
})();

// ---- what's new: after an update, show each player (once) what changed in this game. Entries live in Mobilegames/changelog.json.
(function () {
  try {
    var KEY = 'mg_changelog_seen', page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    fetch('changelog.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.entries || !j.entries.length) return;
      var top = j.entries.reduce(function (m, e) { return Math.max(m, (+e.id || 0)); }, 0), seen = +(localStorage.getItem(KEY) || 0);
      localStorage.setItem(KEY, String(top));
      if (!seen) { var ids = j.entries.map(function (e) { return (+e.id || 0); }).sort(function (a, b) { return b - a; }); seen = ids[2] || 0; }   // first time on this device: show the two newest notes
      var fresh = j.entries.filter(function (e) { return ((+e.id || 0)) > seen && (e.game === 'all' || e.game === page || (page === 'index' && e.game)); });
      if (!fresh.length) return;
      var esc = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
      var items = []; fresh.forEach(function (e) { (e.items || []).forEach(function (it) { items.push(it); }); });
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:0;z-index:2147483050;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px;font:14px/1.45 system-ui,sans-serif';
      box.innerHTML = '<div style="background:#1e293b;color:#e2e8f0;border:2px solid #22c55e;border-radius:16px;padding:16px 18px;width:min(94vw,440px);max-height:80vh;overflow:auto;box-shadow:0 14px 40px #000a">' +
        '<div style="font-weight:800;font-size:18px;margin-bottom:6px">🆕 What\u2019s new' + (fresh[0].date ? ' <small style="font-weight:500;opacity:.7">· ' + esc(fresh[0].date) + '</small>' : '') + '</div>' +
        '<ul style="margin:0;padding-left:20px">' + items.slice(0, 30).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<button style="margin-top:12px;width:100%;background:#16a34a;color:#fff;border:0;border-radius:10px;padding:11px;font:700 15px system-ui,sans-serif;cursor:pointer">Got it</button></div>';
      var close = function () { box.remove(); };
      box.querySelector('button').onclick = close; box.addEventListener('pointerdown', function (e) { if (e.target === box) close(); });
      window.addEventListener('keydown', function k(e) { if (!box.isConnected) return window.removeEventListener('keydown', k, true); if (e.key === 'Escape' || e.key === 'Enter') { close(); } e.stopPropagation(); }, true);
      (document.body ? Promise.resolve() : new Promise(function (r) { addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(box); });
    }).catch(function () {});
  } catch (e) {}
})();

// ---- auto-update: when new game files are deployed, show a "tap to refresh" bar (no more Ctrl+F5). Checks every minute and when you come back to the tab.
(function () {
  try {
    var files = ['changelog.json', 'js/common.js', 'js/gamenav.js', 'js/farm3d.js', 'js/world.js', 'js/config.js', location.pathname.split('/').pop() || 'index.html'], base = {}, shown = false;
    function sig(f) { return fetch(f, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length') || '') : ''; }).catch(function () { return ''; }); }
    function check(first) {
      if (shown) return;
      Promise.all(files.map(sig)).then(function (s) {
        var changed = false;
        files.forEach(function (f, i) { if (!s[i]) return; if (first || base[f] === undefined) base[f] = s[i]; else if (base[f] !== s[i]) changed = true; });
        if (changed) banner();
      });
    }
    function banner() {
      if (shown) return; shown = true;
      var b = document.createElement('button'); b.textContent = '🔄 New update ready: tap to refresh';
      b.style.cssText = 'position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483100;padding:10px 16px;border-radius:999px;border:2px solid #fff;background:#16a34a;color:#fff;font:700 14px system-ui,sans-serif;box-shadow:0 4px 16px #0008';
      b.onclick = function () { b.textContent = 'Refreshing…'; setTimeout(function () { location.reload(); }, 400); }; document.body.appendChild(b);
    }
    setTimeout(function () { check(true); }, 3000);
    setInterval(function () { check(false); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(false); });
  } catch (e) {}
})();
