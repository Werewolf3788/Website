// Neighborly Acre: 3D world builders (scenery, farmer, tractor, crops, animals). Uses the local three.js bundle.
import * as THREE from './three.min.js';

export const TILE = 2, COLS = 20, ROWS = 12, FIELD_TILES = COLS * ROWS;     // one field: 20x12 tiles of 2 units (big enough to need a tractor)
// six fields. Field 0 is the original one (saved farms keep working); the top row is open, the bottom row is land for sale.
export const FIELDS = [{ x0: -20, z0: 2 }, { x0: -66, z0: 2 }, { x0: 26, z0: 2 }, { x0: -20, z0: 32 }, { x0: -66, z0: 32 }, { x0: 26, z0: 32 }];
export const NT = FIELDS.length * FIELD_TILES;
export const fieldOf = i => Math.floor(i / FIELD_TILES);
export function tilePos(i) { const f = FIELDS[Math.floor(i / FIELD_TILES)], li = i % FIELD_TILES; return { x: f.x0 + (li % COLS) * TILE + TILE / 2, z: f.z0 + Math.floor(li / COLS) * TILE + TILE / 2 }; }
export function tileAt(x, z) {
  for (let f = 0; f < FIELDS.length; f++) { const F = FIELDS[f], cx = Math.floor((x - F.x0) / TILE), cz = Math.floor((z - F.z0) / TILE); if (cx >= 0 && cz >= 0 && cx < COLS && cz < ROWS) return f * FIELD_TILES + cz * COLS + cx; }
  return -1;
}
export const CHICKEN_PEN = { x0: 29, x1: 39, z0: -38, z1: -28 };
export const COW_PASTURE = { x0: -43, x1: -29, z0: -44, z1: -30 };
export const SHOP_POS = { x: 22, z: -2.5 };
export const TRACTOR_HOME = { x: -9, z: -3, ry: .6 };
export function parkFor(f) { const F = FIELDS[f] || FIELDS[0]; return { x: F.x0 + 6, z: F.z0 - 3.5, ry: .6 }; }
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

