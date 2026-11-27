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
 *   POST /ext/pair              Overlay Studio (code, idToken?) -> links the site account (friend code, PSN); the code then changes
 *   GET  /ext/more/:channelId   viewers' "View more" (server-cached tracker, so Firestore isn't read per viewer)
 *   GET  /ext/mark/:login       the streamer's browser overlay: when to show the credit (same moment as the extension)
 *   POST /webhooks/twitch-eventsub   stream.online/offline, channel.update, channel.shared_chat.*
 * Watermark (free tier): after a random 20-40 min of live time since the last one (live time carries over
 * between streams), only while 2+ viewers. Founder lifetime: once per 30 days, at 5+ min uptime with 2+ viewers. */
"use strict";

const crypto = require("crypto");
const express = require("express");
const { buildCard, sameCard, effectiveTier, trackerEntry } = require("./extcard");
const { normName, cleanName } = require("./build");

const DAY = 86400000, MIN = 60000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", CODE_RE = /^WOLF-[A-HJ-NP-Z2-9]{8}$/;
const OFFLINE_CHECK_MS = 5 * MIN, SAVE_EVERY_MS = 5 * MIN, TICK_GAP_MS = 55000;
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
    const mem = new Map();     // channelId -> watermark clock + check times (saved to Firestore only now and then)
    const loginIndex = new Map();   // twitch login -> channelId (for the browser overlay's /ext/mark)
    let lastTickRun = 0;
    const hits = new Map();    // ip -> { at, n }   simple rate limit for the pairing routes
    function limited(req) {
        const ip = String(req.ip || req.headers["x-forwarded-for"] || "?"), t = now(), h = hits.get(ip);
        if (!h || t - h.at > MIN) { hits.set(ip, { at: t, n: 1 }); return false; }
        return ++h.n > 20;
    }
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
        return cached("psnme:" + tag, 45000, () => psnRead(tag));
    }
    async function psnRead(tag) {
        const g = await store.psnCard(tag, { strict: true });   // throws if the PlayStation database can't be reached
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
        const doc = d.login ? await cached("pass:" + d.login, 5 * MIN, async () => { const p = await fs().collection("overlay_pro").doc(d.login).get(); return p.exists ? p.data() : null; }) : null;
        const paid = effectiveTier(doc, now(), false);
        // allies get Tier 3 free and, like Founder lifetime, the small monthly credit - except on the owner's own channel
        if (ally && paid.tier < 3) return Object.assign(effectiveTier(null, 0, true), { founder: d.userKey !== OWNER() });
        return paid;
    }
    // the streamer's public tracker, read at most once per 10 minutes no matter how many viewers there are.
    // Used for the card (3 facts per game) and for "View more" (/ext/more, up to 8 facts).
    function readGames(code) {
        return cached("games:" + code, 10 * MIN, async () => {
            const games = [];
            for (const p of PLATFORMS) {
                const q = await fs().collection("user").doc(code).collection("platform").doc(p).collection("game").limit(60).get();
                q.docs.map((g) => trackerEntry(g.id, p, g.data()))
                    .filter(Boolean)
                    .sort((a, b) => b.at - a.at || a.name.localeCompare(b.name))
                    .forEach((g) => games.push({ id: g.id, name: g.name, platform: g.platform, facts: g.facts }));
            }
            return games;
        });
    }
    async function readTracker(code) {
        const games = await readGames(code), per = {};
        return { code, games: games.filter((g) => (per[g.platform] = (per[g.platform] || 0) + 1) <= 8).map((g) => ({ id: g.id, name: g.name, platform: g.platform, summary: g.facts.slice(0, 3) })) };
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
        const m = mem.get(cid) || { wmLiveSec: Number(d.wmLiveSec || 0), wmTargetSec: Number(d.wmTargetSec || 0), wmAt: d.wmAt || null, lastCreditAt: d.lastCreditAt || 0,
            lastTickAt: d.lastTickAt || 0, lastLive: !!d.live, lastCheck: 0, lastSave: d.lastSave || 0 };
        // offline channels are only checked every 5 minutes (EventSub stream.online wakes them right away)
        if (!force && !m.lastLive && m.lastCheck && t - m.lastCheck < OFFLINE_CHECK_MS) return null;
        try {
            const s = await twitch.stream(cid), live = !!s;
            const info = live ? s : (await twitch.channel(cid)) || {};
            const user = (await twitchUser(cid)) || {};
            const login = String(user.login || d.login || "").toLowerCase();   // follows Twitch renames
            if (login) loginIndex.set(login, String(cid));
            const pass = await passFor(Object.assign({}, d, { login }));
            const viewers = live ? Number(s.viewer_count || 0) : 0;
            const startedAt = live ? Date.parse(s.started_at) || t : null;
            const psn = pass.tier >= 3 ? await psnNow(d.psnOnlineId) : null;
            const tracker = pass.tier >= 2 && d.friendCode ? await readTracker(d.friendCode) : null;
            let allies = [];
            if (pass.tier >= 2 && live) allies = allies.concat(await sharedAllies(cid));
            if (pass.tier >= 3 && live && psn) allies = allies.concat(await friendsInGame(d, psn.title));

            // watermark clock (free tier): live seconds since the last one, carried across streams
            const st = { wmLiveSec: m.wmLiveSec, wmTargetSec: m.wmTargetSec || wmTarget(rand), wmAt: m.wmAt, lastCreditAt: m.lastCreditAt };
            if (live && m.lastLive && m.lastTickAt) st.wmLiveSec += Math.min(t - m.lastTickAt, 2 * MIN) / 1000;
            let mark = false;
            if (pass.tier === 0 && live && st.wmLiveSec >= st.wmTargetSec && viewers >= 2) { st.wmAt = t; st.wmLiveSec = 0; st.wmTargetSec = wmTarget(rand); mark = true; }
            let creditAt = null;
            if (pass.tier >= 1 && pass.founder && live && viewers >= 2 && (t - startedAt) >= 5 * MIN && t - st.lastCreditAt >= CREDIT_EVERY_MS) { creditAt = t; st.lastCreditAt = t; mark = true; }

            const card = buildCard({ tier: pass.tier, founder: pass.founder, live, startedAt,
                twitch: { login, display: user.display_name || login, avatar: user.profile_image_url || "", title: info.title || "", gameName: info.game_name || "", gameBoxArt: await boxArt(info.game_id) },
                psn, tracker, allies, watermark: await watermark(), wmAt: st.wmAt, creditAt });

            const changed = !sameCard(card, d.lastCard);
            const gap = t - Number(d.lastPush || 0);
            // a new watermark/credit always goes out at once (viewers only show it while it's fresh)
            const send = force || mark || (changed && gap >= MIN_PUSH_GAP_MS) || (live && gap >= HEARTBEAT_MS);
            const patch = Object.assign({ live, startedAt, viewers }, st);
            if (send) { await extapi.pushCard(cid, card); await extapi.saveCard(cid, card); patch.lastCard = card; patch.lastPush = t; }
            mem.set(cid, Object.assign({}, st, { lastTickAt: t, lastLive: live, lastCheck: t, lastSave: m.lastSave }));
            // write only when something changed (or every 5 min while live, to keep the watermark clock)
            const save = send || mark || live !== !!d.live || login !== d.login || startedAt !== (d.startedAt || null) || (live && t - m.lastSave >= SAVE_EVERY_MS);
            if (save) {
                if (login && login !== d.login) patch.login = login;
                patch.lastTickAt = t; patch.lastLive = live; patch.lastSave = t;
                await ref.set(patch, { merge: true });
                mem.get(cid).lastSave = t;
            }
            return card;
        } catch (e) { log(cid, "kept last card: " + e.message); m.lastCheck = t; mem.set(cid, m); return null; }
    }

    async function tick() {
        if (now() - lastTickRun < TICK_GAP_MS) return;   // the server ticks every 30 s; channels are updated once a minute
        lastTickRun = now();
        let docs = [];
        try { docs = (await fs().collection("ext_channels").get()).docs; } catch (e) { console.warn("[ext] list failed: " + e.message); return; }
        for (const doc of docs) await runChannel(doc.id, false);
    }
    async function anyLive() { for (const v of mem.values()) if (v.lastLive) return true; return false; }

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
            if (limited(req)) return res.status(429).json({ error: "Too many tries. Wait a minute." });
            const d = await byCode(req.params.code); if (!d) return res.status(404).json({ error: "Unknown code." });
            res.json({ login: d.data().login, paired: !!d.data().userKey });
        });

        app.post("/ext/pair", form, async (req, res) => {
            if (limited(req)) return res.status(429).json({ error: "Too many tries. Wait a minute." });
            const d = await byCode(req.body && req.body.code); if (!d) return res.status(404).json({ error: "Unknown code. Open the extension's settings on Twitch to see yours." });
            const patch = { paired: true, pairCode: await newPairCode() };   // a code works once; the config page shows the new one
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

        // The streamer's browser-source overlay asks when to show the credit, so it shows at the same moment as the
        // extension's (one clock). 404 = this channel doesn't use the extension: the overlay keeps its own timer.
        app.get("/ext/mark/:login", async (req, res) => {
            const login = String(req.params.login || "").toLowerCase();
            if (!/^[a-z0-9_]{3,25}$/.test(login)) return res.status(404).json({});
            let cid = loginIndex.get(login);
            if (!cid) cid = await cached("mark-login:" + login, 10 * MIN, async () => { const q = await fs().collection("ext_channels").where("login", "==", login).get(); return q.docs[0] ? q.docs[0].id : null; });
            if (!cid) return res.status(404).json({});
            const m = mem.get(cid) || {}, t = now();
            res.setHeader("Cache-Control", "no-store");
            res.json({ live: !!m.lastLive, wmAt: m.wmAt || null, creditAt: m.lastCreditAt && t - m.lastCreditAt < 2 * MIN ? m.lastCreditAt : null });
        });

        // "View more" for viewers: the streamer's tracker from the server's 10-minute cache (never Firestore per viewer)
        app.get("/ext/more/:cid", async (req, res) => {
            const cid = String(req.params.cid || "");
            try {
                const o = /^\d{1,20}$/.test(cid) ? await chRef(cid).get() : { exists: false }; if (!o.exists) return res.status(404).json({ error: "Not set up." });
                const d = o.data(), pass = await passFor(d);
                if (pass.tier < 2 || !d.friendCode) return res.status(404).json({ error: "No tracker." });
                res.setHeader("Cache-Control", "public, max-age=300");
                res.json({ games: (await readGames(d.friendCode)).map((g) => ({ id: g.id, name: g.name, platform: g.platform, facts: g.facts })) });
            } catch (e) { res.status(500).json({ error: "Try again in a minute." }); }
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
        code = String(code || "").trim().toUpperCase(); if (!CODE_RE.test(code)) return null;
        const q = await fs().collection("ext_channels").where("pairCode", "==", code).get();
        return q.docs[0] || null;
    }
    async function newPairCode() {
        for (let i = 0; i < 20; i++) {
            let c = "WOLF-"; for (let k = 0; k < 8; k++) c += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
            if (!(await byCode(c))) return c;
        }
        throw new Error("no free pair code");
    }

    return { mount, tick, runChannel, anyLive, _forget: () => cache.clear() };
}

module.exports = { createExtension, wmTarget };
