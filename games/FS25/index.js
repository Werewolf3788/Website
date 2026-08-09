/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 09, 2026, 05:35 AM (EDT - New York)
   Project: entertainment-71888 (/fs25 RTDB Node)
   Description: Unified G-Portal XML Parser Engine, Google Sheets CSV Mod Catalog,
                and Flexible HTTP/HTTPS Dual-Protocol Fallback System
   ========================================================================== */

// External Google Sheets CSV Endpoints
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Line 12: Farm Color Palette by Farm ID (Used for telemetry card borders)
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

let activeServerMods = new Set();
let parsedModCatalog = [];

/* ==========================================================================
   SECTION 1: Deep Object & Dual-Protocol (HTTP/HTTPS) XML Parsers
   ========================================================================== */

// Line 36: Extracts nested payload nodes from Firebase RTDB
function getFirebasePayloadDeep(rootObj, targetKey, maxDepth = 10) {
  if (!rootObj || typeof rootObj !== 'object' || maxDepth <= 0) return null;
  
  if (rootObj[targetKey] !== undefined) {
    if (typeof rootObj[targetKey] === 'string' || typeof rootObj[targetKey] === 'number') return rootObj[targetKey];
    if (rootObj[targetKey] && rootObj[targetKey].data) return rootObj[targetKey].data;
  }
  
  for (const k of Object.keys(rootObj)) {
    if (typeof rootObj[k] === 'object' && rootObj[k] !== null) {
      const deepResult = getFirebasePayloadDeep(rootObj[k], targetKey, maxDepth - 1);
      if (deepResult) return deepResult;
    }
  }
  return null;
}

