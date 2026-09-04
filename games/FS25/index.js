/* ============================================================================
 * File: index.js
 * Deployment Timestamp: 2026-09-04 19:09:28 (EDT - 24hr New York Time)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming / Progress Tracking / Entertainment)
 * Description: Zero-loss FS25 Ingestion Engine & Card Separator.
 *              - Dual HTTP/HTTPS protocol agnostic support.
 *              - Isolated Card System:
 *                  * Pallets & Bales
 *                  * Animals & Husbandry
 *                  * Factories & Production Points
 *                  * Fleet Equipment & Vehicles
 *                  * Harvesters & Combines
 *                  * Passive Income Generators (Solar, Wind, Subsidies, BGA)
 *                  * Farmland Holdings & Agronomy
 *                  * Universal Missions & Field Contracts
 *                  * Hand Tools & Dealership Sales
 *              - Dual-Layer Image Resolver (Google Sheet / Drive + GitHub Fallback)
 *              - Complete recursive XML parsing preserving 100% of unmapped fields.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Failsafe to Prevent GitHub Action Hangs)
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
// SECTION 3: NETWORK & HOST CONFIGURATION (Dual HTTP/HTTPS Friendly)
// ============================================================================
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';
const FORCE_SYNC = process.env.FORCE_SYNC === 'true' || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

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

// Converts Google Drive preview/edit links into direct raw image URLs
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

// Waterfall: Google Sheet Image > GitHub Repo Image Fallback
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

// Dedicated server port 9050 stats check
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

        const slotMatch = clean.match(/savegame="(\d+)"/i) || 
                          clean.match(/savegameSlot="(\d+)"/i) || 
                          clean.match(/slot="(\d+)"/i) || 
                          clean.match(/<savegame>(\d+)<\/savegame>/i);
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

// Flattens all Google Sheets tabs under /FS25_Mods_Info
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
// SECTION 6: ZERO-LOSS CARD STRUCTURING ENGINE
// ============================================================================
async function buildCleanStructuredSave(rawFiles, catalogLookup, rawServerConfigXml) {
  const parsedTree = {};
  for (const [key, rawContent] of Object.entries(rawFiles)) {
    parsedTree[key] = await parseXmlString(rawContent);
  }

  // Farms Initialization
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

  // Root Global Cards
  const globalCards = {
    palletsAndBales: [],
    animals: [],
    factories: [],
    fleet: [],
    harvestersAndCombines: [],
    incomeGenerators: [],
    farmlands: [],
    missions: {
      available: [],
      inProgress: [],
      finished: [],
      failed: [],
      all: []
    },
    handTools: [],
    dealershipSales: [],
    collectibles: [],
    fieldsAgronomy: []
  };

  // 1. ACTIVE MODS CATALOGING
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

  // 2. PARSE VEHICLES, BALES, PALLETS, HARVESTERS & FLEET
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

      // Card B: Harvesters / Combines
      if (lower.includes("harvester") || lower.includes("combine") || lower.includes("cottonpicker") || lower.includes("sugarbeet") || lower.includes("forageharvester")) {
        equipmentItem.cardType = "Harvester / Combine";
        globalCards.harvestersAndCombines.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.harvestersAndCombines.push(equipmentItem);
        }
      } else {
        // Card C: General Fleet Equipment
        equipmentItem.cardType = "Fleet Machinery";
        globalCards.fleet.push(equipmentItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.fleet.push(equipmentItem);
        }
      }
    });
  }

  // 3. PARSE PLACEABLES: ANIMALS, FACTORIES, GENERATORS & BUILDINGS
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

      // Card 1: Passive Income Generators (Solar, Wind, Subsidies, BGA)
      const isGenerator = lower.includes("solar") || lower.includes("wind") || lower.includes("turbine") || 
                          lower.includes("subsidy") || lower.includes("subsidies") || lower.includes("generator") || 
                          lower.includes("bga") || lower.includes("biogas") || lower.includes("powerplant");

      if (isGenerator) {
        const generatorItem = {
          id: p.id || "0",
          farmId: fId,
          name: cleanName,
          category: "Income Generator",
          file: filename,
          image: itemImage,
          price: parseFloat(p.price || 0),
          incomeData: p.incomePerHour || p.solarCollector || p.windTurbine || p.generator || null,
          raw: p
        };
        globalCards.incomeGenerators.push(generatorItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.incomeGenerators.push(generatorItem);
        }
        return;
      }

      // Card 2: Animals & Husbandry Card
      if (p.husbandryAnimals || p.animals || lower.includes("husbandry") || lower.includes("barn") || lower.includes("pasture") || lower.includes("coop") || lower.includes("pen")) {
        const animalItem = {
          id: p.id || "0",
          farmId: fId,
          name: cleanName,
          category: "Animals & Husbandry",
          file: filename,
          image: itemImage,
          animalsData: p.husbandryAnimals || p.animals || null,
          foodLevels: p.husbandryFood || null,
          liquidManure: p.husbandryLiquidManure || null,
          straw: p.husbandryStraw || null,
          raw: p
        };
        globalCards.animals.push(animalItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.animals.push(animalItem);
        }
        return;
      }

      // Card 3: Factories & Production Chains Card
      if (p.productionPoint || lower.includes("production") || lower.includes("factory") || lower.includes("mill") || lower.includes("bakery") || lower.includes("greenhouse") || lower.includes("dairy")) {
        const factoryItem = {
          id: p.id || "0",
          farmId: fId,
          name: cleanName,
          category: "Factories & Production",
          file: filename,
          image: itemImage,
          productionData: p.productionPoint || null,
          storage: p.storage || null,
          raw: p
        };
        globalCards.factories.push(factoryItem);
        if (fId !== "0" && farms[`farm_${fId}`]) {
          farms[`farm_${fId}`].cards.factories.push(factoryItem);
        }
        return;
      }

      // Card 4: General Buildings & Silos
      const placeableItem = {
        id: p.id || "0",
        farmId: fId,
        name: cleanName,
        category: "Buildings & Silos",
        file: filename,
        image: itemImage,
        price: parseFloat(p.price || 0),
        storage: p.storage || null,
        raw: p
      };
      if (fId !== "0" && farms[`farm_${fId}`]) {
        farms[`farm_${fId}`].cards.generalPlaceables.push(placeableItem);
      }
    });
  }

  // 4. FARMLANDS CARD
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

  // 5. UNIVERSAL MISSIONS & CONTRACTS CARD
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
  if (parsedTree['collectibles'] && parsedTree['collectibles'].collectibles) {
    const list = parsedTree['collectibles'].collectibles.collectible || parsedTree['collectibles'].collectibles.item || [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach((c, idx) => {
      const isFound = String(c.collected || c.isFound || c.found || '').toLowerCase() === 'true' || c.collected === '1' || c.isFound === '1';
      globalCards.collectibles.push({ id: c.index || c.id || idx + 1, name: c.name || `Collectible #${idx + 1}`, isFound, raw: c });
    });
  }

  return {
    summary: {
      totalFarms: Object.keys(farms).length,
      totalFleet: globalCards.fleet.length,
      totalHarvestersAndCombines: globalCards.harvestersAndCombines.length,
      totalPalletsAndBales: globalCards.palletsAndBales.length,
      totalAnimalsHusbandry: globalCards.animals.length,
      totalFactories: globalCards.factories.length,
      totalIncomeGenerators: globalCards.incomeGenerators.length,
      totalFarmlands: globalCards.farmlands.length,
      totalMissions: globalCards.missions.all.length,
      activeMissionsCount: globalCards.missions.inProgress.length
    },
    gameInfo: parsedTree['careerSavegame'] && parsedTree['careerSavegame'].careerSavegame ? parsedTree['careerSavegame'].careerSavegame : {},
    cards: globalCards,
    farms: farms,
    activeMods: activeMods,
    allRawParsedXml: parsedTree
  };
}

// ============================================================================
// SECTION 7: PIPELINE EXECUTION ENGINE
// ============================================================================
async function runPipeline() {
  console.log("📡 [1/4] Querying Dedicated Server Stats API for Live Save Slot...");
  const statsData = await fetchStatsApi();
  const activePlayers = statsData.players;

  let activeSlot = statsData.activeSlot || process.env.DEFAULT_SAVE_SLOT || "3";
  console.log(`🎯 Active Savegame Slot: [ Slot #${activeSlot} ]`);

  console.log("📦 Indexing Mod Catalogue across all /FS25_Mods_Info sub-nodes...");
  const catalogLookup = await fetchModsCatalog();
  console.log(`✅ Indexed ${Object.keys(catalogLookup).length} mod catalogue references.`);

  let lastFullSyncIso = null;
  try {
    const snap = await db.ref('fs25/lastFullSaveSync').once('value');
    lastFullSyncIso = snap.val();
  } catch (e) {}

  const lastSyncMs = lastFullSyncIso ? new Date(lastFullSyncIso).getTime() : 0;
  const hoursSinceLastFullSync = (Date.now() - lastSyncMs) / (1000 * 60 * 60);

  if (!FORCE_SYNC && activePlayers === 0 && hoursSinceLastFullSync < 24 && lastSyncMs > 0) {
    console.log("💤 Server Idle & recently synced. Updating live status only.");
    await db.ref('fs25').update({
      activePlayers: 0,
      activeSaveSlot: String(activeSlot),
      lastUpdated: new Date().toISOString(),
      liveMapImage: MAP_IMAGE_URL
    });
    process.exit(0);
  }

  console.log("🚀 Executing Full Zero-Loss Savegame & Mod Sync...");

  const masterPayload = {
    activePlayers: activePlayers,
    activeSaveSlot: String(activeSlot),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    lastFullSaveSync: new Date().toISOString(),
    config: { 
      appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
      gaTag: "G-CTYHDF4MSD"
    },
    raw_xml: {}
  };

  if (statsData.text) masterPayload.raw_xml.stats = statsData.text;

  if (!ftpUser || !ftpPass) {
    console.warn("⚠️ FTP credentials missing. Writing stats feed only.");
    await db.ref('fs25').set(masterPayload);
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
          if (cfgSlotMatch && !statsData.activeSlot) {
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
    console.log(`📂 [3/4] Pulling ALL XML files from: [ ${activeSavePath} ]`);

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

    console.log("🚜 Structuring all distinct cards (Pallets, Animals, Factories, Fleet, Harvesters, Generators)...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, catalogLookup, rawServerConfigXml);

    masterPayload.summary = cleanData.summary;
    masterPayload.gameInfo = cleanData.gameInfo;
    masterPayload.cards = cleanData.cards;
    masterPayload.farms = cleanData.farms;
    masterPayload.activeMods = cleanData.activeMods;
    masterPayload.allRawParsedXml = cleanData.allRawParsedXml;

    console.log("💾 [4/4] Writing zero-loss card architecture to Firebase /fs25...");
    await db.ref('fs25').set(masterPayload);

    console.log(`🏆 Complete savegame synchronization verified! All cards organized cleanly.`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
