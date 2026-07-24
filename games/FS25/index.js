/*
 Version Timestamp: Fri, July 24, 2026, 02:22 AM (EDT)
 Universal Cross-Browser Tactical Engine - Server Online/Offline Indicator Integrated
 File: games/FS25/index.js
*/

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
  "PUBLIC REGIONAL RAILROAD": "images/Train Station.JPG",
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

window.setServerStatus = function(isOnline) {
  const pill = document.getElementById('server-status-pill');
  const text = document.getElementById('status-text');
  if (!pill || !text) return;

  if (isOnline) {
    pill.className = "status-pill status-online";
    text.textContent = "ONLINE";
  } else {
    pill.className = "status-pill status-offline";
    text.textContent = "OFFLINE";
  }
};

function resolveEquipmentDetails(rawModelName) {
  if (!rawModelName) return { name: "Unknown Equipment", category: "General Tool" };
  const str = String(rawModelName).toUpperCase().trim();

  if (str.includes("TERRIA")) return { name: "Pöttinger TERRIA 6040", category: "Cultivator" };
  if (str.includes("REXIUS")) return { name: "Väderstad REXIUS 1230", category: "Roller / Soil Compactor" };
  if (str.includes("HTW65")) return { name: "Bergmann HTW 65", category: "Forage Trailer" };
  if (str.includes("SMARAGD")) return { name: "Lemken SMARAGD 9/500 K", category: "Stubbed Cultivator" };
  if (str.includes("TA12050")) return { name: "Krampe TA 12050", category: "Tipper Trailer" };
  if (str.includes("BIGBUD")) return { name: "Big Bud KTTA 700", category: "Heavy Tractor" };
  if (str.includes("8R")) return { name: "John Deere 8R Series", category: "Medium/Heavy Tractor" };

  return { name: formatName(rawModelName), category: "Equipment / Tool" };
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
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; font-family:monospace; margin-bottom:3px;">
        <span>${labelText}</span>
        <span style="color:${barColor}; font-weight:bold;">${pct}%</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${pct}%; background-color: ${barColor};"></div>
      </div>
    </div>`;
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

  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.nav-item');
      if (parent) parent.classList.toggle('open');
    });
  });

  const cachedData = localStorage.getItem("fs25_last_known_telemetry");
  if (cachedData) {
    try {
      window.renderDashboard(JSON.parse(cachedData));
    } catch (e) {
      console.warn("Cache restore skipped:", e);
    }
  }
});

function resolveCropName(typeName) {
  if (!typeName || typeName.toUpperCase() === "UNKNOWN") return "Prepared Ground";
  const key = String(typeName).toUpperCase().replace('FILLTYPE_', '').trim();
  return CROP_NAME_MAP[key] || formatName(key);
}

function getThumbnailHTML(key, fallbackIcon) {
  if (!fallbackIcon) fallbackIcon = "fa-box";
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  
  try {
    const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();

    if (lookupKey.includes("TRAIN") || lookupKey.includes("LOCOMOTIVE")) {
      return `<div class="item-icon-box"><img src="${IMAGE_ASSETS['TRAIN STATION']}" alt="Train Station" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid ${fallbackIcon}\\'></i>';"></div>`;
    }

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
  let rawText = "";

  if (typeof node === 'string') {
    rawText = node;
  } else if (typeof node === 'object') {
    rawText = node.data || node.content || node.xml || (Object.keys(node).length === 1 ? Object.values(node)[0] : "");
  }

  if (!rawText || typeof rawText !== 'string') return null;

  try {
    const sanitizedXml = rawText.trim().replace(/^[\uFEFF\xA0]+/, '');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sanitizedXml, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      return null;
    }
    return xmlDoc;
  } catch (e) { 
    return null; 
  }
}

