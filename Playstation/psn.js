/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Master Telemetry Engine - Universal Squad Sync:
 *              1. Reads users dynamically from Firebase RTDB (/users & /user_secrets).
 *              2. Core 4 Squad Delegation (WildHorse_Spirit & OneLIVIDMAN power
 *                 the pack for Darkwing69420 and DesdemonaTiger).
 *              3. Strict Gate: Outside hunters must supply their own NPSSO cookie.
 *              4. Real-time active platform detection (PS5 vs PS4 vs PS3).
 *              5. DLC & Expansion Ingestion with Cloud Store Catalog fallback.
 * Analytics Tagging: G-CTYHDF4MSD (Deployable via GTM).
 * Version: 60.4.0 - Dynamic Secret Pulling & Active Platform/DLC Engine
 * Date & Time Stamp: 2026-10-08 04:36:00 EDT (America/New_York)
 * ============================================================================ */

// Line 16: Core dependencies and PSN API SDK imports
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

// Line 46: Endpoints, Secrets & Tokens Configuration
const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const RTDB_ROOT_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

// Line 52: Squad Gamertag roster mappings
const SQUAD_GAMERTAGS = {
    wildhorse_spirit: "WildHorse_Spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "DesdemonaTiger"
};

// Line 60: Official PSN Gamertag to Twitch Handle mappings
const TWITCH_MAP = {
    "wildhorse_spirit": "werewolf3788",
    "onelividman": "raymystyro",
    "darkwing69420": "terrdog420",
    "ilimjolnirili": "mjolnirgaming",
    "desdemonatiger": ""
};

// Line 69: Permanent Core Squad PSN Account IDs
const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523"
};

// Line 77: Core 4 Pack Definitions
const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: ACCOUNT_IDS.wildhorse_spirit },
    { key: "ray", tag: "OneLIVIDMAN", id: ACCOUNT_IDS.ray },
    { key: "darkwing", tag: "Darkwing69420", id: ACCOUNT_IDS.darkwing },
    { key: "marc", tag: "DesdemonaTiger", id: ACCOUNT_IDS.marc }
];

// Line 85: Affiliate tracking
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
// Line 102: Resilient network fetch layer for node environments
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
// [SECTION: FIREBASE AUTHENTICATED REST API UTILITIES]
// ----------------------------------------------------------------------------
// Line 159: Appends secret key if provided in environment
function buildRtdbUrl(pathWithLeadingSlash) {
    const secret = process.env.FIREBASE_AUTH_SECRET;
    const authQuery = secret ? `?auth=${encodeURIComponent(secret)}` : "";
    return `${RTDB_ROOT_URL}${pathWithLeadingSlash}.json${authQuery}`;
}

async function fetchFromFirebase(endpointPath = "") {
    try {
        const fullUrl = buildRtdbUrl(`/psn${endpointPath ? '/' + endpointPath : ''}`);
        const response = await resilientFetch(fullUrl);
        if (!response || !response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.warn(`[FIREBASE READ ERROR] /psn/${endpointPath}: ${err.message}`);
        return {};
    }
}

async function syncNodeToFirebase(endpointPath, payload) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        const res = await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res && !res.ok) {
            console.error(`[FIREBASE WRITE ERROR] Failed /psn/${endpointPath}: HTTP ${res.status}`);
        }
    } catch (err) {
        console.error(`[FIREBASE WRITE ERROR] Failed /psn/${endpointPath}: ${err.message}`);
    }
}

async function deleteNodeFromFirebase(endpointPath) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        await resilientFetch(targetUrl, { method: "DELETE" });
        console.log(`[CLEANUP] Purged node from Firebase: /psn/${endpointPath}`);
    } catch (err) {
        console.warn(`[CLEANUP WARN] Failed to delete /psn/${endpointPath}: ${err.message}`);
    }
}

// ----------------------------------------------------------------------------
// [SECTION: TIME & PLATFORM FORMATTING HELPERS]
// ----------------------------------------------------------------------------
// Line 209: Duration format helper
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

