/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Master PSN Telemetry & Deep Catalog Ingestion Engine:
 * 1. Master Skeleton under /psn/games/{commId} strictly holds universal game facts:
 * - NPWR primary commId, CUSA/PPSA SKU, and conceptId (e.g., 10008946).
 * - Full uncompressed Store storyline, animal/weapon rosters, feature bullets.
 * - Hardware, online, player-count & trigger/vibration store badges.
 * - 7-category accessibility features & master trophies list.
 * - Itemized DLC groups & edition tiers (e.g., Heirloom Pack EP4389-PPSA17911_00-WOTH2PREORDERDLC).
 * 2. User Overlays isolated strictly to /psn/gamertags/{onlineId}:
 * - Root commId acts as foreign key pointer directly to /psn/games/{commId}.
 * - liveTrophyProgress contains earned flags, EDT timestamps, and (x/x) sub-progress.
 * 3. Hot-standby failover across WildHorse_Spirit and Ray.
 * 4. Online-Only Optimization & Checkpoint Session Tracker:
 * - Strict presence gating skips offline players to avoid wasting compute/API quota.
 * - 1-pass fast session wrap closes pending sessions upon detecting offline transition.
 * - 15-minute incremental checkpoint syncing with manualBaselineHours integration.
 * - Multi-tier progressive duration formatting (mins -> hours -> days -> weeks -> months -> years).
 * Analytics Tagging: G-CTYHDF4MSD (Deployable via GTM).
 * Version: 66.0.0 - Incremental Checkpoint Tracker & Online-Only Guard
 * Date & Time Stamp: 2026-10-08 22:08:00 EDT (America/New_York)
 * ============================================================================ */

// [SECTION 1: IMPORTS & CORE CONFIGURATION] Line 25
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
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

const SQUAD_GAMERTAGS = {
    wildhorse_spirit: "WildHorse_Spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "DesdemonaTiger"
};

const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523"
};

const CORE_PACK = [
    { key: "wildhorse_spirit", tag: "WildHorse_Spirit", id: ACCOUNT_IDS.wildhorse_spirit },
    { key: "ray", tag: "OneLIVIDMAN", id: ACCOUNT_IDS.ray },
    { key: "darkwing", tag: "Darkwing69420", id: ACCOUNT_IDS.darkwing },
    { key: "marc", tag: "DesdemonaTiger", id: ACCOUNT_IDS.marc }
];

const SEED_TARGET_ACCOUNT_IDS = [
    "4087137467908566201",
    "2732733730346312494",
    "4398462806362115916",
    "6551906246515882523",
    "7742137722487951585",
    "2288010536299512532",
    "5194904245822471614",
    "2344801193533413809",
    "3728215008151724560",
    "8996572749275973724",
    "1749160004083248186"
];

const AMAZON_TAG = "moviesanywhere02-20";

let tokenStore = { ray: {}, wildhorse_spirit: {} };

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    active_runner: "UNCHECKED",
    buffer_status: "UNCHECKED",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION 2: HTTP & HTTPS RESILIENT FETCH LAYER] Line 116
// ----------------------------------------------------------------------------
async function resilientFetch(url, options = {}) {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    if (typeof fetch !== "undefined") {
        try {
            return await fetch(url, options);
        } catch (fetchErr) {
            console.warn(`[FETCH WARN] Global fetch fallback for ${url}: ${fetchErr.message}`);
        }
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

// ----------------------------------------------------------------------------
// [SECTION 3: FIREBASE AUTHENTICATED REST API UTILITIES] Line 172
// ----------------------------------------------------------------------------
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
        console.warn(`[FIREBASE READ ERROR] /psn/${endpointPath}: ${err.message}`);
        return {};
    }
}

async function syncNodeToFirebase(endpointPath, payload) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        const res = await resilientFetch(targetUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res && !res.ok) {
            console.error(`[FIREBASE WRITE ERROR] Failed /psn/${endpointPath}: HTTP ${res.status}`);
        }
    } catch (err) {
        console.error(`[FIREBASE WRITE ERROR] Failed /psn/${endpointPath}: ${err.message}`);
    }
}

async function deleteNodeFromFirebase(endpointPath) {
    const targetUrl = buildRtdbUrl(`/psn/${endpointPath}`);
    try {
        await resilientFetch(targetUrl, { method: "DELETE" });
        console.log(`[CLEANUP] Purged node from Firebase: /psn/${endpointPath}`);
    } catch (err) {
        console.warn(`[CLEANUP WARN] Failed to delete /psn/${endpointPath}: ${err.message}`);
    }
}

// ----------------------------------------------------------------------------
// [SECTION 4: DEEP PLAYSTATION STORE INGESTION (CONCEPTS, PRODUCTS & DLC)] Line 222
// ----------------------------------------------------------------------------
function extractConceptIdFromText(text = "") {
    if (!text || typeof text !== "string") return null;
    const match = text.match(/concept\/(\d+)/i);
    return match ? match[1] : null;
}

function parseStoreHtmlFeatures(html) {
    const badges = [];
    const accessibility = {};
    let currentCategory = "General";

    // 1. Platform, Network, and Controller Badges
    const badgeRegex = /<li[^>]*data-qa="gameInfo#releaseInformation#gameBadges#item[^>]*>([\s\S]*?)<\/li>/gi;
    let badgeMatch;
    while ((badgeMatch = badgeRegex.exec(html)) !== null) {
        const clean = badgeMatch[1].replace(/<[^>]*>/g, "").trim();
        if (clean && !badges.includes(clean)) badges.push(clean);
    }

    const fallbackBadges = [
        "PS Plus required for online play",
        "In-game purchases optional",
        "Supports up to 4 online players with PS Plus",
        "Supports up to 32 online players with PS Plus",
        "Online play optional",
        "Online play required",
        "1 player",
        "Remote Play supported",
        "PS5 Version",
        "PS4 Version",
        "PS4 Pro Enhanced",
        "DUALSHOCK 4 vibration",
        "Vibration function and trigger effect supported (DualSense wireless controller)"
    ];

    fallbackBadges.forEach(b => {
        if (html.includes(b) && !badges.includes(b)) badges.push(b);
    });

    // 2. Structured Accessibility Suite
    const accessMatch = html.match(/Accessibility Features([\s\S]*?)(?:Game and Legal Info|<footer)/i);
    if (accessMatch && accessMatch[1]) {
        const rawAccess = accessMatch[1];
        const lines = rawAccess.replace(/<[^>]*>/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (["Visuals", "Subtitles and Captions", "Controls", "Gameplay", "Audio"].includes(line)) {
                currentCategory = line;
                if (!accessibility[currentCategory]) accessibility[currentCategory] = [];
            } else if (accessibility[currentCategory] && line.length > 3 && !accessibility[currentCategory].includes(line)) {
                accessibility[currentCategory].push(line);
            }
        }
    }

    return { badges, accessibility };
}

