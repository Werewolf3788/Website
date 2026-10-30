/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Version: 67.7.0
 * Description: Master Dual-Database PSN Telemetry Engine
 *   - INPUT: Reads users & cookies from Kevin's DB (entertainment-71888) [READ-ONLY]
 *   - OUTPUT: Writes strictly to Ray's DB (playstation-stats) [WRITE-ONLY]
 *       * RTDB: /psn/gamertags/{onlineId} (Exact 51 allowed fields) & /psn/usersByGamerTag
 *       * Firestore: games/{Game_Name_Slug}, squadLeaderboard, meta, raw_telemetry
 *   - GUARANTEED: ZERO writes will ever be sent to entertainment-71888.
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
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
    getProfileFromAccountId,
    getUserRegion,
    getBasicPresence
} = psnApi;

// 1. Source Database (Kevin's Account - User Settings & Cookies ONLY)
const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";

// 2. Destination Database (Ray's Account - Dedicated PlayStation Telemetry)
const RAY_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";

const ENGINE_VERSION = "67.7.0";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const IS_MANUAL_TRIGGER = process.env.GITHUB_TRIGGER_EVENT === "workflow_dispatch" || process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: "4087137467908566201", emailMatch: "raykevin71888" },
    { key: "ray", tag: "OneLIVIDMAN", id: "2732733730346312494", emailMatch: "cartnalray9" },
    { key: "darkwing", tag: "Darkwing69420", id: "4398462806362115916", emailMatch: "darkwing" },
    { key: "marc", tag: "DesdemonaTiger", id: "6551906246515882523", emailMatch: "desdemona" }
];

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
    trigger_mode: IS_MANUAL_TRIGGER ? "MANUAL_FORCE_HEAVY" : "SCHEDULED_SMART_SYNC",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

