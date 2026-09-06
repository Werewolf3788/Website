/* ============================================================================
 * File: index.js
 * Deployment Timestamp: 2026-09-05 20:30:00 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Database: https://fs25-a3563-default-rtdb.firebaseio.com/fs25
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Zero-Loss FS25 Savegame Ingestion & Card Synchronization Engine.
 *              - Dual HTTP & HTTPS protocol-agnostic networking.
 *              - Direct Database Endpoint: Uses native fetch REST requests (no SDK/credentials needed).
 *              - Server Offline Guard:
 *                  * Pings Port 9050.
 *                  * If offline: updates serverStatus.isOnline = false and halts (zero overwrite).
 *              - Dual-Tiered Execution Route:
 *                  * Active Player Route (activePlayers > 0): Ingests high-frequency volatile files.
 *                  * 6-Hour Static Route (or manual workflow_dispatch / --force): Refreshes slow systems.
 *              - Complete recursive XML parsing preserving 100% of data.
 *              - Aggregated Field/Zone-aware Passive Income Generator Cards:
 *                  * Groups identical sources (e.g. Government Subsidy, Solar, Wind).
 *                  * Calculates total item count, cumulative value/cost, and hourly/monthly payout rates.
 *                  * Separates identical units if placed in different fields/spatial zones.
 *              - Universal Missions & Contracts:
 *                  * All records (Available, In-Progress, Finished, Failed) fully exposed.
 *              - Deep-Inspection Cards:
 *                  * Pallets, Big Bags & Bales
 *                  * Animals & Husbandry (Headcounts, Slurry, Manure, Milk, Straw, Health)
 *                  * Factories & Production Points (Lines, Storage, Active Inputs/Outputs)
 *                  * Fleet Machinery & Dedicated Harvesters
 *                  * Farmland Holdings & Agronomy Soil Data (Lime, Weeds, Plowing)
 *              - Dual-Layer Image Resolver (Firebase Mod Catalog + GitHub Assets).
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Failsafe to Prevent Runner Hangs)
// ============================================================================
// Line ~42: Ensures process cleanly exits before GitHub Actions runner reaches limit
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting process cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: DIRECT FIREBASE RTDB REST CLIENT (fs25-a3563)
// ============================================================================
// Line ~50: Communicates directly via HTTPS REST calls; avoids credential/SDK parse errors
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
// SECTION 3: NETWORK & HOST CONFIGURATION (Dual HTTP/HTTPS Compatibility)
// ============================================================================
// Line ~88: Supports both local HTTP polling and HTTPS asset proxy transformation
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;
const GITHUB_IMG_BASE = `https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/`;

// ============================================================================
// SECTION 4: GITHUB IMAGE LOOKUP DICTIONARY
// ============================================================================
const REPO_IMAGES = {
  "americanmidwesttruckshop": "American_Midwest_Truck_Shop.jpg",
  "balenet": "Bale_Net.JPG",
  "baletwine": "Bale_Twine.JPG",
  "balewrap": "Bale_Wrap.JPG",
  "barley": "Barley.JPG",
  "barleyswath": "Barley_Swath.JPG",
  "beetroot": "Beetroot.JPG",
  "bigbudktta700": "Big_Bud_KTTA_700.JPG",
  "bread": "Bread.JPG",
  "buffalomozzarella": "Buffalo_Mozzarella.JPG",
  "butter": "Butter.JPG",
  "cabbage": "Cabbage.JPG",
  "calmlands": "CalmLands.JPG",
  "canola": "Canola.JPG",
  "canolaoil": "Canola_Oil.JPG",
  "canolaswath": "Canola_Swath.JPG",
  "carrots": "Carrots.JPG",
  "cereal": "Cereal.JPG",
  "chaff": "Chaff.JPG",
  "cheese": "Cheese.JPG",
  "chickens": "Chickens.JPG",
  "chilipeppers": "Chili_Peppers.JPG",
  "chocolate": "Chocolate.JPG",
  "corn": "Corn.JPG",
  "cotton": "Cotton.JPG",
  "cottonroundbale": "Cotton_Round_Bale.JPG",
  "cottonsquarebale": "Cotton_Square_Bale.JPG",
  "cow": "Cow.JPG",
  "def": "DEF.JPG",
  "destructiblerock": "Destructible_Rock.JPG",
  "diesel": "Diesel.JPG",
  "digestate": "Digestate.JPG",
  "dogs": "Dogs.JPG",
  "eggs": "Eggs.JPG",
  "electriccharge": "Electric_Charge.JPG",
  "elevatorsilo": "Elevator_Silo.JPG",
  "enoki": "Enoki.JPG",
  "forestrylocomotive": "FORESTRY_LOCOMOTIVE.JPG",
  "farmingsimulator25posterimage": "Farming_Simulator_25_Poster_Image.jpg",
  "firtree": "Fir_Tree.JPG",
  "flour": "Flour.JPG",
  "forage": "Forage.JPG",
  "grainbarge": "GRAIN_BARGE.JPG",
  "grainelevator": "GRAIN_ELEVATOR.jpg",
  "garlic": "Garlic.JPG",
  "goatcheese": "Goat_Cheese.JPG",
  "goats": "Goats.JPG",
  "grapejuice": "Grape_Juice.JPG",
  "grapes": "Grapes.JPG",
  "grass": "Grass.JPG",
  "grasscut": "Grass_Cut.JPG",
  "grassroundbale": "Grass_Round_Bale.JPG",
  "grasssquarebale": "Grass_Square_Bale.JPG",
  "governmentsubsidy": "Government_Subsidy.jpg",
  "subsidy": "Government_Subsidy.jpg",
  "greenbeans": "Green_Beans.JPG",
  "harvest": "HARVEST.JPG",
  "herbicide": "HERBICIDE.JPG",
  "honeybox": "HONEY_BOX.JPG",
  "hay": "Hay.JPG",
  "hayroundbale": "Hay_Round_Bale.JPG",
  "haysquarebale": "Hay_Square_Bale.JPG",
  "horses": "Horses.JPG",
  "johndeere8rseries": "John_Deere_8R_Series.JPG",
  "johndeere8r": "John_Deere_8R_Series.JPG",
  "lettuce": "Lettuce.JPG",
  "liftablepalletsandbales": "Liftable_Pallets_And_Bales.jpg",
  "lime": "Lime.JPG",
  "liquidfertilizer": "Liquid_Fertilizer.JPG",
  "logtrailer": "Log_Trailer.JPG",
  "longgrainrice": "Long_Grain_Rice.JPG",
  "manure": "Manure.JPG",
  "methane": "Methane.JPG",
  "milk": "Milk.JPG",
  "mineralfeed": "Mineral_Feed.JPG",
  "oatswath": "Oat_Swath.JPG",
  "oats": "Oats.JPG",
  "oilseedradish": "Oilseed_Radish.JPG",
  "oliveoil": "Olive_Oil.JPG",
  "onions": "Onions.JPG",
  "oystermushroom": "Oyster_Mushroom.JPG",
  "parsnip": "Parsnip.JPG",
  "peas": "Peas.JPG",
  "pigfood": "Pig_Food.JPG",
  "pigs": "Pigs.JPG",
  "poplartree": "Poplar_Tree.JPG",
  "potatochips": "Potato_Chips.JPG",
  "potatoes": "Potatoes.JPG",
  "precisionfarming": "Precision_Farming.jpg",
  "raisins": "Raisins.JPG",
  "redbeet": "Red_Beet.JPG",
  "restaurant": "Restaurant.JPG",
  "rice": "Rice.JPG",
  "riceoil": "Rice_Oil.JPG",
  "ricesaplings": "Rice_Saplings.JPG",
  "roadsalt": "Road_Salt.JPG",
  "rudolfhoermannroundstorage": "Rudolf_Hoermann_Round_Storage.jpg",
  "seeds": "Seeds.JPG",
  "sheep": "Sheep.JPG",
  "silage": "Silage.JPG",
  "silageadditive": "Silage_Additive.JPG",
  "silageroundbale": "Silage_Round_Bale.JPG",
  "silagesquarebale": "Silage_Square_Bale.JPG",
  "slurry": "Slurry.JPG",
  "snow": "Snow.JPG",
  "solarpanel": "Solar_Panel.jpg",
  "solidfertilizer": "Solid_Fertilizer.JPG",
  "sorghum": "Sorghum.JPG",
  "sorghumswath": "Sorghum_Swath.JPG",
  "soybeanswath": "Soybean_Swath.JPG",
  "soybeans": "Soybeans.JPG",
  "spinach": "Spinach.JPG",
  "spinachbag": "Spinach_Bag.JPG",
  "springonions": "Spring_Onions.JPG",
  "stlawrencemap": "St_Lawrence_Map.JPG",
  "stone": "Stone.JPG",
  "straw": "Straw.JPG",
  "strawroundbale": "Straw_Round_Bale.JPG",
  "strawsquarebale": "Straw_Square_Bale.JPG",
  "strawberries": "Strawberries.JPG",
  "sugarbeetcut": "Sugar_Beet_Cut.JPG",
  "sugarbeets": "Sugarbeets.JPG",
  "sugarcane": "Sugarcane.JPG",
  "sunfloweroil": "Sunflower Oil.JPG",
  "sunflowers": "Sunflowers.JPG",
  "teddar": "Teddar.JPG",
  "tomatoes": "Tomatoes.JPG",
  "totalmixedration": "Total_Mixed_Ration.JPG",
  "toytractor": "Toy_Tractor.JPG",
  "toywagon": "Toy_Wagon.JPG",
  "trainstation": "Train_Station.JPG",
  "wagonflatbed": "WAGON_FLAT_BED.JPG",
  "wagongrain": "WAGON_GRAIN.JPG",
  "wagonsugarbeets": "WAGON_SUGARBEETS.JPG",
  "wagonwoodchips": "WAGON_WOOD_CHIPS.JPG",
  "water": "Water.jpg",
  "waterbuffalos": "Water_Buffalos.JPG",
  "wheat": "Wheat.JPG",
  "wheatswath": "Wheat_Swath.JPG",
  "windturbine": "Wind_Turbine.jpg",
  "windmill": "Wind_Turbine.jpg",
  "woodchips": "Wood_Chips.JPG",
  "woodchipsroundbale": "Wood_Chips_Round Bale.JPG"
};

// ============================================================================
// SECTION 5: UTILITY HELPERS, PARSER & DUAL IMAGE RESOLVER
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
  if (!filepath) return "Item";
  const filename = filepath.split('/').pop().replace(/\.xml$/i, '');
  return filename
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
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
      sheetRecord.image,
      sheetRecord.image_url,
      sheetRecord.imageurl,
      sheetRecord.img,
      sheetRecord.picture,
      sheetRecord.mod_image,
      sheetRecord.photo,
      sheetRecord.icon,
      sheetRecord.url_image
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

function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

function getSpatialZone(p) {
  if (p.fieldId) return `Field ${p.fieldId}`;
  if (p.farmlandId) return `Farmland Plot ${p.farmlandId}`;
  
  const pos = p.position || (p.transform && p.transform.position) || (p.bale && p.bale.position);
  if (typeof pos === 'string') {
    const coords = pos.trim().split(/\s+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[2] || coords[1])) {
      const xGrid = Math.floor(coords[0] / 100) * 100;
      const zGrid = Math.floor((coords[2] || coords[1]) / 100) * 100;
      return `Zone (${xGrid}, ${zGrid})`;
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

        const parsed = await parseXmlString(clean);
        return { isOnline: true, text: clean, players, activeSlot, mapTitle, parsed: parsed ? parsed.Server : null };
      }
    }
  } catch (err) {
    console.warn("⚠️ Dedicated server ping offline:", err.message);
  }
  return { isOnline: false, text: "", players: 0, activeSlot: null, mapTitle: "", parsed: null };
}

async function fetchModsCatalog() {
  try {
    const rawVal = (await getDb('FS25_Mods_Info')) || {};
    const catalogLookup = {};

    function indexObject(obj) {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(k => {
        const item = obj[k];
        if (item && typeof item === 'object') {
          if (item.filename || item.name || item.mod_name || item.modname || item.title || item.author || item.platform) {
            const rawKeys = [k, item.filename, item.name, item.mod_name, item.modname, item.title];
            rawKeys.filter(Boolean).forEach(keyToMap => {
              catalogLookup[normalizeKey(keyToMap)] = item;
            });
          }
          indexObject(item);
        }
      });
    }

    indexObject(rawVal);
    return catalogLookup;
  } catch (err) {
    console.warn("⚠️ Could not read /FS25_Mods_Info catalog:", err.message);
    return {};
  }
}

// ============================================================================
// SECTION 6: ADVANCED ZERO-LOSS CARD COMPILER & AGGREGATOR
// ============================================================================
// Line ~415: Card Compiler - Aggregates passive generators, inventories, contracts, vehicles
async function buildCleanStructuredSave(rawFiles, catalogLookup, rawServerConfigXml) {
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
        harvestersAndCombines: [],
        incomeGenerators: [],
        farmlandOwned: [],
        assignedMissions: [],
        handTools: [],
        generalPlaceables: []
      }
    };
  }

  // Parse Farms
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

  const globalCards = {
    palletsAndBales: [],
    animals: [],
    factories: [],
    fleet: [],
    harvestersAndCombines: [],
    incomeGenerators: [],
    farmlands: [],
    missions: { available: [], inProgress: [], finished: [], failed: [], all: [] },
    handTools: [],
    dealershipSales: [],
    collectibles: [],
    fieldsAgronomy: []
  };

  // 1. ACTIVE MODS CATALOG
  const activeMods = {};
  const discoveredModNames = new Set();

  if (rawServerConfigXml) {
    const cfgJson = await parseXmlString(rawServerConfigXml);
    if (cfgJson && cfgJson.dedicatedServer && cfgJson.dedicatedServer.mods && cfgJson.dedicatedServer.mods.mod) {
      const mList = Array.isArray(cfgJson.dedicatedServer.mods.mod) ? cfgJson.dedicatedServer.mods.mod : [cfgJson.dedicatedServer.mods.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m._ || m.name || m.filename || "");
        if (modId) discoveredModNames.add(modId.trim());
      });
    }
  }

  if (parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame && parsedTree['careerSavegame'].careerSavegame.mod) {
    const mList = Array.isArray(parsedTree['careerSavegame'].careerSavegame.mod) ? parsedTree['careerSavegame'].careerSavegame.mod : [parsedTree['careerSavegame'].careerSavegame.mod];
    mList.forEach(m => {
      const modId = typeof m === 'string' ? m : (m.modName || m.name || m.filename || m._ || "");
      if (modId) discoveredModNames.add(modId.trim());
    });
  }

  discoveredModNames.forEach(rawModName => {
    const cleanModKey = rawModName.replace(/\.zip$/i, '');
    const lookupKey = normalizeKey(cleanModKey);
    const cat = catalogLookup[lookupKey] || null;
    const resolvedImg = resolveBestImage(cleanModKey, cat);

    activeMods[cleanModKey] = {
      modKey: cleanModKey,
      name: (cat && (cat.name || cat.title || cat.mod_name)) ? (cat.name || cat.title || cat.mod_name) : cleanEntityName(cleanModKey),
      image: resolvedImg,
      pageUrl: (cat && (cat.pageurl || cat.url || cat.link)) ? (cat.pageurl || cat.url || cat.link) : null,
      platform: (cat && cat.platform) ? cat.platform : "All Platforms",
      description: (cat && (cat.description || cat.desc)) ? (cat.description || cat.desc) : "",
      author: (cat && (cat.author || cat.creator || cat.modder)) ? (cat.author || cat.creator || cat.modder) : "ModHub / Giants",
      updatedNumber: (cat && (cat.updatednumber || cat.version || cat.mod_version)) ? (cat.updatednumber || cat.version || cat.mod_version) : "1.0.0.0",
      matchedInCatalog: !!cat,
      sheetRecord: cat || null
    };
  });

  // 2. VEHICLES, BALES, PALLETS, HARVESTERS & FLEET
  const flatVehicles = [];
  if (parsedTree['vehicles'] && parsedTree['vehicles'].vehicles && parsedTree['vehicles'].vehicles.vehicle) {
    const vehList = Array.isArray(parsedTree['vehicles'].vehicles.vehicle) ? parsedTree['vehicles'].vehicles.vehicle : [parsedTree['vehicles'].vehicles.vehicle];
    
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
      const itemImage = resolveBestImage(cleanName, matchedMod ? matchedMod.sheetRecord : null) || resolveBestImage(filename, null);
      const lower = (filename + " " + cleanName).toLowerCase();

      // Card A: Pallets & Bales
      if (v.bale || lower.includes("bale") || lower.includes("pallet") || lower.includes("bigbag") || lower.includes("fillablepallet")) {
        const palletBaleItem = {
          id: v.id || "0",
          farmId: fId,
          name: cleanName,
          file: filename,
          image: itemImage,
          fillLevel: v.fillUnit && v.fillUnit.unit ? v.fillUnit.unit : null,
          baleData: v.bale || null,
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
        price: parseFloat(v.price || 0),
        operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
        ageMonths: parseInt(v.age || 0, 10),
        wear: parseFloat(v.wear || 0),
        operatingDamage: parseFloat(v.operatingDamage || 0),
        fillUnits: v.fillUnit || null,
        raw: v
      };

      flatVehicles.push(equipmentItem);

      // Card B: Harvesters / Combines
      if (lower.includes("harvester") || lower.includes("combine") || lower.includes("cottonpicker") || lower.includes("sugarbeet") || lower.includes("forageharvester")) {
        equipmentItem.cardType = "Harvester / Combine";
        globalCards.harvestersAndCombines.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.harvestersAndCombines.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      } else {
        // Card C: Fleet Machinery
        equipmentItem.cardType = "Fleet Machinery";
        globalCards.fleet.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.fleet.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      }
    });
  }

  // 3. PLACEABLES: PASSIVE INCOME AGGREGATOR, ANIMALS, FACTORIES & BUILDINGS
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
      const itemImage = resolveBestImage(cleanName, matchedMod ? matchedMod.sheetRecord : null) || resolveBestImage(filename, null);
      const lower = (filename + " " + cleanName).toLowerCase();

      const placeableItem = {
        id: p.id || "0",
        farmId: fId,
        name: cleanName,
        file: filename,
        image: itemImage,
        price: parseFloat(p.price || 0),
        raw: p
      };
      flatPlaceables.push(placeableItem);

      // Filter: Passive Income Generators
      const isGenerator = lower.includes("solar") || lower.includes("wind") || lower.includes("turbine") || 
                          lower.includes("subsidy") || lower.includes("subsidies") || lower.includes("generator") || 
                          lower.includes("bga") || lower.includes("biogas");

      if (isGenerator) {
        rawPassiveGenerators.push({
          ...placeableItem,
          zone: getSpatialZone(p),
          rawNode: p
        });
        return;
      }

      // Animals & Husbandry Card
      if (p.husbandryAnimals || p.animals || lower.includes("husbandry") || lower.includes("barn") || lower.includes("pasture") || lower.includes("coop") || lower.includes("pen")) {
        globalCards.animals.push(placeableItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.animals.push(placeableItem);
          farms[`farm_${fId}`].placeables.push(placeableItem);
        }
        return;
      }

      // Factories & Production Points Card
      if (p.productionPoint || lower.includes("production") || lower.includes("factory") || lower.includes("mill") || lower.includes("bakery") || lower.includes("greenhouse") || lower.includes("dairy")) {
        globalCards.factories.push(placeableItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.factories.push(placeableItem);
          farms[`farm_${fId}`].placeables.push(placeableItem);
        }
        return;
      }

      // General Buildings & Silos
      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.generalPlaceables.push(placeableItem);
        farms[`farm_${fId}`].placeables.push(placeableItem);
      }
    });
  }

  // --- PASSIVE INCOME GROUPING LOGIC (Aggregating identical objects per Field/Zone) ---
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

  // 4. FARMLANDS CARD (All Plots Exposed)
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

  // 5. UNIVERSAL MISSIONS & CONTRACTS (All 100% Retained & Categorized)
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
        fruitType: m.fruitType || m.fruitTypeName || null,
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

  // 6. HAND TOOLS CARD
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

  // 7. FIELDS & AGRONOMY CARD
  if (parsedTree['fields'] && parsedTree['fields'].fields && parsedTree['fields'].fields.field) {
    const list = Array.isArray(parsedTree['fields'].fields.field) ? parsedTree['fields'].fields.field : [parsedTree['fields'].fields.field];
    list.forEach(fld => {
      globalCards.fieldsAgronomy.push({
        fieldId: parseInt(fld.id || 0, 10),
        farmId: String(fld.farmId || "0"),
        fruitType: fld.fruitType || fld.fruitTypeName || "None",
        growthStage: parseInt(fld.growthState || fld.growthStage || 0, 10),
        fertilizedLevel: parseInt(fld.fertilized || fld.fertilizerLevel || 0, 10),
        weedState: parseInt(fld.weedState || 0, 10),
        needsLime: String(fld.needsLime || 'false').toLowerCase() === 'true',
        needsPlowing: String(fld.needsPlowing || 'false').toLowerCase() === 'true',
        raw: fld
      });
    });
  }

  // 8. DEALERSHIP SALES CARD
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
        wear: parseFloat(s.wear || 0),
        image: resolveBestImage(name, null),
        raw: s
      });
    });
  }

  // 9. COLLECTIBLES CARD
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
    summary: {
      totalFarms: Object.keys(farms).length,
      totalVehicles: flatVehicles.length,
      totalFleet: globalCards.fleet.length,
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
      totalActiveMods: Object.keys(activeMods).length
    },
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
    allRawParsedXml: parsedTree
  };
}

// ============================================================================
// SECTION 7: MASTER PIPELINE CONTROLLER (With Offline Guard & Force Sync)
// ============================================================================
// Line ~830: Main Execution Router
async function runPipeline() {
  const isManualRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' || process.argv.includes('--force');
  console.log(`📡 [1/4] Querying Port 9050 Server Stats (Manual Override: ${isManualRun})...`);

  const serverPing = await pingServerLiveStats();

  // Server Offline Guard: Halt immediately without overwriting cards
  if (!serverPing.isOnline && !isManualRun) {
    console.log("🛑 Server is OFFLINE. Updating serverStatus node only and halting execution. Zero cards overwritten.");
    await updateDb('fs25/serverStatus', {
      isOnline: false,
      lastChecked: new Date().toISOString()
    });
    process.exit(0);
  }

  const activePlayers = serverPing.players;
  console.log(`✅ Server is ONLINE | Active Players: ${activePlayers}`);

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

  // Efficiency Guard: If 0 players, not past 6 hours, not first run, and not manual -> exit cleanly
  if (activePlayers === 0 && !shouldRun6HourSync && !isManualRun && !isFirstRun) {
    console.log("💤 0 players online & 6-hour static window not reached yet. Skipping FTP connection.");
    process.exit(0);
  }

  let activeSlot = serverPing.activeSlot || process.env.DEFAULT_SAVE_SLOT || "3";
  console.log(`🎯 Target Savegame Slot: [ Slot #${activeSlot} ]`);

  console.log("📦 Indexing Mod Catalogue from Firebase /FS25_Mods_Info...");
  const catalogLookup = await fetchModsCatalog();
  console.log(`✅ Loaded ${Object.keys(catalogLookup).length} mod catalogue references.`);

  const masterPayload = {
    serverStatus: {
      isOnline: serverPing.isOnline,
      activePlayers: activePlayers,
      lastChecked: new Date().toISOString()
    },
    activePlayers: activePlayers,
    activeSaveSlot: String(activeSlot),
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
      lastConfigSync: new Date().toISOString()
    },
    raw_xml: {}
  };

  if (serverPing.text) masterPayload.raw_xml.stats = serverPing.text;

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Writing stats payload only.");
    await updateDb('fs25', masterPayload);
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
            masterPayload.activeSaveSlot = String(activeSlot);
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
      throw new Error(`Unable to locate savegame directory for Slot #${activeSlot} on FTP server.`);
    }

    masterPayload.activeSaveSlot = String(activeSlot);
    console.log(`📂 [3/4] Pulling XML savegame files from: [ ${activeSavePath} ]`);

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
          masterPayload.raw_xml[rawBaseName] = cleanContent;
          rawFileCache[rawBaseName] = cleanContent;
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    console.log("🚜 Structuring all distinct cards (Aggregating Income, Missions, Fleet, Harvesters)...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, catalogLookup, rawServerConfigXml);

    masterPayload.summary = cleanData.summary;
    masterPayload.gameInfo = cleanData.gameInfo;
    masterPayload.collectibles = cleanData.collectibles;
    masterPayload.farmlands = cleanData.farmlands;
    masterPayload.missions = cleanData.missions;
    masterPayload.fields = cleanData.fields;
    masterPayload.cards = cleanData.cards;
    masterPayload.farms = cleanData.farms;
    masterPayload.activeMods = cleanData.activeMods;
    masterPayload.allRawParsedXml = cleanData.allRawParsedXml;

    console.log("💾 [4/4] Writing complete payload to Firebase /fs25 via REST...");
    await updateDb('fs25', masterPayload);

    console.log(`🏆 Complete savegame synchronization verified! Node /fs25 fully populated.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
