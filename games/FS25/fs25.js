/* ============================================================================
 * File: fs25.js
 * Location: ./fs25.js
 * Deployment Timestamp: Sun, Aug 30, 2026, 12:25:00 (EDT - New York)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: FS25 Optimized G-Portal Telemetry Pipeline.
 *              Scans all XML, text, and log files, parses live stats XML,
 *              extracts deep fleet/agronomy/economy telemetry, cross-references
 *              /FS25_Mods_Info, and performs a complete overwrite (.set) to Firebase.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');
const { DOMParser } = require('@xmldom/xmldom');

// SECTION 1: SAFETY FAILSAFE
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Execution exceeded 5 minutes. Exiting.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing FS25 Optimized Telemetry Pipeline for Server 144.126.153.115...");

// SECTION 2: FIREBASE ADMIN INITIALIZATION
const firebaseConfig = {
  apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
  authDomain: "entertainment-71888.firebaseapp.com",
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
  projectId: "entertainment-71888",
  storageBucket: "entertainment-71888.firebasestorage.app",
  messagingSenderId: "660524340277",
  appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
  measurementId: "G-JDNSLD3GFE"
};

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
    databaseURL: firebaseConfig.databaseURL
  });
}

const db = admin.database();
const ftpClient = new Client();

// SECTION 3: FTP & NETWORK CONFIG
const ftpConfig = {
  host: process.env.FTP_HOST || '144.126.153.115',
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  connTimeout: 20000,
  pasvTimeout: 20000,
  keepalive: 10000
};

const STATS_URL = "http://144.126.153.115:8300/feed/dedicated-server-stats.xml?code=3FvqSlOsYKckfauM";

// SECTION 4: NETWORK & FTP HELPERS
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
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
}

function downloadFileBuffer(client, remotePath) {
  return new Promise((resolve, reject) => {
    client.get(remotePath, (err, stream) => {
      if (err) return reject(err);
      const chunks = [];
      stream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', streamErr => reject(streamErr));
    });
  });
}

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

function parseXmlString(xmlStr) {
  if (!xmlStr || typeof xmlStr !== 'string' || !xmlStr.includes('<')) return null;
  try {
    return new DOMParser().parseFromString(xmlStr.trim(), "text/xml");
  } catch (e) {
    return null;
  }
}

function sanitizeFirebaseKey(key) {
  return key.replace(/[\.\$\#\[\]\/]/g, '_');
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

function formatName(str) {
  if (!str) return 'GENERAL ITEM';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('FS25_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase().trim();
}

// SECTION 5: ADVANCED TELEMETRY PARSERS

/**
 * 1. Log Parser: Captures Mod Errors, Warnings, and Player Events
 */
function parseServerLogDetailed(rawLogText) {
  if (!rawLogText) return { errors: [], events: [] };
  const lines = rawLogText.split(/\r?\n/);
  const errors = [];
  const events = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.includes("Error:") || trimmed.includes("Warning:") || trimmed.includes("invalid fillType") || trimmed.includes("invalid fruitType")) {
      errors.push({
        timestamp: trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)?.[1] || "SERVER",
        message: trimmed
      });
    }

    if (trimmed.includes("joined the game") || trimmed.includes("lost connection") || trimmed.includes("Game saved successfully")) {
      events.push({
        timestamp: trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)?.[1] || "SERVER",
        message: trimmed
      });
    }
  });

  return { errors: errors.slice(-50), events: events.slice(-50) };
}

/**
 * 2. Deep Vehicle Parser: Drivers, Coordinates, Attachments, Fill Levels
 */
function parseDetailedVehicles(vehXmlDoc) {
  if (!vehXmlDoc || !vehXmlDoc.getElementsByTagName) return [];
  const vehicles = [];
  const nodes = vehXmlDoc.getElementsByTagName("vehicle");

  for (let i = 0; i < nodes.length; i++) {
    const v = nodes[i];
    const name = formatName(v.getAttribute("name") || v.getAttribute("filename"));
    const id = v.getAttribute("id") || String(i + 1);
    const farmId = v.getAttribute("farmId") || "0";
    
    const posStr = v.getAttribute("position") || "0 0 0";
    const posParts = posStr.split(" ").map(Number);
    const posX = posParts[0] || 0;
    const posZ = posParts[2] || 0;

    const enterable = v.getElementsByTagName("enterable")[0];
    const driverName = enterable ? enterable.getAttribute("activeDriverFilename") || enterable.getAttribute("driverName") : null;
    const isOccupied = !!driverName || enterable?.getAttribute("isEntered") === "true";

    const fillUnits = [];
    const fillNodes = v.getElementsByTagName("fillUnit");
    for (let j = 0; j < fillNodes.length; j++) {
      const f = fillNodes[j];
      const fillType = f.getAttribute("fillType");
      const fillLevel = parseFloat(f.getAttribute("fillLevel") || "0");
      if (fillType && fillType !== "UNKNOWN" && fillLevel > 0) {
        fillUnits.push({ fillType: formatName(fillType), fillLevel: Math.round(fillLevel) });
      }
    }

    const attachments = [];
    const attachNodes = v.getElementsByTagName("relation");
    for (let k = 0; k < attachNodes.length; k++) {
      const attId = attachNodes[k].getAttribute("attachedVehicleId");
      if (attId) attachments.push(attId);
    }

    vehicles.push({
      id,
      name,
      farmId,
      position: { x: posX, z: posZ },
      isOccupied,
      driverName: driverName ? formatName(driverName) : null,
      fillUnits,
      attachments
    });
  }
  return vehicles;
}

