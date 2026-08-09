/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 09, 2026, 06:45 AM (EDT - New York)
   Project: entertainment-71888 (/fs25 & /FS25_Mods_Info RTDB Nodes)
   Description: Tactical Telemetry Dashboard & Mod Directory Engine.
                Matches XML/JSON payloads with GitHub repository image assets
                and parses Firebase /FS25_Mods_Info row structures.
   ========================================================================== */

// Base Raw URL for GitHub Repository Images
const REPO_IMAGES_BASE = "https://raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";

// External Google Sheets CSV Backup Endpoint
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Farm Color Palette by Farm ID
const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public", color: "#facc15" },
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

let parsedModCatalog = [];

/* ==========================================================================
   SECTION 1: GitHub Repository Image Resolution Engine
   Matches equipment, crops, and map items with exact GitHub filenames
   ========================================================================== */

function resolveItemImage(rawFilename) {
  if (!rawFilename) return null;
  const name = formatName(rawFilename).toLowerCase();
  
  let exactFileName = "";

  // Exact Match Mapping against GitHub Repo Filenames
  if (name.includes('calm') || name.includes('lands')) exactFileName = "CalmLands.JPG";
  else if (name.includes('st. lawrence') || name.includes('st lawrence')) exactFileName = "St. Lawrence (Map).JPG";
  else if (name.includes('wheat') && name.includes('swath')) exactFileName = "Wheat Swath.JPG";
  else if (name.includes('wheat')) exactFileName = "Wheat.JPG";
  else if (name.includes('barley') && name.includes('swath')) exactFileName = "Barley Swath.JPG";
  else if (name.includes('barley')) exactFileName = "Barley.JPG";
  else if (name.includes('canola') && name.includes('swath')) exactFileName = "Canola Swath.JPG";
  else if (name.includes('canola') && name.includes('oil')) exactFileName = "Canola Oil.JPG";
  else if (name.includes('canola')) exactFileName = "Canola.JPG";
  else if (name.includes('corn') || name.includes('maize')) exactFileName = "Corn.JPG";
  else if (name.includes('oat') && name.includes('swath')) exactFileName = "Oat Swath.JPG";
  else if (name.includes('oat')) exactFileName = "Oats.JPG";
  else if (name.includes('sorghum') && name.includes('swath')) exactFileName = "Sorghum Swath.JPG";
  else if (name.includes('sorghum')) exactFileName = "Sorghum.JPG";
  else if (name.includes('soybean') && name.includes('swath')) exactFileName = "Soybean Swath.JPG";
  else if (name.includes('soybean')) exactFileName = "Soybeans.JPG";
  else if (name.includes('sunflower') && name.includes('oil')) exactFileName = "Sunflower Oil.JPG";
  else if (name.includes('sunflower')) exactFileName = "Sunflowers.JPG";
  else if (name.includes('cotton') && name.includes('round')) exactFileName = "Cotton Round Bale.JPG";
  else if (name.includes('cotton') && name.includes('square')) exactFileName = "Cotton Square Bale.JPG";
  else if (name.includes('cotton')) exactFileName = "Cotton.JPG";
  else if (name.includes('rice') && name.includes('long')) exactFileName = "Long Grain Rice.JPG";
  else if (name.includes('rice') && name.includes('sapling')) exactFileName = "Rice Saplings.JPG";
  else if (name.includes('rice') && name.includes('oil')) exactFileName = "Rice Oil.JPG";
  else if (name.includes('rice')) exactFileName = "Rice.JPG";
  else if (name.includes('grape') && name.includes('juice')) exactFileName = "Grape Juice.JPG";
  else if (name.includes('grape')) exactFileName = "Grapes.JPG";
  else if (name.includes('olive') && name.includes('oil')) exactFileName = "Olive Oil.JPG";
  else if (name.includes('potato') && name.includes('chip')) exactFileName = "Potato Chips.JPG";
  else if (name.includes('potato')) exactFileName = "Potatoes.JPG";
  else if (name.includes('sugarbeet') && name.includes('cut')) exactFileName = "Sugar Beet Cut.JPG";
  else if (name.includes('sugarbeet') || name.includes('sugar beet')) exactFileName = "Sugarbeets.JPG";
  else if (name.includes('sugarcane')) exactFileName = "Sugarcane.JPG";
  else if (name.includes('green bean') || name.includes('greenbean')) exactFileName = "Green Beans.JPG";
  else if (name.includes('carrot')) exactFileName = "Carrots.JPG";
  else if (name.includes('parsnip')) exactFileName = "Parsnip.JPG";
  else if (name.includes('beetroot')) exactFileName = "Beetroot.JPG";
  else if (name.includes('red beet')) exactFileName = "Red Beet.JPG";
  else if (name.includes('spinach') && name.includes('bag')) exactFileName = "Spinach Bag.JPG";
  else if (name.includes('spinach')) exactFileName = "Spinach.JPG";
  else if (name.includes('pea')) exactFileName = "Peas.JPG";
  else if (name.includes('cabbage')) exactFileName = "Cabbage.JPG";
  else if (name.includes('spring onion')) exactFileName = "Spring Onions.JPG";
  else if (name.includes('chili')) exactFileName = "Chili Peppers.JPG";
  else if (name.includes('garlic')) exactFileName = "Garlic.JPG";
  else if (name.includes('enoki')) exactFileName = "Enoki.JPG";
  else if (name.includes('oyster')) exactFileName = "Oyster Mushroom.JPG";
  else if (name.includes('cow') || name.includes('holstein')) exactFileName = "Cow.JPG";
  else if (name.includes('pig')) exactFileName = "Pigs.JPG";
  else if (name.includes('chicken')) exactFileName = "Chickens.JPG";
  else if (name.includes('sheep')) exactFileName = "Sheep.JPG";
  else if (name.includes('goat') && name.includes('cheese')) exactFileName = "Goat Cheese.JPG";
  else if (name.includes('goat')) exactFileName = "Goats.JPG";
  else if (name.includes('horse')) exactFileName = "Horses.JPG";
  else if (name.includes('buffalo') && name.includes('mozzarella')) exactFileName = "Buffalo Mozzarella.JPG";
  else if (name.includes('buffalo')) exactFileName = "Water Buffalos.JPG";
  else if (name.includes('dog')) exactFileName = "Dogs.JPG";
  else if (name.includes('john deere')) exactFileName = "John Deere 8R Series.JPG";
  else if (name.includes('big bud')) exactFileName = "Big Bud KTTA 700.JPG";
  else if (name.includes('log trailer')) exactFileName = "Log Trailer.JPG";
  else if (name.includes('silo')) exactFileName = "Elevator Silo.JPG";
  else if (name.includes('rudolf') || name.includes('storage hall')) exactFileName = "Rudolf Hoermann Round Storage Hall.jpg";
  else if (name.includes('american midwest') || name.includes('truck shop')) exactFileName = "American Midwest Truck Shop.jpg";
  else if (name.includes('water')) exactFileName = "Water.jpg";

  // URL Encode space characters and symbols safely for web browser fetches
  return exactFileName ? `${REPO_IMAGES_BASE}${encodeURIComponent(exactFileName)}` : null;
}

