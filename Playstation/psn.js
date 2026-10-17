/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: UNIFIED Master PSN Telemetry Engine (v50 + v68 merged, nothing dropped):
 *   1. Universal Account Roster FROM THE RTDB: reads /users + /user_secrets for each
 *      player's psn_username, psn_account_id, psn_npsso (cookie) and twitch handle.
 *      Core pack members and any extra RTDB user are processed through identical logic.
 *   2. Universal NPWR Communication ID Resolution (v50): locks the canonical NPWR commId
 *      for every user, now matching playtime records to trophy records by commId,
 *      titleId, skeleton link, AND normalized title+platform (fixes hours mismatches).
 *   3. Hours Tracker (v68) + Sony native playtime: per-game checkpoint accumulator,
 *      respects manualBaselineHours in RTDB, and never reports less than Sony's value.
 *   4. Master Skeleton /psn/games/{commId}, User Overlays /psn/gamertags/{onlineId}.
 *   5. Universal Multi-Game Trophy Vault with PS5 objective ratios (x/x), 2026+ filter,
 *      plus "squad focus" titles so friends' progress on the game being hunted is kept.
 *   6. Real-Time Active Game Poster Engine + Trophy-Driven Mode Inference + Store parsing.
 *   7. Twitch Intelligence (v50) for every user that has a handle (cached per run).
 *   8. Smart Presence Gatekeeper (v50) + per-user Activity Delta (v68).
 *   9. Hot-Standby Failover (v50): users without a valid cookie are still synced with the
 *      best available squad session instead of being skipped.
 *  10. Local psn.json mirror (v50) + Firebase REST pipeline + clean process.exit(0).
 * Analytics Tagging: G-CTYHDF4MSD (Deployable via GTM).
 * Version: 69.0.0 - Unified Merge (all v50 + v68 features retained)
 * Date & Time Stamp: 2026-10-17 EDT (America/New_York)
 * ============================================================================ */

// [SECTION 1: IMPORTS & CORE CONFIGURATION]
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
    getPurchasedGames,
    makeUniversalSearch
} = psnApi;

const FIREBASE_BASE_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/psn";
const RTDB_ROOT_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const GA4_MEASUREMENT_ID = "G-CTYHDF4MSD";
const LOCAL_JSON_PATH = path.join(__dirname, "psn.json");
const ROOT_LOCAL_JSON_PATH = path.join(__dirname, "..", "psn.json");
const LOCAL_TOKENS_PATH = path.join(__dirname, ".psn_tokens.json");

// Squad Gamertag roster mappings (v50)
const SQUAD_GAMERTAGS = {
    wildhorse_spirit: "WildHorse_Spirit",
    ray: "OneLIVIDMAN",
    darkwing: "Darkwing69420",
    marc: "DesdemonaTiger"
};

// Squad Twitch handle mappings (v50) - RTDB twitch handles override/extend these
const TWITCH_MAP = {
    wildhorse_spirit: "werewolf3788",
    ray: "raymystyro",
    darkwing: "terrdog420",
    marc: ""
};

// Squad PSN Account ID mappings - used only when the RTDB has no psn_account_id
const ACCOUNT_IDS = {
    wildhorse_spirit: "4087137467908566201",
    ray: "2732733730346312494",
    darkwing: "4398462806362115916",
    marc: "6551906246515882523"
};

const CORE_PACK = Object.entries(SQUAD_GAMERTAGS).map(([key, tag]) => ({ key, tag, id: ACCOUNT_IDS[key] }));

// Names each core member may be registered under in the RTDB /users records (exact, lowercase)
const CORE_ALIASES = {
    wildhorse_spirit: ["wildhorse_spirit", "werewolf3788", "werewolf"],
    ray: ["onelividman", "raymystyro", "ray"],
    darkwing: ["darkwing69420", "darkwing", "terrdog420", "terrdog"],
    marc: ["desdemonatiger", "elu cloud", "elucloud", "marc"]
};

const AMAZON_TAG = "moviesanywhere02-20";

let tokenStore = { ray: {}, wildhorse_spirit: {} };
let squadFocusCommIds = new Set(); // commIds any squad member was last hunting (kept for everyone)
const twitchCache = new Map();

let diagnosticReport = {
    wildhorse_spirit_active: "no",
    wildhorse_spirit_status: "UNCHECKED",
    ray_active: "no",
    ray_status: "UNCHECKED",
    active_runner: "UNIVERSAL_SYNC",
    buffer_status: "INITIALIZING",
    lastCheck: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
};

// ----------------------------------------------------------------------------
// [SECTION 2: HTTP & HTTPS RESILIENT FETCH LAYER]
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
// [SECTION 3: FIREBASE AUTHENTICATED REST API UTILITIES + LOCAL MIRROR]
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

// Dual directory filesystem mirror (v50)
function writeLocalFile(payload) {
    [LOCAL_JSON_PATH, ROOT_LOCAL_JSON_PATH].forEach(filePath => {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
        } catch (err) {}
    });
}

