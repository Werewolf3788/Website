/* ============================================================================
 * File: xbox.js
 * Location: /Xbox/xbox.js
 * Version: 1.0.0
 * Description: Xbox Telemetry Engine - Ray's Firebase (playstation-stats)
 *   Mirrors the shape of Playstation/psn.js, but for Xbox/Microsoft accounts.
 *   INPUT  : Kevin's DB (entertainment-71888) /users + /user_secrets (READ-ONLY):
 *            xbox_gamertag (handle) and xbox_api_key (private, OpenXBL key the
 *            user pastes into Settings -> Xbox / Microsoft sync).
 *   OUTPUT : Ray's DB (playstation-stats) via FIREBASE_SERVICE_RAY (Admin SDK)
 *     RTDB (live, changes often), same project PSN already writes to:
 *       /xbox/gamertags/{gamertag}   player card: gamerscore, presence, achievements
 *       /xbox/usersByGamerTag, /xbox/engineStatus, /xbox/meta
 *   No GitHub secrets needed for the Xbox side: unlike PSN's CORE_PACK (which
 *   has 4 hardcoded accounts with NPSSO cookies stored as repo secrets),
 *   every Xbox account here is a "guest": its gamertag + OpenXBL key both come
 *   from Kevin's DB (the user pasted the key into Settings), so adding a new
 *   person to track is just them filling in Settings - no workflow edit needed.
 *
 *   OpenXBL (xbl.io) contract note: OpenXBL is a third-party, unofficial
 *   bridge to Xbox Live and does not publish a fully stable, versioned API
 *   reference the way Sony's trophy endpoints (wrapped by psn-api) do. The
 *   endpoints/header below (X-Authorization header, https://xbl.io/api/v2/*)
 *   match OpenXBL's commonly documented v2 contract, but this hasn't been
 *   exercised against a real key yet. If a real run comes back with
 *   different field names or a different auth header, fetchOpenXBL() and the
 *   two endpoint functions below it are the only things that need adjusting.
 * ============================================================================ */
"use strict";

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const KEVIN_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const RAY_RTDB_URL = "https://playstation-stats-default-rtdb.firebaseio.com";
const ENGINE_VERSION = "1.0.0";
const OPENXBL_BASE = "https://xbl.io/api/v2";
const IS_MANUAL = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

/* ----------------------------------------------------------------------------
 * Shared helpers (same pattern as Playstation/psn.js, kept local so this file
 * has no dependency on it)
 * -------------------------------------------------------------------------- */
function parseServiceAccount(raw, label) {
    const t = String(raw || "").trim();
    if (!t) throw new Error(`${label} is empty or not passed to this workflow step.`);
    let creds;
    try {
        creds = t.startsWith("{") ? JSON.parse(t) : JSON.parse(Buffer.from(t, "base64").toString("utf-8"));
    } catch (e) {
        throw new Error(`${label} is not valid JSON: ${e.message}`);
    }
    if (typeof creds.private_key === "string") creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    return creds;
}

function getNamedApp(name, creds, databaseURL) {
    const found = getApps().find((a) => a.name === name);
    return found || initializeApp({ credential: cert(creds), databaseURL }, name);
}

function plain(obj) {
    // Strip undefined so Firebase doesn't choke on it (same intent as psn.js's plain()).
    return JSON.parse(JSON.stringify(obj));
}

function nowEt() {
    return new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
}

let rayDb = null;
function initRayFirebase() {
    const creds = parseServiceAccount(process.env.FIREBASE_SERVICE_RAY, "FIREBASE_SERVICE_RAY");
    const app = getNamedApp("rayAppXbox", creds, RAY_RTDB_URL);
    rayDb = getDatabase(app);
    console.log(`[RAY FIREBASE] Connected to project ${creds.project_id} (RTDB).`);
}
const rtdbRef = (p) => rayDb.ref(`xbox/${p}`);

