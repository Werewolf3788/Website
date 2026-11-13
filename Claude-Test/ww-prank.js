/* ww-prank.js - owner-controlled pranks, per friend code.  Data: pranks/{FRIENDCODE} = { jumpscare: true, chance: 0.2, from: 'Werewolf' }
 * (only the site owner can write that node). Loaded by ww-social.js on every page of the site.
 * Jump scare: at random (chance per page visit, at most once every 20 minutes) a face lunges at the screen with a scream.
 * Safety: no strobing / flashing, capped volume, ~1.6 s long, and it can only start on a tap or key press (browsers block sound otherwise).
 * Preview on your own screen: add ?jumpscare=test to any page address. */
(function () {
  'use strict';
  var COOLDOWN = 20 * 60 * 1000, armed = false;
  function scream() {
    try {
      var A = window.AudioContext || window.webkitAudioContext, a = new A(), t = a.currentTime, out = a.createGain(); out.gain.value = 0.32; out.connect(a.destination);
      [[520, 1500, 'sawtooth', .5], [540, 1450, 'square', .25], [260, 700, 'sawtooth', .35]].forEach(function (v) {
        var o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
        o.type = v[2]; o.frequency.setValueAtTime(v[0], t); o.frequency.exponentialRampToValueAtTime(v[1], t + .12); o.frequency.exponentialRampToValueAtTime(v[1] * .6, t + 1.3);
        l.frequency.value = 28; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);                      // rough vibrato = scream
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v[3], t + .03); g.gain.setValueAtTime(v[3], t + .9); g.gain.exponentialRampToValueAtTime(.001, t + 1.4);
        o.connect(g); g.connect(out); o.start(t); l.start(t); o.stop(t + 1.45); l.stop(t + 1.45);
      });
      var n = Math.floor(a.sampleRate * 1.2), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var s = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .7;
      ng.gain.setValueAtTime(.35, t); ng.gain.exponentialRampToValueAtTime(.001, t + 1.2); s.connect(f); f.connect(ng); ng.connect(out); s.start(t);
      setTimeout(function () { try { a.close(); } catch (e) {} }, 2200);
    } catch (e) {}
  }
  function face() {   // original drawing: snarling wolf face
    return '<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M30 20 L62 78 L100 60 L138 78 L170 20 L160 110 Q150 170 100 190 Q50 170 40 110 Z" fill="#17171c" stroke="#000" stroke-width="3"/>' +
      '<path d="M38 34 L60 76 L50 80 Z M162 34 L140 76 L150 80 Z" fill="#7f1d1d"/>' +
      '<path d="M52 96 L88 108 L60 118 Z M148 96 L112 108 L140 118 Z" fill="#fde047"/><ellipse cx="72" cy="108" rx="4" ry="9" fill="#000"/><ellipse cx="128" cy="108" rx="4" ry="9" fill="#000"/>' +
      '<path d="M88 126 L112 126 L100 138 Z" fill="#000"/>' +
      '<path d="M58 140 Q100 128 142 140 Q132 182 100 186 Q68 182 58 140 Z" fill="#450a0a" stroke="#000" stroke-width="2"/>' +
      '<path d="M64 142 l8 20 l8 -18 l8 16 l6 -14 l6 14 l8 -16 l8 18 l8 -20 Z" fill="#f8fafc"/>' +
      '<path d="M74 180 l7 -16 l7 14 l6 -12 l6 12 l7 -14 l7 16 Z" fill="#f8fafc"/>' +
      '<path d="M46 86 L92 100 M154 86 L108 100" stroke="#000" stroke-width="6" stroke-linecap="round"/></svg>';
  }
  function fire(from) {
    try { localStorage.setItem('ww_prank_last', String(Date.now())); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = '@keyframes wwLunge{0%{transform:scale(.05);opacity:0}12%{transform:scale(1.25);opacity:1}20%{transform:scale(1.1) rotate(-3deg)}32%{transform:scale(1.2) rotate(3deg)}46%{transform:scale(1.12) rotate(-2deg)}60%{transform:scale(1.18) rotate(2deg)}85%{transform:scale(1.15);opacity:1}100%{transform:scale(1.6);opacity:0}}' +
      '#wwScare{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle,#450a0a 0%,#000 75%);display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '#wwScare .f{width:min(92vw,92vh);height:min(92vw,92vh);animation:wwLunge 1.6s ease-out forwards}' +
      '#wwGot{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#0f172a;color:#fde68a;font:700 14px system-ui;padding:10px 16px;border-radius:999px;box-shadow:0 4px 18px #000a}';
    var d = document.createElement('div'); d.id = 'wwScare'; d.innerHTML = '<div class="f">' + face() + '</div>';
    document.head.appendChild(st); document.body.appendChild(d); scream(); if (navigator.vibrate) try { navigator.vibrate([200, 60, 300]); } catch (e) {}
    setTimeout(function () {
      d.remove(); var g = document.createElement('div'); g.id = 'wwGot'; g.textContent = '😈 Gotcha!' + (from ? ' — ' + from : ''); document.body.appendChild(g);
      setTimeout(function () { g.remove(); st.remove(); }, 3500);
    }, 1650);
  }
  function arm(from, delay) {
    if (armed) return; armed = true;
    setTimeout(function () {
      var go = function () { window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); fire(from); };
      window.addEventListener('pointerdown', go, true); window.addEventListener('keydown', go, true);
    }, delay);
  }
  window.WWPrank = {
    start: async function (WW) {
      try {
        if (/[?&]jumpscare=test\b/.test(location.search)) { arm('preview', 300); return; }
        var me = WW.me; if (!me || !me.friendCode) return;
        var p = (await WW.db.ref('pranks/' + me.friendCode).once('value')).val(); if (!p || p.jumpscare !== true) return;
        var last = 0; try { last = +localStorage.getItem('ww_prank_last') || 0; } catch (e) {}
        if (Date.now() - last < COOLDOWN) return;
        var chance = typeof p.chance === 'number' ? Math.max(0, Math.min(1, p.chance)) : 0.2;
        if (Math.random() < chance) arm(p.from || '', 4000 + Math.random() * 30000);
      } catch (e) {}
    }
  };
})();
