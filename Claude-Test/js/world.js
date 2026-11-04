// Neighborly Acre: 3D world builders (scenery, farmer, tractor, crops, animals). Uses the local three.js bundle.
import * as THREE from './three.min.js';

export const TILE = 2, COLS = 12, ROWS = 8, FX0 = -12, FZ0 = 2;       // field: 12x8 tiles of 2 units
export const CHICKEN_PEN = { x0: 29, x1: 39, z0: 5, z1: 13 };
export const COW_PASTURE = { x0: -43, x1: -29, z0: 5, z1: 19 };
export const SHOP_POS = { x: 22, z: -2.5 };
export const TRACTOR_HOME = { x: -9, z: -3, ry: .6 };
export const COLLIDERS = [{ x: -24, z: -8, r: 6.2 }, { x: 22, z: -9, r: 8 }, { x: 30.5, z: -9, r: 3 }];

const M = {}; // shared materials
function mat(color, opts) { const k = color + JSON.stringify(opts || {}); return M[k] || (M[k] = new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}))); }
function box(parent, w, h, d, color, x, y, z, shadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = shadow !== false; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(parent, rt, rb, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), mat(color)); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function sph(parent, r, color, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(color)); m.position.set(x || 0, y || 0, z || 0);
  m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; parent.add(m); return m;
}
function rng(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export function makeLabel(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(text, 128, 34); g.fillStyle = color || '#fff'; g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(4, 1, 1); s.renderOrder = 10; return s;
}

function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#4f9a3f'; g.fillRect(0, 0, 256, 256); const r = rng(7);
  for (let i = 0; i < 2600; i++) { const a = r(); g.fillStyle = a < .5 ? 'rgba(40,110,40,.35)' : 'rgba(120,190,70,.30)'; g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function fence(scene, x0, z0, x1, z1, gapSide) {
  // rectangle fence with a gate gap on one side ('e','w','n','s')
  const g = new THREE.Group(), post = 0x8b5a2b;
  function run(ax, az, bx, bz, gap) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2)), dx = (bx - ax) / n, dz = (bz - az) / n;
    for (let i = 0; i <= n; i++) {
      const midGap = gap && i >= Math.floor(n / 2) - 1 && i <= Math.floor(n / 2) + 1;
      if (!midGap || i === Math.floor(n / 2) - 1 || i === Math.floor(n / 2) + 1) box(g, .25, 1.4, .25, post, ax + dx * i, .7, az + dz * i);
      if (i < n) { const skip = gap && (i === Math.floor(n / 2) - 1 || i === Math.floor(n / 2)); if (skip) continue;
        for (const y of [.55, 1.1]) { const r = box(g, Math.abs(dx) > 0 ? Math.abs(dx) : .12, .14, Math.abs(dz) > 0 ? Math.abs(dz) : .12, post, ax + dx * (i + .5), y, az + dz * (i + .5)); } }
    }
  }
  run(x0, z0, x1, z0, gapSide === 'n'); run(x1, z0, x1, z1, gapSide === 'e'); run(x1, z1, x0, z1, gapSide === 's'); run(x0, z1, x0, z0, gapSide === 'w');
  scene.add(g);
}

function tree(scene, x, z, r) {
  const g = new THREE.Group(); g.position.set(x, 0, z); const s = .8 + r() * .9; g.scale.setScalar(s);
  cyl(g, .28, .38, 2, 0x6b4423, 0, 1, 0, 8);
  if (r() < .5) { for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.1 - i * .5, 2.4, 9), mat(i % 2 ? 0x1f6b3a : 0x25804a)); c.position.y = 2.6 + i * 1.3; c.castShadow = true; g.add(c); } }
  else { sph(g, 1.9, 0x3a8f3f, 0, 3.6, 0); sph(g, 1.3, 0x4aa34a, .9, 4.4, .4); }
  scene.add(g);
}

