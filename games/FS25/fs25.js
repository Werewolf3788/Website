/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-01 08:44:00 (EDT - 24hr New York Time)
 * Project: entertainment-71888 (/fs25 RTDB Node)
 * Description: Smart FS25 Dynamic Savegame Ingestion Engine.
 *              - Prioritizes Live Web Feed active savegame slot detection.
 *              - Dual HTTP/HTTPS support.
 *              - Structures items by Farm ID.
 *              - Integrates GitHub images and /FS25_Mods_Info catalog.
 * Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// SECTION 1: SAFETY TIMEOUT (4 Minutes Failsafe)
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Exiting cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// SECTION 2: FIREBASE ADMIN INITIALIZATION
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

// SECTION 3: NETWORK & HOST CONFIGURATION
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';
const FORCE_SYNC = process.env.FORCE_SYNC === 'true' || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

const STATS_URL = `http://${ftpHost}:9050/feed/dedicated-server-stats.xml?code=${apiCode}`;
const MAP_IMAGE_URL = `https://wsrv.nl/?url=${ftpHost}:9050/feed/dedicated-server-stats-map.jpg?code=${apiCode}&quality=75&size=1024`;
const GITHUB_IMG_BASE = `https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/`;

// SECTION 4: GITHUB IMAGE LOOKUP DICTIONARY
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

// SECTION 5: PARSER & HELPERS
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
  if (!filepath) return "Unknown Item";
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

