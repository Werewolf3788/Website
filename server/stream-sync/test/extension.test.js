"use strict";
const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const express = require("express");
const { createExtension } = require("../lib/extension");

const DAY = 86400000, OWNER = "owner";
process.env.STREAM_SYNC_APP_OWNER_KEY = OWNER;

// ---- fakes ----
function fakeFs(seed) {
    const s = Object.assign({}, seed), counts = { sets: {}, reads: {} };
    const clone = (d) => JSON.parse(JSON.stringify(d));
    const ref = (p) => ({ id: p.split("/").pop(), path: p,
        get: async () => ({ exists: p in s, id: p.split("/").pop(), data: () => clone(s[p]) }),
        set: async (d, o) => { counts.sets[p] = (counts.sets[p] || 0) + 1; s[p] = o && o.merge ? Object.assign({}, s[p] || {}, clone(d)) : clone(d); },
        collection: (c) => col(p + "/" + c) });
    const col = (c) => { const q = (f) => ({ where: (k, op, v) => q(f.concat([[k, v]])), limit: () => q(f), get: async () => (counts.reads[c] = (counts.reads[c] || 0) + 1, { docs: Object.keys(s).filter((p) => p.startsWith(c + "/") && p.split("/").length === c.split("/").length + 1 && f.every(([k, v]) => s[p][k] === v)).map((p) => ({ id: p.split("/").pop(), data: () => clone(s[p]) })) }) });
        return Object.assign({ doc: (id) => ref(c + "/" + id) }, q([])); };
    return { fs: () => ({ collection: col }), s, counts };
}
function setup(opts) {
    opts = opts || {};
    const F = fakeFs(opts.fs || {});
    const rtdb = Object.assign({ "users/kev/friend_code": "KEV1", "users/kev/psn_username": "wildhorse_spirit", "users/kev/twitch_username": "werewolf3788",
        "users/kev/friends": { RAY1: {} }, "accounts/friend_codes/RAY1": "ray", "users/ray/psn_username": "OneLIVIDMAN", "users/ray/twitch_username": "raymystyro",
        ["users/" + OWNER + "/friends"]: { KEV1: {} } }, opts.rtdb || {});
    const secrets = {};
    const t0 = opts.now || 1e12;
    const st = { now: t0, viewers: opts.viewers == null ? 5 : opts.viewers, startedAt: opts.startedAt || t0 - 600000, live: opts.live !== false, fail: false, title: "Ghost Recon Wildlands" };
    const pushes = [], saves = [];
    const twitch = {
        stream: async (id) => { st.streamCalls = (st.streamCalls || 0) + 1; if (st.fail) throw new Error("twitch down"); return st.live ? { user_id: id, started_at: new Date(st.startedAt).toISOString(), viewer_count: st.viewers, game_name: "Tom Clancy's Ghost Recon Wildlands", game_id: "g1", title: "Hunting bosses" } : null; },
        channel: async () => ({ title: "Hunting bosses", game_name: "Tom Clancy's Ghost Recon Wildlands", game_id: "g1" }),
        helix: async (m, p) => {
            if (st.fail) throw new Error("twitch down");
            if (p.startsWith("/users")) return { data: [{ id: "x", login: p.includes("111") ? "werewolf3788" : (st.login || "streamer"), display_name: "Streamer", profile_image_url: "https://cdn/av.png" }] };
            if (p.startsWith("/games")) return { data: [{ box_art_url: "https://cdn/box-{width}x{height}.jpg" }] };
            if (p.startsWith("/eventsub")) return { data: [{ id: "sub" + Math.random() }] };
            return {};
        }
    };
    const extapi = {
        extKeys: async () => ({ clientId: "c", ownerId: "111" }),
        verifyViewer: async (t) => (t === "bcast" ? { role: "broadcaster", channel_id: "999" } : t === "viewer" ? { role: "viewer", channel_id: "999" } : null),
        pushCard: async (cid, card) => { pushes.push({ cid, card }); }, saveCard: async (cid, card) => { saves.push({ cid, card }); },
        sharedChatParticipants: async () => opts.shared || []
    };
    const store = {
        get: async (p) => rtdb[p] == null ? null : rtdb[p], secrets: async () => secrets, saveSecret: async (k, f, v) => { secrets[f] = v; },
        userFromIdToken: async (t) => { if (t === "ownertok") return { key: OWNER }; if (t !== "kevtok") throw new Error("bad"); return { key: "kev" }; },
        psnCard: async (tag) => { if (st.psnDown) throw new Error("psn db down"); return ({ wildhorse_spirit: { online: true, currentGame: st.title, gameStatus: "Hunting El Pozolero", currentGameArt: "https://psn/art.png" }, OneLIVIDMAN: { online: true, currentGame: opts.rayGame || "Ghost Recon Wildlands", currentGameArt: "https://psn/ray.png" } })[tag] || null; }
    };
    const ext = createExtension({ fs: F.fs, store, twitch, extapi, now: () => st.now, rand: () => (opts.rand == null ? 0.5 : opts.rand), publicUrl: "https://sync.example" });
    const app = express(); ext.mount(app);
    const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
    return { ext, F, st, pushes, saves, secrets, srv, base, rtdb,
        post: (p, b, hdr) => fetch(base + p, { method: "POST", headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, hdr || {}), body: new URLSearchParams(b || {}) }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) })),
        get: (p) => fetch(base + p).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) })) };
}
const close = (h) => h.srv.close();

