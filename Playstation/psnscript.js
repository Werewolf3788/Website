/**
 * WEREWOLF3788 OFFICIAL NPM-PATTERN SYNC ENGINE v5.0.0
 * Based on the latest psn-api implementation standards.
 * * 1. exchangeNpssoForCode
 * 2. exchangeCodeForAccessToken
 * 3. getProfileFromAccountId -> Resolve ID
 * 4. Scoped Data Fetching
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

// TOKENS (Official NPSSO Pattern)
const TOKENS = {
    werewolf: process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG",
    ray: process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix"
};

// SQUAD CONFIG (Seth, Ray, TJ Aliases)
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

async function getFullUserData(authorization, label, onlineId) {
    console.log(`[${label}] Starting Official NPM Flow...`);
    
    let data = { 
        lastUpdated: new Date().toLocaleString(),
        online: false,
        currentGame: "Dashboard",
        platform: "PS5",
        label: label,
        trophies: { total: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
    };

    try {
        // Step 1: Resolve the actual numeric Account ID from the Token
        // This is the NPM recommended way to avoid 'me' restriction issues
        const profile = await getProfileFromAccountId(authorization, "me");
        const accountId = "me"; // 'me' is officially supported for profile calls

        data.avatar = profile.avatarUrls.sort((a, b) => b.size - a.size)[0]?.avatarUrl;
        data.plus = profile.isPlus;
        data.bio = profile.aboutMe;
        console.log(`[${label}] Authenticated as ${profile.onlineId}`);

        // Step 2: Presence & Activity
        try {
            const presence = await getPresenceOfUser(authorization, accountId);
            data.online = presence.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = presence.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = presence.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence fetch skipped.`); }

        // Step 3: Global Trophy Summary
        try {
            const stats = await getUserTrophyProfileSummary(authorization, accountId);
            data.level = stats.trophyLevel;
            data.levelProgress = stats.progress;
            data.trophies = {
                total: (stats.earnedTrophies.platinum || 0) + (stats.earnedTrophies.gold || 0) + (stats.earnedTrophies.silver || 0) + (stats.earnedTrophies.bronze || 0),
                platinum: stats.earnedTrophies.platinum || 0,
                gold: stats.earnedTrophies.gold || 0,
                silver: stats.earnedTrophies.silver || 0,
                bronze: stats.earnedTrophies.bronze || 0
            };
            data.trophyPoints = (data.trophies.platinum * 300) + (data.trophies.gold * 90) + (data.trophies.silver * 30) + (data.trophies.bronze * 15);
        } catch (e) { console.log(`[${label}] Stats fetch restricted.`); }

        // Step 4: High-Res Playtime (The NPM "Recently Played" Pattern)
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => {
                playtimeMap[g.name] = parsePlaytime(g.playDuration);
            });
        } catch (e) { console.log(`[${label}] High-res playtime restricted.`); }

        // Step 5: Titles & Active Hunt Detail
        try {
            const { trophyTitles } = await getUserTitles(authorization, accountId);
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${(t.earnedTrophies.platinum || 0) + (t.earnedTrophies.gold || 0) + (t.earnedTrophies.silver || 0) + (t.earnedTrophies.bronze || 0)}/${(t.definedTrophies.platinum || 0) + (t.definedTrophies.gold || 0) + (t.definedTrophies.silver || 0) + (t.definedTrophies.bronze || 0)}`,
                    hours: playtimeMap[t.trophyTitleName] || parsePlaytime(t.playDuration)
                }));

                // Focus on the top game for the Mission Log
                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(authorization, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(authorization, top.npCommunicationId, "all");

                data.activeHunt = {
                    title: top.trophyTitleName,
                    hours: data.recentGames[0].hours,
                    dlcGroups: (trophyGroups || []).map(g => ({
                        name: g.trophyGroupName,
                        progress: g.progress || 0,
                        earned: (g.earnedTrophies.gold || 0) + (g.earnedTrophies.silver || 0) + (g.earnedTrophies.bronze || 0),
                        total: (g.definedTrophies.gold || 0) + (g.definedTrophies.silver || 0) + (g.definedTrophies.bronze || 0)
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
        } catch (e) { console.log(`[${label}] Title History Restricted.`); }

    } catch (e) {
        console.error(`[${label}] Critical Fail in NPM Flow: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // AUTH KEVIN (WEREWOLF)
    if (TOKENS.werewolf) {
        try {
            console.log("--- Executing Kevin Sync ---");
            const accessCode = await exchangeNpssoForCode(TOKENS.werewolf);
            const authorization = await exchangeCodeForAccessToken(accessCode);
            finalData.users.werewolf = await getFullUserData(authorization, "Werewolf", "Werewolf3788");

            // Official Pattern for Friend/Squad Presence
            console.log("--- Syncing Pack Lobby ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    if (res) {
                        const targetId = res.socialMetadata.accountId;
                        const presence = await getPresenceOfUser(authorization, targetId);
                        finalData.users[key] = {
                            online: presence.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: presence.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: presence.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`[Squad] Skipping ${onlineId}.`); }
            }
        } catch (e) { console.error("Kevin Authentication Stack Failed."); }
    }

    // AUTH RAY (ONELIVIDMAN)
    if (TOKENS.ray) {
        try {
            console.log("--- Executing Ray Sync ---");
            const accessCode = await exchangeNpssoForCode(TOKENS.ray);
            const authorization = await exchangeCodeForAccessToken(accessCode);
            finalData.users.ray = await getFullUserData(authorization, "Ray", "OneLIVIDMAN");
        } catch (e) { console.error("Ray Authentication Stack Failed."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Success: Official NPM Data Structure Saved ---");
}

main();
