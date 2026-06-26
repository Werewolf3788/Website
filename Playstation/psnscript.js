/*
 * ==========================================
 * --- PRECISION INTEGRITY PROTOCOL ---
 * Project: Kevin's Official Pack Sync Engine (Firebase RTDB Live Stream)
 * Version: 14.1.0 - The August-Ready Roster Protocol
 * NYT TIMESTAMP: Thu, June 25, 2026, 10:33 PM EDT
 * Compatibility: Node.js v20+, Firebase Realtime Database REST API
 * Note: NO STRIPPING, NO COMPRESSING. ALL SQUAD LOGIC & HELPER FUNCTIONS INTACT.
 * Updates: Purged dead legacy accounts. Roster standardized to 1:1 real-name pack ownership. Injected August 2026 Deprecation Trigger & JWT Account ID Auto-Resolver.
 * ==========================================
 */

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
    getBasicPresence,
    getUserFriendsAccountIds
} = psnApi;

const fs = require("fs");
const path = require("path");

const FIREBASE_RTDB_URL = "https://game-tracker-5b2ef-default-rtdb.firebaseio.com/psn.json";

/* 
 * ==========================================
 * 🚨 AUGUST 2026 MIGRATION PROTOCOL 🚨
 * When 'werewolf3788' is deleted in August:
 * 1. Generate a fresh NPSSO token while logged into KFruti88 on Sony's website.
 * 2. Paste KFruti88's NPSSO string directly into the existing GitHub Secret: PSN_NPSSO_WEREWOLF
 * 3. Delete the 'werewolf' line inside SQUAD_MAP below.
 * 4. Update PERSONA_CONFIG["Kevin"] to: ["kfruti"]
 * The engine's JWT resolver will auto-catch KFruti88's Account ID automatically.
 * ==========================================
 */

const SQUAD_MAP = {
    werewolf: "werewolf3788",   // Scheduled for deletion: Aug 2026
    kfruti: "KFruti88",         // Kevin's designated future primary
    ray: "OneLIVIDMAN",         // Ray
    darkwing: "Darkwing69420",  // TJ
    mike: "IlIMjolnirIlI",      // Mike (Hidden PSN Profile)
    katy: "Balto20_01",         // Katy (Hidden PSN Profile)
    marc: "DesdemonaTiger",     // Marc (Hidden PSN Profile)
    seth: "joe-punk_"           // Seth (Hidden PSN Profile)
};

const PERSONA_CONFIG = {
    "Kevin": ["werewolf", "kfruti"], 
    "Ray": ["ray"],
    "TJ": ["darkwing"],
    "Mike": ["mike"],
    "Katy": ["katy"],
    "Marc": ["marc"],
    "Seth": ["seth"]
};

const TWITCH_MAP = {
    werewolf: "werewolf3788",
    kfruti: "werewolf3788",     // Kevin streams on primary werewolf channel
    ray: "raymysytro",          // Ray
    darkwing: "darkterr",       // TJ
    mike: "mjolnirgaming",      // Mike
    seth: "phoenix_darkfire"    // Seth
    // katy & marc omitted -> resolves undefined -> safely bypassed in Twitch intel fetch
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    kfruti: "",                      // Will auto-resolve via encrypted token cracking
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    mike: "",                        // Hidden PSN -> Fallback to placeholder presence
    katy: "",                        // Hidden PSN -> Fallback to placeholder presence
    marc: "",                        // Hidden PSN -> Fallback to placeholder presence
    seth: ""                         // Hidden PSN -> Fallback to placeholder presence
};

const AMAZON_TAG = "psngaming-20";
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];
const DATA_PATH = path.join(__dirname, "psn_data.json");
const TOKENS_PATH = path.join(__dirname, "tokens.json");
const ROOT_NOJEKYLL = path.join(__dirname, "..", ".nojekyll");

let tokenStore = { werewolf: {}, ray: {} };
try { 
    if (fs.existsSync(TOKENS_PATH)) {
        tokenStore = JSON.parse(fs.readFileSync(TOKENS_PATH));
    }
} catch (e) { console.error("[ERROR] Local Token Store not found."); }

