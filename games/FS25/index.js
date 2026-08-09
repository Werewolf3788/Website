/*
  Version Timestamp: Sunday, August 09, 2026, 1:10 AM (EDT)
  Complete Dynamic Telemetry Parser with Fixed CSV Column Mapping & Realtime Database Sync
  File: games/FS25/index.js
  Database Target: https://entertainment-71888-default-rtdb.firebaseio.com/fs25
*/

// External Endpoints
const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";
const FIREBASE_RTDB_FS25_URL = "https://entertainment-71888-default-rtdb.firebaseio.com/fs25.json";

// Dynamic Color System By Farm Owner
const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Default Server", color: "#facc15" },
  "1": { name: "Farm 1", color: "#ff5f00" },
  "2": { name: "Farm 2", color: "#c41e3a" },
  "3": { name: "Farm 3", color: "#22c55e" },
  "4": { name: "Farm 4", color: "#2563eb" },
  "5": { name: "Farm 5", color: "#a855f7" },
  "6": { name: "Farm 6", color: "#ec4899" }
};

function getFarmColor(farmId) {
  const fid = String(farmId || "0");
  return FARM_COLOR_PALETTE[fid] ? FARM_COLOR_PALETTE[fid].color : "#facc15";
}

const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG", "BEETROOT": "images/Beetroot.JPG", "RED BEET": "images/Beetroot.JPG",
  "BREAD": "images/Bread.JPG", "BUTTER": "images/Butter.JPG", "CABBAGE": "images/Cabbage.JPG",
  "CANOLA": "images/Canola.JPG", "CANOLA OIL": "images/Canola Oil.JPG", "CARROTS": "images/Carrots.JPG",
  "CHEESE": "images/Cheese.JPG", "CHICKENS": "images/Chickens.JPG", "CHOCOLATE": "images/Chocolate.JPG",
  "CORN": "images/Corn.JPG", "MAIZE": "images/Corn.JPG", "COTTON": "images/Cotton.JPG", "COW": "images/Cow.JPG", "DEF": "images/DEF.JPG",
  "DESTRUCTIBLE ROCK": "images/Destructible Rock.JPG", "DIESEL": "images/Diesel.JPG", "DIGESTATE": "images/Digestate.JPG",
  "EGGS": "images/Eggs.JPG", "FLOUR": "images/Flour.JPG", "FORAGE": "images/Forage.JPG",
  "GRAIN BARGE": "images/GRAIN BARGE.JPG", "GRAIN ELEVATOR": "images/GRAIN ELEVATOR.jpg", "GRASS": "images/Grass.JPG",
  "GREEN BEANS": "images/Green Beans.JPG", "HAY": "images/Hay.JPG", "HONEY BOX": "images/HONEY BOX.JPG",
  "HORSES": "images/Horses.JPG", "LIME": "images/Lime.JPG", "LIQUID FERTILIZER": "images/Liquid Fertilizer.JPG",
  "LOG TRAILER": "images/Log Trailer.JPG", "MANURE": "images/Manure.JPG", "MILK": "images/Milk.JPG",
  "MINERAL FEED": "images/Mineral Feed.JPG", "OATS": "images/Oats.JPG", "PARSNIP": "images/Parsnip.JPG",
  "PEAS": "images/Peas.JPG", "PIGS": "images/Pigs.JPG", "POTATOES": "images/Potatoes.JPG",
  "PRECISION FARMING": "images/Precision Farming.jpg", "RESTAURANT": "images/Restaurant.JPG", "RICE": "images/Rice.JPG",
  "SEEDS": "images/Seeds.JPG", "SHEEP": "images/Sheep.JPG", "SILAGE": "images/Silage.JPG",
  "SLURRY": "images/Slurry.JPG", "SOLID FERTILIZER": "images/Solid Fertilizer.JPG", "SORGHUM": "images/Sorghum.JPG",
  "SOYBEANS": "images/Soybeans.JPG", "SPINACH": "images/Spinach.JPG", "STRAW": "images/Straw.JPG",
  "SUGARBEETS": "images/Sugarbeets.JPG", "SUGARCANE": "images/Sugarcane.JPG", "SUNFLOWERS": "images/Sunflowers.JPG",
  "TEDDER": "images/Teddar.JPG", "TOMATOES": "images/Tomatoes.JPG", "TRAIN STATION": "images/Train Station.JPG",
  "WHEAT": "images/Wheat.JPG", "WOOD CHIPS": "images/Wood Chips.JPG",
  "BIG BUD KTTA 700": "images/Big Bud KTTA 700.JPG", "JOHN DEERE 8R SERIES": "images/John Deere 8R Series.JPG",
  "AMERICAN MIDWEST TRUCK SHOP": "images/American Midwest Truck Shop.jpg"
};

