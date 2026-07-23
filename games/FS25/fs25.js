/**
 * Version Timestamp: Thu, July 23, 2026, 8:50 PM (EDT)
 * G-Portal Sync Pipeline (Corrected for New IP 144.126.153.115)
 */

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// Global 5-Minute Safety Timeout Failsafe
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Execution exceeded 5 minutes. Exiting.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Sync Pipeline for Server 144.126.153.115...");

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

// NEW SERVER CREDENTIALS
const ftpConfig = {
  host: process.env.FTP_HOST || '144.126.153.115',
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  connTimeout: 15000,
  pasvTimeout: 15000
};

const STATS_URL = "http://144.126.153.115:8300/feed/dedicated-server-stats.xml?code=3FvqSlOsYKckfauM";
const DEFAULT_SLOT = parseInt(process.env.DEFAULT_SAVE_SLOT, 10) || 1;

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

  try {
    const response = await fetchWithRetry(STATS_URL, { timeout: 8000 }, 3, 1000);
    rawStatsXml = await response.text();
    
    const slotsMatch = rawStatsXml.match(/slots\s+numUsed="(\d+)"/);
    if (slotsMatch) {
      activePlayers = parseInt(slotsMatch[1], 10);
    }
    console.log(`✅ Web API connected (144.126.153.115). Active Players: ${activePlayers}`);
  } catch (err) {
    console.warn("⚠️ Web API stats fetch failed. Proceeding to FTP scan.");
  }

  ftpClient.on('ready', function() {
    console.log("📡 FTP Uplink Connected to 144.126.153.115. Reading server config...");

    ftpClient.get('dedicatedServerConfig.xml', function(err, configStream) {
      let detectedSlot = DEFAULT_SLOT;

      if (err) {
        console.warn(`⚠️ dedicatedServerConfig.xml missing. Using Slot [ savegame${DEFAULT_SLOT} ]`);
        processActiveFolderSync(DEFAULT_SLOT, activePlayers, rawStatsXml);
        return;
      }

      let configData = '';
      configStream.on('data', chunk => configData += chunk);
      configStream.on('end', () => {
        const parsedSlot = getTagValue(configData, 'savegame_index');
        if (parsedSlot) {
          detectedSlot = parseInt(parsedSlot, 10);
          console.log(`🎯 Active Save Slot confirmed: savegame${detectedSlot}`);
        } else {
          console.log(`⚠️ Slot unparsed. Using Slot [ savegame${DEFAULT_SLOT} ]`);
        }

        processActiveFolderSync(detectedSlot, activePlayers, rawStatsXml);
      });
    });
  });

  ftpClient.on('error', function(err) {
    console.error("🚨 FTP Error:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

function processActiveFolderSync(slotNumber, activePlayers, rawStatsXml) {
  const targetFolderPath = `savegame${slotNumber}`;
  console.log(`📂 Indexing directory: ${targetFolderPath}`);

  ftpClient.list(targetFolderPath, async function(err, list) {
    if (err)
