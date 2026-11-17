"use strict";
/* End-to-end pass of lib/sync.js with Firebase, Twitch, PSN and YouTube faked. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

function fake(rel, exportsObj) {
    const p = require.resolve(path.join("..", "lib", rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj };
}

const calls = { patch: [], yt: [], state: [], discord: 0 };
let channel = { game_id: "66082", game_name: "Games + Demos", title: "Gun with machine gun", tags: [] };
let presence = {
    me: { online: true, title: "Tom Clancy's Ghost Recon Wildlands", titleId: "CUSA05410_00", status: "Chapter 1 the Past" },
    friends: { OneLIVIDMAN: { online: true, title: "Tom Clancy's Ghost Recon Wildlands", titleId: "CUSA05410_00" }, Darkwing69420: { online: false } }
};

fake("store.js", {
    secrets: async () => ({ youtube_hook_url: "https://hook", youtube_hook_secret: "s", discord_webhook: "https://discord" }),
    state: async () => ({}),
    saveState: async (k, o) => { calls.state.push(o); }
});
fake("twitch.js", {
    userId: async () => "896952944",
    stream: async () => ({ id: "s1", game_name: "Games + Demos", title: "x" }),
    channel: async () => channel,
    categoryByName: async () => [],
    searchCategories: async () => [{ id: "66082", name: "Games + Demos" }, { id: "496000", name: "Tom Clancy's Ghost Recon: Wildlands" }],
    updateChannel: async (k, id, patch) => { calls.patch.push(patch); channel = { ...channel, ...patch }; },
    sendChat: async () => true
});
fake("psn.js", { snapshot: async () => presence });
fake("chat.js", { start: () => {}, stop: () => {}, status: () => ({}) });
fake("kick.js", {});

global.fetch = async (url, opt) => {
    if (url === "https://hook") { calls.yt.push(JSON.parse(opt.body).title); return { text: async () => "ok updated" }; }
    if (url === "https://discord") { calls.discord++; return { ok: true }; }
    throw new Error("unexpected fetch " + url);
};

const { runUser } = require("../lib/sync");
const cfg = { twitch_login: "werewolf3788", bot_login: "modem3788", squad: { OneLIVIDMAN: "raymystyro", Darkwing69420: "terrdog420" }, base_tags: ["English", "friends", "NoDiscNoBuy", "physicalmediaforever"] };

test("first pass fixes category, title, tags, YouTube and sends one Discord alert", async () => {
    const out = await runUser({ key: "k", cfg });
    assert.strictEqual(calls.patch.length, 1);
    assert.deepStrictEqual(calls.patch[0], { game_id: "496000", title: "Chapter 1 the Past w/ @raymystyro", tags: ["English", "friends", "NoDiscNoBuy", "physicalmediaforever"] });
    assert.deepStrictEqual(calls.yt, ["Chapter 1 the Past w/ @raymystyro"]);
    assert.strictEqual(calls.discord, 1);
    assert.deepStrictEqual(out.squad, ["raymystyro"]);
});

test("second pass with nothing changed does nothing", async () => {
    await runUser({ key: "k", cfg });
    assert.strictEqual(calls.patch.length, 1);
    assert.strictEqual(calls.yt.length, 1);
    assert.strictEqual(calls.discord, 1);
});

test("PS5 flips category back to Games + Demos -> corrected again, title left alone", async () => {
    channel = { ...channel, game_id: "66082" };
    await runUser({ key: "k", cfg });
    assert.deepStrictEqual(calls.patch[1], { game_id: "496000" });
});

test("status changes -> new title everywhere", async () => {
    presence = { ...presence, me: { ...presence.me, status: "Chapter 2" } };
    await runUser({ key: "k", cfg });
    assert.deepStrictEqual(calls.patch[2], { title: "Chapter 2 w/ @raymystyro" });
    assert.strictEqual(calls.yt[1], "Chapter 2 w/ @raymystyro");
});