window.renderDashboard = function(data) {
  if (!data) {
    window.setServerStatus(false);
    return;
  }

  // Active Telemetry Signal Received -> Set Banner to ONLINE
  window.setServerStatus(true);

  try {
    localStorage.setItem("fs25_last_known_telemetry", JSON.stringify(data));
  } catch (e) {}

  const syncTimeEl = document.getElementById('last-sync-time');
  if (syncTimeEl) {
    const now = new Date();
    syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last Telemetry Sync: <strong style="color:#22c55e;">${now.toLocaleTimeString()}</strong>`;
  }

  // 1. In-Game Time & Month Banner
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
      statsXml.querySelectorAll("Player[isUsed='true']").forEach(p => onlinePlayers.push(p.textContent));

      const playerBadge = document.getElementById('server-players');
      if (playerBadge) {
        playerBadge.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${numUsed}/${capacity} ${onlinePlayers.length ? `(${onlinePlayers.join(', ')})` : ''}`;
      }
    }

    if (envXml) {
      const monthNode = envXml.querySelector("currentMonth") || envXml.querySelector("month");
      if (monthNode && monthNode.textContent) {
        const mIdx = parseInt(monthNode.textContent.trim());
        if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) monthText = MONTH_NAMES[mIdx - 1];
      }
    }

    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const monthEl = document.getElementById('server-month');
    if (monthEl) monthEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Month: ${monthText}`;
  } catch (e) { console.error("Banner Render Error:", e); }

  // 2. Farmlands Lookup Map
  const landOwnerByFarmlandId = {};
  try {
    const farmlandXml = parseXML(data.farmlands || data.farmlands_xml);
    if (farmlandXml) {
      farmlandXml.querySelectorAll("farmland").forEach(fl => {
        landOwnerByFarmlandId[fl.getAttribute("id")] = fl.getAttribute("farmId") || "0";
      });
    }
  } catch (e) { console.error("Farmlands Cross-Ref Error:", e); }

  // 3. Registered Server Farms Container
  const farmNamesById = { "0": "Public / Server Land" };
  try {
    const farmsXml = parseXML(data.farms || data.farms_xml);
    const farmsCont = document.getElementById('farms-container');

    if (farmsCont) {
      let farmsHtml = "";
      if (farmsXml) {
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
            if (managerNode) managerName = managerNode.getAttribute("lastNickname") || "Active Manager";

            farmsHtml += `
              <div class="item-card">
                <div class="item-left">
                  ${getThumbnailHTML("ELEVATOR SILO", "fa-wheat-field")}
                  <div>
                    <div class="item-title">${rawName}</div>
                    <div class="mono" style="color:#94a3b8; font-size:0.8rem;">
                      Manager: <span style="color:#ffffff;">${managerName}</span> (ID: ${farmId})
                    </div>
                  </div>
                </div>
                <div class="farm-money">$${roundedMoney.toLocaleString()}</div>
              </div>`;
          }
        });
      }
      
      if (!farmsHtml) {
        farmsHtml = `
          <div class="item-card">
            <div class="item-left">
              ${getThumbnailHTML("ELEVATOR SILO", "fa-wheat-field")}
              <div>
                <div class="item-title">My Farm (Farm #1)</div>
                <div class="mono" style="color:#94a3b8; font-size:0.8rem;">
                  Manager: <span style="color:#ffffff;">Active Manager</span> (ID: 1)
                </div>
              </div>
            </div>
            <div class="farm-money">$100,000</div>
          </div>`;
      }
      farmsCont.innerHTML = farmsHtml;
    }
  } catch (e) { console.error("Farms Render Error:", e); }

  // 4. Fleet Machinery & Vehicles & Implements Container
  try {
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    const statsXml = parseXML(data.stats);
    let tractorsHtml = "";
    let implementsHtml = "";

    const processCard = (vNode, name, category, controller) => {
      const details = resolveEquipmentDetails(name);
      const isTractor = category.toLowerCase().includes("tractor") || 
                        name.toLowerCase().includes("bigbud") || 
                        category.toLowerCase().includes("harvester") ||
                        name.toLowerCase().includes("series8") ||
                        name.toLowerCase().includes("truck");

      const fallbackIcon = isTractor ? "fa-tractor" : "fa-screwdriver-wrench";
      const thumbnail = getThumbnailHTML(details.name, fallbackIcon);

      const farmId = vNode ? (vNode.getAttribute("farmId") || "1") : "1";
      const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

      let fuelGaugeHtml = "";
      if (vNode) {
        const dieselUnit = vNode.querySelector("fillUnit unit[fillType='DIESEL']");
        if (dieselUnit) {
          const fillLevel = parseFloat(dieselUnit.getAttribute("fillLevel") || "0");
          const pct = Math.min(100, Math.round((fillLevel / 2000) * 100));
          fuelGaugeHtml = renderGaugeBar(pct, `Fuel Level (${Math.round(fillLevel)}L)`);
        }
      }

      let aiStatus = "";
      if (vNode) {
        const aiNode = vNode.querySelector("aiFieldWorker[isActive='true']");
        if (aiNode) aiStatus = `<span class="badge-stat badge-active"><i class="fa-solid fa-robot"></i> AI WORKER ACTIVE</span>`;
      }

      return `
        <div class="item-card" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="item-left">
              ${thumbnail}
              <div>
                <div class="item-title">${details.name}</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">${ownerFarm}</span>
                  <span class="badge-stat">${details.category !== "Equipment / Tool" ? details.category : formatName(category)}</span>
                  ${aiStatus}
                  ${controller ? `<span class="badge-stat badge-sown"><i class="fa-solid fa-user"></i> ${controller}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          ${fuelGaugeHtml}
        </div>`;
    };

    if (vehXml) {
      vehXml.querySelectorAll("vehicle").forEach(v => {
        const name = v.getAttribute("filename") || "Vehicle";
        const category = v.getAttribute("category") || "IMPLEM";

        if (name.toLowerCase().includes("train") || name.toLowerCase().includes("locomotive") || name.toLowerCase().includes("barge")) return;

        if (name.toLowerCase().match(/(tractor|harvester|bigbud|truck|series8)/)) {
          tractorsHtml += processCard(v, name, category, null);
        } else {
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

    if (tracCont) tracCont.innerHTML = tractorsHtml || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No heavy machinery registered.</div>`;
    if (implCont) implCont.innerHTML = implementsHtml || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No implements or equipment owned.</div>`;
  } catch (e) { console.error("Vehicles Render Error:", e); }

  // 5. Server Contracts & Missions Container
  try {
    const missionsXml = parseXML(data.missions || data.missions_xml);
    const contractsContainer = document.getElementById('contracts-container');
    
    if (contractsContainer) {
      let html = "";
      if (missionsXml) {
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

        allMissions.forEach(m => {
          let thumbnail = getThumbnailHTML(m.missionType, "fa-file-contract");
          if (m.rawCrop && m.rawCrop.toUpperCase() !== 'UNKNOWN') thumbnail = getThumbnailHTML(m.rawCrop, "fa-file-contract");

          const statusBadge = m.isAccepted 
            ? `<span class="badge-stat badge-active">ACTIVE</span>` 
            : `<span class="badge-stat">AVAILABLE</span>`;

          const progressBarHtml = m.isAccepted ? renderGaugeBar(m.progressPct, "Contract Progress") : '';

          html += `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${thumbnail}
                  <div>
                    <div class="item-title">${m.missionType} ${m.cropTitle !== "Prepared Ground" ? `(${m.cropTitle})` : ''}</div>
                    <div class="mono" style="margin-top:2px;">
                      ${statusBadge}
                      <span class="badge-stat">Target: Field #${m.fieldId}</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money" style="font-size:0.95rem;">$${m.reward.toLocaleString()}</div>
              </div>
              <div class="mono" style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">
                <i class="fa-solid fa-user-gear"></i> ${m.workerText}
              </div>
              ${progressBarHtml}
            </div>`;
        });
      }

      contractsContainer.innerHTML = html || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No active server contracts.</div>`;
    }
  } catch (e) { console.error("Contracts Render Error:", e); }

  // 6. Field Crops & Agronomy Container
  try {
    const fieldsXml = parseXML(data.fields || data.fields_xml);
    const precisionXml = parseXML(data.precisionFarming || data.precisionFarming_xml);
    const fieldsContainer = document.getElementById('fields-container');

    if (fieldsContainer) {
      let html = "";
      if (fieldsXml) {
        fieldsXml.querySelectorAll("field").forEach(f => {
          const id = f.getAttribute("id");
          const farmId = landOwnerByFarmlandId[id] || f.getAttribute("farmId") || "0";
          const ownerFarm = farmNamesById[farmId] || `Farm ID ${farmId}`;

          const rawCrop = f.getAttribute("fruitType");
          const crop = resolveCropName(rawCrop);
          const thumbnail = getThumbnailHTML(rawCrop && rawCrop.toUpperCase() !== 'UNKNOWN' ? rawCrop : "field", "fa-seedling");
          const groundType = formatName(f.getAttribute("groundType") || "SOWN");
          const sprayLevel = parseInt(f.getAttribute("sprayLevel") || "0", 10);

          let fertilizerBadge = `<span class="badge-stat badge-danger">Fertilizer: 0%</span>`;
          if (sprayLevel >= 2) {
            fertilizerBadge = `<span class="badge-stat badge-good"><i class="fa-solid fa-circle-check"></i> Fertilized: 100% (Level 2)</span>`;
          } else if (sprayLevel === 1) {
            fertilizerBadge = `<span class="badge-stat badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Fertilized: 50% (Level 1)</span>`;
          }

          let pfWidth = "";
          if (precisionXml) {
            const pfNode = precisionXml.querySelector(`tramlineMap farmland[farmlandId='${id}']`);
            if (pfNode) {
              pfWidth = `<span class="badge-stat" style="color:var(--accent-gold);">${parseFloat(pfNode.getAttribute("width") || "27").toFixed(0)}m Tramlines</span>`;
            }
          }

          html += `
            <div class="item-card">
              <div class="item-left">
                ${thumbnail}
                <div>
                  <div class="item-title">Field #${id} - ${crop}</div>
                  <div class="mono" style="margin-top:4px;">
                    <span class="badge-stat badge-owner">${ownerFarm}</span>
                    <span class="badge-stat badge-sown">${groundType}</span>
                    ${fertilizerBadge}
                    ${pfWidth}
                  </div>
                </div>
              </div>
            </div>`;
        });
      }
      fieldsContainer.innerHTML = html || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No field data available.</div>`;
    }
  } catch (e) { console.error("Fields Render Error:", e); }

  // 7. Commodity Market Prices Container
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
            <div class="farm-money">$${pricePer1kLbs} / 1,000 lbs</div>
          </div>`;
      }
      ecoContainer.innerHTML = html;
    }
  } catch (e) { console.error("Economy Render Error:", e); }

  // 8. Public Infrastructure Container
  try {
    const publicContainer = document.getElementById('infrastructure-container');
    const placeXml = parseXML(data.placeables || data.placeables_xml);

    if (publicContainer) {
      let infraHtml = "";

      if (placeXml) {
        const trainNode = placeXml.querySelector("placeable[uniqueId='trainSystem']");
        infraHtml += `
          <div class="item-card">
            <div class="item-left">
              ${getThumbnailHTML("TRAIN STATION", "fa-train")}
              <div>
                <div class="item-title">Public Regional Train Network</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">Public Map Asset</span>
                  <span class="badge-stat badge-good">Operational (Rail Line)</span>
                </div>
              </div>
            </div>
          </div>`;

        placeXml.querySelectorAll("placeable[uniqueId*='grainBargeTerminal']").forEach(b => {
          const uid = b.getAttribute("uniqueId");
          const formatted = uid.includes("01") ? "East River Grain Terminal" : "West River Grain Terminal";

          infraHtml += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("GRAIN BARGE", "fa-ship")}
                <div>
                  <div class="item-title">${formatted}</div>
                  <div class="mono" style="margin-top:2px;">
                    <span class="badge-stat badge-owner">River Terminal</span>
                    <span class="badge-stat badge-good">Accepting Bulk Shipments</span>
                  </div>
                </div>
              </div>
            </div>`;
        });
      }

      infraHtml += `
        <div class="item-card">
          <div class="item-left">
            ${getThumbnailHTML("AMERICAN MIDWEST TRUCK SHOP", "fa-store")}
            <div>
              <div class="item-title">Equipment Dealership & Repair Bay</div>
              <div class="mono" style="margin-top:2px;">
                <span class="badge-stat badge-owner">Vehicle Trader</span>
                <span class="badge-stat badge-good">Open 24/7</span>
              </div>
            </div>
          </div>
        </div>`;

      publicContainer.innerHTML = infraHtml;
    }
  } catch (e) { console.error("Infrastructure Render Error:", e); }

  // 9. Collectibles Tracker Container
  try {
    const collectiblesContainer = document.getElementById('collectibles-container');
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
                <div class="item-title">Map Collectibles Discovered</div>
                <div class="mono" style="margin-top:2px;">
                  <span class="badge-stat badge-owner">${foundCount} / ${totalCollectibles} Found</span>
                </div>
              </div>
            </div>
            <div class="farm-money" style="font-size:1.1rem; color:var(--accent-gold);">${foundPct}%</div>
          </div>
          ${renderGaugeBar(foundPct, "Collection Progress")}
        </div>`;
    }
  } catch (e) { console.error("Collectibles Render Error:", e); }

  // 10. Dealership Used Vehicle Sales Container
  try {
    const salesContainer = document.getElementById('sales-container');
    const salesXml = parseXML(data.sales || data.sales_xml);

    if (salesContainer) {
      let salesHtml = "";
      if (salesXml) {
        salesXml.querySelectorAll("item").forEach(item => {
          const xmlFilename = item.getAttribute("xmlFilename") || "Equipment";
          const details = resolveEquipmentDetails(xmlFilename);
          const price = Math.round(parseFloat(item.getAttribute("price") || "0"));
          const damageVal = parseFloat(item.getAttribute("damage") || "0");
          const wearVal = parseFloat(item.getAttribute("wear") || "0");

          const conditionPct = Math.round(100 - (Math.max(damageVal, wearVal) * 100));

          salesHtml += `
            <div class="item-card" style="flex-direction:column; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="item-left">
                  ${getThumbnailHTML(details.name, "fa-tags")}
                  <div>
                    <div class="item-title">${details.name}</div>
                    <div class="mono" style="margin-top:2px;">
                      <span class="badge-stat badge-owner">${details.category}</span>
                      <span class="badge-stat badge-good"><i class="fa-solid fa-tag"></i> Store Deal</span>
                    </div>
                  </div>
                </div>
                <div class="farm-money" style="color:var(--accent-gold);">$${price.toLocaleString()}</div>
              </div>
              ${renderGaugeBar(conditionPct, "Equipment Condition")}
            </div>`;
        });
      }

      salesContainer.innerHTML = salesHtml || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No store sales active.</div>`;
    }
  } catch (e) { console.error("Sales Render Error:", e); }
};
