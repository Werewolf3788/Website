/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Master PSN Telemetry & Deep Catalog Ingestion Engine with 
 * Dynamic Multi-User Squad Failover & RTDB Credential Scanning.
 * Version: 67.0.0 - Dynamic Multi-User /user_secrets/ Fallback Chain
 * Date & Time Stamp: 2026-10-30 04:15:00 (America/New_York)
 * ============================================================================ */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
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
    getUserBlockedAccountIds,
    getUserFriendsRequests,
    getAccountDevices,
    getProfileShareableLink,
    getUserPlayedGames,
    getPurchasedGames
} = psnApi;

const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const RTDB_ROOT_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const ENGINE_VERSION = "67.0.0";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const AMAZON_TAG = "moviesanywhere02-20";

let tokenStore = {};

let diagnosticReport = {
    active_runner: "UNCHECKED",
    buffer_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

const PULL_CONFIG = {
    SKELETON_REFRESH_RECENT_TITLES: 20,
    PROGRESS_REFRESH_RECENT_TITLES: 10,
    BACKFILL_NEW_TITLES_PER_RUN: 40,
    MOST_RECENT_TROPHIES_KEPT: 250,
    PAGE_SIZE_TITLES: 800,
    PAGE_SIZE_PLAYED: 200,
    PAGE_SIZE_LIBRARY: 100,
    PAGE_SIZE_PURCHASED: 100,
    PAGE_SIZE_FRIENDS: 1000,
    MAX_PAGES: 50,
    FRIEND_LOOKUPS_PER_RUN: 40,
    FRIEND_RETRY_UNRESOLVED_MS: 7 * 24 * 3600 * 1000,
    REQUEST_GAP_MS: 120,
    RETRIES: 2,
    PREFER_SONY_PLAYTIME: true,
    ARCHIVE_RAW: true
};

const apiStats = { calls: 0, failures: 0, errorsByLabel: {}, missingExports: [] };
let friendsDirectoryCache = {};
let friendsDirectoryDirty = false;
let friendLookupsThisRun = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callPsn(label, fn, fallback = null) {
    if (typeof fn !== "function") {
        if (!apiStats.missingExports.includes(label)) {
            apiStats.missingExports.push(label);
            console.warn(`[EXPORT MISSING] ${label} is not provided by the installed psn-api.`);
        }
        return fallback;
    }
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            apiStats.calls++;
            const res = await fn();
            return res === undefined ? fallback : res;
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|too many requests|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                const waitMs = 5000 * (attempt + 1);
                console.warn(`[RATE LIMIT] ${label} hit 429. Waiting ${waitMs}ms (retry ${attempt + 1}/${PULL_CONFIG.RETRIES})...`);
                await sleep(waitMs);
                continue;
            }
            if (/is not a function|is not defined/i.test(msg) && !apiStats.missingExports.includes(label)) {
                apiStats.missingExports.push(label);
                console.warn(`[EXPORT MISSING] ${label} is not provided by the installed psn-api.`);
            }
            apiStats.failures++;
            const entry = apiStats.errorsByLabel[label] || { count: 0, last: "" };
            entry.count++;
            entry.last = msg.slice(0, 300);
            apiStats.errorsByLabel[label] = entry;
            if (entry.count === 1) console.warn(`[API FAIL] ${label}: ${msg}`);
            return fallback;
        }
    }
    return fallback;
}

function pickList(res, paths) {
    for (const p of paths) {
        const val = p.split(".").reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), res);
        if (Array.isArray(val)) return val;
    }
    return [];
}

async function paginateCollect(label, fetchPage, extractItems, pageSize) {
    const items = [];
    const pagesRaw = [];
    let offset = 0;
    let lastSig = null;
    for (let page = 0; page < PULL_CONFIG.MAX_PAGES; page++) {
        const res = await callPsn(label, () => fetchPage(offset, pageSize), null);
        if (!res) break;
        const batch = extractItems(res) || [];
        if (batch.length === 0) break;
        const sig = JSON.stringify(batch[0]);
        if (sig === lastSig) break;
        lastSig = sig;
        pagesRaw.push(res);
        items.push(...batch);
        offset += batch.length;
        const total = res?.totalItemCount ?? res?.totalResults ?? null;
        if (total !== null && total !== undefined && items.length >= total) break;
    }
    return { items, pagesRaw };
}

