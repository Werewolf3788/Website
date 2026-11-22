// Werewolf Recon: 3D open-world squad shooter for phones, tablets and desktops (first province: Itacua).
// The province layout comes from Kevin's tracker data (public/games/wildlands.json): every Skill Point, Weapon Case,
// Accessory Case and Bonus Medal sits where it does on that map, weapon cases are guarded by enemy camps, and the
// skill trees (ranks, Skill Point + resource costs) are read straight from the same file.
// Progress is saved per player in Firestore at users/{friend_code}/platform/mobile/game/recon (and on the device).
// Controls: PC keys like the console game's PC defaults, a PS5/Xbox controller (js/gamepad.js), or on-screen sticks.
import * as THREE from './three.min.js';

const $ = id => document.getElementById(id);
const WW = window.WW, PAD = window.WWPad;
const GAME = 'recon', TITLE = 'Werewolf Recon', PROVINCE = 'Itacua';
const SIZE = 420, HALF = SIZE / 2, SEG = 150, PLAY = 155;     // world is SIZE x SIZE metres; spots fill +-PLAY
const LOCAL_KEY = 'recon_save_v1';
// difficulty (saved per player, changeable any time in the pause menu): how hard enemies hit, how fast they spot you,
// how much damage they take, how well they aim, and how long a guard needs at the alarm before it goes off
const DIFFS = {
  beginner: { n: '🟢 Beginner', d: 'For new keyboard players: enemies hit softly, spot you slowly, go down fast and take a long time to sound the alarm', dmg: .35, det: .45, hp: .6, acc: .6, alarm: 9 },
  easy:     { n: '🔵 Easy',     d: 'Forgiving: weaker, slower enemies', dmg: .6, det: .7, hp: .8, acc: .8, alarm: 6 },
  normal:   { n: '🟡 Normal',   d: 'The game as designed', dmg: 1, det: 1, hp: 1, acc: 1, alarm: 4 },
  hard:     { n: '🔴 Hard',     d: 'Enemies hit harder, spot you faster, take more hits and sound the alarm quickly', dmg: 1.4, det: 1.35, hp: 1.3, acc: 1.15, alarm: 2.5 }
};
const DIFF_ORDER = ['beginner', 'easy', 'normal', 'hard'];
const DF = () => DIFFS[(typeof S !== 'undefined' && S && S.diff) || 'normal'] || DIFFS.normal;
const isTouch = (matchMedia && matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window);
if (isTouch) document.body.classList.add('touch');
const V3 = THREE.Vector3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now() / 1000;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ terrain
function hash(x, z) { let h = (Math.imul(x, 374761393) + Math.imul(z, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, s = t => t * t * (3 - 2 * t);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1), u = s(xf), v = s(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const FLAT = [];   // flattened pads for camps and the rally point
function rawH(x, z) {
  let h = vnoise(x / 75 + 3, z / 75) * 24 + vnoise(x / 30 + 9, z / 30) * 7 + vnoise(x / 10, z / 10 + 4) * 1.2;
  const e = Math.max(Math.abs(x), Math.abs(z)) / HALF; h += Math.max(0, e - .78) * 160;    // mountains ring the province
  return h;
}
function shapedH(x, z) {
  let h = rawH(x, z);
  for (const f of FLAT) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + 12) { const k = clamp((d - f.r) / 12, 0, 1); h = f.h + (h - f.h) * k * k * (3 - 2 * k); } }
  return h;
}
let HG = null; const STEP = SIZE / SEG;
function bakeHeights() { HG = new Float32Array((SEG + 1) * (SEG + 1)); for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) HG[j * (SEG + 1) + i] = shapedH(-HALF + i * STEP, -HALF + j * STEP); }
function hAt(x, z) {   // matches the drawn terrain (bilinear over the same grid)
  const fx = clamp((x + HALF) / STEP, 0, SEG - 1e-4), fz = clamp((z + HALF) / STEP, 0, SEG - 1e-4), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, W1 = SEG + 1;
  const a = HG[j * W1 + i], b = HG[j * W1 + i + 1], c = HG[(j + 1) * W1 + i], d = HG[(j + 1) * W1 + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ------------------------------------------------------------------ data from the tracker JSON
let DATA = null, SKILLS = {}, TREES = [];
const TREE_KEYS = [['weapon_skills', '🔫 Weapon'], ['drone_skills', '🛸 Drone'], ['item_skills', '💣 Items'], ['physical_skills', '💪 Physical'], ['squad_skills', '🎖️ Squad']];
const CATS = { 'Assault Rifle': 'ar', 'Submachine Gun': 'smg', 'SMG': 'smg', 'Compact Machine Gun': 'smg', 'Shotgun': 'sg', 'Sniper': 'sr', 'Sniper Rifle': 'sr', 'LMG': 'lmg', 'Light Machine Gun': 'lmg', 'Handgun': 'hg' };
const CAT_NAME = { ar: 'Assault rifle', smg: 'SMG', lmg: 'Light machine gun', sr: 'Sniper rifle', sg: 'Shotgun', hg: 'Handgun' };
const BASE = {
  ar: { dmg: 34, rpm: 640, mag: 30, res: 150, spread: .014, recoil: .012, zoom: 1.7, range: 170, auto: true, sup: true },
  smg: { dmg: 25, rpm: 820, mag: 32, res: 192, spread: .022, recoil: .009, zoom: 1.45, range: 90, auto: true, sup: true },
  lmg: { dmg: 31, rpm: 720, mag: 100, res: 300, spread: .028, recoil: .011, zoom: 1.6, range: 160, auto: true, sup: false },
  sr: { dmg: 150, rpm: 46, mag: 5, res: 30, spread: .0015, recoil: .05, zoom: 4.2, range: 420, auto: false, sup: true },
  sg: { dmg: 17, rpm: 80, mag: 7, res: 42, spread: .075, recoil: .04, zoom: 1.3, range: 40, auto: false, sup: false, pellets: 8 },
  hg: { dmg: 34, rpm: 330, mag: 15, res: 75, spread: .02, recoil: .015, zoom: 1.35, range: 70, auto: false, sup: true }
};
const GUNCAT = { 'M4A1': 'ar', 'P227': 'hg' };
const slotOf = c => (c === 'sr' || c === 'sg') ? 1 : c === 'hg' ? 2 : 0;
const RES = [['gasoline', '⛽', 'Gasoline'], ['medication', '💊', 'Medication'], ['comms', '📡', 'Comms'], ['food', '🥫', 'Food']];
const CAMP_NAMES = ['Calavera Outpost', 'Mesa Checkpoint', 'Rio Seco Camp', 'Cerro Watchpost', 'Valle Depot', 'Piedra Roadblock'];
// skills that do something in this version (the rest can be bought now and switch on in a later update)
const LIVE = new Set(['stable_aim', 'hip_fire_spread', 'ammo_capacity', 'adv_suppressor', 'time_to_aim', 'ammo_retention', 'epic_ranged_elite', 'battery_increase', 'night_vision', 'range', 'speed', 'mark_area', 'cooldown', 'zoom', 'thermal_vision', 'binocular_zoom', 'frag_grenade', 'binocular_recon', 'epic_explosion_radius', 'stamina', 'no_pain', 'car_shield', 'quiet_running', 'bullet_resistance', 'detection', 'explosion_resistance', 'epic_faster_regen', 'extra_sync_shot', 'trained_rebels', 'born_leader', 'revive_speed', 'bleed_out_time', 'squad_resilience']);

// ------------------------------------------------------------------ save
const DEF = () => ({ v: 1, level: 1, xp: 0, sp: 2, res: { gasoline: 0, medication: 0, comms: 0, food: 0 }, skills: {}, guns: ['M4A1', 'P227'], load: ['M4A1', null, 'P227'], att: [], picked: {}, camps: {}, medals: [], kills: 0, heads: 0, liberated: false, saved: 0 });
let S = DEF(), saveT = 0, fs = null;
function fixSave(o) { const d = DEF(); o = Object.assign(d, o || {}); o.res = Object.assign(DEF().res, o.res || {}); ['skills', 'picked', 'camps'].forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; }); ['guns', 'att', 'medals'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; }); if (!Array.isArray(o.load) || o.load.length !== 3) o.load = ['M4A1', null, 'P227']; return o; }
function docRef() { return (fs && WW.user && WW.friendCode) ? fs.doc('users/' + WW.friendCode + '/platform/mobile/game/' + GAME) : null; }
async function loadSave() {
  let loc = null; try { loc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) {}
  let cloud = null; const r = docRef();
  if (r) { try { const s = await r.get(); if (s.exists) cloud = s.data(); } catch (e) { console.warn('recon cloud load', e && (e.code || e.message)); } }
  S = fixSave((cloud && (!loc || (cloud.saved || 0) >= (loc.saved || 0))) ? cloud : loc);
}
function saveNow() {
  S.saved = Date.now(); const plain = JSON.parse(JSON.stringify(S));
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(plain)); } catch (e) {}
  const r = docRef(); if (r) r.set(plain).catch(e => console.warn('recon cloud save', e && (e.code || e.message)));
  if (WW.user && WW.publishProgress) WW.publishProgress(GAME, { kind: 'progress', level: S.level, kills: S.kills, province: PROVINCE, liberated: !!S.liberated });
}
function save(soon) { clearTimeout(saveT); saveT = setTimeout(saveNow, soon ? 400 : 4000); }

// ------------------------------------------------------------------ skills
function rank(id) { return S.skills['skill_' + id] | 0; }
function eff(id) {                      // current rank's effect as a fraction (0.25 for "+25%"), Infinity for "Infinite"
  const r = rank(id), d = SKILLS['skill_' + id]; if (!r || !d || !d.rank_costs || !d.rank_costs[r - 1]) return 0;
  const e = String(d.rank_costs[r - 1].effect); if (/infinite/i.test(e)) return Infinity;
  const m = e.match(/(\d+(\.\d+)?)/); return m ? +m[1] / 100 : 0;
}
function effNum(id) { const r = rank(id), d = SKILLS['skill_' + id]; if (!r || !d) return 0; const m = String(d.rank_costs[r - 1].effect).match(/(\d+)/); return m ? +m[1] : 0; }
const maxFrags = () => rank('frag_grenade') ? effNum('frag_grenade') : 2;
const thermalOK = () => rank('thermal_vision') > 0 || (S.skills.skill_thermal_vision | 0) > 0;
const maxHP = () => 100 * (1 + eff('no_pain'));

// ------------------------------------------------------------------ renderer + scene
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.3 : 1.75));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, .1, 900);
const hemi = new THREE.HemisphereLight(0xdbeafe, 0x3f3a2a, .8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4d6, 1.1); sun.position.set(80, 140, 40); scene.add(sun);
scene.fog = new THREE.Fog(0x9cc7e6, 90, 380);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let dayK = 1;
function applyTime() {     // the sky follows this device's real clock, so night missions are dark (use night vision)
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60, el = Math.sin((h - 6) / 12 * Math.PI);
  dayK = clamp(el * 1.7 + .25, 0, 1);
  const sky = new THREE.Color(0x0a1222).lerp(new THREE.Color(0x9cc7e6), dayK);
  scene.background = sky; scene.fog.color.copy(sky);
  hemi.intensity = .4 + .55 * dayK; sun.intensity = .15 + 1 * dayK;
  sun.position.set(Math.cos((h - 6) / 12 * Math.PI) * 140, 40 + 120 * Math.max(.1, el), 50);
}

// ------------------------------------------------------------------ helpers for models
const MAT = {};
function mat(c, o) { const k = c + JSON.stringify(o || {}); return MAT[k] || (MAT[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); }
function box(w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); return b; }
function iconTex(txt, bg, fg) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.moveTo(32, 4); g.lineTo(60, 32); g.lineTo(32, 60); g.lineTo(4, 32); g.closePath(); g.fill(); }
  g.fillStyle = fg || '#fff'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 32, 35);
  return new THREE.CanvasTexture(c);
}
const TEX = { mark: iconTex('', '#ef4444'), sus: iconTex('?', null, '#facc15'), alert: iconTex('!', null, '#ef4444') };
function sprite(tex, s, overlay) { const m = new THREE.SpriteMaterial({ map: tex, depthTest: !overlay, transparent: true }); const sp = new THREE.Sprite(m); sp.scale.set(s, s, s); if (overlay) sp.renderOrder = 999; return sp; }

function makeSoldier(color, kind) {
  const g = new THREE.Group(), cloth = new THREE.MeshLambertMaterial({ color }), skin = mat(0xc68642), dark = mat(0x1f2937), gear = new THREE.MeshLambertMaterial({ color: kind === 'enemy' ? 0x3b2f2f : 0x4d5b36 });
  const hip = new THREE.Group(); hip.position.y = .9; g.add(hip);
  const legs = []; [-.13, .13].forEach(x => { const p = new THREE.Group(); p.position.set(x, 0, 0); const l = box(.2, .86, .24, cloth, 0, -.43, 0); l.userData.part = 'body'; p.add(l); hip.add(p); legs.push(p); });
  const torso = box(.56, .66, .32, gear, 0, 1.26, 0); torso.userData.part = 'body'; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), skin); head.position.y = 1.76; head.userData.part = 'head'; g.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), kind === 'enemy' ? dark : cloth); helm.position.y = 1.78; helm.userData.part = 'head'; g.add(helm);
  const armL = box(.14, .6, .16, gear, -.36, 1.2, -.12); armL.rotation.x = -.9; g.add(armL);
  const armR = box(.14, .6, .16, gear, .36, 1.2, -.12); armR.rotation.x = -.9; g.add(armR);
  const gun = box(.08, .12, .78, dark, .12, 1.28, -.5); g.add(gun);
  if (kind === 'squad') { const band = box(.16, .1, .18, new THREE.MeshLambertMaterial({ color: 0x22c55e }), -.36, 1.4, 0); g.add(band); }
  g.userData = { legs, torso, head, gun, cloth, gear };
  return g;
}
function animLegs(m, phase, amt) { const L = m.userData.legs; if (!L) return; L[0].rotation.x = Math.sin(phase) * amt; L[1].rotation.x = -Math.sin(phase) * amt; }
function makeTruck(color) {
  const g = new THREE.Group(), body = mat(color), dark = mat(0x111827), glass = mat(0x93c5fd, { transparent: true, opacity: .6 });
  g.add(box(2.1, .7, 4.6, body, 0, .95, 0)); g.add(box(1.9, .8, 1.8, body, 0, 1.7, -.35)); g.add(box(1.8, .5, .05, glass, 0, 1.8, -1.27));
  g.add(box(2.1, .5, 1.9, body, 0, 1.45, 1.35));
  [[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5]].forEach(p => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .32, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(p[0] * 1.05, .45, p[1]); g.add(w); });
  [-.7, .7].forEach(x => g.add(box(.3, .18, .05, mat(0xfef9c3, { emissive: 0xfef08a }), x, 1.05, -2.31)));
  return g;
}

// ------------------------------------------------------------------ world state
let world = null;      // built after the data loads
const colliders = [];   // {x0,x1,z0,z1,top}
const enemies = [], squad = [], pickups = [], vehicles = [], camps = [], tracers = [], nades = [], booms = [], drops = [];
let rally = { x: 0, z: 0 }, terrainMesh = null, tacImg = null, paths = [];
const mainCamps = () => camps.filter(c => !c.post), posts = () => camps.filter(c => c.post);
const campCount = () => mainCamps().filter(c => c.cleared).length + '/' + mainCamps().length + ' camps · ' + posts().filter(c => c.cleared).length + '/' + posts().length + ' guard posts';

function layout() {
  const C = (DATA && DATA.collectibles) || {};
  const pick = g => ((C[g] && C[g].items) || []).filter(i => i.region === PROVINCE && i.map_x != null && i.map_y != null);
  const G = { sp: pick('skill_points'), weapon: pick('weapons_by_province'), acc: pick('accessory_cases'), medal: pick('bonus_medal_locations') };
  const all = [].concat(G.sp, G.weapon, G.acc, G.medal);
  if (!all.length) {        // no data: make a playable layout anyway
    for (let i = 0; i < 8; i++) G.sp.push({ id: 'sp' + i, name: 'Skill Point', map_x: Math.random(), map_y: Math.random() });
    [['M40A5', 'Sniper Rifle'], ['Super Shorty', 'Shotgun'], ['MG121', 'LMG']].forEach((w, i) => G.weapon.push({ id: 'wc' + i, name: w[0], category: w[1], map_x: Math.random(), map_y: Math.random() }));
    all.push.apply(all, G.sp.concat(G.weapon));
  }
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0; all.forEach(i => { x0 = Math.min(x0, i.map_x); x1 = Math.max(x1, i.map_x); y0 = Math.min(y0, i.map_y); y1 = Math.max(y1, i.map_y); });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(x1 - x0, y1 - y0, .02) / 2;
  const toW = i => [(i.map_x - cx) / span * PLAY, (i.map_y - cy) / span * PLAY];
  const items = [];
  G.sp.forEach(i => { const p = toW(i); items.push({ id: i.id, kind: 'sp', name: 'Skill Point', x: p[0], z: p[1] }); });
  G.weapon.forEach(i => { const p = toW(i), cat = CATS[i.category] || 'ar'; GUNCAT[i.name] = cat; items.push({ id: i.id, kind: 'weapon', name: i.name, cat, x: p[0], z: p[1] }); });
  G.acc.forEach(i => { const p = toW(i); items.push({ id: i.id, kind: 'acc', name: i.name, cat: (i.category || String(i.name).split(':')[0]).trim(), x: p[0], z: p[1] }); });
  G.medal.forEach(i => { const p = toW(i); items.push({ id: i.id, kind: 'medal', name: 'Bonus Medal: ' + (i.bonus_for || i.name), x: p[0], z: p[1] }); });
  // camps guard every weapon case, plus checkpoints at the two accessory cases farthest from them
  const cs = items.filter(i => i.kind === 'weapon').map(i => ({ x: i.x, z: i.z }));
  const accs = items.filter(i => i.kind === 'acc').map(i => ({ i, d: Math.min.apply(null, cs.map(c => Math.hypot(c.x - i.x, c.z - i.z)).concat([999])) })).sort((a, b) => b.d - a.d).slice(0, 2);
  accs.forEach(a => cs.push({ x: a.i.x + 12, z: a.i.z + 8 }));
  cs.forEach((c, k) => camps.push({ id: 'camp' + k, name: CAMP_NAMES[k % CAMP_NAMES.length], x: clamp(c.x, -138, 138), z: clamp(c.z, -138, 138), size: k < G.weapon.length ? 4 + (k % 2) : 3, guards: [], alerted: false, cleared: false }));
  // guard posts: every Skill Point, accessory case and medal that isn't already inside a camp is guarded by its own small post
  items.filter(i => i.kind === 'sp' || i.kind === 'acc' || i.kind === 'medal').forEach(i => {
    i.x = clamp(i.x, -140, 140); i.z = clamp(i.z, -140, 140);
    if (camps.some(c => Math.hypot(c.x - i.x, c.z - i.z) < 22)) return;
    camps.push({ id: 'post_' + i.id, post: true, name: 'Guard post', x: i.x, z: i.z, size: i.kind === 'sp' ? 2 : 3, guards: [], alerted: false, cleared: false });
  });
  // rally point: the spot farthest from every camp
  let best = null; for (let gx = -.85; gx <= .86; gx += .17) for (let gz = -.85; gz <= .86; gz += .17) { const x = gx * PLAY, z = gz * PLAY, d = Math.min.apply(null, camps.map(c => Math.hypot(c.x - x, c.z - z))); if (!best || d > best.d) best = { x, z, d }; }
  rally = { x: best.x, z: best.z };
  FLAT.push({ x: rally.x, z: rally.z, r: 9, h: rawH(rally.x, rally.z) });
  camps.forEach(c => FLAT.push({ x: c.x, z: c.z, r: c.post ? 8 : 15, h: rawH(c.x, c.z) }));
  // dirt tracks: rally -> nearest camp -> next nearest ...
  const left = camps.filter(c => !c.post); let at = rally;
  while (left.length) { left.sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z)); const n = left.shift(); paths.push([at.x, at.z, n.x, n.z]); at = n; }
  return items;
}
function segDist(px, pz, s) { const dx = s[2] - s[0], dz = s[3] - s[1], L = dx * dx + dz * dz || 1, t = clamp(((px - s[0]) * dx + (pz - s[1]) * dz) / L, 0, 1); return Math.hypot(px - (s[0] + dx * t), pz - (s[1] + dz * t)); }