/* ----------------------------------------------------------------------------
 * Kevin's Firebase (READ-ONLY): gamertags + OpenXBL keys only
 * -------------------------------------------------------------------------- */
async function readKevinNodes() {
    let users = {}, secrets = {}, ok = false;
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (raw) {
        try {
            const creds = parseServiceAccount(raw, "GCP_SA_KEY_WEBSITE");
            const db = getDatabase(getNamedApp("kevinAppXbox", creds, KEVIN_RTDB_URL));
            const [u, s] = await Promise.all([db.ref("users").once("value"), db.ref("user_secrets").once("value")]);
            users = u.val() || {};
            secrets = s.val() || {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] Admin read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] Admin read failed (${e.message}); trying FIREBASE_AUTH_SECRET.`);
        }
    }
    if (!ok) {
        const q = process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "";
        try {
            const [uRes, sRes] = await Promise.all([
                fetch(`${KEVIN_RTDB_URL}/users.json${q}`).then((r) => r.json()),
                fetch(`${KEVIN_RTDB_URL}/user_secrets.json${q}`).then((r) => r.json())
            ]);
            if (uRes && uRes.error) console.warn(`[KEVIN DB] /users: ${uRes.error}`);
            if (sRes && sRes.error) console.warn(`[KEVIN DB] /user_secrets: ${sRes.error}`);
            users = uRes && typeof uRes === "object" && !uRes.error ? uRes : {};
            secrets = sRes && typeof sRes === "object" && !sRes.error ? sRes : {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] REST read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] REST read failed: ${e.message}`);
        }
    }
    return { users, secrets, ok };
}

// Every tracked Xbox account is a "guest" in the psn.js sense: gamertag + key
// both live in Kevin's DB (filled in via Settings), never a hardcoded list.
async function readKevinXboxAccounts() {
    const { users, secrets, ok } = await readKevinNodes();
    const pick = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
    const accounts = [];
    for (const [emailKey, u] of Object.entries(users)) {
        if (!u || typeof u !== "object") continue;
        const sec = (secrets && secrets[emailKey]) || {};
        const gaming = u.gaming_platforms || {};
        const gamertag = String(pick(u.xbox_gamertag, gaming.xbox_gamertag) || "").trim();
        const apiKey = String(pick(sec.xbox_api_key, u.xbox_api_key, gaming.xbox_api_key) || "").trim();
        const updatedAt = sec.updated_at || u.updated_at || null;
        if (gamertag && apiKey) accounts.push({ emailKey, gamertag, apiKey, updatedAt });
    }
    console.log(`[KEVIN DB] Xbox accounts with both a gamertag and a key: ${accounts.length}`);
    return { accounts, usersReadOk: ok };
}

/* ----------------------------------------------------------------------------
 * OpenXBL (xbl.io) client
 * -------------------------------------------------------------------------- */
