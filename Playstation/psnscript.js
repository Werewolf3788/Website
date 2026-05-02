/**
 * WEREWOLF3788 FAIL-SAFE SYNC ENGINE v4.9.2
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
    return `${h ? h[1]+'h' : ''} ${m ? m[1]+'m' : ''}`.trim() || "0h";
};

async function getFullUserData(auth, label) {
    let data = { lastUpdated: new Date().toLocaleString() };
    
    // 1. Core Profile (Non-negotiable)
    try {
        const profile = await getProfileFromAccountId(auth, "me");
        data.avatar = profile.avatarUrls.sort((a,b) => b.size - a.size)[0]?.avatarUrl;
        data.plus = profile.isPlus;
    } catch (e) { console.log(`[${label}] Profile fetch failed.`); }

    // 2. Presence
    try {
        const p = await getPresenceOfUser(auth, "me");
        data.online = p.primaryPlatformInfo?.onlineStatus === "online";
        data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
        data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
    } catch (e) { data.online = false; }

    // 3. Stats
    try {
        const stats = await getUserTrophyProfileSummary(auth, "me");
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
    } catch (e) { console.log(`[${label}] Stats fetch failed.`); }

    // 4. Recently Played & Playtime
    let playtimeMap = {};
    try {
        const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 15 });
        const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
        games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
    } catch (e) { console.log(`[${label}] Playtime API blocked.`); }

    // 5. Game History & Active Hunt
    try {
        const { trophyTitles } = await getUserTitles(auth, "me");
        data.recentGames = trophyTitles.slice(0, 6).map(t => ({
            name: t.trophyTitleName,
            art: t.trophyTitleIconUrl,
            progress: t.progress,
            ratio: `${t.earnedTrophies.platinum+t.earnedTrophies.gold+t.earnedTrophies.silver+t.earnedTrophies.bronze}/${t.definedTrophies.platinum+t.definedTrophies.gold+t.definedTrophies.silver+t.definedTrophies.bronze}`,
            hours: playtimeMap[t.trophyTitleName] || parsePlaytime(t.playDuration)
        }));

        // Deep dive into the top game for Mission Log
        const top = trophyTitles[0];
        const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, "me", top.npCommunicationId, "all");
        const { trophies: meta } = await getTitleTrophies(auth, top.npCommunicationId, "all");
        const { trophyGroups } = await getTitleTrophyGroups(auth, top.npCommunicationId, "all");

        data.activeHunt = {
            title: top.trophyTitleName,
            hours: data.recentGames[0].hours,
            dlcGroups: trophyGroups.map(g => ({ name: g.trophyGroupName, earned: (g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze), total: (g.definedTrophies.gold + g.definedTrophies.silver + g.definedTrophies.bronze) })),
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
    } catch (e) { console.log(`[${label}] Game/Trophy history failed.`); }

    return data;
}

async function main() {
    try {
        const accessCode = await exchangeNpssoForCode(NPSSO_TOKEN);
        const auth = await exchangeCodeForAccessToken(accessCode);
        let finalData = { users: {} };
        
        finalData.users.werewolf = await getFullUserData(auth, "Werewolf");

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
        console.log("--- Bridge Finalized: psn_data.json is ready ---");
    } catch (e) { console.error("FATAL: NPSSO Token Expired.", e.message); }
}
main();
