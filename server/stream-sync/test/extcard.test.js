"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { buildCard, cardSize, sameCard, effectiveTier, FOOT } = require("../lib/extcard");

const tw = { login: "werewolf3788", display: "werewolf3788", avatar: "https://cdn/av.png", title: "Hunting Santa Blanca bosses", gameName: "Tom Clancy's Ghost Recon Wildlands", gameBoxArt: "https://cdn/box-{width}x{height}.jpg" };
const psn = { title: "Ghost Recon Wildlands", status: "Hunting El Pozolero", poster: "https://psn/poster.png" };
const tracker = { code: "TLWWTSNU", games: [{ id: "wildlands", name: "Wildlands", platform: "playstation", summary: ["Level 28", "Rebel ops 31/62"] }] };
const allyPsn = { login: "raymystyro", display: "Ray", avatar: "a", title: "Ghost Recon Wildlands", poster: "p", via: "psn", tracker: { code: "RAY", games: [] } };
const allyShared = { login: "terrdog420", display: "TJ", avatar: "a", title: "Wildlands", poster: "p", via: "shared", tracker: null };
const wm = { img: "https://cdn/kevin.png", name: "werewolf3788" };
const base = (o) => Object.assign({ tier: 3, founder: false, live: true, startedAt: 1000, twitch: tw, psn, tracker, allies: [allyPsn, allyShared], watermark: wm, wmAt: null, creditAt: null }, o);

test("psn first then twitch", () => {
    const c = buildCard(base());
    assert.strictEqual(c.me.source, "psn");
    assert.strictEqual(c.me.game, "Ghost Recon Wildlands");
    assert.strictEqual(c.me.status, "Hunting El Pozolero");
    assert.strictEqual(c.me.poster, "https://psn/poster.png");
    const t2 = buildCard(base({ tier: 2 }));
    assert.strictEqual(t2.me.source, "twitch", "tier 2 never shows PlayStation");
});

test("twitch fallback uses box art and stream title", () => {
    const c = buildCard(base({ psn: null }));
    assert.strictEqual(c.me.source, "twitch");
    assert.strictEqual(c.me.game, "Tom Clancy's Ghost Recon Wildlands");
    assert.strictEqual(c.me.status, "Hunting Santa Blanca bosses");
    assert.strictEqual(c.me.poster, "https://cdn/box-285x380.jpg");
});

test("non-game category uses avatar", () => {
    const c = buildCard(base({ psn: null, twitch: Object.assign({}, tw, { gameName: "Just Chatting" }) }));
    assert.strictEqual(c.me.source, "avatar");
    assert.strictEqual(c.me.poster, "https://cdn/av.png");
});

test("offline shows avatar and tracker", () => {
    const c = buildCard(base({ live: false, startedAt: null }));
    assert.strictEqual(c.live, false);
    assert.strictEqual(c.me.poster, "https://cdn/av.png");
    assert.strictEqual(c.me.status, "Offline");
    assert.ok(c.me.tracker);
    assert.strictEqual(c.startedAt, null);
});

test("tier gating", () => {
    for (const t of [0, 1]) {
        const c = buildCard(base({ tier: t }));
        assert.strictEqual(c.me.tracker, null);
        assert.deepStrictEqual(c.allies, []);
    }
    const t2 = buildCard(base({ tier: 2 }));
    assert.ok(t2.me.tracker);
    assert.deepStrictEqual(t2.allies.map((a) => a.login), ["terrdog420"]);
    const t3 = buildCard(base({ tier: 3 }));
    assert.deepStrictEqual(t3.allies.map((a) => a.login).sort(), ["raymystyro", "terrdog420"]);
});

test("free tier has watermark, paid has none", () => {
    const free = buildCard(base({ tier: 0, wmAt: 5000 }));
    assert.deepStrictEqual(free.wm, { img: wm.img, name: "werewolf3788", secs: 10, opacity: 0.75 });
    assert.strictEqual(free.wmAt, 5000);
    const paid = buildCard(base({ tier: 1, wmAt: 5000 }));
    assert.strictEqual(paid.wm, null);
    assert.strictEqual(paid.wmAt, null);
});

test("founder gets credit only when showCredit", () => {
    assert.strictEqual(buildCard(base({ tier: 1, founder: true })).credit, null);
    const c = buildCard(base({ tier: 1, founder: true, creditAt: 9000 }));
    assert.deepStrictEqual(c.credit, { at: 9000 });
    assert.ok(c.wm, "credit needs the picture and name");
    assert.strictEqual(buildCard(base({ tier: 1, founder: false, creditAt: 9000 })).credit, null);
});

