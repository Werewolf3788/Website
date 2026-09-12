/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - Full Relational Architecture:
 *              1. Shared Game Skeleton (`games/{commId}`): Stores canonical title
 *                 metadata, high-res poster art, trophy definitions, DLC groups,
 *                 rarity, hidden flags, and PS5 sub-progress target values.
 *              2. Lean User Node (`gamertags/{player}`): Tracks live presence,
 *                 dynamic player progress, earned trophy states, and timestamps.
 *              3. Cumulative Session Engine: Tracks live session hours and persists
 *                 cumulative play duration per title across launches.
 *              4. PS5 Sub-Progress Engine: Calculates accurate `subProgressRatio`
 *                 for all PS5 versions and records real-time completion deltas.
 * Protocol Support: Works over HTTP & HTTPS via Direct REST PUT endpoints.
 * Analytics Tagging: Ready for GA4 (G-CTYHDF4MSD) deployment via GTM.
 * Version: 27.0.0 - Unified Canonical Posters, Full Skeleton & Session Telemetry
 * Date & Time Stamp: 2026-09-12 11:33:00 (America/Chicago)
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
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
    makeUniversalSearch
} = psnApi;

const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ROOT_LOCAL_JSON_PATH = path.join(__dirname, "..", "psn.json");

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

const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT
    ray: 4,               // 04:00 AM CDT (OneLIVIDMAN)
    marc: 12,             // 12:00 PM CDT (DesdemonaTiger)
    darkwing: 16          // 04:00 PM CDT (Darkwing69420)
};

const AMAZON_TAG = "moviesanywhere02-20";
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];

let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION: TIME & SESSION HELPERS]
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

