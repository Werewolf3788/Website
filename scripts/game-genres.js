/**
 * Game genres -> overlay/game-genres.json  (read by overlay/game-themes.js)
 *
 * 1. Finds the game each watched Twitch channel is streaming right now:
 *      - "channels" in overlay/game-themes.json (Phoenix, Werewolf...)
 *      - every Overlay Studio save in overlay/saves/ that has "Match my game" turned on
 * 2. Any game not in game-genres.json yet is looked up once on IGDB (genres + themes)
 *    and saved with its Twitch box art. Games already saved are never looked up again.
 * 3. Extra games can be added by hand from the Actions tab (workflow input "games").
 *
 * Keys: twitch_client_id / twitch_client_secret from the Key Vault
 *       (/user_secrets/raykevin71888_at_gmail_com). TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET
 *       repo secrets are used first if they are set. No key is stored in code.
 * Nothing is written to Firebase; the file only changes (and is only committed) when a new game shows up.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const THEMES_FILE = path.join(ROOT, "overlay", "game-themes.json");
const OUT_FILE = path.join(ROOT, "overlay", "game-genres.json");
const SAVES_DIR = path.join(ROOT, "overlay", "saves");
const DB = "https://entertainment-71888-default-rtdb.firebaseio.com";
const OWNER = (process.env.OWNER_EMAIL_KEY || "raykevin71888_at_gmail_com").trim();

const norm = (s) => String(s || "").toLowerCase().replace(/[‘’`]/g, "'").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Key Vault ---------- */
async function vault() {
    const raw = (process.env.GCP_SA_KEY_WEBSITE || "").trim();
    if (raw) {
        try {
            const { initializeApp, cert } = require("firebase-admin/app");
            const { getDatabase } = require("firebase-admin/database");
            const c = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
            if (typeof c.private_key === "string") c.private_key = c.private_key.replace(/\\n/g, "\n");
            const app = initializeApp({ credential: cert(c), databaseURL: DB }, "gameGenres");
            return (await getDatabase(app).ref(`user_secrets/${OWNER}`).once("value")).val() || {};
        } catch (e) { console.warn(`[KEYS] Admin SDK failed (${e.message}); trying REST.`); }
    }
    const auth = (process.env.FIREBASE_AUTH_SECRET || "").trim();
    const r = await fetch(`${DB}/user_secrets/${OWNER}.json${auth ? `?auth=${encodeURIComponent(auth)}` : ""}`);
    return r.ok ? (await r.json()) || {} : {};
}

/* ---------- Twitch + IGDB ---------- */
let CID = "", TOKEN = "";
async function login() {
    const sec = await vault();
    CID = String(process.env.TWITCH_CLIENT_ID || sec.twitch_client_id || "").trim();
    const secret = String(process.env.TWITCH_CLIENT_SECRET || sec.twitch_client_secret || "").trim();
    if (!CID || !secret) throw new Error("Twitch keys missing: add twitch_client_id and twitch_client_secret rows to the Keys sheet.");
    const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(CID)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`, { method: "POST" });
    const j = await r.json();
    if (!j.access_token) throw new Error(`Twitch login failed: ${JSON.stringify(j)}`);
    TOKEN = j.access_token;
}
async function helix(p) {
    for (let a = 1; a <= 3; a++) {
        const r = await fetch(`https://api.twitch.tv/helix/${p}`, { headers: { "Client-ID": CID, Authorization: `Bearer ${TOKEN}` } });
        if (r.status === 429 || r.status >= 500) { await sleep(1500 * a); continue; }
        if (!r.ok) throw new Error(`helix ${p}: HTTP ${r.status}`);
        return (await r.json()).data || [];
    }
    return [];
}
async function igdb(body) {
    for (let a = 1; a <= 3; a++) {
        const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers: { "Client-ID": CID, Authorization: `Bearer ${TOKEN}`, "Content-Type": "text/plain" }, body });
        if (r.status === 429 || r.status >= 500) { await sleep(1000 * a); continue; }
        if (!r.ok) throw new Error(`igdb: HTTP ${r.status} ${await r.text()}`);
        return r.json();
    }
    return [];
}
const igdbFields = "fields name,genres.name,themes.name;";

