// Neighborly Acre: 3D co-op farm. Solo any time; friends can drop in via the same room (Firebase RTDB or local device).
import * as W from './world.js';
const THREE = W.THREE, WW = window.WW, $ = id => document.getElementById(id);

const CROPS = {
  wheat: { grow: 60000, cost: 5, sell: 12, color: 0xe6c84a, label: '🌾 Wheat 5' },
  carrot: { grow: 45000, cost: 4, sell: 10, color: 0xf08a24, label: '🥕 Carrot 4' },
  corn: { grow: 90000, cost: 8, sell: 22, color: 0xf2d21b, label: '🌽 Corn 8' }
};
const ANIMALS = { chicken: { cost: 40, max: 8, every: 45000, pay: 8, name: 'Chicken', icon: '🐔', prod: 'egg', pen: W.CHICKEN_PEN }, cow: { cost: 120, max: 4, every: 90000, pay: 15, name: 'Cow', icon: '🐄', prod: 'milk', pen: W.COW_PASTURE } };
const TOOLS = [{ id: 'hoe', label: '⛏️ Plow', color: 0x8a6a4a }, { id: 'water', label: '💧 Water', color: 0x4aa3ff }, { id: 'harvest', label: '🧺 Harvest', color: 0xf2c200 },
  { id: 'wheat', label: CROPS.wheat.label, color: CROPS.wheat.color }, { id: 'carrot', label: CROPS.carrot.label, color: CROPS.carrot.color }, { id: 'corn', label: CROPS.corn.label, color: CROPS.corn.color }];

// ------------------------------------------------------------ state
let me = null, myName = 'Farmer', myHue = Math.random(), roomRef = null, cloudCode = null;
let tiles = {}, players = {}, animals = {}, tractorState = { holder: null, x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: 0 };
let tool = 'hoe', save = { coins: 100, harvested: 0, eggs: 0, milk: 0 }, saveTimer = null, toastTimer = null;
const player = { x: 0, z: -1, ry: 0, speed: 0, driving: false, tvx: 0 };
const tractorLocal = { x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: 0, speed: 0 };

function say(t) { $('toast').textContent = t || ''; clearTimeout(toastTimer); if (t) toastTimer = setTimeout(function () { $('toast').textContent = ''; }, 3500); }
function gate(text, showSignIn) { $('gateText').textContent = text; $('gateBtn').style.display = showSignIn ? '' : 'none'; $('gate').style.display = 'flex'; }
$('gateBtn').onclick = function () { WW.signIn(); }; $('soloBtn').onclick = function () { location.href = 'farm.html'; };
WW.onError = function (m) { gate(m, true); };
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

// ------------------------------------------------------------ three.js scene
const canvas = $('c');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); } catch (e) { gate('Your browser could not start 3D graphics (WebGL). Try updating it or another browser.', false); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .3, 400);
scene.fog = new THREE.Fog(0x9ad0f0, 70, 190);
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6a3a, .9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 }); sun.shadow.bias = -.0006; scene.add(sun, sun.target);
const world = W.buildWorld(scene);
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

const tractor = W.makeTractor(); scene.add(tractor);
const farmer = W.makeFarmer(myHue); scene.add(farmer);
const pointer = new THREE.Mesh(new THREE.BoxGeometry(W.TILE - .2, .08, W.TILE - .2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthTest: false })); pointer.renderOrder = 5; pointer.visible = false; scene.add(pointer);

