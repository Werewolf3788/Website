let currentActiveFarmFilter = 'all';
let fullRawDataPayload = {};

// Constant fallback image mapping engine for visual completeness
const PRODUCT_ICONS = {
  "Wheat": "https://cdn-icons-png.flaticon.com/512/575/575454.png",
  "Soybeans": "https://cdn-icons-png.flaticon.com/512/811/811413.png",
  "Corn": "https://cdn-icons-png.flaticon.com/512/1149/1149794.png",
  "Oats": "https://cdn-icons-png.flaticon.com/512/1490/1490774.png",
  "Canola": "https://cdn-icons-png.flaticon.com/512/9165/9165842.png",
  "Default": "https://cdn-icons-png.flaticon.com/512/2371/2371825.png"
};

// DIRECT FIREBASE RAW REALTIME DATA ENGINE ACCESS LINE
// We append .json directly to the end of the public node structure to handle standard REST streams.
const FIREBASE_REST_ENDPOINT = "https://game-tracker-5b2ef-default-rtdb.firebaseio.com/fs25.json";

window.addEventListener('load', () => {
  console.log("Firebase Realtime Telemetry Interconnect Active.");
  
  // Establish instant initial fetch, then begin the professional 5-second tactical poll loop
  fetchServerTelemetry();
  setInterval(fetchServerTelemetry, 5000);
});

async function fetchServerTelemetry() {
  try {
    const response = await fetch(FIREBASE_REST_ENDPOINT);
    if (!response.ok) throw new Error(`HTTP Matrix Error: ${response.status}`);
    
    const dataPayload = await response.json();
    
    // Safety check: ensure our layout doesn't crash if the node tree is returning an empty buffer
    if (dataPayload) {
      processDashboardPayload(dataPayload);
    }
  } catch (error) {
    console.error("Database structural access warning:", error);
    document.getElementById('server-title').innerText = "LIVE DATABASE DISCONNECTED";
    document.getElementById('server-title').className = "glow-text-red";
    document.getElementById('status-indicator').className = "status-dot offline";
  }
}

function switchFarm(farmId) {
  currentActiveFarmFilter = farmId;
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (farmId === 'all') {
    document.getElementById('global-tab-btn').classList.add('active');
  } else {
    // If targeted, locate the specific button element via dynamic text values
    buttons.forEach(btn => {
      if (btn.innerText.includes(fullRawDataPayload.farms[farmId].name)) {
        btn.classList.add('active');
      }
    });
  }
  processDashboardPayload(fullRawDataPayload);
}

function openMarketLightbox(cropName) {
  const modal = document.getElementById('market-lightbox');
  
  // Extract market brokerage nodes completely clean without adjustments
  const broker = fullRawDataPayload.marketBroker || {};
  const marketData = broker[cropName] || {
    bestBuyer: { name: "Local Elevators", price: 0.00 },
    bestSeller: { name: "Supply Store", price: 0.00 },
    farmersMarketPrice: 0.00
  };
  
  document.getElementById('modal-crop-icon').src = PRODUCT_ICONS[cropName] || PRODUCT_ICONS.Default;
  document.getElementById('modal-crop-title').innerText = `${cropName} Commercial Trading Manifest`;
  
  document.getElementById('best-buyer-card').innerHTML = `
    <div class="market-name">🏬 ${marketData.bestBuyer.name}</div>
    <div class="market-price text-glow-green">$${marketData.bestBuyer.price.toLocaleString()} / L</div>
  `;
  
  document.getElementById('best-seller-card').innerHTML = `
    <div class="market-name">🚜 ${marketData.bestSeller.name}</div>
    <div class="market-price text-glow-red">$${marketData.bestSeller.price.toLocaleString()} / L</div>
  `;
  
  // Enumerate the entire market ledger without omitting any items
  const manifestBox = document.getElementById('farmers-market-list');
  manifestBox.className = "farmers-grid-manifest";
  manifestBox.innerHTML = Object.keys(broker).map(crop => `
    <div class="field-node" style="text-align:center;">
      <img src="${PRODUCT_ICONS[crop] || PRODUCT_ICONS.Default}" class="product-icon" style="margin:0 auto 6px auto; display:block;">
      <span style="font-size:12px; font-weight:700;">${crop}</span>
      <div style="color:var(--neon-cyan); font-weight:800; margin-top:4px;">$${broker[crop].farmersMarketPrice.toLocaleString()}</div>
    </div>
  `).join('');

  modal.style.display = "flex";
}

function closeLightbox() {
  document.getElementById('market-lightbox').style.display = "none";
}