// ----------------------------------------------------------------------------
// [SECTION 4: TWITCH TELEMETRY (v50, now works for every user with a handle)]
// ----------------------------------------------------------------------------
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

    const cleanFetch = async (endpoint, query = "") => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            const res = await resilientFetch(`https://decapi.me/twitch/${endpoint}/${cleanUser}${query}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) return null;
            const text = await res.text();
            const val = text.trim();
            if (!val || invalidTerms.some(term => val.toLowerCase().includes(term))) return null;
            return val;
        } catch (e) { return null; }
    };

    try {
        intel.uptime = await cleanFetch("uptime");
        const statusRes = await cleanFetch("status");
        intel.isLive = !!(intel.uptime || (statusRes && statusRes.toLowerCase().includes("live")));
        intel.game = await cleanFetch("game");
        intel.gameArt = await cleanFetch("game_image");
        intel.followers = (await cleanFetch("followcount")) || "0";
        intel.latestFollower = (await cleanFetch("latest_follower")) || "None";

        const listRes = await cleanFetch("followers", "?limit=100");
        if (listRes) { intel.followerNames = listRes.split(", ").map(n => n.trim()).filter(Boolean); }

        intel.avatar = await cleanFetch("avatar");
        intel.age = (await cleanFetch("accountage")) || "Unknown";
        intel.bio = await cleanFetch("description");
        intel.statusMessage = await cleanFetch("title");
        intel.viewers = (await cleanFetch("viewercount")) || "0";
        intel.subCount = (await cleanFetch("subcount")) || "0";
        intel.chatRules = await cleanFetch("chat_rules");
        intel.channelCreationRaw = await cleanFetch("creation");

        return intel;
    } catch (e) {
        return intel;
    }
}

// One Twitch lookup per handle per run (gatekeeper, delta check and ingestion all share it)
async function getTwitchIntelCached(handle) {
    if (!handle) return null;
    const key = handle.toLowerCase().trim();
    if (!twitchCache.has(key)) twitchCache.set(key, await getTwitchIntel(key));
    return twitchCache.get(key);
}

// Rolling broadcast history manager (v50)
function processStreamHistory(existingHistory, twitchIntel) {
    let history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    if (twitchIntel?.isLive && twitchIntel?.game) {
        const currentGame = twitchIntel.game.trim();
        history = history.filter(g => g.toLowerCase() !== currentGame.toLowerCase());
        history.unshift(currentGame);
        if (history.length > 5) history = history.slice(0, 5);
    }
    return history;
}

// ----------------------------------------------------------------------------
// [SECTION 5: STORE CATALOG & ACCESSIBILITY PARSERS]
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
// [SECTION 6: HARDWARE, PLATFORM & MULTI-TIER TIME UTILITIES]
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

// Normalized title key used to match playtime records <-> trophy records <-> presence
function normTitle(str) {
    if (!str) return "";
    return String(str).toLowerCase().replace(/®|™/g, "").replace(/[^a-z0-9]/g, "").trim();
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

// Long-form duration (intervals between trophies, ages, etc.)
function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";

    const SECONDS_IN_MIN = 60;
    const SECONDS_IN_HOUR = 3600;
    const SECONDS_IN_DAY = 86400;
    const SECONDS_IN_WEEK = 604800;
    const SECONDS_IN_MONTH = 2592000;
    const SECONDS_IN_YEAR = 31536000;

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

// Playtime format: always hours + minutes ("1,234h 5m") so dashboards can parse it reliably
function formatPlaytime(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return "< 1 min";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hrs`;
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

// 2026 and newer forward-compatible filter (>= 2026)
function isTrophyEarnedIn2026OrNewer(dateString) {
    if (!dateString) return false;
    const epoch = typeof dateString === "number" ? dateString : new Date(dateString).getTime();
    if (isNaN(epoch) || epoch <= 0) return false;
    const d = new Date(epoch);
    return d.getUTCFullYear() >= 2026;
}

// ----------------------------------------------------------------------------
// [SECTION 7: CAPABILITY & MULTIPLAYER PARSER WITH STORE BADGES]
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
// [SECTION 8: HOURS TRACKER - CHECKPOINT ACCUMULATOR + SONY NATIVE PLAYTIME]
// ----------------------------------------------------------------------------
// Total for one game session record:
//   - manualBaselineHours > 0 (editable in RTDB): manual + everything tracked afterwards
//   - otherwise: whichever is larger, Sony's native value or (native value at session start + tracked time)
function computeSessionTotalSeconds(session, liveNativeSeconds = 0) {
    const manual = Number(session.manualBaselineHours || 0);
    const acc = Number(session.accumulatedSeconds || 0);
    if (manual > 0) return Math.round(manual * 3600) + acc;
    return Math.max(Number(session.nativeBaselineSeconds || 0) + acc, Number(liveNativeSeconds || 0));
}

function stampSessionTotals(session, liveNativeSeconds = 0) {
    session.totalSeconds = computeSessionTotalSeconds(session, liveNativeSeconds);
    session.totalFormatted = formatPlaytime(session.totalSeconds);
    session.totalHours = Math.round((session.totalSeconds / 3600) * 10) / 10;
    session.nativePlaytimeHours = session.totalHours;
}

// isActivelyPlaying = online AND actually inside a game (not sitting on the home screen)
function updateGameSessionTracking(existingUserData, activeCommId, activeTitle, isActivelyPlaying, activeTitleId, activeNativeSeconds = 0) {
    const playSessions = existingUserData?.playSessions || {};
    const now = Date.now();

    const sessionKey = (activeCommId && String(activeCommId).startsWith("NPWR"))
        ? String(activeCommId).toUpperCase()
        : (activeTitleId || (activeTitle && activeTitle !== "Dashboard" ? activeTitle.replace(/[^a-zA-Z0-9]/g, "_") : null));

    // Phase 1: bank + close every other active session (game switch or logoff)
    for (const [id, session] of Object.entries(playSessions)) {
        if (session.isActive && (id !== sessionKey || !isActivelyPlaying)) {
            const lastCheckpoint = session.lastSyncedTime || session.sessionStartTime || now;
            const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));

            session.accumulatedSeconds = (session.accumulatedSeconds || 0) + deltaSeconds;
            stampSessionTotals(session, 0);

            session.isActive = false;
            session.sessionStartTime = null;
            session.lastSyncedTime = null;
            session.lastEndedTime = now;

            console.log(`[SESSION ENDED] Banked +${deltaSeconds}s for ${session.title || id}. Lifetime Total: ${session.totalFormatted}`);
        }
    }

    // Phase 2: start or incrementally checkpoint the active game session
    if (isActivelyPlaying && sessionKey && sessionKey !== "Dashboard") {
        if (!playSessions[sessionKey]) {
            const manualBaseline = Number(existingUserData?.manualBaselineHours || 0);
            const session = {
                commId: activeCommId || sessionKey,
                titleId: activeTitleId || null,
                title: activeTitle,
                manualBaselineHours: manualBaseline,
                nativeBaselineSeconds: Number(activeNativeSeconds || 0),
                accumulatedSeconds: 0,
                isActive: true,
                sessionStartTime: now,
                lastSyncedTime: now
            };
            stampSessionTotals(session, activeNativeSeconds);
            playSessions[sessionKey] = session;
            console.log(`[SESSION STARTED] Active tracking started for ${activeTitle} (${sessionKey}). Total now: ${session.totalFormatted}`);
        } else {
            const current = playSessions[sessionKey];
            const manualBaseline = Number(current.manualBaselineHours !== undefined ? current.manualBaselineHours : (existingUserData?.manualBaselineHours || 0));
            current.manualBaselineHours = manualBaseline;

            if (!current.isActive) {
                // Resuming: Sony's native value already contains the earlier tracked play, so restart the
                // delta from it (manual-baseline mode keeps accumulating on top of the manual number).
                if (manualBaseline <= 0) current.accumulatedSeconds = 0;
                current.nativeBaselineSeconds = Number(activeNativeSeconds || current.nativeBaselineSeconds || 0);
                current.sessionStartTime = now;
                current.lastSyncedTime = now;
                current.isActive = true;
                console.log(`[SESSION RESUMED] Resumed tracking for ${activeTitle} (${sessionKey}).`);
            } else {
                const lastCheckpoint = current.lastSyncedTime || current.sessionStartTime || now;
                const deltaSeconds = Math.max(0, Math.floor((now - lastCheckpoint) / 1000));
                current.accumulatedSeconds = (current.accumulatedSeconds || 0) + deltaSeconds;
                current.lastSyncedTime = now;
                console.log(`[SESSION CHECKPOINT] Banked +${deltaSeconds}s for ${activeTitle}.`);
            }
            current.title = activeTitle || current.title;
            stampSessionTotals(current, activeNativeSeconds);
            console.log(`[SESSION TOTAL] ${activeTitle}: ${current.totalFormatted}`);
        }
    }

    let currentGameDurationFormatted = "0 hrs";
    let activeSessionSeconds = 0;
    if (sessionKey && playSessions[sessionKey]) {
        const active = playSessions[sessionKey];
        activeSessionSeconds = active.totalSeconds || 0;
        currentGameDurationFormatted = active.totalFormatted || formatPlaytime(activeSessionSeconds);
    }

    return { playSessions, currentGameDurationFormatted, activeSessionSeconds };
}

// Push tracked/manual totals onto the matching recentGames records so
// recentGames/N/nativePlaytimeFormatted is always the best-known number.
function applyPlaytimeOverlay(allRecentGames, playSessions) {
    for (const g of allRecentGames) {
        if (!g || !g.npCommunicationId) continue;
        const s = playSessions[String(g.npCommunicationId).toUpperCase()];
        if (!s) continue;
        const manual = Number(s.manualBaselineHours || 0) > 0;
        const tracked = Number(s.totalSeconds || 0);
        if (manual || tracked > Number(g.nativePlaytimeSeconds || 0)) {
            g.nativePlaytimeSeconds = tracked;
            g.nativePlaytimeHours = Math.round((tracked / 3600) * 10) / 10;
            g.nativePlaytimeFormatted = formatPlaytime(tracked);
            g.playDuration = `PT${Math.floor(tracked / 3600)}H${Math.floor((tracked % 3600) / 60)}M${tracked % 60}S`;
            g.playtimeSource = manual ? "manualBaseline+tracker" : "liveTracker";
        } else if (!g.playtimeSource) {
            g.playtimeSource = "sonyNative";
        }
    }
}

// ----------------------------------------------------------------------------
// [SECTION 9: TOKEN LIFECYCLE MANAGEMENT & REFRESH LAYER]
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

    console.error(`[AUTH NOTICE] No valid active token available for ${userKey}.`);
    diagnosticReport[`${userKey}_active`] = "no";
    diagnosticReport[`${userKey}_status`] = "OFFLINE_GUEST_MODE";
    return null;
}

