// Neighborly Acre: 3D co-op farm. Solo any time; friends can drop in via the same room.
// Signed in = everything lives in Firebase (never on the device). Guest = this device only.
import * as W from './world.js';
import * as C from './config.js';
const THREE = W.THREE, WW = window.WW, $ = id => document.getElementById(id);
const NT = W.NT;
const qs = new URLSearchParams(location.search);
const FORCE_HOUR = qs.get('time') !== null ? +qs.get('time') : null;      // debug: ?time=14.5
const FORCE_WX = qs.get('weather');                                       // debug: ?weather=rain | clear

// ------------------------------------------------------------ state
let me = null, myName = 'Farmer', myHue = Math.random(), roomRef = null, cloudCode = null;
let tiles = {}, players = {}, animals = {}, tractorState = { x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: W.TRACTOR_HOME.ry }, colors = {}, myColor = '', isMP = false, hostCode = '', saveKey = 'farm', ledger = {};
let tool = 'hoe', saveTimer = null, toastTimer = null, lastDragAt = 0, avatars = {}, myAvatar = '';
const save = { ach: {}, coins: 100, xp: 0, seeds: { wheat: 30, carrot: 30 }, bag: {}, fert: 0, up: {}, skip: {}, orders: { done: {} }, harvested: 0, stats: {}, daily: { day: -1, base: {}, done: [] }, ms: {} };
const player = { x: 0, z: -1, ry: 0, speed: 0, driving: false };
const tractorLocal = { x: W.TRACTOR_HOME.x, z: W.TRACTOR_HOME.z, ry: W.TRACTOR_HOME.ry, speed: 0 };
const level = () => C.levelFromXp(save.xp);
const swath = () => save.up.mega ? 7 : save.up.wide ? 5 : 3;
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

let tractor = W.makeTractor(); scene.add(tractor);
function paintTractor(hex) { const p = tractor.position.clone(), ry = tractor.rotation.y; scene.remove(tractor); tractor = W.makeTractor(hex); tractor.position.copy(p); tractor.rotation.y = ry; scene.add(tractor); applyImplement(); }
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
const tilePos = W.tilePos, tileAt = W.tileAt;
// land: three fields are open, three are bought at the barn; owned fields live in the room (shared by everyone)
// fields: every player works their OWN fields (others can look but not touch). room/fields/{n} = { uid, n: name }
let ownedFields = {};
const ownerOf = f => { const o = ownedFields[f]; return o ? (o.uid || o.by || null) : null; };
const isMine = f => !!me && ownerOf(f) === me.uid;
function myFieldCount() { let n = 0; for (let f = 0; f < W.FIELDS.length; f++) if (isMine(f)) n++; return n; }
function firstMyField() { for (let f = 0; f < W.FIELDS.length; f++) if (isMine(f)) return f; return -1; }
function nextLand() { return C.LAND[myFieldCount()] || null; }
// how many of the 12 plots are on show: at least 6, and always enough that 2 of them are still for sale
function visibleFields() { let v = C.START_FIELDS; const free = n => { let c = 0; for (let f = 0; f < n; f++) if (!ownedFields[f]) c++; return c; }; while (v < W.FIELDS.length && free(v) < C.MIN_FIELDS_FOR_SALE) v++; return v; }
let shownFields = 0;
function updateFieldVisuals() {
  const nl = nextLand(), vis = visibleFields();
  if (vis > shownFields && shownFields) say('🏞️ New land for sale: Field ' + vis + '!'); shownFields = vis;
  world.fields.forEach(function (F, f) {
    F.setVisible(f < vis); if (f >= vis) return;
    const o = ownedFields[f]; if (o) F.setOwner(o.n || 'Farmer', isMine(f)); else F.setOwner(null, false, nl ? 'FOR SALE · $' + nl.cost.toLocaleString() + ' for you · level ' + nl.level : 'FOR SALE');
  });
}
function claimField(f) {
  return new Promise(function (resolve) {
    roomRef.child('fields/' + f).transaction(function (cur) { return cur ? undefined : { uid: me.uid, n: myName, t: nowMs() }; }, function (e, ok) { resolve(!!ok); });
  });
}
// solo / guest: the three open fields are yours. Multiplayer: you get one free field when you arrive (first come, first served).
async function autoClaim() {
  if (!isMP) { for (let f = 0; f < 3; f++) if (!ownerOf(f)) await claimField(f); return; }
  if (myFieldCount() > 0) return;
  const order = C.FREE_FIELDS.concat([3, 4, 5]);
  for (let k = 0; k < order.length; k++) { if (ownerOf(order[k])) continue; if (await claimField(order[k])) return; }
  say('Every field on this farm is taken. Ask the host about land.');
}
// real grow time of one planted tile: cultivated soil -10%, fertilizer -25%
function growOf(t) { return C.CROPS[t.c].grow * (t.u ? C.GROW_CULTIVATED : 1) * (t.f ? C.GROW_FERTILIZED : 1); }
function progress(t, now) { return (!t || t.k !== 'c' || !t.w) ? 0 : Math.min(1, ((now || nowMs()) - t.w) / growOf(t)); }
let drawn = {};
function refreshField() {
  const now = nowMs(); let growing = 0, ready = 0, dry = 0, next = Infinity; const seen = {};
  Object.keys(tiles).forEach(function (k) {
    const i = +k, t = tiles[i], p = tilePos(i); if (!t || !p) return; seen[i] = 1;
    if (t.k === 't') { field.set(i, p.x, p.z, true, false, null, 0, false, !!t.u); return; }
    const pr = progress(t, now), wet = !!t.w;
    field.set(i, p.x, p.z, true, wet, t.c, wet ? .18 + .82 * pr : .12, pr >= 1, !!t.u);
    if (!wet) dry++; else if (pr >= 1) ready++; else { growing++; next = Math.min(next, growOf(t) * (1 - pr)); }
  });
  Object.keys(drawn).forEach(function (k) { if (!seen[k]) { const p = tilePos(+k); field.set(+k, p.x, p.z, false); } });
  drawn = seen; field.commit();
  const bits = []; if (growing) bits.push('🌱' + growing); if (ready) bits.push('✅' + ready); if (dry) bits.push('💧' + dry);
  $('cropInfo').textContent = bits.length ? bits.join(' ') + (next < Infinity ? ' · next ' + C.fmtTime(next) : '') : 'Fields empty';
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
function flushSave() { clearTimeout(saveTimer); if (me) WW.writeSave(saveKey, JSON.parse(JSON.stringify(save))); }
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1200); }
document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); }); window.addEventListener('pagehide', flushSave);
function setCoins(d) { save.coins = Math.max(0, save.coins + d); hud(); queueSave(); }
function addItem(id, n) { save.bag[id] = (save.bag[id] || 0) + n; if (save.bag[id] <= 0) delete save.bag[id]; queueSave(); }
function addXp(n) {
  const old = level(); save.xp += n * C.XP_SCALE; const now = level();
  if (now > old) {
    let bonus = 0, unlocked = [];
    for (let l = old + 1; l <= now; l++) { bonus += C.levelUpCoins(l); unlocked = unlocked.concat(C.unlocksAt(l)); }
    save.coins += bonus; say('🎉 Level ' + now + '! +$' + bonus + (unlocked.length ? ' · Unlocked: ' + unlocked.join(', ') : '')); buildSeedBar();
  }
  hud(); queueSave();
}
// ---- (legacy) the old shared-herd ledger: entries are now only skipped, never applied.
// Each client writes an entry to room/ledger and every other client applies it to their own save (once, tracked by save.ledKey).
function ledgerKey() { return String(Math.round(nowMs())).padStart(13, '0') + '_' + Math.random().toString(36).slice(2, 6); }
function pushLedger(entry) {
  if (!isMP || !roomRef) return; entry.by = me.uid; entry.n = myName; roomRef.child('ledger/' + ledgerKey()).set(entry);
  if (Math.random() < .03) { const old = String(Math.round(nowMs() - 3 * 86400000)).padStart(13, '0'); Object.keys(ledger).forEach(function (k) { if (k < old) roomRef.child('ledger/' + k).remove(); }); }
}
function applyLedger(v) {
  ledger = v || {}; const keys = Object.keys(ledger).sort(); if (!me) return;
  if (!save.ledKey) { save.ledKey = keys.length ? keys[keys.length - 1] : '0'; queueSave(); return; }   // first time on this farm: older entries are history
  let changed = false;
  keys.forEach(function (k) {
    if (k <= save.ledKey) return; save.ledKey = k; changed = true; const e = ledger[k]; if (!e || e.by === me.uid) return;
    // the shared herd is gone: every farmer has their own animals, sales and XP, so old shared entries are skipped
  });
  if (changed) queueSave();
}