test("register needs a broadcaster token", async () => {
    const h = setup();
    try {
        assert.strictEqual((await h.post("/ext/register", {}, { Authorization: "Bearer viewer" })).s, 403);
        assert.strictEqual((await h.post("/ext/register", {}, { Authorization: "Bearer nope" })).s, 401);
    } finally { close(h); }
});

test("register without pairing gives twitch-only card", async () => {
    const h = setup();
    try {
        const r = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.match(r.j.pairCode, /^WOLF-[A-HJ-NP-Z2-9]{8}$/);
        assert.strictEqual(r.j.paired, false);
        const last = h.pushes.at(-1).card;
        assert.strictEqual(last.me.source, "twitch");
        assert.strictEqual(last.me.tracker, null);
        assert.ok(last.wm, "free tier carries the watermark");
        assert.strictEqual(h.saves.length, h.pushes.length);
        const again = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.strictEqual(again.j.pairCode, r.j.pairCode, "same code on every visit");
    } finally { close(h); }
});

test("pair links friend code and psn", async () => {
    const h = setup();
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.strictEqual((await h.get("/ext/pair/" + j.pairCode)).j.paired, false);
        assert.strictEqual((await h.post("/ext/pair", { code: j.pairCode, idToken: "bad" })).s, 401);
        const r = await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        assert.strictEqual(r.j.paired, true);
        const doc = h.F.s["ext_channels/999"];
        assert.deepStrictEqual([doc.userKey, doc.friendCode, doc.psnOnlineId], ["kev", "KEV1", "wildhorse_spirit"]);
        assert.strictEqual((await h.get("/ext/pair/WOLF-0000")).s, 404);
    } finally { close(h); }
});

test("ally owner friend gets tier 3: psn first and same-title friend becomes ally", async () => {
    const h = setup();
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        h.st.now += 61000; await h.ext.tick();
        const c = h.pushes.at(-1).card;
        assert.strictEqual(c.me.source, "psn");
        assert.strictEqual(c.me.poster, "https://psn/art.png");
        assert.deepStrictEqual(c.allies.map((a) => a.login), ["raymystyro"]);
        assert.strictEqual(c.wmAt, null, "tier 3 has no 20-40 min watermark");
    } finally { close(h); }
});

test("different title is not an ally", async () => {
    const h = setup({ rayGame: "Far Cry 5" });
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        h.st.now += 61000; await h.ext.tick();
        assert.deepStrictEqual(h.pushes.at(-1).card.allies, []);
    } finally { close(h); }
});

