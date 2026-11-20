/* ============================================================================
 * File: friend-games.js
 * Location: /Claude-Test/sync/friend-games.js
 * Description: One place every sync job (Steam, Xbox, PlayStation, ...) saves a
 *   player's games: Kevin's Firestore (entertainment-71888), keyed by FRIEND CODE.
 *
 *   user/{FRIENDCODE}/platform/{plat}                 summary doc (one read for a profile page)
 *       { profile:{...}, games:{ gameId:{ t, p, e, n, h, l, art, now } }, h:{ gameId: hash }, updatedAt }
 *   user/{FRIENDCODE}/platform/{plat}/game/{gameId}   full detail, under the "sync" field only
 *       { sync:{ title, progress, earned, total, hours, lastPlayed, art, list, extra, updatedAt } }
 *       list = earned trophies/achievements [{ id, n, d, i, t }], kept when a run doesn't look them up
 *
 *   plat is ps | xbox | steam | mobile (same names the Game Companion uses).
 *   Only the "sync" field is ever written on a game doc (merge), so anything the
 *   Game Companion saved on the same game (checklists, notes) is never touched.
 *   Only games whose data changed are written, to stay inside the free plan.
 *   Nothing is written to the Realtime Database.
 * ============================================================================ */
"use strict";

const crypto = require("crypto");

let fs = null;

/** Firestore for Kevin's project, from the GCP_SA_KEY_WEBSITE secret. Returns null when it isn't available. */
function firestore() {
    if (fs) return fs;
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (!raw) { console.warn("[friend-games] GCP_SA_KEY_WEBSITE missing; friend-code saves skipped."); return null; }
    try {
        const { initializeApp, cert, getApps } = require("firebase-admin/app");
        const { getFirestore } = require("firebase-admin/firestore");
        const creds = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
        if (typeof creds.private_key === "string") creds.private_key = creds.private_key.replace(/\\n/g, "\n");
        const app = getApps().find((a) => a.name === "friendGames") ||
            initializeApp({ credential: cert(creds), projectId: creds.project_id || "entertainment-71888" }, "friendGames");
        fs = getFirestore(app);
        return fs;
    } catch (e) {
        console.warn(`[friend-games] Firestore unavailable: ${e.message}`);
        return null;
    }
}

/** "Far Cry® 5" -> "FarCry5". Same style the Game Companion uses for its game docs. */
function gameId(title) {
    const id = String(title || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[™®©]/g, "").replace(/[^A-Za-z0-9]+/g, "");
    return (id || "Unknown").slice(0, 120);
}

/** Friend code for a user record (users/{emailKey}), upper-case, or "". */
function friendCodeOf(user) {
    return String((user && user.friend_code) || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const hash = (v) => crypto.createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 16);
const clean = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x === undefined ? null : x)));

/**
 * Save one player's games for one platform.
 * games: [{ title, progress (0-100), earned, total, hours (number), lastPlayed (ms), art, playing, list }]
 *   list = optional detail (earned trophies/achievements), only stored on the game doc.
 * profile: small object shown on the profile page (name, avatar, online, currentGame, stats...).
 */
async function savePlatform(code, plat, profile, games) {
    const db = firestore();
    code = String(code || "").toUpperCase();
    if (!db || !code) return { written: 0, skipped: true };
    const platRef = db.collection("user").doc(code).collection("platform").doc(plat);
    const prev = (await platRef.get()).data() || {};
    const prevH = prev.h || {};

    const summary = {}, hashes = {}, changed = [];
    for (const g of games || []) {
        if (!g || !g.title) continue;
        const id = gameId(g.title);
        if (summary[id]) continue;                           // same title twice: keep the first (most recent)
        const row = clean({
            t: String(g.title).slice(0, 200),
            p: g.progress == null ? null : Math.max(0, Math.min(100, Math.round(g.progress))),
            e: g.earned == null ? null : g.earned, n: g.total == null ? null : g.total,
            h: g.hours == null ? null : Math.round(g.hours * 10) / 10,
            l: g.lastPlayed || null, art: g.art || null, now: !!g.playing
        });
        summary[id] = row;
        const detail = clean({ title: row.t, progress: row.p, earned: row.e, total: row.n, hours: row.h,
            lastPlayed: row.l, art: row.art, extra: g.extra || null });
        // The trophy/achievement list is only sent when the sync looked it up this run; otherwise the saved one stays.
        const hasList = Array.isArray(g.list);
        if (hasList) detail.list = clean(g.list);
        const prevList = String(prevH[id] || "").split(":")[1] || "";
        hashes[id] = hash({ ...detail, list: undefined }) + ":" + (hasList ? hash(detail.list) : prevList);
        if (prevH[id] !== hashes[id]) changed.push([id, detail]);
    }

    // game docs: only the ones that changed, "sync" field only (Game Companion fields stay as they are)
    for (let i = 0; i < changed.length; i += 400) {
        const batch = db.batch();
        for (const [id, detail] of changed.slice(i, i + 400)) {
            batch.set(platRef.collection("game").doc(id), { sync: { ...detail, updatedAt: Date.now() } }, { merge: true });
        }
        await batch.commit();
    }

    const head = clean({ profile: profile || {}, games: summary, h: hashes });
    if (changed.length || hash(clean({ profile: prev.profile || {}, games: prev.games || {}, h: prevH })) !== hash(head)) {
        await platRef.set({ ...head, updatedAt: Date.now() });
        return { written: changed.length + 1 };
    }
    return { written: 0 };
}

function useDb(db) { fs = db; }   // tests
module.exports = { firestore, gameId, friendCodeOf, savePlatform, useDb };
