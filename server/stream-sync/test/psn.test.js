"use strict";
/* The PlayStation check must be rationed: one live check per window, database otherwise. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

let presenceCalls = 0, failNext = false;
const psnApiPath = require.resolve("psn-api");
require.cache[psnApiPath] = { id: psnApiPath, filename: psnApiPath, loaded: true, exports: {
    exchangeNpssoForCode: async () => "code",
    exchangeCodeForAccessToken: async () => ({ accessToken: "a", refreshToken: "r", expiresIn: 3600, refreshTokenExpiresIn: 5000000 }),
    exchangeRefreshTokenForAuthTokens: async () => ({ accessToken: "a2", refreshToken: "r2", expiresIn: 3600, refreshTokenExpiresIn: 5000000 }),
    getProfileFromUserName: async () => ({ profile: { accountId: "1" } }),
    getBasicPresence: async () => {
        presenceCalls++;
        if (failNext) throw new Error("429 Too Many Requests");
        return { basicPresence: { primaryPlatformInfo: { onlineStatus: "online" }, gameTitleInfoList: [{ npTitleId: "T", titleName: "Live Game", gameStatus: "Live status" }] } };
    }
} };
const storePath = require.resolve(path.join("..", "lib", "store.js"));
require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: {
    secrets: async () => ({ psn_npsso: "x".repeat(64) }),
    psnAccountId: async () => "1",
    psnCard: async () => ({ online: true, currentGame: "Db Game", gameStatus: "Db status", lastUpdated: "then" })
} };

const psn = require("../lib/psn");

test("one live PSN check per window, reused in between", async () => {
    const a = await psn.snapshot("k", {}, "me", [], true);
    assert.strictEqual(a.source, "psn");
    const calls = presenceCalls;
    const b = await psn.snapshot("k", {}, "me", [], false);
    assert.strictEqual(presenceCalls, calls, "no new PSN call inside the window");
    assert.strictEqual(b.me.status, "Live status");
});

test("psn_poll_minutes 0 never calls PSN", async () => {
    const calls = presenceCalls;
    const s = await psn.snapshot("k2", { psn_poll_minutes: 0 }, "me", [], true);
    assert.strictEqual(presenceCalls, calls);
    assert.deepStrictEqual([s.source, s.me.title, s.me.status], ["firebase", "Db Game", "Db status"]);
});

test("rate-limited -> database, and no retry until the window passes", async () => {
    failNext = true;
    const s = await psn.snapshot("k3", {}, "me", [], true);
    assert.strictEqual(s.source, "firebase");
    const calls = presenceCalls;
    const s2 = await psn.snapshot("k3", {}, "me", [], false);
    assert.strictEqual(presenceCalls, calls);
    assert.strictEqual(s2.source, "firebase");
    failNext = false;
});

test("a failed check keeps the last live status instead of the old database one", async () => {
    failNext = false;
    const a = await psn.snapshot("k4", {}, "me", [], true);
    assert.strictEqual(a.me.status, "Live status");
    failNext = true;
    const b = await psn.snapshot("k4", {}, "me", [], true);
    assert.strictEqual(b.source, "psn");
    assert.strictEqual(b.me.status, "Live status");
    const c = await psn.snapshot("k4", {}, "me", [], false);
    assert.strictEqual(c.me.status, "Live status");
    failNext = false;
});
