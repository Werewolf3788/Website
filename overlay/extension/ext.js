/* Werewolf Twitch extension: viewer pages (video_overlay.html, mobile.html).
 * Gets the card from Twitch (broadcaster config on load, then broadcast messages), draws it with WWRender,
 * shows the watermark/credit when the card says so, and loads "View more" from Firestore on tap only. */
(function () {
  'use strict';
  var R = window.WWRender, T = window.Twitch && window.Twitch.ext;
  var mobile = document.body.classList.contains('mobile');
  var FIRESTORE = 'https://firestore.googleapis.com/v1/projects/entertainment-71888/databases/(default)/documents/user/';
  var PLATFORMS = ['playstation', 'steam', 'xbox', 'mobile', 'pc'];
  var st = { card: null, ally: 0, seen: new Set(), credited: new Set() };
  var root = document.getElementById('ww'), panel = document.getElementById('wwPanel'), mark = document.getElementById('wwMark'), more = document.getElementById('wwMore');
  var toggle = document.getElementById('wwToggle');
  function ga(name) { try { if (window.gtag) gtag('event', name, { view: mobile ? 'mobile' : 'overlay' }); } catch (e) {} }

  function draw() {
    root.innerHTML = st.card ? R.renderCard(st.card, { mobile: mobile, allyIndex: st.ally }) : '<p class="ww-wait">Waiting for the stream…</p>';
  }
  function take(card) {
    if (!card || !card.me) return;
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

  function loadMore(code) {
    ga('ext_view_more');
    more.innerHTML = '<button type="button" class="ww-more ww-close">✕ Close</button><p>Loading…</p>'; more.classList.add('open');
    Promise.all(PLATFORMS.map(function (p) {
      return fetch(FIRESTORE + encodeURIComponent(code) + '/platform/' + p + '/game?pageSize=50').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    })).then(function (lists) {
      var docs = []; lists.forEach(function (j) { docs = docs.concat(R.parseFirestoreDocs(j)); });
      more.innerHTML = '<button type="button" class="ww-more ww-close">✕ Close</button>' + R.renderMore(docs);
    });
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
  T.onAuthorized(function () { ga('ext_load'); });
}());
