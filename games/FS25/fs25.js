/* ============================================================================
 * File: games/FS25/app.js
 * Deployment Timestamp: 2026-09-25 01:41:40 (EDT - 24hr New York Time)
 * Context / Scope: Complete Modular Firebase RTDB Client & UI Synchronization Engine.
 *                  - Reconnects to //fs25-a3563-default-rtdb.firebaseio.com/fs25.
 *                  - Listens directly to activeSaveSlot and switches to active slot node.
 *                  - Converts lastGportalSync to Eastern (New York) 12-hour/24-hour time.
 *                  - Converts in-game dayTime to human-readable clock time (AM/PM).
 *                  - Binds console slot usage (slotSystem.slotUsage) for join visibility.
 *                  - Maps pre-sorted farm1 & farm2 collections (tractors, harvesters,
 *                    trailers, implements) with live total count badges on card headers.
 *                  - Safe DOMContentLoaded wrapping, null checks, and error trapping.
 * ============================================================================ */

// Line 16: Modular Firebase SDK Imports using relative protocol
import { initializeApp } from "//www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "//www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getDatabase, ref, onValue } from "//www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Line 21: Client Database Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwhhUNH0itRb2hQcnSap_vGfnErAGVzZc",
    authDomain: "fs25-a3563.firebaseapp.com",
    databaseURL: "https://fs25-a3563-default-rtdb.firebaseio.com",
    projectId: "fs25-a3563",
    storageBucket: "fs25-a3563.firebasestorage.app",
    messagingSenderId: "528331196894",
    appId: "1:528331196894:web:5af51bc2c80fd56aecf54f",
    measurementId: "G-SGJF0FJPQZ"
};

// Line 34: Safe app initialization with analytics blocker trap
const app = initializeApp(firebaseConfig);
let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (analyticsErr) {
    console.warn("⚠️ Warning: Analytics tracking suppressed by client blocker:", analyticsErr.message);
}
const db = getDatabase(app);

// Line 44: External UTM navigation endpoint
const UTM_LINKS_URL = "//entertainment-71888-default-rtdb.firebaseio.com/utm_links.json";

// Line 47: In-game calendar months array
const FS_MONTHS = [
    "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December", "January", "February"
];

let cachedMods = {};

// ============================================================================
// SECTION 1: DATA NORMALIZERS, SANITIZERS & TIME CONVERTERS
// ============================================================================

// Line 58: Array normalizer preventing .map() / .forEach() crashes
function toArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [];
}

// Line 66: Currency formatter helper
function formatMoney(amount) {
    return '$' + Math.round(Number(amount) || 0).toLocaleString('en-US');
}

// Line 71: Stoplight meter color calculations
function getStoplightColor(pct) {
    if (pct <= 35) return '#ef4444';
    if (pct <= 74) return '#f59e0b';
    return '#10b981';
}

