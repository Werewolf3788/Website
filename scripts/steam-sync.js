/* ============================================================================
 * File: steam-sync.js
 * Location: /scripts/steam-sync.js
 * Description: Steam sync for Kevin's DB (entertainment-71888 RTDB).
 *   INPUT : /users/{emailKey}.steam_id  (17-digit SteamID64, a profile link,
 *           or a custom /id/ name; custom names are resolved here)
 *   OUTPUT: /steam_users/{steamId64}
 *             profile  { name, avatar, profileUrl, public, state, currentGame }
 *             friends  { public, count, list:[steamId64...] }
 *             games    { public, count, recent:[...] }
 *             library  { appid: { n, t, l } }   n=name t=minutes played l=last played (unix)
 *             updated_at
 *           /steam_vanity/{customName} = steamId64
 *   Steam only returns friends / games when the player's Steam privacy
 *   settings make them public. Nothing secret is written.
 *   Secrets: STEAM_API_KEY, plus GCP_SA_KEY_WEBSITE (preferred) or
 *            FIREBASE_AUTH_SECRET (fallback) to write to Kevin's DB.
 * ============================================================================ */
"use strict";

const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const API = "https://api.steampowered.com";
const KEY = (process.env.STEAM_API_KEY || "").trim();

if (!KEY) {
    console.error("[STEAM] STEAM_API_KEY secret is missing. Add it under GitHub > Settings > Secrets and variables > Actions.");
    process.exit(1);
}

/* ---------- Database access (Admin SDK first, REST + legacy secret fallback) ---------- */
let adminDb = null;
function initAdmin() {
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (!raw) return;
    try {
        const { initializeApp, cert } = require("firebase-admin/app");
        const { getDatabase } = require("firebase-admin/database");
        const creds = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
        if (typeof creds.private_key === "string") creds.private_key = creds.private_key.replace(/\\n/g, "\n");
        adminDb = getDatabase(initializeApp({ credential: cert(creds), databaseURL: KEVIN_RTDB_URL }, "kevinSteam"));
        console.log("[DB] Using Admin SDK.");
    } catch (e) {
        console.warn(`[DB] Admin SDK unavailable (${e.message}); using REST.`);
    }
}
const authQ = () => (process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "");

async function dbGet(path) {
    if (adminDb) return (await adminDb.ref(path).once("value")).val();
    const r = await fetch(`${KEVIN_RTDB_URL}/${path}.json${authQ()}`);
    const j = await r.json();
    if (j && j.error) throw new Error(`${path}: ${j.error}`);
    return j;
}
async function dbSet(path, value) {
    if (adminDb) return adminDb.ref(path).set(value);
    const r = await fetch(`${KEVIN_RTDB_URL}/${path}.json${authQ()}`, { method: "PUT", body: JSON.stringify(value) });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
}

