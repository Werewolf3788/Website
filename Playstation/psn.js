/* ============================================================================
 * File: index.js
 * Location: /index.js & /Playstation/psn.js
 * Description: Squad Pack Sync Engine - Pure Active Gamer Tag Telemetry
 *              Filtered Squad: WildHorse_Spirit, OneLIVIDMAN, Darkwing69420, DesdemonaTiger.
 *              Features:
 *                - PS4 vs PS5 detection & badge separation
 *                - PS5 trophy incremental progress parsing (e.g. "12/50")
 *                - Total gameplay hours and playtime extraction (ISO 8601 parse)
 *                - 50% milestone retention (>=50% stays, <50% dynamic cleanup)
 * Database: Realtime Database (entertainment-71888)
 * Target Endpoint: https://entertainment-71888-default-rtdb.firebaseio.com/psn.json
 * Version: 16.5.0 - PS4/PS5 Smart Split, Play Duration & Sub-Trophy Progress
 * Date & Time Stamp: 2026-09-06 08:06:12 (24hr Chicago Time)
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
const psnApi = require("psn-api");

// ----------------------------------------------------------------------------
// [SECTION: PSN API MODULE DESTRUCTURING]
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// [SECTION: CONFIGURATION & CONSTANTS]
// ----------------------------------------------------------------------------
const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ALT_LOCAL_JSON_PATH = path.join(__dirname, "Playstation", "psn.json");

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
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];

const MILESTONE_PROGRESS_THRESHOLD = 50; 
const MAX_ROTATING_SUB50_GAMES = 3;       

let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION: HELPER UTILITIES & STRING FORMATTING]
// ----------------------------------------------------------------------------
function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

/**
 * Converts PlayStation ISO 8601 playDuration strings (e.g. "PT45H22M10S" or "PT30M")
 * into human-readable hours and numbers.
 */
function parsePlayDuration(durationStr) {
    if (!durationStr || typeof durationStr !== "string") {
        return { totalHours: 0, hoursFormatted: "0 hrs", rawDuration: null };
    }
    
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) {
        return { totalHours: 0, hoursFormatted: "0 hrs", rawDuration: durationStr };
    }

    const hours = parseInt(matches[1] || "0", 10);
    const minutes = parseInt(matches[2] || "0", 10);
    const fractionalHours = Number((hours + (minutes / 60)).toFixed(1));

    let hoursFormatted = "";
    if (hours > 0 && minutes > 0) {
        hoursFormatted = `${hours}h ${minutes}m`;
    } else if (hours > 0) {
        hoursFormatted = `${hours} hrs`;
    } else if (minutes > 0) {
        hoursFormatted = `${minutes} mins`;
    } else {
        hoursFormatted = "< 1 min";
    }

    return {
        totalHours: fractionalHours,
        hoursFormatted,
        rawDuration: durationStr
    };
}

/**
 * Accurately detects and normalizes the console platform (PS5 vs PS4).
 */
function normalizePlatform(game) {
    const rawPlatform = (
        game.trophyTitlePlatform || 
        game.platform || 
        game.category || 
        (game.npServiceName === "trophy2" ? "PS5" : "PS4")
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ----------------------------------------------------------------------------
// [SECTION: TWITCH STREAM INTELLIGENCE FETCHER]
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
            const res = await fetch(`https://decapi.me/twitch/${endpoint}/${cleanUser}`, { signal: controller.signal });
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
        console.error(`[TWITCH EXCEPTION] DecAPI error for ${username}:`, e.message);
        return intel; 
    }
}

// ----------------------------------------------------------------------------
// [SECTION: PSN AUTHENTICATION & HANDSHAKE MANAGEMENT]
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
    
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        const isValid = await isTokenValid(currentUserTokens.accessToken);
        if (isValid) {
            diagnosticReport[`${userKey}_active`] = "yes";
            diagnosticReport[`${userKey}_status`] = "ACTIVE";
            return { accessToken: currentUserTokens.accessToken, npssoValid: true, userKey };
        }
        currentUserTokens.accessToken = null;
    }
    
    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = { 
                accessToken: refreshed.accessToken, 
                refreshToken: refreshed.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600) 
            };
            diagnosticReport[`${userKey}_active`] = "yes";
            diagnosticReport[`${userKey}_status`] = "ACTIVE";
            return { ...refreshed, npssoValid: true, userKey };
        } catch (e) { currentUserTokens.refreshToken = null; }
    }
    
    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = { 
                accessToken: auth.accessToken, 
                refreshToken: auth.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600) 
            };
            diagnosticReport[`${userKey}_active`] = "yes";
            diagnosticReport[`${userKey}_status`] = "ACTIVE";
            console.log(`[AUTH SUCCESS] Authenticated ${userKey} with PSN.`);
            return { ...auth, npssoValid: true, userKey };
        } catch (e) { 
            console.error(`[AUTH DIAGNOSTIC] Auth failed for ${userKey}: ${e.message}`);
            diagnosticReport[`${userKey}_active`] = "no";
            diagnosticReport[`${userKey}_status`] = "EXPIRED_NPSSO";
            return null; 
        }
    }
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

function generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData) {
    const historicalStreamList = processStreamHistory(existingData?.streamHistory, twitchIntel);
    return {
        onlineId: gamerTag, 
        online: !!twitchIntel?.isLive,
        accountId: ACCOUNT_IDS[userKey] || "",
        npssoValid: false,
        npssoStatus: "EXPIRED / UPDATE NEEDED",
        handshakeText: `${gamerTag.toUpperCase()} HANDSHAKE: NPSSO EXPIRED`,
        handshakeState: "EXPIRED",
        currentGame: twitchIntel?.game || "Dashboard", 
        currentGameArt: twitchIntel?.gameArt || null,
        currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
        amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), 
        bio: twitchIntel?.bio || "Official Pack Member Profile",
        twitch: twitchIntel, 
        streamHistory: historicalStreamList,
        lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }), 
        gamesPlayed: existingData?.gamesPlayed || 0, plus: false, level: existingData?.level || 0, region: "US", note: "PSN Auth Inactive or Token Expired", devices: [],
        blockedAccountsCount: 0, inboundFriendRequestsCount: 0,
        trophySummary: existingData?.trophySummary || { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
        recentGames: existingData?.recentGames || [], 
        activeHunt: existingData?.activeHunt || null, 
        mostRecentTrophies: (existingData?.mostRecentTrophies || []).slice(0, 10)
    };
}

async function resolveAccountIdFromSearch(auth, gamerTag) {
    try {
        console.log(`[PSN SEARCH] Universal Search lookup for: ${gamerTag}...`);
        const searchResults = await makeUniversalSearch(auth, gamerTag, "domain:conceptCollapse");
        const match = searchResults?.searchResults?.[0]?.results?.find(r => r.socialMetadata?.onlineId?.toLowerCase() === gamerTag.toLowerCase());
        if (match?.socialMetadata?.accountId) {
            console.log(`[PSN SEARCH SUCCESS] Discovered Account ID for ${gamerTag}: ${match.socialMetadata.accountId}`);
            return match.socialMetadata.accountId;
        }
    } catch (e) {
        console.warn(`[PSN SEARCH WARN] Search failed for ${gamerTag}:`, e.message);
    }
    return "";
}

