// Neighborly Acre: game rules shared by the game and tests (no DOM / three.js here).

const MIN = 60000, HOUR = 3600000, DAY = 86400000;

// ---- levels: level 1 -> 2 needs 25 xp, 2 -> 3 needs 50, 3 -> 4 needs 75 ... up to level 50
export const MAX_LEVEL = 50;
export function xpForLevel(l) { return 25 * l * (l - 1) / 2; }                // total xp needed to reach level l
export function xpToNext(l) { return 25 * l; }                                 // xp needed to go from level l to l+1
export function levelFromXp(xp) { const l = Math.floor((1 + Math.sqrt(1 + 8 * Math.max(0, xp) / 25)) / 2); return Math.min(MAX_LEVEL, Math.max(1, l)); }
export const XP_SCALE = 0.4;                                                   // every xp gain is multiplied by this (levels were coming too fast)
export const xpShow = n => { const v = Math.round(n * XP_SCALE * 10) / 10; return v; };
export const XP_HARVEST = 5;                                                   // every crop harvested
export const XP_PRODUCT = { egg: 1, wool: 2, milk: 3, duckegg: 2, goatmilk: 4 };                        // chicken / sheep / cow
export function levelUpCoins(l) { return 25 * l; }

// ---- crops: grow = real minutes of growth after the crop is watered (every crop is ready within 1 hour).
// Rule: the more a crop sells for, the longer it takes (a cheap crop never takes longer than a dearer one).
export const CROPS = {
  carrot:     { name: 'Carrot',     icon: '🥕', level: 1,  grow: 3 * MIN,  seed: 1,  sell: 7 },
  wheat:      { name: 'Wheat',      icon: '🌾', level: 1,  grow: 5 * MIN,  seed: 2,  sell: 9 },
  radish:     { name: 'Radish',     icon: '🌸', level: 3,  grow: 4 * MIN,  seed: 2,  sell: 8 },
  corn:       { name: 'Corn',       icon: '🌽', level: 5,  grow: 12 * MIN, seed: 3,  sell: 16 },
  potato:     { name: 'Potato',     icon: '🥔', level: 8,  grow: 8 * MIN,  seed: 2,  sell: 12 },
  onion:      { name: 'Onion',      icon: '🧅', level: 11, grow: 10 * MIN, seed: 3,  sell: 15 },
  cabbage:    { name: 'Cabbage',    icon: '🥬', level: 14, grow: 15 * MIN, seed: 4,  sell: 20 },
  strawberry: { name: 'Strawberry', icon: '🍓', level: 18, grow: 17 * MIN, seed: 5,  sell: 26 },
  tomato:     { name: 'Tomato',     icon: '🍅', level: 22, grow: 20 * MIN, seed: 7,  sell: 34 },
  eggplant:   { name: 'Eggplant',   icon: '🍆', level: 27, grow: 25 * MIN, seed: 8,  sell: 42 },
  sunflower:  { name: 'Sunflower',  icon: '🌻', level: 33, grow: 30 * MIN, seed: 10, sell: 50 },
  watermelon: { name: 'Watermelon', icon: '🍉', level: 40, grow: 45 * MIN, seed: 18, sell: 90 },
  pumpkin:    { name: 'Pumpkin',    icon: '🎃', level: 46, grow: 60 * MIN, seed: 24, sell: 120 }
};
export const CROP_IDS = Object.keys(CROPS);

// ---- seed packs: one purchase covers many tiles (a field pack covers the whole 20x12 field)
export const FIELD_TILES = 240;
export const PACKS = [20, 60, 240, 480, 720, 1440, 2160, 2880];
export function packLabel(n) { return n >= 240 && n % 240 === 0 ? (n / 240) + ' field' + (n > 240 ? 's' : '') : '×' + n; }
// land: every player gets one free field when they start (solo players get all three of the first row); more fields are bought at the barn
export const FREE_FIELDS = [0, 1, 2];
// Each player owns their own fields. The price (and level needed) of the NEXT field depends on how many fields you already own.
export const LAND = [null, { cost: 500, level: 3 }, { cost: 1000, level: 6 }, { cost: 2000, level: 10 }, { cost: 5000, level: 20 }, { cost: 10000, level: 30 },
  { cost: 15000, level: 35 }, { cost: 22000, level: 38 }, { cost: 32000, level: 41 }, { cost: 45000, level: 44 }, { cost: 60000, level: 47 }, { cost: 80000, level: 50 }];