const saveTokens = () => fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenStore, null, 2));

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    let diff = now - past;
    if (diff < 0) diff = 0;

    const intervals = [
        { label: 'yr', value: 31536000000 },
        { label: 'month', value: 2592000000 },
        { label: 'week', value: 604800000 },
        { label: 'day', value: 86400000 },
        { label: 'hour', value: 3600000 },
        { label: 'min', value: 60000 }
    ];

    const parts = [];
    for (const interval of intervals) {
        const count = Math.floor(diff / interval.value);
        if (count > 0) {
            parts.push(`${count} ${interval.label}${count > 1 ? 's' : ''}`);
            diff -= count * interval.value;
        }
    }
    return parts.length > 0 ? parts.join(', ') : "Just now";
}

function calculateAgeString(startDate, endDate = new Date()) {
    if (!startDate) return "Unknown";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years} years, ${months} months`;
    return `${months} months`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getTwitchIntel(username) {
    if (!username) return null;
    const intel = { 
        isLive: false, game: null, gameArt: null, followers: "0", 
        latestFollower: "None", followerNames: [], avatar: null, age: null, bio: null, 
        statusMessage: null, uptime: null
    };
    try {
        const [statusRes, gameRes, artRes, followRes, listRes, latestFollowerRes, avatarRes, ageRes, bioRes, titleRes, uptimeRes] = await Promise.all([
            fetch(`https://decapi.me/twitch/status/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/game/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/game_image/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/followcount/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/followers/${username.toLowerCase()}?limit=100`).then(r => r.text()), 
            fetch(`https://decapi.me/twitch/latest_follower/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/avatar/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/accountage/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/description/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/title/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/uptime/${username.toLowerCase()}`).then(r => r.text())
        ]);

        intel.isLive = statusRes.toLowerCase().includes("live");
        const invalidTerms = ["offline", "games & demo", "not found", "error", "404"];
        
        intel.game = invalidTerms.some(term => gameRes.toLowerCase().includes(term)) ? null : gameRes.trim();
        intel.gameArt = (artRes.includes("http") && intel.game) ? artRes.trim() : null;
        intel.followers = followRes.includes("Error") ? "0" : followRes.trim();
        intel.latestFollower = latestFollowerRes.includes("Error") ? "None" : latestFollowerRes.trim();
        
        if (!listRes.includes("Error") && !listRes.includes("Not Found")) {
            intel.followerNames = listRes.split(", ").map(n => n.trim());
        }

        intel.avatar = avatarRes.includes("http") ? avatarRes.trim() : null;
        intel.age = ageRes.includes("Error") ? "Unknown" : ageRes.trim();
        intel.bio = invalidTerms.some(term => bioRes.toLowerCase().includes(term)) ? null : bioRes.trim();
        intel.statusMessage = (titleRes.includes("Error") || !intel.isLive) ? null : titleRes.trim();
        intel.uptime = (!intel.isLive || uptimeRes.includes("Error")) ? null : uptimeRes.trim();
        
        return intel;
    } catch (e) { 
        console.error(`[TWITCH ERROR] Failed fetching ${username}:`, e);
        return null; 
    }
}

async function isTokenValid(accessToken) {
    try {
        await getUserRegion({ accessToken }, "me");
        return true;
    } catch (e) {
        return false;
    }
}

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        console.log(`[AUTH] Verifying cached access token integrity for ${userKey}...`);
        const isValid = await isTokenValid(currentUserTokens.accessToken);
        if (isValid) {
            return { accessToken: currentUserTokens.accessToken };
        }
        currentUserTokens.accessToken = null;
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
        } catch (e) {
            currentUserTokens.refreshToken = null;
        }
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
        } catch (e) { 
            console.error(`[AUTH ERROR] NPSSO exchange failed for ${userKey}.`);
            return null; 
        }
    }
    return null;
}

