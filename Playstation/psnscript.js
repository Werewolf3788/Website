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
    getProfileFromAccountId,
    getProfileFromUserName,
    getRecentlyPlayedGames,
    getFriendsList,
    getAccountDevices,
    getUserPlayedGames,
    getUserRegion,
    getBasicPresence,
    makeUniversalSearch,
    getUserFriendsAccountIds
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 10.0.2 - Master Omni-Intelligence Protocol (Absolute Harvest Fix)
 * Filepath: Playstation/psnscript.js
 * * --- INSTANCE AUTHENTICATION ---
 * Last Generated: Monday, May 4, 2026
 * Timestamp: 4:26 PM EDT (New York Time)
 * Status: Production Ready - Final Intelligence Build
 * * --- DESCRIPTION ---
 * The definitive "Everything" harvester for the Werewolf Pack.
 * - Resolved "Bad Request" and zeroed-data issues by splitting ID protocols.
 * - Profile Depth: Forces extraction of Bio, Plus status, and Level.
 * - Hardware Audit: Identifies owned PS5, PS4, and Legacy consoles.
 * - Deep Trophies: Captures PS5 Progress (22/100), DLC Group Names, and Earn Rates (%).
 * - Mutual Discovery: Automated shared friend grouping for the Lobby.
 * * --- SQUAD MEMBERS (Verified Hardlinks) ---
 * - Werewolf3788 (Kevin): 3728215008151724560
 * - OneLIVIDMAN (Ray): 2732733730346312494
 * - Darkwing69420 (TJ): 4398462806362115916
 * - ElucidatorVah (Marc): 6551906246515882523
 * - JCrow207: 7524753921019262614
 * - UnicornBunnyShiv: 7742137722487951585
 */

// --- ADMINISTRATIVE CONFIGURATION ---
// Maps keys used in logic to official PSN Online IDs
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "ElucidatorVah",
    jcrow: "JCrow207",
    bunny: "UnicornBunnyShiv"
};

// Permanent 19-digit Account IDs verified for precision lookups
const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523",
    jcrow: "7524753921019262614",
    bunny: "7742137722487951585"
};

// Reverse map for OnlineID to Internal Key lookups
const PSN_ID_TO_KEY = Object.entries(SQUAD_MAP).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

// Global Blacklist for games that should not clutter the "Recent Hunts" feed
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const DATA_PATH = path.join(__dirname, "psn_data.json");
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

// --- DATA PERSISTENCE HELPERS ---
// Manages local token cache to avoid account locking/rate limiting
let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Local Token Store not found."); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

/**
 * parsePlaytime
 * Converts Sony's ISO-8601 duration format (PT12H) into "12h" strings.
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

/**
 * getDetailedStatus
 * Converts raw presence data into UI-ready labels and CSS colors.
 */
const getDetailedStatus = (p) => {
    if (!p) return { label: "Offline", color: "#64748b" };
    const status = (p.primaryPlatformInfo?.onlineStatus || "offline").toLowerCase();
    const state = (p.presenceState || "offline").toLowerCase();
    if (status === "online" || state === "online") return { label: "Online", color: "#10b981" };
    if (status === "busy") return { label: "Busy", color: "#ef4444" };
    if (status === "away") return { label: "Away", color: "#f59e0b" };
    return { label: "Offline", color: "#64748b" };
};

// --- AUTHENTICATION ENGINE ---
// Performs NPSSO handshake and manages the Access/Refresh token rotation lifecycle.
async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    
    // Check if current access token is valid
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        return { accessToken: currentUserTokens.accessToken };
    }

    // Attempt to refresh if expired
    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = { 
                accessToken: refreshed.accessToken, 
                refreshToken: refreshed.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600) 
            };
            saveTokens();
            return refreshed;
        } catch (e) {}
    }

    // Handshake using NPSSO Secret
    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = { 
                accessToken: auth.accessToken, 
                refreshToken: auth.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600) 
            };
            saveTokens();
            return auth;
        } catch (e) { return null; }
    }
    return null;
}

