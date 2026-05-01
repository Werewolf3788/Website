const psnApi = require("psn-api");
const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserTrophyProfileSummary,
  getPresenceOfUser,
  getPresenceFromUser,
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

async function getFullUserData(npsso, label) {
  try {
    console.log(`--- Starting Sync for ${label} ---`);
    
    // 1. Authenticate
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    
    // 2. Get Trophy Summary (Levels/Counts)
    const trophySummary = await getUserTrophyProfileSummary(authorization, "me");
    console.log(`[${label}] Level: ${trophySummary.trophyLevel} (${trophySummary.progress}%)`);

    // 3. Detect "Active Hunt" (Current Game)
    let isOnline = false;
    let currentGameName = "Dashboard";
    let currentGameArt = "";
    
    // Try Presence first (for Online status)
    const presenceFunc = findPresenceFunc();
    if (presenceFunc) {
        try {
            const presence = await presenceFunc(authorization, "me");
            isOnline = presence.primaryPlatformInfo?.onlineStatus === "online";
        } catch (e) {
            console.log(`[${label}] Online status fetch skipped (Privacy or API restriction).`);
        }
    }

    // Use Recently Played Games to identify the active game
    try {
        const recentlyPlayed = await getRecentlyPlayedGames(authorization, { limit: 1 });
        const lastGame = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games?.[0];
        
        if (lastGame) {
            const isBlacklisted = BLACKLIST.some(f => lastGame.name.toLowerCase().includes(f));
            if (!isBlacklisted) {
                currentGameName = lastGame.name;
                currentGameArt = lastGame.image?.url || "";
                console.log(`[${label}] Active Game Detected: ${currentGameName}`);
            }
        }
    } catch (e) {
        console.log(`[${label}] Recently Played fetch failed: ${e.message}`);
    }

    // 4. Get Titles list (Recent Games for the grid and progress matching)
    const { trophyTitles } = await getUserTitles(authorization, "me");
    const recentGames = [];
    let latestTrophyInfo = null;
    let detectedGameProgress = 0;

    for (const title of trophyTitles) {
      if (BLACKLIST.some(f => title.trophyTitleName.toLowerCase().includes(f))) continue;

      // If this title matches our "Current Game", save the progress percentage
      if (title.trophyTitleName === currentGameName) {
        detectedGameProgress = title.progress;
      }

      if (recentGames.length < 5) {
        recentGames.push({
          name: title.trophyTitleName,
          progress: title.progress,
          art: title.trophyTitleIconUrl,
          platform: title.npCommunicationId
        });
      }

      // Fetch metadata for the single newest trophy
      if (!latestTrophyInfo) {
        try {
          const { trophies: earnedTrophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
          const { trophies: trophyMetadata } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
          
          const newestEarned = earnedTrophies
            .filter(t => t.earned)
            .sort((a, b) => {
                const dateA = a.earnedDateTime ? new Date(a.earnedDateTime).getTime() : 0;
                const dateB = b.earnedDateTime ? new Date(b.earnedDateTime).getTime() : 0;
                return dateB - dateA;
            })[0];

          if (newestEarned) {
            const meta = trophyMetadata.find(m => m.trophyId === newestEarned.trophyId);
            latestTrophyInfo = {
              name: meta.trophyName,
              game: title.trophyTitleName,
              rank: meta.trophyType.charAt(0).toUpperCase() + meta.trophyType.slice(1),
              icon: meta.trophyIconUrl
            };
          }
        } catch (e) { /* Skip titles with errors */ }
      }
    }

    // If RecentlyPlayed failed, use the first item in recentGames as the Active Hunt
    if (currentGameName === "Dashboard" && recentGames.length > 0) {
        currentGameName = recentGames[0].name;
        currentGameArt = recentGames[0].art;
        detectedGameProgress = recentGames[0].progress;
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
      gameArt: currentGameArt,
      recentGames: recentGames,
      lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    };
  } catch (error) {
    console.error(`[${label}] Fatal Error:`, error.message);
    return null;
  }
}

async function getFriendStatus(npsso, onlineId) {
  try {
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);
    const searchResults = await makeUniversalSearch(authorization, onlineId, "socialAccounts");
    
    if (!searchResults.domainResponses[0]?.results?.length) {
        console.log(`[Friend] Could not find user: ${onlineId}`);
        return { online: false, currentGame: "" };
    }

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
  } catch (e) {
    console.error(`[Friend] Error fetching ${onlineId}: ${e.message}`);
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
        
        // Sync Lobby Friends using Werewolf's session
        console.log("--- Syncing Lobby Friends ---");
        finalData.users.darkwing = await getFriendStatus(werewolfToken, "Darkwing69420");
        finalData.users.phoenix = await getFriendStatus(werewolfToken, "phoenix_darkfire");
        finalData.users.elucidator = await getFriendStatus(werewolfToken, "ElucidatorVah");
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
