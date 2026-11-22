"use strict";
/* Setup sign-ins, Kick chat webhook and the "post chat as" switch, with Firebase/Twitch faked. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const crypto = require("crypto");

function fake(rel, exportsObj) {
    const p = require.resolve(path.join("..", rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj };
}

const saved = { secrets: [], settings: [], sent: [] };
fake("lib/store.js", {
    userFromIdToken: async (t) => { if (t !== "good") throw new Error("Firebase ID token has invalid signature"); return { key: "fan_at_gmail_com" }; },
    saveSecret: async (k, f, v) => saved.secrets.push([k, f, v]),
    saveSettings: async (k, o) => saved.settings.push([k, o]),
    get: async () => null,
    userByKickId: async (id) => (id === "777" ? "fan_at_gmail_com" : null),
    enabledUsers: async () => []
});
fake("lib/twitch.js", {
    authorizeUrl: async (role, redirect, state) => "https://id.twitch.tv/oauth2/authorize?role=" + role + "&state=" + encodeURIComponent(state),
    exchangeCode: async () => ({ refresh: "R1", login: "fanstreamer" }),
    forgetUserToken: () => {},
    sendChat: async (key, bid, bot, msg, postAs) => { saved.sent.push({ msg, postAs }); return true; }
});

/* Kick: real verifyWebhook with a test key pair in place of Kick's public key */
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const realFetch = global.fetch;
global.fetch = async (url, opt) => {
    if (String(url).endsWith("/public/v1/public-key")) return { json: async () => ({ data: { public_key: publicKey } }) };
    return realFetch(url, opt);
};

process.env.PUBLIC_URL = "https://ww-stream-sync.onrender.com";
process.env.STATE_SECRET = "test-secret";
const { app, sign } = require("../server.js");
const chat = require("../lib/chat.js");

let base, server;
test.before(async () => { await new Promise((r) => { server = app.listen(0, () => { base = "http://127.0.0.1:" + server.address().port; r(); }); }); });
test.after(() => { server.closeAllConnections(); server.close(); });

const post = (p, form) => realFetch(base + p, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });

test("connect with an expired site sign-in goes back to the setup page with a message", async () => {
    const r = await post("/connect/twitch", { id_token: "bad", role: "broadcaster", back: "https://entertainment-71888.web.app/Claude-Test/stream-sync/setup" });
    assert.strictEqual(r.status, 302);
    assert.match(r.headers.get("location"), /^https:\/\/entertainment-71888\.web\.app\/Claude-Test\/stream-sync\/setup\?error=.*sign-in\+expired/);
});

test("connect sends the signed-in user to Twitch; a foreign back link is replaced", async () => {
    const r = await post("/connect/twitch", { id_token: "good", role: "bot", back: "https://evil.example/steal" });
    const loc = r.headers.get("location");
    assert.match(loc, /^https:\/\/id\.twitch\.tv\/oauth2\/authorize\?role=bot/);
    const state = decodeURIComponent(loc.split("state=")[1]);
    const o = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString());
    assert.strictEqual(o.key, "fan_at_gmail_com");
    assert.strictEqual(o.back, "https://entertainment-71888.web.app/Claude-Test/stream-sync/setup");
});

test("Twitch callback saves the login to the user who started it, then returns to the page", async () => {
    const state = sign({ p: "twitch", role: "broadcaster", key: "fan_at_gmail_com", back: "https://entertainment-71888.web.app/Claude-Test/stream-sync/setup" });
    const r = await realFetch(base + "/auth/twitch/callback?code=c&state=" + encodeURIComponent(state), { redirect: "manual" });
    assert.match(r.headers.get("location"), /connected=twitch&as=fanstreamer/);
    assert.deepStrictEqual(saved.secrets.at(-1), ["fan_at_gmail_com", "twitch_broadcaster_refresh", "R1"]);
    assert.deepStrictEqual(saved.settings[0], ["fan_at_gmail_com", { twitch_login: "fanstreamer" }]);
});

function kickSigned(bodyObj) {
    const body = JSON.stringify(bodyObj), id = "m1", ts = new Date().toISOString();
    const sig = crypto.createSign("RSA-SHA256").update(`${id}.${ts}.${body}`).sign(privateKey, "base64");
    return { body, headers: { "Content-Type": "application/json", "Kick-Event-Message-Id": id, "Kick-Event-Message-Timestamp": ts, "Kick-Event-Signature": sig, "Kick-Event-Type": "chat.message.sent" } };
}

test("Kick webhook: forged messages are refused", async () => {
    const k = kickSigned({ broadcaster: { user_id: 777 }, sender: { username: "x" }, content: "hi" });
    const r = await realFetch(base + "/webhooks/kick", { method: "POST", headers: { ...k.headers, "Kick-Event-Signature": "AAAA" }, body: k.body });
    assert.strictEqual(r.status, 401);
});

test("Kick chat reaches Twitch while live, posted as the streamer when that's picked", async () => {
    chat.start("fan_at_gmail_com", { broadcasterId: "1", cfg: { twitch_login: "fanstreamer", bot_login: "fanbot", kick_user_id: "777", chat: { post_as: "streamer" } } });
    const k = kickSigned({ broadcaster: { user_id: 777 }, sender: { username: "kickviewer" }, content: "hello from kick" });
    const r = await realFetch(base + "/webhooks/kick", { method: "POST", headers: k.headers, body: k.body });
    assert.strictEqual(r.status, 200);
    await new Promise((res) => setTimeout(res, 1700));
    chat.stop("fan_at_gmail_com");
    assert.deepStrictEqual(saved.sent, [{ msg: "[KICK] kickviewer: hello from kick", postAs: "streamer" }]);
});

test("a Connect that arrives as a plain page load goes back to the page with a retry message", async () => {
    const r = await realFetch(base + "/connect/twitch", { redirect: "manual" });
    assert.strictEqual(r.status, 302);
    assert.match(r.headers.get("location"), /setup\?error=.*waking\+up/);
});

test("/health answers the setup page (CORS) once awake", async () => {
    const r = await realFetch(base + "/health");
    assert.strictEqual(r.headers.get("access-control-allow-origin"), "*");
    assert.deepStrictEqual(await r.json(), { ok: true });
});
