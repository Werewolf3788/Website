/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Master PSN Telemetry & Deep Catalog Ingestion Engine:
 * - Automatically writes master telemetry to public/psn.json for zero-latency static site fetching.
 * - Dynamic Multi-User Squad Failover across /user_secrets/ sorted by updated_at.
 * Version: 68.0.0 - Static public/psn.json Exporter & Squad Failover
 * Date & Time Stamp: 2026-10-30 04:44:00 (America/New_York)
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

const RTDB_ROOT_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const ENGINE_VERSION = "68.0.0";
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");
const STATIC_PSN_JSON_PATH = path.join(__dirname, "../public/psn.json");

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
    if (typeof fn !== "function") return fallback;
    for (let attempt = 0; attempt <= PULL_CONFIG.RETRIES; attempt++) {
        try {
            if (PULL_CONFIG.REQUEST_GAP_MS > 0) await sleep(PULL_CONFIG.REQUEST_GAP_MS);
            apiStats.calls++;
            const res = await fn();
            return res === undefined ? fallback : res;
        } catch (err) {
            const msg = String(err?.message || err);
            if (/\b429\b|too many requests|rate limit/i.test(msg) && attempt < PULL_CONFIG.RETRIES) {
                await sleep(5000 * (attempt + 1));
                continue;
            }
            apiStats.failures++;
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
    return String(name || "").toLowerCase().replace(/®|™|©/g, "").replace(/\btrophies\b|\btrophy set\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const TROPHY_RARITY_LABELS = { 0: "Ultra Rare", 1: "Very Rare", 2: "Rare", 3: "Common" };
function trophyRarityLabel(n) {
    if (n === null || n === undefined) return null;
    return TROPHY_RARITY_LABELS[n] || null;
}

async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;
    if (typeof fetch !== "undefined") {
        try { return await fetch(url, options); } catch (e) {}
    }
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const headers = options.headers || {};
            if (options.body && !headers["Content-Length"]) headers["Content-Length"] = Buffer.byteLength(options.body);
            const req = client.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: options.method || "GET",
                headers
            }, (res) => {
                let data = "";
                res.on("data", c => { data += c; });
                res.on("end", () => resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    text: async () => data,
                    json: async () => { try { return JSON.parse(data || "{}"); } catch (e) { return {}; } }
                }));
            });
            req.on("error", reject);
            if (options.body) req.write(options.body);
            req.end();
        } catch (err) { reject(err); }
    });
}

function buildRtdbUrl(pathWithLeadingSlash) {
    const secret = process.env.FIREBASE_AUTH_SECRET;
    return `${RTDB_ROOT_URL}${pathWithLeadingSlash}.json${secret ? `?auth=${encodeURIComponent(secret)}` : ""}`;
}

async function fetchFromFirebase(endpointPath = "") {
    try {
        const res = await resilientFetch(buildRtdbUrl(`/psn${endpointPath ? '/' + endpointPath : ''}`));
        return res.ok ? await res.json() : {};
    } catch (e) { return {}; }
}

