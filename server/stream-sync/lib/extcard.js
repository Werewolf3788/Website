/* Werewolf Twitch extension: the "card" a channel's viewers see (pure, no I/O).
 * Pushed to viewers through Twitch Extension PubSub and saved in Twitch's broadcaster config
 * segment, so it must stay under 5 KB. Tier decides what goes in:
 *   0 free   Twitch basics + watermark      1  Twitch basics
 *   2        + tracker, Stream Together allies
 *   3        + PlayStation game/status, same-game allies
 * Founder lifetime passes get the watermark picture once a month (credit). */
"use strict";

const FOOT = "Track your own games at entertainment-71888.web.app";
const MAX_BYTES = 5120;
const NON_GAMES = new Set(["just chatting", "music", "art", "talk shows & podcasts", "irl", "asmr", "pools, hot tubs, and beaches", "special events", "travel & outdoors", "software and game development", "makers & crafting", "food & drink", "sports", "fitness & health", "science & technology"]);

// same rules as server/discord-auth/tiers.js (kept in step there)
function effectiveTier(doc, now, ally) {
    if (ally) return { tier: 3, lifetime: false, founder: false, until: 0, ally: true };
    const d = doc || {}, t = d.tiers || (Number(d.until) ? { 1: { until: Number(d.until) } } : {});
    for (const n of [3, 2, 1]) {
        const e = t[n] || t[String(n)];
        if (e && (e.lifetime || Number(e.until) > now)) return { tier: n, lifetime: !!e.lifetime, founder: !!e.founder, until: e.lifetime ? 0 : Number(e.until) };
    }
    return { tier: 0, lifetime: false, founder: false, until: 0 };
}

const boxArt = (u) => (u ? String(u).replace("{width}", "285").replace("{height}", "380") : "");
const clip = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function me(input) {
    const tw = input.twitch || {}, tier = input.tier || 0;
    const out = { name: tw.display || tw.login || "", login: tw.login || "", avatar: tw.avatar || "", game: "", status: "", poster: "", source: "avatar", title: tw.title || "", tracker: tier >= 2 ? input.tracker || null : null };
    if (!input.live) return Object.assign(out, { status: "Offline", poster: out.avatar });
    if (tier >= 3 && input.psn && input.psn.title) return Object.assign(out, { game: input.psn.title, status: input.psn.status || tw.title || "", poster: input.psn.poster || boxArt(tw.gameBoxArt) || out.avatar, source: "psn" });
    if (tw.gameName && !NON_GAMES.has(String(tw.gameName).toLowerCase())) return Object.assign(out, { game: tw.gameName, status: tw.title || "", poster: boxArt(tw.gameBoxArt) || out.avatar, source: "twitch" });
    return Object.assign(out, { game: tw.gameName || "", status: tw.title || "", poster: out.avatar, source: "avatar" });
}