// Line 78: Converts internal XML filenames to clean human-readable model names
function cleanName(raw) {
    if (!raw) return "Equipment";
    const parts = String(raw).replace(/\\/g, '/').split('/').filter(Boolean);
    const filename = parts.pop() || "Equipment";
    return filename
        .replace(/\.xml$/i, '')
        .replace(/^fs25[_\-\s]*/i, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Line 94: Cleans fill types and fruit titles
function cleanFillName(raw) {
    if (!raw) return "Cargo";
    return cleanName(raw).replace(/^(Filltype|Fruit|Fruit Type)\s*/i, '');
}

// Line 100: Converts UTC / ISO timestamp directly to New York / Eastern Time
function formatNewYorkTime(isoString) {
    if (!isoString) return "--:-- --";
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString("en-US", {
            timeZone: "America/New_York",
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }) + " (EDT)";
    } catch (e) {
        return String(isoString);
    }
}

// Line 117: Converts in-game raw fractional dayTime minutes (0 to 1440) to standard 12hr clock time
function formatInGameClock(rawDayTime) {
    if (rawDayTime === null || rawDayTime === undefined || isNaN(rawDayTime)) return "12:00 PM";
    const totalMins = Math.floor(parseFloat(rawDayTime)) % 1440;
    const hours24 = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const padM = String(mins).padStart(2, '0');
    return `${hours12}:${padM} ${ampm}`;
}

// Line 129: Resolves in-game calendar season, month and days per period
function resolveCalendarInfo(envNode, careerNode, statsDayTime) {
    try {
        const env = envNode && (envNode.environment || envNode);
        const career = careerNode && (careerNode.careerSavegame || careerNode);

        let dayTimeVal = statsDayTime;
        if (dayTimeVal === null || dayTimeVal === undefined) {
            dayTimeVal = env ? env.dayTime : (career ? career.dayTime : null);
        }

        const clockStr = formatInGameClock(dayTimeVal);
        const daysPerPeriod = parseInt((env && env.daysPerPeriod) || (career && career.settings && career.settings.plannedDaysPerPeriod) || 1, 10);
        const currentDay = parseInt((env && (env.currentDay || env.currentMonotonicDay)) || 1, 10);

        let monthIndex = Math.floor((currentDay - 1) / Math.max(1, daysPerPeriod)) % 12;
        if (monthIndex < 0 || monthIndex >= 12) monthIndex = 0;
        const dayInMonth = ((currentDay - 1) % daysPerPeriod) + 1;
        const monthName = FS_MONTHS[monthIndex];

        let seasonName = "Spring";
        if (monthIndex >= 3 && monthIndex <= 5) seasonName = "Summer";
        else if (monthIndex >= 6 && monthIndex <= 8) seasonName = "Autumn";
        else if (monthIndex >= 9 && monthIndex <= 11) seasonName = "Winter";

        return {
            clock: clockStr,
            month: monthName,
            dayInMonth: dayInMonth,
            season: seasonName,
            formatted: `${monthName} (Day ${dayInMonth}) - ${clockStr}`
        };
    } catch (err) {
        console.warn("⚠️ Warning: Calendar resolution fallback used:", err.message);
        return {
            clock: "12:00 PM",
            month: "March",
            dayInMonth: 1,
            season: "Spring",
            formatted: "March (Day 1) - 12:00 PM"
        };
    }
}

// Line 173: Dismisses active lightbox modal
function closeActiveLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.remove('active');
}