async function queryStoreMetadata(identifier, isProductSku = false) {
    if (!identifier) return null;
    try {
        const pathType = isProductSku ? "product" : "concept";
        const storeUrl = `https://store.playstation.com/en-us/${pathType}/${identifier}`;
        
        const response = await resilientFetch(storeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        if (!response || !response.ok) return null;
        const html = await response.text();

        let nextData = null;
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nextDataMatch && nextDataMatch[1]) {
            try {
                nextData = JSON.parse(nextDataMatch[1]);
            } catch (err) {}
        }

        const pageProps = nextData?.props?.pageProps || {};
        const entity = pageProps.concept || pageProps.product || {};
        const parsedFeatures = parseStoreHtmlFeatures(html);

        let richDescription = entity.longDescription || entity.description || null;
        if (!richDescription) {
            const descMatch = html.match(/<p data-qa="gameInfo#releaseInformation#description"[^>]*>([\s\S]*?)<\/p>/i) ||
                              html.match(/<meta property="og:description" content="([\s\S]*?)"/i);
            if (descMatch && descMatch[1]) {
                richDescription = descMatch[1].replace(/<[^>]*>/g, "\n").trim();
            }
        }

        const defaultProd = entity.defaultProduct || (isProductSku ? entity : {});
        const mediaItems = entity.media || defaultProd.media || [];
        const screenshots = Array.isArray(mediaItems) 
            ? mediaItems.filter(m => m.type === "IMAGE").map(m => resolveGamePosterArt([m.url])).filter(Boolean)
            : [];

        const editions = Array.isArray(entity.products) ? entity.products.map(p => ({
            productId: p.id,
            name: p.name,
            price: p.price?.displayPrice || "Store Listing",
            isFree: !!p.price?.isFree,
            platforms: p.platforms || []
        })) : [];

        return {
            conceptId: isProductSku ? (entity.conceptId || null) : String(identifier),
            productId: isProductSku ? String(identifier) : (defaultProd.id || null),
            storeUrl: `//store.playstation.com/en-us/${pathType}/${identifier}`,
            name: entity.name || defaultProd.name || null,
            publisher: entity.publisherName || entity.publisher || defaultProd.publisherName || null,
            releaseDate: entity.releaseDate || defaultProd.releaseDate || null,
            genres: Array.isArray(entity.genres) ? entity.genres : (defaultProd.genres || []),
            price: defaultProd.price?.displayPrice || "Store Listing",
            discountedPrice: defaultProd.price?.discountedPrice || null,
            isFree: !!defaultProd.price?.isFree,
            rating: entity.contentRating?.name || defaultProd.contentRating?.name || null,
            ratingDescriptors: entity.contentRating?.descriptors || defaultProd.contentRating?.descriptors || [],
            badges: parsedFeatures.badges,
            accessibility: parsedFeatures.accessibility,
            screenshots: screenshots,
            editions: editions,
            longDescription: richDescription,
            fetchedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn(`[STORE FETCH ERROR] Failed ${identifier}: ${err.message}`);
        return null;
    }
}

async function searchStoreConceptByName(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    try {
        const cleanQuery = encodeURIComponent(gameName.replace(/®|™/g, "").trim());
        const searchApiUrl = `https://web.np.playstation.com/api/graphql/v1/op?operationName=getSearchResults&variables=%7B%22searchTerm%22%3A%22${cleanQuery}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22d77d9a513cbdba90e2908f4c17c4613271789721d15c7e0d37e6f3b7d7b0b63e%22%7D%7D`;
        
        const res = await resilientFetch(searchApiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "x-psn-app-ver": "latest"
            }
        });

        if (!res || !res.ok) return null;
        const data = await res.json();
        const searchResults = data?.data?.universalSearch?.results || [];

        for (const item of searchResults) {
            const conceptId = item.id || extractConceptIdFromText(item.url);
            if (conceptId) return String(conceptId);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION 5: HARDWARE, PLATFORM, FILE SIZES & MULTI-TIER TIME FORMATTING] Line 387
// ----------------------------------------------------------------------------
function parseDetailedHardwareContext(rawPresence, matchedGame = {}) {
    const primaryInfo = rawPresence?.primaryPlatformInfo || {};
    const rawPlatform = (primaryInfo.platform || rawPresence?.platform || "").toUpperCase();
    
    let activeHardware = "Unknown";
    if (rawPlatform.includes("PS5")) activeHardware = "PS5";
    else if (rawPlatform.includes("PS4")) activeHardware = "PS4";
    else if (rawPlatform.includes("PS3")) activeHardware = "PS3";
    else if (rawPlatform.includes("VITA")) activeHardware = "PS Vita";
    else if (rawPlatform.includes("PSP")) activeHardware = "PSP";
    else activeHardware = (matchedGame?.platform || "PS5");

    const isStreaming = !!(
        primaryInfo.isInGameStreaming || 
        primaryInfo.streamingType || 
        rawPresence?.isInGameStreaming ||
        primaryInfo.remotePlay || 
        String(primaryInfo.platform).toUpperCase().includes("STREAM")
    );

    const gameInfoList = rawPresence?.gameTitleInfoList?.[0] || primaryInfo?.gameTitleInfoList?.[0] || {};
    const rawFormatValue = (gameInfoList.formatValue || matchedGame.category || matchedGame.npServiceName || "").toUpperCase();

    let gameBuildVersion = "PS5 Native Game";
    if (rawFormatValue.includes("PS4") || rawFormatValue === "TROPHY") {
        gameBuildVersion = (activeHardware === "PS5") ? "PS4 Back-Compat on PS5" : "PS4 Native Game";
    } else if (rawFormatValue.includes("PS3")) {
        gameBuildVersion = "PS3 Classic";
    } else if (rawFormatValue.includes("VITA")) {
        gameBuildVersion = "PS Vita App";
    } else if (rawFormatValue.includes("PS5") || rawFormatValue === "TROPHY2") {
        gameBuildVersion = "PS5 Native Game";
    } else if (matchedGame.platform) {
        gameBuildVersion = `${matchedGame.platform} Game`;
    }

    return {
        activeHardware: activeHardware,
        isStreamingRemotePlay: isStreaming,
        gameBuildVersion: gameBuildVersion,
        displayPlatformLabel: isStreaming ? `${activeHardware} (Remote Play)` : activeHardware
    };
}

function normalizePlatform(game) {
    const raw = (
        game?.trophyTitlePlatform || 
        game?.platform || 
        game?.category || 
        (game?.npServiceName === "trophy2" ? "PS5" : "PS4") || 
        "PS4"
    ).toUpperCase();

    if (raw.includes("PS5")) return "PS5";
    if (raw.includes("PS4")) return "PS4";
    if (raw.includes("PS3")) return "PS3";
    if (raw.includes("VITA")) return "PS Vita";
    if (raw.includes("PSP")) return "PSP";
    return "PS5";
}

function estimateGameFileSize(gameName = "", platform = "PS5") {
    const nameLower = gameName.toLowerCase();
    if (nameLower.includes("red dead redemption")) return "105.0 GB";
    if (nameLower.includes("ghost recon wildlands")) return "62.4 GB";
    if (nameLower.includes("thehunter") || nameLower.includes("call of the wild")) return "48.2 GB";
    if (nameLower.includes("way of the hunter")) return "22.6 GB";
    if (nameLower.includes("sniper elite 5")) return "55.1 GB";
    if (nameLower.includes("farming simulator 25")) return "38.5 GB";
    if (nameLower.includes("path of titans")) return "12.8 GB";
    if (nameLower.includes("left 4 dead")) return "7.5 GB";
    return platform === "PS5" ? "42.0 GB" : "28.5 GB";
}

function estimateDlcFileSize(dlcName = "") {
    const dLower = dlcName.toLowerCase();
    if (dLower.includes("heirloom")) return "450 MB";
    if (dLower.includes("narco road")) return "9.2 GB";
    if (dLower.includes("fallen ghosts")) return "10.4 GB";
    if (dLower.includes("night hunting")) return "1.2 GB";
    if (dLower.includes("reserve") || dLower.includes("map")) return "4.8 GB";
    if (dLower.includes("weapon") || dLower.includes("pack")) return "850 MB";
    return "2.4 GB";
}

// Progressive Multi-Tier Playtime Formatter: mins -> hours -> days -> weeks -> months -> years
function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";

    const SECONDS_IN_MIN = 60;
    const SECONDS_IN_HOUR = 3600;
    const SECONDS_IN_DAY = 86400;
    const SECONDS_IN_WEEK = 604800;
    const SECONDS_IN_MONTH = 2592000; // 30 days
    const SECONDS_IN_YEAR = 31536000;  // 365 days

    if (totalSeconds >= SECONDS_IN_YEAR) {
        const years = Math.floor(totalSeconds / SECONDS_IN_YEAR);
        const remMonths = Math.floor((totalSeconds % SECONDS_IN_YEAR) / SECONDS_IN_MONTH);
        if (remMonths > 0) return `${years} ${years > 1 ? "years" : "year"}, ${remMonths} ${remMonths > 1 ? "months" : "month"}`;
        return `${years} ${years > 1 ? "years" : "year"}`;
    }

    if (totalSeconds >= SECONDS_IN_MONTH) {
        const months = Math.floor(totalSeconds / SECONDS_IN_MONTH);
        const remWeeks = Math.floor((totalSeconds % SECONDS_IN_MONTH) / SECONDS_IN_WEEK);
        if (remWeeks > 0) return `${months} ${months > 1 ? "months" : "month"}, ${remWeeks} ${remWeeks > 1 ? "weeks" : "week"}`;
        return `${months} ${months > 1 ? "months" : "month"}`;
    }

    if (totalSeconds >= SECONDS_IN_WEEK) {
        const weeks = Math.floor(totalSeconds / SECONDS_IN_WEEK);
        const remDays = Math.floor((totalSeconds % SECONDS_IN_WEEK) / SECONDS_IN_DAY);
        if (remDays > 0) return `${weeks} ${weeks > 1 ? "weeks" : "week"}, ${remDays} ${remDays > 1 ? "days" : "day"}`;
        return `${weeks} ${weeks > 1 ? "weeks" : "week"}`;
    }

    if (totalSeconds >= SECONDS_IN_DAY) {
        const days = Math.floor(totalSeconds / SECONDS_IN_DAY);
        const remHours = Math.floor((totalSeconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
        const remMinutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MIN);
        if (remHours > 0) return `${days} ${days > 1 ? "days" : "day"}, ${remHours}h ${remMinutes}m`;
        if (remMinutes > 0) return `${days} ${days > 1 ? "days" : "day"}, ${remMinutes} mins`;
        return `${days} ${days > 1 ? "days" : "day"}`;
    }

    if (totalSeconds >= SECONDS_IN_HOUR) {
        const hours = Math.floor(totalSeconds / SECONDS_IN_HOUR);
        const minutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MIN);
        if (minutes > 0) return `${hours}h ${minutes}m`;
        return `${hours} hrs`;
    }

    const minutes = Math.floor(totalSeconds / SECONDS_IN_MIN);
    return `${minutes} mins`;
}

function parseIsoDuration(durationStr) {
    if (!durationStr || typeof durationStr !== "string") return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function resolveGamePosterArt(sources = []) {
    for (const src of sources) {
        if (typeof src === "string" && src.trim().length > 0 && !src.includes("undefined") && !src.includes("null")) {
            let cleanUrl = src.trim();
            if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.replace("http://", "//");
            if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.replace("https://", "//");
            return cleanUrl;
        }
        if (src && typeof src === "object" && src.url) {
            let cleanUrl = src.url.trim();
            if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.replace("http://", "//");
            if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.replace("https://", "//");
            return cleanUrl;
        }
    }
    return null;
}

function getTrophyAgeString(timestamp) {
    if (!timestamp) return null;
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    let diff = Math.max(0, now - past);

    const intervals = [
        { label: "yr", value: 31536000000 },
        { label: "month", value: 2592000000 },
        { label: "week", value: 604800000 },
        { label: "day", value: 86400000 },
        { label: "hour", value: 3600000 },
        { label: "min", value: 60000 }
    ];

    const parts = [];
    for (const interval of intervals) {
        const count = Math.floor(diff / interval.value);
        if (count > 0) {
            parts.push(`${count} ${interval.label}${count > 1 ? "s" : ""}`);
            diff -= count * interval.value;
        }
    }
    return parts.length > 0 ? parts.join(", ") : "Just now";
}

function calculateAgeString(startDate, endDate = new Date()) {
    if (!startDate) return "Unknown";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years} years, ${months} months`;
    return `${months} months`;
}

function getDifficultyTier(earnedRate) {
    if (earnedRate === undefined || earnedRate === null) return "Rare";
    const rate = parseFloat(earnedRate);
    if (isNaN(rate)) return "Rare";
    if (rate <= 5.0) return "Ultra Rare (Very Hard)";
    if (rate <= 15.0) return "Very Rare (Hard)";
    if (rate <= 50.0) return "Rare (Medium)";
    return "Common (Easy)";
}

function generateAffiliateUrl(gameName) {
    if (!gameName || gameName === "Dashboard") return null;
    const cleanName = encodeURIComponent(gameName.replace(/®|™/g, ""));
    return `//www.amazon.com/s?k=${cleanName}&tag=${AMAZON_TAG}`;
}

