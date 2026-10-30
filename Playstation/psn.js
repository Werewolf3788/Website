/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Version: 68.0.0
 * Description: PSN Telemetry Engine - Ray's Firebase (playstation-stats)
 *   INPUT  : Kevin's DB (entertainment-71888) /users + /user_secrets (READ-ONLY):
 *            PSN account IDs, usernames and NPSSO cookies only.
 *   OUTPUT : Ray's DB (playstation-stats) via FIREBASE_SERVICE_RAY (Admin SDK)
 *     RTDB (live, changes often):
 *       /psn/gamertags/{onlineId}  player card: presence, hours, sessions, trophies
 *       /psn/usersByGamerTag, /psn/engineStatus, /psn/meta
 *     Firestore (slow-changing / bulky):
 *       games/{Game_Name}          trophy catalog, DLC, store listing
 *       players/{onlineId}         friends, purchases, region, sync markers
 *         /trophyProgress/{commId}, /library/page_N, /purchased/page_N
 *       squadLeaderboard/current, squadAnalytics/current
 *       friendsDirectory/bucket_NN, raw_telemetry/{onlineId}, meta/*
 *       system/tokens, system/private_{onlineId}   (private: no client rules)
 *   No psn.json is written. Nothing secret is written to RTDB.
 * ============================================================================ */
"use strict";

const crypto = require("crypto");
const psnApi = require("psn-api");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups,
    getUserTrophyGroupEarningsForTitle,
    getProfileFromAccountId,
    getRecentlyPlayedGames,
    getUserRegion,
    getBasicPresence,
    getUserFriendsAccountIds,
    getUserBlockedAccountIds,
    getUserFriendsRequests,
    getAccountDevices,
    getProfileShareableLink,
    getUserPlayedGames,
    getPurchasedGames
} = psnApi;

const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const RAY_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const ENGINE_VERSION = "68.0.0";
const AMAZON_TAG = "moviesanywhere02-20";
const IS_MANUAL = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: "4087137467908566201", emailMatch: "raykevin71888", env: "PSN_NPSSO_WEREWOLF" },
    { key: "ray", tag: "OneLIVIDMAN", id: "2732733730346312494", emailMatch: "cartnalray9", env: "PSN_NPSSO_RAY" },
    { key: "darkwing", tag: "Darkwing69420", id: "4398462806362115916", emailMatch: null, env: "PSN_NPSSO_DARKWING" },
    { key: "marc", tag: "DesdemonaTiger", id: "6551906246515882523", emailMatch: null, env: "PSN_NPSSO_MARC" }
];

const RTDB_CARD_KEYS = new Set([
    "accountId", "onlineId", "avatar", "allAvatars", "bio", "plus", "region", "language",
    "level", "trophySummary", "gamesPlayed", "psnAccountAge", "earliestTrophyDate", "latestTrophyDate",
    "online", "currentGame", "currentGameId", "gameKey", "gameStatus", "gameStatusUpdated",
    "commId", "conceptId", "lastPlayedGame", "lastPlayedGameKey", "lastPlayedCommId", "art", "posterArt", "image", "currentGameArt",
    "currentGameHours", "currentGameNumericHours", "playedHoursApp", "playedHoursWhole",
    "playtimeSource", "sonyPlayDuration", "sessionStartedAt", "sessionStartedAtMs",
    "currentSessionSeconds", "amazonAffiliateUrl", "platform", "gameBuildVersion",
    "isStreamingRemotePlay", "displayPlatform", "activeHunt", "playSessions", "recentGames",
    "mostRecentTrophies", "liveTrophyProgress", "friendsCount", "purchasedCount", "rawPresence",
    "npssoValid", "npssoStatus", "handshakeText", "handshakeState", "lastUpdated"
]);

const PULL_CONFIG = {
    SKELETON_REFRESH_RECENT_TITLES: 20,
    PROGRESS_REFRESH_RECENT_TITLES: 0,
    LIVE_PROGRESS_BACKFILL_PER_RUN: 12,   // games active this year get filled into liveTrophyProgress a few per run
    HEAVY_REFRESH_MS: 6 * 3600 * 1000,
    SKELETON_STALE_MS: 24 * 3600 * 1000,
    RATE_PERSIST_MS: 6 * 3600 * 1000,
    BACKFILL_NEW_TITLES_PER_RUN: 40,
    MOST_RECENT_TROPHIES_KEPT: 60,
    RECENT_GAMES_IN_RTDB: 25,
    PAGE_SIZE_TITLES: 800,
    PAGE_SIZE_PLAYED: 200,
    PAGE_SIZE_LIBRARY: 100,
    PAGE_SIZE_PURCHASED: 100,
    PAGE_SIZE_FRIENDS: 1000,
    CHUNK_ITEMS: 50,
    MAX_PAGES: 50,
    FRIEND_LOOKUPS_PER_RUN: 40,
    FRIEND_RETRY_UNRESOLVED_MS: 24 * 3600 * 1000,
    REQUEST_GAP_MS: 120,
    RETRIES: 2,
    PREFER_SONY_PLAYTIME: true
};

const ACTIVE_WINDOW_DAYS = 183;                      // ~6 months: games idle longer than this leave RTDB (they stay in Firestore)
const activeCutoffMs = () => Date.now() - ACTIVE_WINDOW_DAYS * 86400000;
const lastActivityMs = (g) => Math.max(g?.lastPlayed ? new Date(g.lastPlayed).getTime() : 0, g?.lastUpdatedDateTime ? new Date(g.lastUpdatedDateTime).getTime() : 0) || 0;
const LEGACY_FRIEND_BUCKETS = 16;                   // old friendsDirectory/bucket_NN docs (migrated + deleted once)
const apiStats = { calls: 0, failures: 0, errorsByLabel: {} };
const diag = { auth: {}, members: {} };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowEt = () => new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const fingerprint = (s) => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 12);
const safeKey = (s) => String(s || "").replace(/[.$#\[\]\/]/g, "_");

async function callPsn(label, fn, fallback = null, quiet = false) {
    if (typeof fn !== "function") return fallback;
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            apiStats.calls++;
            const res = await fn();
            return res === undefined ? fallback : res;
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|too many requests|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                console.warn(`[RATE LIMIT] ${label}: waiting ${5000 * (attempt + 1)}ms`);
                await sleep(5000 * (attempt + 1));
                continue;
            }
            if (!quiet) {
                apiStats.failures++;
                const e = apiStats.errorsByLabel[label] || { count: 0, last: "" };
                e.count++;
                e.last = msg.slice(0, 200);
                apiStats.errorsByLabel[label] = e;
                if (e.count === 1) console.warn(`[API FAIL] ${label}: ${msg}`);
            }
            return fallback;
        }
    }
    return fallback;
}

function pickList(res, paths) {
    for (const p of paths) {
        const val = p.split(".").reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), res);
        if (Array.isArray(val)) return val;
    }
    return [];
}

async function paginateCollect(label, fetchPage, extractItems, pageSize) {
    const items = [];
    const pagesRaw = [];
    let offset = 0;
    let lastSig = null;
    for (let page = 0; page < PULL_CONFIG.MAX_PAGES; page++) {
        const res = await callPsn(label, () => fetchPage(offset, pageSize), null);
        if (!res) break;
        const batch = extractItems(res) || [];
        if (batch.length === 0) break;
        const sig = JSON.stringify(batch[0]);
        if (sig === lastSig) break;
        lastSig = sig;
        pagesRaw.push(res);
        items.push(...batch);
        offset += batch.length;
        const total = res?.totalItemCount ?? res?.totalResults ?? null;
        if (total !== null && total !== undefined && items.length >= total) break;
    }
    return { items, pagesRaw };
}

/* ---------- RTDB value helpers ---------- */
function normalizeForRtdb(v) {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "number" && !Number.isFinite(v)) return undefined;
    if (Array.isArray(v)) {
        if (v.length === 0) return undefined;
        return v.map((x) => { const n = normalizeForRtdb(x); return n === undefined ? null : n; });
    }
    if (typeof v === "object") {
        const out = {};
        for (const k of Object.keys(v)) {
            const n = normalizeForRtdb(v[k]);
            if (n !== undefined) out[k] = n;
        }
        return Object.keys(out).length ? out : undefined;
    }
    return v;
}

function stableStringify(v) {
    if (v === undefined) return "∅";
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

// RTDB returns objects keyed 0..n as arrays; turn them back into maps.
function asObjectMap(x) {
    if (!x || typeof x !== "object") return {};
    if (!Array.isArray(x)) return x;
    const out = {};
    x.forEach((val, i) => { if (val !== null && val !== undefined) out[i] = val; });
    return out;
}

// Mimic how RTDB hands data back: objects with mostly-sequential integer keys become arrays.
function rtdbCanon(v) {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(rtdbCanon);
    const keys = Object.keys(v);
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
        const max = Math.max(...keys.map(Number));
        if (keys.length > (max + 1) / 2) {
            const arr = [];
            for (let i = 0; i <= max; i++) arr.push(v[i] === undefined ? null : rtdbCanon(v[i]));
            return arr;
        }
    }
    const out = {};
    for (const k of keys) out[k] = rtdbCanon(v[k]);
    return out;
}

// A game stays in RTDB (liveTrophyProgress) while it was active in the last ~6 months:
// played / trophy data updated / a trophy earned in that window, or it is the game being played right now.
function gameActiveRecently(map, lastActivity, isActiveNow) {
    if (isActiveNow) return true;
    const cutoff = activeCutoffMs();
    if (lastActivity && new Date(lastActivity).getTime() >= cutoff) return true;
    return Object.values(asObjectMap(map)).some((t) => t && (t.timestamp || 0) >= cutoff);
}

// Within a qualifying game, liveTrophyProgress keeps only trophies that are earned (any date) or in progress (e.g. 22/100).
function earnedOrInProgress(map) {
    const out = {};
    for (const [k, t] of Object.entries(asObjectMap(map))) {
        if (t && (t.earned || (t.currentValue || 0) > 0)) out[k] = t;
    }
    return out;
}

function filterCard(record) {
    const slim = {};
    for (const k of Object.keys(record || {})) {
        if (RTDB_CARD_KEYS.has(k) && record[k] !== undefined) slim[k] = record[k];
    }
    return slim;
}

function computePatch(oldRec, newRec) {
    const fNew = JSON.parse(JSON.stringify(filterCard(newRec)));
    const fOld = filterCard(oldRec);
    const patch = {};
    for (const k of new Set([...Object.keys(fOld), ...Object.keys(fNew)])) {
        const before = stableStringify(rtdbCanon(normalizeForRtdb(fOld[k])));
        const afterNorm = normalizeForRtdb(fNew[k]);
        if (before === stableStringify(rtdbCanon(afterNorm))) continue;
        patch[k] = afterNorm === undefined ? null : afterNorm;
    }
    return { patch, full: normalizeForRtdb(fNew) || {} };
}

