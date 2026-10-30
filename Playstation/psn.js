/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Version: 67.3.0
 * Description: Master Dual-Firebase PSN Telemetry & Ingestion Engine
 *   - Input Source: Kevin's Firebase (entertainment-71888) [READ-ONLY]
 *       * Reads all users, psn_account_id, and psn_npsso from /users and /user_secrets
 *   - Output Target: Ray's Firebase (playstation-stats) [WRITE-ONLY]
 *       * RTDB: Strictly /psn/gamertags/{onlineId} (51 allowed keys) & /psn/usersByGamerTag
 *       * Firestore: games/{Game_Name_Slug}, squadLeaderboard, squadAnalytics, meta, raw
 *   - Dynamic Failover:
 *       * Core 4 squad tokens run heavy pulls.
 *       * Guest with cookie gets personal heavy pull.
 *       * Guest without cookie gets lite pull via squad master session.
 *       * If Core cookies expire, active guest cookie keeps Core 4 updated via lite pull.
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

// 1. Source Database (Kevin's Account - User Settings & Cookies)
const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";

// 2. Destination Database (Ray's Account - Dedicated PlayStation Telemetry)
const RAY_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";

const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const ENGINE_VERSION = "67.3.0";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: "4087137467908566201", emailMatch: "raykevin71888" },
    { key: "ray", tag: "OneLIVIDMAN", id: "2732733730346312494", emailMatch: "cartnalray9" },
    { key: "darkwing", tag: "Darkwing69420", id: "4398462806362115916", emailMatch: "darkwing" },
    { key: "marc", tag: "DesdemonaTiger", id: "6551906246515882523", emailMatch: "desdemona" }
];

const AMAZON_TAG = "moviesanywhere02-20";

// Exactly the 51 allowed fields for RTDB user profiles
const RTDB_ALLOWED_USER_KEYS = new Set([
    "accountId", "activeHunt", "allAvatars", "art", "avatar", "bio", "commId", "conceptId",
    "currentGame", "currentGameArt", "currentGameHours", "currentGameNumericHours",
    "currentSessionSeconds", "displayPlatform", "earliestTrophyDate", "friendsList",
    "friendsProfiles", "gameBuildVersion", "gameStatus", "gameStatusUpdated", "gamesPlayed",
    "handshakeState", "handshakeText", "image", "isStreamingRemotePlay", "language",
    "lastUpdated", "latestTrophyDate", "level", "liveTrophyProgress", "mostRecentTrophies",
    "npssoStatus", "npssoValid", "online", "onlineId", "platform", "playedHoursApp",
    "playedHoursWhole", "playtimeSource", "plus", "posterArt", "psnAccountAge",
    "purchasedGames", "rawPresence", "rawProfile", "recentGames", "region",
    "sessionStartedAt", "sessionStartedAtMs", "shareableProfile", "sonyPlayDuration",
    "storeListing", "trophySummary", "trophyTitleSync", "playSessions"
]);