// Firebase drops empty lists/objects and turns sparse arrays into objects, so repair everything we loaded
function arr(x) { if (Array.isArray(x)) return x; const out = []; if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { out[+k] = x[k]; }); return out; }
function normalizeSave() {
  save.fert = save.fert | 0; save.seeds = save.seeds || {}; save.bag = save.bag || {}; save.up = save.up || {}; save.skip = save.skip || {}; save.stats = save.stats || {}; save.ms = save.ms || {};
  save.orders = save.orders || {}; { const od = save.orders.done; save.orders.done = (od && typeof od === 'object' && !Array.isArray(od)) ? od : {}; }
  save.daily = save.daily || { day: -1, base: {}, done: [] }; save.daily.base = save.daily.base || {}; save.daily.done = arr(save.daily.done);
  if (save.daily.list) { save.daily.list = arr(save.daily.list).filter(Boolean); if (!save.daily.list.length) delete save.daily.list; }
}
function stat(k, n) { save.stats[k] = (save.stats[k] || 0) + (n || 1); }
function hud() {
  $('coins').textContent = save.coins; const l = level();
  $('lvl').textContent = l; $('xpTxt').textContent = l >= C.MAX_LEVEL ? 'MAX LEVEL' : Math.floor(save.xp - C.xpForLevel(l)) + '/' + C.xpToNext(l) + ' xp';
  [].forEach.call($('bar').children, function (b) { const t = TOOLS.filter(function (x) { return x.id === b.dataset.id; })[0], lk = l < (C.TOOL_LEVEL[t.id] || 1); b.textContent = t.label + (lk ? ' 🔒' + C.TOOL_LEVEL[t.id] : t.id === 'fert' ? ' ×' + save.fert : ''); b.style.opacity = lk ? .5 : ''; });
  checkAchievements(); const badge = claimable() ? ' •' : ''; if ($('missionsBtn')) $('missionsBtn').textContent = '📜 Missions' + badge;
}
// ------------------------------------------------------------ achievements: checked whenever the HUD refreshes; new ones pop up here and on every page of the site
let achReady = false;
function checkAchievements(boot) {
  if (!me || !save.stats || (!achReady && !boot)) return; const ctx = { s: new Proxy(save.stats, { get: function (o, k) { return o[k] || 0; } }), level: level(), fields: myFieldCount(), coins: save.coins, up: save.up || {} }, fresh = [];
  save.ach = save.ach || {};
  C.ACHIEVEMENTS.forEach(function (a) { if (!save.ach[a.id] && a.t(ctx)) { save.ach[a.id] = Date.now(); fresh.push(a); } });
  if (boot) { achReady = true; if (fresh.length) { queueSave(); say('🏆 ' + fresh.length + ' achievement' + (fresh.length > 1 ? 's' : '') + ' unlocked from your past progress. See the Achievements tab.'); } return; }   // backlog from before achievements existed: no site-wide spam
  if (!fresh.length) return; queueSave();
  fresh.forEach(function (a) {
    say('🏆 Achievement: ' + a.name + '!');
    try { WW.db.ref('achFeed').push({ n: myName, a: a.id, t: a.name, i: a.icon, d: a.desc, g: 'Neighborly Acre', av: myAvatar || '', ts: firebase.database.ServerValue.TIMESTAMP }); } catch (e) {}
  });
}
let burst = 0, burstT = null;
function harvestedToast(crop) { burst++; clearTimeout(burstT); burstT = setTimeout(function () { say('🧺 Harvested ' + burst + ' · in your bag (sell at the barn)'); burst = 0; }, 500); }

// ------------------------------------------------------------ planting mix: seeds you own are spread evenly across the field
//   1 kind of seed -> the whole field, 2 kinds -> 50/50, 3 kinds -> thirds ... (split by column bands)
function plantables() { return C.CROP_IDS.filter(function (id) { return level() >= C.CROPS[id].level && (save.seeds[id] || 0) > 0 && !save.skip[id]; }); }
function cropForTile(i) { const list = plantables(); if (!list.length) return null; const li = i % C.FIELD_TILES, col = li % W.COLS, row = Math.floor(li / W.COLS), k = col * W.ROWS + row; return list[Math.min(list.length - 1, Math.floor(k * list.length / C.FIELD_TILES))]; }   // every field is split evenly (column-major)
function mixText() { const l = plantables(); return l.length ? 'Planting mix: ' + l.map(function (id) { return C.CROPS[id].icon + Math.round(100 / l.length) + '%'; }).join(' ') : 'No seeds selected, buy a pack at the barn'; }

// ------------------------------------------------------------ tile actions (on foot, or automatically from the tractor)
let clearConfirm = { i: -1, until: 0 };
function actTile(i, quiet) {
  if (i < 0 || !roomRef) return;
  { const f = W.fieldOf(i); if (!isMine(f)) { if (!quiet) { const o = ownedFields[f]; say(o ? (o.n || 'Another farmer') + '\u2019s field. Work your own field.' : 'This land is for sale. Buy it at the barn (Land tab).'); } return; } }
  const cur = tiles[i], ref = roomRef.child('tiles/' + i), now = nowMs();
  if (tool === 'hoe') {
    if (!cur) { ref.set({ k: 't' }); stat('plow'); queueSave(); }
    else if (!quiet) {
      if (cur.k === 't') ref.remove();
      else if (clearConfirm.i === i && performance.now() < clearConfirm.until) { ref.set({ k: 't' }); clearConfirm.i = -1; say('Crop removed.'); }
      else { clearConfirm = { i: i, until: performance.now() + 2500 }; say('Press again to dig up this ' + C.CROPS[cur.c].name.toLowerCase() + ' (it will be lost).'); }
    }
  } else if (tool === 'cultivate') {
    if (cur && cur.k === 't' && !cur.u) { ref.child('u').set(1); stat('cultivate'); addXp(1); queueSave(); }
    else if (!quiet) say(!cur ? 'Plow the soil first, then cultivate it.' : cur.k === 't' ? 'Already cultivated.' : 'Cultivate the soil before planting.');
  } else if (tool === 'fert') {
    if (cur && cur.k === 'c' && !cur.f && progress(cur) < 1) {
      if (save.fert < 1) { if (!quiet || !outWarn()) say('Out of fertilizer. Buy some at the barn (Store tab).'); return; }
      save.fert--; ref.child('f').set(1); stat('fert'); addXp(1); hud(); queueSave();
    } else if (!quiet) say(!cur || cur.k !== 'c' ? 'Fertilize a growing crop.' : cur.f ? 'Already fertilized.' : 'Ready to harvest already.');
  } else if (tool === 'water') {
    if (cur && cur.k === 'c' && !cur.w) { ref.child('w').set(now); stat('water'); queueSave(); } else if (!quiet) say(cur && cur.k === 'c' ? 'Already watered.' : 'Nothing to water here.');
  } else if (tool === 'harvest') {
    if (!cur || cur.k !== 'c') { if (!quiet) say('Nothing to harvest.'); return; }
    ref.transaction(function (c) { return (c && c.k === 'c' && progress(c) >= 1) ? { k: 't' } : undefined; }, function (err, ok) {
      if (ok) { addItem(cur.c, 1); if (quiet && save.up.combine && Math.random() < .25) { addItem(cur.c, 1); } save.harvested++; stat('harvest'); addXp(C.XP_HARVEST); if (quiet) harvestedToast(cur.c); else say('Harvested ' + C.CROPS[cur.c].name.toLowerCase() + '! In your bag.'); }
      else if (!quiet) say('Not ready yet (' + C.fmtTime(growOf(cur) * (1 - progress(cur))) + ' left' + (cur.w ? '' : ', needs water') + ').');
    });
  } else if (tool === 'seed') {
    if (!cur || cur.k !== 't') { if (!quiet) say(cur ? 'Something is already growing there.' : 'Plow the soil first.'); return; }
    const pick = cropForTile(i);
    if (!pick) { if (!quiet || !outWarn()) say('No seeds to plant. Buy a pack at the barn (or switch a seed back on).'); return; }
    save.seeds[pick]--; stat('plant'); hud(); queueSave(); buildSeedBar(); { const nt = { k: 'c', c: pick, p: now, w: (quiet && save.up.sprinkler) ? now : 0 }; if (cur.u) nt.u = 1; ref.set(nt); }
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
let hostIsMe = true;
const mineAnimal = a => !!a && (a.o ? (me && a.o === me.uid) : hostIsMe);   // animals belong to whoever bought them; old unowned ones belong to the room host
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
    const ready = mineAnimal(a) && now >= (a.r || 0); m.userData.icon.visible = ready; if (ready) m.userData.icon.rotation.y += dt * 2;
  });
}
function nearestReadyAnimal() {
  let best = null, bd = save.up.whistle ? 8.4 : 4.2; const now = nowMs();
  Object.keys(animalViews).forEach(function (id) { const a = animals[id]; if (!mineAnimal(a) || now < (a.r || 0)) return; const m = animalViews[id].mesh, d = Math.hypot(m.position.x - player.x, m.position.z - player.z); if (d < bd) { bd = d; best = id; } });
  return best;
}
function collect(id) {
  const a = animals[id]; if (!mineAnimal(a)) return; const def = C.ANIMALS[a.t];
  roomRef.child('animals/' + id + '/r').transaction(function (r) { return nowMs() >= (r || 0) ? nowMs() + def.every : undefined; }, function (e, ok) {
    if (ok) { addItem(def.prod, 1); stat(def.stat || def.prod); addXp(C.XP_PRODUCT[def.prod]); say(C.GOODS[def.prod].icon + ' Collected ' + def.prod + ' — in your bag.'); } else say('Not ready yet.');
  });
}