function resolveGitHubImage(query) {
  if (!query) return null;
  const key = normalizeKey(query);
  if (REPO_IMAGES[key]) {
    return `${GITHUB_IMG_BASE}${encodeURIComponent(REPO_IMAGES[key])}`;
  }
  for (const [dictKey, file] of Object.entries(REPO_IMAGES)) {
    if (key.includes(dictKey) || dictKey.includes(key)) {
      return `${GITHUB_IMG_BASE}${encodeURIComponent(file)}`;
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

// Live stats API check (Reads the real active slot from port 9050 feed)
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

        // Live active savegame slot attribute matching
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

async function fetchModsCatalog() {
  try {
    const snap = await db.ref('FS25_Mods_Info').once('value');
    return snap.val() || {};
  } catch (err) {
    console.warn("⚠️ Could not read /FS25_Mods_Info catalog:", err.message);
    return {};
  }
}

// SECTION 6: COLLECTIBLES PARSER
async function parseCollectibles(rawFiles) {
  let foundCount = 0;
  const totalCount = 100;
  const items = [];

  if (rawFiles['collectibles']) {
    const collJson = await parseXmlString(rawFiles['collectibles']);
    if (collJson && collJson.collectibles) {
      const list = collJson.collectibles.collectible || collJson.collectibles.item;
      if (list) {
        const arr = Array.isArray(list) ? list : [list];
        arr.forEach((c, idx) => {
          const isFound = String(c.collected || c.isFound || c.found || '').toLowerCase() === 'true' || c.collected === '1' || c.isFound === '1';
          if (isFound) foundCount++;
          items.push({ id: c.index || c.id || idx + 1, name: c.name || `Collectible #${idx + 1}`, isFound });
        });
      }
    }
  }

  return {
    found: foundCount,
    total: totalCount,
    formatted: `${foundCount}/${totalCount}`,
    items: items.slice(0, 100)
  };
}

// SECTION 7: JSON STRUCTURING ENGINE
async function buildCleanStructuredSave(rawFiles, modsCatalog, rawConfigXml) {
  const structured = {
    summary: {
      totalFarms: 0,
      totalVehicles: 0,
      totalPlaceables: 0,
      totalActiveMods: 0
    },
    gameInfo: {},
    collectibles: await parseCollectibles(rawFiles),
    activeMods: {},
    farms: {},
    unowned: {
      name: "Map Environment / Dealer",
      vehicles: [],
      placeables: []
    }
  };

  const catalogLookup = {};
  Object.keys(modsCatalog).forEach(key => {
    const item = modsCatalog[key];
    catalogLookup[normalizeKey(key)] = item;
    if (item.name) catalogLookup[normalizeKey(item.name)] = item;
    if (item.modName) catalogLookup[normalizeKey(item.modName)] = item;
    if (item.fileName) catalogLookup[normalizeKey(item.fileName)] = item;
  });

  const discoveredModNames = new Set();
  if (rawConfigXml) {
    const cfgJson = await parseXmlString(rawConfigXml);
    if (cfgJson && cfgJson.dedicatedServer && cfgJson.dedicatedServer.mods && cfgJson.dedicatedServer.mods.mod) {
      const mList = Array.isArray(cfgJson.dedicatedServer.mods.mod) ? cfgJson.dedicatedServer.mods.mod : [cfgJson.dedicatedServer.mods.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m._ || m.name || m.filename || "");
        if (modId) discoveredModNames.add(modId.trim());
      });
    }
  }

  if (rawFiles['careerSavegame']) {
    const careerJson = await parseXmlString(rawFiles['careerSavegame']);
    if (careerJson && careerJson.careerSavegame && careerJson.careerSavegame.mod) {
      const mList = Array.isArray(careerJson.careerSavegame.mod) ? careerJson.careerSavegame.mod : [careerJson.careerSavegame.mod];
      mList.forEach(m => {
        const modId = typeof m === 'string' ? m : (m.modName || m.name || m.filename || m._ || "");
        if (modId) discoveredModNames.add(modId.trim());
      });
    }
  }

  discoveredModNames.forEach(rawModName => {
    const cleanModKey = rawModName.replace(/\.zip$/i, '');
    const lookupKey = normalizeKey(cleanModKey);
    const catalogInfo = catalogLookup[lookupKey] || null;

    let modImage = resolveGitHubImage(cleanModKey);
    if (!modImage && catalogInfo && (catalogInfo.image || catalogInfo.imageUrl)) {
      modImage = catalogInfo.image || catalogInfo.imageUrl;
    }

    structured.activeMods[cleanModKey] = {
      modKey: cleanModKey,
      name: catalogInfo && catalogInfo.name ? catalogInfo.name : cleanEntityName(cleanModKey),
      image: modImage,
      pageUrl: catalogInfo && (catalogInfo.pageUrl || catalogInfo.url || catalogInfo.link) ? (catalogInfo.pageUrl || catalogInfo.url || catalogInfo.link) : null,
      platform: catalogInfo && catalogInfo.platform ? catalogInfo.platform : "PC / Mac",
      description: catalogInfo && catalogInfo.description ? catalogInfo.description : "",
      author: catalogInfo && catalogInfo.author ? catalogInfo.author : "Unknown / ModHub",
      updatedNumber: catalogInfo && (catalogInfo.updatedNumber || catalogInfo.version) ? (catalogInfo.updatedNumber || catalogInfo.version) : "1.0.0.0",
      matchedInCatalog: !!catalogInfo
    };
  });

  structured.summary.totalActiveMods = Object.keys(structured.activeMods).length;

  if (rawFiles['farms']) {
    const farmsJson = await parseXmlString(rawFiles['farms']);
    if (farmsJson && farmsJson.farms && farmsJson.farms.farm) {
      const farmList = Array.isArray(farmsJson.farms.farm) ? farmsJson.farms.farm : [farmsJson.farms.farm];
      farmList.forEach(f => {
        const fId = String(f.farmId || f.id || '1');
        structured.farms[`farm_${fId}`] = {
          farmId: fId,
          name: f.name || `Farm ${fId}`,
          finances: {
            money: parseFloat(f.money || 0),
            loan: parseFloat(f.loan || 0),
            balance: parseFloat(f.money || 0) - parseFloat(f.loan || 0)
          },
          color: f.color || "1",
          players: f.players ? (Array.isArray(f.players.player) ? f.players.player : [f.players.player]) : [],
          vehicles: [],
          placeables: [],
          statistics: {}
        };
      });
    }
  }

  if (Object.keys(structured.farms).length === 0) {
    structured.farms['farm_1'] = {
      farmId: "1",
      name: "Main Farm",
      finances: { money: 0, loan: 0, balance: 0 },
      color: "1",
      players: [],
      vehicles: [],
      placeables: [],
      statistics: {}
    };
  }

  if (rawFiles['vehicles']) {
    const vehJson = await parseXmlString(rawFiles['vehicles']);
    if (vehJson && vehJson.vehicles && vehJson.vehicles.vehicle) {
      const vehList = Array.isArray(vehJson.vehicles.vehicle) ? vehJson.vehicles.vehicle : [vehJson.vehicles.vehicle];
      vehList.forEach(v => {
        const fId = String(v.farmId || "0");
        const farmKey = `farm_${fId}`;
        const filename = v.filename || "";

        let matchedMod = null;
        for (const [mKey, mVal] of Object.entries(structured.activeMods)) {
          if (filename.toLowerCase().includes(mKey.toLowerCase())) {
            matchedMod = mVal;
            break;
          }
        }

        const cleanName = matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename);
        const itemImage = resolveGitHubImage(cleanName) || (matchedMod ? matchedMod.image : resolveGitHubImage(filename));

        const cleanItem = {
          id: v.id || "0",
          name: cleanName,
          file: filename,
          image: itemImage,
          price: parseFloat(v.price || 0),
          operatingHours: parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1)),
          ageMonths: parseInt(v.age || 0, 10),
          fillLevel: v.fillUnit && v.fillUnit.unit ? v.fillUnit.unit : null
        };

        structured.summary.totalVehicles++;

        if (fId === "0") {
          structured.unowned.vehicles.push(cleanItem);
        } else if (structured.farms[farmKey]) {
          structured.farms[farmKey].vehicles.push(cleanItem);
        }
      });
    }
  }

  if (rawFiles['placeables']) {
    const plcJson = await parseXmlString(rawFiles['placeables']);
    if (plcJson && plcJson.placeables && plcJson.placeables.placeable) {
      const plcList = Array.isArray(plcJson.placeables.placeable) ? plcJson.placeables.placeable : [plcJson.placeables.placeable];
      plcList.forEach(p => {
        const fId = String(p.farmId || "0");
        const farmKey = `farm_${fId}`;
        const filename = p.filename || "";

        let matchedMod = null;
        for (const [mKey, mVal] of Object.entries(structured.activeMods)) {
          if (filename.toLowerCase().includes(mKey.toLowerCase())) {
            matchedMod = mVal;
            break;
          }
        }

        const cleanName = matchedMod && matchedMod.name ? matchedMod.name : cleanEntityName(filename);
        const itemImage = resolveGitHubImage(cleanName) || (matchedMod ? matchedMod.image : resolveGitHubImage(filename));

        const cleanItem = {
          id: p.id || "0",
          name: cleanName,
          file: filename,
          image: itemImage,
          position: p.position || null,
          price: parseFloat(p.price || 0),
          ageMonths: parseInt(p.age || 0, 10)
        };

        structured.summary.totalPlaceables++;

        if (fId === "0") {
          structured.unowned.placeables.push(cleanItem);
        } else if (structured.farms[farmKey]) {
          structured.farms[farmKey].placeables.push(cleanItem);
        }
      });
    }
  }

  if (rawFiles['careerSavegame']) {
    const careerJson = await parseXmlString(rawFiles['careerSavegame']);
    if (careerJson && careerJson.careerSavegame) {
      const c = careerJson.careerSavegame;
      structured.gameInfo = {
        savegameName: c.savegameName || "FS25 Server",
        mapTitle: c.mapTitle || c.mapId || "Unknown Map",
        currentDay: parseInt(c.currentDay || 1, 10),
        dayTime: parseFloat(c.dayTime || 0),
        playTimeMinutes: parseFloat(c.playTime || 0)
      };
    }
  }

  structured.summary.totalFarms = Object.keys(structured.farms).length;
  return structured;
}

