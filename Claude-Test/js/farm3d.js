// Neighborly Acre: 3D co-op farm. Solo any time; friends can drop in via the same room.
// Signed in = everything lives in Firebase (never on the device). Guest = this device only.
import * as W from './world.js';
import * as C from './config.js';
const THREE = W.THREE, WW = window.WW, $ = id => document.getElementById(id);
const NT = W.COLS * W.ROWS;
const qs = new URLSearchParams(location.search);
const FORCE_HOUR = qs.get('time') !== null ? +qs.get('time') : null;      // debug: ?time=14.5
const FORCE_WX = qs.get('weather');                                       // debug: ?weather=rain | clear

// ------------------------------------------------------------ state
let me = null, myName = 'Farmer', myHue = Math.random(), roomRef = null, cloudCode = null;
let tiles = {}, players = {}, animals = {}, tractorState = { holder: null, x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: W.TRACTOR_HOME.ry };
let tool = 'hoe', saveTimer = null, toastTimer = null, lastDragAt = 0, avatars = {}, myAvatar = '';
const save = { coins: 100, xp: 0, seeds: { wheat: 30, carrot: 30 }, bag: {}, up: {}, skip: {}, orders: { day: -1, done: [] }, harvested: 0 };
const player = { x: 0, z: -1, ry: 0, speed: 0, driving: false };
const tractorLocal = { x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: W.TRACTOR_HOME.ry, speed: 0 };
const level = () => C.levelFromXp(save.xp);
const swath = () => save.up.wide ? 5 : 3;
const nowMs = () => WW.now();

function say(t) { $('toast').textContent = t || ''; clearTimeout(toastTimer); if (t) toastTimer = setTimeout(function () { $('toast').textContent = ''; }, 3800); }
function gate(text, opts) { opts = opts || {}; $('gateText').textContent = text; $('gateBtn').style.display = opts.signIn ? '' : 'none'; $('soloBtn').textContent = opts.back ? 'Back to hub' : 'Play solo instead'; $('soloBtn').onclick = function () { location.href = opts.back ? 'index.html' : 'farm.html'; }; $('soloBtn').style.display = opts.noButton ? 'none' : ''; $('gate').style.display = 'flex'; }
$('gateBtn').onclick = function () { WW.signIn(); };
WW.onError = function (m) { gate(m, { signIn: true }); };
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

// ------------------------------------------------------------ three.js scene
const canvas = $('c');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); } catch (e) { gate('Your browser could not start 3D graphics (WebGL). Try updating it or another browser.', { back: true }); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .3, 400);
scene.fog = new THREE.Fog(0x9ad0f0, 70, 190);
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6a3a, .9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 }); sun.shadow.bias = -.0006; scene.add(sun, sun.target);
const world = W.buildWorld(scene);
const field = W.makeCropField(scene, NT);
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

const tractor = W.makeTractor(); scene.add(tractor);
const farmer = W.makeFarmer(myHue); scene.add(farmer);
const pointer = new THREE.Mesh(new THREE.BoxGeometry(W.TILE - .2, .08, W.TILE - .2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthTest: false })); pointer.renderOrder = 5; pointer.visible = false; scene.add(pointer);