// ------------------------------------------------------------ barn: seeds / sell / kitchen / animals / orders / upgrades
let shopTab = 'seeds';
// only touch the page when the menu content really changed (a redraw between mouse-down and mouse-up would swallow a click)
function ownedCount() { return Math.max(1, myFieldCount()); }
function addHtml(box, html) { box.insertAdjacentHTML('beforeend', html); }   // never use innerHTML += here: it rebuilds the buttons already added and silently drops their click handlers
function commitShop(n, id) { const cur = $(id); if (cur.innerHTML !== n.innerHTML) { cur.innerHTML = ''; while (n.firstChild) cur.appendChild(n.firstChild); } }
const TABS = [['seeds', '🌱 Seeds'], ['sell', '💰 Sell'], ['kitchen', '🍳 Kitchen'], ['animals', '🐔 Animals'], ['store', '🧪 Store'], ['orders', '📋 Orders'], ['missions', '📜 Missions'], ['ach', '🏆 Achievements'], ['land', '🏞️ Land'], ['upgrades', '🚜 Tractor']];
const nearShop = () => Math.hypot(player.x - W.SHOP_POS.x, player.z - W.SHOP_POS.z) < 6;
const today = () => C.dayNumber(nowMs());
function counts() { const c = {}; Object.keys(C.ANIMALS).forEach(function (k) { c[k] = 0; }); Object.keys(animals).forEach(function (id) { if (mineAnimal(animals[id]) && c[animals[id].t] !== undefined) c[animals[id].t]++; }); return c; }
function row(html, buttons) { const r = document.createElement('div'); r.className = 'item'; r.innerHTML = '<div>' + html + '</div>'; const b = document.createElement('div'); b.className = 'btns'; (buttons || []).forEach(function (x) { const el = document.createElement('button'); el.className = 'b'; el.textContent = x.t; el.disabled = !!x.off; el.onclick = function () { x.f(); renderShop(); }; b.appendChild(el); }); r.appendChild(b); return r; }
function renderShop() {
  const tabs = document.createElement('div');
  TABS.forEach(function (t) { const b = document.createElement('button'); b.textContent = t[1]; b.className = t[0] === shopTab ? 'sel' : ''; b.onclick = function () { shopTab = t[0]; renderShop(); }; tabs.appendChild(b); });
  const box = document.createElement('div'), l = level(), d = today(); box.innerHTML = '<div class="item" style="border:0;padding-top:0"><div><b style="color:#fde68a">$' + save.coins + '</b> · Level <b>' + l + '</b></div></div>';
  if (!nearShop() && shopTab !== 'seeds' && shopTab !== 'missions') addHtml(box, '<div class="item" style="border:0;color:#fbbf24">Walk to the barn door to trade. You can still look around.</div>');
  const can = nearShop();
  if (shopTab === 'seeds') {
    addHtml(box, '<div class="item" style="border:0"><small>One pack plants many tiles. A one-field pack covers a whole field. Every kind of seed you own is spread evenly across each field: one kind = all of it, two = half and half, three = thirds.</small></div>');
    C.CROP_IDS.forEach(function (id) {
      const c = C.CROPS[id], lock = l < c.level, price = C.priceOf(id, d);
      box.appendChild(row(c.icon + ' <b>' + c.name + '</b> <small>' + (lock ? 'Unlocks at level ' + c.level : 'sells ~$' + price + ' each · ' + c.grow / 60000 + ' min to grow · you have ' + (save.seeds[id] || 0) + ' seeds') + '</small>',
        lock ? [{ t: '🔒 Lv ' + c.level, off: true, f: function () {} }] : C.PACKS.filter(function (n) { return n <= Math.max(C.FIELD_TILES, ownedCount() * C.FIELD_TILES); }).map(function (n) { const cost = C.packPrice(id, n); return { t: C.packLabel(n) + ' · $' + cost, off: !can || save.coins < cost, f: function () { if (save.coins < cost) return; setCoins(-cost); save.seeds[id] = (save.seeds[id] || 0) + n; stat('buy'); hud(); queueSave(); buildSeedBar(); say('Bought ' + n + ' ' + c.name.toLowerCase() + ' seeds.'); } }; })));
    });
  } else if (shopTab === 'sell') {
    const ids = Object.keys(save.bag); if (!ids.length) addHtml(box, '<div class="item"><div>Your bag is empty. Harvest crops and collect eggs, milk and wool.</div></div>');
    let total = 0; ids.forEach(function (id) { total += (save.bag[id] || 0) * C.priceOf(id, d); });
    ids.forEach(function (id) {
      const g = C.GOODS[id], n = save.bag[id], p = C.priceOf(id, d), base = g.sell, arrow = p > base ? '▲' : p < base ? '▼' : '';
      box.appendChild(row(g.icon + ' <b>' + g.name + '</b> ×' + n + ' <small>today $' + p + ' each ' + arrow + '</small>', [{ t: 'Sell 1', off: !can, f: function () { sell(id, 1); } }, { t: 'Sell all', off: !can, f: function () { sell(id, n); } }]));
    });
    if (ids.length) box.appendChild(row('<b>Sell everything</b> <small>$' + total + ' total</small>', [{ t: 'Sell all', off: !can, f: function () { ids.slice().forEach(function (id) { sell(id, save.bag[id], true); }); say('Sold everything for $' + total + ''); } }]));
  } else if (shopTab === 'kitchen') {
    C.RECIPES.forEach(function (r) {
      const g = C.GOODS[r.id], lock = l < r.level, have = Object.keys(r.needs).every(function (k) { return (save.bag[k] || 0) >= r.needs[k]; });
      const need = Object.keys(r.needs).map(function (k) { return r.needs[k] + '× ' + C.GOODS[k].icon + ' (' + (save.bag[k] || 0) + ')'; }).join(' + ');
      box.appendChild(row(g.icon + ' <b>' + g.name + '</b> <small>' + (lock ? 'Unlocks at level ' + r.level : need + ' · worth ~$' + C.priceOf(r.id, d) + '') + '</small>',
        [{ t: lock ? '🔒' : 'Make', off: lock || !have || !can, f: function () { Object.keys(r.needs).forEach(function (k) { addItem(k, -r.needs[k]); }); addItem(r.id, 1); stat('cook'); say('Made ' + g.name.toLowerCase() + '!'); } }]));
    });
  } else if (shopTab === 'animals') {
    const c = counts();
    addHtml(box, '<div class="item" style="border:0"><small>Animals give a product every few minutes. Collect it when the icon floats over them: +' + Object.keys(C.XP_PRODUCT).map(function (k) { return C.XP_PRODUCT[k] + ' xp per ' + k; }).join(', ') + '.</small></div>');
    Object.keys(C.ANIMALS).forEach(function (k) {
      const a = C.ANIMALS[k], lock = l < a.level, sells = C.priceOf(a.prod, d), perHour = Math.round(3600000 / a.every * sells);
      box.appendChild(row(a.icon + ' <b>' + a.name + '</b> · <b style="color:#fde68a">$' + a.cost + '</b> <small>' + (lock ? 'Unlocks at level ' + a.level + ' · ' : '') + 'you own ' + c[k] + '/' + a.max + ' · gives ' + a.prod + ' every ' + a.every / 60000 + ' min · ' + a.prod + ' sells ~$' + sells + ' (about $' + perHour + '/hour each) · +' + C.XP_PRODUCT[a.prod] + ' xp each</small>',
        [{ t: lock ? '🔒 Lv ' + a.level : 'Buy $' + a.cost, off: lock || !can || c[k] >= a.max || save.coins < a.cost, f: function () { if (save.coins < a.cost || counts()[k] >= a.max) return; setCoins(-a.cost); roomRef.child('animals/' + Date.now().toString(36) + Math.floor(Math.random() * 99)).set({ t: k, o: me.uid, n: myName, r: nowMs() + a.every }); say('Bought a ' + a.name.toLowerCase() + '!'); } }]));
    });
  } else if (shopTab === 'store') {
    addHtml(box, '<div class="item" style="border:0"><small>Field work goes: plow → cultivate → plant → water → fertilize → harvest. Cultivated soil grows crops 10% faster and fertilizer makes a growing crop 25% faster (both are used up when you harvest). You have <b>' + save.fert + '</b> fertilizer.</small></div>');
    C.FERT.packs.forEach(function (n) { const cost = C.fertPrice(n); box.appendChild(row(C.FERT.icon + ' <b>Fertilizer ×' + n + '</b> <small>$' + (cost / n).toFixed(1) + ' each · unlocks with the Fertilize tool at level ' + C.TOOL_LEVEL.fert + '</small>',
      [{ t: 'Buy $' + cost, off: !can || save.coins < cost, f: function () { if (save.coins < cost) return; setCoins(-cost); save.fert += n; stat('buy'); hud(); queueSave(); say('Bought ' + n + ' fertilizer.'); } }])); });
    let dry = 0; Object.keys(tiles).forEach(function (k) { const t = tiles[k]; if (t && t.k === 'c' && !t.w && isMine(W.fieldOf(+k))) dry++; });
    box.appendChild(row('🌧️ <b>Rain dance</b> <small>Waters every dry crop in your fields right now · ' + dry + ' waiting</small>', [{ t: 'Call rain $60', off: !can || save.coins < 60 || !dry, f: function () {
      if (save.coins < 60) return; const now = nowMs(); let n = 0; Object.keys(tiles).forEach(function (k) { const t = tiles[k]; if (t && t.k === 'c' && !t.w && isMine(W.fieldOf(+k))) { roomRef.child('tiles/' + k + '/w').set(now); n++; } });
      setCoins(-60); say('🌧️ The rain dance watered ' + n + ' crops!'); } }]));
    addHtml(box, '<div class="item" style="border:0"><small>More to buy elsewhere in the barn: new animals (ducks, goats), more land, tractor upgrades, and new recipes in the Kitchen.</small></div>');
  } else if (shopTab === 'orders') {
    const nowT = nowMs(), list = C.ordersFor(d, l);
    Object.keys(save.orders.done).forEach(function (id) { if (parseInt(id, 10) < d - 4) delete save.orders.done[id]; });
    const left = function (ms) { const m = Math.max(0, Math.floor(ms / 60000)), dd = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60); return dd ? dd + 'd ' + hh + 'h' : hh + 'h ' + (m % 60) + 'm'; };
    const endsAt = function (ms) { return new Date(ms).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }); };
    let lastKind = '';
    list.forEach(function (o) {
      const g = C.GOODS[o.item], done = save.orders.done[o.id], have = (save.bag[o.item] || 0) >= o.qty, kind = o.days > 1 ? 'multi' : 'today';
      if (kind !== lastKind) { lastKind = kind; addHtml(box, '<div class="item" style="border:0;padding:10px 0 2px"><b>' + (kind === 'today' ? '🌙 Today only' : '⏳ Multi-day orders') + '</b> <small>' + (kind === 'today' ? 'these end at the end of the day (UTC midnight)' : 'bigger orders that stay open for several days') + '</small></div>'); }
      box.appendChild(row((o.days > 1 ? '⏳' : '📋') + ' <b>' + o.qty + '× ' + g.name + '</b> ' + g.icon + ' <small>reward $' + o.reward + ' · you have ' + (save.bag[o.item] || 0) + ' · ' + (o.days > 1 ? left(o.expires - nowT) + ' left (until ' + endsAt(o.expires) + ')' : left(o.expires - nowT) + ' left today') + '</small>',
        [{ t: done ? '✅ Done' : 'Deliver', off: done || !have || !can, f: function () { addItem(o.item, -o.qty); setCoins(o.reward); stat('orders'); save.orders.done[o.id] = true; say('Order complete! +$' + o.reward + ''); } }]));
    });
    addHtml(box, '<div class="item" style="border:0"><small>New orders arrive every day (UTC midnight). Multi-day orders stay open until their time is up, so you can work on them over several days.</small></div>');
  } else if (shopTab === 'ach') {
    const n = C.ACHIEVEMENTS.filter(function (a) { return save.ach[a.id]; }).length;
    addHtml(box, '<div class="item" style="border:0"><small>' + n + ' of ' + C.ACHIEVEMENTS.length + ' earned. Each one you earn pops up for everyone on the site.</small></div>');
    C.ACHIEVEMENTS.forEach(function (a) { const got = !!save.ach[a.id]; box.appendChild(row((got ? '✅ ' : '🔒 ') + a.icon + ' <b>' + a.name + '</b> <small>' + a.desc + '</small>', [])); });
  } else if (shopTab === 'missions') {
    const lv = level(), daily = ensureDaily();
    addHtml(box, '<div class="item" style="border:0"><small>XP: harvest +' + C.xpShow(C.XP_HARVEST) + ' · egg +' + C.xpShow(C.XP_PRODUCT.egg) + ' · wool +' + C.xpShow(C.XP_PRODUCT.wool) + ' · milk +' + C.xpShow(C.XP_PRODUCT.milk) + '. XP only comes from harvesting your own crops and collecting animals (every farmer has their own animals, store and missions). Missions and orders pay coins. Levels: 25 xp to reach level 2, then 50, 75 ... up to level ' + C.MAX_LEVEL + '.</small></div><div class="item" style="border:0;padding:4px 0"><b>Today\u2019s missions</b> <small>(reset at midnight)</small></div>');
    daily.forEach(function (m, k) {
      const p = Math.min(m.goal, dailyProgress(m)), ready = p >= m.goal, done = save.daily.done[k];
      box.appendChild(row(C.STATS[m.stat].icon + ' <b>' + m.text + '</b> <small>' + p + '/' + m.goal + ' · reward $' + m.coins + '</small>',
        [{ t: done ? '✅ Claimed' : ready ? 'Claim' : p + '/' + m.goal, off: done || !ready, f: function () { save.daily.done[k] = true; reward({ xp: m.xp, coins: m.coins }, m.text); } }]));
    });
    addHtml(box, '<div class="item" style="border:0;padding:10px 0 4px"><b>Milestones</b> <small>(these never expire)</small></div>');
    Object.keys(C.STATS).forEach(function (st) {
      if (!C.statUnlocked(st, lv)) return; const t = nextTier(st), S = C.STATS[st], have = save.stats[st] || 0; if (!t) { box.appendChild(row(S.icon + ' <b>' + S.verb + ' ' + S.noun + '</b> <small>All milestones done!</small>', [])); return; }
      box.appendChild(row(S.icon + ' <b>' + S.verb + ' ' + t.goal + ' ' + S.noun + '</b> <small>' + Math.min(have, t.goal) + '/' + t.goal + ' · reward $' + t.reward.coins + '</small>',
        [{ t: have >= t.goal ? 'Claim' : Math.min(have, t.goal) + '/' + t.goal, off: have < t.goal, f: function () { save.ms[st] = t.idx + 1; reward(t.reward, S.verb + ' ' + t.goal + ' ' + S.noun); } }]));
    });
  } else if (shopTab === 'land') {
    const mine = myFieldCount(), nl = nextLand();
    addHtml(box, '<div class="item" style="border:0"><small>Every player works their own fields; other people can look but not touch. You own ' + mine + ' fields (' + visibleFields() + ' plots on the map; a new plot appears whenever fewer than 2 are for sale)' + (nl ? '. Your next field costs $' + nl.cost.toLocaleString() + ' (level ' + nl.level + ').' : '.') + ' Animals are the one thing shared by everyone on the farm.</small></div>');
    W.FIELDS.slice(0, visibleFields()).forEach(function (F, f) {
      const o = ownedFields[f];
      if (o) { box.appendChild(row((isMine(f) ? '🌾' : '👤') + ' <b>Field ' + (f + 1) + '</b> <small>' + (isMine(f) ? 'yours' : 'owned by ' + WW.esc(o.n || 'a friend')) + ' · 240 tiles</small>', [])); return; }
      const lock = !nl || l < nl.level, cost = nl ? nl.cost : 0;
      box.appendChild(row('🏞️ <b>Field ' + (f + 1) + '</b> · <b style="color:#fde68a">' + (nl ? '$' + nl.cost.toLocaleString() : 'n/a') + '</b> <small>' + (nl && l < nl.level ? 'Unlocks at level ' + nl.level + ' · ' : '') + 'for sale · 240 tiles</small>',
        [{ t: !nl ? 'All yours' : l < nl.level ? '🔒 Lv ' + nl.level : 'Buy $' + cost.toLocaleString(), off: lock || !can || save.coins < cost, f: function () {
          if (!nl || save.coins < cost) return;
          roomRef.child('fields/' + f).transaction(function (cur) { return cur ? undefined : { uid: me.uid, n: myName, t: nowMs() }; }, function (e, ok) { if (ok) { setCoins(-cost); say('You bought Field ' + (f + 1) + '!'); } else say('Someone just bought that field.'); });
        } }]));
    });
  } else if (shopTab === 'upgrades') {
    Object.keys(C.UPGRADES).forEach(function (k) {
      const u = C.UPGRADES[k], has = save.up[k], pre = u.needs && !save.up[u.needs], lock = l < u.level || pre;
      box.appendChild(row('🚜 <b>' + u.name + '</b> <small>' + u.desc + (l < u.level ? ' · unlocks at level ' + u.level : pre ? ' · buy ' + C.UPGRADES[u.needs].name + ' first' : '') + '</small>',
        [{ t: has ? '✅ Owned' : l < u.level ? '🔒 Lv ' + u.level : pre ? '🔒 Needs ' + C.UPGRADES[u.needs].name : '$' + u.cost, off: has || lock || !can || save.coins < u.cost, f: function () { setCoins(-u.cost); save.up[k] = 1; say(u.name + ' installed!'); applyImplement(); queueSave(); } }]));
    });
    addHtml(box, '<div class="item" style="border:0"><small>Drive the tractor over your field: it plows, plants, waters or harvests ' + swath() + ' tiles at once, whichever tool you have selected. The Farm whistle also works on foot.</small></div>');
  }
  commitShop(tabs, 'shopTabs'); commitShop(box, 'shopItems');
}
function sell(id, n, quiet) { n = Math.min(n, save.bag[id] || 0); if (n < 1) return; const p = C.priceOf(id, today()) * n; addItem(id, -n); stat('sell', n); setCoins(p); if (!quiet) say('Sold ' + n + ' ' + C.GOODS[id].name.toLowerCase() + ' for $' + p + ''); }
function openShop(tab) { if (tab) shopTab = tab; renderShop(); $('shop').style.display = 'flex'; }
$('shopClose').onclick = function () { $('shop').style.display = 'none'; };
$('bagBtn').onclick = function () { openShop('sell'); }; $('missionsBtn').onclick = function () { openShop('missions'); };

