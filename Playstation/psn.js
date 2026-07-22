/*
 * ==========================================
 * --- PRECISION INTEGRITY PROTOCOL ---
 * Project: Kevin's Official Pack Sync Engine (Max-Payload Firebase Stream)
 * Version: 14.5.2 - Pure Firebase Stateless Sync Engine
 * NYT TIMESTAMP: Wed, July 22, 2026, 3:47 AM EDT
 * Compatibility: Node.js v20+, Firebase Realtime Database REST API
 * Logic: Pulls existing state directly from Firebase REST API, aggregates
 *        new PSN & Twitch data, and streams the updated payload back to Firebase.
 *        Bypasses local file writes to eliminate Git merge conflicts.
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
    getUserFriendsAccountIds,
    getAccountDevices,
    getUserBlockedAccountIds,
    getUserFriendsRequests
} = psnApi;

const FIREBASE_RTDB_URL = "https://game-tracker-5b2ef-default-rtdb.firebaseio.com/psn.json";

/* 
 * ==========================================
 * 🚨 AUGUST 2026 MIGRATION PROTOCOL 🚨
 * When 'werewolf3788' is deleted in August:
 * 1. Generate a fresh NPSSO token while logged into wildhorse_spirit on Sony's website.
 * 2. Paste wildhorse_spirit's NPSSO string directly into the existing GitHub Secret: PSN_NPSSO_WEREWOLF
 * 3. Delete the 'werewolf' line inside SQUAD_MAP below.
 * 4. Update PERSONA_CONFIG["Kevin"] to: ["kfruti"]
 * The engine's JWT resolver will auto-catch wildhorse_spirit's Account ID automatically.
 * ==========================================
 */

const SQUAD_MAP = {
    werewolf: "werewolf3788",   // Scheduled for deletion: Aug 2026
    kfruti: "wildhorse_spirit", // Kevin's designated future primary
    ray: "OneLIVIDMAN",          // Ray
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
    ray: "raymystyro",          // Ray
    darkwing: "terrdog420",     // TJ
    mike: "mjolnirgaming",      // Mike
    seth: "phoenix_darkfire"    // Seth
};

const ACCOUNT_IDS = {
    werewolf: "3728215008151724560",
    kfruti: "",                     // Will auto-resolve via encrypted token cracking
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    mike: "",                       // Hidden PSN -> Fallback to placeholder presence
    katy: "",                       // Hidden PSN -> Fallback to placeholder presence
    marc: "",                       // Hidden PSN -> Fallback to placeholder presence
    seth: ""                        // Hidden PSN -> Fallback to placeholder presence
};

const AMAZON_TAG = "psngaming-20";
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online"];

let tokenStore = { werewolf: {}, ray: {} };

let diagnosticReport = {
    werewolf_active: "no",
    ray_active: "no",
    lastCheck: new Date().toLocaleString()
};

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
        statusMessage: null, uptime: null, viewers: "0", subCount: "0",
        chatRules: null, channelCreationRaw: null
    };

    const cleanUser = username.toLowerCase().trim();
    const invalidTerms = ["offline", "games & demo", "not found", "error", "404", "no description available", "does not have chat rules"];

    const cleanFetch = async (endpoint) => {
        try {
            const res = await fetch(`https://decapi.me/twitch/${endpoint}/${cleanUser}`);
            if (!res.ok) return null;
            const text = await res.text();
            const val = text.trim();
            if (!val || invalidTerms.some(term => val.toLowerCase().includes(term))) return null;
            return val;
        } catch (e) { return null; }
    };

    try {
        const statusRes = await cleanFetch("status");
        intel.isLive = !!(statusRes && statusRes.toLowerCase().includes("live"));

        intel.game = await cleanFetch("game");
        intel.gameArt = await cleanFetch("game_image");
        
        const fCount = await cleanFetch("followcount");
        intel.followers = fCount || "0";

        const lFollow = await cleanFetch("latest_follower");
        intel.latestFollower = lFollow || "None";

        const listRes = await cleanFetch("followers?limit=100");
        if (listRes) { intel.followerNames = listRes.split(", ").map(n => n.trim()); }

        intel.avatar = await cleanFetch("avatar");
        intel.age = await cleanFetch("accountage") || "Unknown";
        intel.bio = await cleanFetch("description");
        intel.statusMessage = await cleanFetch("title");
        intel.uptime = await cleanFetch("uptime");
        
        const views = await cleanFetch("viewercount");
        intel.viewers = views || "0";

        const subs = await cleanFetch("subcount");
        intel.subCount = subs || "0";

        intel.chatRules = await cleanFetch("chat_rules");
        intel.channelCreationRaw = await cleanFetch("creation");

        return intel;
    } catch (e) { 
        console.error(`[TWITCH EXCEPTION] Resilient processing caught crash threat for ${username}:`, e.message);
        return intel; 
    }
}

