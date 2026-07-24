/*
 Version Timestamp: Fri, July 24, 2026, 05:45 PM (EDT)
 Complete Dynamic Telemetry Parser & Human-Readable Asset Formatter
 File: games/FS25/index.js
*/

const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Default Server", color: "#facc15" },
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

const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG", "BEETROOT": "images/Beetroot.JPG", "RED BEET": "images/Beetroot.JPG",
  "BREAD": "images/Bread.JPG", "BUTTER": "images/Butter.JPG", "CABBAGE": "images/Cabbage.JPG",
  "CANOLA": "images/Canola.JPG", "CANOLA OIL": "images/Canola Oil.JPG", "CARROTS": "images/Carrots.JPG",
  "CHEESE": "images/Cheese.JPG", "CHICKENS": "images/Chickens.JPG", "CHOCOLATE": "images/Chocolate.JPG",
  "CORN": "images/Corn.JPG", "MAIZE": "images/Corn.JPG", "COTTON": "images/Cotton.JPG", "COW": "images/Cow.JPG", "DEF": "images/DEF.JPG",
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

const BASE_PRICES_PER_KL = {
  "WHEAT": 780, "BARLEY": 720, "CANOLA": 1250, "OAT": 1100,
  "MAIZE": 850, "CORN": 850, "SUNFLOWER": 1380, "SOYBEAN": 1550,
  "POTATO": 410, "SUGARBEET": 350, "BEETROOT": 420, "PARSNIP": 460,
  "SPINACH": 620, "CARROT": 450, "COTTON": 2450, "SORGHUM": 920,
  "GREENBEAN": 890, "PEA": 780, "GRASS": 120, "MILK": 620,
  "HONEY": 1950, "WOOL": 1820, "WOODCHIPS": 240
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

function getFirebasePayload(rootObj, targetKey) {
  if (!rootObj || typeof rootObj !== 'object') return null;
  if (rootObj[targetKey] !== undefined) {
    if (typeof rootObj[targetKey] === 'string' || typeof rootObj[targetKey] === 'number') return rootObj[targetKey];
    if (rootObj[targetKey] && rootObj[targetKey].data) return rootObj[targetKey].data;
  }
  const xmlKey = `${targetKey}_xml`;
  if (rootObj[xmlKey] !== undefined) {
    if (typeof rootObj[xmlKey] === 'string') return rootObj[xmlKey];
    if (rootObj[xmlKey] && rootObj[xmlKey].data) return rootObj[xmlKey].data;
  }
  const rawKey = `${targetKey}_raw`;
  if (rootObj[rawKey] !== undefined) {
    if (typeof rootObj[rawKey] === 'string') return rootObj[rawKey];
  }
  return null;
}

function parseXML(inputPayload) {
  if (!inputPayload) return null;
  let rawText = typeof inputPayload === 'string' ? inputPayload : (inputPayload.data || inputPayload.content || inputPayload.xml || "");
  if (!rawText || typeof rawText !== 'string') {
    if (typeof inputPayload === 'object' && inputPayload.nodeType) return inputPayload;
    return null;
  }
  try {
    let sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    if (sanitizedXml.includes(".vue-modal-resizer")) {
      sanitizedXml = sanitizedXml.split(".vue-modal-resizer")[0];
    }
    const xmlStartIndex = sanitizedXml.indexOf("<");
    if (xmlStartIndex > 0) sanitizedXml = sanitizedXml.substring(xmlStartIndex);

    const xmlDoc = (new DOMParser()).parseFromString(sanitizedXml.trim(), "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function formatName(str) {
  if (!str) return 'General Item';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('.zip', '').replace('data_', '').replace('FS25_', '').replace('VEHICLE_', '');
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-zA-Z])(\d+)/g, '$1 $2').replace(/_/g, ' ');
  return clean.toUpperCase().trim();
}