/* ---------- Pure data helpers ---------- */
function normalizeTitleName(name = "") {
    return String(name || "").toLowerCase().replace(/®|™|©/g, "")
        .replace(/\btrophies\b|\btrophy set\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function toGameKey(name = "") {
    return String(name || "").replace(/®|™|©/g, "").replace(/[:\/\\#$\[\].\-+]/g, " ")
        .trim().replace(/\s+/g, "_") || "Unknown_Game";
}

const TROPHY_RARITY_LABELS = { 0: "Ultra Rare", 1: "Very Rare", 2: "Rare", 3: "Common" };
const trophyRarityLabel = (n) => (n === null || n === undefined ? null : TROPHY_RARITY_LABELS[n] || null);

function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
}

function extractConceptIdFromText(text = "") {
    if (!text || typeof text !== "string") return null;
    const m = text.match(/concept\/(\d+)/i);
    return m ? m[1] : null;
}

function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const MIN = 60, HOUR = 3600, DAY = 86400, WEEK = 604800, MONTH = 2592000, YEAR = 31536000;
    const pl = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
    if (totalSeconds >= YEAR) {
        const y = Math.floor(totalSeconds / YEAR), m = Math.floor((totalSeconds % YEAR) / MONTH);
        return m > 0 ? `${pl(y, "year")}, ${pl(m, "month")}` : pl(y, "year");
    }
    if (totalSeconds >= MONTH) {
        const m = Math.floor(totalSeconds / MONTH), w = Math.floor((totalSeconds % MONTH) / WEEK);
        return w > 0 ? `${pl(m, "month")}, ${pl(w, "week")}` : pl(m, "month");
    }
    if (totalSeconds >= WEEK) {
        const w = Math.floor(totalSeconds / WEEK), d = Math.floor((totalSeconds % WEEK) / DAY);
        return d > 0 ? `${pl(w, "week")}, ${pl(d, "day")}` : pl(w, "week");
    }
    if (totalSeconds >= DAY) {
        const d = Math.floor(totalSeconds / DAY), h = Math.floor((totalSeconds % DAY) / HOUR), mi = Math.floor((totalSeconds % HOUR) / MIN);
        if (h > 0) return `${pl(d, "day")}, ${h}h ${mi}m`;
        if (mi > 0) return `${pl(d, "day")}, ${mi} mins`;
        return pl(d, "day");
    }
    if (totalSeconds >= HOUR) {
        const h = Math.floor(totalSeconds / HOUR), mi = Math.floor((totalSeconds % HOUR) / MIN);
        return mi > 0 ? `${h}h ${mi}m` : `${h} hrs`;
    }
    return `${Math.floor(totalSeconds / MIN)} mins`;
}

function parseIsoDuration(s) {
    if (!s || typeof s !== "string") return 0;
    const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return parseInt(m[1] || "0", 10) * 3600 + parseInt(m[2] || "0", 10) * 60 + parseInt(m[3] || "0", 10);
}

function resolveGamePosterArt(sources = []) {
    const fix = (u) => u.trim().replace(/^https?:\/\//, "//");
    for (const src of sources) {
        if (typeof src === "string" && src.trim() && !src.includes("undefined") && !src.includes("null")) return fix(src);
        if (src && typeof src === "object" && typeof src.url === "string" && src.url.trim()) return fix(src.url);
    }
    return null;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    let diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
    const intervals = [
        { label: "yr", value: 31536000000 }, { label: "month", value: 2592000000 },
        { label: "week", value: 604800000 }, { label: "day", value: 86400000 },
        { label: "hour", value: 3600000 }, { label: "min", value: 60000 }
    ];
    const parts = [];
    for (const i of intervals) {
        const c = Math.floor(diff / i.value);
        if (c > 0) { parts.push(`${c} ${i.label}${c > 1 ? "s" : ""}`); diff -= c * i.value; }
    }
    return parts.length ? parts.join(", ") : "Just now";
}

function calculateAgeString(startDate) {
    if (!startDate) return "Unknown";
    const days = Math.ceil(Math.abs(new Date() - new Date(startDate)) / 86400000);
    const years = Math.floor(days / 365), months = Math.floor((days % 365) / 30);
    return years > 0 ? `${years} years, ${months} months` : `${months} months`;
}

function getDifficultyTier(rate) {
    if (rate === undefined || rate === null) return "Rare";
    const r = parseFloat(rate);
    if (isNaN(r)) return "Rare";
    if (r <= 5) return "Ultra Rare (Very Hard)";
    if (r <= 15) return "Very Rare (Hard)";
    if (r <= 50) return "Rare (Medium)";
    return "Common (Easy)";
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    return `//www.amazon.com/s?k=${encodeURIComponent(gameName.replace(/®|™/g, ""))}&tag=${AMAZON_TAG}`;
}

function normalizeBasicPresence(raw) {
    if (!raw) return null;
    return raw?.basicPresence || (Array.isArray(raw) ? raw[0] : null) || (raw?.basicPresences ? raw.basicPresences[0] : null) || raw;
}

function extractGameStatus(bp) {
    if (!bp) return null;
    const info = bp?.gameTitleInfoList?.[0] || bp?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
    const status = info.gameStatus || bp.gameStatus || bp?.primaryPlatformInfo?.gameStatus || null;
    if (typeof status !== "string") return null;
    const clean = status.trim();
    return clean.length ? clean : null;
}

function normalizePlatform(game) {
    const raw = (game?.trophyTitlePlatform || game?.platform || game?.category ||
        (game?.npServiceName === "trophy2" ? "PS5" : "PS4") || "PS4").toUpperCase();
    if (raw.includes("PS5")) return "PS5";
    if (raw.includes("PS4")) return "PS4";
    if (raw.includes("PS3")) return "PS3";
    if (raw.includes("VITA")) return "PS Vita";
    if (raw.includes("PSP")) return "PSP";
    return "PS5";
}

function parseDetailedHardwareContext(rawPresence, matchedGame = {}) {
    const primary = rawPresence?.primaryPlatformInfo || {};
    const rawPlatform = (primary.platform || rawPresence?.platform || "").toUpperCase();
    let hw;
    if (rawPlatform.includes("PS5")) hw = "PS5";
    else if (rawPlatform.includes("PS4")) hw = "PS4";
    else if (rawPlatform.includes("PS3")) hw = "PS3";
    else if (rawPlatform.includes("VITA")) hw = "PS Vita";
    else if (rawPlatform.includes("PSP")) hw = "PSP";
    else hw = matchedGame?.platform || "PS5";

    const streaming = !!(primary.isInGameStreaming || primary.streamingType || rawPresence?.isInGameStreaming ||
        primary.remotePlay || String(primary.platform).toUpperCase().includes("STREAM"));

    const gi = rawPresence?.gameTitleInfoList?.[0] || primary?.gameTitleInfoList?.[0] || {};
    const fmt = (gi.formatValue || matchedGame.category || matchedGame.npServiceName || "").toUpperCase();
    let build = "PS5 Native Game";
    if (fmt.includes("PS4") || fmt === "TROPHY") build = hw === "PS5" ? "PS4 Back-Compat on PS5" : "PS4 Native Game";
    else if (fmt.includes("PS3")) build = "PS3 Classic";
    else if (fmt.includes("VITA")) build = "PS Vita App";
    else if (fmt.includes("PS5") || fmt === "TROPHY2") build = "PS5 Native Game";
    else if (matchedGame.platform) build = `${matchedGame.platform} Game`;

    return {
        activeHardware: hw,
        isStreamingRemotePlay: streaming,
        gameBuildVersion: build,
        displayPlatformLabel: streaming ? `${hw} (Remote Play)` : hw
    };
}

function estimateGameFileSize(name = "", platform = "PS5") {
    const n = name.toLowerCase();
    if (n.includes("red dead redemption")) return "105.0 GB";
    if (n.includes("ghost recon wildlands")) return "62.4 GB";
    if (n.includes("thehunter") || n.includes("call of the wild")) return "48.2 GB";
    if (n.includes("way of the hunter")) return "22.6 GB";
    if (n.includes("sniper elite 5")) return "55.1 GB";
    if (n.includes("farming simulator 25")) return "38.5 GB";
    if (n.includes("path of titans")) return "12.8 GB";
    if (n.includes("left 4 dead")) return "7.5 GB";
    return platform === "PS5" ? "42.0 GB" : "28.5 GB";
}

function estimateDlcFileSize(name = "") {
    const d = name.toLowerCase();
    if (d.includes("heirloom")) return "450 MB";
    if (d.includes("narco road")) return "9.2 GB";
    if (d.includes("fallen ghosts")) return "10.4 GB";
    if (d.includes("night hunting")) return "1.2 GB";
    if (d.includes("reserve") || d.includes("map")) return "4.8 GB";
    if (d.includes("weapon") || d.includes("pack")) return "850 MB";
    return "2.4 GB";
}

function inferGameCapabilitiesFromTrophies(gameName, trophies = [], storeBadges = []) {
    const text = (trophies || []).map((t) => `${t.name || ""} ${t.description || ""} ${t.detail || ""}`).join(" ").toLowerCase();
    const name = (gameName || "").toLowerCase().trim();
    const badges = (storeBadges || []).map((b) => b.toLowerCase());
    const hasBadgeOnline = badges.some((b) => b.includes("online play") || b.includes("online players"));
    const hasBadgePsPlus = badges.some((b) => b.includes("ps plus"));
    const coop = ["co-op", "coop", "cooperative", "partner", "teammate", "revive an ally", "revive a player", "with a friend", "invite a friend", "as a duo", "posse"];
    const pvp = ["multiplayer", "pvp", "versus", "invade", "invasion", "axis invasion", "ranked match", "online match", "opponents", "deathmatch", "battle royale", "win a match", "series major", "the real deal"];
    const camp = ["campaign", "chapter", "mission", "story", "prologue", "epilogue", "difficulty", "collectibles", "memories", "complete the game"];
    const hasCoop = coop.some((t) => text.includes(t));
    const hasPvp = pvp.some((t) => text.includes(t));
    const hasCamp = camp.some((t) => text.includes(t)) || (trophies && trophies.length > 15);

    const dedicatedCoop = name.includes("it takes two") || name.includes("a way out") || name.includes("we were here");
    const rdr2 = name.includes("red dead") || name.includes("rdr2");
    const tsushima = name.includes("ghost of tsushima") || name.includes("tsushima") || name.includes("legends");
    const nfs = name.includes("need for speed") || name.includes("nfs ");
    const farm = name.includes("farming simulator");
    const sniper = name.includes("sniper elite") || name.includes("zombie army");
    const hunter = name.includes("thehunter") || name.includes("hunter: call of the wild") || name.includes("way of the hunter");
    const wildlands = name.includes("wildlands") || name.includes("breakpoint") || name.includes("division");
    const titans = name.includes("path of titans");

    const isMulti = hasBadgeOnline || hasCoop || hasPvp || dedicatedCoop || rdr2 || tsushima || nfs || farm || sniper || hunter || wildlands || titans;
    const isCross = dedicatedCoop || tsushima || name.includes("unbound") || farm || name.includes("sniper elite 5") || titans;

    let type = "Single Player Only", mode = "Offline Only";
    const both = "Online & Offline Playable";
    if (dedicatedCoop) { type = "Co-Op Only (2-Player)"; mode = "Online Play Required"; }
    else if (rdr2) { type = "Solo Story + Red Dead Online (Up to 32 Players)"; mode = both; }
    else if (hunter) { type = "Solo Reserves + Online Co-Op Hunting (Up to 4-8 Players)"; mode = both; }
    else if (tsushima) { type = "Solo Campaign + Legends Co-Op (2-4)"; mode = both; }
    else if (sniper) { type = "Solo Campaign + Co-Op & Invasion (2-16)"; mode = both; }
    else if (farm) { type = "Solo Farm + Online Co-Op (6-Player)"; mode = both; }
    else if (nfs) { type = "Solo Story + Online Racing (8-16)"; mode = both; }
    else if (wildlands) { type = "Solo Campaign + Online Co-Op (4-Player)"; mode = both; }
    else if (hasCoop && hasPvp) { type = "Solo Campaign + Co-Op & Online PvP"; mode = both; }
    else if (hasCoop) { type = "Solo Campaign + Online Co-Op"; mode = both; }
    else if (hasPvp) { type = "Solo Story + Online Multiplayer"; mode = both; }

    return {
        isMultiplayer: isMulti,
        isCoOpOnly: dedicatedCoop,
        hasCampaign: dedicatedCoop ? true : (hasCamp || !titans),
        multiplayerType: type,
        onlineMode: mode,
        isCrossPlatform: isCross,
        crossPlayPlatforms: isCross ? ["PS5", "PS4", "PC", "Xbox Series X|S"] : ["PlayStation Network"],
        psPlusRequired: hasBadgePsPlus || (isMulti && !name.includes("free to play"))
    };
}

/* ---------- Play-session (hours) tracker ---------- */
function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline, activeTitleId) {
    const playSessions = JSON.parse(JSON.stringify(existingUserData?.playSessions || {}));
    const now = Date.now();
    const primaryKey = activeCommId || activeTitleId;

    for (const [id, s] of Object.entries(playSessions)) {
        if (s.isActive && (id !== primaryKey || !isOnline)) {
            const last = s.lastSyncedTime || s.sessionStartTime || now;
            const delta = Math.max(0, Math.floor((now - last) / 1000));
            s.accumulatedSeconds = (s.accumulatedSeconds || 0) + delta;
            s.totalSeconds = Math.round((s.manualBaselineHours || 0) * 3600) + s.accumulatedSeconds;
            s.isActive = false;
            s.sessionStartTime = null;
            s.lastSyncedTime = null;
            s.lastEndedTime = now;
            s.totalFormatted = formatDuration(s.totalSeconds);
            s.totalHours = Math.round((s.totalSeconds / 3600) * 10) / 10;
            console.log(`[SESSION FINALIZED] ${s.title}: +${delta}s, total ${s.totalFormatted}`);
        }
    }

    if (isOnline && primaryKey && primaryKey !== "Dashboard") {
        const cur = playSessions[primaryKey];
        if (!cur) {
            const base = existingUserData?.manualBaselineHours || 0;
            const baseSec = Math.round(base * 3600);
            playSessions[primaryKey] = {
                commId: activeCommId || primaryKey, titleId: activeTitleId || primaryKey, title: activeTitle,
                manualBaselineHours: base, accumulatedSeconds: 0, totalSeconds: baseSec,
                isActive: true, sessionStartTime: now, lastSyncedTime: now,
                totalFormatted: formatDuration(baseSec), totalHours: Math.round((baseSec / 3600) * 10) / 10
            };
            console.log(`[SESSION STARTED] ${activeTitle} (${primaryKey})`);
        } else if (!cur.isActive) {
            cur.isActive = true;
            cur.sessionStartTime = now;
            cur.lastSyncedTime = now;
            console.log(`[SESSION RESUMED] ${activeTitle} (${primaryKey})`);
        } else {
            const last = cur.lastSyncedTime || cur.sessionStartTime || now;
            const delta = Math.max(0, Math.floor((now - last) / 1000));
            cur.accumulatedSeconds = (cur.accumulatedSeconds || 0) + delta;
            cur.lastSyncedTime = now;
            cur.totalSeconds = Math.round((cur.manualBaselineHours || 0) * 3600) + cur.accumulatedSeconds;
            cur.totalFormatted = formatDuration(cur.totalSeconds);
            cur.totalHours = Math.round((cur.totalSeconds / 3600) * 10) / 10;
            console.log(`[CHECKPOINT] +${delta}s for ${activeTitle}, total ${cur.totalFormatted}`);
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    let activeSessionSeconds = 0;
    if (primaryKey && playSessions[primaryKey]) {
        activeSessionSeconds = playSessions[primaryKey].totalSeconds || 0;
        currentGameDurationFormatted = playSessions[primaryKey].totalFormatted || formatDuration(activeSessionSeconds);
    }
    return { playSessions, currentGameDurationFormatted, activeSessionSeconds };
}

/* ============================================================================
 * Ray's Firebase (WRITE) - Admin SDK with FIREBASE_SERVICE_RAY
 * ============================================================================ */
let rayDb = null;
let rayFs = null;

function parseServiceAccount(raw, label) {
    const t = String(raw || "").trim();
    if (!t) throw new Error(`${label} is empty or not passed to this workflow step.`);
    let creds;
    try {
        creds = t.startsWith("{") ? JSON.parse(t) : JSON.parse(Buffer.from(t, "base64").toString("utf-8"));
    } catch (e) {
        throw new Error(`${label} is not valid JSON: ${e.message}`);
    }
    if (typeof creds.private_key === "string") creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    return creds;
}

function getNamedApp(name, creds, databaseURL) {
    const found = getApps().find((a) => a.name === name);
    return found || initializeApp({ credential: cert(creds), databaseURL }, name);
}

function initRayFirebase() {
    const creds = parseServiceAccount(process.env.FIREBASE_SERVICE_RAY, "FIREBASE_SERVICE_RAY");
    const app = getNamedApp("rayApp", creds, RAY_RTDB_URL);
    rayDb = getDatabase(app);
    rayFs = getFirestore(app);
    try { rayFs.settings({ ignoreUndefinedProperties: true }); } catch (e) { /* already configured */ }
    console.log(`[RAY FIREBASE] Connected to project ${creds.project_id} (RTDB + Firestore).`);
}

const col = (name) => rayFs.collection(name);
const rtdbRef = (p) => rayDb.ref(`psn/${p}`);

async function rtdbGet(p) {
    const snap = await rtdbRef(p).once("value");
    return snap.val();
}

async function rtdbSet(p, value) {
    const clean = normalizeForRtdb(value);
    if (clean === undefined) await rtdbRef(p).remove();
    else await rtdbRef(p).set(clean);
}

async function writeCardDelta(onlineId, oldRecord, newRecord) {
    const id = safeKey(onlineId);
    const { patch, full } = computePatch(oldRecord, newRecord);
    const hasOld = oldRecord && Object.keys(filterCard(oldRecord)).length > 0;
    if (!hasOld) {
        await rtdbRef(`gamertags/${id}`).set(full);
        console.log(`[RTDB] ${id}: new card written (${Object.keys(full).length} fields).`);
        return;
    }
    const keys = Object.keys(patch);
    if (!keys.length) { console.log(`[RTDB] ${id}: nothing changed.`); return; }
    await rtdbRef(`gamertags/${id}`).update(patch);
    console.log(`[RTDB] ${id}: updated ${keys.length} field(s): ${keys.slice(0, 10).join(", ")}${keys.length > 10 ? ", ..." : ""}`);
}

async function writeChunkedItems(parentRef, subName, items, prevPages) {
    const colRef = parentRef.collection(subName);
    const size = PULL_CONFIG.CHUNK_ITEMS;
    const pages = Math.ceil(items.length / size);
    const pid = (i) => `page_${String(i).padStart(3, "0")}`;
    for (let i = 0; i < pages; i++) {
        await colRef.doc(pid(i)).set(plain({ page: i, items: items.slice(i * size, (i + 1) * size) }));
    }
    for (let i = pages; i < (prevPages || 0); i++) await colRef.doc(pid(i)).delete();
    return pages;
}

/* ---------- PSN token cache (Firestore system/tokens - private) ---------- */
let tokenStore = {};
let tokenDirty = false;

async function loadTokenStore() {
    try {
        const snap = await col("system").doc("tokens").get();
        tokenStore = snap.exists ? (snap.data().tokens || {}) : {};
        console.log(`[TOKENS] Loaded ${Object.keys(tokenStore).length} cached session(s).`);
    } catch (e) {
        console.warn(`[TOKENS] Could not load cache: ${e.message}`);
        tokenStore = {};
    }
}

async function saveTokenStore() {
    if (!tokenDirty) return;
    try {
        await col("system").doc("tokens").set(plain({ tokens: tokenStore, updatedAt: nowEt() }));
        tokenDirty = false;
    } catch (e) {
        console.warn(`[TOKENS] Could not save cache: ${e.message}`);
    }
}

/* ============================================================================
 * Kevin's Firebase (READ-ONLY): PSN IDs + NPSSO cookies only
 * ============================================================================ */
async function readKevinNodes() {
    let users = {}, secrets = {}, ok = false;
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (raw) {
        try {
            const creds = parseServiceAccount(raw, "GCP_SA_KEY_WEBSITE");
            const db = getDatabase(getNamedApp("kevinApp", creds, KEVIN_RTDB_URL));
            const [u, s] = await Promise.all([db.ref("users").once("value"), db.ref("user_secrets").once("value")]);
            users = u.val() || {};
            secrets = s.val() || {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] Admin read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] Admin read failed (${e.message}); trying FIREBASE_AUTH_SECRET.`);
        }
    }
    if (!ok) {
        const q = process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "";
        try {
            const [uRes, sRes] = await Promise.all([
                fetch(`${KEVIN_RTDB_URL}/users.json${q}`).then((r) => r.json()),
                fetch(`${KEVIN_RTDB_URL}/user_secrets.json${q}`).then((r) => r.json())
            ]);
            if (uRes && uRes.error) console.warn(`[KEVIN DB] /users: ${uRes.error}`);
            if (sRes && sRes.error) console.warn(`[KEVIN DB] /user_secrets: ${sRes.error}`);
            users = uRes && typeof uRes === "object" && !uRes.error ? uRes : {};
            secrets = sRes && typeof sRes === "object" && !sRes.error ? sRes : {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] REST read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] REST read failed: ${e.message}`);
        }
    }
    return { users, secrets, ok };
}

async function readKevinCredentials() {
    const { users, secrets, ok } = await readKevinNodes();
    const pick = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "");

    const coreNpssos = {};
    const coreIds = {};
    const cookieUpdated = {};
    for (const m of CORE_PACK) {
        coreNpssos[m.key] = normalizeNpsso(process.env[m.env] || "");
        coreIds[m.key] = m.id;
    }
    const guests = [];

    for (const [emailKey, u] of Object.entries(users)) {
        if (!u || typeof u !== "object") continue;
        const sec = (secrets && secrets[emailKey]) || {};
        const gaming = u.gaming_platforms || {};
        const rawId = pick(u.psn_account_id, sec.psn_account_id, gaming.psn_account_id);
        const rawTag = pick(u.psn_username, gaming.psn_username, u.psn_online_id);
        const cookie = normalizeNpsso(String(pick(sec.psn_npsso, u.psn_npsso, gaming.psn_npsso) || ""));
        const idStr = rawId !== undefined ? String(rawId).trim() : "";
        const tag = rawTag !== undefined ? String(rawTag).trim() : "";
        const updatedAt = sec.updated_at || u.updated_at || null;

        const core = CORE_PACK.find((m) =>
            (idStr && idStr === m.id) ||
            (tag && tag.toLowerCase() === m.tag.toLowerCase()) ||
            (m.emailMatch && emailKey.toLowerCase().includes(m.emailMatch)));
        if (core) {
            if (idStr) coreIds[core.key] = idStr;
            if (cookie) { coreNpssos[core.key] = cookie; cookieUpdated[core.key] = updatedAt; }
        } else if (idStr || cookie) {
            guests.push({ emailKey, accountId: idStr || null, tag, npsso: cookie, updatedAt });
        }
    }
    console.log(`[KEVIN DB] Cookies: ${CORE_PACK.map((m) => `${m.tag}=${!!coreNpssos[m.key]}`).join(", ")}; guests=${guests.length}`);
    return { coreNpssos, coreIds, cookieUpdated, guests, usersReadOk: ok };
}

/* ============================================================================
 * PSN authentication + failover
 * ============================================================================ */
async function getAuthenticated(userKey, npsso) {
    const fp = npsso ? fingerprint(npsso) : null;
    let cur = tokenStore[userKey] || {};
    if (fp && cur.cookieFp && cur.cookieFp !== fp) {
        cur = {};
        delete tokenStore[userKey];
        tokenDirty = true;
    }
    const now = Math.floor(Date.now() / 1000);

    if (cur.accessToken && cur.expiryTime > now + 300) {
        try {
            await getUserRegion({ accessToken: cur.accessToken }, "me");
            diag.auth[userKey] = "ACTIVE_ACCESS_TOKEN";
            return { accessToken: cur.accessToken, npssoValid: true, userKey };
        } catch (e) { cur.accessToken = null; }
    }

    if (cur.refreshToken) {
        try {
            const r = await exchangeRefreshTokenForAuthTokens(cur.refreshToken);
            if (r && r.accessToken) {
                tokenStore[userKey] = {
                    accessToken: r.accessToken,
                    refreshToken: r.refreshToken || cur.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (r.expiresIn || 3600),
                    cookieFp: fp || cur.cookieFp || null
                };
                tokenDirty = true;
                diag.auth[userKey] = "ACTIVE_VIA_REFRESH";
                return { accessToken: r.accessToken, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[AUTH] Refresh rejected for ${userKey}: ${e.message}`);
            delete tokenStore[userKey];
            tokenDirty = true;
        }
    }

    if (npsso) {
        try {
            console.log(`[AUTH] Exchanging NPSSO for ${userKey}...`);
            const code = await exchangeNpssoForCode(npsso);
            const a = await exchangeCodeForAccessToken(code);
            if (a && a.accessToken) {
                tokenStore[userKey] = {
                    accessToken: a.accessToken,
                    refreshToken: a.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (a.expiresIn || 3600),
                    cookieFp: fp
                };
                tokenDirty = true;
                diag.auth[userKey] = "ACTIVE_VIA_NPSSO";
                return { accessToken: a.accessToken, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[AUTH] NPSSO rejected for ${userKey}: ${e.message}`);
            diag.auth[userKey] = "EXPIRED_NPSSO";
            return null;
        }
    }
    diag.auth[userKey] = npsso ? "EXPIRED_NPSSO" : "NO_COOKIE";
    return null;
}

async function resolveSquadSession(creds) {
    const auths = {};
    for (const m of CORE_PACK) auths[m.key] = await getAuthenticated(m.key, creds.coreNpssos[m.key]);

    let masterAuth = null, runnerTag = "None", runnerState = "SNAPSHOT_FALLBACK";
    for (const m of CORE_PACK) {
        if (auths[m.key]) {
            masterAuth = auths[m.key];
            runnerTag = m.tag;
            runnerState = `RUNNING_ON_${m.key.toUpperCase()}`;
            console.log(`[MASTER] Squad runner: ${m.tag}`);
            break;
        }
    }
    const guestAuths = {};
    for (const g of creds.guests) {
        if (!g.npsso) continue;
        guestAuths[g.emailKey] = await getAuthenticated(g.emailKey, g.npsso);
        if (!masterAuth && guestAuths[g.emailKey]) {
            masterAuth = guestAuths[g.emailKey];
            runnerTag = g.tag || g.emailKey;
            runnerState = `RUNNING_ON_GUEST_${runnerTag}`;
            console.log(`[MASTER] Promoted guest ${runnerTag} to runner.`);
        }
    }
    return { masterAuth, auths, guestAuths, runnerTag, runnerState };
}

/* ============================================================================
 * Game catalog (Firestore games/{Game_Name}) + index (meta/gameIndex)
 * ============================================================================ */
let gameIndex = {};
let gameIndexDirty = false;
const gameMemo = {};

async function loadGameIndex() {
    try {
        const snap = await col("meta").doc("gameIndex").get();
        gameIndex = snap.exists ? (snap.data().entries || {}) : {};
        console.log(`[GAMES] Index holds ${Object.keys(gameIndex).length} title(s).`);
    } catch (e) {
        console.warn(`[GAMES] Could not load index: ${e.message}`);
        gameIndex = {};
    }
}

async function saveGameIndex() {
    if (!gameIndexDirty) return;
    await col("meta").doc("gameIndex").set(plain({ entries: gameIndex, updatedAt: nowEt() }));
    gameIndexDirty = false;
}

async function getGame(commId) {
    const id = String(commId || "").toUpperCase();
    if (gameMemo[id]) return gameMemo[id];
    const entry = gameIndex[id];
    if (!entry) return null;
    const snap = await col("games").doc(entry.key).get();
    if (!snap.exists) return null;
    gameMemo[id] = snap.data();
    return gameMemo[id];
}

function chooseGameKey(commId, name) {
    const existing = gameIndex[commId];
    if (existing) return existing.key;
    const slug = toGameKey(name);
    const used = new Set(Object.values(gameIndex).map((e) => e.key));
    return used.has(slug) ? `${slug}_${commId}` : slug;
}

async function saveGame(commId, data) {
    const id = String(commId).toUpperCase();
    const key = chooseGameKey(id, data.name);
    const doc = { ...data, gameKey: key };
    await col("games").doc(key).set(plain(doc));
    gameIndex[id] = { key, lastUpdated: doc.lastUpdated, trophyCount: (doc.trophies || []).length };
    gameIndexDirty = true;
    gameMemo[id] = doc;
    return doc;
}

/* ---------- Friends directory ----------
 * friendsDirectory/{onlineId}  one doc per friend, named by their PSN online ID.
 * system/friendsIndex          private accountId -> slim profile lookup (keeps reads low).
 */
let friendsDirectoryCache = {};
let friendsDirectoryLoaded = false;
const dirtyFriendIds = new Set();
let friendLookupsThisRun = 0;

const slimFriend = (f) => ({ accountId: f.accountId, onlineId: f.onlineId || null, avatar: f.avatar || null, isPlus: !!f.isPlus, resolvedAt: f.resolvedAt, ...(f.unresolved ? { unresolved: true } : {}) });

async function ensureFriendsDirectory() {
    if (friendsDirectoryLoaded) return;
    friendsDirectoryLoaded = true;
    try {
        const snap = await col("system").doc("friendsIndex").get();
        if (snap.exists) { friendsDirectoryCache = snap.data().entries || {}; return; }
    } catch (e) { console.warn(`[FRIENDS] Could not load index: ${e.message}`); return; }

    // One-time migration from the old bucket_00..bucket_15 layout.
    for (let b = 0; b < LEGACY_FRIEND_BUCKETS; b++) {
        const ref = col("friendsDirectory").doc(`bucket_${String(b).padStart(2, "0")}`);
        try {
            const s = await ref.get();
            if (!s.exists) continue;
            for (const [id, v] of Object.entries(s.data().entries || {})) { friendsDirectoryCache[id] = v; dirtyFriendIds.add(id); }
            await ref.delete();
        } catch (e) { console.warn(`[FRIENDS] Migration skipped ${b}: ${e.message}`); }
    }
    console.log(`[FRIENDS] Migrated ${dirtyFriendIds.size} friend(s) to per-onlineId docs.`);
}

async function saveFriendsDirectory() {
    if (!dirtyFriendIds.size) return;
    let wrote = 0, noName = 0, failed = 0;
    for (const id of dirtyFriendIds) {
        const f = friendsDirectoryCache[id];
        if (!f || !f.onlineId) { noName++; continue; }
        try { await col("friendsDirectory").doc(safeKey(f.onlineId)).set(plain(f)); wrote++; }
        catch (e) { failed++; console.warn(`[FRIENDS] Could not write ${f.onlineId}: ${e.message}`); }
    }
    const entries = {};
    for (const [id, f] of Object.entries(friendsDirectoryCache)) entries[id] = slimFriend(f);
    await col("system").doc("friendsIndex").set(plain({ entries, updatedAt: nowEt() }));
    console.log(`[FRIENDS] directory docs written: ${wrote}, friends without a resolvable PSN name: ${noName}, failed: ${failed}`);
    dirtyFriendIds.clear();
}

async function resolveFriendDirectory(auth, ids = []) {
    await ensureFriendsDirectory();
    const now = Date.now();
    for (const id of ids) {
        const key = String(id);
        const cached = friendsDirectoryCache[key];
        if (cached) {
            const fresh = !cached.unresolved || now - new Date(cached.resolvedAt || 0).getTime() < PULL_CONFIG.FRIEND_RETRY_UNRESOLVED_MS;
            if (fresh) continue;
        }
        if (friendLookupsThisRun >= PULL_CONFIG.FRIEND_LOOKUPS_PER_RUN) break;
        friendLookupsThisRun++;
        const p = await callPsn("getProfileFromAccountId(friend)", () => getProfileFromAccountId(auth, key), null);
        friendsDirectoryCache[key] = p
            ? { accountId: key, onlineId: p.onlineId || null, avatar: p.avatars?.[0]?.url || null, isPlus: !!p.isPlus, aboutMe: p.aboutMe || null, resolvedAt: new Date().toISOString() }
            : { accountId: key, onlineId: null, unresolved: true, resolvedAt: new Date().toISOString() };
        dirtyFriendIds.add(key);
    }
}

/* ============================================================================
 * PlayStation Store scraping (best effort)
 * ============================================================================ */
function parseStoreHtmlFeatures(html) {
    const badges = [];
    const accessibility = {};
    const badgeRegex = /<li[^>]*data-qa="gameInfo#releaseInformation#gameBadges#item[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = badgeRegex.exec(html)) !== null) {
        const clean = m[1].replace(/<[^>]*>/g, "").trim();
        if (clean && !badges.includes(clean)) badges.push(clean);
    }
    [
        "PS Plus required for online play", "In-game purchases optional", "Supports up to 4 online players with PS Plus",
        "Supports up to 32 online players with PS Plus", "Online play optional", "Online play required", "1 player",
        "Remote Play supported", "PS5 Version", "PS4 Version", "PS4 Pro Enhanced", "DUALSHOCK 4 vibration",
        "Vibration function and trigger effect supported (DualSense wireless controller)"
    ].forEach((b) => { if (html.includes(b) && !badges.includes(b)) badges.push(b); });

    const access = html.match(/Accessibility Features([\s\S]*?)(?:Game and Legal Info|<footer)/i);
    if (access && access[1]) {
        const lines = access[1].replace(/<[^>]*>/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
        let cat = "General";
        for (const line of lines) {
            if (["Visuals", "Subtitles and Captions", "Controls", "Gameplay", "Audio"].includes(line)) {
                cat = line;
                if (!accessibility[cat]) accessibility[cat] = [];
            } else if (accessibility[cat] && line.length > 3 && !accessibility[cat].includes(line)) {
                accessibility[cat].push(line);
            }
        }
    }
    return { badges, accessibility };
}

async function queryStoreMetadata(identifier, isProductSku = false) {
    if (!identifier) return null;
    try {
        const pathType = isProductSku ? "product" : "concept";
        const res = await fetch(`https://store.playstation.com/en-us/${pathType}/${identifier}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });
        if (!res || !res.ok) return null;
        const html = await res.text();
        let nextData = null;
        const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nd && nd[1]) { try { nextData = JSON.parse(nd[1]); } catch (e) { /* ignore */ } }
        const pageProps = nextData?.props?.pageProps || {};
        const entity = pageProps.concept || pageProps.product || {};
        const features = parseStoreHtmlFeatures(html);

        let desc = entity.longDescription || entity.description || null;
        if (!desc) {
            const dm = html.match(/<p data-qa="gameInfo#releaseInformation#description"[^>]*>([\s\S]*?)<\/p>/i) ||
                       html.match(/<meta property="og:description" content="([\s\S]*?)"/i);
            if (dm && dm[1]) desc = dm[1].replace(/<[^>]*>/g, "\n").trim();
        }
        const def = entity.defaultProduct || (isProductSku ? entity : {});
        const media = entity.media || def.media || [];
        const screenshots = Array.isArray(media)
            ? media.filter((x) => x.type === "IMAGE").map((x) => resolveGamePosterArt([x.url])).filter(Boolean) : [];
        const editions = Array.isArray(entity.products)
            ? entity.products.map((p) => ({ productId: p.id, name: p.name, price: p.price?.displayPrice || "Store Listing", isFree: !!p.price?.isFree, platforms: p.platforms || [] })) : [];

        return {
            conceptId: isProductSku ? (entity.conceptId || null) : String(identifier),
            productId: isProductSku ? String(identifier) : (def.id || null),
            storeUrl: `//store.playstation.com/en-us/${pathType}/${identifier}`,
            name: entity.name || def.name || null,
            publisher: entity.publisherName || entity.publisher || def.publisherName || null,
            releaseDate: entity.releaseDate || def.releaseDate || null,
            genres: Array.isArray(entity.genres) ? entity.genres : (def.genres || []),
            price: def.price?.displayPrice || "Store Listing",
            discountedPrice: def.price?.discountedPrice || null,
            isFree: !!def.price?.isFree,
            rating: entity.contentRating?.name || def.contentRating?.name || null,
            ratingDescriptors: entity.contentRating?.descriptors || def.contentRating?.descriptors || [],
            badges: features.badges,
            accessibility: features.accessibility,
            screenshots, editions,
            longDescription: desc,
            fetchedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn(`[STORE] ${identifier}: ${err.message}`);
        return null;
    }
}

async function searchStoreConceptByName(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    try {
        const q = encodeURIComponent(gameName.replace(/®|™/g, "").trim());
        const url = `https://web.np.playstation.com/api/graphql/v1/op?operationName=getSearchResults&variables=%7B%22searchTerm%22%3A%22${q}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22d77d9a513cbdba90e2908f4c17c4613271789721d15c7e0d37e6f3b7d7b0b63e%22%7D%7D`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "x-psn-app-ver": "latest" } });
        if (!res || !res.ok) return null;
        const data = await res.json();
        for (const item of data?.data?.universalSearch?.results || []) {
            const id = item.id || extractConceptIdFromText(item.url);
            if (id) return String(id);
        }
    } catch (e) { /* best effort */ }
    return null;
}