async function isTokenValid(accessToken) {
    try {
        await getUserRegion({ accessToken }, "me");
        return true;
    } catch (e) { return false; }
}

async function getAuthenticated(userKey, npssoInput) {
    let currentUserTokens = tokenStore[userKey] || {};
    const now = Math.floor(Date.now() / 1000);
    
    if (currentUserTokens.accessToken && (currentUserTokens.expiryTime > now + 300)) {
        const isValid = await isTokenValid(currentUserTokens.accessToken);
        if (isValid) {
            diagnosticReport[`${userKey}_active`] = "yes";
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
            diagnosticReport[`${userKey}_active`] = "yes";
            return refreshed;
        } catch (e) { currentUserTokens.refreshToken = null; }
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
            diagnosticReport[`${userKey}_active`] = "yes";
            return auth;
        } catch (e) { 
            console.error(`[AUTH DIAGNOSTIC] Core Key validation failed for entry: ${userKey}.`);
            diagnosticReport[`${userKey}_active`] = "no";
            return null; 
        }
    }
    diagnosticReport[`${userKey}_active`] = "no";
    return null;
}

function processStreamHistory(existingHistory, twitchIntel) {
    let history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    
    if (twitchIntel?.isLive && twitchIntel?.game) {
        const currentGame = twitchIntel.game.trim();
        history = history.filter(g => g.toLowerCase() !== currentGame.toLowerCase());
        history.unshift(currentGame);
        
        if (history.length > 15) history = history.slice(0, 15);
    }
    return history;
}

function generatePrivateProfileFallback(label, userKey, twitchIntel, existingData) {
    const historicalStreamList = processStreamHistory(existingData?.streamHistory, twitchIntel);
    return {
        onlineId: SQUAD_MAP[userKey] || label, 
        online: !!twitchIntel?.isLive,
        accountId: ACCOUNT_IDS[userKey] || "",
        currentGame: twitchIntel?.game || "Dashboard", 
        currentGameArt: twitchIntel?.gameArt || null,
        currentGameActivity: twitchIntel?.statusMessage || (twitchIntel?.isLive ? "Streaming Live" : null),
        amazonAffiliateUrl: generateAffiliateUrl(twitchIntel?.game), 
        bio: twitchIntel?.bio || "Official Pack Member Profile",
        twitch: twitchIntel, 
        streamHistory: historicalStreamList,
        lastUpdated: new Date().toLocaleString(), 
        gamesPlayed: 0, plus: false, level: 0, region: "US", note: "PSN Profile Hidden/Private", devices: [],
        blockedAccountsCount: 0, inboundFriendRequestsCount: 0,
        trophySummary: { platinum: 0, gold: 0, silver: 0, bronze: 0, total: 0, trophyLevel: 0 },
        recentGames: [], activeHunt: null, mostRecentTrophies: [], fullLibrary: [],
        rawPsnDump: { profile: {}, presence: {}, telemetry: [], titles: [], friends: [], hardwareInfo: [], blocksQueue: [], friendRequests: [] }
    };
}

