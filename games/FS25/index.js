/* ==========================================================================
   FS25 Realtime Tactical Dashboard & Mod Directory Engine
   Last Updated: Sunday, Aug 09, 2026 at 01:43 AM (EDT - New York)
   Targets: entertainment-71888-default-rtdb (/fs25 node) & Google Sheets Mod CSV
   Line-level JS logic with dynamic G-Portal XML key fallbacks
   ========================================================================== */

// Line 9: Published Google Sheet CSV Mod Directory URL
const MOD_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgzcUsOADAcJQKRuWigsRL2NVXkdW8zTsoHBnGLQtcwJSgimxGC8-hewZalTAPsD3-tG1h45F0a-B/pub?gid=1424713988&single=true&output=csv";

// Line 12: Strict image URL validator - prevents text strings/descriptions from making 404 image web requests
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim();
  if (cleanUrl.includes(' ') || cleanUrl.length > 250) return false;
  const isHttp = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('./') || cleanUrl.startsWith('/');
  const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(cleanUrl);
  return isHttp || hasExtension;
}

// Line 23: Initialize Page Lightbox Modal & Page Interactions
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
          modalCaption.textContent = e.target.getAttribute('data-alt') || e.target.alt || 'Enlarged View';
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

  // Load Mod Directory CSV
  fetchModCatalog();
});

// Line 54: CSV Parser & Google Sheets Mod Directory Loader
async function fetchModCatalog() {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  try {
    const response = await fetch(MOD_SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const csvText = await response.text();

    const rows = parseCSV(csvText);
    if (rows.length <= 1) {
      gridContainer.innerHTML = `<div class="empty-state">No mod records found in CSV sheet.</div>`;
      return;
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const modItems = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;
      
      const modObj = {};
      headers.forEach((header, index) => {
        modObj[header] = row[index] ? row[index].trim() : '';
      });

      if (modObj.name || modObj.title || modObj['mod name']) {
        modItems.push(modObj);
      }
    }

    window.allModsList = modItems;
    renderModCategories(modItems);
    renderModGrid(modItems);

  } catch (err) {
    console.error("❌ Google Sheet CSV Load Failed:", err);
    gridContainer.innerHTML = `<div class="empty-state" style="color:#f87171;">Failed to load mod catalog. Check sheet publish permissions.</div>`;
  }
}

// Line 100: CSV Parser
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal);
      if (row.length > 0 && row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal);
    lines.push(row);
  }

  return lines;
}

// Line 141: Category Bar Renderer
function renderModCategories(mods) {
  const catBar = document.getElementById('mod-categories-bar');
  if (!catBar) return;

  const categories = new Set(['ALL']);
  mods.forEach(m => {
    const cat = m.category || m.type || 'General';
    if (cat) categories.add(cat.toUpperCase());
  });

  let barHtml = '';
  categories.forEach(cat => {
    barHtml += `<button type="button" class="category-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterModsCategory('${cat}', this)">${cat}</button>`;
  });
  catBar.innerHTML = barHtml;
}

// Line 158: Category Filter Trigger
window.filterModsCategory = function(selectedCat, btnElem) {
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  if (!window.allModsList) return;  
  if (selectedCat === 'ALL') {
    renderModGrid(window.allModsList);
  } else {
    const filtered = window.allModsList.filter(m => {
      const c = (m.category || m.type || 'General').toUpperCase();
      return c === selectedCat;
    });
    renderModGrid(filtered);
  }
};

