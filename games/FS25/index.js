/*
 Version Timestamp: Fri, July 24, 2026, 11:50 AM (EDT)
 Resilient FS25 Multi-Tab Filtering Engine & Defensive Telemetry Parser
 File: games/FS25/index.js
*/

const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";

// Comprehensive Image Asset Mapping for uploaded FS25 graphics
const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG",
  "BARLEY SWATH": "images/Barley Swath.JPG",
  "BEETROOT": "images/Beetroot.JPG",
  "RED BEET": "images/Red Beet.JPG",
  "BREAD": "images/Bread.JPG",
  "BUTTER": "images/Butter.JPG",
  "CABBAGE": "images/Cabbage.JPG",
  "CANOLA": "images/Canola.JPG",
  "CANOLA OIL": "images/Canola Oil.JPG",
  "CARROTS": "images/Carrots.JPG",
  "CHEESE": "images/Cheese.JPG",
  "CHICKENS": "images/Chickens.JPG",
  "CHOCOLATE": "images/Chocolate.JPG",
  "CORN": "images/Corn.JPG",
  "COTTON": "images/Cotton.JPG",
  "COW": "images/Cow.JPG",
  "DEF": "images/DEF.JPG",
  "DESTRUCTIBLE ROCK": "images/Destructible Rock.JPG",
  "DIESEL": "images/Diesel.JPG",
  "DIGESTATE": "images/Digestate.JPG",
  "EGGS": "images/Eggs.JPG",
  "FLOUR": "images/Flour.JPG",
  "FORAGE": "images/Forage.JPG",
  "GRAIN BARGE": "images/GRAIN BARGE.JPG",
  "GRAIN ELEVATOR": "images/GRAIN ELEVATOR.jpg",
  "GRASS": "images/Grass.JPG",
  "GREEN BEANS": "images/Green Beans.JPG",
  "HAY": "images/Hay.JPG",
  "HONEY BOX": "images/HONEY BOX.JPG",
  "HORSES": "images/Horses.JPG",
  "LIME": "images/Lime.JPG",
  "LIQUID FERTILIZER": "images/Liquid Fertilizer.JPG",
  "LOG TRAILER": "images/Log Trailer.JPG",
  "MANURE": "images/Manure.JPG",
  "MILK": "images/Milk.JPG",
  "MINERAL FEED": "images/Mineral Feed.JPG",
  "OATS": "images/Oats.JPG",
  "PARSNIP": "images/Parsnip.JPG",
  "PEAS": "images/Peas.JPG",
  "PIGS": "images/Pigs.JPG",
  "POTATOES": "images/Potatoes.JPG",
  "PRECISION FARMING": "images/Precision Farming.jpg",
  "RESTAURANT": "images/Restaurant.JPG",
  "RICE": "images/Rice.JPG",
  "SEEDS": "images/Seeds.JPG",
  "SHEEP": "images/Sheep.JPG",
  "SILAGE": "images/Silage.JPG",
  "SLURRY": "images/Slurry.JPG",
  "SOLID FERTILIZER": "images/Solid Fertilizer.JPG",
  "SORGHUM": "images/Sorghum.JPG",
  "SOYBEANS": "images/Soybeans.JPG",
  "SPINACH": "images/Spinach.JPG",
  "STRAW": "images/Straw.JPG",
  "SUGARBEETS": "images/Sugarbeets.JPG",
  "SUGARCANE": "images/Sugarcane.JPG",
  "SUNFLOWERS": "images/Sunflowers.JPG",
  "TEDDER": "images/Teddar.JPG",
  "TOMATOES": "images/Tomatoes.JPG",
  "TRAIN STATION": "images/Train Station.JPG",
  "TRAIN": "images/Train Station.JPG",
  "WATER": "images/Water.jpg",
  "WHEAT": "images/Wheat.JPG",
  "WOOD CHIPS": "images/Wood Chips.JPG",
  "BIG BUD KTTA 700": "images/Big Bud KTTA 700.JPG",
  "JOHN DEERE 8R SERIES": "images/John Deere 8R Series.JPG",
  "AMERICAN MIDWEST TRUCK SHOP": "images/American Midwest Truck Shop.jpg"
};

const BASE_PRICES_PER_KL = {
  "WHEAT": 780, "BARLEY": 720, "CANOLA": 1250, "OAT": 1100,
  "MAIZE": 850, "CORN": 850, "SUNFLOWER": 1380, "SOYBEAN": 1550,
  "POTATO": 410, "SUGARBEET": 350, "GRASS": 120, "MILK": 620,
  "HONEY": 1950, "WOOL": 1820, "WOODCHIPS": 240
};

