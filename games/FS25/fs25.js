/* ============================================================================
 * File: games/FS25/fs25.js
 * Deployment Timestamp: 2026-09-05 13:25:00 (EDT - 24hr New York Time)
 * Project: fs25-a3563 (/fs25 RTDB Node)
 * Target Server: FIREBASE_DEDICATED_SERVER
 * Google Analytics Tag: G-CTYHDF4MSD (Gaming, Progress Tracking, Firebase Entertainment)
 * Measurement ID: G-SGJF0FJPQZ
 * Description: Zero-Loss, Multi-Tiered FS25 Savegame Ingestion Engine.
 *              - Dual HTTP & HTTPS protocol-agnostic networking.
 *              - Server Offline Guard:
 *                  * Pings Port 9050.
 *                  * If offline: updates serverStatus.isOnline = false and halts.
 *                  * ZERO existing card data in Firebase is overwritten or deleted.
 *              - Active Player High-Frequency Route (activePlayers > 0):
 *                  * Syncs player-influenced files: vehicles.xml, fields.xml, 
 *                    farms.xml, farmland.xml, missions.xml, players.xml.
 *              - In-Game Calendar Day Trigger:
 *                  * Ingests environment.xml whenever currentDay increments.
 *              - Idle 6-12 Hour / Daily Route (activePlayers === 0):
 *                  * Refreshes economy.xml, sales.xml, placeables.xml, 
 *                    collectibles.xml, precisionFarming.xml, activeMods.
 *              - Spatial Aggregations:
 *                  * Passive income generators grouped by [Source - Count - $Total - Zone]
 *                    with hourly and monthly revenue models.
 *                  * Preserves attached implement hierarchies, baler twine inventories,
 *                    factory production storages, and precision farming offsets.
 * Database Target: https://fs25-a3563-default-rtdb.firebaseio.com/fs25
 * ============================================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const ftp = require('basic-ftp');
const admin = require('firebase-admin');
const { Writable } = require('stream');
const xml2js = require('xml2js');

// ============================================================================
// SECTION 1: SAFETY TIMEOUT (4-Minute Process Failsafe)
// ============================================================================
// Line ~37: Halts background processes before GitHub Actions or runner times out
setTimeout(() => {
  console.log("🚨 Safety Failsafe: Process exiting cleanly after 4 minutes.");
  process.exit(0);
}, 4 * 60 * 1000);

// ============================================================================
// SECTION 2: FIREBASE ADMIN INITIALIZATION (Dedicated Server Config)
// ============================================================================
// Target RTDB configuration for fs25-a3563
const firebaseConfig = {
  projectId: "fs25-a3563",
  databaseURL: "https://fs25-a3563-default-rtdb.firebaseio.com",
  storageBucket: "fs25-a3563.firebasestorage.app"
};

let serviceAccount;
// Check FIREBASE_DEDICATED_SERVER secret first, fallback to standard credential names
const rawSecret = process.env.FIREBASE_DEDICATED_SERVER || process.env.FIREBASE_SERVICE_ACCOUNT;

if (rawSecret) {
  try {
    serviceAccount = JSON.parse(rawSecret);
  } catch (e) {
    console.error("❌ Error parsing FIREBASE credential JSON:", e.message);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require("./your-firebase-adminsdk-key.json");
  } catch (e) {
    console.error("❌ Missing FIREBASE_DEDICATED_SERVER service account key.");
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
// SECTION 3: NETWORK CONFIGURATION (Dual HTTP/HTTPS Compatibility)
// ============================================================================
const ftpHost = process.env.FTP_HOST || '207.244.246.70';
const ftpPort = parseInt(process.env.FTP_PORT, 10) || 21;
const ftpUser = process.env.FTP_USER;
const ftpPass = process.env.FTP_PASS;
const apiCode = process.env.FS25_API_CODE || '3FvqSlOsYKckfauM';

// Supports both standard HTTP XML ping and HTTPS image proxy caching
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

function formatCurrency(amount) {
  return `$${Math.round(amount || 0).toLocaleString('en-US')}`;
}

function resolveBestImage(entityKey, sheetRecord) {
  if (sheetRecord && typeof sheetRecord === 'object') {
    const candidateColumns = [
      sheetRecord.image, sheetRecord.image_url, sheetRecord.imageurl,
      sheetRecord.img, sheetRecord.picture, sheetRecord.mod_image,
      sheetRecord.photo, sheetRecord.icon, sheetRecord.url_image
    ];

    for (const cand of candidateColumns) {
      if (cand && typeof cand === 'string') {
        let url = cand.trim();
        if (url.includes('drive.google.com')) {
          const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
          if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
          }
        }
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
      }
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
      if (clean.includes('<Server')) {
        const parsed = await parseXmlString(clean);
        return { isOnline: true, text: clean, parsed: parsed ? parsed.Server : null };
      }
    }
  } catch (err) {
    console.warn("⚠️ Server connection ping returned offline:", err.message);
  }
  return { isOnline: false, text: "", parsed: null };
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
    return {};
  }
}

// ============================================================================
// SECTION 6: HIGH-FREQUENCY / ACTIVE PLAYER MODULES
// ============================================================================

// Module A: Vehicles, Fleet, Implements, Twine & Pallets (vehicles.xml)
async function syncVehicles(client, activeSavePath, liveStats, catalogLookup) {
  console.log("🚜 Active Player: Syncing vehicles.xml...");
  const content = await downloadFtpFileToString(client, `${activeSavePath}/vehicles.xml`);
  const parsed = await parseXmlString(sanitizeXml(content));
  if (!parsed || !parsed.vehicles) return;

  const vehList = Array.isArray(parsed.vehicles.vehicle) ? parsed.vehicles.vehicle : [parsed.vehicles.vehicle];
  const liveVehicleCategoryMap = {};
  if (liveStats && liveStats.Vehicles && liveStats.Vehicles.Vehicle) {
    const liveVehs = Array.isArray(liveStats.Vehicles.Vehicle) ? liveStats.Vehicles.Vehicle : [liveStats.Vehicles.Vehicle];
    liveVehs.forEach(lv => {
      if (lv.name) liveVehicleCategoryMap[normalizeKey(lv.name)] = lv.category;
    });
  }

  const fleet = [];
  const harvesters = [];
  const palletsAndBales = [];

  vehList.forEach(v => {
    const fId = String(v.farmId || "0");
    const filename = v.filename || "";
    const cleanName = cleanEntityName(filename);
    const itemImage = resolveBestImage(cleanName, catalogLookup[normalizeKey(cleanName)]) || resolveBestImage(filename, null);
    const lower = (filename + " " + cleanName).toLowerCase();
    const liveCat = liveVehicleCategoryMap[normalizeKey(cleanName)] || "";

    // Pallets & Bales
    if (v.pallet || liveCat === "PALLETS" || v.bale || lower.includes("bale") || lower.includes("pallet") || lower.includes("bigbag")) {
      palletsAndBales.push({
        id: v.uniqueId || v.id || "0",
        farmId: fId,
        name: cleanName,
        file: filename,
        image: itemImage,
        fillLevel: v.fillUnit && v.fillUnit.unit ? v.fillUnit.unit : null,
        baleData: v.bale || v.baler || null,
        palletData: v.pallet || null,
        raw: v
      });
      return;
    }

    // Operating hours calculation
    const operatingHours = parseFloat(((parseFloat(v.operatingTime || 0)) / 3600).toFixed(1));

    // Full equipment item structure
    const item = {
      id: v.uniqueId || v.id || "0",
      farmId: fId,
      name: cleanName,
      file: filename,
      image: itemImage,
      price: parseFloat(v.price || 0),
      operatingHours: operatingHours,
      ageMonths: parseInt(v.age || 0, 10),
      odometerMileage: v.drivable && v.drivable.odometerMilage ? parseFloat(v.drivable.odometerMilage) : 0,
      damage: v.wearable && v.wearable.damage ? parseFloat(v.wearable.damage) : 0,
      wearNode: v.wearable && v.wearable.wearNode && v.wearable.wearNode.amount ? parseFloat(v.wearable.wearNode.amount) : 0,
      licensePlate: v.licensePlates ? v.licensePlates.characters : null,
      fillUnits: v.fillUnit && v.fillUnit.unit ? (Array.isArray(v.fillUnit.unit) ? v.fillUnit.unit : [v.fillUnit.unit]) : [],
      attachedImplements: v.attacherJoints && v.attacherJoints.attachedImplement ? (Array.isArray(v.attacherJoints.attachedImplement) ? v.attacherJoints.attachedImplement : [v.attacherJoints.attachedImplement]) : [],
      consumables: v.consumable || null,
      baleCounter: v.baleCounter || null,
      combineData: v.combine ? {
        isSwathActive: v.combine.isSwathActive === 'true',
        workedHectares: parseFloat(v.combine.workedHectars || 0),
        pipeState: v.pipe ? v.pipe.state : null
      } : null,
      precisionFarming: v.FS25_precisionFarming || null,
      raw: v
    };

    if (liveCat === "HARVESTERS" || liveCat === "BEETHARVESTERS" || v.combine || lower.includes("harvester") || lower.includes("combine")) {
      item.cardType = "Harvester / Combine";
      harvesters.push(item);
    } else {
      item.cardType = liveCat || "Fleet Machinery";
      fleet.push(item);
    }
  });

  await db.ref('fs25').update({
    'cards/fleet': fleet,
    'cards/harvestersAndCombines': harvesters,
    'cards/palletsAndBales': palletsAndBales,
    'summary/totalVehicles': fleet.length + harvesters.length,
    'summary/totalFleet': fleet.length,
    'summary/totalHarvestersAndCombines': harvesters.length,
    'summary/totalPalletsAndBales': palletsAndBales.length,
    'lastVehicleSync': new Date().toISOString()
  });
}

// Module B: Fields Agronomy & Soil Progress (fields.xml)
async function syncFields(client, activeSavePath) {
  console.log("🌱 Active Player: Syncing fields.xml...");
  const fieldsXml = await downloadFtpFileToString(client, `${activeSavePath}/fields.xml`);
  const parsedFields = await parseXmlString(sanitizeXml(fieldsXml));

  const fieldsAgronomy = [];
  if (parsedFields && parsedFields.fields && parsedFields.fields.field) {
    const list = Array.isArray(parsedFields.fields.field) ? parsedFields.fields.field : [parsedFields.fields.field];
    list.forEach(fld => {
      fieldsAgronomy.push({
        fieldId: parseInt(fld.id || 0, 10),
        fruitType: fld.fruitType || "UNKNOWN",
        plannedFruit: fld.plannedFruit || "NONE",
        growthStage: parseInt(fld.growthState || 0, 10),
        groundType: fld.groundType || "UNKNOWN",
        sprayType: fld.sprayType || "NONE",
        sprayLevel: parseInt(fld.sprayLevel || 0, 10),
        limeLevel: parseInt(fld.limeLevel || 0, 10),
        needsLime: parseInt(fld.limeLevel || 0, 10) === 0,
        weedState: parseInt(fld.weedState || 0, 10),
        plowLevel: parseInt(fld.plowLevel || 0, 10),
        raw: fld
      });
    });
  }

  await db.ref('fs25').update({
    'cards/fieldsAgronomy': fieldsAgronomy,
    'fields': fieldsAgronomy,
    'lastFieldsSync': new Date().toISOString()
  });
}

// Module C: Missions & Contracts Progress (missions.xml)
async function syncMissions(client, activeSavePath) {
  console.log("📜 Active Player: Syncing missions.xml...");
  try {
    const missionsXml = await downloadFtpFileToString(client, `${activeSavePath}/missions.xml`);
    const parsedMissions = await parseXmlString(sanitizeXml(missionsXml));
    if (parsedMissions && parsedMissions.missions) {
      const rawList = parsedMissions.missions.mission || parsedMissions.missions.fieldMission || [];
      const list = Array.isArray(rawList) ? rawList : [rawList];

      const all = [];
      const available = [];
      const inProgress = [];
      const finished = [];
      const failed = [];

      list.forEach((m, idx) => {
        const statusRaw = parseInt(m.status || 0, 10);
        let statusText = "Available";
        if (statusRaw === 1) statusText = "In Progress";
        else if (statusRaw === 2) statusText = "Finished";
        else if (statusRaw === 3) statusText = "Failed";

        const type = (m.type || m.missionType || "Contract").replace(/([A-Z])/g, ' $1').trim();
        const item = {
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
          assignedFarmId: m.farmId || null,
          raw: m
        };

        all.push(item);
        if (statusRaw === 0) available.push(item);
        else if (statusRaw === 1) inProgress.push(item);
        else if (statusRaw === 2) finished.push(item);
        else if (statusRaw === 3) failed.push(item);
      });

      await db.ref('fs25').update({
        'cards/missions/all': all,
        'cards/missions/available': available,
        'cards/missions/inProgress': inProgress,
        'cards/missions/finished': finished,
        'cards/missions/failed': failed,
        'missions': { all, available, inProgress, finished, failed },
        'summary/totalAllMissions': all.length,
        'summary/activeMissionsCount': inProgress.length,
        'summary/availableMissionsCount': available.length,
        'summary/finishedMissionsCount': finished.length,
        'lastMissionsSync': new Date().toISOString()
      });
    }
  } catch (e) {}
}

// Module D: Farms, Ledgers, Players & Farmlands (farms.xml, players.xml, farmland.xml)
async function syncFarmsAndLand(client, activeSavePath, liveStats) {
  console.log("💰 Active Player: Syncing farms.xml, players.xml & farmland.xml...");
  const farmsXml = await downloadFtpFileToString(client, `${activeSavePath}/farms.xml`);
  const farmlandXml = await downloadFtpFileToString(client, `${activeSavePath}/farmland.xml`);
  const parsedFarms = await parseXmlString(sanitizeXml(farmsXml));
  const parsedFarmland = await parseXmlString(sanitizeXml(farmlandXml));

  const farmNameMap = {};
  const farms = {};

  if (parsedFarms && parsedFarms.farms && parsedFarms.farms.farm) {
    const list = Array.isArray(parsedFarms.farms.farm) ? parsedFarms.farms.farm : [parsedFarms.farms.farm];
    list.forEach(f => {
      const fId = String(f.farmId || f.id || '1');
      farmNameMap[fId] = f.name || `Farm ${fId}`;
      farms[`farm_${fId}`] = {
        farmId: fId,
        name: f.name || `Farm ${fId}`,
        finances: {
          money: parseFloat(f.money || 0),
          loan: parseFloat(f.loan || 0),
          balance: parseFloat(f.money || 0) - parseFloat(f.loan || 0),
          history: f.statistics || f.history || {},
          ledgerDays: f.finances && f.finances.stats ? f.finances.stats : []
        },
        color: f.color || "1",
        players: f.players ? (Array.isArray(f.players.player) ? f.players.player : [f.players.player]) : [],
        raw: f
      };
    });
  }

  // Players Registry (players.xml)
  const playerRecords = [];
  try {
    const playersXml = await downloadFtpFileToString(client, `${activeSavePath}/players.xml`);
    const parsedPlayers = await parseXmlString(sanitizeXml(playersXml));
    if (parsedPlayers && parsedPlayers.players && parsedPlayers.players.player) {
      const pList = Array.isArray(parsedPlayers.players.player) ? parsedPlayers.players.player : [parsedPlayers.players.player];
      pList.forEach(p => {
        playerRecords.push({
          uniqueUserId: p.uniqueUserId,
          timeLastConnected: p.timeLastConnected,
          style: p.style || {},
          handTools: p.handTools && p.handTools.handTool ? (Array.isArray(p.handTools.handTool) ? p.handTools.handTool : [p.handTools.handTool]) : []
        });
      });
    }
  } catch (e) {
    console.warn("⚠️ players.xml skipped:", e.message);
  }

  const farmlandAreaMap = {};
  const farmlandPriceMap = {};
  if (liveStats && liveStats.Farmlands && liveStats.Farmlands.Farmland) {
    const livePlots = Array.isArray(liveStats.Farmlands.Farmland) ? liveStats.Farmlands.Farmland : [liveStats.Farmlands.Farmland];
    livePlots.forEach(lp => {
      farmlandAreaMap[String(lp.id)] = parseFloat(lp.area || 0);
      farmlandPriceMap[String(lp.id)] = parseFloat(lp.price || 0);
    });
  }

  const farmlands = [];
  if (parsedFarmland && parsedFarmland.farmlands && parsedFarmland.farmlands.farmland) {
    const fList = Array.isArray(parsedFarmland.farmlands.farmland) ? parsedFarmland.farmlands.farmland : [parsedFarmland.farmlands.farmland];
    fList.forEach(f => {
      const farmId = String(f.farmId || "0");
      const fId = String(f.id);
      const isOwned = farmId !== "0";
      farmlands.push({
        id: parseInt(f.id, 10),
        farmId: farmId,
        ownerName: isOwned ? (farmNameMap[farmId] || `Farm ${farmId}`) : "Available For Purchase",
        isOwned: isOwned,
        areaHa: farmlandAreaMap[fId] || 0,
        price: farmlandPriceMap[fId] || 0,
        raw: f
      });
    });
  }

  await db.ref('fs25').update({
    'farms': farms,
    'playersRegistry': playerRecords,
    'cards/farmlands': farmlands,
    'farmlands/list': farmlands,
    'farmlands/totalMapFarmlands': farmlands.length,
    'farmlands/ownedFarmlands': farmlands.filter(f => f.isOwned).length,
    'summary/totalFarms': Object.keys(farms).length,
    'summary/totalMapFarmlands': farmlands.length,
    'summary/totalFarmlandsOwned': farmlands.filter(f => f.isOwned).length,
    'lastFarmsSync': new Date().toISOString()
  });
}

// ============================================================================
// SECTION 7: LOW-FREQUENCY / SLOW STATIC SYSTEMS (6-12 Hours / Daily)
// ============================================================================
async function syncSlowStaticSystems(client, activeSavePath, catalogLookup) {
  console.log("🏛️ Executing 6-12 Hour Low-Frequency Sync (Placeables, Economy, Sales, Mods, Collectibles)...");
  const updates = {};

  // 1. Placeables & Passive Income Aggregations (placeables.xml)
  try {
    const placeablesXml = await downloadFtpFileToString(client, `${activeSavePath}/placeables.xml`);
    const parsedPlc = await parseXmlString(sanitizeXml(placeablesXml));
    if (parsedPlc && parsedPlc.placeables) {
      const plcList = Array.isArray(parsedPlc.placeables.placeable) ? parsedPlc.placeables.placeable : [parsedPlc.placeables.placeable];
      const rawPassiveGenerators = [];
      const animals = [];
      const factories = [];
      const generalPlaceables = [];

      plcList.forEach(p => {
        const fId = String(p.farmId || "0");
        const filename = p.filename || "";
        const cleanName = cleanEntityName(filename);
        const itemImage = resolveBestImage(cleanName, catalogLookup[normalizeKey(cleanName)]) || resolveBestImage(filename, null);
        const lower = (filename + " " + cleanName).toLowerCase();

        const item = {
          id: p.uniqueId || p.id || "0",
          farmId: fId,
          name: cleanName,
          file: filename,
          image: itemImage,
          price: parseFloat(p.price || 0),
          raw: p
        };

        if (p.solarPanels || p.windTurbine || lower.includes("subsidy") || lower.includes("solar") || lower.includes("wind") || lower.includes("generator") || lower.includes("bga")) {
          rawPassiveGenerators.push({ ...item, zone: getSpatialZone(p), rawNode: p });
          return;
        }

        if (p.husbandry || p.husbandryFence || p.husbandryMeadow || lower.includes("husbandry") || lower.includes("barn") || lower.includes("pasture") || lower.includes("coop")) {
          item.category = "Animals & Husbandry";
          item.meadow = p.husbandryMeadow ? p.husbandryMeadow.fillType : null;
          animals.push(item);
          return;
        }

        if (p.productionPoint || lower.includes("production") || lower.includes("factory") || lower.includes("mill") || lower.includes("bakery") || lower.includes("dairy")) {
          item.category = "Factories & Production";
          item.storage = p.productionPoint ? p.productionPoint.storage : null;
          factories.push(item);
          return;
        }

        generalPlaceables.push(item);
      });

      const incomeGroups = {};
      rawPassiveGenerators.forEach(gen => {
        let normalizedCategory = gen.name;
        const lower = gen.name.toLowerCase();
        if (lower.includes("subsidy")) normalizedCategory = "Government Subsidy";
        else if (lower.includes("solar")) normalizedCategory = "Solar Panel Array";
        else if (lower.includes("wind") || lower.includes("turbine")) normalizedCategory = "Wind Turbine";

        const groupKey = `${gen.farmId}_${normalizedCategory}_${gen.zone}`;
        if (!incomeGroups[groupKey]) {
          let hourlyRate = 0;
          let monthlyRate = 0;
          const raw = gen.rawNode;
          if (raw.incomePerHour) hourlyRate = parseFloat(raw.incomePerHour);
          if (raw.incomePerMonth) monthlyRate = parseFloat(raw.incomePerMonth);

          if (hourlyRate === 0 && monthlyRate === 0) {
            if (normalizedCategory === "Government Subsidy") { monthlyRate = 8400000; hourlyRate = monthlyRate / 24; }
            else if (normalizedCategory === "Solar Panel Array") { hourlyRate = 380; monthlyRate = hourlyRate * 24; }
            else if (normalizedCategory === "Wind Turbine") { hourlyRate = 1500; monthlyRate = hourlyRate * 24; }
          }

          incomeGroups[groupKey] = {
            sourceName: normalizedCategory,
            farmId: gen.farmId,
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

      const incomeGeneratorCards = Object.values(incomeGroups).map(group => {
        const totalHourly = group.hourlyRatePerUnit * group.count;
        const totalMonthly = group.monthlyRatePerUnit * group.count;
        return {
          cardTitle: `[${group.sourceName} - ${group.count} Units - ${formatCurrency(group.totalInvestedValue)} Total - ${group.locationZone}]`,
          source: group.sourceName,
          totalUnits: group.count,
          totalFarmValue: group.totalInvestedValue,
          totalFarmValueFormatted: formatCurrency(group.totalInvestedValue),
          farmId: group.farmId,
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
      });

      updates['cards/incomeGenerators'] = incomeGeneratorCards;
      updates['cards/animals'] = animals;
      updates['cards/factories'] = factories;
      updates['cards/generalPlaceables'] = generalPlaceables;
      updates['summary/totalAnimalsHusbandry'] = animals.length;
      updates['summary/totalFactories'] = factories.length;
      updates['summary/totalIncomeGeneratorCards'] = incomeGeneratorCards.length;
      updates['summary/totalRawGenerators'] = rawPassiveGenerators.length;
    }
  } catch (e) {}

  // 2. Economy Cycles (economy.xml)
  try {
    const econXml = await downloadFtpFileToString(client, `${activeSavePath}/economy.xml`);
    const parsedEcon = await parseXmlString(sanitizeXml(econXml));
    if (parsedEcon && parsedEcon.economy) updates['economy'] = parsedEcon.economy;
  } catch (e) {}

  // 3. Dealership Sales (sales.xml)
  try {
    const salesXml = await downloadFtpFileToString(client, `${activeSavePath}/sales.xml`);
    const parsedSales = await parseXmlString(sanitizeXml(salesXml));
    if (parsedSales && parsedSales.sales && parsedSales.sales.item) {
      const sList = Array.isArray(parsedSales.sales.item) ? parsedSales.sales.item : [parsedSales.sales.item];
      const dealershipSales = sList.map(s => {
        const name = cleanEntityName(s.xmlFilename || "Discount Equipment");
        return {
          name: name,
          price: parseFloat(s.price || 0),
          timeLeft: parseInt(s.timeLeft || 0, 10),
          damage: parseFloat(s.damage || 0),
          wear: parseFloat(s.wear || 0),
          operatingHours: parseFloat(((parseFloat(s.operatingTime || 0)) / 3600).toFixed(1)),
          image: resolveBestImage(name, null),
          raw: s
        };
      });
      updates['cards/dealershipSales'] = dealershipSales;
      updates['summary/dealershipDiscountsCount'] = dealershipSales.length;
    }
  } catch (e) {}

  // 4. Collectibles (collectibles.xml)
  try {
    const collXml = await downloadFtpFileToString(client, `${activeSavePath}/collectibles.xml`);
    const parsedColl = await parseXmlString(sanitizeXml(collXml));
    if (parsedColl && parsedColl.collectibles && parsedColl.collectibles.collectible) {
      const cList = Array.isArray(parsedColl.collectibles.collectible) ? parsedColl.collectibles.collectible : [parsedColl.collectibles.collectible];
      let count = 0;
      const items = cList.map(c => {
        const isFound = String(c.collected || '').toLowerCase() === 'true';
        if (isFound) count++;
        return { index: parseInt(c.index, 10), collected: isFound };
      });
      updates['collectibles'] = {
        found: count,
        total: items.length,
        formatted: `${count}/${items.length}`,
        items: items
      };
      updates['summary/collectiblesFoundCount'] = count;
    }
  } catch (e) {}

  // 5. Precision Farming Add-on Data (precisionFarming.xml)
  try {
    const pfXml = await downloadFtpFileToString(client, `${activeSavePath}/precisionFarming.xml`);
    const parsedPf = await parseXmlString(sanitizeXml(pfXml));
    if (parsedPf && parsedPf.precisionFarming) updates['precisionFarming'] = parsedPf.precisionFarming;
  } catch (e) {}

  // 6. Career Savegame Settings (careerSavegame.xml)
  try {
    const careerXml = await downloadFtpFileToString(client, `${activeSavePath}/careerSavegame.xml`);
    const parsedCareer = await parseXmlString(sanitizeXml(careerXml));
    if (parsedCareer && parsedCareer.careerSavegame) {
      const c = parsedCareer.careerSavegame;
      updates['gameInfo/savegameName'] = c.settings ? c.settings.savegameName : "FS25 Server";
      updates['gameInfo/playTimeMinutes'] = c.statistics ? parseFloat(c.statistics.playTime || 0) : 0;
      updates['gameInfo/totalMoney'] = c.statistics ? parseFloat(c.statistics.money || 0) : 0;
      updates['gameInfo/gameplaySettings'] = {
        weedsEnabled: c.settings ? c.settings.weedsEnabled === 'true' : true,
        stonesEnabled: c.settings ? c.settings.stonesEnabled === 'true' : true,
        limeRequired: c.settings ? c.settings.limeRequired === 'true' : true,
        fuelUsage: c.settings ? c.settings.fuelUsage : "3",
        economicDifficulty: c.settings ? c.settings.economicDifficulty : "NORMAL"
      };
    }
  } catch (e) {}

  updates['lastSlowSync'] = Date.now();
  await db.ref('fs25').update(updates);
}

// ============================================================================
// SECTION 8: 16-MINUTE MASTER CONTROLLER
// ============================================================================
async function runPipeline() {
  console.log("⏱️ [16-Min Trigger]: Pinging Server Status & Port 9050...");
  const serverPing = await pingServerLiveStats();

  // Guard: If server is offline, update flag only and halt immediately
  if (!serverPing.isOnline) {
    console.log("🛑 Server is OFFLINE. Updating serverStatus flag and exiting. (Preserving all saved Firebase data).");
    await db.ref('fs25/serverStatus').update({
      isOnline: false,
      lastChecked: new Date().toISOString()
    });
    process.exit(0);
  }

  // Server is verified online
  const liveStats = serverPing.parsed;
  const activePlayers = liveStats && liveStats.Slots ? parseInt(liveStats.Slots.numUsed || 0, 10) : 0;
  console.log(`✅ Server is ONLINE | Active Players: ${activePlayers}`);

  await db.ref('fs25/serverStatus').update({
    isOnline: true,
    activePlayers: activePlayers,
    lastChecked: new Date().toISOString()
  });

  const catalogLookup = await fetchModsCatalog();
  const metaSnap = await db.ref('fs25').once('value');
  const existingFs25 = metaSnap.val() || {};

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

    // Detect save slot index
    let activeSlot = "3";
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
          const parsedCfg = await parseXmlString(sanitizeXml(content));
          if (parsedCfg && parsedCfg.gameserver && parsedCfg.gameserver.settings && parsedCfg.gameserver.settings.savegame_index) {
            activeSlot = String(parsedCfg.gameserver.settings.savegame_index).trim();
            break;
          }
        }
      } catch (e) {}
    }

    const activeSavePath = `savegame${activeSlot}`;
    console.log(`📂 Locked savegame path: [ ${activeSavePath} ] (Slot #${activeSlot})`);

    // --- TRIGGER 1: Environment & In-Game Day Check ---
    let currentInGameDay = existingFs25.environment ? existingFs25.environment.currentDay : null;
    try {
      const envXml = await downloadFtpFileToString(client, `${activeSavePath}/environment.xml`);
      const parsedEnv = await parseXmlString(sanitizeXml(envXml));
      if (parsedEnv && parsedEnv.environment) {
        const newDay = parsedEnv.environment.currentDay;
        if (newDay !== currentInGameDay) {
          console.log(`🌅 In-game day changed from ${currentInGameDay} to ${newDay}. Updating environment.`);
          await db.ref('fs25/environment').set(parsedEnv.environment);
        }
      }
    } catch (e) {}

    // --- TRIGGER 2: High-Frequency Active Player Route ---
    if (activePlayers > 0) {
      console.log("⚡ Players are active on the server. Executing fast sync...");
      await syncVehicles(client, activeSavePath, liveStats, catalogLookup);
      await syncFields(client, activeSavePath);
      await syncMissions(client, activeSavePath);
      await syncFarmsAndLand(client, activeSavePath, liveStats);
    } else {
      console.log("💤 0 players currently online. Skipping active equipment and field files.");
    }

    // --- TRIGGER 3: Low-Frequency 6–12 Hour Window Check ---
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const lastSlowSyncTime = existingFs25.lastSlowSync || 0;

    if (Date.now() - lastSlowSyncTime > SIX_HOURS_MS) {
      await syncSlowStaticSystems(client, activeSavePath, catalogLookup);
    }

    // Config metadata updated for dedicated server setup
    await db.ref('fs25/config').update({
      appId: "1:528331196894:web:5af51bc2c80fd56aecf54f",
      projectId: "fs25-a3563",
      gaTag: "G-CTYHDF4MSD",
      measurementId: "G-SGJF0FJPQZ",
      activeSaveSlot: String(activeSlot),
      lastConfigSync: new Date().toISOString()
    });

    console.log("🏁 16-minute pipeline check completed cleanly.");
    client.close();
    process.exit(0);

  } catch (err) {
    console.error("🚨 Pipeline Error:", err.message);
    client.close();
    process.exit(0);
  }
}

runPipeline();
