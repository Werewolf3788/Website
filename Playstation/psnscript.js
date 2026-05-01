const psnApi = require("psn-api");
const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserTrophyProfileSummary,
  getUserTrophiesEarnedForTitle,
  getTitleTrophies,
  makeUniversalSearch,
  getRecentlyPlayedGames
} = psnApi;

const fs = require("fs");
const path = require("path");

// BLOCKLIST: GTA titles are filtered out to protect account integrity
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

// Helper to find the correct presence function regardless of naming shifts in the library
const findPresenceFunc = () => {
  return psnApi.getPresenceFromUser || psnApi.getPresenceOfUser || psnApi.getUserPresence || null;
};

/**
 * Normalizes title strings for better matching between Presence and Trophy lists.
 */
const normalizeTitle = (str) => {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : "";
};

/**
 * Formats ISO 8601 duration (PT1H30M) to readable string (1h 30m)
 */
const formatDuration = (durationStr) => {
  if (!durationStr) return "--";
  const h = durationStr.match(/(\d+)H/);
  const m = durationStr.match(/(\d+)M/);
  const hours = h ? h[1] + "h" : "";
  const mins = m ? m[1] + "m" : "";
  return `${hours} ${mins}`.trim() || "0h";
};

async function getFullUserData(npsso, label) {
  try {
    console.log(`--- Starting Sync for ${label} ---`);
    
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    
    const trophySummary = await getUserTrophyProfileSummary(authorization, "me");
    console.log(`[${label}] Level: ${trophySummary.trophyLevel} (${trophySummary.progress}%)`);

    let isOnline = false;
    let currentGameName = "Dashboard";
    let currentGameArt = "";
    let currentGamePlaytime = "--";
    
    const presenceFunc = findPresenceFunc();
    if (presenceFunc) {
      try {
        const presence = await presenceFunc(authorization, "me");
        isOnline = presence.primaryPlatformInfo?.onlineStatus === "online";
      } catch (e) { }
    }

    // Detect active game (Squirrel with a Gun / Farming Simulator 25)
    try {
      const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 1 });
      const lastGame = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games?.[0];
      
      if (lastGame && !BLACKLIST.some(f => lastGame.name.toLowerCase().includes(f))) {
        currentGameName = lastGame.name;
        currentGameArt = lastGame.image?.url || "";
        currentGamePlaytime = formatDuration(lastGame.playDuration);
        console.log(`[${label}] Active Game Detected: ${currentGameName} (${currentGamePlaytime})`);
      }
    } catch (e) { }

    const { trophyTitles } = await getUserTitles(authorization, "me");
    const recentGames = [];
    let latestTrophyInfo = null;
    let detectedGameProgress = 0;

    const normalizedCurrent = normalizeTitle(currentGameName);

    for (const title of trophyTitles) {
      if (BLACKLIST.some(f => title.trophyTitleName.toLowerCase().includes(f))) continue;

      if (normalizeTitle(title.trophyTitleName) === normalizedCurrent) {
        detectedGameProgress = title.progress;
      }

      if (recentGames.length < 5) {
        recentGames.push({
          name: title.trophyTitleName,
          progress: title.progress,
          art: title.trophyTitleIconUrl
        });
      }

      if (!latestTrophyInfo) {
        try {
          const { trophies: earnedTrophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
          const { trophies: trophyMetadata } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
          
          const newestEarned = earnedTrophies
            .filter(t => t.earned)
            .sort((a, b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime))[0];

          if (newestEarned) {
            const meta = trophyMetadata.find(m => m.trophyId === newestEarned.trophyId);
            latestTrophyInfo = {
              name: meta.trophyName,
              game: title.trophyTitleName,
              rank: meta.trophyType.charAt(0).toUpperCase() + meta.trophyType.slice(1),
              icon: meta.trophyIconUrl
            };
          }
        } catch (e) { }
      }
    }

    return {
      level: trophySummary.trophyLevel,
      progress: trophySummary.progress,
      trophies: {
        platinum: trophySummary.earnedTrophies.platinum,
        gold: trophySummary.earnedTrophies.gold,
        silver: trophySummary.earnedTrophies.silver,
        bronze: trophySummary.earnedTrophies.bronze,
        total: (trophySummary.earnedTrophies.platinum + trophySummary.earnedTrophies.gold + trophySummary.earnedTrophies.silver + trophySummary.earnedTrophies.bronze)
      },
      recentTrophy: latestTrophyInfo,
      online: isOnline,
      currentGame: currentGameName,
      currentGameProgress: detectedGameProgress,
      currentGamePlaytime: currentGamePlaytime,
      gameArt: currentGameArt,
      recentGames: recentGames,
      lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    };
  } catch (error) {
    console.error(`[${label}] Error:`, error.message);
    return null;
  }
}

async function getFriendStatus(npsso, onlineId) {
  try {
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    const searchResults = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
    if (!searchResults.domainResponses[0]?.results?.length) return { online: false, currentGame: "" };
    
    const accountId = searchResults.domainResponses[0].results[0].socialMetadata.accountId;
    let game = "";
    let status = "offline";
    
    const presenceFunc = findPresenceFunc();
    if (presenceFunc) {
      try {
        const presence = await presenceFunc(authorization, accountId);
        game = presence.gameTitleInfoList?.[0]?.titleName || "";
        status = presence.primaryPlatformInfo.onlineStatus;
      } catch (e) { }
    }
    
    if (game && BLACKLIST.some(f => game.toLowerCase().includes(f))) game = "Classified";
    return { online: status === "online", currentGame: game };
  } catch (e) { return { online: false, currentGame: "" }; }
}

async function main() {
  const werewolfToken = process.env.PSN_NPSSO_WEREWOLF;
  const rayToken = process.env.PSN_NPSSO_RAY;
  let finalData = { users: {} };
  const dataPath = path.join(__dirname, "psn_data.json");
  
  if (werewolfToken) {
    const data = await getFullUserData(werewolfToken, "Werewolf");
    if (data) {
      finalData.users.werewolf = data;
      console.log("--- Syncing Lobby Friends ---");
      finalData.users.darkwing = await getFriendStatus(werewolfToken, "Darkwing69420");
      finalData.users.phoenix = await getFriendStatus(werewolfToken, "phoenix_darkfire");
      finalData.users.elucidator = await getFriendStatus(werewolfToken, "ElucidatorVah");
      finalData.users.terrdog = await getFriendStatus(werewolfToken, "TerrDog420");
    }
  }

  if (rayToken) {
    const data = await getFullUserData(rayToken, "Ray");
    if (data) finalData.users.ray = data;
  }

  fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
  console.log("--- Sync Finished ---");
}

main();