export function buildWorld(scene) {
  const W = {};
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: grassTexture() }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // field base (tilled-looking stubble) + wooden frame
  const base = new THREE.Mesh(new THREE.PlaneGeometry(COLS * TILE + 1.4, ROWS * TILE + 1.4), mat(0x6f8f3a)); base.rotation.x = -Math.PI / 2;
  base.position.set(FX0 + COLS * TILE / 2, .02, FZ0 + ROWS * TILE / 2); base.receiveShadow = true; scene.add(base);
  // gravel yard path
  const path = new THREE.Mesh(new THREE.PlaneGeometry(70, 7), mat(0xb8a98a)); path.rotation.x = -Math.PI / 2; path.position.set(0, .03, -3); path.receiveShadow = true; scene.add(path);

  // house
  const house = new THREE.Group(); house.position.set(-24, 0, -8); scene.add(house);
  box(house, 9, 5, 7, 0xf1e4c8, 0, 2.5, 0); box(house, 1.6, 3, .2, 0x6b4423, 0, 1.5, 3.55);
  for (const x of [-2.8, 2.8]) { box(house, 1.5, 1.5, .2, 0x9fd4ff, x, 2.8, 3.55); box(house, 1.8, .2, .35, 0xffffff, x, 2, 3.6); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 3.4, 4), mat(0xa63d2f)); roof.rotation.y = Math.PI / 4; roof.position.y = 6.7; roof.scale.set(1, 1, .78); roof.castShadow = true; house.add(roof);
  box(house, 1.2, 3, 1.2, 0x8a8a8a, 2.5, 7, -1.5);
  // barn
  const barn = new THREE.Group(); barn.position.set(22, 0, -9); scene.add(barn);
  box(barn, 12, 6.5, 9, 0xb3382c, 0, 3.25, 0);
  box(barn, 4.2, 5, .25, 0xf5f5f5, 0, 2.6, 4.55); box(barn, .35, 5, .3, 0xffffff, -2.1, 2.6, 4.6); box(barn, .35, 5, .3, 0xffffff, 2.1, 2.6, 4.6);
  const rl = box(barn, 7.6, .5, 10, 0x5b3b2a, -3.1, 8.0, 0); rl.rotation.z = .62;
  const rr = box(barn, 7.6, .5, 10, 0x5b3b2a, 3.1, 8.0, 0); rr.rotation.z = -.62;
  const sign = makeLabel('SHOP', '#ffe08a'); sign.position.set(0, 6.2, 5.2); sign.scale.set(5, 1.25, 1); barn.add(sign);
  // silo
  const silo = new THREE.Group(); silo.position.set(30.5, 0, -9); scene.add(silo);
  cyl(silo, 2.2, 2.2, 10, 0xcfd3d8, 0, 5, 0, 20); const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8e949b)); dome.position.y = 10; dome.castShadow = true; silo.add(dome);
  // pens
  fence(scene, CHICKEN_PEN.x0 - 1, CHICKEN_PEN.z0 - 1, CHICKEN_PEN.x1 + 1, CHICKEN_PEN.z1 + 1, 'w');
  fence(scene, COW_PASTURE.x0 - 1, COW_PASTURE.z0 - 1, COW_PASTURE.x1 + 1, COW_PASTURE.z1 + 1, 'e');
  const coop = new THREE.Group(); coop.position.set(37.5, 0, 12); scene.add(coop); box(coop, 3, 2, 2.4, 0xd9b26f, 0, 1, 0); const cr = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), mat(0x8a3b2d)); cr.rotation.y = Math.PI / 4; cr.position.y = 2.6; cr.scale.z = .8; coop.add(cr);
  // trees (seeded, away from play areas)
  const r = rng(42), keep = (x, z) => !(x > -17 && x < 17 && z > -9 && z < 24) && !(x > 26 && x < 44 && z > 1 && z < 17) && !(x < -26 && x > -48 && z > 1 && z < 23) && !(Math.abs(x + 24) < 8 && Math.abs(z + 8) < 8) && !(Math.abs(x - 24) < 12 && Math.abs(z + 9) < 10);
  let n = 0; while (n < 110) { const x = (r() - .5) * 170, z = (r() - .5) * 170; if (keep(x, z)) { tree(scene, x, z, r); n++; } }
  // clouds
  W.clouds = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .9 });
  for (let i = 0; i < 12; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(3 + r() * 3, 10, 8), cm); s.position.set(k * 4 - 6, r() * 1.5, r() * 3); s.scale.y = .6; c.add(s); }
    c.position.set((r() - .5) * 260, 45 + r() * 15, (r() - .5) * 260); W.clouds.add(c); }
  scene.add(W.clouds);
  return W;
}

