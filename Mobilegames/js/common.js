// Shared helpers for the Mobilegames board-game hub: Firebase init, Google login,
// friend codes (same /friend_codes + /users/{emailKey}/friend_code as the Game Tracker), and RTDB saves.
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
  WW.roomRef = function (game, code) { return WW.mode === 'cloud' ? db.ref('game_rooms/' + game + '/' + code) : local.ref('game_rooms/' + game + '/solo'); };
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
  WW.ensureFriendCode = async function (user) {
    var key = WW.emailKey(user.email);
    var ref = db.ref('users/' + key + '/friend_code');
    var existing = (await ref.once('value')).val();
    if (existing) return existing;
    for (var i = 0; i < 6; i++) {
      var code = randomCode();
      var taken = (await db.ref('friend_codes/' + code).once('value')).exists();
      if (taken) continue;
      await db.ref('friend_codes/' + code).set(key);
      await ref.set(code);
      return code;
    }
    throw new Error('Could not create a friend code');
  };

  function saveRef(game) {
    return (WW.mode === 'cloud' && WW.user) ? db.ref('games_saves/' + WW.user.uid + '/' + game) : local.ref('games_saves/local/' + game);
  }
  WW.loadSave = async function (game) { return (await saveRef(game).once('value')).val(); };
  WW.writeSave = function (game, data) {
    data.updatedAt = (WW.mode === 'cloud') ? firebase.database.ServerValue.TIMESTAMP : Date.now();
    return saveRef(game).set(data);
  };

  // ---- avatar (same users/{emailKey}/avatar_url the rest of the site uses)
  function secure(u) { u = String(u || ''); if (u.indexOf('//') === 0) return 'https:' + u; return u.replace(/^http:\/\//, 'https://'); }
  WW.secureUrl = secure; WW.avatar = '';
  WW.loadAvatar = async function (user) {
    try { var v = (await db.ref('users/' + WW.emailKey(user.email) + '/avatar_url').once('value')).val(); WW.avatar = typeof v === 'string' ? secure(v) : ''; } catch (e) {}
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

  // ---- "now playing" status shown to friends (users/{emailKey}/now_playing)
  function playRef() { return (WW.mode === 'cloud' && WW.user && WW.user.email) ? db.ref('users/' + (WW.playKey || WW.emailKey(WW.user.email)) + '/now_playing') : null; }
  WW.publishPlaying = function (info) {
    var r = playRef(); if (!r) return;
    try { r.onDisconnect().remove(); r.set(Object.assign({ platform: 'mobile' }, info, { t: firebase.database.ServerValue.TIMESTAMP })).then(function () { WW.presenceError = null; }).catch(function (e) { WW.presenceError = e; console.warn('now_playing write failed (friends will not see you playing):', e && (e.code || e.message)); }); } catch (e) { WW.presenceError = e; }
  };
  WW.clearPlaying = function () { var r = playRef(); if (r) r.remove().catch(function () {}); };

  // ---- win / loss history (games_saves/{uid}/history, private to each player)
  function histRef() { return (WW.mode === 'cloud' && WW.user) ? db.ref('games_saves/' + WW.user.uid + '/history') : local.ref('games_saves/local/history'); }
  WW.recordResult = async function (key, rec) {
    try {
      var r = histRef().child(String(key).replace(/[^A-Za-z0-9_-]/g, '_'));
      var ex = (await r.once('value')).val(); if (ex !== null && ex !== undefined) return false;
      rec.t = Date.now(); await r.set(rec); return true;
    } catch (e) { console.warn('history', e); return false; }
  };
  WW.loadHistory = async function () {
    try { var v = (await histRef().once('value')).val() || {}; return Object.keys(v).map(function (k) { return v[k]; }).filter(Boolean).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }); } catch (e) { return []; }
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
      try {
        var fo = friends[fk] || {}, code = fo.friend_code || fk, uk = (await db.ref('friend_codes/' + code).once('value')).val();
        if (typeof uk !== 'string') { out.push({ code: code, name: fo.username || code, avatar: fo.avatar_url || '', plays: [], note: 'not found' }); return; }
        var prof = (await db.ref('users/' + uk).once('value')).val() || {};
        var scope = prof.tracking_scope || 'friends';
        if (scope === 'private') { out.push({ code: code, name: fo.username || prof.username || code, avatar: prof.avatar_url || fo.avatar_url || '', plays: [], note: 'private' }); return; }
        var item = { code: code, name: fo.username || prof.username || prof.display_name || code, avatar: prof.avatar_url || fo.avatar_url || '', plays: [] };
        var np = prof.now_playing;
        if (np && np.t && now - np.t < 150000) item.plays.push({ kind: 'mobile', game: np.game, title: np.title, status: np.status || '', room: np.room, open: np.open | 0 });
        var tag = prof.psn_username || fo.psn_username;
        if (tag) {
          var ps = (await db.ref('psn/gamertags/' + tag).once('value')).val();
          if (ps && (ps.online === true || ps.online === 'true') && ps.currentGame && String(ps.currentGame).toLowerCase() !== 'idle') item.plays.push({ kind: 'console', platform: ps.displayPlatform || ps.platform || 'PlayStation', title: ps.currentGame, status: ps.gameStatus || '' });
        }
        var sid = String(prof.steam_id || '').trim();
        if (sid) {
          if (!/^7656119\d{10}$/.test(sid)) { var vn = (await db.ref('steam_vanity/' + sid.toLowerCase()).once('value')).val(); sid = typeof vn === 'string' ? vn : ''; }
          if (sid) { var sp = (await db.ref('steam_users/' + sid + '/profile').once('value')).val(); if (sp && sp.currentGame) item.plays.push({ kind: 'console', platform: 'Steam', title: sp.currentGame, status: '' }); }
        }
        out.push(item);
      } catch (e) { console.warn('friend status', e); }
    }));
    return out;
  };

  // cb(user|null, friendCode|null) on every auth change
  WW.onReady = function (cb) {
    auth.onAuthStateChanged(async function (user) {
      WW.user = user || null; WW.friendCode = null;
      if (user) { try { WW.friendCode = await WW.ensureFriendCode(user); } catch (e) { console.error(e); } }
      if (user && WW.friendCode) { try { var pk = (await db.ref('friend_codes/' + WW.friendCode).once('value')).val(); WW.playKey = typeof pk === 'string' ? pk : null; } catch (e) { WW.playKey = null; } }   // friends read us at the key our friend code points to
      if (user) await WW.loadAvatar(user);
      cb(WW.user, WW.friendCode);
    });
  };
})();
