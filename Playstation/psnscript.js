/**
 * WEREWOLF3788 FAIL-SAFE SYNC ENGINE v4.9.3
 * Run this on your PC: node werewolf_sync.js
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

// YOUR ACTIVE TOKEN
const NPSSO_TOKEN = "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";

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
        platform: "PS5"
    };

    try {
        // 1. Handshake: Get actual Account ID (More stable than "me")
        console.log(`[${label}] Performing API Handshake...`);
        const searchSelf = await makeUniversalSearch(auth, "Werewolf3788", "socialAccounts");
        const myId = searchSelf.domainResponses[0].results[0].socialMetadata.accountId;
        console.log(`[${label}] Account ID verified: ${myId}`);

        // 2. Profile Data
        try {
            const profile = await getProfileFromAccountId(auth, myId);
            data.avatar = profile.avatarUrls.sort((a, b) => b.size - a.size)[0]?.avatarUrl;
            data.plus = profile.isPlus;
            data.bio = profile.aboutMe;
        } catch (e) { console.log(`[${label}] Profile blocked by Privacy Settings.`); }

        // 3. Presence
        try {
            const p = await getPresenceOfUser(auth, myId);
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence data unavailable.`); }

        // 4. Global Stats
        try {
            const stats = await getUserTrophyProfileSummary(auth, myId);
            data.level = stats.trophyLevel;
            data.levelProgress = stats.progress;
            data.trophies = {
                total: stats.earnedTrophies.platinum + stats.earnedTrophies.gold + stats.earnedTrophies.silver + stats.earnedTrophies.bronze,
                platinum: stats.earnedTrophies.platinum,
                gold: stats.earnedTrophies.gold,
                silver: stats.earnedTrophies.silver,
                bronze: stats.earnedTrophies.bronze
            };
            data.trophyPoints = (data.trophies.platinum * 300) + (data.trophies.gold * 90) + (data.trophies.silver * 30) + (data.trophies.bronze * 15);
        } catch (e) { console.log(`[${label}] Trophy Summary blocked by Privacy.`); }

        // 5. Playtime (High-res)
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] Playtime data blocked by Privacy.`); }

        // 6. Game Titles & Active Hunt
        try {
            const { trophyTitles } = await getUserTitles(auth, myId);
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${t.earnedTrophies.platinum + t.earnedTrophies.gold + t.earnedTrophies.silver + t.earnedTrophies.bronze}/${t.definedTrophies.platinum + t.definedTrophies.gold + t.definedTrophies.silver + t.definedTrophies.bronze}`,
                    hours: playtimeMap[t.trophyTitleName] || parsePlaytime(t.playDuration)
                }));

                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, myId, top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(auth, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(auth, top.npCommunicationId, "all");

                data.activeHunt = {
                    title: top.trophyTitleName,
                    hours: data.recentGames[0].hours,
                    dlcGroups: trophyGroups.map(g => ({
                        name: g.trophyGroupName,
                        earned: (g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze),
                        total: (g.definedTrophies.gold + g.definedTrophies.silver + g.definedTrophies.bronze)
                    })),
                    trophies: meta.slice(0, 15).map(m => {
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
        } catch (e) { console.log(`[${label}] Trophy History/Titles blocked by Privacy.`); }

    } catch (e) {
        console.error(`[${label}] Critical Handshake Failure: ${e.message}`);
    }

    return data;
}

async function main() {
    try {
        console.log("--- Starting Werewolf Sync v4.9.3 ---");
        const accessCode = await exchangeNpssoForCode(NPSSO_TOKEN);
        const auth = await exchangeCodeForAccessToken(accessCode);
        let finalData = { users: {} };
        
        finalData.users.werewolf = await getFullUserData(auth, "Werewolf");

        console.log("--- Syncing Squad Status ---");
        for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
            try {
                const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                const accId = search.domainResponses[0].results[0].socialMetadata.accountId;
                const p = await getPresenceOfUser(auth, accId);
                finalData.users[key] = {
                    online: p.primaryPlatformInfo?.onlineStatus === "online",
                    currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                    platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                };
            } catch (e) { finalData.users[key] = { online: false }; }
        }

        fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
        console.log("--- Sync Complete: psn_data.json updated ---");
    } catch (e) { 
        console.error("FATAL: Auth loop failed. Check NPSSO Token.", e.message); 
    }
}

main();
