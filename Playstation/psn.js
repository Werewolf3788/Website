/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Master Telemetry Engine - Direct Cloud-Authoritative:
 *              1. Standalone Direct REST Pipeline: Operates entirely over direct HTTPS
 *                 REST requests to Firebase Realtime Database without requiring
 *                 Firebase CLI, GCP_SA_KEY, or GitHub Action deployment runners.
 *              2. Smart Presence Gatekeeper: Checks live squad status first; exits
 *                 cleanly if idle to conserve rate limits.
 *              3. Non-Destructive Library Vault: Retains and aggregates unlocked
 *                 trophies across all recent games without purging.
 *              4. Real-Time Active Game Poster Engine: Directly syncs currentGameArt
 *                 and currentGame to match what is running on console.
 * Analytics Tagging: G-CTYHDF4MSD (Deployable via GTM).
 * Version: 47.0.0 - Direct-To-Database Independent Sync (No Firebase CLI Deployment)
 * Date & Time Stamp: 2026-09-20 17:15:00 (America/New_York)
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const psnApi = require("psn-api");

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
    getPurchasedGames,
    makeUniversalSearch
} = psnApi;

const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ROOT_LOCAL_JSON_PATH = path.join(__dirname, "..", "psn.json");
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const SQUAD_GAMERTAGS = {
    wildhorse_spirit: "WildHorse_Spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "DesdemonaTiger"
};

const TWITCH_MAP = {
    wildhorse_spirit: "werewolf3788",
    ray: "raymystyro",
    darkwing: "terrdog420",
    marc: ""
};

const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523"
};

const AMAZON_TAG = "moviesanywhere02-20";

let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    active_runner: "UNCHECKED",
    buffer_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION: HTTP & HTTPS RESILIENT FETCH LAYER]
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// [SECTION: TIME & FORMATTING HELPERS]
// ----------------------------------------------------------------------------
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
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function normalizePlatform(game) {
    const rawPlatform = (
        game?.trophyTitlePlatform || 
        game?.platform || 
        game?.category || 
        (game?.npServiceName === "trophy2" ? "PS5" : "PS4") || 
        "PS4"
    ).toUpperCase();

    if (rawPlatform.includes("PS5") || rawPlatform.includes("PS5_NATIVE_GAME")) return "PS5";
    if (rawPlatform.includes("PS4")) return "PS4";
    if (rawPlatform.includes("PS3")) return "PS3";
    if (rawPlatform.includes("VITA")) return "PS Vita";
    return "PS5";
}

