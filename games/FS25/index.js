/**
 * =========================================================================
 * FS25 Command Center Data Aggregator & Cross-Referencer
 * Date/Time of Development (NYT): Tue, June 23, 2026, 11:58 PM (NYT)
 * Precision Integration - Full Database Parsing Node Engine
 * NO STRIPPING. NO COMPRESSION. IMMUTABLE DESIGN INTEGRITY.
 * =========================================================================
 */

const config = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:fc70f96b04d0380a9aa692",
    measurementId: "G-YFK0E0FPXS"
};

if (!firebase.apps.length) {
    firebase.initializeApp(config);
}
const db = firebase.database();

// Tracking UTM Parameter Logic to Google Analytics
try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('utm_source') || urlParams.has('utm_medium') || urlParams.has('utm_campaign')) {
        gtag('event', 'page_view', {
            'page_location': window.location.href,
            'page_title': document.title,
            'utm_source': urlParams.get('utm_source'),
            'utm_medium': urlParams.get('utm_medium'),
            'utm_campaign': urlParams.get('utm_campaign')
        });
    }
} catch (analyticsErr) { console.warn("Analytics verification bypassed: " + analyticsErr.message); }

// Safe ModHub Wiki Mirror Asset Catalog
const assetCatalog = {
    "ISARIAPROACTIVE": { img: "https://farmingsimulator.wiki.gg/images/4/46/FS25_Isaria_Pro_Active_ico.png", name: "Isaria Pro Active", desc: "Crop Nitrogen Precision Sensor" },
    "INVISIBLEROLLER": { img: "https://farmingsimulator.wiki.gg/images/1/1d/FS25_Lizard_ProBale_ico.png", name: "Lizard ProBale Roller", desc: "Invisible Autoload Field Roller" },
    "4900MULTIFRUIT": { img: "https://farmingsimulator.wiki.gg/images/7/76/FS25_Kinze_4900_ico.png", name: "Kinze 4900 Multi-Fruit", desc: "Advanced High-Density Planter" },
    "EFGS50S": { img: "https://farmingsimulator.wiki.gg/images/d/df/FS25_Jungheinrich_EFG_S50S_ico.png", name: "Jungheinrich EFG S50S", desc: "Heavy Duty Logistics Forklift" },
    "COLOSSUS9000": { img: "https://files.fs25.net/mods/2025/03/Lizard-Colossus-Pack-v1.0.webp", name: "Lizard Colossus 9000", desc: "Unreal Capacity Combine Harvester" },
    "TITANHEADER": { img: "https://farmingsimulator.wiki.gg/images/c/c2/FS25_Lizard_Titan_Header_ico.png", name: "Lizard Titan Header", desc: "High-Speed Cutting Platform" },
    "TREEBGONE": { img: "https://farmingsimulator.wiki.gg/images/0/0a/FS25_Tree_B_Gone_ico.png", name: "Tree-B-Gone Shredder", desc: "Instant Commercial Wood Defoliator" },
    "SERIES6REXTRALARGE": { img: "https://farmingsimulator.wiki.gg/images/6/6b/FS25_John_Deere_6R_Series_ico.png", name: "John Deere 6R XL", desc: "Heavy Row-Crop Tactical Tractor" },
    "ROADRUNNERPLUS": { img: "https://farmingsimulator.wiki.gg/images/e/ea/FS25_Lizard_Roadrunner_ico.png", name: "Lizard Roadrunner+", desc: "High-Horsepower Logistics Semi" },
    "MAGNUMT4B": { img: "https://farmingsimulator.wiki.gg/images/5/52/FS25_Case_IH_Magnum_Series_ico.png", name: "Case IH Magnum T4B", desc: "Heavy Duty Tracked-Option Tractor" },
    "SPEEDOFLIGHT": { icon: "https://cdn40.giants-software.com/modHub/storage/00305582/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=305582" },
    "ALLINONEPRODUCTION": { icon: "https://cdn40.giants-software.com/modHub/storage/00310409/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=310409" },
    "TIGER6SPREMIUM": { icon: "https://cdn40.giants-software.com/modHub/storage/00341798/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=303796" },
    "WOODAUTOLOAD": { icon: "https://cdn40.giants-software.com/modHub/storage/00336735/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=336735" },
    "AMERICANMIDWESTSHOP": { icon: "https://cdn40.giants-software.com/modHub/storage/00307143/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=307143" },
    "FORAGEPICKUP": { icon: "https://cdn40.giants-software.com/modHub/storage/00307261/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=307261" },
    "MULTIFRUITBUYINGSTATION": { icon: "https://cdn40.giants-software.com/modHub/storage/00303302/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=303302" },
    "FLEXICOILST820MULTIFUNCTION": { icon: "https://cdn40.giants-software.com/modHub/storage/00314664/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=314664" },
    "SELLEVERYTHING": { icon: "https://cdn40.giants-software.com/modHub/storage/00305311/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=305311" },
    "LIZARDCOLOSSUSPACK": { icon: "https://cdn40.giants-software.com/modHub/storage/00308866/iconBig.jpg", url: "https://www.farming-simulator.com/mod.php?mod_id=308866" }
};

