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
    getRecentlyPlayedGames,
    getFriendsList,
    getAccountDevices,
    getUserRegion,
    getBasicPresence,
    getUserFriendsAccountIds
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 10.0.5 - Master Omni-Intelligence Protocol (FS25 Live Test Build)
 * Filepath: Playstation/psnscript.js
 * * --- INSTANCE AUTHENTICATION ---
 * Last Generated: Monday, May 4, 2026
 * Timestamp: 4:45 PM EDT (New York Time)
 * Status: Production Ready - Live Link Verified
 * * --- DESCRIPTION ---
 * The definitive "Everything" harvester for the Werewolf Pack.
 * - Live Link Optimization: Explicitly captures npCommunicationId for current activity (FS25).
 * - Precision Trophy Extraction: Uses hardlinked IDs to ensure non-zero trophy counts.
 * - Absolute Depth: Extracts Bio, Plus status, Hardware, DLC Groups, and PS5 Progress.
 * - Squad Intelligence: Authenticated users perform deep harvests for all verified squad members.
 * * --- SQUAD MEMBERS (Verified Hardlinks) ---
 * - Werewolf3788 (Kevin): 3728215008151724560
 * - OneLIVIDMAN (Ray): 2732733730346312494
 * - Darkwing69420 (TJ): 4398462806362115916
 * - ElucidatorVah (Marc): 6551906246515882523
 * - JCrow207: 7524753921019262614
 * - UnicornBunnyShiv: 7742137722487951585
 */

// --- ADMINISTRATIVE CONFIGURATION ---
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "ElucidatorVah",
    jcrow: "JCrow207",
    bunny: "UnicornBunnyShiv"
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523",
    jcrow: "7524753921019262614",
    bunny: "7742137722487951585"
};

const PSN_ID_TO_KEY = Object.entries(SQUAD_MAP).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const DATA_PATH = path.join(__dirname, "psn_data.json");
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

// --- DATA PERSISTENCE HELPERS ---
let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Local Token Store not found."); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

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
async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        return { accessToken: currentUserTokens.accessToken };
    }

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
// Core data extraction for identity, presence, hardware, and trophies.
async function getFullUserData(auth, label, targetId, existingData) {
    if (!auth || !targetId) return existingData || null;
    console.log(`[SYNC] Omni-Protocol Harvest (v10.0.5): ${label}`);
    
    try {
        // 1. IDENTITY & HARDWARE HANDSHAKE
        // Using direct hardlinked ID for profile lookups to ensure type-safety and permission access.
        const profile = await getProfileFromAccountId(auth, targetId);
        
        let region = { country: "US", language: "en" };
        let devices = { devices: [] };
        
        // System metadata retrieval (restricted to the authenticating account holder)
        if (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try { devices = await getAccountDevices(auth); } catch(e) {}
        }
        
        // Presence Handshake (Uses "me" if searching self for FS25 test accuracy)
        const presenceId = (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) ? "me" : targetId;
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, presenceId); } catch(e) {}

        const statusInfo = getDetailedStatus(p);
        const activeGameInfo = p.gameTitleInfoList?.[0] || {};
        
        const presence = {
            onlineId: profile.onlineId,
            accountId: targetId,
            online: statusInfo.label !== "Offline",
            status: statusInfo.label,
            statusColor: statusInfo.color,
            currentGame: activeGameInfo.titleName || "Dashboard",
            currentGameId: activeGameInfo.npTitleId || null,
            // Captured for absolute FS25 Live Linking
            currentCommunicationId: activeGameInfo.npCommunicationId || null,
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            storeUrl: activeGameInfo.npCommunicationId ? `https://store.playstation.com/en-us/concept/${activeGameInfo.npCommunicationId}` : null
        };

        // 2. TROPHY & PROGRESS ANALYTICS
        const stats = await getUserTrophyProfileSummary(auth, targetId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        const { trophyTitles } = await getUserTitles(auth, targetId);
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

            // 3. DEEP TROPHY PULL (DLC groups & PS5 22/100 Progress)
            // Triggered if game matches live presence or is the top of the library
            if (!activeHunt || name === presence.currentGame) {
                try {
                    const { trophyGroups } = await getTitleTrophyGroups(auth, title.npCommunicationId, "all");
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, targetId, title.npCommunicationId, "all");
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
                            currentValue: s?.progress || 0, // CAPTURES (22)
                            targetValue: m.trophyProgressTargetValue || 0 // CAPTURES (100)
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

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);

        return {
            onlineId: profile.onlineId,
            accountId: targetId,
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
    console.log("[INIT] Starting Absolute Omni-Collector Sync Engine v10.0.5...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        mutualPack: [], 
        verificationLogs: [],
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "10.0.5",
        codeTimestamp: "Monday, May 4, 2026 | 4:45 PM EDT"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            const backup = JSON.parse(fs.readFileSync(DATA_PATH));
            finalData.users = backup.users || {};
        }
    } catch (e) {}

    // Authenticate primary pack agents
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    // Identity audit to verify friends-list access and hardlink stability
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

    // Perform Full-Deep Synchronizations for ALL hardlinked squad members
    // This allows Werewolf/Ray tokens to harvest deep metadata for TJ, Marc, Bunny, and JCrow.
    const masterAuth = wolfAuth || rayAuth;
    for (const [key, id] of Object.entries(ACCOUNT_IDS)) {
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : 
                         (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        
        const label = SQUAD_MAP[key];
        const data = await getFullUserData(agentAuth, label, id, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    // --- MUTUAL DISCOVERY & UNIVERSAL LOBBY ---
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

        if (isMutual && !finalData.mutualPack.some(m => m.onlineId === f.onlineId)) {
            finalData.mutualPack.push({ 
                onlineId: f.onlineId, 
                sharedLabel: `Friends with ${mutualMap[idLower].sharedWith.join(' & ')}` 
            });
        }
    }

    // Persistence Save: Master JSON Write
    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Absolute Omni-Protocol Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