test("unchanged card not pushed again within 10 min", async () => {
    const h = setup();
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        const n = h.pushes.length;
        h.st.now += 61000; await h.ext.tick();
        assert.strictEqual(h.pushes.length, n);
        h.st.now += 10 * 60000; await h.ext.tick();
        assert.strictEqual(h.pushes.length, n + 1, "heartbeat");
    } finally { close(h); }
});

test("api failure keeps last card", async () => {
    const h = setup();
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        const before = JSON.stringify(h.F.s["ext_channels/999"].lastCard), n = h.pushes.length;
        h.st.fail = true; h.st.now += 11 * 60000;
        await assert.doesNotReject(h.ext.tick());
        assert.strictEqual(h.pushes.length, n);
        assert.strictEqual(JSON.stringify(h.F.s["ext_channels/999"].lastCard), before);
    } finally { close(h); }
});

test("watermark target is 20-40 min", () => {
    const { wmTarget } = require("../lib/extension");
    assert.strictEqual(wmTarget(() => 0), 1200);
    assert.strictEqual(wmTarget(() => 0.999999), 2400);
});

test("watermark waits for 2 viewers", async () => {
    const h = setup({ viewers: 1, rand: 0 });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        for (let i = 0; i < 25; i++) { h.st.now += 60000; await h.ext.tick(); }
        assert.strictEqual(h.F.s["ext_channels/999"].wmAt || null, null);
        h.st.viewers = 2; h.st.now += 60000; await h.ext.tick();
        assert.strictEqual(h.pushes.at(-1).card.wmAt, h.st.now);
        assert.strictEqual(h.F.s["ext_channels/999"].wmLiveSec, 0);
    } finally { close(h); }
});

test("watermark live time carries over a restart", async () => {
    const h = setup({ rand: 0 });   // target 20 min
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        for (let i = 0; i < 15; i++) { h.st.now += 60000; await h.ext.tick(); }
        h.st.live = false; h.st.now += 60000; await h.ext.tick();               // stream ends at ~15 min
        assert.ok(h.F.s["ext_channels/999"].wmLiveSec >= 15 * 60 - 1);
        h.st.now += 3600000; h.st.live = true; h.st.startedAt = h.st.now;       // an hour later: new stream
        for (let i = 0; i < 6 && !h.F.s["ext_channels/999"].wmAt; i++) { h.st.now += 60000; await h.ext.tick(); }
        assert.ok(h.F.s["ext_channels/999"].wmAt, "shows within minutes of the next stream");
    } finally { close(h); }
});

test("founder credit waits for 5 min uptime and 2 viewers, at most once per 30 days", async () => {
    const h = setup({ fs: { "overlay_pro/streamer": { tiers: { 1: { lifetime: true, founder: true } } } }, viewers: 3 });
    try {
        h.st.startedAt = h.st.now;   // just went live
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.strictEqual(h.pushes.at(-1).card.credit, null, "not before 5 min");
        h.st.now += 6 * 60000; await h.ext.tick();
        const c = h.pushes.at(-1).card;
        assert.deepStrictEqual(c.credit, { at: h.st.now });
        const at = h.st.now;
        h.st.now += 10 * DAY; h.st.startedAt = h.st.now - 600000; await h.ext.tick();
        assert.strictEqual(h.F.s["ext_channels/999"].lastCreditAt, at);
        assert.strictEqual(h.pushes.at(-1).card.credit, null);
        h.st.now += 21 * DAY; h.st.startedAt = h.st.now - 600000; await h.ext.tick();
        assert.strictEqual(h.F.s["ext_channels/999"].lastCreditAt, h.st.now);
    } finally { close(h); }
});

