/*
 Version Timestamp: Fri, July 24, 2026, 02:45 PM (EDT)
 Tactical Engine - Live Dynamic Navigation Engine & Resilient Online Server Status Fix
 File: games/FS25/index.js
*/

const CSV_MENU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv";

const FARM_COLOR_PALETTE = {
  "0": { name: "AI / Public Map", color: "#facc15", isAI: true },
  "1": { name: "Farm 1", color: "#ff5f00", isAI: false },
  "2": { name: "Farm 2", color: "#c41e3a", isAI: false },
  "3": { name: "Farm 3", color: "#2563eb", isAI: false },
  "4": { name: "Farm 4", color: "#ec4899", isAI: false },
  "5": { name: "Farm 5", color: "#a855f7", isAI: false },
  "6": { name: "Farm 6", color: "#22c55e", isAI: false }
};

let offlineStartTime = null;
let offlineTimerInterval = null;
let lastKnownServerName = "Dedicated Server";

function getFarmColorMeta(farmId) {
  const key = String(farmId || "0");
  if (FARM_COLOR_PALETTE[key]) return FARM_COLOR_PALETTE[key];
  const idNum = parseInt(key, 10) || 0;
  return { name: `Farm ${idNum}`, color: `hsl(${(idNum * 137.5) % 360}, 85%, 55%)`, isAI: false };
}

const HUMAN_EQUIPMENT_LOOKUP = {
  "MF8570": { name: "Massey Ferguson 8570 Combine", category: "Harvester" },
  "MF8570HEADER": { name: "Massey Ferguson 8570 Header", category: "Header" },
  "XB150": { name: "BISO XB150 Header Trailer", category: "Header Trailer" },
  "FRONTLOADER PALLET FORK": { name: "Albutt Pallet Fork", category: "Frontloader Attachment" },
  "FRONTLOADER SHOVEL": { name: "Albutt Universal Shovel", category: "Frontloader Attachment" },
  "POV5XL": { name: "Agromasz POV 5 XL 5-Furrow Plough", category: "Plough" },
  "TOP450": { name: "Pöttinger TOP 450 Tedder", category: "Tedder" },
  "AGRO STAR831": { name: "Deutz-Fahr AgroStar 8.31", category: "Medium Tractor" },
  "Z18051": { name: "Zetor Crystal 12045 / Z180", category: "Medium Tractor" },
  "SERIES3650": { name: "John Deere 3650 Tractor", category: "Small Tractor" }
};

