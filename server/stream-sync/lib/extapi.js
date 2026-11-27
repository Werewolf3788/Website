/* Twitch Extension API for the Werewolf extension (no extra packages: HS256 JWTs with node crypto).
 * Keys come from the Key Vault, user_secrets/{STREAM_SYNC_APP_OWNER_KEY}:
 *   twitch_ext_client_id   Extension Client ID (dev.twitch.tv > Extensions > Werewolf Overlay)
 *   twitch_ext_secret      Extension Secret (base64, as Twitch shows it)
 *   twitch_ext_owner_id    Kevin's Twitch user id (signs EBS calls; also the watermark picture).
 *                          Optional: if empty it's looked up from users/{owner}/twitch_username.
 * Env vars TWITCH_EXT_CLIENT_ID / TWITCH_EXT_SECRET / TWITCH_EXT_OWNER_ID override them. */
"use strict";

const crypto = require("crypto");
const store = require("./store");
const twitch = require("./twitch");

const HELIX = "https://api.twitch.tv/helix";
let keys = null;

async function extKeys() {
    if (keys) return keys;
    const owner = process.env.STREAM_SYNC_APP_OWNER_KEY || "";
    const s = owner ? await store.secrets(owner) : {};
    const clientId = String(process.env.TWITCH_EXT_CLIENT_ID || s.twitch_ext_client_id || "").trim();
    const secretB64 = String(process.env.TWITCH_EXT_SECRET || s.twitch_ext_secret || "").trim();
    let ownerId = String(process.env.TWITCH_EXT_OWNER_ID || s.twitch_ext_owner_id || "").trim();
    if (!ownerId && owner && clientId && secretB64) {   // not filled in: look it up from the owner's Twitch name in their profile
        const login = await store.get("users/" + owner + "/twitch_username").catch(() => null);
        if (login) { const j = await twitch.helix("GET", "/users?login=" + encodeURIComponent(String(login).toLowerCase())).catch(() => ({})); ownerId = String(((j.data || [])[0] || {}).id || ""); }
    }
    if (!clientId || !secretB64 || !ownerId) throw new Error("twitch_ext keys missing (Keys sheet: twitch_ext_client_id, twitch_ext_secret, twitch_ext_owner_id)");
    keys = { clientId, secret: Buffer.from(secretB64, "base64"), ownerId };
    return keys;
}

const b64u = (b) => Buffer.from(b).toString("base64url");
function hs256(data, secret) { return crypto.createHmac("sha256", secret).update(data).digest("base64url"); }

/** EBS token for calling Twitch on a channel's behalf. ttl seconds (negative = already expired, for tests). */
async function signEbs(channelId, ttl) {
    const k = await extKeys();
    const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = b64u(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + (ttl == null ? 60 : ttl), user_id: k.ownerId, role: "external",
        channel_id: String(channelId), pubsub_perms: { send: ["broadcast"] } }));
    return head + "." + body + "." + hs256(head + "." + body, k.secret);
}

/** A token from the extension front end (viewer or broadcaster). -> payload or null. */
async function verifyViewer(jwt) {
    try {
        const k = await extKeys();
        const [h, b, sig] = String(jwt || "").split(".");
        if (!h || !b || !sig) return null;
        const want = hs256(h + "." + b, k.secret);
        if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
        const p = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
        if (!p.exp || p.exp * 1000 < Date.now()) return null;
        return p;
    } catch (e) { return null; }
}

async function extCall(method, path, channelId, body) {
    const k = await extKeys();
    const r = await fetch(HELIX + path, { method, headers: { "Client-Id": k.clientId, Authorization: "Bearer " + await signEbs(channelId), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok && r.status !== 204) { const j = await r.json().catch(() => ({})); const e = new Error(`Twitch ext ${method} ${path} ${r.status}: ${j.message || ""}`); e.status = r.status; throw e; }
}

/** Send the card to everyone watching the channel. */
async function pushCard(channelId, card) {
    await extCall("POST", "/extensions/pubsub", channelId, { target: ["broadcast"], broadcaster_id: String(channelId), is_global_broadcast: false, message: JSON.stringify(card) });
}
/** Keep the card in Twitch's broadcaster config so a viewer who just arrived sees it at once. */
async function saveCard(channelId, card) {
    const k = await extKeys();
    await extCall("PUT", "/extensions/configurations", channelId, { extension_id: k.clientId, segment: "broadcaster", broadcaster_id: String(channelId), content: JSON.stringify(card), version: "1" });
}

/** Other broadcaster ids in this channel's Stream Together / Shared Chat session ([] when none). */
async function sharedChatParticipants(channelId) {
    const j = await twitch.helix("GET", "/shared_chat/session?broadcaster_id=" + encodeURIComponent(channelId));
    const s = (j.data || [])[0];
    return s ? (s.participants || []).map((p) => String(p.broadcaster_id)).filter((id) => id !== String(channelId)) : [];
}

function _reset() { keys = null; }

module.exports = { extKeys, signEbs, verifyViewer, pushCard, saveCard, sharedChatParticipants, _reset };
