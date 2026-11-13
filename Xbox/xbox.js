/* ============================================================================
 * File: xbox.js
 * Location: /Xbox/xbox.js
 * Version: 1.0.0
 * Description: Xbox Telemetry Engine - Ray's Firebase (playstation-stats)
 *   Mirrors the shape of Playstation/psn.js, but for Xbox/Microsoft accounts.
 *   INPUT  : Kevin's DB (entertainment-71888) /users + /user_secrets (READ-ONLY):
 *            xbox_gamertag (handle), xbox_user_id (optional XUID, used to pick
 *            the right person out of /search's fuzzy results) and xbox_api_key
 *            (private, OpenXBL key the user pastes into Settings -> Xbox /
 *            Microsoft sync).
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
// Confirmed against the OpenXBL dashboard's own "Getting Started" curl example
// (api.xbl.io, not xbl.io/api) - the earlier xbl.io/api/v2 base happened to also
// resolve and pass requests through, which is why it looked like it was working.
const OPENXBL_BASE = "https://api.xbl.io/v2";
const IS_MANUAL = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";
// A friend-key-sharing cap: how many keyless friends can ride on one person's
// OpenXBL key in a single sync run. OpenXBL's free tier is rate-limited
// (150 requests/day as of writing), so this keeps one popular key owner's
// friend circle from silently burning through their whole daily quota.
const MAX_SHARED_FRIENDS_PER_KEY = 5;

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
/* Copy of each player card into Kevin's DB (/xbox/gamertags/{tag}) so the site reads it with the member's normal sign-in.
 * Email keys are stripped; this is the only thing written to Kevin's DB. */
