/* One pass for one site user: if they're live on Twitch, read their PlayStation
 * game + status (and their squad's), then fix the Twitch category, title and
 * tags, and push the title to YouTube (via Apps Script) and Kick. */
"use strict";

const store = require("./store");
const twitch = require("./twitch");
const kick = require("./kick");
const psn = require("./psn");
const chat = require("./chat");
const B = require("./build");

const mem = new Map(); // key -> per-stream memory (what we already applied)
const twitchCats = new Map(); // normName(psn title) -> {id,name} | null
const kickCats = new Map();

function log(key, msg) { console.log(`[sync ${key}] ${msg}`); }

async function twitchCategory(title, overrides) {
    const k = B.normName(title) + "|" + JSON.stringify(B.overrideFor(title, overrides) || "");
    if (twitchCats.has(k)) return twitchCats.get(k);
    const term = B.searchTermFor(title, overrides);
    let list = await twitch.categoryByName(term).catch(() => []);
    if (!list.length) list = await twitch.searchCategories(term).catch(() => []);
    if (!list.length && term !== B.cleanName(title)) list = await twitch.searchCategories(B.cleanName(title)).catch(() => []);
    let pick = B.pickCategory(title, list, overrides);
    if (!pick && list.length && B.overrideFor(title, overrides)) pick = { id: String(list[0].id), name: list[0].name, score: 1 };
    twitchCats.set(k, pick || null);
    return pick || null;
}

async function kickCategory(key, title, overrides) {
    const k = B.normName(title);
    if (kickCats.has(k)) return kickCats.get(k);
    const list = await kick.searchCategories(key, B.searchTermFor(title, overrides)).catch(() => []);
    const pick = B.pickCategory(title, list, overrides);
    if (list.length) kickCats.set(k, pick || null);
    return pick || null;
}

async function discordLiveAlert(key, sec, cfg, s, gameName) {
    if (!sec.discord_webhook || cfg.discord_live_alert === false) return;
    const url = "https://twitch.tv/" + cfg.twitch_login;
    const art = s.thumbnail_url ? s.thumbnail_url.replace("{width}", "640").replace("{height}", "360") + "?t=" + Date.now() : null;
    await fetch(sec.discord_webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: "Stream Alert",
            content: cfg.discord_message || `\u{1F534} ${cfg.twitch_login} is live! ${url}`,
            embeds: [{ title: s.title || "Live on Twitch", url, description: `**Playing:** ${gameName || s.game_name || "?"}`, color: 9520895, image: art ? { url: art } : undefined, timestamp: new Date().toISOString() }]
        })
    }).catch((e) => log(key, "Discord alert failed: " + e.message));
}

async function youtubeTitle(key, sec, title) {
    if (!sec.youtube_hook_url || !sec.youtube_hook_secret) return "not set up";
    const r = await fetch(sec.youtube_hook_url, {
        method: "POST", redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "youtube_title", secret: sec.youtube_hook_secret, title })
    });
    return (await r.text()).slice(0, 120);
}

async function youtubeChat(sec, text) {
    const r = await fetch(sec.youtube_hook_url, {
        method: "POST", redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "youtube_chat", secret: sec.youtube_hook_secret, text })
    });
    return (await r.text()).slice(0, 120);
}

/* The Twitch title, posted as a chat message in YouTube and Kick when it changes.
 * m.announced remembers the last line that went out, so the same title is never
 * posted twice; a new title (or a new stream) posts again. Off with
 * stream_sync.announce_title = false. */
async function announceTitle(key, cfg, sec, m, title) {
    const t = String(title || "").trim();
    if (cfg.announce_title === false || !t || t === m.announced) return null;
    const text = B.announceText(t);
    if (!text) return null;
    const out = {};
    if (sec.youtube_hook_url && sec.youtube_hook_secret) {
        try { out.youtube = await youtubeChat(sec, text); } catch (e) { out.youtube = "error: " + e.message; }
    }
    if (sec.kick_refresh && cfg.kick_user_id) {
        try { out.kick = await kick.sendChat(key, cfg.kick_user_id, text); } catch (e) { out.kick = "error: " + e.message; }
    }
    if (!Object.keys(out).length) return null;
    /* Remember it once one of them took it: if both failed, the next pass tries again. */
    if (Object.values(out).some((v) => /^ok/i.test(String(v)))) {
        m.announced = t;
        chat.remember(key, text);   /* posted as us, so the echo from YouTube / Kick is not relayed */
    }
    log(key, "announced title: " + JSON.stringify(out));
    return out;
}