/* ============================================================================
 * Game skeleton (trophy catalog) ingestion -> Firestore games/{key}
 * ============================================================================ */
function enrichDLCGroups(groups, purchased = []) {
    const safePurchased = Array.isArray(purchased) ? purchased : [];
    return (Array.isArray(groups) ? groups : []).map((grp) => {
        const name = grp.name || "Add-On Content";
        const lower = name.toLowerCase().trim();
        const owned = safePurchased.some((p) => p && p.name && String(p.name).toLowerCase().includes(lower)) ||
            (grp.definedTrophies && typeof grp.definedTrophies === "object" && Object.values(grp.definedTrophies).some((c) => c > 0));
        return {
            groupId: grp.trophyGroupId,
            name, title: name,
            description: `Official PlayStation add-on expansion pack: ${name}.`,
            price: "Store Listing",
            size: estimateDlcFileSize(name),
            image: resolveGamePosterArt([grp.trophyGroupIconUrl]),
            isOwned: owned,
            isDLC: true,
            definedTrophies: grp.definedTrophies || {},
            includedItems: []
        };
    });
}

async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, purchased, subTitleId, initialConceptId) {
    if (!commId || commId === "Dashboard" || !auth) return null;
    const id = String(commId).trim().toUpperCase();
    if (!id.startsWith("NPWR")) return getGame(id);

    const prev = (await getGame(id)) || {};
    try {
        let opt = { npServiceName: platform === "PS5" ? "trophy2" : "trophy" };
        let meta = await callPsn("getTitleTrophies", () => getTitleTrophies(auth, id, "all", opt), null, true);
        if (!meta || !meta.trophies || !meta.trophies.length) {
            const alt = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altRes = await callPsn("getTitleTrophies(alt)", () => getTitleTrophies(auth, id, "all", { npServiceName: alt }), null, true);
            if (altRes && altRes.trophies && altRes.trophies.length) { opt = { npServiceName: alt }; meta = altRes; }
        }
        if ((!meta || !meta.trophies || !meta.trophies.length) && prev.trophies && prev.trophies.length) {
            console.warn(`[GAMES] Sony returned 0 trophies for ${id}; keeping ${prev.trophies.length} stored.`);
            return prev;
        }

        let groupsRes = await callPsn("getTitleTrophyGroups", () => getTitleTrophyGroups(auth, id, opt), null, true);
        if (!groupsRes || !groupsRes.trophyGroups) {
            const alt = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            groupsRes = await callPsn("getTitleTrophyGroups(alt)", () => getTitleTrophyGroups(auth, id, { npServiceName: alt }), { trophyGroups: [] }, true);
        }

        const safePoster = resolveGamePosterArt([posterArt, iconArt, prev.posterArt, prev.trophyTitleIconUrl]);
        const hasMeta = meta && meta.trophies && meta.trophies.length > 0;
        const mapped = hasMeta ? meta.trophies.map((t) => {
            const pt = (prev.trophies || []).find((p) => p.trophyId === t.trophyId) || {};
            const rate = t.trophyEarnedRate || pt.earnedRate || "0.0";
            const rare = t.trophyRare !== undefined && t.trophyRare !== null ? t.trophyRare : (pt.trophyRare ?? null);
            const rank = (t.trophyType || "bronze").toLowerCase();
            const detail = t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available.");
            return {
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy", title: t.trophyName || "Unknown Trophy",
                description: detail, detail,
                type: rank, rank: rank.toUpperCase(),
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: t.trophyProgressTargetValue ? parseInt(t.trophyProgressTargetValue, 10) : 0,
                rarity: `${rate}%`, trophyRare: rare, rarityTier: trophyRarityLabel(rare),
                rewardName: t.trophyRewardName || pt.rewardName || null,
                rewardImage: t.trophyRewardImageUrl || pt.rewardImage || null,
                earnedRate: rate, difficultyTier: getDifficultyTier(rate),
                hidden: !!t.trophyHidden
            };
        }) : (prev.trophies || []);

        const rawGroups = groupsRes?.trophyGroups?.length
            ? groupsRes.trophyGroups.map((g) => ({
                ...g, trophyGroupId: g.trophyGroupId, name: g.trophyGroupName || "Base Game",
                trophyGroupIconUrl: g.trophyGroupIconUrl || null, definedTrophies: g.definedTrophies || {}
            }))
            : (prev.groups || []);

        const name = gameName || prev.name || "PlayStation Game";
        const cusa = subTitleId || prev.cusaId || prev.titleId || null;
        let concept = initialConceptId || prev.conceptId || extractConceptIdFromText(posterArt) || extractConceptIdFromText(iconArt) || null;
        if (!concept && name !== "PlayStation Game") concept = await searchStoreConceptByName(name);

        let store = prev.storeListing || null;
        const storeAge = store?.fetchedAt ? Date.now() - Date.parse(store.fetchedAt) : Infinity;
        if (!store || (!store.longDescription && storeAge > 7 * 24 * 3600 * 1000)) {
            if (concept) store = await queryStoreMetadata(concept, false);
            if ((!store || !store.longDescription) && cusa) {
                const pl = await queryStoreMetadata(cusa, true);
                if (pl) store = { ...(store || {}), ...pl };
            }
        }

        const badges = store?.badges || [];
        const caps = inferGameCapabilitiesFromTrophies(name, mapped, badges);
        const counts = mapped.reduce((a, c) => { const g = c.type || "bronze"; if (a[g] !== undefined) a[g]++; return a; }, { bronze: 0, silver: 0, gold: 0, platinum: 0 });
        const hasDefined = definedTrophies && typeof definedTrophies === "object" && Object.keys(definedTrophies).length > 0;

        const doc = {
            commId: id, npCommunicationId: id, cusaId: cusa, titleId: cusa,
            conceptId: concept || store?.conceptId || null,
            name,
            description: store?.longDescription || prev.description ||
                `Official PlayStation title: ${name}. Features: ${caps.multiplayerType}. Mode: ${caps.onlineMode}. Cross-platform play: ${caps.isCrossPlatform ? "Supported" : "PlayStation Network"}.`,
            storeListing: store, storeBadges: badges, accessibilityFeatures: store?.accessibility || {},
            platform: platform || prev.platform || "PS5",
            npServiceName: opt.npServiceName,
            posterArt: safePoster,
            trophyTitleIconUrl: iconArt || prev.trophyTitleIconUrl || safePoster,
            fileSize: prev.fileSize || estimateGameFileSize(name, platform),
            fileSizeIsEstimate: true,
            isMultiplayer: caps.isMultiplayer, isCoOpOnly: caps.isCoOpOnly, hasCampaign: caps.hasCampaign,
            multiplayerType: caps.multiplayerType, onlineMode: caps.onlineMode,
            isCrossPlatform: caps.isCrossPlatform, crossPlayPlatforms: caps.crossPlayPlatforms,
            psPlusRequired: caps.psPlusRequired, multiplayerInfo: caps,
            definedTrophies: hasDefined ? definedTrophies : (prev.definedTrophies || counts),
            totalTrophies: mapped.length || prev.totalTrophies || 0,
            trophies: mapped,
            groups: rawGroups,
            dlcs: enrichDLCGroups(rawGroups, purchased),
            ratesPersistedAt: prev.ratesPersistedAt || null,
            lastUpdated: new Date().toISOString()
        };
        const saved = await saveGame(id, doc);
        console.log(`[GAMES] Saved games/${saved.gameKey} (${mapped.length} trophies).`);
        return saved;
    } catch (err) {
        console.warn(`[GAMES] Skeleton failed for ${id}: ${err.message}`);
        return prev && prev.name ? prev : null;
    }
}

