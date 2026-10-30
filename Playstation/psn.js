/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Version: 67.0.0
 * Description: Master PSN Telemetry & Dual RTDB/Firestore Ingestion Engine
 *   - v67.0.0: RTDB stores strictly gamertags/usersByGamerTag.
 *               Firestore stores games (keyed as Game_Title_Slug), leaderboards,
 *               directory caches, and raw dumps.
 *               Reads credentials from entertainment-71888 and pushes live stats
 *               to playstation-stats.
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const psnApi = require("psn-api");
const admin = require("firebase-admin");

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

const DEST_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";
const SOURCE_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const ENGINE_VERSION = "67.0.0";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const SQUAD_GAMERTAGS = {
    wildhorse_spirit: "WildHorse_Spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "DesdemonaTiger"
};

const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523"
};

const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: ACCOUNT_IDS.wildhorse_spirit },
    { key: "ray", tag: "OneLIVIDMAN", id: ACCOUNT_IDS.ray },
    { key: "darkwing", tag: "Darkwing69420", id: ACCOUNT_IDS.darkwing },
    { key: "marc", tag: "DesdemonaTiger", id: ACCOUNT_IDS.marc }
];

const AMAZON_TAG = "moviesanywhere02-20";

const RTDB_ALLOWED_USER_KEYS = new Set([
    "accountId",
    "activeHunt",
    "allAvatars",
    "art",
    "avatar",
    "bio",
    "commId",
    "conceptId",
    "currentGame",
    "currentGameArt",
    "currentGameHours",
    "currentGameNumericHours",
    "currentSessionSeconds",
    "displayPlatform",
    "earliestTrophyDate",
    "friendsList",
    "friendsProfiles",
    "gameBuildVersion",
    "gameStatus",
    "gameStatusUpdated",
    "gamesPlayed",
    "handshakeState",
    "handshakeText",
    "image",
    "isStreamingRemotePlay",
    "language",
    "lastUpdated",
    "latestTrophyDate",
    "level",
    "liveTrophyProgress",
    "mostRecentTrophies",
    "npssoStatus",
    "npssoValid",
    "online",
    "onlineId",
    "platform",
    "playedHoursApp",
    "playedHoursWhole",
    "playtimeSource",
    "plus",
    "posterArt",
    "psnAccountAge",
    "purchasedGames",
    "rawPresence",
    "rawProfile",
    "recentGames",
    "region",
    "sessionStartedAt",
    "sessionStartedAtMs",
    "shareableProfile",
    "sonyPlayDuration",
    "storeListing",
    "trophySummary",
    "trophyTitleSync"
]);

let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    darkwing_active: "no",
    darkwing_status: "UNCHECKED",
    marc_active: "no",
    marc_status: "UNCHECKED",
    active_runner: "UNCHECKED",
    buffer_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

const PULL_CONFIG = {
    SKELETON_REFRESH_RECENT_TITLES: 20,
    PROGRESS_REFRESH_RECENT_TITLES: 0,
    HEAVY_REFRESH_MS: 6 * 3600 * 1000,
    SKELETON_STALE_MS: 24 * 3600 * 1000,
    BACKFILL_NEW_TITLES_PER_RUN: 40,
    MOST_RECENT_TROPHIES_KEPT: 250,
    PAGE_SIZE_TITLES: 800,
    PAGE_SIZE_PLAYED: 200,
    PAGE_SIZE_LIBRARY: 100,
    PAGE_SIZE_PURCHASED: 100,
    PAGE_SIZE_FRIENDS: 1000,
    MAX_PAGES: 50,
    FRIEND_LOOKUPS_PER_RUN: 40,
    FRIEND_RETRY_UNRESOLVED_MS: 7 * 24 * 3600 * 1000,
    REQUEST_GAP_MS: 120,
    RETRIES: 2,
    PREFER_SONY_PLAYTIME: true,
    ARCHIVE_RAW: true
};

const apiStats = { calls: 0, failures: 0, errorsByLabel: {}, missingExports: [] };
let friendsDirectoryCache = {};
let friendsDirectoryDirty = false;
let friendLookupsThisRun = 0;

let adminApp = null;
let firestoreDb = null;
let cachedFirebaseToken = null;
let tokenExpiryTimestamp = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================================
 * Helper: toGameKey
 * Converts human readable game titles to clean snake_case document keys
 * e.g., "Far Cry 5" -> "Far_Cry_5"
 * ============================================================================ */
function toGameKey(name = "", platform = "") {
    let clean = String(name || "")
        .replace(/®|™|©/g, "")
        .replace(/[:\/\\#$\[\].\-+]/g, " ")
        .trim()
        .replace(/\s+/g, "_");

    if (!clean) clean = "Unknown_Game";
    return clean;
}

/* ============================================================================
 * Section: Firebase Admin & Firestore Initialization
 * ============================================================================ */
function initializeAdminSdk() {
    if (admin.apps.length > 0) {
        adminApp = admin.apps[0];
        firestoreDb = admin.firestore();
        return { adminApp, firestoreDb };
    }

    const rawServiceKey = process.env.FIREBASE_SERVICE_RAY || process.env.FIREBASE_AUTH_SECRET || "";
    if (!rawServiceKey.trim()) {
        console.warn("[ADMIN SDK] No service credentials found in FIREBASE_SERVICE_RAY.");
        return { adminApp: null, firestoreDb: null };
    }

    try {
        let serviceAccountCredentials;
        const trimmedKey = rawServiceKey.trim();
        if (trimmedKey.startsWith("{")) {
            serviceAccountCredentials = JSON.parse(trimmedKey);
        } else {
            const decoded = Buffer.from(trimmedKey, "base64").toString("utf-8");
            serviceAccountCredentials = JSON.parse(decoded);
        }

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccountCredentials),
            databaseURL: DEST_RTDB_URL
        });
        firestoreDb = admin.firestore();
        console.log(`[ADMIN SDK] Initialized project: ${serviceAccountCredentials.project_id || "playstation-stats"}`);
        return { adminApp, firestoreDb };
    } catch (err) {
        console.error(`[ADMIN SDK ERROR] Failed to parse service credentials: ${err.message}`);
        return { adminApp: null, firestoreDb: null };
    }
}

async function getFirebaseBearerHeader() {
    const now = Date.now();
    if (cachedFirebaseToken && now < tokenExpiryTimestamp - 60000) {
        return { Authorization: `Bearer ${cachedFirebaseToken}` };
    }

    if (!adminApp) initializeAdminSdk();

    if (adminApp) {
        try {
            const tokenResponse = await adminApp.options.credential.getAccessToken();
            cachedFirebaseToken = tokenResponse.access_token;
            tokenExpiryTimestamp = now + 45 * 60 * 1000;
            return { Authorization: `Bearer ${cachedFirebaseToken}` };
        } catch (err) {
            console.warn(`[ADMIN SDK] Could not generate OAuth token: ${err.message}`);
        }
    }
    return {};
}

async function callPsn(label, fn, fallback = null) {
    if (typeof fn !== "function") {
        if (!apiStats.missingExports.includes(label)) {
            apiStats.missingExports.push(label);
            console.warn(`[EXPORT MISSING] ${label} is not provided by the installed psn-api.`);
        }
        return fallback;
    }
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            apiStats.calls++;
            const res = await fn();
            return res === undefined ? fallback : res;
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|too many requests|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                const waitMs = 5000 * (attempt + 1);
                console.warn(`[RATE LIMIT] ${label} hit 429. Waiting ${waitMs}ms (retry ${attempt + 1}/${PULL_CONFIG.RETRIES})...`);
                await sleep(waitMs);
                continue;
            }
            if (/is not a function|is not defined/i.test(msg) && !apiStats.missingExports.includes(label)) {
                apiStats.missingExports.push(label);
                console.warn(`[EXPORT MISSING] ${label} is not provided by the installed psn-api.`);
            }
            apiStats.failures++;
            const entry = apiStats.errorsByLabel[label] || { count: 0, last: "" };
            entry.count++;
            entry.last = msg.slice(0, 300);
            apiStats.errorsByLabel[label] = entry;
            if (entry.count === 1) console.warn(`[API FAIL] ${label}: ${msg}`);
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

