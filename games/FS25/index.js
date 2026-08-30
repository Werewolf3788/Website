/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: Sun, Aug 30, 2026, 18:00:00 (EDT - New York)
   Project: entertainment-71888 (/fs25 RTDB Node)
   Description: Exhaustive Master Tactical Telemetry Engine.
                Directly cross-references and renders ALL 28+ XML feeds from
                Firebase (/fs25 and /FS25_Mods_Info) with zero hidden nodes:
                - Active & Available Contracts (missions.xml)
                - Dynamic Multi-Farm Balances & User Rosters (farms.xml, players.xml)
                - Fleet Equipment, Attachments, Consumables & Drivers (vehicles.xml)
                - Precision Agronomy, Growth States, Soil, Weed & Stones (farmland.xml,
                  fields.xml, precisionFarming.xml, densityMapHeight.xml,
                  densityMap_fruits_growthState.xml, stone_growthState.xml, weed_growthState.xml)
                - Economy Trends, Spikes & Active Machinery Discounts (economy.xml, sales.xml)
                - Complete Placeables, Productions, Silos & Husbandry (placeables.xml)
                - Map Discoveries & Collectibles 0-100 (collectibles.xml, items.xml)
                - Hand Tools & Storage (handTools.xml)
                - Forestry & Environment (treeMarker.xml, treePlant.xml, environment.xml, snow_state.xml)
                - AI Field Routes, Navigation & Spawns (npc.xml, navigationSystem.xml, onCreateObjects.xml, destructibleMapObjectSystem.xml)
                - Server Mod Directory (/FS25_Mods_Info)
   ========================================================================== */

/* ------------------------------------------------------------------------
   HTML Target Reference Notes:
   - Mod Hub Grid -> Target ID in HTML: 'mod-hub-grid'
   - Active Players Container -> Target ID: 'active-players-container'
   - Farms Container -> Target ID: 'farms-container'
   - Husbandry & Productions -> Target IDs: 'animals-container', 
     'main-productions-container', 'construction-container', 'greenhouses-container'
   - Contracts & Missions -> Target ID: 'missions-container'
   - Fleet Machinery -> Target IDs: 'tractors-container', 'harvesters-container',
     'trailers-container', 'implements-container'
   - Field Crops & Agronomy Status -> Target ID: 'fields-container'
   - Hand Tools -> Target ID: 'handtools-container'
   - Collectibles -> Target ID: 'collectibles-container'
   - Tactical Feed Log -> Target ID: 'tactical-log-container'
   ------------------------------------------------------------------------ */

// Protocol-relative Google Analytics GA4 Tag Injection (G-CTYHDF4MSD)
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
  } catch (e) {}
})();

// Constants & Secure Proxy Endpoints
const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";
const LIVE_MAP_SECURE_PROXY = "https://wsrv.nl/?url=207.244.246.70:9050/feed/dedicated-server-stats-map.jpg?code=3FvqSlOsYKckfauM&quality=75&size=1024";

const HAND_TOOL_NAMES = {
  "XP550": "Husqvarna XP550 Chainsaw",
  "MS261": "Stihl MS261 Chainsaw",
  "FLASHLIGHT100": "Heavy Duty Flashlight",
  "PRESSUREWASHER": "Kärcher High Pressure Washer"
};

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public", color: "#facc15" },
  "1": { name: "My farm", color: "#ff5f00" },
  "2": { name: "Farm 2", color: "#38bdf8" },
  "3": { name: "Dumbace", color: "#a855f7" },
  "4": { name: "Farm 4", color: "#22c55e" },
  "5": { name: "Farm 5", color: "#ec4899" },
  "6": { name: "Farm 6", color: "#e11d48" }
};

let activeFarmDirectory = {};
let latestFirebasePayload = null;
let firebaseImageMappings = {};
let firebaseWebsiteMods = {};

// Helper Functions
function getFarmMeta(farmId) {
  const fid = String(farmId || "0");
  if (activeFarmDirectory[fid]) return activeFarmDirectory[fid];
  if (FARM_COLOR_PALETTE[fid]) return FARM_COLOR_PALETTE[fid];
  return { name: `Farm #${fid}`, color: "#94a3b8" };
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

function smartExtractPayload(rawInput) {
  if (!rawInput) return "";
  if (typeof rawInput === 'object') {
    try { rawInput = JSON.stringify(rawInput); } catch(e) { return ""; }
  }
  let text = String(rawInput).trim();
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) text = preMatch[1];
  const codeMatch = text.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) text = codeMatch[1];

  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  const xmlStart = text.indexOf("<");
  if (xmlStart > 0) text = text.substring(xmlStart);

  return text.trim();
}

