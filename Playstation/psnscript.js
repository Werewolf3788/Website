const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getProfileFromAccountId,
    getProfileFromUserName,
    getRecentlyPlayedGames,
    getFriendsList,
    getAccountDevices,
    getUserPlayedGames,
    getUserRegion,
    getBasicPresence,
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 8.1.0 - Omni-Sync Protocol (Deep Intelligence & Universal Discovery)
 * Filepath: Playstation/psnscript.js
 * * DESCRIPTION:
 * This is the ultimate data harvester for the Werewolf Pack. It pulls every possible 
 * attribute from Sony's API including deep profile metadata, granular PS5 trophy progress, 
 * friend presence, and cross-user mutual friendship detection.
 * * SQUAD MEMBERS (Hardlinked Verified IDs):
 * - Werewolf3788 (Kevin): 3728215008151724560
 * - OneLIVIDMAN (Ray): 2732733730346312494
 * - Darkwing69420 (TJ): 4398462806362115916
 * - ElucidatorVah (Marc): 6551906246515882523
 * - JCrow207: 7524753921019262614
 * - UnicornBunnyShiv: 7742137722487951585
 */

// --- CONFIGURATION & MAPPING ---
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
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const DATA_PATH = path.join(__dirname, "psn_data.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

// --- DATA PERSISTENCE HELPERS ---
let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Local token store inaccessible."); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

/**
 * parsePlaytime
 * Converts ISO-8601 duration strings to user-friendly "10h 30m" format.
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

/**
 * getDetailedStatus
 * Extracts specific presence states: Online, Busy, Away, or Offline.
 */
const getDetailedStatus = (p) => {
    if (!p) return "Offline";
    const status = (p.primaryPlatformInfo?.onlineStatus || "offline").toLowerCase();
    const state = (p.presenceState || "offline").toLowerCase();
    
    if (status === "online" || state === "online") return "Online";
    if (status === "busy") return "Busy";
    if (status === "away") return "Away";
    return "Offline";
};

// --- AUTHENTICATION ENGINE ---
async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    
    // Valid token check
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        return { accessToken: currentUserTokens.accessToken };
    }

    // Refresh rotation
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

    // New SSO Session
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

// --- DEEP DATA HARVESTER ---
async function getFullUserData(auth, label, targetOnlineId, existingData) {
    if (!auth) return existingData || null;
    console.log(`[SYNC] Omni-Pulse Active: Harvesting ${label}...`);
    
    try {
        // 1. Core Profile & Metadata
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        const region = await getUserRegion(auth, accountId);
        const devices = await getAccountDevices(auth);
        
        // 2. Live Presence
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, accountId); } catch(e) {}

        const status = getDetailedStatus(p);
        const presence = {
            online: status !== "Offline",
            status: status,
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Home Screen",
            currentGameId: p.gameTitleInfoList?.[0]?.npTitleId || null,
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        // 3. Trophy Summary (Level, Counts, Totals)
        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        // 4. Game Library & Progress
        const { trophyTitles } = await getUserTitles(auth, accountId);
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
                    lastPlayed: title.lastUpdatedDateTime
                });
            }

            // Deep Trophy Scan for Active Game or Top of list
            if (!activeHunt || name === presence.currentGame) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    const mapped = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        return { 
                            name: m.trophyName, 
                            type: m.trophyType, 
                            icon: m.trophyIconUrl, 
                            description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare",
                            earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0, // PS5 (22/100) support
                            targetValue: m.trophyProgressTargetValue || 0
                        };
                    });

                    if (!activeHunt || name === presence.currentGame) {
                        activeHunt = { 
                            title: name, 
                            trophies: mapped, 
                            hours: parsePlaytime(title.playDuration),
                            npCommunicationId: title.npCommunicationId
                        };
                    }

                    mapped.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate });
                    });
                } catch (e) {}
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);

        // Final Omni-Object Construction
        return {
            accountId, ...presence, 
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "", 
            bio: profile.aboutMe || "Official Pack Member", 
            plus: profile.isPlus, 
            level: stats.trophyLevel,
            region: region.country || "US",
            systemCount: devices.devices?.length || 0,
            trophySummary: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: globalTotal 
            },
            recentGames, 
            activeHunt, 
            mostRecentTrophies,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[ERROR] Harvest failed for ${label}:`, e.message);
        return existingData || null; 
    }
}

// --- MAIN SYNC ENGINE ---
async function main() {
    console.log("[INIT] Starting Omni-Sync Engine v8.1.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        mutualPack: [], 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineStatus: "HEALTHY" 
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            finalData = JSON.parse(fs.readFileSync(DATA_PATH));
        }
    } catch (e) {}

    // Authenticate Primary Agents
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    // Run Primary Harvests
    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788", finalData.users.werewolf);
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN", finalData.users.ray);

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    // --- MUTUAL DISCOVERY & LOBBY ENHANCEMENT ---
    const squadFriends = { werewolf: [], ray: [] };
    
    if (wolfAuth) {
        try {
            const list = await getFriendsList(wolfAuth, ACCOUNT_IDS.werewolf);
            squadFriends.werewolf = list.friends || [];
        } catch(e){}
    }
    if (rayAuth) {
        try {
            const list = await getFriendsList(rayAuth, ACCOUNT_IDS.ray);
            squadFriends.ray = list.friends || [];
        } catch(e){}
    }

    // Build Mutual Map
    const mutualMap = {};
    squadFriends.werewolf.forEach(f => {
        const rayMatch = squadFriends.ray.find(rf => rf.onlineId === f.onlineId);
        if (rayMatch) {
            mutualMap[f.onlineId.toLowerCase()] = { 
                sharedWith: ["Werewolf3788", "OneLIVIDMAN"],
                presence: f.presence // Preferred presence from Kevin's view
            };
        }
    });

    // Process Universal Lobby (Squad + Friends)
    const allUniqueFriends = [...squadFriends.werewolf, ...squadFriends.ray];
    for (const f of allUniqueFriends) {
        const idLower = f.onlineId.toLowerCase();
        const key = PSN_ID_TO_KEY[idLower] || f.onlineId;
        const status = getDetailedStatus(f.presence);
        const isMutual = !!mutualMap[idLower];
        
        const lobbyData = {
            online: status !== "Offline",
            status: status,
            currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            currentGameId: f.presence?.gameTitleInfoList?.[0]?.npCommunicationId || null,
            platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            isMutual: isMutual,
            sharedWith: isMutual ? mutualMap[idLower].sharedWith : []
        };

        // Update entry without overwriting deep metadata from harvest
        if (!finalData.users[key]) {
            finalData.users[key] = lobbyData;
        } else {
            Object.assign(finalData.users[key], lobbyData);
        }
    }

    // Force Check Squad Members not in active friend lists
    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        for (const [key, accountId] of Object.entries(ACCOUNT_IDS)) {
            if (finalData.users[key] && finalData.users[key].lastUpdated) continue; // Already Deep Harvested
            try {
                const p = await getBasicPresence(masterAuth, accountId);
                const s = getDetailedStatus(p);
                finalData.users[key] = {
                    ...finalData.users[key],
                    online: s !== "Offline",
                    status: s,
                    currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
                    platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
                };
            } catch (e) {}
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Omni-Sync Complete. Last Global Update: ${finalData.lastGlobalUpdate}`);
}

main();