// ----------------------------------------------------------------------------
// [SECTION 6: CAPABILITY & MULTIPLAYER PARSER WITH STORE BADGES] Line 608
// ----------------------------------------------------------------------------
function inferGameCapabilitiesFromTrophies(gameName, trophies = [], commId = null, storeBadges = []) {
    const combinedTrophyText = (trophies || []).map(t => `${t.name || ""} ${t.description || ""} ${t.detail || ""}`).join(" ").toLowerCase();
    const cleanName = (gameName || "").toLowerCase().trim();
    const badgesLower = (storeBadges || []).map(b => b.toLowerCase());

    const hasBadgeOnline = badgesLower.some(b => b.includes("online play") || b.includes("online players"));
    const hasBadgePsPlus = badgesLower.some(b => b.includes("ps plus"));

    const coopTokens = ["co-op", "coop", "cooperative", "partner", "teammate", "revive an ally", "revive a player", "with a friend", "invite a friend", "as a duo", "posse"];
    const pvpTokens = ["multiplayer", "pvp", "versus", "invade", "invasion", "axis invasion", "ranked match", "online match", "opponents", "deathmatch", "battle royale", "win a match", "series major", "the real deal"];
    const campaignTokens = ["campaign", "chapter", "mission", "story", "prologue", "epilogue", "difficulty", "collectibles", "memories", "complete the game"];

    const hasCoopTrophies = coopTokens.some(token => combinedTrophyText.includes(token));
    const hasPvpTrophies = pvpTokens.some(token => combinedTrophyText.includes(token));
    const hasCampaignTrophies = campaignTokens.some(token => combinedTrophyText.includes(token)) || (trophies && trophies.length > 15);

    const isDedicatedCoop = cleanName.includes("it takes two") || cleanName.includes("a way out") || cleanName.includes("we were here");
    const isRdr2 = cleanName.includes("red dead") || cleanName.includes("rdr2");
    const isTsushima = cleanName.includes("ghost of tsushima") || cleanName.includes("tsushima") || cleanName.includes("legends");
    const isNfs = cleanName.includes("need for speed") || cleanName.includes("nfs ");
    const isFarmSim = cleanName.includes("farming simulator");
    const isSniperElite = cleanName.includes("sniper elite") || cleanName.includes("zombie army");
    const isHunter = cleanName.includes("thehunter") || cleanName.includes("hunter: call of the wild") || cleanName.includes("way of the hunter");
    const isWildlands = cleanName.includes("wildlands") || cleanName.includes("breakpoint") || cleanName.includes("division");
    const isTitans = cleanName.includes("path of titans");

    const isMulti = hasBadgeOnline || hasCoopTrophies || hasPvpTrophies || isDedicatedCoop || isRdr2 || isTsushima || isNfs || isFarmSim || isSniperElite || isHunter || isWildlands || isTitans;
    const isCrossPlay = isDedicatedCoop || isTsushima || cleanName.includes("unbound") || isFarmSim || cleanName.includes("sniper elite 5") || isTitans;

    let multiplayerType = "Single Player Only";
    let onlineMode = "Offline Only";

    if (isDedicatedCoop) {
        multiplayerType = "Co-Op Only (2-Player)";
        onlineMode = "Online Play Required";
    } else if (isRdr2) {
        multiplayerType = "Solo Story + Red Dead Online (Up to 32 Players)";
        onlineMode = "Online & Offline Playable";
    } else if (isHunter) {
        multiplayerType = "Solo Reserves + Online Co-Op Hunting (Up to 4-8 Players)";
        onlineMode = "Online & Offline Playable";
    } else if (isTsushima) {
        multiplayerType = "Solo Campaign + Legends Co-Op (2-4)";
        onlineMode = "Online & Offline Playable";
    } else if (isSniperElite) {
        multiplayerType = "Solo Campaign + Co-Op & Invasion (2-16)";
        onlineMode = "Online & Offline Playable";
    } else if (isFarmSim) {
        multiplayerType = "Solo Farm + Online Co-Op (6-Player)";
        onlineMode = "Online & Offline Playable";
    } else if (isNfs) {
        multiplayerType = "Solo Story + Online Racing (8-16)";
        onlineMode = "Online & Offline Playable";
    } else if (isWildlands) {
        multiplayerType = "Solo Campaign + Online Co-Op (4-Player)";
        onlineMode = "Online & Offline Playable";
    } else if (hasCoopTrophies && hasPvpTrophies) {
        multiplayerType = "Solo Campaign + Co-Op & Online PvP";
        onlineMode = "Online & Offline Playable";
    } else if (hasCoopTrophies) {
        multiplayerType = "Solo Campaign + Online Co-Op";
        onlineMode = "Online & Offline Playable";
    } else if (hasPvpTrophies) {
        multiplayerType = "Solo Story + Online Multiplayer";
        onlineMode = "Online & Offline Playable";
    }

    return {
        isMultiplayer: isMulti,
        isCoOpOnly: isDedicatedCoop,
        hasCampaign: isDedicatedCoop ? true : (hasCampaignTrophies || !isTitans),
        multiplayerType: multiplayerType,
        onlineMode: onlineMode,
        isCrossPlatform: isCrossPlay,
        crossPlayPlatforms: isCrossPlay ? ["PS5", "PS4", "PC", "Xbox Series X|S"] : ["PlayStation Network"],
        psPlusRequired: hasBadgePsPlus || (isMulti && !cleanName.includes("free to play"))
    };
}

// ----------------------------------------------------------------------------
// [SECTION 7: INCREMENTAL CHECKPOINT PLAYTIME & SESSION ACCUMULATOR] Line 702
// ----------------------------------------------------------------------------
function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isOnline, activeTitleId) {
    const playSessions = existingUserData?.playSessions || {};
    const now = Date.now();
    const primaryKey = activeCommId || activeTitleId;

    // Checkpoint close & delta finalization for ended/switched sessions
    for (const [id, session] of Object.entries(playSessions)) {
        if (session.isActive && (id !== primaryKey || !isOnline)) {
            const lastCheckpoint = session.lastSyncedTime || session.sessionStartTime || now;
            const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));
            
            session.accumulatedSeconds = (session.accumulatedSeconds || 0) + deltaSeconds;
            
            const manualSeconds = Math.round((session.manualBaselineHours || 0) * 3600);
            session.totalSeconds = manualSeconds + session.accumulatedSeconds;
            
            session.isActive = false;
            session.sessionStartTime = null;
            session.lastSyncedTime = null;
            session.lastEndedTime = now;
            session.totalFormatted = formatDuration(session.totalSeconds);
            session.totalHours = Math.round((session.totalSeconds / 3600) * 10) / 10;
            
            console.log(`[SESSION FINALIZED] Checkpoint banked for ${session.title}. +${deltaSeconds}s added. Total: ${session.totalFormatted}`);
        }
    }

    // Active session incremental checkpoint synchronization
    if (isOnline && primaryKey && primaryKey !== "Dashboard") {
        if (!playSessions[primaryKey]) {
            const manualBaselineHours = existingUserData?.manualBaselineHours || 0;
            const manualSeconds = Math.round(manualBaselineHours * 3600);
            
            playSessions[primaryKey] = {
                commId: activeCommId || primaryKey,
                titleId: activeTitleId || primaryKey,
                title: activeTitle,
                manualBaselineHours: manualBaselineHours,
                accumulatedSeconds: 0,
                totalSeconds: manualSeconds,
                isActive: true,
                sessionStartTime: now,
                lastSyncedTime: now,
                totalFormatted: formatDuration(manualSeconds),
                totalHours: Math.round((manualSeconds / 3600) * 10) / 10
            };
            console.log(`[SESSION STARTED] Active tracking started for ${activeTitle} (${primaryKey}). Base: ${manualBaselineHours}h.`);
        } else {
            const current = playSessions[primaryKey];
            if (!current.isActive) {
                current.isActive = true;
                current.sessionStartTime = now;
                current.lastSyncedTime = now;
                console.log(`[SESSION RESUMED] Resumed tracking for ${activeTitle} (${primaryKey}).`);
            } else {
                // Bank incremental delta since last 15-minute sync
                const lastCheckpoint = current.lastSyncedTime || current.sessionStartTime || now;
                const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));
                
                current.accumulatedSeconds = (current.accumulatedSeconds || 0) + deltaSeconds;
                current.lastSyncedTime = now;
                
                const manualSeconds = Math.round((current.manualBaselineHours || 0) * 3600);
                current.totalSeconds = manualSeconds + current.accumulatedSeconds;
                current.totalFormatted = formatDuration(current.totalSeconds);
                current.totalHours = Math.round((current.totalSeconds / 3600) * 10) / 10;
                
                console.log(`[CHECKPOINT SYNC] Banked +${deltaSeconds}s for ${activeTitle}. New Total: ${current.totalFormatted}`);
            }
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    let activeSessionSeconds = 0;
    if (primaryKey && playSessions[primaryKey]) {
        const active = playSessions[primaryKey];
        activeSessionSeconds = active.totalSeconds || 0;
        currentGameDurationFormatted = active.totalFormatted || formatDuration(activeSessionSeconds);
    }

    return { playSessions, currentGameDurationFormatted, activeSessionSeconds };
}

// ----------------------------------------------------------------------------
// [SECTION 8: TOKEN LIFECYCLE MANAGEMENT & REFRESH LAYER] Line 787
// ----------------------------------------------------------------------------
async function loadPersistentTokens() {
    try {
        const remoteTokens = await fetchFromFirebase("secureTokens");
        if (remoteTokens && typeof remoteTokens === "object") {
            tokenStore = { ...tokenStore, ...remoteTokens };
            console.log("[TOKEN STORAGE] Loaded cached tokens from Firebase.");
        }
    } catch (e) {}

    if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(LOCAL_TOKENS_PATH, "utf-8"));
            if (localData && typeof localData === "object") {
                tokenStore = { ...tokenStore, ...localData };
                console.log("[TOKEN STORAGE] Loaded cached tokens from local disk.");
            }
        } catch (e) {}
    }
}

async function savePersistentTokens() {
    try {
        fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokenStore, null, 2), "utf-8");
    } catch (e) {}

    try {
        await syncNodeToFirebase("secureTokens", tokenStore);
    } catch (e) {}
}

async function purgeToken(userKey) {
    console.warn(`[TOKEN PURGE] Stale access token cleared for ${userKey}.`);
    if (tokenStore[userKey]) {
        tokenStore[userKey].accessToken = null;
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
            diagnosticReport[`${userKey}_status`] = "ACTIVE_ACCESS_TOKEN";
            return { accessToken: currentUserTokens.accessToken, npssoValid: true, userKey };
        }
        currentUserTokens.accessToken = null;
    }

    if (currentUserTokens.refreshToken) {
        try {
            console.log(`[AUTH] Proactively renewing session via refresh token for ${userKey}...`);
            const refreshed = await exchangeRefreshTokenForAuthTokens(currentUserTokens.refreshToken);
            if (refreshed && refreshed.accessToken) {
                tokenStore[userKey] = { 
                    accessToken: refreshed.accessToken, 
                    refreshToken: refreshed.refreshToken || currentUserTokens.refreshToken, 
                    expiryTime: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600) 
                };
                await savePersistentTokens();
                diagnosticReport[`${userKey}_active`] = "yes";
                diagnosticReport[`${userKey}_status`] = "ACTIVE_VIA_REFRESH";
                console.log(`[AUTH SUCCESS] Successfully renewed session for ${userKey}.`);
                return { ...refreshed, npssoValid: true, userKey };
            }
        } catch (e) {
            console.warn(`[REFRESH REJECTED] Refresh token failed for ${userKey}: ${e.message}.`);
            await purgeToken(userKey);
        }
    }

    if (npssoInput && npssoInput.trim().length > 0) {
        try {
            console.log(`[AUTH] Handshaking NPSSO for ${userKey}...`);
            const cleanNpsso = npssoInput.trim();
            const accessCode = await exchangeNpssoForCode(cleanNpsso);
            const auth = await exchangeCodeForAccessToken(accessCode);

            if (auth && auth.accessToken) {
                tokenStore[userKey] = { 
                    accessToken: auth.accessToken, 
                    refreshToken: auth.refreshToken, 
                    expiryTime: Math.floor(Date.now() / 1000) + (auth.expiresIn || 3600) 
                };
                await savePersistentTokens();
                diagnosticReport[`${userKey}_active`] = "yes";
                diagnosticReport[`${userKey}_status`] = "ACTIVE_VIA_NPSSO";
                console.log(`[AUTH SUCCESS] Authenticated ${userKey} via NPSSO.`);
                return { ...auth, npssoValid: true, userKey };
            }
        } catch (e) { 
            console.error(`[NPSSO ERROR] Exchange failed for ${userKey}: ${e.message}`);
            diagnosticReport[`${userKey}_active`] = "no";
            diagnosticReport[`${userKey}_status`] = `EXPIRED_NPSSO (${e.message})`;
            return null; 
        }
    }

    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "OFFLINE_GUEST_MODE";
    return null;
}

