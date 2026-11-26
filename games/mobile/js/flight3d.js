// Werewolf Wings: 3D flight game for desktop and phones (games/mobile/flight.html).
// Fly the Skyrunner, a small prop plane, over Howl Island: take off from Werewolf Field, fly ring courses through
// the mountain passes, carry the mail to Pine Ridge and land it smoothly. Everything runs from local files
// (three.js is vendored in ./three.min.js), so the game also plays offline. Site extras (now-playing status,
// best times on the shared leaderboard) are used only when js/common.js has loaded (window.WW).
// Controls: keyboard + mouse, touch (stick + throttle), or a controller through js/gamepad.js (window.WWPad).
import * as THREE from './three.min.js';

const $ = id => document.getElementById(id);
const WW = window.WW || null, PAD = window.WWPad || null;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const KT = 1.94384, FT = 3.28084;

// ------------------------------------------------------------------ saved settings
const SAVE_KEY = 'ww_flight_v1';
let save = { best: {}, stars: {}, invert: false, sky: 'day', cam: 0, mute: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ------------------------------------------------------------------ deterministic noise
function hash(ix, iz) { let h = (ix * 374761393 + iz * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, z * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
function ridged(x, z) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < 5; i++) { const r = 1 - Math.abs(2 * vnoise(x * f + 31.7 * i, z * f + 11.9 * i) - 1); s += a * r * r; n += a; a *= 0.5; f *= 2.1; } return s / n; }
let seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

// ------------------------------------------------------------------ Howl Island terrain
const ISLAND = 4300, TSIZE = 9600, TSEG = 320;
function rawHeight(x, z) {
  const d = Math.hypot(x, z);
  let h = (fbm(x / 1100, z / 1100, 5) - 0.42) * 300 + 25;                // rolling valley floor (lakes where it dips below 0)
  const band = sstep(1300, 2700, d) * (1 - sstep(3500, 4150, d));        // ring of mountains around the central valley
  h += band * Math.pow(ridged(x / 820, z / 820), 1.6) * 820;
  h += sstep(2400, 3300, d) * (1 - sstep(3600, 4150, d)) * 120;
  const coast = 1 - sstep(ISLAND - 450, ISLAND + 120, d);                // the island ends in the sea
  return lerp(-60, h, coast);
}
// airfields: runway centre, length, width, heading (deg), elevation
function makeField(name, x, z, len, wid, hdg, elev) { const a = hdg * Math.PI / 180; return { name, x, z, len, wid, hdg, elev, fx: Math.sin(a), fz: -Math.cos(a) }; }
const FIELD_A = makeField('Werewolf Field', 0, 0, 1300, 40, 360, 14);
const FIELD_B = (() => { const x = 1500, z = -2150; return makeField('Pine Ridge', x, z, 900, 30, 90, clamp(Math.round(rawHeight(x, z)), 60, 320)); })();
const FIELDS = [FIELD_A, FIELD_B];
function fieldLocal(f, x, z) { const dx = x - f.x, dz = z - f.z; return { u: dx * f.fx + dz * f.fz, w: dx * -f.fz + dz * f.fx }; } // u along runway heading, w to its right
function height(x, z) {
  let h = rawHeight(x, z);
  // Howl Valley: a clear approach corridor south of Werewolf Field down to the sea
  const vt = (1 - sstep(260, 760, Math.abs(x) - Math.max(0, z - 900) * 0.08)) * sstep(150, 800, z);
  if (vt > 0) h = lerp(h, Math.min(h, 18 - sstep(1500, 4200, z) * 30), vt);
  for (const f of FIELDS) {
    const l = fieldLocal(f, x, z);
    const ou = Math.max(0, Math.abs(l.u) - (f.len / 2 + 180)), ow = Math.max(0, Math.abs(l.w) - (f.wid / 2 + 150));
    const t = sstep(0, 420, Math.hypot(ou, ow));
    h = lerp(f.elev, h, t);
  }
  return h;
}
function onRunway(f, x, z, pad) { const l = fieldLocal(f, x, z), p = pad || 0; return Math.abs(l.u) <= f.len / 2 + p && Math.abs(l.w) <= f.wid / 2 + p; }

// ------------------------------------------------------------------ renderer and scene
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 30000);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); sizeHud(); }

const SKIES = {
  day: { top: 0x2f6fc4, hor: 0xbfd9ef, bot: 0x9fb8c9, sun: 0xfff3dc, sunI: 2.6, hemiS: 0xcfe6ff, hemiG: 0x4a5a3a, hemiI: 1.1, sunDir: [0.45, 0.62, -0.35], fog: 0xbcd3e6, exp: 1.05, cloud: 0xffffff },
  sunset: { top: 0x27306b, hor: 0xf3a25c, bot: 0x6b4a5a, sun: 0xffb36b, sunI: 2.3, hemiS: 0xffc9a0, hemiG: 0x3b2c35, hemiI: 0.85, sunDir: [-0.75, 0.16, -0.45], fog: 0xd99a70, exp: 1.0, cloud: 0xffd2b0 }
};
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top,hor,bot,sunDir,sunCol; varying vec3 vD; void main(){ float y=vD.y; vec3 c = y>0.0 ? mix(hor,top,pow(clamp(y,0.0,1.0),0.55)) : mix(hor,bot,clamp(-y*6.0,0.0,1.0)); float s=max(dot(normalize(vD),normalize(sunDir)),0.0); c += sunCol*(pow(s,900.0)*3.0 + pow(s,12.0)*0.25); gl_FragColor=vec4(c,1.0); }'
}));
sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0xbcd3e6, 1800, 9000);
let cloudMat = null;
function applySky() {
  const s = SKIES[save.sky] || SKIES.day;
  skyU.top.value.set(s.top); skyU.hor.value.set(s.hor); skyU.bot.value.set(s.bot); skyU.sunCol.value.set(s.sun);
  skyU.sunDir.value.set(...s.sunDir).normalize();
  hemi.color.set(s.hemiS); hemi.groundColor.set(s.hemiG); hemi.intensity = s.hemiI;
  sun.color.set(s.sun); sun.intensity = s.sunI; scene.fog.color.set(s.fog); renderer.toneMappingExposure = s.exp;
  if (cloudMat) cloudMat.color.set(s.cloud);
}

// terrain mesh with painted vertex colours
const terrain = (() => {
  const g = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEG, TSEG); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xd8c690), grass = new THREE.Color(0x5f8f3c), grass2 = new THREE.Color(0x7da24a), forest = new THREE.Color(0x3d6a2e),
    rock = new THREE.Color(0x7b7468), rock2 = new THREE.Color(0x5d5850), snow = new THREE.Color(0xf4f7fb), seabed = new THREE.Color(0x3f6f7a);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    const sl = Math.hypot(height(x + 12, z) - h, height(x, z + 12) - h) / 12, n = fbm(x / 260, z / 260, 3);
    if (h < 0) c.copy(seabed).lerp(sand, sstep(-40, 0, h));
    else if (h < 7) c.copy(sand);
    else { c.copy(grass).lerp(grass2, sstep(0.35, 0.7, n)); if (n < 0.42 && h < 340) c.lerp(forest, 0.6); }
    if (h > 5) c.lerp(sl > 0.75 ? rock2 : rock, sstep(0.45, 0.8, sl) * 0.9 + sstep(330, 470, h) * 0.6);
    if (h > 470) c.lerp(snow, sstep(470, 560, h) * (1 - sstep(0.9, 1.3, sl) * 0.6));
    const j = (hash(i, 77) - 0.5) * 0.06; col[i * 3] = c.r + j; col[i * 3 + 1] = c.g + j; col[i * 3 + 2] = c.b + j;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); scene.add(m); return m;
})();
const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshPhongMaterial({ color: 0x2b6f96, specular: 0x9fd2ff, shininess: 90, transparent: true, opacity: 0.88 }));
water.rotation.x = -Math.PI / 2; water.position.y = 0.2; scene.add(water);

