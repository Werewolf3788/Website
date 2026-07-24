/*
 Version Timestamp: Fri, July 24, 2026, 04:45 PM (EDT)
 Complete Deep XML & Firebase Direct Path Resolver
 File: games/FS25/index.js
*/

// External Endpoints
const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";
const CSV_MODS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Asset Image Reference Map
const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG", "BEETROOT": "images/Beetroot.JPG", "RED BEET": "images/Beetroot.JPG",
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

// Firebase Direct Key Extractor (Handles root, /data child keys, _xml, or _raw)
function getFirebasePayload(rootObj, targetKey) {
  if (!rootObj || typeof rootObj !== 'object') return null;
  
  if (rootObj[targetKey]) {
    if (typeof rootObj[targetKey] === 'string') return rootObj[targetKey];
    if (rootObj[targetKey].data) return rootObj[targetKey].data;
  }
  
  const xmlKey = `${targetKey}_xml`;
  if (rootObj[xmlKey]) {
    if (typeof rootObj[xmlKey] === 'string') return rootObj[xmlKey];
    if (rootObj[xmlKey].data) return rootObj[xmlKey].data;
  }

  const rawKey = `${targetKey}_raw`;
  if (rootObj[rawKey]) {
    if (typeof rootObj[rawKey] === 'string') return rootObj[rawKey];
  }

  return null;
}

// Robust XML Parsing Sanitizer
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

function renderGaugeBar(percentage, labelText) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  let barColor = "#ef4444";
  if (pct >= 71) {
    barColor = "#22c55e";
  } else if (pct >= 40) {
    barColor = "#eab308";
  }

  return `
    <div class="gauge-wrapper" style="margin-top:6px; width:100%;">
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#a1a1aa; font-family:var(--font-mono); margin-bottom:3px;">
        <span>${labelText}</span>
        <span style="color:${barColor}; font-weight:bold;">${pct}%</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${pct}%; background-color: ${barColor};"></div>
      </div>
    </div>`;
}

// Server Status Handler
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

    if (offlineTimerInterval) {
      clearInterval(offlineTimerInterval);
      offlineTimerInterval = null;
    }
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

    if (categoriesBar) {
      let filterHtml = "";
      categoriesSet.forEach(cat => {
        filterHtml += `<button type="button" class="category-filter-btn ${cat === 'ALL MODS' ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
      });
      categoriesBar.innerHTML = filterHtml;
    }

    renderModCards("ALL MODS");

  } catch (e) {
    grid.innerHTML = `<div class="item-card"><div class="item-title"><i class="fa-solid fa-cube"></i> Server Mods Active (CSV Catalog Loading Offline)</div></div>`;
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
    const crossplayBadge = (mod.crossplay && mod.crossplay.toLowerCase() === 'yes') ? `<span class="badge-stat badge-sky"><i class="fa-solid fa-gamepad"></i> CROSSPLAY</span>` : '';

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
          <button type="button" class="nav-btn open-mod-lightbox" data-title="${mod.name}" data-img="${mod.image}" data-desc="${encodeURIComponent(mod.description)}" data-url="${mod.url}">
            Read More <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>`;
  });

  grid.innerHTML = html || `<div class="loading-state">No mods found in this category.</div>`;
}

// Lightbox Setup
document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".lightbox-trigger, .open-mod-lightbox");
  if (trigger) {
    e.preventDefault();
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

  const filterBtn = e.target.closest(".category-filter-btn");
  if (filterBtn) {
    document.querySelectorAll(".category-filter-btn").forEach(b => b.classList.remove("active"));
    filterBtn.classList.add("active");
    renderModCards(filterBtn.getAttribute("data-category"));
  }
});

// DOM Loader
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

