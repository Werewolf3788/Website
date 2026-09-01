/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-01 08:15:00 (EDT - 24hr New York Time)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Smart FS25 Dynamic Savegame Ingestion Engine.
 *              - Dual HTTP/HTTPS support.
 *              - Groups vehicles, placeables, and stats by Farm.
 *              - Pulls /FS25_Mods_Info catalog metadata (images, URLs, author,
 *                description) and enriches active server mods into /fs25/activeMods.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4 Minutes Failsafe)
// ============================================================================
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: FIREBASE ADMIN INITIALIZATION
// ============================================================================
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

// ============================================================================
// SECTION 3: NETWORK & HOST CONFIGURATION (Dual HTTP / HTTPS Support)
// ============================================================================
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

// Endpoints supporting plain HTTP or HTTPS reverse proxies
const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

// ============================================================================
// SECTION 4: HELPER FUNCTIONS & CLEANERS
// ============================================================================
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

function cleanEntityName(filepath) {
  if (!filepath) return "Unknown Item";
  const filename = filepath.split('/').pop().replace(/\.xml$/i, '');
  return filename
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalizes strings for loose dictionary lookups
function normalizeKey(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
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

// Fetches your manual mod info database from /FS25_Mods_Info
async function fetchModsCatalog() {
  try {
    const snap = await db.ref('FS25_Mods_Info').once('value');
    const data = snap.val();
    if (!data) return {};
    return data;
  } catch (err) {
    console.warn("⚠️ Could not read /FS25_Mods_Info catalog:", err.message);
    return {};
  }
}

// ============================================================================
// SECTION 5: JSON DATA STRUCTURING & MOD ENRICHMENT ENGINE
// ============================================================================
async function buildCleanStructuredSave(rawFiles, modsCatalog, rawConfigXml) {
  const structured = {
    summary: {
      totalFarms: 0,
      totalVehicles: 0,
      totalPlaceables: 0,
      totalActiveMods: 0
    },
    activeMods: {},
    farms: {},
    unowned: {
      name: "Map Environment / Dealer",
      vehicles: [],
      placeables: []
    }
  };

  // Build quick-lookup dictionary for /FS25_Mods_Info
  const catalogLookup = {};
  Object.keys(modsCatalog).forEach(key => {
    const item = modsCatalog[key];
    const directKey = normalizeKey(key);
    catalogLookup[directKey] = item;

    if (item.name) catalogLookup[normalizeKey(item.name)] = item;
    if (item.modName) catalogLookup[normalizeKey(item.modName)] = item;
    if (item.fileName) catalogLookup[normalizeKey(item.fileName)] = item;
    if (item.title) catalogLookup[normalizeKey(item.title)] = item;
  });

  // 1. Extract Active Mods from dedicatedServerConfig.xml and careerSavegame.xml
  const discoveredModNames = new Set();

  if (rawConfigXml) {
    const cfgJson = await parseXmlString(rawConfigXml);
    if (cfgJson && cfgJson.dedicatedServer && cfgJson.dedicatedServer.mods && cfgJson.dedicatedServer.mods.mod) {
      const mList = Array.isArray(cfgJson.dedicatedServer.mods.mod) ? cfgJson.dedicatedServer.mods.mod : [cfgJson.dedicatedServer.mods.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m._ || m.name || m.filename || "");
        if (modId) discoveredModNames.add(modId.trim());
      });
    }
  }

  if (rawFiles['careerSavegame']) {
    const careerJson = await parseXmlString(rawFiles['careerSavegame']);
    if (careerJson && careerJson.careerSavegame && careerJson.careerSavegame.mod) {
      const mList = Array.isArray(careerJson.careerSavegame.mod) ? careerJson.careerSavegame.mod : [careerJson.careerSavegame.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m.modName || m.name || m.filename || m._ || "");
        if (modId) discoveredModNames.add(modId.trim());
      });
    }
  }

  // Enrich discovered active mods with /FS25_Mods_Info metadata
  discoveredModNames.forEach(rawModName => {
    const cleanModKey = rawModName.replace(/\.zip$/i, '');
    const lookupKey = normalizeKey(cleanModKey);
    const catalogInfo = catalogLookup[lookupKey] || null;

    structured.activeMods[cleanModKey] = {
      modKey: cleanModKey,
      name: catalogInfo && catalogInfo.name ? catalogInfo.name : cleanEntityName(cleanModKey),
      image: catalogInfo && (catalogInfo.image || catalogInfo.imageUrl || catalogInfo.icon) ? (catalogInfo.image || catalogInfo.imageUrl || catalogInfo.icon) : null,
      pageUrl: catalogInfo && (catalogInfo.pageUrl || catalogInfo.url || catalogInfo.link) ? (catalogInfo.pageUrl || catalogInfo.url || catalogInfo.link) : null,
      platform: catalogInfo && catalogInfo.platform ? catalogInfo.platform : "PC / Mac",
      description: catalogInfo && catalogInfo.description ? catalogInfo.description : "",
      author: catalogInfo && catalogInfo.author ? catalogInfo.author : "Unknown / ModHub",
      updatedNumber: catalogInfo && (catalogInfo.updatedNumber || catalogInfo.version) ? (catalogInfo.updatedNumber || catalogInfo.version) : "1.0.0.0",
      matchedInCatalog: !!catalogInfo
    };
  });

  structured.summary.totalActiveMods = Object.keys(structured.activeMods).length;

  // 2. Parse farms.xml
  if (rawFiles['farms']) {
    const farmsJson = await parseXmlString(rawFiles['farms']);
    if (farmsJson && farmsJson.farms && farmsJson.farms.farm) {
      const farmList = Array.isArray(farmsJson.farms.farm) ? farmsJson.farms.farm : [farmsJson.farms.farm];
      farmList.forEach(f => {
        const fId = String(f.farmId || f.id || '1');
        structured.farms[`farm_${fId}`] = {
          farmId: fId,
          name: f.name || `Farm ${fId}`,
          finances: {
            money: parseFloat(f.money || 0),
            loan: parseFloat(f.loan || 0),
            balance: parseFloat(f.money || 0) - parseFloat(f.loan || 0)
          },
          color: f.color || "1",
          players: f.players ? (Array.isArray(f.players.player) ? f.players.player : [f.players.player]) : [],
          vehicles: [],
          placeables: [],
          statistics: {}
        };
      });
    }
  }

  if (Object.keys(structured.farms).length === 0) {
    structured.farms['farm_1'] = {
      farmId: "1",
      name: "Main Farm",
      finances: { money: 0, loan: 0, balance: 0 },
      color: "1",
      players: [],
      vehicles: [],
      placeables: [],
      statistics: {}
    };
  }

  // 3. Parse vehicles.xml & cross-match with Mod Catalog
  if (rawFiles['vehicles']) {
    const vehJson = await parseXmlString(rawFiles['vehicles']);
    if (vehJson && vehJson.vehicles && vehJson.vehicles.vehicle) {
      const vehList = Array.isArray(vehJson.vehicles.vehicle) ? vehJson.vehicles.vehicle : [vehJson.vehicles.vehicle];
      vehList.forEach(v => {
        const fId = String(v.farmId || "0");
        const farmKey = `farm_${fId}`;
        const filename = v.filename || "";

        // Check if vehicle originates from a mod folder/file
        let matchedMod = null;
        for (const [mKey, mVal] of Object.entries(structured.activeMods)) {
          if (filename.toLowerCase().includes(mKey.toLowerCase())) {
            matchedMod = mVal;
            break;
          }
        }

        const cleanItem = {
          id: v.id || "0",
          name: matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename),
          file: filename,
          image: matchedMod ? matchedMod.image : null,
          price: parseFloat(v.price || 0),
          operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
          ageMonths: parseInt(v.age || 0, 10),
          fillLevel: v.fillUnit && v.fillUnit.unit ? v.fillUnit.unit : null
        };

        structured.summary.totalVehicles++;

        if (fId === "0") {
          structured.unowned.vehicles.push(cleanItem);
        } else if (structured.farms[farmKey]) {
          structured.farms[farmKey].vehicles.push(cleanItem);
        }
      });
    }
  }

  // 4. Parse placeables.xml
  if (rawFiles['placeables']) {
    const plcJson = await parseXmlString(rawFiles['placeables']);
    if (plcJson && plcJson.placeables && plcJson.placeables.placeable) {
      const plcList = Array.isArray(plcJson.placeables.placeable) ? plcJson.placeables.placeable : [plcJson.placeables.placeable];
      plcList.forEach(p => {
        const fId = String(p.farmId || "0");
        const farmKey = `farm_${fId}`;
        const filename = p.filename || "";

        let matchedMod = null;
        for (const [mKey, mVal] of Object.entries(structured.activeMods)) {
          if (filename.toLowerCase().includes(mKey.toLowerCase())) {
            matchedMod = mVal;
            break;
          }
        }

        const cleanItem = {
          id: p.id || "0",
          name: matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename),
          file: filename,
          image: matchedMod ? matchedMod.image : null,
          position: p.position || null,
          price: parseFloat(p.price || 0),
          ageMonths: parseInt(p.age || 0, 10)
        };

        structured.summary.totalPlaceables++;

        if (fId === "0") {
          structured.unowned.placeables.push(cleanItem);
        } else if (structured.farms[farmKey]) {
          structured.farms[farmKey].placeables.push(cleanItem);
        }
      });
    }
  }

  // 5. Parse farms_statistics.xml
  if (rawFiles['farms_statistics']) {
    const statsJson = await parseXmlString(rawFiles['farms_statistics']);
    if (statsJson && statsJson.statistics && statsJson.statistics.farm) {
      const statList = Array.isArray(statsJson.statistics.farm) ? statsJson.statistics.farm : [statsJson.statistics.farm];
      statList.forEach(s => {
        const fId = String(s.farmId || s.id);
        const farmKey = `farm_${fId}`;
        if (structured.farms[farmKey]) {
          structured.farms[farmKey].statistics = s;
        }
      });
    }
  }

  // 6. Parse careerSavegame.xml
  if (rawFiles['careerSavegame']) {
    const careerJson = await parseXmlString(rawFiles['careerSavegame']);
    if (careerJson && careerJson.careerSavegame) {
      const c = careerJson.careerSavegame;
      structured.gameInfo = {
        savegameName: c.savegameName || "FS25 Server",
        mapTitle: c.mapTitle || c.mapId || "Unknown Map",
        currentDay: parseInt(c.currentDay || 1, 10),
        dayTime: parseFloat(c.dayTime || 0),
        playTimeMinutes: parseFloat(c.playTime || 0)
      };
    }
  }

  structured.summary.totalFarms = Object.keys(structured.farms).length;
  return structured;
}

