/**
 * WEREWOLF3788 OFFICIAL NPM-SPEC SYNC ENGINE v5.2.1
 * Fixes: "Bad Request (path: accountId)" by forcing OnlineID resolution
 * Optimized for psn-api v2.18.0 + Node 20
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

// TOKENS
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
 * Official ISO 8601 Parser for psn-api v2.18.0
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1] + 'h' : ''} ${m ? m[1] + 'm' : ''}`.trim() || "0h";
};

async function getFullUserData(authorization, label, onlineId) {
    console.log(`[${label}] Starting v5.2.1 Resolution Handshake...`);
    
    let data = { 
        lastUpdated: new Date().toLocaleString(),
        online: false,
        currentGame: "Dashboard",
        label: label,
        trophies: { total: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
    };

    try {
        // STEP 1: RESOLVE NUMERIC ACCOUNT ID (The "Bad Request" Fix)
        // We cannot use "me" for profile/played titles anymore. 
        // We search for the OnlineID to get the required numeric string.
        console.log(`[${label}] Searching for AccountID: ${onlineId}`);
        const searchResult = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
        
        const accountId = searchResult.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
        
        if (!accountId) {
            throw new Error(`Could not resolve numeric ID for ${onlineId}. Search returned no results.`);
        }
        
        console.log(`[${label}] Resolved Numeric ID: ${accountId}`);

        // 2. Fetch Profile (Now using the numeric ID)
        const profile = await getProfileFromAccountId(authorization, accountId);
        data.avatar = profile.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url;
        data.plus = profile.isPlus;
        data.bio = profile.aboutMe;
        data.onlineId = profile.onlineId;

        // 3. Fetch High-Res Playtime
        let playtimeMap = {};
        try {
            const played = await getUserPlayedGames(authorization, accountId, { limit: 15 });
            if (played?.titles) {
                played.titles.forEach(t => {
                    playtimeMap[t.name] = parsePlaytime(t.playDuration);
                });
            }
        } catch (e) { console.log(`[${label}] Playtime library restricted.`); }

        // 4. Global Stats
        try {
            const stats = await getUserTrophyProfileSummary(authorization, accountId);
            data.level = stats.trophyLevel;
            data.levelProgress = stats.progress;
            const et = stats.earnedTrophies;
            data.trophies = {
                total: (et.platinum || 0) + (et.gold || 0) + (et.silver || 0) + (et.bronze || 0),
                platinum: et.platinum || 0,
                gold: et.gold || 0,
                silver: et.silver || 0,
                bronze: et.bronze || 0
            };
            data.trophyPoints = (data.trophies.platinum * 300) + (data.trophies.gold * 90) + (data.trophies.silver * 30) + (data.trophies.bronze * 15);
        } catch (e) { console.log(`[${label}] Stats fetch restricted.`); }

        // 5. Presence
        try {
            const p = await getPresenceOfUser(authorization, accountId);
            data.online = p.primaryPlatformInfo?.onlineStatus === "online";
            data.currentGame = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
            data.platform = p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5";
        } catch (e) { console.log(`[${label}] Presence Restricted.`); }

        // 6. Recent Titles & Mission Log
        try {
            const { trophyTitles } = await getUserTitles(authorization, accountId);
            if (trophyTitles && trophyTitles.length > 0) {
                data.recentGames = trophyTitles.slice(0, 6).map(t => ({
                    name: t.trophyTitleName,
                    art: t.trophyTitleIconUrl,
                    progress: t.progress,
                    ratio: `${t.earnedTrophies.platinum + t.earnedTrophies.gold + t.earnedTrophies.silver + t.earnedTrophies.bronze}/${t.definedTrophies.platinum + t.definedTrophies.gold + t.definedTrophies.silver + t.definedTrophies.bronze}`,
                    hours: playtimeMap[t.trophyTitleName] || "0h"
                }));

                const top = trophyTitles[0];
                const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, top.npCommunicationId, "all");
                const { trophies: meta } = await getTitleTrophies(authorization, top.npCommunicationId, "all");
                const { trophyGroups } = await getTitleTrophyGroups(authorization, top.npCommunicationId, "all");

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
        } catch (e) { console.log(`[${label}] History fetch failed.`); }

    } catch (e) {
        console.error(`[${label}] Critical Fail in v5.2.1 flow: ${e.message}`);
    }

    return data;
}

async function main() {
    let finalData = { users: {} };

    // SYNC KEVIN (WEREWOLF)
    if (TOKENS.werewolf) {
        try {
            console.log("--- Syncing Kevin (Werewolf3788) ---");
            const accessCode = await exchangeNpssoForAccessCode(TOKENS.werewolf);
            const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
            finalData.users.werewolf = await getFullUserData(authorization, "Werewolf", "Werewolf3788");

            // Squad Sync
            console.log("--- Syncing Squad Presence ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                try {
                    const search = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    if (res) {
                        const targetId = res.socialMetadata.accountId;
                        const p = await getPresenceOfUser(authorization, targetId);
                        finalData.users[key] = {
                            online: p.primaryPlatformInfo?.onlineStatus === "online",
                            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Offline",
                            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "N/A"
                        };
                    }
                } catch (e) { console.log(`[Squad] Skipping ${onlineId}.`); }
            }
        } catch (e) { console.error("Kevin Auth Failed."); }
    }

    // SYNC RAY
    if (TOKENS.ray) {
        try {
            console.log("--- Syncing Ray (OneLIVIDMAN) ---");
            const accessCode = await exchangeNpssoForAccessCode(TOKENS.ray);
            const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
            finalData.users.ray = await getFullUserData(authorization, "Ray", "OneLIVIDMAN");
        } catch (e) { console.error("Ray Auth Failed."); }
    }

    fs.writeFileSync("psn_data.json", JSON.stringify(finalData, null, 2));
    console.log("--- Finalized: psn_data.json saved ---");
}

main();