// rain: a field of falling streaks that follows the camera
const DROPS = 2200, rainPos = new Float32Array(DROPS * 6), rainSeed = new Float32Array(DROPS * 3);
for (let i = 0; i < DROPS; i++) { rainSeed[i * 3] = (Math.random() - .5) * 60; rainSeed[i * 3 + 1] = Math.random() * 34; rainSeed[i * 3 + 2] = (Math.random() - .5) * 60; }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb6cbe8, transparent: true, opacity: 0 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
let cloud = 0, rainT = 0;
function updateRain(dt, raining) {
  cloud += ((raining ? 1 : 0) - cloud) * Math.min(1, dt * .6); rain.visible = cloud > .02; rain.material.opacity = Math.min(.6, cloud * .6);
  if (!rain.visible) return; rainT += dt;
  for (let i = 0; i < DROPS; i++) {
    const y = ((rainSeed[i * 3 + 1] - rainT * 26) % 34 + 34) % 34, x = rainSeed[i * 3] + camera.position.x, z = rainSeed[i * 3 + 2] + camera.position.z;
    rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z; rainPos[i * 6 + 3] = x - .06; rainPos[i * 6 + 4] = y + .7; rainPos[i * 6 + 5] = z;
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------ real-time sky (device clock) + shared rain
function isRaining() { return FORCE_WX === 'rain' ? true : FORCE_WX === 'clear' ? false : C.isRaining(nowMs()); }
function localDate() { const d = new Date(); if (FORCE_HOUR !== null) { d.setHours(Math.floor(FORCE_HOUR), Math.round((FORCE_HOUR % 1) * 60), 0, 0); } return d; }
function updateSky() {
  const d = localDate(), s = C.skyAt(d), st = C.sunTimes(d), k = s.day, wet = cloud;
  const sky = new THREE.Color(0x14204a).lerp(new THREE.Color(0x8fcdf2), k).lerp(new THREE.Color(0xff9a5a), Math.min(.65, s.twilight * (s.elev > -.2 ? 1 : 0)))
    .lerp(new THREE.Color(k > .3 ? 0x6c7683 : 0x0f1626), wet * .75);
  scene.background = sky; scene.fog.color.copy(sky); scene.fog.near = 70 - 45 * wet; scene.fog.far = 190 - 80 * wet;
  const dim = 1 - .5 * wet; sun.intensity = (.5 + 1.0 * k) * dim; hemi.intensity = (.55 + .45 * k) * (1 - .25 * wet);
  sun.color.set(k < .01 ? 0x7f95d8 : (k < .5 ? 0xffc28a : 0xfff1d0));
  let dir;
  if (s.elev > 0) { const a = Math.PI * (s.hours - st.rise) / st.len; dir = new THREE.Vector3(Math.cos(a) * 55, Math.max(14, Math.sin(a) * 70), 30); } else dir = new THREE.Vector3(-20, 45, 25);
  sun.position.set(camera.position.x * .85 + dir.x, dir.y, camera.position.z * .85 + dir.z); sun.target.position.set(camera.position.x * .85, 0, camera.position.z * .85);
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), nr = C.nextRainStart(nowMs());
  $('wx').textContent = (isRaining() ? '🌧️ Raining · ' : (s.elev > 0 ? '☀️ ' : '🌙 ')) + t + (!isRaining() && nr ? ' · rain in ' + (nr - nowMs() > 36e5 ? Math.floor((nr - nowMs()) / 36e5) + 'h ' + Math.floor((nr - nowMs()) % 36e5 / 6e4) + 'm' : Math.max(1, Math.floor((nr - nowMs()) / 6e4)) + 'm') : '');
}

// ------------------------------------------------------------ tiles / crops
const tilePos = i => ({ x: W.FX0 + (i % W.COLS) * W.TILE + W.TILE / 2, z: W.FZ0 + Math.floor(i / W.COLS) * W.TILE + W.TILE / 2 });
function tileAt(x, z) { const cx = Math.floor((x - W.FX0) / W.TILE), cz = Math.floor((z - W.FZ0) / W.TILE); return (cx < 0 || cz < 0 || cx >= W.COLS || cz >= W.ROWS) ? -1 : cz * W.COLS + cx; }
function progress(t, now) { return (!t || t.k !== 'c' || !t.w) ? 0 : Math.min(1, ((now || nowMs()) - t.w) / C.CROPS[t.c].grow); }
function refreshField() {
  const now = nowMs(); let growing = 0, ready = 0, dry = 0, next = Infinity;
  for (let i = 0; i < NT; i++) {
    const t = tiles[i], p = tilePos(i);
    if (!t) { field.set(i, p.x, p.z, false); continue; }
    if (t.k === 't') { field.set(i, p.x, p.z, true, false, null); continue; }
    const pr = progress(t, now), wet = !!t.w;
    field.set(i, p.x, p.z, true, wet, t.c, wet ? .18 + .82 * pr : .12, pr >= 1);
    if (!wet) dry++; else if (pr >= 1) ready++; else { growing++; next = Math.min(next, C.CROPS[t.c].grow * (1 - pr)); }
  }
  field.commit();
  const bits = []; if (growing) bits.push('🌱' + growing); if (ready) bits.push('✅' + ready); if (dry) bits.push('💧' + dry);
  $('cropInfo').textContent = bits.length ? bits.join(' ') + (next < Infinity ? ' · next ' + C.fmtTime(next) : '') : 'Field empty';
}
// rain waters every dry crop (also retroactively, if it rained while nobody was online)
function rainTick() {
  if (!roomRef) return; const now = nowMs();
  Object.keys(tiles).forEach(function (k) {
    const t = tiles[k]; if (!t || t.k !== 'c' || t.w) return;
    let rt = FORCE_WX === 'rain' ? now : C.firstRainBetween(t.p || now, now); if (rt === null || rt > now) return;
    roomRef.child('tiles/' + k + '/w').transaction(function (cur) { return cur ? undefined : rt; });
  });
}

// ------------------------------------------------------------ economy helpers
function flushSave() { clearTimeout(saveTimer); if (me) WW.writeSave('farm', JSON.parse(JSON.stringify(save))); }
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1200); }
document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); }); window.addEventListener('pagehide', flushSave);
function setCoins(d) { save.coins = Math.max(0, save.coins + d); hud(); queueSave(); }
function addItem(id, n) { save.bag[id] = (save.bag[id] || 0) + n; if (save.bag[id] <= 0) delete save.bag[id]; queueSave(); }
function addXp(n) { const old = level(); save.xp += n; if (level() > old) { say('🎉 Level ' + level() + '! New crops, animals or upgrades may be unlocked.'); buildSeedBar(); } hud(); queueSave(); }
function hud() {
  $('coins').textContent = save.coins; const l = level(), lo = C.xpForLevel(l), hi = C.xpForLevel(l + 1);
  $('lvl').textContent = l; $('xpTxt').textContent = (save.xp - lo) + '/' + (hi - lo) + ' xp';
}
let burst = 0, burstT = null;
function harvestedToast(crop) { burst++; clearTimeout(burstT); burstT = setTimeout(function () { say('🧺 Harvested ' + burst + ' · in your bag (sell at the barn)'); burst = 0; }, 500); }

// ------------------------------------------------------------ planting mix: seeds you own are spread evenly across the field
//   1 kind of seed -> the whole field, 2 kinds -> 50/50, 3 kinds -> thirds ... (split by column bands)
function plantables() { return C.CROP_IDS.filter(function (id) { return level() >= C.CROPS[id].level && (save.seeds[id] || 0) > 0 && !save.skip[id]; }); }
function cropForTile(i) { const list = plantables(); if (!list.length) return null; const col = i % W.COLS, row = Math.floor(i / W.COLS), k = col * W.ROWS + row; return list[Math.min(list.length - 1, Math.floor(k * list.length / NT))]; }   // column-major order: exact 1/n shares
function mixText() { const l = plantables(); return l.length ? 'Planting mix: ' + l.map(function (id) { return C.CROPS[id].icon + Math.round(100 / l.length) + '%'; }).join(' ') : 'No seeds selected, buy a pack at the barn'; }

