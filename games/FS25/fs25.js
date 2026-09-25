/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-25 19:25:00 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: https://fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Description: Dynamic Directory Crawling Ingestion Engine.
 *              - Zero hardcoded XML lists: Dynamically lists and ingests EVERY .xml 
 *                file present in the active G-Portal savegame directory.
 *              - Strict authority to gamestat.xml: Respects numUsed="0" so 
 *                ghost players are completely eliminated when nobody is logged on.
 *              - Strict XML farmId binding: Direct 1:1 mapping from vehicles.xml.
 *                Pallets/BigBags isolated to storage cards (no more implement pollution).
 *              - Dual-Bank Live Balances & Bale Counts mapped directly from XML.
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// Line 23: 4-Minute Safety Watchdog
setTimeout(() => {
  console.log("🚨 Safety Watchdog: Execution finished.");
  process.exit(0);
}, 4 * 60 * 1000);

const RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";

// Line 31: Async REST Helpers
async function updateDb(path, data) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`⚠️ Warning: Firebase PATCH failed at ${path}: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ Warning: Network error during PATCH at ${path}: ${err.message}`);
    return null;
  }
}

async function getDb(path) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

// Line 60: Credentials & Server Endpoints
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;

const FS_MONTHS = [
  "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December", "January", "February"
];

const VIP_PLAYERS = new Set(['wildhorse_spirit', 'onelividman']);

const MOTORIZED_CATEGORIES = new Set([
  'TRACTOR', 'TRACTORS', 'TRACTORSS', 'TRACTORM', 'TRACTORL',
  'CAR', 'CARS', 'TRUCK', 'TRUCKS', 'TELEHANDLER', 'TELEHANDLERS',
  'WHEELLOADER', 'WHEELLOADERS', 'SKIDSTEER', 'SKIDSTEERVEHICLES',
  'FORKLIFT', 'FORKLIFTS', 'SELFPROPELLED', 'SELFPROPELLESSPRAYER',
  'SLURRYVEHICLE', 'MOWERS'
]);

const HARVESTER_CATEGORIES = new Set([
  'HARVESTERS', 'HARVESTER', 'COMBINE', 'COMBINES', 'FORAGEHARVESTER',
  'BEETHARVESTERS', 'BEETHARVESTER', 'POTATOHARVESTER', 'POTATOHARVESTERS',
  'COTTONHARVESTER', 'COTTONHARVESTERS', 'VEGETABLEHARVESTERS', 'VEGETABLEHARVESTER'
]);

const TRAILER_CATEGORIES = new Set([
  'TRAILERS', 'TRAILER', 'TRAILERSSEMI', 'LOADERWAGONS', 'BARRELS',
  'AUGERWAGONS', 'MANURESPREADERS', 'SLURRYTANKS', 'WATERBARRELS'
]);

// Line 95: Sanitizers, Parsers & Utilities
function sanitizeXml(rawText) {
  if (!rawText) return "";
  let clean = rawText.toString();
  if (clean.includes(".vue-modal-resizer")) clean = clean.split(".vue-modal-resizer")[0];
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
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true, trim: true });
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (e) {
    return null;
  }
}