// ----------------------------------------------------------------------------
// [SECTION 9: SMART HOT-STANDBY FAILOVER MANAGER FOR CORE PACK] Line 899
// ----------------------------------------------------------------------------
async function resolveMasterSession(wildHorseNpsso, rayNpsso) {
    console.log("[FAILOVER MANAGER] Checking squad token health across WildHorse_Spirit & Ray...");

    const wolfAuth = await getAuthenticated("wildhorse_spirit", wildHorseNpsso);
    const rayAuth = await getAuthenticated("ray", rayNpsso);

    let activeMaster = null;
    let failoverState = "NORMAL";

    if (wolfAuth && wolfAuth.accessToken) {
        console.log("[FAILOVER MANAGER] Primary token (WildHorse_Spirit) is active.");
        activeMaster = wolfAuth;
        failoverState = "PRIMARY_WOLF";
    } else if (rayAuth && rayAuth.accessToken) {
        console.warn("[FAILOVER MANAGER] ⚠️ Primary token expired. Failing over to Ray standby token.");
        activeMaster = rayAuth;
        failoverState = "FAILOVER_RAY";
    } else {
        console.warn("[FAILOVER MANAGER] ⚠️ Both squad tokens offline. Read-only snapshot fallback mode.");
        failoverState = "SNAPSHOT_FALLBACK";
    }

    return { masterAuth: activeMaster, wolfAuth, rayAuth, failoverState };
}

// ----------------------------------------------------------------------------
// [SECTION 10: DLC & ADD-ON EXTRACTION WITH STORE CATALOG FALLBACK] Line 926
// ----------------------------------------------------------------------------
async function enrichDLCGroups(canonicalCommId, mappedGroups, userPurchasedTitles = [], cloudDlcCatalog = {}) {
    const safePurchased = Array.isArray(userPurchasedTitles) ? userPurchasedTitles : [];
    const safeCatalog = (cloudDlcCatalog && typeof cloudDlcCatalog === "object") ? cloudDlcCatalog : {};
    const safeGroups = Array.isArray(mappedGroups) ? mappedGroups : [];

    return safeGroups.map(grp => {
        const groupName = grp.name || "Add-On Content";
        const groupNameLower = groupName.toLowerCase().trim();
        
        const matchedCloudPack = Object.values(safeCatalog).find(pack => {
            if (!pack || typeof pack !== "object") return false;
            const packNameLower = (pack.pack_name || pack.name || "").toLowerCase().trim();
            return packNameLower.includes(groupNameLower) || groupNameLower.includes(packNameLower);
        }) || {};

        const resolvedDlcImage = resolveGamePosterArt([
            grp.trophyGroupIconUrl,
            matchedCloudPack.image,
            matchedCloudPack.posterArt,
            matchedCloudPack.thumbnail
        ]);

        const isUserOwned = safePurchased.some(p => (p && p.name && p.name.toLowerCase().includes(groupNameLower))) ||
                            matchedCloudPack.price === "Free" ||
                            (grp.definedTrophies && typeof grp.definedTrophies === "object" && Object.values(grp.definedTrophies).some(count => count > 0));

        return {
            groupId: grp.trophyGroupId,
            name: groupName,
            title: groupName,
            description: matchedCloudPack.summary || matchedCloudPack.description || `Official PlayStation add-on expansion pack: ${groupName}.`,
            price: matchedCloudPack.price !== undefined ? matchedCloudPack.price : "Store Listing",
            size: matchedCloudPack.size || estimateDlcFileSize(groupName),
            image: resolvedDlcImage,
            isOwned: isUserOwned,
            isDLC: true,
            definedTrophies: grp.definedTrophies || {},
            includedItems: matchedCloudPack.items_included || []
        };
    });
}

// ----------------------------------------------------------------------------
// [SECTION 11: UNIFIED MASTER GAME INGESTION (/psn/games/{commId})] Line 971
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames, userPurchasedTitles = [], cloudDlcCatalog = {}, subTitleId = null, initialConceptId = null) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();

    if (!canonicalCommId.startsWith("NPWR")) {
        console.log(`[PRESERVE SKELETON] ${canonicalCommId} is not an NPWR ID. Preserving existing record.`);
        return globalGames[canonicalCommId] || null;
    }

    const previousRecord = globalGames[canonicalCommId] || {};

    try {
        const isPs5 = platform === "PS5";
        let opt = { npServiceName: isPs5 ? "trophy2" : "trophy" };
        
        let metaRes = await getTitleTrophies(auth, canonicalCommId, "all", opt).catch(() => null);
        if (!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altRes = await getTitleTrophies(auth, canonicalCommId, "all", { npServiceName: altService }).catch(() => null);
            if (altRes && altRes.trophies && altRes.trophies.length > 0) {
                opt.npServiceName = altService;
                metaRes = altRes;
            }
        }

        // STRICT ZERO-DATA-LOSS WRITE-PROTECTION GATE
        if ((!metaRes || !metaRes.trophies || metaRes.trophies.length === 0) && previousRecord.trophies && previousRecord.trophies.length > 0) {
            console.warn(`[WRITE-PROTECTION ACTIVE] Sony returned 0 trophies for ${canonicalCommId}. Preserving existing ${previousRecord.trophies.length} trophies in RTDB.`);
            return previousRecord;
        }

        let groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, opt).catch(() => null);
        if (!groupsRes || !groupsRes.trophyGroups) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            groupsRes = await getTitleTrophyGroups(auth, canonicalCommId, { npServiceName: altService }).catch(() => ({ trophyGroups: [] }));
        }

        const safePoster = resolveGamePosterArt([posterArt, iconArt, previousRecord.posterArt, previousRecord.trophyTitleIconUrl]);

        const mappedTrophies = (metaRes?.trophies && metaRes.trophies.length > 0) ? metaRes.trophies.map(t => {
            const earnedRate = t.trophyEarnedRate || "0.0";
            const tRank = (t.trophyType || "bronze").toLowerCase();
            const targetVal = t.trophyProgressTargetValue ? parseInt(t.trophyProgressTargetValue, 10) : 0;
            return {
                trophyId: t.trophyId,
                name: t.trophyName || "Unknown Trophy",
                title: t.trophyName || "Unknown Trophy",
                description: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                detail: t.trophyDetail || (t.trophyHidden ? "Secret Objective" : "No description available."),
                type: tRank,
                rank: tRank.toUpperCase(),
                icon: t.trophyIconUrl || null,
                groupId: t.trophyGroupId || "default",
                targetValue: targetVal,
                rarity: t.trophyRare !== undefined ? `${t.trophyRare}%` : `${earnedRate}%`,
                earnedRate: earnedRate,
                difficultyTier: getDifficultyTier(earnedRate),
                hidden: !!t.trophyHidden
            };
        }) : (previousRecord.trophies || []);

        const rawGroups = (groupsRes?.trophyGroups && groupsRes.trophyGroups.length > 0) ? groupsRes.trophyGroups.map(g => ({
            ...g,
            trophyGroupId: g.trophyGroupId,
            name: g.trophyGroupName || "Base Game",
            trophyGroupIconUrl: g.trophyGroupIconUrl || null,
            definedTrophies: g.definedTrophies || {}
        })) : (previousRecord.groups || []);

        const enrichedDlcs = await enrichDLCGroups(canonicalCommId, rawGroups, userPurchasedTitles, cloudDlcCatalog);
        const resolvedName = gameName || previousRecord.name || "PlayStation Game";
        const resolvedCusaId = subTitleId || previousRecord.cusaId || previousRecord.titleId || null;

        // Auto Concept Resolution & Multi-Tier Store Fetch
        let resolvedConceptId = initialConceptId || 
                                previousRecord.conceptId || 
                                extractConceptIdFromText(posterArt) || 
                                extractConceptIdFromText(iconArt) || 
                                null;

        if (!resolvedConceptId && resolvedName && resolvedName !== "PlayStation Game") {
            resolvedConceptId = await searchStoreConceptByName(resolvedName);
        }

        let storeListing = previousRecord.storeListing || null;

        if (!storeListing || !storeListing.longDescription) {
            if (resolvedConceptId) {
                console.log(`[STORE SKELETON INGESTION] Pulling Store via concept/${resolvedConceptId} (${resolvedName})...`);
                storeListing = await queryStoreMetadata(resolvedConceptId, false);
            }
            if ((!storeListing || !storeListing.longDescription) && resolvedCusaId) {
                console.log(`[STORE SKELETON INGESTION] Fallback Store lookup via product/${resolvedCusaId}...`);
                const productListing = await queryStoreMetadata(resolvedCusaId, true);
                if (productListing) {
                    storeListing = { ...(storeListing || {}), ...productListing };
                }
            }
        }

        const storeBadges = storeListing?.badges || [];
        const capabilities = inferGameCapabilitiesFromTrophies(resolvedName, mappedTrophies, canonicalCommId, storeBadges);

        const gradeCounts = mappedTrophies.reduce((acc, curr) => {
            const grade = curr.type || "bronze";
            if (acc[grade] !== undefined) acc[grade]++;
            return acc;
        }, { bronze: 0, silver: 0, gold: 0, platinum: 0 });

        const hasDefinedTrophies = definedTrophies && typeof definedTrophies === "object" && Object.keys(definedTrophies).length > 0;
        const resolvedDefinedTrophies = hasDefinedTrophies 
            ? definedTrophies 
            : (previousRecord.definedTrophies || gradeCounts);

        // Store Full Uncompressed Storyline, Animal/Weapon details & Legal info
        const resolvedDescription = storeListing?.longDescription || 
                                    previousRecord.description || 
                                    `Official PlayStation title: ${resolvedName}. Features: ${capabilities.multiplayerType}. Mode: ${capabilities.onlineMode}. Cross-platform play: ${capabilities.isCrossPlatform ? 'Supported' : 'PlayStation Network'}.`;

        const masterGameData = {
            commId: canonicalCommId,
            npCommunicationId: canonicalCommId,
            cusaId: resolvedCusaId,
            titleId: resolvedCusaId,
            conceptId: resolvedConceptId || storeListing?.conceptId || null,
            name: resolvedName,
            description: resolvedDescription,
            storeListing: storeListing,
            storeBadges: storeBadges,
            accessibilityFeatures: storeListing?.accessibility || {},
            platform: platform || previousRecord.platform || "PS5",
            npServiceName: opt.npServiceName,
            posterArt: safePoster,
            trophyTitleIconUrl: iconArt || previousRecord.trophyTitleIconUrl || safePoster,
            fileSize: previousRecord.fileSize || estimateGameFileSize(resolvedName, platform),
            isMultiplayer: capabilities.isMultiplayer,
            isCoOpOnly: capabilities.isCoOpOnly,
            hasCampaign: capabilities.hasCampaign,
            multiplayerType: capabilities.multiplayerType,
            onlineMode: capabilities.onlineMode,
            isCrossPlatform: capabilities.isCrossPlatform,
            crossPlayPlatforms: capabilities.crossPlayPlatforms,
            psPlusRequired: capabilities.psPlusRequired,
            multiplayerInfo: capabilities,
            definedTrophies: resolvedDefinedTrophies,
            totalTrophies: mappedTrophies.length || previousRecord.totalTrophies || 0,
            trophies: mappedTrophies,
            groups: rawGroups,
            dlcs: enrichedDlcs,
            rawSonyMetadata: (metaRes && metaRes.trophies && metaRes.trophies.length > 0) ? metaRes : (previousRecord.rawSonyMetadata || {}),
            lastUpdated: new Date().toISOString()
        };

        globalGames[canonicalCommId] = masterGameData;
        await syncNodeToFirebase(`games/${canonicalCommId}`, masterGameData);
        return masterGameData;
    } catch (err) {
        console.warn(`[SKELETON ERROR] Failed to ingest skeleton for ${canonicalCommId}:`, err.message);
        return globalGames[canonicalCommId] || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION 12: DEEP TROPHY PROGRESS WITH PS5 OBJECTIVE RATIOS (x/x)] Line 1144
