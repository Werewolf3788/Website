const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserTrophyProfileSummary,
  getPresenceFromUser,
  getUserTrophiesEarnedForTitle,
  makeUniversalSearch
} = require("psn-api");
const fs = require("fs");
const path = require("path");

// BLOCKLIST: GTA titles are filtered out to protect account integrity
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

async function getFullUserData(npsso, label) {
  try {
    console.log(`--- Starting Sync for ${label} ---`);
    
    // 1. Authenticate
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    
    // 2. Get basic profile and presence using the correct function names found in source
    const trophySummary = await getUserTrophyProfileSummary(authorization, "me");
    const presence = await getPresenceFromUser(authorization, "me");
    
    console.log(`[${label}] Level: ${trophySummary.trophyLevel} | Progress: ${trophySummary.progress}%`);

    const isOnline = presence.primaryPlatformInfo.onlineStatus === "online";
    const gameList = presence.gameTitleInfoList || [];
    const rawGameName = gameList[0]?.titleName || "";
    const currentGameArt = gameList[0]?.conceptIconUrl || "";
    
    // GTA Filter for current activity
    const isBlacklisted = BLACKLIST.some(f => rawGameName.toLowerCase().includes(f));
    const currentGameName = (!rawGameName || isBlacklisted) ? "Dashboard" : rawGameName;

    // 3. Get Games and Trophy Progress using the correct function name
    const { trophyTitles } = await getUserTitles(authorization, "me");
    const recentGames = [];
    let latestTrophyInfo = null;

    for (const title of trophyTitles) {
      // Skip blacklisted games in the "Recent Hunts" list
      if (BLACKLIST.some(f => title.trophyTitleName.toLowerCase().includes(f))) continue;

      if (recentGames.length < 5) {
        recentGames.push({
          name: title.trophyTitleName,
          progress: title.progress,
          art: title.trophyTitleIconUrl,
          platform: title.npCommunicationId
        });
      }

      // Get the latest trophy for the most recent valid game
      if (!latestTrophyInfo) {
        try {
          const { trophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
          // Sort by earned date to find the absolute newest one
          const earned = trophies.filter(t => t.earned).sort((a, b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime));
          
          if (earned.length > 0) {
            latestTrophyInfo = {
              name: earned[0].trophyName,
              game: title.trophyTitleName,
              rank: earned[0].trophyType.charAt(0).toUpperCase() + earned[0].trophyType.slice(1),
              icon: earned[0].trophyIconUrl
            };
          }
        } catch (e) { 
            // Silence minor errors for specific titles
        }
      }

      if (recentGames.length >= 5 && latestTrophyInfo) break;
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
      currentGameProgress: recentGames.find(g => g.name === currentGameName)?.progress || 0,
      gameArt: currentGameName !== "Dashboard" ? currentGameArt : "",
      recentGames: recentGames,
      lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    };
  } catch (error) {
    console.error(`[${label}] Error in script logic:`, error.message);
    return null;
  }
}

async function getFriendStatus(npsso, onlineId) {
  try {
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    
    const searchResults = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
    const accountId = searchResults.domainResponses[0].results[0].socialMetadata.accountId;
    
    const presence = await getPresenceFromUser(authorization, accountId);
    let game = presence.gameTitleInfoList?.[0]?.titleName || "";
    if (BLACKLIST.some(f => game.toLowerCase().includes(f))) game = "Classified";
    
    const status = presence.primaryPlatformInfo.onlineStatus;
    console.log(`[Friend] ${onlineId}: ${status}`);
    
    return {
      online: status === "online",
      currentGame: game
    };
  } catch (e) {
    return { online: false, currentGame: "" };
  }
}

async function main() {
  const werewolfToken = process.env.PSN_NPSSO_WEREWOLF;
  const rayToken = process.env.PSN_NPSSO_RAY;
  let finalData = { users: {} };

  const dataPath = path.join(__dirname, "psn_data.json");
  
  // Persistence: Load existing data first
  try {
    if (fs.existsSync(dataPath)) {
      finalData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    }
  } catch (e) {}

  if (werewolfToken) {
    const data = await getFullUserData(werewolfToken, "Werewolf");
    if (data) {
      finalData.users.werewolf = data;
      // Fetch Darkwing while we have Werewolf's session
      finalData.users.darkwing = await getFriendStatus(werewolfToken, "Darkwing69420");
    }
  }

  if (rayToken) {
    const data = await getFullUserData(rayToken, "Ray");
    if (data) finalData.users.ray = data;
  }

  fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
  console.log("--- Sync Successfully Completed ---");
}

main();