async function getFullUserData(auth, label, userKey, targetId, existingData) {
    const twitchIntel = await getTwitchIntel(TWITCH_MAP[userKey]);
    let resolvedTargetId = targetId;

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
            existingData.streamHistory = processStreamHistory(existingData.streamHistory, twitchIntel);
            existingData.lastUpdated = new Date().toLocaleString();
            return existingData;
        }
        return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData);
    }

    try {
        const profile = await getProfileFromAccountId(auth, resolvedTargetId).catch(() => null);
        
        if (!profile) {
            console.log(`[PRIVACY OVERRIDE] Profile ${label} is hidden. Injecting fallback tracking layers.`);
            return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData);
        }

        let region = { country: "US", language: "en" };
        let friendsList = [];
        let deviceList = [];
        let blockedList = [];
        let inboundFriendRequests = [];
        
        if (ACCOUNT_IDS.werewolf === resolvedTargetId || ACCOUNT_IDS.ray === resolvedTargetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try { friendsList = await getUserFriendsAccountIds(auth, "me") || []; } catch(e) {}
            try { deviceList = await getAccountDevices(auth) || []; } catch(e) {}
            try { blockedList = await getUserBlockedAccountIds(auth) || []; } catch(e) {}
            try { inboundFriendRequests = await getUserFriendsRequests(auth) || []; } catch(e) {}
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
        let activeCommId = activeGameInfo.npCommunicationId;

        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game : (activeGameInfo.titleName || "Dashboard");

        if (!activeCommId && resolvedTitle !== "Dashboard") {
            const matchByName = Array.from(mergedGamesMap.values()).find(g =>
                g.name.toLowerCase().replace(/®|™/g, "").trim() === resolvedTitle.toLowerCase().replace(/®|™/g, "").trim()
            );
            if (matchByName) activeCommId = matchByName.npCommunicationId;
        }

        if (activeCommId && !mergedGamesMap.has(activeCommId)) {
            mergedGamesMap.set(activeCommId, {
                npCommunicationId: activeCommId, name: resolvedTitle !== "Dashboard" ? resolvedTitle : "Unknown Game",
                art: null, playCount: 1, lastPlayed: new Date().toISOString(),
                progress: 0, earnedTotal: 0, definedTotal: 0, npServiceName: "trophy2"
            });
        }

        const allRecentGames = Array.from(mergedGamesMap.values()).sort((a, b) => {
            if (activeCommId) {
                if (a.npCommunicationId === activeCommId) return -1;
                if (b.npCommunicationId === activeCommId) return 1;
            }
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        if (resolvedTitle === "Dashboard" && allRecentGames.length > 0) {
            resolvedTitle = allRecentGames[0].name;
            activeCommId = allRecentGames[0].npCommunicationId || activeCommId;
        }

        const matchedGame = allRecentGames.find(g => {
            if (activeCommId && g.npCommunicationId === activeCommId) return true;
            const cleanGameName = g.name.replace(/®|™/g, "").toLowerCase().trim();
            const cleanActiveName = resolvedTitle.replace(/®|™/g, "").toLowerCase().trim();
            return cleanGameName === cleanActiveName && cleanActiveName !== "";
        }) || allRecentGames[0] || {};

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        
        const recentGames = [];
        let activeHunt = null;
        let mostRecentTrophies = [];

        const targetSyncId = activeCommId || matchedGame.npCommunicationId || allRecentGames[0]?.npCommunicationId;

        let gamesToDeepScan = 20;

        for (const game of allRecentGames.slice(0, 30)) { 
            if (BLACKLIST.some(f => game.name.toLowerCase().includes(f))) continue;
            
            const recentGameRef = {
                ...game,
                name: game.name, 
                art: game.art, 
                progress: game.progress, 
                ratio: `${game.earnedTotal}/${game.definedTotal}`, 
                amazonAffiliateUrl: generateAffiliateUrl(game.name),
                npCommunicationId: game.npCommunicationId, 
                lastPlayed: game.lastPlayed,
                bootCount: game.playCount || "Unknown"
            };

            if (recentGames.length < 6) { recentGames.push(recentGameRef); }

            const isTargetHunt = (game.npCommunicationId === targetSyncId);
            
            if (gamesToDeepScan > 0 || isTargetHunt) {
                if (!isTargetHunt) gamesToDeepScan--;
                
                try {
                    await sleep(50); // Sony Safety Buffer
                    
                    let opt = game.npServiceName ? { npServiceName: game.npServiceName } : { npServiceName: "trophy" };
                    let groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>null);
                    
                    if (!groupsRes && !game.npServiceName) {
                        opt.npServiceName = "trophy2";
                        groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>({}));
                    } else { groupsRes = groupsRes || {}; }

                    const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, game.npCommunicationId, "all", opt).catch(()=>({}));
                    const metaRes = await getTitleTrophies(auth, game.npCommunicationId, "all", opt).catch(()=>({}));
                    
                    const trophyGroups = groupsRes?.trophyGroups || [];
                    const earnedStatus = earnedRes?.trophies || [];
                    const meta = metaRes?.trophies || [];

                    if (meta.length > 0 && game.definedTotal === 0) {
                        game.definedTotal = meta.length;
                        recentGameRef.ratio = `${game.earnedTotal}/${game.definedTotal}`;
                    }
                    
                    const mappedTrophies = meta.map(m => {
                        const s = earnedStatus.find(x => x.trophyId === m.trophyId);
                        const group = trophyGroups.find(g => g.trophyGroupId === m.trophyGroupId);
                        return { 
                            ...m,
                            name: m.trophyName || "Unknown", type: m.trophyType, icon: m.trophyIconUrl, description: m.trophyDetail || "Secret Objective",
                            rarity: m.trophyRare ? m.trophyRare + "%" : "Rare", earnedRate: m.trophyEarnedRate || "0.0",
                            hidden: m.trophyHidden || false,
                            groupName: group?.trophyGroupName || "Base Game", earned: s?.earned || false, 
                            earnedDate: s?.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString() : null,
                            earnedAge: s?.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                            timestamp: s?.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                            currentValue: s?.progress || 0, targetValue: m.trophyProgressTargetValue || 0
                        };
                    });

                    mappedTrophies.filter(t => t.earned).forEach(t => {
                        mostRecentTrophies.push({ game: game.name, name: t.name, icon: t.icon, timestamp: t.timestamp, date: t.earnedDate, age: t.earnedAge });
                    });

                    if (isTargetHunt) {
                        const groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, resolvedTargetId, game.npCommunicationId, opt).catch(()=>({}));
                        const earnedTrophiesOnly = mappedTrophies.filter(t => t.earned).sort((a,b) => a.timestamp - b.timestamp);
                        const firstBlood = earnedTrophiesOnly[0]?.timestamp || null;
                        const lastPop = earnedTrophiesOnly[earnedTrophiesOnly.length - 1]?.timestamp || null;
                        
                        let speedString = "N/A";
                        let persona = "Steady Hunter"; 

                        if (firstBlood && lastPop) {
                            const days = Math.ceil((lastPop - firstBlood) / (1000 * 60 * 60 * 24));
                            speedString = days === 0 ? "Started Today" : `${days} day${days > 1 ? 's' : ''}`;
                            if (days <= 10 && game.progress >= 50) persona = "Dead Set Hunter";
                            else if (days <= 14 && game.progress >= 80) persona = "Apex Predator";
                            else if (days > 30) persona = "Casual Pursuit";
                        }

                        activeHunt = { 
                            title: game.name, amazonAffiliateUrl: generateAffiliateUrl(game.name),
                            progress: game.progress,
                            velocity: {
                                firstEarned: earnedTrophiesOnly[0]?.earnedDate || "Not Started",
                                huntingDuration: speedString,
                                hunterPersona: persona,
                                completionStatus: `${game.earnedTotal}/${game.definedTotal}`
                            },
                            groups: (groupEarningsRes?.trophyGroups || []).map(g => {
                                const gm = trophyGroups.find(tg => tg.trophyGroupId === g.trophyGroupId);
                                const gMax = (gm?.definedTrophies?.platinum || 0) + (gm?.definedTrophies?.gold || 0) + (gm?.definedTrophies?.silver || 0) + (gm?.definedTrophies?.bronze || 0);
                                return { ...g, ...gm, name: gm?.trophyGroupName || "Expansion Pack", progress: g.progress || 0, ratio: `${((g.earnedTrophies?.platinum||0) + (g.earnedTrophies?.gold||0) + (g.earnedTrophies?.silver||0) + (g.earnedTrophies?.bronze||0))}/${gMax}` };
                            }),
                            trophies: mappedTrophies, npCommunicationId: game.npCommunicationId
                        };
                    }
                } catch (e) { console.error(`[WARN] Trophy scan skipped for ${game.name}: ${e.message}`); }
            }
        }

        mostRecentTrophies = mostRecentTrophies.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
        const lastTrophyTime = mostRecentTrophies[0]?.timestamp || 0;
        const proofOfLife = (Date.now() - lastTrophyTime) < 1200000;

        const presence = {
            online: (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline" || !!twitchIntel?.isLive || proofOfLife,
            currentGame: resolvedTitle,
            currentGameArt: matchedGame.art || twitchIntel?.gameArt || allRecentGames[0]?.art || null,
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (proofOfLife ? "Active Hunting" : null) || (twitchIntel?.isLive ? "Streaming Live" : null),
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            currentCommunicationId: matchedGame.npCommunicationId || null,
            platform: rawP.primaryPlatformInfo?.platform?.toUpperCase() || "PS5",
            twitch: twitchIntel
        };

        const historicalStreamList = processStreamHistory(existingData?.streamHistory, twitchIntel);

        return {
            ...profile, onlineId: profile?.onlineId || label, accountId: resolvedTargetId,
            ...presence, gamesPlayed: totalGamesPlayedCount,
            avatar: profile?.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || "", 
            bio: twitchIntel?.bio || profile?.aboutMe || "Official Pack Member Profile", psnAccountAge: calculateAgeString(earliestEntry), 
            earliestTrophyDate: earliestEntry,
            latestTrophyDate: mostRecentTrophies[0]?.timestamp || new Date().getTime(),
            plus: !!profile?.isPlus, level: stats?.trophyLevel || 0, region: region?.country || "US",
            trophySummary: { 
                ...stats, platinum: stats?.earnedTrophies?.platinum||0, gold: stats?.earnedTrophies?.gold||0,
                silver: stats?.earnedTrophies?.silver||0, bronze: stats?.earnedTrophies?.bronze||0,
                total: (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0)
            },
            recentGames, activeHunt, mostRecentTrophies, streamHistory: historicalStreamList,
            fullLibrary: allRecentGames, devices: deviceList, blockedAccountsCount: blockedList.length, inboundFriendRequestsCount: inboundFriendRequests.length,
            rawPsnDump: { profile: profile, presence: rawP, telemetry: telemetryData, titles: sortedTitles, friends: friendsList, hardwareInfo: deviceList, blocksQueue: blockedList, friendRequests: inboundFriendRequests },
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.warn(`[WARN] Critical error encountered fetching ${label}. Emitting private schema wrapper.`);
        return generatePrivateProfileFallback(label, userKey, twitchIntel, existingData);
    }
}

