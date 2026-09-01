/* ==========================================================================
   File: games/FS25/index.js
   Deployment Timestamp: 2026-09-01 08:48:00 (EDT - 24hr New York Time)
   Project: entertainment-71888 (/fs25 RTDB Node)
   Description: Complete Deep Tactical Telemetry Engine (Native JSON + Fallback).
                - Reads structured JSON nodes (farms, activeMods, collectibles).
                - Case-insensitive image resolver using local repo assets.
                - Dynamic filtering by Farm ID (farms, vehicles, placeables).
   ========================================================================== */

/* ------------------------------------------------------------------------
   HTML Target Reference Notes:
   - Mod Hub Grid -> Target ID in HTML: 'mod-hub-grid' (Line ~220)
   - Active Players Container -> Target ID: 'active-players-container' (Line ~125)
   - Farms Container -> Target ID: 'farms-container' (Line ~135)
   - Husbandry & Productions -> Target IDs: 'animals-container', 
     'main-productions-container', 'construction-container', 'greenhouses-container' (Line ~145)
   - Contracts & Missions -> Target ID: 'missions-container' (Line ~175)
   - Fleet Machinery -> Target IDs: 'tractors-container', 'harvesters-container',
     'trailers-container', 'implements-container' (Line ~190)
   - Hand Tools -> Target ID: 'handtools-container' (Line ~205)
   - Collectibles -> Target ID: 'collectibles-container' (Line ~180)
   - Field Crops & Agronomy Status -> Target ID: 'fields-container' (Line ~210)
   ------------------------------------------------------------------------ */

// GA4 Protocol-Relative Analytics Injection
(function injectGA4() {
  try {
    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = "//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD";
      script.onerror = () => console.warn("ℹ️ GA4 tag skipped by client.");
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', 'G-CTYHDF4MSD', { 'send_page_view': true, 'anonymize_ip': false });
    }
  } catch (e) {}
})();

const REPO_IMAGES_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/FS25/images/";
const LIVE_MAP_SECURE_PROXY = "https://wsrv.nl/?url=207.244.246.70:9050/feed/dedicated-server-stats-map.jpg?code=3FvqSlOsYKckfauM&quality=75&size=1024";

const REPO_KNOWN_IMAGES = [
  "American_Midwest_Truck_Shop.jpg", "Bale_Net.JPG", "Bale_Twine.JPG", "Bale_Wrap.JPG",
  "Barley.JPG", "Barley_Swath.JPG", "Beetroot.JPG", "Big_Bud_KTTA_700.JPG", "Bread.JPG",
  "Buffalo_Mozzarella.JPG", "Butter.JPG", "Cabbage.JPG", "CalmLands.JPG", "Canola.JPG",
  "Canola_Oil.JPG", "Canola_Swath.JPG", "Carrots.JPG", "Cereal.JPG", "Chaff.JPG",
  "Cheese.JPG", "Chickens.JPG", "Chili_Peppers.JPG", "Chocolate.JPG", "Corn.JPG",
  "Cotton.JPG", "Cotton_Round_Bale.JPG", "Cotton_Square_Bale.JPG", "Cow.JPG", "DEF.JPG",
  "Destructible_Rock.JPG", "Diesel.JPG", "Digestate.JPG", "Dogs.JPG", "Eggs.JPG",
  "Electric_Charge.JPG", "Elevator_Silo.JPG", "Enoki.JPG", "FORESTRY_LOCOMOTIVE.JPG",
  "Farming_Simulator_25_Poster_Image.jpg", "Fir_Tree.JPG", "Flour.JPG", "Forage.JPG",
  "GRAIN_BARGE.JPG", "GRAIN_ELEVATOR.jpg", "Garlic.JPG", "Goat_Cheese.JPG", "Goats.JPG",
  "Grape_Juice.JPG", "Grapes.JPG", "Grass.JPG", "Grass_Cut.JPG", "Grass_Round_Bale.JPG",
  "Grass_Square_Bale.JPG", "Green_Beans.JPG", "HARVEST.JPG", "HERBICIDE.JPG",
  "HONEY_BOX.JPG", "Hay.JPG", "Hay_Round_Bale.JPG", "Hay_Square_Bale.JPG", "Horses.JPG",
  "John_Deere_8R_Series.JPG", "Lettuce.JPG", "Liftable_Pallets_And_Bales.jpg", "Lime.JPG",
  "Liquid_Fertilizer.JPG", "Log_Trailer.JPG", "Long_Grain_Rice.JPG", "Manure.JPG",
  "Methane.JPG", "Milk.JPG", "Mineral_Feed.JPG", "Oat_Swath.JPG", "Oats.JPG",
  "Oilseed_Radish.JPG", "Olive_Oil.JPG", "Onions.JPG", "Oyster_Mushroom.JPG",
  "Parsnip.JPG", "Peas.JPG", "Pig_Food.JPG", "Pigs.JPG", "Poplar_Tree.JPG",
  "Potato_Chips.JPG", "Potatoes.JPG", "Precision_Farming.jpg", "Raisins.JPG",
  "Red_Beet.JPG", "Restaurant.JPG", "Rice.JPG", "Rice_Oil.JPG", "Rice_Saplings.JPG",
  "Road_Salt.JPG", "Rudolf_Hoermann_Round_Storage.jpg", "Seeds.JPG", "Sheep.JPG",
  "Silage.JPG", "Silage_Additive.JPG", "Silage_Round_Bale.JPG", "Silage_Square_Bale.JPG",
  "Slurry.JPG", "Snow.JPG", "Solid_Fertilizer.JPG", "Sorghum.JPG", "Sorghum_Swath.JPG",
  "Soybean_Swath.JPG", "Soybeans.JPG", "Spinach.JPG", "Spinach_Bag.JPG",
  "Spring_Onions.JPG", "St_Lawrence_Map.JPG", "Stone.JPG", "Straw.JPG",
  "Straw_Round_Bale.JPG", "Straw_Square_Bale.JPG", "Strawberries.JPG",
  "Sugar_Beet_Cut.JPG", "Sugarbeets.JPG", "Sugarcane.JPG", "Sunflower Oil.JPG",
  "Sunflowers.JPG", "Teddar.JPG", "Tomatoes.JPG", "Total_Mixed_Ration.JPG",
  "Toy_Tractor.JPG", "Toy_Wagon.JPG", "Train_Station.JPG", "WAGON_FLAT_BED.JPG",
  "WAGON_GRAIN.JPG", "WAGON_SUGARBEETS.JPG", "WAGON_WOOD_CHIPS.JPG", "Water.jpg",
  "Water_Buffalos.JPG", "Wheat.JPG", "Wheat_Swath.JPG", "Wood_Chips.JPG",
  "Wood_Chips_Round Bale.JPG"
];

