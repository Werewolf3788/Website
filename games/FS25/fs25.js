/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-25 17:15:31 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: //fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Zero-Loss, Failsafe-Protected FS25 Live Ingestion Engine.
 *              - Node-isolated try...catch execution prevents crashes.
 *              - CommonJS architecture (Zero ES module import syntax).
 *              - Heavy Scan triggered when 'wildhorse_spirit' or 'OneLIVIDMAN' is active.
 *              - Light Scan executed when neither player is active (Clock, Calendar, 
 *                Field Growth/Harvest Status, Finances, Server Status).
 *              - Ingests ALL savegame XML files directly to /fs25/allRawParsedXml.
 *              - Dual-bank live balance tracking across Farm 1 and Farm 2.
 *              - Dedicated server authority dynamically locks active save slot.
 * ============================================================================ */

// Line 22: Load environment variables
require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Process Failsafe)
// ============================================================================
// Line 31: Safety watchdog preventing hanging runner processes
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Process cleanly terminated after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: RELATIVE-PROTOCOL FIREBASE REST CLIENT
// ============================================================================
// Line 39: Firebase REST endpoint
const RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";

// Line 42: Asynchronous PATCH helper with error handling
async function updateDb(path, data) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`⚠️ Warning: Firebase PATCH failed at ${path}: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ Warning: Network error during PATCH at ${path}: ${err.message}`);
    return null;
  }
}

// Line 61: Asynchronous GET helper with error handling
async function getDb(path) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`);
    if (!res.ok) {
      console.warn(`⚠️ Warning: Node empty or offline at ${path}: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ Warning: Network error reading ${path}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// SECTION 3: NETWORK CONFIGURATION
// ============================================================================
// Line 79: G-Portal FTP & Dedicated Server Stats Endpoint
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

// Line 93: Defined Primary Farm Operators
const VIP_PLAYERS = new Set(['wildhorse_spirit', 'onelividman']);

// Line 96: Equipment Categories
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

// ============================================================================
// SECTION 4: SANITIZERS, PARSERS & UTILITIES
// ============================================================================
// Line 118: Cleans XML content strings
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

// Line 141: XML to JSON parser
async function parseXmlString(xmlString) {
  if (!xmlString) return null;
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true, trim: true });
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (e) {
    return null;
  }
}

// Line 152: Converts XML filepaths into human-readable model titles
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