const LBS_CONVERSION_FACTOR = 1.76374;

const MONTH_NAMES = [
  "Early Spring (March)", "Mid Spring (April)", "Late Spring (May)",
  "Early Summer (June)", "Mid Summer (July)", "Late Summer (August)",
  "Early Autumn (September)", "Mid Autumn (October)", "Late Autumn (November)",
  "Early Winter (December)", "Mid Winter (January)", "Late Winter (February)"
];

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public Map", color: "#facc15", isAI: true },
  "1": { name: "Farm 1", color: "#ff5f00", isAI: false },
  "2": { name: "Farm 2", color: "#c41e3a", isAI: false },
  "3": { name: "Farm 3", color: "#2563eb", isAI: false },
  "4": { name: "Farm 4", color: "#ec4899", isAI: false },
  "5": { name: "Farm 5", color: "#a855f7", isAI: false },
  "6": { name: "Farm 6", color: "#22c55e", isAI: false }
};

let offlineStartTime = null;
let offlineTimerInterval = null;
let lastKnownServerName = "Dedicated Server";

function getFarmColorMeta(farmId) {
  const key = String(farmId || "0");
  if (FARM_COLOR_PALETTE[key]) return FARM_COLOR_PALETTE[key];
  const idNum = parseInt(key, 10) || 0;
  return { name: `Farm ${idNum}`, color: `hsl(${(idNum * 137.5) % 360}, 85%, 55%)`, isAI: false };
}

