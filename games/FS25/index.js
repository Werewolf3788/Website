/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 09, 2026, 19:35:00 (EDT - New York)
   Project: entertainment-71888 (/fs25 & /FS25_Mods_Info RTDB Nodes)
   Description: Master Tactical Telemetry Engine. Contains 100% of all Firebase
                nodes including Precision Farming, Animal Husbandry, Placed Objects,
                License Plates, Attachment Chains, and 24/7 Unfiltered Contracts.
   ========================================================================== */

// Protocol-relative GA4 Tag Injection (G-CTYHDF4MSD)
(function injectGA4() {
  try {
    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = "//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD";
      script.onerror = () => console.warn("ℹ️ GA4 tag skipped by client extension.");
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', 'G-CTYHDF4MSD', { 'send_page_view': true, 'anonymize_ip': false });
    }
  } catch (e) {
    console.warn("ℹ️ GA4 initialization bypassed.");
  }
})();

// Base Raw URL for GitHub Repository Images
const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Friendly Name Mapping for Internal Hand Tools & Items
const HAND_TOOL_NAMES = {
  "XP550": "Husqvarna XP550 Chainsaw",
  "MS261": "Stihl MS261 Chainsaw",
  "FLASHLIGHT100": "Heavy Duty Flashlight",
  "PRESSUREWASHER": "Kärcher High Pressure Washer"
};

// Farm Color Palette Mapping
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
   SECTION 1: Universal Image Resolver Engine (Fuzzy Keyword Matching)
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
        return lowerK.includes(cleanFileNameKey) || 
               cleanFileNameKey.includes(lowerK) ||
               (cleanFileNameKey.includes("chainsaw") && lowerK.includes("chainsaw")) ||
               (cleanFileNameKey.includes("xp550") && lowerK.includes("xp550")) ||
               (cleanFileNameKey.includes("ms261") && lowerK.includes("ms261"));
      });

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
   SECTION 2: Backup Mod Catalog Loader
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
   SECTION 3: Firebase Mod Catalog Card Grid Renderer
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
   SECTION 4: Master Tactical Telemetry Engine (Decoupled & Unfiltered)
   ========================================================================== */