const BASE_PRICES_PER_KL = {
  "WHEAT": 780, "BARLEY": 720, "CANOLA": 1250, "OAT": 1100,
  "MAIZE": 850, "CORN": 850, "SUNFLOWER": 1380, "SOYBEAN": 1550,
  "POTATO": 410, "SUGARBEET": 350, "BEETROOT": 420, "PARSNIP": 460,
  "SPINACH": 620, "CARROT": 450, "COTTON": 2450, "SORGHUM": 920,
  "GREENBEAN": 890, "PEA": 780, "GRASS": 120, "MILK": 620,
  "HONEY": 1950, "WOOL": 1820, "WOODCHIPS": 240
};

const LBS_CONVERSION_FACTOR = 1.76374;
const MONTH_NAMES = [
  "Early Spring (March)", "Mid Spring (April)", "Late Spring (May)",
  "Early Summer (June)", "Mid Summer (July)", "Late Summer (August)",
  "Early Autumn (September)", "Mid Autumn (October)", "Late Autumn (November)",
  "Early Winter (December)", "Mid Winter (January)", "Late Winter (February)"
];

let activeServerMods = new Set();
let parsedModCatalog = [];

// Image Sanitizer supporting Google Drive & GitHub Raw CDN links
function sanitizeImageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return "";
  let cleanUrl = urlStr.trim().replace(/^["']|["']$/g, '');
  if (cleanUrl.includes("drive.google.com")) {
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  if (cleanUrl.includes("raw.githubusercontent.com")) {
    cleanUrl = cleanUrl.replace("https://raw.githubusercontent.com/", "https://raw.githack.com/");
  }
  return cleanUrl;
}

// Deep Object Property Extractor for nested XML Firebase objects
function getFirebasePayloadDeep(rootObj, targetKey, maxDepth = 10) {
  if (!rootObj || typeof rootObj !== 'object' || maxDepth <= 0) return null;
  
  if (rootObj[targetKey] !== undefined) {
    if (typeof rootObj[targetKey] === 'string' || typeof rootObj[targetKey] === 'number') return rootObj[targetKey];
    if (rootObj[targetKey] && rootObj[targetKey].data) return rootObj[targetKey].data;
  }
  
  const xmlKey = `${targetKey}_xml`;
  if (rootObj[xmlKey] !== undefined) {
    if (typeof rootObj[xmlKey] === 'string') return rootObj[xmlKey];
    if (rootObj[xmlKey] && rootObj[xmlKey].data) return rootObj[xmlKey].data;
  }

  const rawKey = `${targetKey}_raw`;
  if (rootObj[rawKey] !== undefined) {
    if (typeof rootObj[rawKey] === 'string') return rootObj[rawKey];
  }

  for (const k of Object.keys(rootObj)) {
    if (typeof rootObj[k] === 'object' && rootObj[k] !== null) {
      const deepResult = getFirebasePayloadDeep(rootObj[k], targetKey, maxDepth - 1);
      if (deepResult !== null) return deepResult;
    }
  }

  return null;
}

function parseXML(inputPayload) {
  if (!inputPayload) return null;
  let rawText = typeof inputPayload === 'string' ? inputPayload : (inputPayload.data || inputPayload.content || inputPayload.xml || "");
  if (!rawText || typeof rawText !== 'string') return null;
  
  try {
    let sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    if (sanitizedXml.includes(".vue-modal-resizer")) {
      sanitizedXml = sanitizedXml.split(".vue-modal-resizer")[0];
    }
    const xmlStartIndex = sanitizedXml.indexOf("<");
    if (xmlStartIndex > 0) sanitizedXml = sanitizedXml.substring(xmlStartIndex);

    const xmlDoc = (new DOMParser()).parseFromString(sanitizedXml.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function getXmlVal(node, keyName, defaultVal = "") {
  if (!node) return defaultVal;
  try {
    if (node.getAttribute && node.getAttribute(keyName) !== null) {
      return node.getAttribute(keyName);
    }
    const childNode = node.querySelector(keyName);
    if (childNode && childNode.textContent !== null && childNode.textContent !== undefined) {
      return childNode.textContent.trim();
    }
  } catch (e) {}
  return defaultVal;
}

function formatName(str) {
  if (!str) return 'General Item';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('data_', '').replace('FS25_', '').replace('VEHICLE_', '');
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-zA-Z])(\d+)/g, '$1 $2').replace(/_/g, ' ');
  return clean.toUpperCase().trim();
}

function getThumbnailHTML(key, fallbackIcon = "fa-box") {
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  let lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();
  if (lookupKey === "MAIZE") lookupKey = "CORN";

  if (IMAGE_ASSETS[lookupKey]) {
    return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
  }
  
  for (const [assetName, path] of Object.entries(IMAGE_ASSETS)) {
    if (lookupKey.includes(assetName) || assetName.includes(lookupKey)) {
      return `<div class="item-icon-box"><img src="${path}" alt="${assetName}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }
  }

  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"'; i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Clean Mod Hub Catalog Parser (Mapped to Column K for Clean Categories)
async function loadModHubCatalog() {
  const grid = document.getElementById("mod-hub-grid");
  const categoriesBar = document.getElementById("mod-categories-bar");
  if (!grid) return;

  try {
    const response = await fetch(CSV_MODS_URL);
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);
    const csvText = await response.text();

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    parsedModCatalog = [];
    const categoriesSet = new Set(["ALL MODS"]);

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);

      if (cols.length >= 2) {
        let rawName = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : "";
        let rawImg = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : "";
        let rawUrl = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : "#";
        let rawDesc = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : "No description provided.";
        let rawCrossplay = cols[4] ? cols[4].replace(/^"|"$/g, '').trim() : "No";
        let rawAuthor = cols[7] ? cols[7].replace(/^"|"$/g, '').trim() : "Community Modder";
        let rawSize = cols[8] ? cols[8].replace(/^"|"$/g, '').trim() : "N/A";
        let rawFilename = cols[9] ? cols[9].replace(/^"|"$/g, '').trim() : "";
        
        // Read Column K (Index 10) for Clean Short Category Names
        let cleanCategory = cols[10] ? cols[10].replace(/^"|"$/g, '').trim().toUpperCase() : (cols[6] ? cols[6].replace(/^"|"$/g, '').trim().toUpperCase() : "GENERAL");
        
        if (cleanCategory.length > 30 || cleanCategory.includes("TRANSPORTATION")) {
          cleanCategory = "GENERAL MODS";
        }

        if (!rawName) continue;

        const finalImgUrl = sanitizeImageUrl(rawImg);

        const mod = {
          name: rawName,
          image: finalImgUrl,
          url: rawUrl,
          description: rawDesc,
          crossplay: rawCrossplay,
          category: cleanCategory,
          author: rawAuthor,
          size: rawSize,
          filename: rawFilename
        };

        parsedModCatalog.push(mod);
        categoriesSet.add(cleanCategory);
      }
    }

    if (categoriesBar) {
      let filterHtml = "";
      categoriesSet.forEach(cat => {
        filterHtml += `<button type="button" class="category-filter-btn ${cat === 'ALL MODS' ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
      });
      categoriesBar.innerHTML = filterHtml;
    }

    renderModCards("ALL MODS");

  } catch (e) {
    grid.innerHTML = `<div class="item-card"><div class="item-title"><i class="fa-solid fa-cube"></i> Mod Directory Syncing Offline</div></div>`;
  }
}

