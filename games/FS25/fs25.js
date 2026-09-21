/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-21 00:08:45 (CDT - Chicago)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: https://fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Deep-Inspection Zero-Loss FS25 Ingestion & Card Synchronization.
 *              - Dynamic Slot Routing: Automatically identifies the active slot
 *                (e.g., Slot 1 -> savegame1, Slot 3 -> savegame3) and syncs the
 *                full payload directly into both `/fs25` AND `/fs25/savegame{slot}`
 *                so slot-specific states are always preserved.
 *              - In-Game Time & Month Extraction: Parses live daytime and calendar
 *                month directly from Port 9050 stats, environment.xml, and careerSavegame.
 *              - Zero "(Unknown)" placeholders: Fallback chains scan internal XML
 *                sub-nodes, raw file paths, and catalogs.
 *              - Animals Husbandry Deep Scan: Headcounts, clusters, feed types
 *                (Hay, Grass, TMR), and outputs (Milk, Slurry, Manure, Straw).
 *              - Fleet & Trailers Deep Inspection: Cargo fill levels, capacity percentages,
 *                attachment couplings, spatial field/coordinate zones.
 *              - Production Deep Inspection: Factory type, active status, missing inputs,
 *                storage capacities, distribution modes (Keep/Sell/Distribute), and owners.
 *              - Active Mods Exclusive: Pulls only mods verified on G-Portal, enriched
 *                with websiteMods properties and grouped categorically.
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Process Failsafe)
// ============================================================================
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting process cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: DIRECT FIREBASE RTDB REST CLIENT (fs25-a3563)
// ============================================================================
const RTDB_URL = "https://fs25-a3563-default-rtdb.firebaseio.com";

