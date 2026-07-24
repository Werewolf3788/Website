/*
 Version Timestamp: Thu, July 23, 2026, 11:50 PM (EDT)
 Resilient FS25 Realtime Tactical Dashboard Engine (Complete Cross-Referencing & Infrastructure Separation)
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
  "RED BEET": "images/Beetroot.JPG",
  "CORN": "images/Corn.JPG",
  "MAIZE": "images/Corn.JPG",
  "GRASS": "images/Grass.JPG",
  "GREENBEAN": "images/Green Beans.JPG",
  "GREEN BEANS": "images/Green Beans.JPG",
  "OAT": "images/Oats.JPG",
  "OATS": "images/Oats.JPG",
  "POTATO": "images/Potatoes.JPG",
  "POTATOES": "images/Potatoes.JPG",
  "CARROT": "images/VEHICLE_WAGON_ROOTS.JPG",
  "PARSNIP": "images/VEHICLE_WAGON_ROOTS.JPG",
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
  "WAGON SUGARBEETS": "images/VEHICLE_WAGON_ROOTS.JPG",
  "WAGON ROOT CROP": "images/VEHICLE_WAGON_ROOTS.JPG",
  "WAGON ROOTS": "images/VEHICLE_WAGON_ROOTS.JPG",
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

const BASE_PRICES_PER_KL = {
  "WHEAT": 780, "BARLEY": 720, "CANOLA": 1250, "OAT": 1100,
  "MAIZE": 850, "CORN": 850, "SUNFLOWER": 1380, "SOYBEAN": 1550,
  "POTATO": 410, "SUGARBEET": 350, "BEETROOT": 420, "PARSNIP": 460,
  "SPINACH": 620, "CARROT": 450, "COTTON": 2450, "SORGHUM": 920,
  "GREENBEAN": 890, "PEA": 780, "GRASS": 120, "MILK": 620,
  "HONEY": 1950, "WOOL": 1820, "WOODCHIPS": 240
};

const LBS_CONVERSION_FACTOR = 1.76374;

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

  // Instant restoration of cached telemetry
  const cachedData = localStorage.getItem("fs25_last_known_telemetry");
  if (cachedData) {
    try {
      window.renderDashboard(JSON.parse(cachedData));
    } catch (e) {
      console.warn("Cache restore skipped:", e);
    }
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

    const makeImgHtml = (src) => src ? `<img src="${src}" alt="" style="width:20px; height:20px; max-width:20px; max-height:20px; object-fit:contain;" onerror="this.style.display='none'">` : '';

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
    const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();

    if (
      lookupKey.includes("WAGON") && 
      (lookupKey.includes("SUGARBEET") || lookupKey.includes("POTATO") || lookupKey.includes("CARROT") || lookupKey.includes("BEET") || lookupKey.includes("PARSNIP") || lookupKey.includes("ROOT"))
    ) {
      return `<div class="item-icon-box"><img src="${IMAGE_ASSETS['WAGON ROOTS']}" alt="Root Crop Wagon" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }

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
  let clean = String(str).split('/').pop().replace('.xml', '').replace('data_', '').replace('FS25_', '').replace('VEHICLE_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
}

function parseXML(node) {
  if (!node) return null;
  let rawText = node;
  
  if (typeof node === 'object') {
    rawText = node.data || node.content || node.xml || (Object.keys(node).length === 1 ? Object.values(node)[0] : null);
  }
  
  if (!rawText || typeof rawText !== 'string') return null;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawText, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { 
    return null; 
  }
}

window.renderDashboard = function(data) {
  if (!data) return;

  try {
    localStorage.setItem("fs25_last_known_telemetry", JSON.stringify(data));
  } catch (e) {}

  // 1. In-Game Time, Month & Server Details
  try {
    const statsXml = parseXML(data.stats || data.dedicatedServerConfig_xml);
    const envXml = parseXML(data.environment || data.environment_xml);
    
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

    if (envXml) {
      const monthNode = envXml.querySelector("currentMonth") || envXml.querySelector("month");
      if (monthNode && monthNode.textContent) {
        const mIdx = parseInt(monthNode.textContent.trim());
        if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
          monthText = MONTH_NAMES[mIdx - 1];
        }
      }
    }

    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const monthEl = document.getElementById('server-month');
    if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${monthText}`;
  } catch (e) { console.error("Environment Render Error:", e); }

  // 2. Farmland Ownership Cross-Referencing
  const landOwnerByFarmlandId = {};
  try {
    const farmlandXml = parseXML(data.farmlands || data.farmlands_xml);
    if (farmlandXml) {
      farmlandXml.querySelectorAll("farmland").forEach(fl => {
        landOwnerByFarmlandId[fl.getAttribute("id")] = fl.getAttribute("farmId") || "0";
      });
    }
  } catch (e) { console.error("Farmlands Cross-Ref Error:", e); }

  // 3. Server Farms & Player Managers
  const farmNamesById = { "0": "Public / Server Land" };
  try {
    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      let farmsHtml = "";
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        let rawName = farm.getAttribute("name");
        
        if (!rawName || rawName.trim() === "") {
          rawName = farmId === "1" ? "My Farm" : `Farm #${farmId}`;
        }

        if (farmId !== "0") {
          farmNamesById[farmId] = rawName;
          const roundedMoney = Math.round(parseFloat(farm.getAttribute("money") || "0"));

          let managerName = "Unassigned";
          const managerNode = farm.querySelector("player[farmManager='true']");
          if (managerNode) {
            managerName = managerNode.getAttribute("lastNickname") || "Active Manager";
          }

          farmsHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("ELEVATOR SILO", "fa-wheat-field")}
                <div>
                  <div class="item-title">${rawName}</div>
                  <div class="mono" style="color:#64748b; font-size:0.8rem;">
                    Manager: <span style="color:#ffffff;">${managerName}</span> (ID: ${farmId})
                  </div>
                </div>
              </div>
              <div class="farm-money">$${roundedMoney.toLocaleString()}</div>
            </div>`;
        }
      });
      const farmsCont = document.getElementById('farms-container');
      if (farmsCont && farmsHtml) farmsCont.innerHTML = farmsHtml;
    }
  } catch (e) { console.error("Farms Render Error:", e); }

  // 4. Field Crops & Precision Agronomy Cross-Referencing
  try {
    const fieldsXml = parseXML(data.fields || data.fields_xml);
    const precisionXml = parseXML(data.precisionFarming || data.precisionFarming_xml);
    const fieldsContainer = document.getElementById('fields-container');

    if (fieldsXml && fieldsContainer) {
      let html = "";
      fieldsXml.querySelectorAll("field").forEach(f => {
        const id = f.getAttribute("id");
        const farmId = landOwnerByFarmlandId[id] || f.getAttribute("farmId") || "0";
        const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

        const rawCrop = f.getAttribute("fruitType");
        const crop = resolveCropName(rawCrop);
        const thumbnail = getThumbnailHTML(rawCrop || "field", "fa-seedling");
        const groundType = formatName(f.getAttribute("groundType") || "SOWN");
        const sprayLevel = f.getAttribute("sprayLevel") || "0";

        // Precision Farming Cross-Ref
        let pfWidth = "Standard";
        if (precisionXml) {
          const pfNode = precisionXml.querySelector(`tramlineMap farmland[farmlandId='${id}']`);
          if (pfNode) {
            pfWidth = `${parseFloat(pfNode.getAttribute("width") || "27").toFixed(0)}m Tramline`;
          }
        }

        html += `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div>
                <div class="item-title">Field #${id} - ${crop}</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">${ownerFarm}</span>
                  <span class="badge-stat badge-sown">${groundType}</span>
                  <span class="badge-stat">Fertilizer Level ${sprayLevel}</span>
                  <span class="badge-stat" style="color:var(--accent-gold);">${pfWidth}</span>
                </div>
              </div>
            </div>
          </div>`;
      });
      if (html) fieldsContainer.innerHTML = html;
    }
  } catch (e) { console.error("Fields Render Error:", e); }

  // 5. Vehicles, Machinery & Active AI Field Workers
  try {
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    const statsXml = parseXML(data.stats);
    let tractorsHtml = "";
    let implementsHtml = "";

    const processCard = (vNode, name, category, controller) => {
      const formatted = formatName(name);
      const isTractor = category.toLowerCase().includes("tractor") || name.toLowerCase().includes("bigbud") || category.toLowerCase().includes("harvester");
      const fallbackIcon = isTractor ? "fa-tractor" : "fa-screwdriver-wrench";
      const thumbnail = getThumbnailHTML(formatted, fallbackIcon);

      const farmId = vNode ? (vNode.getAttribute("farmId") || "1") : "1";
      const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

      let fuelText = "";
      if (vNode) {
        const dieselUnit = vNode.querySelector("fillUnit unit[fillType='DIESEL']");
        if (dieselUnit) {
          const dieselLevel = Math.round(parseFloat(dieselUnit.getAttribute("fillLevel") || "0"));
          fuelText = `<span class="badge-stat" style="color:#38bdf8;"><i class="fa-solid fa-gas-pump"></i> ${dieselLevel}L Fuel</span>`;
        }
      }

      let aiStatus = "";
      if (vNode) {
        const aiNode = vNode.querySelector("aiFieldWorker[isActive='true']");
        if (aiNode) {
          aiStatus = `<span class="badge-stat badge-active"><i class="fa-solid fa-robot"></i> AI WORKER ACTIVE</span>`;
        }
      }

      return `
        <div class="item-card">
          <div class="item-left">
            ${thumbnail}
            <div>
              <div class="item-title">${formatted}</div>
              <div class="mono" style="margin-top:2px;">
                <span class="badge-stat badge-owner">${ownerFarm}</span>
                <span class="badge-stat">${category}</span>
                ${fuelText}
                ${aiStatus}
                ${controller ? `<span class="badge-stat badge-sown"><i class="fa-solid fa-user"></i> ${controller}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`;
    };

    if (vehXml) {
      vehXml.querySelectorAll("vehicle").forEach(v => {
        const farmId = v.getAttribute("farmId");
        if (farmId === "0") return; // Filter out train/public vehicles from owned fleet

        const name = v.getAttribute("filename") || "Vehicle";
        const category = v.getAttribute("category") || "Machinery";
        if (name.toLowerCase().match(/(tractor|harvester|bigbud|truck|series8)/)) {
          tractorsHtml += processCard(v, name, category, null);
        } else if (!name.toLowerCase().includes("pallet") && !name.toLowerCase().includes("wagon")) {
          implementsHtml += processCard(v, name, category, null);
        }
      });
    } else if (statsXml) {
      statsXml.querySelectorAll("Vehicle").forEach(v => {
        const name = v.getAttribute("name");
        const category = v.getAttribute("category") || "EQUIPMENT";
        const controller = v.getAttribute("controller");

        if (category.includes("TRACTOR") || name.includes("BigBud")) {
          tractorsHtml += processCard(null, name, category, controller);
        } else {
          implementsHtml += processCard(null, name, category, controller);
        }
      });
    }

    const tracCont = document.getElementById('tractors-container');
    const implCont = document.getElementById('implements-container');
    if (tracCont && tractorsHtml) tracCont.innerHTML = tractorsHtml;
    if (implCont && implementsHtml) implCont.innerHTML = implementsHtml;
  } catch (e) { console.error("Vehicles Render Error:", e); }

  // 6. Public Infrastructure & Unownable Map Assets (Store, Train, Barges, Water Stations)
  try {
    const publicContainer = document.getElementById('infrastructure-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);

    if (publicContainer) {
      let infraHtml = "";

      // A. Train System Status
      if (placeXml) {
        const trainNode = placeXml.querySelector("placeable[uniqueId='trainSystem']");
        if (trainNode) {
          const isRented = trainNode.querySelector("trainSystem")?.getAttribute("isRented") === "true";
          const statusText = isRented ? "Rented / Active" : "Operational (Rail Network)";

          infraHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("FORESTRY LOCOMOTIVE", "fa-train")}
                <div>
                  <div class="item-title">Public Regional Railroad & Train Line</div>
                  <div class="mono" style="margin-top:2px;">
                    <span class="badge-stat badge-owner">Public Map Infrastructure</span>
                    <span class="badge-stat badge-sown">${statusText}</span>
                  </div>
                </div>
              </div>
            </div>`;
        }
      }

      // B. Grain Barges & River Delivery Terminals
      if (placeXml) {
        placeXml.querySelectorAll("placeable[uniqueId*='grainBargeTerminal']").forEach(b => {
          const uid = b.getAttribute("uniqueId");
          const formatted = uid.includes("01") ? "East River Grain Barge Terminal" : "West River Grain Barge Terminal";

          infraHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("GRAIN BARGE", "fa-ship")}
                <div>
                  <div class="item-title">${formatted}</div>
                  <div class="mono" style="margin-top:2px;">
                    <span class="badge-stat badge-owner">River Freight Terminal</span>
                    <span class="badge-stat badge-sown">Accepting Grain & Bulk</span>
                  </div>
                </div>
              </div>
            </div>`;
        });
      }

      // C. Vehicle Dealership & Animal Trader
      if (placeXml) {
        const storeNode = placeXml.querySelector("placeable[uniqueId*='sellingStationVehicles']");
        if (storeNode) {
          infraHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("AMERICAN MIDWEST TRUCK SHOP", "fa-store")}
                <div>
                  <div class="item-title">Equipment Dealership & Repair Bay</div>
                  <div class="mono" style="margin-top:2px;">
                    <span class="badge-stat badge-owner">Vehicle Trader</span>
                    <span class="badge-stat badge-sown">Open 24/7</span>
                  </div>
                </div>
              </div>
            </div>`;
        }
      }

      if (infraHtml) publicContainer.innerHTML = infraHtml;
    }
  } catch (e) { console.error("Infrastructure Render Error:", e); }

  // 7. Dealership Used Vehicle Sale Radar
  try {
    const salesContainer = document.getElementById('sales-container');
    const salesXml = parseXML(data.sales || data.sales_xml);

    if (salesContainer && salesXml) {
      let salesHtml = "";
      salesXml.querySelectorAll("item").forEach(item => {
        const xmlFilename = item.getAttribute("xmlFilename") || "Equipment";
        const formattedName = formatName(xmlFilename);
        const price = Math.round(parseFloat(item.getAttribute("price") || "0"));
        const timeLeft = item.getAttribute("timeLeft") || "0";
        const damage = (parseFloat(item.getAttribute("damage") || "0") * 100).toFixed(0);

        salesHtml += `
          <div class="item-card">
            <div class="item-left">
              ${getThumbnailHTML(formattedName, "fa-tags")}
              <div>
                <div class="item-title">${formattedName} (Used Dealership)</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-active">${timeLeft}h Left</span>
                  <span class="badge-stat">Wear: ${damage}%</span>
                </div>
              </div>
            </div>
            <div class="farm-money" style="color:var(--accent-gold);">$${price.toLocaleString()}</div>
          </div>`;
      });

      if (salesHtml) salesContainer.innerHTML = salesHtml;
    }
  } catch (e) { console.error("Sales Render Error:", e); }

  // 8. Dynamic Contracts & Field Missions
  try {
    const missionsXml = parseXML(data.missions || data.missions_xml);
    const contractsContainer = document.getElementById('contracts-container');
    
    if (missionsXml && contractsContainer) {
      const allMissions = [];

      missionsXml.querySelectorAll("*").forEach(m => {
        const tagName = m.tagName;
        if (tagName.toLowerCase().endsWith("mission") && tagName !== "missions") {
          
          const fieldNode = m.querySelector("field");
          const fieldId = fieldNode ? fieldNode.getAttribute("id") : (m.getAttribute("spotIndex") ? `Spot #${m.getAttribute("spotIndex")}` : "N/A");
          
          const infoNode = m.querySelector("info");
          let reward = infoNode ? parseFloat(infoNode.getAttribute("reward") || "0") : 0;
          if (reward === 0) reward = Math.round(parseFloat(m.getAttribute("reward") || "2500"));

          let rawCrop = m.getAttribute("fruitType");
          if (!rawCrop) {
            const harvestSubNode = m.querySelector("harvest");
            if (harvestSubNode) rawCrop = harvestSubNode.getAttribute("fruitType");
          }
          const cropTitle = resolveCropName(rawCrop);

          const cleanType = tagName.replace(/mission$/i, "").replace(/Mission$/i, "");
          const missionType = cleanType.length > 0 ? formatName(cleanType) : "General Contract";

          const statusAttr = m.getAttribute("status") || "CREATED";
          const isAccepted = statusAttr === "RUNNING" || statusAttr === "1" || m.getAttribute("farmId") !== null;
          const farmId = m.getAttribute("farmId") || "1";
          const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

          let completionVal = infoNode ? parseFloat(infoNode.getAttribute("completion") || "0") : 0;
          let progressPct = Math.round(completionVal * 100);

          let workerText = isAccepted ? `Contractor: ${ownerFarm}` : "Available Contract";

          allMissions.push({
            missionType,
            cropTitle,
            fieldId,
            reward,
            isAccepted,
            progressPct,
            workerText,
            rawCrop
          });
        }
      });

      allMissions.sort((a, b) => (b.isAccepted ? 1 : 0) - (a.isAccepted ? 1 : 0));

      let html = "";
      allMissions.forEach(m => {
        let thumbnail = getThumbnailHTML(m.missionType, "fa-file-contract");
        if (m.rawCrop) thumbnail = getThumbnailHTML(m.rawCrop, "fa-file-contract");

        const statusBadge = m.isAccepted 
          ? `<span class="badge-stat badge-active">ACTIVE (${m.progressPct}%)</span>` 
          : `<span class="badge-stat">AVAILABLE</span>`;

        const progressBarHtml = m.isAccepted ? `
          <div class="progress-container" style="margin-top:8px;">
            <div class="progress-bar" style="width: ${m.progressPct}%;"></div>
          </div>` : '';

        html += `
          <div class="item-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">${m.missionType} ${m.cropTitle !== "Fallow / Empty" ? `(${m.cropTitle})` : ''}</div>
                  <div class="mono" style="margin-top:2px;">
                    ${statusBadge}
                    <span class="badge-stat">Target: Field #${m.fieldId}</span>
                  </div>
                </div>
              </div>
              <div class="farm-money" style="font-size:0.95rem;">$${m.reward.toLocaleString()}</div>
            </div>
            <div class="mono" style="font-size:0.75rem; color:#94a3b8; margin-top:6px;">
              <i class="fa-solid fa-user-gear"></i> ${m.workerText}
            </div>
            ${progressBarHtml}
          </div>`;
      });

      if (html) contractsContainer.innerHTML = html;
    }
  } catch (e) { console.error("Contracts Render Error:", e); }

  // 9. Map Collectibles Discovery Radar
  try {
    const collectiblesContainer = document.getElementById('collectibles-container');
    const careerXml = parseXML(data.careerSavegame || data.careerSavegame_xml);
    const colXml = parseXML(data.collectibles || data.collectibles_xml);

    if (collectiblesContainer) {
      let foundCount = 0;
      let totalCollectibles = 25;

      if (colXml) {
        const items = colXml.querySelectorAll("collectible");
        if (items.length > 0) {
          totalCollectibles = items.length;
          items.forEach(c => {
            if (c.getAttribute("collected") === "true") foundCount++;
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

  // 10. Commodity Market Prices
  try {
    const ecoContainer = document.getElementById('economy-container');
    if (ecoContainer) {
      let html = "";
      for (const [cropKey, baseValPerKL] of Object.entries(BASE_PRICES_PER_KL)) {
        const realCropName = resolveCropName(cropKey);
        const thumbnail = getThumbnailHTML(cropKey, "fa-chart-line");
        const pricePer1kLbs = (baseValPerKL / LBS_CONVERSION_FACTOR).toFixed(2);

        html += `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div class="item-title">${realCropName}</div>
            </div>
            <div class="farm-money" style="font-size:0.95rem;">$${pricePer1kLbs} / 1,000 lbs</div>
          </div>`;
      }
      ecoContainer.innerHTML = html;
    }
  } catch (e) { console.error("Economy Render Error:", e); }
};