function renderModCards(categoryFilter = "ALL MODS") {
  const grid = document.getElementById("mod-hub-grid");
  if (!grid) return;

  let html = "";
  parsedModCatalog.forEach(mod => {
    const isCatMatch = (categoryFilter === "ALL MODS") || (mod.category === categoryFilter);
    if (!isCatMatch) return;

    const isActiveOnServer = activeServerMods.has(mod.filename) || activeServerMods.has(mod.filename.replace('.zip', ''));
    const statusBadge = isActiveOnServer 
      ? `<span class="badge-stat badge-good"><i class="fa-solid fa-check-circle"></i> ACTIVE ON SERVER</span>` 
      : `<span class="badge-stat"><i class="fa-solid fa-download"></i> AVAILABLE MOD</span>`;
    
    const crossplayBadge = (mod.crossplay && mod.crossplay.toLowerCase() === 'yes') 
      ? `<span class="badge-stat badge-sky"><i class="fa-solid fa-gamepad"></i> CROSSPLAY</span>` 
      : '';

    const imgElement = mod.image 
      ? `<img src="${mod.image}" alt="${mod.name}" class="mod-card-thumb lightbox-trigger" data-title="${mod.name}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}" data-author="${mod.author}" data-size="${mod.size}" onerror="this.parentNode.innerHTML='<div class=\\'mod-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);border:1px solid var(--border-subtle);\\'><i class=\\'fa-solid fa-cube fa-xl\\' style=\\'color:var(--accent-gold);\\'></i></div>';">` 
      : `<div class="mod-card-thumb" style="display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);border:1px solid var(--border-subtle);"><i class="fa-solid fa-cube fa-xl" style="color:var(--accent-gold);"></i></div>`;

    html += `
      <div class="mod-card" style="background:rgba(30, 28, 28, 0.92); border:1px solid var(--border-subtle); border-radius:10px; padding:1rem; display:flex; flex-direction:column; justify-content:space-between; gap:0.75rem;">
        <div>
          <div class="mod-card-top" style="display:flex; gap:0.75rem; align-items:flex-start;">
            ${imgElement}
            <div class="mod-card-info" style="flex-grow:1; overflow:hidden;">
              <h3 style="font-size:0.95rem; font-weight:700; color:var(--accent-gold); margin-bottom:4px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${mod.name}</h3>
              <div class="mono" style="display:flex; flex-wrap:wrap; gap:4px;">${statusBadge} ${crossplayBadge}</div>
            </div>
          </div>
        </div>
        <div class="mod-card-footer" style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:0.5rem; margin-top:0.5rem;">
          <div class="mono" style="font-size:0.75rem; color:var(--text-muted);">
            <span><i class="fa-solid fa-user"></i> ${mod.author}</span>
          </div>
          <button type="button" class="nav-btn open-mod-lightbox" style="padding:4px 10px; font-size:0.75rem; min-height:32px;" data-title="${mod.name}" data-img="${mod.image}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}" data-author="${mod.author}" data-size="${mod.size}" data-crossplay="${mod.crossplay}" data-active="${isActiveOnServer ? 'Yes' : 'No'}">
            Read More <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>`;
  });

  grid.innerHTML = html || `<div class="loading-state">No mods found in this category.</div>`;
}

