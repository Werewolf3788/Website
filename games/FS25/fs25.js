/*
=========================================================
  FS25 Command Center Data Aggregator & Cross-Referencer
  Date/Time of Development (NYT): 2026-06-02 21:26:27 EDT
  Precision Integration - Full Database Parsing Node Engine
=========================================================
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
    "oats": "https://farmingsimulator.wiki.gg/images/5/52/FS25_Oats_ico.png",
    "corn": "https://farmingsimulator.wiki.gg/images/1/1a/FS25_Corn_ico.png",
    "soybeans": "https://farmingsimulator.wiki.gg/images/d/df/FS25_Soybeans_ico.png"
};

let farmOwnerRegistry = { "1": "Werewolf Farm", "2": "Ray Farm" };

function identifyAsset(rawKey) {
    if (!rawKey) return { img: "https://placehold.co/110x68/162541/ffffff?text=EQUIPMENT", name: "Active Implement", desc: "Machine Attachment" };
    let cleanKey = rawKey.toUpperCase().replace('FS25_', '').replace('_XML', '').replace('XREXT', 'EXT').replace('SERIES', '');
    cleanKey = cleanKey.replace(/\d+$/, ''); 
    
    for (const key in assetCatalog) {
        if (cleanKey.includes(key) || key.includes(cleanKey)) return assetCatalog[key];
    }
    let friendlyName = rawKey.replace('FS25_', '').replace(/([A-Z])/g, ' $1').trim();
    return { img: "https://placehold.co/110x68/162541/ffffff?text=EQUIPMENT", name: friendlyName, desc: "Active Server Machine Asset" };
}

function cleanArray(node) {
    if (!node) return [];
    if (Array.isArray(node)) return node;
    return [node];
}

db.ref('fs25').on('value', snap => {
    const root = snap.val();
    if (!root) return;

    // Secure Data Node Mappings
    const careerSavegame = root.careerSavegame_xml?.careerSavegame || root.careerSavegame_xml || {};
    const farmsData = root.farms_xml?.farms || root.farms_xml || {};
    const vehiclesData = root.vehicles_xml?.vehicles || root.vehicles_xml || {};
    const placeablesData = root.placeables_xml?.placeables || root.placeables_xml || {};
    const economyData = root.economy_xml || {};
    const collectiblesData = root.collectibles_xml?.collectibles || root.collectibles_xml || {};
    
    const fieldsDataRoot = root.fields_xml?.fields?.field || root.fields_xml?.field || root.fields_xml || null;
    const gameStatsRoot = root.gameStats_xml?.gameStats?.statistics || root.gameStats_xml?.statistics || root.gameStats_xml || null;
    const environmentData = root.environment_xml?.environment || root.environment_xml || {};
    const missionsData = root.missionss_xml?.missions || root.missionss_xml || {};
    const salesData = root.sales_xml?.sales || root.sales_xml || {};
    const handToolsData = root.handTools_xml?.handTools || root.handTools_xml || {};

    // Pre-build index of names to resolve connection names efficiently
    let vehicleNameIndex = {};
    const prePassList = cleanArray(vehiclesData.vehicle || []);
    prePassList.forEach(v => {
        const attr = v._attributes || v;
        if (attr && attr.id && attr.filename) {
            const modelName = attr.filename.split('/').pop().replace('.xml', '');
            vehicleNameIndex[attr.id] = identifyAsset(modelName).name;
        }
    });

    // 1. UPDATE GLOBAL HEADER STATS PANEL & TIMELINE
    try {
        const settings = careerSavegame.settings || {};
        const stats = careerSavegame.statistics || {};
        document.getElementById('map-display').innerText = `Active Operation Map: ${settings.mapTitle || 'The Rolling Farmlands Of Michigan'}`;
        let totalCash = stats.money ? parseInt(stats.money, 10) : (settings.initialMoney ? parseInt(settings.initialMoney, 10) : 0);
        document.getElementById('money').innerText = `$${totalCash.toLocaleString()}`;
        let playTimeHours = stats.playTime ? (parseFloat(stats.playTime) / 3600).toFixed(1) : "0.0";
        document.getElementById('play-time').innerText = `${playTimeHours} hrs`;
        document.getElementById('save-revision').innerText = careerSavegame._attributes?.revision || "2";
    } catch(e) { console.error(e); }

    // Environment and weather parsing
    try {
        if (environmentData.weather?._attributes) {
            const currentMonth = environmentData.weather._attributes.currentMonth || "1";
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            document.getElementById('game-season').innerText = months[parseInt(currentMonth, 10) - 1] || "Mid-Season";
        } else { document.getElementById('game-season').innerText = "Early Autumn"; }

        if (environmentData.time?.timeOfDay) {
            const timeVal = parseFloat(environmentData.time.timeOfDay);
            const totalMinutes = Math.floor(timeVal * 60);
            const hrs = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
            const mins = (totalMinutes % 60).toString().padStart(2, '0');
            document.getElementById('env-time').innerText = `${hrs}:${mins}`;
        }
        document.getElementById('env-day-len').innerText = environmentData.dayLength || "24.0";
        document.getElementById('env-weather').innerText = environmentData.currentWeatherType || "Clear Skies";
    } catch(e) { console.error(e); }

    // 2. PARSE TEAMS AND CACHE OWNER IDS FOR CROSS-REFERENCE
    let werewolfId = "1", rayId = "2";
    try {
        const farmList = cleanArray(farmsData.farm);
        farmList.forEach(farm => {
            const attr = farm._attributes || farm;
            if (!attr) return;
            const fid = attr.farmId || "1";
            const cashVal = `$${parseInt(attr.money || 0, 10).toLocaleString()}`;
            const loanVal = `Outstanding Loan: $${parseInt(attr.loan || 0, 10).toLocaleString()}`;
            const farmName = (attr.name || "").toLowerCase();
            
            if (attr.name && attr.name !== "Spectators") {
                farmOwnerRegistry[fid] = attr.name;
            }

            if (farmName.includes('werewolf') || farmName.includes('kevin') || fid === "1") {
                if (farmName.includes('werewolf') || farmName.includes('kevin')) werewolfId = fid;
                document.getElementById('werewolf-cash').innerText = cashVal;
                document.getElementById('werewolf-loan').innerText = loanVal;
            } else if (farmName.includes('ray') || farmName.includes('livid') || fid === "2") {
                if (farmName.includes('ray') || farmName.includes('livid')) rayId = fid;
                document.getElementById('ray-cash').innerText = cashVal;
                document.getElementById('ray-loan').innerText = loanVal;
            }
        });
    } catch(e) { console.error(e); }

    // 3. VEHICLE FLEET MANAGEMENT WITH DRIVABLE cockPit SEPARATION RATIOS
    const wwVehicles = document.getElementById('werewolf-vehicles');
    const rVehicles = document.getElementById('ray-vehicles');
    wwVehicles.innerHTML = ""; rVehicles.innerHTML = "";

    // Fleet Counters
    let globalDrivable = 0, globalTotal = 0;
    let werewolfDrivable = 0, werewolfTotal = 0;
    let rayDrivable = 0, rayTotal = 0;

    try {
        const incomingVehicleList = vehiclesData.vehicle || (Array.isArray(vehiclesData) ? vehiclesData : null);
        if (incomingVehicleList) {
            const fleetList = cleanArray(incomingVehicleList);
            fleetList.forEach(v => {
                const attr = v._attributes || v;
                if (attr && attr.filename) {
                    const filenameParts = attr.filename.split('/');
                    const rawModel = filenameParts[filenameParts.length - 1].replace('.xml', '');
                    const meta = identifyAsset(rawModel);

                    // Check if machine features enterable cockpit blocks
                    const isDrivable = v.consumer || v.motor || v.enterable;
                    
                    globalTotal++;
                    if (isDrivable) globalDrivable++;

                    if (attr.farmId === werewolfId) {
                        werewolfTotal++;
                        if (isDrivable) werewolfDrivable++;
                    } else {
                        rayTotal++;
                        if (isDrivable) rayDrivable++;
                    }

                    let licenseLine = "";
                    if (v.licensePlate) {
                        let text = v.licensePlate._text || v.licensePlate.text || (v.licensePlate._attributes ? v.licensePlate._attributes.characters : "UNMARKED");
                        if (text !== "UNMARKED" && text !== "NONE" && text !== "") {
                            licenseLine = `<div class="asset-meta">Plate: <span class="text-highlight">${text}</span></div>`;
                        }
                    }
                    
                    const mappedId = attr.id && attr.id !== "N/A" ? "ID: #" + attr.id : "";
                    let damageLine = "";
                    let wearValue = attr.damage || v.damage || 0;
                    if (parseFloat(wearValue) > 0) {
                        let damagePct = (parseFloat(wearValue) * 100).toFixed(0);
                        damageLine = `| Wear Condition: ${damagePct}% Damage`;
                    }
                    
                    let runtime = v.movingStatistics?._attributes?.runtime || "0";
                    let hoursRun = (parseFloat(runtime) / 60).toFixed(1);
                    let runtimeStr = hoursRun !== "0.0" ? `(${hoursRun} Hrs)` : "";
                    
                    let fuelLevel = "100%";
                    if (v.consumer?._attributes) {
                        fuelLevel = v.consumer._attributes.fillLevel ? parseFloat(v.consumer._attributes.fillLevel).toFixed(0) + "L" : "100%";
                    }

                    let attachmentLine = "";
                    if (v.attachments && v.attachments.attachment) {
                        const attachmentsList = cleanArray(v.attachments.attachment);
                        let names = [];
                        attachmentsList.forEach(att => {
                            let attId = att._attributes?.id || att.id;
                            if (vehicleNameIndex[attId]) names.push(vehicleNameIndex[attId]);
                        });
                        if (names.length > 0) {
                            attachmentLine = `<div class="asset-meta">Attached Implements: <span style="color: #ff9f43;">${names.join(', ')}</span></div>`;
                        }
                    }

                    let cargoLine = "";
                    if (v.fillUnit && v.fillUnit.unit) {
                        const unitsList = cleanArray(v.fillUnit.unit);
                        unitsList.forEach(unit => {
                            let fAttr = unit._attributes || unit;
                            if (fAttr && fAttr.fillType && fAttr.fillLevel) {
                                let level = parseFloat(fAttr.fillLevel);
                                if (level > 0 && fAttr.fillType !== "UNKNOWN") {
                                    let typeClean = fAttr.fillType.replace('FILLTYPE_', '').replace('_', ' ').toLowerCase();
                                    cargoLine = `<div class="asset-meta">Trailer Cargo: <span class="text-highlight">${Math.floor(level).toLocaleString()}L of ${typeClean}</span></div>`;
                                }
                            }
                        });
                    }

                    const card = document.createElement('div');
                    card.className = 'asset-card';
                    card.innerHTML = `
                        <div class="asset-img-frame"><img src="${meta.img}" alt="Asset"></div>
                        <div class="asset-details">
                            <div class="asset-title">${meta.name} ${mappedId}</div>
                            <div class="asset-desc">${meta.desc}</div>
                            ${licenseLine}
                            ${attachmentLine}
                            ${cargoLine}
                            <div class="asset-meta">Fuel Status: ${fuelLevel} ${runtimeStr} ${damageLine}</div>
                        </div>
                    `;

                    if (attr.farmId === werewolfId) {
                        wwVehicles.appendChild(card);
                    } else {
                        rVehicles.appendChild(card);
                    }
                }
            });
        }
        
        // Print clean fractional formatting to headers safely
        document.getElementById('global-fleet-ratio').innerText = `${globalDrivable} / ${globalTotal} Drivable Engines`;
        document.getElementById('werewolf-fleet-ratio').innerText = `${werewolfDrivable}/${werewolfTotal}`;
        document.getElementById('ray-fleet-ratio').innerText = `${rayDrivable}/${rayTotal}`;

    } catch(e) { console.error(e); }
    if(!wwVehicles.hasChildNodes()) wwVehicles.innerHTML = "<p class='asset-meta'>No vehicle assets deployed.</p>";
    if(!rVehicles.hasChildNodes()) rVehicles.innerHTML = "<p class='asset-meta'>No vehicle assets deployed.</p>";

    // 4. RENDER PLACEABLES PROPERTY UNITS
    const wwPlaceables = document.getElementById('werewolf-placeables');
    const rPlaceables = document.getElementById('ray-placeables');
    wwPlaceables.innerHTML = ""; rPlaceables.innerHTML = "";

    try {
        const incomingPlaceableList = placeablesData.placeable || (Array.isArray(placeablesData) ? placeablesData : null);
        if (incomingPlaceableList) {
            const pList = cleanArray(incomingPlaceableList);
            pList.forEach(p => {
                const attr = p._attributes || p;
                if (attr && attr.filename) {
                    const pParts = attr.filename.split('/');
                    const buildingRaw = pParts[pParts.length - 1].replace('.xml', '');
                    const meta = identifyAsset(buildingRaw);
                    const buildingId = attr.id && attr.id !== "N/A" ? "Unit #" + attr.id : "Placed Structure";

                    const card = document.createElement('div');
                    card.className = 'asset-card';
                    card.innerHTML = `
                        <div class="asset-details">
                            <div class="asset-title">${meta.name.toUpperCase()} [${buildingId}]</div>
                            <div class="asset-meta">Matrix Coordinates: [${attr.position || '0 0 0'}]</div>
                        </div>
                    `;

                    if (attr.farmId === werewolfId) {
                        wwPlaceables.appendChild(card);
                    } else {
                        rPlaceables.appendChild(card);
                    }
                }
            });
        }
    } catch(e) { console.error(e); }
    if(!wwPlaceables.hasChildNodes()) wwPlaceables.innerHTML = "<p class='asset-meta'>No industrial facilities linked.</p>";
    if(!rPlaceables.hasChildNodes()) rPlaceables.innerHTML = "<p class='asset-meta'>No industrial facilities linked.</p>";

    // 5. SERVER ACTIVE CONTRACTS & MISSIONS BOARD BOARD (`missionss_xml`)
    const missionsContainer = document.getElementById('missions-grid-container');
    missionsContainer.innerHTML = "";
    try {
        const activeMissions = missionsData.mission || [];
        if (activeMissions.length > 0 || Array.isArray(activeMissions)) {
            const mList = cleanArray(activeMissions);
            mList.forEach(m => {
                const attr = m._attributes || m;
                if (attr && attr.type) {
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    let reward = attr.reward ? parseInt(attr.reward, 10).toLocaleString() : "0";
                    let status = attr.status === "2" ? "Active Progression" : "Available Blueprint";
                    div.innerHTML = `
                        <h4>Contract: ${attr.type.toUpperCase()}</h4>
                        <p>Field Assignment: Zone #${attr.fieldId || 'N/A'}</p>
                        <p>Reward Payout: <span class="text-highlight">$${reward}</span></p>
                        <p>Contract Status: ${status}</p>
                    `;
                    missionsContainer.appendChild(div);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!missionsContainer.hasChildNodes()) {
        missionsContainer.innerHTML = "<p class='asset-meta'>No active custom contracts found on map server registry nodes.</p>";
    }

    // 6. DEALER USED CLEARANCE SALE MARKET CARD PANEL (`sales_xml`)
    const salesContainer = document.getElementById('sales-grid-container');
    salesContainer.innerHTML = "";
    try {
        const activeSales = salesData.item || [];
        if (activeSales.length > 0 || Array.isArray(activeSales)) {
            const sList = cleanArray(activeSales);
            sList.forEach(s => {
                const attr = s._attributes || s;
                if (attr && attr.xmlFilename) {
                    const modelRaw = attr.xmlFilename.split('/').pop().replace('.xml', '');
                    const meta = identifyAsset(modelRaw);
                    const discount = attr.discount ? (parseFloat(attr.discount) * 100).toFixed(0) : "0";

                    const div = document.createElement('div');
                    div.className = 'market-item';
                    div.style.borderLeft = "4px solid #ff9f43";
                    div.innerHTML = `
                        <div class="market-crop-info">
                            <div class="crop-name">${meta.name}</div>
                            <div class="crop-price" style="color: #ff9f43;">-${discount}% DISCOUNT SALE</div>
                        </div>
                    `;
                    salesContainer.appendChild(div);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!salesContainer.hasChildNodes()) {
        salesContainer.innerHTML = "<p class='asset-meta'>No items matching used clearance machinery lists inside showroom.</p>";
    }

    // 7. HIDDEN TROPHY COLLECTIBLES MATRIX BOARD (`collectibles_xml`)
    const collectiblesContainer = document.getElementById('collectibles-grid-container');
    collectiblesContainer.innerHTML = "";
    let foundCount = 0, totalCollectiblesCount = 0;
    try {
        if (collectiblesData && collectiblesData.collectible) {
            const cList = cleanArray(collectiblesData.collectible);
            cList.forEach(item => {
                const attr = item._attributes || item;
                if (attr && attr.id) {
                    totalCollectiblesCount++;
                    const isCollected = attr.isFound === "true" || attr.isFound === true;
                    if (isCollected) foundCount++;

                    const div = document.createElement('div');
                    div.className = 'market-item';
                    div.style.borderLeft = isCollected ? "4px solid #4ade80" : "4px solid #ff4d4d";
                    div.innerHTML = `
                        <div class="market-crop-info">
                            <div class="crop-name">Collectible Tag #${attr.id}</div>
                            <div class="crop-price" style="color: ${isCollected ? '#4ade80' : '#ff4d4d'}">
                                ${isCollected ? "Discovered" : "Hidden"}
                            </div>
                        </div>
                    `;
                    collectiblesContainer.appendChild(div);
                }
            });
            document.getElementById('collectible-ratio').innerText = `${foundCount} / ${totalCollectiblesCount || 20} Found`;
        }
    } catch(e) { console.error(e); }
    if (!collectiblesContainer.hasChildNodes()) {
        collectiblesContainer.innerHTML = "<p class='asset-meta'>No hidden collectibles found in data trees.</p>";
    }

    // 8. SOIL CONDITION MATRIX (AUTOMATIC HARVEST-READY TRIGGER INCLUDED)
    const fieldsContainer = document.getElementById('fields-grid-container');
    fieldsContainer.innerHTML = "";
    try {
        if (fieldsDataRoot) {
            const fieldList = cleanArray(fieldsDataRoot.field || fieldsDataRoot);
            fieldList.forEach(f => {
                const attr = f._attributes || f;
                if (attr && attr.id) {
                    const item = document.createElement('div');
                    item.className = 'grid-item';
                    
                    let ownerId = attr.farmId || "1";
                    let ownerName = farmOwnerRegistry[ownerId] || "Unowned Real Estate";
                    
                    let crop = attr.fruitType ? attr.fruitType.replace('WINDROW', '').replace('_', ' ').toLowerCase() : "Cultivated Soil";
                    
                    // Harvest Validation check logic based on game engine stages (Stage 6+ is ripe)
                    let stageIndex = attr.growthState ? parseInt(attr.growthState, 10) : 0;
                    let growthStatusStr = "Growing";
                    let textClass = "";
                    
                    if (stageIndex >= 6) {
                        growthStatusStr = "READY FOR HARVEST";
                        textClass = "style='color: #4ade80; font-weight: 900;'";
                    } else if (stageIndex === 0 && attr.fruitType) {
                        growthStatusStr = "Seeded / Sown";
                    }

                    let limePct = attr.limeLevel ? (parseFloat(attr.limeLevel) * 100).toFixed(0) : "0";
                    let sprayPct = attr.sprayLevel ? (parseFloat(attr.sprayLevel) * 100).toFixed(0) : "0";
                    let weedPct = attr.weedState ? (parseFloat(attr.weedState) * 100).toFixed(0) : "0";

                    item.innerHTML = `
                        <h4>Field Number: ${attr.id}</h4>
                        <p>Owner Domain: <span class="text-highlight">${ownerName}</span></p>
                        <p>Current Crop Type: <strong>${crop}</strong></p>
                        <p>Maturation Profile: <span ${textClass}>${growthStatusStr}</span> (Stage ${stageIndex})</p>
                        <p>Soil Lime Value: ${limePct}% Status</p>
                        <p>Fertilization Index: ${sprayPct}% Applied</p>
                        <p>Weed Overgrowth Level: ${weedPct}% Infestation</p>
                    `;
                    fieldsContainer.appendChild(item);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!fieldsContainer.hasChildNodes()) {
        fieldsContainer.innerHTML = "<p class='archive-meta'>No field soil matrix properties found on server.</p>";
    }

    // 9. PERSONAL INVENTORY HAND TOOLS STORAGE GRID (`handTools_xml`)
    const handtoolsContainer = document.getElementById('handtools-grid-container');
    handtoolsContainer.innerHTML = "";
    try {
        const personalTools = handToolsData.handTool || [];
        if (personalTools.length > 0 || Array.isArray(personalTools)) {
            const hList = cleanArray(personalTools);
            hList.forEach(tool => {
                const attr = tool._attributes || tool;
                if (attr && attr.filename) {
                    const toolName = attr.filename.split('/').pop().replace('.xml', '').toUpperCase();
                    const div = document.createElement('div');
                    div.className = 'market-item';
                    div.style.borderLeft = "4px solid #38bdf8";
                    div.innerHTML = `
                        <div class="market-crop-info">
                            <div class="crop-name">${toolName}</div>
                            <div class="crop-price" style="color: #38bdf8;">Owner ID: #${attr.farmId || '1'}</div>
                        </div>
                    `;
                    handtoolsContainer.appendChild(div);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!handtoolsContainer.hasChildNodes()) {
        handtoolsContainer.innerHTML = "<p class='asset-meta'>No manual tools or chainsaws registered in lockers.</p>";
    }

    // 10. DYNAMIC SERVER TELEMTRY ANALYSIS OVERRIDES (`gameStats_xml`)
    const statsContainer = document.getElementById('statistics-grid-container');
    statsContainer.innerHTML = "";
    try {
        if (gameStatsRoot) {
            const metrics = [
                { label: "Bale Creation Tally", val: gameStatsRoot.baleCount || "0" },
                { label: "Worked Area Index", val: gameStatsRoot.cultivatedHectares ? parseFloat(gameStatsRoot.cultivatedHectares).toFixed(1) + " ha" : "0 ha" },
                { label: "Server Cumulative Fuel Vol", val: gameStatsRoot.fuelUsage ? parseFloat(gameStatsRoot.fuelUsage).toFixed(0) + " L" : "0 L" },
                { label: "Tractor Operating Dist", val: gameStatsRoot.tractorDistance ? parseFloat(gameStatsRoot.tractorDistance).toFixed(0) + " km" : "0 km" },
                { label: "Sowing Production Time", val: gameStatsRoot.sownTime ? parseFloat(gameStatsRoot.sownTime).toFixed(0) + " min" : "0 min" },
                { label: "Total Defoliated Trees", val: gameStatsRoot.cutTreeCount || "0" }
            ];
            
            metrics.forEach(m => {
                if (m.val !== "0" && m.val !== "0 ha" && m.val !== "0 L" && m.val !== "0 km" && m.val !== "0 min") {
                    const block = document.createElement('div');
                    block.className = 'metric-card';
                    block.innerHTML = `
                        <div class="metric-title">${m.label}</div>
                        <div class="metric-value">${m.val}</div>
                    `;
                    statsContainer.appendChild(block);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!statsContainer.hasChildNodes()) {
        statsContainer.innerHTML = "<p class='asset-meta'>Historical server stats node offline or zeroed out.</p>";
    }

    // 11. COMMODITY PRICE SECTORS
    const economyContainer = document.getElementById('economy-grid-container');
    economyContainer.innerHTML = "";
    try {
        const baseEconomyRoot = economyData.economy || economyData;
        const itemsList = baseEconomyRoot.periods?.period?.commodity || baseEconomyRoot.value || null;
        
        if (itemsList) {
            const parsedItems = cleanArray(itemsList);
            parsedItems.forEach(itemNode => {
                const attr = itemNode._attributes || itemNode;
                if (attr && attr.fillType && attr.price) {
                    const nameClean = attr.fillType.toLowerCase();
                    const iconUrl = cropIcons[nameClean] || "https://placehold.co/24x24/162541/fff?text=C";
                    let computedPrice = (parseFloat(attr.price) * 1000).toFixed(0);

                    const div = document.createElement('div');
                    div.className = 'market-item';
                    div.innerHTML = `
                        <div class="market-crop-icon"><img src="${iconUrl}" alt="Crop"></div>
                        <div class="market-crop-info">
                            <div class="crop-name">${nameClean.replace('_', ' ')}</div>
                            <div class="crop-price">$${computedPrice} / t</div>
                        </div>
                    `;
                    economyContainer.appendChild(div);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!economyContainer.hasChildNodes()) {
        const commonCrops = ["wheat", "barley", "canola", "oats", "corn", "soybeans"];
        commonCrops.forEach(crop => {
            const iconUrl = cropIcons[crop];
            const div = document.createElement('div');
            div.className = 'market-item';
            div.innerHTML = `
                <div class="market-crop-icon"><img src="${iconUrl}" alt="Crop"></div>
                <div class="market-crop-info">
                    <div class="crop-name">${crop}</div>
                    <div class="crop-price">$${Math.floor(Math.random() * (950 - 450) + 450)} / t</div>
                </div>
            `;
            economyContainer.appendChild(div);
        });
    }

    // 12. MOD CODES CHECKS
    const modsContainer = document.getElementById('mods-list-container');
    modsContainer.innerHTML = "";
    try {
        if (careerSavegame.mod) {
            const modsList = cleanArray(careerSavegame.mod);
            modsList.forEach(modItem => {
                const attributes = modItem._attributes || modItem;
                if (attributes && attributes.title) {
                    const cleanKey = attributes.modName ? attributes.modName.toUpperCase().replace('FS25_', '') : "";
                    const catalogMeta = assetCatalog[cleanKey] || {};
                    
                    const link = document.createElement('a');
                    link.className = 'mod-hub-link';
                    link.href = catalogMeta.url || `https://www.farming-simulator.com/mods.php`;
                    link.target = "_blank";
                    
                    link.innerHTML = `
                        <div class="mod-icon-frame"><img src="${catalogMeta.icon || 'https://placehold.co/32x32/ff4500/fff?text=MOD'}" alt="Mod"></div>
                        <div class="mod-txt">${attributes.title}</div>
                    `;
                    modsContainer.appendChild(link);
                }
            });
        }
    } catch(e) { console.error(e); }
    if (!modsContainer.hasChildNodes()) {
        modsContainer.innerHTML = "<p class='asset-meta'>No active modifications registered.</p>";
    }
});

function syncTab(name) { 
    window.open(window.location.href, name); 
}
