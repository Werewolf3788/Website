/* Pure helpers (no network): names, category matching, titles, tags, squad.
 * Kept separate so they can be unit-tested (see test/build.test.js). */
"use strict";

const TWITCH_TITLE_MAX = 140;
const YOUTUBE_TITLE_MAX = 100;
const KICK_TITLE_MAX = 140;

/** "Tom Clancy's Ghost ReconÂ® Wildlands" -> "Tom Clancy's Ghost Recon Wildlands" */
function cleanName(s) {
    return String(s || "")
        .replace(/[Â®â„¢Â©â„ ]/g, "")
        .replace(/[â€™â€˜`]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/** Loose form for comparing names: lowercase letters/digits only, single spaces. */
function normName(s) {
    return cleanName(s).toLowerCase()
        .replace(/&/g, " and ")
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const STOP = new Set(["the", "a", "an", "of", "and", "edition", "remastered", "ps4", "ps5", "game"]);
function words(s) { return normName(s).split(" ").filter((w) => w && !STOP.has(w)); }

/** 0..1 similarity between a PSN title and a platform category name. */
function similarity(a, b) {
    const na = normName(a), nb = normName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.replace(/ /g, "") === nb.replace(/ /g, "")) return 0.99;
    const A = new Set(words(a)), B = new Set(words(b));
    if (!A.size || !B.size) return 0;
    let both = 0;
    A.forEach((w) => { if (B.has(w)) both++; });
    const jac = both / (A.size + B.size - both);
    const cover = both / Math.max(A.size, B.size);
    return Math.max(jac, cover * 0.95);
}

/**
 * Pick the category for a PSN game.
 * overrides: { "<psn title>": "<category name>" } (case-insensitive key match)
 * candidates: [{ id, name }] from the platform's category search.
 * Returns { id, name, score } or null when nothing is a confident match.
 */
function pickCategory(psnTitle, candidates, overrides) {
    const list = Array.isArray(candidates) ? candidates.filter((c) => c && c.id && c.name) : [];
    const want = overrideFor(psnTitle, overrides);
    if (want) {
        const hit = list.find((c) => normName(c.name) === normName(want) || String(c.id) === String(want));
        if (hit) return { id: String(hit.id), name: hit.name, score: 1 };
    }
    let best = null;
    for (const c of list) {
        const score = similarity(psnTitle, c.name);
        if (!best || score > best.score || (score === best.score && c.name.length < best.name.length)) {
            best = { id: String(c.id), name: c.name, score };
        }
    }
    return best && best.score >= 0.6 ? best : null;
}

function overrideFor(psnTitle, overrides) {
    if (!overrides || typeof overrides !== "object") return null;
    const n = normName(psnTitle);
    for (const [k, v] of Object.entries(overrides)) {
        if (normName(k) === n && v) return String(v);
    }
    return null;
}

/** Text to search a category API with. Uses the override name when there is one. */
function searchTermFor(psnTitle, overrides) {
    return overrideFor(psnTitle, overrides) || cleanName(psnTitle);
}

/** Read a PSN basicPresence object (shape varies a little) into a flat record. */
function readPresence(raw) {
    const bp = raw && (raw.basicPresence || (raw.basicPresences && raw.basicPresences[0]) || raw);
    if (!bp || typeof bp !== "object") return { online: false, title: null, titleId: null, status: null };
    const p = bp.primaryPlatformInfo || {};
    const online = String(p.onlineStatus || bp.onlineStatus || "offline").toLowerCase() !== "offline";
    const gi = (bp.gameTitleInfoList && bp.gameTitleInfoList[0]) || (p.gameTitleInfoList && p.gameTitleInfoList[0]) || {};
    const status = typeof gi.gameStatus === "string" ? gi.gameStatus.trim() : "";
    return {
        online,
        title: online && gi.titleName ? cleanName(gi.titleName) : null,
        titleId: online ? (gi.npTitleId || gi.titleId || null) : null,
        status: online && status ? status : null,
        platform: p.platform || null
    };
}

/** Same game? Prefer the PSN title id, fall back to the cleaned name. */
function sameGame(a, b) {
    if (!a || !b || !a.title || !b.title) return false;
    if (a.titleId && b.titleId && a.titleId === b.titleId) return true;
    return normName(a.title) === normName(b.title);
}

/**
 * squad: { "<psn online id>": "<twitch login>" }
 * friends: { "<psn online id>": presenceRecord }
 * Returns twitch logins of squad members in the same game as `me`, in squad order.
 */
function squadInGame(me, squad, friends) {
    if (!me || !me.title || !squad) return [];
    const out = [];
    for (const [psn, twitch] of Object.entries(squad)) {
        const f = friends && friends[psn];
        const login = String(twitch || "").replace(/^@/, "").trim();
        if (login && f && f.online && sameGame(me, f)) out.push(login);
    }
    return out;
}

function clip(s, max) {
    s = String(s || "");
    if (s.length <= max) return s;
    return s.slice(0, Math.max(0, max - 1)).trimEnd() + "â€¦";
}

/** Title from the PlayStation game + status, never longer than max.
 *  format: "status" (default: game status, or the game if there's none) | "game_status" ("Game - status") | "game" */
function buildTitle({ status, game, mentions = [], max = TWITCH_TITLE_MAX, base = "", format = "status" }) {
    const st = cleanName(status), gm = cleanName(game);
    let main = format === "game" ? gm
        : format === "game_status" ? (gm && st && !st.toLowerCase().includes(gm.toLowerCase()) ? `${gm} - ${st}` : st || gm)
        : st || gm;
    if (base) main = main ? `${base} | ${main}` : base;
    if (!main) return "";
    let tail = mentions.length ? " w/ " + mentions.map((m) => "@" + m).join(" ") : "";
    if (tail.length > max / 2 && mentions.length > 1) tail = ` w/ @${mentions[0]} +${mentions.length - 1}`;
    return clip(main, max - tail.length) + tail;
}

/** YouTube live chat accepts 200 characters, so keep the announcement under that. */
const ANNOUNCE_MAX = 190;

/** The line posted in YouTube and Kick chat when the stream title changes. */
function announceText(title, max = ANNOUNCE_MAX) {
    const t = cleanName(title);
    return t ? clip("\u{1F534} " + t, max) : "";
}

/** Twitch tag rules: 1-25 chars, letters/numbers only, max 10, no duplicates. */
function cleanTags(list) {
    const seen = new Set(), out = [];
    for (const t of list || []) {
        const v = String(t || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 25);
        if (!v || seen.has(v.toLowerCase())) continue;
        seen.add(v.toLowerCase());
        out.push(v);
        if (out.length === 10) break;
    }
    return out;
}

function sameTags(a, b) {
    const x = (a || []).map((t) => t.toLowerCase()).sort().join("|");
    const y = (b || []).map((t) => t.toLowerCase()).sort().join("|");
    return x === y;
}

/** Firebase key for an email, same rule as the database rules. */
function emailKey(email) {
    return String(email || "").toLowerCase().replace(/\./g, "_").replace(/@/g, "_at_");
}

module.exports = {
    TWITCH_TITLE_MAX, YOUTUBE_TITLE_MAX, KICK_TITLE_MAX, ANNOUNCE_MAX,
    cleanName, normName, similarity, pickCategory, searchTermFor, overrideFor,
    readPresence, sameGame, squadInGame, buildTitle, announceText, cleanTags, sameTags, clip, emailKey
};
