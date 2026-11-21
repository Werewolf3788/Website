// Tile Survival: walk your survivor around a 3D settlement, chop trees, mine rocks, hunt, carry resources to build pads,
// clear the fog area by area, fight the infected with a hero squad, and follow Sarge's missions. Allies can help build timers.
import * as THREE from './three.min.js';

const $ = id => document.getElementById(id);
const WW = window.WW || null;
const Z = 24, G = 5, HALF = Z * G / 2, NOW = () => Date.now();
let ppPath = null;   // the dirt path ring around the Power Plant (follows it when it's moved)
// wood has no emoji every computer can draw (🪵 shows as an empty box on older Windows), so it is a drawn log:
// LOGT is a placeholder character in text; RH() turns it into the log picture in menus, and the canvas labels draw it directly.
const LOGT = '\uE000';
function drawLog(g, x, y, s) {   // a log lying on its side, s px wide, centred on x,y
  const h = s * .5, l = x - s / 2, t = y - h / 2;
  g.fillStyle = '#8b5a2b'; g.beginPath(); g.moveTo(l + h / 2, t); g.lineTo(l + s - h / 2, t); g.lineTo(l + s - h / 2, t + h); g.lineTo(l + h / 2, t + h); g.closePath(); g.fill();
  g.strokeStyle = '#5b3a1a'; g.lineWidth = Math.max(1, s / 22); for (let k = 1; k <= 2; k++) { g.beginPath(); g.moveTo(l + h / 2 + 2, t + h * k / 3); g.lineTo(l + s - h / 2 - 2, t + h * k / 3); g.stroke(); }
  g.fillStyle = '#6b4423'; g.beginPath(); g.ellipse(l + h / 2, y, h * .32, h / 2, 0, 0, 7); g.fill();
  g.fillStyle = '#e7c48a'; g.beginPath(); g.ellipse(l + s - h / 2, y, h * .36, h / 2, 0, 0, 7); g.fill();
  g.strokeStyle = '#b8894f'; g.beginPath(); g.ellipse(l + s - h / 2, y, h * .2, h * .28, 0, 0, 7); g.stroke();
}
const LOG_URL = (() => { try { const c = document.createElement('canvas'); c.width = 64; c.height = 64; drawLog(c.getContext('2d'), 32, 32, 60); return c.toDataURL(); } catch (e) { return ''; } })();
const escH = t => String(t).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);
const RH = h => String(h).split(LOGT).join('<img src="' + LOG_URL + '" alt="wood" style="height:1.15em;vertical-align:-.25em">');
const RES = { wood: LOGT, food: '🍖', metal: '🔩', gems: '💎' };
const SAVE_KEY = 'ts3_save', CLOUD_KEY = 'survive3', MAX_HELPS = 5, HELP_CUT = .15, CAMP_RESPAWN = 10 * 60000, BOSS_RESPAWN = 60 * 60000;

// ------------------------------------------------------------ buildings (all in the home area around the Power Plant)
const BD = {
  pp:       { n: 'Power Plant', i: '🔌', x: 0,  z: 0,  r: 2.7, need: 1, cost: { wood: 40, food: 20 } },
  lumber:   { n: 'Lumberyard',  i: '🌳', x: -8, z: -8, r: 2.2, need: 1, cost: { wood: 15 }, out: 'wood', rate: .12 },
  farm:     { n: 'Farm',        i: '🌽', x: 8,  z: -8, r: 2.2, need: 1, cost: { wood: 35 }, out: 'food', rate: .1 },
  house1:   { n: 'House',       i: '🏠', x: -8, z: 0,  r: 2.0, need: 1, cost: { wood: 30, food: 10 } },
  smelter:  { n: 'Smelter',     i: '🏭', x: 8,  z: 0,  r: 2.2, need: 2, cost: { wood: 60, food: 20, metal: 10 }, out: 'metal', rate: .05 },
  hall:     { n: 'Hero Hall',   i: '🛡️', x: 0,  z: -8, r: 2.3, need: 2, cost: { wood: 80, metal: 30 } },
  house2:   { n: 'House',       i: '🏠', x: -8, z: 8,  r: 2.0, need: 2, cost: { wood: 50, food: 20, metal: 15 } },
  workshop: { n: 'Workshop',    i: '🔨', x: 8,  z: 8,  r: 2.2, need: 3, cost: { wood: 90, metal: 45 } },
  house3:   { n: 'House',       i: '🏠', x: 0,  z: 8,  r: 2.0, need: 3, cost: { wood: 80, food: 30, metal: 30 } }
};
// where each building starts. Players can move them around their town (st.lay = { id: { x, z } }); applyLayout writes
// the current town's layout into BD so everything that reads BD[id].x / .z (crews, pads, walls, labels) follows along
const BD0 = {}; Object.keys(BD).forEach(id => { BD0[id] = { x: BD[id].x, z: BD[id].z }; });
function applyLayout(lay) { Object.keys(BD).forEach(id => { const p = lay && lay[id]; BD[id].x = p && isFinite(p.x) ? +p.x : BD0[id].x; BD[id].z = p && isFinite(p.z) ? +p.z : BD0[id].z; }); }
const HEROES = {
  sarge: { n: 'Sarge', i: '🎖️', role: 'Tank · front line', hp: 150, atk: 9, cd: 1, range: 1.6, shirt: 0x4d6b3a, hat: 0x3f5a2e, cost: {} },
  rusty: { n: 'Rusty', i: '🔧', role: 'Damage · shoots from range', hp: 80, atk: 14, cd: .9, range: 5.5, shirt: 0xd97706, hat: 0x7c2d12, cost: { metal: 40 } },
  leila: { n: 'Leila', i: '💉', role: 'Healer · patches up the squad', hp: 90, atk: 5, heal: 14, cd: 1.4, range: 5, shirt: 0xf1f5f9, hat: 0xdb2777, cost: { metal: 100, food: 60 } }
};
const heroStat = (id, lvl) => { const H = HEROES[id], m = Math.pow(1.2, lvl - 1); return { hp: Math.round(H.hp * m), atk: Math.round(H.atk * m), heal: Math.round((H.heal || 0) * m) }; };
const heroUpCost = l => ({ food: Math.round(25 * Math.pow(1.45, l - 1)), metal: Math.round(15 * Math.pow(1.45, l - 1)) });
const weaponDmg = w => Math.round(12 * Math.pow(1.3, w - 1));
const weaponCost = w => ({ wood: Math.round(30 * Math.pow(1.5, w - 1)), metal: Math.round(20 * Math.pow(1.5, w - 1)) });

function costFor(id, lvl) {
  const o = {}, base = BD[id].cost, f = id === 'pp' ? Math.pow(1.7, lvl - 2) : Math.pow(1.6, lvl - 1);
  Object.keys(base).forEach(k => { o[k] = Math.round(base[k] * f); });
  // metal (from rocks) is a real building material: every upgrade from level 2 on takes about 40% as much metal as wood
  if (id === 'pp' && lvl >= 3) o.metal = Math.round(30 * Math.pow(1.7, lvl - 3));
  if (id !== 'pp' && lvl >= 2) o.metal = Math.max(o.metal || 0, Math.round((o.wood || 0) * .4));
  return o;
}
const upTime = lvl => lvl <= 1 ? 0 : Math.round(30 * Math.pow(1.6, lvl - 2));

// ------------------------------------------------------------ map: 5 x 5 areas, home in the middle, fog on the rest
function hash(a, b) { let h = Math.imul(a + 71, 374761393) ^ Math.imul(b + 13, 668265263) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const RING1 = { '2,1': 'forest', '3,2': 'quarry', '2,3': 'wild', '1,2': 'infected', '3,1': 'forest', '3,3': 'infected', '1,3': 'quarry', '1,1': 'wild' };
const ring = (i, j) => Math.max(Math.abs(i - 2), Math.abs(j - 2));
function zoneType(i, j) {
  if (i === 2 && j === 2) return 'home'; const k = i + ',' + j; if (RING1[k]) return RING1[k];
  if ((i === 0 || i === 4) && (j === 0 || j === 4)) return 'boss';
  return ['forest', 'quarry', 'wild', 'infected'][hash(i, j) % 4];
}
const ZNAME = { forest: '🌲 Forest', quarry: '⛰️ Quarry', wild: '🦌 Wild lands', infected: '🧟 Infected camp', boss: '👹 Boss lair', home: '🏠 Home' };
const zc = i => (i - 2) * Z;
const zoneAt = (x, z) => [Math.floor((x + HALF) / Z), Math.floor((z + HALF) / Z)];
const DIRS = [[0, -1, 4, -10.8], [1, 0, 10.8, -4], [0, 1, 4, 10.8], [-1, 0, -10.8, -4]];

// ------------------------------------------------------------ save
let st = null;
function fresh() { return { v: 3, res: { wood: 0, food: 10, metal: 0, gems: 5 }, hp: 100, b: { pp: { lvl: 1 } }, piles: {}, paid: {}, zones: { '2,2': 1 }, camps: {}, boss: {}, heroes: { sarge: { lvl: 1 } }, lay: {}, weapon: 1, q: 0, stats: { wood: 0, metal: 0, food: 0, kills: 0, camps: 0, bosses: 0, zones: 0, collected: 0 }, last: NOW(), saved: 0 }; }
function fix(s) {
  const f = fresh(); Object.keys(f).forEach(k => { if (s[k] === undefined) s[k] = f[k]; });
  Object.keys(f.res).forEach(k => { s.res[k] = +s.res[k] || 0; }); Object.keys(f.stats).forEach(k => { s.stats[k] = +s.stats[k] || 0; });
  Object.keys(BD).forEach(id => { s.b[id] = s.b[id] || { lvl: 0 }; s.b[id].lvl = s.b[id].lvl | 0; if (!s.b[id].up) s.b[id].up = null; });
  if (s.b.pp.lvl < 1) s.b.pp.lvl = 1; s.zones['2,2'] = 1; if (!s.heroes.sarge) s.heroes.sarge = { lvl: 1 };
  return s;
}
const lvl = id => st.b[id].lvl;
const cap = id => id === 'pp' ? 20 : lvl('pp');
const survivors = () => 3 + 2 * ['house1', 'house2', 'house3'].reduce((a, h) => a + lvl(h), 0);
const producers = () => Object.keys(BD).filter(id => BD[id].out && lvl(id) > 0);
function efficiency() { const need = producers().length * 2, s = survivors(); let e = need ? Math.min(1, s / need) : 1; if (st.res.food <= 0) e *= .5; return e; }
const canPay = c => Object.keys(c).every(k => st.res[k] >= c[k]);
const pay = c => Object.keys(c).forEach(k => { st.res[k] -= c[k]; });
const give = c => Object.keys(c).forEach(k => { st.res[k] = (st.res[k] || 0) + c[k]; });
const costTxt = c => Object.keys(c).filter(k => c[k] > 0).map(k => RES[k] + Math.ceil(c[k])).join(' ');
function unlockCost(i, j) { const n = st.stats.zones, m = ring(i, j) === 2 ? 1.6 : 1, o = { wood: Math.round((30 + 22 * n) * m), food: Math.round((10 + 8 * n) * m) }; if (n >= 1) o.metal = Math.round(10 * n * m); return o; }

// Producers build the town a little at a time: 3% of everything the Lumberyard, Farm (hunters) and Smelter make is shared
// evenly across every building pad that still needs that resource. Once every building has caught up, 5% goes to the
// Power Plant's next level instead. The rest goes to the pile for you (to open up the map). A full pile's extra also feeds the builds.
const PILE_STOP = 1, SHARE_BUILD = .03, SHARE_PP = .05;
function feedPads(pads, keys, r, amount) {   // spread `amount` evenly over the pads in `keys`; returns what didn't fit
  let extra = amount;
  for (let pass = 0; pass < 3 && extra > 1e-6; pass++) {
    const open = keys.filter(k => (padLeft(k, pads[k])[r] || 0) > 0); if (!open.length) break; const share = extra / open.length;
    open.forEach(k => { const give = Math.min(share, padLeft(k, pads[k])[r]); (st.paid[k] = st.paid[k] || {})[r] = (st.paid[k][r] || 0) + give; extra -= give; });
  }
  return extra;
}
function addToPile(id, n) {
  if (!(n > 0)) return; const r = BD[id].out, pads = wantedPads();
  const bld = Object.keys(pads).filter(k => pads[k].kind !== 'zone' && pads[k].id !== 'pp' && (padLeft(k, pads[k])[r] || 0) > 0);
  const pp = Object.keys(pads).filter(k => pads[k].id === 'pp' && (padLeft(k, pads[k])[r] || 0) > 0);
  if (bld.length) { const cut = n * SHARE_BUILD; n -= cut - feedPads(pads, bld, r, cut); st.overflowAt = NOW(); }
  else if (pp.length) { const cut = n * SHARE_PP; n -= cut - feedPads(pads, pp, r, cut); st.overflowAt = NOW(); }
  // you're online and in town (the home area): it goes straight into your stockpile instead of the building's pile
  if (!tour && !awayNow && inTown()) { st.res[r] = (st.res[r] || 0) + n; st.stats.collected = (st.stats.collected || 0) + n; return; }
  const capP = 40 * lvl(id) * PILE_STOP, have = st.piles[id] || 0;
  if (have + n <= capP) { st.piles[id] = have + n; return; }
  const extra = have + n - Math.max(have, capP); st.piles[id] = Math.max(have, capP);
  feedPads(pads, bld.length ? bld : pp, r, extra); st.overflowAt = NOW();   // a full pile's extra goes to the builds too
}
// While you're off your map (game closed, or visiting an ally) only your crews keep the map going, at 1% speed: their haul
// goes into the town's builds first and the rest lands in the piles. Nothing goes to allies while you're offline (sharing
// only happens while you play). Upgrade timers keep running in real time.
// crews: one more worker than the building's level while you play (level 4 = 5), up to 8; 2 per building keep going while you're away
const crewSize = L => L >= 1 ? Math.min(8, L + 1) : 0, AWAY_CREW = 2;
const AWAY_RATE = .01, AWAY_MAX = 7 * 86400;
let awayNow = false;   // true while catching up on time away (that output goes to the buildings, not your pocket)
function inTown() { const [i, j] = zoneAt(player.x, player.z); return i === 2 && j === 2; }
// ------------------------------------------------------------ welcome back: one card with everything that happened while you were gone
let welcome = null;
const when = t => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return (today ? 'today ' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' ') + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
function showWelcome() {
  const W0 = welcome; if (!W0 || W0.shown || tour) return; W0.shown = true;
  const last = W0.news.reduce((m, n) => n.at > m.at ? n : m, { at: W0.lastAt, who: 'You', what: 'played' });
  let h = '<h3>👋 Welcome back!</h3><div class="muted">You were away for <b>' + fmt(W0.sec) + '</b> · last played ' + when(W0.lastAt) + '</div>';
  h += '<div class="row"><div class="g"><b>🕓 Last update</b><div class="muted">' + WW_esc(last.who) + ' ' + WW_esc(last.what) + ' · ' + when(last.at) + '</div></div></div>';
  const raids = W0.news.filter(n => n.raid), allies = W0.news.filter(n => !n.raid);
  if (raids.length) h += '<div class="row"><div class="g"><b>⚔️ Raids</b><div class="muted">' + raids.map(n => WW_esc(n.who) + ' raided you' + (n.took ? ' and took ' + n.took : '') + ' · ' + when(n.at)).join('<br>') + '<br>Get revenge from 🤝 Allies.</div></div></div>';
  if (allies.length || W0.helps) h += '<div class="row"><div class="g"><b>🤝 Allies</b><div class="muted">' + allies.map(n => WW_esc(n.who) + ' ' + WW_esc(n.what) + (n.got ? ': +' + n.got : '') + ' · ' + when(n.at)).concat(W0.helps ? ['Allies sped up your upgrades ' + W0.helps + ' time' + (W0.helps > 1 ? 's' : '')] : []).join('<br>') + '</div></div></div>';
  const bp = [];
  (W0.ups || []).forEach(e => bp.push(e));
  if (Object.keys(W0.built).length) bp.push('Your crews put ' + costTxt(W0.built) + ' into your builds');
  if (Object.keys(W0.piled).length) bp.push(costTxt(W0.piled) + ' waiting in the piles');
  h += '<div class="row"><div class="g"><b>🏗️ Building progress</b><div class="muted">' + (bp.length ? bp.join('<br>') : 'Nothing new: only your crews work while you\u2019re away (at ' + Math.round(AWAY_RATE * 100) + '% speed).') + '</div></div></div>';
  show(h);
}
const WW_esc = t => escH(t);
function awayCatchUp(sec, quiet) {
  sec = Math.min(AWAY_MAX, sec); const eff = sec * AWAY_RATE; if (eff < 1) return;
  let ev = []; awayNow = true; try { ev = economy(eff); } finally { awayNow = false; }
  const pads = wantedPads(), built = {}, toAllies = {}; let piled = {};
  Object.keys(ROLES).forEach(id => {
    const n = lvl(id) >= 1 ? AWAY_CREW : 0; if (!n) return; const R = ROLES[id], r = R.res;
    let amt = n * R.load * eff / 25;   // one trip about every 25 seconds per worker
    const keys = Object.keys(pads).filter(k => pads[k].kind !== 'zone' && (padLeft(k, pads[k])[r] || 0) > 0);
    const left = feedPads(pads, keys, r, amt); built[r] = (built[r] || 0) + (amt - left);
    const capP = 40 * lvl(id), have = st.piles[id] || 0, add = Math.min(left, Math.max(0, capP - have)); st.piles[id] = have + add; piled[r] = (piled[r] || 0) + add;
  });
  st.allyPending = st.allyPending || {}; Object.keys(toAllies).forEach(r => { st.allyPending[r] = (st.allyPending[r] || 0) + toAllies[r]; });
  const fl = o => { const x = {}; Object.keys(o).forEach(k => { if (o[k] >= 1) x[k] = Math.floor(o[k]); }); return x; };
  const b = fl(built), p = fl(piled);
  if (!quiet) { welcome = { sec: sec, lastAt: NOW() - sec * 1000, built: b, piled: p, ups: ev, news: [], helps: 0, shown: false }; return; }   // shown as the welcome-back card
  if (Object.keys(b).length) setTimeout(() => toast('👋 While you were away (' + fmt(sec) + ', at ' + Math.round(AWAY_RATE * 100) + '% speed): ' + (Object.keys(b).length ? 'your crews put ' + costTxt(b) + ' into builds' : 'your town kept ticking') + (Object.keys(p).length ? ' · ' + costTxt(p) + ' in the piles' : ''), 5000), 600);
}
function economy(dt) {
  const ev = [], now = NOW(), e = efficiency();
  if (!tour && !awayNow) producers().forEach(id => addToPile(id, BD[id].rate * lvl(id) * e * dt));   // while you're away only the crews work
  if (!awayNow) st.res.food = Math.max(0, st.res.food - survivors() * .004 * dt);
  Object.keys(BD).forEach(id => { const b = st.b[id]; if (b.up && now >= b.up.end) { b.lvl = b.up.to; b.up = null; ev.push('✅ ' + BD[id].n + ' is now level ' + b.lvl); dirtyBld[id] = 1; } });
  return ev;
}

// ------------------------------------------------------------ three.js scene
const cv = $('c'), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd3f0); scene.fog = new THREE.Fog(0x9fd3f0, 60, 120);
const camera = new THREE.PerspectiveCamera(40, 1, .5, 300);
const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); sun.shadow.bias = -.0005; scene.add(sun, sun.target);

const M = {};
const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); };
function box(p, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; }
function cyl(p, rt, rb, h, c, x, y, z, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), mat(c)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; }
function cone(p, r, h, c, x, y, z, seg) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 8), mat(c)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; p.add(m); return m; }
function roof(p, w, d, h, c, y) { const m = cone(p, Math.max(w, d) * .75, h, c, 0, y, 0, 4); m.rotation.y = Math.PI / 4; m.scale.set(w / Math.max(w, d) * 1.05, 1, d / Math.max(w, d) * 1.05); return m; }

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function textSprite(w) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sp.renderOrder = 12; w = w || 5; sp.scale.set(w, w * 96 / 512, 1);
  sp.userData.set = function (t, col, bg) {
    if (sp.userData.t === t) return; sp.userData.t = t; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 96); sp.visible = !!t; if (!t) return;
    g.font = 'bold 50px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const parts = String(t).split(LOGT), LW = 60; let w0 = 0; parts.forEach((pt, i) => { w0 += g.measureText(pt).width + (i ? LW : 0); });
    const tw = Math.min(504, w0 + 44); g.fillStyle = bg || 'rgba(15,23,42,.8)'; rr(g, 256 - tw / 2, 6, tw, 84, 26); g.fill();
    const k = Math.min(1, 470 / w0); g.save(); g.translate(256, 50); g.scale(k, 1); g.textAlign = 'left'; let x = -w0 / 2;
    parts.forEach((pt, i) => { if (i) { drawLog(g, x + LW / 2, 0, LW - 6); x += LW; } g.fillStyle = col || '#fff'; g.fillText(pt, x, 0); x += g.measureText(pt).width; });
    g.restore(); tex.needsUpdate = true;
  };
  return sp;
}
const iconTex = {};
function iconSprite(icon, s) {
  if (!iconTex[icon]) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); if (icon === LOGT) drawLog(g, 32, 34, 58); else { g.font = '52px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 32, 36); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; iconTex[icon] = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); }
  const sp = new THREE.Sprite(iconTex[icon]); sp.scale.setScalar(s || .9); sp.renderOrder = 13; return sp;
}
function hpBar(w, color) {
  const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(w, .16), new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false })), fg = new THREE.Mesh(new THREE.PlaneGeometry(w, .16), new THREE.MeshBasicMaterial({ color: color || 0xef4444, depthTest: false }));
  bg.renderOrder = 11; fg.renderOrder = 12; g.add(bg, fg); g.userData = { fg: fg, w: w }; return g;
}
function setBar(b, f) { f = Math.max(0, Math.min(1, f)); b.userData.fg.scale.x = Math.max(.0001, f); b.userData.fg.position.x = -(1 - f) * b.userData.w / 2; }
const _q = new THREE.Quaternion();
function faceCam(bar) { bar.parent.getWorldQuaternion(_q); bar.quaternion.copy(_q).invert().multiply(camera.quaternion); }

// ground, area grid lines, border woods
{
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const g = gc.getContext('2d'); g.fillStyle = '#5da347'; g.fillRect(0, 0, 256, 256); const r = rng(3);
  for (let i = 0; i < 2400; i++) { g.fillStyle = r() < .5 ? 'rgba(40,110,40,.3)' : 'rgba(140,200,80,.28)'; g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 5); }
  const t = new THREE.CanvasTexture(gc); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ map: t })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const lm = new THREE.MeshBasicMaterial({ color: 0x2f5e2a, transparent: true, opacity: .55 });
  for (let k = 0; k <= G; k++) { const p = -HALF + k * Z; const a = new THREE.Mesh(new THREE.PlaneGeometry(.18, Z * G), lm); a.rotation.x = -Math.PI / 2; a.position.set(p, .02, 0); scene.add(a); const b = new THREE.Mesh(new THREE.PlaneGeometry(Z * G, .18), lm); b.rotation.x = -Math.PI / 2; b.position.set(0, .02, p); scene.add(b); }
  const path = new THREE.Mesh(new THREE.RingGeometry(3.4, 5.2, 40), new THREE.MeshLambertMaterial({ color: 0xcbb68a })); path.rotation.x = -Math.PI / 2; path.position.y = .03; path.receiveShadow = true; scene.add(path); ppPath = path;
  const r2 = rng(11);
  for (let n = 0; n < 160; n++) { const a = r2() * Math.PI * 2, d = HALF + 3 + r2() * 26; const tr = new THREE.Group(); tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); cyl(tr, .2, .28, 1.2, 0x7a5230, 0, .6, 0); cone(tr, 1.3, 2.2, 0x2f6b34, 0, 2, 0); cone(tr, 1, 1.8, 0x3b7f3f, 0, 2.9, 0); tr.scale.setScalar(1 + r2() * .8); scene.add(tr); }
}