async function runUser({ key, cfg, user }) {
    if (!cfg.twitch_login) return { skipped: "no twitch_login" };
    const broadcasterId = await twitch.userId(cfg.twitch_login);
    if (!broadcasterId) return { skipped: "unknown twitch_login" };

    const s = await twitch.stream(broadcasterId);
    let m = mem.get(key);
    if (!s) {
        chat.stop(key);
        if (m && m.live) { mem.set(key, { live: false }); await store.saveState(key, { live: false, offline_at: Date.now() }); }
        return { live: false };
    }

    const sec = await store.secrets(key);
    if (!m || m.streamId !== s.id) {
        const prev = await store.state(key);
        m = { live: true, streamId: s.id, firstPsnCheckPending: true, title: null, tagsDone: false, yt: null, kickTitle: null, kickCat: null, announced: null };
        mem.set(key, m);
        if (prev.alerted_stream_id !== s.id) {
            await discordLiveAlert(key, sec, cfg, s);
            await store.saveState(key, { alerted_stream_id: s.id });
        }
        log(key, `live: stream ${s.id} (${s.game_name})`);
        if (sec.kick_refresh && kick.ensureChatSubscription) {
            kick.ensureChatSubscription(key).then((x) => log(key, "Kick chat: " + x)).catch((e) => log(key, "Kick chat subscribe failed: " + e.message));
        }
    }

    chat.start(key, { cfg, broadcasterId, sec });

    const out = { live: true, stream_id: s.id, twitch_category: s.game_name, checked_at: Date.now() };
    /* auto (default): the PlayStation game + status drive the Twitch title and
     * category, and that same title goes to YouTube and Kick. `twitch` copies
     * whatever is set on Twitch out instead (PC / OBS), `playstation` only
     * touches Twitch. */
    const source = cfg.source || "auto";
    if (source === "twitch") {
        out.mode = "copy Twitch";
        await copyTwitchToOthers(key, cfg, sec, broadcasterId, m, out);
        out.chat = chat.status(key);
        await store.saveState(key, out);
        return out;
    }

    const squad = cfg.squad || {};
    const myTag = cfg.psn_online_id || (user && (user.psn_username || user.psn_online_id)) || null;
    const snap = await psn.snapshot(key, cfg, myTag, Object.keys(squad), m.firstPsnCheckPending).catch((e) => ({ error: e.message }));
    m.firstPsnCheckPending = false;
    if (!snap || snap.error) out.psn = snap ? "PSN error: " + snap.error : "no PlayStation data (no psn_npsso and no psn_online_id)";
    const me = snap && !snap.error ? snap.me : null;
    if (me) { out.psn_source = snap.source; out.psn_game = me.title || null; out.psn_status = me.status || null; }
    if (!me || !me.online || !me.title) {
        if (source === "playstation") { await store.saveState(key, out); return out; }
        /* Not in a PlayStation game right now: whatever is set on Twitch goes to YouTube and Kick */
        out.mode = "copy Twitch";
        await copyTwitchToOthers(key, cfg, sec, broadcasterId, m, out);
        out.chat = chat.status(key);
        await store.saveState(key, out);
        return out;
    }
    out.mode = "PlayStation";

    const playingWith = B.squadInGame(me, squad, snap.friends);
    out.squad = playingWith;
    const mentions = cfg.mention_squad === false ? [] : playingWith;
    const overrides = cfg.category_overrides || {};

    /* Twitch */
    const patch = {};
    const cat = await twitchCategory(me.title, overrides);
    out.category_match = cat ? cat.name : "no match for " + me.title;
    /* A failed Twitch read must not stop the YouTube / Kick updates below:
     * the pass still sends the title out and retries Twitch next time. */
    const ch = await twitch.channel(broadcasterId).catch((e) => { out.twitch_read_error = e.message; return null; });
    if (cat && ch && String(ch.game_id) !== String(cat.id)) patch.game_id = cat.id;   // always correct the category (fixes "Games + Demos")

    const fmt = { format: cfg.title_format || "status" };
    const title = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.TWITCH_TITLE_MAX, ...fmt });
    if (cfg.update_title !== false && title && title !== m.title && (!ch || ch.title !== title)) patch.title = title;

    const tags = B.cleanTags([...(cfg.base_tags || []), ...(((cfg.game_tags || {})[me.title]) || [])]);
    if (!m.tagsDone && tags.length && (!ch || !B.sameTags(ch.tags, tags))) patch.tags = tags;

    if (Object.keys(patch).length) {
        try {
            await twitch.updateChannel(key, broadcasterId, patch);
            log(key, "Twitch updated: " + JSON.stringify(patch));
        } catch (e) { out.twitch_error = e.message; log(key, e.message); }
    }
    if (!out.twitch_error) { m.title = title; if (tags.length) m.tagsDone = true; }
    out.title = title;

    /* The title as a chat announcement in YouTube and Kick (skipped when it hasn't changed) */
    const ann = await announceTitle(key, cfg, sec, m, title);
    if (ann) out.announce = ann;

    /* YouTube (title only) */
    const ytMode = cfg.youtube_mode || "same";
    if (ytMode !== "off") {
        const ytTitle = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.YOUTUBE_TITLE_MAX, base: ytMode === "base_plus_status" ? (cfg.youtube_base || "") : "", ...fmt });
        if (ytTitle && ytTitle !== m.yt) {
            try { out.youtube = await youtubeTitle(key, sec, ytTitle); if (/^ok/i.test(out.youtube)) m.yt = ytTitle; }
            catch (e) { out.youtube = "error: " + e.message; }
        }
    }

    /* Kick (title + category) */
    if (sec.kick_refresh) {
        try {
            const kp = {};
            const kTitle = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.KICK_TITLE_MAX, ...fmt });
            if (kTitle !== m.kickTitle) kp.stream_title = kTitle;
            const kc = await kickCategory(key, me.title, overrides);
            if (kc && kc.id !== m.kickCat) kp.category_id = Number(kc.id);
            if (Object.keys(kp).length) { await kick.updateChannel(key, kp); m.kickTitle = kTitle; if (kc) m.kickCat = kc.id; out.kick = "updated"; }
        } catch (e) { out.kick = "error: " + e.message; }
    }

    out.chat = chat.status(key);
    await store.saveState(key, out);
    return out;
}

