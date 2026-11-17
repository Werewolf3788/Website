/* Live PlayStation presence, read straight from PSN (not the 21-minute
 * GitHub sync), using the streamer's own NPSSO from user_secrets/{key}/psn_npsso.
 * Friends' presence is read with the streamer's login (they must be PSN friends
 * and share online status). */
"use strict";

const psn = require("psn-api");
const store = require("./store");
const { readPresence } = require("./build");

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

async function presenceOf(a, accountId) {
    try { return readPresence(await psn.getBasicPresence(a, accountId)); }
    catch (e) { return { online: false, title: null, titleId: null, status: null, error: e.message }; }
}

/** { me, friends: { onlineId: presence } } or null when no NPSSO is saved. */
async function snapshot(key, friendIds) {
    const a = await auth(key);
    if (!a) return null;
    const me = await presenceOf(a, "me");
    const friends = {};
    if (me.online && me.title) {
        await Promise.all((friendIds || []).map(async (fid) => {
            const acc = await accountIdFor(a, fid);
            friends[fid] = acc ? await presenceOf(a, acc) : { online: false };
        }));
    }
    return { me, friends };
}

module.exports = { snapshot, normNpsso };
