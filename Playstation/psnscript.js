const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,const psnApi = require("psn-api");
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
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 7.4.1 - Real-Time Presence & Visual Integrity
 * Filepath: Playstation/psnscript.js
 * FIXED: Ensures icons are passed to recent feed and presence is forced.
 */
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    balto: "Balto20_01",
    mjolnir: "IlIMjolnirIlI"
};

const PSN_ID_TO_KEY = Object.entries(SQUAD_MAP).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const DATA_PATH = path.join(__dirname, "psn_data.json");

let tokenStore = { werewolf: {}, ray: {} };
try { if (fs.existsSync(TOKENS_PATH)) tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH)); } catch (e) {}

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

const isUserActive = (status) => ["online", "busy", "away"].includes(status?.toLowerCase());

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) return { accessToken: currentUserTokens.accessToken };

    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600) };
            saveTokens();
            return refreshed;
        } catch (e) {}
    }

    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput);
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = { accessToken: auth.accessToken, refreshToken: auth.refreshToken, expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600) };
            saveTokens();
            return auth;
        } catch (e) { return null; }
    }
    return null;
}

async function getFullUserData(auth, label, targetOnlineId) {
    if (!auth) return { error: "AUTH_REQUIRED" };
    try {
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        
        // FORCED PRESENCE CHECK (Busts the "Offline" bug)
        const p = await psnApi.getPresenceOfUser(auth, accountId);
        const presence = {
            online: isUserActive(p.primaryPlatformInfo?.onlineStatus),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Home Screen",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        const { trophyTitles } = await getUserTitles(auth, accountId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const recentGames = [];
        let activeGameTrophies = null;
        let mostRecentTrophies = [];
        let localSummed = 0;

        for (const title of sortedTitles) {
            const name = title.trophyTitleName;
            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            localSummed += earnedC;

            if (recentGames.length < 6) {
                recentGames.push({
                    name, art: title.trophyTitleIconUrl, progress: title.progress,
                    ratio: `${earnedC}/${(title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze)}`,
                    hours: parsePlaytime(title.playDuration)
                });
            }

            // DEEP SCAN FOR ACTIVE GAME (Mahjong 3D etc.)
            if (name === presence.currentGame || !activeGameTrophies) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    const mapped = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        return { name: m.trophyName, type: m.trophyType, icon: m.trophyIconUrl, earned: s?.earned || false, earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : null, description: m.trophyDetail };
                    });

                    if (name === presence.currentGame) activeGameTrophies = mapped.slice(0, 15);

                    // Add earned trophies to global recent list WITH ICONS
                    mapped.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: name, name: t.name, icon: t.icon, timestamp: new Date(t.earnedDate).getTime(), date: t.earnedDate });
                    });
                } catch (e) {}
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);

        return {
            accountId, ...presence, avatar: profile.avatars?.[0]?.url || "", plus: profile.isPlus, level: stats.trophyLevel,
            recentGames, activeHunt: { title: presence.currentGame, trophies: activeGameTrophies || [] },
            mostRecentTrophies, dataStatus: (localSummed < globalTotal) ? "SYNCING" : "LIVE",
            trophies: { platinum: stats.earnedTrophies?.platinum || 0, total: globalTotal },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { return null; }
}

async function main() {
    let finalData = { users: {}, systemAlerts: [] };
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788");
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN");

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        try {
            const list = await getFriendsList(masterAuth, wolfFull?.accountId || rayFull?.accountId);
            for (const f of list.friends || []) {
                const key = PSN_ID_TO_KEY[f.onlineId.toLowerCase()];
                if (key && !finalData.users[key]) {
                    finalData.users[key] = { online: isUserActive(f.presence?.primaryPlatformInfo?.onlineStatus), currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Home Screen", platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5" };
                }
            }
        } catch (e) {}
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
}
main();
    getTitleTrophies,
    getProfileFromAccountId,
    getProfileFromUserName,
    getRecentlyPlayedGames,
    getFriendsList,
    getAccountDevices,
    getUserPlayedGames,
    getUserRegion,
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 7.4.0 - Universal Integrity Protocol
 * Filepath: Playstation/psnscript.js
 * UPDATED: Multi-user cache busting and synchronized deep-scanning for all authenticated keys.
 */
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    balto: "Balto20_01",
    mjolnir: "IlIMjolnirIlI"
};

const PSN_ID_TO_KEY = Object.entries(SQUAD_MAP).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];

const TOKENS_PATH = path.join(__dirname, "tokens.json");
const DATA_PATH = path.join(__dirname, "psn_data.json");