function getThumbnailHTML(key, fallbackIcon = "fa-box") {
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  let lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();
  if (lookupKey === "MAIZE") lookupKey = "CORN";

  if (IMAGE_ASSETS[lookupKey]) {
    return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
  }
  
  for (const [assetName, path] of Object.entries(IMAGE_ASSETS)) {
    if (lookupKey.includes(assetName) || assetName.includes(lookupKey)) {
      return `<div class="item-icon-box"><img src="${path}" alt="${assetName}" class="lightbox-trigger" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }
  }

  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

function renderGaugeBar(percentage, labelText) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  let barColor = "#ef4444";
  if (pct >= 71) barColor = "#22c55e";
  else if (pct >= 40) barColor = "#eab308";

  return `
    <div class="gauge-wrapper" style="margin-top:4px; width:100%;">
      <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#a1a1aa; font-family:var(--font-mono); margin-bottom:2px;">
        <span>${labelText}</span>
        <span style="color:${barColor}; font-weight:bold;">${pct}%</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${pct}%; background-color: ${barColor};"></div>
      </div>
    </div>`;
}

window.setServerStatus = function(isOnline) {
  const pill = document.getElementById('server-status-pill');
  const text = document.getElementById('status-text');
  const syncTimeEl = document.getElementById('last-sync-time');
  const offlineTimerEl = document.getElementById('offline-timer');

  if (!pill || !text) return;
  const actualOnlineState = isOnline && navigator.onLine;

  if (actualOnlineState) {
    pill.className = "status-pill status-online";
    text.textContent = "ONLINE";
    if (offlineTimerInterval) { clearInterval(offlineTimerInterval); offlineTimerInterval = null; }
    offlineStartTime = null;
    if (offlineTimerEl) offlineTimerEl.style.display = "none";
    if (syncTimeEl) syncTimeEl.style.display = "inline";
  } else {
    pill.className = "status-pill status-offline";
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

async function loadDynamicNavbar() {
  const menuContainer = document.getElementById("dynamic-menu");
  if (!menuContainer) return;
  try {
    const response = await fetch(CSV_MENU_URL);
    if (!response.ok) throw new Error();
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
          <button type="button" class="nav-btn dropdown-toggle">
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
  } catch (e) {
    menuContainer.innerHTML = `<a href="https://werewolf3788.github.io/Website/" class="nav-btn"><i class="fa-solid fa-house"></i> Home</a>`;
  }
}

async function loadModHubCatalog() {
  const grid = document.getElementById("mod-hub-grid");
  const categoriesBar = document.getElementById("mod-categories-bar");
  if (!grid) return;

  try {
    const response = await fetch(CSV_MODS_URL);
    if (!response.ok) throw new Error();
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
        const modName = cols[0] ? cols[0].trim() : "Unknown Mod";
        const mod = {
          name: modName.toLowerCase().startsWith("platform") ? (cols[9] ? formatName(cols[9]) : "Custom Expansion Mod") : modName, // Column A
          image: cols[1] ? cols[1].trim() : "", // Column B
          url: cols[2] ? cols[2].trim() : "#", // Column C
          description: cols[3] ? cols[3].trim() : "No detailed description provided.", // Column D
          crossplay: cols[4] ? cols[4].trim() : "No", // Column E
          modType: cols[5] ? cols[5].trim() : "Mod", // Column F
          category: cols[6] ? cols[6].trim() : "General", // Column G
          author: cols[7] ? cols[7].trim() : "Community Modder", // Column H
          size: cols[8] ? cols[8].trim() : "N/A", // Column I
          filename: cols[9] ? cols[9].trim() : "" // Column J
        };

        if (mod.name) {
          parsedModCatalog.push(mod);
          if (mod.category) categoriesSet.add(mod.category.toUpperCase());
        }
      }
    }

    if (categoriesBar) {
      let filterHtml = "";
      categoriesSet.forEach(cat => {
        filterHtml += `<button type="button" class="category-filter-btn ${cat === 'ALL MODS' ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
      });
      categoriesBar.innerHTML = filterHtml;
    }

    renderModCards("ALL MODS");
  } catch (e) {
    grid.innerHTML = `<div class="item-card"><div class="item-title"><i class="fa-solid fa-cube"></i> Server Mods Active (Offline)</div></div>`;
  }
}