function normalizeTitleName(name = "") {
    return String(name || "")
        .toLowerCase()
        .replace(/®|™|©/g, "")
        .replace(/\btrophies\b|\btrophy set\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const TROPHY_RARITY_LABELS = { 0: "Ultra Rare", 1: "Very Rare", 2: "Rare", 3: "Common" };
function trophyRarityLabel(n) {
    if (n === null || n === undefined) return null;
    return TROPHY_RARITY_LABELS[n] || null;
}

function auditPsnApiExports() {
    const wanted = [
        "exchangeNpssoForCode", "exchangeCodeForAccessToken", "exchangeRefreshTokenForAuthTokens",
        "getUserTitles", "getUserTrophyProfileSummary", "getUserTrophiesEarnedForTitle", "getTitleTrophies",
        "getTitleTrophyGroups", "getUserTrophyGroupEarningsForTitle", "getProfileFromAccountId",
        "getRecentlyPlayedGames", "getUserRegion", "getBasicPresence", "getUserFriendsAccountIds",
        "getUserBlockedAccountIds", "getUserFriendsRequests", "getAccountDevices", "getProfileShareableLink",
        "getUserPlayedGames", "getPurchasedGames"
    ];
    const available = Object.keys(psnApi).filter((k) => typeof psnApi[k] === "function");
    const missing = wanted.filter((n) => typeof psnApi[n] !== "function");
    const unused = available.filter((k) => !wanted.includes(k));
    console.log(`[EXPORT AUDIT] Installed psn-api exposes ${available.length} functions.`);
    if (missing.length) console.warn(`[EXPORT AUDIT] ⚠️ Wanted but NOT in installed psn-api: ${missing.join(", ")}`);
    return { available, missing, unused };
}

async function archiveRawToFirestore(onlineId, key, payload) {
    if (!PULL_CONFIG.ARCHIVE_RAW || !onlineId || payload === undefined || payload === null) return;
    try {
        if (!firestoreDb) initializeAdminSdk();
        if (firestoreDb) {
            await firestoreDb.collection("raw_telemetry").doc(onlineId).set({
                [key]: payload,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    } catch (e) {
        console.warn(`[FIRESTORE RAW WARN] Could not archive ${key} for ${onlineId}: ${e.message}`);
    }
}

async function resolveFriendDirectory(auth, accountIds = []) {
    const now = Date.now();
    for (const id of accountIds) {
        const key = String(id);
        const cached = friendsDirectoryCache[key];
        if (cached) {
            const stillFresh = !cached.unresolved || (now - new Date(cached.resolvedAt || 0).getTime() < PULL_CONFIG.FRIEND_RETRY_UNRESOLVED_MS);
            if (stillFresh) continue;
        }
        if (friendLookupsThisRun >= PULL_CONFIG.FRIEND_LOOKUPS_PER_RUN) break;
        friendLookupsThisRun++;
        const p = await callPsn("getProfileFromAccountId(friend)", () => getProfileFromAccountId(auth, key), null);
        friendsDirectoryCache[key] = p
            ? {
                accountId: key,
                onlineId: p.onlineId || null,
                avatar: p.avatars?.[0]?.url || null,
                isPlus: !!p.isPlus,
                aboutMe: p.aboutMe || null,
                resolvedAt: new Date().toISOString()
            }
            : { accountId: key, onlineId: null, unresolved: true, resolvedAt: new Date().toISOString() };
        friendsDirectoryDirty = true;
    }
}

function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
}

function readUserPsnCredentials(emailKey, userRecord, secretsRecord) {
    const u = (userRecord && typeof userRecord === "object") ? userRecord : {};
    const gaming = (u.gaming_platforms && typeof u.gaming_platforms === "object") ? u.gaming_platforms : {};
    const secrets = (secretsRecord && typeof secretsRecord === "object") ? secretsRecord : {};
    const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "");

    const accountIdRaw = pick(u.psn_account_id, gaming.psn_account_id, secrets.psn_account_id);
    const tagRaw = pick(u.psn_username, gaming.psn_username, u.psn_online_id);
    const npssoRaw = pick(secrets.psn_npsso, u.psn_npsso, gaming.psn_npsso);

    return {
        emailKey,
        accountId: accountIdRaw !== undefined ? String(accountIdRaw).trim() : null,
        tag: tagRaw !== undefined ? String(tagRaw).trim() : "",
        npsso: normalizeNpsso(npssoRaw !== undefined ? String(npssoRaw) : "")
    };
}

async function writeUserPsnStatus(emailKey, fields, currentRecord) {
    const current = (currentRecord && typeof currentRecord === "object") ? currentRecord : {};
    const changed = {};
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined || v === null) continue;
        if (current[k] !== v) changed[k] = v;
    }
    if (Object.keys(changed).length === 0) return;
    try {
        const authHeader = await getFirebaseBearerHeader();
        await resilientFetch(`${SOURCE_RTDB_URL}/users/${emailKey}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify(changed)
        });
    } catch (err) {
        console.warn(`[USER STATUS WARN] Could not write PSN status for ${emailKey}: ${err.message}`);
    }
}

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

function findExistingGamertagRecord(gamertags, tag, accountId) {
    const all = (gamertags && typeof gamertags === "object") ? gamertags : {};
    if (tag && all[tag]) return all[tag];
    const lower = String(tag || "").toLowerCase();
    for (const [key, rec] of Object.entries(all)) {
        if (lower && key.toLowerCase() === lower) return rec;
        if (accountId && rec && String(rec.accountId) === String(accountId)) return rec;
    }
    return undefined;
}

function stableStringify(v) {
    if (v === undefined) return "\u2205";
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

function filterRecordForFirebase(record) {
    if (!record || typeof record !== "object") return {};
    const slim = {};
    for (const key of Object.keys(record)) {
        if (RTDB_ALLOWED_USER_KEYS.has(key)) {
            slim[key] = record[key];
        }
    }
    return slim;
}

async function writeGamertagDelta(onlineId, oldRecord, newRecord) {
    const filteredNew = filterRecordForFirebase(newRecord);
    const filteredOld = filterRecordForFirebase(oldRecord);

    const hasOld = filteredOld && typeof filteredOld === "object" && Object.keys(filteredOld).length > 0;
    if (!hasOld) {
        await syncNodeToDestRtdb(`gamertags/${onlineId}`, filteredNew);
        console.log(`[RTDB WRITE] ${onlineId}: new record written (${Object.keys(filteredNew).length} fields).`);
        return;
    }

    const newPlain = JSON.parse(JSON.stringify(filteredNew));
    const patch = {};
    const keys = new Set([...Object.keys(filteredOld), ...Object.keys(newPlain)]);
    for (const k of keys) {
        const before = stableStringify(normalizeForRtdb(filteredOld[k]));
        const afterNorm = normalizeForRtdb(newPlain[k]);
        if (before === stableStringify(afterNorm)) continue;
        patch[k] = afterNorm === undefined ? null : newPlain[k];
    }

    const changedKeys = Object.keys(patch);
    if (changedKeys.length === 0) {
        console.log(`[RTDB WRITE] ${onlineId}: nothing changed, no write.`);
        return;
    }

    try {
        const authHeader = await getFirebaseBearerHeader();
        const res = await resilientFetch(`${DEST_RTDB_URL}/psn/gamertags/${onlineId}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify(patch)
        });
        if (res && !res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`[RTDB WRITE] ${onlineId}: updated ${changedKeys.length} changed field(s).`);
    } catch (err) {
        console.warn(`[RTDB WRITE] ${onlineId}: partial update failed (${err.message}). Falling back to full write.`);
        await syncNodeToDestRtdb(`gamertags/${onlineId}`, filteredNew);
    }
}

async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    if (typeof fetch !== "undefined") {
        try {
            return await fetch(url, options);
        } catch (fetchErr) {
            console.warn(`[FETCH WARN] Global fetch fallback for ${url}: ${fetchErr.message}`);
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const headers = options.headers || {};
            if (options.body && !headers["Content-Length"]) {
                headers["Content-Length"] = Buffer.byteLength(options.body);
            }

            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: options.method || "GET",
                headers: headers
            };

            const req = client.request(reqOptions, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        text: async () => data,
                        json: async () => {
                            try { return JSON.parse(data || "{}"); } catch (e) { return {}; }
                        }
                    });
                });
            });

            req.on("error", (err) => reject(err));
            if (options.body) req.write(options.body);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function fetchFromDestRtdb(endpointPath = "") {
    try {
        const fullUrl = `${DEST_RTDB_URL}/psn${endpointPath ? '/' + endpointPath : ''}.json`;
        const authHeader = await getFirebaseBearerHeader();
        const response = await resilientFetch(fullUrl, { headers: { ...authHeader } });
        if (!response || !response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.warn(`[RTDB READ ERROR] /psn/${endpointPath}: ${err.message}`);
        return {};
    }
}

async function syncNodeToDestRtdb(endpointPath, payload) {
    const targetUrl = `${DEST_RTDB_URL}/psn/${endpointPath}.json`;
    try {
        const authHeader = await getFirebaseBearerHeader();
        const res = await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify(payload)
        });
        if (res && !res.ok) {
            console.error(`[RTDB WRITE ERROR] Failed /psn/${endpointPath}: HTTP ${res.status}`);
        }
    } catch (err) {
        console.error(`[RTDB WRITE ERROR] Failed /psn/${endpointPath}: ${err.message}`);
    }
}

async function deleteNodeFromDestRtdb(endpointPath) {
    const targetUrl = `${DEST_RTDB_URL}/psn/${endpointPath}.json`;
    try {
        const authHeader = await getFirebaseBearerHeader();
        await resilientFetch(targetUrl, { method: "DELETE", headers: { ...authHeader } });
        console.log(`[CLEANUP] Purged node from RTDB: /psn/${endpointPath}`);
    } catch (err) {
        console.warn(`[CLEANUP WARN] Failed to delete /psn/${endpointPath}: ${err.message}`);
    }
}

/* ============================================================================
 * Section: Firestore Document Management
 * ============================================================================ */
async function loadGamesFromFirestore() {
    const games = {};
    if (!firestoreDb) initializeAdminSdk();
    if (!firestoreDb) return games;

    try {
        const snapshot = await firestoreDb.collection("games").get();
        snapshot.forEach(doc => {
            games[doc.id] = doc.data();
        });
        console.log(`[FIRESTORE] Loaded ${Object.keys(games).length} games from Firestore.`);
    } catch (err) {
        console.warn(`[FIRESTORE READ WARN] games: ${err.message}`);
    }
    return games;
}

async function writeGameToFirestore(gameKey, gamePayload) {
    if (!firestoreDb) initializeAdminSdk();
    if (!firestoreDb || !gameKey) return;
    try {
        const cleanPayload = JSON.parse(JSON.stringify(gamePayload));
        await firestoreDb.collection("games").doc(gameKey).set(cleanPayload, { merge: true });
    } catch (err) {
        console.warn(`[FIRESTORE WRITE ERROR] Game ${gameKey}: ${err.message}`);
    }
}

function extractConceptIdFromText(text = "") {
    if (!text || typeof text !== "string") return null;
    const match = text.match(/concept\/(\d+)/i);
    return match ? match[1] : null;
}

function parseStoreHtmlFeatures(html) {
    const badges = [];
    const accessibility = {};
    let currentCategory = "General";

    const badgeRegex = /<li[^>]*data-qa="gameInfo#releaseInformation#gameBadges#item[^>]*>([\s\S]*?)<\/li>/gi;
    let badgeMatch;
    while ((badgeMatch = badgeRegex.exec(html)) !== null) {
        const clean = badgeMatch[1].replace(/<[^>]*>/g, "").trim();
        if (clean && !badges.includes(clean)) badges.push(clean);
    }

    const fallbackBadges = [
        "PS Plus required for online play",
        "In-game purchases optional",
        "Supports up to 4 online players with PS Plus",
        "Supports up to 32 online players with PS Plus",
        "Online play optional",
        "Online play required",
        "1 player",
        "Remote Play supported",
        "PS5 Version",
        "PS4 Version",
        "PS4 Pro Enhanced",
        "DUALSHOCK 4 vibration",
        "Vibration function and trigger effect supported (DualSense wireless controller)"
    ];

    fallbackBadges.forEach(b => {
        if (html.includes(b) && !badges.includes(b)) badges.push(b);
    });

    const accessMatch = html.match(/Accessibility Features([\s\S]*?)(?:Game and Legal Info|<footer)/i);
    if (accessMatch && accessMatch[1]) {
        const rawAccess = accessMatch[1];
        const lines = rawAccess.replace(/<[^>]*>/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (["Visuals", "Subtitles and Captions", "Controls", "Gameplay", "Audio"].includes(line)) {
                currentCategory = line;
                if (!accessibility[currentCategory]) accessibility[currentCategory] = [];
            } else if (accessibility[currentCategory] && line.length > 3 && !accessibility[currentCategory].includes(line)) {
                accessibility[currentCategory].push(line);
            }
        }
    }

    return { badges, accessibility };
}

async function queryStoreMetadata(identifier, isProductSku = false) {
    if (!identifier) return null;
    try {
        const pathType = isProductSku ? "product" : "concept";
        const storeUrl = `https://store.playstation.com/en-us/${pathType}/${identifier}`;

        const response = await resilientFetch(storeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        if (!response || !response.ok) return null;
        const html = await response.text();

        let nextData = null;
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nextDataMatch && nextDataMatch[1]) {
            try { nextData = JSON.parse(nextDataMatch[1]); } catch (err) {}
        }

        const pageProps = nextData?.props?.pageProps || {};
        const entity = pageProps.concept || pageProps.product || {};
        const parsedFeatures = parseStoreHtmlFeatures(html);

        let richDescription = entity.longDescription || entity.description || null;
        if (!richDescription) {
            const descMatch = html.match(/<p data-qa="gameInfo#releaseInformation#description"[^>]*>([\s\S]*?)<\/p>/i) ||
                              html.match(/<meta property="og:description" content="([\s\S]*?)"/i);
            if (descMatch && descMatch[1]) {
                richDescription = descMatch[1].replace(/<[^>]*>/g, "\n").trim();
            }
        }

        const defaultProd = entity.defaultProduct || (isProductSku ? entity : {});
        const mediaItems = entity.media || defaultProd.media || [];
        const screenshots = Array.isArray(mediaItems)
            ? mediaItems.filter(m => m.type === "IMAGE").map(m => resolveGamePosterArt([m.url])).filter(Boolean)
            : [];

        const editions = Array.isArray(entity.products) ? entity.products.map(p => ({
            productId: p.id,
            name: p.name,
            price: p.price?.displayPrice || "Store Listing",
            isFree: !!p.price?.isFree,
            platforms: p.platforms || []
        })) : [];

        return {
            conceptId: isProductSku ? (entity.conceptId || null) : String(identifier),
            productId: isProductSku ? String(identifier) : (defaultProd.id || null),
            storeUrl: `//store.playstation.com/en-us/${pathType}/${identifier}`,
            name: entity.name || defaultProd.name || null,
            publisher: entity.publisherName || entity.publisher || defaultProd.publisherName || null,
            releaseDate: entity.releaseDate || defaultProd.releaseDate || null,
            genres: Array.isArray(entity.genres) ? entity.genres : (defaultProd.genres || []),
            price: defaultProd.price?.displayPrice || "Store Listing",
            discountedPrice: defaultProd.price?.discountedPrice || null,
            isFree: !!defaultProd.price?.isFree,
            rating: entity.contentRating?.name || defaultProd.contentRating?.name || null,
            ratingDescriptors: entity.contentRating?.descriptors || defaultProd.contentRating?.descriptors || [],
            badges: parsedFeatures.badges,
            accessibility: parsedFeatures.accessibility,
            screenshots: screenshots,
            editions: editions,
            longDescription: richDescription,
            fetchedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn(`[STORE FETCH ERROR] Failed ${identifier}: ${err.message}`);
        return null;
    }
}

async function searchStoreConceptByName(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    try {
        const cleanQuery = encodeURIComponent(gameName.replace(/®|™/g, "").trim());
        const searchApiUrl = `https://web.np.playstation.com/api/graphql/v1/op?operationName=getSearchResults&variables=%7B%22searchTerm%22%3A%22${cleanQuery}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22d77d9a513cbdba90e2908f4c17c4613271789721d15c7e0d37e6f3b7d7b0b63e%22%7D%7D`;

        const res = await resilientFetch(searchApiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "x-psn-app-ver": "latest"
            }
        });

        if (!res || !res.ok) return null;
        const data = await res.json();
        const searchResults = data?.data?.universalSearch?.results || [];

        for (const item of searchResults) {
            const conceptId = item.id || extractConceptIdFromText(item.url);
            if (conceptId) return String(conceptId);
        }
        return null;
    } catch (e) {
        return null;
    }
}

