// Neighborly Acre: 3D world builders (scenery, farmer, tractor, crops, animals). Uses the local three.js bundle.
import * as THREE from './three.min.js';

export const TILE = 2, COLS = 20, ROWS = 12, FIELD_TILES = COLS * ROWS;     // one field: 20x12 tiles of 2 units (big enough to need a tractor)
// six fields. Field 0 is the original one (saved farms keep working); the top row is open, the bottom row is land for sale.
// 24 plots in a grid of 3 columns; Field 0 is the original one (saved farms keep working). Plots appear on the map one at a time as land gets bought.
export const FIELDS = Array.from({ length: 24 }, (_, i) => ({ x0: [26, -20, -66][i % 3], z0: 2 + 30 * Math.floor(i / 3) }));
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
export const COMPOST_POS = { x: -26.6, z: -27.6 };   // compost tower: just outside the pasture's corner, toward the farmyard
export const TRACTOR_HOME = { x: -9, z: -3, ry: .6 };
// field 1 sits right beside the barn, silo and truck, so its vehicles park further along the field edge, clear of them
const NEAR_BARN = f => f === 0;
export function parkFor(f) { const F = FIELDS[f] || FIELDS[0]; return { x: F.x0 + (NEAR_BARN(f) ? 16 : 6), z: F.z0 - 3.5, ry: .6 }; }
export const inBarnZone = p => !!p && p.x > 14 && p.x < 40 && p.z > -14 && p.z < 2;
export const ELEVATOR_POS = { x: 52.5, z: -4.6 };   // moved out east, away from the shop          // where the truck tips its load at the grain elevator (the silo)
export const TRUCK_HOME = { x: 37.5, z: -10, ry: -Math.PI / 2 };   // parked behind the silo, well clear of the shop door and the yard
export function parkCombine(f) { const F = FIELDS[f] || FIELDS[0]; return { x: F.x0 + (NEAR_BARN(f) ? 24 : 13.5), z: F.z0 - 3.5, ry: .6 }; }
export function parkTrailer(f) { const F = FIELDS[f] || FIELDS[0]; return { x: F.x0 + (NEAR_BARN(f) ? 32 : 20.5), z: F.z0 - 3.5, ry: Math.PI / 2 }; }
export const COLLIDERS = [{ x: -26.6, z: -27.6, r: 1.7 }, { x: -24, z: -8, r: 6.2 }, { x: 22, z: -9, rect: { x0: 15.5, x1: 28.5, z0: -13.5, z1: -4.6 } }, { x: 52, z: -12, r: 3 }];
export const HOUSE_DOOR = { x: -24, z: -3.6 };   // walk up to the farmhouse door to go inside

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
  ground.rotation.x = -Math.PI / 2; ground.scale.y = 1.9; ground.position.z = 150; ground.receiveShadow = true; scene.add(ground);
  // fields: stubble base + wooden border + number; a FOR SALE sign while the land is not owned yet
  W.fields = FIELDS.map(function (F, idx) {
    const cx = F.x0 + COLS * TILE / 2, cz = F.z0 + ROWS * TILE / 2, fw = COLS * TILE + 1.4, fd = ROWS * TILE + 1.4, g = new THREE.Group(); scene.add(g);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), mat(0x6f8f3a)); base.rotation.x = -Math.PI / 2; base.position.set(cx, .02, cz); base.receiveShadow = true; g.add(base);
    const border = [[0, -fd / 2, fw, .5], [0, fd / 2, fw, .5], [-fw / 2, 0, .5, fd], [fw / 2, 0, .5, fd]].map(function (b) { return box(g, b[2], .45, b[3], 0x8b5a2b, cx + b[0], .22, cz + b[1], false); });
    let tag = null, sign = null, status = null;
    return {
      setVisible: function (v) { g.visible = !!v; },
      // a status sign over the field (countdown / READY / needs water); text null hides it. Only redrawn when the text changes.
      setStatus: function (text, color) {
        const drop = function () { if (!status) return; g.remove(status); if (status.material.map) status.material.map.dispose(); status.material.dispose(); status = null; };
        if (!text) { drop(); return; }
        if (status && status.userData.key === text + color) return; drop();
        status = makeLabel(text, color || '#ffffff', 384); status.userData.key = text + color; status.position.set(cx, 4.2, F.z0 - 1.6); status.scale.set(8.4, 1.4, 1); g.add(status);
      },
      // name: owner's name (null = nobody owns it yet); mine: it is the local player's; saleText: what the FOR SALE sign says;
      // color: the owner's primary colour ('#rrggbb'): the field number and the border around the field are painted in it
      setOwner: function (name, mine, saleText, color) {
        base.material = mat(name ? 0x6f8f3a : 0x9aa86a);
        const col = name ? (color || (mine ? '#86efac' : '#bae6fd')) : null, key = (name || '') + '|' + col;
        border.forEach(function (b) { b.material = mat(col ? parseInt(col.slice(1), 16) : 0x8b5a2b); });
        if (!tag || tag.userData.key !== key) { if (tag) g.remove(tag); tag = makeLabel('Field ' + (idx + 1), col || '#ffffff', 384); tag.userData.key = key; tag.position.set(F.x0 + 3, 2.6, F.z0 - 1.4); tag.scale.set(7.2, 1.2, 1); g.add(tag); }
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
  { const hs = makeLabel('🏠 FARMHOUSE', '#ffe08a'); hs.position.set(0, 9.4, 0); hs.scale.set(5, 1.25, 1); house.add(hs); }
  // barn
  const barn = new THREE.Group(); barn.position.set(22, 0, -9); scene.add(barn);
  box(barn, 12, 6.5, 9, 0xb3382c, 0, 3.25, 0);
  box(barn, 4.2, 5, .25, 0xf5f5f5, 0, 2.6, 4.55); box(barn, .35, 5, .3, 0xffffff, -2.1, 2.6, 4.6); box(barn, .35, 5, .3, 0xffffff, 2.1, 2.6, 4.6);
  const rl = box(barn, 7.6, .5, 10, 0x5b3b2a, -3.1, 8.0, 0); rl.rotation.z = .62;
  const rr = box(barn, 7.6, .5, 10, 0x5b3b2a, 3.1, 8.0, 0); rr.rotation.z = -.62;
  const sign = makeLabel('SHOP', '#ffe08a'); sign.position.set(0, 6.2, 5.2); sign.scale.set(5, 1.25, 1); barn.add(sign);
  // silo
  const silo = new THREE.Group(); silo.position.set(52, 0, -12); scene.add(silo);
  cyl(silo, 2.2, 2.2, 10, 0xcfd3d8, 0, 5, 0, 20); const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8e949b)); dome.position.y = 10; dome.castShadow = true; silo.add(dome);
  { const es = makeLabel('GRAIN ELEVATOR', '#ffe08a', 384); es.position.set(52, 12.6, -12); es.scale.set(7.2, 1.2, 1); scene.add(es);
    const hop = new THREE.Group(); hop.position.set(ELEVATOR_POS.x, 0, -8.6); scene.add(hop);
    box(hop, 3.2, .35, 3.6, 0x777f88, 0, .18, 0); box(hop, 2.4, 1.1, 2.6, 0x9aa3ad, 0, .9, 0); const fn = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 4), mat(0x8e949b)); fn.rotation.y = Math.PI / 4; fn.position.set(0, 2.1, 0); fn.rotation.x = Math.PI; fn.castShadow = true; hop.add(fn); }
  // pens
  fence(scene, CHICKEN_PEN.x0 - 1, CHICKEN_PEN.z0 - 1, CHICKEN_PEN.x1 + 1, CHICKEN_PEN.z1 + 1, 'w');
  fence(scene, COW_PASTURE.x0 - 1, COW_PASTURE.z0 - 1, COW_PASTURE.x1 + 1, COW_PASTURE.z1 + 1, 'e');
  const coop = new THREE.Group(); coop.position.set(37.5, 0, -30); scene.add(coop); box(coop, 3, 2, 2.4, 0xd9b26f, 0, 1, 0); const cr = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), mat(0x8a3b2d)); cr.rotation.y = Math.PI / 4; cr.position.y = 2.6; cr.scale.z = .8; coop.add(cr);
  // compost tower (fertilizer from the cows, pigs and sheep): a green silo with a see-through window that fills up
  { const ct = new THREE.Group(); ct.position.set(COMPOST_POS.x, 0, COMPOST_POS.z); scene.add(ct);
    cyl(ct, 1.4, 1.5, .4, 0x6b5a45, 0, .2, 0, 16); cyl(ct, 1.25, 1.25, 4.6, 0x3f7d3a, 0, 2.7, 0, 16);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.1, 16), mat(0x2f5e2b)); cap.position.y = 5.55; cap.castShadow = true; ct.add(cap);
    box(ct, .7, 4.2, .08, 0x1c2a1a, 0, 2.6, 1.27);                                         // window
    const fill = box(ct, .58, 4.0, .06, 0x6b4a2b, 0, 0.6, 1.3); fill.geometry.translate(0, 2.0, 0); fill.position.y = 0.6; fill.scale.y = .01; W.compostFill = fill;
    const lb = makeLabel('🧪 COMPOST', '#bbf7d0'); lb.position.set(0, 6.9, 0); lb.scale.set(3.6, .9, 1); ct.add(lb); }
  // trees (seeded, away from play areas)
  const r = rng(42), keep = (x, z) => !(x > -74 && x < 74 && z > -10 && z < 124) && !(x > 25 && x < 45 && z > -41 && z < -25) && !(x < -26 && x > -48 && z > -48 && z < -27) && !(Math.abs(x + 24) < 8 && Math.abs(z + 8) < 8) && !(Math.abs(x - 24) < 12 && Math.abs(z + 9) < 10) && !(Math.abs(x - 52) < 9 && Math.abs(z + 11) < 9);
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
    } catch (e) { /* tainted or unreadable image: keep the plain face */ }
  };
  img.onerror = function () {}; img.src = url;   // blocked by the image host's CORS rules -> keep the plain face
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

