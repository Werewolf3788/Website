/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 16:45:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Master Hybrid Ingestion Pipeline - Merges G-Portal Live Web API
 *              (players & cab status) with Direct FTP Savegame Extraction
 *              (farms, missions, placeables, farmland, items, collectibles).
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');

// Failsafe timeout
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// Firebase Admin Setup
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

const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

function sanitizeXml(rawText) {
  if (!rawText) return "";
  let clean = rawText.toString();
  if (clean.includes(".vue-modal-resizer")) {
    clean = clean.split(".vue-modal-resizer")[0];
  }
  const preMatch = clean.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) clean = preMatch[1];
  const codeMatch = clean.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) clean = codeMatch[1];

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

async function fetchStatsApi() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(STATS_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const clean = sanitizeXml(text);
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

        const slotMatch = clean.match(/savegame="(\d+)"/i) || clean.match(/slot="(\d+)"/i) || clean.match(/savegameSlot="(\d+)"/i);
        if (slotMatch) activeSlot = slotMatch[1];

        const mapMatch = clean.match(/mapTitle="([^"]+)"/i) || clean.match(/mapName="([^"]+)"/i);
        if (mapMatch) mapTitle = mapMatch[1];

        return { text: clean, players, activeSlot, mapTitle };
      }
    }
  } catch (err) {
    console.warn("Stats API Notice:", err.message);
  }
  return { text: "", players: 0, activeSlot: null, mapTitle: "" };
}

async function runPipeline() {
  console.log("📡 Step 1: Fetching live Web API Stats...");
  const statsData = await fetchStatsApi();

  let targetSlot = statsData.activeSlot || process.env.DEFAULT_SAVE_SLOT || "3";

  const masterPayload = {
    activePlayers: statsData.players,
    activeSaveSlot: String(targetSlot),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" }
  };

  if (statsData.text) {
    masterPayload.stats_xml_raw = statsData.text;
    masterPayload.stats_raw = statsData.text;
  }

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Writing live stats only.");
    await db.ref('fs25').update(masterPayload);
    process.exit(0);
  }

  console.log(`📡 Step 2: Connecting to FTP (${ftpHost}:${ftpPort}) to pull full save files...`);
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

    // Check config for true active slot
    const possibleConfigFiles = [
      'dedicated_server/dedicatedServerConfig.xml',
      'profile/dedicated_server/dedicatedServerConfig.xml',
      'dedicatedServerConfig.xml',
      'profile/dedicatedServerConfig.xml'
    ];

    for (const cfgPath of possibleConfigFiles) {
      try {
        const cfgXml = await downloadFtpFileToString(client, cfgPath);
        if (cfgXml) {
          const slotMatch = cfgXml.match(/savegameSlot="(\d+)"/i) || cfgXml.match(/savegame="(\d+)"/i) || cfgXml.match(/<savegame>(\d+)<\/savegame>/i);
          if (slotMatch) {
            targetSlot = slotMatch[1];
            masterPayload.activeSaveSlot = String(targetSlot);
            console.log(`🎯 Active Save Slot confirmed from Config: Slot #${targetSlot}`);
            break;
          }
        }
      } catch (e) {}
    }

    // Locate the active save folder
    let validSavePath = null;
    let fileList = [];

    const rootList = await client.list();
    const targetDirName = `savegame${targetSlot}`;
    const foundInRoot = rootList.find(f => f.isDirectory && f.name.toLowerCase() === targetDirName.toLowerCase());

    if (foundInRoot) {
      validSavePath = foundInRoot.name;
      fileList = await client.list(validSavePath);
    } else {
      try {
        const profileList = await client.list('profile');
        const profMatch = profileList.find(f => f.isDirectory && f.name.toLowerCase().includes(`savegame${targetSlot}`));
        if (profMatch) {
          validSavePath = `profile/${profMatch.name}`;
          fileList = await client.list(validSavePath);
        }
      } catch (e) {}
    }

    if (!validSavePath) {
      const anySave = rootList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame') && !f.name.toLowerCase().includes('backup'));
      if (anySave.length > 0) {
        anySave.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0));
        validSavePath = anySave[0].name;
        fileList = await client.list(validSavePath);
      }
    }

    console.log(`📂 Pulling save files from: [ ${validSavePath || 'savegame3'} ]`);

    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    const keyMap = {
      'careersavegame': 'careerSavegame',
      'farms': 'farms',
      'farmland': 'farmland',
      'farmlands': 'farmlands',
      'vehicles': 'vehicles',
      'placeables': 'placeables',
      'fields': 'fields',
      'field': 'fields',
      'missions': 'missions',
      'mission': 'missions',
      'environment': 'environment',
      'economy': 'economy',
      'items': 'items',
      'collectibles': 'collectibles',
      'collectible': 'collectibles',
      'handtools': 'handTools',
      'precisionfarming': 'precisionFarming'
    };

    for (const file of readableFiles) {
      const rawBaseName = file.name.replace(/\.(xml|txt)$/i, '');
      const lowerBaseName = rawBaseName.toLowerCase();
      const canonicalKey = keyMap[lowerBaseName] || rawBaseName;
      const remoteFilePath = `${validSavePath}/${file.name}`;

      try {
        const rawContent = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXml(rawContent);
        if (cleanContent) {
          masterPayload[`${canonicalKey}_raw`] = cleanContent;
          masterPayload[canonicalKey] = cleanContent;
          console.log(`  -> Synced: ${file.name} (${cleanContent.length} bytes)`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    // Write strictly to /fs25 node
    await db.ref('fs25').set(masterPayload);

    console.log(`🏆 Success! Full savegame telemetry synced to /fs25.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    // Write whatever stats we got
    await db.ref('fs25').update(masterPayload);
    client.close();
    process.exit(0);
  }
}

runPipeline();