// runways (painted canvas texture), lights, hangars, tower
function runwayTexture(f) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 2048; const x = cv.getContext('2d');
  x.fillStyle = '#3a3d42'; x.fillRect(0, 0, 256, 2048);
  for (let i = 0; i < 2500; i++) { x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * .06) + ')'; x.fillRect(Math.random() * 256, Math.random() * 2048, 3, 3); }
  x.fillStyle = '#f2f2ee'; x.fillRect(6, 0, 4, 2048); x.fillRect(246, 0, 4, 2048);
  for (let y = 260; y < 1790; y += 70) x.fillRect(124, y, 8, 38);
  for (const end of [0, 1]) {
    x.save(); if (end) { x.translate(256, 2048); x.rotate(Math.PI); }
    for (let k = 0; k < 8; k++) x.fillRect(22 + k * 28, 2048 - 46, 14, 36);
    const n = end ? (f.hdg + 180) % 360 : f.hdg, txt = String(Math.round(n / 10) || 36).padStart(2, '0');
    x.font = 'bold 64px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText(txt, 128, 2048 - 66);
    x.fillRect(44, 2048 - 330, 26, 60); x.fillRect(186, 2048 - 330, 26, 60);   // aiming point blocks
    x.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const lightGeo = new THREE.SphereGeometry(0.4, 6, 4);
const lights = [];
for (const f of FIELDS) {
  const ang = -f.hdg * Math.PI / 180;
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(f.wid, f.len), new THREE.MeshLambertMaterial({ map: runwayTexture(f) }));
  rw.rotation.set(-Math.PI / 2, 0, ang, 'YXZ'); rw.rotation.order = 'YXZ'; rw.rotation.set(-Math.PI / 2, ang, 0);
  rw.position.set(f.x, f.elev + 0.08, f.z); scene.add(rw);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 300), new THREE.MeshLambertMaterial({ color: 0x55585c }));
  apron.rotation.order = 'YXZ'; apron.rotation.set(-Math.PI / 2, ang, 0);
  apron.position.set(f.x - f.fz * (f.wid / 2 + 90), f.elev + 0.06, f.z + f.fx * (f.wid / 2 + 90)); scene.add(apron);
  for (let u = -f.len / 2; u <= f.len / 2 + 1; u += 50) for (const s of [-1, 1]) lights.push([f, u, s * (f.wid / 2 + 2), Math.abs(u) > f.len / 2 - 10 ? (u < 0 ? 0x4ade80 : 0xef4444) : 0xfff2c4]);
  for (let k = 1; k <= 10; k++) for (const s of [-6, 0, 6]) lights.push([f, -f.len / 2 - k * 30, s, 0xfff7d6]);  // approach lights
  // hangar + tower
  const side = f.wid / 2 + 150, base = new THREE.Vector3(f.x - f.fz * side, f.elev, f.z + f.fx * side);
  const hangar = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 40, 18, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0x9aa6b2 }));
  hangar.rotation.order = 'YXZ'; hangar.rotation.set(0, ang, Math.PI / 2); hangar.position.copy(base).add(new THREE.Vector3(f.fx * 60, 0, f.fz * 60)); scene.add(hangar);
  const tower = new THREE.Group();
  tower.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 12), new THREE.MeshLambertMaterial({ color: 0xe5e7eb }))).position.y = 11;
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 4.5, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x0f2c44, emissive: 0x2f6f8f, emissiveIntensity: 0.9, metalness: .2, roughness: .1 })); cab.position.y = 24.5; tower.add(cab);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.5, 8), new THREE.MeshLambertMaterial({ color: 0xf97316 })); roof.position.y = 28; tower.add(roof);
  tower.position.copy(base).add(new THREE.Vector3(-f.fx * 80, 0, -f.fz * 80)); scene.add(tower);
}
(() => {
  const m = new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), lights.length), o = new THREE.Object3D(), c = new THREE.Color();
  lights.forEach((L, i) => { const [f, u, w, col] = L; o.position.set(f.x + f.fx * u - f.fz * w, f.elev + 0.6, f.z + f.fz * u + f.fx * w); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(col).multiplyScalar(1.6)); });
  scene.add(m);
})();

// forests and the town of Howl Harbor
function nearField(x, z, pad) { for (const f of FIELDS) { const l = fieldLocal(f, x, z); if (Math.abs(l.u) < f.len / 2 + pad && Math.abs(l.w) < f.wid / 2 + pad + 120) return true; } return false; }
(() => {
  seed = 99;
  const N = 6500, m = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
  const o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
  for (let tries = 0; tries < N * 8 && k < N; tries++) {
    const x = (rnd() - .5) * 2 * ISLAND, z = (rnd() - .5) * 2 * ISLAND, h = height(x, z);
    if (h < 8 || h > 380 || nearField(x, z, 120)) continue;
    const sl = Math.hypot(height(x + 10, z) - h, height(x, z + 10) - h) / 10;
    if (sl > 0.55 || fbm(x / 260, z / 260, 3) > 0.5) continue;
    const s = 9 + rnd() * 12; o.position.set(x, h - 1, z); o.scale.set(s * 0.32, s, s * 0.32); o.rotation.y = rnd() * 6; o.updateMatrix();
    m.setMatrixAt(k, o.matrix); m.setColorAt(k, c.setHSL(0.27 + rnd() * 0.08, 0.45, 0.17 + rnd() * 0.1)); k++;
  }
  m.count = k; scene.add(m);
  const B = 140, bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), B);
  const rm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), B);
  const wall = [0xf1e6d2, 0xe2e8f0, 0xd6c2a6, 0xbfd1e3, 0xf4d7b5], roof = [0xb4432c, 0x6b3a2a, 0x37475a, 0x8a3b2f];
  let b = 0;
  for (let t = 0; t < 2000 && b < B; t++) {
    const x = 820 + (rnd() - .5) * 700, z = 350 + (rnd() - .5) * 900, h = height(x, z);
    if (h < 3 || nearField(x, z, 60)) continue;
    if (Math.hypot(height(x + 8, z) - h, height(x, z + 8) - h) / 8 > 0.25) continue;
    const w = 9 + rnd() * 10, d = 9 + rnd() * 12, ht = 6 + rnd() * (rnd() < .12 ? 30 : 9), ry = Math.round(rnd() * 3) * Math.PI / 2 + 0.3;
    o.position.set(x, h - 0.5, z); o.rotation.set(0, ry, 0); o.scale.set(w, ht, d); o.updateMatrix(); bm.setMatrixAt(b, o.matrix); bm.setColorAt(b, c.set(wall[b % wall.length]));
    o.position.y = h - 0.5 + ht; o.rotation.y = ry + Math.PI / 4; o.scale.set(Math.max(w, d) * 0.95, 4 + rnd() * 3, Math.max(w, d) * 0.95); o.updateMatrix(); rm.setMatrixAt(b, o.matrix); rm.setColorAt(b, c.set(roof[b % roof.length])); b++;
  }
  bm.count = rm.count = b; scene.add(bm, rm);
})();

// clouds
(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, fog: true });
  seed = 4242;
  for (let i = 0; i < 70; i++) {
    const cx = (rnd() - .5) * 9000, cz = (rnd() - .5) * 9000, cy = 750 + rnd() * 450;
    for (let j = 0; j < 6; j++) { const s = new THREE.Sprite(cloudMat); const sc = 220 + rnd() * 260; s.scale.set(sc, sc * 0.55, 1); s.position.set(cx + (rnd() - .5) * 380, cy + (rnd() - .5) * 60, cz + (rnd() - .5) * 260); scene.add(s); }
  }
})();
applySky();

// ------------------------------------------------------------------ the Skyrunner
const plane = new THREE.Group(); scene.add(plane);
const parts = {};
(() => {
  const blue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: .45, metalness: .25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: .5, metalness: .15 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: .45, metalness: .2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: .7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: .3, metalness: .8 });
  const add = (geo, mat, x, y, z, p) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (p || plane).add(m); return m; };
  const cyl = (r1, r2, l, s) => new THREE.CylinderGeometry(r1, r2, l, s || 18).rotateX(Math.PI / 2);   // along Z, r1 at -Z end
  add(cyl(0.6, 0.66, 1.3), blue, 0, 0.1, -3.2);          // cowling
  add(cyl(0.66, 0.7, 3.4), white, 0, 0.1, -0.85);        // cabin section
  add(cyl(0.7, 0.18, 3.6), white, 0, 0.18, 2.6);         // tail cone
  add(cyl(0.71, 0.5, 0.3), orange, 0, 0.12, -2.35);      // stripe
  add(new THREE.BoxGeometry(0.08, 0.3, 4.8), blue, 0.68, 0.0, 0.6); add(new THREE.BoxGeometry(0.08, 0.3, 4.8), blue, -0.68, 0.0, 0.6);
  const spinner = add(new THREE.ConeGeometry(0.3, 0.7, 16).rotateX(-Math.PI / 2), orange, 0, 0.1, -4.2);
  parts.prop = new THREE.Group(); parts.prop.position.set(0, 0.1, -3.95); plane.add(parts.prop);
  for (let i = 0; i < 2; i++) { const b = add(new THREE.BoxGeometry(0.16, 1.15, 0.05), dark, 0, i ? -0.62 : 0.62, 0, parts.prop); b.rotation.y = i ? 0.25 : -0.25; add(new THREE.BoxGeometry(0.17, 0.14, 0.06), orange, 0, i ? -1.15 : 1.15, 0, parts.prop); }
  parts.disc = add(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }), 0, 0, -0.02, parts.prop);
  // wings with a little dihedral
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(0, -0.35, -0.7); w.rotation.z = s * 0.05; plane.add(w);
    add(new THREE.BoxGeometry(5.4, 0.2, 1.7), white, s * 3.1, 0, 0, w);
    add(new THREE.BoxGeometry(0.5, 0.22, 1.72), orange, s * 5.6, 0, 0, w);
    add(new THREE.BoxGeometry(2.4, 0.21, 0.3), blue, s * 2.4, 0.005, -0.5, w);
    const ail = new THREE.Group(); ail.position.set(s * 4.1, 0, 0.85); w.add(ail); add(new THREE.BoxGeometry(2.0, 0.1, 0.42), blue, 0, 0, 0.21, ail);
    const flap = new THREE.Group(); flap.position.set(s * 1.85, 0, 0.85); w.add(flap); add(new THREE.BoxGeometry(2.3, 0.1, 0.42), white, 0, 0, 0.21, flap);
    parts[s < 0 ? 'ailL' : 'ailR'] = ail; parts[s < 0 ? 'flapL' : 'flapR'] = flap;
    const nav = add(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff2d2d : 0x2dff6a }), s * 5.86, 0.02, -0.2, w);
    parts[s < 0 ? 'navL' : 'navR'] = nav;
  }
  add(new THREE.BoxGeometry(3.4, 0.1, 0.8), white, 0, 0.3, 3.9);
  parts.elev = new THREE.Group(); parts.elev.position.set(0, 0.3, 4.3); plane.add(parts.elev); add(new THREE.BoxGeometry(3.4, 0.08, 0.45), blue, 0, 0, 0.22, parts.elev);
  const fin = add(new THREE.BoxGeometry(0.12, 1.5, 1.0), blue, 0, 1.05, 3.85); fin.rotation.x = -0.25;
  parts.rud = new THREE.Group(); parts.rud.position.set(0, 1.0, 4.4); plane.add(parts.rud); add(new THREE.BoxGeometry(0.1, 1.4, 0.45), orange, 0, 0, 0.22, parts.rud);
  parts.strobe = add(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 1.85, 4.1);
  parts.canopy = add(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: .05, metalness: .6, transparent: true, opacity: .45 }), 0, 0.62, -0.7);
  parts.canopy.scale.set(0.6, 0.5, 1.25);
  parts.head = add(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3b2f2a }), 0, 0.82, -0.45);
  // instrument panel (lit; the same canvas as the on-screen gauges)
  parts.shield = add(new THREE.BoxGeometry(1.12, 0.05, 0.24), dark, 0, 1.19, -1.3);
  parts.panel = add(new THREE.PlaneGeometry(1.0, 0.375), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 0, 0.98, -1.2);
  parts.panel.rotation.x = -0.2;
  // landing gear (tricycle)
  parts.gear = new THREE.Group(); plane.add(parts.gear);
  const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1.45, -0.5], [1.45, -0.5], [0, -3.0]]) {
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), metal, x * 0.9, -0.75, z, parts.gear);
    add(wheel, dark, x, -1.08, z, parts.gear);
  }
  plane.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
})();
const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.scale.set(6, 4, 1); scene.add(shadow);

