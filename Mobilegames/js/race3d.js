// Werewolf Racing: 3D arcade car racing for phones and desktops.
// Solo = you vs 5 bots on this device. Multiplayer = up to 8 drivers live in game_rooms/race/{hostFriendCode}
// (players/{uid} = live car, state = race control), and the host can fill empty grid slots with bots.
// Controls: keyboard (arrows / WASD), on-screen pedals on phones, or a Bluetooth controller (PS5, Xbox ...) through js/gamepad.js.
import * as THREE from './three.min.js';

const $ = id => document.getElementById(id);
const WW = window.WW, PAD = window.WWPad;
const qs = new URLSearchParams(location.search);
const roomCode = (qs.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isMP = !!roomCode;
const MAXP = 8, SOLO_BOTS = 5;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#f8fafc', '#84cc16'];
const BOT_NAMES = ['Fang', 'Howler', 'Luna', 'Shadow', 'Blitz', 'Ember', 'Ghost', 'Rex'];

// ------------------------------------------------------------------ track
const W = 16, HALF = W / 2, WALL = HALF + 7;            // road width; tire wall distance from the centre line
const CTRL = [[0, 0], [70, 0], [130, 10], [165, 50], [160, 105], [120, 125], [85, 110], [60, 135], [70, 180], [120, 195], [175, 205],
  [215, 240], [205, 290], [150, 305], [70, 300], [10, 280], [-30, 240], [-60, 190], [-55, 130], [-85, 85], [-75, 30], [-40, 5]];
const curve = new THREE.CatmullRomCurve3(CTRL.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
const N = 900, P = [], T = [], NR = [];
for (let i = 0; i < N; i++) {
  const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u).setY(0).normalize();
  P.push(p); T.push(t); NR.push(new THREE.Vector3(t.z, 0, -t.x));   // normal points to the left of the driving direction
}
const TRACK_LEN = curve.getLength();
// how sharply the track bends ahead of sample i (0 straight .. ~1 hairpin)
const BEND = P.map((p, i) => { const a = T[i], b = T[(i + 45) % N]; return Math.min(1, Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) / 1.3); });

function nearest(x, z, guess, span) {
  let best = guess, bd = Infinity;
  const s = span || 60;
  for (let k = -s; k <= s; k++) { const i = (guess + k + N) % N, p = P[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; best = i; } }
  return best;
}
function nearestAll(x, z) { let best = 0, bd = Infinity; for (let i = 0; i < N; i += 3) { const p = P[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; best = i; } } return nearest(x, z, best, 4); }
function lateral(x, z, i) { return (x - P[i].x) * NR[i].x + (z - P[i].z) * NR[i].z; }

// ------------------------------------------------------------------ scene
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8e8); scene.fog = new THREE.Fog(0x87b8e8, 180, 520);
const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 900);
scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(80, 160, 40); scene.add(sun);
const M = {}; function mat(c, o) { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); }

function canvasTex(w, h, draw, rx, ry) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); t.anisotropy = 4; return t; }
const grassTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4d8a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? '#5a9a45' : '#447d33'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 120);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshLambertMaterial({ map: grassTex }));
ground.rotation.x = -Math.PI / 2; ground.position.set(70, -0.05, 150); scene.add(ground);

// a ribbon that follows the track between two lateral offsets
function ribbon(off0, off1, y, material, uvPer) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, p = P[k], n = NR[k];
    pos.push(p.x + n.x * off0, y, p.z + n.z * off0, p.x + n.x * off1, y, p.z + n.z * off1);
    const v = i * (TRACK_LEN / N) / (uvPer || 8); uv.push(0, v, 1, v);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); scene.add(m); return m;
}
const roadTex = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#3b3f46'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < .5 ? '#43474f' : '#35383e'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } g.fillStyle = '#e5e7eb'; g.fillRect(w / 2 - 1, 0, 2, h / 2); g.fillStyle = '#f8fafc'; g.fillRect(1, 0, 2, h); g.fillRect(w - 3, 0, 2, h); });
ribbon(HALF, -HALF, 0.02, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide }), 8);
const curbTex = canvasTex(8, 16, (g, w, h) => { g.fillStyle = '#dc2626'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f8fafc'; g.fillRect(0, h / 2, w, h / 2); });
ribbon(HALF + 1.3, HALF, 0.04, new THREE.MeshLambertMaterial({ map: curbTex, side: THREE.DoubleSide }), 3);
ribbon(-HALF, -HALF - 1.3, 0.04, new THREE.MeshLambertMaterial({ map: curbTex, side: THREE.DoubleSide }), 3);
ribbon(HALF + 1.3, HALF + 5, 0.01, mat(0xc9b37c, { side: THREE.DoubleSide }));        // gravel run-off
ribbon(-HALF - 1.3, -HALF - 5, 0.01, mat(0xc9b37c, { side: THREE.DoubleSide }));
// tire walls (two stacked rings drawn as a tall ribbon)
function wall(off) {
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const k = i % N, p = P[k], n = NR[k], x = p.x + n.x * off, z = p.z + n.z * off; pos.push(x, 0, z, x, 1.1, z); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: canvasTex(16, 8, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#e11d48'; c.fillRect(0, 0, w / 2, h); }), side: THREE.DoubleSide })));
}
wall(WALL); wall(-WALL);
// start / finish line + gantry
{
  const chk = canvasTex(64, 16, (g, w, h) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), new THREE.MeshLambertMaterial({ map: chk }));
  line.rotation.x = -Math.PI / 2; line.rotation.z = Math.atan2(T[0].x, T[0].z); line.position.set(P[0].x, 0.06, P[0].z); scene.add(line);
  const g = new THREE.Group(), ang = Math.atan2(T[0].x, T[0].z);
  [-1, 1].forEach(s => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), mat(0x334155)); post.position.set(s * (HALF + 2), 3.5, 0); g.add(post); });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(W + 5, 1.6, 0.4), new THREE.MeshLambertMaterial({ map: canvasTex(256, 32, (c, w, h) => { c.fillStyle = '#0f172a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f97316'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('🐺 WEREWOLF RACING', w / 2, 24); }) }));
  banner.position.y = 7; g.add(banner); g.rotation.y = ang; g.position.copy(P[0]); scene.add(g);
}
// scenery: trees, grandstand, hay bales (kept clear of the road)
function clearOfTrack(x, z, gap) { for (let i = 0; i < N; i += 3) { const p = P[i]; if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < gap * gap) return false; } return true; }
{
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trunkG = new THREE.CylinderGeometry(0.4, 0.5, 3, 6), leafG = new THREE.ConeGeometry(2.6, 6, 7);
  for (let k = 0, made = 0; k < 900 && made < 170; k++) {
    const x = -160 + rnd() * 460, z = -80 + rnd() * 450; if (!clearOfTrack(x, z, WALL + 6)) continue; made++;
    const t = new THREE.Group(), s = 0.8 + rnd() * 0.7;
    const tr = new THREE.Mesh(trunkG, mat(0x7c4a21)); tr.position.y = 1.5; t.add(tr);
    const lf = new THREE.Mesh(leafG, mat(rnd() < .5 ? 0x2f6b2f : 0x3d7d34)); lf.position.y = 5.5; t.add(lf);
    t.position.set(x, 0, z); t.scale.setScalar(s); scene.add(t);
  }
  const i0 = 30, side = -1, gs = new THREE.Group();
  for (let r = 0; r < 4; r++) { const step = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 2), mat(r % 2 ? 0x94a3b8 : 0x64748b)); step.position.set(0, 0.5 + r, -r * 2); gs.add(step); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(31, 0.4, 9), mat(0xf97316)); roof.position.set(0, 6.5, -3); gs.add(roof);
  const p = P[i0], n = NR[i0]; gs.position.set(p.x + n.x * side * (WALL + 9), 0, p.z + n.z * side * (WALL + 9)); gs.rotation.y = Math.atan2(T[i0].x, T[i0].z) + Math.PI / 2 * side; gs.lookAt(p.x, 0, p.z); scene.add(gs);
}

