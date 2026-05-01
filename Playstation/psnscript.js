const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitlesForUser,
  getUserTrophySummaryForUser,
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
    
    // 2. Get basic profile and presence
    const trophySummary = await getUserTrophySummaryForUser(authorization, "me");
    const presence = await getPresenceFromUser(authorization, "me");
    
    const isOnline = presence.primaryPlatformInfo.onlineStatus === "online";
    const gameList = presence.gameTitleInfoList || [];
    const rawGameName = gameList[0]?.titleName || "";
    const currentGameArt = gameList[0]?.conceptIconUrl || "";
    
    // GTA Filter
    const isBlacklisted = BLACKLIST.some(f => rawGameName.toLowerCase().includes(f));
    const currentGameName = (!rawGameName || isBlacklisted) ? "Dashboard" : rawGameName;

    // 3. Get Games and Trophy Progress
    const { trophyTitles } = await getUserTitlesForUser(authorization, "me");
    const recentGames = [];
    let latestTrophyInfo = null;

    for (const title of trophyTitles) {
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
          const earned = trophies.filter(t => t.earned).sort((a, b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime));
          
          if (earned.length > 0) {
            latestTrophyInfo = {
              name: earned[0].trophyName,
              game: title.trophyTitleName,
              rank: earned[0].trophyType.charAt(0).toUpperCase() + earned[0].trophyType.slice(1),
              icon: earned[0].trophyIconUrl
            };
          }
        } catch (e) { console.log(`Trophy skip for ${title.trophyTitleName}`); }
      }

      if (recentGames.length >= 5 && latestTrophyInfo) break;
    }

    console.log(`Success: Found Level ${trophySummary.trophyLevel} for ${label}`);

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
      lastUpdated: new Date().toLocaleString()
    };
  } catch (error) {
    console.error(`Fatal error syncing ${label}:`, error.message);
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
    console.log(`Friend ${onlineId}: ${status}`);
    
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
  try {
    if (fs.existsSync(dataPath)) {
      finalData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    }
  } catch (e) {}

  if (werewolfToken) {
    const data = await getFullUserData(werewolfToken, "Werewolf");
    if (data) {
      finalData.users.werewolf = data;
      finalData.users.darkwing = await getFriendStatus(werewolfToken, "Darkwing69420");
    }
  }

  if (rayToken) {
    const data = await getFullUserData(rayToken, "Ray");
    if (data) finalData.users.ray = data;
  }

  fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
  console.log("Sync finished.");
}

main();
