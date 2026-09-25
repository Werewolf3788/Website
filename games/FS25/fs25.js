/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-24 23:34:00 (EDT - 24hr New York Time)
 * Line Count / Context: Zero-loss ingestion engine with motor vehicle vs implement
 *                       classification, crop/field state resolution, and item count cards.
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: //fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Zero-Loss, Failsafe-Protected FS25 Live Ingestion Engine.
 *              - Node-isolated try...catch execution prevents crashes.
 *              - Live Movement-Delta detection (> 5m threshold).
 *              - Dual-bank live balance tracking across Farm 1 and Farm 2.
 *              - In-game calendar (time, month, season) extracted continuously.
 *              - Dedicated server authority locks save slot and active mods.
 *              - Separates motorized equipment from towable implements.
 *              - Enriches field metadata (crop type, state, area).
 *              - Computes card totals for UI dashboards.
 * ============================================================================ */

// Line 21: Load environment variables from relative script directory
require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Process Failsafe)
// ============================================================================
// Line 30: Prevents stuck processes from blocking scheduler runners
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Process cleanly terminated after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: RELATIVE-PROTOCOL FIREBASE REST CLIENT
// ============================================================================
// Line 38: Firebase Realtime Database endpoint using standard REST protocol
const RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";

// Line 41: PATCH helper with error trapping
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

// Line 60: PUT helper for complete node state writes
async function setDb(path, data) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`⚠️ Warning: Firebase PUT failed at ${path}: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ Warning: Network error during PUT at ${path}: ${err.message}`);
    return null;
  }
}

// Line 79: GET helper with fail-safe null return
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
// Line 97: Host, Port, and Dedicated Server HTTP endpoints
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;

const FS_MONTHS = [
  "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December", "January", "February"
];

// Line 112: Recognized motorized categories in FS25
const MOTORIZED_CATEGORIES = new Set([
  'TRACTOR', 'TRACTORS', 'TRACTORSS', 'TRACTORM', 'TRACTORL',
  'HARVESTER', 'COMBINE', 'FORAGEHARVESTER', 'BEETHARVESTER', 'POTATOHARVESTER', 'COTTONHARVESTER',
  'CAR', 'TRUCK', 'TRUCKS', 'TELEHANDLER', 'WHEELLOADER', 'SKIDSTEER', 'FORKLIFT',
  'SELFPROPELLED', 'SELFPROPELLESSPRAYER', 'SLURRYVEHICLE', 'MOWER'
]);

// ============================================================================
// SECTION 4: SANITIZERS, PARSERS & UTILITIES
// ============================================================================
// Line 123: Sanitizes raw XML bodies from HTTP feeds and FTP text
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

// Line 146: Asynchronous XML-to-JSON parser
async function parseXmlString(xmlString) {
  if (!xmlString) return null;
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (e) {
    console.warn("⚠️ Warning: Malformed XML string skipped:", e.message);
    return null;
  }
}

// Line 158: Converts internal XML filenames and machine paths into human-readable model names
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

// Line 171: Converts internal fill and crop types to clean title-cased labels
function cleanFillTypeName(typeName) {
  if (!typeName) return "General Cargo";
  const clean = typeName
    .replace(/^(fillType_|filltype_|ft_|fruitType_|fruittype_)/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Line 183: String normalizer for flexible catalog lookups
function normalizeKey(str) {
  if (!str) return "";
  return str.toString()
    .toLowerCase()
    .replace(/^f\s*s\s*25[_\-\s]*/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Line 193: Currency formatter helper
function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

// Line 198: 2D Euclidean distance calculation
function calculateDistance(x1, z1, x2, z2) {
  if (x1 === undefined || z1 === undefined || x2 === undefined || z2 === undefined) return 999;
  return Math.hypot(x1 - x2, z1 - z2);
}

// Line 204: Distinguishes motorized machines (tractors, harvesters, trucks) from pull implements
function classifyVehicle(rawVehicle) {
  const category = (rawVehicle.category || "").toUpperCase().replace(/[^A-Z]/g, '');
  const type = (rawVehicle.type || "").toLowerCase();
  const name = (rawVehicle.name || "").toLowerCase();

  const isMotorCategory = MOTORIZED_CATEGORIES.has(category);
  const isDriven = Boolean(rawVehicle.controller);
  const isAIDriven = String(rawVehicle.isAIActive || 'false').toLowerCase() === 'true';
  const hasMotorKeywords = type.includes('motor') || type.includes('tractor') || type.includes('truck') ||
                           type.includes('combine') || type.includes('harvester') || name.includes('tractor');

  const isMotorized = isMotorCategory || isDriven || isAIDriven || hasMotorKeywords;

  return {
    itemKind: isMotorized ? "Motor Vehicle" : "Implement",
    isMotorized: isMotorized
  };
}

// Line 224: Translates raw daytime and environment nodes into in-game calendar status
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
    const currentDay = env && (env.currentDay || env.day);
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
    console.warn("⚠️ Warning: Error resolving calendar. Using fallback defaults:", err.message);
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

// Line 298: Spatial zone determination from field centroids or map sectors
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

// Line 320: Stream-based FTP download to UTF-8 string
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

// Line 333: Dedicated server live stats poller
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
  } catch (e) {
    console.warn("⚠️ Warning: Dedicated server stats port 9050 is unreachable:", e.message);
  }
  return { isOnline: false, rawXml: "", serverNode: null };
}

// Line 352: Mod catalog reader from Firebase /websiteMods
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
    console.warn("⚠️ Warning: Failed indexing /websiteMods catalog:", err.message);
    return {};
  }
}