function parseDetailedHardwareContext(rawPresence, matchedGame = {}) {
    const primaryInfo = rawPresence?.primaryPlatformInfo || {};
    const rawPlatform = (primaryInfo.platform || rawPresence?.platform || "").toUpperCase();

    let activeHardware = "Unknown";
    if (rawPlatform.includes("PS5")) activeHardware = "PS5";
    else if (rawPlatform.includes("PS4")) activeHardware = "PS4";
    else if (rawPlatform.includes("PS3")) activeHardware = "PS3";
    else if (rawPlatform.includes("VITA")) activeHardware = "PS Vita";
    else if (rawPlatform.includes("PSP")) activeHardware = "PSP";
    else activeHardware = (matchedGame?.platform || "PS5");

    const isStreaming = !!(
        primaryInfo.isInGameStreaming ||
        primaryInfo.streamingType ||
        rawPresence?.isInGameStreaming ||
        primaryInfo.remotePlay ||
        String(primaryInfo.platform).toUpperCase().includes("STREAM")
    );

    const gameInfoList = rawPresence?.gameTitleInfoList?.[0] || primaryInfo?.gameTitleInfoList?.[0] || {};
    const rawFormatValue = (gameInfoList.formatValue || matchedGame.category || matchedGame.npServiceName || "").toUpperCase();

    let gameBuildVersion = "PS5 Native Game";
    if (rawFormatValue.includes("PS4") || rawFormatValue === "TROPHY") {
        gameBuildVersion = (activeHardware === "PS5") ? "PS4 Back-Compat on PS5" : "PS4 Native Game";
    } else if (rawFormatValue.includes("PS3")) {
        gameBuildVersion = "PS3 Classic";
    } else if (rawFormatValue.includes("VITA")) {
        gameBuildVersion = "PS Vita App";
    } else if (rawFormatValue.includes("PS5") || rawFormatValue === "TROPHY2") {
        gameBuildVersion = "PS5 Native Game";
    } else if (matchedGame.platform) {
        gameBuildVersion = `${matchedGame.platform} Game`;
    }

    return {
        activeHardware: activeHardware,
        isStreamingRemotePlay: isStreaming,
        gameBuildVersion: gameBuildVersion,
        displayPlatformLabel: isStreaming ? `${activeHardware} (Remote Play)` : activeHardware
    };
}

function normalizePlatform(game) {
    const raw = (
        game?.trophyTitlePlatform ||
        game?.platform ||
        game?.category ||
        (game?.npServiceName === "trophy2" ? "PS5" : "PS4") ||
        "PS4"
    ).toUpperCase();

    if (raw.includes("PS5")) return "PS5";
    if (raw.includes("PS4")) return "PS4";
    if (raw.includes("PS3")) return "PS3";
    if (raw.includes("VITA")) return "PS Vita";
    if (raw.includes("PSP")) return "PSP";
    return "PS5";
}

function estimateGameFileSize(gameName = "", platform = "PS5") {
    const nameLower = gameName.toLowerCase();
    if (nameLower.includes("red dead redemption")) return "105.0 GB";
    if (nameLower.includes("ghost recon wildlands")) return "62.4 GB";
    if (nameLower.includes("thehunter") || nameLower.includes("call of the wild")) return "48.2 GB";
    if (nameLower.includes("way of the hunter")) return "22.6 GB";
    if (nameLower.includes("sniper elite 5")) return "55.1 GB";
    if (nameLower.includes("farming simulator 25")) return "38.5 GB";
    if (nameLower.includes("path of titans")) return "12.8 GB";
    if (nameLower.includes("left 4 dead")) return "7.5 GB";
    return platform === "PS5" ? "42.0 GB" : "28.5 GB";
}

function estimateDlcFileSize(dlcName = "") {
    const dLower = dlcName.toLowerCase();
    if (dLower.includes("heirloom")) return "450 MB";
    if (dLower.includes("narco road")) return "9.2 GB";
    if (dLower.includes("fallen ghosts")) return "10.4 GB";
    if (dLower.includes("night hunting")) return "1.2 GB";
    if (dLower.includes("reserve") || dLower.includes("map")) return "4.8 GB";
    if (dLower.includes("weapon") || dLower.includes("pack")) return "850 MB";
    return "2.4 GB";
}

function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const SECONDS_IN_MIN = 60;
    const SECONDS_IN_HOUR = 3600;
    const SECONDS_IN_DAY = 86400;
    const SECONDS_IN_WEEK = 604800;
    const SECONDS_IN_MONTH = 2592000;
    const SECONDS_IN_YEAR = 31536000;

    if (totalSeconds >= SECONDS_IN_YEAR) {
        const years = Math.floor(totalSeconds / SECONDS_IN_YEAR);
        const remMonths = Math.floor((totalSeconds % SECONDS_IN_YEAR) / SECONDS_IN_MONTH);
        if (remMonths > 0) return `${years} ${years > 1 ? "years" : "year"}, ${remMonths} ${remMonths > 1 ? "months" : "month"}`;
        return `${years} ${years > 1 ? "years" : "year"}`;
    }
    if (totalSeconds >= SECONDS_IN_MONTH) {
        const months = Math.floor(totalSeconds / SECONDS_IN_MONTH);
        const remWeeks = Math.floor((totalSeconds % SECONDS_IN_MONTH) / SECONDS_IN_WEEK);
        if (remWeeks > 0) return `${months} ${months > 1 ? "months" : "month"}, ${remWeeks} ${remWeeks > 1 ? "weeks" : "week"}`;
        return `${months} ${months > 1 ? "months" : "month"}`;
    }
    if (totalSeconds >= SECONDS_IN_WEEK) {
        const weeks = Math.floor(totalSeconds / SECONDS_IN_WEEK);
        const remDays = Math.floor((totalSeconds % SECONDS_IN_WEEK) / SECONDS_IN_DAY);
        if (remDays > 0) return `${weeks} ${weeks > 1 ? "weeks" : "week"}, ${remDays} ${remDays > 1 ? "days" : "day"}`;
        return `${weeks} ${weeks > 1 ? "weeks" : "week"}`;
    }
    if (totalSeconds >= SECONDS_IN_DAY) {
        const days = Math.floor(totalSeconds / SECONDS_IN_DAY);
        const remHours = Math.floor((totalSeconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
        const remMinutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MIN);
        if (remHours > 0) return `${days} ${days > 1 ? "days" : "day"}, ${remHours}h ${remMinutes}m`;
        if (remMinutes > 0) return `${days} ${days > 1 ? "days" : "day"}, ${remMinutes} mins`;
        return `${days} ${days > 1 ? "days" : "day"}`;
    }
    if (totalSeconds >= SECONDS_IN_HOUR) {
        const hours = Math.floor(totalSeconds / SECONDS_IN_HOUR);
        const minutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MIN);
        if (minutes > 0) return `${hours}h ${minutes}m`;
        return `${hours} hrs`;
    }
    const minutes = Math.floor(totalSeconds / SECONDS_IN_MIN);
    return `${minutes} mins`;
}

