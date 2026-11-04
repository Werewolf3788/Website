// Neighborly Acre: game rules shared by the game and tests (no DOM / three.js here).

const MIN = 60000, HOUR = 3600000, DAY = 86400000;

// ---- levels: level 1 -> 2 needs 25 xp, 2 -> 3 needs 50, 3 -> 4 needs 75 ... up to level 50
export const MAX_LEVEL = 50;
export function xpForLevel(l) { return 25 * l * (l - 1) / 2; }                // total xp needed to reach level l
export function xpToNext(l) { return 25 * l; }                                 // xp needed to go from level l to l+1
export function levelFromXp(xp) { const l = Math.floor((1 + Math.sqrt(1 + 8 * Math.max(0, xp) / 25)) / 2); return Math.min(MAX_LEVEL, Math.max(1, l)); }
export const XP_HARVEST = 5;                                                   // every crop harvested
export const XP_PRODUCT = { egg: 1, wool: 2, milk: 3 };                        // chicken / sheep / cow
export function levelUpCoins(l) { return 25 * l; }

// ---- crops: grow = real minutes of growth after the crop is watered (every crop is ready within 1 hour)
export const CROPS = {
  carrot:     { name: 'Carrot',     icon: '🥕', level: 1,  grow: 3 * MIN,  seed: 1,  sell: 7 },
  wheat:      { name: 'Wheat',      icon: '🌾', level: 1,  grow: 5 * MIN,  seed: 2,  sell: 9 },
  radish:     { name: 'Radish',     icon: '🌸', level: 3,  grow: 4 * MIN,  seed: 2,  sell: 8 },
  corn:       { name: 'Corn',       icon: '🌽', level: 5,  grow: 10 * MIN, seed: 3,  sell: 16 },
  potato:     { name: 'Potato',     icon: '🥔', level: 8,  grow: 8 * MIN,  seed: 2,  sell: 12 },
  onion:      { name: 'Onion',      icon: '🧅', level: 11, grow: 12 * MIN, seed: 3,  sell: 15 },
  cabbage:    { name: 'Cabbage',    icon: '🥬', level: 14, grow: 15 * MIN, seed: 4,  sell: 20 },
  strawberry: { name: 'Strawberry', icon: '🍓', level: 18, grow: 12 * MIN, seed: 5,  sell: 26 },
  tomato:     { name: 'Tomato',     icon: '🍅', level: 22, grow: 20 * MIN, seed: 7,  sell: 34 },
  eggplant:   { name: 'Eggplant',   icon: '🍆', level: 27, grow: 25 * MIN, seed: 8,  sell: 42 },
  sunflower:  { name: 'Sunflower',  icon: '🌻', level: 33, grow: 30 * MIN, seed: 10, sell: 50 },
  watermelon: { name: 'Watermelon', icon: '🍉', level: 40, grow: 45 * MIN, seed: 18, sell: 90 },
  pumpkin:    { name: 'Pumpkin',    icon: '🎃', level: 46, grow: 60 * MIN, seed: 24, sell: 120 }
};
export const CROP_IDS = Object.keys(CROPS);

// ---- seed packs: one purchase covers many tiles (a field pack covers the whole 20x12 field)
export const FIELD_TILES = 240;
export const PACKS = [20, 60, 240, 480, 720, 1440];
export function packLabel(n) { return n >= 240 && n % 240 === 0 ? (n / 240) + ' field' + (n > 240 ? 's' : '') : '×' + n; }
// land: the top row of three fields is open from the start; the other three are bought at the barn (shared by everyone on the farm)
export const FREE_FIELDS = [0, 1, 2];
export const FIELD_SALE = { 3: { cost: 2000, level: 10 }, 4: { cost: 5000, level: 20 }, 5: { cost: 10000, level: 30 } };
export function packPrice(id, n) { return Math.max(1, Math.round(CROPS[id].seed * n * (n >= 240 ? .8 : n >= 60 ? .9 : 1))); }

