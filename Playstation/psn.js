/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Version: 67.2.0
 * Description: Master Dual-Firebase PSN Telemetry & Ingestion Engine
 *   - Source (Kevin's DB): entertainment-71888 (Read-Only)
 *       * Dynamically reads all user accounts, psn_account_id, and psn_npsso
 *         from /users and /user_secrets using FIREBASE_AUTH_SECRET.
 *   - Destination (Ray's DB): playstation-stats (Write-Only)
 *       * RTDB: Stores strictly /psn/gamertags/{onlineId} (using exact 51 keys)
 *         and /psn/usersByGamerTag via FIREBASE_SERVICE_RAY.
 *       * Firestore: Stores games/{Game_Title_Slug}, squadLeaderboard,
 *         squadAnalytics, friendsDirectory, meta, and raw_telemetry.
 *   - Multi-Tier Failover:
 *       * If any 1 of the Core 4 has an active NPSSO -> Squad Master Token (Heavy pull for Core 4).
 *       * Guest with NPSSO -> Personal Heavy Pull.
 *       * Guest without NPSSO -> Lite Pull (presence, hours, avatar, trophy summary).
 *       * Reverse Fallback: If all 4 Core cookies expire, any active guest NPSSO
 *         is elected Master Token to keep the Core 4 updated via public Lite Pull.
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

// Two distinct Firebase instances
const SOURCE_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const DEST_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const ENGINE_VERSION = "67.2.0";
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
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: ACCOUNT_IDS.wildhorse_spirit, emailMatch: "raykevin71888" },
    { key: "ray", tag: "OneLIVIDMAN", id: ACCOUNT_IDS.ray, emailMatch: "cartnalray9" },
    { key: "darkwing", tag: "Darkwing69420", id: ACCOUNT_IDS.darkwing, emailMatch: "darkwing" },
    { key: "marc", tag: "DesdemonaTiger", id: ACCOUNT_IDS.marc, emailMatch: "desdemona" }
];

const AMAZON_TAG = "moviesanywhere02-20";

// Strictly the 51 allowed keys for RTDB user profiles
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
    "trophyTitleSync",
    "playSessions" // Retained internally to calculate session hours between sync passes
]);

let tokenStore = {};
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
let cachedDestBearerToken = null;
let destTokenExpiryTimestamp = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================================
 * Helper: Game Name Key Formatter (snake_case)
 * Formats "Far Cry 5" -> "Far_Cry_5" for Firestore & RTDB progress nodes
 * ============================================================================ */
function toGameKey(name = "") {
    let clean = String(name || "")
        .replace(/®|™|©/g, "")
        .replace(/[:\/\\#$\[\].\-+]/g, " ")
        .trim()
        .replace(/\s+/g, "_");
    return clean || "Unknown_Game";
}

/* ============================================================================
 * Section: Firebase Admin (Ray's Destination Project)
 * Uses FIREBASE_SERVICE_RAY secret to authenticate writes to playstation-stats
 * ============================================================================ */
function initializeAdminSdk() {
    if (admin.apps.length > 0) {
        adminApp = admin.apps[0];
        firestoreDb = admin.firestore();
        return { adminApp, firestoreDb };
    }

    const rawServiceKey = process.env.FIREBASE_SERVICE_RAY || "";
    if (!rawServiceKey.trim()) {
        console.warn("[ADMIN SDK] ⚠️ FIREBASE_SERVICE_RAY is missing. Destination writes will fail.");
        return { adminApp: null, firestoreDb: null };
    }

    try {
        let creds;
        const trimmed = rawServiceKey.trim();
        if (trimmed.startsWith("{")) {
            creds = JSON.parse(trimmed);
        } else {
            const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
            creds = JSON.parse(decoded);
        }

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(creds),
            databaseURL: DEST_RTDB_URL
        });
        firestoreDb = admin.firestore();
        console.log(`[ADMIN SDK] Successfully initialized Ray's Firebase destination: ${creds.project_id || "playstation-stats"}`);
        return { adminApp, firestoreDb };
    } catch (err) {
        console.error(`[ADMIN SDK ERROR] Failed to parse FIREBASE_SERVICE_RAY: ${err.message}`);
        return { adminApp: null, firestoreDb: null };
    }
}