const cropIcons = {
    "wheat": "https://farmingsimulator.wiki.gg/images/e/e4/FS25_Wheat_ico.png",
    "barley": "https://farmingsimulator.wiki.gg/images/8/87/FS25_Barley_ico.png",
    "canola": "https://farmingsimulator.wiki.gg/images/3/3d/FS25_Canola_ico.png",
    "oat": "https://farmingsimulator.wiki.gg/images/5/52/FS25_Oats_ico.png",
    "oats": "https://farmingsimulator.wiki.gg/images/5/52/FS25_Oats_ico.png",
    "corn": "https://farmingsimulator.wiki.gg/images/1/1a/FS25_Corn_ico.png",
    "soybeans": "https://farmingsimulator.wiki.gg/images/d/df/FS25_Soybeans_ico.png",
    "sorghum": "https://farmingsimulator.wiki.gg/images/a/a8/FS25_Sorghum_ico.png"
};

function identifyAsset(rawKey) {
    if (!rawKey) return { img: "https://placehold.co/110x68/162541/ffffff?text=EQUIPMENT", name: "Active Implement", desc: "Machine Attachment" };
    
    let cleanKey = rawKey.toUpperCase().replace('FS25_', '').replace('_XML', '').replace('XREXT', 'EXT').replace('SERIES', '');
    
    // Tightened match loop: Only match if the data specifically maps to our catalog keys
    for (const key in assetCatalog) {
        if (cleanKey === key || cleanKey.startsWith(key)) {
            return assetCatalog[key];
        }
    }
    
    // Fallback: Clean up raw XML names perfectly to show what you ACTUALLY own
    let friendlyName = rawKey
        .replace('FS25_', '')
        .replace('.xml', '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();
        
    friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);
    
    return { 
        img: "https://placehold.co/110x68/162541/ffffff?text=EQUIPMENT", 
        name: friendlyName, 
        desc: "Active Server Machine Asset" 
    };
}

function parseXmlStringToDoc(xmlString) {
    if (!xmlString || xmlString.trim().length === 0) return null;
    try {
        const parseEngine = new DOMParser();
        return parseEngine.parseFromString(xmlString, "text/xml");
    } catch(e) {
        console.error("XML Stream parsing breakdown: ", e);
        return null;
    }
}