export function makeLabel(text, color, wide) {
  const CW = wide || 256, c = document.createElement('canvas'); c.width = CW; c.height = 64; const g = c.getContext('2d');
  let size = 34; g.font = 'bold ' + size + 'px system-ui,sans-serif'; while (g.measureText(text).width > CW - 16 && size > 12) { size -= 2; g.font = 'bold ' + size + 'px system-ui,sans-serif'; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(text, CW / 2, 34); g.fillStyle = color || '#fff'; g.fillText(text, CW / 2, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(CW / 64, 1, 1); s.renderOrder = 10; return s;
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
  // fields: stubble base + wooden border + number; a FOR SALE sign while the land is not owned yet
  W.fields = FIELDS.map(function (F, idx) {
    const cx = F.x0 + COLS * TILE / 2, cz = F.z0 + ROWS * TILE / 2, fw = COLS * TILE + 1.4, fd = ROWS * TILE + 1.4, g = new THREE.Group(); scene.add(g);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), mat(0x6f8f3a)); base.rotation.x = -Math.PI / 2; base.position.set(cx, .02, cz); base.receiveShadow = true; g.add(base);
    [[0, -fd / 2, fw, .5], [0, fd / 2, fw, .5], [-fw / 2, 0, .5, fd], [fw / 2, 0, .5, fd]].forEach(function (b) { box(g, b[2], .45, b[3], 0x8b5a2b, cx + b[0], .22, cz + b[1], false); });
    let tag = null, sign = null;
    return {
      // name: owner's name (null = nobody owns it yet); mine: it is the local player's; saleText: what the FOR SALE sign says
      setOwner: function (name, mine, saleText) {
        base.material = mat(name ? 0x6f8f3a : 0x9aa86a);
        if (tag) g.remove(tag); tag = makeLabel(name ? name + '\u2019s field' : 'Field ' + (idx + 1), mine ? '#86efac' : (name ? '#bae6fd' : '#ffffff'), 384); tag.position.set(F.x0 + 3, 2.6, F.z0 - 1.4); tag.scale.set(7.2, 1.2, 1); g.add(tag);
        if (sign) { g.remove(sign); sign = null; }
        if (!name) { sign = makeLabel(saleText || 'FOR SALE', '#ffe08a', 512); sign.position.set(cx, 3.8, F.z0 - 2.2); sign.scale.set(14, 1.75, 1); g.add(sign); }
      }
    };
  });
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
  const coop = new THREE.Group(); coop.position.set(37.5, 0, -30); scene.add(coop); box(coop, 3, 2, 2.4, 0xd9b26f, 0, 1, 0); const cr = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), mat(0x8a3b2d)); cr.rotation.y = Math.PI / 4; cr.position.y = 2.6; cr.scale.z = .8; coop.add(cr);
  // trees (seeded, away from play areas)
  const r = rng(42), keep = (x, z) => !(x > -74 && x < 74 && z > -10 && z < 64) && !(x > 25 && x < 45 && z > -41 && z < -25) && !(x < -26 && x > -48 && z > -48 && z < -27) && !(Math.abs(x + 24) < 8 && Math.abs(z + 8) < 8) && !(Math.abs(x - 24) < 12 && Math.abs(z + 9) < 10);
  let n = 0; while (n < 150) { const x = (r() - .5) * 170, z = (r() - .5) * 170; if (keep(x, z)) { tree(scene, x, z, r); n++; } }
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
  g.userData = { legL: legL, legR: legR, armL: armL, armR: armR, phase: 0, head: head, avatar: null, avatarUrl: null };
  return g;
}
// puts a round profile picture on the front of the farmer's head (silently skipped if the image host blocks it)
export function setAvatar(g, url) {
  const u = g.userData; if (!url || u.avatarUrl === url) return; u.avatarUrl = url;
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = function () {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.clip();
      const s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      x.lineWidth = 6; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 61, 0, Math.PI * 2); x.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      if (u.avatar) { u.head.remove(u.avatar); }
      const m = new THREE.Mesh(new THREE.CircleGeometry(.3, 24), new THREE.MeshBasicMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(0, 0, .325); u.head.add(m); u.avatar = m;
      // a round badge floating above the head, readable from any angle (you see your own picture from behind)
      if (u.badge) u.badge.parent.remove(u.badge);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(1.05, 1.05, 1); sp.position.set(0, 3.45, 0); sp.renderOrder = 9; g.add(sp); u.badge = sp;
    } catch (e) { /* tainted or unreadable image: keep the plain face */ }
  };
  img.onerror = function () { if (u.onAvatarFail) u.onAvatarFail(url); }; img.src = url;   // blocked by the image host's CORS rules -> caller shows a plain image badge instead
}
export function animateFarmer(g, speed, dt) {
  const u = g.userData; u.phase += speed * dt * 1.7; const a = Math.sin(u.phase) * Math.min(1, speed / 3) * .8;
  u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a; u.armR.rotation.x = a;
}

export function makeTractor(color) {
  const g = new THREE.Group(), base = new THREE.Color(color || 0x2e8b3a), cabC = base.clone().lerp(new THREE.Color(0xffffff), .22).getHex(), roofC = base.clone().multiplyScalar(.7).getHex(), bodyC = base.getHex();
  box(g, 2, 1, 3.2, bodyC, 0, 1.15, .2);                // body
  box(g, 1.5, .9, 1.4, bodyC, 0, 1.45, 1.6);            // hood
  box(g, 1.9, 1.7, 1.6, cabC, 0, 2.3, -.7);            // cab
  box(g, 1.7, 1.2, .08, 0x9fd4ff, 0, 2.45, .1).material = new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: .55 });
  box(g, 2.2, .15, 1.9, roofC, 0, 3.2, -.7);            // roof
  cyl(g, .09, .09, 1.2, 0x222222, .5, 2.55, 1.9, 8);       // exhaust
  const wheel = (x, y, z, r, w) => { const c = cyl(g, r, r, w, 0x1a1a1a, x, y, z, 18); c.rotation.z = Math.PI / 2; const h = cyl(g, r * .5, r * .5, w + .04, 0xe6c200, x, y, z, 12); h.rotation.z = Math.PI / 2; return [c, h]; };
  g.userData.wheels = [].concat(wheel(-1.3, .95, -.9, .95, .6), wheel(1.3, .95, -.9, .95, .6), wheel(-1.1, .55, 1.6, .55, .45), wheel(1.1, .55, 1.6, .55, .45));
  for (const x of [-.6, .6]) sph(g, .16, 0xfff3b0, x, 1.35, 2.35);
  const impl = new THREE.Mesh(new THREE.BoxGeometry(5.6, .5, .9), mat(0x888888)); impl.position.set(0, .55, -2.6); impl.castShadow = true; g.add(impl); g.userData.impl = impl;
  return g;
}
export function setImplement(tractor, color) { tractor.userData.impl.material = mat(color); }

