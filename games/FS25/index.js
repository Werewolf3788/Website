/*
 Version Timestamp: Fri, July 24, 2026, 01:30 PM (EDT)
 Dynamic Multi-Farm Tactical Hub - Hand Tools, Time Speed, Buying Stations & Classified Categories
 File: games/FS25/index.js
*/

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public Map", color: "#facc15", isAI: true },
  "1": { name: "Farm 1", color: "#ff5f00", isAI: false },
  "2": { name: "Farm 2", color: "#c41e3a", isAI: false },
  "3": { name: "Farm 3", color: "#2563eb", isAI: false },
  "4": { name: "Farm 4", color: "#ec4899", isAI: false },
  "5": { name: "Farm 5", color: "#a855f7", isAI: false },
  "6": { name: "Farm 6", color: "#22c55e", isAI: false }
};

function getFarmColorMeta(farmId) {
  const key = String(farmId || "0");
  if (FARM_COLOR_PALETTE[key]) return FARM_COLOR_PALETTE[key];
  const idNum = parseInt(key, 10) || 0;
  const hue = (idNum * 137.5) % 360;
  return { name: `Farm ${idNum}`, color: `hsl(${hue}, 85%, 55%)`, isAI: false };
}

const HUMAN_EQUIPMENT_LOOKUP = {
  "MF8570": { name: "Massey Ferguson 8570 Combine", category: "Harvester" },
  "MF8570HEADER": { name: "Massey Ferguson 8570 Grain Header", category: "Header" },
  "XB150": { name: "BISO XB150 Header Trailer", category: "Header Trailer" },
  "FRONTLOADER PALLET FORK": { name: "Albutt Pallet Fork", category: "Frontloader Attachment" },
  "FRONTLOADER SHOVEL": { name: "Albutt Universal Shovel", category: "Frontloader Attachment" },
  "POV5XL": { name: "Agromasz POV 5 XL 5-Furrow Plough", category: "Plough" },
  "TOP450": { name: "Pöttinger TOP 450 Tedder", category: "Tedder / Hay" },
  "AGRO STAR831": { name: "Deutz-Fahr AgroStar 8.31", category: "Medium Tractor" },
  "Z18051": { name: "Zetor Crystal 12045 / Z180", category: "Medium Tractor" },
  "SERIES3650": { name: "John Deere 3650 Tractor", category: "Small Tractor" },
  "KREDO": { name: "Lemken KREDO 300 Power Harrow", category: "Power Harrow" },
  "TERRIA": { name: "Pöttinger TERRIA 6040 Cultivator", category: "Cultivator" },
  "REXIUS": { name: "Väderstad REXIUS 1230 Roller", category: "Soil Roller" },
  "HTW65": { name: "Bergmann HTW 65 Forage Wagon", category: "Forage Wagon" },
  "TA12050": { name: "Krampe TA 12050 Tipper", category: "Tipper Trailer" },
  "COLOSSUS 8000": { name: "Lizard Colossus 8000 Root Harvester", category: "Beet Harvester", modFeatures: "45,000L - 2,500,000L Capacity | 800-3000 HP" },
  "TITAN HEADER": { name: "Lizard Titan Grain Header", category: "Header", modFeatures: "52.5 ft (15.2m) Work Width | Unrealistic Options" },
  "COLOSSUS 6000": { name: "Lizard Colossus 6000 Forage Harvester", category: "Forage Harvester", modFeatures: "900-3050 HP | 27-125 MPH" }
};

const IMAGE_ASSETS = {
  "BARLEY": "images/Barley.JPG", "BEETROOT": "images/Beetroot.JPG", "CORN": "images/Corn.JPG",
  "MAIZE": "images/Corn.JPG", "GRASS": "images/Grass.JPG", "OAT": "images/Oats.JPG",
  "POTATO": "images/Potatoes.JPG", "SUGARBEET": "images/Sugarbeets.JPG", "WHEAT": "images/Wheat.JPG",
  "SILO": "images/Elevator Silo.JPG", "TRAIN STATION": "images/Train Station.JPG"
};

const CROP_NAME_MAP = {
  "WHEAT": "Wheat", "BARLEY": "Barley", "CANOLA": "Canola", "OAT": "Oats",
  "MAIZE": "Corn / Maize", "SUNFLOWER": "Sunflowers", "SOYBEAN": "Soybeans",
  "POTATO": "Potatoes", "SUGARBEET": "Sugarbeets", "GRASS": "Grass", "SILAGE": "Silage", "LIME": "Lime"
};