function buildWorld(items) {
  bakeHeights();
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cA = new THREE.Color(), tmp = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), y = hAt(x, z); pos.setY(k, y);
    const n = vnoise(x / 6, z / 6), sl = Math.abs(hAt(x + 1, z) - hAt(x - 1, z)) + Math.abs(hAt(x, z + 1) - hAt(x, z - 1));
    cA.setRGB(.27 + n * .08, .42 + n * .1, .2);                                    // grass
    if (y > 34 || sl > 1.6) cA.lerp(tmp.setRGB(.45, .42, .38), clamp((y - 34) / 10 + (sl - 1.6), 0, 1));   // rock
    if (y > 62) cA.lerp(tmp.setRGB(.92, .93, .95), clamp((y - 62) / 8, 0, 1));                            // snow
    let road = 99; for (const s of paths) road = Math.min(road, segDist(x, z, s));
    for (const f of FLAT) road = Math.min(road, Math.max(0, Math.hypot(x - f.x, z - f.z) - f.r + 2));
    if (road < 3.2) cA.lerp(tmp.setRGB(.5, .4, .28), clamp(1.3 - road / 3, 0, 1));                        // dirt
    col[k * 3] = cA.r; col[k * 3 + 1] = cA.g; col[k * 3 + 2] = cA.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  terrainMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); scene.add(terrainMesh);
  // trees and rocks (instanced)
  const N = isTouch ? 520 : 800, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .26, 2.4, 6), mat(0x5b4026), N), crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 4.2, 7), mat(0x2f5d2e), N);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new V3(); let n = 0, tries = 0;
  while (n < N && tries++ < N * 8) {
    const x = rnd(-HALF + 10, HALF - 10), z = rnd(-HALF + 10, HALF - 10), y = hAt(x, z); if (y > 45) continue;
    let ok = true; for (const f of FLAT) if (Math.hypot(x - f.x, z - f.z) < f.r + 4) ok = false; for (const s of paths) if (segDist(x, z, s) < 4) ok = false;
    for (const it of items) if (Math.hypot(x - it.x, z - it.z) < 3) ok = false; if (!ok) continue;
    const s = rnd(.8, 1.5); Sc.set(s, s, s);
    M.compose(new V3(x, y + 1.2 * s, z), Q, Sc); trunk.setMatrixAt(n, M); M.compose(new V3(x, y + 4 * s, z), Q, Sc); crown.setMatrixAt(n, M); n++;
  }
  trunk.count = crown.count = n; scene.add(trunk, crown);
  const R = 140, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat(0x6b6a66), R);
  for (let k = 0; k < R; k++) { const x = rnd(-HALF + 8, HALF - 8), z = rnd(-HALF + 8, HALF - 8), s = rnd(.4, 1.6); Q.setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 3), 0)); Sc.set(s, s * .7, s); M.compose(new V3(x, hAt(x, z), z), Q, Sc); rocks.setMatrixAt(k, M); }
  scene.add(rocks);
  // rally point: tent, flag, crate
  const ry = hAt(rally.x, rally.z), tent = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.4, 4), mat(0x4d5b36)); tent.position.set(rally.x + 3, ry + 1.2, rally.z); tent.rotation.y = Math.PI / 4; scene.add(tent);
  const pole = box(.08, 4, .08, mat(0xdddddd), rally.x - 2, ry + 2, rally.z - 2); scene.add(pole); scene.add(box(1, .6, .04, mat(0x22c55e), rally.x - 1.5, ry + 3.6, rally.z - 2));
  scene.add(box(1.2, .8, .8, mat(0x3f6212), rally.x, ry + .4, rally.z + 3));
  // camps: huts, sandbags, crates, a watch tower
  camps.forEach((c, k) => {
    const y = hAt(c.x, c.z), wall = mat(0x8a7356), roof = mat(0x5a4636);
    if (c.post) {     // guard post: a small shack, sandbags, a short flag and one supply crate
      const hx = c.x + 5, hz = c.z - 4; scene.add(box(4, 2.6, 3, wall, hx, y + 1.3, hz)); scene.add(box(4.4, .25, 3.4, roof, hx, y + 2.72, hz)); colliders.push({ x0: hx - 2, x1: hx + 2, z0: hz - 1.5, z1: hz + 1.5, top: y + 2.85 });
      [[-3, 3], [3, 4]].forEach(sb => { const sx = c.x + sb[0], sz = c.z + sb[1]; scene.add(box(2.2, .9, .8, mat(0x9b8b62), sx, y + .45, sz)); colliders.push({ x0: sx - 1.1, x1: sx + 1.1, z0: sz - .4, z1: sz + .4, top: y + .9 }); });
      c.tower = null; c.flag = box(.7, .45, .04, mat(0xb91c1c), c.x - 1.6, y + 3.2, c.z - 2); scene.add(box(.06, 3.4, .06, mat(0xdddddd), c.x - 2, y + 1.7, c.z - 2)); scene.add(c.flag);
      const r = RES[k % RES.length]; items.push({ id: 'crate_' + c.id + '_0', kind: 'crate', camp: c.id, res: r[0], name: r[2] + ' supplies', x: c.x - 4, z: c.z - 3 });
      return;
    }
    const huts = [[-7, -4, 0], [6, -5, 1], [0, 7, 0]].slice(0, c.size > 3 ? 3 : 2);
    huts.forEach(hh => {
      const w = hh[2] ? 5 : 7, d = hh[2] ? 7 : 5, hx = c.x + hh[0], hz = c.z + hh[1];
      const b = box(w, 3.2, d, wall, hx, y + 1.6, hz); scene.add(b); scene.add(box(w + .5, .3, d + .5, roof, hx, y + 3.35, hz));
      colliders.push({ x0: hx - w / 2, x1: hx + w / 2, z0: hz - d / 2, z1: hz + d / 2, top: y + 3.5 });
    });
    [[3, 2], [-3, 3]].forEach(s => { const sx = c.x + s[0], sz = c.z + s[1]; scene.add(box(2.4, .9, .8, mat(0x9b8b62), sx, y + .45, sz)); colliders.push({ x0: sx - 1.2, x1: sx + 1.2, z0: sz - .4, z1: sz + .4, top: y + .9 }); });
    const tx = c.x - 9, tz = c.z + 7; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => scene.add(box(.2, 5, .2, roof, tx + p[0], y + 2.5, tz + p[1])));
    scene.add(box(2.6, .25, 2.6, roof, tx, y + 5, tz)); colliders.push({ x0: tx - 1.3, x1: tx + 1.3, z0: tz - 1.3, z1: tz + 1.3, top: y + 5.1 });
    c.tower = { x: tx, z: tz, y: y + 5.15 };
    // the camp alarm: a siren on a pole. If a guard reaches it while the camp is on alert, nearby camps send reinforcements
    { const ax = c.x - 1, az = c.z - 10, ay = hAt(ax, az); c.alarmAt = { x: ax, z: az };
      scene.add(box(.14, 3, .14, mat(0x6b7280), ax, ay + 1.5, az)); scene.add(box(.7, .5, .45, mat(0x991b1b), ax, ay + 1.4, az + .25));
      c.siren = box(.45, .35, .45, mat(0xef4444), ax, ay + 3.15, az); scene.add(c.siren); colliders.push({ x0: ax - .3, x1: ax + .3, z0: az - .3, z1: az + .5, top: ay + 1.7 }); }
    // a red flag shows the camp is still held
    c.flag = box(1, .6, .04, mat(0xb91c1c), c.x + 1.3, y + 5.6, c.z); scene.add(box(.08, 5.6, .08, mat(0xdddddd), c.x + .8, y + 2.8, c.z)); scene.add(c.flag);
    // supply crates (resources), two per camp
    [0, 1].forEach(q => { const r = RES[(k * 2 + q) % RES.length]; items.push({ id: 'crate_' + c.id + '_' + q, kind: 'crate', camp: c.id, res: r[0], name: r[2] + ' supplies', x: c.x + (q ? -3 : 4), z: c.z + (q ? -1 : 6) }); });
  });
  // pickups
  const LOOK = { sp: [0x38bdf8, '⬆️'], weapon: [0xf97316, '🔫'], acc: [0xa78bfa, '🔧'], medal: [0xfacc15, '🏅'], crate: [0x65a30d, '📦'] };
  items.forEach(it => {
    const L = LOOK[it.kind], g = new THREE.Group(), y = groundAt(it.x, it.z, 999);
    const m = it.kind === 'crate' ? box(1, .7, .7, mat(0x4d7c0f), 0, .35, 0) : it.kind === 'sp' ? new THREE.Mesh(new THREE.OctahedronGeometry(.4), mat(L[0], { emissive: L[0], emissiveIntensity: .7 })) : box(it.kind === 'weapon' ? 1.3 : .8, .4, .5, mat(L[0], { emissive: L[0], emissiveIntensity: .35 }), 0, .2, 0);
    if (it.kind === 'sp') m.position.y = 1.1;
    g.add(m); g.position.set(it.x, y, it.z); scene.add(g);
    if (it.kind !== 'crate') { const beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 30, 4), new THREE.MeshBasicMaterial({ color: L[0], transparent: true, opacity: .25, depthWrite: false })); beam.position.y = 15; g.add(beam); it.beam = beam; }
    it.mesh = g; it.spin = m; it.emoji = L[1]; it.color = L[0]; pickups.push(it);
  });
  // trucks: one at the rally point, one on the track near the first two camps
  addTruck(rally.x - 5, rally.z + 6, 0x7c2d12);
  paths.slice(0, 2).forEach((s, i) => addTruck(lerp(s[0], s[2], .55) + 3, lerp(s[1], s[3], .55), i ? 0x334155 : 0x166534));
  bakeTac();
}
function addTruck(x, z, color) { const m = makeTruck(color); scene.add(m); vehicles.push({ mesh: m, pos: new V3(x, hAt(x, z), z), yaw: rnd(0, 6), spd: 0, color }); }

function groundAt(x, z, feetY) {
  let g = hAt(x, z);
  for (const c of colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && feetY >= c.top - .45) g = Math.max(g, c.top);
  return g;
}
function pushOut(p, r, feetY) {
  for (const c of colliders) {
    if (feetY >= c.top - .45) continue;
    if (p.x > c.x0 - r && p.x < c.x1 + r && p.z > c.z0 - r && p.z < c.z1 + r) {
      const dx1 = p.x - (c.x0 - r), dx2 = (c.x1 + r) - p.x, dz1 = p.z - (c.z0 - r), dz2 = (c.z1 + r) - p.z, m = Math.min(dx1, dx2, dz1, dz2);
      if (m === dx1) p.x = c.x0 - r; else if (m === dx2) p.x = c.x1 + r; else if (m === dz1) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
  p.x = clamp(p.x, -HALF + 12, HALF - 12); p.z = clamp(p.z, -HALF + 12, HALF - 12);
}
function los(a, b) {    // a,b: V3 (eye heights). Blocked by hills and buildings.
  const d = a.distanceTo(b), n = Math.max(4, Math.ceil(d / 3));
  for (let k = 1; k < n; k++) {
    const t = k / n, x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t), z = lerp(a.z, b.z, t);
    if (hAt(x, z) > y - .15) return false;
    for (const c of colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.top - .1) return false;
  }
  return true;
}

// ------------------------------------------------------------------ player, squad, enemies
const P = { pos: new V3(), vy: 0, yaw: 0, pitch: -.12, face: 0, stance: 0, onGround: true, hp: 100, hurtT: -99, stam: 1, sprint: false, walk: false, holster: false, shoulder: 1, fps: false, slot: 0, aimK: 0,
  reloadT: 0, next: 0, burst: 0, kick: 0, frags: 2, heals: 3, mode: 'foot', veh: null, phase: 0, deadT: 0, vision: 0, throwable: 'frag', resupT: 0 };
const ammo = {}; const gunState = {};   // gunState[name] = {mag, sup, mode}
let me = null;
function gunCat(n) { return GUNCAT[n] || 'ar'; }
function curGun() { return S.load[P.slot] || null; }
function gstat(n) {
  const c = gunCat(n), b = BASE[c], has = k => S.att.some(a => String(a).toLowerCase().indexOf(k) === 0);
  const s = Object.assign({}, b, { cat: c });
  if (has('muzzle')) s.recoil *= .7; if (has('underbarrel')) { s.recoil *= .85; s.spread *= .88; } if (has('scope') && c !== 'hg' && c !== 'sg') s.zoom += .6; if (has('barrel')) { s.dmg *= 1.1; s.range *= 1.25; }
  s.recoil *= 1 - eff('stable_aim'); s.hip = 1 - eff('hip_fire_spread');
  return s;
}
function gs(n) { if (!gunState[n]) { const b = BASE[gunCat(n)]; gunState[n] = { mag: b.mag, sup: gunCat(n) === 'hg', mode: b.auto ? 'auto' : 'single' }; } return gunState[n]; }
function refill(full) { Object.keys(BASE).forEach(c => { ammo[c] = Math.round(BASE[c].res * (1 + eff('ammo_capacity'))); }); if (full) S.guns.forEach(n => { gs(n).mag = gstat(n).mag; }); P.frags = maxFrags(); P.heals = 3; }

function spawnSquad() {
  ['Holt', 'Vega', 'Weaver'].forEach((n, i) => { const m = makeSoldier(0x4d5b36, 'squad'); scene.add(m); squad.push({ name: n, m, pos: new V3(P.pos.x - 2 - i, 0, P.pos.z + 2 + i), off: [[-2.2, 2.4], [2.2, 2.6], [0, 4.4]][i], phase: 0, shotT: rnd(0, 1), face: 0, hp: 100, down: false, revT: 0 }); });
}
function spawnCampGuards(c) {
  c.guards.forEach(e => { scene.remove(e.m); scene.remove(e.mark); scene.remove(e.ind); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); });
  c.guards = []; c.alerted = false; c.cleared = false; c.flag.visible = true; c.alarmOn = 0; c.runner = null;
  for (let k = 0; k < c.size; k++) {
    const onTower = k === 0 && !!c.tower, a = k / c.size * Math.PI * 2 + rnd(-.3, .3), rr = c.post ? rnd(2.5, 5.5) : rnd(4, 9), x = onTower ? c.tower.x : c.x + Math.cos(a) * rr, z = onTower ? c.tower.z : c.z + Math.sin(a) * rr;
    const m = makeSoldier(0x7f1d1d, 'enemy'); scene.add(m);
    const mark = sprite(TEX.mark, .7, true); mark.visible = false; scene.add(mark);
    const ind = sprite(TEX.sus, .8, false); ind.visible = false; scene.add(ind);
    const e = { m, mark, ind, camp: c, pos: new V3(x, onTower ? c.tower.y : hAt(x, z), z), home: new V3(x, 0, z), tower: onTower, yaw: rnd(0, 6), hp: 100, dead: false, deadT: 0, det: 0, alert: false, seenT: -99, last: new V3(), shotT: rnd(1, 2), wander: null, waitT: rnd(0, 3), marked: false, phase: rnd(0, 6) };
    m.traverse(o => { if (o.isMesh) o.userData.e = e; });
    enemies.push(e); c.guards.push(e);
  }
}

// ------------------------------------------------------------------ audio
let AC = null, muted = false, hum = null;
try { muted = localStorage.getItem('recon_mute') === '1'; } catch (e) {}
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function noise(dur, vol, freq, q, delay) {
  const a = ac(); if (!a || muted) return; const t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || .7; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
}
function tone(freq, dur, vol, type, delay, to) { const a = ac(); if (!a || muted) return; const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02); }
const SFX = {
  shot: (sup, cat, far) => sup ? noise(.09, .25 * (far || 1), 2600, 2) : noise(cat === 'sr' ? .5 : cat === 'sg' ? .35 : .18, (cat === 'sr' ? .9 : .6) * (far || 1), cat === 'sr' ? 900 : 1400),
  boom: () => { noise(1.2, 1, 380); tone(60, .8, .5, 'sine', 0, 30); },
  hit: () => tone(1800, .05, .12, 'square'), head: () => { tone(1200, .07, .18, 'square'); tone(1800, .07, .12, 'square', .05); },
  pick: () => { tone(660, .1, .15, 'triangle'); tone(990, .14, .15, 'triangle', .08); },
  alert: () => { tone(520, .18, .2, 'sawtooth'); tone(780, .25, .2, 'sawtooth', .16); },
  siren: () => { for (let k = 0; k < 4; k++) { tone(600, .35, .22, 'square', k * .7, 950); tone(950, .35, .22, 'square', k * .7 + .35, 600); } },
  reload: () => { noise(.05, .2, 3000); noise(.06, .25, 2000, 1, .35); },
  click: () => tone(2500, .02, .1, 'square'), hurt: () => noise(.15, .35, 600),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .25, .15, 'triangle', i * .1))
};
function setHum(on) { const a = ac(); if (!a) return; if (on && !hum && !muted) { const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 180; g.gain.value = .025; o.connect(g); g.connect(a.destination); o.start(); hum = { o, g }; } else if (!on && hum) { try { hum.o.stop(); } catch (e) {} hum = null; } }

// ------------------------------------------------------------------ HUD helpers
let toastT = 0, centerT = 0;
function say(t, ms) { $('toast').textContent = t || ''; clearTimeout(toastT); if (t) toastT = setTimeout(() => { $('toast').textContent = ''; }, ms || 2600); }
function big(t, ms) { $('center').textContent = t || ''; clearTimeout(centerT); if (t) centerT = setTimeout(() => { $('center').textContent = ''; }, ms || 2000); }
function xpNeed() { return 700 + S.level * 450; }
function addXP(n, why) {
  S.xp += n; let up = false;
  while (S.xp >= xpNeed()) { S.xp -= xpNeed(); S.level++; S.sp++; up = true; }
  if (up) { big('LEVEL ' + S.level, 2400); say('+1 Skill Point (J to spend)'); SFX.level(); }
  save();
}
function hitFlash() { const c = $('cross'); c.classList.add('hit'); clearTimeout(hitFlash.t); hitFlash.t = setTimeout(() => c.classList.remove('hit'), 140); }
function hurtFlash(k) { const h = $('hurt'); h.style.opacity = Math.min(.9, .35 + k); clearTimeout(hurtFlash.t); hurtFlash.t = setTimeout(() => { h.style.opacity = 0; }, 260); }

