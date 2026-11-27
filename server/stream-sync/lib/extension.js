/* Werewolf Twitch extension: channel registry, pairing, Twitch EventSub, and the live loop that
 * builds each channel's card (lib/extcard.js) and pushes it to viewers through Twitch
 * (lib/extapi.js). Viewers never call this service or Firebase.
 *
 * Firestore ext_channels/{channelId}:
 *   { login, pairCode, userKey, friendCode, psnOnlineId, live, startedAt, viewers, lastCard, lastPush,
 *     lastTickAt, lastLive, wmLiveSec, wmTargetSec, wmAt, lastCreditAt, subs }
 * Routes:
 *   POST /ext/register          extension config page (broadcaster JWT) -> { pairCode, paired, login }
 *   GET  /ext/pair/:code        Overlay Studio -> { login, paired }
 *   POST /ext/pair              Overlay Studio (code, idToken?) -> links the site account (friend code, PSN)
 *   POST /webhooks/twitch-eventsub   stream.online/offline, channel.update, channel.shared_chat.*
 * Watermark (free tier): after a random 20-40 min of live time since the last one (live time carries over
 * between streams), only while 2+ viewers. Founder lifetime: once per 30 days, at 5+ min uptime with 2+ viewers. */
"use strict";

const crypto = require("crypto");
const express = require("express");
const { buildCard, sameCard, effectiveTier } = require("./extcard");
const { normName, cleanName } = require("./build");

const DAY = 86400000, MIN = 60000;
const HEARTBEAT_MS = 10 * MIN, MIN_PUSH_GAP_MS = MIN, CREDIT_EVERY_MS = 30 * DAY;
const PLATFORMS = ["playstation", "steam", "xbox", "mobile", "pc"];
const EVENT_TYPES = [["stream.online", "1"], ["stream.offline", "1"], ["channel.update", "2"],
    ["channel.shared_chat.begin", "1"], ["channel.shared_chat.update", "1"], ["channel.shared_chat.end", "1"]];

/** seconds of live time until the next watermark: random 20-40 minutes */
function wmTarget(rand) { return 1200 + Math.floor(rand() * 1201); }

