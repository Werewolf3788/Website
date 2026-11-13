/* ww-ach-toast.js - site-wide achievement pop-ups.
 * Listens to /achFeed (written by the games when someone earns an achievement) and shows a small toast card to everyone
 * who has a page open. Works on any page that exposes window.WW with a Firebase db (ww-social.js or Mobilegames/js/common.js). */
(function () {
  if (window.__wwAchToast) return; window.__wwAchToast = true;
  var offset = 0, started = false, queue = [], showing = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() {
    if (document.getElementById('ww-ach-css')) return; var s = document.createElement('style'); s.id = 'ww-ach-css';
    s.textContent = '#ww-ach{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top));transform:translate(-50%,-140%);z-index:2147483200;display:flex;gap:10px;align-items:center;max-width:min(92vw,380px);padding:10px 14px;border-radius:14px;background:linear-gradient(135deg,#1e293b,#312e81);border:2px solid #facc15;color:#fff;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 8px 28px #0008;transition:transform .45s cubic-bezier(.2,1.2,.4,1);pointer-events:none}' +
      '#ww-ach.on{transform:translate(-50%,0)}#ww-ach .ic{font-size:30px;flex:none}#ww-ach img{width:34px;height:34px;border-radius:50%;border:2px solid #fff;object-fit:cover;flex:none}#ww-ach small{display:block;font-weight:500;opacity:.8;font-size:12px}#ww-ach b{color:#facc15}';
    document.head.appendChild(s);
  }
  function next() {
    if (showing || !queue.length) return; showing = true; css();
    var a = queue.shift(), el = document.getElementById('ww-ach') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'ww-ach' }));
    el.innerHTML = '<span class="ic">' + esc(a.i || '🏆') + '</span><div><b>' + esc(a.n || 'Someone') + '</b> earned <b>' + esc(a.t) + '</b><small>' + esc(a.g || '') + (a.d ? ' · ' + esc(a.d) : '') + '</small></div>' +
      (a.av && /^https:\/\//.test(a.av) ? '<img referrerpolicy="no-referrer" src="' + esc(a.av) + '" onerror="this.remove()">' : '');
    void el.offsetWidth; el.classList.add('on');
    setTimeout(function () { el.classList.remove('on'); setTimeout(function () { showing = false; next(); }, 500); }, 4500);
  }
  function start(db) {
    if (started) return; started = true;
    try { db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; }); } catch (e) {}
    var attach = function () { db.ref('achFeed').limitToLast(1).on('child_added', function (snap) {
      var v = snap.val(); if (!v || typeof v.ts !== 'number') return;
      // limitToLast(1) first returns the newest old item: only show ones that are brand new
      if (v.ts < Date.now() + offset - 15000) return;
      queue.push(v); next();
    }, function () {}); };
    var au = window.WW && window.WW.auth;
    if (au && au.onAuthStateChanged) { var done = false; au.onAuthStateChanged(function (u) { if (u && !done) { done = true; attach(); } }); } else attach();
  }
  var tries = 0, iv = setInterval(function () {
    var W = window.WW; if (W && W.db && W.db.ref) { clearInterval(iv); try { start(W.db); } catch (e) {} } else if (++tries > 80) clearInterval(iv);
  }, 500);
})();
