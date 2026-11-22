"use strict";
const test = require("node:test");
const assert = require("node:assert");
const B = require("../lib/build");

test("Wildlands PSN name matches the Twitch category, not Games + Demos", () => {
    const list = [
        { id: "66082", name: "Games + Demos" },
        { id: "496000", name: "Tom Clancy's Ghost Recon: Wildlands" },
        { id: "512710", name: "Tom Clancy's Ghost Recon Breakpoint" }
    ];
    const pick = B.pickCategory("Tom Clancy's Ghost Recon® Wildlands", list, {});
    assert.strictEqual(pick.id, "496000");
});

test("no confident match returns null", () => {
    assert.strictEqual(B.pickCategory("Some Tiny Indie Game", [{ id: "1", name: "Just Chatting" }], {}), null);
});

test("override wins", () => {
    const list = [{ id: "1", name: "Far Cry 5" }, { id: "2", name: "Far Cry New Dawn" }];
    assert.strictEqual(B.pickCategory("FAR CRY® 5 Gold Edition", list, { "Far Cry 5 Gold Edition": "Far Cry New Dawn" }).id, "2");
});

test("presence parsing", () => {
    const p = B.readPresence({ basicPresence: { primaryPlatformInfo: { onlineStatus: "online", platform: "PS5" },
        gameTitleInfoList: [{ npTitleId: "CUSA05410_00", titleName: "Tom Clancy's Ghost Recon® Wildlands", gameStatus: "Chapter 1 the Past" }] } });
    assert.deepStrictEqual([p.online, p.title, p.status], [true, "Tom Clancy's Ghost Recon Wildlands", "Chapter 1 the Past"]);
    assert.strictEqual(B.readPresence({ basicPresence: { primaryPlatformInfo: { onlineStatus: "offline" } } }).online, false);
});

test("squad tagging only for friends in the same game", () => {
    const me = { online: true, title: "Wildlands", titleId: "CUSA05410_00" };
    const friends = {
        OneLIVIDMAN: { online: true, title: "Wildlands", titleId: "CUSA05410_00" },
        Darkwing69420: { online: true, title: "Far Cry 5", titleId: "X" }
    };
    assert.deepStrictEqual(B.squadInGame(me, { OneLIVIDMAN: "raymystyro", Darkwing69420: "terrdog420" }, friends), ["raymystyro"]);
});

test("titles", () => {
    assert.strictEqual(B.buildTitle({ status: "Chapter 1 the Past", game: "Wildlands" }), "Chapter 1 the Past");
    assert.strictEqual(B.buildTitle({ status: "", game: "Wildlands", mentions: ["raymystyro", "terrdog420"] }), "Wildlands w/ @raymystyro @terrdog420");
    const long = B.buildTitle({ status: "x".repeat(200), game: "g", mentions: ["raymystyro"] });
    assert.ok(long.length <= 140 && long.endsWith(" w/ @raymystyro"));
    const six = B.buildTitle({ status: "Mission", game: "g", mentions: ["aaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbb", "ccccccccccccccccccccccccc", "dddddddddddddddddddddddd"] });
    assert.ok(six.length <= 140 && six.includes("+3"));
    assert.strictEqual(B.buildTitle({ status: "Ch 1", game: "g", base: "Creating fun", max: 100 }), "Creating fun | Ch 1");
});

test("tags follow Twitch rules", () => {
    assert.deepStrictEqual(B.cleanTags(["English", "friends", "No Disc No Buy!", "english", ""]), ["English", "friends", "NoDiscNoBuy"]);
    assert.strictEqual(B.cleanTags(Array.from({ length: 15 }, (_, i) => "t" + i)).length, 10);
});

test("email key matches database rules", () => {
    assert.strictEqual(B.emailKey("RayKevin71888@gmail.com"), "raykevin71888_at_gmail_com");
});

test("OAuth state signing", () => {
    const { sign, verify } = require("../server");
    const s = sign({ p: "twitch", role: "bot" });
    assert.strictEqual(verify(s).role, "bot");
    assert.strictEqual(verify(s.replace(/.$/, (c) => (c === "A" ? "B" : "A"))), null);
});

test("title formats", () => {
    const a = { status: "Chapter 2", game: "Ghost Recon® Wildlands", mentions: ["ray"] };
    assert.strictEqual(B.buildTitle({ ...a }), "Chapter 2 w/ @ray");
    assert.strictEqual(B.buildTitle({ ...a, format: "game_status" }), "Ghost Recon Wildlands - Chapter 2 w/ @ray");
    assert.strictEqual(B.buildTitle({ ...a, format: "game" }), "Ghost Recon Wildlands w/ @ray");
    assert.strictEqual(B.buildTitle({ ...a, status: "", format: "game_status" }), "Ghost Recon Wildlands w/ @ray");
});
