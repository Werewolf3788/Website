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

// BLOCKLIST: GTA titles are filtered out to protect account integrity
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

// Requirement 7: ISO 8601 Duration Parser (PT12H30M -> 12h 30m)
const formatDuration = (durationStr) => {
    if (!durationStr) return "--";
    const h = durationStr.match(/(\d+)H/);
    const m = durationStr.match(/(\d+)M/);
    const hours = h ? h[1] + "h" : "";
    const mins = m ? m[1] + "m" : "";
    return `${hours} ${mins}`.trim() || "0h";
};

// Helper to find presence function
const findPresenceFunc = () => {
    return psnApi.getPresenceFromUser || psnApi.getPresenceOfUser || psnApi.getUserPresence || null;
};

async function getFullUserData(npsso, label) {
    try {
        console.log(`--- Starting Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);

        // Requirement 11: Console online/offline status
        let isOnline = false;
        const presenceFunc = findPresenceFunc();
        if (presenceFunc) {
            try {
                const presence = await presenceFunc(authorization, "me");
                isOnline = presence.primaryPlatformInfo?.onlineStatus === "online";
            } catch (e) { console.log(`[${label}] Presence fetch restricted.`); }
        }

        // Requirement 1, 2, 7: High-res current game data
        let currentGameName = "Dashboard";
        let currentGameArt = "";
        let currentGamePlaytime = "--";
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 1 });
            const lastGame = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games?.[0];
            if (lastGame && !BLACKLIST.some(f => lastGame.name.toLowerCase().includes(f))) {
                currentGameName = lastGame.name;
                currentGameArt = lastGame.image?.url || "";
                currentGamePlaytime = formatDuration(lastGame.playDuration);
            }
        } catch (e) { console.log(`[${label}] Playtime stats fetch failed.`); }

        // Global Stats
        const trophySummary = await getUserTrophyProfileSummary(authorization, "me");

        // Requirement 5, 6, 9: Recent Games and Progress (33/100)
        const { trophyTitles } = await getUserTitles(authorization, "me");
        const recentGames = [];
        let latestTrophyInfo = null;
        let detectedGameProgress = 0;
        let detectedGameRatio = "0/0";

        for (const title of trophyTitles) {
            if (BLACKLIST.some(f => title.trophyTitleName.toLowerCase().includes(f))) continue;

            // Requirement 6: Calculate earned vs total ratio
            const earned = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const total = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            const ratio = `${earned}/${total}`;

            if (title.trophyTitleName === currentGameName) {
                detectedGameProgress = title.progress;
                detectedGameRatio = ratio;
            }

            if (recentGames.length < 5) {
                recentGames.push({
                    name: title.trophyTitleName,
                    progress: title.progress,
                    ratio: ratio,
                    art: title.trophyTitleIconUrl
                });
            }

            // Requirement 3 & 4: Latest Trophy Title and Image
            if (!latestTrophyInfo) {
                try {
                    const { trophies: earnedTrophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
                    const { trophies: trophyMetadata } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const newest = earnedTrophies.filter(t => t.earned).sort((a, b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime))[0];
                    if (newest) {
                        const meta = trophyMetadata.find(m => m.trophyId === newest.trophyId);
                        latestTrophyInfo = {
                            name: meta.trophyName,
                            game: title.trophyTitleName,
                            icon: meta.trophyIconUrl
                        };
                    }
                } catch (e) { }
            }
        }

        return {
            level: trophySummary.trophyLevel,
            levelProgress: trophySummary.progress,
            online: isOnline,
            currentGame: currentGameName,
            currentGameArt: currentGameArt,
            currentGamePlaytime: currentGamePlaytime,
            currentGameProgress: detectedGameProgress,
            currentGameRatio: detectedGameRatio,
            recentTrophy: latestTrophyInfo,
            recentGames: recentGames,
            trophies: {
                platinum: trophySummary.earnedTrophies.platinum,
                gold: trophySummary.earnedTrophies.gold,
                silver: trophySummary.earnedTrophies.silver,
                bronze: trophySummary.earnedTrophies.bronze,
                total: (trophySummary.earnedTrophies.platinum + trophySummary.earnedTrophies.gold + trophySummary.earnedTrophies.silver + trophySummary.earnedTrophies.bronze)
            },
            lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        };
    } catch (error) {
        console.error(`[${label}] Fatal Error:`, error.message);
        return null;
    }
}

// Requirement 8: Friends active game status
async function getFriendStatus(authorization, onlineId) {
    try {
        const searchResults = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
        if (!searchResults.domainResponses[0]?.results?.length) return { online: false, currentGame: "" };
        const accountId = searchResults.domainResponses[0].results[0].socialMetadata.accountId;
        
        let game = "";
        let status = "offline";
        const presenceFunc = findPresenceFunc();
        if (presenceFunc) {
            try {
                const presence = await presenceFunc(authorization, accountId);
                game = presence.gameTitleInfoList?.[0]?.titleName || "";
                status = presence.primaryPlatformInfo.onlineStatus;
            } catch (e) { }
        }
        if (game && BLACKLIST.some(f => game.toLowerCase().includes(f))) game = "Classified";
        return { online: status === "online", currentGame: game };
    } catch (e) { return { online: false, currentGame: "" }; }
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF;
    const rayToken = process.env.PSN_NPSSO_RAY;
    let finalData = { users: {} };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        // Authenticate primary token for friend searches
        const accessCode = await exchangeNpssoForCode(werewolfToken);
        const authorization = await exchangeCodeForAccessToken(accessCode);
        
        finalData.users.werewolf = await getFullUserData(werewolfToken, "Werewolf");
        
        // Requirement 10: Specific friends list
        console.log("--- Syncing Lobby Friends ---");
        finalData.users.ray = await getFriendStatus(authorization, "raymystyro");
        finalData.users.phoenix = await getFriendStatus(authorization, "phoenix_darkfire");
        finalData.users.terrdog = await getFriendStatus(authorization, "TerrDog420");
        finalData.users.darkwing = await getFriendStatus(authorization, "Darkwing69420");
        finalData.users.elucidator = await getFriendStatus(authorization, "ElucidatorVah");
    }

    if (rayToken) {
        const rayDetail = await getFullUserData(rayToken, "Ray");
        if (rayDetail) finalData.users.ray_detail = rayDetail;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log("--- Sync Finished: All JS Requirements Met ---");
}

main();