async function persistPatchedGame(commId) {
    const id = String(commId).toUpperCase();
    const g = gameMemo[id];
    if (!g) return;
    const last = g.ratesPersistedAt ? Date.parse(g.ratesPersistedAt) : 0;
    if (Date.now() - last < PULL_CONFIG.RATE_PERSIST_MS) return;
    g.ratesPersistedAt = new Date().toISOString();
    await saveGame(id, g);
}

/* ============================================================================
 * Per-title trophy progress for a player
 * ============================================================================ */
async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, skeleton, existingProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;
    const id = String(commId).trim().toUpperCase();
    try {
        let opt = { npServiceName: platform === "PS5" || skeleton?.npServiceName === "trophy2" ? "trophy2" : "trophy" };
        let earnedRes = await callPsn("getUserTrophiesEarnedForTitle", () => getUserTrophiesEarnedForTitle(auth, targetId, id, "all", opt), {}, true);
        let groupRes = await callPsn("getUserTrophyGroupEarningsForTitle", () => getUserTrophyGroupEarningsForTitle(auth, targetId, id, opt), {}, true);

        if (!earnedRes || !earnedRes.trophies || !earnedRes.trophies.length) {
            const alt = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altEarned = await callPsn("getUserTrophiesEarnedForTitle(alt)", () => getUserTrophiesEarnedForTitle(auth, targetId, id, "all", { npServiceName: alt }), {}, true);
            if (altEarned && altEarned.trophies && altEarned.trophies.length) {
                opt = { npServiceName: alt };
                earnedRes = altEarned;
                groupRes = await callPsn("getUserTrophyGroupEarningsForTitle(alt)", () => getUserTrophyGroupEarningsForTitle(auth, targetId, id, opt), {}, true);
            }
        }

        const earnedStatus = [...(earnedRes?.trophies || [])];
        if (earnedRes?.totalItemCount && earnedRes.totalItemCount > earnedStatus.length) {
            let off = earnedStatus.length;
            while (off < earnedRes.totalItemCount) {
                const more = await callPsn("getUserTrophiesEarnedForTitle(page)", () => getUserTrophiesEarnedForTitle(auth, targetId, id, "all", { ...opt, offset: off, limit: 100 }), {}, true);
                const batch = more?.trophies || [];
                if (!batch.length) break;
                earnedStatus.push(...batch);
                off += batch.length;
            }
        }

        const skelTrophies = skeleton?.trophies || [];
        const progressMap = { ...asObjectMap(existingProgress) };
        const earnedList = [];

        earnedStatus.forEach((s) => {
            const sk = skelTrophies.find((t) => t.trophyId === s.trophyId);
            const cur = s.progress !== undefined ? parseInt(s.progress, 10) : (s.trophyProgress !== undefined ? parseInt(s.trophyProgress, 10) : 0);
            const target = sk?.targetValue || (s.trophyProgressTargetValue ? parseInt(s.trophyProgressTargetValue, 10) : 0);
            const rateStr = s.progressRate !== undefined ? `${s.progressRate}%` : null;
            let ratio = null;
            if (target > 0) ratio = `${cur}/${target}`;
            else if (rateStr) ratio = rateStr;
            else if (cur > 0 && !s.earned) ratio = `${cur}%`;
            else if (s.earned) ratio = "100%";

            const rank = (sk?.type || s.trophyType || "bronze").toLowerCase();
            const liveRate = s.trophyEarnedRate !== undefined && s.trophyEarnedRate !== null ? String(s.trophyEarnedRate) : null;
            const rare = s.trophyRare !== undefined && s.trophyRare !== null ? s.trophyRare : (sk?.trophyRare ?? null);
            const rate = liveRate || sk?.earnedRate || "0.0";
            const ts = s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0;

            progressMap[s.trophyId] = {
                trophyId: s.trophyId, gameTitle: titleName, commId: id, npCommunicationId: id,
                name: sk?.name || "Trophy Objective", title: sk?.name || "Trophy Objective",
                detail: sk?.detail || "Objective detail", description: sk?.detail || "Objective detail",
                icon: sk?.icon || null, type: rank, rank: rank.toUpperCase(),
                rarity: `${rate}%`, earnedRate: rate, difficultyTier: getDifficultyTier(rate),
                hidden: !!sk?.hidden, earned: !!s.earned,
                earnedDate: s.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) : null,
                earnedAge: s.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                timestamp: ts,
                currentValue: cur, targetValue: target, trophyProgress: cur, trophyProgressTargetValue: target,
                progressRate: rateStr, subProgressRatio: ratio, progressedDateTime: s.progressedDateTime || null,
                trophyRare: rare, rarityTier: trophyRarityLabel(rare),
                rewardName: sk?.rewardName || null, rewardImage: sk?.rewardImage || null,
                groupId: sk?.groupId || s.trophyGroupId || "default"
            };

            if (s.earned) {
                const p = progressMap[s.trophyId];
                earnedList.push({
                    trophyId: s.trophyId, gameTitle: titleName, commId: id, npCommunicationId: id,
                    name: sk?.name || "Unlocked Trophy", icon: sk?.icon || null, type: rank, rank: rank.toUpperCase(),
                    rarity: p.rarity, earnedRate: p.earnedRate, difficultyTier: p.difficultyTier,
                    timestamp: ts, earnedDate: p.earnedDate, earnedAge: p.earnedAge
                });
            }
        });

        let skeletonPatched = false;
        if (skeleton && Array.isArray(skeleton.trophies)) {
            for (const st of skeleton.trophies) {
                const ov = progressMap[st.trophyId];
                if (ov && ov.earnedRate && ov.earnedRate !== "0.0" && st.earnedRate !== ov.earnedRate) {
                    st.earnedRate = ov.earnedRate;
                    st.rarity = `${ov.earnedRate}%`;
                    st.trophyRare = ov.trophyRare ?? st.trophyRare ?? null;
                    st.rarityTier = ov.rarityTier || st.rarityTier || null;
                    st.difficultyTier = getDifficultyTier(ov.earnedRate);
                    skeletonPatched = true;
                }
            }
        }

        earnedList.sort((a, b) => a.timestamp - b.timestamp);
        earnedList.forEach((t, i) => {
            t.intervalBetweenPreviousTrophy = i === 0 ? "First Trophy" : formatDuration(Math.floor((t.timestamp - earnedList[i - 1].timestamp) / 1000));
            if (progressMap[t.trophyId]) progressMap[t.trophyId].intervalBetweenPreviousTrophy = t.intervalBetweenPreviousTrophy;
        });

        return { progressMap, earnedList, groupEarnings: groupRes?.trophyGroups || [], skeletonPatched, ok: earnedStatus.length > 0 };
    } catch (e) {
        console.warn(`[PROGRESS] Preserved existing progress for ${id}: ${e.message}`);
        return { progressMap: asObjectMap(existingProgress), earnedList: [], groupEarnings: [], skeletonPatched: false, ok: false };
    }
}