// ------------------------------------------------------------ missions: daily goals + milestone ladders (FarmVille style)
function ensureDaily() {
  const key = C.localDayKey(new Date());
  if (save.daily.day !== key || !save.daily.list) { save.daily = { day: key, base: Object.assign({}, save.stats), done: [], list: C.dailyMissions(key, level()) }; queueSave(); }   // the list is fixed for the whole day
  return save.daily.list;
}
function dailyProgress(m) { return Math.max(0, (save.stats[m.stat] || 0) - ((save.daily.base || {})[m.stat] || 0)); }
function nextTier(stat) { const done = save.ms[stat] || 0, goal = C.LADDER[done]; return goal ? { goal: goal, idx: done, reward: C.tierReward(goal) } : null; }
function claimable() {
  const lv = level(); let any = false;
  ensureDaily().forEach(function (m, k) { if (!save.daily.done[k] && dailyProgress(m) >= m.goal) any = true; });
  Object.keys(C.STATS).forEach(function (st) { if (!C.statUnlocked(st, lv)) return; const t = nextTier(st); if (t && (save.stats[st] || 0) >= t.goal) any = true; });
  return any;
}
function reward(r, label) { setCoins(r.coins); say('📜 ' + label + ' complete! +$' + r.coins); }   // missions pay coins only: XP comes from harvesting and animals