// ------------------------------------------------------------ tile actions (on foot, or automatically from the tractor)
let clearConfirm = { i: -1, until: 0 };
function actTile(i, quiet) {
  if (i < 0 || !roomRef) return; const cur = tiles[i], ref = roomRef.child('tiles/' + i), now = nowMs();
  if (tool === 'hoe') {
    if (!cur) ref.set({ k: 't' });
    else if (!quiet) {
      if (cur.k === 't') ref.remove();
      else if (clearConfirm.i === i && performance.now() < clearConfirm.until) { ref.set({ k: 't' }); clearConfirm.i = -1; say('Crop removed.'); }
      else { clearConfirm = { i: i, until: performance.now() + 2500 }; say('Press again to dig up this ' + C.CROPS[cur.c].name.toLowerCase() + ' (it will be lost).'); }
    }
  } else if (tool === 'water') {
    if (cur && cur.k === 'c' && !cur.w) ref.child('w').set(now); else if (!quiet) say(cur && cur.k === 'c' ? 'Already watered.' : 'Nothing to water here.');
  } else if (tool === 'harvest') {
    if (!cur || cur.k !== 'c') { if (!quiet) say('Nothing to harvest.'); return; }
    ref.transaction(function (c) { return (c && c.k === 'c' && progress(c) >= 1) ? { k: 't' } : undefined; }, function (err, ok) {
      if (ok) { addItem(cur.c, 1); save.harvested++; addXp(C.cropXp(cur.c)); if (quiet) harvestedToast(cur.c); else say('Harvested ' + C.CROPS[cur.c].name.toLowerCase() + '! In your bag.'); }
      else if (!quiet) say('Not ready yet (' + C.fmtTime(C.CROPS[cur.c].grow * (1 - progress(cur))) + ' left' + (cur.w ? '' : ', needs water') + ').');
    });
  } else if (tool === 'seed') {
    if (!cur || cur.k !== 't') { if (!quiet) say(cur ? 'Something is already growing there.' : 'Plow the soil first.'); return; }
    const pick = cropForTile(i);
    if (!pick) { if (!quiet || !outWarn()) say('No seeds to plant. Buy a pack at the barn (or switch a seed back on).'); return; }
    save.seeds[pick]--; hud(); queueSave(); buildSeedBar(); ref.set({ k: 'c', c: pick, p: now, w: 0 });
  }
}
let lastOut = 0; function outWarn() { const n = performance.now(); if (n - lastOut < 4000) return true; lastOut = n; return false; }
const cool = {};
function tractorAuto() {
  if (Math.abs(tractorLocal.speed) < .5) return;
  const fx = Math.sin(tractorLocal.ry), fz = Math.cos(tractorLocal.ry), rx = fz, rz = -fx, now = performance.now(), n = swath(), half = (n - 1) / 2;
  for (let s = -half; s <= half; s++) {
    const x = tractorLocal.x - fx * 2.4 + rx * s * W.TILE, z = tractorLocal.z - fz * 2.4 + rz * s * W.TILE, i = tileAt(x, z);
    if (i < 0 || (cool[i] || 0) > now) continue; cool[i] = now + 900; actTile(i, true);
  }
}

// ------------------------------------------------------------ animals
const animalViews = {}, penOf = t => C.ANIMALS[t].pen === 'chicken' ? W.CHICKEN_PEN : W.COW_PASTURE;
function syncAnimals() {
  Object.keys(animals).forEach(function (id) {
    if (animalViews[id]) return; const a = animals[id], def = C.ANIMALS[a.t]; if (!def) return;
    const m = W.makeAnimal(a.t), p = penOf(a.t); m.position.set(p.x0 + 1 + Math.random() * (p.x1 - p.x0 - 2), 0, p.z0 + 1 + Math.random() * (p.z1 - p.z0 - 2)); scene.add(m);
    animalViews[id] = { mesh: m, tx: m.position.x, tz: m.position.z, wait: Math.random() * 3 };
  });
  Object.keys(animalViews).forEach(function (id) { if (!animals[id]) { scene.remove(animalViews[id].mesh); delete animalViews[id]; } });
}
function updateAnimals(dt) {
  const now = nowMs();
  Object.keys(animalViews).forEach(function (id) {
    const v = animalViews[id], a = animals[id]; if (!a) return; const p = penOf(a.t), m = v.mesh, sp = m.userData.speed;
    const dx = v.tx - m.position.x, dz = v.tz - m.position.z, d = Math.hypot(dx, dz);
    if (d < .3) { v.wait -= dt; if (v.wait <= 0) { v.tx = p.x0 + 1 + Math.random() * (p.x1 - p.x0 - 2); v.tz = p.z0 + 1 + Math.random() * (p.z1 - p.z0 - 2); v.wait = 1 + Math.random() * 4; } }
    else { m.position.x += dx / d * sp * dt; m.position.z += dz / d * sp * dt; m.rotation.y = Math.atan2(dx, dz); m.position.y = a.t === 'chicken' ? Math.abs(Math.sin(performance.now() / 120)) * .05 : 0; }
    const ready = now >= (a.r || 0); m.userData.icon.visible = ready; if (ready) m.userData.icon.rotation.y += dt * 2;
  });
}
function nearestReadyAnimal() {
  let best = null, bd = 4.2; const now = nowMs();
  Object.keys(animalViews).forEach(function (id) { const a = animals[id]; if (!a || now < (a.r || 0)) return; const m = animalViews[id].mesh, d = Math.hypot(m.position.x - player.x, m.position.z - player.z); if (d < bd) { bd = d; best = id; } });
  return best;
}
function collect(id) {
  const a = animals[id]; if (!a) return; const def = C.ANIMALS[a.t];
  roomRef.child('animals/' + id + '/r').transaction(function (r) { return nowMs() >= (r || 0) ? nowMs() + def.every : undefined; }, function (e, ok) {
    if (ok) { addItem(def.prod, 1); addXp(Math.max(1, Math.round(C.GOODS[def.prod].sell / 3))); say(C.GOODS[def.prod].icon + ' Collected ' + def.prod + ' — in your bag.'); } else say('Not ready yet.');
  });
}