function parseIsoDuration(durationStr) {
    if (!durationStr || typeof durationStr !== "string") return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function resolveGamePosterArt(sources = []) {
    for (const src of sources) {
        if (typeof src === "string" && src.trim().length > 0 && !src.includes("undefined") && !src.includes("null")) {
            let cleanUrl = src.trim();
            if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.replace("http://", "//");
            if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.replace("https://", "//");
            return cleanUrl;
        }
        if (src && typeof src === "object" && src.url) {
            let cleanUrl = src.url.trim();
            if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.replace("http://", "//");
            if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.replace("https://", "//");
            return cleanUrl;
        }
    }
    return null;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    let diff = Math.max(0, now - past);

    const intervals = [
        { label: "yr", value: 31536000000 },
        { label: "month", value: 2592000000 },
        { label: "week", value: 604800000 },
        { label: "day", value: 86400000 },
        { label: "hour", value: 3600000 },
        { label: "min", value: 60000 }
    ];

    const parts = [];
    for (const interval of intervals) {
        const count = Math.floor(diff / interval.value);
        if (count > 0) {
            parts.push(`${count} ${interval.label}${count > 1 ? "s" : ""}`);
            diff -= count * interval.value;
        }
    }
    return parts.length > 0 ? parts.join(", ") : "Just now";
}

function calculateAgeString(startDate, endDate = new Date()) {
    if (!startDate) return "Unknown";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years} years, ${months} months`;
    return `${months} months`;
}

function getDifficultyTier(earnedRate) {
    if (earnedRate === undefined || earnedRate === null) return "Rare";
    const rate = parseFloat(earnedRate);
    if (isNaN(rate)) return "Rare";
    if (rate <= 5.0) return "Ultra Rare (Very Hard)";
    if (rate <= 15.0) return "Very Rare (Hard)";
    if (rate <= 50.0) return "Rare (Medium)";
    return "Common (Easy)";
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `//www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

function normalizeBasicPresence(raw) {
    if (!raw) return null;
    return raw?.basicPresence ||
           (Array.isArray(raw) ? raw[0] : null) ||
           (raw?.basicPresences ? raw.basicPresences[0] : null) ||
           raw;
}

function extractGameStatus(basicPresence) {
    if (!basicPresence) return null;
    const info = basicPresence?.gameTitleInfoList?.[0] ||
                 basicPresence?.primaryPlatformInfo?.gameTitleInfoList?.[0] ||
                 {};
    const status = info.gameStatus || basicPresence.gameStatus || basicPresence?.primaryPlatformInfo?.gameStatus || null;
    if (typeof status !== "string") return null;
    const clean = status.trim();
    return clean.length > 0 ? clean : null;
}

function inferGameCapabilitiesFromTrophies(gameName, trophies = [], commId = null, storeBadges = []) {
    const combinedTrophyText = (trophies || []).map(t => `${t.name || ""} ${t.description || ""} ${t.detail || ""}`).join(" ").toLowerCase();
    const cleanName = (gameName || "").toLowerCase().trim();
    const badgesLower = (storeBadges || []).map(b => b.toLowerCase());

    const hasBadgeOnline = badgesLower.some(b => b.includes("online play") || b.includes("online players"));
    const hasBadgePsPlus = badgesLower.some(b => b.includes("ps plus"));

    const coopTokens = ["co-op", "coop", "cooperative", "partner", "teammate", "revive an ally", "revive a player", "with a friend", "invite a friend", "as a duo", "posse"];
    const pvpTokens = ["multiplayer", "pvp", "versus", "invade", "invasion", "axis invasion", "ranked match", "online match", "opponents", "deathmatch", "battle royale", "win a match", "series major", "the real deal"];
    const campaignTokens = ["campaign", "chapter", "mission", "story", "prologue", "epilogue", "difficulty", "collectibles", "memories", "complete the game"];

    const hasCoopTrophies = coopTokens.some(token => combinedTrophyText.includes(token));
    const hasPvpTrophies = pvpTokens.some(token => combinedTrophyText.includes(token));
    const hasCampaignTrophies = campaignTokens.some(token => combinedTrophyText.includes(token)) || (trophies && trophies.length > 15);

    const isDedicatedCoop = cleanName.includes("it takes two") || cleanName.includes("a way out") || cleanName.includes("we were here");
    const isRdr2 = cleanName.includes("red dead") || cleanName.includes("rdr2");
    const isTsushima = cleanName.includes("ghost of tsushima") || cleanName.includes("tsushima") || cleanName.includes("legends");
    const isNfs = cleanName.includes("need for speed") || cleanName.includes("nfs ");
    const isFarmSim = cleanName.includes("farming simulator");
    const isSniperElite = cleanName.includes("sniper elite") || cleanName.includes("zombie army");
    const isHunter = cleanName.includes("thehunter") || cleanName.includes("hunter: call of the wild") || cleanName.includes("way of the hunter");
    const isWildlands = cleanName.includes("wildlands") || cleanName.includes("breakpoint") || cleanName.includes("division");
    const isTitans = cleanName.includes("path of titans");

    const isMulti = hasBadgeOnline || hasCoopTrophies || hasPvpTrophies || isDedicatedCoop || isRdr2 || isTsushima || isNfs || isFarmSim || isSniperElite || isHunter || isWildlands || isTitans;
    const isCrossPlay = isDedicatedCoop || isTsushima || cleanName.includes("unbound") || isFarmSim || cleanName.includes("sniper elite 5") || isTitans;

    let multiplayerType = "Single Player Only";
    let onlineMode = "Offline Only";

    if (isDedicatedCoop) {
        multiplayerType = "Co-Op Only (2-Player)";
        onlineMode = "Online Play Required";
    } else if (isRdr2) {
        multiplayerType = "Solo Story + Red Dead Online (Up to 32 Players)";
        onlineMode = "Online & Offline Playable";
    } else if (isHunter) {
        multiplayerType = "Solo Reserves + Online Co-Op Hunting (Up to 4-8 Players)";
        onlineMode = "Online & Offline Playable";
    } else if (isTsushima) {
        multiplayerType = "Solo Campaign + Legends Co-Op (2-4)";
        onlineMode = "Online & Offline Playable";
    } else if (isSniperElite) {
        multiplayerType = "Solo Campaign + Co-Op & Invasion (2-16)";
        onlineMode = "Online & Offline Playable";
    } else if (isFarmSim) {
        multiplayerType = "Solo Farm + Online Co-Op (6-Player)";
        onlineMode = "Online & Offline Playable";
    } else if (isNfs) {
        multiplayerType = "Solo Story + Online Racing (8-16)";
        onlineMode = "Online & Offline Playable";
    } else if (isWildlands) {
        multiplayerType = "Solo Campaign + Online Co-Op (4-Player)";
        onlineMode = "Online & Offline Playable";
    } else if (hasCoopTrophies && hasPvpTrophies) {
        multiplayerType = "Solo Campaign + Co-Op & Online PvP";
        onlineMode = "Online & Offline Playable";
    } else if (hasCoopTrophies) {
        multiplayerType = "Solo Campaign + Online Co-Op";
        onlineMode = "Online & Offline Playable";
    } else if (hasPvpTrophies) {
        multiplayerType = "Solo Story + Online Multiplayer";
        onlineMode = "Online & Offline Playable";
    }

    return {
        isMultiplayer: isMulti,
        isCoOpOnly: isDedicatedCoop,
        hasCampaign: isDedicatedCoop ? true : (hasCampaignTrophies || !isTitans),
        multiplayerType: multiplayerType,
        onlineMode: onlineMode,
        isCrossPlatform: isCrossPlay,
        crossPlayPlatforms: isCrossPlay ? ["PS5", "PS4", "PC", "Xbox Series X|S"] : ["PlayStation Network"],
        psPlusRequired: hasBadgePsPlus || (isMulti && !cleanName.includes("free to play"))
    };
}

function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline, activeTitleId) {
    const playSessions = existingUserData?.playSessions || {};
    const now = Date.now();
    const primaryKey = activeCommId || activeTitleId;

    for (const [id, session] of Object.entries(playSessions)) {
        if (session.isActive && (id !== primaryKey || !isOnline)) {
            const lastCheckpoint = session.lastSyncedTime || session.sessionStartTime || now;
            const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));
            session.accumulatedSeconds = (session.accumulatedSeconds || 0) + deltaSeconds;
            const manualSeconds = Math.round((session.manualBaselineHours || 0) * 3600);
            session.totalSeconds = manualSeconds + session.accumulatedSeconds;

            session.isActive = false;
            session.sessionStartTime = null;
            session.lastSyncedTime = null;
            session.lastEndedTime = now;
            session.totalFormatted = formatDuration(session.totalSeconds);
            session.totalHours = Math.round((session.totalSeconds / 3600) * 10) / 10;
        }
    }

    if (isOnline && primaryKey && primaryKey !== "Dashboard") {
        if (!playSessions[primaryKey]) {
            const manualBaselineHours = existingUserData?.manualBaselineHours || 0;
            const manualSeconds = Math.round(manualBaselineHours * 3600);

            playSessions[primaryKey] = {
                commId: activeCommId || primaryKey,
                titleId: activeTitleId || primaryKey,
                title: activeTitle,
                manualBaselineHours: manualBaselineHours,
                accumulatedSeconds: 0,
                totalSeconds: manualSeconds,
                isActive: true,
                sessionStartTime: now,
                lastSyncedTime: now,
                totalFormatted: formatDuration(manualSeconds),
                totalHours: Math.round((manualSeconds / 3600) * 10) / 10
            };
        } else {
            const current = playSessions[primaryKey];
            if (!current.isActive) {
                current.isActive = true;
                current.sessionStartTime = now;
                current.lastSyncedTime = now;
            } else {
                const lastCheckpoint = current.lastSyncedTime || current.sessionStartTime || now;
                const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));
                current.accumulatedSeconds = (current.accumulatedSeconds || 0) + deltaSeconds;
                current.lastSyncedTime = now;

                const manualSeconds = Math.round((current.manualBaselineHours || 0) * 3600);
                current.totalSeconds = manualSeconds + current.accumulatedSeconds;
                current.totalFormatted = formatDuration(current.totalSeconds);
                current.totalHours = Math.round((current.totalSeconds / 3600) * 10) / 10;
            }
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    let activeSessionSeconds = 0;
    if (primaryKey && playSessions[primaryKey]) {
        const active = playSessions[primaryKey];
        activeSessionSeconds = active.totalSeconds || 0;
        currentGameDurationFormatted = active.totalFormatted || formatDuration(activeSessionSeconds);
    }

    return { playSessions, currentGameDurationFormatted, activeSessionSeconds };
}

async function loadPersistentTokens() {
    try {
        const remoteTokens = await fetchFromDestRtdb("secureTokens");
        if (remoteTokens && typeof remoteTokens === "object") {
            tokenStore = { ...tokenStore, ...remoteTokens };
        }
    } catch (e) {}

    if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(LOCAL_TOKENS_PATH, "utf-8"));
            if (localData && typeof localData === "object") {
                tokenStore = { ...tokenStore, ...localData };
            }
        } catch (e) {}
    }
}

async function savePersistentTokens() {
    try {
        fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokenStore, null, 2), "utf-8");
    } catch (e) {}
    try {
        await syncNodeToDestRtdb("secureTokens", tokenStore);
    } catch (e) {}
}

async function purgeToken(userKey) {
    if (tokenStore[userKey]) {
        tokenStore[userKey].accessToken = null;
    }
}

async function isTokenValid(accessToken) {
    try {
        await getUserRegion({ accessToken }, "me");
        return true;
    } catch (e) { return false; }
}

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);

    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        const isValid = await isTokenValid(currentUserTokens.accessToken);
        if (isValid) {
            diagnosticReport[`${userKey}_active`] = "yes";
            diagnosticReport[`${userKey}_status`] = "ACTIVE_ACCESS_TOKEN";
            return { accessToken: currentUserTokens.accessToken, npssoValid: true, userKey };
        }
        currentUserTokens.accessToken = null;
    }

    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            if (refreshed && refreshed.accessToken) {
                tokenStore[userKey] = {
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken || currentUserTokens.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600)
                };
                await savePersistentTokens();
                diagnosticReport[`${userKey}_active`] = "yes";
                diagnosticReport[`${userKey}_status`] = "ACTIVE_VIA_REFRESH";
                return { ...refreshed, npssoValid: true, userKey };
            }
        } catch (e) {
            await purgeToken(userKey);
        }
    }

    if (npssoInput && npssoInput.trim().length > 0) {
        try {
            const cleanNpsso = npssoInput.trim();
            const accessCode = await exchangeNpssoForCode(cleanNpsso);
            const auth = await exchangeCodeForAccessToken(accessCode);

            if (auth && auth.accessToken) {
                tokenStore[userKey] = {
                    accessToken: auth.accessToken,
                    refreshToken: auth.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600)
                };
                await savePersistentTokens();
                diagnosticReport[`${userKey}_active`] = "yes";
                diagnosticReport[`${userKey}_status`] = "ACTIVE_VIA_NPSSO";
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) {
            diagnosticReport[`${userKey}_active`] = "no";
            diagnosticReport[`${userKey}_status`] = `EXPIRED_NPSSO (${e.message})`;
            return null;
        }
    }

    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "OFFLINE_GUEST_MODE";
    return null;
}

async function resolveMasterSession(coreNpssos = {}) {
    const auths = {};
    for (const member of CORE_PACK) {
        auths[member.key] = await getAuthenticated(member.key, coreNpssos[member.key] || "");
    }

    const stateLabels = {
        wildhorse_spirit: { state: "PRIMARY_WOLF", buffer: "PRIMARY HEALTHY (Werewolf Running)" },
        ray: { state: "FAILOVER_RAY", buffer: "RUNNING ON BACKUP (Ray Active)" },
        darkwing: { state: "FAILOVER_DARKWING", buffer: "RUNNING ON BACKUP (Darkwing Active)" },
        marc: { state: "FAILOVER_MARC", buffer: "RUNNING ON BACKUP (Marc Active)" }
    };

    let activeMaster = null;
    let failoverState = "SNAPSHOT_FALLBACK";
    let bufferStatus = "READ-ONLY SNAPSHOT MODE";

    for (const member of CORE_PACK) {
        const a = auths[member.key];
        if (a && a.accessToken) {
            activeMaster = a;
            failoverState = stateLabels[member.key].state;
            bufferStatus = stateLabels[member.key].buffer;
            break;
        }
    }

    return { masterAuth: activeMaster, auths, failoverState, bufferStatus };
}

