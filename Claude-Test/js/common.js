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

  WW.signIn = function () {
    var p = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(p).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        return auth.signInWithRedirect(p);
      }
      alert('Sign-in error: ' + (e && e.message));
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

  WW.loadSave = async function (game) {
    if (!WW.user) return null;
    return (await db.ref('games_saves/' + WW.user.uid + '/' + game).once('value')).val();
  };
  WW.writeSave = function (game, data) {
    if (!WW.user) return Promise.resolve();
    data.updatedAt = firebase.database.ServerValue.TIMESTAMP;
    return db.ref('games_saves/' + WW.user.uid + '/' + game).set(data);
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