// ------------------------------------------------------------------ instruments (lit panel), drawn on one canvas
const inst = document.createElement('canvas'); inst.width = 1024; inst.height = 384;
const ictx = inst.getContext('2d');
const instTex = new THREE.CanvasTexture(inst); instTex.colorSpace = THREE.SRGBColorSpace;
parts.panel.material.map = instTex; parts.panel.material.needsUpdate = true;
$('instr').appendChild(inst);
function drawInstruments(s) {
  const x = ictx, W = 1024, H = 384;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2f37'); g.addColorStop(1, '#14171c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const R = 112, cy = 200, cx = [128, 384, 640, 896], lit = '#ffe7b0', glow = '#ffb84d';
  const ring = (c) => {
    x.fillStyle = '#0b0d10'; x.beginPath(); x.arc(c, cy, R + 14, 0, 7); x.fill();
    x.strokeStyle = '#5a616b'; x.lineWidth = 6; x.stroke();
    const fg = x.createRadialGradient(c, cy - 40, 10, c, cy, R); fg.addColorStop(0, '#22262c'); fg.addColorStop(1, '#0d0f12'); x.fillStyle = fg; x.beginPath(); x.arc(c, cy, R, 0, 7); x.fill();
  };
  const ticks = (c, a0, a1, n, major, labels) => {
    x.save(); x.shadowColor = glow; x.shadowBlur = 10; x.strokeStyle = lit; x.fillStyle = lit;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, big = i % major === 0; x.lineWidth = big ? 5 : 2.5; x.beginPath(); x.moveTo(c + Math.cos(a) * (R - (big ? 26 : 14)), cy + Math.sin(a) * (R - (big ? 26 : 14))); x.lineTo(c + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); x.stroke(); if (big && labels) { x.font = 'bold 22px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(labels(i), c + Math.cos(a) * (R - 42), cy + Math.sin(a) * (R - 42)); } }
    x.restore();
  };
  const needle = (c, a, len, w, col) => { x.save(); x.shadowColor = glow; x.shadowBlur = 12; x.fillStyle = col || '#fff6dc'; x.translate(c, cy); x.rotate(a); x.beginPath(); x.moveTo(-14, -w); x.lineTo(len, 0); x.lineTo(-14, w); x.closePath(); x.fill(); x.restore(); x.fillStyle = '#3a3f47'; x.beginPath(); x.arc(c, cy, 12, 0, 7); x.fill(); };
  const label = (c, t, y) => { x.save(); x.shadowColor = glow; x.shadowBlur = 8; x.fillStyle = lit; x.font = 'bold 24px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText(t, c, y); x.restore(); };
  // 1 airspeed (0-200 kt over 300 degrees)
  ring(cx[0]); const A0 = -Math.PI * 1.25, A1 = Math.PI * 0.25, asA = v => A0 + (A1 - A0) * clamp(v, 0, 200) / 200;
  x.lineWidth = 12; x.strokeStyle = '#22c55e'; x.beginPath(); x.arc(cx[0], cy, R - 10, asA(60), asA(150)); x.stroke();
  x.strokeStyle = '#eab308'; x.beginPath(); x.arc(cx[0], cy, R - 10, asA(150), asA(180)); x.stroke();
  x.strokeStyle = '#f8fafc'; x.lineWidth = 6; x.beginPath(); x.arc(cx[0], cy, R - 22, asA(48), asA(100)); x.stroke();
  ticks(cx[0], A0, A1, 20, 4, i => i * 10); label(cx[0], 'KT', cy + 40); needle(cx[0], asA(s.kt), R - 22, 9);
  // 2 attitude
  ring(cx[1]); x.save(); x.beginPath(); x.arc(cx[1], cy, R - 4, 0, 7); x.clip(); x.translate(cx[1], cy); x.rotate(-s.roll);
  const py = clamp(s.pitch * 180 / Math.PI, -40, 40) * 4;
  x.fillStyle = '#2a7fd4'; x.fillRect(-300, -600 + py, 600, 600); x.fillStyle = '#8a5a2b'; x.fillRect(-300, py, 600, 600);
  x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-300, py); x.lineTo(300, py); x.stroke();
  for (let d = -30; d <= 30; d += 10) { if (!d) continue; const yy = py - d * 4, w = d % 20 ? 30 : 55; x.beginPath(); x.moveTo(-w, yy); x.lineTo(w, yy); x.stroke(); }
  x.restore(); x.save(); x.shadowColor = glow; x.shadowBlur = 12; x.strokeStyle = '#ff9f1c'; x.lineWidth = 9; x.beginPath(); x.moveTo(cx[1] - 90, cy); x.lineTo(cx[1] - 30, cy); x.lineTo(cx[1] - 15, cy + 16); x.moveTo(cx[1] + 90, cy); x.lineTo(cx[1] + 30, cy); x.lineTo(cx[1] + 15, cy + 16); x.stroke();
  x.fillStyle = '#ff9f1c'; x.beginPath(); x.arc(cx[1], cy, 7, 0, 7); x.fill(); x.restore();
  // 3 altimeter
  ring(cx[2]); ticks(cx[2], -Math.PI / 2, Math.PI * 1.5, 50, 5, i => i < 50 ? i / 5 : ''); label(cx[2], 'FT', cy - 30);
  x.save(); x.fillStyle = '#000'; x.fillRect(cx[2] - 50, cy + 34, 100, 34); x.shadowColor = glow; x.shadowBlur = 8; x.fillStyle = lit; x.font = 'bold 26px ui-monospace,monospace'; x.textAlign = 'center'; x.fillText(String(Math.max(0, Math.round(s.ft))).padStart(5, '0'), cx[2], cy + 60); x.restore();
  needle(cx[2], -Math.PI / 2 + (s.ft / 10000) * Math.PI * 2, R - 70, 12, '#d7dde6'); needle(cx[2], -Math.PI / 2 + (s.ft % 1000) / 1000 * Math.PI * 2, R - 18, 7);
  // 4 heading
  ring(cx[3]); x.save(); x.translate(cx[3], cy); x.rotate(-s.hdg * Math.PI / 180); x.shadowColor = glow; x.shadowBlur = 8; x.strokeStyle = lit; x.fillStyle = lit;
  for (let d = 0; d < 360; d += 10) { const a = d * Math.PI / 180 - Math.PI / 2, big = d % 30 === 0; x.lineWidth = big ? 4 : 2; x.beginPath(); x.moveTo(Math.cos(a) * (R - (big ? 24 : 14)), Math.sin(a) * (R - (big ? 24 : 14))); x.lineTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4)); x.stroke();
    if (big) { x.save(); x.rotate(a + Math.PI / 2); x.font = 'bold 22px system-ui'; x.textAlign = 'center'; x.fillStyle = d === 0 ? '#ff9f1c' : lit; x.fillText({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d / 10), 0, -R + 40); x.restore(); } }
  x.restore(); x.save(); x.shadowColor = glow; x.shadowBlur = 12; x.fillStyle = '#ff9f1c'; x.beginPath(); x.moveTo(cx[3], cy - 50); x.lineTo(cx[3] + 34, cy + 22); x.lineTo(cx[3] + 6, cy + 10); x.lineTo(cx[3], cy + 44); x.lineTo(cx[3] - 6, cy + 10); x.lineTo(cx[3] - 34, cy + 22); x.closePath(); x.fill(); x.restore();
  label(cx[3], String(Math.round(s.hdg) % 360).padStart(3, '0') + '°', cy + 138);
  // annunciators
  x.font = 'bold 22px system-ui'; x.textAlign = 'left';
  const ann = [['GEAR', s.gear ? '#22c55e' : '#334155'], ['FLAPS ' + s.flapsTxt, s.flaps ? '#38bdf8' : '#334155'], ['BRAKE', s.brk ? '#ef4444' : '#334155'], ['STALL', s.stall ? '#ef4444' : '#334155']];
  ann.forEach((a, i) => { x.fillStyle = a[1]; x.fillRect(8 + i * 254, 4, 236, 28); x.fillStyle = '#0b0d10'; x.fillText(a[0], 18 + i * 254, 26); });
  instTex.needsUpdate = true;
}