// ----------------------------------------------------------------------------
async function ingestTrophySubtreeForTitle(auth, targetId, commId, titleName, platform, globalGames, existingGameProgress = {}) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();

    try {
        let opt = { npServiceName: (platform === "PS5" || globalGames[canonicalCommId]?.npServiceName === "trophy2") ? "trophy2" : "trophy" };
        
        let earnedRes = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", opt).catch(() => ({}));
        let groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, canonicalCommId, opt).catch(() => ({}));

        if (!earnedRes || !earnedRes.trophies || earnedRes.trophies.length === 0) {
            const altService = opt.npServiceName === "trophy2" ? "trophy" : "trophy2";
            const altEarned = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", { npServiceName: altService }).catch(() => ({}));
            if (altEarned && altEarned.trophies && altEarned.trophies.length > 0) {
                opt.npServiceName = altService;
                earnedRes = altEarned;
                groupEarningsRes = await getUserTrophyGroupEarningsForTitle(auth, targetId, canonicalCommId, { npServiceName: altService }).catch(() => ({}));
            }
        }

        let earnedStatus = earnedRes?.trophies || [];
        
        if (earnedRes?.totalItemCount && earnedRes.totalItemCount > earnedStatus.length) {
            let earnedOffset = earnedStatus.length;
            while (earnedOffset < earnedRes.totalItemCount) {
                const moreEarned = await getUserTrophiesEarnedForTitle(auth, targetId, canonicalCommId, "all", { ...opt, offset: earnedOffset, limit: 100 }).catch(() => ({}));
                const nextBatch = moreEarned?.trophies || [];
                if (nextBatch.length === 0) break;
                earnedStatus.push(...nextBatch);
                earnedOffset += nextBatch.length;
            }
        }

        const activeSkeleton = globalGames[canonicalCommId] || {};
        const skeletonTrophies = activeSkeleton.trophies || [];
        const standaloneProgressMap = { ...(existingGameProgress || {}) };
        const earnedTrophiesList = [];

        earnedStatus.forEach(s => {
            const skelTrophy = skeletonTrophies.find(t => t.trophyId === s.trophyId);
            const currentProgress = s.progress !== undefined ? parseInt(s.progress, 10) : (s.trophyProgress !== undefined ? parseInt(s.trophyProgress, 10) : 0);
            const targetVal = skelTrophy?.targetValue || (s.trophyProgressTargetValue ? parseInt(s.trophyProgressTargetValue, 10) : 0);
            const progressRate = s.progressRate !== undefined ? `${s.progressRate}%` : null;

            let progressRatio = null;
            if (targetVal > 0) {
                progressRatio = `${currentProgress}/${targetVal}`;
            } else if (progressRate) {
                progressRatio = progressRate;
            } else if (currentProgress > 0 && !s.earned) {
                progressRatio = `${currentProgress}%`;
            } else if (s.earned) {
                progressRatio = targetVal > 0 ? `${targetVal}/${targetVal}` : "100%";
            }

            const tRank = (skelTrophy?.type || s.trophyType || "bronze").toLowerCase();

            // PURE OVERLAY RECORD: Stored per player, maps directly to master trophy skeleton
            standaloneProgressMap[s.trophyId] = {
                trophyId: s.trophyId,
                gameTitle: titleName,
                commId: canonicalCommId,
                npCommunicationId: canonicalCommId,
                name: skelTrophy?.name || "Trophy Objective",
                title: skelTrophy?.name || "Trophy Objective",
                detail: skelTrophy?.detail || "Objective detail",
                description: skelTrophy?.detail || "Objective detail",
                icon: skelTrophy?.icon || null,
                type: tRank,
                rank: tRank.toUpperCase(),
                rarity: skelTrophy?.rarity || "Rare",
                earnedRate: skelTrophy?.earnedRate || "0.0",
                difficultyTier: skelTrophy?.difficultyTier || getDifficultyTier(skelTrophy?.earnedRate),
                hidden: !!skelTrophy?.hidden,
                earned: !!s.earned,
                earnedDate: s.earnedDateTime ? new Date(s.earnedDateTime).toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) : null,
                earnedAge: s.earnedDateTime ? getTrophyAgeString(s.earnedDateTime) : null,
                timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                currentValue: currentProgress,
                targetValue: targetVal,
                trophyProgress: currentProgress,
                trophyProgressTargetValue: targetVal,
                progressRate: progressRate,
                subProgressRatio: progressRatio
            };

            if (s.earned) {
                earnedTrophiesList.push({
                    trophyId: s.trophyId,
                    gameTitle: titleName,
                    commId: canonicalCommId,
                    npCommunicationId: canonicalCommId,
                    name: skelTrophy?.name || "Unlocked Trophy",
                    icon: skelTrophy?.icon || null,
                    type: tRank,
                    rank: tRank.toUpperCase(),
                    rarity: skelTrophy?.rarity || "Rare",
                    difficultyTier: skelTrophy?.difficultyTier || getDifficultyTier(skelTrophy?.earnedRate),
                    timestamp: s.earnedDateTime ? new Date(s.earnedDateTime).getTime() : 0,
                    earnedDate: standaloneProgressMap[s.trophyId].earnedDate,
                    earnedAge: standaloneProgressMap[s.trophyId].earnedAge
                });
            }
        });

        earnedTrophiesList.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < earnedTrophiesList.length; i++) {
            if (i === 0) {
                earnedTrophiesList[i].intervalBetweenPreviousTrophy = "First Trophy";
            } else {
                const diffSec = Math.floor((earnedTrophiesList[i].timestamp - earnedTrophiesList[i - 1].timestamp) / 1000);
                earnedTrophiesList[i].intervalBetweenPreviousTrophy = formatDuration(diffSec);
            }
            if (standaloneProgressMap[earnedTrophiesList[i].trophyId]) {
                standaloneProgressMap[earnedTrophiesList[i].trophyId].intervalBetweenPreviousTrophy = earnedTrophiesList[i].intervalBetweenPreviousTrophy;
            }
        }

        return {
            standaloneProgressMap,
            earnedTrophiesList,
            groupEarnings: groupEarningsRes?.trophyGroups || []
        };
    } catch (e) {
        console.warn(`[SUBTREE WARN] Non-destructive preservation applied for ${canonicalCommId}:`, e.message);
        return {
            standaloneProgressMap: existingGameProgress || {},
            earnedTrophiesList: [],
            groupEarnings: []
        };
    }
}

// ----------------------------------------------------------------------------
// [SECTION 13: SMART ACTIVITY DELTA & PRESENCE EVALUATOR] Line 1284
// ----------------------------------------------------------------------------
async function evaluateUserActivityDelta(agentAuth, targetId, knownKey, knownGamerTag, existingData) {
    if (!existingData) {
        return { hasDelta: true, reason: "INITIAL_CREATION", liveOnline: true };
    }

    const isSelf = (agentAuth?.userKey === "wildhorse_spirit" && targetId === ACCOUNT_IDS.wildhorse_spirit) ||
                   (agentAuth?.userKey === "ray" && targetId === ACCOUNT_IDS.ray);
    const targetScope = isSelf ? "me" : targetId;

    let liveOnline = false;
    let liveGameTitle = "Dashboard";

    if (agentAuth) {
        try {
            const pRaw = await getBasicPresence(agentAuth, targetScope);
            const basic = pRaw?.basicPresence || (Array.isArray(pRaw) ? pRaw[0] : (pRaw?.basicPresences ? pRaw.basicPresences[0] : pRaw));
            const status = basic?.primaryPlatformInfo?.onlineStatus || basic?.onlineStatus || "offline";
            liveOnline = (status !== "offline");

            const activeGameInfo = basic?.gameTitleInfoList?.[0] || basic?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            liveGameTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || "Dashboard";
        } catch (e) {}
    }

    const storedOnline = !!existingData.online;
    const hasActiveSession = Object.values(existingData?.playSessions || {}).some(s => s.isActive);

    // Fast-exit wrap: User went offline while a session was actively tracking
    if (hasActiveSession && !liveOnline) {
        return { hasDelta: true, reason: "SESSION_LOGOUT_FINALIZATION", liveOnline: false };
    }

    // ONLINE-ONLY GUARD: If user is offline and has no active tracking sessions, SKIP completely
    if (!liveOnline && !storedOnline) {
        return { hasDelta: false, reason: "OFFLINE_SKIPPED", liveOnline: false };
    }

    if (liveOnline !== storedOnline) {
        return { hasDelta: true, reason: `STATUS_CHANGE (${storedOnline ? 'ONLINE' : 'OFFLINE'} -> ${liveOnline ? 'ONLINE' : 'OFFLINE'})`, liveOnline };
    }

    if (liveOnline) {
        const storedGame = (existingData.currentGame || "Dashboard").toLowerCase().trim();
        const detectedGame = liveGameTitle.toLowerCase().trim();
        if (storedGame !== detectedGame) {
            return { hasDelta: true, reason: `GAME_SWITCH (${storedGame} -> ${detectedGame})`, liveOnline };
        }
    }

    if (agentAuth && liveOnline) {
        try {
            const liveStats = await getUserTrophyProfileSummary(agentAuth, targetId).catch(() => null);
            if (liveStats && liveStats.earnedTrophies) {
                const storedTotal = existingData.trophySummary?.total || 0;
                const liveTotal = (liveStats.earnedTrophies.platinum || 0) + 
                                  (liveStats.earnedTrophies.gold || 0) + 
                                  (liveStats.earnedTrophies.silver || 0) + 
                                  (liveStats.earnedTrophies.bronze || 0);

                if (liveTotal !== storedTotal) {
                    return { hasDelta: true, reason: `NEW_TROPHY_EARNED (${storedTotal} -> ${liveTotal})`, liveOnline };
                }

                if ((liveStats.trophyLevel || 0) !== (existingData.level || 0)) {
                    return { hasDelta: true, reason: `LEVEL_DELTA (${existingData.level} -> ${liveStats.trophyLevel})`, liveOnline };
                }
            }
        } catch (e) {}
    }

    return { hasDelta: false, reason: "UNCHANGED", liveOnline };
}

