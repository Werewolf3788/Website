/* Chat relay: YouTube, TikTok and Kick live chat go out to the other places.
 * Runs only while the Twitch stream is live. Settings: stream_sync.chat
 *   { youtube_channel_id: "UC...", tiktok_username: "name", post_as: "bot" | "streamer" }
 * A message from one place is posted to the others, never back to where it came
 * from. Every line this service posts is remembered for a few minutes, so the
 * copy that YouTube or Kick hands back to us (they both echo what we post) is
 * dropped instead of being sent around again. The streamer, the chat bot and the
 * platform's own account are ignored too, so nothing they type is repeated.
 * Kick messages also arrive through the Kick webhook (see push()).
 * status() reports what each side is doing (and the last send error) so the
 * setup page and /status show why nothing is arriving instead of failing quietly. */
"use strict";

const twitch = require("./twitch");
const kick = require("./kick");
const B = require("./build");

const relays = new Map(); // key -> { yt, tt, queue, timer, ctx, out, ... }
const ECHO_MS = 3 * 60 * 1000;   // how long a line we posted counts as ours

function prefixFor(platform) { return platform === "YouTube" ? "[YT]" : platform === "TikTok" ? "[TT]" : platform === "Kick" ? "[KICK]" : `[${platform}]`; }

/** Where a message can be posted: everything except the place it came from. */
function targetsFor(r, origin) {
    const cfg = r.ctx.cfg || {}, sec = r.ctx.sec || {};
    const can = {
        Twitch: true,
        YouTube: !!(sec.youtube_hook_url && sec.youtube_hook_secret),
        Kick: !!(sec.kick_refresh && cfg.kick_user_id)
    };
    return Object.keys(can).filter((t) => can[t] && t !== origin);
}

async function postYouTube(sec, text) {
    const res = await fetch(sec.youtube_hook_url, {
        method: "POST", redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "youtube_chat", secret: sec.youtube_hook_secret, text })
    });
    const body = (await res.text()).slice(0, 120);
    if (!/^ok/i.test(body)) throw new Error(body || "youtube refused the message");
    return body;
}

async function deliver(r, target, line) {
    const cfg = r.ctx.cfg || {}, sec = r.ctx.sec || {};
    if (target === "Twitch") return twitch.sendChat(r.key, r.ctx.broadcasterId, cfg.bot_login, line, (cfg.chat || {}).post_as);
    if (target === "YouTube") return postYouTube(sec, line);
    if (target === "Kick") return kick.sendChat(r.key, cfg.kick_user_id, line);
    throw new Error("unknown target " + target);
}

/** Send the next queued line. Returns how many places it reached (tests call this directly). */
async function flush(key) {
    const r = relays.get(key);
    if (!r) return 0;
    const job = r.queue.shift();
    if (!job) return 0;
    let sent = 0;
    for (const target of job.targets) {
        try {
            await deliver(r, target, job.line);
            r.sent++;
            r.lastError = null;
            r.out.set(B.echoKey(job.line), Date.now());   // remember it: the copy coming back is dropped
            sent++;
        } catch (e) {
            r.lastError = `${target}: ${e.message}`;        // surfaced in /status and the setup page
            console.warn(`[chat ${key}] ${r.lastError}`);
        }
    }
    return sent;
}