async function getDestBearerHeader() {
    const now = Date.now();
    if (cachedDestBearerToken && now < destTokenExpiryTimestamp - 60000) {
        return { Authorization: `Bearer ${cachedDestBearerToken}` };
    }

    if (!adminApp) initializeAdminSdk();

    if (adminApp) {
        try {
            const tokenRes = await adminApp.options.credential.getAccessToken();
            cachedDestBearerToken = tokenRes.access_token;
            destTokenExpiryTimestamp = now + 45 * 60 * 1000;
            return { Authorization: `Bearer ${cachedDestBearerToken}` };
        } catch (err) {
            console.warn(`[ADMIN SDK] Could not generate OAuth token for destination: ${err.message}`);
        }
    }
    return {};
}

function getSourceAuthQuery() {
    const secret = process.env.FIREBASE_AUTH_SECRET;
    if (secret && !secret.trim().startsWith("{")) {
        return `?auth=${encodeURIComponent(secret.trim())}`;
    }
    return "";
}

/* ============================================================================
 * Section: HTTP Transport & REST Handlers
 * ============================================================================ */
async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    if (typeof fetch !== "undefined") {
        try {
            return await fetch(url, options);
        } catch (e) {}
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
        const authHeader = await getDestBearerHeader();
        const response = await resilientFetch(fullUrl, { headers: { ...authHeader } });
        if (!response || !response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.warn(`[DEST RTDB READ ERROR] /psn/${endpointPath}: ${err.message}`);
        return {};
    }
}

async function syncNodeToDestRtdb(endpointPath, payload) {
    const targetUrl = `${DEST_RTDB_URL}/psn/${endpointPath}.json`;
    try {
        const authHeader = await getDestBearerHeader();
        const res = await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify(payload)
        });
        if (res && !res.ok) {
            console.error(`[DEST RTDB WRITE ERROR] Failed /psn/${endpointPath}: HTTP ${res.status}`);
        }
    } catch (err) {
        console.error(`[DEST RTDB WRITE ERROR] Failed /psn/${endpointPath}: ${err.message}`);
    }
}

async function deleteNodeFromDestRtdb(endpointPath) {
    const targetUrl = `${DEST_RTDB_URL}/psn/${endpointPath}.json`;
    try {
        const authHeader = await getDestBearerHeader();
        await resilientFetch(targetUrl, { method: "DELETE", headers: { ...authHeader } });
        console.log(`[CLEANUP] Purged stale node from Ray's RTDB: /psn/${endpointPath}`);
    } catch (err) {
        console.warn(`[CLEANUP WARN] Failed to delete /psn/${endpointPath}: ${err.message}`);
    }
}

async function loadGamesFromFirestore() {
    const games = {};
    if (!firestoreDb) initializeAdminSdk();
    if (!firestoreDb) return games;

    try {
        const snapshot = await firestoreDb.collection("games").get();
        snapshot.forEach(doc => {
            games[doc.id] = doc.data();
        });
        console.log(`[FIRESTORE] Loaded ${Object.keys(games).length} existing game catalogs from Ray's Firestore.`);
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
    } catch (e) {}
}

/* ============================================================================
 * Section: PSN Authentication & Failover Manager
 * ============================================================================ */
function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
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

/* ============================================================================
 * Section: Input Credential Harvester (Reads Kevin's entertainment-71888)
 * ============================================================================ */