// ----------------------------------------------------------------------------
// [SECTION 10: SMART HOT-STANDBY FAILOVER MANAGER (v50, generalized to all users)]
// ----------------------------------------------------------------------------
// Picks the session used to read any account that has no valid cookie of its own.
function resolveMasterSession(authByKey) {
    console.log("[FAILOVER MANAGER] Checking token health across squad accounts...");

    const wolfAuth = authByKey["wildhorse_spirit"] || null;
    const rayAuth = authByKey["ray"] || null;
    let masterAuth = null;
    let failoverState = "NORMAL";

    if (wolfAuth && wolfAuth.accessToken) {
        console.log("[FAILOVER MANAGER] Primary token (WildHorse_Spirit) is active.");
        masterAuth = wolfAuth;
        failoverState = "PRIMARY_WOLF";
    } else if (rayAuth && rayAuth.accessToken) {
        console.warn("[FAILOVER MANAGER] ⚠️ Primary token expired. Failing over to Ray standby token.");
        masterAuth = rayAuth;
        failoverState = "FAILOVER_RAY";
    } else {
        const anyAuth = Object.values(authByKey).find(a => a && a.accessToken);
        if (anyAuth) {
            console.warn(`[FAILOVER MANAGER] ⚠️ Core tokens offline. Using ${anyAuth.userKey} session as master.`);
            masterAuth = anyAuth;
            failoverState = "FAILOVER_OTHER";
        } else {
            console.warn("[FAILOVER MANAGER] ⚠️ All tokens offline. Transitioning to snapshot mode.");
            failoverState = "SNAPSHOT_FALLBACK";
        }
    }

    return { masterAuth, wolfAuth, rayAuth, failoverState };
}