/** Twitch is the source: copy its title (and category for Kick) to YouTube and Kick. Twitch itself is left alone. */
async function copyTwitchToOthers(key, cfg, sec, broadcasterId, m, out) {
    const ch = await twitch.channel(broadcasterId).catch(() => null);
    if (!ch) { out.copy = "couldn't read the Twitch channel"; return; }
    out.title = ch.title || "";
    out.twitch_category = ch.game_name || out.twitch_category;

    const ytMode = cfg.youtube_mode || "same";
    if (ytMode !== "off" && ch.title) {
        const base = ytMode === "base_plus_status" ? String(cfg.youtube_base || "").trim() : "";
        const ytTitle = B.clip(base ? `${base} | ${ch.title}` : ch.title, B.YOUTUBE_TITLE_MAX);
        if (ytTitle !== m.yt) {
            try { out.youtube = await youtubeTitle(key, sec, ytTitle); if (/^ok/i.test(out.youtube)) m.yt = ytTitle; }
            catch (e) { out.youtube = "error: " + e.message; }
        }
    }

    if (sec.kick_refresh) {
        try {
            const kp = {};
            const kTitle = B.clip(ch.title || "", B.KICK_TITLE_MAX);
            if (kTitle && kTitle !== m.kickTitle) kp.stream_title = kTitle;
            const kc = ch.game_name ? await kickCategory(key, ch.game_name, cfg.category_overrides || {}) : null;
            if (kc && kc.id !== m.kickCat) kp.category_id = Number(kc.id);
            if (Object.keys(kp).length) { await kick.updateChannel(key, kp); if (kp.stream_title) m.kickTitle = kTitle; if (kc) m.kickCat = kc.id; out.kick = "updated"; }
        } catch (e) { out.kick = "error: " + e.message; }
    }

    /* Copying Twitch: the title that is already live is what gets announced */
    const ann = await announceTitle(key, cfg, sec, m, ch.title);
    if (ann) out.announce = ann;
}

module.exports = { runUser };
