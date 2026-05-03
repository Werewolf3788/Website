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
 * Version 7.4.5 - Real-Time Percentage Fix & Mahjong 3D Deep Scan
 * Filepath: Playstation/psnscript.js
 * FIXED: Mahjong 3D 30% lag by calculating progress from live trophy counts.
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

const isUserActive = (status) => ["online", "busy", "away"].includes(status?.toLowerCase());

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
        
        // Forced Presence Lock
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, accountId); } catch(e) {}

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
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            localSummed += earnedC;

            // Deep Scan for the active game (e.g. Mahjong 3D)
            if (name === presence.currentGame || mostRecentTrophies.length < 15) {
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

                    // If this is the active game, we manually recalculate the percentage to bypass PSN lag
                    if (name === presence.currentGame) {
                        activeGameTrophies = mapped;
                        const liveEarned = mapped.filter(t => t.earned).length;
                        const liveTotal = mapped.length;
                        const livePct = Math.round((liveEarned / liveTotal) * 100);
                        
                        // Push to recent games with THE REAL LATEST DATA
                        if (recentGames.length < 6) {
                            recentGames.push({
                                name, art: title.trophyTitleIconUrl, 
                                progress: livePct, // Using live calculated Pct instead of title.progress
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

                    // Feed Recent Trophies (ensure icons are present)
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

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);

        return {
            accountId, ...presence, avatar: profile.avatars?.[0]?.url || "", plus: profile.isPlus, level: stats.trophyLevel,
            recentGames, activeHunt: { title: presence.currentGame, trophies: (activeGameTrophies || []).slice(0, 15) },
            mostRecentTrophies, dataStatus: (localSummed < globalTotal) ? "SYNCING" : "LIVE",
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
    } catch (e) { console.error("[WARN] Backup load failed."); }

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
                if (key && !finalData.users[key]?.dataStatus) {
                    finalData.users[key] = { 
                        online: isUserActive(f.presence?.primaryPlatformInfo?.onlineStatus), 
                        currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Home Screen", 
                        platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5" 
                    };
                }
            }
        } catch (e) {}
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log("[SUCCESS] Master Sync v7.4.5 Complete.");
}

main();