/* ---------- which channels to watch ---------- */
function studioChannels() {
    const out = new Set();
    if (!fs.existsSync(SAVES_DIR)) return out;
    for (const f of fs.readdirSync(SAVES_DIR)) {
        if (!f.endsWith(".json")) continue;
        try {
            const d = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, f), "utf8"));
            const c = String(d.c || ""), b = Buffer.from(c.slice(1).replace(/-/g, "+").replace(/_/g, "/"), "base64");
            const cfg = JSON.parse((c[0] === "z" ? zlib.inflateRawSync(b) : b).toString("utf8"));
            if (!cfg.gameTheme || !cfg.gameTheme.on) continue;
            if (cfg.platform && cfg.platform !== "twitch") continue;
            const name = String(cfg.channel || "").toLowerCase().replace(/^.*twitch\.tv\//, "").replace(/[^a-z0-9_]/g, "");
            if (name) out.add(name);
        } catch (e) { /* not a readable save */ }
    }
    return out;
}

async function main() {
    const themes = JSON.parse(fs.readFileSync(THEMES_FILE, "utf8"));
    const out = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : { games: {} };
    out.games = out.games || {};

    await login();

    const channels = [...new Set([...(themes.channels || []), ...studioChannels()].map((c) => String(c).toLowerCase()))].filter(Boolean);
    console.log(`[GENRES] watching ${channels.length} channel(s): ${channels.join(", ")}`);

    // games being streamed right now (100 channels per call)
    const live = new Map();   // twitch game id -> name
    for (let i = 0; i < channels.length; i += 100) {
        const q = channels.slice(i, i + 100).map((c) => `user_login=${encodeURIComponent(c)}`).join("&");
        for (const s of await helix(`streams?first=100&${q}`)) if (s.game_id) live.set(s.game_id, s.game_name);
    }
    // games typed in by hand from the Actions tab ("Game A; Game B")
    const extra = String(process.env.EXTRA_GAMES || "").split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
    const want = [...live.values(), ...extra].filter((n) => !out.games[norm(n)] || process.env.REFRESH === "true");
    if (!want.length) { console.log("[GENRES] nothing new to look up."); return; }

    let added = 0;
    for (let i = 0; i < want.length; i += 20) {
        const names = want.slice(i, i + 20);
        const tw = await helix(`games?${names.map((n) => `name=${encodeURIComponent(n)}`).join("&")}`);
        for (const n of names) {
            const g = tw.find((x) => norm(x.name) === norm(n));
            const entry = { name: g ? g.name : n, genres: [], themes: [], box: g ? g.box_art_url : "", igdb_id: g && g.igdb_id ? Number(g.igdb_id) : null, checked: new Date().toISOString().slice(0, 10) };
            try {
                let hit = null;
                if (entry.igdb_id) hit = (await igdb(`${igdbFields} where id = ${entry.igdb_id};`))[0];
                if (!hit) hit = (await igdb(`${igdbFields} search "${entry.name.replace(/"/g, "")}"; limit 1;`))[0];
                if (hit) {
                    entry.igdb_id = hit.id;
                    entry.genres = (hit.genres || []).map((x) => x.name);
                    entry.themes = (hit.themes || []).map((x) => x.name);
                }
            } catch (e) { console.warn(`[GENRES] ${n}: ${e.message}`); }
            out.games[norm(entry.name)] = entry;
            added++;
            console.log(`[GENRES] ${entry.name}: ${[...entry.themes, ...entry.genres].join(", ") || "(no tags)"}`);
            await sleep(260);   // IGDB allows 4 requests a second
        }
    }
    out.updated = new Date().toISOString();
    const sorted = {}; Object.keys(out.games).sort().forEach((k) => { sorted[k] = out.games[k]; });
    out.games = sorted;
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n");
    console.log(`[GENRES] saved ${added} game(s).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