/**
 * 3. Farmland Agronomy Parser
 */
function parseFieldAgronomy(farmlandXmlDoc) {
  if (!farmlandXmlDoc || !farmlandXmlDoc.getElementsByTagName) return [];
  const fields = [];
  const nodes = farmlandXmlDoc.getElementsByTagName("farmland");

  for (let i = 0; i < nodes.length; i++) {
    const f = nodes[i];
    const id = f.getAttribute("id");
    const farmId = f.getAttribute("farmId") || f.getAttribute("owner") || "0";
    const area = parseFloat(f.getAttribute("area") || "0").toFixed(2);

    fields.push({
      id,
      farmId,
      areaAcres: (area * 2.47105).toFixed(2),
      growthStage: f.getAttribute("growthState") || "Growing",
      fertilizerLevel: f.getAttribute("fertilizedLevel") || "100%",
      limeRequired: f.getAttribute("limeState") === "1",
      weedsState: f.getAttribute("weedState") || "None",
      stonesState: f.getAttribute("stoneState") || "Clean",
      plowRequired: f.getAttribute("plowState") === "1"
    });
  }
  return fields;
}

/**
 * 4. Commodity Price Economy Analyzer
 */
function parseCommodityEconomy(placeablesXmlDoc) {
  if (!placeablesXmlDoc || !placeablesXmlDoc.getElementsByTagName) return [];
  const economyMap = {};
  const placeables = placeablesXmlDoc.getElementsByTagName("placeable");

  for (let i = 0; i < placeables.length; i++) {
    const p = placeables[i];
    const stationName = formatName(p.getAttribute("filename"));
    const stats = p.getElementsByTagName("stats");

    for (let j = 0; j < stats.length; j++) {
      const s = stats[j];
      const fillType = formatName(s.getAttribute("fillType"));
      const price = parseFloat(s.getAttribute("meanValue") || s.getAttribute("price") || "0");

      if (fillType && price > 0) {
        if (!economyMap[fillType] || price > economyMap[fillType].bestPrice) {
          economyMap[fillType] = {
            crop: fillType,
            bestPrice: Math.round(price),
            bestBuyer: stationName
          };
        }
      }
    }
  }
  return Object.values(economyMap);
}

/**
 * 5. Contracts & Missions Parser
 */
function parseMissionContracts(missionsXmlDoc) {
  if (!missionsXmlDoc || !missionsXmlDoc.getElementsByTagName) return [];
  const contracts = [];
  const nodes = missionsXmlDoc.getElementsByTagName("mission");

  for (let i = 0; i < nodes.length; i++) {
    const m = nodes[i];
    contracts.push({
      id: m.getAttribute("id") || String(i + 1),
      type: formatName(m.getAttribute("type") || "Harvest"),
      fieldId: m.getAttribute("fieldId") || "N/A",
      reward: Math.round(parseFloat(m.getAttribute("reward") || "0")),
      reimbursement: Math.round(parseFloat(m.getAttribute("reimbursement") || "0")),
      status: m.getAttribute("status") === "1" ? "Active" : "Available"
    });
  }
  return contracts;
}