test("eventsub: bad signature 403, verification echoes challenge, stream.online marks live and pushes", async () => {
    const h = setup({ live: false });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        const secret = h.secrets.twitch_eventsub_secret;
        assert.ok(secret && secret.length >= 20, "secret generated and saved to the Key Vault");
        const send = (body, type, sec) => {
            const raw = JSON.stringify(body), id = "m" + Math.random(), ts = new Date().toISOString();
            const sig = "sha256=" + crypto.createHmac("sha256", sec || secret).update(id + ts + raw).digest("hex");
            return fetch(h.base + "/webhooks/twitch-eventsub", { method: "POST", headers: { "Content-Type": "application/json", "Twitch-Eventsub-Message-Id": id, "Twitch-Eventsub-Message-Timestamp": ts, "Twitch-Eventsub-Message-Signature": sig, "Twitch-Eventsub-Message-Type": type }, body: raw })
                .then(async (r) => ({ s: r.status, t: await r.text() }));
        };
        assert.strictEqual((await send({}, "notification", "wrong")).s, 403);
        assert.strictEqual((await send({ challenge: "abc123" }, "webhook_callback_verification")).t, "abc123");
        const n = h.pushes.length; h.st.live = true;
        const r = await send({ subscription: { type: "stream.online" }, event: { broadcaster_user_id: "999", started_at: new Date(h.st.now).toISOString() } }, "notification");
        assert.strictEqual(r.s, 200);
        await new Promise((ok) => setTimeout(ok, 50));
        assert.strictEqual(h.F.s["ext_channels/999"].live, true);
        assert.ok(h.pushes.length > n);
    } finally { close(h); }
});

test("pair code is long and works once", async () => {
    const h = setup();
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.match(j.pairCode, /^WOLF-[A-HJ-NP-Z2-9]{8}$/);
        assert.strictEqual((await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" })).j.paired, true);
        assert.strictEqual((await h.post("/ext/pair", { code: j.pairCode })).s, 404, "used code is dead");
        const again = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        assert.notStrictEqual(again.j.pairCode, j.pairCode);
        assert.strictEqual(again.j.paired, true);
    } finally { close(h); }
});

test("pair lookups are rate limited", async () => {
    const h = setup();
    try {
        const codes = []; for (let i = 0; i < 40; i++) codes.push((await h.get("/ext/pair/WOLF-ABCDEFGH")).s);
        assert.ok(codes.includes(429));
    } finally { close(h); }
});

test("founder credit is pushed even right after another push", async () => {
    const h = setup({ fs: { "overlay_pro/streamer": { tiers: { 1: { lifetime: true, founder: true } } } }, viewers: 3 });
    try {
        h.st.startedAt = h.st.now - 294000;   // 4.9 min live
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        h.st.now += 30000; await h.ext.tick();   // 5.4 min, only 30 s after the last push
        assert.ok(h.pushes.some((p) => p.card.credit), "credit went out");
    } finally { close(h); }
});

test("login follows a Twitch rename", async () => {
    const h = setup({ fs: { "overlay_pro/newname": { tiers: { 1: { until: 2e12 } } } } });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        h.st.login = "newname"; h.ext._forget();
        h.st.now += 11 * 60000; await h.ext.tick();
        assert.strictEqual(h.F.s["ext_channels/999"].login, "newname");
        assert.strictEqual(h.pushes.at(-1).card.wm, null, "paid under the new name: no watermark");
    } finally { close(h); }
});

test("offline channels are checked at most every 5 minutes and unchanged channels aren't rewritten", async () => {
    const h = setup({ live: false });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        const calls = h.st.streamCalls, sets = h.F.counts.sets["ext_channels/999"];
        h.st.now += 61000; await h.ext.tick();
        assert.strictEqual(h.st.streamCalls, calls, "offline: not checked a minute later");
        h.st.now += 5 * 60000; await h.ext.tick();
        assert.strictEqual(h.st.streamCalls, calls + 1);
        assert.strictEqual(h.F.counts.sets["ext_channels/999"], sets, "nothing changed: no write");
    } finally { close(h); }
});

test("tick runs at most once a minute", async () => {
    const h = setup();
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        h.st.now += 61000; await h.ext.tick(); const c = h.st.streamCalls;
        h.st.now += 30000; await h.ext.tick();
        assert.strictEqual(h.st.streamCalls, c);
    } finally { close(h); }
});