// ----------------------------------------------------------------------------
// [SECTION 11: DLC & ADD-ON EXTRACTION WITH STORE CATALOG FALLBACK]
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
// [SECTION 12: UNIFIED MASTER GAME INGESTION (/psn/games/{commId})]
// ----------------------------------------------------------------------------
async function ensureGameSkeleton(auth, commId, gameName, platform, posterArt, iconArt, definedTrophies, globalGames, userPurchasedTitles = [], cloudDlcCatalog = {}, subTitleId = null, initialConceptId = null) {
    if (!commId || commId === "Dashboard" || !auth) return null;

    const canonicalCommId = String(commId).trim().toUpperCase();

    if (!canonicalCommId.startsWith("NPWR")) {
        console.log(`[PRESERVE SKELETON] ${canonicalCommId} is not an NPWR ID. Preserving existing record.`);
        return globalGames[canonicalCommId] || null;
    }

    const previousRecord = globalGames[canonicalCommId] || {};

    // Freshness guard: a complete skeleton refreshed in the last 6h (by any user this run) is reused
    if (previousRecord.trophies && previousRecord.trophies.length > 0 && previousRecord.onlineMode && previousRecord.lastUpdated &&
        (Date.now() - Date.parse(previousRecord.lastUpdated)) < 6 * 3600 * 1000) {
        return previousRecord;
    }

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
                ...t, // keep every raw Sony field (trophyName, trophyDetail, trophyIconUrl, trophyProgressTargetValue...)
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
// [SECTION 13: DEEP TROPHY PROGRESS WITH PS5 OBJECTIVE RATIOS (x/x)]
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

            standaloneProgressMap[s.trophyId] = {
                ...s, // keep every raw Sony field (progress, progressRate, progressedDateTime, earnedDateTime...)
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
// [SECTION 14: SMART ACTIVITY DELTA & PRESENCE EVALUATOR]
// ----------------------------------------------------------------------------
async function evaluateUserActivityDelta(agentAuth, targetId, knownKey, knownGamerTag, existingData, twitchHandle = null) {
    if (!existingData) {
        return { hasDelta: true, reason: "INITIAL_CREATION", liveOnline: true };
    }

    const isOwn = !!agentAuth && agentAuth.userKey === knownKey;
    const presenceTarget = (isOwn || !/^\d+$/.test(String(targetId))) ? "me" : targetId;

    let liveOnline = false;
    let liveGameTitle = "Dashboard";

    if (agentAuth) {
        try {
            const pRaw = await getBasicPresence(agentAuth, presenceTarget);
            const basic = pRaw?.basicPresence || (Array.isArray(pRaw) ? pRaw[0] : (pRaw?.basicPresences ? pRaw.basicPresences[0] : pRaw));
            const status = basic?.primaryPlatformInfo?.onlineStatus || basic?.onlineStatus || "offline";
            liveOnline = (status !== "offline");

            const activeGameInfo = basic?.gameTitleInfoList?.[0] || basic?.primaryPlatformInfo?.gameTitleInfoList?.[0] || {};
            liveGameTitle = activeGameInfo.titleName || activeGameInfo.npTitleName || "Dashboard";
        } catch (e) {}
    }

    const twitch = await getTwitchIntelCached(twitchHandle);
    if (twitch?.isLive) {
        liveOnline = true;
        if (liveGameTitle === "Dashboard" && twitch.game) liveGameTitle = twitch.game;
    }

    const storedOnline = !!existingData.online;
    const hasActiveSession = Object.values(existingData?.playSessions || {}).some(s => s.isActive);

    if (hasActiveSession && !liveOnline) {
        return { hasDelta: true, reason: "SESSION_LOGOUT_FINALIZATION", liveOnline: false };
    }

    if (!liveOnline && !storedOnline) {
        return { hasDelta: false, reason: "OFFLINE_SKIPPED", liveOnline: false };
    }

    if (liveOnline !== storedOnline) {
        return { hasDelta: true, reason: `STATUS_CHANGE (${storedOnline ? 'ONLINE' : 'OFFLINE'} -> ${liveOnline ? 'ONLINE' : 'OFFLINE'})`, liveOnline };
    }

    if (liveOnline) {
        // Online players are always processed so the hours checkpoint keeps banking time
        const storedGame = (existingData.currentGame || "Dashboard").toLowerCase().trim();
        const detectedGame = liveGameTitle.toLowerCase().trim();
        if (storedGame !== detectedGame) {
            return { hasDelta: true, reason: `GAME_SWITCH (${storedGame} -> ${detectedGame})`, liveOnline };
        }
        if (hasActiveSession) {
            return { hasDelta: true, reason: "ACTIVE_SESSION_CHECKPOINT", liveOnline };
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
// [SECTION 15: UNIVERSAL FULL USER TELEMETRY INGESTION PIPELINE (ALL USERS)]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData, isManualRun, globalGames, cloudDlcCatalog = {}, twitchHandle = null) {
    // The session that reads this account: its own cookie session, or the failover/master session
    const isOwnSession = !!auth && auth.userKey === userKey;
    let resolvedTargetId = String(targetId || ACCOUNT_IDS[userKey] || "");
    if (!/^\d+$/.test(resolvedTargetId)) resolvedTargetId = isOwnSession ? "me" : "";

    if (!auth || !resolvedTargetId) {
        return existingData || null;
    }

    try {
        const twitchIntel = await getTwitchIntelCached(twitchHandle || TWITCH_MAP[userKey]);

        let profile = null;
        try { profile = await getProfileFromAccountId(auth, resolvedTargetId); } catch (e) {}

        const canonicalOnlineId = profile?.onlineId || gamerTag || existingData?.onlineId || resolvedTargetId;

        // ---- Presence (never borrows another account's presence) ----
        const presenceTarget = isOwnSession ? "me" : resolvedTargetId;
        let rawP = { primaryPlatformInfo: { onlineStatus: "offline", platform: null }, gameTitleInfoList: [] };
        try {
            const raw = await getBasicPresence(auth, presenceTarget);
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch (e) {}

        const psnOnline = (rawP?.primaryPlatformInfo?.onlineStatus || rawP?.onlineStatus || "offline") !== "offline";
        const twitchLive = !!twitchIntel?.isLive;
        const isPlayerOnline = psnOnline || twitchLive;

        // FAST 1-PASS SESSION WRAP: offline player with an open session -> bank hours, close, exit
        if (!isPlayerOnline && existingData) {
            const hasActive = Object.values(existingData?.playSessions || {}).some(s => s.isActive);
            if (hasActive) {
                console.log(`[OFFLINE CLOSE] Finalizing pending play session for offline player: ${canonicalOnlineId}...`);
                const { playSessions } = updateGameSessionTracking(existingData, null, existingData.currentGame || "Dashboard", false, null);
                if (Array.isArray(existingData.recentGames)) applyPlaytimeOverlay(existingData.recentGames, playSessions);

                const closedRecord = {
                    ...existingData,
                    online: false,
                    // keep the last game visible on dashboards (currentGame / currentCommunicationId untouched)
                    art: existingData?.art || existingData?.posterArt || existingData?.currentGameArt || null,
                    posterArt: existingData?.posterArt || existingData?.art || existingData?.currentGameArt || null,
                    image: existingData?.image || existingData?.art || existingData?.posterArt || null,
                    currentGameArt: existingData?.currentGameArt || existingData?.art || null,
                    nativePlaytimeHours: existingData?.nativePlaytimeHours || 0,
                    playSessions: playSessions,
                    twitch: twitchIntel || existingData?.twitch || null,
                    lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
                };

                await syncNodeToFirebase(`gamertags/${canonicalOnlineId}`, closedRecord);
                return closedRecord;
            }
        }

        // ---- Own-session-only endpoints (v50 behavior); other accounts keep their stored values ----
        let region = { country: existingData?.region || "US", language: existingData?.language || "en" };
        let devices = existingData?.devices || [];
        let shareableProfile = existingData?.shareableProfile || null;
        let blockedUsers = existingData?.blockedUsers || [];
        let friendRequests = existingData?.friendRequests || [];
        let purchasedGames = existingData?.purchasedGames || [];

        if (isOwnSession) {
            try { region = await getUserRegion(auth, "me"); } catch (e) {}
            try {
                const devRes = await getAccountDevices(auth);
                devices = devRes?.devices || devRes || [];
            } catch (e) {}
            try { shareableProfile = await getProfileShareableLink(auth); } catch (e) {}
            try {
                const blockedRes = await getUserBlockedAccountIds(auth).catch(() => ({}));
                blockedUsers = blockedRes?.blockedUsers || [];
            } catch (e) {}
            try {
                const reqRes = await getUserFriendsRequests(auth).catch(() => ({}));
                friendRequests = reqRes?.receivedRequests || [];
            } catch (e) {}
            try {
                const pRes = await getPurchasedGames(auth, { limit: 100 }).catch(() => ({}));
                purchasedGames = pRes?.titles || [];
            } catch (e) {}
        }

        let friendsList = existingData?.friendsList || [];
        try {
            const friendsRes = await getUserFriendsAccountIds(auth, resolvedTargetId).catch(() => ({}));
            if (friendsRes?.friends && friendsRes.friends.length > 0) friendsList = friendsRes.friends;
        } catch (e) {}

        // ---- Trophy titles (commId side) ----
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

        // ---- Played-games telemetry (titleId side, holds playDuration) ----
        // Every account reads its own list; own sessions also add recently-played (v50) to fill gaps.
        const teleMap = new Map();
        const addTele = (arr) => (arr || []).forEach(g => {
            if (!g) return;
            const k = String(g.titleId || g.npTitleId || normTitle(g.name) || "");
            if (!k) return;
            const prev = teleMap.get(k);
            if (!prev) { teleMap.set(k, { ...g }); return; }
            for (const [f, v] of Object.entries(g)) {
                if (prev[f] === undefined || prev[f] === null || prev[f] === "") prev[f] = v;
            }
        });

        try {
            let pOffset = 0;
            for (let i = 0; i < 5; i++) {
                const playedRes = await getUserPlayedGames(auth, resolvedTargetId, { limit: 100, offset: pOffset }).catch(() => null);
                const titles = playedRes?.titles || [];
                addTele(titles);
                if (titles.length < 100) break;
                pOffset += 100;
            }
        } catch (e) {
            console.warn(`[TELEMETRY FETCH WARN] Failed to load played games for ${canonicalOnlineId}: ${e.message}`);
        }
        if (isOwnSession) {
            try {
                const recentRes = await getRecentlyPlayedGames(auth, { limit: 100 }).catch(() => null);
                addTele(recentRes?.data?.recentlyPlayedTitles || recentRes?.recentlyPlayedTitles || []);
            } catch (e) {}
        }
        const telemetryData = Array.from(teleMap.values());

        const earliestEntry = sortedTitles.reduce((oldest, current) => {
            const currentDate = new Date(current.lastUpdatedDateTime || current.lastPlayed);
            return (!oldest || currentDate < oldest) ? currentDate : oldest;
        }, null);

        // titleId -> commId links (skeletons + previously stored records) so playtime finds its trophy set
        const titleIdToComm = {};
        Object.values(globalGames || {}).forEach(sk => {
            if (!sk || !sk.commId) return;
            [sk.cusaId, sk.titleId].filter(Boolean).forEach(tid => { titleIdToComm[String(tid)] = sk.commId; });
        });
        (Array.isArray(existingData?.recentGames) ? existingData.recentGames : Object.values(existingData?.recentGames || {})).forEach(rg => {
            if (rg && rg.npCommunicationId && (rg.npTitleId || rg.titleId)) titleIdToComm[String(rg.npTitleId || rg.titleId)] = rg.npCommunicationId;
        });

        const mergedGamesMap = new Map(); // commId / titleId -> record
        const nameIndex = new Map();      // normalized title + platform -> record

        // 1. Ingest telemetry (Played Games) with full native playtime
        telemetryData.forEach(g => {
            const titleId = g.titleId || g.npTitleId || null;
            const commId = g.npCommunicationId || (titleId && titleIdToComm[String(titleId)]) || null;
            if (!commId && !titleId) return;

            const parsedSeconds = parseIsoDuration(g.playDuration);
            const gameArt = resolveGamePosterArt([
                g.image?.url,
                g.imageUrl,
                g.conceptIconUrl,
                g.boxart,
                g.trophyTitleIconUrl
            ]);

            const nativeHours = Math.round((parsedSeconds / 3600) * 10) / 10;
            const gName = g.name || "Unknown Game";
            const plat = normalizePlatform(g);

            const gameRecord = {
                ...g,
                name: gName,
                platform: plat,
                nativePlaytimeHours: nativeHours,
                nativePlaytimeFormatted: formatPlaytime(parsedSeconds),
                nativePlaytimeSeconds: parsedSeconds,
                playDuration: g.playDuration || `PT${Math.floor(parsedSeconds / 3600)}H${Math.floor((parsedSeconds % 3600) / 60)}M${parsedSeconds % 60}S`,
                playCount: g.playCount || 1,
                posterArt: gameArt,
                art: gameArt,
                media: g.image?.url ? [g.image.url] : (gameArt ? [gameArt] : []),
                titleId: titleId,
                npTitleId: titleId,
                npCommunicationId: commId,
                conceptId: g.conceptId || g.concept?.id || extractConceptIdFromText(g.conceptIconUrl) || null,
                sortableName: gName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
                progress: 0,
                service: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy"),
                npServiceName: g.npServiceName || (g.category === "ps5_native_game" ? "trophy2" : "trophy"),
                trophyTitlePlatform: plat,
                trophyTitleIconUrl: gameArt,
                trophyTitleName: gName,
                trophyTitleDetail: g.category || "PlayStation Title",
                trophySetVersion: "01.00",
                trophyGroupCount: 1,
                firstPlayedDateTime: g.firstPlayedDateTime || null,
                lastPlayed: g.lastPlayedDateTime || null
            };

            if (commId) mergedGamesMap.set(commId, gameRecord);
            if (titleId) mergedGamesMap.set(titleId, gameRecord);
            nameIndex.set(`${normTitle(gName)}|${plat}`, gameRecord);
        });

        // 2. Ingest trophy titles; link to playtime by commId, titleId, OR title+platform
        sortedTitles.forEach(t => {
            const commId = t.npCommunicationId;
            const titleId = t.npTitleId;
            if (!commId && !titleId) return;

            const plat = normalizePlatform(t);
            const nKey = `${normTitle(t.trophyTitleName || t.name)}|${plat}`;
            let existing = (commId && mergedGamesMap.get(commId)) || (titleId && mergedGamesMap.get(titleId)) || nameIndex.get(nKey) || null;
            // never hijack a playtime record that already belongs to a different trophy set
            if (existing && existing.npCommunicationId && commId && existing.npCommunicationId !== commId) existing = null;

            const skel = (commId && globalGames[commId]) || {};
            const gName = (existing?.name && existing.name !== "Unknown Game") ? existing.name : (t.trophyTitleName || skel.name || "Unknown Game");

            const resolvedArt = resolveGamePosterArt([
                existing?.posterArt,
                existing?.art,
                t.trophyTitleIconUrl,
                skel.posterArt,
                t.conceptIconUrl,
                t.imageUrl
            ]);

            const earnedTotal = (t.earnedTrophies?.platinum || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.bronze || 0);
            const definedTotal = (t.definedTrophies?.platinum || 0) + (t.definedTrophies?.gold || 0) + (t.definedTrophies?.silver || 0) + (t.definedTrophies?.bronze || 0);
            const completionRatio = definedTotal > 0 ? `${Math.round((earnedTotal / definedTotal) * 100)}%` : "0%";

            const uniformRecord = {
                ...(existing || {}),
                ...t, // every raw Sony trophy-title field (v50 Object.assign behavior)
                name: gName,
                platform: plat,
                nativePlaytimeHours: existing?.nativePlaytimeHours !== undefined ? existing.nativePlaytimeHours : 0,
                nativePlaytimeFormatted: existing?.nativePlaytimeFormatted || "0 hrs",
                nativePlaytimeSeconds: existing?.nativePlaytimeSeconds !== undefined ? existing.nativePlaytimeSeconds : 0,
                playDuration: existing?.playDuration || "PT0H0M0S",
                playCount: existing?.playCount || t.playCount || 1,
                posterArt: resolvedArt,
                art: resolvedArt,
                media: existing?.media || (resolvedArt ? [resolvedArt] : []),
                titleId: titleId || existing?.titleId || skel.titleId || null,
                npTitleId: titleId || existing?.npTitleId || skel.cusaId || null,
                npCommunicationId: commId || existing?.npCommunicationId || null,
                conceptId: existing?.conceptId || t.conceptId || skel.conceptId || extractConceptIdFromText(t.conceptIconUrl) || null,
                sortableName: gName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
                progress: t.progress || existing?.progress || 0,
                service: t.npServiceName || existing?.service || "trophy",
                npServiceName: t.npServiceName || existing?.npServiceName || "trophy",
                trophyTitlePlatform: plat,
                trophyTitleIconUrl: resolvedArt,
                trophyTitleName: gName,
                trophyTitleDetail: t.trophyTitleDetail || existing?.trophyTitleDetail || "PlayStation Title",
                trophySetVersion: t.trophySetVersion || "01.00",
                trophyGroupCount: t.trophyGroupCount || 1,
                definedTrophies: t.definedTrophies || skel.definedTrophies || {},
                earnedTotal: earnedTotal,
                definedTotal: definedTotal,
                completionRatio: completionRatio,
                lastPlayed: t.lastUpdatedDateTime || existing?.lastPlayed || null
            };

            if (existing) {
                for (const [k, v] of mergedGamesMap) { if (v === existing) mergedGamesMap.set(k, uniformRecord); }
            }
            if (commId) mergedGamesMap.set(commId, uniformRecord);
            if (titleId) mergedGamesMap.set(titleId, uniformRecord);
            if (uniformRecord.npTitleId) mergedGamesMap.set(uniformRecord.npTitleId, uniformRecord);
            nameIndex.set(nKey, uniformRecord);
        });

        const allRecentGames = Array.from(new Set(mergedGamesMap.values())).sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return dateB - dateA;
        });

        // ---- Active game resolution (v50 universal NPWR resolver + v68 presence) ----
        const activeGameInfo = rawP?.gameTitleInfoList?.[0] ||
                               rawP?.primaryPlatformInfo?.gameTitleInfoList?.[0] ||
                               {};

        let activeCommId = activeGameInfo.npCommunicationId || null;
        let activeTitleId = activeGameInfo.npTitleId || activeGameInfo.titleId || null;
        let resolvedTitle = (psnOnline ? (activeGameInfo.titleName || activeGameInfo.npTitleName) : null) || null;

        if (!resolvedTitle && twitchLive && twitchIntel?.game) {
            resolvedTitle = twitchIntel.game;
        }

        const hasLiveTitle = !!(resolvedTitle || (psnOnline && (activeCommId || activeTitleId)));

        if (!resolvedTitle && activeCommId && mergedGamesMap.has(activeCommId)) {
            resolvedTitle = mergedGamesMap.get(activeCommId).name;
        }
        if (!resolvedTitle && activeTitleId && mergedGamesMap.has(activeTitleId)) {
            resolvedTitle = mergedGamesMap.get(activeTitleId).name;
        }
        if (!resolvedTitle || resolvedTitle === "Dashboard") {
            if (allRecentGames.length > 0) {
                // not in a game: dashboards keep showing the most recent hunt (v50 behavior)
                resolvedTitle = allRecentGames[0].name;
                activeCommId = activeCommId || allRecentGames[0].npCommunicationId;
                activeTitleId = activeTitleId || allRecentGames[0].npTitleId;
            } else {
                resolvedTitle = existingData?.currentGame || "Dashboard";
            }
        }

        const hwPlatform = parseDetailedHardwareContext(rawP, {}).activeHardware;
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
            const cleanResolved = normTitle(resolvedTitle);
            const candidates = allRecentGames.filter(g =>
                normTitle(g.name || g.trophyTitleName) === cleanResolved &&
                g.npCommunicationId && String(g.npCommunicationId).startsWith("NPWR"));
            const best = candidates.find(g => g.platform === hwPlatform) || candidates[0];
            if (best) canonicalActiveCommId = best.npCommunicationId;
        }

        const fallbackCommId = allRecentGames.find(g => g.npCommunicationId && String(g.npCommunicationId).startsWith("NPWR"))?.npCommunicationId ||
                               existingData?.currentCommunicationId ||
                               existingData?.commId ||
                               existingData?.activeHunt?.commId ||
                               "NPWR_ACTIVE";

        const persistentRootCommId = (canonicalActiveCommId && canonicalActiveCommId !== "Dashboard")
            ? canonicalActiveCommId
            : fallbackCommId;

        const isDashboard = !resolvedTitle || resolvedTitle.toUpperCase() === "DASHBOARD";
        const isActivelyPlaying = isPlayerOnline && hasLiveTitle && !isDashboard;

        const matchedGame = (persistentRootCommId && mergedGamesMap.get(persistentRootCommId)) ||
                            allRecentGames.find(g => normTitle(g.name) === normTitle(resolvedTitle)) ||
                            (!isDashboard ? allRecentGames[0] : null) || {};

        // ---- Hours tracker (checkpoint accumulator seeded by Sony's native playtime) ----
        const { playSessions, currentGameDurationFormatted, activeSessionSeconds } = updateGameSessionTracking(
            existingData,
            isActivelyPlaying ? persistentRootCommId : null,
            resolvedTitle,
            isActivelyPlaying,
            activeTitleId,
            matchedGame.nativePlaytimeSeconds || 0
        );
        applyPlaytimeOverlay(allRecentGames, playSessions);

        // ---- Master game skeletons (own + squad focus titles) ----
        for (const g of allRecentGames.slice(0, 25)) {
            const syncId = g.npCommunicationId;
            if (syncId && String(syncId).startsWith("NPWR")) {
                await ensureGameSkeleton(
                    auth,
                    syncId,
                    g.name,
                    normalizePlatform(g),
                    g.posterArt,
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
        for (const g of allRecentGames.slice(25)) {
            if (g.npCommunicationId && squadFocusCommIds.has(g.npCommunicationId)) {
                await ensureGameSkeleton(auth, g.npCommunicationId, g.name, normalizePlatform(g), g.posterArt, g.trophyTitleIconUrl, g.definedTrophies, globalGames, purchasedGames, cloudDlcCatalog, g.titleId || g.npTitleId, g.conceptId);
            }
        }

        const hwContext = parseDetailedHardwareContext(rawP, matchedGame);

        const safeFinalPoster = resolveGamePosterArt([
            matchedGame.posterArt,
            matchedGame.art,
            matchedGame.trophyTitleIconUrl,
            globalGames[persistentRootCommId]?.posterArt,
            twitchLive ? twitchIntel?.gameArt : null,
            allRecentGames[0]?.posterArt,
            allRecentGames[0]?.art,
            existingData?.posterArt,
            existingData?.art,
            existingData?.currentGameArt,
            existingData?.activeHunt?.art
        ]);

        const persistentLifetimeFormatted = matchedGame.nativePlaytimeFormatted ||
                                           existingData?.currentGameHours ||
                                           existingData?.activeHunt?.hoursFormatted ||
                                           "0 hrs";

        const persistentLifetimeNumeric = matchedGame.nativePlaytimeHours !== undefined
                                         ? matchedGame.nativePlaytimeHours
                                         : (existingData?.currentGameNumericHours || existingData?.activeHunt?.numericHours || 0);

        const safePlaytimeFormatted = (currentGameDurationFormatted && currentGameDurationFormatted !== "0 hrs" && currentGameDurationFormatted !== "< 1 min")
            ? currentGameDurationFormatted
            : persistentLifetimeFormatted;

        const safeNumericHours = (activeSessionSeconds > 0)
            ? (Math.round((activeSessionSeconds / 3600) * 10) / 10)
            : persistentLifetimeNumeric;

        const userNativePlaytimeHours = matchedGame.nativePlaytimeHours !== undefined
            ? matchedGame.nativePlaytimeHours
            : (existingData?.nativePlaytimeHours !== undefined ? existingData.nativePlaytimeHours : safeNumericHours);

        const userNativePlaytimeSeconds = matchedGame.nativePlaytimeSeconds !== undefined
            ? matchedGame.nativePlaytimeSeconds
            : (existingData?.nativePlaytimeSeconds !== undefined ? existingData.nativePlaytimeSeconds : Math.round(userNativePlaytimeHours * 3600));

        const userNativePlaytimeFormatted = matchedGame.nativePlaytimeFormatted || formatPlaytime(userNativePlaytimeSeconds);

        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        let activeHunt = existingData?.activeHunt || null;

        const liveTrophyProgress = { ...(existingData?.liveTrophyProgress || {}) };
        const cumulativeUnlockedTrophies = [];

        // 2026+ filter, plus the active title and any title a squad member is currently hunting
        const eligible2026PlusGames = allRecentGames.filter(g => {
            if (!g || !g.npCommunicationId || !String(g.npCommunicationId).startsWith("NPWR")) return false;

            const lastUpdated = g.lastPlayed || g.firstPlayedDateTime;
            if (isTrophyEarnedIn2026OrNewer(lastUpdated)) return true;

            const cachedTree = existingData?.liveTrophyProgress?.[g.npCommunicationId];
            if (cachedTree) {
                const hasEarned2026Plus = Object.values(cachedTree).some(t => t.earned && isTrophyEarnedIn2026OrNewer(t.timestamp || t.earnedDate));
                if (hasEarned2026Plus) return true;
            }

            if (g.npCommunicationId === persistentRootCommId && isPlayerOnline && !isDashboard) return true;
            if (squadFocusCommIds.has(g.npCommunicationId)) return true;

            return false;
        });

        for (const cachedCommId of Object.keys(liveTrophyProgress)) {
            const isEligible = eligible2026PlusGames.some(g => g.npCommunicationId === cachedCommId);
            if (!isEligible && cachedCommId !== persistentRootCommId) {
                delete liveTrophyProgress[cachedCommId];
            }
        }

        const titlesToIngestProgress = [
            ...(persistentRootCommId && String(persistentRootCommId).startsWith("NPWR") ? [persistentRootCommId] : []),
            ...eligible2026PlusGames.map(g => g.npCommunicationId).filter(id => id !== persistentRootCommId)
        ];

        console.log(`[2026+ TROPHY FILTER] Ingesting ${titlesToIngestProgress.length} titles for ${canonicalOnlineId}.`);

        for (const cId of titlesToIngestProgress) {
            const gMeta = mergedGamesMap.get(cId) || globalGames[cId] || {};
            const gPlat = normalizePlatform(gMeta);
            const gName = gMeta.name || "PlayStation Title";

            const subtree = await ingestTrophySubtreeForTitle(auth, resolvedTargetId, cId, gName, gPlat, globalGames, liveTrophyProgress[cId]);
            if (subtree && subtree.standaloneProgressMap) {
                const hasEarned2026PlusTrophy = Object.values(subtree.standaloneProgressMap).some(t => t.earned && isTrophyEarnedIn2026OrNewer(t.timestamp || t.earnedDate));

                if (hasEarned2026PlusTrophy || cId === persistentRootCommId || squadFocusCommIds.has(cId)) {
                    liveTrophyProgress[cId] = subtree.standaloneProgressMap;

                    if (subtree.earnedTrophiesList && subtree.earnedTrophiesList.length > 0) {
                        cumulativeUnlockedTrophies.push(...subtree.earnedTrophiesList);
                    }
                } else {
                    delete liveTrophyProgress[cId];
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
                        art: safeFinalPoster,
                        posterArt: safeFinalPoster,
                        image: safeFinalPoster,
                        media: matchedGame.media || [safeFinalPoster],
                        hoursPlayed: safePlaytimeFormatted,
                        hoursFormatted: safePlaytimeFormatted,
                        numericHours: safeNumericHours,
                        nativePlaytimeHours: userNativePlaytimeHours,
                        nativePlaytimeFormatted: userNativePlaytimeFormatted,
                        nativePlaytimeSeconds: userNativePlaytimeSeconds,
                        playDuration: matchedGame.playDuration || "PT0H0M0S",
                        playCount: matchedGame.playCount || 1,
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

        // Universal Recent Trophy Aggregator
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

        const presence = {
            online: isPlayerOnline,
            onDashboard: !hasLiveTitle,
            currentGame: resolvedTitle,
            commId: persistentRootCommId,
            currentCommunicationId: persistentRootCommId,
            currentGameId: isDashboard ? null : activeTitleId,
            conceptId: globalGames[persistentRootCommId]?.conceptId || matchedGame.conceptId || null,
            currentGameArt: safeFinalPoster,
            art: safeFinalPoster,
            posterArt: safeFinalPoster,
            image: safeFinalPoster,
            media: matchedGame.media || [safeFinalPoster],
            currentGameActivity: activeGameInfo.formatValue || twitchIntel?.statusMessage || (twitchLive ? "Streaming Live" : null),
            currentGameHours: safePlaytimeFormatted,
            currentGameNumericHours: safeNumericHours,
            nativePlaytimeHours: userNativePlaytimeHours,
            nativePlaytimeFormatted: userNativePlaytimeFormatted,
            nativePlaytimeSeconds: userNativePlaytimeSeconds,
            playDuration: matchedGame.playDuration || "PT0H0M0S",
            playCount: matchedGame.playCount || 1,
            amazonAffiliateUrl: generateAffiliateUrl(resolvedTitle),
            platform: hwContext.activeHardware,
            gameBuildVersion: hwContext.gameBuildVersion,
            isStreamingRemotePlay: hwContext.isStreamingRemotePlay,
            displayPlatform: hwContext.displayPlatformLabel,
            twitch: twitchIntel,
            rawPresence: rawP
        };

        return {
            onlineId: canonicalOnlineId,
            accountId: /^\d+$/.test(resolvedTargetId) ? resolvedTargetId : (existingData?.accountId || profile?.accountId || resolvedTargetId),
            commId: persistentRootCommId,
            conceptId: globalGames[persistentRootCommId]?.conceptId || matchedGame.conceptId || null,
            art: safeFinalPoster,
            posterArt: safeFinalPoster,
            image: safeFinalPoster,
            currentGameArt: safeFinalPoster,
            media: matchedGame.media || [safeFinalPoster],
            storeListing: globalGames[persistentRootCommId]?.storeListing || null,
            storeBadges: globalGames[persistentRootCommId]?.storeBadges || [],
            accessibilityFeatures: globalGames[persistentRootCommId]?.accessibilityFeatures || {},
            npssoValid: isOwnSession,
            npssoStatus: isOwnSession ? "ACTIVE" : "EXPIRED",
            handshakeText: isOwnSession
                ? `${canonicalOnlineId.toUpperCase()} HANDSHAKE: FIREBASE LIVE`
                : `${canonicalOnlineId.toUpperCase()} COOKIE EXPIRED / MISSING: READ VIA FAILOVER SESSION`,
            handshakeState: isOwnSession ? "LIVE" : "EXPIRED",
            avatar: profile?.avatars?.sort((a, b) => parseInt(b.size) - parseInt(a.size))[0]?.url || profile?.avatars?.[0]?.url || existingData?.avatar || "",
            allAvatars: profile?.avatars || existingData?.allAvatars || [],
            bio: twitchIntel?.bio || profile?.aboutMe || existingData?.bio || "Official Pack Member Profile",
            plus: profile ? !!profile.isPlus : !!existingData?.plus,
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
            streamHistory: processStreamHistory(existingData?.streamHistory, twitchIntel),
            lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
        };
    } catch (e) {
        console.error(`[TELEMETRY CRITICAL ERROR] For ${gamerTag || targetId}: ${e.message}`);
        return existingData || null;
    }
}

// ----------------------------------------------------------------------------
// [SECTION 16: SQUAD LEADERBOARDS & SOCIAL OVERLAP]
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
        art: p.art || p.posterArt || p.currentGameArt || null,
        posterArt: p.posterArt || p.art || p.currentGameArt || null,
        image: p.image || p.art || p.posterArt || null,
        media: p.media || (p.posterArt ? [p.posterArt] : []),
        platform: p.platform || "PS5",
        gameBuildVersion: p.gameBuildVersion || "PS5 Native Game",
        isStreamingRemotePlay: !!p.isStreamingRemotePlay,
        nativePlaytimeHours: p.nativePlaytimeHours || p.currentGameNumericHours || 0
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
// [SECTION 17: RTDB ACCOUNT ROSTER (PSN ID + COOKIE + TWITCH FROM FIREBASE)]
// ----------------------------------------------------------------------------
function extractPsnCreds(emailKey, userRecord, userSecretsRaw) {
    const u = userRecord || {};
    const gaming = u.gaming_platforms || u;
    const secrets = (userSecretsRaw && userSecretsRaw[emailKey]) || {};

    const tag = String(gaming.psn_username || gaming.psnUsername || gaming.psn_id || u.psn_username || u.username || "").trim();
    const rawId = gaming.psn_account_id || gaming.psnAccountId || u.psn_account_id || secrets.psn_account_id || "";
    const accountId = /^\d+$/.test(String(rawId).trim()) ? String(rawId).trim() : null;
    const rawCookie = String(secrets.psn_npsso || secrets.npsso || gaming.psn_npsso || gaming.npsso || u.psn_npsso || "").trim();
    const twitch = String(gaming.twitch_username || gaming.twitch || u.twitch_username || "").trim();

    return { tag, accountId, cookie: rawCookie.length >= 20 ? rawCookie : "", twitch };
}

function buildAccountRoster(siteUsersRaw, userSecretsRaw) {
    const roster = [];
    const rtdbCreds = Object.entries(siteUsersRaw && typeof siteUsersRaw === "object" ? siteUsersRaw : {})
        .filter(([, u]) => u && typeof u === "object")
        .map(([emailKey, u]) => ({ emailKey, ...extractPsnCreds(emailKey, u, userSecretsRaw) }));

    const envCookies = {
        wildhorse_spirit: process.env.PSN_NPSSO_WEREWOLF || "",
        ray: process.env.PSN_NPSSO_RAY || "",
        darkwing: process.env.PSN_NPSSO_DARKWING || "",
        marc: process.env.PSN_NPSSO_MARC || ""
    };

    // 1. Core pack: RTDB values win, hard-coded ids / env cookies are only fallbacks
    for (const member of CORE_PACK) {
        const aliases = CORE_ALIASES[member.key] || [member.tag.toLowerCase()];
        const matches = rtdbCreds.filter(c => (c.accountId && c.accountId === member.id) || aliases.includes(c.tag.toLowerCase()));
        const rec = matches.find(c => c.cookie) || matches[0] || null;

        roster.push({
            userKey: member.key,
            tag: member.tag,
            id: rec?.accountId || member.id,
            cookie: rec?.cookie || envCookies[member.key] || "",
            twitch: rec?.twitch || TWITCH_MAP[member.key] || "",
            source: rec ? "RTDB" : "CORE_DEFAULT"
        });
    }

    // 2. Every other RTDB user with a PSN account id or cookie
    for (const c of rtdbCreds) {
        if (!c.tag && !c.accountId) continue;
        if (!c.cookie && !c.accountId) continue;

        const lowerTag = c.tag.toLowerCase();
        const alreadyIncluded = roster.some(r =>
            r.tag.toLowerCase() === lowerTag ||
            (c.accountId && r.id === c.accountId) ||
            (CORE_ALIASES[r.userKey] || []).includes(lowerTag));
        if (alreadyIncluded) continue;

        roster.push({
            userKey: c.emailKey,
            tag: c.tag || c.emailKey,
            id: c.accountId || "",
            cookie: c.cookie,
            twitch: c.twitch,
            source: "RTDB"
        });
    }

    return roster;
}

function findExistingGamertag(gamertagsObj, tag) {
    if (!gamertagsObj || !tag) return null;
    if (gamertagsObj[tag]) return { key: tag, data: gamertagsObj[tag] };
    const lower = tag.toLowerCase();
    const hit = Object.keys(gamertagsObj).find(k => k.toLowerCase() === lower);
    return hit ? { key: hit, data: gamertagsObj[hit] } : null;
}

// ----------------------------------------------------------------------------
// [SECTION 18: MASTER EXECUTION & SINGLE-PASS GITHUB ACTIONS RUNNER]
// ----------------------------------------------------------------------------
async function executeSyncPass() {
    try {
        console.log(`[INIT] Starting Unified PSN Engine v69.0.0 at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })} EDT...`);

        await loadPersistentTokens();

        const siteUsersRaw = await resilientFetch(buildRtdbUrl("/users")).then(r => r.json()).catch(() => ({}));
        const userSecretsRaw = await resilientFetch(buildRtdbUrl("/user_secrets")).then(r => r.json()).catch(() => ({}));
        const cloudDlcCatalog = await resilientFetch(buildRtdbUrl("/woth2_cloud/data/dlcs")).then(r => r.json()).catch(() => ({}));

        const previousFirebaseData = await fetchFromFirebase();
        const globalGames = previousFirebaseData.games || {};
        const previousGamertags = previousFirebaseData?.gamertags || {};

        // Titles any squad member was last hunting: everyone keeps trophy progress for them
        squadFocusCommIds = new Set();
        Object.values(previousGamertags).forEach(p => {
            [p?.currentCommunicationId, p?.commId, p?.activeHunt?.commId].forEach(id => {
                if (id && String(id).startsWith("NPWR")) squadFocusCommIds.add(String(id).toUpperCase());
            });
        });

        // ---- Roster from the RTDB (psn id + cookie), then authenticate everyone ----
        const accountsToProcess = buildAccountRoster(siteUsersRaw, userSecretsRaw);
        console.log(`[ROSTER] ${accountsToProcess.length} accounts: ${accountsToProcess.map(a => `${a.tag}(${a.source}${a.cookie ? "+cookie" : ""})`).join(", ")}`);

        const authByKey = {};
        for (const account of accountsToProcess) {
            authByKey[account.userKey] = await getAuthenticated(account.userKey, account.cookie);
        }

        const { masterAuth, failoverState } = resolveMasterSession(authByKey);
        diagnosticReport.active_runner = failoverState;
        diagnosticReport.buffer_status = failoverState === "FAILOVER_RAY"
            ? "RUNNING ON BACKUP (Ray Active)"
            : (failoverState === "PRIMARY_WOLF" ? "PRIMARY HEALTHY (Werewolf Running)"
            : (failoverState === "SNAPSHOT_FALLBACK" ? "READ-ONLY SNAPSHOT MODE" : "RUNNING ON SQUAD SESSION"));

        // ---- Smart Presence Gatekeeper (v50) ----
        console.log("[GATEKEEPER] Running lightweight presence probe...");
        let anyoneOnline = false;
        let pendingSessionClosing = false;
        let needsInitialCreation = false;

        for (const account of accountsToProcess) {
            const probeAuth = authByKey[account.userKey] || masterAuth;
            const ownProbe = !!authByKey[account.userKey];
            let isOnline = false;

            if (probeAuth) {
                try {
                    const scope = ownProbe ? "me" : (/^\d+$/.test(account.id) ? account.id : null);
                    if (scope) {
                        const pRaw = await getBasicPresence(probeAuth, scope);
                        const onlineStatus = pRaw?.basicPresence?.primaryPlatformInfo?.onlineStatus ||
                                             pRaw?.primaryPlatformInfo?.onlineStatus || "offline";
                        isOnline = (onlineStatus !== "offline");
                    }
                } catch (e) {}
            }

            const twitchIntel = await getTwitchIntelCached(account.twitch);
            if (twitchIntel?.isLive) isOnline = true;
            if (isOnline) anyoneOnline = true;

            const prev = findExistingGamertag(previousGamertags, account.tag);
            if (!prev) needsInitialCreation = true;
            const hasOpenSession = Object.values(prev?.data?.playSessions || {}).some(s => s.isActive);
            if (hasOpenSession && !isOnline) {
                pendingSessionClosing = true;
                console.log(`[GATEKEEPER] ${account.tag} has an unfinalized session requiring logout transition.`);
            }
        }

        if (!anyoneOnline && !pendingSessionClosing && !needsInitialCreation) {
            console.log("[GATEKEEPER] Entire squad is idle and all sessions are finalized. Skipping heavy API calls this cycle.");
            diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
            await syncNodeToFirebase("authDiagnostics", diagnosticReport);
            return;
        }

        console.log("[GATEKEEPER] Activity detected. Running synchronization pass...");

        let finalData = {
            gamertags: { ...previousGamertags },
            usersByGamerTag: { ...(previousFirebaseData?.usersByGamerTag || {}) },
            games: globalGames,
            squadLeaderboard: [],
            squadAnalytics: {},
            mutualSquadFollowers: [],
            authDiagnostics: diagnosticReport,
            lastGlobalUpdate: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }),
            engineVersion: "69.0.0",
            analyticsTag: GA4_MEASUREMENT_ID,
            codeTimestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }) + " EDT"
        };

        const activeKeepKeys = new Set(); // lowercase gamertag keys that must never be purged
        let anyProfileUpdated = false;

        // ---- Process EVERY account through the exact same logic ----
        for (const account of accountsToProcess) {
            const ownAuth = authByKey[account.userKey] || null;
            const agentAuth = ownAuth || masterAuth;
            const existing = findExistingGamertag(previousGamertags, account.tag);
            const existingData = existing?.data || null;
            activeKeepKeys.add(account.tag.toLowerCase());
            if (existing) activeKeepKeys.add(existing.key.toLowerCase());

            console.log(`[ACCOUNT PROCESS] ${account.tag} via ${ownAuth ? "OWN COOKIE SESSION" : (agentAuth ? `FAILOVER (${agentAuth.userKey})` : "NO SESSION")}...`);

            if (!agentAuth) {
                console.warn(`[AUTH HALT] No active session for ${account.tag}. Preserving existing RTDB records.`);
                continue;
            }

            const deltaCheck = await evaluateUserActivityDelta(agentAuth, account.id || "me", account.userKey, account.tag, existingData, account.twitch);

            if (!deltaCheck.hasDelta && existingData) {
                console.log(`[SKIP - NO DELTA] ${account.tag}: ${deltaCheck.reason}.`);
                continue;
            }

            console.log(`[SYNC RUNNING] Processing full telemetry for ${account.tag} (${deltaCheck.reason})...`);
            const data = await getFullUserData(agentAuth, account.tag, account.userKey, account.id, existingData, true, globalGames, cloudDlcCatalog, account.twitch);

            if (data && data.onlineId) {
                activeKeepKeys.add(String(data.onlineId).toLowerCase());
                anyProfileUpdated = true;

                finalData.gamertags[data.onlineId] = data;
                if (/^\d+$/.test(String(data.accountId))) finalData.usersByGamerTag[data.onlineId] = String(data.accountId);

                await syncNodeToFirebase(`gamertags/${data.onlineId}`, data);
                await syncNodeToFirebase(`gamertags/${data.onlineId}/npssoValid`, !!data.npssoValid);

                if (data.currentGameArt) {
                    await syncNodeToFirebase(`gamertags/${data.onlineId}/currentGameArt`, data.currentGameArt);
                }
            }
        }

        // ---- Clean up stale records (case-insensitive, never removes an active player's node) ----
        for (const oldKey of Object.keys(previousGamertags)) {
            if (!activeKeepKeys.has(oldKey.toLowerCase())) {
                console.log(`[LIFECYCLE PURGE] Purging stale entry '${oldKey}' from Firebase...`);
                await deleteNodeFromFirebase(`gamertags/${oldKey}`);
                delete finalData.gamertags[oldKey];
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
            writeLocalFile(finalData);
        }

        diagnosticReport.lastCheck = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
        finalData.authDiagnostics = diagnosticReport;
        await syncNodeToFirebase("authDiagnostics", diagnosticReport);

        console.log(`[SUCCESS] Unified PSN Engine v69.0.0 completed. Profiles updated: ${anyProfileUpdated ? 'YES' : 'NONE (IDLE)'}.`);
    } catch (criticalError) {
        console.error(`[CRITICAL CATCH] Synchronization cycle failed: ${criticalError.message}`);
    }
}

// [SECTION 19: RUNNER INVOCATION] Single-pass execution cleanly exiting for GitHub Actions
(async () => {
    await executeSyncPass();
    process.exit(0);
})();