function createExtension(deps) {
    const { store, twitch, extapi } = deps;
    const now = deps.now || Date.now, rand = deps.rand || Math.random;
    const fs = () => deps.fs();
    const chRef = (cid) => fs().collection("ext_channels").doc(String(cid));
    const OWNER = () => process.env.STREAM_SYNC_APP_OWNER_KEY || "";
    const cache = new Map();   // key -> { at, v }
    async function cached(key, ms, fn) {
        const c = cache.get(key); if (c && now() - c.at < ms) return c.v;
        const v = await fn(); cache.set(key, { at: now(), v }); return v;
    }
    const log = (cid, m) => console.log(`[ext ${cid}] ${m}`);

    // ---------- lookups ----------
    const twitchUser = (id) => cached("user:" + id, DAY, async () => ((await twitch.helix("GET", "/users?id=" + encodeURIComponent(id))).data || [])[0] || null);
    const boxArt = (gid) => gid ? cached("game:" + gid, DAY, async () => (((await twitch.helix("GET", "/games?id=" + encodeURIComponent(gid))).data || [])[0] || {}).box_art_url || "") : "";
    async function psnNow(tag) {
        if (!tag) return null;
        const g = await store.psnCard(tag);
        if (!g || !g.online || !g.currentGame || /dashboard/i.test(g.currentGame)) return null;
        return { title: cleanName(g.currentGame), status: g.gameStatus ? String(g.gameStatus) : "", poster: g.currentGameArt || g.posterArt || "" };
    }
    async function allySet() {
        return cached("allies", MIN, async () => {
            const fr = (await store.get("users/" + OWNER() + "/friends")) || {}, set = new Set();
            Object.keys(fr).forEach((k) => { set.add(String(k).toUpperCase()); if (fr[k] && fr[k].friend_code) set.add(String(fr[k].friend_code).toUpperCase()); });
            const mine = await store.get("users/" + OWNER() + "/friend_code"); if (mine) set.add(String(mine).toUpperCase());
            return set;
        });
    }
    async function passFor(d) {
        const ally = !!(d.friendCode && (await allySet()).has(String(d.friendCode).toUpperCase()));
        const p = d.login ? await fs().collection("overlay_pro").doc(d.login).get() : { exists: false };
        const paid = effectiveTier(p.exists ? p.data() : null, now(), false);
        return ally && paid.tier < 3 ? Object.assign(effectiveTier(null, 0, true), { founder: false }) : paid;
    }
    // public tracker summary: a few games per platform, each with up to 3 short facts
    function readTracker(code) {
        return cached("tracker:" + code, 10 * MIN, async () => {
            const games = [];
            for (const p of PLATFORMS) {
                const q = await fs().collection("user").doc(code).collection("platform").doc(p).collection("game").get();
                q.docs.slice(0, 8).forEach((g) => {
                    const v = g.data() || {};
                    const facts = Object.keys(v).filter((k) => !/^(name|title|updatedAt|art|image|poster.*|.*Url|id)$/i.test(k) && (typeof v[k] === "number" || (typeof v[k] === "string" && v[k].length < 40)))
                        .slice(0, 3).map((k) => k.replace(/[_-]+/g, " ") + ": " + v[k]);
                    games.push({ id: g.id, name: String(v.name || v.title || g.id), platform: p, summary: facts });
                });
            }
            return { code, games };
        });
    }
    async function friendsInGame(d, myTitle) {
        if (!d.userKey || !myTitle) return [];
        const fr = (await store.get("users/" + d.userKey + "/friends")) || {}, out = [];
        for (const k of Object.keys(fr)) {
            const code = String((fr[k] && fr[k].friend_code) || k).toUpperCase();
            const key = await store.get("accounts/friend_codes/" + code); if (!key) continue;
            const tag = await store.get("users/" + key + "/psn_username"); if (!tag) continue;
            const g = await cached("psn:" + tag, 2 * MIN, () => psnNow(tag));
            if (!g || normName(g.title) !== normName(myTitle)) continue;
            const tw = (await store.get("users/" + key + "/twitch_username")) || tag;
            out.push({ login: String(tw), display: String(tw), avatar: "", title: g.title, poster: g.poster, via: "psn", tracker: null });
        }
        return out;
    }
    async function sharedAllies(cid) {
        const ids = await extapi.sharedChatParticipants(cid), out = [];
        for (const id of ids) {
            const o = await chRef(id).get(); if (!o.exists || !o.data().lastCard) continue;
            const m = o.data().lastCard.me || {};
            out.push({ login: m.login, display: m.name, avatar: m.avatar, title: m.game, poster: m.poster, via: "shared", tracker: m.tracker || null });
        }
        return out;
    }
    async function watermark() {
        const k = await extapi.extKeys(), u = await twitchUser(k.ownerId);
        return u ? { img: u.profile_image_url, name: u.login } : null;
    }

    // ---------- one channel ----------
    async function runChannel(cid, force) {
        const ref = chRef(cid), snap = await ref.get(); if (!snap.exists) return null;
        const d = snap.data(), t = now();
        try {
            const s = await twitch.stream(cid), live = !!s;
            const info = live ? s : (await twitch.channel(cid)) || {};
            const user = (await twitchUser(cid)) || {};
            const pass = await passFor(d);
            const viewers = live ? Number(s.viewer_count || 0) : 0;
            const startedAt = live ? Date.parse(s.started_at) || t : null;
            const psn = pass.tier >= 3 ? await psnNow(d.psnOnlineId) : null;
            const tracker = pass.tier >= 2 && d.friendCode ? await readTracker(d.friendCode) : null;
            let allies = [];
            if (pass.tier >= 2 && live) allies = allies.concat(await sharedAllies(cid));
            if (pass.tier >= 3 && live && psn) allies = allies.concat(await friendsInGame(d, psn.title));

            // watermark clock (free tier): live seconds since the last one, carried across streams
            const st = { wmLiveSec: Number(d.wmLiveSec || 0), wmTargetSec: Number(d.wmTargetSec || 0) || wmTarget(rand), wmAt: d.wmAt || null, lastCreditAt: d.lastCreditAt || 0 };
            if (live && d.lastLive && d.lastTickAt) st.wmLiveSec += Math.min(t - d.lastTickAt, 2 * MIN) / 1000;
            if (pass.tier === 0 && live && st.wmLiveSec >= st.wmTargetSec && viewers >= 2) { st.wmAt = t; st.wmLiveSec = 0; st.wmTargetSec = wmTarget(rand); }
            let creditAt = null;
            if (pass.tier >= 1 && pass.founder && live && viewers >= 2 && (t - startedAt) >= 5 * MIN && t - st.lastCreditAt >= CREDIT_EVERY_MS) { creditAt = t; st.lastCreditAt = t; }

            const card = buildCard({ tier: pass.tier, founder: pass.founder, live, startedAt,
                twitch: { login: user.login || d.login, display: user.display_name || d.login, avatar: user.profile_image_url || "", title: info.title || "", gameName: info.game_name || "", gameBoxArt: await boxArt(info.game_id) },
                psn, tracker, allies, watermark: await watermark(), wmAt: st.wmAt, creditAt });

            const changed = !sameCard(card, d.lastCard);
            const gap = t - Number(d.lastPush || 0);
            const send = force || (changed && gap >= MIN_PUSH_GAP_MS) || (live && gap >= HEARTBEAT_MS);
            const patch = Object.assign({ live, startedAt, viewers, lastTickAt: t, lastLive: live }, st);
            if (send) { await extapi.pushCard(cid, card); await extapi.saveCard(cid, card); patch.lastCard = card; patch.lastPush = t; }
            await ref.set(patch, { merge: true });
            return card;
        } catch (e) { log(cid, "kept last card: " + e.message); return null; }
    }

    async function tick() {
        let docs = [];
        try { docs = (await fs().collection("ext_channels").get()).docs; } catch (e) { console.warn("[ext] list failed: " + e.message); return; }
        for (const doc of docs) await runChannel(doc.id, false);
    }
    async function anyLive() {
        try { return (await fs().collection("ext_channels").where("live", "==", true).get()).docs.length > 0; } catch (e) { return false; }
    }

    // ---------- EventSub ----------
    async function eventSecret() {
        const s = await store.secrets(OWNER());
        if (s.twitch_eventsub_secret) return String(s.twitch_eventsub_secret);
        const v = crypto.randomBytes(24).toString("hex");
        await store.saveSecret(OWNER(), "twitch_eventsub_secret", v);
        return v;
    }
    async function subscribe(cid) {
        const secret = await eventSecret();
        if (!/^https:\/\//.test(deps.publicUrl || "")) return [];
        const ids = [];
        for (const [type, version] of EVENT_TYPES) {
            try {
                const j = await twitch.helix("POST", "/eventsub/subscriptions", null, { type, version, condition: { broadcaster_user_id: String(cid) },
                    transport: { method: "webhook", callback: deps.publicUrl + "/webhooks/twitch-eventsub", secret } });
                if (j.data && j.data[0]) ids.push(j.data[0].id);
            } catch (e) { if (e.status !== 409) log(cid, "eventsub " + type + ": " + e.message); }
        }
        return ids;
    }

    // ---------- routes ----------
    function mount(app) {
        const cors = (req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
            if (req.method === "OPTIONS") return res.sendStatus(204);
            next();
        };
        app.use("/ext", cors);
        const form = express.urlencoded({ extended: false, limit: "8kb" });

        app.post("/ext/register", form, async (req, res) => {
            const tok = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
            const p = await extapi.verifyViewer(tok);
            if (!p) return res.status(401).json({ error: "Bad Twitch token." });
            if (p.role !== "broadcaster" || !p.channel_id) return res.status(403).json({ error: "Only the broadcaster can set this up." });
            const cid = String(p.channel_id), ref = chRef(cid);
            try {
                let d = (await ref.get()).exists ? (await ref.get()).data() : null;
                if (!d) {
                    const u = (await twitchUser(cid)) || {};
                    d = { channelId: cid, login: String(u.login || cid).toLowerCase(), pairCode: await newPairCode(), userKey: null, friendCode: null, psnOnlineId: null, live: false, created: now() };
                    await ref.set(d);
                }
                await eventSecret();
                if (!d.subs || !d.subs.length) { const subs = await subscribe(cid); if (subs.length) await ref.set({ subs }, { merge: true }); }
                await runChannel(cid, true);
                res.json({ pairCode: d.pairCode, paired: !!d.userKey, login: d.login });
            } catch (e) { console.warn("[ext register] " + e.message); res.status(500).json({ error: "Could not set up the extension. Try again in a minute." }); }
        });

        app.get("/ext/pair/:code", async (req, res) => {
            const d = await byCode(req.params.code); if (!d) return res.status(404).json({ error: "Unknown code." });
            res.json({ login: d.data().login, paired: !!d.data().userKey });
        });

        app.post("/ext/pair", form, async (req, res) => {
            const d = await byCode(req.body && req.body.code); if (!d) return res.status(404).json({ error: "Unknown code. Open the extension's settings on Twitch to see yours." });
            const patch = { paired: true };
            if (req.body.idToken) {
                let u; try { u = await store.userFromIdToken(req.body.idToken); } catch (e) { return res.status(401).json({ error: "Sign in again, then pair." }); }
                patch.userKey = u.key;
                patch.friendCode = String((await store.get("users/" + u.key + "/friend_code")) || "").toUpperCase() || null;
                patch.psnOnlineId = (await store.get("users/" + u.key + "/psn_username")) || null;
            }
            await chRef(d.id).set(patch, { merge: true });
            runChannel(d.id, true).catch(() => {});
            res.json({ paired: true, login: d.data().login, friendCode: patch.friendCode || null });
        });

        app.post("/webhooks/twitch-eventsub", express.raw({ type: "*/*", limit: "64kb" }), async (req, res) => {
            const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
            const id = String(req.headers["twitch-eventsub-message-id"] || ""), ts = String(req.headers["twitch-eventsub-message-timestamp"] || "");
            const sig = String(req.headers["twitch-eventsub-message-signature"] || "");
            const want = "sha256=" + crypto.createHmac("sha256", await eventSecret()).update(id + ts).update(raw).digest("hex");
            if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return res.status(403).send("bad signature");
            let body; try { body = JSON.parse(raw.toString("utf8")); } catch (e) { return res.status(400).send("bad json"); }
            const type = String(req.headers["twitch-eventsub-message-type"] || "");
            if (type === "webhook_callback_verification") return res.type("text/plain").send(String(body.challenge || ""));
            res.sendStatus(200);
            if (type !== "notification") return;
            const cid = String((body.event && (body.event.broadcaster_user_id || body.event.broadcaster_id)) || "");
            if (cid) runChannel(cid, true).catch((e) => log(cid, e.message));
        });
    }
    async function byCode(code) {
        code = String(code || "").trim().toUpperCase(); if (!/^WOLF-\d{4}$/.test(code)) return null;
        const q = await fs().collection("ext_channels").where("pairCode", "==", code).get();
        return q.docs[0] || null;
    }
    async function newPairCode() {
        for (let i = 0; i < 20; i++) {
            const c = "WOLF-" + String(crypto.randomInt(0, 10000)).padStart(4, "0");
            if (!(await byCode(c))) return c;
        }
        throw new Error("no free pair code");
    }

    return { mount, tick, runChannel, anyLive };
}

module.exports = { createExtension, wmTarget };