function start(key, ctx) {
    const chatCfg = (ctx.cfg && ctx.cfg.chat) || {};
    if (!chatCfg.youtube_channel_id && !chatCfg.tiktok_username && !(ctx.cfg && ctx.cfg.kick_user_id)) return;
    let r = relays.get(key);
    if (!r) {
        r = { key, yt: null, tt: null, queue: [], timer: null, ctx, sent: 0, dropped: 0, lastError: null, ytState: "off", ttState: "off", out: new Map() };
        r.timer = setInterval(() => { flush(key); }, 1500);
        relays.set(key, r);
    }
    r.ctx = ctx;
    const ignore = new Set([ctx.cfg.bot_login, ctx.cfg.twitch_login, ctx.cfg.kick_login, chatCfg.youtube_channel_title]
        .filter(Boolean).map((s) => String(s).toLowerCase()));

    const relay = (platform, user, text) => {
        if (!text) return;
        const who = String(user || "").trim().toLowerCase();
        if (who && ignore.has(who)) return;                       // the streamer / bot / channel itself
        /* The body of our own copy is exactly the line we posted, so comparing the raw
         * text is what spots an echo (the line we build below would re-prefix it). */
        const fp = B.echoKey(text);
        const at = r.out.get(fp);
        if (at && Date.now() - at < ECHO_MS) { r.dropped++; return; }   // our own copy coming straight back
        const line = `${prefixFor(platform)} ${user || "viewer"}: ${text}`;
        const targets = targetsFor(r, platform);
        if (!targets.length) return;
        if (r.queue.length > 50) r.queue.shift();                 // never pile up forever
        r.queue.push({ line, targets });
    };
    r.relay = relay;
    for (const [fp, at] of r.out) if (Date.now() - at > ECHO_MS) r.out.delete(fp);

    if (chatCfg.youtube_channel_id && !r.yt) {
        r.ytState = "connecting";
        try {
            const { LiveChat } = require("youtube-chat");
            const yt = new LiveChat({ channelId: chatCfg.youtube_channel_id });
            yt.on("start", (id) => { r.ytState = "live"; console.log(`[chat ${key}] YouTube connected ${id}`); });
            yt.on("chat", (c) => relay("YouTube", c.author && c.author.name, (c.message || []).map((m) => m.text || m.emojiText || "").join("")));
            yt.on("end", () => { r.ytState = "ended"; r.yt = null; });
            yt.on("error", (e) => {
                r.ytState = "error: " + (e && e.message ? e.message : String(e));
                console.warn(`[chat ${key}] YouTube: ${r.ytState}`);
                try { yt.stop(); } catch (x) {}
                r.yt = null;
            });
            r.yt = yt;
            yt.start()
                .then((ok) => { if (!ok) { r.yt = null; r.ytState = "no live YouTube video"; } })
                .catch((e) => { r.yt = null; r.ytState = "error: " + e.message; });
        } catch (e) { console.warn(`[chat ${key}] YouTube load: ${e.message}`); r.yt = null; r.ytState = "load error: " + e.message; }
    }

    if (chatCfg.tiktok_username && !r.tt) {
        r.ttState = "connecting";
        try {
            const T = require("tiktok-live-connector");
            const Ctor = T.TikTokLiveConnection || T.WebcastPushConnection || T;
            const tt = new Ctor(chatCfg.tiktok_username, { enableExtendedGiftInfo: false });
            r.tt = tt;
            tt.connect()
                .then((s) => { r.ttState = "live"; console.log(`[chat ${key}] TikTok connected ${s.roomId}`); })
                .catch((e) => { r.tt = null; r.ttState = "error: " + e.message; });
            tt.on("chat", (d) => relay("TikTok", d.nickname || d.uniqueId || (d.user && (d.user.nickname || d.user.uniqueId)), d.comment));
            tt.on("streamEnd", () => { r.ttState = "ended"; try { tt.disconnect(); } catch (x) {} r.tt = null; });
            tt.on("disconnected", () => { r.tt = null; });
        } catch (e) { console.warn(`[chat ${key}] TikTok load: ${e.message}`); r.tt = null; r.ttState = "load error: " + e.message; }
    }
}

/** A chat line from outside (the Kick webhook). Dropped unless the relay is running (= live on Twitch). */
function push(key, platform, user, text) {
    const r = relays.get(key);
    if (!r || !r.relay) return false;
    r.relay(platform, user, text);
    return true;
}

/** Remember a line this service posted somewhere else (the title announcement), so it is not relayed back. */
function remember(key, text) {
    const r = relays.get(key);
    if (r && text) r.out.set(B.echoKey(text), Date.now());
}

function stop(key) {
    const r = relays.get(key);
    if (!r) return;
    try { r.yt && r.yt.stop(); } catch (e) {}
    try { r.tt && r.tt.disconnect(); } catch (e) {}
    clearInterval(r.timer);
    relays.delete(key);
}

function status(key) {
    const r = relays.get(key);
    if (!r) return { youtube: false, tiktok: false, queued: 0, sent: 0, dropped: 0, last_error: null };
    return {
        youtube: !!r.yt, youtube_state: r.ytState,
        tiktok: !!r.tt, tiktok_state: r.ttState,
        queued: r.queue.length, sent: r.sent, dropped: r.dropped, last_error: r.lastError
    };
}

module.exports = { start, stop, status, push, remember, flush };
