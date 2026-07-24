/*
 Version Timestamp: Thu, July 23, 2026, 9:00 PM (EDT)
 Resilient FS25 Modular Dashboard - Fail-Safe JavaScript Renderer
 File: games/FS25/index.js
*/

const menuCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";

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
  "HARVEST": "images/HARVEST.JPG",
  "HERBICIDE": "images/HERBICIDE.JPG",
  "DESTRUCTIBLE ROCK": "images/Destructible Rock.JPG",
  "TEDDER": "images/Teddar.JPG",
  "BIG BUD KTTA 700": "images/Big Bud KTTA 700.JPG",
  "FORESTRY LOCOMOTIVE": "images/FORESTRY LOCOMOTIVE.JPG",
  "GRAIN BARGE": "images/GRAIN BARGE.JPG",
  "JOHN DEERE 8R SERIES": "images/John Deere 8R Series.JPG",
  "LOG TRAILER": "images/Log Trailer.JPG",
  "WAGON FLAT BED": "images/WAGON FLAT BED.JPG",
  "WAGON GRAIN": "images/WAGON GRAIN.JPG",
  "WAGON SUGARBEETS": "images/WAGON SUGARBEETS.JPG",
  "WAGON WOOD CHIPS": "images/WAGON WOOD CHIPS.JPG",
  "ELEVATOR SILO": "images/Elevator Silo.JPG",
  "GRAIN ELEVATOR": "images/GRAIN ELEVATOR.jpg",
  "RESTAURANT": "images/Restaurant.JPG",
  "TRAIN STATION": "images/Train Station.JPG"
};

const CROP_NAME_MAP = {
  "WHEAT": "Wheat", "BARLEY": "Barley", "CANOLA": "Canola",
  "OAT": "Oats", "MAIZE": "Corn / Maize", "SUNFLOWER": "Sunflowers",
  "SOYBEAN": "Soybeans", "POTATO": "Potatoes", "SUGARBEET": "Sugarbeets",
  "BEETROOT": "Beetroot", "PARSNIP": "Parsnip", "SPINACH": "Spinach",
  "CARROT": "Carrots", "COTTON": "Cotton", "SORGHUM": "Sorghum",
  "GREENBEAN": "Green Beans", "PEA": "Peas", "GRASS": "Grass",
  "MILK": "Milk", "EGG": "Eggs", "HONEY": "Honey", "WOOL": "Wool",
  "WOODCHIPS": "Wood Chips"
};

const MONTH_NAMES = [
  "Early Spring (March)", "Mid Spring (April)", "Late Spring (May)",
  "Early Summer (June)", "Mid Summer (July)", "Late Summer (August)",
  "Early Autumn (September)", "Mid Autumn (October)", "Late Autumn (November)",
  "Early Winter (December)", "Mid Winter (January)", "Late Winter (February)"
];

async function loadGoogleSheetsMenu() {
  try {
    const response = await fetch(`${menuCsvUrl}&v=${Date.now()}`);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    const menuContainer = document.getElementById('dynamic-menu');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';

    const groups = {};

    rows.forEach((row, index) => {
      if (index === 0) return;
      const [name, group, url, image] = row.map(cell => cell ? cell.trim() : '');
      if (!name || !url) return;

      const groupKey = group || 'General';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push({ name, url, image });
    });

    Object.keys(groups).forEach(groupName => {
      const items = groups[groupName];

      if (items.length === 1 && items[0].name.toLowerCase() === groupName.toLowerCase()) {
        const item = items[0];
        const btn = document.createElement('a');
        btn.className = 'nav-btn';
        btn.href = item.url;
        btn.innerHTML = `${item.image ? `<img src="${item.image}" alt="">` : ''} ${item.name}`;
        menuContainer.appendChild(btn);
      } else {
        const navGroup = document.createElement('div');
        navGroup.className = 'nav-item';

        let dropdownHtml = `
          <button class="nav-btn">
            ${groupName} <i class="fa-solid fa-caret-down"></i>
          </button>
          <div class="dropdown-content">`;

        items.forEach(sub => {
          dropdownHtml += `<a href="${sub.url}">${sub.image ? `<img src="${sub.image}" alt="">` : ''} ${sub.name}</a>`;
        });

        dropdownHtml += `</div>`;
        navGroup.innerHTML = dropdownHtml;
        menuContainer.appendChild(navGroup);
      }
    });
  } catch (err) {
    console.error("Failed to load navigation menu:", err);
  }
}

function parseCSV(text) {
  return text.split('\n').map(line => line.split(','));
}

function resolveCropName(typeName) {
  if (!typeName) return null;
  const key = typeName.toUpperCase().replace('FILLTYPE_', '');
  return CROP_NAME_MAP[key] || null;
}