// ------------------------------------------------------------ characters
function human(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const leg = x => { const l = new THREE.Group(); l.position.set(x, .72, 0); box(l, .22, .72, .24, o.pants || 0x334155, 0, -.36, 0); body.add(l); return l; };
  const arm = x => { const a = new THREE.Group(); a.position.set(x, 1.36, 0); box(a, .18, .6, .2, o.shirt, 0, -.28, 0); box(a, .16, .14, .18, o.skin, 0, -.62, 0); body.add(a); return a; };
  const legL = leg(-.13), legR = leg(.13); box(body, .6, .72, .34, o.shirt, 0, 1.08, 0); box(body, .42, .42, .4, o.skin, 0, 1.66, 0);
  box(body, .07, .07, .02, 0x111111, -.1, 1.7, .2); box(body, .07, .07, .02, 0x111111, .1, 1.7, .2);
  if (o.hair) box(body, .46, .14, .44, o.hair, 0, 1.92, -.02);
  if (o.hat) { box(body, .5, .18, .5, o.hat, 0, 1.95, 0); }
  const armL = arm(-.4), armR = arm(.4);
  if (o.tool === 'axe') { const t = new THREE.Group(); t.position.set(0, -.62, .1); t.rotation.x = Math.PI / 2; box(t, .06, .7, .06, 0x8b5a2b, 0, .25, 0); box(t, .06, .22, .3, 0xcbd5e1, 0, .55, .12); armR.add(t); }
  if (o.tool === 'gun') { box(armR, .1, .12, .6, 0x1f2937, 0, -.62, .25); }
  if (o.tool === 'med') { box(armL, .26, .2, .2, 0xffffff, 0, -.66, .12); box(armL, .06, .14, .21, 0xef4444, 0, -.66, .12); }
  if (o.zombie) { armL.rotation.x = armR.rotation.x = -1.35; }
  g.userData = { body: body, legL: legL, legR: legR, armL: armL, armR: armR, t: 0, swing: 0, zombie: !!o.zombie };
  if (o.s) g.scale.setScalar(o.s);
  return g;
}
function animHuman(h, speed, dt) {
  const u = h.userData; u.t += dt * (2 + speed * 1.6); const sw = Math.sin(u.t) * .7 * Math.min(1, speed / 3);
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw; if (!u.zombie) u.armL.rotation.x = -sw * .8;
  if (u.swing > 0) { u.swing = Math.max(0, u.swing - dt * 4); u.armR.rotation.x = -2.2 * Math.sin(u.swing * Math.PI); }
  else if (!u.zombie) u.armR.rotation.x = sw * .8; else u.armR.rotation.x = -1.35 + Math.sin(u.t * .5) * .15;
  u.body.position.y = Math.abs(Math.sin(u.t)) * .06 * Math.min(1, speed / 3);
}

// ------------------------------------------------------------ resource nodes, animals, enemies
const trees = [], rocks = [], deer = [], zombies = [], zoneObjs = {};
function makeTree(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0, z); const trunk = cyl(g, .22, .3, 1.3, 0x7a5230, 0, .65, 0), top = new THREE.Group(); g.add(top);
  cone(top, 1.25, 2, 0x2f7a35, 0, 2.1, 0); cone(top, 1, 1.7, 0x3c9142, 0, 2.9, 0); cone(top, .7, 1.3, 0x4aa34f, 0, 3.6, 0); g.scale.setScalar(s); scene.add(g);
  const t = { kind: 'tree', mesh: g, top: top, trunk: trunk, x: x, z: z, hp: 3, max: 3, down: false, at: 0, shake: 0, r: .5 }; trees.push(t); return t;
}
function makeRock(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0, z); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), mat(0x8b9099)); m.position.y = .5; m.scale.set(1.2, .8, 1); m.castShadow = true; g.add(m);
  const o = new THREE.Mesh(new THREE.DodecahedronGeometry(.35, 0), mat(0xd29a53)); o.position.set(.35, .85, .3); g.add(o); g.scale.setScalar(s); scene.add(g);
  const r = { kind: 'rock', mesh: g, top: g, x: x, z: z, hp: 5, max: 5, down: false, at: 0, shake: 0, r: .8 }; rocks.push(r); return r;
}
function makeDeer(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); const c = 0x9a6a3c;
  box(g, .45, .5, 1.1, c, 0, .95, 0); box(g, .3, .55, .3, c, 0, 1.35, .55); box(g, .26, .26, .4, c, 0, 1.6, .75);
  [[-.15, -.4], [.15, -.4], [-.15, .4], [.15, .4]].forEach(p => box(g, .1, .7, .1, 0x6b4a2a, p[0], .35, p[1]));
  box(g, .04, .4, .04, 0xd6c3a5, -.1, 1.9, .7); box(g, .04, .4, .04, 0xd6c3a5, .1, 1.9, .7); scene.add(g);
  const bar = hpBar(1, 0xfbbf24); bar.position.y = 2.3; bar.visible = false; g.add(bar);
  const d = { kind: 'deer', mesh: g, bar: bar, x: x, z: z, hx: x, hz: z, hp: 20, max: 20, down: false, at: 0, vx: 0, vz: 0, wt: 0 }; deer.push(d); return d;
}
function makeZombie(x, z, r, boss, zone) {
  const g = human({ skin: boss ? 0xf97316 : 0x84cc16, shirt: boss ? 0x7f1d1d : [0x6d28d9, 0x475569, 0x9f1239][Math.floor(Math.random() * 3)], pants: 0x1e293b, hair: boss ? null : 0x3f3f46, zombie: true, s: boss ? 2.3 : 1 });
  g.position.set(x, 0, z); scene.add(g); const bar = hpBar(boss ? 1.4 : 1); bar.position.y = 2.35; g.add(bar);
  const wins = boss ? ((st.bossWins || {})[zone] | 0) : 0, hp = boss ? Math.round(700 * (r === 2 ? 1 : .6) * Math.pow(1.25, wins)) : 30 + 25 * (r - 1);   // lair bosses come back 25% tougher each time
  if (boss) { const nm = textSprite(4.5); nm.position.y = 2.9; nm.userData.set('👹 Boss Lv' + (wins + 1), '#fdba74'); g.add(nm); }
  const zb = { blv: wins + 1, mesh: g, bar: bar, x: x, z: z, hx: x, hz: z, hp: hp, max: hp, dmg: boss ? 20 + 4 * wins : 3 + 3 * r, cd: 0, boss: !!boss, zone: zone, dead: false, speed: boss ? 2.2 : 2.6, reach: boss ? 2.2 : 1.2, wt: 0 };
  zombies.push(zb); return zb;
}
// ------------------------------------------------------------ finds: extra things to harvest out in the areas you unlock (none in town).
// Each kind of area has its own, and the outer ring (further from home) has richer ones. Walk up to them like a tree.
// Slow ones (crates, crystals) remember when you took them, so reloading doesn't bring them back early.
const finds = [];
const FIND = {
  berry:    { n: 'Berry bush',     res: { food: 4 },             hp: 3,  re: 60,   r: .6 },
  shroom:   { n: 'Mushrooms',      res: { food: 3 },             hp: 2,  re: 50,   r: .4 },
  oak:      { n: 'Giant oak',      res: { wood: 12 },            hp: 9,  re: 180,  r: 1.1 },
  iron:     { n: 'Iron vein',      res: { metal: 6 },            hp: 8,  re: 150,  r: .9 },
  hive:     { n: 'Wild beehive',   res: { food: 9 },             hp: 4,  re: 240,  r: .6 },
  wreck:    { n: 'Wrecked car',    res: { metal: 10, wood: 2 },  hp: 10, re: 300,  r: 1.3 },
  crate:    { n: 'Supply crate',   res: { wood: 8, food: 8, metal: 6 }, hp: 4, re: 900, r: .7, keep: 1 },
  crystal:  { n: 'Crystal',        res: { gems: 1, metal: 4 },   hp: 14, re: 7200, r: .7, keep: 1 }
};
function makeFind(kind, x, z, mul, id) {
  const F = FIND[kind], g = new THREE.Group(); g.position.set(x, 0, z);
  const ball = (r, c, px, py, pz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(c)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
  if (kind === 'berry') { ball(.6, 0x2f7a35, 0, .5, 0); ball(.45, 0x3c9142, .35, .55, .2); [[.3, .8, .45], [-.35, .7, .4], [.1, .95, -.4], [-.4, .5, -.3], [.55, .45, -.1]].forEach(p => ball(.11, 0xdc2626, p[0], p[1], p[2])); }
  else if (kind === 'shroom') { [[0, 0, 1], [.35, .2, .7], [-.3, .25, .6]].forEach(p => { cyl(g, .07 * p[2], .09 * p[2], .4 * p[2], 0xf5f5f4, p[0], .2 * p[2], p[1]); const c = ball(.25 * p[2], 0xdc2626, p[0], .42 * p[2], p[1]); c.scale.y = .6; }); }
  else if (kind === 'oak') { cyl(g, .45, .6, 2.2, 0x6b4423, 0, 1.1, 0); ball(1.7, 0x2d6a2f, 0, 3.2, 0); ball(1.2, 0x3a8a3c, .9, 3.6, .4); ball(1.1, 0x347d36, -.9, 3.4, -.3); }
  else if (kind === 'iron') { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), mat(0x44403c)); m.position.y = .55; m.scale.set(1.3, .9, 1.1); m.castShadow = true; g.add(m); [[.4, .9, .3], [-.35, .7, .4], [.1, 1.05, -.35]].forEach(p => box(g, .28, .22, .22, 0xc2410c, p[0], p[1], p[2])); }
  else if (kind === 'hive') { cyl(g, .3, .35, .6, 0x7a5230, 0, .3, 0); const h = cyl(g, .32, .38, .7, 0xeab308, 0, .95, 0); [.75, .95, 1.15].forEach(y => cyl(g, .4, .4, .05, 0xa16207, 0, y, 0)); h.scale.set(1, 1, 1); }
  else if (kind === 'wreck') { box(g, 2.2, .7, 1.1, 0x9a3412, 0, .5, 0); box(g, 1.2, .5, 1, 0x7c2d12, -.2, 1.1, 0); [[-.7, .5], [.7, .5], [-.7, -.5], [.7, -.5]].forEach(p => cyl(g, .25, .25, .2, 0x1c1917, p[0], .25, p[1])); g.rotation.y = (x * 7 + z) % 6; }
  else if (kind === 'crate') { box(g, 1, .8, .8, 0xa16207, 0, .4, 0); box(g, 1.04, .1, .84, 0x713f12, 0, .55, 0); box(g, 1.04, .1, .84, 0x713f12, 0, .2, 0); box(g, .7, .55, .6, 0x92400e, .15, 1.05, .05); }
  else if (kind === 'crystal') { [[0, 0, 1.4], [.35, .2, .9], [-.3, -.2, 1], [.1, -.4, .7]].forEach(p => { const c = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), new THREE.MeshLambertMaterial({ color: 0x67e8f9, emissive: 0x0e7490 })); c.scale.set(1, p[2] * 1.8, 1); c.position.set(p[0], .35 * p[2] * 1.8, p[1]); g.add(c); }); }
  scene.add(g);
  const res = {}; Object.keys(F.res).forEach(k => { res[k] = k === 'gems' ? F.res[k] : Math.round(F.res[k] * mul); });
  const o = { kind: kind, find: 1, id: id, mesh: g, top: g, x: x, z: z, hp: F.hp, max: F.hp, down: false, at: 0, shake: 0, r: F.r, res: res, re: F.re * 1000 };
  const t = (st.findAt || {})[id]; if (F.keep && t && t > NOW()) { o.down = true; o.at = t; g.visible = false; }
  finds.push(o); return o;
}
function harvestFind(node, now) {
  node.down = true; node.at = now + node.re; node.mesh.visible = false;
  if (FIND[node.kind].keep) { st.findAt = st.findAt || {}; Object.keys(st.findAt).forEach(k => { if (st.findAt[k] < now) delete st.findAt[k]; }); st.findAt[node.id] = node.at; }
  let d = 0; Object.keys(node.res).forEach(r => { const n = node.res[r]; st.res[r] = (st.res[r] || 0) + n; st.stats[r] = (st.stats[r] || 0) + n; for (let k = 0; k < Math.min(5, n); k++) setTimeout(() => fly(RES[r], node, player), d++ * 90); });
  toast(FIND[node.kind].n + ': +' + costTxt(node.res)); if (node.kind === 'crystal') { sfx(1046, .2, .06); sfx(1318, .3, .06, .1); }
}
// what each kind of area has (outer ring: more, and the richer kinds)
const FINDS_IN = {
  forest:   [['berry', 3], ['shroom', 3], ['oak', 0, 2]],
  quarry:   [['iron', 2, 3], ['crystal', 0, 1]],
  wild:     [['berry', 3], ['hive', 1, 2], ['shroom', 2]],
  infected: [['wreck', 2], ['crate', 1, 2]],
  boss:     [['crate', 2], ['crystal', 1], ['wreck', 1]]
};
function spawnZoneContents(i, j) {
  const k = i + ',' + j, t = zoneType(i, j), cx = zc(i), cz = zc(j), R = rng(hash(i * 7 + 3, j * 11 + 5)), objs = zoneObjs[k] = zoneObjs[k] || [];
  const spot = () => [cx + (R() - .5) * 18, cz + (R() - .5) * 18];
  if (t === 'home') { HOME_TREES.forEach(p => makeTree(p[0], p[1], 1)); return; }
  const n = { forest: [14, 2, 0], quarry: [4, 9, 0], wild: [6, 2, 4], infected: [4, 1, 0], boss: [3, 2, 0] }[t];
  for (let a = 0; a < n[0]; a++) { const p = spot(); makeTree(p[0], p[1], .9 + R() * .5); }
  for (let a = 0; a < n[1]; a++) { const p = spot(); makeRock(p[0], p[1], .9 + R() * .5); }
  for (let a = 0; a < n[2]; a++) { const p = spot(); makeDeer(p[0], p[1]); }
  const far = ring(i, j) >= 2; let fi = 0;
  (FINDS_IN[t] || []).forEach(e => { const c = far ? (e[2] !== undefined ? e[2] : e[1]) : e[1]; for (let a = 0; a < c; a++) { const p = spot(); makeFind(e[0], p[0], p[1], far ? 1.5 : 1, k + ':' + fi++); } });
  if (t === 'infected' || t === 'boss') {
    // camp decor: tents and a burnt-out fire
    for (let a = 0; a < 3; a++) { const tg = new THREE.Group(); const p = spot(); tg.position.set(p[0], 0, p[1]); tg.rotation.y = R() * 6; const tc = cone(tg, 1.3, 1.6, t === 'boss' ? 0x7c2d12 : 0x57534e, 0, .8, 0, 4); tc.rotation.y = Math.PI / 4; scene.add(tg); objs.push(tg); }
    if (t === 'boss') { const lava = new THREE.Mesh(new THREE.CircleGeometry(6, 28), new THREE.MeshLambertMaterial({ color: 0xc2410c })); lava.rotation.x = -Math.PI / 2; lava.position.set(cx, .03, cz); scene.add(lava); objs.push(lava); }
    spawnCamp(i, j);
  }
}
function spawnCamp(i, j) {
  const k = i + ',' + j, t = zoneType(i, j), r = ring(i, j), cx = zc(i), cz = zc(j), now = NOW();
  if (zombies.some(z => !z.dead && z.zone === k)) return;
  if (t === 'infected') { const c = st.camps[k]; if (c && now < c + CAMP_RESPAWN) return; st.camps[k] = 0; const R = rng(now & 0xffff); for (let a = 0; a < 2 + 2 * r; a++) makeZombie(cx + (R() - .5) * 12, cz + (R() - .5) * 12, r, false, k); }
  if (t === 'boss') { if (now < (st.boss[k] || 0)) return; makeZombie(cx, cz, r, true, k); for (let a = 0; a < 3; a++) makeZombie(cx + (a - 1) * 3, cz + 3, r, false, k); }
}

// ------------------------------------------------------------ fog over locked areas
const fogs = {};
function makeFog(i, j) {
  const k = i + ',' + j; if (fogs[k]) return; const g = new THREE.Group(), cx = zc(i), cz = zc(j), R = rng(hash(i, j));
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(Z, Z), new THREE.MeshLambertMaterial({ color: 0xe2e8f0, transparent: true, opacity: .8, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.set(cx, .06, cz); g.add(pl);
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
  for (let a = 0; a < 9; a++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2.5 + R() * 3, 12, 8), cm); s.position.set(cx + (R() - .5) * 18, 1 + R() * 2.5, cz + (R() - .5) * 18); s.scale.y = .5; g.add(s); }
  const lab = textSprite(7); lab.position.set(cx, 6, cz); lab.userData.set(ZNAME[zoneType(i, j)] + (ring(i, j) === 2 ? ' ⚠️' : '')); g.add(lab);
  scene.add(g); fogs[k] = g;
}
function clearFog(k) { const f = fogs[k]; if (!f) return; delete fogs[k]; const ms = []; f.children.forEach(c => { if (c.material) { c.material = c.material.clone(); c.material.transparent = true; ms.push(c.material); } }); let t = 0; const step = () => { t += .03; ms.forEach(m => { m.opacity *= .9; }); f.position.y += .12; if (t < 1) requestAnimationFrame(step); else scene.remove(f); }; step(); }

// ------------------------------------------------------------ buildings
const bldMeshes = {}, bldLabels = {}, dirtyBld = {};
function bldMesh(id, l) {
  const g = new THREE.Group(), t = id.replace(/\d$/, '');
  if (t === 'pp') {
    cyl(g, 2.1, 2.4, 1, 0x6b7280, 0, .5, 0, 16); cyl(g, 1.3, 1.6, 3, 0x9ca3af, 0, 2.5, 0, 16); cyl(g, 1.55, 1.3, .5, 0x4b5563, 0, 4.2, 0, 16);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .78; cyl(g, .28, .28, 2, 0x374151, Math.cos(a) * 1.9, 1, Math.sin(a) * 1.9); cyl(g, .32, .32, .25, 0xfacc15, Math.cos(a) * 1.9, 2.1, Math.sin(a) * 1.9); }
    const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffa53a })); fire.position.y = 4.7; fire.scale.y = .55; g.add(fire); g.userData.fire = fire;
    box(g, .5, .8, .05, 0xfacc15, 0, 2.6, 1.42);
  } else if (t === 'lumber') {
    box(g, 3, 1.8, 2.2, 0x9a6b3c, 0, .9, -.3); roof(g, 3.4, 2.6, 1.1, 0xd9a43c, 2.35);
    const saw = cyl(g, .7, .7, .08, 0xcbd5e1, 1.9, .9, .8, 18); saw.rotation.z = Math.PI / 2; g.userData.saw = saw;
    for (let k = 0; k < 3; k++) { const lg = cyl(g, .22, .22, 1.6, 0xa0703f, -1 + k * .45, .25, 1.4); lg.rotation.z = Math.PI / 2; lg.rotation.y = Math.PI / 2; }
  } else if (t === 'farm') {
    box(g, 3.8, .16, 3.4, 0x7a5230, 0, .08, .2); for (let k = 0; k < 5; k++) box(g, .3, .45, 3, 0x7dbb3c, -1.5 + k * .75, .35, .2);
    const barn = new THREE.Group(); barn.position.set(1.4, 0, -1.2); box(barn, 1.4, 1.3, 1.2, 0xb91c1c, 0, .65, 0); roof(barn, 1.6, 1.4, .8, 0x7f1d1d, 1.7); g.add(barn);
  } else if (t === 'house') {
    box(g, 2.4, 1.7, 2.2, 0xe5e7eb, 0, .85, 0); roof(g, 2.8, 2.6, 1.2, 0x3b82c4, 2.3); box(g, .6, 1, .05, 0x7a5230, 0, .5, 1.12); box(g, .5, .5, .05, 0x93c5fd, -.75, 1.1, 1.12); box(g, .5, .5, .05, 0x93c5fd, .75, 1.1, 1.12);
  } else if (t === 'smelter') {
    box(g, 2.8, 1.6, 2.4, 0x7c5a3a, 0, .8, 0); roof(g, 3.1, 2.7, .8, 0x57534e, 2); cyl(g, .35, .45, 3, 0x6b7280, -.9, 2.6, -.6); const glow = new THREE.Mesh(new THREE.BoxGeometry(1, .6, .05), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); glow.position.set(.4, .6, 1.22); g.add(glow);
    for (let k = 0; k < 3; k++) box(g, .6, .25, .4, 0x94a3b8, -1 + k * .7, .12, 1.7);
  } else if (t === 'hall') {
    box(g, 3.6, 2.3, 2.8, 0x64748b, 0, 1.15, 0); box(g, 3.9, .3, 3.1, 0x334155, 0, 2.45, 0); cyl(g, .06, .06, 2.4, 0xd4d4d8, 1.4, 3.6, -.9); box(g, .9, .55, .04, 0xdc2626, 1.85, 4.4, -.9);
    box(g, 1, 1.3, .05, 0x1e293b, 0, .65, 1.42); box(g, .7, .8, .06, 0x3b82f6, 0, 1.75, 1.43);
  } else if (t === 'workshop') {
    box(g, 3, 1.6, 2.4, 0xa16207, 0, .8, -.2); roof(g, 3.3, 2.8, 1, 0x78350f, 2.1); box(g, .7, .45, .4, 0x27272a, 1.6, .5, 1.3); box(g, .9, .15, .5, 0x3f3f46, 1.6, .8, 1.3);
  }
  const s = 1 + .04 * Math.min(10, l - 1); g.scale.setScalar(s); return g;
}
function syncBuildings() {
  Object.keys(BD).forEach(id => {
    const l = lvl(id), D = BD[id];
    if ((l > 0 || st.b[id].up) && (!bldMeshes[id] || dirtyBld[id])) {
      if (bldMeshes[id]) scene.remove(bldMeshes[id]);
      const m = bldMesh(id, Math.max(1, l)); m.position.set(D.x, 0, D.z); if (l === 0) m.scale.multiplyScalar(.6); scene.add(m); bldMeshes[id] = m; delete dirtyBld[id];
      if (!bldLabels[id]) { const lb = textSprite(5.2); lb.position.set(D.x, id === 'pp' ? 6.6 : 4.6, D.z); scene.add(lb); bldLabels[id] = lb; }
    }
    const lb = bldLabels[id]; if (!lb) return; const b = st.b[id];
    if (b.up) lb.userData.set('⏳ ' + D.i + ' Lv' + b.up.to + ' · ' + fmt((b.up.end - NOW()) / 1000), '#fde68a');
    else if (D.out && (st.piles[id] || 0) >= 1) lb.userData.set(D.i + ' Lv' + l + ' · ' + RES[D.out] + ' ' + Math.floor(st.piles[id]) + (st.piles[id] >= 40 * l - .5 ? ' FULL · extra goes to builds' : ''), '#bbf7d0');
    else if (id === 'pp' && behindPP().length) lb.userData.set(D.i + ' ' + D.n + ' Lv' + l + ' · ' + behindPP().length + ' to catch up', '#fde68a');
    else lb.userData.set(D.i + ' ' + D.n + ' Lv' + l);
  });
}