// Line 229: Identifies the exact platform build of the game
function normalizePlatform(game, livePlatform = null) {
    if (livePlatform) {
        const upperLive = String(livePlatform).toUpperCase();
        if (upperLive.includes("PS5")) return "PS5";
        if (upperLive.includes("PS4")) return "PS4";
        if (upperLive.includes("PS3")) return "PS3";
        if (upperLive.includes("VITA")) return "PS Vita";
    }

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

// ----------------------------------------------------------------------------
// [SECTION: TROPHY-DRIVEN CAPABILITY & MULTIPLAYER EVALUATION]
// ----------------------------------------------------------------------------
function inferGameCapabilitiesFromTrophies(gameName, trophies = [], commId = null) {
    const combinedTrophyText = (trophies || []).map(t => `${t.name || ""} ${t.description || ""} ${t.detail || ""}`).join(" ").toLowerCase();
    const cleanName = (gameName || "").toLowerCase().trim();

    const coopTokens = ["co-op", "coop", "cooperative", "partner", "teammate", "revive an ally", "revive a player", "with a friend", "invite a friend", "as a duo"];
    const pvpTokens = ["multiplayer", "pvp", "versus", "invade", "invasion", "axis invasion", "ranked match", "online match", "opponents", "deathmatch", "battle royale", "win a match"];
    const campaignTokens = ["campaign", "chapter", "mission", "story", "prologue", "epilogue", "difficulty", "collectibles", "memories", "complete the game"];

    const hasCoopTrophies = coopTokens.some(token => combinedTrophyText.includes(token));
    const hasPvpTrophies = pvpTokens.some(token => combinedTrophyText.includes(token));
    const hasCampaignTrophies = campaignTokens.some(token => combinedTrophyText.includes(token)) || (trophies && trophies.length > 15);

    const isDedicatedCoop = cleanName.includes("it takes two") || cleanName.includes("a way out") || cleanName.includes("we were here");
    const isTsushima = cleanName.includes("ghost of tsushima") || cleanName.includes("tsushima") || cleanName.includes("legends");
    const isNfs = cleanName.includes("need for speed") || cleanName.includes("nfs ");
    const isFarmSim = cleanName.includes("farming simulator");
    const isSniperElite = cleanName.includes("sniper elite") || cleanName.includes("zombie army");
    const isHunter = cleanName.includes("thehunter") || cleanName.includes("hunter: call of the wild") || cleanName.includes("way of the hunter");
    const isWildlands = cleanName.includes("wildlands") || cleanName.includes("breakpoint") || cleanName.includes("division");
    const isTitans = cleanName.includes("path of titans");

    const isMulti = hasCoopTrophies || hasPvpTrophies || isDedicatedCoop || isTsushima || isNfs || isFarmSim || isSniperElite || isHunter || isWildlands || isTitans;
    const isCrossPlay = isDedicatedCoop || isTsushima || cleanName.includes("unbound") || isFarmSim || cleanName.includes("sniper elite 5") || isTitans;

    let multiplayerType = "Single Player Only";
    if (isDedicatedCoop) {
        multiplayerType = "Co-Op Only (2-Player)";
    } else if (isTsushima) {
        multiplayerType = "Solo Campaign + Legends Co-Op (2-4)";
    } else if (isSniperElite) {
        multiplayerType = "Solo Campaign + Co-Op & Invasion (2-16)";
    } else if (isFarmSim) {
        multiplayerType = "Solo Farm + Online Co-Op (6-Player)";
    } else if (isNfs) {
        multiplayerType = "Solo Story + Online Racing (8-16)";
    } else if (isWildlands) {
        multiplayerType = "Solo Campaign + Online Co-Op (4-Player)";
    } else if (isHunter) {
        multiplayerType = "Solo Reserves + Online Co-Op / Multiplayer";
    } else if (hasCoopTrophies && hasPvpTrophies) {
        multiplayerType = "Solo Campaign + Co-Op & Online PvP";
    } else if (hasCoopTrophies) {
        multiplayerType = "Solo Campaign + Online Co-Op";
    } else if (hasPvpTrophies) {
        multiplayerType = "Solo Story + Online Multiplayer";
    }

    return {
        isMultiplayer: isMulti,
        isCoOpOnly: isDedicatedCoop,
        hasCampaign: isDedicatedCoop ? true : (hasCampaignTrophies || !isTitans),
        multiplayerType: multiplayerType,
        isCrossPlatform: isCrossPlay,
        crossPlayPlatforms: isCrossPlay ? ["PS5", "PS4", "PC", "Xbox Series X|S"] : ["PlayStation Network"],
        psPlusRequired: isMulti && !cleanName.includes("free to play")
    };
}

// ----------------------------------------------------------------------------
// [SECTION: SMART SESSION TRACKING & TWITCH TELEMETRY]
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
// [SECTION: AUTHENTICATION, CACHING & TOKEN LIFECYCLE]
// ----------------------------------------------------------------------------
async function loadPersistentTokens() {
    try {
        const remoteTokens = await fetchFromFirebase("secureTokens");
        if (remoteTokens && typeof remoteTokens === "object") {
            tokenStore = { ...tokenStore, ...remoteTokens };
            console.log("[TOKEN STORAGE] Loaded cached tokens from Firebase.");
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

    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "OFFLINE_GUEST_MODE";
    return null;
}

// ----------------------------------------------------------------------------
// [SECTION: SMART HOT-STANDBY FAILOVER MANAGER FOR CORE PACK]
// ----------------------------------------------------------------------------
async function resolveMasterSession(wildHorseNpsso, rayNpsso) {
    console.log("[FAILOVER MANAGER] Checking squad master token health...");

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
        console.warn("[FAILOVER MANAGER] ⚠️ Both squad tokens offline. Read-only snapshot fallback mode.");
        failoverState = "SNAPSHOT_FALLBACK";
    }

    return { masterAuth: activeMaster, wolfAuth, rayAuth, failoverState };
}

// ----------------------------------------------------------------------------
// [SECTION: GAME SKELETON, DLCS & EXPANSION ENRICHMENT]
// ----------------------------------------------------------------------------
// Line 620: Enriches Sony DLC groups with curated Cloud Data (Price, Ownership, Art)
async function enrichDLCGroups(canonicalCommId, mappedGroups, userPurchasedTitles = [], cloudDlcCatalog = {}) {
    return mappedGroups.map(grp => {
        const groupNameLower = (grp.name || "").toLowerCase();
        
        // Search cloud catalog for matching DLC pack definition
        const matchedCloudPack = Object.values(cloudDlcCatalog).find(pack => {
            const packNameLower = (pack.pack_name || pack.name || "").toLowerCase();
            return packNameLower.includes(groupNameLower) || groupNameLower.includes(packNameLower);
        }) || {};

        // Determine ownership: checks if present in user purchases, free DLC pack, or has trophy progress
        const isUserOwned = userPurchasedTitles.some(p => (p.name || "").toLowerCase().includes(groupNameLower)) ||
                            matchedCloudPack.price === "Free" ||
                            (grp.definedTrophies && Object.values(grp.definedTrophies).some(count => count > 0));

        return {
            groupId: grp.trophyGroupId,
            name: grp.name || "Add-On Content",
            description: matchedCloudPack.summary || matchedCloudPack.description || "Official game add-on / DLC expansion pack.",
            price: matchedCloudPack.price !== undefined ? matchedCloudPack.price : "Store Listing",
            image: resolveGamePosterArt([matchedCloudPack.image, matchedCloudPack.poster, grp.trophyGroupIconUrl]),
            isOwned: isUserOwned,
            isDLC: true,
            definedTrophies: grp.definedTrophies || {},
            includedItems: matchedCloudPack.items_included || []
        };
    });
}

async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames, userPurchasedTitles = [], cloudDlcCatalog = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();

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
        metaRes = metaRes || { trophies: [] };

        let groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, opt).catch(() => null);
        if (!groupsRes || !groupsRes.trophyGroups) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, { npServiceName: altService }).catch(() => ({ trophyGroups: [] }));
        }
        groupsRes = groupsRes || { trophyGroups: [] };

        const previousRecord = globalGames[canonicalCommId] || {};
        const safePoster = resolveGamePosterArt([posterArt, iconArt, previousRecord.posterArt, previousRecord.trophyTitleIconUrl]);

        const mappedTrophies = (metaRes?.trophies && metaRes.trophies.length > 0) ? metaRes.trophies.map(t => {
            const earnedRate = t.trophyEarnedRate || "0.0";
            return {
                ...t,
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy",
                title: t.trophyName || "Unknown Trophy",
                description: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                detail: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                type: (t.trophyType || "bronze").toLowerCase(),
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: t.trophyProgressTargetValue ? parseInt(t.trophyProgressTargetValue, 10) : 0,
                rarity: t.trophyRare !== undefined ? `${t.trophyRare}%` : "Rare",
                earnedRate: earnedRate,
                difficultyTier: getDifficultyTier(earnedRate),
                hidden: !!t.trophyHidden
            };
        }) : (previousRecord.trophies || []);

        const rawGroups = (groupsRes?.trophyGroups && groupsRes.trophyGroups.length > 0) ? groupsRes.trophyGroups.map(g => ({
            ...g,
            trophyGroupId: g.trophyGroupId,
            name: g.trophyGroupName || "Base Game",
            definedTrophies: g.definedTrophies || {}
        })) : (previousRecord.groups || []);

        // Enrich the DLC groups with images, descriptions, and ownership
        const enrichedDlcs = await enrichDLCGroups(canonicalCommId, rawGroups, userPurchasedTitles, cloudDlcCatalog);

        const resolvedName = gameName || previousRecord.name || "PlayStation Game";
        const capabilities = inferGameCapabilitiesFromTrophies(resolvedName, mappedTrophies, canonicalCommId);

        const gradeCounts = mappedTrophies.reduce((acc, curr) => {
            const grade = curr.type || "bronze";
            if (acc[grade] !== undefined) acc[grade]++;
            return acc;
        }, { bronze: 0, silver: 0, gold: 0, platinum: 0 });

        const skeletonData = {
            commId: canonicalCommId,
            npCommunicationId: canonicalCommId,
            name: resolvedName,
            platform: platform || previousRecord.platform || "PS5",
            npServiceName: opt.npServiceName,
            posterArt: safePoster,
            trophyTitleIconUrl: iconArt || previousRecord.trophyTitleIconUrl || safePoster,
            definedTrophies: definedTrophies || gradeCounts,
            totalTrophies: mappedTrophies.length || previousRecord.totalTrophies || 0,
            trophies: mappedTrophies,
            groups: rawGroups,
            dlcs: enrichedDlcs,
            rawSonyMetadata: (metaRes && metaRes.trophies) ? metaRes : (previousRecord.rawSonyMetadata || {}),
            isMultiplayer: capabilities.isMultiplayer,
            isCoOpOnly: capabilities.isCoOpOnly,
            hasCampaign: capabilities.hasCampaign,
            multiplayerType: capabilities.multiplayerType,
            isCrossPlatform: capabilities.isCrossPlatform,
            crossPlayPlatforms: capabilities.crossPlayPlatforms,
            psPlusRequired: capabilities.psPlusRequired,
            multiplayerInfo: capabilities,
            description: `Official PlayStation title: ${resolvedName}. Supports: ${capabilities.multiplayerType}. Cross-platform: ${capabilities.isCrossPlatform ? 'Yes' : 'No'}.`,
            lastUpdated: new Date().toISOString()
        };

        globalGames[canonicalCommId] = skeletonData;
        await syncNodeToFirebase(`games/${canonicalCommId}`, skeletonData);
        return skeletonData;
    } catch (err) {
        console.warn(`[SKELETON ERROR] Failed to ingest skeleton for ${canonicalCommId}:`, err.message);
        return globalGames[canonicalCommId] || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION: DEEP TROPHY PROGRESS & INTER-TROPHY INTERVALS]