function parseXML(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const xmlDoc = (new DOMParser()).parseFromString(rawText.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function formatName(str) {
  if (!str) return 'GENERAL ITEM';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('FS25_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase().trim();
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim();
  if (cleanUrl.includes(' ') || cleanUrl.length > 250) return false;
  return cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('./');
}

/* ==========================================================================
   SECTION 2: Google Sheets CSV Mod Catalog Backup Loader
   ========================================================================== */

async function fetchModCatalog() {
  const gridContainer = document.getElementById('mod-hub-grid');
  const catBar = document.getElementById('mod-categories-bar');
  if (!gridContainer) return;

  try {
    const response = await fetch(CSV_MODS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    const rows = parseCSV(csvText);
    if (rows.length <= 1) return;

    const headers = rows[0].map(h => h.trim().toLowerCase());
    parsedModCatalog = [];
    const categoriesSet = new Set(['ALL']);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;
      
      const modObj = {};
      headers.forEach((header, index) => {
        modObj[header] = row[index] ? row[index].trim() : '';
      });

      if (modObj.name || modObj.title || modObj['mod name']) {
        parsedModCatalog.push(modObj);
        const cat = modObj.category || modObj.type || 'General';
        categoriesSet.add(cat.toUpperCase());
      }
    }

    if (catBar) {
      catBar.innerHTML = Array.from(categoriesSet).map(cat => 
        `<button type="button" class="category-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterModsCategory('${cat}', this)">${cat}</button>`
      ).join('');
    }

    // Only render CSV catalog if Firebase /FS25_Mods_Info is unavailable
    if (!window.hasRenderedFirebaseMods) {
      renderModGrid(parsedModCatalog);
    }

  } catch (err) {
    console.warn("⚠️ Google Sheet CSV Backup Load Note:", err.message);
  }
}

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal);
      if (row.length > 0 && row.some(cell => cell.length > 0)) lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) { row.push(currentVal); lines.push(row); }
  return lines;
}