// ------------------------------------------------------------ pads: stand on them and your resources flow in
const pads = {};
// nothing gets left behind: the Power Plant only goes up once every building it has unlocked has caught up to its level
function behindPP() { const P = lvl('pp'); return Object.keys(BD).filter(id => id !== 'pp' && BD[id].need <= P && ((st.b[id].lvl | 0) < P || st.b[id].up)); }
function wantedPads() {
  const w = {};
  Object.keys(BD).forEach(id => { const b = st.b[id], D = BD[id]; if (b.up) return; const l = b.lvl;
    if (l === 0 && lvl('pp') >= D.need) w['b:' + id + ':1'] = { kind: 'build', id: id, to: 1, x: D.x, z: D.z + (l ? 3.4 : 0) };
    else if (l > 0 && l < cap(id) && !(id === 'pp' && behindPP().length)) w['b:' + id + ':' + (l + 1)] = { kind: 'build', id: id, to: l + 1, x: D.x, z: D.z + (id === 'pp' ? 3.9 : 3.4) }; });
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    if (!st.zones[i + ',' + j]) continue;
    DIRS.forEach(d => { const ni = i + d[0], nj = j + d[1], nk = ni + ',' + nj; if (ni < 0 || nj < 0 || ni >= G || nj >= G || st.zones[nk] || w['z:' + nk]) return; w['z:' + nk] = { kind: 'zone', i: ni, j: nj, x: zc(i) + d[2], z: zc(j) + d[3] }; });
  }
  return w;
}
function padCost(p) { return p.kind === 'zone' ? unlockCost(p.i, p.j) : costFor(p.id, p.to); }
function padLeft(key, p) { const c = padCost(p), paid = st.paid[key] || {}, o = {}; Object.keys(c).forEach(k => { const r = c[k] - (paid[k] || 0); if (r > 0) o[k] = r; }); return o; }
function syncPads() {
  const w = tour && (tour.raid || String(tour.code).indexOf('ARENA_') === 0) ? {} : wantedPads();   // while visiting, these are your ally's pads: what you put on them is split 50/50 (see deliver / goHome)
  Object.keys(pads).forEach(k => { if (!w[k]) { scene.remove(pads[k].mesh); delete pads[k]; } });
  Object.keys(w).forEach(k => {
    if (!pads[k]) {
      const p = w[k], g = new THREE.Group(); g.position.set(p.x, 0, p.z);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: p.kind === 'zone' ? 0x93c5fd : 0xffffff, transparent: true, opacity: .35, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = .05; g.add(pl);
      [[0, -1.3, 2.7, .12], [0, 1.3, 2.7, .12], [-1.3, 0, .12, 2.7], [1.3, 0, .12, 2.7]].forEach(e => { const m = new THREE.Mesh(new THREE.BoxGeometry(e[2], .08, e[3]), new THREE.MeshBasicMaterial({ color: p.kind === 'zone' ? 0x60a5fa : 0xfde047 })); m.position.set(e[0], .07, e[1]); g.add(m); });
      const lb = textSprite(5); lb.position.y = 2; g.add(lb); scene.add(g); p.mesh = g; p.label = lb; p.plane = pl; pads[k] = p;
    }
    const p = pads[k], left = padLeft(k, p), D = p.kind === 'build' ? BD[p.id] : null;
    if (tour && !Object.keys(left).length) { p.label.userData.set('✅ Paid · ' + tour.name + ' finishes it when they play', '#86efac'); return; }
    p.label.userData.set((p.kind === 'zone' ? '🔓 ' : p.to === 1 ? D.i + ' Build ' : '⬆ ' + D.i + ' Lv' + p.to + ' ') + costTxt(left), p.kind === 'zone' ? '#bfdbfe' : '#fef08a');
  });
}
let padAcc = 0, needNote = 0;
function deliver(dt) {
  padAcc += dt; if (padAcc < .05) return; const mult = Math.min(10, Math.max(1, Math.round(padAcc / .05))); padAcc = 0;
  Object.keys(pads).forEach(key => {
    const p = pads[key]; if (!p || !player) return; if (Math.abs(player.x - p.x) > 1.4 || Math.abs(player.z - p.z) > 1.4) return;
    const left = padLeft(key, p), ks = Object.keys(left); if (!ks.length) return tour ? null : complete(key, p);
    const k = ks.find(r => st.res[r] >= 1);
    if (!k) { if (NOW() - needNote > 3000) { needNote = NOW(); toast('Need more ' + ks.map(r => RES[r]).join(' ') + ' — gather it around the map'); } return; }
    const n = Math.min(Math.floor(st.res[k]), tour ? Math.ceil(left[k] * 2) : left[k], Math.max(1, Math.ceil(padCost(p)[k] / 30)) * mult);
    if (tour) {   // at an ally's: half counts for their pad (shown here), half for the same pad at home, so it takes twice what the pad shows
      const half = n / 2, cost = padCost(p)[k] || 0; st.res[k] -= n; (st.paid[key] = st.paid[key] || {})[k] = Math.min(cost, ((st.paid[key] || {})[k] || 0) + half);
      const D = tour.D[key] = tour.D[key] || {}; D[k] = (D[k] || 0) + n; fly(RES[k], player, p); sfx(520 + Math.random() * 80, .03, .03);
      if (!Object.keys(padLeft(key, p)).length && NOW() - needNote > 3000) { needNote = NOW(); toast('✅ Paid in full! ' + tour.name + ' finishes it next time they play.'); }
      syncPads(); return;
    }
    st.res[k] -= n; (st.paid[key] = st.paid[key] || {})[k] = ((st.paid[key] || {})[k] || 0) + n; fly(RES[k], player, p); sfx(520 + Math.random() * 80, .03, .03);
    if (!Object.keys(padLeft(key, p)).length) complete(key, p); else syncPads();
  });
}
// a build that's been paid in full (by allies, or by your crews feeding the builds) starts by itself: no need to stand on it
// skipping a timer costs 1 💎 per 10 minutes left (at least 2), so gems stay worth something
const finishCost = u => u ? Math.max(2, Math.ceil((u.end - NOW()) / 600000)) : 2;
// metal piles up fastest, so it can also finish a timer (15 🔩 per minute left, at least 20) or be traded at the Smelter
const metalFinish = u => u ? Math.max(20, Math.ceil((u.end - NOW()) / 60000) * 15) : 20;
const TRADE = { wood: 3, food: 2 };   // 🔩 per 1 wood / 1 food
function tradeRows() {
  const m = Math.floor(st.res.metal || 0);
  let h = '<div class="row"><div class="g"><b>🔄 Trade metal</b><div class="muted">Got more 🔩 than you can use? Smelt it into building supplies: ' + RES.metal + TRADE.wood + ' → ' + RES.wood + '1, ' + RES.metal + TRADE.food + ' → ' + RES.food + '1.</div></div></div>';
  ['wood', 'food'].forEach(k => { const r = TRADE[k], o = k === 'wood' ? 10 : 15;
    h += '<div class="row"><div class="g">' + RES.metal + ' → ' + RES[k] + '</div>' + [1, 10].map(x => '<button class="b" style="margin-left:6px" data-a="trade" data-k="' + k + '" data-n="' + o * x + '"' + (m >= o * x * r ? '' : ' disabled') + '>' + RES.metal + o * x * r + ' → ' + RES[k] + o * x + '</button>').join('') +
      '<button class="b alt" style="margin-left:6px" data-a="trade" data-k="' + k + '" data-n="half"' + (m >= r * 2 ? '' : ' disabled') + '>Half my ' + RES.metal + '</button></div>'; });
  return h;
}
function autoComplete() { if (tour) return; const k = Object.keys(pads).find(key => pads[key] && !Object.keys(padLeft(key, pads[key])).length); if (k) complete(k, pads[k]); }
function complete(key, p) {
  delete st.paid[key];
  if (p.kind === 'zone') { const k = p.i + ',' + p.j; st.zones[k] = 1; st.stats.zones++; clearFog(k); spawnZoneContents(p.i, p.j); toast('🔓 New area: ' + ZNAME[zoneType(p.i, p.j)] + '!'); sfx(660, .2, .08); sfx(880, .3, .06, .15); }
  else if (p.to === 1) { st.b[p.id].lvl = 1; dirtyBld[p.id] = 1; toast('🏗️ ' + BD[p.id].n + ' built!'); sfx(660, .2, .08); burst(BD[p.id].x, BD[p.id].z); }
  else { const t = upTime(p.to); st.b[p.id].up = { to: p.to, end: NOW() + t * 1000, total: t * 1000, h: {} }; toast('⬆ Upgrading ' + BD[p.id].n + ' to level ' + p.to + ' (' + fmt(t) + ') — allies can help!'); sfx(560, .15, .07); publishPub(); }
  syncBuildings(); syncPads(); persist();
}

// ------------------------------------------------------------ player + heroes
const player = { x: 3, z: 6, ry: 0, speed: 0, cd: 0, hpMax: 100, dead: 0 };
const pMesh = human({ skin: 0xf1c27d, shirt: 0x2563eb, pants: 0x1e3a5f, hair: 0x4a2c17, tool: 'axe' }); scene.add(pMesh);
const pShadowRing = new THREE.Mesh(new THREE.RingGeometry(.55, .7, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .7 })); pShadowRing.rotation.x = -Math.PI / 2; pShadowRing.position.y = .04; pMesh.add(pShadowRing);
const carry = new THREE.Group(); carry.position.set(0, 1.1, -.35); pMesh.add(carry);
const heroes = {};
function syncHeroes() {
  Object.keys(st.heroes).forEach(id => {
    if (heroes[id]) return; const H = HEROES[id], m = human({ skin: id === 'rusty' ? 0x8d5524 : 0xf1c27d, shirt: H.shirt, pants: 0x27272a, hat: H.hat, tool: id === 'rusty' ? 'gun' : id === 'leila' ? 'med' : 'axe' });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 24), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: .7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; m.add(ring);
    const bar = hpBar(1, 0x22c55e); bar.position.y = 2.4; m.add(bar); const nm = textSprite(3); nm.position.y = 2.85; nm.userData.set(H.i + ' ' + H.n + ' L' + st.heroes[id].lvl); m.add(nm);
    m.position.set(player.x + 1, 0, player.z + 1); scene.add(m);
    const s = heroStat(id, st.heroes[id].lvl); heroes[id] = { id: id, mesh: m, bar: bar, name: nm, x: player.x + 1, z: player.z + 1, hp: s.hp, max: s.hp, cd: 0, down: 0, speed: 0 };
  });
  Object.keys(heroes).forEach(id => { const h = heroes[id], s = heroStat(id, st.heroes[id].lvl); if (h.max !== s.hp) { h.hp += s.hp - h.max; h.max = s.hp; } h.name.userData.set(HEROES[id].i + ' ' + HEROES[id].n + ' L' + st.heroes[id].lvl); });
}
const tracers = [];
function tracer(a, b, color) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, 1.4, a.z), new THREE.Vector3(b.x, 1.2 * (b.boss ? 2 : 1), b.z)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color || 0xfde047 })); scene.add(l); tracers.push({ l: l, t: .09 }); }

// ------------------------------------------------------------ effects
const flyers = [];
function fly(icon, a, b) { const s = iconSprite(icon, .8); s.position.set(a.x, 1.6, a.z); scene.add(s); flyers.push({ s: s, ax: a.x, az: a.z, bx: b.x, bz: b.z, toP: b === player, t: 0 }); }
function burst(x, z) { for (let k = 0; k < 8; k++) { const s = iconSprite('✨', .9); s.position.set(x, 1, z); scene.add(s); flyers.push({ s: s, ax: x, az: z, bx: x + Math.cos(k) * 3, bz: z + Math.sin(k) * 3, t: 0, up: 3 }); } }
let ac = null, muted = localStorage.getItem('ts3_mute') === '1';
function sfx(f, d, v, delay) { if (muted) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + (delay || 0); o.frequency.value = f; o.type = 'triangle'; g.gain.setValueAtTime(v || .05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + .02); } catch (e) {} }
function toast(t, ms) { $('toast').innerHTML = RH(escH(t)); clearTimeout(toast.t); toast.t = setTimeout(() => { $('toast').innerHTML = ''; }, ms || 2800); }
function fmt(s) { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? h + 'h ' + m + 'm' : m ? m + ':' + String(x).padStart(2, '0') : x + 's'; }

// ------------------------------------------------------------ input: drag anywhere for a joystick, WASD/arrows, or a controller
const keys = {}, joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'e' || e.key === ' ') actPress(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('pointerdown', e => { joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; const jb = $('jb'), jk = $('jk'); jb.style.display = jk.style.display = 'block'; jb.style.left = jk.style.left = e.clientX + 'px'; jb.style.top = jk.style.top = e.clientY + 'px'; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
cv.addEventListener('pointermove', e => { if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), R = 50; if (d > R) { dx *= R / d; dy *= R / d; } joy.x = dx / R; joy.y = dy / R; $('jk').style.left = (joy.ox + dx) + 'px'; $('jk').style.top = (joy.oy + dy) + 'px'; });
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; $('jb').style.display = $('jk').style.display = 'none'; };
const tapAt = { x: 0, y: 0, t: 0 };
cv.addEventListener('pointerdown', e => { tapAt.x = e.clientX; tapAt.y = e.clientY; tapAt.t = performance.now(); });
cv.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX - tapAt.x, e.clientY - tapAt.y) > 8 || performance.now() - tapAt.t > 350) return;   // that was a drag (walking), not a tap
  const r = cv.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(v, camera);
  const ids = Object.keys(bldMeshes), hit = rc.intersectObjects(ids.map(k => bldMeshes[k]), true)[0];
  if (!hit) { const nc = neighbourAt(rc); if (nc) visit(nc); return; }
  let o = hit.object; while (o && ids.every(k => bldMeshes[k] !== o)) o = o.parent; const id = ids.find(k => bldMeshes[k] === o); if (id && !tour) buildingPanel(id, true);
});
cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);
const PAD = window.WWPad;
if (PAD) PAD.on('connect', n => toast('🎮 ' + n + ' connected: left stick move · X action · Options missions', 5000));

// ------------------------------------------------------------ helpers for the world
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function blockedAt(x, z) { const [i, j] = zoneAt(x, z); if (i < 0 || j < 0 || i >= G || j >= G) return true; return !st.zones[i + ',' + j]; }
function pushOut(o, rad) {
  Object.keys(BD).forEach(id => { if (!bldMeshes[id] || (moving && moving.id === id)) return; const D = BD[id], dx = o.x - D.x, dz = o.z - D.z, d = Math.hypot(dx, dz), m = D.r + rad; if (d < m && d > 0) { o.x = D.x + dx / d * m; o.z = D.z + dz / d * m; } });
  const near = n => { if (n.down) return; const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz), m = n.r + rad; if (d < m && d > 0) { o.x = n.x + dx / d * m; o.z = n.z + dz / d * m; } };
  trees.forEach(near); rocks.forEach(near); finds.forEach(near);
}
function moveTo(o, x, z, rad) { const ox = o.x, oz = o.z; o.x = x; o.z = z; pushOut(o, rad); if (blockedAt(o.x, o.z)) { o.x = ox; o.z = oz; if (!blockedAt(x, oz)) o.x = x; else if (!blockedAt(ox, z)) o.z = z; } }
const allies = () => [player.dead ? null : Object.assign(player, { isPlayer: true })].concat(Object.keys(heroes).map(id => heroes[id]).filter(h => !h.down), guards.filter(g => !g.down)).filter(Boolean);
function nearestZombie(o, r) { let best = null, bd = r; zombies.forEach(z => { if (z.dead) return; const d = d2(o, z) - (z.boss ? 1 : 0); if (d < bd) { bd = d; best = z; } }); return best; }

function hitZombie(z, dmg, by) {
  if (z.tb) return tbHit(z, dmg);   // team boss: damage is shared (see tbTick)
  z.hp -= dmg; z.mesh.userData.flash = .12;
  if (z.hp <= 0 && !z.dead && z.def) { z.dead = true; scene.remove(z.mesh); sfx(260, .12, .07); raidCheck(); return; }
  if (z.hp <= 0 && !z.dead) {
    z.dead = true; scene.remove(z.mesh); st.stats.kills++; const bw = z.boss ? (z.blv || 1) - 1 : 0, loot = z.boss ? { gems: 5, metal: Math.round(120 * (1 + .3 * bw)), food: Math.round(80 * (1 + .3 * bw)) } : { food: 2 + Math.floor(Math.random() * 3), wood: 2 }; if (!(tour && String(by || '').indexOf('guard') === 0)) give(loot);   // an ally's hunters' kills are theirs fly(z.boss ? '💎' : '🍖', z, player);
    if (z.boss) { st.stats.bosses++; st.boss[z.zone] = NOW() + BOSS_RESPAWN; if (!tour) { st.bossWins = st.bossWins || {}; st.bossWins[z.zone] = (st.bossWins[z.zone] | 0) + 1; } toast('👹 Boss defeated! +' + costTxt(loot) + ' · it returns in 1 hour' + (tour ? '' : ', 25% stronger'), 4000); sfx(330, .3, .09); sfx(660, .5, .08, .2); }
    if (!zombies.some(o => !o.dead && o.zone === z.zone) && zoneType.apply(null, z.zone.split(',').map(Number)) === 'infected') { st.camps[z.zone] = NOW(); st.stats.camps++; const r = { metal: 25, wood: 30 }; if (Math.random() < .15) r.gems = 1; give(r); toast('🏕️ Camp cleared! +' + costTxt(r) + ' · the infected come back in 10 minutes', 4000); burst(z.x, z.z); }
    persist();
  }
}

// ------------------------------------------------------------ quests (Sarge's missions)
const nearestPadKey = pre => { let best = null, bd = 1e9; Object.keys(pads).forEach(k => { if (k.indexOf(pre) !== 0) return; const d = d2(player, pads[k]); if (d < bd) { bd = d; best = pads[k]; } }); return best; };
const nearestNode = arr => { let best = null, bd = 1e9; arr.forEach(n => { if (n.down || n.dead) return; const d = d2(player, n); if (d < bd) { bd = d; best = n; } }); return best; };
const bPos = id => ({ x: BD[id].x, z: BD[id].z });
const padFor = id => nearestPadKey('b:' + id + ':') || bPos(id);
const QUESTS = [
  ['Chop 10 wood from the trees', () => st.stats.wood, 10, { food: 10 }, () => nearestNode(trees)],
  ['Build the Lumberyard', () => lvl('lumber'), 1, { wood: 20 }, () => padFor('lumber')],
  ['Collect 10 from a building’s pile', () => st.stats.collected, 10, { food: 15 }, () => bPos('lumber')],
  ['Build the Farm', () => lvl('farm'), 1, { wood: 30 }, () => padFor('farm')],
  ['Build a House for survivors', () => lvl('house1'), 1, { food: 20 }, () => padFor('house1')],
  ['Unlock a new area (clear the fog)', () => st.stats.zones, 1, { wood: 40 }, () => nearestPadKey('z:')],
  ['Upgrade the Power Plant to level 2', () => lvl('pp'), 2, { metal: 15 }, () => padFor('pp')],
  ['Mine 10 metal from rocks', () => st.stats.metal, 10, { food: 30 }, () => nearestNode(rocks) || nearestPadKey('z:')],
  ['Defeat 5 infected', () => st.stats.kills, 5, { gems: 2 }, () => nearestNode(zombies) || nearestPadKey('z:')],
  ['Build the Smelter', () => lvl('smelter'), 1, { wood: 50 }, () => padFor('smelter')],
  ['Build the Hero Hall', () => lvl('hall'), 1, { metal: 30 }, () => padFor('hall')],
  ['Recruit Rusty at the Hero Hall', () => st.heroes.rusty ? 1 : 0, 1, { gems: 3 }, () => bPos('hall')],
  ['Clear an infected camp', () => st.stats.camps, 1, { gems: 3, metal: 40 }, () => nearestNode(zombies) || nearestPadKey('z:')],
  ['Unlock 4 areas', () => st.stats.zones, 4, { gems: 3 }, () => nearestPadKey('z:')],
  ['Upgrade the Power Plant to level 3', () => lvl('pp'), 3, { metal: 50 }, () => padFor('pp')],
  ['Build the Workshop', () => lvl('workshop'), 1, { gems: 2 }, () => padFor('workshop')],
  ['Upgrade your weapon to level 2', () => st.weapon, 2, { food: 60 }, () => bPos('workshop')],
  ['Recruit Leila the medic', () => st.heroes.leila ? 1 : 0, 1, { gems: 5 }, () => bPos('hall')],
  ['Defeat a boss (orange zombie)', () => st.stats.bosses, 1, { gems: 8 }, () => nearestNode(zombies.filter(z => z.boss)) || nearestPadKey('z:')],
  ['Upgrade the Power Plant to level 5', () => lvl('pp'), 5, { gems: 10 }, () => padFor('pp')],
  ['Unlock every area on the map', () => st.stats.zones, 24, { gems: 25 }, () => nearestPadKey('z:')]
];
function checkQuest() {
  if (moving) { const t = '📐 Moving the ' + BD[moving.id].n + ' · ' + (moving.swap ? '🔄 swap places with the ' + BD[moving.swap].n : moving.ok ? '✅ fits here' : '❌ ' + moving.why) + '<small>Walk to a spot (or onto another building to swap) · tap this bar to cancel</small>'; if ($('quest').innerHTML !== t) $('quest').innerHTML = t; checkQuest.h = null; return null; }
  if (tour && tour.arena) { const A = tour.arena, t = '🥊 Duel vs ' + WW.esc(duel ? duel.name : 'your ally') + ' · you ' + Math.round(st.hp) + '❤️ · them ' + Math.round(A.oppHp) + '❤️<small>' + (A.over ? 'Duel over' : fmt((A.end - NOW()) / 1000) + ' left · tap here to give up') + '</small>'; if ($('quest').innerHTML !== t) $('quest').innerHTML = t; checkQuest.h = null; return [0, 0, 0, 0, () => others[A.opp] || null]; }
  if (tbHere()) { const t = '👹 ' + (tb.name || 'Team boss') + ' · ' + Math.max(1, Math.ceil(tb.hp / tb.max * 100)) + '% health left · ' + fmt((tb.end - NOW()) / 1000) + '<small>Hit it together: everyone who lands a hit gets the loot</small>'; if ($('quest').innerHTML !== t) $('quest').innerHTML = t; checkQuest.h = null; return [0, 0, 0, 0, () => tbBoss]; }
  if (tour) { const t = tour.raid ? (tour.raid.won ? '🏆 Raid won! ' : '⚔️ Raiding ' + WW.esc(tour.name) + ' · ' + zombies.filter(z => z.def && !z.dead).length + ' defenders left') + '<small>Tap here to go home' + (tour.raid.won ? ' with the loot' : ' (gives up the raid)') + '</small>' : '👀 Visiting ' + WW.esc(tour.name) + '’s settlement<small>Tap here (or 🤝 Allies) to go home</small>'; if ($('quest').innerHTML !== t) $('quest').innerHTML = t; return null; }
  const q = QUESTS[st.q]; if (!q) { if (checkQuest.h === 'done') return null; checkQuest.h = 'done'; $('quest').innerHTML = '🏆 All of Sarge’s missions done!<small>Keep upgrading, farming bosses and helping allies.</small>'; return null; }
  const cur = Math.min(q[1](), q[2]);
  if (cur >= q[2]) { give(q[3]); toast('📜 Mission complete: ' + q[0] + ' · +' + costTxt(q[3]), 3500); sfx(784, .15, .07); sfx(1046, .3, .07, .12); st.q++; persist(); return checkQuest(); }
  const html = '📜 ' + q[0] + ' <span style="color:#fbbf24">[' + Math.floor(cur) + '/' + q[2] + ']</span><small>Sarge · mission ' + (st.q + 1) + ' of ' + QUESTS.length + ' · reward ' + costTxt(q[3]) + '</small>';
  if (checkQuest.h !== html) { checkQuest.h = html; $('quest').innerHTML = RH(html); }
  return q;
}
const arrow = new THREE.Group(); { const c = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 12), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); c.rotation.x = Math.PI; arrow.add(c); } scene.add(arrow);
const guide = new THREE.Mesh(new THREE.ConeGeometry(.28, .8, 3), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: .85 })); guide.rotation.x = Math.PI / 2; const guideG = new THREE.Group(); guideG.add(guide); guide.position.z = 1.5; scene.add(guideG);