function getThumbnailHTML(key, fallbackIcon = "fa-box") {
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();
  if (IMAGE_ASSETS[lookupKey]) {
    return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
  }
  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

function formatName(str) {
  if (!str) return 'Unknown Item';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('data_', '').replace('FS25_', '').replace('VEHICLE_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
}

function parseXML(node) {
  if (!node) return null;
  let rawText = typeof node === 'string' ? node : (node.data || node.content || node.xml || "");
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    let sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    if (sanitizedXml.includes(".vue-modal-resizer")) sanitizedXml = sanitizedXml.split(".vue-modal-resizer")[0];
    const xmlStartIndex = sanitizedXml.indexOf("<");
    if (xmlStartIndex > 0) sanitizedXml = sanitizedXml.substring(xmlStartIndex);
    const xmlDoc = (new DOMParser()).parseFromString(sanitizedXml.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

window.setServerStatus = function(isOnline) {
  const pill = document.getElementById('server-status-pill');
  const text = document.getElementById('status-text');
  const syncTimeEl = document.getElementById('last-sync-time');
  const offlineTimerEl = document.getElementById('offline-timer');
  const serverNameEl = document.getElementById('server-name');

  if (!pill || !text) return;

  const actualOnlineState = isOnline && navigator.onLine;

  if (actualOnlineState) {
    pill.className = "status-pill status-online";
    text.textContent = "ONLINE";

    if (offlineTimerInterval) {
      clearInterval(offlineTimerInterval);
      offlineTimerInterval = null;
    }
    offlineStartTime = null;
    if (offlineTimerEl) offlineTimerEl.style.display = "none";
    if (syncTimeEl) syncTimeEl.style.display = "inline";
  } else {
    pill.className = "status-pill status-offline";
    if (serverNameEl && serverNameEl.textContent.includes("Connecting")) {
      serverNameEl.textContent = lastKnownServerName;
    }

    if (!offlineStartTime) {
      offlineStartTime = Date.now();
      if (syncTimeEl) syncTimeEl.style.display = "none";
      if (offlineTimerEl) offlineTimerEl.style.display = "inline";

      if (offlineTimerInterval) clearInterval(offlineTimerInterval);
      offlineTimerInterval = setInterval(() => {
        if (!offlineStartTime) return;
        const diffMs = Date.now() - offlineStartTime;
        const totalSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const timeStr = `${mins}m ${secs}s`;
        
        if (text) text.textContent = `OFFLINE (${timeStr})`;
        if (offlineTimerEl) {
          offlineTimerEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Server Offline Duration: <strong>${timeStr}</strong>`;
        }
      }, 1000);
    }
  }
};

window.addEventListener('online', () => window.setServerStatus(true));
window.addEventListener('offline', () => window.setServerStatus(false));

// Load CSV Navbar with Tablet & Cross-Browser Fail-safes
async function loadDynamicNavbar() {
  const menuContainer = document.getElementById("dynamic-menu");
  if (!menuContainer) return;

  try {
    const response = await fetch(CSV_MENU_URL);
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);
    const csvText = await response.text();

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const groups = {};

    for (let i = 1; i < lines.length; i++) {
      const colRegex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
      const cols = [];
      let match;
      while ((match = colRegex.exec(lines[i])) !== null) {
        cols.push(match[1] !== undefined ? match[1] : match[2]);
      }

      if (cols.length >= 3) {
        const name = cols[0] ? cols[0].trim() : "";
        const group = cols[1] ? cols[1].trim() : "General";
        const url = cols[2] ? cols[2].trim() : "#";
        const img = cols[3] ? cols[3].trim() : "";

        if (name && url) {
          if (!groups[group]) groups[group] = [];
          groups[group].push({ name, url, img });
        }
      }
    }

    let navHtml = `<a href="https://werewolf3788.github.io/Website/" class="nav-btn"><i class="fa-solid fa-house"></i> Home</a>`;

    for (const [groupName, items] of Object.entries(groups)) {
      navHtml += `
        <div class="nav-item">
          <button class="nav-btn dropdown-toggle">
            ${groupName} <i class="fa-solid fa-caret-down"></i>
          </button>
          <div class="dropdown-content">`;

      items.forEach(item => {
        const imgTag = item.img ? `<img src="${item.img}" class="menu-thumb" onerror="this.style.display='none';">` : `<i class="fa-solid fa-link"></i>`;
        navHtml += `<a href="${item.url}">${imgTag} ${item.name}</a>`;
      });

      navHtml += `</div></div>`;
    }

    menuContainer.innerHTML = navHtml;
    attachDropdownTouchEvents();

  } catch (e) {
    console.warn("CSV navbar fallback applied:", e.message);
    menuContainer.innerHTML = `<a href="https://werewolf3788.github.io/Website/" class="nav-btn"><i class="fa-solid fa-house"></i> Home</a><a href="https://werewolf3788.github.io/Website/games/FS25/" class="nav-btn"><i class="fa-solid fa-tractor"></i> FS25 Hub</a>`;
  }
}

function attachDropdownTouchEvents() {
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.nav-item');
      if (parent) {
        const isOpen = parent.classList.contains('open');
        document.querySelectorAll('.nav-item.open').forEach(item => {
          if (item !== parent) item.classList.remove('open');
        });
        parent.classList.toggle('open', !isOpen);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item.open').forEach(item => item.classList.remove('open'));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicNavbar();

  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const menuBar = document.getElementById("dynamic-menu");
  if (toggleBtn && menuBar) {
    toggleBtn.addEventListener("click", () => menuBar.classList.toggle("menu-active"));
  }

  // Tab Switching Listener Setup
  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".tab-btn");
    if (tabBtn) {
      const targetTabId = tabBtn.getAttribute("data-tab");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));

      tabBtn.classList.add("active");
      const targetPanel = document.getElementById(targetTabId);
      if (targetPanel) targetPanel.classList.add("active");
    }
  });
});

// Master Telemetry Render Engine
window.renderDashboard = function(data) {
  if (!data) {
    window.setServerStatus(false);
    return;
  }

  const statsXml = parseXML(data.stats || data.dedicatedServerConfig_xml);
  const serverNode = statsXml ? statsXml.querySelector("Server") : null;
  const gameName = serverNode ? serverNode.getAttribute("name") : null;

  if (statsXml && serverNode) {
    lastKnownServerName = gameName || "Dedicated Server";
    window.setServerStatus(true);
  } else {
    window.setServerStatus(false);
  }

  // Update Telemetry Sync Timestamp Footer
  const syncTimeEl = document.getElementById('last-sync-time');
  if (syncTimeEl) {
    const now = new Date();
    syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last Telemetry Sync: <strong style="color:#22c55e;">${now.toLocaleTimeString()}</strong>`;
  }

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${data.activeSaveSlot || "1"}</strong>`;
  }

  // 1. Banner Badges & Environment
  if (serverNode) {
    const serverNameEl = document.getElementById('server-name');
    if (serverNameEl) serverNameEl.textContent = gameName;

    const mapName = serverNode.getAttribute("mapName") || "Calm Lands";
    const mapEl = document.getElementById('server-map');
    if (mapEl) mapEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;

    const rawDayTime = parseFloat(serverNode.getAttribute("dayTime") || "0");
    let hours = 8, mins = 0;
    if (rawDayTime > 0) {
      const totalMinutes = Math.floor(rawDayTime / 60000);
      hours = Math.floor(totalMinutes / 60) % 24;
      mins = totalMinutes % 60;
    }
    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const timeScale = serverNode.getAttribute("timeScale") || "5.0";
    const speedBadge = document.getElementById('time-speed-badge');
    if (speedBadge) speedBadge.innerHTML = `<i class="fa-solid fa-forward-fast"></i> Speed: ${parseFloat(timeScale).toFixed(0)}x`;

    const traffic = serverNode.getAttribute("trafficEnabled") !== "false";
    const trafficBadge = document.getElementById('traffic-badge');
    if (trafficBadge) trafficBadge.innerHTML = `<i class="fa-solid fa-car"></i> Traffic: ${traffic ? 'ON' : 'OFF'}`;

    const slotsNode = statsXml.querySelector("Slots");
    const capacity = slotsNode ? slotsNode.getAttribute("capacity") || "6" : "6";
    const numUsed = slotsNode ? slotsNode.getAttribute("numUsed") || "0" : "0";
    const playerBadge = document.getElementById('server-players');
    if (playerBadge) playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/${capacity}`;
  }

  const envXml = parseXML(data.environment || data.environment_xml);
  if (envXml) {
    const monthNode = envXml.querySelector("currentMonth") || envXml.querySelector("month");
    if (monthNode && monthNode.textContent) {
      const mIdx = parseInt(monthNode.textContent.trim());
      if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
        const monthEl = document.getElementById('server-month');
        if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${MONTH_NAMES[mIdx - 1]}`;
      }
    }
    const weatherNode = envXml.querySelector("weather") || envXml.querySelector("forecast");
    if (weatherNode) {
      const type = (weatherNode.getAttribute("type") || weatherNode.textContent || "").toLowerCase();
      let weatherText = "Clear", weatherIcon = "fa-sun";
      if (type.includes("rain")) { weatherText = "Rainy"; weatherIcon = "fa-cloud-rain"; }
      else if (type.includes("snow")) { weatherText = "Snowing"; weatherIcon = "fa-snowflake"; }
      else if (type.includes("cloud")) { weatherText = "Overcast"; weatherIcon = "fa-cloud"; }
      const weatherEl = document.getElementById('server-weather');
      if (weatherEl) weatherEl.innerHTML = `<i class="fa-solid ${weatherIcon}"></i> Weather: ${weatherText}`;
    }
  }

  // 2. Farmlands & Registered Player Farms Lookup Map
  const registeredFarmsMap = {};
  let totalLandCount = 0;
  let globalNetWorthSum = 0;

  try {
    const farmLandXml = parseXML(data.farmlands || data.farmlands_xml);
    if (farmLandXml) totalLandCount = farmLandXml.querySelectorAll("farmland").length;
    const landEl = document.getElementById('global-land-count');
    if (landEl) landEl.textContent = `${totalLandCount} Parcels`;

    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        if (!farmId || farmId === "0") return;
        let rawName = farm.getAttribute("name") || `Farm #${farmId}`;
        registeredFarmsMap[farmId] = rawName;
        globalNetWorthSum += parseFloat(farm.getAttribute("money") || "0");
      });
    }

    const netEl = document.getElementById('global-net-worth');
    if (netEl) netEl.textContent = `$${Math.round(globalNetWorthSum).toLocaleString()}`;

  } catch (e) {}

  // 3. Dynamic Farm Tabs Construction
  try {
    const tabBar = document.getElementById('tab-navigation-bar');
    const tabsWrapper = document.getElementById('dynamic-farm-tabs-wrapper');

    if (tabBar && tabsWrapper) {
      let tabButtonsHtml = `<button class="tab-btn active" data-tab="main-tab"><i class="fa-solid fa-globe"></i> MAIN OVERVIEW (ALL AI & MAP SUMMARY)</button>`;
      let tabPanelsHtml = "";

      Object.keys(registeredFarmsMap).forEach(farmId => {
        const farmName = registeredFarmsMap[farmId];
        const meta = getFarmColorMeta(farmId);
        const tabId = `farm-tab-${farmId}`;

        tabButtonsHtml += `
          <button class="tab-btn" data-tab="${tabId}" style="border-bottom: 3px solid ${meta.color};">
            <i class="fa-solid fa-building-columns" style="color:${meta.color};"></i> ${farmName} (ID: ${farmId})
          </button>`;

        tabPanelsHtml += `
          <div id="${tabId}" class="tab-content-panel">
            <div class="masonry-grid">
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-tractor" style="color:${meta.color};"></i> <h2>${farmName} - VEHICLES</h2></div>
                <div id="farm-${farmId}-vehicles" class="box-content"><div class="loading-state">Scanning vehicles...</div></div>
              </div>
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-screwdriver-wrench" style="color:${meta.color};"></i> <h2>${farmName} - ATTACHMENTS & IMPLEMENTS</h2></div>
                <div id="farm-${farmId}-implements" class="box-content"><div class="loading-state">Scanning attachments...</div></div>
              </div>
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-trailer" style="color:${meta.color};"></i> <h2>${farmName} - TRAILERS & WAGONS</h2></div>
                <div id="farm-${farmId}-trailers" class="box-content"><div class="loading-state">Scanning trailers...</div></div>
              </div>
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-wheat-field" style="color:${meta.color};"></i> <h2>${farmName} - GRAIN HEADERS</h2></div>
                <div id="farm-${farmId}-headers" class="box-content"><div class="loading-state">Scanning headers...</div></div>
              </div>
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-warehouse" style="color:${meta.color};"></i> <h2>${farmName} - SILOS & CROPS</h2></div>
                <div id="farm-${farmId}-silos" class="box-content"><div class="loading-state">Checking silos...</div></div>
              </div>
              <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
                <div class="box-header"><i class="fa-solid fa-wrench" style="color:${meta.color};"></i> <h2>${farmName} - HAND TOOLS & PLAYERS</h2></div>
                <div id="farm-${farmId}-tools" class="box-content"><div class="loading-state">Scanning hand tools...</div></div>
              </div>
            </div>
          </div>`;
      });

      tabBar.innerHTML = tabButtonsHtml;
      tabsWrapper.innerHTML = tabPanelsHtml;
    }
  } catch (e) {}

  // 4. Global Counters Computation
  try {
    let vehCount = 0, attCount = 0;
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    if (vehXml) {
      const vehicles = vehXml.querySelectorAll("vehicle");
      vehCount = vehicles.length;
      vehicles.forEach(v => {
        const fn = (v.getAttribute("filename") || "").toLowerCase();
        if (fn.includes("header") || fn.includes("trailer") || fn.includes("weight") || fn.includes("plow") || fn.includes("seeder")) {
          attCount++;
        }
      });
    }
    const vehEl = document.getElementById('global-vehicle-count');
    if (vehEl) vehEl.textContent = `${vehCount}`;
    const attEl = document.getElementById('global-attachment-count');
    if (attEl) attEl.textContent = `${attCount}`;
  } catch (e) {}

  // 5. Active Server Contracts & Missions
  try {
    const contractsCont = document.getElementById('main-contracts-container');
    const missionsXml = parseXML(data.missions || data.missions_xml);
    if (contractsCont) {
      let html = "";
      if (missionsXml) {
        missionsXml.querySelectorAll("*").forEach(m => {
          const tagName = m.tagName.toLowerCase();
          if (tagName.endsWith("mission") && tagName !== "missions") {
            const fieldNode = m.querySelector("field");
            const fieldId = fieldNode ? fieldNode.getAttribute("id") : "N/A";
            const reward = Math.round(parseFloat(m.getAttribute("reward") || "2500"));
            const cleanType = formatName(tagName.replace(/mission$/i, ""));

            html += `
              <div class="item-card" style="border-left: 4px solid #8b5cf6;">
                <div class="item-left">
                  ${getThumbnailHTML(cleanType, "fa-file-contract")}
                  <div>
                    <div class="item-title">${cleanType} Contract</div>
                    <div class="mono">
                      <span class="badge-stat badge-good">Target: Field #${fieldId}</span>
                      <span class="badge-stat"><i class="fa-solid fa-robot"></i> AI Mission</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money">$${reward.toLocaleString()}</div>
              </div>`;
          }
        });
      }
      contractsCont.innerHTML = html || `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML("CONTRACT", "fa-file-contract")}
            <div>
              <div class="item-title">All Contracts Completed</div>
              <div class="mono"><span class="badge-stat badge-good">No Active Missions Pending</span></div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}

  // 6. Map Buying Stations & Field Locations
  try {
    const buyingCont = document.getElementById('buying-stations-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (buyingCont) {
      let buyingHtml = "";
      if (placeXml) {
        placeXml.querySelectorAll("placeable").forEach(p => {
          const fn = (p.getAttribute("filename") || "").toLowerCase();
          if (fn.includes("buyingstation") || fn.includes("sellingstation") || fn.includes("fillstation")) {
            const name = formatName(p.getAttribute("filename"));
            buyingHtml += `
              <div class="item-card" style="border-left: 4px solid #38bdf8;">
                <div class="item-left">
                  ${getThumbnailHTML("STORE", "fa-store")}
                  <div>
                    <div class="item-title">${name}</div>
                    <div class="mono"><span class="badge-stat badge-good"><i class="fa-solid fa-location-dot"></i> Map Supply Spot</span></div>
                  </div>
                </div>
              </div>`;
          }
        });
      }
      buyingCont.innerHTML = buyingHtml || `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML("AMERICAN MIDWEST TRUCK SHOP", "fa-store")}
            <div>
              <div class="item-title">Equipment Dealership & Supply Bay</div>
              <div class="mono"><span class="badge-stat badge-good"><i class="fa-solid fa-check"></i> Open 24/7 (Main Store)</span></div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}

  // 7. Factories & Productions
  try {
    const prodCont = document.getElementById('main-productions-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (prodCont) {
      let prodHtml = "";
      if (placeXml) {
        placeXml.querySelectorAll("placeable[productionPoint]").forEach(p => {
          const typeName = formatName(p.getAttribute("filename") || "Factory");
          prodHtml += `
            <div class="item-card" style="border-left: 4px solid #3b82f6;">
              <div class="item-left">
                ${getThumbnailHTML(typeName, "fa-industry")}
                <div>
                  <div class="item-title">${typeName}</div>
                  <div class="mono"><span class="badge-stat badge-good"><i class="fa-solid fa-gear"></i> Map Factory Operational</span></div>
                </div>
              </div>
            </div>`;
        });
      }
      prodCont.innerHTML = prodHtml || `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML("GRAIN ELEVATOR", "fa-industry")}
            <div>
              <div class="item-title">Public Regional Grain Elevator</div>
              <div class="mono"><span class="badge-stat badge-good">Accepting Grain Deliveries</span></div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}

  // 8. Commodity Market Prices
  try {
    const ecoCont = document.getElementById('main-economy-container');
    if (ecoCont) {
      let html = "";
      for (const [cropKey, baseValPerKL] of Object.entries(BASE_PRICES_PER_KL)) {
        const pricePer1kLbs = (baseValPerKL / LBS_CONVERSION_FACTOR).toFixed(2);
        html += `
          <div class="item-card" style="border-left: 4px solid #14b8a6;">
            <div class="item-left">
              ${getThumbnailHTML(cropKey, "fa-chart-line")}
              <div class="item-title">${formatName(cropKey)}</div>
            </div>
            <div class="farm-money">$${pricePer1kLbs} / 1,000 lbs</div>
          </div>`;
      }
      ecoCont.innerHTML = html;
    }
  } catch (e) {}

  // 9. Regional Train Network
  try {
    const mainTrainCont = document.getElementById('main-train-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (mainTrainCont) {
      let passengerStatus = `<span class="badge-stat badge-good"><i class="fa-solid fa-check"></i> Rail Operational</span>`;
      if (placeXml) {
        const trainPlayer = placeXml.querySelector("placeable[uniqueId='trainSystem'] player");
        if (trainPlayer && trainPlayer.getAttribute("isEntered") === "true") {
          const name = trainPlayer.getAttribute("lastNickname") || "Active Driver";
          passengerStatus = `<span class="badge-stat badge-active"><i class="fa-solid fa-user"></i> Driver: ${name}</span>`;
        }
      }

      mainTrainCont.innerHTML = `
        <div class="item-card" style="border-left: 4px solid #facc15;">
          <div class="item-left">
            ${getThumbnailHTML("TRAIN STATION", "fa-train")}
            <div>
              <div class="item-title">Public Regional Train Network</div>
              <div class="mono">
                <span class="badge-stat" style="color:#facc15; border:1px solid #facc15;"><i class="fa-solid fa-robot"></i> Public Asset</span>
                ${passengerStatus}
              </div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}
};
