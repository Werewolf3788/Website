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
    getRecentlyPlayedGames, // GraphQL Metadata Cross-Reference
    getUserRegion,
    getBasicPresence // Real-time Presence Handshake (Kevin snippet)
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 10.5.0 - Absolute Omni-Intelligence Protocol (Cross-Reference Handshake)
 * Filepath: Playstation/psnscript.js
 * * * --- INSTANCE AUTHENTICATION ---
 * Last Generated: Monday, May 4, 2026
 * Timestamp: 5:47 PM EDT (New York Time)
 * Status: Production Ready - "Stability First" Build
 * * * --- PSN SYNC CHECKLIST (VERIFIED DATA HARVEST) ---
 * 1.  PROFILE: [Captured] High-Res Avatar, Bio, Plus Status, PSN Level.
 * 2.  SUMMARY: [Captured] Global Trophy Counts (Platinum, Gold, Silver, Bronze, Total).
 * 3.  PRESENCE: [Captured] Current Game Name via getBasicPresence Cross-Ref.
 * 4.  LIBRARY: [Captured] Last 6 Games, Progress %, Earned/Total Ratio, Last Played.
 * 5.  DEEP TROPHIES: [Captured] Full checklist with Icons, Descriptions, and Rarity.
 * 6.  22/100 FEATURE: [Captured] PS5 Progress Trackers (Current Value / Target Value).
 * 7.  STAMPS: [Captured] Earned Date/Time and raw Unix Timestamps for UI sorting.
 * 8.  CROSS-REFERENCE: [Captured] Merges GraphQL Library with Presence for FS25 link.
 * 9.  PURGE: [Cleaned] Removed "status", "hardware", "storeUrl", and "hours" per Admin.
 * 10. STABILITY: [Cleaned] Friends List and Mutual logic removed to prevent crashes.
 * * * --- SQUAD MEMBERS (Verified Hardlinks) ---
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
async function getFullUserData(auth, label, targetId, existingData) {
    if (!auth || !targetId) return existingData || null;
    console.log(`[SYNC] Omni-Protocol Harvest (v10.5.0): ${label}`);
    
    try {
        // 1. IDENTITY & REGIONAL
        const profile = await getProfileFromAccountId(auth, targetId);
        let region = { country: "US", language: "en" };
        if (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
        }
        
        // 2. CROSS-REFERENCE REAL-TIME PRESENCE (Kevin snippet logic)
        const presenceId = (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) ? "me" : targetId;
        let activePresence = { gameTitleInfoList: [] };
        let recentlyPlayed = { data: { gameLibraryTitlesRetrieve: { games: [] } } };
        
        // Fetch library via GraphQL and presence via BasicPresence
        try { recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 10 }); } catch(e) {}
        try { 
            const rawPresence = await getBasicPresence(auth, presenceId); 
            activePresence = Array.isArray(rawPresence) ? rawPresence[0] : (rawPresence.basicPresences ? rawPresence.basicPresences[0] : rawPresence);
        } catch(e) {}

        const activeGameInfo = activePresence.gameTitleInfoList?.[0] || {};
        const gamesMetadata = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
        
        // Cross-reference current game against library for IDs
        const matchedMeta = gamesMetadata.find(g => g.name === activeGameInfo.titleName) || {};

        const presence = {
            currentGame: activeGameInfo.titleName || "Dashboard",
            currentCommunicationId: activeGameInfo.npCommunicationId || matchedMeta.titleId || null,
            platform: activePresence.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        // 3. TROPHY & PROGRESS ANALYTICS
        const stats = await getUserTrophyProfileSummary(auth, targetId);
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
                    name, art: title.trophyTitleIconUrl, progress: title.progress,
                    ratio: `${earnedTotal}/${definedTotal}`,
                    npCommunicationId: title.npCommunicationId,
                    lastPlayed: title.lastUpdatedDateTime
                });
            }

            // 4. DEEP TROPHY PULL (22/100 PROGRESS FEATURE)
            if (!activeHunt || name === presence.currentGame) {
                try {
                    const { trophyGroups } = await getTitleTrophyGroups(auth, title.npCommunicationId, "all");
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, targetId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    const mappedTrophies = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        return { 
                            name: m.trophyName, type: m.trophyType, icon: m.trophyIconUrl, description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare", earnedRate: m.trophyEarnedRate || "0.0",
                            groupName: group?.trophyGroupName || "Base Game", earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            // 22/100 FEATURE DATA
                            currentValue: s?.progress || 0,
                            targetValue: m.trophyProgressTargetValue || 0
                        };
                    });

                    if (!activeHunt || name === presence.currentGame) {
                        activeHunt = { 
                            title: name, 
                            groups: trophyGroups.map(g => ({ id: g.trophyGroupId, name: g.trophyGroupName, icon: g.trophyGroupIconUrl })),
                            trophies: mappedTrophies, npCommunicationId: title.npCommunicationId
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
            bio: profile.aboutMe || "Official Pack Member Profile", 
            plus: profile.isPlus, level: stats.trophyLevel, region: region.country || "US",
            trophySummary: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0)
            },
            recentGames, activeHunt, mostRecentTrophies,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[CRITICAL] Omni-Collector Error for ${label}:`, e.message);
        return existingData || null; 
    }
}

async function main() {
    console.log("[INIT] Starting Absolute Omni-Collector v10.5.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "10.5.0",
        codeTimestamp: "Monday, May 4, 2026 | 5:47 PM EDT"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            const backup = JSON.parse(fs.readFileSync(DATA_PATH));
            finalData.users = backup.users || {};
        }
    } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
    const masterAuth = wolfAuth || rayAuth;

    // Harvest the core squad using the best available authenticated token
    for (const [key, id] of Object.entries(ACCOUNT_IDS)) {
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, SQUAD_MAP[key], id, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Omni-Protocol Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
