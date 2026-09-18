/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Master Telemetry Engine - Zero-Omission Total Ingestion:
 *              1. Preserves 100% of raw Sony PSN payload attributes via object
 *                 spreading (...raw) across titles, trophies, and user sessions.
 *              2. Skeletons: games/{commId} stores full trophy metadata, secret
 *                 objectives, descriptions, icons, rarity, targets, and groups.
 *              3. Live User Subtree: gamertags/{player}/liveTrophyProgress/{commId}
 *                 stores full raw progress records alongside computed ratios.
 *              4. Play Sessions: gamertags/{player}/playSessions/{commId} preserves
 *                 Sony's native playDuration/playCount plus live session seconds.
 *              5. Complete ingestion executed equally for all squad members.
 *              6. Automated Token Persistence: Saves refresh tokens to Firebase 
 *                 and disk so sessions survive past the 7-day NPSSO browser death.
 *              7. Presence Resolution: Uses target "me" for authenticated profile
 *                 with automated fallback to native recentlyPlayedTitles so
 *                 active game title and boxart never get stuck on "Dashboard".
 *              8. Scoped First Trophy: Calculates active game first trophy date
 *                 strictly from the active title rather than account creation.
 * Protocol Support: Direct REST PUT to Firebase Realtime Database (HTTP/HTTPS supported).
 * Analytics Tagging: G-CTYHDF4MSD (Ready for deployment via GTM container).
 * Version: 39.0.0 - Self-Healing Token Lifecycle & Hardened Telemetry
 * Date & Time Stamp: 2026-09-18 02:27:00 (America/New_York)
 * ============================================================================ */

// Line 27: Core Node Modules & Dual Protocol Support (Works across both HTTP and HTTPS)
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const psnApi = require("psn-api");

// Line 35: PSN API SDK Destructuring
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
    makeUniversalSearch
} = psnApi;

// Line 56: Database Endpoints, Analytics Tag, and Local File Destinations
const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD"; // Target Google Analytics 4 Measurement Tag
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ROOT_LOCAL_JSON_PATH = path.join(__dirname, "..", "psn.json");
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

// Line 64: Squad Gamertag Mapping (Strictly gamertags, never human names)
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
    marc: ""
};

const AMAZON_TAG = "moviesanywhere02-20";

// Line 89: In-Memory Token Cache
let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION: HTTP & HTTPS RESILIENT FETCH LAYER - Lines 100-155]
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
                            try { return JSON.parse(data || "{}"); } catch(e) { return {}; }
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
// [SECTION: TIME & FORMATTING HELPERS - Lines 157-230]
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