async function enrichDLCGroups(canonicalCommId, mappedGroups, userPurchasedTitles = [], cloudDlcCatalog = {}) {
    const safePurchased = Array.isArray(userPurchasedTitles) ? userPurchasedTitles : [];
    const safeCatalog = (cloudDlcCatalog && typeof cloudDlcCatalog === "object") ? cloudDlcCatalog : {};
    const safeGroups = Array.isArray(mappedGroups) ? mappedGroups : [];

    return safeGroups.map(grp => {
        const groupName = grp.name || "Add-On Content";
        const groupNameLower = groupName.toLowerCase().trim();

        const matchedCloudPack = Object.values(safeCatalog).find(pack => {
            if (!pack || typeof pack !== "object") return false;
            const packNameLower = (pack.pack_name || pack.name || "").toLowerCase().trim();
            return packNameLower.includes(groupNameLower) || groupNameLower.includes(packNameLower);
        }) || {};

        const resolvedDlcImage = resolveGamePosterArt([
            grp.trophyGroupIconUrl,
            matchedCloudPack.image,
            matchedCloudPack.posterArt,
            matchedCloudPack.thumbnail
        ]);

        const isUserOwned = safePurchased.some(p => (p && p.name && p.name.toLowerCase().includes(groupNameLower))) ||
                            matchedCloudPack.price === "Free" ||
                            (grp.definedTrophies && typeof grp.definedTrophies === "object" && Object.values(grp.definedTrophies).some(count => count > 0));

        return {
            groupId: grp.trophyGroupId,
            name: groupName,
            title: groupName,
            description: matchedCloudPack.summary || matchedCloudPack.description || `Official PlayStation add-on: ${groupName}.`,
            price: matchedCloudPack.price !== undefined ? matchedCloudPack.price : "Store Listing",
            size: matchedCloudPack.size || estimateDlcFileSize(groupName),
            image: resolvedDlcImage,
            isOwned: isUserOwned,
            isDLC: true,
            definedTrophies: grp.definedTrophies || {},
            includedItems: matchedCloudPack.items_included || []
        };
    });
}

async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames, userPurchasedTitles = [], cloudDlcCatalog = {}, subTitleId = null, initialConceptId = null) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();
    const resolvedName = gameName || "PlayStation Game";
    const gameDocKey = toGameKey(resolvedName);

    const previousRecord = globalGames[gameDocKey] || {};

    try {
        const isPs5 = platform === "PS5";
        let opt = { npServiceName: isPs5 ? "trophy2" : "trophy" };

        let metaRes = await getTitleTrophies(auth, canonicalCommId, "all", opt).catch(() => null);
        if (!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altRes = await getTitleTrophies(auth, canonicalCommId, "all", { npServiceName: altService }).catch(() => null);
            if (altRes && altRes.trophies && altRes.trophies.length > 0) {
                opt.npServiceName = altService;
                metaRes = altRes;
            }
        }

        if ((!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) && previousRecord.trophies && previousRecord.trophies.length > 0) {
            return previousRecord;
        }

        let groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, opt).catch(() => null);
        if (!groupsRes || !groupsRes.trophyGroups) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, { npServiceName: altService }).catch(() => ({ trophyGroups: [] }));
        }

        const safePoster = resolveGamePosterArt([posterArt, iconArt, previousRecord.posterArt, previousRecord.trophyTitleIconUrl]);

        const mappedTrophies = (metaRes?.trophies && metaRes.trophies.length > 0) ? metaRes.trophies.map(t => {
            const prevTrophy = (previousRecord.trophies || []).find(p => p.trophyId === t.trophyId) || {};
            const earnedRate = t.trophyEarnedRate || prevTrophy.earnedRate || "0.0";
            const rareEnum = (t.trophyRare !== undefined && t.trophyRare !== null) ? t.trophyRare : (prevTrophy.trophyRare ?? null);
            const tRank = (t.trophyType || "bronze").toLowerCase();
            const targetVal = t.trophyProgressTargetValue ? parseInt(t.trophyProgressTargetValue, 10) : 0;
            return {
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy",
                title: t.trophyName || "Unknown Trophy",
                description: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                detail: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                type: tRank,
                rank: tRank.toUpperCase(),
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: targetVal,
                rarity: `${earnedRate}%`,
                trophyRare: rareEnum,
                rarityTier: trophyRarityLabel(rareEnum),
                rewardName: t.trophyRewardName || prevTrophy.rewardName || null,
                rewardImage: t.trophyRewardImageUrl || prevTrophy.rewardImage || null,
                earnedRate: earnedRate,
                difficultyTier: getDifficultyTier(earnedRate),
                hidden: !!t.trophyHidden
            };
        }) : (previousRecord.trophies || []);

        const rawGroups = (groupsRes?.trophyGroups && groupsRes.trophyGroups.length > 0) ? groupsRes.trophyGroups.map(g => ({
            ...g,
            trophyGroupId: g.trophyGroupId,
            name: g.trophyGroupName || "Base Game",
            trophyGroupIconUrl: g.trophyGroupIconUrl || null,
            definedTrophies: g.definedTrophies || {}
        })) : (previousRecord.groups || []);

        const enrichedDlcs = await enrichDLCGroups(canonicalCommId, rawGroups, userPurchasedTitles, cloudDlcCatalog);
        const resolvedCusaId = subTitleId || previousRecord.cusaId || previousRecord.titleId || null;

        let resolvedConceptId = initialConceptId ||
                                previousRecord.conceptId ||
                                extractConceptIdFromText(posterArt) ||
                                extractConceptIdFromText(iconArt) ||
                                null;

        if (!resolvedConceptId && resolvedName && resolvedName !== "PlayStation Game") {
            resolvedConceptId = await searchStoreConceptByName(resolvedName);
        }

        let storeListing = previousRecord.storeListing || null;
        const storeAgeMs = storeListing?.fetchedAt ? (Date.now() - Date.parse(storeListing.fetchedAt)) : Infinity;
        if (!storeListing || (!storeListing.longDescription && storeAgeMs > 7 * 24 * 3600 * 1000)) {
            if (resolvedConceptId) {
                storeListing = await queryStoreMetadata(resolvedConceptId, false);
            }
            if ((!storeListing || !storeListing.longDescription) && resolvedCusaId) {
                const productListing = await queryStoreMetadata(resolvedCusaId, true);
                if (productListing) {
                    storeListing = { ...(storeListing || {}), ...productListing };
                }
            }
        }

        const storeBadges = storeListing?.badges || [];
        const capabilities = inferGameCapabilitiesFromTrophies(resolvedName, mappedTrophies, canonicalCommId, storeBadges);

        const gradeCounts = mappedTrophies.reduce((acc, curr) => {
            const grade = curr.type || "bronze";
            if (acc[grade] !== undefined) acc[grade]++;
            return acc;
        }, { bronze: 0, silver: 0, gold: 0, platinum: 0 });

        const hasDefinedTrophies = definedTrophies && typeof definedTrophies === "object" && Object.keys(definedTrophies).length > 0;
        const resolvedDefinedTrophies = hasDefinedTrophies ? definedTrophies : (previousRecord.definedTrophies || gradeCounts);

        const resolvedDescription = storeListing?.longDescription ||
                                    previousRecord.description ||
                                    `Official PlayStation title: ${resolvedName}. Features: ${capabilities.multiplayerType}.`;

        const masterGameData = {
            gameKey: gameDocKey,
            commId: canonicalCommId,
            npCommunicationId: canonicalCommId,
            cusaId: resolvedCusaId,
            titleId: resolvedCusaId,
            conceptId: resolvedConceptId || storeListing?.conceptId || null,
            name: resolvedName,
            description: resolvedDescription,
            storeListing: storeListing,
            storeBadges: storeBadges,
            accessibilityFeatures: storeListing?.accessibility || {},
            platform: platform || previousRecord.platform || "PS5",
            npServiceName: opt.npServiceName,
            posterArt: safePoster,
            trophyTitleIconUrl: iconArt || previousRecord.trophyTitleIconUrl || safePoster,
            fileSize: previousRecord.fileSize || estimateGameFileSize(resolvedName, platform),
            isMultiplayer: capabilities.isMultiplayer,
            isCoOpOnly: capabilities.isCoOpOnly,
            hasCampaign: capabilities.hasCampaign,
            multiplayerType: capabilities.multiplayerType,
            onlineMode: capabilities.onlineMode,
            isCrossPlatform: capabilities.isCrossPlatform,
            crossPlayPlatforms: capabilities.crossPlayPlatforms,
            psPlusRequired: capabilities.psPlusRequired,
            multiplayerInfo: capabilities,
            definedTrophies: resolvedDefinedTrophies,
            totalTrophies: mappedTrophies.length || previousRecord.totalTrophies || 0,
            trophies: mappedTrophies,
            groups: rawGroups,
            dlcs: enrichedDlcs,
            rawSonyMetadata: (metaRes && metaRes.trophies && metaRes.trophies.length > 0) ? metaRes : (previousRecord.rawSonyMetadata || {}),
            lastUpdated: new Date().toISOString()
        };

        globalGames[gameDocKey] = masterGameData;
        await writeGameToFirestore(gameDocKey, masterGameData);
        return masterGameData;
    } catch (err) {
        console.warn(`[SKELETON ERROR] Failed to ingest skeleton for ${gameDocKey}:`, err.message);
        return globalGames[gameDocKey] || null;
    }
}

