/* Live PlayStation presence, read straight from PSN (not the 21-minute
 * GitHub sync), using the streamer's own NPSSO from user_secrets/{key}/psn_npsso.
 * Friends' presence is read with the streamer's login (they must be PSN friends
 * and share online status). */
"use strict";

const psn = require("psn-api");
const store = require("./store");
const { readPresence, cleanName } = require("./build");

const auths = new Map(); // key -> { accessToken, refreshToken, exp, refreshExp, npsso }
const ids = new Map();   // onlineId(lower) -> accountId

function normNpsso(raw) {
    let v = String(raw || "").trim();
    const m = v.match(/"npsso"\s*:\s*"([^"]+)"/i);
    if (m) v = m[1];
    return v.replace(/^["'\s]+|["'\s]+$/g, "");
}

async function auth(key) {
    const npsso = normNpsso((await store.secrets(key)).psn_npsso);
    if (!npsso) return null;
    const a = auths.get(key);
    if (a && a.npsso === npsso && Date.now() < a.exp) return a;
    try {
        if (a && a.npsso === npsso && a.refreshToken && Date.now() < a.refreshExp) {
            const r = await psn.exchangeRefreshTokenForAuthTokens(a.refreshToken);
            return keep(key, npsso, r);
        }
    } catch (e) { /* fall back to NPSSO */ }
    const code = await psn.exchangeNpssoForCode(npsso);
    return keep(key, npsso, await psn.exchangeCodeForAccessToken(code));
}

function keep(key, npsso, r) {
    const a = {
        npsso, accessToken: r.accessToken, refreshToken: r.refreshToken,
        exp: Date.now() + Math.max(60, (r.expiresIn || 3600) - 300) * 1000,
        refreshExp: Date.now() + Math.max(60, (r.refreshTokenExpiresIn || 0) - 3600) * 1000
    };
    auths.set(key, a);
    return a;
}

async function accountIdFor(a, onlineId) {
    const k = String(onlineId).toLowerCase();
    if (ids.has(k)) return ids.get(k);
    let id = await store.psnAccountId(onlineId);
    if (!id) {
        try { id = (await psn.getProfileFromUserName(a, onlineId)).profile.accountId; } catch (e) { id = null; }
    }
    if (id) ids.set(k, String(id));
    return id ? String(id) : null;
}

/* For you an error is thrown (so a rate limit isn't mistaken for "offline");
 * for a friend it just means "not tagged". */
async function presenceOf(a, accountId, strict) {
    try { return readPresence(await psn.getBasicPresence(a, accountId)); }
    catch (e) {
        if (strict) throw e;
        return { online: false, title: null, titleId: null, status: null, error: e.message };
    }
}

/** Straight from PSN: 1 call for you + 1 per squad member (only if you're in a game). */
async function liveSnapshot(key, friendIds) {
    const a = await auth(key);
    if (!a) return null;
    const me = await presenceOf(a, "me", true);
    const friends = {};
    if (me.online && me.title) {
        await Promise.all((friendIds || []).map(async (fid) => {
            const acc = await accountIdFor(a, fid);
            friends[fid] = acc ? await presenceOf(a, acc) : { online: false };
        }));
    }
    return { me, friends, source: "psn" };
}

/** From the PlayStation database the GitHub sync writes (no PSN calls at all). */
async function cachedSnapshot(myTag, friendIds) {
    if (!myTag) return null;
    const one = async (tag) => {
        const g = await store.psnCard(tag);
        if (!g) return { online: false };
        const title = g.currentGame && g.currentGame !== "Dashboard" ? cleanName(g.currentGame) : null;
        return { online: !!g.online, title: g.online ? title : null, titleId: g.currentGameId || g.commId || null, status: g.online && g.gameStatus ? String(g.gameStatus).trim() || null : null, updated: g.lastUpdated || null };
    };
    const me = await one(myTag);
    const friends = {};
    if (me.online && me.title) await Promise.all((friendIds || []).map(async (f) => { friends[f] = await one(f); }));
    return { me, friends, source: "firebase", updated: me.updated };
}

/* PlayStation limits how often its API can be called, so the live check is
 * rationed: at most once every `psn_poll_minutes` (default 5) per streamer,
 * and only while they're live. Between checks the last answer is reused.
 * psn_poll_minutes = 0 turns direct PSN calls off and only the database is used. */
const lastLive = new Map(); // key -> { at, snap }

async function snapshot(key, cfg, myTag, friendIds, forceNow) {
    const minutes = cfg.psn_poll_minutes === undefined ? 5 : Number(cfg.psn_poll_minutes) || 0;
    if (minutes > 0) {
        const prev = lastLive.get(key);
        if (!forceNow && prev && Date.now() - prev.at < minutes * 60000) return prev.snap || cachedSnapshot(myTag, friendIds);
        try {
            const snap = await liveSnapshot(key, friendIds);
            if (snap) { lastLive.set(key, { at: Date.now(), snap }); return snap; }
        } catch (e) {
            // rate-limited or cookie expired: back off for a full window and use the database
            lastLive.set(key, { at: Date.now(), snap: null });
            console.warn(`[psn ${key}] live check failed (${e.message}); using the database`);
        }
        const p = lastLive.get(key);
        if (p && p.snap) return p.snap;
    }
    return cachedSnapshot(myTag, friendIds);
}

module.exports = { snapshot, normNpsso };