// ----------------------------------------------------------------------------
async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames, existingGameProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();

    try {
        let opt = { npServiceName: (platform === "PS5" || globalGames[canonicalCommId]?.npServiceName === "trophy2") ? "trophy2" : "trophy" };
        
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

        const activeSkeleton = globalGames[canonicalCommId] || {};
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
                commId: canonicalCommId,
                npCommunicationId: canonicalCommId,
                name: skelTrophy?.name || "Trophy Objective",
                title: skelTrophy?.name || "Trophy Objective",
                detail: skelTrophy?.detail || "Objective detail",
                description: skelTrophy?.detail || "Objective detail",
                icon: skelTrophy?.icon || null,
                type: skelTrophy?.type || "bronze",
                rarity: skelTrophy?.rarity || "Rare",
                earnedRate: skelTrophy?.earnedRate || "0.0",
                difficultyTier: skelTrophy?.difficultyTier || getDifficultyTier(skelTrophy?.earnedRate),
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
                    commId: canonicalCommId,
                    npCommunicationId: canonicalCommId,
                    name: skelTrophy?.name || "Unlocked Trophy",
                    icon: skelTrophy?.icon || null,
                    type: skelTrophy?.type || "bronze",
                    rarity: skelTrophy?.rarity || "Rare",
                    difficultyTier: skelTrophy?.difficultyTier || getDifficultyTier(skelTrophy?.earnedRate),
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
        console.warn(`[SUBTREE WARN] Non-destructive preservation applied for ${canonicalCommId}:`, e.message);
        return {
            standaloneProgressMap: existingGameProgress || {},
            earnedTrophiesList: [],
            groupEarnings: []
        };
    }
}