// ------------------------------------------------------------------ rings and missions
const ringGeo = new THREE.TorusGeometry(24, 1.8, 10, 48);
const ringMats = { next: new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 1.6 }), later: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.9, transparent: true, opacity: 0.75 }), done: new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.18 }) };
const ringGroup = new THREE.Group(); scene.add(ringGroup);
const R_RADIUS = 24;
function circuitRings() {
  const e = FIELD_A.elev;
  const pts = [[0, e + 90, -1200], [-450, e + 230, -1900], [-1250, e + 300, -1100], [-1350, e + 260, 500], [-800, e + 190, 1700], [0, e + 110, 2300]];
  return pts.map(p => new THREE.Vector3(p[0], Math.max(p[1], height(p[0], p[2]) + 70), p[2]));
}
function canyonRings() {
  const out = [];
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI / 2 + k / 16 * Math.PI * 2 + 0.15;
    let best = null, bh = Infinity;
    for (let r = 1600; r <= 3300; r += 50) { const x = Math.cos(a) * r, z = Math.sin(a) * r, h = height(x, z); if (h < bh) { bh = h; best = [x, z]; } }
    out.push(new THREE.Vector3(best[0], Math.max(bh, 0) + 85, best[1]));
  }
  return out;
}
const MODES = {
  first: { name: '🛫 First Flight', desc: 'Take off from Werewolf Field, fly the six-ring circuit, then land back on runway 36.', start: 'runway', rings: circuitRings, land: FIELD_A },
  rings: { name: '💍 Canyon Ring Run', desc: '16 rings through the mountain passes around Howl Island. Fastest time wins.', start: 'air', rings: canyonRings, timed: true },
  landing: { name: '🛬 Landing Challenge', desc: 'You are on final approach to runway 36. Touch down gently on the centre line and stop on the runway.', start: 'approach', land: FIELD_A },
  mail: { name: '📦 Mail Run', desc: 'Carry the mail from Werewolf Field over the ridge to the Pine Ridge strip (runway 09) and land there.', start: 'runway', land: FIELD_B },
  free: { name: '🌄 Free Flight', desc: 'No goals. Explore Howl Island, the mountains, the lakes and Howl Harbor.', start: 'runway' }
};
let mission = null;
function buildRings(list) {
  ringGroup.clear();
  return list.map((p, i) => {
    const nxt = list[i + 1] || (mission && mission.land ? new THREE.Vector3(mission.land.x, p.y, mission.land.z) : null), prv = list[i - 1];
    const dir = nxt ? nxt.clone().sub(p) : p.clone().sub(prv); dir.y *= 0.3; dir.normalize();
    const m = new THREE.Mesh(ringGeo, ringMats.later); m.position.copy(p); m.lookAt(p.clone().add(dir)); ringGroup.add(m);
    return { pos: p, n: dir, mesh: m, done: false };
  });
}

// ------------------------------------------------------------------ flight state and model
const S = {
  p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(),
  thr: 0, flaps: 0, gear: true, brk: false, ground: true, crashed: false, stall: false, g: 1, prop: 0, td: null, sinceTouch: 0
};
const GEAR_H = 1.4;
const tmpE = new THREE.Euler(0, 0, 0, 'YXZ'), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), Q1 = new THREE.Quaternion(), Qi = new THREE.Quaternion();
function setAttitude(hdgDeg, pitch, roll) { tmpE.set(pitch, -hdgDeg * Math.PI / 180, -roll, 'YXZ'); S.q.setFromEuler(tmpE); }
function attitude() { tmpE.setFromQuaternion(S.q, 'YXZ'); let hdg = (-tmpE.y * 180 / Math.PI) % 360; if (hdg < 0) hdg += 360; return { hdg, pitch: tmpE.x, roll: -tmpE.z }; }
const fwd = () => V1.set(0, 0, -1).applyQuaternion(S.q);

function placeStart(kind) {
  S.w.set(0, 0, 0); S.crashed = false; S.stall = false; S.brk = false; S.td = null; S.gear = true; S.sinceTouch = 99;
  const f = FIELD_A;
  if (kind === 'runway') {
    S.p.set(f.x - f.fx * (f.len / 2 - 40), f.elev + GEAR_H, f.z - f.fz * (f.len / 2 - 40)); S.v.set(0, 0, 0); setAttitude(f.hdg, 0, 0);
    S.thr = 0; S.flaps = 1; S.ground = true;
  } else if (kind === 'approach') {
    const d = 2400; S.p.set(f.x - f.fx * (f.len / 2 + d), f.elev + d * Math.tan(3 * Math.PI / 180) + 10, f.z - f.fz * (f.len / 2 + d));
    setAttitude(f.hdg, -0.02, 0); S.v.set(f.fx * 48, -2.5, f.fz * 48); S.thr = 0.2; S.flaps = 2; S.ground = false;
  } else {
    const r0 = mission.ringList[0].pos, dir = mission.ringList[0].n;
    S.p.copy(r0).addScaledVector(dir, -550); S.p.y = Math.max(S.p.y, height(S.p.x, S.p.z) + 120);
    const hdg = (Math.atan2(dir.x, -dir.z) * 180 / Math.PI + 360) % 360; setAttitude(hdg, 0, 0);
    S.v.copy(dir).setY(0).normalize().multiplyScalar(62); S.thr = 0.75; S.flaps = 0; S.gear = false; S.ground = false;
  }
}

function crash(why) {
  if (S.crashed) return;
  S.crashed = true; S.thr = 0; boom(S.p); sfx('crash'); PAD && PAD.rumble && PAD.rumble(1, 1, 600);
  plane.visible = false; mission.state = 'crashed';
  setTimeout(() => showResult('💥 ' + why, 'The Skyrunner is a write-off. Shake it off and try again.', 0), 1400);
}

function step(dt, inp) {
  if (S.crashed) return;
  const speed = S.v.length();
  Qi.copy(S.q).invert();
  const vb = V2.copy(S.v).applyQuaternion(Qi);                      // velocity in body axes (forward is -Z)
  const fwdSpd = Math.max(0.01, -vb.z);
  const aoa = speed > 2 ? Math.atan2(-vb.y, fwdSpd) : 0;
  const beta = speed > 2 ? Math.atan2(vb.x, fwdSpd) : 0;
  const eff = clamp(speed / 42, 0.12, 1.25);
  // rotation rates: smoothed toward the stick, plus weathervane stability
  const tp = inp.pitch * 1.0 * eff, tr = inp.roll * 2.4 * eff, ty = inp.yaw * 0.55 * eff;
  const k = 1 - Math.exp(-dt * 5);
  S.w.x = lerp(S.w.x, tp, k); S.w.z = lerp(S.w.z, -tr, k); S.w.y = lerp(S.w.y, -ty, k);
  const wx = S.w.x - aoa * 1.3 * eff, wy = S.w.y - beta * 2.2 * eff, wz = S.w.z;
  const ang = Math.hypot(wx, wy, wz) * dt;
  if (ang > 1e-6) { Q1.setFromAxisAngle(V3.set(wx, wy, wz).normalize(), ang); S.q.multiply(Q1).normalize(); }
  // forces (per unit mass)
  const f = fwd().clone(), up = V3.set(0, 1, 0).applyQuaternion(S.q).clone(), right = new THREE.Vector3(1, 0, 0).applyQuaternion(S.q);
  const acc = new THREE.Vector3(0, -9.81, 0);
  const thrust = 8.5 * S.thr * (1.15 - 0.0047 * speed); acc.addScaledVector(f, thrust);
  const flapF = S.flaps * 0.5, stallA = 0.28 - flapF * 0.04;
  let cl = 0.32 + aoa * 5.4 + flapF * 0.4;
  S.stall = !S.ground && aoa > stallA && speed > 5;
  if (aoa > stallA) cl = Math.max(0.2, (0.32 + stallA * 5.4 + flapF * 0.4) - (aoa - stallA) * 6);
  cl = clamp(cl, -1.2, 2.2);
  if (speed > 1) {
    const vh = V2.copy(S.v).divideScalar(speed);
    const liftDir = up.clone().addScaledVector(vh, -up.dot(vh)).normalize();
    acc.addScaledVector(liftDir, cl * speed * speed * 0.0094);
    const cd = 0.00105 + (S.gear ? 0.00035 : 0) + flapF * 0.0006 + 0.0011 * cl * cl * 0.3;
    acc.addScaledVector(vh, -cd * speed * speed);
    acc.addScaledVector(right, -S.v.dot(right) * 1.2);               // side slip damping
  }
  if (S.stall) { S.q.multiply(Q1.setFromAxisAngle(V3.set(1, 0, 0), -0.35 * dt)); S.w.z += (Math.random() - .5) * 0.6 * dt; }
  S.g = acc.clone().add(new THREE.Vector3(0, 9.81, 0)).dot(up) / 9.81;
  S.v.addScaledVector(acc, dt);
  const prev = S.p.clone();
  S.p.addScaledVector(S.v, dt);
  // ground and water
  const gh = height(S.p.x, S.p.z), water = gh < 0.2;
  if (S.p.y - GEAR_H <= Math.max(gh, 0.2)) {
    const att = attitude();
    if (water) return crash('Splashdown');
    if (!S.ground) {
      const vs = S.v.y; S.sinceTouch = 0;
      const field = FIELDS.find(fl => onRunway(fl, S.p.x, S.p.z, 25));
      const sl = Math.hypot(height(S.p.x + 6, S.p.z) - gh, height(S.p.x, S.p.z + 6) - gh) / 6;
      if (!S.gear) return crash('Belly landing');
      if (vs < -5.5 || Math.abs(att.roll) > 0.4 || att.pitch < -0.15 || att.pitch > 0.4) return crash('Hard impact');
      if (!field && (sl > 0.22 || speed > 55)) return crash('Rough-field crash');
      if (!S.td) S.td = { vs, field, x: S.p.x, z: S.p.z, w: field ? Math.abs(fieldLocal(field, S.p.x, S.p.z).w) : 99 };
      if (vs < -2.2) { sfx('thump'); shake = 0.5; }
      else sfx('chirp');
    }
    S.ground = true;
    S.p.y = gh + GEAR_H; if (S.v.y < 0) S.v.y = 0;
    // keep the wheels on the ground: level the wings, limit pitch, grip sideways, roll and brake
    const p2 = clamp(att.pitch, -0.03, 0.22), r2 = lerp(att.roll, 0, 1 - Math.exp(-dt * 8));
    const hdg = att.hdg + (inp.yaw + inp.roll * 0.5) * 32 * dt * clamp(speed / 12, 0, 1) * (speed > 0.5 ? 1 : 0);
    setAttitude(hdg, p2, r2);
    const fh = fwd().clone().setY(0).normalize();
    const along = S.v.dot(fh), vy = S.v.y;
    let na = along - Math.sign(along) * Math.min(Math.abs(along), (0.35 + (S.brk ? 6 : 0)) * dt);
    S.v.copy(fh).multiplyScalar(na); S.v.y = vy;
  } else if (S.ground && S.p.y - GEAR_H > gh + 0.3) {
    S.ground = false;
  }
  if (S.ground && S.p.y - GEAR_H > gh + 0.05 && S.v.y > 0.4) S.ground = false;
  S.sinceTouch += dt;
  // ring passes
  if (mission && mission.ringList && mission.state === 'fly') {
    const r = mission.ringList[mission.next];
    if (r) {
      const d0 = V2.copy(prev).sub(r.pos).dot(r.n), d1 = V3.copy(S.p).sub(r.pos).dot(r.n);
      if (d0 < 0 && d1 >= 0) {
        const t = d0 / (d0 - d1), hit = prev.clone().lerp(S.p, t);
        if (hit.distanceTo(r.pos) <= R_RADIUS + 2) ringPassed();
      }
    }
  }
}