async function fetchOpenXBL(path, apiKey) {
    const res = await fetch(`${OPENXBL_BASE}${path}`, {
        headers: { "X-Authorization": apiKey, Accept: "application/json" }
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON error page */ }
    if (!res.ok) {
        const msg = (json && (json.message || json.error)) || text.slice(0, 200) || `HTTP ${res.status}`;
        throw new Error(`OpenXBL ${path} -> ${res.status}: ${msg}`);
    }
    return json;
}

async function getProfileByGamertag(gamertag, apiKey) {
    const data = await fetchOpenXBL(`/account/${encodeURIComponent(gamertag)}`, apiKey);
    const p = data?.profileUsers?.[0];
    if (!p) throw new Error(`No profile returned for gamertag "${gamertag}"`);
    const settings = {};
    for (const s of p.settings || []) settings[s.id] = s.value;
    return {
        xuid: p.id,
        gamertag: settings.Gamertag || gamertag,
        gamerscore: Number(settings.Gamerscore || 0),
        gamerPicture: settings.GameDisplayPicRaw || "",
        bio: settings.Bio || "",
        tier: settings.AccountTier || ""
    };
}

async function getPresence(xuid, apiKey) {
    try {
        const data = await fetchOpenXBL(`/${xuid}/presence`, apiKey);
        const entry = Array.isArray(data) ? data[0] : data;
        return {
            state: entry?.state || "Unknown",
            device: entry?.devices?.[0]?.type || "",
            currentTitle: entry?.devices?.[0]?.titles?.[0]?.name || ""
        };
    } catch (e) {
        console.warn(`[XBOX] presence lookup failed for ${xuid}: ${e.message}`);
        return { state: "Unknown", device: "", currentTitle: "" };
    }
}

async function getRecentAchievementTitles(xuid, apiKey) {
    try {
        const data = await fetchOpenXBL(`/achievements/player/${xuid}`, apiKey);
        const titles = data?.titles || data?.achievements || [];
        return titles.slice(0, 25).map((t) => ({
            titleName: t.name || t.titleName || "",
            currentAchievements: Number(t.currentAchievements ?? t.earnedAchievements ?? 0),
            totalAchievements: Number(t.totalAchievements ?? t.achievements ?? 0),
            currentGamerscore: Number(t.currentGamerscore ?? 0),
            totalGamerscore: Number(t.totalGamerscore ?? t.maxGamerscore ?? 0)
        }));
    } catch (e) {
        console.warn(`[XBOX] achievements lookup failed for ${xuid}: ${e.message}`);
        return [];
    }
}

/* ----------------------------------------------------------------------------
 * Main
 * -------------------------------------------------------------------------- */
async function main() {
    console.log(`[XBOX ENGINE v${ENGINE_VERSION}] Starting (${IS_MANUAL ? "manual dispatch" : "scheduled/push"}).`);
    initRayFirebase();

    const { accounts, usersReadOk } = await readKevinXboxAccounts();
    if (!usersReadOk) {
        console.warn("[KEVIN DB] Could not read /users at all - nothing to sync this run.");
    }

    const usersByGamerTag = {};
    let okCount = 0, failCount = 0;

    for (const acc of accounts) {
        try {
            const profile = await getProfileByGamertag(acc.gamertag, acc.apiKey);
            const [presence, titles] = await Promise.all([
                getPresence(profile.xuid, acc.apiKey),
                getRecentAchievementTitles(profile.xuid, acc.apiKey)
            ]);

            const card = plain({
                gamertag: profile.gamertag,
                xuid: profile.xuid,
                gamerscore: profile.gamerscore,
                gamerPicture: profile.gamerPicture,
                bio: profile.bio,
                tier: profile.tier,
                presenceState: presence.state,
                currentDevice: presence.device,
                currentTitle: presence.currentTitle,
                recentTitles: titles,
                lastUpdated: nowEt(),
                lastUpdatedMs: Date.now(),
                sourceEmailKey: acc.emailKey
            });

            await rtdbRef(`gamertags/${profile.gamertag}`).set(card);
            usersByGamerTag[profile.gamertag] = acc.emailKey;
            okCount++;
            console.log(`[XBOX] Synced ${profile.gamertag} (${titles.length} recent titles, ${profile.gamerscore}G).`);
        } catch (e) {
            failCount++;
            console.warn(`[XBOX] Failed to sync "${acc.gamertag}" (${acc.emailKey}): ${e.message}`);
            // Don't let one bad key/gamertag stop the rest of the batch.
        }
    }

    await rtdbRef("usersByGamerTag").set(usersByGamerTag);
    await rtdbRef("meta").set(plain({ lastRun: nowEt(), lastRunMs: Date.now(), engineVersion: ENGINE_VERSION }));
    await rtdbRef("engineStatus").set(plain({
        ok: okCount,
        failed: failCount,
        totalAccounts: accounts.length,
        lastRun: nowEt()
    }));

    console.log(`[XBOX ENGINE] Done. ok=${okCount} failed=${failCount} totalAccounts=${accounts.length}`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(`[XBOX ENGINE] Fatal: ${e.stack || e.message}`);
        process.exit(1);
    });