function getThumbnailHTML(key, fallbackIcon) {
  if (!fallbackIcon) fallbackIcon = "fa-box";
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  
  try {
    const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').trim();

    if (IMAGE_ASSETS[lookupKey]) {
      return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}"></div>`;
    }

    for (const [assetName, path] of Object.entries(IMAGE_ASSETS)) {
      if (lookupKey.includes(assetName) || assetName.includes(lookupKey)) {
        return `<div class="item-icon-box"><img src="${path}" alt="${assetName}"></div>`;
      }
    }
  } catch (e) {
    console.warn("Thumbnail match error:", e);
  }

  return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
}

function resolvePlaceableName(filename) {
  if (!filename) return "Storage Facility";
  const name = filename.toLowerCase();
  if (name.includes("silo")) return "Grain Elevator Silo";
  if (name.includes("cow")) return "Dairy Cow Barn";
  if (name.includes("pig")) return "Pig Husbandry";
  if (name.includes("chicken")) return "Chicken Coop";
  if (name.includes("dairy")) return "Milk Processing Dairy";
  if (name.includes("bakery")) return "Commercial Bakery";
  if (name.includes("sawmill")) return "Lumber Sawmill";
  if (name.includes("carpenter")) return "Woodworking Carpenter";
  if (name.includes("bga") || name.includes("biogas")) return "Biogas Plant (BGA)";
  if (name.includes("solar")) return "Solar Array";
  if (name.includes("wind")) return "Wind Turbine";
  return formatName(filename);
}