// ------------------------------------------------------------ panels
const sheet = $('sheet'), card = $('card');
function show(h) { card.innerHTML = RH(h) + '<div style="margin-top:10px"><button class="b alt" data-a="close">Close</button></div>'; sheet.style.display = 'flex'; }
function closeSheet() { sheet.style.display = 'none'; }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
card.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a || a.disabled) return; doAct(a.dataset.a, a.dataset); });
function heroPanel(fromHall) {
  const hl = lvl('hall');
  let h = '<h3>🛡️ Heroes</h3><div class="muted">Your heroes follow you and fight anything that attacks. ' + (hl ? 'Hero Hall Lv' + hl + ': heroes can reach level ' + hl * 5 + '.' : 'Build the <b>Hero Hall</b> (Power Plant Lv2) to recruit and train heroes.') + '</div>';
  Object.keys(HEROES).forEach(id => {
    const H = HEROES[id], o = st.heroes[id];
    if (!o) { h += '<div class="row"><div class="g"><b>' + H.i + ' ' + H.n + '</b> <span class="muted">' + H.role + '</span></div><button class="b" data-a="recruit" data-id="' + id + '" ' + (hl && canPay(H.cost) ? '' : 'disabled') + '>' + (hl ? 'Recruit ' + costTxt(H.cost) : '🔒 Hero Hall') + '</button></div>'; return; }
    const s = heroStat(id, o.lvl), c = heroUpCost(o.lvl), max = Math.max(1, hl * 5);
    h += '<div class="row"><div class="g"><b>' + H.i + ' ' + H.n + ' L' + o.lvl + '</b> <span class="muted">' + H.role + ' · ❤️' + s.hp + ' ⚔️' + s.atk + (H.heal ? ' 💚' + s.heal : '') + '</span></div><button class="b" data-a="herolvl" data-id="' + id + '" ' + (hl && o.lvl < max && canPay(c) ? '' : 'disabled') + '>' + (o.lvl >= max ? 'Max (Hall Lv)' : '⬆ ' + costTxt(c)) + '</button></div>';
  });
  show(h + (fromHall ? moveRow('hall') : ''));
}
function workshopPanel() {
  const w = st.weapon, c = weaponCost(w), max = lvl('workshop') + 1;
  show('<h3>🔨 Workshop</h3><div class="muted">Better weapons hit harder and chop faster. Weapon level is limited to Workshop level + 1.</div><div class="row"><div class="g"><b>⚔️ Weapon Lv' + w + '</b> <span class="muted">⚔️ ' + weaponDmg(w) + ' damage</span></div><button class="b" data-a="weapon" ' + (w < max && canPay(c) ? '' : 'disabled') + '>' + (w >= max ? 'Upgrade the Workshop' : '⬆ ' + costTxt(c) + ' → ⚔️' + weaponDmg(w + 1)) + '</button></div>' + moveRow('workshop'));
}
// what a building does at a given level (used for "now" and "next level" in its info card)
function bInfo(id, L) {
  const D = BD[id];
  if (id === 'pp') { const nu = Object.keys(BD).filter(k => BD[k].need === L && k !== 'pp').map(k => BD[k].i + ' ' + BD[k].n); return 'Other buildings can be upgraded up to level ' + L + '.' + (nu.length && L > 1 ? ' New buildings: ' + nu.join(', ') + '.' : '') + ' It only levels up once every building has caught up to it.'; }
  if (D.out) return 'Makes about ' + RES[D.out] + ' ' + (D.rate * L * 60).toFixed(1) + '/min with a full crew, into a pile that holds ' + 40 * L + '. 3% of what it makes helps build your other buildings (5% to the Power Plant once they\u2019re all caught up), and a full pile\u2019s extra goes there too.' + (ROLES[id] ? ' ' + crewSize(L) + ' ' + ROLES[id].name.replace(/^\S+ /, '').toLowerCase() + 's (' + AWAY_CREW + ' keep working while you\u2019re away)' + (id === 'lumber' ? ' chop trees' : id === 'smelter' ? ' break rocks' : ' hunt deer') + ' and bring the haul here.' : '');
  if (id.indexOf('house') === 0) return 'Shelters ' + 2 * L + ' survivors to work your buildings.';
  if (id === 'hall') return 'Heroes can be trained up to level ' + 5 * L + '. ' + Math.min(4, L) + ' infected hunter' + (Math.min(4, L) > 1 ? 's' : '') + ' (❤️' + (60 + 25 * L) + ', ' + (6 + 3 * L) + ' damage) hunt down the infected for you.';
  if (id === 'workshop') return 'Your weapon can be upgraded up to level ' + (L + 1) + ' (' + weaponDmg(L + 1) + ' damage).';
  return '';
}
function infoBlock(id) {
  const b = st.b[id] || { lvl: 0 }, L = b.lvl | 0, nx = L + 1;
  const behind = id === 'pp' ? behindPP() : [];
  let h = (behind.length ? '<div class="row"><div class="g"><b style="color:#fde68a">Catch these up to level ' + L + ' first</b><div class="muted">' + behind.map(k => BD[k].i + ' ' + BD[k].n + ' (' + (st.b[k].up ? 'upgrading' : st.b[k].lvl ? 'Lv' + st.b[k].lvl : 'not built') + ')').join(' · ') + '</div></div></div>' : '') + '<div class="row"><div class="g"><b>' + (L ? 'Now (level ' + L + ')' : 'When built') + '</b><div class="muted">' + bInfo(id, Math.max(1, L)) + '</div></div></div>';
  if (L) h += '<div class="row"><div class="g"><b>Next level (' + nx + ')</b><div class="muted">' + bInfo(id, nx) + '<br>Costs ' + costTxt(costFor(id, nx)) + (upTime(nx) ? ' · builds in ' + fmt(upTime(nx)) : '') + (nx > cap(id) ? ' · needs 🔌 Power Plant level ' + nx : '') + '</div></div></div>';
  return h;
}
function buildingPanel(id, info) {
  const D0 = BD[id], b0 = st.b[id] || { lvl: 0 };
  if (info || !b0.lvl) return show('<h3>' + D0.i + ' ' + D0.n + (b0.lvl ? ' · level ' + b0.lvl : ' · not built yet') + '</h3>' + infoBlock(id) + (b0.lvl ? '<div class="row"><button class="b" data-a="bopen" data-id="' + id + '">Open</button></div>' : '<div class="row muted">' + (D0.need > lvl('pp') ? 'Unlocks with 🔌 Power Plant level ' + D0.need + '.' : 'Stand on its yellow pad to build it.') + '</div>') + moveRow(id));
  if (id === 'hall') return heroPanel(true); if (id === 'workshop') return workshopPanel();
  const D = BD[id], b = st.b[id]; let h = '<h3>' + D.i + ' ' + D.n + ' · level ' + b.lvl + '</h3>' + infoBlock(id);
  if (id === 'pp') h += '<div class="muted">Every other building can only be upgraded up to the Power Plant’s level.</div>';
  if (D.out) h += '<div class="muted">Makes ' + RES[D.out] + ' ' + (D.rate * b.lvl * efficiency() * 60).toFixed(1) + '/min into its pile (holds ' + 40 * b.lvl + '). Walk up to it to collect. Workers: ' + survivors() + ' survivors for ' + producers().length * 2 + ' jobs' + (st.res.food <= 0 ? ' · <b style="color:#fca5a5">no food — half speed</b>' : '') + '.</div>';
  if (id.indexOf('house') === 0) h += '<div class="muted">Each house level shelters 2 more survivors to work your buildings.</div>';
  if (b.up) h += '<div class="row"><div class="g">Upgrading to level ' + b.up.to + '<div class="pb"><i style="width:' + Math.min(100, 100 - (b.up.end - NOW()) / b.up.total * 100) + '%"></i></div><div class="muted">' + fmt((b.up.end - NOW()) / 1000) + ' left · ' + Object.keys(b.up.h || {}).length + '/' + MAX_HELPS + ' ally helps</div></div><button class="b alt" data-a="finish" data-id="' + id + '" ' + (st.res.gems >= finishCost(b.up) ? '' : 'disabled') + '>⚡ Finish 💎' + finishCost(b.up) + '</button><button class="b alt" style="margin-left:6px" data-a="mfinish" data-id="' + id + '" ' + (st.res.metal >= metalFinish(b.up) ? '' : 'disabled') + '>⚡ Finish 🔩' + metalFinish(b.up) + '</button></div>';
  else if (b.lvl >= cap(id)) h += '<div class="row muted">Max for now — upgrade the 🔌 Power Plant first.</div>';
  else h += '<div class="row muted">Stand on the yellow pad in front of it to deliver resources for the next level.</div>';
  if (id === 'smelter') h += tradeRows();
  show(h + moveRow(id));
}
// ------------------------------------------------------------ town layout: move any building to a new spot in your home area
// Open a building → 📐 Move, walk to where you want it (it floats in front of you), tap 📍 Place here. Aim it at another
// building and the two swap places. Saved in st.lay (and published, so allies see your layout).
const HOME_TREES = [[-11, -11], [11, -11], [-11, 11], [11, 11], [-4.5, -11.3], [-11.3, 4.5], [11.3, 4.5], [-4.5, 11.3]];
const padOff = id => id === 'pp' ? 3.9 : 3.4;   // each building's build/upgrade pad sits this far in front (+z) of it
let moving = null;   // { id, ghost, x, z, ok, why }
function moveRow(id) {
  if (tour) return '';
  const moved = st.lay && st.lay[id];
  return '<div class="row"><div class="g"><b>📐 Layout</b><div class="muted">Move this building anywhere in your home area. Crews, pads and everything else follow it.</div></div><button class="b alt" data-a="bmove" data-id="' + id + '">📐 Move</button>' + (moved ? '<button class="b alt" style="margin-left:6px" data-a="bhome" data-id="' + id + '">↩️ Original spot</button>' : '') + '</div>';
}
function spotProblem(id, x, z, skip) {   // '' when the building fits at x, z (ignoring `skip`); otherwise why not
  const D = BD[id], pz = z + padOff(id);
  if (Math.abs(x) > 11.4 - D.r || z < -11.4 + D.r || pz > 11.5) return 'too close to the edge of town';
  for (const o of Object.keys(BD)) {
    if (o === id || o === skip) continue; const B = BD[o], oz = B.z + padOff(o);
    if (Math.hypot(x - B.x, z - B.z) < D.r + B.r + .8) return 'too close to the ' + B.n;
    if (Math.hypot(x - B.x, z - oz) < D.r + 1.4) return 'that’s the ' + B.n + '’s pad';
    if (Math.hypot(x - B.x, pz - B.z) < B.r + 1.4) return 'its pad would land on the ' + B.n;
    if (Math.hypot(x - B.x, pz - oz) < 2.7) return 'its pad would overlap the ' + B.n + '’s pad';
  }
  for (const d of DIRS) if (Math.hypot(x - d[2], z - d[3]) < D.r + 1.5 || Math.hypot(x - d[2], pz - d[3]) < 2.7) return 'that’s an area-unlock pad';
  for (const t of HOME_TREES) if (Math.hypot(x - t[0], z - t[1]) < D.r + .9) return 'a tree is in the way';
  return '';
}
function moveStart(id) {
  if (tour || !BD[id]) return; if (moving) moveEnd(); closeSheet();
  const g = bldMeshes[id] ? null : bldMesh(id, 1); if (g) { g.scale.multiplyScalar(.6); scene.add(g); }   // not built yet: move its build spot
  moving = { id: id, ghost: g, x: BD[id].x, z: BD[id].z, ok: false, why: '' };
  toast('📐 Walk to where you want the ' + BD[id].n + ' (it floats in front of you), then tap 📍 Place here', 6000);
}
function moveTick() {
  const M = moving; if (!M) return; const id = M.id, D = BD[id], f = D.r + 1.8;
  M.x = Math.round((player.x + Math.sin(player.ry || 0) * f) * 2) / 2; M.z = Math.round((player.z + Math.cos(player.ry || 0) * f) * 2) / 2;
  M.why = spotProblem(id, M.x, M.z); M.ok = !M.why; M.swap = null;
  if (!M.ok) {   // aimed at another building: the two trade places (the town is full, so this is how you rearrange it)
    const o = Object.keys(BD).find(k => k !== id && Math.hypot(M.x - BD[k].x, M.z - BD[k].z) < 2.6);
    if (o && !spotProblem(id, BD[o].x, BD[o].z, o) && !spotProblem(o, D.x, D.z, id)) { M.swap = o; M.x = BD[o].x; M.z = BD[o].z; M.ok = true; M.why = ''; }
  }
  const m = M.ghost || bldMeshes[id]; if (m) { m.position.set(M.x, M.ok ? 0 : .25 * Math.abs(Math.sin(NOW() / 120)), M.z); }
  const lb = bldLabels[id]; if (lb) lb.position.set(M.x, id === 'pp' ? 6.6 : 4.6, M.z);
  if (id === 'pp' && ppPath) ppPath.position.set(M.x, ppPath.position.y, M.z);
}
function setSpot(id, x, z) {
  st.lay = st.lay || {};
  if (x === BD0[id].x && z === BD0[id].z) delete st.lay[id]; else st.lay[id] = { x: x, z: z };
}
function movePlace() {
  const M = moving; if (!M) return; moveTick();
  if (!M.ok) { toast('❌ Can’t place it there: ' + M.why); sfx(140, .12, .05); return; }
  const o = M.swap, ox = BD[M.id].x, oz = BD[M.id].z;
  setSpot(M.id, M.x, M.z); if (o) setSpot(o, ox, oz); moveEnd(); if (o) { refreshSpot(o); burst(ox, oz); }
  burst(BD[M.id].x, BD[M.id].z); sfx(660, .15, .07); sfx(880, .2, .07, .1);
  toast(o ? '🔄 ' + BD[M.id].n + ' and ' + BD[o].n + ' swapped places!' : '📍 ' + BD[M.id].i + ' ' + BD[M.id].n + ' moved!'); persist(); publishPub();
}
function moveHome(id) {
  if (tour) return; closeSheet(); if (moving) moveEnd();
  const why = spotProblem(id, BD0[id].x, BD0[id].z);
  if (why) return toast('↩️ Its original spot is taken (' + why + '). Move that one first, or use 📐 Move.', 5000);
  setSpot(id, BD0[id].x, BD0[id].z); refreshSpot(id); toast('↩️ ' + BD[id].n + ' is back in its original spot'); persist(); publishPub();
}
function refreshSpot(id) {   // put the building, its label and its pad where BD says
  applyLayout(st.lay);
  if (bldMeshes[id]) bldMeshes[id].position.set(BD[id].x, 0, BD[id].z);
  if (bldLabels[id]) bldLabels[id].position.set(BD[id].x, id === 'pp' ? 6.6 : 4.6, BD[id].z);
  if (ppPath) ppPath.position.set(BD.pp.x, ppPath.position.y, BD.pp.z);
  Object.keys(pads).forEach(k => { if (k.indexOf('b:' + id + ':') === 0) { scene.remove(pads[k].mesh); delete pads[k]; } });
  syncPads(); checkQuest.h = null;
}
function moveEnd() {   // finish or cancel: everything goes back to where the saved layout says
  const M = moving; if (!M) return; moving = null;
  if (M.ghost) scene.remove(M.ghost);
  refreshSpot(M.id);
}
function questsPanel() { show('<h3>📜 Sarge’s missions</h3>' + QUESTS.map((q, i) => '<div class="row"><div class="g">' + (i < st.q ? '✅ ' : i === st.q ? '👉 ' : '🔒 ') + q[0] + '</div><span class="muted">' + costTxt(q[3]) + '</span></div>').join('') + '<div class="muted">Tip: drag anywhere on the screen to walk. Your survivor chops, mines and fights on their own when close. Stand on a pad to pay for it.</div>'); }
function doAct(a, d) {
  if (a === 'close') return closeSheet();
  if (a === 'recruit') { const c = HEROES[d.id].cost; if (!canPay(c)) return; pay(c); st.heroes[d.id] = { lvl: 1 }; syncHeroes(); toast(HEROES[d.id].n + ' joined your squad!'); heroPanel(); }
  if (a === 'herolvl') { const o = st.heroes[d.id], c = heroUpCost(o.lvl); if (!canPay(c)) return; pay(c); o.lvl++; syncHeroes(); heroes[d.id].hp = heroes[d.id].max; heroPanel(); }
  if (a === 'weapon') { const c = weaponCost(st.weapon); if (!canPay(c)) return; pay(c); st.weapon++; toast('⚔️ Weapon level ' + st.weapon); workshopPanel(); }
  if (a === 'mfinish') { const u = st.b[d.id].up, mc = metalFinish(u); if (!u || st.res.metal < mc) return; st.res.metal -= mc; u.end = NOW(); economy(0); syncBuildings(); syncPads(); closeSheet(); toast('⚡ Finished with ' + RES.metal + mc); }
  if (a === 'trade') { const k = d.k, r = TRADE[k]; if (!r) return; const n = d.n === 'half' ? Math.floor(Math.floor((st.res.metal || 0) / 2) / r) : +d.n; if (!(n > 0) || st.res.metal < n * r) return;
    st.res.metal -= n * r; st.res[k] = (st.res[k] || 0) + n; toast('🔄 ' + RES.metal + n * r + ' → ' + RES[k] + n); sfx(520, .12, .06); persist(); hud(); return buildingPanel('smelter'); }
  if (a === 'finish') { const fc = finishCost(st.b[d.id].up); if (!st.b[d.id].up || st.res.gems < fc) return; st.res.gems -= fc; st.b[d.id].up.end = NOW(); economy(0); syncBuildings(); syncPads(); closeSheet(); }
  if (a === 'visit') return visit(($('vcode').value || '').trim().toUpperCase());
  if (a === 'visitf') return visit(d.code);
  if (a === 'raid') return raid(d.code);
  if (a === 'tboss') return tbStart();
  if (a === 'callallies') return callAllies();
  if (a === 'tbjoin') return tbJoin(d.code);
  if (a === 'duel') return duelChallenge(d.code, d.name);
  if (a === 'duelyes') return duelAnswer(true);
  if (a === 'duelno') return duelAnswer(false);
  if (a === 'back') { if (tour) return goHome(); visiting = null; return alliesPanel(); }
  if (a === 'help') return helpFriend(d.k);
  if (a === 'bopen') return buildingPanel(d.id);
  if (a === 'bmove') return moveStart(d.id);
  if (a === 'bhome') return moveHome(d.id);
  persist(); hud();
}
$('bHeroes').onclick = heroPanel; $('bShop').onclick = () => shopPanel(); $('bQuests').onclick = questsPanel; $('quest').onclick = () => moving ? (moveEnd(), toast('📐 Move cancelled')) : tour ? goHome() : questsPanel(); $('bAllies').onclick = () => alliesPanel();
$('bMute').onclick = () => { muted = !muted; localStorage.setItem('ts3_mute', muted ? '1' : '0'); $('bMute').firstChild.textContent = muted ? '🔇' : '🔊'; };
$('bMute').firstChild.textContent = muted ? '🔇' : '🔊';
let actTarget = null;
function actPress() { if (moving) return movePlace(); if (tour) return alliesPanel(); if (actTarget) buildingPanel(actTarget); }
$('act').onclick = actPress;

