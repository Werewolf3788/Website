const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserTrophyProfileSummary,
  getPresenceFromUser, // Standard function name for psn-api
  getUserTrophiesEarnedForTitle,
  getTitleTrophies,
  makeUniversalSearch
} = require("psn-api");
const fs = require("fs");
const path = require("path");

// BLOCKLIST: GTA titles are filtered out to protect account integrity
const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

async function getFullUserData(npsso, label) {
  try {
    console.log(`--- Starting Sync for ${label} ---`);
    
    // 1. Authenticate using NPSSO
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    
    // 2. Get basic profile and presence
    const trophySummary = await getUserTrophyProfileSummary(authorization, "me");
    
    let presence;
    try {
        presence = await getPresenceFromUser(authorization, "me");
    } catch (e) {
        console.log(`[${label}] Presence fetch failed, using offline defaults.`);
        presence = { primaryPlatformInfo: { onlineStatus: "offline" } };
    }
    
    console.log(`[${label}] Level: ${trophySummary.trophyLevel} | Progress: ${trophySummary.progress}%`);

    const isOnline = presence.primaryPlatformInfo?.onlineStatus === "online";
    const gameList = presence.gameTitleInfoList || [];
    const rawGameName = gameList[0]?.titleName || "";
    const currentGameArt = gameList[0]?.conceptIconUrl || "";
    
    // GTA Filter for current activity
    const isBlacklisted = BLACKLIST.some(f => rawGameName.toLowerCase().includes(f));
    const currentGameName = (!rawGameName || isBlacklisted) ? "Dashboard" : rawGameName;

    // 3. Get Games list
    const { trophyTitles } = await getUserTitles(authorization, "me");
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

      // Get metadata for the most recent valid trophy
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
        } catch (e) { /* Skip specific titles with errors */ }
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
    console.error(`[${label}] Fatal error in script:`, error.message);
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
  console.log("--- Sync Finished ---");
}

main();
