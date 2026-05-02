const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups,
    makeUniversalSearch,
    getProfileFromAccountId,
    getFriendsFromAccountId,
    getRecentlyPlayedGames // NEW: Re-added for high-res playtime
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack - Expanded SQUAD_IDS
 */
const SQUAD_IDS = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "joe-punk_",
    elucidator: "ElucidatorVah",
    jcrow: "JCrow207",
    unicorn: "UnicornBunnyShiv"
};

// GTA V is kept here to prevent unauthorized session activity from appearing on the Hub
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

/**
 * Requirement 7: ISO 8601 Duration Parser (PT12H30M -> 12h 30m)
 * Ensures "hours played on game" is formatted correctly.
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
 * Helper: Formats duration between two dates
 * Used for the Mission Log to show how long between trophy unlocks
 */
const getDurationText = (start, end) => {
    const diff = new Date(end) - new Date(start);
    if (diff <= 0) return "First Achievement";
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
};

/**
 * Enhanced Presence Helper
 */
const getEnhancedPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceFromUser || psnApi.getPresenceOfUser || psnApi.getUserPresence;
    try {
        const p = await func(auth, accountId);
        const platform = p.primaryPlatformInfo?.platform || "Unknown";
        const isOnline = p.primaryPlatformInfo?.onlineStatus === "online";
        const isMobile = p.primaryPlatformInfo?.platform === "mobile";
        
        return {
            online: isOnline,
            platform: isMobile ? "MOBILE" : platform.toUpperCase(),
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            isMenu: !p.gameTitleInfoList?.[0]?.titleName,
            lastSeen: p.lastOnlineDate || new Date().toISOString()
        };
    } catch (e) { 
        return { online: false, platform: "N/A", currentGame: "", lastSeen: "" }; 
    }
};

async function getFullUserData(npsso, label) {
    try {
        console.log(`--- Starting Ultimate Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);
        
        // Fetch Core Profile and Presence
        const profile = await getProfileFromAccountId(authorization, "me");
        const presence = await getEnhancedPresence(authorization, "me");
        const friends = await getFriendsFromAccountId(authorization, "me", { limit: 1 });

        /**
         * Fetch high-res playtime data.
         * This pulls the actual hours from the recently played library.
         */
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => {
                playtimeMap[g.name] = parsePlaytime(g.playDuration);
            });
        } catch (e) { 
            console.log(`[${label}] High-res playtime fetch failed, will use title duration fallback.`); 
        }

        const { trophyTitles } = await getUserTitles(authorization, "me");
        const recentGames = [];
        let activeGameMetadata = null;

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earned = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const total = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            
            // Map playtime from high-res API or fallback to title duration
            const gameHours = playtimeMap[name] || parsePlaytime(title.playDuration);

            if (recentGames.length < 6) {
                recentGames.push({
                    name: name,
                    art: title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earned}/${total}`,
                    hours: gameHours, // Re-added: Total lifetime hours
                    platform: title.npServiceName === "trophy2" ? "PS5" : "PS4"
                });
            }

            // Fetch ULTIMATE MISSION LOG (Including Groups/DLC)
            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const { trophyGroups } = await getTitleTrophyGroups(authorization, title.npCommunicationId, "all");

                    const earnedTrophies = earnedStatus.filter(t => t.earned);
                    const firstDate = earnedTrophies.length > 0 
                        ? Math.min(...earnedTrophies.map(t => new Date(t.earnedDateTime))) 
                        : null;

                    const trophiesDetailed = meta.map(m => {
                        const status = earnedStatus.find(s => s.trophyId === m.trophyId);
                        const isEarned = status?.earned || false;
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);

                        return {
                            name: m.trophyName,
                            description: m.trophyDetail,
                            icon: m.trophyIconUrl,
                            type: m.trophyType,
                            rarity: m.trophyRare + "%",
                            rarityName: m.trophyRare >= 50 ? "Common" : (m.trophyRare >= 20 ? "Rare" : "Ultra Rare"),
                            earned: isEarned,
                            earnedDate: isEarned ? new Date(status.earnedDateTime).toLocaleDateString() : "--",
                            earnedTime: isEarned ? new Date(status.earnedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--",
                            duration: isEarned ? getDurationText(firstDate, status.earnedDateTime) : null,
                            groupName: group ? group.trophyGroupName : "Base Game"
                        };
                    });

                    activeGameMetadata = {
                        title: name,
                        hours: gameHours,
                        trophies: trophiesDetailed,
                        dlcGroups: trophyGroups.map(g => ({
                            name: g.trophyGroupName,
                            progress: g.progress,
                            earned: (g.earnedTrophies.platinum + g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze),
                            total: (g.definedTrophies.platinum + g.definedTrophies.gold + g.definedTrophies.silver + g.definedTrophies.bronze)
                        }))
                    };

                } catch (e) { console.error(`Error in metadata fetch for ${name}:`, e.message); }
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, "me");
        const et = stats.earnedTrophies || {};

        // Calculate Trophy Points (PSN Official Weighting)
        const totalPoints = (et.bronze * 15) + (et.silver * 30) + (et.gold * 90) + (et.platinum * 300);

        return {
            online: presence.online,
            platform: presence.platform,
            currentGame: presence.currentGame,
            avatar: profile.avatarUrls.sort((a,b) => b.size - a.size)[0]?.avatarUrl || "", 
            bio: profile.aboutMe || "",
            plus: profile.isPlus || false,
            friendCount: friends.totalItemCount || 0,
            trophyPoints: totalPoints,
            level: stats.trophyLevel,
            levelProgress: stats.progress,
            activeHunt: activeGameMetadata,
            recentGames: recentGames,
            hours: activeGameMetadata?.hours || "0h", // Current session game hours
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
            
            const wolfData = await getFullUserData(werewolfToken, "Werewolf");
            if (wolfData) finalData.users.werewolf = wolfData;

            console.log("--- Syncing Squad ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                if (key === 'werewolf') continue;
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    if (search.domainResponses?.[0]?.results?.[0]) {
                        const accId = search.domainResponses[0].results[0].socialMetadata.accountId;
                        finalData.users[key] = await getEnhancedPresence(auth, accId);
                    }
                } catch (e) { finalData.users[key] = { online: false, currentGame: "", platform: "N/A" }; }
            }
        } catch (e) { console.error("Auth Loop Failed:", e.message); }
    }

    if (rayToken) {
        const rayDetail = await getFullUserData(rayToken, "Ray");
        if (rayDetail) finalData.users.ray = rayDetail;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log("--- Ultimate Sync Finished ---");
}

main();
