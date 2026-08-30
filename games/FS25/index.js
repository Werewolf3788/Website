/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 30, 2026, 12:40:00 (EDT - New York)
   Project: entertainment-71888 (/fs25 RTDB Node)
   Description: Resilient Tactical Telemetry Engine with multi-source active 
                player resolver, farmland ag-grid, and production chain metrics.
   ========================================================================== */

/* ------------------------------------------------------------------------
   HTML Target Reference Notes:
   - Mod Hub Grid -> Target ID in HTML: 'mod-hub-grid' (Line ~180)
   - Active Players Container -> Target ID in HTML: 'active-players-container' (Line ~290)
   - Farms Container -> Target ID in HTML: 'farms-container' (Line ~330)
   - Placed Objects & Husbandry -> Target IDs: 'animals-container', 
     'generators-container', 'misc-container', 'greenhouses-container', 
     'farmhouses-container', 'shops-selling-container', 'main-productions-container' (Line ~370)
   - Contracts & Missions -> Target ID: 'missions-container' (Line ~460)
   - Fleet Machinery -> Target IDs: 'tractors-container', 'harvesters-container',
     'trailers-container', 'implements-container' (Line ~550)
   - Farmlands -> Target ID: 'fields-container' (Line ~620)
   ------------------------------------------------------------------------ */

// Protocol-relative GA4 Tag Injection (G-CTYHDF4MSD)
(function injectGA4() {
  try {
    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = "//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD";
      script.onerror = () => console.warn("ℹ️ GA4 tag skipped by extension.");
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', 'G-CTYHDF4MSD', { 'send_page_view': true, 'anonymize_ip': false });
    }
  } catch (e) {}
})();

const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

const HAND_TOOL_NAMES = {
  "XP550": "Husqvarna XP550 Chainsaw",
  "MS261": "Stihl MS261 Chainsaw",
  "FLASHLIGHT100": "Heavy Duty Flashlight",
  "PRESSUREWASHER": "Kärcher High Pressure Washer"
};

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
  const fid = String(farmId || "1");
  return FARM_COLOR_PALETTE[fid] ? FARM_COLOR_PALETTE[fid].color : "#ff5f00";
}

function formatGameTime(rawTimeSeconds) {
  if (!rawTimeSeconds) return "00:00";
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
   SECTION 1: Smart XML Parser & Payload Extractor
   ========================================================================== */

function smartExtractPayload(rawInput) {
  if (!rawInput) return "";
  if (typeof rawInput === 'object') {
    try { rawInput = JSON.stringify(rawInput); } catch(e) { return ""; }
  }
  const trimmed = String(rawInput).trim();
  const preMatch = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) return preMatch[1].trim();
  const codeMatch = trimmed.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) return codeMatch[1].trim();
  return trimmed;
}