async function syncNodeToFirebase(endpointPath, payload) {
    try {
        await resilientFetch(buildRtdbUrl(`/psn/${endpointPath}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (e) {}
}

function normalizeNpsso(raw) {
    if (!raw || typeof raw !== "string") return "";
    let v = raw.trim();
    const blob = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (blob) v = blob[1];
    return v.replace(/^["'\s]+|["'\s]+$/g, "").length >= 20 ? v : "";
}

function readUserPsnCredentials(emailKey, userRecord, secretsRecord) {
    const u = userRecord || {};
    const gaming = u.gaming_platforms || {};
    const secrets = secretsRecord || {};
    const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "");
    return {
        emailKey,
        accountId: pick(u.psn_account_id, gaming.psn_account_id, secrets.psn_account_id) || null,
        tag: pick(u.psn_username, gaming.psn_username, u.psn_online_id) || "",
        npsso: normalizeNpsso(pick(secrets.psn_npsso, u.psn_npsso, gaming.psn_npsso) || "")
    };
}

async function getAuthenticated(userKey, npssoInput) {
    let t = tokenStore[userKey] || {};
    if (t.accessToken) return { accessToken: t.accessToken, userKey };
    if (npssoInput) {
        try {
            const code = await exchangeNpssoForCode(npssoInput.trim());
            const auth = await exchangeCodeForAccessToken(code);
            if (auth?.accessToken) {
                tokenStore[userKey] = { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
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

        const masterGameData = {
            commId: canonicalCommId,
            name: gameName || "Game",
            posterArt: posterArt || iconArt || null,
            trophies: (metaRes?.trophies || []).map(t => ({
                trophyId: t.trophyId,
                name: t.trophyName || "Trophy",
                description: t.trophyDetail || "No description.",
                type: (t.trophyType || "bronze").toLowerCase(),
                rank: (t.trophyType || "bronze").toUpperCase(),
                icon: t.trophyIconUrl || null,
                earnedRate: t.trophyEarnedRate || "0.0"
            })),
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

async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, globalGames) {
    if (!auth || !targetId) return existingData || null;
    const resolvedTargetId = String(targetId);

    try {
        const profile = await callPsn("getProfileFromAccountId", () => getProfileFromAccountId(auth, resolvedTargetId), null);
        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;

        const rawP = profile?.basicPresence || {};
        const titlesPull = await paginateCollect("getUserTitles", (offset, size) => getUserTitles(auth, resolvedTargetId, { limit: size, offset }), (res) => res?.trophyTitles || [], 800);
        const sortedTitles = titlesPull.items;

        const stats = await callPsn("getUserTrophyProfileSummary", () => getUserTrophyProfileSummary(auth, resolvedTargetId), {});
        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };

        for (const t of sortedTitles.slice(0, 10)) {
            if (t.npCommunicationId) {
                const sub = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, t.npCommunicationId, t.trophyTitleName, "PS5", globalGames, liveTrophyProgress[t.npCommunicationId]);
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
            online: true,
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

// ============================================================================
// MASTER EXECUTION & PUBLIC psn.json EXPORTER
// ============================================================================
async function executeSyncPass() {
    try {
        console.log(`[INIT] Starting PSN Engine v${ENGINE_VERSION} & Static Exporter...`);

        const siteUsersRaw = await resilientFetch(buildRtdbUrl("/users")).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(buildRtdbUrl("/user_secrets")).then(r => r.json()).catch(() => ({}));
        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        // Dynamic multi-user squad failover scanning /user_secrets/ sorted by updated_at
        const availableSquadTokens = [];
        if (userSecretsRaw && typeof userSecretsRaw === "object") {
            for (const [emailKey, secretsObj] of Object.entries(userSecretsRaw)) {
                const cleanNpsso = normalizeNpsso(secretsObj?.psn_npsso);
                if (cleanNpsso) {
                    availableSquadTokens.push({
                        userKey: emailKey,
                        npsso: cleanNpsso,
                        updatedAt: Number(secretsObj?.updated_at || secretsObj?.timestamp || 0)
                    });
                }
            }
        }
        availableSquadTokens.sort((a, b) => b.updatedAt - a.updatedAt);

        let masterAuth = null;
        for (const candidate of availableSquadTokens) {
            const verifiedAuth = await getAuthenticated(candidate.userKey, candidate.npsso);
            if (verifiedAuth?.accessToken) {
                masterAuth = verifiedAuth;
                console.log(`[FAILOVER MANAGER] ✅ Active Master Session established using: ${candidate.userKey}`);
                break;
            }
        }

        let finalData = { 
            gamertags: { ...(previousFirebaseData?.gamertags || {}) }, 
            usersByGamerTag: { ...(previousFirebaseData?.usersByGamerTag || {}) }, 
            games: globalGames, 
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };

        if (masterAuth?.accessToken) {
            const credentialList = [];
            if (siteUsersRaw && typeof siteUsersRaw === "object") {
                for (const [emailKey, u] of Object.entries(siteUsersRaw)) {
                    credentialList.push(readUserPsnCredentials(emailKey, u, userSecretsRaw?.[emailKey]));
                }
            }

            for (const cred of credentialList) {
                if (!cred.accountId && !cred.tag && !cred.npsso) continue;
                const existingData = cred.tag ? finalData.gamertags[cred.tag] : undefined;
                const data = await getFullUserData(masterAuth, cred.tag, cred.emailKey, cred.accountId || "me", existingData, globalGames);
                if (data && data.onlineId) {
                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                }
            }
        }

        // EXPORT DIRECTLY TO public/psn.json FOR STATIC SITE INGESTION
        try {
            fs.writeFileSync(STATIC_PSN_JSON_PATH, JSON.stringify(finalData, null, 2), "utf-8");
            console.log(`[EXPORT SUCCESS] Master telemetry successfully written to ${STATIC_PSN_JSON_PATH}`);
        } catch (exportErr) {
            console.error(`[EXPORT ERROR] Could not write public/psn.json: ${exportErr.message}`);
        }

        console.log(`[SUCCESS] PSN Engine v${ENGINE_VERSION} sync pass completed.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

(async () => {
    await executeSyncPass();
    process.exit(0);
})();
