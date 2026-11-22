// Shared "Games" menu for every game page (lives in Mobilegames/js).
// Adds a menu to the button with id="gamesBtn" so players can jump to any other game or hub at any time.
(function () {
  var m = location.pathname.match(/^(.*\/)(Claude-Test|Mobilegames)\//), root = m ? m[1] : '/';
  var GAMES = [
    { n: 'Neighborly Acre', i: '🌾', d: '3D co-op farm: crops, animals, tractor', u: 'Mobilegames/farm.html', k: 'farm' },
    { n: 'Wahoo', i: '🎲', d: 'Race your pegs around the board', u: 'Mobilegames/wahoo.html', k: 'wahoo' },
    { n: 'Monopoly', i: '🏙️', d: 'Buy, trade and build properties', u: 'Mobilegames/tycoon.html', k: 'tycoon' },
    { n: 'Frogger', i: '🐸', d: 'Hop across traffic, up to 8 players', u: 'Mobilegames/frogger.html', k: 'frogger' },
    { n: 'Werewolf Racing', i: '🏎️', d: '3D car racing, up to 8 friends + bots', u: 'Mobilegames/race.html', k: 'race' },
    { n: 'Tile Match', i: '🀄', d: 'Mahjong-style tile matching: clear the board, no paywall', u: 'Mobilegames/mahjong.html', k: 'mahjong' },
    { n: 'Tile Survival', i: '🏚️', d: '3D survival base: gather, build, clear fog, fight with heroes', u: 'Mobilegames/survive.html', k: 'survive' },
    { n: 'Werewolf Recon', i: '🎯', d: '3D open-world squad shooter: drone, sync shots, skill trees', u: 'Mobilegames/recon.html', k: 'recon' },
    { n: 'Calm Space', i: '🌿', d: 'Breathe, ground, cool down, reasons jar, your people (private, on your device)', u: 'Mobilegames/calm.html', k: 'calm' },
    { n: 'Battleship', i: '🚢', d: 'Sink the fleet: vs the computer or a friend', u: 'Mobilegames/battleship.html', k: 'battleship' }
  ];
  var HUBS = [{ n: 'All games hub', u: 'Mobilegames/' }, { n: 'Main site', u: '' }];
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:12px;font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none';
  var box = document.createElement('div');
  box.style.cssText = 'background:#1e293b;color:#e2e8f0;border-radius:16px;padding:16px;width:min(94vw,420px);max-height:90vh;overflow-y:auto';
  box.innerHTML = '<div style="font-weight:800;font-size:1.1rem;margin-bottom:10px">☰ Games</div>';
  if (window.WW && WW.openColorPicker) {   // pick your colour for every game
    var cb = document.createElement('button'), dotEl = '<i style="display:inline-block;width:1em;height:1em;border-radius:50%;vertical-align:-2px;margin-right:6px;border:2px solid #fff;background:' + (WW.myColor('#22c55e')) + '"></i>';
    cb.style.cssText = 'display:block;width:100%;text-align:left;color:#e2e8f0;padding:11px 12px;margin:0 0 6px;border-radius:12px;background:#0f172a;border:2px solid #475569;font:inherit;cursor:pointer';
    cb.innerHTML = dotEl + '<b>🎨 My color</b> <small style="color:#94a3b8">· change your frog, car and tractor color</small>';
    cb.onclick = function () { hide(); WW.openColorPicker(); };
    window.addEventListener('ww-color', function (e) { var d = cb.querySelector('i'); if (d) d.style.background = e.detail; });
    box.appendChild(cb);
  }
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