let kevinWriteDb = undefined;
async function mirrorToKevin(tag, card) {
    try {
        if (kevinWriteDb === undefined) {
            const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
            kevinWriteDb = raw ? getDatabase(getNamedApp("kevinAppXbox", parseServiceAccount(raw, "GCP_SA_KEY_WEBSITE"), KEVIN_RTDB_URL)) : null;
        }
        if (!kevinWriteDb) return;
        const pub = JSON.parse(JSON.stringify(card));
        delete pub.sourceEmailKey; delete pub.keyOwnerEmailKey; delete pub.syncedViaFriendKey;
        const k = String(tag).replace(/[.$#\[\]\/]/g, "_");
        await kevinWriteDb.ref(`xbox/gamertags/${k}`).set(pub);
        await kevinWriteDb.ref(`psn/xbox_cards/${k}`).set(pub);   // same card under /psn, which the live rules already let the site read
    } catch (e) { console.warn(`[KEVIN DB] Xbox mirror failed for ${tag}: ${e.message}`); }
}

async function readKevinNodes() {
    let users = {}, secrets = {}, friendCodes = {}, ok = false;
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (raw) {
        try {
            const creds = parseServiceAccount(raw, "GCP_SA_KEY_WEBSITE");
            const db = getDatabase(getNamedApp("kevinAppXbox", creds, KEVIN_RTDB_URL));
            const [u, s, f] = await Promise.all([
                db.ref("users").once("value"),
                db.ref("user_secrets").once("value"),
                db.ref("friend_codes").once("value")
            ]);
            users = u.val() || {};
            secrets = s.val() || {};
            friendCodes = f.val() || {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] Admin read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] Admin read failed (${e.message}); trying FIREBASE_AUTH_SECRET.`);
        }
    }
    if (!ok) {
        const q = process.env.FIREBASE_AUTH_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_AUTH_SECRET.trim())}` : "";
        try {
            const [uRes, sRes, fRes] = await Promise.all([
                fetch(`${KEVIN_RTDB_URL}/users.json${q}`).then((r) => r.json()),
                fetch(`${KEVIN_RTDB_URL}/user_secrets.json${q}`).then((r) => r.json()),
                fetch(`${KEVIN_RTDB_URL}/friend_codes.json${q}`).then((r) => r.json())
            ]);
            if (uRes && uRes.error) console.warn(`[KEVIN DB] /users: ${uRes.error}`);
            if (sRes && sRes.error) console.warn(`[KEVIN DB] /user_secrets: ${sRes.error}`);
            users = uRes && typeof uRes === "object" && !uRes.error ? uRes : {};
            secrets = sRes && typeof sRes === "object" && !sRes.error ? sRes : {};
            friendCodes = fRes && typeof fRes === "object" && !fRes.error ? fRes : {};
            ok = Object.keys(users).length > 0;
            if (ok) console.log(`[KEVIN DB] REST read OK: ${Object.keys(users).length} users.`);
        } catch (e) {
            console.warn(`[KEVIN DB] REST read failed: ${e.message}`);
        }
    }
    return { users, secrets, friendCodes, ok };
}

// A friend_codes/{code} entry is normally just the owner's email key (string).
// Older records can be an object instead - this mirrors setting.html's own
// ownerKeyOfCode() fallback: try likely field names, then confirm by checking
// that users/{candidate}/friend_code actually matches the code being resolved.
function resolveOwnerKey(users, friendCodes, code) {
    const v = friendCodes[code];
    if (typeof v === "string") return v || null;
    if (!v || typeof v !== "object") return null;
    const cands = new Set();
    ["user_key", "userKey", "email_key", "emailKey", "key", "owner", "uid", "email", "user"]
        .concat(Object.keys(v))
        .forEach((f) => {
            const x = v[f];
            if (typeof x !== "string") return;
            const t = x.trim();
            if (!t || t.length > 120) return;
            cands.add(t.indexOf("@") > -1 ? t.toLowerCase().replace(/\./g, "_").replace("@", "_at_") : t);
        });
    for (const c of cands) {
        if (/[.$#[\]/]/.test(c)) continue;
        const u = users[c];
        if (u && String(u.friend_code || "").toUpperCase() === String(code).toUpperCase()) return c;
    }
    return null;
}

// Direct friends only (no friends-of-friends): reads emailKey's own /friends
// list and resolves each friend_code back to that friend's emailKey.
function directFriendEmailKeys(users, friendCodes, emailKey) {
    const u = users[emailKey];
    const friends = (u && u.friends) || {};
    const out = [];
    for (const code of Object.keys(friends)) {
        const fk = resolveOwnerKey(users, friendCodes, code);
        if (fk && fk !== emailKey) out.push(fk);
    }
    return out;
}

// Every tracked Xbox account is a "guest" in the psn.js sense: gamertag + key
// both live in Kevin's DB (filled in via Settings), never a hardcoded list.
//
// Friend-key sharing: someone with no OpenXBL key of their own, but who has
// saved their own XUID and is a direct friend of someone who DOES have a
// working key, gets synced too - using the friend's key, looked up by XUID
// (via /account/{xuid}, so no gamertag or /search fuzziness involved). Each
// key owner is capped at MAX_SHARED_FRIENDS_PER_KEY borrowers per run so one
// popular key doesn't silently burn through OpenXBL's daily quota.
async function readKevinXboxAccounts() {
    const { users, secrets, friendCodes, ok } = await readKevinNodes();
    const pick = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
    const accounts = [];
    const keyOwnerByEmailKey = new Map(); // emailKey -> apiKey, for the friend-sharing pass below
    const keylessWithXuid = []; // { emailKey, xuid }

    // Key policy (splits the OpenXBL load): everyone who has their own key uses it first; the owner's key is the
    // backup for the owner's CLOSE friends (and their main key if they have none). Everyone else uses only their own key.
    const OWNER_KEY = (process.env.OWNER_EMAIL_KEY || "raykevin71888_at_gmail_com").trim();
    const readUser = (emailKey, u) => {
        const sec = (secrets && secrets[emailKey]) || {};
        const gaming = u.gaming_platforms || {};
        return {
            gamertag: String(pick(u.xbox_gamertag, gaming.xbox_gamertag) || "").trim(),
            apiKey: String(pick(sec.xbox_api_key, u.xbox_api_key, gaming.xbox_api_key) || "").trim(),
            xuid: String(pick(u.xbox_user_id, gaming.xbox_user_id) || "").trim(),
            updatedAt: sec.updated_at || u.updated_at || null
        };
    };
    const ownerInfo = users[OWNER_KEY] ? readUser(OWNER_KEY, users[OWNER_KEY]) : { apiKey: "" };
    const ownerApiKey = ownerInfo.apiKey;
    const closeKeys = new Set([OWNER_KEY]);
    for (const [code, f] of Object.entries((users[OWNER_KEY] || {}).friends || {})) {
        if (!f || f.close_friend !== true) continue;
        const fk = resolveOwnerKey(users, friendCodes, String(f.friend_code || code));
        if (fk) closeKeys.add(fk);
    }
    // Spare keys: members who pasted a key but have no gamertag/XUID of their own to sync. They join the owner's key in a pool
    // so the pulls for keyless close friends are split across every key instead of burning one.
    const pool = [ownerApiKey].filter(Boolean);
    for (const [ek, uu] of Object.entries(users).sort((x, y) => x[0].localeCompare(y[0]))) {
        if (!uu || typeof uu !== "object" || ek === OWNER_KEY) continue;
        const r = readUser(ek, uu); if (r.apiKey && !r.gamertag && !r.xuid && !pool.includes(r.apiKey)) pool.push(r.apiKey);
    }
    let shared = 0, skippedOverCap = 0, borrowed = 0;
    for (const [emailKey, u] of Object.entries(users).sort((x, y) => x[0].localeCompare(y[0]))) {
        if (!u || typeof u !== "object") continue;
        const me = readUser(emailKey, u);
        const wantsOwner = !!ownerApiKey && closeKeys.has(emailKey) && emailKey !== OWNER_KEY && (me.gamertag || me.xuid);
        const hasOwn = !!(me.apiKey && (me.gamertag || me.xuid));
        const sec = (secrets && secrets[emailKey]) || {};
        console.log(`[KEY] ${emailKey}: gamertag=${me.gamertag ? "yes" : "no"} ownKey=${me.apiKey ? "yes" : "no"} (secrets=${sec.xbox_api_key ? "y" : "n"} users=${u.xbox_api_key ? "y" : "n"} gaming=${(u.gaming_platforms || {}).xbox_api_key ? "y" : "n"}) close=${closeKeys.has(emailKey)}`);
        if (hasOwn) {
            accounts.push({ emailKey, gamertag: me.gamertag || null, apiKey: me.apiKey, backupKey: wantsOwner ? ownerApiKey : null, xuid: me.xuid || null, updatedAt: me.updatedAt, viaFriendKey: !me.gamertag, keyOwnerEmailKey: emailKey });
        } else if (wantsOwner) {
            if (shared >= MAX_SHARED_FRIENDS_PER_KEY * 4) { skippedOverCap++; }
            else { shared++; borrowed++; const i = borrowed - 1; accounts.push({ emailKey, gamertag: me.gamertag || null, apiKey: pool[i % pool.length], backupKey: pool.length > 1 ? pool[(i + 1) % pool.length] : null, xuid: me.xuid || null,
                updatedAt: me.updatedAt, viaFriendKey: !me.gamertag, keyOwnerEmailKey: OWNER_KEY }); }
        }
        if (me.gamertag && me.apiKey) keyOwnerByEmailKey.set(emailKey, me.apiKey);
    }

    console.log(`[KEVIN DB] key pool size ${pool.length}. Xbox accounts with both a gamertag and a key: ${keyOwnerByEmailKey.size}; using the shared key pool (no key of their own): ${borrowed}${skippedOverCap ? ` (${skippedOverCap} skipped over cap)` : ""}.`);
    return { accounts, usersReadOk: ok };
}

/* ----------------------------------------------------------------------------
 * OpenXBL (xbl.io) client
 * -------------------------------------------------------------------------- */
async function fetchOpenXBL(path, apiKey) {
    // Confirmed from a real response: the underlying Xbox Live service rejects a
    // request with no Accept-Language (400: "invalid locale value: *") - Node's
    // fetch doesn't send one by default, so it has to be set explicitly.
    // OpenXBL allows 60 requests per 5 minutes per key: when it says "Rate", wait for the window to clear and try once more.
    let res, text, json = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        res = await fetch(`${OPENXBL_BASE}${path}`, {
            headers: { "X-Authorization": apiKey, Accept: "application/json", "Accept-Language": "en-US" }
        });
        text = await res.text(); json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON error page */ }
        const limited = res.status === 429 || (json && json.content && (json.content.code === 429 || json.content.limitType === "Rate"));
        if (!limited || attempt) break;
        console.warn(`[XBOX] rate limited on ${path.split("/").slice(0, 2).join("/")}; waiting 65s for the window to clear.`);
        await new Promise((r) => setTimeout(r, 65000));
    }
    if (!res.ok) {
        const msg = (json && (json.message || json.error)) || text.slice(0, 200) || `HTTP ${res.status}`;
        throw new Error(`OpenXBL ${path} -> ${res.status}: ${msg}`);
    }
    return json;
}

async function getProfileByGamertag(gamertag, apiKey, expectedXuid) {
    // Confirmed from a real response (2026-11-12): /search/{gamertag} returns
    // { content: { people: [ { xuid, gamertag, gamerScore, displayPicRaw,
    // presenceState, presenceText, presenceDevices, ... } ] } } - a peoplehub-
    // style payload, one level deeper (under "content") than the bare XSAPI
    // profileUsers[] shape other Xbox endpoints use.
    //
    // /search is a fuzzy name search, so it can return more than one person for
    // a common or partial gamertag. When the account has its real Xbox User ID
    // (XUID) saved in Settings, use it to pick the right match out of the list
    // instead of blindly trusting people[0]; without one, fall back to the
    // first result like before, but flag it so a mismatch is visible in the log.
    const data = await fetchOpenXBL(`/search/${encodeURIComponent(gamertag)}`, apiKey);
    const people = data?.content?.people || [];
    let p = null;
    if (expectedXuid) {
        p = people.find((person) => String(person.xuid) === String(expectedXuid));
        if (!p) console.warn(`[XBOX] "${gamertag}": none of ${people.length} /search result(s) matched the saved XUID ${expectedXuid} - falling back to the first result.`);
    }
    if (!p) p = people[0];
    if (!p) {
        console.warn(`[XBOX DEBUG] /search/${gamertag} raw response: ${JSON.stringify(data).slice(0, 800)}`);
        throw new Error(`No profile found via /search for gamertag "${gamertag}"`);
    }
    return {
        xuid: p.xuid,
        gamertag: p.gamertag || p.modernGamertag || gamertag,
        gamerscore: Number(p.gamerScore || 0),
        gamerPicture: p.displayPicRaw || "",
        bio: p.bio || "",
        tier: p.xboxOneRep || "",
        // /search already includes presence - no need for a second call/endpoint.
        presenceState: p.presenceState || "Offline",
        presenceText: p.presenceText || "",
        presenceDevices: p.presenceDevices || null,
        xuidVerified: expectedXuid ? String(p.xuid) === String(expectedXuid) : null
    };
}

// Used for friend-key-sharing: a borrower who gave only their XUID (no
// gamertag of their own on file), looked up directly - no fuzzy /search
// involved, so there's nothing to verify against.
//
// Confirmed from a real response (2026-11-12): /account/{xuid} returns
// { content: { profileUsers: [ { id, settings: [ { id, value }, ... ] } ] } }
// - the bare XSAPI profile shape, settings as an id/value pair list rather
// than a flat object, and with NO presence fields (presence is only in
// /search's peoplehub-style response, which needs a gamertag to call).
//
// Only the fields this site actually displays are pulled out. The real
// response also includes RealName, RealNameOverride and Location (the
// account's real name/city) - deliberately left out here rather than stored,
// since this card can end up shared with a friend's Firebase node.
async function getProfileByXuid(xuid, apiKey) {
    const data = await fetchOpenXBL(`/account/${xuid}`, apiKey);
    const pu = data?.content?.profileUsers?.[0];
    if (!pu) {
        console.warn(`[XBOX DEBUG] /account/${xuid} raw response: ${JSON.stringify(data).slice(0, 800)}`);
        throw new Error(`No profile found via /account for XUID "${xuid}"`);
    }
    const settings = {};
    (pu.settings || []).forEach((s) => { if (s && s.id) settings[s.id] = s.value; });
    return {
        xuid: pu.id || xuid,
        gamertag: settings.Gamertag || settings.ModernGamertag || "",
        gamerscore: Number(settings.Gamerscore || 0),
        gamerPicture: settings.GameDisplayPicRaw || "",
        bio: settings.Bio || "",
        tier: settings.AccountTier || "",
        // /account/{xuid} has no presence data; null (not "Offline") so it's
        // visibly "unknown" rather than a guessed/wrong status.
        presenceState: null,
        presenceText: null,
        presenceDevices: null,
        xuidVerified: true
    };
}

async function getRecentAchievementTitles(xuid, apiKey) {
    try {
        const data = await fetchOpenXBL(`/achievements/player/${xuid}`, apiKey);
        // Confirmed from a real response (2026-11-12): like /search, this is wrapped
        // one level deeper under "content", and each title's progress numbers sit
        // under a nested "achievement" object rather than flat on the title itself:
        // { content: { xuid, titles: [ { titleId, name, achievement: {
        //   currentAchievements, totalAchievements, currentGamerscore,
        //   totalGamerscore, progressPercentage, ... }, ... } ] } }
        const titles = data?.content?.titles || data?.titles || [];
        if (!titles.length) {
            console.warn(`[XBOX DEBUG] /achievements/player/${xuid} raw response: ${JSON.stringify(data).slice(0, 800)}`);
        }
        // Steam / Windows-store titles show up in the Xbox history with no Xbox achievements (PC-only, 0 total): they are
        // not Xbox games, so leave them out. Keep anything with achievements or that ran on a console.
        const consoleDev = (t) => (Array.isArray(t.devices) ? t.devices : []).some((d) => /xbox|series/i.test(String(d)));
        const keep = titles.filter((t) => Number((t.achievement || {}).totalAchievements ?? 0) > 0 || consoleDev(t) || !Array.isArray(t.devices));
        return keep.slice(0, 40).map((t) => {
            const a = t.achievement || {};
            return {
                titleName: t.name || t.titleName || "",
                titleId: String(t.titleId || ""),
                image: String(t.displayImage || t.images?.[0]?.url || "").replace(/^http:/, "https:"),
                devices: Array.isArray(t.devices) ? t.devices.slice(0, 4) : [],
                lastPlayed: t.titleHistory?.lastTimePlayed || "",
                currentAchievements: Number(a.currentAchievements ?? 0),
                totalAchievements: Number(a.totalAchievements ?? 0),
                currentGamerscore: Number(a.currentGamerscore ?? 0),
                totalGamerscore: Number(a.totalGamerscore ?? 0)
            };
        });
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
            const attempt = async (key) => {
                const pr = acc.viaFriendKey ? await getProfileByXuid(acc.xuid, key) : await getProfileByGamertag(acc.gamertag, key, acc.xuid);
                return { pr, ti: await getRecentAchievementTitles(pr.xuid, key) };
            };
            let got;
            try { got = await attempt(acc.apiKey); }
            catch (err) {
                if (!acc.backupKey) throw err;
                console.warn(`[XBOX] ${acc.gamertag || acc.xuid}: their primary key failed (${err.message}); retrying with a backup key.`);
                got = await attempt(acc.backupKey);
            }
            const profile = got.pr, titles = got.ti;

            const card = plain({
                gamertag: profile.gamertag,
                xuid: profile.xuid,
                gamerscore: profile.gamerscore,
                gamerPicture: profile.gamerPicture,
                bio: profile.bio,
                tier: profile.tier,
                presenceState: profile.presenceState,
                presenceText: profile.presenceText,
                presenceDevices: profile.presenceDevices,
                xuidVerified: profile.xuidVerified,
                recentTitles: titles,
                lastUpdated: nowEt(),
                lastUpdatedMs: Date.now(),
                sourceEmailKey: acc.emailKey,
                // Transparency/debugging: this account has no OpenXBL key of its own
                // and was synced using a direct friend's key instead.
                syncedViaFriendKey: acc.viaFriendKey || false,
                keyOwnerEmailKey: acc.viaFriendKey ? acc.keyOwnerEmailKey : null
            });

            await rtdbRef(`gamertags/${profile.gamertag}`).set(card);
            await mirrorToKevin(profile.gamertag, card);
            try { await rayDb.ref(`psn/xbox_cards/${String(profile.gamertag).replace(/[.$#\[\]\/]/g, "_")}`).set(JSON.parse(JSON.stringify(card, (k2, v) => (k2 === "sourceEmailKey" || k2 === "keyOwnerEmailKey" || k2 === "syncedViaFriendKey") ? undefined : v))); } catch (e) { console.warn(`[XBOX] Ray psn copy failed: ${e.message}`); }
            usersByGamerTag[profile.gamertag] = acc.emailKey;
            okCount++;
            const xuidNote = profile.xuidVerified === true ? ", XUID verified" : profile.xuidVerified === false ? ", XUID MISMATCH" : "";
            console.log(`[XBOX] Synced ${profile.gamertag} (${titles.length} recent titles, ${profile.gamerscore}G${xuidNote}).`);
        } catch (e) {
            failCount++;
            const who = acc.viaFriendKey ? `XUID ${acc.xuid} (borrowing ${acc.keyOwnerEmailKey}'s key)` : `"${acc.gamertag}"`;
            console.warn(`[XBOX] Failed to sync ${who} (${acc.emailKey}): ${e.message}`);
            // Don't let one bad key/gamertag stop the rest of the batch.
        }
    }

    // Diagnostic: can the website (not signed in) read what was just written?
    for (const [label, base] of [["Ray DB", "https://playstation-stats-default-rtdb.firebaseio.com/xbox"], ["Kevin DB", `${KEVIN_RTDB_URL}/xbox`]]) {
        for (const tag of Object.keys(usersByGamerTag).slice(0, 1)) {
            try {
                const r2 = await fetch(`${base.replace(/\/xbox$/, "")}/psn/xbox_cards/${encodeURIComponent(tag)}.json?shallow=true`);
                console.log(`[CHECK] public read ${label} psn/xbox_cards/${tag}: HTTP ${r2.status} ${(await r2.text()).slice(0, 100)}`);
                const r = await fetch(`${base}/gamertags/${encodeURIComponent(tag)}.json?shallow=true`);
                const t = (await r.text()).slice(0, 120);
                console.log(`[CHECK] public read ${label} xbox/gamertags/${tag}: HTTP ${r.status} ${t}`);
            } catch (e) { console.log(`[CHECK] ${label}: ${e.message}`); }
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
