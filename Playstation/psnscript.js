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
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 8.5.0 - Omni-Intelligence Protocol (Identity & Deep Progress Fix)
 * Filepath: Playstation/psnscript.js
 * * DESCRIPTION:
 * The ultimate data harvester for the Werewolf Pack. 
 * - Fixes "User not found" errors by utilizing the "me" identity protocol.
 * - Extracts every available data point: Bio, Plus Status, Hardware, Region.
 * - Deep Sync Trophies: Captures PS5 progress trackers (e.g., 22/100) and DLC groups.
 * - Identity Persistence: Maps explicit AccountID and OnlineID (User ID).
 * - Mutual Discovery: Automatically flags friends shared between Werewolf and Ray.
 * * SQUAD MEMBERS (Verified Hardlinks):
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
} catch (e) { console.error("[ERROR] Token store inaccessible."); }

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

// --- DEEP HARVESTER ---
async function getFullUserData(auth, label, targetOnlineId, existingData) {
    if (!auth) return existingData || null;
    console.log(`[SYNC] Identity Handshake (v8.5.0): ${label}`);
    
    try {
        // 1. IDENTITY PROTOCOL (Fixes "User not found")
        // We strictly use "me" for authenticated users to pull private metadata
        const profile = await getProfileFromAccountId(auth, "me");
        const accountId = profile.accountId;
        const onlineId = profile.onlineId;
        const region = await getUserRegion(auth, "me");
        const devices = await getAccountDevices(auth);
        
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, accountId); } catch(e) {}

        const statusInfo = getDetailedStatus(p);
        const presence = {
            onlineId, accountId,
            online: statusInfo.label !== "Offline",
            status: statusInfo.label,
            statusColor: statusInfo.color,
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            currentGameId: p.gameTitleInfoList?.[0]?.npTitleId || null,
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

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
                    name, art: title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earnedTotal}/${definedTotal}`,
                    hours: parsePlaytime(title.playDuration),
                    npCommunicationId: title.npCommunicationId,
                    lastPlayed: title.lastUpdatedDateTime,
                    platform: title.npServiceName === "trophy" ? "PS4/PS5" : "Legacy"
                });
            }

            // TROPHY GROUP & PROGRESS SCAN (22/100 support)
            if (!activeHunt || name === presence.currentGame) {
                try {
                    const { trophyGroups } = await getTitleTrophyGroups(auth, title.npCommunicationId, "all");
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
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
                            groupName: group?.trophyGroupName || "Base Game",
                            earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0,
                            targetValue: m.trophyProgressTargetValue || 0
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
            onlineId, accountId, ...presence, 
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
        console.error(`[CRITICAL] Harvest failed for ${label}:`, e.message);
        return existingData || null; 
    }
}

// --- MAIN SYNC ENGINE ---
async function main() {
    console.log("[INIT] Starting Master Sync Engine v8.5.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        mutualPack: [], 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "8.5.0"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            const backup = JSON.parse(fs.readFileSync(DATA_PATH));
            finalData.users = backup.users || {};
        }
    } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788", finalData.users.werewolf);
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN", finalData.users.ray);

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    // --- MUTUAL DISCOVERY & UNIVERSAL LOBBY ---
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

    const mutualMap = {};
    squadFriends.werewolf.forEach(f => {
        if (squadFriends.ray.some(rf => rf.onlineId === f.onlineId)) {
            mutualMap[f.onlineId.toLowerCase()] = { sharedWith: ["Werewolf3788", "OneLIVIDMAN"] };
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
    }

    // Shadow Sync for Squad members not tracked as friends
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

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Identity Sync Complete. v${finalData.engineVersion}`);
}

main();