// Master Telemetry Render Engine
window.renderDashboard = function(data) {
  if (!data) return;

  // 1. Resolve Active Savegame Slot
  let rawSlot = getFirebasePayloadDeep(data, "activeSaveSlot") || data.activeSaveSlot || "1";
  let slotNum = String(rawSlot).replace(/[^0-9]/g, '') || "1";
  let activeSlotKey = `savegame${slotNum}`;
  
  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">${activeSlotKey}</strong>`;
  }

  const slotData = data[activeSlotKey] || data;

  // 2. Server Banner Details
  const careerRaw = getFirebasePayloadDeep(slotData, "careerSavegame") || getFirebasePayloadDeep(data, "careerSavegame");
  const envRaw = getFirebasePayloadDeep(slotData, "environment") || getFirebasePayloadDeep(data, "environment");
  const statsRaw = getFirebasePayloadDeep(slotData, "stats") || getFirebasePayloadDeep(data, "dedicatedServerConfig");

  const careerXml = parseXML(careerRaw);
  const envXml = parseXML(envRaw);
  const statsXml = parseXML(statsRaw);

  const settingsNode = careerXml ? careerXml.querySelector("settings") : null;
  if (settingsNode || statsXml) {
    const targetNode = settingsNode || (statsXml ? statsXml.querySelector("Server") : null);

    const serverName = getXmlVal(targetNode, "savegameName", getXmlVal(targetNode, "name", "OneLIVIDMAN and werewolf 618"));
    const mapName = getXmlVal(targetNode, "mapTitle", getXmlVal(targetNode, "mapName", "Calm Lands"));
    const timeScale = parseFloat(getXmlVal(targetNode, "timeScale", "0.5"));
    const traffic = getXmlVal(targetNode, "trafficEnabled", "false");

    const serverNameEl = document.getElementById('server-name');
    if (serverNameEl) serverNameEl.textContent = serverName;

    const serverMapEl = document.getElementById('server-map');
    if (serverMapEl) serverMapEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;

    const speedBadgeEl = document.getElementById('time-speed-badge');
    if (speedBadgeEl) speedBadgeEl.innerHTML = `<i class="fa-solid fa-forward-fast"></i> Speed: ${isNaN(timeScale) ? '0.5x' : timeScale + 'x'}`;

    const trafficBadgeEl = document.getElementById('traffic-badge');
    if (trafficBadgeEl) trafficBadgeEl.innerHTML = `<i class="fa-solid fa-car"></i> Traffic: ${traffic === 'true' ? 'ON' : 'OFF'}`;

    if (envXml) {
      const rawMonth = envXml.querySelector("currentMonth")?.textContent || "7";
      const monthIdx = parseInt(rawMonth) || 7;
      const monthEl = document.getElementById('server-month');
      if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${MONTH_NAMES[monthIdx - 1]}`;
    }

    const playerBadge = document.getElementById('server-players');
    if (playerBadge) {
      const numUsed = getXmlVal(data, "activePlayers", "0");
      playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/6`;
    }
  }

  // 3. Mod Hub Active State Sync
  activeServerMods.clear();
  if (careerXml) {
    careerXml.querySelectorAll("mod").forEach(m => {
      const name = m.getAttribute("modName") || m.getAttribute("filename");
      if (name) activeServerMods.add(name.replace('.zip', ''));
    });
  }

  // 4. Server Farms
  const farmsRaw = getFirebasePayloadDeep(slotData, "farms") || getFirebasePayloadDeep(data, "farms");
  const farmsXml = parseXML(farmsRaw);
  const farmsCont = document.getElementById('farms-container');

  let globalNetWorth = 0;
  if (farmsCont && farmsXml) {
    let farmsHtml = "";
    farmsXml.querySelectorAll("farm").forEach(farm => {
      const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
      let farmName = farm.getAttribute("name") || `Farm #${farmId}`;
      const money = Math.round(parseFloat(farm.getAttribute("money") || "0"));
      const loan = Math.round(parseFloat(farm.getAttribute("loan") || "0"));
      const farmColor = getFarmColor(farmId);

      globalNetWorth += money;

      if (farmId && farmId !== "0") {
        farmsHtml += `
          <div class="item-card" style="border-left: 4px solid ${farmColor};">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <div class="item-left">
                ${getThumbnailHTML("WHEAT", "fa-wheat-field")}
                <div>
                  <div class="item-title" style="color:${farmColor};">${farmName.toUpperCase()} (ID: ${farmId})</div>
                  <div class="mono" style="margin-top:2px;">
                    <span class="badge-stat badge-warning">Loan: $${loan.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div class="farm-money" style="color:${farmColor};">$${money.toLocaleString()}</div>
            </div>
          </div>`;
      }
    });
    if (farmsHtml) farmsCont.innerHTML = farmsHtml;
  }

  const globalWorthEl = document.getElementById('global-net-worth');
  if (globalWorthEl) globalWorthEl.textContent = `$${Math.round(globalNetWorth).toLocaleString()}`;

  // 5. MISSIONS & CONTRACTS ENGINE (Reads /fs25/missions_xml)
  const missionsRaw = getFirebasePayloadDeep(slotData, "missions") || getFirebasePayloadDeep(data, "missions");
  const missionsXml = parseXML(missionsRaw);
  const contractsCont = document.getElementById('contracts-container');

  if (contractsCont) {
    let contractsHtml = "";
    if (missionsXml) {
      missionsXml.querySelectorAll("mission, contract").forEach(m => {
        const type = m.getAttribute("type") || "FIELD WORK";
        const reward = Math.round(parseFloat(m.getAttribute("reward") || "0"));
        const status = m.getAttribute("status") || "Active";
        const fieldId = m.getAttribute("fieldId") || m.getAttribute("field") || "1";

        contractsHtml += `
          <div class="item-card" style="border-left: 4px solid #38bdf8;">
            <div class="item-left">
              ${getThumbnailHTML("WHEAT", "fa-file-contract")}
              <div>
                <div class="item-title">${type.toUpperCase()} - FIELD #${fieldId}</div>
                <div class="mono"><span class="badge-stat badge-good">Reward: $${reward.toLocaleString()}</span></div>
              </div>
            </div>
            <div class="farm-money" style="color:#38bdf8;">${status.toUpperCase()}</div>
          </div>`;
      });
    }

    if (contractsHtml) {
      contractsCont.innerHTML = contractsHtml;
    } else {
      contractsCont.innerHTML = `<div class="item-card"><div class="item-title">No Active Server Contracts Running</div></div>`;
    }
  }

  // 6. ANIMAL HUSBANDRY ENGINE
  const placeablesRaw = getFirebasePayloadDeep(slotData, "placeables") || getFirebasePayloadDeep(data, "placeables");
  const placeXml = parseXML(placeablesRaw);
  const animalCont = document.getElementById('animal-husbandry-container');

  if (animalCont) {
    let animalHtml = "";
    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const filename = p.getAttribute("filename") || "";
        if (filename.toLowerCase().includes("husbandry") || filename.toLowerCase().includes("barn") || filename.toLowerCase().includes("pen")) {
          const name = formatName(filename);
          animalHtml += `
            <div class="item-card" style="border-left: 4px solid #22c55e;">
              <div class="item-left">
                ${getThumbnailHTML("COW", "fa-paw")}
                <div>
                  <div class="item-title">${name}</div>
                  <div class="mono"><span class="badge-stat badge-good">Default Pen Active</span></div>
                </div>
              </div>
            </div>`;
        }
      });
    }

    if (animalHtml) {
      animalCont.innerHTML = animalHtml;
    } else {
      animalCont.innerHTML = `<div class="item-card"><div class="item-title">Map Default Pens Active (No Custom Livestock Facilities Placed)</div></div>`;
    }
  }

  renderModCards("ALL MODS");
};

async function startRealtimeDatabaseListener() {
  try {
    const res = await fetch(`${FIREBASE_RTDB_FS25_URL}?t=` + Date.now());
    if (!res.ok) return;
    const fs25Data = await res.json();
    if (fs25Data && typeof window.renderDashboard === 'function') {
      window.lastFirebaseData = fs25Data;
      window.renderDashboard(fs25Data);
    }
  } catch (err) {
    console.warn("[FS25 RTDB Listener Error]", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadModHubCatalog();
  startRealtimeDatabaseListener();
  setInterval(startRealtimeDatabaseListener, 15000);
});