// ------------------------------------------------------------------ explosion / smoke particles
const particles = [];
const pGeo = new THREE.SphereGeometry(1, 8, 6);
function boom(at) {
  for (let i = 0; i < 70; i++) {
    const fire = i < 40, m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: fire ? (Math.random() < .5 ? 0xffa21a : 0xff4d0a) : 0x3a3a3a, transparent: true, opacity: 1, depthWrite: false }));
    m.position.copy(at); scene.add(m);
    particles.push({ m, v: new THREE.Vector3((Math.random() - .5) * 30, Math.random() * 25 + (fire ? 5 : 2), (Math.random() - .5) * 30), life: fire ? 1.2 + Math.random() : 3 + Math.random() * 2, max: 0, s: fire ? 2 + Math.random() * 3 : 4 + Math.random() * 5, fire });
  }
  particles.forEach(p => p.max = p.max || p.life);
}
function updParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); continue; }
    p.v.multiplyScalar(1 - dt * 1.5); if (!p.fire) p.v.y += 3 * dt; p.m.position.addScaledVector(p.v, dt);
    const t = p.life / p.max; p.m.scale.setScalar(p.s * (p.fire ? 0.6 + (1 - t) * 1.6 : 0.5 + (1 - t) * 2.5)); p.m.material.opacity = t * (p.fire ? 1 : .7);
  }
}

// ------------------------------------------------------------------ sound (synthesised)
let AC = null, eng = null;
function audioOn() {
  if (AC || save.mute) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.value = 0;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(AC.destination); o1.start(); o2.start();
    const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = AC.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6; const wg = AC.createGain(); wg.gain.value = 0;
    ns.connect(bp); bp.connect(wg); wg.connect(AC.destination); ns.start();
    eng = { o1, o2, lp, g, wg };
  } catch (e) { AC = null; }
}
function updAudio() {
  if (!eng) return;
  const t = AC.currentTime, on = !save.mute && !S.crashed && !paused, spd = S.v.length();
  const f = 38 + S.thr * 70 + spd * 0.35;
  eng.o1.frequency.setTargetAtTime(f, t, 0.08); eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08); eng.lp.frequency.setTargetAtTime(300 + S.thr * 900, t, 0.1);
  eng.g.gain.setTargetAtTime(on ? 0.035 + S.thr * 0.06 : 0, t, 0.1);
  eng.wg.gain.setTargetAtTime(on ? Math.min(0.12, spd * spd * 0.000018) : 0, t, 0.15);
}
function sfx(kind) {
  if (!AC || save.mute) return;
  const t = AC.currentTime, tone = (fr, at, dur, type, vol) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.value = fr; g.gain.setValueAtTime(vol || 0.15, t + at); g.gain.exponentialRampToValueAtTime(0.001, t + at + dur); o.connect(g); g.connect(AC.destination); o.start(t + at); o.stop(t + at + dur + 0.05); };
  if (kind === 'ring') { tone(880, 0, .18); tone(1320, .08, .25); }
  else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .35, 'triangle', .18)); }
  else if (kind === 'stall') tone(420, 0, .12, 'square', .08);
  else if (kind === 'warn') { tone(700, 0, .1, 'square', .07); tone(700, .16, .1, 'square', .07); }
  else if (kind === 'chirp') tone(240, 0, .12, 'triangle', .1);
  else if (kind === 'thump') tone(70, 0, .3, 'sine', .4);
  else if (kind === 'crash') { tone(60, 0, 1.2, 'sawtooth', .45); tone(110, 0, .6, 'square', .25); }
}

// ------------------------------------------------------------------ input
const keys = {};
let paused = true, camMode = save.cam | 0, shake = 0;
const mouse = { down: false, sx: 0, sy: 0, x: 0, y: 0, look: false, lx: 0, ly: 0, yaw: 0, pitch: 0 };
const touch = { id: null, ox: 0, oy: 0, x: 0, y: 0, thrId: null };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true; audioOn();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (paused) return;
  if (e.code === 'KeyC') cycleCam();
  if (e.code === 'KeyG') toggleGear();
  if (e.code === 'KeyF') cycleFlaps();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR') startMission(mission.key);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  audioOn();
  if (e.button === 2) { mouse.look = true; mouse.lx = e.clientX; mouse.ly = e.clientY; return; }
  mouse.down = true; mouse.sx = mouse.x = e.clientX; mouse.sy = mouse.y = e.clientY;
});
addEventListener('mousemove', e => {
  if (mouse.down) { mouse.x = e.clientX; mouse.y = e.clientY; }
  if (mouse.look) { mouse.yaw -= (e.clientX - mouse.lx) * 0.006; mouse.pitch = clamp(mouse.pitch - (e.clientY - mouse.ly) * 0.004, -0.9, 0.9); mouse.lx = e.clientX; mouse.ly = e.clientY; }
});
addEventListener('mouseup', e => { if (e.button === 2) mouse.look = false; else mouse.down = false; });
canvas.addEventListener('wheel', e => { e.preventDefault(); S.thr = clamp(S.thr - Math.sign(e.deltaY) * 0.05, 0, 1); }, { passive: false });
// touch: left half = stick, right throttle bar
const tStick = $('tStick'), tKnob = tStick.querySelector('i'), tThr = $('tThr'), tThrFill = tThr.querySelector('i');
canvas.addEventListener('touchstart', e => {
  audioOn();
  for (const t of e.changedTouches) if (t.clientX < innerWidth * 0.6 && touch.id === null) { touch.id = t.identifier; touch.ox = touch.x = t.clientX; touch.oy = touch.y = t.clientY; tStick.style.display = 'block'; tStick.style.left = (t.clientX - 60) + 'px'; tStick.style.top = (t.clientY - 60) + 'px'; }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === touch.id) { touch.x = t.clientX; touch.y = t.clientY; } e.preventDefault(); }, { passive: false });
const tEnd = e => { for (const t of e.changedTouches) if (t.identifier === touch.id) { touch.id = null; tStick.style.display = 'none'; } };
canvas.addEventListener('touchend', tEnd); canvas.addEventListener('touchcancel', tEnd);
function thrTouch(e) { e.preventDefault(); const r = tThr.getBoundingClientRect(), t = e.touches[0] || e.changedTouches[0]; S.thr = clamp(1 - (t.clientY - r.top) / r.height, 0, 1); audioOn(); }
tThr.addEventListener('touchstart', thrTouch, { passive: false }); tThr.addEventListener('touchmove', thrTouch, { passive: false });
$('tCam').onclick = () => cycleCam(); $('tGear').onclick = () => toggleGear(); $('tFlap').onclick = () => cycleFlaps();
const tBrk = $('tBrk'); tBrk.addEventListener('touchstart', e => { e.preventDefault(); touch.brk = true; }, { passive: false }); tBrk.addEventListener('touchend', () => touch.brk = false);
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