window.filterModsCategory = function(selectedCat, btnElem) {
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const sourceData = window.activeFirebaseModData || parsedModCatalog;

  if (selectedCat === 'ALL') {
    renderModGrid(sourceData);
  } else {
    const filtered = sourceData.filter(m => {
      const cat = m.category_g || m.category_k || m.category || m.type || 'General';
      return String(cat).toUpperCase() === selectedCat;
    });
    renderModGrid(filtered);
  }
};

/* ==========================================================================
   SECTION 3: Firebase /FS25_Mods_Info Specific Card Grid Renderer
   Handles row_8, row_9, row_X schema keys (name_a, filename_j, etc.)
   ========================================================================== */

function renderModGrid(modsData) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  let modList = [];

  // Convert Firebase Object Schema (e.g. { row_8: {...}, row_9: {...} }) into Array
  if (Array.isArray(modsData)) {
    modList = modsData;
  } else if (modsData && typeof modsData === 'object') {
    modList = Object.values(modsData);
  }

  if (modList.length === 0) {
    gridContainer.innerHTML = `<div class="empty-state">No matching mods found in database.</div>`;
    return;
  }

  gridContainer.innerHTML = modList.map(mod => {
    // Exact schema parsing matching your /FS25_Mods_Info node structure
    const name = mod.name_a || mod.name || mod.title || 'Unnamed Mod';
    const category = mod.category_g || mod.category_k || mod.category || mod.mod_type_f || 'General';
    const desc = mod.description_d || mod.description || '';
    const author = mod.author_h || mod.author || 'Community Modder';
    const link = mod.url_w_utm_c || mod.link || mod.url || '#';
    const filename = mod.filename_j || mod.filename || '';
    const size = mod.size_i || mod.size || '';
    const crossplay = mod.crossplay_e || 'Yes';
    const rawImg = mod.image_b || mod.image || '';

    // Match image against GitHub repo or fallback to cube icon
    const repoMatchedImg = resolveItemImage(filename || name);
    const finalImg = isValidImageUrl(rawImg) ? rawImg : repoMatchedImg;

    const imgHtml = finalImg
      ? `<img src="${finalImg}" data-alt="${name}" class="lightbox-trigger mod-card-thumb">`
      : `<div class="mod-card-icon-fallback"><i class="fa-solid fa-cube"></i></div>`;

    return `
      <div class="mod-card">
        ${imgHtml}
        <div class="mod-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="mod-category-tag">${category}</span>
            <span class="badge" style="font-size:0.7rem; padding:2px 6px;">${crossplay === 'Yes' ? 'Crossplay' : 'PC Only'}</span>
          </div>
          <h3 class="mod-title">${name}</h3>
          ${desc ? `<p class="mod-desc">${desc.substring(0, 140)}...</p>` : ''}
          <div class="mod-card-footer">
            <span class="mod-author"><i class="fa-solid fa-user"></i> ${author} ${size ? `(${size})` : ''}</span>
            ${link !== '#' ? `<a href="${link}" target="_blank" rel="noopener" class="mod-download-btn"><i class="fa-solid fa-download"></i> Get Mod</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================================
   SECTION 4: Master Telemetry Dashboard Renderer
   ========================================================================== */

window.renderDashboard = function(data) {
  if (!data) return;

  // Render /FS25_Mods_Info node if present in root Firebase payload
  if (data.FS25_Mods_Info) {
    window.activeFirebaseModData = Object.values(data.FS25_Mods_Info);
    window.hasRenderedFirebaseMods = true;
    renderModGrid(window.activeFirebaseModData);
  }

  const rootData = data.fs25 || data || {};

  // If modCatalogCrossplay was cross-referenced into /fs25 by pipeline
  if (!window.hasRenderedFirebaseMods && rootData.modCatalogCrossplay) {
    window.activeFirebaseModData = Object.values(rootData.modCatalogCrossplay);
    renderModGrid(window.activeFirebaseModData);
  }

  // Active Savegame Slot Display
  let rawSlot = rootData.activeSaveSlot || "1";
  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${rawSlot}</strong>`;
  }

  // Parse Raw XML String Data
  const careerXml = parseXML(rootData.careerSavegame_raw);
  const farmsXml = parseXML(rootData.farms_raw);
  const vehXml = parseXML(rootData.vehicles_raw);
  const toolsXml = parseXML(rootData.handTools_raw);
  const farmlandXml = parseXML(rootData.farmland_raw);
  const placeXml = parseXML(rootData.placeables_raw);

  // 1. Server Banner Information
  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setElem('server-name', settings.getAttribute("savegameName") || "OneLIVIDMAN and werewolf 618");
      setElem('server-map', `Map: ${settings.getAttribute("mapTitle") || "Calm Lands"}`);
      setElem('time-speed-badge', `Speed: ${settings.getAttribute("timeScale") || "1"}x`);
      setElem('traffic-badge', `Traffic: ${settings.getAttribute("trafficEnabled") === 'true' ? 'ON' : 'OFF'}`);
    }
  }

  // 2. Render Tactical Log Feed & Mod Errors
  renderTacticalLog(rootData.modErrors, rootData.serverEvents);

  // 3. Registered Server Farms & Net Balance
  let globalNetWorth = 0;
  const farmsCont = document.getElementById('farms-container');
  if (farmsCont) {
    let farmsHtml = "";
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
        if (farmId && farmId !== "0") {
          const name = farm.getAttribute("name") || `Farm #${farmId}`;
          const money = Math.round(parseFloat(farm.getAttribute("money") || "0"));
          const color = getFarmColor(farmId);
          globalNetWorth += money;

          farmsHtml += `
            <div class="telemetry-card" style="border-left: 4px solid ${color};">
              <i class="fa-solid fa-house-chimney card-icon" style="color:${color};"></i>
              <div class="card-details">
                <strong style="color:${color};">${name}</strong>
                <span>Balance: $${money.toLocaleString()}</span>
              </div>
            </div>`;
        }
      });
    }
    farmsCont.innerHTML = farmsHtml || `<div class="empty-state">No Active Server Farms Found</div>`;
  }

  const netWorthEl = document.getElementById('global-net-worth');
  if (netWorthEl) netWorthEl.textContent = `$${globalNetWorth.toLocaleString()}`;

  // 4. Vehicles Fleet Rendering with GitHub Image Resolution
  let vehicleCount = 0;
  const tracCont = document.getElementById('tractors-container');
  const harvCont = document.getElementById('harvesters-container');
  const trailCont = document.getElementById('trailers-container');
  const implCont = document.getElementById('implements-container');

  if (vehXml) {
    let tractors = "", harvesters = "", trailers = "", implements = "";

    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      vehicleCount++;
      const rawName = v.getAttribute("name") || v.getAttribute("filename") || "";
      const name = formatName(rawName);
      const farmId = v.getAttribute("farmId") || "0";
      const color = getFarmColor(farmId);
      const matchedImg = resolveItemImage(rawName);

      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-tractor card-icon" style="color:${color};"></i>`;

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color};">
          ${imgHtml}
          <div class="card-details">
            <strong style="color:${color};">${name}</strong>
            <span>Owner: Farm #${farmId}</span>
          </div>
        </div>`;

      if (name.includes("HARVESTER") || name.includes("COMBINE")) harvesters += card;
      else if (name.includes("TRAILER") || name.includes("WAGON") || name.includes("TIPPER")) trailers += card;
      else if (name.includes("TRACTOR") || name.includes("TRUCK") || name.includes("RIG")) tractors += card;
      else implements += card;
    });

    if (tracCont) tracCont.innerHTML = tractors || `<div class="empty-state">No Active Tractors Logged</div>`;
    if (harvCont) harvCont.innerHTML = harvesters || `<div class="empty-state">No Active Harvesters Logged</div>`;
    if (trailCont) trailCont.innerHTML = trailers || `<div class="empty-state">No Active Trailers Logged</div>`;
    if (implCont) implCont.innerHTML = implements || `<div class="empty-state">No Active Implements Logged</div>`;
  }

  const fleetEl = document.getElementById('global-vehicle-count');
  if (fleetEl) fleetEl.textContent = vehicleCount;

  // 5. Hand Tools
  const toolsCont = document.getElementById('handtools-container');
  if (toolsCont) {
    let toolsHtml = "";
    if (toolsXml) {
      toolsXml.querySelectorAll("handTool").forEach(t => {
        const name = formatName(t.getAttribute("filename") || "Tool");
        toolsHtml += `
          <div class="telemetry-card">
            <i class="fa-solid fa-toolbox card-icon"></i>
            <div class="card-details"><strong>${name}</strong></div>
          </div>`;
      });
    }
    toolsCont.innerHTML = toolsHtml || `<div class="empty-state">No Hand Tools Stored</div>`;
  }

  // 6. Farmland Parcels
  let fieldCount = 0;
  const fieldsCont = document.getElementById('fields-container');
  if (fieldsCont) {
    let fieldsHtml = "";
    if (farmlandXml) {
      farmlandXml.querySelectorAll("farmland, field").forEach(f => {
        fieldCount++;
        const id = f.getAttribute("id");
        const farmId = f.getAttribute("farmId") || "0";
        const color = getFarmColor(farmId);

        fieldsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color};">
            <i class="fa-solid fa-seedling card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">Field #${id}</strong>
              <span>Owner: ${farmId === '0' ? 'Public' : 'Farm #' + farmId}</span>
            </div>
          </div>`;
      });
    }
    fieldsCont.innerHTML = fieldsHtml || `<div class="empty-state">No Farmland Logged</div>`;
  }

  const landEl = document.getElementById('global-land-count');
  if (landEl) landEl.textContent = `${fieldCount} Fields`;

  // 7. Map Productions
  renderProductions(placeXml);
};

