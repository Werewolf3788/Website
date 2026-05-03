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
 * Version 7.4.6 - Ghost Protocol & NaN Protection
 * Filepath: Playstation/psnscript.js
 * FIXED: NaN% error, Offline Lobby bug, and Home Screen trophy lag.
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
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Could not read tokens.json"); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

// Expanded check for online states (including 'away' and 'busy')
const isUserActive = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s.includes("online") || s.includes("busy") || s.includes("away") || s === "active";
};

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
            const accessCode = await exchangeNpssoForCode(npssoInput);
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

async function getFullUserData(auth, label, targetOnlineId) {
    if (!auth) return null;
    try {
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        
        // --- 1. Smart Presence Logic ---
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, accountId); } catch(e) {}

        const presence = {
            online: isUserActive(p.primaryPlatformInfo?.onlineStatus) || isUserActive(p.presenceState),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Home Screen",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        // --- 2. Trophy Scan ---
        const { trophyTitles } = await getUserTitles(auth, accountId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        // PROTECTION: If PSN says Home Screen but a game was updated 1 hour ago, treat that as the active game
        if (presence.currentGame === "Home Screen" && sortedTitles.length > 0) {
            const lastUpdated = new Date(sortedTitles[0].lastUpdatedDateTime).getTime();
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (lastUpdated > oneHourAgo) {
                presence.currentGame = sortedTitles[0].trophyTitleName;
            }
        }

        const recentGames = [];
        let activeGameTrophies = null;
        let mostRecentTrophies = [];
        let localSummed = 0;

        for (const title of sortedTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            localSummed += earnedC;

            // Gather deep trophy info for active game and global feed
            if (name === presence.currentGame || mostRecentTrophies.length < 20) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    
                    const mapped = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        return { 
                            name: m.trophyName, 
                            type: m.trophyType, 
                            icon: m.trophyIconUrl, 
                            earned: s?.earned || false, 
                            earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : null,
                            rawTimestamp: s?.earned ? new Date(s.earnedDateTime).getTime() : 0,
                            description: m.trophyDetail || "Secret Objective"
                        };
                    });

                    // Set active hunt trophies
                    if (name === presence.currentGame) {
                        activeGameTrophies = mapped;
                        const liveEarned = mapped.filter(t => t.earned).length;
                        const liveTotal = mapped.length || 1; // Prevent division by zero
                        const livePct = Math.round((liveEarned / liveTotal) * 100);

                        if (recentGames.length < 6) {
                            recentGames.push({
                                name, art: title.trophyTitleIconUrl, 
                                progress: livePct, 
                                ratio: `${liveEarned}/${liveTotal}`,
                                hours: parsePlaytime(title.playDuration)
                            });
                        }
                    } else if (recentGames.length < 6) {
                        recentGames.push({
                            name, art: title.trophyTitleIconUrl, progress: title.progress,
                            ratio: `${earnedC}/${(title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze)}`,
                            hours: parsePlaytime(title.playDuration)
                        });
                    }

                    // Feed global recent list
                    mapped.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ 
                            game: name, 
                            name: t.name, 
                            icon: t.icon, 
                            timestamp: t.rawTimestamp, 
                            date: t.earnedDate 
                        });
                    });
                } catch (e) {}
            }
        }

        // Sort global feed
        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);

        // Fallback for active hunt if no game found
        if (!activeGameTrophies && sortedTitles.length > 0) {
            presence.currentGame = sortedTitles[0].trophyTitleName;
            // Recursion protection: we just use the simple stats if deep scan fails
            activeGameTrophies = []; 
        }

        return {
            accountId, ...presence, 
            avatar: profile.avatars?.[0]?.url || "", 
            plus: profile.isPlus, 
            level: stats.trophyLevel,
            recentGames, 
            activeHunt: { 
                title: presence.currentGame, 
                trophies: activeGameTrophies || [] 
            },
            mostRecentTrophies, 
            dataStatus: (localSummed < globalTotal) ? "SYNCING" : "LIVE",
            trophies: { platinum: stats.earnedTrophies?.platinum || 0, total: globalTotal },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { return null; }
}

async function main() {
    let finalData = { users: {}, systemAlerts: [] };
    try {
        if (fs.existsSync(DATA_PATH)) {
            finalData = JSON.parse(fs.readFileSync(DATA_PATH));
        }
    } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788");
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN");

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        try {
            const list = await getFriendsList(masterAuth, wolfFull?.accountId || rayFull?.accountId || finalData.users.werewolf?.accountId);
            for (const f of list.friends || []) {
                const key = PSN_ID_TO_KEY[f.onlineId.toLowerCase()];
                if (key) {
                    const status = f.presence?.primaryPlatformInfo?.onlineStatus || f.presence?.presenceState;
                    const online = isUserActive(status);
                    
                    // Update discovery data
                    if (!finalData.users[key] || !finalData.users[key].dataStatus) {
                        finalData.users[key] = { 
                            online, 
                            currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Home Screen", 
                            platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5" 
                        };
                    } else {
                        // Keep deep data but update status
                        finalData.users[key].online = online;
                        if (online) {
                            finalData.users[key].currentGame = f.presence?.gameTitleInfoList?.[0]?.titleName || finalData.users[key].currentGame;
                        }
                    }
                }
            }
        } catch (e) {}
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log("[SUCCESS] Ghost Protocol Complete.");
}

main();
