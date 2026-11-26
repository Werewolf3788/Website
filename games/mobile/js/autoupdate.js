// Auto-update for every page in games/mobile (plain script, include it on each page).
// Installed apps and phone browsers don't always have a refresh button, so the page watches for a new deploy itself:
// the deploy workflow writes version.json (the commit it shipped) at the site root, and this script checks it every
// minute and whenever the app comes back to the screen. When it changes, the page reloads with the new version.
//   A page reloads by itself ONLY if it says it is safe: it sets window.WW_BUSY and that returns false
//   (e.g. Bastion outside a battle, Monopoly / Wahoo when you are not in a running game, the hub). Every other
//   page, and any game in progress, just shows a small "Update ready" bar to tap: an update never resets a game.
//   - window.WW_BEFORE_RELOAD (optional, may return a promise): lets a game save before the reload.
(function () {
  'use strict';
  var m = location.pathname.match(/^(.*\/)games\/mobile\//), root = m ? m[1] : '/';
  var URL_V = root + 'version.json', current = null, pending = null, lastInput = Date.now(), bar = null, reloading = false;

  // no WW_BUSY on the page = we can't tell whether a game is running, so treat it as busy and never reload by ourselves
  function busy() { try { return typeof window.WW_BUSY !== 'function' || !!window.WW_BUSY(); } catch (e) { return true; } }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true }); });

  function check() {
    if (reloading) return;
    fetch(URL_V + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.v) return;
      if (current === null) { current = d.v; return; }      // the version this page was loaded with
      if (d.v !== current) { pending = d.v; maybeReload(); }
    }).catch(function () {});
  }

  function reload() {
    if (reloading) return; reloading = true;
    var go = function () {
      try {
        var u = new URL(location.href); u.searchParams.set('v', String(pending).slice(0, 7));
        location.replace(u.toString());
      } catch (e) { location.reload(); }
    };
    var p = null; try { p = window.WW_BEFORE_RELOAD && window.WW_BEFORE_RELOAD(); } catch (e) {}
    if (p && p.then) { var t = setTimeout(go, 3000); p.then(function () { clearTimeout(t); setTimeout(go, 300); }, function () { clearTimeout(t); go(); }); }
    else setTimeout(go, 600);
  }

  function showBar() {
    if (bar) return;
    bar = document.createElement('button');
    bar.type = 'button';
    bar.textContent = '🔄 Update ready · tap to load it';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:99999;border:0;border-radius:999px;padding:10px 16px;font:700 14px system-ui,sans-serif;background:#22c55e;color:#04210f;box-shadow:0 6px 20px rgba(0,0,0,.45);cursor:pointer';
    bar.onclick = reload;
    document.body.appendChild(bar);
  }

  function maybeReload() {
    if (!pending || reloading) return;
    if (document.hidden) return;                               // reload when the app comes back to the screen
    if (!busy() && Date.now() - lastInput > 8000) return reload();
    showBar();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (pending && !busy()) return reload();                  // coming back to the app: load the new version first thing
    check();
  });
  addEventListener('pageshow', function (e) { if (e.persisted) check(); });
  setInterval(check, 60000);
  setInterval(maybeReload, 4000);
  check();
})();