// ------------------------------------------------------------------ effects
const tracerMat = new THREE.LineBasicMaterial({ color: 0xfde68a, transparent: true, opacity: .9 });
const tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); tracerGeo.rotateX(Math.PI / 2);
function tracer(a, b, color) {     // a glowing streak from the muzzle to where the bullet went
  const len = a.distanceTo(b); if (len < .2) return;
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: color || 0xfde68a, transparent: true, opacity: .95, depthWrite: false }));
  m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); m.scale.set(.035, .035, len); scene.add(m); tracers.push({ l: m, t: .13, max: .13 });
}
const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(.35, 'rgba(255,190,60,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const muzzleLight = new THREE.PointLight(0xffc266, 0, 14); scene.add(muzzleLight); let muzzleT = 0;
function flash(p, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.copy(p); scene.add(sp); booms.push({ m: sp, t: .07, max: .07, grow: (s || 1) * .9 }); muzzleLight.position.copy(p); muzzleLight.intensity = 6 * (s || 1); muzzleT = .06; }
function puff(p, color, s) { const m = new THREE.Mesh(new THREE.SphereGeometry(s || .25, 6, 5), new THREE.MeshBasicMaterial({ color: color || 0xd6d3d1, transparent: true, opacity: .8 })); m.position.copy(p); scene.add(m); booms.push({ m, t: .35, max: .35, grow: s ? 6 : 2 }); }

// ------------------------------------------------------------------ input
const K = new Set(); let mouseL = false, mouseR = false, lookX = 0, lookY = 0, locked = false;
const TI = { mx: 0, my: 0, held: {}, lookId: null, lx: 0, ly: 0 };
let padOn = false, sprintToggle = false;
function menuOpen() { return [...document.querySelectorAll('.ov')].some(o => o.classList.contains('show')); }
const KEYS = { KeyC: 'crouch', ControlLeft: 'prone', ControlRight: 'prone', Space: 'jump', KeyR: 'reload', KeyX: 'aimMode', KeyH: 'holster', Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4',
  KeyQ: 'drone', KeyB: 'bino', KeyV: 'vision', KeyN: 'vision', Tab: 'squad', KeyF: 'heal', KeyG: 'throw', KeyM: 'map', KeyJ: 'skills', KeyI: 'skills', KeyT: 'chat', NumLock: 'hud', KeyE: 'use', KeyU: 'suppressor', AltLeft: 'walk', AltRight: 'walk', KeyL: 'lights' };
addEventListener('keydown', e => {
  if (['Tab', 'Space', 'AltLeft', 'AltRight', 'ControlLeft', 'KeyQ', 'Slash'].includes(e.code) && started) e.preventDefault();
  if (e.code === 'Escape') { if (menuOpen()) closeMenus(); else pause(); return; }
  if (menuOpen()) { if (e.code === 'KeyM' && $('tac').classList.contains('show')) closeMenus(); else if ((e.code === 'KeyJ' || e.code === 'KeyI') && $('sk').classList.contains('show')) closeMenus(); else if (e.code === 'Tab' && $('wheel').classList.contains('show')) closeMenus(); else if (/^Digit[1-4]$/.test(e.code) && $('wheel').classList.contains('show')) { const b = $('wheelList').querySelectorAll('button')[+e.code.slice(5) - 1]; if (b) b.click(); } return; }
  if (e.repeat) return; K.add(e.code);
  if (e.code === 'KeyZ') act(P.aimK > .5 ? 'fireMode' : 'shoulder');
  else if (KEYS[e.code]) act(KEYS[e.code]);
});
addEventListener('keyup', e => K.delete(e.code));
addEventListener('blur', () => { K.clear(); mouseL = mouseR = false; });
canvas.addEventListener('mousedown', e => {
  if (isTouch || !started || menuOpen()) return;
  if (!locked) { canvas.requestPointerLock && canvas.requestPointerLock(); ac(); return; }
  if (e.button === 0) { mouseL = true; P.burstReq = true; } else if (e.button === 2) mouseR = true; else if (e.button === 1) { e.preventDefault(); act('mark'); }
});
addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; else if (e.button === 2) mouseR = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; if (!locked && started && !menuOpen() && P.mode !== 'dead') pause(); });
addEventListener('mousemove', e => { if (locked) { lookX += e.movementX; lookY += e.movementY; } });
addEventListener('wheel', e => { if (locked && P.mode === 'drone') droneZoom = clamp(droneZoom - Math.sign(e.deltaY) * .5, 1, rank('zoom') ? 3 : 1); }, { passive: true });

// touch: left stick, drag anywhere else to look, buttons
(function touch() {
  const stk = $('sL'), knob = stk.querySelector('i'); let sid = null, cx = 0, cy = 0;
  stk.addEventListener('pointerdown', e => { sid = e.pointerId; const r = stk.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stk.setPointerCapture(e.pointerId); mv(e); ac(); });
  function mv(e) { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 52; if (d > m) { dx *= m / d; dy *= m / d; } TI.mx = dx / m; TI.my = dy / m; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  stk.addEventListener('pointermove', mv);
  const end = e => { if (e.pointerId !== sid) return; sid = null; TI.mx = TI.my = 0; knob.style.transform = ''; };
  stk.addEventListener('pointerup', end); stk.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerdown', e => { if (!isTouch || TI.lookId !== null) return; TI.lookId = e.pointerId; TI.lx = e.clientX; TI.ly = e.clientY; });
  canvas.addEventListener('pointermove', e => { if (e.pointerId !== TI.lookId) return; lookX += (e.clientX - TI.lx) * 1.6; lookY += (e.clientY - TI.ly) * 1.6; TI.lx = e.clientX; TI.ly = e.clientY; });
  const lend = e => { if (e.pointerId === TI.lookId) TI.lookId = null; }; canvas.addEventListener('pointerup', lend); canvas.addEventListener('pointercancel', lend);
  document.querySelectorAll('#touch [data-b]').forEach(b => {
    const k = b.getAttribute('data-b'); let t0 = 0, holdT = 0;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); ac(); t0 = now(); b.classList.add('on'); TI.held[k] = true;
      if (k === 'fire') P.burstReq = true;
      if (k === 'crouch' || k === 'swap') holdT = setTimeout(() => { holdT = 0; act(k === 'crouch' ? 'prone' : 'holster'); }, 420);
      else if (k === 'aim' || k === 'fire' || k === 'sprint') {} else act(k);
    });
    const up = () => { b.classList.remove('on'); TI.held[k] = false; if (holdT) { clearTimeout(holdT); holdT = 0; act(k === 'crouch' ? 'crouch' : 'swap'); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
})();

// controller: tap / hold / double-tap like the console layout
const HOLD = .38, padT = {};
function padButton(i, held, onTap, onHold, onDouble) {
  const s = padT[i] || (padT[i] = { down: false, t: 0, held: false, lastTap: -9, pend: 0 });
  if (held && !s.down) { s.down = true; s.t = now(); s.held = false; }
  if (held && s.down && !s.held && onHold && now() - s.t > HOLD) { s.held = true; onHold(); }
  if (!held && s.down) {
    s.down = false;
    if (!s.held) {
      if (onDouble) { if (now() - s.lastTap < .3) { clearTimeout(s.pend); s.lastTap = -9; onDouble(); } else { s.lastTap = now(); s.pend = setTimeout(onTap, 300); } }
      else onTap();
    }
  }
}
let padSel = 0;
function padMenu() {
  const ov = [...document.querySelectorAll('.ov.show')].pop(); if (!ov) return;
  const b = [...ov.querySelectorAll('button')].filter(x => !x.disabled && x.offsetParent); if (!b.length) return;
  if (PAD.pressed('down') || PAD.pressed('right')) padSel = (padSel + 1) % b.length;
  if (PAD.pressed('up') || PAD.pressed('left')) padSel = (padSel - 1 + b.length) % b.length;
  padSel = Math.min(padSel, b.length - 1);
  b.forEach((x, i) => { x.style.outline = i === padSel ? '3px solid #fde68a' : ''; }); if (b[padSel]) b[padSel].scrollIntoView({ block: 'nearest' });
  if (PAD.pressed('cross')) b[padSel].click();
  if (PAD.pressed('circle') || PAD.pressed(17)) { if (ov.id === 'ov' && !started) return; closeMenus(); }
}
function readPad(dt) {
  if (!PAD) return null;
  const p = PAD.poll(); if (!p) { if (padOn) { padOn = false; document.body.classList.remove('pad'); } return null; }
  if (!padOn) { padOn = true; document.body.classList.add('pad'); say('🎮 ' + PAD.name(p.id) + ' ready', 2500); setHint(); }
  const st = PAD.state();
  if (menuOpen()) { padMenu(); return null; }
  const aiming = st.l2 > .4, inVeh = P.mode === 'vehicle';
  if (PAD.pressed('options')) { pause(); return null; }
  if (PAD.pressed(17) || PAD.pressed('share')) { openTac(); return null; }
  if (inVeh) {
    padButton(2, st.held('square'), () => {}, () => act('use'));
    if (PAD.pressed('down')) act('lights'); if (PAD.pressed('right')) act('vision');
    return { st, aiming: false, hb: st.held('cross') || st.held('circle') };
  }
  if (P.mode === 'drone') { if (PAD.pressed('up')) act('drone'); return { st, up: st.held('cross'), down: st.held('circle') }; }
  if (PAD.pressed('l3')) sprintToggle = !sprintToggle;
  if (PAD.pressed('r3')) act(aiming ? 'shoulder' : 'use');
  if (PAD.pressed('l1')) act('throw');
  if (PAD.pressed('cross')) act('jump');
  padButton(1, st.held('circle'), () => act('crouch'), () => act('prone'));
  padButton(2, st.held('square'), () => act('reload'), () => act('use'));
  padButton(3, st.held('triangle'), () => act('swap'), () => act('holster'), () => act('slot3'));
  padButton(5, st.held('r1'), () => act('mark'), () => act('squad'));
  if (aiming) { if (PAD.pressed('up')) act('suppressor'); if (PAD.pressed('down')) act('launcher'); if (PAD.pressed('left')) act('fireMode'); if (PAD.pressed('right')) act('aimMode'); }
  else { if (PAD.pressed('up')) act('drone'); if (PAD.pressed('down')) act('bino'); if (PAD.pressed('left')) act('throwCycle'); if (PAD.pressed('right')) act('vision'); }
  if (st.r2 > .5 && !readPad.r2) P.burstReq = true; readPad.r2 = st.r2 > .5;
  return { st, aiming, fire: st.r2 > .5 };
}

// ------------------------------------------------------------------ actions
let droneZoom = 1;
const D = { pos: new V3(), yaw: 0, pitch: -.6, bat: 1, cool: 0, mesh: null, markT: 0 };
const BINO = { markT: 0 };
let syncCool = 0, syncPending = null;
function act(a) {
  if (!started || P.mode === 'dead') return;
  if (P.mode === 'down') { if (a === 'use') { P.bleed = 0; } else if (a === 'map') openTac(); else if (a === 'skills') openSkills(); return; }
  if (P.mode === 'vehicle') { if (a === 'use') exitVehicle(); else if (a === 'lights') toggleLights(); else if (a === 'vision') cycleVision(); else if (a === 'map') openTac(); else if (a === 'skills') openSkills(); else if (a === 'hud') document.body.classList.toggle('nohud'); return; }
  if (P.mode === 'drone' && !['drone', 'vision', 'map', 'skills', 'hud', 'mark', 'squad', 'jump', 'crouch'].includes(a)) return;
  switch (a) {
    case 'crouch': if (P.mode === 'drone') return; P.stance = P.stance === 1 ? 0 : 1; break;
    case 'prone': P.stance = P.stance === 2 ? 0 : 2; break;
    case 'jump': if (P.mode === 'drone') return; if (P.stance) { P.stance = 0; break; } if (P.onGround) { P.vy = 5.6; P.onGround = false; } break;
    case 'walk': P.walk = !P.walk; say(P.walk ? 'Walking (quiet)' : 'Running'); break;
    case 'reload': reload(); break;
    case 'aimMode': P.fps = !P.fps; say(P.fps ? 'First-person aiming' : 'Over-the-shoulder aiming'); break;
    case 'shoulder': P.shoulder *= -1; break;
    case 'fireMode': { const n = curGun(); if (!n) return; const g = gs(n); if (!BASE[gunCat(n)].auto) { say('This gun only fires single shots'); return; } g.mode = { auto: 'burst', burst: 'single', single: 'auto' }[g.mode]; say('Fire mode: ' + g.mode); break; }
    case 'suppressor': { const n = curGun(); if (!n) return; if (!BASE[gunCat(n)].sup) { say('No suppressor fits a ' + CAT_NAME[gunCat(n)]); return; } const g = gs(n); g.sup = !g.sup; say(g.sup ? '🔇 Suppressor on (quiet' + (rank('adv_suppressor') ? '' : ', a little less damage') + ')' : '🔊 Suppressor off'); break; }
    case 'launcher': say(rank('grenade_launcher') ? 'Grenade launcher arrives in a later update' : 'Unlock Grenade Launcher in the Weapon skills (J)'); break;
    case 'holster': P.holster = !P.holster; say(P.holster ? 'Weapon holstered' : 'Weapon out'); break;
    case 'swap': P.holster = false; P.slot = P.slot === 0 && S.load[1] ? 1 : P.slot === 1 ? 0 : 0; P.reloadT = 0; break;
    case 'slot1': case 'slot2': case 'slot3': { const i = +a.slice(4) - 1; if (!S.load[i]) { say(i === 1 ? 'Find a sniper or shotgun in a weapon case' : 'Empty slot'); return; } P.slot = i; P.holster = false; P.reloadT = 0; break; }
    case 'slot4': case 'throwCycle': say('Throwable: 💣 Frag grenade (' + P.frags + '/' + maxFrags() + ')' + (rank('flashbang_grenade') || rank('c4') || rank('mine') ? ' · more gadgets in a later update' : '')); break;
    case 'throw': throwNade(); break;
    case 'heal': heal(); break;
    case 'drone': toggleDrone(); break;
    case 'bino': P.mode = P.mode === 'bino' ? 'foot' : 'foot'; P.bino = !P.bino; BINO.markT = 0; if (P.bino) say('🔭 Binoculars: hold the crosshair on enemies to mark them'); break;
    case 'vision': cycleVision(); break;
    case 'mark': markUnderCrosshair(); break;
    case 'squad': openWheel(); break;
    case 'use': use(); break;
    case 'map': openTac(); break;
    case 'skills': openSkills(); break;
    case 'chat': say('💬 Chat comes with co-op squads (friends) in a later update'); break;
    case 'hud': document.body.classList.toggle('nohud'); break;
    case 'lights': say('Headlights work while driving'); break;
  }
  hudNow();
}
function reload() {
  const n = curGun(); if (!n || P.reloadT > 0) return; const s = gstat(n), g = gs(n), c = s.cat;
  if (g.mag >= s.mag) return; if ((ammo[c] | 0) <= 0) { say('Out of ' + CAT_NAME[c] + ' ammo: loot enemies, crates or the rally point'); return; }
  P.reloadT = c === 'lmg' ? 3.2 : c === 'sr' || c === 'sg' ? 2.6 : 1.9; SFX.reload();
}
function finishReload() { const n = curGun(); if (!n) return; const s = gstat(n), g = gs(n), need = s.mag - g.mag, take = Math.min(need, ammo[s.cat] | 0); g.mag += take; ammo[s.cat] -= take; }
function cycleVision() {
  P.vision = (P.vision + 1) % 3; if (P.vision === 2 && !thermalOK()) P.vision = 0;
  if (P.vision === 0 && !thermalOK() && cycleVision.warned !== true) { cycleVision.warned = true; say('Unlock Thermal Vision in the Drone or Items skills'); }
  applyVision();
}
function applyVision() {
  canvas.style.filter = P.vision === 1 ? 'brightness(' + (dayK < .5 ? 3.2 : 1.6) + ') sepia(1) hue-rotate(50deg) saturate(2.6) contrast(1.1)' : P.vision === 2 ? 'grayscale(1) brightness(.6) contrast(1.7)' : '';
  enemies.forEach(e => { const em = P.vision === 2 && !e.dead ? 0xffffff : 0; e.m.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { if (!o.userData.own) { o.material = o.material.clone(); o.userData.own = true; } o.material.emissive.setHex(em); } }); });
  if (P.vision) say(P.vision === 1 ? '🟢 Night vision' : '🔥 Thermal vision'); hudNow();
}
function heal() { const mx = maxHP(); if (P.hp >= mx - 1) { say('Health is full'); return; } if (P.heals <= 0) { say('No med kits: resupply at the rally point ⛺'); return; } P.heals--; P.healing = 1.4; say('❤️ Healing'); }
function throwNade() {
  if (P.frags <= 0) { say('No grenades: resupply at the rally point ⛺ or supply crates'); return; }
  P.frags--; const d = camDir(), p = P.pos.clone().add(new V3(0, 1.6, 0)).addScaledVector(d, .6);
  const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), mat(0x3f6212)); m.position.copy(p); scene.add(m);
  nades.push({ m, v: d.clone().multiplyScalar(17).add(new V3(0, 4, 0)), t: 2.3 });
  hudNow();
}
function explode(p) {
  SFX.boom(); puff(p, 0xf97316, .8); puff(p.clone().add(new V3(0, 1, 0)), 0x57534e, 1.1); PAD && PAD.rumble(.9, .6, 300);
  const R = 7 * (rank('epic_explosion_radius') ? 1.4 : 1);
  enemies.forEach(e => { if (e.dead) return; const d = e.pos.distanceTo(p); if (d < R) damageEnemy(e, 170 * (1 - d / R) + 20, false, 'boom'); });
  const pd = P.pos.distanceTo(p); if (pd < R) hurtPlayer(110 * (1 - pd / R) * (1 - eff('explosion_resistance')));
  noiseEvent(p, 110);
}
function markEnemy(e, quiet, fromNet) { if (e.dead || e.marked) return; e.marked = true; if (MP.on && !fromNet) netAll({ k: 'mark', i: enemies.indexOf(e) }); if (!quiet) { SFX.click(); say('Marked: ' + countMarked() + ' target' + (countMarked() === 1 ? '' : 's') + ' · R1 / Tab for Sync Shot'); } }
function countMarked() { return enemies.filter(e => e.marked && !e.dead).length; }
const ray = new THREE.Raycaster();
function enemyMeshes() { const a = []; enemies.forEach(e => { if (!e.dead) e.m.traverse(o => { if (o.isMesh && o.userData.part) a.push(o); }); }); return a; }
function markUnderCrosshair() {
  ray.set(camera.position, camDir(true)); ray.near = 0; ray.far = 260; const h = ray.intersectObjects(enemyMeshes(), false)[0];
  if (h && h.object.userData.e) { const e = h.object.userData.e; if (e.marked) { e.marked = false; say('Unmarked'); } else markEnemy(e); } else say('Aim at an enemy to mark it');
}
function use() {
  // takedown an enemy right in front, or get in a truck
  const f = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  const e = enemies.find(e => !e.dead && e.pos.distanceTo(P.pos) < 2.4 && new V3().subVectors(e.pos, P.pos).setY(0).normalize().dot(f) > .3);
  if (e) { damageEnemy(e, 999, false, 'melee'); say('🔪 Takedown'); return; }
  const mate = squad.find(b => b.down && b.pos.distanceTo(P.pos) < 2.6);
  if (mate) { P.reviving = mate; mate.revT = 0; say('⛑️ Reviving ' + mate.name + '… stay close'); return; }
  const fr = Object.values(MP.remotes).find(r => r.mode === 'down' && !r.stale && r.pos.distanceTo(P.pos) < 2.8);
  if (fr) { P.revivingR = fr; fr.myRev = 0; say('⛑️ Reviving ' + fr.name + '… stay close'); return; }
  const v = vehicles.find(v => v.pos.distanceTo(P.pos) < 4.2);
  if (v) { enterVehicle(v); return; }
  say('Nothing to use here');
}