// ---- animals (every = real minutes between products)
export const ANIMALS = {
  chicken: { name: 'Chicken', icon: '🐔', level: 1,  cost: 40,  max: 8, every: 3 * MIN,  prod: 'egg',  pen: 'chicken' },
  sheep:   { name: 'Sheep',   icon: '🐑', level: 6,  cost: 120, max: 6, every: 6 * MIN,  prod: 'wool', pen: 'pasture' },
  cow:     { name: 'Cow',     icon: '🐄', level: 12, cost: 250, max: 4, every: 10 * MIN, prod: 'milk', pen: 'pasture' }
};

// ---- recipes + goods: base sell prices (the market multiplies them by 0.8 to 1.3 each day)
export const RECIPES = [
  { id: 'bread', needs: { wheat: 3 }, level: 1 }, { id: 'omelet', needs: { egg: 3 }, level: 2 },
  { id: 'fries', needs: { potato: 3 }, level: 8 }, { id: 'sweater', needs: { wool: 2 }, level: 8 },
  { id: 'cheese', needs: { milk: 2 }, level: 13 }, { id: 'jam', needs: { strawberry: 3 }, level: 18 }
];
export const GOODS = {
  egg: { name: 'Egg', icon: '🥚', sell: 6 }, wool: { name: 'Wool', icon: '🧶', sell: 22 }, milk: { name: 'Milk', icon: '🥛', sell: 40 },
  bread: { name: 'Bread', icon: '🍞', sell: 45 }, cheese: { name: 'Cheese', icon: '🧀', sell: 110 }, jam: { name: 'Strawberry jam', icon: '🍯', sell: 95 },
  fries: { name: 'Fries', icon: '🍟', sell: 48 }, sweater: { name: 'Sweater', icon: '🧥', sell: 70 }, omelet: { name: 'Omelet', icon: '🍳', sell: 32 }
};
CROP_IDS.forEach(function (c) { GOODS[c] = { name: CROPS[c].name, icon: CROPS[c].icon, sell: CROPS[c].sell, level: CROPS[c].level }; });
Object.keys(ANIMALS).forEach(function (a) { GOODS[ANIMALS[a].prod].level = ANIMALS[a].level; });
RECIPES.forEach(function (r) { GOODS[r.id].level = r.level; });

// ---- tractor upgrades
export const UPGRADES = {
  fast: { name: 'Turbo engine', desc: 'Tractor drives 30% faster', level: 5, cost: 250 },
  wide: { name: 'Wide implements', desc: 'Tractor works 5 tiles at once instead of 3', level: 10, cost: 900 }
};

// everything that unlocks at level l (for the level-up message)
export function unlocksAt(l) {
  const out = [];
  CROP_IDS.forEach(function (c) { if (CROPS[c].level === l && l > 1) out.push(CROPS[c].icon + ' ' + CROPS[c].name); });
  Object.keys(ANIMALS).forEach(function (a) { if (ANIMALS[a].level === l && l > 1) out.push(ANIMALS[a].icon + ' ' + ANIMALS[a].name); });
  RECIPES.forEach(function (r) { if (r.level === l && l > 1) out.push(GOODS[r.id].icon + ' ' + GOODS[r.id].name + ' recipe'); });
  Object.keys(UPGRADES).forEach(function (u) { if (UPGRADES[u].level === l) out.push('🚜 ' + UPGRADES[u].name); });
  return out;
}

// ---- deterministic hash in [0,1)
export function hash(n) { let x = (Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ ((n / 4294967296) | 0)) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; }