// ---- crops: one InstancedMesh per crop type (growing part + ripe part) so a 240-tile field costs ~20 draw calls
function part(geo, color, x, y, z, sx, sy, sz, rx, rz) {
  const g = geo.clone().toNonIndexed(); g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1)));
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}
const G = { stem: new THREE.CylinderGeometry(.03, .045, 1, 5), cone: new THREE.ConeGeometry(.14, 1, 6), sph: new THREE.SphereGeometry(1, 8, 6), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 8) };
function J(r, w) { return (r() - .5) * w; }
const BUILD = {
  wheat(r) { const a = [], b = []; for (let i = 0; i < 11; i++) { const x = J(r, 1.6), z = J(r, 1.6); a.push(part(G.stem, 0x86b84f, x, .6, z, 1, 1.2, 1, J(r, .2), J(r, .2))); b.push(part(G.cyl, 0xe6c84a, x, 1.3, z, .06, .38, .06)); } return [a, b]; },
  carrot(r) { const a = [], b = []; for (let i = 0; i < 8; i++) { const x = J(r, 1.5), z = J(r, 1.5); a.push(part(G.cone, 0x3fae49, x, .3, z, 1, .6, 1, J(r, .5), J(r, .5))); b.push(part(G.cone, 0xf08a24, x, .05, z, .9, .4, .9, Math.PI, 0)); } return [a, b]; },
  corn(r) { const a = [], b = []; for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * .95, z = (Math.floor(i / 2) - .5) * .95; a.push(part(G.stem, 0x4f9a3a, x, 1.3, z, 2, 2.6, 2)); a.push(part(G.box, 0x3d8a30, x + .32, 1.7, z, .7, .05, .18, 0, .4)); a.push(part(G.box, 0x3d8a30, x - .32, 1.2, z, .7, .05, .18, 0, -.4)); b.push(part(G.cyl, 0xf2d21b, x + .16, 1.5, z, .11, .5, .11)); } return [a, b]; },
  potato(r) { const a = [], b = []; for (let i = 0; i < 6; i++) { const x = J(r, 1.4), z = J(r, 1.4); a.push(part(G.sph, 0x4f9a3a, x, .25, z, .34, .24, .34)); } for (let i = 0; i < 8; i++) b.push(part(G.sph, 0xb8895a, J(r, 1.5), .06, J(r, 1.5), .16, .11, .16)); return [a, b]; },
  cabbage(r) { const a = [], b = []; for (let i = 0; i < 3; i++) { const x = (i - 1) * .6, z = J(r, .5); a.push(part(G.sph, 0x58b04a, x, .35, z, .5, .38, .5)); b.push(part(G.sph, 0x9ed67a, x, .5, z, .36, .3, .36)); } return [a, b]; },
  strawberry(r) { const a = [], b = []; for (let i = 0; i < 6; i++) a.push(part(G.sph, 0x3f9a46, J(r, 1.5), .16, J(r, 1.5), .3, .14, .3)); for (let i = 0; i < 9; i++) b.push(part(G.sph, 0xe0314b, J(r, 1.5), .17, J(r, 1.5), .09, .1, .09)); return [a, b]; },
  tomato(r) { const a = [], b = []; for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * .95, z = (Math.floor(i / 2) - .5) * .95; a.push(part(G.stem, 0x5aa04a, x, .65, z, 1.4, 1.3, 1.4)); a.push(part(G.sph, 0x3f9a46, x, .9, z, .35, .25, .35)); for (let k = 0; k < 2; k++) b.push(part(G.sph, 0xe53935, x + J(r, .4), .5 + k * .35, z + J(r, .4), .14, .14, .14)); } return [a, b]; },
  sunflower(r) { const a = [], b = []; for (let i = 0; i < 3; i++) { const x = (i - 1) * .6, z = J(r, .5); a.push(part(G.stem, 0x5a9e3a, x, 1.1, z, 2.2, 2.2, 2.2)); a.push(part(G.box, 0x3d8a30, x + .3, .9, z, .6, .05, .22, 0, .4)); b.push(part(G.cyl, 0xf6c615, x, 2.3, z, .42, .06, .42)); b.push(part(G.cyl, 0x5a3a1a, x, 2.34, z, .24, .06, .24)); } return [a, b]; },
  pumpkin(r) { const a = [], b = []; a.push(part(G.stem, 0x4f8a3a, 0, .1, 0, 1.4, .1, 1.4, 0, Math.PI / 2)); for (let i = 0; i < 4; i++) a.push(part(G.box, 0x3d8a30, J(r, 1.4), .2, J(r, 1.4), .5, .05, .4)); for (let i = 0; i < 2; i++) b.push(part(G.sph, 0xf08a1f, (i - .5) * .9, .38, J(r, .5), .45, .36, .45)); return [a, b]; }
};
// extra crops reuse the shapes above with different colours/proportions
BUILD.radish = function (r) { const a = [], b = []; for (let i = 0; i < 8; i++) { const x = J(r, 1.5), z = J(r, 1.5); a.push(part(G.cone, 0x4fae4f, x, .28, z, 1, .55, 1, J(r, .5), J(r, .5))); b.push(part(G.sph, 0xe0457b, x, .08, z, .15, .13, .15)); } return [a, b]; };
BUILD.onion = function (r) { const a = [], b = []; for (let i = 0; i < 10; i++) { const x = J(r, 1.6), z = J(r, 1.6); a.push(part(G.stem, 0x6fbf5a, x, .45, z, 1, .9, 1, J(r, .15), J(r, .15))); b.push(part(G.sph, 0xf0dca0, x, .1, z, .2, .17, .2)); } return [a, b]; };
BUILD.eggplant = function (r) { const a = [], b = []; for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * .95, z = (Math.floor(i / 2) - .5) * .95; a.push(part(G.stem, 0x4a8a3a, x, .6, z, 1.4, 1.2, 1.4)); a.push(part(G.sph, 0x3f8a3a, x, .85, z, .4, .28, .4)); for (let k = 0; k < 2; k++) b.push(part(G.sph, 0x5b2a86, x + J(r, .35), .45 + k * .3, z + J(r, .35), .15, .27, .15)); } return [a, b]; };
BUILD.watermelon = function (r) { const a = [], b = []; a.push(part(G.stem, 0x4f8a3a, 0, .1, 0, 1.5, .1, 1.5, 0, Math.PI / 2)); for (let i = 0; i < 5; i++) a.push(part(G.box, 0x3d8a30, J(r, 1.5), .2, J(r, 1.5), .5, .05, .42)); for (let i = 0; i < 2; i++) { b.push(part(G.sph, 0x2f7d3b, (i - .5) * .95, .42, J(r, .4), .55, .42, .42)); b.push(part(G.sph, 0x7bc46a, (i - .5) * .95, .42, J(r, .4) + .02, .56, .1, .43)); } return [a, b]; };
export function makeCropField(scene, N) {
  // Every InstancedMesh draws only as many instances as are really in use (mesh.count), so an empty field costs nothing.
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), kinds = {}, tmp = new THREE.Matrix4(), tmp2 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const dirty = new Set(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  function mk(geo, material) { const m = new THREE.InstancedMesh(geo, material, N); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.userData.tiles = []; m.userData.map = new Map(); scene.add(m); return m; }
  let seed = 11; Object.keys(BUILD).forEach(function (id) {
    seed += 7; const r = rng(seed), parts = BUILD[id](r);
    kinds[id] = { gm: mk(mergeGeoms(parts[0]), mat), rm: mk(mergeGeoms(parts[1]), mat) };
  });
  const soil = mk(new THREE.BoxGeometry(TILE - .12, .22, TILE - .12), new THREE.MeshLambertMaterial({ color: 0xffffff })); soil.receiveShadow = true;
  const DRY = new THREE.Color(0x7a5230), WET = new THREE.Color(0x4a2e17);
  // put a matrix for tile i into mesh m (adds a slot if the tile is new)
  function put(m, i, matrix) { const u = m.userData; let s = u.map.get(i); if (s === undefined) { s = u.tiles.length; u.tiles.push(i); u.map.set(i, s); m.count = u.tiles.length; } m.setMatrixAt(s, matrix); dirty.add(m); return s; }
  // take tile i out of mesh m: the last instance moves into the freed slot
  function drop(m, i) {
    const u = m.userData, s = u.map.get(i); if (s === undefined) return; const last = u.tiles.length - 1;
    if (s !== last) { const moved = u.tiles[last]; m.getMatrixAt(last, tmp2); m.setMatrixAt(s, tmp2); if (m.instanceColor) { m.getColorAt(last, col); m.setColorAt(s, col); } u.tiles[s] = moved; u.map.set(moved, s); }
    u.tiles.pop(); u.map.delete(i); m.count = u.tiles.length; dirty.add(m);
  }
  const state = new Array(N).fill(null);
  return {
    // hasSoil: tile is plowed; wet: crop has been watered; type: crop id or null; scale: growth 0..1; ripe: ready to harvest
    set: function (i, x, z, hasSoil, wet, type, scale, ripe) {
      type = type || null; const sq = type ? Math.round(scale * 20) : 0, rp = !!(type && ripe), sv = hasSoil ? (wet ? 2 : 1) : 0, old = state[i];
      if (old && old.soil === sv && old.type === type && old.sq === sq && old.ripe === rp) return;
      if (!old || old.soil !== sv) { if (sv === 0) drop(soil, i); else { tmp.makeTranslation(x, .11, z); const s = put(soil, i, tmp); soil.setColorAt(s, sv === 2 ? WET : DRY); } }
      if (old && old.type && old.type !== type) { drop(kinds[old.type].gm, i); drop(kinds[old.type].rm, i); }
      if (type) {
        const k = kinds[type]; pos.set(x, .2, z);
        if (!old || old.type !== type || old.sq !== sq) { sc.set(1, Math.max(.05, sq / 20), 1); tmp.compose(pos, q, sc); put(k.gm, i, tmp); }
        if (rp) { if (!old || old.type !== type || !old.ripe) { tmp.compose(pos, q, one); put(k.rm, i, tmp); } }
        else if (old && old.type === type && old.ripe) drop(k.rm, i);
      }
      state[i] = { soil: sv, type: type, sq: sq, ripe: rp };
    },
    commit: function () { dirty.forEach(function (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }); dirty.clear(); }
  };
}
function mergeGeoms(list) { return THREE.mergeGeometries(list, false); }

