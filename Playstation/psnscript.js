/**
 * WEREWOLF3788 FAIL-SAFE SYNC ENGINE v4.9.10
 * Fixes: Added Ray's active NPSSO token for dual-profile sync.
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

// TOKENS - Updated with Ray's provided token
const TOKENS = {
    werewolf: process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG",
    ray: process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix" 
};

// Kevin's Official Pack - Squad Tracking
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
        label: label,
        trophies: { total: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
    };

    try {
        console.log(`[${label}] Initializing Sync...`);
        
        let selfSummary;

        // STEP 1: Core Stats (Using "me" which is the most stable)
        try {
            selfSummary = await getUserTrophyProfileSummary(auth, "me");
            data.level = selfSummary.trophyLevel;
            data.levelProgress = selfSummary.progress;
            const et = selfSummary.earnedTrophies;
            data.trophies = {
                total: (et?.platinum || 0) + (et?.gold || 0) + (et?.silver || 0) + (et?.bronze || 0),
                platinum: et?.platinum || 0,
                gold: et?.gold || 0,
                silver: et?.silver || 0,
                bronze: et?.bronze || 0
            };
            data.trophyPoints = (data.trophies.platinum * 300) + (data.trophies.gold * 90) + (data.trophies.silver * 30) + (data.trophies.bronze * 15);
        } catch (e) {
            console.log(`[${label}] Global stats fetch restricted.`);
        }

        // STEP 2: Profile Details
        try {
            const profile = await getProfileFromAccountId(auth, "me");
            data.avatar = profile.avatarUrls.sort((a, b) => b.size - a.size)[0]?.avatarUrl;
            data.plus = profile.isPlus;
            data.bio = profile.aboutMe;
        } catch (e) {
            console.log(`[${label}] Profile details restricted. Using defaults.`);
        }

        // STEP 3: Presence
        try {
            const p = await getPresenceOfUser(auth, "me");
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence data unavailable.`); }

        // STEP 4: Playtime
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] High-res playtime restricted.`); }

        // STEP 5: Mission Log & Recent Titles
        try {
            const { trophyTitles } = await getUserTitles(auth, "me");
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${(t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0)}/${(t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0)}`,
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
                        progress: g.progress || 0,
                        earned: (g.earnedTrophies?.gold || 0) + (g.earnedTrophies?.silver || 0) + (g.earnedTrophies?.bronze || 0),
                        total: (g.definedTrophies?.gold || 0) + (g.definedTrophies?.silver || 0) + (g.definedTrophies?.bronze || 0)
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
        } catch (e) { 
            console.log(`[${label}] Detailed history fetch failed. Account may have strict privacy.`);
        }

    } catch (e) {
        console.error(`[${label}] Critical Fail: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // SYNC WEREWOLF (Kevin)
    if (TOKENS.werewolf) {
        try {
            console.log("--- Syncing Werewolf (Kevin) ---");
            const code = await exchangeNpssoForCode(TOKENS.werewolf);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.werewolf = await getFullUserData(auth, "Werewolf");
            
            // Sync Squad using Kevin's Token
            console.log("--- Syncing Squad Status ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const results = search.domainResponses?.[0]?.results;
                    if (results && results.length > 0) {
                        const accId = results[0].socialMetadata.accountId;
                        const p = await getPresenceOfUser(auth, accId);
                        finalData.users[key] = {
                            online: p.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`Squad member ${onlineId} skipped.`); }
            }
        } catch (e) { console.error("Werewolf Primary Sync Failed."); }
    }

    // SYNC RAY (OneLIVIDMAN)
    if (TOKENS.ray) {
        try {
            console.log("--- Syncing Ray (OneLIVIDMAN) ---");
            const code = await exchangeNpssoForCode(TOKENS.ray);
            const auth = await exchangeCodeForAccessToken(code);
            finalData.users.ray = await getFullUserData(auth, "Ray");
        } catch (e) { console.error("Ray Sync Failed."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Sync Finished: psn_data.json saved ---");
}

main();
