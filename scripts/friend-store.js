"use strict";
/* ============================================================================
 * friend-store.js - one place for every player's game data
 *
 * All game data (PlayStation, Xbox, Steam, Destiny, mobile games, the Game
 * Tracker) lives in Kevin's Firestore (entertainment-71888) under the player's
 * friend code:
 *
 *     user/{FRIEND_CODE}/platform/{platform}            <- account-level info (field per source)
 *     user/{FRIEND_CODE}/platform/{platform}/game/{id}  <- one doc per game
 *
 * Game doc ids match the Game Tracker (catalog gameId, e.g. "wildlands",
 * "FarCry5"), so a game's PSN trophies and the tracker checklist share one doc.
 * Each sync writes its own field ({ psn: {...} }, { steam: {...} }...) with
 * merge, so nothing overwrites anything else.
 *
 * Gamertags / Steam ids / emails are turned into friend codes from
 * /users/{emailKey} in the Realtime Database. Players with no site account
 * (no friend code yet) are held under pending/{platform}_{id} with the same
 * layout, and moved under their friend code once they sign up.
 *
 * Live "now playing" status stays in the Realtime Database (cheap, fast).
 * ============================================================================ */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getFirestore } = require("firebase-admin/firestore");

const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const PLATFORM_FIELDS = {
    // which /users/{key} fields name the player on each platform
    ps: ["psn_username", "psn_online_id", "psn_account_id", "gaming_platforms.psn_username"],
    xbox: ["xbox_gamertag", "xbox_username", "xbox_user_id", "gaming_platforms.xbox_gamertag", "gaming_platforms.xbox_username"],
    steam: ["steam_id", "steamid", "gaming_platforms.steam_id"]
};

let fs = null, db = null, index = null, catalog = null;

function parseCreds(raw) {
    const t = String(raw || "").trim();
    if (!t) return null;
    const c = t.startsWith("{") ? JSON.parse(t) : JSON.parse(Buffer.from(t, "base64").toString("utf-8"));
    if (typeof c.private_key === "string") c.private_key = c.private_key.replace(/\\n/g, "\n");
    return c;
}

/** Connect with Kevin's service account (GCP_SA_KEY_WEBSITE). Returns false if not available. */
function init(raw = process.env.GCP_SA_KEY_WEBSITE) {
    if (fs) return true;
    const creds = parseCreds(raw);
    if (!creds) { console.warn("[friend-store] GCP_SA_KEY_WEBSITE missing - friend-code copies skipped."); return false; }
    const app = getApps().find((a) => a.name === "friendStore") || initializeApp({ credential: cert(creds), databaseURL: KEVIN_RTDB_URL }, "friendStore");
    db = getDatabase(app);
    fs = getFirestore(app);
    try { fs.settings({ ignoreUndefinedProperties: true }); } catch (e) { /* already set */ }
    return true;
}

const norm = (s) => String(s || "").toLowerCase().replace(/[™®©]/g, "").replace(/[^a-z0-9]+/g, "");
const safeId = (s) => String(s || "").trim().replace(/[\/.#$\[\]]/g, "_");
const plain = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));
const dig = (o, path) => path.split(".").reduce((x, k) => (x && typeof x === "object" ? x[k] : undefined), o);

/** Build gamertag/id -> friend code maps from /users (one read per run). */
async function loadIndex(force) {
    if (index && !force) return index;
    const users = (await db.ref("users").once("value")).val() || {};
    index = { byEmail: {}, ps: {}, xbox: {}, steam: {} };
    for (const [emailKey, u] of Object.entries(users)) {
        if (!u || typeof u !== "object") continue;
        const code = String(u.friend_code || "").trim();   // exactly as stored, same as the Game Tracker
        if (!code) continue;
        index.byEmail[emailKey] = code;
        for (const [plat, fields] of Object.entries(PLATFORM_FIELDS)) {
            for (const f of fields) {
                const v = dig(u, f);
                if (v !== undefined && v !== null && String(v).trim()) index[plat][String(v).trim().toLowerCase()] = code;
            }
        }
    }
    return index;
}

/** Friend code for a platform id (gamertag / steam id) or an email key; null if they have no site account. */
async function codeFor(platform, ident) {
    await loadIndex();
    const id = String(ident || "").trim();
    if (!id) return null;
    if (platform === "email") return index.byEmail[id] || null;
    return (index[platform] || {})[id.toLowerCase()] || null;
}

/** Where this player's platform data goes: user/{code}/platform/{p}, or pending/{p}_{id}. */
async function platformRef(platform, ident) {
    const code = await codeFor(platform, ident);
    if (code) return { ref: fs.collection("user").doc(code).collection("platform").doc(platform), code, pending: false };
    return { ref: fs.collection("pending").doc(`${platform}_${safeId(ident).toLowerCase()}`), code: null, pending: true };
}

/** Game Tracker catalog (/platforms/games) so synced games use the same doc ids as the tracker. */
async function loadCatalog() {
    if (catalog) return catalog;
    const raw = (await db.ref("platforms/games").once("value")).val() || {};
    catalog = {};
    for (const [gKey, g] of Object.entries(raw)) {
        const id = trackerId(gKey, g);
        for (const name of [gKey, g && g.game, g && g.title, g && g.gameId, ...(((g && g.aliases) || []))]) if (name) catalog[norm(name)] = id;
    }
    return catalog;
}
function trackerId(gKey, g) {
    const k = String(gKey).toLowerCase();
    if (k === "farcry5") return "FarCry5";
    if (k === "farcry6") return "FarCry6";
    if (k === "sniperelite5" || k === "se5") return "SniperElite5";
    if (k === "snresistance") return "SniperEliteResistance";
    return (g && g.gameId) || gKey;
}

/** Doc id for a game title: the tracker's id when the tracker knows the game, else a clean key. */
async function gameDocId(title, fallbackKey) {
    await loadCatalog();
    const n = norm(title);
    if (catalog[n]) return catalog[n];
    // "Tom Clancy's Ghost Recon® Wildlands" -> tracker "wildlands": match on the tracker name's ending
    for (const [name, id] of Object.entries(catalog)) if (name.length >= 6 && n.endsWith(name)) return id;
    return safeId(fallbackKey || n || "game").slice(0, 120);
}

/** Merge one source's account info into the platform doc. */
async function writePlatform(platform, ident, field, data) {
    const t = await platformRef(platform, ident);
    await t.ref.set(plain({ [field]: data, ...(t.pending ? { platform, ident: String(ident) } : {}) }), { merge: true });
    return t;
}

/** Merge one source's data for one game. */
async function writeGame(platform, ident, title, fallbackKey, field, data) {
    const t = await platformRef(platform, ident);
    const id = await gameDocId(title, fallbackKey);
    await t.ref.collection("game").doc(id).set(plain({ [field]: data, title: title || null }), { merge: true });
    return { ...t, id };
}

/** If this player now has a friend code, drop their old pending copy (the sync rewrites it under the code). */
async function clearPending(platform, ident) {
    if (!(await codeFor(platform, ident))) return false;
    const ref = fs.collection("pending").doc(`${platform}_${safeId(ident).toLowerCase()}`);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await fs.recursiveDelete(ref);
    return true;
}

module.exports = { _use: (d, f) => { db = d; fs = f; index = null; catalog = null; }, init, loadIndex, codeFor, platformRef, gameDocId, writePlatform, writeGame, clearPending, norm, safeId, firestore: () => fs, rtdb: () => db };