// sky/day cycle (shared by server time so friends see the same time of day)
const DAY_MS = 8 * 60 * 1000;
const FORCE_T = new URLSearchParams(location.search).get('time'); // debug: ?time=0.4 freezes the clock (0..1)
function updateSky() {
  // 80% of the cycle is daylight, 20% is a gentle night; shared by server time so friends see the same sky
  const u = FORCE_T !== null ? +FORCE_T : (WW.now() % DAY_MS) / DAY_MS;
  const el = u < .8 ? Math.sin(Math.PI * u / .8) : -.35;              // sun elevation
  const k = Math.max(0, Math.min(1, el * 2.2));                        // 0 night .. 1 full day
  const dusk = u < .8 ? Math.max(0, 1 - Math.sin(Math.PI * u / .8) * 4) : 0;
  const sky = new THREE.Color(0x14204a).lerp(new THREE.Color(0x8fcdf2), k).lerp(new THREE.Color(0xff9a5a), Math.min(.7, dusk * (u < .8 ? 1 : 0)));
  scene.background = sky; scene.fog.color.copy(sky);
  sun.intensity = .25 + 1.35 * k; hemi.intensity = .5 + .5 * k; sun.color.set(k < .5 ? 0xffc28a : 0xfff1d0);
  const ang = u < .8 ? Math.PI * u / .8 : Math.PI * .5;
  const dir = new THREE.Vector3(Math.cos(ang) * 55, Math.max(14, Math.sin(ang) * 70), 30);
  sun.position.set(camera.position.x * .85 + dir.x, dir.y, camera.position.z * .85 + dir.z); sun.target.position.set(camera.position.x * .85, 0, camera.position.z * .85);
  const hrs = ((6 + u * 24) % 24) | 0, mins = (((6 + u * 24) * 60) % 60) | 0; $('clock').textContent = hrs.toString().padStart(2, '0') + ':' + mins.toString().padStart(2, '0');
}

// ------------------------------------------------------------ tiles
const views = {}; // idx -> {soil, crop, type}
const tileRNG = function (i) { let s = i * 9301 + 49297; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
function tilePos(i) { return { x: W.FX0 + (i % W.COLS) * W.TILE + W.TILE / 2, z: W.FZ0 + Math.floor(i / W.COLS) * W.TILE + W.TILE / 2 }; }
function tileAt(x, z) { const cx = Math.floor((x - W.FX0) / W.TILE), cz = Math.floor((z - W.FZ0) / W.TILE); return (cx < 0 || cz < 0 || cx >= W.COLS || cz >= W.ROWS) ? -1 : cz * W.COLS + cx; }
function progress(t) { return (!t || t.k !== 'c' || !t.w) ? 0 : Math.min(1, (WW.now() - t.w) / CROPS[t.c].grow); }
function syncView(i) {
  const t = tiles[i], v = views[i];
  if (!t) { if (v) { scene.remove(v.soil); if (v.crop) scene.remove(v.crop); delete views[i]; } return; }
  const p = tilePos(i), wet = t.k === 'c' && t.w;
  if (!v) { const soil = new THREE.Mesh(W.soilGeo, W.soilDry); soil.position.set(p.x, .11, p.z); soil.receiveShadow = true; scene.add(soil); views[i] = { soil: soil, crop: null, type: null }; }
  const vv = views[i]; vv.soil.material = wet ? W.soilWet : W.soilDry;
  const type = t.k === 'c' ? t.c : null;
  if (vv.type !== type) { if (vv.crop) scene.remove(vv.crop); vv.crop = null; vv.type = type; if (type) { vv.crop = W.makeCrop(type, tileRNG(i)); vv.crop.position.set(p.x, .2, p.z); scene.add(vv.crop); } }
}
function updateCrops() { Object.keys(views).forEach(function (i) { const v = views[i], t = tiles[i]; if (v.crop && t) W.growCrop(v.crop, progress(t), !!t.w); }); }

// ------------------------------------------------------------ actions
function setCoins(d) { save.coins = Math.max(0, save.coins + d); $('coins').textContent = save.coins; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1500); }
function flushSave() { clearTimeout(saveTimer); if (me) WW.writeSave('farm', { coins: save.coins, harvested: save.harvested, eggs: save.eggs, milk: save.milk }); }
document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); }); window.addEventListener('pagehide', flushSave);

