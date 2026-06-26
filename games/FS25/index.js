let fullRawDataPayload = {};

// Comprehensive Icon Registry for Crops
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
  fetchServerTelemetry();
  setInterval(fetchServerTelemetry, 5000); // Poll database every 5 seconds
});

async function fetchServerTelemetry() {
  try {
    const response = await fetch(FIREBASE_REST_ENDPOINT);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const dataPayload = await response.json();
    if (dataPayload) {
      processDashboardPayload(dataPayload);
    }
  } catch (error) {
    console.error("Database connection fault:", error);
    if (document.getElementById('server-title')) {
      document.getElementById('server-title').innerText = "LIVE DATABASE OFFLINE";
      document.getElementById('server-title').className = "glow-text-red";
    }
  }
}

// Helper to sanitize messy file paths into clean readable equipment names
function cleanEquipmentName(filepath) {
  if (!filepath) return "Equipment Asset";
  let filename = filepath.split('/').pop().replace('.xml', '');
  // Capitalize and insert spaces before capital letters
  let result = filename.replace(/([A-Z])/g, ' $1').trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function processDashboardPayload(data) {
  fullRawDataPayload = data;
  
  // 1. Maintain Core Headers
  if (document.getElementById('server-title')) document.getElementById('server-title').innerText = "Werewolf Dedicated Server";
  if (document.getElementById('game-time')) document.getElementById('game-time').innerText = "Summer - 12:00";
  if (document.getElementById('player-count')) document.getElementById('player-count').innerText = "1/6";
  if (document.getElementById('sync-heartbeat')) document.getElementById('sync-heartbeat').innerText = new Date().toLocaleTimeString();

  // 2. Financial Metrics Parsing
  let totalMoney = 0;
  if (data.careerSavegame_xml?.careerSavegame?.statistics?._attributes?.money) {
    totalMoney = parseInt(data.careerSavegame_xml.careerSavegame.statistics._attributes.money);
  }
  if (document.getElementById('farm-money')) {
    document.getElementById('farm-money').innerText = `$${totalMoney.toLocaleString()}`;
  }

  // 3. Robust Live Radar Map Handling
  const mapImg = document.querySelector('.live-radar-map');
  if (mapImg) {
    // If live server image breaks or has authorization token timeouts, use standard tactical backdrop frame
    mapImg.onerror = function() {
      this.src = "https://i.imgur.com/v8S7M7g.png"; // Clean fallback placeholder map vector
    };
  }

  // 4. Advanced Fleet Categorization and Relationship Mapping
  const fleetBox = document.getElementById('fleet-matrix');
  if (fleetBox) {
    fleetBox.innerHTML = '';
    
    let vehicleSource = data.vehicles_xml?.vehicles?.vehicle;
    if (!vehicleSource) {
      fleetBox.innerHTML = `<div style="color:var(--text-muted); padding:10px;">No vehicles telemetry detected.</div>`;
      return;
    }

    const vehicleArray = Array.isArray(vehicleSource) ? vehicleSource : [vehicleSource];
    
    let primeMovers = []; // Drivable tractors / Harvesters
    let attachments = [];  // Tools / Trailers / Weights

    // Step A: Parse raw array items and separate them by mechanical attributes
    vehicleArray.forEach(v => {
      const attr = v._attributes || {};
      const nameLower = (attr.filename || "").toLowerCase();
      
      let item = {
        id: attr.uniqueId || Math.random().toString(),
        farmId: attr.farmId || "1",
        model: cleanEquipmentName(attr.filename),
        rawFilename: attr.filename || "",
        condition: 100,
        loadedAttachments: []
      };

      // Extract Wear/Damage attributes safely
      if (v.wearable?._attributes?.damage) {
        let damage = parseFloat(v.wearable._attributes.damage) || 0;
        item.condition = Math.round((1 - damage) * 100);
      }

      // Categorize items dynamically based on file naming traits
      const isTool = nameLower.includes('attachable') || 
                     nameLower.includes('tool') || 
                     nameLower.includes('cutter') || 
                     nameLower.includes('weight') || 
                     nameLower.includes('trailer') ||
                     nameLower.includes('header');

      if (isTool) {
        attachments.push(item);
      } else {
        primeMovers.push(item);
      }
    });

    // Step B: Connect attachments to parent units via game file nesting identifiers
    // If the tool shares structural root patterns or common farm IDs, render them cleanly grouped together
    attachments.forEach(attachment => {
      // Find matching prime mover active on the same farm ID to bundle operations
      let parentTractor = primeMovers.find(mover => mover.farmId === attachment.farmId);
      if (parentTractor) {
        parentTractor.loadedAttachments.push(attachment);
      } else {
        // Fallback: If unattached, keep it as an independent tool block card
        primeMovers.push(attachment);
      }
    });

    // Step C: Sort Prime Movers by Farm ID ascending (ID: 1, ID: 2, etc.)
    primeMovers.sort((a, b) => a.farmId.localeCompare(b.farmId));

    // Step D: Render the structured card trees onto the live UI
    primeMovers.forEach(mover => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';
      
      // Build Sub-Attachment subcomponents markup safely
      let attachmentsMarkup = '';
      if (mover.loadedAttachments.length > 0) {
        attachmentsMarkup = mover.loadedAttachments.map(att => `
          <div class="attachment-node">
            <span>🔗 Integrated Tool: <strong>${att.model}</strong></span>
            <span style="font-size:11px; color:var(--text-muted);"> (Health: ${att.condition}%)</span>
          </div>
        `).join('');
      }

      card.innerHTML = `
        <div class="vehicle-header">
          <span>🚜 ${mover.model}</span>
          <span class="gps-badge">FARM ID: ${mover.farmId}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin:5px 0;">Operational Health: ${mover.condition}%</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${mover.condition}%; background:linear-gradient(90deg, ${mover.condition < 30 ? '#dc2626, #f87171' : '#059669, #34d399'});"></div>
        </div>
        ${attachmentsMarkup}
      `;
      fleetBox.appendChild(card);
    });
  }
}
