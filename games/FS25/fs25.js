/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 15:55:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Master FS25 Web Stats REST API Ingestion Pipeline. Fetches live
 *              active server memory and savegame files directly from G-Portal
 *              REST endpoints and writes strictly into the /fs25 node.
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

// SECTION 3: G-PORTAL REST ENDPOINT DEFINITIONS
const serverHost = process.env.FTP_HOST || '207.244.246.70';
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const BASE_FEED_URL = `http://${serverHost}:9050/feed`;
const STATS_URL = `${BASE_FEED_URL}/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `${BASE_FEED_URL}/dedicated-server-stats-map.jpg?code=${apiCode}&quality=60&size=512`;

// SECTION 4: ROBUST XML DECODER & UNESCAPER
function decodeGiantsHtmlXml(rawInput) {
  if (!rawInput) return "";
  let text = rawInput.toString();

  // Strip UI resizer markers if present
  if (text.includes(".vue-modal-resizer")) {
    text = text.split(".vue-modal-resizer")[0];
  }

  // Extract from HTML <pre> or <code> or <textarea> wrappers
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) text = preMatch[1];
  const codeMatch = text.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) text = codeMatch[1];
  const textMatch = text.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
  if (textMatch && textMatch[1]) text = textMatch[1];

  // Decode standard HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"');

  // Strip anything preceding the opening XML tag
  const xmlStart = text.indexOf("<");
  if (xmlStart > 0) text = text.substring(xmlStart);

  return text.trim();
}

async function fetchGPortalSavegameFile(fileName) {
  const url = `${BASE_FEED_URL}/dedicated-server-savegame.html?code=${apiCode}&file=${fileName}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const cleanXml = decodeGiantsHtmlXml(text);
      if (cleanXml && cleanXml.includes("<") && !cleanXml.includes("404 Not Found") && cleanXml.length > 20) {
        console.log(`✅ [REST API] Fetched [ ${fileName} ] (${cleanXml.length} bytes)`);
        return cleanXml;
      }
    }
  } catch (err) {
    console.warn(`Notice on [ ${fileName} ]: ${err.message}`);
  }
  return "";
}

async function fetchLiveStats() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(STATS_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const cleanXml = decodeGiantsHtmlXml(text);
      if (cleanXml.includes('<Server') || cleanXml.includes('<Slots') || cleanXml.includes('<slots')) {
        let players = 0;
        let activeSlot = null;
        let mapTitle = "";

        const slotsMatch = cleanXml.match(/numUsed="(\d+)"/i) || cleanXml.match(/slots\s+numUsed="(\d+)"/i);
        if (slotsMatch) {
          players = parseInt(slotsMatch[1], 10);
        } else {
          const playerMatches = cleanXml.match(/<Player\b[^>]*>([\s\S]*?)<\/Player>/gi);
          if (playerMatches) players = playerMatches.length;
        }

        const slotMatch = cleanXml.match(/savegame="(\d+)"/i) || cleanXml.match(/slot="(\d+)"/i) || cleanXml.match(/savegameSlot="(\d+)"/i);
        if (slotMatch) activeSlot = slotMatch[1];

        const mapMatch = cleanXml.match(/mapTitle="([^"]+)"/i) || cleanXml.match(/mapName="([^"]+)"/i);
        if (mapMatch) mapTitle = mapMatch[1];

        console.log(`✅ [Stats XML] Active Players: ${players} | Active Slot: #${activeSlot || 'Live'} | Map: ${mapTitle}`);
        return { text: cleanXml, players, activeSlot, mapTitle };
      }
    }
  } catch (err) {
    console.warn(`Stats feed notice: ${err.message}`);
  }
  return { text: "", players: 0, activeSlot: null, mapTitle: "" };
}

// SECTION 5: MASTER PIPELINE (STRICT /fs25 TARGET)
async function runPipeline() {
  console.log(`📡 Querying G-Portal REST API for server ${serverHost}...`);

  const statsData = await fetchLiveStats();

  // Complete list of savegame files exposed by the G-Portal Web API
  const savegameFiles = [
    'careerSavegame',
    'farms',
    'vehicles',
    'economy',
    'placeables',
    'fields',
    'farmland',
    'farmlands',
    'missions',
    'environment',
    'items',
    'collectibles',
    'handTools',
    'precisionFarming'
  ];

  const masterPayload = {
    activePlayers: statsData.players,
    activeSaveSlot: String(statsData.activeSlot || "3"),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" }
  };

  if (statsData.text) {
    masterPayload.stats_xml_raw = statsData.text;
    masterPayload.stats_raw = statsData.text;
  }

  // Fetch each savegame file from the REST API
  for (const file of savegameFiles) {
    const rawXml = await fetchGPortalSavegameFile(file);
    if (rawXml) {
      masterPayload[`${file}_raw`] = rawXml;
      masterPayload[file] = rawXml;
    }
  }

  // Write strictly to /fs25 node
  await db.ref('fs25').set(masterPayload);

  // Clean up any stray root-level keys from previous dual-write runs
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

  console.log(`🏆 All G-Portal REST API data synchronized strictly into /fs25!`);
  process.exit(0);
}

runPipeline();
