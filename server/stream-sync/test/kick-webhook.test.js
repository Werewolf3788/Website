"use strict";
/* The Kick webhook signature check, including Kick rotating their public key.
 * Kick's docs say to fetch the key rather than hardcode it, so a failed check must
 * re-fetch once instead of 401-ing every delivery until the process restarts. */
const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const path = require("path");

function fake(rel, exportsObj) {
    const p = require.resolve(path.join("..", rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj };
}

fake("lib/store.js", { secrets: async () => ({}) });

const mk = () => crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

let live = mk();                 // the key Kick is signing with right now
let keyFetches = 0;
global.fetch = async (url) => {
    if (String(url).endsWith("/public/v1/public-key")) {
        keyFetches++;
        return { json: async () => ({ data: { public_key: live.publicKey } }) };
    }
    throw new Error("unexpected fetch " + url);
};

const kick = require("../lib/kick.js");

function delivery(bodyObj, priv) {
    const body = JSON.stringify(bodyObj);
    const id = "01J" + crypto.randomBytes(8).toString("hex"), ts = new Date().toISOString();
    const sig = crypto.createSign("RSA-SHA256").update(`${id}.${ts}.${body}`).sign(priv, "base64");
    return { body, headers: { "kick-event-message-id": id, "kick-event-message-timestamp": ts, "kick-event-signature": sig, "kick-event-type": "chat.message.sent" } };
}

const chat = { broadcaster: { user_id: 777 }, sender: { username: "kickviewer" }, content: "hi" };

test("a delivery signed with Kick's current key verifies", async () => {
    const d = delivery(chat, live.privateKey);
    assert.strictEqual(await kick.verifyWebhook(d.headers, d.body), true);
});

test("after a key rotation the new key is fetched once and the delivery still verifies", async () => {
    const before = keyFetches;
    live = mk();                                        // Kick rotates their key
    const d = delivery(chat, live.privateKey);
    assert.strictEqual(await kick.verifyWebhook(d.headers, d.body), true);
    assert.strictEqual(keyFetches - before, 1);          // re-fetched exactly once

    const rotated = keyFetches;                          // the new key is now cached
    const d2 = delivery({ ...chat, content: "after" }, live.privateKey);
    assert.strictEqual(await kick.verifyWebhook(d2.headers, d2.body), true);
    assert.strictEqual(keyFetches, rotated);             // no further requests to Kick
});

test("a forged signature is still refused, after one re-fetch", async () => {
    const before = keyFetches;
    const d = delivery({ ...chat, content: "forged" }, mk().privateKey);
    assert.strictEqual(await kick.verifyWebhook(d.headers, d.body), false);
    assert.strictEqual(keyFetches - before, 1);
});

test("a delivery with no signature header is refused without asking Kick", async () => {
    const before = keyFetches;
    const d = delivery(chat, live.privateKey);
    delete d.headers["kick-event-signature"];
    assert.strictEqual(await kick.verifyWebhook(d.headers, d.body), false);
    assert.strictEqual(keyFetches, before);
});

test("if Kick's key endpoint is down the delivery is refused, not accepted", async () => {
    live = mk();                                         // force a failed cached check
    const d = delivery(chat, live.privateKey);
    const good = global.fetch;
    global.fetch = async () => { throw new Error("kick unreachable"); };
    try { assert.strictEqual(await kick.verifyWebhook(d.headers, d.body), false); }
    finally { global.fetch = good; }
});