function formatName(str) {
  if (!str) return 'Unknown Item';
  let clean = str.split('/').pop().replace('.xml', '').replace('data_', '').replace('FS25_', '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
}

function parseXML(xmlData) {
  if (!xmlData) return null;
  const rawText = typeof xmlData === 'object' ? xmlData.data || xmlData.content : xmlData;
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawText, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function renderDashboard(data) {
  if (!data) return;

  // 1. Time, Month & Weather Sync
  try {
    const envXml = parseXML(data.environment || data.environment_xml);
    const careerXml = parseXML(data.careerSavegame || data.careerSavegame_xml);
    
    let isNight = false;
    let weatherState = "SUNNY";
    let monthText = null;

    if (envXml) {
      const monthNode = envXml.querySelector("currentMonth") || envXml.querySelector("month") || envXml.querySelector("period");
      if (monthNode && monthNode.textContent) {
        const monthIdx = parseInt(monthNode.textContent.trim());
        if (!isNaN(monthIdx) && monthIdx >= 1 && monthIdx <= 12) {
          monthText = MONTH_NAMES[monthIdx - 1];
        }
      }

      if (!monthText) {
        const dayNode = envXml.querySelector("currentDay") || envXml.querySelector("day");
        if (dayNode && dayNode.textContent) {
          const dayVal = parseInt(dayNode.textContent.trim());
          if (!isNaN(dayVal)) {
            const calculatedMonthIdx = ((Math.floor((dayVal - 1) / 3)) % 12);
            monthText = MONTH_NAMES[calculatedMonthIdx];
          }
        }
      }

      const dayTimeNode = envXml.querySelector("dayTime");
      if (dayTimeNode) {
        const rawTime = parseFloat(dayTimeNode.textContent || "0");
        const totalMinutes = Math.floor(rawTime > 86400 ? rawTime / 60000 : rawTime / 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const mins = totalMinutes % 60;
        const timeEl = document.getElementById('server-time');
        if (timeEl) timeEl.textContent = `Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

        if (hours >= 20 || hours < 6) isNight = true;
      }

      const weatherNode = envXml.querySelector("weather");
      if (weatherNode) {
        weatherState = (weatherNode.getAttribute("currentWeather") || "SUNNY").toUpperCase();
      }
    }

    if (!monthText && careerXml) {
      const careerMonthNode = careerXml.querySelector("currentMonth") || careerXml.querySelector("month");
      if (careerMonthNode && careerMonthNode.textContent) {
        const mIdx = parseInt(careerMonthNode.textContent.trim());
        if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
          monthText = MONTH_NAMES[mIdx - 1];
        }
      }
    }

    const monthEl = document.getElementById('server-month');
    if (monthEl) monthEl.textContent = `Month: ${monthText || 'Mid Spring (April)'}`;

    const bodyEl = document.body;
    const weatherEl = document.getElementById('server-weather');
    const weatherIcon = document.getElementById('weather-icon');

    if (isNight) {
      bodyEl.classList.add("theme-night");
      if (weatherEl) weatherEl.textContent = `Weather: CLEAR (NIGHT)`;
      if (weatherIcon) weatherIcon.className = "fa-solid fa-moon";
    } else {
      bodyEl.classList.remove("theme-night");
      if (weatherEl) weatherEl.textContent = `Weather: ${weatherState}`;
      if (weatherIcon) weatherIcon.className = "fa-solid fa-sun";
    }

    if (weatherState.includes("RAIN")) bodyEl.classList.add("weather-rain");
    else if (weatherState.includes("CLOUD")) bodyEl.classList.add("weather-cloudy");
  } catch (e) { console.error("Environment Render Error:", e); }

  // 2. Server Name & Map
  try {
    const statsXml = parseXML(data.gameStats || data.gameStats_xml || data.stats || data.dedicatedServerConfig || data.gameserver);
    if (statsXml) {
      const gameName = statsXml.querySelector("game_name")?.textContent || statsXml.querySelector("Server")?.getAttribute("name");
      const mapName = statsXml.querySelector("Server")?.getAttribute("mapName");
      if (gameName) document.getElementById('server-name').textContent = gameName;
      if (mapName) document.getElementById('server-map').textContent = `Map: ${mapName}`;
    }
  } catch (e) { console.error("Stats Render Error:", e); }

  // 3. Registered Farms & Land Ownership
  const farmlandOwnership = {};
  try {
    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      let farmsHtml = "";
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        const farmName = farm.getAttribute("name");
        if (farmId !== "0") {
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

          farm.querySelectorAll("farmland").forEach(fl => {
            farmlandOwnership[fl.getAttribute("id")] = farmName;
          });
        }
      });
      const farmsCont = document.getElementById('farms-container');
      if (farmsCont) farmsCont.innerHTML = farmsHtml || '<div class="empty-state">No farm finances online.</div>';
    }
  } catch (e) { console.error("Farms Render Error:", e); }

  // 4. Fields & Agronomy
  try {
    const fieldsXml = parseXML(data.fields || data.fields_xml);
    const fieldsContainer = document.getElementById('fields-container');
    if (fieldsXml && fieldsContainer) {
      let html = "";
      fieldsXml.querySelectorAll("field").forEach(f => {
        const id = f.getAttribute("id");
        const rawCrop = f.getAttribute("fruitType");
        const crop = resolveCropName(rawCrop) || "Fallow / Empty";
        const thumbnail = getThumbnailHTML(rawCrop, "fa-seedling");
        const groundType = formatName(f.getAttribute("groundType") || "SOWN");
        const sprayLevel = f.getAttribute("sprayLevel") || "0";
        const limeLevel = f.getAttribute("limeLevel") || "0";

        const ownerFarm = farmlandOwnership[id];
        const isHarvest = groundType.includes("HARVEST");
        const badgeClass = isHarvest ? "badge-harvest" : "badge-sown";

        html += `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div>
                <div class="item-title">Field #${id} - ${crop}</div>
                <div class="mono" style="margin-top:2px;">
                  ${ownerFarm ? `<span class="badge-stat badge-owner">Owner: ${ownerFarm}</span>` : ''}
                  <span class="badge-stat ${badgeClass}">${groundType}</span>
                  <span class="badge-stat">Fertilizer: ${sprayLevel * 50}%</span>
                  <span class="badge-stat">Lime: ${limeLevel > 0 ? 'Applied' : 'Needs Lime'}</span>
                </div>
              </div>
            </div>
          </div>`;
      });
      fieldsContainer.innerHTML = html || '<div class="empty-state">No field telemetry registered.</div>';
    }
  } catch (e) { console.error("Fields Render Error:", e); }

  // 5. Active Contracts
  try {
    const missionsXml = parseXML(data.missions || data.missions_xml);
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
          
          let thumbnail = getThumbnailHTML(missionType, "fa-file-contract");
          if (rawCrop) thumbnail = getThumbnailHTML(rawCrop, "fa-file-contract");

          html += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">${missionType} ${cropTitle ? `(${cropTitle})` : ''}</div>
                  <div class="mono" style="color:#64748b;">Target: Field #${fieldId}</div>
                </div>
              </div>
              <div class="farm-money" style="font-size:0.95rem;">$${reward.toLocaleString()}</div>
            </div>`;
        }
      });
      contractsContainer.innerHTML = html || '<div class="empty-state">No active contracts found.</div>';
    }
  } catch (e) { console.error("Contracts Render Error:", e); }

  // 6. Installed Mods
  try {
    const modsContainer = document.getElementById('mods-container');
    let modsHtml = "";
    const modSource = parseXML(data.gameStats || data.gameStats_xml || data.stats || data.careerSavegame || data.gameserver || data.dedicatedServerConfig);
    
    if (modSource && modsContainer) {
      modSource.querySelectorAll("mod").forEach(m => {
        const rawFilename = m.getAttribute("filename") || m.getAttribute("title") || m.getAttribute("modName");
        if (rawFilename) {
          const cleanTitle = formatName(rawFilename);
          const thumbnail = getThumbnailHTML(cleanTitle, "fa-puzzle-piece");

          modsHtml += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">${cleanTitle}</div>
                  <span class="badge-stat">Active Mod</span>
                </div>
              </div>
            </div>`;
        }
      });
      modsContainer.innerHTML = modsHtml || '<div class="empty-state">No installed mods detected.</div>';
    }
  } catch (e) { console.error("Mods Render Error:", e); }

  // 7. Production Facilities
  try {
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    const productionContainer = document.getElementById('production-container');
    if (placeXml && productionContainer) {
      let html = "";
      placeXml.querySelectorAll("placeable").forEach(p => {
        const filename = p.getAttribute("filename");
        if (filename && !filename.includes("fence") && !filename.includes("gate")) {
          const resolvedName = resolvePlaceableName(filename);
          const farmId = p.getAttribute("farmId") || "1";
          const thumbnail = getThumbnailHTML(resolvedName, "fa-industry");

          html += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">${resolvedName}</div>
                  <div class="mono" style="color:#64748b; font-size:0.75rem;">Owner: Farm ID ${farmId}</div>
                </div>
              </div>
              <span class="badge-stat badge-sown">Operational</span>
            </div>`;
        }
      });
      productionContainer.innerHTML = html || '<div class="empty-state">No active facilities.</div>';
    }
  } catch (e) { console.error("Production Render Error:", e); }

  // 8. Fleet Vehicles
  try {
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    if (vehXml) {
      let tractorsHtml = "";
      let implementsHtml = "";

      vehXml.querySelectorAll("vehicle").forEach(veh => {
        const rawName = veh.getAttribute("filename") || "Vehicle";
        const formatted = formatName(rawName);
        const wearNode = veh.querySelector("wearable");
        const damage = wearNode ? Math.round((1 - parseFloat(wearNode.getAttribute("damage") || "0")) * 100) : 100;
        const plateNode = veh.querySelector("licensePlate");
        const plate = plateNode ? plateNode.textContent : null;

        const isTractor = rawName.toLowerCase().match(/(tractor|harvester|bigbud|truck|locomotive)/);
        const fallbackIcon = isTractor ? "fa-tractor" : "fa-screwdriver-wrench";
        const thumbnail = getThumbnailHTML(formatted, fallbackIcon);

        const card = `
          <div class="item-card">
            <div class="item-left">
              ${thumbnail}
              <div>
                <div class="item-title">${formatted}</div>
                <div class="mono">
                  <span class="badge-stat"><i class="fa-solid fa-wrench"></i> ${damage}% Condition</span>
                  ${plate ? `<span class="badge-stat" style="background:#fff; color:#000; font-weight:800;">${plate}</span>` : ''}
                </div>
              </div>
            </div>
          </div>`;

        if (isTractor) tractorsHtml += card;
        else implementsHtml += card;
      });

      const tracCont = document.getElementById('tractors-container');
      const implCont = document.getElementById('implements-container');
      if (tracCont) tracCont.innerHTML = tractorsHtml || '<div class="empty-state">No machinery online.</div>';
      if (implCont) implCont.innerHTML = implementsHtml || '<div class="empty-state">No implements online.</div>';
    }
  } catch (e) { console.error("Vehicles Render Error:", e); }

  // 9. Commodity Economy
  try {
    const ecoXml = parseXML(data.economy || data.economy_xml);
    const ecoContainer = document.getElementById('economy-container');
    if (ecoXml && ecoContainer) {
      let html = "";
      ecoXml.querySelectorAll("fillType").forEach(f => {
        const rawName = f.getAttribute("name");
        const realCropName = resolveCropName(rawName);
        const thumbnail = getThumbnailHTML(rawName, "fa-chart-line");
        const price = (parseFloat(f.getAttribute("price") || "0") * 1000).toFixed(2);

        if (realCropName && parseFloat(price) > 0) {
          html += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div class="item-title">${realCropName}</div>
              </div>
              <div class="farm-money" style="font-size:0.95rem;">$${price} / kL</div>
            </div>`;
        }
      });
      ecoContainer.innerHTML = html || '<div class="empty-state">Market economy data initializing...</div>';
    }
  } catch (e) { console.error("Economy Render Error:", e); }
}

// Load Navigation Menu
loadGoogleSheetsMenu();