let tokenStore = {};
let diagnosticReport = {
    wildhorse_spirit_active: "no",
    ray_active: "no",
    darkwing_active: "no",
    marc_active: "no",
    active_runner: "UNCHECKED",
    buffer_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

const PULL_CONFIG = {
    SKELETON_REFRESH_RECENT_TITLES: 20,
    HEAVY_REFRESH_MS: 6 * 3600 * 1000,
    PAGE_SIZE_TITLES: 800,
    PAGE_SIZE_PLAYED: 200,
    PAGE_SIZE_FRIENDS: 1000,
    MAX_PAGES: 50,
    REQUEST_GAP_MS: 120,
    RETRIES: 2,
    PREFER_SONY_PLAYTIME: true
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================================
 * Section: Initialize Ray's Admin SDK (Native Write Access)
 * ============================================================================ */
let rayApp = null;
let rayRtdb = null;
let rayFirestore = null;

function initRayFirebaseAdmin() {
    if (admin.apps.length > 0) {
        rayApp = admin.apps[0];
        rayRtdb = admin.database();
        rayFirestore = admin.firestore();
        return;
    }

    const rawServiceKey = process.env.FIREBASE_SERVICE_RAY || "";
    if (!rawServiceKey.trim()) {
        console.error("[FATAL ERROR] FIREBASE_SERVICE_RAY is missing from GitHub Secrets! Cannot write to Ray's database.");
        return;
    }

    try {
        let creds;
        const trimmed = rawServiceKey.trim();
        if (trimmed.startsWith("{")) {
            creds = JSON.parse(trimmed);
        } else {
            creds = JSON.parse(Buffer.from(trimmed, "base64").toString("utf-8"));
        }

        rayApp = admin.initializeApp({
            credential: admin.credential.cert(creds),
            databaseURL: RAY_RTDB_URL
        });
        rayRtdb = admin.database();
        rayFirestore = admin.firestore();
        console.log(`[RAY FIREBASE] Native Admin connection established to: ${creds.project_id} (RTDB & Firestore)`);
    } catch (err) {
        console.error(`[FATAL ERROR] Could not parse FIREBASE_SERVICE_RAY JSON: ${err.message}`);
    }
}

function toGameKey(name = "") {
    return String(name || "")
        .replace(/®|™|©/g, "")
        .replace(/[:\/\\#$\[\].\-+]/g, " ")
        .trim()
        .replace(/\s+/g, "_") || "Unknown_Game";
}

/* ============================================================================
 * Section: Read From Kevin's Database (entertainment-71888)
 * ============================================================================ */
async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    if (typeof fetch !== "undefined") {
        try { return await fetch(url, options); } catch (e) {}
    }

    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const headers = options.headers || {};
            if (options.body && !headers["Content-Length"]) {
                headers["Content-Length"] = Buffer.byteLength(options.body);
            }
            const req = client.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: options.method || "GET",
                headers: headers
            }, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: async () => { try { return JSON.parse(data || "{}"); } catch (e) { return {}; } }
                    });
                });
            });
            req.on("error", (err) => reject(err));
            if (options.body) req.write(options.body);
            req.end();
        } catch (err) { reject(err); }
    });
}

function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
}

async function readKevinUserCredentials() {
    const authQuery = process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "";
    console.log(`[KEVIN DB] Reading user settings from ${KEVIN_RTDB_URL}...`);

    const [usersRes, secretsRes, legacyGamertagsRes] = await Promise.all([
        resilientFetch(`${KEVIN_RTDB_URL}/users.json${authQuery}`).then(r => r.json()).catch(() => ({})),
        resilientFetch(`${KEVIN_RTDB_URL}/user_secrets.json${authQuery}`).then(r => r.json()).catch(() => ({})),
        resilientFetch(`${KEVIN_RTDB_URL}/psn/gamertags.json${authQuery}`).then(r => r.json()).catch(() => ({}))
    ]);

    if (usersRes?.error) {
        console.error(`[KEVIN DB ERROR] Permission denied reading /users: ${usersRes.error}. (Verify FIREBASE_AUTH_SECRET)`);
    }

    const users = (usersRes && !usersRes.error) ? usersRes : {};
    const secrets = (secretsRes && !secretsRes.error) ? secretsRes : {};
    const legacyTags = (legacyGamertagsRes && !legacyGamertagsRes.error) ? legacyGamertagsRes : {};

    const coreNpssos = { wildhorse_spirit: "", ray: "", darkwing: "", marc: "" };
    const coreAccountIds = {
        wildhorse_spirit: "4087137467908566201",
        ray: "2732733730346312494",
        darkwing: "4398462806362115916",
        marc: "6551906246515882523"
    };
    const guestList = [];

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

        let matchedCoreKey = null;
        for (const member of CORE_PACK) {
            if (emailLower.includes(member.emailMatch) || tagLower === member.tag.toLowerCase() || idStr === member.id) {
                matchedCoreKey = member.key;
                if (idStr) coreAccountIds[member.key] = idStr;
                if (rawCookie) coreNpssos[member.key] = rawCookie;
                break;
            }
        }

        if (!matchedCoreKey && (idStr || rawCookie)) {
            guestList.push({
                emailKey,
                accountId: idStr || null,
                tag: rawTag || "",
                npsso: rawCookie
            });
        }
    }

    // Check legacy /psn/gamertags node on Kevin's DB for Darkwing or Marc
    for (const [tag, data] of Object.entries(legacyTags)) {
        const lower = tag.toLowerCase();
        const cookie = normalizeNpsso(data.npsso || data.psn_npsso);
        const id = String(data.accountId || "").trim();
        if (lower.includes("darkwing") && cookie) coreNpssos.darkwing = cookie;
        if (lower.includes("desdemona") && cookie) coreNpssos.marc = cookie;
        if (lower.includes("darkwing") && id) coreAccountIds.darkwing = id;
        if (lower.includes("desdemona") && id) coreAccountIds.marc = id;
    }

    console.log(`[KEVIN DB] Harvested cookies: Werewolf=${!!coreNpssos.wildhorse_spirit}, Ray=${!!coreNpssos.ray}, Darkwing=${!!coreNpssos.darkwing}, Marc=${!!coreNpssos.marc}. Guests found: ${guestList.length}`);
    return { coreNpssos, coreAccountIds, guestList };
}