function resolveGamePosterArt(sources = []) {
    for (const src of sources) {
        if (typeof src === "string" && src.trim().length > 0 && !src.includes("undefined") && !src.includes("null")) {
            return src.trim();
        }
        if (src && typeof src === "object" && src.url) {
            return src.url.trim();
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

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

// ----------------------------------------------------------------------------
// [SECTION: SMART SESSION TRACKING & OFFLINE ACCUMULATOR]
// ----------------------------------------------------------------------------
function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline, activeTitleId) {
    const playSessions = existingUserData?.playSessions || {};
    const now = Date.now();
    const primaryKey = activeCommId || activeTitleId;

    for (const [id, session] of Object.entries(playSessions)) {
        if (session.isActive && (id !== primaryKey || !isOnline)) {
            const sessionElapsed = Math.max(0, Math.floor((now - (session.sessionStartTime || now)) / 1000));
            session.totalSeconds = (session.totalSeconds || 0) + sessionElapsed;
            session.isActive = false;
            session.sessionStartTime = null;
            session.lastEndedTime = now;
            session.totalFormatted = formatDuration(session.totalSeconds);
            console.log(`[SESSION FINALIZED] Logged out from ${session.title}. Added ${sessionElapsed}s. Total: ${session.totalFormatted}`);
        }
    }

    if (isOnline && primaryKey && primaryKey !== "Dashboard") {
        if (!playSessions[primaryKey]) {
            playSessions[primaryKey] = {
                commId: activeCommId || primaryKey,
                titleId: activeTitleId || primaryKey,
                title: activeTitle,
                totalSeconds: 0,
                isActive: true,
                sessionStartTime: now,
                totalFormatted: "0 hrs"
            };
            console.log(`[SESSION STARTED] Active tracking started for ${activeTitle} (${primaryKey}).`);
        } else {
            const current = playSessions[primaryKey];
            if (!current.isActive) {
                current.isActive = true;
                current.sessionStartTime = now;
                console.log(`[SESSION RESUMED] Resumed tracking for ${activeTitle} (${primaryKey}).`);
            }
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    let activeSessionSeconds = 0;
    if (primaryKey && playSessions[primaryKey]) {
        const active = playSessions[primaryKey];
        let currentSeconds = active.totalSeconds || 0;
        if (active.isActive && active.sessionStartTime) {
            currentSeconds += Math.floor((now - active.sessionStartTime) / 1000);
        }
        activeSessionSeconds = currentSeconds;
        currentGameDurationFormatted = formatDuration(currentSeconds);
    }

    return { playSessions, currentGameDurationFormatted, activeSessionSeconds };
}

// ----------------------------------------------------------------------------
// [SECTION: TWITCH TELEMETRY]
// ----------------------------------------------------------------------------
async function getTwitchIntel(username) {
    if (!username) return null;
    const intel = { 
        isLive: false, game: null, gameArt: null, followers: "0", 
        latestFollower: "None", followerNames: [], avatar: null, age: null, bio: null, 
        statusMessage: null, uptime: null, viewers: "0", subCount: "0", 
        chatRules: null, channelCreationRaw: null 
    };

    const cleanUser = username.toLowerCase().trim();
    const invalidTerms = ["offline", "games & demo", "not found", "error", "404", "no description available", "does not have chat rules"];

    const cleanFetch = async (endpoint) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            const res = await resilientFetch(`https://decapi.me/twitch/${endpoint}/${cleanUser}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) return null;
            const text = await res.text();
            const val = text.trim();
            if (!val || invalidTerms.some(term => val.toLowerCase().includes(term))) return null;
            return val;
        } catch (e) { return null; }
    };

    try {
        const statusRes = await cleanFetch("status");
        intel.isLive = !!(statusRes && statusRes.toLowerCase().includes("live"));
        intel.game = await cleanFetch("game");
        intel.gameArt = await cleanFetch("game_image");
        intel.followers = (await cleanFetch("followcount")) || "0";
        intel.latestFollower = (await cleanFetch("latest_follower")) || "None";

        const listRes = await cleanFetch("followers?limit=100");
        if (listRes) { intel.followerNames = listRes.split(", ").map(n => n.trim()).filter(Boolean); }

        intel.avatar = await cleanFetch("avatar");
        intel.age = (await cleanFetch("accountage")) || "Unknown";
        intel.bio = await cleanFetch("description");
        intel.statusMessage = await cleanFetch("title");
        intel.uptime = await cleanFetch("uptime");
        intel.viewers = (await cleanFetch("viewercount")) || "0";
        intel.subCount = (await cleanFetch("subcount")) || "0";
        intel.chatRules = await cleanFetch("chat_rules");
        intel.channelCreationRaw = await cleanFetch("creation");

        return intel;
    } catch (e) { 
        return intel; 
    }
}

function processStreamHistory(existingHistory, twitchIntel) {
    let history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    if (twitchIntel?.isLive && twitchIntel?.game) {
        const currentGame = twitchIntel.game.trim();
        history = history.filter(g => g.toLowerCase() !== currentGame.toLowerCase());
        history.unshift(currentGame);
        if (history.length > 5) history = history.slice(0, 5);
    }
    return history;
}

// ----------------------------------------------------------------------------
// [SECTION: TOKEN LIFECYCLE MANAGEMENT & REFRESH LAYER]
// ----------------------------------------------------------------------------
async function loadPersistentTokens() {
    try {
        const res = await resilientFetch(`${FIREBASE_BASE_URL}/secureTokens.json`);
        if (res && res.ok) {
            const remoteTokens = await res.json();
            if (remoteTokens && typeof remoteTokens === "object") {
                tokenStore = { ...tokenStore, ...remoteTokens };
                console.log("[TOKEN STORAGE] Loaded cached tokens from Firebase.");
            }
        }
    } catch (e) {}

    if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(LOCAL_TOKENS_PATH, "utf-8"));
            if (localData && typeof localData === "object") {
                tokenStore = { ...tokenStore, ...localData };
                console.log("[TOKEN STORAGE] Loaded cached tokens from local disk.");
            }
        } catch (e) {}
    }
}

async function savePersistentTokens() {
    try {
        fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokenStore, null, 2), "utf-8");
    } catch (e) {}

    try {
        await syncNodeToFirebase("secureTokens", tokenStore);
    } catch (e) {}
}

async function purgeToken(userKey) {
    console.warn(`[TOKEN PURGE] Stale access token cleared for ${userKey}.`);
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
            console.log(`[AUTH] Proactively renewing session via refresh token for ${userKey}...`);
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
                console.log(`[AUTH SUCCESS] Successfully renewed session for ${userKey}.`);
                return { ...refreshed, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[REFRESH REJECTED] Refresh token failed for ${userKey}: ${e.message}.`);
            await purgeToken(userKey);
        }
    }

    if (npssoInput && npssoInput.trim().length > 0) {
        try {
            console.log(`[AUTH] Handshaking NPSSO for ${userKey}...`);
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
                console.log(`[AUTH SUCCESS] Authenticated ${userKey} via NPSSO.`);
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) { 
            console.error(`[NPSSO ERROR] Exchange failed for ${userKey}: ${e.message}`);
            diagnosticReport[`${userKey}_active`] = "no";
            diagnosticReport[`${userKey}_status`] = `EXPIRED_NPSSO (${e.message})`;
            return null; 
        }
    }

    console.error(`[AUTH NOTICE] No valid active token available for ${userKey}.`);
    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "OFFLINE_GUEST_MODE";
    return null;
}

// ----------------------------------------------------------------------------
// [SECTION: SMART HOT-STANDBY FAILOVER MANAGER]
// ----------------------------------------------------------------------------
async function resolveMasterSession(wildHorseNpsso, rayNpsso) {
    console.log("[FAILOVER MANAGER] Checking token health across squad accounts...");

    const wolfAuth = await getAuthenticated("wildhorse_spirit", wildHorseNpsso);
    const rayAuth = await getAuthenticated("ray", rayNpsso);

    let activeMaster = null;
    let failoverState = "NORMAL";

    if (wolfAuth && wolfAuth.accessToken) {
        console.log("[FAILOVER MANAGER] Primary token (WildHorse_Spirit) is active.");
        activeMaster = wolfAuth;
        failoverState = "PRIMARY_WOLF";
    } else if (rayAuth && rayAuth.accessToken) {
        console.warn("[FAILOVER MANAGER] ⚠️ Primary token expired. Failing over to Ray standby token.");
        activeMaster = rayAuth;
        failoverState = "FAILOVER_RAY";
    } else {
        console.warn("[FAILOVER MANAGER] ⚠️ Both tokens offline. Transitioning to guest snapshot mode.");
        failoverState = "SNAPSHOT_FALLBACK";
    }

    return { masterAuth: activeMaster, wolfAuth, rayAuth, failoverState };
}

// ----------------------------------------------------------------------------
// [SECTION: GAME SKELETON INGESTION]
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    try {
        const isPs5 = platform === "PS5";
        let opt = { npServiceName: isPs5 ? "trophy2" : "trophy" };
        
        let metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => null);
        if (!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altRes = await getTitleTrophies(auth, commId, "all", { npServiceName: altService }).catch(() => null);
            if (altRes && altRes.trophies && altRes.trophies.length > 0) {
                opt.npServiceName = altService;
                metaRes = altRes;
            }
        }
        metaRes = metaRes || { trophies: [] };

        let groupsRes = await getTitleTrophyGroups(auth, commId, opt).catch(() => null);
        if (!groupsRes || !groupsRes.trophyGroups) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            groupsRes = await getTitleTrophyGroups(auth, commId, { npServiceName: altService }).catch(() => ({ trophyGroups: [] }));
        }
        groupsRes = groupsRes || { trophyGroups: [] };

        const previousRecord = globalGames[commId] || {};
        const safePoster = resolveGamePosterArt([posterArt, iconArt, previousRecord.posterArt, previousRecord.trophyTitleIconUrl]);

        const skeletonData = {
            commId: commId,
            name: gameName || previousRecord.name || "PlayStation Game",
            platform: platform || previousRecord.platform || "PS5",
            npServiceName: opt.npServiceName,
            posterArt: safePoster,
            trophyTitleIconUrl: iconArt || previousRecord.trophyTitleIconUrl || safePoster,
            definedTrophies: definedTrophies || previousRecord.definedTrophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
            totalTrophies: metaRes?.trophies?.length || previousRecord.totalTrophies || 0,
            trophies: (metaRes?.trophies && metaRes.trophies.length > 0) ? metaRes.trophies.map(t => ({
                ...t,
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy",
                title: t.trophyName || "Unknown Trophy",
                description: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                detail: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                type: t.trophyType || "bronze",
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: t.trophyProgressTargetValue ? parseInt(t.trophyProgressTargetValue, 10) : 0,
                rarity: t.trophyRare !== undefined ? `${t.trophyRare}%` : "Rare",
                earnedRate: t.trophyEarnedRate || "0.0",
                hidden: !!t.trophyHidden
            })) : (previousRecord.trophies || []),
            groups: (groupsRes?.trophyGroups && groupsRes.trophyGroups.length > 0) ? groupsRes.trophyGroups.map(g => ({
                ...g,
                trophyGroupId: g.trophyGroupId,
                name: g.trophyGroupName || "Base Game",
                definedTrophies: g.definedTrophies || {}
            })) : (previousRecord.groups || []),
            rawSonyMetadata: (metaRes && metaRes.trophies) ? metaRes : (previousRecord.rawSonyMetadata || {}),
            lastUpdated: new Date().toISOString()
        };

        globalGames[commId] = skeletonData;
        await syncNodeToFirebase(`games/${commId}`, skeletonData);
        return skeletonData;
    } catch (err) {
        console.warn(`[SKELETON ERROR] Failed to ingest skeleton for ${commId}:`, err.message);
        return globalGames[commId] || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION: DEEP PS5 TROPHY PROGRESS SUBTREE INGESTION]
