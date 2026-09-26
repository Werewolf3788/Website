/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-25 20:25:00 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: //fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD | Measurement ID: G-SGJF0FJPQZ
 * Description: High-Reliability FS25 Ingestion Engine.
 *              - Variable Scoping Fixed: Top-level declaration of live arrays.
 *              - Primary Authority: profile/dedicated_server/gameStats.xml
 *              - Dynamic Crawler: Ingests all XMLs from profile/savegame{slot}.
 *              - Isolated Pallets: Keeps tools/implements unpolluted.
 *              - Strict numUsed Authority: Zero phantom ghost players.
 * ============================================================================ */

// Line 18: CommonJS Runtime Dependencies
require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// Line 24: Process Safety Watchdog (4-Minute Safety Window)
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Process cleanly terminated after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// Line 30: Target Firebase Realtime Database
const RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";

// Line 33: Asynchronous Firebase REST Helpers
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

// Line 62: G-Portal Server Connection Settings
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

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

// Line 98: Sanitization & Parsers
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
    .replace(/&apos;/g, "'")
    .replace(/&#93;/g, ']')
    .replace(/&#91;/g, '[');

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

function cleanEntityName(nameStr) {
  if (!nameStr) return "Equipment";
  const clean = nameStr.split('/').pop().replace(/\.xml$/i, '');
  return clean
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

function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

function calculateDistance(x1, z1, x2, z2) {
  if (x1 === undefined || z1 === undefined || x2 === undefined || z2 === undefined) return 999;
  return Math.hypot(x1 - x2, z1 - z2);
}

// Line 166: Strict Equipment Classification
function classifyVehicle(rawVehicle) {
  const category = (rawVehicle.category || "").toUpperCase().replace(/[^A-Z]/g, '');
  const type = (rawVehicle.type || "").toLowerCase();
  const name = (rawVehicle.name || "").toLowerCase();

  // Strict Pallet / BigBag Isolation
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

  // Hauling Trailers
  if (TRAILER_CATEGORIES.has(category) || name.includes('trailer') || name.includes('flatbed') || type.includes('trailer') || type.includes('wagon')) {
    return { groupKey: 'trailers', itemKind: 'Hauling Trailer', isMotorized: false };
  }

  // Motor Vehicles
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

    let totalMins = Math.floor(parseFloat(rawDayTime || 0));
    if (totalMins > 1440) {
      totalMins = Math.floor(totalMins / 60000) % 1440;
    } else {
      totalMins = totalMins % 1440;
    }

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
      month: "March",
      monthIndex: 1,
      dayInMonth: 1,
      season: "Spring",
      daysPerPeriod: 1,
      formattedStamp: "March (Day 1) - 12:00 PM"
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
        return Math.hypot(numX - parseFloat(f.x), numZ - parseFloat(f.z)) < 90;
      }
      return false;
    });
    if (matched) return `Field #${matched.id}`;
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

// Line 305: Main Execution Pipeline
async function runPipeline() {
  const isForceRun = process.argv.includes('--force') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const syncTimestamp = new Date().toISOString();
  console.log(`📡 Ingesting Verified G-Portal Telemetry at ${syncTimestamp}...`);

  const client = new ftp.Client(25000);
  client.ftp.verbose = true;

  // SCOPE DECLARATIONS (Available to the entire runPipeline scope)
  let activeSlot = process.env.DEFAULT_SAVE_SLOT || "3";
  let mapFilename = "FS25_The_Rural_Farmlands_Of_Ohio.zip";
  let mapName = "The Rural Farmlands Of Ohio";
  let serverName = "OneLIVIDMAN and werewolf 618";
  let serverDayTime = null;

  const activePlayers = [];
  let isVipOnline = false;
  const activeMods = {};
  const allRawParsedXml = {};

  let rawLiveVehiclesList = [];
  let rawLiveFarmlands = [];
  let rawLiveFields = [];

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

    // 1. Ingest dedicatedServerConfig.xml
    try {
      const cfgText = await downloadFtpFileToString(client, 'profile/dedicated_server/dedicatedServerConfig.xml');
      if (cfgText) {
        const cfgJson = await parseXmlString(sanitizeXml(cfgText));
        const settings = cfgJson?.gameserver?.settings || {};
        if (settings.savegame_index) activeSlot = String(settings.savegame_index);
        if (settings.mapFilename) mapFilename = settings.mapFilename;
        if (settings.game_name) serverName = settings.game_name;
        allRawParsedXml['dedicatedServerConfig'] = cfgJson;
        console.log(`✅ Loaded: profile/dedicated_server/dedicatedServerConfig.xml (Locked Slot #${activeSlot})`);
      }
    } catch (e) {
      console.warn("⚠️ Could not read dedicatedServerConfig.xml, defaulting to slot 3.");
    }

    // 2. Ingest gameStats.xml (PRIMARY AUTHORITY)
    try {
      const statsText = await downloadFtpFileToString(client, 'profile/dedicated_server/gameStats.xml');
      if (statsText) {
        const statsJson = await parseXmlString(sanitizeXml(statsText));
        const srv = statsJson?.Server || {};
        if (srv.name) serverName = srv.name;
        if (srv.mapName) mapName = srv.mapName;
        serverDayTime = srv.dayTime ? parseFloat(srv.dayTime) : null;

        // Strict Player Presence Checking (numUsed Authority)
        const slots = srv.Slots || {};
        const numUsed = parseInt(slots.numUsed || 0, 10);
        console.log(`🎮 gameStats.xml Slots: numUsed = ${numUsed} (Capacity: ${slots.capacity || 6})`);

        if (numUsed > 0 && slots.Player) {
          const pList = Array.isArray(slots.Player) ? slots.Player : [slots.Player];
          pList.forEach(p => {
            const isUsed = String(p.isUsed || p._isUsed || '').toLowerCase() === 'true';
            const uptime = parseInt(p.uptime || 0, 10);
            let pName = "";
            if (typeof p === 'string') pName = p;
            else if (p._) pName = p._;
            else if (p.name) pName = p.name;

            if (isUsed && pName && pName.trim() !== '' && pName.toLowerCase() !== 'unknown') {
              const cleanPName = pName.trim();
              activePlayers.push({
                name: cleanPName,
                uptime: uptime,
                isAdmin: String(p.isAdmin).toLowerCase() === 'true',
                x: p.x ? parseFloat(p.x) : null,
                y: p.y ? parseFloat(p.y) : null,
                z: p.z ? parseFloat(p.z) : null
              });

              if (VIP_PLAYERS.has(cleanPName.toLowerCase())) {
                isVipOnline = true;
              }
            }
          });
        }

        // Extract Clean Mod Names from gameStats.xml
        if (srv.Mods && srv.Mods.Mod) {
          const mList = Array.isArray(srv.Mods.Mod) ? srv.Mods.Mod : [srv.Mods.Mod];
          mList.forEach(m => {
            const mKey = m.name || m.filename || "";
            if (mKey) {
              const title = m._ || m.name || cleanEntityName(mKey);
              activeMods[mKey] = {
                modKey: mKey,
                name: title,
                author: m.author || "Giants ModHub",
                version: m.version || "1.0.0.0",
                hash: m.hash || "",
                category: "ModHub Verified"
              };
            }
          });
        }

        if (srv.Vehicles && srv.Vehicles.Vehicle) {
          rawLiveVehiclesList = Array.isArray(srv.Vehicles.Vehicle) ? srv.Vehicles.Vehicle : [srv.Vehicles.Vehicle];
        }

        if (srv.Farmlands && srv.Farmlands.Farmland) {
          rawLiveFarmlands = Array.isArray(srv.Farmlands.Farmland) ? srv.Farmlands.Farmland : [srv.Farmlands.Farmland];
        }

        if (srv.Fields && srv.Fields.Field) {
          rawLiveFields = Array.isArray(srv.Fields.Field) ? srv.Fields.Field : [srv.Fields.Field];
        }

        allRawParsedXml['gameStats'] = statsJson;
        console.log(`✅ Loaded: profile/dedicated_server/gameStats.xml (${activePlayers.length} verified online)`);
      }
    } catch (statsErr) {
      console.warn("⚠️ Could not read gameStats.xml via FTP:", statsErr.message);
    }

    // 3. Dynamic XML Directory Scanner in profile/savegame{slot}
    const slotFolder = `profile/savegame${activeSlot}`;
    const slotNodeName = `savegame${activeSlot}`;
    console.log(`📂 Dynamically scanning G-Portal directory: ${slotFolder}...`);

    const directoryList = await client.list(slotFolder);
    const xmlFilesFound = directoryList
      .filter(item => item.isFile && item.name.toLowerCase().endsWith('.xml'))
      .map(item => item.name);

    console.log(`🔍 Discovered ${xmlFilesFound.length} XML files in ${slotFolder}`);

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
    console.log("🔌 G-Portal FTP connection cleanly closed.");

  } catch (ftpErr) {
    console.error("❌ FTP Connection failed:", ftpErr.message);
    if (client) client.close();
  }

  const slotNodeName = `savegame${activeSlot}`;

  // Line 470: Savegame Farm Ownership & Bale Counts
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
        name: f.name || (fId === "1" ? "My farm" : "Dumbace"),
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
        farmName: f.name || (fId === "1" ? "My farm" : "Dumbace"),
        totalBales: baleCount,
        wrappedBales: wrappedBales,
        soldCottonBales: soldCottonBales
      };

      console.log(`💰 Live Bank [${f.name || `Farm ${fId}`}]: ${formatCurrency(money)} | 🌾 Lifetime Bales: ${baleCount}`);
    });
  }

  // Farmland Ownership Index with Scope Protection
  const farmlandsOwnership = {};
  if (Array.isArray(rawLiveFarmlands)) {
    rawLiveFarmlands.forEach(fl => {
      if (fl && fl.id) farmlandsOwnership[String(fl.id)] = String(fl.owner || "0");
    });
  }

  // Savegame Farmlands Backup Check
  const rootFLand = allRawParsedXml.farmland || allRawParsedXml.farmlands;
  if (rootFLand && (rootFLand.farmland || rootFLand.farmlands)) {
    const flItems = Array.isArray(rootFLand.farmland || rootFLand.farmlands)
      ? (rootFLand.farmland || rootFLand.farmlands)
      : [rootFLand.farmland || rootFLand.farmlands];
    flItems.forEach(fl => {
      if (fl && fl.id && !farmlandsOwnership[String(fl.id)]) {
        farmlandsOwnership[String(fl.id)] = String(fl.farmId || fl.owner || "0");
      }
    });
  }

  // Fields Mapping with Scope Protection
  const processedFields = [];
  if (Array.isArray(rawLiveFields)) {
    rawLiveFields.forEach(f => {
      if (f && f.id) {
        const fId = String(f.id);
        const ownerId = farmlandsOwnership[fId] || (String(f.isOwned) === 'true' ? "1" : "0");
        processedFields.push({
          id: fId,
          ownerFarmId: ownerId,
          isOwned: ownerId !== "0",
          x: f.x ? parseFloat(f.x) : 0,
          z: f.z ? parseFloat(f.z) : 0,
          areaHectares: 0,
          cropType: "Active Farmland"
        });
      }
    });
  }

  // Extract Exact Savegame Vehicles for FarmId Mapping
  const saveVehicleOwnership = {};
  const saveVehicleCapacities = {};
  const balerHardwareCounters = [];

  const rootVehicles = allRawParsedXml.vehicles && (allRawParsedXml.vehicles.vehicles || allRawParsedXml.vehicles);
  if (rootVehicles && (rootVehicles.vehicle || rootVehicles.item)) {
    const items = Array.isArray(rootVehicles.vehicle || rootVehicles.item)
      ? (rootVehicles.vehicle || rootVehicles.item)
      : [rootVehicles.vehicle || rootVehicles.item];

    items.forEach((item, itemIdx) => {
      const fId = String(item.farmId || item.ownerFarmId || "1");
      const vId = String(item.id || itemIdx + 1);
      const clean = cleanEntityName(item.filename || "").toLowerCase();

      saveVehicleOwnership[vId] = fId;
      saveVehicleOwnership[clean] = fId;
      if (item.filename) saveVehicleOwnership[item.filename.toLowerCase()] = fId;

      if (item.fillUnit && item.fillUnit.unit) {
        const uList = Array.isArray(item.fillUnit.unit) ? item.fillUnit.unit : [item.fillUnit.unit];
        let totalCap = 0;
        uList.forEach(u => { totalCap += parseFloat(u.capacity || 0); });
        if (totalCap > 0) saveVehicleCapacities[vId] = totalCap;
      }

      if (item.baleCounter) {
        balerHardwareCounters.push({
          name: cleanEntityName(item.filename || ""),
          farmId: fId,
          sessionCounter: parseInt(item.baleCounter.sessionCounter || 0, 10),
          lifetimeCounter: parseInt(item.baleCounter.lifetimeCounter || 0, 10)
        });
      }
    });
  }

  // Line 570: Live Vehicle Fleet Processing & Pallet Separation
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

  rawLiveVehiclesList.forEach((v, idx) => {
    const vId = String(idx + 1);
    const name = v.name || cleanEntityName(v.type || `Vehicle_${vId}`);
    const classification = classifyVehicle(v);

    const x = parseFloat(v.x || 0);
    const z = parseFloat(v.z || 0);

    // Exact Farm Ownership Binding (No Coordinate Guessing)
    let assignedFarmId = "1";
    const cleanLower = name.toLowerCase();
    if (v.farmId) {
      assignedFarmId = String(v.farmId);
    } else if (saveVehicleOwnership[vId]) {
      assignedFarmId = saveVehicleOwnership[vId];
    } else if (saveVehicleOwnership[cleanLower]) {
      assignedFarmId = saveVehicleOwnership[cleanLower];
    }

    // Extract Fill Levels & Capacities
    let fillTypes = "Empty";
    let fillLevels = 0;
    let capacity = saveVehicleCapacities[vId] || (classification.isMotorized ? 600 : 50000);

    if (v.fillTypes) {
      fillTypes = cleanFillTypeName(v.fillTypes.split(' ')[0]);
    }
    if (v.fillLevels) {
      const parts = v.fillLevels.split(' ');
      fillLevels = parseFloat(parts[0] || 0);
    }

    // Match Real Tank Capacity for Common Machines
    if (name.includes('Roadrunner')) capacity = 900;
    else if (name.includes('RTV') || name.includes('Rangler')) capacity = 80;
    else if (name.includes('M8')) capacity = 400;
    else if (name.includes('6R')) capacity = 475;
    else if (name.includes('Steiger')) capacity = 2000;
    else if (name.includes('Colossus 9000')) capacity = 1500;
    else if (name.includes('Colossus FLM')) capacity = 100000;

    const vehicleRecord = {
      id: vId,
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
      fillTypes: fillTypes,
      fillLevels: fillLevels,
      capacity: capacity,
      lastMovedDelta: 0
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

  // Parse Placeables (Animals, Factories, Silos, Generators)
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

  // Resolve In-Game Calendar & Console Slots
  const inGameCal = resolveInGameCalendar(allRawParsedXml.environment, allRawParsedXml.careerSavegame, serverDayTime);

  let slotUsage = 2207;
  const rootCareer = allRawParsedXml.careerSavegame && (allRawParsedXml.careerSavegame.careerSavegame || allRawParsedXml.careerSavegame);
  if (rootCareer?.slotSystem?.slotUsage) {
    slotUsage = parseInt(rootCareer.slotSystem.slotUsage, 10);
  }

  const cardSummary = {
    totalFleetItems: liveVehicles.length,
    totalMotorVehicles: farm1Vehicles.length + farm2Vehicles.length,
    totalHarvesters: farm1Harvesters.length + farm2Harvesters.length,
    totalTrailers: farm1Trailers.length + farm2Trailers.length,
    totalImplements: farm1Implements.length + farm2Implements.length,
    totalPallets: farm1Pallets.length + farm2Pallets.length,
    totalFields: processedFields.length,
    activeSaveSlot: String(activeSlot),
    slotUsage: slotUsage,
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

  // Master Payload
  const masterPayload = {
    serverName: serverName,
    mapName: mapName,
    mapFilename: mapFilename,
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
      isOnline: true,
      activePlayerCount: activePlayers.length,
      activePlayers: activePlayers,
      isVipOnline: isVipOnline,
      scanMode: activePlayers.length > 0 ? 'heavy' : 'light',
      lastGportalSync: syncTimestamp,
      dayTime: serverDayTime
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

  console.log(`💾 Committing Live Telemetry to Firebase at /fs25 and /fs25/${slotNodeName}...`);
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

  console.log(`🏆 Sync Complete: G-Portal data parsed into human format. Players: ${activePlayers.length}.`);
  process.exit(0);
}

runPipeline();