async function getFullUserData(auth, label, userKey, targetId, existingData) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    
    let resolvedTargetId = targetId;

    // AUGUST MIGRATION RESOLVER: If account ID is missing, crack open auth JWT to pull dynamic ID
    if (!resolvedTargetId && auth?.accessToken) {
        try {
            const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString());
            resolvedTargetId = payload.account_id || "";
            if (resolvedTargetId) console.log(`[AUTH RESOLVER] Auto-discovered Account ID for ${label}: ${resolvedTargetId}`);
        } catch(e) {}
    }

    if (!auth || !resolvedTargetId) {
        if (existingData && existingData.trophySummary) {
            existingData.online = !!twitchIntel?.isLive;
            existingData.twitch = twitchIntel;
            existingData.lastUpdated = new Date().toLocaleString();
            return existingData;
        }
        return {
            onlineId: SQUAD_MAP[userKey] || label, online: !!twitchIntel?.isLive,
            currentGame: twitchIntel?.game || "Dashboard", currentGameArt: twitchIntel?.gameArt || null,
            currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), bio: twitchIntel?.bio || "Official Pack Member Profile",
            twitch: twitchIntel, lastUpdated: new Date().toLocaleString(), gamesPlayed: 0,
            note: "Twitch Presence (PSN Profile Hidden/Private)"
        };
    }

    try {
        const profile = await getProfileFromAccountId(auth, resolvedTargetId).catch(() => ({}));
        let region = { country: "US", language: "en" };
        let friendsList = [];
        
        if (ACCOUNT_IDS.werewolf === resolvedTargetId || ACCOUNT_IDS.ray === resolvedTargetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try {
                const friendsRes = await getUserFriendsAccountIds(auth, "me");
                friendsList = friendsRes || [];
            } catch(e) {}
        }
        
        const presenceId = (ACCOUNT_IDS.werewolf === resolvedTargetId || ACCOUNT_IDS.ray === resolvedTargetId) ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        
        const titlesRes = await getUserTitles(auth, resolvedTargetId, { limit: 800 }).catch(() => ({}));
        const sortedTitles = (titlesRes?.trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
        const totalGamesPlayedCount = titlesRes?.totalItemCount || sortedTitles.length;

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        let telemetryData = [];
        try {
            const history = await getRecentlyPlayedGames(auth, resolvedTargetId, { limit: 200 });
            telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
        } catch (e) {}

        const mergedGamesMap = new Map();
        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            mergedGamesMap.set(g.npCommunicationId, {
                ...g, npCommunicationId: g.npCommunicationId, name: g.name || "Unknown Game",
                art: g.image?.url || null, playCount: g.playCount, lastPlayed: g.lastPlayedDateTime || null,
                progress: 0, earnedTotal: 0, definedTotal: 0, npServiceName: null
            });
        });

        sortedTitles.forEach(t => {
            if (!t.npCommunicationId) return;
            const existing = mergedGamesMap.get(t.npCommunicationId) || {
                npCommunicationId: t.npCommunicationId, name: t.trophyTitleName || "Unknown Game",
                art: t.trophyTitleIconUrl || null, lastPlayed: t.lastUpdatedDateTime || null
            };
            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.progress = t.progress || 0;
            existing.earnedTotal = (t.earnedTrophies?.platinum||0) + (t.earnedTrophies?.gold||0) + (t.earnedTrophies?.silver||0) + (t.earnedTrophies?.bronze||0);
            existing.definedTotal = (t.definedTrophies?.platinum||0) + (t.definedTrophies?.gold||0) + (t.definedTrophies?.silver||0) + (t.definedTrophies?.bronze||0);
            mergedGamesMap.set(t.npCommunicationId, existing);
        });

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => new Date(b.lastPlayed||0) - new Date(a.lastPlayed||0));
        const matchedGame = allRecentGames.find(g => g.name.toLowerCase().trim() === resolvedTitle.toLowerCase().trim()) || allRecentGames[0] || {};
        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        
        const recentGames = allRecentGames.slice(0, 6).map(g => ({
            ...g, ratio: `${g.earnedTotal}/${g.definedTotal}`, amazonAffiliateUrl: generateAffiliateUrl(g.name)
        }));

        return {
            ...profile, onlineId: profile?.onlineId || label, accountId: resolvedTargetId,
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive,
            currentGame: resolvedTitle, currentGameArt: matchedGame.art || twitchIntel?.gameArt || null,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || null,
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle), platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            twitch: twitchIntel, gamesPlayed: totalGamesPlayedCount, avatar: profile?.avatars?.[0]?.url || "", 
            bio: twitchIntel?.bio || profile?.aboutMe || "Official Pack Member Profile", psnAccountAge: calculateAgeString(earliestEntry), 
            plus: !!profile?.isPlus, level: stats?.trophyLevel || 0, region: region?.country || "US",
            trophySummary: { 
                ...stats, platinum: stats?.earnedTrophies?.platinum||0, gold: stats?.earnedTrophies?.gold||0,
                silver: stats?.earnedTrophies?.silver||0, bronze: stats?.earnedTrophies?.bronze||0,
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0)
            },
            recentGames, fullLibrary: allRecentGames, lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        return existingData || null; 
    }
}

