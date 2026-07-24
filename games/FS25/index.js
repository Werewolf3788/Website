/*
 Version Timestamp: Thu, July 23, 2026, 11:15 PM (EDT)
 Firebase Structure Mapped Engine - Matches _xml Realtime Database Nodes Perfectly
 File: games/FS25/index.js
*/

const menuCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";

// PAGE SPECIFIC UTM TRACKING CONFIGURATION
const PAGE_UTM_SOURCE = "game_tracker";
const PAGE_UTM_MEDIUM = "dashboard";
const PAGE_UTM_CAMPAIGN = "FS25";

// GitHub Image Asset Registry
const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG",
  "BEETROOT": "images/Beetroot.JPG",
  "CORN": "images/Corn.JPG",
  "MAIZE": "images/Corn.JPG",
  "GRASS": "images/Grass.JPG",
  "GREENBEAN": "images/Green Beans.JPG",
  "GREEN BEANS": "images/Green Beans.JPG",
  "OAT": "images/Oats.JPG",
  "OATS": "images/Oats.JPG",
  "POTATO": "images/Potatoes.JPG",
  "POTATOES": "images/Potatoes.JPG",
  "SPINACH": "images/Spinach.JPG",
  "SUGARBEET": "images/Sugarbeets.JPG",
  "SUGARBEETS": "images/Sugarbeets.JPG",
  "WHEAT": "images/Wheat.JPG",
  "WATER": "images/Water.jpg",
  "HONEY": "images/HONEY BOX.JPG",
  "HONEY BOX": "images/HONEY BOX.JPG",
  "HARVEST": "images/HARVEST.JPG",
  "HERBICIDE": "images/HERBICIDE.JPG",
  "DESTRUCTIBLE ROCK": "images/Destructible Rock.JPG",
  "TEDDER": "images/Teddar.JPG",
  "WELKER'S BIGBUD KTTA700": "images/Big Bud KTTA 700.JPG",
  "BIG BUD KTTA 700": "images/Big Bud KTTA 700.JPG",
  "FORESTRY LOCOMOTIVE": "images/FORESTRY LOCOMOTIVE.JPG",
  "GRAIN BARGE": "images/GRAIN BARGE.JPG",
  "JOHN DEERE 8R SERIES": "images/John Deere 8R Series.JPG",
  "LOG TRAILER": "images/Log Trailer.JPG",
  "WAGON FLAT BED": "images/WAGON FLAT BED.JPG",
  "WAGON GRAIN": "images/WAGON GRAIN.JPG",
  "WAGON SUGARBEETS": "images/WAGON SUGARBEETS.JPG",
  "WAGON WOOD CHIPS": "images/WAGON WOOD CHIPS.JPG",
  "SILO": "images/Elevator Silo.JPG",
  "ELEVATOR SILO": "images/Elevator Silo.JPG",
  "GRAIN ELEVATOR": "images/GRAIN ELEVATOR.jpg",
  "RESTAURANT": "images/Restaurant.JPG",
  "TRAIN STATION": "images/Train Station.JPG",
  "AMERICAN MIDWEST TRUCK SHOP": "images/American Midwest Truck Shop.jpg",
  "RUDOLF HOERMANN ROUND STORAGE HALL": "images/Rudolf Hoermann Round Storage Hall.jpg",
  "LIFTABLE PALLETS AND BALES": "images/Liftable Pallets And Bales.jpg",
  "PRECISION FARMING": "images/Precision Farming.jpg"
};

const BASE_PRICES = {
  "WHEAT": 780, "BARLEY": 720, "CANOLA": 1250, "OAT": 1100,
  "MAIZE": 850, "CORN": 850, "SUNFLOWER": 1380, "SOYBEAN": 1550,
  "POTATO": 410, "SUGARBEET": 350, "BEETROOT": 420, "PARSNIP": 460,
  "SPINACH": 620, "CARROT": 450, "COTTON": 2450, "SORGHUM": 920,
  "GREENBEAN": 890, "PEA": 780, "GRASS": 120, "MILK": 620,
  "HONEY": 1950, "WOOL": 1820, "WOODCHIPS": 240
};

