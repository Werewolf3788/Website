/* ww-msg-toast.js - friend-message pop-ups while playing a game.
 * The site's messenger (ww-social.js) shows its own toasts on normal pages, but game pages run their own Firebase
 * setup (Mobilegames/js/common.js) and don't load it. This file fills that gap: whenever a friend messages you while
 * you are in a game, a small toast card slides in with who it's from and a short preview of the message.
 *   - Tap "Reply" to answer right from the card (the game ignores your typing while you do).
 *   - Tap ✕ (or wait ~8 s) to dismiss; the message stays unread so the 💬 badge still shows it on the main site.
 * Data (same as ww-social.js): userThreads/{me}/{other} = { name, last, ts, unread, lastFrom }
 *                              messages/{threadId}/{push} = { from, text, ts }   threadId = sorted keys joined by "__"
 * Works on any page that exposes window.WW with a Firebase auth + db. Skips pages where ww-social.js is running. */
(function () {
  'use strict';
  if (window.__wwMsgToast) return; window.__wwMsgToast = true;

  var SHOW_MS = 8000, PREVIEW = 90;
  var me = null, ref = null, cb = null, seen = {}, first = true, avatars = {}, names = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function key(email) { return String(email || '').trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_'); }
  function threadId(a, b) { return [a, b].sort().join('__'); }
  function brief(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > PREVIEW ? t.slice(0, PREVIEW - 1) + '…' : t; }

  function css() {
    if (document.getElementById('ww-msg-css')) return;
    var s = document.createElement('style'); s.id = 'ww-msg-css';
    s.textContent =
      '#ww-msg-wrap{position:fixed;right:12px;top:calc(64px + env(safe-area-inset-top));z-index:2147483100;display:flex;flex-direction:column;gap:8px;width:340px;max-width:calc(100vw - 24px);pointer-events:none}' +
      '.ww-msg{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:#14141b;color:#e8ecf3;border:1px solid rgba(255,95,31,.55);border-left:4px solid #ff5f1f;box-shadow:0 10px 28px rgba(0,0,0,.6);font:500 13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;transform:translateX(120%);transition:transform .35s cubic-bezier(.2,1.1,.4,1);-webkit-user-select:none;user-select:none}' +
      '.ww-msg.on{transform:none}' +
      '.ww-msg .av{width:38px;height:38px;border-radius:50%;flex:none;object-fit:cover;background:#ff5f1f;color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.85)}' +
      '.ww-msg .bd{flex:1;min-width:0}' +
      '.ww-msg .hd{display:flex;align-items:center;gap:6px}.ww-msg .hd small{opacity:.65;font-size:11px}' +
      '.ww-msg .who{font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}' +
      '.ww-msg .tx{color:#c7cfda;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;margin-top:2px}' +
      '.ww-msg .acts{display:flex;gap:6px;margin-top:7px}' +
      '.ww-msg button{border:0;border-radius:9px;padding:6px 12px;font:700 12px system-ui,sans-serif;cursor:pointer;background:rgba(255,255,255,.1);color:#e8ecf3}' +
      '.ww-msg button.go{background:#ff5f1f;color:#fff}' +
      '.ww-msg .x{background:none;padding:0 2px;font-size:15px;opacity:.7}' +
      '.ww-msg form{display:flex;gap:6px;margin-top:7px}' +
      '.ww-msg input{flex:1;min-width:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:9px;padding:7px 9px;font-size:16px;outline:none;-webkit-user-select:text;user-select:text}' +
      '.ww-msg input:focus{border-color:#ff5f1f}.ww-msg .ok{color:#86efac;font-weight:700;margin-top:6px}';
    document.head.appendChild(s);
  }
  function wrap() {
    var w = document.getElementById('ww-msg-wrap');
    if (!w) { css(); w = document.createElement('div'); w.id = 'ww-msg-wrap'; document.body.appendChild(w); }
    return w;
  }

  // gentle two-note ping (games already have sound unlocked after the first tap)
  function ping() {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var a = ping.ctx || (ping.ctx = new A()), t = a.currentTime;
      [[880, 0], [1320, .09]].forEach(function (n) {
        var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0, t + n[1]); g.gain.linearRampToValueAtTime(.12, t + n[1] + .02); g.gain.exponentialRampToValueAtTime(.001, t + n[1] + .25);
        o.connect(g); g.connect(a.destination); o.start(t + n[1]); o.stop(t + n[1] + .3);
      });
    } catch (e) {}
  }

  function avatarOf(k) {
    if (avatars[k] !== undefined) return Promise.resolve(avatars[k]);
    return window.WW.db.ref('users/' + k + '/avatar_url').once('value')
      .then(function (s) { return (avatars[k] = s.val() || ''); }).catch(function () { return (avatars[k] = ''); });
  }

  function show(k, t) {
    var name = t.name || 'A friend', card = document.createElement('div'), timer = null;
    card.className = 'ww-msg';
    card.innerHTML = '<div class="av">' + esc((name.trim()[0] || '?').toUpperCase()) + '</div>' +
      '<div class="bd"><div class="hd"><span class="who">💬 ' + esc(name) + '</span><small>now</small><button class="x" aria-label="Dismiss">✕</button></div>' +
      '<div class="tx">' + esc(brief(t.last) || 'Sent you a message') + '</div>' +
      '<div class="acts"><button class="go">Reply</button></div></div>';
    wrap().appendChild(card);
    requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add('on'); }); });
    avatarOf(k).then(function (url) {
      if (!url) return; var img = document.createElement('img'); img.className = 'av'; img.alt = ''; img.src = url;
      img.onerror = function () { img.remove(); }; var old = card.querySelector('.av'); if (old) old.replaceWith(img);
    });

    function close() { clearTimeout(timer); card.classList.remove('on'); setTimeout(function () { card.remove(); }, 400); }
    function arm(ms) { clearTimeout(timer); timer = setTimeout(close, ms); }
    arm(SHOW_MS);
    card.addEventListener('pointerenter', function () { clearTimeout(timer); });
    card.addEventListener('pointerleave', function () { if (!card.querySelector('form')) arm(3000); });
    // taps on the card must not also steer/plant/etc. in the game underneath
    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });

    card.querySelector('.x').onclick = close;
    card.querySelector('.go').onclick = function () {
      clearTimeout(timer);
      var acts = card.querySelector('.acts'), f = document.createElement('form');
      f.innerHTML = '<input maxlength="1000" placeholder="Reply to ' + esc(name) + '…" autocomplete="off"><button class="go" type="submit">Send</button>';
      acts.replaceWith(f);
      var inp = f.querySelector('input');
      // keep the game from reacting to the keys you type here
      ['keydown', 'keyup', 'keypress'].forEach(function (ev) { inp.addEventListener(ev, function (e) { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') close(); }); });
      setTimeout(function () { inp.focus(); }, 30);
      f.onsubmit = function (e) {
        e.preventDefault();
        var text = inp.value.trim(); if (!text) return;
        inp.disabled = true;
        send(k, name, text).then(function () {
          var ok = document.createElement('div'); ok.className = 'ok'; ok.textContent = '✓ Sent'; f.replaceWith(ok); arm(1500);
        }).catch(function (err) {
          inp.disabled = false; console.warn('[ww-msg-toast] send failed', err);
          inp.value = text; inp.placeholder = 'Couldn’t send. Try again.';
        });
      };
    };
    ping();

    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { var n = new Notification(name, { body: brief(t.last), tag: 'ww-' + k }); n.onclick = function () { window.focus(); n.close(); }; } catch (e) {}
    }
  }

  function send(otherKey, otherName, text) {
    var db = window.WW.db, TS = firebase.database.ServerValue.TIMESTAMP, preview = text.slice(0, 80);
    return db.ref('messages/' + threadId(me.key, otherKey)).push({ from: me.key, text: text, ts: TS }).then(function () {
      return Promise.all([
        db.ref('userThreads/' + me.key + '/' + otherKey).update({ name: otherName, last: preview, ts: TS, unread: 0, lastFrom: me.key }),
        db.ref('userThreads/' + otherKey + '/' + me.key).transaction(function (cur) {
          cur = cur || {};
          return { name: me.name, last: preview, ts: Date.now(), unread: (cur.unread || 0) + 1, lastFrom: me.key };
        })
      ]);
    });
  }

  function stop() { if (ref && cb) ref.off('value', cb); ref = cb = null; seen = {}; first = true; me = null; }

  function watch(user) {
    stop();
    if (!user || !user.email) return;
    var k = key(user.email), db = window.WW.db;
    me = { key: k, name: user.displayName || user.email.split('@')[0] };
    db.ref('users/' + k + '/username').once('value').then(function (s) { if (s.val() && me) me.name = s.val(); }).catch(function () {});
    ref = db.ref('userThreads/' + k);
    cb = function (snap) {
      var all = snap.val() || {};
      Object.keys(all).forEach(function (o) {
        var t = all[o] || {}, prev = seen[o] || 0, now = t.unread || 0;
        if (!first && now > prev && t.lastFrom !== k) show(o, t);
        seen[o] = now;
      });
      first = false;   // the first snapshot is just what was already there: no pop-ups for old messages
    };
    ref.on('value', cb, function (e) { console.warn('[ww-msg-toast]', e && e.message); });
  }

  function start() {
    var W = window.WW;
    if (!W || !W.auth || !W.db) return false;
    if (W.openChat) return true;   // ww-social.js is on this page and already shows message toasts
    W.auth.onAuthStateChanged(watch);
    return true;
  }
  (function tryStart(n) { if (!start() && n < 60) setTimeout(function () { tryStart(n + 1); }, 250); })(0);
})();
