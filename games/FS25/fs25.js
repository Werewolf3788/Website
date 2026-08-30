/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 15:20:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Master FS25 G-Portal Telemetry Pipeline. Strictly encapsulates
 *              all telemetry and savegame XML data inside the /fs25 node.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');

// SECTION 1: SAFETY FAILSAFE
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

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

// SECTION 3: NETWORK & HOST CONFIGURATION
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL_PRIMARY = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const STATS_URL_SECONDARY = `http://${ftpHost}:8300/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

async function fetchStatsApi() {
  const candidateUrls = [STATS_URL_PRIMARY, STATS_URL_SECONDARY];

  for (const url of candidateUrls) {
    try {
      console.log(`📡 Fetching live stats feed: [ ${url} ]`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        const cleanXml = sanitizeXmlContent(text);

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

          return { text: cleanXml, players, activeSlot, mapTitle };
        }
      }
    } catch (err) {}
  }

  return { text: "", players: 0, activeSlot: null, mapTitle: "" };
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

// SECTION 4: MAIN ACTIVE SAVE RESOLUTION & FIREBASE COMMIT
async function runPipeline() {
  const statsData = await fetchStatsApi();

  // Instant safety write: update strictly inside /fs25 node
  if (statsData.text) {
    const liveStatsPayload = {
      activePlayers: statsData.players,
      liveMapImage: MAP_IMAGE_URL,
      stats_xml_raw: statsData.text,
      stats_raw: statsData.text,
      lastUpdated: new Date().toISOString()
    };
    await db.ref('fs25').update(liveStatsPayload);
    console.log(`⚡ Live stats updated strictly inside /fs25.`);
  }

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Exiting after live stats update.");
    process.exit(0);
  }

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

    console.log("✅ FTP connected. Resolving dedicated active save slot...");

    let activeSlotNumber = statsData.activeSlot || null;
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
            activeSlotNumber = slotMatch[1];
            console.log(`🎯 Active Save Slot locked: Slot #${activeSlotNumber}`);
            break;
          }
        }
      } catch (e) {}
    }

    if (!activeSlotNumber) activeSlotNumber = process.env.DEFAULT_SAVE_SLOT || "2";

    let validSavePath = null;
    let fileList = [];

    const rootList = await client.list();
    const targetDirName = `savegame${activeSlotNumber}`;
    const foundInRoot = rootList.find(f => f.isDirectory && f.name.toLowerCase() === targetDirName.toLowerCase());

    if (foundInRoot) {
      validSavePath = foundInRoot.name;
      fileList = await client.list(validSavePath);
    } else {
      try {
        const profileList = await client.list('profile');
        const profMatch = profileList.find(f => f.isDirectory && f.name.toLowerCase().includes(`savegame${activeSlotNumber}`));
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

    console.log(`📂 Pulling all XML files from: [ ${validSavePath || 'savegame2'} ]`);

    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

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
        const cleanContent = sanitizeXmlContent(rawContent);
        if (cleanContent) {
          masterPayload[`${canonicalKey}_raw`] = cleanContent;
          masterPayload[canonicalKey] = cleanContent;
        }
      } catch (err) {}
    }

    // Atomic write strictly to /fs25 node only
    await db.ref('fs25').update(masterPayload);

    // Clean up any loose root-level keys that spilled over previously
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

    console.log(`🏆 Active Save Slot #${activeSlotNumber} completely synced to /fs25!`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("Pipeline Notice:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