// ------------------------------------------------------------------ cars
function nameSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 34px system-ui'; const w = Math.min(250, g.measureText(text).width + 30);
  g.fillStyle = '#000a'; g.beginPath(); if (g.roundRect) g.roundRect((256 - w) / 2, 8, w, 46, 14); else g.rect((256 - w) / 2, 8, w, 46); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.fillText(text, 128, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(4.4, 1.1, 1); s.position.y = 3.4; s.renderOrder = 10; return s;
}
function carModel(color) {
  const g = new THREE.Group(), body = mat(new THREE.Color(color).getHex());
  const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 4.2), body); b.position.y = 0.65; g.add(b);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1), body); nose.position.set(0, 0.55, 2.4); g.add(nose);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.7), mat(0x111827)); cab.position.set(0, 1.2, -0.2); g.add(cab);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.6), mat(0x111827)); wing.position.set(0, 1.35, -1.95); g.add(wing);
  [-0.8, 0.8].forEach(x => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.2), mat(0x111827)); st.position.set(x, 1.1, -1.95); g.add(st); });
  const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 12); wg.rotateZ(Math.PI / 2);
  g.userData.wheels = [];
  [[-1.05, 1.35], [1.05, 1.35], [-1.05, -1.35], [1.05, -1.35]].forEach(w => { const m = new THREE.Mesh(wg, mat(0x0b0b0b)); m.position.set(w[0], 0.42, w[1]); g.add(m); g.userData.wheels.push(m); });
  [-0.6, 0.6].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), mat(0xfff7c2, { emissive: 0x666633 })); l.position.set(x, 0.7, 2.91); g.add(l); });
  return g;
}

// one car: physics state + model
function makeCar(id, name, color, kind) {
  const m = carModel(color); scene.add(m);
  const label = nameSprite(name, color); m.add(label); label.visible = kind !== 'me'; m.userData.label = label;
  return { id, name, color, kind, m, x: 0, z: 0, h: 0, v: 0, steer: 0, idx: 0, started: false, half: false, laps: 0, fin: 0, lapStart: 0, best: 0, last: 0,
    tx: 0, tz: 0, th: 0, seen: 0, skill: 1, lane: 0, gas: 0 };
}
function removeCar(c) { scene.remove(c.m); }

// grid slot k: two columns, rows of 7 m behind the start line
function gridPos(k) {
  const back = 10 + Math.floor(k / 2) * 7, i = (N - Math.round(back / (TRACK_LEN / N)) + N) % N, side = k % 2 ? -3.6 : 3.6;
  return { x: P[i].x + NR[i].x * side, z: P[i].z + NR[i].z * side, h: Math.atan2(T[i].x, T[i].z), idx: i };
}
function placeOnGrid(c, k) {
  const g = gridPos(k); Object.assign(c, { x: g.x, z: g.z, h: g.h, v: 0, idx: g.idx, started: false, half: false, laps: 0, fin: 0, lapStart: 0, best: 0, last: 0, steer: 0, tx: g.x, tz: g.z, th: g.h });
  c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.h;
}