async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames, existingGameProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();
    const gameDocKey = toGameKey(titleName);

    try {
        let opt = { npServiceName: (platform === "PS5" || globalGames[gameDocKey]?.npServiceName === "trophy2") ? "trophy2" : "trophy" };

        let earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", opt).catch(() => ({}));
        let groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, canonicalCommId, opt).catch(() => ({}));

        if (!earnedRes || !earnedRes.trophies || earnedRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altEarned = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", { npServiceName: altService }).catch(() => ({}));
            if (altEarned && altEarned.trophies && altEarned.trophies.length > 0) {
                opt.npServiceName = altService;
                earnedRes = altEarned;
                groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, canonicalCommId, { npServiceName: altService }).catch(() => ({}));
            }
        }

        let earnedStatus = earnedRes?.trophies || [];
        if (earnedRes?.totalItemCount && earnedRes.totalItemCount > earnedStatus.length) {
            let earnedOffset = earnedStatus.length;
            while (earnedOffset < earnedRes.totalItemCount) {
                const moreEarned = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", { ...opt, offset: earnedOffset, limit: 100 }).catch(() => ({}));
                const nextBatch = moreEarned?.trophies || [];
                if (nextBatch.length === 0) break;
                earnedStatus.push(...nextBatch);
                earnedOffset += nextBatch.length;
            }
        }

        const activeSkeleton = globalGames[gameDocKey] || {};
        const skeletonTrophies = activeSkeleton.trophies || [];
        const standaloneProgressMap = { ...(existingGameProgress || {}) };
        const earnedTrophiesList = [];

        earnedStatus.forEach(s => {
            const skelTrophy = skeletonTrophies.find(t => t.trophyId === s.trophyId);
            const currentProgress = s.progress !== undefined ? parseInt(s.progress, 10) : (s.trophyProgress !== undefined ? parseInt(s.trophyProgress, 10) : 0);
            const targetVal = skelTrophy?.targetValue || (s.trophyProgressTargetValue ? parseInt(s.trophyProgressTargetValue, 10) : 0);
            const progressRate = s.progressRate !== undefined ? `${s.progressRate}%` : null;

            let progressRatio = null;
            if (targetVal > 0) {
                progressRatio = `${currentProgress}/${targetVal}`;
            } else if (progressRate) {
                progressRatio = progressRate;
            } else if (currentProgress > 0 && !s.earned) {
                progressRatio = `${currentProgress}%`;
            } else if (s.earned) {
                progressRatio = targetVal > 0 ? `${targetVal}/${targetVal}` : "100%";
            }

            const tRank = (skelTrophy?.type || s.trophyType || "bronze").toLowerCase();
            const liveEarnedRate = (s.trophyEarnedRate !== undefined && s.trophyEarnedRate !== null) ? String(s.trophyEarnedRate) : null;
            const liveRareEnum = (s.trophyRare !== undefined && s.trophyRare !== null) ? s.trophyRare : (skelTrophy?.trophyRare ?? null);
            const resolvedEarnedRate = liveEarnedRate || skelTrophy?.earnedRate || "0.0";

            standaloneProgressMap[s.trophyId] = {
                trophyId: s.trophyId,
                gameTitle: titleName,
                gameKey: gameDocKey,
                commId: canonicalCommId,
                npCommunicationId: canonicalCommId,
                name: skelTrophy?.name || "Trophy Objective",
                title: skelTrophy?.name || "Trophy Objective",
                detail: skelTrophy?.detail || "Objective detail",
                description: skelTrophy?.detail || "Objective detail",
                icon: skelTrophy?.icon || null,
                type: tRank,
                rank: tRank.toUpperCase(),
                rarity: `${resolvedEarnedRate}%`,
                earnedRate: resolvedEarnedRate,
                difficultyTier: getDifficultyTier(resolvedEarnedRate),
                hidden: !!skelTrophy?.hidden,
                earned: !!s.earned,
                earnedDate: s.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) : null,
                earnedAge: s.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                currentValue: currentProgress,
                targetValue: targetVal,
                trophyProgress: currentProgress,
                trophyProgressTargetValue: targetVal,
                progressRate: progressRate,
                subProgressRatio: progressRatio,
                progressedDateTime: s.progressedDateTime || null,
                trophyRare: liveRareEnum,
                rarityTier: trophyRarityLabel(liveRareEnum),
                rewardName: skelTrophy?.rewardName || null,
                rewardImage: skelTrophy?.rewardImage || null,
                groupId: skelTrophy?.groupId || s.trophyGroupId || "default"
            };

            if (s.earned) {
                earnedTrophiesList.push({
                    trophyId: s.trophyId,
                    gameTitle: titleName,
                    gameKey: gameDocKey,
                    commId: canonicalCommId,
                    npCommunicationId: canonicalCommId,
                    name: skelTrophy?.name || "Unlocked Trophy",
                    icon: skelTrophy?.icon || null,
                    type: tRank,
                    rank: tRank.toUpperCase(),
                    rarity: standaloneProgressMap[s.trophyId].rarity,
                    earnedRate: standaloneProgressMap[s.trophyId].earnedRate,
                    difficultyTier: standaloneProgressMap[s.trophyId].difficultyTier,
                    timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                    earnedDate: standaloneProgressMap[s.trophyId].earnedDate,
                    earnedAge: standaloneProgressMap[s.trophyId].earnedAge
                });
            }
        });

        earnedTrophiesList.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < earnedTrophiesList.length; i++) {
            if (i === 0) {
                earnedTrophiesList[i].intervalBetweenPreviousTrophy = "First Trophy";
            } else {
                const diffSec = Math.floor((earnedTrophiesList[i].timestamp - earnedTrophiesList[i - 1].timestamp) / 1000);
                earnedTrophiesList[i].intervalBetweenPreviousTrophy = formatDuration(diffSec);
            }
            if (standaloneProgressMap[earnedTrophiesList[i].trophyId]) {
                standaloneProgressMap[earnedTrophiesList[i].trophyId].intervalBetweenPreviousTrophy = earnedTrophiesList[i].intervalBetweenPreviousTrophy;
            }
        }

        return {
            standaloneProgressMap,
            earnedTrophiesList,
            groupEarnings: groupEarningsRes?.trophyGroups || []
        };
    } catch (e) {
        return {
            standaloneProgressMap: existingGameProgress || {},
            earnedTrophiesList: [],
            groupEarnings: []
        };
    }
}

async function evaluateUserActivityDelta(agentAuth, targetId, knownKey, knownGamerTag, existingData) {
    if (!existingData) {
        return { hasDelta: true, reason: "INITIAL_CREATION", liveOnline: true, liveGameStatus: null };
    }

    const isSelf = (agentAuth?.userKey === "wildhorse_spirit" && targetId === ACCOUNT_IDS.wildhorse_spirit) ||
                   (agentAuth?.userKey === "ray" && targetId === ACCOUNT_IDS.ray) ||
                   (!!agentAuth?.userKey && agentAuth.userKey === knownKey);
    const targetScope = isSelf ? "me" : targetId;

    let liveOnline = false;
    let liveGameTitle = "Dashboard";
    let liveGameStatus = null;

    if (agentAuth) {
        try {
            const pRaw = await getBasicPresence(agentAuth, targetScope);
            const basic = normalizeBasicPresence(pRaw);
            const status = basic?.primaryPlatformInfo?.onlineStatus || basic?.onlineStatus || "offline";
            liveOnline = (status !== "offline");

            const activeGameInfo = basic?.gameTitleInfoList?.[0] || basic?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            liveGameTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || "Dashboard";
            liveGameStatus = liveOnline ? extractGameStatus(basic) : null;
        } catch (e) {}
    }

    const storedOnline = !!existingData.online;
    const hasActiveSession = Object.values(existingData?.playSessions || {}).some(s => s.isActive);

    if (hasActiveSession && !liveOnline) {
        return { hasDelta: true, reason: "SESSION_LOGOUT_FINALIZATION", liveOnline: false, liveGameStatus: null };
    }

    const needsStatusBackfill = existingData.gameStatus === undefined;

    if (!liveOnline && !storedOnline) {
        if (needsStatusBackfill) {
            return { hasDelta: true, statusOnly: true, reason: "GAME_STATUS_FIELD_BACKFILL", liveOnline: false, liveGameStatus: null };
        }
        return { hasDelta: false, reason: "OFFLINE_SKIPPED", liveOnline: false, liveGameStatus: null };
    }

    if (liveOnline !== storedOnline) {
        return { hasDelta: true, reason: `STATUS_CHANGE`, liveOnline, liveGameStatus };
    }

    if (liveOnline) {
        const storedGame = (existingData.currentGame || "Dashboard").toLowerCase().trim();
        const detectedGame = liveGameTitle.toLowerCase().trim();
        if (storedGame !== detectedGame) {
            return { hasDelta: true, reason: `GAME_SWITCH`, liveOnline, liveGameStatus };
        }
    }

    return { hasDelta: false, reason: "UNCHANGED", liveOnline, liveGameStatus };
}

async function applyStatusOnlyUpdate(onlineId, existingData, liveGameStatus) {
    const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
    await syncNodeToDestRtdb(`gamertags/${onlineId}/gameStatus`, liveGameStatus || "");
    await syncNodeToDestRtdb(`gamertags/${onlineId}/gameStatusUpdated`, stamp);
    return { ...existingData, gameStatus: liveGameStatus || "", gameStatusUpdated: stamp };
}

