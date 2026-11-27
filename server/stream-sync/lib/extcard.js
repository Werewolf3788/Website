/* Werewolf Twitch extension: the "card" a channel's viewers see (pure, no I/O).
 * Pushed to viewers through Twitch Extension PubSub and saved in Twitch's broadcaster config
 * segment, so it must stay under 5 KB. Tier decides what goes in:
 *   0 free   Twitch basics + watermark      1  Twitch basics
 *   2        + tracker, Stream Together allies
 *   3        + PlayStation game/status, same-game allies
 * Founder lifetime passes get the watermark picture once a month (credit). */
"use strict";

const FOOT = "Track your own games at entertainment-71888.web.app";
const MAX_BYTES = 5120;
const NON_GAMES = new Set(["just chatting", "music", "art", "talk shows & podcasts", "irl", "asmr", "pools, hot tubs, and beaches", "special events", "travel & outdoors", "software and game development", "makers & crafting", "food & drink", "sports", "fitness & health", "science & technology"]);

// same rules as server/discord-auth/tiers.js (kept in step there)
function effectiveTier(doc, now, ally) {
    if (ally) return { tier: 3, lifetime: false, founder: false, until: 0, ally: true };
    const d = doc || {}, t = d.tiers || (Number(d.until) ? { 1: { until: Number(d.until) } } : {});
    for (const n of [3, 2, 1]) {
        const e = t[n] || t[String(n)];
        if (e && (e.lifetime || Number(e.until) > now)) return { tier: n, lifetime: !!e.lifetime, founder: !!e.founder, until: e.lifetime ? 0 : Number(e.until) };
    }
    return { tier: 0, lifetime: false, founder: false, until: 0 };
}

const boxArt = (u) => (u ? String(u).replace("{width}", "285").replace("{height}", "380") : "");
const clip = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function me(input) {
    const tw = input.twitch || {}, tier = input.tier || 0;
    const out = { name: tw.display || tw.login || "", login: tw.login || "", avatar: tw.avatar || "", game: "", status: "", poster: "", source: "avatar", tracker: tier >= 2 ? input.tracker || null : null };
    if (!input.live) return Object.assign(out, { status: "Offline", poster: out.avatar });
    if (tier >= 3 && input.psn && input.psn.title) return Object.assign(out, { game: input.psn.title, status: input.psn.status || tw.title || "", poster: input.psn.poster || boxArt(tw.gameBoxArt) || out.avatar, source: "psn" });
    if (tw.gameName && !NON_GAMES.has(String(tw.gameName).toLowerCase())) return Object.assign(out, { game: tw.gameName, status: tw.title || "", poster: boxArt(tw.gameBoxArt) || out.avatar, source: "twitch" });
    return Object.assign(out, { game: tw.gameName || "", status: tw.title || "", poster: out.avatar, source: "avatar" });
}

function buildCard(input) {
    const tier = input.tier || 0;
    const allies = tier < 2 ? [] : (input.allies || []).filter((a) => a.via === "shared" || (tier >= 3 && a.via === "psn"))
        .map((a) => ({ name: a.display || a.login, login: a.login, avatar: a.avatar || "", game: a.title || "", poster: a.poster || a.avatar || "", tracker: a.tracker || null }));
    const credit = tier >= 1 && input.founder && input.creditAt ? { at: input.creditAt } : null;
    const wmOn = tier === 0 || !!credit;
    const card = {
        v: 1, at: Date.now(), live: !!input.live, startedAt: input.live ? input.startedAt || null : null,
        me: me(input), allies,
        wm: wmOn && input.watermark ? { img: input.watermark.img, name: input.watermark.name, secs: 10, opacity: 0.75 } : null,
        wmAt: tier === 0 && input.live ? input.wmAt || null : null,
        credit, foot: FOOT
    };
    return fit(card);
}

const cardSize = (c) => Buffer.byteLength(JSON.stringify(c), "utf8");

// trim, in order, until it fits: allies' trackers, tracker summaries to 3 lines, long text, extra allies
function fit(c) {
    if (cardSize(c) <= MAX_BYTES) return c;
    c.allies.forEach((a) => { a.tracker = null; });
    if (cardSize(c) <= MAX_BYTES) return c;
    const trim = (t) => { if (t && t.games) t.games = t.games.slice(0, 6).map((g) => Object.assign({}, g, { name: clip(g.name, 40), summary: (g.summary || []).slice(0, 3).map((x) => clip(x, 60)) })); };
    trim(c.me.tracker);
    if (cardSize(c) <= MAX_BYTES) return c;
    const short = (o, keys) => keys.forEach((k) => { if (o[k] && !/^https?:/.test(o[k])) o[k] = clip(o[k], 80); else if (o[k] && o[k].length > 300) o[k] = ""; });
    short(c.me, ["name", "game", "status", "avatar", "poster"]);
    c.allies.forEach((a) => short(a, ["name", "game", "avatar", "poster"]));
    while (cardSize(c) > MAX_BYTES && c.allies.length > 3) c.allies.pop();
    while (cardSize(c) > MAX_BYTES && c.me.tracker && c.me.tracker.games.length) c.me.tracker.games.pop();
    while (cardSize(c) > MAX_BYTES && c.allies.length) c.allies.pop();
    return c;
}

function sameCard(a, b) {
    if (!a || !b) return false;
    const strip = (c) => JSON.stringify(Object.assign({}, c, { at: 0 }));
    return strip(a) === strip(b);
}

module.exports = { buildCard, cardSize, sameCard, effectiveTier, FOOT, MAX_BYTES };