// ------------------------------------------------------------ toolbar
const TOOLS = [{ id: 'hoe', label: '⛏️ Plow', color: 0x8a6a4a }, { id: 'cultivate', label: '🌿 Cultivate', color: 0xb98a52 }, { id: 'seed', label: '🌱 Plant', color: 0x6abf4b }, { id: 'water', label: '💧 Water', color: 0x4aa3ff }, { id: 'fert', label: '🧪 Fertilize', color: 0xc084fc }, { id: 'harvest', label: '🧺 Harvest', color: 0xf2c200 }];
const bar = $('bar'), seedBar = $('seedBar');
TOOLS.forEach(function (t) { const b = document.createElement('button'); b.textContent = t.label; b.dataset.id = t.id; b.onclick = function () { setTool(t.id); }; bar.appendChild(b); });
function applyImplement() {
  const t = TOOLS.filter(function (x) { return x.id === tool; })[0]; W.setImplement(tractor, t.color); tractor.userData.impl.scale.x = swath() / 3;
}
function setTool(id) {
  if (level() < (C.TOOL_LEVEL[id] || 1)) { say(TOOLS.filter(function (x) { return x.id === id; })[0].label.replace(/^\S+ /, '') + ' unlocks at level ' + C.TOOL_LEVEL[id] + '.'); return; }
  tool = id; [].forEach.call(bar.children, function (b) { b.classList.toggle('sel', b.dataset.id === id); }); seedBar.style.display = id === 'seed' ? '' : 'none'; applyImplement(); }
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
  if (k >= '1' && k <= '6') { setTool(TOOLS[+k - 1].id); return; }
  if (k === 'b') { openShop('sell'); return; }
  if (k === 'm') { openShop('missions'); return; }
  if (k === 'e' || k === ' ') { e.preventDefault(); if (!e.repeat) useAction(); return; }
  if (k === 'escape') $('shop').style.display = 'none';
  keys[k] = true; if (k.indexOf('arrow') === 0) e.preventDefault();
});
window.addEventListener('keyup', function (e) { delete keys[e.key.toLowerCase()]; });
// A right-click menu, switching tabs or clicking another window swallows the key-up, which left the farmer walking forever: let go of everything then.
function releaseAll() { Object.keys(keys).forEach(function (k) { delete keys[k]; }); drag = null; joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; }
window.addEventListener('blur', releaseAll); window.addEventListener('contextmenu', releaseAll); window.addEventListener('pagehide', releaseAll);
document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // no browser menu over the farm, so right-drag can turn the camera
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
const facingTile = () => { const i = tileAt(player.x + Math.sin(player.ry) * 1.9, player.z + Math.cos(player.ry) * 1.9); return (i >= 0 && W.fieldOf(i) < visibleFields()) ? i : -1; };
function toolLabel() { return tool === 'seed' ? 'Plant' : TOOLS.filter(function (t) { return t.id === tool; })[0].label.replace(/^\S+ /, ''); }
function tileInfo(i) {
  const f = W.fieldOf(i), o = ownedFields[f]; if (!o) { const nl = nextLand(); return 'Field ' + (f + 1) + ' is for sale' + (nl ? ': $' + nl.cost.toLocaleString() + ' for you (level ' + nl.level + ') at the barn' : ''); } if (!isMine(f)) return (o.n || 'Another farmer') + '\u2019s field (look, don\u2019t touch)';
  const t = tiles[i]; if (!t) return 'Grass'; if (t.k === 't') return t.u ? 'Plowed soil · cultivated (crops grow 10% faster)' : 'Plowed soil'; const c = C.CROPS[t.c], p = progress(t);
  return c.icon + ' ' + c.name + ' — ' + (t.u || t.f ? ' ' + (t.u ? '🌿' : '') + (t.f ? '🧪' : '') + ' ' : '') + (!t.w ? 'waiting for water or rain' : p >= 1 ? 'ready to harvest!' : Math.round(p * 100) + '% · ' + C.fmtTime(growOf(t) * (1 - p)) + ' left');
}
function context() {
  if (player.driving) return { kind: 'exit', text: 'Exit tractor (E)', info: toolLabel() + ' · ' + swath() + ' tiles wide' + (tool === 'seed' ? ' · ' + mixText() : '') };
  const id = nearestReadyAnimal(); if (id) return { kind: 'collect', id: id, text: 'Collect ' + C.ANIMALS[animals[id].t].prod + ' (E)' };
  if (nearShop()) return { kind: 'shop', text: 'Open the barn (E)', info: 'Buy seeds · sell goods · orders · upgrades' };
  if (Math.hypot(player.x - tractorState.x, player.z - tractorState.z) < 4) return { kind: 'drive', text: 'Drive your tractor (E)' };
  const i = facingTile(); if (i >= 0) return { kind: 'tile', i: i, text: toolLabel() + ' (E)', info: tool === 'seed' ? mixText() + ' · ' + tileInfo(i) : tileInfo(i) };
  return null;
}
function useAction() {
  if (!me || $('shop').style.display === 'flex') return; const c = context(); if (!c) return;
  if (c.kind === 'collect') collect(c.id);
  else if (c.kind === 'shop') openShop('seeds');
  else if (c.kind === 'tile') actTile(c.i, false);
  else if (c.kind === 'drive') {
    player.driving = true; tractorLocal.x = tractorState.x; tractorLocal.z = tractorState.z; tractorLocal.ry = tractorState.ry; tractorLocal.speed = 0; player.x = tractorLocal.x; player.z = tractorLocal.z;
    say('Tractor: your tool works on ' + swath() + ' tiles at once. W/S drive, A/D steer.'); applyImplement();
  } else if (c.kind === 'exit') {
    player.driving = false; tractorLocal.speed = 0; player.x = tractorLocal.x + Math.cos(tractorLocal.ry) * 2.8; player.z = tractorLocal.z - Math.sin(tractorLocal.ry) * 2.8;
    tractorState = { x: +tractorLocal.x.toFixed(2), z: +tractorLocal.z.toFixed(2), ry: +tractorLocal.ry.toFixed(3) }; roomRef.child('tractors/' + me.uid).set(tractorState);
  }
}