test("view more leaves out games with no progress", async () => {
    const h = setup({ fs: { "user/KEV1/platform/playstation/game/wildlands": { name: "Wildlands", level: 28 }, "user/KEV1/platform/steam/game/Blender": { gameId: "Blender", platform: "steam" } } });
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        const a = await h.get("/ext/more/999");
        assert.deepStrictEqual(a.j.games.map((g) => g.name), ["Wildlands"]);
        assert.deepStrictEqual(a.j.games[0].facts, ["Level 28"]);
    } finally { close(h); }
});

test("view more is served from the server cache", async () => {
    const h = setup({ fs: { "user/KEV1/platform/playstation/game/wildlands": { name: "Wildlands", level: 28 } } });
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        const before = h.F.counts.reads["user/KEV1/platform/playstation/game"] || 0;
        const a = await h.get("/ext/more/999"), b = await h.get("/ext/more/999");
        assert.strictEqual(a.j.games[0].name, "Wildlands");
        assert.deepStrictEqual(a.j, b.j);
        assert.ok((h.F.counts.reads["user/KEV1/platform/playstation/game"] || 0) - before <= 1, "Firestore read at most once for many viewers");
        assert.strictEqual((await h.get("/ext/more/123")).s, 404);
    } finally { close(h); }
});

test("psn outage keeps the last card", async () => {
    const h = setup();
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });
        h.st.now += 61000; await h.ext.tick();
        const n = h.pushes.length, last = JSON.stringify(h.F.s["ext_channels/999"].lastCard);
        h.st.psnDown = true; h.ext._forget(); h.st.now += 11 * 60000; await h.ext.tick();
        assert.strictEqual(h.pushes.length, n);
        assert.strictEqual(JSON.stringify(h.F.s["ext_channels/999"].lastCard), last);
    } finally { close(h); }
});

test("allies get the monthly credit, the owner's own channel never does", async () => {
    const h = setup();
    try {
        const { j } = await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await h.post("/ext/pair", { code: j.pairCode, idToken: "kevtok" });   // kev is on the owner's friends list
        h.st.now += 61000; await h.ext.tick();
        assert.ok(h.pushes.some((p) => p.card.credit), "ally channel shows the credit");
    } finally { close(h); }
    const o = setup({ rtdb: { "users/owner/friend_code": "OWN1", "users/owner/psn_username": "wildhorse_spirit", "users/owner/friends": { KEV1: {} } } });
    try {
        const { j } = await o.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        await o.post("/ext/pair", { code: j.pairCode, idToken: "ownertok" });
        o.st.now += 61000; await o.ext.tick();
        assert.ok(!o.pushes.some((p) => p.card.credit), "owner's channel never shows it");
    } finally { close(o); }
});

test("mark endpoint gives the browser overlay the same watermark moment as the extension", async () => {
    const h = setup({ rand: 0 });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        for (let i = 0; i < 25 && !h.F.s["ext_channels/999"].wmAt; i++) { h.st.now += 60000; await h.ext.tick(); }
        const at = h.F.s["ext_channels/999"].wmAt;
        assert.ok(at);
        const m = await h.get("/ext/mark/streamer");
        assert.strictEqual(m.s, 200);
        assert.strictEqual(m.j.wmAt, at);
        assert.strictEqual(m.j.wmAt, h.pushes.at(-1).card.wmAt, "same moment the extension got");
        assert.strictEqual((await h.get("/ext/mark/nobody_here")).s, 404, "overlay-only streamers use their own timer");
    } finally { close(h); }
});

test("mark endpoint reports a fresh founder credit", async () => {
    const h = setup({ fs: { "overlay_pro/streamer": { tiers: { 1: { lifetime: true, founder: true } } } }, viewers: 3 });
    try {
        await h.post("/ext/register", {}, { Authorization: "Bearer bcast" });
        const m = await h.get("/ext/mark/streamer");
        assert.strictEqual(m.j.creditAt, h.F.s["ext_channels/999"].lastCreditAt);
    } finally { close(h); }
});
