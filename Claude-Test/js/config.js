// Neighborly Acre: game rules shared by the game and tests (no DOM / three.js here).

const MIN = 60000, HOUR = 3600000, DAY = 86400000;

// ---- crops (grow = real minutes of growth after the crop is watered)
export const CROPS = {
  wheat:      { name: 'Wheat',      icon: '🌾', level: 1, grow: 4 * MIN,  seed: 4,  sell: 9 },
  carrot:     { name: 'Carrot',     icon: '🥕', level: 1, grow: 3 * MIN,  seed: 3,  sell: 7 },
  corn:       { name: 'Corn',       icon: '🌽', level: 2, grow: 6 * MIN,  seed: 6,  sell: 16 },
  potato:     { name: 'Potato',     icon: '🥔', level: 2, grow: 5 * MIN,  seed: 5,  sell: 12 },
  cabbage:    { name: 'Cabbage',    icon: '🥬', level: 3, grow: 7 * MIN,  seed: 8,  sell: 20 },
  strawberry: { name: 'Strawberry', icon: '🍓', level: 3, grow: 6 * MIN,  seed: 10, sell: 26 },
  tomato:     { name: 'Tomato',     icon: '🍅', level: 4, grow: 9 * MIN,  seed: 12, sell: 34 },
  sunflower:  { name: 'Sunflower',  icon: '🌻', level: 5, grow: 10 * MIN, seed: 14, sell: 40 },
  pumpkin:    { name: 'Pumpkin',    icon: '🎃', level: 6, grow: 15 * MIN, seed: 20, sell: 70 }
};
export const CROP_IDS = Object.keys(CROPS);

// ---- animals (every = real minutes between products)
export const ANIMALS = {
  chicken: { name: 'Chicken', icon: '🐔', level: 1, cost: 40,  max: 8, every: 3 * MIN, prod: 'egg',  pen: 'chicken' },
  sheep:   { name: 'Sheep',   icon: '🐑', level: 3, cost: 100, max: 6, every: 8 * MIN, prod: 'wool', pen: 'pasture' },
  cow:     { name: 'Cow',     icon: '🐄', level: 4, cost: 150, max: 4, every: 6 * MIN, prod: 'milk', pen: 'pasture' }
};

// ---- goods: base sell prices (market multiplies by 0.8–1.3 each day)
export const GOODS = {
  egg: { name: 'Egg', icon: '🥚', sell: 6 }, milk: { name: 'Milk', icon: '🥛', sell: 14 }, wool: { name: 'Wool', icon: '🧶', sell: 20 },
  bread: { name: 'Bread', icon: '🍞', sell: 45 }, cheese: { name: 'Cheese', icon: '🧀', sell: 50 }, jam: { name: 'Strawberry jam', icon: '🍯', sell: 95 },
  fries: { name: 'Fries', icon: '🍟', sell: 48 }, sweater: { name: 'Sweater', icon: '🧥', sell: 70 }, omelet: { name: 'Omelet', icon: '🍳', sell: 32 }
};
CROP_IDS.forEach(function (c) { GOODS[c] = { name: CROPS[c].name, icon: CROPS[c].icon, sell: CROPS[c].sell }; });
export const RECIPES = [
  { id: 'bread', needs: { wheat: 3 }, level: 1 }, { id: 'omelet', needs: { egg: 3 }, level: 1 },
  { id: 'fries', needs: { potato: 3 }, level: 2 }, { id: 'jam', needs: { strawberry: 3 }, level: 3 },
  { id: 'sweater', needs: { wool: 2 }, level: 3 }, { id: 'cheese', needs: { milk: 2 }, level: 4 }
];

// ---- tractor upgrades
export const UPGRADES = {
  fast: { name: 'Turbo engine', desc: 'Tractor drives 30% faster', level: 2, cost: 250 },
  wide: { name: 'Wide implements', desc: 'Tractor works 5 tiles at once instead of 3', level: 3, cost: 500 }
};