// ------------------------------------------------------------ allies (other players help your upgrade timers)
let uid = null, code = null, visiting = null, tour = null;
// walk around a friend's settlement (built from what they publish); your own stays safe in tour.home and keeps being saved
function startTour(c, p, raiding) {
  if (!p || !p.w) return false;
  if (tour) goHome(true);
  tour = { home: st, at: NOW(), hx: player.x, hz: player.z, D: {} }; tour.code = c; tour.name = p.name || 'Survivor';
  // visiting an ally pays off: a daily visit bonus for each friend, and whatever you gather there comes home with you
  const H = tour.home, day = new Date().toDateString(); if (H.visitDay !== day) { H.visitDay = day; H.visited = {}; }
  if (!raiding && !H.visited[c]) { H.visited[c] = 1; const bonus = { wood: 25, food: 15, metal: 5 }; Object.keys(bonus).forEach(k => { H.res[k] = (H.res[k] || 0) + bonus[k]; }); setTimeout(() => toast('🎁 Visit bonus for your settlement: +' + costTxt(bonus), 3500), 1600); }
  const w = JSON.parse(JSON.stringify(p.w)); st = fix(Object.assign(fresh(), { b: w.b || fresh().b, zones: w.zones || fresh().zones, heroes: JSON.parse(JSON.stringify(tour.home.heroes || {})), weapon: tour.home.weapon || 1, paid: w.paid || {}, bossWins: w.bw || {}, lay: w.lay || {} }));   // your own squad and weapon come with you
  tour.S = Object.assign({ wood: 0, food: 0, metal: 0, gems: 0 }, JSON.parse(JSON.stringify(tour.home.res))); tour.D = tour.D || {};
  st.res = Object.assign({}, tour.S); st.hp = player.hpMax || 100; player.x = 3; player.z = 6;   // you bring your own resources to build with
  loadWorld(); setRoom(c); toast('👀 Welcome to ' + tour.name + '’s settlement!'); return true;
}
function goHome(quiet) {
  if (!tour) return; const t = tour, keysR = ['wood', 'food', 'metal', 'gems'];
  if (t.arena && !t.arena.over) { duelLose(true); toast('🏳️ You left the duel.'); }
  if (t.arena) { duel = null; duelRef = null; }
  // what you spent on their pads, and what you gathered there (end - start + spent)
  const spent = {}; Object.keys(t.D).forEach(key => Object.keys(t.D[key]).forEach(k => { spent[k] = (spent[k] || 0) + t.D[key][k]; }));
  const gath = {}; keysR.forEach(k => { const g = Math.floor((st.res[k] || 0) - (t.S[k] || 0) + (spent[k] || 0)); if (g > 0) gath[k] = g; });
  tour = null; visiting = null; st = t.home; checkQuest.h = null;
  if (t.raid) {
    st.raids = st.raids || {}; st.raids[t.code] = NOW(); if (t.raid.rev && st.raidedBy) delete st.raidedBy[t.code];
    if (t.raid.won && Object.keys(t.raid.loot).length) {
      Object.keys(t.raid.loot).forEach(k => { st.res[k] = (st.res[k] || 0) + t.raid.loot[k]; }); setTimeout(() => toast('⚔️ Raid loot: +' + costTxt(t.raid.loot), 4000), 400);
      const neg = {}; Object.keys(t.raid.loot).forEach(k => { neg[k] = -t.raid.loot[k]; });
      try { WW.roomRef('survive', t.code).child('gifts').push({ from: WW.nick || String((WW.user && WW.user.displayName) || 'An ally').split(' ')[0], code: code, res: neg, raid: 1, at: NOW() }); } catch (e) {}
    }
  }
  const mine = {}, theirs = { res: {}, paid: {} }, homePads = wantedPads(), toPads = {};
  keysR.forEach(k => { st.res[k] = Math.max(0, (st.res[k] || 0) - (spent[k] || 0)); const g = gath[k] || 0, a = t.arena ? g : Math.floor(g / 2); if (a) { mine[k] = a; st.res[k] += a; } if (g - a) theirs.res[k] = g - a; });
  Object.keys(t.D).forEach(key => Object.keys(t.D[key]).forEach(k => { const n = t.D[key][k], half = n / 2;
    (theirs.paid[key] = theirs.paid[key] || {})[k] = half;
    if (homePads[key]) { (st.paid[key] = st.paid[key] || {})[k] = (st.paid[key][k] || 0) + half; toPads[k] = (toPads[k] || 0) + half; }   // the same build at home gets the other half
    else { st.res[k] = (st.res[k] || 0) + half; mine[k] = (mine[k] || 0) + half; } }));                                                    // nothing to match at home: you keep that half
  if (!t.arena && (Object.keys(theirs.res).length || Object.keys(theirs.paid).length) && WW && WW.roomRef) try { WW.roomRef('survive', t.code).child('gifts').push({ from: WW.nick || String((WW.user && WW.user.displayName) || 'An ally').split(' ')[0], res: theirs.res, paid: theirs.paid, at: NOW() }); } catch (e) {}
  const msg = [];
  if (Object.keys(mine).length) msg.push('🎒 Your half: ' + costTxt(mine));
  if (Object.keys(toPads).length) msg.push('🏗️ Your builds: ' + costTxt(toPads));
  if (!t.arena && (Object.keys(theirs.res).length || Object.keys(theirs.paid).length)) msg.push('🤝 ' + t.name + ' gets the other half');
  if (msg.length) setTimeout(() => toast(msg.join(' · '), 4500), 900);
  const off = (NOW() - t.at) / 1000; if (off > 1) awayCatchUp(off, true);
  player.x = t.hx; player.z = t.hz; loadWorld(); setRoom(code); tbListen(code); applyHelps(); applyGifts(); persist(); if (!quiet) { toast('🏠 Back home'); closeSheet(); }
}
function publishPub() {
  if (tour || !code || !WW || WW.mode !== 'cloud') return;
  const ups = Object.keys(BD).filter(id => st.b[id].up).map(id => { const u = st.b[id].up; return { id: id, k: id + '_' + u.to, n: BD[id].n, i: BD[id].i, to: u.to, end: u.end, total: u.total, c: Object.keys(u.h || {}).length }; });
  try { WW.roomRef('survive', code).child('pub').set({ name: WW.nick || String((WW.user && WW.user.displayName) || 'Survivor').split(' ')[0], pp: lvl('pp'), zones: st.stats.zones, ups: ups, w: { b: st.b, zones: st.zones, heroes: st.heroes, paid: st.paid || {}, bw: st.bossWins || {}, lay: st.lay || {} }, res: { wood: Math.floor(st.res.wood), food: Math.floor(st.res.food), metal: Math.floor(st.res.metal) }, at: NOW() }); } catch (e) {}   // w = enough of the settlement for friends to walk around it
}
// ------------------------------------------------------------ shop: real-money packs, paid through PayPal
// The page never decides that a purchase went through. The ww-discord-auth server (Claude-Test/discord-auth/paypal.js)
// captures the order with PayPal itself, checks it's COMPLETED for the right price and player, and only then writes the
// grant to Firestore: user/{CODE}/platform/mobile/game/survive3_shop/orders/{orderId}. Each order is added to the save
// once (st.orders remembers which). Orders that were paid but not confirmed (closed tab, lost signal) are retried on load.
const PAY_URL = 'https://ww-discord-auth.onrender.com', SHOP_PACK = 'survive_2000', PEND_KEY = 'ts3_pay_pend';
let shopCfg = null, ppLoaded = null;
async function shopConfig() { if (shopCfg && shopCfg.packs) return shopCfg; try { shopCfg = await (await fetch(PAY_URL + '/pay/config')).json(); } catch (e) { shopCfg = null; } return shopCfg; }
async function idTok() { try { return WW && WW.user ? await WW.user.getIdToken() : ''; } catch (e) { return ''; } }
async function payPost(path, body) {
  const r = await fetch(PAY_URL + path, { method: 'POST', body: new URLSearchParams(body) }); const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || ('Shop error ' + r.status)); return j;
}
function loadPayPal(cid) {
  if (ppLoaded) return ppLoaded;
  ppLoaded = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cid) + '&currency=USD&intent=capture&components=buttons';
    sc.onload = () => res(window.paypal); sc.onerror = () => { ppLoaded = null; rej(new Error('PayPal didn’t load. Check your connection and try again.')); }; document.head.appendChild(sc); });
  return ppLoaded;
}
const pendList = () => { try { return JSON.parse(localStorage.getItem(PEND_KEY)) || []; } catch (e) { return []; } };
const pendSet = l => { try { localStorage.setItem(PEND_KEY, JSON.stringify(l)); } catch (e) {} };
function grantOrder(id, g) {   // add a paid order's resources to YOUR settlement, once
  const H = tour ? tour.home : st; if (!g || !g.res) return false; H.orders = H.orders || {}; if (H.orders[id]) return false;
  H.orders[id] = NOW(); Object.keys(g.res).forEach(k => { H.res[k] = (H.res[k] || 0) + (+g.res[k] || 0); });
  if (tour) tour.S && Object.keys(g.res).forEach(k => { st.res[k] = (st.res[k] || 0) + (+g.res[k] || 0); tour.S[k] = (tour.S[k] || 0) + (+g.res[k] || 0); });   // visiting: it's yours, not part of the trip's split
  sfx(784, .2, .08); sfx(1046, .35, .08, .15); toast('📦 Thank you! ' + (g.name || 'Pack') + ': +' + costTxt(g.res), 7000);
  persist(); cloudSave(); hud(); return true;
}
async function confirmOrder(id) {
  const j = await payPost('/pay/capture', { idToken: await idTok(), orderId: id });
  pendSet(pendList().filter(x => x !== id));
  if (j.grant) grantOrder(id, j.grant); else await claimShop();
  return j;
}
async function claimShop() {   // pick up every paid order (also ones bought on another device)
  if (!WW || WW.mode !== 'cloud' || !WW.user || !WW.friendCode || !WW.mobileDoc) return;
  try { const d = await WW.mobileDoc('survive3_shop'); if (!d) return; const q = await d.collection('orders').get(); q.forEach(o => grantOrder(o.id, o.data())); } catch (e) { console.warn('shop claim', e && (e.code || e.message)); }
}
async function shopStartup() { for (const id of pendList()) { try { await confirmOrder(id); } catch (e) { console.warn('pending order', id, e.message); } } claimShop(); }
async function shopPanel(note) {
  if (tour) return toast('🛒 Go home to open the shop');
  let h = '<h3>🛒 Shop</h3>' + (note ? '<div class="muted" style="color:#fde68a">' + WW.esc(note) + '</div>' : '');
  if (!WW || WW.mode !== 'cloud' || !WW.user || !WW.friendCode) return show(h + '<div class="row muted">Sign in on the games hub to buy. Purchases go to your account, so they follow you to every device.</div>');
  show(h + '<div class="row muted">Opening the shop…</div>');
  const cfg = await shopConfig(), P = cfg && cfg.packs && cfg.packs[SHOP_PACK];
  if (!P) return show(h + '<div class="row muted">The shop couldn’t be reached. Give it a minute (the shop server may be waking up) and try again.</div>');
  h += '<div class="row"><div class="g"><b>📦 ' + WW.esc(P.name) + ' · $' + WW.esc(P.price) + '</b><div class="muted">' + costTxt(P.res) + ' added to your settlement as soon as PayPal confirms the payment. Works on all your devices.</div></div></div>';
  if (!cfg.clientId) return show(h + '<div class="row muted">The shop isn’t open yet. Check back soon!</div>');
  show(h + (cfg.mode === 'sandbox' ? '<div class="muted" style="color:#fde68a">Test mode: no real money is charged.</div>' : '') + '<div id="ppBtns" style="margin-top:8px;min-height:50px;background:#fff;border-radius:10px;padding:8px"></div><div class="muted" style="margin-top:6px">Payments are handled securely by PayPal (PayPal or card). Sales are final; if something goes wrong, message werewolf.</div>');
  try {
    const pp = await loadPayPal(cfg.clientId), box = $('ppBtns'); if (!box) return;
    pp.Buttons({ style: { layout: 'vertical', shape: 'pill', label: 'pay' },
      createOrder: async () => (await payPost('/pay/create', { idToken: await idTok(), pack: SHOP_PACK })).id,
      onApprove: async d => { pendSet(pendList().concat(d.orderID)); closeSheet(); toast('⏳ Confirming your payment with PayPal…', 9000); try { await confirmOrder(d.orderID); } catch (e) { shopPanel(e.message + ' (it will be checked again next time you open the game)'); } },
      onCancel: () => toast('Purchase cancelled'),
      onError: e => shopPanel('PayPal: ' + ((e && e.message) || 'something went wrong')) }).render(box);
  } catch (e) { shopPanel(e.message); }
}
function alliesPanel(note) {
  let h = '<h3>🤝 Allies</h3><div class="muted">Your friends show up below. Visit one to <b>help</b> their upgrade timers, and they can help yours (' + MAX_HELPS + ' helps per upgrade, each cuts ~15%). Help theirs back and earn ' + RES.wood + '15 (10 a day). While you play on your own map, each ally gets ' + Math.round(sharePct((shareAllies || []).length) * 100 || 5) + '% of what you gather (5% with one ally, down to 1% each with five or more).</div>' + (note ? '<div class="muted" style="color:#fde68a">' + note + '</div>' : '');
  if (!WW || WW.mode !== 'cloud' || !WW.user) h += '<div class="row muted">Sign in on the games hub to team up with allies.</div>';
  else {
    // your friends list (the same friends as everywhere else on the site): no codes to type
    if (!visiting && !tour) h += '<div class="row"><div class="g"><b>⚔️ Battles</b><div class="muted">👹 <b>Team boss</b>: start one on your map and every ally can join to hit it together (10 min, everyone who hits it gets the loot). 🥊 <b>Duel</b>: a live 1-on-1 with an ally who is playing right now. ⚔️ <b>Raid</b>: attack an ally’s settlement, even when they’re away.</div></div><button class="b" style="background:#15803d;color:#fff" data-a="tboss"' + (tb && tb.room === code && tb.hp > 0 ? ' disabled' : '') + '>👹 Start team boss</button></div>' + (lairBoss() ? '<div class="row"><div class="g"><b>📣 Call allies to your lair boss</b><div class="muted">The 👹 Boss Lv' + lairBoss().blv + ' on your map becomes a team fight your allies can join.</div></div><button class="b" style="background:#c2410c;color:#fff" data-a="callallies">📣 Call allies</button></div>' : '');
    if (!visiting) {
      if (!allyList) { h += '<div class="row muted">Loading your friends…</div>'; loadAllyList(); }
      else if (!allyList.length) h += '<div class="row muted">No friends yet. Add friends with their friend code on the games hub, and they show up here.</div>';
      else h += allyList.map(f => '<div class="row"><div class="g"><b>' + WW.esc(f.name) + '</b><div class="muted">' + (f.pub ? 'Power Plant Lv' + (f.pub.pp || 1) + ' · ' + (f.pub.zones || 0) + ' areas · ' + (f.open ? '<b style="color:#fde68a">' + f.open + ' upgrade' + (f.open > 1 ? 's' : '') + ' to help</b>' : 'nothing to help right now') : 'hasn\u2019t started Tile Survival yet') + '</div></div><button class="b" data-a="visitf" data-code="' + f.code + '"' + (f.pub ? '' : ' disabled') + '>Visit</button>' + raidBtn(f) + (f.pub ? '<button class="b" style="background:#7c3aed;color:#fff;margin-left:6px" data-a="duel" data-code="' + f.code + '" data-name="' + WW.esc(f.name) + '">🥊 Duel</button>' : '') + (f.tb ? '<button class="b" style="background:#15803d;color:#fff;margin-left:6px" data-a="tbjoin" data-code="' + f.code + '">👹 Join boss</button>' : '') + '</div>').join('');
      h += '<details class="muted" style="margin-top:6px"><summary>Visit someone not on your friends list</summary><div class="row"><input id="vcode" maxlength="8" placeholder="FRIEND\'S CODE"><button class="b" data-a="visit">Visit</button></div></details>';
    } else h += '<div class="row"><button class="b alt" data-a="back">' + (tour ? '🏠 Go home' : '← All friends') + '</button></div>';
    if (visiting) { const p = visiting.pub, ups = (p.ups || []).filter(u => u.end > NOW());
      h += '<div class="muted"><b>' + WW.esc(p.name || 'Survivor') + '</b> · Power Plant Lv' + (p.pp || 1) + ' · ' + (p.zones || 0) + ' areas unlocked</div>';
      h += ups.length ? ups.map(u => { const done = visiting.mine[u.k]; return '<div class="row"><div class="g"><b>' + u.i + ' ' + u.n + ' → Lv' + u.to + '</b><div class="muted">' + fmt((u.end - NOW()) / 1000) + ' left · ' + (u.c || 0) + '/' + MAX_HELPS + ' helps</div></div><button class="b" data-a="help" data-k="' + u.k + '" ' + (done || (u.c || 0) >= MAX_HELPS ? 'disabled' : '') + '>' + (done ? 'Helped ✔' : '🤝 Help') + '</button></div>'; }).join('') : '<div class="row muted">They have nothing upgrading right now.</div>'; }
  }
  show(h);
}
// friends from users/{key}/friends, each with their settlement summary (their survive room is keyed by their friend code)
let allyList = null, allyLoading = false, shareAllies = null;
// playing on your own map shares a little of what you gather with your allies (Tile Survival players on your friends list):
// each ally gets 5% with one ally, 4% with two ... down to 1% each with five or more, so you still keep most of it for your own upgrades
function sharePct(n) { return n ? Math.max(1, 6 - n) / 100 : 0; }
function shareTick() {
  if (tour || !code || !WW || WW.mode !== 'cloud' || !WW.user) return;
  if (!shareAllies) { loadAllyList(); return; }
  const A = shareAllies.filter(f => f.code !== code); st.shareMark = st.shareMark || {}; st.shareCarry = st.shareCarry || {};
  const pct = sharePct(A.length), out = {};
  if (A.length && st.allyPending) Object.keys(st.allyPending).forEach(k => { const each = Math.floor(st.allyPending[k] / A.length); if (each >= 1) { out[k] = (out[k] || 0) + each; st.allyPending[k] -= each * A.length; } });   // your crews' share from while you were away
  ['wood', 'metal', 'food'].forEach(k => {
    const now = st.stats[k] || 0, last = st.shareMark[k] === undefined ? now : st.shareMark[k]; st.shareMark[k] = now; if (!A.length) return;
    st.shareCarry[k] = (st.shareCarry[k] || 0) + Math.max(0, now - last) * pct;   // per ally
    const each = Math.floor(st.shareCarry[k]); if (each < 1) return;
    const can = Math.min(each, Math.floor((st.res[k] || 0) / A.length)); if (can < 1) return; st.shareCarry[k] -= can; st.res[k] -= can * A.length; out[k] = (out[k] || 0) + can;
  });
  if (!Object.keys(out).length) return;
  const from = WW.nick || String((WW.user && WW.user.displayName) || 'An ally').split(' ')[0];
  A.forEach(f => { try { WW.roomRef('survive', f.code).child('gifts').push({ from: from, res: out, share: 1, at: NOW() }); } catch (e) {} });
  persist(); hud();
}
setInterval(() => { try { shareTick(); } catch (e) {} }, 60000);
setInterval(() => { if (!tour && WW && WW.mode === 'cloud' && WW.user) { allyList = null; loadAllyList(); } }, 5 * 60000);
async function loadAllyList() {
  if (allyLoading) return; allyLoading = true;
  try {
    const key = WW.emailKey(WW.user.email), fr = (await WW.db.ref('users/' + key + '/friends').once('value')).val() || {};
    allyList = await Promise.all(Object.keys(fr).map(async fk => {
      const fo = fr[fk] || {}, c = String(fo.friend_code || fk).toUpperCase(); let pub = null;
      try { pub = (await WW.roomRef('survive', c).child('pub').once('value')).val(); } catch (e) {}
      const open = pub ? (pub.ups || []).filter(u => u.end > NOW() && (u.c || 0) < MAX_HELPS).length : 0;
      let tbv = null; if (pub) try { tbv = (await WW.roomRef('survive', c).child('tboss').once('value')).val(); } catch (e) {}
      return { code: c, name: fo.username || (pub && pub.name) || c, pub: pub, open: open, tb: tbv && tbv.hp > 0 && tbv.end > NOW() ? tbv : null };
    }));
    allyList.sort((a, b) => (b.tb ? 1 : 0) - (a.tb ? 1 : 0) || b.open - a.open || (b.pub ? 1 : 0) - (a.pub ? 1 : 0)); shareAllies = allyList.filter(f => f.pub); try { syncNeighbours(); } catch (e) { showErr(e); }
  } catch (e) { allyList = []; }
  allyLoading = false; if (sheet.style.display === 'flex' && !visiting && card.innerHTML.indexOf('🤝 Allies') >= 0) alliesPanel();
  setTimeout(() => { allyList = null; }, 60000);   // refresh the list after a minute
}
// ------------------------------------------------------------ ally progress (desktop only): a see-through panel on the left that
// shows each ally's settlement from what they publish (Power Plant level, areas, supplies, upgrades with their timers, team boss).
// Click its title to fold it away; the choice is remembered on this device. Phones and tablets keep using 🤝 Allies.
const allyHudOK = () => !!(window.matchMedia && matchMedia('(min-width:1000px) and (hover:hover) and (pointer:fine)').matches);
let allyHudMin = false; try { allyHudMin = localStorage.getItem('survive_allyhud_min') === '1'; } catch (e) {}
function allyAgo(t) { const m = Math.max(0, Math.round((NOW() - (t || 0)) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; }
function renderAllyHud() {
  const el = $('allyHud'); if (!el) return;
  if (!allyHudOK() || !WW || WW.mode !== 'cloud' || !WW.user) { el.classList.remove('has'); return; }
  if (!allyList) { if (!allyLoading) loadAllyList(); }
  const list = (allyList || []).filter(f => f.pub && f.code !== code);
  el.classList.add('has'); el.classList.toggle('min', allyHudMin);
  let h = '<h4 data-ah="1">🤝 Ally progress <span>' + (allyList ? list.length + ' playing · ' : '') + (allyHudMin ? 'show ▸' : 'hide ▾') + '</span></h4>';
  if (!allyList) h += '<div class="al dim">Loading your allies…</div>';
  else if (!list.length) h += '<div class="al dim">No allies playing Tile Survival yet. Friends you add on the games hub show up here once they start.</div>';
  else list.forEach(f => {
    const p = f.pub, live = NOW() - (p.at || 0) < 10 * 60000, ups = (p.ups || []).filter(u => u.end > NOW()), r = p.res || {};
    h += '<div class="al"><span class="on' + (live ? '' : ' off') + '"></span><b>' + WW.esc(f.name) + '</b> <span class="dim">· ' + allyAgo(p.at) + '</span>'
      + '<div>⚡ Power Plant Lv' + (p.pp || 1) + ' · 🗺️ ' + (p.zones || 0) + ' area' + ((p.zones || 0) === 1 ? '' : 's') + '</div>'
      + '<div class="dim">' + RES.wood + fmtN(r.wood) + ' · ' + RES.food + fmtN(r.food) + ' · ' + RES.metal + fmtN(r.metal) + '</div>'
      + (f.tb ? '<div style="color:#86efac">👹 Team boss up: join from 🤝 Allies</div>' : '')
      + (ups.length ? ups.map(u => '<div class="up">' + (u.i || '⬆') + ' ' + WW.esc(u.n || u.id) + ' → Lv' + u.to + ' <span class="dim">' + fmt((u.end - NOW()) / 1000) + ' · ' + (u.c || 0) + '/' + MAX_HELPS + ' helps</span><div class="pb"><i style="width:' + Math.max(0, Math.min(100, 100 - (u.end - NOW()) / (u.total || 1) * 100)).toFixed(1) + '%"></i></div></div>').join('') : '<div class="dim">No upgrades running</div>')
      + '</div>';
  });
  if (el.innerHTML !== h) el.innerHTML = h;
}
function fmtN(v) { v = Math.floor(v || 0); return v >= 10000 ? (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'k' : String(v); }
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-ah]'); if (!t) return; allyHudMin = !allyHudMin; try { localStorage.setItem('survive_allyhud_min', allyHudMin ? '1' : '0'); } catch (x) {} renderAllyHud(); });
setInterval(() => { try { renderAllyHud(); } catch (e) {} }, 1000);
addEventListener('resize', () => { try { renderAllyHud(); } catch (e) {} });

// ------------------------------------------------------------ Power Plant level-up: tell every ally. A note pops up in their game
// (if they're playing) and a push notification goes to their phone/desktop (if they turned on 🔔 notifications on the site).
// Pushes are queued at accounts/push_queue and sent by .github/workflows/ally-push.yml. st.ppNote = last level announced.
function ppWatch() {
  if (tour || !st || !st.b || !code || !WW || WW.mode !== 'cloud' || !WW.user) return;
  const L = lvl('pp'); if (st.ppNote == null) { st.ppNote = L; persist(); return; }   // first run: no announcement for levels reached before this existed
  if (L <= st.ppNote) return;
  if (!shareAllies) { loadAllyList(); return; }                                      // wait for the ally list, then announce
  st.ppNote = L; persist();
  const name = myName(), A = shareAllies.filter(f => f.code !== code);
  if (!A.length) return;
  A.forEach(f => { try { WW.roomRef('survive', f.code).child('gifts').push({ from: name, code: code, note: 'pp', lvl: L, at: NOW() }); } catch (e) {} });
  try { WW.db.ref('accounts/push_queue').push({ from: name, fromCode: code, to: A.map(f => f.code), title: '⚡ ' + name + '’s Power Plant hit level ' + L, body: 'Your Tile Survival ally ' + name + ' just upgraded their Power Plant to level ' + L + '. Drop by and help with their next upgrade!', url: './Mobilegames/survive.html', tag: 'survive-pp-' + code, at: firebase.database.ServerValue.TIMESTAMP }).catch(e => console.warn('push queue', e && (e.code || e.message))); } catch (e) {}
  toast('⚡ Your allies were told your Power Plant reached level ' + L, 4000);
}
setInterval(() => { try { ppWatch(); } catch (e) {} }, 5000);

// ------------------------------------------------------------ raids: attack an ally's settlement. Their heroes and infected hunters
// defend it on their own (they don't need to be online). Beat every defender and you take 10% of their stockpile; they get
// a message and a revenge raid. One raid per ally every 8 hours (revenge skips the wait).
const RAID_CD = 8 * 3600 * 1000, RAID_TAKE = .1;
function raidReady(c) { const H = tour ? tour.home : st, last = (H.raids || {})[c] || 0, rev = (H.raidedBy || {})[c] && NOW() - H.raidedBy[c] < 86400000; return { ok: rev || NOW() - last > RAID_CD, rev: !!rev, wait: last + RAID_CD - NOW() }; }
function raidBtn(f) {
  if (!f.pub || !f.pub.w) return ''; const r = raidReady(f.code);
  return '<button class="b" style="background:#b91c1c;color:#fff;margin-left:6px" data-a="raid" data-code="' + f.code + '"' + (r.ok ? '' : ' disabled title="Ready in ' + fmt(r.wait / 1000) + '"') + '>' + (r.rev ? '⚔️ Revenge' : r.ok ? '⚔️ Raid' : '⚔️ ' + fmt(r.wait / 1000)) + '</button>';
}
function makeDefender(x, z, name, hp, dmg, shirt, hat, ranged) {
  const g = human({ skin: 0xf1c27d, shirt: shirt, pants: 0x111827, hat: hat, tool: ranged ? 'gun' : 'axe' }); g.position.set(x, 0, z); scene.add(g);
  const bar = hpBar(1, 0xef4444); bar.position.y = 2.35; g.add(bar); const nm = textSprite(3.4); nm.position.y = 2.8; nm.userData.set('🛡️ ' + name, '#fca5a5'); g.add(nm);
  const d = { mesh: g, bar: bar, x: x, z: z, hx: x, hz: z, hp: hp, max: hp, dmg: dmg, cd: 0, boss: false, zone: 'raid', def: true, dead: false, speed: 3, reach: ranged ? 4 : 1.3, wt: 0 };
  zombies.push(d); return d;
}
function spawnDefenders(w) {
  const hs = w.heroes || {}, hall = ((w.b || {}).hall || {}).lvl | 0; let k = 0; const spot = () => { const a = k++ * 2.1; return [Math.cos(a) * 5, Math.sin(a) * 5]; };
  Object.keys(hs).forEach(id => { const H = HEROES[id]; if (!H) return; const S = heroStat(id, hs[id].lvl || 1), p = spot(); makeDefender(p[0], p[1], H.n + ' L' + (hs[id].lvl || 1), S.hp, Math.max(3, Math.round(S.atk * .6)), H.shirt, H.hat, H.range > 2); });
  for (let n = 0; n < Math.min(4, hall); n++) { const p = spot(); makeDefender(p[0], p[1], 'Hunter', 60 + 25 * hall, 6 + 3 * hall, 0x7f1d1d, 0x1f2937, true); }
  if (!zombies.some(z => z.def && !z.dead)) { const p = spot(); makeDefender(p[0], p[1], 'Watchman', 60, 5, 0x334155, 0x1f2937, false); }   // nobody home: a watchman still stands guard
}
async function raid(c) {
  const r = raidReady(c); if (!r.ok) return alliesPanel('You can raid them again in ' + fmt(r.wait / 1000) + '.');
  try { const p = (await WW.roomRef('survive', c).child('pub').once('value')).val(); if (!p || !p.w) return alliesPanel('Their settlement isn’t visitable yet.');
    if (!startTour(c, p, true)) return; const res = p.res || {}, loot = {}; ['wood', 'food', 'metal'].forEach(k => { const n = Math.floor((res[k] || 0) * RAID_TAKE); if (n > 0) loot[k] = n; });
    tour.raid = { loot: loot, won: false, rev: r.rev }; spawnDefenders(p.w); closeSheet();
    toast('⚔️ Raid on ' + tour.name + '! Beat all ' + zombies.filter(z => z.def).length + ' defenders' + (Object.keys(loot).length ? ' to take ' + costTxt(loot) : ''), 5000);
  } catch (e) { alliesPanel('Could not reach that settlement (' + (e && e.code || e) + ').'); }
}
function raidCheck() {
  if (!tour || !tour.raid || tour.raid.won || tour.raid.lost) return;
  if (!zombies.some(z => z.def && !z.dead)) { tour.raid.won = true; sfx(784, .2, .08); sfx(1046, .35, .08, .15); toast('🏆 Victory! ' + (Object.keys(tour.raid.loot).length ? costTxt(tour.raid.loot) + ' is yours.' : '') + ' Tap the bar at the top to go home.', 6000); }
}
// ------------------------------------------------------------ team boss: start one on your own map and your allies get a call
// for help (they join from 🤝 Allies). Everyone hits the same boss: its health lives in game_rooms/survive/{map code}/tboss,
// and everyone who landed a hit gets the loot when it falls. 10 minutes to beat it.
const TB_TIME = 10 * 60000, myName = () => (WW && WW.nick) || String((WW && WW.user && WW.user.displayName) || 'Survivor').split(' ')[0];
let tb = null, tbRef = null, tbRoom = null, tbDmg = 0, tbBoss = null;
const tbHere = () => tb && tb.hp > 0 && !tb.won && tb.end > NOW() && tb.room === (tour ? tour.code : code);
async function tbStart() {
  if (tour) return alliesPanel('Go home first: you start a team boss on your own map.');
  if (!code || !WW || WW.mode !== 'cloud' || !uid) return alliesPanel('Sign in to start a team boss fight.');
  try {
    const ref = WW.roomRef('survive', code).child('tboss'), cur = (await ref.once('value')).val();
    if (cur && cur.end > NOW() && cur.hp > 0) { tbListen(code); closeSheet(); return toast('👹 Your team boss is already up!'); }
    const L = lvl('pp'), max = 2500 + 1500 * L;
    await ref.set({ id: String(NOW()), hp: max, max: max, lv: L, by: myName(), start: NOW(), end: NOW() + TB_TIME });
    (shareAllies || []).filter(f => f.code !== code).forEach(f => { try { WW.roomRef('survive', f.code).child('gifts').push({ from: myName(), code: code, note: 'tboss', at: NOW() }); } catch (e) {} });
    tbListen(code); closeSheet(); toast('👹 Team boss incoming! Your allies got a call for help. Beat it within 10 minutes.', 5000);
  } catch (e) { alliesPanel('Could not start the boss fight (' + (e && e.code || e) + ').'); }
}
function tbListen(c) {
  if (!WW || WW.mode !== 'cloud' || !c) return;
  if (tbRoom === c && tbRef) return;
  if (tbRef) try { tbRef.off(); } catch (e) {}
  tbClear(); tbRoom = c; tbRef = WW.roomRef('survive', c).child('tboss');
  tbRef.on('value', s => { const v = s.val();
    if (!v || (v.hp > 0 && v.end < NOW())) { if (!(tb && tb.won)) tbClear(); return; }
    const won = tb && tb.won && tb.id === v.id; tb = Object.assign({ room: c, mine: tb && tb.id === v.id ? tb.mine : 0 }, v, { won: won });
    if (tbBoss) tbBoss.hp = Math.max(1, Math.min(tbBoss.hp, v.hp));
    if (v.hp <= 0) tbWin(); });
}
function tbClear() { if (tbBoss) { tbBoss.dead = true; scene.remove(tbBoss.mesh); tbBoss = null; } tb = null; tbDmg = 0; }
function tbSpawn() {
  if (!tbHere() || (tbBoss && !tbBoss.dead && zombies.indexOf(tbBoss) >= 0)) return;
  if (tb.lair) {   // a called-in lair boss: take over the one standing in that lair (or bring it in)
    let z = zombies.find(o => !o.dead && o.boss && o.zone === tb.lair);
    if (!z) { z = makeZombie(tb.x || 0, tb.z || 0, 2, true, tb.lair); }
    z.tb = true; z.max = tb.max; z.hp = Math.max(1, tb.hp); z.dmg = tb.dmg || z.dmg; tbBoss = z; return;
  }
  const d = makeDefender(-6, 8, 'Horde King Lv' + (tb.lv || 1), tb.max, 14 + 3 * (tb.lv || 1), 0x3f6212, 0x7f1d1d, false);
  d.def = false; d.tb = true; d.hp = Math.max(1, tb.hp); d.speed = 2.4; d.reach = 2; d.zone = 'tboss'; d.mesh.scale.setScalar(1.9); tbBoss = d;
}
function tbHit(z, dmg) { tbDmg += dmg; if (tb) tb.mine = (tb.mine || 0) + dmg; z.hp = Math.max(1, z.hp - dmg); }
function tbTick() {
  if (!tb) return;
  if (tb.hp > 0 && tb.end < NOW() && !tb.won) { const here = tb.room === (tour ? tour.code : code); tbClear(); if (here) toast('👹 Time’s up: the boss got away. Try again with more allies!', 4000); return; }
  if (tbHere()) tbSpawn(); else if (tbBoss) { tbBoss.dead = true; scene.remove(tbBoss.mesh); tbBoss = null; }
  if (tbDmg > 0 && tbRef) { const d = Math.round(tbDmg); tbDmg = 0; const me = uid;
    tbRef.transaction(v => { if (!v || v.hp <= 0) return v; v.hp = Math.max(0, v.hp - d); v.dmg = v.dmg || {}; v.dmg[me] = (v.dmg[me] || 0) + d; return v; }).catch(() => {}); }
}
function tbWin() {
  if (!tb || tb.won) return; tb.won = true;
  if (tbBoss) { burst(tbBoss.x, tbBoss.z); tbBoss.dead = true; scene.remove(tbBoss.mesh); tbBoss = null; }
  const H = tour ? tour.home : st, key = tb.room + '_' + tb.id; H.tbClaim = H.tbClaim || {};
  const hit = (tb.dmg || {})[uid] || tb.mine; if (!hit || H.tbClaim[key]) { if (!hit) toast('👹 ' + (tb.by || 'Your ally') + '’s team beat the boss!', 3500); return; }
  Object.keys(H.tbClaim).forEach(k => { if (NOW() - (+k.split('_').pop() || 0) > 86400000) delete H.tbClaim[k]; }); H.tbClaim[key] = 1;
  const L = tb.lv || 1, loot = { gems: 3 + L, metal: 60 + 25 * L, food: 60 + 20 * L, wood: 80 + 25 * L };
  Object.keys(loot).forEach(k => { H.res[k] = (H.res[k] || 0) + loot[k]; }); if (tour) Object.keys(loot).forEach(k => { tour.S[k] = (tour.S[k] || 0) + loot[k]; st.res[k] = (st.res[k] || 0) + loot[k]; });   // shows now, and isn't split as "gathered"
  const who = Object.keys(tb.dmg || {}).length;
  sfx(784, .2, .08); sfx(1046, .35, .08, .15); toast('🏆 Team boss down' + (who > 1 ? ' (' + who + ' of you)' : '') + '! +' + costTxt(loot), 6000); persist(); hud();
  if (tb.lair && tb.room === code && !tour) { st.boss[tb.lair] = NOW() + BOSS_RESPAWN; st.bossWins = st.bossWins || {}; st.bossWins[tb.lair] = (st.bossWins[tb.lair] | 0) + 1; st.stats.bosses++; }
  if (tb.room === code && tbRef) { const r = tbRef; setTimeout(() => { try { r.remove(); } catch (e) {} }, 60000); }   // the host tidies up after everyone has seen it
}
async function tbJoin(c) { await visit(c); if (tour && tour.code === c) { tbListen(c); closeSheet(); toast('👹 Find the Horde King and hit it together!', 4000); } }

// ------------------------------------------------------------ arena: a live 1-on-1 duel with an ally who's playing right now.
// The challenge goes to game_rooms/survive/{their code}/duel; if they accept, you both walk into an empty arena
// (game_rooms/survive/ARENA_{id}: who's there, hits, hp, result). First to 0 HP loses 5% of their wood, food and metal
// (up to 150 each) to the winner, and the winner also gets 2 gems. 3 minutes, then it's a draw.
const DUEL_TAKE = .05, DUEL_TIME = 3 * 60000;
let duel = null, duelRef = null, duelAsk = null;
async function duelChallenge(c, name) {
  if (tour) return alliesPanel('Go home first.');
  if (!uid || !WW || WW.mode !== 'cloud') return alliesPanel('Sign in to duel.');
  if (duel) return alliesPanel('You already have a duel going.');
  const id = 'D' + NOW().toString(36) + Math.random().toString(36).slice(2, 5);
  try { await WW.roomRef('survive', c).child('duel').set({ id: id, from: myName(), fromCode: code, fromUid: uid, at: NOW() }); } catch (e) { return alliesPanel('Could not send the challenge (' + (e && e.code || e) + ').'); }
  duel = { id: id, waiting: true, to: c, at: NOW(), name: name || 'your ally' }; duelWatch(id);
  closeSheet(); toast('🥊 Challenge sent to ' + duel.name + '. Waiting for them to accept…', 6000);
}
function listenDuel() {
  if (!code || !WW || WW.mode !== 'cloud') return;
  WW.roomRef('survive', code).child('duel').on('value', s => { const v = s.val(); if (!v || NOW() - (v.at || 0) > 60000 || duel || (duelAsk && duelAsk.id === v.id)) return;
    duelAsk = v; sfx(660, .15, .07); sfx(880, .2, .07, .12);
    show('<h3>🥊 ' + WW.esc(v.from || 'An ally') + ' challenges you to a duel!</h3><div class="muted">A live 1-on-1 in the arena. First to 0 ❤️ loses 5% of their ' + RES.wood + RES.food + RES.metal + ' (up to 150 each) to the winner, and the winner gets 2 ' + RES.gems + '. Your heroes sit this one out.</div><div class="row"><button class="b" data-a="duelyes">⚔️ Accept</button><button class="b alt" data-a="duelno">Not now</button></div>'); });
}
function duelAnswer(yes) {
  const v = duelAsk; closeSheet(); if (!v) return; duelAsk = null; try { WW.roomRef('survive', code).child('duel').remove(); } catch (e) {}
  if (NOW() - (v.at || 0) > 70000) return toast('That challenge timed out.');
  const ref = WW.roomRef('survive', 'ARENA_' + v.id).child('state');
  if (!yes) { try { ref.set({ no: 1 }); } catch (e) {} return; }
  if (tour) goHome(true);
  duel = { id: v.id, opp: v.fromUid, name: v.from || 'your ally' }; duelWatch(v.id);
  ref.set({ a: v.fromUid, b: uid, an: v.from || '', bn: myName(), start: NOW() }).then(() => enterArena(1)).catch(e => { toast('Could not join the arena (' + (e && e.code || e) + ')'); duel = null; });
}
function duelWatch(id) {
  duelRef = WW.roomRef('survive', 'ARENA_' + id);
  duelRef.child('state').on('value', s => { const v = s.val(); if (!v || !duel || duel.id !== id) return;
    if (v.no && duel.waiting) { toast('🥊 ' + duel.name + ' said not now.', 4000); duelEnd(); return; }
    if (duel.waiting && v.b) { duel.waiting = false; duel.opp = v.b; duel.name = v.bn || duel.name; enterArena(0); }
    if (v.result && tour && tour.arena && !tour.arena.over && v.result.loser !== uid) {
      tour.arena.over = true; const loot = Object.assign({}, v.result.loot || {}); loot.gems = (loot.gems || 0) + 2;
      if (!v.result.left) { const H = tour.home; Object.keys(loot).forEach(k => { H.res[k] = (H.res[k] || 0) + loot[k]; }); }
      sfx(784, .2, .08); sfx(1046, .35, .08, .15);
      toast(v.result.left ? '🏳️ ' + duel.name + ' left the arena. Duel over.' : '🏆 You beat ' + duel.name + '! +' + costTxt(loot), 6000); setTimeout(duelEnd, 3500);
    } });
  duelRef.child('hp').on('value', s => { const v = s.val() || {}; if (tour && tour.arena && duel && duel.opp) tour.arena.oppHp = v[duel.opp] === undefined ? 100 : v[duel.opp]; });
  duelRef.child('hits').on('child_added', s => { const h = s.val(); if (!h || h.to !== uid || !tour || !tour.arena || tour.arena.over) return;
    st.hp = Math.max(0, st.hp - (+h.dmg || 0)); sfx(120, .1, .05); pMesh.userData.flash = .12;
    try { duelRef.child('hp/' + uid).set(Math.round(st.hp)); } catch (e) {}
    if (st.hp <= 0) duelLose(); });
}
function enterArena(second) {
  if (!duel) return; const id = duel.id;
  startTour('ARENA_' + id, { name: 'the arena', w: { b: { pp: { lvl: 0 } }, zones: { '2,2': 1 }, paid: {} } }, true);
  tour.arena = { id: id, opp: duel.opp, end: NOW() + DUEL_TIME, oppHp: 100, seen: NOW() }; tour.name = 'the arena';
  st.heroes = {}; Object.keys(heroes).forEach(k => { scene.remove(heroes[k].mesh); delete heroes[k]; });   // a fair fight: heroes sit out
  [trees, rocks, deer, finds].forEach(a => a.forEach(o => { o.down = true; o.at = Infinity; if (o.top) o.top.visible = false; o.mesh.visible = false; }));   // an empty, flat arena
  player.x = second ? 6 : -6; player.z = 0; st.hp = player.hpMax; syncPads();
  try { duelRef.child('hp/' + uid).set(st.hp); } catch (e) {}
  toast('🥊 Duel vs ' + duel.name + '! Walk up to them to fight. First to 0 ❤️ loses.', 5000);
}
function duelSwing() {
  if (!tour || !tour.arena || tour.arena.over || !duelRef) return false; const o = others[tour.arena.opp];
  if (!o || d2(player, o) > 2.3) return false;
  player.ry = Math.atan2(o.x - player.x, o.z - player.z); pMesh.userData.swing = 1; player.cd = .6; sfx(180, .08, .06); tracer(player, o, 0xfca5a5);
  try { duelRef.child('hits').push({ to: tour.arena.opp, dmg: Math.min(60, weaponDmg(st.weapon)), at: NOW() }); } catch (e) {}
  return true;
}
function duelLose(left) {
  if (!tour || !tour.arena || tour.arena.over) return; tour.arena.over = true;
  const H = tour.home, loss = {};
  if (!left) ['wood', 'food', 'metal'].forEach(k => { const n = Math.min(150, Math.floor((H.res[k] || 0) * DUEL_TAKE)); if (n > 0) { H.res[k] -= n; loss[k] = n; } });
  try { duelRef.child('state/result').set({ loser: uid, loot: loss, left: left ? 1 : 0, at: NOW() }); } catch (e) {}
  if (!left) { toast('💀 ' + duel.name + ' won the duel' + (Object.keys(loss).length ? '. You dropped ' + costTxt(loss) : '') + '.', 5000); setTimeout(duelEnd, 3500); }
  const r = duelRef; setTimeout(() => { try { r.remove(); } catch (e) {} }, 15000);
}
function duelTick() {
  if (!duel) return;
  if (duel.waiting) { if (NOW() - duel.at > 65000) { toast('🥊 ' + duel.name + ' didn’t answer. Try when they’re playing.', 4500); try { WW.roomRef('survive', duel.to).child('duel').remove(); } catch (e) {} duelEnd(); } return; }
  const A = tour && tour.arena; if (!A || A.over) return;
  if (others[A.opp]) A.seen = NOW(); else if (NOW() - A.seen > 25000) { A.over = true; toast('🏳️ ' + duel.name + ' left the arena. Duel over.', 4000); setTimeout(duelEnd, 2000); return; }
  if (NOW() > A.end) { A.over = true; toast('⏱️ Time! The duel is a draw.', 4000); setTimeout(duelEnd, 2500); }
}
function duelEnd() {
  if (duelRef) { try { duelRef.child('state').off(); duelRef.child('hits').off(); duelRef.child('hp').off(); } catch (e) {} }
  duel = null; duelRef = null; if (tour && tour.arena) goHome(true); st.hp = player.hpMax;
}
// ------------------------------------------------------------ neighbours: your allies' settlements stand just past your map's edge
// (east, west, south, north, then the corners), built from what they publish, with a road to each. Allies who are playing
// show up walking around their own town. Tap a neighbour's town to visit it.
const NB_SPOTS = [[100, 0], [-100, 0], [0, 100], [0, -100], [100, 100], [-100, 100], [100, -100], [-100, -100]];
const nbrs = {};   // code -> { g, sign, pick: [meshes], ref, cb, ppl: { uid: { mesh, x, z, tx, tz, t } }, x, z, name }
function syncNeighbours() {
  const want = tour ? [] : (shareAllies || []).filter(f => f.code !== code && f.pub && f.pub.w).slice(0, NB_SPOTS.length);
  Object.keys(nbrs).forEach(c => { if (!want.some(f => f.code === c)) dropNeighbour(c); });
  want.forEach((f, i) => {
    const sig = JSON.stringify((f.pub.w || {}).b || {}) + JSON.stringify((f.pub.w || {}).lay || {}) + i, N = nbrs[f.code];
    if (N && N.sig === sig) { N.sign.userData.set('🤝 ' + f.name + ' · Power Plant Lv' + (f.pub.pp || 1) + ' · tap to visit', '#a5f3fc'); return; }
    if (N) dropNeighbour(f.code);
    const [ox, oz] = NB_SPOTS[i], g = new THREE.Group(); g.position.set(ox, 0, oz); const pick = [];
    const pad = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshLambertMaterial({ color: 0x8fbf63 })); pad.rotation.x = -Math.PI / 2; pad.position.y = .03; g.add(pad); pick.push(pad);
    const ringP = new THREE.Mesh(new THREE.RingGeometry(3.4, 5.2, 40), new THREE.MeshLambertMaterial({ color: 0xcbb68a })); ringP.rotation.x = -Math.PI / 2; ringP.position.y = .05; g.add(ringP);
    const b = (f.pub.w || {}).b || {}, lay = (f.pub.w || {}).lay || {};
    Object.keys(BD).forEach(id => { const l = ((b[id] || {}).lvl) | 0; if (l < 1) return; const m = bldMesh(id, l), at = lay[id] && isFinite(lay[id].x) ? lay[id] : BD0[id]; m.position.set(+at.x, 0, +at.z); g.add(m); pick.push(m); });
    const sign = textSprite(16); sign.material.fog = false; sign.position.set(0, 10, 0); g.add(sign); sign.userData.set('🤝 ' + f.name + ' · Power Plant Lv' + (f.pub.pp || 1) + ' · tap to visit', '#a5f3fc');
    scene.add(g);
    // a dirt road from your map's edge to their town
    const len = Math.hypot(ox, oz) - HALF - 14, ang = Math.atan2(ox, oz), road = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len), new THREE.MeshLambertMaterial({ color: 0xb59a6a }));
    road.rotation.x = -Math.PI / 2; road.rotation.z = ang; const mid = HALF + len / 2, ux = ox / Math.hypot(ox, oz), uz = oz / Math.hypot(ox, oz);
    road.position.set(ux * mid * (Math.abs(ox) && Math.abs(oz) ? 1.414 : 1), .04, uz * mid * (Math.abs(ox) && Math.abs(oz) ? 1.414 : 1)); scene.add(road);
    const n = nbrs[f.code] = { g: g, road: road, sign: sign, pick: pick, x: ox, z: oz, name: f.name, sig: sig, ppl: {} };
    if (WW && WW.mode === 'cloud' && uid) { n.ref = WW.roomRef('survive', f.code).child('players');   // who's walking around in their town right now
      n.cb = s => { const v = s.val() || {}, t0 = SNOW(); Object.keys(v).forEach(u => { if (u === uid) return; const p = v[u]; let o = n.ppl[u];
          if (!p || t0 - (p.t || 0) > 15000) { if (o) { scene.remove(o.mesh); delete n.ppl[u]; } return; }
          if (!o) { const m = human({ skin: 0xf1c27d, shirt: 0x7c3aed, pants: 0x1e293b, hat: 0x22d3ee, tool: 'axe' }); const nm = textSprite(4); nm.position.y = 2.6; nm.userData.set('🤝 ' + (p.n || f.name), '#a5f3fc'); m.add(nm); m.scale.setScalar(1.3); scene.add(m); o = n.ppl[u] = { mesh: m, x: ox + p.x, z: oz + p.z }; }
          o.tx = ox + p.x; o.tz = oz + p.z; o.t = p.t; });
        Object.keys(n.ppl).forEach(u => { if (!v[u]) { scene.remove(n.ppl[u].mesh); delete n.ppl[u]; } }); };
      n.ref.on('value', n.cb); }
  });
}
function dropNeighbour(c) { const n = nbrs[c]; if (!n) return; scene.remove(n.g); scene.remove(n.road); if (n.ref) try { n.ref.off('value', n.cb); } catch (e) {} Object.keys(n.ppl).forEach(u => scene.remove(n.ppl[u].mesh)); delete nbrs[c]; }
function updateNeighbours(dt) {
  Object.keys(nbrs).forEach(c => { const n = nbrs[c]; n.g.visible = n.road.visible = !tour;
    Object.keys(n.ppl).forEach(u => { const o = n.ppl[u]; if (SNOW() - (o.t || 0) > 15000) { scene.remove(o.mesh); delete n.ppl[u]; return; }
      const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz), stp = Math.min(d, 7 * dt); if (d > .01) { o.x += dx / d * stp; o.z += dz / d * stp; } if (d > 12) { o.x = o.tx; o.z = o.tz; }
      o.mesh.visible = !tour; o.mesh.position.set(o.x, 0, o.z); if (d > .05) o.mesh.rotation.y = Math.atan2(dx, dz); animHuman(o.mesh, d > .05 ? 5 : 0, dt); }); });
}
function neighbourAt(rc) { if (tour) return null; const ks = Object.keys(nbrs); for (const c of ks) { if (rc.intersectObjects(nbrs[c].pick, true).length) return c; } return null; }