// ------------------------------------------------------------ barn: seeds / sell / kitchen / animals / orders / upgrades
let shopTab = 'seeds';
const TABS = [['seeds', '🌱 Seeds'], ['sell', '💰 Sell'], ['kitchen', '🍳 Kitchen'], ['animals', '🐔 Animals'], ['orders', '📋 Orders'], ['upgrades', '🚜 Tractor']];
const nearShop = () => Math.hypot(player.x - W.SHOP_POS.x, player.z - W.SHOP_POS.z) < 6;
const today = () => C.dayNumber(nowMs());
function counts() { const c = {}; Object.keys(C.ANIMALS).forEach(function (k) { c[k] = 0; }); Object.keys(animals).forEach(function (id) { if (c[animals[id].t] !== undefined) c[animals[id].t]++; }); return c; }
function row(html, buttons) { const r = document.createElement('div'); r.className = 'item'; r.innerHTML = '<div>' + html + '</div>'; const b = document.createElement('div'); b.className = 'btns'; (buttons || []).forEach(function (x) { const el = document.createElement('button'); el.className = 'b'; el.textContent = x.t; el.disabled = !!x.off; el.onclick = function () { x.f(); renderShop(); }; b.appendChild(el); }); r.appendChild(b); return r; }
function renderShop() {
  const tabs = $('shopTabs'); tabs.innerHTML = '';
  TABS.forEach(function (t) { const b = document.createElement('button'); b.textContent = t[1]; b.className = t[0] === shopTab ? 'sel' : ''; b.onclick = function () { shopTab = t[0]; renderShop(); }; tabs.appendChild(b); });
  const box = $('shopItems'), l = level(), d = today(); box.innerHTML = '<div class="item" style="border:0;padding-top:0"><div>🪙 <b>' + save.coins + '</b> · Level <b>' + l + '</b></div></div>';
  if (!nearShop() && shopTab !== 'seeds') box.innerHTML += '<div class="item" style="border:0;color:#fbbf24">Walk to the barn door to trade. You can still look around.</div>';
  const can = nearShop();
  if (shopTab === 'seeds') {
    box.innerHTML += '<div class="item" style="border:0"><small>One pack plants many tiles. A field pack covers the whole field. Every kind of seed you own is spread evenly across the field: one kind = all of it, two = half and half, three = thirds.</small></div>';
    C.CROP_IDS.forEach(function (id) {
      const c = C.CROPS[id], lock = l < c.level, price = C.priceOf(id, d);
      box.appendChild(row(c.icon + ' <b>' + c.name + '</b> <small>' + (lock ? 'Unlocks at level ' + c.level : 'sells ~' + price + '🪙 each · ' + c.grow / 60000 + ' min to grow · you have ' + (save.seeds[id] || 0) + ' seeds') + '</small>',
        lock ? [{ t: '🔒 Lv ' + c.level, off: true, f: function () {} }] : C.PACKS.map(function (n) { const cost = C.packPrice(id, n); return { t: (n === C.FIELD_TILES ? 'Field ' : '×') + n + ' · ' + cost + '🪙', off: !can || save.coins < cost, f: function () { if (save.coins < cost) return; setCoins(-cost); save.seeds[id] = (save.seeds[id] || 0) + n; hud(); queueSave(); buildSeedBar(); say('Bought ' + n + ' ' + c.name.toLowerCase() + ' seeds.'); } }; })));
    });
  } else if (shopTab === 'sell') {
    const ids = Object.keys(save.bag); if (!ids.length) box.innerHTML += '<div class="item"><div>Your bag is empty. Harvest crops and collect eggs, milk and wool.</div></div>';
    let total = 0; ids.forEach(function (id) { total += (save.bag[id] || 0) * C.priceOf(id, d); });
    ids.forEach(function (id) {
      const g = C.GOODS[id], n = save.bag[id], p = C.priceOf(id, d), base = g.sell, arrow = p > base ? '▲' : p < base ? '▼' : '';
      box.appendChild(row(g.icon + ' <b>' + g.name + '</b> ×' + n + ' <small>today ' + p + '🪙 each ' + arrow + '</small>', [{ t: 'Sell 1', off: !can, f: function () { sell(id, 1); } }, { t: 'Sell all', off: !can, f: function () { sell(id, n); } }]));
    });
    if (ids.length) box.appendChild(row('<b>Sell everything</b> <small>' + total + '🪙 total</small>', [{ t: 'Sell all', off: !can, f: function () { ids.slice().forEach(function (id) { sell(id, save.bag[id], true); }); say('Sold everything for ' + total + ' 🪙'); } }]));
  } else if (shopTab === 'kitchen') {
    C.RECIPES.forEach(function (r) {
      const g = C.GOODS[r.id], lock = l < r.level, have = Object.keys(r.needs).every(function (k) { return (save.bag[k] || 0) >= r.needs[k]; });
      const need = Object.keys(r.needs).map(function (k) { return r.needs[k] + '× ' + C.GOODS[k].icon + ' (' + (save.bag[k] || 0) + ')'; }).join(' + ');
      box.appendChild(row(g.icon + ' <b>' + g.name + '</b> <small>' + (lock ? 'Unlocks at level ' + r.level : need + ' · worth ~' + C.priceOf(r.id, d) + '🪙') + '</small>',
        [{ t: lock ? '🔒' : 'Make', off: lock || !have || !can, f: function () { Object.keys(r.needs).forEach(function (k) { addItem(k, -r.needs[k]); }); addItem(r.id, 1); addXp(5); say('Made ' + g.name.toLowerCase() + '!'); } }]));
    });
  } else if (shopTab === 'animals') {
    const c = counts();
    Object.keys(C.ANIMALS).forEach(function (k) {
      const a = C.ANIMALS[k], lock = l < a.level;
      box.appendChild(row(a.icon + ' <b>' + a.name + '</b> (' + c[k] + '/' + a.max + ') <small>' + (lock ? 'Unlocks at level ' + a.level : 'gives ' + a.prod + ' every ' + a.every / 60000 + ' min') + '</small>',
        [{ t: lock ? '🔒 Lv ' + a.level : a.cost + ' 🪙', off: lock || !can || c[k] >= a.max || save.coins < a.cost, f: function () { if (save.coins < a.cost || counts()[k] >= a.max) return; setCoins(-a.cost); roomRef.child('animals/' + Date.now().toString(36) + Math.floor(Math.random() * 99)).set({ t: k, r: nowMs() + a.every }); say('Bought a ' + a.name.toLowerCase() + '!'); } }]));
    });
  } else if (shopTab === 'orders') {
    if (save.orders.day !== d) { save.orders = { day: d, done: [] }; queueSave(); }
    C.ordersFor(d, l).forEach(function (o, k) {
      const g = C.GOODS[o.item], done = save.orders.done[k], have = (save.bag[o.item] || 0) >= o.qty;
      box.appendChild(row('📋 <b>' + o.qty + '× ' + g.name + '</b> ' + g.icon + ' <small>reward ' + o.reward + '🪙 + ' + o.xp + ' xp · you have ' + (save.bag[o.item] || 0) + '</small>',
        [{ t: done ? '✅ Done' : 'Deliver', off: done || !have || !can, f: function () { addItem(o.item, -o.qty); setCoins(o.reward); addXp(o.xp); save.orders.done[k] = true; say('Order complete! +' + o.reward + ' 🪙'); } }]));
    });
    box.innerHTML += '<div class="item" style="border:0"><small>New orders arrive every day (UTC midnight). Big orders are where a tractor really pays off.</small></div>';
  } else if (shopTab === 'upgrades') {
    Object.keys(C.UPGRADES).forEach(function (k) {
      const u = C.UPGRADES[k], has = save.up[k], lock = l < u.level;
      box.appendChild(row('🚜 <b>' + u.name + '</b> <small>' + u.desc + (lock ? ' · unlocks at level ' + u.level : '') + '</small>',
        [{ t: has ? '✅ Owned' : lock ? '🔒 Lv ' + u.level : u.cost + ' 🪙', off: has || lock || !can || save.coins < u.cost, f: function () { setCoins(-u.cost); save.up[k] = 1; say(u.name + ' installed!'); applyImplement(); queueSave(); } }]));
    });
    box.innerHTML += '<div class="item" style="border:0"><small>Drive the tractor over your field: it plows, plants, waters or harvests ' + swath() + ' tiles at once, whichever tool you have selected.</small></div>';
  }
}
function sell(id, n, quiet) { n = Math.min(n, save.bag[id] || 0); if (n < 1) return; const p = C.priceOf(id, today()) * n; addItem(id, -n); setCoins(p); addXp(Math.round(n / 2)); if (!quiet) say('Sold ' + n + ' ' + C.GOODS[id].name.toLowerCase() + ' for ' + p + ' 🪙'); }
function openShop(tab) { if (tab) shopTab = tab; renderShop(); $('shop').style.display = 'flex'; }
$('shopClose').onclick = function () { $('shop').style.display = 'none'; };
$('bagBtn').onclick = function () { openShop('sell'); };