// ---- characters
export function makeFarmer(hue) {
  const g = new THREE.Group(), shirt = new THREE.Color().setHSL(hue, .6, .45).getHex(), skin = 0xf2c9a0;
  const body = box(g, .8, .9, .45, shirt, 0, 1.55, 0);
  const head = sph(g, .32, skin, 0, 2.25, 0);
  const brim = cyl(g, .62, .62, .06, 0xe6c26b, 0, 2.5, 0, 18), crown = cyl(g, .3, .34, .28, 0xe6c26b, 0, 2.65, 0, 14);
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-.22, 1.1, 0); legR.position.set(.22, 1.1, 0); armL.position.set(-.55, 1.9, 0); armR.position.set(.55, 1.9, 0);
  box(legL, .3, 1.1, .32, 0x3b4a6b, 0, -.55, 0); box(legR, .3, 1.1, .32, 0x3b4a6b, 0, -.55, 0);
  box(armL, .22, .8, .26, shirt, 0, -.38, 0); box(armR, .22, .8, .26, shirt, 0, -.38, 0);
  g.add(legL, legR, armL, armR);
  g.userData = { legL: legL, legR: legR, armL: armL, armR: armR, phase: 0 };
  return g;
}
export function animateFarmer(g, speed, dt) {
  const u = g.userData; u.phase += speed * dt * 1.7; const a = Math.sin(u.phase) * Math.min(1, speed / 3) * .8;
  u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a; u.armR.rotation.x = a;
}

export function makeTractor() {
  const g = new THREE.Group();
  box(g, 2, 1, 3.2, 0x2e8b3a, 0, 1.15, .2);                // body
  box(g, 1.5, .9, 1.4, 0x2e8b3a, 0, 1.45, 1.6);            // hood
  box(g, 1.9, 1.7, 1.6, 0x3aa84a, 0, 2.3, -.7);            // cab
  box(g, 1.7, 1.2, .08, 0x9fd4ff, 0, 2.45, .1).material = new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: .55 });
  box(g, 2.2, .15, 1.9, 0x1f6b2b, 0, 3.2, -.7);            // roof
  cyl(g, .09, .09, 1.2, 0x222222, .5, 2.55, 1.9, 8);       // exhaust
  const wheel = (x, y, z, r, w) => { const c = cyl(g, r, r, w, 0x1a1a1a, x, y, z, 18); c.rotation.z = Math.PI / 2; const h = cyl(g, r * .5, r * .5, w + .04, 0xe6c200, x, y, z, 12); h.rotation.z = Math.PI / 2; return [c, h]; };
  g.userData.wheels = [].concat(wheel(-1.3, .95, -.9, .95, .6), wheel(1.3, .95, -.9, .95, .6), wheel(-1.1, .55, 1.6, .55, .45), wheel(1.1, .55, 1.6, .55, .45));
  for (const x of [-.6, .6]) sph(g, .16, 0xfff3b0, x, 1.35, 2.35);
  const impl = new THREE.Mesh(new THREE.BoxGeometry(5.6, .5, .9), mat(0x888888)); impl.position.set(0, .55, -2.6); impl.castShadow = true; g.add(impl); g.userData.impl = impl;
  return g;
}
export function setImplement(tractor, color) { tractor.userData.impl.material = mat(color); }