// ------------------------------------------------------------ lair bosses get tougher: each time you beat one it comes back 25% stronger
// with more punch (and better loot). When it's too much, 📣 call your allies: it becomes a team boss fight they can join.
function lairBoss() { let best = null, bd = 1e9; zombies.forEach(z => { if (z.dead || !z.boss || z.tb) return; const d = d2(player, z); if (d < bd) { bd = d; best = z; } }); return best; }
async function callAllies() {
  if (tour) return alliesPanel('Go home first.');
  if (!code || !WW || WW.mode !== 'cloud' || !uid) return alliesPanel('Sign in to call your allies.');
  if (tb && tb.room === code && tb.hp > 0 && tb.end > NOW()) return alliesPanel('A boss fight is already going on your map.');
  const z = lairBoss(); if (!z) return alliesPanel('No lair boss is up on your map right now. Unlock a 👹 Boss lair (the corners) first, or start a team boss.');
  try {
    const ref = WW.roomRef('survive', code).child('tboss'), L = z.blv || 1;
    await ref.set({ id: String(NOW()), hp: Math.ceil(z.hp), max: Math.ceil(z.max), lv: L, by: myName(), start: NOW(), end: NOW() + TB_TIME, lair: z.zone, x: z.hx, z: z.hz, dmg: z.dmg, name: 'Boss Lv' + L });
    (shareAllies || []).filter(f => f.code !== code).forEach(f => { try { WW.roomRef('survive', f.code).child('gifts').push({ from: myName(), code: code, note: 'tboss', lair: L, at: NOW() }); } catch (e) {} });
    z.tb = true; tbBoss = z; tbListen(code); closeSheet(); toast('📣 Called your allies to the Lv' + L + ' boss! Hold it off: 10 minutes to beat it together.', 5000);
  } catch (e) { alliesPanel('Could not call your allies (' + (e && e.code || e) + ').'); }
}
let lairHint = 0;
function lairTick() {
  if (tour || NOW() - lairHint < 120000) return; const z = lairBoss();
  if (z && (z.blv || 1) >= 2 && d2(player, z) < 12) { lairHint = NOW(); toast('👹 Boss Lv' + z.blv + ' is tough! Tap 🤝 Allies → 📣 Call allies to fight it together.', 6000); }
}
async function visit(c) {
  if (!c) return;
  try { const ref = WW.roomRef('survive', c), p = (await ref.child('pub').once('value')).val(); if (!p) return alliesPanel('No settlement found for that code.');
    try { const gs = (await ref.child('gifts').once('value')).val() || {}; p.w = p.w || {}; const P = p.w.paid = p.w.paid || {};   // help they haven't opened the game to collect yet still shows on their pads
      Object.keys(gs).forEach(g => { const pd = (gs[g] || {}).paid || {}; Object.keys(pd).forEach(key => Object.keys(pd[key] || {}).forEach(r => { (P[key] = P[key] || {})[r] = (P[key][r] || 0) + (+pd[key][r] || 0); })); }); } catch (e) {}
    const mine = {}; for (const u of (p.ups || [])) mine[u.k] = !!(await ref.child('helps/' + u.k + '/' + uid).once('value')).val();
    visiting = { code: c, pub: p, mine: mine }; const walked = startTour(c, p); alliesPanel(walked ? null : 'Their settlement shows up here once they play Tile Survival again with this update. You can still help their timers.'); } catch (e) { alliesPanel('Could not reach that settlement (' + (e && e.code || e) + ').'); }
}
async function helpFriend(k) {
  if (!visiting) return; const day = new Date().toDateString(); if (st.helpDay !== day) { st.helpDay = day; st.helpsToday = 0; }
  try { await WW.roomRef('survive', visiting.code).child('helps/' + k + '/' + uid).set(NOW()); visiting.mine[k] = true; const u = (visiting.pub.ups || []).find(x => x.k === k); if (u) u.c = (u.c || 0) + 1;
    if (st.helpsToday < 10) { st.helpsToday++; st.res.wood += 15; toast('🤝 Helped! +15 ' + RES.wood); } else toast('🤝 Helped!'); persist(); alliesPanel(); } catch (e) { alliesPanel('Help failed: ' + (e && e.code || e)); }
}
function listenHelps() {
  if (!code || !WW || WW.mode !== 'cloud') return;
  WW.roomRef('survive', code).child('helps').on('value', s => { lastHelps = s.val() || {}; applyHelps(); });
}
let lastHelps = null, giftQ = [];
// allies' halves arrive in game_rooms/survive/{my code}/gifts: resources go to the stockpile, pad payments to the matching pad
function listenGifts() {
  if (!code || !WW || WW.mode !== 'cloud') return;
  WW.roomRef('survive', code).child('gifts').on('child_added', snap => { const g = snap.val(); try { snap.ref.remove(); } catch (e) {} if (g) { giftQ.push(g); applyGifts(); } });
}
function applyGifts() {
  if (tour || !giftQ.length) return; const pads = wantedPads();
  giftQ.splice(0).forEach(g => {
    if (g.note === 'pp') { toast('⚡ ' + (g.from || 'An ally') + '’s Power Plant reached level ' + (g.lvl || '?') + '!', 6000); sfx(660, .18, .07); allyList = null; return; }
    if (g.note === 'tboss') { if (NOW() - (g.at || 0) < TB_TIME) { toast(g.lair ? '📣 ' + (g.from || 'An ally') + ' needs help with a Lv' + g.lair + ' lair boss! Open 🤝 Allies and tap Join boss.' : '👹 ' + (g.from || 'An ally') + ' started a team boss fight! Open 🤝 Allies and tap Join boss.', 8000); sfx(440, .2, .07); allyList = null; } return; }
    if (g.raid) { const lost = {}; Object.keys(g.res || {}).forEach(k => { const n = Math.min(st.res[k] || 0, -(+g.res[k] || 0)); if (n > 0) { st.res[k] -= n; lost[k] = n; } });
      if (g.code) { st.raidedBy = st.raidedBy || {}; st.raidedBy[g.code] = NOW(); }
      if (welcome && !welcome.shown) welcome.news.push({ raid: 1, who: g.from || 'An ally', what: 'raided you', took: costTxt(lost), at: g.at || NOW() });
      toast('⚔️ ' + (g.from || 'An ally') + ' raided your settlement' + (Object.keys(lost).length ? ' and took ' + costTxt(lost) : '') + '! Get revenge in 🤝 Allies.', 6000); return; }
    const got = {}; Object.keys(g.res || {}).forEach(k => { const n = +g.res[k] || 0; if (n > 0) { st.res[k] = (st.res[k] || 0) + n; got[k] = (got[k] || 0) + n; } });
    Object.keys(g.paid || {}).forEach(key => Object.keys(g.paid[key] || {}).forEach(k => { const n = +g.paid[key][k] || 0; if (n <= 0) return;
      if (pads[key]) (st.paid[key] = st.paid[key] || {})[k] = (st.paid[key][k] || 0) + n; else st.res[k] = (st.res[k] || 0) + n; got[k] = (got[k] || 0) + n; }));
    if (Object.keys(got).length && welcome && !welcome.shown) welcome.news.push({ who: g.from || 'An ally', what: g.share ? 'shared some of their progress' : 'worked on your settlement', got: costTxt(got), at: g.at || NOW() });
    if (Object.keys(got).length) toast('🤝 ' + (g.from || 'An ally') + (g.share ? ' shared some of their progress' : ' worked on your settlement') + ': +' + costTxt(got), 4500);
  });
  syncPads(); persist(); publishPub();
}
function applyHelps() {
  { if (tour || !lastHelps) return; const v = lastHelps; let n = 0;
    Object.keys(BD).forEach(id => { const u = st.b[id].up; if (!u) return; const who = v[id + '_' + u.to]; if (!who) return; u.h = u.h || {};
      Object.keys(who).forEach(w => { if (!u.h[w] && Object.keys(u.h).length < MAX_HELPS) { u.h[w] = 1; u.end = Math.max(NOW() + 1000, u.end - u.total * HELP_CUT); n++; } }); });
    if (n && welcome && !welcome.shown) welcome.helps += n;
    if (n) { toast('🤝 Allies helped your buildings ' + n + ' time' + (n > 1 ? 's' : '') + '!'); persist(); publishPub(); } }
}

