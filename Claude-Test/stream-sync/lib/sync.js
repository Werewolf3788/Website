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
            content: cfg.discord_message || `🔴 ${cfg.twitch_login} is live! ${url}`,
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
        m = { live: true, streamId: s.id, firstPsnCheckPending: true, title: null, tagsDone: false, yt: null, kickTitle: null, kickCat: null };
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

    chat.start(key, { cfg, broadcasterId });

    const squad = cfg.squad || {};
    const myTag = cfg.psn_online_id || (user && (user.psn_username || user.psn_online_id)) || null;
    const snap = await psn.snapshot(key, cfg, myTag, Object.keys(squad), m.firstPsnCheckPending).catch((e) => ({ error: e.message }));
    m.firstPsnCheckPending = false;
    const out = { live: true, stream_id: s.id, twitch_category: s.game_name, checked_at: Date.now() };
    if (!snap || snap.error) {
        out.psn = snap ? "PSN error: " + snap.error : "no PlayStation data (no psn_npsso and no psn_online_id)";
        await store.saveState(key, out);
        return out;
    }
    const me = snap.me;
    out.psn_source = snap.source; out.psn_game = me.title || null;
    out.psn_status = me.status || null;
    if (!me.online || !me.title) { await store.saveState(key, out); return out; }

    const mentions = B.squadInGame(me, squad, snap.friends);
    out.squad = mentions;
    const overrides = cfg.category_overrides || {};

    /* Twitch */
    const patch = {};
    const cat = await twitchCategory(me.title, overrides);
    out.category_match = cat ? cat.name : "no match for " + me.title;
    const ch = await twitch.channel(broadcasterId);
    if (cat && ch && String(ch.game_id) !== String(cat.id)) patch.game_id = cat.id;   // always correct the category (fixes "Games + Demos")

    const title = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.TWITCH_TITLE_MAX });
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

    /* YouTube (title only) */
    const ytMode = cfg.youtube_mode || "same";
    if (ytMode !== "off") {
        const ytTitle = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.YOUTUBE_TITLE_MAX, base: ytMode === "base_plus_status" ? (cfg.youtube_base || "") : "" });
        if (ytTitle && ytTitle !== m.yt) {
            try { out.youtube = await youtubeTitle(key, sec, ytTitle); if (/^ok/i.test(out.youtube)) m.yt = ytTitle; }
            catch (e) { out.youtube = "error: " + e.message; }
        }
    }

    /* Kick (title + category) */
    if (sec.kick_refresh) {
        try {
            const kp = {};
            const kTitle = B.buildTitle({ status: me.status, game: me.title, mentions, max: B.KICK_TITLE_MAX });
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

module.exports = { runUser };
