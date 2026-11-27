/* Werewolf Twitch extension - turns a card (built by ww-stream-sync, lib/extcard.js) into HTML.
 * Pure functions, no DOM access, so they also run under node for tests (server/stream-sync/test/ext-render.test.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WWRender = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SITE = 'https://entertainment-71888.web.app/';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // only https images
  function img(u) { u = String(u || ''); return /^https:\/\//i.test(u) ? escapeHtml(u) : ''; }

  var key = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  function sameGame(a, b) { a = key(a); b = key(b); return a.length > 3 && b.length > 3 && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0); }
  // the card shows progress only for the game being played; "View more" opens the whole tracker
  function trackerHtml(t, game) {
    if (!t || !t.games || !t.games.length) return '';
    var g = t.games.filter(function (x) { return sameGame(x.name, game) && (x.summary || []).length; })[0];
    return (g ? '<div class="ww-track"><b>' + escapeHtml(g.name) + '</b>' + g.summary.map(function (s) { return '<div>' + escapeHtml(s) + '</div>'; }).join('') + '</div>' : '') +
      '<button type="button" class="ww-more" data-more="' + escapeHtml(t.code) + '">View more</button>';
  }

  function person(p, title) {
    var poster = img(p.poster) || img(p.avatar);
    return '<div class="ww-head">' + (img(p.avatar) ? '<img class="ww-av" src="' + img(p.avatar) + '" alt="">' : '') + '<span>' + escapeHtml(title) + '</span></div>' +
      '<div class="ww-body">' + (poster ? '<img class="ww-poster" src="' + poster + '" alt="">' : '') +
      '<div class="ww-info"><div class="ww-game">' + escapeHtml(p.game || '') + '</div>' + (p.status ? '<div class="ww-status">“' + escapeHtml(p.status) + '”</div>' : '') +
      trackerHtml(p.tracker, p.game) + '</div></div>';
  }

  // opts: { mobile, allyIndex }
  function renderCard(card, opts) {
    opts = opts || {}; if (!card || !card.me) return '';
    var me = card.me, allies = card.allies || [], out = '<div class="ww-card' + (opts.mobile ? ' ww-mobile' : '') + '">';
    if (allies.length) {
      var i = Math.max(0, Math.min(allies.length - 1, opts.allyIndex || 0)), a = allies[i];
      out += '<section class="ww-allies"><div class="ww-nav"><span>Allies in the same game</span>' +
        (allies.length > 1 ? '<button type="button" class="ww-prev" aria-label="Previous">◀</button><span class="ww-count">' + (i + 1) + '/' + allies.length + '</span><button type="button" class="ww-next" aria-label="Next">▶</button>' : '') +
        '</div>' + person(a, a.name) + '</section>';
    }
    out += '<section class="ww-me">' + person(me, (me.name || '') + (card.live ? ' is playing' : '')) + '</section>';
    out += '<a class="ww-foot" href="' + SITE + '" target="_blank" rel="noopener">' + escapeHtml(card.foot || '') + '</a></div>';
    return out;
  }

  function renderMark(card) {
    if (!card || !card.wm) return '';
    // a credit naming who made the extension; tapping it opens Overlay Studio's Twitch extension section
    return '<a class="ww-mark" href="' + SITE + 'overlay-studio#extension" target="_blank" rel="noopener" style="opacity:' + Number(card.wm.opacity || 0.75) + '">' +
      (img(card.wm.img) ? '<img src="' + img(card.wm.img) + '" alt="">' : '') + '<span>🐺 Overlay by <b>' + escapeHtml(card.wm.name) + '</b></span></a>';
  }

  // where the watermark goes: a random spot in the top band or the left/right edge bands (outer 18%),
  // never the middle and never the bottom 12% (Twitch's player buttons). Returns the mark's centre.
  function creditSpot(rand, w, h) {
    var band = 0.18, side = Math.floor(rand() * 3), x, y;
    if (side === 0) { x = (0.04 + rand() * 0.92) * w; y = (0.03 + rand() * (band - 0.03)) * h; }            // top
    else { y = (0.03 + rand() * (0.85 - 0.03)) * h; x = (0.03 + rand() * (band - 0.03)) * w; if (side === 2) x = w - x; }   // left / right
    return { x: Math.round(x), y: Math.round(y) };
  }

  // show the watermark for a given wmAt once, and only if it is fresh (viewers who join later don't get an old one)
  function shouldShowMark(wmAt, now, seen) { return !!wmAt && now - wmAt < 60000 && now - wmAt > -60000 && !seen.has(wmAt); }

  // Firestore REST list -> [{ id, name, facts: ["k: v"] }]
  function parseFirestoreDocs(j) {
    return ((j && j.documents) || []).map(function (d) {
      var f = d.fields || {}, val = function (v) { return v.stringValue != null ? v.stringValue : v.integerValue != null ? v.integerValue : v.doubleValue != null ? v.doubleValue : v.booleanValue != null ? (v.booleanValue ? 'yes' : 'no') : null; };
      var id = String(d.name || '').split('/').pop(), name = (f.name && val(f.name)) || (f.title && val(f.title)) || id;
      var facts = Object.keys(f).filter(function (k) { return !/^(name|title|updatedAt|art|image|poster.*|.*Url|id)$/i.test(k); })
        .map(function (k) { var v = val(f[k]); return v == null || String(v).length > 40 ? null : k.replace(/[_-]+/g, ' ') + ': ' + v; }).filter(Boolean).slice(0, 8);
      return { id: id, name: String(name), facts: facts };
    });
  }
  var PLAT = { playstation: 'PlayStation', steam: 'Steam', xbox: 'Xbox', mobile: 'Mobile games', pc: 'PC' };
  function profileHtml(p) {
    if (!p || !p.groups || !p.groups.length) return '';
    return '<div class="ww-prof"><div class="ww-prof-h"><b>' + escapeHtml(p.title) + '</b><span>Level ' + escapeHtml(p.level || 1) + '</span></div><div class="ww-prof-g">' +
      p.groups.map(function (g) { return '<div><div class="ww-prof-n">' + escapeHtml(g.name) + '</div>' +
        g.rows.map(function (r) { return '<div class="ww-prof-r"><span>' + escapeHtml(r[0]) + '</span><b>' + escapeHtml(r[1]) + '</b></div>'; }).join('') + '</div>'; }).join('') +
      '</div></div>';
  }
  function renderMore(docs) {
    docs = (docs || []).filter(function (d) { return d && ((d.facts || []).length || d.profile); });
    if (!docs.length) return '<p class="ww-empty">No tracked games yet.</p>';
    var out = '', last = null;
    docs.forEach(function (d) {
      var p = d.platform || '';
      if (p !== last) { out += '<h4 class="ww-plat">' + escapeHtml(PLAT[p] || p || 'Games') + '</h4>'; last = p; }
      out += '<div class="ww-game-card"><b class="ww-game-name">' + escapeHtml(d.name) + '</b>' +
        ((d.facts || []).length ? '<div class="ww-chips">' + d.facts.map(function (s) { return '<span>' + escapeHtml(s) + '</span>'; }).join('') + '</div>' : '') +
        profileHtml(d.profile) + '</div>';
    });
    return out;
  }

  // the always-on layer: the same logo/name, "Now playing", Twitch poster and stream title the streamer's
  // overlay shows, in the same corners (from Overlay Studio), so console streamers get their overlay too
  var SPOTS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
  function renderLayer(card, look) {
    var L = look && look.layout; if (!card || !card.live || !L || !card.me) return '';
    var me = card.me, at = {};
    function put(pos, html) { pos = SPOTS.indexOf(pos) >= 0 ? pos : 'br'; (at[pos] = at[pos] || []).push(html); }
    if (L.poster && L.poster.on && img(me.poster)) put(L.poster.pos, '<div class="ww-box ww-lposter" style="--psz:' + (Number(L.poster.size || 100) / 100) + '"><img src="' + img(me.poster) + '" alt=""></div>');
    if (L.title && L.title.on && me.title) put(L.title.pos, '<div class="ww-box ww-ltitle">' + escapeHtml(me.title) + '</div>');
    if (L.brand && L.brand.on) put(L.brand.pos, '<div class="ww-box ww-lbrand">' + (img(me.avatar) ? '<img src="' + img(me.avatar) + '" alt="">' : '') +
      '<div><b>' + escapeHtml(L.brand.name || me.name || '') + '</b>' + (L.brand.tag ? '<small>' + escapeHtml(L.brand.tag) + '</small>' : '') + '</div></div>');
    if (L.game && L.game.on && me.game) put(L.game.pos, '<div class="ww-box ww-lgame"><small>' + escapeHtml(L.game.prefix || 'Now playing') + '</small><b>' + escapeHtml(me.game) + '</b></div>');
    return SPOTS.filter(function (p) { return at[p]; }).map(function (p) { return '<div class="ww-spot ww-' + p + '">' + at[p].join('') + '</div>'; }).join('');
  }

  // the streamer's overlay look (colors, font, corners, glow) -> CSS variables for ext.css
  var HEX = /^#[0-9a-f]{6}$/i;
  function lookVars(l) {
    var v = {}; if (!l) return v;
    if (HEX.test(l.accent || '')) { v['--ww-accent'] = l.accent; if (l.glow) v['--ww-glow'] = '0 0 14px ' + l.accent + '99'; }
    if (HEX.test(l.accent2 || '')) v['--ww-accent2'] = l.accent2;
    if (HEX.test(l.text || '')) v['--ww-text'] = l.text;
    if (HEX.test(l.panel || '')) {
      var n = parseInt(l.panel.slice(1), 16), o = Math.min(100, Math.max(0, Number(l.panelOpacity == null ? 88 : l.panelOpacity))) / 100;
      v['--ww-panel'] = 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + Math.max(o, 0.6) + ')';
    }
    if (l.radius != null && isFinite(l.radius)) v['--ww-radius'] = Math.min(30, Math.max(0, Number(l.radius))) + 'px';
    if (/^[A-Za-z0-9 ]{2,30}$/.test(l.font || '')) v['--ww-font'] = "'" + l.font + "',Inter,system-ui,sans-serif";
    return v;
  }

  return { renderLayer: renderLayer, lookVars: lookVars, escapeHtml: escapeHtml, renderCard: renderCard, renderMark: renderMark, creditSpot: creditSpot, shouldShowMark: shouldShowMark, parseFirestoreDocs: parseFirestoreDocs, renderMore: renderMore, SITE: SITE };
}));
