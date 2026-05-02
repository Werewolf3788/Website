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
    getProfileFromUserName, // The Handshake Bridge
    getRecentlyPlayedGames
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Squad Tracking
 * Mapping Aliases for the Lobby:
 * - Ray: OneLIVIDMAN
 * - TJ: Darkwing69420
 * - Seth: phoenix_darkfire (Privacy Blocked)
 */
const SQUAD_IDS = {
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    elucidator: "ElucidatorVah",
    jcrow: "JCrow207",
    unicorn: "UnicornBunnyShiv"
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
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };
    } catch (e) { 
        return { online: false, currentGame: "", platform: "N/A" }; 
    }
};

/**
 * Main Data Aggregator
 * Uses the Handshake Bridge to resolve numeric accountId.
 */
async function getFullUserData(npsso, label, targetOnlineId) {
    try {
        console.log(`\n[TEST LOG] --- Starting Sync for ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);

        // STEP 1: THE HANDSHAKE BRIDGE
        let accountId = "";
        console.log(`[${label}] Resolving numeric accountId for ${targetOnlineId}...`);
        
        try {
            const bridgeProfile = await getProfileFromUserName(authorization, targetOnlineId);
            accountId = bridgeProfile.profile.accountId;
            console.log(`[${label}] Handshake Success! Resolved ID: ${accountId}`);
        } catch (bridgeError) {
            console.log(`[${label}] Bridge failed, attempting Universal Search fallback...`);
            const search = await makeUniversalSearch(authorization, targetOnlineId, "socialAccounts");
            accountId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
        }

        if (!accountId) {
            throw new Error(`CRITICAL: Could not find numeric accountId for ${targetOnlineId}.`);
        }

        // STEP 2: Profile & Presence using numeric ID
        const profile = await getProfileFromAccountId(authorization, accountId);
        const presence = await getPresence(authorization, accountId);

        // STEP 3: High-Resolution Playtime
        let playtimeMap = {};
        try {
            const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 15 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) { console.log(`[${label}] Playtime fetch restricted.`); }

        // STEP 4: Trophy Titles & Game History
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

            // MISSION LOG: Detailed trophy list
            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const { trophyGroups } = await getTitleTrophyGroups(authorization, title.npCommunicationId, "all");

                    activeGameMetadata = {
                        title: name,
                        hours: gameHours,
                        dlcGroups: trophyGroups.map(g => ({
                            name: g.trophyGroupName,
                            progress: g.progress,
                            earned: (g.earnedTrophies?.gold || 0) + (g.earnedTrophies?.silver || 0) + (g.earnedTrophies?.bronze || 0),
                            total: (g.definedTrophies?.gold || 0) + (g.definedTrophies?.silver || 0) + (g.definedTrophies?.bronze || 0)
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
                } catch (e) { }
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, accountId);
        const et = stats.earnedTrophies || {};

        const finalUserData = {
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

        // VERIFIED LOG BLOCK
        console.log(`[VERIFIED INFO FOR ${label}]`);
        console.log(` > Online ID: ${targetOnlineId}`);
        console.log(` > Account ID: ${accountId}`);
        console.log(` > PSN Level: ${finalUserData.level}`);
        console.log(` > Status: ${finalUserData.online ? 'ONLINE' : 'OFFLINE'}`);
        console.log(`------------------------------------------`);

        return finalUserData;
    } catch (e) {
        console.error(`[${label}] Critical Sync Failure:`, e.message);
        return null;
    }
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF || "Z16BT0DB8X1dR5PiuftzTslTeH796cHb9alTA9S7nrpr37L4cu1RrqFCfYWc2YyG";
    const rayToken = process.env.PSN_NPSSO_RAY || "VQIj9KP6j1vQzmPEhPMj6rgiFTVREmEYSk7NHbSDlw15YuWmTAsaJztpk1ZqeFix";
    
    let finalData = { users: {} };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        try {
            const authCode = await exchangeNpssoForCode(werewolfToken);
            const auth = await exchangeCodeForAccessToken(authCode);
            
            // Kevin Sync
            const wolfData = await getFullUserData(werewolfToken, "Werewolf", "Werewolf3788");
            if (wolfData) finalData.users.werewolf = wolfData;

            // Squad Sync
            console.log("\n[TEST LOG] --- Syncing Squad Status ---");
            for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
                if (key === 'ray' && rayToken) continue; 
                
                try {
                    const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                    const res = search.domainResponses?.[0]?.results?.[0];
                    let accId = res?.socialMetadata?.accountId;
                    
                    if (!accId) {
                        try {
                            const bridge = await getProfileFromUserName(auth, onlineId);
                            accId = bridge.profile.accountId;
                        } catch (e) {
                            if (onlineId === "phoenix_darkfire") {
                                console.log(` > [SQUAD] Seth (phoenix_darkfire) is currently private/blocked.`);
                            }
                        }
                    }

                    if (accId) {
                        finalData.users[key] = await getPresence(auth, accId);
                        console.log(` > [SQUAD] ${onlineId}: ${finalData.users[key].online ? 'ONLINE' : 'OFFLINE'} (ID: ${accId})`);
                    } else {
                        finalData.users[key] = { online: false, currentGame: "Private" };
                        console.log(` > [SQUAD] ${onlineId}: Skipped (Privacy Blocked)`);
                    }
                } catch (e) { 
                    finalData.users[key] = { online: false }; 
                }
            }
        } catch (e) { console.error("Authentication Stack Failure:", e.message); }
    }

    if (rayToken) {
        const rayDetail = await getFullUserData(rayToken, "Ray", "OneLIVIDMAN");
        if (rayDetail) finalData.users.ray = rayDetail;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log(`\n[SUCCESS] psn_data.json saved with verified accountId info.`);
}

main();
