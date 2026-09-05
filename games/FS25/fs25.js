/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-05 06:37:00 (EDT - 24hr New York Time)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Description: Master FS25 Ingestion & Cross-Referencing Engine.
 *              - Dual HTTP & HTTPS protocol-agnostic networking.
 *              - Reads dedicatedServerConfig.xml (<gameserver><settings><savegame_index>).
 *              - Reads live port 9050 gameStats.xml feed.
 *              - Zero-loss parsing across savegame XML files:
 *                  * farmland.xml, farms.xml, fields.xml, vehicles.xml
 *                  * placeables.xml, sales.xml, precisionFarming.xml
 *                  * environment.xml, economy.xml, collectibles.xml, players.xml
 *              - Populates dedicated isolated cards:
 *                  * Pallets & Bales
 *                  * Animals & Husbandry
 *                  * Factories & Production Chains
 *                  * Fleet Machinery & Vehicles
 *                  * Harvesters & Combines
 *                  * Passive Income Generators (Windmills, Solar, Government Subsidies)
 *                  * Farmland Holdings & Plots
 *                  * Universal Missions & Contracts
 *                  * Hand Tools & Field Agronomy
 *                  * Dealership Sales & Precision Farming Stats
 *              - Dual-Layer Image Resolver (Google Sheet/Drive with GitHub fallback).
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
  console.log("🚨 Safety Failsafe: Process terminating cleanly after 4 minutes.");
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
    console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT:", e.message);
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
// SECTION 3: NETWORK & HOST CONFIGURATION (Dual HTTP/HTTPS Compatibility)
// ============================================================================
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
  "woodchips": "Wood_Chips.JPG",
  "woodchipsroundbale": "Wood_Chips_Round Bale.JPG"
};

// ============================================================================
// SECTION 5: UTILITY HELPERS, XML SANITIZER & DUAL IMAGE RESOLVER
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
  if (!filepath) return "Equipment";
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
      if (clean.includes('<Server')) {
        const parsed = await parseXmlString(clean);
        return { text: clean, parsed: parsed ? parsed.Server : null };
      }
    }
  } catch (err) {
    console.warn("Stats API Notice:", err.message);
  }
  return { text: "", parsed: null };
}

