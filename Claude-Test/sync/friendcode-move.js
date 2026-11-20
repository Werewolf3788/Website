/* ============================================================================
 * File: friendcode-move.js
 * Location: /Claude-Test/sync/friendcode-move.js
 * Run by .github/workflows/friendcode-move.yml (Actions -> "Friend Code Move").
 * One-time move so every player's game data sits under their FRIEND CODE in
 * Kevin's Firestore: user/{FRIENDCODE}/platform/{ps|xbox|steam|pc|mobile}/game/{game}
 *
 *   check : read-only. Lists what would be copied, and prints the Firestore rules.
 *   copy  : 1) Game Companion saves stored under an email key (user/{emailKey}/...)
 *              are copied to the friend code. If the friend code already has that
 *              game, the newer save (updatedAt) wins. The email copies are left as backup.
 *           2) Mobile game progress in users/{key}/mobile_progress (Realtime Database,
 *              read only) is copied to user/{CODE}/platform/mobile/game/{game}.progress
 *              when that game has no progress there yet.
 *   cleanup : deletes the email-key copies (user/{emailKey}/...) once every one of
 *             their games is under the friend code. Nothing in the Realtime Database is changed.
 * ============================================================================ */
"use strict";

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");

const MODE = String(process.env.MODE || "check").trim().toLowerCase();
const PLATS = ["ps", "xbox", "steam", "pc", "mobile"];

const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
if (!raw) { console.error("GCP_SA_KEY_WEBSITE is missing."); process.exit(1); }
const creds = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
if (typeof creds.private_key === "string") creds.private_key = creds.private_key.replace(/\\n/g, "\n");
const app = initializeApp({ credential: cert(creds), databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com" });
const fs = getFirestore(app), rtdb = getDatabase(app);

const ts = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : Number(v) || 0);

async function printRules() {
    try {
        const { GoogleAuth } = require("google-auth-library");
        const auth = new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
        const client = await auth.getClient();
        const base = `https://firebaserules.googleapis.com/v1/projects/${creds.project_id}`;
        const rel = (await client.request({ url: `${base}/releases/cloud.firestore` })).data;
        const rs = (await client.request({ url: `https://firebaserules.googleapis.com/v1/${rel.rulesetName}` })).data;
        console.log("---- Firestore rules now live ----");
        for (const f of rs.source.files) console.log(f.content);
        console.log("----------------------------------");
    } catch (e) { console.log(`(Could not read the Firestore rules: ${e.message})`); }
}

async function main() {
    console.log(`Mode: ${MODE}`);
    if (MODE === "check") await printRules();
    const users = (await rtdb.ref("users").once("value")).val() || {};
    const codeOf = {};   // emailKey -> friend code
    for (const [k, u] of Object.entries(users)) {
        const c = String((u && u.friend_code) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (c) codeOf[k] = c;
    }
    console.log(`${Object.keys(codeOf).length} members with a friend code.`);

    let copied = 0, kept = 0, mobile = 0, deleted = 0, blocked = 0;
    for (const [emailKey, code] of Object.entries(codeOf)) {
        // 1) Game Companion saves under the email key
        let all = 0, moved = 0;
        for (const plat of PLATS) {
            const src = await fs.collection("user").doc(emailKey).collection("platform").doc(plat).collection("game").get();
            for (const d of src.docs) {
                all++;
                const dst = fs.collection("user").doc(code).collection("platform").doc(plat).collection("game").doc(d.id);
                const cur = await dst.get();
                const curData = cur.exists ? cur.data() || {} : {};
                const srcData = d.data() || {};
                const dstHasSave = cur.exists && curData.updatedAt != null;
                if (dstHasSave && ts(curData.updatedAt) >= ts(srcData.updatedAt)) { kept++; moved++; continue; }   // friend code already has it (same or newer)
                console.log(`  ${emailKey} -> ${code}: ${plat}/${d.id}${dstHasSave ? " (newer than the friend-code copy)" : ""}`);
                if (MODE === "copy") { await dst.set(srcData, { merge: true }); copied++; moved++; }
            }
        }
        if (MODE === "cleanup" && all) {
            // only when every email-key game is under the friend code too
            let missing = 0;
            for (const plat of PLATS) {
                const src = await fs.collection("user").doc(emailKey).collection("platform").doc(plat).collection("game").get();
                for (const d of src.docs) {
                    const cur = await fs.collection("user").doc(code).collection("platform").doc(plat).collection("game").doc(d.id).get();
                    if (!cur.exists || (cur.data() || {}).updatedAt == null) missing++;
                }
            }
            if (missing) { blocked++; console.log(`  ${emailKey}: ${missing} game(s) not copied yet, left alone (run copy first).`); }
            else {
                await fs.recursiveDelete(fs.collection("user").doc(emailKey));
                deleted++; console.log(`  deleted user/${emailKey} (all ${all} game(s) are under ${code})`);
            }
        }

        // 2) Mobile game progress from the Realtime Database (read only)
        const mp = (users[emailKey] || {}).mobile_progress || {};
        for (const [game, info] of Object.entries(mp)) {
            if (!info || typeof info !== "object") continue;
            const id = String(game).replace(/[^A-Za-z0-9_-]/g, "_");
            const dst = fs.collection("user").doc(code).collection("platform").doc("mobile").collection("game").doc(id);
            const cur = await dst.get();
            if (cur.exists && (cur.data() || {}).progress) continue;
            console.log(`  ${code}: mobile progress for ${game}`);
            if (MODE === "copy") { await dst.set({ progress: info }, { merge: true }); mobile++; }
        }
    }
    console.log(`Done. Game saves copied: ${copied}, already under the friend code: ${kept}, mobile progress copied: ${mobile}` +
        (MODE === "cleanup" ? `, email copies deleted: ${deleted}, left alone: ${blocked}` : "") + ".");
    if (MODE === "check") console.log("Nothing was written (check mode).");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.stack || e.message); process.exit(1); });
