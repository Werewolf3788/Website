/**
 * Version Timestamp: Thu, July 23, 2026, 5:45 PM (EDT)
 * Resilient FS25 G-Portal API & FTP Sync Pipeline to Firebase Realtime Database
 *
 * Key Fixes Implemented:
 * 1. Aligned Firebase target node directly to 'fs25' (matching index.html root listeners).
 * 2. Preserved raw XML payload strings ({ data: rawXml }) required by the frontend DOMParser.
 * 3. Saved G-Portal stats API XML into 'stats', 'players', and 'mods' nodes for live server title/password/roster tracking.
 * 4. Added fetch retry logic with exponential backoff and explicit timeout controls.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// 🚨 GLOBAL RUNTIME SECURITY TIMEOUT
// Prevents any hidden asynchronous or unclosed socket connections from hanging the runner.
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Script execution exceeded 5 minutes. Forcing secure exit.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Resilient Backend Sync Pipeline...");

// 1. Firebase Administration Setup
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ Failed parsing FIREBASE_SERVICE_ACCOUNT JSON string environment variable.", e.message);
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

// Prevent duplicate app initialization crashes
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();
const ftpClient = new Client();

const ftpConfig = {
  host: process.env.FTP_HOST || '207.244.243.68',
  port: parseInt(process.env.FTP_PORT, 10) || 50441,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS
};

const STATS_URL = "http://207.244.243.68:8500/feed/dedicated-server-stats.xml?code=jeRZKn2jNdgJNqqs";

/**
 * Resilient fetch with exponential backoff and explicit timeout controller
 */
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

// Helper function to extract a tag value out of an XML string block
function getTagValue(xmlString, tagName) {
  const match = xmlString.match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? match[1].trim() : null;
}

// Promise wrapper to pull clean file text content from live FTP stream
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

async function runMainPipeline() {
  let activePlayers = 0;
  let rawStatsXml = "";

  // A. Check live players & stats via Web API Feed
  try {
    const response = await fetchWithRetry(STATS_URL, { timeout: 8000 }, 3, 1000);
    rawStatsXml = await response.text();
    
    const slotsMatch = rawStatsXml.match(/slots\s+numUsed="(\d+)"/);
    if (slotsMatch) {
      activePlayers = parseInt(slotsMatch[1], 10);
    }
    console.log(`✅ Live Web API connected successfully. Active Players: ${activePlayers}`);
  } catch (err) {
    console.log("⚠️ API fetch failed after retries, continuing directly with FTP structural analysis.");
  }

  // B. Enforce the 6-hour cooldown engine rule if the server runtime is idle
  if (activePlayers === 0) {
    try {
      const snapshot = await db.ref('fs25/lastUpdated').get();
      if (snapshot.exists()) {
        const lastUpdateStr = snapshot.val();
        const hoursSinceLastUpdate = (new Date() - new Date(lastUpdateStr)) / (1000 * 60 * 60);
        
        if (hoursSinceLastUpdate < 6) {
          console.log(`🛑 Server is empty. Last sync was ${hoursSinceLastUpdate.toFixed(2)} hours ago (< 6 hrs). Safe exit.`);
          process.exit(0);
        }
      }
    } catch (dbE) {
      console.log("No previous timing footprint found in Firebase. Proceeding with full sweep.");
    }
  }

  // C. Fire up the FTP pipeline
  ftpClient.on('ready', function() {
    console.log("FTP Uplink Ready. Detecting active savegame index...");

    ftpClient.get('dedicatedServerConfig.xml', function(err, configStream) {
      if (err) {
        console.error("⚠️ Couldn't read dedicatedServerConfig.xml. Defaulting to fallback Savegame Slot 8.", err.message);
        processActiveFolderSync(8, activePlayers, rawStatsXml);
        return;
      }

      let configData = '';
      configStream.on('data', chunk => configData += chunk);
      configStream.on('end', () => {
        let detectedSlot = getTagValue(configData, 'savegame_index');
        
        if (!detectedSlot) {
          console.log("⚠️ Could not parse <savegame_index>. Defaulting to fallback Slot 8.");
          detectedSlot = 8;
        } else {
          console.log(`🎯 Server configuration scan successful. Active Map is in Slot [ ${detectedSlot} ]`);
        }

        processActiveFolderSync(parseInt(detectedSlot, 10), activePlayers, rawStatsXml);
      });
    });
  });

  // Handle FTP connection errors gracefully
  ftpClient.on('error', function(err) {
    console.error("🚨 FTP Client Error Interface Failure:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

function processActiveFolderSync(slotNumber, activePlayers, rawStatsXml) {
  const targetFolderPath = `savegame${slotNumber}`;
  console.log(`Scanning target folder directory: ${targetFolderPath}`);

  ftpClient.list(targetFolderPath, async function(err, list) {
    if (err) {
      console.error(`❌ Failed tracking contents of directory: ${targetFolderPath}`, err.message);
      ftpClient.end();
      process.exit(0);
      return;
    }

    const xmlFiles = list.filter(f => f.type !== 'd' && f.name.toLowerCase().endsWith('.xml'));
    console.log(`📂 Found ${xmlFiles.length} map configuration XML files inside Savegame ${slotNumber}. Processing...`);

    // Build Master Payload with raw XML string structures ({ data: "..." }) expected by frontend index.html
    const masterPayload = {
      activePlayers: activePlayers,
      activeSaveSlot: slotNumber,
      lastUpdated: new Date().toISOString()
    };

    // Inject Web API stats XML into stats, players, and mods nodes if available
    if (rawStatsXml && rawStatsXml.length > 0) {
      masterPayload.stats = { data: rawStatsXml };
      masterPayload.players = { data: rawStatsXml };
      masterPayload.mods = { data: rawStatsXml };
    }

    // Dynamically iterate over every XML file found in the target savegame folder
    for (const fileInfo of xmlFiles) {
      const fileNameClean = fileInfo.name.replace('.xml', '').replace(/[\.\#\$\/\[\]]/g, '_');
      const remoteFilePath = `${targetFolderPath}/${fileInfo.name}`;
      
      try {
        console.log(`Extracting XML file: ${fileInfo.name}`);
        const rawXmlContent = await downloadFileBuffer(ftpClient, remoteFilePath);
        
        // Format as object containing 'data' property with raw XML string for frontend DOMParser
        masterPayload[fileNameClean] = { data: rawXmlContent };
      } catch (fileErr) {
        console.error(`❌ Data scrape bypassed on file: ${fileInfo.name}`, fileErr.message);
      }
    }

    // D. Synchronize master payload tree directly to Firebase Realtime Database at 'fs25'
    try {
      await db.ref('fs25').update(masterPayload);
      console.log(`🏆 Synchronization complete! All files from Slot ${slotNumber} written directly to Firebase /fs25 node.`);
    } catch (writeErr) {
      console.error("Master state transmission update rejected by database:", writeErr.message);
    }

    console.log("🔌 Closing FTP Socket Stream.");
    ftpClient.end();
    process.exit(0);
  });
}

runMainPipeline();