// ---- the streamer's overlay look (from Overlay Studio), so the extension matches their overlay ----
const FONTS = ["Inter", "Roboto", "Montserrat", "Poppins", "Oswald", "Bebas Neue", "Rajdhani", "Orbitron", "Press Start 2P", "Bangers", "Permanent Marker", "Russo One", "Teko"];
const POS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
const clamp = (n, lo, hi, d) => { n = Math.round(Number(n)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
function cleanLook(l) {
    if (typeof l === "string") { try { l = JSON.parse(l); } catch (e) { return null; } }
    if (!l || typeof l !== "object") return null;
    const out = {};
    ["accent", "accent2", "panel", "text"].forEach((k) => { if (/^#[0-9a-f]{6}$/i.test(String(l[k] || ""))) out[k] = String(l[k]).toLowerCase(); });
    if (FONTS.indexOf(l.font) >= 0) out.font = l.font;
    out.panelOpacity = clamp(l.panelOpacity, 0, 100, 82);
    out.radius = clamp(l.radius, 0, 30, 12);
    out.glow = l.glow === true;
    // where the overlay puts its logo/name, "Now playing", Twitch poster and stream title (the extension copies it)
    const L = l.layout && typeof l.layout === "object" ? l.layout : null;
    if (L) {
        const pos = (p) => (POS.indexOf(p) >= 0 ? p : "tl"), str = (x, n) => String(x == null ? "" : x).slice(0, n);
        const e = (k) => L[k] && typeof L[k] === "object" ? L[k] : {};
        out.layout = {
            brand: { on: e("brand").on === true, pos: pos(e("brand").pos), name: str(e("brand").name, 40), tag: str(e("brand").tag, 60) },
            game: { on: e("game").on === true, pos: pos(e("game").pos), prefix: str(e("game").prefix, 30) },
            poster: { on: e("poster").on === true, pos: pos(e("poster").pos), size: clamp(e("poster").size, 50, 200, 100) },
            title: { on: e("title").on === true, pos: pos(e("title").pos) }
        };
    }
    return out;
}

function buildCard(input) {
    const tier = input.tier || 0;
    const allies = tier < 2 ? [] : (input.allies || []).filter((a) => a.via === "shared" || (tier >= 3 && a.via === "psn"))
        .map((a) => ({ name: a.display || a.login, login: a.login, avatar: a.avatar || "", game: a.title || "", poster: a.poster || a.avatar || "", tracker: a.tracker || null }));
    const credit = tier >= 1 && input.founder && input.creditAt ? { at: input.creditAt } : null;
    const wmOn = tier === 0 || !!credit;
    const card = {
        v: 1, at: Date.now(), live: !!input.live, startedAt: input.live ? input.startedAt || null : null,
        me: me(input), allies,
        wm: wmOn && input.watermark ? { img: input.watermark.img, name: input.watermark.name, secs: 10, opacity: 0.75 } : null,
        wmAt: tier === 0 && input.live ? input.wmAt || null : null,
        credit, foot: FOOT, look: input.look || null
    };
    return fit(card);
}

const cardSize = (c) => Buffer.byteLength(JSON.stringify(c), "utf8");

// trim, in order, until it fits: allies' trackers, tracker summaries to 3 lines, long text, extra allies
function fit(c) {
    if (cardSize(c) <= MAX_BYTES) return c;
    c.allies.forEach((a) => { a.tracker = null; });
    if (cardSize(c) <= MAX_BYTES) return c;
    const trim = (t) => { if (t && t.games) t.games = t.games.slice(0, 6).map((g) => Object.assign({}, g, { name: clip(g.name, 40), summary: (g.summary || []).slice(0, 3).map((x) => clip(x, 60)) })); };
    trim(c.me.tracker);
    if (cardSize(c) <= MAX_BYTES) return c;
    const short = (o, keys) => keys.forEach((k) => { if (o[k] && !/^https?:/.test(o[k])) o[k] = clip(o[k], 80); else if (o[k] && o[k].length > 300) o[k] = ""; });
    short(c.me, ["name", "game", "status", "avatar", "poster"]);
    c.allies.forEach((a) => short(a, ["name", "game", "avatar", "poster"]));
    while (cardSize(c) > MAX_BYTES && c.allies.length > 3) c.allies.pop();
    while (cardSize(c) > MAX_BYTES && c.me.tracker && c.me.tracker.games.length) c.me.tracker.games.pop();
    while (cardSize(c) > MAX_BYTES && c.allies.length) c.allies.pop();
    return c;
}

function sameCard(a, b) {
    if (!a || !b) return false;
    const strip = (c) => JSON.stringify(Object.assign({}, c, { at: 0 }));
    return strip(a) === strip(b);
}


// ---- game tracker entries (what viewers see under "View more") ----
// Internal/save fields that aren't progress, and keys whose value is never shown.
const HIDE = /^(name|title|gamename|id|gameid|platform|updatedat|saveat|save|savedat|rev|by|v|version|seenversion|autofuse|carryslots|art|image|poster.*|.*url|.*source|.*id)$/;
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
function prettyName(id, v) {
    const n = v && (v.name || v.title || v.gameName);
    if (n) return String(n);
    let s = String(id || "").replace(/TM|™|®/g, " ").replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/\s+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}
const words = (k) => { const s = String(k).replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const num = (n) => Math.round(Number(n)).toLocaleString("en-US");
const vals = (o) => (o && typeof o === "object" ? Object.values(o).filter((x) => x && typeof x === "object") : []);
const msOf = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : Number(t) || 0);
const OBJ_KEYS = ["ranks", "collectibles", "missions", "medals", "wallet"];
function trackerEntry(id, platform, v, def) {
    v = v || {};
    if (/_prev$/i.test(String(id))) return null;
    const by = {}; Object.keys(v).forEach((k) => { by[norm(k)] = k; });
    const facts = [], extra = [];
    let progress = false;
    const xy = (label, got, total) => { if (total > 0) { facts.push(label + " " + got + "/" + total); if (got > 0) progress = true; } };
    // trophies / achievements
    const earned = Number(v[by.trophiesearned]), total = Number(v[by.trophiestotal]);
    if (earned > 0 && total > 0) {
        const pct = Number(v[by.trophiespercent]);
        facts.push("Trophies " + earned + "/" + total + (pct > 0 ? " (" + Math.round(pct) + "%)" : "")); progress = true;
    }
    // Game Companion checklists: collectibles, missions, medals
    const groups = vals(v.collectibles).map((g) => {
        const items = vals(g.items), got = items.length ? items.filter((i) => i.collected).length : Number(g.count) || 0;
        return { label: g.quest_name || g.label || g.name || "", got, total: Math.max(items.length, Number(g.total) || 0) };
    }).filter((g) => g.total > 0);
    xy("Collectibles", groups.reduce((a, g) => a + g.got, 0), groups.reduce((a, g) => a + g.total, 0));
    const ms = vals(v.missions); xy("Missions", ms.filter((m) => m.completed).length, ms.length);
    const md = vals(v.medals); xy("Medals", md.filter((m) => m.earned).length, md.length);
    if (v.ranks && typeof v.ranks === "object") Object.keys(v.ranks).forEach((k) => { const n = Number(v.ranks[k]); if (norm(k) !== "collectibles" && n > 0 && n < 1e11) { extra.push(words(k) + " " + num(n)); progress = true; } });
    if (v.wallet && typeof v.wallet === "object" && Number(v.wallet.level) > 1) { facts.push("Level " + num(v.wallet.level)); progress = true; }
    // other plain stats (best score, kills, rank...)
    Object.keys(v).forEach((k) => {
        const n = norm(k), val = v[k];
        if (HIDE.test(n) || n.startsWith("trophies") || OBJ_KEYS.indexOf(n) >= 0) return;
        if (typeof val === "number") { if (val > 0 && val < 1e11) { facts.push(words(k) + " " + num(val)); progress = true; } }
        else if (val === true) { facts.push(words(k)); progress = true; }
        else if (typeof val === "string" && val && val.length <= 30 && !/^(yes|no|true|false|0)$/i.test(val) && !/^[[{]/.test(val)) facts.push(words(k) + ": " + val);
    });
    // the game's own profile card (e.g. "Wildlands profile"), laid out by the game's tracker file (player_profile)
    let profile = null;
    if (def && Array.isArray(def.groups)) {
        const w = v.wallet && typeof v.wallet === "object" ? v.wallet : {};
        const gs = def.groups.map((g) => ({ name: String(g.name || ""), rows: (g.fields || []).map((f) => {
            const val = String(w["pf_" + f.id] == null ? "" : w["pf_" + f.id]).trim();
            return val ? [String(f.name || f.id), clip(val + (/^\d+(\.\d+)?$/.test(val) ? String(f.unit || "") : ""), 40)] : null;
        }).filter(Boolean) })).filter((g) => g.rows.length);
        if (gs.length) { profile = { title: String(def.title || "Profile").replace(/^My\s+/i, ""), level: Number(w.level) || 1, groups: gs }; progress = true; }
    }
    if (!progress) return null;
    const nice = def && def.name ? String(def.name).replace(/[®™]/g, "").replace(/\s+/g, " ").trim() : prettyName(id, v);
    return { id: String(id), name: nice, platform, profile, facts: facts.concat(extra).slice(0, 8), at: msOf(v.updatedAt) || msOf(v.saveAt) };
}

module.exports = { cleanLook, trackerEntry, prettyName, buildCard, cardSize, sameCard, effectiveTier, FOOT, MAX_BYTES };