test("card stays under 5KB", () => {
    const long = "x".repeat(300);
    const big = Array.from({ length: 6 }, (_, i) => ({ login: "ally" + i, display: long, avatar: "https://cdn/" + long, title: long, poster: "https://cdn/" + long, via: "shared",
        tracker: { code: "C" + i, games: Array.from({ length: 8 }, (_, g) => ({ id: "g" + g, name: long, platform: "playstation", summary: [long, long, long, long, long] })) } }));
    const c = buildCard(base({ allies: big, twitch: Object.assign({}, tw, { title: long }), tracker: { code: "T", games: big[0].tracker.games } }));
    assert.ok(cardSize(c) <= 5120, "size " + cardSize(c));
    assert.ok(c.allies.length >= 3, "allies kept, trimmed instead");
});

test("sameCard ignores timestamp", () => {
    const a = buildCard(base()), b = Object.assign({}, buildCard(base()), { at: a.at + 999 });
    assert.ok(sameCard(a, b));
    assert.ok(!sameCard(a, buildCard(base({ psn: null }))));
});

test("footer line", () => {
    assert.strictEqual(buildCard(base()).foot, FOOT);
    assert.strictEqual(FOOT, "Track your own games at entertainment-71888.web.app");
});

test("effectiveTier matches the pass server", () => {
    const now = 1e12;
    assert.strictEqual(effectiveTier({ tiers: { 1: { until: now + 1 }, 3: { until: now - 1 } } }, now, false).tier, 1);
    assert.strictEqual(effectiveTier({ until: now + 1 }, now, false).tier, 1);
    assert.strictEqual(effectiveTier(null, now, true).tier, 3);
    assert.strictEqual(effectiveTier({ tiers: { 2: { lifetime: true, founder: true } } }, now, false).founder, true);
});

const { trackerEntry, prettyName } = require("../lib/extcard");
test("tracker names read like game names", () => {
    assert.strictEqual(prettyName("FarCry5", {}), "Far Cry 5");
    assert.strictEqual(prettyName("CODBlackOpsII", {}), "COD Black Ops II");
    assert.strictEqual(prettyName("theHunterCalloftheWildTM", {}), "The Hunter Callofthe Wild");
    assert.strictEqual(prettyName("x", { name: "Ghost Recon Wildlands" }), "Ghost Recon Wildlands");
});
test("tracker shows trophies and stats, not save data", () => {
    assert.deepStrictEqual(trackerEntry("FarCry5", "playstation", { "trophies earned": 27, "trophies percent": 37, "trophies total": 73 }).facts, ["Trophies 27/73 (37%)"]);
    assert.deepStrictEqual(trackerEntry("SniperEliteResistance", "steam", { campaignRankSource: "psn", gameId: "SniperEliteResistance", carrySlots: 6, platform: "steam", campaignRank: 40, trophies_earned: 28, trophies_percent: 39, trophies_total: 71 }).facts, ["Trophies 28/71 (39%)", "Campaign rank 40"]);
    const b = trackerEntry("bastion", "mobile", { v: 2, cash: 21390.416768531268, autoFuse: "yes", best: 36, totalKills: 6442, seenVersion: "1.1.2", rev: 798, by: "vywygurc" });
    assert.strictEqual(b.name, "Bastion");
    assert.deepStrictEqual(b.facts, ["Cash 21,390", "Best 36", "Total kills 6,442"]);
});
test("games with no progress are left out", () => {
    assert.strictEqual(trackerEntry("Blender", "steam", {}), null);
    assert.strictEqual(trackerEntry("SniperElite4", "steam", { carrySlots: 6, "trophies percent": 0, platform: "steam", "trophies total": 0, gameId: "SniperElite4", "trophies earned": 0 }), null);
    assert.strictEqual(trackerEntry("survive3", "mobile", { saveAt: 1795508575997 }), null);
    assert.strictEqual(trackerEntry("tycoon", "mobile", { save: '{"played":1,"updatedAt":1795680276656}', saveAt: 1795680276656 }), null);
    assert.strictEqual(trackerEntry("survive3_prev", "mobile", { best: 5 }), null);
});

