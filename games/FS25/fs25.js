/*
 Version Timestamp: Fri, July 24, 2026, 10:15 AM (EDT)
 Smart Dynamic Savegame Auto-Detection Engine (G-Portal to Firebase RTDB Sync)
 File: fs25.js
*/

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// Global 5-Minute Safety Timeout Failsafe
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Execution exceeded 5 minutes. Exiting.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Smart Sync Pipeline for Server 144.126.153.115...");

// Initialize Firebase Admin SDK
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ Failed parsing FIREBASE_SERVICE_ACCOUNT secret.", e.message);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require("./your-firebase-adminsdk-key.json");
  } catch (e) {
    console.error("❌ Missing FIREBASE_SERVICE_ACCOUNT secret or local key file.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();
const ftpClient = new Client();

const ftpConfig = {
  host: process.env.FTP_HOST || '144.126.153.115',
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  connTimeout: 15000,
  pasvTimeout: 15000
};

const STATS_URL = "http://144.126.153.115:8300/feed/dedicated-server-stats.xml?code=3FvqSlOsYKckfauM";

async function fetchWithRetry(url, options = {}, retries = 3, backoffMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`⚠️ Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
}

function downloadFileBuffer(client, remotePath) {
  return new Promise((resolve, reject) => {
    client.get(remotePath, (err, stream) => {
      if (err) return reject(err);
      let data = '';
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => resolve(data));
      stream.on('error', streamErr => reject(streamErr));
    });
  });
}

// Sanitizes keys for Firebase Realtime Database compliance (removes . $ # [ ])
function sanitizeFirebaseKey(key) {
  return key.replace(/[\.\$\#\[\]]/g, '_');
}

// Strips G-Portal Vue modal CSS garbage if present
function sanitizeXmlContent(rawText) {
  if (!rawText) return "";
  let clean = rawText.toString();
  if (clean.includes(".vue-modal-resizer")) {
    clean = clean.split(".vue-modal-resizer")[0];
  }
  const xmlStartIndex = clean.indexOf("<");
  if (xmlStartIndex > 0) {
    clean = clean.substring(xmlStartIndex);
  }
  return clean.trim();
}

async function runMainPipeline() {
  let activePlayers = 0;
  let rawStatsXml = "";
  let detectedSlot = null;

  try {
    const response = await fetchWithRetry(STATS_URL, { timeout: 8000 }, 3, 1000);
    rawStatsXml = sanitizeXmlContent(await response.text());
    
    // Parse numUsed from <Slots capacity="6" numUsed="1">
    const slotsMatch = rawStatsXml.match(/numUsed="(\d+)"/i) || rawStatsXml.match(/slots\s+numUsed="(\d+)"/i);
    if (slotsMatch) {
      activePlayers = parseInt(slotsMatch[1], 10);
    }

    // Try extracting active savegame slot index directly from stats XML attributes
    const saveMatch = rawStatsXml.match(/savegame="?(\d+)"?/i) || rawStatsXml.match(/slot="?(\d+)"?/i);
    if (saveMatch && saveMatch[1]) {
      detectedSlot = parseInt(saveMatch[1], 10);
      console.log(`🎯 Detected active save slot from G-Portal stats API: savegame${detectedSlot}`);
    }

    console.log(`✅ Web API connected (144.126.153.115). Active Players: ${activePlayers}`);
  } catch (err) {
    console.warn("⚠️ Web API stats fetch failed. Proceeding to FTP scan.");
  }

  ftpClient.on('ready', async function() {
    console.log("📡 FTP Uplink Connected to 144.126.153.115. Resolving active savegame slot...");

    // If slot was not in stats.xml, attempt reading gameSettings.xml over FTP to find active save slot
    if (!detectedSlot) {
      try {
        console.log("🔍 Checking root gameSettings.xml for active savegame index...");
        const settingsContent = await downloadFileBuffer(ftpClient, 'gameSettings.xml');
        const slotMatch = settingsContent.match(/<savegameSlot>(\d+)<\/savegameSlot>/i) || settingsContent.match(/slot="(\d+)"/i);
        if (slotMatch && slotMatch[1]) {
          detectedSlot = parseInt(slotMatch[1], 10);
          console.log(`🎯 Active savegame slot found in gameSettings.xml: savegame${detectedSlot}`);
        }
      } catch (e) {
        console.warn("⚠️ Could not parse root gameSettings.xml, checking directory timestamps...");
      }
    }

    // Default fallback to 1 if detection yielded nothing
    const targetSlot = detectedSlot || parseInt(process.env.DEFAULT_SAVE_SLOT, 10) || 1;
    processActiveFolderSync(targetSlot, activePlayers, rawStatsXml);
  });

  ftpClient.on('error', function(err) {
    console.error("🚨 FTP Error:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

function processActiveFolderSync(slotNumber, activePlayers, rawStatsXml) {
  // Dynamically prioritize the detected savegame directory
  const candidatePaths = [
    `profile/savegame${slotNumber}`,
    `savegame${slotNumber}`,
    `profile/savegame2`,
    `savegame2`,
    `profile/savegame1`,
    `savegame1`
  ];

  let pathIndex = 0;

  function tryNextDirectory() {
    if (pathIndex >= candidatePaths.length) {
      console.error(`❌ Could not locate a valid savegame directory on FTP server.`);
      ftpClient.end();
      process.exit(1);
      return;
    }

    const currentPath = candidatePaths[pathIndex];
    console.log(`📂 Scanning directory: ${currentPath}`);

    ftpClient.list(currentPath, async function(err, list) {
      if (err || !list || list.length === 0) {
        console.warn(`⚠️ Directory [ ${currentPath} ] not found or empty. Trying next path...`);
        pathIndex++;
        tryNextDirectory();
        return;
      }

      const xmlFiles = list.filter(f => f.type !== 'd' && f.name.toLowerCase().endsWith('.xml'));
      if (xmlFiles.length === 0) {
        console.warn(`⚠️ No XML files in [ ${currentPath} ]. Trying next path...`);
        pathIndex++;
        tryNextDirectory();
        return;
      }

      console.log(`🎯 Active savegame directory confirmed: [ ${currentPath} ] (${xmlFiles.length} XML files). Downloading...`);

      const masterPayload = {
        activePlayers: activePlayers,
        activeSaveSlot: slotNumber,
        lastUpdated: new Date().toISOString()
      };

      // Push raw HTTP stats feed across all primary telemetry nodes
      if (rawStatsXml && rawStatsXml.length > 0) {
        masterPayload.stats = { data: rawStatsXml };
        masterPayload.stats_raw = rawStatsXml;
        masterPayload.players_stats = { data: rawStatsXml };
        masterPayload.mods = { data: rawStatsXml };
        masterPayload.dedicatedServerConfig = { data: rawStatsXml };
        masterPayload.dedicatedServerConfig_xml = { data: rawStatsXml };
      }

      // Complete Canonical Mapping for All FS25 XML Files from G-Portal
      const keyMap = {
        'careersavegame': 'careerSavegame',
        'farms': 'farms',
        'farmlands': 'farmlands',
        'vehicles': 'vehicles',
        'placeables': 'placeables',
        'fields': 'fields',
        'missions': 'missions',
        'players': 'players',
        'environment': 'environment',
        'economy': 'economy',
        'sales': 'sales',
        'items': 'items',
        'collectibles': 'collectibles',
        'handtools': 'handTools',
        'precisionfarming': 'precisionFarming',
        'tiptypemappings': 'tipTypeMappings',
        'guidedtour': 'guidedTour',
        'navigation-system': 'navigationSystem',
        'npc': 'npc',
        'oncreateobjects': 'onCreateObjects',
        'treemarker': 'treeMarker',
        'treeplant': 'treePlant'
      };

      for (const fileInfo of xmlFiles) {
        const rawBaseName = fileInfo.name.replace(/\.xml$/i, '');
        const lowerBaseName = rawBaseName.toLowerCase();
        
        const canonicalKey = sanitizeFirebaseKey(keyMap[lowerBaseName] || rawBaseName);
        const remoteFilePath = `${currentPath}/${fileInfo.name}`;
        
        try {
          console.log(`⬇️ Downloading: ${fileInfo.name} -> Writing to Firebase key [ ${canonicalKey} ]`);
          const rawXmlContent = await downloadFileBuffer(ftpClient, remoteFilePath);
          const cleanXmlContent = sanitizeXmlContent(rawXmlContent);
          
          if (cleanXmlContent && cleanXmlContent.length > 0) {
            masterPayload[canonicalKey] = { data: cleanXmlContent };
            masterPayload[`${canonicalKey}_xml`] = { data: cleanXmlContent };
            // Also store direct string fallbacks to ensure compatibility
            masterPayload[`${canonicalKey}_raw`] = cleanXmlContent;
          } else {
            console.warn(`⚠️ File ${fileInfo.name} returned empty content. Skipping overwrite.`);
          }
        } catch (fileErr) {
          console.error(`❌ Download failed for ${fileInfo.name}:`, fileErr.message);
        }
      }

      try {
        await db.ref('fs25').update(masterPayload);
        console.log(`🏆 Firebase sync successful! Savegame telemetry for [ ${currentPath} ] written to /fs25.`);
      } catch (writeErr) {
        console.error("❌ Firebase Write Error:", writeErr.message);
      }

      console.log("🔌 Synchronization complete. Closing connection.");
      ftpClient.end();
      process.exit(0);
    });
  }

  tryNextDirectory();
}

runMainPipeline();