// ------------------------------------------------------------------ combat
function camDir(center) {
  const d = new V3(); camera.getWorldDirection(d); return d;
}
function damageEnemy(e, dmg, head, how, by) {
  if (e.dead) return;
  if (MP.client) { netHit(e, dmg, head, how); return; }        // in a friend's game the host decides hits
  const shooter = by && MP.remotes[by];
  e.hp -= dmg / DF().hp; if (!e.alert && how !== 'melee' && how !== 'sync') alertEnemy(e, true);
  e.last.copy(shooter ? shooter.pos : P.pos);
  if (e.hp > 0) return;
  e.dead = true; e.deadT = 0; e.marked = false; e.mark.visible = false; e.ind.visible = false;
  const xp = head ? 90 : how === 'melee' ? 85 : 60;
  if (shooter) netTo(by, { k: 'xp', n: xp, kill: 1, head: head ? 1 : 0 });
  else { S.kills++; if (head) S.heads++; addXP(xp); }
  if (Math.random() < .7) { const g = new THREE.Group(); g.add(box(.4, .25, .3, mat(0x854d0e), 0, .12, 0)); g.position.copy(e.pos); g.position.y = hAt(e.pos.x, e.pos.z); scene.add(g); drops.push({ m: g, t: 90 }); }
  // witnesses: guards who can see the body nearby get suspicious
  enemies.forEach(o => { if (o.dead || o === e || o.alert) return; if (o.pos.distanceTo(e.pos) < 20 && los(eye(o.pos), eye(e.pos, .5))) o.det = Math.max(o.det, .75); });
  const c = e.camp;
  if (c && !c.cleared && c.guards.every(g => g.dead)) {
    c.cleared = true; c.flag.visible = false; S.camps[c.id] = Date.now(); addXP(c.post ? 120 : 300); if (MP.host) netAll({ k: 'camp', id: c.id }); big(c.name + ' cleared'); say(c.post ? '+120 XP · what it guarded is yours to take' : '+300 XP · the weapon case here is free to take');
    if (!S.liberated && mainCamps().every(k => k.cleared)) { S.liberated = true; addXP(1500); setTimeout(() => big('🏁 ' + PROVINCE + ' liberated!', 4000), 2200); }
    save(true);
  }
}
function eye(p, h) { return new V3(p.x, p.y + (h == null ? 1.65 : h), p.z); }
function alertEnemy(e, spread) {
  if (e.dead) return; const was = e.alert; e.alert = true; e.det = 1; e.seenT = now(); e.last.copy(P.pos);
  if (!was) { e.ind.material.map = TEX.alert; e.ind.material.needsUpdate = true; }
  if (spread && e.camp && !e.camp.alerted) { e.camp.alerted = true; SFX.alert(); say('⚠️ ' + e.camp.name + ' is on alert'); setTimeout(() => e.camp.guards.forEach(g => { if (!g.dead && !g.alert) { g.alert = true; g.det = 1; g.seenT = now(); g.last.copy(P.pos); g.ind.material.map = TEX.alert; } }), 900); }
}
// gunfire only stirs the camp it happens at (or guards standing right there): other camps stay put unless the alarm goes off
const nearOwnCamp = (e, p) => !e.camp || Math.hypot(e.camp.x - p.x, e.camp.z - p.z) < (e.camp.post ? 32 : 48) || e.pos.distanceTo(p) < 22;
function triggerAlarm(c) {
  if (c.alarmOn || c.cleared) return; c.alarmOn = now(); SFX.siren(); big('🚨 ALARM at ' + c.name, 2600); say('🚨 ' + c.name + ' sounded the alarm: reinforcements from nearby camps are on their way!', 5000);
  // up to two other camps within 170 m send about half their guards (never the tower lookout)
  mainCamps().filter(o => o !== c && !o.cleared).map(o => ({ o, d: Math.hypot(o.x - c.x, o.z - c.z) })).filter(q => q.d < 170).sort((a, b) => a.d - b.d).slice(0, 2).forEach(q => {
    const live = q.o.guards.filter(g => !g.dead && !g.tower); live.slice(0, Math.max(1, Math.ceil(live.length / 2))).forEach(g => { g.resp = true; g.alert = true; g.det = 1; g.seenT = now(); g.last.set(c.x, 0, c.z); g.ind.material.map = TEX.alert; g.ind.material.needsUpdate = true; });
  });
}
function alarmTick(dt) {     // a guard from an alerted camp runs for the siren; kill him first and nobody else comes
  const T = now();
  mainCamps().forEach(c => {
    if (c.siren) c.siren.material.color.setHex(c.alarmOn && Math.floor(T * 4) % 2 ? 0xfde047 : 0xef4444);
    if (c.cleared || !c.alerted) { if (c.alarmOn && (c.cleared || T - c.alarmOn > 20)) c.alarmOn = 0; if (c.runner) { c.runner.toAlarm = false; c.runner = null; } return; }
    if (c.alarmOn || !c.alarmAt) return;
    if (c.runner && (c.runner.dead || !c.runner.toAlarm)) { c.runner = null; c.nextRunT = T + 6; say('🔕 The guard going for the alarm is down', 2500); }
    if (!c.runner && T > (c.nextRunT || 0)) {
      let best = null, bd = 1e9; c.guards.forEach(g => { if (g.dead || g.tower) return; const d = Math.hypot(g.pos.x - c.alarmAt.x, g.pos.z - c.alarmAt.z); if (d < bd) { bd = d; best = g; } });
      if (best) { c.runner = best; best.toAlarm = true; best.alarmT = 0; say('🏃 A guard at ' + c.name + ' is running for the alarm: stop him!', 4000); }
    }
  });
}
function noiseEvent(p, r) { if (MP.client) { netNoise(p, r); return; } enemies.forEach(e => { if (!e.dead && e.pos.distanceTo(p) < r && nearOwnCamp(e, p)) { if (r > 30) alertEnemy(e, true); else e.det = Math.max(e.det, .6); e.last.copy(p); } }); }
function fireGun(dt, wantFire) {
  const n = curGun(); if (!n || P.holster || P.reloadT > 0 || P.mode !== 'foot' || P.bino) return;
  const s = gstat(n), g = gs(n), t = now();
  if (P.slot === 3) return;
  let shoot = false;
  if (g.mode === 'auto') shoot = wantFire;
  else if (g.mode === 'burst') { if (P.burstReq) { P.burst = 3; P.burstReq = false; } shoot = P.burst > 0; }
  else { shoot = P.burstReq; P.burstReq = false; }
  if (!shoot || t < P.next) return;
  if (g.mag <= 0) { SFX.click(); P.burst = 0; reload(); return; }
  g.mag--; if (P.burst > 0) P.burst--; P.next = t + 60 / s.rpm;
  const aimK = P.aimK, spread = s.spread * (aimK > .5 ? .35 : s.hip * 1.4) * (P.stance === 2 ? .6 : P.stance === 1 ? .8 : 1) * (P.moving ? 1.4 : 1);
  const pel = s.pellets || 1, targets = enemyMeshes().concat([terrainMesh]), muzzle = P.pos.clone().add(new V3(0, 1.4, 0)).addScaledVector(camDir(), .9);
  const camNear = camera.position.distanceTo(eye(P.pos, 1.5)) + .3;
  let anyHit = false, headHit = false;
  for (let k = 0; k < pel; k++) {
    const d = camDir().add(new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(spread)).normalize();
    ray.set(camera.position, d); ray.near = camNear; ray.far = s.range;
    let hit = ray.intersectObjects(targets, false)[0];
    let end = hit ? hit.point : camera.position.clone().addScaledVector(d, s.range);
    // buildings stop bullets
    const bh = buildingHit(camera.position, d, camNear, hit ? hit.distance : s.range); if (bh) { end = bh; hit = null; }
    if (hit && hit.object.userData.e) {
      const e = hit.object.userData.e, head = hit.object.userData.part === 'head', dist = hit.distance;
      let dmg = s.dmg * (head ? (s.cat === 'sg' ? 2 : 4) : 1) * (g.sup && !rank('adv_suppressor') ? .85 : 1) * (dist > 50 && rank('epic_ranged_elite') ? 1.25 : 1) * (dist > s.range * .6 ? .75 : 1);
      damageEnemy(e, dmg, head, 'gun'); anyHit = true; headHit = headHit || head; puff(end, 0xb91c1c, .22); e.flinch = .18;
    } else if (hit || bh) puff(end, bh ? 0xd6d3d1 : 0x8b7355, .2);
    if (k < 3) tracer(muzzle, end);
  }
  if (anyHit) { hitFlash(); headHit ? SFX.head() : SFX.hit(); }
  P.recoil = Math.min(.3, (P.recoil || 0) + s.recoil * (aimK > .5 ? 1.1 : 1.5)); P.recoilYaw = (P.recoilYaw || 0) + rnd(-1, 1) * s.recoil * .35; P.shotAgo = 0; flash(muzzle, g.sup ? .45 : 1); SFX.shot(g.sup, s.cat); PAD && PAD.rumble(.25, .15, 60);
  noiseEvent(P.pos, g.sup ? 9 : s.cat === 'sr' ? 140 : 80); if (MP.on) MP.shotN = (MP.shotN + 1) % 1000;
}
function buildingHit(o, d, near, far) {
  for (let t = near; t < far; t += .5) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; for (const c of colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.top) return new V3(x, y, z); }
  return null;
}
function hurtPlayer(dmg) {
  if (P.mode === 'dead' || P.mode === 'down') return;
  dmg *= (1 - eff('bullet_resistance')) * (P.mode === 'vehicle' ? (1 - eff('car_shield')) * .7 : 1);
  P.hp -= dmg; P.hurtT = now(); hurtFlash(dmg / 60); SFX.hurt(); PAD && PAD.rumble(.6, .4, 140);
  if (P.hp <= 0) goDown();
}
const botMaxHP = () => 100 * (1 + eff('squad_resilience'));
const reviveTime = () => 3.5 * (1 - eff('revive_speed'));
function goDown() {     // down, not out: a squadmate runs over to revive you before you bleed out
  if (P.mode === 'down' || P.mode === 'dead') return;
  if (P.mode === 'vehicle') exitVehicle(true); if (P.mode === 'drone') toggleDrone(true);
  P.bino = false; P.reloadT = 0; P.mode = 'down'; P.hp = 0; P.downT = now(); P.bleed = 30 * (1 + eff('bleed_out_time')); P.revT = 0;
  big('YOU ARE DOWN', 2200); say(!S.squadOff && squad.some(b => !b.down) ? 'Hang on: your squad is coming to revive you · E / hold □ to skip the wait' : 'Your whole squad is down · E / hold □ to skip the wait', 5000);
}
function die() {
  if (P.mode === 'vehicle') exitVehicle(true); if (P.mode === 'drone') toggleDrone(true);
  P.mode = 'dead'; P.deadT = now(); P.hp = 0; $('center').textContent = '';
  setTimeout(deathScreen, 700);
}
function deathScreen() {     // the countdown ran out: get revived where you fell, or reset at the rally point
  if (P.mode !== 'dead') return; show('ov');
  $('ovBox').innerHTML = '<h2>💀 You bled out</h2><div class="muted">Your squad couldn\u2019t reach you in time. Get back in the fight where you fell, or reset at the rally point ⛺ (camps calm down, full ammo).</div>'
    + '<div style="margin-top:10px"><button id="dRev">⛑️ Revive here</button><button class="alt" id="dReset">⟲ Reset at rally point</button></div>';
  $('dRev').onclick = () => { respawn(true); closeMenus(); resume(); };
  $('dReset').onclick = () => { respawn(false); closeMenus(); resume(); };
}
function respawn(here) {
  P.mode = 'foot'; P.stance = 0; P.bino = false; P.revT = 0; P.hurtT = now();
  if (here) {     // back up where you fell, a little hurt; the squad regroups on you and the enemy pauses a moment
    P.hp = maxHP() * .5; P.pos.y = groundAt(P.pos.x, P.pos.z, P.pos.y + .5);
    enemies.forEach(e => { if (!e.dead) e.shotT = Math.max(e.shotT, rnd(2.5, 4)); });
    say('⛑️ Back on your feet: find cover!');
  } else {
    P.pos.set(rally.x, hAt(rally.x, rally.z), rally.z); P.hp = maxHP();
    refill(rank('ammo_retention') > 0 || true);
    enemies.forEach(e => { if (!e.dead) { e.alert = false; e.det = 0; e.ind.visible = false; e.resp = false; e.toAlarm = false; } });
    camps.forEach(c => { c.alerted = false; c.alarmOn = 0; c.runner = null; });
    say('⛺ Reset at the rally point');
  }
  squad.forEach((b, i) => { b.pos.set(P.pos.x + b.off[0], 0, P.pos.z + b.off[1]); b.down = false; b.hp = botMaxHP(); b.revT = 0; });
}

// ------------------------------------------------------------------ drone / binoculars / sync shot
function droneBattery() { const e = eff('battery_increase'); return e === Infinity ? Infinity : 40 * (1 + e); }
function toggleDrone(force) {
  if (P.mode === 'drone') { P.mode = 'foot'; D.mesh.visible = false; setHum(false); $('bat').style.display = 'none'; if (!force) say('Drone recalled'); D.cool = Math.max(D.cool, D.bat <= 0 ? droneCooldown() : 3); return; }
  if (P.mode !== 'foot') return;
  if (D.cool > 0) { say('🛸 Drone recharging: ' + Math.ceil(D.cool) + 's'); return; }
  if (!D.mesh) { const g = new THREE.Group(); g.add(box(.5, .14, .5, mat(0x111827))); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => g.add(new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .02, 10), mat(0x64748b)).translateX(p[0] * .32).translateZ(p[1] * .32).translateY(.08))); scene.add(g); D.mesh = g; }
  D.mesh.visible = true; D.pos.copy(P.pos).add(new V3(0, 6, 0)); D.yaw = P.yaw; D.pitch = -.35; D.bat = droneBattery(); droneZoom = 1;
  P.mode = 'drone'; P.bino = false; setHum(true); $('bat').style.display = ''; say('🛸 Drone up: aim at enemies to mark them · Space/C up/down · Q to recall');
}
function droneCooldown() { const v = effNum('cooldown'); return v || 40; }
function spotMarking(dt, origin, dir, maxD, state, speed) {
  let best = null, bestA = .06;
  enemies.forEach(e => { if (e.dead || e.marked) return; const to = eye(e.pos, 1.2).sub(origin), d = to.length(); if (d > maxD) return; const a = to.normalize().angleTo(dir); if (a < bestA && los(origin, eye(e.pos, 1.2))) { bestA = a; best = e; } });
  if (best) { state.markT += dt * speed; if (state.markT > .3) { state.markT = 0; markEnemy(best); const area = rank('mark_area') ? 5 * (1 + eff('mark_area')) : 0; if (area) enemies.forEach(o => { if (!o.dead && o.pos.distanceTo(best.pos) < area) markEnemy(o, true); }); } }
  else state.markT = 0;
}
function syncShot() {
  if (MP.client) { const l = enemies.filter(e => e.marked && !e.dead).map(e => enemies.indexOf(e)); if (!l.length) { say('Mark targets first'); return; } netHost({ k: 'sync', l }); big('SYNC SHOT', 1200); return; }
  if (S.squadOff || !squad.some(b => !b.inactive && !b.down)) { say(MP.on ? 'Sync shot needs an AI squadmate (they fill empty co-op slots)' : 'Sync shot needs your AI squad: turn it on in the pause menu'); return; }
  const max = 3 + (rank('extra_sync_shot') ? effNum('extra_sync_shot') : 0);
  const list = enemies.filter(e => e.marked && !e.dead && e.pos.distanceTo(P.pos) < 180).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos)).slice(0, max);
  if (!list.length) { say('Mark targets first (R1 tap / middle mouse / drone / binoculars)'); return; }
  if (syncCool > 0) { say('Sync shot ready in ' + Math.ceil(syncCool) + 's'); return; }
  syncPending = { list, t: 1.6 }; big('SYNC SHOT ' + list.length, 1500); say('Squad: "On your mark… 3, 2, 1"');
}

// ------------------------------------------------------------------ vehicles
let headlight = null;
function enterVehicle(v) { P.mode = 'vehicle'; P.veh = v; P.bino = false; me.visible = false; squad.forEach(b => { b.m.visible = false; }); say('🚙 Driving · W/S or R2/L2 gas & brake · Space handbrake · E / hold □ to get out'); }
function exitVehicle(silent) {
  const v = P.veh; if (!v) return; P.mode = 'foot'; P.veh = null; me.visible = true;
  const side = new V3(Math.cos(v.yaw), 0, -Math.sin(v.yaw)).multiplyScalar(2.4); P.pos.copy(v.pos).add(side); pushOut(P.pos, .4, hAt(P.pos.x, P.pos.z)); P.pos.y = hAt(P.pos.x, P.pos.z); P.vy = 0;
  squad.forEach(b => { b.m.visible = true; b.pos.set(P.pos.x + b.off[0], 0, P.pos.z + b.off[1]); }); v.spd = 0; if (headlight) headlight.visible = false;
}
function toggleLights() { if (!headlight) { headlight = new THREE.SpotLight(0xfff7cc, 3, 70, .5, .5, 1); scene.add(headlight); scene.add(headlight.target); headlight.visible = false; } headlight.visible = !headlight.visible; say(headlight.visible ? '💡 Headlights on' : 'Headlights off'); }
function driveVehicle(dt, thr, steer, hb) {
  const v = P.veh, max = 27, f = new V3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
  if (thr > 0) v.spd += (v.spd < 0 ? 16 : 9) * thr * dt; else if (thr < 0) v.spd += (v.spd > 0 ? -18 : -6) * -thr * dt;
  v.spd -= v.spd * (hb ? 1.8 : .35) * dt; v.spd -= Math.sin(v.pitch || 0) * 9.8 * dt; v.spd = clamp(v.spd, -9, max);   // hills slow you down going up, speed you up going down
  const turn = steer * clamp(Math.abs(v.spd) / 6, 0, 1) * (hb ? 1.6 : 1) * 1.6 * Math.sign(v.spd || 1); v.yaw -= turn * dt;
  const np = v.pos.clone().addScaledVector(f, v.spd * dt), before = np.clone(); pushOut(np, 1.3, hAt(np.x, np.z));
  if (before.distanceTo(np) > .01) v.spd *= -.25;
  const slope = (hAt(np.x, np.z) - hAt(v.pos.x, v.pos.z)) / Math.max(.01, Math.abs(v.spd * dt)); if (slope > 1.1 && v.spd > 4) v.spd *= .9;
  v.pos.copy(np); v.pos.y = hAt(v.pos.x, v.pos.z);
  if (Math.abs(v.spd) > 6) enemies.forEach(e => { if (!e.dead && e.pos.distanceTo(v.pos) < 2.3) { damageEnemy(e, 999, false, 'car'); noiseEvent(v.pos, 40); } });
  if (Math.abs(v.spd) > 3) noiseEvent(v.pos, 14);
  P.pos.copy(v.pos);
}
function placeVehicle(v, dt) {     // body sits on all four wheels, with springy suspension so it bounces over bumps
  dt = Math.min(dt || .016, .05);
  const f = new V3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw)), r = new V3(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
  const W = (a, b) => hAt(v.pos.x + f.x * a + r.x * b, v.pos.z + f.z * a + r.z * b);
  const fl = W(1.5, -1.05), fr = W(1.5, 1.05), bl = W(-1.5, -1.05), br = W(-1.5, 1.05);
  const ty = (fl + fr + bl + br) / 4, tp = Math.atan2((fl + fr) / 2 - (bl + br) / 2, 3), tr = Math.atan2((fr + br) / 2 - (fl + bl) / 2, 2.1);   // tr > 0: right side higher
  const sp = v.sp || (v.sp = { y: ty, vy: 0, p: tp, vp: 0, r: tr, vr: 0, ly: ty });
  if (Math.abs(v.spd) > 2) { const rise = (ty - sp.ly) / dt; if (rise > 0) sp.vy += rise * .35; sp.vr += (vnoise(v.pos.x / 3, v.pos.z / 3) - .5) * Math.abs(v.spd) * .05; sp.vp += (vnoise(v.pos.z / 3 + 7, v.pos.x / 3) - .5) * Math.abs(v.spd) * .04; }
  sp.ly = ty;
  sp.vy += ((ty - sp.y) * 90 - sp.vy * 9) * dt; sp.y += sp.vy * dt; if (sp.y < ty - .12) { sp.y = ty - .12; sp.vy = Math.max(0, sp.vy); }
  sp.vp += ((tp - sp.p) * 70 - sp.vp * 10) * dt; sp.p += sp.vp * dt;
  sp.vr += ((tr - sp.r) * 70 - sp.vr * 10) * dt; sp.r += sp.vr * dt;
  v.mesh.position.set(v.pos.x, sp.y, v.pos.z); v.mesh.rotation.order = 'YXZ'; v.mesh.rotation.set(sp.p, v.yaw, sp.r);
  v.pitch = sp.p;
}