async function updateDb(path, data) {
  const res = await fetch(`${RTDB_URL}/${path}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Firebase write error at ${path}: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function setDb(path, data) {
  const res = await fetch(`${RTDB_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Firebase write error at ${path}: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function getDb(path) {
  try {
    const res = await fetch(`${RTDB_URL}/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ============================================================================
// SECTION 3: NETWORK CONFIGURATION
// ============================================================================
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;
const GITHUB_IMG_BASE = `https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/`;

const REPO_IMAGES = {
  "balenet": "Bale_Net.JPG",
  "baletwine": "Bale_Twine.JPG",
  "balewrap": "Bale_Wrap.JPG",
  "barley": "Barley.JPG",
  "barleyswath": "Barley_Swath.JPG",
  "beetroot": "Beetroot.JPG",
  "bread": "Bread.JPG",
  "butter": "Butter.JPG",
  "cabbage": "Cabbage.JPG",
  "canola": "Canola.JPG",
  "carrots": "Carrots.JPG",
  "cereal": "Cereal.JPG",
  "chaff": "Chaff.JPG",
  "cheese": "Cheese.JPG",
  "chickens": "Chickens.JPG",
  "corn": "Corn.JPG",
  "cotton": "Cotton.JPG",
  "cow": "Cow.JPG",
  "diesel": "Diesel.JPG",
  "eggs": "Eggs.JPG",
  "flour": "Flour.JPG",
  "grapes": "Grapes.JPG",
  "grass": "Grass.JPG",
  "hay": "Hay.JPG",
  "horses": "Horses.JPG",
  "lime": "Lime.JPG",
  "liquidfertilizer": "Liquid_Fertilizer.JPG",
  "manure": "Manure.JPG",
  "milk": "Milk.JPG",
  "oats": "Oats.JPG",
  "pigs": "Pigs.JPG",
  "potatoes": "Potatoes.JPG",
  "rice": "Rice.JPG",
  "seeds": "Seeds.JPG",
  "sheep": "Sheep.JPG",
  "silage": "Silage.JPG",
  "slurry": "Slurry.JPG",
  "solidfertilizer": "Solid_Fertilizer.JPG",
  "soybeans": "Soybeans.JPG",
  "straw": "Straw.JPG",
  "sunflowers": "Sunflowers.JPG",
  "water": "Water.jpg",
  "wheat": "Wheat.JPG",
  "woodchips": "Wood_Chips.JPG"
};

// ============================================================================
// SECTION 4: IN-GAME TIME & CALENDAR PARSERS
// ============================================================================
const FS_MONTHS = [
  "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December", "January", "February"
];

function formatInGameMinutes(minutesRaw) {
  if (minutesRaw === null || minutesRaw === undefined || isNaN(minutesRaw)) {
    return { rawMinutes: 0, time24: "00:00", time12: "12:00 AM", hours: 0, minutes: 0 };
  }
  const totalMins = Math.floor(parseFloat(minutesRaw)) % 1440;
  const hours24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 >= 12 ? "PM" : "AM";

  const padH = String(hours24).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');

  return {
    rawMinutes: totalMins,
    time24: `${padH}:${padM}`,
    time12: `${hours12}:${padM} ${ampm}`,
    hours: hours24,
    minutes: mins
  };
}

function resolveInGameCalendar(envNode, careerNode, statsDayTime) {
  const env = envNode && (envNode.environment || envNode);
  const career = careerNode && (careerNode.careerSavegame || careerNode);

  let rawDayTime = null;
  if (statsDayTime !== null && statsDayTime !== undefined) {
    rawDayTime = parseFloat(statsDayTime);
  } else if (env && env.dayTime !== undefined) {
    rawDayTime = parseFloat(env.dayTime);
  } else if (career && career.dayTime !== undefined) {
    rawDayTime = parseFloat(career.dayTime);
  }

  const timeObj = formatInGameMinutes(rawDayTime);

  let monthIndex = 0;
  let dayInMonth = 1;
  let seasonName = "Spring";

  const rawMonth = env && (env.currentMon || env.currentMonth || env.month);
  const currentDay = env && (env.currentDay || env.day);
  const daysPerPeriod = parseInt((env && env.daysPerPeriod) || (career && career.plannedDaysPerPeriod) || 1, 10);

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
    time: timeObj.time12,
    time24: timeObj.time24,
    hours: timeObj.hours,
    minutes: timeObj.minutes,
    month: monthName,
    monthIndex: monthIndex + 1,
    dayInMonth: dayInMonth,
    season: seasonName,
    daysPerPeriod: daysPerPeriod,
    formattedStamp: `${monthName} (Day ${dayInMonth}) - ${timeObj.time12}`
  };
}

// ============================================================================
// SECTION 5: UTILITY PARSERS & STRING SANITIZERS
// ============================================================================
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
    .replace(/^(fillType_|filltype_|ft_)/i, '')
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

function formatSheetImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
    }
  }
  return url;
}

function resolveBestImage(entityKey, sheetRecord) {
  if (sheetRecord && typeof sheetRecord === 'object') {
    const candidateColumns = [
      sheetRecord.image, sheetRecord.image_b, sheetRecord.imageUrl,
      sheetRecord.url_image, sheetRecord.img, sheetRecord.picture
    ];

    for (const cand of candidateColumns) {
      const formatted = formatSheetImageUrl(cand);
      if (formatted) return formatted;
    }
  }

  const rawKey = normalizeKey(entityKey);
  if (!rawKey) return null;

  if (REPO_IMAGES[rawKey]) {
    return `${GITHUB_IMG_BASE}${encodeURIComponent(REPO_IMAGES[rawKey])}`;
  }

  for (const [dictKey, fileName] of Object.entries(REPO_IMAGES)) {
    if (rawKey.includes(dictKey) || dictKey.includes(rawKey)) {
      return `${GITHUB_IMG_BASE}${encodeURIComponent(fileName)}`;
    }
  }
  return null;
}

function getSpatialZone(node, fieldList = []) {
  if (node.fieldId) return `Field ${node.fieldId}`;
  if (node.farmlandId) return `Farmland Plot ${node.farmlandId}`;
  
  const pos = node.position || (node.transform && node.transform.position) || (node.bale && node.bale.position);
  if (typeof pos === 'string') {
    const coords = pos.trim().split(/\s+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[2] || coords[1])) {
      const x = Math.round(coords[0]);
      const z = Math.round(coords[2] || coords[1]);

      if (fieldList && fieldList.length > 0) {
        const matchedField = fieldList.find(f => {
          if (f.xMin !== undefined && f.xMax !== undefined && f.zMin !== undefined && f.zMax !== undefined) {
            return x >= f.xMin && x <= f.xMax && z >= f.zMin && z <= f.zMax;
          }
          return false;
        });
        if (matchedField) return `Field ${matchedField.fieldId}`;
      }

      const xGrid = Math.floor(x / 100) * 100;
      const zGrid = Math.floor(z / 100) * 100;
      return `Sector (${xGrid}, ${zGrid})`;
    }
  }
  return "Farm Grounds";
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
        let players = 0;
        let activeSlot = null;
        let mapTitle = "";
        let dayTimeRaw = null;

        const slotsMatch = clean.match(/numUsed="(\d+)"/i) || clean.match(/slots\s+numUsed="(\d+)"/i);
        if (slotsMatch) {
          players = parseInt(slotsMatch[1], 10);
        } else {
          const playerMatches = clean.match(/<Player\b[^>]*>([\s\S]*?)<\/Player>/gi);
          if (playerMatches) players = playerMatches.length;
        }

        const slotMatch = clean.match(/savegame="(\d+)"/i) || 
                          clean.match(/savegameSlot="(\d+)"/i) || 
                          clean.match(/slot="(\d+)"/i) || 
                          clean.match(/<savegame>(\d+)<\/savegame>/i);
        if (slotMatch) activeSlot = slotMatch[1];

        const mapMatch = clean.match(/mapTitle="([^"]+)"/i) || clean.match(/mapName="([^"]+)"/i);
        if (mapMatch) mapTitle = mapMatch[1];

        const dayTimeMatch = clean.match(/dayTime="([\d\.]+)"/i) || clean.match(/<dayTime>([\d\.]+)<\/dayTime>/i);
        if (dayTimeMatch) dayTimeRaw = parseFloat(dayTimeMatch[1]);

        const parsed = await parseXmlString(clean);
        return { isOnline: true, text: clean, players, activeSlot, mapTitle, dayTimeRaw, parsed: parsed ? parsed.Server : null };
      }
    }
  } catch (err) {
    console.warn("⚠️ Dedicated server ping returned offline:", err.message);
  }
  return { isOnline: false, text: "", players: 0, activeSlot: null, mapTitle: "", dayTimeRaw: null, parsed: null };
}

async function fetchModsCatalog() {
  try {
    const rawVal = (await getDb('websiteMods')) || {};
    const catalogLookup = {};

    Object.keys(rawVal).forEach(k => {
      const item = rawVal[k];
      if (item && typeof item === 'object') {
        const cleanFile = (item.filename || k).replace(/\.zip$/i, '');
        catalogLookup[k.toLowerCase()] = item;
        catalogLookup[cleanFile.toLowerCase()] = item;
        catalogLookup[normalizeKey(cleanFile)] = item;

        if (item.name) {
          catalogLookup[normalizeKey(item.name)] = item;
        }
      }
    });

    return catalogLookup;
  } catch (err) {
    console.warn("⚠️ Could not read /websiteMods catalog:", err.message);
    return {};
  }
}

// ============================================================================
// SECTION 6: ZERO-LOSS CARD COMPILER & AGGREGATOR
// ============================================================================
async function buildCleanStructuredSave(rawFiles, catalogLookup, rawServerConfigXml, statsDayTime, resolvedSlot) {
  const parsedTree = {};
  for (const [key, rawContent] of Object.entries(rawFiles)) {
    parsedTree[key] = await parseXmlString(rawContent);
  }

  const inGameCalendar = resolveInGameCalendar(parsedTree['environment'], parsedTree['careerSavegame'], statsDayTime);

  const farmNameMap = {};
  const farms = {};

  function initFarmTemplate(fId, farmName, color, raw) {
    return {
      farmId: fId,
      name: farmName,
      finances: {
        money: parseFloat(raw.money || 0),
        loan: parseFloat(raw.loan || 0),
        balance: parseFloat(raw.money || 0) - parseFloat(raw.loan || 0),
        history: raw.statistics || raw.history || {}
      },
      color: color || "1",
      players: raw.players ? (Array.isArray(raw.players.player) ? raw.players.player : [raw.players.player]) : [],
      rawFarmData: raw,
      vehicles: [],
      placeables: [],
      handTools: [],
      cards: {
        palletsAndBales: [],
        animals: [],
        factories: [],
        fleet: [],
        trailers: [],
        harvestersAndCombines: [],
        incomeGenerators: [],
        farmlandOwned: [],
        assignedMissions: [],
        handTools: [],
        generalPlaceables: []
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
    farms['farm_1'] = initFarmTemplate("1", "Main Farm", "1", {});
    farmNameMap["1"] = "Main Farm";
  }

  const fieldsAgronomy = [];
  if (parsedTree['fields'] && parsedTree['fields'].fields && parsedTree['fields'].fields.field) {
    const list = Array.isArray(parsedTree['fields'].fields.field) ? parsedTree['fields'].fields.field : [parsedTree['fields'].fields.field];
    list.forEach(fld => {
      const cropRaw = fld.fruitType || fld.fruitTypeName || fld.sprayType || "";
      const cleanCrop = cropRaw ? cleanFillTypeName(cropRaw) : "Fallow / Cultivated";

      fieldsAgronomy.push({
        fieldId: parseInt(fld.id || 0, 10),
        farmId: String(fld.farmId || "0"),
        fruitType: cleanCrop,
        growthStage: parseInt(fld.growthState || fld.growthStage || 0, 10),
        fertilizedLevel: parseInt(fld.fertilized || fld.fertilizerLevel || 0, 10),
        weedState: parseInt(fld.weedState || 0, 10),
        needsLime: String(fld.needsLime || 'false').toLowerCase() === 'true',
        needsPlowing: String(fld.needsPlowing || 'false').toLowerCase() === 'true',
        raw: fld
      });
    });
  }

  const globalCards = {
    palletsAndBales: [],
    animals: [],
    factories: [],
    fleet: [],
    trailers: [],
    harvestersAndCombines: [],
    incomeGenerators: [],
    farmlands: [],
    missions: { available: [], inProgress: [], finished: [], failed: [], all: [] },
    handTools: [],
    dealershipSales: [],
    collectibles: [],
    fieldsAgronomy: fieldsAgronomy
  };

  const activeMods = {};
  const activeModsByCategory = {};
  const discoveredModsMeta = new Map();

  if (rawServerConfigXml) {
    const cfgJson = await parseXmlString(rawServerConfigXml);
    if (cfgJson && cfgJson.dedicatedServer && cfgJson.dedicatedServer.mods && cfgJson.dedicatedServer.mods.mod) {
      const mList = Array.isArray(cfgJson.dedicatedServer.mods.mod) ? cfgJson.dedicatedServer.mods.mod : [cfgJson.dedicatedServer.mods.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m._ || m.name || m.filename || "");
        if (modId) {
          const cleanKey = modId.trim().replace(/\.zip$/i, '');
          discoveredModsMeta.set(cleanKey, {
            gportalAuthor: m.author || null,
            gportalTitle: m.title || m.name || null
          });
        }
      });
    }
  }

  if (parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame && parsedTree['careerSavegame'].careerSavegame.mod) {
    const mList = Array.isArray(parsedTree['careerSavegame'].careerSavegame.mod) ? parsedTree['careerSavegame'].careerSavegame.mod : [parsedTree['careerSavegame'].careerSavegame.mod];
    mList.forEach(m => {
      const modId = typeof m === 'string' ? m : (m.modName || m.name || m.filename || m._ || "");
      if (modId) {
        const cleanKey = modId.trim().replace(/\.zip$/i, '');
        const existing = discoveredModsMeta.get(cleanKey) || {};
        discoveredModsMeta.set(cleanKey, {
          gportalAuthor: m.author || existing.gportalAuthor || null,
          gportalTitle: m.title || m.name || existing.gportalTitle || null
        });
      }
    });
  }

  for (const [cleanModKey, gportalMeta] of discoveredModsMeta.entries()) {
    const lookupKey = normalizeKey(cleanModKey);
    const websiteData = catalogLookup[cleanModKey.toLowerCase()] || 
                        catalogLookup[`${cleanModKey.toLowerCase()}.zip`] || 
                        catalogLookup[lookupKey] || null;

    const modAuthor = gportalMeta.gportalAuthor || (websiteData && websiteData.author) || "ModHub / Giants";
    const modName = gportalMeta.gportalTitle || (websiteData && websiteData.name) || cleanEntityName(cleanModKey);
    const modUrl = (websiteData && (websiteData.url || websiteData.pageurl || websiteData.link)) ? (websiteData.url || websiteData.pageurl || websiteData.link) : null;
    const modSize = (websiteData && websiteData.size) ? websiteData.size : "";
    const modImage = (websiteData && websiteData.image) ? formatSheetImageUrl(websiteData.image) : resolveBestImage(cleanModKey, websiteData);
    const modDescription = (websiteData && websiteData.description) ? websiteData.description : "";
    const modCategory = (websiteData && (websiteData.category || websiteData.categorySecondary)) ? (websiteData.category || websiteData.categorySecondary) : "General";

    const modEntry = {
      modKey: cleanModKey,
      name: modName,
      author: modAuthor,
      category: modCategory,
      description: modDescription,
      image: modImage,
      url: modUrl,
      size: modSize,
      crossplay: (websiteData && websiteData.crossplay) ? websiteData.crossplay : "Yes",
      modType: (websiteData && websiteData.modType) ? websiteData.modType : "Mod",
      filename: `${cleanModKey}.zip`,
      matchedInWebsite: !!websiteData
    };

    activeMods[cleanModKey] = modEntry;

    const catKey = modCategory.trim() || "General";
    if (!activeModsByCategory[catKey]) {
      activeModsByCategory[catKey] = [];
    }
    activeModsByCategory[catKey].push(modEntry);
  }

  Object.keys(activeModsByCategory).forEach(cat => {
    activeModsByCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  const flatVehicles = [];
  if (parsedTree['vehicles'] && parsedTree['vehicles'].vehicles && parsedTree['vehicles'].vehicles.vehicle) {
    const vehList = Array.isArray(parsedTree['vehicles'].vehicles.vehicle) ? parsedTree['vehicles'].vehicles.vehicle : [parsedTree['vehicles'].vehicles.vehicle];
    
    const vehLookupById = {};
    vehList.forEach(v => {
      if (v.id) vehLookupById[v.id] = v;
    });

    vehList.forEach(v => {
      const fId = String(v.farmId || "0");
      const filename = v.filename || "";
      let matchedMod = null;

      for (const [mKey, mVal] of Object.entries(activeMods)) {
        if (filename.toLowerCase().includes(mKey.toLowerCase())) {
          matchedMod = mVal;
          break;
        }
      }

      const cleanName = matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename);
      const itemImage = (matchedMod && matchedMod.image) ? matchedMod.image : (resolveBestImage(cleanName, null) || resolveBestImage(filename, null));
      const lower = (filename + " " + cleanName).toLowerCase();
      const locationZone = getSpatialZone(v, fieldsAgronomy);

      const cargoList = [];
      let totalCapacity = 0;
      let totalFill = 0;

      if (v.fillUnit && v.fillUnit.unit) {
        const units = Array.isArray(v.fillUnit.unit) ? v.fillUnit.unit : [v.fillUnit.unit];
        units.forEach(u => {
          const fill = parseFloat(u.fillLevel || 0);
          const cap = parseFloat(u.capacity || 0);
          const typeName = u.fillType || u.fillTypeName || "";
          totalCapacity += cap;
          totalFill += fill;

          if (fill > 0) {
            cargoList.push({
              cropType: cleanFillTypeName(typeName),
              fillLevel: Math.round(fill),
              capacity: Math.round(cap),
              percentage: cap > 0 ? parseFloat(((fill / cap) * 100).toFixed(1)) : 100
            });
          }
        });
      }

      const primaryCargo = cargoList.length > 0 
        ? `${cargoList[0].cropType} (${cargoList[0].fillLevel.toLocaleString()} L - ${cargoList[0].percentage}%)` 
        : (totalCapacity > 0 ? "Empty" : "Standard Equipment");

      let coupledTo = null;
      let hasAttachedImplement = false;
      if (v.attacherJoints && v.attacherJoints.attachedImplement) {
        hasAttachedImplement = true;
      }
      if (v.attachable && v.attachable.attachedToVehicleId) {
        const parentVeh = vehLookupById[v.attachable.attachedToVehicleId];
        coupledTo = parentVeh ? cleanEntityName(parentVeh.filename || "Prime Mover") : `Vehicle #${v.attachable.attachedToVehicleId}`;
      }

      if (v.bale || lower.includes("bale") || lower.includes("pallet") || lower.includes("bigbag") || lower.includes("fillablepallet")) {
        let baleDetails = {};
        if (v.bale) {
          const b = v.bale;
          const fill = parseFloat(b.fillLevel || 0);
          const isWrapped = String(b.isWrapped || b.wrappingState || '0') !== '0';
          const crop = cleanFillTypeName(b.fillType || "Grass");

          baleDetails = {
            cropType: crop,
            fillLevel: Math.round(fill),
            isWrapped: isWrapped,
            wrapPercentage: parseFloat(((parseFloat(b.wrappingState || (isWrapped ? 1 : 0))) * 100).toFixed(0)),
            baleValue: parseFloat(b.value || 0)
          };
        }

        const palletBaleItem = {
          id: v.id || "0",
          farmId: fId,
          name: cleanName,
          file: filename,
          image: itemImage,
          location: locationZone,
          cargo: primaryCargo,
          cargoDetails: cargoList,
          baleInfo: baleDetails,
          raw: v
        };
        globalCards.palletsAndBales.push(palletBaleItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.palletsAndBales.push(palletBaleItem);
        }
        return;
      }

      const equipmentItem = {
        id: v.id || "0",
        farmId: fId,
        name: cleanName,
        file: filename,
        image: itemImage,
        location: locationZone,
        price: parseFloat(v.price || 0),
        operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
        ageMonths: parseInt(v.age || 0, 10),
        wearPercentage: parseFloat(((parseFloat(v.wear || 0)) * 100).toFixed(1)),
        damagePercentage: parseFloat(((parseFloat(v.operatingDamage || 0)) * 100).toFixed(1)),
        cargoSummary: primaryCargo,
        cargoDetails: cargoList,
        totalCapacityLiters: Math.round(totalCapacity),
        totalFillLiters: Math.round(totalFill),
        attachedTo: coupledTo,
        hasImplements: hasAttachedImplement,
        raw: v
      };

      flatVehicles.push(equipmentItem);

      if (lower.includes("trailer") || lower.includes("tipper") || lower.includes("wagon") || lower.includes("tanker") || lower.includes("dropdeck") || lower.includes("spreader")) {
        equipmentItem.cardType = "Hauling & Field Trailer";
        globalCards.trailers.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.trailers.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      } else if (lower.includes("harvester") || lower.includes("combine") || lower.includes("cottonpicker") || lower.includes("sugarbeet") || lower.includes("forageharvester")) {
        equipmentItem.cardType = "Harvester / Combine";
        globalCards.harvestersAndCombines.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.harvestersAndCombines.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      } else {
        equipmentItem.cardType = "Fleet Machinery";
        globalCards.fleet.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.fleet.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      }
    });
  }

  const rawPassiveGenerators = [];
  const flatPlaceables = [];

  if (parsedTree['placeables'] && parsedTree['placeables'].placeables && parsedTree['placeables'].placeables.placeable) {
    const plcList = Array.isArray(parsedTree['placeables'].placeables.placeable) ? parsedTree['placeables'].placeables.placeable : [parsedTree['placeables'].placeables.placeable];

    plcList.forEach(p => {
      const fId = String(p.farmId || "0");
      const filename = p.filename || "";
      let matchedMod = null;

      for (const [mKey, mVal] of Object.entries(activeMods)) {
        if (filename.toLowerCase().includes(mKey.toLowerCase())) {
          matchedMod = mVal;
          break;
        }
      }

      const cleanName = matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename);
      const itemImage = (matchedMod && matchedMod.image) ? matchedMod.image : (resolveBestImage(cleanName, null) || resolveBestImage(filename, null));
      const lower = (filename + " " + cleanName).toLowerCase();
      const locationZone = getSpatialZone(p, fieldsAgronomy);

      const placeableItem = {
        id: p.id || "0",
        farmId: fId,
        ownerFarm: farmNameMap[fId] || `Farm ${fId}`,
        name: cleanName,
        file: filename,
        image: itemImage,
        location: locationZone,
        price: parseFloat(p.price || 0),
        raw: p
      };
      flatPlaceables.push(placeableItem);

      const isGenerator = lower.includes("solar") || lower.includes("wind") || lower.includes("turbine") || 
                          lower.includes("subsidy") || lower.includes("subsidies") || lower.includes("generator") || 
                          lower.includes("bga") || lower.includes("biogas");

      if (isGenerator) {
        rawPassiveGenerators.push({
          ...placeableItem,
          zone: locationZone,
          rawNode: p
        });
        return;
      }

      if (p.husbandryAnimals || p.husbandry || p.animals || lower.includes("husbandry") || lower.includes("barn") || lower.includes("pasture") || lower.includes("coop") || lower.includes("pen")) {
        let totalHeadCount = 0;
        const animalClusters = [];
        const clustersNode = (p.husbandryAnimals && p.husbandryAnimals.clusters) || (p.animals && p.animals.cluster);

        if (clustersNode) {
          const rawClusters = Array.isArray(clustersNode.animal) ? clustersNode.animal : (Array.isArray(clustersNode) ? clustersNode : [clustersNode]);
          rawClusters.forEach(c => {
            const count = parseInt(c.numAnimals || c.count || 1, 10);
            totalHeadCount += count;
            animalClusters.push({
              breed: cleanFillTypeName(c.subType || c.type || cleanName),
              count: count,
              ageMonths: parseInt(c.age || 0, 10),
              healthPercentage: parseFloat(((parseFloat(c.health || 1)) * 100).toFixed(0)),
              reproductionPercentage: parseFloat(((parseFloat(c.reproduction || 0)) * 100).toFixed(0))
            });
          });
        }

        const resources = {
          hayLiters: 0,
          grassLiters: 0,
          tmrLiters: 0,
          strawLiters: 0,
          milkLiters: 0,
          slurryLiters: 0,
          manureLiters: 0,
          waterLiters: 0
        };

        const fillUnits = (p.husbandryAnimals && p.husbandryAnimals.fillUnit) || (p.husbandry && p.husbandry.fillUnit) || (p.fillUnit && p.fillUnit.unit);
        if (fillUnits) {
          const units = Array.isArray(fillUnits) ? fillUnits : (Array.isArray(fillUnits.unit) ? fillUnits.unit : [fillUnits]);
          units.forEach(u => {
            const fType = (u.fillType || u.fillTypeName || "").toLowerCase();
            const level = Math.round(parseFloat(u.fillLevel || 0));

            if (fType.includes("hay")) resources.hayLiters += level;
            else if (fType.includes("grass")) resources.grassLiters += level;
            else if (fType.includes("forage") || fType.includes("tmr")) resources.tmrLiters += level;
            else if (fType.includes("straw")) resources.strawLiters += level;
            else if (fType.includes("milk")) resources.milkLiters += level;
            else if (fType.includes("slurry") || fType.includes("liquidmanure")) resources.slurryLiters += level;
            else if (fType.includes("manure")) resources.manureLiters += level;
            else if (fType.includes("water")) resources.waterLiters += level;
          });
        }

        const animalCard = {
          ...placeableItem,
          totalAnimals: totalHeadCount,
          clusters: animalClusters,
          feedInventory: {
            hay: `${resources.hayLiters.toLocaleString()} L`,
            grass: `${resources.grassLiters.toLocaleString()} L`,
            tmr: `${resources.tmrLiters.toLocaleString()} L`,
            straw: `${resources.strawLiters.toLocaleString()} L`,
            water: `${resources.waterLiters.toLocaleString()} L`
          },
          byproducts: {
            milk: `${resources.milkLiters.toLocaleString()} L`,
            slurry: `${resources.slurryLiters.toLocaleString()} L`,
            manure: `${resources.manureLiters.toLocaleString()} L`
          }
        };

        globalCards.animals.push(animalCard);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.animals.push(animalCard);
          farms[`farm_${fId}`].placeables.push(animalCard);
        }
        return;
      }

      if (p.productionPoint || lower.includes("production") || lower.includes("factory") || lower.includes("mill") || lower.includes("bakery") || lower.includes("greenhouse") || lower.includes("dairy")) {
        const prodNode = p.productionPoint || {};
        const productions = [];
        const missingInputs = [];
        let totalFactoryFill = 0;
        let totalFactoryCapacity = 0;
        let isFactoryActive = false;

        if (prodNode.productions && prodNode.productions.production) {
          const prods = Array.isArray(prodNode.productions.production) ? prodNode.productions.production : [prodNode.productions.production];
          prods.forEach(pr => {
            const isEnabled = String(pr.status || pr.isEnabled || 'false').toLowerCase() === 'true' || pr.status === '1';
            if (isEnabled) isFactoryActive = true;

            productions.push({
              name: cleanFillTypeName(pr.id || pr.name || "Process"),
              status: isEnabled ? "Running" : "Halted",
              cyclesPerHour: parseFloat(pr.cyclesPerHour || 0)
            });
          });
        }

        const storageList = [];
        if (prodNode.storage && prodNode.storage.node) {
          const nodes = Array.isArray(prodNode.storage.node) ? prodNode.storage.node : [prodNode.storage.node];
          nodes.forEach(n => {
            const fill = parseFloat(n.fillLevel || 0);
            const cap = parseFloat(n.capacity || 0);
            const typeName = cleanFillTypeName(n.fillType || "Input");
            const modeCode = parseInt(n.outputMode || 0, 10);
            
            let mode = "Storing";
            if (modeCode === 1) mode = "Direct Selling";
            else if (modeCode === 2) mode = "Distributing";

            totalFactoryFill += fill;
            totalFactoryCapacity += cap;

            if (fill === 0 && cap > 0) {
              missingInputs.push(typeName);
            }

            storageList.push({
              item: typeName,
              fillLevelLiters: Math.round(fill),
              capacityLiters: Math.round(cap),
              percentage: cap > 0 ? parseFloat(((fill / cap) * 100).toFixed(1)) : 0,
              distributionMode: mode
            });
          });
        }

        const factoryCard = {
          ...placeableItem,
          factoryStatus: isFactoryActive ? "Active / In Production" : "Idle / Suspended",
          missingSupplies: missingInputs.length > 0 ? missingInputs.join(", ") : "Adequately Supplied",
          totalInventoryLiters: Math.round(totalFactoryFill),
          totalStorageCapacityLiters: Math.round(totalFactoryCapacity),
          storageFillPercentage: totalFactoryCapacity > 0 ? parseFloat(((totalFactoryFill / totalFactoryCapacity) * 100).toFixed(1)) : 0,
          activeProductionLines: productions,
          storageInventory: storageList
        };

        globalCards.factories.push(factoryCard);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.factories.push(factoryCard);
          farms[`farm_${fId}`].placeables.push(factoryCard);
        }
        return;
      }

      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.generalPlaceables.push(placeableItem);
        farms[`farm_${fId}`].placeables.push(placeableItem);
      }
    });
  }

  const incomeGroups = {};
  rawPassiveGenerators.forEach(gen => {
    let normalizedCategory = gen.name;
    const lower = gen.name.toLowerCase();
    if (lower.includes("subsidy") || lower.includes("subsidies")) normalizedCategory = "Government Subsidy";
    else if (lower.includes("solar")) normalizedCategory = "Solar Panel Array";
    else if (lower.includes("wind") || lower.includes("turbine")) normalizedCategory = "Wind Turbine";
    else if (lower.includes("biogas") || lower.includes("bga")) normalizedCategory = "Biogas Plant (BGA)";

    const groupKey = `${gen.farmId}_${normalizedCategory}_${gen.zone}`;

    if (!incomeGroups[groupKey]) {
      let hourlyRate = 0;
      let monthlyRate = 0;

      const raw = gen.rawNode;
      if (raw.incomePerHour) hourlyRate = parseFloat(raw.incomePerHour);
      if (raw.incomePerMonth) monthlyRate = parseFloat(raw.incomePerMonth);

      if (hourlyRate === 0 && monthlyRate === 0) {
        if (normalizedCategory === "Government Subsidy") {
          monthlyRate = 8400000;
          hourlyRate = monthlyRate / 24;
        } else if (normalizedCategory === "Solar Panel Array") {
          hourlyRate = 380;
          monthlyRate = hourlyRate * 24;
        } else if (normalizedCategory === "Wind Turbine") {
          hourlyRate = 1500;
          monthlyRate = hourlyRate * 24;
        }
      }

      incomeGroups[groupKey] = {
        sourceName: normalizedCategory,
        farmId: gen.farmId,
        farmName: farmNameMap[gen.farmId] || `Farm ${gen.farmId}`,
        locationZone: gen.zone,
        count: 0,
        totalInvestedValue: 0,
        hourlyRatePerUnit: hourlyRate,
        monthlyRatePerUnit: monthlyRate,
        image: gen.image || resolveBestImage(normalizedCategory, null),
        individualIds: []
      };
    }

    incomeGroups[groupKey].count += 1;
    incomeGroups[groupKey].totalInvestedValue += gen.price;
    incomeGroups[groupKey].individualIds.push(gen.id);
  });

  Object.values(incomeGroups).forEach(group => {
    const totalHourly = group.hourlyRatePerUnit * group.count;
    const totalMonthly = group.monthlyRatePerUnit * group.count;
    const formattedTitle = `[${group.sourceName} - ${group.count} Units - ${formatCurrency(group.totalInvestedValue)} Total - ${group.locationZone}]`;

    const summaryCard = {
      cardTitle: formattedTitle,
      source: group.sourceName,
      totalUnits: group.count,
      totalFarmValue: group.totalInvestedValue,
      totalFarmValueFormatted: formatCurrency(group.totalInvestedValue),
      farmId: group.farmId,
      farmName: group.farmName,
      location: group.locationZone,
      revenueSchedule: {
        perHour: totalHourly,
        perHourFormatted: formatCurrency(totalHourly),
        perMonth: totalMonthly,
        perMonthFormatted: formatCurrency(totalMonthly),
        displayPayout: totalMonthly > 0 ? `${formatCurrency(totalMonthly)} / month` : `${formatCurrency(totalHourly)} / hr`
      },
      image: group.image,
      itemIds: group.individualIds
    };

    globalCards.incomeGenerators.push(summaryCard);
    if (group.farmId !== "0" && farms[`farm_${group.farmId}`]) {
      farms[`farm_${group.farmId}`].cards.incomeGenerators.push(summaryCard);
    }
  });

  if (parsedTree['farmland'] && parsedTree['farmland'].farmlands && parsedTree['farmland'].farmlands.farmland) {
    const list = Array.isArray(parsedTree['farmland'].farmlands.farmland) ? parsedTree['farmland'].farmlands.farmland : [parsedTree['farmland'].farmlands.farmland];
    list.forEach(f => {
      const farmId = String(f.farmId || "0");
      const isOwned = farmId !== "0";
      const item = {
        id: parseInt(f.id, 10),
        farmId: farmId,
        ownerName: isOwned ? (farmNameMap[farmId] || `Farm ${farmId}`) : "Available For Purchase",
        isOwned: isOwned,
        price: parseFloat(f.price || 0),
        areaHa: parseFloat(f.area || 0),
        raw: f
      };
      globalCards.farmlands.push(item);
      if (isOwned && farms[`farm_${farmId}`]) {
        farms[`farm_${farmId}`].cards.farmlandOwned.push(item);
      }
    });
  }

  if (parsedTree['missions'] && parsedTree['missions'].missions) {
    const rawList = parsedTree['missions'].missions.mission || parsedTree['missions'].missions.fieldMission || [];
    const list = Array.isArray(rawList) ? rawList : [rawList];
    
    list.forEach((m, idx) => {
      const statusRaw = parseInt(m.status || 0, 10);
      let statusText = "Available";
      if (statusRaw === 1) statusText = "In Progress";
      else if (statusRaw === 2) statusText = "Finished";
      else if (statusRaw === 3) statusText = "Failed";

      const assignedFarmId = String(m.farmId || m.contractorFarmId || m.activeFarmId || "0");
      const isClaimed = assignedFarmId !== "0" && assignedFarmId !== "" && assignedFarmId !== "undefined";
      const type = (m.type || m.missionType || "Contract").replace(/([A-Z])/g, ' $1').trim();
      const fruitRaw = m.fruitType || m.fruitTypeName || "";

      const missionItem = {
        id: String(m.id || m.uniqueId || `contract_${idx + 1}`),
        title: `${type} (Field ${m.fieldId || 'N/A'})`,
        type: type,
        status: statusText,
        statusCode: statusRaw,
        fieldId: parseInt(m.fieldId || 0, 10),
        reward: parseFloat(m.reward || 0),
        rewardFormatted: formatCurrency(parseFloat(m.reward || 0)),
        reimbursement: parseFloat(m.reimbursement || 0),
        completionPercent: parseFloat(((parseFloat(m.completion || m.progress || m.workProgress || 0)) * 100).toFixed(1)),
        cropType: fruitRaw ? cleanFillTypeName(fruitRaw) : "Standard Harvest",
        assignedFarmId: isClaimed ? assignedFarmId : null,
        assignedFarmName: isClaimed ? (farmNameMap[assignedFarmId] || `Farm ${assignedFarmId}`) : "Available on Job Market",
        raw: m
      };

      globalCards.missions.all.push(missionItem);

      if (statusRaw === 0) globalCards.missions.available.push(missionItem);
      else if (statusRaw === 1) globalCards.missions.inProgress.push(missionItem);
      else if (statusRaw === 2) globalCards.missions.finished.push(missionItem);
      else if (statusRaw === 3) globalCards.missions.failed.push(missionItem);

      if (isClaimed && farms[`farm_${assignedFarmId}`]) {
        farms[`farm_${assignedFarmId}`].cards.assignedMissions.push(missionItem);
      }
    });
  }

  if (parsedTree['handTools'] && parsedTree['handTools'].handTools && parsedTree['handTools'].handTools.handTool) {
    const list = Array.isArray(parsedTree['handTools'].handTools.handTool) ? parsedTree['handTools'].handTools.handTool : [parsedTree['handTools'].handTools.handTool];
    list.forEach(t => {
      const fId = String(t.farmId || "0");
      const name = cleanEntityName(t.filename || t.xmlFilename || "Hand Tool");
      const toolItem = {
        id: t.id || "0",
        farmId: fId,
        name: name,
        filename: t.filename || t.xmlFilename || "",
        image: resolveBestImage(name, null),
        raw: t
      };
      globalCards.handTools.push(toolItem);
      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.handTools.push(toolItem);
        farms[`farm_${fId}`].handTools.push(toolItem);
      }
    });
  }

  if (parsedTree['sales'] && parsedTree['sales'].sales && parsedTree['sales'].sales.item) {
    const sList = Array.isArray(parsedTree['sales'].sales.item) ? parsedTree['sales'].sales.item : [parsedTree['sales'].sales.item];
    sList.forEach(s => {
      const name = cleanEntityName(s.xmlFilename || s.filename || "Discount Equipment");
      globalCards.dealershipSales.push({
        id: s.id || Math.random().toString(36).substring(7),
        name: name,
        price: parseFloat(s.price || 0),
        discountPercent: parseFloat(s.discountPercent || 0),
        operatingHours: parseFloat(((parseFloat(s.operatingTime || 0)) / 3600).toFixed(1)),
        wearPercentage: parseFloat(((parseFloat(s.wear || 0)) * 100).toFixed(1)),
        image: resolveBestImage(name, null),
        raw: s
      });
    });
  }

  let collectiblesFound = 0;
  if (parsedTree['collectibles'] && parsedTree['collectibles'].collectibles) {
    const list = parsedTree['collectibles'].collectibles.collectible || parsedTree['collectibles'].collectibles.item || [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach((c, idx) => {
      const isFound = String(c.collected || c.isFound || c.found || '').toLowerCase() === 'true' || c.collected === '1' || c.isFound === '1';
      if (isFound) collectiblesFound++;
      globalCards.collectibles.push({ id: c.index || c.id || idx + 1, name: c.name || `Collectible #${idx + 1}`, isFound, raw: c });
    });
  }

  return {
    slotNumber: String(resolvedSlot),
    slotNode: `savegame${resolvedSlot}`,
    summary: {
      totalFarms: Object.keys(farms).length,
      totalVehicles: flatVehicles.length,
      totalFleet: globalCards.fleet.length,
      totalTrailers: globalCards.trailers.length,
      totalHarvestersAndCombines: globalCards.harvestersAndCombines.length,
      totalPlaceables: flatPlaceables.length,
      totalPalletsAndBales: globalCards.palletsAndBales.length,
      totalAnimalsHusbandry: globalCards.animals.length,
      totalFactories: globalCards.factories.length,
      totalIncomeGeneratorCards: globalCards.incomeGenerators.length,
      totalRawGenerators: rawPassiveGenerators.length,
      totalFarmlandsOwned: globalCards.farmlands.filter(f => f.isOwned).length,
      totalMapFarmlands: globalCards.farmlands.length,
      totalAllMissions: globalCards.missions.all.length,
      activeMissionsCount: globalCards.missions.inProgress.length,
      availableMissionsCount: globalCards.missions.available.length,
      finishedMissionsCount: globalCards.missions.finished.length,
      totalActiveMods: Object.keys(activeMods).length,
      totalModCategories: Object.keys(activeModsByCategory).length
    },
    inGameCalendar: inGameCalendar,
    gameInfo: parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame ? parsedTree['careerSavegame'].careerSavegame : {},
    collectibles: {
      found: collectiblesFound,
      total: 100,
      formatted: `${collectiblesFound}/100`,
      items: globalCards.collectibles.slice(0, 100)
    },
    farmlands: {
      totalMapFarmlands: globalCards.farmlands.length,
      ownedFarmlands: globalCards.farmlands.filter(f => f.isOwned).length,
      list: globalCards.farmlands
    },
    missions: globalCards.missions,
    fields: globalCards.fieldsAgronomy,
    cards: globalCards,
    farms: farms,
    activeMods: activeMods,
    activeModsByCategory: activeModsByCategory,
    allRawParsedXml: parsedTree
  };
}