const { cleanLook } = require("../lib/extcard");
test("overlay look is copied safely onto the card", () => {
    const l = cleanLook({ accent: "#ff5f1f", accent2: "#FFD700", panel: "#0b0b10", text: "#ffffff", font: "Orbitron", panelOpacity: 82, radius: 12, glow: true, channel: "x" });
    assert.deepStrictEqual(l, { accent: "#ff5f1f", accent2: "#ffd700", panel: "#0b0b10", text: "#ffffff", font: "Orbitron", panelOpacity: 82, radius: 12, glow: true });
    assert.deepStrictEqual(cleanLook({ accent: "red;}body{x", font: "Comic</style>", panelOpacity: 500, radius: -4 }), { panelOpacity: 100, radius: 0, glow: false });
    assert.strictEqual(cleanLook(null), null);
    assert.strictEqual(cleanLook("{\"accent\":\"#112233\"}").accent, "#112233");
    const c = buildCard(base({ look: cleanLook({ accent: "#112233" }) }));
    assert.strictEqual(c.look.accent, "#112233");
});

test("game companion progress: collectibles, missions, medals", () => {
    const v = { gameId: "TomClancysGhostReconWildlands", platform: "ps", trophies_earned: 12, trophies_total: 60, trophies_percent: 20,
        ranks: { collectibles: 3, skill_level: 28 }, campaignRank: 40,
        collectibles: { medals__rebel: { quest_name: "Rebel ops", total: 3, items: { a: { collected: true }, b: { collected: true }, c: { collected: false } } },
            skills: { items: { s1: { collected: true }, s2: { collected: false } } } },
        missions: { m1: { completed: true }, m2: { completed: false }, m3: { completed: true } },
        medals: { x: { earned: true }, y: { earned: false } }, wallet: { credits: 0, level: 1 } };
    const e = trackerEntry("TomClancysGhostReconWildlands", "ps", v);
    assert.strictEqual(e.name, "Tom Clancys Ghost Recon Wildlands");
    assert.deepStrictEqual(e.facts.slice(0, 5), ["Trophies 12/60 (20%)", "Collectibles 3/5", "Missions 2/3", "Medals 1/2", "Campaign rank 40"]);
    assert.ok(e.facts.includes("Skill level 28"));
    assert.ok(!e.facts.includes("Rebel ops 2/3"), "per-group lines left out (too busy)");
    // a tracker that was opened but nothing done yet is still "no progress"
    assert.strictEqual(trackerEntry("Halfdead", "ps", { collectibles: { g: { items: { a: { collected: false } } } }, missions: { m1: { completed: false } }, ranks: { collectibles: 0 } }), null);
});

test("overlay layout (logo, now playing, poster, title) is copied safely", () => {
    const l = cleanLook({ accent: "#112233", layout: { brand: { on: true, pos: "br", name: "Wolf<b>", tag: "x" }, game: { on: true, pos: "br", prefix: "Now playing" }, poster: { on: true, pos: "bl", size: 900 }, title: { on: false, pos: "zz" }, chat: { on: true } } });
    assert.deepStrictEqual(l.layout, { brand: { on: true, pos: "br", name: "Wolf<b>", tag: "x" }, game: { on: true, pos: "br", prefix: "Now playing" }, poster: { on: true, pos: "bl", size: 200 }, title: { on: false, pos: "tl" } });
    const c = buildCard(base({}));
    assert.strictEqual(c.me.title, tw.title, "the stream title rides along for the overlay layer");
});

test("game profile (Wildlands style) comes from the game's tracker file", () => {
    const def = { name: "Tom Clancy's Ghost Recon Wildlands", title: "My Wildlands profile", groups: [{ name: "Combat", fields: [{ id: "longshot", name: "Longest shot", unit: " m" }, { id: "favweapon", name: "Favorite weapon", unit: "" }, { id: "precision", name: "Precision", unit: "%" }] }] };
    const e = trackerEntry("wildlands", "ps", { wallet: { level: 26, pf_longshot: "307", pf_favweapon: "MP7 Cartel" }, collectibles: { m1__x: { quest_name: "Mission 1 — x", items: { a: { collected: true } } } } }, def);
    assert.strictEqual(e.name, "Tom Clancy's Ghost Recon Wildlands");
    assert.deepStrictEqual(e.profile, { title: "Wildlands profile", level: 26, groups: [{ name: "Combat", rows: [["Longest shot", "307 m"], ["Favorite weapon", "MP7 Cartel"]] }] });
    assert.ok(!e.facts.some((f) => /Mission 1/.test(f)), "no per-mission collectible lines");
});