const HAND_TOOL_NAMES = {
  "XP550": "Husqvarna XP550 Chainsaw",
  "MS261": "Stihl MS261 Chainsaw",
  "FLASHLIGHT100": "Heavy Duty Flashlight",
  "PRESSUREWASHER": "Kärcher High Pressure Washer",
  "CHAINSAW": "Handheld Chainsaw",
  "MEASURINGTAPE": "Surveying Tape Measure"
};

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public Land", color: "#facc15" },
  "1": { name: "My farm", color: "#ff5f00" },
  "2": { name: "Farm 2", color: "#38bdf8" },
  "3": { name: "Dumbace", color: "#a855f7" },
  "4": { name: "Farm 4", color: "#22c55e" },
  "5": { name: "Farm 5", color: "#ec4899" },
  "6": { name: "Farm 6", color: "#e11d48" }
};

let activeFarmDirectory = {};
let latestFirebasePayload = null;
let firebaseImageMappings = {};
let firebaseWebsiteMods = {};

function getFarmMeta(farmId) {
  const fid = String(farmId || "0");
  if (activeFarmDirectory[fid]) return activeFarmDirectory[fid];
  if (FARM_COLOR_PALETTE[fid]) return FARM_COLOR_PALETTE[fid];
  return { name: `Farm #${fid}`, color: "#94a3b8" };
}