// Line 175: Mod Grid Cards Renderer
function renderModGrid(mods) {
  const gridContainer = document.getElementById('mod-hub-grid');
  if (!gridContainer) return;

  if (!mods || mods.length === 0) {
    gridContainer.innerHTML = `<div class="empty-state">No matching mods found.</div>`;
    return;
  }

  const cardsHtml = mods.map(mod => {
    const name = mod.name || mod.title || mod['mod name'] || 'Unnamed Mod';
    const category = mod.category || mod.type || 'General';
    const desc = mod.description || mod.notes || mod.details || '';
    const author = mod.author || mod.creator || 'Server Sync';
    const link = mod.link || mod.url || mod.download || '#';

    const rawImg = mod.image || mod.thumb || mod.icon || '';
    const imgHtml = isValidImageUrl(rawImg)
      ? `<img src="${rawImg}" data-alt="${name}" class="lightbox-trigger mod-card-thumb">`
      : `<div class="mod-card-icon-fallback"><i class="fa-solid fa-cube"></i></div>`;

    return `
      <div class="mod-card">
        ${imgHtml}
        <div class="mod-card-body">
          <span class="mod-category-tag">${category}</span>
          <h3 class="mod-title">${name}</h3>
          ${desc ? `<p class="mod-desc">${desc}</p>` : ''}
          <div class="mod-card-footer">
            <span class="mod-author"><i class="fa-solid fa-user"></i> ${author}</span>
            ${link !== '#' ? `<a href="${link}" target="_blank" rel="noopener" class="mod-download-btn"><i class="fa-solid fa-download"></i> Get Mod</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  gridContainer.innerHTML = cardsHtml;
}

// Line 216: Primary Realtime Dashboard Renderer with Full G-Portal Key Fallbacks
window.renderDashboard = function(data) {
  if (!data) return;

  // 1. Server Header Banner Information
  const s = data.serverInfo || data.server || data.Server || {};
  const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  if (s.name || s.serverName) setElem('server-name', s.name || s.serverName);
  if (s.mapName || s.map) setElem('server-map', `Map: ${s.mapName || s.map}`);
  if (s.dayTime || s.time) setElem('server-time', `Time: ${s.dayTime || s.time}`);
  if (s.timeScale || s.speed) setElem('time-speed-badge', `Speed: ${s.timeScale || s.speed}x`);
  if (s.month) setElem('server-month', `Month: ${s.month}`);
  if (s.weather) setElem('server-weather', `Weather: ${s.weather}`);
  if (s.slots || s.players || s.numPlayers) {
    const activeP = s.numPlayers || s.playersCount || (s.slots ? s.slots.players : 0);
    const maxP = s.capacity || s.maxPlayers || 6;
    setElem('server-players', `Players: ${activeP}/${maxP}`);
  }

  // Extract Nodes with Multi-Key Support
  const farmsNode = data.farms || data.Farms || data.farm || null;
  const vehiclesNode = data.vehicles || data.Vehicles || data.machines || data.Fleet || null;
  const fieldsNode = data.fields || data.Fields || data.farmland || null;
  const harvestersNode = data.harvesters || data.combines || data.Combines || null;
  const toolsNode = data.handTools || data.tools || data.Tools || null;
  const productionsNode = data.productions || data.factories || data.Productions || null;
  const animalsNode = data.animals || data.husbandry || data.Animals || null;
  const contractsNode = data.contracts || data.missions || data.Contracts || null;
  const infraNode = data.infrastructure || data.placeables || data.Infrastructure || null;
  const buyingNode = data.buyingStations || data.sellPoints || data.Stations || null;
  const trainNode = data.trains || data.train || data.Train || null;
  const salesNode = data.sales || data.usedSales || data.Sales || null;
  const economyNode = data.economy || data.prices || data.Economy || null;

  // 2. Global Net Worth Calculations
  if (farmsNode) {
    let totalMoney = 0;
    const farmList = Array.isArray(farmsNode) ? farmsNode : Object.values(farmsNode);
    farmList.forEach(f => { totalMoney += Number(f.money || f.balance || 0); });
    const netWorthEl = document.getElementById('global-net-worth');
    if (netWorthEl) netWorthEl.textContent = `$${totalMoney.toLocaleString()}`;
  }

  if (vehiclesNode) {
    const fleetEl = document.getElementById('global-vehicle-count');
    if (fleetEl) {
      const count = Array.isArray(vehiclesNode) ? vehiclesNode.length : Object.keys(vehiclesNode).length;
      fleetEl.textContent = count;
    }
  }

  if (fieldsNode) {
    const fieldCountEl = document.getElementById('global-land-count');
    if (fieldCountEl) {
      const count = Array.isArray(fieldsNode) ? fieldsNode.length : Object.keys(fieldsNode).length;
      fieldCountEl.textContent = `${count} Fields`;
    }
  }

  // 3. Farms Card List
  renderGenericList('farms-container', farmsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-house-chimney card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.farmName || 'Farm'}</strong>
        <span>Balance: $${Number(item.money || item.balance || 0).toLocaleString()}</span>
      </div>
    </div>
  `);

  // 4. Vehicles Sorting (Tractors vs Trailers vs Implements)
  if (vehiclesNode) {
    const vehiclesArr = Array.isArray(vehiclesNode) ? vehiclesNode : Object.values(vehiclesNode);
    
    const tractors = vehiclesArr.filter(v => {
      const cat = (v.category || v.type || v.group || '').toLowerCase();
      return cat.includes('tractor') || cat.includes('truck') || (!cat && !v.isTrailer);
    });

    const trailers = vehiclesArr.filter(v => {
      const cat = (v.category || v.type || v.group || '').toLowerCase();
      return cat.includes('trailer') || cat.includes('wagon') || v.isTrailer;
    });

    const implementsArr = vehiclesArr.filter(v => !tractors.includes(v) && !trailers.includes(v));

    renderGenericList('tractors-container', tractors.length ? tractors : vehiclesArr, renderVehicleCard);
    renderGenericList('trailers-container', trailers.length ? trailers : vehiclesArr, renderVehicleCard);
    renderGenericList('implements-container', implementsArr.length ? implementsArr : vehiclesArr, renderVehicleCard);
  } else {
    renderGenericList('tractors-container', null);
    renderGenericList('trailers-container', null);
    renderGenericList('implements-container', null);
  }

  // 5. Harvesters
  renderGenericList('harvesters-container', harvestersNode, renderVehicleCard);

  // 6. Player Hand Tools
  renderGenericList('handtools-container', toolsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-toolbox card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.type || 'Tool'}</strong>
        <span>Owner: ${item.owner || item.farm || 'Farm'}</span>
      </div>
    </div>
  `);

  // 7. Field Crops & Agronomy
  renderGenericList('fields-container', fieldsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-seedling card-icon"></i>
      <div class="card-details">
        <strong>Field ${item.id || item.number || item.fieldId || '0'}</strong>
        <span>Crop: ${item.fruitType || item.crop || item.plant || 'Fallow'} | Growth: ${item.growthState || item.state || 'N/A'}</span>
      </div>
    </div>
  `);

  // 8. Map Factories
  renderGenericList('main-productions-container', productionsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-industry card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.title || 'Factory'}</strong>
        <span>Status: ${item.status || (item.active ? 'Active' : 'Idle')}</span>
      </div>
    </div>
  `);

  // 9. Animals
  renderGenericList('animal-husbandry-container', animalsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-cow card-icon"></i>
      <div class="card-details">
        <strong>${item.type || item.name || item.animalType || 'Animal Pen'}</strong>
        <span>Count: ${item.numAnimals || item.count || item.amount || 0}</span>
      </div>
    </div>
  `);

  // 10. Contracts
  renderGenericList('contracts-container', contractsNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-file-contract card-icon"></i>
      <div class="card-details">
        <strong>${item.type || 'Mission'} - Field ${item.fieldId || item.field || ''}</strong>
        <span>Reward: $${Number(item.reward || item.money || 0).toLocaleString()}</span>
      </div>
    </div>
  `);

  // 11. Infrastructure
  renderGenericList('infrastructure-container', infraNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-city card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.type || 'Public Building'}</strong>
      </div>
    </div>
  `);

  // 12. Buying Stations
  renderGenericList('buying-stations-container', buyingNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-store card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.stationName || 'Station'}</strong>
      </div>
    </div>
  `);

  // 13. Regional Train Network
  renderGenericList('main-train-container', trainNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-train card-icon"></i>
      <div class="card-details">
        <strong>${item.name || 'Regional Train'}</strong>
        <span>State: ${item.state || 'Active'}</span>
      </div>
    </div>
  `);

  // 14. Dealership Sales
  renderGenericList('sales-container', salesNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-tags card-icon"></i>
      <div class="card-details">
        <strong>${item.name || item.vehicle || 'Bargain Item'}</strong>
        <span>Discount Price: $${Number(item.price || item.cost || 0).toLocaleString()}</span>
      </div>
    </div>
  `);

  // 15. Economy Market Prices
  renderGenericList('economy-container', economyNode, item => `
    <div class="telemetry-card">
      <i class="fa-solid fa-chart-line card-icon"></i>
      <div class="card-details">
        <strong>${item.fillType || item.name || item.crop || 'Crop'}</strong>
        <span>Price: $${Number(item.price || item.value || 0).toLocaleString()} / 1kL</span>
      </div>
    </div>
  `);
};

