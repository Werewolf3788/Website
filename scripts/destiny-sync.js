/* ============================================================================
 * File: scripts/destiny-sync.js
 * Description: Destiny 2 sync (Bungie.net API) -> Kevin's RTDB (entertainment-71888).
 *   INPUT : /users/{emailKey}.bungie_name   ("Name#1234")
 *   KEY   : /user_secrets/{emailKey}.bungie_api_key (own), else the owner's key in
 *           /user_secrets/{OWNER}.bungie_api_key (or BUNGIE_API_KEY secret) for the owner's close friends.
 *   OUTPUT: /destiny_users/{emailKey} { name, membershipType, membershipId, updated_at,
 *             characters:[{ cls, race, light, minutes, last }], totals:{ minutes, kills, deaths, activities } }
 *   Only public data is read; nothing secret is written.
 * ============================================================================ */
"use strict";
const DB = "https://entertainment-71888-default-rtdb.firebaseio.com";
const BNET = "https://www.bungie.net/Platform";
const OWNER = (process.env.OWNER_EMAIL_KEY || "raykevin71888_at_gmail_com").trim();
let SITE_KEY = (process.env.BUNGIE_API_KEY || "").trim();
const CLS = ["Titan", "Hunter", "Warlock"], RACE = ["Human", "Awoken", "Exo"];
let adminDb = null;
function initAdmin() {
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim(); if (!raw) return;
    try {
        const { initializeApp, cert } = require("firebase-admin/app");
        const { getDatabase } = require("firebase-admin/database");
        const c = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
        if (typeof c.private_key === "string") c.private_key = c.private_key.replace(/\\n/g, "\n");
        adminDb = getDatabase(initializeApp({ credential: cert(c), databaseURL: DB }, "kevinDestiny"));
    } catch (e) { console.warn(`[DB] Admin SDK unavailable (${e.message}); using REST.`); }
}
const q = () => (process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "");
async function dbGet(p) { if (adminDb) return (await adminDb.ref(p).once("value")).val(); const r = await fetch(`${DB}/${p}.json${q()}`); return r.json(); }
async function dbSet(p, v) { if (adminDb) return adminDb.ref(p).set(v); const r = await fetch(`${DB}/${p}.json${q()}`, { method: "PUT", body: JSON.stringify(v) }); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function bnet(key, path, opt) {
    for (let a = 1; a <= 3; a++) {
        const r = await fetch(`${BNET}${path}`, { ...opt, headers: { "X-API-Key": key, "Content-Type": "application/json" } });
        if (r.status === 401 || r.status === 403) throw new Error("BADKEY");
        if (r.status === 429 || r.status >= 500) { await sleep(2000 * a); continue; }
        const j = await r.json(); if (j.ErrorCode === 2105) throw new Error("BADKEY"); return j;
    }
    throw new Error(`${path}: Bungie kept failing`);
}
async function syncOne(key, emailKey, bungieName) {
    const m = String(bungieName).trim().match(/^(.{1,32})#(\d{1,4})$/);
    if (!m) throw new Error(`"${bungieName}" is not Name#1234`);
    const s = await bnet(key, "/Destiny2/SearchDestinyPlayerByBungieName/-1/", { method: "POST", body: JSON.stringify({ displayName: m[1], displayNameCode: Number(m[2]) }) });
    const p = (s.Response || [])[0]; if (!p) throw new Error("no Destiny 2 player with that Bungie name");
    const t = p.membershipType, id = p.membershipId;
    const prof = await bnet(key, `/Destiny2/${t}/Profile/${id}/?components=100,200`);
    const chars = Object.values(prof.Response?.characters?.data || {});
    if (!chars.length) throw new Error("profile is private or has no characters");
    const stats = await bnet(key, `/Destiny2/${t}/Account/${id}/Stats/`);
    const all = stats.Response?.mergedAllCharacters?.merged?.allTime || {};
    const v = (k) => Math.round(all[k]?.basic?.value || 0);
    await dbSet(`destiny_users/${emailKey}`, {
        name: `${p.bungieGlobalDisplayName || m[1]}#${String(p.bungieGlobalDisplayNameCode || m[2]).padStart(4, "0")}`,
        membershipType: t, membershipId: String(id), updated_at: Date.now(),
        characters: chars.map((c) => ({ cls: CLS[c.classType] || "Guardian", race: RACE[c.raceType] || "", light: c.light | 0, minutes: Number(c.minutesPlayedTotal) || 0, last: c.dateLastPlayed || "" })),
        totals: { minutes: Math.round(v("secondsPlayed") / 60), kills: v("kills"), deaths: v("deaths"), activities: v("activitiesEntered") },
    });
}
async function main() {
    initAdmin();
    const users = (await dbGet("users")) || {}, secrets = (await dbGet("user_secrets").catch(() => null)) || {};
    if (!SITE_KEY) SITE_KEY = String((secrets[OWNER] || {}).bungie_api_key || (secrets._site || {}).bungie_api_key || "").trim();
    const close = new Set([OWNER]);
    for (const [code, f] of Object.entries((users[OWNER] || {}).friends || {})) {
        if (!f || f.close_friend !== true) continue;
        const c = String(f.friend_code || code).toUpperCase();
        for (const [ek, u] of Object.entries(users)) if (u && String(u.friend_code || "").toUpperCase() === c) close.add(ek);
    }
    let n = 0;
    for (const [ek, u] of Object.entries(users)) {
        if (!u || !u.bungie_name) continue;
        const own = String((secrets[ek] || {}).bungie_api_key || "").trim();
        const keys = [...(close.has(ek) && SITE_KEY ? [SITE_KEY] : []), ...(own ? [own] : [])];
        if (!keys.length) { console.warn(`[DESTINY] ${ek}: no Bungie API key available`); continue; }
        for (const k of keys) {
            try { await syncOne(k, ek, u.bungie_name); n++; console.log(`[DESTINY] ${ek}: ok`); break; }
            catch (e) { console.warn(`[DESTINY] ${ek}: ${e.message}`); if (e.message !== "BADKEY") break; }
        }
    }
    console.log(`[DESTINY] synced ${n} account(s).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