function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hrs`;
    return `${minutes} mins`;
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
            console.log(`[SESSION CLOSED] ${session.title} ended. Added ${sessionElapsed}s. Total: ${session.totalFormatted}`);
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
            console.log(`[SESSION STARTED] First recorded session for ${activeTitle} (${activeCommId}).`);
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
        playSessions: existingData?.playSessions || {},
        currentGameHours: "0 hrs",
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
// [SECTION: GLOBAL CANONICAL GAME SKELETON HANDLER]
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, existingGames) {
    if (!commId || commId === "Dashboard") return null;
    
    // Check if skeleton exists
    if (existingGames && existingGames[commId]) {
        // If skeleton is missing poster art, update it
        if (!existingGames[commId].posterArt && posterArt) {
            existingGames[commId].posterArt = posterArt;
            await syncNodeToFirebase(`games/${commId}/posterArt`, posterArt);
            console.log(`[SKELETON ART UPDATE] Added missing cover art for ${gameName} (${commId}).`);
        }
        return existingGames[commId];
    }

    try {
        console.log(`[SKELETON PULL] Generating canonical game skeleton for ${gameName} (${commId})...`);
        const opt = { npServiceName: platform === "PS5" ? "trophy2" : "trophy" };
        
        let metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => null);
        if (!metaRes && opt.npServiceName === "trophy") {
            opt.npServiceName = "trophy2";
            metaRes = await getTitleTrophies(auth, commId, "all", opt).catch(() => ({ trophies: [] }));
        } else {
            metaRes = metaRes || { trophies: [] };
        }

        const groupsRes = await getTitleTrophyGroups(auth, commId, opt).catch(() => ({ trophyGroups: [] }));

        const skeletonData = {
            commId: commId,
            name: gameName,
            platform: platform,
            posterArt: posterArt || null,
            totalTrophies: metaRes?.trophies?.length || 0,
            trophies: (metaRes?.trophies || []).map(t => ({
                trophyId: t.trophyId,
                name: t.trophyName,
                type: t.trophyType,
                icon: t.trophyIconUrl,
                detail: t.trophyDetail || "Secret Objective",
                groupId: t.trophyGroupId || "default",
                targetValue: t.trophyProgressTargetValue || 0,
                rarity: t.trophyRare !== undefined ? `${t.trophyRare}%` : "Rare",
                earnedRate: t.trophyEarnedRate || "0.0",
                hidden: t.trophyHidden || false
            })),
            groups: (groupsRes?.trophyGroups || []).map(g => ({
                trophyGroupId: g.trophyGroupId,
                name: g.trophyGroupName || "Base Game",
                definedTrophies: g.definedTrophies || {}
            })),
            createdTimestamp: new Date().toISOString()
        };

        await syncNodeToFirebase(`games/${commId}`, skeletonData);
        if (existingGames) existingGames[commId] = skeletonData;
        console.log(`[SKELETON SUCCESS] Stored shared skeleton with cover art for ${gameName} (${commId}).`);
        return skeletonData;
    } catch (err) {
        console.warn(`[SKELETON WARN] Could not store skeleton for ${commId}:`, err.message);
        return null;
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

        // 1. LIVE PRESENCE DISCOVERY
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        const isPlayerOnline = (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive;
        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId || null;
        
        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game : (activeGameInfo.titleName || null);

        // 2. AUDIT CADENCE
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
            console.log(`[LIGHT SYNC] Cadence active for ${gamerTag}. Syncing delta.`);
            sortedTitles = existingData?.recentGames || [];
        }

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            mergedGamesMap.set(g.npCommunicationId, {
                ...g,
                npCommunicationId: g.npCommunicationId,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: g.image?.url || null,
                playCount: g.playCount || 1,
                lastPlayed: g.lastPlayedDateTime || null,
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
                lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
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

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        if (!resolvedTitle) {
            if (isPlayerOnline && activeCommId && mergedGamesMap.has(activeCommId)) {
                resolvedTitle = mergedGamesMap.get(activeCommId).name;
            } else if (isPlayerOnline && activeCommId) {
                resolvedTitle = "Active PlayStation Game";
            } else {
                resolvedTitle = "Dashboard";
            }
        }

        // Multi-Source Poster Art Resolution
        let matchedArt = null;
        if (activeCommId && mergedGamesMap.has(activeCommId)) {
            matchedArt = mergedGamesMap.get(activeCommId).art;
        }
        if (!matchedArt && twitchIntel?.isLive) {
            matchedArt = twitchIntel.gameArt;
        }
        if (!matchedArt && isPlayerOnline && allRecentGames.length > 0) {
            const match = allRecentGames.find(g => g.name.toLowerCase().replace(/®|™/g, "").trim() === resolvedTitle.toLowerCase().replace(/®|™/g, "").trim());
            matchedArt = match?.art || allRecentGames[0]?.art;
        }

        // 3. PERSISTENT PLAY SESSION ENGINE
        const { playSessions, currentGameDurationFormatted } = updateGameSessionTracking(
            existingData,
            activeCommId,
            resolvedTitle,
            isPlayerOnline
        );

        // 4. CANONICAL SKELETON STORAGE WITH COVER ART
        const targetSyncId = activeCommId || allRecentGames[0]?.npCommunicationId;
        const matchedGame = (targetSyncId && mergedGamesMap.get(targetSyncId)) || {};
        const currentPlatform = normalizePlatform(matchedGame);
        const resolvedPoster = matchedArt || matchedGame.art || allRecentGames[0]?.art || null;

        let skeleton = null;
        if (targetSyncId && targetSyncId !== "Dashboard") {
            skeleton = await ensureGameSkeleton(auth, targetSyncId, resolvedTitle, currentPlatform, resolvedPoster, globalGames);
        }

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;
        let mostRecentTrophies = existingData?.mostRecentTrophies || [];

        // 5. USER ACTIVE HUNT DELTA (Lean Player Node)
        if ((isPlayerOnline && targetSyncId) || runHeavy) {
            try {
                await sleep(40);
                let opt = { npServiceName: currentPlatform === "PS5" ? "trophy2" : "trophy" };
                
                let groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, targetSyncId, opt).catch(() => null);
                if (!groupEarningsRes && opt.npServiceName === "trophy") {
                    opt.npServiceName = "trophy2";
                    groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, targetSyncId, opt).catch(() => ({}));
                } else {
                    groupEarningsRes = groupEarningsRes || {};
                }

                const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, targetSyncId, "all", opt).catch(() => ({}));
                const earnedStatus = earnedRes?.trophies || [];

                const skeletonTrophies = skeleton?.trophies || [];
                const userTrophyProgressMap = {};
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
                    }

                    userTrophyProgressMap[s.trophyId] = {
                        earned: !!s.earned,
                        earnedDate: s.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }) : null,
                        earnedAge: s.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                        timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                        currentValue: currentVal,
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
                            earnedDate: userTrophyProgressMap[s.trophyId].earnedDate,
                            earnedAge: userTrophyProgressMap[s.trophyId].earnedAge
                        });
                    }
                });

                if (earnedTrophiesList.length > 0) {
                    mostRecentTrophies = earnedTrophiesList.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
                }

                const earnedAsc = [...earnedTrophiesList].sort((a,b) => a.timestamp - b.timestamp);
                const firstBlood = earnedAsc[0]?.timestamp || null;
                const lastPop = earnedAsc[earnedAsc.length - 1]?.timestamp || null;
                
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
                    npCommunicationId: targetSyncId,
                    title: matchedGame.name || resolvedTitle, 
                    platform: currentPlatform,
                    art: resolvedPoster,
                    hoursPlayed: currentGameDurationFormatted,
                    hoursFormatted: currentGameDurationFormatted,
                    amazonAffiliateUrl: generateAffiliateUrl(matchedGame.name || resolvedTitle), 
                    progress: matchedGame.progress || 0,
                    velocity: {
                        firstEarned: earnedAsc[0]?.earnedDate || "Not Started",
                        huntingDuration: speedString,
                        hunterPersona: hunterType,
                        completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`
                    },
                    groupEarnings: groupEarningsRes?.trophyGroups || [],
                    userTrophies: userTrophyProgressMap
                };
            } catch (err) {
                console.warn(`[ACTIVE HUNT WARN] Targeted delta check failed: ${err.message}`);
            }
        }

        const lastTrophyTime = mostRecentTrophies[0]?.timestamp || 0;
        const proofOfLife = (Date.now() - lastTrophyTime) < 1200000;
        const isFullyOnline = isPlayerOnline || proofOfLife;

        const presence = {
            online: isFullyOnline,
            currentGame: resolvedTitle,
            currentGameArt: resolvedPoster,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (proofOfLife ? "Active Hunting" : null) || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: activeCommId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            currentGameHours: currentGameDurationFormatted,
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
            playSessions: playSessions,
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
        console.log("[INIT] Starting Squad Pack Sync Engine v27.0.0...");

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};
        const isManualRun = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

        let finalData = { 
            gamertags: previousFirebaseData.gamertags || {}, 
            games: globalGames, 
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }), 
            engineVersion: "27.0.0",
            codeTimestamp: "Saturday, September 12, 2026 | 11:33 CDT"
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