async function fetchModsCatalog() {
  try {
    const snap = await db.ref('FS25_Mods_Info').once('value');
    const rawVal = snap.val() || {};
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
// SECTION 6: ZERO-LOSS CARD STRUCTURING ENGINE (All Cards Separated)
// ============================================================================
async function buildCleanStructuredSave(rawFiles, liveStatsData, catalogLookup, rawServerConfigXml) {
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
        history: raw.statistics || raw.history || {},
        ledgerDays: raw.finances ? raw.finances.stats : []
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

  // 1. FARMS.XML PARSING
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

  // 2. ACTIVE MODS CATALOGING (Cross-reference dedicatedServerConfig.xml, gameStats, careerSavegame)
  const activeMods = {};
  const discoveredMods = new Map();

  // dedicatedServerConfig.xml (<gameserver><mods><mod filename="..." isDlc="...">)
  if (rawServerConfigXml) {
    const cfgJson = await parseXmlString(rawServerConfigXml);
    if (cfgJson && cfgJson.gameserver && cfgJson.gameserver.mods && cfgJson.gameserver.mods.mod) {
      const mList = Array.isArray(cfgJson.gameserver.mods.mod) ? cfgJson.gameserver.mods.mod : [cfgJson.gameserver.mods.mod];
      mList.forEach(m => {
        const modId = m.filename || m.name || m._ || "";
        if (modId) discoveredMods.set(modId.trim(), { filename: modId.trim(), isDlc: m.isDlc === 'true' });
      });
    }
  }

  // live gameStats.xml (<Server><Mods><Mod name="..." author="..." version="...">Title</Mod>)
  if (liveStatsData && liveStatsData.Mods && liveStatsData.Mods.Mod) {
    const liveModList = Array.isArray(liveStatsData.Mods.Mod) ? liveStatsData.Mods.Mod : [liveStatsData.Mods.Mod];
    liveModList.forEach(m => {
      const modId = m.name || m.filename || "";
      if (modId) {
        const existing = discoveredMods.get(modId.trim()) || {};
        discoveredMods.set(modId.trim(), {
          ...existing,
          name: modId.trim(),
          title: typeof m._ === 'string' ? m._ : (m.title || modId.trim()),
          author: m.author || "ModHub / Giants",
          version: m.version || "1.0.0.0",
          hash: m.hash || null
        });
      }
    });
  }

  // careerSavegame.xml (<careerSavegame><mod modName="..." title="..." version="...">)
  if (parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame && parsedTree['careerSavegame'].careerSavegame.mod) {
    const mList = Array.isArray(parsedTree['careerSavegame'].careerSavegame.mod) ? parsedTree['careerSavegame'].careerSavegame.mod : [parsedTree['careerSavegame'].careerSavegame.mod];
    mList.forEach(m => {
      const modId = m.modName || m.name || m.filename || "";
      if (modId) {
        const existing = discoveredMods.get(modId.trim()) || {};
        discoveredMods.set(modId.trim(), {
          ...existing,
          name: modId.trim(),
          title: m.title || existing.title || modId.trim(),
          author: existing.author || "ModHub / Giants",
          version: m.version || existing.version || "1.0.0.0",
          hash: m.fileHash || existing.hash || null
        });
      }
    });
  }

  discoveredMods.forEach((meta, rawModName) => {
    const cleanModKey = rawModName.replace(/\.zip$/i, '');
    const lookupKey = normalizeKey(cleanModKey);
    const cat = catalogLookup[lookupKey] || null;
    const resolvedImg = resolveBestImage(cleanModKey, cat);

    activeMods[cleanModKey] = {
      modKey: cleanModKey,
      name: (cat && (cat.name || cat.title || cat.mod_name)) ? (cat.name || cat.title || cat.mod_name) : (meta.title || cleanEntityName(cleanModKey)),
      image: resolvedImg,
      pageUrl: (cat && (cat.pageurl || cat.url || cat.link)) ? (cat.pageurl || cat.url || cat.link) : null,
      platform: (cat && cat.platform) ? cat.platform : "All Platforms",
      description: (cat && (cat.description || cat.desc)) ? (cat.description || cat.desc) : "",
      author: (cat && (cat.author || cat.creator || cat.modder)) ? (cat.author || cat.creator || cat.modder) : (meta.author || "ModHub / Giants"),
      updatedNumber: (cat && (cat.updatednumber || cat.version || cat.mod_version)) ? (cat.updatednumber || cat.version || cat.mod_version) : (meta.version || "1.0.0.0"),
      matchedInCatalog: !!cat,
      hash: meta.hash || null,
      sheetRecord: cat || null
    };
  });

  // 3. VEHICLES.XML PARSING (Cross-referencing live categories from gameStats)
  const liveVehicleCategoryMap = {};
  if (liveStatsData && liveStatsData.Vehicles && liveStatsData.Vehicles.Vehicle) {
    const liveVehs = Array.isArray(liveStatsData.Vehicles.Vehicle) ? liveStatsData.Vehicles.Vehicle : [liveStatsData.Vehicles.Vehicle];
    liveVehs.forEach(lv => {
      if (lv.name) liveVehicleCategoryMap[normalizeKey(lv.name)] = lv.category;
    });
  }

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
      const liveCat = liveVehicleCategoryMap[normalizeKey(cleanName)] || "";

      // Pallets & Bales
      if (v.pallet || liveCat === "PALLETS" || v.bale || lower.includes("bale") || lower.includes("pallet") || lower.includes("bigbag")) {
        const palletBaleItem = {
          id: v.uniqueId || v.id || "0",
          farmId: fId,
          name: cleanName,
          file: filename,
          image: itemImage,
          fillLevel: v.fillUnit && v.fillUnit.unit ? v.fillUnit.unit : null,
          baleData: v.bale || v.baler || null,
          palletData: v.pallet || null,
          raw: v
        };
        globalCards.palletsAndBales.push(palletBaleItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.palletsAndBales.push(palletBaleItem);
        }
        return;
      }

      const equipmentItem = {
        id: v.uniqueId || v.id || "0",
        farmId: fId,
        name: cleanName,
        file: filename,
        image: itemImage,
        price: parseFloat(v.price || 0),
        operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
        ageMonths: parseInt(v.age || 0, 10),
        wear: parseFloat(v.wearable && v.wearable.damage ? v.wearable.damage : 0),
        fillUnits: v.fillUnit || null,
        raw: v
      };

      flatVehicles.push(equipmentItem);

      // Harvesters & Combines
      if (liveCat === "HARVESTERS" || liveCat === "BEETHARVESTERS" || v.combine || lower.includes("harvester") || lower.includes("combine")) {
        equipmentItem.cardType = "Harvester / Combine";
        globalCards.harvestersAndCombines.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.harvestersAndCombines.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      } else {
        equipmentItem.cardType = liveCat || "Fleet Machinery";
        globalCards.fleet.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.fleet.push(equipmentItem);
          farms[`farm_${fId}`].vehicles.push(equipmentItem);
        }
      }
    });
  }

  // 4. PLACEABLES.XML PARSING
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
        id: p.uniqueId || p.id || "0",
        farmId: fId,
        name: cleanName,
        file: filename,
        image: itemImage,
        price: parseFloat(p.price || 0),
        raw: p
      };
      flatPlaceables.push(placeableItem);

      // Card A: Income Generators (Subsidies, Windmills, Solar)
      const isGenerator = p.solarPanels || p.windTurbine || lower.includes("subsidy") || lower.includes("solar") || lower.includes("wind") || lower.includes("generator");
      if (isGenerator) {
        placeableItem.category = "Income Generator";
        placeableItem.details = p.windTurbine || p.solarPanels || p.incomePerHour || null;
        globalCards.incomeGenerators.push(placeableItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.incomeGenerators.push(placeableItem);
          farms[`farm_${fId}`].placeables.push(placeableItem);
        }
        return;
      }

      // Card B: Animals & Husbandry
      if (p.husbandry || p.husbandryFence || p.husbandryMeadow || lower.includes("cowbarn") || lower.includes("pasture") || lower.includes("barn")) {
        placeableItem.category = "Animals & Husbandry";
        placeableItem.meadow = p.husbandryMeadow ? p.husbandryMeadow.fillType : null;
        globalCards.animals.push(placeableItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.animals.push(placeableItem);
          farms[`farm_${fId}`].placeables.push(placeableItem);
        }
        return;
      }

      // Card C: Factories & Production
      if (p.productionPoint || lower.includes("production") || lower.includes("mill") || lower.includes("bakery") || lower.includes("spinner") || lower.includes("tailor") || lower.includes("dairy")) {
        placeableItem.category = "Factories & Production";
        placeableItem.storage = p.productionPoint ? p.productionPoint.storage : null;
        globalCards.factories.push(placeableItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.factories.push(placeableItem);
          farms[`farm_${fId}`].placeables.push(placeableItem);
        }
        return;
      }

      // Card D: General Placeables & Silos
      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.generalPlaceables.push(placeableItem);
        farms[`farm_${fId}`].placeables.push(placeableItem);
      }
    });
  }

  // 5. FARMLAND.XML & GAMESTATS.XML INTEGRATION (Resolves Land Holdings & Prices)
  const farmlandAreaMap = {};
  const farmlandPriceMap = {};
  if (liveStatsData && liveStatsData.Farmlands && liveStatsData.Farmlands.Farmland) {
    const livePlots = Array.isArray(liveStatsData.Farmlands.Farmland) ? liveStatsData.Farmlands.Farmland : [liveStatsData.Farmlands.Farmland];
    livePlots.forEach(lp => {
      farmlandAreaMap[String(lp.id)] = parseFloat(lp.area || 0);
      farmlandPriceMap[String(lp.id)] = parseFloat(lp.price || 0);
    });
  }

  if (parsedTree['farmland'] && parsedTree['farmland'].farmlands && parsedTree['farmland'].farmlands.farmland) {
    const list = Array.isArray(parsedTree['farmland'].farmlands.farmland) ? parsedTree['farmland'].farmlands.farmland : [parsedTree['farmland'].farmlands.farmland];
    list.forEach(f => {
      const farmId = String(f.farmId || "0");
      const fId = String(f.id);
      const isOwned = farmId !== "0";
      const item = {
        id: parseInt(f.id, 10),
        farmId: farmId,
        ownerName: isOwned ? (farmNameMap[farmId] || `Farm ${farmId}`) : "Available For Purchase",
        isOwned: isOwned,
        areaHa: farmlandAreaMap[fId] || 0,
        price: farmlandPriceMap[fId] || 0,
        raw: f
      };
      globalCards.farmlands.push(item);
      if (isOwned && farms[`farm_${farmId}`]) {
        farms[`farm_${farmId}`].cards.farmlandOwned.push(item);
      }
    });
  }

  // 6. FIELDS.XML PARSING
  if (parsedTree['fields'] && parsedTree['fields'].fields && parsedTree['fields'].fields.field) {
    const list = Array.isArray(parsedTree['fields'].fields.field) ? parsedTree['fields'].fields.field : [parsedTree['fields'].fields.field];
    list.forEach(fld => {
      globalCards.fieldsAgronomy.push({
        fieldId: parseInt(fld.id || 0, 10),
        fruitType: fld.fruitType || "UNKNOWN",
        plannedFruit: fld.plannedFruit || "NONE",
        growthStage: parseInt(fld.growthState || 0, 10),
        groundType: fld.groundType || "UNKNOWN",
        sprayLevel: parseInt(fld.sprayLevel || 0, 10),
        limeLevel: parseInt(fld.limeLevel || 0, 10),
        needsLime: parseInt(fld.limeLevel || 0, 10) === 0,
        weedState: parseInt(fld.weedState || 0, 10),
        plowLevel: parseInt(fld.plowLevel || 0, 10),
        raw: fld
      });
    });
  }

  // 7. PRECISION FARMING INTEGRATION
  let precisionFarmingData = null;
  if (parsedTree['precisionFarming'] && parsedTree['precisionFarming'].precisionFarming) {
    precisionFarmingData = parsedTree['precisionFarming'].precisionFarming;
  }

  // 8. SALES.XML PARSING
  if (parsedTree['sales'] && parsedTree['sales'].sales && parsedTree['sales'].sales.item) {
    const sList = Array.isArray(parsedTree['sales'].sales.item) ? parsedTree['sales'].sales.item : [parsedTree['sales'].sales.item];
    sList.forEach(s => {
      const name = cleanEntityName(s.xmlFilename || "Discount Equipment");
      globalCards.dealershipSales.push({
        name: name,
        price: parseFloat(s.price || 0),
        timeLeft: parseInt(s.timeLeft || 0, 10),
        damage: parseFloat(s.damage || 0),
        wear: parseFloat(s.wear || 0),
        operatingHours: parseFloat(((parseFloat(s.operatingTime || 0)) / 3600).toFixed(1)),
        image: resolveBestImage(name, null),
        raw: s
      });
    });
  }

  // 9. COLLECTIBLES.XML PARSING
  let collectiblesFound = 0;
  if (parsedTree['collectibles'] && parsedTree['collectibles'].collectibles) {
    const list = parsedTree['collectibles'].collectibles.collectible || [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach(c => {
      const isFound = String(c.collected || '').toLowerCase() === 'true';
      if (isFound) collectiblesFound++;
      globalCards.collectibles.push({ index: parseInt(c.index, 10), collected: isFound });
    });
  }

  // 10. PLAYERS.XML PARSING (Hand Tool Assignment)
  if (parsedTree['players'] && parsedTree['players'].players && parsedTree['players'].players.player) {
    const pList = Array.isArray(parsedTree['players'].players.player) ? parsedTree['players'].players.player : [parsedTree['players'].players.player];
    pList.forEach(pl => {
      if (pl.handTools && pl.handTools.handTool) {
        const htList = Array.isArray(pl.handTools.handTool) ? pl.handTools.handTool : [pl.handTools.handTool];
        htList.forEach(ht => {
          globalCards.handTools.push({
            uniqueId: ht.uniqueId,
            playerUniqueId: pl.uniqueUserId,
            timeLastConnected: pl.timeLastConnected
          });
        });
      }
    });
  }

  // Master Payload
  return {
    summary: {
      totalFarms: Object.keys(farms).length,
      totalVehicles: flatVehicles.length,
      totalFleet: globalCards.fleet.length,
      totalHarvestersAndCombines: globalCards.harvestersAndCombines.length,
      totalPalletsAndBales: globalCards.palletsAndBales.length,
      totalPlaceables: flatPlaceables.length,
      totalAnimalsHusbandry: globalCards.animals.length,
      totalFactories: globalCards.factories.length,
      totalIncomeGenerators: globalCards.incomeGenerators.length,
      totalFarmlandsOwned: globalCards.farmlands.filter(f => f.isOwned).length,
      totalMapFarmlands: globalCards.farmlands.length,
      dealershipDiscountsCount: globalCards.dealershipSales.length,
      collectiblesFoundCount: collectiblesFound,
      totalActiveMods: Object.keys(activeMods).length
    },
    gameInfo: {
      serverName: liveStatsData && liveStatsData.name ? liveStatsData.name : "OneLIVIDMAN and werewolf 618",
      mapTitle: liveStatsData && liveStatsData.mapName ? liveStatsData.mapName : "The Rural Farmlands Of Ohio",
      playTimeMinutes: parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame ? parseFloat(parsedTree['careerSavegame'].careerSavegame.statistics.playTime || 0) : 0,
      totalServerMoney: parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame ? parseFloat(parsedTree['careerSavegame'].careerSavegame.statistics.money || 0) : 0
    },
    environment: parsedTree['environment'] ? parsedTree['environment'].environment : {},
    economy: parsedTree['economy'] ? parsedTree['economy'].economy : {},
    precisionFarming: precisionFarmingData,
    collectibles: {
      found: collectiblesFound,
      total: globalCards.collectibles.length || 50,
      formatted: `${collectiblesFound}/${globalCards.collectibles.length || 50}`,
      items: globalCards.collectibles
    },
    farmlands: {
      totalMapFarmlands: globalCards.farmlands.length,
      ownedFarmlands: globalCards.farmlands.filter(f => f.isOwned).length,
      list: globalCards.farmlands
    },
    fields: globalCards.fieldsAgronomy,
    cards: globalCards,
    farms: farms,
    activeMods: activeMods,
    allRawParsedXml: parsedTree
  };
}