// ============================================================================
// SECTION 7: PIPELINE EXECUTION ENGINE (Dual Save Routing)
// ============================================================================
async function runPipeline() {
  const isManualRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' || process.argv.includes('--force');
  console.log(`📡 [1/4] Querying Port 9050 Server Stats (Manual Override: ${isManualRun})...`);

  const serverPing = await pingServerLiveStats();

  if (!serverPing.isOnline && !isManualRun) {
    console.log("🛑 Server is OFFLINE. Updating serverStatus node only and halting execution. Zero cards overwritten.");
    await updateDb('fs25/serverStatus', {
      isOnline: false,
      lastChecked: new Date().toISOString()
    });
    process.exit(0);
  }

  const activePlayers = serverPing.players;
  console.log(`✅ Server Status Ping Finished | Active Players: ${activePlayers}`);

  await updateDb('fs25/serverStatus', {
    isOnline: serverPing.isOnline,
    activePlayers: activePlayers,
    lastChecked: new Date().toISOString()
  });

  const existingFs25 = (await getDb('fs25')) || {};
  const isFirstRun = !existingFs25.lastFullSaveSync;
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const lastSlowSyncTime = existingFs25.lastSlowSync || 0;
  const shouldRun6HourSync = isFirstRun || isManualRun || ((Date.now() - lastSlowSyncTime) > SIX_HOURS_MS);

  if (activePlayers === 0 && !shouldRun6HourSync && !isManualRun && !isFirstRun) {
    console.log("💤 0 players online & 6-hour static window not reached yet. Skipping FTP connection.");
    process.exit(0);
  }

  let activeSlot = serverPing.activeSlot || process.env.DEFAULT_SAVE_SLOT || "3";
  console.log(`🎯 Initial Target Savegame Slot: [ Slot #${activeSlot} ]`);

  console.log("📦 Indexing Mod Catalogue from Firebase /websiteMods for active mod enrichment...");
  const catalogLookup = await fetchModsCatalog();
  console.log(`✅ Loaded ${Object.keys(catalogLookup).length} catalog lookups from /websiteMods.`);

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Writing stats payload only.");
    await updateDb('fs25', {
      serverStatus: { isOnline: serverPing.isOnline, activePlayers: activePlayers, lastChecked: new Date().toISOString() }
    });
    process.exit(0);
  }

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

    let rawServerConfigXml = "";
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
          const cfgSlotMatch = cfgXml.match(/savegameSlot="(\d+)"/i) || cfgXml.match(/savegame="(\d+)"/i) || cfgXml.match(/<savegame>(\d+)<\/savegame>/i);
          if (cfgSlotMatch && !serverPing.activeSlot) {
            activeSlot = cfgSlotMatch[1];
            break;
          }
        }
      } catch (e) {}
    }

    const targetCandidates = [
      `profile/savegame${activeSlot}`,
      `savegame${activeSlot}`,
      `profile/savegame_${activeSlot}`,
      `savegame_${activeSlot}`
    ];

    let activeSavePath = null;
    let fileList = [];

    for (const targetPath of targetCandidates) {
      try {
        const list = await client.list(targetPath);
        if (list && list.length > 0) {
          activeSavePath = targetPath;
          fileList = list;
          console.log(`✅ Locked active savegame path: [ ${activeSavePath} ] (Slot #${activeSlot})`);
          break;
        }
      } catch (e) {}
    }

    if (!activeSavePath) {
      let profileList = [];
      try { profileList = await client.list('profile'); } catch (e) {}
      const matchedFolder = profileList.find(f => f.isDirectory && f.name.includes(String(activeSlot)));
      if (matchedFolder) {
        activeSavePath = `profile/${matchedFolder.name}`;
        fileList = await client.list(activeSavePath);
      }
    }

    if (!activeSavePath) {
      throw new Error(`Unable to locate savegame directory for Slot #${activeSlot} on G-Portal FTP server.`);
    }

    const slotNodeName = `savegame${activeSlot}`;
    console.log(`🎯 Active Savegame Locked: [ Slot #${activeSlot} -> /fs25/${slotNodeName} ]`);

    console.log(`📂 [3/4] Pulling ALL XML files from G-Portal: [ ${activeSavePath} ]`);

    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    const rawFileCache = {};

    for (const file of readableFiles) {
      const remoteFilePath = `${activeSavePath}/${file.name}`;
      const rawBaseName = file.name.replace(/\.(xml|txt)$/i, '');

      try {
        const content = await downloadFtpFileToString(client, remoteFilePath);
        const cleanContent = sanitizeXml(content);
        if (cleanContent) {
          rawFileCache[rawBaseName] = cleanContent;
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    console.log("🚜 Structuring deep cards, slot routing, and in-game calendar...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, catalogLookup, rawServerConfigXml, serverPing.dayTimeRaw, activeSlot);

    const slotPayload = {
      slot: String(activeSlot),
      slotNode: slotNodeName,
      lastUpdated: new Date().toISOString(),
      summary: cleanData.summary,
      inGameCalendar: cleanData.inGameCalendar,
      gameInfo: cleanData.gameInfo,
      collectibles: cleanData.collectibles,
      farmlands: cleanData.farmlands,
      missions: cleanData.missions,
      fields: cleanData.fields,
      cards: cleanData.cards,
      farms: cleanData.farms,
      activeMods: cleanData.activeMods,
      activeModsByCategory: cleanData.activeModsByCategory,
      raw_xml: rawFileCache
    };

    const masterFs25Payload = {
      serverStatus: {
        isOnline: serverPing.isOnline,
        activePlayers: activePlayers,
        lastChecked: new Date().toISOString()
      },
      activePlayers: activePlayers,
      activeSaveSlot: String(activeSlot),
      activeSlotNode: slotNodeName,
      liveMapImage: MAP_IMAGE_URL,
      lastUpdated: new Date().toISOString(),
      lastFullSaveSync: new Date().toISOString(),
      lastSlowSync: shouldRun6HourSync ? Date.now() : (existingFs25.lastSlowSync || Date.now()),
      config: { 
        appId: "1:528331196894:web:5af51bc2c80fd56aecf54f",
        projectId: "fs25-a3563",
        gaTag: "G-CTYHDF4MSD",
        measurementId: "G-SGJF0FJPQZ",
        activeSaveSlot: String(activeSlot),
        activeSlotNode: slotNodeName,
        lastConfigSync: new Date().toISOString()
      },
      raw_xml: rawFileCache,
      summary: cleanData.summary,
      inGameCalendar: cleanData.inGameCalendar,
      gameInfo: cleanData.gameInfo,
      collectibles: cleanData.collectibles,
      farmlands: cleanData.farmlands,
      missions: cleanData.missions,
      fields: cleanData.fields,
      cards: cleanData.cards,
      farms: cleanData.farms,
      activeMods: cleanData.activeMods,
      activeModsByCategory: cleanData.activeModsByCategory
    };

    if (serverPing.text) {
      masterFs25Payload.raw_xml.stats = serverPing.text;
      slotPayload.raw_xml.stats = serverPing.text;
    }

    console.log(`💾 [4/4] Writing to active slot node: /fs25/${slotNodeName}...`);
    await setDb(`fs25/${slotNodeName}`, slotPayload);

    console.log(`💾 Writing active state to root /fs25 node...`);
    await updateDb('fs25', masterFs25Payload);

    console.log(`🏆 Dual-Slot Synchronization Successful: Active Slot #${activeSlot} written to /fs25/${slotNodeName} and /fs25.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
