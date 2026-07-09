/*
 * ==========================================
 * --- PRECISION INTEGRITY PROTOCOL ---
 * Project: Kevin's Official Pack Sync Engine (Firestore Subcollection Stream)
 * Version: 15.1.0 - Granular Subcollection Architecture
 * NYT TIMESTAMP: Thu, July 9, 2026, 8:15 AM EDT
 * Compatibility: Node.js v20+, Cloud Firestore REST API
 * Note: NO STRIPPING, NO COMPRESSING. ALL SQUAD LOGIC & ENDPOINTS INTACT.
 * Updates: Separated root user stats from individual game records. Writes games 
 * as clean, distinct documents inside a nested 'games' subcollection path.
 * ==========================================
 */

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
    getAccountDevices,
    getUserBlockedAccountIds,
    getUserFriendsRequests
} = psnApi;

const fs = require("fs");
const path = require("path");

const FIRESTORE_BASE_URL = "https://firestore.googleapis.com/v1/projects/game-tracker-5b2ef/databases/(default)/documents/artifacts/game-tracker-5b2ef/data/public/user";

/* * ==========================================
 * 🚨 AUGUST 2026 MIGRATION PROTOCOL 🚨
 * ==========================================
 */
const SQUAD_MAP = {
    werewolf: "werewolf3788",
    kfruti: "wildhorse_spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    mike: "IlIMjolnirIlI",
    katy: "Balto20_01",
    marc: "DesdemonaTiger",
    seth: "joe-punk_"
};

const PERSONA_CONFIG = {
    "Kevin": ["werewolf", "kfruti"], 
    "Ray": ["ray"],
    "TJ": ["darkwing"],
    "Mike": ["mike"],
    "Katy": ["katy"],
    "Marc": ["marc"],
    "Seth": ["seth"]
};

const TWITCH_MAP = {
    werewolf: "werewolf3788",
    kfruti: "werewolf3788",
    ray: "raymystyro",
    darkwing: "terrdog420",
    mike: "mjolnirgaming",
    seth: "phoenix_darkfire"
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    kfruti: "",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    mike: "",
    katy: "",
    marc: "",
    seth: ""
};

const AMAZON_TAG = "psngaming-20";
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const DATA_PATH = path.join(__dirname, "psn_data.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

let tokenStore = { werewolf: {}, ray: {} };
let diagnosticReport = { werewolf_active: "no", ray_active: "no", lastCheck: new Date().toLocaleString() };

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    let diff = now - past;
    if (diff < 0) diff = 0;

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
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years} years, ${months} months`;
    return `${months} months`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            const res = await fetch(`https://decapi.me/twitch/${endpoint}/${cleanUser}`);
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
        const fCount = await cleanFetch("followcount");
        intel.followers = fCount || "0";
        const lFollow = await cleanFetch("latest_follower");
        intel.latestFollower = lFollow || "None";
        const listRes = await cleanFetch("followers?limit=100");
        if (listRes) { intel.followerNames = listRes.split(", ").map(n => n.trim()); }
        intel.avatar = await cleanFetch("avatar");
        intel.age = await cleanFetch("accountage") || "Unknown";
        intel.bio = await cleanFetch("description");
        intel.statusMessage = await cleanFetch("title");
        intel.uptime = await cleanFetch("uptime");
        intel.viewers = await cleanFetch("viewercount") || "0";
        intel.subCount = await cleanFetch("subcount") || "0";
        intel.chatRules = await cleanFetch("chat_rules");
        intel.channelCreationRaw = await cleanFetch("creation");
        return intel;
    } catch (e) { return intel; }
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
            return { accessToken: currentUserTokens.accessToken };
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
            return refreshed;
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
            return auth;
        } catch (e) { 
            diagnosticReport[`${userKey}_active`] = "no";
            return null; 
        }
    }
    diagnosticReport[`${userKey}_active`] = "no";
    return null;
}

function processStreamHistory(existingHistory, twitchIntel) {
    let history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    if (twitchIntel?.isLive && twitchIntel?.game) {
        const currentGame = twitchIntel.game.trim();
        history = history.filter(g => g.toLowerCase() !== currentGame.toLowerCase());
        history.unshift(currentGame);
        if (history.length > 15) history = history.slice(0, 15);
    }
    return history;
}

function generatePrivateProfileFallback(label, userKey, twitchIntel, existingData) {
    const historicalStreamList = processStreamHistory(existingData?.streamHistory, twitchIntel);
    return {
        onlineId: SQUAD_MAP[userKey] || label, online: !!twitchIntel?.isLive, accountId: ACCOUNT_IDS[userKey] || "",
        currentGame: twitchIntel?.game || "Dashboard", currentGameArt: twitchIntel?.gameArt || null,
        currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
        amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), bio: twitchIntel?.bio || "Official Pack Member Profile",
        twitch: twitchIntel, streamHistory: historicalStreamList, lastUpdated: new Date().toLocaleString(), 
        gamesPlayed: 0, plus: false, level: 0, region: "US", note: "PSN Profile Hidden/Private", devices: [],
        blockedAccountsCount: 0, inboundFriendRequestsCount: 0,
        trophySummary: { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
        recentGames: [], activeHunt: null, mostRecentTrophies: [], fullLibrary: []
    };
}

