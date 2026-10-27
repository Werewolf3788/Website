// scripts/sync_active_game.js
// Section 1: Modules & Endpoints
const fs = require('fs');
const path = require('path');

const FIREBASE_DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const TARGET_GAMERTAG = "wildhorse_spirit";
const OUTPUT_FILE = path.join(__dirname, '../game/data/game.json');

// Section 2: Main Sync Logic
async function syncLatestGame() {
  try {
    console.log("[1/5] Fetching credentials from Firebase RTDB...");
    const credsRes = await fetch(`${FIREBASE_DB_URL}/users/raykevin71888_at_gmail_com.json`);
    const creds = await credsRes.json();

    if (!creds || !creds.psn_npsso_scope || !creds.psn_account_id) {
      throw new Error("Missing psn_npsso_scope or psn_account_id in RTDB.");
    }

    console.log("[2/5] Exchanging NPSSO for Bearer Token...");
    const token = await getPsnAccessToken(creds.psn_npsso_scope);

    console.log(`[3/5] Checking recent titles for ${TARGET_GAMERTAG}...`);
    const titlesUrl = `https://m.np.playstation.com/api/trophy/v1/users/${creds.psn_account_id}/trophyTitles?limit=10`;
    const titlesRes = await fetch(titlesUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const titlesData = await titlesRes.json();
    const titles = titlesData.trophyTitles || [];

    if (titles.length === 0) {
      console.log("No trophy titles returned from PSN.");
      return;
    }

    // Sort strictly by latest earned date descending
    titles.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));
    const latest = titles[0];
    const commId = latest.npCommunicationId;

    console.log(`[4/5] Most recent game: ${latest.trophyTitleName} (${commId}) | Progress: ${latest.progress}%`);

    // Gate Check: If current game.json is already identical, exit clean
    let existingData = null;
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      } catch (e) {
        console.warn("Existing game.json could not be parsed; overwriting.");
      }
    }

    if (
      existingData &&
      existingData.psn_communication_id === commId &&
      existingData.progress === latest.progress &&
      existingData.lastUpdatedDateTime === latest.lastUpdatedDateTime
    ) {
      console.log("No new trophies or title change detected. Skipping write.");
      process.exit(0);
    }

    // Fetch official trophies for the active title
    console.log(`Fetching live trophy definitions for ${commId}...`);
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

    // Build the clean game.json structure
    // If switching games, preserves empty containers for custom pills if not Far Cry 5
    const isSameGame = existingData && existingData.psn_communication_id === commId;
    
    const gamePayload = {
      game: latest.trophyTitleName,
      gameId: latest.trophyTitleName.replace(/[^a-zA-Z0-9]/g, ""),
      psn_communication_id: commId,
      activeMission: isSameGame && existingData.activeMission ? existingData.activeMission : "In Progress",
      progress: latest.progress,
      earnedTrophies: latest.earnedTrophies,
      lastUpdatedDateTime: latest.lastUpdatedDateTime,
      collectibles: isSameGame && existingData.collectibles ? existingData.collectibles : {},
      prepper_stashes: isSameGame && existingData.prepper_stashes ? existingData.prepper_stashes : {},
      regions_and_story_structure: isSameGame && existingData.regions_and_story_structure ? existingData.regions_and_story_structure : {},
      walkthrough_missions: isSameGame && existingData.walkthrough_missions ? existingData.walkthrough_missions : [],
      weapons: isSameGame && existingData.weapons ? existingData.weapons : {},
      guns_and_fangs_for_hire: isSameGame && existingData.guns_and_fangs_for_hire ? existingData.guns_and_fangs_for_hire : [],
      survivalist_magazines: isSameGame && existingData.survivalist_magazines ? existingData.survivalist_magazines : {},
      perks_system: isSameGame && existingData.perks_system ? existingData.perks_system : {},
      challenges: isSameGame && existingData.challenges ? existingData.challenges : {},
      easter_eggs_and_secrets: isSameGame && existingData.easter_eggs_and_secrets ? existingData.easter_eggs_and_secrets : [],
      trophies_and_achievements: formattedTrophies
    };

    console.log("[5/5] Writing to game/data/game.json...");
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gamePayload, null, 2), 'utf8');
    console.log(`Success: game/data/game.json updated for ${latest.trophyTitleName}`);

  } catch (err) {
    console.error("Sync failed:", err.message);
    process.exit(1);
  }
}

// Section 3: PSN OAuth Token Exchange
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

syncLatestGame();