// Line 55: Converts G-Portal raw XML text into DOM objects
function parseXML(inputPayload) {
  if (!inputPayload) return null;
  let rawText = typeof inputPayload === 'string' ? inputPayload : (inputPayload.data || inputPayload.xml || "");
  if (!rawText || typeof rawText !== 'string') return null;

  try {
    let sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    const xmlStartIndex = sanitizedXml.indexOf("<");
    if (xmlStartIndex > 0) sanitizedXml = sanitizedXml.substring(xmlStartIndex);

    const xmlDoc = (new DOMParser()).parseFromString(sanitizedXml.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

// Line 72: Fallback helper to parse XML directly from string variables
function parseFS25XmlData(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') return null;
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (err) {
    console.error("XML Parsing Error:", err);
    return null;
  }
}

function getXmlVal(node, keyName, defaultVal = "") {
  if (!node) return defaultVal;
  try {
    if (node.getAttribute && node.getAttribute(keyName) !== null) {
      return node.getAttribute(keyName);
    }
    const childNode = node.querySelector(keyName);
    if (childNode && childNode.textContent !== null) {
      return childNode.textContent.trim();
    }
  } catch (e) {}
  return defaultVal;
}

function formatName(str) {
  if (!str) return 'GENERAL ITEM';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('FS25_', '');
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return clean.toUpperCase().trim();
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim();
  if (cleanUrl.includes(' ') || cleanUrl.length > 250) return false;
  return cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('./');
}

/* ==========================================================================
   SECTION 2: Google Sheets Mod Catalog Loader & Filtering Engine
   ========================================================================== */

// Line 118: CSV Fetcher & Mod Card Renderer
async function fetchModCatalog() {
  const gridContainer = document.getElementById('mod-hub-grid');
  const catBar = document.getElementById('mod-categories-bar');
  if (!gridContainer) return;

  try {
    const response = await fetch(CSV_MODS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    const rows = parseCSV(csvText);
    if (rows.length <= 1) {
      gridContainer.innerHTML = `<div class="empty-state">No mod records found in CSV sheet.</div>`;
      return;
    }

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

    renderModGrid(parsedModCatalog);

  } catch (err) {
    console.error("❌ Google Sheet CSV Load Failed:", err);
    gridContainer.innerHTML = `<div class="empty-state" style="color:#f87171;">Failed to load Google Sheets Mod Catalog.</div>`;
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

  if (selectedCat === 'ALL') {
    renderModGrid(parsedModCatalog);
  } else {
    const filtered = parsedModCatalog.filter(m => (m.category || m.type || 'General').toUpperCase() === selectedCat);
    renderModGrid(filtered);
  }
};

function renderModGrid(mods) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  if (!mods || mods.length === 0) {
    gridContainer.innerHTML = `<div class="empty-state">No matching mods found.</div>`;
    return;
  }

  gridContainer.innerHTML = mods.map(mod => {
    const name = mod.name || mod.title || mod['mod name'] || 'Unnamed Mod';
    const category = mod.category || mod.type || 'General';
    const desc = mod.description || mod.notes || mod.details || '';
    const author = mod.author || mod.creator || 'Community Modder';
    const link = mod.link || mod.url || mod.download || '#';
    const rawImg = mod.image || mod.thumb || mod.icon || '';

    const imgHtml = isValidImageUrl(rawImg)
      ? `<img src="${rawImg}" data-alt="${name}" class="lightbox-trigger mod-card-thumb">`
      : `<div class="mod-card-icon-fallback"><i class="fa-solid fa-cube"></i></div>`;

    return `
      <div class="mod-card">
        ${imgHtml}
        <div class="mod-card-body">
          <span class="mod-category-tag">${category}</span>
          <h3 class="mod-title">${name}</h3>
          ${desc ? `<p class="mod-desc">${desc}</p>` : ''}
          <div class="mod-card-footer">
            <span class="mod-author"><i class="fa-solid fa-user"></i> ${author}</span>
            ${link !== '#' ? `<a href="${link}" target="_blank" rel="noopener" class="mod-download-btn"><i class="fa-solid fa-download"></i> Get Mod</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================================
   SECTION 3: Primary Telemetry Dashboard Renderer (Firebase & Fallback XML)
   ========================================================================== */

// Line 255: Master Render Handler triggered directly by Firebase listener
window.renderDashboard = function(data) {
  if (!data) return;

  // Handles both nested /fs25 node object and direct root RTDB structure
  const rootData = data.fs25 || data || {};

  // Resolve Active Savegame Slot
  let rawSlot = getFirebasePayloadDeep(rootData, "activeSaveSlot") || "2";
  let slotNum = String(rawSlot).replace(/[^0-9]/g, '') || "2";
  let activeSlotKey = `savegame${slotNum}`;
  let slotData = rootData[activeSlotKey] || rootData;

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">${activeSlotKey}</strong>`;
  }

  // Extract XML Payloads with deep searching + direct XML string fallback parsing
  const careerXml = parseXML(getFirebasePayloadDeep(slotData, "careerSavegame") || getFirebasePayloadDeep(rootData, "careerSavegame")) || parseFS25XmlData(rootData.careerSavegame || rootData.careerSavegame_raw);
  const farmsXml = parseXML(getFirebasePayloadDeep(slotData, "farms") || getFirebasePayloadDeep(rootData, "farms")) || parseFS25XmlData(rootData.farms || rootData.farms_raw);
  const vehXml = parseXML(getFirebasePayloadDeep(slotData, "vehicles") || getFirebasePayloadDeep(rootData, "vehicles")) || parseFS25XmlData(rootData.vehicles || rootData.vehicles_raw);
  const toolsXml = parseXML(getFirebasePayloadDeep(slotData, "handTools") || getFirebasePayloadDeep(rootData, "handTools")) || parseFS25XmlData(rootData.handTools || rootData.handTools_raw);
  const farmlandXml = parseXML(getFirebasePayloadDeep(slotData, "farmland") || getFirebasePayloadDeep(rootData, "farmland")) || parseFS25XmlData(rootData.farmland || rootData.farmland_raw);
  const placeXml = parseXML(getFirebasePayloadDeep(slotData, "placeables") || getFirebasePayloadDeep(rootData, "placeables")) || parseFS25XmlData(rootData.placeables || rootData.placeables_raw);

  // 1. Server Header Banner Information
  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setElem('server-name', getXmlVal(settings, "savegameName", "OneLIVIDMAN and werewolf 618"));
      setElem('server-map', `Map: ${getXmlVal(settings, "mapTitle", "Calm Lands")}`);
      setElem('time-speed-badge', `Speed: ${getXmlVal(settings, "timeScale", "1")}x`);
      setElem('traffic-badge', `Traffic: ${getXmlVal(settings, "trafficEnabled", "false") === 'true' ? 'ON' : 'OFF'}`);
    }
  }

  // 2. Registered Server Farms
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

  // 3. Fleet Vehicles Sorting
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

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color};">
          <i class="fa-solid fa-tractor card-icon" style="color:${color};"></i>
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

  // 4. Hand Tools
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

  // 5. Farmland Parcels
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

  // 6. Map Productions & Placeables
  renderProductions(placeXml);
};

// Line 392: Dedicated Factory & Production Card Formatter
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

    prodHtml += `
      <div class="telemetry-card" style="border-left: 3px solid ${color};">
        <i class="fa-solid fa-industry card-icon" style="color:${color};"></i>
        <div class="card-details">
          <strong style="color:${color};">${name}</strong>
          ${uniqueId ? `<span class="card-subtext">ID: ${uniqueId.substring(0, 12)}...</span>` : ''}
        </div>
      </div>`;
  });

  prodCont.innerHTML = prodHtml || `<div class="empty-state">No Production Buildings Active</div>`;
}

/* ==========================================================================
   SECTION 4: Event Listeners & UI Controls Initialization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Lightbox Modal Controls (Only trigger in lightbox mode per project setup)
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

  // Load Mod Directory Catalog from Google Sheet CSV
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
