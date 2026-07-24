/*
 Version Timestamp: Fri, July 24, 2026, 02:51 PM (EDT)
 Complete Deep XML Parsing Engine & Dynamic CSV Mod Catalog Syncer
 File: games/FS25/index.js
*/

// External Data Endpoints
const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Asset Image Reference Map
const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG", "BEETROOT": "images/Beetroot.JPG", "RED BEET": "images/Red Beet.JPG",
  "BREAD": "images/Bread.JPG", "BUTTER": "images/Butter.JPG", "CABBAGE": "images/Cabbage.JPG",
  "CANOLA": "images/Canola.JPG", "CANOLA OIL": "images/Canola Oil.JPG", "CARROTS": "images/Carrots.JPG",
  "CHEESE": "images/Cheese.JPG", "CHICKENS": "images/Chickens.JPG", "CHOCOLATE": "images/Chocolate.JPG",
  "CORN": "images/Corn.JPG", "COTTON": "images/Cotton.JPG", "COW": "images/Cow.JPG", "DEF": "images/DEF.JPG",
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

const LBS_CONVERSION_FACTOR = 1.76374;
const MONTH_NAMES = [
  "Early Spring (March)", "Mid Spring (April)", "Late Spring (May)",
  "Early Summer (June)", "Mid Summer (July)", "Late Summer (August)",
  "Early Autumn (September)", "Mid Autumn (October)", "Late Autumn (November)",
  "Early Winter (December)", "Mid Winter (January)", "Late Winter (February)"
];

let activeServerMods = new Set();
let parsedModCatalog = [];
let offlineStartTime = null;
let offlineTimerInterval = null;
let lastKnownServerName = "Dedicated Server";