function readInput(dt) {
  let pitch = 0, roll = 0, yaw = 0, brk = false;
  const inv = save.invert ? -1 : 1;
  if (keys.ArrowUp || keys.KeyW) pitch -= 1 * inv;
  if (keys.ArrowDown || keys.KeyS) pitch += 1 * inv;
  if (keys.ArrowLeft || keys.KeyA) roll -= 1;
  if (keys.ArrowRight || keys.KeyD) roll += 1;
  if (keys.KeyQ) yaw -= 1; if (keys.KeyE) yaw += 1;
  if (keys.ShiftLeft || keys.ShiftRight || keys.Equal || keys.NumpadAdd) S.thr = clamp(S.thr + dt * 0.5, 0, 1);
  if (keys.ControlLeft || keys.ControlRight || keys.Minus || keys.NumpadSubtract) S.thr = clamp(S.thr - dt * 0.5, 0, 1);
  if (keys.KeyB || keys.Space) brk = true;
  for (let n = 0; n <= 9; n++) if (keys['Digit' + n]) S.thr = n === 0 ? 1 : n / 10;
  if (mouse.down) { pitch += clamp((mouse.y - mouse.sy) / 140, -1, 1) * inv; roll += clamp((mouse.x - mouse.sx) / 140, -1, 1); }
  if (touch.id !== null) {
    const dx = clamp((touch.x - touch.ox) / 60, -1, 1), dy = clamp((touch.y - touch.oy) / 60, -1, 1);
    pitch += dy * inv; roll += dx; tKnob.style.transform = 'translate(' + dx * 40 + 'px,' + dy * 40 + 'px)';
  }
  if (touch.brk) brk = true;
  const p = PAD && PAD.state && PAD.state();
  if (p) {
    pitch += p.ly * inv; roll += p.lx; yaw += (p.held('r1') ? 1 : 0) - (p.held('l1') ? 1 : 0) + p.rx * 0.8;
    S.thr = clamp(S.thr + (p.r2 - p.l2) * dt * 0.6, 0, 1);
    if (p.held('cross')) brk = true;
  }
  S.brk = brk;
  return { pitch: clamp(pitch, -1, 1), roll: clamp(roll, -1, 1), yaw: clamp(yaw, -1, 1) };
}
if (PAD && PAD.on) PAD.on('press', i => {
  if (paused) { if (i === 0 || i === 9) { const b = document.querySelector('#ovBox button'); if (b) b.click(); } return; }
  if (i === 3) cycleCam(); else if (i === 2) toggleGear(); else if (i === 1) cycleFlaps(); else if (i === 9) togglePause();
});
function cycleCam() { camMode = (camMode + 1) % 3; save.cam = camMode; persist(); say(['📷 Chase view', '📷 Cockpit view', '📷 Wide chase'][camMode]); mouse.yaw = mouse.pitch = 0; }
function toggleGear() { if (S.ground) { say('Gear stays down on the ground'); return; } S.gear = !S.gear; say(S.gear ? '⚙️ Gear down' : '⚙️ Gear up'); }
function cycleFlaps() { S.flaps = (S.flaps + 1) % 3; say('Flaps ' + ['up', 'half', 'full'][S.flaps]); }
function toggleMute() { save.mute = !save.mute; persist(); $('muteBtn').textContent = save.mute ? '🔇' : '🔊'; if (!save.mute) audioOn(); say(save.mute ? 'Sound off' : 'Sound on'); }
$('muteBtn').textContent = save.mute ? '🔇' : '🔊';
$('muteBtn').onclick = toggleMute; $('pauseBtn').onclick = () => togglePause(); $('camBtn').onclick = () => cycleCam();