// ------------------------------------------------------------------ physics
const MAXV = 48, OFFV = 17, ACC = 21, BRK = 42, REV = 9;
function stepCar(c, gas, brake, steer, dt, now) {
  const off = Math.abs(lateral(c.x, c.z, c.idx)) > HALF + 1.3;
  const top = (off ? OFFV : MAXV) * (c.kind === 'bot' ? c.skill : 1);
  if (gas > 0) c.v += ACC * gas * dt * (c.v < 0 ? 2.5 : 1) * Math.max(0.25, 1 - c.v / (top + 1));
  if (brake > 0) { if (c.v > 0.5) c.v -= BRK * brake * dt; else c.v = Math.max(-REV, c.v - ACC * 0.6 * brake * dt); }
  if (!gas && !brake) c.v -= c.v * 0.35 * dt;
  if (c.v > top) c.v -= (c.v - top) * (off ? 2.5 : 1.2) * dt;
  c.steer += (steer - c.steer) * Math.min(1, dt * 8);
  const turn = (2.1 - 1.0 * Math.min(1, Math.abs(c.v) / MAXV)) * c.steer * Math.min(1, Math.abs(c.v) / 10) * Math.sign(c.v || 1);
  c.h += turn * dt;
  c.x += Math.sin(c.h) * c.v * dt; c.z += Math.cos(c.h) * c.v * dt;
  // stay inside the tire walls
  const prevIdx = c.idx; c.idx = nearest(c.x, c.z, c.idx);
  const lat = lateral(c.x, c.z, c.idx);
  if (Math.abs(lat) > WALL - 1.2) {
    const push = Math.abs(lat) - (WALL - 1.2), n = NR[c.idx], s = Math.sign(lat);
    c.x -= n.x * s * push; c.z -= n.z * s * push; const hit = Math.abs(c.v) > 12; c.v *= 0.55;
    if (c.kind === 'me' && hit) { PAD && PAD.rumble(0.8, 0.5, 160); sfx('bump'); }
  }
  laps(c, prevIdx, now);
}
// lap counting: the start line is sample 0. A lap only counts after passing the far side of the track.
function laps(c, prev, now) {
  if (c.fin) return;
  const i = c.idx;
  if (i > N * 0.4 && i < N * 0.6) c.half = true;
  if (prev > N * 0.8 && i < N * 0.2) {       // crossed the line going forward
    if (!c.started) { c.started = true; c.half = false; }
    else if (c.half) {
      c.laps++; c.half = false; const lt = now - c.lapStart; c.last = lt; if (!c.best || lt < c.best) c.best = lt; c.lapStart = now;
      if (c.laps >= race.laps) { c.fin = now; onFinish(c); } else if (c.kind === 'me') { say(c.laps === race.laps - 1 ? '🏁 Final lap!' : 'Lap ' + (c.laps + 1) + ' of ' + race.laps); sfx('lap'); }
    }
  } else if (prev < N * 0.2 && i > N * 0.8) c.half = false;   // backed over the line
}
function progress(c) { if (c.fin) return 1e9 - c.fin / 1e3; return c.laps * N + (c.started ? c.idx : c.idx - N); }
function bump(a, b) {           // simple car-to-car push (only moves a)
  const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz; if (d2 > 9 || d2 < 1e-4) return;
  const d = Math.sqrt(d2), push = (3 - d) * 0.5; a.x += dx / d * push; a.z += dz / d * push; a.v *= 0.997;
  if (a.kind === 'me' && Math.abs(a.v) > 8 && Math.random() < .3) { PAD && PAD.rumble(0.4, 0.6, 90); }
}
function botDrive(c, dt, now) {
  const look = 10 + Math.round(Math.abs(c.v) * 0.35), ti = (c.idx + look) % N, tp = P[ti], n = NR[ti];
  const tx = tp.x + n.x * c.lane, tz = tp.z + n.z * c.lane;
  let want = Math.atan2(tx - c.x, tz - c.z) - c.h; while (want > Math.PI) want -= Math.PI * 2; while (want < -Math.PI) want += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, want * 2.2));
  const target = MAXV * c.skill * (1 - 0.22 * BEND[c.idx]);
  const gas = c.v < target ? 1 : 0, brake = c.v > target + 4 ? 0.6 : 0;
  if (now % 9000 < 16) c.lane = (Math.random() - .5) * (HALF - 2);
  stepCar(c, gas, brake, steer, dt, now);
}

// ------------------------------------------------------------------ race state
const race = { phase: 'lobby', start: 0, laps: 3, bots: 0, rid: 0, fin: {}, doneAt: 0, results: false };
let me = null, myName = 'Driver', myColor = '#f97316', user = null, roomRef = null, isHost = false;
const cars = new Map();          // id -> car (me, bots and remote players)
let lastSend = 0, lastBeat = 0, lastBotSend = 0, remote = {}, toastTimer = null;