// ----------------------------------------------------------------------------
// [SECTION 14: FULL USER TELEMETRY INGESTION (SINGLE ROOT commId POINTER)] Line 1357
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames, cloudDlcCatalog = {}) {
    let resolvedTargetId = String(targetId || ACCOUNT_IDS[userKey]);

    if (!auth || !resolvedTargetId) {
        return existingData || null;
    }

    try {
        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch (e) {}

        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;

        const isSelf = (auth.userKey === "wildhorse_spirit" && resolvedTargetId === ACCOUNT_IDS.wildhorse_spirit) ||
                       (auth.userKey === "ray" && resolvedTargetId === ACCOUNT_IDS.ray) ||
                       (resolvedTargetId === "me");

        let presenceTarget = isSelf ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: "offline", platform: null }, gameTitleInfoList: [] };

        try { 
            const raw = await getBasicPresence(auth, presenceTarget); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch (e) {
            if (presenceTarget !== "me") {
                try {
                    const retryRaw = await getBasicPresence(auth, "me"); 
                    rawP = retryRaw?.basicPresence || (Array.isArray(retryRaw) ? retryRaw[0] : (retryRaw?.basicPresences ? retryRaw.basicPresences[0] : retryRaw)) || rawP;
                } catch (err2) {}
            }
        }

        const isPlayerOnline = (rawP?.primaryPlatformInfo?.onlineStatus || rawP?.onlineStatus || "offline") !== "offline";

        // FAST 1-PASS SESSION WRAP: If player is offline, close session and exit without burning API calls
        if (!isPlayerOnline && existingData) {
            const hasActive = Object.values(existingData?.playSessions || {}).some(s => s.isActive);
            if (hasActive) {
                console.log(`[OFFLINE CLOSE] Finalizing pending play session for offline player: ${canonicalOnlineId}...`);
                const { playSessions } = updateGameSessionTracking(existingData, null, "Dashboard", false, null);
                
                const closedRecord = {
                    ...existingData,
                    online: false,
                    currentGame: "Dashboard",
                    currentGameId: null,
                    playSessions: playSessions,
                    lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
                };
                
                await syncNodeToFirebase(`gamertags/${canonicalOnlineId}`, closedRecord);
                return closedRecord;
            }
        }

        let region = { country: "US", language: "en" };
        if (isSelf) {
            try { region = await getUserRegion(auth, "me"); } catch (e) {}
        }

        let devices = [];
        if (isSelf) {
            try {
                const devRes = await getAccountDevices(auth);
                devices = devRes?.devices || devRes || [];
            } catch (e) {}
        }

        let shareableProfile = null;
        if (isSelf) {
            try { shareableProfile = await getProfileShareableLink(auth); } catch (e) {}
        }

        let friendsList = [];
        let blockedUsers = [];
        let friendRequests = [];
        try {
            const friendsRes = await getUserFriendsAccountIds(auth, resolvedTargetId).catch(() => ({}));
            friendsList = friendsRes?.friends || [];
        } catch (e) {}

        if (isSelf) {
            try {
                const blockedRes = await getUserBlockedAccountIds(auth).catch(() => ({}));
                blockedUsers = blockedRes?.blockedUsers || [];
            } catch (e) {}
            try {
                const reqRes = await getUserFriendsRequests(auth).catch(() => ({}));
                friendRequests = reqRes?.receivedRequests || [];
            } catch (e) {}
        }

        let purchasedGames = [];
        if (isSelf) {
            try {
                const pRes = await getPurchasedGames(auth, { limit: 100 }).catch(() => ({}));
                purchasedGames = pRes?.titles || [];
            } catch (e) {}
        }

        let sortedTitles = [];
        let totalGamesPlayedCount = 0;
        try {
            let offset = 0;
            const pageSize = 800;
            let keepFetching = true;

            while (keepFetching) {
                const pageRes = await getUserTitles(auth, resolvedTargetId, { limit: pageSize, offset }).catch(() => ({}));
                const titles = pageRes?.trophyTitles || [];
                sortedTitles.push(...titles);
                totalGamesPlayedCount = pageRes?.totalItemCount || sortedTitles.length;
                if (titles.length === 0 || sortedTitles.length >= totalGamesPlayedCount) {
                    keepFetching = false;
                } else {
                    offset += titles.length;
                }
            }
            sortedTitles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
        } catch (err) {}

        let telemetryData = [];
        try {
            if (isSelf) {
                const history = await getRecentlyPlayedGames(auth, { limit: 100 });
                telemetryData = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
            } else {
                const playedRes = await getUserPlayedGames(auth, resolvedTargetId, { limit: 100 });
                telemetryData = playedRes?.titles || [];
            }
        } catch (e) {}

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        const mergedGamesMap = new Map();

        // Ingest native playtime & recently played titles
        telemetryData.forEach(g => {
            const commId = g.npCommunicationId;
            const titleId = g.titleId || g.npTitleId;
            if (!commId && !titleId) return;

            const parsedSeconds = parseIsoDuration(g.playDuration);
            const gameArt = resolveGamePosterArt([
                g.image?.url,
                g.imageUrl,
                g.conceptIconUrl,
                g.boxart,
                g.trophyTitleIconUrl
            ]);

            const gameRecord = {
                ...g,
                npCommunicationId: commId || null,
                npTitleId: titleId || null,
                titleId: titleId || null,
                name: g.name || "Unknown Game",
                platform: normalizePlatform(g),
                art: gameArt,
                posterArt: gameArt,
                conceptId: g.conceptId || extractConceptIdFromText(g.conceptIconUrl) || null,
                playCount: g.playCount || 1,
                playDuration: g.playDuration || null,
                nativePlaytimeSeconds: parsedSeconds,
                nativePlaytimeFormatted: formatDuration(parsedSeconds),
                nativePlaytimeHours: Math.round((parsedSeconds / 3600) * 10) / 10,
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null,
                progress: 0,
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy")
            };

            if (commId) mergedGamesMap.set(commId, gameRecord);
            if (titleId) mergedGamesMap.set(titleId, gameRecord);
        });

        // Ingest trophy titles catalog
        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            const titleId = t.npTitleId;
            if (!commId && !titleId) return;

            const existing = (commId && mergedGamesMap.get(commId)) || (titleId && mergedGamesMap.get(titleId)) || {
                npCommunicationId: commId || null,
                npTitleId: titleId || null,
                name: t.trophyTitleName || t.name || "Unknown Game",
                platform: normalizePlatform(t),
                art: null,
                posterArt: null,
                playCount: t.playCount || 1,
                lastPlayed: t.lastUpdatedDateTime || t.lastPlayed || null
            };

            const fallbackArt = resolveGamePosterArt([
                existing.art,
                t.trophyTitleIconUrl,
                t.conceptIconUrl,
                t.imageUrl
            ]);

            Object.assign(existing, t); 
            existing.name = existing.name !== "Unknown Game" ? existing.name : (t.trophyTitleName || "Unknown Game");
            existing.art = fallbackArt;
            existing.posterArt = fallbackArt;
            existing.trophyTitleIconUrl = fallbackArt;
            existing.conceptId = existing.conceptId || t.conceptId || extractConceptIdFromText(t.conceptIconUrl) || null;
            existing.platform = normalizePlatform(t);
            existing.progress = t.progress || 0;
            existing.definedTrophies = t.definedTrophies || {};
            existing.earnedTotal = (t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0);
            existing.definedTotal = (t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0);
            existing.completionRatio = existing.definedTotal > 0 ? `${Math.round((existing.earnedTotal / existing.definedTotal) * 100)}%` : "0%";

            if (commId) mergedGamesMap.set(commId, existing);
            if (titleId) mergedGamesMap.set(titleId, existing);
        });

        const allRecentGames = Array.from(new Set(mergedGamesMap.values())).sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || 
                               rawP?.primaryPlatformInfo?.gameTitleInfoList?.[0] || 
                               {};
        
        let activeCommId = activeGameInfo.npCommunicationId || null;
        let activeTitleId = activeGameInfo.npTitleId || activeGameInfo.titleId || null;
        let resolvedTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || activeGameInfo.formatValue || null;

        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) {
            resolvedTitle = mergedGamesMap.get(activeCommId).name;
        }
        if (!resolvedTitle && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            resolvedTitle = mergedGamesMap.get(activeTitleId).name;
        }
        if (!resolvedTitle) {
            resolvedTitle = isPlayerOnline ? "Dashboard" : (existingData?.currentGame || "Dashboard");
        }

        let canonicalActiveCommId = null;
        if (activeCommId && String(activeCommId).startsWith("NPWR")) {
            canonicalActiveCommId = activeCommId;
        }

        if (!canonicalActiveCommId && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            const record = mergedGamesMap.get(activeTitleId);
            if (record?.npCommunicationId && String(record.npCommunicationId).startsWith("NPWR")) {
                canonicalActiveCommId = record.npCommunicationId;
            }
        }

        if (!canonicalActiveCommId && resolvedTitle && resolvedTitle !== "Dashboard") {
            const cleanResolved = resolvedTitle.toLowerCase().replace(/®|™/g, '').trim();
            for (const g of allRecentGames) {
                const gName = (g.name || g.trophyTitleName || '').toLowerCase().replace(/®|™/g, '').trim();
                if (gName === cleanResolved && g.npCommunicationId && String(g.npCommunicationId).startsWith("NPWR")) {
                    canonicalActiveCommId = g.npCommunicationId;
                    break;
                }
            }
        }

        // Persistent Pointer: Anchor commId for external site lookups
        const fallbackCommId = allRecentGames[0]?.npCommunicationId || 
                               existingData?.commId || 
                               existingData?.activeHunt?.commId || 
                               "NPWR_ACTIVE";

        const persistentRootCommId = (canonicalActiveCommId && canonicalActiveCommId !== "Dashboard")
            ? canonicalActiveCommId
            : fallbackCommId;

        const isDashboard = !resolvedTitle || resolvedTitle.toUpperCase() === "DASHBOARD";

        // Checkpoint-based incremental playtime tracking
        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } = updateGameSessionTracking(
            existingData,
            persistentRootCommId,
            resolvedTitle,
            isPlayerOnline,
            activeTitleId
        );

        // Ingest Master Game Skeletons into /psn/games/
        for (const g of allRecentGames.slice(0, 20)) {
            const syncId = g.npCommunicationId;
            if (syncId && String(syncId).startsWith("NPWR")) {
                await ensureGameSkeleton(
                    auth,
                    syncId,
                    g.name,
                    normalizePlatform(g),
                    g.art,
                    g.trophyTitleIconUrl,
                    g.definedTrophies,
                    globalGames,
                    purchasedGames,
                    cloudDlcCatalog,
                    g.titleId || g.npTitleId,
                    g.conceptId
                );
            }
        }

        const matchedGame = (persistentRootCommId && mergedGamesMap.get(persistentRootCommId)) || (resolvedTitle !== "Dashboard" ? allRecentGames[0] : null) || {};

        const hwContext = parseDetailedHardwareContext(rawP, matchedGame);

        const resolvedPoster = isDashboard ? null : resolveGamePosterArt([
            (persistentRootCommId && mergedGamesMap.get(persistentRootCommId)?.art),
            (activeTitleId && mergedGamesMap.get(activeTitleId)?.art),
            matchedGame.art,
            matchedGame.trophyTitleIconUrl,
            existingData?.currentGameArt
        ]);

        const persistentLifetimeFormatted = matchedGame.nativePlaytimeFormatted || 
                                           existingData?.currentGameHours || 
                                           existingData?.activeHunt?.hoursFormatted || 
                                           "0 hrs";

        const persistentLifetimeNumeric = matchedGame.nativePlaytimeHours || 
                                         existingData?.currentGameNumericHours || 
                                         existingData?.activeHunt?.numericHours || 
                                         0;

        const safePlaytimeFormatted = (currentGameDurationFormatted && currentGameDurationFormatted !== "0 hrs" && currentGameDurationFormatted !== "< 1 min")
            ? currentGameDurationFormatted
            : persistentLifetimeFormatted;

        const safeNumericHours = (activeSessionSeconds > 0)
            ? (Math.round((activeSessionSeconds / 3600) * 10) / 10)
            : persistentLifetimeNumeric;

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;
        
        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
        const cumulativeUnlockedTrophies = [];

        const titlesToIngestProgress = [
            ...(persistentRootCommId ? [persistentRootCommId] : []),
            ...allRecentGames.slice(0, 10).map(g => g.npCommunicationId).filter(id => id && String(id).startsWith("NPWR") && id !== persistentRootCommId)
        ];

        for (const cId of titlesToIngestProgress) {
            const gMeta = mergedGamesMap.get(cId) || globalGames[cId] || {};
            const gPlat = normalizePlatform(gMeta);
            const gName = gMeta.name || "PlayStation Title";
            
            const subtree = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, cId, gName, gPlat, globalGames, liveTrophyProgress[cId]);
            if (subtree && subtree.standaloneProgressMap) {
                liveTrophyProgress[cId] = subtree.standaloneProgressMap;
                
                if (subtree.earnedTrophiesList && subtree.earnedTrophiesList.length > 0) {
                    cumulativeUnlockedTrophies.push(...subtree.earnedTrophiesList);
                }

                if (cId === persistentRootCommId) {
                    const sortedEarned = [...subtree.earnedTrophiesList].sort((a, b) => a.timestamp - b.timestamp);
                    const earliestActiveTrophyTimestamp = sortedEarned.length > 0 ? sortedEarned[0].timestamp : null;

                    activeHunt = { 
                        npCommunicationId: persistentRootCommId, 
                        commId: persistentRootCommId, 
                        conceptId: globalGames[persistentRootCommId]?.conceptId || matchedGame.conceptId || null,
                        titleId: isDashboard ? null : activeTitleId, 
                        cusaId: isDashboard ? null : activeTitleId, 
                        title: matchedGame.name || resolvedTitle, 
                        description: globalGames[persistentRootCommId]?.description || null,
                        storeListing: globalGames[persistentRootCommId]?.storeListing || null,
                        storeBadges: globalGames[persistentRootCommId]?.storeBadges || [],
                        accessibilityFeatures: globalGames[persistentRootCommId]?.accessibilityFeatures || {},
                        platform: hwContext.activeHardware, 
                        gameBuildVersion: hwContext.gameBuildVersion, 
                        isStreamingRemotePlay: hwContext.isStreamingRemotePlay, 
                        art: resolvedPoster, 
                        hoursPlayed: safePlaytimeFormatted, 
                        hoursFormatted: safePlaytimeFormatted, 
                        numericHours: safeNumericHours, 
                        amazonAffiliateUrl: generateAffiliateUrl(matchedGame.name || resolvedTitle), 
                        progress: matchedGame.progress || 0, 
                        firstTrophyTimestamp: earliestActiveTrophyTimestamp,
                        firstTrophyDate: earliestActiveTrophyTimestamp ? new Date(earliestActiveTrophyTimestamp).toISOString() : null,
                        velocity: {
                            completionStatus: `${matchedGame.earnedTotal || 0}/${matchedGame.definedTotal || 0}`,
                            ratio: matchedGame.completionRatio || "0%"
                        },
                        groupEarnings: subtree.groupEarnings,
                        dlcs: globalGames[persistentRootCommId]?.dlcs || []
                    };
                }
            }
        }

        const preExistingRecent = existingData?.mostRecentTrophies || [];
        const mergedRecentMap = new Map();

        preExistingRecent.forEach(t => {
            if (t && t.trophyId) mergedRecentMap.set(`${t.commId || ''}_${t.trophyId}`, t);
        });
        cumulativeUnlockedTrophies.forEach(t => {
            if (t && t.trophyId) mergedRecentMap.set(`${t.commId || ''}_${t.trophyId}`, t);
        });

        const unifiedMostRecentTrophies = Array.from(mergedRecentMap.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 25);

        // Core presence: single commId foreign key pointer, clean SKU & human-readable title
        const presence = {
            online: isPlayerOnline,
            currentGame: resolvedTitle,                         // Human Readable Title
            commId: persistentRootCommId,                         // SINGLE commId key pointer to /psn/games/{commId}
            currentGameId: isDashboard ? null : activeTitleId,    // Product SKU (PPSA/CUSA) or null when on Dashboard
            conceptId: globalGames[persistentRootCommId]?.conceptId || matchedGame.conceptId || null,
            currentGameArt: resolvedPoster,
            currentGameHours: safePlaytimeFormatted,
            currentGameNumericHours: safeNumericHours,
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            platform: hwContext.activeHardware,
            gameBuildVersion: hwContext.gameBuildVersion,
            isStreamingRemotePlay: hwContext.isStreamingRemotePlay,
            displayPlatform: hwContext.displayPlatformLabel,
            rawPresence: rawP
        };

        return {
            onlineId: canonicalOnlineId, 
            accountId: resolvedTargetId,
            commId: persistentRootCommId,                         // SINGLE root commId foreign key pointer
            conceptId: globalGames[persistentRootCommId]?.conceptId || matchedGame.conceptId || null,
            storeListing: globalGames[persistentRootCommId]?.storeListing || null,
            storeBadges: globalGames[persistentRootCommId]?.storeBadges || [],
            accessibilityFeatures: globalGames[persistentRootCommId]?.accessibilityFeatures || {},
            npssoValid: true,
            npssoStatus: "ACTIVE",
            handshakeText: `${canonicalOnlineId.toUpperCase()} HANDSHAKE: FIREBASE LIVE`,
            handshakeState: "LIVE",
            avatar: profile?.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || existingData?.avatar || "", 
            allAvatars: profile?.avatars || existingData?.allAvatars || [],
            bio: profile?.aboutMe || existingData?.bio || "Official Pack Member Profile", 
            plus: !!profile?.isPlus,
            region: region?.country || "US",
            language: region?.language || "en",
            rawProfile: profile || existingData?.rawProfile || {},
            devices: devices,
            shareableProfile: shareableProfile,
            friendsList: friendsList,
            blockedUsers: blockedUsers,
            friendRequests: friendRequests,
            purchasedGames: purchasedGames,
            ...presence, 
            gamesPlayed: totalGamesPlayedCount || existingData?.gamesPlayed || 0,
            psnAccountAge: calculateAgeString(earliestEntry), 
            earliestTrophyDate: earliestEntry,
            latestTrophyDate: unifiedMostRecentTrophies[0]?.timestamp || new Date().getTime(),
            level: stats?.trophyLevel || existingData?.level || 0, 
            playSessions: playSessions,
            liveTrophyProgress: liveTrophyProgress,
            trophySummary: { 
                ...stats,
                platinum: stats?.earnedTrophies?.platinum ?? existingData?.trophySummary?.platinum ?? 0, 
                gold: stats?.earnedTrophies?.gold ?? existingData?.trophySummary?.gold ?? 0, 
                silver: stats?.earnedTrophies?.silver ?? existingData?.trophySummary?.silver ?? 0, 
                bronze: stats?.earnedTrophies?.bronze ?? existingData?.trophySummary?.bronze ?? 0, 
                total: ((stats?.earnedTrophies?.platinum || 0) + (stats?.earnedTrophies?.gold || 0) + (stats?.earnedTrophies?.silver || 0) + (stats?.earnedTrophies?.bronze || 0)) || existingData?.trophySummary?.total || 0, 
                trophyLevel: stats?.trophyLevel || existingData?.level || 0,
                progress: stats?.progress || existingData?.trophySummary?.progress || 0,
                tier: stats?.tier || 0
            },
            recentGames: allRecentGames.length > 0 ? allRecentGames : (existingData?.recentGames || []),
            activeHunt: activeHunt || existingData?.activeHunt || null, 
            mostRecentTrophies: unifiedMostRecentTrophies, 
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) { 
        console.error(`[TELEMETRY CRITICAL ERROR] For ${targetId}: ${e.message}`);
        return existingData || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION 15: SQUAD LEADERBOARDS & SOCIAL OVERLAP] Line 1772