function renderModCards(categoryFilter = "ALL MODS") {
  const grid = document.getElementById("mod-hub-grid");
  if (!grid) return;

  parsedModCatalog.sort((a, b) => {
    const aActive = activeServerMods.has(a.filename) || activeServerMods.has(a.filename.replace('.zip', ''));
    const bActive = activeServerMods.has(b.filename) || activeServerMods.has(b.filename.replace('.zip', ''));
    return (bActive ? 1 : 0) - (aActive ? 1 : 0);
  });

  let html = "";
  parsedModCatalog.forEach(mod => {
    const isCatMatch = (categoryFilter === "ALL MODS") || (mod.category.toUpperCase() === categoryFilter);
    if (!isCatMatch) return;

    const isActiveOnServer = activeServerMods.has(mod.filename) || activeServerMods.has(mod.filename.replace('.zip', ''));
    const statusBadge = isActiveOnServer 
      ? `<span class="badge-stat badge-good"><i class="fa-solid fa-check-circle"></i> ACTIVE ON SERVER</span>` 
      : `<span class="badge-stat">AVAILABLE MOD</span>`;
    
    const crossplayBadge = (mod.crossplay && mod.crossplay.toLowerCase() === 'yes') 
      ? `<span class="badge-stat badge-sky"><i class="fa-solid fa-gamepad"></i> CROSSPLAY</span>` 
      : '';

    html += `
      <div class="mod-card">
        <div>
          <div class="mod-card-top">
            ${mod.image ? `<img src="${mod.image}" alt="${mod.name}" class="mod-card-thumb lightbox-trigger" data-title="${mod.name}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}" data-author="${mod.author}" data-size="${mod.size}">` : `<div class="mod-card-thumb" style="display:flex;align-items:center;justify-content:center;background:#000;"><i class="fa-solid fa-cube fa-xl" style="color:#facc15;"></i></div>`}
            <div class="mod-card-info">
              <h3>${mod.name}</h3>
              <div class="mono" style="margin-bottom:2px;">${statusBadge} ${crossplayBadge}</div>
            </div>
          </div>
        </div>
        <div class="mod-card-footer">
          <div class="mono">
            <span><i class="fa-solid fa-user"></i> ${mod.author}</span>
          </div>
          <button type="button" class="nav-btn open-mod-lightbox" data-title="${mod.name}" data-img="${mod.image}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}" data-author="${mod.author}" data-size="${mod.size}" data-crossplay="${mod.crossplay}" data-active="${isActiveOnServer ? 'Yes' : 'No'}">
            Read More <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>`;
  });

  grid.innerHTML = html || `<div class="loading-state">No mods found in this category.</div>`;
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".lightbox-trigger, .open-mod-lightbox");
  if (trigger) {
    e.preventDefault();
    const modal = document.getElementById("lightbox-modal");
    const imgEl = document.getElementById("lightbox-img");
    const captionEl = document.getElementById("lightbox-caption");

    const src = trigger.getAttribute("src") || trigger.getAttribute("data-img") || "";
    const title = trigger.getAttribute("alt") || trigger.getAttribute("data-title") || "Details";
    const desc = trigger.getAttribute("data-desc") ? decodeURIComponent(trigger.getAttribute("data-desc")) : "No description provided.";
    const url = trigger.getAttribute("data-url") || "";
    const author = trigger.getAttribute("data-author") || "Community Modder";
    const size = trigger.getAttribute("data-size") || "N/A";
    const crossplay = trigger.getAttribute("data-crossplay") || "No";
    const active = trigger.getAttribute("data-active") || "No";

    if (modal && captionEl) {
      if (imgEl) {
        if (src) {
          imgEl.src = src;
          imgEl.style.display = "block";
        } else {
          imgEl.style.display = "none";
        }
      }

      let linkBtn = url && url !== "#" ? `<br><a href="${url}" target="_blank" class="nav-btn" style="background:var(--accent-red); color:#fff; display:inline-flex; margin-top:12px;"><i class="fa-solid fa-external-link"></i> Download / View Mod Page</a>` : "";
      let activeBadgeStyle = active === 'Yes' ? 'badge-good' : '';

      captionEl.innerHTML = `
        <h2>${title}</h2>
        <div class="mono" style="margin-bottom:10px; justify-content:center;">
          <span class="badge-stat"><i class="fa-solid fa-user"></i> Author: ${author}</span>
          <span class="badge-stat"><i class="fa-solid fa-hard-drive"></i> Size: ${size}</span>
          <span class="badge-stat ${activeBadgeStyle}">Active on Server: ${active}</span>
          <span class="badge-stat badge-sky">Crossplay: ${crossplay}</span>
        </div>
        <p>${desc}</p>
        ${linkBtn}`;
      modal.classList.add("active");
    }
  }

  if (e.target.closest("#lightbox-close") || e.target.id === "lightbox-modal") {
    const modal = document.getElementById("lightbox-modal");
    if (modal) modal.classList.remove("active");
  }

  const filterBtn = e.target.closest(".category-filter-btn");
  if (filterBtn) {
    document.querySelectorAll(".category-filter-btn").forEach(b => b.classList.remove("active"));
    filterBtn.classList.add("active");
    renderModCards(filterBtn.getAttribute("data-category"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicNavbar();
  loadModHubCatalog();

  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const menuBar = document.getElementById("dynamic-menu");
  if (toggleBtn && menuBar) {
    toggleBtn.addEventListener("click", () => menuBar.classList.toggle("menu-active"));
  }

  if (window.lastFirebaseData && typeof window.renderDashboard === 'function') {
    window.renderDashboard(window.lastFirebaseData);
  }
});

window.renderDashboard = function(data) {
  if (!data) return;

  window.setServerStatus(true);

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    let rawSlot = getFirebasePayload(data, "activeSaveSlot") || data.activeSaveSlot || "1";
    let formattedSlot = String(rawSlot).trim();
    if (!formattedSlot.toLowerCase().startsWith("savegame")) {
      formattedSlot = `savegame${formattedSlot}`;
    }
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">${formattedSlot}</strong>`;
  }

  const syncTimeEl = document.getElementById('last-sync-time');
  if (syncTimeEl) {
    const now = new Date();
    syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last Telemetry Sync: <strong style="color:#22c55e;">${now.toLocaleTimeString()}</strong>`;
  }

  const statsRaw = getFirebasePayload(data, "stats") || getFirebasePayload(data, "dedicatedServerConfig");
  const statsXml = parseXML(statsRaw);
  const careerXml = parseXML(getFirebasePayload(data, "careerSavegame"));
  const envXml = parseXML(getFirebasePayload(data, "environment"));

  if (statsXml || careerXml) {
    const serverNode = statsXml ? statsXml.querySelector("Server") : (careerXml ? careerXml.querySelector("settings") : null);
    if (serverNode) {
      const serverName = serverNode.getAttribute("name") || "OneLIVIDMAN and werewolf 618";
      const mapName = serverNode.getAttribute("mapName") || "Calm Lands";
      const rawDayTime = parseFloat(serverNode.getAttribute("dayTime") || "0");
      const timeScale = serverNode.getAttribute("timeScale") || "5.0";
      const traffic = serverNode.getAttribute("trafficEnabled") || "true";

      document.getElementById('server-name').textContent = serverName;
      document.getElementById('server-map').innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;
      document.getElementById('time-speed-badge').innerHTML = `<i class="fa-solid fa-forward-fast"></i> Speed: ${parseFloat(timeScale).toFixed(0)}x`;
      document.getElementById('traffic-badge').innerHTML = `<i class="fa-solid fa-car"></i> Traffic: ${traffic === 'true' ? 'ON' : 'OFF'}`;

      if (rawDayTime > 0) {
        const totalMinutes = Math.floor(rawDayTime / 60000);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const mins = totalMinutes % 60;
        document.getElementById('server-time').innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      }
    }

    if (envXml) {
      const rawMonth = envXml.querySelector("currentMonth")?.textContent || "7";
      const monthIdx = parseInt(rawMonth) || 7;
      document.getElementById('server-month').innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${MONTH_NAMES[monthIdx - 1]}`;
      document.getElementById('server-weather').innerHTML = `<i class="fa-solid fa-sun"></i> Weather: Clear`;
    }

    const slotsNode = statsXml ? statsXml.querySelector("Slots") : null;
    const capacity = slotsNode ? slotsNode.getAttribute("capacity") || "6" : "6";
    const numUsed = slotsNode ? slotsNode.getAttribute("numUsed") || "0" : "0";

    const onlinePlayers = [];
    if (statsXml) {
      statsXml.querySelectorAll("Player[isUsed='true']").forEach(p => {
        if (p.textContent) onlinePlayers.push(p.textContent.trim());
      });
    }

    const playerBadge = document.getElementById('server-players');
    if (playerBadge) {
      playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/${capacity} ${onlinePlayers.length ? `(${onlinePlayers.join(', ')})` : ''}`;
    }
  }

  activeServerMods.clear();
  const configRaw = getFirebasePayload(data, "dedicatedServerConfig") || statsRaw || getFirebasePayload(data, "careerSavegame");
  const configXml = parseXML(configRaw);
  if (configXml) {
    configXml.querySelectorAll("mod, Mod").forEach(m => {
      const filename = m.getAttribute("filename") || m.getAttribute("name") || m.getAttribute("modName");
      if (filename) activeServerMods.add(filename.replace('.zip', ''));
    });
  }

  // Registered Server Farms
  const farmsRaw = getFirebasePayload(data, "farms") || getFirebasePayload(data, "careerSavegame");
  const farmsXml = parseXML(farmsRaw);
  const farmsCont = document.getElementById('farms-container');

  if (farmsCont) {
    let farmsHtml = "";
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
        let farmName = farm.getAttribute("name") || `Farm #${farmId}`;
        const money = Math.round(parseFloat(farm.getAttribute("money") || "0"));
        const loan = Math.round(parseFloat(farm.getAttribute("loan") || "0"));
        const farmColor = getFarmColor(farmId);

        let managerName = "Unassigned";
        const managerNode = farm.querySelector("player[farmManager='true']");
        if (managerNode) {
          managerName = managerNode.getAttribute("lastNickname") || "Active Manager";
        }

        if (farmId && farmId !== "0") {
          farmsHtml += `
            <div class="item-card" style="border-left: 4px solid ${farmColor}; flex-direction:column; align-items:flex-start;">
              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML("WHEAT", "fa-wheat-field")}
                  <div>
                    <div class="item-title" style="color:${farmColor};">${farmName.toUpperCase()} (ID: ${farmId})</div>
                    <div class="mono" style="margin-top:2px;">
                      <span class="badge-stat badge-good">Manager: ${managerName}</span>
                      <span class="badge-stat badge-warning">Bank Loan: $${loan.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money" style="color:${farmColor};">$${money.toLocaleString()}</div>
              </div>
            </div>`;
        }
      });
    }
    farmsCont.innerHTML = farmsHtml || `
      <div class="item-card" style="border-left: 4px solid #ff5f00;">
        <div class="item-left">
          ${getThumbnailHTML("WHEAT", "fa-wheat-field")}
          <div>
            <div class="item-title" style="color:#ff5f00;">PRIMARY FARM ACCOUNT</div>
            <div class="mono"><span class="badge-stat badge-good">ACTIVE</span></div>
          </div>
        </div>
        <div class="farm-money" style="color:#ff5f00;">$1,000,000</div>
      </div>`;
  }

  // Categorized Machinery Containers (Tractors, Harvesters, Trailers, Implements, Handtools)
  const tracCont = document.getElementById('tractors-container');
  const harvCont = document.getElementById('harvesters-container');
  const trailCont = document.getElementById('trailers-container');
  const implCont = document.getElementById('implements-container');
  const toolsCont = document.getElementById('handtools-container');

  const vehiclesRaw = getFirebasePayload(data, "vehicles") || statsRaw;
  const handToolsRaw = getFirebasePayload(data, "handTools");
  const vehXml = parseXML(vehiclesRaw);
  const toolsXml = parseXML(handToolsRaw);

  if (tracCont || harvCont || trailCont || implCont) {
    let tractorsHtml = "";
    let harvestersHtml = "";
    let trailersHtml = "";
    let implementsHtml = "";

    if (vehXml) {
      vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
        const rawName = v.getAttribute("name") || v.getAttribute("filename") || v.getAttribute("modName");
        const name = formatName(rawName);
        const farmId = v.getAttribute("farmId") || "0";
        const farmColor = getFarmColor(farmId);

        if (!name.includes("TRAIN") && !name.includes("BARGE")) {
          const isAIActive = v.getAttribute("isAIActive") === "true";
          const controller = v.getAttribute("controller") || (isAIActive ? "AI Helper" : "Idle / Available");
          
          let attachedStr = "";
          const attachedNodes = v.querySelectorAll("attacherVehicle");
          if (attachedNodes.length > 0) {
            attachedStr = `<span class="badge-stat"><i class="fa-solid fa-link"></i> Attached Equipment</span>`;
          }

          let fuelGaugeHtml = "";
          const dieselUnit = v.querySelector("fillUnit unit[fillType='DIESEL']");
          if (dieselUnit) {
            const fillLevel = parseFloat(dieselUnit.getAttribute("fillLevel") || "0");
            const pct = Math.min(100, Math.round((fillLevel / 2000) * 100));
            fuelGaugeHtml = renderGaugeBar(pct, `Fuel Level (${Math.round(fillLevel)}L)`);
          }

          const cardHtml = `
            <div class="item-card" style="border-left: 4px solid ${farmColor}; flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(name, "fa-tractor")}
                  <div>
                    <div class="item-title" style="color:${farmColor};">${name}</div>
                    <div class="mono" style="margin-top:2px;">
                      <span class="badge-stat ${isAIActive ? 'badge-warning' : 'badge-good'}">${controller}</span>
                      ${attachedStr}
                    </div>
                  </div>
                </div>
              </div>
              ${fuelGaugeHtml}
            </div>`;

          if (name.includes("HARVESTER") || name.includes("COMBINE")) {
            harvestersHtml += cardHtml;
          } else if (name.includes("WAGON") || name.includes("TRAILER") || name.includes("TIPPER")) {
            trailersHtml += cardHtml;
          } else if (name.includes("TRACTOR") || name.includes("BIG BUD") || name.includes("JOHN DEERE") || name.includes("TRUCK")) {
            tractorsHtml += cardHtml;
          } else {
            implementsHtml += cardHtml;
          }
        }
      });
    }

    if (tracCont) tracCont.innerHTML = tractorsHtml || `<div class="item-card"><div class="item-title">No Active Tractors Logged</div></div>`;
    if (harvCont) harvCont.innerHTML = harvestersHtml || `<div class="item-card"><div class="item-title">No Active Harvesters Logged</div></div>`;
    if (trailCont) trailCont.innerHTML = trailersHtml || `<div class="item-card"><div class="item-title">No Active Trailers Logged</div></div>`;
    if (implCont) implCont.innerHTML = implementsHtml || `<div class="item-card"><div class="item-title">No Active Equipment Logged</div></div>`;
  }

  // Handtools Container Sorted By User
  if (toolsCont) {
    let toolsHtml = "";
    if (toolsXml) {
      toolsXml.querySelectorAll("handTool").forEach(tool => {
        const toolName = formatName(tool.getAttribute("filename") || "Hand Tool");
        const farmId = tool.getAttribute("farmId") || "0";
        const farmColor = getFarmColor(farmId);

        toolsHtml += `
          <div class="item-card" style="border-left: 4px solid ${farmColor};">
            <div class="item-left">
              ${getThumbnailHTML(toolName, "fa-toolbox")}
              <div>
                <div class="item-title" style="color:${farmColor};">${toolName}</div>
                <div class="mono"><span class="badge-stat">Assigned Farm #${farmId}</span></div>
              </div>
            </div>
          </div>`;
      });
    }
    toolsCont.innerHTML = toolsHtml || `<div class="item-card"><div class="item-title">Chainsaws & Hand Tools Stored in Shed</div></div>`;
  }

  // Field Crops & Agronomy Status
  const fieldsCont = document.getElementById('fields-container');
  const fieldsRaw = getFirebasePayload(data, "fields") || getFirebasePayload(data, "farmland");
  const fieldsXml = parseXML(fieldsRaw);

  if (fieldsCont) {
    let fieldsHtml = "";
    if (fieldsXml) {
      fieldsXml.querySelectorAll("field, farmland").forEach(f => {
        const id = f.getAttribute("id");
        const farmId = f.getAttribute("farmId") || "0";
        const farmColor = getFarmColor(farmId);
        let crop = formatName(f.getAttribute("fruitType") || "Prepared Ground");
        if (crop === "MAIZE") crop = "CORN";

        const sprayLevel = parseInt(f.getAttribute("sprayLevel") || "0", 10);
        let fertBadge = sprayLevel >= 2 ? `<span class="badge-stat badge-good">Fertilizer: 100% (L2)</span>` : `<span class="badge-stat badge-warning">Fertilizer: ${sprayLevel * 50}%</span>`;

        fieldsHtml += `
          <div class="item-card" style="border-left: 4px solid ${farmColor};">
            <div class="item-left">
              ${getThumbnailHTML(crop, "fa-seedling")}
              <div>
                <div class="item-title" style="color:${farmColor};">Field #${id} - ${crop}</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat">Farm #${farmId}</span>
                  ${fertBadge}
                </div>
              </div>
            </div>
          </div>`;
      });
    }
    fieldsCont.innerHTML = fieldsHtml || `<div class="item-card"><div class="item-title">55 Farmland Parcels Logged</div></div>`;
  }

  // Factories & Production Chains
  const prodCont = document.getElementById('main-productions-container');
  const placeablesRaw = getFirebasePayload(data, "placeables");
  const placeXml = parseXML(placeablesRaw);

  if (prodCont) {
    let prodHtml = "";
    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const filename = p.getAttribute("filename") || "";
        const name = formatName(filename);
        const farmId = p.getAttribute("farmId") || "0";
        const farmColor = getFarmColor(farmId);

        const prodPoint = p.querySelector("productionPoint");
        if (prodPoint || filename.toLowerCase().includes("sawmill") || filename.toLowerCase().includes("restaurant") || filename.toLowerCase().includes("factory")) {
          let recipeList = [];
          if (prodPoint) {
            prodPoint.querySelectorAll("production").forEach(prod => {
              if (prod.getAttribute("isEnabled") === "true") recipeList.push(formatName(prod.getAttribute("id")));
            });
          }

          prodHtml += `
            <div class="item-card" style="border-left: 4px solid ${farmColor}; flex-direction:column; align-items:flex-start;">
              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(name, "fa-industry")}
                  <div>
                    <div class="item-title" style="color:${farmColor};">${name}</div>
                    <div class="mono"><span class="badge-stat badge-good">${farmId === "0" ? 'Public Asset' : `Farm #${farmId} Owned`}</span></div>
                  </div>
                </div>
              </div>
              <div class="mono" style="margin-top:4px; width:100%;">
                <span>Active Recipes: ${recipeList.length > 0 ? recipeList.join(", ") : "Operational Standby"}</span>
              </div>
            </div>`;
        }
      });
    }
    prodCont.innerHTML = prodHtml || `<div class="item-card"><div class="item-title">Public Regional Sawmill & Grain Elevator Operational</div></div>`;
  }

  // Livestock & Animal Husbandry
  const animalCont = document.getElementById('animal-husbandry-container');
  if (animalCont) {
    let animalHtml = "";
    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const husbandry = p.querySelector("husbandryAnimals");
        if (husbandry) {
          const farmOwner = p.getAttribute("farmId") || "0";
          const farmColor = getFarmColor(farmOwner);

          husbandry.querySelectorAll("animal").forEach(a => {
            let breed = formatName(a.getAttribute("subType") || "COW");
            if (breed.includes("COW")) breed = breed.replace("COW", "").trim() + " Cow";
            const count = a.getAttribute("numAnimals") || "0";
            const age = a.getAttribute("age") || "0";
            const grassLevel = Math.round(parseFloat(p.querySelector("husbandryMeadow fillType")?.getAttribute("fillLevel") || "5000"));

            animalHtml += `
              <div class="item-card" style="border-left: 4px solid ${farmColor}; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                  <div class="item-left">
                    ${getThumbnailHTML("COW", "fa-cow")}
                    <div>
                      <div class="item-title" style="color:${farmColor};">${breed} (${count} Head)</div>
                      <div class="mono"><span class="badge-stat">Age: ${age} Months</span> <span class="badge-stat badge-good">Health: 100%</span></div>
                    </div>
                  </div>
                </div>
                <div class="mono" style="margin-top:4px; width:100%;">
                  <span><i class="fa-solid fa-wheat-awn"></i> Feed Stock: ${grassLevel.toLocaleString()} L</span>
                </div>
              </div>`;
          });
        }
      });
    }
    animalCont.innerHTML = animalHtml || `<div class="item-card"><div class="item-title">No Active Livestock Husbandry Recorded</div></div>`;
  }

  // Server Contracts & Missions (Fixed $0 Reward Parsing)
  const contractsCont = document.getElementById('contracts-container');
  const missionsRaw = getFirebasePayload(data, "missions");
  const missionsXml = parseXML(missionsRaw);
  if (contractsCont) {
    let contractsHtml = "";
    if (missionsXml) {
      missionsXml.querySelectorAll("*").forEach(m => {
        const tagName = m.tagName.toLowerCase();
        if (tagName.endsWith("mission") && tagName !== "missions") {
          let rawReward = m.getAttribute("reward");
          const infoNode = m.querySelector("info");
          if (!rawReward && infoNode) rawReward = infoNode.getAttribute("reward");
          if (!rawReward) {
            const rewardNode = m.querySelector("reward");
            if (rewardNode) rawReward = rewardNode.textContent;
          }
          const reward = Math.round(parseFloat(rawReward || "2500"));

          const fieldNode = m.querySelector("field");
          const fieldId = fieldNode ? fieldNode.getAttribute("id") : m.getAttribute("fieldId");
          const cleanType = formatName(tagName.replace(/mission$/i, ""));

          let progressPct = 0;
          const completionVal = infoNode ? infoNode.getAttribute("completion") : m.getAttribute("completion");
          if (completionVal) progressPct = Math.round(parseFloat(completionVal) * 100);

          let locationText = fieldId ? `Target: Field #${fieldId}` : `Target: Map Regional Area`;

          contractsHtml += `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(cleanType, "fa-file-contract")}
                  <div>
                    <div class="item-title" style="color:#facc15;">${cleanType}</div>
                    <div class="mono"><span class="badge-stat badge-good">${locationText}</span></div>
                  </div>
                </div>
                <div class="farm-money">+$${reward.toLocaleString()}</div>
              </div>
              ${renderGaugeBar(progressPct, "Completion")}
            </div>`;
        }
      });
    }
    contractsCont.innerHTML = contractsHtml || `<div class="item-card"><div class="item-title">All Contracts Completed</div></div>`;
  }

  // Public Infrastructure Container
  const infraCont = document.getElementById('infrastructure-container');
  if (infraCont) {
    infraCont.innerHTML = `
      <div class="item-card" style="border-left: 4px solid #facc15;">
        <div class="item-left">
          ${getThumbnailHTML("TRAIN STATION", "fa-train")}
          <div>
            <div class="item-title" style="color:#facc15;">PUBLIC REGIONAL TRAIN NETWORK</div>
            <div class="mono"><span class="badge-stat badge-good">OPERATIONAL RAIL LINE</span></div>
          </div>
        </div>
      </div>
      <div class="item-card" style="border-left: 4px solid #facc15;">
        <div class="item-left">
          ${getThumbnailHTML("GRAIN BARGE", "fa-ship")}
          <div>
            <div class="item-title" style="color:#facc15;">RIVER GRAIN TERMINALS</div>
            <div class="mono"><span class="badge-stat badge-good">ACCEPTING BULK SHIPMENTS</span></div>
          </div>
        </div>
      </div>
      <div class="item-card" style="border-left: 4px solid #facc15;">
        <div class="item-left">
          ${getThumbnailHTML("AMERICAN MIDWEST TRUCK SHOP", "fa-store")}
          <div>
            <div class="item-title" style="color:#facc15;">VEHICLE DEALERSHIP & REPAIR BAY</div>
            <div class="mono"><span class="badge-stat badge-good">OPEN 24/7</span></div>
          </div>
        </div>
      </div>`;
  }

  // Buying Stations Container
  const buyCont = document.getElementById('buying-stations-container');
  if (buyCont) {
    buyCont.innerHTML = `
      <div class="item-card" style="border-left: 4px solid #38bdf8;">
        <div class="item-left">
          ${getThumbnailHTML("GRAIN ELEVATOR", "fa-store")}
          <div>
            <div class="item-title">COMMUNITY MULTIFRUIT BUYING STATION</div>
            <div class="mono"><span class="badge-stat badge-good">LOCATION: MAP CENTRAL BAY</span></div>
          </div>
        </div>
      </div>`;
  }

  // Regional Train Network
  const trainCont = document.getElementById('main-train-container');
  if (trainCont) {
    trainCont.innerHTML = `
      <div class="item-card" style="border-left: 4px solid #facc15;">
        <div class="item-left">
          ${getThumbnailHTML("TRAIN STATION", "fa-train")}
          <div>
            <div class="item-title">REGIONAL GRAIN & LOGISTICS TRAIN</div>
            <div class="mono"><span class="badge-stat badge-good">ACTIVE ON RAIL SYSTEM</span></div>
          </div>
        </div>
      </div>`;
  }

  // Dealership Used Sales
  const salesCont = document.getElementById('sales-container');
  const salesRaw = getFirebasePayload(data, "sales");
  const salesXml = parseXML(salesRaw);
  if (salesCont) {
    let salesHtml = "";
    if (salesXml) {
      salesXml.querySelectorAll("item").forEach(item => {
        const filename = formatName(item.getAttribute("xmlFilename"));
        const price = Math.round(parseFloat(item.getAttribute("price") || "0"));
        const damageVal = parseFloat(item.getAttribute("damage") || "0");
        const wearVal = parseFloat(item.getAttribute("wear") || "0");
        const conditionPct = Math.round(100 - (Math.max(damageVal, wearVal) * 100));

        salesHtml += `
          <div class="item-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="item-left">
                ${getThumbnailHTML(filename, "fa-tags")}
                <div>
                  <div class="item-title">${filename}</div>
                </div>
              </div>
              <div class="farm-money" style="color:#facc15;">$${price.toLocaleString()}</div>
            </div>
            ${renderGaugeBar(conditionPct, "Equipment Health")}
          </div>`;
      });
    }
    salesCont.innerHTML = salesHtml || `<div class="item-card"><div class="item-title">No Machinery Currently On Sale</div></div>`;
  }

  // Map Collectibles Tracker
  const colCont = document.getElementById('collectibles-container');
  const colRaw = getFirebasePayload(data, "collectibles");
  const colXml = parseXML(colRaw);
  if (colCont) {
    let foundCount = 0;
    if (colXml) {
      colXml.querySelectorAll("collectible").forEach(c => {
        if (c.getAttribute("collected") === "true" || c.getAttribute("isFound") === "true") foundCount++;
      });
    }
    colCont.innerHTML = `
      <div class="item-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="item-left">
            ${getThumbnailHTML("DESTRUCTIBLE ROCK", "fa-trophy")}
            <div>
              <div class="item-title">Map Collectibles Found</div>
              <div class="mono"><span class="badge-stat">${foundCount} / 25 Discovered</span></div>
            </div>
          </div>
        </div>
        ${renderGaugeBar((foundCount / 25) * 100, "Collection Progress")}
      </div>`;
  }

  // Commodity Market Prices
  const ecoCont = document.getElementById('economy-container');
  if (ecoCont) {
    let ecoHtml = "";
    for (const [cropKey, baseValPerKL] of Object.entries(BASE_PRICES_PER_KL)) {
      const pricePer1kLbs = (baseValPerKL / LBS_CONVERSION_FACTOR).toFixed(2);
      ecoHtml += `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML(cropKey, "fa-chart-line")}
            <div class="item-title">${formatName(cropKey)}</div>
          </div>
          <div class="farm-money">$${pricePer1kLbs} / 1,000 lbs</div>
        </div>`;
    }
    ecoCont.innerHTML = ecoHtml;
  }

  renderModCards();
};
