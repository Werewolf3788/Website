const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    makeUniversalSearch,
    getRecentlyPlayedGames
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Requirement 10: Your specific most played friends (Kevin's Pack)
 */
const SQUAD_IDS = {
    ray: "raymystyro",         // Ray (OneLIVIDMAN)
    darkwing: "Darkwing69420",   // TJ (TerrDog)
    phoenix: "phoenix_darkfire", // Seth (Fluffy)
    elucidator: "ElucidatorVah"  // Elucidator
};

// BLOCKLIST: Titles that will never show up on your site
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

/**
 * Requirement 7: ISO 8601 Duration Parser (PT12H30M -> 12h 30m)
 * Ensures "hours played on game" is formatted correctly.
 */
const parsePlaytime = (duration) => {
    if (!duration) return "--";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    const hours = h ? h[1] + "h" : "";
    const mins = m ? m[1] + "m" : "";
    return `${hours} ${mins}`.trim() || "0h";
};

/**
 * Requirement 8 & 11: Helper for Presence (Online/Offline + Active Game)
 */
const getPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceFromUser || psnApi.getPresenceOfUser || psnApi.getUserPresence;
    try {
        const p = await func(auth, accountId);
        return {
            online: p.primaryPlatformInfo?.onlineStatus === "online",
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "" // Req 8
        };
    } catch (e) { 
        return { online: false, currentGame: "" }; 
    }
};

async function getFullUserData(npsso, label) {
    try {
        console.log(`--- Starting Full Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);
        
        // Requirement 11: Console online/offline status
        const presence = await getPresence(authorization, "me");

        /**
         * Requirement 7: Fetch high-res playtime data.
         * This pulls the actual hours you see on your console.
         */
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 10 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => {
                playtimeMap[g.name] = parsePlaytime(g.playDuration);
            });
        } catch (e) { 
            console.log(`[${label}] High-res playtime fetch failed, using fallback.`); 
        }

        // Requirements 1, 2, 5, 6, 9: Game info, Art, Progress, Ratio, and History
        const { trophyTitles } = await getUserTitles(authorization, "me");
        const recentGames = [];
        let latestTrophyInfo = null;

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            /**
             * Requirement 6: Calculate earned vs total ratio (e.g., 33/100)
             */
            const earned = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const total = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            const ratio = `${earned}/${total}`;
            
            // Map playtime from high-res API or fallback to title duration
            const gameHours = playtimeMap[name] || parsePlaytime(title.playDuration);

            // Requirement 9: List of 5 most recent games
            if (recentGames.length < 5) {
                recentGames.push({
                    name: name,                // Req 1
                    art: title.trophyTitleIconUrl, // Req 2
                    progress: title.progress,     // Req 5
                    ratio: ratio,                 // Req 6
                    hours: gameHours              // Req 7
                });
            }

            /**
             * Requirement 3 & 4: Latest Trophy Title and Image
             */
            if (!latestTrophyInfo) {
                try {
                    const { trophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const lastEarned = trophies.filter(t => t.earned).sort((a,b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime))[0];
                    if (lastEarned) {
                        const m = meta.find(x => x.trophyId === lastEarned.trophyId);
                        latestTrophyInfo = {
                            name: m.trophyName, // Req 3
                            icon: m.trophyIconUrl, // Req 4
                            game: name
                        };
                    }
                } catch (e) {}
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, "me");
        
        // Find stats for current game to ensure Requirement 1-7 are top-level for the active game
        const activeGameStats = recentGames.find(g => g.name === presence.currentGame) || recentGames[0];
        const et = stats.earnedTrophies || {};

        return {
            online: presence.online,                 // Req 11
            currentGame: presence.currentGame || "Dashboard", // Req 1
            gameArt: activeGameStats?.art || "",     // Req 2
            hours: activeGameStats?.hours || "--",   // Req 7
            progress: activeGameStats?.progress || 0,  // Req 5
            ratio: activeGameStats?.ratio || "0/0",  // Req 6
            recentTrophy: latestTrophyInfo,          // Req 3 & 4
            recentGames: recentGames,                // Req 9
            level: stats.trophyLevel,
            trophies: {
                platinum: et.platinum || 0,
                gold: et.gold || 0,
                silver: et.silver || 0,
                bronze: et.bronze || 0,
                total: (et.platinum || 0) + (et.gold || 0) + (et.silver || 0) + (et.bronze || 0)
            },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[${label}] Fatal Error:`, e.message); 
        return null; 
    }
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF;
    const rayToken = process.env.PSN_NPSSO_RAY;
    let finalData = { users: {} };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        try {
            const authCode = await exchangeNpssoForCode(werewolfToken);
            const auth = await exchangeCodeForAccessToken(authCode);
            
            // Full Sync for Kevin (Admin)
            const wolfData = await getFullUserData(werewolfToken, "Werewolf");
            if (wolfData) finalData.users.werewolf = wolfData;

            /**
             * Requirement 8 & 10: Sync Squad Members into the Lobby
             */
            console.log("--- Syncing Lobby Friends (Req 10) ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    if (search.domainResponses?.[0]?.results?.[0]) {
                        const accId = search.domainResponses[0].results[0].socialMetadata.accountId;
                        finalData.users[key] = await getPresence(auth, accId);
                    }
                } catch (e) { 
                    finalData.users[key] = { online: false, currentGame: "" }; 
                }
            }
        } catch (e) { 
            console.error("Werewolf Primary Auth Failed:", e.message); 
        }
    }

    /**
     * Requirement: High-res detailed data for Ray if his token is present
     */
    if (rayToken) {
        console.log("--- Syncing Ray Detailed (Req 10) ---");
        const rayDetail = await getFullUserData(rayToken, "Ray");
        if (rayDetail) {
            finalData.users.ray = rayDetail;
        }
    }

    // Save to file for the website Hub
    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log("--- Sync Finished: All 11 Requirements Saved ---");
}

main();