// ----------------------------------------------------------------------------
function buildSquadIntelligence(allGamertagsData) {
    const players = Object.values(allGamertagsData || {});
    if (players.length === 0) return { leaderboard: [], squadTotals: {}, socialOverlap: {} };

    const leaderboard = players.map(p => ({
        onlineId: p.onlineId || "Unknown Player",
        accountId: p.accountId || null,
        level: p.level || 0,
        platinum: p.trophySummary?.platinum || 0,
        gold: p.trophySummary?.gold || 0,
        silver: p.trophySummary?.silver || 0,
        bronze: p.trophySummary?.bronze || 0,
        totalTrophies: p.trophySummary?.total || 0,
        gamesPlayed: p.gamesPlayed || 0,
        isOnline: !!p.online,
        currentGame: p.currentGame || "Dashboard",
        commId: p.commId || null,
        conceptId: p.conceptId || null,
        currentGameId: p.currentGameId || null,
        platform: p.platform || "PS5",
        gameBuildVersion: p.gameBuildVersion || "PS5 Native Game",
        isStreamingRemotePlay: !!p.isStreamingRemotePlay
    })).sort((a, b) => (b.level - a.level) || (b.platinum - a.platinum) || (b.totalTrophies - a.totalTrophies));

    const squadTotals = leaderboard.reduce((acc, curr) => {
        acc.totalPlatinums += curr.platinum;
        acc.totalGold += curr.gold;
        acc.totalSilver += curr.silver;
        acc.totalBronze += curr.bronze;
        acc.cumulativeTrophies += curr.totalTrophies;
        acc.totalGamesEncountered += curr.gamesPlayed;
        return acc;
    }, { totalPlatinums: 0, totalGold: 0, totalSilver: 0, totalBronze: 0, cumulativeTrophies: 0, totalGamesEncountered: 0 });

    const socialOverlap = {};
    players.forEach(p => {
        const myFriends = new Set(p.friendsList || []);
        const playerKey = p.onlineId || p.accountId;
        socialOverlap[playerKey] = {};
        players.forEach(other => {
            if (p.accountId !== other.accountId) {
                const otherFriends = other.friendsList || [];
                const mutuals = otherFriends.filter(fId => myFriends.has(fId));
                socialOverlap[playerKey][other.onlineId || other.accountId] = {
                    mutualCount: mutuals.length,
                    sharedFriendAccountIds: mutuals
                };
            }
        });
    });

    return { leaderboard, squadTotals, socialOverlap };
}