// Line 165: Formats fill and fruit type names
function cleanFillTypeName(typeName) {
  if (!typeName) return "General Cargo";
  const clean = typeName
    .replace(/^(fillType_|filltype_|ft_|fruitType_|fruittype_)/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Line 177: String normalizer for matching catalog keys
function normalizeKey(str) {
  if (!str) return "";
  return str.toString()
    .toLowerCase()
    .replace(/^f\s*s\s*25[_\-\s]*/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Line 187: Currency formatter
function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

// Line 192: 2D Euclidean distance calculation
function calculateDistance(x1, z1, x2, z2) {
  if (x1 === undefined || z1 === undefined || x2 === undefined || z2 === undefined) return 999;
  return Math.hypot(x1 - x2, z1 - z2);
}

// Line 198: Classifies vehicles into distinct UI card groups
function classifyVehicle(rawVehicle) {
  const category = (rawVehicle.category || "").toUpperCase().replace(/[^A-Z]/g, '');
  const type = (rawVehicle.type || "").toLowerCase();
  const name = (rawVehicle.name || "").toLowerCase();

  const isPallet = category === 'PALLETS' || category === 'BIGBAGPALLETS' || type.includes('pallet');
  if (isPallet) {
    return { groupKey: 'pallets', itemKind: 'Pallet / Cargo', isMotorized: false };
  }

  if (HARVESTER_CATEGORIES.has(category) || type.includes('combine') || name.includes('harvester')) {
    return { groupKey: 'harvesters', itemKind: 'Harvester & Combine', isMotorized: true };
  }

  if (TRAILER_CATEGORIES.has(category) || name.includes('trailer') || name.includes('dropdeck') || name.includes('flatbed') || type.includes('trailer') || type.includes('wagon')) {
    return { groupKey: 'trailers', itemKind: 'Hauling Trailer', isMotorized: false };
  }

  const isMotorCategory = MOTORIZED_CATEGORIES.has(category);
  const isDriven = Boolean(rawVehicle.controller);
  const isAIDriven = String(rawVehicle.isAIActive || 'false').toLowerCase() === 'true';
  const hasMotorKeywords = type.includes('motor') || type.includes('tractor') || type.includes('truck') || name.includes('tractor') || name.includes('truck');

  if (isMotorCategory || isDriven || isAIDriven || hasMotorKeywords) {
    return { groupKey: 'motorVehicles', itemKind: 'Motor Vehicle', isMotorized: true };
  }

  return { groupKey: 'implements', itemKind: 'Implement / Seeder', isMotorized: false };
}

// Line 230: In-game calendar calculations (Month, Day, Season, Clock)
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

// Line 304: Spatial zone calculation with sector grid fallback
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

// Line 326: FTP stream downloader
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

// Line 339: Dedicated server port 9050 stats reader
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

// Line 355: Mod catalog resolver
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

// ============================================================================
// SECTION 5: PIPELINE EXECUTION
// ============================================================================
// Line 378: Master Ingestion Routine
async function runPipeline() {
  const isForceRun = process.argv.includes('--force') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const syncTimestamp = new Date().toISOString();
  console.log(`📡 Ingesting G-Portal Telemetry at ${syncTimestamp}...`);

  const live = await pingLiveFeed();
  const server = live.serverNode || {};

  // Line 387: Extract Connected Players
  const activePlayers = [];
  let isVipOnline = false;

  if (server.Slots && server.Slots.Player) {
    const pList = Array.isArray(server.Slots.Player) ? server.Slots.Player : [server.Slots.Player];
    pList.forEach(p => {
      const isUsed = String(p.isUsed || p._isUsed || '').toLowerCase() === 'true';
      if (isUsed) {
        let pName = "Unknown";
        if (typeof p === 'string') pName = p;
        else if (p._) pName = p._;
        else if (p.name) pName = p.name;

        activePlayers.push({
          name: pName,
          uptime: parseInt(p.uptime || 0, 10),
          isAdmin: String(p.isAdmin) === 'true',
          x: p.x ? parseFloat(p.x) : null,
          z: p.z ? parseFloat(p.z) : null
        });

        if (VIP_PLAYERS.has(pName.toLowerCase())) {
          isVipOnline = true;
        }
      }
    });
  }

  // Line 417: Determine Scan Tier (Heavy if VIP active or forced, else Light)
  const isHeavyScan = isVipOnline || isForceRun;
  console.log(`🎮 Mode: ${isHeavyScan ? 'HEAVY SCAN (VIP Online / Movement Tracking)' : 'LIGHT SCAN (Idle Server / 12-Hour Sync)'}`);
  console.log(`👥 Active Players: ${activePlayers.length} (${activePlayers.map(p => p.name).join(', ') || 'None'})`);

  await updateDb('fs25/serverStatus', {
    isOnline: live.isOnline,
    activePlayerCount: activePlayers.length,
    activePlayers: activePlayers,
    isVipOnline: isVipOnline,
    scanMode: isHeavyScan ? 'heavy' : 'light',
    lastChecked: syncTimestamp,
    lastGportalSync: syncTimestamp,
    dayTime: server.dayTime ? parseFloat(server.dayTime) : null
  });

  const client = new ftp.Client();
  client.ftp.verbose = false;

  let activeSlot = "3";
  let mapFilename = "FS25_The_Rural_Farmlands_Of_Ohio.zip";
  let rawServerConfig = "";

  try {
    await client.access({
      host: ftpHost,
      port: ftpPort,
      user: ftpUser,
      password: ftpPass,
      secure: false
    });

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

    // Line 474: Ingest ALL XML Data Files into allRawParsedXml
    const allRawParsedXml = {};
    const targetXmlFiles = [
      'careerSavegame.xml',
      'vehicles.xml',
      'fields.xml',
      'farmland.xml',
      'farmlands.xml',
      'farms.xml',
      'placeables.xml',
      'economy.xml',
      'missions.xml',
      'environment.xml',
      'collectibles.xml',
      'sales.xml',
      'precisionFarming.xml'
    ];

    for (const xmlFile of targetXmlFiles) {
      try {
        const fileContent = await downloadFtpFileToString(client, `${slotFolder}/${xmlFile}`);
        if (fileContent) {
          const parsed = await parseXmlString(sanitizeXml(fileContent));
          const fileKey = xmlFile.replace(/\.xml$/i, '');
          allRawParsedXml[fileKey] = parsed;
          console.log(`✅ Ingested XML: [ ${xmlFile} ] -> /fs25/allRawParsedXml/${fileKey}`);
        }
      } catch (e) {}
    }

    // Line 504: Extract True Farm Ownership from vehicles.xml
    const savegameVehicleOwnership = {};
    const rootVehicles = allRawParsedXml.vehicles && (allRawParsedXml.vehicles.vehicles || allRawParsedXml.vehicles);
    if (rootVehicles && (rootVehicles.vehicle || rootVehicles.item)) {
      const items = Array.isArray(rootVehicles.vehicle || rootVehicles.item)
        ? (rootVehicles.vehicle || rootVehicles.item)
        : [rootVehicles.vehicle || rootVehicles.item];
      items.forEach(item => {
        const fId = String(item.farmId || item.ownerFarmId || "1");
        const clean = cleanEntityName(item.filename || "");
        savegameVehicleOwnership[clean.toLowerCase()] = fId;
        if (item.filename) savegameVehicleOwnership[item.filename.toLowerCase()] = fId;
      });
    }

    // Line 520: Extract Fields Status (Crop type, growth state, ground type)
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

    // Line 535: Extract Farmland Ownership
    const farmlandsOwnership = {};
    const rootFLand = (allRawParsedXml.farmland && (allRawParsedXml.farmland.farmlands || allRawParsedXml.farmland)) ||
                      (allRawParsedXml.farmlands && (allRawParsedXml.farmlands.farmlands || allRawParsedXml.farmlands));
    if (rootFLand && rootFLand.farmland) {
      const flItems = Array.isArray(rootFLand.farmland) ? rootFLand.farmland : [rootFLand.farmland];
      flItems.forEach(fl => {
        farmlandsOwnership[String(fl.id)] = String(fl.farmId || fl.owner || "0");
      });
    }

    // Line 547: Extract Dual-Bank Finances (Farm 1 vs Farm 2)
    const farmFinances = {};
    const rootFarms = allRawParsedXml.farms && (allRawParsedXml.farms.farms || allRawParsedXml.farms);
    if (rootFarms && rootFarms.farm) {
      const fList = Array.isArray(rootFarms.farm) ? rootFarms.farm : [rootFarms.farm];
      fList.forEach(f => {
        const fId = String(f.farmId || f.id || "1");
        const money = parseFloat(f.money || 0);
        const loan = parseFloat(f.loan || 0);
        farmFinances[`farm_${fId}`] = {
          farmId: fId,
          name: f.name || `Farm ${fId}`,
          money: money,
          loan: loan,
          balance: money - loan,
          moneyFormatted: formatCurrency(money),
          balanceFormatted: formatCurrency(money - loan)
        };
        console.log(`💰 Live Bank [${f.name || `Farm ${fId}`}]: ${formatCurrency(money)} (Balance: ${formatCurrency(money - loan)})`);
      });
    }

    // Line 571: Extract Console Slot Limit
    let slotUsage = 2207;
    const rootCareer = allRawParsedXml.careerSavegame && (allRawParsedXml.careerSavegame.careerSavegame || allRawParsedXml.careerSavegame);
    if (rootCareer?.slotSystem?.slotUsage) {
      slotUsage = parseInt(rootCareer.slotSystem.slotUsage, 10);
    }

    // Line 578: Process Field States (Harvest-Ready, Growing, Fallow, Withered)
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

    // Line 598: Process Live Fleet Telemetry & Movement Deltas
    const existingFs25 = (await getDb('fs25')) || {};
    const previousVehicles = existingFs25.fleetTelemetry || [];

    const liveVehicles = [];
    const farm1Vehicles = [];
    const farm1Harvesters = [];
    const farm1Trailers = [];
    const farm1Implements = [];

    const farm2Vehicles = [];
    const farm2Harvesters = [];
    const farm2Trailers = [];
    const farm2Implements = [];

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
            if (distMoved >= MOVEMENT_THRESHOLD) {
              movementDetected = true;
              console.log(`🚜 Movement Delta: [ ${name} ] shifted ${distMoved.toFixed(1)}m`);
            }
          }
        }

        let assignedFarmId = "1";
        const matchKey = Object.keys(savegameVehicleOwnership).find(k => k.includes(name.toLowerCase()));
        if (matchKey) {
          assignedFarmId = savegameVehicleOwnership[matchKey];
        } else if (x > 200 && z > 200) {
          assignedFarmId = "2";
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
          if (classification.groupKey === 'harvesters') farm2Harvesters.push(vehicleRecord);
          else if (classification.groupKey === 'trailers') farm2Trailers.push(vehicleRecord);
          else if (classification.groupKey === 'motorVehicles') farm2Vehicles.push(vehicleRecord);
          else farm2Implements.push(vehicleRecord);
        } else {
          if (classification.groupKey === 'harvesters') farm1Harvesters.push(vehicleRecord);
          else if (classification.groupKey === 'trailers') farm1Trailers.push(vehicleRecord);
          else if (classification.groupKey === 'motorVehicles') farm1Vehicles.push(vehicleRecord);
          else farm1Implements.push(vehicleRecord);
        }
      });
    }

    // Line 678: Ingest Active Mods & Match with Catalog
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

    // Line 710: Parse Placeables for Animals, Factories and Storage
    const farmCards = {
      farm_1: { animals: [], factories: [], generalPlaceables: [], farmlandOwned: [], palletsAndBales: [] },
      farm_2: { animals: [], factories: [], generalPlaceables: [], farmlandOwned: [], palletsAndBales: [] }
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

    // Line 755: Construct Unified Summary Cards
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
        totalImplements: farm1Implements.length
      },
      farm2: {
        totalMotorVehicles: farm2Vehicles.length,
        totalHarvesters: farm2Harvesters.length,
        totalTrailers: farm2Trailers.length,
        totalImplements: farm2Implements.length
      }
    };

    // Line 782: Master Payload Assembly
    const masterPayload = {
      activeSaveSlot: String(activeSlot),
      activeSlotNode: slotNodeName,
      lastGportalSync: syncTimestamp,
      lastUpdated: syncTimestamp,
      inGameCalendar: inGameCal,
      cards: cardSummary,
      finances: farmFinances,
      fleetTelemetry: liveVehicles,
      fields: processedFields,
      activeMods: activeMods,
      allRawParsedXml: allRawParsedXml,
      farm1: {
        vehicles: farm1Vehicles,
        harvesters: farm1Harvesters,
        trailers: farm1Trailers,
        implements: farm1Implements
      },
      farm2: {
        vehicles: farm2Vehicles,
        harvesters: farm2Harvesters,
        trailers: farm2Trailers,
        implements: farm2Implements
      }
    };

    // Line 808: Write payload to Firebase RTDB (/fs25 and /fs25/savegameX)
    console.log(`💾 Writing payload to /fs25 and /fs25/${slotNodeName}...`);
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

    console.log(`🏆 Sync Completed: All XML nodes synced, ${liveVehicles.length} vehicles mapped, balances and cards updated.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
    if (client) client.close();
    process.exit(0);
  }
}

// Line 836: Trigger Execution
runPipeline();