// SECTION 6: MAIN PIPELINE EXECUTION
async function runMainPipeline() {
  let activePlayers = 0;
  let rawStatsXml = "";

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

  ftpClient.on('ready', async function() {
    console.log("📡 FTP Uplink Connected to 144.126.153.115. Resolving telemetry & /FS25_Mods_Info...");

    try {
      // 1. Pull Crossplay Mod Metadata from /FS25_Mods_Info
      let fs25ModsCrossplayData = {};
      try {
        const modsSnap = await db.ref('FS25_Mods_Info').once('value');
        fs25ModsCrossplayData = modsSnap.val() || {};
        console.log(`🔗 Cross-Referenced ${Object.keys(fs25ModsCrossplayData).length} records from /FS25_Mods_Info.`);
      } catch (e) {
        console.warn("⚠️ Could not fetch /FS25_Mods_Info node:", e.message);
      }

      // 2. Download and Parse Server log.txt
      let rawLogText = "";
      const logLocations = ['log.txt', '/log.txt', 'profile/log.txt', '/profile/log.txt'];
      for (const logPath of logLocations) {
        try {
          rawLogText = await downloadFileBuffer(ftpClient, logPath);
          if (rawLogText && rawLogText.length > 0) {
            console.log(`📄 Successfully pulled live server log from [ ${logPath} ]`);
            break;
          }
        } catch (e) {}
      }

      const logAnalysis = parseServerLogDetailed(rawLogText);

      // 3. Dynamic Auto-Discovery for Active Savegame Directory
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

      const slotMatch = targetFolder.match(/\d+/);
      const activeSlotNumber = slotMatch ? slotMatch[0] : "1";
      console.log(`🎯 DYNAMICALLY TARGETED ACTIVE SAVE: [ ${targetFolder} ] (Slot #${activeSlotNumber})`);

      // 4. Download Telemetry Files (.xml, .txt, .cfg, .ini)
      let fileList = await safeListFtpDir(ftpClient, targetFolder);
      if (fileList.length === 0 && !targetFolder.startsWith('/')) {
        fileList = await safeListFtpDir(ftpClient, `/${targetFolder}`);
      }

      const readableFiles = fileList.filter(f => f.type !== 'd' && (
        f.name.toLowerCase().endsWith('.xml') ||
        f.name.toLowerCase().endsWith('.txt') ||
        f.name.toLowerCase().endsWith('.cfg') ||
        f.name.toLowerCase().endsWith('.ini')
      ));

      console.log(`📄 Found ${readableFiles.length} telemetry files inside [ ${targetFolder} ]`);

      // Master Payload Dictionary with all required frontend keys
      const masterPayload = {
        activePlayers: activePlayers,
        activeSaveSlot: activeSlotNumber,
        lastUpdated: new Date().toISOString(),
        
        modErrors: logAnalysis.errors,
        serverEvents: logAnalysis.events,
        serverLog_raw: rawLogText.substring(0, 100000),

        modCatalogCrossplay: fs25ModsCrossplayData,

        config: {
          appId: firebaseConfig.appId,
          measurementId: firebaseConfig.measurementId
        }
      };

      // Critical Frontend Hook: stats_xml_raw & stats_raw sync
      if (rawStatsXml && rawStatsXml.length > 0) {
        masterPayload.stats_xml_raw = rawStatsXml;
        masterPayload.stats_raw = rawStatsXml;
        masterPayload.dedicatedServerConfig_raw = rawStatsXml;
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

      const rawXmlStore = {};

      for (const fileInfo of readableFiles) {
        const rawBaseName = fileInfo.name.replace(/\.(xml|txt|cfg|ini)$/i, '');
        const lowerBaseName = rawBaseName.toLowerCase();
        const canonicalKey = sanitizeFirebaseKey(keyMap[lowerBaseName] || rawBaseName);
        const remoteFilePath = `${targetFolder}/${fileInfo.name}`.replace('//', '/');

        try {
          const rawContent = await downloadFileBuffer(ftpClient, remoteFilePath);
          const cleanContent = sanitizeXmlContent(rawContent);

          if (cleanContent && cleanContent.length > 0) {
            rawXmlStore[lowerBaseName] = cleanContent;
            // Write both key formats so frontend selectors match seamlessly
            masterPayload[`${canonicalKey}_raw`] = cleanContent;
            masterPayload[canonicalKey] = cleanContent;
          }
        } catch (fileErr) {
          console.error(`❌ Download failed for ${fileInfo.name}:`, fileErr.message);
        }
      }

      // 5. Parse Structured Telemetry Datasets
      const vehDoc = parseXmlString(rawXmlStore['vehicles']);
      const landDoc = parseXmlString(rawXmlStore['farmland'] || rawXmlStore['farmlands']);
      const placeDoc = parseXmlString(rawXmlStore['placeables']);
      const missDoc = parseXmlString(rawXmlStore['missions']);

      masterPayload.detailedFleet = parseDetailedVehicles(vehDoc);
      masterPayload.fieldAgronomy = parseFieldAgronomy(landDoc);
      masterPayload.commodityEconomy = parseCommodityEconomy(placeDoc);
      masterPayload.activeContracts = parseMissionContracts(missDoc);

      // 6. Write Master Payload to Firebase RTDB (/fs25)
      try {
        await db.ref('fs25').set(masterPayload);
        console.log(`🏆 TOTAL OVERWRITE SUCCESSFUL! Firebase /fs25 updated with ALL G-Portal telemetry on entertainment-71888.`);
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