// Load or Initialize Token Storage
let tokenStore = { werewolf: {}, ray: {} };
try {
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Failed to load token store"); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

const isUserActive = (status) => ["online", "busy", "away"].includes(status?.toLowerCase());

/**
 * Smart Auth with Universal Token Rotation
 */
async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    
    // Check if current token is still valid (5 min buffer)
    const now = Math.floor(Date.now() / 1000);
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        return { accessToken: currentUserTokens.accessToken };
    }

    // Try Refreshing
    if (currentUserTokens.refreshToken) {
        try {
            console.log(`[AUTH] Rotating keys for ${userKey}...`);
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600)
            };
            saveTokens();
            return refreshed;
        } catch (e) {
            console.log(`[AUTH] Key rotation failed for ${userKey}. Checking environment fallback...`);
        }
    }

    // Fallback to NPSSO from environment
    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput);
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = {
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
                expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600)
            };
            saveTokens();
            return auth;
        } catch (e) {
            console.error(`[CRITICAL] NPSSO handshake failed for ${userKey}. Manual intervention required.`);
            return null;
        }
    }
    return null;
}

/**
 * Universal Data Fetcher with Individual Cache Busting
 */
async function getFullUserData(auth, label, targetOnlineId) {
    if (!auth) return { error: "AUTH_REQUIRED" };
    
    try {
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        
        // --- 1. Presence Logic ---
        const p = await psnApi.getPresenceOfUser(auth, accountId);
        const presence = {
            online: isUserActive(p.primaryPlatformInfo?.onlineStatus),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Home Screen",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        // --- 2. Real-Time Trophy Baseline ---
        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        const region = await getUserRegion(auth, accountId);

        // --- 3. Playtime/Library Scan ---
        let playtimeMap = {};
        try {
            const playedGames = await getUserPlayedGames(auth, accountId);
            (playedGames.titles || []).forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) {
            const recently = await getRecentlyPlayedGames(auth, { limit: 20 });
            (recently.data?.gameLibraryTitlesRetrieve?.games || []).forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        }

        // --- 4. Deep-Scan Logic (Applied to everyone with a key) ---
        const { trophyTitles } = await getUserTitles(auth, accountId);
        // Force sort by hardware update stamp to detect recent pops immediately
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const recentGames = [];
        let activeGameTrophies = null;
        let mostRecentTrophies = [];
        let localSummedTrophies = 0;

        for (const title of sortedTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;
            
            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const totalC = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            localSummedTrophies += earnedC;

            if (recentGames.length < 6) {
                recentGames.push({
                    name, 
                    art: title.trophyTitleIconUrl, 
                    progress: title.progress, 
                    ratio: `${earnedC}/${totalC}`, 
                    hours: playtimeMap[name] || parsePlaytime(title.playDuration),
                    lastUpdated: title.lastUpdatedDateTime
                });
            }

            // Current Activity Trophies
            if (presence.online && name === presence.currentGame && !activeGameTrophies) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    activeGameTrophies = (meta || []).slice(0, 15).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        return {
                            name: m.trophyName,
                            type: m.trophyType,
                            earned: s?.earned || false,
                            earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : null,
                            icon: m.trophyIconUrl
                        };
                    });
                } catch (e) {}
            }

            // Global Activity Feed
            if (mostRecentTrophies.length < 10) {
                try {
                    const { trophies: earnedSet } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    earnedSet.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({
                            game: name,
                            trophyId: t.trophyId,
                            date: new Date(t.earnedDateTime).toLocaleString(),
                            timestamp: new Date(t.earnedDateTime).getTime()
                        });
                    });
                } catch(e) {}
            }
        }

        // Cleanup global feed
        mostRecentTrophies = mostRecentTrophies
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        // Data Integrity Check for the specific user
        const dataStatus = (localSummedTrophies < globalTotal) ? "SYNCING" : "LIVE";

        return {
            auth, accountId, ...presence,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            plus: profile.isPlus, 
            level: stats.trophyLevel,
            region: region.country || "US",
            recentGames,
            activeGameTrophies,
            mostRecentTrophies,
            dataStatus,
            trophies: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: globalTotal
            },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { return null; }
}

async function main() {
    let finalData = { users: {}, systemAlerts: [] };
    if (fs.existsSync(DATA_PATH)) {
        try { finalData = JSON.parse(fs.readFileSync(DATA_PATH)); } catch(e){}
    }

    // Authenticate all users who have environment seeds
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    // Run Full Data Scan for everyone with a key
    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788");
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN");

    if (wolfFull && !wolfFull.error) finalData.users.werewolf = wolfFull;
    if (rayFull && !rayFull.error) finalData.users.ray = rayFull;

    // Use whichever key is healthy to scan the rest of the squad (Seth, TJ, etc.)
    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        try {
            const accId = wolfFull?.accountId || rayFull?.accountId;
            const list = await getFriendsList(masterAuth, accId);
            for (const f of list.friends || []) {
                const squadKey = PSN_ID_TO_KEY[f.onlineId.toLowerCase()];
                // Skip if this user was already processed with their own key
                if (finalData.users[squadKey] && finalData.users[squadKey].dataStatus) continue;

                const isActive = isUserActive(f.presence?.primaryPlatformInfo?.onlineStatus);
                const storageKey = squadKey || f.onlineId;
                
                finalData.users[storageKey] = {
                    ...finalData.users[storageKey],
                    online: isActive,
                    currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Home Screen",
                    platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
                };
            }
        } catch (e) {}
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Master Sync v7.4.0 Complete.`);
}

main();
