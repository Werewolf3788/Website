"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

process.env.STREAM_SYNC_APP_OWNER_KEY = "owner";
const SECRET_B64 = Buffer.from("super-secret-key-bytes").toString("base64");
let secrets = { twitch_ext_client_id: "extcid", twitch_ext_secret: SECRET_B64, twitch_ext_owner_id: "111" };
function fake(rel, exportsObj) { const p = require.resolve(path.join("..", rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj }; }
const helixCalls = [];
fake("lib/store.js", { secrets: async () => secrets });
fake("lib/twitch.js", { helix: async (m, p) => { helixCalls.push(p); return { data: [{ session_id: "s", participants: [{ broadcaster_id: "111" }, { broadcaster_id: "222" }] }] }; } });
const api = require("../lib/extapi");

const sent = [];
global.fetch = async (url, opt) => { sent.push({ url, opt }); return { ok: true, status: 204, json: async () => ({}) }; };

test("signEbs round-trips through verifyViewer", async () => {
    api._reset();
    const jwt = await api.signEbs("999");
    const p = await api.verifyViewer(jwt);
    assert.strictEqual(p.channel_id, "999");
    assert.strictEqual(p.role, "external");
    assert.strictEqual(p.user_id, "111");
    assert.deepStrictEqual(p.pubsub_perms, { send: ["broadcast"] });
});

test("verifyViewer rejects bad signature and expired", async () => {
    api._reset();
    const jwt = await api.signEbs("999");
    const [h, b] = jwt.split(".");
    assert.strictEqual(await api.verifyViewer(h + "." + b + ".AAAA"), null);
    const old = await api.signEbs("999", -120);
    assert.strictEqual(await api.verifyViewer(old), null);
    assert.strictEqual(await api.verifyViewer("garbage"), null);
});

test("pushCard sends broadcast with ebs jwt", async () => {
    api._reset(); sent.length = 0;
    await api.pushCard("999", { v: 1 });
    const c = sent[0];
    assert.strictEqual(c.url, "https://api.twitch.tv/helix/extensions/pubsub");
    assert.strictEqual(c.opt.method, "POST");
    assert.strictEqual(c.opt.headers["Client-Id"], "extcid");
    assert.match(c.opt.headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    const body = JSON.parse(c.opt.body);
    assert.deepStrictEqual(body.target, ["broadcast"]);
    assert.strictEqual(body.broadcaster_id, "999");
    assert.strictEqual(body.is_global_broadcast, false);
    assert.deepStrictEqual(JSON.parse(body.message), { v: 1 });
});

test("saveCard uses broadcaster segment", async () => {
    api._reset(); sent.length = 0;
    await api.saveCard("999", { v: 1 });
    const c = sent[0], body = JSON.parse(c.opt.body);
    assert.strictEqual(c.url, "https://api.twitch.tv/helix/extensions/configurations");
    assert.strictEqual(c.opt.method, "PUT");
    assert.deepStrictEqual([body.extension_id, body.segment, body.broadcaster_id, body.version], ["extcid", "broadcaster", "999", "1"]);
});

test("sharedChatParticipants lists the other channels", async () => {
    assert.deepStrictEqual(await api.sharedChatParticipants("111"), ["222"]);
    assert.match(helixCalls[0], /^\/shared_chat\/session\?broadcaster_id=111$/);
});

test("missing keys throws", async () => {
    api._reset(); const keep = secrets; secrets = {};
    await assert.rejects(api.extKeys(), /twitch_ext keys missing/);
    secrets = keep;
});