/* ============================================================================
 * Presence delta gate: decide whether a full pull is needed
 * ============================================================================ */
async function evaluateUserActivityDelta(auth, targetId, scope, existing, force) {
    let rawPresence = null, liveOnline = false, liveTitle = "Dashboard", liveStatus = null;
    if (auth) {
        try {
            const bp = normalizeBasicPresence(await getBasicPresence(auth, scope));
            rawPresence = bp;
            const st = bp?.primaryPlatformInfo?.onlineStatus || bp?.onlineStatus || "offline";
            liveOnline = st !== "offline";
            const gi = bp?.gameTitleInfoList?.[0] || bp?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            liveTitle = gi.titleName || gi.npTitleName || gi.formatValue || "Dashboard";
            liveStatus = liveOnline ? extractGameStatus(bp) : null;
        } catch (e) { /* treated as offline */ }
    }
    const base = { rawPresence, liveOnline, liveGameStatus: liveStatus };

    if (!existing) return { hasDelta: true, reason: "INITIAL_CREATION", ...base };
    if (force) return { hasDelta: true, reason: "MANUAL_FORCE", ...base };

    const storedOnline = !!existing.online;
    const hasActive = Object.values(existing.playSessions || {}).some((s) => s.isActive);
    if (hasActive && !liveOnline) return { hasDelta: true, reason: "SESSION_LOGOUT_FINALIZATION", ...base };

    const needsBackfill = existing.gameStatus === undefined;
    if (!liveOnline && !storedOnline) {
        if (needsBackfill) return { hasDelta: true, statusOnly: true, reason: "GAME_STATUS_BACKFILL", ...base };
        return { hasDelta: false, reason: "OFFLINE_SKIPPED", ...base };
    }
    if (liveOnline !== storedOnline) {
        return { hasDelta: true, reason: `STATUS_CHANGE (${storedOnline ? "ONLINE" : "OFFLINE"} -> ${liveOnline ? "ONLINE" : "OFFLINE"})`, ...base };
    }
    if (liveOnline) {
        const a = (existing.currentGame || "Dashboard").toLowerCase().trim();
        const b = liveTitle.toLowerCase().trim();
        if (a !== b) return { hasDelta: true, reason: `GAME_SWITCH (${a} -> ${b})`, ...base };

        const stats = await callPsn("getUserTrophyProfileSummary(delta)", () => getUserTrophyProfileSummary(auth, targetId), null, true);
        if (stats && stats.earnedTrophies) {
            const e = stats.earnedTrophies;
            const liveTotal = (e.platinum || 0) + (e.gold || 0) + (e.silver || 0) + (e.bronze || 0);
            const storedTotal = existing.trophySummary?.total || 0;
            if (liveTotal !== storedTotal) return { hasDelta: true, reason: `NEW_TROPHY (${storedTotal} -> ${liveTotal})`, ...base };
            if ((stats.trophyLevel || 0) !== (existing.level || 0)) return { hasDelta: true, reason: "LEVEL_DELTA", ...base };
        }
        const storedStatus = existing.gameStatus || null;
        if (storedStatus !== liveStatus) {
            return { hasDelta: true, statusOnly: true, reason: `GAME_STATUS_CHANGE ("${storedStatus || "none"}" -> "${liveStatus || "none"}")`, ...base };
        }
    }
    if (needsBackfill) return { hasDelta: true, statusOnly: true, reason: "GAME_STATUS_BACKFILL", ...base };
    return { hasDelta: false, reason: "UNCHANGED", ...base };
}

async function applyStatusOnlyUpdate(onlineId, existing, liveGameStatus) {
    const stamp = nowEt();
    await rtdbRef(`gamertags/${safeKey(onlineId)}`).update({ gameStatus: liveGameStatus || "", gameStatusUpdated: stamp });
    return { ...existing, gameStatus: liveGameStatus || "", gameStatusUpdated: stamp };
}

/* ============================================================================
 * Full player pull. Returns the RTDB card (does not write it).
 * Writes bulky/slow data to Firestore as a side effect.
 * ============================================================================ */
const friendsByPlayer = {};
let heavyRefreshHappened = false;

