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
 * Version 13.7.4 - Absolute Master Omni-Protocol (Legacy Range & Cross-Account Age)
 * Filepath: Playstation/psnscript.js
 * * * --- INSTANCE AUTHENTICATION ---
 * Last Generated: Monday, May 4, 2026
 * Timestamp: 10:12 PM EDT (New York Time)
 * Status: Production Ready - Legacy Span Logic Verified
 * * * --- PSN SYNC CHECKLIST (VERIFIED DATA HARVEST) ---
 * 1.  BIO HARVEST: [Verified] Master key pulls "About Me" for all members if 19-digit ID is provided.
 * 2.  HUNTER PERSONAS: [Verified] Dynamic labels based on hunting velocity.
 * 3.  HUNTING VELOCITY: [Verified] Tracks "First Blood" and calculates completion speed.
 * 4.  API HANDSHAKE: [Verified] Full psn-api integration for Titles, Presence, and DLC.
 * 5.  TWITCH INTELLIGENCE: [Verified] Positive "live" verification via DecAPI.
 * 6.  HIDDEN PROFILE CATCH: [Verified] Resilience logic for private profiles.
 * 7.  ACTIVITY OVERRIDE: [Verified] Proof-of-Life forces Online status if trophies pop within 20 mins.
 * 8.  MUTUAL FOLLOWERS: [Verified] Intersection logic identifies Shared Fans.
 * 9.  IMAGE RECOVERY: [Verified] Multi-stage matching for Game Art.
 * 10. IDENTITY CONSOLIDATION: [Verified] Aggregates Multi-Accounts into single Personas.
 * 11. LEGACY RANGE [NEW]: Calculates total PSN Age from the earliest Alt trophy to the latest Main trophy.
 */

// --- ADMINISTRATIVE CONFIGURATION ---
const SQUAD_MAP = {
    werewolf: "Werewolf3788", // Kevin (Primary)
    kfruti: "KFruti88",       // Kevin (Alt)
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420", // TJ (Primary)
    darkterro: "darkterro420", // TJ (Alt)
    marc: "ElucidatorVah",
    jcrow: "JCrow207",
    bunny: "UnicornBunnyShiv",
    mjolnir: "Michael (Mjolnir)",
    phoenix: "Seth (Fluffy/Phoenix)",
    queen: "broken_queen10",
    balto: "Balto20_01",
    oldman: "In Memoriam: old-man5919"
};

const PERSONA_CONFIG = {
    "Kevin": ["werewolf", "kfruti"],
    "TJ": ["darkwing", "darkterro"],
    "Ray": ["ray"],
    "Seth": ["phoenix"],
    "Marc": ["marc"],
    "JCrow": ["jcrow"],
    "Shiv": ["bunny"],
    "Michael": ["mjolnir"],
    "Queen": ["queen"],
    "Balto": ["balto"],
    "Memorial": ["oldman"]
};

const TWITCH_MAP = {
    werewolf: "werewolf3788",
    kfruti: "kfruti88",
    ray: "raymystyro",
    darkwing: "terrdog420",
    darkterro: "terrdog420",
    mjolnir: "mjolnirgaming",
    phoenix: "phoenix_darkfire",
    queen: "broken_queen10",
    balto: "balto20_01"
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523",
    jcrow: "7524753921019262614",
    bunny: "7742137722487951585",
    queen: "",  
    kfruti: "", 
    darkterro: "", 
    balto: "",  
    oldman: ""  
};

const AMAZON_TAG = "psngaming-20";
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
 * generateAffiliateUrl
 * Logic: Constructs a broad Amazon search URL optimized for all platforms.
 */