window.renderDashboard = function(rawIncomingData) {
  if (!rawIncomingData) return;

  let data = rawIncomingData;
  if (typeof rawIncomingData.val === 'function') {
    data = rawIncomingData.val();
  }

  // Mod Catalog Node (/FS25_Mods_Info)
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Images) {
    firebaseImageMappings = data.FS25_Mods_Info.Images;
  }
  if (data.FS25_Mods_Info && data.FS25_Mods_Info.Website) {
    window.activeFirebaseModData = Object.values(data.FS25_Mods_Info.Website);
    window.hasRenderedFirebaseMods = true;
    renderModGrid(window.activeFirebaseModData);
  }

  // Telemetry Subnode (/fs25)
  const fs25Node = data.fs25 ? data.fs25 : (data.careerSavegame_raw || data.farms_raw ? data : {});
  if (!fs25Node || Object.keys(fs25Node).length === 0) return;

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Save Slot Display
  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${fs25Node.activeSaveSlot || "1"}</strong>`;
  }

  /* ------------------------------------------------------------------------
     CARD 1: SERVER HEADER & WEATHER TELEMETRY
     ------------------------------------------------------------------------ */
  const careerXml = parseXML(fs25Node.careerSavegame_raw);
  const envXml = parseXML(fs25Node.environment_raw);

  let gameTime = "00:00";
  if (envXml) {
    const dayTimeElem = envXml.querySelector("dayTime, time");
    if (dayTimeElem) gameTime = formatGameTime(dayTimeElem.textContent || dayTimeElem.getAttribute("value"));
  }

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

  /* ------------------------------------------------------------------------
     CARD 2: REGISTERED SERVER FARMS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const farmsXml = parseXML(fs25Node.farms_raw);
  const farmsCont = document.getElementById('farms-container');
  let globalNetWorth = 0;

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
    farmsCont.innerHTML = farmsHtml || `<div class="empty-state">No Active Server Farms Found</div>`;
  }
  setTxt('global-net-worth', `$${globalNetWorth.toLocaleString()}`);

  /* ------------------------------------------------------------------------
     CARD 3: ACTIVE PLAYERS & AI WORKERS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const playersXml = parseXML(fs25Node.players_raw);
  const playersCont = document.getElementById('active-players-container');
  if (playersCont) {
    let playersHtml = "";
    let activePlayerCount = 0;

    if (fs25Node.activePlayers && Object.keys(fs25Node.activePlayers).length > 0) {
      Object.values(fs25Node.activePlayers).forEach(p => {
        activePlayerCount++;
        const name = p.name || p.gamertag || "Player";
        const farmId = p.farmId || "1";
        const color = getFarmColor(farmId);
        const isMaster = p.isMasterUser ? `<span class="badge" style="background:#facc15; color:#000;">Host</span>` : '';

        playersHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color};">
            <i class="fa-solid fa-gamepad card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">${name} ${isMaster}</strong>
              <span>Assigned: Farm #${farmId} | Active Session</span>
            </div>
          </div>`;
      });
    } else if (playersXml) {
      playersXml.querySelectorAll("player").forEach(p => {
        if (p.getAttribute("isOccupied") === "true" || p.getAttribute("isOnline") === "true") {
          activePlayerCount++;
          const name = p.getAttribute("name") || p.getAttribute("nickname") || "Player";
          const farmId = p.getAttribute("farmId") || "1";
          const color = getFarmColor(farmId);

          playersHtml += `
            <div class="telemetry-card" style="border-left: 4px solid ${color};">
              <i class="fa-solid fa-gamepad card-icon" style="color:${color};"></i>
              <div class="card-details">
                <strong style="color:${color};">${name}</strong>
                <span>Assigned: Farm #${farmId}</span>
              </div>
            </div>`;
        }
      });
    }

    playersCont.innerHTML = playersHtml || `<div class="empty-state">No Active Players Connected</div>`;
    setTxt('server-players', `Players: ${activePlayerCount}/6`);
  }

  /* ------------------------------------------------------------------------
     CARD 4: FIELD CROPS & PRECISION FARMING AGRONOMY (DECOUPLED)
     ------------------------------------------------------------------------ */
  const fieldsCont = document.getElementById('fields-container');
  const pfXml = parseXML(fs25Node.precisionFarming_raw);

  // Parse Precision Farming Map Data
  let pfDataMap = {};
  if (pfXml) {
    pfXml.querySelectorAll("field, farmland, precisionFarmingField").forEach(pfField => {
      const fId = pfField.getAttribute("id") || pfField.getAttribute("fieldId");
      if (fId) {
        pfDataMap[fId] = {
          soilType: formatName(pfField.getAttribute("soilType") || pfField.getAttribute("soilTypeName") || "Silty Clay"),
          pH: parseFloat(pfField.getAttribute("pH") || pfField.getAttribute("phValue") || "6.5").toFixed(1),
          nitrogen: Math.round(parseFloat(pfField.getAttribute("nitrogen") || pfField.getAttribute("nitrogenLevel") || "0")),
          yieldPotential: Math.round(parseFloat(pfField.getAttribute("yieldPotential") || pfField.getAttribute("yieldPotentialPercentage") || "100"))
        };
      }
    });
  }

  if (fieldsCont) {
    let fieldsHtml = "";
    let fieldCount = 0;

    if (fs25Node.fieldAgronomy && Object.keys(fs25Node.fieldAgronomy).length > 0) {
      const fieldList = Object.values(fs25Node.fieldAgronomy);
      fieldList.forEach(f => {
        fieldCount++;
        const id = f.id !== undefined ? f.id : fieldCount;
        const farmId = f.farmId || "0";
        const color = getFarmColor(farmId);
        
        const acresVal = parseFloat(f.areaAcres || f.hectares * 2.47105 || 0);
        const acresText = acresVal > 0 ? `${acresVal.toFixed(2)} Acres` : '0.00 Acres';

        let rawCropName = f.fruitTypeName || f.fruitType || f.cropType || f.plantName || "";
        if (rawCropName === "0" || rawCropName === "NONE" || !rawCropName) {
          rawCropName = "FALLOW / UNPLANTED";
        } else {
          rawCropName = formatName(rawCropName);
        }

        let rawStateName = f.growthStage || f.growthState || f.state || "";
        const growthText = rawStateName ? formatName(rawStateName) : "UNSTATED";

        const fert = f.fertilizerLevel !== undefined ? `Fertilizer: ${f.fertilizerLevel}%` : 'Fertilizer: 0%';
        const lime = f.limeRequired ? `<span class="badge" style="background:#ef4444; color:#fff;">Lime Needed</span>` : '';
        const plow = f.plowRequired ? `<span class="badge" style="background:#f97316; color:#fff;">Plow Needed</span>` : '';
        const readyHarvest = growthText.includes("HARVEST") ? `<span class="badge" style="background:#22c55e; color:#fff;">Ready to Harvest</span>` : '';

        const pf = pfDataMap[String(id)] || {};
        const pfText = pf.soilType 
          ? `<div class="card-subtext" style="color:#38bdf8; margin-top:2px;">
               <i class="fa-solid fa-flask"></i> Soil: ${pf.soilType} | pH: ${pf.pH} | N: ${pf.nitrogen} kg/ha | Yield Potential: ${pf.yieldPotential}%
             </div>` 
          : '';

        fieldsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            <i class="fa-solid fa-seedling card-icon" style="color:${color};"></i>
            <div class="card-details" style="width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:${color};">Field #${id} (${acresText})</strong>
                ${readyHarvest}
              </div>
              <span style="color:#ffffff; font-weight:600;"><i class="fa-solid fa-wheat-field"></i> Crop: ${rawCropName}</span>
              <span>Owner: ${farmId === '0' ? 'Public / Unowned' : 'Farm #' + farmId} | ${fert} | State: ${growthText}</span>
              ${pfText}
              <div style="margin-top:4px; display:flex; gap:0.4rem;">${lime} ${plow}</div>
            </div>
          </div>`;
      });
    } else {
      const farmlandXml = parseXML(fs25Node.farmland_raw);
      const fieldsXml = parseXML(fs25Node.fields_raw);
      const activeXml = farmlandXml || fieldsXml;

      if (activeXml) {
        activeXml.querySelectorAll("farmland, field").forEach(f => {
          fieldCount++;
          const id = f.getAttribute("id") || f.getAttribute("fieldId") || fieldCount;
          const farmId = f.getAttribute("farmId") || "0";
          const color = getFarmColor(farmId);
          
          const areaHa = parseFloat(f.getAttribute("area") || f.getAttribute("ha") || "0");
          const acresText = areaHa > 0 ? `${(areaHa * 2.47105).toFixed(2)} Acres` : '0.00 Acres';

          let rawCropName = f.getAttribute("fruitTypeName") || f.getAttribute("fruitType") || "";
          rawCropName = (!rawCropName || rawCropName === "0") ? "FALLOW / UNPLANTED" : formatName(rawCropName);

          let growthText = f.getAttribute("growthState") || f.getAttribute("growthStage") || "";
          growthText = growthText ? formatName(growthText) : "UNSTATED";

          const pf = pfDataMap[String(id)] || {};
          const pfText = pf.soilType 
            ? `<div class="card-subtext" style="color:#38bdf8; margin-top:2px;">
                 <i class="fa-solid fa-flask"></i> Soil: ${pf.soilType} | pH: ${pf.pH} | N: ${pf.nitrogen} kg/ha | Yield Potential: ${pf.yieldPotential}%
               </div>` 
            : '';

          fieldsHtml += `
            <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
              <i class="fa-solid fa-seedling card-icon" style="color:${color};"></i>
              <div class="card-details" style="width:100%;">
                <strong style="color:${color};">Field #${id} (${acresText})</strong>
                <span style="color:#ffffff; font-weight:600;"><i class="fa-solid fa-wheat-field"></i> Crop: ${rawCropName}</span>
                <span>Owner: ${farmId === '0' ? 'Public / Unowned' : 'Farm #' + farmId} | State: ${growthText}</span>
                ${pfText}
              </div>
            </div>`;
        });
      }
    }

    fieldsCont.innerHTML = fieldsHtml || `<div class="empty-state">No Farmland Logged</div>`;
    setTxt('global-land-count', `${fieldCount} Fields`);
  }

  /* ------------------------------------------------------------------------
     CARD 5: LIVESTOCK & ANIMAL BARNS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const placeXml = parseXML(fs25Node.placeables_raw);
  const animalsCont = document.getElementById('animals-container');
  if (animalsCont) {
    let animalsHtml = "";

    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const rawFilename = p.getAttribute("filename") || "";
        const lowerName = rawFilename.toLowerCase();

        if (lowerName.includes("husbandry") || lowerName.includes("barn") || lowerName.includes("cow") || lowerName.includes("pig") || lowerName.includes("sheep") || lowerName.includes("chicken")) {
          const name = formatName(rawFilename);
          const farmId = p.getAttribute("farmId") || "1";
          const color = getFarmColor(farmId);
          
          const animalNode = p.querySelector("husbandryAnimals, animals");
          const count = animalNode ? (animalNode.getAttribute("numAnimals") || animalNode.children.length || "0") : "0";

          const foodNode = p.querySelector("husbandryFood, food");
          const foodLevel = foodNode ? Math.round(parseFloat(foodNode.getAttribute("totalAmount") || "0")) : null;
          const waterNode = p.querySelector("husbandryWater, water");
          const waterLevel = waterNode ? Math.round(parseFloat(waterNode.getAttribute("fillLevel") || "0")) : null;

          const foodText = foodLevel !== null ? `Food: ${foodLevel.toLocaleString()} L` : 'Food: OK';
          const waterText = waterLevel !== null ? `Water: ${waterLevel.toLocaleString()} L` : 'Water: OK';

          animalsHtml += `
            <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
              <i class="fa-solid fa-cow card-icon" style="color:${color};"></i>
              <div class="card-details" style="width:100%;">
                <strong style="color:${color};">${name}</strong>
                <span style="color:#ffffff; font-weight:600;"><i class="fa-solid fa-paw"></i> Animals Count: ${count} Head</span>
                <span class="card-subtext">${foodText} | ${waterText}</span>
              </div>
            </div>`;
        }
      });
    }

    animalsCont.innerHTML = animalsHtml || `<div class="empty-state">No Animal Husbandry Facilities Logged</div>`;
  }

  /* ------------------------------------------------------------------------
     CARD 6: CONSTRUCTION, ANTENNAS & DECORATIONS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const constructCont = document.getElementById('construction-container');
  if (constructCont) {
    let constructHtml = "";
    let objectCount = 0;

    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const rawFilename = p.getAttribute("filename") || "";
        const lowerName = rawFilename.toLowerCase();

        if (lowerName.includes("antenna") || lowerName.includes("sign") || lowerName.includes("lamp") || lowerName.includes("fence") || lowerName.includes("construction") || lowerName.includes("decoration")) {
          objectCount++;
          const name = formatName(rawFilename);
          const farmId = p.getAttribute("farmId") || "0";
          const color = getFarmColor(farmId);

          constructHtml += `
            <div class="telemetry-card" style="border-left: 3px solid ${color};">
              <i class="fa-solid fa-tower-cell card-icon" style="color:${color};"></i>
              <div class="card-details">
                <strong style="color:${color};">${name}</strong>
                <span>Placed Object #${objectCount} | Farm #${farmId}</span>
              </div>
            </div>`;
        }
      });
    }

    constructCont.innerHTML = `
      <div style="margin-bottom:0.5rem; padding:0.4rem 0.6rem; background:#0f172a; border-radius:6px; text-align:center;">
        <strong style="color:var(--accent-gold); font-size:0.9rem;">
          <i class="fa-solid fa-hammer"></i> Total Construction Objects Placed: ${objectCount}
        </strong>
      </div>
      ${constructHtml || `<div class="empty-state">No Placed Construction Objects Logged</div>`}`;
  }

  /* ------------------------------------------------------------------------
     CARD 7: PLAYER HAND TOOLS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const toolsXml = parseXML(fs25Node.handTools_raw);
  const toolsCont = document.getElementById('handtools-container');
  if (toolsCont) {
    let toolsHtml = "";
    if (toolsXml) {
      toolsXml.querySelectorAll("handTool").forEach(t => {
        const rawFilename = t.getAttribute("filename") || "Tool";
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
    toolsCont.innerHTML = toolsHtml || `<div class="empty-state">No Hand Tools Stored</div>`;
  }

  /* ------------------------------------------------------------------------
     CARD 8: FLEET MACHINERY & ATTACHMENT CHAINS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const vehXml = parseXML(fs25Node.vehicles_raw);
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

      let plateText = "";
      const plateNode = v.querySelector("licensePlate, licensePlates");
      if (plateNode) {
        plateText = plateNode.getAttribute("number") || plateNode.getAttribute("characters") || plateNode.textContent || "";
      }
      const plateBadge = plateText.trim() 
        ? `<span class="badge" style="border: 1px solid var(--accent-gold); color: var(--accent-gold);"><i class="fa-solid fa-id-card"></i> ${plateText.trim()}</span>` 
        : '';

      let driverBadge = `<span class="badge" style="background:rgba(148, 163, 184, 0.1); color:#94a3b8;">Parked / Unmanned</span>`;
      const isAiActive = v.getAttribute("aiIsStarted") === "true" || v.getAttribute("isAiJobActive") === "true";
      const activeUser = v.getAttribute("enteredUserGamertag") || v.getAttribute("driverName");

      if (activeUser) {
        driverBadge = `<span class="badge" style="background:rgba(34, 197, 94, 0.2); color:#4ade80;"><i class="fa-solid fa-user"></i> Driver: ${activeUser}</span>`;
      } else if (isAiActive) {
        driverBadge = `<span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15;"><i class="fa-solid fa-robot"></i> AI Worker Active</span>`;
      }

      let attachmentsList = [];
      v.querySelectorAll("attachedVehicle, attachment, implement").forEach(att => {
        const attRaw = att.getAttribute("filename") || att.getAttribute("name");
        if (attRaw) attachmentsList.push(formatName(attRaw));
      });
      const attachmentText = attachmentsList.length > 0 
        ? `<div class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-link"></i> Attached: ${attachmentsList.join(", ")}</div>` 
        : '';

      const fillUnit = v.querySelector("fillUnit");
      const fillType = fillUnit ? fillUnit.getAttribute("fillType") : null;
      const fillLevel = fillUnit ? Math.round(parseFloat(fillUnit.getAttribute("fillLevel") || "0")) : 0;
      const cargoText = (fillType && fillType !== "UNKNOWN" && fillLevel > 0) 
        ? `<div class="card-subtext"><i class="fa-solid fa-box-archive"></i> Hauling: ${formatName(fillType)} (${fillLevel.toLocaleString()} L)</div>` 
        : '';

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
            <span>Owner: Farm #${farmId} | Usage: ${operatingTime}</span>
            ${attachmentText}
            ${cargoText}
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

  /* ------------------------------------------------------------------------
     CARD 9: CONTRACTS & MISSIONS (DECOUPLED)
     ------------------------------------------------------------------------ */
  const missionsXml = parseXML(fs25Node.missions_raw);
  const missionsCont = document.getElementById('missions-container');
  if (missionsCont) {
    let missionsHtml = "";

    if (missionsXml) {
      missionsXml.querySelectorAll("mission, contract, item").forEach(m => {
        const rawType = m.getAttribute("type") || m.getAttribute("category") || m.getAttribute("name") || "Contract";
        const type = formatName(rawType);
        const reward = Math.round(parseFloat(m.getAttribute("reward") || m.getAttribute("payout") || "0"));
        const fieldId = m.getAttribute("fieldId") || m.getAttribute("field") || "N/A";
        const farmId = m.getAttribute("farmId") || "0";
        const color = getFarmColor(farmId);

        let rawStatus = (m.getAttribute("status") || m.getAttribute("state") || "Available").toUpperCase();
        let statusBadge = `<span class="badge" style="background:rgba(56, 189, 248, 0.2); color:#38bdf8; border:1px solid #38bdf8;">AVAILABLE</span>`;
        
        if (rawStatus.includes("RUNNING") || rawStatus.includes("ACTIVE") || rawStatus === "1") {
          statusBadge = `<span class="badge" style="background:rgba(34, 197, 94, 0.2); color:#4ade80; border:1px solid #4ade80;">IN PROGRESS</span>`;
        } else if (rawStatus.includes("FINISHED") || rawStatus.includes("SUCCESS") || rawStatus === "2") {
          statusBadge = `<span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15; border:1px solid #facc15;">READY FOR PAYOUT</span>`;
        }

        const fruitType = m.getAttribute("fruitTypeName") ? ` (${formatName(m.getAttribute("fruitTypeName"))})` : '';

        missionsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color};">
            <i class="fa-solid fa-file-contract card-icon" style="color:${color};"></i>
            <div class="card-details">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <strong style="color:${color};">${type} - Field #${fieldId}${fruitType}</strong>
                ${statusBadge}
              </div>
              <span>Reward: $${reward.toLocaleString()}</span>
            </div>
          </div>`;
      });
    }
    missionsCont.innerHTML = missionsHtml || `<div class="empty-state">No Server Contracts Generated Yet</div>`;
  }

  /* ------------------------------------------------------------------------
     CARD 10: MAP COLLECTIBLES (DECOUPLED)
     ------------------------------------------------------------------------ */
  const itemsXml = parseXML(fs25Node.items_raw);
  const collectiblesCont = document.getElementById('collectibles-container');
  if (collectiblesCont) {
    let collectiblesHtml = "";
    let totalCollectibles = 0;
    let foundCollectibles = 0;

    if (itemsXml) {
      const itemNodes = itemsXml.querySelectorAll("item, collectible");
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

  /* ------------------------------------------------------------------------
     CARD 11: MAP FACTORIES & PRODUCTIONS (DECOUPLED)
     ------------------------------------------------------------------------ */
  renderProductions(placeXml);

  /* ------------------------------------------------------------------------
     CARD 12: SERVER DIAGNOSTIC FEED (DECOUPLED)
     ------------------------------------------------------------------------ */
  renderTacticalLog(fs25Node.modErrors, fs25Node.serverEvents);
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

    let fillLevelsList = [];
    p.querySelectorAll("storage, fillLevel").forEach(fill => {
      const fillType = fill.getAttribute("fillType");
      const level = Math.round(parseFloat(fill.getAttribute("fillLevel") || "0"));
      if (fillType && level > 0) fillLevelsList.push(`${formatName(fillType)}: ${level.toLocaleString()} L`);
    });

    const storageText = fillLevelsList.length > 0 ? `<div class="card-subtext"><i class="fa-solid fa-boxes-stacked"></i> Stock: ${fillLevelsList.join(" | ")}</div>` : '';

    const matchedImg = resolveItemImage(rawFilename);
    const imgHtml = matchedImg 
      ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
      : `<i class="fa-solid fa-industry card-icon" style="color:${color};"></i>`;

    prodHtml += `
      <div class="telemetry-card" style="border-left: 3px solid ${color}; padding:0.85rem;">
        ${imgHtml}
        <div class="card-details" style="width:100%;">
          <strong style="color:${color};">${name}</strong>
          ${storageText}
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
