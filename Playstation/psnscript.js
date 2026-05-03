const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups,
    getUserTrophiesForSpecificTitle,
    getUserTrophyGroupEarningsForTitle,
    makeUniversalSearch,
    getProfileFromAccountId,
    getProfileFromUserName,
    getRecentlyPlayedGames,
    getFriendsList,
    getBasicPresence,
    getAccountDevices,
    getProfileShareableLink,
    getUserFriendsAccountIds,
    getUserPlayedGames,
    getUserRegion,
    exchangeRefreshTokenForAuthTokens
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 6.9.9 - "The Complete API Handshake"
 * Expanded imports based on library snapshots to capture Region, DLC Groups, and Hardware.
 */
const SQUAD_IDS = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    phoenix: "phoenix_darkfire",
    balto: "Balto20_01",
    mjolnir: "IlIMjolnirIlI"
};

const ID_TO_KEY = Object.entries(SQUAD_IDS).reduce((acc, [key, id]) => {
    acc[id.toLowerCase()] = key;
    return acc;
}, {});

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
    return `${h ? h[1] + "h" : ""} ${m ? m[1] + "m" : ""}`.trim() || "0h";
};

const isUserActive = (status) => {
    const activeStates = ["online", "busy", "away"];
    return activeStates.includes(status?.toLowerCase());
};

const getPresence = async (auth, accountId) => {
    try {
        const p = await psnApi.getPresenceOfUser(auth, accountId);
        const status = p.primaryPlatformInfo?.onlineStatus || "offline";
        const game = p.gameTitleInfoList?.[0]?.titleName || "Dashboard";
        console.log(`   [Presence] Handshake: ${status} | Game: ${game}`);
        return {
            online: isUserActive(status),
            currentGame: game,
            platform: p.primaryPlatformInfo?.platform?.toUpperCase() || "PS5"
        };
    } catch (e) { return { online: false, currentGame: "Offline", platform: "PS5" }; }
};

async function getFallbackData(auth, targetOnlineId) {
    try {
        const search = await makeUniversalSearch(auth, targetOnlineId, "socialAccounts");
        const accountId = search.domainResponses?.[0]?.results?.[0]?.socialMetadata?.accountId;
        if (!accountId) return null;
        const presence = await getPresence(auth, accountId);
        const stats = await getUserTrophyProfileSummary(auth, accountId);
        const profile = await getProfileFromAccountId(auth, accountId);
        return {
            online: presence.online,
            currentGame: presence.currentGame,
            platform: presence.platform,
            level: stats.trophyLevel,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            plus: profile.isPlus,
            trophies: { total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0) },
            tokenStatus: "FALLBACK_VIEW"
        };
    } catch (e) { return null; }
}

async function getFullUserData(npsso, label, targetOnlineId) {
    try {
        const token = cleanToken(npsso);
        console.log(`[SYNC] Full API Sync: ${label}`);
        let auth;
        try {
            const accessCode = await exchangeNpssoForCode(token);
            auth = await exchangeCodeForAccessToken(accessCode);
        } catch (e) { return { error: "TOKEN_EXPIRED" }; }

        const bridgeProfile = await getProfileFromUserName(auth, targetOnlineId);
        const accountId = bridgeProfile.profile.accountId;
        const profile = await getProfileFromAccountId(auth, accountId);
        const presence = await getPresence(auth, accountId);
        const region = await getUserRegion(auth, accountId);
        const devices = await getAccountDevices(auth);
        
        let playtimeMap = {};
        try {
            const playedGames = await getUserPlayedGames(auth, accountId);
            const games = playedGames.titles || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        } catch (e) {
            // Fallback to recent if playedGames fails
            const recentlyPlayed = await getRecentlyPlayedGames(auth, { limit: 50 });
            const games = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
            games.forEach(g => { playtimeMap[g.name] = parsePlaytime(g.playDuration); });
        }

        const { trophyTitles } = await getUserTitles(auth, accountId);
        const recentGames = [];
        let activeGameMetadata = null;

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;
            const earnedC = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const totalC = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);
            const hrs = playtimeMap[name] || parsePlaytime(title.playDuration);
            if (recentGames.length < 6) recentGames.push({ name, art: title.trophyTitleIconUrl, progress: title.progress, ratio: `${earnedC}/${totalC}`, hours: hrs });
            if (!activeGameMetadata) {
                try {
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, accountId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    activeGameMetadata = {
                        title: name, hours: hrs,
                        trophies: (meta || []).map(m => {
                            const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                            return { name: m.trophyName, description: m.trophyDetail || "Secret", type: m.trophyType, icon: m.trophyIconUrl, rarity: m.trophyRare ? m.trophyRare + "%" : "Common", earned: s?.earned || false, earnedDate: s?.earned ? new Date(s.earnedDateTime).toLocaleString() : "--", currentValue: s?.progress, targetValue: m.trophyProgressTargetValue };
                        })
                    };
                } catch (e) {}
            }
        }

        const stats = await getUserTrophyProfileSummary(auth, accountId);
        return {
            auth, accountId, online: presence.online, currentGame: presence.currentGame, platform: presence.platform,
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "",
            bio: profile.aboutMe || "", plus: profile.isPlus, level: stats.trophyLevel,
            region: region.country || "US", devices: devices.devices?.length || 0,
            activeHunt: activeGameMetadata, recentGames,
            trophies: { platinum: stats.earnedTrophies?.platinum || 0, gold: stats.earnedTrophies?.gold || 0, silver: stats.earnedTrophies?.silver || 0, bronze: stats.earnedTrophies?.bronze || 0, total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0) },
            tokenStatus: "HEALTHY", lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { return null; }
}

