/**
 * WEREWOLF3788 FAIL-SAFE SYNC ENGINE v4.9.6
 * Fixes: Undefined '0' error in search
 */
const psnApi = require("psn-api");
const fs = require("fs");

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
    getRecentlyPlayedGames,
    getPresenceOfUser
} = psnApi;

// TOKENS
const TOKENS = {
    werewolf: process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG",
    ray: process.env.PSN_NPSSO_RAY || "" 
};

// Squad Tracking (IDs used for Presence)
const SQUAD_IDS = {
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "joe-punk_",
    elucidator: "ElucidatorVah",
    jcrow: "JCrow207",
    unicorn: "UnicornBunnyShiv"
};

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + 'h' : ''} ${m ? m[1] + 'm' : ''}`.trim() || "0h";
};

async function getFullUserData(auth, label) {
    let data = { 
        lastUpdated: new Date().toLocaleString(),
        online: false,
        currentGame: "Dashboard",
        platform: "PS5",
        label: label
    };

    try {
        console.log(`[${label}] Initializing Profile...`);
        
        // 1. Get Profile (This also gets our numeric Account ID without searching)
        const profile = await getProfileFromAccountId(auth, "me");
        const myId = "me"; // We can use 'me' for most calls if we are the owner
        
        data.avatar = profile.avatarUrls.sort((a, b) => b.size - a.size)[0]?.avatarUrl;
        data.plus = profile.isPlus;
        data.bio = profile.aboutMe;

        // 2. Presence
        try {
            const p = await getPresenceOfUser(auth, "me");
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence data skipped.`); }

        // 3. Trophy Summary
        try {
            const stats = await getUserTrophyProfileSummary(auth, "me");
            data.level = stats.trophyLevel;
            data.levelProgress = stats.progress;
            const et = stats.earnedTrophies;
            data.trophies = {
                total: et.platinum + et.gold + et.silver + et.bronze,
                platinum: et.platinum,
                gold: et.gold,
                silver: et.silver,
                bronze: et.bronze
            };
            data.trophyPoints = (et.platinum * 300) + (et.gold * 90) + (et.silver * 30) + (et.bronze * 15);
        } catch (e) { console.log(`[${label}] Stats blocked.`); }

        // 4. Recently Played
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] Playtime data restricted.`); }

        // 5. Game History & Titles
        try {
            const { trophyTitles } = await getUserTitles(auth, "me");
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${t.earnedTrophies.platinum + t.earnedTrophies.gold + t.earnedTrophies.silver + t.earnedTrophies.bronze}/${t.definedTrophies.platinum + t.definedTrophies.gold + t.definedTrophies.silver + t.definedTrophies.bronze}`,
                    hours: playtimeMap[t.trophyTitleName] || parsePlaytime(t.playDuration)
                }));

                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, "me", top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(auth, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(auth, top.npCommunicationId, "all");

                data.activeHunt = {
                    title: top.trophyTitleName,
                    hours: data.recentGames[0].hours,
                    dlcGroups: (trophyGroups || []).map(g => ({
                        name: g.trophyGroupName,
                        progress: g.progress,
                        earned: (g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze),
                        total: (g.definedTrophies.gold + g.definedTrophies.silver + g.definedTrophies.bronze)
                    })),
                    trophies: (meta || []).slice(0, 20).map(m => {
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
            }
        } catch (e) { console.log(`[${label}] History fetch failed: ${e.message}`); }

    } catch (e) {
        console.error(`[${label}] Critical Fail: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // SYNC WEREWOLF
    if (TOKENS.werewolf) {
        try {
            console.log("--- Syncing Werewolf ---");
            const code = await exchangeNpssoForCode(TOKENS.werewolf);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.werewolf = await getFullUserData(auth, "Werewolf");
            
            // Sync Squad using Werewolf Auth
            console.log("--- Syncing Squad Status ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const result = search.domainResponses?.[0]?.results?.[0];
                    
                    if (result) {
                        const accId = result.socialMetadata.accountId;
                        const p = await getPresenceOfUser(auth, accId);
                        finalData.users[key] = {
                            online: p.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`Squad member ${onlineId} fetch failed.`); }
            }
        } catch (e) { console.error("Werewolf Primary Sync Failed."); }
    }

    // SYNC RAY (If token exists)
    if (TOKENS.ray) {
        try {
            console.log("--- Syncing Ray ---");
            const code = await exchangeNpssoForCode(TOKENS.ray);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.ray = await getFullUserData(auth, "Ray");
        } catch (e) { console.error("Ray Sync Failed."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Sync Complete: psn_data.json created ---");
}

main();
