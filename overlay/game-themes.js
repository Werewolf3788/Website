/*
 * Game Themes - shared by every stream overlay (Overlay Studio + hand-made overlays).
 *
 *   <script src="https://entertainment-71888.web.app/overlay/game-themes.js"></script>
 *   GameThemes.load().then(function () {
 *     GameThemes.apply({
 *       game: 'Phasmophobia',
 *       root: document.body,                       // gets --gt-primary, --gt-accent, --gt-border, --gt-panel, --gt-text
 *       targets: [avatarEl, posterEl, bannerEl, { el: qrBoxEl, safe: true }],
 *       onTheme: function (theme) { ... map theme.colors onto your own CSS variables ... }
 *     });
 *   });
 *
 * Or let it follow a Twitch channel on its own (checks the game every minute):
 *   GameThemes.watch({ channel: 'phoenix_darkfire', root: ..., targets: [...], onTheme: ... });
 *
 * Themes, colors and which games use them live in game-themes.json (same folder).
 * Genres looked up from IGDB live in game-genres.json (filled by the "Game genres" GitHub Action).
 *
 * Effects only decorate the EDGES of the pieces you pass in: a ring around the frame, glow
 * behind it, drips hanging below it, particles just outside it. Nothing is drawn over the
 * picture inside a piece, and nothing is drawn in the middle of the screen.
 * Targets marked { safe: true } (QR codes) never get anything over them. Pieces shorter than 60px
 * (or marked { light: true }) only get the frame + glow, no drips or particles.
 */