function formatGameTime(rawTimeSeconds) {
  if (!rawTimeSeconds) return "00:00";
  let totalMinutes = Math.floor(parseFloat(rawTimeSeconds) / 60);
  if (isNaN(totalMinutes)) return "00:00";
  let hours = Math.floor(totalMinutes / 60) % 24;
  let minutes = totalMinutes % 60;
  return `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

function formatHours(operatingSeconds) {
  if (!operatingSeconds) return "0.0 hrs";
  const hours = parseFloat(operatingSeconds) / 3600;
  return `${hours.toFixed(1)} hrs`;
}

function formatName(str) {
  if (!str) return '';
  let clean = String(str).split('/').pop().replace(/\.(xml|zip|jpg|png|webp|gdm|grle|i3d)$/i, '').replace(/^FS25_/i, '').replace(/^placeable_/i, '');
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toUpperCase().trim();
}

function sanitizeKey(str) {
  return str ? String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '') : "";
}

function isValidImageUrl(url) {
  return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('./'));
}

function resolveItemImage(rawFilename) {
  if (!rawFilename) return null;
  const rawString = String(rawFilename).trim();
  const cleanQuery = sanitizeKey(rawString);
  const baseNameOnly = rawString.split('/').pop().replace(/\.(xml|zip|jpg|png|webp|i3d)$/i, '');
  const cleanBase = sanitizeKey(baseNameOnly);

  if (firebaseImageMappings && Object.keys(firebaseImageMappings).length > 0) {
    const matchedRecord = 
      firebaseImageMappings[cleanBase] ||
      firebaseImageMappings[cleanQuery] ||
      firebaseImageMappings[sanitizeKey(formatName(rawString))];

    if (matchedRecord) {
      const fbUrl = matchedRecord.filename || matchedRecord.image || matchedRecord.file_name || matchedRecord.imageurl || "";
      if (fbUrl) return isValidImageUrl(fbUrl) ? fbUrl : `${REPO_IMAGES_BASE}${encodeURIComponent(fbUrl)}`;
    }
  }

  const directMatch = REPO_KNOWN_IMAGES.find(img => {
    const cleanImg = sanitizeKey(img.replace(/\.(jpg|jpeg|png)$/i, ''));
    return cleanImg === cleanBase || cleanImg === cleanQuery || cleanBase.includes(cleanImg) || cleanImg.includes(cleanBase);
  });

  if (directMatch) {
    return `${REPO_IMAGES_BASE}${encodeURIComponent(directMatch)}`;
  }

  if (rawString.endsWith('.jpg') || rawString.endsWith('.JPG') || rawString.endsWith('.png') || rawString.endsWith('.webp')) {
    const filename = rawString.split('/').pop();
    return `${REPO_IMAGES_BASE}${encodeURIComponent(filename)}`;
  }

  return null;
}

function smartExtractPayload(rawInput) {
  if (!rawInput) return "";
  if (typeof rawInput === 'object') {
    try { rawInput = JSON.stringify(rawInput); } catch(e) { return ""; }
  }
  let text = String(rawInput).trim();
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch && preMatch[1]) text = preMatch[1];
  const codeMatch = text.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch && codeMatch[1]) text = codeMatch[1];

  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  const xmlStart = text.indexOf("<");
  if (xmlStart > 0) text = text.substring(xmlStart);

  return text.trim();
}

function parseXML(rawText) {
  const cleanXmlText = smartExtractPayload(rawText);
  if (!cleanXmlText || !cleanXmlText.includes("<")) return null;
  try {
    const xmlDoc = (new DOMParser()).parseFromString(cleanXmlText, "text/xml");
    return xmlDoc.getElementsByTagName("parsererror").length > 0 ? null : xmlDoc;
  } catch (e) { return null; }
}

function extractPositionText(node) {
  if (!node) return "";
  if (typeof node === 'string') return node;
  let posAttr = node.getAttribute ? node.getAttribute("position") : (node.position || null);
  if (!posAttr && node.querySelector) {
    const comp = node.querySelector("component, Component, coordinates");
    if (comp) posAttr = comp.getAttribute("position") || comp.getAttribute("pos");
  }
  if (!posAttr && node.getAttribute) {
    const x = node.getAttribute("x") || node.getAttribute("posX");
    const z = node.getAttribute("z") || node.getAttribute("posZ");
    if (x && z) return `X: ${parseFloat(x).toFixed(1)} | Z: ${parseFloat(z).toFixed(1)}`;
  }
  if (posAttr) {
    const parts = String(posAttr).trim().split(/\s+/);
    if (parts.length >= 3) {
      return `X: ${parseFloat(parts[0]).toFixed(1)} | Z: ${parseFloat(parts[2]).toFixed(1)}`;
    }
    return String(posAttr);
  }
  return "";
}

/* ==========================================================================
   SECTION 1: Mod Catalog Cross-Reference
   ========================================================================== */

function renderServerMods(activeModObjects) {
  const gridContainer = document.getElementById('mod-hub-grid');
  const catBar = document.getElementById('mod-categories-bar');
  if (!gridContainer) return;

  const categoriesSet = new Set(['ALL']);
  const modList = [];

  activeModObjects.forEach(mod => {
    const rawName = mod.name || mod.title || mod.filename || mod.modKey || '';
    const cleanKey = sanitizeKey(rawName.replace('FS25_', ''));
    const fbMeta = firebaseWebsiteMods[cleanKey] || firebaseWebsiteMods[sanitizeKey(rawName)] || {};
    
    const finalName = mod.name || fbMeta.name_a || fbMeta.name || mod.title || formatName(rawName);
    const category = fbMeta.category_g || fbMeta.category_k || fbMeta.category || mod.category || 'General';
    const desc = mod.description || fbMeta.description_d || fbMeta.description || '';
    const author = mod.author || fbMeta.author_h || fbMeta.author || 'Community Modder';
    const link = mod.pageUrl || fbMeta.url_w_utm_c || fbMeta.link || fbMeta.url || '#';
    const crossplay = mod.platform ? (mod.platform.includes('PS5') || mod.platform.includes('Xbox') ? 'Yes' : 'PC Only') : (fbMeta.crossplay_e || 'Yes');
    const finalImg = mod.image || fbMeta.image_b || resolveItemImage(rawName);

    categoriesSet.add(category.toUpperCase());

    modList.push({
      name: finalName,
      category: category,
      desc: desc,
      author: author,
      link: link,
      crossplay: crossplay,
      image: finalImg
    });
  });

  window.activeConsolidatedMods = modList;

  if (catBar) {
    catBar.innerHTML = Array.from(categoriesSet).map(cat => 
      `<button type="button" class="category-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterConsolidatedCategory('${cat}', this)">${cat}</button>`
    ).join('');
  }

  renderConsolidatedGrid(modList);
}

window.filterConsolidatedCategory = function(selectedCat, btnElem) {
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const source = window.activeConsolidatedMods || [];
  if (selectedCat === 'ALL') {
    renderConsolidatedGrid(source);
  } else {
    renderConsolidatedGrid(source.filter(m => m.category.toUpperCase() === selectedCat));
  }
};

function renderConsolidatedGrid(modList) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  if (modList.length === 0) {
    gridContainer.innerHTML = `<div class="empty-state">No matching server mods found.</div>`;
    return;
  }

  gridContainer.innerHTML = modList.map(mod => {
    const imgHtml = mod.image
      ? `<img src="${mod.image}" data-alt="${mod.name}" class="lightbox-trigger mod-card-thumb" onerror="this.src='${REPO_IMAGES_BASE}Farming_Simulator_25_Poster_Image.jpg'">`
      : `<img src="${REPO_IMAGES_BASE}Farming_Simulator_25_Poster_Image.jpg" class="mod-card-thumb" alt="Mod">`;

    return `
      <div class="mod-card">
        ${imgHtml}
        <div class="mod-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="mod-category-tag">${mod.category}</span>
            <span class="badge" style="font-size:0.7rem; padding:2px 6px;">${mod.crossplay === 'Yes' ? 'Crossplay' : 'PC Only'}</span>
          </div>
          <h3 class="mod-title">${mod.name}</h3>
          ${mod.desc ? `<p class="mod-desc">${mod.desc.substring(0, 140)}...</p>` : ''}
          <div class="mod-card-footer">
            <span class="mod-author"><i class="fa-solid fa-user"></i> ${mod.author}</span>
            ${mod.link !== '#' ? `<a href="${mod.link}" target="_blank" rel="noopener" class="mod-download-btn"><i class="fa-solid fa-download"></i> Get Mod</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================================
   SECTION 2: Active Online Players Renderer
   ========================================================================== */

function renderActivePlayers(statsXml, fs25Node, fallbackActiveCount = 0) {
  const playersCont = document.getElementById('active-players-container');
  let activeGamertags = [];
  let totalSlots = "6";

  if (statsXml) {
    const slotsNode = statsXml.querySelector("Slots, slots");
    if (slotsNode) totalSlots = slotsNode.getAttribute("capacity") || slotsNode.getAttribute("numMax") || "6";

    statsXml.querySelectorAll("Player, player").forEach(p => {
      const name = p.textContent ? p.textContent.trim() : (p.getAttribute("name") || p.getAttribute("playerName") || "");
      const isUsed = p.getAttribute("isUsed") !== "false";
      
      if (name && name !== "UNKNOWN" && isUsed && !activeGamertags.some(x => x.name === name)) {
        let uptimeRaw = p.getAttribute("uptime") || p.getAttribute("playingTime") || p.getAttribute("time") || "0";
        let uptimeFormatted = uptimeRaw;
        
        if (!isNaN(parseFloat(uptimeRaw))) {
          const totalMins = Math.round(parseFloat(uptimeRaw));
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;
          uptimeFormatted = `${h > 0 ? h + 'h ' : ''}${m}m`;
        }

        const statsPos = extractPositionText(p);

        activeGamertags.push({
          name: name,
          uptime: uptimeFormatted,
          pos: statsPos,
          isAdmin: p.getAttribute("isAdmin") === "true" || p.getAttribute("admin") === "true"
        });
      }
    });
  }

  const finalCount = Math.max(activeGamertags.length, fallbackActiveCount);

  if (playersCont) {
    let playersHtml = "";
    activeGamertags.forEach(p => {
      const locationBadge = p.pos 
        ? `<span class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-location-dot"></i> Position: ${p.pos}</span>`
        : `<span class="card-subtext" style="color:#94a3b8;"><i class="fa-solid fa-location-dot"></i> In Game Session</span>`;

      playersHtml += `
        <div class="telemetry-card" style="border-left: 4px solid #22c55e; padding: 0.85rem;">
          <i class="fa-solid fa-gamepad card-icon" style="color:#22c55e;"></i>
          <div class="card-details" style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#22c55e; font-size:1.05rem;">${p.name}</strong>
              ${p.isAdmin ? '<span class="badge" style="border:1px solid #facc15; color:#facc15;">Admin</span>' : ''}
            </div>
            <span style="color:#ffffff;">Session: ${p.uptime}</span>
            ${locationBadge}
          </div>
        </div>`;
    });

    playersCont.innerHTML = `
      <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
        <strong style="color:#22c55e; font-size:0.85rem;"><i class="fa-solid fa-users"></i> Connected Players: ${finalCount}</strong>
      </div>
      ${playersHtml || `<div class="empty-state">No Active Players Connected</div>`}`;
  }

  const playersBadge = document.getElementById('server-players');
  if (playersBadge) playersBadge.textContent = `Players: ${finalCount}/${totalSlots}`;
}