// There are 24 field plots in all. Six are shown at first; whenever fewer than 2 unowned fields are on show, the next plot appears (so there is always land to buy).
export const MAX_FIELDS = 24;
for (let i = LAND.length; i < MAX_FIELDS; i++) { const p = LAND[i - 1]; LAND.push({ cost: Math.round(p.cost * 1.2 / 1000) * 1000, level: p.level + 2 }); }   // keep adding pricier land so there is always another plot to buy
export const MIN_FIELDS_FOR_SALE = 2, START_FIELDS = 6;
export function packPrice(id, n) { return Math.max(1, Math.round(CROPS[id].seed * n * (n >= 240 ? .8 : n >= 60 ? .9 : 1))); }

// ---- animals (every = real minutes between products)
export const ANIMALS = {
  chicken: { name: 'Chicken', icon: '🐔', level: 1,  cost: 40,  max: 8, every: 3 * MIN,  prod: 'egg',  pen: 'chicken' },
  sheep:   { name: 'Sheep',   icon: '🐑', level: 6,  cost: 120, max: 6, every: 6 * MIN,  prod: 'wool', pen: 'pasture' },
  cow:     { name: 'Cow',     icon: '🐄', level: 12, cost: 250, max: 4, every: 10 * MIN, prod: 'milk', pen: 'pasture' },
  duck:    { name: 'Duck',    icon: '🦆', level: 3,  cost: 70,  max: 8, every: 4 * MIN,  prod: 'duckegg',  pen: 'chicken', stat: 'egg' },
  goat:    { name: 'Goat',    icon: '🐐', level: 16, cost: 400, max: 4, every: 8 * MIN,  prod: 'goatmilk', pen: 'pasture', stat: 'milk' }
};

// ---- recipes + goods: base sell prices (the market multiplies them by 0.8 to 1.3 each day)
export const RECIPES = [
  { id: 'bread', needs: { wheat: 3 }, level: 1 }, { id: 'omelet', needs: { egg: 3 }, level: 2 },
  { id: 'fries', needs: { potato: 3 }, level: 8 }, { id: 'sweater', needs: { wool: 2 }, level: 8 },
  { id: 'cheese', needs: { milk: 2 }, level: 13 }, { id: 'jam', needs: { strawberry: 3 }, level: 18 },
  { id: 'pancake', needs: { wheat: 2, egg: 2 }, level: 4 }, { id: 'soup', needs: { potato: 2, onion: 2 }, level: 11 },
  { id: 'cake', needs: { wheat: 3, egg: 3, milk: 2 }, level: 15 }, { id: 'salad', needs: { tomato: 2, cabbage: 2 }, level: 22 },
  { id: 'pie', needs: { pumpkin: 1, wheat: 2, egg: 2 }, level: 46 }
];
export const GOODS = {
  egg: { name: 'Egg', icon: '🥚', sell: 6 }, wool: { name: 'Wool', icon: '🧶', sell: 22 }, milk: { name: 'Milk', icon: '🥛', sell: 40 },
  bread: { name: 'Bread', icon: '🍞', sell: 45 }, cheese: { name: 'Cheese', icon: '🧀', sell: 110 }, jam: { name: 'Strawberry jam', icon: '🍯', sell: 95 },
  fries: { name: 'Fries', icon: '🍟', sell: 48 }, sweater: { name: 'Sweater', icon: '🧥', sell: 70 }, omelet: { name: 'Omelet', icon: '🍳', sell: 32 },
  duckegg: { name: 'Duck egg', icon: '🥚', sell: 9 }, goatmilk: { name: 'Goat milk', icon: '🥛', sell: 55 },
  pancake: { name: 'Pancakes', icon: '🥞', sell: 55 }, soup: { name: 'Hearty soup', icon: '🍲', sell: 85 }, cake: { name: 'Cake', icon: '🍰', sell: 160 },
  salad: { name: 'Garden salad', icon: '🥗', sell: 140 }, pie: { name: 'Pumpkin pie', icon: '🥧', sell: 300 }
};
CROP_IDS.forEach(function (c) { GOODS[c] = { name: CROPS[c].name, icon: CROPS[c].icon, sell: CROPS[c].sell, level: CROPS[c].level }; });
Object.keys(ANIMALS).forEach(function (a) { GOODS[ANIMALS[a].prod].level = ANIMALS[a].level; });
RECIPES.forEach(function (r) { GOODS[r.id].level = r.level; });