function resolveEquipmentDetails(rawName) {
  if (!rawName) return { name: "Map Equipment", category: "Tool" };
  const str = String(rawName).toUpperCase().trim();
  for (const [key, meta] of Object.entries(HUMAN_EQUIPMENT_LOOKUP)) {
    if (str.includes(key)) return meta;
  }
  return { name: formatName(rawName), category: "Equipment / Tool" };
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

// Global Online/Offline Status Indicator Fix
window.setServerStatus = function(isOnline) {
  const pill = document.getElementById('server-status-pill');
  const text = document.getElementById('status-text');
  const syncTimeEl = document.getElementById('last-sync-time');
  const offlineTimerEl = document.getElementById('offline-timer');
  const serverNameEl = document.getElementById('server-name');

  if (!pill || !text) return;

  const actualOnlineState = isOnline && navigator.onLine;

  if (actualOnlineState) {
    pill.className = "status-pill status-online";
    text.textContent = "ONLINE";

    if (offlineTimerInterval) {
      clearInterval(offlineTimerInterval);
      offlineTimerInterval = null;
    }
    offlineStartTime = null;
    if (offlineTimerEl) offlineTimerEl.style.display = "none";
    if (syncTimeEl) syncTimeEl.style.display = "inline";
  } else {
    pill.className = "status-pill status-offline";
    if (serverNameEl && serverNameEl.textContent.includes("Connecting")) {
      serverNameEl.textContent = lastKnownServerName;
    }

    if (!offlineStartTime) {
      offlineStartTime = Date.now();
      if (syncTimeEl) syncTimeEl.style.display = "none";
      if (offlineTimerEl) offlineTimerEl.style.display = "inline";

      if (offlineTimerInterval) clearInterval(offlineTimerInterval);
      offlineTimerInterval = setInterval(() => {
        if (!offlineStartTime) return;
        const diffMs = Date.now() - offlineStartTime;
        const totalSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const timeStr = `${mins}m ${secs}s`;
        
        if (text) text.textContent = `OFFLINE (${timeStr})`;
        if (offlineTimerEl) {
          offlineTimerEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Server Offline Duration: <strong>${timeStr}</strong>`;
        }
      }, 1000);
    }
  }
};

window.addEventListener('online', () => window.setServerStatus(true));
window.addEventListener('offline', () => window.setServerStatus(false));

// Dynamic Google Sheets Navigation Menu Parser
async function loadDynamicNavbar() {
  const menuContainer = document.getElementById("dynamic-menu");
  if (!menuContainer) return;

  try {
    const response = await fetch(CSV_MENU_URL);
    if (!response.ok) throw new Error("CSV fetch failed");
    const csvText = await response.text();

    const lines = csvText.split("\n").filter(l => l.trim().length > 0);
    const groups = {};

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));
      if (cols.length >= 3) {
        const name = cols[0];
        const group = cols[1] || "General";
        const url = cols[2];
        const img = cols[3] || "";

        if (!groups[group]) groups[group] = [];
        groups[group].push({ name, url, img });
      }
    }

    let navHtml = `<a href="https://werewolf3788.github.io/Website/" class="nav-btn"><i class="fa-solid fa-house"></i> Home</a>`;

    for (const [groupName, items] of Object.entries(groups)) {
      navHtml += `
        <div class="nav-item">
          <button class="nav-btn dropdown-toggle">
            ${groupName} <i class="fa-solid fa-caret-down"></i>
          </button>
          <div class="dropdown-content">`;

      items.forEach(item => {
        const imgTag = item.img ? `<img src="${item.img}" class="menu-thumb" onerror="this.style.display='none';">` : `<i class="fa-solid fa-link"></i>`;
        navHtml += `<a href="${item.url}">${imgTag} ${item.name}</a>`;
      });

      navHtml += `</div></div>`;
    }

    menuContainer.innerHTML = navHtml;

    document.querySelectorAll('.dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.nav-item');
        if (parent) parent.classList.toggle('open');
      });
    });

  } catch (e) {
    console.warn("Navigation menu fallback applied:", e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicNavbar();

  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const menuBar = document.getElementById("dynamic-menu");
  if (toggleBtn && menuBar) {
    toggleBtn.addEventListener("click", () => menuBar.classList.toggle("menu-active"));
  }
});

// Render Dashboard Data from RTDB
window.renderDashboard = function(data) {
  if (!data) {
    window.setServerStatus(false);
    return;
  }

  const statsXml = parseXML(data.stats || data.dedicatedServerConfig_xml);
  const serverNode = statsXml ? statsXml.querySelector("Server") : null;
  const gameName = serverNode ? serverNode.getAttribute("name") : null;

  // Confirm Active Server Telemetry Status
  if (statsXml && serverNode) {
    lastKnownServerName = gameName || "Dedicated Server";
    window.setServerStatus(true);
  } else {
    window.setServerStatus(false);
  }

  const saveSlotEl = document.getElementById('save-slot-display');
  if (saveSlotEl) {
    saveSlotEl.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Active Save Slot: <strong style="color:#ffffff;">savegame${data.activeSaveSlot || "1"}</strong>`;
  }

  if (serverNode) {
    const serverNameEl = document.getElementById('server-name');
    if (serverNameEl) serverNameEl.textContent = gameName;

    const mapName = serverNode.getAttribute("mapName") || "Riverbend Springs";
    const mapEl = document.getElementById('server-map');
    if (mapEl) mapEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Map: ${mapName}`;

    const rawDayTime = parseFloat(serverNode.getAttribute("dayTime") || "0");
    let hours = 8, mins = 0;
    if (rawDayTime > 0) {
      const totalMinutes = Math.floor(rawDayTime / 60000);
      hours = Math.floor(totalMinutes / 60) % 24;
      mins = totalMinutes % 60;
    }
    const timeEl = document.getElementById('server-time');
    if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> Time: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const timeScale = serverNode.getAttribute("timeScale") || "5.0";
    const speedBadge = document.getElementById('time-speed-badge');
    if (speedBadge) speedBadge.innerHTML = `<i class="fa-solid fa-forward-fast"></i> Speed: ${parseFloat(timeScale).toFixed(0)}x`;

    const traffic = serverNode.getAttribute("trafficEnabled") !== "false";
    const trafficBadge = document.getElementById('traffic-badge');
    if (trafficBadge) trafficBadge.innerHTML = `<i class="fa-solid fa-car"></i> Traffic: ${traffic ? 'ON' : 'OFF'}`;
  }
};