function normalizeTitleName(name = "") {
    return String(name || "")
        .toLowerCase()
        .replace(/®|™|©/g, "")
        .replace(/\btrophies\b|\btrophy set\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const TROPHY_RARITY_LABELS = { 0: "Ultra Rare", 1: "Very Rare", 2: "Rare", 3: "Common" };
function trophyRarityLabel(n) {
    if (n === null || n === undefined) return null;
    return TROPHY_RARITY_LABELS[n] || null;
}

async function archiveRaw(onlineId, key, payload) {
    if (!PULL_CONFIG.ARCHIVE_RAW || !onlineId || payload === undefined || payload === null) return;
    await syncNodeToFirebase(`raw/${onlineId}/${key}`, payload);
}

async function resolveFriendDirectory(auth, accountIds = []) {
    const now = Date.now();
    for (const id of accountIds) {
        const key = String(id);
        const cached = friendsDirectoryCache[key];
        if (cached) {
            const stillFresh = !cached.unresolved || (now - new Date(cached.resolvedAt || 0).getTime() < PULL_CONFIG.FRIEND_RETRY_UNRESOLVED_MS);
            if (stillFresh) continue;
        }
        if (friendLookupsThisRun >= PULL_CONFIG.FRIEND_LOOKUPS_PER_RUN) break;
        friendLookupsThisRun++;
        const p = await callPsn("getProfileFromAccountId(friend)", () => getProfileFromAccountId(auth, key), null);
        friendsDirectoryCache[key] = p
            ? {
                accountId: key,
                onlineId: p.onlineId || null,
                avatar: p.avatars?.[0]?.url || null,
                isPlus: !!p.isPlus,
                aboutMe: p.aboutMe || null,
                resolvedAt: new Date().toISOString()
            }
            : { accountId: key, onlineId: null, unresolved: true, resolvedAt: new Date().toISOString() };
        friendsDirectoryDirty = true;
    }
}

function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    v = v.replace(/^["'\s]+|["'\s]+$/g, "");
    return v.length >= 20 ? v : "";
}

function readUserPsnCredentials(emailKey, userRecord, secretsRecord) {
    const u = (userRecord && typeof userRecord === "object") ? userRecord : {};
    const gaming = (u.gaming_platforms && typeof u.gaming_platforms === "object") ? u.gaming_platforms : {};
    const secrets = (secretsRecord && typeof secretsRecord === "object") ? secretsRecord : {};
    const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "");

    const accountIdRaw = pick(u.psn_account_id, gaming.psn_account_id, secrets.psn_account_id);
    const tagRaw = pick(u.psn_username, gaming.psn_username, u.psn_online_id);
    const npssoRaw = pick(secrets.psn_npsso, u.psn_npsso, gaming.psn_npsso);

    return {
        emailKey,
        accountId: accountIdRaw !== undefined ? String(accountIdRaw).trim() : null,
        tag: tagRaw !== undefined ? String(tagRaw).trim() : "",
        npsso: normalizeNpsso(npssoRaw !== undefined ? String(npssoRaw) : "")
    };
}

async function writeUserPsnStatus(emailKey, fields, currentRecord) {
    const current = (currentRecord && typeof currentRecord === "object") ? currentRecord : {};
    const changed = {};
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined || v === null) continue;
        if (current[k] !== v) changed[k] = v;
    }
    if (Object.keys(changed).length === 0) return;
    try {
        await resilientFetch(buildRtdbUrl(`/users/${emailKey}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changed)
        });
    } catch (err) {
        console.warn(`[USER STATUS WARN] Could not write PSN status for ${emailKey}: ${err.message}`);
    }
}

async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    if (typeof fetch !== "undefined") {
        try {
            return await fetch(url, options);
        } catch (fetchErr) {}
    }

    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const headers = options.headers || {};
            if (options.body && !headers["Content-Length"]) {
                headers["Content-Length"] = Buffer.byteLength(options.body);
            }

            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: options.method || "GET",
                headers: headers
            };

            const req = client.request(reqOptions, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        text: async () => data,
                        json: async () => {
                            try { return JSON.parse(data || "{}"); } catch (e) { return {}; }
                        }
                    });
                });
            });

            req.on("error", (err) => reject(err));
            if (options.body) req.write(options.body);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

function buildRtdbUrl(pathWithLeadingSlash) {
    const secret = process.env.FIREBASE_AUTH_SECRET;
    const authQuery = secret ? `?auth=${encodeURIComponent(secret)}` : "";
    return `${RTDB_ROOT_URL}${pathWithLeadingSlash}.json${authQuery}`;
}

async function fetchFromFirebase(endpointPath = "") {
    try {
        const fullUrl = buildRtdbUrl(`/psn${endpointPath ? '/' + endpointPath : ''}`);
        const response = await resilientFetch(fullUrl);
        if (!response || !response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        return {};
    }
}

async function syncNodeToFirebase(endpointPath, payload) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {}
}

async function deleteNodeFromFirebase(endpointPath) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        await resilientFetch(targetUrl, { method: "DELETE" });
    } catch (err) {}
}

function extractConceptIdFromText(text = "") {
    if (!text || typeof text !== "string") return null;
    const match = text.match(/concept\/(\d+)/i);
    return match ? match[1] : null;
}

function parseStoreHtmlFeatures(html) {
    const badges = [];
    const accessibility = {};
    let currentCategory = "General";

    const badgeRegex = /<li[^>]*data-qa="gameInfo#releaseInformation#gameBadges#item[^>]*>([\s\S]*?)<\/li>/gi;
    let badgeMatch;
    while ((badgeMatch = badgeRegex.exec(html)) !== null) {
        const clean = badgeMatch[1].replace(/<[^>]*>/g, "").trim();
        if (clean && !badges.includes(clean)) badges.push(clean);
    }

    return { badges, accessibility };
}

async function queryStoreMetadata(identifier, isProductSku = false) {
    if (!identifier) return null;
    try {
        const pathType = isProductSku ? "product" : "concept";
        const storeUrl = `https://store.playstation.com/en-us/${pathType}/${identifier}`;
        const response = await resilientFetch(storeUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        if (!response || !response.ok) return null;
        const html = await response.text();
        const parsedFeatures = parseStoreHtmlFeatures(html);
        return {
            conceptId: isProductSku ? null : String(identifier),
            productId: isProductSku ? String(identifier) : null,
            badges: parsedFeatures.badges,
            accessibility: parsedFeatures.accessibility
        };
    } catch (e) {
        return null;
    }
}

async function searchStoreConceptByName(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    try {
        const cleanQuery = encodeURIComponent(gameName.replace(/®|™/g, "").trim());
        const searchApiUrl = `https://web.np.playstation.com/api/graphql/v1/op?operationName=getSearchResults&variables=%7B%22searchTerm%22%3A%22${cleanQuery}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22d77d9a513cbdba90e2908f4c17c4613271789721d15c7e0d37e6f3b7d7b0b63e%22%7D%7D`;
        const res = await resilientFetch(searchApiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res || !res.ok) return null;
        const data = await res.json();
        const item = data?.data?.universalSearch?.results?.[0];
        return item ? (item.id || extractConceptIdFromText(item.url)) : null;
    } catch (e) {
        return null;
    }
}

function parseDetailedHardwareContext(rawPresence, matchedGame = {}) {
    const primaryInfo = rawPresence?.primaryPlatformInfo || {};
    const rawPlatform = (primaryInfo.platform || rawPresence?.platform || "").toUpperCase();
    let activeHardware = rawPlatform.includes("PS5") ? "PS5" : (rawPlatform.includes("PS4") ? "PS4" : (matchedGame?.platform || "PS5"));
    return {
        activeHardware,
        gameBuildVersion: activeHardware === "PS5" ? "PS5 Native Game" : "PS4 Native Game",
        displayPlatformLabel: activeHardware
    };
}

function normalizePlatform(game) {
    const raw = (game?.trophyTitlePlatform || game?.platform || "PS5").toUpperCase();
    return raw.includes("PS4") ? "PS4" : "PS5";
}

function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;
}

function parseIsoDuration(durationStr) {
    if (!durationStr || typeof durationStr !== "string") return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (parseInt(match[1] || "0", 10) * 3600) + (parseInt(match[2] || "0", 10) * 60) + parseInt(match[3] || "0", 10);
}

function resolveGamePosterArt(sources = []) {
    for (const src of sources) {
        if (typeof src === "string" && src.trim().length > 0 && !src.includes("undefined")) {
            return src.trim().replace(/^https?:/, "");
        }
        if (src && typeof src === "object" && src.url) {
            return src.url.trim().replace(/^https?:/, "");
        }
    }
    return null;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
    const days = Math.floor(diff / 86400000);
    return days > 0 ? `${days} days ago` : "Today";
}

function calculateAgeString(startDate) {
    if (!startDate) return "Unknown";
    const diffDays = Math.ceil(Math.abs(new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    return years > 0 ? `${years} years` : `${Math.floor(diffDays / 30)} months`;
}

function getDifficultyTier(earnedRate) {
    const rate = parseFloat(earnedRate || 0);
    return rate <= 5.0 ? "Ultra Rare" : (rate <= 15.0 ? "Very Rare" : "Common");
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    return `//www.amazon.com/s?k=${encodeURIComponent(gameName)}&tag=${AMAZON_TAG}`;
}

function normalizeBasicPresence(raw) {
    return raw?.basicPresence || (Array.isArray(raw) ? raw[0] : null) || raw;
}

function extractGameStatus(basicPresence) {
    const info = basicPresence?.gameTitleInfoList?.[0] || {};
    return info.gameStatus || basicPresence?.gameStatus || null;
}

function inferGameCapabilitiesFromTrophies(gameName, trophies = []) {
    const text = trophies.map(t => `${t.name} ${t.description}`).join(" ").toLowerCase();
    const isMulti = text.includes("co-op") || text.includes("multiplayer") || text.includes("online");
    return { isMultiplayer: isMulti, onlineMode: isMulti ? "Online & Offline" : "Offline Only" };
}

function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline, activeTitleId) {
    const playSessions = existingUserData?.playSessions || {};
    const primaryKey = activeCommId || activeTitleId;
    if (isOnline && primaryKey && primaryKey !== "Dashboard") {
        if (!playSessions[primaryKey]) {
            playSessions[primaryKey] = { title: activeTitle, totalSeconds: 0, totalFormatted: "0 hrs" };
        }
    }
    return { playSessions, currentGameDurationFormatted: "0 hrs", activeSessionSeconds: 0 };
}

async function loadPersistentTokens() {
    try {
        const remoteTokens = await fetchFromFirebase("secureTokens");
        if (remoteTokens && typeof remoteTokens === "object") tokenStore = { ...tokenStore, ...remoteTokens };
    } catch (e) {}
}

async function savePersistentTokens() {
    try { await syncNodeToFirebase("secureTokens", tokenStore); } catch (e) {}
}

async function isTokenValid(token) {
    try { await getUserRegion({ accessToken: token }, "me"); return true; } catch (e) { return false; }
}

async function getAuthenticated(userKey, npssoInput) {
    let t = tokenStore[userKey] || {};
    if (t.accessToken && await isTokenValid(t.accessToken)) return { accessToken: t.accessToken, userKey };
    if (t.refreshToken) {
        try {
            const refreshed = await exchangeRefreshTokenForAuthTokens(t.refreshToken);
            if (refreshed?.accessToken) {
                tokenStore[userKey] = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken || t.refreshToken };
                await savePersistentTokens();
                return { ...refreshed, userKey };
            }
        } catch (e) {}
    }
    if (npssoInput) {
        try {
            const code = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(code);
            if (auth?.accessToken) {
                tokenStore[userKey] = { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
                await savePersistentTokens();
                return { ...auth, userKey };
            }
        } catch (e) {}
    }
    return null;
}

async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames) {
    if (!commId || commId === "Dashboard" || !auth) return null;
    const canonicalCommId = String(commId).trim().toUpperCase();
    if (!canonicalCommId.startsWith("NPWR")) return globalGames[canonicalCommId] || null;

    try {
        const metaRes = await getTitleTrophies(auth, canonicalCommId, "all", { npServiceName: platform === "PS5" ? "trophy2" : "trophy" }).catch(() => ({ trophies: [] }));
        const groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, { npServiceName: platform === "PS5" ? "trophy2" : "trophy" }).catch(() => ({ trophyGroups: [] }));

        const mappedTrophies = (metaRes?.trophies || []).map(t => ({
            trophyId: t.trophyId,
            name: t.trophyName || "Trophy",
            description: t.trophyDetail || "No description.",
            type: (t.trophyType || "bronze").toLowerCase(),
            rank: (t.trophyType || "bronze").toUpperCase(),
            icon: t.trophyIconUrl || null,
            earnedRate: t.trophyEarnedRate || "0.0"
        }));

        const masterGameData = {
            commId: canonicalCommId,
            name: gameName || "Game",
            posterArt: resolveGamePosterArt([posterArt, iconArt]),
            trophies: mappedTrophies,
            groups: groupsRes?.trophyGroups || [],
            lastUpdated: new Date().toISOString()
        };

        globalGames[canonicalCommId] = masterGameData;
        await syncNodeToFirebase(`games/${canonicalCommId}`, masterGameData);
        return masterGameData;
    } catch (err) {
        return globalGames[canonicalCommId] || null;
    }
}

async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames, existingGameProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;
    const canonicalCommId = String(commId).trim().toUpperCase();

    try {
        const earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", { npServiceName: platform === "PS5" ? "trophy2" : "trophy" }).catch(() => ({ trophies: [] }));
        const standaloneProgressMap = { ...(existingGameProgress || {}) };
        const earnedTrophiesList = [];

        (earnedRes?.trophies || []).forEach(s => {
            const skelT = (globalGames[canonicalCommId]?.trophies || []).find(t => t.trophyId === s.trophyId);
            const currentProgress = s.progress !== undefined ? parseInt(s.progress, 10) : 0;
            const targetVal = skelT?.targetValue || 0;
            const progressRatio = targetVal > 0 ? `${currentProgress}/${targetVal}` : (s.progressRate ? `${s.progressRate}%` : null);

            standaloneProgressMap[s.trophyId] = {
                trophyId: s.trophyId,
                name: skelT?.name || "Trophy",
                earned: !!s.earned,
                subProgressRatio: progressRatio,
                timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0
            };

            if (s.earned) {
                earnedTrophiesList.push({ trophyId: s.trophyId, name: skelT?.name, timestamp: standaloneProgressMap[s.trophyId].timestamp });
            }
        });

        return { standaloneProgressMap, earnedTrophiesList, groupEarnings: [] };
    } catch (e) {
        return { standaloneProgressMap: existingGameProgress || {}, earnedTrophiesList: [], groupEarnings: [] };
    }
}