// --- ABSOLUTE OMNI-COLLECTOR ---
// Deep-Sync function that retrieves every possible data point for a primary user.
async function getFullUserData(auth, label, targetOnlineId, existingData) {
    if (!auth) return existingData || null;
    console.log(`[SYNC] Omni-Protocol Harvest (v10.0.2): ${label}`);
    
    try {
        // 1. IDENTITY & HARDWARE AUDIT
        // Using specific AccountIDs to bypass library "Bad Request" errors on "me" protocols.
        const targetId = ACCOUNT_IDS[label.toLowerCase()];
        const profile = await getProfileFromAccountId(auth, targetId);
        const region = await getUserRegion(auth, "me");
        const devices = await getAccountDevices(auth);
        
        // Presence Handshake (Uses "me" for real-time accuracy of token owner)
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, "me"); } catch(e) {}

        const statusInfo = getDetailedStatus(p);
        const presence = {
            onlineId: profile.onlineId,
            accountId: profile.accountId,
            online: statusInfo.label !== "Offline",
            status: statusInfo.label,
            statusColor: statusInfo.color,
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            currentGameId: p.gameTitleInfoList?.[0]?.npTitleId || null,
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        // 2. TROPHY & PROGRESS ANALYTICS
        const stats = await getUserTrophyProfileSummary(auth, profile.accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        const { trophyTitles } = await getUserTitles(auth, profile.accountId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const recentGames = [];
        let activeHunt = null;
        let mostRecentTrophies = [];

        for (const title of sortedTitles.slice(0, 15)) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earnedTotal = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const definedTotal = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);

            if (recentGames.length < 6) {
                recentGames.push({
                    name, 
                    art: title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earnedTotal}/${definedTotal}`,
                    hours: parsePlaytime(title.playDuration),
                    npCommunicationId: title.npCommunicationId,
                    lastPlayed: title.lastUpdatedDateTime,
                    storeUrl: `https://store.playstation.com/en-us/concept/${title.npCommunicationId}`
                });
            }

            // 3. DEEP TROPHY PROGRESS (Captures PS5 22/100 and DLC Grouping)
            if (!activeHunt || name === presence.currentGame) {
                try {
                    const { trophyGroups } = await getTitleTrophyGroups(auth, title.npCommunicationId, "all");
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, profile.accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    const mappedTrophies = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        return { 
                            name: m.trophyName, 
                            type: m.trophyType, 
                            icon: m.trophyIconUrl, 
                            description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare",
                            earnedRate: m.trophyEarnedRate || "0.0",
                            groupName: group?.trophyGroupName || "Base Game",
                            earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0, // PS5 Progress value (22)
                            targetValue: m.trophyProgressTargetValue || 0 // PS5 Target value (100)
                        };
                    });

                    if (!activeHunt || name === presence.currentGame) {
                        activeHunt = { 
                            title: name, 
                            groups: trophyGroups.map(g => ({ id: g.trophyGroupId, name: g.trophyGroupName, icon: g.trophyGroupIconUrl })),
                            trophies: mappedTrophies, 
                            hours: parsePlaytime(title.playDuration),
                            npCommunicationId: title.npCommunicationId
                        };
                    }

                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate });
                    });
                } catch (e) {}
            }
        }

        // Keep a list of the 10 most recent trophies earned across all games
        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);

        return {
            onlineId: profile.onlineId,
            accountId: profile.accountId,
            ...presence, 
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "", 
            bio: profile.aboutMe || "Official Pack Member", 
            plus: profile.isPlus, 
            level: stats.trophyLevel,
            region: region.country || "US",
            language: region.language || "en",
            hardware: (devices.devices || []).map(d => ({ type: d.deviceType, name: d.deviceName })),
            trophySummary: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: globalTotal 
            },
            recentGames, activeHunt, mostRecentTrophies,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[CRITICAL] Omni-Collector Error for ${label}:`, e.message);
        return existingData || null; 
    }
}

// --- MAIN EXECUTION LOOP ---
async function main() {
    console.log("[INIT] Starting Absolute Omni-Collector Sync Engine v10.0.2...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        mutualPack: [], 
        verificationLogs: [],
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "10.0.2",
        codeTimestamp: "Monday, May 4, 2026 | 4:26 PM EDT"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            const backup = JSON.parse(fs.readFileSync(DATA_PATH));
            finalData.users = backup.users || {};
        }
    } catch (e) {}

    // Authenticate Primary Agents (Werewolf and Ray)
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    // --- LIVE IDENTITY AUDIT ---
    // Verifies that Account IDs haven't changed and friends are still visible.
    const verifyIdentity = async (auth, label) => {
        if (!auth) return;
        try {
            console.log(`[VERIFY] Validating ${label} Identity Persistence...`);
            const response = await getUserFriendsAccountIds(auth, "me");
            const friends = response.friends || [];
            Object.entries(ACCOUNT_IDS).forEach(([key, id]) => {
                if (key !== label.toLowerCase()) {
                    finalData.verificationLogs.push({ agent: label, target: key, id, status: friends.includes(id) ? "VERIFIED" : "DISCOVERY_MODE" });
                }
            });
        } catch (e) {}
    };

    await verifyIdentity(wolfAuth, "Werewolf");
    await verifyIdentity(rayAuth, "Ray");

    // Perform Full-Deep Synchronizations for primary members
    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788", finalData.users.werewolf);
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN", finalData.users.ray);

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    // --- MUTUAL DISCOVERY & UNIVERSAL LOBBY ---
    // Compares friends lists between Werewolf and Ray to find "Shared Pack" members.
    const squadFriends = { werewolf: [], ray: [] };
    if (wolfAuth) try { squadFriends.werewolf = (await getFriendsList(wolfAuth, ACCOUNT_IDS.werewolf)).friends || []; } catch(e){}
    if (rayAuth) try { squadFriends.ray = (await getFriendsList(rayAuth, ACCOUNT_IDS.ray)).friends || []; } catch(e){}

    const mutualMap = {};
    squadFriends.werewolf.forEach(f => {
        if (squadFriends.ray.some(rf => rf.onlineId === f.onlineId)) {
            mutualMap[f.onlineId.toLowerCase()] = { sharedWith: [SQUAD_MAP.werewolf, SQUAD_MAP.ray] };
        }
    });

    const allUniqueFriends = [...squadFriends.werewolf, ...squadFriends.ray];
    for (const f of allUniqueFriends) {
        const idLower = f.onlineId.toLowerCase();
        const key = PSN_ID_TO_KEY[idLower] || f.onlineId;
        const statusInfo = getDetailedStatus(f.presence);
        const isMutual = !!mutualMap[idLower];
        
        const lobbyData = {
            onlineId: f.onlineId,
            online: statusInfo.label !== "Offline",
            status: statusInfo.label,
            statusColor: statusInfo.color,
            currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            isMutual: isMutual,
            sharedWith: isMutual ? mutualMap[idLower].sharedWith : [],
            storeUrl: f.presence?.gameTitleInfoList?.[0]?.npCommunicationId ? `https://store.playstation.com/en-us/concept/${f.presence.gameTitleInfoList[0].npCommunicationId}` : null
        };

        if (!finalData.users[key]) finalData.users[key] = lobbyData;
        else Object.assign(finalData.users[key], lobbyData);

        // Populate mutual pack labels for HTML Lobby grouping
        if (isMutual && !finalData.mutualPack.some(m => m.onlineId === f.onlineId)) {
            finalData.mutualPack.push({ 
                onlineId: f.onlineId, 
                sharedLabel: `Friends with ${mutualMap[idLower].sharedWith.join(' & ')}` 
            });
        }
    }

    // Shadow Sync for Squad members not visible in active friend lists
    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        for (const [key, accountId] of Object.entries(ACCOUNT_IDS)) {
            if (finalData.users[key]?.lastUpdated) continue;
            try {
                const p = await getBasicPresence(masterAuth, accountId);
                const s = getDetailedStatus(p);
                finalData.users[key] = {
                    ...finalData.users[key],
                    onlineId: SQUAD_MAP[key],
                    accountId: accountId,
                    online: s.label !== "Offline",
                    status: s.label,
                    statusColor: s.color,
                    currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
                    platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
                };
            } catch (e) {}
        }
    }

    // Save master dataset to disk
    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Absolute Omni-Protocol Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