// Line 389: Vehicle Card Formatter Helper
function renderVehicleCard(item) {
  const imgHtml = isValidImageUrl(item.image || item.thumb || item.icon)
    ? `<img src="${item.image || item.thumb || item.icon}" data-alt="${item.name || 'Vehicle'}" class="lightbox-trigger card-thumb">`
    : `<i class="fa-solid fa-tractor card-icon"></i>`;

  return `
    <div class="telemetry-card">
      ${imgHtml}
      <div class="card-details">
        <strong>${item.name || item.type || item.model || 'Equipment'}</strong>
        <span>Operating Hours: ${item.operatingTime || item.hours || 0} hrs</span>
      </div>
    </div>
  `;
}

// Line 405: Universal List Rendering Helper
function renderGenericList(containerId, items, templateFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items) {
    container.innerHTML = `<div class="empty-state">No active telemetry available</div>`;
    return;
  }

  const itemsArr = Array.isArray(items) ? items : Object.values(items);
  if (itemsArr.length === 0) {
    container.innerHTML = `<div class="empty-state">No active telemetry available</div>`;
    return;
  }

  container.innerHTML = itemsArr.map(item => templateFn(item)).join('');
}

// Line 423: Server Online Status Toggle
window.setServerStatus = function(isOnline) {
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  
  if (statusPill && statusText) {
    statusPill.className = isOnline ? 'status-pill status-online' : 'status-pill status-offline';
    statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
  }
};
