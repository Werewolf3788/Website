/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 15:35:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Master FS25 Live Ingestion Pipeline. Directly pulls active 
 *              savegame feeds from G-Portal over HTTP and writes exclusively 
 *              into the /fs25 Realtime Database node.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const admin = require('firebase-admin');

// SECTION 1: SAFETY FAILSAFE
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting cleanly after 3 minutes.");
  process.exit(0);
}, 3 * 60 * 1000);

// SECTION 2: FIREBASE ADMIN INITIALIZATION
const firebaseConfig = {
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com"
};

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ Failed parsing FIREBASE_SERVICE_ACCOUNT:", e.message);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require("./your-firebase-adminsdk-key.json");
  } catch (e) {
    console.error("❌ Missing FIREBASE_SERVICE_ACCOUNT secret.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: firebaseConfig.databaseURL
  });
}

const db = admin.database();

// SECTION 3: G-PORTAL DIRECT FEED CONFIGURATION
const serverHost = process.env.FTP_HOST || '207.244.246.70';
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const BASE_FEED_URL = `http://${serverHost}:9050/feed`;
const STATS_URL = `${BASE_FEED_URL}/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `${BASE_FEED_URL}/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

// SECTION 4: UNESCAPE & DECODE XML HELPER
function decodeLiveXmlPayload(rawText) {
  if (!rawText) return "";
  let clean = rawText.toString();

  // Strip UI resizer markup
  if (clean.includes(".vue-modal-resizer")) {
    clean = clean.split(".vue-modal-resizer")[0];
  }

  // Extract from HTML <pre> or <code> wrapper if present
  const preMatch = clean.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) clean = preMatch[1];
  const codeMatch = clean.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) clean = codeMatch[1];

  // Unescape standard HTML entities if the server returned an HTML-wrapped feed
  clean = clean
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  const xmlStart = clean.indexOf("<");
  if (xmlStart > 0) clean = clean.substring(xmlStart);

  return clean.trim();
}

async function fetchHttpSavegameFile(fileName) {
  const url = `${BASE_FEED_URL}/dedicated-server-savegame.html?code=${apiCode}&file=${fileName}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const clean = decodeLiveXmlPayload(text);
      if (clean && clean.includes("<") && !clean.includes("404 Not Found")) {
        console.log(`✅ Direct Feed synced: [ ${fileName} ] (${clean.length} bytes)`);
        return clean;
      }
    }
  } catch (err) {
    console.warn(`Notice on [ ${fileName} ]: ${err.message}`);
  }
  return "";
}

async function fetchStatsApi() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(STATS_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const clean = decodeLiveXmlPayload(text);
      if (clean.includes('<Server') || clean.includes('<Slots') || clean.includes('<slots')) {
        let players = 0;
        let activeSlot = null;
        let mapTitle = "";

        const slotsMatch = clean.match(/numUsed="(\d+)"/i) || clean.match(/slots\s+numUsed="(\d+)"/i);
        if (slotsMatch) {
          players = parseInt(slotsMatch[1], 10);
        } else {
          const playerMatches = clean.match(/<Player\b[^>]*>([\s\S]*?)<\/Player>/gi);
          if (playerMatches) players = playerMatches.length;
        }

        const slotMatch = clean.match(/savegame="(\d+)"/i) || clean.match(/slot="(\d+)"/i) || clean.match(/savegameSlot="(\d+)"/i) || clean.match(/SAVEGAME\s*(\d+)/i);
        if (slotMatch) activeSlot = slotMatch[1];

        const mapMatch = clean.match(/mapTitle="([^"]+)"/i) || clean.match(/mapName="([^"]+)"/i);
        if (mapMatch) mapTitle = mapMatch[1];

        return { text: clean, players, activeSlot, mapTitle };
      }
    }
  } catch (err) {
    console.warn(`Stats feed notice: ${err.message}`);
  }
  return { text: "", players: 0, activeSlot: null, mapTitle: "" };
}

// SECTION 5: MASTER PIPELINE EXECUTION (STRICT /fs25 TARGET)
async function runPipeline() {
  console.log(`📡 Connecting to live G-Portal feeds on [ ${serverHost}:9050 ]...`);
  
  const statsData = await fetchStatsApi();
  const activeSlotNumber = statsData.activeSlot || "3";
  console.log(`🎯 Active Savegame Detected: Slot #${activeSlotNumber} | Connected Players: ${statsData.players}`);

  const savegameFiles = [
    'careerSavegame',
    'farms',
    'farmland',
    'farmlands',
    'vehicles',
    'placeables',
    'fields',
    'missions',
    'environment',
    'economy',
    'items',
    'collectibles',
    'handTools',
    'precisionFarming'
  ];

  const masterPayload = {
    activePlayers: statsData.players,
    activeSaveSlot: String(activeSlotNumber),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" }
  };

  if (statsData.text) {
    masterPayload.stats_xml_raw = statsData.text;
    masterPayload.stats_raw = statsData.text;
  }

  // Fetch every live XML file from G-Portal's direct feed
  for (const fileName of savegameFiles) {
    const rawContent = await fetchHttpSavegameFile(fileName);
    if (rawContent) {
      masterPayload[`${fileName}_raw`] = rawContent;
      masterPayload[fileName] = rawContent;
    }
  }

  // Atomic write strictly inside /fs25 node
  await db.ref('fs25').set(masterPayload);

  // Clean up any stray root-level keys that previously spilled over
  const strayKeys = [
    'activePlayers', 'activeSaveSlot', 'config', 'dedicatedServerConfig_raw',
    'lastUpdated', 'modCatalogCrossplay', 'stats_raw', 'stats_xml_raw',
    'careerSavegame_raw', 'careerSavegame', 'farms_raw', 'farms',
    'vehicles_raw', 'vehicles', 'placeables_raw', 'placeables',
    'items_raw', 'items', 'environment_raw', 'environment',
    'fields_raw', 'fields', 'farmland_raw', 'farmland', 'farmlands_raw',
    'missions_raw', 'missions', 'handTools_raw', 'handTools', 'collectibles_raw'
  ];
  const cleanupMap = {};
  strayKeys.forEach(k => cleanupMap[k] = null);
  await db.ref().update(cleanupMap);

  console.log(`🏆 Everything for FS25 successfully updated strictly inside /fs25!`);
  process.exit(0);
}

runPipeline();