async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames) {
    if (!auth || !resolvedTargetId) return existingData || null;
    const resolvedTargetId = String(targetId || "");

    try {
        const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(auth, resolvedTargetId), null);
        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;

        const rawP = normalizeBasicPresence(await getBasicPresence(auth, resolvedTargetId).catch(() => ({}))) || {};
        const isPlayerOnline = (rawP?.onlineStatus || "offline") !== "offline";

        const titlesPull = await paginateCollect("getUserTitles", (offset, size) => getUserTitles(auth, resolvedTargetId, { limit: size, offset }), (res) => res?.trophyTitles || [], 800);
        const sortedTitles = titlesPull.items;
        sortedTitles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const stats = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(auth, resolvedTargetId), {});
        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };

        for (const t of sortedTitles.slice(0, 10)) {
            if (t.npCommunicationId) {
                const sub = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, t.npCommunicationId, t.trophyTitleName, normalizePlatform(t), globalGames, liveTrophyProgress[t.npCommunicationId]);
                if (sub?.standaloneProgressMap) liveTrophyProgress[t.npCommunicationId] = sub.standaloneProgressMap;
            }
        }

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        const activeCommId = activeGameInfo.npCommunicationId || sortedTitles[0]?.npCommunicationId || "NPWR_ACTIVE";
        const activeTitle = activeGameInfo.titleName || sortedTitles[0]?.trophyTitleName || "Dashboard";

        return {
            onlineId: canonicalOnlineId,
            accountId: resolvedTargetId,
            commId: activeCommId,
            online: isPlayerOnline,
            currentGame: activeTitle,
            avatar: profile?.avatars?.[0]?.url || existingData?.avatar || "",
            level: stats?.trophyLevel || existingData?.level || 0,
            liveTrophyProgress: liveTrophyProgress,
            trophySummary: stats,
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) {
        return existingData || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION 16: MASTER EXECUTION WITH DYNAMIC /user_secrets/ MULTI-USER FALLBACK]
