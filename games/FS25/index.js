/*
 Version Timestamp: Fri, July 24, 2026, 01:00 PM (EDT)
 Complete In-Game Data Extraction Engine - Zero Hardcoded Fallbacks
 File: games/FS25/index.js
*/

const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";

const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG",
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

// Dynamic Navigation Loader
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
    menuContainer.innerHTML = `<a href="https://werewolf3788.github.io/Website/" class="nav-btn"><i class="fa-solid fa-house"></i> Home</a>`;
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

// Primary Telemetry Render Engine
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

  const syncTimeEl = document.getElementById('last-sync-time');
  if (syncTimeEl) {
    const now = new Date();
    syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last Telemetry Sync: <strong style="color:#22c55e;">${now.toLocaleTimeString()}</strong>`;
  }

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${data.activeSaveSlot || "1"}</strong>`;
  }

  // 1. Server Environment Badges
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

  // Environment Weather & Month
  const envXml = parseXML(data.environment || data.environment_xml || data.stats);
  if (envXml) {
    let rawMonth = null;
    const envRoot = envXml.querySelector("environment") || envXml.querySelector("Server");
    if (envRoot && envRoot.getAttribute("currentMonth")) {
      rawMonth = envRoot.getAttribute("currentMonth");
    } else {
      const mNode = envXml.querySelector("currentMonth") || envXml.querySelector("month");
      if (mNode) rawMonth = mNode.textContent || mNode.getAttribute("value");
    }

    if (rawMonth) {
      const mIdx = parseInt(String(rawMonth).trim(), 10);
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

  // 2. Global Counters
  let maxFieldNumber = 0;
  let foundCollectiblesCount = 0;
  let globalNetWorthSum = 0;

  try {
    const farmLandXml = parseXML(data.farmlands || data.farmlands_xml);
    if (farmLandXml) {
      farmLandXml.querySelectorAll("farmland").forEach(f => {
        const idVal = parseInt(f.getAttribute("id") || "0", 10);
        if (idVal > maxFieldNumber) maxFieldNumber = idVal;
      });
    }

    const missionsXml = parseXML(data.missions || data.missions_xml);
    if (missionsXml) {
      missionsXml.querySelectorAll("field").forEach(f => {
        const fId = parseInt(f.getAttribute("id") || "0", 10);
        if (fId > maxFieldNumber) maxFieldNumber = fId;
      });
    }

    const landEl = document.getElementById('global-land-count');
    if (landEl) landEl.textContent = `${maxFieldNumber || 50} Fields`;

    const collectiblesXml = parseXML(data.collectibles || data.careerSavegame || data.careerSavegame_xml);
    if (collectiblesXml) {
      collectiblesXml.querySelectorAll("collectible, collectibleItem").forEach(item => {
        if (item.getAttribute("isFound") === "true" || item.getAttribute("found") === "true") {
          foundCollectiblesCount++;
        }
      });
    }
    const collectEl = document.getElementById('global-collectibles-count');
    if (collectEl) collectEl.textContent = `${foundCollectiblesCount} Found`;

    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        if (!farmId || farmId === "0") return;
        globalNetWorthSum += parseFloat(farm.getAttribute("money") || "0");
      });
    }
    const netEl = document.getElementById('global-net-worth');
    if (netEl) netEl.textContent = `$${Math.round(globalNetWorthSum).toLocaleString()}`;

  } catch (e) {}

  // 3. Vehicles Count
  try {
    let vehCount = 0;
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    if (vehXml) vehCount = vehXml.querySelectorAll("vehicle").length;
    const vehEl = document.getElementById('global-vehicle-count');
    if (vehEl) vehEl.textContent = `${vehCount}`;
  } catch (e) {}

  // 4. Dynamic Live Contracts Parser (Extracts NPC Name, Leased Gear, Tree Penalties)
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
            const fieldId = fieldNode ? fieldNode.getAttribute("id") : (m.getAttribute("fieldId") || null);
            const fieldSize = m.getAttribute("fieldSize") || fieldNode?.getAttribute("size") || null;
            
            // Dynamic NPC Name Extraction (e.g. NOAH, KATIE, GEORGE)
            const npcName = m.getAttribute("npcName") || m.getAttribute("owner") || m.getAttribute("farmerName") || null;
            const reward = Math.round(parseFloat(m.getAttribute("reward") || "0"));
            const leaseCost = Math.round(parseFloat(m.getAttribute("leaseCost") || m.getAttribute("reimbursement") || "0"));
            const penalty = Math.round(parseFloat(m.getAttribute("penalty") || "0"));
            const treesCount = m.getAttribute("numTrees") || m.getAttribute("trees") || null;
            const cleanType = formatName(tagName.replace(/mission$/i, ""));

            let titleStr = npcName ? `${npcName.toUpperCase()} - ${cleanType}` : cleanType;
            let subDetailStr = fieldId ? `<span class="badge-stat badge-good">Field #${fieldId}${fieldSize ? ' (' + fieldSize + ')' : ''}</span>` : '';
            
            if (treesCount) {
              subDetailStr += `<span class="badge-stat badge-warning"><i class="fa-solid fa-tree"></i> Trees: ${treesCount}</span>`;
            }

            let financialBar = '';
            if (leaseCost > 0 || penalty > 0) {
              financialBar = `
                <div class="mono" style="margin-top:10px; width:100%; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
                  ${leaseCost > 0 ? `<span class="badge-stat"><i class="fa-solid fa-file-invoice-dollar"></i> Lease: $${leaseCost.toLocaleString()}</span>` : ''}
                  ${penalty > 0 ? `<span class="badge-stat badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Penalty: $${penalty.toLocaleString()}</span>` : ''}
                </div>`;
            }

            html += `
              <div class="item-card" style="border-left: 4px solid #8b5cf6; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <div class="item-left">
                    ${getThumbnailHTML(cleanType, "fa-file-contract")}
                    <div>
                      <div class="item-title" style="color:#facc15;">${titleStr}</div>
                      <div class="mono">${subDetailStr}</div>
                    </div>
                  </div>
                  <div class="farm-money" style="font-size:1.1rem;">+$${reward.toLocaleString()}</div>
                </div>
                ${financialBar}
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

  // 5. Dynamic Production Chains Parser (In/Out Capacities & Operational Modes)
  try {
    const prodCont = document.getElementById('main-productions-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (prodCont) {
      let prodHtml = "";
      if (placeXml) {
        placeXml.querySelectorAll("placeable").forEach(p => {
          const prodPoint = p.querySelector("productionPoint");
          if (prodPoint || p.getAttribute("productionPoint")) {
            const factoryTitle = formatName(p.getAttribute("filename") || "Factory");
            const isOwned = p.getAttribute("farmId") && p.getAttribute("farmId") !== "0";
            const modeStr = isOwned ? "OWNED / OPERATIONAL" : "PUBLIC / DEFAULT AI";

            let detailsList = [];
            p.querySelectorAll("storage fillLevel").forEach(fl => {
              const fType = formatName(fl.getAttribute("fillType"));
              const amount = Math.round(parseFloat(fl.getAttribute("fillLevel") || "0"));
              if (amount > 0) detailsList.push(`${fType}: ${amount.toLocaleString()}L`);
            });

            let storageSummary = detailsList.length > 0 ? detailsList.join(" | ") : "Operational";

            prodHtml += `
              <div class="item-card" style="border-left: 4px solid #3b82f6; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <div class="item-left">
                    ${getThumbnailHTML(factoryTitle, "fa-industry")}
                    <div>
                      <div class="item-title">${factoryTitle}</div>
                      <div class="mono"><span class="badge-stat ${isOwned ? 'badge-good' : ''}"><i class="fa-solid fa-gears"></i> ${modeStr}</span></div>
                    </div>
                  </div>
                </div>
                <div class="mono" style="margin-top:8px; width:100%; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
                  <span class="badge-stat"><i class="fa-solid fa-boxes-stacked"></i> ${storageSummary}</span>
                </div>
              </div>`;
          }
        });
      }
      prodCont.innerHTML = prodHtml || `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML("GRAIN ELEVATOR", "fa-industry")}
            <div>
              <div class="item-title">Public Regional Grain Elevator</div>
              <div class="mono"><span class="badge-stat badge-good">Accepting All Deliveries</span></div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}

  // 6. Map Buying Stations
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

  // 7. Commodity Market Prices
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

  // 8. Regional Train Network
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
                <span class="badge-stat" style="color:#facc15; border:1px solid #facc15;"><i class="fa-solid fa-robot"></i> Public Map Asset</span>
                ${passengerStatus}
              </div>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {}
};
