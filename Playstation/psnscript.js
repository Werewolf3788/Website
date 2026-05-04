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
 * Version 7.8.0 - Live-Lock Protocol (Verified Squad Core)
 * Filepath: Playstation/psnscript.js
 * * DESCRIPTION:
 * High-performance PSN data synchronizer for the Werewolf squad.
 * Optimized for Kevin (Werewolf3788) with verified Account IDs.
 * * SQUAD MEMBERS:
 * - Werewolf3788 (Kevin)
 * - OneLIVIDMAN (Ray)
 * - Darkwing69420 (TJ)
 * - phoenix_darkfire (Seth)
 * - ElucidatorVah (Marc)
 * - JCrow207
 * - UnicornBunnyShiv
 */

// Squad mapping for display keys to Online IDs
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    balto: "Balto20_01",
    mjolnir: "IlIMjolnirIlI",
    marc: "ElucidatorVah",
    jcrow: "JCrow207",
    bunny: "UnicornBunnyShiv"
};

// Verified Account IDs for high-priority precision tracking
const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523",
    jcrow: "7524753921019262614",
    bunny: "7742137722487951585",
    phoenix: "phoenix_darkfire_id_placeholder" // Replace with verified ID if available
};

const PSN_ID_TO_KEY = Object.entries(SQUAD_MAP).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const DATA_PATH = path.join(__dirname, "psn_data.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Token load failed"); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

/**
 * Advanced Presence Check
 * Determines if a user is truly "Active" based on platform status and game activity.
 */
const isUserActive = (p) => {
    if (!p) return false;
    const status = (p.primaryPlatformInfo?.onlineStatus || "").toLowerCase();
    const state = (p.presenceState || "").toLowerCase();
    const avail = (p.availability || "").toLowerCase();
    
    return status.includes("online") || 
           state.includes("online") || 
           avail.includes("available") ||
           status === "busy" || 
           status === "away" ||
           (p.gameTitleInfoList && p.gameTitleInfoList.length > 0);
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
        } catch (e) {
            console.error(`[AUTH] Refresh failed for ${userKey}`);
        }
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
        } catch (e) { 
            console.error(`[AUTH] NPSSO exchange failed for ${userKey}`);
            return null; 
        }
    }
    return null;
}

async function getFullUserData(auth, label, targetOnlineId, existingData) {
    if (!auth) return existingData || null;
    try {
        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        
        let p = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { p = await getBasicPresence(auth, accountId); } catch(e) {}

        const presence = {
            online: isUserActive(p),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Home Screen",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const globalTotal = (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0);

        const { trophyTitles } = await getUserTitles(auth, accountId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        if (presence.online && (presence.currentGame === "Home Screen" || !presence.currentGame) && sortedTitles.length > 0) {
            presence.currentGame = sortedTitles[0].trophyTitleName;
        }

        const recentGames = [];
        let activeGameTrophies = null;
        let mostRecentTrophies = [];
        let localSummed = 0;

        for (const title of sortedTitles.slice(0, 10)) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            localSummed += earnedC;

            if (name === presence.currentGame || mostRecentTrophies.length < 5) {
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

                    if (name === presence.currentGame) {
                        activeGameTrophies = mapped;
                        const liveEarned = mapped.filter(t => t.earned).length;
                        const liveTotal = Math.max(mapped.length, 1);
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
            accountId, ...presence, 
            avatar: profile.avatars?.[0]?.url || "", 
            plus: profile.isPlus, 
            level: stats.trophyLevel,
            recentGames, 
            activeHunt: { title: presence.currentGame, trophies: activeGameTrophies || [] },
            mostRecentTrophies, 
            dataStatus: (localSummed < globalTotal) ? "SYNCING" : "LIVE",
            trophies: { platinum: stats.earnedTrophies?.platinum || 0, total: globalTotal },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[SYNC] Error for ${label}:`, e.message);
        return existingData || null; 
    }
}

async function main() {
    console.log("[INIT] Starting Live-Lock Sync Engine v7.8.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { users: {}, systemAlerts: [] };
    try {
        if (fs.existsSync(DATA_PATH)) {
            finalData = JSON.parse(fs.readFileSync(DATA_PATH));
        }
    } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);

    const wolfFull = await getFullUserData(wolfAuth, "Werewolf", "Werewolf3788", finalData.users.werewolf);
    const rayFull = await getFullUserData(rayAuth, "Ray", "OneLIVIDMAN", finalData.users.ray);

    if (wolfFull) finalData.users.werewolf = wolfFull;
    if (rayFull) finalData.users.ray = rayFull;

    const masterAuth = wolfAuth || rayAuth;
    if (masterAuth) {
        try {
            // Precise accountId for Werewolf used for the friends list fetch
            const myId = ACCOUNT_IDS.werewolf;
            const list = await getFriendsList(masterAuth, myId);
            
            for (const f of list.friends || []) {
                const key = PSN_ID_TO_KEY[f.onlineId.toLowerCase()];
                if (key) {
                    const online = isUserActive(f.presence);
                    if (!finalData.users[key]) finalData.users[key] = {};
                    
                    finalData.users[key].online = online;
                    finalData.users[key].platform = f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
                    if (online && f.presence?.gameTitleInfoList?.[0]?.titleName) {
                        finalData.users[key].currentGame = f.presence.gameTitleInfoList[0].titleName;
                    }
                }
            }

            // Forced fallback check for squad members not in friend list but tracked via ID
            for (const [key, accountId] of Object.entries(ACCOUNT_IDS)) {
                if (!finalData.users[key] || (!finalData.users[key].online && key !== 'werewolf' && key !== 'ray')) {
                    try {
                        const p = await getBasicPresence(masterAuth, accountId);
                        const online = isUserActive(p);
                        if (!finalData.users[key]) finalData.users[key] = {};
                        finalData.users[key].online = online;
                        finalData.users[key].platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
                        if (online) {
                            finalData.users[key].currentGame = p.gameTitleInfoList?.[0]?.titleName || "Home Screen";
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.error("[SYNC] Squad status update failed:", e.message);
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log("[SUCCESS] Live-Lock Sync Complete.");
}

main();