// ============================================================================
// SECTION 7: PIPELINE EXECUTION ENGINE (Unconditional Sync)
// ============================================================================
async function runPipeline() {
  console.log("📡 [1/4] Querying Dedicated Server Stats API for Live Map Feed...");
  const statsData = await fetchStatsApi();
  const liveStats = statsData.parsed;

  console.log("📦 Indexing Mod Catalogue from Firebase /FS25_Mods_Info...");
  const catalogLookup = await fetchModsCatalog();
  console.log(`✅ Loaded ${Object.keys(catalogLookup).length} mod catalogue references.`);

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

    // 1. Read dedicatedServerConfig.xml to lock active slot index
    let rawServerConfigXml = "";
    let activeSlot = "3"; // Fallback to verified save slot

    const configCandidates = [
      'dedicated_server/dedicatedServerConfig.xml',
      'dedicatedServerConfig.xml',
      'profile/dedicated_server/dedicatedServerConfig.xml',
      'profile/dedicatedServerConfig.xml'
    ];

    for (const cfgPath of configCandidates) {
      try {
        const content = await downloadFtpFileToString(client, cfgPath);
        if (content) {
          rawServerConfigXml = sanitizeXml(content);
          const parsedCfg = await parseXmlString(rawServerConfigXml);
          if (parsedCfg && parsedCfg.gameserver && parsedCfg.gameserver.settings && parsedCfg.gameserver.settings.savegame_index) {
            activeSlot = String(parsedCfg.gameserver.settings.savegame_index).trim();
            console.log(`🎯 dedicatedServerConfig.xml locked active save slot: Slot #${activeSlot}`);
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Lock directory path
    const savePathCandidates = [
      `savegame${activeSlot}`,
      `profile/savegame${activeSlot}`,
      `savegame_${activeSlot}`,
      `profile/savegame_${activeSlot}`
    ];

    let activeSavePath = null;
    let fileList = [];

    for (const targetPath of savePathCandidates) {
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
      throw new Error(`Unable to locate directory for Slot #${activeSlot} on FTP server.`);
    }

    console.log(`📂 [3/4] Pulling savegame XML files from: [ ${activeSavePath} ]`);

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

    console.log("🚜 Structuring all distinct cards (Pallets, Animals, Factories, Fleet, Harvesters, Income Generators)...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, liveStats, catalogLookup, rawServerConfigXml);

    const masterPayload = {
      activePlayers: liveStats && liveStats.Slots ? parseInt(liveStats.Slots.numUsed || 0, 10) : 0,
      activeSaveSlot: String(activeSlot),
      liveMapImage: MAP_IMAGE_URL,
      lastUpdated: new Date().toISOString(),
      lastFullSaveSync: new Date().toISOString(),
      config: { 
        appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
        gaTag: "G-CTYHDF4MSD"
      },
      summary: cleanData.summary,
      gameInfo: cleanData.gameInfo,
      collectibles: cleanData.collectibles,
      farmlands: cleanData.farmlands,
      fields: cleanData.fields,
      environment: cleanData.environment,
      economy: cleanData.economy,
      precisionFarming: cleanData.precisionFarming,
      cards: cleanData.cards,
      farms: cleanData.farms,
      activeMods: cleanData.activeMods,
      allRawParsedXml: cleanData.allRawParsedXml,
      raw_xml: rawFileCache
    };

    if (statsData.text) masterPayload.raw_xml.stats = statsData.text;

    console.log("💾 [4/4] Writing complete card-separated payload to Firebase /fs25...");
    await db.ref('fs25').set(masterPayload);

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
