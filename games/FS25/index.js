/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 09, 2026, 17:53:00 (EDT - New York)
   Project: entertainment-71888 (/fs25 & /FS25_Mods_Info RTDB Nodes)
   Description: Complete Realtime Tactical Telemetry & Mod Directory Engine.
                Parses raw XML strings and structured JSON nodes from Firebase.
   ========================================================================== */

// Protocol-relative GA4 Tag Injection (G-CTYHDF4MSD)
(function injectGA4() {
  try {
    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = "//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD";
      script.onerror = () => console.warn("ℹ️ GA4 blocked by client extension.");
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', 'G-CTYHDF4MSD', { 'send_page_view': true, 'anonymize_ip': false });
    }
  } catch (e) {
    console.warn("ℹ️ GA4 initialization skipped.");
  }
})();

// Base Raw URL for GitHub Repository Images (Supports http & https)
const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Server Farm Color Palette Mapping
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

function formatGameTime(rawTimeSeconds) {
  if (rawTimeSeconds === undefined || rawTimeSeconds === null) return "00:00";
  let totalMinutes = Math.floor(parseFloat(rawTimeSeconds) / 60);
  if (isNaN(totalMinutes)) return "00:00";
  let hours = Math.floor(totalMinutes / 60) % 24;
  let minutes = totalMinutes % 60;
  return `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

function formatHours(operatingSeconds) {
  if (!operatingSeconds) return "0.0 hrs";
  const hours = parseFloat(operatingSeconds) / 3600;
  return `${hours.toFixed(1)} hrs`;
}

let parsedModCatalog = [];
let firebaseImageMappings = {};

/* ==========================================================================
   SECTION 1: Universal Image Resolver Engine
   ========================================================================== */

function resolveItemImage(rawFilename) {
  if (!rawFilename) return null;

  const rawString = String(rawFilename).trim();
  const displayTitle = formatName(rawString);
  const cleanDisplayKey = sanitizeKey(displayTitle);
  const baseFileName = rawString.split('/').pop().replace('.xml', '').replace('.zip', '');
  const cleanFileNameKey = sanitizeKey(baseFileName);

  let targetFilename = "";

  if (firebaseImageMappings && Object.keys(firebaseImageMappings).length > 0) {
    const matchedRecord = 
      firebaseImageMappings[cleanFileNameKey] ||
      firebaseImageMappings[cleanDisplayKey] ||
      firebaseImageMappings[sanitizeKey(rawString)];

    if (matchedRecord) {
      targetFilename = matchedRecord.filename || matchedRecord.image || matchedRecord.file_name || matchedRecord.imageurl || "";
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
        targetFilename = record.filename || record.image || record.file_name || record.imageurl || "";
      }
    }
  }

  if (!targetFilename && (rawString.endsWith('.jpg') || rawString.endsWith('.png'))) {
    targetFilename = rawString.split('/').pop();
  }

  return targetFilename ? (isValidImageUrl(targetFilename) ? targetFilename : `${REPO_IMAGES_BASE}${encodeURIComponent(targetFilename)}`) : null;
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
  return str ? String(str).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') : "";
}

function isValidImageUrl(url) {
  return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('./'));
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
   SECTION 4: Master Telemetry Dashboard Engine (Deep Parsing & Cross-Ref)
   ========================================================================== */

window.renderDashboard = function(rawIncomingData) {
  if (!rawIncomingData) return;

  let data = rawIncomingData;
  if (typeof rawIncomingData.val === 'function') {
    data = rawIncomingData.val();
  }

  // Extract Mod Catalog & Image Mappings Node
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Images) {
    firebaseImageMappings = data.FS25_Mods_Info.Images;
  }
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Website) {
    window.activeFirebaseModData = Object.values(data.FS25_Mods_Info.Website);
    window.hasRenderedFirebaseMods = true;
    renderModGrid(window.activeFirebaseModData);
  }

  // Auto-resolve root telemetry node location
  const rootData = data.fs25 ? data.fs25 : (data.careerSavegame_raw || data.farms_raw || data.detailedFleet ? data : {});

  // Active Save Slot Banner Update
  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${rootData.activeSaveSlot || "1"}</strong>`;
  }

  // Parse Raw XML String Nodes
  const careerXml = parseXML(rootData.careerSavegame_raw);
  const farmsXml = parseXML(rootData.farms_raw);
  const vehXml = parseXML(rootData.vehicles_raw);
  const toolsXml = parseXML(rootData.handTools_raw);
  const farmlandXml = parseXML(rootData.farmland_raw);
  const placeXml = parseXML(rootData.placeables_raw);
  const envXml = parseXML(rootData.environment_raw);
  const missionsXml = parseXML(rootData.missions_raw);
  const itemsXml = parseXML(rootData.items_raw);

  // Time & Server Status Setup
  let gameTime = "00:00";
  if (envXml) {
    const dayTimeElem = envXml.querySelector("dayTime, time");
    if (dayTimeElem) gameTime = formatGameTime(dayTimeElem.textContent || dayTimeElem.getAttribute("value"));
  }

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      setTxt('server-name', settings.getAttribute("savegameName") || "OneLIVIDMAN and werewolf3788");
      setTxt('server-map', `Map: ${settings.getAttribute("mapTitle") || "Calm Lands"}`);
      setTxt('server-time', `Time: ${gameTime}`);
      setTxt('time-speed-badge', `Speed: ${settings.getAttribute("timeScale") || "1"}x`);
      setTxt('traffic-badge', `Traffic: ${settings.getAttribute("trafficEnabled") === 'true' ? 'ON' : 'OFF'}`);
    }
  }

  // 1. Registered Server Farms
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
  setTxt('global-net-worth', `$${globalNetWorth.toLocaleString()}`);

  // 2. Active Server Contracts & Missions Card
  const missionsCont = document.getElementById('missions-container');
  if (missionsCont) {
    let missionsHtml = "";

    if (missionsXml) {
      missionsXml.querySelectorAll("mission, contract").forEach(m => {
        const type = formatName(m.getAttribute("type") || m.getAttribute("category") || "Contract");
        const reward = Math.round(parseFloat(m.getAttribute("reward") || "0"));
        const fieldId = m.getAttribute("fieldId") || m.getAttribute("field") || "N/A";
        const farmId = m.getAttribute("farmId") || "0";
        const color = getFarmColor(farmId);
        const status = m.getAttribute("status") || "Active";

        missionsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color};">
            <i class="fa-solid fa-file-contract card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">${type} - Field #${fieldId}</strong>
              <span>Reward: $${reward.toLocaleString()}</span>
              <span class="card-subtext">Status: ${status}</span>
            </div>
          </div>`;
      });
    }
    missionsCont.innerHTML = missionsHtml || `<div class="empty-state">No Active Mission Contracts</div>`;
  }

  // 3. Collectibles Card
  const collectiblesCont = document.getElementById('collectibles-container');
  if (collectiblesCont) {
    let collectiblesHtml = "";

    if (itemsXml) {
      itemsXml.querySelectorAll("item, collectible").forEach(item => {
        const isFound = item.getAttribute("isFound") === "true" || item.getAttribute("found") === "true";
        if (isFound) {
          const name = formatName(item.getAttribute("className") || item.getAttribute("type") || "Collectible");
          collectiblesHtml += `
            <div class="telemetry-card">
              <i class="fa-solid fa-trophy card-icon" style="color:#facc15;"></i>
              <div class="card-details">
                <strong style="color:#ffffff;">${name}</strong>
                <span class="card-subtext">Status: Discovered</span>
              </div>
            </div>`;
        }
      });
    }
    collectiblesCont.innerHTML = collectiblesHtml || `<div class="empty-state">No Map Collectibles Discovered Yet</div>`;
  }

  // 4. Fleet Machinery Parsing
  let vehicleCount = 0;
  const tracCont = document.getElementById('tractors-container');
  const harvCont = document.getElementById('harvesters-container');
  const trailCont = document.getElementById('trailers-container');
  const implCont = document.getElementById('implements-container');

  let tractors = "", harvesters = "", trailers = "", implements = "";

  if (vehXml) {
    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      vehicleCount++;
      const rawName = v.getAttribute("filename") || v.getAttribute("name") || "";
      const name = formatName(rawName);
      const farmId = v.getAttribute("farmId") || "0";
      const color = getFarmColor(farmId);
      const operatingTime = formatHours(v.getAttribute("operatingTime"));
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
            <span class="card-subtext">Usage: ${operatingTime}</span>
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
  setTxt('global-vehicle-count', vehicleCount);

  // 5. Hand Tools Parsing
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

  // 6. Field Agronomy Status
  let fieldCount = 0;
  const fieldsCont = document.getElementById('fields-container');
  if (fieldsCont) {
    let fieldsHtml = "";

    if (rootData.fieldAgronomy) {
      Object.values(rootData.fieldAgronomy).forEach(f => {
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
              <span>Owner: ${farmId === '0' ? 'Public' : 'Farm #' + farmId}</span>
              ${fert ? `<span class="card-subtext">${fert}</span>` : ''}
              <div style="margin-top:2px;">${lime} ${plow}</div>
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
  setTxt('global-land-count', `${fieldCount} Fields`);

  renderProductions(placeXml);
  renderTacticalLog(rootData.modErrors, rootData.serverEvents);
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
   SECTION 5: Event Listeners & Lightbox Setup
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
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

  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('dynamic-menu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => navMenu.classList.toggle('open'));
  }

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