// ------------------------------------------------------------ save / load
let cloudT = 0;
function persist() { const h = tour ? tour.home : st; h.last = NOW(); h.saved = NOW(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(h)); } catch (e) {} }   // while visiting a friend, your own settlement is what gets saved
// how far a save has got (buildings, areas, heroes, missions): used to pick the right save between devices, so a brand-new
// device can never win over real progress just because it saved a few seconds later
function progressOf(x) {
  if (!x || !x.b) return 0; let p = 0;
  Object.keys(x.b).forEach(k => { p += ((x.b[k] || {}).lvl | 0) * 1000; });
  p += Object.keys(x.zones || {}).length * 800 + (x.q | 0) * 300;
  Object.keys(x.heroes || {}).forEach(k => { p += ((x.heroes[k] || {}).lvl | 0) * 200; });
  p += Math.min(5000, ((x.stats || {}).collected | 0) / 10);
  return p;
}
let cloudChecked = false;   // never write to the cloud before we've looked at what's already there
function cloudSave() { if (!cloudChecked) return; if (WW && WW.user && WW.writeSave) try { WW.writeSave(CLOUD_KEY, JSON.parse(JSON.stringify(tour ? tour.home : st))); } catch (e) {} }
function publishProgress() { if (tour || !WW || !WW.publishProgress) return; const bl = Object.keys(BD).reduce((a, id) => a + (st.b[id].lvl | 0), 0); WW.publishProgress('survive', { title: 'Tile Survival', pp: lvl('pp'), zones: st.stats.zones, buildings: bl, heroes: Object.keys(st.heroes).map(id => HEROES[id] ? HEROES[id].n + ' L' + st.heroes[id].lvl : '').filter(Boolean).join(', '), kills: st.stats.kills | 0, mission: st.q + 1, raids: Object.keys(st.raids || {}).length }); }
function publishPlaying() { if (tour) return; publishProgress(); if (WW && WW.publishPlaying) try { WW.publishPlaying({ game: 'survive', title: 'Tile Survival', status: 'Power Plant Lv' + lvl('pp') + ' · ' + st.stats.zones + ' areas · mission ' + (st.q + 1), open: 0 }); } catch (e) {} }
function hud() {
  Object.keys(RES).forEach(k => { const el = $('r_' + k), prod = producers().filter(id => BD[id].out === k); el.innerHTML = RH(RES[k]) + ' ' + Math.floor(st.res[k]); });
  $('ppl').textContent = lvl('pp'); $('surv').textContent = survivors(); $('hp').style.width = Math.max(0, st.hp / player.hpMax * 100) + '%';
}
// ------------------------------------------------------------ workers: each producing building sends out its own crew (1 per level, up to 4)
// Lumberyard -> lumberjacks chop trees · Smelter -> miners break rocks · Farm -> hunters catch deer. They carry the haul
// back to the building's pile, which you collect as usual.
const ROLES = {
  lumber:  { name: '🌳 Lumberjack', shirt: 0xb45309, hat: 0xfacc15, tool: 'axe', list: () => trees, work: 2.4, load: 3, res: 'wood' },
  smelter: { name: '⛏️ Miner',      shirt: 0x475569, hat: 0xf97316, tool: 'axe', list: () => rocks, work: 3.2, load: 2, res: 'metal' },
  farm:    { name: '🏹 Hunter',     shirt: 0x166534, hat: 0x78350f, tool: 'gun', list: () => deer,  work: 1.6, load: 5, res: 'food' }
};
const workers = [];
function syncWorkers() {
  if (tour && tour.raid) { workers.splice(0).forEach(w => scene.remove(w.mesh)); return; }   // raiding: only their defenders are out
  // visiting an ally: you see THEIR crews (built from their building levels) at work; their haul is credited by their own game
  Object.keys(ROLES).forEach(id => {
    const R = ROLES[id], B = BD[id], mine = workers.filter(w => w.role === id), want = crewSize(lvl(id));
    for (let k = mine.length; k > want; k--) { const w = mine[k - 1]; scene.remove(w.mesh); workers.splice(workers.indexOf(w), 1); }
    for (let k = mine.length; k < want; k++) {
      const m = human({ skin: [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69][k % 4], shirt: R.shirt, pants: 0x1f2937, hat: R.hat, tool: R.tool, s: .9 });
      const nm = textSprite(3); nm.position.y = 2.6; nm.userData.set(R.name); m.add(nm);
      const w = { role: id, mesh: m, x: B.x + (k - 1.5), z: B.z + B.r + 1, state: 'seek', tgt: null, t: 0 }; m.position.set(w.x, 0, w.z); scene.add(m); workers.push(w);
    }
  });
}
function knockDown(o, now) {   // same as when you do it yourself
  o.down = true;
  if (o.kind === 'tree') { o.at = now + 45000; o.top.visible = false; if (o.trunk) o.trunk.scale.y = .3; }
  else if (o.kind === 'rock') { o.at = now + 90000; o.mesh.visible = false; }
  else { o.at = now + 90000; o.mesh.visible = false; if (o.bar) o.bar.visible = false; }
}
function updateWorkers(dt, now) {
  workers.forEach(w => {
    const R = ROLES[w.role], B = BD[w.role]; let sp = 0;
    const walk = (tx, tz, near) => { const d = Math.hypot(tx - w.x, tz - w.z); if (d < (near || .9)) return true; sp = w.role === 'farm' ? 3.8 : 3.2; const nx = w.x + (tx - w.x) / d * sp * dt, nz = w.z + (tz - w.z) / d * sp * dt; moveTo(w, nx, nz, .35); w.mesh.rotation.y = Math.atan2(tx - w.x, tz - w.z); return false; };
    if (w.state === 'seek') {
      let best = null, bd = 1e9; R.list().forEach(o => { if (o.down || workers.some(q => q !== w && q.tgt === o) || guards.some(q => q.job && q.job.o === o)) return; const d = Math.hypot(o.x - B.x, o.z - B.z); if (d < bd) { bd = d; best = o; } });
      if (best) { w.tgt = best; w.state = 'walk'; }   // nothing left standing: wait for things to grow back / come back
    } else if (w.state === 'walk') {
      if (!w.tgt || w.tgt.down) { w.state = 'seek'; w.tgt = null; }
      else if (walk(w.tgt.x, w.tgt.z, w.role === 'farm' ? 1.6 : (w.tgt.r || .5) + .5)) { w.state = 'work'; w.t = R.work; }
    } else if (w.state === 'work') {
      const o = w.tgt; if (!o || o.down) { w.state = 'seek'; w.tgt = null; return; }
      if (w.role === 'farm' && Math.hypot(o.x - w.x, o.z - w.z) > 2.2) { w.state = 'walk'; return; }   // the deer ran: chase it
      w.mesh.rotation.y = Math.atan2(o.x - w.x, o.z - w.z); w.t -= dt; if (Math.floor(w.t * 2.5) !== Math.floor((w.t + dt) * 2.5)) { w.mesh.userData.swing = 1; o.shake = .25; }
      if (w.t <= 0) { knockDown(o, now); w.tgt = null; w.state = 'carry'; w.load = R.load; }
    } else if (w.state === 'carry') {
      if (walk(B.x + (B.r + 1) * .7, B.z + (B.r + 1) * .7)) { if (!tour) addToPile(w.role, w.load); fly(RES[R.res], w, { x: B.x, z: B.z }); w.load = 0; w.state = 'seek'; }
    }
    w.mesh.position.set(w.x, 0, w.z); animHuman(w.mesh, sp, dt);
    const carrying = w.state === 'carry';
    if (w.mesh.userData.logs !== carrying) { w.mesh.userData.logs = carrying; if (carrying) { const col = R.res === 'wood' ? 0xa0703f : R.res === 'metal' ? 0x9ca3af : 0xb45309, lg = R.res === 'wood' ? cyl(w.mesh, .12, .12, .8, col, 0, 1.3, -.3, 6) : box(w.mesh, .45, .35, .35, col, 0, 1.3, -.3); if (R.res === 'wood') lg.rotation.z = Math.PI / 2; w.mesh.userData.logMesh = lg; } else if (w.mesh.userData.logMesh) { w.mesh.remove(w.mesh.userData.logMesh); w.mesh.userData.logMesh = null; } }
  });
}
// ------------------------------------------------------------ who else is here: everyone standing in the same settlement sees each other walk around
// game_rooms/survive/{settlement code}/players/{uid} = { n, x, z, ry, t } while you're in that settlement (removed when you leave)
let hereRoom = null, hereRef = null, hereCb = null, lastSent = { x: 0, z: 0, t: 0 };
const others = {}, SNOW = () => (WW && WW.now ? WW.now() : Date.now());   // server-synced clock, so friends' devices agree
function setRoom(c) {
  if (!WW || WW.mode !== 'cloud' || !uid || c === hereRoom) return;
  if (hereRef) { try { hereRef.off('value', hereCb); hereRef.child(uid).remove(); } catch (e) {} }
  Object.keys(others).forEach(u => { scene.remove(others[u].mesh); delete others[u]; });
  hereRoom = c; if (!c) { hereRef = null; return; }
  hereRef = WW.roomRef('survive', c).child('players');
  try { hereRef.child(uid).onDisconnect().remove(); } catch (e) {}
  hereCb = snap => { const v = snap.val() || {}, now = SNOW();
    Object.keys(v).forEach(u => { if (u === uid) return; const p = v[u]; if (!p || now - (p.t || 0) > 15000) { if (others[u]) { scene.remove(others[u].mesh); delete others[u]; } return; }
      let o = others[u]; if (!o) { const m = human({ skin: 0xf1c27d, shirt: 0x7c3aed, pants: 0x1e293b, hat: 0x22d3ee, tool: 'axe' }); const nm = textSprite(4); nm.position.y = 2.6; nm.userData.set('🤝 ' + (p.n || 'Ally'), '#a5f3fc'); m.add(nm); m.position.set(p.x, 0, p.z); scene.add(m); o = others[u] = { mesh: m, x: p.x, z: p.z }; }
      o.tx = p.x; o.tz = p.z; o.ry = p.ry || 0; o.t = p.t; });
    Object.keys(others).forEach(u => { if (!v[u]) { scene.remove(others[u].mesh); delete others[u]; } }); };
  hereRef.on('value', hereCb);
  lastSent.t = 0;
}
function updateOthers(dt, now) {
  if (hereRef && uid && (now - lastSent.t > 3000 || (now - lastSent.t > 250 && Math.hypot(player.x - lastSent.x, player.z - lastSent.z) > .3))) {
    lastSent = { x: player.x, z: player.z, t: now };
    try { hereRef.child(uid).set({ n: WW.nick || String((WW.user && WW.user.displayName) || 'Survivor').split(' ')[0], x: +player.x.toFixed(2), z: +player.z.toFixed(2), ry: +player.ry.toFixed(2), t: SNOW() }); } catch (e) {}
  }
  Object.keys(others).forEach(u => { const o = others[u]; if (SNOW() - (o.t || 0) > 15000) { scene.remove(o.mesh); delete others[u]; return; }
    const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz), step = Math.min(d, 7 * dt); if (d > .01) { o.x += dx / d * step; o.z += dz / d * step; } if (d > 12) { o.x = o.tx; o.z = o.tz; }
    o.mesh.position.set(o.x, 0, o.z); if (d > .05) o.mesh.rotation.y = Math.atan2(dx, dz); animHuman(o.mesh, d > .05 ? 5 : 0, dt); });
}
// ------------------------------------------------------------ infected hunters: the Hero Hall sends out a squad (1 per level, up to 4) that
// hunts down the infected anywhere you've unlocked, then heads back to the hall to heal. Loot from their kills is yours.
const guards = [];
function syncGuards() {
  if (tour && tour.raid) { guards.splice(0).forEach(g => scene.remove(g.mesh)); return; }
  const want = lvl('hall') >= 1 ? Math.min(4, lvl('hall')) : 0, B = BD.hall;
  while (guards.length > want) scene.remove(guards.pop().mesh);
  while (guards.length < want) {
    const k = guards.length, m = human({ skin: [0xe0ac69, 0x8d5524, 0xf1c27d, 0xc68642][k % 4], shirt: 0x7f1d1d, pants: 0x111827, hat: 0x1f2937, tool: 'gun', s: .95 });
    const bar = hpBar(1, 0xef4444); bar.position.y = 2.3; m.add(bar); const nm = textSprite(3); nm.position.y = 2.75; nm.userData.set('🎯 Infected hunter'); m.add(nm);
    const g = { id: 'guard' + k, name: 'Infected hunter', mesh: m, bar: bar, x: B.x + k - 1.5, z: B.z + B.r + 1.2, hp: 1, max: 1, cd: 0, down: 0, state: 'seek', tgt: null };
    m.position.set(g.x, 0, g.z); scene.add(m); guards.push(g);
  }
  const L = Math.max(1, lvl('hall')); guards.forEach(g => { const mx = 60 + 25 * L; if (g.max !== mx) { g.hp = Math.min(mx, g.hp === 1 ? mx : g.hp); g.max = mx; } });
}
// an infected hunter with nothing to fight helps out: chops a tree, breaks a rock or hunts a deer (whichever is closest
// and has a building to take it to), carries the haul there, then checks for infected again
const JOB_OF = { tree: 'lumber', rock: 'smelter', deer: 'farm' };
function guardHelp(g, dt, now, walk) {
  const J = g.job;
  if (!J) {
    let best = null, bd = 1e9; [trees, rocks, deer].forEach(list => list.forEach(o => { const bid = JOB_OF[o.kind]; if (o.down || lvl(bid) < 1 || workers.some(w => w.tgt === o) || guards.some(q => q !== g && q.job && q.job.o === o)) return; const d = Math.hypot(o.x - g.x, o.z - g.z); if (d < bd) { bd = d; best = o; } }));
    if (best) g.job = { o: best, st: 'walk' }; else walk(BD.hall.x + (guards.indexOf(g) - 1.5) * 1.2, BD.hall.z + BD.hall.r + 1.2, .8);
    return;
  }
  const o = J.o, bid = JOB_OF[o.kind], R = ROLES[bid], Bd = BD[bid];
  if (J.st === 'walk') { if (o.down) { g.job = null; return; } if (walk(o.x, o.z, o.kind === 'deer' ? 1.6 : (o.r || .5) + .5)) { J.st = 'work'; J.t = R.work; } }
  else if (J.st === 'work') { if (o.down) { g.job = null; return; } if (o.kind === 'deer' && Math.hypot(o.x - g.x, o.z - g.z) > 2.2) { J.st = 'walk'; return; }
    g.mesh.rotation.y = Math.atan2(o.x - g.x, o.z - g.z); J.t -= dt; if (Math.floor(J.t * 2.5) !== Math.floor((J.t + dt) * 2.5)) { g.mesh.userData.swing = 1; o.shake = .25; }
    if (J.t <= 0) { knockDown(o, now); J.st = 'carry'; } }
  else if (J.st === 'carry') { if (walk(Bd.x + (Bd.r + 1) * .7, Bd.z + (Bd.r + 1) * .7, .9)) { if (!tour) addToPile(bid, R.load); fly(RES[R.res], g, { x: Bd.x, z: Bd.z }); g.job = null; } }
}
function updateGuards(dt, now) {
  const B = BD.hall, dmg = 6 + 3 * Math.max(1, lvl('hall'));
  guards.forEach(g => {
    let sp = 0;
    if (g.down) { if (now > g.down) { g.down = 0; g.hp = g.max; g.x = B.x; g.z = B.z + B.r + 1.2; g.mesh.visible = true; } return; }
    const walk = (tx, tz, near) => { const d = Math.hypot(tx - g.x, tz - g.z); if (d < near) return true; sp = 4; moveTo(g, g.x + (tx - g.x) / d * sp * dt, g.z + (tz - g.z) / d * sp * dt, .4); g.mesh.rotation.y = Math.atan2(tx - g.x, tz - g.z); return false; };
    g.cd -= dt;
    if (g.hp < g.max * .35) g.state = 'heal';
    if (g.state === 'heal') { if (walk(B.x, B.z + B.r + 1.2, 1)) { g.hp = Math.min(g.max, g.hp + 15 * dt); if (g.hp >= g.max) g.state = 'seek'; } }
    else {
      if (!g.tgt || g.tgt.dead) { let best = null, bd = 1e9; zombies.forEach(z => { if (z.dead || z.boss) return; const d = Math.hypot(z.x - g.x, z.z - g.z); if (d < bd) { bd = d; best = z; } }); g.tgt = best; }
      const z = g.tgt;
      if (z) { g.job = null; if (walk(z.x, z.z, 4.5) && g.cd <= 0) { g.mesh.rotation.y = Math.atan2(z.x - g.x, z.z - g.z); hitZombie(z, dmg, g.id); tracer(g, z, 0xfca5a5); g.cd = .9; g.mesh.userData.swing = 1; } }
      else guardHelp(g, dt, now, walk);   // no infected around: they help the crews (trees, rocks, deer)
    }
    g.mesh.position.set(g.x, 0, g.z); animHuman(g.mesh, sp, dt); setBar(g.bar, g.hp / g.max); faceCam(g.bar);
  });
}
function loadWorld() {
  if (moving) moveEnd(); applyLayout(st.lay); if (ppPath) ppPath.position.set(BD.pp.x, ppPath.position.y, BD.pp.z);
  guards.forEach(g => scene.remove(g.mesh)); guards.length = 0;
  workers.forEach(w => scene.remove(w.mesh)); workers.length = 0;
  // clear old entities, then rebuild everything from the save
  [trees, rocks, deer, zombies, finds].forEach(a => { a.forEach(o => scene.remove(o.mesh)); a.length = 0; });
  Object.keys(zoneObjs).forEach(k => { zoneObjs[k].forEach(o => scene.remove(o)); delete zoneObjs[k]; });
  Object.keys(fogs).forEach(k => { scene.remove(fogs[k]); delete fogs[k]; });
  Object.keys(bldMeshes).forEach(k => { scene.remove(bldMeshes[k]); delete bldMeshes[k]; }); Object.keys(bldLabels).forEach(k => { scene.remove(bldLabels[k]); delete bldLabels[k]; });
  Object.keys(pads).forEach(k => { scene.remove(pads[k].mesh); delete pads[k]; });
  Object.keys(heroes).forEach(k => { scene.remove(heroes[k].mesh); delete heroes[k]; });
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const k = i + ',' + j; if (st.zones[k]) spawnZoneContents(i, j); else makeFog(i, j); }
  syncBuildings(); syncPads(); syncHeroes(); syncWorkers(); syncGuards(); hud(); checkQuest();
}
function boot() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
  st = fix(s && s.v === 3 ? s : fresh());
  const off = (NOW() - (st.last || NOW())) / 1000; if (off > 10) awayCatchUp(off);
  player.hpMax = 100; if (st.hp <= 0) st.hp = 100;
  loadWorld(); persist();
  if (!localStorage.getItem('ts3_intro')) { localStorage.setItem('ts3_intro', '1'); show('<h3>🎖️ Sarge: “Glad you made it, survivor.”</h3><div class="muted" style="font-size:.95rem;line-height:1.5">The power plant is all we have left. <b>Drag anywhere</b> to walk (or WASD / a controller). Walk up to trees, rocks and animals and you’ll chop, mine and hunt on your own. Carry resources to the <b>yellow pads</b> to build, and the <b>blue pads</b> to push back the fog. Follow the mission at the bottom-left — the yellow arrow shows the way.</div>'); }
  if (WW && WW.onReady) WW.onReady(async (user, fc) => {
    uid = user && user.uid; code = fc; if (!user) { cloudChecked = false; return; }
    try {
      const c = await WW.loadSave(CLOUD_KEY), pc = progressOf(c), pl = progressOf(st);
      if (c && c.v === 3 && (pc > pl || (pc === pl && (c.saved || 0) > (st.saved || 0)))) {   // the cloud has more progress (or the same, but newer): use it
        st = fix(c); const o = (NOW() - (st.last || NOW())) / 1000; if (o > 10) awayCatchUp(o); loadWorld(); persist();
      } else if (c && c.v === 3 && pl > pc) {   // this device has more progress than the cloud: keep it, and keep a copy of the cloud one just in case
        try { WW.writeSave(CLOUD_KEY + '_prev', c); } catch (e) {}
        setTimeout(() => toast('☁️ This device had more progress than your cloud save, so it was kept and saved to your account.', 5000), 1500);
      }
      cloudChecked = true; cloudSave();
    } catch (e) { console.warn('cloud load failed; not overwriting the cloud this session', e); }
    listenHelps(); listenGifts(); listenDuel(); shopStartup(); tbListen(code); setTimeout(() => { if (!allyList) loadAllyList(); }, 3000); publishPub(); publishPlaying(); setRoom(code);
    setTimeout(showWelcome, 2500);   // after allies' news (raids, help) has come in
  });
  setTimeout(() => { if (!WW || !WW.user) showWelcome(); }, 4000);   // not signed in: show it straight away
}

