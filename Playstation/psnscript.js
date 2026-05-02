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
    getProfileFromUserName, // Working Handshake Bridge
    getRecentlyPlayedGames,
    getFriendsList // Used for the Cross-Reference Engine
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Squad Tracking
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

/**
 * Requirement 7: ISO 8601 Duration Parser
 */
const parsePlaytime = (duration) => {
    if (!duration) return "0h";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    const hours = h ? h[1] + "h" : "";
    const mins = m ? m[1] + "m" : "";
    return `${hours} ${mins}`.trim() || "0h";
};

/**
 * Helper for Live Presence & Platform Detection
 */
const getPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceOfUser || psnApi.getUserPresence || psnApi.getPresenceFromUser;
    try {
        const p = await func(auth, accountId);
        return {
            online: p.primaryPlatformInfo?.onlineStatus === "online",
            currentGame: p.gameTitleInfoList?.[0]?.titleName || "Dashboard",
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            lastOnline: p.lastOnlineDate || ""
        };
    } catch (e) { 
        return { online: false, currentGame: "", platform: "N/A" }; 
    }
};

/**
 * Main Data Aggregator - Version 5.9.0
 * Includes the Cross-Reference Logic for Mutual Friends.
 */
async function getFullUserData(npsso, label, targetOnlineId) {
    try {
        console.log(`\n[TEST LOG] --- Starting DEEP Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);

        // STEP 1: RESOLVE NUMERIC ACCOUNT ID
        let accountId = "";
        try {
            const bridgeProfile = await getProfileFromUserName(authorization, targetOnlineId);
            accountId = bridgeProfile.profile.accountId;
            console.log(`[${label}] Handshake Success: ${accountId}`);
        } catch (bridgeError) {
            const search = await makeUniversalSearch(authorization, targetOnlineId, "socialAccounts");
            accountId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
        }

        if (!accountId) throw new Error(`CRITICAL: ID resolution failed for ${targetOnlineId}`);

        const profile = await getProfileFromAccountId(authorization, accountId);
        const presence = await getPresence(authorization, accountId);

        // STEP 2: Full Library & High-Res Hours
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 50 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] Library playtime restricted.`); }

        // STEP 3: Trophy Titles
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
                recentGames.push({
                    name: name,
                    art: title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earned}/${total}`,
                    hours: gameHours
                });
            }

            // STEP 4: DEEP MISSION LOG (descriptions + numerical progress 00/000)
            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const { trophyGroups } = await getTitleTrophyGroups(authorization, title.npCommunicationId, "all");

                    activeGameMetadata = {
                        title: name,
                        hours: gameHours,
                        dlcGroups: (trophyGroups || []).map(g => ({
                            name: g.trophyGroupName,
                            progress: g.progress,
                            earned: (g.earnedTrophies?.gold || 0) + (g.earnedTrophies?.silver || 0) + (g.earnedTrophies?.bronze || 0),
                            total: (g.definedTrophies?.gold || 0) + (g.definedTrophies?.silver || 0) + (g.definedTrophies?.bronze || 0)
                        })),
                        trophies: (meta || []).map(m => {
                            const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                            return {
                                name: m.trophyName,
                                description: m.trophyDetail || "Requirement Hidden",
                                type: m.trophyType,
                                icon: m.trophyIconUrl,
                                rarity: m.trophyRare ? m.trophyRare + "%" : "Common",
                                earned: s?.earned || false,
                                earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : "--",
                                currentValue: s?.progress || undefined,
                                targetValue: m.trophyProgressTargetValue || undefined
                            };
                        })
                    };
                } catch (e) { }
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, accountId);
        const et = stats.earnedTrophies || {};

        return {
            auth: authorization, // Passing auth back for cross-referencing
            accountId: accountId,
            online: presence.online,
            currentGame: presence.currentGame,
            platform: presence.platform,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            bio: profile.aboutMe || "Official Pack Admin",
            plus: profile.isPlus,
            level: stats.trophyLevel,
            levelProgress: stats.progress,
            activeHunt: activeGameMetadata,
            recentGames: recentGames,
            trophies: {
                platinum: et.platinum || 0,
                gold: et.gold || 0,
                silver: et.silver || 0,
                bronze: et.bronze || 0,
                total: (et.platinum || 0) + (et.gold || 0) + (et.silver || 0) + (et.bronze || 0)
            },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) {
        console.error(`[${label}] Critical Sync Failure:`, e.message);
        return null;
    }
}

/**
 * Cross-Reference Engine
 * Compares friends lists of multiple users and returns only common friends.
 */
async function getMutualFriends(auth, accountIds) {
    console.log(`\n[CROSS-REF] Starting Pack Friend Intersection...`);
    let friendsLists = [];

    for (const id of accountIds) {
        try {
            const list = await getFriendsList(auth, id);
            const ids = (list.friends || []).map(f => ({ onlineId: f.onlineId, accountId: f.accountId }));
            friendsLists.push(ids);
            console.log(` > Gathered ${ids.length} friends for ID: ${id}`);
        } catch (e) {
            console.log(` > Privacy Blocked for ID: ${id}. Skipping from cross-reference.`);
        }
    }

    if (friendsLists.length < 2) return [];

    // Intersection Logic: Start with the first list
    let mutual = friendsLists[0];

    for (let i = 1; i < friendsLists.length; i++) {
        mutual = mutual.filter(f1 => friendsLists[i].some(f2 => f1.accountId === f2.accountId));
    }

    console.log(`[CROSS-REF] Success! Found ${mutual.length} shared pack members.`);
    return mutual;
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";
    const rayToken = process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix";
    
    let finalData = { users: {}, mutualFriends: [] };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        try {
            const authCode = await exchangeNpssoForCode(werewolfToken);
            const auth = await exchangeCodeForAccessToken(authCode);
            
            // 1. Sync Kevin
            const wolfData = await getFullUserData(werewolfToken, "Werewolf", "Werewolf3788");
            if (wolfData) finalData.users.werewolf = wolfData;

            // 2. Resolve Darkwing's ID for Cross-Reference
            let darkwingId = "";
            try {
                const dwSearch = await makeUniversalSearch(auth, SQUAD_IDS.darkwing, "socialAccounts");
                darkwingId = dwSearch.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
            } catch(e) {}

            // 3. Resolve Ray's ID if not done via full sync
            let rayId = "";
            if (rayToken) {
                const rayDetail = await getFullUserData(rayToken, "Ray", "OneLIVIDMAN");
                if (rayDetail) {
                    finalData.users.ray = rayDetail;
                    rayId = rayDetail.accountId;
                }
            }

            // 4. RUN THE CROSS-REFERENCE ENGINE
            // Cross referencing: Kevin (Werewolf), Ray (OneLIVIDMAN), and Darkwing
            const idsToCompare = [wolfData.accountId];
            if (rayId) idsToCompare.push(rayId);
            if (darkwingId) idsToCompare.push(darkwingId);

            finalData.mutualFriends = await getMutualFriends(auth, idsToCompare);

            // 5. Sync Specific Squad Status
            console.log("\n[TEST LOG] --- Syncing Pack Status ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                if (key === 'ray' && rayToken) continue; 
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    let accId = res?.socialMetadata?.accountId;
                    
                    if (accId) {
                        finalData.users[key] = await getPresence(auth, accId);
                        console.log(` > [SQUAD] ${onlineId}: ${finalData.users[key].online ? 'ONLINE' : 'OFFLINE'}`);
                    }
                } catch (e) { }
            }
        } catch (e) { console.error("Authentication Stack Failure:", e.message); }
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log(`\n[SUCCESS] psn_data.json updated with Mutual Friends list.`);
}

main();