// ------------------------------------------------------------------ HUD
const hud = $('hud'), hx = hud.getContext('2d');
let HW = 0, HH = 0, DPR = 1;
function sizeHud() { DPR = Math.min(devicePixelRatio || 1, 2); HW = innerWidth; HH = innerHeight; hud.width = HW * DPR; hud.height = HH * DPR; }
let toastT = 0;
function say(t, ms) { $('toast').textContent = t; toastT = (ms || 1800) / 1000; }
const proj = new THREE.Vector3();
function toScreen(v) { proj.copy(v).project(camera); return { x: (proj.x * .5 + .5) * HW, y: (-proj.y * .5 + .5) * HH, behind: proj.z > 1 }; }
function drawHud(att, target, tLabel) {
  const x = hx, cx = HW / 2, cy = HH / 2, col = '#8bffb0', small = HW < 700;
  x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, HW, HH);
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1.6; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 4;
  x.font = (small ? 12 : 14) + 'px ui-monospace,Menlo,monospace'; x.textBaseline = 'middle';
  const kt = S.v.length() * KT, ft = (S.p.y - GEAR_H) * FT, vs = S.v.y * 196.85;
  // pitch ladder
  const ppd = HH / camera.fov;
  x.save(); x.beginPath(); x.rect(cx - 170, cy - 150, 340, 300); x.clip();
  x.translate(cx, cy); x.rotate(-att.roll);
  const pd = att.pitch * 180 / Math.PI;
  for (let d = -90; d <= 90; d += 5) {
    const y = (pd - d) * ppd; if (Math.abs(y) > 220) continue;
    const w = d === 0 ? 150 : d % 10 ? 22 : 50;
    x.setLineDash(d < 0 ? [6, 5] : []); x.beginPath(); x.moveTo(-w, y); x.lineTo(-18, y); x.moveTo(18, y); x.lineTo(w, y); x.stroke();
    if (d && d % 10 === 0) { x.textAlign = 'right'; x.fillText(String(d), -w - 6, y); x.textAlign = 'left'; x.fillText(String(d), w + 6, y); }
  }
  x.setLineDash([]); x.restore();
  // boresight and flight path marker
  x.beginPath(); x.moveTo(cx - 26, cy); x.lineTo(cx - 9, cy); x.lineTo(cx, cy + 8); x.lineTo(cx + 9, cy); x.lineTo(cx + 26, cy); x.stroke();
  if (S.v.lengthSq() > 25) { const fp = toScreen(V2.copy(S.p).addScaledVector(S.v, 3)); if (!fp.behind && Math.abs(fp.x - cx) < HW / 2 && Math.abs(fp.y - cy) < HH / 2) { x.beginPath(); x.arc(fp.x, fp.y, 7, 0, 7); x.moveTo(fp.x - 18, fp.y); x.lineTo(fp.x - 7, fp.y); x.moveTo(fp.x + 7, fp.y); x.lineTo(fp.x + 18, fp.y); x.moveTo(fp.x, fp.y - 7); x.lineTo(fp.x, fp.y - 14); x.stroke(); } }
  // heading tape
  const tw = small ? 220 : 360, ty = small ? 92 : 70;
  x.save(); x.beginPath(); x.rect(cx - tw / 2, ty - 22, tw, 46); x.clip();
  for (let d = Math.floor(att.hdg / 5) * 5 - 40; d <= att.hdg + 40; d += 5) {
    const px = cx + (d - att.hdg) * (tw / 70), dd = ((d % 360) + 360) % 360;
    x.beginPath(); x.moveTo(px, ty + 14); x.lineTo(px, ty + (dd % 10 ? 8 : 2)); x.stroke();
    if (dd % 10 === 0) { x.textAlign = 'center'; x.fillText({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[dd] || String(dd / 10).padStart(2, '0'), px, ty - 10); }
  }
  x.restore();
  x.textAlign = 'center'; x.strokeRect(cx - 44, ty + 26, 88, 22); x.fillText('HDG ' + String(Math.round(att.hdg) % 360).padStart(3, '0'), cx, ty + 37);
  x.beginPath(); x.moveTo(cx, ty + 15); x.lineTo(cx - 6, ty + 23); x.lineTo(cx + 6, ty + 23); x.closePath(); x.fill();
  // speed and altitude tapes
  const gap = small ? Math.min(150, HW * 0.38) : 260, th = small ? 160 : 240;
  const tape = (tx, val, step, label, unit, right) => {
    x.save(); x.beginPath(); x.rect(tx - 40, cy - th / 2, 80, th); x.clip();
    const pps = (th / 2) / (step * 4);
    for (let v = Math.floor(val / step) * step - step * 5; v <= val + step * 5; v += step) {
      const y = cy - (v - val) * pps, major = Math.round(v / step) % 2 === 0;
      x.beginPath(); x.moveTo(right ? tx - 40 : tx + 40, y); x.lineTo(right ? tx - (major ? 28 : 34) : tx + (major ? 28 : 34), y); x.stroke();
      if (major) { x.textAlign = right ? 'left' : 'right'; x.fillText(String(Math.round(v)), right ? tx - 22 : tx + 22, y); }
    }
    x.restore();
    x.fillStyle = 'rgba(0,20,8,.7)'; x.fillRect(tx - 42, cy - 13, 84, 26); x.fillStyle = col; x.strokeRect(tx - 42, cy - 13, 84, 26);
    x.textAlign = 'center'; x.font = 'bold ' + (small ? 14 : 17) + 'px ui-monospace,Menlo,monospace'; x.fillText(String(Math.round(val)), tx, cy + 1);
    x.font = (small ? 11 : 13) + 'px ui-monospace,Menlo,monospace'; x.fillText(label, tx, cy - th / 2 - 12); x.fillText(unit, tx, cy + th / 2 + 12);
  };
  tape(cx - gap, kt, 10, 'SPD', 'KT', false);
  tape(cx + gap, ft, 100, 'ALT', 'FT', true);
  x.textAlign = 'center'; x.fillText('VS ' + (vs >= 0 ? '+' : '') + Math.round(vs / 10) * 10, cx + gap, cy + th / 2 + 30);
  const agl = (S.p.y - GEAR_H - Math.max(0, height(S.p.x, S.p.z))) * FT; if (agl < 2500) x.fillText('R ' + Math.round(Math.max(0, agl)), cx + gap, cy + th / 2 + 48);
  x.fillText('G ' + S.g.toFixed(1), cx - gap, cy + th / 2 + 30);
  // throttle / config
  x.textAlign = 'left'; const bx = small ? 10 : 22, by = HH - (small ? 250 : 150);
  x.fillText('THR ' + Math.round(S.thr * 100) + '%', bx, by); x.strokeRect(bx, by + 12, 100, 8); x.fillRect(bx, by + 12, S.thr * 100, 8);
  x.fillText('FLAPS ' + ['UP', '1/2', 'FULL'][S.flaps], bx, by + 36); x.fillText('GEAR ' + (S.gear ? 'DOWN' : 'UP'), bx, by + 54); if (S.brk) x.fillText('BRAKES', bx, by + 72);
  // target marker
  if (target) {
    const sp = toScreen(target), dist = target.distanceTo(S.p), on = !sp.behind && sp.x > 30 && sp.x < HW - 30 && sp.y > 30 && sp.y < HH - 30;
    x.strokeStyle = '#ffc04d'; x.fillStyle = '#ffc04d';
    if (on) { x.beginPath(); x.moveTo(sp.x, sp.y - 12); x.lineTo(sp.x + 12, sp.y); x.lineTo(sp.x, sp.y + 12); x.lineTo(sp.x - 12, sp.y); x.closePath(); x.stroke(); x.textAlign = 'center'; x.fillText(tLabel + ' ' + (dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m'), sp.x, sp.y + 24); }
    else {
      let dx = sp.x - cx, dy = sp.y - cy; if (sp.behind) { dx = -dx; dy = -dy; } const a = Math.atan2(dy, dx), r = Math.min(HW, HH) * 0.36;
      x.save(); x.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.rotate(a); x.beginPath(); x.moveTo(16, 0); x.lineTo(-8, -11); x.lineTo(-8, 11); x.closePath(); x.fill(); x.restore();
      x.textAlign = 'center'; x.fillText((dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m'), cx + Math.cos(a) * (r - 34), cy + Math.sin(a) * (r - 34));
    }
  }
  // warnings
  const blink = (performance.now() / 300 | 0) % 2;
  const fut = V2.copy(S.p).addScaledVector(S.v, 5);
  const pullUp = !S.ground && S.v.y < -3 && fut.y - GEAR_H < Math.max(0, height(fut.x, fut.z)) && !(S.gear && S.v.y > -6 && FIELDS.some(f => onRunway(f, fut.x, fut.z, 200)));
  const warns = []; if (S.stall) warns.push('STALL'); if (pullUp) warns.push('PULL UP'); if (kt > 185) warns.push('OVERSPEED');
  if (!S.gear && !S.ground && agl < 400 && kt < 95 && S.v.y < -1) warns.push('GEAR');
  if (Math.hypot(S.p.x, S.p.z) > ISLAND + 1500) warns.push('RETURN TO ISLAND');
  if (warns.length && blink) { x.fillStyle = '#ff4d4d'; x.font = 'bold ' + (small ? 20 : 26) + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText(warns.join('  ·  '), cx, cy - (small ? 110 : 175)); }
  warnState(warns);
}
let lastWarn = 0;
function warnState(w) { const t = performance.now(); if (w.length && t - lastWarn > 900) { lastWarn = t; sfx(w[0] === 'STALL' ? 'stall' : 'warn'); } }

// minimap: island painted once, then the plane, rings and fields on top
const mm = $('map'), mx = mm.getContext('2d'), MM = 300;
const mapBase = (() => {
  const c = document.createElement('canvas'); c.width = c.height = MM; const x = c.getContext('2d'), img = x.createImageData(MM, MM);
  for (let j = 0; j < MM; j++) for (let i = 0; i < MM; i++) {
    const wx = (i / MM - .5) * TSIZE, wz = (j / MM - .5) * TSIZE, h = height(wx, wz), k = (j * MM + i) * 4;
    let r, g, b; if (h < 0.2) { r = 30; g = 80; b = 120; } else if (h < 8) { r = 200; g = 185; b = 130; } else if (h > 470) { r = 235; g = 240; b = 245; } else { const t = clamp(h / 470, 0, 1); r = 70 + t * 80; g = 120 - t * 10; b = 60 + t * 50; }
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
})();
const toMap = (wx, wz) => [(wx / TSIZE + .5) * MM, (wz / TSIZE + .5) * MM];
function drawMap(att) {
  mx.drawImage(mapBase, 0, 0);
  mx.fillStyle = '#111'; for (const f of FIELDS) { const [a, b] = toMap(f.x, f.z); mx.save(); mx.translate(a, b); mx.rotate(f.hdg * Math.PI / 180); mx.fillRect(-2, -f.len / TSIZE * MM / 2, 4, f.len / TSIZE * MM); mx.restore(); }
  if (mission && mission.ringList) mission.ringList.forEach((r, i) => { if (r.done) return; const [a, b] = toMap(r.pos.x, r.pos.z); mx.fillStyle = i === mission.next ? '#ffb020' : '#38bdf8'; mx.beginPath(); mx.arc(a, b, i === mission.next ? 5 : 3, 0, 7); mx.fill(); });
  const [a, b] = toMap(S.p.x, S.p.z); mx.save(); mx.translate(a, b); mx.rotate(att.hdg * Math.PI / 180); mx.fillStyle = '#fff'; mx.strokeStyle = '#000'; mx.beginPath(); mx.moveTo(0, -9); mx.lineTo(6, 7); mx.lineTo(0, 3); mx.lineTo(-6, 7); mx.closePath(); mx.fill(); mx.stroke(); mx.restore();
}

// ------------------------------------------------------------------ missions flow
function fmt(ms) { const s = ms / 1000, m = Math.floor(s / 60); return m + ':' + (s - m * 60).toFixed(2).padStart(5, '0'); }
function startMission(key) {
  const M = MODES[key]; mission = { key, M, next: 0, state: 'fly', t0: 0, time: 0, ringList: null };
  if (M.rings) mission.ringList = buildRings(M.rings()); else ringGroup.clear();
  placeStart(M.start); plane.visible = true;
  mission.ringList && mission.ringList.forEach((r, i) => r.mesh.material = i === 0 ? ringMats.next : ringMats.later);
  $('mName').textContent = M.name; updObjective();
  hideOverlay(); paused = false; audioOn(); lastT = performance.now();
  say(M.start === 'runway' ? 'Full throttle (Shift or 0), pull back (S / ↓) at 65 kt to lift off' : M.start === 'approach' ? 'Gear and flaps are down. Hold the glide, flare just before touchdown' : 'Fly through the orange ring', 4500);
  publish();
}
function updObjective() {
  const M = mission.M; let t = '';
  if (mission.ringList && mission.next < mission.ringList.length) t = 'Ring ' + (mission.next + 1) + ' of ' + mission.ringList.length;
  else if (M.land) t = 'Land at ' + M.land.name + ' · runway ' + String(Math.round(M.land.hdg / 10)).padStart(2, '0');
  else t = 'Explore freely';
  if (M.timed) t += ' · ' + fmt(mission.time);
  $('mObj').textContent = t;
}
function ringPassed() {
  const r = mission.ringList[mission.next]; r.done = true; r.mesh.material = ringMats.done; mission.next++; sfx('ring');
  const nx = mission.ringList[mission.next]; if (nx) nx.mesh.material = ringMats.next;
  if (mission.next >= mission.ringList.length) {
    if (mission.M.land) say('Circuit done! Now land on runway 36', 3500);
    else finish();
  } else say('✅ Ring ' + mission.next + ' of ' + mission.ringList.length, 900);
}
function landingScore() {
  const td = S.td, fpm = Math.abs(td.vs) * 196.85;
  let stars = 1; if (fpm < 600 && td.w < 12) stars = 2; if (fpm < 300 && td.w < 6) stars = 3;
  return { stars, text: 'Touchdown ' + Math.round(fpm) + ' ft/min · ' + td.w.toFixed(1) + ' m from the centre line' };
}
function checkLanding() {
  const M = mission.M;
  if (!M.land || mission.state !== 'fly' || !S.ground || S.v.length() > 1.5) return;
  if (mission.ringList && mission.next < mission.ringList.length) return;
  if (S.thr > 0.2) return;
  if (!S.td || !onRunway(M.land, S.p.x, S.p.z, 6)) {
    if (S.td && !FIELDS.some(f => onRunway(f, S.p.x, S.p.z, 6))) { mission.state = 'done'; showResult('🌾 Off-field landing', 'You stopped safely, but not on the ' + M.land.name + ' runway.', 0); }
    return;
  }
  finish();
}
function finish() {
  mission.state = 'done'; sfx('win'); PAD && PAD.rumble && PAD.rumble(.6, .6, 300);
  const M = mission.M, k = mission.key; let stars = 3, lines = [];
  if (M.timed) {
    const ms = Math.round(mission.time), prev = save.best[k]; lines.push('Time ' + fmt(ms) + (prev ? ' · best ' + fmt(Math.min(prev, ms)) : ''));
    if (!prev || ms < prev) { save.best[k] = ms; lines.push('🏆 New personal best!'); if (WW && WW.postBest) try { WW.postBest('flight', ms, true); } catch (e) {} }
    stars = ms < 150000 ? 3 : ms < 210000 ? 2 : 1;
  }
  if (M.land && S.td) { const s = landingScore(); stars = Math.min(stars, s.stars); lines.push(s.text); }
  save.stars[k] = Math.max(save.stars[k] || 0, stars); persist(); publish();
  setTimeout(() => showResult('🏁 ' + M.name.replace(/^\S+\s/, '') + ' complete', lines.join('<br>'), stars), 600);
}
function publish() {
  if (!WW || !WW.publishPlaying) return;
  try { WW.publishPlaying({ game: 'flight', title: 'Werewolf Wings', status: (mission ? mission.M.name.replace(/^\S+\s/, '') : 'In the hangar') + (save.best.rings ? ' · ring run best ' + fmt(save.best.rings) : ''), open: 0 }); } catch (e) {}
}
addEventListener('pagehide', () => { try { WW && WW.clearPlaying && WW.clearPlaying(); } catch (e) {} });

// ------------------------------------------------------------------ menus
const ov = $('ov'), box = $('ovBox');
function starsTxt(n) { return n ? '★'.repeat(n) + '☆'.repeat(3 - n) : ''; }
function showMenu() {
  paused = true; ov.style.display = 'flex';
  let h = '<h2>🛩️ Werewolf Wings</h2><div class="muted">Fly the Skyrunner over Howl Island. Pick a flight:</div><div class="modes">';
  if (mission && mission.state === 'fly') h = '<h2>⏸ Paused</h2><button data-a="resume">▶ Resume flight</button><div class="muted" style="margin-top:10px">Or start another flight:</div><div class="modes">';
  for (const k in MODES) { const M = MODES[k]; h += '<button class="mode" data-m="' + k + '"><b>' + M.name + '</b> <span class="st">' + starsTxt(save.stars[k]) + (save.best[k] ? ' ⏱ ' + fmt(save.best[k]) : '') + '</span><small>' + M.desc + '</small></button>'; }
  h += '</div><div class="optrow"><button class="alt" data-a="sky">' + (save.sky === 'day' ? '☀️ Daytime' : '🌇 Sunset') + '</button><button class="alt" data-a="inv">' + (save.invert ? '↕ Pitch: inverted' : '↕ Pitch: flight-sim') + '</button><button class="alt" data-a="mute">' + (save.mute ? '🔇 Sound off' : '🔊 Sound on') + '</button></div>';
  h += '<details><summary>🎮 Controls</summary><div class="muted ctl">' +
    '<b>Keyboard:</b> W/S or ↑/↓ pitch (S / ↓ = nose up) · A/D or ←/→ roll · Q/E rudder · Shift / Ctrl throttle (or 1–9, 0 = full) · F flaps · G gear · B or Space brakes · C camera · R restart · M sound · Esc pause<br>' +
    '<b>Mouse:</b> hold the left button and drag to fly (like a stick) · wheel = throttle · right-drag looks around<br>' +
    '<b>Touch:</b> drag on the left of the screen to fly · slide the bar on the right for throttle · buttons for camera, gear, flaps and brakes<br>' +
    '<b>Controller:</b> left stick fly · R2/L2 throttle · L1/R1 rudder · ✕/A brakes · □/X gear · ○/B flaps · △/Y camera · Options pause<br>' +
    '<b>Tips:</b> lift off around 65 kt. To land, slow to 80–90 kt with full flaps, aim at the white blocks and raise the nose a little just above the runway. Throttle to idle and brake once you are down.</div></details>';
  h += '<div class="muted" style="margin-top:10px"><a href="./" style="color:#94a3b8">← All games</a></div>';
  box.innerHTML = h;
  box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => startMission(b.dataset.m));
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'resume') { hideOverlay(); paused = false; lastT = performance.now(); return; }
    if (a === 'sky') { save.sky = save.sky === 'day' ? 'sunset' : 'day'; applySky(); }
    if (a === 'inv') save.invert = !save.invert;
    if (a === 'mute') { save.mute = !save.mute; $('muteBtn').textContent = save.mute ? '🔇' : '🔊'; if (!save.mute) audioOn(); }
    persist(); showMenu();
  });
}
function showResult(title, body, stars) {
  paused = true; ov.style.display = 'flex';
  box.innerHTML = '<h2>' + title + '</h2>' + (stars ? '<div class="bigstars">' + starsTxt(stars) + '</div>' : '') + '<div class="muted" style="font-size:.95rem;line-height:1.5">' + body + '</div>' +
    '<div class="optrow"><button data-r="1">↻ Fly it again</button><button class="alt" data-menu="1">☰ All flights</button></div>';
  box.querySelector('[data-r]').onclick = () => startMission(mission.key);
  box.querySelector('[data-menu]').onclick = () => { mission.state = 'done'; showMenu(); };
}
function hideOverlay() { ov.style.display = 'none'; }
function togglePause() { if (!mission) return; if (paused) { if (mission.state === 'fly') { hideOverlay(); paused = false; lastT = performance.now(); } } else showMenu(); }

// ------------------------------------------------------------------ camera
const camPos = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0);
function updCamera(dt, att) {
  const cockpit = camMode === 1;
  parts.canopy.visible = parts.head.visible = !cockpit; parts.panel.visible = parts.shield.visible = cockpit;
  camera.near = cockpit ? 0.08 : 0.5; camera.fov = cockpit ? 70 : 62; camera.updateProjectionMatrix();
  if (!mouse.look) { mouse.yaw *= 1 - Math.min(1, dt * 2); mouse.pitch *= 1 - Math.min(1, dt * 2); }
  if (cockpit) {
    camera.position.set(0, 1.34, 0.05).applyQuaternion(S.q).add(S.p);
    camera.quaternion.copy(S.q).multiply(Q1.setFromEuler(tmpE.set(-0.12 + mouse.pitch, mouse.yaw, 0, 'YXZ')));
    camPos.copy(camera.position); camUp.set(0, 1, 0).applyQuaternion(S.q);
  } else {
    const dist = camMode === 2 ? 34 : 17, hgt = camMode === 2 ? 9 : 4.2;
    const back = V2.set(0, 0, 1).applyQuaternion(S.q); back.y = back.y * 0.6; back.normalize();
    const off = back.multiplyScalar(dist).applyAxisAngle(V3.set(0, 1, 0), mouse.yaw); off.y += hgt + mouse.pitch * 20;
    const want = S.p.clone().add(off), k = 1 - Math.exp(-dt * (S.crashed ? 1 : 6));
    if (camPos.lengthSq() === 0 || camPos.distanceTo(want) > 200) camPos.copy(want); else camPos.lerp(want, k);
    const gh = Math.max(0.2, height(camPos.x, camPos.z)) + 2; if (camPos.y < gh) camPos.y = gh;
    camera.position.copy(camPos);
    camUp.lerp(V3.set(0, 1, 0).applyQuaternion(S.q).lerp(V2.set(0, 1, 0), 0.65), k).normalize(); camera.up.copy(camUp);
    camera.lookAt(fwd().clone().multiplyScalar(22).add(S.p));
  }
  if (shake > 0) { camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * 1.5); }
  if (S.stall) { camera.position.x += (Math.random() - .5) * 0.08; camera.position.y += (Math.random() - .5) * 0.08; }
  sky.position.copy(camera.position);
  sun.position.copy(S.p).addScaledVector(skyU.sunDir.value, 500); sun.target.position.copy(S.p);
  document.body.classList.toggle('cockpit', cockpit);
}

