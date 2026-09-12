/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - 3-Tier Multi-Cadence Architecture:
 *              1. Light Presence: Checks online state, active game, and Twitch live telemetry.
 *              2. Targeted Active Game Delta: Syncs earned trophies for current active game.
 *              3. Heavy Audit: 24-Hr Staggered scan (Chicago Windows) to build global game skeletons.
 * Protocol Support: Works over HTTP & HTTPS via Direct REST PUT endpoints.
 * Analytics Tagging: Ready for GA4 (G-CTYHDF4MSD) deployment via GTM.
 * Version: 24.0.0 - Unified Exact Paths, Account IDs & Proof of Life
 * Date & Time Stamp: 2026-09-12 02:34:00 (24hr New York Time)
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
const psnApi = require("psn-api");

// Line 18: Destructure required methods from psn-api package
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

// Line 39: Target REST Database Endpoints & Filepaths
const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ROOT_LOCAL_JSON_PATH = path.join(__dirname, "..", "psn.json");

// Line 44: Squad Gamertag Mapping (Strict gamertags, no real names in gaming codes)
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

// Line 59: Numerical Account IDs for direct Sony backend telemetry access
const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: ""
};

// Line 67: Heavy audit staggered windows (24hr Chicago Time)
const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT
    ray: 4,               // 04:00 AM CDT (OneLIVIDMAN)
    marc: 12,             // 12:00 PM CDT (DesdemonaTiger)
    darkwing: 16          // 04:00 PM CDT (Darkwing69420)
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
// [SECTION: HELPER UTILITIES & FORMATTING]
// ----------------------------------------------------------------------------
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getChicagoHour() {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hourCycle: "h23"
    });
    return parseInt(formatter.format(new Date()), 10);
}

function shouldRunHeavyAudit(userKey, existingData, isManualRun = false) {
    if (isManualRun) return true;
    const scheduledHour = HEAVY_SCHEDULE_HOURS[userKey];
    if (scheduledHour === undefined) return false;

    const currentHour = getChicagoHour();
    if (currentHour !== scheduledHour) return false;

    const lastHeavy = existingData?.lastHeavySyncTimestamp 
        ? new Date(existingData.lastHeavySyncTimestamp).getTime() 
        : 0;
    const hoursSinceLast = (Date.now() - lastHeavy) / (1000 * 60 * 60);
    return hoursSinceLast >= 20;
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

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

    return { totalHours: fractionalHours, hoursFormatted, rawDuration: durationStr };
}

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

// ----------------------------------------------------------------------------
// [SECTION: TWITCH TELEMETRY FETCHER]
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
        return intel; 
    }
}

// ----------------------------------------------------------------------------
// [SECTION: PSN AUTHENTICATION]
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
        npssoStatus: "PUBLIC_GUEST_SYNC",
        handshakeText: `${gamerTag.toUpperCase()} HANDSHAKE: LIVE VIA MASTER`,
        handshakeState: "LIVE",
        currentGame: twitchIntel?.game || "Dashboard", 
        currentGameArt: twitchIntel?.gameArt || null,
        currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
        amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), 
        bio: twitchIntel?.bio || "Official Pack Member Profile",
        twitch: twitchIntel, 
        streamHistory: historicalStreamList,
        lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }), 
        gamesPlayed: existingData?.gamesPlayed || 0, plus: false, level: existingData?.level || 0, region: "US", note: "Telemetry Synced via Squad Master Key", devices: [],
        blockedAccountsCount: 0, inboundFriendRequestsCount: 0,
        trophySummary: existingData?.trophySummary || { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
        recentGames: existingData?.recentGames || [], 
        activeHunt: existingData?.activeHunt || null, 
        mostRecentTrophies: (existingData?.mostRecentTrophies || []).slice(0, 10)
    };
}

