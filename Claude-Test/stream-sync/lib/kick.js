/* Kick public API: stream title + category, and Kick chat -> Twitch through
 * Kick's official chat events (webhook). OAuth 2.1 with PKCE.
 * App credentials: owner's user_secrets kick_client_id / kick_client_secret.
 * User refresh token: user_secrets/{key}/kick_refresh (rotates; saved back). */
"use strict";

const crypto = require("crypto");
const store = require("./store");

const API = "https://api.kick.com/public";
const IDP = "https://id.kick.com/oauth";
const SCOPES = "user:read channel:read channel:write events:subscribe";

const toks = new Map();

async function creds() {
    const owner = process.env.STREAM_SYNC_APP_OWNER_KEY || "";
    const s = owner ? await store.secrets(owner) : {};
    const clientId = String(s.kick_client_id || process.env.KICK_CLIENT_ID || "").trim();
    const clientSecret = String(s.kick_client_secret || process.env.KICK_CLIENT_SECRET || "").trim();
    return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function tokenRequest(params) {
    const c = await creds();
    if (!c) throw new Error("Kick app client id/secret missing");
    const r = await fetch(IDP + "/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...params })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error("Kick token error " + r.status + ": " + JSON.stringify(j).slice(0, 200));
    return j;
}

async function token(key) {
    const c = toks.get(key);
    if (c && Date.now() < c.exp) return c.token;
    const refresh = (await store.secrets(key)).kick_refresh;
    if (!refresh) return null;
    const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
    if (j.refresh_token && j.refresh_token !== refresh) await store.saveSecret(key, "kick_refresh", j.refresh_token);
    toks.set(key, { token: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 });
    return j.access_token;
}

async function api(method, path, tok, body) {
    const r = await fetch(API + path, {
        method,
        headers: { Authorization: "Bearer " + tok, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 204) return {};
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Kick ${method} ${path.split("?")[0]} ${r.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`);
    return j;
}

/** Category search. Kick has moved this endpoint between versions, so try both. */
async function searchCategories(key, q) {
    const tok = await token(key);
    if (!tok) return [];
    for (const path of ["/v2/categories?limit=25&name=" + encodeURIComponent(q), "/v1/categories?q=" + encodeURIComponent(q)]) {
        try {
            const j = await api("GET", path, tok);
            const list = Array.isArray(j.data) ? j.data : [];
            if (list.length) return list.map((c) => ({ id: c.id, name: c.name }));
        } catch (e) { /* try the other version */ }
    }
    return [];
}

async function updateChannel(key, patch) {
    const tok = await token(key);
    if (!tok) return false;
    await api("PATCH", "/v1/channels", tok, patch);
    return true;
}

/* OAuth for /setup */
const pending = new Map(); // state -> { verifier, at }
function authorizeUrl(c, redirectUri, state) {
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    pending.set(state, { verifier, at: Date.now() });
    for (const [k, v] of pending) if (Date.now() - v.at > 15 * 60 * 1000) pending.delete(k);
    const p = new URLSearchParams({ response_type: "code", client_id: c.clientId, redirect_uri: redirectUri, scope: SCOPES, code_challenge: challenge, code_challenge_method: "S256", state });
    return IDP + "/authorize?" + p;
}
async function exchangeCode(code, redirectUri, state) {
    const p = pending.get(state);
    if (!p) throw new Error("Kick sign-in expired, start again");
    pending.delete(state);
    const j = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: p.verifier });
    const me = await api("GET", "/v1/users", j.access_token);
    const u = Array.isArray(me.data) ? me.data[0] : null;
    return { refresh: j.refresh_token, login: u ? (u.name || u.username || u.slug) : null, userId: u && u.user_id != null ? String(u.user_id) : null };
}

/* ---- Kick chat -> Twitch (official "chat.message.sent" webhook) ----
 * The webhook URL is set once on the Kick app (kick.com/settings/developer):
 *   https://ww-stream-sync.onrender.com/webhooks/kick
 * Each streamer is subscribed to their own chat when they connect Kick and again
 * at the start of each stream (only if the subscription is missing). */
const CHAT_EVENT = "chat.message.sent";
async function ensureChatSubscription(key) {
    const tok = await token(key);
    if (!tok) return "kick not connected";
    const list = await api("GET", "/v1/events/subscriptions", tok).catch(() => ({ data: [] }));
    const have = (Array.isArray(list.data) ? list.data : []).some((x) => (x.event || x.name) === CHAT_EVENT && (x.method || "webhook") === "webhook");
    if (have) return "subscribed";
    await api("POST", "/v1/events/subscriptions", tok, { events: [{ name: CHAT_EVENT, version: 1 }], method: "webhook" });
    return "subscribed now";
}

let kickKey = null; // Kick's public key, used to check webhook signatures
async function publicKey() {
    if (kickKey) return kickKey;
    const r = await fetch(API + "/v1/public-key");
    const j = await r.json().catch(() => ({}));
    const k = j && j.data && j.data.public_key;
    if (!k) throw new Error("Kick public key unavailable");
    kickKey = k;
    return k;
}

/** True only if the webhook really came from Kick. raw = exact request body (Buffer/string). */
async function verifyWebhook(headers, raw) {
    const id = headers["kick-event-message-id"], ts = headers["kick-event-message-timestamp"], sig = headers["kick-event-signature"];
    if (!id || !ts || !sig) return false;
    const v = crypto.createVerify("RSA-SHA256");
    v.update(`${id}.${ts}.${Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw)}`);
    v.end();
    try { return v.verify(await publicKey(), Buffer.from(String(sig), "base64")); } catch (e) { return false; }
}

module.exports = { creds, token, searchCategories, updateChannel, authorizeUrl, exchangeCode, ensureChatSubscription, verifyWebhook, CHAT_EVENT };