async function getFullUserData(ctx) {
    const { auth, gamerTag, isSelf, targetId, existing, force } = ctx;
    if (!auth) return { card: existing || null };
    const apiTarget = String(targetId || "me");

    try {
        const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(auth, apiTarget), null);
        const onlineId = profile?.onlineId || gamerTag || existing?.onlineId || apiTarget;
        const accountId = String(profile?.accountId || (apiTarget !== "me" ? apiTarget : existing?.accountId) || "");

        let rawP = ctx.rawPresence;
        if (!rawP) {
            try { rawP = normalizeBasicPresence(await getBasicPresence(auth, isSelf ? "me" : apiTarget)); } catch (e) { /* offline */ }
        }
        rawP = rawP || { primaryPlatformInfo: { onlineStatus: "offline", platform: null }, gameTitleInfoList: [] };
        const isOnline = (rawP?.primaryPlatformInfo?.onlineStatus || rawP?.onlineStatus || "offline") !== "offline";

        /* Player went offline with a session open: bank it and stop. */
        if (!isOnline && existing && Object.values(existing.playSessions || {}).some((s) => s.isActive)) {
            console.log(`[OFFLINE CLOSE] Finalizing session for ${onlineId}.`);
            const { playSessions } = updateGameSessionTracking(existing, null, "Dashboard", false, null);
            const art = existing.art || existing.posterArt || existing.currentGameArt || null;
            return {
                card: {
                    ...existing, online: false, currentGame: "Dashboard", currentGameId: null, gameKey: null, commId: null, conceptId: null,
                    lastPlayedGame: existing.currentGame && existing.currentGame !== "Dashboard" ? existing.currentGame : (existing.lastPlayedGame || null),
                    lastPlayedGameKey: existing.gameKey || existing.lastPlayedGameKey || null,
                    lastPlayedCommId: existing.commId || existing.lastPlayedCommId || null, gameStatus: "",
                    sessionStartedAt: "", sessionStartedAtMs: 0, currentSessionSeconds: 0,
                    art, posterArt: art, image: art, currentGameArt: art,
                    playSessions, lastUpdated: nowEt()
                }
            };
        }

        const playerRef = col("players").doc(safeKey(onlineId));
        const playerSnap = await playerRef.get();
        const player = playerSnap.exists ? playerSnap.data() : {};
        const heavyAgeMs = Date.now() - (Number(player.heavyPulledAtMs) || 0);
        const doHeavy = force || !player.heavyPulledAtMs || heavyAgeMs >= PULL_CONFIG.HEAVY_REFRESH_MS;

        let region = { country: player.region || existing?.region || "US", language: player.language || existing?.language || "en" };
        let shareableProfile = player.shareableProfile || null;
        let friendsList = (player.friendsList || []).map(String);
        let purchasedGames = null;
        let purchasedCount = player.purchasedCount || existing?.purchasedCount || 0;
        let priv = null;

        const trophyTitleSync = { ...(player.trophyTitleSync || {}) };
        let playerDirty = false;

        if (doHeavy) {
            heavyRefreshHappened = true;
            console.log(`[HEAVY] Pulling slow-changing account data for ${onlineId}...`);
            priv = {};
            if (isSelf) {
                const reg = await callPsn("getUserRegion", () => getUserRegion(auth, "me"), null);
                if (reg) region = reg;
                const dev = await callPsn("getAccountDevices", () => getAccountDevices(auth), null);
                if (dev) priv.devices = dev?.devices || (Array.isArray(dev) ? dev : []);
                const share = await callPsn("getProfileShareableLink", () => getProfileShareableLink(auth, apiTarget), null);
                if (share) shareableProfile = share;
            }
            const fp = await paginateCollect(
                "getUserFriendsAccountIds",
                (offset, size) => getUserFriendsAccountIds(auth, apiTarget, { limit: size, offset }),
                (res) => res?.friends || [], PULL_CONFIG.PAGE_SIZE_FRIENDS);
            if (fp.pagesRaw.length) friendsList = Array.from(new Set(fp.items.map(String)));

            if (isSelf) {
                const blocked = await callPsn("getUserBlockedAccountIds", () => getUserBlockedAccountIds(auth), null);
                if (blocked) priv.blockedUsers = blocked?.blockedUsers || [];
                const reqs = await callPsn("getUserFriendsRequests", () => getUserFriendsRequests(auth), null);
                if (reqs) {
                    priv.friendRequests = reqs?.receivedRequests || [];
                    priv.sentFriendRequests = reqs?.sentRequests || [];
                }
                const pp = await paginateCollect(
                    "getPurchasedGames",
                    (offset, size) => getPurchasedGames(auth, { size, start: offset, limit: size, offset, platform: ["PS4", "PS5"] }),
                    (res) => pickList(res, ["data.purchasedTitlesRetrieve.games", "titles", "games"]), PULL_CONFIG.PAGE_SIZE_PURCHASED);
                if (pp.pagesRaw.length) { purchasedGames = pp.items; purchasedCount = pp.items.length; }
            }
        } else {
            console.log(`[LIGHT] ${onlineId}: heavy refresh in ${Math.max(0, Math.round((PULL_CONFIG.HEAVY_REFRESH_MS - heavyAgeMs) / 60000))} min.`);
        }
        friendsByPlayer[onlineId] = friendsList;

        /* Titles + played games */
        const titlesPull = await paginateCollect(
            "getUserTitles", (offset, size) => getUserTitles(auth, apiTarget, { limit: size, offset }),
            (res) => res?.trophyTitles || [], PULL_CONFIG.PAGE_SIZE_TITLES);
        const sortedTitles = titlesPull.items;
        const totalGames = titlesPull.pagesRaw[titlesPull.pagesRaw.length - 1]?.totalItemCount || sortedTitles.length;
        sortedTitles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const playedPull = await paginateCollect(
            "getUserPlayedGames", (offset, size) => getUserPlayedGames(auth, apiTarget, { limit: size, offset }),
            (res) => pickList(res, ["titles", "data.gameLibraryTitlesRetrieve.games"]), PULL_CONFIG.PAGE_SIZE_PLAYED);
        const telemetry = [...playedPull.items];

        if (isSelf) {
            const lib = await paginateCollect(
                "getRecentlyPlayedGames", (offset, size) => getRecentlyPlayedGames(auth, { limit: size, offset }),
                (res) => pickList(res, ["data.gameLibraryTitlesRetrieve.games", "data.recentlyPlayedTitles", "recentlyPlayedTitles", "titles"]),
                PULL_CONFIG.PAGE_SIZE_LIBRARY);
            const seen = new Set(telemetry.map((g) => g.titleId || g.npTitleId).filter(Boolean));
            lib.items.forEach((g) => {
                const tid = g.titleId || g.npTitleId;
                if (tid && seen.has(tid)) return;
                telemetry.push({ ...g, conceptId: g.conceptId || g.concept?.id || null });
                if (tid) seen.add(tid);
            });
        }

        if (doHeavy) await resolveFriendDirectory(auth, friendsList);

        const earliest = sortedTitles.reduce((old, cur) => {
            const d = new Date(cur.lastUpdatedDateTime || cur.lastPlayed);
            return !old || d < old ? d : old;
        }, null);

        /* Merge telemetry + trophy titles into one game list */
        const merged = new Map();
        telemetry.forEach((g) => {
            const commId = g.npCommunicationId;
            const titleId = g.titleId || g.npTitleId;
            if (!commId && !titleId) return;
            const secs = parseIsoDuration(g.playDuration);
            const art = resolveGamePosterArt([g.image?.url, g.imageUrl, g.conceptIconUrl, g.boxart, g.trophyTitleIconUrl]);
            const rec = {
                ...g,
                npCommunicationId: commId || null, npTitleId: titleId || null, titleId: titleId || null,
                name: g.name || "Unknown Game", platform: normalizePlatform(g),
                art, posterArt: art,
                conceptId: g.conceptId || g.concept?.id || extractConceptIdFromText(g.conceptIconUrl) || null,
                playCount: g.playCount || 1, playDuration: g.playDuration || null,
                nativePlaytimeSeconds: secs, nativePlaytimeFormatted: formatDuration(secs),
                nativePlaytimeHours: Math.round((secs / 3600) * 10) / 10,
                nativePlaytimeWholeHours: Math.floor(secs / 3600),
                nativePlaytimeAppStyle: `${Math.floor(secs / 3600)}h`,
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            };
            if (commId) merged.set(commId, rec);
            if (titleId) merged.set(titleId, rec);
        });

        const byName = new Map();
        telemetry.forEach((g) => {
            const rec = merged.get(g.npCommunicationId) || merged.get(g.titleId || g.npTitleId);
            const k = normalizeTitleName(g.name);
            if (rec && k && !byName.has(k)) byName.set(k, rec);
        });

        sortedTitles.forEach((t) => {
            const commId = t.npCommunicationId;
            const titleId = t.npTitleId;
            if (!commId && !titleId) return;
            const nameMatch = byName.get(normalizeTitleName(t.trophyTitleName || t.name));
            let ex = (commId && merged.get(commId)) || (titleId && merged.get(titleId)) || null;
            if (!ex && nameMatch && !nameMatch.npCommunicationId) ex = nameMatch;
            if (!ex) {
                ex = {
                    npCommunicationId: commId || null, npTitleId: titleId || null,
                    name: t.trophyTitleName || t.name || "Unknown Game", platform: normalizePlatform(t),
                    art: null, posterArt: null, playCount: t.playCount || 1,
                    lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
                };
                if (nameMatch) {
                    ex.titleId = nameMatch.titleId || null;
                    ex.conceptId = nameMatch.conceptId || null;
                    ex.playDuration = nameMatch.playDuration || null;
                    ex.nativePlaytimeSeconds = nameMatch.nativePlaytimeSeconds || 0;
                    ex.nativePlaytimeFormatted = nameMatch.nativePlaytimeFormatted || "< 1 min";
                    ex.nativePlaytimeHours = nameMatch.nativePlaytimeHours || 0;
                    ex.nativePlaytimeWholeHours = nameMatch.nativePlaytimeWholeHours || 0;
                    ex.nativePlaytimeAppStyle = nameMatch.nativePlaytimeAppStyle || "0h";
                    ex.firstPlayedDateTime = nameMatch.firstPlayedDateTime || null;
                    ex.art = nameMatch.art || null;
                }
            }
            const fallbackArt = resolveGamePosterArt([ex.art, t.trophyTitleIconUrl, t.conceptIconUrl, t.imageUrl]);
            Object.assign(ex, t);
            ex.name = ex.name !== "Unknown Game" ? ex.name : (t.trophyTitleName || "Unknown Game");
            ex.art = fallbackArt; ex.posterArt = fallbackArt; ex.trophyTitleIconUrl = fallbackArt;
            ex.conceptId = ex.conceptId || t.conceptId || extractConceptIdFromText(t.conceptIconUrl) || null;
            ex.platform = normalizePlatform(t);
            ex.progress = t.progress || 0;
            ex.definedTrophies = t.definedTrophies || {};
            ex.earnedTotal = (t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0);
            ex.definedTotal = (t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0);
            ex.completionRatio = ex.definedTotal > 0 ? `${Math.round((ex.earnedTotal / ex.definedTotal) * 100)}%` : "0%";
            if (commId) merged.set(commId, ex);
            if (titleId) merged.set(titleId, ex);
        });

        const allGames = Array.from(new Set(merged.values())).sort((a, b) =>
            (b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0) - (a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0));

        /* What is the player doing right now? */
        const gi = rawP?.gameTitleInfoList?.[0] || rawP?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
        const liveStatus = isOnline ? extractGameStatus(rawP) : null;
        const activeCommId = gi.npCommunicationId || null;
        const activeTitleId = gi.npTitleId || gi.titleId || null;
        let title = gi.titleName || gi.npTitleName || gi.formatValue || null;
        if (!title && activeCommId && merged.has(activeCommId)) title = merged.get(activeCommId).name;
        if (!title && activeTitleId && merged.has(activeTitleId)) title = merged.get(activeTitleId).name;
        if (!title) title = isOnline ? "Dashboard" : (existing?.currentGame || "Dashboard");

        let canonicalActive = null;
        if (activeCommId && String(activeCommId).startsWith("NPWR")) canonicalActive = activeCommId;
        if (!canonicalActive && activeTitleId && merged.has(activeTitleId)) {
            const r = merged.get(activeTitleId);
            if (r?.npCommunicationId && String(r.npCommunicationId).startsWith("NPWR")) canonicalActive = r.npCommunicationId;
        }
        if (!canonicalActive && title !== "Dashboard") {
            const clean = title.toLowerCase().replace(/®|™/g, "").trim();
            for (const g of allGames) {
                const gn = (g.name || g.trophyTitleName || "").toLowerCase().replace(/®|™/g, "").trim();
                if (gn === clean && g.npCommunicationId && String(g.npCommunicationId).startsWith("NPWR")) { canonicalActive = g.npCommunicationId; break; }
            }
        }
        const isDashboard = !title || title.toUpperCase() === "DASHBOARD";
        // Playing something with no trophy list yet (or non-trophy app): never borrow another game's IDs.
        const rootCommId = canonicalActive ||
            (isDashboard ? (allGames[0]?.npCommunicationId || existing?.commId || existing?.activeHunt?.commId || "NPWR_ACTIVE") : "NPWR_ACTIVE");

        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } =
            updateGameSessionTracking(existing, rootCommId, title, isOnline, activeTitleId);

        /* Trophy catalog (Firestore games/*) */
        let budget = PULL_CONFIG.BACKFILL_NEW_TITLES_PER_RUN;
        let idx = 0;
        for (const g of allGames) {
            const syncId = g.npCommunicationId;
            if (!syncId || !String(syncId).startsWith("NPWR")) continue;
            const up = String(syncId).toUpperCase();
            const isRecent = idx++ < PULL_CONFIG.SKELETON_REFRESH_RECENT_TITLES;
            const entry = gameIndex[up];
            const hasSkeleton = !!(entry && entry.trophyCount > 0);
            const ageMs = entry?.lastUpdated ? Date.now() - Date.parse(entry.lastUpdated) : Infinity;
            const isActiveTitle = up === String(rootCommId).toUpperCase();
            if (hasSkeleton && !isActiveTitle && (!isRecent || ageMs < PULL_CONFIG.SKELETON_STALE_MS)) continue;
            if (hasSkeleton && isActiveTitle && ageMs < PULL_CONFIG.SKELETON_STALE_MS) continue;
            if (!hasSkeleton && !isRecent) {
                if (budget <= 0) continue;
                budget--;
            }
            await ensureGameSkeleton(auth, syncId, g.name, normalizePlatform(g), g.art, g.trophyTitleIconUrl,
                g.definedTrophies, purchasedGames || [], g.titleId || g.npTitleId, g.conceptId);
        }

        const rootUp = String(rootCommId).toUpperCase();
        const matched = merged.get(rootCommId) || (isDashboard ? allGames[0] : null) || {};
        const activeGameDoc = await getGame(rootUp);
        const hw = parseDetailedHardwareContext(rawP, matched);
        const gameKey = gameIndex[rootUp]?.key || (isDashboard ? null : toGameKey(matched.name || title));

        const sameGameBefore = !isDashboard && existing && existing.commId === rootCommId && existing.currentGame === title;
        const poster = resolveGamePosterArt(isDashboard ? [
            allGames[0]?.art, allGames[0]?.posterArt, allGames[0]?.trophyTitleIconUrl,
            existing?.art, existing?.posterArt, existing?.currentGameArt
        ] : [
            merged.get(rootCommId)?.art,
            activeTitleId && merged.get(activeTitleId)?.art,
            activeGameDoc?.posterArt,
            matched.trophyTitleIconUrl,
            gi.conceptIconUrl, gi.npTitleIconUrl, gi.titleIconUrl,
            sameGameBefore ? existing.currentGameArt : null
        ]);

        const lifetimeFmt = matched.nativePlaytimeFormatted || existing?.currentGameHours || existing?.activeHunt?.hoursFormatted || "0 hrs";
        const lifetimeNum = matched.nativePlaytimeHours || existing?.currentGameNumericHours || existing?.activeHunt?.numericHours || 0;
        const sonySec = matched.nativePlaytimeSeconds || 0;
        const useSony = PULL_CONFIG.PREFER_SONY_PLAYTIME && sonySec > 0;
        const trackerHas = !!(currentGameDurationFormatted && currentGameDurationFormatted !== "0 hrs" && currentGameDurationFormatted !== "< 1 min");
        const playtimeFmt = useSony ? (matched.nativePlaytimeFormatted || formatDuration(sonySec)) : (trackerHas ? currentGameDurationFormatted : lifetimeFmt);
        const playtimeNum = useSony ? (matched.nativePlaytimeHours || Math.round((sonySec / 3600) * 10) / 10)
            : (activeSessionSeconds > 0 ? Math.round((activeSessionSeconds / 3600) * 10) / 10 : lifetimeNum);
        const playtimeSource = useSony ? "sony" : (trackerHas ? "tracker" : "stored");
        const hoursWhole = useSony ? Math.floor(sonySec / 3600) : Math.floor(Number(playtimeNum) || 0);

        const activeSession = !isDashboard && playSessions[rootCommId]?.isActive ? playSessions[rootCommId] : null;
        const sessionStartMs = activeSession?.sessionStartTime || 0;
        const sessionSeconds = sessionStartMs ? Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000)) : 0;

        const stats = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(auth, apiTarget), {});

        /* Trophy progress: active title + titles whose trophy data changed */
        const trophyHashes = { ...(player.progressHash || {}) };
        const liveProgress = {};
        for (const [k, v] of Object.entries(asObjectMap(existing?.liveTrophyProgress))) {
            const m = asObjectMap(v);
            if (gameActiveRecently(m, lastActivityMs(merged.get(k)) || null, false)) liveProgress[k] = m;
        }
        const ingestIds = [rootCommId];
        let liveBudget = PULL_CONFIG.LIVE_PROGRESS_BACKFILL_PER_RUN;
        let progBudget = PULL_CONFIG.BACKFILL_NEW_TITLES_PER_RUN;
        let pIdx = 0;
        for (const g of allGames) {
            const id = g.npCommunicationId;
            if (!id || !String(id).startsWith("NPWR") || id === rootCommId) continue;
            const isRecent = pIdx++ < PULL_CONFIG.PROGRESS_REFRESH_RECENT_TITLES;
            const hasStored = Object.prototype.hasOwnProperty.call(trophyTitleSync, id);
            const changed = !hasStored || (trophyTitleSync[id] || null) !== (g.lastUpdatedDateTime || null);
            const needsLive = !liveProgress[id] && lastActivityMs(g) >= activeCutoffMs();
            if (!isRecent && !changed) {
                if (needsLive && liveBudget > 0) { liveBudget--; ingestIds.push(id); }
                continue;
            }
            if (!isRecent && !hasStored) {
                if (progBudget <= 0) continue;
                progBudget--;
            }
            ingestIds.push(id);
        }

        let activeProgress = {};
        let activeHunt = existing?.activeHunt || null;
        const newlyEarned = [];

        for (const cId of ingestIds) {
            const gMeta = merged.get(cId) || {};
            const gPlat = normalizePlatform(gMeta);
            const gName = gMeta.name || "PlayStation Title";
            let skeleton = await getGame(String(cId).toUpperCase());
            if (!skeleton && String(cId).startsWith("NPWR") && cId !== "NPWR_ACTIVE") {
                skeleton = await ensureGameSkeleton(auth, cId, gName, gPlat, gMeta.art, gMeta.trophyTitleIconUrl, gMeta.definedTrophies, purchasedGames || [], gMeta.titleId || gMeta.npTitleId, gMeta.conceptId);
            }
            const isActiveId = cId === rootCommId;
            const sub = await ingestTrophySubtreeForTitle(auth, apiTarget, cId, gName, gPlat, skeleton, {});
            if (!sub) continue;
            if (sub.skeletonPatched) await persistPatchedGame(cId);
            if (sub.earnedList.length) newlyEarned.push(...sub.earnedList);

            const mapKeys = Object.keys(sub.progressMap);
            if (mapKeys.length) {
                const h = crypto.createHash("sha1").update(JSON.stringify(sub.progressMap)).digest("hex").slice(0, 16);
                if (trophyHashes[cId] !== h) {
                    await playerRef.collection("trophyProgress").doc(String(cId)).set(plain({
                        commId: cId, gameKey: gameIndex[String(cId).toUpperCase()]?.key || toGameKey(gName),
                        title: gName, updatedAt: nowEt(), trophies: sub.progressMap
                    }));
                    trophyHashes[cId] = h;
                    playerDirty = true;
                }
            }
            // RTDB only shows games that were active this year (all of that game's trophies are kept)
            if (sub.ok || mapKeys.length) {
                if (gameActiveRecently(sub.progressMap, lastActivityMs(gMeta) || null, isActiveId)) {
                    const keep = earnedOrInProgress(sub.progressMap);
                    if (Object.keys(keep).length) liveProgress[cId] = keep; else delete liveProgress[cId];
                }
                else delete liveProgress[cId];
            }
            if (sub.ok || mapKeys.length) {
                trophyTitleSync[cId] = gMeta.lastUpdatedDateTime || null;
                playerDirty = true;
            }

            if (isActiveId) {
                activeProgress = sub.progressMap;
                const sorted = [...sub.earnedList].sort((a, b) => a.timestamp - b.timestamp);
                const firstTs = sorted.length ? sorted[0].timestamp : null;
                activeHunt = {
                    npCommunicationId: rootCommId, commId: rootCommId,
                    gameKey,
                    conceptId: activeGameDoc?.conceptId || matched.conceptId || null,
                    titleId: isDashboard ? null : activeTitleId, cusaId: isDashboard ? null : activeTitleId,
                    title: matched.name || title,
                    gameStatus: liveStatus || "",
                    platform: hw.activeHardware, gameBuildVersion: hw.gameBuildVersion,
                    isStreamingRemotePlay: hw.isStreamingRemotePlay,
                    art: poster, posterArt: poster, image: poster,
                    hoursPlayed: playtimeFmt, hoursFormatted: playtimeFmt, numericHours: playtimeNum,
                    playedHoursApp: `${hoursWhole}h`, playtimeSource,
                    amazonAffiliateUrl: generateAffiliateUrl(matched.name || title),
                    progress: matched.progress || 0,
                    firstTrophyTimestamp: firstTs,
                    firstTrophyDate: firstTs ? new Date(firstTs).toISOString() : null,
                    velocity: { completionStatus: `${matched.earnedTotal || 0}/${matched.definedTotal || 0}`, ratio: matched.completionRatio || "0%" },
                    groupEarnings: sub.groupEarnings
                };
            }
        }

        const recentMap = new Map();
        (existing?.mostRecentTrophies || []).forEach((t) => { if (t && t.trophyId !== undefined) recentMap.set(`${t.commId || ""}_${t.trophyId}`, t); });
        newlyEarned.forEach((t) => recentMap.set(`${t.commId || ""}_${t.trophyId}`, t));
        const recentTrophies = Array.from(recentMap.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .filter((t) => (t.timestamp || 0) >= activeCutoffMs())
            .slice(0, PULL_CONFIG.MOST_RECENT_TROPHIES_KEPT);

        /* ---- Firestore: slow-changing player data ---- */
        const friendsProfiles = friendsList.map((id) => {
            const f = friendsDirectoryCache[String(id)];
            return f ? { accountId: f.accountId, onlineId: f.onlineId || null, avatar: f.avatar || null, isPlus: !!f.isPlus } : { accountId: String(id) };
        });
        const playerDoc = { onlineId, accountId, updatedAt: nowEt(), trophyTitleSync, progressHash: trophyHashes };
        if (doHeavy) {
            Object.assign(playerDoc, {
                friendsList, friendsProfiles, friendsCount: friendsList.length,
                region: region?.country || "US", language: region?.language || "en",
                shareableProfile: shareableProfile || null,
                purchasedCount, heavyPulledAtMs: Date.now(),
                avatar: profile?.avatars?.[0]?.url || null, allAvatars: profile?.avatars || [],
                rawProfile: profile || {}
            });
            playerDirty = true;

            const libHash = crypto.createHash("sha1").update(JSON.stringify(allGames)).digest("hex");
            if (libHash !== player.libraryHash) {
                playerDoc.libraryPages = await writeChunkedItems(playerRef, "library", allGames, player.libraryPages);
                playerDoc.libraryHash = libHash;
                playerDoc.libraryCount = allGames.length;
            }
            if (purchasedGames) playerDoc.purchasedPages = await writeChunkedItems(playerRef, "purchased", purchasedGames, player.purchasedPages);
            if (isSelf && priv) {
                await col("system").doc(`private_${safeKey(onlineId)}`).set(plain({ onlineId, ...priv, updatedAt: nowEt() }));
            }
        }
        if (playerDirty) await playerRef.set(plain(playerDoc), { merge: true });

        await col("raw_telemetry").doc(safeKey(onlineId)).set(plain({
            profile: profile || {}, presence: rawP, trophySummary: stats || {}, fetchedAt: new Date().toISOString(),
            updatedAt: FieldValue.serverTimestamp()
        }));

        /* ---- RTDB card ---- */
        const e = stats?.earnedTrophies || {};
        const total = (e.platinum || 0) + (e.gold || 0) + (e.silver || 0) + (e.bronze || 0);
        const recentSlim = allGames.slice(0, PULL_CONFIG.RECENT_GAMES_IN_RTDB).map((g) => ({
            npCommunicationId: g.npCommunicationId, npTitleId: g.npTitleId, titleId: g.titleId,
            name: g.name, gameKey: toGameKey(g.name), platform: g.platform, art: g.art,
            conceptId: g.conceptId, lastPlayed: g.lastPlayed, playDuration: g.playDuration,
            nativePlaytimeFormatted: g.nativePlaytimeFormatted, nativePlaytimeHours: g.nativePlaytimeHours,
            progress: g.progress, earnedTotal: g.earnedTotal, definedTotal: g.definedTotal, completionRatio: g.completionRatio
        }));

        const card = {
            onlineId, accountId,
            avatar: profile?.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || existing?.avatar || "",
            allAvatars: profile?.avatars || existing?.allAvatars || [],
            bio: profile?.aboutMe || existing?.bio || "Official Pack Member Profile",
            plus: !!profile?.isPlus,
            region: region?.country || existing?.region || "US",
            language: region?.language || existing?.language || "en",
            friendsCount: friendsList.length || existing?.friendsCount || 0,
            purchasedCount,
            gamesPlayed: totalGames || existing?.gamesPlayed || 0,
            psnAccountAge: calculateAgeString(earliest),
            earliestTrophyDate: earliest ? new Date(earliest).toISOString() : (existing?.earliestTrophyDate || null),
            latestTrophyDate: recentTrophies[0]?.timestamp || existing?.latestTrophyDate || null,
            level: stats?.trophyLevel || existing?.level || 0,
            trophySummary: {
                platinum: e.platinum ?? existing?.trophySummary?.platinum ?? 0,
                gold: e.gold ?? existing?.trophySummary?.gold ?? 0,
                silver: e.silver ?? existing?.trophySummary?.silver ?? 0,
                bronze: e.bronze ?? existing?.trophySummary?.bronze ?? 0,
                total: total || existing?.trophySummary?.total || 0,
                trophyLevel: stats?.trophyLevel || existing?.level || 0,
                progress: stats?.progress || existing?.trophySummary?.progress || 0,
                tier: stats?.tier || 0
            },
            online: isOnline,
            currentGame: title,
            currentGameId: isDashboard ? null : activeTitleId,
            gameKey: isDashboard ? null : gameKey,
            lastPlayedGame: allGames[0]?.name || existing?.lastPlayedGame || null,
            lastPlayedGameKey: allGames[0] ? toGameKey(allGames[0].name) : (existing?.lastPlayedGameKey || null),
            lastPlayedCommId: allGames[0]?.npCommunicationId || existing?.lastPlayedCommId || null,
            gameStatus: liveStatus || "",
            gameStatusUpdated: nowEt(),
            commId: isDashboard ? null : rootCommId,
            conceptId: isDashboard ? null : (activeGameDoc?.conceptId || matched.conceptId || null),
            art: poster, posterArt: poster, image: poster, currentGameArt: poster,
            currentGameHours: playtimeFmt, currentGameNumericHours: playtimeNum,
            playedHoursApp: `${hoursWhole}h`, playedHoursWhole: hoursWhole, playtimeSource,
            sonyPlayDuration: matched.playDuration || "",
            sessionStartedAt: sessionStartMs ? new Date(sessionStartMs).toISOString() : "",
            sessionStartedAtMs: sessionStartMs,
            currentSessionSeconds: sessionSeconds,
            amazonAffiliateUrl: generateAffiliateUrl(title),
            platform: hw.activeHardware, gameBuildVersion: hw.gameBuildVersion,
            isStreamingRemotePlay: hw.isStreamingRemotePlay, displayPlatform: hw.displayPlatformLabel,
            rawPresence: rawP,
            activeHunt: activeHunt || existing?.activeHunt || null,
            playSessions,
            recentGames: recentSlim.length ? recentSlim : (existing?.recentGames || []),
            mostRecentTrophies: recentTrophies,
            liveTrophyProgress: Object.keys(liveProgress).length ? liveProgress : null,
            lastUpdated: nowEt()
        };
        return { card };
    } catch (err) {
        console.error(`[PLAYER ERROR] ${gamerTag || targetId}: ${err.stack || err.message}`);
        return { card: existing || null, error: err.message };
    }
}