// ----------------------------------------------------------------------------
// [SECTION: SMART ACTIVITY DELTA EVALUATOR]
// ----------------------------------------------------------------------------
async function evaluateUserActivityDelta(agentAuth, targetId, knownKey, knownGamerTag, existingData) {
    if (!existingData) {
        return { hasDelta: true, reason: "INITIAL_CREATION" };
    }

    const isSelf = (agentAuth?.userKey === "wildhorse_spirit" && targetId === ACCOUNT_IDS.wildhorse_spirit) ||
                   (agentAuth?.userKey === "ray" && targetId === ACCOUNT_IDS.ray);
    const targetScope = isSelf ? "me" : targetId;

    let liveOnline = false;
    let liveGameTitle = "Dashboard";
    let liveCommId = null;

    if (agentAuth) {
        try {
            const pRaw = await getBasicPresence(agentAuth, targetScope);
            const basic = pRaw?.basicPresence || (Array.isArray(pRaw) ? pRaw[0] : (pRaw?.basicPresences ? pRaw.basicPresences[0] : pRaw));
            const status = basic?.primaryPlatformInfo?.onlineStatus || basic?.onlineStatus || "offline";
            liveOnline = (status !== "offline");

            const activeGameInfo = basic?.gameTitleInfoList?.[0] || basic?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            liveCommId = activeGameInfo.npCommunicationId || null;
            liveGameTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || "Dashboard";
        } catch (e) {}
    }

    const mappedTwitch = (knownGamerTag && TWITCH_MAP[knownGamerTag.toLowerCase()]) || (knownKey && TWITCH_MAP[knownKey]) || null;
    let twitchIsLive = false;
    let twitchGame = null;
    if (mappedTwitch) {
        try {
            const tIntel = await getTwitchIntel(mappedTwitch);
            if (tIntel?.isLive) {
                twitchIsLive = true;
                twitchGame = tIntel.game;
                liveOnline = true;
            }
        } catch (e) {}
    }

    const storedOnline = !!existingData.online;
    if (liveOnline !== storedOnline) {
        return { hasDelta: true, reason: `STATUS_CHANGE (${storedOnline ? 'ONLINE' : 'OFFLINE'} -> ${liveOnline ? 'ONLINE' : 'OFFLINE'})` };
    }

    const hasActiveSession = Object.values(existingData?.playSessions || {}).some(s => s.isActive);
    if (hasActiveSession && !liveOnline) {
        return { hasDelta: true, reason: "SESSION_LOGOUT_FINALIZATION" };
    }

    if (liveOnline) {
        const storedGame = (existingData.currentGame || "Dashboard").toLowerCase().trim();
        const detectedGame = (twitchIsLive && twitchGame ? twitchGame : liveGameTitle).toLowerCase().trim();
        if (storedGame !== detectedGame) {
            return { hasDelta: true, reason: `GAME_SWITCH (${storedGame} -> ${detectedGame})` };
        }
    }

    if (agentAuth) {
        try {
            const liveStats = await getUserTrophyProfileSummary(agentAuth, targetId).catch(() => null);
            if (liveStats && liveStats.earnedTrophies) {
                const storedTotal = existingData.trophySummary?.total || 0;
                const liveTotal = (liveStats.earnedTrophies.platinum || 0) + 
                                  (liveStats.earnedTrophies.gold || 0) + 
                                  (liveStats.earnedTrophies.silver || 0) + 
                                  (liveStats.earnedTrophies.bronze || 0);

                if (liveTotal !== storedTotal) {
                    return { hasDelta: true, reason: `NEW_TROPHY_EARNED (${storedTotal} -> ${liveTotal})` };
                }

                if ((liveStats.trophyLevel || 0) !== (existingData.level || 0)) {
                    return { hasDelta: true, reason: `LEVEL_DELTA (${existingData.level} -> ${liveStats.trophyLevel})` };
                }
            }
        } catch (e) {}
    }

    return { hasDelta: false, reason: "UNCHANGED" };
}