// ============================================================================
// SECTION 2: NAVIGATION MENU BUILDER (/utm_links)
// ============================================================================
// Line 181: Dynamically loads the navigation bar links
async function loadNavigationMenu() {
    const nav = document.getElementById('dynamic-menu');
    if (!nav) return;

    try {
        const res = await fetch(`${UTM_LINKS_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || typeof data !== 'object') return;

        const DESIRED_ORDER = ['home', 'users', 'game', 'other', 'entertainment'];
        const rootFolders = {};

        Object.keys(data).forEach(k => {
            rootFolders[k.toLowerCase()] = { title: k, records: data[k] };
        });

        const ordered = [];
        DESIRED_ORDER.forEach(k => {
            if (rootFolders[k]) {
                ordered.push(rootFolders[k]);
                delete rootFolders[k];
            }
        });
        Object.values(rootFolders).forEach(f => ordered.push(f));

        let html = '';
        ordered.forEach(folder => {
            const links = [];
            const list = toArray(folder.records);

            list.forEach(item => {
                if (item && typeof item === 'object') {
                    const url = item.url || item.link || item.href;
                    if (url && typeof url === 'string') {
                        links.push({
                            title: item.title || item.name || "Link",
                            url: url,
                            img: item.image || item.thumb || null
                        });
                    }
                }
            });

            if (folder.title.toLowerCase() === 'home' && links.length <= 1) {
                const h = links[0] || { title: 'Home', url: '//werewolf3788.github.io/Website/' };
                html += `
                    <a href="${h.url}" class="dropdown-trigger-btn">
                        <i class="fa-solid fa-house" style="color:var(--accent-gold);"></i> <span>${h.title}</span>
                    </a>
                `;
            } else if (links.length > 0) {
                html += `
                    <div class="nav-dropdown-wrapper">
                        <button type="button" class="dropdown-trigger-btn">
                            <i class="fa-solid fa-folder" style="color:var(--accent-gold);"></i> <span>${folder.title}</span> <i class="fa-solid fa-chevron-down arrow-icon"></i>
                        </button>
                        <div class="dropdown-popout-menu">
                            ${links.map(l => `
                                <a href="${l.url}" class="dropdown-item">
                                    ${l.img ? `<img src="${l.img}" style="width:18px; height:18px; border-radius:3px; object-fit:cover;">` : '<i class="fa-solid fa-arrow-up-right-from-square"></i>'}
                                    <span>${l.title}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });

        nav.innerHTML = html;
    } catch (err) {
        console.warn("⚠️ Warning: Failed loading UTM menu bar:", err.message);
    }
}

// ============================================================================
// SECTION 3: REALTIME DATABASE SYNC ENGINE
// ============================================================================
// Line 257: Main UI Synchronization Engine mapping Firebase RTDB to DOM
function syncDashboard(data) {
    if (!data) return;

    // Line 261: Read dynamic savegame authority
    const activeSlot = String(data.activeSaveSlot || (data.cards && data.cards.activeSaveSlot) || '3');
    const slotNodeName = data.activeSlotNode || `savegame${activeSlot}`;
    const slotData = data[slotNodeName] || data;
    const rawXml = (data.allRawParsedXml || slotData.allRawParsedXml || {});

    // Line 267: Extract in-game environment & dayTime
    const envXml = rawXml.environment && (rawXml.environment.environment || rawXml.environment);
    const careerXml = rawXml.careerSavegame && (rawXml.careerSavegame.careerSavegame || rawXml.careerSavegame);
    const cal = resolveCalendarInfo(envXml, careerXml, data.serverStatus?.dayTime);

    // Line 272: Top Banner Updates
    try {
        const statusPill = document.getElementById('server-status-pill');
        const statusText = document.getElementById('status-text');
        const mapEl = document.getElementById('server-map');
        const timeEl = document.getElementById('server-time');
        const seasonEl = document.getElementById('server-month');
        const weatherEl = document.getElementById('server-weather');
        const playersEl = document.getElementById('server-players');
        const slotDisplay = document.getElementById('save-slot-display');
        const syncTimeEl = document.getElementById('last-sync-time');

        const isOnline = !!(data.serverStatus?.isOnline ?? true);
        if (statusPill && statusText) {
            statusPill.className = `status-pill ${isOnline ? 'status-online' : 'status-offline'}`;
            statusText.innerText = isOnline ? 'ONLINE' : 'OFFLINE';
        }

        if (mapEl) {
            const mapTitle = careerXml?.settings?.mapTitle || data.mapTitle || "The Rural Farmlands Of Ohio";
            mapEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapTitle}`;
        }

        if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${cal.clock}`;
        if (seasonEl) seasonEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${cal.month} (Day ${cal.dayInMonth})`;

        if (weatherEl) {
            const forecast = toArray(data.weatherForecast || slotData.weatherForecast);
            const currentWeather = forecast[0]?.type || 'Clear';
            weatherEl.innerHTML = `<i class="fa-solid fa-sun"></i> Weather: ${currentWeather}`;
        }

        const activePlayersArray = toArray(data.activePlayers || data.serverStatus?.activePlayers);
        if (playersEl) playersEl.innerHTML = `<i class="fa-solid fa-users"></i> Players: ${activePlayersArray.length} Online`;
        if (slotDisplay) slotDisplay.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: Slot #${activeSlot}`;

        // Line 307: Convert lastGportalSync timestamp to New York Time
        const rawSyncStamp = data.lastGportalSync || data.cards?.lastGportalSync || data.serverStatus?.lastGportalSync || data.lastUpdated;
        if (syncTimeEl) {
            syncTimeEl.innerHTML = `<i class="fa-solid fa-rotate"></i> Last G-Portal Sync: ${formatNewYorkTime(rawSyncStamp)}`;
        }
    } catch (bannerErr) {
        console.warn("⚠️ Warning: Error synchronizing banner elements:", bannerErr.message);
    }

    // Line 315: Global Summary KPI Counters & Console Slot Usage
    try {
        const netWorthEl = document.getElementById('global-net-worth');
        const fleetCountEl = document.getElementById('global-vehicle-count');
        const modCountEl = document.getElementById('global-mod-errors');
        const landCountEl = document.getElementById('global-land-count');

        // Extract console slot limit
        let slotUsage = careerXml?.slotSystem?.slotUsage || rawXml.careerSavegame?.careerSavegame?.slotSystem?.slotUsage;
        if (slotUsage !== undefined && slotDisplay) {
            slotDisplay.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Slot #${activeSlot} (Console Slots: ${slotUsage})`;
        }

        const finances = data.finances || slotData.finances || (data.farms ? data.farms : {});
        let totalCash = 0;
        let f1Cash = 0;
        let f2Cash = 0;

        if (finances.farm_1) {
            f1Cash = Number(finances.farm_1.money || finances.farm_1.balance || 0);
            totalCash += f1Cash;
        }
        if (finances.farm_2) {
            f2Cash = Number(finances.farm_2.money || finances.farm_2.balance || 0);
            totalCash += f2Cash;
        }

        const f1MoneyEl = document.getElementById('farm1-money');
        const f2MoneyEl = document.getElementById('farm2-money');
        if (netWorthEl) netWorthEl.innerText = formatMoney(totalCash);
        if (f1MoneyEl) f1MoneyEl.innerText = formatMoney(f1Cash);
        if (f2MoneyEl) f2MoneyEl.innerText = formatMoney(f2Cash);

        const fleetList = toArray(data.fleetTelemetry || slotData.fleetTelemetry);
        if (fleetCountEl) fleetCountEl.innerText = `${fleetList.length} Items`;

        const activeModsMap = data.activeMods || slotData.activeMods || {};
        if (modCountEl) modCountEl.innerText = `${Object.keys(activeModsMap).length} Mods`;

        const fieldsList = toArray(data.fields || slotData.fields);
        if (landCountEl) landCountEl.innerText = `${fieldsList.length} Fields`;

    } catch (kpiErr) {
        console.warn("⚠️ Warning: Error calculating KPI totals:", kpiErr.message);
    }

    // Line 356: Dual-Farm Fleets & Classified Collections Mapping
    const farm1Tractors = [];
    const farm1Harvesters = [];
    const farm1Trailers = [];
    const farm1Implements = [];

    const farm2Tractors = [];
    const farm2Harvesters = [];
    const farm2Trailers = [];
    const farm2Implements = [];

    // Directly bind to pre-sorted buckets if available, or fall back to fleet list
    if (data.farm1 && data.farm2) {
        farm1Tractors.push(...toArray(data.farm1.vehicles));
        farm1Harvesters.push(...toArray(data.farm1.harvesters));
        farm1Trailers.push(...toArray(data.farm1.trailers));
        farm1Implements.push(...toArray(data.farm1.implements));

        farm2Tractors.push(...toArray(data.farm2.vehicles));
        farm2Harvesters.push(...toArray(data.farm2.harvesters));
        farm2Trailers.push(...toArray(data.farm2.trailers));
        farm2Implements.push(...toArray(data.farm2.implements));
    } else {
        const fleetList = toArray(data.fleetTelemetry || slotData.fleetTelemetry);
        fleetList.forEach(v => {
            const fId = String(v.farmId || "1");
            const gKey = v.groupKey || (v.isMotorized ? 'motorVehicles' : 'implements');

            const targetTractors = fId === "2" ? farm2Tractors : farm1Tractors;
            const targetHarvesters = fId === "2" ? farm2Harvesters : farm1Harvesters;
            const targetTrailers = fId === "2" ? farm2Trailers : farm1Trailers;
            const targetImplements = fId === "2" ? farm2Implements : farm1Implements;

            if (gKey === 'harvesters') targetHarvesters.push(v);
            else if (gKey === 'trailers') targetTrailers.push(v);
            else if (gKey === 'motorVehicles') targetTractors.push(v);
            else targetImplements.push(v);
        });
    }

    // Line 392: Unified Vehicle/Implement Card Renderer with Count Badges
    const renderVehicleGroup = (units, targetContainerId, countBadgeId, emptyMessage) => {
        const box = document.getElementById(targetContainerId);
        const countBadge = document.getElementById(countBadgeId);
        if (countBadge) countBadge.innerText = units.length;
        if (!box) return;

        if (units.length === 0) {
            box.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            return;
        }

        box.innerHTML = units.map(u => {
            const fillType = u.fillTypes && u.fillTypes !== "UNKNOWN" ? cleanFillName(u.fillTypes) : null;
            const fillLevel = parseFloat(u.fillLevels || 0);
            let fillMeterHtml = '';

            if (fillType && fillLevel > 0) {
                const pct = Math.min(100, Math.max(1, Math.round((fillLevel / Math.max(fillLevel, 100000)) * 100)));
                const color = getStoplightColor(pct);
                fillMeterHtml = `
                    <div class="fill-meter-wrap">
                        <span>${fillType}</span>
                        <div class="fill-bar-track"><div class="fill-bar-val" style="width:${pct}%; background:${color};"></div></div>
                        <span style="color:${color}; font-weight:700;">${Math.round(fillLevel).toLocaleString()} L</span>
                    </div>
                `;
            }

            const driverTag = u.controller
                ? `<span style="color:#38bdf8; font-weight:700;"><i class="fa-solid fa-user"></i> ${u.controller}</span>`
                : (u.isAIActive ? `<span style="color:#facc15;"><i class="fa-solid fa-robot"></i> AI Worker</span>` : `<span style="color:var(--text-muted);">Parked</span>`);

            return `
                <div class="telemetry-card" style="flex-direction:column; align-items:stretch;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${cleanName(u.name || u.type)}</strong>
                        <span class="card-subtext">${driverTag}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        <span>${u.location || 'Farm Grounds'}</span>
                        <span class="card-subtext">${u.category || u.itemKind || 'Equipment'}</span>
                    </div>
                    ${fillMeterHtml}
                </div>
            `;
        }).join('');
    };

    // Render Farm 1 Roster
    renderVehicleGroup(farm1Tractors, 'f1-tractors-container', 'f1-tractors-count', 'No motorized rigs registered to My farm.');
    renderVehicleGroup(farm1Harvesters, 'f1-harvesters-container', 'f1-harvesters-count', 'No harvesters registered to My farm.');
    renderVehicleGroup(farm1Trailers, 'f1-trailers-container', 'f1-trailers-count', 'No hauling trailers registered to My farm.');
    renderVehicleGroup(farm1Implements, 'f1-implements-container', 'f1-implements-count', 'No implements registered to My farm.');

    // Render Farm 2 Roster
    renderVehicleGroup(farm2Tractors, 'f2-tractors-container', 'f2-tractors-count', 'No motorized rigs registered to Dumbace.');
    renderVehicleGroup(farm2Harvesters, 'f2-harvesters-container', 'f2-harvesters-count', 'No harvesters registered to Dumbace.');
    renderVehicleGroup(farm2Trailers, 'f2-trailers-container', 'f2-trailers-count', 'No hauling trailers registered to Dumbace.');
    renderVehicleGroup(farm2Implements, 'f2-implements-container', 'f2-implements-count', 'No implements registered to Dumbace.');

    // Line 452: Global Sections Rendering
    renderActivePlayers(data.activePlayers || data.serverStatus?.activePlayers || []);
    renderMissions(data.missions || slotData.missions || rawXml.missions || []);
    renderCollectibles(data.collectibles || slotData.collectibles || rawXml.collectibles);
    renderFields(data.fields || slotData.fields || rawXml.fields || []);
    renderModDirectory(data.activeMods || slotData.activeMods || {});
}

// Line 460: Active Connected Players Renderer
function renderActivePlayers(players) {
    const container = document.getElementById('active-players-container');
    const badge = document.getElementById('active-players-count');
    const list = toArray(players);
    if (badge) badge.innerText = list.length;
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">No players currently connected.</div>`;
        return;
    }
    container.innerHTML = list.map(p => `
        <div class="telemetry-card">
            <i class="fa-solid fa-user card-icon" style="color:#38bdf8;"></i>
            <div class="card-details">
                <strong>${p.name || (typeof p === 'string' ? p : 'Player')}</strong>
                <span class="card-subtext">Online | Authenticated</span>
            </div>
        </div>
    `).join('');
}

// Line 482: Contracts & Missions Renderer
function renderMissions(missions) {
    const container = document.getElementById('missions-container');
    const badge = document.getElementById('missions-count');
    const list = toArray(missions);
    if (badge) badge.innerText = list.length;
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">No active contracts available.</div>`;
        return;
    }
    container.innerHTML = list.slice(0, 15).map(m => `
        <div class="telemetry-card">
            <i class="fa-solid fa-file-signature card-icon" style="color:#facc15;"></i>
            <div class="card-details" style="flex:1;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${cleanName(m.type || 'Mission')} ${m.fieldId ? `(Field ${m.fieldId})` : ''}</strong>
                    <span style="color:#4ade80; font-family:var(--font-mono); font-weight:700;">${formatMoney(m.reward)}</span>
                </div>
                <span class="card-subtext">Status: ${m.status || 'Created'} ${m.fruitType ? `| Crop: ${cleanName(m.fruitType)}` : ''}</span>
            </div>
        </div>
    `).join('');
}

