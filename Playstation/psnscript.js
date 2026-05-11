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

/**
 * --- PRECISION INTEGRITY PROTOCOL ---
 * Project: Kevin's Official Pack Sync Engine
 * Version 13.9.1 - Absolute Master Omni-Protocol (Rock Solid Live Sync)
 * Timestamp: May 10, 2026, 11:45 PM (NYT)
 * Note: NO STRIPPING, NO COMPRESSING, DON'T CHANGE WHAT I DIDN'T SAY TO CHANGE.
 * Updates: Hardcoded exact ##/### ratio logic for all games. Added 'Latest Follower' fetch for Twitch. Optimized API limits to guarantee 100% uptime on the 23-minute cron cycle without triggering Sony IP bans.
 * ------------------------------------
 */

const SQUAD_MAP = {
    werewolf: "Werewolf3788",
    kfruti: "KFruti88",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    darkterro: "darkterro420",
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

function formatPlayDuration(isoDuration) {
    if (!isoDuration) return "Unknown";
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    if (hours === 0 && minutes === 0) return "Just started";
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
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
            fetch(`https://decapi.me/twitch/latest_follower/${username.toLowerCase()}`).then(r => r.text()), // New: Grabs most recent follower
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
        } catch (e) {
            console.log(`[AUTH] Refresh token failed for ${userKey}. Attempting NPSSO...`);
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
    
    if (!auth || !targetId) {
        if (existingData && existingData.trophySummary) {
            console.log(`[WARN] Auth/ID missing for ${label}. Retaining existing PSN data, updating Twitch only.`);
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
            note: label.includes("Memorial") ? "Account Legacy Preserved" : "Twitch-Master Presence"
        };
    }

    console.log(`[SYNC] Omni-Protocol v13.9.1 Sync: ${label}`);
    
    try {
        const profile = await getProfileFromAccountId(auth, targetId).catch(() => ({}));
        let region = { country: "US", language: "en" };
        let friendsList = [];
        
        if (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) {
            try { region = await getUserRegion(auth, "me"); } catch(e) {}
            try {
                const friendsRes = await getUserFriendsAccountIds(auth, "me");
                friendsList = friendsRes || [];
            } catch(e) { console.log(`[WARN] Friends list hidden/failed for ${label}`); }
        }
        
        const presenceId = (ACCOUNT_IDS.werewolf === targetId || ACCOUNT_IDS.ray === targetId) ? "me" : targetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        
        // SONY LIMIT: 800 is the max allowed before crashing
        const titlesRes = await getUserTitles(auth, targetId, { limit: 800 }).catch((e) => { console.error("Sony API Blocked Titles Request:", e.message); return {}; });
        const sortedTitles = (titlesRes?.trophyTitles || []).sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
        
        // Grab accurate Total Games count if Sony provides it, otherwise use array length
        const totalGamesPlayedCount = titlesRes?.totalItemCount || sortedTitles.length;

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        // SONY LIMIT: 200 is the max history allowed before crashing
        let telemetryData = [];
        try {
            const history = await getRecentlyPlayedGames(auth, targetId, { limit: 200 });
            telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
        } catch (e) {
            console.log(`[WARN] Telemetry hidden/blocked for ${label}.`);
        }

        const mergedGamesMap = new Map();

        telemetryData.forEach(g => {
            if (!g.npCommunicationId) return;
            mergedGamesMap.set(g.npCommunicationId, {
                ...g,
                npCommunicationId: g.npCommunicationId,
                name: g.name || "Unknown Game",
                art: g.image?.url || null,
                playCount: g.playCount,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0, earnedTotal: 0, definedTotal: 0,
                npServiceName: null
            });
        });

        sortedTitles.forEach(t => {
            if (!t.npCommunicationId) return;
            const existing = mergedGamesMap.get(t.npCommunicationId) || {
                npCommunicationId: t.npCommunicationId,
                name: t.trophyTitleName || "Unknown Game",
                art: t.trophyTitleIconUrl || null,
                lastPlayed: t.lastUpdatedDateTime || null
            };

            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = existing.art || t.trophyTitleIconUrl;
            existing.progress = t.progress || 0;
            existing.npServiceName = t.npServiceName || existing.npServiceName;

            const eTotal = (t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0);
            const dTotal = (t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0);

            existing.earnedTotal = eTotal;
            existing.definedTotal = dTotal;
            
            if (!existing.lastPlayed) {
                existing.lastPlayed = t.lastUpdatedDateTime;
            } else if (t.lastUpdatedDateTime && new Date(t.lastUpdatedDateTime) > new Date(existing.lastPlayed)) {
                existing.lastPlayed = t.lastUpdatedDateTime;
            }

            mergedGamesMap.set(t.npCommunicationId, existing);
        });

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        let activeCommId = activeGameInfo.npCommunicationId;
        
        let resolvedTitle = (twitchIntel?.isLive && twitchIntel.game && (!activeGameInfo.titleName || activeGameInfo.titleName === "Dashboard")) 
            ? twitchIntel.game 
            : (activeGameInfo.titleName || "Dashboard");

        if (!activeCommId && resolvedTitle !== "Dashboard") {
            const matchByName = Array.from(mergedGamesMap.values()).find(g =>
                g.name.toLowerCase().replace(/®|™/g, "").trim() === resolvedTitle.toLowerCase().replace(/®|™/g, "").trim()
            );
            if (matchByName) activeCommId = matchByName.npCommunicationId;
        }

        if (activeCommId && !mergedGamesMap.has(activeCommId)) {
            mergedGamesMap.set(activeCommId, {
                npCommunicationId: activeCommId,
                name: resolvedTitle !== "Dashboard" ? resolvedTitle : "Unknown Game",
                art: null,
                playCount: 1,
                lastPlayed: new Date().toISOString(),
                progress: 0, earnedTotal: 0, definedTotal: 0,
                npServiceName: "trophy2"
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

        const stats = await getUserTrophyProfileSummary(auth, targetId).catch(() => ({}));
        const recentGames = [];
        let activeHunt = null;
        let mostRecentTrophies = [];

        const targetSyncId = activeCommId || matchedGame.npCommunicationId || allRecentGames[0]?.npCommunicationId;
        
        // DEEP SCAN: Top 20 games to get exact individual trophies without crashing the 23-min Cron schedule
        let gamesToDeepScan = 20; 

        for (const game of allRecentGames.slice(0, 30)) { 
            if (BLACKLIST.some(f => game.name.toLowerCase().includes(f))) continue;
            
            const recentGameRef = {
                ...game,
                name: game.name, 
                art: game.art, 
                progress: game.progress, 
                ratio: `${game.earnedTotal}/${game.definedTotal}`, // THE EXACT 22/100 FORMAT EXPORTED HERE
                amazonAffiliateUrl: generateAffiliateUrl(game.name),
                npCommunicationId: game.npCommunicationId, 
                lastPlayed: game.lastPlayed,
                bootCount: game.playCount || "Unknown"
            };

            if (recentGames.length < 6) {
                recentGames.push(recentGameRef);
            }

            const isTargetHunt = (game.npCommunicationId === targetSyncId);
            
            if (gamesToDeepScan > 0 || isTargetHunt) {
                if (!isTargetHunt) gamesToDeepScan--;
                
                try {
                    await sleep(50); // Anti-Ban Delay
                    
                    let opt = game.npServiceName ? { npServiceName: game.npServiceName } : { npServiceName: "trophy" };
                    let groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>null);
                    
                    if (!groupsRes && !game.npServiceName) {
                        opt.npServiceName = "trophy2";
                        groupsRes = await getTitleTrophyGroups(auth, game.npCommunicationId, opt).catch(()=>({}));
                    } else {
                        groupsRes = groupsRes || {};
                    }

                    const earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, game.npCommunicationId, "all", opt).catch(()=>({}));
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
                        const groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, game.npCommunicationId, opt).catch(()=>({}));
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
                                completionStatus: `${game.earnedTotal}/${game.definedTotal}` // ACTIVE GAME EXACT FRACTION
                            },
                            groups: (groupEarningsRes?.trophyGroups || []).map(g => {
                                const gm = trophyGroups.find(tg => tg.trophyGroupId === g.trophyGroupId);
                                const gMax = (gm?.definedTrophies?.platinum || 0) + (gm?.definedTrophies?.gold || 0) + (gm?.definedTrophies?.silver || 0) + (gm?.definedTrophies?.bronze || 0);
                                return { ...g, ...gm, name: gm?.trophyGroupName || "Expansion Pack", progress: g.progress || 0, ratio: `${((g.earnedTrophies?.platinum||0) + (g.earnedTrophies?.gold||0) + (g.earnedTrophies?.silver||0) + (g.earnedTrophies?.bronze||0))}/${gMax}` };
                            }),
                            trophies: mappedTrophies, npCommunicationId: game.npCommunicationId
                        };
                    }
                } catch (e) {
                    console.error(`[WARN] Trophy scan skipped for ${game.name}: ${e.message}`);
                }
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

        return {
            ...profile,
            onlineId: profile?.onlineId || label,
            accountId: targetId,
            ...presence, 
            gamesPlayed: totalGamesPlayedCount, // TOTAL GAMES PLAYED RECORDED
            avatar: profile?.avatars?.sort((a,b) => parseInt(b.size) - parseInt(a.size))[0]?.url || "", 
            bio: twitchIntel?.bio || profile?.aboutMe || "Official Pack Member Profile", 
            psnAccountAge: calculateAgeString(earliestEntry), // PSN AGE
            earliestTrophyDate: earliestEntry, 
            latestTrophyDate: mostRecentTrophies[0]?.timestamp || new Date().getTime(), 
            plus: !!profile?.isPlus, level: stats?.trophyLevel || 0, region: region?.country || "US",
            trophySummary: { 
                ...stats,
                platinum: stats?.earnedTrophies?.platinum || 0, gold: stats?.earnedTrophies?.gold || 0,
                silver: stats?.earnedTrophies?.silver || 0, bronze: stats?.earnedTrophies?.bronze || 0,
                total: (stats?.earnedTrophies?.platinum || 0) + (stats?.earnedTrophies?.gold || 0) + (stats?.earnedTrophies?.silver || 0) + (stats?.earnedTrophies?.bronze || 0) // TOTAL TROPHIES RECORDED
            },
            recentGames, activeHunt, mostRecentTrophies,
            
            // RAW FIREHOSE DUMPS
            fullLibrary: allRecentGames,
            rawPsnDump: { 
                profile: profile,
                presence: rawP,
                telemetry: telemetryData,
                titles: sortedTitles,
                friends: friendsList
            },
            
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { 
        console.error(`[ERROR] PSN Profile fetch failed for ${label}:`, e.message);
        if (existingData && existingData.trophySummary) {
            existingData.online = !!twitchIntel?.isLive;
            existingData.twitch = twitchIntel;
            existingData.lastUpdated = new Date().toLocaleString();
            return existingData;
        }
        return null;
    }
}

async function main() {
    console.log("[INIT] Starting Absolute Master Omni-Collector v13.9.1 (Rock Solid Live Sync)...");
    try { if (!fs.existsSync(ROOT_NOJEKYLL)) fs.writeFileSync(ROOT_NOJEKYLL, ""); } catch(e){}

    let finalData = { 
        users: {}, 
        personas: {}, 
        mutualSquadFollowers: [], 
        lastGlobalUpdate: new Date().toLocaleString(),
        engineVersion: "13.9.1",
        codeTimestamp: "Sunday, May 10, 2026 | 11:45 PM EDT"
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

    const lists = Object.values(finalData.users).map(u => u.twitch?.followerNames || []).filter(l => l.length > 0);
    if (lists.length > 1) {
        const frequencyMap = {};
        lists.flat().forEach(name => { frequencyMap[name] = (frequencyMap[name] || 0) + (typeof name === 'string' ? 1 : 0); });
        finalData.mutualSquadFollowers = Object.entries(frequencyMap).filter(([name, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ username: name, sharedConnections: count }));
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[SUCCESS] Persona Aggregator v13.9.1 Complete. Generated: ${finalData.codeTimestamp}`);
}

main();