/* ============================================================================
 * Section: PSN Authentication & Failover Manager
 * ============================================================================ */
async function callPsn(label, fn, fallback = null) {
    if (typeof fn !== "function") return fallback;
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            return await fn();
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                await sleep(5000 * (attempt + 1));
                continue;
            }
            return fallback;
        }
    }
    return fallback;
}

async function getAuthenticated(userKey, npssoInput) {
    let currentTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);

    if (currentTokens.accessToken && currentTokens.expiryTime > now + 300) {
        try {
            await getUserRegion({ accessToken: currentTokens.accessToken }, "me");
            diagnosticReport[`${userKey}_active`] = "yes";
            return { accessToken: currentTokens.accessToken, npssoValid: true, userKey };
        } catch (e) {
            currentTokens.accessToken = null;
        }
    }

    if (currentTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentTokens.refreshToken);
            if (refreshed?.accessToken) {
                tokenStore[userKey] = {
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken || currentTokens.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600)
                };
                diagnosticReport[`${userKey}_active`] = "yes";
                return { ...refreshed, npssoValid: true, userKey };
            }
        } catch (e) {
            tokenStore[userKey] = {};
        }
    }

    if (npssoInput && npssoInput.trim().length >= 20) {
        try {
            console.log(`[AUTH] Handshaking NPSSO cookie for ${userKey}...`);
            const accessCode = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(accessCode);
            if (auth?.accessToken) {
                tokenStore[userKey] = {
                    accessToken: auth.accessToken,
                    refreshToken: auth.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600)
                };
                diagnosticReport[`${userKey}_active`] = "yes";
                console.log(`[AUTH SUCCESS] Active PSN token obtained for ${userKey}!`);
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[AUTH REJECTED] Cookie expired/invalid for ${userKey}: ${e.message}`);
        }
    }

    diagnosticReport[`${userKey}_active`] = "no";
    return null;
}

async function resolveSquadSession(coreNpssos, guestList) {
    const auths = {};
    for (const member of CORE_PACK) {
        auths[member.key] = await getAuthenticated(member.key, coreNpssos[member.key]);
    }

    let masterAuth = null;
    let runnerState = "SNAPSHOT_FALLBACK";

    for (const member of CORE_PACK) {
        if (auths[member.key]?.accessToken) {
            masterAuth = auths[member.key];
            runnerState = `RUNNING_ON_${member.key.toUpperCase()}`;
            console.log(`[MASTER SESSION] Squad elected ${member.tag} as active runner.`);
            break;
        }
    }

    // Reverse Fallback: If all 4 Core Cookies expired, check if any registered Guest has an active cookie!
    if (!masterAuth) {
        console.warn("[MASTER SESSION] ⚠️ All Core cookies expired. Checking guest cookies for emergency master session...");
        for (const guest of guestList) {
            if (guest.npsso) {
                const guestAuth = await getAuthenticated(guest.emailKey, guest.npsso);
                if (guestAuth?.accessToken) {
                    masterAuth = guestAuth;
                    runnerState = `RUNNING_ON_GUEST_${guest.tag || guest.emailKey}`;
                    console.log(`[MASTER SESSION] Promoted guest ${guest.tag || guest.emailKey} to Squad Master Token.`);
                    break;
                }
            }
        }
    }

    diagnosticReport.active_runner = runnerState;
    diagnosticReport.buffer_status = masterAuth ? "LIVE_CONNECTED" : "OFFLINE_SNAPSHOT";
    return { masterAuth, auths };
}

function normalizePlatform(game) {
    const raw = (game?.trophyTitlePlatform || game?.platform || game?.category || (game?.npServiceName === "trophy2" ? "PS5" : "PS4") || "PS4").toUpperCase();
    if (raw.includes("PS5")) return "PS5";
    if (raw.includes("PS4")) return "PS4";
    if (raw.includes("PS3")) return "PS3";
    return "PS5";
}

function filterForRtdb(record) {
    const slim = {};
    for (const key of Object.keys(record || {})) {
        if (RTDB_ALLOWED_USER_KEYS.has(key) && record[key] !== undefined) {
            slim[key] = record[key];
        }
    }
    return slim;
}

/* ============================================================================
 * Section: Main Sync Execution Pass
 * ============================================================================ */
async function executeSyncPass() {
    try {
        console.log(`[START] PSN Ingestion Engine v${ENGINE_VERSION} starting...`);

        // 1. Initialize Ray's Admin SDK
        initRayFirebaseAdmin();
        if (!rayRtdb || !rayFirestore) {
            throw new Error("Ray's Firebase Admin SDK failed to initialize. Check FIREBASE_SERVICE_RAY secret.");
        }

        // 2. Read users & cookies from Kevin's entertainment-71888
        const { coreNpssos, coreAccountIds, guestList } = await readKevinUserCredentials();

        // 3. Authenticate with Sony & Elect Squad Master
        const { masterAuth, auths: coreAuths } = await resolveSquadSession(coreNpssos, guestList);

        const usersByGamerTag = {};
        const isCoreActive = masterAuth && CORE_PACK.some(m => m.key === masterAuth.userKey);

        // 4. Ingest Core 4 Squad Members
        for (const member of CORE_PACK) {
            const targetId = coreAccountIds[member.key] || member.id;
            const authToUse = coreAuths[member.key]?.accessToken ? coreAuths[member.key] : masterAuth;

            if (!authToUse || !authToUse.accessToken) {
                console.warn(`[CORE HALT] No active token available for ${member.tag}. Skipping.`);
                continue;
            }

            const isFull = isCoreActive;
            console.log(`[INGEST CORE] Syncing ${member.tag} (${isFull ? 'FULL PULL' : 'LITE REVERSE PULL'})...`);

            const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(authToUse, targetId), {});
            const canonicalOnlineId = profile?.onlineId || member.tag;
            usersByGamerTag[canonicalOnlineId] = String(targetId);

            const isSelf = authToUse.userKey === member.key;
            const targetScope = isSelf ? "me" : targetId;
            const rawPresence = await callPsn("getBasicPresence", () => getBasicPresence(authToUse, targetScope), {});

            const isOnline = (rawPresence?.basicPresence?.onlineStatus || rawPresence?.primaryPlatformInfo?.onlineStatus || "offline") !== "offline";
            const activeGameInfo = rawPresence?.basicPresence?.gameTitleInfoList?.[0] || rawPresence?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            const currentGame = activeGameInfo.titleName || activeGameInfo.npTitleName || (isOnline ? "Dashboard" : "Offline");

            const trophySummary = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(authToUse, targetId), {});
            const titlesPull = await callPsn("getUserTitles", () => getUserTitles(authToUse, targetId, { limit: 100, offset: 0 }), { trophyTitles: [] });
            const recentTitles = (titlesPull?.trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

            const liveTrophyProgress = {};
            const trophyTitleSync = {};
            const mostRecentTrophies = [];

            // Full ingestion: Pull game skeletons to Ray's Firestore & trophy progress
            if (isFull && recentTitles.length > 0) {
                for (const t of recentTitles.slice(0, PULL_CONFIG.SKELETON_REFRESH_RECENT_TITLES)) {
                    const cId = t.npCommunicationId;
                    const gName = t.trophyTitleName || t.name;
                    if (!cId || !gName) continue;

                    const gameKey = toGameKey(gName);
                    const opt = { npServiceName: normalizePlatform(t) === "PS5" ? "trophy2" : "trophy" };

                    // Write Game Catalog to Ray's Firestore (keyed as snake_case)
                    const gameDocRef = rayFirestore.collection("games").doc(gameKey);
                    const gameSnap = await gameDocRef.get();
                    if (!gameSnap.exists) {
                        const metaRes = await callPsn("getTitleTrophies", () => getTitleTrophies(authToUse, cId, "all", opt), {});
                        const groupsRes = await callPsn("getTitleTrophyGroups", () => getTitleTrophyGroups(authToUse, cId, opt), {});
                        await gameDocRef.set({
                            gameKey: gameKey,
                            commId: cId,
                            name: gName,
                            platform: normalizePlatform(t),
                            trophies: metaRes?.trophies || [],
                            groups: groupsRes?.trophyGroups || [],
                            totalTrophies: metaRes?.trophies?.length || 0,
                            lastUpdated: new Date().toISOString()
                        }, { merge: true });
                        console.log(`[FIRESTORE] Ingested catalog: games/${gameKey}`);
                    }

                    // User Trophy Progress (Keyed by Game Name in RTDB)
                    const earnedRes = await callPsn("getUserTrophiesEarnedForTitle", () => getUserTrophiesEarnedForTitle(authToUse, targetId, cId, "all", opt), {});
                    if (earnedRes?.trophies) {
                        const progMap = {};
                        earnedRes.trophies.forEach(et => {
                            progMap[et.trophyId] = {
                                trophyId: et.trophyId,
                                gameTitle: gName,
                                earned: !!et.earned,
                                earnedDate: et.earnedDateTime || null,
                                progress: et.progress || 0
                            };
                            if (et.earned) mostRecentTrophies.push({ trophyId: et.trophyId, gameTitle: gName, timestamp: new Date(et.earnedDateTime || 0).getTime() });
                        });
                        liveTrophyProgress[gameKey] = progMap;
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
                avatar: profile?.avatars?.[0]?.url || "",
                level: trophySummary?.trophyLevel || 0,
                trophySummary: {
                    total: ((trophySummary?.earnedTrophies?.platinum || 0) + (trophySummary?.earnedTrophies?.gold || 0) + (trophySummary?.earnedTrophies?.silver || 0) + (trophySummary?.earnedTrophies?.bronze || 0)),
                    platinum: trophySummary?.earnedTrophies?.platinum || 0,
                    gold: trophySummary?.earnedTrophies?.gold || 0,
                    silver: trophySummary?.earnedTrophies?.silver || 0,
                    bronze: trophySummary?.earnedTrophies?.bronze || 0
                },
                gamesPlayed: recentTitles.length,
                recentGames: recentTitles.slice(0, 10),
                liveTrophyProgress: liveTrophyProgress,
                trophyTitleSync: trophyTitleSync,
                mostRecentTrophies: mostRecentTrophies.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
                npssoValid: !!authToUse.accessToken,
                npssoStatus: authToUse.accessToken ? "ACTIVE" : "EXPIRED",
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
            };

            // Write Player Record directly to Ray's RTDB
            const filtered = filterForRtdb(record);
            await rayRtdb.ref(`psn/gamertags/${canonicalOnlineId}`).set(filtered);
            console.log(`[RAY RTDB WRITE SUCCESS] /psn/gamertags/${canonicalOnlineId}`);

            // Archive raw presence to Ray's Firestore
            await rayFirestore.collection("raw_telemetry").doc(canonicalOnlineId).set({
                presence: rawPresence,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // 5. Ingest Guests from Kevin's Database
        for (const guest of guestList) {
            const guestAuth = guest.npsso ? await getAuthenticated(guest.emailKey, guest.npsso) : null;
            const hasOwnCookie = !!(guestAuth?.accessToken);
            const authToUse = hasOwnCookie ? guestAuth : masterAuth;

            if (!authToUse || !authToUse.accessToken || !guest.accountId) continue;

            console.log(`[INGEST GUEST] Syncing ${guest.tag || guest.accountId} (${hasOwnCookie ? 'FULL PULL' : 'LITE PULL'})...`);

            const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(authToUse, guest.accountId), {});
            const onlineId = profile?.onlineId || guest.tag || guest.accountId;
            usersByGamerTag[onlineId] = String(guest.accountId);

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

            await rayRtdb.ref(`psn/gamertags/${onlineId}`).set(filterForRtdb(guestRecord));
            console.log(`[RAY RTDB WRITE SUCCESS] /psn/gamertags/${onlineId}`);
        }

        // 6. Write usersByGamerTag index to Ray's RTDB
        await rayRtdb.ref("psn/usersByGamerTag").set(usersByGamerTag);

        // 7. Write Leaderboard & Meta to Ray's Firestore
        const leaderboardSnap = await rayRtdb.ref("psn/gamertags").once("value");
        const allTags = leaderboardSnap.val() || {};
        const leaderboard = Object.values(allTags).map(p => ({
            onlineId: p.onlineId || "Unknown",
            level: p.level || 0,
            totalTrophies: p.trophySummary?.total || 0,
            currentGame: p.currentGame || "Offline",
            online: !!p.online
        })).sort((a, b) => b.level - a.level);

        await rayFirestore.collection("squadLeaderboard").doc("current").set({
            leaderboard: leaderboard,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await rayFirestore.collection("meta").doc("engine").set({
            version: ENGINE_VERSION,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
            diagnostics: diagnosticReport
        });

        console.log(`[SUCCESS] Full sync pass finished! Output successfully populated on Ray's Firebase.`);
    } catch (err) {
        console.error(`[SYNC ABORTED] Fatal error: ${err.message}`);
    }
}

(async () => {
    await executeSyncPass();
    process.exit(0);
})();