// Line 506: Collectibles Matrix Renderer
function renderCollectibles(collectibles) {
    const container = document.getElementById('collectibles-container');
    const badge = document.getElementById('collectibles-count');
    const total = 50;

    // Default known found indexes: 21, 25, 26, 27, 28, 45, 50
    const knownFound = new Set([21, 25, 26, 27, 28, 45, 50]);

    if (collectibles && typeof collectibles === 'object') {
        const cItems = toArray(collectibles.items || collectibles.collectible);
        cItems.forEach(c => {
            if (String(c.collected).toLowerCase() === 'true') {
                knownFound.add(parseInt(c.index || c.id || 0, 10));
            }
        });
    }

    if (badge) badge.innerText = `${knownFound.size}/${total}`;
    if (!container) return;

    let html = '<div class="collectibles-grid-layout">';
    for (let i = 1; i <= total; i++) {
        const isFound = knownFound.has(i);
        html += `
            <div class="collectible-badge ${isFound ? 'found' : 'unfound'}" title="Toy #${i} - ${isFound ? 'Found' : 'Hidden'}">
                ${i}
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

// Line 539: Fields Agronomy & Crops Renderer
function renderFields(fields) {
    const container = document.getElementById('fields-container');
    const badge = document.getElementById('fields-count');
    const list = toArray(fields);
    if (badge) badge.innerText = list.length;
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">No fields mapped.</div>`;
        return;
    }
    container.innerHTML = list.slice(0, 16).map(f => `
        <div class="telemetry-card">
            <i class="fa-solid fa-seedling card-icon" style="color:#84cc16;"></i>
            <div class="card-details" style="flex:1;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>Field #${f.id || f.fieldId} (${cleanName(f.cropType || 'Fallow')})</strong>
                    <span style="color:#38bdf8; font-family:var(--font-mono); font-weight:600;">${f.areaHectares ? f.areaHectares.toFixed(1) + ' Ha' : 'Mapped'}</span>
                </div>
                <span class="card-subtext">Owner: Farm ${f.farmId || (f.isOwned ? '1' : 'Wild')} | State: ${cleanName(f.groundType || f.growthState || 'Sown')}</span>
            </div>
        </div>
    `).join('');
}