// ------------------------------------------------------------------ main loop
let started = false, last = 0, hudT = 0, presT = 0, reinT = 0, timeT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
  if (!world) return;
  const pad = readPad(dt);
  if (started && !menuOpen()) update(dt, pad);
  else { lookX = lookY = 0; if (started && MP.on) { enemiesTick(dt); squadTick(dt); netTick(dt); } }
  renderer.render(scene, camera);
}
function update(dt, pad) {
  const T = now(), st = pad && pad.st;
  // ---- look
  const sens = (P.aimK > .5 ? .0012 : .0022) / (P.bino ? 4 : 1) / (P.mode === 'drone' ? droneZoom : 1);
  let ly = lookY, lx = lookX; lookX = lookY = 0;
  if (st) { lx += st.rx * 900 * dt * (P.aimK > .5 ? .55 : 1); ly += st.ry * 650 * dt * (P.aimK > .5 ? .55 : 1); }
  if (P.mode === 'drone') { D.yaw -= lx * sens; D.pitch = clamp(D.pitch - ly * sens, -1.45, .3); }
  else { P.yaw -= lx * sens; P.pitch = clamp(P.pitch - ly * sens, -1.2, 1.1); }
  // ---- move input
  let mx = (K.has('KeyD') ? 1 : 0) - (K.has('KeyA') ? 1 : 0) + TI.mx, mz = (K.has('KeyW') ? 1 : 0) - (K.has('KeyS') ? 1 : 0) - TI.my;
  if (st) { mx += st.moveX(); mz -= st.moveY(); }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const wantAim = mouseR || TI.held.aim || (pad && pad.aiming);
  const wantFire = mouseL || TI.held.fire || (pad && pad.fire);

  if (P.mode === 'dead') { /* waiting on the revive / reset choice */ }
  else if (P.mode === 'down') {
    P.bleed -= dt; $('center').textContent = '⛑️ DOWN · ' + Math.max(0, Math.ceil(P.bleed)) + 's' + (P.revT > 0 ? ' · reviving ' + Math.round(P.revT / reviveTime() * 100) + '%' : '');
    if (P.bleed <= 0) { $('center').textContent = ''; die(); }
  }
  else if (P.mode === 'vehicle') {
    let thr = mz, steer = mx; if (st) { thr = (st.r2 || 0) - (st.l2 || 0) || thr; }
    driveVehicle(dt, clamp(thr, -1, 1), clamp(steer, -1, 1), K.has('Space') || (pad && pad.hb) || TI.held.jump);
  } else if (P.mode === 'drone') {
    const sp = 10 * (1 + eff('speed')) * dt, f = new V3(-Math.sin(D.yaw), 0, -Math.cos(D.yaw)), r = new V3(Math.cos(D.yaw), 0, -Math.sin(D.yaw));
    D.pos.addScaledVector(f, mz * sp).addScaledVector(r, mx * sp);
    const up = (K.has('Space') || (pad && pad.up) || TI.held.jump ? 1 : 0) - (K.has('KeyC') || (pad && pad.down) || TI.held.crouch ? 1 : 0); D.pos.y += up * sp * .8;
    const range = 110 * (1 + eff('range')), off = new V3(D.pos.x - P.pos.x, 0, D.pos.z - P.pos.z); if (off.length() > range) { off.setLength(range); D.pos.x = P.pos.x + off.x; D.pos.z = P.pos.z + off.z; if (!D.warn) { D.warn = 1; say('Drone at max range'); } } else D.warn = 0;
    D.pos.y = clamp(D.pos.y, hAt(D.pos.x, D.pos.z) + 2.5, hAt(D.pos.x, D.pos.z) + 70);
    D.mesh.position.copy(D.pos); D.mesh.rotation.y = D.yaw;
    if (D.bat !== Infinity) { D.bat -= dt; if (D.bat <= 0) { say('🔋 Drone battery empty'); toggleDrone(); } }
    const dir = new V3(-Math.sin(D.yaw) * Math.cos(D.pitch), Math.sin(D.pitch), -Math.cos(D.yaw) * Math.cos(D.pitch));
    spotMarking(dt, D.pos, dir, 140, D, 1);
    if (wantFire && P.mode === 'drone') { /* click marks too */ }
  } else {
    // on foot
    const aimTarget = wantAim && !P.holster ? 1 : 0; P.aimK += (aimTarget - P.aimK) * Math.min(1, dt * 9 / (1 - eff('time_to_aim') * .9));
    const wantSprint = (K.has('ShiftLeft') || K.has('ShiftRight') || TI.held.sprint || sprintToggle) && mz > .3 && P.aimK < .3;
    if (ml < .1) sprintToggle = false;
    if (wantSprint && P.stance) P.stance = 0;
    const stamInf = eff('stamina') === Infinity;
    P.sprint = wantSprint && (P.stam > .02 || stamInf);
    if (P.sprint && !stamInf) P.stam = Math.max(0, P.stam - dt / (7 * (1 + eff('stamina')))); else P.stam = Math.min(1, P.stam + dt / 5);
    let spd = P.stance === 2 ? 1.1 : P.stance === 1 ? 2.7 : P.walk ? 2.2 : 4.7; if (P.sprint) spd = 7.4 * (P.holster ? 1.08 : 1); if (P.aimK > .5) spd *= .6;
    const f = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = new V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    const mv = new V3().addScaledVector(f, mz).addScaledVector(r, mx).multiplyScalar(spd * dt);
    P.moving = ml > .1;
    const np = P.pos.clone().add(mv); pushOut(np, .4, P.pos.y);
    // too steep: slide back
    const gNew = groundAt(np.x, np.z, P.pos.y + .5); if (P.onGround && gNew - P.pos.y > .9 && gNew - P.pos.y < 2.5 && mv.length() > 0) { np.x = P.pos.x; np.z = P.pos.z; }
    P.pos.x = np.x; P.pos.z = np.z;
    P.vy -= 18 * dt; P.pos.y += P.vy * dt;
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y + .5);
    if (P.pos.y <= g) { P.pos.y = g; P.vy = 0; P.onGround = true; } else if (P.pos.y - g > .3) P.onGround = false;
    if (P.moving && P.sprint) noiseEvent(P.pos, 7 * (1 - eff('quiet_running')));
    // face: aim/shoot -> camera, else movement
    if (P.aimK > .2 || wantFire || P.bino) P.face = P.yaw; else if (P.moving) { const want = Math.atan2(-mv.x, -mv.z); let d = want - P.face; d = Math.atan2(Math.sin(d), Math.cos(d)); P.face += d * Math.min(1, dt * 10); }
    P.phase += (P.moving ? spd : 0) * dt * 2.2;
    // reload / fire
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; finishReload(); } }
    fireGun(dt, wantFire);
    if (P.bino) spotMarking(dt, camera.position, camDir(), 260, BINO, 1 / (1 - eff('binocular_recon')));
    // heal
    if (P.healing > 0) { P.healing -= dt; P.hp = Math.min(maxHP(), P.hp + maxHP() * dt / 1.4); }
    // pickups + rally resupply
    pickupsTick();
    if (P.revivingR) { const r = P.revivingR; if (r.mode !== 'down' || r.stale || r.pos.distanceTo(P.pos) > 3.2) { if (r.mode === 'down') say('Revive stopped: get closer to ' + r.name); P.revivingR = null; } else { r.myRev += dt; P.moving = false; if (r.myRev >= reviveTime()) { netTo(r.id, { k: 'rev', by: myNameR() }); r.mode = 'foot'; P.revivingR = null; addXP(60); say('⛑️ You revived ' + r.name); } } }
    if (P.reviving) { const b = P.reviving; if (!b.down || b.pos.distanceTo(P.pos) > 3) { if (b.down) say('Revive stopped: get closer to ' + b.name); P.reviving = null; } else { b.revT += dt; P.moving = false; if (b.revT >= reviveTime()) { if (MP.client) netHost({ k: 'revb', i: squad.indexOf(b) }); b.down = false; b.hp = botMaxHP() * .5; b.revT = 0; P.reviving = null; addXP(40); say('⛑️ ' + b.name + ': "Thanks, I owe you one."'); } } }
    if (Math.hypot(P.pos.x - rally.x, P.pos.z - rally.z) < 7 && T - P.resupT > 12) { P.resupT = T; refill(false); say('⛺ Resupplied: ammo, grenades and med kits'); hudNow(); }
  }
  if (P.mode !== 'dead' && P.mode !== 'down' && P.mode !== 'vehicle' && T - P.hurtT > (rank('epic_faster_regen') ? 3 : 5)) P.hp = Math.min(maxHP(), P.hp + dt * (rank('epic_faster_regen') ? 18 : 9));
  P.shotAgo = (P.shotAgo || 0) + dt; if (P.shotAgo > .16) { const k = Math.exp(-dt * 9); P.recoil = (P.recoil || 0) * k; P.recoilYaw = (P.recoilYaw || 0) * k; }   // the kick settles back to where you were aiming
  if (D.cool > 0 && P.mode !== 'drone') D.cool -= dt;
  if (syncCool > 0) syncCool -= dt;
  if (syncPending) { syncPending.t -= dt; if (syncPending.t <= 0) { const L = syncPending.list; syncPending = null; L.forEach((e, i) => { if (e.dead) return; const b = squad[i % squad.length]; tracer(eye(b.pos, 1.4), eye(e.pos, 1.7), 0xbbf7d0); damageEnemy(e, 999, true, 'sync'); }); SFX.shot(true, 'sr'); syncCool = 40 * (1 - eff('born_leader')); say('Sync shot: ' + L.length + ' down'); } }

  enemiesTick(dt); squadTick(dt);
  // grenades
  for (let i = nades.length - 1; i >= 0; i--) { const n = nades[i]; n.v.y -= 18 * dt; n.m.position.addScaledVector(n.v, dt); const gy = hAt(n.m.position.x, n.m.position.z) + .12; if (n.m.position.y < gy) { n.m.position.y = gy; n.v.y *= -.35; n.v.x *= .6; n.v.z *= .6; } n.t -= dt; if (n.t <= 0) { explode(n.m.position.clone()); scene.remove(n.m); nades.splice(i, 1); } }
  for (let i = tracers.length - 1; i >= 0; i--) { const tr = tracers[i]; tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / tr.max); if (tr.t <= 0) { scene.remove(tr.l); tr.l.material.dispose(); tracers.splice(i, 1); } }
  if (muzzleT > 0) { muzzleT -= dt; if (muzzleT <= 0) muzzleLight.intensity = 0; }
  for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t -= dt; const k = 1 - b.t / b.max; b.m.scale.setScalar(1 + k * b.grow); b.m.material.opacity = .8 * (1 - k); if (b.t <= 0) { scene.remove(b.m); booms.splice(i, 1); } }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.t -= dt; if (P.mode === 'foot' && d.m.position.distanceTo(P.pos) < 1.6) { Object.keys(BASE).forEach(c => { ammo[c] = Math.min(Math.round(BASE[c].res * (1 + eff('ammo_capacity'))), (ammo[c] | 0) + Math.round(BASE[c].mag * .6)); }); SFX.pick(); say('Looted ammo'); d.t = 0; } if (d.t <= 0) { scene.remove(d.m); drops.splice(i, 1); } }
  pickups.forEach(p => { if (p.mesh.visible && p.spin) { p.spin.rotation.y += dt * 1.5; } });
  vehicles.forEach(v => placeVehicle(v, dt));
  if (headlight && headlight.visible && P.veh) { const v = P.veh; headlight.position.copy(v.pos).add(new V3(0, 1.3, 0)); headlight.target.position.copy(v.pos).add(new V3(-Math.sin(v.yaw) * 20, 0, -Math.cos(v.yaw) * 20)); }
  placePlayer(); placeCamera(dt);
  if (T - hudT > .15) { hudT = T; hudNow(); drawMini(); }
  if (T - timeT > 30) { timeT = T; applyTime(); }
  if (T - presT > 30) { presT = T; publish(); }
  if (T - reinT > 20) { reinT = T; reinforce(); }
  netTick(dt);
}
function placePlayer() {
  me.position.copy(P.pos); me.rotation.y = P.face;
  const sy = P.mode === 'down' ? 1 : P.stance === 2 ? .35 : P.stance === 1 ? .72 : 1; me.scale.set(1, sy, 1);
  me.rotation.x = P.mode === 'down' ? -Math.PI / 2 : 0; if (P.mode === 'down') me.position.y += .25;
  animLegs(me, P.phase, P.moving && P.mode === 'foot' ? .7 : 0);
  me.visible = P.mode !== 'vehicle' && P.mode !== 'dead' && !(P.fps && P.aimK > .6) && !P.bino;
  me.userData.gun.visible = !P.holster && !!curGun();
}
function placeCamera(dt) {
  let fov = 70;
  if (P.mode === 'drone') { camera.position.copy(D.pos).add(new V3(0, -.3, 0)); camera.rotation.set(D.pitch, D.yaw, 0, 'YXZ'); fov = 70 / droneZoom; }
  else if (P.mode === 'vehicle') {
    const v = P.veh, back = new V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)); const tp = v.pos.clone().add(new V3(0, 2.2, 0));
    const cp = tp.clone().addScaledVector(back, 8.5).add(new V3(0, 2.4 - P.pitch * 4, 0)); cp.y = Math.max(cp.y, hAt(cp.x, cp.z) + 1);
    camera.position.lerp(cp, Math.min(1, dt * 8)); camera.lookAt(tp); P.yaw += (Math.atan2(Math.sin(v.yaw - P.yaw), Math.cos(v.yaw - P.yaw))) * dt * (Math.abs(v.spd) > 3 && !lookX ? 1.2 : 0);
  } else {
    const h = P.mode === 'down' ? .4 : P.stance === 2 ? .55 : P.stance === 1 ? 1.15 : 1.62, pivot = new V3(P.pos.x, P.pos.y + h, P.pos.z);
    const pv = clamp(P.pitch + (P.recoil || 0), -1.3, 1.3), yv = P.yaw + (P.recoilYaw || 0);
    const d = new V3(-Math.sin(yv) * Math.cos(pv), Math.sin(pv), -Math.cos(yv) * Math.cos(pv)), r = new V3(Math.cos(yv), 0, -Math.sin(yv));
    let cp;
    if (P.bino || (P.fps && P.aimK > .6) || P.mode === 'dead') cp = pivot.clone().addScaledVector(d, .25);
    else { const narrow = camera.aspect < 1, dist = lerp(narrow ? 4.6 : 3.4, narrow ? 2.2 : 1.5, P.aimK); cp = pivot.clone().addScaledVector(d, -dist).addScaledVector(r, lerp(.7, .55, P.aimK) * P.shoulder).add(new V3(0, .2, 0)); cp.y = Math.max(cp.y, hAt(cp.x, cp.z) + .35); }
    if (P.mode === 'dead') cp.y += 2;
    camera.position.copy(cp); camera.lookAt(cp.clone().add(d));
    const n = curGun(); if (P.bino) fov = 70 / (4 * (1 + eff('binocular_zoom'))); else if (n && P.aimK > 0) fov = 70 / lerp(1, gstat(n).zoom, P.aimK);
  }
  if (Math.abs(camera.fov - fov) > .1) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
