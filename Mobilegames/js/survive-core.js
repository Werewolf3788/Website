// Tile Survival game rules (no DOM): map, base building, jobs, power, morale, heroes, battles, quests.
(function (root) {
  'use strict';
  var N = 11, C = 5, VERSION = 1, MAX_HELPS = 5, HELP_CUT = .15;
  var RES = { wood: { i: '🪵' }, food: { i: '🍖' }, metal: { i: '🔩' }, gems: { i: '💎' } };
  var BT = {
    powerplant: { n: 'Power Plant', i: '🔌', d: 'Powers your settlement. Every other building can only be upgraded up to its level.', base: { wood: 40, metal: 20 }, time: 12 },
    lumberyard: { n: 'Lumberyard', i: '🪓', d: 'Lumberjacks chop wood. Needs power.', base: { wood: 30 }, time: 8, jobs: 1, job: 'Lumberjacks', out: 'wood', rate: .08, max: 4, tile: 'forest' },
    farm: { n: 'Hunting Lodge', i: '🏹', d: 'Hunters and cooks bring in food. Needs power.', base: { wood: 30 }, time: 8, jobs: 1, job: 'Hunters', out: 'food', rate: .1, max: 4, tile: 'grass' },
    smelter: { n: 'Smelter', i: '🏭', d: 'Smelters turn ore into metal for heroes and upgrades. Needs power.', base: { wood: 60 }, time: 10, jobs: 1, job: 'Smelters', out: 'metal', rate: .04, max: 4, tile: 'ore' },
    house: { n: 'House', i: '🏠', d: 'Shelter for 3 more survivors per level, and better morale.', base: { wood: 40, food: 10 }, time: 8, max: 6, tile: 'grass' }
  };
  var HEROES = {
    sarge: { n: 'Sarge', i: '🪖', role: 'Tank', hp: 120, atk: 12, d: 'Tough veteran who holds the front line.', cost: {} },
    rusty: { n: 'Rusty', i: '🔧', role: 'Damage', hp: 70, atk: 22, d: 'Scrap-built weapons, hits hard, fragile.', cost: { metal: 40 } },
    leila: { n: 'Leila', i: '💉', role: 'Healer', hp: 80, atk: 8, heal: 16, d: 'Patches up the squad every round.', cost: { metal: 100, food: 60 } }
  };
  function hash(x, y, seed) { var h = Math.imul(x + 101, 374761393) ^ Math.imul(y + 211, 668265263) ^ Math.imul(seed | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0); }
  var dist = function (x, y) { return Math.max(Math.abs(x - C), Math.abs(y - C)); };
  function fresh(seed) {
    var st = { v: VERSION, seed: seed | 0, res: { wood: 140, food: 90, metal: 0, gems: 10 }, rev: {}, cleared: {}, bld: [{ id: 'b1', type: 'powerplant', x: C, y: C, lvl: 1, up: null, w: 0 }], nextId: 2, pop: 4, popFrac: 0, morale: 70, heroes: { sarge: { lvl: 1 } }, squad: ['sarge'], boss: {}, stats: { explored: 0, wins: 0, bosses: 0 }, claimed: {}, last: Date.now() };
    [[5, 5], [4, 5], [6, 5], [5, 4], [5, 6]].forEach(function (p) { st.rev[p[0] + ',' + p[1]] = 1; });
    return st;
  }
  function heal(st) { st.res = st.res || {}; ['wood', 'food', 'metal', 'gems'].forEach(function (k) { st.res[k] = +st.res[k] || 0; }); st.rev = st.rev || {}; st.cleared = st.cleared || {}; st.bld = st.bld || []; st.heroes = st.heroes || { sarge: { lvl: 1 } }; st.squad = (st.squad || ['sarge']).filter(function (i) { return st.heroes[i]; }); if (!st.squad.length) st.squad = ['sarge']; st.boss = st.boss || {}; st.stats = st.stats || { explored: 0, wins: 0, bosses: 0 }; st.claimed = st.claimed || {}; st.pop = st.pop | 0 || 4; st.popFrac = st.popFrac || 0; st.morale = isFinite(st.morale) ? st.morale : 70; st.nextId = st.nextId || (st.bld.length + 2); st.bld.forEach(function (b) { b.w = b.w | 0; }); }
  function tileType(st, x, y) {
    var k = x + ',' + y, d = dist(x, y);
    if (d === 0) return 'grass'; if (k === '4,5') return 'forest'; if (k === '6,5') return 'ore'; if (k === '5,4' || k === '5,6') return 'grass';
    var r = hash(x, y, st.seed) % 100, t = r < 40 ? 'grass' : r < 62 ? 'forest' : r < 76 ? 'ore' : r < 90 ? 'enemy' : r < 95 ? 'ruin' : 'boss';
    if (d <= 1 && (t === 'enemy' || t === 'boss' || t === 'ruin')) t = 'grass'; if (t === 'boss' && d < 3) t = 'enemy';
    if (st.cleared[k] && (t === 'enemy' || t === 'ruin')) t = 'grass';
    return t;
  }
  function isEdge(st, x, y) { if (st.rev[x + ',' + y]) return false; return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return st.rev[(x + d[0]) + ',' + (y + d[1])]; }); }
  function bldAt(st, x, y) { for (var i = 0; i < st.bld.length; i++) if (st.bld[i].x === x && st.bld[i].y === y) return st.bld[i]; return null; }
  function bld(st, id) { for (var i = 0; i < st.bld.length; i++) if (st.bld[i].id === id) return st.bld[i]; return null; }
  function canPay(st, c) { return Object.keys(c).every(function (k) { return st.res[k] >= c[k]; }); }
  function pay(st, c) { Object.keys(c).forEach(function (k) { st.res[k] -= c[k]; }); }
  function give(st, c) { Object.keys(c).forEach(function (k) { st.res[k] += c[k]; }); }
  function cost(type, lvl) { var o = {}, f = Math.pow(1.55, lvl - 1); Object.keys(BT[type].base).forEach(function (k) { o[k] = Math.round(BT[type].base[k] * f); }); return o; }
  function buildTime(type, lvl) { return Math.round(BT[type].time * Math.pow(1.5, lvl - 1)); }
  function ppLevel(st) { var p = st.bld.filter(function (b) { return b.type === 'powerplant'; })[0]; return p ? p.lvl : 1; }
  function levelCap(st, b) { return b.type === 'powerplant' ? 20 : ppLevel(st); }
  function builders(st) { var p = ppLevel(st); return 1 + (p >= 5 ? 1 : 0) + (p >= 12 ? 1 : 0); }
  function freeBuilders(st) { return builders(st) - st.bld.filter(function (b) { return b.up; }).length; }
  function slots(b) { return 1 + b.lvl; }
  function idle(st) { return st.pop - st.bld.reduce(function (s, b) { return s + (b.w | 0); }, 0); }
  function capacity(st) { return 4 + st.bld.reduce(function (s, b) { return s + (b.type === 'house' ? 3 * b.lvl : 0); }, 0) + ppLevel(st) * 2; }
  function rates(st) {
    var supply = 12 * ppLevel(st), demand = 0;
    st.bld.forEach(function (b) { if (b.lvl > 0 && BT[b.type].jobs && b.w > 0) demand += 3 * b.lvl; });
    var eff = demand <= supply ? 1 : Math.max(.3, supply / demand), strike = st.morale < 30 ? .3 : 1, r = { wood: 0, food: 0, metal: 0, gems: 0, power: { supply: supply, demand: demand } };
    st.bld.forEach(function (b) { var T = BT[b.type]; if (b.lvl > 0 && T.jobs && b.w > 0) r[T.out] += T.rate * b.lvl * b.w * eff * strike; });
    r.food -= st.pop * .02; return r;
  }
  function tick(st, dt, now) {
    var ev = []; now = now || Date.now();
    st.bld.forEach(function (b) { if (b.up && now >= b.up.end) { b.lvl = b.up.to; ev.push('✅ ' + BT[b.type].n + ' is now level ' + b.lvl); b.up = null; } });
    var r = rates(st); ['wood', 'metal', 'gems'].forEach(function (k) { st.res[k] += r[k] * dt; });
    st.res.food = Math.max(0, st.res.food + r.food * dt);
    var houses = st.bld.reduce(function (s, b) { return s + (b.type === 'house' ? b.lvl : 0); }, 0), target = st.res.food > 0 ? 70 + Math.min(20, houses * 3) : 15;
    st.morale += (target - st.morale) * Math.min(1, dt / 60); st.morale = Math.max(0, Math.min(100, st.morale));
    if (st.pop < capacity(st) && st.res.food > 20 && st.morale > 50) { st.popFrac += dt / 90; while (st.popFrac >= 1 && st.pop < capacity(st)) { st.pop++; st.popFrac--; ev.push('👤 A new survivor joined'); } } else if (st.pop >= capacity(st)) st.popFrac = 0;
    st.last = now; return ev.slice(0, 3);
  }
  function exploreCost(st, x, y) { return { food: 8 + dist(x, y) * 3 }; }
  function explore(st, x, y) { if (!isEdge(st, x, y)) return 'Too far away.'; var c = exploreCost(st, x, y); if (!canPay(st, c)) return 'Not enough food.'; pay(st, c); st.rev[x + ',' + y] = 1; st.stats.explored++; var t = tileType(st, x, y); return 'Cleared the fog: ' + ({ grass: 'open ground', forest: 'a forest', ore: 'an ore deposit', enemy: '🧟 an infected camp!', boss: '👹 a boss lair!', ruin: 'ruins' })[t]; }
  function buildOptions(st, ty) { return Object.keys(BT).filter(function (t) { return t !== 'powerplant' && BT[t].tile === ty; }); }
  function whyNot(st, t) { if (freeBuilders(st) < 1) return 'No builder free'; if (st.bld.filter(function (b) { return b.type === t; }).length >= BT[t].max) return 'Limit reached'; return ''; }
  function build(st, x, y, t) { if (!st.rev[x + ',' + y] || bldAt(st, x, y)) return 'Cannot build there.'; if (buildOptions(st, tileType(st, x, y)).indexOf(t) < 0) return 'Cannot build that here.'; var w = whyNot(st, t); if (w) return w + '.'; var c = cost(t, 1); if (!canPay(st, c)) return 'Not enough resources.'; pay(st, c); var tm = buildTime(t, 1), now = Date.now(); st.bld.push({ id: 'b' + (st.nextId++), type: t, x: x, y: y, lvl: 0, w: 0, up: { to: 1, end: now + tm * 1000, total: tm * 1000, h: {} } }); return '🔨 Building a ' + BT[t].n + '…'; }
  function upgrade(st, id) { var b = bld(st, id); if (!b || b.up) return 'Busy.'; var n = b.lvl + 1; if (n > levelCap(st, b)) return 'Upgrade the Power Plant first.'; if (freeBuilders(st) < 1) return 'No builder free.'; var c = cost(b.type, n); if (!canPay(st, c)) return 'Not enough resources.'; pay(st, c); var tm = buildTime(b.type, n); b.up = { to: n, end: Date.now() + tm * 1000, total: tm * 1000, h: {} }; return '🔨 Upgrading ' + BT[b.type].n + ' to level ' + n; }
  function speedUp(st, id) { var b = bld(st, id); if (!b || !b.up) return ''; if (st.res.gems < 5) return 'Need 5 gems.'; st.res.gems -= 5; b.up.end = Date.now(); return '⚡ Done!'; }
  function setJob(st, id, d) { var b = bld(st, id); if (!b || !BT[b.type].jobs || b.lvl < 1) return; if (d > 0 && (idle(st) < 1 || b.w >= slots(b))) return; if (d < 0 && b.w < 1) return; b.w += d; }
  // ---------- heroes & battles
  function heroStats(st, id) { var H = HEROES[id], l = (st.heroes[id] || { lvl: 1 }).lvl, m = 1 + .18 * (l - 1); return { hp: Math.round(H.hp * m), atk: Math.round(H.atk * m), heal: Math.round((H.heal || 0) * m) }; }
  function heroUpCost(l) { return { food: Math.round(20 * Math.pow(1.4, l - 1)), metal: Math.round(12 * Math.pow(1.4, l - 1)) }; }
  function squad(st) { return st.squad.map(function (i) { return { id: i, lvl: st.heroes[i].lvl }; }); }
  function recruit(st, id) { if (st.heroes[id]) return 'Already recruited.'; var c = HEROES[id].cost; if (!canPay(st, c)) return 'Not enough resources.'; pay(st, c); st.heroes[id] = { lvl: 1 }; if (st.squad.length < 3) st.squad.push(id); return HEROES[id].n + ' joined your squad!'; }
  function heroLevel(st, id) { var h = st.heroes[id]; if (!h || h.lvl >= 30) return ''; var c = heroUpCost(h.lvl); if (!canPay(st, c)) return 'Not enough resources.'; pay(st, c); h.lvl++; return HEROES[id].n + ' is level ' + h.lvl + '!'; }
  function squadToggle(st, id) { var i = st.squad.indexOf(id); if (i >= 0) { if (st.squad.length > 1) st.squad.splice(i, 1); } else if (st.squad.length < 3) st.squad.push(id); else st.squad[2] = id; }
  function enemiesFor(st, x, y) { var d = dist(x, y), ty = tileType(st, x, y); if (ty === 'boss') return [{ n: 'Zombie Boss', hp: 350 + 110 * d, atk: 14 + 4 * d }]; var cnt = 2 + Math.floor(d / 2), a = []; for (var i = 0; i < cnt; i++) a.push({ n: 'Infected', hp: 30 + 14 * d, atk: 4 + 2 * d }); return a; }
  function rewardFor(st, x, y) { var d = dist(x, y), m = tileType(st, x, y) === 'boss' ? 4 : 1, r = { wood: (20 + 10 * d) * m, food: (15 + 6 * d) * m, metal: (5 + 4 * d) * m }; if (m > 1) r.gems = 3; return r; }
  function bossCooldown(st, x, y) { return Math.max(0, (st.boss[x + ',' + y] || 0) - Date.now()); }
  function fight(st, x, y, rnd) {
    rnd = rnd || Math.random; var k = x + ',' + y, ty = tileType(st, x, y), log = [];
    var hs = st.squad.map(function (id, i) { var s = heroStats(st, id); return { n: HEROES[id].n, hp: s.hp, max: s.hp, atk: s.atk, heal: s.heal, front: i < 2 }; }), es = enemiesFor(st, x, y).map(function (e, i) { return { n: e.n + (i ? ' ' + (i + 1) : ''), hp: e.hp, atk: e.atk }; });
    var alive = function (a) { return a.filter(function (u) { return u.hp > 0; }); };
    for (var r = 1; r <= 60 && alive(hs).length && alive(es).length; r++) {
      alive(hs).forEach(function (h) { var foes = alive(es); if (!foes.length) return;
        if (h.heal) { var hurt = alive(hs).filter(function (u) { return u.hp < u.max; }).sort(function (a, b) { return a.hp / a.max - b.hp / b.max; })[0]; if (hurt) { hurt.hp = Math.min(hurt.max, hurt.hp + h.heal); if (log.length < 50) log.push(h.n + ' heals ' + hurt.n + ' (+' + h.heal + ')'); return; } }
        var t = foes[0]; t.hp -= h.atk; if (log.length < 50) log.push(h.n + ' hits ' + t.n + ' for ' + h.atk + (t.hp <= 0 ? ' — down!' : '')); });
      alive(es).forEach(function (e) { var hl = alive(hs); if (!hl.length) return; var fr = hl.filter(function (u) { return u.front; }), pool = fr.length && rnd() < .7 ? fr : hl, t = pool[Math.floor(rnd() * pool.length)]; t.hp -= e.atk; if (log.length < 50) log.push(e.n + ' hits ' + t.n + ' for ' + e.atk + (t.hp <= 0 ? ' — down!' : '')); });
    }
    var win = alive(es).length === 0 && alive(hs).length > 0, reward = null;
    if (win) { reward = rewardFor(st, x, y); give(st, reward); st.stats.wins++; if (ty === 'boss') { st.stats.bosses++; st.boss[k] = Date.now() + 3600000; } else st.cleared[k] = 1; }
    log.push(win ? 'The infected are beaten.' : 'Your squad was overrun and fell back.');
    return { win: win, log: log, reward: reward };
  }
  function loot(st, x, y) { var k = x + ',' + y; if (st.cleared[k]) return 'Nothing left.'; st.cleared[k] = 1; var d = dist(x, y), c = { wood: 25 + 8 * d, metal: 8 + 3 * d, food: 20 + 5 * d }; give(st, c); return '🔍 Found ' + Object.keys(c).map(function (q) { return RES[q].i + c[q]; }).join(' '); }
  // ---------- quests
  function quests(st) {
    var cnt = function (t) { return st.bld.filter(function (b) { return b.type === t && b.lvl > 0; }).length; }, worked = st.bld.reduce(function (s, b) { return s + (b.w | 0); }, 0);
    var L = [
      ['q_lumber', 'Build a Lumberyard (on a forest tile)', cnt('lumberyard'), 1, { wood: 50 }], ['q_jobs', 'Put 3 survivors to work', worked, 3, { wood: 60 }], ['q_pp2', 'Upgrade the Power Plant to level 2', ppLevel(st), 2, { metal: 30 }],
      ['q_x5', 'Clear 5 fog tiles', st.stats.explored, 5, { food: 60 }], ['q_house', 'Build a House', cnt('house'), 1, { wood: 80, gems: 2 }], ['q_smelt', 'Build a Smelter (on an ore tile)', cnt('smelter'), 1, { food: 50, gems: 3 }],
      ['q_rusty', 'Recruit Rusty', st.heroes.rusty ? 1 : 0, 1, { gems: 5 }], ['q_win', 'Defeat an infected camp', st.stats.wins, 1, { metal: 40, gems: 5 }], ['q_pp5', 'Power Plant level 5', ppLevel(st), 5, { gems: 20, metal: 150 }],
      ['q_x25', 'Clear 25 fog tiles', st.stats.explored, 25, { metal: 120, gems: 10 }], ['q_boss', 'Defeat a boss', st.stats.bosses, 1, { gems: 25 }], ['q_leila', 'Recruit Leila', st.heroes.leila ? 1 : 0, 1, { gems: 10 }]
    ];
    return L.map(function (q) { return { id: q[0], t: q[1], p: Math.min(q[2], q[3]), g: q[3], r: q[4], done: q[2] >= q[3], claimed: !!st.claimed[q[0]] }; });
  }
  function claim(st, id) { var q = quests(st).filter(function (x) { return x.id === id; })[0]; if (!q || !q.done || q.claimed) return ''; st.claimed[id] = 1; give(st, q.r); return '🎁 Quest reward claimed!'; }
  var api = { N: N, VERSION: VERSION, MAX_HELPS: MAX_HELPS, HELP_CUT: HELP_CUT, RES: RES, BT: BT, HEROES: HEROES, fresh: fresh, heal: heal, tick: tick, rates: rates, canPay: canPay, ppLevel: ppLevel, capacity: capacity, bldAt: bldAt, bld: bld, tileType: tileType, isEdge: isEdge, exploreCost: exploreCost, explore: explore, enemiesFor: enemiesFor, bossCooldown: bossCooldown, rewardFor: rewardFor, buildOptions: buildOptions, cost: cost, whyNot: whyNot, freeBuilders: freeBuilders, builders: builders, buildTime: buildTime, levelCap: levelCap, build: build, upgrade: upgrade, speedUp: speedUp, setJob: setJob, slots: slots, idle: idle, squad: squad, heroStats: heroStats, heroUpCost: heroUpCost, fight: fight, loot: loot, recruit: recruit, heroLevel: heroLevel, squadToggle: squadToggle, quests: quests, claim: claim };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SurvCore = api;
})(typeof window !== 'undefined' ? window : this);
