"use strict";
/* Chat relay with Twitch, Kick and the YouTube hook faked: one message out to the
 * other places, never back to where it came from, and never our own copy again. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

function fake(rel, exportsObj) {
    const p = require.resolve(path.join("..", "lib", rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj };
}

const toTwitch = [], toKick = [], toHook = [];
fake("twitch.js", { sendChat: async (k, b, bot, line) => { toTwitch.push(line); return true; } });
fake("kick.js", { sendChat: async (k, id, text) => { toKick.push(text); return "ok"; } });
global.fetch = async (url, opt) => {
    toHook.push(JSON.parse(opt.body));
    return { text: async () => "ok updated" };
};

const chat = require("../lib/chat");
const cfg = { twitch_login: "werewolf3788", bot_login: "modem3788", kick_login: "werewolfkick", kick_user_id: "123", chat: { youtube_channel_id: "UC123", youtube_channel_title: "Ray's Channel" } };
const sec = { youtube_hook_url: "https://hook", youtube_hook_secret: "s", kick_refresh: "r" };
const ctx = { cfg, broadcasterId: "b1", sec };

test("a YouTube message is posted to Twitch and Kick, never back to YouTube", async () => {
    chat.start("u1", ctx);
    chat.push("u1", "YouTube", "viewer1", "hi there");
    const n = await chat.flush("u1");
    assert.strictEqual(n, 2);
    assert.deepStrictEqual(toTwitch, ["[YT] viewer1: hi there"]);
    assert.deepStrictEqual(toKick, ["[YT] viewer1: hi there"]);
    assert.strictEqual(toHook.length, 0);           // not sent back to YouTube
});

test("the copy YouTube / Kick hand back is dropped instead of bouncing around", async () => {
    const line = "[YT] viewer1: hi there";
    chat.push("u1", "Kick", "someviewer", line);     // same line arriving again (our own copy)
    assert.strictEqual(await chat.flush("u1"), 0);
    assert.strictEqual(toTwitch.length, 1);
    assert.strictEqual(toKick.length, 1);
});

test("the streamer, the bot and the channel itself are never repeated", async () => {
    chat.push("u1", "Kick", "werewolfkick", "hello from kick");
    chat.push("u1", "YouTube", "Modem3788", "hello from the bot");
    chat.push("u1", "YouTube", "Ray's Channel", "hello from me");
    assert.strictEqual(await chat.flush("u1"), 0);
});

test("a different message from Kick goes out to Twitch and YouTube", async () => {
    chat.push("u1", "Kick", "viewer2", "yo");
    const n = await chat.flush("u1");
    assert.strictEqual(n, 2);
    assert.deepStrictEqual(toTwitch.at(-1), "[KICK] viewer2: yo");
    assert.deepStrictEqual(toHook.at(-1).text, "[KICK] viewer2: yo");
    assert.strictEqual(toKick.length, 1);            // not sent back to Kick
});

test("the title announcement is not relayed back from YouTube or Kick", async () => {
    const title = "\u{1F534} Chapter 2";
    chat.remember("u1", title);
    chat.push("u1", "Kick", "viewer3", title);
    assert.strictEqual(await chat.flush("u1"), 0);
    chat.stop("u1");
});
