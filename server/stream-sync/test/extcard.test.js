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
