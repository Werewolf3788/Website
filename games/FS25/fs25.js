/**
 * Version Timestamp: Thu, July 23, 2026, 8:10 PM (EDT)
 * Resilient FS25 G-Portal Sync Pipeline (24/7 Unrestricted FTP & Web API Bridge)
 */

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// Global 5-Minute Safety Timeout Failsafe
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Script execution exceeded 5 minutes. Forcing secure exit.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Unrestricted Sync Engine...");

// 1. Initialize Firebase Admin SDK
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
  host: process.env.FTP_HOST || '207.244.243.68',
  port: parseInt(process.env.FTP_PORT, 10) || 50441,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  connTimeout: 15000,
  pasvTimeout: 15000
};

const STATS_URL = "http://207.244.243.68:8500/feed/dedicated-server-stats.xml?code=jeRZKn2jNdgJNqqs";
const DEFAULT_SLOT = parseInt(process.env.DEFAULT_SAVE_SLOT, 10) || 1;

/**
 * Fetch helper with exponential backoff
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

function getTagValue(xmlString, tagName) {
  const match = xmlString.match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? match[1].trim() : null;
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

async function runMainPipeline() {
  let activePlayers = 0;
  let rawStatsXml = "";

  // Step A: Fetch Live Web Stats (for Server Name, Map Name, Active Roster)
  try {
    const response = await fetchWithRetry(STATS_URL, { timeout: 8000 }, 3, 1000);
    rawStatsXml = await response.text();
    
    const slotsMatch = rawStatsXml.match(/slots\s+numUsed="(\d+)"/);
    if (slotsMatch) {
      activePlayers = parseInt(slotsMatch[1], 10);
    }
    console.log(`✅ Web API connected. Current Online Players: ${activePlayers}`);
  } catch (err) {
    console.warn("⚠️ Web API stats fetch failed. Proceeding with direct FTP savegame scrape.");
  }

  // Step B: Connect FTP and sync ALL Savegame Files regardless of online player count
  ftpClient.on('ready', function() {
    console.log("📡 FTP Connection Established. Scanning server slot configurations...");

    ftpClient.get('dedicatedServerConfig.xml', function(err, configStream) {
      let detectedSlot = DEFAULT_SLOT;

      if (err) {
        console.warn(`⚠️ dedicatedServerConfig.xml unreadable. Defaulting to target Slot [ savegame${DEFAULT_SLOT} ]`);
        processActiveFolderSync(DEFAULT_SLOT, activePlayers, rawStatsXml);
        return;
      }

      let configData = '';
      configStream.on('data', chunk => configData += chunk);
      configStream.on('end', () => {
        const parsedSlot = getTagValue(configData, 'savegame_index');
        if (parsedSlot) {
          detectedSlot = parseInt(parsedSlot, 10);
          console.log(`🎯 Active game slot confirmed in server config: Slot [ savegame${detectedSlot} ]`);
        } else {
          console.log(`⚠️ Unparsed slot index tag. Fallback to Slot [ savegame${DEFAULT_SLOT} ]`);
        }

        processActiveFolderSync(detectedSlot, activePlayers, rawStatsXml);
      });
    });
  });

  ftpClient.on('error', function(err) {
    console.error("🚨 Critical FTP Link Error:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

function processActiveFolderSync(slotNumber, activePlayers, rawStatsXml) {
  const targetFolderPath = `savegame${slotNumber}`;
  console.log(`📂 Indexing directory contents: ${targetFolderPath}`);

  ftpClient.list(targetFolderPath, async function(err, list) {
    if (err) {
      console.error(`❌ Folder read failed for ${targetFolderPath}:`, err.message);
      ftpClient.end();
      process.exit(1);
      return;
    }

    const xmlFiles = list.filter(f => f.type !== 'd' && f.name.toLowerCase().endsWith('.xml'));
    console.log(`📊 Found ${xmlFiles.length} target XML data files in savegame${slotNumber}. Extracting telemetry...`);

    const masterPayload = {
      activePlayers: activePlayers,
      activeSaveSlot: slotNumber,
      lastUpdated: new Date().toISOString()
    };

    if (rawStatsXml && rawStatsXml.length > 0) {
      masterPayload.stats = { data: rawStatsXml };
      masterPayload.players = { data: rawStatsXml };
      masterPayload.mods = { data: rawStatsXml };
    }

    for (const fileInfo of xmlFiles) {
      const fileNameClean = fileInfo.name.replace('.xml', '').replace(/[\.\#\$\/\[\]]/g, '_');
      const remoteFilePath = `${targetFolderPath}/${fileInfo.name}`;
      
      try {
        console.log(`⬇️ Downloading: ${fileInfo.name}`);
        const rawXmlContent = await downloadFileBuffer(ftpClient, remoteFilePath);
        masterPayload[fileNameClean] = { data: rawXmlContent };
      } catch (fileErr) {
        console.error(`❌ Download failed for ${fileInfo.name}:`, fileErr.message);
      }
    }

    // Write all telemetry directly into Firebase root node /fs25
    try {
      await db.ref('fs25').update(masterPayload);
      console.log(`🏆 Database update successful! All savegame data written to Firebase /fs25.`);
    } catch (writeErr) {
      console.error("❌ Firebase Database Write Error:", writeErr.message);
    }

    console.log("🔌 Synchronization complete. Closing FTP Uplink.");
    ftpClient.end();
    process.exit(0);
  });
}

runMainPipeline();