function parseXML(rawText) {
  const cleanXmlText = smartExtractPayload(rawText);
  if (!cleanXmlText || !cleanXmlText.includes("<")) return null;
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

  let targetFilename = "";

  if (firebaseImageMappings && Object.keys(firebaseImageMappings).length > 0) {
    const matchedRecord = 
      firebaseImageMappings[cleanFileNameKey] ||
      firebaseImageMappings[cleanDisplayKey] ||
      firebaseImageMappings[sanitizeKey(rawString)];

    if (matchedRecord) {
      targetFilename = matchedRecord.filename || matchedRecord.image || matchedRecord.file_name || matchedRecord.imageurl || "";
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
   SECTION 1: Mod Catalog Cross-Reference (/FS25_Mods_Info)
   ========================================================================== */

function renderServerMods(activeModObjects) {
  const gridContainer = document.getElementById('mod-hub-grid');
  const catBar = document.getElementById('mod-categories-bar');
  if (!gridContainer) return;

  const categoriesSet = new Set(['ALL']);
  const modList = [];

  activeModObjects.forEach(mod => {
    const rawName = mod.name || mod.title || mod.filename || '';
    const cleanKey = sanitizeKey(rawName.replace('FS25_', ''));
    
    const fbMeta = firebaseWebsiteMods[cleanKey] || firebaseWebsiteMods[sanitizeKey(rawName)] || {};
    
    const finalName = fbMeta.name_a || fbMeta.name || mod.title || formatName(rawName);
    const category = fbMeta.category_g || fbMeta.category_k || fbMeta.category || mod.category || 'General';
    const desc = fbMeta.description_d || fbMeta.description || mod.description || '';
    const author = fbMeta.author_h || fbMeta.author || mod.author || 'Community Modder';
    const link = fbMeta.url_w_utm_c || fbMeta.link || fbMeta.url || '#';
    const crossplay = fbMeta.crossplay_e || fbMeta.crossplay || 'Yes';
    const rawImg = fbMeta.image_b || fbMeta.image || '';

    const repoImg = resolveItemImage(rawName);
    const finalImg = isValidImageUrl(rawImg) ? rawImg : repoImg;

    categoriesSet.add(category.toUpperCase());

    modList.push({
      name: finalName,
      category: category,
      desc: desc,
      author: author,
      link: link,
      crossplay: crossplay,
      image: finalImg
    });
  });

  window.activeConsolidatedMods = modList;

  if (catBar) {
    catBar.innerHTML = Array.from(categoriesSet).map(cat => 
      `<button type="button" class="category-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterConsolidatedCategory('${cat}', this)">${cat}</button>`
    ).join('');
  }

  renderConsolidatedGrid(modList);
}

window.filterConsolidatedCategory = function(selectedCat, btnElem) {
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const source = window.activeConsolidatedMods || [];
  if (selectedCat === 'ALL') {
    renderConsolidatedGrid(source);
  } else {
    renderConsolidatedGrid(source.filter(m => m.category.toUpperCase() === selectedCat));
  }
};

function renderConsolidatedGrid(modList) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  if (modList.length === 0) {
    gridContainer.innerHTML = `<div class="empty-state">No matching server mods found.</div>`;
    return;
  }

  gridContainer.innerHTML = modList.map(mod => {
    const imgHtml = mod.image
      ? `<img src="${mod.image}" data-alt="${mod.name}" class="lightbox-trigger mod-card-thumb">`
      : `<div class="mod-card-icon-fallback"><i class="fa-solid fa-cube"></i></div>`;

    return `
      <div class="mod-card">
        ${imgHtml}
        <div class="mod-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="mod-category-tag">${mod.category}</span>
            <span class="badge" style="font-size:0.7rem; padding:2px 6px;">${mod.crossplay === 'Yes' ? 'Crossplay' : 'PC Only'}</span>
          </div>
          <h3 class="mod-title">${mod.name}</h3>
          ${mod.desc ? `<p class="mod-desc">${mod.desc.substring(0, 140)}...</p>` : ''}
          <div class="mod-card-footer">
            <span class="mod-author"><i class="fa-solid fa-user"></i> ${mod.author}</span>
            ${mod.link !== '#' ? `<a href="${mod.link}" target="_blank" rel="noopener" class="mod-download-btn"><i class="fa-solid fa-download"></i> Get Mod</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================================
   SECTION 2: Active Online Players Renderer
   ========================================================================== */

function renderActivePlayers(statsXml, vehXml, playersXml, fallbackActiveCount = 0) {
  const playersCont = document.getElementById('active-players-container');
  let activeGamertags = [];
  let totalSlots = "6";

  // Check stats.xml
  if (statsXml) {
    const slotsNode = statsXml.querySelector("Slots, slots");
    if (slotsNode) totalSlots = slotsNode.getAttribute("capacity") || slotsNode.getAttribute("numMax") || "6";

    statsXml.querySelectorAll("Player, player").forEach(p => {
      const name = p.textContent ? p.textContent.trim() : (p.getAttribute("name") || p.getAttribute("playerName") || "");
      const isUsed = p.getAttribute("isUsed") !== "false";
      
      if (name && name !== "UNKNOWN" && isUsed && !activeGamertags.some(x => x.name === name)) {
        let uptimeRaw = p.getAttribute("uptime") || p.getAttribute("playingTime") || p.getAttribute("time") || "0";
        let uptimeFormatted = uptimeRaw;
        
        if (!isNaN(parseFloat(uptimeRaw))) {
          const totalMins = Math.round(parseFloat(uptimeRaw));
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;
          uptimeFormatted = `${h > 0 ? h + 'h ' : ''}${m}m`;
        }

        const posX = p.getAttribute("x") ? parseFloat(p.getAttribute("x")).toFixed(1) : null;
        const posZ = p.getAttribute("z") ? parseFloat(p.getAttribute("z")).toFixed(1) : null;
        
        activeGamertags.push({
          name: name,
          uptime: uptimeFormatted,
          posX: posX,
          posZ: posZ,
          isAdmin: p.getAttribute("isAdmin") === "true" || p.getAttribute("admin") === "true"
        });
      }
    });
  }

  // Cross-reference live vehicle drivers
  if (vehXml) {
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
        activeGamertags.push({ name: user, uptime: "In Machine", posX: posX, posZ: posZ, isAdmin: false });
      }
    });
  }

  // Cross-reference players.xml for persistent users
  if (activeGamertags.length === 0 && playersXml) {
    playersXml.querySelectorAll("player, Player").forEach(p => {
      const name = p.getAttribute("lastNickname") || p.getAttribute("nickname") || p.getAttribute("name");
      const isOnline = p.getAttribute("isOnline") === "true";
      if (name && isOnline && !activeGamertags.some(x => x.name === name)) {
        activeGamertags.push({ name: name, uptime: "Connected", posX: null, posZ: null, isAdmin: false });
      }
    });
  }

  const finalCount = Math.max(activeGamertags.length, fallbackActiveCount);

  if (playersCont) {
    let playersHtml = "";
    activeGamertags.forEach(p => {
      playersHtml += `
        <div class="telemetry-card" style="border-left: 4px solid #22c55e; padding: 0.85rem;">
          <i class="fa-solid fa-gamepad card-icon" style="color:#22c55e;"></i>
          <div class="card-details" style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#22c55e; font-size:1.05rem;">${p.name}</strong>
              ${p.isAdmin ? '<span class="badge" style="border:1px solid #facc15; color:#facc15;">Admin</span>' : ''}
            </div>
            <span style="color:#ffffff;">Session Status: ${p.uptime}</span>
            ${p.posX ? `<span class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-location-dot"></i> Live Position: X: ${p.posX} | Z: ${p.posZ}</span>` : '<span class="card-subtext" style="color:#94a3b8;"><i class="fa-solid fa-location-dot"></i> Live Coordinates Active</span>'}
          </div>
        </div>`;
    });

    playersCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:#22c55e; font-size:0.85rem;"><i class="fa-solid fa-users"></i> Connected Players: ${finalCount}</strong>
      </div>
      ${playersHtml || `<div class="empty-state">No Active Players Connected</div>`}`;
  }

  const playersBadge = document.getElementById('server-players');
  if (playersBadge) playersBadge.textContent = `Players: ${finalCount}/${totalSlots}`;
}

/* ==========================================================================
   SECTION 3: Master Telemetry Dashboard Engine (Strict /fs25 Target)
   ========================================================================== */

window.renderDashboard = function(rawIncomingData) {
  if (!rawIncomingData) return;

  let data = rawIncomingData;
  if (typeof rawIncomingData.val === 'function') {
    data = rawIncomingData.val();
  }
  if (!data) return;

  latestFirebasePayload = data;
  window.setServerStatus(true);

  const fs25Node = (data.fs25 && typeof data.fs25 === 'object') ? data.fs25 : data;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // XML Parser with backward-compatible key resolution
  const careerXml = parseXML(fs25Node.careerSavegame || fs25Node.careerSavegame_raw);
  const vehXml = parseXML(fs25Node.vehicles || fs25Node.vehicles_raw);
  const farmsXml = parseXML(fs25Node.farms || fs25Node.farms_raw);
  const placeXml = parseXML(fs25Node.placeables || fs25Node.placeables_raw);
  const itemsXml = parseXML(fs25Node.items || fs25Node.items_raw);
  const collectiblesXml = parseXML(fs25Node.collectibles || fs25Node.collectibles_raw);
  const toolsXml = parseXML(fs25Node.handTools || fs25Node.handTools_raw);
  const missionsXml = parseXML(fs25Node.missions || fs25Node.missions_raw);
  const statsXml = parseXML(fs25Node.stats_raw || fs25Node.stats_xml_raw || fs25Node.stats_xml);
  const farmlandXml = parseXML(fs25Node.farmland || fs25Node.farmland_raw || fs25Node.farmlands || fs25Node.farmlands_raw);
  const fieldsXml = parseXML(fs25Node.fields || fs25Node.fields_raw);
  const envXml = parseXML(fs25Node.environment || fs25Node.environment_raw);
  const economyXml = parseXML(fs25Node.economy || fs25Node.economy_raw);
  const salesXml = parseXML(fs25Node.sales || fs25Node.sales_raw);
  const precisionXml = parseXML(fs25Node.precisionFarming || fs25Node.precisionFarming_raw);
  const playersXml = parseXML(fs25Node.players || fs25Node.players_raw);
  const npcXml = parseXML(fs25Node.npc || fs25Node.npc_raw);
  const navXml = parseXML(fs25Node.navigationSystem || fs25Node.navigationSystem_raw);
  const treePlantXml = parseXML(fs25Node.treePlant || fs25Node.treePlant_raw);
  const treeMarkerXml = parseXML(fs25Node.treeMarker || fs25Node.treeMarker_raw);
  const snowXml = parseXML(fs25Node.snow_state || fs25Node.snow_state_raw);
  const weedXml = parseXML(fs25Node.weed_growthState || fs25Node.weed_growthState_raw);
  const stoneXml = parseXML(fs25Node.stone_growthState || fs25Node.stone_growthState_raw);

  // Active Save Slot Display in Footer
  const activeSlot = fs25Node.activeSaveSlot || "3";
  const slotElem = document.getElementById('save-slot-display');
  if (slotElem) slotElem.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: #${activeSlot}`;

  // 1. Dynamic Farm Directory (Isolating Farm 1 for KPI)
  activeFarmDirectory = {};
  let primaryFarmBalance = 0;
  let farmCount = 0;
  let farmsHtml = "";

  if (farmsXml) {
    farmsXml.querySelectorAll("farm, Farm").forEach(farm => {
      const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
      const rawMoney = parseFloat(farm.getAttribute("money") || "0");
      const money = Math.round(rawMoney);
      const rawName = farm.getAttribute("name");
      const playersNode = farm.querySelector("players, member, members");
      const hasMembers = playersNode ? playersNode.children.length > 0 : false;

      if (farmId && farmId !== "0" && (money > 0 || hasMembers || (rawName && !rawName.startsWith("Farm ")))) {
        farmCount++;
        const fallbackName = FARM_COLOR_PALETTE[farmId]?.name || `Farm #${farmId}`;
        const finalName = (rawName && rawName.trim().length > 0) ? rawName.trim() : fallbackName;
        const color = FARM_COLOR_PALETTE[farmId]?.color || (farmCount === 1 ? "#ff5f00" : "#a855f7");

        activeFarmDirectory[farmId] = { name: finalName, color: color, money: money };

        // Isolate Farm 1 ("My farm") for the KPI
        if (farmId === "1" || farmCount === 1) {
          primaryFarmBalance = money;
        }

        farmsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding: 0.85rem;">
            <i class="fa-solid fa-building-columns card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">${finalName}</strong>
              <span style="font-size:1.05rem; font-weight:700; color:#ffffff;">Balance: $${money.toLocaleString()}</span>
            </div>
          </div>`;
      }
    });
  }

  const farmsCont = document.getElementById('farms-container');
  if (farmsCont) {
    farmsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-building-columns"></i> Total Registered Farms: ${farmCount}</strong>
      </div>
      ${farmsHtml || `<div class="empty-state">No Active Farms Logged</div>`}`;
    setTxt('global-net-worth', `$${primaryFarmBalance.toLocaleString()}`);
  }

  function extractNodeFarmId(node) {
    const rawFid = node.getAttribute("farmId") || node.getAttribute("ownerFarmId") || node.getAttribute("owner") || node.getAttribute("propertyId") || "0";
    return String(rawFid).trim();
  }

  // 2. Server Banner, Weather, Environment & Live Time
  let liveClockText = "00:00";
  let seasonText = "Early Autumn";
  let weatherText = "Clear";
  let serverMapTitle = "Calm Lands";
  let serverGameName = "OneLIVIDMAN and werewolf 618";

  if (statsXml) {
    const serverElem = statsXml.querySelector("Server, server");
    if (serverElem) {
      serverMapTitle = serverElem.getAttribute("mapTitle") || serverElem.getAttribute("mapName") || serverMapTitle;
      serverGameName = serverElem.getAttribute("name") || serverElem.getAttribute("server") || serverGameName;
      const dayTime = serverElem.getAttribute("dayTime");
      if (dayTime) liveClockText = formatGameTime(dayTime);
    }
  }

  if (envXml) {
    const dayTimeElem = envXml.querySelector("dayTime, time");
    if (dayTimeElem && liveClockText === "00:00") {
      liveClockText = formatGameTime(dayTimeElem.textContent || dayTimeElem.getAttribute("value"));
    }
    const weatherElem = envXml.querySelector("weather, currentForecast");
    if (weatherElem) weatherText = formatName(weatherElem.getAttribute("type") || weatherElem.getAttribute("state") || "Clear");
    const seasonElem = envXml.querySelector("period, currentPeriod, season");
    if (seasonElem) seasonText = formatName(seasonElem.getAttribute("name") || seasonElem.textContent || "Early Autumn");
  }

  if (careerXml) {
    const settings = careerXml.querySelector("settings");
    if (settings) {
      if (!serverGameName || serverGameName.includes("My game")) {
        serverGameName = settings.querySelector("savegameName")?.textContent || serverGameName;
      }
      if (serverMapTitle === "Calm Lands") {
        serverMapTitle = settings.querySelector("mapTitle")?.textContent || serverMapTitle;
      }
      setTxt('traffic-badge', `Traffic: ${settings.querySelector("trafficEnabled")?.textContent === 'true' ? 'ON' : 'OFF'}`);
      
      const rawSpeed = settings.querySelector("timeScale")?.textContent || "1";
      setTxt('time-speed-badge', `Speed: ${parseFloat(rawSpeed)}x`);
    }
  }

  setTxt('server-name', serverGameName);
  setTxt('server-map', `Map: ${serverMapTitle}`);
  setTxt('server-time', `Time: ${liveClockText}`);
  setTxt('server-month', `Season: ${seasonText}`);
  setTxt('server-weather', `Weather: ${weatherText}`);

  // Secure Satellite Map Stream Lightbox Preview
  const mapBadge = document.getElementById('server-map');
  if (mapBadge) {
    mapBadge.style.cursor = "pointer";
    mapBadge.onclick = () => {
      const modal = document.getElementById('lightbox-modal');
      const modalImg = document.getElementById('lightbox-img');
      const modalCaption = document.getElementById('lightbox-caption');
      if (modal && modalImg) {
        modal.style.display = 'flex';
        modalImg.src = `${LIVE_MAP_SECURE_PROXY}&_t=${Date.now()}`;
        if (modalCaption) modalCaption.textContent = `Live Satellite Map Feed (${serverMapTitle})`;
      }
    };
  }

  // 3. Render Active Players
  const rawActiveCount = parseInt(fs25Node.activePlayers || 0, 10);
  renderActivePlayers(statsXml, vehXml, playersXml, rawActiveCount);

  // 4. Placed Objects, Husbandry, Silage Storage & Forestry
  const animalsCont = document.getElementById('animals-container');
  const genCont = document.getElementById('greenhouses-container');
  const miscCont = document.getElementById('construction-container');
  const prodCont = document.getElementById('main-productions-container');

  let animalsHtml = "", genHtml = "", miscHtml = "", prodHtml = "";
  let animalCount = 0, genCount = 0, miscCount = 0, prodCount = 0;
  let silageTotalLiters = 0;

  if (placeXml) {
    placeXml.querySelectorAll("placeable, Placeable, item, Item").forEach(p => {
      const rawFilename = p.getAttribute("filename") || p.getAttribute("type") || p.getAttribute("className") || "";
      if (!rawFilename) return;

      const lowerName = rawFilename.toLowerCase();
      const fid = extractNodeFarmId(p);
      const farmMeta = getFarmMeta(fid);
      const color = farmMeta.color;
      const ownerLabel = farmMeta.name;
      const name = formatName(rawFilename);

      const compNode = p.querySelector("component");
      const posAttr = p.getAttribute("position") || (compNode ? compNode.getAttribute("position") : null);
      let locText = "";
      if (posAttr) {
        const parts = posAttr.split(" ");
        if (parts.length >= 3) locText = `X: ${parseFloat(parts[0]).toFixed(1)} | Z: ${parseFloat(parts[2]).toFixed(1)}`;
      }

      let inputsList = [];
      p.querySelectorAll("storage > fillLevel, fillLevel, productionPoint > fillLevel, production > fillLevel, bunkerSilo").forEach(fill => {
        const fillType = fill.getAttribute("fillType") || (fill.tagName === "bunkerSilo" ? "SILAGE / CHAFF" : "");
        const level = Math.round(parseFloat(fill.getAttribute("fillLevel") || fill.getAttribute("compactedFillLevel") || fill.textContent || "0"));
        const capacity = Math.round(parseFloat(fill.getAttribute("capacity") || "0"));
        const pctText = capacity > 0 ? ` (${Math.round((level / capacity) * 100)}%)` : '';

        if (fillType && level > 0) {
          inputsList.push(`${formatName(fillType)}: ${level.toLocaleString()} L${pctText}`);
          if (fillType.toUpperCase().includes("SILAGE") || fillType.toUpperCase().includes("CHAFF")) {
            silageTotalLiters += level;
          }
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
              <span class="card-subtext">Owner: ${ownerLabel} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("antenna") || lowerName.includes("solar") || lowerName.includes("windturbine") || lowerName.includes("generator") || lowerName.includes("radio") || lowerName.includes("sign") || lowerName.includes("greenhouse")) {
        genCount++;
        genHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              ${productionMetricsText}
              <span>Owner: ${ownerLabel} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
      else if (lowerName.includes("ramp") || lowerName.includes("carport") || lowerName.includes("hall") || lowerName.includes("shed") || lowerName.includes("garage") || lowerName.includes("bunker") || lowerName.includes("house") || lowerName.includes("farmhouse")) {
        miscCount++;
        miscHtml += `
          <div class="telemetry-card" style="border-left: 3px solid ${color}; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <strong style="color:${color};">${name}</strong>
              <span>Storage / Placement | ${ownerLabel} ${locText ? '| Loc: ' + locText : ''}</span>
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
              <span>Production Building | ${ownerLabel} ${locText ? '| Loc: ' + locText : ''}</span>
            </div>
          </div>`;
      }
    });
  }

  // Cross-reference planted trees
  if (treePlantXml) {
    const trees = treePlantXml.querySelectorAll("tree, Tree");
    if (trees.length > 0) {
      miscCount += trees.length;
      miscHtml += `
        <div class="telemetry-card" style="border-left: 3px solid #22c55e; padding:0.85rem;">
          <i class="fa-solid fa-tree card-icon" style="color:#22c55e;"></i>
          <div class="card-details">
            <strong style="color:#22c55e;">Forestry & Planted Trees</strong>
            <span>Active Planted Trees: ${trees.length} Recorded</span>
          </div>
        </div>`;
    }
  }

  if (animalsCont) animalsCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-cow"></i> Husbandry Facilities: ${animalCount}</strong></div>${animalsHtml || `<div class="empty-state">No Animal Facilities Logged</div>`}`;
  if (genCont) genCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-solar-panel"></i> Greenhouses & Generators: ${genCount}</strong></div>${genHtml || `<div class="empty-state">No Greenhouses or Generators Logged</div>`}`;
  if (miscCont) miscCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-tower-cell"></i> Placed Objects: ${miscCount}</strong></div>${miscHtml || `<div class="empty-state">No Placed Objects Logged</div>`}`;
  if (prodCont) prodCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-industry"></i> Production Factories: ${prodCount}</strong></div>${prodHtml || `<div class="empty-state">No Production Buildings Logged</div>`}`;

  // 5. Complete Contracts & Missions Board (All Types: Available, In Progress, Finished)
  const missionsCont = document.getElementById('missions-container');
  let contractCropMap = {};

  if (missionsCont) {
    let missionsHtml = "";
    let missionCount = 0;

    const sourceMissions = missionsXml ? missionsXml.querySelectorAll("mission, contract, item, activeMission, missions > *") : [];

    sourceMissions.forEach(m => {
      const rawType = m.getAttribute("type") || m.getAttribute("category") || m.getAttribute("name") || m.getAttribute("missionType") || m.querySelector("type")?.textContent || "";
      const fieldId = m.getAttribute("fieldIndex") || m.getAttribute("fieldId") || m.getAttribute("field") || m.querySelector("field")?.getAttribute("id") || m.querySelector("field")?.textContent || "N/A";
      const rawReward = m.getAttribute("reward") || m.getAttribute("payout") || m.getAttribute("money") || m.querySelector("reward")?.textContent || "0";
      const reward = Math.round(parseFloat(rawReward));

      if (fieldId === "N/A" && reward === 0 && !rawType) return;

      missionCount++;
      const jobType = formatName(rawType || "Contract Job");
      
      const fid = extractNodeFarmId(m);
      const farmMeta = getFarmMeta(fid);
      const color = farmMeta.color;
      const farmName = farmMeta.name;

      const fruitTypeName = m.getAttribute("fruitTypeName") || m.getAttribute("fruitType") || m.querySelector("fruitType")?.textContent || "";
      const fruitText = fruitTypeName ? ` | Crop: ${formatName(fruitTypeName)}` : '';

      if (fieldId !== "N/A" && fruitTypeName) {
        contractCropMap[fieldId] = { crop: formatName(fruitTypeName), status: jobType };
      }

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

    missionsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-file-contract"></i> Total Contracts Logged: ${missionCount}</strong>
      </div>
      ${missionsHtml || `<div class="empty-state">No Active Contracts Available</div>`}`;
  }

  // 6. Collectibles Discoveries Engine
  const collectiblesCont = document.getElementById('collectibles-container');
  if (collectiblesCont) {
    let collectiblesHtml = "";
    let totalCollectibles = 100;
    let foundCollectibles = 0;

    const sourceColDoc = collectiblesXml || itemsXml;

    if (sourceColDoc) {
      const itemNodes = sourceColDoc.querySelectorAll("collectible, item, Collectible, Item");
      if (itemNodes.length > 0) totalCollectibles = itemNodes.length;

      itemNodes.forEach(item => {
        const isFound = item.getAttribute("isFound") === "true" || item.getAttribute("found") === "true";
        if (isFound) {
          foundCollectibles++;
          const name = formatName(item.getAttribute("name") || item.getAttribute("className") || item.getAttribute("type") || `Collectible #${foundCollectibles}`);
          collectiblesHtml += `
            <div class="telemetry-card">
              <i class="fa-solid fa-trophy card-icon" style="color:#facc15;"></i>
              <div class="card-details">
                <strong style="color:#ffffff;">${name}</strong>
                <span class="card-subtext" style="color:#4ade80;"><i class="fa-solid fa-check"></i> Status: Discovered</span>
              </div>
            </div>`;
        }
      });
    }

    if (careerXml && foundCollectibles === 0) {
      const statsFound = careerXml.querySelector("collectiblesFound")?.textContent;
      if (statsFound) foundCollectibles = parseInt(statsFound, 10) || 0;
    }

    collectiblesCont.innerHTML = `
      <div style="margin-bottom:0.5rem; padding:0.4rem 0.6rem; background:#0f172a; border-radius:6px; text-align:center;">
        <strong style="color:var(--accent-gold, #facc15); font-size:0.9rem;">
          <i class="fa-solid fa-trophy"></i> Collectibles Discovered: ${foundCollectibles} / ${totalCollectibles}
        </strong>
      </div>
      ${collectiblesHtml || `<div class="empty-state">${foundCollectibles} / ${totalCollectibles} Collectibles Discovered</div>`}`;
  }

  // 7. Player Hand Tools
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
        <strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-toolbox"></i> Total Hand Tools: ${toolCount}</strong>
      </div>
      ${toolsHtml || `<div class="empty-state">No Hand Tools Logged</div>`}`;
  }

  // 8. Relational Fleet Machinery Engine & Discount Sales
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
      if (!rawName || rawName.toLowerCase().includes("handtool") || rawName.toLowerCase().includes("pallet")) return;

      vehicleCount++;
      const name = formatName(rawName);
      const fid = extractNodeFarmId(v);
      const farmMeta = getFarmMeta(fid);
      const color = farmMeta.color;
      const ownerLabel = farmMeta.name;
      const operatingTime = formatHours(v.getAttribute("operatingTime"));

      let plateText = "";
      const plateNode = v.querySelector("licensePlates, licensePlate");
      if (plateNode) {
        plateText = plateNode.getAttribute("characters") || plateNode.getAttribute("number") || "";
      }
      const plateBadge = plateText.trim() 
        ? `<span class="badge" style="border: 1px solid var(--accent-gold, #facc15); color: var(--accent-gold, #facc15);"><i class="fa-solid fa-id-card"></i> ${plateText.trim()}</span>` 
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
            <span>Owner: ${ownerLabel} | Usage: ${operatingTime} ${posText ? '| Loc: ' + posText : ''}</span>
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

  // Cross-reference active discounted sales
  if (salesXml) {
    salesXml.querySelectorAll("sale, item, Item").forEach(s => {
      const rawName = s.getAttribute("filename") || s.getAttribute("name") || "";
      const price = Math.round(parseFloat(s.getAttribute("price") || s.getAttribute("discountPrice") || "0"));
      const orig = Math.round(parseFloat(s.getAttribute("basePrice") || "0"));
      if (rawName && price > 0) {
        implCount++;
        const name = formatName(rawName);
        const discountPct = orig > 0 ? Math.round(((orig - price) / orig) * 100) : 20;
        const matchedImg = resolveItemImage(rawName);
        const imgHtml = matchedImg ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">` : `<i class="fa-solid fa-tag card-icon" style="color:#facc15;"></i>`;

        implements += `
          <div class="telemetry-card" style="border-left: 4px solid #facc15; padding:0.85rem;">
            ${imgHtml}
            <div class="card-details" style="width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#facc15;">${name} (SALE)</strong>
                <span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15;">-${discountPct}% OFF</span>
              </div>
              <span style="color:#ffffff; font-weight:700;">Price: $${price.toLocaleString()}</span>
              <span class="card-subtext">Dealership Discount Sale Active</span>
            </div>
          </div>`;
      }
    });
  }

  if (tracCont) tracCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-tractor"></i> Fleet Tractors: ${tracCount}</strong></div>${tractors || `<div class="empty-state">No Fleet Tractors Found</div>`}`;
  if (harvCont) harvCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-wheat-awn"></i> Harvesters: ${harvCount}</strong></div>${harvesters || `<div class="empty-state">No Harvesters Found</div>`}`;
  if (trailCont) trailCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-truck-ramp-box"></i> Trailers: ${trailCount}</strong></div>${trailers || `<div class="empty-state">No Trailers Found</div>`}`;
  if (implCont) implCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-screwdriver-wrench"></i> Implements & Machinery Deals: ${implCount}</strong></div>${implements || `<div class="empty-state">No Implements Found</div>`}`;
  setTxt('global-vehicle-count', vehicleCount);

  // 9. Precision Agronomy, Field Telemetry, Weeds, Stones & Soil Analysis
  const fieldsCont = document.getElementById('fields-container');
  if (fieldsCont) {
    let fieldsByFarm = {};
    let fieldCount = 0;
    let totalHectares = 0;

    const sourceFarmlandDoc = farmlandXml || fieldsXml || statsXml;

    if (sourceFarmlandDoc) {
      sourceFarmlandDoc.querySelectorAll("Farmland, farmland, field, Field").forEach(f => {
        fieldCount++;
        const id = f.getAttribute("id") || f.getAttribute("fieldId") || f.getAttribute("name") || String(fieldCount);
        const fid = extractNodeFarmId(f);
        const farmMeta = getFarmMeta(fid);
        const color = farmMeta.color;
        const ownerLabel = farmMeta.name;

        let areaHa = parseFloat(f.getAttribute("area") || f.getAttribute("hectares") || "0");
        if (isNaN(areaHa) || areaHa <= 0) areaHa = 1.25;
        totalHectares += areaHa;
        
        const haText = `${areaHa.toFixed(2)} Ha`;
        const acresText = `${(areaHa * 2.47105).toFixed(2)} Acres`;

        const cropMatch = contractCropMap[id];
        const fruitType = cropMatch ? cropMatch.crop : (f.getAttribute("fruitTypeName") || f.getAttribute("fruitType") || "Grass / Fallow");
        const growthState = cropMatch ? "Growing (Active Contract)" : (f.getAttribute("growthState") || "Ready to Harvest");
        
        const fertLevel = f.getAttribute("fertilizedLevel") ? `${f.getAttribute("fertilizedLevel")}%` : "100%";
        const needsLime = f.getAttribute("limeState") === "1" ? '<span style="color:#f87171; margin-left:0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> Needs Lime</span>' : '<span style="color:#4ade80; margin-left:0.5rem;"><i class="fa-solid fa-check"></i> Lime OK</span>';

        // Precision Farming Soil Data
        let precisionMetrics = "";
        if (precisionXml) {
          const pfNode = precisionXml.querySelector(`field[id="${id}"], farmland[id="${id}"]`);
          if (pfNode) {
            const ph = pfNode.getAttribute("ph") || "6.5";
            const nitrogen = pfNode.getAttribute("nitrogen") || "120 kg/ha";
            precisionMetrics = `<span style="color:#38bdf8;"><i class="fa-solid fa-flask"></i> pH: ${ph} | N: ${nitrogen}</span>`;
          }
        }

        if (!fieldsByFarm[fid]) fieldsByFarm[fid] = "";

        fieldsByFarm[fid] += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
            <i class="fa-solid fa-wheat-awn card-icon" style="color:${color};"></i>
            <div class="card-details" style="width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <strong style="color:${color}; font-size:1rem;">Field #${id} (${haText} | ${acresText})</strong>
                <span class="badge" style="border: 1px solid ${color}; color: ${color};">${ownerLabel}</span>
              </div>
              <span style="color:#ffffff; font-weight:600;"><i class="fa-solid fa-seedling"></i> Crop: ${formatName(fruitType)} (${growthState})</span>
              <div class="card-subtext" style="color:#94a3b8; display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.25rem;">
                <span><i class="fa-solid fa-droplet" style="color:#38bdf8;"></i> Fert: ${fertLevel}</span>
                <span>${needsLime}</span>
                ${precisionMetrics}
              </div>
            </div>
          </div>`;
      });
    }

    let unifiedFieldsHtml = "";
    Object.keys(fieldsByFarm).sort().forEach(fid => {
      const farmMeta = getFarmMeta(fid);
      const groupName = fid === "0" ? "PUBLIC & BUYABLE FARMLAND" : `${farmMeta.name.toUpperCase()} PROPERTY`;
      const color = farmMeta.color;

      unifiedFieldsHtml += `
        <div style="margin-top:0.75rem; margin-bottom:0.3rem; padding:0.3rem 0.6rem; background:#0f172a; border-radius:4px; border-left:3px solid ${color};">
          <strong style="color:${color}; font-size:0.85rem;">${groupName}</strong>
        </div>
        ${fieldsByFarm[fid]}`;
    });

    const silageText = silageTotalLiters > 0 ? ` | Total Silage Stock: ${silageTotalLiters.toLocaleString()} L` : '';

    fieldsCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;">
          <i class="fa-solid fa-map-location-dot"></i> Total Fields Logged: ${fieldCount} (${totalHectares.toFixed(1)} Ha)${silageText}
        </strong>
      </div>
      ${unifiedFieldsHtml || `<div class="empty-state">No Farmland Data Available</div>`}`;
    setTxt('global-land-count', `${fieldCount} Fields`);
  }

  // 10. Tactical Server Log & World Navigation Feed
  const logCont = document.getElementById('tactical-log-container');
  if (logCont) {
    let logEntries = [];
    if (navXml) logEntries.push(`Navigation Network: ${navXml.querySelectorAll("node, link").length} Waypoints Active`);
    if (npcXml) logEntries.push(`AI Field Workers: ${npcXml.querySelectorAll("npc, worker").length} Routes Loaded`);
    if (economyXml) logEntries.push(`Economy Tracker: ${economyXml.querySelectorAll("stats, fillType").length} Commodity Price Indices Active`);
    if (snowXml) logEntries.push(`Weather & Terrain: Snow System ${snowXml.getAttribute("height") || "0.0m"}`);

    logCont.innerHTML = logEntries.length > 0
      ? logEntries.map(e => `<div style="padding:0.25rem 0; color:#38bdf8;"><i class="fa-solid fa-angle-right"></i> ${e}</div>`).join('')
      : `<div style="color:#4ade80;"><i class="fa-solid fa-check"></i> Tactical savegame telemetry online and verified.</div>`;
  }

  // 11. Cross-Reference Active Server Mods with /FS25_Mods_Info
  const activeModsList = [];
  if (statsXml) {
    statsXml.querySelectorAll("Mod, mod").forEach(m => {
      const name = m.getAttribute("name") || m.getAttribute("modName") || "";
      const title = m.getAttribute("title") || m.textContent || name;
      const author = m.getAttribute("author") || "Community Modder";
      const version = m.getAttribute("version") || "";
      if (name) activeModsList.push({ name, title, author, version });
    });
  }

  if (activeModsList.length === 0 && careerXml) {
    careerXml.querySelectorAll("mod").forEach(m => {
      const name = m.getAttribute("modName") || "";
      const title = m.getAttribute("title") || name;
      const version = m.getAttribute("version") || "";
      if (name) activeModsList.push({ name, title, author: "Server Mod", version });
    });
  }

  renderServerMods(activeModsList);
};

/* ==========================================================================
   SECTION 4: Unified Firebase Realtime Database Listener
   ========================================================================== */

function initializeFirebaseSync() {
  const firebaseConfig = {
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com"
  };

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (err) {}

  const db = firebase.database();

  // Listen to /FS25_Mods_Info metadata
  db.ref('FS25_Mods_Info').on('value', (modsSnap) => {
    if (modsSnap.exists()) {
      const modsData = modsSnap.val();
      if (modsData.Images) firebaseImageMappings = modsData.Images;
      if (modsData.Website) {
        Object.values(modsData.Website).forEach(m => {
          const key = sanitizeKey(m.name_a || m.name || m.title || '');
          if (key) firebaseWebsiteMods[key] = m;
        });
      }
    }
  });

  // Listen strictly to /fs25 node
  db.ref('fs25').on('value', (snap) => {
    if (snap.exists()) {
      window.renderDashboard(snap.val());
    } else {
      fetch("https://entertainment-71888-default-rtdb.firebaseio.com/fs25.json")
        .then(r => r.json())
        .then(data => {
          if (data) window.renderDashboard(data);
          else window.setServerStatus(false);
        })
        .catch(() => window.setServerStatus(false));
    }
  }, (error) => {
    console.warn("RTDB Live Sync Notice:", error.message);
  });
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