function actTile(i, quiet) {
  if (i < 0 || !roomRef) return;
  const cur = tiles[i], ref = roomRef.child('tiles/' + i);
  if (tool === 'hoe') { if (!cur) ref.set({ k: 't' }); else if (!quiet) { if (cur.k === 't') ref.remove(); else say('Harvest or clear the crop first.'); } }
  else if (tool === 'water') { if (cur && cur.k === 'c' && !cur.w) ref.child('w').set(WW.now()); else if (!quiet) say(cur && cur.k === 'c' ? 'Already watered.' : 'Plow the soil first.'); }
  else if (tool === 'harvest') {
    ref.transaction(function (c) { return (c && c.k === 'c' && progress(c) >= 1) ? { k: 't' } : undefined; }, function (err, ok) {
      if (ok && cur) { const pay = CROPS[cur.c].sell; setCoins(pay); save.harvested++; say('Harvested ' + cur.c + '! +' + pay + ' 🪙'); } else if (!quiet) say(cur && cur.k === 'c' ? 'Not ready yet.' : 'Nothing to harvest.');
    });
  } else if (CROPS[tool]) {
    if (!cur || cur.k !== 't') { if (!quiet) say('Plow the soil first.'); return; }
    if (save.coins < CROPS[tool].cost) { if (!quiet) say('Not enough coins.'); return; }
    setCoins(-CROPS[tool].cost); ref.set({ k: 'c', c: tool, w: 0 });
  }
}
const cool = {};
function tractorAuto(dt) {
  if (Math.abs(tractorLocal.speed) < .5) return;
  const fx = Math.sin(tractorLocal.ry), fz = Math.cos(tractorLocal.ry), rx = fz, rz = -fx, now = performance.now();
  for (let s = -1; s <= 1; s++) {
    const x = tractorLocal.x - fx * 2.4 + rx * s * W.TILE, z = tractorLocal.z - fz * 2.4 + rz * s * W.TILE, i = tileAt(x, z);
    if (i < 0 || (cool[i] || 0) > now) continue; cool[i] = now + 900; actTile(i, true);
  }
}

// ------------------------------------------------------------ animals
const animalViews = {};
function syncAnimals() {
  Object.keys(animals).forEach(function (id) {
    if (animalViews[id]) return; const a = animals[id], def = ANIMALS[a.t]; if (!def) return;
    const m = W.makeAnimal(a.t), p = def.pen; m.position.set(p.x0 + 1 + Math.random() * (p.x1 - p.x0 - 2), 0, p.z0 + 1 + Math.random() * (p.z1 - p.z0 - 2)); scene.add(m);
    animalViews[id] = { mesh: m, tx: m.position.x, tz: m.position.z, wait: Math.random() * 3 };
  });
  Object.keys(animalViews).forEach(function (id) { if (!animals[id]) { scene.remove(animalViews[id].mesh); delete animalViews[id]; } });
}
function updateAnimals(dt) {
  const now = WW.now();
  Object.keys(animalViews).forEach(function (id) {
    const v = animalViews[id], a = animals[id]; if (!a) return; const p = ANIMALS[a.t].pen, m = v.mesh, sp = m.userData.speed;
    const dx = v.tx - m.position.x, dz = v.tz - m.position.z, d = Math.hypot(dx, dz);
    if (d < .3) { v.wait -= dt; if (v.wait <= 0) { v.tx = p.x0 + 1 + Math.random() * (p.x1 - p.x0 - 2); v.tz = p.z0 + 1 + Math.random() * (p.z1 - p.z0 - 2); v.wait = 1 + Math.random() * 4; } }
    else { m.position.x += dx / d * sp * dt; m.position.z += dz / d * sp * dt; m.rotation.y = Math.atan2(dx, dz); m.position.y = a.t === 'chicken' ? Math.abs(Math.sin(performance.now() / 120)) * .05 : 0; }
    const ready = now >= (a.r || 0); m.userData.icon.visible = ready; if (ready) { m.userData.icon.position.y += Math.sin(performance.now() / 300) * .002; m.userData.icon.rotation.y += dt * 2; }
  });
}
function nearestReadyAnimal() {
  let best = null, bd = 4.2; const now = WW.now();
  Object.keys(animalViews).forEach(function (id) { const a = animals[id]; if (!a || now < (a.r || 0)) return; const m = animalViews[id].mesh, d = Math.hypot(m.position.x - player.x, m.position.z - player.z); if (d < bd) { bd = d; best = id; } });
  return best;
}
function collect(id) {
  const a = animals[id]; if (!a) return; const def = ANIMALS[a.t];
  roomRef.child('animals/' + id + '/r').transaction(function (r) { return WW.now() >= (r || 0) ? WW.now() + def.every : undefined; }, function (e, ok) {
    if (ok) { setCoins(def.pay); if (a.t === 'cow') save.milk++; else save.eggs++; say('Collected ' + def.prod + '! +' + def.pay + ' 🪙'); } else say('Not ready yet.');
  });
}