async function fetchFromFirebase() {
    console.log("[FIREBASE] Fetching current state from Realtime Database...");
    try {
        const response = await fetch(FIREBASE_RTDB_URL);
        if (!response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.warn("[FIREBASE WARN] Could not fetch previous state from Firebase:", err.message);
        return {};
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
    } catch (err) { console.error("[FIREBASE ERROR] Failed database push:", err.message); }
}

async function main() {
    console.log("[INIT] Starting Absolute Master Omni-Collector v14.5.2 (Stateless Firebase Engine)...");
    
    if (Date.now() >= 1785542400000) {
        console.warn("\n=======================================================");
        console.warn("🚨 AUTOMATED SYSTEM ALERT: AUGUST 2026 DEPRECATION WINDOW 🚨");
        console.warn("=======================================================\n");
    }

    // Pull current state directly from Firebase REST API
    const previousFirebaseData = await fetchFromFirebase();

    let finalData = { 
        users: previousFirebaseData.users || {}, 
        personas: {}, 
        mutualSquadFollowers: [], 
        authDiagnostics: diagnosticReport,
        lastGlobalUpdate: new Date().toLocaleString(), 
        engineVersion: "14.5.2",
        codeTimestamp: "Wednesday, July 22, 2026 | 3:47 AM EDT"
    };

    const wolfAuth = await getAuthenticated("werewolf", process.env.PSN_NPSSO_WEREWOLF);
    const rayAuth = await getAuthenticated("ray", process.env.PSN_NPSSO_RAY);
    const masterAuth = wolfAuth || rayAuth;

    finalData.authDiagnostics = diagnosticReport;

    for (const [key, label] of Object.entries(SQUAD_MAP)) {
        const accountId = ACCOUNT_IDS[key];
        const agentAuth = (key === 'ray' && rayAuth) ? rayAuth : (key === 'werewolf' && wolfAuth) ? wolfAuth : masterAuth;
        const data = await getFullUserData(agentAuth, label, key, accountId, finalData.users[key]);
        if (data) finalData.users[key] = data;
    }

    for (const [realName, keys] of Object.entries(PERSONA_CONFIG)) {
        const linkedAccounts = keys.map(k => finalData.users[k]).filter(u => !!u);
        if (linkedAccounts.length === 0) continue;

        const totalPlats = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.platinum || 0), 0);
        const totalGolds = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.gold || 0), 0);
        const totalSilvers = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.silver || 0), 0);
        const totalBronzes = linkedAccounts.reduce((sum, u) => sum + (u.trophySummary?.bronze || 0), 0);
        const maxLevel = Math.max(...linkedAccounts.map(u => u.level || 0));
        const isOnline = linkedAccounts.some(u => u.online);
        
        const allStartTimes = linkedAccounts.map(u => new Date(u.earliestTrophyDate).getTime()).filter(t => !isNaN(t));
        const allEndTimes = linkedAccounts.map(u => u.latestTrophyDate).filter(t => !!t);
        
        const absoluteStart = allStartTimes.length > 0 ? Math.min(...allStartTimes) : null;
        const absoluteEnd = allEndTimes.length > 0 ? Math.max(...allEndTimes) : new Date().getTime();
        
        const activeAccount = linkedAccounts.find(u => u.online) || linkedAccounts[0];

        let combinedStreams = [];
        linkedAccounts.forEach(acc => {
            if (acc && Array.isArray(acc.streamHistory)) {
                acc.streamHistory.forEach(str => {
                    if (!combinedStreams.includes(str)) combinedStreams.push(str);
                });
            }
        });

        finalData.personas[realName] = {
            displayName: realName,
            isOnline,
            primaryOnlineId: activeAccount.onlineId,
            combinedTrophies: {
                platinum: totalPlats, gold: totalGolds, silver: totalSilvers, bronze: totalBronzes,
                total: totalPlats + totalGolds + totalSilvers + totalBronzes
            },
            maxLevel,
            legacyAge: calculateAgeString(absoluteStart, absoluteEnd),
            legacyRange: { start: absoluteStart ? new Date(absoluteStart).toLocaleString() : "Unknown", end: new Date(absoluteEnd).toLocaleString() },
            currentGame: activeAccount.currentGame,
            currentGameArt: activeAccount.currentGameArt,
            currentActivity: activeAccount.currentGameActivity,
            avatar: activeAccount.avatar,
            bio: activeAccount.bio,
            accounts: keys,
            streamHistory: combinedStreams.slice(0, 15),
            lastUpdated: new Date().toLocaleString()
        };
    }

    const lists = Object.values(finalData.users).map(u => u.twitch?.followerNames || []).filter(l => l.length > 0);
    if (lists.length > 1) {
        const frequencyMap = {};
        lists.flat().forEach(name => { frequencyMap[name] = (frequencyMap[name] || 0) + (typeof name === 'string' ? 1 : 0); });
        finalData.mutualSquadFollowers = Object.entries(frequencyMap).filter(([name, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ username: name, sharedConnections: count }));
    }

    // Stream updated payload directly to Firebase RTDB
    await pushToFirebase(finalData);
    console.log(`[SUCCESS] Persona Aggregator v14.5.2 Stateless Execution Complete.`);
}

main();