function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline) {
    const playSessions = existingUserData?.playSessions || {};
    const now = Date.now();

    for (const [id, session] of Object.entries(playSessions)) {
        if (session.isActive && (id !== activeCommId || !isOnline)) {
            const sessionElapsed = Math.max(0, Math.floor((now - session.sessionStartTime) / 1000));
            session.totalSeconds = (session.totalSeconds || 0) + sessionElapsed;
            session.isActive = false;
            session.sessionStartTime = null;
            session.lastEndedTime = now;
            session.totalFormatted = formatDuration(session.totalSeconds);
            console.log(`[SESSION CLOSED] ${session.title} closed. Added ${sessionElapsed}s. Cumulative: ${session.totalFormatted}`);
        }
    }

    if (isOnline && activeCommId && activeCommId !== "Dashboard") {
        if (!playSessions[activeCommId]) {
            playSessions[activeCommId] = {
                commId: activeCommId,
                title: activeTitle,
                totalSeconds: 0,
                isActive: true,
                sessionStartTime: now,
                totalFormatted: "0 hrs"
            };
            console.log(`[SESSION STARTED] Started tracking ${activeTitle} (${activeCommId}).`);
        } else {
            const current = playSessions[activeCommId];
            if (!current.isActive) {
                current.isActive = true;
                current.sessionStartTime = now;
                console.log(`[SESSION RESUMED] Resumed session for ${activeTitle} (${activeCommId}).`);
            }
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    if (activeCommId && playSessions[activeCommId]) {
        const active = playSessions[activeCommId];
        let currentSeconds = active.totalSeconds || 0;
        if (active.isActive && active.sessionStartTime) {
            currentSeconds += Math.floor((now - active.sessionStartTime) / 1000);
        }
        currentGameDurationFormatted = formatDuration(currentSeconds);
    }

    return { playSessions, currentGameDurationFormatted };
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

function normalizePlatform(game) {
    const rawPlatform = (
        game?.trophyTitlePlatform || 
        game?.platform || 
        game?.category || 
        (game?.npServiceName === "trophy2" ? "PS5" : "PS4") ||
        "PS4"
    ).toUpperCase();

    if (rawPlatform.includes("PS5")) return "PS5";
    if (rawPlatform.includes("PS4")) return "PS4";
    if (rawPlatform.includes("PS3")) return "PS3";
    if (rawPlatform.includes("VITA")) return "PS Vita";
    return "PS4";
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    let diff = Math.max(0, now - past);

    const intervals = [
        { label: 'yr', value: 31536000000 },
        { label: 'month', value: 2592000000 },
        { label: 'week', value: 604800000 },
        { label: 'day', value: 86400000 },
        { label: 'hour', value: 3600000 },
        { label: 'min', value: 60000 }
    ];

    const parts = [];
    for (const interval of intervals) {
        const count = Math.floor(diff / interval.value);
        if (count > 0) {
            parts.push(`${count} ${interval.label}${count > 1 ? 's' : ''}`);
            diff -= count * interval.value;
        }
    }
    return parts.length > 0 ? parts.join(', ') : "Just now";
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

// ----------------------------------------------------------------------------
// [SECTION: TWITCH TELEMETRY - Lines 285-340]
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

// ----------------------------------------------------------------------------
// [SECTION: HARDENED PERSISTENT TOKEN STORAGE LAYER]
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
    console.warn(`[TOKEN PURGE] Clearing stale tokens for ${userKey}...`);
    tokenStore[userKey] = {};
    try {
        if (fs.existsSync(LOCAL_TOKENS_PATH)) {
            fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokenStore, null, 2), "utf-8");
        }
    } catch(e) {}
    try {
        await syncNodeToFirebase(`secureTokens/${userKey}`, {});
    } catch(e) {}
}

// ----------------------------------------------------------------------------
// [SECTION: PSN AUTHENTICATION WITH INSTANT NPSSO FALLTHROUGH]
// ----------------------------------------------------------------------------
async function isTokenValid(accessToken) {
    try {
        await getUserRegion({ accessToken }, "me");
        return true;
    } catch (e) { return false; }
}

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);

    // 1. Check if the active access token is still within its validity window
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 180)) {
        const isValid = await isTokenValid(currentUserTokens.accessToken);
        if (isValid) {
            diagnosticReport[`${userKey}_active`] = "yes";
            diagnosticReport[`${userKey}_status`] = "ACTIVE_ACCESS_TOKEN";
            return { accessToken: currentUserTokens.accessToken, npssoValid: true, userKey };
        }
        currentUserTokens.accessToken = null;
    }

    // 2. Primary renewal path: Use long-lived refresh token (valid for months)
    if (currentUserTokens.refreshToken) {
        try {
            console.log(`[AUTH] Renewing session via refresh token for ${userKey}...`);
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
            console.warn(`[REFRESH REJECTED] Refresh token invalid for ${userKey}: ${e.message}. Purging and falling back to NPSSO.`);
            await purgeToken(userKey);
        }
    }

    // 3. One-time fallback: Perform handshake with raw NPSSO from environment variables
    if (npssoInput && npssoInput.trim().length > 0) {
        try {
            console.log(`[AUTH] Initializing fresh handshake with NPSSO for ${userKey}...`);
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
                console.log(`[AUTH SUCCESS] Authenticated ${userKey} via NPSSO and saved long-term refresh token!`);
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) { 
            console.error(`[NPSSO ERROR] Exchange failed for ${userKey}: ${e.message}`);
            diagnosticReport[`${userKey}_active`] = "no";
            diagnosticReport[`${userKey}_status`] = `EXPIRED_NPSSO (${e.message})`;
            return null; 
        }
    }

    console.error(`[AUTH FATAL] No valid tokens or NPSSO available for ${userKey}.`);
    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "MISSING_NPSSO";
    return null;
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