// ------------------------------------------------------------ shop
function counts() { const c = { chicken: 0, cow: 0 }; Object.keys(animals).forEach(function (id) { if (c[animals[id].t] !== undefined) c[animals[id].t]++; }); return c; }
function renderShop() {
  const c = counts(), box = $('shopItems'); box.innerHTML = '';
  Object.keys(ANIMALS).forEach(function (k) {
    const d = ANIMALS[k], row = document.createElement('div'); row.className = 'item';
    row.innerHTML = '<div>' + d.icon + ' <b>' + d.name + '</b> <small style="color:#94a3b8">(' + c[k] + '/' + d.max + ') gives ' + d.prod + ' every ' + d.every / 1000 + 's for ' + d.pay + ' 🪙</small></div>';
    const b = document.createElement('button'); b.textContent = d.cost + ' 🪙'; b.disabled = c[k] >= d.max || save.coins < d.cost;
    b.onclick = function () { if (save.coins < d.cost || counts()[k] >= d.max) return; setCoins(-d.cost); roomRef.child('animals/' + Date.now().toString(36) + Math.floor(Math.random() * 99)).set({ t: k, r: WW.now() + d.every }); say('Bought a ' + d.name.toLowerCase() + '!'); setTimeout(renderShop, 200); };
    row.appendChild(b); box.appendChild(row);
  });
}
function openShop() { renderShop(); $('shop').style.display = 'flex'; } $('shopClose').onclick = function () { $('shop').style.display = 'none'; };

// ------------------------------------------------------------ toolbar
const bar = $('bar');
TOOLS.forEach(function (t, i) { const b = document.createElement('button'); b.textContent = t.label; b.dataset.id = t.id; b.onclick = function () { setTool(t.id); }; bar.appendChild(b); });
function setTool(id) { tool = id; [].forEach.call(bar.children, function (b) { b.classList.toggle('sel', b.dataset.id === id); }); const t = TOOLS.filter(function (x) { return x.id === id; })[0]; W.setImplement(tractor, t.color); } setTool('hoe');

