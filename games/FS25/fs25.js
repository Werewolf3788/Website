/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 14:15:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: FS25 Self-Healing Telemetry Pipeline - Automatically detects 
 *              and switches to the currently active savegame slot from the
 *              live dedicated server stats feed in real time.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');

// SECTION 1: SAFETY FAILSAFE
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Execution exceeded 4 minutes. Exiting cleanly.");
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

// SECTION 3: NETWORK & HOST CONFIGURATION
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL_PRIMARY = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const STATS_URL_SECONDARY = `http://${ftpHost}:8300/feed/dedicated-server-stats.xml?code=${apiCode}`;

// SECTION 4: STATS API & DYNAMIC SLOT DETECTOR
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
          let activeSlot = null;

          // 1. Detect Active Connected Players
          const slotsMatch = cleanXml.match(/numUsed="(\d+)"/i) || cleanXml.match(/slots\s+numUsed="(\d+)"/i);
          if (slotsMatch) {
            players = parseInt(slotsMatch[1], 10);
          } else {
            const playerMatches = cleanXml.match(/<Player\b[^>]*>([\s\S]*?)<\/Player>/gi);
            if (playerMatches) players = playerMatches.length;
          }

          // 2. Dynamic Auto-Switch: Detect Current Savegame Slot from Stats XML
          const slotAttrMatch = cleanXml.match(/savegame="(\d+)"/i) || 
                                cleanXml.match(/slot="(\d+)"/i) || 
                                cleanXml.match(/savegameSlot="(\d+)"/i) ||
                                cleanXml.match(/SAVEGAME\s*(\d+)/i);
          
          if (slotAttrMatch) {
            activeSlot = slotAttrMatch[1];
          }

          console.log(`✅ Live server stats received! Active Players: ${players} | Detected Active Slot: #${activeSlot || 'Dynamic'}`);
          return { text: cleanXml, players, activeSlot };
        }
      }
    } catch (err) {
      console.warn(`⚠️ Stats fetch attempt failed for ${url}: ${err.message}`);
    }
  }

  return { text: "", players: 0, activeSlot: null };
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

// SECTION 5: MAIN PIPELINE WITH AUTOMATIC SAVE SWITCHING
async function runPipeline() {
  const statsData = await fetchStatsApi();

  // Instant safety write: update active players and live XML directly
  if (statsData.text) {
    try {
      const quickPayload = {
        activePlayers: statsData.players,
        stats_xml_raw: statsData.text,
        stats_raw: statsData.text,
        lastUpdated: new Date().toISOString()
      };
      await db.ref('fs25').update(quickPayload);
      await db.ref().update(quickPayload);
      console.log(`⚡ Instant Sync: Live stats and ${statsData.players} player(s) committed to Firebase.`);
    } catch (e) {
      console.warn("Notice on quick-write:", e.message);
    }
  }

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Exiting after live stats update.");
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

    console.log("✅ FTP connection established. Scanning directory tree...");

    // 1. Determine active save directory (Auto-switched from API or dynamically discovered)
    let validSavePath = null;
    let fileList = [];
    let discoveredSlot = statsData.activeSlot || process.env.DEFAULT_SAVE_SLOT || "2";

    const rootList = await client.list();
    
    // Check if the slot detected from stats exists in root
    if (discoveredSlot) {
      const targetDirName = `savegame${discoveredSlot}`;
      const foundInRoot = rootList.find(f => f.isDirectory && f.name.toLowerCase() === targetDirName.toLowerCase());
      if (foundInRoot) {
        validSavePath = foundInRoot.name;
        fileList = await client.list(validSavePath);
      }
    }

    // If not found yet, check under profile/ or search for the most recently modified savegame
    if (!validSavePath) {
      try {
        const profileList = await client.list('profile');
        const profMatch = profileList.find(f => f.isDirectory && f.name.toLowerCase().includes(`savegame${discoveredSlot}`));
        if (profMatch) {
          validSavePath = `profile/${profMatch.name}`;
          fileList = await client.list(validSavePath);
        }
      } catch (e) {}
    }

    // Dynamic Fallback: Select the most recently modified savegame folder automatically
    if (!validSavePath) {
      const allSaveDirs = rootList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame') && !f.name.toLowerCase().includes('backup'));
      if (allSaveDirs.length > 0) {
        allSaveDirs.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0));
        validSavePath = allSaveDirs[0].name;
        fileList = await client.list(validSavePath);
        const slotMatch = validSavePath.match(/\d+/);
        if (slotMatch) discoveredSlot = slotMatch[0];
      }
    }

    console.log(`🎯 AUTO-SWITCHED ACTIVE SAVE: [ ${validSavePath || 'savegame2'} ] (Slot #${discoveredSlot})`);

    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    let fs25ModsCrossplayData = {};
    try {
      const modsSnap = await db.ref('FS25_Mods_Info').once('value');
      fs25ModsCrossplayData = modsSnap.val() || {};
    } catch (e) {}

    const masterPayload = {
      activePlayers: statsData.players,
      activeSaveSlot: String(discoveredSlot),
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
      'farmland': 'farmland',
      'farmlands': 'farmlands',
      'vehicles': 'vehicles',
      'placeables': 'placeables',
      'fields': 'fields',
      'field': 'fields',
      'missions': 'missions',
      'environment': 'environment',
      'economy': 'economy',
      'items': 'items',
      'collectibles': 'collectibles',
      'handtools': 'handTools'
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
      } catch (err) {
        console.warn(`⚠️ Skipped reading ${file.name}: ${err.message}`);
      }
    }

    // Overwrite Firebase /fs25 and root with current active career save
    await db.ref('fs25').update(masterPayload);
    await db.ref().update(masterPayload);

    console.log(`🏆 Firebase updated with telemetry from active career save Slot #${discoveredSlot}!`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Warning:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