function parseXML(rawText) {
  const cleanXmlText = smartExtractPayload(rawText);
  if (!cleanXmlText) return null;
  try {
    const xmlDoc = (new DOMParser()).parseFromString(cleanXmlText, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function resolveItemImage(rawFilename) {
  if (!rawFilename) return null;

  const rawString = String(rawFilename).trim();
  const displayTitle = formatName(rawString);
  const cleanDisplayKey = sanitizeKey(displayTitle);
  const baseFileName = rawString.split('/').pop().replace('.xml', '').replace('.zip', '');
  const cleanFileNameKey = sanitizeKey(baseFileName);
  const cleanRawKey = sanitizeKey(rawString);

  let targetFilename = "";

  if (firebaseImageMappings && Object.keys(firebaseImageMappings).length > 0) {
    const matchedRecord = 
      firebaseImageMappings[cleanFileNameKey] ||
      firebaseImageMappings[cleanDisplayKey] ||
      firebaseImageMappings[cleanRawKey];

    if (matchedRecord) {
      targetFilename = matchedRecord.filename || matchedRecord.image || matchedRecord.file_name || matchedRecord.imageurl || "";
    } else {
      const allKeys = Object.keys(firebaseImageMappings);
      const matchedKey = allKeys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes(cleanFileNameKey) || cleanFileNameKey.includes(lowerK);
      });

      if (matchedKey) {
        const record = firebaseImageMappings[matchedKey];
        targetFilename = record.filename || record.image || record.file_name || record.imageurl || "";
      }
    }
  }

  if (!targetFilename && (rawString.endsWith('.jpg') || rawString.endsWith('.png') || rawString.endsWith('.webp'))) {
    targetFilename = rawString.split('/').pop();
  }

  return targetFilename ? (isValidImageUrl(targetFilename) ? targetFilename : `${REPO_IMAGES_BASE}${encodeURIComponent(targetFilename)}`) : null;
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
   SECTION 2: Mod Catalog CSV Loader
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
    console.warn("Sheet CSV Load Note:", err.message);
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
   SECTION 3: Mod Grid Renderer
   ========================================================================== */

function renderModGrid(modsData) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  let modList = Array.isArray(modsData) ? modsData : (modsData ? Object.values(modsData) : []);

  const catBar = document.getElementById('mod-categories-bar');
  if (catBar && modList.length > 0) {
    const categoriesSet = new Set(['ALL']);
    modList.forEach(mod => {
      const cat = mod.category_g || mod.category_k || mod.category || mod.mod_type_f || 'General';
      categoriesSet.add(String(cat).toUpperCase());
    });

    catBar.innerHTML = `
      <div style="margin-bottom:0.75rem; text-align:center; font-weight:700; color:var(--accent-gold); font-size:1.05rem;">
        <i class="fa-solid fa-cubes"></i> Total Server Mods Active: ${modList.length}
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
        ${Array.from(categoriesSet).map(cat => 
          `<button type="button" class="category-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterModsCategory('${cat}', this)">${cat}</button>`
        ).join('')}
      </div>`;
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
   SECTION 4: Master Telemetry Engine
   ========================================================================== */

window.renderDashboard = function(rawIncomingData) {
  if (!rawIncomingData) return;

  let data = rawIncomingData;
  if (typeof rawIncomingData.val === 'function') {
    data = rawIncomingData.val();
  }
  if (!data) return;

  window.setServerStatus(true);

  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Images) {
    firebaseImageMappings = data.FS25_Mods_Info.Images;
  }
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Website) {
    window.activeFirebaseModData = Object.values(data.FS25_Mods_Info.Website);
    window.hasRenderedFirebaseMods = true;
    renderModGrid(window.activeFirebaseModData);
  }

  // Dual-root resolution
  const fs25Node = (data.fs25 && typeof data.fs25 === 'object') ? data.fs25 : data;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const careerXml = parseXML(fs25Node.careerSavegame_raw || fs25Node.careerSavegame || data.careerSavegame_raw || data.careerSavegame);
  const vehXml = parseXML(fs25Node.vehicles_raw || fs25Node.vehicles || data.vehicles_raw || data.vehicles);
  const farmsXml = parseXML(fs25Node.farms_raw || fs25Node.farms || data.farms_raw || data.farms);
  const placeXml = parseXML(fs25Node.placeables_raw || fs25Node.placeables || data.placeables_raw || data.placeables);
  const itemsXml = parseXML(fs25Node.items_raw || fs25Node.items || data.items_raw || data.items);
  const toolsXml = parseXML(fs25Node.handTools_raw || fs25Node.handTools || data.handTools_raw || data.handTools);
  const missionsXml = parseXML(fs25Node.missions_raw || fs25Node.missions || data.missions_raw || data.missions);
  const statsXml = parseXML(fs25Node.stats_xml_raw || fs25Node.stats_raw || fs25Node.stats_xml || fs25Node.stats || fs25Node.dedicatedServerConfig_raw || data.stats_xml_raw || data.stats_raw);
  const farmlandXml = parseXML(fs25Node.farmland_raw || fs25Node.farmlands_raw || fs25Node.farmland || fs25Node.farmlands || data.farmland_raw || data.farmlands_raw);
  const envXml = parseXML(fs25Node.environment_raw || fs25Node.environment || data.environment_raw || data.environment);

  // 1. Server Banner, Time, Weather, & Net Worth
  let liveClockText = "00:00";
  let seasonText = "Early Autumn";
  let weatherText = "Clear";

  if (envXml) {
    const dayTimeElem = envXml.querySelector("dayTime, time");
    if (dayTimeElem) liveClockText = formatGameTime(dayTimeElem.textContent || dayTimeElem.getAttribute("value"));
    
    const weatherElem = envXml.querySelector("weather, currentForecast");
    if (weatherElem) weatherText = formatName(weatherElem.getAttribute("type") || weatherElem.getAttribute("state") || "Clear");

    const seasonElem = envXml.querySelector("period, currentPeriod, season");
    if (seasonElem) seasonText = formatName(seasonElem.getAttribute("name") || seasonElem.textContent || "Early Autumn");
  }

  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      setTxt('server-name', settings.querySelector("savegameName")?.textContent || "OneLIVIDMAN and werewolf 618");
      setTxt('server-map', `Map: ${settings.querySelector("mapTitle")?.textContent || "Calm Lands"}`);
      setTxt('traffic-badge', `Traffic: ${settings.querySelector("trafficEnabled")?.textContent === 'true' ? 'ON' : 'OFF'}`);
      setTxt('time-speed-badge', `Speed: ${settings.querySelector("timeScale")?.textContent || "1"}x`);
    }

    const stats = careerXml.querySelector("statistics");
    if (stats) {
      const money = Math.round(parseFloat(stats.querySelector("money")?.textContent || "0"));
      setTxt('global-net-worth', `$${money.toLocaleString()}`);
    }
  }

  setTxt('server-time', `Time: ${liveClockText}`);
  setTxt('server-month', `Season: ${seasonText}`);
  setTxt('server-weather', `Weather: ${weatherText}`);

  // 2. Active Players (Multi-source: Stats XML + Vehicle Drivers)
  const playersCont = document.getElementById('active-players-container');
  let activeGamertags = [];
  let totalSlots = "6";

  if (statsXml) {
    const slotsNode = statsXml.querySelector("Slots, slots");
    if (slotsNode) totalSlots = slotsNode.getAttribute("capacity") || slotsNode.getAttribute("numMax") || "6";

    statsXml.querySelectorAll("Player, player").forEach(p => {
      const name = p.textContent ? p.textContent.trim() : p.getAttribute("name");
      if (name && name !== "UNKNOWN") {
        const uptimeMin = p.getAttribute("uptime") || p.getAttribute("playingTime") || "0";
        const posX = p.getAttribute("x") ? parseFloat(p.getAttribute("x")).toFixed(1) : null;
        const posZ = p.getAttribute("z") ? parseFloat(p.getAttribute("z")).toFixed(1) : null;
        activeGamertags.push({ name, uptimeMin, posX, posZ });
      }
    });
  }

  // Fallback: Check vehicles.xml for currently entered user gamertags
  if (activeGamertags.length === 0 && vehXml) {
    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      const user = (v.getAttribute("enteredUserGamertag") || v.getAttribute("driverName") || "").trim();
      if (user && user !== "UNKNOWN" && !activeGamertags.some(p => p.name === user)) {
        const comp = v.querySelector("component");
        let posX = null, posZ = null;
        if (comp && comp.getAttribute("position")) {
          const coords = comp.getAttribute("position").split(" ");
          if (coords.length >= 3) {
            posX = parseFloat(coords[0]).toFixed(1);
            posZ = parseFloat(coords[2]).toFixed(1);
          }
        }
        activeGamertags.push({ name: user, uptimeMin: "Active In Cab", posX, posZ });
      }
    });
  }

  // Fallback direct active count from root if available
  const activePlayersCount = Math.max(activeGamertags.length, parseInt(fs25Node.activePlayers || data.activePlayers || 0, 10));

  if (playersCont) {
    let playersHtml = "";
    activeGamertags.forEach(p => {
      playersHtml += `
        <div class="telemetry-card" style="border-left: 4px solid #22c55e; padding: 0.85rem;">
          <i class="fa-solid fa-gamepad card-icon" style="color:#22c55e;"></i>
          <div class="card-details">
            <strong style="color:#22c55e; font-size:1.05rem;">${p.name}</strong>
            <span style="color:#ffffff;">Session: ${p.uptimeMin}</span>
            ${p.posX ? `<span class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-location-dot"></i> Position: X: ${p.posX} | Z: ${p.posZ}</span>` : ''}
          </div>
        </div>`;
    });

    playersCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:#22c55e; font-size:0.85rem;"><i class="fa-solid fa-users"></i> Connected Players: ${activePlayersCount}</strong>
      </div>
      ${playersHtml || `<div class="empty-state">No Active Players Connected</div>`}`;
  }
  setTxt('server-players', `Players: ${activePlayersCount}/${totalSlots}`);

  // 3. Farms & Balances
  const farmsCont = document.getElementById('farms-container');
  if (farmsCont) {
    let farmsHtml = "";
    let calculatedNetWorth = 0;
    let farmCount = 0;

    if (farmsXml) {
      farmsXml.querySelectorAll("farm, Farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
        if (farmId && farmId !== "0") {
          farmCount++;
          const name = farm.getAttribute("name") || FARM_COLOR_PALETTE[farmId]?.name || `Farm #${farmId}`;
          const money = Math.round(parseFloat(farm.getAttribute("money") || "0"));
          const color = getFarmColor(farmId);
          calculatedNetWorth += money;

          farmsHtml += `
            <div class="telemetry-card" style="border-left: 4px solid ${color}; padding: 0.85rem;">
              <i class="fa-solid fa-building-columns card-icon" style="color:${color};"></i>
              <div class="card-details">
                <strong style="color:${color};">${name}</strong>
                <span style="font-size:1.05rem; font-weight:700; color:#ffffff;">Balance: $${money.toLocaleString()}</span>
              </div>
            </div>`;
        }
      });
    }

    if (farmCount === 0) {
      farmCount = 1;
      const color = getFarmColor("1");
      farmsHtml = `
        <div class="telemetry-card" style="border-left: 4px solid ${color}; padding: 0.85rem;">
          <i class="fa-solid fa-building-columns card-icon" style="color:${color};"></i>
          <div class="card-details">
            <strong style="color:${color};">My Farm (Farm #1)</strong>
            <span style="font-size:1.05rem; font-weight:700; color:#ffffff;">Active Registered Farm</span>
          </div>
        </div>`;
    }

    farmsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-building-columns"></i> Total Registered Farms: ${farmCount}</strong>
      </div>
      ${farmsHtml}`;

    if (calculatedNetWorth > 0) setTxt('global-net-worth', `$${calculatedNetWorth.toLocaleString()}`);
  }

  // 4. Placed Objects & Production Chains
  const animalsCont = document.getElementById('animals-container');
  const genCont = document.getElementById('generators-container');
  const miscCont = document.getElementById('misc-container') || document.getElementById('construction-container');
  const greenCont = document.getElementById('greenhouses-container');
  const houseCont = document.getElementById('farmhouses-container');
  const shopsCont = document.getElementById('shops-selling-container');
  const prodCont = document.getElementById('main-productions-container');

  let animalsHtml = "", genHtml = "", miscHtml = "", greenHtml = "", houseHtml = "", shopsHtml = "", prodHtml = "";
  let animalCount = 0, genCount = 0, miscCount = 0, greenCount = 0, houseCount = 0, shopsCount = 0, prodCount = 0;

  if (placeXml) {
    placeXml.querySelectorAll("placeable, Placeable, item, Item").forEach(p => {
      const rawFilename = p.getAttribute("filename") || p.getAttribute("type") || p.getAttribute("className") || "";
      if (!rawFilename) return;

      const lowerName = rawFilename.toLowerCase();
      const farmId = p.getAttribute("farmId") || "1";
      const color = getFarmColor(farmId);
      const name = formatName(rawFilename);

      const compNode = p.querySelector("component");
      const posAttr = p.getAttribute("position") || (compNode ? compNode.getAttribute("position") : null);
      let locText = "";
      if (posAttr) {
        const parts = posAttr.split(" ");
        if (parts.length >= 3) locText = `X: ${parseFloat(parts[0]).toFixed(1)} | Z: ${parseFloat(parts[2]).toFixed(1)}`;
      }

      let inputsList = [];
      p.querySelectorAll("storage > fillLevel, fillLevel, productionPoint > fillLevel, production > fillLevel").forEach(fill => {
        const fillType = fill.getAttribute("fillType");
        const level = Math.round(parseFloat(fill.getAttribute("fillLevel") || fill.textContent || "0"));
        const capacity = Math.round(parseFloat(fill.getAttribute("capacity") || "0"));
        const pctText = capacity > 0 ? ` (${Math.round((level / capacity) * 100)}%)` : '';

        if (fillType && level > 0) {
          inputsList.push(`${formatName(fillType)}: ${level.toLocaleString()} L${pctText}`);
        }
      });

      const productionMetricsText = inputsList.length > 0 
        ? `<div class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-boxes-stacked"></i> Storage:<br>${inputsList.join("<br>")}</div>` 
        : '<div class="card-subtext" style="color:#94a3b8;">Status: Operational</div>';

      const matchedImg = resolveItemImage(rawFilename);
      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-building card-icon" style="color:${color};"></i>`;

      if (lowerName.includes("doghouse") || lowerName.includes("husbandry") || lowerName.includes("barn") || lowerName.includes("cow") || lowerName.includes("pig") || lowerName.includes("sheep") || lowerName.includes("chicken") || lowerName.includes("pasture")) {
        animalCount++;
        const animalNode = p.querySelector("husbandryAnimals, animals");
        const count = animalNode ? (animalNode.getAttribute("numAnimals") || animalNode.children.length || "0") : "0";

        animalsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              <span style="color:#ffffff; font-weight:600;"><i class="fa-solid fa-paw"></i> Livestock Count: ${count} Head</span>
              ${locText ? `<span class="card-subtext"><i class="fa-solid fa-location-dot"></i> Location: ${locText}</span>` : ''}
            </div>
          </div>`;
      }
      else if (lowerName.includes("antenna") || lowerName.includes("solar") || lowerName.includes("windturbine") || lowerName.includes("generator") || lowerName.includes("radio") || lowerName.includes("sign")) {
        genCount++;
        genHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              <span>Owner: Farm #${farmId} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("greenhouse")) {
        greenCount++;
        greenHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              ${productionMetricsText}
              <span>Owner: Farm #${farmId} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("house") || lowerName.includes("shouse") || lowerName.includes("farmhouse") || lowerName.includes("cabin")) {
        houseCount++;
        houseHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              <span>Player Residence | Farm #${farmId} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("buying") || lowerName.includes("sell") || lowerName.includes("market") || lowerName.includes("restaurant") || lowerName.includes("dairy") || lowerName.includes("lumber") || lowerName.includes("shop") || lowerName.includes("station")) {
        shopsCount++;
        shopsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              ${productionMetricsText}
              <span>Trade & Selling Point ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("ramp") || lowerName.includes("carport") || lowerName.includes("hall") || lowerName.includes("shed") || lowerName.includes("garage") || lowerName.includes("bunker")) {
        miscCount++;
        miscHtml += `
          <div class="telemetry-card" style="border-left: 3px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              <span>Storage Facility | Farm #${farmId} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else {
        prodCount++;
        prodHtml += `
          <div class="telemetry-card" style="border-left: 3px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              ${productionMetricsText}
              <span>Production Building | Farm #${farmId} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
    });
  }

  if (animalsCont) animalsCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-cow"></i> Husbandry Facilities: ${animalCount}</strong></div>${animalsHtml || `<div class="empty-state">No Animal Facilities Logged</div>`}`;
  if (genCont) genCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-bolt"></i> Generators & Antennas: ${genCount}</strong></div>${genHtml || `<div class="empty-state">No Generators Logged</div>`}`;
  if (greenCont) greenCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-seedling"></i> Greenhouses: ${greenCount}</strong></div>${greenHtml || `<div class="empty-state">No Greenhouses Logged</div>`}`;
  if (houseCont) houseCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-house-chimney"></i> Farmhouses: ${houseCount}</strong></div>${houseHtml || `<div class="empty-state">No Farmhouses Logged</div>`}`;
  if (shopsCont) shopsCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-store"></i> Shops & Selling Points: ${shopsCount}</strong></div>${shopsHtml || `<div class="empty-state">No Shops Logged</div>`}`;
  if (miscCont) miscCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-hammer"></i> Placed Objects: ${miscCount}</strong></div>${miscHtml || `<div class="empty-state">No Placed Objects Logged</div>`}`;
  if (prodCont) prodCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-industry"></i> Production Factories: ${prodCount}</strong></div>${prodHtml || `<div class="empty-state">No Production Buildings Logged</div>`}`;

  // 5. Contracts & Missions
  const missionsCont = document.getElementById('missions-container');
  if (missionsCont) {
    let missionsHtml = "";
    let missionCount = 0;

    if (missionsXml) {
      missionsXml.querySelectorAll("mission, contract, item, Mission, Contract, missions > *").forEach(m => {
        missionCount++;

        const rawType = m.getAttribute("type") || m.getAttribute("category") || m.getAttribute("name") || m.querySelector("type")?.textContent || "Contract Job";
        const jobType = formatName(rawType);
        const fieldId = m.getAttribute("fieldIndex") || m.getAttribute("fieldId") || m.getAttribute("field") || m.querySelector("field")?.getAttribute("id") || "N/A";
        const rawReward = m.getAttribute("reward") || m.getAttribute("payout") || m.querySelector("reward")?.textContent || "0";
        const reward = Math.round(parseFloat(rawReward));
        const farmId = m.getAttribute("farmId") || m.getAttribute("owner") || "1";
        const farmName = FARM_COLOR_PALETTE[farmId]?.name || `Farm #${farmId}`;
        const color = getFarmColor(farmId);
        const fruitTypeName = m.getAttribute("fruitTypeName") || m.getAttribute("fruitType") || m.querySelector("fruitType")?.textContent || "";
        const fruitText = fruitTypeName ? ` | Crop: ${formatName(fruitTypeName)}` : '';

        let rawStatus = String(m.getAttribute("status") || m.getAttribute("state") || "0").toUpperCase();
        let statusBadge = `<span class="badge" style="background:rgba(56, 189, 248, 0.2); color:#38bdf8; border:1px solid #38bdf8;">AVAILABLE</span>`;
        
        if (rawStatus === "1" || rawStatus.includes("RUNNING") || rawStatus.includes("ACTIVE") || rawStatus.includes("IN_PROGRESS")) {
          statusBadge = `<span class="badge" style="background:rgba(34, 197, 94, 0.2); color:#4ade80; border:1px solid #4ade80;">IN PROGRESS</span>`;
        } else if (rawStatus === "2" || rawStatus.includes("FINISHED") || rawStatus.includes("SUCCESS") || rawStatus.includes("COMPLETED")) {
          statusBadge = `<span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15; border:1px solid #facc15;">READY FOR PAYOUT</span>`;
        }

        missionsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            <i class="fa-solid fa-file-contract card-icon" style="color:${color};"></i>
            <div class="card-details" style="width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:0.5rem; flex-wrap:wrap;">
                <strong style="color:${color}; font-size:1rem;">${jobType} - Field #${fieldId}</strong>
                ${statusBadge}
              </div>
              <span style="color:#ffffff; font-weight:700;">Payout: $${reward.toLocaleString()}</span>
              <span class="card-subtext" style="color:#94a3b8;">Client: ${farmName}${fruitText}</span>
            </div>
          </div>`;
      });
    }

    missionsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-file-contract"></i> Total Contracts Logged: ${missionCount}</strong>
      </div>
      ${missionsHtml || `<div class="empty-state">No Contracts Found in XML File</div>`}`;
  }

  // 6. Collectibles & Hand Tools
  const collectiblesCont = document.getElementById('collectibles-container');
  if (collectiblesCont) {
    let collectiblesHtml = "";
    let totalCollectibles = 0;
    let foundCollectibles = 0;

    if (itemsXml) {
      const itemNodes = itemsXml.querySelectorAll("item, collectible, Item");
      totalCollectibles = itemNodes.length || 100;

      itemNodes.forEach(item => {
        const isFound = item.getAttribute("isFound") === "true" || item.getAttribute("found") === "true";
        if (isFound) {
          foundCollectibles++;
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

    collectiblesCont.innerHTML = `
      <div style="margin-bottom:0.5rem; padding:0.4rem 0.6rem; background:#0f172a; border-radius:6px; text-align:center;">
        <strong style="color:var(--accent-gold); font-size:0.9rem;">
          <i class="fa-solid fa-trophy"></i> Collectibles Discovered: ${foundCollectibles} / ${totalCollectibles}
        </strong>
      </div>
      ${collectiblesHtml || `<div class="empty-state">0 / ${totalCollectibles} Collectibles Discovered</div>`}`;
  }

  const toolsCont = document.getElementById('handtools-container');
  if (toolsCont) {
    let toolsHtml = "";
    let toolCount = 0;

    if (toolsXml) {
      toolsXml.querySelectorAll("handTool, HandTool, item, Item").forEach(t => {
        const rawFilename = t.getAttribute("filename") || t.getAttribute("type") || "";
        if (!rawFilename) return;
        toolCount++;
        const baseName = formatName(rawFilename);
        const friendlyName = HAND_TOOL_NAMES[baseName] || HAND_TOOL_NAMES[rawFilename] || baseName;
        const matchedImg = resolveItemImage(rawFilename);

        const imgHtml = matchedImg 
          ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${friendlyName}">`
          : `<i class="fa-solid fa-toolbox card-icon"></i>`;

        toolsHtml += `
          <div class="telemetry-card">
            ${imgHtml}
            <div class="card-details">
              <strong style="color:#ffffff;">${friendlyName}</strong>
              <span class="card-subtext">ID: ${baseName}</span>
            </div>
          </div>`;
      });
    }

    toolsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-toolbox"></i> Total Hand Tools: ${toolCount}</strong>
      </div>
      ${toolsHtml || `<div class="empty-state">No Hand Tools Logged</div>`}`;
  }

  // 7. Fleet Machinery
  let vehicleCount = 0;
  let tracCount = 0, harvCount = 0, trailCount = 0, implCount = 0;
  const tracCont = document.getElementById('tractors-container');
  const harvCont = document.getElementById('harvesters-container');
  const trailCont = document.getElementById('trailers-container');
  const implCont = document.getElementById('implements-container');

  let tractors = "", harvesters = "", trailers = "", implements = "";
  let vehicleObjMap = {};

  if (vehXml) {
    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      const uId = v.getAttribute("uniqueId") || v.getAttribute("id");
      const name = formatName(v.getAttribute("filename") || v.getAttribute("name") || "");
      if (uId) vehicleObjMap[uId] = { name, node: v };
    });

    vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
      const rawName = v.getAttribute("filename") || v.getAttribute("name") || "";
      if (!rawName) return;

      vehicleCount++;
      const name = formatName(rawName);
      const farmId = v.getAttribute("farmId") || "1";
      const color = getFarmColor(farmId);
      const operatingTime = formatHours(v.getAttribute("operatingTime"));

      let plateText = "";
      const plateNode = v.querySelector("licensePlates, licensePlate");
      if (plateNode) {
        plateText = plateNode.getAttribute("characters") || plateNode.getAttribute("number") || "";
      }
      const plateBadge = plateText.trim() 
        ? `<span class="badge" style="border: 1px solid var(--accent-gold); color: var(--accent-gold);"><i class="fa-solid fa-id-card"></i> ${plateText.trim()}</span>` 
        : '';

      const enteredUser = (v.getAttribute("enteredUserGamertag") || v.getAttribute("driverName") || "").trim();
      const aiNode = v.querySelector("aiFieldWorker");
      const isAiActive = aiNode ? aiNode.getAttribute("isActive") === "true" : false;

      let driverBadge = `<span class="badge" style="background:rgba(148, 163, 184, 0.1); color:#94a3b8;">Parked / Unmanned</span>`;
      if (enteredUser.length > 0) {
        driverBadge = `<span class="badge" style="background:rgba(34, 197, 94, 0.2); color:#4ade80;"><i class="fa-solid fa-user"></i> Driver: ${enteredUser}</span>`;
      } else if (isAiActive) {
        driverBadge = `<span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15;"><i class="fa-solid fa-robot"></i> AI Active</span>`;
      }

      let cargoList = [];
      v.querySelectorAll("fillUnit > unit, fillUnit").forEach(u => {
        const ft = u.getAttribute("fillType");
        const lvl = Math.round(parseFloat(u.getAttribute("fillLevel") || "0"));
        const capacity = Math.round(parseFloat(u.getAttribute("capacity") || "0"));
        const pct = capacity > 0 ? Math.round((lvl / capacity) * 100) : null;

        if (ft && ft !== "UNKNOWN") {
          if (pct !== null) {
            cargoList.push(`${formatName(ft)}: ${pct}% (${lvl.toLocaleString()} L)`);
          } else if (lvl > 0) {
            cargoList.push(`${formatName(ft)}: ${lvl.toLocaleString()} L`);
          }
        }
      });

      const cargoText = cargoList.length > 0 
        ? `<div class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-box-archive"></i> Unit Contents: ${cargoList.join(" | ")}</div>` 
        : '';

      let attachedNames = [];
      v.querySelectorAll("attachedImplement").forEach(att => {
        const targetId = att.getAttribute("attachedVehicleUniqueId") || att.getAttribute("uniqueId");
        if (targetId && vehicleObjMap[targetId]) {
          attachedNames.push(vehicleObjMap[targetId].name);
        }
      });

      const attachmentText = attachedNames.length > 0
        ? `<div class="card-subtext" style="color:#4ade80;"><i class="fa-solid fa-link"></i> Attached Equipment: ${attachedNames.join(", ")}</div>`
        : '';

      const compNode = v.querySelector("component");
      let posText = "";
      if (compNode && compNode.getAttribute("position")) {
        const coords = compNode.getAttribute("position").split(" ");
        if (coords.length >= 3) {
          posText = `X: ${parseFloat(coords[0]).toFixed(1)} | Z: ${parseFloat(coords[2]).toFixed(1)}`;
        }
      }

      const matchedImg = resolveItemImage(rawName);
      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-tractor card-icon" style="color:${color};"></i>`;

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
          ${imgHtml}
          <div class="card-details" style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
              <strong style="color:${color};">${name}</strong>
              <div style="display:flex; gap:0.4rem; align-items:center;">
                ${plateBadge}
                ${driverBadge}
              </div>
            </div>
            <span>Owner: Farm #${farmId} | Usage: ${operatingTime} ${posText ? '| Loc: ' + posText : ''}</span>
            ${attachmentText}
            ${cargoText}
          </div>
        </div>`;

      const lowerFile = rawName.toLowerCase();
      const categoryType = (v.getAttribute("category") || "").toLowerCase();

      if (lowerFile.includes("combine") || lowerFile.includes("harvest") || lowerFile.includes("cutter") || lowerFile.includes("rmf9r") || categoryType.includes("harvester")) {
        harvCount++; harvesters += card;
      } else if (lowerFile.includes("trailer") || lowerFile.includes("wagon") || lowerFile.includes("z18051") || lowerFile.includes("supercollect") || lowerFile.includes("liqui") || categoryType.includes("trailer")) {
        trailCount++; trailers += card;
      } else if (lowerFile.includes("tractor") || lowerFile.includes("seriesm8") || lowerFile.includes("truck") || lowerFile.includes("rig") || lowerFile.includes("johndeere") || lowerFile.includes("deere") || lowerFile.includes("kubota") || lowerFile.includes("roadrunner") || lowerFile.includes("svl") || lowerFile.includes("6r") || categoryType.includes("tractor") || categoryType.includes("truck")) {
        tracCount++; tractors += card;
      } else {
        implCount++; implements += card;
      }
    });
  }

  if (tracCont) tracCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-tractor"></i> Fleet Tractors: ${tracCount}</strong></div>${tractors || `<div class="empty-state">No Fleet Tractors Found</div>`}`;
  if (harvCont) harvCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-wheat-field"></i> Harvesters: ${harvCount}</strong></div>${harvesters || `<div class="empty-state">No Harvesters Found</div>`}`;
  if (trailCont) trailCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-truck-ramp-box"></i> Trailers: ${trailCount}</strong></div>${trailers || `<div class="empty-state">No Trailers Found</div>`}`;
  if (implCont) implCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-screwdriver-wrench"></i> Implements: ${implCount}</strong></div>${implements || `<div class="empty-state">No Implements Found</div>`}`;
  setTxt('global-vehicle-count', vehicleCount);

  // 8. Farmlands (Parsing farmland.xml or stats_xml)
  const fieldsCont = document.getElementById('fields-container');
  if (fieldsCont) {
    let fieldsByFarm = {};
    let fieldCount = 0;

    const sourceFarmlandDoc = farmlandXml || statsXml;

    if (sourceFarmlandDoc) {
      sourceFarmlandDoc.querySelectorAll("Farmland, farmland").forEach(f => {
        fieldCount++;
        const id = f.getAttribute("id") || f.getAttribute("name");
        const farmId = f.getAttribute("farmId") || f.getAttribute("owner") || "0";
        const areaHa = parseFloat(f.getAttribute("area") || "0");
        const acresText = areaHa > 0 ? (areaHa * 2.47105).toFixed(2) : "N/A";
        const price = Math.round(parseFloat(f.getAttribute("price") || "0"));

        if (!fieldsByFarm[farmId]) fieldsByFarm[farmId] = "";

        const color = getFarmColor(farmId);
        fieldsByFarm[farmId] += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            <i class="fa-solid fa-seedling card-icon" style="color:${color};"></i>
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">Farmland #${id} ${acresText !== "N/A" ? `(${acresText} Acres)` : ''}</strong>
              <span>Owner: ${farmId === '0' ? 'Public / Buyable' : 'Farm #' + farmId} ${price > 0 ? `| Value: $${price.toLocaleString()}` : ''}</span>
            </div>
          </div>`;
      });
    }

    let unifiedFieldsHtml = "";
    Object.keys(fieldsByFarm).sort().forEach(fid => {
      const groupName = fid === "0" ? "PUBLIC & BUYABLE FARMLAND" : `FARM #${fid} LAND`;
      const color = getFarmColor(fid);
      unifiedFieldsHtml += `
        <div style="margin-top:0.75rem; margin-bottom:0.3rem; padding:0.3rem 0.6rem; background:#0f172a; border-radius:4px; border-left:3px solid ${color};">
          <strong style="color:${color}; font-size:0.85rem;">${groupName}</strong>
        </div>
        ${fieldsByFarm[fid]}`;
    });

    fieldsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold); font-size:0.85rem;"><i class="fa-solid fa-map-location-dot"></i> Total Map Farmlands: ${fieldCount}</strong>
      </div>
      ${unifiedFieldsHtml || `<div class="empty-state">No Farmland Data Available</div>`}`;
    setTxt('global-land-count', `${fieldCount} Fields`);
  }
};

/* ==========================================================================
   SECTION 5: Firebase Realtime Database Listener
   ========================================================================== */

function initializeFirebaseSync() {
  if (typeof firebase === 'undefined') {
    setTimeout(initializeFirebaseSync, 1000);
    return;
  }

  let db;
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      const firebaseConfig = {
        databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com"
      };
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  } catch (err) {
    console.error("Firebase init error:", err);
    return;
  }

  // Dual listener on root and /fs25 node
  db.ref().on('value', (rootSnap) => {
    if (rootSnap.exists()) {
      window.renderDashboard(rootSnap.val());
    } else {
      window.setServerStatus(false);
    }
  }, (error) => {
    console.error("Firebase RTDB Error:", error.message);
    window.setServerStatus(false);
  });
}

/* ==========================================================================
   SECTION 6: Event Listeners & Lightbox Setup
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
  initializeFirebaseSync();
});

window.setServerStatus = function(isOnline) {
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  if (statusPill && statusText) {
    statusPill.className = isOnline ? 'status-pill status-online' : 'status-pill status-offline';
    statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
  }
};