function say(t, ms) { $('toast').textContent = t || ''; clearTimeout(toastTimer); if (t) toastTimer = setTimeout(() => { $('toast').textContent = ''; }, ms || 2600); }
const fmt = ms => { if (!ms) return '--:--.-'; const s = ms / 1000, m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const now = () => (WW && WW.now) ? WW.now() : Date.now();
function colorFor(uid) { let h = 0; for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }

function startGrid() {
  // order: humans by id (same on every screen), then bots
  const real = c => c.kind === 'me' ? (me ? me.uid : 'me') : String(c.id).replace(/^nb_/, '');
  const all = [...cars.values()], humans = all.filter(c => c.kind !== 'bot' && !c.isBot), bots = all.filter(c => c.kind === 'bot' || c.isBot);
  humans.sort((a, b) => real(a) < real(b) ? -1 : 1); bots.sort((a, b) => real(a) < real(b) ? -1 : 1);
  humans.concat(bots).forEach((c, k) => placeOnGrid(c, k));
}
function setBots(n) {
  [...cars.values()].filter(c => c.kind === 'bot').forEach(c => { removeCar(c); cars.delete(c.id); });
  for (let k = 0; k < n; k++) {
    const id = 'bot' + k, c = makeCar(id, BOT_NAMES[k] + ' 🤖', COLORS[(k + 3) % COLORS.length], 'bot');
    c.skill = 0.86 + (k % 5) * 0.025; c.lane = ((k % 3) - 1) * 3; cars.set(id, c);
  }
}
function beginCountdown(start) {
  race.start = start; race.phase = 'count'; race.fin = {}; race.doneAt = 0; race.results = false;
  startGrid(); hideOverlay(); sfxCount = -1;
}
function onFinish(c) {
  if (c.kind === 'me') {
    sfx('finish'); PAD && PAD.rumble(1, 1, 400);
    const place = [...cars.values()].filter(o => o.fin && o.fin <= c.fin).length;
    say('🏁 Finished P' + place + ' · ' + fmt(c.fin - race.start), 5000);
    if (c.best && WW && WW.postBest) WW.postBest('race', Math.round(c.best), true);
    if (isMP && roomRef && race.start) roomRef.child('state/fin/' + me.uid).set({ n: myName, ms: Math.round(c.fin - race.start), best: Math.round(c.best || 0) }).catch(() => {});
  } else if (c.kind === 'bot' && isMP && isHost && roomRef) roomRef.child('state/fin/' + c.id).set({ n: c.name, ms: Math.round(c.fin - race.start), best: Math.round(c.best || 0), bot: true }).catch(() => {});
  if (!isMP) race.fin[c.id] = { n: c.name, ms: Math.round(c.fin - race.start), best: Math.round(c.best || 0), bot: c.kind === 'bot' };
}
function checkDone(t) {
  if (race.phase !== 'race' || race.results) return;
  const mine = cars.get('me');
  const humans = [...cars.values()].filter(c => c.kind !== 'bot' && !c.isBot);
  const allHumansDone = isMP ? humans.every(c => (c.kind === 'me' ? c.fin : (race.fin[c.id] || !c.seen || t - c.seen > 15000))) : !!(mine && mine.fin);
  const first = Object.values(race.fin).reduce((a, f) => Math.min(a, f.ms || 1e12), 1e12);
  const timeout = first < 1e12 && t - race.start - first > 45000;
  if (allHumansDone || timeout) showResults();
}
function standings() {
  return [...cars.values()].map(c => ({ c, p: progress(c) })).sort((a, b) => b.p - a.p).map(o => o.c);
}
function showResults() {
  race.results = true; race.phase = 'done';
  const fin = Object.assign({}, race.fin), list = standings();
  const rows = list.map(c => { const f = fin[c.id] || (c.kind === 'me' && c.fin ? { ms: c.fin - race.start, best: c.best } : null); return { c, f }; })
    .sort((a, b) => (a.f ? a.f.ms : 1e12) - (b.f ? b.f.ms : 1e12));
  const medal = ['🥇', '🥈', '🥉'];
  let h = '<h2>🏁 Results</h2><div class="plist">' + rows.map((r, i) => '<div><b>' + (medal[i] || (i + 1) + '.') + '</b> <i style="background:' + r.c.color + '"></i>' + esc(r.c.name) + (r.c.kind === 'me' ? ' (you)' : '') + ' — ' + (r.f ? fmt(r.f.ms) + ' <span class="muted">best lap ' + fmt(r.f.best) + '</span>' : '<span class="muted">did not finish</span>') + '</div>').join('') + '</div>';
  const mine = rows.findIndex(r => r.c.kind === 'me');
  const myRow = rows[mine];
  if (user && WW.recordResult && myRow && myRow.f) {          // only races you finished count toward your record
    const isB = c => c.kind === 'bot' || !!c.isBot;
    const opp = rows.filter(r => r.c.kind !== 'me').map(r => ({ n: r.c.name, u: String(r.c.id).replace(/^nb_/, ''), b: isB(r.c) }));
    const key = isMP ? 'race_' + roomCode + '_' + race.rid : 'race_solo_' + Math.round(race.start);
    WW.recordResult(key, { game: 'race', title: 'Werewolf Racing', room: roomCode || '', result: mine === 0 ? 'win' : 'loss', opp, winner: { n: rows[0].c.name, u: rows[0].c.kind === 'me' ? user.uid : String(rows[0].c.id).replace(/^nb_/, ''), b: isB(rows[0].c) }, place: mine + 1 });
  }
  h += '<div style="margin-top:12px">';
  if (!isMP) h += '<button data-a="again">Race again</button>';
  else if (isHost) h += '<button data-a="lobby">Back to the grid</button>';
  else h += '<span class="muted">Waiting for the host to set up the next race…</span><br>';
  h += '<button class="alt" data-a="leave">Leave</button></div>';
  showOverlay(h);
  if (isMP && isHost && roomRef) roomRef.child('state/phase').set('done').catch(() => {});
}

// ------------------------------------------------------------------ overlay (menus work with touch, mouse and controller)
let padSel = 0;
function showOverlay(html) { $('ovBox').innerHTML = html; $('ov').style.display = 'flex'; const b = ovButtons(); padSel = Math.max(0, b.findIndex(x => !x.classList.contains('alt'))); markPadSel(); }
function hideOverlay() { $('ov').style.display = 'none'; }
function ovButtons() { return [...$('ovBox').querySelectorAll('button:not(:disabled)')]; }
function markPadSel() { const b = ovButtons(); b.forEach((x, i) => x.classList.toggle('padsel', PAD && PAD.connected() && i === padSel)); }
$('ovBox').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.v); });
function act(a, v) {
  if (a === 'leave') { location.href = 'index.html'; return; }
  if (a === 'solo') { location.href = 'race.html'; return; }
  if (a === 'signin') { WW.signIn(); return; }
  if (a === 'again') { race.laps = race.laps || 3; setBots(SOLO_BOTS); beginCountdown(now() + 3500); return; }
  if (a === 'laps') { race.laps = +v; if (isMP && isHost) roomRef.child('state/laps').set(+v); else lobby(); return; }
  if (a === 'bots') { race.bots = +v; if (isMP && isHost) roomRef.child('state/bots').set(+v); else lobby(); return; }
  if (a === 'go') {
    if (isMP && isHost) roomRef.child('state').transaction(s => { s = s || {}; return { rid: (s.rid | 0) + 1, phase: 'count', start: now() + 4500, laps: s.laps || 3, bots: s.bots | 0, fin: null }; });
    else { setBots(SOLO_BOTS); beginCountdown(now() + 3500); }
    return;
  }
  if (a === 'lobby' && isMP && isHost) { roomRef.child('state').update({ phase: 'lobby', fin: null }); return; }
}
function lobby() {
  race.phase = 'lobby';
  const humans = [...cars.values()].filter(c => c.kind !== 'bot' && !c.isBot);
  const open = Math.max(0, MAXP - humans.length);
  let h = '<h2>🏎️ Werewolf Racing</h2>';
  if (!isMP) h += '<div class="muted">You against ' + SOLO_BOTS + ' bots. Steer with ◀ ▶, GAS and the brake on a phone; arrows or WASD on a keyboard; or a Bluetooth controller (left stick, R2 gas, L2 brake).</div>';
  else h += '<div class="muted">Room <b>' + esc(roomCode) + '</b> · up to ' + MAXP + ' drivers. Friends join with your code from the games hub.</div><div class="plist" style="margin-top:8px">' +
    humans.map(c => '<div><i style="background:' + c.color + '"></i>' + esc(c.name) + (c.kind === 'me' ? ' (you)' : '') + '</div>').join('') + '</div>';
  h += '<div class="optrow"><b>Laps:</b>' + [3, 5, 8].map(n => '<button class="alt' + (race.laps === n ? ' sel' : '') + '" data-a="laps" data-v="' + n + '"' + (isMP && !isHost ? ' disabled' : '') + '>' + n + '</button>').join('') + '</div>';
  if (isMP) h += '<div class="optrow"><b>Bots:</b>' + [0, 1, 3, open].filter((n, i, a) => n <= open && a.indexOf(n) === i).map(n => '<button class="alt' + (race.bots === n ? ' sel' : '') + '" data-a="bots" data-v="' + n + '"' + (!isHost ? ' disabled' : '') + '>' + n + '</button>').join('') + '</div>';
  h += '<div style="margin-top:12px">' + (!isMP || isHost ? '<button data-a="go">🚦 Start race</button>' : '<span class="muted">Waiting for the host to start…</span><br>') + '<button class="alt" data-a="leave">Leave</button></div>';
  showOverlay(h);
}