// ------------------------------------------------------------ main loop
// day and night follow your device's clock (like the farm): bright days, orange dawn and dusk, dark blue nights.
// Debug: add ?time=21.5 to the address to see a given hour.
const FORCE_HOUR = (() => { const q = new URLSearchParams(location.search).get('time'); return q === null ? null : +q; })();
const SKY_DAY = new THREE.Color(0x9fd3f0), SKY_NIGHT = new THREE.Color(0x0f1a3a), SKY_DUSK = new THREE.Color(0xf59e6b), _sky = new THREE.Color();
let dnT = 0;
function dayNight() {
  if (performance.now() - dnT < 500) return; dnT = performance.now();
  const d = new Date(), h = FORCE_HOUR !== null ? FORCE_HOUR : d.getHours() + d.getMinutes() / 60;
  const ramp = (a, b) => Math.max(0, Math.min(1, (h - a) / (b - a)));
  const k = h < 12 ? ramp(5.5, 7.5) : 1 - ramp(18, 20);                     // 0 = night, 1 = day
  const dusk = Math.max(0, 1 - Math.abs(h - (h < 12 ? 6.5 : 19)) / 1.2) * .55;  // orange glow around sunrise / sunset
  _sky.copy(SKY_NIGHT).lerp(SKY_DAY, k).lerp(SKY_DUSK, dusk);
  scene.background.copy(_sky); scene.fog.color.copy(_sky);
  hemi.intensity = .45 + 1.15 * k; sun.intensity = .35 + 1.85 * k; sun.color.set(k < .2 ? 0x8ea4e8 : dusk > .2 ? 0xffc28a : 0xfff2d8);
}
let userZoom = 1, overview = false, camZ = 1, youPin = null;
cv.addEventListener('wheel', e => { e.preventDefault(); overview = false; userZoom = Math.max(.6, Math.min(3.2, userZoom * (e.deltaY > 0 ? 1.12 : .89))); }, { passive: false });
{ // two-finger pinch zoom (one finger still walks)
  const pts = {}; let pinch0 = 0, zoom0 = 1;
  cv.addEventListener('pointerdown', e => { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; const k = Object.keys(pts); if (k.length === 2) { pinch0 = Math.hypot(pts[k[0]].x - pts[k[1]].x, pts[k[0]].y - pts[k[1]].y); zoom0 = userZoom; joy.id = null; joy.x = joy.y = 0; $('jb').style.display = $('jk').style.display = 'none'; } });
  cv.addEventListener('pointermove', e => { if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY }; const k = Object.keys(pts); if (k.length === 2 && pinch0) { const d = Math.hypot(pts[k[0]].x - pts[k[1]].x, pts[k[0]].y - pts[k[1]].y); overview = false; userZoom = Math.max(.6, Math.min(3.2, zoom0 * pinch0 / Math.max(20, d))); } });
  const up = e => { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) pinch0 = 0; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
$('bMap').onclick = () => { overview = !overview; $('bMap').classList.toggle('on', overview); toast(overview ? '🗺️ Whole map · tap 🗺️ again (or zoom) to go back' : ''); };
const clock = new THREE.Clock(); let accSec = 0, accSave = 0, accCloud = 0, accPub = 0, regenT = 0;
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const FWD = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 }, RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
// one bad frame must never freeze the game: errors are caught, shown on screen (for a screenshot), and the game keeps going
const errSeen = {};
function showErr(e) {
  const m = String((e && e.message) || e), st0 = String((e && e.stack) || '').split('\n').slice(0, 3).join(' | ').replace(/https?:\/\/[^ )]*\//g, '');
  if (errSeen[m]) return; errSeen[m] = 1; console.error('[survive]', e);
  let b = $('survErr'); if (!b) { b = document.createElement('div'); b.id = 'survErr'; b.style.cssText = 'position:fixed;left:8px;bottom:70px;z-index:99999;max-width:min(94vw,560px);background:#7f1d1d;color:#fff;font:12px/1.35 system-ui,sans-serif;padding:8px 10px;border-radius:10px;white-space:pre-wrap;word-break:break-word;cursor:pointer'; b.onclick = () => b.remove(); document.body.appendChild(b); }
  b.textContent = '⚠️ Game error (send a screenshot to fix · tap to hide):\n' + m + (st0 ? '\n' + st0 : '');
}
addEventListener('error', ev => { if (ev && ev.error) showErr(ev.error); });
addEventListener('unhandledrejection', ev => showErr(ev.reason || ev));
function frame() {
  try { frameInner(); } catch (e) { showErr(e); }
  try { renderer.render(scene, camera); } catch (e) { showErr(e); }
  requestAnimationFrame(frame);
}
function frameInner() {
  const dt = Math.min(.05, clock.getDelta()), now = NOW();
  // --- input
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
  if (PAD && PAD.poll()) { const s = PAD.state(); ix += s.moveX(); iy -= s.moveY(); document.body.classList.add('pad'); if (PAD.pressed('cross')) actPress(); if (PAD.pressed('options')) questsPanel(); if (PAD.pressed('circle')) closeSheet(); if (PAD.pressed('triangle')) heroPanel(); }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  // --- player
  if (player.dead && tour && tour.raid && !tour.raid.won && !tour.raid.lost) { tour.raid.lost = true; toast('💀 ' + tour.name + '’s defenders won this time. Heading home…', 3500); setTimeout(() => { player.dead = 0; pMesh.visible = true; st.hp = player.hpMax; goHome(true); }, 2500); }
  if (player.dead) { if (now > player.dead) { player.dead = 0; st.hp = player.hpMax; player.x = 3; player.z = 6; pMesh.visible = true; toast('🎖️ Sarge dragged you back to base. Heal up and try again.'); } }
  else {
    const sp = 6 * Math.min(1, m); player.speed = sp;
    if (m > .05) { const dx = (RIGHT.x * ix + FWD.x * iy), dz = (RIGHT.z * ix + FWD.z * iy); moveTo(player, player.x + dx * sp * dt, player.z + dz * sp * dt, .4); player.ry = Math.atan2(dx, dz); }
    player.cd -= dt;
    const foe = nearestZombie(player, 2.3);
    if (player.cd <= 0) {
      if (foe) { player.ry = Math.atan2(foe.x - player.x, foe.z - player.z); hitZombie(foe, weaponDmg(st.weapon), 'p'); pMesh.userData.swing = 1; player.cd = .5; sfx(180, .08, .06); }
      else if (duelSwing()) {}
      else {
        const dr = nearestNode(deer); const node = nearestNode(trees.concat(rocks, finds));
        if (dr && d2(player, dr) < 2) { dr.hp -= weaponDmg(st.weapon); dr.bar.visible = true; setBar(dr.bar, dr.hp / dr.max); pMesh.userData.swing = 1; player.cd = .5; sfx(220, .06, .05);
          if (dr.hp <= 0) { dr.down = true; dr.at = now + 90000; dr.mesh.visible = false; st.res.food += 5; st.stats.food += 5; fly('🍖', dr, player); } }
        else if (node && d2(player, node) < node.r + 1.3) {
          player.ry = Math.atan2(node.x - player.x, node.z - player.z); node.hp -= 1 + Math.floor((st.weapon - 1) / 2); node.shake = .25; pMesh.userData.swing = 1; player.cd = Math.max(.18, .38 - .03 * (st.weapon - 1)); sfx(node.kind === 'tree' ? 300 : 900, .05, .05);
          if (node.hp <= 0 && node.find) harvestFind(node, now);
          else if (node.hp <= 0) { node.down = true; node.at = now + (node.kind === 'tree' ? 45000 : 90000); node.top.visible = node.kind === 'tree' ? false : false; if (node.kind === 'tree') node.trunk.scale.y = .3; else node.mesh.visible = false;
            const r = node.kind === 'tree' ? 'wood' : 'metal', n = node.kind === 'tree' ? 3 : 2; st.res[r] += n; st.stats[r] += n; for (let k = 0; k < n; k++) setTimeout(() => fly(RES[r], node, player), k * 90); }
        }
      }
    }
    const hits = zombies.some(z => !z.dead && d2(z, player) < 9); regenT = hits || (tour && tour.arena) ? 0 : regenT + dt; if (regenT > 2) st.hp = Math.min(player.hpMax, st.hp + 6 * dt);
  }
  pMesh.position.set(player.x, 0, player.z); let da = player.ry - pMesh.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; pMesh.rotation.y += da * Math.min(1, dt * 12); animHuman(pMesh, player.speed, dt);
  // carried stack on the back (shows what you hold)
  const stack = Math.min(10, Math.floor(st.res.wood / 5)); if (carry.userData.n !== stack) { carry.userData.n = stack; carry.clear(); for (let k = 0; k < stack; k++) { const lg = cyl(carry, .1, .1, .7, 0xa0703f, 0, k * .2, 0, 6); lg.rotation.z = Math.PI / 2; } }
  // collect building piles
  producers().forEach(id => { const D = BD[id], p = st.piles[id] || 0; if (p >= 1 && Math.hypot(player.x - D.x, player.z - D.z) < D.r + 1.6) { const n = Math.floor(p); st.piles[id] -= n; st.res[D.out] += n; st.stats.collected += n; for (let k = 0; k < Math.min(6, n); k++) setTimeout(() => fly(RES[D.out], D, player), k * 70); sfx(700, .08, .05); } });
  deliver(dt);
  // --- heroes
  const fwd = { x: Math.sin(player.ry), z: Math.cos(player.ry) }, side = { x: fwd.z, z: -fwd.x };
  Object.keys(heroes).forEach((id, idx) => {
    const h = heroes[id], H = HEROES[id];
    if (h.down) { if (now > h.down) { h.down = 0; h.hp = h.max; h.x = player.x; h.z = player.z; h.mesh.visible = true; } return; }
    const off = [[-1.4, -1.5], [1.4, -1.5], [0, -2.6]][idx] || [0, -3], fx = player.x + side.x * off[0] + fwd.x * off[1], fz = player.z + side.z * off[0] + fwd.z * off[1];
    h.cd -= dt; const foe = nearestZombie(h, 8);
    let tx = fx, tz = fz, sp = 0;
    if (H.heal && h.cd <= 0) { const team = allies().filter(a => a.isPlayer ? st.hp < player.hpMax : a.hp < a.max).sort((a, b) => (a.isPlayer ? st.hp / player.hpMax : a.hp / a.max) - (b.isPlayer ? st.hp / player.hpMax : b.hp / b.max))[0];
      if (team && d2(h, team) < H.range + 2) { const s = heroStat(id, st.heroes[id].lvl).heal; if (team.isPlayer) st.hp = Math.min(player.hpMax, st.hp + s); else team.hp = Math.min(team.max, team.hp + s); tracer(h, team, 0x4ade80); h.cd = H.cd; } }
    if (foe) { const d = d2(h, foe); if (d > H.range) { tx = foe.x; tz = foe.z; } else { tx = h.x; tz = h.z; if (h.cd <= 0) { hitZombie(foe, heroStat(id, st.heroes[id].lvl).atk, id); h.cd = H.cd; h.mesh.userData.swing = 1; if (H.range > 2) tracer(h, foe); } h.mesh.rotation.y = Math.atan2(foe.x - h.x, foe.z - h.z); } }
    const dd = Math.hypot(tx - h.x, tz - h.z); if (dd > .3) { sp = Math.min(7.5, dd * 3); const nx = h.x + (tx - h.x) / dd * sp * dt, nz = h.z + (tz - h.z) / dd * sp * dt; moveTo(h, nx, nz, .4); if (!foe) h.mesh.rotation.y = Math.atan2(tx - h.x, tz - h.z); }
    if (d2(h, player) > 25) { h.x = player.x; h.z = player.z; }
    if (!zombies.some(z => !z.dead && d2(z, h) < 9)) h.hp = Math.min(h.max, h.hp + 5 * dt);
    h.mesh.position.set(h.x, 0, h.z); animHuman(h.mesh, sp, dt); setBar(h.bar, h.hp / h.max); faceCam(h.bar);
  });
  // --- zombies
  zombies.forEach(z => {
    if (z.dead) return; z.cd -= dt;
    const team = allies(); let tgt = null, bd = z.boss ? 10 : 7.5;
    team.forEach(a => { let d = d2(z, a); if (a.id === 'sarge') d -= 1.5; if (d < bd) { bd = d; tgt = a; } });
    if (d2(z, { x: z.hx, z: z.hz }) > 15) tgt = null;
    let tx = z.hx + Math.sin(now / 2000 + z.hx) * 2, tz = z.hz + Math.cos(now / 2300 + z.hz) * 2, sp = .8;
    if (tgt) { tx = tgt.x; tz = tgt.z; sp = z.speed; if (d2(z, tgt) < z.reach + .4) { sp = 0; if (z.cd <= 0) { z.cd = 1.2; z.mesh.userData.swing = 1; sfx(120, .1, .05);
      if (tgt.isPlayer) { st.hp -= z.dmg; if (st.hp <= 0) { st.hp = 0; player.dead = now + 3000; pMesh.visible = false; toast('💀 You were overrun!'); } } else { tgt.hp -= z.dmg; if (tgt.hp <= 0) { tgt.down = now + 20000; tgt.mesh.visible = false; toast((HEROES[tgt.id] ? HEROES[tgt.id].n : tgt.name) + ' is down — back in 20s'); } } } } }
    else if (!tgt && !z.tb && z.hp < z.max) z.hp = Math.min(z.max, z.hp + 10 * dt);
    const dd = Math.hypot(tx - z.x, tz - z.z); if (dd > .2 && sp > 0) { z.x += (tx - z.x) / dd * sp * dt; z.z += (tz - z.z) / dd * sp * dt; z.mesh.rotation.y = Math.atan2(tx - z.x, tz - z.z); }
    z.mesh.position.set(z.x, 0, z.z); animHuman(z.mesh, sp, dt); setBar(z.bar, z.hp / z.max); faceCam(z.bar);
  });
  // --- deer wander, nodes regrow
  deer.forEach(d => { if (d.down) { if (now > d.at) { d.down = false; d.hp = d.max; d.mesh.visible = true; d.bar.visible = false; } return; }
    d.wt -= dt; if (d.wt <= 0) { d.wt = 2 + Math.random() * 3; const a = Math.random() * 6.28; d.vx = Math.cos(a) * (Math.random() < .4 ? 0 : 1.2); d.vz = Math.sin(a) * (d.vx ? 1.2 : 0); }
    const pd = d2(d, player); if (pd < 4 && !player.dead) { d.vx = (d.x - player.x) / pd * 2.2; d.vz = (d.z - player.z) / pd * 2.2; }
    const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt; if (Math.hypot(nx - d.hx, nz - d.hz) < 8 && !blockedAt(nx, nz)) { d.x = nx; d.z = nz; }
    d.mesh.position.set(d.x, 0, d.z); if (d.vx || d.vz) d.mesh.rotation.y = Math.atan2(d.vx, d.vz); if (d.bar.visible) faceCam(d.bar); });
  updateWorkers(dt, now); updateGuards(dt, now); updateOthers(dt, now); updateNeighbours(dt);
  trees.concat(rocks, finds).forEach(n => {
    if (n.down && now > n.at && d2(n, player) > 2) { n.down = false; n.hp = n.max; n.top.visible = true; n.mesh.visible = true; if (n.trunk) n.trunk.scale.y = 1; }
    if (n.shake > 0) { n.shake -= dt; n.mesh.rotation.z = Math.sin(n.shake * 60) * .06; } else n.mesh.rotation.z = 0;
  });
  // --- effects
  for (let k = flyers.length - 1; k >= 0; k--) { const f = flyers[k]; f.t += dt * 2.6; const tgt = f.toP ? player : { x: f.bx, z: f.bz };
    f.s.position.set(f.ax + (tgt.x - f.ax) * f.t, 1.4 + Math.sin(f.t * Math.PI) * (f.up || 1.6), f.az + (tgt.z - f.az) * f.t); if (f.t >= 1) { scene.remove(f.s); flyers.splice(k, 1); } }
  for (let k = tracers.length - 1; k >= 0; k--) { tracers[k].t -= dt; if (tracers[k].t <= 0) { scene.remove(tracers[k].l); tracers[k].l.geometry.dispose(); tracers.splice(k, 1); } }
  const pp = bldMeshes.pp; if (pp && pp.userData.fire) { const s = 1 + Math.sin(now / 150) * .08; pp.userData.fire.scale.set(s, .55 * s, s); }
  if (bldMeshes.lumber && bldMeshes.lumber.userData.saw) bldMeshes.lumber.userData.saw.rotation.x += dt * 8;
  Object.keys(pads).forEach(k => { if (pads[k] && pads[k].plane) pads[k].plane.material.opacity = .25 + Math.sin(now / 300) * .1; });
  // --- quest arrow
  const q = checkQuest(), tg = q && q[4]();
  arrow.visible = guideG.visible = !!tg;
  if (tg) { arrow.position.set(tg.x, (tg.boss ? 6 : 4) + Math.sin(now / 250) * .3, tg.z); const dx = tg.x - player.x, dz = tg.z - player.z, dist = Math.hypot(dx, dz); guideG.visible = dist > 5; guideG.position.set(player.x, .3, player.z); guideG.rotation.y = Math.atan2(dx, dz); }
  // --- action button (open a building)
  if (moving) { moveTick(); const ab0 = $('act'), t0 = moving.swap ? '🔄 Swap here' : moving.ok ? '📍 Place here' : '❌ Can’t place here'; if (ab0.textContent !== t0) ab0.textContent = t0; ab0.style.display = 'block'; } else {
  actTarget = null; let bd = 1e9; Object.keys(bldMeshes).forEach(id => { if (lvl(id) < 1) return; const D = BD[id], d = Math.hypot(player.x - D.x, player.z - D.z); if (d < D.r + 2 && d < bd) { bd = d; actTarget = id; } });
  const ab = $('act'); if (actTarget) { const t = BD[actTarget].i + ' ' + BD[actTarget].n; if (ab.textContent !== t) ab.textContent = t; ab.style.display = 'block'; } else ab.style.display = 'none'; }
  // --- once a second
  accSec += dt; if (accSec >= 1) { const ev = economy(accSec); accSec = 0; ev.forEach(e => toast(e)); if (ev.length) { syncPads(); publishPub(); persist(); }
    if (st.overflowAt && NOW() - st.overflowAt < 1500) syncPads();   // builds being fed by full piles
    autoComplete(); syncBuildings(); syncWorkers(); syncGuards(); tbTick(); duelTick(); lairTick(); hud(); Object.keys(st.zones).forEach(k => { const [i, j] = k.split(',').map(Number); const t = zoneType(i, j); if (t === 'infected' || t === 'boss') spawnCamp(i, j); }); for (let k = zombies.length - 1; k >= 0; k--) if (zombies[k].dead) zombies.splice(k, 1); }
  accSave += dt; if (accSave > 4) { accSave = 0; persist(); }
  accCloud += dt; if (accCloud > 30) { accCloud = 0; cloudSave(); }
  accPub += dt; if (accPub > 90) { accPub = 0; publishPlaying(); publishPub(); }
  // --- camera follows from an isometric angle
  // zoom: mouse wheel, pinch, or the 🗺️ Map button (shows the whole map: everything you've discovered and anyone else here)
  camZ += ((overview ? 4.6 : userZoom) - camZ) * Math.min(1, dt * 6);
  const zoom = (innerWidth > innerHeight ? 1.1 : 1.6) * camZ, cx = overview ? 0 : player.x, cz = overview ? 0 : player.z;
  camera.position.set(cx + 13 * zoom, 19 * zoom, cz + 13 * zoom); camera.lookAt(cx, 0, cz);
  scene.fog.near = 60 * Math.max(1, camZ); scene.fog.far = 120 * Math.max(1, camZ) + 40 * Math.max(0, camZ - 1);
  const big = camZ > 2.2; Object.keys(others).forEach(u => { const o = others[u]; if (!o.pin) { o.pin = iconSprite('🤝', 4); o.pin.position.y = 6; o.mesh.add(o.pin); } o.pin.visible = big; });
  if (!youPin) { youPin = iconSprite('📍', 4); youPin.position.y = 6; pMesh.add(youPin); } youPin.visible = big;
  sun.position.set(player.x + 20, 40, player.z + 10); sun.target.position.set(player.x, 0, player.z);
  dayNight();
}
addEventListener('beforeunload', () => { try { if (hereRef && uid) hereRef.child(uid).remove(); } catch (e) {} persist(); cloudSave(); if (WW && WW.clearPlaying) WW.clearPlaying(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); cloudSave(); } });
addEventListener('online', () => { persist(); setTimeout(cloudSave, 2000); });   // played offline: push it to your account once the signal is back
boot(); requestAnimationFrame(frame);
window.__ts = { get st() { return st; }, nbTest: list => { shareAllies = list; syncNeighbours(); }, nbrs: nbrs, lairBoss: () => lairBoss(), finds: finds, tbTest: v => { tb = Object.assign({ room: tour ? tour.code : code }, v); tbSpawn(); }, get tb() { return tb; }, get tbBoss() { return tbBoss; }, tbWin: () => tbWin(), duelTest: (o) => { duel = { id: 'T', opp: 'opp', name: 'Ray' }; duelRef = { child: () => ({ push() {}, set() {}, on() {}, off() {}, remove() {} }), remove() {} }; enterArena(0); }, camera: camera, THREE: THREE, startTour: startTour, goHome: goHome, loadWorld: () => loadWorld(), workers: workers, rocks: rocks, deer: deer, guards: guards, raidTest: (p) => { startTour('R', p, true); tour.raid = { loot: { wood: 10 }, won: false }; spawnDefenders(p.w); }, get zombies2() { return zombies; }, get tour() { return tour; }, pads: pads, player: player, zombies: zombies, trees: trees };