// ---- crops
const stem = new THREE.CylinderGeometry(.03, .045, 1, 6), leaf = new THREE.ConeGeometry(.14, .55, 6);
export function makeCrop(type, r) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const rnd = r || Math.random;
  g.userData = { inner: inner, bloom: [] };
  if (type === 'wheat') {
    for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(stem, mat(0x7bb04a)); s.scale.y = 1.1; s.position.set((rnd() - .5) * 1.5, .55, (rnd() - .5) * 1.5); inner.add(s);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .3, 6), mat(0xe6c84a)); h.position.set(s.position.x, 1.2, s.position.z); h.visible = false; inner.add(h); g.userData.bloom.push(h); }
  } else if (type === 'carrot') {
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(leaf, mat(0x3fae49)); l.position.set((rnd() - .5) * 1.3, .3, (rnd() - .5) * 1.3); l.rotation.z = (rnd() - .5) * .5; inner.add(l);
      const c = new THREE.Mesh(new THREE.ConeGeometry(.12, .4, 7), mat(0xf08a24)); c.rotation.x = Math.PI; c.position.set(l.position.x, .08, l.position.z); c.visible = false; inner.add(c); g.userData.bloom.push(c); }
  } else {
    for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * .9, z = (Math.floor(i / 2) - .5) * .9; const s = new THREE.Mesh(stem, mat(0x4f9a3a)); s.scale.set(2, 2.6, 2); s.position.set(x, 1.3, z); inner.add(s);
      const lf = new THREE.Mesh(new THREE.BoxGeometry(.7, .05, .18), mat(0x3d8a30)); lf.position.set(x + .3, 1.6, z); lf.rotation.z = .4; inner.add(lf);
      const cob = new THREE.Mesh(new THREE.CylinderGeometry(.11, .09, .5, 8), mat(0xf2d21b)); cob.position.set(x + .15, 1.5, z); cob.visible = false; inner.add(cob); g.userData.bloom.push(cob); }
  }
  inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function growCrop(g, p, watered) {
  const ready = p >= 1; g.userData.inner.scale.set(1, watered ? .18 + .82 * p : .12, 1);
  g.userData.bloom.forEach(b => { b.visible = ready; });
}
export const soilDry = mat(0x7a5230), soilWet = mat(0x4a2e17);
export const soilGeo = new THREE.BoxGeometry(TILE - .12, .22, TILE - .12);

// ---- animals
export function makeAnimal(type) {
  const g = new THREE.Group();
  if (type === 'chicken') {
    sph(g, .38, 0xffffff, 0, .55, 0, 1, .9, 1.25); sph(g, .2, 0xffffff, 0, .98, .42); box(g, .1, .12, .05, 0xf2a900, 0, .95, .62); box(g, .06, .14, .22, 0xd62828, 0, 1.15, .42);
    box(g, .08, .35, .08, 0xf2a900, -.15, .18, 0); box(g, .08, .35, .08, 0xf2a900, .15, .18, 0); g.userData.speed = 1.1;
  } else {
    box(g, 1.3, 1.1, 2.2, 0xf4f4f4, 0, 1.45, 0); box(g, .5, .5, .4, 0x222222, .35, 1.7, .3).scale.set(1, 1, 1); box(g, .6, .5, .5, 0x222222, -.3, 1.45, -.5);
    box(g, .75, .8, .8, 0xf4f4f4, 0, 1.75, 1.5); box(g, .5, .35, .3, 0xf2b6b6, 0, 1.55, 1.95); box(g, .1, .25, .1, 0xe8e0c8, -.3, 2.25, 1.4); box(g, .1, .25, .1, 0xe8e0c8, .3, 2.25, 1.4);
    for (const x of [-.45, .45]) for (const z of [-.8, .8]) box(g, .22, .95, .22, 0xf4f4f4, x, .48, z);
    g.userData.speed = .7;
  }
  const icon = new THREE.Mesh(type === 'chicken' ? new THREE.SphereGeometry(.22, 10, 8) : new THREE.BoxGeometry(.4, .45, .4), new THREE.MeshBasicMaterial({ color: type === 'chicken' ? 0xfff6e0 : 0x9fd8ff }));
  if (type === 'chicken') icon.scale.set(.8, 1.1, .8);
  icon.position.y = type === 'chicken' ? 2 : 3.3; icon.visible = false; g.add(icon); g.userData.icon = icon;
  return g;
}
export { THREE };
