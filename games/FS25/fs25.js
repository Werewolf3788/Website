/*
 Version Timestamp: Fri, July 24, 2026, 10:55 AM (EDT)
 Smart Dynamic Savegame Auto-Detection Engine with Normalized FTP Pathing & Total Firebase Overwrite
 File: fs25.js
 Description: Scans G-Portal FTP save directories using explicit absolute pathing, 
              detects active save by timestamp, cleans XML payloads, and performs 
              a full Firebase RTDB overwrite (.set) to clear previous save state.
*/

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// Global 5-Minute Safety Timeout Failsafe to prevent hanging GitHub Action runners
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Execution exceeded 5 minutes. Exiting.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Smart Sync Pipeline for Server 144.126.153.115...");

// Initialize Firebase Admin SDK using Environment Secrets or Local Key Fallback
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

// Exponential Backoff Fetch Helper for REST Requests
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

// Resilient FTP File Buffer Downloader
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

// Resilient FTP Directory Listing Promise (returns empty array if path does not exist)
function safeListFtpDir(client, remotePath) {
  return new Promise((resolve) => {
    client.list(remotePath, (err, list) => {
      if (err) {
        console.warn(`⚠️ Directory scan failed for path [ ${remotePath} ]: ${err.message}`);
        resolve([]);
      } else {
        resolve(list || []);
      }
    });
  });
}

