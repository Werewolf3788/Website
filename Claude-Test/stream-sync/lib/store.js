/* Firebase (entertainment-71888) access via the Admin SDK.
 *   users/{key}/stream_sync        settings (who to tag, tags, etc.) - see README
 *   users/{key}/stream_sync_state  what the service last did (written here)
 *   user_secrets/{key}/...         tokens and keys (never sent to the browser)
 * Admin SDK credentials: env FIREBASE_SERVICE_ACCOUNT (same as ww-discord-auth). */
"use strict";

const DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const PSN_DB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";

let admin = null;
function db() {
    if (!admin) {
        admin = require("firebase-admin");
        const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
        if (!raw) throw new Error("Missing env var FIREBASE_SERVICE_ACCOUNT");
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)), databaseURL: DB_URL });
    }
    return admin.database();
}

async function get(path) { return (await db().ref(path).once("value")).val(); }
async function update(path, obj) { await db().ref(path).update(obj); }
async function set(path, val) { await db().ref(path).set(val); }

/** Every user with users/{key}/stream_sync/enabled === true. */
async function enabledUsers() {
    const users = (await get("users")) || {};
    return Object.entries(users)
        .filter(([, u]) => u && u.stream_sync && u.stream_sync.enabled === true)
        .map(([key, u]) => ({ key, cfg: u.stream_sync, user: u }));
}

async function secrets(key) { return (await get("user_secrets/" + key)) || {}; }
async function saveSecret(key, field, value) { await update("user_secrets/" + key, { [field]: value }); }
async function saveState(key, obj) { await update("users/" + key + "/stream_sync_state", obj); }
async function state(key) { return (await get("users/" + key + "/stream_sync_state")) || {}; }

/** Find the site user whose stream_sync.<field> matches a platform login. */
async function userByLogin(field, login) {
    const want = String(login || "").toLowerCase();
    const users = (await get("users")) || {};
    for (const [key, u] of Object.entries(users)) {
        const v = u && u.stream_sync && u.stream_sync[field];
        if (v && String(v).replace(/^@/, "").toLowerCase() === want) return key;
    }
    return null;
}

/** Public read of the PlayStation database (accountId for a gamertag). */
async function psnAccountId(onlineId) {
    for (const tag of [onlineId, String(onlineId).toLowerCase()]) {
        try {
            const r = await fetch(`${PSN_DB_URL}/psn/gamertags/${encodeURIComponent(tag)}/accountId.json`);
            const v = await r.json();
            if (v) return String(v);
        } catch (e) { /* try next */ }
    }
    return null;
}

/** The few player-card fields the GitHub PSN sync writes (public read). */
const CARD_FIELDS = ["online", "currentGame", "currentGameId", "commId", "gameStatus", "lastUpdated"];
async function psnCard(onlineId) {
    for (const tag of [onlineId, String(onlineId).toLowerCase()]) {
        try {
            const base = `${PSN_DB_URL}/psn/gamertags/${encodeURIComponent(tag)}`;
            const vals = await Promise.all(CARD_FIELDS.map((f) => fetch(`${base}/${f}.json`).then((r) => r.json()).catch(() => null)));
            if (vals.every((v) => v === null)) continue;
            const card = {};
            CARD_FIELDS.forEach((f, i) => { card[f] = vals[i]; });
            return card;
        } catch (e) { /* try next */ }
    }
    return null;
}

module.exports = { psnCard, db, get, update, set, enabledUsers, secrets, saveSecret, saveState, state, userByLogin, psnAccountId };