function renderTacticalLog(modErrors, serverEvents) {
  const container = document.getElementById('tactical-log-container');
  const errorCountEl = document.getElementById('global-mod-errors');
  if (!container) return;

  const errors = Array.isArray(modErrors) ? modErrors : [];
  const events = Array.isArray(serverEvents) ? serverEvents : [];

  if (errorCountEl) errorCountEl.textContent = errors.length;

  if (errors.length === 0 && events.length === 0) {
    container.innerHTML = `<div class="empty-state">No Recent Server Log Activity</div>`;
    return;
  }

  let html = "";

  errors.slice(-10).reverse().forEach(err => {
    html += `
      <div class="log-entry log-error">
        <span class="log-time">[${err.timestamp || 'DIAGNOSTIC'}]</span>
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>${err.message || 'Mod Warning Detected'}</span>
      </div>`;
  });

  events.slice(-10).reverse().forEach(ev => {
    html += `
      <div class="log-entry log-event">
        <span class="log-time">[${ev.timestamp || 'EVENT'}]</span>
        <i class="fa-solid fa-satellite-dish"></i>
        <span>${ev.message || 'Server Event Logged'}</span>
      </div>`;
  });

  container.innerHTML = html;
}

function renderProductions(placeablesDoc) {
  const prodCont = document.getElementById('main-productions-container');
  if (!prodCont) return;

  if (!placeablesDoc) {
    prodCont.innerHTML = `<div class="empty-state">No Production Buildings Active</div>`;
    return;
  }

  let prodHtml = "";
  placeablesDoc.querySelectorAll("placeable").forEach(p => {
    const rawFilename = p.getAttribute("filename") || "";
    const uniqueId = p.getAttribute("uniqueId") || "";
    const name = formatName(rawFilename);
    const farmId = p.getAttribute("farmId") || "0";
    const color = getFarmColor(farmId);
    const matchedImg = resolveItemImage(rawFilename);

    const imgHtml = matchedImg 
      ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
      : `<i class="fa-solid fa-industry card-icon" style="color:${color};"></i>`;

    prodHtml += `
      <div class="telemetry-card" style="border-left: 3px solid ${color};">
        ${imgHtml}
        <div class="card-details">
          <strong style="color:${color};">${name}</strong>
          ${uniqueId ? `<span class="card-subtext">ID: ${uniqueId.substring(0, 12)}...</span>` : ''}
        </div>
      </div>`;
  });

  prodCont.innerHTML = prodHtml || `<div class="empty-state">No Production Buildings Active</div>`;
}

/* ==========================================================================
   SECTION 5: Event Listeners & UI Controls
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Lightbox Modal Controls (Ensures ALT image description only shows inside lightbox mode)
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');

  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('lightbox-trigger')) {
      if (modal && modalImg) {
        modal.style.display = 'flex';
        modalImg.src = e.target.src;
        if (modalCaption) {
          modalCaption.textContent = e.target.getAttribute('data-alt') || e.target.alt || 'Enlarged Preview';
        }
      }
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // Mobile Navigation Hamburger Toggle
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('dynamic-menu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => navMenu.classList.toggle('open'));
  }

  // Load Google Sheets CSV Catalog as secondary fallback
  fetchModCatalog();
});

window.setServerStatus = function(isOnline) {
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  if (statusPill && statusText) {
    statusPill.className = isOnline ? 'status-pill status-online' : 'status-pill status-offline';
    statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
  }
};
