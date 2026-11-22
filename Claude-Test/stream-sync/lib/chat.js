/* Chat relay: YouTube, TikTok and Kick live chat -> Twitch chat.
 * Runs only while the Twitch stream is live. Settings: stream_sync.chat
 *   { youtube_channel_id: "UC...", tiktok_username: "name", post_as: "bot" | "streamer" }
 * Kick messages arrive through the Kick webhook (see push()). */
"use strict";

const twitch = require("./twitch");

const relays = new Map(); // key -> { yt, tt, queue, timer }

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
        r = { yt: null, tt: null, queue: [], timer: null, ctx };
        r.timer = setInterval(async () => {
            const line = r.queue.shift();
            if (!line) return;
            try { await twitch.sendChat(key, r.ctx.broadcasterId, r.ctx.cfg.bot_login, line, (r.ctx.cfg.chat || {}).post_as); }
            catch (e) { console.warn(`[chat ${key}] send failed: ${e.message}`); }
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
        try {
            const { LiveChat } = require("youtube-chat");
            const yt = new LiveChat({ channelId: chatCfg.youtube_channel_id });
            yt.on("start", (id) => console.log(`[chat ${key}] YouTube connected ${id}`));
            yt.on("chat", (c) => relay("YouTube", c.author && c.author.name, (c.message || []).map((m) => m.text || m.emojiText || "").join("")));
            yt.on("end", () => { r.yt = null; });
            yt.on("error", (e) => { console.warn(`[chat ${key}] YouTube: ${e && e.message ? e.message : e}`); try { yt.stop(); } catch (x) {} r.yt = null; });
            r.yt = yt;
            yt.start().then((ok) => { if (!ok) r.yt = null; }).catch(() => { r.yt = null; });
        } catch (e) { console.warn(`[chat ${key}] YouTube load: ${e.message}`); r.yt = null; }
    }

    if (chatCfg.tiktok_username && !r.tt) {
        try {
            const T = require("tiktok-live-connector");
            const Ctor = T.TikTokLiveConnection || T.WebcastPushConnection || T;
            const tt = new Ctor(chatCfg.tiktok_username, { enableExtendedGiftInfo: false });
            r.tt = tt;
            tt.connect().then((s) => console.log(`[chat ${key}] TikTok connected ${s.roomId}`)).catch(() => { r.tt = null; });
            tt.on("chat", (d) => relay("TikTok", d.nickname || d.uniqueId || (d.user && (d.user.nickname || d.user.uniqueId)), d.comment));
            tt.on("streamEnd", () => { try { tt.disconnect(); } catch (x) {} r.tt = null; });
            tt.on("disconnected", () => { r.tt = null; });
        } catch (e) { console.warn(`[chat ${key}] TikTok load: ${e.message}`); r.tt = null; }
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
    return r ? { youtube: !!r.yt, tiktok: !!r.tt, queued: r.queue.length } : { youtube: false, tiktok: false, queued: 0 };
}

module.exports = { start, stop, status, push };
