// scripts/sync_active_game.js
// Section 1: Modules, RTDB Endpoints & Output Paths
const fs = require('fs');
const path = require('path');

const FIREBASE_DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const TARGET_GAMERTAG = "wildhorse_spirit";
const OUTPUT_FILE = path.join(__dirname, '../game/data/game.json');
const PSN_FOLDER_JSON = path.join(__dirname, '../Playstation/psn.json');
const ARCHIVE_DIR = path.join(__dirname, '../game/data/games');

// Section 2: Pure RTDB Read & Output Flow
async function main() {
  try {
    console.log(`[1/3] Reading saved active game data from Firebase RTDB for ${TARGET_GAMERTAG}...`);
    
    // Fetch the active commId pointer already saved in RTDB
    const commIdRes = await fetch(`${FIREBASE_DB_URL}/psn/gamertags/${TARGET_GAMERTAG}/commId.json`);
    const commId = await commIdRes.json();

    if (!commId) {
      console.log(`No active commId found in RTDB for ${TARGET_GAMERTAG}.`);
      return;
    }

    // Fetch the game's metadata and trophy skeleton already saved under this commId
    const gameDataRes = await fetch(`${FIREBASE_DB_URL}/psn/games/${commId}.json`);
    const savedGame = await gameDataRes.json() || {};

    const gameName = savedGame.gameTitle || savedGame.name || savedGame.trophyTitleName || "Active Game";
    const gameId = gameName.replace(/[^a-zA-Z0-9]/g, "");
    console.log(`[2/3] Found saved active game: "${gameName}" (${commId})`);

    // Build pill metrics based on the game name
    let metrics = [
      { id: "metric_1", icon: "🏆", label: "Trophy Progress", current: savedGame.progress || 0, total: 100, step: 1 }
    ];

    const cleanTitle = gameName.toLowerCase();
    if (cleanTitle.includes("far cry")) {
      metrics = [
        { id: "metric_1", icon: "⚡", label: "Resistance Pts", current: 0, total: 39000, step: 100 },
        { id: "metric_2", icon: "🏴", label: "Outposts", current: 0, total: 21, step: 1 },
        { id: "metric_3", icon: "🔥", label: "Cult Property", current: 0, total: 48, step: 1 },
        { id: "metric_4", icon: "📦", label: "Prepper Stashes", current: 0, total: 27, step: 1 },
        { id: "metric_5", icon: "🐾", label: "Guns & Fangs", current: 0, total: 9, step: 1 },
        { id: "metric_6", icon: "🗂️", label: "Collectibles", current: 0, total: 58, step: 1 }
      ];
    } else if (cleanTitle.includes("ghost of tsushima")) {
      metrics = [
        { id: "metric_1", icon: "📜", label: "Records / Scrolls", current: 0, total: 40, step: 1 },
        { id: "metric_2", icon: "🏺", label: "Mongol Artifacts", current: 0, total: 50, step: 1 },
        { id: "metric_3", icon: "🎏", label: "Sashimono Banners", current: 0, total: 80, step: 1 },
        { id: "metric_4", icon: "🦊", label: "Inari Shrines", current: 0, total: 49, step: 1 },
        { id: "metric_5", icon: "🎋", label: "Bamboo Strikes", current: 0, total: 16, step: 1 },
        { id: "metric_6", icon: "♨️", label: "Hot Springs", current: 0, total: 18, step: 1 },
        { id: "metric_7", icon: "🪶", label: "Haikus", current: 0, total: 19, step: 1 },
        { id: "metric_8", icon: "⛩️", label: "Shinto Shrines", current: 0, total: 16, step: 1 }
      ];
    }

    // Assemble payload using already-saved RTDB data
    const gamePayload = {
      game: gameName,
      gameId: gameId,
      commId: commId,
      lastUpdated: savedGame.lastUpdated || new Date().toISOString(),
      overallProgress: savedGame.progress || 0,
      activeMission: savedGame.activeMission || "In Progress",
      metrics: metrics,
      categories: savedGame.categories || {},
      trophies: savedGame.trophies || []
    };

    console.log("[3/3] Writing payload to game/data/game.json and Playstation/psn.json...");
    
    const outputDir = path.dirname(OUTPUT_FILE);
    const psnDir = path.dirname(PSN_FOLDER_JSON);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(psnDir)) fs.mkdirSync(psnDir, { recursive: true });
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gamePayload, null, 2), 'utf8');
    fs.writeFileSync(PSN_FOLDER_JSON, JSON.stringify(gamePayload, null, 2), 'utf8');
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${commId}.json`), JSON.stringify(gamePayload, null, 2), 'utf8');

    console.log(`[SUCCESS] Wrote ${gameName} (${commId}) to game.json and psn.json without needing PSN tokens.`);

  } catch (err) {
    console.error("Reader failure:", err.message);
    process.exit(1);
  }
}

main();
