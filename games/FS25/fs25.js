/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 13:00:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: FS25 Resilient G-Portal Telemetry Pipeline connecting to live
 *              stats API feed (207.244.246.70) and FTP savegame synchronizer.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { DOMParser } = require('@xmldom/xmldom');
const { Writable } = require('stream');

// Failsafe exit after 4 minutes
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Execution exceeded 4 minutes. Exiting.");
  process.exit(0);
}, 4 * 60 * 1000);

// Firebase Admin Initialization
const firebaseConfig = {
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com"
};

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ Failed parsing FIREBASE_SERVICE_ACCOUNT secret:", e.message);
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
    databaseURL: firebaseConfig.databaseURL
  });
}

const db = admin.database();

// Server Host Config from Live Dedicated Panel
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const defaultSlot = process.env.DEFAULT_SAVE_SLOT || '2';
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

// Try standard stats ports: 8300 (default stats port) or 9050 (web UI port)
const STATS_URL_PRIMARY = `http://${ftpHost}:8300/feed/dedicated-server-stats.xml?code=${apiCode}`;
const STATS_URL_SECONDARY = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;

async function fetchStatsApi() {
  const candidateUrls = [STATS_URL_PRIMARY, STATS_URL_SECONDARY];

  for (const url of candidateUrls) {
    try {
      console.log(`📡 Fetching live stats feed from [ ${url} ]...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        const cleanXml = sanitizeXmlContent(text);

        if (cleanXml.includes('<Server') || cleanXml.includes('<Slots') || cleanXml.includes('<slots')) {
          let players = 0;
          const slotsMatch = cleanXml.match(/numUsed="(\d+)"/i) || cleanXml.match(/slots\s+numUsed="(\d+)"/i);
          if (slotsMatch) {
            players = parseInt(slotsMatch[1], 10);
          } else {
            const playerMatches = cleanXml.match(/<Player\b/gi) || cleanXml.match(/<player\b/gi);
            if (playerMatches) players = playerMatches.length;
          }
          console.log(`✅ Live server stats received! Active Players: ${players}`);
          return { text: cleanXml, players };
        }
      }
    } catch (err) {
      console.warn(`⚠️ Stats fetch failed for ${url}: ${err.message}`);
    }
  }

  console.warn("ℹ️ Web API stats endpoint unreachable. Proceeding with FTP sync.");
  return { text: "", players: 0 };
}

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

async function downloadFtpFileToString(client, remotePath) {
  const chunks = [];
  const writer = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });

  await client.downloadTo(writer, remotePath);
  return Buffer.concat(chunks).toString('utf-8');
}

async function runPipeline() {
  const statsData = await fetchStatsApi();

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP_USER or FTP_PASS is missing. Writing API stats only to Firebase.");
    if (statsData.text) {
      const livePayload = {
        activePlayers: statsData.players,
        stats_xml_raw: statsData.text,
        stats_raw: statsData.text,
        lastUpdated: new Date().toISOString()
      };
      await db.ref('fs25').update(livePayload);
      await db.ref().update(livePayload);
    }
    process.exit(0);
  }

  console.log(`📡 Connecting to FTP: ${ftpHost}:${ftpPort}...`);
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: ftpHost,
      port: ftpPort,
      user: ftpUser,
      password: ftpPass,
      secure: false
    });

    console.log("✅ FTP connection established. Scanning savegame folders...");

    // 1. Cross-reference /FS25_Mods_Info
    let fs25ModsCrossplayData = {};
    try {
      const modsSnap = await db.ref('FS25_Mods_Info').once('value');
      fs25ModsCrossplayData = modsSnap.val() || {};
    } catch (e) {}

    // 2. Discover active savegame folder (Defaulting to Slot 2 as shown in web UI)
    let targetFolder = `savegame${defaultSlot}`;
    try {
      const rootList = await client.list();
      const saveDirs = rootList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame') && !f.name.toLowerCase().includes('backup'));
      if (saveDirs.length > 0) {
        saveDirs.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0));
        targetFolder = saveDirs[0].name;
      } else {
        const profileList = await client.list('profile');
        const profDirs = profileList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame'));
        if (profDirs.length > 0) {
          profDirs.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0));
          targetFolder = `profile/${profDirs[0].name}`;
        }
      }
    } catch (e) {
      console.warn(`Directory listing notice: ${e.message}. Targeting [ ${targetFolder} ]`);
    }

    console.log(`🎯 Active Savegame Target: [ ${targetFolder} ]`);

    // 3. Download and parse files
    const fileList = await client.list(targetFolder);
    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    const masterPayload = {
      activePlayers: statsData.players,
      activeSaveSlot: defaultSlot,
      lastUpdated: new Date().toISOString(),
      modCatalogCrossplay: fs25ModsCrossplayData,
      config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" }
    };

    if (statsData.text) {
      masterPayload.stats_xml_raw = statsData.text;
      masterPayload.stats_raw = statsData.text;
      masterPayload.dedicatedServerConfig_raw = statsData.text;
    }

    const keyMap = {
      'careersavegame': 'careerSavegame',
      'farms': 'farms',
      'farmland': 'farmlands',
      'farmlands': 'farmlands',
      'vehicles': 'vehicles',
      'placeables': 'placeables',
      'fields': 'fields',
      'missions': 'missions',
      'environment': 'environment',
      'items': 'items',
      'collectibles': 'collectibles',
      'handtools': 'handTools'
    };

    for (const file of readableFiles) {
      const rawBaseName = file.name.replace(/\.(xml|txt)$/i, '');
      const lowerBaseName = rawBaseName.toLowerCase();
      const canonicalKey = keyMap[lowerBaseName] || rawBaseName;
      const remoteFilePath = `${targetFolder}/${file.name}`;

      try {
        const rawContent = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXmlContent(rawContent);
        if (cleanContent) {
          masterPayload[`${canonicalKey}_raw`] = cleanContent;
          masterPayload[canonicalKey] = cleanContent;
        }
      } catch (err) {
        console.warn(`⚠️ Skipped reading ${file.name}: ${err.message}`);
      }
    }

    // 4. Update Firebase (/fs25 and root fallback)
    await db.ref('fs25').set(masterPayload);
    await db.ref().update(masterPayload);

    console.log("🏆 Firebase Realtime Database updated with live active players & telemetry.");
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Failed:", err.message);
    client.close();
    process.exit(1);
  }
}

runPipeline();
