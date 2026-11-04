// Shared helpers for the Claude-Test game hub: Firebase init, Google login,
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
    var KEY = 'neighborly_acre_local_v1', store = {}, ls = {};
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
  WW.roomRef = function (code) { return WW.mode === 'cloud' ? db.ref('game_rooms/farm/' + code) : local.ref('game_rooms/farm/solo'); };
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

  // cb(user|null, friendCode|null) on every auth change
  WW.onReady = function (cb) {
    auth.onAuthStateChanged(async function (user) {
      WW.user = user || null; WW.friendCode = null;
      if (user) { try { WW.friendCode = await WW.ensureFriendCode(user); } catch (e) { console.error(e); } }
      cb(WW.user, WW.friendCode);
    });
  };
})();