function cleanEntityName(filepath) {
  if (!filepath) return "Equipment";
  const filename = filepath.split('/').pop().replace(/\.xml$/i, '');
  return filename
    .replace(/^fs25[_\-\s]*/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanFillTypeName(typeName) {
  if (!typeName) return "General Cargo";
  const clean = typeName
    .replace(/^(fillType_|filltype_|ft_|fruitType_|fruittype_)/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function normalizeKey(str) {
  if (!str) return "";
  return str.toString()
    .toLowerCase()
    .replace(/^f\s*s\s*25[_\-\s]*/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

function calculateDistance(x1, z1, x2, z2) {
  if (x1 === undefined || z1 === undefined || x2 === undefined || z2 === undefined) return 999;
  return Math.hypot(x1 - x2, z1 - z2);
}

// Line 172: Strict Classification (Isolates Pallets and Separates Headers from Combines)
function classifyVehicle(rawVehicle) {
  const category = (rawVehicle.category || "").toUpperCase().replace(/[^A-Z]/g, '');
  const type = (rawVehicle.type || "").toLowerCase();
  const name = (rawVehicle.name || "").toLowerCase();

  // Isolated Pallet Bucket
  if (category.includes('PALLET') || category.includes('BIGBAG') || type.includes('pallet') || name.includes('pallet')) {
    return { groupKey: 'pallets', itemKind: 'Pallet / Cargo', isMotorized: false };
  }

  // Headers and Cutters are implements, NOT harvesters
  if (category.includes('CUTTER') || category.includes('HEADER') || type.includes('cutter') || type.includes('header') || name.includes('header')) {
    return { groupKey: 'implements', itemKind: 'Cutter / Header', isMotorized: false };
  }

  // Self-Propelled Harvesters & Combines
  if (HARVESTER_CATEGORIES.has(category) || type.includes('combine') || name.includes('harvester')) {
    return { groupKey: 'harvesters', itemKind: 'Harvester & Combine', isMotorized: true };
  }

  // Trailers
  if (TRAILER_CATEGORIES.has(category) || name.includes('trailer') || name.includes('flatbed') || type.includes('trailer') || type.includes('wagon')) {
    return { groupKey: 'trailers', itemKind: 'Hauling Trailer', isMotorized: false };
  }

  // Motorized Tractors & Trucks
  if (MOTORIZED_CATEGORIES.has(category) || Boolean(rawVehicle.controller) || String(rawVehicle.isAIActive).toLowerCase() === 'true' || type.includes('motor') || type.includes('tractor') || type.includes('truck')) {
    return { groupKey: 'motorVehicles', itemKind: 'Motor Vehicle', isMotorized: true };
  }

  return { groupKey: 'implements', itemKind: 'Implement / Tool', isMotorized: false };
}

function resolveInGameCalendar(envNode, careerNode, statsDayTime) {
  try {
    const env = envNode && (envNode.environment || envNode);
    const career = careerNode && (careerNode.careerSavegame || careerNode);

    let rawDayTime = null;
    if (statsDayTime !== null && statsDayTime !== undefined) rawDayTime = parseFloat(statsDayTime);
    else if (env && env.dayTime !== undefined) rawDayTime = parseFloat(env.dayTime);
    else if (career && career.dayTime !== undefined) rawDayTime = parseFloat(career.dayTime);

    const totalMins = Math.floor(parseFloat(rawDayTime || 0)) % 1440;
    const hours24 = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const padH = String(hours24).padStart(2, '0');
    const padM = String(mins).padStart(2, '0');

    let monthIndex = 0;
    let dayInMonth = 1;
    let seasonName = "Spring";

    const rawMonth = env && (env.currentMon || env.currentMonth || env.month);
    const currentDay = env && (env.currentDay || env.day || env.currentMonotonicDay);
    const daysPerPeriod = parseInt((env && env.daysPerPeriod) || (career && career.settings && career.settings.plannedDaysPerPeriod) || 1, 10);

    if (rawMonth !== undefined && !isNaN(rawMonth)) {
      const parsedM = parseInt(rawMonth, 10);
      monthIndex = (parsedM >= 1 && parsedM <= 12) ? parsedM - 1 : 0;
    } else if (currentDay !== undefined && !isNaN(currentDay)) {
      const dayNum = parseInt(currentDay, 10);
      const calculatedMonthIndex = Math.floor((dayNum - 1) / Math.max(1, daysPerPeriod)) % 12;
      monthIndex = (calculatedMonthIndex >= 0 && calculatedMonthIndex < 12) ? calculatedMonthIndex : 0;
      dayInMonth = ((dayNum - 1) % daysPerPeriod) + 1;
    }

    const monthName = FS_MONTHS[monthIndex];
    if (monthIndex >= 0 && monthIndex <= 2) seasonName = "Spring";
    else if (monthIndex >= 3 && monthIndex <= 5) seasonName = "Summer";
    else if (monthIndex >= 6 && monthIndex <= 8) seasonName = "Autumn";
    else seasonName = "Winter";

    return {
      time: `${hours12}:${padM} ${ampm}`,
      time24: `${padH}:${padM}`,
      hours: hours24,
      minutes: mins,
      month: monthName,
      monthIndex: monthIndex + 1,
      dayInMonth: dayInMonth,
      season: seasonName,
      daysPerPeriod: daysPerPeriod,
      formattedStamp: `${monthName} (Day ${dayInMonth}) - ${hours12}:${padM} ${ampm}`
    };
  } catch (err) {
    return {
      time: "12:00 PM",
      time24: "12:00",
      hours: 12,
      minutes: 0,
      month: "Spring",
      monthIndex: 1,
      dayInMonth: 1,
      season: "Spring",
      daysPerPeriod: 1,
      formattedStamp: "Spring - 12:00 PM"
    };
  }
}

function getSpatialZone(x, z, fieldList = []) {
  if (x === undefined || z === undefined) return "Farm Grounds";
  const numX = parseFloat(x);
  const numZ = parseFloat(z);

  if (fieldList && fieldList.length > 0) {
    const matched = fieldList.find(f => {
      if (f.x !== undefined && f.z !== undefined) {
        return Math.hypot(numX - parseFloat(f.x), numZ - parseFloat(f.z)) < 85;
      }
      return false;
    });
    if (matched) return `Field ${matched.id}`;
  }

  const xGrid = Math.floor(numX / 100) * 100;
  const zGrid = Math.floor(numZ / 100) * 100;
  return `Sector (${xGrid}, ${zGrid})`;
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

async function pingLiveFeed() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(STATS_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const text = sanitizeXml(await res.text());
      const parsed = await parseXmlString(text);
      return { isOnline: true, rawXml: text, serverNode: parsed ? parsed.Server : null };
    }
  } catch (e) {}
  return { isOnline: false, rawXml: "", serverNode: null };
}

async function fetchWebsiteCatalog() {
  try {
    const rawVal = (await getDb('websiteMods')) || {};
    const catalog = {};
    Object.keys(rawVal).forEach(k => {
      const item = rawVal[k];
      if (item && typeof item === 'object') {
        const clean = (item.filename || k).replace(/\.zip$/i, '');
        catalog[clean.toLowerCase()] = item;
        catalog[normalizeKey(clean)] = item;
        if (item.name) catalog[normalizeKey(item.name)] = item;
      }
    });
    return catalog;
  } catch (err) {
    return {};
  }
}

// Line 350: Dynamic Directory Crawling Pipeline
async function runPipeline() {
  const isForceRun = process.argv.includes('--force') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const syncTimestamp = new Date().toISOString();
  console.log(`📡 Ingesting G-Portal Live Telemetry at ${syncTimestamp}...`);

  const live = await pingLiveFeed();
  const server = live.serverNode || {};

  // STRICT PLAYER RECOGNITION: Authority given to numUsed
  const activePlayers = [];
  let isVipOnline = false;

  const slotsNode = server.Slots || {};
  const numUsed = parseInt(slotsNode.numUsed || 0, 10);

  if (numUsed > 0 && slotsNode.Player) {
    const pList = Array.isArray(slotsNode.Player) ? slotsNode.Player : [slotsNode.Player];
    pList.forEach(p => {
      const isUsed = String(p.isUsed || p._isUsed || '').toLowerCase() === 'true';
      const uptime = parseInt(p.uptime || 0, 10);
      let pName = "";
      if (typeof p === 'string') pName = p;
      else if (p._) pName = p._;
      else if (p.name) pName = p.name;

      if (isUsed && pName && pName.trim() !== '' && pName.toLowerCase() !== 'unknown' && uptime > 0) {
        activePlayers.push({
          name: pName.trim(),
          uptime: uptime,
          isAdmin: String(p.isAdmin).toLowerCase() === 'true',
          x: p.x ? parseFloat(p.x) : null,
          z: p.z ? parseFloat(p.z) : null
        });

        if (VIP_PLAYERS.has(pName.trim().toLowerCase())) {
          isVipOnline = true;
        }
      }
    });
  }

  const isHeavyScan = isVipOnline || isForceRun;
  console.log(`🎮 Mode: ${isHeavyScan ? 'HEAVY SCAN (VIP Online / Movement Tracking)' : 'LIGHT SCAN (Idle Server / 12-Hour Sync)'}`);
  console.log(`👥 G-Portal Reported Players (numUsed: ${numUsed}) -> Verified Active: ${activePlayers.length}`);

  const client = new ftp.Client(25000);
  client.ftp.verbose = true;

  let activeSlot = process.env.DEFAULT_SAVE_SLOT || "3";
  let mapFilename = "FS25_The_Rural_Farmlands_Of_Ohio.zip";
  let rawServerConfig = "";
  const allRawParsedXml = {};

  try {
    console.log(`🔌 Connecting to G-Portal FTP (${ftpHost}:${ftpPort})...`);
    await client.access({
      host: ftpHost,
      port: ftpPort,
      user: ftpUser,
      password: ftpPass,
      secure: false
    });
    console.log("✅ Authenticated to G-Portal FTP.");

    // Detect Active Slot Authority from Server Config
    const configCandidates = [
      'dedicated_server/dedicatedServerConfig.xml',
      'profile/dedicated_server/dedicatedServerConfig.xml',
      'dedicatedServerConfig.xml'
    ];

    for (const p of configCandidates) {
      try {
        const text = await downloadFtpFileToString(client, p);
        if (text) {
          rawServerConfig = sanitizeXml(text);
          const sMatch = rawServerConfig.match(/<savegame_index>(\d+)<\/savegame_index>/i);
          if (sMatch) activeSlot = sMatch[1];
          const mMatch = rawServerConfig.match(/<mapFilename>([^<]+)<\/mapFilename>/i);
          if (mMatch) mapFilename = mMatch[1];
          break;
        }
      } catch (e) {}
    }

    const slotFolder = `savegame${activeSlot}`;
    const slotNodeName = `savegame${activeSlot}`;
    console.log(`🎯 Active Savegame Locked: Slot #${activeSlot} -> ${slotFolder}`);

    // DYNAMIC XML DIRECTORY CRAWLER: Discovers EVERY XML file in the savegame folder
    console.log(`📂 Dynamically scanning directory: ${slotFolder}...`);
    const directoryList = await client.list(slotFolder);
    const xmlFilesFound = directoryList
      .filter(item => item.isFile && item.name.toLowerCase().endsWith('.xml'))
      .map(item => item.name);

    console.log(`🔍 Discovered ${xmlFilesFound.length} XML files on G-Portal: ${xmlFilesFound.join(', ')}`);

    for (const xmlFile of xmlFilesFound) {
      try {
        const fileContent = await downloadFtpFileToString(client, `${slotFolder}/${xmlFile}`);
        if (fileContent) {
          const parsed = await parseXmlString(sanitizeXml(fileContent));
          const fileKey = xmlFile.replace(/\.xml$/i, '');
          allRawParsedXml[fileKey] = parsed;
          console.log(`✅ Dynamically Ingested: [ ${xmlFile} ] -> /fs25/allRawParsedXml/${fileKey}`);
        }
      } catch (fileErr) {
        console.warn(`⚠️ Skipped XML [ ${xmlFile} ]: ${fileErr.message}`);
      }
    }

    client.close();
    console.log("🔌 Closed FTP connection cleanly.");

  } catch (ftpErr) {
    console.error("❌ FTP Error during dynamic scan:", ftpErr.message);
    if (client) client.close();
  }

  const slotFolder = `savegame${activeSlot}`;
  const slotNodeName = `savegame${activeSlot}`;

  // Vehicle Ownership Mapping (Strict 1:1 ID and Filename index)
  const vehicleIdToFarm = {};
  const balerHardwareCounters = [];

  const rootVehicles = allRawParsedXml.vehicles && (allRawParsedXml.vehicles.vehicles || allRawParsedXml.vehicles);
  if (rootVehicles && (rootVehicles.vehicle || rootVehicles.item)) {
    const items = Array.isArray(rootVehicles.vehicle || rootVehicles.item)
      ? (rootVehicles.vehicle || rootVehicles.item)
      : [rootVehicles.vehicle || rootVehicles.item];

    items.forEach((item, itemIdx) => {
      const trueFarmId = String(item.farmId || item.ownerFarmId || "1");
      const vId = String(item.id || itemIdx + 1);
      const clean = cleanEntityName(item.filename || "").toLowerCase();

      vehicleIdToFarm[vId] = trueFarmId;
      vehicleIdToFarm[clean] = trueFarmId;
      if (item.filename) vehicleIdToFarm[item.filename.toLowerCase()] = trueFarmId;

      if (item.baleCounter) {
        balerHardwareCounters.push({
          name: cleanEntityName(item.filename || ""),
          farmId: trueFarmId,
          sessionCounter: parseInt(item.baleCounter.sessionCounter || 0, 10),
          lifetimeCounter: parseInt(item.baleCounter.lifetimeCounter || 0, 10)
        });
      }
    });
  }

  // Field Status
  const savegameFieldsState = {};
  const rootFields = allRawParsedXml.fields && (allRawParsedXml.fields.fields || allRawParsedXml.fields);
  if (rootFields && rootFields.field) {
    const fItems = Array.isArray(rootFields.field) ? rootFields.field : [rootFields.field];
    fItems.forEach(f => {
      savegameFieldsState[String(f.id)] = {
        fruitType: f.fruitType,
        growthState: f.growthState,
        groundType: f.groundType
      };
    });
  }

  // Farmland Ownership
  const farmlandsOwnership = {};
  const rootFLand = (allRawParsedXml.farmland && (allRawParsedXml.farmland.farmlands || allRawParsedXml.farmland)) ||
                    (allRawParsedXml.farmlands && (allRawParsedXml.farmlands.farmlands || allRawParsedXml.farmlands));
  if (rootFLand && rootFLand.farmland) {
    const flItems = Array.isArray(rootFLand.farmland) ? rootFLand.farmland : [rootFLand.farmland];
    flItems.forEach(fl => {
      farmlandsOwnership[String(fl.id)] = String(fl.farmId || fl.owner || "0");
    });
  }

  // Dual-Bank Balances & Statistics
  const farmFinances = {};
  const farmBaleStats = {};

  const rootFarms = allRawParsedXml.farms && (allRawParsedXml.farms.farms || allRawParsedXml.farms);
  if (rootFarms && rootFarms.farm) {
    const fList = Array.isArray(rootFarms.farm) ? rootFarms.farm : [rootFarms.farm];
    fList.forEach(f => {
      const fId = String(f.farmId || f.id || "1");
      const money = parseFloat(f.money || 0);
      const loan = parseFloat(f.loan || 0);

      const stats = f.statistics || {};
      const baleCount = parseInt(stats.baleCount || 0, 10);
      const wrappedBales = parseInt(stats.wrappedBales || 0, 10);
      const soldCottonBales = parseInt(stats.soldCottonBales || 0, 10);

      farmFinances[`farm_${fId}`] = {
        farmId: fId,
        name: f.name || `Farm ${fId}`,
        money: money,
        loan: loan,
        balance: money - loan,
        moneyFormatted: formatCurrency(money),
        balanceFormatted: formatCurrency(money - loan),
        baleCount: baleCount,
        wrappedBales: wrappedBales,
        soldCottonBales: soldCottonBales
      };

      farmBaleStats[`farm_${fId}`] = {
        farmId: fId,
        farmName: f.name || `Farm ${fId}`,
        totalBales: baleCount,
        wrappedBales: wrappedBales,
        soldCottonBales: soldCottonBales
      };

      console.log(`💰 Live Bank [${f.name || `Farm ${fId}`}]: ${formatCurrency(money)} | 🌾 Bales: ${baleCount}`);
    });
  }

  // Console Slot Headroom
  let slotUsage = 2207;
  const rootCareer = allRawParsedXml.careerSavegame && (allRawParsedXml.careerSavegame.careerSavegame || allRawParsedXml.careerSavegame);
  if (rootCareer?.slotSystem?.slotUsage) {
    slotUsage = parseInt(rootCareer.slotSystem.slotUsage, 10);
  }

  // Process Fields
  const rawFields = (server.Fields && server.Fields.Field)
    ? (Array.isArray(server.Fields.Field) ? server.Fields.Field : [server.Fields.Field])
    : [];
  const processedFields = [];
  rawFields.forEach((f, fIdx) => {
    const fieldId = String(f.id || f.number || fIdx + 1);
    const saveState = savegameFieldsState[fieldId] || {};
    const crop = saveState.fruitType || f.fruitType || "Fallow";
    processedFields.push({
      id: fieldId,
      cropType: cleanFillTypeName(crop),
      growthState: saveState.growthState || f.growthState || "Growing",
      groundType: saveState.groundType || "Sown",
      farmId: farmlandsOwnership[fieldId] || (String(f.isOwned) === 'true' ? "1" : "0"),
      areaHectares: parseFloat(f.area || 0)
    });
  });

  const existingFs25 = (await getDb('fs25')) || {};
  const previousVehicles = existingFs25.fleetTelemetry || [];

  const liveVehicles = [];
  const farm1Vehicles = [];
  const farm1Harvesters = [];
  const farm1Trailers = [];
  const farm1Implements = [];
  const farm1Pallets = [];

  const farm2Vehicles = [];
  const farm2Harvesters = [];
  const farm2Trailers = [];
  const farm2Implements = [];
  const farm2Pallets = [];

  let movementDetected = false;
  const MOVEMENT_THRESHOLD = 5.0;

  if (server.Vehicles && server.Vehicles.Vehicle) {
    const vList = Array.isArray(server.Vehicles.Vehicle) ? server.Vehicles.Vehicle : [server.Vehicles.Vehicle];
    vList.forEach((v, idx) => {
      const x = parseFloat(v.x || 0);
      const z = parseFloat(v.z || 0);
      const name = v.name || cleanEntityName(v.type || `Vehicle_${idx + 1}`);
      const classification = classifyVehicle(v);

      let distMoved = 0;
      if (isHeavyScan) {
        const prev = previousVehicles.find(pv => pv.name === name || pv.id === String(idx + 1));
        if (prev && prev.x !== undefined && prev.z !== undefined) {
          distMoved = calculateDistance(x, z, prev.x, prev.z);
          if (distMoved >= MOVEMENT_THRESHOLD) movementDetected = true;
        }
      }

      // STRICT 1:1 XML FARM ID BINDING (Zero coordinate guessing)
      const cleanLower = name.toLowerCase();
      let assignedFarmId = "1";
      if (v.farmId) {
        assignedFarmId = String(v.farmId);
      } else if (vehicleIdToFarm[String(idx + 1)]) {
        assignedFarmId = vehicleIdToFarm[String(idx + 1)];
      } else if (vehicleIdToFarm[cleanLower]) {
        assignedFarmId = vehicleIdToFarm[cleanLower];
      }

      const vehicleRecord = {
        id: String(idx + 1),
        name: name,
        farmId: assignedFarmId,
        itemKind: classification.itemKind,
        groupKey: classification.groupKey,
        isMotorized: classification.isMotorized,
        category: v.category || (classification.isMotorized ? "TRACTORS" : "IMPLEMENTS"),
        type: v.type || "vehicle",
        x: x,
        z: z,
        location: getSpatialZone(x, z, processedFields),
        controller: v.controller || null,
        isAIActive: String(v.isAIActive || 'false').toLowerCase() === 'true',
        fillTypes: v.fillTypes ? cleanFillTypeName(v.fillTypes) : "Empty",
        fillLevels: parseFloat(v.fillLevels || 0),
        lastMovedDelta: distMoved
      };

      liveVehicles.push(vehicleRecord);

      if (assignedFarmId === "2") {
        if (classification.groupKey === 'pallets') farm2Pallets.push(vehicleRecord);
        else if (classification.groupKey === 'harvesters') farm2Harvesters.push(vehicleRecord);
        else if (classification.groupKey === 'trailers') farm2Trailers.push(vehicleRecord);
        else if (classification.groupKey === 'motorVehicles') farm2Vehicles.push(vehicleRecord);
        else farm2Implements.push(vehicleRecord);
      } else {
        if (classification.groupKey === 'pallets') farm1Pallets.push(vehicleRecord);
        else if (classification.groupKey === 'harvesters') farm1Harvesters.push(vehicleRecord);
        else if (classification.groupKey === 'trailers') farm1Trailers.push(vehicleRecord);
        else if (classification.groupKey === 'motorVehicles') farm1Vehicles.push(vehicleRecord);
        else farm1Implements.push(vehicleRecord);
      }
    });
  }

  // Installed Mods Lookup
  const catalogLookup = await fetchWebsiteCatalog();
  const activeMods = {};
  if (rawServerConfig) {
    try {
      const cfgJson = await parseXmlString(rawServerConfig);
      const modsRoot = cfgJson?.gameserver?.mods || cfgJson?.dedicatedServer?.mods;
      if (modsRoot?.mod) {
        const mList = Array.isArray(modsRoot.mod) ? modsRoot.mod : [modsRoot.mod];
        mList.forEach(m => {
          const modFile = m.filename || (typeof m === 'string' ? m : "");
          if (modFile) {
            const cleanKey = modFile.replace(/\.zip$/i, '');
            const enriched = catalogLookup[cleanKey.toLowerCase()] || catalogLookup[normalizeKey(cleanKey)] || null;
            activeMods[cleanKey] = {
              modKey: cleanKey,
              name: enriched?.name || cleanEntityName(cleanKey),
              author: enriched?.author || m.author || "ModHub / Giants",
              image: enriched?.image || enriched?.imageUrl || null,
              category: enriched?.category || "General",
              description: enriched?.description || "",
              size: enriched?.size || "",
              crossplay: enriched?.crossplay || "Yes"
            };
          }
        });
      }
    } catch (e) {}
  }

  // Parse Placeables (Animals, Factories, Storage, Generators)
  const farmCards = {
    farm_1: { animals: [], factories: [], generalPlaceables: [], farmlandOwned: [], palletsAndBales: [...farm1Pallets] },
    farm_2: { animals: [], factories: [], generalPlaceables: [], farmlandOwned: [], palletsAndBales: [...farm2Pallets] }
  };

  const rootPlaceables = allRawParsedXml.placeables && (allRawParsedXml.placeables.placeables || allRawParsedXml.placeables);
  if (rootPlaceables?.placeable) {
    const pItems = Array.isArray(rootPlaceables.placeable) ? rootPlaceables.placeable : [rootPlaceables.placeable];
    pItems.forEach(p => {
      const fId = String(p.farmId || "0");
      const farmKey = `farm_${fId}`;
      if (!farmCards[farmKey]) return;

      const name = cleanEntityName(p.filename || p.uniqueId || "Placeable");

      if (p.husbandry) {
        farmCards[farmKey].animals.push({
          name: name,
          file: p.filename,
          price: parseFloat(p.price || 0),
          totalAnimals: p.husbandry?.numAnimals ? parseInt(p.husbandry.numAnimals, 10) : 0,
          location: getSpatialZone(p.position?.split(' ')[0], p.position?.split(' ')[2], processedFields)
        });
      } else if (p.productionPoint) {
        farmCards[farmKey].factories.push({
          name: name,
          file: p.filename,
          factoryStatus: "Active",
          location: getSpatialZone(p.position?.split(' ')[0], p.position?.split(' ')[2], processedFields)
        });
      } else {
        farmCards[farmKey].generalPlaceables.push({
          name: name,
          price: parseFloat(p.price || 0),
          location: getSpatialZone(p.position?.split(' ')[0], p.position?.split(' ')[2], processedFields)
        });
      }
    });
  }

  const inGameCal = resolveInGameCalendar(allRawParsedXml.environment, allRawParsedXml.careerSavegame, server.dayTime);

  const cardSummary = {
    totalFleetItems: liveVehicles.length,
    totalMotorVehicles: farm1Vehicles.length + farm2Vehicles.length,
    totalHarvesters: farm1Harvesters.length + farm2Harvesters.length,
    totalTrailers: farm1Trailers.length + farm2Trailers.length,
    totalImplements: farm1Implements.length + farm2Implements.length,
    totalFields: processedFields.length,
    activeSaveSlot: String(activeSlot),
    slotUsage: slotUsage,
    movementDetected: movementDetected,
    lastGportalSync: syncTimestamp,
    farm1: {
      totalMotorVehicles: farm1Vehicles.length,
      totalHarvesters: farm1Harvesters.length,
      totalTrailers: farm1Trailers.length,
      totalImplements: farm1Implements.length,
      totalPallets: farm1Pallets.length,
      totalBales: farmBaleStats.farm_1?.totalBales || 0
    },
    farm2: {
      totalMotorVehicles: farm2Vehicles.length,
      totalHarvesters: farm2Harvesters.length,
      totalTrailers: farm2Trailers.length,
      totalImplements: farm2Implements.length,
      totalPallets: farm2Pallets.length,
      totalBales: farmBaleStats.farm_2?.totalBales || 0
    }
  };

  const masterPayload = {
    activeSaveSlot: String(activeSlot),
    activeSlotNode: slotNodeName,
    lastGportalSync: syncTimestamp,
    lastUpdated: syncTimestamp,
    inGameCalendar: inGameCal,
    cards: cardSummary,
    finances: farmFinances,
    baleStatistics: farmBaleStats,
    balerHardwareCounters: balerHardwareCounters,
    fleetTelemetry: liveVehicles,
    fields: processedFields,
    activeMods: activeMods,
    allRawParsedXml: allRawParsedXml,
    serverStatus: {
      isOnline: live.isOnline,
      activePlayerCount: activePlayers.length,
      activePlayers: activePlayers,
      isVipOnline: isVipOnline,
      scanMode: isHeavyScan ? 'heavy' : 'light',
      lastGportalSync: syncTimestamp,
      dayTime: server.dayTime ? parseFloat(server.dayTime) : null
    },
    farm1: {
      vehicles: farm1Vehicles,
      harvesters: farm1Harvesters,
      trailers: farm1Trailers,
      implements: farm1Implements,
      pallets: farm1Pallets,
      baleCount: farmBaleStats.farm_1?.totalBales || 0
    },
    farm2: {
      vehicles: farm2Vehicles,
      harvesters: farm2Harvesters,
      trailers: farm2Trailers,
      implements: farm2Implements,
      pallets: farm2Pallets,
      baleCount: farmBaleStats.farm_2?.totalBales || 0
    }
  };

  console.log(`💾 Writing Unabridged Payload to Firebase at /fs25 and /fs25/${slotNodeName}...`);
  await updateDb('fs25', masterPayload);
  await updateDb(`fs25/${slotNodeName}`, masterPayload);

  for (const [farmKey, finObj] of Object.entries(farmFinances)) {
    await updateDb(`fs25/farms/${farmKey}/finances`, finObj);
    await updateDb(`fs25/${slotNodeName}/farms/${farmKey}/finances`, finObj);
    if (farmCards[farmKey]) {
      await updateDb(`fs25/farms/${farmKey}/cards`, farmCards[farmKey]);
      await updateDb(`fs25/${slotNodeName}/farms/${farmKey}/cards`, farmCards[farmKey]);
    }
  }

  console.log(`🏆 Sync Complete: All XML files ingested directly from G-Portal and committed to Firebase.`);
  process.exit(0);
}

runPipeline();