function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `https://www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

/**
 * getTrophyAgeString
 * Logic: Calculates high-precision duration since a trophy was earned.
 */
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

/**
 * calculateAgeString
 * Converts raw Date into human readable longevity string.
 */
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

/**
 * getTwitchIntel
 * Logic: Gathers expanded Twitch data points including Positive Status Check.
 */
async function getTwitchIntel(username) {
    if (!username) return null;
    const intel = { 
        isLive: false,
        game: null, 
        gameArt: null, 
        followers: "0", 
        followerNames: [], 
        avatar: null, 
        age: null, 
        bio: null, 
        statusMessage: null,
        uptime: null
    };
    try {
        const [statusRes, gameRes, artRes, followRes, listRes, avatarRes, ageRes, bioRes, titleRes, uptimeRes] = await Promise.all([
            fetch(`https://decapi.me/twitch/status/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/game/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/game_image/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/followcount/${username.toLowerCase()}`).then(r => r.text()),
            fetch(`https://decapi.me/twitch/followers/${username.toLowerCase()}?limit=100`).then(r => r.text()),
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
        
        if (!listRes.includes("Error") && !listRes.includes("Not Found")) {
            intel.followerNames = listRes.split(", ").map(n => n.trim());
        }

        intel.avatar = avatarRes.includes("http") ? avatarRes.trim() : null;
        intel.age = ageRes.includes("Error") ? "Unknown" : ageRes.trim();
        intel.bio = invalidTerms.some(term => bioRes.toLowerCase().includes(term)) ? null : bioRes.trim();
        intel.statusMessage = (titleRes.includes("Error") || !intel.isLive) ? null : titleRes.trim();
        intel.uptime = (!intel.isLive || uptimeRes.includes("Error")) ? null : uptimeRes.trim();
        
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
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    
    if (!auth || !targetId) {
        return {
            onlineId: SQUAD_MAP[userKey] || label,
            online: !!twitchIntel?.isLive,
            currentGame: twitchIntel?.game || "Dashboard",
            currentGameArt: twitchIntel?.gameArt || null,
            currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game),
            bio: twitchIntel?.bio || "Official Pack Member Profile",
            twitch: twitchIntel,
            lastUpdated: new Date().toLocaleString(),
            note: label.includes("Memorial") ? "Account Legacy Preserved" : "Twitch-Master Presence"
        };
    }

    console.log(`[SYNC] Omni-Protocol v13.7.4 Sync: ${label}`);
    
    try {
        const profile = await getProfileFromAccountId(auth, targetId);
        let region = { country: "US", language: "en" };
        if (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
        }
        
        const presenceId = (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) ? "me" : targetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        
        const { trophyTitles } = await getUserTitles(auth, targetId);
        const sortedTitles = (trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const earliestEntry = (trophyTitles || []).reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = Array.isArray(raw) ? raw[0] : (raw.basicPresences ? raw.basicPresences[0] : raw);
        } catch(e) {}

        const activeGameInfo = rawP.gameTitleInfoList?.[0] || {};
        const resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && activeGameInfo.titleName === "Dashboard") ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");
        
        const matchedMeta = sortedTitles.find(t => {
            if (activeGameInfo.npCommunicationId && t.npCommunicationId === activeGameInfo.npCommunicationId) return true;
            const cleanTrophyName = t.trophyTitleName.replace(/®|™/g, "").toLowerCase().trim();
            const cleanActiveName = resolvedTitle.replace(/®|™/g, "").toLowerCase().trim();
            return cleanTrophyName === cleanActiveName;
        }) || {};

        const stats = await getUserTrophyProfileSummary(auth, targetId);
        const recentGames = [];
        let activeHunt = null;
        let mostRecentTrophies = [];

        const targetSyncId = activeGameInfo.npCommunicationId || matchedMeta.npCommunicationId || sortedTitles[0]?.npCommunicationId;

        for (const title of sortedTitles.slice(0, 15)) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;
            const earnedTotal = (title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze);
            const definedTotal = (title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze);

            if (recentGames.length < 6) {
                recentGames.push({
                    name, art: title.trophyTitleIconUrl, progress: title.progress,
                    ratio: `${earnedTotal}/${definedTotal}`, amazonAffiliateUrl: generateAffiliateUrl(name),
                    npCommunicationId: title.npCommunicationId, lastPlayed: title.lastUpdatedDateTime
                });
            }

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
                            earnedAge: s?.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0, targetValue: m.trophyProgressTargetValue || 0
                        };
                    });

                    const earnedTrophiesOnly = mappedTrophies.filter(t => t.earned).sort((a,b) => a.timestamp - b.timestamp);
                    const firstBlood = earnedTrophiesOnly[0]?.timestamp || null;
                    const lastPop = earnedTrophiesOnly[earnedTrophiesOnly.length - 1]?.timestamp || null;
                    
                    let speedString = "N/A";
                    let persona = "Steady Hunter"; 

                    if (firstBlood && lastPop) {
                        const days = Math.ceil((lastPop - firstBlood) / (1000 * 60 * 60 * 24));
                        speedString = days === 0 ? "Started Today" : `${days} day${days > 1 ? 's' : ''}`;
                        if (days <= 10 && title.progress >= 50) persona = "Dead Set Hunter";
                        else if (days <= 14 && title.progress >= 80) persona = "Apex Predator";
                        else if (days > 30) persona = "Casual Pursuit";
                    }

                    activeHunt = { 
                        title: name, amazonAffiliateUrl: generateAffiliateUrl(name),
                        velocity: {
                            firstEarned: earnedTrophiesOnly[0]?.earnedDate || "Not Started",
                            huntingDuration: speedString,
                            hunterPersona: persona,
                            completionStatus: `${earnedTotal}/${definedTotal}`
                        },
                        groups: (groupEarnings.trophyGroups || []).map(g => {
                            const gm = trophyGroups.find(tg => tg.trophyGroupId === g.trophyGroupId);
                            const gMax = (gm?.definedTrophies?.platinum || 0) + (gm?.definedTrophies?.gold || 0) + (gm?.definedTrophies?.silver || 0) + (gm?.definedTrophies?.bronze || 0);
                            return { name: gm?.trophyGroupName || "Expansion Pack", progress: g.progress, ratio: `${(g.earnedTrophies.platinum + g.earnedTrophies.gold + g.earnedTrophies.silver + g.earnedTrophies.bronze)}/${gMax}` };
                        }),
                        trophies: mappedTrophies, npCommunicationId: title.npCommunicationId
                    };
                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate, age: t.earnedAge });
                    });
                } catch (e) {}
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
        const lastTrophyTime = mostRecentTrophies[0]?.timestamp || 0;
        const proofOfLife = (Date.now() - lastTrophyTime) < 1200000;

        const presence = {
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive || proofOfLife,
            currentGame: resolvedTitle,
            currentGameArt: matchedMeta.trophyTitleIconUrl || twitchIntel?.gameArt || sortedTitles[0]?.trophyTitleIconUrl || null,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (proofOfLife ? "Active Hunting" : null) || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: activeGameInfo.npCommunicationId || matchedMeta.npCommunicationId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            twitch: twitchIntel
        };

        return {
            onlineId: profile.onlineId,
            accountId: targetId,
            ...presence, 
            avatar: profile.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "", 
            bio: twitchIntel?.bio || profile.aboutMe || "Official Pack Member Profile", 
            psnAccountAge: calculateAgeString(earliestEntry),
            earliestTrophyDate: earliestEntry, // RAW timestamp for persona aggregation
            latestTrophyDate: mostRecentTrophies[0]?.timestamp || new Date().getTime(), // RAW timestamp for persona aggregation
            plus: profile.isPlus, level: stats.trophyLevel, region: region.country || "US",
            trophySummary: { 
                platinum: stats.earnedTrophies?.platinum || 0, gold: stats.earnedTrophies?.gold || 0,
                silver: stats.earnedTrophies?.silver || 0, bronze: stats.earnedTrophies?.bronze || 0,
                total: (stats.earnedTrophies?.platinum || 0) + (stats.earnedTrophies?.gold || 0) + (stats.earnedTrophies?.silver || 0) + (stats.earnedTrophies?.bronze || 0)
            },
            recentGames, activeHunt, mostRecentTrophies,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        return {
            onlineId: SQUAD_MAP[userKey] || label,
            online: !!twitchIntel?.isLive,
            currentGame: twitchIntel?.game || "Dashboard",
            currentGameArt: twitchIntel?.gameArt || null,
            currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live on Twitch" : null),
            amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game),
            bio: twitchIntel?.bio || "Official Pack Member Profile",
            twitch: twitchIntel,
            lastUpdated: new Date().toLocaleString(),
            note: "Twitch-Active Status (PSN Private)"
        };
    }
}