// SECTION 8: SMART PIPELINE EXECUTION
async function runPipeline() {
  console.log("📡 [1/4] Querying Dedicated Server Stats API for Live Save Slot...");
  const statsData = await fetchStatsApi();
  const activePlayers = statsData.players;

  // PRIORITY 1: Active save slot determined by the live port 9050 feed
  let activeSlot = statsData.activeSlot || process.env.DEFAULT_SAVE_SLOT || "3";
  console.log(`🎯 Live Web Feed reports Active Savegame Slot: [ Slot #${activeSlot} ]`);

  console.log("📦 Loading reference catalogue from /FS25_Mods_Info...");
  const modsCatalog = await fetchModsCatalog();

  let lastFullSyncIso = null;
  try {
    const snap = await db.ref('fs25/lastFullSaveSync').once('value');
    lastFullSyncIso = snap.val();
  } catch (e) {}

  const lastSyncMs = lastFullSyncIso ? new Date(lastFullSyncIso).getTime() : 0;
  const hoursSinceLastFullSync = (Date.now() - lastSyncMs) / (1000 * 60 * 60);

  console.log(`📊 Active Players: ${activePlayers} | Force Sync: ${FORCE_SYNC} | Hours since sync: ${hoursSinceLastFullSync.toFixed(1)}h`);

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

  console.log("🚀 Executing Full Savegame & Mod Sync...");

  const masterPayload = {
    activePlayers: activePlayers,
    activeSaveSlot: String(activeSlot),
    liveMapImage: MAP_IMAGE_URL,
    lastUpdated: new Date().toISOString(),
    lastFullSaveSync: new Date().toISOString(),
    config: { appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c" },
    raw_xml: {}
  };

  if (statsData.text) {
    masterPayload.raw_xml.stats = statsData.text;
  }

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

    // Inspect server config files to verify active savegame slot
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
            console.log(`🎯 Config file verified active save slot: Slot #${activeSlot}`);
            break;
          }
        }
      } catch (e) {}
    }

    // Strict slot candidate resolution
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

    // Fallback if the specific slot folder wasn't reachable directly
    if (!activeSavePath) {
      console.warn(`⚠️ Path [ profile/savegame${activeSlot} ] not accessible directly. Scanning server roots...`);
      let rootList = [];
      try { rootList = await client.list(); } catch (e) {}
      let profileList = [];
      try { profileList = await client.list('profile'); } catch (e) {}

      const allDiscovered = [];
      profileList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame')).forEach(f => {
        allDiscovered.push({ path: `profile/${f.name}`, name: f.name });
      });
      rootList.filter(f => f.isDirectory && f.name.toLowerCase().includes('savegame')).forEach(f => {
        allDiscovered.push({ path: f.name, name: f.name });
      });

      const matchedFolder = allDiscovered.find(f => f.name.includes(String(activeSlot))) || allDiscovered[0];
      if (matchedFolder) {
        activeSavePath = matchedFolder.path;
        fileList = await client.list(activeSavePath);
        console.log(`🎯 Found matching directory: [ ${activeSavePath} ]`);
      }
    }

    if (!activeSavePath) {
      throw new Error(`Unable to locate savegame directory for Slot #${activeSlot} on FTP server.`);
    }

    masterPayload.activeSaveSlot = String(activeSlot);
    console.log(`📂 [3/4] Pulling XML files from: [ ${activeSavePath} ] (Slot #${masterPayload.activeSaveSlot})`);

    const readableFiles = fileList.filter(f => !f.isDirectory && (
      f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.txt')
    ));

    console.log(`📄 Found ${readableFiles.length} files. Synchronizing into clean JSON models...`);

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
          console.log(`  -> Downloaded: ${file.name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${file.name}: ${err.message}`);
      }
    }

    console.log("🚜 Structuring farms, active mods, vehicles, placeables, and collectibles...");
    const cleanData = await buildCleanStructuredSave(rawFileCache, modsCatalog, rawServerConfigXml);

    masterPayload.summary = cleanData.summary;
    masterPayload.gameInfo = cleanData.gameInfo || {};
    masterPayload.collectibles = cleanData.collectibles || { found: 0, total: 100, formatted: "0/100" };
    masterPayload.activeMods = cleanData.activeMods || {};
    masterPayload.farms = cleanData.farms;
    masterPayload.unowned = cleanData.unowned;

    // Overwrite the /fs25 node to clear all previous unparsed XML strings
    console.log("💾 [4/4] Writing clean atomic payload to Firebase /fs25...");
    await db.ref('fs25').set(masterPayload);

    console.log(`🏆 Active Savegame (Slot #${activeSlot}) successfully synchronized to Firebase /fs25!`);
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