// ---- harvest chain: combine harvester, grain trailer, truck
function wheelAt(g, x, y, z, r, w) { const c = cyl(g, r, r, w, 0x1a1a1a, x, y, z, 18); c.rotation.z = Math.PI / 2; const h = cyl(g, r * .5, r * .5, w + .04, 0xe6c200, x, y, z, 12); h.rotation.z = Math.PI / 2; return [c, h]; }
export function makeCombine(color, width) {
  const g = new THREE.Group(), base = new THREE.Color(color || 0x2e8b3a), bodyC = base.getHex(), lightC = base.clone().lerp(new THREE.Color(0xffffff), .25).getHex(), roofC = base.clone().multiplyScalar(.7).getHex();
  box(g, 3.2, 1.7, 5.6, bodyC, 0, 2.0, -.6);                       // body
  box(g, 2.6, 1.5, 2.6, lightC, 0, 3.7, -1.9);                       // grain tank
  box(g, 2.4, 1.7, 1.9, lightC, 0, 3.55, 1.5);                       // cab
  const gl = box(g, 2.2, 1.2, .08, 0x9fd4ff, 0, 3.65, 2.48); gl.material = new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: .55 });
  box(g, 2.8, .15, 2.3, roofC, 0, 4.5, 1.5);                         // cab roof
  const aug = box(g, .35, .35, 4.2, 0xf2c200, 1.75, 4.5, -1.2); aug.rotation.y = 0;   // unloading auger
  box(g, .35, 1.2, .35, 0xf2c200, 1.75, 3.9, -3.1);
  const hw = width || 9.6, hd = new THREE.Group(); hd.position.set(0, 0, 4.4); g.add(hd); g.userData.header = hd;
  box(hd, hw, .55, 1.4, 0xf2c200, 0, 1.0, 0); box(hd, hw, .9, .12, 0xd9ad00, 0, 1.5, -.7);
  const reel = cyl(hd, .45, .45, hw - .3, 0x9a6b1f, 0, 1.55, .5, 10); reel.rotation.z = Math.PI / 2; g.userData.reel = reel;
  box(hd, .12, .5, 1.4, 0xd9ad00, -hw / 2, 1.15, 0); box(hd, .12, .5, 1.4, 0xd9ad00, hw / 2, 1.15, 0);
  g.userData.wheels = [].concat(wheelAt(g, -1.75, 1.05, 1.4, 1.05, .8), wheelAt(g, 1.75, 1.05, 1.4, 1.05, .8), wheelAt(g, -1.4, .65, -2.9, .65, .55), wheelAt(g, 1.4, .65, -2.9, .65, .55));
  const fill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), mat(0xe6c84a)); fill.position.set(0, 4.5, -1.9); fill.visible = false; g.add(fill); g.userData.fill = fill;
  g.userData.setFill = function (frac, color) { fill.visible = frac > .02; fill.scale.y = Math.max(.02, frac) * .5; fill.position.y = 4.4 + Math.max(.02, frac) * .25; if (color) fill.material = mat(color); };
  return g;
}
export function setHeaderWidth(combine, w) { combine.userData.header.scale.x = w / 9.6; }
export function makeTrailer(color) {
  const g = new THREE.Group(), c = color || 0x8a6a3a;
  box(g, 3.4, .3, 6.6, 0x555b61, 0, 1.0, 0);                               // bed
  box(g, .2, 1.2, 6.6, c, -1.65, 1.7, 0); box(g, .2, 1.2, 6.6, c, 1.65, 1.7, 0); box(g, 3.4, 1.2, .2, c, 0, 1.7, -3.2); box(g, 3.4, 1.2, .2, c, 0, 1.7, 3.2);
  box(g, .3, .3, 2, 0x333333, 0, .9, 4.3);                                 // drawbar
  g.userData.wheels = [].concat(wheelAt(g, -1.75, .8, -1.6, .8, .5), wheelAt(g, 1.75, .8, -1.6, .8, .5), wheelAt(g, -1.75, .8, -.6, .8, .5), wheelAt(g, 1.75, .8, -.6, .8, .5));
  const fill = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1, 6.0), mat(0xe6c84a)); fill.visible = false; g.add(fill); g.userData.fill = fill;
  g.userData.setFill = function (frac, color) { fill.visible = frac > .01; const h = Math.max(.02, frac) * 1.1; fill.scale.y = h; fill.position.y = 1.15 + h / 2; if (color) fill.material = mat(color); };
  return g;
}
export function makeTruck(color) {
  const g = new THREE.Group(), c = color || 0xc0392b;
  box(g, 2.5, .5, 8.0, 0x333a40, 0, 1.0, -.2);                              // chassis
  box(g, 2.4, 2.0, 2.2, c, 0, 2.2, 2.8);                                    // cab
  const gl = box(g, 2.0, .9, .08, 0x9fd4ff, 0, 2.6, 3.92); gl.material = new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: .6 });
  box(g, 2.2, 1.0, 1.4, c, 0, 1.7, 4.5);                                    // hood
  box(g, 2.5, .22, 2.2, 0x555b61, 0, 1.4, -2.4);                            // hitch plate
  for (const x of [-.7, .7]) sph(g, .16, 0xfff3b0, x, 1.55, 5.25);
  g.userData.wheels = [].concat(wheelAt(g, -1.3, .75, 3.6, .75, .5), wheelAt(g, 1.3, .75, 3.6, .75, .5), wheelAt(g, -1.3, .75, -1.2, .75, .5), wheelAt(g, 1.3, .75, -1.2, .75, .5), wheelAt(g, -1.3, .75, -2.6, .75, .5), wheelAt(g, 1.3, .75, -2.6, .75, .5));
  return g;
}

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
  const SOIL = [null, new THREE.Color(0x7a5230), new THREE.Color(0x4a2e17), new THREE.Color(0xa87846), new THREE.Color(0x6b4423),   // plowed dry / wet, cultivated dry / wet (lighter, loosened soil)
    new THREE.Color(0x6f8a2e), new THREE.Color(0x46661c), new THREE.Color(0x7f9a38), new THREE.Color(0x52742a)];   // the same four, fertilized: olive-green soil so you can see what's covered
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
    set: function (i, x, z, hasSoil, wet, type, scale, ripe, cult, fert) {
      type = type || null; const sq = type ? Math.round(scale * 20) : 0, rp = !!(type && ripe), sv = hasSoil ? (wet ? 2 : 1) + (cult ? 2 : 0) + (fert ? 4 : 0) : 0, old = state[i];
      if (old && old.soil === sv && old.type === type && old.sq === sq && old.ripe === rp) return;
      if (!old || old.soil !== sv) { if (sv === 0) drop(soil, i); else { tmp.makeTranslation(x, .11, z); const s = put(soil, i, tmp); soil.setColorAt(s, SOIL[sv]); } }
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
  } else if (type === 'duck') {
    sph(g, .34, 0xf5f0dc, 0, .5, 0, 1, .85, 1.3); sph(g, .19, 0x2f7a4a, 0, .92, .38); box(g, .2, .06, .22, 0xf29a00, 0, .88, .62); box(g, .1, .1, .1, 0xf5f0dc, 0, .62, -.45);
    box(g, .09, .3, .09, 0xf29a00, -.13, .15, 0); box(g, .09, .3, .09, 0xf29a00, .13, .15, 0); g.userData.speed = 1;
  } else if (type === 'goat') {
    sph(g, .42, 0xb89a74, 0, 1.0, 0, .85, .75, 1.35); box(g, .3, .36, .42, 0xcdb48e, 0, 1.28, .78); box(g, .22, .2, .22, 0x8a6f4d, 0, 1.12, 1.02);
    box(g, .06, .3, .06, 0x3a3029, -.1, 1.62, .72).rotation.z = .35; box(g, .06, .3, .06, 0x3a3029, .1, 1.62, .72).rotation.z = -.35; box(g, .05, .22, .12, 0xb89a74, 0, .78, 1.0);
    box(g, .1, .2, .1, 0xb89a74, 0, 1.15, -.62); for (const x of [-.2, .2]) for (const z of [-.4, .4]) box(g, .1, .55, .1, 0x6b5640, x, .28, z); g.userData.speed = .9;
  } else if (type === 'sheep') {
    // woolly cream body on long dark legs, with a dark face, sideways ears and a short tail, so it reads as a sheep, not a cloud
    sph(g, .5, 0xe3dac4, 0, 1.02, 0, 1, .78, 1.3);
    for (const [x, y, z] of [[-.3, 1.3, .35], [.3, 1.3, .35], [0, 1.38, -.1], [-.28, 1.28, -.45], [.28, 1.28, -.45]]) sph(g, .2, 0xefe7d3, x, y, z);
    sph(g, .16, 0xefe7d3, 0, 1.2, -.78);                                                       // tail tuft
    box(g, .34, .4, .46, 0x2b2522, 0, 1.12, .88); box(g, .26, .1, .2, 0x4a3f39, 0, 1.0, 1.12);  // head + muzzle
    sph(g, .13, 0xefe7d3, 0, 1.38, .8);                                                         // forehead tuft
    box(g, .3, .07, .16, 0x2b2522, -.32, 1.22, .8); box(g, .3, .07, .16, 0x2b2522, .32, 1.22, .8);   // ears stick out sideways
    box(g, .05, .05, .04, 0xffffff, -.1, 1.2, 1.09); box(g, .05, .05, .04, 0xffffff, .1, 1.2, 1.09);
    for (const x of [-.24, .24]) for (const z of [-.45, .45]) box(g, .11, .6, .11, 0x2b2522, x, .3, z);
    g.userData.speed = .8;
  } else if (type === 'pig') {
    sph(g, .55, 0xf2a7b8, 0, .78, 0, 1, .82, 1.4); sph(g, .36, 0xf2a7b8, 0, .9, .78); box(g, .3, .22, .12, 0xe58ca2, 0, .84, 1.12);
    box(g, .05, .07, .02, 0x7a3b4b, -.07, .84, 1.19); box(g, .05, .07, .02, 0x7a3b4b, .07, .84, 1.19);
    box(g, .16, .18, .06, 0xe58ca2, -.2, 1.22, .8).rotation.z = .4; box(g, .16, .18, .06, 0xe58ca2, .2, 1.22, .8).rotation.z = -.4;
    box(g, .05, .05, .03, 0x111111, -.14, 1.02, 1.08); box(g, .05, .05, .03, 0x111111, .14, 1.02, 1.08); sph(g, .08, 0xe58ca2, 0, .95, -.78);
    for (const x of [-.25, .25]) for (const z of [-.42, .42]) box(g, .14, .4, .14, 0xe58ca2, x, .2, z);
    g.userData.speed = .75;
  } else {
    box(g, 1.3, 1.1, 2.2, 0xf4f4f4, 0, 1.45, 0); box(g, .5, .5, .4, 0x222222, .35, 1.7, .3).scale.set(1, 1, 1); box(g, .6, .5, .5, 0x222222, -.3, 1.45, -.5);
    box(g, .75, .8, .8, 0xf4f4f4, 0, 1.75, 1.5); box(g, .5, .35, .3, 0xf2b6b6, 0, 1.55, 1.95); box(g, .1, .25, .1, 0xe8e0c8, -.3, 2.25, 1.4); box(g, .1, .25, .1, 0xe8e0c8, .3, 2.25, 1.4);
    for (const x of [-.45, .45]) for (const z of [-.8, .8]) box(g, .22, .95, .22, 0xf4f4f4, x, .48, z);
    g.userData.speed = .7;
  }
  const small = type === 'chicken' || type === 'duck', icon = new THREE.Mesh(small ? new THREE.SphereGeometry(.22, 10, 8) : new THREE.BoxGeometry(.4, .45, .4), new THREE.MeshBasicMaterial({ color: small ? 0xfff6e0 : (type === 'sheep' ? 0xf0e6ff : type === 'goat' ? 0xffe9b0 : type === 'pig' ? 0xd9b38c : 0x9fd8ff) }));
  if (small) icon.scale.set(.8, 1.1, .8);
  icon.position.y = small ? 2 : (type === 'sheep' || type === 'goat' ? 2.4 : type === 'pig' ? 1.9 : 3.3); icon.visible = false; g.add(icon); g.userData.icon = icon;
  return g;
}
export { THREE };