// ---- levels
export function levelFromXp(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1; }
export function xpForLevel(l) { return 25 * (l - 1) * (l - 1); }
export function cropXp(id) { return Math.max(1, Math.round(CROPS[id].sell / 4)); }

// ---- deterministic hash in [0,1)
export function hash(n) { let x = (Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ ((n / 4294967296) | 0)) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; }

// ---- weather: rain windows are a pure function of absolute time, so every player sees the same rain
// (and crops planted while nobody is online can still be rained on afterwards).
const RAIN_CHANCE = 0.30;
function rainBlock(hb) {
  if (hash(hb * 7 + 1) >= RAIN_CHANCE) return null;
  const start = hb * HOUR + hash(hb * 7 + 2) * 40 * MIN, dur = (12 + hash(hb * 7 + 3) * 25) * MIN;
  return { start: start, end: start + dur };
}
export function isRaining(t) {
  const hb = Math.floor(t / HOUR);
  for (let b = hb - 1; b <= hb; b++) { const r = rainBlock(b); if (r && t >= r.start && t < r.end) return true; }
  return false;
}
// first moment at or after `from` (and no later than `to`) when it rained, or null
export function firstRainBetween(from, to) {
  for (let hb = Math.floor(from / HOUR) - 1; hb <= Math.floor(to / HOUR) && hb < Math.floor(from / HOUR) + 120; hb++) {
    const r = rainBlock(hb); if (r && r.end > from && r.start <= to) return Math.max(r.start, from);
  }
  return null;
}
export function nextRainStart(t) {
  for (let hb = Math.floor(t / HOUR); hb < Math.floor(t / HOUR) + 120; hb++) { const r = rainBlock(hb); if (r && r.start > t) return r.start; }
  return null;
}

// ---- real local time -> sun position. Day length follows the season (mid-latitude approximation).
export function sunTimes(date) {
  const start = new Date(date.getFullYear(), 0, 0), doy = Math.floor((date - start) / DAY);
  const len = 12 + 2.6 * Math.sin(2 * Math.PI * (doy - 80) / 365), noon = 11.75;
  return { rise: noon - len / 2, set: noon + len / 2, len: len };
}
// returns { elev: -1..1 (sun height), day: 0..1 daylight amount, hours }
export function skyAt(date) {
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600, s = sunTimes(date);
  let elev = -.35; if (h > s.rise && h < s.set) elev = Math.sin(Math.PI * (h - s.rise) / s.len);
  const edge = Math.min(Math.abs(h - s.rise), Math.abs(h - s.set)), twilight = Math.max(0, 1 - edge / .8);
  return { elev: elev, day: Math.max(0, Math.min(1, elev * 2.4)), twilight: twilight, hours: h };
}

// ---- market + orders (shared by UTC day so friends see the same prices)
export function dayNumber(t) { return Math.floor(t / DAY); }
export function priceOf(item, day) { const ids = Object.keys(GOODS), i = ids.indexOf(item); return Math.max(1, Math.round(GOODS[item].sell * (.8 + .5 * hash(day * 131 + i * 17 + 5)))); }
export function ordersFor(day, level) {
  const pool = Object.keys(GOODS).filter(function (g) { return CROPS[g] ? CROPS[g].level <= level : (g === 'egg' ? true : level >= 2); });
  const out = [];
  for (let k = 0; k < 3; k++) {
    const item = pool[Math.floor(hash(day * 31 + k * 7 + 11) * pool.length)];
    const qty = Math.max(2, Math.round((4 + hash(day * 53 + k) * 10) * (GOODS[item].sell > 40 ? .35 : 1) * (1 + level * .12)));
    out.push({ item: item, qty: qty, reward: Math.round(qty * GOODS[item].sell * 1.6), xp: 10 + level * 3 });
  }
  return out;
}

export function fmtTime(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