// Master Telemetry Render Engine
window.renderDashboard = function(data) {
  if (!data) return;

  window.setServerStatus(true);

  // Process Active Server Mods
  activeServerMods.clear();
  const configRaw = getFirebasePayload(data, "dedicatedServerConfig") || getFirebasePayload(data, "stats") || getFirebasePayload(data, "careerSavegame");
  const configXml = parseXML(configRaw);
  if (configXml) {
    configXml.querySelectorAll("mod, Mod").forEach(m => {
      const filename = m.getAttribute("filename") || m.getAttribute("name") || m.getAttribute("modName");
      if (filename) activeServerMods.add(filename.replace('.zip', ''));
    });
  }

  // Footer Sync Info
  const syncTimeEl = document.getElementById('last-sync-time');
  if (syncTimeEl) {
    const now = new Date();
    syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last Telemetry Sync: <strong style="color:#22c55e;">${now.toLocaleTimeString()}</strong>`;
  }

  // 1. Registered Server Farms (farms-container)
  const farmsRaw = getFirebasePayload(data, "farms") || getFirebasePayload(data, "careerSavegame");
  const farmsXml = parseXML(farmsRaw);
  const farmsCont = document.getElementById('farms-container');
  const farmNamesById = { "0": "Public / Server Land" };

  if (farmsCont) {
    let farmsHtml = "";
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId") || farm.getAttribute("id");
        let farmName = farm.getAttribute("name") || `Farm #${farmId}`;
        const money = Math.round(parseFloat(farm.getAttribute("money") || "0"));
        const loan = Math.round(parseFloat(farm.getAttribute("loan") || "0"));

        let managerName = "Unassigned";
        const managerNode = farm.querySelector("player[farmManager='true']");
        if (managerNode) {
          managerName = managerNode.getAttribute("lastNickname") || "Active Manager";
        }

        if (farmId && farmId !== "0") {
          farmNamesById[farmId] = farmName;
          farmsHtml += `
            <div class="item-card" style="border-left: 4px solid #10b981; flex-direction:column; align-items:flex-start;">
              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML("WHEAT", "fa-wheat-field")}
                  <div>
                    <div class="item-title" style="color:#facc15;">${farmName.toUpperCase()} (ID: ${farmId})</div>
                    <div class="mono" style="margin-top:4px;">
                      <span class="badge-stat badge-good">Manager: ${managerName}</span>
                      <span class="badge-stat badge-warning">Loan: $${loan.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money">$${money.toLocaleString()}</div>
              </div>
            </div>`;
        }
      });
    }
    farmsCont.innerHTML = farmsHtml || `
      <div class="item-card" style="border-left: 4px solid #10b981;">
        <div class="item-left">
          ${getThumbnailHTML("WHEAT", "fa-wheat-field")}
          <div>
            <div class="item-title">PRIMARY FARM ACCOUNT</div>
            <div class="mono"><span class="badge-stat badge-good">ACTIVE</span></div>
          </div>
        </div>
        <div class="farm-money">$1,000,000</div>
      </div>`;
  }

  // 2. Public Map Infrastructure (infrastructure-container)
  const infraCont = document.getElementById('infrastructure-container');
  if (infraCont) {
    let infraHtml = `
      <div class="item-card">
        <div class="item-left">
          ${getThumbnailHTML("TRAIN STATION", "fa-train")}
          <div>
            <div class="item-title">Public Regional Train Network</div>
            <div class="mono"><span class="badge-stat badge-good">Operational (Rail Line)</span></div>
          </div>
        </div>
      </div>
      <div class="item-card">
        <div class="item-left">
          ${getThumbnailHTML("GRAIN BARGE", "fa-ship")}
          <div>
            <div class="item-title">River Grain Terminals</div>
            <div class="mono"><span class="badge-stat badge-good">Accepting Bulk Cargo</span></div>
          </div>
        </div>
      </div>
      <div class="item-card">
        <div class="item-left">
          ${getThumbnailHTML("AMERICAN MIDWEST TRUCK SHOP", "fa-store")}
          <div>
            <div class="item-title">Equipment Dealership & Repair Bay</div>
            <div class="mono"><span class="badge-stat badge-good">Open 24/7</span></div>
          </div>
        </div>
      </div>`;
    infraCont.innerHTML = infraHtml;
  }

  // 3. Field Crops & Agronomy Status (fields-container)
  const fieldsCont = document.getElementById('fields-container');
  const fieldsRaw = getFirebasePayload(data, "fields") || getFirebasePayload(data, "farmland");
  const precisionRaw = getFirebasePayload(data, "precisionFarming");
  const fieldsXml = parseXML(fieldsRaw);
  const precisionXml = parseXML(precisionRaw);

  if (fieldsCont) {
    let fieldsHtml = "";
    if (fieldsXml) {
      fieldsXml.querySelectorAll("field, farmland").forEach(f => {
        const id = f.getAttribute("id");
        const crop = formatName(f.getAttribute("fruitType") || "Prepared Ground");
        const groundType = formatName(f.getAttribute("groundType") || "SOWN");
        const sprayLevel = parseInt(f.getAttribute("sprayLevel") || "0", 10);
        let fertBadge = sprayLevel >= 2 ? `<span class="badge-stat badge-good">Fertilized: 100% (L2)</span>` : `<span class="badge-stat badge-warning">Fertilized: ${sprayLevel * 50}%</span>`;

        let pfWidth = "";
        if (precisionXml) {
          const pfNode = precisionXml.querySelector(`tramlineMap farmland[farmlandId='${id}']`);
          if (pfNode) {
            pfWidth = `<span class="badge-stat" style="color:var(--accent-gold);">${parseFloat(pfNode.getAttribute("width") || "27").toFixed(0)}m Tramlines</span>`;
          }
        }

        fieldsHtml += `
          <div class="item-card">
            <div class="item-left">
              ${getThumbnailHTML(crop, "fa-seedling")}
              <div>
                <div class="item-title">Field #${id} - ${crop}</div>
                <div class="mono" style="margin-top:4px;">
                  <span class="badge-stat">${groundType}</span>
                  ${fertBadge}
                  ${pfWidth}
                </div>
              </div>
            </div>
          </div>`;
      });
    }
    fieldsCont.innerHTML = fieldsHtml || `<div class="item-card"><div class="item-title">55 Farmland Parcels Logged</div></div>`;
  }

  // 4. Fleet Machinery & Vehicles (tractors-container)
  // 5. Implements & Equipment (implements-container)
  const tracCont = document.getElementById('tractors-container');
  const implCont = document.getElementById('implements-container');
  const vehiclesRaw = getFirebasePayload(data, "vehicles") || getFirebasePayload(data, "stats");
  const vehXml = parseXML(vehiclesRaw);

  if (tracCont || implCont) {
    let tractorsHtml = "";
    let implementsHtml = "";

    if (vehXml) {
      vehXml.querySelectorAll("vehicle, Vehicle").forEach(v => {
        const name = formatName(v.getAttribute("name") || v.getAttribute("filename") || v.getAttribute("modName"));
        if (!name.includes("WAGON") && !name.includes("TRAIN")) {
          const controller = v.getAttribute("controller") || (v.getAttribute("isAIActive") === "true" ? "AI Helper" : "Unmanned");
          const isTractor = name.includes("TRACTOR") || name.includes("HARVESTER") || name.includes("BIGBUD") || name.includes("JOHN DEERE");

          let fuelGaugeHtml = "";
          const dieselUnit = v.querySelector("fillUnit unit[fillType='DIESEL']");
          if (dieselUnit) {
            const fillLevel = parseFloat(dieselUnit.getAttribute("fillLevel") || "0");
            const pct = Math.min(100, Math.round((fillLevel / 2000) * 100));
            fuelGaugeHtml = renderGaugeBar(pct, `Fuel (${Math.round(fillLevel)}L)`);
          }

          const cardHtml = `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(name, isTractor ? "fa-tractor" : "fa-screwdriver-wrench")}
                  <div>
                    <div class="item-title">${name}</div>
                    <div class="mono" style="margin-top:2px;"><span class="badge-stat badge-good">${controller}</span></div>
                  </div>
                </div>
              </div>
              ${fuelGaugeHtml}
            </div>`;

          if (isTractor) tractorsHtml += cardHtml;
          else implementsHtml += cardHtml;
        }
      });
    }

    if (tracCont) tracCont.innerHTML = tractorsHtml || `<div class="item-card"><div class="item-title">No Active Tractors Logged</div></div>`;
    if (implCont) implCont.innerHTML = implementsHtml || `<div class="item-card"><div class="item-title">No Active Equipment Logged</div></div>`;
  }

  // 6. Factories & Production Chains
  const prodCont = document.getElementById('main-productions-container');
  const placeablesRaw = getFirebasePayload(data, "placeables");
  const placeXml = parseXML(placeablesRaw);
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
              <div class="mono" style="margin-top:6px; border-top:1px solid var(--border-subtle); padding-top:6px; width:100%;">
                <span><i class="fa-solid fa-gears"></i> Active Recipes: ${recipeList.length > 0 ? recipeList.join(", ") : "Standby"}</span>
              </div>
            </div>`;
        }
      });
    }
    prodCont.innerHTML = prodHtml || `<div class="item-card"><div class="item-title">Public Regional Grain Elevator</div></div>`;
  }

  // 7. Livestock & Animal Husbandry
  const animalCont = document.getElementById('animal-husbandry-container');
  if (animalCont) {
    let animalHtml = "";
    if (placeXml) {
      placeXml.querySelectorAll("placeable").forEach(p => {
        const husbandry = p.querySelector("husbandryAnimals");
        if (husbandry) {
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
                <div class="mono" style="margin-top:6px; border-top:1px solid var(--border-subtle); padding-top:6px; width:100%;">
                  <span><i class="fa-solid fa-wheat-awn"></i> Feed Stock: ${grassLevel.toLocaleString()} L</span>
                </div>
              </div>`;
          });
        }
      });
    }
    animalCont.innerHTML = animalHtml || `<div class="item-card"><div class="item-title">No Active Livestock Husbandry Recorded</div></div>`;
  }

  // 8. Server Contracts & Missions (contracts-container)
  const contractsCont = document.getElementById('contracts-container');
  const missionsRaw = getFirebasePayload(data, "missions");
  const missionsXml = parseXML(missionsRaw);
  if (contractsCont) {
    let contractsHtml = "";
    if (missionsXml) {
      missionsXml.querySelectorAll("*").forEach(m => {
        const tagName = m.tagName.toLowerCase();
        if (tagName.endsWith("mission") && tagName !== "missions") {
          const reward = Math.round(parseFloat(m.getAttribute("reward") || "0"));
          const fieldNode = m.querySelector("field");
          const fieldId = fieldNode ? fieldNode.getAttribute("id") : m.getAttribute("fieldId");
          const cleanType = formatName(tagName.replace(/mission$/i, ""));

          let progressPct = 0;
          const completionVal = m.querySelector("info")?.getAttribute("completion");
          if (completionVal) progressPct = Math.round(parseFloat(completionVal) * 100);

          contractsHtml += `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(cleanType, "fa-file-contract")}
                  <div>
                    <div class="item-title" style="color:#facc15;">${cleanType} MISSION</div>
                    <div class="mono"><span class="badge-stat badge-good">Target: Field #${fieldId || 'N/A'}</span></div>
                  </div>
                </div>
                <div class="farm-money">+$${reward.toLocaleString()}</div>
              </div>
              ${renderGaugeBar(progressPct, "Mission Completion")}
            </div>`;
        }
      });
    }
    contractsCont.innerHTML = contractsHtml || `<div class="item-card"><div class="item-title">All Contracts Completed</div></div>`;
  }

  // 9. Buying Stations Container
  const buyCont = document.getElementById('buying-stations-container');
  if (buyCont) {
    buyCont.innerHTML = `
      <div class="item-card" style="border-left: 4px solid #38bdf8;">
        <div class="item-left">
          ${getThumbnailHTML("GRAIN ELEVATOR", "fa-store")}
          <div>
            <div class="item-title">COMMUNITY MULTIFRUIT BUYING STATION</div>
            <div class="mono"><span class="badge-stat badge-good">PUBLIC ACCESS</span></div>
          </div>
        </div>
      </div>`;
  }

  // 10. Regional Train Network
  const trainCont = document.getElementById('main-train-container');
  if (trainCont) {
    trainCont.innerHTML = `
      <div class="item-card" style="border-left: 4px solid #facc15;">
        <div class="item-left">
          ${getThumbnailHTML("TRAIN STATION", "fa-train")}
          <div>
            <div class="item-title">REGIONAL GRAIN & LOGISTICS TRAIN</div>
            <div class="mono"><span class="badge-stat badge-good">ACTIVE ON MAP</span></div>
          </div>
        </div>
      </div>`;
  }

  // 11. Dealership Used Sales (sales-container)
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
            ${renderGaugeBar(conditionPct, "Condition")}
          </div>`;
      });
    }
    salesCont.innerHTML = salesHtml || `<div class="item-card"><div class="item-title">No Machinery Currently On Sale</div></div>`;
  }

  // 12. Map Collectibles Tracker (collectibles-container)
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
              <div class="item-title">Map Collectibles Discovered</div>
              <div class="mono"><span class="badge-stat">${foundCount} / 25 Found</span></div>
            </div>
          </div>
        </div>
        ${renderGaugeBar((foundCount / 25) * 100, "Collection Progress")}
      </div>`;
  }

  // 13. Commodity Market Prices (economy-container)
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