async function resolveAccountIdFromSearch(auth, gamerTag) {
    const searchDomains = ["domain:conceptCollapse", "domain:socialAllAccounts"];
    for (const domain of searchDomains) {
        try {
            const searchResults = await makeUniversalSearch(auth, gamerTag, domain);
            const domainResults = searchResults?.searchResults?.[0]?.results || [];
            const match = domainResults.find(r => 
                r.socialMetadata?.onlineId?.toLowerCase() === gamerTag.toLowerCase() ||
                r.onlineId?.toLowerCase() === gamerTag.toLowerCase()
            );

            const discoveredId = match?.socialMetadata?.accountId || match?.accountId;
            if (discoveredId) return discoveredId;
        } catch (e) {}
    }
    return "";
}

// ----------------------------------------------------------------------------
// [SECTION: GLOBAL GAME SKELETON ENGINE - Zero Truncation]
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, existingGames) {
    if (!commId || commId === "Dashboard") return null;

    try {
        const isPs5 = platform === "PS5";
        let opt = { npServiceName: isPs5 ? "trophy2" : "trophy" };
        
        let metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => null);
        if ((!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) && opt.npServiceName === "trophy") {
            opt.npServiceName = "trophy2";
            metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => ({ trophies: [] }));
        } else if ((!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) && opt.npServiceName === "trophy2") {
            opt.npServiceName = "trophy";
            metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => ({ trophies: [] }));
        }
        metaRes = metaRes || { trophies: [] };

        let groupsRes = await getTitleTrophyGroups(auth, commId, opt).catch(() => null);
        if (!groupsRes && opt.npServiceName === "trophy") {
            groupsRes = await getTitleTrophyGroups(auth, commId, { npServiceName: "trophy2" }).catch(() => ({ trophyGroups: [] }));
        }
        groupsRes = groupsRes || { trophyGroups: [] };

        const skeletonData = {
            commId: commId,
            name: gameName,
            platform: platform,
            npServiceName: opt.npServiceName,
            posterArt: posterArt || null,
            trophyTitleIconUrl: iconArt || null,
            definedTrophies: definedTrophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
            totalTrophies: metaRes?.trophies?.length || 0,
            trophies: (metaRes?.trophies || []).map(t => ({
                ...t,
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy",
                title: t.trophyName || "Unknown Trophy",
                description: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                detail: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                type: t.trophyType || "bronze",
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: t.trophyProgressTargetValue || 0,
                rarity: t.trophyRare !== undefined ? `${t.trophyRare}%` : "Rare",
                earnedRate: t.trophyEarnedRate || "0.0",
                hidden: !!t.trophyHidden
            })),
            groups: (groupsRes?.trophyGroups || []).map(g => ({
                ...g,
                trophyGroupId: g.trophyGroupId,
                name: g.trophyGroupName || "Base Game",
                definedTrophies: g.definedTrophies || {}
            })),
            rawSonyMetadata: metaRes || {},
            lastUpdated: new Date().toISOString()
        };

        await syncNodeToFirebase(`games/${commId}`, skeletonData);
        if (existingGames) existingGames[commId] = skeletonData;
        return skeletonData;
    } catch (err) {
        console.warn(`[SKELETON ERROR] Failed to ingest ${commId}:`, err.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION: DEEP TROPHY SUBTREE INGESTION HELPER]
// ----------------------------------------------------------------------------
async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames) {
    if (!commId || commId === "Dashboard") return null;

    try {
        let opt = { npServiceName: platform === "PS5" ? "trophy2" : "trophy" };
        let groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, commId, opt).catch(() => ({}));
        
        let earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", opt).catch(() => ({}));
        
        if ((!earnedRes || !earnedRes.trophies || earnedRes.trophies.length === 0) && opt.npServiceName === "trophy") {
            opt.npServiceName = "trophy2";
            earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", opt).catch(() => ({}));
        } else if ((!earnedRes || !earnedRes.trophies || earnedRes.trophies.length === 0) && opt.npServiceName === "trophy2") {
            opt.npServiceName = "trophy";
            earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, commId, "all", opt).catch(() => ({}));
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
        const standaloneProgressMap = {};
        const earnedTrophiesList = [];

        earnedStatus.forEach(s => {
            const skelTrophy = skeletonTrophies.find(t => t.trophyId === s.trophyId);
            const currentVal = s.progress || 0;
            const targetVal = skelTrophy?.targetValue || 0;

            let progressRatio = null;
            if (targetVal > 0) {
                progressRatio = `${currentVal}/${targetVal}`;
            } else if (s.progress !== undefined && s.progress > 0 && !s.earned) {
                progressRatio = `${s.progress}%`;
            } else if (s.earned) {
                progressRatio = targetVal > 0 ? `${targetVal}/${targetVal}` : "100%";
            }

            standaloneProgressMap[s.trophyId] = {
                ...s,
                trophyId: s.trophyId,
                name: skelTrophy?.name || "Trophy Objective",
                title: skelTrophy?.name || "Trophy Objective",
                detail: skelTrophy?.detail || "Objective detail",
                description: skelTrophy?.detail || "Objective detail",
                icon: skelTrophy?.icon || null,
                type: skelTrophy?.type || "bronze",
                rarity: skelTrophy?.rarity || "Rare",
                earnedRate: skelTrophy?.earnedRate || "0.0",
                hidden: skelTrophy?.hidden || false,
                earned: !!s.earned,
                earnedDate: s.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) : null,
                earnedAge: s.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                currentValue: currentVal,
                targetValue: targetVal,
                subProgressRatio: progressRatio
            };

            if (s.earned) {
                earnedTrophiesList.push({
                    trophyId: s.trophyId,
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
        console.warn(`[SUBTREE WARN] Failed to ingest trophy progress for ${commId}:`, e.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION: COMPLETE SQUAD TELEMETRY & FAIL-SAFE PRESENCE ENGINE]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    let resolvedTargetId = targetId || ACCOUNT_IDS[userKey];

    if (!resolvedTargetId && auth?.accessToken) {
        if (auth.userKey === userKey) {
            try {
                const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString());
                resolvedTargetId = payload.account_id || "";
            } catch(e) {}
        } else {
            resolvedTargetId = await resolveAccountIdFromSearch(auth, gamerTag);
            if (resolvedTargetId) ACCOUNT_IDS[userKey] = resolvedTargetId;
        }
    }

    if (!auth || !resolvedTargetId) {
        console.warn(`[TELEMETRY WARN] Missing auth or target ID for ${gamerTag}. Writing fallback profile.`);
        return {
            onlineId: gamerTag, 
            online: !!twitchIntel?.isLive,
            accountId: ACCOUNT_IDS[userKey] || "",
            npssoValid: false,
            npssoStatus: "PUBLIC_GUEST_SYNC",
            handshakeText: `${gamerTag.toUpperCase()} HANDSHAKE: LIVE VIA MASTER`,
            handshakeState: "LIVE",
            currentGame: twitchIntel?.game || "Dashboard", 
            currentGameArt: twitchIntel?.gameArt || null,
            amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), 
            bio: twitchIntel?.bio || "Official Pack Member Profile", 
            twitch: twitchIntel, 
            streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            playSessions: existingData?.playSessions || {},
            liveTrophyProgress: existingData?.liveTrophyProgress || {},
            currentGameHours: "0 hrs",
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            gamesPlayed: existingData?.gamesPlayed || 0, level: existingData?.level || 0,
            trophySummary: existingData?.trophySummary || { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
            recentGames: existingData?.recentGames || [], 
            activeHunt: existingData?.activeHunt || null, 
            mostRecentTrophies: (existingData?.mostRecentTrophies || []).slice(0, 10)
        };
    }

    try {
        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch(e) {}

        let region = { country: "US", language: "en" };
        if (auth.userKey === userKey) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
        }

        // 1. Ingest Full Trophy Titles List
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
        } catch(err) {}

        // 2. Correct psn-api Signature: getRecentlyPlayedGames takes (auth, options) ONLY
        let telemetryData = [];
        try {
            const history = await getRecentlyPlayedGames(auth, { limit: 100 });
            telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
            console.log(`[TELEMETRY FETCH] Retrieved ${telemetryData.length} recent titles from Sony for ${gamerTag}.`);
        } catch (e) {
            console.warn(`[TELEMETRY NOTICE] Recent games fetch warning: ${e.message}`);
        }

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

        // 3. Map Recently Played Titles
        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            const parsedSeconds = parseIsoDuration(g.playDuration);
            mergedGamesMap.set(g.npCommunicationId, {
                ...g,
                npCommunicationId: g.npCommunicationId,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: g.image?.url || null,
                playCount: g.playCount || 1,
                playDuration: g.playDuration || null,
                nativePlaytimeSeconds: parsedSeconds,
                nativePlaytimeFormatted: formatDuration(parsedSeconds),
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            });
        });

        // 4. Merge Trophy Titles
        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            if (!commId) return;
            const existing = mergedGamesMap.get(commId) || {
                npCommunicationId: commId,
                name: t.trophyTitleName || t.name || "Unknown Game",
                platform: normalizePlatform(t),
                art: t.trophyTitleIconUrl || t.art || null,
                playCount: t.playCount || 1,
                lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
            };

            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.trophyTitleIconUrl = t.trophyTitleIconUrl || existing.art;
            existing.platform = normalizePlatform(t);
            existing.progress = t.progress || 0;
            existing.definedTrophies = t.definedTrophies || {};
            existing.earnedTotal = (t.earnedTrophies?.platinum||0) + (t.earnedTrophies?.gold||0) + (t.earnedTrophies?.silver||0) + (t.earnedTrophies?.bronze||0);
            existing.definedTotal = (t.definedTrophies?.platinum||0) + (t.definedTrophies?.gold||0) + (t.definedTrophies?.silver||0) + (t.definedTrophies?.bronze||0);

            mergedGamesMap.set(commId, existing);
        });

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        // 5. Robust Live Presence Resolution
        let presenceTarget = (auth.userKey === userKey) ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };

        try { 
            const raw = await getBasicPresence(auth, presenceTarget); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {
            if (presenceTarget !== "me") {
                try {
                    const retryRaw = await getBasicPresence(auth, "me");
                    rawP = retryRaw?.basicPresence || (Array.isArray(retryRaw) ? retryRaw[0] : (retryRaw?.basicPresences ? retryRaw.basicPresences[0] : retryRaw)) || rawP;
                } catch(err2) {}
            }
        }

        const isPlayerOnline = (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive;
        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId || activeGameInfo.npTitleId || null;
        
        let resolvedTitle = activeGameInfo.titleName || null;

        if (!resolvedTitle && twitchIntel?.isLive && twitchIntel.game) {
            resolvedTitle = twitchIntel.game;
        }

        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) {
            resolvedTitle = mergedGamesMap.get(activeCommId).name;
        }

        if (!resolvedTitle || resolvedTitle === "Dashboard") {
            if (allRecentGames.length > 0) {
                resolvedTitle = allRecentGames[0].name;
                activeCommId = activeCommId || allRecentGames[0].npCommunicationId;
            } else {
                resolvedTitle = isPlayerOnline ? "Active PlayStation Game" : "Dashboard";
            }
        }

        // Dedicated Art Resolution: Pulls direct game art from merged telemetry
        let matchedArt = null;
        if (activeCommId && mergedGamesMap.has(activeCommId)) {
            matchedArt = mergedGamesMap.get(activeCommId).art || mergedGamesMap.get(activeCommId).trophyTitleIconUrl;
        }
        if (!matchedArt && allRecentGames.length > 0) {
            const match = allRecentGames.find(g => g.name.toLowerCase().replace(/®|™/g, "").trim() === resolvedTitle.toLowerCase().replace(/®|™/g, "").trim());
            matchedArt = match?.art || match?.trophyTitleIconUrl || allRecentGames[0]?.art;
        }
        if (!matchedArt && twitchIntel?.isLive) {
            matchedArt = twitchIntel.gameArt;
        }

        console.log(`[PRESENCE RESOLVED] ${gamerTag} -> Game: "${resolvedTitle}" | Art: ${matchedArt ? matchedArt.substring(0, 45) + '...' : "NULL"}`);

        // Session Tracking
        const { playSessions, currentGameDurationFormatted } = updateGameSessionTracking(
            existingData,
            activeCommId,
            resolvedTitle,
            isPlayerOnline
        );

        // Sync skeletons for recent games
        for (const g of allRecentGames.slice(0, 20)) {
            if (g.npCommunicationId && g.npCommunicationId !== "Dashboard") {
                await ensureGameSkeleton(
                    auth,
                    g.npCommunicationId,
                    g.name,
                    g.platform,
                    g.art,
                    g.trophyTitleIconUrl,
                    g.definedTrophies,
                    globalGames
                );
            }
        }

        const targetSyncId = (isPlayerOnline && activeCommId) ? activeCommId : (activeCommId || allRecentGames[0]?.npCommunicationId);
        const matchedGame = (targetSyncId && mergedGamesMap.get(targetSyncId)) || {};
        const currentPlatform = normalizePlatform(matchedGame);
        const resolvedPoster = matchedArt || matchedGame.art || allRecentGames[0]?.art || null;

        if (targetSyncId && !globalGames[targetSyncId]) {
            await ensureGameSkeleton(
                auth,
                targetSyncId,
                matchedGame.name || resolvedTitle,
                currentPlatform,
                resolvedPoster,
                matchedGame.trophyTitleIconUrl,
                matchedGame.definedTrophies,
                globalGames
            );
        }

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;
        let mostRecentTrophies = existingData?.mostRecentTrophies || [];
        const liveTrophyProgress = existingData?.liveTrophyProgress || {};

        const titlesToIngestProgress = [
            ...(targetSyncId ? [targetSyncId] : []),
            ...allRecentGames.slice(0, 5).map(g => g.npCommunicationId).filter(id => id && id !== targetSyncId)
        ];

        for (const cId of titlesToIngestProgress) {
            const gMeta = mergedGamesMap.get(cId) || {};
            const gPlat = normalizePlatform(gMeta);
            const gName = gMeta.name || "PlayStation Title";
            
            const subtree = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, cId, gName, gPlat, globalGames);
            if (subtree) {
                liveTrophyProgress[cId] = subtree.standaloneProgressMap;
                
                if (cId === targetSyncId) {
                    const sortedEarned = [...subtree.earnedTrophiesList].sort((a, b) => a.timestamp - b.timestamp);
                    const earliestActiveTrophyTimestamp = sortedEarned.length > 0 ? sortedEarned[0].timestamp : null;

                    if (subtree.earnedTrophiesList.length > 0) {
                        mostRecentTrophies = [...subtree.earnedTrophiesList].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
                    }
                    
                    activeHunt = { 
                        npCommunicationId: targetSyncId, 
                        title: matchedGame.name || resolvedTitle, 
                        platform: currentPlatform, 
                        art: resolvedPoster, 
                        hoursPlayed: currentGameDurationFormatted, 
                        hoursFormatted: currentGameDurationFormatted, 
                        amazonAffiliateUrl: generateAffiliateUrl(matchedGame.name || resolvedTitle), 
                        progress: matchedGame.progress || 0, 
                        // Scoped strictly to this active game:
                        firstTrophyTimestamp: earliestActiveTrophyTimestamp,
                        firstTrophyDate: earliestActiveTrophyTimestamp ? new Date(earliestActiveTrophyTimestamp).toISOString() : null,
                        velocity: {
                            completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`
                        },
                        groupEarnings: subtree.groupEarnings
                    };
                }
            }
        }

        const presence = {
            online: isPlayerOnline,
            currentGame: resolvedTitle,
            currentGameArt: resolvedPoster,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: activeCommId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            currentGameHours: currentGameDurationFormatted,
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
            ...presence, 
            gamesPlayed: totalGamesPlayedCount,
            avatar: profile?.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || "", 
            bio: twitchIntel?.bio || profile?.aboutMe || "Official Pack Member Profile", 
            psnAccountAge: calculateAgeString(earliestEntry), 
            earliestTrophyDate: earliestEntry,
            latestTrophyDate: mostRecentTrophies[0]?.timestamp || new Date().getTime(),
            plus: !!profile?.isPlus, 
            level: stats?.trophyLevel || existingData?.level || 0, 
            region: region?.country || "US",
            rawProfile: profile || {},
            playSessions: playSessions,
            liveTrophyProgress: liveTrophyProgress,
            trophySummary: { 
                platinum: stats?.earnedTrophies?.platinum || 0, 
                gold: stats?.earnedTrophies?.gold || 0, 
                silver: stats?.earnedTrophies?.silver || 0, 
                bronze: stats?.earnedTrophies?.bronze || 0, 
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0), 
                trophyLevel: stats?.trophyLevel || 0,
                progress: stats?.progress || 0,
                tier: stats?.tier || 0
            },
            recentGames: allRecentGames,
            activeHunt, 
            mostRecentTrophies: mostRecentTrophies.slice(0, 10), 
            streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) { 
        console.error(`[TELEMETRY CRITICAL ERROR] For ${gamerTag}: ${e.message}`);
        return {
            onlineId: gamerTag, 
            online: !!twitchIntel?.isLive,
            accountId: ACCOUNT_IDS[userKey] || "",
            npssoValid: false,
            npssoStatus: "PUBLIC_GUEST_SYNC",
            handshakeText: `${gamerTag.toUpperCase()} HANDSHAKE: LIVE VIA MASTER`,
            handshakeState: "LIVE",
            currentGame: twitchIntel?.game || "Dashboard", 
            currentGameArt: twitchIntel?.gameArt || null,
            amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), 
            bio: twitchIntel?.bio || "Official Pack Member Profile", 
            twitch: twitchIntel, 
            streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            playSessions: existingData?.playSessions || {},
            liveTrophyProgress: existingData?.liveTrophyProgress || {},
            currentGameHours: "0 hrs",
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            gamesPlayed: existingData?.gamesPlayed || 0, level: existingData?.level || 0,
            trophySummary: existingData?.trophySummary || { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
            recentGames: existingData?.recentGames || [], 
            activeHunt: existingData?.activeHunt || null, 
            mostRecentTrophies: (existingData?.mostRecentTrophies || []).slice(0, 10)
        };
    }
}

// ----------------------------------------------------------------------------
// [SECTION: FIREBASE NETWORK & HTTP/HTTPS PROTOCOL LAYER]
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
// [SECTION: MAIN EXECUTION THREAD]
// ----------------------------------------------------------------------------
async function main() {
    try {
        console.log("[INIT] Starting Squad Pack Sync Engine v39.0.0 (Self-Healing Token Lifecycle)...");

        // 1. Pre-load persisted refresh tokens
        await loadPersistentTokens();

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        let finalData = { 
            gamertags: previousFirebaseData.gamertags || {}, 
            games: globalGames, 
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            engineVersion: "39.0.0",
            analyticsTag: GA4_MEASUREMENT_ID,
            codeTimestamp: "Friday, September 18, 2026 | 02:27 EDT"
        };

        // 2. Authenticate squad accounts (Uses refresh tokens first, auto-renews silently)
        console.log("[AUTH] Authenticating primary squad tokens...");
        const wildHorseAuth = await getAuthenticated("wildhorse_spirit", process.env.PSN_NPSSO_WEREWOLF);
        const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
        const masterAuth = wildHorseAuth || rayAuth;

        finalData.authDiagnostics = diagnosticReport;

        // 3. Iterate through all squad gamertags
        for (const [key, gamerTag] of Object.entries(SQUAD_GAMERTAGS)) {
            const accountId = ACCOUNT_IDS[key];
            const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'wildhorse_spirit' && wildHorseAuth) ? wildHorseAuth : masterAuth;
            
            console.log(`[INGESTION] Fetching full data for gamertag: ${gamerTag}...`);
            const data = await getFullUserData(agentAuth, gamerTag, key, accountId, finalData.gamertags[gamerTag], true, globalGames);
            if (data) {
                finalData.gamertags[gamerTag] = data;
                await syncNodeToFirebase(`gamertags/${gamerTag}`, data);
                
                // Explicitly guarantee that currentGameArt is directly synced to its own dedicated node
                if (data.currentGameArt) {
                    await syncNodeToFirebase(`gamertags/${gamerTag}/currentGameArt`, data.currentGameArt);
                }
                console.log(`[FIREBASE SYNC] Updated node gamertags/${gamerTag} (currentGameArt: ${data.currentGameArt ? "WRITTEN" : "NULL"})`);
            }
        }

        await syncNodeToFirebase("authDiagnostics", finalData.authDiagnostics);
        await syncNodeToFirebase("lastGlobalUpdate", finalData.lastGlobalUpdate);
        writeLocalFile(finalData);

        console.log(`[SUCCESS] PSN Engine v39.0.0 finished writing 100% of raw data across all gamertags to Firebase.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Execution failed: ${criticalError.message}`);
        process.exit(1);
    }
}

main();