async function resolveAccountIdFromSearch(auth, gamerTag) {
    const searchDomains = ["domain:conceptCollapse", "domain:socialAllAccounts"];
    for (const domain of searchDomains) {
        try {
            console.log(`[PSN SEARCH] Universal Search for ${gamerTag} under ${domain}...`);
            const searchResults = await makeUniversalSearch(auth, gamerTag, domain);
            const domainResults = searchResults?.searchResults?.[0]?.results || [];
            const match = domainResults.find(r => 
                r.socialMetadata?.onlineId?.toLowerCase() === gamerTag.toLowerCase() ||
                r.onlineId?.toLowerCase() === gamerTag.toLowerCase()
            );

            const discoveredId = match?.socialMetadata?.accountId || match?.accountId;
            if (discoveredId) {
                console.log(`[PSN SEARCH SUCCESS] Resolved Account ID for ${gamerTag}: ${discoveredId}`);
                return discoveredId;
            }
        } catch (e) {
            console.warn(`[PSN SEARCH WARN] Search on ${domain} failed for ${gamerTag}:`, e.message);
        }
    }
    return "";
}

// ----------------------------------------------------------------------------
// [SECTION: GLOBAL GAME SKELETON HANDLER]
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, existingGames) {
    if (!commId || commId === "Dashboard") return;
    if (existingGames && existingGames[commId]) return;

    try {
        console.log(`[SKELETON PULL] Generating global game skeleton for ${gameName} (${commId})...`);
        const opt = { npServiceName: platform === "PS5" ? "trophy2" : "trophy" };
        const metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => ({ trophies: [] }));
        const groupsRes = await getTitleTrophyGroups(auth, commId, opt).catch(() => ({ trophyGroups: [] }));

        const skeletonData = {
            commId: commId,
            name: gameName,
            platform: platform,
            totalTrophies: metaRes?.trophies?.length || 0,
            trophies: (metaRes?.trophies || []).map(t => ({
                trophyId: t.trophyId,
                name: t.trophyName,
                type: t.trophyType,
                icon: t.trophyIconUrl,
                detail: t.trophyDetail || "Secret Objective",
                groupId: t.trophyGroupId || "default"
            })),
            groups: groupsRes?.trophyGroups || [],
            createdTimestamp: new Date().toISOString()
        };

        await syncNodeToFirebase(`games/${commId}`, skeletonData);
        if (existingGames) existingGames[commId] = skeletonData;
        console.log(`[SKELETON SUCCESS] Stored shared skeleton for ${gameName}.`);
    } catch (err) {
        console.warn(`[SKELETON WARN] Could not store skeleton for ${commId}:`, err.message);
    }
}