function pickupsTick() {
  pickups.forEach(p => {
    if (!p.mesh.visible) return; if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) > 1.8 || Math.abs(P.pos.y - p.mesh.position.y) > 3) return;
    p.mesh.visible = false; S.picked[p.id] = Date.now(); SFX.pick();
    if (p.kind === 'sp') { S.sp++; addXP(40); say('⬆️ Skill Point found (+1)'); }
    else if (p.kind === 'medal') { S.sp++; S.medals.push(p.id); addXP(80); say('🏅 ' + p.name + ' (+1 Skill Point)'); }
    else if (p.kind === 'weapon') { if (!S.guns.includes(p.name)) S.guns.push(p.name); const sl = slotOf(p.cat); S.load[sl] = p.name; P.slot = sl; gs(p.name); addXP(120); big('🔫 ' + p.name, 2200); say(CAT_NAME[p.cat] + ' added to slot ' + (sl + 1)); }
    else if (p.kind === 'acc') { if (!S.att.includes(p.name)) S.att.push(p.name); addXP(80); say('🔧 ' + p.name + ' fitted to your guns'); }
    else if (p.kind === 'crate') { const n = Math.round(rnd(90, 220)); S.res[p.res] = (S.res[p.res] | 0) + n; P.frags = Math.min(maxFrags(), P.frags + 1); addXP(20); say('📦 +' + n + ' ' + p.name.replace(' supplies', '')); }
    save(); hudNow();
  });
}
function enemiesTick(dt) {
  if (MP.client) { puppetEnemies(dt); return; }
  alarmTick(dt);
  const T = now(), night = dayK < .35, hs = humans();
  let anyAlert = false, maxDet = 0;
  enemies.forEach(e => {
    if (e.dead) { if (e.deadT < 1) { e.deadT += dt * 2.5; e.m.rotation.x = -Math.min(1, e.deadT) * Math.PI / 2; e.m.position.y = e.pos.y + .2 * Math.min(1, e.deadT); } return; }
    const ee = eye(e.pos), face = new V3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw));
    // the nearest player this guard can see (you, or a friend in co-op)
    let seen = null, dist = 1e9, view = 42;
    hs.forEach(h => {
      if (h.mode === 'dead' || h.mode === 'down') return;
      const to = new V3().subVectors(h.pos, e.pos), d = to.length();
      const v = (night ? 24 : 42) * (h.stance === 2 ? .42 : h.stance === 1 ? .66 : 1) * (h.sprint ? 1.25 : h.walk ? .85 : 1) * (h.mode === 'vehicle' ? 1.5 : 1) * (e.tower ? 1.3 : 1);
      if (d >= Math.max(v, e.alert ? 75 : 0) || d >= dist) return;
      const ang = to.setY(0).normalize().angleTo(face);
      if ((ang < (e.alert ? 2.2 : 1.05) || d < 3) && los(ee, eye(h.pos, h.stance === 2 ? .4 : h.stance === 1 ? 1.1 : 1.6))) { seen = h; dist = d; view = v; }
    });
    const sees = !!seen;
    if (!e.alert) {
      if (sees) e.det += dt * (dist < 5 ? 2.5 : 1.2 * (1.15 - dist / view)) * (seen.local ? 1 - eff('detection') : 1) * DF().det;
      else e.det = Math.max(0, e.det - dt * .12);
      if (sees) e.last.copy(seen.pos);
      if (e.det >= 1) { alertEnemy(e, true); if (seen) e.last.copy(seen.pos); }
      if (e.det > .45) { e.yaw = turnTo(e.yaw, Math.atan2(-(e.last.x - e.pos.x), -(e.last.z - e.pos.z)), dt * 2); if (!e.tower && e.pos.distanceTo(e.last) > 3) stepEnemy(e, e.last, 1.6, dt); }
      else if (!e.tower) { e.waitT -= dt; if (!e.wander || e.waitT > 0) { if (e.waitT <= 0 || !e.wander) { e.wander = new V3(e.home.x + rnd(-8, 8), 0, e.home.z + rnd(-8, 8)); e.waitT = rnd(3, 7); } } else if (Math.hypot(e.wander.x - e.pos.x, e.wander.z - e.pos.z) > 1) stepEnemy(e, e.wander, 1.3, dt); else e.waitT = rnd(2, 6); }
      else e.yaw += dt * .25;
    } else {
      anyAlert = true;
      if (sees) { e.seenT = T; e.last.copy(seen.pos); }
      let target = e.last;
      if (e.toAlarm && e.camp && e.camp.alarmAt) {   // running for the siren
        const A = e.camp.alarmAt, d = Math.hypot(A.x - e.pos.x, A.z - e.pos.z);
        if (d > 1.3) { stepEnemy(e, new V3(A.x, 0, A.z), 4, dt); e.yaw = turnTo(e.yaw, Math.atan2(-(A.x - e.pos.x), -(A.z - e.pos.z)), dt * 6); }
        else { e.alarmT = (e.alarmT || 0) + dt; if (e.alarmT >= DF().alarm) { e.toAlarm = false; triggerAlarm(e.camp); } }
        if (T - e.seenT > 28) { e.alert = false; e.toAlarm = false; }
      } else {
      if (!e.resp && e.camp) {   // stay on your own camp's ground: chase only to its edge
        const L = e.camp.post ? 22 : 36, dx = target.x - e.camp.x, dz = target.z - e.camp.z, dd = Math.hypot(dx, dz);
        if (dd > L) target = new V3(e.camp.x + dx / dd * L, 0, e.camp.z + dz / dd * L);
      }
      e.yaw = turnTo(e.yaw, Math.atan2(-(e.last.x - e.pos.x), -(e.last.z - e.pos.z)), dt * 4);
      if (!e.tower) { const d = Math.hypot(target.x - e.pos.x, target.z - e.pos.z); if (d > 20 || !sees) stepEnemy(e, target, 3.6, dt); else if (d < 9) { const away = e.pos.clone().sub(target).add(e.pos); stepEnemy(e, away, 2.4, dt); } }
      e.shotT -= dt;
      if (e.shotT <= 0) {     // shoot at whoever they can see: a player (most likely) or an AI squadmate
        const ee2 = eye(e.pos, 1.45), opts = [];
        if (sees && dist < 85) opts.push({ t: seen.local ? 'P' : seen, d: dist * .75 });
        squad.forEach(b => { if (b.down || b.inactive || P.mode === 'vehicle' || S.squadOff) return; const d = b.pos.distanceTo(e.pos); if (d < 70 && los(ee2, eye(b.pos, 1.3))) opts.push({ t: b, d }); });
        if (opts.length) { opts.sort((a, b) => a.d - b.d); const o = opts[0], tp = o.t === 'P' ? P.pos : o.t.pos; e.shotT = rnd(.8, 1.6); e.yaw = Math.atan2(-(tp.x - e.pos.x), -(tp.z - e.pos.z)); enemyShoot(e, o.t === 'P' ? dist : o.d, o.t); }
        else e.shotT = .3;
      }
      if (T - e.seenT > (e.resp ? 75 : 28)) { e.alert = false; e.resp = false; e.det = .4; e.ind.material.map = TEX.sus; if (e.camp) e.camp.alerted = false; }
      }
    }
    maxDet = Math.max(maxDet, e.alert ? 1 : e.det);
    if (e.flinch > 0) e.flinch -= dt; e.m.userData.torso.rotation.x = e.flinch > 0 ? .35 : 0;
    e.m.position.copy(e.pos); e.m.rotation.y = e.yaw; e.phase += dt * (e.moving ? 7 : 0); animLegs(e.m, e.phase, e.moving ? .6 : 0); e.moving = false;
    e.mark.visible = e.marked; e.mark.position.set(e.pos.x, e.pos.y + 2.35, e.pos.z);
    e.ind.visible = e.alert || e.det > .08; e.ind.position.set(e.pos.x, e.pos.y + 2.75, e.pos.z); e.ind.material.opacity = e.alert ? 1 : clamp(e.det * 1.4, .25, 1);
  });
  detHud(anyAlert, maxDet);
}
function detHud(anyAlert, maxDet) {
  const det = $('det');
  if (anyAlert) { det.textContent = '⚠ DETECTED'; det.style.color = '#ef4444'; } else if (maxDet > .08) { det.textContent = maxDet > .6 ? '◆ SUSPICIOUS' : '◇ ' + Math.round(maxDet * 100) + '%'; det.style.color = '#facc15'; } else det.textContent = '';
}
function turnTo(a, b, k) { let d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + clamp(d, -k, k); }
function stepEnemy(e, target, speed, dt) {
  const d = new V3(target.x - e.pos.x, 0, target.z - e.pos.z); if (d.length() < .3) return; d.setLength(Math.min(d.length(), speed * dt));
  const np = e.pos.clone().add(d); pushOut(np, .4, e.pos.y); if (hAt(np.x, np.z) - e.pos.y > 1.2) return; e.pos.x = np.x; e.pos.z = np.z; e.pos.y = groundAt(e.pos.x, e.pos.z, e.pos.y + .5); e.moving = true;
}
function enemyShoot(e, dist, tgt) {
  const from = eye(e.pos, 1.45).addScaledVector(new V3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw)), .55);
  e.sc = ((e.sc | 0) + 1) % 10;
  flash(from, .8); SFX.shot(false, 'ar', clamp(1 - dist / 120, .15, .8));
  if (tgt && tgt.remote) {        // at a friend: they get hit (or not) in their own game
    const hit = Math.random() < clamp(.62 - dist / 110, .1, .55) * (tgt.stance === 2 ? .55 : tgt.stance === 1 ? .8 : 1) * (tgt.sprint ? .65 : 1) * DF().acc;
    tracer(from, eye(tgt.pos, 1.2).add(hit ? new V3() : new V3(rnd(-1.5, 1.5), rnd(-.5, 1), rnd(-1.5, 1.5))), 0xfca5a5);
    netTo(tgt.id, { k: 'shot', i: enemies.indexOf(e), hit: hit ? 1 : 0, d: Math.max(1, Math.round(rnd(8, 14) * DF().dmg)) }); return;
  }
  if (tgt && tgt !== 'P') {      // at a squadmate
    const b = tgt, to = eye(b.pos, 1.3), hit = Math.random() < clamp(.5 - dist / 120, .1, .45) * DF().acc;
    if (!hit) to.add(new V3(rnd(-1.5, 1.5), rnd(-.5, 1.2), rnd(-1.5, 1.5)));
    tracer(from, to, 0xfca5a5);
    if (hit) { b.hp -= rnd(9, 15) * DF().dmg; b.hurtT = now(); if (b.hp <= 0 && !b.down) { b.down = true; b.revT = 0; b.hp = 0; say('⛑️ ' + b.name + ' is down! Get to them (E / hold □) or a squadmate will'); } }
    return;
  }
  const to = eye(P.pos, P.stance === 2 ? .3 : P.stance === 1 ? .9 : 1.3);
  let ch = clamp(.62 - dist / 110, .1, .55) * (P.stance === 2 ? .55 : P.stance === 1 ? .8 : 1) * (P.sprint ? .65 : 1) * (P.mode === 'vehicle' ? .7 : 1) * DF().acc;
  const hit = Math.random() < ch;
  if (!hit) to.add(new V3(rnd(-1.5, 1.5), rnd(-.5, 1.2), rnd(-1.5, 1.5)));
  tracer(from, to, 0xfca5a5);
  if (hit) { hurtPlayer(rnd(8, 14) * DF().dmg); squadHelp = now(); }
}
let squadHelp = -99, squadCalled = false;
function squadTick(dt) {
  if (MP.client) { puppetBots(dt); return; }
  squad.forEach((b, i) => { b.inactive = MP.on && i >= 4 - humans().length; b.m.visible = !S.squadOff && !b.inactive && P.mode !== 'vehicle'; });
  if (P.mode === 'vehicle' || S.squadOff) return;
  const fwd = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = new V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), T = now();
  const fight = enemies.some(e => !e.dead && e.alert && e.pos.distanceTo(P.pos) < 140);
  if (fight && !squadCalled) { squadCalled = true; const b = squad.find(x => !x.down); if (b) say(b.name + ': "Contact! Engaging!"'); } else if (!fight) squadCalled = false;
  // who goes to revive whom: the closest squadmate who is still up
  const up = squad.filter(b => !b.down && !b.inactive), downFriend = Object.values(MP.remotes).find(r => r.mode === 'down' && !r.stale), patient = P.mode === 'down' ? 'P' : downFriend || squad.find(b => b.down && !b.inactive && P.reviving !== b) || null;
  let medic = null;
  if (patient && up.length) { const pp = patient === 'P' ? P.pos : patient.pos; medic = up.filter(b => b !== patient).sort((a, b) => a.pos.distanceTo(pp) - b.pos.distanceTo(pp))[0] || null; }
  squad.forEach(b => {
    if (b.inactive) return;
    if (b.down) {
      b.m.rotation.x = -Math.PI / 2; b.m.position.set(b.pos.x, b.pos.y + .25, b.pos.z); b.m.rotation.y = b.face;
      return;
    }
    b.m.rotation.x = 0;
    if (b.hp < botMaxHP() && T - (b.hurtT || 0) > 6) b.hp = Math.min(botMaxHP(), b.hp + dt * 8);
    let tgt = null, run = false;
    if (b === medic) { tgt = (patient === 'P' ? P.pos : patient.pos).clone(); run = true; }
    else if (!b.hold) tgt = P.pos.clone().addScaledVector(right, b.off[0] * (fight ? 1.8 : 1)).addScaledVector(fwd, -b.off[1] * (fight ? 1.4 : 1));
    if (tgt) {
      const d = Math.hypot(tgt.x - b.pos.x, tgt.z - b.pos.z);
      if (d > 70 && b !== medic) b.pos.copy(tgt);
      else if (d > (b === medic ? 1.1 : 1.2)) { const sp = Math.min(d, (run || d > 8 ? 7.6 : 4.4) * dt), dir = new V3(tgt.x - b.pos.x, 0, tgt.z - b.pos.z).normalize(); const np = b.pos.clone().addScaledVector(dir, sp); pushOut(np, .4, b.pos.y); b.pos.x = np.x; b.pos.z = np.z; b.face = Math.atan2(-dir.x, -dir.z); b.phase += dt * 9; b.moving = true; }
      else if (b === medic) {       // reviving
        if (patient === 'P') { P.revT += dt; if (P.revT >= reviveTime()) { P.mode = 'foot'; P.hp = maxHP() * .4; P.revT = 0; P.stance = 0; $('center').textContent = ''; say('⛑️ ' + b.name + ': "Up you get. Stay low!"'); P.hurtT = T; } }
        else if (patient.remote) { patient.revT = (patient.revT || 0) + dt; if (patient.revT >= reviveTime()) { patient.revT = 0; netTo(patient.id, { k: 'rev', by: b.name }); patient.mode = 'foot'; say('⛑️ ' + b.name + ' revived ' + patient.name); } }
        else { patient.revT += dt; if (patient.revT >= reviveTime()) { patient.down = false; patient.hp = botMaxHP() * .5; patient.revT = 0; say('⛑️ ' + b.name + ' got ' + patient.name + ' back up'); } }
      }
    }
    b.pos.y = groundAt(b.pos.x, b.pos.z, b.pos.y + .5);
    // fight back: anyone already in the fight, anyone shooting at you, or marked targets when ordered to open fire
    b.shotT -= dt;
    if (b !== medic || !b.moving) {
      const be = eye(b.pos, 1.5);
      const foes = enemies.filter(e => !e.dead && (e.alert || (squadOpenFire && e.marked)) && e.pos.distanceTo(b.pos) < 90);
      foes.sort((x, y) => x.pos.distanceTo(b.pos) - y.pos.distanceTo(b.pos));
      const foe = foes.find(e => los(be, eye(e.pos, 1.4)));
      if (foe) {
        b.face = Math.atan2(-(foe.pos.x - b.pos.x), -(foe.pos.z - b.pos.z));
        if (b.shotT <= 0) {
          b.shotT = rnd(.45, .95); const dist = foe.pos.distanceTo(b.pos), h = Math.random() < clamp(.55 - dist / 150, .18, .5);
          const from = be.clone().addScaledVector(new V3(-Math.sin(b.face), 0, -Math.cos(b.face)), .55);
          b.sc = ((b.sc | 0) + 1) % 10; flash(from, .7); tracer(from, eye(foe.pos, h ? 1.4 : 2.3), 0xbbf7d0); SFX.shot(false, 'ar', clamp(.7 - dist / 150, .2, .6));
          if (h) { damageEnemy(foe, 28 * (1 + eff('trained_rebels')), false, 'squad'); foe.flinch = .18; }
        }
      } else if (foes[0]) b.face = turnTo(b.face, Math.atan2(-(foes[0].pos.x - b.pos.x), -(foes[0].pos.z - b.pos.z)), dt * 4);
    }
    b.m.position.copy(b.pos); b.m.rotation.y = b.face; animLegs(b.m, b.phase, b.moving ? .6 : 0); b.moving = false;
  });
  if (P.mode === 'down' && !up.length && !P.toldAlone) { P.toldAlone = true; say('Your whole squad is down · E / hold □ to skip the wait', 5000); }
  if (P.mode !== 'down') P.toldAlone = false;
}
let squadOpenFire = false;
function reinforce() {      // cleared camps are re-garrisoned 20 minutes later (when you are not close by)
  if (MP.client) return;
  camps.forEach(c => { const t = S.camps[c.id]; if (c.cleared && t && Date.now() - t > 20 * 60 * 1000 && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) > 120) { delete S.camps[c.id]; spawnCampGuards(c); pickups.forEach(p => { if (p.kind === 'crate' && p.camp === c.id) { delete S.picked[p.id]; p.mesh.visible = true; } }); say('📻 Reinforcements reached ' + c.name); save(); } });
}
function publish() {
  if (!(WW && WW.user && WW.publishPlaying)) return;
  if (MP.on) { const n = humans().length; WW.publishPlaying({ game: GAME, title: TITLE, room: MP.code, status: 'Co-op squad · ' + n + '/' + MAXP + ' players · ' + PROVINCE, open: Math.max(0, MAXP - n) }); }
  else WW.publishPlaying({ game: GAME, title: TITLE, status: 'Solo · ' + PROVINCE + ' · Lv ' + S.level + ' · ' + campCount(), open: 0 });
}


// ------------------------------------------------------------------ co-op: up to 4 friends in the host's game
// Room: RTDB mobilegames/rooms/recon/{host friend code}. Small, frequent data only:
//   host        = { uid, n }                              who runs the world
//   players/{uid} = { n, c, x, y, z, f, st, m, hp, sp, wk, sh, vy, t }   each player's live position (sent when it changes)
//   w/e/{i}     = "x,y,z,yaw,flag,shots"                 enemies, written by the host about 4x a second (only what changed)
//   w/b/{i}     = "x,y,z,face,down,active,shots"         the host's AI squadmates (friends take their places)
//   toHost/{push}  hits, noise, sync shots, squadmate revives from friends   (the host applies and deletes them)
//   toU/{uid}/{push}  xp, enemy shots, revives for one player                (that player applies and deletes them)
//   all/{push}  shared marks and cleared camps                               (deleted after 20 s)
// Everyone keeps their own progress (their own Firestore save): XP for your kills, pickups you grab, camps you help clear.
const QS = new URLSearchParams(location.search), ROOM = (QS.get('room') || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
const MAXP = 4;
const MP = { on: false, host: false, client: false, code: '', uid: null, ref: null, remotes: {}, sendT: 0, beatT: 0, wT: 0, wLast: {}, bLast: {}, shotN: 0, noiseT: 0, hostUid: null, lastSelf: '' };
function humans() {
  const a = [{ id: MP.uid || 'me', local: true, pos: P.pos, stance: P.stance, sprint: P.sprint, walk: P.walk, mode: P.mode }];
  Object.values(MP.remotes).forEach(r => { if (!r.stale) a.push(r); });
  return a;
}
const netNow = () => (WW && WW.now ? WW.now() : Date.now());
function netPush(path, ev) { if (!MP.ref) return; try { MP.ref.child(path).push(Object.assign({ by: MP.uid, t: netNow() }, ev)).catch(() => {}); } catch (e) {} }
function netTo(uid, ev) { netPush('toU/' + uid, ev); }
function netHost(ev) { if (MP.host) onHostEv(Object.assign({ by: MP.uid }, ev)); else netPush('toHost', ev); }
function netAll(ev) { netPush('all', ev); }
function netHit(e, dmg, head, how) { const i = enemies.indexOf(e); if (i < 0) return; netHost({ k: 'hit', i, d: Math.round(dmg), h: head ? 1 : 0, how: how || 'gun' }); e.flinch = .18; }
function netNoise(p, r) { if (now() - MP.noiseT < .4 && r < 100) return; MP.noiseT = now(); netHost({ k: 'noise', x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), r: Math.round(r) }); }
function myNameR() { return String(WW.nick || (WW.user && WW.user.displayName) || 'Ghost').split(' ')[0].slice(0, 14); }

