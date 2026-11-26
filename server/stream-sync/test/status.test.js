"use strict";
/* /status must only ever hand out the caller's own entry. The endpoint is public and
 * the results are keyed by the email-derived user key, so returning the whole object
 * listed every user's address, title and chat state to anyone who asked for it. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

const realFetch = global.fetch;

function fake(rel, exportsObj) {
    const p = require.resolve(path.join("..", rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj };
}

const OWNER = "raykevin71888_at_gmail_com";
const OTHER = "cartnalray9_at_gmail_com";

fake("lib/store.js", {
    enabledUsers: async () => [{ key: OWNER }, { key: OTHER }],
    get: async () => null,
    saveSettings: async () => {}
});
fake("lib/sync.js", { runUser: async (u) => (u.key === OWNER ? { live: true, title: "Ghost of Tsushima" } : { live: false }) });
fake("lib/twitch.js", { sendChat: async () => true });

/* the keep-awake self-ping must not reach the internet during tests */
global.fetch = async (url, opt) => {
    const u = String(url);
    if (u.startsWith("http://127.0.0.1")) return realFetch(u, opt);
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
};

process.env.PUBLIC_URL = "https://ww-stream-sync.onrender.com";
process.env.STATE_SECRET = "test-secret";
delete process.env.FIREBASE_SERVICE_ACCOUNT;                 // so requiring the server never signs in

const { app } = require("../server.js");

let base, server;
test.before(async () => {
    await new Promise((r) => { server = app.listen(0, () => { base = "http://127.0.0.1:" + server.address().port; r(); }); });
});
test.after(() => { server.closeAllConnections(); server.close(); });

async function pass() {
    await realFetch(base + "/wake");                          // starts one pass in the background
    for (let i = 0; i < 60; i++) {
        const j = await (await realFetch(base + "/status?key=" + OWNER)).json();
        if (j.at) return j;
        await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error("no pass finished");
}

test("without a key nothing about anybody comes back", async () => {
    await pass();
    const j = await (await realFetch(base + "/status")).json();
    assert.deepStrictEqual(j.results, {});
});

test("the owner key returns the owner's entry and nobody else's", async () => {
    await pass();
    const j = await (await realFetch(base + "/status?key=" + OWNER)).json();
    assert.deepStrictEqual(Object.keys(j.results), [OWNER]);
    assert.strictEqual(j.results[OWNER].live, true);
    assert.strictEqual(j.results[OTHER], undefined);
});

test("another user's key does not reveal the owner's entry", async () => {
    await pass();
    const j = await (await realFetch(base + "/status?key=" + OTHER)).json();
    assert.deepStrictEqual(Object.keys(j.results), [OTHER]);
    assert.strictEqual(j.results[OWNER], undefined);
});

test("an unknown or blank key comes back empty", async () => {
    await pass();
    assert.deepStrictEqual((await (await realFetch(base + "/status?key=nobody_at_gmail_com")).json()).results, {});
    assert.deepStrictEqual((await (await realFetch(base + "/status?key=%20%20")).json()).results, {});
});