const PULL_CONFIG = {
    SKELETON_REFRESH_RECENT_TITLES: 20,
    PAGE_SIZE_TITLES: 800,
    REQUEST_GAP_MS: 120,
    RETRIES: 2
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================================
 * Section: Initialize Ray's Admin App (Target: playstation-stats)
 * ============================================================================ */
let rayRtdb = null;
let rayFirestore = null;

function initRayFirebaseAdmin() {
    const rawKey = process.env.FIREBASE_SERVICE_RAY || "";
    if (!rawKey.trim()) {
        throw new Error("Missing FIREBASE_SERVICE_RAY secret in GitHub. Cannot connect to Ray's database.");
    }

    let creds;
    try {
        const trimmed = rawKey.trim();
        creds = trimmed.startsWith("{") ? JSON.parse(trimmed) : JSON.parse(Buffer.from(trimmed, "base64").toString("utf-8"));
    } catch (e) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_RAY JSON: ${e.message}`);
    }

    // Fix the newline bug for private keys from GitHub Secrets
    if (typeof creds.private_key === "string") {
        creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }

    let rayApp;
    try {
        rayApp = admin.app("rayApp");
    } catch (e) {
        rayApp = admin.initializeApp({
            credential: admin.credential.cert(creds),
            databaseURL: RAY_RTDB_URL
        }, "rayApp");
    }

    rayRtdb = rayApp.database();
    rayFirestore = rayApp.firestore();
    console.log(`[RAY FIREBASE CONNECTED] Target Project: ${creds.project_id}`);
}

function toGameKey(name = "") {
    return String(name || "")
        .replace(/®|™|©/g, "")
        .replace(/[:\/\\#$\[\].\-+]/g, " ")
        .trim()
        .replace(/\s+/g, "_") || "Unknown_Game";
}

/* ============================================================================
 * Section: Read Credentials From Kevin's DB (entertainment-71888) [READ-ONLY]
 * ============================================================================ */
function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
}

async function getKevinReadHeaders() {
    // If Kevin's Service Account is passed, use it to get an OAuth Bearer token for READ-ONLY access
    const rawKevinKey = process.env.GCP_SA_KEY_WEBSITE || "";
    if (rawKevinKey.trim()) {
        try {
            const trimmed = rawKevinKey.trim();
            const creds = trimmed.startsWith("{") ? JSON.parse(trimmed) : JSON.parse(Buffer.from(trimmed, "base64").toString("utf-8"));
            if (typeof creds.private_key === "string") {
                creds.private_key = creds.private_key.replace(/\\n/g, "\n");
            }
            let kevinApp;
            try {
                kevinApp = admin.app("kevinApp");
            } catch (e) {
                kevinApp = admin.initializeApp({ credential: admin.credential.cert(creds) }, "kevinApp");
            }
            const tokenObj = await kevinApp.options.credential.getAccessToken();
            return { Authorization: `Bearer ${tokenObj.access_token}` };
        } catch (e) {
            console.warn(`[KEVIN OAUTH WARN] Could not get OAuth token for source read: ${e.message}`);
        }
    }
    return {};
}

async function readKevinUserCredentials() {
    console.log(`[KEVIN DB] Fetching user settings from ${KEVIN_RTDB_URL} (Read-Only)...`);
    const readHeaders = await getKevinReadHeaders();
    const authQuery = (!readHeaders.Authorization && process.env.FIREBASE_AUTH_SECRET)
        ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}`
        : "";

    let users = {};
    let secrets = {};
    let legacyTags = {};

    try {
        const [uRes, sRes, gRes] = await Promise.all([
            fetch(`${KEVIN_RTDB_URL}/users.json${authQuery}`, { headers: readHeaders }).then(r => r.json()).catch(() => ({})),
            fetch(`${KEVIN_RTDB_URL}/user_secrets.json${authQuery}`, { headers: readHeaders }).then(r => r.json()).catch(() => ({})),
            fetch(`${KEVIN_RTDB_URL}/psn/gamertags.json${authQuery}`, { headers: readHeaders }).then(r => r.json()).catch(() => ({}))
        ]);

        users = (uRes && typeof uRes === "object" && !uRes.error) ? uRes : {};
        secrets = (sRes && typeof sRes === "object" && !sRes.error) ? sRes : {};
        legacyTags = (gRes && typeof gRes === "object" && !gRes.error) ? gRes : {};

        if (uRes?.error) console.error(`[KEVIN READ ERROR] /users returned error: ${JSON.stringify(uRes.error)}`);
        if (sRes?.error) console.error(`[KEVIN READ ERROR] /user_secrets returned error: ${JSON.stringify(sRes.error)}`);
    } catch (e) {
        console.warn(`[KEVIN READ EXCEPTION] ${e.message}`);
    }

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
            guestList.push({ emailKey, accountId: idStr || null, tag: rawTag || "", npsso: rawCookie });
        }
    }

    for (const [tag, data] of Object.entries(legacyTags)) {
        if (!data || typeof data !== "object") continue;
        const lower = tag.toLowerCase();
        const cookie = normalizeNpsso(data.npsso || data.psn_npsso);
        const id = String(data.accountId || "").trim();
        if (lower.includes("darkwing") && cookie) coreNpssos.darkwing = cookie;
        if (lower.includes("desdemona") && cookie) coreNpssos.marc = cookie;
        if (lower.includes("darkwing") && id) coreAccountIds.darkwing = id;
        if (lower.includes("desdemona") && id) coreAccountIds.marc = id;
    }

    console.log(`[KEVIN DB HARVEST RESULTS] Werewolf Cookie=${!!coreNpssos.wildhorse_spirit}, Ray Cookie=${!!coreNpssos.ray}, Darkwing Cookie=${!!coreNpssos.darkwing}, Marc Cookie=${!!coreNpssos.marc}. Guests=${guestList.length}`);
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

    if (npssoInput && typeof npssoInput === "string" && npssoInput.trim().length >= 20) {
        try {
            console.log(`[AUTH] Authenticating cookie for ${userKey}...`);
            const accessCode = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(accessCode);
            if (auth?.accessToken) {
                tokenStore[userKey] = {
                    accessToken: auth.accessToken,
                    refreshToken: auth.refreshToken,
                    expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600)
                };
                diagnosticReport[`${userKey}_active`] = "yes";
                console.log(`[AUTH SUCCESS] Active PSN token established for ${userKey}.`);
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[AUTH REJECTED] Cookie invalid/expired for ${userKey}: ${e.message}`);
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
    let runnerTag = "None";
    let runnerState = "SNAPSHOT_FALLBACK";

    for (const member of CORE_PACK) {
        if (auths[member.key]?.accessToken) {
            masterAuth = auths[member.key];
            runnerTag = member.tag;
            runnerState = `RUNNING_ON_${member.key.toUpperCase()}`;
            console.log(`[MASTER SESSION] Squad runner elected: ${member.tag}`);
            break;
        }
    }

    // Reverse Fallback: If all 4 Core Cookies expired, search guest cookies
    if (!masterAuth && Array.isArray(guestList)) {
        console.warn("[MASTER SESSION] ⚠️ Core squad cookies offline. Checking registered guest cookies...");
        for (const guest of guestList) {
            if (guest.npsso) {
                const guestAuth = await getAuthenticated(guest.emailKey, guest.npsso);
                if (guestAuth?.accessToken) {
                    masterAuth = guestAuth;
                    runnerTag = guest.tag || guest.emailKey;
                    runnerState = `RUNNING_ON_GUEST_${runnerTag}`;
                    console.log(`[MASTER SESSION] Promoted guest ${runnerTag} to Squad Master Token.`);
                    break;
                }
            }
        }
    }

    diagnosticReport.active_runner = runnerState;
    diagnosticReport.buffer_status = masterAuth ? "LIVE_CONNECTED" : "OFFLINE_SNAPSHOT";
    return { masterAuth, auths, runnerTag };
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
 * Section: Main Sync Execution Pass (Writes ONLY to Ray's Firebase)
 * ============================================================================ */
async function executeSyncPass() {
    console.log(`[START] PSN Ingestion Engine v${ENGINE_VERSION} running in [${IS_MANUAL_TRIGGER ? 'MANUAL FORCE' : 'SCHEDULED CRON'}] mode...`);

    // 1. Connect to Ray's Firebase
    initRayFirebaseAdmin();

    // 2. IMMEDIATE CONFIRMATION PING TO RAY'S DATABASES
    // This writes to Ray's RTDB & Firestore immediately so they are never "null"
    const nowIso = new Date().toISOString();
    const nowStamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });

    await rayRtdb.ref("psn/engineStatus").set({
        version: ENGINE_VERSION,
        status: "RUNNING",
        startedAt: nowStamp,
        trigger: IS_MANUAL_TRIGGER ? "MANUAL_DISPATCH" : "SCHEDULED_CRON"
    });
    console.log("[VERIFIED] Wrote startup verification ping to Ray's RTDB!");

    await rayFirestore.collection("meta").doc("engine").set({
        version: ENGINE_VERSION,
        status: "RUNNING",
        startedAt: nowStamp,
        trigger: IS_MANUAL_TRIGGER ? "MANUAL_DISPATCH" : "SCHEDULED_CRON"
    }, { merge: true });
    console.log("[VERIFIED] Wrote startup verification ping to Ray's Firestore!");

    // 3. Read users & cookies from Kevin's entertainment-71888 (READ-ONLY)
    const { coreNpssos, coreAccountIds, guestList } = await readKevinUserCredentials();

    // 4. Authenticate with Sony & Elect Squad Master Session
    const { masterAuth, auths: coreAuths, runnerTag } = await resolveSquadSession(coreNpssos, guestList);

    if (!masterAuth || !masterAuth.accessToken) {
        await rayRtdb.ref("psn/engineStatus").update({ status: "WAITING_FOR_ACTIVE_NPSSO", lastCheck: nowStamp });
        throw new Error("No active NPSSO cookies found! Enter a valid cookie on the website settings page.");
    }

    const usersByGamerTag = {};

    // 5. Ingest Core 4 Squad Members -> Write to Ray's RTDB & Firestore
    for (const member of CORE_PACK) {
        const targetId = coreAccountIds[member.key] || member.id;
        const personalAuth = coreAuths[member.key]?.accessToken ? coreAuths[member.key] : null;
        const hasOwnValidCookie = !!personalAuth;
        const authToUse = personalAuth || masterAuth;

        console.log(`[INGEST] Processing Core Member: ${member.tag} (${hasOwnValidCookie ? 'OWN COOKIE' : `BORROWED FROM ${runnerTag}`})...`);

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

        if (Array.isArray(recentTitles) && recentTitles.length > 0) {
            const checkLimit = IS_MANUAL_TRIGGER ? PULL_CONFIG.SKELETON_REFRESH_RECENT_TITLES : 5;

            for (const t of recentTitles.slice(0, checkLimit)) {
                const cId = t.npCommunicationId;
                const gName = t.trophyTitleName || t.name;
                if (!cId || !gName) continue;

                const gameKey = toGameKey(gName);
                const opt = { npServiceName: normalizePlatform(t) === "PS5" ? "trophy2" : "trophy" };

                // Smart Check: Does this game already exist in Ray's Firestore?
                const gameDocRef = rayFirestore.collection("games").doc(gameKey);
                const gameSnap = await gameDocRef.get();
                const existsInFirestore = gameSnap.exists;

                if (IS_MANUAL_TRIGGER || !existsInFirestore) {
                    console.log(`[FIRESTORE WRITE] Scraping and saving game catalog: ${gName} -> games/${gameKey}`);
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
                }

                // Sync player progress
                const earnedRes = await callPsn("getUserTrophiesEarnedForTitle", () => getUserTrophiesEarnedForTitle(authToUse, targetId, cId, "all", opt), {});
                if (Array.isArray(earnedRes?.trophies)) {
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

        const npssoStatus = hasOwnValidCookie
            ? "ACTIVE_FULL_PULL"
            : `LITE_PULL (Borrowed from ${runnerTag})`;

        const handshakeText = hasOwnValidCookie
            ? `${canonicalOnlineId.toUpperCase()} HANDSHAKE: LIVE (OWN COOKIE)`
            : `${canonicalOnlineId.toUpperCase()} HANDSHAKE: LITE PULL (VIA ${runnerTag.toUpperCase()})`;

        const record = {
            onlineId: canonicalOnlineId,
            accountId: targetId,
            online: isOnline,
            currentGame: currentGame,
            gameStatus: activeGameInfo.gameStatus || "",
            gameStatusUpdated: nowStamp,
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
            npssoValid: hasOwnValidCookie, // Strictly FALSE if their personal cookie is dead
            npssoStatus: npssoStatus,
            handshakeText: handshakeText,
            handshakeState: "LIVE",
            lastUpdated: nowStamp
        };

        // Write directly to Ray's RTDB
        await rayRtdb.ref(`psn/gamertags/${canonicalOnlineId}`).set(filterForRtdb(record));
        console.log(`[RAY RTDB SUCCESS] Saved player card to /psn/gamertags/${canonicalOnlineId}`);

        // Write raw presence to Ray's Firestore
        await rayFirestore.collection("raw_telemetry").doc(canonicalOnlineId).set({
            presence: rawPresence,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // 6. Ingest Guests -> Write to Ray's RTDB
    if (Array.isArray(guestList)) {
        for (const guest of guestList) {
            const guestAuth = guest.npsso ? await getAuthenticated(guest.emailKey, guest.npsso) : null;
            const hasOwnCookie = !!(guestAuth?.accessToken);
            const authToUse = hasOwnCookie ? guestAuth : masterAuth;

            if (!authToUse || !authToUse.accessToken || !guest.accountId) continue;

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
                npssoStatus: hasOwnCookie ? "ACTIVE_FULL_PULL" : `GUEST_LITE (Borrowed from ${runnerTag})`,
                handshakeText: hasOwnCookie ? `${onlineId.toUpperCase()} HANDSHAKE: LIVE` : `${onlineId.toUpperCase()} HANDSHAKE: LITE PULL (VIA ${runnerTag.toUpperCase()})`,
                handshakeState: "LIVE",
                lastUpdated: nowStamp
            };

            await rayRtdb.ref(`psn/gamertags/${onlineId}`).set(filterForRtdb(guestRecord));
            console.log(`[RAY RTDB SUCCESS] Saved Guest to /psn/gamertags/${onlineId}`);
        }
    }

    // 7. Write reverse lookup map to Ray's RTDB
    await rayRtdb.ref("psn/usersByGamerTag").set(usersByGamerTag);

    // 8. Write Leaderboard to Ray's Firestore
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

    // Final Status Update
    await rayRtdb.ref("psn/engineStatus").update({
        status: "COMPLETED",
        completedAt: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
    });

    console.log(`[SUCCESS] Full sync complete! Ray's Firebase is now fully populated.`);
}

(async () => {
    try {
        await executeSyncPass();
        process.exit(0);
    } catch (err) {
        console.error(`[FATAL CRASH] Engine aborted: ${err.message}`);
        if (err.stack) console.error(err.stack);
        process.exit(1); // Exits with 1 so GitHub Actions correctly shows a red failure if it ever crashes
    }
})();