(function (root) {
  'use strict';

  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^/]*(\?.*)?$/, '') : 'https://entertainment-71888.web.app/overlay/';
  var RAW = 'https://raw.githubusercontent.com/Werewolf3788/website/main/overlay/';

  var THEMES = [], BY_ID = {}, GENRES = {}, loaded = null, cssDone = false, kfCount = 0;

  /* ---------------- loading ---------------- */
  // rawFirst: the genre file is committed by a GitHub Action (which does not redeploy the site),
  // so read it straight from GitHub first; the site copy is the backup.
  function getJSON(name, rawFirst) {
    var bust = '?v=' + Math.floor(Date.now() / 300000);     // refresh every 5 minutes at most
    var a = rawFirst ? RAW : BASE, b = rawFirst ? BASE : RAW;
    return fetch(a + name + bust).then(function (r) { if (!r.ok) throw r.status; return r.json(); })
      .catch(function () { return fetch(b + name + bust).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); });
  }
  function load(force) {
    if (loaded && !force) return loaded;
    loaded = Promise.all([
      getJSON('game-themes.json'),
      getJSON('game-genres.json', true).catch(function () { return { games: {} }; })
    ]).then(function (r) {
      THEMES = (r[0] && r[0].themes) || [];
      BY_ID = {}; THEMES.forEach(function (t) { BY_ID[t.id] = t; });
      GENRES = (r[1] && r[1].games) || {};
      api.themes = THEMES; api.genres = GENRES; api.channels = (r[0] && r[0].channels) || [];
      return api;
    });
    loaded.catch(function () { loaded = null; });
    return loaded;
  }

  /* ---------------- matching ---------------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/[‘’`]/g, "'").replace(/\s+/g, ' ').trim(); }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hasWord(text, kw) { return new RegExp('(^|[^a-z0-9])' + reEsc(norm(kw)) + '($|[^a-z0-9])').test(text); }
  function isOffline(g) { return !g || /^(offline|stream offline|scanning\.*)$/.test(g); }

  // Returns { theme, why } - why = 'name' | 'keyword' | 'genre' | 'default'
  function explain(game) {
    var g = norm(game), def = BY_ID['default'] || THEMES[0] || null;
    if (isOffline(g)) return { theme: def, why: 'default' };
    var i, t;
    for (i = 0; i < THEMES.length; i++) {
      t = THEMES[i];
      if ((t.games || []).some(function (n) { return norm(n) === g; })) return { theme: t, why: 'name' };
    }
    for (i = 0; i < THEMES.length; i++) {
      t = THEMES[i];
      if ((t.keywords || []).some(function (k) { return hasWord(g, k); })) return { theme: t, why: 'keyword', hit: (t.keywords || []).filter(function (k) { return hasWord(g, k); })[0] };
    }
    var info = GENRES[g];
    if (info) {
      var tags = [].concat(info.themes || [], info.genres || []).map(norm);
      for (i = 0; i < THEMES.length; i++) {
        t = THEMES[i];
        var hit = (t.genres || []).filter(function (x) { return tags.indexOf(norm(x)) > -1; })[0];
        if (hit) return { theme: t, why: 'genre', hit: hit };
      }
    }
    return { theme: def, why: 'default' };
  }
  function match(game) { return explain(game).theme; }

  // Twitch box art for a game (from the genre lookup when we have it, otherwise by name)
  function boxArt(game, w, h) {
    w = w || 285; h = h || 380;
    var info = GENRES[norm(game)];
    if (info && info.box) return info.box.replace('{width}', w).replace('{height}', h);
    return 'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(game) + '-' + w + 'x' + h + '.jpg';
  }

  /* ---------------- effects ---------------- */
  var CSS = [
    '.gt-fx{position:absolute;inset:-6px;pointer-events:none;border-radius:inherit;z-index:6;overflow:visible}',
    '.gt-fx *{pointer-events:none}',
    // ring: only the frame edge is painted, the inside stays see-through
    '.gt-ring{position:absolute;inset:0;border-radius:inherit;padding:5px;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}',
    '.gt-glow{position:absolute;inset:4px;border-radius:inherit}',
    // pulse
    '.gt-fx-pulse .gt-glow{animation:gt-pulse 3s ease-in-out infinite;box-shadow:0 0 16px 2px var(--gt-c1)}',
    '@keyframes gt-pulse{0%,100%{opacity:.35}50%{opacity:1}}',
    // police light bar: red double-flash on the left, blue on the right
    '.gt-fx-lights .gt-ring{background:linear-gradient(90deg,var(--gt-c1) 0 50%,var(--gt-c2) 50% 100%);animation:gt-bar 1.2s steps(1) infinite}',
    '.gt-fx-lights .gt-glow.a{box-shadow:-14px 0 26px 4px var(--gt-c1);animation:gt-red 1.2s steps(1) infinite}',
    '.gt-fx-lights .gt-glow.b{box-shadow:14px 0 26px 4px var(--gt-c2);animation:gt-blue 1.2s steps(1) infinite}',
    '@keyframes gt-red{0%,20%{opacity:1}10%,30%,100%{opacity:0}}',
    '@keyframes gt-blue{0%,40%{opacity:0}50%,70%{opacity:1}60%,80%,100%{opacity:0}}',
    '@keyframes gt-bar{0%,20%,50%,70%{opacity:1}10%,30%,60%,80%{opacity:.25}}',
    // camo
    '.gt-fx-camo .gt-ring{padding:7px;background:radial-gradient(circle at 20% 30%,var(--gt-c2) 0 18%,transparent 19%),radial-gradient(circle at 70% 60%,var(--gt-c3) 0 22%,transparent 23%),radial-gradient(circle at 40% 80%,var(--gt-c4) 0 15%,transparent 16%),radial-gradient(circle at 85% 15%,var(--gt-c2) 0 14%,transparent 15%),var(--gt-c1);background-size:46px 46px,58px 58px,38px 38px,52px 52px,auto}',
    '.gt-fx-camo .gt-glow{box-shadow:0 0 12px 1px var(--gt-accent,#ff6a00);opacity:.55}',
    // speed lines (racing / sonic)
    '.gt-fx-speed .gt-ring{background:repeating-linear-gradient(115deg,var(--gt-c1) 0 10px,var(--gt-c2) 10px 20px);background-size:200% 100%;animation:gt-speed .9s linear infinite}',
    '.gt-fx-speed .gt-glow{box-shadow:0 0 14px 1px var(--gt-c1);opacity:.6}',
    '@keyframes gt-speed{from{background-position:0 0}to{background-position:-46px 0}}',
    // toxic flicker
    '.gt-fx-flicker .gt-ring{background:var(--gt-c1);animation:gt-flick 4s infinite}',
    '.gt-fx-flicker .gt-glow{box-shadow:0 0 22px 3px var(--gt-c2);animation:gt-flick 4s infinite}',
    '@keyframes gt-flick{0%,18%,22%,62%,64%,100%{opacity:1}20%,63%{opacity:.15}40%{opacity:.75}}',
    // stadium light sweep
    '.gt-fx-stadium .gt-ring{background:linear-gradient(100deg,var(--gt-c2) 0 35%,var(--gt-c1) 50%,var(--gt-c2) 65% 100%);background-size:300% 100%;animation:gt-sweep 3.5s ease-in-out infinite}',
    '.gt-fx-stadium .gt-glow{box-shadow:0 0 20px 2px var(--gt-c1);animation:gt-pulse 3.5s ease-in-out infinite}',
    '@keyframes gt-sweep{from{background-position:100% 0}to{background-position:0 0}}',
    // blood: dark ring + drips hanging below the bottom edge
    '.gt-fx-blood .gt-ring{background:linear-gradient(180deg,var(--gt-c2),var(--gt-c1))}',
    '.gt-fx-blood .gt-glow{box-shadow:0 0 18px 2px var(--gt-c1);opacity:.7}',
    '.gt-drips{position:absolute;left:8px;right:8px;top:calc(100% - 3px);height:0}',
    '.gt-drip{position:absolute;top:0;width:var(--w);height:0;border-radius:0 0 var(--w) var(--w);background:linear-gradient(var(--gt-c1),var(--gt-c2));animation:gt-drip var(--dur) ease-in var(--delay) infinite}',
    '.gt-drip::after{content:"";position:absolute;left:50%;bottom:-2px;width:calc(var(--w) + 3px);height:calc(var(--w) + 5px);transform:translateX(-50%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:var(--gt-c2);animation:gt-drop var(--dur) ease-in var(--delay) infinite}',
    '@keyframes gt-drip{0%{height:0}55%{height:var(--len)}80%{height:var(--len);opacity:1}100%{height:var(--len);opacity:0}}',
    '@keyframes gt-drop{0%,55%{transform:translate(-50%,0);opacity:1}85%{transform:translate(-50%,var(--fall));opacity:0}100%{opacity:0}}',
    // crop cycle: animation is built per theme (see cropKeyframes)
    '.gt-fx-crops .gt-ring{padding:6px}',
    // particles: they start just OUTSIDE the piece and move away from it
    '.gt-parts{position:absolute;inset:0}',
    '.gt-p{position:absolute;left:var(--x);top:var(--y);opacity:0;animation:gt-move var(--dur) linear var(--delay) infinite;color:var(--c);line-height:1;will-change:transform,opacity}',
    '@keyframes gt-move{0%{transform:translate(0,0) rotate(0);opacity:0}15%{opacity:var(--o)}80%{opacity:var(--o)}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}',
    '.gt-p.dot{width:var(--s);height:var(--s);border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c)}',
    '.gt-p.spark{width:var(--s);height:var(--s);border-radius:50%;background:var(--c);box-shadow:0 0 8px 2px var(--c)}',
    '.gt-p.bubble{width:var(--s);height:var(--s);border-radius:50%;border:1.5px solid var(--c);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.6),transparent 45%)}',
    '.gt-p.petal{width:var(--s);height:calc(var(--s) * .65);border-radius:80% 0 80% 0;background:var(--c)}',
    '.gt-p.rain{width:1.5px;height:calc(var(--s) * 2.4);background:linear-gradient(transparent,var(--c));border-radius:1px}',
    '.gt-p.star,.gt-p.flake{font-size:calc(var(--s) * 1.8);text-shadow:0 0 6px var(--c)}',
    '.gt-fx-particles .gt-glow{box-shadow:0 0 14px 1px var(--gt-c1);opacity:.45}',
    '.gt-fx-particles .gt-glow.pulse{animation:gt-pulse 2.6s ease-in-out infinite;opacity:1}'
  ].join('\n');

  function injectCSS() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style'); s.id = 'game-themes-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }

  function cropKeyframes(stages, secs) {
    var name = 'gt-crops-' + (++kfCount), n = stages.length, frames = [];
    stages.forEach(function (st, i) {
      frames.push((i / n * 100).toFixed(2) + '%{background:' + st.color + ';box-shadow:0 0 16px 2px ' + st.color + '}');
      frames.push(((i + 0.7) / n * 100).toFixed(2) + '%{background:' + st.color + ';box-shadow:0 0 16px 2px ' + st.color + '}');
    });
    frames.push('100%{background:' + stages[0].color + ';box-shadow:0 0 16px 2px ' + stages[0].color + '}');
    var s = document.createElement('style');
    s.textContent = '@keyframes ' + name + '{' + frames.join('') + '}' +
      '.gt-fx-crops.' + name + ' .gt-ring{animation:' + name + ' ' + (secs || 60) + 's linear infinite;box-shadow:none}' +
      '.gt-fx-crops.' + name + ' .gt-glow{animation:' + name + ' ' + (secs || 60) + 's linear infinite;background:transparent!important}';
    document.head.appendChild(s);
    return name;
  }

  // particles just outside the piece; dir: up | down | side
  function addParticles(fx, eff, w, h) {
    var box = div('gt-parts'), colors = eff.colors && eff.colors.length ? eff.colors : ['#fff'];
    var count = Math.min(eff.count || 8, Math.max(4, Math.round((w + h) / 40)));
    var shape = eff.shape || 'dot', dir = eff.dir || 'up', pad = 14;
    for (var i = 0; i < count; i++) {
      var p = div('gt-p ' + shape), x, y, dx = 0, dy = 0, band = Math.random();
      // choose a start spot in a band OUTSIDE the piece (never on top of it)
      if (dir === 'up') {
        if (band < 0.6) { x = rnd(0, w); y = rnd(-pad, -2); } else { x = band < 0.8 ? rnd(-pad, -3) : rnd(w + 3, w + pad); y = rnd(0, h); }
        dy = -rnd(40, 75); dx = rnd(-12, 12);
      } else if (dir === 'down') {
        if (band < 0.5) { x = rnd(0, w); y = rnd(h + 2, h + pad); } else { x = band < 0.75 ? rnd(-pad, -3) : rnd(w + 3, w + pad); y = rnd(-pad, h * 0.6); }
        dy = rnd(40, 75); dx = rnd(-10, 10);
      } else {
        if (band < 0.5) { x = rnd(w + 2, w + pad); y = rnd(0, h); } else { x = rnd(0, w); y = band < 0.75 ? rnd(-pad, -3) : rnd(h + 3, h + pad); }
        dx = rnd(45, 80); dy = rnd(-8, 8);
      }
      var s = shape === 'flake' || shape === 'star' ? rnd(5, 8) : rnd(3, 7);
      if (shape === 'bubble' || shape === 'petal') s = rnd(6, 11);
      if (shape === 'star') p.textContent = '✦';
      if (shape === 'flake') p.textContent = '❄';
      var st = p.style;
      st.setProperty('--x', x.toFixed(1) + 'px'); st.setProperty('--y', y.toFixed(1) + 'px');
      st.setProperty('--dx', dx.toFixed(1) + 'px'); st.setProperty('--dy', dy.toFixed(1) + 'px');
      st.setProperty('--s', s.toFixed(1) + 'px'); st.setProperty('--c', pick(colors));
      st.setProperty('--o', String(shape === 'rain' ? 0.7 : 0.95));
      st.setProperty('--rot', (shape === 'petal' || shape === 'flake' ? rnd(-200, 200) : 0).toFixed(0) + 'deg');
      st.setProperty('--dur', rnd(shape === 'rain' ? 0.9 : 2.8, shape === 'rain' ? 1.6 : 5.5).toFixed(2) + 's');
      st.setProperty('--delay', (-rnd(0, 5)).toFixed(2) + 's');
      box.appendChild(p);
    }
    fx.appendChild(box);
  }

  function addDrips(fx, eff, w) {
    var box = div('gt-drips'), n = Math.max(2, Math.min(16, Math.round(w / 34)));
    for (var i = 0; i < n; i++) {
      var d = div('gt-drip'), st = d.style, wd = rnd(4, 8);
      st.left = (((i + rnd(0.15, 0.85)) / n) * 100).toFixed(1) + '%';
      st.setProperty('--w', wd.toFixed(1) + 'px');
      st.setProperty('--len', rnd(10, 30).toFixed(0) + 'px');
      st.setProperty('--fall', rnd(25, 55).toFixed(0) + 'px');
      st.setProperty('--dur', rnd(3.5, 7).toFixed(2) + 's');
      st.setProperty('--delay', (-rnd(0, 7)).toFixed(2) + 's');
      box.appendChild(d);
    }
    fx.appendChild(box);
  }

  function clear(targets) {
    (targets || []).forEach(function (t) {
      var el = t && (t.el || t);
      if (!el || !el.querySelectorAll) return;
      [].slice.call(el.children).forEach(function (c) { if (c.classList && c.classList.contains('gt-fx')) c.remove(); });
    });
  }

  function decorate(target, theme) {
    var el = target.el || target;
    if (!el || !el.appendChild) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var eff = theme.effect || { type: 'pulse' }, type = eff.type || 'pulse';
    var c = (eff.colors && eff.colors.length ? eff.colors : [theme.colors.primary, theme.colors.accent]);
    var fx = div('gt-fx gt-fx-' + type);
    fx.setAttribute('aria-hidden', 'true');
    fx.style.setProperty('--gt-c1', c[0]); fx.style.setProperty('--gt-c2', c[1] || c[0]);
    fx.style.setProperty('--gt-c3', c[2] || c[0]); fx.style.setProperty('--gt-c4', c[3] || c[1] || c[0]);
    fx.style.setProperty('--gt-accent', theme.colors.primary);
    var w = el.offsetWidth || 100, h = el.offsetHeight || 100;
    // thin pieces (labels, friend cards, tickers) only get the frame + glow, so drips or
    // particles never hang over the piece right below them. { light: true } forces this too.
    var light = target.light === true || h < 60;

    if (type === 'particles') {
      if (eff.pulse) { var gp = div('gt-glow pulse'); gp.style.boxShadow = '0 0 16px 2px ' + eff.pulse; fx.appendChild(gp); }
      else fx.appendChild(div('gt-glow'));
      if (!light) addParticles(fx, eff, w + 12, h + 12);
    } else if (type === 'lights') {
      fx.appendChild(div('gt-glow a')); fx.appendChild(div('gt-glow b')); fx.appendChild(div('gt-ring'));
    } else if (type === 'crops' && eff.stages && eff.stages.length) {
      fx.classList.add(cropKeyframes(eff.stages, eff.seconds));
      fx.appendChild(div('gt-glow')); fx.appendChild(div('gt-ring'));
    } else {
      fx.appendChild(div('gt-glow')); fx.appendChild(div('gt-ring'));
      if (type === 'blood' && !light) addDrips(fx, eff, w + 12);
    }
    el.appendChild(fx);
  }

  // apply({ game | theme, root, targets, onTheme }) -> theme
  function apply(o) {
    o = o || {};
    injectCSS();
    var theme = o.theme ? (typeof o.theme === 'string' ? BY_ID[o.theme] : o.theme) : match(o.game);
    if (!theme) return null;
    var r = o.root || document.documentElement, c = theme.colors || {};
    ['primary', 'accent', 'border', 'panel', 'text'].forEach(function (k) { if (c[k]) r.style.setProperty('--gt-' + k, c[k]); });
    r.setAttribute('data-game-theme', theme.id);
    clear(o.targets);
    (o.targets || []).forEach(function (t) { if (t) decorate(t, theme); });
    if (typeof o.onTheme === 'function') o.onTheme(theme);
    return theme;
  }

  // watch({ channel, root, targets (array or function returning one), onTheme, onGame, every }) -> stop()
  function watch(o) {
    var last = null, stopped = false, timer;
    function targets() { return typeof o.targets === 'function' ? o.targets() : o.targets; }
    function tick() {
      if (stopped) return;
      fetch('https://decapi.me/twitch/game/' + encodeURIComponent(o.channel) + '?v=' + Date.now())
        .then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
        .then(function (t) {
          t = String(t || '').trim();
          if (!t || /error|not found|no user|rate limit|invalid/i.test(t)) t = 'offline';
          if (t === last) return;
          last = t;
          if (typeof o.onGame === 'function') o.onGame(t);
          apply({ game: t, root: o.root, targets: targets(), onTheme: o.onTheme });
        });
    }
    load().then(tick);
    timer = setInterval(tick, o.every || 60000);
    return function stop() { stopped = true; clearInterval(timer); };
  }

  var api = {
    load: load, match: match, explain: explain, apply: apply, clear: clear, watch: watch, boxArt: boxArt,
    theme: function (id) { return BY_ID[id]; }, themes: THEMES, genres: GENRES, base: BASE
  };
  root.GameThemes = api;
})(typeof window !== 'undefined' ? window : this);