/* ---------- Steam API ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function steam(path, params) {
    const qs = new URLSearchParams({ key: KEY, format: "json", ...params });
    for (let attempt = 1; attempt <= 3; attempt++) {
        const r = await fetch(`${API}/${path}/?${qs}`);
        if (r.status === 401 || r.status === 403) return { _private: true };   // friends/games hidden by the player
        if (r.status === 429 || r.status >= 500) { await sleep(2000 * attempt); continue; }
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json();
    }
    throw new Error(`${path}: Steam kept failing (rate limit or outage).`);
}

const ID64 = /^7656119\d{10}$/;
const safeKey = (s) => String(s || "").toLowerCase().replace(/[.$#\[\]\/]/g, "_");

/** Turn whatever the user typed into a SteamID64, or null. */
async function toSteamId64(raw, vanityCache) {
    let v = String(raw || "").trim();
    if (!v) return null;
    const prof = v.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
    if (prof) return prof[1];
    const digits = v.match(/\b(7656119\d{10})\b/);
    if (digits) return digits[1];
    const custom = v.match(/steamcommunity\.com\/id\/([^\/?#\s]+)/i);
    if (custom) v = custom[1];
    if (!/^[A-Za-z0-9_-]{2,32}$/.test(v)) return null;
    const k = safeKey(v);
    if (vanityCache[k]) return vanityCache[k];
    const j = await steam("ISteamUser/ResolveVanityURL/v1", { vanityurl: v });
    const id = j?.response?.success === 1 ? j.response.steamid : null;
    if (id) { vanityCache[k] = id; await dbSet(`steam_vanity/${k}`, id); }
    return id;
}

const STATES = ["offline", "online", "busy", "away", "snooze", "looking to trade", "looking to play"];

async function main() {
    initAdmin();
    const users = (await dbGet("users")) || {};
    const vanityCache = (await dbGet("steam_vanity").catch(() => null)) || {};

    // 1. Collect every SteamID64 entered in Settings
    const ids = new Set();
    for (const [emailKey, u] of Object.entries(users)) {
        if (!u || !u.steam_id) continue;
        try {
            const id = await toSteamId64(u.steam_id, vanityCache);
            if (id) ids.add(id);
            else console.warn(`[STEAM] ${emailKey}: "${u.steam_id}" is not a Steam ID or custom name.`);
        } catch (e) { console.warn(`[STEAM] ${emailKey}: ${e.message}`); }
    }
    console.log(`[STEAM] ${ids.size} Steam account(s) to sync.`);
    if (!ids.size) return;

    // 2. Profiles (up to 100 per call)
    const all = [...ids];
    const profiles = {};
    for (let i = 0; i < all.length; i += 100) {
        const j = await steam("ISteamUser/GetPlayerSummaries/v2", { steamids: all.slice(i, i + 100).join(",") });
        for (const p of j?.response?.players || []) profiles[p.steamid] = p;
    }

    // 3. Friends + games per account
    let ok = 0, failed = 0;
    for (const id of all) {
        try {
            const p = profiles[id] || {};
            const isPublic = p.communityvisibilitystate === 3;
            const fr = await steam("ISteamUser/GetFriendList/v1", { steamid: id, relationship: "friend" });
            const friendIds = (fr?.friendslist?.friends || []).map((f) => f.steamid);
            const owned = await steam("IPlayerService/GetOwnedGames/v1", { steamid: id, include_appinfo: 1, include_played_free_games: 1 });
            const recent = await steam("IPlayerService/GetRecentlyPlayedGames/v1", { steamid: id, count: 10 });

            const library = {};
            for (const g of owned?.response?.games || []) {
                library[g.appid] = { n: g.name || `App ${g.appid}`, t: g.playtime_forever || 0, l: g.rtime_last_played || 0 };
            }
            const gamesPublic = !owned?._private && Array.isArray(owned?.response?.games);

            await dbSet(`steam_users/${id}`, {
                profile: {
                    name: p.personaname || null,
                    avatar: p.avatarfull || p.avatarmedium || p.avatar || null,
                    profileUrl: p.profileurl || `https://steamcommunity.com/profiles/${id}`,
                    public: isPublic,
                    state: STATES[p.personastate] || "offline",
                    currentGame: p.gameextrainfo || null,
                    currentGameId: p.gameid || null,
                    lastLogoff: p.lastlogoff || null
                },
                friends: { public: !fr?._private && !!fr?.friendslist, count: friendIds.length, list: friendIds },
                games: {
                    public: gamesPublic,
                    count: owned?.response?.game_count || 0,
                    recent: (recent?.response?.games || []).map((g) => ({
                        appid: g.appid, name: g.name || `App ${g.appid}`,
                        minutes2w: g.playtime_2weeks || 0, minutesTotal: g.playtime_forever || 0
                    }))
                },
                library,
                updated_at: Date.now()
            });
            ok++;
            console.log(`[STEAM] ${p.personaname || id}: ${friendIds.length} friends, ${Object.keys(library).length} games${isPublic ? "" : " (profile not public)"}.`);
            await sleep(300);
        } catch (e) {
            failed++;
            console.warn(`[STEAM] ${id}: ${e.message}`);
        }
    }
    console.log(`[STEAM] Done. Synced ${ok}, failed ${failed}.`);
    if (failed && !ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(`[STEAM] ${e.stack || e.message}`); process.exit(1); });