// ----------------------------------------------------------------------------
// [SECTION: CORE USER PROFILE & TELEMETRY PARSER]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    let resolvedTargetId = targetId;

    if (!resolvedTargetId && auth?.accessToken) {
        if (auth.userKey === userKey) {
            try {
                const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString());
                resolvedTargetId = payload.account_id || "";
            } catch(e) {}
        } else {
            resolvedTargetId = await resolveAccountIdFromSearch(auth, gamerTag);
        }
    }

    if (!auth || !resolvedTargetId) {
        if (existingData && existingData.trophySummary) {
            existingData.online = !!twitchIntel?.isLive;
            existingData.twitch = twitchIntel;
            existingData.streamHistory = processStreamHistory(existingData.streamHistory, twitchIntel);
            existingData.lastUpdated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
            existingData.npssoValid = false;
            existingData.npssoStatus = "EXPIRED / UPDATE NEEDED";
            existingData.handshakeText = `${(existingData.onlineId || gamerTag).toUpperCase()} HANDSHAKE: NPSSO EXPIRED`;
            existingData.handshakeState = "EXPIRED";
            return existingData;
        }
        return generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData);
    }

    try {
        const profile = await getProfileFromAccountId(auth, resolvedTargetId).catch(() => null);
        if (!profile) {
            console.log(`[PRIVACY OVERRIDE] Account ${gamerTag} is restricted.`);
            return generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData);
        }

        let region = { country: "US", language: "en" };
        let friendsList = [];
        let blockedList = [];
        let inboundFriendRequests = [];
        
        if (ACCOUNT_IDS.ray === resolvedTargetId || userKey === 'wildhorse_spirit') {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try { friendsList = await getUserFriendsAccountIds(auth, "me") || []; } catch(e) {}
            try { blockedList = await getUserBlockedAccountIds(auth) || []; } catch(e) {}
            try { inboundFriendRequests = await getUserFriendsRequests(auth) || []; } catch(e) {}
        }
        
        const presenceId = (ACCOUNT_IDS.ray === resolvedTargetId || userKey === 'wildhorse_spirit') ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        
        const titlesRes = await getUserTitles(auth, resolvedTargetId, { limit: 100 }).catch(() => ({}));
        const sortedTitles = (titlesRes?.trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
        const totalGamesPlayedCount = titlesRes?.totalItemCount || sortedTitles.length;

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        let telemetryData = [];
        try {
            const history = await getRecentlyPlayedGames(auth, resolvedTargetId, { limit: 25 });
            telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
        } catch (e) {}

        const mergedGamesMap = new Map();

        // 1. Ingest telemetry data (Has playDuration, playCount, image)
        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            const playTimeMeta = parsePlayDuration(g.playDuration);
            mergedGamesMap.set(g.npCommunicationId, {
                ...g,
                npCommunicationId: g.npCommunicationId,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: g.image?.url || null,
                playCount: g.playCount || 1,
                lastPlayed: g.lastPlayedDateTime || null,
                playDurationRaw: g.playDuration || null,
                hoursPlayed: playTimeMeta.totalHours,
                hoursFormatted: playTimeMeta.hoursFormatted,
                progress: 0,
                earnedTotal: 0,
                definedTotal: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            });
        });

        // 2. Ingest trophy data (Has completion %, trophyTitlePlatform, exact trophy counts)
        sortedTitles.forEach(t => {
            if (!t.npCommunicationId) return;
            const existing = mergedGamesMap.get(t.npCommunicationId) || {
                npCommunicationId: t.npCommunicationId,
                name: t.trophyTitleName || "Unknown Game",
                platform: normalizePlatform(t),
                art: t.trophyTitleIconUrl || null,
                playCount: 1,
                lastPlayed: t.lastUpdatedDateTime || null,
                playDurationRaw: null,
                hoursPlayed: 0,
                hoursFormatted: "0 hrs"
            };

            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.platform = normalizePlatform(t);
            existing.progress = t.progress || 0;
            existing.earnedTotal = (t.earnedTrophies?.platinum||0) + (t.earnedTrophies?.gold||0) + (t.earnedTrophies?.silver||0) + (t.earnedTrophies?.bronze||0);
            existing.definedTotal = (t.definedTrophies?.platinum||0) + (t.definedTrophies?.gold||0) + (t.definedTrophies?.silver||0) + (t.definedTrophies?.bronze||0);
            existing.npServiceName = t.npServiceName || (existing.platform === "PS5" ? "trophy2" : "trophy");

            mergedGamesMap.set(t.npCommunicationId, existing);
        });

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId;

        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");

        if (!activeCommId && resolvedTitle !== "Dashboard") {
            const matchByName = Array.from(mergedGamesMap.values()).find(g =>
                g.name.toLowerCase().replace(/®|™/g, "").trim() === resolvedTitle.toLowerCase().replace(/®|™/g, "").trim()
            );
            if (matchByName) activeCommId = matchByName.npCommunicationId;
        }

        if (activeCommId && !mergedGamesMap.has(activeCommId)) {
            mergedGamesMap.set(activeCommId, {
                npCommunicationId: activeCommId,
                name: resolvedTitle !== "Dashboard" ? resolvedTitle : "Unknown Game",
                platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
                art: null,
                playCount: 1,
                lastPlayed: new Date().toISOString(),
                playDurationRaw: null,
                hoursPlayed: 0,
                hoursFormatted: "0 hrs",
                progress: 0,
                earnedTotal: 0,
                definedTotal: 0,
                npServiceName: "trophy2"
            });
        }

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => {
            if (activeCommId) {
                if (a.npCommunicationId === activeCommId) return -1;
                if (b.npCommunicationId === activeCommId) return 1;
            }
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        if (resolvedTitle === "Dashboard" && allRecentGames.length > 0) {
            resolvedTitle = allRecentGames[0].name;
            activeCommId = allRecentGames[0].npCommunicationId || activeCommId;
        }

        const matchedGame = allRecentGames.find(g => {
            if (activeCommId && g.npCommunicationId === activeCommId) return true;
            const cleanGameName = g.name.replace(/®|™/g, "").toLowerCase().trim();
            const cleanActiveName = resolvedTitle.replace(/®|™/g, "").toLowerCase().trim();
            return cleanGameName === cleanActiveName && cleanActiveName !== "";
        }) || allRecentGames[0] || {};

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        
        let activeHunt = null;
        let mostRecentTrophies = [];
        const targetSyncId = activeCommId || matchedGame.npCommunicationId || allRecentGames[0]?.npCommunicationId;

        // Retention split
        const filteredAllGames = allRecentGames.filter(g => !BLACKLIST.some(f => g.name.toLowerCase().includes(f)));
        const permanentGames = filteredAllGames.filter(g => (g.progress || 0) >= MILESTONE_PROGRESS_THRESHOLD);
        const transientGames = filteredAllGames
            .filter(g => (g.progress || 0) < MILESTONE_PROGRESS_THRESHOLD)
            .slice(0, MAX_ROTATING_SUB50_GAMES);

        const combinedCandidateMap = new Map();
        const currentActiveObj = filteredAllGames.find(g => g.npCommunicationId === targetSyncId);
        if (currentActiveObj) {
            combinedCandidateMap.set(currentActiveObj.npCommunicationId, currentActiveObj);
        }

        permanentGames.forEach(g => {
            if (!combinedCandidateMap.has(g.npCommunicationId)) combinedCandidateMap.set(g.npCommunicationId, g);
        });

        transientGames.forEach(g => {
            if (!combinedCandidateMap.has(g.npCommunicationId)) combinedCandidateMap.set(g.npCommunicationId, g);
        });

        const gamesToDisplay = Array.from(combinedCandidateMap.values());
        const recentGames = [];

        for (const game of gamesToDisplay) {
            const recentGameRef = {
                name: game.name, 
                platform: game.platform,
                art: game.art, 
                progress: game.progress || 0, 
                ratio: `${game.earnedTotal || 0}/${game.definedTotal || 0}`, 
                hoursPlayed: game.hoursPlayed || 0,
                hoursFormatted: game.hoursFormatted || "0 hrs",
                amazonAffiliateUrl: generateAffiliateUrl(game.name), 
                npCommunicationId: game.npCommunicationId, 
                lastPlayed: game.lastPlayed,
                bootCount: game.playCount || "Unknown",
                isPermanent: (game.progress || 0) >= MILESTONE_PROGRESS_THRESHOLD
            };

            recentGames.push(recentGameRef);

            const isTargetHunt = (game.npCommunicationId === targetSyncId);
            
            // Fetch trophy lists & progress for active hunting title or top 2 titles
            if (recentGames.length <= 2 || isTargetHunt) {
                try {
                    await sleep(40);
                    
                    let opt = game.npServiceName ? { npServiceName: game.npServiceName } : { npServiceName: game.platform === "PS5" ? "trophy2" : "trophy" };
                    let groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>null);
                    
                    if (!groupsRes && opt.npServiceName === "trophy") {
                        opt.npServiceName = "trophy2";
                        groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>({}));
                    } else { groupsRes = groupsRes || {}; }

                    const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, game.npCommunicationId, "all", opt).catch(()=>({}));
                    const metaRes = await getTitleTrophies(auth, game.npCommunicationId, "all", opt).catch(()=>({}));
                    
                    const trophyGroups = groupsRes?.trophyGroups || [];
                    const earnedStatus = earnedRes?.trophies || [];
                    const meta = metaRes?.trophies || [];

                    if (meta.length > 0 && game.definedTotal === 0) {
                        game.definedTotal = meta.length;
                        recentGameRef.ratio = `${game.earnedTotal}/${game.definedTotal}`;
                    }
                    
                    const mappedTrophies = meta.map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        
                        // Parse incremental progress for PS5 sub-trophies (e.g. 15/50)
                        const currentVal = s?.progress || 0;
                        const targetVal = m.trophyProgressTargetValue || 0;
                        const hasSubProgress = targetVal > 0;
                        const progressRatio = hasSubProgress ? `${currentVal}/${targetVal}` : null;

                        return { 
                            trophyId: m.trophyId,
                            name: m.trophyName || "Unknown", 
                            platform: game.platform,
                            type: m.trophyType, 
                            icon: m.trophyIconUrl, 
                            description: m.trophyDetail || "Secret Objective", 
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare", 
                            earnedRate: m.trophyEarnedRate || "0.0",
                            hidden: m.trophyHidden || false,
                            groupName: group?.trophyGroupName || "Base Game", 
                            earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }) : null,
                            earnedAge: s?.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            // Sub-trophy data
                            hasSubProgress,
                            currentValue: currentVal, 
                            targetValue: targetVal,
                            subProgressRatio: progressRatio
                        };
                    });

                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ 
                            game: game.name, 
                            platform: game.platform,
                            name: t.name, 
                            icon: t.icon, 
                            timestamp: t.timestamp, 
                            date: t.earnedDate, 
                            age: t.earnedAge,
                            subProgress: t.subProgressRatio
                        });
                    });

                    if (isTargetHunt) {
                        const groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, game.npCommunicationId, opt).catch(()=>({}));
                        const earnedTrophiesOnly = mappedTrophies.filter(t => t.earned).sort((a,b) => a.timestamp - b.timestamp);
                        const firstBlood = earnedTrophiesOnly[0]?.timestamp || null;
                        const lastPop = earnedTrophiesOnly[earnedTrophiesOnly.length - 1]?.timestamp || null;
                        
                        let speedString = "N/A";
                        let hunterType = "Steady Hunter"; 

                        if (firstBlood && lastPop) {
                            const days = Math.ceil((lastPop - firstBlood) / (1000 * 60 * 60 * 24));
                            speedString = days === 0 ? "Started Today" : `${days} day${days > 1 ? 's' : ''}`;
                            if (days <= 10 && game.progress >= 50) hunterType = "Dead Set Hunter";
                            else if (days <= 14 && game.progress >= 80) hunterType = "Apex Predator";
                            else if (days > 30) hunterType = "Casual Pursuit";
                        }

                        activeHunt = { 
                            title: game.name, 
                            platform: game.platform,
                            hoursPlayed: game.hoursPlayed || 0,
                            hoursFormatted: game.hoursFormatted || "0 hrs",
                            amazonAffiliateUrl: generateAffiliateUrl(game.name), 
                            progress: game.progress || 0,
                            velocity: {
                                firstEarned: earnedTrophiesOnly[0]?.earnedDate || "Not Started",
                                huntingDuration: speedString,
                                hunterPersona: hunterType,
                                completionStatus: `${game.earnedTotal || 0}/${game.definedTotal || 0}`
                            },
                            groups: (groupEarningsRes?.trophyGroups || []).map(g => {
                                const gm = trophyGroups.find(tg => tg.trophyGroupId === g.trophyGroupId);
                                const gMax = (gm?.definedTrophies?.platinum || 0) + (gm?.definedTrophies?.gold || 0) + (gm?.definedTrophies?.silver || 0) + (gm?.definedTrophies?.bronze || 0);
                                return { 
                                    trophyGroupId: g.trophyGroupId,
                                    name: gm?.trophyGroupName || "Expansion Pack", 
                                    progress: g.progress || 0, 
                                    ratio: `${((g.earnedTrophies?.platinum||0) + (g.earnedTrophies?.gold||0) + (g.earnedTrophies?.silver||0) + (g.earnedTrophies?.bronze||0))}/${gMax}` 
                                };
                            }),
                            trophies: mappedTrophies, 
                            npCommunicationId: game.npCommunicationId
                        };
                    }
                } catch (e) { 
                    console.error(`[WARN] Trophy scan skipped for ${game.name}: ${e.message}`); 
                }
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
        const lastTrophyTime = mostRecentTrophies[0]?.timestamp || 0;
        const proofOfLife = (Date.now() - lastTrophyTime) < 1200000;

        const presence = {
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive || proofOfLife,
            currentGame: resolvedTitle,
            currentGameArt: matchedGame.art || twitchIntel?.gameArt || allRecentGames[0]?.art || null,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (proofOfLife ? "Active Hunting" : null) || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: matchedGame.npCommunicationId || null,
            platform: matchedGame.platform || rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            currentGameHours: matchedGame.hoursFormatted || "0 hrs",
            twitch: twitchIntel
        };

        const historicalStreamList = processStreamHistory(existingData?.streamHistory, twitchIntel);

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
            level: stats?.trophyLevel || 0, 
            region: region?.country || "US",
            trophySummary: { 
                platinum: stats?.earnedTrophies?.platinum||0, 
                gold: stats?.earnedTrophies?.gold||0, 
                silver: stats?.earnedTrophies?.silver||0, 
                bronze: stats?.earnedTrophies?.bronze||0, 
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0),
                trophyLevel: stats?.trophyLevel || 0
            },
            recentGames: recentGames,
            activeHunt, 
            mostRecentTrophies: mostRecentTrophies.slice(0, 10), 
            streamHistory: historicalStreamList,
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false })
        };
    } catch (e) { 
        console.warn(`[WARN] Fetch exception for ${gamerTag}:`, e.message);
        return generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData);
    }
}

