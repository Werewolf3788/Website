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
    getProfileFromUserName,
    getRecentlyPlayedGames,
    getFriendsList
} = psnApi;

const fs = require("fs");
const path = require("path");

const SQUAD_IDS = {
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    elucidator: "ElucidatorVah",
    jcrow: "JCrow207",
    unicorn: "UnicornBunnyShiv",
    balto: "Balto20_01",
    mjolnir: "IlIMjolnirIlI"
};

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    const hours = h ? h[1] + "h" : "";
    const mins = m ? m[1] + "m" : "";
    return `${hours} ${mins}`.trim() || "0h";
};

const getPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceOfUser || psnApi.getUserPresence || psnApi.getPresenceFromUser;
    try {
        const p = await func(auth, accountId);
        return {
            online: p.primaryPlatformInfo?.onlineStatus === "online",
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };
    } catch (e) { return { online: false, currentGame: "Dashboard", platform: "PS5" }; }
};

async function getFullUserData(npsso, label, targetOnlineId) {
    try {
        console.log(`\n[LOG] Starting DEEP Sync: ${label}`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);

        let accountId = "";
        try {
            const bridgeProfile = await getProfileFromUserName(authorization, targetOnlineId);
            accountId = bridgeProfile.profile.accountId;
        } catch (e) {
            const search = await makeUniversalSearch(authorization, targetOnlineId, "socialAccounts");
            accountId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
        }

        if (!accountId) return null;

        const profile = await getProfileFromAccountId(authorization, accountId);
        const presence = await getPresence(authorization, accountId);
        
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 50 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) {}

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
                recentGames.push({ name, art: title.trophyTitleIconUrl, progress: title.progress, ratio: `${earned}/${total}`, hours: gameHours });
            }

            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    activeGameMetadata = {
                        title: name,
                        hours: gameHours,
                        trophies: (meta || []).map(m => {
                            const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                            const current = s?.progress || undefined;
                            const target = m.trophyProgressTargetValue || undefined;

                            return {
                                name: m.trophyName,
                                description: m.trophyDetail || "Secret Requirement",
                                type: m.trophyType,
                                icon: m.trophyIconUrl,
                                rarity: m.trophyEarnedRate ? m.trophyEarnedRate + "%" : "Common",
                                earned: s?.earned || false,
                                earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : "--",
                                currentValue: current,
                                targetValue: target
                            };
                        })
                    };
                } catch (e) {}
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, accountId);
        return {
            auth: authorization,
            accountId,
            online: presence.online,
            currentGame: presence.currentGame,
            platform: presence.platform,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            bio: profile.aboutMe || "Official Pack Admin",
            plus: profile.isPlus,
            level: stats.trophyLevel,
            activeHunt: activeGameMetadata,
            recentGames: recentGames,
            trophies: {
                platinum: stats.earnedTrophies?.platinum || 0,
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0)
            },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[ERR] Sync for ${label} failed: ${e.message}`);
        return null; 
    }
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";
    const rayToken = process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix";
    
    let finalData = { users: {}, mutualPack: [] };
    const dataPath = path.join(__dirname, "psn_data.json");

    // Load existing data first as a safety backup
    try {
        if (fs.existsSync(dataPath)) {
            const existing = JSON.parse(fs.readFileSync(dataPath));
            finalData = existing;
        }
    } catch (e) {}

    try {
        // Kevin Sync
        const wolfData = await getFullUserData(werewolfToken, "Werewolf", "Werewolf3788");
        if (wolfData) {
            finalData.users.werewolf = wolfData;
            
            // Ray Sync (Nested to reuse Wolf's auth if needed)
            const rayDetail = rayToken ? await getFullUserData(rayToken, "Ray", "OneLIVIDMAN") : null;
            if (rayDetail) {
                finalData.users.ray = rayDetail;

                // CROSS REFERENCE (Now crash-proof)
                console.log("[CROSS-REF] Starting Pack Intersection...");
                try {
                    const wolfFriends = await getFriendsList(wolfData.auth, wolfData.accountId);
                    const rayFriends = await getFriendsList(rayDetail.auth, rayDetail.accountId);
                    const wIds = (wolfFriends.friends || []).map(f => f.onlineId);
                    const rIds = (rayFriends.friends || []).map(f => f.onlineId);
                    finalData.mutualPack = wIds.filter(id => rIds.includes(id));
                    console.log(`[CROSS-REF] Success! Found ${finalData.mutualPack.length} shared friends.`);
                } catch (e) { console.log("[CROSS-REF] Blocked by Sony API limits."); }
            }

            // Sync Squad Presence
            const auth = wolfData.auth;
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                if (key === 'ray') continue;
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const accId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
                    if (accId) finalData.users[key] = await getPresence(auth, accId);
                } catch (e) {}
            }
        } else {
            console.error("[CRITICAL] Main account sync failed. Aborting write to prevent data loss.");
            return; 
        }
    } catch (e) {
        console.error("[FATAL] Script error:", e.message);
        return;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Data saved to psn_data.json`);
}
main();