/* ==========================================================================
   SECTION 3: Master Telemetry Dashboard Engine
   ========================================================================== */

window.renderDashboard = function(rawIncomingData) {
  if (!rawIncomingData) return;

  let data = rawIncomingData;
  if (typeof rawIncomingData.val === 'function') {
    data = rawIncomingData.val();
  }
  if (!data) return;

  latestFirebasePayload = data;
  window.setServerStatus(true);

  const fs25Node = (data.fs25 && typeof data.fs25 === 'object') ? data.fs25 : data;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const rawActiveCount = parseInt(fs25Node.activePlayers || 0, 10);

  // XML Fallback References (from raw_xml or legacy keys)
  const rawXmlTree = fs25Node.raw_xml || {};
  const statsXml = parseXML(rawXmlTree.stats || fs25Node.stats_raw || fs25Node.stats_xml_raw || fs25Node.stats_xml);
  const missionsXml = parseXML(rawXmlTree.missions || fs25Node.missions || fs25Node.missions_raw);
  const fieldsXml = parseXML(rawXmlTree.fields || fs25Node.fields || fs25Node.farmland || fs25Node.farmland_raw);
  const salesXml = parseXML(rawXmlTree.sales || fs25Node.sales || fs25Node.sales_raw);
  const envXml = parseXML(rawXmlTree.environment || fs25Node.environment || fs25Node.environment_raw);

  // Active Save Slot Display
  const activeSlot = fs25Node.activeSaveSlot || "3";
  const slotElem = document.getElementById('save-slot-display');
  if (slotElem) slotElem.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: #${activeSlot}`;

  // 1. Dynamic Farm Directory
  try {
    activeFarmDirectory = {};
    let primaryFarmBalance = 0;
    let farmCount = 0;
    let farmsHtml = "";

    if (fs25Node.farms && typeof fs25Node.farms === 'object') {
      Object.keys(fs25Node.farms).forEach(farmKey => {
        const farm = fs25Node.farms[farmKey];
        const farmId = String(farm.farmId || farmKey.replace('farm_', ''));
        const money = Math.round(parseFloat(farm.finances ? farm.finances.money : (farm.money || 0)));
        const name = farm.name || FARM_COLOR_PALETTE[farmId]?.name || `Farm #${farmId}`;
        const color = FARM_COLOR_PALETTE[farmId]?.color || (farmId === "1" ? "#ff5f00" : "#a855f7");

        farmCount++;
        activeFarmDirectory[farmId] = { name, color, money };

        if (farmId === "1" || farmCount === 1) {
          primaryFarmBalance = money;
        }

        farmsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${color}; padding: 0.85rem;">
            <i class="fa-solid fa-building-columns card-icon" style="color:${color};"></i>
            <div class="card-details">
              <strong style="color:${color};">${name}</strong>
              <span style="font-size:1.05rem; font-weight:700; color:#ffffff;">Balance: $${money.toLocaleString()}</span>
              ${farm.finances && farm.finances.loan > 0 ? `<span class="card-subtext" style="color:#f87171;">Loan: $${farm.finances.loan.toLocaleString()}</span>` : ''}
            </div>
          </div>`;
      });
    }

    const farmsCont = document.getElementById('farms-container');
    if (farmsCont) {
      farmsCont.innerHTML = `
        <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;">
          <strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-building-columns"></i> Total Registered Farms: ${farmCount}</strong>
        </div>
        ${farmsHtml || `<div class="empty-state">No Active Farms Logged</div>`}`;
      setTxt('global-net-worth', `$${primaryFarmBalance.toLocaleString()}`);
    }
  } catch (err) {
    console.error("Farms render notice:", err);
  }

  // 2. Server Banner, Weather & Live Time
  try {
    let liveClockText = "00:00";
    let seasonText = "Early Autumn";
    let weatherText = "Clear";
    let serverMapTitle = fs25Node.gameInfo?.mapTitle || "Zielonka";
    let serverGameName = fs25Node.gameInfo?.savegameName || "FS25 Dedicated Server";

    if (fs25Node.gameInfo && fs25Node.gameInfo.dayTime) {
      liveClockText = formatGameTime(fs25Node.gameInfo.dayTime);
    }

    if (statsXml) {
      const serverElem = statsXml.querySelector("Server, server");
      if (serverElem) {
        serverMapTitle = serverElem.getAttribute("mapTitle") || serverElem.getAttribute("mapName") || serverMapTitle;
        serverGameName = serverElem.getAttribute("name") || serverElem.getAttribute("server") || serverGameName;
        const dayTime = serverElem.getAttribute("dayTime");
        if (dayTime && liveClockText === "00:00") liveClockText = formatGameTime(dayTime);
      }
    }

    if (envXml) {
      const weatherElem = envXml.querySelector("weather, currentForecast");
      if (weatherElem) weatherText = formatName(weatherElem.getAttribute("type") || weatherElem.getAttribute("state") || "Clear");
      const seasonElem = envXml.querySelector("period, currentPeriod, season");
      if (seasonElem) seasonText = formatName(seasonElem.getAttribute("name") || seasonElem.textContent || "Early Autumn");
    }

    setTxt('server-name', serverGameName);
    setTxt('server-map', `Map: ${serverMapTitle}`);
    setTxt('server-time', `Time: ${liveClockText}`);
    setTxt('server-month', `Season: ${seasonText}`);
    setTxt('server-weather', `Weather: ${weatherText}`);

    const mapBadge = document.getElementById('server-map');
    if (mapBadge) {
      mapBadge.style.cursor = "pointer";
      mapBadge.onclick = () => {
        const modal = document.getElementById('lightbox-modal');
        const modalImg = document.getElementById('lightbox-img');
        const modalCaption = document.getElementById('lightbox-caption');
        if (modal && modalImg) {
          modal.style.display = 'flex';
          modalImg.src = `${LIVE_MAP_SECURE_PROXY}&_t=${Date.now()}`;
          if (modalCaption) modalCaption.textContent = `Live Satellite Map Feed (${serverMapTitle})`;
        }
      };
    }
  } catch (err) {
    console.error("Banner render notice:", err);
  }

  // 3. Relational Fleet Machinery Engine (From JSON Farms + Vehicles)
  let vehicleCount = 0;
  let tracCount = 0, harvCount = 0, trailCount = 0, implCount = 0;
  let tractors = "", harvesters = "", trailers = "", implements = "";

  try {
    const tracCont = document.getElementById('tractors-container');
    const harvCont = document.getElementById('harvesters-container');
    const trailCont = document.getElementById('trailers-container');
    const implCont = document.getElementById('implements-container');

    const allVehicleList = [];

    // Harvest vehicles directly from JSON farm nodes
    if (fs25Node.farms && typeof fs25Node.farms === 'object') {
      Object.keys(fs25Node.farms).forEach(farmKey => {
        const farm = fs25Node.farms[farmKey];
        const fId = String(farm.farmId || farmKey.replace('farm_', ''));
        if (Array.isArray(farm.vehicles)) {
          farm.vehicles.forEach(v => allVehicleList.push({ ...v, farmId: fId }));
        }
      });
    }

    if (fs25Node.unowned && Array.isArray(fs25Node.unowned.vehicles)) {
      fs25Node.unowned.vehicles.forEach(v => allVehicleList.push({ ...v, farmId: "0" }));
    }

    allVehicleList.forEach(v => {
      vehicleCount++;
      const name = v.name || formatName(v.file || "");
      const fid = String(v.farmId || "0");
      const farmMeta = getFarmMeta(fid);
      const color = farmMeta.color;
      const ownerLabel = farmMeta.name;
      const operatingTime = v.operatingHours ? `${v.operatingHours} hrs` : "0.0 hrs";
      const matchedImg = v.image || resolveItemImage(name) || resolveItemImage(v.file);

      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-tractor card-icon" style="color:${color};"></i>`;

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
          ${imgHtml}
          <div class="card-details" style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
              <strong style="color:${color};">${name}</strong>
            </div>
            <span>Owner: ${ownerLabel} | Usage: ${operatingTime}</span>
            ${v.price ? `<span class="card-subtext" style="color:#94a3b8;">Value: $${v.price.toLocaleString()}</span>` : ''}
          </div>
        </div>`;

      const lowerName = (name + " " + (v.file || "")).toLowerCase();
      if (lowerName.includes("combine") || lowerName.includes("harvest") || lowerName.includes("cutter") || lowerName.includes("lexion")) {
        harvCount++; harvesters += card;
      } else if (lowerName.includes("tractor") || lowerName.includes("truck") || lowerName.includes("series8r") || lowerName.includes("magnum") || lowerName.includes("fendt")) {
        tracCount++; tractors += card;
      } else if (lowerName.includes("trailer") || lowerName.includes("wagon") || lowerName.includes("tipper") || lowerName.includes("tanker")) {
        trailCount++; trailers += card;
      } else {
        implCount++; implements += card;
      }
    });

    if (salesXml) {
      salesXml.querySelectorAll("sale, item, Item").forEach(s => {
        const rawName = s.getAttribute("filename") || s.getAttribute("name") || "";
        const price = Math.round(parseFloat(s.getAttribute("price") || s.getAttribute("discountPrice") || "0"));
        const orig = Math.round(parseFloat(s.getAttribute("basePrice") || "0"));
        if (rawName && price > 0) {
          implCount++;
          const name = formatName(rawName);
          const discountPct = orig > 0 ? Math.round(((orig - price) / orig) * 100) : 20;
          const matchedImg = resolveItemImage(rawName);
          const imgHtml = matchedImg ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">` : `<i class="fa-solid fa-tag card-icon" style="color:#facc15;"></i>`;

          implements += `
            <div class="telemetry-card" style="border-left: 4px solid #facc15; padding:0.85rem;">
              ${imgHtml}
              <div class="card-details" style="width:100%;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:#facc15;">${name} (SALE)</strong>
                  <span class="badge" style="background:rgba(250, 204, 21, 0.2); color:#facc15;">-${discountPct}% OFF</span>
                </div>
                <span style="color:#ffffff; font-weight:700;">Discount Deal: $${price.toLocaleString()}</span>
                <span class="card-subtext">Dealership Machinery Special Active</span>
              </div>
            </div>`;
        }
      });
    }

    if (tracCont) tracCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-tractor"></i> Fleet Tractors & Rigs: ${tracCount}</strong></div>${tractors || `<div class="empty-state">No Fleet Tractors Found</div>`}`;
    if (harvCont) harvCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-wheat-awn"></i> Harvesters & Combines: ${harvCount}</strong></div>${harvesters || `<div class="empty-state">No Harvesters Found</div>`}`;
    if (trailCont) trailCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-truck-ramp-box"></i> Hauling Trailers: ${trailCount}</strong></div>${trailers || `<div class="empty-state">No Trailers Found</div>`}`;
    if (implCont) implCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-screwdriver-wrench"></i> Implements & Attachments: ${implCount}</strong></div>${implements || `<div class="empty-state">No Implements Found</div>`}`;
    setTxt('global-vehicle-count', vehicleCount);

    renderActivePlayers(statsXml, fs25Node, rawActiveCount);
  } catch (err) {
    console.error("Fleet render notice:", err);
  }

  // 4. Map Factories, Productions, Husbandry (From JSON Placeables)
  try {
    const animalsCont = document.getElementById('animals-container');
    const genCont = document.getElementById('greenhouses-container');
    const miscCont = document.getElementById('construction-container');
    const prodCont = document.getElementById('main-productions-container');

    let animalsHtml = "", genHtml = "", miscHtml = "", prodHtml = "";
    let animalCount = 0, genCount = 0, miscCount = 0, prodCount = 0;

    const allPlaceablesList = [];
    if (fs25Node.farms && typeof fs25Node.farms === 'object') {
      Object.keys(fs25Node.farms).forEach(farmKey => {
        const farm = fs25Node.farms[farmKey];
        const fId = String(farm.farmId || farmKey.replace('farm_', ''));
        if (Array.isArray(farm.placeables)) {
          farm.placeables.forEach(p => allPlaceablesList.push({ ...p, farmId: fId }));
        }
      });
    }
    if (fs25Node.unowned && Array.isArray(fs25Node.unowned.placeables)) {
      fs25Node.unowned.placeables.forEach(p => allPlaceablesList.push({ ...p, farmId: "0" }));
    }

    allPlaceablesList.forEach(p => {
      const name = p.name || formatName(p.file || "");
      const fid = String(p.farmId || "0");
      const farmMeta = getFarmMeta(fid);
      const color = farmMeta.color;
      const ownerLabel = farmMeta.name;
      const locText = extractPositionText(p.position);
      const matchedImg = p.image || resolveItemImage(name) || resolveItemImage(p.file);

      const imgHtml = matchedImg 
        ? `<img src="${matchedImg}" class="telemetry-card-thumb lightbox-trigger" data-alt="${name}">`
        : `<i class="fa-solid fa-building card-icon" style="color:${color};"></i>`;

      const card = `
        <div class="telemetry-card" style="border-left: 4px solid ${color}; padding:0.85rem;">
          ${imgHtml}
          <div class="card-details" style="width:100%;">
            <strong style="color:${color};">${name}</strong>
            <span>Owner: ${ownerLabel}</span>
            ${locText ? `<span class="card-subtext" style="color:#38bdf8;"><i class="fa-solid fa-location-dot"></i> Location: ${locText}</span>` : ''}
          </div>
        </div>`;

      const lowerName = (name + " " + (p.file || "")).toLowerCase();
      if (lowerName.includes("husbandry") || lowerName.includes("barn") || lowerName.includes("cow") || lowerName.includes("pig") || lowerName.includes("chicken")) {
        animalCount++; animalsHtml += card;
      } else if (lowerName.includes("solar") || lowerName.includes("greenhouse") || lowerName.includes("generator")) {
        genCount++; genHtml += card;
      } else if (lowerName.includes("silo") || lowerName.includes("hall") || lowerName.includes("shed") || lowerName.includes("garage")) {
        miscCount++; miscHtml += card;
      } else {
        prodCount++; prodHtml += card;
      }
    });

    if (animalsCont) animalsCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-cow"></i> Husbandry Facilities: ${animalCount}</strong></div>${animalsHtml || `<div class="empty-state">No Animal Facilities Logged</div>`}`;
    if (genCont) genCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-solar-panel"></i> Greenhouses & Generators: ${genCount}</strong></div>${genHtml || `<div class="empty-state">No Greenhouses or Generators Logged</div>`}`;
    if (miscCont) miscCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-tower-cell"></i> Placed Objects & Silos: ${miscCount}</strong></div>${miscHtml || `<div class="empty-state">No Placed Objects Logged</div>`}`;
    if (prodCont) prodCont.innerHTML = `<div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-industry"></i> Production Factories: ${prodCount}</strong></div>${prodHtml || `<div class="empty-state">No Production Buildings Logged</div>`}`;
  } catch (err) {
    console.error("Placeables render notice:", err);
  }

  // 5. Deep Contract & Mission Analyzer (missions.xml)
  try {
    const missionsCont = document.getElementById('missions-container');
    if (missionsCont) {
      let missionsHtml = "";
      let missionCount = 0;

      const sourceMissions = missionsXml ? missionsXml.querySelectorAll("mission, contract, item, activeMission, missions > *") : [];

      sourceMissions.forEach(m => {
        let rawType = m.getAttribute("type") || m.getAttribute("missionType") || "Contract Job";
        let fieldId = m.getAttribute("fieldIndex") || m.getAttribute("fieldId") || "N/A";
        let reward = Math.round(parseFloat(m.getAttribute("reward") || m.getAttribute("payout") || "0"));

        missionCount++;
        const jobType = formatName(rawType);
        const fid = extractNodeFarmId(m);
        const farmMeta = getFarmMeta(fid);

        missionsHtml += `
          <div class="telemetry-card" style="border-left: 4px solid ${farmMeta.color}; padding:0.85rem;">
            <i class="fa-solid fa-file-contract card-icon" style="color:${farmMeta.color};"></i>
            <div class="card-details" style="width:100%;">
              <strong style="color:${farmMeta.color}; font-size:1rem;">${jobType} - Field #${fieldId}</strong>
              <span style="color:#ffffff; font-weight:700;">Payout: $${reward.toLocaleString()}</span>
              <span class="card-subtext">Client: ${farmMeta.name}</span>
            </div>
          </div>`;
      });

      missionsCont.innerHTML = `
        <div style="margin-bottom:0.5rem; text-align:center; padding:0.35rem; background:#0f172a; border-radius:4px;"><strong style="color:var(--accent-gold, #facc15); font-size:0.85rem;"><i class="fa-solid fa-file-contract"></i> Total Contracts: ${missionCount}</strong></div>
        ${missionsHtml || `<div class="empty-state">No Active Contracts Available</div>`}`;
    }
  } catch (err) {}

  // 6. Map Collectibles & Discoveries (JSON collectibles node)
  try {
    const collectiblesCont = document.getElementById('collectibles-container');
    if (collectiblesCont) {
      const colData = fs25Node.collectibles || { found: 0, total: 100, formatted: "0/100" };
      let itemsHtml = "";

      if (Array.isArray(colData.items)) {
        colData.items.filter(it => it.isFound).forEach(it => {
          itemsHtml += `
            <div class="telemetry-card">
              <i class="fa-solid fa-trophy card-icon" style="color:#facc15;"></i>
              <div class="card-details">
                <strong style="color:#ffffff;">${it.name}</strong>
                <span class="card-subtext" style="color:#4ade80;"><i class="fa-solid fa-check"></i> Status: Discovered</span>
              </div>
            </div>`;
        });
      }

      collectiblesCont.innerHTML = `
        <div style="margin-bottom:0.5rem; padding:0.4rem 0.6rem; background:#0f172a; border-radius:6px; text-align:center;">
          <strong style="color:var(--accent-gold, #facc15); font-size:0.9rem;">
            <i class="fa-solid fa-trophy"></i> Collectibles Discovered: ${colData.formatted || `${colData.found} / ${colData.total}`}
          </strong>
        </div>
        ${itemsHtml || `<div class="empty-state">${colData.formatted || `${colData.found} / ${colData.total}`} Collectibles Discovered</div>`}`;
    }
  } catch (err) {
    console.error("Collectibles render notice:", err);
  }

  // 7. Server Mod Directory (From JSON activeMods)
  try {
    const activeModsList = [];
    if (fs25Node.activeMods && typeof fs25Node.activeMods === 'object') {
      Object.keys(fs25Node.activeMods).forEach(k => {
        activeModsList.push(fs25Node.activeMods[k]);
      });
    }
    renderServerMods(activeModsList);
  } catch (err) {
    console.error("Mods render notice:", err);
  }
};

