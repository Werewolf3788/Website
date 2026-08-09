/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 09, 2026, 17:30:00 (EDT - New York) [24hr Format]
   Project: entertainment-71888 (/fs25 & /FS25_Mods_Info RTDB Nodes)
   Description: Complete Realtime Telemetry Dashboard & Universal Dynamic Engine.
                Pulls, parses, and maps all raw XML & structured JSON nodes from
                Firebase Realtime Database.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Google Tag Manager / GA4 Dynamic Injection (G-CTYHDF4MSD)
   -------------------------------------------------------------------------- */
(function injectGA4() {
  if (!document.getElementById('ga4-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga4-gtag-script';
    script.async = true;
    // Dynamic protocol matching for HTTP & HTTPS compatibility
    script.src = `${window.location.protocol}//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-CTYHDF4MSD', {
      'send_page_view': true,
      'anonymize_ip': false
    });
  }
})();

// Base Raw URL for GitHub Repository Images (Works on http & https seamlessly)
const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";

// External Google Sheets CSV Backup Endpoint
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Color Palette Mapping for Server Farms
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
let firebaseImageMappings = {};

/* ==========================================================================
   SECTION 1: Universal Image Resolver & Parsing Utilities
   ========================================================================== */

function resolveItemImage(rawFilename) {
  if (!rawFilename) return null;

  const rawString = String(rawFilename).trim();
  const displayTitle = formatName(rawString);
  const cleanDisplayKey = sanitizeKey(displayTitle);
  const baseFileName = rawString.split('/').pop().replace('.xml', '').replace('.zip', '');
  const cleanFileNameKey = sanitizeKey(baseFileName);
  const cleanRawKey = sanitizeKey(rawString);

  let targetFilename = "";

  // 1. Primary Lookup: Search Firebase /FS25_Mods_Info/Images node
  if (firebaseImageMappings && Object.keys(firebaseImageMappings).length > 0) {
    const matchedRecord = 
      firebaseImageMappings[cleanFileNameKey] ||
      firebaseImageMappings[cleanDisplayKey] ||
      firebaseImageMappings[cleanRawKey] ||
      firebaseImageMappings[rawString];

    if (matchedRecord) {
      targetFilename = matchedRecord.filename || matchedRecord.image || matchedRecord.file_name || matchedRecord.url || matchedRecord.imageurl || "";
    } else {
      const allKeys = Object.keys(firebaseImageMappings);
      const matchedKey = allKeys.find(k => 
        k.includes(cleanFileNameKey) || 
        cleanFileNameKey.includes(k) ||
        k.includes(cleanDisplayKey) ||
        cleanDisplayKey.includes(k)
      );

      if (matchedKey) {
        const record = firebaseImageMappings[matchedKey];
        targetFilename = record.filename || record.image || record.file_name || record.url || record.imageurl || "";
      }
    }
  }

  if (!targetFilename && (rawString.endsWith('.jpg') || rawString.endsWith('.JPG') || rawString.endsWith('.png'))) {
    targetFilename = rawString.split('/').pop();
  }

  if (targetFilename) {
    if (isValidImageUrl(targetFilename)) return targetFilename;
    return `${REPO_IMAGES_BASE}${encodeURIComponent(targetFilename)}`;
  }

  return null;
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

function sanitizeKey(str) {
  if (!str) return "";
  return String(str).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim();
  if (cleanUrl.includes(' ') || cleanUrl.length > 300) return false;
  return cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('//') || cleanUrl.startsWith('./');
}

/* ==========================================================================
   SECTION 2: Backup Mod Catalog Loader (Google Sheets CSV)
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
   SECTION 3: Firebase Card Grid Renderer (/FS25_Mods_Info/Website)
   ========================================================================== */

function renderModGrid(modsData) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  let modList = [];

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
    const name = mod.name_a || mod.name || mod.title || 'Unnamed Mod';
    const category = mod.category_g || mod.category_k || mod.category || mod.mod_type_f || 'General';
    const desc = mod.description_d || mod.description || '';
    const author = mod.author_h || mod.author || 'Community Modder';
    const link = mod.url_w_utm_c || mod.link || mod.url || mod.url_c || '#';
    const filename = mod.filename_j || mod.filename || '';
    const size = mod.size_i || mod.size || '';
    const crossplay = mod.crossplay_e || mod.crossplay || 'Yes';
    const rawImg = mod.image_b || mod.image || '';

    const repoMatchedImg = resolveItemImage(filename || name);
    const finalImg = isValidImageUrl(rawImg) ? rawImg : repoMatchedImg;

    // ALT text present strictly for lightbox modal
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
   SECTION 4: Master Telemetry Dashboard Engine (/fs25 Database Node)
   ========================================================================== */

window.renderDashboard = function(data) {
  if (!data) return;

  // 1. Ingest Image Mappings Node (/FS25_Mods_Info/Images)
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Images) {
    firebaseImageMappings = data.FS25_Mods_Info.Images;
  }

  // 2. Ingest Website Mod Catalog Node (/FS25_Mods_Info/Website)
  if (data.FS25_Mods_Info) {
    const websiteMods = data.FS25_Mods_Info.Website || data.FS25_Mods_Info;
    window.activeFirebaseModData = Object.values(websiteMods);
    window.hasRenderedFirebaseMods = true;
    renderModGrid(window.activeFirebaseModData);
  }

  const rootData = data.fs25 || data || {};

  // Active Save Slot Node
  let rawSlot = rootData.activeSaveSlot || "1";
  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${rawSlot}</strong>`;
  }

  // Parse Raw XML Nodes
  const careerXml = parseXML(rootData.careerSavegame_raw);
  const farmsXml = parseXML(rootData.farms_raw);
  const vehXml = parseXML(rootData.vehicles_raw);
  const toolsXml = parseXML(rootData.handTools_raw);
  const farmlandXml = parseXML(rootData.farmland_raw);
  const placeXml = parseXML(rootData.placeables_raw);
  const envXml = parseXML(rootData.environment_raw);

  // Server Header & Weather Telemetry Mapping
  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setElem('server-name', settings.getAttribute("savegameName") || "OneLIVIDMAN and werewolf3788");
      setElem('server-map', `Map: ${settings.getAttribute("mapTitle") || "Calm Lands"}`);
      setElem('time-speed-badge', `Speed: ${settings.getAttribute("timeScale") || "1"}x`);
      setElem('traffic-badge', `Traffic: ${settings.getAttribute("trafficEnabled") === 'true' ? 'ON' : 'OFF'}`);
    }
  }

  // Environment Telemetry Node Injection
  if (envXml) {
    const weather = envXml.querySelector("weather");
    if (weather) {
      const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setElem('weather-badge', `Weather: ${weather.getAttribute("currentWeather") || "Clear"}`);
    }
  }

  // Tactical Log Mapping (modErrors, serverLog_raw, serverEvents)
  renderTacticalLog(rootData.modErrors, rootData.serverEvents, rootData.serverLog_raw);

  // Farms Telemetry Node Mapping
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

  // Process Detailed Fleet JSON Node combined with Raw XML Vehicles
  let vehicleCount = 0;
  const tracCont = document.getElementById('tractors-container');
  const harvCont = document.getElementById('harvesters-container');
  const trailCont = document.getElementById('trailers-container');
  const implCont = document.getElementById('implements-container');

  let tractors = "", harvesters = "", trailers = "", implements = "";

  // 1. Process structured JSON Node: detailedFleet
  if (rootData.detailedFleet) {
    const fleetList = Object.values(rootData.detailedFleet);
    fleetList.forEach(v => {
      vehicleCount++;
      const rawName = v.name || v.id || "Vehicle";
      const name = formatName(rawName);
      const farmId = v.farmId || "0";
      const color = getFarmColor(farmId);
      const isOccupied = v.isOccupied ? `<span class="badge" style="background:#22c55e;">In Use</span>` : '';
      const posX = v.position && v.position.x ? Math.round(v.position.x) : null;
      const posZ = v.position && v.position.z ? Math.round(v.position.z) : null;
      const coords = (posX !== null && posZ !== null) ? `<span class="card-subtext">Pos: (${posX}, ${posZ})</span>` : '';

      const matchedImg = resolveItemImage(rawName);
      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-tractor card-icon" style="color:${color};"></i>`;

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color};">
          ${imgHtml}
          <div class="card-details">
            <strong style="color:${color};">${name} ${isOccupied}</strong>
            <span>Owner: Farm #${farmId}</span>
            ${coords}
          </div>
        </div>`;

      if (name.includes("HARVESTER") || name.includes("COMBINE")) harvesters += card;
      else if (name.includes("TRAILER") || name.includes("WAGON") || name.includes("TIPPER")) trailers += card;
      else if (name.includes("TRACTOR") || name.includes("TRUCK") || name.includes("RIG")) tractors += card;
      else implements += card;
    });
  }

  // 2. Process Raw XML Vehicles fallback
  if (vehXml && (!rootData.detailedFleet || Object.keys(rootData.detailedFleet).length === 0)) {
    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      vehicleCount++;
      const rawName = v.getAttribute("filename") || v.getAttribute("name") || "";
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
  }

  if (tracCont) tracCont.innerHTML = tractors || `<div class="empty-state">No Active Tractors Logged</div>`;
  if (harvCont) harvCont.innerHTML = harvesters || `<div class="empty-state">No Active Harvesters Logged</div>`;
  if (trailCont) trailCont.innerHTML = trailers || `<div class="empty-state">No Active Trailers Logged</div>`;
  if (implCont) implCont.innerHTML = implements || `<div class="empty-state">No Active Implements Logged</div>`;

  const fleetEl = document.getElementById('global-vehicle-count');
  if (fleetEl) fleetEl.textContent = vehicleCount;

  // Hand Tools Mapping Node
  const toolsCont = document.getElementById('handtools-container');
  if (toolsCont) {
    let toolsHtml = "";
    if (toolsXml) {
      toolsXml.querySelectorAll("handTool").forEach(t => {
        const rawName = t.getAttribute("filename") || "Tool";
        const name = formatName(rawName);
        const matchedImg = resolveItemImage(rawName);

        const imgHtml = matchedImg 
          ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
          : `<i class="fa-solid fa-toolbox card-icon"></i>`;

        toolsHtml += `
          <div class="telemetry-card">
            ${imgHtml}
            <div class="card-details"><strong>${name}</strong></div>
          </div>`;
      });
    }
    toolsCont.innerHTML = toolsHtml || `<div class="empty-state">No Hand Tools Stored</div>`;
  }

  // Field Agronomy Mapping (Combines structured JSON /fieldAgronomy and /farmland_raw XML)
  let fieldCount = 0;
  const fieldsCont = document.getElementById('fields-container');
  if (fieldsCont) {
    let fieldsHtml = "";

    if (rootData.fieldAgronomy) {
      const fieldList = Object.values(rootData.fieldAgronomy);
      fieldList.forEach(f => {
        fieldCount++;
        const id = f.id !== undefined ? f.id : fieldCount;
        const farmId = f.farmId || "0";
        const color = getFarmColor(farmId);
        const acres = f.areaAcres ? `${f.areaAcres} Acres` : '';
        const fert = f.fertilizerLevel !== undefined ? `Fertilizer: ${f.fertilizerLevel}%` : '';
        const lime = f.limeRequired ? `<span class="badge" style="background:#ef4444;">Lime Needed</span>` : '';
        const plow = f.plowRequired ? `<span class="badge" style="background:#f97316;">Plow Needed</span>` : '';

        fieldsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color};">
            <i class="fa-solid fa-seedling card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">Field #${id} ${acres ? `(${acres})` : ''}</strong>
              <span>Owner: ${farmId === '0' ? 'Public / Unowned' : 'Farm #' + farmId}</span>
              ${fert ? `<span class="card-subtext">${fert}</span>` : ''}
              <div>${lime} ${plow}</div>
            </div>
          </div>`;
      });
    } else if (farmlandXml) {
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

  // Render Factory & Production Node
  renderProductions(placeXml);
};

function renderTacticalLog(modErrors, serverEvents, rawServerLog) {
  const container = document.getElementById('tactical-log-container');
  const errorCountEl = document.getElementById('global-mod-errors');
  if (!container) return;

  const errors = Array.isArray(modErrors) ? modErrors : [];
  const events = Array.isArray(serverEvents) ? serverEvents : [];

  if (errorCountEl) errorCountEl.textContent = errors.length;

  if (errors.length === 0 && events.length === 0 && !rawServerLog) {
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
   SECTION 5: Event Listeners & Lightbox Setup
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Lightbox Modal Controls (ALT image description only displays in lightbox mode)
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

  // Load Google Sheets CSV Catalog as secondary backup
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