async function joinRoom(user) {
  if (!ROOM || !user || !WW.db) return { ok: false };
  MP.uid = user.uid; MP.code = ROOM; MP.ref = WW.db.ref('mobilegames/rooms/' + GAME + '/' + ROOM);
  const amHost = ROOM === String(WW.friendCode || '').toUpperCase();
  let snap = {}; try { snap = (await MP.ref.once('value')).val() || {}; } catch (e) { return { ok: false, why: 'Could not reach the co-op room (' + (e.code || e.message) + ').' }; }
  const players = snap.players || {}, T = netNow(), fresh = Object.keys(players).filter(u => u !== user.uid && T - (players[u].t || 0) < 20000);
  if (!amHost) {
    const h = snap.host;
    if (!h || !players[h.uid] || T - (players[h.uid].t || 0) > 20000) return { ok: false, why: 'Your friend isn’t hosting Werewolf Recon right now. Ask them to open it and tap 👥 Host co-op.' };
    if (fresh.length >= MAXP) return { ok: false, why: 'That squad is full (' + MAXP + ' players).' };
    MP.hostUid = h.uid;
  } else {
    await MP.ref.update({ host: { uid: user.uid, n: myNameR() }, w: null, toHost: null, all: null }).catch(() => {});
    MP.ref.child('host').onDisconnect().remove(); MP.ref.child('w').onDisconnect().remove(); MP.hostUid = user.uid;
  }
  MP.on = true; MP.host = amHost; MP.client = !amHost;
  MP.ref.child('players/' + user.uid).onDisconnect().remove(); MP.ref.child('toU/' + user.uid).onDisconnect().remove();
  MP.ref.child('players').on('value', sn => onPlayers(sn.val() || {}));
  MP.ref.child('toU/' + user.uid).on('child_added', sn => { const v = sn.val(); sn.ref.remove().catch(() => {}); if (v) onMine(v); });
  MP.ref.child('all').on('child_added', sn => { const v = sn.val(); if (MP.host) setTimeout(() => sn.ref.remove().catch(() => {}), 20000); if (v) onAll(v); });
  if (MP.host) MP.ref.child('toHost').on('child_added', sn => { const v = sn.val(); sn.ref.remove().catch(() => {}); if (v) onHostEv(v); });
  else {
    MP.ref.child('w/e').on('child_added', sn => applyE(+sn.key, sn.val())); MP.ref.child('w/e').on('child_changed', sn => applyE(+sn.key, sn.val()));
    MP.ref.child('w/b').on('child_added', sn => applyB(+sn.key, sn.val())); MP.ref.child('w/b').on('child_changed', sn => applyB(+sn.key, sn.val()));
    MP.ref.child('host').on('value', sn => { if (!sn.val() && MP.on && started) { say('📻 The host left: continuing on your own', 4000); MP.on = false; setTimeout(() => { saveNow(); location.href = 'recon.html'; }, 2500); } });
  }
  return { ok: true, host: amHost, hostName: amHost ? myNameR() : (snap.host && snap.host.n) || 'your friend' };
}
function onPlayers(v) {
  const seen = {};
  Object.keys(v).forEach(uid => {
    if (uid === MP.uid) return; const d = v[uid] || {}; seen[uid] = 1;
    let r = MP.remotes[uid];
    if (!r) {
      const m = makeSoldier(/^#[0-9a-f]{6}$/i.test(d.c || '') ? d.c : '#3b82f6', 'squad'); scene.add(m);
      const tag = nameTag(d.n || 'Friend'); scene.add(tag);
      r = MP.remotes[uid] = { id: uid, remote: true, m, tag, pos: new V3(d.x || 0, d.y || 0, d.z || 0), show: new V3(d.x || 0, d.y || 0, d.z || 0), face: 0, phase: 0, sh: d.sh | 0, truck: null };
      if (started) say('👥 ' + (d.n || 'A friend') + ' joined your squad');
    }
    r.name = d.n || 'Friend'; r.color = d.c; r.pos.set(+d.x || 0, +d.y || 0, +d.z || 0); r.face = +d.f || 0; r.stance = d.st | 0; r.mode = d.m || 'foot'; r.hp = d.hp; r.sprint = !!d.sp; r.walk = !!d.wk; r.vy = d.vy;
    if ((d.sh | 0) !== r.sh) { r.sh = d.sh | 0; r.fired = true; }
    r.seenAt = Date.now(); r.stale = false;
  });
  Object.keys(MP.remotes).forEach(uid => { if (!seen[uid]) { const r = MP.remotes[uid]; scene.remove(r.m); scene.remove(r.tag); if (r.truck) scene.remove(r.truck); delete MP.remotes[uid]; say('👥 ' + (r.name || 'A friend') + ' left the squad'); } });
}
function nameTag(n) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = '800 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(n, 128, 32); g.fillStyle = '#93c5fd'; g.fillText(n, 128, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.scale.set(2.4, .6, 1); sp.renderOrder = 998; return sp;
}
function onMine(ev) {
  if (ev.k === 'xp') { if (ev.kill) { S.kills++; if (ev.head) S.heads++; } addXP(ev.n | 0); }
  else if (ev.k === 'shot') { const e = enemies[ev.i]; if (e) { const from = eye(e.pos, 1.45); flash(from, .8); tracer(from, eye(P.pos, 1.2).add(ev.hit ? new V3() : new V3(rnd(-1.5, 1.5), rnd(-.5, 1), rnd(-1.5, 1.5))), 0xfca5a5); SFX.shot(false, 'ar', .5); } if (ev.hit) hurtPlayer(ev.d || 10); }
  else if (ev.k === 'rev') { if (P.mode === 'down') { P.mode = 'foot'; P.hp = maxHP() * .4; P.revT = 0; P.stance = 0; P.hurtT = now(); $('center').textContent = ''; say('⛑️ ' + (ev.by || 'A teammate') + ' revived you'); } }
}
function onAll(ev) {
  if (ev.by === MP.uid || netNow() - (ev.t || 0) > 20000) return;
  if (ev.k === 'mark') { const e = enemies[ev.i]; if (e) markEnemy(e, true, true); }
  else if (ev.k === 'camp' && !MP.host) { const c = camps.find(k => k.id === ev.id); if (c) { if (!S.camps[c.id] || Date.now() - S.camps[c.id] > 60000) { addXP(c.post ? 120 : 300); big(c.name + ' cleared'); } S.camps[c.id] = Date.now(); c.cleared = true; c.flag.visible = false; save(); } }
}
function onHostEv(ev) {
  const r = MP.remotes[ev.by];
  if (ev.k === 'hit') { const e = enemies[ev.i]; if (e && !e.dead) { damageEnemy(e, ev.d, !!ev.h, ev.how, ev.by === MP.uid ? undefined : ev.by); e.flinch = .18; } }
  else if (ev.k === 'noise') noiseEvent(new V3(ev.x, ev.y, ev.z), ev.r);
  else if (ev.k === 'sync') { (ev.l || []).forEach(i => { const e = enemies[i]; if (e && !e.dead) e.marked = true; }); syncShot(); }
  else if (ev.k === 'revb') { const b = squad[ev.i]; if (b && b.down) { b.down = false; b.hp = botMaxHP() * .5; b.revT = 0; say('⛑️ ' + (r ? r.name : 'A teammate') + ' revived ' + b.name); } }
}
// enemies / squadmates as the host sees them (friends' games draw these)
function applyE(i, str) {
  const e = enemies[i]; if (!e || typeof str !== 'string') return;
  const a = str.split(','), dead = a[4] === 'd', sc = +a[5] || 0;
  e.net = new V3(+a[0], +a[1], +a[2]); e.netYaw = +a[3];
  if (!e.netSeen) { e.netSeen = true; e.pos.copy(e.net); e.yaw = e.netYaw; }
  if (dead && !e.dead) { e.dead = true; e.deadT = 0; e.marked = false; e.mark.visible = false; e.ind.visible = false; }
  if (!dead && e.dead) { e.dead = false; e.deadT = 0; e.hp = 100; e.m.visible = true; e.m.rotation.x = 0; e.pos.copy(e.net); }
  const wasAlert = e.alert; e.alert = a[4] === 'a'; e.det = e.alert ? 1 : /^\d$/.test(a[4]) ? +a[4] / 9 : 0;
  if (e.alert !== wasAlert) { e.ind.material.map = e.alert ? TEX.alert : TEX.sus; e.ind.material.needsUpdate = true; }
  if (e.sc !== undefined && sc !== e.sc && !dead) { const from = eye(e.pos, 1.45).addScaledVector(new V3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw)), .55); flash(from, .8); tracer(from, from.clone().addScaledVector(new V3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw)), 30), 0xfca5a5); SFX.shot(false, 'ar', clamp(1 - e.pos.distanceTo(P.pos) / 120, .1, .7)); }
  e.sc = sc;
}
function applyB(i, str) {
  const b = squad[i]; if (!b || typeof str !== 'string') return;
  const a = str.split(','), sc = +a[6] || 0;
  b.net = new V3(+a[0], +a[1], +a[2]); b.netFace = +a[3]; b.down = a[4] === '1'; b.inactive = a[5] !== '1';
  if (!b.netSeen) { b.netSeen = true; b.pos.copy(b.net); }
  if (b.sc !== undefined && sc !== b.sc && !b.down) { const from = eye(b.pos, 1.5).addScaledVector(new V3(-Math.sin(b.face), 0, -Math.cos(b.face)), .55); flash(from, .7); tracer(from, from.clone().addScaledVector(new V3(-Math.sin(b.face), 0, -Math.cos(b.face)), 30), 0xbbf7d0); SFX.shot(false, 'ar', .35); }
  b.sc = sc;
}
function puppetEnemies(dt) {
  let anyAlert = false, maxDet = 0;
  enemies.forEach(e => {
    if (e.dead) { if (e.deadT < 1) { e.deadT += dt * 2.5; e.m.rotation.x = -Math.min(1, e.deadT) * Math.PI / 2; e.m.position.y = e.pos.y + .2 * Math.min(1, e.deadT); } return; }
    if (e.net) { e.moving = e.pos.distanceTo(e.net) > .05; e.pos.lerp(e.net, Math.min(1, dt * 8)); e.yaw = turnTo(e.yaw, e.netYaw, dt * 8); }
    if (e.alert) anyAlert = true; maxDet = Math.max(maxDet, e.alert ? 1 : e.det);
    if (e.flinch > 0) e.flinch -= dt; e.m.userData.torso.rotation.x = e.flinch > 0 ? .35 : 0;
    e.m.position.copy(e.pos); e.m.rotation.y = e.yaw; e.phase += dt * (e.moving ? 7 : 0); animLegs(e.m, e.phase, e.moving ? .6 : 0);
    e.mark.visible = e.marked; e.mark.position.set(e.pos.x, e.pos.y + 2.35, e.pos.z);
    e.ind.visible = e.alert || e.det > .08; e.ind.position.set(e.pos.x, e.pos.y + 2.75, e.pos.z); e.ind.material.opacity = e.alert ? 1 : clamp(e.det * 1.4, .25, 1);
  });
  camps.forEach(c => { const held = c.guards.some(g => !g.dead); c.flag.visible = held; c.cleared = !held; });
  detHud(anyAlert, maxDet);
}
function puppetBots(dt) {
  squad.forEach(b => {
    b.m.visible = !b.inactive && P.mode !== 'vehicle'; if (b.inactive || !b.net) return;
    b.moving = b.pos.distanceTo(b.net) > .05; b.pos.lerp(b.net, Math.min(1, dt * 8)); b.face = turnTo(b.face || 0, b.netFace, dt * 8);
    if (b.down) { b.m.rotation.x = -Math.PI / 2; b.m.position.set(b.pos.x, b.pos.y + .25, b.pos.z); b.m.rotation.y = b.face; return; }
    b.m.rotation.x = 0; b.phase += dt * (b.moving ? 9 : 0); b.m.position.copy(b.pos); b.m.rotation.y = b.face; animLegs(b.m, b.phase, b.moving ? .6 : 0);
  });
}
function remotesTick(dt) {
  const T = Date.now();
  Object.values(MP.remotes).forEach(r => {
    r.stale = T - (r.seenAt || 0) > 12000;
    const moving = r.show.distanceTo(r.pos) > .05; r.show.lerp(r.pos, Math.min(1, dt * 10)); r.phase += dt * (moving ? 9 : 0);
    const inVeh = r.mode === 'vehicle' && r.vy != null;
    if (inVeh) { if (!r.truck) { r.truck = makeTruck(0x1e3a8a); scene.add(r.truck); } r.truck.visible = true; r.truck.position.copy(r.show); r.truck.rotation.set(0, +r.vy, 0); }
    else if (r.truck) r.truck.visible = false;
    r.m.visible = !r.stale && !inVeh && r.mode !== 'dead';
    r.m.position.copy(r.show); r.m.rotation.set(r.mode === 'down' ? -Math.PI / 2 : 0, r.face, 0, 'YXZ'); if (r.mode === 'down') r.m.position.y += .25;
    r.m.scale.set(1, r.mode === 'down' ? 1 : r.stance === 2 ? .35 : r.stance === 1 ? .72 : 1, 1);
    animLegs(r.m, r.phase, moving && r.mode === 'foot' ? .6 : 0);
    r.tag.visible = r.m.visible || inVeh; r.tag.position.set(r.show.x, r.show.y + (inVeh ? 3.4 : 2.5), r.show.z);
    if (r.fired) { r.fired = false; const f = new V3(-Math.sin(r.face), 0, -Math.cos(r.face)), from = eye(r.show, 1.4).addScaledVector(f, .7); flash(from, .7); tracer(from, from.clone().addScaledVector(f, 35)); SFX.shot(false, 'ar', clamp(.8 - r.show.distanceTo(P.pos) / 150, .1, .6)); }
  });
}
function netSelf() {
  const T = now(); if (T - MP.sendT < .12) return;
  const st = { n: myNameR(), c: (WW.myColor && WW.myColor('#4d5b36')) || '#4d5b36', x: +P.pos.x.toFixed(1), y: +P.pos.y.toFixed(1), z: +P.pos.z.toFixed(1), f: +P.face.toFixed(2), st: P.stance | 0, m: P.mode, hp: Math.round(P.hp), sp: P.sprint ? 1 : 0, wk: P.walk ? 1 : 0, sh: MP.shotN, vy: P.veh ? +P.veh.yaw.toFixed(2) : null };
  const key = JSON.stringify(st); if (key === MP.lastSelf && T - MP.beatT < 3) return;
  MP.lastSelf = key; MP.sendT = T; MP.beatT = T; st.t = firebase.database.ServerValue.TIMESTAMP;
  MP.ref.child('players/' + MP.uid).set(st).catch(() => {});
}
function netWorld() {
  if (!MP.host) return; const T = now(); if (T - MP.wT < .25) return; MP.wT = T;
  const up = {};
  enemies.forEach((e, i) => { const f = e.dead ? 'd' : e.alert ? 'a' : String(Math.min(9, Math.round(e.det * 9))); const v = [e.pos.x.toFixed(1), e.pos.y.toFixed(1), e.pos.z.toFixed(1), e.yaw.toFixed(2), f, e.sc | 0].join(','); if (MP.wLast['e' + i] !== v) { MP.wLast['e' + i] = v; up['w/e/' + i] = v; } });
  squad.forEach((b, i) => { const v = [b.pos.x.toFixed(1), b.pos.y.toFixed(1), b.pos.z.toFixed(1), (b.face || 0).toFixed(2), b.down ? 1 : 0, (b.inactive || S.squadOff || P.mode === 'vehicle') ? 0 : 1, b.sc | 0].join(','); if (MP.wLast['b' + i] !== v) { MP.wLast['b' + i] = v; up['w/b/' + i] = v; } });
  if (Object.keys(up).length) MP.ref.update(up).catch(() => {});
}
function netTick(dt) { if (!MP.on || !MP.ref) return; netSelf(); netWorld(); remotesTick(dt); }
function inCombat() { return enemies.some(e => !e.dead && e.alert && e.pos.distanceTo(P.pos) < 120); }
function fastTravel(uid) {
  const r = MP.remotes[uid]; if (!r || r.stale) return;
  if (inCombat()) { say('Can’t fast travel during a firefight'); return; }
  if (P.mode === 'vehicle') exitVehicle(true); if (P.mode === 'drone') toggleDrone(true);
  P.pos.set(r.pos.x + 2, 0, r.pos.z + 2); pushOut(P.pos, .4, 0); P.pos.y = groundAt(P.pos.x, P.pos.z, 999); P.vy = 0;
  squad.forEach(b => { if (!MP.client) b.pos.set(P.pos.x + b.off[0], 0, P.pos.z + b.off[1]); });
  closeMenus(); say('⚡ Fast travelled to ' + r.name);
}