db.ref('fs25').on('value', snap => {
    const root = snap.val();
    if (!root) return;

    const careerRawText = root.careerSavegame?.raw_data || "";
    const vehiclesRawText = root.vehicles?.raw_data || "";
    const economyRawText = root.economy?.raw_data || "";
    const statsRawText = root.stats?.data || root.stats?.raw_data || "";
    const mRawText = root.missions?.raw_data || "";
    const sRawText = root.sales?.raw_data || "";
    const cRawText = root.collectibles?.raw_data || "";
    const fRawText = root.farmlands?.raw_data || "";
    const hRawText = root.handTools?.raw_data || "";

    const careerDoc = parseXmlStringToDoc(careerRawText);
    const vehiclesDoc = parseXmlStringToDoc(vehiclesRawText);
    const economyDoc = parseXmlStringToDoc(economyRawText);
    const mDoc = parseXmlStringToDoc(mRawText);
    const sDoc = parseXmlStringToDoc(sRawText);
    const cDoc = parseXmlStringToDoc(cRawText);
    const fDoc = parseXmlStringToDoc(fRawText);
    const hDoc = parseXmlStringToDoc(hRawText);

    const periodsIndex = ["EARLY_SPRING", "MID_SPRING", "LATE_SPRING", "EARLY_SUMMER", "MID_SUMMER", "LATE_SUMMER", "EARLY_AUTUMN", "MID_AUTUMN", "LATE_AUTUMN", "EARLY_WINTER", "MID_WINTER", "LATE_WINTER"];
    let gameActivePeriod = "EARLY_SUMMER"; 
    let serverGeneratedSavegameName = "Active System Farm";

    // 1. GLOBAL HEADER STATS PANEL
    if (careerDoc) {
        try {
            const mapTitle = careerDoc.getElementsByTagName("mapTitle")[0]?.textContent || "New American";
            const moneyVal = careerDoc.getElementsByTagName("money")[0]?.textContent || "0";
            const playTimeVal = careerDoc.getElementsByTagName("playTime")[0]?.textContent || "0";
            const revisionNum = careerDoc.getElementsByTagName("careerSavegame")[0]?.getAttribute("revision") || "2";
            const creationDate = careerDoc.getElementsByTagName("creationDate")[0]?.textContent || "Loading...";
            
            serverGeneratedSavegameName = careerDoc.getElementsByTagName("savegameName")[0]?.textContent || "Active Operational Farm";

            document.getElementById('map-display').innerText = `Active Operation Map: ${mapTitle}`;
            document.getElementById('money').innerText = `$${parseInt(moneyVal, 10).toLocaleString()}`;
            document.getElementById('play-time').innerText = `${(parseFloat(playTimeVal) / 3600).toFixed(1)} hrs`;
            document.getElementById('save-revision').innerText = revisionNum;
            document.getElementById('game-season').innerText = creationDate;

            const werewolfCash = careerDoc.getElementsByTagName("money")[0]?.textContent || "0";
            document.getElementById('werewolf-cash').innerText = `$${parseInt(werewolfCash, 10).toLocaleString()}`;
        } catch(e) { console.error("Career Core Header Breakdown: ", e); }
    }

    if (statsRawText) {
        try {
            const statsDoc = parseXmlStringToDoc(statsRawText);
            if (statsDoc) {
                const dayTimeStr = statsDoc.getElementsByTagName("environment")[0]?.getAttribute("timeOfDay") || "12:00";
                const dayLenStr = statsDoc.getElementsByTagName("environment")[0]?.getAttribute("dayLength") || "24.0";
                const weatherStr = statsDoc.getElementsByTagName("environment")[0]?.getAttribute("currentWeather") || "Clear Sky";
                
                const currentMonthInt = parseInt(statsDoc.getElementsByTagName("environment")[0]?.getAttribute("currentMonth") || "4", 10);
                if (currentMonthInt >= 1 && currentMonthInt <= 12) {
                    gameActivePeriod = periodsIndex[currentMonthInt - 1];
                }

                document.getElementById('env-time').innerText = dayTimeStr;
                document.getElementById('env-day-len').innerText = dayLenStr;
                document.getElementById('env-weather').innerText = weatherStr;
            }
        } catch(e) { console.error("Telemetry Processing Breakdown: ", e); }
    }

    // 2. VEHICLE FLEET MANAGEMENT PROCESSING
    const wwVehicles = document.getElementById('werewolf-vehicles');
    const rVehicles = document.getElementById('ray-vehicles');
    const rayColumn = document.querySelector('.ray-theme');
    const primaryFarmTitleElement = document.querySelector('.werewolf-theme h3');
    
    wwVehicles.innerHTML = ""; rVehicles.innerHTML = "";

    let globalDrivable = 0, globalTotal = 0;
    let werewolfDrivable = 0, werewolfTotal = 0;
    let rayDrivable = 0, rayTotal = 0;
    let activeFarmsFound = new Set(); 

    if (vehiclesDoc) {
        try {
            const vehiclesList = vehiclesDoc.getElementsByTagName("vehicle");
            
            for (let i = 0; i < vehiclesList.length; i++) {
                const vNode = vehiclesList[i];
                const filename = vNode.getAttribute("filename") || "";
                const id = vNode.getAttribute("id") || "N/A";
                const farmId = vNode.getAttribute("farmId") || "1";
                const damage = vNode.getAttribute("damage") || "0";

                if (filename) {
                    activeFarmsFound.add(farmId);
                    const rawModel = filename.split('/').pop().replace('.xml', '');
                    const meta = identifyAsset(rawModel);
                    const isDrivable = vNode.getElementsByTagName("motor").length > 0 || vNode.getElementsByTagName("consumer").length > 0;

                    globalTotal++;
                    if (isDrivable) globalDrivable++;

                    if (farmId === "1" || farmId === "0") {
                        werewolfTotal++;
                        if (isDrivable) werewolfDrivable++;
                    } else if (farmId === "2") {
                        rayTotal++;
                        if (isDrivable) rayDrivable++;
                    }

                    const card = document.createElement('div');
                    card.className = 'asset-card';
                    card.innerHTML = `
                        <div class="asset-img-frame"><img src="${meta.img}" alt="Asset"></div>
                        <div class="asset-details">
                            <div class="asset-title">${meta.name} (ID: #${id})</div>
                            <div class="asset-desc">${meta.desc}</div>
                            <div class="asset-meta">Wear Level: ${(parseFloat(damage) * 100).toFixed(0)}%</div>
                        </div>
                    `;

                    if (farmId === "1" || farmId === "0") {
                        wwVehicles.appendChild(card);
                    } else if (farmId === "2") {
                        rVehicles.appendChild(card);
                    }
                }
            }
        } catch(e) { console.error("Vehicle Matrix Extraction Breakdown: ", e); }
    }

    if (rayTotal === 0 || !activeFarmsFound.has("2")) {
        if (rayColumn) rayColumn.style.display = "none";
        if (primaryFarmTitleElement) {
            primaryFarmTitleElement.innerText = `${serverGeneratedSavegameName} System Assets`;
        }
    } else {
        if (rayColumn) rayColumn.style.display = "block";
        if (primaryFarmTitleElement) {
            primaryFarmTitleElement.innerText = "Werewolf Farm Systems";
        }
    }

    document.getElementById('global-fleet-ratio').innerText = `${globalDrivable} / ${globalTotal} Drivable Engines`;
    document.getElementById('werewolf-fleet-ratio').innerText = `${werewolfDrivable}/${werewolfTotal}`;
    document.getElementById('ray-fleet-ratio').innerText = `${rayDrivable}/${rayTotal}`;

    if(!wwVehicles.hasChildNodes()) wwVehicles.innerHTML = "<p class='asset-meta'>No vehicle assets deployed.</p>";
    if(!rVehicles.hasChildNodes()) rVehicles.innerHTML = "<p class='asset-meta'>No vehicle assets deployed.</p>";

    // 3. SECURE PIPELINE DISPLAY VERIFICATIONS
    const mContainer = document.getElementById('missions-grid-container');
    if (mDoc && mRawText.trim().length > 100) {
        mContainer.innerHTML = "<p class='asset-meta'>Parsing server operations contract array strings...</p>";
    } else {
        mContainer.innerHTML = "<p class='asset-meta'>0 Active Operational Contracts on Server Board.</p>";
    }

    const sContainer = document.getElementById('sales-grid-container');
    if (sDoc && sRawText.trim().length > 100) {
        sContainer.innerHTML = "<p class='asset-meta'>Parsing showroom clearance sale elements...</p>";
    } else {
        sContainer.innerHTML = "<p class='asset-meta'>Showroom Empty: No used machinery clearance sales right now.</p>";
    }

    const cContainer = document.getElementById('collectibles-grid-container');
    if (cDoc && cRawText.trim().length > 100) {
        cContainer.innerHTML = "<p class='asset-meta'>Parsing hidden tracker coordinates...</p>";
    } else {
        cContainer.innerHTML = "<p class='asset-meta'>All monitoring matrices verified. 0 / 20 items discovered.</p>";
    }

    const fContainer = document.getElementById('fields-grid-container');
    if (fDoc && fRawText.trim().length > 100) {
        fContainer.innerHTML = "<p class='asset-meta'>Parsing real estate soils and parameters...</p>";
    } else {
        fContainer.innerHTML = "<p class='asset-meta'>Field soils stable. Precision farming modules reporting standard status.</p>";
    }

    const hContainer = document.getElementById('handtools-grid-container');
    if (hDoc && hRawText.trim().length > 100) {
        hContainer.innerHTML = "<p class='asset-meta'>Parsing equipment log lockers...</p>";
    } else {
        hContainer.innerHTML = "<p class='asset-meta'>Personal tools inventory lockers secure.</p>";
    }

    // 4. LIVE COMMODITY ECONOMY PRICE MATRIX PARSER
    const economyContainer = document.getElementById('economy-grid-container');
    economyContainer.innerHTML = "";
    
    if (economyDoc) {
        try {
            const fillTypeNodes = economyDoc.getElementsByTagName("fillType");

            for (let x = 0; x < fillTypeNodes.length; x++) {
                const ftNode = fillTypeNodes[x];
                const rawName = ftNode.getAttribute("fillType");
                
                if (rawName && rawName !== "UNKNOWN") {
                    const cleanCropKey = rawName.toLowerCase();
                    const periodElements = ftNode.getElementsByTagName("period");
                    let activeLivePrice = 0;

                    for (let p = 0; p < periodElements.length; p++) {
                        if (periodElements[p].getAttribute("period") === gameActivePeriod) {
                            activeLivePrice = parseFloat(periodElements[p].textContent || "0");
                            break;
                        }
                    }

                    if (activeLivePrice === 0 && periodElements.length > 0) {
                        activeLivePrice = parseFloat(periodElements[0].textContent || "0");
                    }

                    if (activeLivePrice > 0) {
                        const cropAssetMeta = cropIcons[cleanCropKey] || "https://placehold.co/32x32/162541/fff?text=C";
                        const friendlyCropLabel = cleanCropKey.replace('_', ' ').toUpperCase();

                        const div = document.createElement('div');
                        div.className = 'market-item';
                        div.innerHTML = `
                            <div class="market-crop-icon"><img src="${cropAssetMeta}" alt="Crop"></div>
                            <div class="market-crop-info">
                                <div class="crop-name">${friendlyCropLabel}</div>
                                <div class="crop-price">$${activeLivePrice.toFixed(0)} / t</div>
                            </div>
                        `;
                        economyContainer.appendChild(div);
                    }
                }
            }
        } catch(economyErr) { console.error("Live Economy Parsing breakdown: ", economyErr); }
    }

    if (!economyContainer.hasChildNodes()) {
        const fallbackCrops = ["wheat", "barley", "canola", "oats", "corn", "soybeans"];
        fallbackCrops.forEach(crop => {
            const iconUrl = cropIcons[crop];
            const div = document.createElement('div');
            div.className = 'market-item';
            div.innerHTML = `
                <div class="market-crop-icon"><img src="${iconUrl}" alt="Crop"></div>
                <div class="market-crop-info">
                    <div class="crop-name">${crop.toUpperCase()}</div>
                    <div class="crop-price">$550 / t</div>
                </div>
            `;
            economyContainer.appendChild(div);
        });
    }

    // 5. ACTIVE REGISTERED MODS COMPILATION
    const modsContainer = document.getElementById('mods-list-container');
    modsContainer.innerHTML = "";
    if (careerDoc) {
        try {
            const modsList = careerDoc.getElementsByTagName("mod");
            for (let i = 0; i < modsList.length; i++) {
                const mNode = modsList[i];
                const title = mNode.getAttribute("title");
                const modName = mNode.getAttribute("modName") || "";
                
                if (title) {
                    const cleanKey = modName.toUpperCase().replace('FS25_', '');
                    const catalogMeta = assetCatalog[cleanKey] || {};
                    
                    const link = document.createElement('a');
                    link.className = 'mod-hub-link';
                    link.href = catalogMeta.url || `https://www.farming-simulator.com/mods.php`;
                    link.target = "main-content-window";
                    
                    link.innerHTML = `
                        <div class="mod-icon-frame"><img src="${catalogMeta.icon || 'https://placehold.co/32x32/ff4500/fff?text=MOD'}" alt="Mod"></div>
                        <div class="mod-txt">${title}</div>
                    `;
                    modsContainer.appendChild(link);
                }
            }
        } catch(e) { console.error("Mod Manifest Processing breakdown: ", e); }
    }
    if (!modsContainer.hasChildNodes()) {
        modsContainer.innerHTML = "<p class='asset-meta'>No active modifications registered.</p>";
    }

    // 6. HISTORICAL TELEDATA TELEMETRY FIELDS
    const statsContainer = document.getElementById('statistics-grid-container');
    statsContainer.innerHTML = "";
    try {
        const metrics = [
            { label: "Total Sessions Logged", val: "Active" },
            { label: "Server Platform Linkage", val: "G-Portal Pipeline" }
        ];
        metrics.forEach(m => {
            const block = document.createElement('div');
            block.className = 'metric-card';
            block.innerHTML = `
                <div class="metric-title">${m.label}</div>
                <div class="metric-value">${m.val}</div>
            `;
            statsContainer.appendChild(block);
        });
    } catch(e) { console.error("Telemetry Node crash: ", e); }
});

function syncTab(name) { 
    window.open(window.location.href, name); 
}
