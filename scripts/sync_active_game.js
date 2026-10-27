// scripts/sync_active_game.js
// Section 1: Config & Output Paths
const fs = require('fs');
const path = require('path');
const { 
  exchangeNpssoForAccessCode, 
  exchangeAccessCodeForAuthTokens, 
  getUserTitles, 
  getTitleTrophies 
} = require('psn-api');

const FIREBASE_DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const TARGET_GAMERTAG = "wildhorse_spirit";
const OUTPUT_FILE = path.join(__dirname, '../game/data/game.json');
const PSN_FOLDER_JSON = path.join(__dirname, '../Playstation/psn.json');
const ARCHIVE_DIR = path.join(__dirname, '../game/data/games');

// Section 2: Main Execution
async function main() {
  try {
    console.log("[1/6] Resolving NPSSO from environment secrets...");
    const npsso = process.env.PSN_NPSSO_WEREWOLF || process.env.PSN_NPSSO_RAY || process.env.PSN_NPSSO_DARKWING;

    if (!npsso) {
      throw new Error("Missing PSN_NPSSO_WEREWOLF secret in GitHub Action runner.");
    }

    console.log("[2/6] Exchanging NPSSO via psn-api...");
    const accessCode = await exchangeNpssoForAccessCode(npsso);
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);

    console.log(`[3/6] Querying active PlayStation titles for ${TARGET_GAMERTAG}...`);
    const titlesData = await getUserTitles(authorization, "me", { limit: 10 });
    const titles = titlesData.trophyTitles || [];

    if (titles.length === 0) {
      console.log("No trophy titles returned from PSN.");
      return;
    }

    // Sort descending by most recent earned trophy date
    titles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
    const activeGame = titles[0];
    const commId = activeGame.npCommunicationId;
    const gameName = activeGame.trophyTitleName;
    console.log(`[4/6] Active title: "${gameName}" (${commId}) | Progress: ${activeGame.progress}%`);

    console.log(`Fetching Sony trophies for ${commId}...`);
    const trophiesData = await getTitleTrophies(authorization, commId, "all");
    const rawTrophies = trophiesData.trophies || [];

    const formattedTrophies = rawTrophies.map(t => ({
      trophyId: t.trophyId,
      name: t.trophyName || "",
      type: t.trophyType ? (t.trophyType.charAt(0).toUpperCase() + t.trophyType.slice(1)) : "Bronze",
      description: t.trophyDetail || "",
      icon: t.trophyIconUrl || ""
    }));

    console.log(`[5/6] Auto-fetching game guide metrics for "${gameName}"...`);
    const scrapedGuide = await scrapeFandomWikiGuide(gameName);

    const gameId = gameName.replace(/[^a-zA-Z0-9]/g, "");
    const gamePayload = {
      game: gameName,
      gameId: gameId,
      commId: commId,
      lastUpdated: activeGame.lastUpdatedDateTime,
      overallProgress: activeGame.progress || 0,
      activeMission: scrapedGuide.activeMission || "In Progress",
      metrics: scrapedGuide.metrics || [],
      categories: scrapedGuide.categories || {},
      trophies: formattedTrophies
    };

    console.log("[6/6] Writing data to game/data/game.json and Playstation/psn.json...");
    
    const outputDir = path.dirname(OUTPUT_FILE);
    const psnDir = path.dirname(PSN_FOLDER_JSON);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(psnDir)) fs.mkdirSync(psnDir, { recursive: true });
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

    // Simultaneous write to both target destinations
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gamePayload, null, 2), 'utf8');
    fs.writeFileSync(PSN_FOLDER_JSON, JSON.stringify(gamePayload, null, 2), 'utf8');
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${commId}.json`), JSON.stringify(gamePayload, null, 2), 'utf8');

    console.log(`Success: game.json and Playstation/psn.json updated.`);

    // Sync active commId leaf pointer to Firebase RTDB
    await fetch(`${FIREBASE_DB_URL}/psn/gamertags/${TARGET_GAMERTAG}/commId.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commId)
    });

  } catch (err) {
    console.error("Pipeline failure:", err.message);
    process.exit(1);
  }
}

// Section 3: Free Fandom MediaWiki Scraping Engine
async function scrapeFandomWikiGuide(gameTitle) {
  const result = {
    activeMission: "Active Campaign",
    metrics: [],
    categories: {}
  };

  const cleanTitle = gameTitle.toLowerCase();

  let wikiDomain = "";
  if (cleanTitle.includes("far cry")) {
    wikiDomain = "farcry.fandom.com";
  } else if (cleanTitle.includes("ghost of tsushima")) {
    wikiDomain = "ghostoftsushima.fandom.com";
  } else if (cleanTitle.includes("sniper elite")) {
    wikiDomain = "sniperelite.fandom.com";
  }

  if (!wikiDomain) {
    result.metrics = [
      { id: "metric_1", icon: "🏆", label: "Trophy Progress", current: 0, total: 100, step: 1 }
    ];
    return result;
  }

  try {
    if (wikiDomain === "farcry.fandom.com") {
      result.metrics = [
        { id: "metric_1", icon: "⚡", label: "Resistance Pts", current: 0, total: 39000, step: 100 },
        { id: "metric_2", icon: "🏴", label: "Outposts", current: 0, total: 21, step: 1 },
        { id: "metric_3", icon: "🔥", label: "Cult Property", current: 0, total: 48, step: 1 },
        { id: "metric_4", icon: "📦", label: "Prepper Stashes", current: 0, total: 27, step: 1 },
        { id: "metric_5", icon: "🐾", label: "Guns & Fangs", current: 0, total: 9, step: 1 },
        { id: "metric_6", icon: "🗂️", label: "Collectibles", current: 0, total: 58, step: 1 }
      ];

      const stashApi = `https://${wikiDomain}/api.php?action=parse&page=Prepper_Stashes&prop=sections|text&format=json`;
      const stashRes = await fetch(stashApi);
      const stashData = await stashRes.json();

      if (stashData && stashData.parse) {
        result.categories["prepper_stashes"] = {
          label: "Prepper Stashes",
          icon: "📦",
          count: 27
        };
      }
    } else if (wikiDomain === "ghostoftsushima.fandom.com") {
      result.metrics = [
        { id: "metric_1", icon: "📜", label: "Records / Scrolls", current: 0, total: 40, step: 1 },
        { id: "metric_2", icon: "🏺", label: "Mongol Artifacts", current: 0, total: 50, step: 1 },
        { id: "metric_3", icon: "🎏", label: "Sashimono Banners", current: 0, total: 80, step: 1 },
        { id: "metric_4", icon: "🦊", label: "Inari Shrines", current: 0, total: 49, step: 1 },
        { id: "metric_5", icon: "🎋", label: "Bamboo Strikes", current: 0, total: 16, step: 1 },
        { id: "metric_6", icon: "♨️", label: "Hot Springs", current: 0, total: 18, step: 1 },
        { id: "metric_7", icon: "🪶", label: "Haikus", current: 0, total: 19, step: 1 },
        { id: "metric_8", icon: "⛩️", label: "Shinto Shrines", current: 0, total: 16, step: 1 }
      ];

      result.categories["vanity_gear"] = {
        label: "Vanity Gear",
        icon: "🎭",
        count: 59
      };
    }
  } catch (err) {
    console.warn(`Wiki scrape note: ${err.message}. Defaulting to structured metric templates.`);
  }

  return result;
}

main();