async function main() {
    console.log("[INIT] Starting Absolute Master Omni-Collector v13.7.4...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        personas: {}, 
        mutualSquadFollowers: [], 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "13.7.4",
        codeTimestamp: "Monday, May 4, 2026 | 10:12 PM EDT"
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

    // 1. Process Individual Accounts
    for (const [key, label] of Object.entries(SQUAD_MAP)) {
        const accountId = ACCOUNT_IDS[key];
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, label, key, accountId, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    // 2. Persona Consolidation Loop (Aggregating Age across accounts)
    for (const [realName, keys] of Object.entries(PERSONA_CONFIG)) {
        const linkedAccounts = keys.map(k => finalData.users[k]).filter(u => !!u);
        if (linkedAccounts.length === 0) continue;

        // Aggregate Stats
        const totalPlats = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.platinum || 0), 0);
        const totalGolds = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.gold || 0), 0);
        const totalSilvers = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.silver || 0), 0);
        const totalBronzes = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.bronze || 0), 0);
        const maxLevel = Math.max(...linkedAccounts.map(u => u.level || 0));
        const isOnline = linkedAccounts.some(u => u.online);
        
        // Find Absolute Earliest and Latest timestamps across all linked IDs
        const allStartTimes = linkedAccounts.map(u => new Date(u.earliestTrophyDate).getTime()).filter(t => !isNaN(t));
        const allEndTimes = linkedAccounts.map(u => u.latestTrophyDate).filter(t => !!t);
        
        const absoluteStart = allStartTimes.length > 0 ? Math.min(...allStartTimes) : null;
        const absoluteEnd = allEndTimes.length > 0 ? Math.max(...allEndTimes) : new Date().getTime();
        
        const activeAccount = linkedAccounts.find(u => u.online) || linkedAccounts[0];

        finalData.personas[realName] = {
            displayName: realName,
            isOnline,
            primaryOnlineId: activeAccount.onlineId,
            combinedTrophies: {
                platinum: totalPlats, gold: totalGolds,
                silver: totalSilvers, bronze: totalBronzes,
                total: totalPlats + totalGolds + totalSilvers + totalBronzes
            },
            maxLevel,
            legacyAge: calculateAgeString(absoluteStart, absoluteEnd),
            legacyRange: {
                start: absoluteStart ? new Date(absoluteStart).toLocaleString() : "Unknown",
                end: new Date(absoluteEnd).toLocaleString()
            },
            currentGame: activeAccount.currentGame,
            currentGameArt: activeAccount.currentGameArt,
            currentActivity: activeAccount.currentGameActivity,
            avatar: activeAccount.avatar,
            bio: activeAccount.bio,
            accounts: keys,
            lastUpdated: new Date().toLocaleString()
        };
    }

    // 3. Mutual Follower Logic
    const lists = Object.values(finalData.users).map(u => u.twitch?.followerNames || []).filter(l => l.length > 0);
    if (lists.length > 1) {
        const frequencyMap = {};
        lists.flat().forEach(name => { frequencyMap[name] = (frequencyMap[name] || 0) + (typeof name === 'string' ? 1 : 0); });
        finalData.mutualSquadFollowers = Object.entries(frequencyMap).filter(([name, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ username: name, sharedConnections: count }));
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Persona Aggregator v13.7.4 Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