// ------------------------------------------------------------ toolbar
const TOOLS = [{ id: 'hoe', label: '⛏️ Plow', color: 0x8a6a4a }, { id: 'water', label: '💧 Water', color: 0x4aa3ff }, { id: 'harvest', label: '🧺 Harvest', color: 0xf2c200 }, { id: 'seed', label: '🌱 Plant', color: 0x6abf4b }];
const bar = $('bar'), seedBar = $('seedBar');
TOOLS.forEach(function (t) { const b = document.createElement('button'); b.textContent = t.label; b.dataset.id = t.id; b.onclick = function () { setTool(t.id); }; bar.appendChild(b); });
function applyImplement() {
  const t = TOOLS.filter(function (x) { return x.id === tool; })[0]; W.setImplement(tractor, t.color); tractor.userData.impl.scale.x = swath() / 3;
}
function setTool(id) { tool = id; [].forEach.call(bar.children, function (b) { b.classList.toggle('sel', b.dataset.id === id); }); seedBar.style.display = id === 'seed' ? '' : 'none'; applyImplement(); }
function buildSeedBar() {
  seedBar.innerHTML = ''; const mix = document.createElement('span'); mix.className = 'mix'; mix.textContent = mixText(); seedBar.appendChild(mix);
  C.CROP_IDS.forEach(function (id) {
    const c = C.CROPS[id], lock = level() < c.level, n = save.seeds[id] || 0, on = !lock && n > 0 && !save.skip[id], b = document.createElement('button'); b.dataset.id = id;
    b.className = (lock || n === 0 ? 'lock ' : '') + (on ? 'sel' : ''); b.textContent = c.icon + ' ×' + n + (lock ? ' 🔒' + c.level : '');
    b.onclick = function () { if (lock) { say(c.name + ' unlocks at level ' + c.level + '.'); return; } if (n === 0) { say('No ' + c.name.toLowerCase() + ' seeds. Buy a pack at the barn.'); return; } save.skip[id] = save.skip[id] ? 0 : 1; if (!save.skip[id]) delete save.skip[id]; queueSave(); buildSeedBar(); };
    seedBar.appendChild(b);
  });
}
setTool('hoe'); buildSeedBar();