// ============================================================================
// SECTION 6: SMART PIPELINE EXECUTION
// ============================================================================
async function runPipeline() {
  console.log("📡 [1/4] Running Pre-Flight Check against Web Stats API...");
  const statsData = await fetchStatsApi();
  const activePlayers = statsData.players;

  // Retrieve mod catalogue from /FS25_Mods_Info
  console.log("📦 Loading reference catalogue from /FS25_Mods_Info...");
  const modsCatalog = await fetchModsCatalog();

  let lastFullSyncIso = null;
  try {
    const snap = await db.ref('fs25/lastFullSaveSync').once('value');
    lastFullSyncIso = snap.val();
  } catch (e) {}

  const lastSyncMs = lastFullSyncIso ? new Date(lastFullSyncIso).getTime() : 0;
  const hoursSinceLastFullSync = (Date.now() - lastSyncMs) / (1000 * 60 * 60);

  console.log(`📊 Active Players: ${activePlayers} | Hours since last full sync: ${hoursSinceLastFullSync.toFixed(1)}h`);

  // Smart idle check: exit in ~2s if server is inactive & synced < 24h ago
  if (activePlayers === 0 && hoursSinceLastFullSync < 24 && lastSyncMs > 0) {
    console.log("💤 Server Idle (0 players) & full sync performed < 24h ago.");
    console.log("⚡ Updating live heartbeat and exiting cleanly.");

    const idlePayload = {
      activePlayers: 0,
      lastUpdated: new Date().toISOString(),
      liveMapImage: MAP_IMAGE_URL
    };
    if (statsData.text) {
      idlePayload.raw_xml = { stats: statsData.text };
    }

    await db.ref('fs25').update(idlePayload);
    process.exit(0);
  }

  console.log(activePlayers > 0 
    ? `🔥 Active player detected (${activePlayers} online). Proceeding with full 16-min sync...`
    : `⏰ 24-Hour maintenance interval reached (${hoursSinceLastFullSync.toFixed(1)}h). Running full sync...`
  );

  let detectedSlot = statsData.activeSlot || null;

  const masterPayload = {
    activePlayers: activePlayers,
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    lastFullSaveSync: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" },
    raw_xml: {}
  };

  if (statsData.text) {
    masterPayload.raw_xml.stats = statsData.text;
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

    let rawServerConfigXml = "";

    // 1. Detect active savegame slot and capture server config XML
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
          rawServerConfigXml = sanitizeXml(cfgXml);
          const slotMatch = cfgXml.match(/savegameSlot="(\d+)"/i) || cfgXml.match(/savegame="(\d+)"/i) || cfgXml.match(/<savegame>(\d+)<\/savegame>/i);
          if (slotMatch) {
            detectedSlot = slotMatch[1];
            console.log(`🎯 Active save slot verified from config: Slot #${detectedSlot}`);
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Scan directories to determine active save directory
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
    console.log(`📂 [3/4] Pulling XML files from: [ ${activeSavePath} ] (Slot #${detectedSlot})`);

    const fileList = await client.list(activeSavePath);
    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    console.log(`📄 Found ${readableFiles.length} files. Synchronizing into clean JSON models...`);

    const rawFileCache = {};

    for (const file of readableFiles) {
      const remoteFilePath = `${activeSavePath}/${file.name}`;
      const rawBaseName = file.name.replace(/\.(xml|txt)$/i, '');

      try {
        const content = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXml(content);
        if (cleanContent) {
          masterPayload.raw_xml[rawBaseName] = cleanContent;
          rawFileCache[rawBaseName] = cleanContent;
          console.log(`  -> Downloaded: ${file.name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    // Convert raw XML files into clean structured JSON trees & enrich with /FS25_Mods_Info
    console.log("🚜 Structuring farms, active mods, vehicles, and placeables...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, modsCatalog, rawServerConfigXml);

    masterPayload.summary = cleanData.summary;
    masterPayload.gameInfo = cleanData.gameInfo || {};
    masterPayload.activeMods = cleanData.activeMods || {};
    masterPayload.farms = cleanData.farms;
    masterPayload.unowned = cleanData.unowned;

    // 3. Write Complete Atomic Payload to /fs25
    console.log("💾 [4/4] Writing clean enriched JSON tree to Firebase /fs25...");
    await db.ref('fs25').set(masterPayload);

    console.log(`🏆 Server data + Mods successfully enriched and saved to Firebase /fs25!`);
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