// Sanitizes keys for Firebase Realtime Database compliance (removes . $ # [ ])
function sanitizeFirebaseKey(key) {
  return key.replace(/[\.\$\#\[\]]/g, '_');
}

// Strips G-Portal web view CSS injection (.vue-modal-resizer) and HTML wrappers
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

  // 1. Query G-Portal Stats HTTP API for Live Player Count and Map State
  try {
    const response = await fetchWithRetry(STATS_URL, { timeout: 8000 }, 3, 1000);
    rawStatsXml = sanitizeXmlContent(await response.text());
    
    const slotsMatch = rawStatsXml.match(/numUsed="(\d+)"/i) || rawStatsXml.match(/slots\s+numUsed="(\d+)"/i);
    if (slotsMatch) {
      activePlayers = parseInt(slotsMatch[1], 10);
    }
    console.log(`✅ Web API connected (144.126.153.115). Active Players: ${activePlayers}`);
  } catch (err) {
    console.warn("⚠️ Web API stats fetch failed. Proceeding directly to FTP scan.");
  }

  // 2. Establish FTP Uplink to Inspect Directories
  ftpClient.on('ready', async function() {
    console.log("📡 FTP Uplink Connected to 144.126.153.115. Resolving active savegame slot...");

    try {
      // Check both Root and 'profile/' subfolder for savegame directories
      const possibleRootDirs = ['', '/'];
      let discoveredFolders = [];

      for (const rootPath of possibleRootDirs) {
        const items = await safeListFtpDir(ftpClient, rootPath);
        const matches = items.filter(item => 
          item.type === 'd' && 
          item.name.toLowerCase().includes('savegame') && 
          !item.name.toLowerCase().includes('backup')
        );

        matches.forEach(m => {
          const fullPath = rootPath ? `${rootPath}/${m.name}`.replace('//', '/') : m.name;
          discoveredFolders.push({
            name: m.name,
            fullPath: fullPath,
            date: new Date(m.date).getTime()
          });
        });
      }

      // Check profile/ directory explicitly if no savegames found in root
      if (discoveredFolders.length === 0) {
        const profileItems = await safeListFtpDir(ftpClient, 'profile');
        profileItems.filter(item => 
          item.type === 'd' && item.name.toLowerCase().includes('savegame')
        ).forEach(m => {
          discoveredFolders.push({
            name: m.name,
            fullPath: `profile/${m.name}`,
            date: new Date(m.date).getTime()
          });
        });
      }

      let targetFolder = "savegame1";
      let latestTimestamp = 0;

      if (discoveredFolders.length > 0) {
        // Find directory with newest modification timestamp
        discoveredFolders.forEach(folder => {
          console.log(`📂 Discovered Save Folder: [ ${folder.fullPath} ] | Timestamp: ${new Date(folder.date).toISOString()}`);
          if (folder.date > latestTimestamp) {
            latestTimestamp = folder.date;
            targetFolder = folder.fullPath;
          }
        });
      } else {
        console.warn("⚠️ No dynamic save folders listed. Defaulting target to [ savegame1 ]");
      }

      // Extract slot number digit (e.g. savegame2 -> 2)
      const slotMatch = targetFolder.match(/\d+/);
      const activeSlotNumber = slotMatch ? slotMatch[0] : "1";
      console.log(`🎯 DYNAMICALLY TARGETED ACTIVE SAVE: [ ${targetFolder} ] (Slot #${activeSlotNumber})`);

      // Scan directory for XML files
      let fileList = await safeListFtpDir(ftpClient, targetFolder);
      if (fileList.length === 0 && !targetFolder.startsWith('/')) {
        fileList = await safeListFtpDir(ftpClient, `/${targetFolder}`);
      }

      const xmlFiles = fileList.filter(f => f.type !== 'd' && f.name.toLowerCase().endsWith('.xml'));
      console.log(`📄 Found ${xmlFiles.length} XML telemetry files inside [ ${targetFolder} ]`);

      const masterPayload = {
        activePlayers: activePlayers,
        activeSaveSlot: activeSlotNumber,
        lastUpdated: new Date().toISOString()
      };

      if (rawStatsXml && rawStatsXml.length > 0) {
        masterPayload.stats = { data: rawStatsXml };
        masterPayload.stats_raw = rawStatsXml;
        masterPayload.dedicatedServerConfig = { data: rawStatsXml };
        masterPayload.dedicatedServerConfig_xml = { data: rawStatsXml };
      }

      // Canonical XML filename mapping to standard Firebase Keys
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

      // Download and sanitize XML contents
      for (const fileInfo of xmlFiles) {
        const rawBaseName = fileInfo.name.replace(/\.xml$/i, '');
        const lowerBaseName = rawBaseName.toLowerCase();
        const canonicalKey = sanitizeFirebaseKey(keyMap[lowerBaseName] || rawBaseName);
        const remoteFilePath = `${targetFolder}/${fileInfo.name}`.replace('//', '/');

        try {
          console.log(`⬇️ Syncing: ${fileInfo.name} -> Writing to Firebase key [ ${canonicalKey} ]`);
          const rawContent = await downloadFileBuffer(ftpClient, remoteFilePath);
          const cleanContent = sanitizeXmlContent(rawContent);

          if (cleanContent && cleanContent.length > 0) {
            masterPayload[canonicalKey] = { data: cleanContent };
            masterPayload[`${canonicalKey}_xml`] = { data: cleanContent };
            masterPayload[`${canonicalKey}_raw`] = cleanContent;
          }
        } catch (fileErr) {
          console.error(`❌ Download failed for ${fileInfo.name}:`, fileErr.message);
        }
      }

      // Complete Firebase Overwrite (.set) to clear previous savegame state
      try {
        await db.ref('fs25').set(masterPayload);
        console.log(`🏆 TOTAL OVERWRITE SUCCESSFUL! Firebase /fs25 updated to match [ ${targetFolder} ].`);
      } catch (writeErr) {
        console.error("❌ Firebase Overwrite Error:", writeErr.message);
      }

      console.log("🔌 Synchronization complete. Closing FTP uplink.");
      ftpClient.end();
      process.exit(0);

    } catch (pipelineErr) {
      console.error("🚨 Pipeline Execution Error:", pipelineErr.message);
      ftpClient.end();
      process.exit(1);
    }
  });

  ftpClient.on('error', function(err) {
    console.error("🚨 FTP Error:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

runMainPipeline();
