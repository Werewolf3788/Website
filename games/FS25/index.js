/*
 Version Timestamp: Fri, July 24, 2026, 11:38 AM (EDT)
 Resilient FS25 Tactical Engine - Updated Asset Mapping & Regional Train Link
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
  "DOGS": "images/Dogs.JPG",
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
  "STRAWBERRIES": "images/Strawberries.JPG",
  "SUGARBEETS": "images/Sugarbeets.JPG",
  "SUGARCANE": "images/Sugarcane.JPG",
  "SUNFLOWERS": "images/Sunflowers.JPG",
  "TEDDER": "images/Teddar.JPG",
  "TOMATOES": "images/Tomatoes.JPG",
  "TRAIN STATION": "images/Train Station.JPG",
  "TRAIN": "images/Train Station.JPG",
  "LOCOMOTIVE": "images/Train Station.JPG",
  "FORESTRY LOCOMOTIVE": "images/FORESTRY LOCOMOTIVE.JPG",
  "WATER": "images/Water.jpg",
  "WHEAT": "images/Wheat.JPG",
  "WOOD CHIPS": "images/Wood Chips.JPG",
  "BIG BUD KTTA 700": "images/Big Bud KTTA 700.JPG",
  "JOHN DEERE 8R SERIES": "images/John Deere 8R Series.JPG",
  "AMERICAN MIDWEST TRUCK SHOP": "images/American Midwest Truck Shop.jpg"
};

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

// Robust CSV Parsing for Navigation Bar
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
          <button class="nav-btn dropdown-toggle" aria-expanded="false">
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
    console.warn("Dynamic menu fallback activated:", e.message);
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

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${data.activeSaveSlot || "1"}</strong>`;
  }

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
  }

  // Train Station Link & Passenger Status
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
