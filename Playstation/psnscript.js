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
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 7.2.0 - The Completionist Update
 * Filepath: Playstation/psnscript.js
 * FEATURES: Recent Trophies, Active Game Trophy Tracking, Persistent Auth
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

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    
    // 1. Try Refresh Token first
    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                expiresIn: refreshed.expiresIn
            };
            saveTokens();
            return refreshed;
        } catch (e) {
            console.log(`[AUTH] Refresh failed for ${userKey}.`);
        }
    }

    // 2. Fallback to NPSSO
    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput);
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = {
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
                expiresIn: auth.expiresIn
            };
            saveTokens();
            return auth;
        } catch (e) {
            console.error(`[CRITICAL] Auth failed for ${userKey}`);
            return null;
        }
    }
    return null;
}

async function getFullUserData(auth, label, targetOnlineId) {
    if (!auth) return { error: "AUTH_REQUIRED" };
    try {
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        
        // --- 1. Presence & Current Activity ---
        const p = await psnApi.getPresenceOfUser(auth, accountId);
        const presence = {
            online: isUserActive(p.primaryPlatformInfo?.onlineStatus),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const region = await getUserRegion(auth, accountId);

        // --- 2. Playtime & Library ---
        let playtimeMap = {};
        try {
            const playedGames = await getUserPlayedGames(auth, accountId);
            (playedGames.titles || []).forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) {
            const recently = await getRecentlyPlayedGames(auth, { limit: 20 });
            (recently.data?.gameLibraryTitlesRetrieve?.games || []).forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        }

        // --- 3. Trophy Deep Dive (Recent & Active) ---
        const { trophyTitles } = await getUserTitles(auth, accountId);
        const recentGames = [];
        let activeGameTrophies = null;
        let mostRecentTrophies = [];

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;
            
            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const totalC = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            
            if (recentGames.length < 6) {
                recentGames.push({
                    name, 
                    art: title.trophyTitleIconUrl, 
                    progress: title.progress, 
                    ratio: `${earnedC}/${totalC}`, 
                    hours: playtimeMap[name] || parsePlaytime(title.playDuration)
                });
            }

            // If this is the game being played, fetch its specific trophies
            if (name === presence.currentGame && !activeGameTrophies) {
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
                } catch (e) { /* Game might not have trophies */ }
            }

            // Grab individual trophies for a "Global Recent" list
            if (mostRecentTrophies.length < 5) {
                try {
                    const { trophies: earnedSet } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const earnedOnly = earnedSet.filter(t => t.earned).sort((a,b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime));
                    
                    earnedOnly.forEach(t => {
                        if (mostRecentTrophies.length < 5) {
                            mostRecentTrophies.push({
                                game: name,
                                trophyId: t.trophyId,
                                date: new Date(t.earnedDateTime).toLocaleString()
                            });
                        }
                    });
                } catch(e) {}
            }
        }

        return {
            auth, accountId, ...presence,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            plus: profile.isPlus, level: stats.trophyLevel,
            region: region.country || "US",
            recentGames,
            activeGameTrophies,
            mostRecentTrophies,
            trophies: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0) 
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

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788");
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN");

    if (wolfFull && !wolfFull.error) finalData.users.werewolf = wolfFull;
    if (rayFull && !rayFull.error) finalData.users.ray = rayFull;

    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        try {
            const accId = wolfFull?.accountId || rayFull?.accountId;
            const list = await getFriendsList(masterAuth, accId);
            for (const f of list.friends || []) {
                const squadKey = PSN_ID_TO_KEY[f.onlineId.toLowerCase()];
                if (squadKey === 'werewolf' || squadKey === 'ray') continue;

                const isActive = isUserActive(f.presence?.primaryPlatformInfo?.onlineStatus);
                const storageKey = squadKey || f.onlineId;
                
                finalData.users[storageKey] = {
                    ...finalData.users[storageKey],
                    online: isActive,
                    currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Dashboard",
                    platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
                };
            }
        } catch (e) {}
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Master Sync v7.2.0 Complete.`);
}

main();