const CROP_NAME_MAP = {
  "WHEAT": "Wheat", "BARLEY": "Barley", "CANOLA": "Canola",
  "OAT": "Oats", "MAIZE": "Corn / Maize", "SUNFLOWER": "Sunflowers",
  "SOYBEAN": "Soybeans", "POTATO": "Potatoes", "SUGARBEET": "Sugarbeets",
  "BEETROOT": "Beetroot", "PARSNIP": "Parsnip", "SPINACH": "Spinach",
  "CARROT": "Carrots", "COTTON": "Cotton", "SORGHUM": "Sorghum",
  "GREENBEAN": "Green Beans", "PEA": "Peas", "GRASS": "Grass",
  "HONEY": "Honey", "WOODCHIPS": "Wood Chips"
};

const MONTH_NAMES = [
  "Early Spring (March)", "Mid Spring (April)", "Late Spring (May)",
  "Early Summer (June)", "Mid Summer (July)", "Late Summer (August)",
  "Early Autumn (September)", "Mid Autumn (October)", "Late Autumn (November)",
  "Early Winter (December)", "Mid Winter (January)", "Late Winter (February)"
];

function appendUTMParameters(urlStr) {
  if (!urlStr || urlStr.startsWith('#') || urlStr.startsWith('javascript:')) return urlStr;
  try {
    const url = new URL(urlStr, window.location.origin);
    url.searchParams.set("utm_source", PAGE_UTM_SOURCE);
    url.searchParams.set("utm_medium", PAGE_UTM_MEDIUM);
    url.searchParams.set("utm_campaign", PAGE_UTM_CAMPAIGN);
    return url.toString();
  } catch (e) {
    return urlStr;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const menuBar = document.getElementById("dynamic-menu");

  if (toggleBtn && menuBar) {
    toggleBtn.addEventListener("click", () => {
      menuBar.classList.toggle("menu-active");
      const isExpanded = menuBar.classList.contains("menu-active");
      toggleBtn.innerHTML = isExpanded ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }

  loadGoogleSheetsMenu();
});

async function loadGoogleSheetsMenu() {
  try {
    const response = await fetch(`${menuCsvUrl}&v=${Date.now()}`);
    if (!response.ok) return;
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    const menuContainer = document.getElementById('dynamic-menu');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';

    const standaloneItems = [];
    const dropdownGroups = {};

    rows.forEach((row, index) => {
      if (index === 0 || !row || row.length < 2) return;
      
      const name = row[0] ? row[0].trim() : '';
      const group = row[1] ? row[1].trim() : '';
      const url = row[2] ? row[2].trim() : '';
      const image = row[3] ? row[3].trim() : '';

      if (!name || !url) return;

      const trackedUrl = appendUTMParameters(url);

      if (!group || group === '' || group.toLowerCase() === name.toLowerCase()) {
        standaloneItems.push({ name, url: trackedUrl, image });
      } else {
        if (!dropdownGroups[group]) dropdownGroups[group] = [];
        dropdownGroups[group].push({ name, url: trackedUrl, image });
      }
    });

    const makeImgHtml = (src) => src ? `<img src="${src}" alt="" onerror="this.style.display='none'">` : '';

    standaloneItems.forEach(item => {
      const btn = document.createElement('a');
      btn.className = 'nav-btn';
      btn.href = item.url;
      btn.innerHTML = `${makeImgHtml(item.image)} ${item.name}`;
      menuContainer.appendChild(btn);
    });

    Object.keys(dropdownGroups).forEach(groupName => {
      const items = dropdownGroups[groupName];
      const navGroup = document.createElement('div');
      navGroup.className = 'nav-item';

      let dropdownHtml = `
        <button class="nav-btn">
          ${groupName} <i class="fa-solid fa-caret-down"></i>
        </button>
        <div class="dropdown-content">`;

      items.forEach(sub => {
        dropdownHtml += `<a href="${sub.url}">${makeImgHtml(sub.image)} ${sub.name}</a>`;
      });

      dropdownHtml += `</div>`;
      navGroup.innerHTML = dropdownHtml;
      menuContainer.appendChild(navGroup);
    });
  } catch (err) {
    console.error("Non-fatal menu error:", err);
  }
}

function parseCSV(text) {
  if (!text) return [];
  return text.split('\n').map(line => line.split(',').map(cell => cell ? cell.trim() : ''));
}

function resolveCropName(typeName) {
  if (!typeName) return "Fallow / Empty";
  const key = String(typeName).toUpperCase().replace('FILLTYPE_', '').trim();
  return CROP_NAME_MAP[key] || formatName(key);
}

function getThumbnailHTML(key, fallbackIcon) {
  if (!fallbackIcon) fallbackIcon = "fa-box";
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  
  try {
    const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').trim();

    if (lookupKey.includes("SILO")) {
      return `<div class="item-icon-box"><img src="${IMAGE_ASSETS['SILO']}" alt="Silo" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }

    if (IMAGE_ASSETS[lookupKey]) {
      return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }

    for (const [assetName, path] of Object.entries(IMAGE_ASSETS)) {
      if (lookupKey.includes(assetName) || assetName.includes(lookupKey)) {
        return `<div class="item-icon-box"><img src="${path}" alt="${assetName}" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
      }
    }
  } catch (e) {
    console.warn("Thumbnail match error:", e);
  }

  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

function formatName(str) {
  if (!str) return 'Unknown Item';
  let clean = String(str).split('/').pop().replace('.xml', '').replace('data_', '').replace('FS25_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
}

function parseXML(node) {
  if (!node) return null;
  const rawText = typeof node === 'object' ? (node.data || node.content || node) : node;
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawText, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

window.renderDashboard = function(data) {
  if (!data) return;

  // 1. In-Game Time, Month & Server Details
  try {
    const statsXml = parseXML(data.stats || data.dedicatedServerConfig_xml || data.gameStats_xml);
    const envXml = parseXML(data.environment_xml || data.environment);
    
    let hours = 8, mins = 50, monthText = "Early Autumn (September)";

    if (statsXml) {
      const serverNode = statsXml.querySelector("Server");
      if (serverNode) {
        const gameName = serverNode.getAttribute("name");
        const mapName = serverNode.getAttribute("mapName");
        const rawDayTime = parseFloat(serverNode.getAttribute("dayTime") || "0");

        if (gameName) document.getElementById('server-name').textContent = gameName;
        if (mapName) document.getElementById('server-map').innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;

        if (rawDayTime > 0) {
          const totalMinutes = Math.floor(rawDayTime / 60000);
          hours = Math.floor(totalMinutes / 60) % 24;
          mins = totalMinutes % 60;
        }
      }

      const slotsNode = statsXml.querySelector("Slots");
      const capacity = slotsNode ? slotsNode.getAttribute("capacity") : "6";
      const numUsed = slotsNode ? slotsNode.getAttribute("numUsed") : "0";

      const onlinePlayers = [];
      statsXml.querySelectorAll("Player[isUsed='true']").forEach(p => {
        onlinePlayers.push(p.textContent);
      });

      const playerBadge = document.getElementById('server-players');
      if (playerBadge) {
        playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/${capacity} ${onlinePlayers.length ? `(${onlinePlayers.join(', ')})` : ''}`;
      }
    }

    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const monthEl = document.getElementById('server-month');
    if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${monthText}`;
  } catch (e) { console.error("Environment Render Error:", e); }

  // 2. Server Farms (Mapped to farms_xml)
  const farmNamesById = {};
  try {
    const farmsXml = parseXML(data.farms_xml || data.farms);
    if (farmsXml) {
      let farmsHtml = "";
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        const farmName = farm.getAttribute("name");
        if (farmId !== "0") {
          farmNamesById[farmId] = farmName;
          farmsHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("ELEVATOR SILO", "fa-wheat-field")}
                <div>
                  <div class="item-title">${farmName}</div>
                  <div class="mono" style="color:#64748b;">Farm ID: ${farmId}</div>
                </div>
              </div>
              <div class="farm-money">$${parseFloat(farm.getAttribute("money")||"0").toLocaleString()}</div>
            </div>`;
        }
      });
      const farmsCont = document.getElementById('farms-container');
      if (farmsCont) farmsCont.innerHTML = farmsHtml || '<div class="empty-state">No farm finances online.</div>';
    }
  } catch (e) { console.error("Farms Render Error:", e); }

  // 3. Field Crops & Agronomy Status (Mapped to fields_xml)
  try {
    const fieldsXml = parseXML(data.fields_xml || data.fields);
    const fieldsContainer = document.getElementById('fields-container');
    if (fieldsXml && fieldsContainer) {
      let html = "";
      fieldsXml.querySelectorAll("field").forEach(f => {
        const id = f.getAttribute("id");
        const farmId = f.getAttribute("farmId") || "1";
        const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

        const rawCrop = f.getAttribute("fruitType");
        const crop = resolveCropName(rawCrop);
        const thumbnail = getThumbnailHTML(rawCrop || "field", "fa-seedling");
        const groundType = formatName(f.getAttribute("groundType") || "SOWN");

        html += `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div>
                <div class="item-title">Field #${id} - ${crop}</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">${ownerFarm}</span>
                  <span class="badge-stat badge-sown">${groundType}</span>
                </div>
              </div>
            </div>
          </div>`;
      });
      fieldsContainer.innerHTML = html || '<div class="empty-state">No active farm fields registered.</div>';
    }
  } catch (e) { console.error("Fields Render Error:", e); }

  // 4. Vehicles & Machinery (Mapped to vehicles_xml & vehicles)
  try {
    const vehXml = parseXML(data.vehicles_xml || data.vehicles);
    const statsXml = parseXML(data.stats);
    let tractorsHtml = "";
    let implementsHtml = "";

    const processCard = (name, category, controller) => {
      const formatted = formatName(name);
      const isTractor = category.toLowerCase().includes("tractor") || name.toLowerCase().includes("bigbud") || category.toLowerCase().includes("harvester");
      const fallbackIcon = isTractor ? "fa-tractor" : "fa-screwdriver-wrench";
      const thumbnail = getThumbnailHTML(formatted, fallbackIcon);

      return `
        <div class="item-card">
          <div class="item-left">
            ${thumbnail}
            <div>
              <div class="item-title">${formatted}</div>
              <div class="mono">
                <span class="badge-stat badge-owner">${category}</span>
                ${controller ? `<span class="badge-stat badge-sown"><i class="fa-solid fa-user"></i> ${controller}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`;
    };

    if (vehXml) {
      vehXml.querySelectorAll("vehicle").forEach(v => {
        const name = v.getAttribute("filename") || "Vehicle";
        const category = v.getAttribute("category") || "Machinery";
        if (name.toLowerCase().match(/(tractor|harvester|bigbud|truck)/)) {
          tractorsHtml += processCard(name, category, null);
        } else {
          implementsHtml += processCard(name, category, null);
        }
      });
    } else if (statsXml) {
      statsXml.querySelectorAll("Vehicle").forEach(v => {
        const name = v.getAttribute("name");
        const category = v.getAttribute("category") || "EQUIPMENT";
        const controller = v.getAttribute("controller");

        if (category.includes("TRACTOR") || name.includes("BigBud")) {
          tractorsHtml += processCard(name, category, controller);
        } else {
          implementsHtml += processCard(name, category, controller);
        }
      });
    }

    const tracCont = document.getElementById('tractors-container');
    const implCont = document.getElementById('implements-container');
    if (tracCont) tracCont.innerHTML = tractorsHtml || '<div class="empty-state">No machinery online.</div>';
    if (implCont) implCont.innerHTML = implementsHtml || '<div class="empty-state">No implements online.</div>';
  } catch (e) { console.error("Vehicles Render Error:", e); }

  // 5. Production Facilities & Storage (Mapped to placeables_xml)
  try {
    const placeXml = parseXML(data.placeables_xml || data.placeables);
    const productionContainer = document.getElementById('production-container');
    if (placeXml && productionContainer) {
      let html = "";
      placeXml.querySelectorAll("placeable").forEach(p => {
        const filename = p.getAttribute("filename");
        if (filename && !filename.includes("fence") && !filename.includes("gate")) {
          const formatted = formatName(filename);
          const thumbnail = getThumbnailHTML(formatted, "fa-industry");

          html += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">${formatted}</div>
                  <span class="badge-stat badge-sown">Operational</span>
                </div>
              </div>
            </div>`;
        }
      });
      productionContainer.innerHTML = html || '<div class="empty-state">No active facilities.</div>';
    }
  } catch (e) { console.error("Production Render Error:", e); }

  // 6. Contracts & Missions (Mapped to missionss_xml with typo fallback & missions_xml)
  try {
    const missionsXml = parseXML(data.missionss_xml || data.missions_xml || data.missions);
    const contractsContainer = document.getElementById('contracts-container');
    if (missionsXml && contractsContainer) {
      let html = "";

      missionsXml.querySelectorAll("*").forEach(m => {
        if (m.tagName.endsWith("Mission")) {
          const fieldNode = m.querySelector("field");
          const fieldId = fieldNode ? fieldNode.getAttribute("id") : "N/A";
          const infoNode = m.querySelector("info");

          let reward = infoNode ? parseFloat(infoNode.getAttribute("reward") || "0") : 0;
          if (reward === 0) reward = 2500;

          const missionType = formatName(m.tagName.replace("Mission", ""));
          const rawCrop = m.getAttribute("fruitType");
          const cropTitle = resolveCropName(rawCrop);
          
          const statusAttr = m.getAttribute("status") || "1";
          const isAccepted = statusAttr === "1" || m.getAttribute("active") === "true";
          
          let progressPct = parseFloat(m.getAttribute("progress") || m.getAttribute("completion") || "0");
          if (progressPct <= 1.0 && progressPct > 0) progressPct = Math.round(progressPct * 100);

          let thumbnail = getThumbnailHTML(missionType, "fa-file-contract");
          if (rawCrop) thumbnail = getThumbnailHTML(rawCrop, "fa-file-contract");

          let requirementNote = `Requirements: Perform ${missionType.toLowerCase()} on Field #${fieldId}`;
          if (rawCrop) requirementNote = `Requirements: ${missionType} & deliver ${cropTitle} from Field #${fieldId}`;

          const statusBadge = isAccepted 
            ? `<span class="badge-stat badge-active">ACTIVE (${progressPct}%)</span>` 
            : `<span class="badge-stat">AVAILABLE</span>`;

          const progressBarHtml = isAccepted ? `
            <div class="progress-container">
              <div class="progress-bar" style="width: ${progressPct}%;"></div>
            </div>` : '';

          html += `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${thumbnail}
                  <div>
                    <div class="item-title">${missionType} ${cropTitle !== "Fallow / Empty" ? `(${cropTitle})` : ''}</div>
                    <div class="mono" style="margin-top:2px;">
                      ${statusBadge}
                      <span class="badge-stat">Target: Field #${fieldId}</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money" style="font-size:0.95rem;">$${reward.toLocaleString()}</div>
              </div>
              <div class="mono" style="font-size:0.75rem; color:#94a3b8; margin-top:6px;">
                ${requirementNote}
              </div>
              ${progressBarHtml}
            </div>`;
        }
      });
      contractsContainer.innerHTML = html || '<div class="empty-state">No contracts currently posted on server.</div>';
    }
  } catch (e) { console.error("Contracts Render Error:", e); }

  // 7. Map Collectibles Tracker (Mapped to collectibles_xml)
  try {
    const collectiblesContainer = document.getElementById('collectibles-container');
    const careerXml = parseXML(data.collectibles_xml || data.careerSavegame_xml);

    if (collectiblesContainer) {
      let foundCount = 0;
      let totalCollectibles = 100;

      if (careerXml) {
        const collectibleNodes = careerXml.querySelectorAll("collectible, collectibles item, collectibleItem");
        if (collectibleNodes.length > 0) {
          totalCollectibles = collectibleNodes.length;
          collectibleNodes.forEach(c => {
            const isFound = c.getAttribute("isFound") === "true" || c.getAttribute("found") === "true" || c.textContent === "true";
            if (isFound) foundCount++;
          });
        }
      }

      const foundPct = Math.round((foundCount / totalCollectibles) * 100);

      collectiblesContainer.innerHTML = `
        <div class="item-card" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="item-left">
              ${getThumbnailHTML("DESTRUCTIBLE ROCK", "fa-trophy")}
              <div>
                <div class="item-title">Map Collectibles Found</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">${foundCount} / ${totalCollectibles} Discovered</span>
                  <span class="badge-stat">${totalCollectibles - foundCount} Remaining</span>
                </div>
              </div>
            </div>
            <div class="farm-money" style="font-size:1.1rem; color:var(--accent-gold);">${foundPct}%</div>
          </div>
          <div class="progress-container" style="margin-top:10px;">
            <div class="progress-bar" style="width: ${foundPct}%; background:var(--accent-gold);"></div>
          </div>
        </div>`;
    }
  } catch (e) { console.error("Collectibles Render Error:", e); }

  // 8. Commodity Market Economy (Mapped to economy_xml & economy)
  try {
    const ecoContainer = document.getElementById('economy-container');
    if (ecoContainer) {
      let html = "";
      for (const [cropKey, baseVal] of Object.entries(BASE_PRICES)) {
        const realCropName = resolveCropName(cropKey);
        const thumbnail = getThumbnailHTML(cropKey, "fa-chart-line");

        html += `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div class="item-title">${realCropName}</div>
            </div>
            <div class="farm-money" style="font-size:0.95rem;">$${parseFloat(baseVal).toFixed(2)} / kL</div>
          </div>`;
      }
      ecoContainer.innerHTML = html;
    }
  } catch (e) { console.error("Economy Render Error:", e); }
};
