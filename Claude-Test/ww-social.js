/* ============================================================================
 * ww-social.js  -  Shared social core + site-wide instant messenger
 * Lives in:  /Claude-Test/ww-social.js   (next to ww-auth.js; ww-shell.js loads it on every page)
 *
 * What it does on EVERY page that loads it:
 *   1. Boots Firebase (reuses the page's app if one exists) and watches sign-in
 *   2. Publishes this user's online presence
 *   3. Shows a floating chat button, unread badge, toast pop-ups and (if allowed)
 *      browser notifications whenever a friend messages you - on any page.
 *
 * Exposes  window.WW  =  { ready, me, db, auth, firebase, config, emailKey, esc,
 *                          loadFirestore(), openChat(key, name) }
 *
 * Uses the same Firebase project/app as ww-auth.js, so the sign-in is shared.
 * Friends come from the existing system: users/{key}/friends/{code} and friend_codes/{CODE}.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.WW) return;

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;

  var CONFIG = {
    firebase: {
      apiKey: 'AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc',
      authDomain: 'entertainment-71888.firebaseapp.com',
      databaseURL: 'https://entertainment-71888-default-rtdb.firebaseio.com',
      projectId: 'entertainment-71888',
      storageBucket: 'entertainment-71888.firebasestorage.app',
      messagingSenderId: '660524340277',
      appId: '1:660524340277:web:ef8f4ed04fa985a4f88d7c'
    },
    fallbackSdk: '10.12.2',
    // Optional: a dedicated sign-in page. Blank = the profile page offers Google sign-in.
    loginUrl: '',
    discordAuthUrl: 'https://ww-discord-auth.onrender.com',   // blank = no Discord button
    profileUrl: new URL('profile.html', SCRIPT_SRC).href
  };

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // raykevin71888@gmail.com  ->  raykevin71888_at_gmail_com   (same scheme as users/{emailKey})
  function emailKey(email) {
    return String(email || '').trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_');
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  var WW = { config: CONFIG, esc: esc, emailKey: emailKey, me: null };
  window.WW = WW;

  // Script URL that matches whatever Firebase version is already on the page (ww-auth.js uses 8.x namespaced, others use 10.x compat).
  function sdkUrl(name) {
    var v = (window.firebase && firebase.SDK_VERSION) || CONFIG.fallbackSdk;
    return 'https://www.gstatic.com/firebasejs/' + v + '/firebase-' + name + (/^8\./.test(v) ? '' : '-compat') + '.js';
  }
  function waitFor(test, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() { if (test() || Date.now() - t0 > ms) return res(test()); setTimeout(tick, 80); })();
    });
  }

  var codeCache = {};
  var fsPromise = null;
  WW.loadFirestore = function () {
    if (!fsPromise) {
      fsPromise = (firebase.firestore ? Promise.resolve() : loadScript(sdkUrl('firestore')))
        .then(function () { return firebase.firestore(WW.app); });
    }
    return fsPromise;
  };

  /* ---------- Firebase boot ---------- */
  var readyResolve, readyReject;
  WW.ready = new Promise(function (res, rej) { readyResolve = res; readyReject = rej; });
  WW.ready.catch(function () {}); // avoid unhandled-rejection noise on pages that don't await it

  // friend_codes/{CODE} is the owner's key as plain text (newer records) or an object (older ones).
  WW.ownerKeyOfCode = async function (code) {
    code = String(code || '').toUpperCase(); if (!code) return null;
    if (codeCache[code]) return codeCache[code];
    try {
      var raw = (await WW.db.ref('friend_codes/' + code).once('value')).val();
      var key = typeof raw === 'string' ? raw : (raw && (raw.key || raw.user_key || raw.owner || raw.emailKey)) || null;
      if (key) codeCache[code] = key;
      return key;
    } catch (e) { return null; }
  };

  async function boot() {
    // ww-auth.js (loaded by ww-shell.js) brings the Firebase SDK; give it a moment before loading our own.
    await waitFor(function () { return window.firebase; }, 1800);
    if (!window.firebase) await loadScript('https://www.gstatic.com/firebasejs/' + CONFIG.fallbackSdk + '/firebase-app-compat.js');
    var need = [];
    if (!firebase.auth) need.push('auth');
    if (!firebase.database) need.push('database');
    await Promise.all(need.map(function (n) { return loadScript(sdkUrl(n)); }));

    // Reuse the app that already has this project's key, so the session is shared with the rest of the site.
    var app = (firebase.apps || []).filter(function (a) { return a.options && a.options.apiKey === CONFIG.firebase.apiKey; })[0];
    if (!app) app = firebase.apps.length ? firebase.initializeApp(CONFIG.firebase, 'ww-social') : firebase.initializeApp(CONFIG.firebase);
    WW.app = app;
    WW.firebase = firebase;
    WW.auth = firebase.auth(app);
    WW.db = firebase.database(app);

    WW.auth.onAuthStateChanged(async function (user) {
      try {
        if (!user || !user.email) { WW.me = null; teardownMessenger(); readyResolve(WW); return; }
        var key = emailKey(user.email);
        var me = { uid: user.uid, email: user.email, key: key, photoURL: user.photoURL || '', friendCode: '', username: '', name: '', avatar: '' };
        try {
          var u = (await WW.db.ref('users/' + key).once('value')).val() || {};
          me.friendCode = String(u.friend_code || '').toUpperCase();
          me.username = u.username || '';
          me.avatar = u.avatar_url || '';
        } catch (e) { /* rules may hide it; fine */ }
        me.name = me.username || user.displayName || user.email.split('@')[0];
        WW.me = me;
        startPresence(me);
        readyResolve(WW);
        startMessenger();
      } catch (e) { console.warn('[WW] auth handler', e); readyResolve(WW); }
    });
  }

  function startPresence(me) {
    var ServerValue = firebase.database.ServerValue;
    WW.db.ref('.info/connected').on('value', function (s) {
      if (!s.val()) return;
      var r = WW.db.ref('presence/' + me.key);
      r.onDisconnect().set({ online: false, ts: ServerValue.TIMESTAMP }).then(function () {
        r.set({ online: true, ts: ServerValue.TIMESTAMP });
      }).catch(function () {});
    });
  }

  /* =========================================================================
   * MESSENGER (Shadow DOM so it never clashes with page CSS)
   * Data:
   *   messages/{threadId}/{pushId} = { from, text, ts }          threadId = sorted keys joined by "__"
   *   userThreads/{me}/{other}     = { name, last, ts, unread, lastFrom }
   *   friend_codes/{CODE}          = emailKey   (existing, maintained by Settings)
   * ======================================================================= */
  var UI = null;                       // {host, root, els...}
  var threadsRef = null, threadsCb = null, msgsRef = null, msgsCb = null;
  var threads = {}, seen = {}, firstThreads = true;
  var friends = null;                  // [{key,name,code}]
  var openOther = null, openName = '';

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));width:56px;height:56px;border-radius:50%;border:0;background:#ff5f1f;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:2147483000;display:flex;align-items:center;justify-content:center}',
    '.fab:active{transform:scale(.96)}',
    '.badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ef4444;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #0b0b10}',
    '.panel{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#14141b;color:#e8ecf3;border:1px solid rgba(255,255,255,.14);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.7);z-index:2147483001;display:flex;flex-direction:column;overflow:hidden}',
    '.panel[hidden],.badge[hidden],[hidden]{display:none!important}',
    '@media(max-width:640px){.panel{inset:0;right:0;bottom:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}}',
    '.hd{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1);padding-top:calc(12px + env(safe-area-inset-top))}',
    '.hd .t{flex:1;font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ib{background:rgba(255,255,255,.08);border:0;color:#e8ecf3;width:36px;height:36px;border-radius:10px;font-size:16px;cursor:pointer}',
    '.ib:hover{background:rgba(255,95,31,.35)}',
    '.list{flex:1;overflow-y:auto}',
    '.sec{padding:10px 14px 4px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#9aa4b2}',
    '.row{display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}',
    '.row:hover{background:rgba(255,255,255,.05)}',
    '.av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#ff5f1f,#9e3a12);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none;position:relative}',
    '.dot{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;background:#10b981;border:2px solid #14141b}',
    '.meta{min-width:0;flex:1}',
    '.nm{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.pv{font-size:12px;color:#9aa4b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.un{background:#ef4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:800}',
    '.empty{padding:28px 18px;text-align:center;color:#9aa4b2;font-size:13px}',
    '.chat{flex:1;display:flex;flex-direction:column;min-height:0}',
    '.msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px}',
    '.m{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.35;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.09);align-self:flex-start}',
    '.m.me{align-self:flex-end;background:#ff5f1f;color:#fff}',
    '.m small{display:block;opacity:.6;font-size:10px;margin-top:2px}',
    'form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.1);padding-bottom:calc(10px + env(safe-area-inset-bottom))}',
    'input{flex:1;min-width:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:12px;padding:10px 12px;font-size:16px;outline:none}',
    'input:focus{border-color:#ff5f1f}',
    '.send{background:#ff5f1f;color:#fff;border:0;border-radius:12px;padding:0 16px;font-weight:800;cursor:pointer}',
    '.toasts{position:fixed;top:calc(12px + env(safe-area-inset-top));right:12px;display:flex;flex-direction:column;gap:8px;z-index:2147483002;width:320px;max-width:calc(100vw - 24px)}',
    '.toast{background:#14141b;color:#e8ecf3;border:1px solid rgba(255,95,31,.55);border-left:4px solid #ff5f1f;border-radius:12px;padding:10px 12px;box-shadow:0 12px 30px rgba(0,0,0,.6);cursor:pointer;animation:in .25s ease}',
    '.toast b{display:block;font-size:13px}.toast span{font-size:13px;color:#c7cfda;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '@keyframes in{from{transform:translateY(-10px);opacity:0}to{transform:none;opacity:1}}',
    '@media(prefers-color-scheme:light){.panel,.toast{background:#fff;color:#12151c;border-color:rgba(0,0,0,.15)}.hd,form{border-color:rgba(0,0,0,.1)}.row{border-color:rgba(0,0,0,.06)}.row:hover{background:rgba(0,0,0,.04)}.m{background:rgba(0,0,0,.07)}.m.me{background:#ff5f1f}.ib{background:rgba(0,0,0,.07);color:#12151c}input{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.15);color:#12151c}.toast span{color:#445}.dot{border-color:#fff}}'
  ].join('\n');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function startMessenger() {
    if (UI || !WW.me) return;
    var host = document.createElement('div');
    host.id = 'ww-social-host';
    var root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);

    var fab = el('button', 'fab'); fab.setAttribute('aria-label', 'Messages'); fab.textContent = '💬';
    var badge = el('span', 'badge'); badge.hidden = true; fab.appendChild(badge);

    var panel = el('div', 'panel'); panel.hidden = true;
    var hd = el('div', 'hd');
    var back = el('button', 'ib', '‹'); back.hidden = true; back.setAttribute('aria-label', 'Back');
    var title = el('div', 't', 'Messages');
    var view = el('button', 'ib', '👤'); view.hidden = true; view.title = 'View profile';
    var bell = el('button', 'ib', '🔔'); bell.title = 'Enable desktop notifications';
    var close = el('button', 'ib', '✕'); close.setAttribute('aria-label', 'Close');
    hd.append(back, title, view, bell, close);

    var list = el('div', 'list');
    var chat = el('div', 'chat'); chat.hidden = true;
    var msgs = el('div', 'msgs');
    var form = document.createElement('form');
    var input = document.createElement('input'); input.placeholder = 'Message…'; input.maxLength = 1000; input.autocomplete = 'off';
    var send = el('button', 'send', 'Send'); send.type = 'submit';
    form.append(input, send);
    chat.append(msgs, form);
    panel.append(hd, list, chat);

    var toasts = el('div', 'toasts');
    root.append(fab, panel, toasts);
    document.body.appendChild(host);

    UI = { host: host, fab: fab, badge: badge, panel: panel, title: title, back: back, view: view, bell: bell,
           list: list, chat: chat, msgs: msgs, form: form, input: input, toasts: toasts };

    fab.onclick = function () { panel.hidden ? openPanel() : closePanel(); };
    close.onclick = closePanel;
    back.onclick = showList;
    view.onclick = function () { if (openOther) location.href = CONFIG.profileUrl + '?u=' + encodeURIComponent(openOther); };
    bell.onclick = askNotify;
    if (!('Notification' in window) || Notification.permission !== 'default') bell.hidden = true;
    form.onsubmit = function (e) {
      e.preventDefault();
      var t = input.value; input.value = '';
      if (openOther) sendMsg(openOther, openName, t);
    };

    watchThreads();
  }

  function teardownMessenger() {
    if (threadsRef && threadsCb) threadsRef.off('value', threadsCb);
    if (msgsRef && msgsCb) msgsRef.off('child_added', msgsCb);
    threadsRef = msgsRef = null; threads = {}; seen = {}; firstThreads = true; friends = null; openOther = null;
    if (UI) { UI.host.remove(); UI = null; }
  }

  function totalUnread() {
    return Object.keys(threads).reduce(function (n, k) { return n + (threads[k].unread || 0); }, 0);
  }

  function refreshBadge() {
    if (!UI) return;
    var n = totalUnread();
    UI.badge.hidden = n === 0;
    UI.badge.textContent = n > 99 ? '99+' : String(n);
    var base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = n ? '(' + n + ') ' + base : base;
  }

  function watchThreads() {
    threadsRef = WW.db.ref('userThreads/' + WW.me.key);
    threadsCb = function (snap) {
      threads = snap.val() || {};
      refreshBadge();
      Object.keys(threads).forEach(function (k) {
        var t = threads[k], prev = seen[k] ? seen[k].unread || 0 : 0;
        var viewing = UI && !UI.panel.hidden && openOther === k;
        if (!firstThreads && (t.unread || 0) > prev && t.lastFrom !== WW.me.key) {
          if (viewing) { markRead(k); }
          else notify(k, t);
        }
        seen[k] = { unread: t.unread || 0 };
      });
      firstThreads = false;
      if (UI && !UI.panel.hidden && !openOther) renderList();
    };
    threadsRef.on('value', threadsCb);
  }

  function notify(k, t) {
    toast(k, t.name || 'New message', t.last || '');
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        var n = new Notification(t.name || 'New message', { body: t.last || '', tag: 'ww-' + k });
        n.onclick = function () { window.focus(); openChat(k, t.name); n.close(); };
      } catch (e) {}
    }
  }

  function toast(k, name, text) {
    if (!UI) return;
    var t = el('div', 'toast'); t.append(el('b', null, name), el('span', null, text));
    t.onclick = function () { t.remove(); openChat(k, name); };
    UI.toasts.appendChild(t);
    setTimeout(function () { t.remove(); }, 7000);
  }

  function askNotify() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function (p) { if (p !== 'default' && UI) UI.bell.hidden = true; });
  }

  function initial(name) { return (String(name || '?').trim()[0] || '?').toUpperCase(); }
  function ago(ts) {
    if (!ts) return '';
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'now'; if (m < 60) return m + 'm';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  }

  async function loadFriends() {
    if (friends) return friends;
    var out = [];
    try {
      var v = (await WW.db.ref('users/' + WW.me.key + '/friends').once('value')).val() || {};
      await Promise.all(Object.keys(v).map(async function (k) {
        var f = v[k] && typeof v[k] === 'object' ? v[k] : {};
        var code = String(f.friend_code || k).toUpperCase();
        var key = await WW.ownerKeyOfCode(code);
        if (key && key !== WW.me.key) out.push({ key: key, code: code, name: f.username || code });
      }));
    } catch (e) { console.warn('[WW] friends', e); }
    friends = out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return friends;
  }

  async function renderList() {
    if (!UI) return;
    var fr = await loadFriends();
    var L = UI.list; L.textContent = '';
    var keys = Object.keys(threads).sort(function (a, b) { return (threads[b].ts || 0) - (threads[a].ts || 0); });
    if (keys.length) {
      L.appendChild(el('div', 'sec', 'Conversations'));
      keys.forEach(function (k) { L.appendChild(rowFor(k, threads[k].name || k, threads[k].last, threads[k].ts, threads[k].unread)); });
    }
    var rest = fr.filter(function (f) { return !threads[f.key]; });
    if (rest.length) {
      L.appendChild(el('div', 'sec', 'Friends'));
      rest.forEach(function (f) { L.appendChild(rowFor(f.key, f.name, 'Say hi', 0, 0)); });
    }
    if (!keys.length && !rest.length) L.appendChild(el('div', 'empty', 'No friends to message yet. Add a friend by friend code in Settings.'));
    // presence dots
    L.querySelectorAll('.av').forEach(function (av) {
      var k = av.dataset.key;
      WW.db.ref('presence/' + k + '/online').once('value').then(function (s) {
        if (s.val() === true) av.appendChild(el('span', 'dot'));
      }).catch(function () {});
    });
  }

  function rowFor(key, name, preview, ts, unread) {
    var r = el('div', 'row');
    var av = el('div', 'av', initial(name)); av.dataset.key = key;
    var meta = el('div', 'meta'); meta.append(el('div', 'nm', name), el('div', 'pv', preview || ''));
    r.append(av, meta);
    if (unread) r.appendChild(el('span', 'un', String(unread)));
    else if (ts) r.appendChild(el('span', 'pv', ago(ts)));
    r.onclick = function () { openChat(key, name); };
    return r;
  }

  function showList() {
    if (msgsRef && msgsCb) msgsRef.off('child_added', msgsCb);
    msgsRef = null; openOther = null;
    UI.chat.hidden = true; UI.list.hidden = false; UI.back.hidden = true; UI.view.hidden = true;
    UI.title.textContent = 'Messages';
    renderList();
  }

  function openPanel() {
    UI.panel.hidden = false;
    if (!openOther) showList();
  }
  function closePanel() { if (UI) UI.panel.hidden = true; }

  function threadId(a, b) { return [a, b].sort().join('__'); }

  function markRead(other) {
    if (!threads[other] || !threads[other].unread) return;
    WW.db.ref('userThreads/' + WW.me.key + '/' + other + '/unread').set(0).catch(function () {});
  }

  function openChat(otherKey, name) {
    if (!UI || !WW.me || !otherKey || otherKey === WW.me.key) return;
    if (msgsRef && msgsCb) msgsRef.off('child_added', msgsCb);
    openOther = otherKey; openName = name || (threads[otherKey] && threads[otherKey].name) || otherKey;
    UI.panel.hidden = false; UI.list.hidden = true; UI.chat.hidden = false;
    UI.back.hidden = false; UI.view.hidden = false; UI.title.textContent = openName;
    UI.msgs.textContent = '';
    msgsRef = WW.db.ref('messages/' + threadId(WW.me.key, otherKey)).limitToLast(100);
    msgsCb = function (snap) {
      var m = snap.val() || {};
      var b = el('div', 'm' + (m.from === WW.me.key ? ' me' : ''), m.text || '');
      UI.msgs.appendChild(b);
      UI.msgs.scrollTop = UI.msgs.scrollHeight;
      if (m.from !== WW.me.key) markRead(otherKey);
    };
    msgsRef.on('child_added', msgsCb);
    markRead(otherKey);
    setTimeout(function () { UI.input.focus(); }, 50);
  }

  async function sendMsg(otherKey, otherName, text) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text) return;
    var TS = firebase.database.ServerValue.TIMESTAMP, me = WW.me, preview = text.slice(0, 80);
    try {
      await WW.db.ref('messages/' + threadId(me.key, otherKey)).push({ from: me.key, text: text, ts: TS });
      await Promise.all([
        WW.db.ref('userThreads/' + me.key + '/' + otherKey).update({ name: otherName, last: preview, ts: TS, unread: 0, lastFrom: me.key }),
        WW.db.ref('userThreads/' + otherKey + '/' + me.key).transaction(function (cur) {
          cur = cur || {};
          return { name: me.name, last: preview, ts: Date.now(), unread: (cur.unread || 0) + 1, lastFrom: me.key };
        })
      ]);
    } catch (e) {
      console.warn('[WW] send failed', e);
      if (UI) UI.msgs.appendChild(el('div', 'm', (e && /permission/i.test(e.code + ' ' + e.message)) ? 'Messaging is blocked by the database rules (messages / userThreads / presence not published yet).' : 'Message failed to send. Check your connection and try again.'));
    }
  }

  function openChatPublic(key, name) {
    // If the messenger isn't up yet (page still booting), wait for it.
    WW.ready.then(function () { setTimeout(function () { openChat(key, name); }, 0); });
  }
  WW.openChat = openChatPublic;
  WW.signInDiscord = function () {
    if (window.WWAuth && WWAuth.signInDiscord) return WWAuth.signInDiscord();
    if (CONFIG.discordAuthUrl) location.href = CONFIG.discordAuthUrl + '/login?next=' + encodeURIComponent(location.href.split('#')[0]);
  };

  /* ---------- go ---------- */
  function start() {
    boot().catch(function (e) { console.warn('[WW]', e.message || e); readyReject(e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