async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames, cloudDlcCatalog = {}) {
    let resolvedTargetId = String(targetId || ACCOUNT_IDS[userKey]);
    if (!auth || !resolvedTargetId) return existingData || null;

    try {
        const rawArchive = {};
        const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(auth, resolvedTargetId), null);
        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;

        const isSelf = (auth.userKey === "wildhorse_spirit" && resolvedTargetId === ACCOUNT_IDS.wildhorse_spirit) ||
                       (auth.userKey === "ray" && resolvedTargetId === ACCOUNT_IDS.ray) ||
                       (!!auth.userKey && auth.userKey === userKey) ||
                       (resolvedTargetId === "me");

        let presenceTarget = isSelf ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: "offline", platform: null }, gameTitleInfoList: [] };

        try {
            const raw = await getBasicPresence(auth, presenceTarget);
            rawP = normalizeBasicPresence(raw) || rawP;
        } catch (e) {
            if (presenceTarget !== "me") {
                try {
                    const retryRaw = await getBasicPresence(auth, "me");
                    rawP = normalizeBasicPresence(retryRaw) || rawP;
                } catch (err2) {}
            }
        }

        const isPlayerOnline = (rawP?.primaryPlatformInfo?.onlineStatus || rawP?.onlineStatus || "offline") !== "offline";

        if (!isPlayerOnline && existingData) {
            const hasActive = Object.values(existingData?.playSessions || {}).some(s => s.isActive);
            if (hasActive) {
                const { playSessions } = updateGameSessionTracking(existingData, null, "Dashboard", false, null);
                const closedRecord = {
                    ...existingData,
                    online: false,
                    currentGame: "Dashboard",
                    currentGameId: null,
                    gameStatus: "",
                    sessionStartedAt: "",
                    sessionStartedAtMs: 0,
                    currentSessionSeconds: 0,
                    playSessions: playSessions,
                    lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
                };
                await writeGamertagDelta(canonicalOnlineId, existingData, closedRecord);
                return closedRecord;
            }
        }

        const heavyAgeMs = Date.now() - (Number(existingData?.heavyPulledAtMs) || 0);
        const doHeavy = !existingData || !existingData.heavyPulledAtMs || heavyAgeMs >= PULL_CONFIG.HEAVY_REFRESH_MS;

        let region = existingData ? { country: existingData.region || "US", language: existingData.language || "en" } : { country: "US", language: "en" };
        let devices = existingData?.devices || [];
        let shareableProfile = existingData?.shareableProfile || null;
        let friendsList = (existingData?.friendsList || []).map(String);
        let blockedUsers = existingData?.blockedUsers || [];
        let friendRequests = existingData?.friendRequests || [];
        let sentFriendRequests = existingData?.sentFriendRequests || [];
        let purchasedGames = existingData?.purchasedGames || [];

        if (doHeavy && isSelf) {
            const regionRes = await callPsn("getUserRegion", () => getUserRegion(auth, "me"), null);
            if (regionRes) region = regionRes;
            const devRes = await callPsn("getAccountDevices", () => getAccountDevices(auth), null);
            if (devRes) devices = devRes?.devices || (Array.isArray(devRes) ? devRes : []);
            const shareRes = await callPsn("getProfileShareableLink", () => getProfileShareableLink(auth, resolvedTargetId), null);
            if (shareRes) shareableProfile = shareRes;
            const blockedRes = await callPsn("getUserBlockedAccountIds", () => getUserBlockedAccountIds(auth), null);
            if (blockedRes) blockedUsers = blockedRes?.blockedUsers || [];
            const reqRes = await callPsn("getUserFriendsRequests", () => getUserFriendsRequests(auth), null);
            if (reqRes) {
                friendRequests = reqRes?.receivedRequests || [];
                sentFriendRequests = reqRes?.sentRequests || [];
            }
        }

        if (doHeavy) {
            const friendsPull = await paginateCollect(
                "getUserFriendsAccountIds",
                (offset, size) => getUserFriendsAccountIds(auth, resolvedTargetId, { limit: size, offset }),
                (res) => res?.friends || [],
                PULL_CONFIG.PAGE_SIZE_FRIENDS
            );
            if (friendsPull.pagesRaw.length) friendsList = Array.from(new Set(friendsPull.items.map(String)));
        }

        const titlesPull = await paginateCollect(
            "getUserTitles",
            (offset, size) => getUserTitles(auth, resolvedTargetId, { limit: size, offset }),
            (res) => res?.trophyTitles || [],
            PULL_CONFIG.PAGE_SIZE_TITLES
        );
        const sortedTitles = titlesPull.items;
        const totalGamesPlayedCount = titlesPull.pagesRaw[titlesPull.pagesRaw.length - 1]?.totalItemCount || sortedTitles.length;
        sortedTitles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const playedPull = await paginateCollect(
            "getUserPlayedGames",
            (offset, size) => getUserPlayedGames(auth, resolvedTargetId, { limit: size, offset }),
            (res) => pickList(res, ["titles", "data.gameLibraryTitlesRetrieve.games"]),
            PULL_CONFIG.PAGE_SIZE_PLAYED
        );
        let telemetryData = [...playedPull.items];

        await resolveFriendDirectory(auth, friendsList);

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

        telemetryData.forEach(g => {
            const commId = g.npCommunicationId;
            const titleId = g.titleId || g.npTitleId;
            if (!commId && !titleId) return;

            const parsedSeconds = parseIsoDuration(g.playDuration);
            const gameArt = resolveGamePosterArt([g.image?.url, g.imageUrl, g.conceptIconUrl, g.boxart, g.trophyTitleIconUrl]);

            const gameRecord = {
                ...g,
                npCommunicationId: commId || null,
                npTitleId: titleId || null,
                titleId: titleId || null,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: gameArt,
                posterArt: gameArt,
                conceptId: g.conceptId || g.concept?.id || extractConceptIdFromText(g.conceptIconUrl) || null,
                playCount: g.playCount || 1,
                playDuration: g.playDuration || null,
                nativePlaytimeSeconds: parsedSeconds,
                nativePlaytimeFormatted: formatDuration(parsedSeconds),
                nativePlaytimeHours: Math.round((parsedSeconds / 3600) * 10) / 10,
                nativePlaytimeWholeHours: Math.floor(parsedSeconds / 3600),
                nativePlaytimeAppStyle: `${Math.floor(parsedSeconds / 3600)}h`,
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            };

            if (commId) mergedGamesMap.set(commId, gameRecord);
            if (titleId) mergedGamesMap.set(titleId, gameRecord);
        });

        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            const titleId = t.npTitleId;
            if (!commId && !titleId) return;

            let existing = (commId && mergedGamesMap.get(commId)) || (titleId && mergedGamesMap.get(titleId)) || null;
            if (!existing) {
                existing = {
                    npCommunicationId: commId || null,
                    npTitleId: titleId || null,
                    name: t.trophyTitleName || t.name || "Unknown Game",
                    platform: normalizePlatform(t),
                    art: null,
                    posterArt: null,
                    playCount: t.playCount || 1,
                    lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
                };
            }

            const fallbackArt = resolveGamePosterArt([existing.art, t.trophyTitleIconUrl, t.conceptIconUrl, t.imageUrl]);
            Object.assign(existing, t);
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = fallbackArt;
            existing.posterArt = fallbackArt;
            existing.trophyTitleIconUrl = fallbackArt;
            existing.platform = normalizePlatform(t);
            existing.progress = t.progress || 0;
            existing.definedTrophies = t.definedTrophies || {};
            existing.earnedTotal = (t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0);
            existing.definedTotal = (t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0);
            existing.completionRatio = existing.definedTotal > 0 ? `${Math.round((existing.earnedTotal / existing.definedTotal) * 100)}%` : "0%";

            if (commId) mergedGamesMap.set(commId, existing);
            if (titleId) mergedGamesMap.set(titleId, existing);
        });

        const allRecentGames = Array.from(new Set(mergedGamesMap.values())).sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || rawP?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
        const liveGameStatus = isPlayerOnline ? extractGameStatus(rawP) : null;

        let activeCommId = activeGameInfo.npCommunicationId || null;
        let activeTitleId = activeGameInfo.npTitleId || activeGameInfo.titleId || null;
        let resolvedTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || null;

        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) resolvedTitle = mergedGamesMap.get(activeCommId).name;
        if (!resolvedTitle && activeTitleId && mergedGamesMap.has(activeTitleId)) resolvedTitle = mergedGamesMap.get(activeTitleId).name;
        if (!resolvedTitle) resolvedTitle = isPlayerOnline ? "Dashboard" : (existingData?.currentGame || "Dashboard");

        let canonicalActiveCommId = null;
        if (activeCommId && String(activeCommId).startsWith("NPWR")) canonicalActiveCommId = activeCommId;

        const persistentRootCommId = (canonicalActiveCommId && canonicalActiveCommId !== "Dashboard")
            ? canonicalActiveCommId
            : (allRecentGames[0]?.npCommunicationId || existingData?.commId || "NPWR_ACTIVE");

        const isDashboard = !resolvedTitle || resolvedTitle.toUpperCase() === "DASHBOARD";

        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } = updateGameSessionTracking(
            existingData,
            persistentRootCommId,
            resolvedTitle,
            isPlayerOnline,
            activeTitleId
        );

        // Firestore skeleton ingestion
        for (const g of allRecentGames.slice(0, PULL_CONFIG.SKELETON_REFRESH_RECENT_TITLES)) {
            const syncId = g.npCommunicationId;
            if (syncId && String(syncId).startsWith("NPWR")) {
                await ensureGameSkeleton(
                    auth,
                    syncId,
                    g.name,
                    normalizePlatform(g),
                    g.art,
                    g.trophyTitleIconUrl,
                    g.definedTrophies,
                    globalGames,
                    purchasedGames,
                    cloudDlcCatalog,
                    g.titleId || g.npTitleId,
                    g.conceptId
                );
            }
        }

        const matchedGame = (persistentRootCommId && mergedGamesMap.get(persistentRootCommId)) || (resolvedTitle !== "Dashboard" ? allRecentGames[0] : null) || {};
        const hwContext = parseDetailedHardwareContext(rawP, matchedGame);

        const safeFinalPoster = resolveGamePosterArt([
            matchedGame.art,
            matchedGame.posterArt,
            matchedGame.trophyTitleIconUrl,
            allRecentGames[0]?.art,
            existingData?.art,
            existingData?.posterArt
        ]);

        const sonySeconds = matchedGame.nativePlaytimeSeconds || 0;
        const useSony = PULL_CONFIG.PREFER_SONY_PLAYTIME && sonySeconds > 0;
        const safePlaytimeFormatted = useSony ? (matchedGame.nativePlaytimeFormatted || formatDuration(sonySeconds)) : currentGameDurationFormatted;
        const safeNumericHours = useSony ? (matchedGame.nativePlaytimeHours || Math.round((sonySeconds / 3600) * 10) / 10) : (Math.round((activeSessionSeconds / 3600) * 10) / 10);
        const playedHoursWhole = useSony ? Math.floor(sonySeconds / 3600) : Math.floor(Number(safeNumericHours) || 0);

        const activeSession = (!isDashboard && playSessions[persistentRootCommId]?.isActive) ? playSessions[persistentRootCommId] : null;
        const sessionStartMs = activeSession?.sessionStartTime || 0;
        const currentSessionSeconds = sessionStartMs ? Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000)) : 0;
        const sessionStartedAt = sessionStartMs ? new Date(sessionStartMs).toISOString() : "";

        const stats = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(auth, resolvedTargetId), {});
        let activeHunt = existingData?.activeHunt || null;

        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
        const trophyTitleSync = { ...(existingData?.trophyTitleSync || {}) };
        const cumulativeUnlockedTrophies = [];

        if (persistentRootCommId && persistentRootCommId !== "Dashboard") {
            const gMeta = mergedGamesMap.get(persistentRootCommId) || {};
            const gName = gMeta.name || resolvedTitle || "PlayStation Title";
            const gKey = toGameKey(gName);

            const subtree = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, persistentRootCommId, gName, normalizePlatform(gMeta), globalGames, liveTrophyProgress[gKey]);
            if (subtree && subtree.standaloneProgressMap) {
                // Keyed by readable game title in snake_case
                liveTrophyProgress[gKey] = subtree.standaloneProgressMap;
                trophyTitleSync[gKey] = gMeta.lastUpdatedDateTime || null;

                if (subtree.earnedTrophiesList) cumulativeUnlockedTrophies.push(...subtree.earnedTrophiesList);

                activeHunt = {
                    npCommunicationId: persistentRootCommId,
                    commId: persistentRootCommId,
                    gameKey: gKey,
                    title: gName,
                    gameStatus: liveGameStatus || "",
                    platform: hwContext.activeHardware,
                    gameBuildVersion: hwContext.gameBuildVersion,
                    isStreamingRemotePlay: hwContext.isStreamingRemotePlay,
                    art: safeFinalPoster,
                    posterArt: safeFinalPoster,
                    image: safeFinalPoster,
                    hoursPlayed: safePlaytimeFormatted,
                    numericHours: safeNumericHours,
                    playedHoursApp: `${playedHoursWhole}h`,
                    playtimeSource: useSony ? "sony" : "tracker",
                    amazonAffiliateUrl: generateAffiliateUrl(gName),
                    progress: matchedGame.progress || 0,
                    velocity: {
                        completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`,
                        ratio: matchedGame.completionRatio || "0%"
                    },
                    groupEarnings: subtree.groupEarnings
                };
            }
        }

        const unifiedMostRecentTrophies = cumulativeUnlockedTrophies
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, PULL_CONFIG.MOST_RECENT_TROPHIES_KEPT);

        await archiveRawToFirestore(canonicalOnlineId, "presence", rawP);
        await archiveRawToFirestore(canonicalOnlineId, "profile", profile);

        return {
            onlineId: canonicalOnlineId,
            accountId: resolvedTargetId,
            commId: persistentRootCommId,
            conceptId: matchedGame.conceptId || null,
            art: safeFinalPoster,
            posterArt: safeFinalPoster,
            image: safeFinalPoster,
            currentGameArt: safeFinalPoster,
            npssoValid: true,
            npssoStatus: "ACTIVE",
            handshakeText: `${canonicalOnlineId.toUpperCase()} HANDSHAKE: LIVE`,
            handshakeState: "LIVE",
            avatar: profile?.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || existingData?.avatar || "",
            allAvatars: profile?.avatars || existingData?.allAvatars || [],
            bio: profile?.aboutMe || existingData?.bio || "Official Pack Member Profile",
            plus: !!profile?.isPlus,
            region: isSelf ? (region?.country || "US") : "US",
            language: isSelf ? (region?.language || "en") : "en",
            rawProfile: profile || {},
            devices: devices,
            shareableProfile: shareableProfile,
            friendsList: friendsList,
            friendsProfiles: friendsList.map(id => friendsDirectoryCache[String(id)] || { accountId: String(id) }),
            blockedUsers: blockedUsers,
            friendRequests: friendRequests,
            sentFriendRequests: sentFriendRequests,
            purchasedGames: purchasedGames,
            online: isPlayerOnline,
            currentGame: resolvedTitle,
            gameStatus: liveGameStatus || "",
            gameStatusUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
            currentGameHours: safePlaytimeFormatted,
            currentGameNumericHours: safeNumericHours,
            playedHoursApp: `${playedHoursWhole}h`,
            playedHoursWhole: playedHoursWhole,
            playtimeSource: useSony ? "sony" : "tracker",
            sonyPlayDuration: matchedGame.playDuration || "",
            sessionStartedAt: sessionStartedAt,
            sessionStartedAtMs: sessionStartMs,
            currentSessionSeconds: currentSessionSeconds,
            platform: hwContext.activeHardware,
            gameBuildVersion: hwContext.gameBuildVersion,
            isStreamingRemotePlay: hwContext.isStreamingRemotePlay,
            displayPlatform: hwContext.displayPlatformLabel,
            rawPresence: rawP,
            gamesPlayed: totalGamesPlayedCount || existingData?.gamesPlayed || 0,
            psnAccountAge: calculateAgeString(earliestEntry),
            earliestTrophyDate: earliestEntry,
            latestTrophyDate: unifiedMostRecentTrophies[0]?.timestamp || existingData?.latestTrophyDate || new Date().getTime(),
            level: stats?.trophyLevel || existingData?.level || 0,
            playSessions: playSessions,
            liveTrophyProgress: liveTrophyProgress,
            trophyTitleSync: trophyTitleSync,
            heavyPulledAtMs: doHeavy ? Date.now() : (existingData?.heavyPulledAtMs || 0),
            trophySummary: {
                ...stats,
                platinum: stats?.earnedTrophies?.platinum ?? 0,
                gold: stats?.earnedTrophies?.gold ?? 0,
                silver: stats?.earnedTrophies?.silver ?? 0,
                bronze: stats?.earnedTrophies?.bronze ?? 0,
                total: ((stats?.earnedTrophies?.platinum || 0) + (stats?.earnedTrophies?.gold || 0) + (stats?.earnedTrophies?.silver || 0) + (stats?.earnedTrophies?.bronze || 0)) || 0,
                trophyLevel: stats?.trophyLevel || 0
            },
            recentGames: allRecentGames,
            activeHunt: activeHunt,
            mostRecentTrophies: unifiedMostRecentTrophies,
            storeListing: globalGames[toGameKey(resolvedTitle)]?.storeListing || null,
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) {
        console.error(`[TELEMETRY ERROR] For ${targetId}: ${e.message}`);
        return existingData || null;
    }
}

function buildSquadIntelligence(allGamertagsData) {
    const players = Object.values(allGamertagsData || {});
    if (players.length === 0) return { leaderboard: [], squadTotals: {}, socialOverlap: {} };

    const leaderboard = players.map(p => ({
        onlineId: p.onlineId || "Unknown Player",
        accountId: p.accountId || null,
        level: p.level || 0,
        platinum: p.trophySummary?.platinum || 0,
        gold: p.trophySummary?.gold || 0,
        silver: p.trophySummary?.silver || 0,
        bronze: p.trophySummary?.bronze || 0,
        totalTrophies: p.trophySummary?.total || 0,
        gamesPlayed: p.gamesPlayed || 0,
        isOnline: !!p.online,
        currentGame: p.currentGame || "Dashboard",
        gameStatus: p.gameStatus || "",
        commId: p.commId || null,
        art: p.art || null,
        platform: p.platform || "PS5"
    })).sort((a, b) => (b.level - a.level) || (b.platinum - a.platinum) || (b.totalTrophies - a.totalTrophies));

    const squadTotals = leaderboard.reduce((acc, curr) => {
        acc.totalPlatinums += curr.platinum;
        acc.totalGold += curr.gold;
        acc.totalSilver += curr.silver;
        acc.totalBronze += curr.bronze;
        acc.cumulativeTrophies += curr.totalTrophies;
        acc.totalGamesEncountered += curr.gamesPlayed;
        return acc;
    }, { totalPlatinums: 0, totalGold: 0, totalSilver: 0, totalBronze: 0, cumulativeTrophies: 0, totalGamesEncountered: 0 });

    const socialOverlap = {};
    players.forEach(p => {
        const myFriends = new Set(p.friendsList || []);
        const playerKey = p.onlineId || p.accountId;
        socialOverlap[playerKey] = {};
        players.forEach(other => {
            if (p.accountId !== other.accountId) {
                const otherFriends = other.friendsList || [];
                const mutuals = otherFriends.filter(fId => myFriends.has(fId));
                socialOverlap[playerKey][other.onlineId || other.accountId] = {
                    mutualCount: mutuals.length,
                    sharedFriendAccountIds: mutuals
                };
            }
        });
    });

    return { leaderboard, squadTotals, socialOverlap };
}

async function executeSyncPass() {
    try {
        console.log(`[INIT] Running PSN Engine v${ENGINE_VERSION} at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })} EDT...`);

        initializeAdminSdk();
        await loadPersistentTokens();
        diagnosticReport.exportAudit = auditPsnApiExports();

        const authHeader = await getFirebaseBearerHeader();

        // 1. Ingest credentials from source project: entertainment-71888
        const siteUsersRaw = await resilientFetch(`${SOURCE_RTDB_URL}/users.json`, { headers: { ...authHeader } }).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(`${SOURCE_RTDB_URL}/user_secrets.json`, { headers: { ...authHeader } }).then(r => r.json()).catch(() => ({}));
        const cloudDlcCatalog = await resilientFetch(`${SOURCE_RTDB_URL}/woth2_cloud/data/dlcs.json`, { headers: { ...authHeader } }).then(r => r.json()).catch(() => ({}));

        // 2. Fetch destination presence & Firestore games
        const previousFirebaseData = await fetchFromDestRtdb();
        const globalGames = await loadGamesFromFirestore();

        const credentialList = [];
        if (siteUsersRaw && typeof siteUsersRaw === "object" && !siteUsersRaw.error) {
            for (const [emailKey, u] of Object.entries(siteUsersRaw)) {
                credentialList.push(readUserPsnCredentials(emailKey, u, userSecretsRaw?.[emailKey]));
            }
        }

        const coreNpssos = {
            wildhorse_spirit: normalizeNpsso(process.env.PSN_NPSSO_WEREWOLF || ""),
            ray: normalizeNpsso(process.env.PSN_NPSSO_RAY || ""),
            darkwing: normalizeNpsso(process.env.PSN_NPSSO_DARKWING || ""),
            marc: normalizeNpsso(process.env.PSN_NPSSO_MARC || "")
        };
        for (const cred of credentialList) {
            if (!cred.npsso) continue;
            const t = cred.tag.toLowerCase();
            for (const member of CORE_PACK) {
                if (cred.accountId === member.id || t === member.tag.toLowerCase()) coreNpssos[member.key] = cred.npsso;
            }
            if (t.includes("werewolf")) coreNpssos.wildhorse_spirit = cred.npsso;
        }

        const sessionState = await resolveMasterSession(coreNpssos);
        const { masterAuth, failoverState, auths: coreAuths } = sessionState;

        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = sessionState.bufferStatus;

        let finalGamertags = { ...(previousFirebaseData?.gamertags || {}) };
        let finalUsersByGamerTag = { ...(previousFirebaseData?.usersByGamerTag || {}) };
        const activeCanonicalGamertags = new Set();

        if (masterAuth && masterAuth.accessToken) {
            console.log(`[CORE PACK] Ingesting Core 4 squad members using session: ${masterAuth.userKey}...`);
            for (const member of CORE_PACK) {
                const existingData = findExistingGamertagRecord(finalGamertags, member.tag, member.id);
                const memberAuth = (coreAuths[member.key] && coreAuths[member.key].accessToken) ? coreAuths[member.key] : masterAuth;
                const deltaCheck = await evaluateUserActivityDelta(memberAuth, member.id, member.key, member.tag, existingData);

                if (!deltaCheck.hasDelta && existingData) {
                    activeCanonicalGamertags.add(member.tag);
                    if (existingData.onlineId) activeCanonicalGamertags.add(existingData.onlineId);
                    continue;
                }

                if (deltaCheck.statusOnly && existingData) {
                    const slim = await applyStatusOnlyUpdate(existingData.onlineId || member.tag, existingData, deltaCheck.liveGameStatus);
                    finalGamertags[slim.onlineId || member.tag] = slim;
                    activeCanonicalGamertags.add(slim.onlineId || member.tag);
                    continue;
                }

                const data = await getFullUserData(memberAuth, member.tag, member.key, member.id, existingData, true, globalGames, cloudDlcCatalog);
                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    finalGamertags[data.onlineId] = data;
                    finalUsersByGamerTag[data.onlineId] = String(data.accountId);
                    await writeGamertagDelta(data.onlineId, existingData, data);
                }
            }
        }

        // 3. Guest & Outside Users Ingestion
        for (const cred of credentialList) {
            const { emailKey, accountId, npsso: rawNpsso } = cred;
            const userRecord = siteUsersRaw?.[emailKey];
            let tag = cred.tag || "";

            const isCore = CORE_PACK.some(m => (tag && m.tag.toLowerCase() === tag.toLowerCase()) || (accountId && m.id === accountId));
            if (isCore || (!accountId && !rawNpsso)) continue;

            const existingData = findExistingGamertagRecord(finalGamertags, tag, accountId);

            // Path A: Guest provides their own NPSSO -> Full Ingestion
            if (rawNpsso) {
                const userAuth = await getAuthenticated(emailKey, rawNpsso);
                if (userAuth && userAuth.accessToken) {
                    const data = await getFullUserData(userAuth, tag, emailKey, accountId || "me", existingData, true, globalGames, cloudDlcCatalog);
                    if (data && data.onlineId) {
                        activeCanonicalGamertags.add(data.onlineId);
                        finalGamertags[data.onlineId] = data;
                        finalUsersByGamerTag[data.onlineId] = String(data.accountId);
                        await writeGamertagDelta(data.onlineId, existingData, data);
                        await writeUserPsnStatus(emailKey, { psn_sync_status: "SYNCED_FULL" }, userRecord);
                    }
                    continue;
                }
            }

            // Path B: Guest without NPSSO -> Lite Pull using masterAuth
            if (masterAuth && masterAuth.accessToken && accountId) {
                console.log(`[LITE SYNC] Performing lite pull for guest account: ${tag || accountId}`);
                const data = await getFullUserData(masterAuth, tag, emailKey, accountId, existingData, false, globalGames, cloudDlcCatalog);
                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    finalGamertags[data.onlineId] = data;
                    finalUsersByGamerTag[data.onlineId] = String(data.accountId);
                    await writeGamertagDelta(data.onlineId, existingData, data);
                    await writeUserPsnStatus(emailKey, { psn_sync_status: "SYNCED_LITE" }, userRecord);
                }
            }
        }

        // Clean stale RTDB entries
        const existingRemoteKeys = Object.keys(previousFirebaseData?.gamertags || {});
        for (const oldKey of existingRemoteKeys) {
            if (!activeCanonicalGamertags.has(oldKey)) {
                await deleteNodeFromDestRtdb(`gamertags/${oldKey}`);
            }
        }

        // Sync usersByGamerTag to RTDB
        await syncNodeToDestRtdb("usersByGamerTag", normalizeForRtdb(finalUsersByGamerTag) ?? {});

        // 4. Heavy Intelligence to Firestore
        const squadIntel = buildSquadIntelligence(finalGamertags);
        if (firestoreDb) {
            await firestoreDb.collection("squadLeaderboard").doc("current").set({
                leaderboard: squadIntel.leaderboard,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await firestoreDb.collection("squadAnalytics").doc("current").set({
                totals: squadIntel.squadTotals,
                socialOverlap: squadIntel.socialOverlap,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await firestoreDb.collection("friendsDirectory").doc("directory").set({
                cache: friendsDirectoryCache,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await firestoreDb.collection("meta").doc("engine").set({
                engineVersion: ENGINE_VERSION,
                lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
                analyticsTag: GA4_MEASUREMENT_ID,
                diagnostics: diagnosticReport,
                apiStats: apiStats
            });
            console.log("[FIRESTORE] Synchronized heavy leaderboard, analytics, directory, and meta.");
        }

        console.log(`[SUCCESS] PSN Engine v${ENGINE_VERSION} finished successfully.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

(async () => {
    await executeSyncPass();
    process.exit(0);
})();