/* ============================================================================
 * Squad leaderboard + overlap
 * ============================================================================ */
function buildSquadIntelligence(cards, friends) {
    const players = Object.values(cards || {}).filter(Boolean);
    const leaderboard = players.map((p) => ({
        onlineId: p.onlineId || "Unknown Player", accountId: p.accountId || null, level: p.level || 0,
        platinum: p.trophySummary?.platinum || 0, gold: p.trophySummary?.gold || 0,
        silver: p.trophySummary?.silver || 0, bronze: p.trophySummary?.bronze || 0,
        totalTrophies: p.trophySummary?.total || 0, gamesPlayed: p.gamesPlayed || 0,
        isOnline: !!p.online, currentGame: p.currentGame || "Dashboard", gameStatus: p.gameStatus || "",
        commId: p.commId || null, conceptId: p.conceptId || null, currentGameId: p.currentGameId || null,
        gameKey: p.gameKey || null,
        art: p.art || p.posterArt || p.currentGameArt || null,
        posterArt: p.posterArt || p.art || p.currentGameArt || null,
        image: p.image || p.art || p.posterArt || null,
        platform: p.platform || "PS5", gameBuildVersion: p.gameBuildVersion || "PS5 Native Game",
        isStreamingRemotePlay: !!p.isStreamingRemotePlay
    })).sort((a, b) => (b.level - a.level) || (b.platinum - a.platinum) || (b.totalTrophies - a.totalTrophies));

    const totals = leaderboard.reduce((acc, c) => {
        acc.totalPlatinums += c.platinum; acc.totalGold += c.gold; acc.totalSilver += c.silver;
        acc.totalBronze += c.bronze; acc.cumulativeTrophies += c.totalTrophies; acc.totalGamesEncountered += c.gamesPlayed;
        return acc;
    }, { totalPlatinums: 0, totalGold: 0, totalSilver: 0, totalBronze: 0, cumulativeTrophies: 0, totalGamesEncountered: 0 });

    const socialOverlap = {};
    players.forEach((p) => {
        const mine = new Set((friends[p.onlineId] || []).map(String));
        socialOverlap[p.onlineId] = {};
        players.forEach((o) => {
            if (o.onlineId === p.onlineId) return;
            const mutuals = (friends[o.onlineId] || []).map(String).filter((f) => mine.has(f));
            socialOverlap[p.onlineId][o.onlineId] = { mutualCount: mutuals.length, sharedFriendAccountIds: mutuals };
        });
    });
    return { leaderboard, totals, socialOverlap };
}

