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

/**
 * Kevin's Official Pack Squad Tracking
 * Version 6.6.2 - Precision Friend Intersection & Zero-Value Progress Fix
 */
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

const cleanToken = (input) => {
    if (!input) return "";
    let str = input.trim();
    if (str.startsWith("{")) {
        try {
            const parsed = JSON.parse(str);
            return parsed.npsso || str;
        } catch (e) { return str; }
    }
    return str;
};

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
        const token = cleanToken(npsso);
        console.log(`\n[LOG] Syncing ${label}...`);
        
        let authorization;
        try {
            const accessCode = await exchangeNpssoForCode(token);
            authorization = await exchangeCodeForAccessToken(accessCode);
        } catch (authError) {
            console.error(`[ALERT] ${label}'s key is EXPIRED.`);
            return { error: "TOKEN_EXPIRED", lastCheck: new Date().toLocaleString() };
        }

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

            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const totalC = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            const gameHours = playtimeMap[name] || parsePlaytime(title.playDuration);

            if (recentGames.length < 6) {
                recentGames.push({ name, art: title.trophyTitleIconUrl, progress: title.progress, ratio: `${earnedC}/${totalC}`, hours: gameHours });
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
                            // FORCE numerical even if 0
                            const current = (s?.progress !== undefined) ? s.progress : undefined;
                            const target = (m.trophyProgressTargetValue !== undefined) ? m.trophyProgressTargetValue : undefined;

                            return {
                                name: m.trophyName,
                                description: m.trophyDetail || "Requirement Hidden",
                                type: m.trophyType,
                                icon: m.trophyIconUrl,
                                rarity: m.trophyRare ? m.trophyRare + "%" : "Common",
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
            bio: profile.aboutMe || "",
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
            tokenStatus: "HEALTHY",
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { return null; }
}

async function main() {
    const dataPath = path.join(__dirname, "psn_data.json");
    const tokensPath = path.join(__dirname, "tokens.json");
    
    let tokens = { werewolf: "", ray: "" };
    let finalData = { users: {}, mutualPack: [], systemAlerts: [] };

    try {
        if (fs.existsSync(tokensPath)) {
            tokens = JSON.parse(fs.readFileSync(tokensPath));
        }
    } catch (e) {}

    const werewolfToken = tokens.werewolf || process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";
    const rayToken = tokens.ray || process.env.PSN_NPSSO_RAY || "WQcE2imvkX8YsIiMGP8G2MYwUXHJxbrxvmh8yclvXirAjQ4SOJQrneZpsdhYqW2j";

    try {
        if (fs.existsSync(dataPath)) {
            const existing = JSON.parse(fs.readFileSync(dataPath));
            finalData.users = existing.users || {};
            finalData.mutualPack = existing.mutualPack || [];
        }
    } catch (e) {}

    try {
        const wolfData = await getFullUserData(werewolfToken, "Werewolf", "Werewolf3788");
        if (wolfData && wolfData.error === "TOKEN_EXPIRED") {
            finalData.systemAlerts.push({ user: "Werewolf", issue: "NPSSO Expired", time: wolfData.lastCheck });
        } else if (wolfData) {
            finalData.users.werewolf = wolfData;
            
            const rayDetail = await getFullUserData(rayToken, "Ray", "OneLIVIDMAN");
            if (rayDetail && rayDetail.error === "TOKEN_EXPIRED") {
                finalData.systemAlerts.push({ user: "Ray", issue: "NPSSO Expired", time: rayDetail.lastCheck });
            } else if (rayDetail) {
                finalData.users.ray = rayDetail;
                
                // HARDENED CROSS REFERENCE (Kevin & Ray)
                console.log("[CROSS-REF] Starting Pack Intersection...");
                try {
                    const wolfFriends = await getFriendsList(wolfData.auth, wolfData.accountId);
                    const rayFriends = await getFriendsList(rayDetail.auth, rayDetail.accountId);
                    
                    const wList = (wolfFriends.friends || []);
                    const rList = (rayFriends.friends || []);
                    
                    // Intersect by Account ID for absolute precision
                    finalData.mutualPack = wList
                        .filter(wf => rList.some(rf => rf.accountId === wf.accountId))
                        .map(m => m.onlineId);
                        
                    console.log(`[CROSS-REF] Success! Found ${finalData.mutualPack.length} shared friends.`);
                } catch (e) {
                    console.log("[CROSS-REF] Sony API restriction detected.");
                }
            }

            const auth = wolfData.auth;
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                if (key === 'ray' && rayDetail && !rayDetail.error) continue;
                if (key === 'werewolf') continue;
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const accId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
                    if (accId) {
                        const pres = await getPresence(auth, accId);
                        finalData.users[key] = { ...finalData.users[key], ...pres };
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] psn_data.json updated.`);
}

main();