// ---- animals
export function makeAnimal(type) {
  const g = new THREE.Group();
  if (type === 'chicken') {
    sph(g, .38, 0xffffff, 0, .55, 0, 1, .9, 1.25); sph(g, .2, 0xffffff, 0, .98, .42); box(g, .1, .12, .05, 0xf2a900, 0, .95, .62); box(g, .06, .14, .22, 0xd62828, 0, 1.15, .42);
    box(g, .08, .35, .08, 0xf2a900, -.15, .18, 0); box(g, .08, .35, .08, 0xf2a900, .15, .18, 0); g.userData.speed = 1.1;
  } else if (type === 'sheep') {
    sph(g, .62, 0xf2efe6, 0, 1.05, 0, 1, .85, 1.35); for (const [x, z] of [[-.35, .5], [.35, .5], [-.35, -.5], [.35, -.5], [0, 0]]) sph(g, .38, 0xf7f5ee, x, 1.35, z);
    box(g, .42, .5, .5, 0x3a3a3a, 0, 1.25, 1.0); box(g, .12, .22, .12, 0x2a2a2a, -.27, 1.52, .95); box(g, .12, .22, .12, 0x2a2a2a, .27, 1.52, .95);
    for (const x of [-.3, .3]) for (const z of [-.5, .5]) box(g, .14, .6, .14, 0x3a3a3a, x, .3, z); g.userData.speed = .8;
  } else {
    box(g, 1.3, 1.1, 2.2, 0xf4f4f4, 0, 1.45, 0); box(g, .5, .5, .4, 0x222222, .35, 1.7, .3).scale.set(1, 1, 1); box(g, .6, .5, .5, 0x222222, -.3, 1.45, -.5);
    box(g, .75, .8, .8, 0xf4f4f4, 0, 1.75, 1.5); box(g, .5, .35, .3, 0xf2b6b6, 0, 1.55, 1.95); box(g, .1, .25, .1, 0xe8e0c8, -.3, 2.25, 1.4); box(g, .1, .25, .1, 0xe8e0c8, .3, 2.25, 1.4);
    for (const x of [-.45, .45]) for (const z of [-.8, .8]) box(g, .22, .95, .22, 0xf4f4f4, x, .48, z);
    g.userData.speed = .7;
  }
  const icon = new THREE.Mesh(type === 'chicken' ? new THREE.SphereGeometry(.22, 10, 8) : new THREE.BoxGeometry(.4, .45, .4), new THREE.MeshBasicMaterial({ color: type === 'chicken' ? 0xfff6e0 : (type === 'sheep' ? 0xf0e6ff : 0x9fd8ff) }));
  if (type === 'chicken') icon.scale.set(.8, 1.1, .8);
  icon.position.y = type === 'chicken' ? 2 : (type === 'sheep' ? 2.4 : 3.3); icon.visible = false; g.add(icon); g.userData.icon = icon;
  return g;
}
export { THREE };