// ---- weather: two short rain showers every hour, one at a random moment inside each half hour (3 to 6 minutes long).
// It is a pure function of absolute time, so every player sees the same rain, and crops planted while nobody is online
// still get watered afterwards. The longest possible dry spell is under an hour, so a crop (all are ready within 1 hour)
// always gets rain while it grows.
const SLOT = 30 * MIN;
function rainBlock(s) {
  const dur = (3 + hash(s * 7 + 3) * 3) * MIN, start = s * SLOT + hash(s * 7 + 2) * (SLOT - dur);
  return { start: start, end: start + dur };
}
export function isRaining(t) { const r = rainBlock(Math.floor(t / SLOT)); return t >= r.start && t < r.end; }
// first moment at or after `from` (and no later than `to`) when it rained, or null
export function firstRainBetween(from, to) {
  for (let s = Math.floor(from / SLOT); s <= Math.floor(to / SLOT) && s < Math.floor(from / SLOT) + 240; s++) {
    const r = rainBlock(s); if (r.end > from && r.start <= to) return Math.max(r.start, from);
  }
  return null;
}
export function nextRainStart(t) {
  for (let s = Math.floor(t / SLOT); s < Math.floor(t / SLOT) + 4; s++) { const r = rainBlock(s); if (r.start > t) return r.start; }
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
  const pool = Object.keys(GOODS).filter(function (g) { return (GOODS[g].level || 1) <= level; });
  const out = [];
  for (let k = 0; k < 3; k++) {
    const item = pool[Math.floor(hash(day * 31 + k * 7 + 11) * pool.length)];
    const qty = Math.max(2, Math.round((4 + hash(day * 53 + k) * 10) * (GOODS[item].sell > 40 ? .35 : 1) * (1 + Math.min(level, 30) * .1)));
    out.push({ item: item, qty: qty, reward: Math.round(qty * GOODS[item].sell * 1.6), xp: 10 + Math.min(level, 40) * 2 });
  }
  return out;
}

// ---- missions (FarmVille style): 3 daily missions that reset at local midnight, plus never-ending milestone ladders.
// Counters live in save.stats: harvest, plant, sell, egg, wool, milk, orders.
export const STATS = {
  harvest: { icon: '🧺', verb: 'Harvest', noun: 'crops',   level: 1 },
  plant:   { icon: '🌱', verb: 'Plant',   noun: 'seeds',   level: 1 },
  sell:    { icon: '💰', verb: 'Sell',    noun: 'goods',   level: 1 },
  egg:     { icon: '🥚', verb: 'Collect', noun: 'eggs',    level: ANIMALS.chicken.level },
  wool:    { icon: '🧶', verb: 'Collect', noun: 'wool',    level: ANIMALS.sheep.level },
  milk:    { icon: '🥛', verb: 'Collect', noun: 'milk',    level: ANIMALS.cow.level },
  orders:  { icon: '📋', verb: 'Deliver', noun: 'orders',  level: 3 }
};
const DAILY_GOAL = {
  harvest: function (l) { return Math.min(200, 10 + 3 * l); }, plant: function (l) { return Math.min(300, 20 + 6 * l); }, sell: function (l) { return Math.min(300, 15 + 4 * l); },
  egg: function (l) { return Math.min(40, 6 + Math.floor(l / 2)); }, wool: function (l) { return Math.min(30, 4 + Math.floor(l / 3)); }, milk: function (l) { return Math.min(24, 3 + Math.floor(l / 3)); },
  orders: function (l) { return 1 + Math.floor(l / 15); }
};
const XP_PER = { harvest: 2, plant: 1, sell: .5, egg: 2, wool: 3, milk: 4, orders: 25 }, COIN_PER = { harvest: 4, plant: 2, sell: 1, egg: 5, wool: 12, milk: 20, orders: 100 };
export function localDayKey(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
export function statUnlocked(stat, level) { return level >= STATS[stat].level; }
export function dailyMissions(dayKey, level) {
  const pool = Object.keys(STATS).filter(function (s) { return statUnlocked(s, level); }), out = [], used = {};
  for (let k = 0; out.length < 3 && k < 30; k++) {
    const stat = pool[Math.floor(hash(dayKey * 17 + k * 5 + 3) * pool.length)]; if (used[stat]) continue; used[stat] = 1;
    const goal = DAILY_GOAL[stat](level);
    out.push({ stat: stat, goal: goal, xp: Math.max(5, Math.round(goal * XP_PER[stat])), coins: Math.round(goal * COIN_PER[stat]), text: STATS[stat].verb + ' ' + goal + ' ' + STATS[stat].noun });
  }
  return out;
}
export const LADDER = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
export function tierReward(goal) { return { xp: Math.max(5, Math.round(goal * .5)), coins: goal * 3 }; }

export function fmtTime(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
