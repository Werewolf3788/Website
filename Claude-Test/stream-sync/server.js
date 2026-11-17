/* ============================================================================
 * ww-stream-sync  (Render web service, root dir Claude-Test/stream-sync)
 *
 * While a site user is live on Twitch it:
 *   - reads their PlayStation game + game status live from PSN
 *   - fixes the Twitch category (no more "Games + Demos"), sets the title to the
 *     game status + @mentions of squad members in the same game, sets tags
 *   - sends the same title to YouTube (through the Apps Script hook) and Kick
 *   - relays YouTube + TikTok chat into Twitch chat as the bot account
 *   - posts one Discord "live" alert per stream
 *
 * Render's free plan sleeps after ~15 min without visits. The Apps Script
 * StreamHook visits /wake every minute while the channel is live, so the
 * service only runs (and only uses free hours) during streams.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT, STREAM_SYNC_APP_OWNER_KEY, PUBLIC_URL, STATE_SECRET
 * Settings and secrets live in Firebase - see README.md.
 * ========================================================================== */
"use strict";

const crypto = require("crypto");
const express = require("express");
const store = require("./lib/store");
const twitch = require("./lib/twitch");
const kick = require("./lib/kick");
const { runUser } = require("./lib/sync");

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
    } catch (e) {
        last = { at: new Date().toISOString(), error: e.message };
        console.warn("[tick] " + e.message);
    } finally { running = false; }
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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function page(title, body) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#0c0a14;color:#e2e8f0;margin:0;padding:24px}main{max-width:760px;margin:auto}
a.b{display:inline-block;margin:6px 8px 6px 0;padding:12px 16px;border-radius:10px;background:#9146ff;color:#fff;text-decoration:none;font-weight:700}
a.k{background:#53fc18;color:#000}code{background:#1e1b2e;padding:2px 6px;border-radius:6px}.card{background:#16131f;border:1px solid #2a2540;border-radius:14px;padding:18px;margin:14px 0}
.ok{color:#34d399}.bad{color:#f87171}</style></head><body><main>${body}</main></body></html>`;
}

const app = express();
app.get("/", (req, res) => res.type("text").send("ww-stream-sync running. Last pass: " + (last.at || "not yet")));
app.get("/health", (req, res) => res.send("ok"));
app.get("/wake", (req, res) => { res.type("text").send("awake"); if (!running) tick(); });
app.get("/status", (req, res) => res.json(last));

app.get("/setup", (req, res) => {
    const cb = (p) => `<code>${esc(PUBLIC_URL + p)}</code>`;
    res.send(page("Stream sync setup", `
<h1>Stream sync setup</h1>
<div class="card"><b>1. Connect your streaming account</b> (needed to change category, title and tags).<br>
Sign in with your <b>main</b> Twitch account (e.g. werewolf3788).<br>
<a class="b" href="/auth/twitch?role=broadcaster">Connect Twitch (streamer)</a></div>
<div class="card"><b>2. Connect your chat bot</b> (posts the YouTube/TikTok chat into Twitch).<br>
Twitch will ask you to sign in: use the <b>bot</b> account (e.g. Modem3788). Log out of your main account on twitch.tv first if it signs you in automatically.<br>
<a class="b" href="/auth/twitch?role=bot">Connect Twitch (bot)</a></div>
<div class="card"><b>3. Optional: connect Kick</b> (title + category on Kick).<br>
<a class="b k" href="/auth/kick">Connect Kick</a></div>
<div class="card"><b>Redirect URLs</b> to add in the developer consoles:<br>
Twitch (dev.twitch.tv &rarr; your app): ${cb("/auth/twitch/callback")}<br>
Kick (kick.com/settings/developer): ${cb("/auth/kick/callback")}</div>
<p>Each account is saved to the site user whose <code>stream_sync</code> settings name that login, so this page is safe to share.</p>`));
});

app.get("/auth/twitch", async (req, res) => {
    const role = req.query.role === "bot" ? "bot" : "broadcaster";
    try { res.redirect(await twitch.authorizeUrl(role, PUBLIC_URL + "/auth/twitch/callback", sign({ p: "twitch", role }))); }
    catch (e) { res.status(500).send(page("Setup error", `<p class="bad">${esc(e.message)}</p>`)); }
});
app.get("/auth/twitch/callback", async (req, res) => {
    const st = verify(req.query.state);
    if (!st || st.p !== "twitch") return res.status(400).send(page("Expired", `<p class="bad">That sign-in link expired. <a href="/setup">Start again</a>.</p>`));
    if (req.query.error) return res.status(400).send(page("Cancelled", `<p class="bad">${esc(req.query.error_description || req.query.error)}</p>`));
    try {
        const { refresh, login } = await twitch.exchangeCode(req.query.code, PUBLIC_URL + "/auth/twitch/callback");
        const field = st.role === "bot" ? "bot_login" : "twitch_login";
        const key = await store.userByLogin(field, login);
        if (!key) return res.status(404).send(page("Not linked", `<p class="bad">Twitch account <b>${esc(login)}</b> isn't set as <code>${field}</code> for any site user, so nothing was saved.</p><p>If you meant the other account, <a href="/setup">start again</a> and sign in with the right one.</p>`));
        await store.saveSecret(key, `twitch_${st.role}_refresh`, refresh);
        twitch.forgetUserToken(key, st.role);
        res.send(page("Connected", `<p class="ok">Connected <b>${esc(login)}</b> as the ${st.role === "bot" ? "chat bot" : "streaming account"}.</p><p><a href="/setup">Back to setup</a></p>`));
    } catch (e) { res.status(500).send(page("Setup error", `<p class="bad">${esc(e.message)}</p>`)); }
});

app.get("/auth/kick", async (req, res) => {
    const c = await kick.creds().catch(() => null);
    if (!c) return res.status(500).send(page("Kick not set up", `<p class="bad">Add <code>kick_client_id</code> and <code>kick_client_secret</code> to the app owner's user_secrets first.</p>`));
    res.redirect(kick.authorizeUrl(c, PUBLIC_URL + "/auth/kick/callback", sign({ p: "kick" })));
});
app.get("/auth/kick/callback", async (req, res) => {
    const st = verify(req.query.state);
    if (!st || st.p !== "kick") return res.status(400).send(page("Expired", `<p class="bad">That sign-in link expired. <a href="/setup">Start again</a>.</p>`));
    try {
        const { refresh, login } = await kick.exchangeCode(req.query.code, PUBLIC_URL + "/auth/kick/callback", req.query.state);
        const key = await store.userByLogin("kick_login", login);
        if (!key) return res.status(404).send(page("Not linked", `<p class="bad">Kick account <b>${esc(login)}</b> isn't set as <code>kick_login</code> for any site user.</p>`));
        await store.saveSecret(key, "kick_refresh", refresh);
        res.send(page("Connected", `<p class="ok">Connected Kick account <b>${esc(login)}</b>.</p><p><a href="/setup">Back to setup</a></p>`));
    } catch (e) { res.status(500).send(page("Setup error", `<p class="bad">${esc(e.message)}</p>`)); }
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