async function harvestCredentialsFromKevinDb() {
    const authQuery = getSourceAuthQuery();
    console.log(`[CREDENTIAL HARVEST] Connecting to Kevin's DB (${SOURCE_RTDB_URL})...`);

    const [usersRes, secretsRes, gamertagsRes] = await Promise.all([
        resilientFetch(`${SOURCE_RTDB_URL}/users.json${authQuery}`).then(r => r.json()).catch(() => ({})),
        resilientFetch(`${SOURCE_RTDB_URL}/user_secrets.json${authQuery}`).then(r => r.json()).catch(() => ({})),
        resilientFetch(`${SOURCE_RTDB_URL}/psn/gamertags.json${authQuery}`).then(r => r.json()).catch(() => ({}))
    ]);

    const users = (usersRes && !usersRes.error) ? usersRes : {};
    const secrets = (secretsRes && !secretsRes.error) ? secretsRes : {};
    const gamertags = (gamertagsRes && !gamertagsRes.error) ? gamertagsRes : {};

    const coreNpssos = { wildhorse_spirit: "", ray: "", darkwing: "", marc: "" };
    const coreAccountIds = { ...ACCOUNT_IDS };
    const registeredGuests = [];

    // Helper to extract credentials safely
    const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "");

    for (const [emailKey, u] of Object.entries(users)) {
        if (!u || typeof u !== "object") continue;
        const sec = secrets[emailKey] || {};
        const gaming = u.gaming_platforms || {};

        const rawId = pick(u.psn_account_id, sec.psn_account_id, gaming.psn_account_id);
        const rawTag = pick(u.psn_username, gaming.psn_username, u.psn_online_id);
        const rawCookie = normalizeNpsso(pick(sec.psn_npsso, u.psn_npsso, gaming.psn_npsso));

        const emailLower = emailKey.toLowerCase();
        const tagLower = String(rawTag || "").toLowerCase();
        const idStr = String(rawId || "").trim();

        let matchedCore = null;
        for (const member of CORE_PACK) {
            if (emailLower.includes(member.emailMatch) || tagLower === member.tag.toLowerCase() || idStr === member.id) {
                matchedCore = member.key;
                if (idStr) coreAccountIds[member.key] = idStr;
                if (rawCookie) coreNpssos[member.key] = rawCookie;
                break;
            }
        }

        if (!matchedCore && (idStr || rawCookie)) {
            registeredGuests.push({
                emailKey,
                accountId: idStr || null,
                tag: rawTag || "",
                npsso: rawCookie
            });
        }
    }

    // Secondary pass from legacy /psn/gamertags node if available
    for (const [gTag, gData] of Object.entries(gamertags)) {
        const lower = gTag.toLowerCase();
        const cookie = normalizeNpsso(gData.npsso || gData.psn_npsso);
        const id = String(gData.accountId || "").trim();

        if (lower.includes("darkwing") && cookie) coreNpssos.darkwing = cookie;
        if (lower.includes("desdemona") && cookie) coreNpssos.marc = cookie;
        if (lower.includes("darkwing") && id) coreAccountIds.darkwing = id;
        if (lower.includes("desdemona") && id) coreAccountIds.marc = id;
    }

    return { coreNpssos, coreAccountIds, registeredGuests, users, secrets };
}

/* ============================================================================
 * Section: Session Master Election & Fallback Logic
 * ============================================================================ */
async function resolveMasterSession(coreNpssos, registeredGuests) {
    console.log("[FAILOVER MANAGER] Checking squad cookie health across Werewolf, Ray, Darkwing, and Marc...");

    const auths = {};
    for (const member of CORE_PACK) {
        auths[member.key] = await getAuthenticated(member.key, coreNpssos[member.key] || "");
    }

    let activeMaster = null;
    let failoverState = "SNAPSHOT_FALLBACK";
    let bufferStatus = "READ-ONLY SNAPSHOT MODE";

    const stateLabels = {
        wildhorse_spirit: { state: "PRIMARY_WOLF", buffer: "PRIMARY HEALTHY (Werewolf Active)" },
        ray: { state: "FAILOVER_RAY", buffer: "RUNNING ON RAY'S COOKIE (Ray Active)" },
        darkwing: { state: "FAILOVER_DARKWING", buffer: "RUNNING ON DARKWING'S COOKIE (Darkwing Active)" },
        marc: { state: "FAILOVER_MARC", buffer: "RUNNING ON MARC'S COOKIE (Marc Active)" }
    };

    for (const member of CORE_PACK) {
        const a = auths[member.key];
        if (a && a.accessToken) {
            activeMaster = a;
            failoverState = stateLabels[member.key].state;
            bufferStatus = stateLabels[member.key].buffer;
            console.log(`[FAILOVER MANAGER] Master Squad Session Established via: ${member.tag}`);
            break;
        }
    }

    // Reverse Fallback: If all 4 Core Cookies expired, search registered guests for an active cookie!
    if (!activeMaster) {
        console.warn("[FAILOVER MANAGER] ⚠️ All 4 Core Squad cookies are offline. Checking registered guest cookies...");
        for (const guest of registeredGuests) {
            if (guest.npsso) {
                const guestAuth = await getAuthenticated(guest.emailKey, guest.npsso);
                if (guestAuth && guestAuth.accessToken) {
                    activeMaster = guestAuth;
                    failoverState = `GUEST_REVERSE_MASTER (${guest.tag || guest.emailKey})`;
                    bufferStatus = `RUNNING ON GUEST COOKIE: ${guest.tag || guest.emailKey}`;
                    console.log(`[FAILOVER MANAGER] Promoted guest ${guest.tag || guest.emailKey} to Squad Master Token.`);
                    break;
                }
            }
        }
    }

    return { masterAuth: activeMaster, auths, failoverState, bufferStatus };
}

/* ============================================================================
 * Section: Core Data Ingestion & Sanitization
 * ============================================================================ */