async function getFullUserData(auth, label, userKey, targetId, existingData) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    let resolvedTargetId = targetId;

    if (!resolvedTargetId && auth?.accessToken) {
        try {
            const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString());
            resolvedTargetId = payload.account_id || "";
        } catch(e) {}
    }

    if (!auth || !resolvedTargetId) {
        if (existingData && existingData.trophySummary) {
            existingData.online = !!twitchIntel?.isLive;
            existingData.twitch = twitchIntel;
            existingData.streamHistory = processStreamHistory(existingData.streamHistory, twitchIntel);
            existingData.lastUpdated = new Date().toLocaleString();
            return existingData;
        }
        return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData);
    }

    try {
        const profile = await getProfileFromAccountId(auth, resolvedTargetId).catch(() => null);
        if (!profile) return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData);

        let region = { country: "US", language: "en" };
        let friendsList = []; let deviceList = []; let blockedList = []; let inboundFriendRequests = [];
        
        if (ACCOUNT_IDS.werewolf === resolvedTargetId || ACCOUNT_IDS.ray === resolvedTargetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try { friendsList = await getUserFriendsAccountIds(auth, "me") || []; } catch(e) {}
            try { deviceList = await getAccountDevices(auth) || []; } catch(e) {}
            try { blockedList = await getUserBlockedAccountIds(auth) || []; } catch(e) {}
            try { inboundFriendRequests = await getUserFriendsRequests(auth) || []; } catch(e) {}
        }
        
        const presenceId = (ACCOUNT_IDS.werewolf === resolvedTargetId || ACCOUNT_IDS.ray === resolvedTargetId) ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        
        const titlesRes = await getUserTitles(auth, resolvedTargetId, { limit: 800 }).catch(() => ({}));
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
            const history = await getRecentlyPlayedGames(auth, resolvedTargetId, { limit: 200 });
            telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
        } catch (e) {}

        const mergedGamesMap = new Map();
        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            mergedGamesMap.set(g.npCommunicationId, {
                npCommunicationId: g.npCommunicationId, name: g.name || "Unknown Game",
                art: g.image?.url || null, playCount: g.playCount, lastPlayed: g.lastPlayedDateTime || null,
                progress: 0, earnedTotal: 0, definedTotal: 0
            });
        });

        sortedTitles.forEach(t => {
            if (!t.npCommunicationId) return;
            const existing = mergedGamesMap.get(t.npCommunicationId) || {
                npCommunicationId: t.npCommunicationId, name: t.trophyTitleName || "Unknown Game",
                art: t.trophyTitleIconUrl || null, lastPlayed: t.lastUpdatedDateTime || null
            };
            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.progress = t.progress || 0;
            existing.earnedTotal = (t.earnedTrophies?.platinum||0) + (t.earnedTrophies?.gold||0) + (t.earnedTrophies?.silver||0) + (t.earnedTrophies?.bronze||0);
            existing.definedTotal = (t.definedTrophies?.platinum||0) + (t.definedTrophies?.gold||0) + (t.definedTrophies?.silver||0) + (t.definedTrophies?.bronze||0);
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

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => {
            if (activeCommId) {
                if (a.npCommunicationId === activeCommId) return -1;
                if (b.npCommunicationId === activeCommId) return 1;
            }
            return (b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0) - (a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0);
        });

        const matchedGame = allRecentGames.find(g => activeCommId && g.npCommunicationId === activeCommId) || allRecentGames[0] || {};
        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        
        const recentGames = []; let activeHunt = null; let mostRecentTrophies = [];
        const targetSyncId = activeCommId || matchedGame.npCommunicationId || allRecentGames[0]?.npCommunicationId;
        let gamesToDeepScan = 20;

        for (const game of allRecentGames.slice(0, 30)) { 
            if (BLACKLIST.some(f => game.name.toLowerCase().includes(f))) continue;
            const recentGameRef = { ...game, ratio: `${game.earnedTotal}/${game.definedTotal}`, amazonAffiliateUrl: generateAffiliateUrl(game.name), bootCount: game.playCount || "Unknown" };
            if (recentGames.length < 6) { recentGames.push(recentGameRef); }

            if (gamesToDeepScan > 0 || game.npCommunicationId === targetSyncId) {
                if (game.npCommunicationId !== targetSyncId) gamesToDeepScan--;
                try {
                    await sleep(50);
                    let opt = game.npServiceName ? { npServiceName: game.npServiceName } : { npServiceName: "trophy" };
                    let groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>null);
                    if (!groupsRes) { opt.npServiceName = "trophy2"; groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>({})); }
                    const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, game.npCommunicationId, "all", opt).catch(()=>({}));
                    const metaRes = await getTitleTrophies(auth, game.npCommunicationId, "all", opt).catch(()=>({}));
                    
                    const trophyGroups = groupsRes?.trophyGroups || [];
                    const earnedStatus = earnedRes?.trophies || [];
                    const meta = metaRes?.trophies || [];

                    const mappedTrophies = meta.map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        return { 
                            ...m, name: m.trophyName || "Unknown", type: m.trophyType, icon: m.trophyIconUrl, description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare", groupName: group?.trophyGroupName || "Base Game", earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null, timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0
                        };
                    });

                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: game.name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate });
                    });

                    if (game.npCommunicationId === targetSyncId) {
                        const groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, game.npCommunicationId, opt).catch(()=>({}));
                        activeHunt = { title: game.name, progress: game.progress, trophies: mappedTrophies };
                    }
                } catch (e) {}
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
        const presence = {
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive,
            currentGame: resolvedTitle, currentGameArt: matchedGame.art || twitchIntel?.gameArt || null,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5", twitch: twitchIntel
        };

        return {
            ...profile, onlineId: profile?.onlineId || label, accountId: resolvedTargetId, ...presence, gamesPlayed: totalGamesPlayedCount,
            avatar: profile?.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || "", 
            bio: twitchIntel?.bio || profile?.aboutMe || "Official Pack Member Profile", psnAccountAge: calculateAgeString(earliestEntry), 
            trophySummary: { 
                platinum: stats?.earnedTrophies?.platinum||0, gold: stats?.earnedTrophies?.gold||0, silver: stats?.earnedTrophies?.silver||0, bronze: stats?.earnedTrophies?.bronze||0,
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0)
            },
            recentGames, activeHunt, mostRecentTrophies, streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            fullLibrary: allRecentGames
        };
    } catch (e) { return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData); }
}

function mapToFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) { fields[key] = { nullValue: null }; }
        else if (typeof value === 'boolean') { fields[key] = { booleanValue: value }; }
        else if (typeof value === 'number') { fields[key] = Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value }; }
        else if (typeof value === 'string') { fields[key] = { stringValue: value }; }
        else if (Array.isArray(value)) { fields[key] = { arrayValue: { values: value.map(item => typeof item === 'object' ? { mapValue: { fields: mapToFirestoreFields(item) } } : { stringValue: item.toString() }) } }; }
        else if (typeof value === 'object') { fields[key] = { mapValue: { fields: mapToFirestoreFields(value) } }; }
    }
    return fields;
}

// REST Function to patch document locations safely
async function writeToFirestore(documentPath, payload) {
    const url = `${FIRESTORE_BASE_URL}/${documentPath}`;
    try {
        const firestoreFields = { fields: mapToFirestoreFields(payload) };
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(firestoreFields)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    } catch (err) { console.error(`[FIRESTORE ERROR] Node update breach on ${documentPath}:`, err.message); }
}

async function main() {
    console.log("[INIT] Launching Cloud Firestore Granular Subcollection Engine v15.1.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { users: {} };
    try { if (fs.existsSync(DATA_PATH)) finalData.users = JSON.parse(fs.readFileSync(DATA_PATH)).users || {}; } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
    const masterAuth = wolfAuth || rayAuth;

    for (const [key, label] of Object.entries(SQUAD_MAP)) {
        const accountId = ACCOUNT_IDS[key];
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, label, key, accountId, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    const firestoreTargets = {
        "werewolf": "Kevin",
        "kfruti": "Kevin",
        "ray": "Ray",
        "darkwing": "TJ"
    };

    for (const [squadKey, targetDocName] of Object.entries(firestoreTargets)) {
        const userData = finalData.users[squadKey];
        if (!userData) continue;

        // Extract library elements out of the flat file before writing the main node profile
        const gameLibrary = userData.fullLibrary || [];
        
        // Build clear, clean copy definitions of the root metrics data structure map
        const rootProfilePayload = { ...userData };
        delete rootProfilePayload.fullLibrary; // Kept clean out of the profile node to save space

        // Write user profile metadata card indicators natively
        await writeToFirestore(targetDocName, {
            ...rootProfilePayload,
            personaGroup: targetDocName,
            lastGlobalSyncTime: new Date().toLocaleString()
        });

        // Loop through each game title dynamically and assign it to its own document inside the subcollection
        for (const game of gameLibrary) {
            if (!game.name || game.name === "Unknown Game") continue;
            
            // Clean up the name string to make it safe for a document ID (e.g. "Sniper Elite Resistance")
            const cleanDocID = game.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_{2,}/g, "_");
            const documentPath = `${targetDocName}/games/${cleanDocID}`;
            
            await writeToFirestore(documentPath, {
                gameName: game.name,
                npCommunicationId: game.npCommunicationId || "PC_STREAM",
                completionProgress: game.progress || 0,
                trophyRatio: game.ratio || "0/0",
                coverArt: game.art || null,
                lastPlayedTimestamp: game.lastPlayed || new Date().toISOString(),
                bootCount: game.playCount || 1
            });
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Subcollection map streams completed cleanly.`);
}

main();
