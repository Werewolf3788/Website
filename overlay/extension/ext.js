/* Werewolf Twitch extension: viewer pages (video_overlay.html, mobile.html).
 * Gets the card from Twitch (broadcaster config on load, then broadcast messages), draws it with WWRender,
 * shows the watermark/credit when the card says so, and loads "View more" from Firestore on tap only. */
(function () {
  'use strict';
  var R = window.WWRender, T = window.Twitch && window.Twitch.ext;
  var mobile = document.body.classList.contains('mobile');
  var SYNC = 'https://ww-stream-sync.onrender.com';
  var st = { card: null, ally: 0, seen: new Set(), credited: new Set(), channelId: '', more: null };
  var root = document.getElementById('ww'), panel = document.getElementById('wwPanel'), mark = document.getElementById('wwMark'), more = document.getElementById('wwMore');
  var toggle = document.getElementById('wwToggle');
  function ga(name) { try { if (window.gtag) gtag('event', name, { view: mobile ? 'mobile' : 'overlay' }); } catch (e) {} }

  var layer = document.getElementById('wwLayer');
  function draw() {
    if (layer) layer.innerHTML = st.card ? R.renderLayer(st.card, st.card.look) : '';
    root.innerHTML = st.card ? R.renderCard(st.card, { mobile: mobile, allyIndex: st.ally }) : '<p class="ww-wait">Waiting for the stream…</p>';
  }
  // match the streamer's overlay: colors, corners, glow and font from Overlay Studio
  var fontNow = '';
  function applyLook(look) {
    var v = R.lookVars(look), el = document.documentElement;
    ['--ww-accent', '--ww-accent2', '--ww-panel', '--ww-text', '--ww-radius', '--ww-font', '--ww-glow'].forEach(function (k) { if (v[k]) el.style.setProperty(k, v[k]); else el.style.removeProperty(k); });
    var f = look && v['--ww-font'] ? look.font : '';
    if (f && f !== fontNow) {
      fontNow = f;
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;700;800&display=swap';
      document.head.appendChild(l);
    }
  }
  function take(card) {
    if (!card || !card.me) return;
    applyLook(card.look);
    if (st.card && (card.allies || []).length !== (st.card.allies || []).length) st.ally = 0;
    st.card = card; draw(); checkMarks();
  }
  function showMark() {
    if (!st.card || !st.card.wm) return;
    mark.innerHTML = R.renderMark(st.card);
    var w = document.documentElement.clientWidth, h = document.documentElement.clientHeight, p = R.creditSpot(Math.random, w, h);
    var a = mark.firstChild; a.style.left = p.x + 'px'; a.style.top = p.y + 'px'; a.style.display = 'flex';
    var r = a.getBoundingClientRect();   // keep the whole mark on screen
    if (r.right > w - 4) a.style.left = (p.x - (r.right - w) - 4) + 'px'; if (r.left < 4) a.style.left = (p.x + (4 - r.left)) + 'px';
    if (r.top < 4) a.style.top = (p.y + (4 - r.top)) + 'px';
    setTimeout(function () { mark.innerHTML = ''; }, (st.card.wm.secs || 10) * 1000);
  }
  function checkMarks() {
    var c = st.card, now = Date.now(); if (!c) return;
    if (R.shouldShowMark(c.wmAt, now, st.seen)) { st.seen.add(c.wmAt); showMark(); }
    if (c.credit && R.shouldShowMark(c.credit.at, now, st.credited)) { st.credited.add(c.credit.at); showMark(); }
  }
  setInterval(checkMarks, 5000);

  // "View more": the streamer's tracker from the server's cache (one request per viewer, kept for 5 minutes)
  function loadMore() {
    ga('ext_view_more');
    var close = '<button type="button" class="ww-more ww-close">✕ Close</button>';
    more.classList.add('open');
    if (st.more && Date.now() - st.more.at < 300000) { more.innerHTML = close + R.renderMore(st.more.games); return; }
    more.innerHTML = close + '<p>Loading…</p>';
    fetch(SYNC + '/ext/more/' + encodeURIComponent(st.channelId)).then(function (r) { return r.ok ? r.json() : { games: [] }; }).catch(function () { return { games: [] }; })
      .then(function (j) { st.more = { at: Date.now(), games: j.games || [] }; more.innerHTML = close + R.renderMore(st.more.games); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b === toggle) { panel.classList.toggle('open'); if (panel.classList.contains('open')) ga('ext_open'); return; }
    var n = st.card ? (st.card.allies || []).length : 0;
    if (b.classList.contains('ww-prev')) { st.ally = (st.ally - 1 + n) % n; draw(); }
    else if (b.classList.contains('ww-next')) { st.ally = (st.ally + 1) % n; draw(); }
    else if (b.classList.contains('ww-close')) more.classList.remove('open');
    else if (b.dataset.more) loadMore(b.dataset.more);
  });

  if (mobile) panel.classList.add('open');
  draw();
  if (!T) return;
  T.configuration.onChanged(function () {
    var b = T.configuration.broadcaster;
    if (b && b.content) { try { take(JSON.parse(b.content)); } catch (e) {} }
  });
  T.listen('broadcast', function (target, type, msg) { try { take(JSON.parse(msg)); } catch (e) {} });
  T.onAuthorized(function (auth) { st.channelId = String(auth.channelId || ''); ga('ext_load'); });
}());