// ----------------------------------------------------------------------------
// [SECTION 16: MASTER EXECUTION & GITHUB ACTIONS RUNNER] Line 1827
// ----------------------------------------------------------------------------
async function executeSyncPass() {
    try {
        console.log(`[INIT] Starting Full PSN Engine v66.0.0 at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })} EDT...`);

        await loadPersistentTokens();

        const siteUsersRaw = await resilientFetch(buildRtdbUrl("/users")).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(buildRtdbUrl("/user_secrets")).then(r => r.json()).catch(() => ({}));
        const cloudDlcCatalog = await resilientFetch(buildRtdbUrl("/woth2_cloud/data/dlcs")).then(r => r.json()).catch(() => ({}));

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};

        let wolfNpsso = process.env.PSN_NPSSO_WEREWOLF || "";
        let rayNpsso = process.env.PSN_NPSSO_RAY || "";

        if (siteUsersRaw && typeof siteUsersRaw === "object") {
            Object.entries(siteUsersRaw).forEach(([emailKey, u]) => {
                const gaming = u.gaming_platforms || u;
                const tag = (gaming.psn_username || u.username || "").toLowerCase();
                const secretCookie = userSecretsRaw?.[emailKey]?.psn_npsso || gaming.psn_npsso;
                
                if (secretCookie && secretCookie.length >= 20) {
                    if (tag.includes("wildhorse_spirit") || tag.includes("werewolf")) wolfNpsso = secretCookie;
                    if (tag.includes("onelividman") || tag.includes("ray")) rayNpsso = secretCookie;
                }
            });
        }

        const sessionState = await resolveMasterSession(wolfNpsso, rayNpsso);
        const { masterAuth, failoverState } = sessionState;

        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = failoverState === "FAILOVER_RAY" 
            ? "RUNNING ON BACKUP (Ray Active)" 
            : (failoverState === "PRIMARY_WOLF" ? "PRIMARY HEALTHY (Werewolf Running)" : "READ-ONLY SNAPSHOT MODE");

        let finalData = { 
            gamertags: { ...(previousFirebaseData?.gamertags || {}) }, 
            usersByGamerTag: { ...(previousFirebaseData?.usersByGamerTag || {}) }, 
            games: globalGames, 
            squadLeaderboard: [], 
            squadAnalytics: {}, 
            mutualSquadFollowers: [], 
            authDiagnostics: diagnosticReport, 
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }), 
            engineVersion: "66.0.0", 
            analyticsTag: GA4_MEASUREMENT_ID, 
            codeTimestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) + " EDT"
        };

        const activeCanonicalGamertags = new Set();
        let anyProfileUpdated = false;

        if (masterAuth && masterAuth.accessToken) {
            console.log(`[CORE PACK] Ingesting Core 4 squad members using session: ${masterAuth.userKey}...`);
            for (const member of CORE_PACK) {
                const existingData = previousFirebaseData?.gamertags?.[member.tag];
                const deltaCheck = await evaluateUserActivityDelta(masterAuth, member.id, member.key, member.tag, existingData);

                // STRICT ONLINE-ONLY GUARD: Skip if offline and no active session closure needed
                if (!deltaCheck.hasDelta && existingData) {
                    console.log(`[SKIP - NO DELTA] Core member ${member.tag}: ${deltaCheck.reason}.`);
                    activeCanonicalGamertags.add(member.tag);
                    continue;
                }

                console.log(`[SYNC TRIGGERED] Processing Core member ${member.tag} (${deltaCheck.reason})...`);
                const data = await getFullUserData(masterAuth, member.tag, member.key, member.id, existingData, true, globalGames, cloudDlcCatalog);

                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    anyProfileUpdated = true;
                    data.npssoValid = true;
                    data.npssoStatus = "ACTIVE";

                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);

                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}/npssoValid`, true);
                }
            }
        } else {
            console.warn("[CORE PACK HALT] Neither WildHorse_Spirit nor Ray is active. Preserving existing squad records.");
            CORE_PACK.forEach(m => activeCanonicalGamertags.add(m.tag));
        }

        if (siteUsersRaw && typeof siteUsersRaw === "object") {
            for (const [emailKey, userRecord] of Object.entries(siteUsersRaw)) {
                const gaming = userRecord.gaming_platforms || userRecord;
                const tag = (gaming.psn_username || userRecord.username || "").trim();
                const accountId = gaming.psn_account_id ? String(gaming.psn_account_id).trim() : null;
                const rawNpsso = userSecretsRaw?.[emailKey]?.psn_npsso || gaming.psn_npsso;

                const isCore = CORE_PACK.some(m => m.tag.toLowerCase() === tag.toLowerCase() || m.id === accountId);
                if (isCore) continue;

                if (!rawNpsso || rawNpsso.length < 20) {
                    console.log(`[OUTSIDE USER - BYPASSED] ${tag || emailKey}: No private NPSSO cookie.`);
                    continue;
                }

                console.log(`[OUTSIDE AUTH] Handshaking personal session for ${tag || emailKey}...`);
                const userAuth = await getAuthenticated(emailKey, rawNpsso);

                if (!userAuth || !userAuth.accessToken) {
                    console.warn(`[OUTSIDE AUTH EXPIRED] Cookie invalid for ${tag || emailKey}. Skipping.`);
                    await resilientFetch(buildRtdbUrl(`/users/${emailKey}/psn_npsso_valid`), {
                        method: "PUT",
                        body: JSON.stringify(false)
                    });
                    continue;
                }

                const existingData = previousFirebaseData?.gamertags?.[tag];
                const deltaCheck = await evaluateUserActivityDelta(userAuth, accountId || "me", emailKey, tag, existingData);

                if (!deltaCheck.hasDelta && existingData) {
                    console.log(`[SKIP - NO DELTA] Outside user ${tag || emailKey}: ${deltaCheck.reason}.`);
                    if (existingData.onlineId) activeCanonicalGamertags.add(existingData.onlineId);
                    continue;
                }

                console.log(`[OUTSIDE SYNC] Processing ${tag || emailKey} (${deltaCheck.reason})...`);
                const data = await getFullUserData(userAuth, tag, emailKey, accountId || "me", existingData, true, globalGames, cloudDlcCatalog);

                if (data && data.onlineId) {
                    activeCanonicalGamertags.add(data.onlineId);
                    anyProfileUpdated = true;
                    data.npssoValid = true;
                    data.npssoStatus = "ACTIVE";

                    finalData.gamertags[data.onlineId] = data;
                    finalData.usersByGamerTag[data.onlineId] = String(data.accountId);

                    await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                    await syncNodeToFirebase(`gamertags/${data.onlineId}/npssoValid`, true);
                    
                    await resilientFetch(buildRtdbUrl(`/users/${emailKey}/psn_npsso_valid`), {
                        method: "PUT",
                        body: JSON.stringify(true)
                    });
                }
            }
        }

        const existingRemoteKeys = Object.keys(previousFirebaseData?.gamertags || {});
        for (const oldKey of existingRemoteKeys) {
            if (!activeCanonicalGamertags.has(oldKey)) {
                console.log(`[LIFECYCLE PURGE] Purging stale entry '${oldKey}' from Firebase...`);
                await deleteNodeFromFirebase(`gamertags/${oldKey}`);
                anyProfileUpdated = true;
            }
        }

        const squadIntel = buildSquadIntelligence(finalData.gamertags);
        finalData.squadLeaderboard = squadIntel.leaderboard;
        finalData.squadAnalytics = {
            totals: squadIntel.squadTotals,
            socialOverlap: squadIntel.socialOverlap,
            calculatedAt: new Date().toISOString()
        };

        if (anyProfileUpdated) {
            await syncNodeToFirebase("usersByGamerTag", finalData.usersByGamerTag);
            await syncNodeToFirebase("leaderboard", finalData.squadLeaderboard);
            await syncNodeToFirebase("squadAnalytics", finalData.squadAnalytics);
            await syncNodeToFirebase("lastGlobalUpdate", finalData.lastGlobalUpdate);
        }

        diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
        await syncNodeToFirebase("authDiagnostics", diagnosticReport);

        console.log(`[SUCCESS] Full PSN Engine v66.0.0 completed. Profiles updated: ${anyProfileUpdated ? 'YES' : 'NONE (IDLE)'}.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

// [SECTION 17: RUNNER INVOCATION] Line 2026
(async () => {
    await executeSyncPass();
    process.exit(0);
})();
