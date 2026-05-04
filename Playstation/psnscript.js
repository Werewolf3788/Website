const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getTitleTrophyGroups,
    getUserTrophyGroupEarningsForTitle,
    getProfileFromAccountId,
    getRecentlyPlayedGames, 
    getUserRegion,
    getBasicPresence 
} = psnApi;

const fs = require("fs");
const path = require("path");

/**
 * Kevin's Official Pack Sync Engine
 * Version 11.4.0 - Absolute Master Omni-Protocol (Twitch Resilience Build)
 * Filepath: Playstation/psnscript.js
 * * * --- INSTANCE AUTHENTICATION ---
 * Last Generated: Monday, May 4, 2026
 * Timestamp: 7:15 PM EDT (New York Time)
 * Status: Production Ready - Twitch Bypass Verified
 * * * --- PSN SYNC CHECKLIST (VERIFIED DATA HARVEST) ---
 * 1.  TWITCH INTEL: [New] Pulls Followers, Profile Image, and Account Age via DecAPI.
 * 2.  RESILIENCE: [New] Twitch data loads even if PSN tokens are expired/bad.
 * 3.  PROFILE: [Cross-Ref] High-Res Avatar, Bio, Plus Status, PSN Level.
 * 4.  PRESENCE: [Cross-Ref] Real-time Handshake (Twitch Game vs PSN Library).
 * 5.  ACCOUNT TOTALS: [Verified] definitive count of ALL earned trophies.
 * 6.  EXPANSIONS: [Fixed] Captured DLC ratios (e.g., 22/71) via Trophy Group Earnings.
 * 7.  22/100 FEATURE: [Captured] PS5 raw progress trackers (Current vs Target).
 * 8.  LIBRARY: [Cross-Ref] Handshakes GraphQL (Art) with Presence for session detail.
 * 9.  PURGE PROTOCOL: [Strict] Omitted "status", "hardware", "storeUrl", and "hours".
 * 10. AUTH REFRESH: [Active] Built-in refreshToken rotation for 24/7 sync.
 */

// --- ADMINISTRATIVE CONFIGURATION ---
const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "ElucidatorVah",
    jcrow: "JCrow207",
    bunny: "UnicornBunnyShiv"
};

const TWITCH_MAP = {
    werewolf: "werewolf3788",
    ray: "raymystyro",
    darkwing: "terrdog420"
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523",
    jcrow: "7524753921019262614",
    bunny: "7742137722487951585"
};

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const DATA_PATH = path.join(__dirname, "psn_data.json");
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

// --- DATA PERSISTENCE HELPERS ---
let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Local Token Store not found."); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

/**
 * getTwitchIntel
 * Logic: Gathers all Twitch data points for a user.
 * Resilience: Key feature - Twitch data does not require PSN auth.
 */
async function getTwitchIntel(username) {
    if (!username) return null;
    const intel = { game: null, followers: "0", avatar: null, age: null };
    try {
        const [gameRes, followRes, avatarRes, ageRes] = await Promise.all([
            fetch(`https://decapi.me/twitch/game/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/followcount/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/avatar/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/accountage/${username.toLowerCase()}`).then(r => r.text())
        ]);

        const invalidGame = ["offline", "games & demo", "not found", "error"];
        intel.game = invalidGame.some(term => gameRes.toLowerCase().includes(term)) ? null : gameRes.trim();
        intel.followers = followRes.includes("Error") ? "0" : followRes.trim();
        intel.avatar = avatarRes.includes("http") ? avatarRes.trim() : null;
        intel.age = ageRes.includes("Error") ? "Unknown" : ageRes.trim();
        
        return intel;
    } catch (e) { return null; }
}

// --- AUTHENTICATION ENGINE ---
async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        return { accessToken: currentUserTokens.accessToken };
    }
    if (currentUserTokens.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            tokenStore[userKey] = { 
                accessToken: refreshed.accessToken, 
                refreshToken: refreshed.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600) 
            };
            saveTokens();
            return refreshed;
        } catch (e) {}
    }
    if (npssoInput) {
        try {
            const accessCode = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(accessCode);
            tokenStore[userKey] = { 
                accessToken: auth.accessToken, 
                refreshToken: auth.refreshToken, 
                expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600) 
            };
            saveTokens();
            return auth;
        } catch (e) { return null; }
    }
    return null;
}