// ------------------------------------------------------------ input
const keys = {}; let yaw = Math.PI, pitch = .42, dist = 10, joy = { x: 0, y: 0 };
window.addEventListener('keydown', function (e) {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return; const k = e.key.toLowerCase();
  if (k >= '1' && k <= '4') { setTool(TOOLS[+k - 1].id); return; }
  if (k === 'b') { openShop('sell'); return; }
  if (k === 'e' || k === ' ') { e.preventDefault(); if (!e.repeat) useAction(); return; }
  if (k === 'escape') $('shop').style.display = 'none';
  keys[k] = true; if (k.indexOf('arrow') === 0) e.preventDefault();
});
window.addEventListener('keyup', function (e) { delete keys[e.key.toLowerCase()]; });
let drag = null;
canvas.addEventListener('pointerdown', function (e) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; lastDragAt = performance.now(); yaw -= (e.clientX - drag.x) * .006; pitch = Math.max(.12, Math.min(1.2, pitch + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; });
canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
canvas.addEventListener('wheel', function (e) { dist = Math.max(5, Math.min(24, dist + e.deltaY * .01)); }, { passive: true });
const joyEl = $('joy'), knob = $('knob'); let joyId = null;
function joyMove(e) { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / 50, dy = (e.clientY - cy) / 50; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; knob.style.transform = 'translate(' + dx * 40 + 'px,' + dy * 40 + 'px)'; }
joyEl.addEventListener('pointerdown', function (e) { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
joyEl.addEventListener('pointermove', function (e) { if (e.pointerId === joyId) joyMove(e); });
['pointerup', 'pointercancel'].forEach(function (n) { joyEl.addEventListener(n, function (e) { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } }); });
$('useBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); useAction(); });

// ------------------------------------------------------------ interaction
const facingTile = () => tileAt(player.x + Math.sin(player.ry) * 1.9, player.z + Math.cos(player.ry) * 1.9);
function toolLabel() { return tool === 'seed' ? 'Plant' : TOOLS.filter(function (t) { return t.id === tool; })[0].label.replace(/^\S+ /, ''); }
function tileInfo(i) {
  const t = tiles[i]; if (!t) return 'Grass'; if (t.k === 't') return 'Plowed soil'; const c = C.CROPS[t.c], p = progress(t);
  return c.icon + ' ' + c.name + ' — ' + (!t.w ? 'waiting for water or rain' : p >= 1 ? 'ready to harvest!' : Math.round(p * 100) + '% · ' + C.fmtTime(c.grow * (1 - p)) + ' left');
}
function context() {
  if (player.driving) return { kind: 'exit', text: 'Exit tractor (E)', info: toolLabel() + ' · ' + swath() + ' tiles wide' + (tool === 'seed' ? ' · ' + mixText() : '') };
  const id = nearestReadyAnimal(); if (id) return { kind: 'collect', id: id, text: 'Collect ' + C.ANIMALS[animals[id].t].prod + ' (E)' };
  if (nearShop()) return { kind: 'shop', text: 'Open the barn (E)', info: 'Buy seeds · sell goods · orders · upgrades' };
  if (tractorState.holder === null || tractorState.holder === me.uid) { const tx = tractorState.holder === me.uid ? tractorLocal.x : tractorState.x, tz = tractorState.holder === me.uid ? tractorLocal.z : tractorState.z; if (Math.hypot(player.x - tx, player.z - tz) < 4) return { kind: 'drive', text: 'Drive tractor (E)' }; }
  const i = facingTile(); if (i >= 0) return { kind: 'tile', i: i, text: toolLabel() + ' (E)', info: tool === 'seed' ? mixText() + ' · ' + tileInfo(i) : tileInfo(i) };
  return null;
}
function useAction() {
  if (!me || $('shop').style.display === 'flex') return; const c = context(); if (!c) return;
  if (c.kind === 'collect') collect(c.id);
  else if (c.kind === 'shop') openShop('seeds');
  else if (c.kind === 'tile') actTile(c.i, false);
  else if (c.kind === 'drive') {
    roomRef.child('tractor').transaction(function (t) { t = t || {}; return (!t.holder || t.holder === me.uid) ? { holder: me.uid, x: t.x === undefined ? W.TRACTOR_HOME.x : t.x, z: t.z === undefined ? W.TRACTOR_HOME.z : t.z, ry: t.ry || 0 } : undefined; },
      function (e, ok) { if (ok) { player.driving = true; tractorLocal.x = tractorState.x; tractorLocal.z = tractorState.z; tractorLocal.ry = tractorState.ry; tractorLocal.speed = 0; player.x = tractorLocal.x; player.z = tractorLocal.z; roomRef.child('tractor/holder').onDisconnect().remove(); say('Tractor: your tool works on ' + swath() + ' tiles at once. W/S drive, A/D steer.'); applyImplement(); } else say('Someone else is driving.'); });
  } else if (c.kind === 'exit') {
    player.driving = false; tractorLocal.speed = 0; player.x = tractorLocal.x + Math.cos(tractorLocal.ry) * 2.8; player.z = tractorLocal.z - Math.sin(tractorLocal.ry) * 2.8;
    roomRef.child('tractor').set({ holder: null, x: +tractorLocal.x.toFixed(2), z: +tractorLocal.z.toFixed(2), ry: +tractorLocal.ry.toFixed(3) });
  }
}

// ------------------------------------------------------------ other players
const remote = {};
function avatarFor(u) { return avatars[u] || ''; }
function syncRemotes() {
  const now = nowMs();
  Object.keys(players).forEach(function (u) {
    if (me && u === me.uid) return; const p = players[u]; if (now - (p.t || 0) > 45000) return; let r = remote[u];
    if (!r) { const m = W.makeFarmer(p.h || .3), lab = W.makeLabel(p.n || 'Friend', '#bae6fd'); lab.position.y = 4.5; m.add(lab); scene.add(m); r = remote[u] = { mesh: m }; m.position.set(p.x, 0, p.z); }
    r.tx = p.x; r.tz = p.z; r.try = p.r || 0; r.driving = !!p.v; W.setAvatar(r.mesh, avatarFor(u));
  });
  Object.keys(remote).forEach(function (u) { const p = players[u]; if (!p || now - (p.t || 0) > 45000) { scene.remove(remote[u].mesh); delete remote[u]; } });
  $('count').textContent = Math.max(1, Object.keys(remote).length + 1);
}
function updateRemotes(dt) {
  Object.keys(remote).forEach(function (u) {
    const r = remote[u], m = r.mesh, dx = r.tx - m.position.x, dz = r.tz - m.position.z, d = Math.hypot(dx, dz);
    m.position.x += dx * Math.min(1, dt * 10); m.position.z += dz * Math.min(1, dt * 10);
    let da = r.try - m.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; m.rotation.y += da * Math.min(1, dt * 10);
    m.visible = !r.driving; W.animateFarmer(m, d * 10 > .3 ? 4 : 0, dt);
  });
}
function remoteDriver() { const now = nowMs(), u = Object.keys(players).filter(function (u) { return players[u].v && u !== (me && me.uid) && now - (players[u].t || 0) < 45000; })[0]; return u ? remote[u] : null; }

// ------------------------------------------------------------ main loop
let last = performance.now(), lastSent = 0, lastBeat = 0, lastTrk = 0, camX = 0, camZ = 0, slow = 0;
function collide(p, rad) { W.COLLIDERS.forEach(function (c) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 0) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }); p.x = Math.max(-90, Math.min(90, p.x)); p.z = Math.max(-90, Math.min(90, p.z)); }
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000); last = ts;
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  if (player.driving) {
    const T = tractorLocal, top = save.up.fast ? 11.7 : 9; T.speed += (iz * top - T.speed) * Math.min(1, dt * 2.2);
    T.ry -= ix * dt * 1.5 * Math.max(-1, Math.min(1, T.speed / 3)); T.x += Math.sin(T.ry) * T.speed * dt; T.z += Math.cos(T.ry) * T.speed * dt;
    const p = { x: T.x, z: T.z }; collide(p, 2); T.x = p.x; T.z = p.z; player.x = T.x; player.z = T.z; player.ry = T.ry; player.speed = Math.abs(T.speed); tractorAuto();
  } else if (mag > .08) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), dx = fx * iz + rx * ix, dz = fz * iz + rz * ix, m = Math.hypot(dx, dz) || 1, sp = 6.2 * Math.min(1, mag);
    player.x += dx / m * sp * dt; player.z += dz / m * sp * dt; const p = { x: player.x, z: player.z }; collide(p, .6); player.x = p.x; player.z = p.z;
    let da = Math.atan2(dx, dz) - player.ry; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; player.ry += da * Math.min(1, dt * 14); player.speed = sp;
  } else player.speed = 0;
  farmer.visible = !player.driving; farmer.position.set(player.x, 0, player.z); farmer.rotation.y = player.ry; W.animateFarmer(farmer, player.speed, dt);
  const rd = remoteDriver();
  if (player.driving) { tractor.position.set(tractorLocal.x, 0, tractorLocal.z); tractor.rotation.y = tractorLocal.ry; }
  else if (rd) { tractor.position.set(rd.mesh.position.x, 0, rd.mesh.position.z); tractor.rotation.y = rd.mesh.rotation.y; }
  else { tractor.position.set(tractorState.x, 0, tractorState.z); tractor.rotation.y = tractorState.ry || 0; }
  const spin = (player.driving ? tractorLocal.speed : 0) * dt / .9; tractor.userData.wheels.forEach(function (w) { w.rotation.x += spin; });
  world.clouds.position.x += dt * .6; if (world.clouds.position.x > 140) world.clouds.position.x = -140;
  // chase camera: swing behind the farmer (or tractor) whenever they move forward or sideways; dragging overrides for a moment
  const heading = (player.driving ? Math.abs(tractorLocal.speed) > .4 : (player.speed > .5 && (iz > .1 || Math.abs(ix) > .35)));
  if (heading && performance.now() - lastDragAt > 1200) { let da = player.ry + Math.PI - yaw; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; yaw += da * Math.min(1, dt * (player.driving ? 4 : 2.4)); }
  const ty = player.driving ? 2.2 : 1.7, d = player.driving ? dist * 1.3 : dist;
  camX += (player.x - camX) * Math.min(1, dt * 8); camZ += (player.z - camZ) * Math.min(1, dt * 8);
  camera.position.set(camX + Math.sin(yaw) * Math.cos(pitch) * d, ty + Math.sin(pitch) * d, camZ + Math.cos(yaw) * Math.cos(pitch) * d); camera.lookAt(camX, ty, camZ);
  const c = me && context(); $('prompt').innerHTML = c ? '<span>' + c.text + (c.info ? '<small>' + c.info + '</small>' : '') + '</span>' : '';
  $('useBtn').textContent = c ? (c.kind === 'tile' ? 'Use' : c.kind === 'exit' ? 'Exit' : c.kind === 'drive' ? 'Drive' : c.kind === 'shop' ? 'Barn' : 'Collect') : 'Use';
  if (c && c.kind === 'tile') { const p = tilePos(c.i); pointer.position.set(p.x, .26, p.z); pointer.visible = true; } else pointer.visible = false;
  updateRain(dt, isRaining()); updateSky(); updateAnimals(dt); updateRemotes(dt);
  slow += dt; if (slow > .5) { slow = 0; refreshField(); }
  const now = performance.now();
  if (roomRef && me && now - lastSent > 100 && (player.speed > .1 || now - lastBeat > 8000)) { lastSent = lastBeat = now; roomRef.child('players/' + me.uid).set({ n: myName, x: +player.x.toFixed(2), z: +player.z.toFixed(2), r: +player.ry.toFixed(2), v: player.driving ? 1 : 0, h: +myHue.toFixed(2), t: firebase.database.ServerValue.TIMESTAMP }); }
  if (player.driving && now - lastTrk > 1500) { lastTrk = now; roomRef.child('tractor').set({ holder: me.uid, x: +tractorLocal.x.toFixed(2), z: +tractorLocal.z.toFixed(2), ry: +tractorLocal.ry.toFixed(3) }); }
  renderer.render(scene, camera); requestAnimationFrame(loop);
}

