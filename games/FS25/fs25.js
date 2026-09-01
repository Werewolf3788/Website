/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-01 08:08:11 (EDT - 24hr New York Time)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Smart FS25 Dynamic Savegame Ingestion Engine with Farm-level
 *              Aggregation (groups vehicles, placeables, stats by farmId).
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// SECTION 1: SAFETY TIMEOUT (4 Minutes)
// Prevents zombie processes on hanging FTP connections
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

// SECTION 3: NETWORK & HOST CONFIGURATION (Dual HTTP/HTTPS support)
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

// Endpoints supporting plain HTTP or HTTPS reverse proxies
const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

// SECTION 4: HELPER FUNCTIONS & PARSERS
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

async function parseXmlString(xmlString) {
  if (!xmlString) return null;
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (e) {
    return null;
  }
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

// SECTION 5: FARM DATA AGGREGATION ENGINE
// Groups XML entities (farms, vehicles, placeables, stats) by farmId
async function buildFarmsAggregation(rawFiles) {
  const aggregated = {
    unowned: { farmId: "0", name: "Unowned / Map Environment", vehicles: [], placeables: [] },
    farms: {}
  };

  // 1. Process farms.xml
  if (rawFiles['farms']) {
    const farmsJson = await parseXmlString(rawFiles['farms']);
    if (farmsJson && farmsJson.farms && farmsJson.farms.farm) {
      const farmList = Array.isArray(farmsJson.farms.farm) ? farmsJson.farms.farm : [farmsJson.farms.farm];
      farmList.forEach(f => {
        const fId = String(f.farmId || f.id || '1');
        aggregated.farms[`farm_${fId}`] = {
          farmId: fId,
          name: f.name || `Farm ${fId}`,
          money: parseFloat(f.money || 0),
          loan: parseFloat(f.loan || 0),
          color: f.color || "1",
          players: f.players ? (Array.isArray(f.players.player) ? f.players.player : [f.players.player]) : [],
          vehicles: [],
          placeables: [],
          fields: [],
          stats: {}
        };
      });
    }
  }

  // Fallback if no farms were parsed
  if (Object.keys(aggregated.farms).length === 0) {
    aggregated.farms['farm_1'] = {
      farmId: "1",
      name: "My Farm",
      money: 0,
      loan: 0,
      vehicles: [],
      placeables: [],
      fields: [],
      stats: {}
    };
  }

  // 2. Process vehicles.xml
  if (rawFiles['vehicles']) {
    const vehJson = await parseXmlString(rawFiles['vehicles']);
    if (vehJson && vehJson.vehicles && vehJson.vehicles.vehicle) {
      const vehList = Array.isArray(vehJson.vehicles.vehicle) ? vehJson.vehicles.vehicle : [vehJson.vehicles.vehicle];
      vehList.forEach(v => {
        const fId = String(v.farmId || "0");
        const farmKey = `farm_${fId}`;
        const item = {
          id: v.id,
          filename: v.filename,
          age: v.age,
          price: v.price,
          operatingTime: v.operatingTime,
          fillLevels: v.fillUnit ? v.fillUnit : null
        };

        if (fId === "0") {
          aggregated.unowned.vehicles.push(item);
        } else if (aggregated.farms[farmKey]) {
          aggregated.farms[farmKey].vehicles.push(item);
        }
      });
    }
  }

  // 3. Process placeables.xml
  if (rawFiles['placeables']) {
    const plcJson = await parseXmlString(rawFiles['placeables']);
    if (plcJson && plcJson.placeables && plcJson.placeables.placeable) {
      const plcList = Array.isArray(plcJson.placeables.placeable) ? plcJson.placeables.placeable : [plcJson.placeables.placeable];
      plcList.forEach(p => {
        const fId = String(p.farmId || "0");
        const farmKey = `farm_${fId}`;
        const item = {
          id: p.id,
          filename: p.filename,
          position: p.position,
          age: p.age,
          price: p.price
        };

        if (fId === "0") {
          aggregated.unowned.placeables.push(item);
        } else if (aggregated.farms[farmKey]) {
          aggregated.farms[farmKey].placeables.push(item);
        }
      });
    }
  }

  // 4. Process farms_statistics.xml (if present)
  if (rawFiles['farms_statistics']) {
    const statsJson = await parseXmlString(rawFiles['farms_statistics']);
    if (statsJson && statsJson.statistics && statsJson.statistics.farm) {
      const statList = Array.isArray(statsJson.statistics.farm) ? statsJson.statistics.farm : [statsJson.statistics.farm];
      statList.forEach(s => {
        const fId = String(s.farmId || s.id);
        const farmKey = `farm_${fId}`;
        if (aggregated.farms[farmKey]) {
          aggregated.farms[farmKey].stats = s;
        }
      });
    }
  }

  return aggregated;
}

// SECTION 6: SMART PIPELINE EXECUTION
async function runPipeline() {
  console.log("📡 [1/4] Running Pre-Flight Check against Web Stats API...");
  const statsData = await fetchStatsApi();
  const activePlayers = statsData.players;

  // Retrieve timestamp of last full savegame download
  let lastFullSyncIso = null;
  try {
    const snap = await db.ref('fs25/lastFullSaveSync').once('value');
    lastFullSyncIso = snap.val();
  } catch (e) {}

  const lastSyncMs = lastFullSyncIso ? new Date(lastFullSyncIso).getTime() : 0;
  const hoursSinceLastFullSync = (Date.now() - lastSyncMs) / (1000 * 60 * 60);

  console.log(`📊 Active Players: ${activePlayers} | Hours since last full save sync: ${hoursSinceLastFullSync.toFixed(1)}h`);

  // SMART SCHEDULING LOGIC:
  if (activePlayers === 0 && hoursSinceLastFullSync < 24 && lastSyncMs > 0) {
    console.log("💤 Server Idle (0 players) & full sync performed < 24h ago.");
    console.log("⚡ Updating live heartbeat and exiting cleanly.");

    const idlePayload = {
      activePlayers: 0,
      lastUpdated: new Date().toISOString(),
      liveMapImage: MAP_IMAGE_URL
    };
    if (statsData.text) {
      idlePayload.stats_raw = statsData.text;
      idlePayload.stats_xml_raw = statsData.text;
    }

    await db.ref('fs25').update(idlePayload);
    process.exit(0);
  }

  console.log(activePlayers > 0 
    ? `🔥 Active player detected (${activePlayers} online). Proceeding with full 16-min savegame sync...`
    : `⏰ 24-Hour maintenance interval reached (${hoursSinceLastFullSync.toFixed(1)}h). Running full savegame sync...`
  );

  let detectedSlot = statsData.activeSlot || null;

  const masterPayload = {
    activePlayers: activePlayers,
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    lastFullSaveSync: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" }
  };

  if (statsData.text) {
    masterPayload.stats_xml_raw = statsData.text;
    masterPayload.stats_raw = statsData.text;
  }

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Writing stats feed only.");
    await db.ref('fs25').update(masterPayload);
    process.exit(0);
  }

  console.log(`📡 [2/4] Connecting to FTP at ${ftpHost}:${ftpPort}...`);
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

    // 1. Check Server Config Files for Active Savegame Slot
    const configPaths = [
      'dedicated_server/dedicatedServerConfig.xml',
      'profile/dedicated_server/dedicatedServerConfig.xml',
      'dedicatedServerConfig.xml',
      'profile/dedicatedServerConfig.xml'
    ];

    for (const cfg of configPaths) {
      try {
        const cfgXml = await downloadFtpFileToString(client, cfg);
        if (cfgXml) {
          const slotMatch = cfgXml.match(/savegameSlot="(\d+)"/i) || cfgXml.match(/savegame="(\d+)"/i) || cfgXml.match(/<savegame>(\d+)<\/savegame>/i);
          if (slotMatch) {
            detectedSlot = slotMatch[1];
            console.log(`🎯 Active save slot verified from config: Slot #${detectedSlot}`);
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Scan Directory Timestamps
    const rootList = await client.list();
    let profileList = [];
    try { profileList = await client.list('profile'); } catch (e) {}

    const allDiscoveredFolders = [];

    profileList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame') && !f.name.toLowerCase().includes('backup')).forEach(f => {
      allDiscoveredFolders.push({
        path: `profile/${f.name}`,
        name: f.name,
        slotNumber: (f.name.match(/\d+/) || ["3"])[0],
        date: new Date(f.rawModifiedAt || f.modifiedAt || 0).getTime()
      });
    });

    rootList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame') && !f.name.toLowerCase().includes('backup')).forEach(f => {
      allDiscoveredFolders.push({
        path: f.name,
        name: f.name,
        slotNumber: (f.name.match(/\d+/) || ["3"])[0],
        date: new Date(f.rawModifiedAt || f.modifiedAt || 0).getTime()
      });
    });

    allDiscoveredFolders.sort((a, b) => b.date - a.date);

    let activeSavePath = null;

    if (detectedSlot) {
      const match = allDiscoveredFolders.find(f => f.slotNumber === String(detectedSlot));
      if (match) activeSavePath = match.path;
    }

    if (!activeSavePath && allDiscoveredFolders.length > 0) {
      activeSavePath = allDiscoveredFolders[0].path;
      detectedSlot = allDiscoveredFolders[0].slotNumber;
      console.log(`🎯 Auto-selected most recently modified save directory: [ ${activeSavePath} ]`);
    }

    if (!activeSavePath) {
      activeSavePath = "profile/savegame3";
      detectedSlot = "3";
    }

    masterPayload.activeSaveSlot = String(detectedSlot);
    console.log(`📂 [3/4] Pulling XML telemetry files from: [ ${activeSavePath} ] (Slot #${detectedSlot})`);

    const fileList = await client.list(activeSavePath);
    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    console.log(`📄 Found ${readableFiles.length} files. Synchronizing into Firebase /fs25...`);

    const rawFileCache = {};

    for (const file of readableFiles) {
      const remoteFilePath = `${activeSavePath}/${file.name}`;
      const rawBaseName = file.name.replace(/\.(xml|txt)$/i, '');

      try {
        const content = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXml(content);
        if (cleanContent) {
          masterPayload[`${rawBaseName}_raw`] = cleanContent;
          masterPayload[rawBaseName] = cleanContent;
          rawFileCache[rawBaseName] = cleanContent;
          console.log(`  -> Synced: ${file.name} (${cleanContent.length} bytes)`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    // Process & group all items by Farm
    console.log("🚜 Aggregating entities by Farm ID...");
    masterPayload.farms_aggregated = await buildFarmsAggregation(rawFileCache);

    // 3. Write Master Payload strictly to /fs25
    console.log("💾 [4/4] Writing complete atomic payload to Firebase /fs25...");
    await db.ref('fs25').set(masterPayload);

    console.log(`🏆 Active Savegame (Slot #${detectedSlot}) successfully synchronized to Firebase /fs25!`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    await db.ref('fs25').update(masterPayload);
    client.close();
    process.exit(0);
  }
}

runPipeline();