// Robust XML Parsing Sanitizer (Strips injected Google AppScript CSS styles)
function parseXML(node) {
  if (!node) return null;
  let rawText = typeof node === 'string' ? node : (node.data || node.content || node.xml || "");
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    let sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    
    // Aggressively strip appended Vue/CSS rules injected by G-Portal web view
    if (sanitizedXml.includes(".vue-modal-resizer")) {
      sanitizedXml = sanitizedXml.split(".vue-modal-resizer")[0];
    }
    
    const xmlStartIndex = sanitizedXml.indexOf("<");
    if (xmlStartIndex > 0) sanitizedXml = sanitizedXml.substring(xmlStartIndex);

    const xmlDoc = (new DOMParser()).parseFromString(sanitizedXml.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

// Deep XML Child Search Engine
function getDeepXmlValue(node, keys) {
  if (!node) return null;
  for (const key of keys) {
    if (node.getAttribute && node.getAttribute(key)) return node.getAttribute(key);
    const child = node.querySelector ? node.querySelector(key) : null;
    if (child) {
      if (child.textContent && child.textContent.trim().length > 0) return child.textContent.trim();
      if (child.getAttribute("value")) return child.getAttribute("value");
      if (child.getAttribute("name")) return child.getAttribute("name");
      if (child.getAttribute("cost")) return child.getAttribute("cost");
      if (child.getAttribute("id")) return child.getAttribute("id");
    }
  }
  return null;
}

function formatName(str) {
  if (!str) return 'Unknown Item';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('data_', '').replace('FS25_', '').replace('VEHICLE_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
}

function getThumbnailHTML(key, fallbackIcon = "fa-box") {
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();
  if (IMAGE_ASSETS[lookupKey]) {
    return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
  }
  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

// Server Status Handler
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

// CSV Navigation Bar Loader
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

// Google Sheet CSV Mod Hub Catalog Engine
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
      const colRegex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
      const cols = [];
      let match;
      while ((match = colRegex.exec(lines[i])) !== null) {
        cols.push(match[1] !== undefined ? match[1] : match[2]);
      }

      if (cols.length >= 10) {
        const mod = {
          name: cols[0] ? cols[0].trim() : "Unknown Mod",
          image: cols[1] ? cols[1].trim() : "",
          url: cols[2] ? cols[2].trim() : "#",
          description: cols[3] ? cols[3].trim() : "",
          crossplay: cols[4] ? cols[4].trim() : "No",
          modType: cols[5] ? cols[5].trim() : "Mod",
          category: cols[6] ? cols[6].trim() : "General",
          author: cols[7] ? cols[7].trim() : "Unknown Author",
          size: cols[8] ? cols[8].trim() : "N/A",
          filename: cols[9] ? cols[9].trim() : ""
        };

        if (mod.name) {
          parsedModCatalog.push(mod);
          if (mod.category) categoriesSet.add(mod.category.toUpperCase());
        }
      }
    }

    // Render Filter Buttons
    if (categoriesBar) {
      let filterHtml = "";
      categoriesSet.forEach(cat => {
        filterHtml += `<button class="category-filter-btn ${cat === 'ALL MODS' ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
      });
      categoriesBar.innerHTML = filterHtml;
    }

    renderModCards("ALL MODS");

  } catch (e) {
    grid.innerHTML = `<div class="loading-state" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load Mod Catalog CSV feed.</div>`;
  }
}

function renderModCards(categoryFilter = "ALL MODS") {
  const grid = document.getElementById("mod-hub-grid");
  if (!grid) return;

  let html = "";
  parsedModCatalog.forEach(mod => {
    const isCatMatch = (categoryFilter === "ALL MODS") || (mod.category.toUpperCase() === categoryFilter);
    if (!isCatMatch) return;

    const isActiveOnServer = activeServerMods.has(mod.filename) || activeServerMods.has(mod.filename.replace('.zip', ''));
    const statusBadge = isActiveOnServer ? `<span class="badge-stat badge-good"><i class="fa-solid fa-check-circle"></i> ACTIVE ON SERVER</span>` : `<span class="badge-stat"><i class="fa-solid fa-download"></i> AVAILABLE MOD</span>`;
    const crossplayBadge = mod.crossplay.toLowerCase() === 'yes' ? `<span class="badge-stat badge-sky"><i class="fa-solid fa-gamepad"></i> CROSSPLAY</span>` : '';

    html += `
      <div class="mod-card">
        <div>
          <div class="mod-card-top">
            ${mod.image ? `<img src="${mod.image}" alt="${mod.name}" class="mod-card-thumb lightbox-trigger" data-title="${mod.name}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}">` : `<div class="mod-card-thumb" style="display:flex;align-items:center;justify-content:center;background:#000;"><i class="fa-solid fa-cube fa-2x" style="color:#facc15;"></i></div>`}
            <div class="mod-card-info">
              <h3>${mod.name}</h3>
              <div class="mono" style="margin-bottom:6px;">${statusBadge} ${crossplayBadge}</div>
              <div class="mod-card-desc">${mod.description}</div>
            </div>
          </div>
        </div>
        <div class="mod-card-footer">
          <div class="mono">
            <span><i class="fa-solid fa-user"></i> ${mod.author}</span>
            <span><i class="fa-solid fa-hard-drive"></i> ${mod.size}</span>
          </div>
          <button class="nav-btn open-mod-lightbox" data-title="${mod.name}" data-img="${mod.image}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}">
            Read More <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>`;
  });

  grid.innerHTML = html || `<div class="loading-state">No mods found in this category.</div>`;
}

// Lightbox & Smart External Links Interception
document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".lightbox-trigger, .open-mod-lightbox");
  if (trigger) {
    const modal = document.getElementById("lightbox-modal");
    const imgEl = document.getElementById("lightbox-img");
    const captionEl = document.getElementById("lightbox-caption");

    const src = trigger.getAttribute("src") || trigger.getAttribute("data-img") || "";
    const title = trigger.getAttribute("alt") || trigger.getAttribute("data-title") || "Details";
    const desc = trigger.getAttribute("data-desc") ? decodeURIComponent(trigger.getAttribute("data-desc")) : "";
    const url = trigger.getAttribute("data-url") || "";

    if (modal && captionEl) {
      if (imgEl) {
        if (src) {
          imgEl.src = src;
          imgEl.style.display = "block";
        } else {
          imgEl.style.display = "none";
        }
      }

      let linkBtn = url && url !== "#" ? `<br><br><a href="${url}" target="_blank" class="nav-btn" style="background:var(--accent-red); color:#fff; display:inline-flex; margin-top:10px;"><i class="fa-solid fa-external-link"></i> Download / View Mod Page</a>` : "";

      captionEl.innerHTML = `<h2>${title}</h2><p>${desc}</p>${linkBtn}`;
      modal.classList.add("active");
    }
  }

  if (e.target.closest("#lightbox-close") || e.target.id === "lightbox-modal") {
    const modal = document.getElementById("lightbox-modal");
    if (modal) modal.classList.remove("active");
  }

  // Filter Buttons
  const filterBtn = e.target.closest(".category-filter-btn");
  if (filterBtn) {
    document.querySelectorAll(".category-filter-btn").forEach(b => b.classList.remove("active"));
    filterBtn.classList.add("active");
    renderModCards(filterBtn.getAttribute("data-category"));
  }
});

// Dynamic Page Tab Switcher
document.addEventListener("DOMContentLoaded", () => {
  loadDynamicNavbar();
  loadModHubCatalog();

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

// Master Telemetry Render Engine
window.renderDashboard = function(data) {
  if (!data) {
    window.setServerStatus(false);
    return;
  }

  // Active Server Mods Extractor
  activeServerMods.clear();
  const configXml = parseXML(data.dedicatedServerConfig || data.dedicatedServerConfig_xml || data.stats);
  if (configXml) {
    configXml.querySelectorAll("mod, Mod").forEach(m => {
      const filename = m.getAttribute("filename") || m.getAttribute("name");
      if (filename) activeServerMods.add(filename.replace('.zip', ''));
    });
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

  // 1. Header & Server Environment Badges
  if (serverNode) {
    const serverNameEl = document.getElementById('server-name');
    if (serverNameEl) serverNameEl.textContent = gameName;

    const mapName = serverNode.getAttribute("mapName") || "Riverbend Springs";
    const mapEl = document.getElementById('server-map');
    if (mapEl) mapEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;

    const rawDayTime = parseFloat(serverNode.getAttribute("dayTime") || "0");
    let hours = 0, mins = 0;
    if (rawDayTime > 0) {
      const totalMinutes = Math.floor(rawDayTime / 60000);
      hours = Math.floor(totalMinutes / 60) % 24;
      mins = totalMinutes % 60;
    }
    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const slotsNode = statsXml.querySelector("Slots");
    const capacity = slotsNode ? slotsNode.getAttribute("capacity") || "6" : "6";
    const numUsed = slotsNode ? slotsNode.getAttribute("numUsed") || "0" : "0";
    const playerBadge = document.getElementById('server-players');
    if (playerBadge) playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/${capacity}`;
  }

  // Environment Weather & Month
  const envXml = parseXML(data.environment || data.environment_xml);
  if (envXml) {
    let rawMonth = getDeepXmlValue(envXml, ["currentMonth", "month"]);
    if (rawMonth) {
      const mIdx = parseInt(String(rawMonth).trim(), 10);
      if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
        const monthEl = document.getElementById('server-month');
        if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${MONTH_NAMES[mIdx - 1]}`;
      }
    }

    const weatherNode = envXml.querySelector("weather forecast instance, weather") || envXml.querySelector("forecast");
    if (weatherNode) {
      const type = (weatherNode.getAttribute("typeName") || weatherNode.getAttribute("type") || "").toLowerCase();
      let weatherText = "Clear", weatherIcon = "fa-sun";
      if (type.includes("rain")) { weatherText = "Rainy"; weatherIcon = "fa-cloud-rain"; }
      else if (type.includes("snow")) { weatherText = "Snowing"; weatherIcon = "fa-snowflake"; }
      else if (type.includes("cloud")) { weatherText = "Cloudy"; weatherIcon = "fa-cloud"; }
      const weatherEl = document.getElementById('server-weather');
      if (weatherEl) weatherEl.innerHTML = `<i class="fa-solid ${weatherIcon}"></i> Weather: ${weatherText}`;
    }
  }

  // 2. Global Net Balance & Metrics
  try {
    let globalNetWorthSum = 0;
    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const money = parseFloat(farm.getAttribute("money") || "0");
        if (!isNaN(money)) globalNetWorthSum += money;
      });
    }
    const netEl = document.getElementById('global-net-worth');
    if (netEl) netEl.textContent = `$${Math.round(globalNetWorthSum).toLocaleString()}`;

    // Collectibles
    let collectedCount = 0;
    const collectiblesXml = parseXML(data.collectibles || data.collectibles_xml);
    if (collectiblesXml) {
      collectiblesXml.querySelectorAll("collectible").forEach(c => {
        if (c.getAttribute("collected") === "true" || c.getAttribute("isFound") === "true") collectedCount++;
      });
    }
    const collectEl = document.getElementById('global-collectibles-count');
    if (collectEl) collectEl.textContent = `${collectedCount} / 25`;

    // Farmland Count
    let maxFields = 0;
    const farmlandsXml = parseXML(data.farmlands || data.farmlands_xml || data.stats);
    if (farmlandsXml) {
      farmlandsXml.querySelectorAll("Farmland, farmland").forEach(f => {
        const idVal = parseInt(f.getAttribute("id") || "0", 10);
        if (idVal > maxFields) maxFields = idVal;
      });
    }
    const landEl = document.getElementById('global-land-count');
    if (landEl) landEl.textContent = `${maxFields || 93} Fields`;

  } catch (e) {}

  // 3. Active Vehicle Fleet Count
  try {
    let vehCount = 0;
    const vehXml = parseXML(data.vehicles || data.vehicles_xml || data.stats);
    if (vehXml) {
      vehCount = vehXml.querySelectorAll("vehicle, Vehicle").length;
    }
    const vehEl = document.getElementById('global-vehicle-count');
    if (vehEl) vehEl.textContent = `${vehCount}`;
  } catch (e) {}

  // 4. Contracts & Missions Parser
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
            const fieldId = fieldNode ? fieldNode.getAttribute("id") : m.getAttribute("fieldId");
            const status = m.getAttribute("status") || "CREATED";
            
            const reward = Math.round(parseFloat(getDeepXmlValue(m, ["reward"]) || "0"));
            const trees = m.getAttribute("numTrees");
            const fruitType = m.getAttribute("fruitType") || m.querySelector("harvest")?.getAttribute("fruitType");
            const cleanType = formatName(tagName.replace(/mission$/i, ""));

            let progressPct = 0;
            const completionVal = m.querySelector("info")?.getAttribute("completion");
            if (completionVal) progressPct = Math.round(parseFloat(completionVal) * 100);

            let statusBadge = status === 'RUNNING' ? `<span class="badge-stat badge-warning"><i class="fa-solid fa-spinner fa-spin"></i> RUNNING (${progressPct}%)</span>` : `<span class="badge-stat badge-good">PENDING</span>`;
            let fieldBadge = fieldId ? `<span class="badge-stat"><i class="fa-solid fa-map-pin"></i> Field #${fieldId}</span>` : '';
            if (trees) fieldBadge += ` <span class="badge-stat badge-warning"><i class="fa-solid fa-tree"></i> ${trees} Trees</span>`;
            if (fruitType) fieldBadge += ` <span class="badge-stat badge-good">${formatName(fruitType)}</span>`;

            html += `
              <div class="item-card" style="border-left: 4px solid #8b5cf6; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <div class="item-left">
                    ${getThumbnailHTML(fruitType || cleanType, "fa-file-contract")}
                    <div>
                      <div class="item-title" style="color:#facc15;">${cleanType} MISSION</div>
                      <div class="mono" style="margin-top:4px;">${statusBadge} ${fieldBadge}</div>
                    </div>
                  </div>
                  <div class="farm-money">+$${reward.toLocaleString()}</div>
                </div>
                ${status === 'RUNNING' ? `<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${progressPct}%;"></div></div>` : ''}
              </div>`;
          }
        });
      }
      contractsCont.innerHTML = html || `<div class="item-card"><div class="item-title">All Contracts Completed</div></div>`;
    }
  } catch (e) {}

  // 5. Factories & Production Chains
  try {
    const prodCont = document.getElementById('main-productions-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (prodCont) {
      let prodHtml = "";
      if (placeXml) {
        placeXml.querySelectorAll("placeable").forEach(p => {
          const prodPoint = p.querySelector("productionPoint");
          if (prodPoint) {
            const name = formatName(p.getAttribute("filename") || "Factory");
            const farmId = p.getAttribute("farmId") || "0";
            const ownerStr = farmId === "0" ? "PUBLIC FACTORY" : `FARM #${farmId} OWNED`;

            let recipeList = [];
            prodPoint.querySelectorAll("production").forEach(prod => {
              if (prod.getAttribute("isEnabled") === "true") recipeList.push(formatName(prod.getAttribute("id")));
            });

            prodHtml += `
              <div class="item-card" style="border-left: 4px solid #3b82f6; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <div class="item-left">
                    ${getThumbnailHTML(name, "fa-industry")}
                    <div>
                      <div class="item-title">${name}</div>
                      <div class="mono"><span class="badge-stat badge-good">${ownerStr}</span></div>
                    </div>
                  </div>
                </div>
                <div class="mono" style="margin-top:6px; border-top:1px solid var(--border-color); padding-top:6px; width:100%;">
                  <span><i class="fa-solid fa-gears"></i> Active Recipes: ${recipeList.length > 0 ? recipeList.join(", ") : "Standby"}</span>
                </div>
              </div>`;
          }
        });
      }
      prodCont.innerHTML = prodHtml || `<div class="item-card"><div class="item-title">Public Regional Grain Elevator</div></div>`;
    }
  } catch (e) {}

  // 6. Livestock & Animal Husbandry
  try {
    const animalCont = document.getElementById('animal-husbandry-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    if (animalCont) {
      let animalHtml = "";
      if (placeXml) {
        placeXml.querySelectorAll("placeable").forEach(p => {
          const husbandry = p.querySelector("husbandryAnimals");
          if (husbandry) {
            const penTitle = formatName(p.getAttribute("filename") || "Animal Pen");
            const farmOwner = p.getAttribute("farmId") || "0";

            husbandry.querySelectorAll("animal").forEach(a => {
              const breed = formatName(a.getAttribute("subType"));
              const count = a.getAttribute("numAnimals");
              const age = a.getAttribute("age");

              const grassLevel = Math.round(parseFloat(p.querySelector("husbandryMeadow fillType")?.getAttribute("fillLevel") || "0"));

              animalHtml += `
                <div class="item-card" style="border-left: 4px solid #10b981; flex-direction:column; align-items:flex-start;">
                  <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div class="item-left">
                      ${getThumbnailHTML(breed, "fa-cow")}
                      <div>
                        <div class="item-title" style="color:#4ade80;">${breed} (${count} Head)</div>
                        <div class="mono"><span class="badge-stat">Farm #${farmOwner}</span> <span class="badge-stat">${age} Months Old</span></div>
                      </div>
                    </div>
                  </div>
                  <div class="mono" style="margin-top:6px; border-top:1px solid var(--border-color); padding-top:6px; width:100%;">
                    <span><i class="fa-solid fa-wheat-awn"></i> Grass/Meadow Feed: ${grassLevel.toLocaleString()} L</span>
                  </div>
                </div>`;
            });
          }
        });
      }
      animalCont.innerHTML = animalHtml || `<div class="item-card"><div class="item-title">No Active Livestock Husbandry Recorded</div></div>`;
    }
  } catch (e) {}

  // 7. Dealership Used Equipment Sales
  try {
    const salesCont = document.getElementById('used-sales-container');
    const salesXml = parseXML(data.sales || data.sales_xml);
    if (salesCont) {
      let salesHtml = "";
      if (salesXml) {
        salesXml.querySelectorAll("item").forEach(item => {
          const filename = formatName(item.getAttribute("xmlFilename"));
          const price = Math.round(parseFloat(item.getAttribute("price") || "0"));
          const damage = Math.round(parseFloat(item.getAttribute("damage") || "0") * 100);
          const wear = Math.round(parseFloat(item.getAttribute("wear") || "0") * 100);
          const timeLeft = item.getAttribute("timeLeft") || "24";

          salesHtml += `
            <div class="item-card" style="border-left: 4px solid #f97316;">
              <div class="item-left">
                ${getThumbnailHTML(filename, "fa-tags")}
                <div>
                  <div class="item-title">${filename}</div>
                  <div class="mono">
                    <span class="badge-stat badge-danger">Damage: ${damage}%</span>
                    <span class="badge-stat badge-warning">Wear: ${wear}%</span>
                    <span class="badge-stat"><i class="fa-regular fa-clock"></i> ${timeLeft}h Left</span>
                  </div>
                </div>
              </div>
              <div class="farm-money" style="color:#facc15;">$${price.toLocaleString()}</div>
            </div>`;
        });
      }
      salesCont.innerHTML = salesHtml || `<div class="item-card"><div class="item-title">No Machinery Currently On Sale</div></div>`;
    }
  } catch (e) {}

  // 8. Vehicle Fleet Telemetry
  try {
    const fleetCont = document.getElementById('vehicle-fleet-container');
    const vehXml = parseXML(data.vehicles || data.vehicles_xml || data.stats);
    if (fleetCont) {
      let fleetHtml = "";
      if (vehXml) {
        vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
          const name = formatName(v.getAttribute("name") || v.getAttribute("filename"));
          if (!name.includes("WAGON") && !name.includes("TRAIN")) {
            const controller = v.getAttribute("controller") || (v.getAttribute("isAIActive") === "true" ? "AI Helper" : "Unmanned");
            const isAI = controller.includes("AI");

            fleetHtml += `
              <div class="item-card" style="border-left: 4px solid #ef4444;">
                <div class="item-left">
                  ${getThumbnailHTML(name, "fa-tractor")}
                  <div>
                    <div class="item-title">${name}</div>
                    <div class="mono"><span class="badge-stat ${isAI ? 'badge-warning' : 'badge-good'}"><i class="fa-solid fa-user-gear"></i> ${controller}</span></div>
                  </div>
                </div>
              </div>`;
          }
        });
      }
      fleetCont.innerHTML = fleetHtml || `<div class="item-card"><div class="item-title">No Active Machinery Logged</div></div>`;
    }
  } catch (e) {}

  // 9. Commodity Market Prices
  try {
    const ecoCont = document.getElementById('main-economy-container');
    const ecoXml = parseXML(data.economy || data.economy_xml);
    if (ecoCont) {
      let ecoHtml = "";
      if (ecoXml) {
        ecoXml.querySelectorAll("fillType").forEach(ft => {
          const cropKey = ft.getAttribute("fillType");
          if (cropKey && cropKey !== "UNKNOWN") {
            const periodVal = ft.querySelector("history period")?.textContent || "500";
            const priceVal = Math.round(parseFloat(periodVal));
            if (priceVal > 0) {
              const pricePer1kLbs = (priceVal / LBS_CONVERSION_FACTOR).toFixed(2);
              ecoHtml += `
                <div class="item-card" style="border-left: 4px solid #14b8a6;">
                  <div class="item-left">
                    ${getThumbnailHTML(cropKey, "fa-chart-line")}
                    <div class="item-title">${formatName(cropKey)}</div>
                  </div>
                  <div class="farm-money">$${pricePer1kLbs} / 1,000 lbs</div>
                </div>`;
            }
          }
        });
      }
      ecoCont.innerHTML = ecoHtml || `<div class="item-card"><div class="item-title">Reading Market Economy...</div></div>`;
    }
  } catch (e) {}

  // Reload Mod Cards to update Active badges against current server mods
  renderModCards();
};