// ------------------------------------------------------------------ input
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
const touch = { l: 0, r: 0, gas: 0, brk: 0 };
[['tL', 'l'], ['tR', 'r'], ['tGas', 'gas'], ['tBrk', 'brk']].forEach(([id, k]) => {
  const b = $(id);
  const on = e => { e.preventDefault(); touch[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) {} };
  const offF = e => { e.preventDefault(); touch[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', offF); b.addEventListener('pointercancel', offF); b.addEventListener('lostpointercapture', offF);
});
const stick = { x: 0, y: 0 };   // landscape analogs: left stick x = steer, right stick y = gas (up) / brake (down)
[['sL', 'x'], ['sR', 'y']].forEach(([id, ax]) => {
  const el = $(id), kn = el && el.firstElementChild; if (!el) return; let pid = null;
  const mv = e => { const r = el.getBoundingClientRect(), h = r.width / 2; let dx = (e.clientX - (r.left + h)) / h, dy = (e.clientY - (r.top + h)) / h; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } if (ax === 'x') { stick.x = dx; kn.style.transform = 'translate(' + dx * h * .7 + 'px,0)'; } else { stick.y = dy; kn.style.transform = 'translate(0,' + dy * h * .7 + 'px)'; } };
  const up = e => { if (e.pointerId !== pid) return; pid = null; stick[ax] = 0; kn.style.transform = ''; };
  el.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (x) {} mv(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === pid) mv(e); });
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');
function controls() {
  let gas = 0, brake = 0, steer = 0;
  if (keys.ArrowUp || keys.KeyW) gas = 1;
  if (keys.ArrowDown || keys.KeyS || keys.Space) brake = 1;
  if (keys.ArrowLeft || keys.KeyA) steer += 1;
  if (keys.ArrowRight || keys.KeyD) steer -= 1;
  if (touch.gas) gas = 1; if (touch.brk) brake = 1; steer += touch.l - touch.r;
  if (Math.abs(stick.x) > .12) steer -= stick.x; if (stick.y < -.12) gas = Math.max(gas, -stick.y); if (stick.y > .12) brake = Math.max(brake, stick.y);
  const p = PAD && PAD.state();
  if (p) {
    gas = Math.max(gas, p.r2, p.held('cross') ? 1 : 0);
    brake = Math.max(brake, p.l2, p.held('square') ? 1 : 0);
    const sx = p.moveX(); if (sx) steer = -sx;
  }
  return { gas, brake, steer: Math.max(-1, Math.min(1, steer)) };
}
function padMenus() {
  if (!PAD) return;
  PAD.poll();
  if ($('ov').style.display === 'none') return;
  const b = ovButtons(); if (!b.length) return;
  if (PAD.pressed('down') || PAD.pressed('right') || PAD.pressed('r1')) { padSel = (padSel + 1) % b.length; markPadSel(); }
  if (PAD.pressed('up') || PAD.pressed('left') || PAD.pressed('l1')) { padSel = (padSel - 1 + b.length) % b.length; markPadSel(); }
  if (PAD.pressed('cross') || PAD.pressed('options')) { const x = b[Math.min(padSel, b.length - 1)]; if (x) x.click(); }
}
function padHint() {
  if (!PAD || !PAD.supported()) { $('padHint').textContent = ''; return; }
  if (PAD.connected()) { document.body.classList.add('pad'); $('padHint').textContent = '🎮 R2 gas · L2 brake · left stick steer'; }
  else { document.body.classList.remove('pad'); $('padHint').textContent = '🎮 Bluetooth controller? Press any button on it to connect'; }
}
if (PAD) {
  PAD.on('connect', n => { say('🎮 ' + n + ' connected', 3000); padHint(); markPadSel(); });
  PAD.on('disconnect', n => { say('🎮 ' + n + ' disconnected', 3000); padHint(); });
}
padHint();

// ------------------------------------------------------------------ sound (synthesised)
let actx = null, eng = null, muted = false, sfxCount = -1;
try { muted = localStorage.getItem('race_mute') === '1'; } catch (e) {}
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function engine(v) {
  const a = actx; if (!a) return;
  if (!eng) { const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0; o.connect(f); f.connect(g); g.connect(a.destination); o.start(); eng = { o, g }; }
  eng.o.frequency.setTargetAtTime(55 + Math.abs(v) * 4.2, a.currentTime, 0.05);
  eng.g.gain.setTargetAtTime(muted || race.phase === 'lobby' ? 0 : 0.035 + Math.min(0.04, Math.abs(v) / 1200), a.currentTime, 0.1);
}
function tone(f, d, t0, type, vol) { const a = actx; if (!a || muted) return; const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.15, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + d); o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + 0.05); }
function sfx(k) {
  if (k === 'beep') tone(440, 0.25, 0, 'square', 0.12);
  else if (k === 'go') tone(880, 0.6, 0, 'square', 0.14);
  else if (k === 'lap') { tone(660, 0.15, 0); tone(990, 0.2, 0.15); }
  else if (k === 'finish') [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, i * 0.13, 'triangle', 0.18));
  else if (k === 'bump') tone(90, 0.18, 0, 'square', 0.18);
}
function paintMute() { $('muteBtn').textContent = muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = () => { muted = !muted; try { localStorage.setItem('race_mute', muted ? '1' : '0'); } catch (e) {} paintMute(); ac(); };
paintMute();
addEventListener('pointerdown', ac, { once: false }); addEventListener('keydown', ac);
$('shareBtn').onclick = () => {
  const code = roomCode || WW.friendCode; if (!code) { say('Sign in from the games hub to get a code friends can use.'); return; }
  const url = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'race.html?room=' + encodeURIComponent(code);
  if (navigator.share) navigator.share({ title: 'Race me in Werewolf Racing', text: 'Room ' + code, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say('Invite link copied'));
};

// ------------------------------------------------------------------ minimap
const mapC = $('map'), mg = mapC.getContext('2d');
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity; P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
const msc = 260 / Math.max(maxX - minX, maxZ - minZ), mx = x => 20 + (x - minX) * msc, mz = z => 20 + (z - minZ) * msc;   // seen from above: x to the right, z down the screen (flipping z mirrored the map)
function drawMap() {
  mg.clearRect(0, 0, 300, 300); mg.lineWidth = 14; mg.strokeStyle = '#94a3b8'; mg.lineJoin = 'round'; mg.beginPath();
  P.forEach((p, i) => { if (i % 6) return; i ? mg.lineTo(mx(p.x), mz(p.z)) : mg.moveTo(mx(p.x), mz(p.z)); }); mg.closePath(); mg.stroke();
  mg.fillStyle = '#fff'; mg.fillRect(mx(P[0].x) - 6, mz(P[0].z) - 2, 12, 4);
  cars.forEach(c => { mg.fillStyle = c.color; mg.beginPath(); mg.arc(mx(c.x), mz(c.z), c.kind === 'me' ? 10 : 7, 0, 7); mg.fill(); if (c.kind === 'me') { mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.stroke(); } });
}

// ------------------------------------------------------------------ networking
function sendMe(t) {
  const c = cars.get('me'); if (!isMP || !roomRef || !c) return;
  if (t - lastSend > 100) {
    lastSend = t;
    roomRef.child('players/' + me.uid).update({ n: myName, c: myColor, x: +c.x.toFixed(2), z: +c.z.toFixed(2), h: +c.h.toFixed(3), v: +c.v.toFixed(1), i: c.idx, l: c.laps, s: c.started ? 1 : 0, f: c.fin ? 1 : 0, r: race.rid }).catch(() => {});
  }
  if (t - lastBeat > 3000) { lastBeat = t; roomRef.child('players/' + me.uid + '/t').set(firebase.database.ServerValue.TIMESTAMP).catch(() => {}); publish(); }
  if (isHost && t - lastBotSend > 150) {
    lastBotSend = t; const up = {};
    cars.forEach(b => { if (b.kind === 'bot') up[b.id] = { n: b.name, c: b.color, x: +b.x.toFixed(2), z: +b.z.toFixed(2), h: +b.h.toFixed(3), v: +b.v.toFixed(1), i: b.idx, l: b.laps, s: b.started ? 1 : 0, f: b.fin ? 1 : 0, r: race.rid, bot: 1, t: t }; });
    if (Object.keys(up).length) roomRef.child('bots').set(up).catch(() => {});
  }
}
function publish() {
  if (!WW || !WW.publishPlaying || !user) return;
  const n = [...cars.values()].filter(c => c.kind !== 'bot').length;
  if (isMP) WW.publishPlaying({ game: 'race', title: 'Werewolf Racing', room: roomCode, status: n + ' of ' + MAXP + ' drivers · ' + race.laps + ' laps · ' + (race.phase === 'race' ? 'racing' : 'on the grid'), open: Math.max(0, MAXP - n) });
  else WW.publishPlaying({ game: 'race', title: 'Werewolf Racing', status: 'Solo vs bots' + (cars.get('me') && cars.get('me').best ? ' · best lap ' + fmt(cars.get('me').best) : ''), open: 0 });
}
function syncRemote(v, isBots) {
  const t = now(), seen = new Set();
  Object.keys(v || {}).forEach(id => {
    const d = v[id]; if (!d || (me && id === me.uid)) return;
    if (!isBots && t - (d.t || 0) > 20000) return;
    const key = isBots ? 'nb_' + id : id; seen.add(key);
    let c = cars.get(key);
    if (!c) { c = makeCar(key, isBots ? (d.n || 'Bot') : (d.n || 'Driver'), d.c || colorFor(id), 'net'); c.isBot = !!isBots; cars.set(key, c); c.x = d.x || 0; c.z = d.z || 0; c.h = d.h || 0; }
    c.tx = d.x || 0; c.tz = d.z || 0; c.th = d.h || 0; c.v = d.v || 0; c.idx = d.i | 0; c.laps = d.l | 0; c.started = !!d.s; c.seen = isBots ? t : (d.t || t);
    if (d.f && !c.fin) c.fin = t;
    if (!d.f) c.fin = 0;
  });
  cars.forEach((c, key) => { if (c.kind === 'net' && !!c.isBot === !!isBots && !seen.has(key)) { removeCar(c); cars.delete(key); } });
  const cnt = [...cars.values()].filter(c => c.kind !== 'bot' && !c.isBot).length;
  if (!isBots && cnt !== +$('cnt').textContent && race.phase === 'lobby' && $('ov').style.display !== 'none') { $('cnt').textContent = cnt; lobby(); }
  $('cnt').textContent = cnt;
}
function onState(s) {
  s = s || {}; race.laps = s.laps || 3; race.bots = s.bots | 0;
  const fin = s.fin || {}; race.fin = {}; Object.keys(fin).forEach(k => { race.fin[k.startsWith('bot') ? (isHost ? k : 'nb_' + k) : (me && k === me.uid ? 'me' : k)] = fin[k]; });
  if ((s.rid | 0) !== race.rid && s.phase === 'count') {
    race.rid = s.rid | 0;
    if (isHost) setBots(race.bots); else setBots(0);
    beginCountdown(s.start || now() + 3000);
    return;
  }
  race.rid = s.rid | 0;
  if (s.phase === 'lobby' && (race.phase !== 'lobby' || $('ov').style.display !== 'none')) { if (isHost) setBots(0); lobby(); }
  else if (s.phase === 'done' && race.phase === 'race' && !race.results) showResults();
  else if (s.phase === 'count' || s.phase === 'race') { if (race.phase === 'lobby') { /* joined mid-race: watch until the next one */ race.phase = 'watch'; hideOverlay(); say('A race is running. You join on the next start.', 4000); } }
}

// ------------------------------------------------------------------ main loop
let lastT = performance.now(), camPos = new THREE.Vector3(0, 20, -30), camLook = new THREE.Vector3();
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function frame() {
  requestAnimationFrame(frame);
  const pt = performance.now(), dt = Math.min(0.05, (pt - lastT) / 1000); lastT = pt;
  const t = now();
  padMenus();
  // countdown
  if (race.phase === 'count') {
    const left = race.start - t, n = Math.ceil(left / 1000);
    $('count').style.display = '';
    if (left > 0) { $('count').textContent = n <= 3 ? n : '🚦'; if (n <= 3 && n !== sfxCount) { sfxCount = n; sfx('beep'); } }
    else { race.phase = 'race'; $('count').textContent = 'GO!'; sfx('go'); cars.forEach(c => { c.lapStart = race.start; }); setTimeout(() => { if (race.phase === 'race') $('count').style.display = 'none'; }, 900); }
  }
  const running = race.phase === 'race';
  const mine = cars.get('me');
  cars.forEach(c => {
    if (c.kind === 'me') { const k = controls(); if (running && !c.fin) stepCar(c, k.gas, k.brake, k.steer, dt, t); else if (c.fin) stepCar(c, 0, 0.4, 0, dt, t); }
    else if (c.kind === 'bot') { if (running) { if (c.fin) stepCar(c, 0, 0.4, 0, dt, t); else botDrive(c, dt, t); } }
    else { const a = Math.min(1, dt * 10); c.x += (c.tx - c.x) * a; c.z += (c.tz - c.z) * a; let d = c.th - c.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; c.h += d * a; }
  });
  if (running) {
    const list = [...cars.values()];
    list.forEach(a => { if (a.kind === 'net') return; list.forEach(b => { if (a !== b) bump(a, b); }); });
  }
  cars.forEach(c => { c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.h; c.m.userData.wheels.forEach(w => { w.rotation.x += c.v * dt * 2.4; }); c.m.userData.wheels[0].rotation.y = c.m.userData.wheels[1].rotation.y = (c.steer || 0) * 0.45; });
  cars.forEach(c => { if (c.kind !== 'me') { const dx = c.x - camera.position.x, dz = c.z - camera.position.z; c.m.userData.label.visible = dx * dx + dz * dz > 18 * 18; } });
  // camera: behind and above my car
  if (mine) {
    const fx = Math.sin(mine.h), fz = Math.cos(mine.h), back = 9 + Math.abs(mine.v) * 0.06;
    camPos.lerp(new THREE.Vector3(mine.x - fx * back, 4.2 + Math.abs(mine.v) * 0.02, mine.z - fz * back), Math.min(1, dt * 6));
    camLook.lerp(new THREE.Vector3(mine.x + fx * 6, 1.2, mine.z + fz * 6), Math.min(1, dt * 10));
    camera.position.copy(camPos); camera.lookAt(camLook);
    if (race.phase === 'lobby') { const a = pt / 6000; camera.position.set(P[0].x + Math.sin(a) * 40, 22, P[0].z + Math.cos(a) * 40); camera.lookAt(P[0]); }
  }
  // HUD
  if (mine) {
    const order = standings(), place = order.indexOf(mine) + 1;
    $('pos').innerHTML = place + '<small>/' + order.length + '</small>';
    $('lap').textContent = mine.fin ? '🏁 Finished' : 'Lap ' + Math.min(race.laps, mine.laps + 1) + '/' + race.laps;
    $('times').innerHTML = (running && !mine.fin ? '⏱ ' + fmt(t - mine.lapStart) + '<br>' : '') + (mine.last ? 'Last ' + fmt(mine.last) + '<br>' : '') + (mine.best ? 'Best ' + fmt(mine.best) : '');
    $('kmh').textContent = Math.round(Math.abs(mine.v) * 3.6 * 1.25);
    $('board').innerHTML = order.slice(0, 8).map((c, i) => '<div' + (c === mine ? ' style="font-weight:800;color:#fde68a"' : '') + '>' + (i + 1) + '. <i style="background:' + c.color + '"></i>' + esc(c.name) + (c.fin ? ' 🏁' : '') + '</div>').join('');
    engine(mine.v);
    if (running) checkDone(t);
    sendMe(t);
  }
  drawMap();
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ start up
function boot(u, myCode) {
  user = u; myName = ((u && u.displayName) || 'Driver').split(' ')[0].slice(0, 12);
  if (!cars.get('me')) { const c = makeCar('me', myName, myColor, 'me'); cars.set('me', c); placeOnGrid(c, 0); }
  if (!isMP) {
    if (!u) WW.useLocal();
    $('roomLabel').textContent = 'Werewolf Racing · solo'; $('cnt').textContent = '1';
    setBots(SOLO_BOTS); startGrid(); lobby(); publish(); setInterval(publish, 30000);
    addEventListener('pagehide', () => { try { WW.clearPlaying(); } catch (e) {} });
    return;
  }
  if (!u) { showOverlay('<h2>🏎️ Sign in to race with friends</h2><div class="muted">Room ' + esc(roomCode) + ' · up to ' + MAXP + ' drivers</div><div style="margin-top:12px"><button data-a="signin">Sign in with Google</button><button class="alt" data-a="solo">Race solo</button></div>'); return; }
  WW.mode = 'cloud'; me = u; isHost = !!myCode && myCode === roomCode;
  const rr = WW.roomRef('race', roomCode);
  $('roomLabel').textContent = 'Werewolf Racing · ' + roomCode;
  rr.child('players').once('value').then(snap => {
    const v = snap.val() || {}, t = now(), others = Object.keys(v).filter(id => id !== u.uid && t - ((v[id] && v[id].t) || 0) < 20000).length;
    if (others >= MAXP) { showOverlay('<h2>This race is full</h2><div class="muted">All ' + MAXP + ' grid spots are taken. Try again in a minute.</div><div style="margin-top:12px"><button data-a="leave">Back to games</button></div>'); return; }
    if (!isHost && !others) { showOverlay('<h2>Nobody is here yet</h2><div class="muted">Race ' + esc(roomCode) + ' is not open. Ask your friend to open Werewolf Racing and host first.</div><div style="margin-top:12px"><button data-a="solo">Race solo</button><button class="alt" data-a="leave">Back</button></div>'); return; }
    roomRef = rr;        // only now do we send our car to the room
    roomRef.child('players/' + u.uid).onDisconnect().remove();
    roomRef.child('players/' + u.uid).set({ n: myName, c: myColor, t: firebase.database.ServerValue.TIMESTAMP }).then(() => {
      if (isHost) roomRef.child('state').transaction(s => { if (!s) return { rid: 0, phase: 'lobby', laps: 3, bots: 0 }; if ((s.phase === 'race' || s.phase === 'count') && now() - (s.start || 0) < 600000 && others) return; s.phase = 'lobby'; s.fin = null; return s; });
      roomRef.child('players').on('value', s => syncRemote(s.val(), false));
      if (!isHost) roomRef.child('bots').on('value', s => syncRemote(s.val(), true));
      roomRef.child('state').on('value', s => onState(s.val()));
      publish();
    });
  }).catch(e => showOverlay('<h2>Could not open the race</h2><div class="muted">' + esc((e && (e.code || e.message)) || 'The game database rules may not be published.') + '</div><div style="margin-top:12px"><button data-a="leave">Back</button></div>'));
  addEventListener('pagehide', () => { if (!roomRef) return; try { roomRef.child('players/' + u.uid).remove(); if (isHost) roomRef.child('bots').remove(); WW.clearPlaying(); } catch (e) {} });
}
WW.onError = m => say(m);
let booted = false;
WW.onReady(async (u, code) => {
  if (booted) return; booted = true;
  if (u) { try { const pc = (await WW.db.ref('users/' + WW.emailKey(u.email) + '/primary_color').once('value')).val(); if (typeof pc === 'string' && /^#[0-9a-f]{6}$/i.test(pc.trim())) myColor = pc.trim(); } catch (e) {} }
  myColor = WW.myColor(myColor);   // the colour picked under 🎨 My color wins
  boot(u, code);
});
requestAnimationFrame(frame);
window.__race = { cars, race, P, N, stepCar, botDrive, controls, act, standings };