// ----------------------------------------------------------------------------
async function executeSyncPass() {
    try {
        console.log(`[INIT] Starting Master PSN Engine v${ENGINE_VERSION}...`);

        await loadPersistentTokens();

        const siteUsersRaw = await resilientFetch(buildRtdbUrl("/users")).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(buildRtdbUrl("/user_secrets")).then(r => r.json()).catch(() => ({}));
        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        // 1. DYNAMICALLY SCAN ALL STORED NPSSO KEYS FROM FIREBASE /user_secrets/
        const availableSquadTokens = [];
        if (userSecretsRaw && typeof userSecretsRaw === "object") {
            for (const [emailKey, secretsObj] of Object.entries(userSecretsRaw)) {
                const rawNpsso = secretsObj?.psn_npsso;
                const cleanNpsso = normalizeNpsso(rawNpsso);
                const updatedAt = Number(secretsObj?.updated_at || secretsObj?.timestamp || 0);

                if (cleanNpsso) {
                    availableSquadTokens.push({
                        userKey: emailKey,
                        npsso: cleanNpsso,
                        updatedAt: updatedAt
                    });
                }
            }
        }

        // Sort by most recently updated so the freshest active key is tested first
        availableSquadTokens.sort((a, b) => b.updatedAt - a.updatedAt);
        console.log(`[FAILOVER MANAGER] Found ${availableSquadTokens.length} active squad NPSSO keys in Firebase /user_secrets/`);

        // 2. TEST KEYS IN ORDER UNTIL A WORKING MASTER SESSION IS ESTABLISHED
        let masterAuth = null;
        let winningMemberKey = null;

        for (const candidate of availableSquadTokens) {
            console.log(`[FAILOVER MANAGER] Testing token for: ${candidate.userKey} (Updated: ${new Date(candidate.updatedAt).toLocaleString()})...`);
            const verifiedAuth = await getAuthenticated(candidate.userKey, candidate.npsso);
            
            if (verifiedAuth && verifiedAuth.accessToken) {
                masterAuth = verifiedAuth;
                winningMemberKey = candidate.userKey;
                console.log(`[FAILOVER MANAGER] ✅ Success! Master session established using ${winningMemberKey}'s token.`);
                break;
            } else {
                console.warn(`[FAILOVER MANAGER] ❌ Token for ${candidate.userKey} failed or expired. Trying next available key...`);
            }
        }

        if (!masterAuth) {
            console.warn("[FAILOVER MANAGER] ⚠️ All squad tokens offline. Read-only snapshot fallback mode.");
        }

        let finalData = { 
            gamertags: { ...(previousFirebaseData?.gamertags || {}) }, 
            usersByGamerTag: { ...(previousFirebaseData?.usersByGamerTag || {}) }, 
            games: globalGames, 
            authDiagnostics: diagnosticReport, 
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };

        const activeCanonicalGamertags = new Set();

        // 3. INGEST SQUAD USERS USING DYNAMIC MASTER SESSION
        if (masterAuth && masterAuth.accessToken) {
            const credentialList = [];
            if (siteUsersRaw && typeof siteUsersRaw === "object") {
                for (const [emailKey, u] of Object.entries(siteUsersRaw)) {
                    credentialList.push(readUserPsnCredentials(emailKey, u, userSecretsRaw?.[emailKey]));
                }
            }

            for (const cred of credentialList) {
                if (!cred.accountId && !cred.tag && !cred.npsso) continue;
                const existingData = cred.tag ? finalData.gamertags[cred.tag] : undefined;
                const targetId = cred.accountId || "me";

                const data = await getFullUserData(masterAuth, cred.tag, cred.emailKey, targetId, existingData, true, globalGames);
                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                }
            }
        }

        diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
        await syncNodeToFirebase("authDiagnostics", diagnosticReport);
        console.log(`[SUCCESS] Master PSN Engine v${ENGINE_VERSION} synchronization cycle complete.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

(async () => {
    await executeSyncPass();
    process.exit(0);
})();