// ----------------------------------------------------------------------------
async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames, existingGameProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    try {
        let opt = { npServiceName: (platform === "PS5" || globalGames[commId]?.npServiceName === "trophy2") ? "trophy2" : "trophy" };
        
        let earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", opt).catch(() => ({}));
        let groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, commId, opt).catch(() => ({}));

        if (!earnedRes || !earnedRes.trophies || earnedRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altEarned = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", { npServiceName: altService }).catch(() => ({}));
            if (altEarned && altEarned.trophies && altEarned.trophies.length > 0) {
                opt.npServiceName = altService;
                earnedRes = altEarned;
                groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, commId, { npServiceName: altService }).catch(() => ({}));
            }
        }

        let earnedStatus = earnedRes?.trophies || [];
        
        if (earnedRes?.totalItemCount && earnedRes.totalItemCount > earnedStatus.length) {
            let earnedOffset = earnedStatus.length;
            while (earnedOffset < earnedRes.totalItemCount) {
                const moreEarned = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", { ...opt, offset: earnedOffset, limit: 100 }).catch(() => ({}));
                const nextBatch = moreEarned?.trophies || [];
                if (nextBatch.length === 0) break;
                earnedStatus.push(...nextBatch);
                earnedOffset += nextBatch.length;
            }
        }

        const activeSkeleton = globalGames[commId] || {};
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

            standaloneProgressMap[s.trophyId] = {
                ...s,
                trophyId: s.trophyId,
                gameTitle: titleName,
                commId: commId,
                name: skelTrophy?.name || "Trophy Objective",
                title: skelTrophy?.name || "Trophy Objective",
                detail: skelTrophy?.detail || "Objective detail",
                description: skelTrophy?.detail || "Objective detail",
                icon: skelTrophy?.icon || null,
                type: skelTrophy?.type || "bronze",
                rarity: skelTrophy?.rarity || "Rare",
                earnedRate: skelTrophy?.earnedRate || "0.0",
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
                subProgressRatio: progressRatio
            };

            if (s.earned) {
                earnedTrophiesList.push({
                    trophyId: s.trophyId,
                    gameTitle: titleName,
                    commId: commId,
                    name: skelTrophy?.name || "Unlocked Trophy",
                    icon: skelTrophy?.icon || null,
                    type: skelTrophy?.type || "bronze",
                    rarity: skelTrophy?.rarity || "Rare",
                    timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                    earnedDate: standaloneProgressMap[s.trophyId].earnedDate,
                    earnedAge: standaloneProgressMap[s.trophyId].earnedAge
                });
            }
        });

        return {
            standaloneProgressMap,
            earnedTrophiesList,
            groupEarnings: groupEarningsRes?.trophyGroups || []
        };
    } catch (e) {
        console.warn(`[SUBTREE WARN] Non-destructive preservation applied for ${commId}:`, e.message);
        return {
            standaloneProgressMap: existingGameProgress || {},
            earnedTrophiesList: [],
            groupEarnings: []
        };
    }
}