// ------------------------------------------------------------ level badge: a round "LV n" badge that follows each farmer's head on screen (it replaces the profile picture)
const domBadges = [];
function giveLevel(mesh, getLv, label) {
  const u = mesh.userData; u.getLv = getLv; if (u.domBadge && u.domBadge.isConnected) return;
  const el = document.createElement('div'); el.title = label || '';
  el.style.cssText = 'position:fixed;z-index:4;border-radius:50%;border:3px solid #fff;background:linear-gradient(#fbbf24,#d97706);color:#2a1500;font-family:system-ui,sans-serif;font-weight:800;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;line-height:1;transform:translate(-50%,-100%);text-shadow:0 1px 0 #fff6';
  document.body.appendChild(el); u.domBadge = el; domBadges.push({ mesh: mesh, el: el });
}
const _v = new THREE.Vector3();
function updateDomBadges() {
  for (let i = domBadges.length - 1; i >= 0; i--) {
    const b = domBadges[i]; if (!b.el.isConnected) { domBadges.splice(i, 1); continue; }
    if (!b.mesh.visible || !b.mesh.parent) { b.el.style.display = 'none'; continue; }
    _v.set(b.mesh.position.x, 3.5, b.mesh.position.z).project(camera);
    if (_v.z > 1) { b.el.style.display = 'none'; continue; }
    const dd = camera.position.distanceTo(b.mesh.position), px = Math.max(30, Math.min(56, 520 / dd)), lv = Math.max(1, (b.mesh.userData.getLv && b.mesh.userData.getLv()) | 0);
    if (b.el.dataset.lv !== String(lv)) { b.el.dataset.lv = String(lv); b.el.innerHTML = '<small style="font-size:.5em;letter-spacing:.08em">LV</small><span style="font-size:1em">' + lv + '</span>'; }
    b.el.style.width = b.el.style.height = px + 'px'; b.el.style.fontSize = (px * .4) + 'px'; b.el.style.left = ((_v.x + 1) / 2 * window.innerWidth) + 'px'; b.el.style.top = ((1 - _v.y) / 2 * window.innerHeight) + 'px'; b.el.style.display = 'flex';
  }
}
function dropBadge(mesh) { const d = mesh.userData.domBadge; if (d) d.remove(); }

// ------------------------------------------------------------ other players
const remote = {};
function avatarFor(u) { return avatars[u] || ''; }
function peersText() {
  const dot = function (hex) { return '<span style="display:inline-block;width:.7em;height:.7em;border-radius:50%;background:' + (hex || '#94a3b8') + ';margin-right:3px"></span>'; };
  const list = [dot(myColor) + '<b>' + WW.esc(myName) + '</b> Lv ' + level()]; const now = nowMs();
  Object.keys(players).forEach(function (u) { const p = players[u]; if (me && u === me.uid) return; if (now - (p.t || 0) > 45000) return; list.push(dot(colors[u]) + '<b>' + WW.esc(p.n || 'Friend') + '</b> Lv ' + (p.lv || 1)); });
  return list.join(' &nbsp;·&nbsp; ');
}
function renderPeers() { const el = $('peers'); if (!el) return; el.style.display = isMP ? '' : 'none'; if (isMP) { const h = peersText(); if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = '👥 ' + h; } } }
function syncRemotes() {
  const now = nowMs();
  Object.keys(players).forEach(function (u) {
    if (me && u === me.uid) return; const p = players[u]; if (now - (p.t || 0) > 45000) return; let r = remote[u];
    if (!r) { const m = W.makeFarmer(p.h || .3), lab = W.makeLabel(p.n || 'Friend', '#bae6fd'); lab.position.y = 4.5; m.add(lab); scene.add(m); r = remote[u] = { mesh: m, tractor: null, tcol: null }; m.position.set(p.x, 0, p.z); }
    r.tx = p.x; r.tz = p.z; r.try = p.r || 0; r.driving = !!p.v; r.px = p.tx; r.pz = p.tz; r.pr = p.tr || 0; giveLevel(r.mesh, function () { const q = players[u]; return (q && q.lv) || 1; }, p.n); if (avatarFor(u)) W.setAvatar(r.mesh, avatarFor(u));
    const col = colors[u] || '';
    if (!r.tractor || r.tcol !== col) { if (r.tractor) scene.remove(r.tractor); r.tcol = col; r.tractor = W.makeTractor(col ? parseInt(col.slice(1), 16) : undefined); scene.add(r.tractor); const t = r.tractor; t.position.set(r.driving ? p.x : (p.tx === undefined ? p.x : p.tx), 0, r.driving ? p.z : (p.tz === undefined ? p.z : p.tz)); }
  });
  Object.keys(remote).forEach(function (u) { const p = players[u]; if (!p || now - (p.t || 0) > 45000) { dropBadge(remote[u].mesh); scene.remove(remote[u].mesh); if (remote[u].tractor) scene.remove(remote[u].tractor); delete remote[u]; } });
  $('count').textContent = Math.max(1, Object.keys(remote).length + 1); renderPeers();
}
function updateRemotes(dt) {
  Object.keys(remote).forEach(function (u) {
    const r = remote[u], m = r.mesh, dx = r.tx - m.position.x, dz = r.tz - m.position.z, d = Math.hypot(dx, dz);
    m.position.x += dx * Math.min(1, dt * 10); m.position.z += dz * Math.min(1, dt * 10);
    let da = r.try - m.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; m.rotation.y += da * Math.min(1, dt * 10);
    m.visible = !r.driving; W.animateFarmer(m, d * 10 > .3 ? 4 : 0, dt);
    if (r.tractor) {   // their own tractor: under them while they drive, otherwise parked where they left it
      const tx = r.driving ? m.position.x : (r.px === undefined ? m.position.x : r.px), tz = r.driving ? m.position.z : (r.pz === undefined ? m.position.z : r.pz);
      r.tractor.position.x += (tx - r.tractor.position.x) * Math.min(1, dt * 10); r.tractor.position.z += (tz - r.tractor.position.z) * Math.min(1, dt * 10);
      r.tractor.rotation.y = r.driving ? m.rotation.y : r.pr;
    }
  });
}