/* ============================================================================
 * Main sync pass
 * ============================================================================ */
async function rtdbUpdate(p, obj) {
    const clean = normalizeForRtdb(obj);
    if (clean) await rtdbRef(p).update(clean);
}

function cookieFields(onlineId, hasOwn, issue, runnerTag) {
    return {
        npssoValid: hasOwn,
        npssoStatus: hasOwn ? "ACTIVE_FULL_PULL" : `LITE_PULL (Borrowed from ${runnerTag}; cookie ${issue || "MISSING"})`,
        handshakeText: hasOwn
            ? `${String(onlineId).toUpperCase()} HANDSHAKE: LIVE (OWN COOKIE)`
            : `${String(onlineId).toUpperCase()} HANDSHAKE: LITE PULL (VIA ${String(runnerTag).toUpperCase()})`,
        handshakeState: "LIVE"
    };
}

async function executeSyncPass() {
    console.log(`[START] PSN Engine v${ENGINE_VERSION} (${IS_MANUAL ? "MANUAL FORCE" : "SCHEDULED"}) at ${nowEt()} ET`);
    initRayFirebase();
    const startedAt = nowEt();

    try {
        await rtdbUpdate("engineStatus", { version: ENGINE_VERSION, status: "RUNNING", startedAt, trigger: IS_MANUAL ? "MANUAL_DISPATCH" : "SCHEDULED_CRON", error: null });
        await rtdbRef("engineStatus/error").remove();
        console.log("[RTDB] Startup ping written to /psn/engineStatus.");

        await loadTokenStore();
        await loadGameIndex();

        const creds = await readKevinCredentials();
        const session = await resolveSquadSession(creds);
        const { masterAuth, auths, guestAuths, runnerTag, runnerState } = session;

        if (!masterAuth) {
            await rtdbUpdate("engineStatus", { status: "WAITING_FOR_ACTIVE_NPSSO", lastCheck: nowEt(), auth: diag.auth });
            throw new Error("No working NPSSO cookie found (core squad or guests). Enter a fresh cookie on the settings page.");
        }

        const previousMap = (await rtdbGet("usersByGamerTag")) || {};
        const usersByGamerTag = { ...previousMap };
        const reverse = {};
        for (const [t, id] of Object.entries(previousMap)) reverse[String(id)] = t;

        const cards = {};
        const active = new Set();
        let changed = 0;

        const syncOne = async (o) => {
            const { auth, key, tag, accountId, hasOwn, issue } = o;
            const targetId = accountId || "me";
            const isSelf = auth.userKey === key;
            const scope = isSelf ? "me" : targetId;
            const guessTag = tag || (accountId && reverse[accountId]) || "";
            const label = guessTag || o.label;
            let existing = guessTag ? await rtdbGet(`gamertags/${safeKey(guessTag)}`) : null;
            if (!existing && accountId && reverse[accountId] && reverse[accountId] !== guessTag) {
                existing = await rtdbGet(`gamertags/${safeKey(reverse[accountId])}`);
            }

            const delta = await evaluateUserActivityDelta(auth, targetId, scope, existing, IS_MANUAL);

            if (!delta.hasDelta && existing) {
                console.log(`[SKIP] ${label}: ${delta.reason}`);
                const id = existing.onlineId || guessTag;
                const cf = cookieFields(id, hasOwn, issue, runnerTag);
                const diff = {};
                for (const k of Object.keys(cf)) if (existing[k] !== cf[k]) diff[k] = cf[k];
                if (Object.keys(diff).length) { await rtdbRef(`gamertags/${safeKey(id)}`).update(diff); changed++; Object.assign(existing, diff); }
                cards[id] = existing;
                active.add(id);
                return;
            }

            if (delta.statusOnly && existing) {
                console.log(`[STATUS ONLY] ${label}: ${delta.reason}`);
                const id = existing.onlineId || guessTag;
                const slim = await applyStatusOnlyUpdate(id, existing, delta.liveGameStatus);
                cards[id] = slim;
                active.add(id);
                changed++;
                return;
            }

            console.log(`[SYNC] ${label}: ${delta.reason} (${hasOwn ? "own cookie" : `borrowed from ${runnerTag}`})`);
            const res = await getFullUserData({ auth, gamerTag: guessTag, isSelf, targetId, existing, force: IS_MANUAL, rawPresence: delta.rawPresence });
            const card = res.card;
            if (!card || !card.onlineId) { if (existing?.onlineId) { active.add(existing.onlineId); cards[existing.onlineId] = existing; } return; }
            Object.assign(card, cookieFields(card.onlineId, hasOwn, issue, runnerTag));
            const sameNode = existing && safeKey(existing.onlineId || guessTag) === safeKey(card.onlineId);
            await writeCardDelta(card.onlineId, sameNode ? existing : null, card);
            usersByGamerTag[card.onlineId] = String(card.accountId || accountId || "");
            cards[card.onlineId] = card;
            active.add(card.onlineId);
            changed++;
        };

        /* Core squad */
        for (const m of CORE_PACK) {
            const own = auths[m.key];
            const issue = own ? null : (creds.coreNpssos[m.key] ? "EXPIRED_NPSSO" : "NO_COOKIE");
            diag.members[m.key] = { tag: m.tag, ownCookie: !!own, issue, cookieUpdatedAt: creds.cookieUpdated[m.key] || null };
            await syncOne({ auth: own || masterAuth, key: m.key, tag: m.tag, accountId: creds.coreIds[m.key] || m.id, hasOwn: !!own, issue, label: m.tag });
            active.add(m.tag);
        }

        /* Guests */
        const seenIds = new Set(CORE_PACK.map((m) => creds.coreIds[m.key] || m.id));
        for (const g of creds.guests) {
            if (g.accountId) {
                if (seenIds.has(g.accountId)) continue;
                seenIds.add(g.accountId);
            }
            const own = guestAuths[g.emailKey] || null;
            if (!own && !g.accountId) continue;
            const issue = own ? null : (g.npsso ? "EXPIRED_NPSSO" : "NO_COOKIE");
            diag.members[g.emailKey] = { tag: g.tag || null, ownCookie: !!own, issue, cookieUpdatedAt: g.updatedAt || null };
            await syncOne({ auth: own || masterAuth, key: g.emailKey, tag: g.tag, accountId: g.accountId, hasOwn: !!own, issue, label: g.tag || g.emailKey });
        }

        /* Prune players that no longer exist in Kevin's DB */
        if (creds.usersReadOk) {
            for (const oldTag of Object.keys(previousMap)) {
                if (active.has(oldTag)) continue;
                console.log(`[PRUNE] Removing stale player '${oldTag}'.`);
                await rtdbRef(`gamertags/${safeKey(oldTag)}`).remove();
                delete usersByGamerTag[oldTag];
                changed++;
            }
        } else {
            console.warn("[PRUNE] Skipped: could not read Kevin's users this run.");
        }

        await rtdbSet("usersByGamerTag", usersByGamerTag);

        /* Leaderboard + analytics (Firestore) */
        if (changed > 0) {
            const intel0 = buildSquadIntelligence(cards, {});
            await col("squadLeaderboard").doc("current").set(plain({ leaderboard: intel0.leaderboard, updatedAt: FieldValue.serverTimestamp() }));
        }
        if (heavyRefreshHappened) {
            for (const c of Object.values(cards)) {
                if (!c || friendsByPlayer[c.onlineId]) continue;
                try {
                    const snap = await col("players").doc(safeKey(c.onlineId)).get();
                    friendsByPlayer[c.onlineId] = snap.exists ? (snap.data().friendsList || []) : [];
                } catch (e) { friendsByPlayer[c.onlineId] = []; }
            }
            const intel = buildSquadIntelligence(cards, friendsByPlayer);
            await col("squadAnalytics").doc("current").set(plain({
                totals: intel.totals, socialOverlap: intel.socialOverlap, calculatedAt: new Date().toISOString()
            }));
        }

        await saveFriendsDirectory();
        await saveGameIndex();
        await saveTokenStore();

        const done = nowEt();
        const apiSummary = { totalCalls: apiStats.calls, failedCalls: apiStats.failures, errorsByEndpoint: apiStats.errorsByLabel };
        await rtdbUpdate("engineStatus", {
            version: ENGINE_VERSION, status: "COMPLETED", completedAt: done, lastCheck: done,
            runner: runnerState, auth: diag.auth, members: diag.members, apiStats: apiSummary,
            playersUpdated: changed
        });
        await rtdbUpdate("meta", { engineVersion: ENGINE_VERSION, lastUpdated: done, analyticsTag: GA4_MEASUREMENT_ID });
        await col("meta").doc("engine").set(plain({
            version: ENGINE_VERSION, status: "COMPLETED", completedAt: done, runner: runnerState,
            apiStats: apiSummary, updatedAt: FieldValue.serverTimestamp()
        }), { merge: true });

        console.log(`[API STATS] ${apiStats.calls} calls, ${apiStats.failures} failed.`);
        console.log(`[SUCCESS] Engine v${ENGINE_VERSION} done. Players changed: ${changed}.`);
    } catch (err) {
        try {
            await rtdbUpdate("engineStatus", { status: "FAILED", failedAt: nowEt(), error: String(err.message || err).slice(0, 300) });
            await saveTokenStore();
            await saveGameIndex();
        } catch (e) { /* best effort */ }
        throw err;
    }
}

if (require.main === module) {
    executeSyncPass()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(`[FATAL] ${err.message}`);
            if (err.stack) console.error(err.stack);
            process.exit(1);
        });
}

module.exports = {
    executeSyncPass, normalizeForRtdb, stableStringify, computePatch, toGameKey, asObjectMap,
    updateGameSessionTracking, formatDuration, parseIsoDuration, buildSquadIntelligence
};
