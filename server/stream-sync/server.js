/* ============================================================================
 * ww-stream-sync  (Render web service, root dir server/stream-sync)
 *
 * While a site user is live on Twitch it:
 *   - reads their PlayStation game + game status live from PSN
 *   - fixes the Twitch category (no more "Games + Demos"), sets the title to the
 *     game status + @mentions of squad members in the same game, sets tags
 *   - sends the same title to YouTube (through the Apps Script hook) and Kick
 *   - relays YouTube, TikTok and Kick chat into Twitch chat (as the bot or the streamer)
 *   - posts one Discord "live" alert per stream
 *   - runs the Werewolf Twitch extension: builds each paired channel's card and pushes it to viewers
 *
 * Render's free plan sleeps after ~15 min without visits. The Apps Script
 * StreamHook visits /wake every minute while the channel is live (that is what
 * wakes it up). Once awake and live, keepAwake() below also visits itself every
 * 10 min so it stays up for the whole stream even if StreamHook stops. It still
 * sleeps between streams, so it only uses free hours while live.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT, STREAM_SYNC_APP_OWNER_KEY, PUBLIC_URL, STATE_SECRET, SETUP_PAGE_URL (optional)
 * Settings and secrets live in Firebase - see README.md.
 * ========================================================================== */
"use strict";

const crypto = require("crypto");
const express = require("express");
const store = require("./lib/store");
const twitch = require("./lib/twitch");
const kick = require("./lib/kick");
const chat = require("./lib/chat");
const { runUser } = require("./lib/sync");
const { createExtension } = require("./lib/extension");

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const STATE_SECRET = process.env.STATE_SECRET || crypto.randomBytes(32).toString("hex");
const TICK_MS = 30 * 1000;

let last = { at: null, results: {} };
let running = false;

async function tick() {
    if (running) return;
    running = true;
    try {
        const users = await store.enabledUsers();
        const results = {};
        for (const u of users) {
            try { results[u.key] = await runUser(u); }
            catch (e) { results[u.key] = { error: e.message }; console.warn(`[sync ${u.key}] ${e.stack || e.message}`); }
        }
        last = { at: new Date().toISOString(), results };
        await ext.tick();   // Werewolf Twitch extension cards
        keepAwake(Object.values(results).some(r => r && r.live) || await ext.anyLive());
    } catch (e) {
        last = { at: new Date().toISOString(), error: e.message };
        console.warn("[tick] " + e.message);
    } finally { running = false; }
}

/* Keep-awake: Render's free plan sleeps after ~15 min without outside visits, which
 * stopped title/category updates mid-stream whenever StreamHook wasn't running.
 * While anyone is live, visit our own public URL every 10 minutes (that goes through
 * Render's front door, so it counts as a visit). When nobody is live we stop, so the
 * service still sleeps between streams and only uses free hours while streaming. */
const KEEP_AWAKE_MS = 10 * 60 * 1000;
let lastSelfPing = 0;
function keepAwake(anyLive) {
    if (!anyLive || !PUBLIC_URL || Date.now() - lastSelfPing < KEEP_AWAKE_MS) return;
    lastSelfPing = Date.now();
    const url = PUBLIC_URL + "/health?keepalive=1";
    const done = (ok) => { if (!ok) console.warn("[keep-awake] self visit failed"); };
    try {
        if (typeof fetch === "function") fetch(url).then(r => done(r.ok)).catch(() => done(false));
        else require("https").get(url, r => { r.resume(); done(r.statusCode < 400); }).on("error", () => done(false));
    } catch (e) { done(false); }
}

/* First run: give the app owner starter settings (only if they have none). */
async function seedOwner() {
    const owner = process.env.STREAM_SYNC_APP_OWNER_KEY;
    if (!owner) return;
    try {
        if (await store.get("users/" + owner + "/stream_sync")) return;
        const seed = require("./seed-owner.json");
        delete seed._note;
        await store.set("users/" + owner + "/stream_sync", seed);
        console.log("[seed] wrote starter stream_sync settings for " + owner);
    } catch (e) { console.warn("[seed] " + e.message); }
}