// ------------------------------------------------------------ start / join
$('shareBtn').onclick = function () {
  if (WW.mode !== 'cloud' || !cloudCode) { say('Sign in from the hub to get a code friends can use.'); return; }
  const url = location.origin + location.pathname + '?room=' + cloudCode;
  if (navigator.share) navigator.share({ title: 'Join my farm in Neighborly Acre', text: 'Farm code ' + cloudCode, url: url }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { say('Invite link copied!'); }); else say('Share this code: ' + cloudCode);
};
async function begin(user, myCode) {
  const roomCode = (qs.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), code = roomCode || (user ? myCode : null);
  if (user) {
    // Signed in: always Firebase, never the device. If Firebase refuses, say so instead of quietly saving locally.
    if (!code) { gate('Could not find your friend code. Open the hub once, then try again.', { back: true }); return; }
    try {
      roomRef = WW.roomRef(code); WW.mode = 'cloud'; const meta = (await roomRef.child('meta').once('value')).val();
      if (!meta) { if (code === myCode) await roomRef.child('meta').set({ host: (user.displayName || 'Farmer').split(' ')[0], created: firebase.database.ServerValue.TIMESTAMP }); else { gate('Farm ' + code + ' not found. Ask your friend to open their farm once first.', { back: true }); return; } }
      me = user; cloudCode = code; $('roomLabel').textContent = (code === myCode ? 'My farm' : 'Friend’s farm') + ' · ' + code;
    } catch (e) { console.warn(e); gate('Your online farm could not be opened (' + (e.code || e.message || 'permission denied') + '). The game database rules need to be published in Firebase — nothing is saved to this device while you are signed in.', { back: true }); return; }
  } else {
    if (roomCode) { gate('Sign in to join a friend’s farm.', { signIn: true }); return; }
    WW.useLocal(); roomRef = WW.roomRef('solo'); me = { uid: 'local' }; $('roomLabel').textContent = 'Guest · this device';
  }
  $('gate').style.display = 'none'; myName = ((user && user.displayName) || 'Farmer').split(' ')[0].slice(0, 12);
  try {
    const s = await WW.loadSave('farm');
    if (s) { save.coins = s.coins | 0; save.xp = s.xp | 0; save.seeds = s.seeds || { wheat: 0 }; save.bag = s.bag || {}; save.up = s.up || {}; save.orders = s.orders || { day: -1, done: [] }; save.harvested = s.harvested | 0;
      // legacy saves (before levels) kept only coins
      if (s.xp === undefined && s.seeds === undefined) { save.seeds = { wheat: 30, carrot: 30 }; } save.skip = s.skip || {}; }
  } catch (e) { console.warn(e); gate('Your saved progress could not be loaded (' + (e.code || e.message) + '). Nothing was changed.', { back: true }); return; }
  if (user) { try { myAvatar = (await WW.db.ref('users/' + WW.emailKey(user.email) + '/avatar_url').once('value')).val() || user.photoURL || ''; } catch (e) { myAvatar = user.photoURL || ''; } }
  if (myAvatar) { W.setAvatar(farmer, myAvatar); roomRef.child('avatars/' + me.uid).set(myAvatar); }
  hud(); buildSeedBar(); applyImplement();
  roomRef.child('avatars').on('value', function (snap) { avatars = snap.val() || {}; syncRemotes(); });
  roomRef.child('tiles').on('value', function (snap) { const v = snap.val() || {}; tiles = {}; Object.keys(v).forEach(function (k) { tiles[+k] = v[k]; }); refreshField(); });
  roomRef.child('animals').on('value', function (snap) { animals = snap.val() || {}; syncAnimals(); });
  roomRef.child('tractor').on('value', function (snap) { tractorState = Object.assign({ holder: null, x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: W.TRACTOR_HOME.ry }, snap.val() || {}); if (tractorState.holder === undefined) tractorState.holder = null; });
  roomRef.child('players').on('value', function (snap) { players = snap.val() || {}; syncRemotes(); });
  setInterval(syncRemotes, 5000); setInterval(rainTick, 3000); setInterval(function () { if ($('shop').style.display === 'flex') renderShop(); }, 2000);
  roomRef.child('players/' + me.uid).onDisconnect().remove();
  say(WW.mode === 'cloud' ? 'Share your code so friends can drop in any time. Pick a tool, face a tile, press E.' : 'Welcome! Face grass, pick Plow, press E. Then Plant. Sign in from the hub for online saves and friends.');
  requestAnimationFrame(loop);
}
let started = false, startedAsUser = false;
WW.onReady(function (user, code) {
  if (started) { if (!!user !== startedAsUser) location.reload(); return; }
  started = true; startedAsUser = !!user;
  begin(user, code).catch(function (e) { console.error(e); gate('Could not start: ' + (e.message || e), { back: true }); });
});
window.__farm = { player: player, tractorLocal: tractorLocal, setTool: setTool, save: save, openShop: openShop, rainTick: rainTick, get tiles() { return tiles; }, get animals() { return animals; }, useAction: useAction, setSkip: function (id, v) { if (v) save.skip[id] = 1; else delete save.skip[id]; buildSeedBar(); }, cropForTile: cropForTile, plantables: plantables, get yaw() { return yaw; }, get avatars() { return avatars; }, get avatarOn() { return !!farmer.userData.avatar && !!farmer.userData.badge; }, faceCamera: function () { player.ry = yaw; } };
