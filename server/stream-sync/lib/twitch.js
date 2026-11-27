/* Twitch Helix helpers. App credentials come from the app owner's
 * user_secrets (twitch_client_id / twitch_client_secret). User tokens are
 * refreshed from user_secrets/{key}/twitch_<role>_refresh and the new refresh
 * token is saved back. */
"use strict";

const store = require("./store");

const HELIX = "https://api.twitch.tv/helix";
const ID = "https://id.twitch.tv/oauth2";

let app = null;                 // { clientId, clientSecret }
let appTok = null;              // { token, exp }
const userTok = new Map();      // `${key}:${role}` -> { token, exp }

async function appCreds() {
    if (app) return app;
    const owner = process.env.STREAM_SYNC_APP_OWNER_KEY || "";
    const s = owner ? await store.secrets(owner) : {};
    const clientId = String(s.twitch_client_id || process.env.TWITCH_CLIENT_ID || "").trim();
    const clientSecret = String(s.twitch_client_secret || process.env.TWITCH_CLIENT_SECRET || "").trim();
    if (!clientId || !clientSecret) throw new Error("Twitch app client id/secret missing (user_secrets/" + owner + "/twitch_client_id, twitch_client_secret)");
    app = { clientId, clientSecret };
    return app;
}

async function tokenRequest(params) {
    const { clientId, clientSecret } = await appCreds();
    const r = await fetch(ID + "/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error("Twitch token error " + r.status + ": " + JSON.stringify(j).slice(0, 200));
    return j;
}

async function appToken() {
    if (appTok && Date.now() < appTok.exp) return appTok.token;
    const j = await tokenRequest({ grant_type: "client_credentials" });
    appTok = { token: j.access_token, exp: Date.now() + (j.expires_in - 300) * 1000 };
    return appTok.token;
}

/** role: "broadcaster" | "bot". Returns null if that account was never connected. */
async function userToken(key, role) {
    const id = key + ":" + role;
    const c = userTok.get(id);
    if (c && Date.now() < c.exp) return c.token;
    const field = `twitch_${role}_refresh`;
    const refresh = (await store.secrets(key))[field];
    if (!refresh) return null;
    const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
    if (j.refresh_token && j.refresh_token !== refresh) await store.saveSecret(key, field, j.refresh_token);
    userTok.set(id, { token: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 });
    return j.access_token;
}

function forgetUserToken(key, role) { userTok.delete(key + ":" + role); }

async function helix(method, path, token, body) {
    const { clientId } = await appCreds();
    const r = await fetch(HELIX + path, {
        method,
        headers: { "Client-Id": clientId, Authorization: "Bearer " + (token || await appToken()), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 204) return {};
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`Twitch ${method} ${path.split("?")[0]} ${r.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`); e.status = r.status; throw e; }
    return j;
}

const idCache = new Map();
async function userId(login) {
    login = String(login || "").replace(/^@/, "").toLowerCase();
    if (idCache.has(login)) return idCache.get(login);
    const j = await helix("GET", "/users?login=" + encodeURIComponent(login));
    const id = j.data && j.data[0] ? j.data[0].id : null;
    if (id) idCache.set(login, id);
    return id;
}

async function stream(id) {
    const j = await helix("GET", "/streams?user_id=" + id);
    return (j.data && j.data[0]) || null;
}

async function channel(id) {
    const j = await helix("GET", "/channels?broadcaster_id=" + id);
    return (j.data && j.data[0]) || null;
}

async function searchCategories(q) {
    const j = await helix("GET", "/search/categories?first=25&query=" + encodeURIComponent(q));
    return (j.data || []).map((c) => ({ id: c.id, name: c.name, box: c.box_art_url }));
}

async function categoryByName(name) {
    const j = await helix("GET", "/games?name=" + encodeURIComponent(name));
    return (j.data || []).map((c) => ({ id: c.id, name: c.name, box: c.box_art_url }));
}

/** Names the account and role that is missing, for whichever site user hit it. */
function notConnected(role, login) {
    const name = String(login || "").replace(/^@/, "").trim();
    const what = role === "bot" ? "chat bot account" : "broadcaster account";
    return `Twitch ${what}${name ? " " + name : ""} is not connected - connect the ${role} account on /setup`;
}

async function updateChannel(key, broadcasterId, patch, login) {
    const tok = await userToken(key, "broadcaster");
    if (!tok) throw new Error(notConnected("broadcaster", login));
    await helix("PATCH", "/channels?broadcaster_id=" + broadcasterId, tok, patch);
}

/** Sends as the bot account if connected (and the user picked "bot"), else as the broadcaster.
 *  postAs: "bot" (default) | "streamer" */
async function sendChat(key, broadcasterId, botLogin, message, postAs) {
    let tok = botLogin && postAs !== "streamer" ? await userToken(key, "bot") : null;
    let sender = tok ? await userId(botLogin) : null;
    if (!tok) { tok = await userToken(key, "broadcaster"); sender = broadcasterId; }
    if (!tok) return false;
    await helix("POST", "/chat/messages", tok, { broadcaster_id: broadcasterId, sender_id: sender, message: String(message).slice(0, 500) });
    return true;
}

/* OAuth (used by /setup) */
const SCOPES = {
    broadcaster: "channel:manage:broadcast user:write:chat user:bot channel:bot",
    bot: "user:write:chat user:bot"
};
async function authorizeUrl(role, redirectUri, state) {
    const { clientId } = await appCreds();
    const p = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPES[role], state, force_verify: "true" });
    return ID + "/authorize?" + p;
}
async function exchangeCode(code, redirectUri) {
    const j = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
    const me = await helix("GET", "/users", j.access_token);
    return { refresh: j.refresh_token, login: me.data && me.data[0] ? me.data[0].login : null };
}

module.exports = { appCreds, userToken, forgetUserToken, userId, stream, channel, searchCategories, categoryByName, updateChannel, sendChat, authorizeUrl, exchangeCode };