/* ---- signed OAuth state ---- */
function sign(obj) {
    const body = Buffer.from(JSON.stringify({ ...obj, t: Date.now(), n: crypto.randomBytes(8).toString("hex") })).toString("base64url");
    return body + "." + crypto.createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
}
function verify(state) {
    const [body, mac] = String(state || "").split(".");
    if (!body || !mac) return null;
    const want = crypto.createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
    if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
    const o = JSON.parse(Buffer.from(body, "base64url").toString());
    return Date.now() - o.t < 15 * 60 * 1000 ? o : null;
}

const app = express();
// Werewolf Twitch extension (lib/extension.js): /ext/register, /ext/pair, /webhooks/twitch-eventsub
const ext = createExtension({ fs: () => store.fs(), store, twitch, extapi: require("./lib/extapi"), publicUrl: PUBLIC_URL });
ext.mount(app);
app.get("/", (req, res) => res.type("text").send("ww-stream-sync running. Last pass: " + (last.at || "not yet")));
app.get("/health", (req, res) => { res.set("Access-Control-Allow-Origin", "*"); res.json({ ok: true }); });
app.get("/wake", (req, res) => { res.type("text").send("awake"); if (!running) tick(); });

/* The last pass, for one user only. The results are keyed by the email-derived user key
 * (raykevin71888_at_gmail_com and so on), so returning all of them listed every user's
 * address, title and chat state to anyone who opened the URL. ?key=<your user key> now
 * returns that one entry, and no key returns nothing about anybody. */
app.get("/status", (req, res) => {
    const key = String(req.query.key || "").trim();
    const mine = key && last.results && last.results[key];
    res.json({ at: last.at || null, results: mine ? { [key]: mine } : {} });
});

/* ---- Setup ----
 * The setup page lives on the website (signed in with the site's Firebase login):
 *   server/stream-sync/setup.html  ->  SETUP_PAGE_URL
 * It saves settings, TikTok/YouTube info and the owner's app keys to Firebase itself.
 * Only the Twitch and Kick sign-ins come through here, because they need the app secret. */
const SETUP_PAGE_URL = process.env.SETUP_PAGE_URL || "https://entertainment-71888.web.app/server/stream-sync/setup";
const BACK_ORIGINS = new Set(["https://entertainment-71888.web.app", "https://entertainment-71888.firebaseapp.com", new URL(SETUP_PAGE_URL).origin]);
function safeBack(u) {
    try { const x = new URL(String(u || "")); return BACK_ORIGINS.has(x.origin) ? x.origin + x.pathname : SETUP_PAGE_URL; }
    catch (e) { return SETUP_PAGE_URL; }
}
function backTo(res, back, params) { res.redirect(back + "?" + new URLSearchParams(params)); }

app.get("/setup", (req, res) => res.redirect(SETUP_PAGE_URL));

/* A Connect click that reaches us as a plain page load (e.g. Render reloading the page while
 * the service was waking up) carries no sign-in - send the person back to try again. */
app.get("/connect/:provider", (req, res) => backTo(res, SETUP_PAGE_URL, { error: "The sync service was just waking up. Click Connect again." }));

/* First connection for a site user: turn the sync on with safe defaults (never overwrites). */
async function ensureDefaults(key) {
    const cur = (await store.get("users/" + key + "/stream_sync")) || {};
    const add = {};
    if (cur.enabled === undefined) add.enabled = true;
    if (cur.update_title === undefined) add.update_title = true;
    if (cur.youtube_mode === undefined) add.youtube_mode = "same";
    if (!cur.chat || cur.chat.post_as === undefined) add["chat/post_as"] = "bot";
    if (Object.keys(add).length) await store.saveSettings(key, add);
}

