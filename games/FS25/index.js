/*
 Version Timestamp: Thu, July 23, 2026, 7:35 PM (EDT)
 Production FS25 Modular Dashboard - JavaScript Telemetry Renderer
*/

const menuCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";

// Crop Icon / Emoji Table
const CROP_ICONS = {
  "WHEAT": "🌾", "BARLEY": "🌾", "CANOLA": "🌼", "OAT": "🌾",
  "MAIZE": "🌽", "SUNFLOWER": "🌻", "SOYBEAN": "🫘", "POTATO": "🥔",
  "SUGARBEET": "🍠", "BEETROOT": "🍠", "PARSNIP": "🥕", "SPINACH": "🥬",
  "CARROT": "🥕", "COTTON": "☁️", "SORGHUM": "🌾", "GREENBEAN": "🫛",
  "PEA": "🫛", "GRASS": "🌱", "MILK": "🥛", "EGG": "🥚",
  "HONEY": "🍯", "WOOL": "🧶", "WOODCHIPS": "🪵"
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

function getCropIcon(typeName) {
  if (!typeName) return "📦";
  const key = typeName.toUpperCase().replace('FILLTYPE_', '');
  return CROP_ICONS[key] || "🌾";
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

  // 1. Header Server Meta
  const statsXml = parseXML(data.stats || data.dedicatedServerConfig || data.gameserver);
  if (statsXml) {
    const gameName = statsXml.querySelector("game_name")?.textContent || statsXml.querySelector("Server")?.getAttribute("name");
    const mapName = statsXml.querySelector("Server")?.getAttribute("mapName");
    if (gameName) document.getElementById('server-name').textContent = gameName;
    if (mapName) document.getElementById('server-map').textContent = `Map: ${mapName}`;
  }

  const envXml = parseXML(data.environment || data.environment_xml);
  if (envXml) {
    const dayTimeNode = envXml.querySelector("dayTime");
    const currentMonthNode = envXml.querySelector("currentMonth");
    const weatherNode = envXml.querySelector("weather");

    if (dayTimeNode) {
      const rawTime = parseFloat(dayTimeNode.textContent || "0");
      const totalMinutes = Math.floor(rawTime > 86400 ? rawTime / 60000 : rawTime / 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const mins = totalMinutes % 60;
      document.getElementById('server-time').textContent = `Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    const months = ["Late Winter", "Early Spring", "Spring", "Late Spring", "Early Summer", "Summer", "Late Summer", "Early Autumn", "Autumn", "Late Autumn", "Early Winter", "Winter"];
    if (currentMonthNode) {
      const monthIdx = parseInt(currentMonthNode.textContent || "1");
      document.getElementById('server-month').textContent = `Month: ${months[monthIdx - 1] || 'Spring'}`;
    }

    if (weatherNode) {
      document.getElementById('server-weather').textContent = `Weather: ${(weatherNode.getAttribute("currentWeather") || "SUNNY").toUpperCase()}`;
    }
  }

  // 2. Installed Server Mods
  const modsContainer = document.getElementById('mods-container');
  let modsHtml = "";
  const modSource = parseXML(data.stats || data.careerSavegame || data.gameserver);
  if (modSource) {
    const modNodes = modSource.querySelectorAll("mod");
    modNodes.forEach(m => {
      const rawFilename = m.getAttribute("filename") || m.getAttribute("title") || m.getAttribute("modName");
      if (rawFilename) {
        const cleanTitle = formatName(rawFilename);
        modsHtml += `
          <div class="item-card">
            <div class="item-left">
              <div class="item-icon-box"><i class="fa-solid fa-puzzle-piece"></i></div>
              <div>
                <div class="item-title">${cleanTitle}</div>
                <span class="badge-stat">Active Mod</span>
              </div>
            </div>
          </div>`;
      }
    });
  }
  if (modsContainer) modsContainer.innerHTML = modsHtml || '<div class="empty-state">No installed mods detected.</div>';

  // 3. Active Contracts & Missions
  const missionsXml = parseXML(data.missions || data.missions_xml);
  const contractsContainer = document.getElementById('contracts-container');
  if (missionsXml && contractsContainer) {
    let html = "";
    missionsXml.querySelectorAll("*").forEach(m => {
      if (m.tagName.endsWith("Mission")) {
        const fieldNode = m.querySelector("field");
        const fieldId = fieldNode ? fieldNode.getAttribute("id") : "N/A";
        const infoNode = m.querySelector("info");
        const reward = infoNode ? parseFloat(infoNode.getAttribute("reward") || "0").toLocaleString() : "0";

        const missionType = formatName(m.tagName.replace("Mission", ""));
        const rawCrop = m.getAttribute("fruitType");
        const cropTitle = resolveCropName(rawCrop);
        const icon = getCropIcon(rawCrop);

        html += `
          <div class="item-card">
            <div class="item-left">
              <div class="item-icon-box">${icon}</div>
              <div>
                <div class="item-title">${missionType} ${cropTitle ? `(${cropTitle})` : ''}</div>
                <div class="mono" style="color:#64748b;">Target: Field #${fieldId}</div>
              </div>
            </div>
            <div class="farm-money" style="font-size:0.95rem;">$${reward}</div>
          </div>`;
      }
    });
    contractsContainer.innerHTML = html || '<div class="empty-state">No active contracts found.</div>';
  }

  // 4. Production Facilities & Storage
  const placeXml = parseXML(data.placeables || data.placeables_xml);
  const productionContainer = document.getElementById('production-container');
  if (placeXml && productionContainer) {
    let html = "";
    placeXml.querySelectorAll("placeable").forEach(p => {
      const filename = p.getAttribute("filename");
      if (filename && !filename.includes("fence") && !filename.includes("gate")) {
        const resolvedName = resolvePlaceableName(filename);
        const farmId = p.getAttribute("farmId") || "1";
        html += `
          <div class="item-card">
            <div class="item-left">
              <div class="item-icon-box"><i class="fa-solid fa-industry"></i></div>
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

  // 5. Fields & Agronomy Status
  const fieldsXml = parseXML(data.fields || data.fields_xml);
  const fieldsContainer = document.getElementById('fields-container');
  if (fieldsXml && fieldsContainer) {
    let html = "";
    fieldsXml.querySelectorAll("field").forEach(f => {
      const id = f.getAttribute("id");
      const rawCrop = f.getAttribute("fruitType");
      const crop = resolveCropName(rawCrop) || "Fallow / Empty";
      const icon = getCropIcon(rawCrop);
      const groundType = formatName(f.getAttribute("groundType") || "SOWN");
      const sprayLevel = f.getAttribute("sprayLevel") || "0";
      const limeLevel = f.getAttribute("limeLevel") || "0";

      const isHarvest = groundType.includes("HARVEST");
      const badgeClass = isHarvest ? "badge-harvest" : "badge-sown";

      html += `
        <div class="item-card">
          <div class="item-left">
            <div class="item-icon-box">${icon}</div>
            <div>
              <div class="item-title">Field #${id} - ${crop}</div>
              <div class="mono" style="margin-top:4px;">
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

  // 6. Registered Farms
  const farmsXml = parseXML(data.farms || data.farms_xml);
  const farmsContainer = document.getElementById('farms-container');
  if (farmsXml && farmsContainer) {
    let html = "";
    farmsXml.querySelectorAll("farm").forEach(farm => {
      if (farm.getAttribute("farmId") !== "0") {
        html += `
          <div class="item-card">
            <div class="item-left">
              <div class="item-icon-box"><i class="fa-solid fa-wheat-field"></i></div>
              <div>
                <div class="item-title">${farm.getAttribute("name")}</div>
                <div class="mono" style="color:#64748b;">Farm ID: ${farm.getAttribute("farmId")}</div>
              </div>
            </div>
            <div class="farm-money">$${parseFloat(farm.getAttribute("money")||"0").toLocaleString()}</div>
          </div>`;
      }
    });
    farmsContainer.innerHTML = html || '<div class="empty-state">No farm finances online.</div>';
  }

  // 7. Machinery & Tools
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
      const icon = isTractor ? '<i class="fa-solid fa-tractor"></i>' : '<i class="fa-solid fa-screwdriver-wrench"></i>';

      const card = `
        <div class="item-card">
          <div class="item-left">
            <div class="item-icon-box">${icon}</div>
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

  // 8. Filtered Commodity Economy
  const ecoXml = parseXML(data.economy || data.economy_xml);
  const ecoContainer = document.getElementById('economy-container');
  if (ecoXml && ecoContainer) {
    let html = "";
    ecoXml.querySelectorAll("fillType").forEach(f => {
      const rawName = f.getAttribute("name");
      const realCropName = resolveCropName(rawName);
      const icon = getCropIcon(rawName);
      const price = (parseFloat(f.getAttribute("price") || "0") * 1000).toFixed(2);

      if (realCropName && parseFloat(price) > 0) {
        html += `
          <div class="item-card">
            <div class="item-left">
              <div class="item-icon-box">${icon}</div>
              <div class="item-title">${realCropName}</div>
            </div>
            <div class="farm-money" style="font-size:0.95rem;">$${price} / kL</div>
          </div>`;
      }
    });
    ecoContainer.innerHTML = html || '<div class="empty-state">Market economy data initializing...</div>';
  }
}

// Load Navigation Bar
loadGoogleSheetsMenu();
