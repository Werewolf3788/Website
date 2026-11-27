"use strict";
const test = require("node:test");
const assert = require("node:assert");
const W = require("../../../overlay/wm-clock.js");
const MIN = 60000, DAY = 86400000;

test("parseUptime reads decapi text", () => {
    assert.strictEqual(W.parseUptime("1 hour, 5 minutes, 3 seconds"), 3903);
    assert.strictEqual(W.parseUptime("12 minutes, 1 second"), 721);
    assert.strictEqual(W.parseUptime("werewolf3788 is offline"), null);
    assert.strictEqual(W.parseUptime(""), null);
});

function run(steps, pass, start) {
    let st = W.fresh(() => 0), now = start || 1e12, shown = [];
    for (const s of steps) { now += s.dt || MIN; const r = W.step(st, Object.assign({ now, rand: () => 0 }, pass, s)); st = r.state; if (r.show) shown.push([r.show, now]); }
    return { st, shown };
}

test("free overlay shows the watermark after 20 minutes live with 2+ viewers", () => {
    const steps = Array.from({ length: 25 }, () => ({ uptime: 900, viewers: 3 }));
    const r = run(steps, { tier: 0 });
    assert.strictEqual(r.shown.length, 1);
    assert.strictEqual(r.shown[0][0], "wm");
});

test("watermark waits for 2 viewers", () => {
    const r = run(Array.from({ length: 30 }, () => ({ uptime: 900, viewers: 1 })), { tier: 0 });
    assert.strictEqual(r.shown.length, 0);
    assert.ok(r.st.liveSec >= 20 * 60);
});

test("live time carries over a restart and offline time doesn't count", () => {
    let r = run(Array.from({ length: 15 }, () => ({ uptime: 600, viewers: 3 })), { tier: 0 });
    let st = r.st, now = 1e12 + 15 * MIN;
    st = W.step(st, { now: now + 60 * MIN, uptime: null, viewers: 0, tier: 0, rand: () => 0 }).state;   // offline an hour
    let shown = null;
    for (let i = 1; i <= 7 && !shown; i++) { const x = W.step(st, { now: now + 60 * MIN + i * MIN, uptime: 60 * i, viewers: 3, tier: 0, rand: () => 0 }); st = x.state; shown = x.show; }
    assert.strictEqual(shown, "wm", "shows within minutes of the next stream");
});

test("paid tiers never see it", () => {
    for (const tier of [1, 2, 3]) assert.strictEqual(run(Array.from({ length: 60 }, () => ({ uptime: 900, viewers: 9 })), { tier }).shown.length, 0);
});

test("founder and allies get the monthly credit at 5+ minutes with 2+ viewers, not the owner", () => {
    const steps = [{ uptime: 120, viewers: 5 }, { uptime: 290, viewers: 5 }, { uptime: 310, viewers: 5 }, { uptime: 370, viewers: 5 }];
    assert.deepStrictEqual(run(steps, { tier: 1, founder: true }).shown.map((x) => x[0]), ["credit"]);
    assert.deepStrictEqual(run(steps, { tier: 3, ally: true }).shown.map((x) => x[0]), ["credit"]);
    assert.strictEqual(run(steps, { tier: 3, ally: true, owner: true }).shown.length, 0);
    assert.strictEqual(run(steps, { tier: 2 }).shown.length, 0, "regular paid tier: never");
});

test("monthly credit at most once per 30 days", () => {
    let st = W.fresh(() => 0), now = 1e12, n = 0;
    for (let d = 0; d < 45; d++) { now += DAY; const r = W.step(st, { now, uptime: 600, viewers: 4, tier: 1, founder: true, rand: () => 0 }); st = r.state; if (r.show) n++; }
    assert.strictEqual(n, 2);
});

test("non-Twitch channels (no uptime/viewers) still get the watermark on a timer", () => {
    const r = run(Array.from({ length: 25 }, () => ({ uptime: undefined, viewers: undefined })), { tier: 0 });
    assert.strictEqual(r.shown.length, 1);
});