// ------------------------------------------------------------------ main loop
let lastT = performance.now(), instT = 0, mapT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (PAD && PAD.poll) PAD.poll();
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const att0 = attitude();
  if (!paused && mission) {
    const inp = readInput(dt);
    if (mission.state === 'fly') { for (let i = 0; i < 3; i++) step(dt / 3, inp); }
    if (mission.state === 'fly' && mission.M.timed) mission.time += dt * 1000;
    checkLanding(); updObjective();
    // control surfaces and prop
    parts.ailL.rotation.x = -inp.roll * 0.35; parts.ailR.rotation.x = inp.roll * 0.35; parts.elev.rotation.x = inp.pitch * 0.4; parts.rud.rotation.y = -inp.yaw * 0.4;
    parts.flapL.rotation.x = parts.flapR.rotation.x = S.flaps * 0.28;
    toastT -= dt; if (toastT <= 0) $('toast').textContent = '';
  }
  updParticles(dt);
  S.prop += (8 + S.thr * 70) * dt; parts.prop.rotation.z = S.prop; parts.disc.material.opacity = clamp(S.thr * 0.35, 0, 0.3);
  parts.gear.visible = S.gear; parts.strobe.visible = (now / 1000 % 1.2) < 0.08;
  plane.position.copy(S.p); plane.quaternion.copy(S.q);
  const gh = Math.max(0.25, height(S.p.x, S.p.z)), agl = S.p.y - gh;
  shadow.visible = plane.visible && agl < 300; shadow.position.set(S.p.x, gh + 0.15, S.p.z); shadow.material.opacity = 0.35 * (1 - agl / 300); shadow.rotation.z = -att0.hdg * Math.PI / 180;
  updCamera(dt, att0);
  updAudio();
  const att = attitude();
  instT -= dt; if (instT <= 0) { instT = 1 / 30; drawInstruments({ kt: S.v.length() * KT, ft: (S.p.y - GEAR_H) * FT, hdg: att.hdg, pitch: att.pitch, roll: att.roll, gear: S.gear, flaps: S.flaps, flapsTxt: ['UP', '1/2', 'FULL'][S.flaps], brk: S.brk, stall: S.stall }); }
  let target = null, tl = '';
  if (mission && mission.state === 'fly') {
    if (mission.ringList && mission.next < mission.ringList.length) { target = mission.ringList[mission.next].pos; tl = 'RING'; }
    else if (mission.M.land) { const f = mission.M.land; target = new THREE.Vector3(f.x - f.fx * f.len * 0.35, f.elev + 2, f.z - f.fz * f.len * 0.35); tl = f.name.toUpperCase(); }
  }
  drawHud(att, target, tl);
  mapT -= dt; if (mapT <= 0) { mapT = 0.1; drawMap(att); }
  renderer.render(scene, camera);
}

addEventListener('resize', resize); resize();
mission = { key: 'free', M: MODES.free, state: 'menu', next: 0, time: 0 };
placeStart('runway');
showMenu();
requestAnimationFrame(frame);
if (WW && WW.onReady) try { WW.onReady(() => publish()); } catch (e) {}
// test hook for automated screenshots: window.__flight
window.__flight = { sim(sec, inp) { const n = Math.round(sec * 120); for (let i = 0; i < n && mission.state === 'fly'; i++) { step(1 / 120, inp || { pitch: 0, roll: 0, yaw: 0 }); if (mission.M.timed) mission.time += 1000 / 120; checkLanding(); } }, attitude, S, startMission, setAttitude, height, FIELD_A, FIELD_B, MODES, get mission() { return mission; }, cam: m => { camMode = m; }, sky: s => { save.sky = s; applySky(); } };
