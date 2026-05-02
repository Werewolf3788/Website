/**
 * WEREWOLF3788 FAIL-SAFE SYNC ENGINE v4.9.11
 * Fixes: "Profile details restricted" & "Presence data unavailable" 
 * by resolving numeric accountId before fetching data.
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
    ray: process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix" 
};

// Squad Tracking (Kevin's Pack)
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

async function getFullUserData(auth, label, fallbackOnlineId) {
    let data = { 
        lastUpdated: new Date().toLocaleString(),
        online: false,
        currentGame: "Dashboard",
        platform: "PS5",
        label: label,
        trophies: { total: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
    };

    try {
        console.log(`[${label}] Resolving numeric Account ID...`);
        
        let resolvedId = "me";

        // Attempt to find the real numeric ID via search as a fallback if "me" is restricted
        try {
            const search = await makeUniversalSearch(auth, fallbackOnlineId, "socialAccounts");
            if (search.domainResponses?.[0]?.results?.[0]) {
                resolvedId = search.domainResponses[0].results[0].socialMetadata.accountId;
                console.log(`[${label}] Successfully resolved ID: ${resolvedId}`);
            }
        } catch (e) {
            console.log(`[${label}] Search-based ID resolution failed, sticking with 'me'.`);
        }

        // 1. Core Stats
        try {
            const stats = await getUserTrophyProfileSummary(auth, resolvedId);
            data.level = stats.trophyLevel;
            data.levelProgress = stats.progress;
            const et = stats.earnedTrophies;
            data.trophies = {
                total: (et?.platinum || 0) + (et?.gold || 0) + (et?.silver || 0) + (et?.bronze || 0),
                platinum: et?.platinum || 0,
                gold: et?.gold || 0,
                silver: et?.silver || 0,
                bronze: et?.bronze || 0
            };
            data.trophyPoints = (data.trophies.platinum * 300) + (data.trophies.gold * 90) + (data.trophies.silver * 30) + (data.trophies.bronze * 15);
        } catch (e) { console.log(`[${label}] Stats Restricted.`); }

        // 2. Profile Details
        try {
            const profile = await getProfileFromAccountId(auth, resolvedId);
            data.avatar = profile.avatarUrls.sort((a, b) => b.size - a.size)[0]?.avatarUrl;
            data.plus = profile.isPlus;
            data.bio = profile.aboutMe;
        } catch (e) { console.log(`[${label}] Profile Restricted.`); }

        // 3. Presence
        try {
            const p = await getPresenceOfUser(auth, resolvedId);
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence Unavailable.`); }

        // 4. Recently Played
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] Playtime Restricted.`); }

        // 5. Mission Log
        try {
            const { trophyTitles } = await getUserTitles(auth, resolvedId);
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${(t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0)}/${(t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0)}`,
                    hours: playtimeMap[t.trophyTitleName] || parsePlaytime(t.playDuration)
                }));

                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, resolvedId, top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(auth, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(auth, top.npCommunicationId, "all");

                data.activeHunt = {
                    title: top.trophyTitleName,
                    hours: data.recentGames[0].hours,
                    dlcGroups: (trophyGroups || []).map(g => ({
                        name: g.trophyGroupName,
                        progress: g.progress || 0,
                        earned: (g.earnedTrophies?.platinum || 0) + (g.earnedTrophies?.gold || 0) + (g.earnedTrophies?.silver || 0) + (g.earnedTrophies?.bronze || 0),
                        total: (g.definedTrophies?.platinum || 0) + (g.definedTrophies?.gold || 0) + (g.definedTrophies?.silver || 0) + (g.definedTrophies?.bronze || 0)
                    })),
                    trophies: (meta || []).slice(0, 20).map(m => {
                        const s = earnedStatus?.find(x => x.trophyId === m.trophyId);
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
        } catch (e) { console.log(`[${label}] Detailed History Restricted.`); }

    } catch (e) {
        console.error(`[${label}] Fatal Error: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // KEVIN SYNC
    if (TOKENS.werewolf) {
        try {
            console.log("--- Syncing Werewolf (Kevin) ---");
            const code = await exchangeNpssoForCode(TOKENS.werewolf);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.werewolf = await getFullUserData(auth, "Werewolf", "Werewolf3788");
            
            // Squad Status
            console.log("--- Syncing Squad Presence ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    if (res) {
                        const p = await getPresenceOfUser(auth, res.socialMetadata.accountId);
                        finalData.users[key] = {
                            online: p.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`[Squad] ${onlineId} fetch failed.`); }
            }
        } catch (e) { console.error("Werewolf Auth Loop Failed."); }
    }

    // RAY SYNC
    if (TOKENS.ray) {
        try {
            console.log("--- Syncing Ray (OneLIVIDMAN) ---");
            const code = await exchangeNpssoForCode(TOKENS.ray);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.ray = await getFullUserData(auth, "Ray", "OneLIVIDMAN");
        } catch (e) { console.error("Ray Auth Loop Failed."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Finalized: psn_data.json saved ---");
}

main();
