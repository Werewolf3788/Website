const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups, // Integrated from Ultimate
    makeUniversalSearch,
    getProfileFromAccountId,
    getRecentlyPlayedGames
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Requirement 10: Kevin's Official Pack Squad
 */
const SQUAD_IDS = {
    ray: "OneLIVIDMAN",         // Ray
    darkwing: "Darkwing69420",  // TJ
    phoenix: "phoenix_darkfire" // Seth
};

// BLOCKLIST: GTA V Titles
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

/**
 * Requirement 7: ISO 8601 Duration Parser
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    const hours = h ? h[1] + "h" : "";
    const mins = m ? m[1] + "m" : "";
    return `${hours} ${mins}`.trim() || "0h";
};

/**
 * Requirement 8 & 11: Enhanced Presence Helper
 */
const getPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceOfUser || psnApi.getUserPresence || psnApi.getPresenceFromUser;
    try {
        const p = await func(auth, accountId);
        return {
            online: p.primaryPlatformInfo?.onlineStatus === "online",
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };
    } catch (e) { 
        return { online: false, currentGame: "", platform: "N/A" }; 
    }
};

async function getFullUserData(npsso, label) {
    try {
        console.log(`--- Starting Full Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);

        // BRIDGE FIX: Resolve numeric accountId to bypass "Bad Request"
        // We get the profile for 'me' to find the onlineId, then search that ID to get the number.
        const selfProfile = await getProfileFromAccountId(authorization, "me");
        const searchSelf = await makeUniversalSearch(authorization, selfProfile.onlineId, "socialAccounts");
        const accountId = searchSelf.domainResponses[0].results[0].socialMetadata.accountId;
        console.log(`[${label}] Account ID Resolved: ${accountId}`);

        // Requirement 11: Console online/offline status
        const presence = await getPresence(authorization, accountId);

        /**
         * Requirement 7: High-res playtime fetch
         */
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => {
                playtimeMap[g.name] = parsePlaytime(g.playDuration);
            });
        } catch (e) { console.log(`[${label}] High-res playtime fetch restricted.`); }

        const { trophyTitles } = await getUserTitles(authorization, accountId);
        const recentGames = [];
        let activeGameMetadata = null;

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earned = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const total = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            
            const gameHours = playtimeMap[name] || parsePlaytime(title.playDuration);

            if (recentGames.length < 6) {
                recentGames.push({
                    name: name,
                    art: title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earned}/${total}`,
                    hours: gameHours,
                    platform: title.npServiceName === "trophy2" ? "PS5" : "PS4"
                });
            }

            // MISSION LOG: Fetch full details for the Active Hunt
            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const { trophyGroups } = await getTitleTrophyGroups(authorization, title.npCommunicationId, "all");

                    activeGameMetadata = {
                        title: name,
                        hours: gameHours,
                        dlcGroups: trophyGroups.map(g => ({
                            name: g.trophyGroupName,
                            progress: g.progress,
                            earned: (g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze),
                            total: (g.definedTrophies.gold + g.definedTrophies.silver + g.definedTrophies.bronze)
                        })),
                        trophies: meta.slice(0, 20).map(m => {
                            const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                            return {
                                name: m.trophyName,
                                type: m.trophyType,
                                icon: m.trophyIconUrl,
                                rarity: m.trophyRare + "%",
                                earned: s?.earned || false,
                                earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleDateString() : "--"
                            };
                        })
                    };
                } catch (e) { console.log(`[${label}] Active Hunt detail failed.`); }
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, accountId);
        const et = stats.earnedTrophies || {};

        return {
            online: presence.online,
            platform: presence.platform,
            currentGame: presence.currentGame,
            avatar: selfProfile.avatars.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url,
            bio: selfProfile.aboutMe || "Admin Kevin",
            plus: selfProfile.isPlus || false,
            level: stats.trophyLevel,
            levelProgress: stats.progress,
            activeHunt: activeGameMetadata,
            recentGames: recentGames,
            trophyPoints: (et.platinum * 300) + (et.gold * 90) + (et.silver * 30) + (et.bronze * 15),
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
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";
    const rayToken = process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix";
    let finalData = { users: {} };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        try {
            const authCode = await exchangeNpssoForCode(werewolfToken);
            const auth = await exchangeCodeForAccessToken(authCode);
            
            const wolfData = await getFullUserData(werewolfToken, "Werewolf");
            if (wolfData) finalData.users.werewolf = wolfData;

            console.log("--- Syncing Squad Status ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    if (search.domainResponses?.[0]?.results?.[0]) {
                        const accId = search.domainResponses[0].results[0].socialMetadata.accountId;
                        finalData.users[key] = await getPresence(auth, accId);
                    }
                } catch (e) { finalData.users[key] = { online: false }; }
            }
        } catch (e) { console.error("Werewolf Auth Failed:", e.message); }
    }

    if (rayToken) {
        const rayDetail = await getFullUserData(rayToken, "Ray");
        if (rayDetail) finalData.users.ray = rayDetail;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log("--- Sync Finished: All Requirements Saved ---");
}

main();
