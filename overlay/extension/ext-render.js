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

  function trackerHtml(t, game) {
    if (!t || !t.games || !t.games.length) return '';
    var g0 = String(game || '').toLowerCase(), list = t.games.slice();
    list.sort(function (a, b) { var ma = g0 && g0.indexOf(String(a.name).toLowerCase()) >= 0, mb = g0 && g0.indexOf(String(b.name).toLowerCase()) >= 0; return (mb ? 1 : 0) - (ma ? 1 : 0); });
    var g = list[0];
    return '<div class="ww-track"><b>' + escapeHtml(g.name) + '</b>' + (g.summary || []).map(function (s) { return '<div>' + escapeHtml(s) + '</div>'; }).join('') + '</div>' +
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
    return '<a class="ww-mark" href="' + SITE + '" target="_blank" rel="noopener" style="opacity:' + Number(card.wm.opacity || 0.75) + '">' +
      (img(card.wm.img) ? '<img src="' + img(card.wm.img) + '" alt="">' : '') + '<span>' + escapeHtml(card.wm.name) + '</span></a>';
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
  function renderMore(docs) {
    if (!docs || !docs.length) return '<p class="ww-empty">No tracked games yet.</p>';
    return docs.map(function (d) { return '<div class="ww-track"><b>' + escapeHtml(d.name) + '</b>' + d.facts.map(function (s) { return '<div>' + escapeHtml(s) + '</div>'; }).join('') + '</div>'; }).join('');
  }

  return { escapeHtml: escapeHtml, renderCard: renderCard, renderMark: renderMark, creditSpot: creditSpot, shouldShowMark: shouldShowMark, parseFirestoreDocs: parseFirestoreDocs, renderMore: renderMore, SITE: SITE };
}));