// ------------------------------------------------------------ minimap: whole farm, with a red pin on every animal that is ready to collect (tap it to enlarge)
const mini = document.createElement('canvas'); mini.id = 'mini';
mini.style.cssText = 'position:fixed;left:auto;bottom:auto;right:8px;top:96px;z-index:6;border-radius:12px;border:2px solid #ffffff44;background:#13301c;touch-action:manipulation;cursor:pointer';
document.body.appendChild(mini);
let miniBig = false;
const MM = { x0: -74, x1: 74, z0: -50, z1: 60 };
function sizeMini() {
  const ratio = (MM.z1 - MM.z0) / (MM.x1 - MM.x0), base = miniBig ? Math.min(window.innerWidth - 16, 330) : 150, maxH = window.innerHeight * (miniBig ? .72 : .4), w = Math.round(Math.min(base, maxH / ratio));
  mini.width = w; mini.height = Math.round(w * ratio); mini.style.width = mini.width + 'px'; mini.style.height = mini.height + 'px';
}
mini.addEventListener('click', function () { miniBig = !miniBig; sizeMini(); });
sizeMini();
function drawMini() {
  const vis = visibleFields(); let zmax = 60; for (let f = 0; f < vis; f++) zmax = Math.max(zmax, W.FIELDS[f].z0 + W.ROWS * W.TILE + 4);
  if (zmax !== MM.z1) { MM.z1 = zmax; sizeMini(); }
  const w = mini.width, h = mini.height, g = mini.getContext('2d'), k = Math.min(w / (MM.x1 - MM.x0), h / (MM.z1 - MM.z0));
  const ox = (w - (MM.x1 - MM.x0) * k) / 2, oz = (h - (MM.z1 - MM.z0) * k) / 2, X = x => ox + (x - MM.x0) * k, Z = z => oz + (z - MM.z0) * k, t = performance.now();
  g.clearRect(0, 0, w, h); g.fillStyle = '#1d3d27'; g.fillRect(0, 0, w, h);
  W.FIELDS.slice(0, vis).forEach(function (F, f) { g.fillStyle = isMine(f) ? '#4a3a26' : ownedFields[f] ? '#4a4034' : '#3f4a3f'; g.fillRect(X(F.x0), Z(F.z0), W.COLS * W.TILE * k, W.ROWS * W.TILE * k); if (isMine(f)) { g.strokeStyle = '#4ade80'; g.lineWidth = 1.5; g.strokeRect(X(F.x0), Z(F.z0), W.COLS * W.TILE * k, W.ROWS * W.TILE * k); } });
  // my tiles: plowed = dark soil, planted (not watered yet) = brown, growing = green, ready to harvest = gold
  const nowT = nowMs(), ts = Math.max(1.2, W.TILE * k - .4);
  Object.keys(tiles).forEach(function (key) {
    const i = +key, t = tiles[i]; if (!t || !isMine(W.fieldOf(i)) || W.fieldOf(i) >= vis) return; const p = tilePos(i);
    g.fillStyle = t.k === 't' ? (t.u ? '#7a5a36' : '#5a4026') : !t.w ? '#b0742f' : progress(t, nowT) >= 1 ? '#facc15' : '#3fb950';
    g.fillRect(X(p.x) - ts / 2, Z(p.z) - ts / 2, ts, ts);
  });
  [[W.CHICKEN_PEN, '#c9a45c'], [W.COW_PASTURE, '#5f9a45']].forEach(function (pn) { const p = pn[0]; g.fillStyle = pn[1]; g.globalAlpha = .75; g.fillRect(X(p.x0), Z(p.z0), (p.x1 - p.x0) * k, (p.z1 - p.z0) * k); g.globalAlpha = 1; });
  g.fillStyle = '#c0392b'; g.fillRect(X(W.SHOP_POS.x) - 4, Z(W.SHOP_POS.z) - 4, 8, 8);
  g.fillStyle = '#facc15'; g.fillRect(X(tractorState.x) - 3, Z(tractorState.z) - 3, 6, 6);
  Object.keys(remote).forEach(function (u) { const m = remote[u].mesh; if (!m || !m.visible) return; g.fillStyle = '#60a5fa'; g.beginPath(); g.arc(X(m.position.x), Z(m.position.z), 3, 0, 7); g.fill(); });
  const now = nowMs(); let best = null, bd = 1e9;
  Object.keys(animalViews).forEach(function (id) {
    const a = animals[id]; if (!a) return; const m = animalViews[id].mesh, x = X(m.position.x), z = Z(m.position.z), ready = now >= (a.r || 0);
    g.fillStyle = ({ chicken: '#ffffff', duck: '#fde68a', sheep: '#e5ded0', goat: '#c9a27a' })[a.t] || '#f0f0f0'; g.beginPath(); g.arc(x, z, a.t === 'chicken' ? 2 : 3, 0, 7); g.fill(); g.strokeStyle = '#000a'; g.lineWidth = 1; g.stroke();
    if (ready) { const d = Math.hypot(m.position.x - player.x, m.position.z - player.z); if (d < bd) { bd = d; best = { id: id, t: a.t }; }
      const pulse = 1 + .25 * Math.sin(t / 220); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x, z - 7 * pulse, 4 * pulse, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 3, z - 5 * pulse); g.lineTo(x + 3, z - 5 * pulse); g.lineTo(x, z); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, z - 7 * pulse, 1.6, 0, 7); g.fill(); }
  });
  g.save(); g.translate(X(player.x), Z(player.z)); g.rotate(Math.PI - player.ry); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.fillStyle = '#fff'; g.font = 'bold 10px system-ui,sans-serif'; g.fillText('N ↑', 5, 12);
  if (miniBig) { [['#b0742f', 'planted'], ['#3fb950', 'growing'], ['#facc15', 'ready']].forEach(function (c, n) { g.fillStyle = c[0]; g.fillRect(w - 62, 6 + n * 13, 9, 9); g.fillStyle = '#fff'; g.fillText(c[1], w - 50, 14 + n * 13); }); }
  const label = best ? (C.ANIMALS[best.t].icon + ' ready · ' + Math.round(bd) + ' m') : (Object.keys(animalViews).length ? 'No animal ready yet' : 'No animals yet');
  g.fillStyle = '#000a'; g.fillRect(0, h - 16, w, 16); g.fillStyle = '#fde68a'; g.fillText(label, 5, h - 4);
}

// ------------------------------------------------------------ main loop
let mmT = 0, last = performance.now(), lastSent = 0, lastBeat = 0, lastTrk = 0, camX = 0, camZ = 0, slow = 0;
function collide(p, rad) { W.COLLIDERS.forEach(function (c) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 0) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }); p.x = Math.max(-90, Math.min(90, p.x)); p.z = Math.max(-90, Math.min(250, p.z)); }
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000); last = ts;
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  if (player.driving) {
    const T = tractorLocal, top = 9 * (save.up.fast ? 1.3 : 1) * (save.up.nitro ? 1.25 : 1); T.speed += (iz * top - T.speed) * Math.min(1, dt * 2.2);
    T.ry -= ix * dt * 1.5 * Math.max(-1, Math.min(1, T.speed / 3)); T.x += Math.sin(T.ry) * T.speed * dt; T.z += Math.cos(T.ry) * T.speed * dt;
    const p = { x: T.x, z: T.z }; collide(p, 2); T.x = p.x; T.z = p.z; player.x = T.x; player.z = T.z; player.ry = T.ry; player.speed = Math.abs(T.speed); tractorAuto();
  } else if (mag > .08) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), dx = fx * iz + rx * ix, dz = fz * iz + rz * ix, m = Math.hypot(dx, dz) || 1, sp = 6.2 * Math.min(1, mag);
    player.x += dx / m * sp * dt; player.z += dz / m * sp * dt; const p = { x: player.x, z: player.z }; collide(p, .6); player.x = p.x; player.z = p.z;
    let da = Math.atan2(dx, dz) - player.ry; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; player.ry += da * Math.min(1, dt * 14); player.speed = sp;
  } else player.speed = 0;
  farmer.visible = !player.driving; farmer.position.set(player.x, 0, player.z); farmer.rotation.y = player.ry; W.animateFarmer(farmer, player.speed, dt);
  if (player.driving) { tractor.position.set(tractorLocal.x, 0, tractorLocal.z); tractor.rotation.y = tractorLocal.ry; }
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
  updateDomBadges(); updateRain(dt, isRaining()); updateSky(); updateAnimals(dt); updateRemotes(dt);
  mmT += dt; if (mmT > .12) { mmT = 0; drawMini(); }
  slow += dt; if (slow > .5) { slow = 0; refreshField(); renderPeers(); }
  const now = performance.now();
  if (roomRef && me && now - lastSent > 100 && (player.speed > .1 || now - lastBeat > 8000)) { lastSent = lastBeat = now; roomRef.child('players/' + me.uid).set({ n: myName, x: +player.x.toFixed(2), z: +player.z.toFixed(2), r: +player.ry.toFixed(2), v: player.driving ? 1 : 0, h: +myHue.toFixed(2), lv: level(), tx: +(player.driving ? tractorLocal.x : tractorState.x).toFixed(1), tz: +(player.driving ? tractorLocal.z : tractorState.z).toFixed(1), tr: +(player.driving ? tractorLocal.ry : tractorState.ry).toFixed(2), t: firebase.database.ServerValue.TIMESTAMP }); }
  if (player.driving && now - lastTrk > 1500) { lastTrk = now; roomRef.child('tractors/' + me.uid).set({ x: +tractorLocal.x.toFixed(2), z: +tractorLocal.z.toFixed(2), ry: +tractorLocal.ry.toFixed(3) }); }
  renderer.render(scene, camera); requestAnimationFrame(loop);
}