/* ==========================================================================
   SECTION 4: Unified Firebase Realtime Database Listener
   ========================================================================== */

function initializeFirebaseSync() {
  const firebaseConfig = {
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com"
  };

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (err) {}

  const db = firebase.database();

  db.ref('FS25_Mods_Info').on('value', (modsSnap) => {
    if (modsSnap.exists()) {
      const modsData = modsSnap.val();
      if (modsData.Images) firebaseImageMappings = modsData.Images;
      if (modsData.Website) {
        Object.values(modsData.Website).forEach(m => {
          const key = sanitizeKey(m.name_a || m.name || m.title || '');
          if (key) firebaseWebsiteMods[key] = m;
        });
      }
    }
  });

  db.ref('fs25').on('value', (snap) => {
    if (snap.exists()) {
      window.renderDashboard(snap.val());
    } else {
      fetch("https://entertainment-71888-default-rtdb.firebaseio.com/fs25.json")
        .then(r => r.json())
        .then(data => {
          if (data) window.renderDashboard(data);
          else window.setServerStatus(false);
        })
        .catch(() => window.setServerStatus(false));
    }
  }, (error) => {
    console.warn("RTDB Live Sync Notice:", error.message);
  });
}

/* ==========================================================================
   SECTION 5: Event Listeners & Lightbox Setup
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');

  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('lightbox-trigger')) {
      if (modal && modalImg) {
        modal.style.display = 'flex';
        modalImg.src = e.target.src;
        if (modalCaption) {
          modalCaption.textContent = e.target.getAttribute('data-alt') || e.target.alt || 'Enlarged Preview';
        }
      }
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('dynamic-menu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => navMenu.classList.toggle('open'));
  }

  initializeFirebaseSync();
});

window.setServerStatus = function(isOnline) {
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  if (statusPill && statusText) {
    statusPill.className = isOnline ? 'status-pill status-online' : 'status-pill status-offline';
    statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
  }
};