// ------------------------------------------------------------ input
const keys = {}; let yaw = Math.PI, pitch = .42, dist = 10, joy = { x: 0, y: 0 };
window.addEventListener('keydown', function (e) {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return; const k = e.key.toLowerCase();
  if (/^[1-6]$/.test(k)) { setTool(TOOLS[+k - 1].id); return; }
  if (k === 'e' || k === ' ') { e.preventDefault(); if (!e.repeat) useAction(); return; }
  if (k === 'escape') $('shop').style.display = 'none';
  keys[k] = true; if (k.indexOf('arrow') === 0) e.preventDefault();
});
window.addEventListener('keyup', function (e) { delete keys[e.key.toLowerCase()]; });
// drag to look around
let drag = null;
canvas.addEventListener('pointerdown', function (e) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; yaw -= (e.clientX - drag.x) * .006; pitch = Math.max(.12, Math.min(1.2, pitch + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; });
canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
canvas.addEventListener('wheel', function (e) { dist = Math.max(5, Math.min(22, dist + e.deltaY * .01)); }, { passive: true });
// touch joystick
const joyEl = $('joy'), knob = $('knob'); let joyId = null;
function joyMove(e) { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / 50, dy = (e.clientY - cy) / 50; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  joy.x = dx; joy.y = dy; knob.style.transform = 'translate(' + dx * 40 + 'px,' + dy * 40 + 'px)'; }
joyEl.addEventListener('pointerdown', function (e) { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
joyEl.addEventListener('pointermove', function (e) { if (e.pointerId === joyId) joyMove(e); });
['pointerup', 'pointercancel'].forEach(function (n) { joyEl.addEventListener(n, function (e) { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } }); });
$('useBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); useAction(); });

// ------------------------------------------------------------ interaction
function facingTile() { return tileAt(player.x + Math.sin(player.ry) * 1.9, player.z + Math.cos(player.ry) * 1.9); }
function context() {
  if (player.driving) return { kind: 'exit', text: 'Exit tractor (E)' };
  const id = nearestReadyAnimal(); if (id) return { kind: 'collect', id: id, text: 'Collect ' + ANIMALS[animals[id].t].prod + ' (E)' };
  if (Math.hypot(player.x - W.SHOP_POS.x, player.z - W.SHOP_POS.z) < 5) return { kind: 'shop', text: 'Open barn shop (E)' };
  if (tractorState.holder === null || tractorState.holder === me.uid) { const tx = tractorState.holder === me.uid ? tractorLocal.x : tractorState.x, tz = tractorState.holder === me.uid ? tractorLocal.z : tractorState.z;
    if (Math.hypot(player.x - tx, player.z - tz) < 4) return { kind: 'drive', text: 'Drive tractor (E)' }; }
  const i = facingTile(); if (i >= 0) return { kind: 'tile', i: i, text: 'Use ' + TOOLS.filter(function (t) { return t.id === tool; })[0].label.replace(/ \d+$/, '') + ' (E)' };
  return null;
}
function useAction() {
  if (!me || $('shop').style.display === 'flex') return; const c = context(); if (!c) return;
  if (c.kind === 'collect') collect(c.id);
  else if (c.kind === 'shop') openShop();
  else if (c.kind === 'tile') actTile(c.i, false);
  else if (c.kind === 'drive') {
    roomRef.child('tractor').transaction(function (t) { t = t || {}; return (!t.holder || t.holder === me.uid) ? { holder: me.uid, x: t.x === undefined ? W.TRACTOR_HOME.x : t.x, z: t.z === undefined ? W.TRACTOR_HOME.z : t.z, ry: t.ry || 0 } : undefined; },
      function (e, ok) { if (ok) { player.driving = true; tractorLocal.x = tractorState.x; tractorLocal.z = tractorState.z; tractorLocal.ry = tractorState.ry; tractorLocal.speed = 0; player.x = tractorLocal.x; player.z = tractorLocal.z; roomRef.child('tractor/holder').onDisconnect().remove(); say('Tractor: your tool works on 3 tiles at once. WASD to drive.'); } else say('Someone else is driving.'); });
  } else if (c.kind === 'exit') {
    player.driving = false; tractorLocal.speed = 0; const ex = tractorLocal.x + Math.cos(tractorLocal.ry) * 2.8, ez = tractorLocal.z - Math.sin(tractorLocal.ry) * 2.8;
    player.x = ex; player.z = ez; roomRef.child('tractor').set({ holder: null, x: +tractorLocal.x.toFixed(2), z: +tractorLocal.z.toFixed(2), ry: +tractorLocal.ry.toFixed(3) });
  }
}

// ------------------------------------------------------------ remote players
const remote = {};
function syncRemotes() {
  const now = WW.now();
  Object.keys(players).forEach(function (u) {
    if (me && u === me.uid) return; const p = players[u]; if (now - (p.t || 0) > 45000) return;
    let r = remote[u];
    if (!r) { const m = W.makeFarmer(p.h || .3); const lab = W.makeLabel(p.n || 'Friend', '#bae6fd'); lab.position.y = 3.4; m.add(lab); scene.add(m); r = remote[u] = { mesh: m, x: p.x, z: p.z, ry: p.r || 0, last: 0 }; m.position.set(p.x, 0, p.z); }
    r.tx = p.x; r.tz = p.z; r.try = p.r || 0; r.driving = !!p.v;
  });
  Object.keys(remote).forEach(function (u) { const p = players[u]; if (!p || now - (p.t || 0) > 45000) { scene.remove(remote[u].mesh); delete remote[u]; } });
  $('count').textContent = Math.max(1, Object.keys(remote).length + 1);
}
function updateRemotes(dt) {
  Object.keys(remote).forEach(function (u) {
    const r = remote[u], m = r.mesh; const dx = r.tx - m.position.x, dz = r.tz - m.position.z, d = Math.hypot(dx, dz);
    m.position.x += dx * Math.min(1, dt * 10); m.position.z += dz * Math.min(1, dt * 10);
    let da = r.try - m.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; m.rotation.y += da * Math.min(1, dt * 10);
    m.visible = !r.driving; W.animateFarmer(m, d * 10 > .3 ? 4 : 0, dt);
  });
}
function remoteDriver() { const now = WW.now(); const u = Object.keys(players).filter(function (u) { return players[u].v && u !== (me && me.uid) && now - (players[u].t || 0) < 45000; })[0]; return u ? remote[u] : null; }

// ------------------------------------------------------------ main loop
let last = performance.now(), lastSent = 0, lastBeat = 0, lastTrk = 0, camX = 0, camZ = 0;
function collide(p, rad) { W.COLLIDERS.forEach(function (c) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 0) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }); p.x = Math.max(-80, Math.min(80, p.x)); p.z = Math.max(-80, Math.min(80, p.z)); }
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000); last = ts;
  // input vector (+y forward)
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  if (player.driving) {
    // tank-style controls: forward/back accelerate, left/right steer
    const T = tractorLocal; const target = iz * 9; T.speed += (target - T.speed) * Math.min(1, dt * 2.2);
    T.ry -= ix * dt * 1.5 * Math.max(-1, Math.min(1, T.speed / 3)); T.x += Math.sin(T.ry) * T.speed * dt; T.z += Math.cos(T.ry) * T.speed * dt;
    const p = { x: T.x, z: T.z }; collide(p, 2); T.x = p.x; T.z = p.z; player.x = T.x; player.z = T.z; player.ry = T.ry; player.speed = Math.abs(T.speed);
    tractorAuto(dt);
  } else if (mag > .08) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const dx = fx * iz + rx * ix, dz = fz * iz + rz * ix, m = Math.hypot(dx, dz) || 1, sp = 6.2 * Math.min(1, mag);
    player.x += dx / m * sp * dt; player.z += dz / m * sp * dt; const p = { x: player.x, z: player.z }; collide(p, .6); player.x = p.x; player.z = p.z;
    let da = Math.atan2(dx, dz) - player.ry; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; player.ry += da * Math.min(1, dt * 14); player.speed = sp;
  } else player.speed = 0;
  // scene objects
  farmer.visible = !player.driving; farmer.position.set(player.x, 0, player.z); farmer.rotation.y = player.ry; W.animateFarmer(farmer, player.speed, dt);
  const rd = remoteDriver();
  if (player.driving) { tractor.position.set(tractorLocal.x, 0, tractorLocal.z); tractor.rotation.y = tractorLocal.ry; }
  else if (rd) { tractor.position.set(rd.mesh.position.x, 0, rd.mesh.position.z); tractor.rotation.y = rd.mesh.rotation.y; }
  else { tractor.position.set(tractorState.x, 0, tractorState.z); tractor.rotation.y = tractorState.ry || 0; }
  const spin = (player.driving ? tractorLocal.speed : 0) * dt / .9; tractor.userData.wheels.forEach(function (w) { w.rotation.x += spin; });
  world.clouds.position.x += dt * .6; if (world.clouds.position.x > 140) world.clouds.position.x = -140;
  // camera
  const ty = player.driving ? 2.2 : 1.7, d = player.driving ? dist * 1.3 : dist;
  camX += (player.x - camX) * Math.min(1, dt * 8); camZ += (player.z - camZ) * Math.min(1, dt * 8);
  camera.position.set(camX + Math.sin(yaw) * Math.cos(pitch) * d, ty + Math.sin(pitch) * d, camZ + Math.cos(yaw) * Math.cos(pitch) * d); camera.lookAt(camX, ty, camZ);
  // pointer + prompt
  const c = me && context(); $('prompt').innerHTML = c ? '<span>' + c.text + '</span>' : ''; $('useBtn').textContent = c ? (c.kind === 'tile' ? 'Use' : c.kind === 'exit' ? 'Exit' : c.kind === 'drive' ? 'Drive' : c.kind === 'shop' ? 'Shop' : 'Collect') : 'Use';
  if (c && c.kind === 'tile') { const p = tilePos(c.i); pointer.position.set(p.x, .26, p.z); pointer.visible = true; } else pointer.visible = false;
  updateSky(); updateCrops(); updateAnimals(dt); updateRemotes(dt);
  // network
  const now = performance.now();
  if (roomRef && me && now - lastSent > 100 && (player.speed > .1 || now - lastBeat > 8000)) {
    lastSent = lastBeat = now;
    roomRef.child('players/' + me.uid).set({ n: myName, x: +player.x.toFixed(2), z: +player.z.toFixed(2), r: +player.ry.toFixed(2), v: player.driving ? 1 : 0, h: +myHue.toFixed(2), t: firebase.database.ServerValue.TIMESTAMP });
  }
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
  const roomCode = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = roomCode || (user ? myCode : null);
  if (user && code) {
    try {
      roomRef = WW.roomRef(code); const meta = (await roomRef.child('meta').once('value')).val();
      if (!meta) { if (code === myCode) await roomRef.child('meta').set({ host: (user.displayName || 'Farmer').split(' ')[0], created: firebase.database.ServerValue.TIMESTAMP });
        else { gate('Farm ' + code + ' not found. Ask your friend to open their farm once first.', false); return; } }
      me = user; cloudCode = code; WW.mode = 'cloud'; $('roomLabel').textContent = (code === myCode ? 'My farm' : 'Friend’s farm') + ' · ' + code;
    } catch (e) {
      if (roomCode && roomCode !== myCode) { gate('Could not reach that farm online yet (the game database rules still need to be added). Try solo for now.', false); return; }
      console.warn(e); user = null; roomRef = null; say('Online farms are not switched on yet, so you are playing solo on this device.');
    }
  } else if (roomCode) { gate('Sign in to join a friend’s farm.', true); return; }
  if (!roomRef || WW.mode !== 'cloud') { WW.useLocal(); roomRef = WW.roomRef('solo'); me = { uid: 'local' }; $('roomLabel').textContent = 'Solo · this device'; }
  $('gate').style.display = 'none';
  myName = ((user && user.displayName) || 'Farmer').split(' ')[0].slice(0, 12);
  const s = await WW.loadSave('farm'); if (s) { save.coins = s.coins | 0; save.harvested = s.harvested | 0; save.eggs = s.eggs | 0; save.milk = s.milk | 0; } $('coins').textContent = save.coins;
  roomRef.child('tiles').on('value', function (snap) { const v = snap.val() || {}, old = tiles; tiles = {}; Object.keys(v).forEach(function (k) { tiles[+k] = v[k]; });
    Object.keys(old).concat(Object.keys(tiles)).forEach(function (k) { syncView(+k); }); });
  roomRef.child('animals').on('value', function (snap) { animals = snap.val() || {}; syncAnimals(); });
  roomRef.child('tractor').on('value', function (snap) { const v = snap.val(); tractorState = Object.assign({ holder: null, x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: 0 }, v || {}); if (tractorState.holder === undefined) tractorState.holder = null; });
  roomRef.child('players').on('value', function (snap) { players = snap.val() || {}; syncRemotes(); });
  setInterval(syncRemotes, 5000);
  const mine = roomRef.child('players/' + me.uid); mine.onDisconnect().remove();
  say(WW.mode === 'cloud' ? 'Share your code so friends can drop in any time. Pick a tool, face a tile, press E.' : 'Welcome! Face a patch of grass, pick Plow, and press E. Sign in from the hub for online saves and friends.');
  requestAnimationFrame(loop);
}
let started = false, startedAsUser = false;
WW.onReady(function (user, code) {
  if (started) { if (!!user !== startedAsUser) location.reload(); return; }
  started = true; startedAsUser = !!user;
  begin(user, code).catch(function (e) { console.error(e); gate('Could not start: ' + (e.message || e), false); });
});

// debug/test hook
window.__farm = { player: player, tractorLocal: tractorLocal, setTool: setTool, get tiles() { return tiles; }, get animals() { return animals; }, get save() { return save; }, useAction: useAction };