app.post("/connect/:provider", express.urlencoded({ extended: false, limit: "16kb" }), async (req, res) => {
    const back = safeBack(req.body.back);
    try {
        const { key } = await store.userFromIdToken(req.body.id_token);
        if (req.params.provider === "twitch") {
            const role = req.body.role === "bot" ? "bot" : "broadcaster";
            return res.redirect(await twitch.authorizeUrl(role, PUBLIC_URL + "/auth/twitch/callback", sign({ p: "twitch", role, key, back })));
        }
        if (req.params.provider === "kick") {
            const c = await kick.creds();
            if (!c) return backTo(res, back, { error: "Kick isn't set up yet: the site owner needs to add the Kick app keys." });
            return res.redirect(kick.authorizeUrl(c, PUBLIC_URL + "/auth/kick/callback", sign({ p: "kick", key, back })));
        }
        backTo(res, back, { error: "Unknown sign-in" });
    } catch (e) {
        backTo(res, back, { error: /id token|auth\/|Firebase ID token/i.test(e.message) ? "Your site sign-in expired - refresh the page and try again." : e.message });
    }
});

app.get("/auth/twitch/callback", async (req, res) => {
    const st = verify(req.query.state);
    if (!st || st.p !== "twitch" || !st.key) return res.redirect(SETUP_PAGE_URL + "?error=" + encodeURIComponent("That sign-in link expired. Try again."));
    if (req.query.error) return backTo(res, st.back, { error: req.query.error_description || req.query.error });
    try {
        const { refresh, login } = await twitch.exchangeCode(req.query.code, PUBLIC_URL + "/auth/twitch/callback");
        await store.saveSecret(st.key, `twitch_${st.role}_refresh`, refresh);
        twitch.forgetUserToken(st.key, st.role);
        await store.saveSettings(st.key, st.role === "bot" ? { bot_login: login } : { twitch_login: login });
        if (st.role === "broadcaster") await ensureDefaults(st.key);
        backTo(res, st.back, { connected: st.role === "bot" ? "twitch_bot" : "twitch", as: login || "" });
    } catch (e) { backTo(res, st.back, { error: e.message }); }
});

app.get("/auth/kick/callback", async (req, res) => {
    const st = verify(req.query.state);
    if (!st || st.p !== "kick" || !st.key) return res.redirect(SETUP_PAGE_URL + "?error=" + encodeURIComponent("That sign-in link expired. Try again."));
    if (req.query.error) return backTo(res, st.back, { error: req.query.error_description || req.query.error });
    try {
        const { refresh, login, userId } = await kick.exchangeCode(req.query.code, PUBLIC_URL + "/auth/kick/callback", req.query.state);
        await store.saveSecret(st.key, "kick_refresh", refresh);
        await store.saveSettings(st.key, { kick_login: login || "", kick_user_id: userId || "" });
        kickIds.clear();
        const sub = await kick.ensureChatSubscription(st.key).catch((e) => "chat events not on yet (" + e.message + ")");
        backTo(res, st.back, { connected: "kick", as: login || "", note: "Kick chat: " + sub });
    } catch (e) { backTo(res, st.back, { error: e.message }); }
});

/* ---- Kick chat webhook -> Twitch chat ---- */
const kickIds = new Map(); // kick user id -> site user key
app.post("/webhooks/kick", express.raw({ type: "*/*", limit: "256kb" }), async (req, res) => {
    if (!(await kick.verifyWebhook(req.headers, req.body))) return res.status(401).send("bad signature");
    res.send("ok");
    if (req.headers["kick-event-type"] !== kick.CHAT_EVENT) return;
    try {
        const e = JSON.parse(req.body.toString("utf8"));
        const kid = String((e.broadcaster && e.broadcaster.user_id) || "");
        if (!kickIds.has(kid)) kickIds.set(kid, await store.userByKickId(kid));
        const key = kickIds.get(kid);
        if (!key) return;
        if (!chat.push(key, "Kick", e.sender && e.sender.username, e.content)) tick(); // not running yet (just woke up) - start a pass
    } catch (err) { console.warn("[kick webhook] " + err.message); }
});

if (require.main === module) {
    for (const k of ["FIREBASE_SERVICE_ACCOUNT", "STREAM_SYNC_APP_OWNER_KEY"]) {
        if (!process.env[k]) console.error("Missing env var " + k + " - the service will not sync until it is set.");
    }
    app.listen(PORT, () => console.log("ww-stream-sync listening on " + PORT));
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        seedOwner().finally(() => { tick(); setInterval(tick, TICK_MS); });
    }
}

module.exports = { app, sign, verify };