// ----------------------------------------------------------------------------
// [SECTION: CORE USER TELEMETRY ENGINE]
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
            if (resolvedTargetId) {
                ACCOUNT_IDS[userKey] = resolvedTargetId;
            }
        }
    }

    if (!auth || !resolvedTargetId) {
        if (existingData && existingData.trophySummary) {
            existingData.online = !!twitchIntel?.isLive;
            existingData.twitch = twitchIntel;
            existingData.streamHistory = processStreamHistory(existingData.streamHistory, twitchIntel);
            existingData.lastUpdated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
            return existingData;
        }
        return generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData);
    }

    try {
        const isMasterSubject = (ACCOUNT_IDS.ray === resolvedTargetId || userKey === 'wildhorse_spirit');
        const presenceId = isMasterSubject ? "me" : resolvedTargetId;
        
        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch(e) {}

        let region = { country: "US", language: "en" };
        if (isMasterSubject) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
        }

        // 1. PULL LIVE PRESENCE FIRST
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId || null;
        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");

        const isPlayerOnline = (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive;

        // 2. CHECK HEAVY AUDIT CADENCE
        const runHeavy = shouldRunHeavyAudit(userKey, existingData, isManualRun);

        let sortedTitles = [];
        let totalGamesPlayedCount = existingData?.gamesPlayed || 0;
        let telemetryData = [];

        if (runHeavy || !existingData?.recentGames?.length) {
            console.log(`[HEAVY SYNC] Running full audit for ${gamerTag}...`);
            const titlesRes = await getUserTitles(auth, resolvedTargetId, { limit: 100 }).catch(() => ({}));
            sortedTitles = (titlesRes?.trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
            totalGamesPlayedCount = titlesRes?.totalItemCount || sortedTitles.length;

            try {
                const history = await getRecentlyPlayedGames(auth, resolvedTargetId, { limit: 25 });
                telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
            } catch (e) {}
        } else {
            console.log(`[LIGHT SYNC] Cadence active for ${gamerTag}. Relying on presence & active game delta.`);
            sortedTitles = existingData?.recentGames || [];
        }

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

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

        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            if (!commId) return;
            const existing = mergedGamesMap.get(commId) || {
                npCommunicationId: commId,
                name: t.trophyTitleName || t.name || "Unknown Game",
                platform: normalizePlatform(t),
                art: t.trophyTitleIconUrl || t.art || null,
                playCount: t.playCount || 1,
                lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null,
                playDurationRaw: null,
                hoursPlayed: t.hoursPlayed || 0,
                hoursFormatted: t.hoursFormatted || "0 hrs"
            };

            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.platform = normalizePlatform(t);
            existing.progress = t.progress || 0;
            existing.earnedTotal = (t.earnedTrophies?.platinum||0) + (t.earnedTrophies?.gold||0) + (t.earnedTrophies?.silver||0) + (t.earnedTrophies?.bronze||0);
            existing.definedTotal = (t.definedTrophies?.platinum||0) + (t.definedTrophies?.gold||0) + (t.definedTrophies?.silver||0) + (t.definedTrophies?.bronze||0);
            existing.npServiceName = t.npServiceName || (existing.platform === "PS5" ? "trophy2" : "trophy");

            mergedGamesMap.set(commId, existing);
        });

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

        // 3. STORE GLOBAL SKELETON IF MISSING
        if (activeCommId && activeCommId !== "Dashboard") {
            await ensureGameSkeleton(auth, activeCommId, resolvedTitle, matchedGame.platform || "PS5", globalGames);
        }

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        
        let activeHunt = existingData?.activeHunt || null;
        let mostRecentTrophies = existingData?.mostRecentTrophies || [];
        const targetSyncId = activeCommId || matchedGame.npCommunicationId || allRecentGames[0]?.npCommunicationId;

        // TARGETED TROPHY DELTA: Only pull trophies if online & playing, or during heavy run
        if ((isPlayerOnline && targetSyncId) || runHeavy) {
            try {
                await sleep(40);
                const currentPlatform = matchedGame.platform || "PS5";
                let opt = { npServiceName: currentPlatform === "PS5" ? "trophy2" : "trophy" };
                
                let groupsRes = await getTitleTrophyGroups(auth, targetSyncId, opt).catch(() => null);
                if (!groupsRes && opt.npServiceName === "trophy") {
                    opt.npServiceName = "trophy2";
                    groupsRes = await getTitleTrophyGroups(auth, targetSyncId, opt).catch(() => ({}));
                } else {
                    groupsRes = groupsRes || {};
                }

                const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, targetSyncId, "all", opt).catch(() => ({}));
                const metaRes = await getTitleTrophies(auth, targetSyncId, "all", opt).catch(() => ({}));

                const trophyGroups = groupsRes?.trophyGroups || [];
                const earnedStatus = earnedRes?.trophies || [];
                const meta = metaRes?.trophies || [];

                const mappedTrophies = meta.map(m => {
                    const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                    const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                    const currentVal = s?.progress || 0;
                    const targetVal = m.trophyProgressTargetValue || 0;
                    const hasSubProgress = targetVal > 0;
                    const progressRatio = hasSubProgress ? `${currentVal}/${targetVal}` : null;

                    return { 
                        trophyId: m.trophyId,
                        name: m.trophyName || "Unknown", 
                        platform: currentPlatform,
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
                        hasSubProgress,
                        currentValue: currentVal, 
                        targetValue: targetVal,
                        subProgressRatio: progressRatio
                    };
                });

                const earnedOnly = mappedTrophies.filter(t => t.earned);
                if (earnedOnly.length > 0) {
                    mostRecentTrophies = earnedOnly.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
                }

                const groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, targetSyncId, opt).catch(() => ({}));
                const earnedTrophiesAsc = [...earnedOnly].sort((a,b) => a.timestamp - b.timestamp);
                const firstBlood = earnedTrophiesAsc[0]?.timestamp || null;
                const lastPop = earnedTrophiesAsc[earnedTrophiesAsc.length - 1]?.timestamp || null;
                
                let speedString = "N/A";
                let hunterType = "Steady Hunter"; 
                if (firstBlood && lastPop) {
                    const days = Math.ceil((lastPop - firstBlood) / (1000 * 60 * 60 * 24));
                    speedString = days === 0 ? "Started Today" : `${days} day${days > 1 ? 's' : ''}`;
                    if (days <= 10 && (matchedGame.progress || 0) >= 50) hunterType = "Dead Set Hunter";
                    else if (days <= 14 && (matchedGame.progress || 0) >= 80) hunterType = "Apex Predator";
                    else if (days > 30) hunterType = "Casual Pursuit";
                }

                activeHunt = { 
                    title: matchedGame.name || resolvedTitle, 
                    platform: currentPlatform,
                    hoursPlayed: matchedGame.hoursPlayed || 0,
                    hoursFormatted: matchedGame.hoursFormatted || "0 hrs",
                    amazonAffiliateUrl: generateAffiliateUrl(matchedGame.name), 
                    progress: matchedGame.progress || 0,
                    velocity: {
                        firstEarned: earnedTrophiesAsc[0]?.earnedDate || "Not Started",
                        huntingDuration: speedString,
                        hunterPersona: hunterType,
                        completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`
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
                    npCommunicationId: targetSyncId
                };
            } catch (err) {
                console.warn(`[ACTIVE HUNT WARN] Targeted delta check failed: ${err.message}`);
            }
        }

        // PROOF OF LIFE (Last trophy unlocked within 20 mins)
        const lastTrophyTime = mostRecentTrophies[0]?.timestamp || 0;
        const proofOfLife = (Date.now() - lastTrophyTime) < 1200000;

        const isFullyOnline = isPlayerOnline || proofOfLife;

        const presence = {
            online: isFullyOnline,
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
            level: stats?.trophyLevel || existingData?.level || 0, 
            region: region?.country || "US",
            trophySummary: { 
                platinum: stats?.earnedTrophies?.platinum || existingData?.trophySummary?.platinum || 0, 
                gold: stats?.earnedTrophies?.gold || existingData?.trophySummary?.gold || 0, 
                silver: stats?.earnedTrophies?.silver || existingData?.trophySummary?.silver || 0, 
                bronze: stats?.earnedTrophies?.bronze || existingData?.trophySummary?.bronze || 0, 
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0) || existingData?.trophySummary?.total || 0, 
                trophyLevel: stats?.trophyLevel || existingData?.trophySummary?.trophyLevel || 0
            },
            recentGames: allRecentGames.slice(0, 10), 
            activeHunt, 
            mostRecentTrophies: mostRecentTrophies.slice(0, 10), 
            streamHistory: historicalStreamList,
            lastHeavySyncTimestamp: runHeavy ? new Date().toISOString() : (existingData?.lastHeavySyncTimestamp || null),
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false })
        };
    } catch (e) { 
        console.warn(`[WARN] Fetch exception for ${gamerTag}:`, e.message);
        return generatePrivateProfileFallback(gamerTag, userKey, twitchIntel, existingData);
    }
}

// ----------------------------------------------------------------------------
// [SECTION: DATABASE REST I/O]
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
    const targets = [LOCAL_JSON_PATH, ROOT_LOCAL_JSON_PATH];
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
// [SECTION: MAIN DISPATCH ENGINE]
// ----------------------------------------------------------------------------
async function main() {
    try {
        console.log("[INIT] Starting Squad Pack Sync Engine v24.0.0...");

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};
        const isManualRun = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

        let finalData = { 
            gamertags: previousFirebaseData.gamertags || {}, 
            games: globalGames,
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }), 
            engineVersion: "24.0.0",
            codeTimestamp: "Saturday, September 12, 2026 | 02:34 EDT"
        };

        const wildHorseAuth = await getAuthenticated("wildhorse_spirit", process.env.PSN_NPSSO_WEREWOLF);
        const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
        const masterAuth = wildHorseAuth || rayAuth;

        finalData.authDiagnostics = diagnosticReport;

        for (const [key, gamerTag] of Object.entries(SQUAD_GAMERTAGS)) {
            const accountId = ACCOUNT_IDS[key];
            const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'wildhorse_spirit' && wildHorseAuth) ? wildHorseAuth : masterAuth;
            
            const data = await getFullUserData(agentAuth, gamerTag, key, accountId, finalData.gamertags[gamerTag], isManualRun, globalGames);
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

        console.log(`[SUCCESS] PSN Engine execution finished cleanly.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Execution failed: ${criticalError.message}`);
        process.exit(1);
    }
}

main();
