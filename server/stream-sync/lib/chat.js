/* Chat relay: YouTube, TikTok and Kick live chat -> Twitch chat.
 * Runs only while the Twitch stream is live. Settings: stream_sync.chat
 *   { youtube_channel_id: "UC...", tiktok_username: "name", post_as: "bot" | "streamer" }
 * Kick messages arrive through the Kick webhook (see push()).
 * status() reports what each side is doing (and the last send error) so the
 * setup page and /status show why nothing is arriving instead of failing quietly. */
"use strict";

const twitch = require("./twitch");

const relays = new Map(); // key -> { yt, tt, queue, timer, ctx, ... }

function prefixFor(platform) { return platform === "YouTube" ? "[YT]" : platform === "TikTok" ? "[TT]" : platform === "Kick" ? "[KICK]" : `[${platform}]`; }

function enqueue(r, line) {
    if (r.queue.length > 50) r.queue.shift();      // never pile up forever
    r.queue.push(line);
}

function start(key, ctx) {
    const chatCfg = ctx.cfg.chat || {};
    if (!chatCfg.youtube_channel_id && !chatCfg.tiktok_username && !ctx.cfg.kick_user_id) return;
    let r = relays.get(key);
    if (!r) {
        r = { yt: null, tt: null, queue: [], timer: null, ctx, sent: 0, lastError: null, ytState: "off", ttState: "off" };
        r.timer = setInterval(async () => {
            const line = r.queue.shift();
            if (!line) return;
            try {
                await twitch.sendChat(key, r.ctx.broadcasterId, r.ctx.cfg.bot_login, line, (r.ctx.cfg.chat || {}).post_as);
                r.sent++;
                r.lastError = null;
            } catch (e) {
                r.lastError = e.message;               // surfaced in /status and the setup page
                console.warn(`[chat ${key}] send failed: ${e.message}`);
            }
        }, 1500);
        relays.set(key, r);
    }
    r.ctx = ctx;
    const ignore = new Set([ctx.cfg.bot_login, ctx.cfg.twitch_login].filter(Boolean).map((s) => String(s).toLowerCase()));
    const relay = (platform, user, text) => {
        if (!text || ignore.has(String(user || "").toLowerCase())) return;
        enqueue(r, `${prefixFor(platform)} ${user || "viewer"}: ${text}`);
    };
    r.relay = relay;

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
    if (!r) return { youtube: false, tiktok: false, queued: 0, sent: 0, last_error: null };
    return {
        youtube: !!r.yt, youtube_state: r.ytState,
        tiktok: !!r.tt, tiktok_state: r.ttState,
        queued: r.queue.length, sent: r.sent, last_error: r.lastError
    };
}

module.exports = { start, stop, status, push };