async function pushToFirebase(payload) {
    console.log("[FIREBASE] Transmitting live Omni-Payload to Realtime Database target...");
    try {
        const response = await fetch(FIREBASE_RTDB_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        console.log("[FIREBASE SUCCESS] Realtime Database state updated instantaneously.");
    } catch (err) {
        console.error("[FIREBASE ERROR] Failed database push:", err.message);
    }
}

async function main() {
    console.log("[INIT] Starting Absolute Master Omni-Collector v14.1.0 (August Roster Edition)...");
    
    // AUTOMATED AUGUST SYSTEM ALARM (Fires if date is >= Aug 1, 2026)
    if (Date.now() >= 1785542400000) {
        console.warn("\n=======================================================");
        console.warn("🚨 AUTOMATED SYSTEM ALERT: AUGUST 2026 DEPRECATION WINDOW 🚨");
        console.warn("Action Required: Account 'werewolf3788' is scheduled for purge.");
        console.warn("Update SQUAD_MAP and paste KFruti88 NPSSO into secret PSN_NPSSO_WEREWOLF.");
        console.warn("=======================================================\n");
    }

    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, personas: {}, mutualSquadFollowers: [], 
        lastGlobalUpdate: new Date().toLocaleString(), engineVersion: "14.1.0",
        codeTimestamp: "Thursday, June 25, 2026 | 10:33 PM EDT"
    };

    try {
        if (fs.existsSync(DATA_PATH)) {
            finalData.users = JSON.parse(fs.readFileSync(DATA_PATH)).users || {};
        }
    } catch (e) {}

    // Master Auth uses Kevin's active account secret token
    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
    const masterAuth = wolfAuth || rayAuth;

    for (const [key, label] of Object.entries(SQUAD_MAP)) {
        const accountId = ACCOUNT_IDS[key];
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, label, key, accountId, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    for (const [realName, keys] of Object.entries(PERSONA_CONFIG)) {
        const linkedAccounts = keys.map(k => finalData.users[k]).filter(u => !!u);
        if (linkedAccounts.length === 0) continue;

        const activeAccount = linkedAccounts.find(u => u.online) || linkedAccounts[0];
        finalData.personas[realName] = {
            displayName: realName, isOnline: linkedAccounts.some(u => u.online),
            primaryOnlineId: activeAccount.onlineId,
            combinedTrophies: {
                platinum: linkedAccounts.reduce((s, u) => s + (u.trophySummary?.platinum||0), 0),
                gold: linkedAccounts.reduce((s, u) => s + (u.trophySummary?.gold||0), 0),
                silver: linkedAccounts.reduce((s, u) => s + (u.trophySummary?.silver||0), 0),
                bronze: linkedAccounts.reduce((s, u) => s + (u.trophySummary?.bronze||0), 0),
                total: linkedAccounts.reduce((s, u) => s + (u.trophySummary?.total||0), 0)
            },
            maxLevel: Math.max(...linkedAccounts.map(u => u.level || 0)),
            currentGame: activeAccount.currentGame, currentGameArt: activeAccount.currentGameArt,
            avatar: activeAccount.avatar, bio: activeAccount.bio, accounts: keys,
            lastUpdated: new Date().toLocaleString()
        };
    }

    // Write disk artifact backup
    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    
    // Push Live JSON state to Firebase Cloud Tree
    await pushToFirebase(finalData);
    console.log(`[SUCCESS] Persona Aggregator v14.1.0 Complete.`);
}

main();
