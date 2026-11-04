// Shared "Games" menu for every game page (copy lives in Claude-Test/js and Mobilegames/js; keep them identical).
// Adds a menu to the button with id="gamesBtn" so players can jump to any other game or hub at any time.
(function () {
  var m = location.pathname.match(/^(.*\/)(Claude-Test|Mobilegames)\//), root = m ? m[1] : '/';
  var GAMES = [
    { n: 'Neighborly Acre', i: '🌾', d: '3D co-op farm: crops, animals, tractor', u: 'Claude-Test/farm.html', k: 'farm' },
    { n: 'Wahoo', i: '🎲', d: 'Race your pegs around the board', u: 'Mobilegames/wahoo.html', k: 'wahoo' },
    { n: 'Property Tycoon', i: '🏙️', d: 'Buy, trade and build properties', u: 'Mobilegames/tycoon.html', k: 'tycoon' }
  ];
  var HUBS = [{ n: 'Farm hub', u: 'Claude-Test/' }, { n: 'Board games hub', u: 'Mobilegames/' }, { n: 'Main site', u: '' }];
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:12px;font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none';
  var box = document.createElement('div');
  box.style.cssText = 'background:#1e293b;color:#e2e8f0;border-radius:16px;padding:16px;width:min(94vw,420px);max-height:90vh;overflow-y:auto';
  box.innerHTML = '<div style="font-weight:800;font-size:1.1rem;margin-bottom:10px">☰ Games</div>';
  var cur = location.pathname;
  GAMES.forEach(function (g) {
    var here = cur.indexOf('/' + g.k) >= 0, a = document.createElement('a');
    a.href = root + g.u; a.style.cssText = 'display:block;text-decoration:none;color:#e2e8f0;padding:11px 12px;margin:6px 0;border-radius:12px;background:' + (here ? '#14532d' : '#334155') + ';border:2px solid ' + (here ? '#22c55e' : 'transparent');
    a.innerHTML = '<div style="font-weight:700">' + g.i + ' ' + g.n + (here ? ' <small style="font-weight:400;color:#86efac">· you are here</small>' : '') + '</div><div style="font-size:.8rem;color:#94a3b8">' + g.d + '</div>';
    box.appendChild(a);
  });
  var hubs = document.createElement('div'); hubs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px';
  HUBS.forEach(function (h) { var a = document.createElement('a'); a.href = root + h.u; a.textContent = h.n; a.style.cssText = 'flex:1 1 auto;text-align:center;text-decoration:none;color:#cbd5e1;background:#0f172a;border-radius:10px;padding:9px 10px;font-size:.82rem'; hubs.appendChild(a); });
  box.appendChild(hubs);
  var close = document.createElement('button'); close.textContent = 'Close';
  close.style.cssText = 'margin-top:12px;width:100%;background:#475569;color:#fff;border:0;border-radius:10px;padding:11px;font:inherit;cursor:pointer';
  box.appendChild(close); ov.appendChild(box); document.body.appendChild(ov);
  function show() { ov.style.display = 'flex'; } function hide() { ov.style.display = 'none'; }
  close.onclick = hide; ov.addEventListener('pointerdown', function (e) { if (e.target === ov) hide(); });
  // while the menu is open, keep game controls from also reacting to keys
  window.addEventListener('keydown', function (e) { if (ov.style.display !== 'flex') return; if (e.key === 'Escape') hide(); e.stopPropagation(); }, true);
  window.addEventListener('keyup', function (e) { if (ov.style.display === 'flex') e.stopPropagation(); }, true);
  var btn = document.getElementById('gamesBtn'); if (btn) btn.onclick = show;
  window.openGamesMenu = show;
})();
