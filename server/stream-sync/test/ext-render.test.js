"use strict";
const test = require("node:test");
const assert = require("node:assert");
const R = require("../../../overlay/extension/ext-render.js");

const card = {
    v: 1, at: 1, live: true, startedAt: 1,
    me: { name: "werewolf3788", login: "werewolf3788", avatar: "https://cdn/av.png", game: "Ghost Recon Wildlands", status: "Hunting bosses", poster: "https://psn/art.png", source: "psn",
        tracker: { code: "TLWWTSNU", games: [{ id: "wildlands", name: "Wildlands", platform: "playstation", summary: ["Level 28", "Rebel ops 31/62"] }] } },
    allies: [{ name: "Ray", login: "raymystyro", avatar: "", game: "Ghost Recon Wildlands", poster: "https://psn/ray.png", tracker: null },
        { name: "TJ", login: "terrdog420", avatar: "", game: "Wildlands", poster: "https://psn/tj.png", tracker: null }],
    wm: null, wmAt: null, credit: null, foot: "Track your own games at entertainment-71888.web.app"
};

test("renderCard shows streamer on right and allies carousel", () => {
    const h = R.renderCard(card, { allyIndex: 1 });
    assert.match(h, /class="ww-me"/);
    assert.match(h, /class="ww-allies"/);
    assert.ok(h.indexOf("ww-allies") < h.indexOf("ww-me"), "allies (left) come before the streamer (right)");
    assert.match(h, /2\/2/);
    assert.match(h, /TJ/);
    assert.doesNotMatch(h, />Ray</, "only the current ally is shown");
    assert.match(h, /Level 28/);
    assert.match(h, /data-more="TLWWTSNU"/);
    assert.match(h, /Track your own games at entertainment-71888\.web\.app/);
});

test("renderCard escapes titles", () => {
    const bad = JSON.parse(JSON.stringify(card));
    bad.me.status = '<img src=x onerror="alert(1)">';
    bad.me.poster = "javascript:alert(1)";
    const h = R.renderCard(bad, {});
    assert.doesNotMatch(h, /<img src=x/);
    assert.match(h, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.doesNotMatch(h, /javascript:/);
});

test("no allies panel when there are none", () => {
    assert.doesNotMatch(R.renderCard(Object.assign({}, card, { allies: [] }), {}), /ww-allies/);
});

test("no watermark markup when card.wm null", () => {
    assert.strictEqual(R.renderMark(card), "");
    const m = R.renderMark(Object.assign({}, card, { wm: { img: "https://cdn/k.png", name: "werewolf3788", secs: 10, opacity: 0.75 } }));
    assert.match(m, /Overlay by <b>werewolf3788<\/b>/);
    assert.match(m, /opacity:0\.75/);
    assert.match(m, /href="https:\/\/entertainment-71888\.web\.app\/overlay-studio#extension"/);
});

test("creditSpot never centre or bottom 12%", () => {
    let seed = 1; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 10000; i++) {
        const { x, y } = R.creditSpot(rand, 1000, 1000);
        assert.ok(x >= 0 && x <= 1000 && y >= 0, "inside");
        assert.ok(y <= 880, "above the player controls: " + y);
        const centre = x > 180 && x < 820 && y > 180 && y < 820;
        assert.ok(!centre, "never the centre: " + x + "," + y);
    }
});

test("shows watermark once per wmAt", () => {
    const seen = new Set();
    assert.strictEqual(R.shouldShowMark(null, 5000, seen), false);
    assert.strictEqual(R.shouldShowMark(5000, 5500, seen), true);
    seen.add(5000);
    assert.strictEqual(R.shouldShowMark(5000, 6000, seen), false);
    assert.strictEqual(R.shouldShowMark(9000, 9000 + 61000, new Set()), false, "too old (joined after it)");
});

test("mobile render stacks", () => {
    const h = R.renderCard(card, { mobile: true });
    assert.match(h, /ww-card ww-mobile/);
});

test("renderMore lists every game from Firestore", () => {
    const docs = R.parseFirestoreDocs({ documents: [
        { name: "projects/p/databases/(default)/documents/user/C/platform/playstation/game/wildlands", fields: { name: { stringValue: "Wildlands" }, level: { integerValue: "28" }, skill_points: { integerValue: "14" } } },
        { name: "projects/p/databases/(default)/documents/user/C/platform/playstation/game/fc5", fields: { title: { stringValue: "Far Cry 5" }, done: { booleanValue: true } } }] });
    assert.deepStrictEqual(docs.map((d) => d.name), ["Wildlands", "Far Cry 5"]);
    const h = R.renderMore(docs);
    assert.match(h, /Wildlands/); assert.match(h, /level: 28/); assert.match(h, /Far Cry 5/);
});