async function callPsn(label, fn, fallback = null) {
    if (typeof fn !== "function") return fallback;
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            apiStats.calls++;
            const res = await fn();
            return res === undefined ? fallback : res;
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                await sleep(5000 * (attempt + 1));
                continue;
            }
            apiStats.failures++;
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

function normalizePlatform(game) {
    const raw = (game?.trophyTitlePlatform || game?.platform || game?.category || (game?.npServiceName === "trophy2" ? "PS5" : "PS4") || "PS4").toUpperCase();
    if (raw.includes("PS5")) return "PS5";
    if (raw.includes("PS4")) return "PS4";
    if (raw.includes("PS3")) return "PS3";
    if (raw.includes("VITA")) return "PS Vita";
    if (raw.includes("PSP")) return "PSP";
    return "PS5";
}

function resolveGamePosterArt(sources = []) {
    for (const src of sources) {
        if (typeof src === "string" && src.trim().length > 0 && !src.includes("undefined") && !src.includes("null")) {
            let cleanUrl = src.trim();
            if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.replace("http://", "//");
            if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.replace("https://", "//");
            return cleanUrl;
        }
    }
    return null;
}

function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hrs`;
    return `${minutes} mins`;
}

function parseIsoDuration(durationStr) {
    if (!durationStr || typeof durationStr !== "string") return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (parseInt(match[1] || "0", 10) * 3600) + (parseInt(match[2] || "0", 10) * 60) + parseInt(match[3] || "0", 10);
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

function filterRecordForRtdb(record) {
    if (!record || typeof record !== "object") return {};
    const slim = {};
    for (const key of Object.keys(record)) {
        if (RTDB_ALLOWED_USER_KEYS.has(key)) {
            slim[key] = record[key];
        }
    }
    return slim;
}

/* ============================================================================
 * Section: Ingestion Engine Execution
 * ============================================================================ */
async function executeSyncPass() {
    try {
        console.log(`[INIT] Running PSN Ingestion Engine v${ENGINE_VERSION}...`);

        initializeAdminSdk();
        await loadPersistentTokens();

        // 1. Harvest credentials directly from Kevin's entertainment-71888
        const { coreNpssos, coreAccountIds, registeredGuests, users: sourceUsers } = await harvestCredentialsFromKevinDb();

        // 2. Resolve Master Session and Failovers
        const { masterAuth, auths: coreAuths, failoverState, bufferStatus } = await resolveMasterSession(coreNpssos, registeredGuests);
        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = bufferStatus;

        // 3. Load Destination RTDB existing gamertags and Firestore catalogs
        const previousDestData = await fetchFromDestRtdb();
        const globalGames = await loadGamesFromFirestore();

        let finalGamertags = { ...(previousDestData?.gamertags || {}) };
        let finalUsersByGamerTag = { ...(previousDestData?.usersByGamerTag || {}) };
        const activeCanonicalGamertags = new Set();

        const isCoreMaster = masterAuth && CORE_PACK.some(m => m.key === masterAuth.userKey);

        // 4. Ingest Core 4 Squad Members
        for (const member of CORE_PACK) {
            const targetId = coreAccountIds[member.key] || member.id;
            const existingData = finalGamertags[member.tag];
            const memberAuth = coreAuths[member.key]?.accessToken ? coreAuths[member.key] : masterAuth;

            if (!memberAuth || !memberAuth.accessToken) {
                console.warn(`[CORE HALT] No active token available for ${member.tag}. Preserving record.`);
                activeCanonicalGamertags.add(member.tag);
                continue;
            }

            // Determine if full or lite pull based on whether master token is Core or Guest
            const isFullPull = isCoreMaster;
            console.log(`[SYNC RUN] Ingesting Core Member: ${member.tag} (${isFullPull ? 'FULL PULL' : 'LITE REVERSE PULL'})...`);

            const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(memberAuth, targetId), null);
            const canonicalOnlineId = profile?.onlineId || member.tag;
            const rawPresence = await callPsn("getBasicPresence", () => getBasicPresence(memberAuth, targetId === ACCOUNT_IDS[memberAuth.userKey] ? "me" : targetId), {});

            const isOnline = (rawPresence?.basicPresence?.onlineStatus || rawPresence?.primaryPlatformInfo?.onlineStatus || "offline") !== "offline";
            const activeGameInfo = rawPresence?.basicPresence?.gameTitleInfoList?.[0] || rawPresence?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            const currentGame = activeGameInfo.titleName || activeGameInfo.npTitleName || (isOnline ? "Dashboard" : "Offline");

            const titlesPull = await paginateCollect(
                "getUserTitles",
                (offset, size) => getUserTitles(memberAuth, targetId, { limit: size, offset }),
                (res) => res?.trophyTitles || [],
                PULL_CONFIG.PAGE_SIZE_TITLES
            );
            const sortedTitles = titlesPull.items.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
            const trophySummary = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(memberAuth, targetId), {});

            // Prepare trophy progress keyed by snake_case Game Title
            const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
            const trophyTitleSync = { ...(existingData?.trophyTitleSync || {}) };
            const cumulativeUnlockedTrophies = [];

            if (isFullPull && sortedTitles.length > 0) {
                for (const t of sortedTitles.slice(0, PULL_CONFIG.SKELETON_REFRESH_RECENT_TITLES)) {
                    const cId = t.npCommunicationId;
                    const gName = t.trophyTitleName || t.name;
                    if (!cId || !gName) continue;

                    const gameKey = toGameKey(gName);
                    const opt = { npServiceName: normalizePlatform(t) === "PS5" ? "trophy2" : "trophy" };

                    // Fetch trophies and DLCs for Firestore catalog
                    if (!globalGames[gameKey]) {
                        const metaRes = await callPsn("getTitleTrophies", () => getTitleTrophies(memberAuth, cId, "all", opt), {});
                        const groupsRes = await callPsn("getTitleTrophyGroups", () => getTitleTrophyGroups(memberAuth, cId, opt), {});

                        const catalogEntry = {
                            gameKey: gameKey,
                            commId: cId,
                            name: gName,
                            platform: normalizePlatform(t),
                            trophies: metaRes?.trophies || [],
                            groups: groupsRes?.trophyGroups || [],
                            totalTrophies: metaRes?.trophies?.length || 0,
                            lastUpdated: new Date().toISOString()
                        };
                        globalGames[gameKey] = catalogEntry;
                        await writeGameToFirestore(gameKey, catalogEntry);
                    }

                    // User progress keyed by game title in snake_case
                    const earnedRes = await callPsn("getUserTrophiesEarnedForTitle", () => getUserTrophiesEarnedForTitle(memberAuth, targetId, cId, "all", opt), {});
                    if (earnedRes?.trophies) {
                        const progressMap = {};
                        earnedRes.trophies.forEach(et => {
                            progressMap[et.trophyId] = {
                                trophyId: et.trophyId,
                                gameTitle: gName,
                                earned: !!et.earned,
                                earnedDate: et.earnedDateTime || null,
                                progress: et.progress || 0
                            };
                            if (et.earned) cumulativeUnlockedTrophies.push({ trophyId: et.trophyId, gameTitle: gName, timestamp: new Date(et.earnedDateTime || 0).getTime() });
                        });
                        liveTrophyProgress[gameKey] = progressMap;
                        trophyTitleSync[gameKey] = t.lastUpdatedDateTime || null;
                    }
                }
            }

            const record = {
                onlineId: canonicalOnlineId,
                accountId: targetId,
                online: isOnline,
                currentGame: currentGame,
                gameStatus: activeGameInfo.gameStatus || "",
                gameStatusUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
                avatar: profile?.avatars?.[0]?.url || existingData?.avatar || "",
                level: trophySummary?.trophyLevel || existingData?.level || 0,
                trophySummary: {
                    total: ((trophySummary?.earnedTrophies?.platinum || 0) + (trophySummary?.earnedTrophies?.gold || 0) + (trophySummary?.earnedTrophies?.silver || 0) + (trophySummary?.earnedTrophies?.bronze || 0)),
                    platinum: trophySummary?.earnedTrophies?.platinum || 0,
                    gold: trophySummary?.earnedTrophies?.gold || 0,
                    silver: trophySummary?.earnedTrophies?.silver || 0,
                    bronze: trophySummary?.earnedTrophies?.bronze || 0
                },
                gamesPlayed: sortedTitles.length,
                recentGames: sortedTitles.slice(0, 10),
                liveTrophyProgress: liveTrophyProgress,
                trophyTitleSync: trophyTitleSync,
                mostRecentTrophies: cumulativeUnlockedTrophies.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
                npssoValid: !!memberAuth?.accessToken,
                npssoStatus: memberAuth?.accessToken ? "ACTIVE" : "EXPIRED",
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
            };

            const filteredRtdbRecord = filterRecordForRtdb(record);
            finalGamertags[canonicalOnlineId] = filteredRtdbRecord;
            finalUsersByGamerTag[canonicalOnlineId] = String(targetId);
            activeCanonicalGamertags.add(canonicalOnlineId);

            await syncNodeToDestRtdb(`gamertags/${canonicalOnlineId}`, filteredRtdbRecord);
            await archiveRawToFirestore(canonicalOnlineId, "presence", rawPresence);
        }

        // 5. Ingest Registered Guests from Kevin's DB
        for (const guest of registeredGuests) {
            const guestAuth = guest.npsso ? await getAuthenticated(guest.emailKey, guest.npsso) : null;
            const hasOwnCookie = !!(guestAuth && guestAuth.accessToken);
            const authToUse = hasOwnCookie ? guestAuth : masterAuth;

            if (!authToUse || !authToUse.accessToken || !guest.accountId) continue;

            const isGuestFull = hasOwnCookie;
            console.log(`[GUEST SYNC] Ingesting Guest: ${guest.tag || guest.accountId} (${isGuestFull ? 'FULL PULL' : 'LITE PULL'})...`);

            const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(authToUse, guest.accountId), null);
            const onlineId = profile?.onlineId || guest.tag || guest.accountId;
            const rawPresence = await callPsn("getBasicPresence", () => getBasicPresence(authToUse, guest.accountId), {});

            const isOnline = (rawPresence?.basicPresence?.onlineStatus || rawPresence?.primaryPlatformInfo?.onlineStatus || "offline") !== "offline";
            const trophySummary = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(authToUse, guest.accountId), {});

            const guestRecord = {
                onlineId: onlineId,
                accountId: guest.accountId,
                online: isOnline,
                currentGame: isOnline ? (rawPresence?.basicPresence?.gameTitleInfoList?.[0]?.titleName || "Dashboard") : "Offline",
                avatar: profile?.avatars?.[0]?.url || "",
                level: trophySummary?.trophyLevel || 0,
                trophySummary: {
                    total: ((trophySummary?.earnedTrophies?.platinum || 0) + (trophySummary?.earnedTrophies?.gold || 0) + (trophySummary?.earnedTrophies?.silver || 0) + (trophySummary?.earnedTrophies?.bronze || 0)),
                    platinum: trophySummary?.earnedTrophies?.platinum || 0,
                    gold: trophySummary?.earnedTrophies?.gold || 0,
                    silver: trophySummary?.earnedTrophies?.silver || 0,
                    bronze: trophySummary?.earnedTrophies?.bronze || 0
                },
                npssoValid: hasOwnCookie,
                npssoStatus: hasOwnCookie ? "ACTIVE" : "GUEST_LITE",
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
            };

            const filteredGuest = filterRecordForRtdb(guestRecord);
            finalGamertags[onlineId] = filteredGuest;
            finalUsersByGamerTag[onlineId] = String(guest.accountId);
            activeCanonicalGamertags.add(onlineId);

            await syncNodeToDestRtdb(`gamertags/${onlineId}`, filteredGuest);
        }

        // Clean stale tags from destination RTDB
        const oldTags = Object.keys(previousDestData?.gamertags || {});
        for (const old of oldTags) {
            if (!activeCanonicalGamertags.has(old)) {
                await deleteNodeFromDestRtdb(`gamertags/${old}`);
            }
        }

        // Sync reverse lookup map to Ray's RTDB
        await syncNodeToDestRtdb("usersByGamerTag", normalizeForRtdb(finalUsersByGamerTag));

        // 6. Write Leaderboard and Analytics into Ray's Firestore
        if (firestoreDb) {
            const leaderboard = Object.values(finalGamertags).map(p => ({
                onlineId: p.onlineId || "Unknown",
                level: p.level || 0,
                totalTrophies: p.trophySummary?.total || 0,
                currentGame: p.currentGame || "Offline",
                online: !!p.online
            })).sort((a, b) => b.level - a.level);

            await firestoreDb.collection("squadLeaderboard").doc("current").set({
                leaderboard: leaderboard,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await firestoreDb.collection("meta").doc("engine").set({
                version: ENGINE_VERSION,
                lastRun: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
                diagnostics: diagnosticReport
            });
            console.log("[FIRESTORE SUCCESS] Synchronized heavy leaderboard & meta to Ray's Firestore.");
        }

        console.log(`[SUCCESS] PSN Engine v${ENGINE_VERSION} finished.`);
    } catch (criticalErr) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalErr.message}`);
    }
}

(async () => {
    await executeSyncPass();
    process.exit(0);
})();