async function main() {
    const dataPath = path.join(__dirname, "psn_data.json");
    const tokensPath = path.join(__dirname, "tokens.json");
    let tokens = { werewolf: "", ray: "" };
    let finalData = { users: {}, mutualPack: [], systemAlerts: [] };

    try { if (fs.existsSync(tokensPath)) tokens = JSON.parse(fs.readFileSync(tokensPath)); } catch (e) {}
    const wToken = tokens.werewolf || process.env.PSN_NPSSO_WEREWOLF || "";
    const rToken = tokens.ray || process.env.PSN_NPSSO_RAY || "";

    try { if (fs.existsSync(dataPath)) {
        const backup = JSON.parse(fs.readFileSync(dataPath));
        finalData.users = backup.users || {};
        finalData.mutualPack = backup.mutualPack || [];
    }} catch (e) {}

    const wolfFull = await getFullUserData(wToken, "Werewolf", "Werewolf3788");
    const rayFull = await getFullUserData(rToken, "Ray", "OneLIVIDMAN");

    if (wolfFull && !wolfFull.error) finalData.users.werewolf = wolfFull;
    if (rayFull && !rayFull.error) finalData.users.ray = rayFull;

    // FALLBACKS
    if (wolfFull?.error && rayFull?.error) {
        finalData.systemAlerts.push({ level: "CRITICAL", msg: "IMMEDIATE FIX: ALL PSN KEYS EXPIRED" });
    } else {
        if (wolfFull?.error && rayFull && !rayFull.error) {
            const fb = await getFallbackData(rayFull.auth, "Werewolf3788");
            if (fb) finalData.users.werewolf = { ...finalData.users.werewolf, ...fb, tokenStatus: "EXPIRED" };
        }
        if (rayFull?.error && wolfFull && !wolfFull.error) {
            const fb = await getFallbackData(wolfFull.auth, "OneLIVIDMAN");
            if (fb) finalData.users.ray = { ...finalData.users.ray, ...fb, tokenStatus: "EXPIRED" };
        }
    }

    // DISCOVERY (Key Unification)
    const activeSessions = [];
    if (wolfFull && !wolfFull.error) activeSessions.push({ auth: wolfFull.auth, accId: wolfFull.accountId });
    if (rayFull && !rayFull.error) activeSessions.push({ auth: rayFull.auth, accId: rayFull.accountId });

    if (activeSessions.length > 0) {
        console.log(`[DISCOVERY] Syncing unified pool...`);
        for (const session of activeSessions) {
            try {
                const list = await getFriendsList(session.auth, session.accId);
                for (const f of list.friends || []) {
                    const isActive = isUserActive(f.presence?.primaryPlatformInfo?.onlineStatus);
                    const squadKey = ID_TO_KEY[f.onlineId.toLowerCase()];

                    // SHIELD: Protect primary users from being overwritten by friends-list data
                    if (squadKey === 'werewolf' && wolfFull && !wolfFull.error) continue;
                    if (squadKey === 'ray' && rayFull && !rayFull.error) continue;

                    const storageKey = squadKey || f.onlineId;
                    if (!finalData.users[storageKey]) {
                        finalData.users[storageKey] = { online: isActive, currentGame: f.presence?.gameTitleInfoList?.[0]?.titleName || "Dashboard", platform: f.presence?.primaryPlatformInfo?.platform?.toUpperCase() || "PS5" };
                    } else {
                        finalData.users[storageKey].online = isActive;
                        if (isActive) finalData.users[storageKey].currentGame = f.presence?.gameTitleInfoList?.[0]?.titleName || "Dashboard";
                    }
                }
            } catch (e) {}
        }
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Master Sync v6.9.9 Complete.`);
}
main();