function resolveEquipmentDetails(rawName) {
  if (!rawName) return { name: "Map Equipment", category: "Tool" };
  const str = String(rawName).toUpperCase().trim();
  for (const [key, meta] of Object.entries(HUMAN_EQUIPMENT_LOOKUP)) {
    if (str.includes(key)) return meta;
  }
  return { name: formatName(rawName), category: "Equipment / Tool" };
}

function renderGaugeBar(percentage, labelText) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  let barColor = pct >= 71 ? "#22c55e" : (pct >= 40 ? "#eab308" : "#ef4444");
  return `
    <div class="gauge-wrapper" style="margin-top:6px; width:100%;">
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; font-family:monospace; margin-bottom:3px;">
        <span>${labelText}</span>
        <span style="color:${barColor}; font-weight:bold;">${pct}%</span>
      </div>
      <div class="progress-container"><div class="progress-bar" style="width: ${pct}%; background-color: ${barColor};"></div></div>
    </div>`;
}

function resolveCropName(typeName) {
  if (!typeName || typeName.toUpperCase() === "UNKNOWN") return "Empty";
  const key = String(typeName).toUpperCase().replace('FILLTYPE_', '').trim();
  return CROP_NAME_MAP[key] || formatName(key);
}

function getThumbnailHTML(key, fallbackIcon = "fa-box") {
  if (!key) return `<div class="item-icon-box"><i class="fa-solid ${fallbackIcon}"></i></div>`;
  const lookupKey = String(key).toUpperCase().replace('FILLTYPE_', '').replace('VEHICLE_', '').trim();
  if (IMAGE_ASSETS[lookupKey]) return `<div class="item-icon-box"><img src="${IMAGE_ASSETS[lookupKey]}" alt="${lookupKey}"></div>`;
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

function formatOwnershipInfo(farmId, registeredFarmsMap, customAiName) {
  const fid = String(farmId || "0");
  const farmName = registeredFarmsMap[fid];

  if (fid !== "0" && farmName) {
    const meta = getFarmColorMeta(fid);
    return {
      labelHTML: `<span class="badge-stat" style="background-color: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}; font-weight: bold;"><i class="fa-solid fa-building-columns"></i> ${farmName}</span>`,
      cardStyle: `border-left: 4px solid ${meta.color};`,
      colorHex: meta.color
    };
  }

  const aiLabel = customAiName ? `AI Landowner: ${customAiName}` : `Public / AI Map Asset`;
  return {
    labelHTML: `<span class="badge-stat" style="background-color: rgba(250, 204, 21, 0.15); color: #facc15; border: 1px solid #facc15; font-weight: bold;"><i class="fa-solid fa-robot"></i> ${aiLabel}</span>`,
    cardStyle: `border-left: 4px solid #facc15;`,
    colorHex: "#facc15"
  };
}

// Tab Switching Listener Setup
document.addEventListener("DOMContentLoaded", () => {
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

window.renderDashboard = function(data) {
  if (!data) return;

  const statsXml = parseXML(data.stats || data.dedicatedServerConfig_xml);
  const serverNode = statsXml ? statsXml.querySelector("Server") : null;
  const gameName = serverNode ? serverNode.getAttribute("name") : null;

  // 1. In-Game Speed & Server Environment
  if (serverNode) {
    const timeScale = serverNode.getAttribute("timeScale") || "5.0";
    const speedBadge = document.getElementById('time-speed-badge');
    if (speedBadge) speedBadge.innerHTML = `<i class="fa-solid fa-forward-fast"></i> Speed: ${parseFloat(timeScale).toFixed(0)}x`;

    const traffic = serverNode.getAttribute("trafficEnabled") !== "false";
    const trafficBadge = document.getElementById('traffic-badge');
    if (trafficBadge) trafficBadge.innerHTML = `<i class="fa-solid fa-car"></i> Traffic: ${traffic ? 'ON' : 'OFF'}`;
  }

  // 2. Farmlands & Registered Player Farms
  const registeredFarmsMap = {};
  let totalLandCount = 0;
  let globalNetWorthSum = 0;

  try {
    const farmlandXml = parseXML(data.farmlands || data.farmlands_xml);
    if (farmlandXml) totalLandCount = farmlandXml.querySelectorAll("farmland").length;
    const landEl = document.getElementById('global-land-count');
    if (landEl) landEl.textContent = `${totalLandCount} Parcels`;

    const farmsXml = parseXML(data.farms || data.farms_xml);
    if (farmsXml) {
      farmsXml.querySelectorAll("farm").forEach(farm => {
        const farmId = farm.getAttribute("farmId");
        if (!farmId || farmId === "0") return;
        let rawName = farm.getAttribute("name") || `Farm #${farmId}`;
        registeredFarmsMap[farmId] = rawName;
        globalNetWorthSum += parseFloat(farm.getAttribute("money") || "0");
      });
    }

    const netWorthEl = document.getElementById('global-net-worth');
    if (netWorthEl) netWorthEl.textContent = `$${Math.round(globalNetWorthSum).toLocaleString()}`;

  } catch (e) {}

  // 3. Dynamic Farm Tab Generation
  const tabBar = document.getElementById('tab-navigation-bar');
  const tabsWrapper = document.getElementById('dynamic-farm-tabs-wrapper');

  if (tabBar && tabsWrapper) {
    let tabButtonsHtml = `<button class="tab-btn active" data-tab="main-tab"><i class="fa-solid fa-globe"></i> MAIN OVERVIEW (AI & MAP SUMMARY)</button>`;
    let tabPanelsHtml = "";

    Object.keys(registeredFarmsMap).forEach(farmId => {
      const farmName = registeredFarmsMap[farmId];
      const meta = getFarmColorMeta(farmId);
      const tabId = `farm-tab-${farmId}`;

      tabButtonsHtml += `
        <button class="tab-btn" data-tab="${tabId}" style="border-bottom: 3px solid ${meta.color};">
          <i class="fa-solid fa-building-columns" style="color:${meta.color};"></i> ${farmName} (ID: ${farmId})
        </button>`;

      tabPanelsHtml += `
        <div id="${tabId}" class="tab-content-panel">
          <div class="masonry-grid">
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-tractor" style="color:${meta.color};"></i> <h2>${farmName} - VEHICLES</h2></div>
              <div id="farm-${farmId}-vehicles" class="box-content"><div class="loading-state">Scanning vehicles...</div></div>
            </div>
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-screwdriver-wrench" style="color:${meta.color};"></i> <h2>${farmName} - ATTACHMENTS & IMPLEMENTS</h2></div>
              <div id="farm-${farmId}-implements" class="box-content"><div class="loading-state">Scanning attachments...</div></div>
            </div>
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-trailer" style="color:${meta.color};"></i> <h2>${farmName} - TRAILERS & WAGONS</h2></div>
              <div id="farm-${farmId}-trailers" class="box-content"><div class="loading-state">Scanning trailers...</div></div>
            </div>
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-wheat-field" style="color:${meta.color};"></i> <h2>${farmName} - GRAIN HEADERS</h2></div>
              <div id="farm-${farmId}-headers" class="box-content"><div class="loading-state">Scanning headers...</div></div>
            </div>
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-warehouse" style="color:${meta.color};"></i> <h2>${farmName} - SILOS & CROPS</h2></div>
              <div id="farm-${farmId}-silos" class="box-content"><div class="loading-state">Checking silos...</div></div>
            </div>
            <div class="dashboard-box" style="border-top: 4px solid ${meta.color};">
              <div class="box-header"><i class="fa-solid fa-wrench" style="color:${meta.color};"></i> <h2>${farmName} - HAND TOOLS & PLAYERS</h2></div>
              <div id="farm-${farmId}-tools" class="box-content"><div class="loading-state">Scanning hand tools...</div></div>
            </div>
          </div>
        </div>`;
    });

    tabBar.innerHTML = tabButtonsHtml;
    tabsWrapper.innerHTML = tabPanelsHtml;
  }

  // 4. Classified Machinery, Headers & Trailers Categorization
  try {
    const vehXml = parseXML(data.vehicles || data.vehicles_xml);
    let totalVehiclesCount = 0;
    let totalAttachmentsCount = 0;

    if (vehXml) {
      const allVehicles = vehXml.querySelectorAll("vehicle");
      totalVehiclesCount = allVehicles.length;

      allVehicles.forEach(vNode => {
        const filename = vNode.getAttribute("filename") || "";
        const details = resolveEquipmentDetails(filename);
        const farmId = vNode.getAttribute("farmId") || "0";
        const category = details.category.toLowerCase();

        if (category.includes("attachment") || category.includes("header") || category.includes("trailer") || category.includes("wagon")) {
          totalAttachmentsCount++;
        }

        // License Plate & Operator
        let plateText = vNode.getAttribute("licensePlateData") ? `<span class="badge-stat"><i class="fa-solid fa-id-card"></i> ${vNode.getAttribute("licensePlateData")}</span>` : '';
        let modFeaturesText = details.modFeatures ? `<div class="mono" style="font-size:0.75rem; color:#facc15;"><i class="fa-solid fa-sliders"></i> ${details.modFeatures}</div>` : '';

        const cardHtml = `
          <div class="item-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="item-left">
                ${getThumbnailHTML(details.name, "fa-tractor")}
                <div>
                  <div class="item-title">${details.name}</div>
                  <div class="mono"><span class="badge-stat badge-good">${details.category}</span> ${plateText}</div>
                </div>
              </div>
            </div>
            ${modFeaturesText}
          </div>`;

        // Render to dynamic farm containers if present
        if (farmId !== "0") {
          const vehCont = document.getElementById(`farm-${farmId}-vehicles`);
          const implCont = document.getElementById(`farm-${farmId}-implements`);
          const trailCont = document.getElementById(`farm-${farmId}-trailers`);
          const headCont = document.getElementById(`farm-${farmId}-headers`);

          if (category.includes("header") && headCont) headCont.innerHTML += cardHtml;
          else if ((category.includes("trailer") || category.includes("wagon")) && trailCont) trailCont.innerHTML += cardHtml;
          else if ((category.includes("attachment") || category.includes("tool") || category.includes("plough")) && implCont) implCont.innerHTML += cardHtml;
          else if (vehCont) vehCont.innerHTML += cardHtml;
        }
      });
    }

    const vehEl = document.getElementById('global-vehicle-count');
    if (vehEl) vehEl.textContent = `${totalVehiclesCount}`;

    const attEl = document.getElementById('global-attachment-count');
    if (attEl) attEl.textContent = `${totalAttachmentsCount}`;

  } catch (e) {}

  // 5. Hand Tools Tracker
  try {
    const handXml = parseXML(data.handTools || data.handTools_xml);
    if (handXml) {
      handXml.querySelectorAll("handTool").forEach(tool => {
        const farmId = tool.getAttribute("farmId") || "1";
        const toolName = formatName(tool.getAttribute("filename") || "Chainsaw / Hand Tool");
        const holder = tool.getAttribute("holder") || "Unassigned";

        const toolsCont = document.getElementById(`farm-${farmId}-tools`);
        if (toolsCont) {
          toolsCont.innerHTML += `
            <div class="item-card">
              <div class="item-left">
                ${getThumbnailHTML("TOOL", "fa-wrench")}
                <div>
                  <div class="item-title">${toolName}</div>
                  <div class="mono"><span class="badge-stat badge-good"><i class="fa-solid fa-user"></i> Holder: ${holder}</span></div>
                </div>
              </div>
            </div>`;
        }
      });
    }
  } catch (e) {}

  // 6. Buying Stations & Field Mapping
  try {
    const placeXml = parseXML(data.placeables || data.placeables_xml);
    const buyingCont = document.getElementById('buying-stations-container');
    if (buyingCont && placeXml) {
      let buyingHtml = "";
      placeXml.querySelectorAll("placeable[buyingStation]").forEach(b => {
        const stationName = formatName(b.getAttribute("filename") || "Buying Station");
        const spotIndex = b.getAttribute("spotIndex") || "N/A";

        buyingHtml += `
          <div class="item-card">
            <div class="item-left">
              ${getThumbnailHTML("STORE", "fa-store")}
              <div>
                <div class="item-title">${stationName}</div>
                <div class="mono"><span class="badge-stat badge-good">Location: Field / Spot #${spotIndex}</span></div>
              </div>
            </div>
          </div>`;
      });
      buyingCont.innerHTML = buyingHtml || `<div class="loading-state"><i class="fa-solid fa-info-circle"></i> No map buying stations located.</div>`;
    }
  } catch (e) {}
};