// ============================================================================
// SECTION 5: LIVE MOVEMENT DELTA & DUAL-BANK INGESTION PIPELINE
// ============================================================================
// Line 375: Main processing pipeline
async function runPipeline() {
  const isForceRun = process.argv.includes('--force') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  console.log(`📡 [1/4] Polling Dedicated Server Telemetry (Force Run: ${isForceRun})...`);

  const live = await pingLiveFeed();

  if (!live.isOnline && !isForceRun) {
    console.log("🛑 Server is offline. Updating serverStatus node only and exiting.");
    await updateDb('fs25/serverStatus', { isOnline: false, lastChecked: new Date().toISOString() });
    process.exit(0);
  }

  const server = live.serverNode || {};
  const activePlayers = [];
  if (server.Slots && server.Slots.Player) {
    const pList = Array.isArray(server.Slots.Player) ? server.Slots.Player : [server.Slots.Player];
    pList.forEach(p => {
      const isUsed = String(p.isUsed || p._isUsed || '').toLowerCase() === 'true';
      if (isUsed) {
        const name = typeof p === 'string' ? p : (p._ || p.name || "Unknown");
        activePlayers.push({
          name: name,
          uptime: parseInt(p.uptime || 0, 10),
          isAdmin: String(p.isAdmin) === 'true'
        });
      }
    });
  }

  console.log(`👥 Active Players Online: ${activePlayers.length} (${activePlayers.map(p => p.name).join(', ') || 'None'})`);

  await updateDb('fs25/serverStatus', {
    isOnline: live.isOnline,
    activePlayerCount: activePlayers.length,
    activePlayers: activePlayers,
    lastChecked: new Date().toISOString()
  });

  const existingFs25 = (await getDb('fs25')) || {};
  const previousVehicles = (existingFs25.cards && existingFs25.cards.fleet) ? existingFs25.cards.fleet : [];

  // Line 417: Field extraction with crop type, state, and human-readable names
  const rawFields = (server.Fields && server.Fields.Field)
    ? (Array.isArray(server.Fields.Field) ? server.Fields.Field : [server.Fields.Field])
    : [];

  const processedFields = [];
  let cultivatedFieldCount = 0;
  let seededFieldCount = 0;

  rawFields.forEach((f, fIdx) => {
    try {
      const rawFruit = f.fruitType || f.fruit || f.crop || "Fallow";
      const cropName = cleanFillTypeName(rawFruit);
      const fieldId = String(f.id || f.number || fIdx + 1);
      const isOwned = String(f.isOwned || f.owned || 'false').toLowerCase() === 'true';
      const growthState = f.growthState || f.state || "Growing";
      const area = parseFloat(f.area || f.size || 0);

      if (cropName !== "Fallow" && cropName !== "General Cargo") {
        seededFieldCount++;
      } else {
        cultivatedFieldCount++;
      }

      processedFields.push({
        id: fieldId,
        name: `Field ${fieldId}`,
        cropType: cropName,
        growthState: growthState,
        isOwned: isOwned,
        areaHectares: area,
        x: parseFloat(f.x || 0),
        z: parseFloat(f.z || 0)
      });
    } catch (fieldErr) {
      console.warn(`⚠️ Warning: Error parsing field node #${fIdx + 1}:`, fieldErr.message);
    }
  });

  // Line 458: Vehicle and Implement Separation Pipeline
  const liveVehicles = [];
  const motorVehicles = [];
  const implementsList = [];
  let movementDetected = false;
  const MOVEMENT_THRESHOLD_METERS = 5.0;

  if (server.Vehicles && server.Vehicles.Vehicle) {
    const vList = Array.isArray(server.Vehicles.Vehicle) ? server.Vehicles.Vehicle : [server.Vehicles.Vehicle];
    vList.forEach((v, idx) => {
      try {
        const x = parseFloat(v.x || 0);
        const z = parseFloat(v.z || 0);
        const name = v.name || cleanEntityName(v.type || `Vehicle_${idx + 1}`);
        const controller = v.controller || null;
        const isAI = String(v.isAIActive || 'false').toLowerCase() === 'true';
        const fillTypesRaw = v.fillTypes || v.fillType || "";
        const fillLevelsRaw = v.fillLevels || v.fillLevel || "";

        const prev = previousVehicles.find(pv => pv.name === name || pv.id === String(idx + 1));
        let distMoved = 0;
        if (prev && prev.x !== undefined && prev.z !== undefined) {
          distMoved = calculateDistance(x, z, prev.x, prev.z);
          if (distMoved >= MOVEMENT_THRESHOLD_METERS) {
            movementDetected = true;
            console.log(`🚜 Movement Delta Detected: [ ${name} ] shifted ${distMoved.toFixed(1)}m (Driver: ${controller || (isAI ? 'AI Helper' : 'Idle')})`);
          }
        }

        const classification = classifyVehicle(v);

        const entityRecord = {
          id: String(idx + 1),
          name: name,
          itemKind: classification.itemKind,
          isMotorized: classification.isMotorized,
          category: v.category || (classification.isMotorized ? "TRACTORS" : "IMPLEMENTS"),
          type: v.type || (classification.isMotorized ? "vehicle" : "tool"),
          x: x,
          y: parseFloat(v.y || 0),
          z: z,
          location: getSpatialZone(x, z, processedFields),
          controller: controller,
          isAIActive: isAI,
          fillTypes: fillTypesRaw ? cleanFillTypeName(fillTypesRaw) : "Empty",
          fillLevels: fillLevelsRaw,
          lastMovedDelta: distMoved
        };

        liveVehicles.push(entityRecord);

        if (classification.isMotorized) {
          motorVehicles.push(entityRecord);
        } else {
          implementsList.push(entityRecord);
        }
      } catch (vehErr) {
        console.warn(`⚠️ Warning: Error parsing live vehicle node #${idx + 1}. Skipped:`, vehErr.message);
      }
    });
  }

  // Line 519: Compute Summary Card Totals
  const cardSummary = {
    totalFleetItems: liveVehicles.length,
    totalMotorVehicles: motorVehicles.length,
    totalImplements: implementsList.length,
    totalFields: processedFields.length,
    totalCultivatedFields: cultivatedFieldCount,
    totalSeededFields: seededFieldCount,
    activePlayerCount: activePlayers.length,
    movementDetected: movementDetected
  };

  const inGameCalendar = resolveInGameCalendar(null, null, server.dayTime);
  console.log(`🕒 In-Game Live Clock: [ ${inGameCalendar.formattedStamp} ]`);
  console.log(`📊 Fleet Separation: ${motorVehicles.length} Motor Vehicles | ${implementsList.length} Implements | ${processedFields.length} Fields Tracked`);

  console.log(`📡 [2/4] Connecting to G-Portal FTP at ${ftpHost}:${ftpPort}...`);
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

    let activeSlot = "3";
    let mapFilename = "FS25_The_Rural_Farmlands_Of_Ohio.zip";
    let rawServerConfig = "";

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
      } catch (e) {
        console.warn(`⚠️ Warning: Unable to read config candidate ${p}:`, e.message);
      }
    }

    const slotNodeName = `savegame${activeSlot}`;
    console.log(`🎯 Active Savegame Locked via Dedicated Server: [ Slot #${activeSlot} -> /fs25/${slotNodeName} ] | Map: ${mapFilename}`);

    if (activePlayers.length === 0 && !isForceRun) {
      console.log("💤 No active players online. Updating live clock, cards, and server status only.");
      await updateDb('fs25', {
        inGameCalendar: inGameCalendar,
        cards: cardSummary,
        lastUpdated: new Date().toISOString()
      });
      await updateDb(`fs25/${slotNodeName}`, {
        inGameCalendar: inGameCalendar,
        cards: cardSummary,
        lastUpdated: new Date().toISOString()
      });
      client.close();
      process.exit(0);
    }

    const targetFolder = `savegame${activeSlot}`;
    console.log(`📂 [3/4] Ingesting Live Savegame State from [ ${targetFolder} ]...`);

    const farmXmlContent = await downloadFtpFileToString(client, `${targetFolder}/farms.xml`).catch(err => {
      console.warn("⚠️ Warning: Could not retrieve farms.xml:", err.message);
      return "";
    });

    const parsedFarms = farmXmlContent ? await parseXmlString(sanitizeXml(farmXmlContent)) : null;
    const farmFinances = {};

    if (parsedFarms && parsedFarms.farms && parsedFarms.farms.farm) {
      const fList = Array.isArray(parsedFarms.farms.farm) ? parsedFarms.farms.farm : [parsedFarms.farms.farm];
      fList.forEach(f => {
        try {
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
        } catch (farmErr) {
          console.warn(`⚠️ Warning: Error parsing finances for farm:`, farmErr.message);
        }
      });
    }

    const catalogLookup = await fetchWebsiteCatalog();

    const activeMods = {};
    if (rawServerConfig) {
      try {
        const cfgJson = await parseXmlString(rawServerConfig);
        const modsRoot = (cfgJson && cfgJson.gameserver && cfgJson.gameserver.mods) || (cfgJson && cfgJson.dedicatedServer && cfgJson.dedicatedServer.mods);
        if (modsRoot && modsRoot.mod) {
          const mList = Array.isArray(modsRoot.mod) ? modsRoot.mod : [modsRoot.mod];
          mList.forEach(m => {
            const modFile = m.filename || (typeof m === 'string' ? m : "");
            if (modFile) {
              const cleanKey = modFile.replace(/\.zip$/i, '');
              const enriched = catalogLookup[cleanKey.toLowerCase()] || catalogLookup[normalizeKey(cleanKey)] || null;
              activeMods[cleanKey] = {
                modKey: cleanKey,
                name: (enriched && enriched.name) ? enriched.name : cleanEntityName(cleanKey),
                author: (enriched && enriched.author) ? enriched.author : (m.author || "ModHub / Giants"),
                image: (enriched && (enriched.image || enriched.imageUrl)) ? (enriched.image || enriched.imageUrl) : null,
                category: (enriched && (enriched.category || enriched.categorySecondary)) ? (enriched.category || enriched.categorySecondary) : "General",
                description: (enriched && enriched.description) ? enriched.description : "",
                size: (enriched && enriched.size) ? enriched.size : "",
                crossplay: (enriched && enriched.crossplay) ? enriched.crossplay : "Yes"
              };
            }
          });
        }
      } catch (modErr) {
        console.warn("⚠️ Warning: Error extracting active mods:", modErr.message);
      }
    }

    console.log(`💾 [4/4] Writing Live Telemetry & Financial updates to Firebase via PATCH...`);
    const updateStamp = new Date().toISOString();

    // Line 662: Master payload writing classified collections and total count card metrics
    const livePayload = {
      lastUpdated: updateStamp,
      inGameCalendar: inGameCalendar,
      activeSaveSlot: String(activeSlot),
      activeSlotNode: slotNodeName,
      activePlayers: activePlayers,
      cards: cardSummary,
      fleetTelemetry: liveVehicles,
      motorVehicles: motorVehicles,
      implements: implementsList,
      fields: processedFields,
      finances: farmFinances,
      activeMods: activeMods
    };

    await updateDb('fs25', livePayload);

    await updateDb(`fs25/${slotNodeName}`, {
      lastUpdated: updateStamp,
      inGameCalendar: inGameCalendar,
      cards: cardSummary,
      finances: farmFinances,
      fleetTelemetry: liveVehicles,
      motorVehicles: motorVehicles,
      implements: implementsList,
      fields: processedFields
    });

    for (const [farmKey, finObj] of Object.entries(farmFinances)) {
      try {
        await updateDb(`fs25/farms/${farmKey}/finances`, finObj);
        await updateDb(`fs25/${slotNodeName}/farms/${farmKey}/finances`, finObj);
      } catch (patchErr) {
        console.warn(`⚠️ Warning: Targeted financial patch failed for ${farmKey}:`, patchErr.message);
      }
    }

    console.log(`🏆 Live Sync Completed: Processed ${motorVehicles.length} motor vehicles, ${implementsList.length} implements, ${processedFields.length} fields, and updated card summaries.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.warn("⚠️ Warning: Pipeline execution interrupted:", err.message);
    if (client) client.close();
    process.exit(0);
  }
}

// Line 710: Trigger pipeline
runPipeline();
