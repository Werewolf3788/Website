/* ============================================================================
 * File: index.js
 * Deployment Timestamp: 2026-09-20 23:00:00 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: https://fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Zero-Loss FS25 Savegame Ingestion, Human-Readable Formatting & Multi-Channel Discord Dispatcher.
 *              - Server Status Webhook (Online/Offline)
 *              - Player Join/Leave Session Webhook with Duration Tracking
 *              - Mod Addition/Removal Webhook with Official ModHub Search Links
 *              - Contract & Mission Dispatcher Webhook
 *              - Farm 1 & Farm 2 Fleet Purchase/Sale Webhooks
 *              - Ready-to-Harvest Field Dispatcher Webhook
 *              - Dual-Database Output: Primary fs25-a3563 + Mirror entertainment-71888
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Failsafe)
// ============================================================================
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting process cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: DISCORD WEBHOOKS REGISTRY
// ============================================================================
const DISCORD_WEBHOOKS = {
  serverStatus: "https://discord.com/api/webhooks/1488029532912091136/gM5RkLFNI4pGDrsLBUJUhbHGCvHsu3c5zx6VVqvldAvJIgUtm8kkKGeTMBS55o82dLgi",
  playerSessions: "https://discord.com/api/webhooks/1488028769124880404/fltyjCdVfOv8OVknmyMRskqJYm3zPC5jXWXQE4UtA5O19J5lEBZzznTDfHBNkTsPfi3s",
  modsChangelog: "https://discord.com/api/webhooks/1488029322836049930/kkM9UYblgvnCutVPHvJhVbzVTI4ZFlDYpoRfq9zs7G6QvV8XDH1ntbHR_QZFgEm7hu94",
  missionsBoard: "https://discord.com/api/webhooks/1488029093344837635/9ik1yeBXbN7DI8iRJT4o_tmqLFlPFpIEOnSAd37uTvBIOl1cYCa6OzNjhauEJNMwGPMl",
  farm1Fleet: "https://discord.com/api/webhooks/1488030788334125129/vsWFxLOdiNCx9YEN5RQSdHchoEx_8j6tXnAzk9PxmDiEykhCanZt3NHRorl2zQjTiO-b",
  farm2Fleet: "https://discord.com/api/webhooks/1490657337856229427/ETynE6IrWVt9O-hidiaSG4Q3pdvZ7OTo3wt0mXItReCl-a4kSwgIbTOCInOb19aPd0TA",
  harvestReady: "https://discord.com/api/webhooks/1551427702119202916/McN0vSybBa4WGovm7q9nFa1JX5t8xvFVZjU46oU_q63il30rVNCEviUP08Y_GG-3FdMa"
};

async function sendDiscordEmbed(webhookUrl, embedPayload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embedPayload)
    });
  } catch (err) {
    console.warn(`[DISCORD NOTIFY ERROR]:`, err.message);
  }
}

// ============================================================================
// SECTION 3: FIREBASE RTDB REST CLIENTS
// ============================================================================
const PRIMARY_RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";
const MIRROR_RTDB_URL = "https://entertainment-71888-default-rtdb.firebaseio.com";
const DB_AUTH_PARAM = process.env.FIREBASE_DATABASE_SECRET ? `?auth=${process.env.FIREBASE_DATABASE_SECRET}` : '';

async function setDb(baseUrl, path, data) {
  const url = `${baseUrl}/${path}.json${DB_AUTH_PARAM}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Firebase write error at ${baseUrl}/${path}: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function getDb(baseUrl, path) {
  try {
    const url = `${baseUrl}/${path}.json${DB_AUTH_PARAM}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ============================================================================
// SECTION 4: NETWORK, HOST & DICTIONARIES
// ============================================================================
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;
const GITHUB_IMG_BASE = `https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/`;

const BRAND_NAME_MAP = {
  "caseih": "Case IH",
  "johndeere": "John Deere",
  "newholland": "New Holland",
  "fendt": "Fendt",
  "claas": "CLAAS",
  "masseyferguson": "Massey Ferguson",
  "valtra": "Valtra",
  "deutzfahr": "Deutz-Fahr",
  "rostselmash": "Rostselmash",
  "kubota": "Kubota",
  "kuhn": "Kuhn",
  "krone": "Krone",
  "lemken": "Lemken",
  "amazone": "Amazone",
  "horsch": "Horsch",
  "pottinger": "Pöttinger",
  "strautmann": "Strautmann",
  "bergmann": "Bergmann",
  "vaderstad": "Väderstad",
  "hardi": "Hardi",
  "breviglieri": "Breviglieri",
  "bednar": "Bednar",
  "salford": "Salford",
  "kinze": "Kinze",
  "greatplains": "Great Plains",
  "jcb": "JCB",
  "manitou": "Manitou",
  "merlo": "Merlo",
  "lizard": "Lizard"
};

function cleanEntityName(filepath) {
  if (!filepath) return "Equipment";
  const normalized = filepath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  
  let brand = "";
  for (const seg of segments) {
    const lower = seg.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (BRAND_NAME_MAP[lower]) {
      brand = BRAND_NAME_MAP[lower];
      break;
    }
  }

  const filename = segments.pop()?.replace(/\.xml$/i, '') || "Equipment";
  let cleanModel = filename
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleanModel = cleanModel.replace(/\b\w/g, c => c.toUpperCase());

  if (brand && !cleanModel.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${cleanModel}`;
  }
  return cleanModel;
}

function resolveVehicleCategory(filename, cleanName) {
  const text = `${filename} ${cleanName}`.toLowerCase();
  if (text.includes("harvester") || text.includes("combine") || text.includes("cottonpicker") || text.includes("forageharvester") || text.includes("sugarbeetharvester")) {
    return "Combines & Harvesters";
  }
  if (text.includes("tractor") || text.includes("quadtrac") || text.includes("series") || text.includes("8r") || text.includes("9r") || text.includes("magnum")) {
    return "Tractors";
  }
  if (text.includes("planter") || text.includes("seeder") || text.includes("sowingmachine") || text.includes("drill")) {
    return "Planters & Seeders";
  }
  if (text.includes("plow") || text.includes("cultivator") || text.includes("disc") || text.includes("harrow") || text.includes("subsoiler") || text.includes("roller")) {
    return "Cultivators & Plows";
  }
  if (text.includes("trailer") || text.includes("tipper") || text.includes("wagon") || text.includes("transporter") || text.includes("flatbed") || text.includes("tanker")) {
    return "Trailers & Transport";
  }
  if (text.includes("mower") || text.includes("tedder") || text.includes("windrower") || text.includes("baler")) {
    return "Baling & Grassland";
  }
  return "Implements & Tools";
}

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
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (e) {
    return null;
  }
}

function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return "0m";
  const sec = Math.max(0, Math.floor(Number(totalSeconds)));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
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

async function pingServerLiveStats() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(STATS_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const clean = sanitizeXml(text);
      if (clean.includes('<Server') || clean.includes('<Slots') || clean.includes('<slots')) {
        let players = [];
        let activeSlot = null;
        let mapTitle = "Farming Simulator 25 Dedicated Server";

        const parsed = await parseXmlString(clean);
        const serverNode = parsed ? parsed.Server : null;

        if (serverNode && serverNode.Slots && serverNode.Slots.Player) {
          const rawP = Array.isArray(serverNode.Slots.Player) ? serverNode.Slots.Player : [serverNode.Slots.Player];
          players = rawP
            .filter(p => p && (p.isUsed === "true" || p._ || p.name))
            .map(p => ({
              name: p._ || p.name || "Player",
              isUsed: true
            }));
        }

        const mapMatch = clean.match(/mapTitle="([^"]+)"/i) || clean.match(/mapName="([^"]+)"/i);
        if (mapMatch) mapTitle = mapMatch[1];

        const slotMatch = clean.match(/savegame="(\d+)"/i) || clean.match(/savegameSlot="(\d+)"/i);
        if (slotMatch) activeSlot = slotMatch[1];

        return { isOnline: true, text: clean, players, activeSlot, mapTitle, parsed: serverNode };
      }
    }
  } catch (err) {
    console.warn("⚠️ Dedicated server ping offline:", err.message);
  }
  return { isOnline: false, text: "", players: [], activeSlot: null, mapTitle: "Farming Simulator 25", parsed: null };
}

// ============================================================================
// SECTION 5: ZERO-LOSS CARD COMPILER
// ============================================================================
async function buildCleanStructuredSave(rawFiles) {
  const parsedTree = {};
  for (const [key, rawContent] of Object.entries(rawFiles)) {
    parsedTree[key] = await parseXmlString(rawContent);
  }

  const farmNameMap = {};
  const farms = {};

  function initFarmTemplate(fId, farmName, color, raw) {
    return {
      farmId: fId,
      name: farmName,
      money: parseFloat(raw.money || 0),
      loan: parseFloat(raw.loan || 0),
      finances: {
        money: parseFloat(raw.money || 0),
        loan: parseFloat(raw.loan || 0),
        balance: parseFloat(raw.money || 0) - parseFloat(raw.loan || 0)
      },
      color: color || "1",
      players: raw.players ? (Array.isArray(raw.players.player) ? raw.players.player : [raw.players.player]) : [],
      vehicles: [],
      placeables: [],
      cards: {
        fleet: [],
        categorizedFleet: {},
        incomeGenerators: [],
        farmlandOwned: [],
        factories: [],
        animals: [],
        palletsAndBales: []
      }
    };
  }

  if (parsedTree['farms'] && parsedTree['farms'].farms && parsedTree['farms'].farms.farm) {
    const farmList = Array.isArray(parsedTree['farms'].farms.farm) ? parsedTree['farms'].farms.farm : [parsedTree['farms'].farms.farm];
    farmList.forEach(f => {
      const fId = String(f.farmId || f.id || '1');
      const farmName = f.name || `Farm ${fId}`;
      farmNameMap[fId] = farmName;
      farms[`farm_${fId}`] = initFarmTemplate(fId, farmName, f.color, f);
    });
  }

  if (Object.keys(farms).length === 0) {
    farms['farm_1'] = initFarmTemplate("1", "Farm 1", "1", {});
    farmNameMap["1"] = "Farm 1";
  }

  // 1. VEHICLES INGESTION & CATEGORIZATION
  if (parsedTree['vehicles'] && parsedTree['vehicles'].vehicles && parsedTree['vehicles'].vehicles.vehicle) {
    const vehList = Array.isArray(parsedTree['vehicles'].vehicles.vehicle) ? parsedTree['vehicles'].vehicles.vehicle : [parsedTree['vehicles'].vehicles.vehicle];
    
    vehList.forEach(v => {
      const fId = String(v.farmId || "0");
      const filename = v.filename || "";
      const cleanName = cleanEntityName(filename);
      const category = resolveVehicleCategory(filename, cleanName);

      // Parse Fill Units
      const fillUnits = [];
      if (v.fillUnit && v.fillUnit.unit) {
        const uList = Array.isArray(v.fillUnit.unit) ? v.fillUnit.unit : [v.fillUnit.unit];
        uList.forEach((u, uIdx) => {
          const fillLiters = parseFloat(u.fillLevel || 0);
          const capacity = parseFloat(u.capacity || fillLiters || 1);
          const pct = Math.min(100, Math.max(0, Math.round((fillLiters / capacity) * 100)));
          const fillTypeClean = (u.fillType || "Bulk").replace(/([A-Z])/g, ' $1').trim();
          
          fillUnits.push({
            index: uIdx,
            fillType: fillTypeClean,
            liters: fillLiters,
            capacity: capacity,
            percent: pct
          });
        });
      }

      const vehicleItem = {
        id: String(v.id || Math.random().toString(36).substring(7)),
        farmId: fId,
        name: cleanName,
        category: category,
        price: parseFloat(v.price || 0),
        operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
        damagePercent: Math.round((parseFloat(v.operatingDamage || 0)) * 100),
        wearPercent: Math.round((parseFloat(v.wear || 0)) * 100),
        fillUnits: fillUnits
      };

      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].vehicles.push(vehicleItem);
        farms[`farm_${fId}`].cards.fleet.push(vehicleItem);

        if (!farms[`farm_${fId}`].cards.categorizedFleet[category]) {
          farms[`farm_${fId}`].cards.categorizedFleet[category] = [];
        }
        farms[`farm_${fId}`].cards.categorizedFleet[category].push(vehicleItem);
      }
    });
  }

  // 2. FARMLAND OWNERSHIP
  const farmlands = [];
  if (parsedTree['farmland'] && parsedTree['farmland'].farmlands && parsedTree['farmland'].farmlands.farmland) {
    const fList = Array.isArray(parsedTree['farmland'].farmlands.farmland) ? parsedTree['farmland'].farmlands.farmland : [parsedTree['farmland'].farmlands.farmland];
    fList.forEach(f => {
      const fId = String(f.farmId || "0");
      const isOwned = fId !== "0";
      const item = {
        id: parseInt(f.id, 10),
        farmId: fId,
        ownerName: isOwned ? (farmNameMap[fId] || `Farm ${fId}`) : "Available for Purchase",
        isOwned: isOwned,
        price: parseFloat(f.price || 0),
        areaHa: parseFloat(f.area || 0)
      };
      farmlands.push(item);
      if (isOwned && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.farmlandOwned.push(item);
      }
    });
  }

  // 3. FIELDS & AGRONOMY (Ready to Harvest Tracker)
  const fields = [];
  if (parsedTree['fields'] && parsedTree['fields'].fields && parsedTree['fields'].fields.field) {
    const list = Array.isArray(parsedTree['fields'].fields.field) ? parsedTree['fields'].fields.field : [parsedTree['fields'].fields.field];
    list.forEach(fld => {
      const fieldId = parseInt(fld.id || 0, 10);
      const matchedFarmland = farmlands.find(fl => fl.id === fieldId);
      const farmId = matchedFarmland ? matchedFarmland.farmId : String(fld.farmId || "0");
      const growthStage = parseInt(fld.growthState || fld.growthStage || 0, 10);
      const isReadyToHarvest = growthStage >= 6;
      const fruitType = (fld.fruitType || fld.fruitTypeName || "Unseeded").replace(/([A-Z])/g, ' $1').trim();

      fields.push({
        fieldId: fieldId,
        farmId: farmId,
        fruitType: fruitType,
        growthStage: growthStage,
        isReadyToHarvest: isReadyToHarvest,
        fertilizedLevel: parseInt(fld.fertilized || fld.fertilizerLevel || 0, 10),
        needsLime: String(fld.needsLime || 'false').toLowerCase() === 'true',
        needsPlowing: String(fld.needsPlowing || 'false').toLowerCase() === 'true'
      });
    });
  }

  // 4. MISSIONS / CONTRACTS
  const missions = { available: [], inProgress: [], finished: [], all: [] };
  if (parsedTree['missions'] && parsedTree['missions'].missions) {
    const rawList = parsedTree['missions'].missions.mission || parsedTree['missions'].missions.fieldMission || [];
    const list = Array.isArray(rawList) ? rawList : [rawList];
    list.forEach((m, idx) => {
      const statusRaw = parseInt(m.status || 0, 10);
      const type = (m.type || m.missionType || "Contract").replace(/([A-Z])/g, ' $1').trim();
      const missionItem = {
        id: String(m.id || m.uniqueId || `contract_${idx + 1}`),
        title: `${type} - Field ${m.fieldId || 'N/A'}`,
        type: type,
        status: statusRaw === 1 ? "In Progress" : (statusRaw === 2 ? "Finished" : "Available"),
        statusCode: statusRaw,
        fieldId: parseInt(m.fieldId || 0, 10),
        reward: parseFloat(m.reward || 0),
        rewardFormatted: formatCurrency(parseFloat(m.reward || 0)),
        reimbursement: parseFloat(m.reimbursement || 0),
        hasLeasedVehicles: !!(m.vehicles && (m.vehicles.group || m.vehicles.spawned === "true"))
      };

      missions.all.push(missionItem);
      if (statusRaw === 0) missions.available.push(missionItem);
      else if (statusRaw === 1) missions.inProgress.push(missionItem);
      else if (statusRaw === 2) missions.finished.push(missionItem);
    });
  }

  // 5. COLLECTIBLES (Transparent 25% if unfound, 100% if found)
  const collectibles = { foundCount: 0, totalCount: 100, items: [] };
  if (parsedTree['collectibles'] && parsedTree['collectibles'].collectibles) {
    const list = parsedTree['collectibles'].collectibles.collectible || parsedTree['collectibles'].collectibles.item || [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach((c, idx) => {
      const isCollected = String(c.collected || c.isFound || c.found || '').toLowerCase() === 'true' || c.collected === '1';
      if (isCollected) collectibles.foundCount++;
      collectibles.items.push({
        id: idx + 1,
        name: c.name || `Collectible #${idx + 1}`,
        isFound: isCollected
      });
    });
    collectibles.totalCount = collectibles.items.length || 100;
  }

  // 6. ACTIVE MODS CATALOG WITH OFFICIAL MODHUB SEARCH URL
  const activeMods = {};
  if (parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame && parsedTree['careerSavegame'].careerSavegame.mod) {
    const mList = Array.isArray(parsedTree['careerSavegame'].careerSavegame.mod) ? parsedTree['careerSavegame'].careerSavegame.mod : [parsedTree['careerSavegame'].careerSavegame.mod];
    mList.forEach(m => {
      const rawName = typeof m === 'string' ? m : (m.modName || m.name || m.filename || m._ || "");
      if (!rawName) return;
      const cleanKey = rawName.replace(/\.zip$/i, '');
      const cleanTitle = cleanKey.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const modhubSearchUrl = `https://www.farming-simulator.com/mods.php?title=fs2025&searchKeyword=${encodeURIComponent(cleanTitle)}`;

      activeMods[cleanKey] = {
        name: cleanTitle,
        author: m.author || "Community Creator",
        version: m.version || "1.0.0.0",
        description: m.description || "Official ModHub Community Modification",
        platform: m.platform || "PC / Console",
        matchedInCatalog: true,
        storeUrl: modhubSearchUrl,
        image: `${GITHUB_IMG_BASE}${encodeURIComponent(cleanKey)}.jpg`
      };
    });
  }

  // 7. WEATHER & ENVIRONMENT ATMOSPHERE
  let weatherState = {
    currentDay: 1,
    dayTime: 12,
    season: "Spring",
    currentWeather: "SUNNY",
    isSnowing: false,
    snowHeight: 0,
    isRaining: false,
    groundWetness: 0,
    isTwisterActive: false
  };

  if (parsedTree['environment'] && parsedTree['environment'].environment) {
    const env = parsedTree['environment'].environment;
    weatherState.currentDay = parseInt(env.currentDay || 1, 10);
    weatherState.dayTime = parseFloat(env.dayTime || 12);
    
    if (env.weather) {
      weatherState.snowHeight = parseFloat(env.weather.snow?.height || 0);
      weatherState.isSnowing = weatherState.snowHeight > 0.02;
      weatherState.groundWetness = parseFloat(env.weather.ground?.wetness || 0);
      weatherState.isRaining = weatherState.groundWetness > 0.05;
      weatherState.isTwisterActive = String(env.weather.twister?.isSpawned || 'false').toLowerCase() === 'true';

      if (weatherState.isTwisterActive) weatherState.currentWeather = "TORNADO";
      else if (weatherState.isSnowing) weatherState.currentWeather = "SNOW";
      else if (weatherState.isRaining) weatherState.currentWeather = "RAIN";
      else weatherState.currentWeather = "SUNNY";
    }
  }

  return {
    farms,
    farmlands,
    fields,
    missions,
    collectibles,
    activeMods,
    weatherState
  };
}

// ============================================================================
// SECTION 6: DISCORD NOTIFICATION CONTROLLER (Diffing Engine)
// ============================================================================
async function runDiscordDiffAlerts(previousData, currentData, serverPing) {
  const prevStatus = previousData.serverStatus || {};
  const currStatus = currentData.serverStatus || {};

  // 1. Server Online / Offline Alerts
  if (prevStatus.isOnline !== undefined && prevStatus.isOnline !== currStatus.isOnline) {
    const isOnline = currStatus.isOnline;
    await sendDiscordEmbed(DISCORD_WEBHOOKS.serverStatus, {
      username: "FS25 Dedicated HQ",
      avatar_url: "https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/Farming_Simulator_25_Poster_Image.jpg",
      embeds: [{
        title: isOnline ? "🟢 DEDICATED SERVER ONLINE" : "🔴 DEDICATED SERVER OFFLINE",
        description: isOnline 
          ? `Server is online and responding. Active Map: **${serverPing.mapTitle}**`
          : "Server stopped responding on port 9050. Telemetry halted.",
        color: isOnline ? 0x22c55e : 0xef4444,
        timestamp: new Date().toISOString()
      }]
    });
  }

  // 2. Player Joins / Leaves with Session Duration
  const prevPlayers = Array.isArray(previousData.activePlayersList) ? previousData.activePlayersList : [];
  const currPlayers = Array.isArray(serverPing.players) ? serverPing.players : [];

  const playerSessions = previousData.playerSessionTracker || {};
  const now = Date.now();

  currPlayers.forEach(cp => {
    if (!playerSessions[cp.name]) {
      playerSessions[cp.name] = { joinedAt: now };
      sendDiscordEmbed(DISCORD_WEBHOOKS.playerSessions, {
        username: "FS25 Player Operations",
        embeds: [{
          title: "🚜 Player Connected",
          description: `**${cp.name}** joined the server.`,
          color: 0x38bdf8,
          timestamp: new Date().toISOString()
        }]
      });
    }
  });

  prevPlayers.forEach(pp => {
    const stillHere = currPlayers.some(cp => cp.name === pp.name);
    if (!stillHere && playerSessions[pp.name]) {
      const sessionDuration = Math.max(0, Math.floor((now - playerSessions[pp.name].joinedAt) / 1000));
      delete playerSessions[pp.name];
      sendDiscordEmbed(DISCORD_WEBHOOKS.playerSessions, {
        username: "FS25 Player Operations",
        embeds: [{
          title: "🚪 Player Disconnected",
          description: `**${pp.name}** left the server.\nSession Duration: **${formatDuration(sessionDuration)}**`,
          color: 0xf59e0b,
          timestamp: new Date().toISOString()
        }]
      });
    }
  });
  currentData.playerSessionTracker = playerSessions;
  currentData.activePlayersList = currPlayers;

  // 3. Mod Changelog (Added / Removed)
  const prevMods = previousData.activeMods || {};
  const currMods = currentData.activeMods || {};

  for (const [mKey, mVal] of Object.entries(currMods)) {
    if (!prevMods[mKey]) {
      await sendDiscordEmbed(DISCORD_WEBHOOKS.modsChangelog, {
        username: "FS25 Mod Logistics",
        embeds: [{
          title: "📦 New Mod Added",
          description: `**${mVal.name}** has been installed on the server.\n\n${mVal.description}`,
          color: 0x10b981,
          fields: [
            { name: "Author", value: mVal.author, inline: true },
            { name: "Version", value: mVal.version, inline: true },
            { name: "Platform", value: mVal.platform, inline: true },
            { name: "Official ModHub Link", value: `[Search ModHub](${mVal.storeUrl})`, inline: false }
          ],
          thumbnail: { url: mVal.image },
          timestamp: new Date().toISOString()
        }]
      });
    }
  }

  for (const [mKey, mVal] of Object.entries(prevMods)) {
    if (!currMods[mKey]) {
      await sendDiscordEmbed(DISCORD_WEBHOOKS.modsChangelog, {
        username: "FS25 Mod Logistics",
        embeds: [{
          title: "🗑️ Mod Removed",
          description: `**${mVal.name}** was uninstalled from the server.`,
          color: 0xef4444,
          timestamp: new Date().toISOString()
        }]
      });
    }
  }

  // 4. New Mission Contracts Available
  const prevMissionIds = new Set((previousData.missions?.available || []).map(m => m.id));
  const currAvailable = currentData.missions?.available || [];

  for (const m of currAvailable) {
    if (!prevMissionIds.has(m.id)) {
      await sendDiscordEmbed(DISCORD_WEBHOOKS.missionsBoard, {
        username: "FS25 Job Board",
        embeds: [{
          title: `📋 New Job Contract: ${m.title}`,
          description: `A new contract is available on the municipal job board.\nReward: **${m.rewardFormatted}**`,
          color: 0x38bdf8,
          fields: [
            { name: "Task Type", value: m.type, inline: true },
            { name: "Field ID", value: String(m.fieldId), inline: true },
            { name: "Leased Machinery", value: m.hasLeasedVehicles ? "Available" : "Bring Your Own", inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  }

  // 5. Fleet Purchases & Sales (Farm 1 & Farm 2)
  const trackFleetChanges = async (farmKey, farmName, webhookUrl) => {
    const prevFleet = (previousData.farms?.[farmKey]?.vehicles || []).reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
    const currFleet = (currentData.farms?.[farmKey]?.vehicles || []).reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
    const totalCount = Object.keys(currFleet).length;

    for (const [id, v] of Object.entries(currFleet)) {
      if (!prevFleet[id]) {
        await sendDiscordEmbed(webhookUrl, {
          username: `${farmName} Fleet Manager`,
          embeds: [{
            title: `🚜 Vehicle Purchased: ${v.name}`,
            description: `**${farmName}** added a new unit to their fleet.\nCategory: **${v.category}**\nValue: **${formatCurrency(v.price)}**`,
            color: 0x22c55e,
            footer: { text: `Total Active Fleet: ${totalCount} Machinery Units` },
            timestamp: new Date().toISOString()
          }]
        });
      }
    }

    for (const [id, v] of Object.entries(prevFleet)) {
      if (!currFleet[id]) {
        await sendDiscordEmbed(webhookUrl, {
          username: `${farmName} Fleet Manager`,
          embeds: [{
            title: `💰 Vehicle Sold: ${v.name}`,
            description: `**${farmName}** sold an equipment unit from their fleet.`,
            color: 0xef4444,
            footer: { text: `Total Active Fleet: ${totalCount} Machinery Units` },
            timestamp: new Date().toISOString()
          }]
        });
      }
    }
  };

  await trackFleetChanges('farm_1', 'Farm 1', DISCORD_WEBHOOKS.farm1Fleet);
  await trackFleetChanges('farm_2', 'Farm 2', DISCORD_WEBHOOKS.farm2Fleet);

  // 6. Ready-to-Harvest Field Alerts
  const prevHarvestFields = new Set((previousData.fields || []).filter(f => f.isReadyToHarvest).map(f => f.fieldId));
  const currFields = currentData.fields || [];

  for (const f of currFields) {
    if (f.isReadyToHarvest && !prevHarvestFields.has(f.fieldId) && (f.farmId === "1" || f.farmId === "2")) {
      await sendDiscordEmbed(DISCORD_WEBHOOKS.harvestReady, {
        username: "FS25 Agronomy Dispatch",
        embeds: [{
          title: `🌾 Field #${f.fieldId} Ready to Harvest!`,
          description: `**Farm ${f.farmId}** parcel has matured.\nCrop: **${f.fruitType}**\nFertilizer: **${f.fertilizedLevel * 50}%**`,
          color: 0x84cc16,
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
}

// ============================================================================
// SECTION 7: PIPELINE ENTRY POINT
// ============================================================================
async function runPipeline() {
  console.log("📡 [1/4] Querying Server Stats...");
  const serverPing = await pingServerLiveStats();
  const activeSlot = serverPing.activeSlot || process.env.DEFAULT_SAVE_SLOT || "1";

  const previousData = (await getDb(PRIMARY_RTDB_URL, 'fs25')) || {};

  const currentPayload = {
    serverStatus: {
      isOnline: serverPing.isOnline,
      activePlayers: serverPing.players.length,
      lastChecked: new Date().toISOString()
    },
    activePlayers: serverPing.players.length,
    activeSaveSlot: String(activeSlot),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    config: {
      appId: "1:528331196894:web:5af51bc2c80fd56aecf54f",
      projectId: "fs25-a3563",
      gaTag: "G-CTYHDF4MSD",
      measurementId: "G-SGJF0FJPQZ",
      activeSaveSlot: String(activeSlot)
    }
  };

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Updating status and halting.");
    await setDb(PRIMARY_RTDB_URL, 'fs25/serverStatus', currentPayload.serverStatus);
    await setDb(MIRROR_RTDB_URL, 'fs25/serverStatus', currentPayload.serverStatus);
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

    const targetCandidates = [
      `profile/savegame${activeSlot}`,
      `savegame${activeSlot}`,
      `profile/savegame_${activeSlot}`,
      `savegame_${activeSlot}`,
      'profile/savegame1',
      'savegame1'
    ];

    let activeSavePath = null;
    let fileList = [];

    for (const targetPath of targetCandidates) {
      try {
        const list = await client.list(targetPath);
        if (list && list.length > 0) {
          activeSavePath = targetPath;
          fileList = list;
          break;
        }
      } catch (e) {}
    }

    if (!activeSavePath) {
      throw new Error(`Unable to locate savegame directory for Slot #${activeSlot}`);
    }

    console.log(`📂 [3/4] Pulling XML files from [ ${activeSavePath} ]...`);
    const readableFiles = fileList.filter(f => !f.isDirectory && f.name.toLowerCase().endsWith('.xml'));
    const rawFileCache = {};

    for (const file of readableFiles) {
      const remoteFilePath = `${activeSavePath}/${file.name}`;
      const rawBaseName = file.name.replace(/\.xml$/i, '');
      try {
        const content = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXml(content);
        if (cleanContent) rawFileCache[rawBaseName] = cleanContent;
      } catch (err) {}
    }

    console.log("🚜 Compiling cards and calculating state diffs...");
    const cleanData = await buildCleanStructuredSave(rawFileCache);

    currentPayload.farms = cleanData.farms;
    currentPayload.farmlands = cleanData.farmlands;
    currentPayload.fields = cleanData.fields;
    currentPayload.missions = cleanData.missions;
    currentPayload.collectibles = cleanData.collectibles;
    currentPayload.activeMods = cleanData.activeMods;
    currentPayload.weatherState = cleanData.weatherState;

    // Execute Multi-Channel Discord Alerts
    await runDiscordDiffAlerts(previousData, currentPayload, serverPing);

    console.log("💾 [4/4] Writing full state to Primary and Mirror Databases...");
    await setDb(PRIMARY_RTDB_URL, 'fs25', currentPayload);
    await setDb(MIRROR_RTDB_URL, 'fs25', currentPayload);

    client.close();
    console.log("🏆 Pipeline Execution Succeeded. All databases and Discord channels notified.");
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Failed:", err.message);
    client.close();
    process.exit(1);
  }
}

runPipeline();