// ----------------------------------------------------------------------------
// [SECTION: COMPLETE SQUAD MEMBER DATA INGESTION]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    let resolvedTargetId = targetId || ACCOUNT_IDS[userKey];

    if (!auth || !resolvedTargetId) {
        return existingData || null;
    }

    try {
        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch (e) {}

        let region = { country: "US", language: "en" };
        if (auth.userKey === userKey) {
            try { region = await getUserRegion(auth, "me"); } catch (e) {}
        }

        let devices = [];
        if (auth.userKey === userKey) {
            try {
                const devRes = await getAccountDevices(auth);
                devices = devRes?.devices || devRes || [];
            } catch (e) {}
        }

        let shareableProfile = null;
        if (auth.userKey === userKey) {
            try { shareableProfile = await getProfileShareableLink(auth); } catch (e) {}
        }

        let friendsList = [];
        let blockedUsers = [];
        let friendRequests = [];
        try {
            const friendsRes = await getUserFriendsAccountIds(auth, resolvedTargetId).catch(() => ({}));
            friendsList = friendsRes?.friends || [];
        } catch (e) {}

        if (auth.userKey === userKey) {
            try {
                const blockedRes = await getUserBlockedAccountIds(auth).catch(() => ({}));
                blockedUsers = blockedRes?.blockedUsers || [];
            } catch (e) {}
            try {
                const reqRes = await getUserFriendsRequests(auth).catch(() => ({}));
                friendRequests = reqRes?.receivedRequests || [];
            } catch (e) {}
        }

        let purchasedGames = [];
        if (auth.userKey === userKey) {
            try {
                const pRes = await getPurchasedGames(auth, { limit: 100 }).catch(() => ({}));
                purchasedGames = pRes?.titles || [];
            } catch (e) {}
        }

        let sortedTitles = [];
        let totalGamesPlayedCount = 0;
        try {
            let offset = 0;
            const pageSize = 800;
            let keepFetching = true;

            while (keepFetching) {
                const pageRes = await getUserTitles(auth, resolvedTargetId, { limit: pageSize, offset }).catch(() => ({}));
                const titles = pageRes?.trophyTitles || [];
                sortedTitles.push(...titles);
                totalGamesPlayedCount = pageRes?.totalItemCount || sortedTitles.length;
                if (titles.length === 0 || sortedTitles.length >= totalGamesPlayedCount) {
                    keepFetching = false;
                } else {
                    offset += titles.length;
                }
            }
            sortedTitles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
        } catch (err) {}

        let telemetryData = [];
        try {
            if (auth.userKey === userKey) {
                const history = await getRecentlyPlayedGames(auth, { limit: 100 });
                telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
            } else {
                const playedRes = await getUserPlayedGames(auth, resolvedTargetId, { limit: 100 });
                telemetryData = playedRes?.titles || [];
            }
        } catch (e) {}

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

        // 1. Ingest telemetry
        telemetryData.forEach(g => {
            const commId = g.npCommunicationId;
            const titleId = g.titleId || g.npTitleId;
            if (!commId && !titleId) return;

            const parsedSeconds = parseIsoDuration(g.playDuration);
            const gameArt = resolveGamePosterArt([
                g.image?.url,
                g.imageUrl,
                g.conceptIconUrl,
                g.boxart,
                g.trophyTitleIconUrl
            ]);

            const gameRecord = {
                ...g,
                npCommunicationId: commId || null,
                npTitleId: titleId || null,
                titleId: titleId || null,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: gameArt,
                posterArt: gameArt,
                playCount: g.playCount || 1,
                playDuration: g.playDuration || null,
                nativePlaytimeSeconds: parsedSeconds,
                nativePlaytimeFormatted: formatDuration(parsedSeconds),
                nativePlaytimeHours: Math.round((parsedSeconds / 3600) * 10) / 10,
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            };

            if (commId) mergedGamesMap.set(commId, gameRecord);
            if (titleId) mergedGamesMap.set(titleId, gameRecord);
        });

        // 2. Ingest trophy catalog
        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            const titleId = t.npTitleId;
            if (!commId && !titleId) return;

            const existing = (commId && mergedGamesMap.get(commId)) || (titleId && mergedGamesMap.get(titleId)) || {
                npCommunicationId: commId || null,
                npTitleId: titleId || null,
                name: t.trophyTitleName || t.name || "Unknown Game",
                platform: normalizePlatform(t),
                art: null,
                posterArt: null,
                playCount: t.playCount || 1,
                lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
            };

            const fallbackArt = resolveGamePosterArt([
                existing.art,
                t.trophyTitleIconUrl,
                t.conceptIconUrl,
                t.imageUrl
            ]);

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

        let presenceTarget = (auth.userKey === userKey) ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: "offline" }, gameTitleInfoList: [] };

        try { 
            const raw = await getBasicPresence(auth, presenceTarget); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch (e) {
            if (presenceTarget !== "me") {
                try {
                    const retryRaw = await getBasicPresence(auth, "me");
                    rawP = retryRaw?.basicPresence || (Array.isArray(retryRaw) ? retryRaw[0] : (retryRaw?.basicPresences ? retryRaw.basicPresences[0] : retryRaw)) || rawP;
                } catch (err2) {}
            }
        }

        const isPlayerOnline = (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive;
        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId || null;
        let activeTitleId = activeGameInfo.npTitleId || null;
        
        let resolvedTitle = activeGameInfo.titleName || null;

        if (!resolvedTitle && twitchIntel?.isLive && twitchIntel.game) {
            resolvedTitle = twitchIntel.game;
        }
        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) {
            resolvedTitle = mergedGamesMap.get(activeCommId).name;
        }
        if (!resolvedTitle && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            resolvedTitle = mergedGamesMap.get(activeTitleId).name;
        }

        if (!resolvedTitle || resolvedTitle === "Dashboard") {
            if (allRecentGames.length > 0) {
                resolvedTitle = allRecentGames[0].name;
                activeCommId = activeCommId || allRecentGames[0].npCommunicationId;
                activeTitleId = activeTitleId || allRecentGames[0].npTitleId;
            } else {
                resolvedTitle = isPlayerOnline ? "Active PlayStation Game" : (existingData?.currentGame || "Dashboard");
            }
        }

        // Active Session Tracking
        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } = updateGameSessionTracking(
            existingData,
            activeCommId,
            resolvedTitle,
            isPlayerOnline,
            activeTitleId
        );

        // Pre-ingest skeletons
        for (const g of allRecentGames.slice(0, 20)) {
            const syncId = g.npCommunicationId || g.npTitleId;
            if (syncId && syncId !== "Dashboard") {
                await ensureGameSkeleton(
                    auth,
                    syncId,
                    g.name,
                    g.platform,
                    g.art,
                    g.trophyTitleIconUrl,
                    g.definedTrophies,
                    globalGames
                );
            }
        }

        const targetSyncId = (isPlayerOnline && (activeCommId || activeTitleId)) 
            ? (activeCommId || activeTitleId) 
            : (activeCommId || activeTitleId || allRecentGames[0]?.npCommunicationId || allRecentGames[0]?.npTitleId);
            
        const matchedGame = (targetSyncId && mergedGamesMap.get(targetSyncId)) || allRecentGames[0] || {};
        const currentPlatform = normalizePlatform(matchedGame);

        // Dynamic Poster Art Switching Engine
        const resolvedPoster = resolveGamePosterArt([
            matchedGame.art,
            matchedGame.trophyTitleIconUrl,
            (activeCommId && mergedGamesMap.get(activeCommId)?.art),
            (activeTitleId && mergedGamesMap.get(activeTitleId)?.art),
            twitchIntel?.gameArt,
            existingData?.currentGameArt
        ]);

        const resolvedPlaytimeFormatted = (currentGameDurationFormatted !== "0 hrs" && currentGameDurationFormatted !== "< 1 min")
            ? currentGameDurationFormatted 
            : (matchedGame.nativePlaytimeFormatted || existingData?.currentGameHours || "0 hrs");

        const numericHoursPlayed = matchedGame.nativePlaytimeHours || Math.round((activeSessionSeconds / 3600) * 10) / 10 || existingData?.currentGameNumericHours || 0;

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;
        
        // Multi-Game Trophy Vault Preservation: Merge newly fetched trees into existing library vault
        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
        const cumulativeUnlockedTrophies = [];

        // Titles to poll: active title plus the top 10 most recently played games
        const titlesToIngestProgress = [
            ...(targetSyncId ? [targetSyncId] : []),
            ...allRecentGames.slice(0, 10).map(g => g.npCommunicationId || g.npTitleId).filter(id => id && id !== targetSyncId)
        ];

        for (const cId of titlesToIngestProgress) {
            const gMeta = mergedGamesMap.get(cId) || globalGames[cId] || {};
            const gPlat = normalizePlatform(gMeta);
            const gName = gMeta.name || "PlayStation Title";
            
            const subtree = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, cId, gName, gPlat, globalGames, liveTrophyProgress[cId]);
            if (subtree && subtree.standaloneProgressMap) {
                liveTrophyProgress[cId] = subtree.standaloneProgressMap;
                
                if (subtree.earnedTrophiesList && subtree.earnedTrophiesList.length > 0) {
                    cumulativeUnlockedTrophies.push(...subtree.earnedTrophiesList);
                }

                if (cId === targetSyncId) {
                    const sortedEarned = [...subtree.earnedTrophiesList].sort((a, b) => a.timestamp - b.timestamp);
                    const earliestActiveTrophyTimestamp = sortedEarned.length > 0 ? sortedEarned[0].timestamp : null;

                    activeHunt = { 
                        npCommunicationId: targetSyncId, 
                        commId: targetSyncId,
                        titleId: activeTitleId || matchedGame.titleId || null,
                        title: matchedGame.name || resolvedTitle, 
                        platform: currentPlatform, 
                        art: resolvedPoster, 
                        hoursPlayed: resolvedPlaytimeFormatted, 
                        hoursFormatted: resolvedPlaytimeFormatted, 
                        numericHours: numericHoursPlayed, 
                        amazonAffiliateUrl: generateAffiliateUrl(matchedGame.name || resolvedTitle), 
                        progress: matchedGame.progress || 0, 
                        firstTrophyTimestamp: earliestActiveTrophyTimestamp,
                        firstTrophyDate: earliestActiveTrophyTimestamp ? new Date(earliestActiveTrophyTimestamp).toISOString() : null,
                        velocity: {
                            completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`,
                            ratio: matchedGame.completionRatio || "0%"
                        },
                        groupEarnings: subtree.groupEarnings
                    };
                }
            }
        }

        // Multi-Game Recent Trophy Aggregator: Sort all unlocked trophies across recent library games
        const preExistingRecent = existingData?.mostRecentTrophies || [];
        const mergedRecentMap = new Map();

        preExistingRecent.forEach(t => {
            if (t && t.trophyId) mergedRecentMap.set(`${t.commId || ''}_${t.trophyId}`, t);
        });
        cumulativeUnlockedTrophies.forEach(t => {
            if (t && t.trophyId) mergedRecentMap.set(`${t.commId || ''}_${t.trophyId}`, t);
        });

        const unifiedMostRecentTrophies = Array.from(mergedRecentMap.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 25);

        const presence = {
            online: isPlayerOnline,
            currentGame: resolvedTitle,
            currentGameArt: resolvedPoster,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: activeCommId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            currentGameHours: resolvedPlaytimeFormatted,
            currentGameNumericHours: numericHoursPlayed,
            twitch: twitchIntel,
            rawPresence: rawP
        };

        return {
            onlineId: gamerTag, 
            accountId: resolvedTargetId,
            npssoValid: true,
            npssoStatus: "ACTIVE",
            handshakeText: `${gamerTag.toUpperCase()} HANDSHAKE: FIREBASE LIVE`,
            handshakeState: "LIVE",
            avatar: profile?.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || existingData?.avatar || "", 
            allAvatars: profile?.avatars || existingData?.allAvatars || [],
            bio: twitchIntel?.bio || profile?.aboutMe || existingData?.bio || "Official Pack Member Profile", 
            plus: !!profile?.isPlus,
            region: region?.country || "US",
            language: region?.language || "en",
            rawProfile: profile || existingData?.rawProfile || {},
            devices: devices,
            shareableProfile: shareableProfile,
            friendsList: friendsList,
            blockedUsers: blockedUsers,
            friendRequests: friendRequests,
            purchasedGames: purchasedGames,
            ...presence, 
            gamesPlayed: totalGamesPlayedCount || existingData?.gamesPlayed || 0,
            psnAccountAge: calculateAgeString(earliestEntry), 
            earliestTrophyDate: earliestEntry,
            latestTrophyDate: unifiedMostRecentTrophies[0]?.timestamp || new Date().getTime(),
            level: stats?.trophyLevel || existingData?.level || 0, 
            playSessions: playSessions,
            liveTrophyProgress: liveTrophyProgress,
            trophySummary: { 
                ...stats,
                platinum: stats?.earnedTrophies?.platinum ?? existingData?.trophySummary?.platinum ?? 0, 
                gold: stats?.earnedTrophies?.gold ?? existingData?.trophySummary?.gold ?? 0, 
                silver: stats?.earnedTrophies?.silver ?? existingData?.trophySummary?.silver ?? 0, 
                bronze: stats?.earnedTrophies?.bronze ?? existingData?.trophySummary?.bronze ?? 0, 
                total: ((stats?.earnedTrophies?.platinum || 0) + (stats?.earnedTrophies?.gold || 0) + (stats?.earnedTrophies?.silver || 0) + (stats?.earnedTrophies?.bronze || 0)) || existingData?.trophySummary?.total || 0, 
                trophyLevel: stats?.trophyLevel || existingData?.level || 0,
                progress: stats?.progress || existingData?.trophySummary?.progress || 0,
                tier: stats?.tier || 0
            },
            recentGames: allRecentGames.length > 0 ? allRecentGames : (existingData?.recentGames || []),
            activeHunt: activeHunt || existingData?.activeHunt || null, 
            mostRecentTrophies: unifiedMostRecentTrophies, 
            streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) { 
        console.error(`[TELEMETRY CRITICAL ERROR] For ${gamerTag}: ${e.message}`);
        return existingData || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION: SQUAD LEADERBOARDS & SOCIAL OVERLAP]
// ----------------------------------------------------------------------------
function buildSquadIntelligence(allGamertagsData) {
    const players = Object.values(allGamertagsData || {});
    if (players.length === 0) return { leaderboard: [], squadTotals: {}, socialOverlap: {} };

    const leaderboard = players.map(p => ({
        onlineId: p.onlineId,
        level: p.level || 0,
        platinum: p.trophySummary?.platinum || 0,
        gold: p.trophySummary?.gold || 0,
        silver: p.trophySummary?.silver || 0,
        bronze: p.trophySummary?.bronze || 0,
        totalTrophies: p.trophySummary?.total || 0,
        gamesPlayed: p.gamesPlayed || 0,
        isOnline: !!p.online,
        currentGame: p.currentGame || "Dashboard"
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
        socialOverlap[p.onlineId] = {};
        players.forEach(other => {
            if (p.onlineId !== other.onlineId) {
                const otherFriends = other.friendsList || [];
                const mutuals = otherFriends.filter(fId => myFriends.has(fId));
                socialOverlap[p.onlineId][other.onlineId] = {
                    mutualCount: mutuals.length,
                    sharedFriendAccountIds: mutuals
                };
            }
        });
    });

    return { leaderboard, squadTotals, socialOverlap };
}

// ----------------------------------------------------------------------------
// [SECTION: FIREBASE NETWORK & LOCAL FILE SYNCHRONIZATION]
// ----------------------------------------------------------------------------
async function fetchFromFirebase() {
    try {
        const response = await resilientFetch(`${FIREBASE_BASE_URL}.json`);
        if (!response || !response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) { 
        console.warn(`[FIREBASE READ ERROR] ${err.message}`);
        return {}; 
    }
}

async function syncNodeToFirebase(endpointPath, payload) {
    const targetUrl = `${FIREBASE_BASE_URL}/${endpointPath}.json`;
    try {
        const res = await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res && !res.ok) {
            console.error(`[FIREBASE WRITE ERROR] Failed ${endpointPath}: HTTP ${res.status}`);
        }
    } catch (err) { 
        console.error(`[FIREBASE WRITE ERROR] Failed ${endpointPath}: ${err.message}`);
    }
}

function writeLocalFile(payload) {
    [LOCAL_JSON_PATH, ROOT_LOCAL_JSON_PATH].forEach(filePath => {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
        } catch (err) {}
    });
}

// ----------------------------------------------------------------------------
// [SECTION: MASTER EXECUTION]
// ----------------------------------------------------------------------------
async function main() {
    try {
        console.log("[INIT] Starting Squad Pack Sync Engine v47.0.0 (Direct-To-Database Independent Sync)...");

        await loadPersistentTokens();

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        const sessionState = await resolveMasterSession(
            process.env.PSN_NPSSO_WEREWOLF,
            process.env.PSN_NPSSO_RAY
        );

        const { masterAuth, wolfAuth, rayAuth, failoverState } = sessionState;

        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = failoverState === "FAILOVER_RAY" 
            ? "RUNNING ON BACKUP (Ray Active)" 
            : (failoverState === "PRIMARY_WOLF" ? "PRIMARY HEALTHY (Werewolf Running)" : "READ-ONLY SNAPSHOT MODE");

        console.log("[GATEKEEPER] Running lightweight presence probe...");
        let anyoneOnline = false;
        let pendingSessionClosing = false;

        for (const [key, gamerTag] of Object.entries(SQUAD_GAMERTAGS)) {
            const targetId = ACCOUNT_IDS[key];
            let isOnline = false;

            if (masterAuth) {
                try {
                    const targetScope = (masterAuth.userKey === key) ? "me" : targetId;
                    const pRaw = await getBasicPresence(masterAuth, targetScope);
                    const onlineStatus = pRaw?.basicPresence?.primaryPlatformInfo?.onlineStatus || 
                                         pRaw?.primaryPlatformInfo?.onlineStatus || "offline";
                    isOnline = (onlineStatus !== "offline");
                } catch (e) {}
            }

            const twitchIntel = await getTwitchIntel(TWITCH_MAP[key]);
            if (twitchIntel?.isLive) isOnline = true;

            if (isOnline) anyoneOnline = true;

            const prevUser = previousFirebaseData?.gamertags?.[gamerTag];
            const hasOpenSession = Object.values(prevUser?.playSessions || {}).some(s => s.isActive);
            if (hasOpenSession && !isOnline) {
                pendingSessionClosing = true;
                console.log(`[GATEKEEPER] ${gamerTag} has an unfinalized session requiring logout transition.`);
            }
        }

        if (!anyoneOnline && !pendingSessionClosing) {
            console.log("[GATEKEEPER] Entire squad is idle and all sessions are finalized. Exiting to conserve usage.");
            diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
            await syncNodeToFirebase("authDiagnostics", diagnosticReport);
            process.exit(0);
        }

        console.log("[GATEKEEPER] Activity detected. Running synchronization pass...");

        let finalData = { 
            gamertags: previousFirebaseData.gamertags || {}, 
            games: globalGames, 
            squadLeaderboard: [],
            squadAnalytics: {},
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            engineVersion: "47.0.0",
            analyticsTag: GA4_MEASUREMENT_ID,
            codeTimestamp: "Sunday, September 20, 2026 | 17:15 EDT"
        };

        for (const [key, gamerTag] of Object.entries(SQUAD_GAMERTAGS)) {
            const accountId = ACCOUNT_IDS[key];
            let agentAuth = masterAuth;
            if (key === "wildhorse_spirit" && wolfAuth) agentAuth = wolfAuth;
            if (key === "ray" && rayAuth) agentAuth = rayAuth;
            
            console.log(`[INGESTION] Syncing ${gamerTag} via ${agentAuth ? agentAuth.userKey.toUpperCase() : "SNAPSHOT"}...`);
            const data = await getFullUserData(agentAuth, gamerTag, key, accountId, finalData.gamertags[gamerTag], true, globalGames);
            if (data) {
                finalData.gamertags[gamerTag] = data;
                await syncNodeToFirebase(`gamertags/${gamerTag}`, data);
                
                if (data.currentGameArt) {
                    await syncNodeToFirebase(`gamertags/${gamerTag}/currentGameArt`, data.currentGameArt);
                }
            }
        }

        const squadIntel = buildSquadIntelligence(finalData.gamertags);
        finalData.squadLeaderboard = squadIntel.leaderboard;
        finalData.squadAnalytics = {
            totals: squadIntel.squadTotals,
            socialOverlap: squadIntel.socialOverlap,
            calculatedAt: new Date().toISOString()
        };

        await syncNodeToFirebase("leaderboard", finalData.squadLeaderboard);
        await syncNodeToFirebase("squadAnalytics", finalData.squadAnalytics);
        await syncNodeToFirebase("authDiagnostics", finalData.authDiagnostics);
        await syncNodeToFirebase("lastGlobalUpdate", finalData.lastGlobalUpdate);

        writeLocalFile(finalData);

        console.log(`[SUCCESS] PSN Engine v47.0.0 successfully synced directly to Firebase.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Execution failed: ${criticalError.message}`);
        process.exit(1);
    }
}

main();