// ---- field work. Plow -> Cultivate (optional) -> Plant -> Water -> Fertilize (optional) -> Harvest.
// Cultivated soil grows its crop 10% faster; fertilizer makes a growing crop grow 25% faster. Both are lost when the crop is harvested.
export const TOOL_LEVEL = { hoe: 1, cultivate: 2, water: 1, harvest: 1, seed: 1, fert: 4 };
export const GROW_CULTIVATED = .9, GROW_FERTILIZED = .75;
export const FERT = { name: 'Fertilizer', icon: '🧪', cost: 6, packs: [10, 50, 200] };
export function fertPrice(n) { return Math.round(FERT.cost * n * (n >= 200 ? .75 : n >= 50 ? .85 : 1)); }

// ---- tractor upgrades
export const UPGRADES = {
  fast:      { name: 'Turbo engine',      desc: 'Tractor drives 30% faster', level: 5, cost: 250 },
  whistle:   { name: 'Farm whistle',      desc: 'Collect animal products from twice as far away', level: 7, cost: 400 },
  wide:      { name: 'Wide implements',   desc: 'Tractor works 5 tiles at once instead of 3', level: 10, cost: 900 },
  sprinkler: { name: 'Sprinkler seeder',  desc: 'Seeds planted by the tractor are watered right away', level: 13, cost: 1500 },
  nitro:     { name: 'Nitro engine',      desc: 'Tractor drives another 25% faster (needs Turbo engine)', level: 16, cost: 2500, needs: 'fast' },
  combine:   { name: 'Combine header',    desc: 'Harvesting with the tractor sometimes gives a bonus crop (1 in 4)', level: 20, cost: 4000 },
  mega:      { name: 'Mega implements',   desc: 'Tractor works 7 tiles at once (needs Wide implements)', level: 26, cost: 7500, needs: 'wide' }
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
// Orders come in two kinds. "Today" orders run out at the end of the UTC day. "Multi-day" orders are posted on a day and stay open for
// 2 or 3 days (bigger, with a bonus). Each order has a stable id (postedDay-slot), so a delivery is remembered for as long as it is open.
function makeOrder(postDay, k, level, days) {
  const pool = Object.keys(GOODS).filter(function (g) { return (GOODS[g].level || 1) <= level; }), salt = days > 1 ? 900 : 0;
  const item = pool[Math.floor(hash(postDay * 31 + k * 7 + 11 + salt) * pool.length)];
  const base = Math.max(2, Math.round((4 + hash(postDay * 53 + k + salt) * 10) * (GOODS[item].sell > 40 ? .35 : 1) * (1 + Math.min(level, 30) * .1)));
  const qty = days > 1 ? Math.max(3, Math.round(base * (1 + .6 * (days - 1)))) : base;
  const reward = Math.round(qty * GOODS[item].sell * (days > 1 ? 1.6 + .15 * (days - 1) : 1.6));
  return { id: postDay + '-' + (days > 1 ? 'm' : 'd') + k, item: item, qty: qty, reward: reward, xp: 10 + Math.min(level, 40) * 2, days: days, post: postDay, expires: (postDay + days) * DAY };
}
export function orderCounts(level) { return { today: Math.min(5, 3 + Math.floor(level / 10)), multi: Math.min(2, 1 + Math.floor(level / 25)) }; }
// every order open on `day` (today's end-of-day orders first, then multi-day orders, soonest to expire first)
export function ordersFor(day, level) {
  const n = orderCounts(level), out = [];
  for (let k = 0; k < n.today; k++) out.push(makeOrder(day, k, level, 1));
  const multi = [];
  for (let post = day - 2; post <= day; post++) {
    for (let k = 0; k < n.multi; k++) {
      const days = 2 + (hash(post * 19 + k * 3 + 5) < .5 ? 0 : 1);          // 2 or 3 days
      if (post + days > day) multi.push(makeOrder(post, k, level, days));
    }
  }
  multi.sort(function (a, b) { return a.expires - b.expires || (a.id < b.id ? -1 : 1); });
  return out.concat(multi);
}

// ---- missions (FarmVille style): 5 daily missions that reset at local midnight, plus never-ending milestone ladders.
// Counters live in save.stats: harvest, plant, sell, egg, wool, milk, orders.
export const STATS = {
  harvest: { icon: '🧺', verb: 'Harvest', noun: 'crops',   level: 1 },
  plant:   { icon: '🌱', verb: 'Plant',   noun: 'seeds',   level: 1 },
  sell:    { icon: '💰', verb: 'Sell',    noun: 'goods',   level: 1 },
  egg:     { icon: '🥚', verb: 'Collect', noun: 'eggs',    level: ANIMALS.chicken.level },
  wool:    { icon: '🧶', verb: 'Collect', noun: 'wool',    level: ANIMALS.sheep.level },
  milk:    { icon: '🥛', verb: 'Collect', noun: 'milk',    level: ANIMALS.cow.level },
  orders:  { icon: '📋', verb: 'Deliver', noun: 'orders',  level: 3 },
  water:   { icon: '💧', verb: 'Water',   noun: 'crops',   level: 1 },
  plow:    { icon: '⛏️', verb: 'Plow',    noun: 'tiles',   level: 1 },
  cook:    { icon: '🍳', verb: 'Cook',    noun: 'dishes',  level: 2 },
  buy:     { icon: '🛒', verb: 'Buy',     noun: 'seed packs', level: 1 },
  cultivate: { icon: '🌿', verb: 'Cultivate', noun: 'tiles', level: TOOL_LEVEL.cultivate },
  fert:    { icon: '🧪', verb: 'Fertilize', noun: 'crops', level: TOOL_LEVEL.fert }
};
const DAILY_GOAL = {
  harvest: function (l) { return Math.min(200, 10 + 3 * l); }, plant: function (l) { return Math.min(300, 20 + 6 * l); }, sell: function (l) { return Math.min(300, 15 + 4 * l); },
  egg: function (l) { return Math.min(40, 6 + Math.floor(l / 2)); }, wool: function (l) { return Math.min(30, 4 + Math.floor(l / 3)); }, milk: function (l) { return Math.min(24, 3 + Math.floor(l / 3)); },
  orders: function (l) { return 1 + Math.floor(l / 15); },
  water: function (l) { return Math.min(250, 15 + 4 * l); }, plow: function (l) { return Math.min(300, 20 + 5 * l); },
  cook: function (l) { return Math.min(12, 2 + Math.floor(l / 6)); }, buy: function (l) { return Math.min(8, 1 + Math.floor(l / 8)); },
  cultivate: function (l) { return Math.min(200, 15 + 4 * l); }, fert: function (l) { return Math.min(80, 6 + l); }
};
const XP_PER = { harvest: 2, plant: 1, sell: .5, egg: 2, wool: 3, milk: 4, orders: 25, water: 1, plow: .5, cook: 10, buy: 15, cultivate: .8, fert: 3 }, COIN_PER = { harvest: 4, plant: 2, sell: 1, egg: 5, wool: 12, milk: 20, orders: 100, water: 2, plow: 1, cook: 25, buy: 40, cultivate: 2, fert: 8 };
export const DAILY_COUNT = 5;
export function localDayKey(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
export function statUnlocked(stat, level) { return level >= STATS[stat].level; }
export function dailyMissions(dayKey, level) {
  const pool = Object.keys(STATS).filter(function (s) { return statUnlocked(s, level); }), out = [], used = {};
  for (let k = 0; out.length < DAILY_COUNT && k < 60; k++) {
    const stat = pool[Math.floor(hash(dayKey * 17 + k * 5 + 3) * pool.length)]; if (used[stat]) continue; used[stat] = 1;
    const goal = DAILY_GOAL[stat](level);
    out.push({ stat: stat, goal: goal, xp: Math.max(5, Math.round(goal * XP_PER[stat])), coins: Math.round(goal * COIN_PER[stat]), text: STATS[stat].verb + ' ' + goal + ' ' + STATS[stat].noun });
  }
  return out;
}
export const LADDER = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
export function tierReward(goal) { return { xp: Math.max(5, Math.round(goal * .5)), coins: goal * 3 }; }

export function fmtTime(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }

// ---- achievements: earned once, announced to everyone on the site. t(ctx) gets { s: save.stats, level, fields, coins, up }
export const ACHIEVEMENTS = [
  { id: 'h1', icon: '🌾', name: 'First Harvest', desc: 'Harvest your first crop', t: c => c.s.harvest >= 1 },
  { id: 'h100', icon: '🧺', name: 'Green Thumb', desc: 'Harvest 100 crops', t: c => c.s.harvest >= 100 },
  { id: 'h1000', icon: '🚜', name: 'Harvest Hero', desc: 'Harvest 1,000 crops', t: c => c.s.harvest >= 1000 },
  { id: 'h10000', icon: '👑', name: 'Harvest Legend', desc: 'Harvest 10,000 crops', t: c => c.s.harvest >= 10000 },
  { id: 'p500', icon: '🌱', name: 'Seed Sower', desc: 'Plant 500 seeds', t: c => c.s.plant >= 500 },
  { id: 's200', icon: '💰', name: 'Market Mover', desc: 'Sell 200 goods', t: c => c.s.sell >= 200 },
  { id: 'w500', icon: '💧', name: 'Rain Maker', desc: 'Water 500 crops', t: c => c.s.water >= 500 },
  { id: 'pl500', icon: '⛏️', name: 'Soil Breaker', desc: 'Plow 500 tiles', t: c => c.s.plow >= 500 },
  { id: 'cu300', icon: '🌿', name: 'Soil Whisperer', desc: 'Cultivate 300 tiles', t: c => c.s.cultivate >= 300 },
  { id: 'fe100', icon: '🧪', name: 'Fertile Ground', desc: 'Fertilize 100 crops', t: c => c.s.fert >= 100 },
  { id: 'an100', icon: '🐔', name: 'Animal Friend', desc: 'Collect 100 animal goods (eggs, wool, milk)', t: c => (c.s.egg || 0) + (c.s.wool || 0) + (c.s.milk || 0) >= 100 },
  { id: 'ck20', icon: '🍳', name: 'Home Cook', desc: 'Cook 20 dishes', t: c => c.s.cook >= 20 },
  { id: 'or10', icon: '📋', name: 'Reliable Neighbor', desc: 'Deliver 10 orders', t: c => c.s.orders >= 10 },
  { id: 'or50', icon: '📦', name: 'Order Master', desc: 'Deliver 50 orders', t: c => c.s.orders >= 50 },
  { id: 'lv5', icon: '⭐', name: 'Rising Farmer', desc: 'Reach level 5', t: c => c.level >= 5 },
  { id: 'lv10', icon: '🌟', name: 'Seasoned Farmer', desc: 'Reach level 10', t: c => c.level >= 10 },
  { id: 'lv25', icon: '💫', name: 'Farm Veteran', desc: 'Reach level 25', t: c => c.level >= 25 },
  { id: 'lv50', icon: '🏆', name: 'Farm Legend', desc: 'Reach level 50', t: c => c.level >= 50 },
  { id: 'f5', icon: '🏞️', name: 'Land Owner', desc: 'Own 5 fields', t: c => c.fields >= 5 },
  { id: 'f10', icon: '🗺️', name: 'Land Baron', desc: 'Own 10 fields', t: c => c.fields >= 10 },
  { id: 'up5', icon: '🔧', name: 'Gearhead', desc: 'Buy 5 tractor upgrades', t: c => Object.keys(c.up).length >= 5 },
  { id: 'c10k', icon: '🪙', name: 'Well Off', desc: 'Hold $10,000', t: c => c.coins >= 10000 },
  { id: 'c100k', icon: '💎', name: 'Farm Tycoon', desc: 'Hold $100,000', t: c => c.coins >= 100000 }
];
