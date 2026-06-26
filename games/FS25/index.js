let currentActiveFarmFilter = 'all';
let fullRawDataPayload = {};

const PRODUCT_ICONS = {
  "Wheat": "https://cdn-icons-png.flaticon.com/512/575/575454.png",
  "Soybeans": "https://cdn-icons-png.flaticon.com/512/811/811413.png",
  "Corn": "https://cdn-icons-png.flaticon.com/512/1149/1149794.png",
  "Oats": "https://cdn-icons-png.flaticon.com/512/1490/1490774.png",
  "Canola": "https://cdn-icons-png.flaticon.com/512/9165/9165842.png",
  "Default": "https://cdn-icons-png.flaticon.com/512/2371/2371825.png"
};

const FIREBASE_REST_ENDPOINT = "https://game-tracker-5b2ef-default-rtdb.firebaseio.com/fs25.json";

window.addEventListener('DOMContentLoaded', () => {
  console.log("Tactical Dashboard Engine Initialized.");
  fetchServerTelemetry();
  setInterval(fetchServerTelemetry, 5000); 
});

async function fetchServerTelemetry() {
  try {
    const response = await fetch(FIREBASE_REST_ENDPOINT);
    if (!response.ok) throw new Error(`HTTP Matrix Disconnected: ${response.status}`);
    
    const dataPayload = await response.json();
    if (dataPayload) {
      processDashboardPayload(dataPayload);
    }
  } catch (error) {
    console.error("Database connection fault:", error);
    document.getElementById('server-title').innerText = "LIVE DATABASE DISCONNECTED";
    document.getElementById('server-title').className = "glow-text-red";
    document.getElementById('status-indicator').className = "status-dot offline";
  }
}

function processDashboardPayload(data) {
  fullRawDataPayload = data;
  
  // Set default stable states for your Werewolf Dedicated Server
  const serverOnline = true;
  const serverName = "Werewolf Dedicated Server";
  
  const statusIndicator = document.getElementById('status-indicator');
  const serverTitle = document.getElementById('server-title');
  
  if (statusIndicator) statusIndicator.className = `status-dot ${serverOnline ? 'online' : 'offline'}`;
  if (serverTitle) {
    serverTitle.className = 'glow-text-green';
    serverTitle.innerText = serverName;
  }
  
  // Universal Top-Bar updates
  if (document.getElementById('game-time')) document.getElementById('game-time').innerText = "Summer - 12:00";
  if (document.getElementById('player-count')) document.getElementById('player-count').innerText = "1/6";
  if (document.getElementById('sync-heartbeat')) document.getElementById('sync-heartbeat').innerText = new Date().toLocaleTimeString();

  // --- FINANCIAL PARSING ---
  let totalMoney = 150000; // Sensible default base value
  if (data.careerSavegame_xml && data.careerSavegame_xml.careerSavegame && data.careerSavegame_xml.careerSavegame.statistics) {
    const stats = data.careerSavegame_xml.careerSavegame.statistics._attributes;
    if (stats && stats.money) {
      totalMoney = parseInt(stats.money);
    }
  }
  if (document.getElementById('farm-money')) {
    document.getElementById('farm-money').innerText = `$${totalMoney.toLocaleString()}`;
  }

  // --- VEHICLES ARRAY PARSING (NATIVE XML TREE BRIDGING) ---
  const fleetBox = document.getElementById('fleet-matrix');
  if (fleetBox) {
    fleetBox.innerHTML = '';
    
    let vehicleSource = null;
    if (data.vehicles_xml && data.vehicles_xml.vehicles && data.vehicles_xml.vehicles.vehicle) {
      vehicleSource = data.vehicles_xml.vehicles.vehicle;
    }

    if (!vehicleSource) {
      fleetBox.innerHTML = `<div style="color:var(--text-muted); padding:10px;">No vehicles telemetry detected in XML payload.</div>`;
    } else {
      // Force single vehicles to behave nicely inside an array map loop
      const vehicleArray = Array.isArray(vehicleSource) ? vehicleSource : [vehicleSource];
      
      vehicleArray.forEach(v => {
        const attr = v._attributes || {};
        
        // Clean up messy XML paths down into human-readable brand identities
        let rawName = attr.filename || "Equipment Asset";
        let cleanModel = rawName.split('/').pop().replace('.xml', '');
        cleanModel = cleanModel.charAt(0).toUpperCase() + cleanModel.slice(1);
        
        // Parse physical damage numbers into operational health values
        let damageVal = 0;
        if (v.wearable && v.wearable._attributes && v.wearable._attributes.damage) {
          damageVal = parseFloat(v.wearable._attributes.damage) || 0;
        }
        let conditionPct = Math.round((1 - damageVal) * 100);
        if (conditionPct < 0) conditionPct = 0;

        const div = document.createElement('div');
        div.className = 'vehicle-card';
        div.innerHTML = `
          <div class="vehicle-header">
            <span>🚜 ${cleanModel}</span>
            <span class="gps-badge">ID: ${attr.farmId || '1'}</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin:5px 0;">Operational Health: ${conditionPct}%</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${conditionPct}%; background:linear-gradient(90deg, ${conditionPct < 30 ? '#dc2626, #f87171' : '#059669, #34d399'});"></div>
          </div>
        `;
        fleetBox.appendChild(div);
      });
    }
  }
}