// ------------------------------------------------------------------ HUD drawing
function hudNow() {
  $('lvl').textContent = S.level; $('xpbar').firstChild.style.width = Math.round(S.xp / xpNeed() * 100) + '%';
  $('res').innerHTML = '⬆️ <b>' + S.sp + '</b> SP · ' + RES.map(r => r[1] + ' ' + (S.res[r[0]] | 0)).join(' · ') + (S.squadOff ? '' : '<br>🎖️ ' + squad.filter(b => !b.inactive).map(b => (b.down ? '⛑️' : b.hp < botMaxHP() * .5 ? '🟠' : '🟢') + b.name).join(' ')) + (MP.on ? '<br>👥 ' + Object.values(MP.remotes).filter(r => !r.stale).map(r => (r.mode === 'down' ? '⛑️' : '🔵') + esc(r.name)).join(' ') : '') + (countMarked() ? '<br>🔺 ' + countMarked() + ' marked' + (syncCool > 0 ? ' · sync ' + Math.ceil(syncCool) + 's' : ' · sync ready') : '');
  const n = curGun();
  if (P.mode === 'vehicle') $('wep').innerHTML = '🚙 <b>' + Math.round(Math.abs(P.veh.spd) * 3.6) + '</b> km/h';
  else if (P.mode === 'drone') $('wep').innerHTML = '🛸 Drone' + (droneZoom > 1 ? ' · ' + droneZoom + 'x' : '') + '<br><b>' + (D.bat === Infinity ? '∞' : Math.ceil(D.bat) + 's') + '</b>';
  else if (n) { const s = gstat(n), g = gs(n); $('wep').innerHTML = (P.holster ? '✋ holstered · ' : '') + esc(n) + ' <small>' + (g.sup ? '🔇 ' : '') + g.mode + '</small><br><b>' + (P.reloadT > 0 ? '⟳' : g.mag) + '</b> / ' + (ammo[s.cat] | 0) + '<br>💣 ' + P.frags + ' · ❤️ ' + P.heals + (P.vision ? ' · ' + (P.vision === 1 ? '🟢 NV' : '🔥 TH') : ''); }
  $('cross').style.display = (P.mode === 'foot' && !P.holster) || P.mode === 'drone' || P.bino ? '' : 'none';
  $('hp').firstChild.style.width = clamp(P.hp / maxHP() * 100, 0, 100) + '%';
  $('st').firstChild.style.width = Math.round(P.stam * 100) + '%';
  if (P.mode === 'drone') $('bat').firstChild.style.width = (D.bat === Infinity ? 100 : clamp(D.bat / droneBattery() * 100, 0, 100)) + '%';
}
function setHint() {
  $('hint').innerHTML = padOn ? 'L2 aim · R2 fire · ○ crouch/prone · □ reload/use · △ swap · R1 mark/squad · L1 throw · D-pad ↑ drone ↓ binoculars → vision · touchpad map'
    : 'Click to look · WASD move · Shift sprint · C crouch · Ctrl prone · RMB aim · LMB fire · R reload · Q drone · B binoculars · mid-mouse mark · Tab squad · G grenade · F heal · E use/truck · M map · J skills · Esc pause';
}
const mini = $('mini').getContext('2d');
function drawMini() {
  const g = mini, W = 260, R = 70, s = W / 2 / R, yaw = P.mode === 'drone' ? D.yaw : P.yaw, cx = P.mode === 'drone' ? D.pos.x : P.pos.x, cz = P.mode === 'drone' ? D.pos.z : P.pos.z;
  g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip(); g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(0, 0, W, W);
  g.translate(W / 2, W / 2); g.rotate(yaw); g.scale(s, s); g.translate(-cx, -cz);
  g.strokeStyle = 'rgba(180,140,90,.7)'; g.lineWidth = 3 / s * 2; paths.forEach(p => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.stroke(); });
  camps.forEach(c => { g.fillStyle = c.cleared ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.45)'; g.beginPath(); g.arc(c.x, c.z, 13, 0, 7); g.fill(); });
  g.fillStyle = '#38bdf8'; g.fillRect(rally.x - 2.5, rally.z - 2.5, 5, 5);
  pickups.forEach(p => { if (!p.mesh.visible) return; g.fillStyle = '#' + p.color.toString(16).padStart(6, '0'); g.beginPath(); g.arc(p.x, p.z, 2.2, 0, 7); g.fill(); });
  vehicles.forEach(v => { g.fillStyle = '#cbd5e1'; g.fillRect(v.pos.x - 1.5, v.pos.z - 1.5, 3, 3); });
  enemies.forEach(e => { if (e.dead || !(e.marked || e.alert)) return; g.fillStyle = e.alert ? '#ef4444' : '#fca5a5'; g.beginPath(); g.arc(e.pos.x, e.pos.z, 2, 0, 7); g.fill(); });
  Object.values(MP.remotes).forEach(r => { if (r.stale) return; g.fillStyle = '#60a5fa'; g.beginPath(); g.arc(r.pos.x, r.pos.z, 2.4, 0, 7); g.fill(); });
  if (!S.squadOff) squad.forEach(b => { if (b.inactive) return; g.fillStyle = '#86efac'; g.beginPath(); g.arc(b.pos.x, b.pos.z, 1.6, 0, 7); g.fill(); });
  g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 10); g.lineTo(W / 2 + 7, W / 2 + 8); g.lineTo(W / 2 - 7, W / 2 + 8); g.closePath(); g.fill();
}
function bakeTac() {
  const c = document.createElement('canvas'); c.width = c.height = 300; const g = c.getContext('2d'), img = g.createImageData(300, 300);
  for (let j = 0; j < 300; j++) for (let i = 0; i < 300; i++) {
    const x = -HALF + i / 300 * SIZE, z = -HALF + j / 300 * SIZE, h = hAt(x, z), sh = clamp(.75 + (hAt(x - 2, z - 2) - h) * .12, .4, 1.2), k = (j * 300 + i) * 4;
    let r = 70, gg = 110, b = 55; if (h > 34) { r = 120; gg = 115; b = 105; } if (h > 62) { r = gg = b = 225; }
    img.data[k] = r * sh; img.data[k + 1] = gg * sh; img.data[k + 2] = b * sh; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0); tacImg = c;
}
const W2T = v => (v + HALF) / SIZE * 900;
function drawTac(live) {
  const g = $('tacc').getContext('2d'); g.drawImage(tacImg, 0, 0, 900, 900);
  g.strokeStyle = 'rgba(190,150,100,.9)'; g.lineWidth = 4; paths.forEach(p => { g.beginPath(); g.moveTo(W2T(p[0]), W2T(p[1])); g.lineTo(W2T(p[2]), W2T(p[3])); g.stroke(); });
  g.font = '700 22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
  camps.forEach(c => { if (c.post) { g.fillStyle = c.cleared ? 'rgba(34,197,94,.55)' : 'rgba(239,68,68,.55)'; g.beginPath(); g.arc(W2T(c.x), W2T(c.z), 16, 0, 7); g.fill(); return; } g.fillStyle = c.cleared ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)'; g.beginPath(); g.arc(W2T(c.x), W2T(c.z), 34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText(c.name + (c.cleared ? ' ✓' : ''), W2T(c.x), W2T(c.z) - 46); g.fillText(c.name + (c.cleared ? ' ✓' : ''), W2T(c.x), W2T(c.z) - 46); });
  g.font = '26px system-ui'; pickups.forEach(p => { if (p.kind === 'crate') return; g.globalAlpha = p.mesh.visible ? 1 : .25; g.fillText(p.emoji, W2T(p.x), W2T(p.z)); }); g.globalAlpha = 1;
  g.fillText('⛺', W2T(rally.x), W2T(rally.z)); vehicles.forEach(v => g.fillText('🚙', W2T(v.pos.x), W2T(v.pos.z)));
  enemies.forEach(e => { if (e.dead || !e.marked) return; g.fillStyle = '#ef4444'; g.beginPath(); g.arc(W2T(e.pos.x), W2T(e.pos.z), 6, 0, 7); g.fill(); });
  // your squad (green, ⛑️ when down) and you (a big arrow in your colour with a pulsing ring and a YOU tag)
  g.font = '700 17px system-ui';
  Object.values(MP.remotes).forEach(r => { if (r.stale) return; const x = W2T(r.pos.x), z = W2T(r.pos.z); g.fillStyle = r.mode === 'down' ? '#f87171' : '#60a5fa'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, z, 12, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#bfdbfe'; g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText((r.mode === 'down' ? '⛑️ ' : '') + r.name, x, z - 22); g.fillText((r.mode === 'down' ? '⛑️ ' : '') + r.name, x, z - 22); });
  if (!S.squadOff) squad.forEach(b => { if (b.inactive) return; const x = W2T(b.pos.x), z = W2T(b.pos.z); g.fillStyle = b.down ? '#f87171' : '#4ade80'; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.arc(x, z, 9, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.strokeText((b.down ? '⛑️ ' : '') + b.name, x, z - 18); g.fillText((b.down ? '⛑️ ' : '') + b.name, x, z - 18); });
  const px = W2T(P.pos.x), pz = W2T(P.pos.z), pulse = (performance.now() / 900) % 1, mc = (WW.myColor && WW.myColor('#fde047')) || '#fde047';
  g.strokeStyle = 'rgba(253,224,71,' + (1 - pulse) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(px, pz, 22 + pulse * 30, 0, 7); g.stroke();
  g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = mc; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -26); g.lineTo(17, 16); g.lineTo(0, 8); g.lineTo(-17, 16); g.closePath(); g.stroke(); g.fill(); g.restore();
  g.font = '900 22px system-ui'; g.fillStyle = '#fde047'; g.strokeStyle = '#000'; g.lineWidth = 5; g.strokeText('YOU', px, pz + 38); g.fillText('YOU', px, pz + 38);
  const cnt = k => { const a = pickups.filter(p => p.kind === k); return (a.length - a.filter(p => p.mesh.visible).length) + '/' + a.length; };
  if (!live || !drawTac.n || now() - drawTac.n > 2) { drawTac.n = now(); } else return;
  $('tacLeg').innerHTML = '⬆️ Skill Points ' + cnt('sp') + ' · 🔫 Weapon cases ' + cnt('weapon') + ' · 🔧 Accessories ' + cnt('acc') + ' · 🏅 Medals ' + cnt('medal') + ' · 🏚️ ' + campCount() + ' cleared' + (S.liberated ? ' · 🏁 Liberated' : '') + (Object.values(MP.remotes).some(r => !r.stale) ? '<div style="margin:6px 0">' + Object.values(MP.remotes).filter(r => !r.stale).map(r => '<button class="alt" data-ft="' + esc(r.id) + '"' + (inCombat() ? ' disabled' : '') + '>⚡ Fast travel to ' + esc(r.name) + '</button>').join('') + (inCombat() ? ' <span>(not during a firefight)</span>' : '') + '</div>' : '') + '<br>▲ YOU · 🔵 friends · 🟢 your squad · ⛺ rally point (resupply) · 🚙 trucks · big red circles = camps, small = guard posts · red dots = marked enemies';
}

// ------------------------------------------------------------------ menus
function closeMenus() { document.querySelectorAll('.ov').forEach(o => { if (o.id !== 'ov' || (started && P.mode !== 'dead')) o.classList.remove('show'); }); padSel = 0; }   // the death screen stays until you pick revive or reset
function show(id) { closeMenus(); $(id).classList.add('show'); if (document.exitPointerLock && locked) document.exitPointerLock(); K.clear(); mouseL = mouseR = false; padSel = 0; }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeMenus);
$('mapBtn').onclick = () => openTac(); $('skBtn').onclick = () => openSkills();
$('muteBtn').onclick = () => { muted = !muted; try { localStorage.setItem('recon_mute', muted ? '1' : '0'); } catch (e) {} $('muteBtn').textContent = muted ? '🔇' : '🔊'; if (muted) setHum(false); };
$('muteBtn').textContent = muted ? '🔇' : '🔊';
$('tacLeg').addEventListener('click', e => { const b = e.target.closest('[data-ft]'); if (b && !b.disabled) fastTravel(b.getAttribute('data-ft')); });
function openTac() { if (!world) return; show('tac'); $('tacProv').textContent = PROVINCE; drawTac(); clearInterval(openTac.t); openTac.t = setInterval(() => { if ($('tac').classList.contains('show')) drawTac(true); else clearInterval(openTac.t); }, 120); }
let skTab = 0;
function openSkills() { if (!world) return; show('sk'); renderSkills(); }
function costOf(d, r) { const c = d.rank_costs && d.rank_costs[r]; if (!c) return null; const res = RES.find(x => c[x[0]] != null); return { sp: c.sp | 0, res: res && res[0], amt: res ? c[res[0]] : 0, effect: c.effect, emoji: res ? res[1] : '' }; }
function renderSkills() {
  $('skTop').innerHTML = '⬆️ <b>' + S.sp + '</b> Skill Points · ' + RES.map(r => r[1] + ' ' + (S.res[r[0]] | 0)).join(' · ') + '<br>Find Skill Points out in the province and level up; supplies come from crates in enemy camps.';
  $('skTabs').innerHTML = TREES.map((t, i) => '<button class="alt' + (i === skTab ? ' sel' : '') + '" data-t="' + i + '">' + t.label + '</button>').join('') + '<button class="alt' + (skTab === TREES.length ? ' sel' : '') + '" data-t="' + TREES.length + '">🎒 Loadout</button>';
  $('skTabs').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { skTab = +b.getAttribute('data-t'); renderSkills(); });
  if (skTab === TREES.length) { renderLoadout(); return; }
  const tree = TREES[skTab]; if (!tree) { $('skList').innerHTML = '<div class="muted">Skill data did not load.</div>'; return; }
  $('skList').innerHTML = tree.items.map(d => {
    const r = S.skills[d.id] | 0, max = (d.rank_costs || []).length, c = costOf(d, r), live = LIVE.has(d.id.replace(/^skill_/, '')), epic = /epic/.test(d.id);
    const epicLock = epic && tree.items.some(o => o !== d && !/epic/.test(o.id) && !(S.skills[o.id] | 0));
    const can = c && S.sp >= c.sp && (!c.res || (S.res[c.res] | 0) >= c.amt) && !epicLock;
    return '<div class="sk"><div class="n"><b>' + esc(d.name) + '</b>' + (r ? ' <span class="muted">' + esc(d.rank_costs[r - 1].effect) + '</span>' : '') + '<small>' + (live ? '' : '⏳ switches on in a later update · ') + (epicLock ? 'Epic: needs every other skill here at rank 1 · ' : '') + (c ? 'Next: ' + esc(c.effect) : 'Maxed') + '</small></div>'
      + '<div class="rk">' + Array.from({ length: max }, (_, i) => '<i class="' + (i < r ? 'on' : '') + '"></i>').join('') + '</div>'
      + (c ? '<button data-buy="' + d.id + '"' + (can ? '' : ' disabled') + '>' + c.sp + ' SP' + (c.res ? ' + ' + c.emoji + c.amt : '') + '</button>' : '<button disabled>MAX</button>') + '</div>';
  }).join('');
  $('skList').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b.getAttribute('data-buy')));
}
function buy(id) {
  const d = SKILLS[id], r = S.skills[id] | 0, c = costOf(d, r); if (!c) return;
  if (S.sp < c.sp || (c.res && (S.res[c.res] | 0) < c.amt)) return;
  S.sp -= c.sp; if (c.res) S.res[c.res] -= c.amt; S.skills[id] = r + 1; SFX.level(); save(true); renderSkills(); hudNow();
  if (/frag_grenade/.test(id)) P.frags = maxFrags();
}
function renderLoadout() {
  const slots = ['Primary', 'Secondary', 'Sidearm'];
  $('skList').innerHTML = slots.map((nm, i) => {
    const opts = S.guns.filter(g => slotOf(gunCat(g)) === i);
    return '<div class="sk"><div class="n"><b>' + (i + 1) + ' · ' + nm + '</b><small>' + (S.load[i] ? esc(S.load[i]) + ' · ' + CAT_NAME[gunCat(S.load[i])] : 'Empty: find one in a weapon case') + '</small></div>' + opts.map(g => '<button class="' + (S.load[i] === g ? '' : 'alt') + '" data-eq="' + i + '|' + esc(g) + '">' + esc(g) + '</button>').join('') + '</div>';
  }).join('') + '<div class="sk"><div class="n"><b>🔧 Attachments</b><small>' + (S.att.length ? S.att.map(esc).join(' · ') : 'None yet: open accessory cases') + '</small></div></div>'
    + '<div class="sk"><div class="n"><b>🏅 Bonus medals</b><small>' + S.medals.length + ' found</small></div></div>'
    + '<div class="sk"><div class="n"><b>📊 Record</b><small>' + S.kills + ' enemies down · ' + S.heads + ' headshots</small></div></div>';
  $('skList').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { const [i, g] = b.getAttribute('data-eq').split('|'); S.load[+i] = g; P.slot = +i; save(); renderSkills(); hudNow(); });
}
function openWheel() {
  show('wheel'); const m = countMarked();
  const opts = [['🎯 Sync shot' + (m ? ' (' + m + ' marked)' : ' (mark targets first)') + (syncCool > 0 ? ' · ' + Math.ceil(syncCool) + 's' : ''), () => syncShot()],
    ['🔁 Regroup on me', () => { squad.forEach(b => { b.hold = false; }); squadOpenFire = false; say('Squad: "Moving to you"'); }],
    ['✋ Hold position', () => { squad.forEach(b => { b.hold = true; }); say('Squad: "Holding here"'); }],
    [squadOpenFire ? '🤫 Hold fire' : '🔥 Open fire on marked targets', () => { squadOpenFire = !squadOpenFire; say(squadOpenFire ? 'Squad: "Engaging marked targets"' : 'Squad: "Holding fire"'); }]];
  if (MP.client) opts.splice(1);
  $('wheelList').innerHTML = opts.map((o, i) => '<button class="alt" data-w="' + i + '">' + (i + 1) + ' · ' + o[0] + '</button>').join('');
  $('wheelList').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { closeMenus(); opts[+b.getAttribute('data-w')][1](); });
}
function pause() {
  if (!started) return; show('ov');
  $('ovBox').innerHTML = '<h2>⏸️ Paused</h2><div class="muted">' + PROVINCE + ' · Level ' + S.level + ' · ' + campCount() + ' camps cleared</div>'
    + '<div style="margin-top:8px"><button id="pRes">▶ Resume</button><button class="alt" id="pMap">🗺️ Map</button><button class="alt" id="pSk">⬆️ Skills</button><button class="alt" id="pCoop">' + (MP.on ? '🚪 Leave co-op' : '👥 Host co-op') + '</button><button class="alt" id="pSquad">🎖️ AI squad: ' + (S.squadOff ? 'Off' : 'On') + '</button><button class="alt" id="pKeys">🎮 Controls</button><button class="alt" id="pLeave">Leave</button></div>' + diffHtml() + '<div id="pK"></div>';
  $('pCoop').onclick = () => { saveNow(); if (MP.on) location.href = 'recon.html'; else if (WW.user && WW.friendCode) location.href = 'recon.html?room=' + encodeURIComponent(WW.friendCode); else say('Sign in on the games hub to host co-op'); };
  if (MP.on) $('ovBox').insertAdjacentHTML('beforeend', '<div class="muted" style="margin-top:8px">👥 Co-op room <b>' + esc(MP.code) + '</b> · ' + humans().length + '/' + MAXP + ' players: ' + [myNameR()].concat(Object.values(MP.remotes).filter(r => !r.stale).map(r => r.name)).map(esc).join(', ') + '. Friends join from the games hub (Join on your name) or with your friend code. The game keeps running while this menu is open.</div>');
  $('pSquad').onclick = () => { S.squadOff = !S.squadOff; if (!S.squadOff) squad.forEach(b => { b.pos.set(P.pos.x + b.off[0], 0, P.pos.z + b.off[1]); b.down = false; b.hp = botMaxHP(); }); save(true); pause(); }; $('pRes').onclick = resume; $('pMap').onclick = openTac; $('pSk').onclick = openSkills; $('pKeys').onclick = () => { $('pK').innerHTML = controlsHtml(); }; diffWire(pause); $('pLeave').onclick = () => { saveNow(); location.href = 'index.html'; };
}
function diffHtml() {
  const cur = S.diff || 'normal';
  return '<div style="margin-top:10px"><b>Difficulty</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">' + DIFF_ORDER.map(k => '<button class="' + (k === cur ? '' : 'alt') + '" data-diff="' + k + '">' + DIFFS[k].n + '</button>').join('') + '</div><div class="muted" style="margin-top:4px">' + esc(DIFFS[cur].d) + (MP.on && !MP.host ? ' · In co-op the host’s difficulty is used.' : '') + '</div></div>';
}
function diffWire(redraw) { $('ovBox').querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { S.diff = b.getAttribute('data-diff'); save(true); say('Difficulty: ' + DIFFS[S.diff].n); redraw(); }); }
function resume() { $('ov').classList.remove('show'); if (!isTouch && canvas.requestPointerLock) canvas.requestPointerLock(); ac(); }
function controlsHtml() {
  const rows = (t, list) => '<h3 style="margin:12px 0 4px">' + t + '</h3><div class="keys">' + list.map(r => '<b>' + r[0] + '</b><span>' + r[1] + '</span>').join('') + '</div>';
  return rows('⌨️ Keyboard & mouse', [['WASD', 'Move'], ['Shift', 'Sprint'], ['Alt', 'Walk / run toggle'], ['C', 'Crouch'], ['Ctrl', 'Prone (tap; let go of Ctrl before pressing W)'], ['Space', 'Jump / vault / stand up'], ['Left click', 'Shoot'], ['Right click', 'Aim'], ['R', 'Reload'], ['X', 'Aim mode (over-the-shoulder / first person)'], ['Z', 'Swap shoulder · while aiming: fire mode'], ['U', 'Suppressor on/off'], ['H', 'Holster'], ['1–4', 'Primary · secondary · sidearm · throwable'], ['Q', 'Drone (Space/C up/down, wheel zoom)'], ['B', 'Binoculars'], ['V / N', 'Vision: normal → night → thermal'], ['Middle click', 'Mark target'], ['Tab', 'Squad orders (sync shot)'], ['G', 'Throw grenade'], ['F', 'Heal'], ['E', 'Takedown / get in or out of a truck'], ['L', 'Headlights'], ['M', 'Tactical map'], ['J / I', 'Skills & loadout'], ['NumLock', 'Hide HUD'], ['Esc', 'Pause']])
    + rows('🎮 PS5 / Xbox controller', [['Left stick · L3', 'Move · sprint'], ['Right stick · R3', 'Look · takedown (while aiming: swap shoulder)'], ['L2 / R2', 'Aim / shoot'], ['L1', 'Throw grenade'], ['R1', 'Tap: mark target · hold: squad orders'], ['✕', 'Jump / vault'], ['○', 'Tap: crouch · hold: prone'], ['□', 'Tap: reload · hold: takedown, enter/exit truck'], ['△', 'Tap: switch primary · double-tap: sidearm · hold: holster'], ['D-pad', '↑ drone · ↓ binoculars · ← throwables · → vision'], ['D-pad + L2', '↑ suppressor · ↓ launcher · ← fire mode · → aim mode'], ['Touchpad', 'Tactical map'], ['Options', 'Pause'], ['In a truck', 'R2 gas · L2 brake/reverse · left stick steer · ✕/○ handbrake · hold □ get out · ↓ headlights']]);
}

// ------------------------------------------------------------------ boot
function startScreen(user, co) {
  $('ovBox').innerHTML = '<h2>🎯 Werewolf Recon</h2><div class="muted">Province: <b>' + PROVINCE + '</b>. The ' + 'La Calavera cartel holds ' + mainCamps().length + ' camps and ' + posts().length + ' guard posts here. Sneak in, mark guards with your drone, take them out with your squad\'s sync shot, and grab the Skill Points, weapon cases and accessory cases. They sit where they do on your tracker map.</div>'
    + '<div class="muted" style="margin-top:8px">' + (user ? '✅ Signed in: progress saves to your account (friend code ' + esc(WW.friendCode || '…') + ').' : '💾 Not signed in: progress saves on this device only. <a href="#" id="sgn" style="color:#86efac">Sign in</a> to keep it on every device.') + '</div>'
    + (co ? '<div class="muted" style="margin-top:8px;color:' + (co.ok ? '#93c5fd' : '#fca5a5') + '">' + (co.ok ? (co.host ? '👥 You\u2019re hosting a co-op squad (room ' + esc(MP.code) + '). Friends join from the games hub. Each friend takes an AI squadmate\u2019s place.' : '👥 Joining ' + esc(co.hostName) + '\u2019s squad. Their camps and enemies are shared; your XP, pickups and skills stay your own.') : '⚠️ ' + esc(co.why) + ' You can still play on your own.') + '</div>' : '')
    + diffHtml() + '<div style="margin-top:10px"><button id="go">▶ Deploy</button><button class="alt" id="keys">🎮 Controls</button></div><div id="pK"></div>';
  $('go').onclick = () => { started = true; $('ov').classList.remove('show'); ac(); if (!isTouch && canvas.requestPointerLock) canvas.requestPointerLock(); say(S.level === 1 && !S.kills ? 'Start at the ⛺ rally point · the 🚙 truck gets you there faster' : 'Welcome back'); publish(); };
  $('keys').onclick = () => { $('pK').innerHTML = controlsHtml(); }; diffWire(() => startScreen(user, co));
  const s = $('sgn'); if (s) s.onclick = e => { e.preventDefault(); WW.signIn(); };
}
async function boot(user) {
  try { fs = (firebase.firestore && user) ? firebase.firestore() : null; } catch (e) { fs = null; }
  if (!world) {
    try { const r = await fetch('../../public/games/wildlands.json', { cache: 'force-cache' }); DATA = r.ok ? await r.json() : null; } catch (e) { DATA = null; }
    if (DATA && DATA.collectibles) TREE_KEYS.forEach(([k, label]) => { const t = DATA.collectibles[k]; if (t && t.items) { TREES.push({ key: k, label, items: t.items.filter(i => i.rank_costs) }); t.items.forEach(i => { if (i.rank_costs) SKILLS[i.id] = i; }); } });
    const items = layout(); buildWorld(items); world = true;
    me = makeSoldier(WW.myColor ? WW.myColor('#4d5b36') : '#4d5b36', 'player'); scene.add(me);
    addEventListener('ww-color', e => { me.userData.cloth.color.set(e.detail); });
    applyTime();
  }
  await loadSave();
  // restore the world from the save
  pickups.forEach(p => { const t = S.picked[p.id]; p.mesh.visible = !(t && !(p.kind === 'crate' && Date.now() - t > 20 * 60 * 1000)); });
  camps.forEach(c => { const t = S.camps[c.id]; if (t && Date.now() - t > 20 * 60 * 1000) { delete S.camps[c.id]; } spawnCampGuards(c); if (S.camps[c.id]) { c.guards.forEach(e => { e.dead = true; e.deadT = 1; e.m.visible = false; }); c.cleared = true; c.flag.visible = false; } });
  if (!squad.length) spawnSquad();
  refill(true); P.hp = maxHP(); P.pos.set(rally.x, hAt(rally.x, rally.z), rally.z); P.yaw = Math.atan2(-(camps[0].x - rally.x), -(camps[0].z - rally.z)); P.face = P.yaw;
  squad.forEach(b => b.pos.set(P.pos.x + b.off[0], 0, P.pos.z + b.off[1]));
  P.resupT = now(); placePlayer(); placeCamera(1); hudNow(); setHint();
  let co = null;
  if (ROOM && !MP.on) { if (!user) co = { ok: false, why: 'Sign in to play co-op with friends.' }; else co = await joinRoom(user); }
  if (!started) startScreen(user, co);
  if (co && co.ok && MP.client) setTimeout(() => { if (MP.remotes[MP.hostUid]) fastTravel(MP.hostUid); }, 2500);   // start next to the host
}
addEventListener('pagehide', () => { if (world) saveNow(); try { WW.clearPlaying && WW.clearPlaying(); } catch (e) {} });
document.addEventListener('visibilitychange', () => { if (document.hidden && world) saveNow(); });
WW.onError = m => say(m);
let booted = null;
WW.onReady(user => { const key = user ? user.uid : 'anon'; if (booted === key) return; booted = key; boot(user); });
requestAnimationFrame(frame);
window.__recon = { get S() { return S; }, P, enemies, camps, pickups, vehicles, act, D, squad, sim(sec) { for (let t = 0; t < sec; t += .05) update(.05, null); }, MP, damage: (e, d, h, how) => damageEnemy(e, d, h, how), fire(v) { mouseL = v; if (v) P.burstReq = true; }, hurt: d => hurtPlayer(d), hAt, aim(v) { mouseR = v; }, keys: K, syncShot, get started() { return started; } };