// ----------------------------------------------------------------------------
// [SECTION: DATABASE & FILE I/O]
// ----------------------------------------------------------------------------
async function fetchFromFirebase() {
    console.log("[FIREBASE] Reading current state from Realtime Database...");
    try {
        const response = await fetch(`${FIREBASE_BASE_URL}.json`);
        if (!response.ok) {
            console.warn(`[FIREBASE GET WARN] Status HTTP ${response.status}`);
            return {};
        }
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.warn("[FIREBASE WARN] Could not read Firebase:", err.message);
        return {};
    }
}

async function syncNodeToFirebase(endpointPath, payload) {
    const targetUrl = `${FIREBASE_BASE_URL}/${endpointPath}.json`;
    const response = await fetch(targetUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase PUT failed at ${endpointPath} with HTTP ${response.status}: ${errorText}`);
    }
    console.log(`[FIREBASE SUCCESS] Pushed ${endpointPath} successfully.`);
}

function writeLocalFile(payload) {
    const targets = [LOCAL_JSON_PATH, ALT_LOCAL_JSON_PATH];
    for (const filePath of targets) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
            console.log(`[FILE SYSTEM SUCCESS] Clean payload written to ${filePath}`);
        } catch (err) {
            console.error(`[FILE SYSTEM ERROR] Failed writing to ${filePath}:`, err.message);
        }
    }
}

// ----------------------------------------------------------------------------
// [SECTION: MAIN EXECUTION PIPELINE]
// ----------------------------------------------------------------------------
async function main() {
    try {
        console.log("[INIT] Starting Squad Pack Sync Engine v16.5.0 (PS4/PS5 Filter, Hours & Sub-Trophies)...");

        const previousFirebaseData = await fetchFromFirebase();

        let finalData = { 
            gamertags: previousFirebaseData.gamertags || {}, 
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }), 
            engineVersion: "16.5.0",
            codeTimestamp: "Sunday, September 6, 2026 | 08:06 CDT"
        };

        const wildHorseAuth = await getAuthenticated("wildhorse_spirit", process.env.PSN_NPSSO_WEREWOLF);
        const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
        const masterAuth = wildHorseAuth || rayAuth;

        finalData.authDiagnostics = diagnosticReport;

        for (const [key, gamerTag] of Object.entries(SQUAD_GAMERTAGS)) {
            const accountId = ACCOUNT_IDS[key];
            const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'wildhorse_spirit' && wildHorseAuth) ? wildHorseAuth : masterAuth;
            
            const data = await getFullUserData(agentAuth, gamerTag, key, accountId, finalData.gamertags[gamerTag]);
            if (data) {
                finalData.gamertags[gamerTag] = data;
                await syncNodeToFirebase(`gamertags/${gamerTag}`, data);
            }
        }

        const lists = Object.values(finalData.gamertags).map(u => u.twitch?.followerNames || []).filter(l => l.length > 0);
        if (lists.length > 1) {
            const frequencyMap = {};
            lists.flat().forEach(name => { 
                if (typeof name === 'string' && name.trim()) {
                    frequencyMap[name] = (frequencyMap[name] || 0) + 1;
                }
            });
            finalData.mutualSquadFollowers = Object.entries(frequencyMap)
                .filter(([name, count]) => count >= 2)
                .sort((a,b) => b[1] - a[1])
                .map(([name, count]) => ({ username: name, sharedConnections: count }));
        }

        await syncNodeToFirebase("authDiagnostics", finalData.authDiagnostics);
        await syncNodeToFirebase("mutualSquadFollowers", finalData.mutualSquadFollowers);
        await syncNodeToFirebase("lastGlobalUpdate", finalData.lastGlobalUpdate);
        await syncNodeToFirebase("engineVersion", finalData.engineVersion);
        await syncNodeToFirebase("codeTimestamp", finalData.codeTimestamp);

        writeLocalFile(finalData);

        console.log(`[SUCCESS] PS4/PS5 & Playtime Telemetry Sync completed cleanly.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Execution failed: ${criticalError.message}`);
        process.exit(1);
    }
}

main();
