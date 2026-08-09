/* ==========================================================================
   File: Code.gs (Google Apps Script)
   Deployment Timestamp: Sun, Aug 09, 2026, 20:10:00 (EDT - New York)
   Project: FS25 Hybrid Realtime Telemetry Sync Engine
   Description: Expanded G-Portal feed fetcher. Ingests careerSavegame,
                vehicles, economy, placeables, items, and handTools
                to populate all 12 dashboard cards in real time.
   ========================================================================== */

const GPORTAL_FEEDS = {
  STATS_XML: "http://144.126.153.115:8300/feed/dedicated-server-stats.xml?code=3FvqSlOsYKckfauM",
  MAP_IMAGE: "http://144.126.153.115:8300/feed/dedicated-server-stats-map.jpg?code=3FvqSlOsYKckfauM&quality=60&size=512",
  SAVEGAME_CAREER: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=careerSavegame",
  SAVEGAME_VEHICLES: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=vehicles",
  SAVEGAME_ECONOMY: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=economy",
  SAVEGAME_PLACEABLES: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=placeables",
  SAVEGAME_ITEMS: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=items",
  SAVEGAME_HANDTOOLS: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=handTools",
  SAVEGAME_MISSIONS: "http://144.126.153.115:8300/feed/dedicated-server-savegame.html?code=3FvqSlOsYKckfauM&file=missions"
};

const FIREBASE_DB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/fs25.json";

function checkAndSyncAllGPortalFeeds() {
  const timestamp = getNewYorkTimestamp();
  Logger.log(`[${timestamp}] Initiating Full G-Portal Feed Processing...`);

  try {
    // Fetch all fast HTML savegame files
    const fastCareerRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_CAREER);
    const fastVehiclesRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_VEHICLES);
    const fastEconomyRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_ECONOMY);
    const fastPlaceablesRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_PLACEABLES);
    const fastItemsRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_ITEMS);
    const fastHandToolsRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_HANDTOOLS);
    const fastMissionsRaw = fetchUrlContent(GPORTAL_FEEDS.SAVEGAME_MISSIONS);
    const statsXmlRaw = fetchUrlContent(GPORTAL_FEEDS.STATS_XML);

    const payload = {
      careerSavegame_raw: extractXmlFromHtmlWrapper(fastCareerRaw),
      vehicles_raw: extractXmlFromHtmlWrapper(fastVehiclesRaw),
      farms_raw: extractXmlFromHtmlWrapper(fastEconomyRaw),
      placeables_raw: extractXmlFromHtmlWrapper(fastPlaceablesRaw),
      items_raw: extractXmlFromHtmlWrapper(fastItemsRaw),
      handTools_raw: extractXmlFromHtmlWrapper(fastHandToolsRaw),
      missions_raw: extractXmlFromHtmlWrapper(fastMissionsRaw) || extractXmlFromHtmlWrapper(fastEconomyRaw),
      stats_xml_raw: statsXmlRaw,
      map_image_url: GPORTAL_FEEDS.MAP_IMAGE,
      lastSystemUpdate: timestamp,
      syncStatus: "SUCCESS",
      activeSaveSlot: "1"
    };

    const options = {
      method: "patch",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(FIREBASE_DB_URL, options);
    if (response.getResponseCode() === 200) {
      Logger.log(`[${timestamp}] ✅ Successfully synced complete telemetry payload to Firebase.`);
    } else {
      Logger.log(`[${timestamp}] ⚠️ Firebase HTTP error code: ${response.getResponseCode()}`);
    }

  } catch (error) {
    Logger.log(`[${timestamp}] ❌ Critical Sync Failure: ${error.message}`);
  }
}

function fetchUrlContent(url) {
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    return response.getResponseCode() === 200 ? response.getContentText() : "";
  } catch (e) {
    return "";
  }
}

function extractXmlFromHtmlWrapper(htmlText) {
  if (!htmlText) return "";
  const trimmed = htmlText.trim();
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<careerSavegame") || trimmed.startsWith("<vehicles") || trimmed.startsWith("<farms") || trimmed.startsWith("<placeables") || trimmed.startsWith("<missions")) {
    return trimmed;
  }
  const preMatch = htmlText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) return preMatch[1].trim();
  const codeMatch = htmlText.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) return codeMatch[1].trim();
  return htmlText;
}

function getNewYorkTimestamp() {
  return Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
}