// --- ABSOLUTE OMNI-COLLECTOR ---
async function getFullUserData(auth, label, userKey, targetId, existingData) {
    // START TWITCH HARVEST (Bypasses PSN Key State)
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    
    // If PSN Auth is bad, return a skeleton object with the working Twitch data
    if (!auth || !targetId) {
        console.warn(`[WARN] PSN Auth failed for ${label}. Reverting to Twitch-Only data.`);
        return {
            onlineId: SQUAD_MAP[userKey],
            online: !!twitchIntel?.game,
            currentGame: twitchIntel?.game || "Dashboard",
            twitch: twitchIntel,
            lastUpdated: new Date().toLocaleString(),
            note: "PSN Key Expired - Twitch Active"
        };
    }

    console.log(`[SYNC] Omni-Protocol v11.4.0 Handshake: ${label}`);
    
    try {
        // 1. IDENTITY & REGIONAL
        const profile = await getProfileFromAccountId(auth, targetId);
        let region = { country: "US", language: "en" };
        if (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
        }
        
        // 2. PSN PRESENCE & LIBRARY HANDSHAKE
        const presenceId = (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) ? "me" : targetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        let graphLib = { data: { gameLibraryTitlesRetrieve: { games: [] } } };
        
        try { graphLib = await getRecentlyPlayedGames(auth, { limit: 30 }); } catch(e) {}
        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = Array.isArray(raw) ? raw[0] : (raw.basicPresences ? raw.basicPresences[0] : raw);
        } catch(e) {}

        const activeGameInfo = rawP.gameTitleInfoList?.[0] || {};
        const gamesList = graphLib.data?.gameLibraryTitlesRetrieve?.games || [];
        
        // Handshake: If Twitch is live with a valid game, prioritize it over "Dashboard"
        const resolvedTitle = (twitchIntel?.game && activeGameInfo.titleName === "Dashboard") ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");
        const matchedMeta = gamesList.find(g => g.name.toLowerCase() === resolvedTitle.toLowerCase()) || {};

        const presence = {
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.game,
            currentGame: resolvedTitle,
            currentGameActivity: activeGameInfo.formatValue || (twitchIntel?.game ? "Live on Twitch" : null),
            currentCommunicationId: activeGameInfo.npCommunicationId || matchedMeta.titleId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            twitch: twitchIntel // ATTACH EXPANDED TWITCH DATA
        };

        // 3. ACCOUNT-WIDE TROPHY ANALYTICS
        const stats = await getUserTrophyProfileSummary(auth, targetId);
        const { trophyTitles } = await getUserTitles(auth, targetId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const recentGames = [];
        let activeHunt = null;
        let mostRecentTrophies = [];

        // PERSISTENCE LOCK
        const targetSyncId = presence.currentCommunicationId || sortedTitles[0]?.npCommunicationId;

        for (const title of sortedTitles.slice(0, 15)) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            const earnedTotal = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const definedTotal = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);

            const libMatch = gamesList.find(g => g.name === name) || {};

            if (recentGames.length < 6) {
                recentGames.push({
                    name, 
                    art: libMatch.image?.url || title.trophyTitleIconUrl,
                    progress: title.progress,
                    ratio: `${earnedTotal}/${definedTotal}`,
                    npCommunicationId: title.npCommunicationId,
                    lastPlayed: title.lastUpdatedDateTime
                });
            }

            // 4. DEEP TROPHY HARVEST
            if (title.npCommunicationId === targetSyncId) {
                try {
                    const { trophyGroups } = await getTitleTrophyGroups(auth, title.npCommunicationId, "all");
                    const { trophies: earnedStatus } = await getUserTrophiesEarnedForTitle(auth, targetId, title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(auth, title.npCommunicationId, "all");
                    const groupEarnings = await getUserTrophyGroupEarningsForTitle(auth, targetId, title.npCommunicationId, "all");
                    
                    const mappedTrophies = (meta || []).map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        return { 
                            name: m.trophyName, type: m.trophyType, icon: m.trophyIconUrl, description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare", earnedRate: m.trophyEarnedRate || "0.0",
                            groupName: group?.trophyGroupName || "Base Game", earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0,
                            targetValue: m.trophyProgressTargetValue || 0
                        };
                    });

                    activeHunt = { 
                        title: name, 
                        groups: (groupEarnings.trophyGroups || []).map(g => {
                            const groupMeta = trophyGroups.find(tg => tg.trophyGroupId === g.trophyGroupId);
                            const groupMax = (groupMeta?.definedTrophies?.platinum || 0) + (groupMeta?.definedTrophies?.gold || 0) + (groupMeta?.definedTrophies?.silver || 0) + (groupMeta?.definedTrophies?.bronze || 0);
                            const groupEarned = (g.earnedTrophies.platinum + g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze);
                            return {
                                name: groupMeta?.trophyGroupName || "Expansion Pack",
                                progress: g.progress,
                                ratio: `${groupEarned}/${groupMax}`
                            };
                        }),
                        trophies: mappedTrophies, 
                        npCommunicationId: title.npCommunicationId
                    };

                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate });
                    });
                } catch (e) {}
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);

        return {
            onlineId: profile.onlineId,
            accountId: targetId,
            ...presence, 
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "", 
            bio: profile.aboutMe || "Official Pack Member Profile", 
            plus: profile.isPlus, level: stats.trophyLevel, region: region.country || "US",
            trophySummary: { 
                platinum: stats.earnedTrophies?.platinum || 0, 
                gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0,
                bronze: stats.earnedTrophies?.bronze || 0,
                total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0)
            },
            recentGames, activeHunt, mostRecentTrophies,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[CRITICAL] Omni-Collector Error for ${label}:`, e.message);
        return existingData || null; 
    }
}

async function main() {
    console.log("[INIT] Starting Absolute Omni-Collector v11.4.0...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "11.4.0",
        codeTimestamp: "Monday, May 4, 2026 | 7:15 PM EDT"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            const backup = JSON.parse(fs.readFileSync(DATA_PATH));
            finalData.users = backup.users || {};
        }
    } catch (e) {}

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
    const masterAuth = wolfAuth || rayAuth;

    for (const [key, id] of Object.entries(ACCOUNT_IDS)) {
        // Fallback: If rayAuth fails, use wolfAuth. If both fail, pass null to trigger Twitch-Only mode.
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, SQUAD_MAP[key], key, id, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Absolute Omni-Protocol Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