// Line 562: Mod Directory Grid Renderer
function renderModDirectory(mods) {
    const grid = document.getElementById('mod-hub-grid');
    if (!grid) return;
    cachedMods = mods || {};
    const entries = Object.entries(cachedMods);
    if (entries.length === 0) {
        grid.innerHTML = `<div class="empty-state">No active modifications installed.</div>`;
        return;
    }

    grid.innerHTML = entries.map(([key, m]) => `
        <div class="mod-card" onclick="window.openModDetail('${key}')">
            <div class="mod-card-body">
                <span class="mod-category-tag">${m.crossplay || 'Crossplay Verified'}</span>
                <div class="mod-title">${m.name || cleanName(key)}</div>
                <div class="mod-desc">${(m.description || 'Verified modification active on dedicated server.').substring(0, 80)}...</div>
                <div class="mod-card-footer">
                    <span class="mod-author">By ${m.author || 'Modder'}</span>
                    <span class="mod-download-btn"><i class="fa-solid fa-magnifying-glass"></i> Details</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// SECTION 4: GLOBAL LIGHTBOX & MODAL BINDINGS
// ============================================================================
// Line 590: Attach modal triggers to global window object
window.openImageLightbox = function(imgUrl, captionText) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    if (!modal || !img || !caption) return;

    img.src = imgUrl;
    img.style.display = 'block';
    caption.innerHTML = `<p>${captionText}</p>`;
    modal.classList.add('active');
};

window.openModDetail = function(modKey) {
    const m = cachedMods[modKey];
    if (!m) return;
    const modal = document.getElementById('lightbox-modal');
    const caption = document.getElementById('lightbox-caption');
    const img = document.getElementById('lightbox-img');

    if (m.image) {
        img.src = m.image;
        img.alt = "";
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }

    const modDisplayName = m.name || cleanName(modKey);
    const specificModhubUrl = `https://www.farming-simulator.com/mods.php?title=fs2025&searchKeyword=${encodeURIComponent(modDisplayName)}`;

    caption.innerHTML = `
        <div style="text-align:left; width:100%; font-family:var(--font-family);">
            <h3 style="color:#facc15; font-size:1.25rem; margin-bottom:6px;">${modDisplayName}</h3>
            <p style="color:#cbd5e1; font-size:0.85rem; margin-bottom:12px; line-height:1.4;">${m.description || 'Installed modification.'}</p>
            <div style="background:#0b1120; padding:10px; border-radius:6px; font-family:var(--font-mono); font-size:0.8rem; color:#94a3b8; display:flex; flex-direction:column; gap:4px;">
                <div>Author: <strong style="color:#fff;">${m.author || 'Giants / ModHub'}</strong></div>
                <div>Category: <strong style="color:#fff;">${m.category || 'Machinery'}</strong></div>
                <div>Status: <strong style="color:#4ade80;">Active on Server</strong></div>
            </div>
            <a href="${specificModhubUrl}" target="_blank" rel="noopener noreferrer" class="mod-download-btn" style="margin-top:14px; width:100%; justify-content:center; padding:10px;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Search "${modDisplayName}" on Official ModHub
            </a>
        </div>
    `;

    modal.classList.add('active');
};

// ============================================================================
// SECTION 5: DOM LIFECYCLE & FIREBASE RECONNECTION
// ============================================================================
// Line 639: Reconnection listener wrapped inside DOMContentLoaded with error trapping
document.addEventListener('DOMContentLoaded', () => {
    // Mobile sandwich accordion toggle
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('dynamic-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                menu.classList.remove('open');
            }
        });
    }

    // Lightbox modal listeners
    const lbModal = document.getElementById('lightbox-modal');
    const lbClose = document.getElementById('lightbox-close');
    if (lbClose) {
        lbClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeActiveLightbox();
        });
    }

    if (lbModal) {
        lbModal.addEventListener('click', (e) => {
            if (e.target === lbModal) {
                closeActiveLightbox();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeActiveLightbox();
        }
    });

    const mapThumb = document.getElementById('banner-map-thumb');
    if (mapThumb) {
        mapThumb.addEventListener('click', () => {
            window.openImageLightbox(mapThumb.src, mapThumb.getAttribute('data-alt') || 'Live Satellite Map Feed');
        });
    }

    // Load navigation menu bar
    loadNavigationMenu();

    // Line 692: Reconnect to Firebase RTDB node /fs25
    console.log("📡 Connecting to Firebase Realtime Database at /fs25...");
    const fs25Ref = ref(db, "fs25");
    onValue(fs25Ref, (snapshot) => {
        const liveData = snapshot.val();
        if (liveData) {
            syncDashboard(liveData);
        } else {
            console.warn("⚠️ Warning: /fs25 node returned null or empty payload.");
        }
    }, (error) => {
        console.warn("⚠️ Warning: Firebase RTDB stream error:", error.message);
    });
});