// ----------------------------------------------------------------------------
// [SECTION: FULL USER TELEMETRY INGESTION WITH ACTIVE PLATFORM DETECTION]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames, cloudDlcCatalog = {}) {
    let resolvedTargetId = String(targetId || ACCOUNT_IDS[userKey]);

    if (!auth || !resolvedTargetId) {
        return existingData || null;
    }

    try {
        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch (e) {}

        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;
        const mappedTwitchHandle = TWITCH_MAP[canonicalOnlineId.toLowerCase()] || TWITCH_MAP[userKey] || null;
        const twitchIntel = await getTwitchIntel(mappedTwitchHandle);

        const isSelf = (auth.userKey === "wildhorse_spirit" && resolvedTargetId === ACCOUNT_IDS.wildhorse_spirit) ||
                       (auth.userKey === "ray" && resolvedTargetId === ACCOUNT_IDS.ray) ||
                       (resolvedTargetId === "me");

        let region = { country: "US", language: "en" };
        if (isSelf) {
            try { region = await getUserRegion(auth, "me"); } catch (e) {}
        }

        let devices = [];
        if (isSelf) {
            try {
                const devRes = await getAccountDevices(auth);
                devices = devRes?.devices || devRes || [];
            } catch (e) {}
        }

        let shareableProfile = null;
        if (isSelf) {
            try { shareableProfile = await getProfileShareableLink(auth); } catch (e) {}
        }

        let friendsList = [];
        let blockedUsers = [];
        let friendRequests = [];
        try {
            const friendsRes = await getUserFriendsAccountIds(auth, resolvedTargetId).catch(() => ({}));
            friendsList = friendsRes?.friends || [];
        } catch (e) {}

        if (isSelf) {
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
        if (isSelf) {
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
            if (isSelf) {
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

        let presenceTarget = isSelf ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: "offline", platform: null }, gameTitleInfoList: [] };

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

        const isPlayerOnline = (rawP?.primaryPlatformInfo?.onlineStatus || rawP?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive;
        
        // Exact hardware/version platform being played right now
        const liveHardwarePlatform = rawP?.primaryPlatformInfo?.platform || rawP?.platform || null;

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || 
                               rawP?.primaryPlatformInfo?.gameTitleInfoList?.[0] || 
                               {};
        
        let activeCommId = activeGameInfo.npCommunicationId || null;
        let activeTitleId = activeGameInfo.npTitleId || activeGameInfo.titleId || null;
        let resolvedTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || null;

        if (!resolvedTitle && twitchIntel?.isLive && twitchIntel.game) {
            resolvedTitle = twitchIntel.game;
        }

        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) {
            resolvedTitle = mergedGamesMap.get(activeCommId).name;
        }
        if (!resolvedTitle && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            resolvedTitle = mergedGamesMap.get(activeTitleId).name;
        }

        if (!resolvedTitle) {
            resolvedTitle = isPlayerOnline ? "Dashboard" : (existingData?.currentGame || "Dashboard");
        }

        let canonicalActiveCommId = null;
        if (activeCommId && String(activeCommId).startsWith("NPWR")) {
            canonicalActiveCommId = activeCommId;
        }

        if (!canonicalActiveCommId && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            const record = mergedGamesMap.get(activeTitleId);
            if (record?.npCommunicationId && String(record.npCommunicationId).startsWith("NPWR")) {
                canonicalActiveCommId = record.npCommunicationId;
            }
        }

        if (!canonicalActiveCommId && resolvedTitle && resolvedTitle !== "Dashboard") {
            const cleanResolved = resolvedTitle.toLowerCase().replace(/®|™/g, '').trim();
            for (const g of allRecentGames) {
                const gName = (g.name || g.trophyTitleName || '').toLowerCase().replace(/®|™/g, '').trim();
                if (gName === cleanResolved && g.npCommunicationId && String(g.npCommunicationId).startsWith("NPWR")) {
                    canonicalActiveCommId = g.npCommunicationId;
                    break;
                }
            }
        }

        if (!canonicalActiveCommId && resolvedTitle !== "Dashboard") {
            canonicalActiveCommId = allRecentGames[0]?.npCommunicationId || existingData?.currentCommunicationId || existingData?.activeHunt?.commId || null;
        }

        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } = updateGameSessionTracking(
            existingData,
            canonicalActiveCommId,
            resolvedTitle,
            isPlayerOnline,
            activeTitleId
        );

        // Ingest game skeletons and enriched DLCs
        for (const g of allRecentGames.slice(0, 20)) {
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
                    cloudDlcCatalog
                );
            }
        }

        const matchedGame = (canonicalActiveCommId && mergedGamesMap.get(canonicalActiveCommId)) || (resolvedTitle !== "Dashboard" ? allRecentGames[0] : null) || {};
        
        // Active platform resolution (Prioritizes current live hardware platform)
        const currentActivePlatform = normalizePlatform(matchedGame, liveHardwarePlatform);

        const isDashboard = !resolvedTitle || resolvedTitle.toUpperCase() === "DASHBOARD";
        const resolvedPoster = isDashboard ? null : resolveGamePosterArt([
            (canonicalActiveCommId && mergedGamesMap.get(canonicalActiveCommId)?.art),
            (activeTitleId && mergedGamesMap.get(activeTitleId)?.art),
            matchedGame.art,
            matchedGame.trophyTitleIconUrl,
            twitchIntel?.gameArt,
            existingData?.currentGameArt
        ]);

        const resolvedPlaytimeFormatted = (currentGameDurationFormatted !== "0 hrs" && currentGameDurationFormatted !== "< 1 min")
            ? currentGameDurationFormatted 
            : (matchedGame.nativePlaytimeFormatted || existingData?.currentGameHours || "0 hrs");

        const numericHoursPlayed = matchedGame.nativePlaytimeHours || Math.round((activeSessionSeconds / 3600) * 10) / 10 || existingData?.currentGameNumericHours || 0;

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;
        
        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
        const cumulativeUnlockedTrophies = [];

        const titlesToIngestProgress = [
            ...(canonicalActiveCommId ? [canonicalActiveCommId] : []),
            ...allRecentGames.slice(0, 10).map(g => g.npCommunicationId).filter(id => id && String(id).startsWith("NPWR") && id !== canonicalActiveCommId)
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

                if (cId === canonicalActiveCommId) {
                    const sortedEarned = [...subtree.earnedTrophiesList].sort((a, b) => a.timestamp - b.timestamp);
                    const earliestActiveTrophyTimestamp = sortedEarned.length > 0 ? sortedEarned[0].timestamp : null;

                    activeHunt = { 
                        npCommunicationId: canonicalActiveCommId, 
                        commId: canonicalActiveCommId,
                        titleId: activeTitleId || matchedGame.titleId || null,
                        title: matchedGame.name || resolvedTitle, 
                        platform: currentActivePlatform, 
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
                        groupEarnings: subtree.groupEarnings,
                        dlcs: globalGames[canonicalActiveCommId]?.dlcs || []
                    };
                }
            }
        }

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
            currentCommunicationId: canonicalActiveCommId,
            platform: currentActivePlatform,
            currentGameHours: resolvedPlaytimeFormatted,
            currentGameNumericHours: numericHoursPlayed,
            twitch: twitchIntel,
            rawPresence: rawP
        };

        return {
            onlineId: canonicalOnlineId, 
            accountId: resolvedTargetId,
            npssoValid: true,
            npssoStatus: "ACTIVE",
            handshakeText: `${canonicalOnlineId.toUpperCase()} HANDSHAKE: FIREBASE LIVE`,
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
        console.error(`[TELEMETRY CRITICAL ERROR] For ${targetId}: ${e.message}`);
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

// ----------------------------------------------------------------------------
// [SECTION: MASTER EXECUTION & GITHUB ACTIONS RUNNER]
// ----------------------------------------------------------------------------
async function executeSyncPass() {
    try {
        console.log(`[INIT] Starting Squad Pack Sync Engine v60.4.0 at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })} EDT...`);

        await loadPersistentTokens();

        // 1. Fetch Registered Users & Private Secrets from Firebase RTDB
        const siteUsersRaw = await resilientFetch(buildRtdbUrl("/users")).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(buildRtdbUrl("/user_secrets")).then(r => r.json()).catch(() => ({}));
        const cloudDlcCatalog = await resilientFetch(buildRtdbUrl("/woth2_cloud/data/dlcs")).then(r => r.json()).catch(() => ({}));

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        // 2. Discover Core 4 Cookies from Firebase
        let wolfNpsso = process.env.PSN_NPSSO_WEREWOLF || "";
        let rayNpsso = process.env.PSN_NPSSO_RAY || "";

        if (siteUsersRaw && typeof siteUsersRaw === "object") {
            Object.entries(siteUsersRaw).forEach(([emailKey, u]) => {
                const gaming = u.gaming_platforms || u;
                const tag = (gaming.psn_username || u.username || "").toLowerCase();
                const secretCookie = userSecretsRaw?.[emailKey]?.psn_npsso || gaming.psn_npsso;
                
                if (secretCookie && secretCookie.length >= 20) {
                    if (tag.includes("wildhorse_spirit") || tag.includes("werewolf")) wolfNpsso = secretCookie;
                    if (tag.includes("onelividman") || tag.includes("ray")) rayNpsso = secretCookie;
                }
            });
        }

        // 3. Resolve Master Squad Session (Wolf / Ray Failover)
        const sessionState = await resolveMasterSession(wolfNpsso, rayNpsso);
        const { masterAuth, failoverState } = sessionState;

        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = failoverState === "FAILOVER_RAY" 
            ? "RUNNING ON BACKUP (Ray Active)" 
            : (failoverState === "PRIMARY_WOLF" ? "PRIMARY HEALTHY (Werewolf Running)" : "READ-ONLY SNAPSHOT MODE");

        let finalData = { 
            gamertags: { ...(previousFirebaseData?.gamertags || {}) }, 
            usersByGamerTag: { ...(previousFirebaseData?.usersByGamerTag || {}) }, 
            games: globalGames, 
            squadLeaderboard: [], 
            squadAnalytics: {}, 
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport, 
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            engineVersion: "60.4.0", 
            analyticsTag: GA4_MEASUREMENT_ID, 
            codeTimestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) + " EDT"
        };

        const activeCanonicalGamertags = new Set();
        let anyProfileUpdated = false;

        // 4. Ingest Core 4 Pack Members
        if (masterAuth && masterAuth.accessToken) {
            console.log(`[CORE PACK] Syncing Core 4 squad members using session: ${masterAuth.userKey}...`);
            for (const member of CORE_PACK) {
                const existingData = previousFirebaseData?.gamertags?.[member.tag];
                const deltaCheck = await evaluateUserActivityDelta(masterAuth, member.id, member.key, member.tag, existingData);

                if (!deltaCheck.hasDelta && existingData) {
                    console.log(`[SKIP - NO DELTA] Core member ${member.tag} has no new activity.`);
                    activeCanonicalGamertags.add(member.tag);
                    continue;
                }

                console.log(`[SYNC TRIGGERED] Ingesting Core member ${member.tag}...`);
                const data = await getFullUserData(masterAuth, member.tag, member.key, member.id, existingData, true, globalGames, cloudDlcCatalog);

                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    anyProfileUpdated = true;
                    data.npssoValid = true;
                    data.npssoStatus = "ACTIVE";

                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);

                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}/npssoValid`, true);
                }
            }
        } else {
            console.warn("[CORE PACK HALT] Neither WildHorse_Spirit nor OneLIVIDMAN is active. Preserving existing squad records.");
            CORE_PACK.forEach(m => activeCanonicalGamertags.add(m.tag));
        }

        // 5. Ingest Outside Hunters (Strict Gate: Personal Cookie Required)
        if (siteUsersRaw && typeof siteUsersRaw === "object") {
            for (const [emailKey, userRecord] of Object.entries(siteUsersRaw)) {
                const gaming = userRecord.gaming_platforms || userRecord;
                const tag = (gaming.psn_username || userRecord.username || "").trim();
                const accountId = gaming.psn_account_id ? String(gaming.psn_account_id).trim() : null;
                const rawNpsso = userSecretsRaw?.[emailKey]?.psn_npsso || gaming.psn_npsso;

                // Skip if member belongs to Core 4
                const isCore = CORE_PACK.some(m => m.tag.toLowerCase() === tag.toLowerCase() || m.id === accountId);
                if (isCore) continue;

                // Strict Gate: Outside hunters must have their own valid cookie
                if (!rawNpsso || rawNpsso.length < 20) {
                    console.log(`[OUTSIDE USER - BYPASSED] ${tag || emailKey}: No private NPSSO cookie.`);
                    continue;
                }

                console.log(`[OUTSIDE AUTH] Handshaking personal session for ${tag || emailKey}...`);
                const userAuth = await getAuthenticated(emailKey, rawNpsso);

                if (!userAuth || !userAuth.accessToken) {
                    console.warn(`[OUTSIDE AUTH EXPIRED] Cookie invalid for ${tag || emailKey}. Skipping.`);
                    await resilientFetch(buildRtdbUrl(`/users/${emailKey}/psn_npsso_valid`), {
                        method: "PUT",
                        body: JSON.stringify(false)
                    });
                    continue;
                }

                const existingData = previousFirebaseData?.gamertags?.[tag];
                const data = await getFullUserData(userAuth, tag, emailKey, accountId || "me", existingData, true, globalGames, cloudDlcCatalog);

                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    anyProfileUpdated = true;
                    data.npssoValid = true;
                    data.npssoStatus = "ACTIVE";

                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);

                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}/npssoValid`, true);
                    
                    await resilientFetch(buildRtdbUrl(`/users/${emailKey}/psn_npsso_valid`), {
                        method: "PUT",
                        body: JSON.stringify(true)
                    });
                }
            }
        }

        // 6. Lifecycle Cleanup: Remove stale unmapped entries
        const existingRemoteKeys = Object.keys(previousFirebaseData?.gamertags || {});
        for (const oldKey of existingRemoteKeys) {
            if (!activeCanonicalGamertags.has(oldKey)) {
                console.log(`[LIFECYCLE PURGE] Purging stale entry '${oldKey}' from Firebase...`);
                await deleteNodeFromFirebase(`gamertags/${oldKey}`);
                anyProfileUpdated = true;
            }
        }

        // 7. Calculate Squad Leaderboard & Social Matrix
        const squadIntel = buildSquadIntelligence(finalData.gamertags);
        finalData.squadLeaderboard = squadIntel.leaderboard;
        finalData.squadAnalytics = {
            totals: squadIntel.squadTotals,
            socialOverlap: squadIntel.socialOverlap,
            calculatedAt: new Date().toISOString()
        };

        if (anyProfileUpdated) {
            await syncNodeToFirebase("usersByGamerTag", finalData.usersByGamerTag);
            await syncNodeToFirebase("leaderboard", finalData.squadLeaderboard);
            await syncNodeToFirebase("squadAnalytics", finalData.squadAnalytics);
            await syncNodeToFirebase("lastGlobalUpdate", finalData.lastGlobalUpdate);
        }

        diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
        await syncNodeToFirebase("authDiagnostics", diagnosticReport);

        console.log(`[SUCCESS] PSN Engine v60.4.0 completed. Profiles updated: ${anyProfileUpdated ? 'YES' : 'NONE (IDLE)'}.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

// Line 1160: Clean exit for GitHub Actions workflow runner
(async () => {
    await executeSyncPass();
    process.exit(0);
})();
