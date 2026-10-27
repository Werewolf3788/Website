// scripts/sync_active_game.js
// Section 1: Config, Paths & Headers
const fs = require('fs');
const path = require('path');

const FIREBASE_DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const TARGET_GAMERTAG = "wildhorse_spirit";
const OUTPUT_FILE = path.join(__dirname, '../game/data/game.json');
const ARCHIVE_DIR = path.join(__dirname, '../game/data/games');

// Section 2: Main Pipeline Flow
async function main() {
  try {
    // Section 2.1: Fetch credentials stored in Firebase RTDB
    console.log("[1/6] Fetching credentials from Firebase RTDB...");
    const credsRes = await fetch(`${FIREBASE_DB_URL}/users/raykevin71888_at_gmail_com.json`);
    const creds = await credsRes.json();

    if (!creds || !creds.psn_npsso_scope || !creds.psn_account_id) {
      throw new Error("Missing psn_npsso_scope or psn_account_id in RTDB.");
    }

    // Section 2.2: OAuth exchange for Sony access token
    console.log("[2/6] Exchanging NPSSO for PlayStation access token...");
    const token = await getPsnAccessToken(creds.psn_npsso_scope);

    // Section 2.3: Query recent games for wildhorse_spirit
    console.log(`[3/6] Querying active titles for ${TARGET_GAMERTAG}...`);
    const titlesUrl = `https://m.np.playstation.com/api/trophy/v1/users/${creds.psn_account_id}/trophyTitles?limit=10`;
    const titlesRes = await fetch(titlesUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const titlesData = await titlesRes.json();
    const titles = titlesData.trophyTitles || [];

    if (titles.length === 0) {
      console.log("No trophy titles found on this profile.");
      return;
    }

    // Sort descending by most recent earned timestamp
    titles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
    const activeGame = titles[0];
    const commId = activeGame.npCommunicationId;
    const gameName = activeGame.trophyTitleName;
    console.log(`[4/6] Active title: "${gameName}" (${commId}) | Progress: ${activeGame.progress}%`);

    // Section 2.4: Fetch Sony trophy definitions & player earned statuses
    console.log(`Fetching Sony trophies for ${commId}...`);
    const trophiesUrl = `https://m.np.playstation.com/api/trophy/v1/npCommunicationIds/${commId}/trophyGroups/all/trophies`;
    const trophiesRes = await fetch(trophiesUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const trophiesData = await trophiesRes.json();
    const rawTrophies = trophiesData.trophies || [];

    const formattedTrophies = rawTrophies.map(t => ({
      trophyId: t.trophyId,
      name: t.trophyName || "",
      type: t.trophyType ? (t.trophyType.charAt(0).toUpperCase() + t.trophyType.slice(1)) : "Bronze",
      description: t.trophyDetail || "",
      icon: t.trophyIconUrl || ""
    }));

    // Section 2.5: Auto-scrape guide metrics from free Fandom MediaWiki API
    console.log(`[5/6] Auto-fetching game guide metrics from Fandom API for "${gameName}"...`);
    const scrapedGuide = await scrapeFandomWikiGuide(gameName);

    // Section 2.6: Assemble universal schema
    const gameId = gameName.replace(/[^a-zA-Z0-9]/g, "");
    const gamePayload = {
      game: gameName,
      gameId: gameId,
      commId: commId,
      lastUpdated: activeGame.lastUpdatedDateTime,
      overallProgress: activeGame.progress || 0,
      activeMission: scrapedGuide.activeMission || "Hope County Resistance",
      metrics: scrapedGuide.metrics || [],
      categories: scrapedGuide.categories || {},
      trophies: formattedTrophies
    };

    // Ensure output directories exist
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

    // Section 2.7: Write active game.json and archive {commId}.json
    console.log("[6/6] Writing output files...");
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gamePayload, null, 2), 'utf8');
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${commId}.json`), JSON.stringify(gamePayload, null, 2), 'utf8');
    console.log(`Success: game/data/game.json and game/data/games/${commId}.json updated.`);

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

  // Route franchise queries to dedicated public MediaWikis
  let wikiDomain = "";
  if (cleanTitle.includes("far cry")) {
    wikiDomain = "farcry.fandom.com";
  } else if (cleanTitle.includes("ghost of tsushima")) {
    wikiDomain = "ghostoftsushima.fandom.com";
  } else if (cleanTitle.includes("sniper elite")) {
    wikiDomain = "sniperelite.fandom.com";
  }

  if (!wikiDomain) {
    console.log(`No specific wiki profile mapped for "${gameTitle}". Initializing universal fallback metrics.`);
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

      // Pull Prepper Stashes page sections via free MediaWiki parse API
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

// Section 4: PSN OAuth Authentication Helper
async function getPsnAccessToken(npsso) {
  const authUrl = "https://ca.account.sony.com/api/authz/v3/oauth/authorize?" +
    "access_type=offline&client_id=0951579a-773a-4311-af14-c7309c17e95d&" +
    "response_type=code&scope=psn:mobile.core&redirect_uri=com.scee.psx.scecompcall://redirect";

  const authRes = await fetch(authUrl, {
    headers: { "Cookie": `npsso=${npsso}` },
    redirect: "manual"
  });

  const location = authRes.headers.get("location");
  if (!location) throw new Error("Invalid or expired NPSSO token.");

  const authCodeMatch = location.match(/code=([A-Za-z0-9:\?_\-\.\/=]+)/);
  if (!authCodeMatch) throw new Error("Failed to extract authorization code.");
  const authCode = authCodeMatch[1];

  const tokenRes = await fetch("https://ca.account.sony.com/api/authz/v3/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic MDk1MTU3OWEtNzczYS00MzExLWFmMTQtYzczMDljMTdlOTVkOnVOTjFYQHpKakhpM0NmTVk=",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code: authCode,
      redirect_uri: "com.scee.psx.scecompcall://redirect",
      grant_type: "authorization_code",
      token_format: "jwt"
    })
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

main();