// ------------------------------------------------------------ start / join
$('shareBtn').onclick = function () {
  if (WW.mode !== 'cloud') { say('Sign in from the games hub to play with friends.'); return; }
  if (!isMP) { say('This is your solo farm. A friend can join you from the games hub (the hub shows them you are playing). You will both move to a multiplayer farm.'); return; }
  const url = location.origin + location.pathname + '?mp=' + hostCode;
  if (navigator.share) navigator.share({ title: 'Join my farm in Neighborly Acre', text: 'Farm code ' + hostCode, url: url }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { say('Invite link copied!'); }); else say('Share this code: ' + hostCode);
};
const hexOk = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());
async function begin(user, myCode) {
  // ?mp=CODE (or the older ?room=CODE) joins the multiplayer farm of that host. No code = your private solo farm.
  hostCode = (qs.get('mp') || qs.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); isMP = !!hostCode; saveKey = isMP ? 'farm_mp_' + hostCode : 'farm';
  let hostName = '';
  if (user) {
    // Signed in: always Firebase, never the device. If Firebase refuses, say so instead of quietly saving locally.
    if (!myCode) { gate('Could not find your friend code. Open the games hub once, then try again.', { back: true }); return; }
    const roomId = isMP ? 'MP-' + hostCode : myCode;
    try {
      roomRef = WW.roomRef('farm', roomId); WW.mode = 'cloud'; let meta = (await roomRef.child('meta').once('value')).val();
      if (!meta) { if (!isMP || hostCode === myCode) { meta = { host: (user.displayName || 'Farmer').split(' ')[0], created: firebase.database.ServerValue.TIMESTAMP }; await roomRef.child('meta').set(meta); } else {
        // the host may be playing solo right now: their status (by friend code) says so, and joining turns it into a multiplayer farm
        const pr = (await WW.db.ref('game_rooms/presence/' + hostCode).once('value')).val();
        if (pr && pr.game === 'farm' && pr.t && nowMs() - pr.t < 150000) { meta = { host: pr.n || hostCode, created: firebase.database.ServerValue.TIMESTAMP }; await roomRef.child('meta').set(meta); }
        else { gate('Multiplayer farm ' + hostCode + ' not found. Your friend is not playing right now. Ask them to open Neighborly Acre first.', { back: true }); return; }
      } }
      if (isMP) {   // up to 8 farmers at a time
        const live = (await roomRef.child('players').once('value')).val() || {}, nowT = nowMs();
        const others = Object.keys(live).filter(function (u) { return u !== user.uid && nowT - ((live[u] && live[u].t) || 0) < 45000; }).length;
        if (others >= 8) { gate('This farm is full (8 players). Try again in a minute, or start your own from the hub.', { back: true }); return; }
      }
      hostName = meta.host || ''; me = user; cloudCode = hostCode || myCode; hostIsMe = !isMP || hostCode === myCode;
      $('roomLabel').textContent = isMP ? 'Multiplayer · ' + (hostName ? hostName + '\u2019s farm' : hostCode) : 'Solo farm';
    } catch (e) { console.warn(e); gate('Your online farm could not be opened (' + (e.code || e.message || 'permission denied') + '). The game database rules need to be published in Firebase — nothing is saved to this device while you are signed in.', { back: true }); return; }
  } else {
    if (isMP) { gate('Sign in to join a multiplayer farm.', { signIn: true }); return; }
    WW.useLocal(); roomRef = WW.roomRef('farm', 'solo'); me = { uid: 'local' }; $('roomLabel').textContent = 'Guest · this device';
  }
  $('gate').style.display = 'none'; myName = ((user && user.displayName) || 'Farmer').split(' ')[0].slice(0, 12);
  try {
    const s = await WW.loadSave(saveKey);   // solo and every multiplayer farm each have their own progress, starting fresh
    if (s) { save.coins = s.coins | 0; save.xp = +s.xp || 0; save.seeds = s.seeds || { wheat: 0 }; save.bag = s.bag || {}; save.up = s.up || {}; save.orders = s.orders || { day: -1, done: [] }; save.harvested = s.harvested | 0;
      // legacy saves (before levels) kept only coins
      if (s.xp === undefined && s.seeds === undefined) { save.seeds = { wheat: 30, carrot: 30 }; } save.fert = s.fert | 0; save.ach = s.ach || {}; save.skip = s.skip || {}; save.stats = s.stats || {}; save.daily = s.daily || { day: -1, base: {}, done: [] }; save.ms = s.ms || {}; if (s.ledKey) save.ledKey = s.ledKey; }
    normalizeSave();
  } catch (e) { console.warn(e); gate('Your saved progress could not be loaded (' + (e.code || e.message) + '). Nothing was changed.', { back: true }); return; }
  if (user) {
    try { myAvatar = (await WW.db.ref('users/' + WW.emailKey(user.email) + '/avatar_url').once('value')).val() || user.photoURL || ''; } catch (e) { myAvatar = user.photoURL || ''; }
    try { const pc = (await WW.db.ref('users/' + WW.emailKey(user.email) + '/primary_color').once('value')).val(); if (hexOk(pc)) myColor = pc.trim(); } catch (e) {}
  }
  giveLevel(farmer, level, myName); if (myAvatar) { W.setAvatar(farmer, myAvatar); roomRef.child('avatars/' + me.uid).set(myAvatar); }
  if (myColor) { paintTractor(parseInt(myColor.slice(1), 16)); roomRef.child('colors/' + me.uid).set(myColor); }
  // fields first (so we know which one is ours), then everything else
  ownedFields = (await roomRef.child('fields').once('value')).val() || {}; await autoClaim(); checkAchievements(true);
  try { const t = (await roomRef.child('tractors/' + me.uid).once('value')).val(); if (t && t.x !== undefined) tractorState = { x: t.x, z: t.z, ry: t.ry || 0 }; else { const ff = firstMyField(), pk = W.parkFor(ff < 0 ? 0 : ff); tractorState = { x: pk.x, z: pk.z, ry: pk.ry }; roomRef.child('tractors/' + me.uid).set(tractorState); } } catch (e) {}
  const ff0 = firstMyField(); if (ff0 >= 0) { const p0 = W.tilePos(ff0 * C.FIELD_TILES + 10); player.x = p0.x; player.z = W.FIELDS[ff0].z0 - 2; }
  normalizeSave(); hud(); buildSeedBar(); applyImplement();
  roomRef.child('avatars').on('value', function (snap) { avatars = snap.val() || {}; syncRemotes(); });
  roomRef.child('colors').on('value', function (snap) { colors = snap.val() || {}; syncRemotes(); });
  roomRef.child('tiles').on('value', function (snap) { const v = snap.val() || {}; tiles = {}; Object.keys(v).forEach(function (k) { tiles[+k] = v[k]; }); refreshField(); });
  roomRef.child('fields').on('value', function (snap) { ownedFields = snap.val() || {}; updateFieldVisuals(); });
  roomRef.child('animals').on('value', function (snap) { animals = snap.val() || {}; syncAnimals(); });
  roomRef.child('players').on('value', function (snap) { players = snap.val() || {}; syncRemotes(); });
  if (isMP) roomRef.child('ledger').on('value', function (snap) { applyLedger(snap.val()); });
  updateFieldVisuals(); renderPeers();
  setInterval(syncRemotes, 5000); setInterval(rainTick, 3000); setInterval(function () { if ($('shop').style.display === 'flex') renderShop(); }, 2000);
  roomRef.child('players/' + me.uid).onDisconnect().remove();
  // friends see on the games hub that you are playing (solo or multiplayer) and can join with one tap
  if (WW.mode === 'cloud' && WW.publishPlaying) {
    const announce = function () { WW.publishPlaying({ game: 'farm', title: 'Neighborly Acre', room: hostCode || myCode, solo: isMP ? 0 : 1, status: isMP ? 'Multiplayer · level ' + level() + ' · ' + $('count').textContent + ' on the farm' : 'Playing solo · level ' + level() + ' · join to play together', open: 1 }); };
    announce(); setInterval(announce, 60000); window.addEventListener('pagehide', function () { WW.clearPlaying && WW.clearPlaying(); });
  }
  // solo -> multiplayer: when a friend joins this host's multiplayer farm, move this player there too (both start fresh together)
  if (!isMP && WW.mode === 'cloud') {
    let moving = false;
    WW.roomRef('farm', 'MP-' + myCode).child('players').on('value', function (snap) {
      const v = snap.val() || {}, now = nowMs(), others = Object.keys(v).filter(function (u) { return u !== me.uid && now - ((v[u] || {}).t || 0) < 45000; });
      if (!others.length || moving) return; moving = true;
      say('🤝 ' + ((v[others[0]] || {}).n || 'A friend') + ' is joining your farm! Moving you both to the multiplayer farm…'); flushSave();
      setTimeout(function () { location.href = 'farm.html?mp=' + encodeURIComponent(myCode); }, 2200);
    });
  }
  say(isMP ? 'Multiplayer farm: you start fresh here. Work your own field; the animals are shared with everyone.' : (WW.mode === 'cloud' ? 'Your solo farm. If a friend joins from the games hub, you both move to a multiplayer farm.' : 'Welcome! Face grass, pick Plow, press E. Then Plant. Sign in from the hub for online saves and friends.'));
  requestAnimationFrame(loop);
}
let started = false, startedAsUser = false;
WW.onReady(function (user, code) {
  if (started) { if (!!user !== startedAsUser) location.reload(); return; }
  started = true; startedAsUser = !!user;
  begin(user, code).catch(function (e) { console.error(e); gate('Could not start: ' + (e.message || e), { back: true }); });
});
window.__farm = { hud: hud, isMP: function () { return isMP; }, applyLedger: applyLedger, get colors() { return colors; }, myFieldCount: myFieldCount, ownerOf: ownerOf, get tractorState() { return tractorState; }, renderPeers: renderPeers, level: level, tractorColor: function () { return tractor.children[0].material.color.getHex(); }, actTile: actTile, player: player, tractorLocal: tractorLocal, setTool: setTool, save: save, openShop: openShop, rainTick: rainTick, get tiles() { return tiles; }, get animals() { return animals; }, useAction: useAction, setSkip: function (id, v) { if (v) save.skip[id] = 1; else delete save.skip[id]; buildSeedBar(); }, cropForTile: cropForTile, plantables: plantables, get yaw() { return yaw; }, setCam: function (y, p, d) { yaw = y; pitch = p; dist = d; lastDragAt = performance.now() + 60000; }, refreshField: refreshField, ownedFields: function () { return ownedFields; }, get avatars() { return avatars; }, get avatarOn() { return !!farmer.userData.avatar && !!farmer.userData.badge; }, faceCamera: function () { player.ry = yaw; } };