// THE PROCESSING ENGINE - POPULATES DATA WITHOUT TRUNCATING, COMPRESSING, OR OMITTING DATA NODES
function processDashboardPayload(data) {
  fullRawDataPayload = data;
  
  // Core default parameters if Firebase properties haven't fully initialized under specific root paths
  const serverOnline = data.serverOnline !== undefined ? data.serverOnline : true;
  const serverName = data.serverName || "Dedicated Farming Pipeline";
  const environment = data.environment || { season: "Unknown", time: "00:00" };
  const players = data.players || [];
  const farms = data.farms || {};
  const vehicles = data.vehicles || {};
  const productionPoints = data.productionPoints || {};
  const fields = data.fields || {};
  const contracts = data.contracts || {};

  // 1. UPDATE SYSTEM STATE LABELS
  const statusIndicator = document.getElementById('status-indicator');
  const serverTitle = document.getElementById('server-title');
  statusIndicator.className = `status-dot ${serverOnline ? 'online' : 'offline'}`;
  serverTitle.className = serverOnline ? 'glow-text-green' : 'glow-text-red';
  serverTitle.innerText = serverName;
  
  document.getElementById('game-time').innerText = `${environment.season} - ${environment.time}`;
  document.getElementById('player-count').innerText = `${players.length}/6`;
  document.getElementById('sync-heartbeat').innerText = new Date().toLocaleTimeString();

  // 2. UNPACK ALL PLAYERS
  const rosterBox = document.getElementById('player-roster');
  rosterBox.innerHTML = '';
  players.forEach(p => {
    const tag = document.createElement('span');
    tag.className = `player-tag ${p.isAdmin ? 'admin-user' : ''}`;
    tag.innerText = `${p.isAdmin ? '👑' : '🎮'} ${p.username}`;
    rosterBox.appendChild(tag);
  });

  // 3. GENERATE COMPLETE TABS (RUNS AUTOMATICALLY ON TREE RECOGNITION)
  const tabContainer = document.getElementById('farm-tabs-container');
  if (tabContainer.children.length <= 1) {
    Object.keys(farms).forEach(id => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.innerText = `🚜 ${farms[id].name}`;
      btn.onclick = () => switchFarm(id);
      tabContainer.appendChild(btn);
    });
  }

  // 4. ACCUMULATE BALANCES SAFELY BASED ON FILTER SETTINGS
  let targetingMoney = 0;
  let targetingProfit = 0;
  let ledgerItems = [];
  let trackingSilos = {};

  if (currentActiveFarmFilter === 'all') {
    Object.keys(farms).forEach(id => {
      targetingMoney += farms[id].money || 0;
      targetingProfit += farms[id].monthlyProfit || 0;
      if (farms[id].ledger) ledgerItems = ledgerItems.concat(farms[id].ledger);
      
      const silo = farms[id].siloStock || {};
      Object.keys(silo).forEach(crop => {
        trackingSilos[crop] = (trackingSilos[crop] || 0) + silo[crop];
      });
    });
  } else {
    const tgt = farms[currentActiveFarmFilter] || {};
    targetingMoney = tgt.money || 0;
    targetingProfit = tgt.monthlyProfit || 0;
    ledgerItems = tgt.ledger || [];
    trackingSilos = tgt.siloStock || {};
  }

  document.getElementById('farm-money').innerText = `$${targetingMoney.toLocaleString()}`;
  const profitEl = document.getElementById('monthly-profit');
  profitEl.innerText = `${targetingProfit >= 0 ? '+' : ''}$${targetingProfit.toLocaleString()}`;
  profitEl.className = `profit-value-display ${targetingProfit >= 0 ? 'text-glow-green' : 'text-glow-red'}`;

  // FINANCIAL SUB-ITEMS
  const ledgerBox = document.getElementById('finance-ledger');
  if (ledgerItems.length === 0) {
    ledgerBox.innerHTML = `<div class="ledger-row" style="color:var(--text-muted)">No recent transactions log line recorded.</div>`;
  } else {
    ledgerBox.innerHTML = ledgerItems.map(item => `
      <div class="ledger-row">
        <span>${item.desc}</span>
        <span style="color: ${item.val < 0 ? 'var(--neon-red)' : 'var(--neon-green)'}; font-weight:700;">
          ${item.val < 0 ? '' : '+'}$${item.val.toLocaleString()}
        </span>
      </div>
    `).join('');
  }

  // SILOS STOCK CAPACITY DISPLAY
  const siloBox = document.getElementById('silo-stocks');
  if (Object.keys(trackingSilos).length === 0) {
    siloBox.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted)">Silos empty or unassigned.</div>`;
  } else {
    siloBox.innerHTML = Object.keys(trackingSilos).map(crop => `
      <div class="clickable-silo-row" onclick="openMarketLightbox('${crop}')">
        <div class="vehicle-header">
          <div class="item-meta-container">
            <img src="${PRODUCT_ICONS[crop] || PRODUCT_ICONS.Default}" class="product-icon">
            <span style="font-weight:700;">${crop}</span>
          </div>
          <span style="color:var(--neon-gold)">${trackingSilos[crop].toLocaleString()} L</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width: ${(trackingSilos[crop]/200000)*100}%; background: linear-gradient(90deg, #d97706, #fbbf24);"></div></div>
      </div>
    `).join('');
  }

  // 5. VEHICLE DEPLOYMENTS
  const fleetBox = document.getElementById('fleet-matrix');
  fleetBox.innerHTML = '';
  const vehicleKeys = Object.keys(vehicles);
  
  if (vehicleKeys.length === 0) {
    fleetBox.innerHTML = `<div style="color:var(--text-muted); padding:10px;">No vehicles telemetry detected.</div>`;
  } else {
    vehicleKeys.forEach(uid => {
      const v = vehicles[uid];
      if (currentActiveFarmFilter !== 'all' && v.farmId !== parseInt(currentActiveFarmFilter)) return;
      const div = document.createElement('div');
      div.className = 'vehicle-card';
      div.innerHTML = `
        <div class="vehicle-header"><span>🚜 ${v.model}</span>${v.gpsActive ? '<span class="gps-badge">GPS ACTIVE</span>' : ''}</div>
        <div style="font-size:12px; color:var(--text-muted); margin:5px 0;">Condition: ${v.condition}%</div>
        <div class="bar-track"><div class="bar-fill" style="width:${v.condition}%; background:linear-gradient(90deg, ${v.condition < 20 ? '#dc2626, #f87171' : '#059669, #34d399'});"></div></div>
        ${v.attachment ? `<div class="attachment-node">🔗 Linked Attachment: ${v.attachment}</div>` : ''}
      `;
      fleetBox.appendChild(div);
    });
  }

  // 6. INDUSTRIAL PRODUCTION LINES
  const productionKeys = Object.keys(productionPoints);
  const productionBox = document.getElementById('production-ledger');
  if (productionKeys.length === 0) {
    productionBox.innerHTML = `<div style="color:var(--text-muted); padding:10px;">No production assets online.</div>`;
  } else {
    productionBox.innerHTML = productionKeys.map(id => {
      const f = productionPoints[id];
      let modeText = ["Storing", "Selling", "Distributing"][f.mode] || "Active Processing";
      return `
        <div class="factory-card ${f.active ? 'running' : 'idle'}">
          <div class="vehicle-header"><strong>🏢 ${f.name}</strong> <span style="color:${f.active ? 'var(--neon-green)':'var(--neon-red)'}; font-size:11px; font-weight:800;">${f.active ? 'ONLINE' : 'STANDBY'}</span></div>
          <div style="font-size:13px; color:var(--text-muted); margin:4px 0;">Strategy: ${modeText} | Location Data: ${f.proximity}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(f.outputVolume/f.outputMax)*100}%; background:linear-gradient(90deg, #c026d3, #e879f9);"></div></div>
        </div>
      `;
    }).join('');
  }

  // 7. COMPREHENSIVE REGISTRY FOR PARCELS (WITH INDEPENDENT LIME/FERT/SLURRY READOUTS)
  const fieldKeys = Object.keys(fields);
  const registryBox = document.getElementById('parcel-registry');
  if (fieldKeys.length === 0) {
    registryBox.innerHTML = `<div style="color:var(--text-muted); padding:10px; grid-column: 1/-1;">No parcel database maps initialized.</div>`;
  } else {
    registryBox.innerHTML = fieldKeys.map(num => {
      const f = fields[num];
      if (currentActiveFarmFilter !== 'all' && f.farmId !== parseInt(currentActiveFarmFilter) && f.farmId !== 0) return '';
      return `
        <div class="field-node">
          <div class="vehicle-header"><strong style="color:#fff;">Field ${num}</strong><span style="font-size:11px; color:var(--text-muted); font-weight:700;">${f.crop}</span></div>
          <span class="field-badge ${f.status.toLowerCase()}">${f.status}</span>
          
          <div class="environmental-matrix">
            <div class="env-row">
              <div class="env-meta-metrics"><span>Lime Composition</span><span>${f.limeLevel || 0}%</span></div>
              <div class="mini-bar-track"><div class="bar-fill fill-lime" style="width: ${f.limeLevel || 0}%"></div></div>
            </div>
            <div class="env-row">
              <div class="env-meta-metrics"><span>Fertilizer Layer</span><span>${f.fertilizerLevel || 0}%</span></div>
              <div class="mini-bar-track"><div class="bar-fill fill-fert" style="width: ${f.fertilizerLevel || 0}%"></div></div>
            </div>
            <div class="env-row">
              <div class="env-meta-metrics"><span>Slurry Saturations</span><span>${f.slurryLevel || 0}%</span></div>
              <div class="mini-bar-track"><div class="bar-fill fill-slurry" style="width: ${f.slurryLevel || 0}%"></div></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 8. SERVER MISSIONS TICKER CONTRACTS
  const contractKeys = Object.keys(contracts);
  const contractBox = document.getElementById('contract-board');
  if (contractKeys.length === 0) {
    contractBox.innerHTML = `<div class="ledger-row" style="color:var(--text-muted)">No procurement contracts active on server logs.</div>`;
  } else {
    contractBox.innerHTML = contractKeys.map(id => {
      const c = contracts[id];
      return `
        <div class="ledger-row">
          <div><strong>${c.type} Operation</strong> (Field Location: ${c.field})</div>
          <div style="font-weight:800; color:var(--neon-green)">+$${c.reward.toLocaleString()}</div>
        </div>
      `;
    }).join('');
  }
}
