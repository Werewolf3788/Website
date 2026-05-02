/**
 * WEREWOLF3788 OFFICIAL NPM-SPEC SYNC ENGINE v5.1.0
 * * 1. exchangeNpssoForAccessCode (Official)
 * 2. exchangeAccessCodeForAuthTokens (Official)
 * 3. getUserPlayedGames (High-Res Playtime)
 */

const psnApi = require("psn-api");
const fs = require("fs");

const {
    exchangeNpssoForAccessCode,
    exchangeAccessCodeForAuthTokens,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups,
    makeUniversalSearch,
    getProfileFromAccountId,
    getUserPlayedGames,
    getPresenceOfUser
} = psnApi;

// ACTIVE TOKENS
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

/**
 * Official ISO 8601 Parser for playDuration (e.g., PT228H56M33S)
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + 'h' : ''} ${m ? m[1] + 'm' : ''}`.trim() || "0h";
};

async function getFullUserData(authorization, label) {
    console.log(`[${label}] Executing Official PSN-API Flow...`);
    
    let data = { 
        lastUpdated: new Date().toLocaleString(),
        online: false,
        currentGame: "Dashboard",
        label: label,
        trophies: { total: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
    };

    try {
        // 1. Authenticate Profile via Account ID "me"
        const profile = await getProfileFromAccountId(authorization, "me");
        data.avatar = profile.avatars.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url;
        data.plus = profile.isPlus;
        data.bio = profile.aboutMe;
        data.onlineId = profile.onlineId;

        // 2. Fetch High-Res Playtime (Library Method)
        let playtimeMap = {};
        try {
            const played = await getUserPlayedGames(authorization, "me", { limit: 15 });
            played.titles.forEach(t => {
                playtimeMap[t.name] = parsePlaytime(t.playDuration);
            });
        } catch (e) { console.log(`[${label}] Library playtime restricted.`); }

        // 3. Fetch Global Stats
        try {
            const stats = await getUserTrophyProfileSummary(authorization, "me");
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
        } catch (e) { console.log(`[${label}] Global stats restricted.`); }

        // 4. Fetch Presence
        try {
            const p = await getPresenceOfUser(authorization, "me");
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence Restricted.`); }

        // 5. Recent Titles & Mission Log
        try {
            const { trophyTitles } = await getUserTitles(authorization, "me");
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${t.earnedTrophies.platinum + t.earnedTrophies.gold + t.earnedTrophies.silver + t.earnedTrophies.bronze}/${t.definedTrophies.platinum + t.definedTrophies.gold + t.definedTrophies.silver + t.definedTrophies.bronze}`,
                    hours: playtimeMap[t.trophyTitleName] || "0h"
                }));

                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, "me", top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(authorization, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(authorization, top.npCommunicationId, "all");

                data.activeHunt = {
                    title: top.trophyTitleName,
                    hours: data.recentGames[0].hours,
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
            }
        } catch (e) { console.log(`[${label}] Title History Restricted.`); }

    } catch (e) {
        console.error(`[${label}] Sync Failed: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // SYNC KEVIN (WEREWOLF)
    if (TOKENS.werewolf) {
        try {
            console.log("--- Executing Official Werewolf Auth ---");
            const accessCode = await exchangeNpssoForAccessCode(TOKENS.werewolf);
            const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
            finalData.users.werewolf = await getFullUserData(authorization, "Werewolf");

            // Sync Squad Presence
            console.log("--- Syncing Squad Presence ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    if (res) {
                        const accId = res.socialMetadata.accountId;
                        const p = await getPresenceOfUser(authorization, accId);
                        finalData.users[key] = {
                            online: p.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`[Squad] ${onlineId} Fetch Failed.`); }
            }
        } catch (e) { console.error("Kevin Auth Stack Failure."); }
    }

    // SYNC RAY
    if (TOKENS.ray) {
        try {
            console.log("--- Executing Official Ray Auth ---");
            const accessCode = await exchangeNpssoForAccessCode(TOKENS.ray);
            const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
            finalData.users.ray = await getFullUserData(authorization, "Ray");
        } catch (e) { console.error("Ray Auth Stack Failure."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Sync Finalized: psn_data.json is ready ---");
}

main();
