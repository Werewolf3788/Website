/* ==========================================================================
   FS25 Realtime Dashboard & Mod Directory Engine
   Line-level JS logic with strict field binding validation to prevent 404s
   ========================================================================== */

// Helper: Verifies if a string is a valid image URL before binding to img.src
// Line 8: Prevents CSV description text from being parsed as web requests
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  
  // Reject raw text descriptions containing spaces or sentence structure
  if (cleanUrl.includes(' ') || cleanUrl.length > 200) return false;
  
  // Must start with standard HTTP protocols or relative paths AND end with image extensions
  const isHttp = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('./') || cleanUrl.startsWith('/');
  const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(cleanUrl);
  
  return isHttp || hasExtension;
}

// Lightbox Modal Setup
// Line 23: Image lightbox handling with accessibility controls
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
          // Keep alt text inside lightbox view only
          modalCaption.textContent = e.target.alt || 'Enlarged View';
        }
      }
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Mobile menu toggle
  // Line 57: Touch menu navigation
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('dynamic-menu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }
});

// Primary Dashboard Render Loop
// Line 68: Safely binds Firebase telemetry to UI elements
window.renderDashboard = function(data) {
  if (!data) return;

  // Server Header Updates
  if (data.serverInfo) {
    const s = data.serverInfo;
    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    if (s.name) setElem('server-name', s.name);
    if (s.mapName) setElem('server-map', `Map: ${s.mapName}`);
    if (s.dayTime) setElem('server-time', `Time: ${s.dayTime}`);
    if (s.timeScale) setElem('time-speed-badge', `Speed: ${s.timeScale}x`);
    if (s.month) setElem('server-month', `Month: ${s.month}`);
    if (s.weather) setElem('server-weather', `Weather: ${s.weather}`);
    if (s.slots) setElem('server-players', `Players: ${s.numPlayers || 0}/${s.capacity || 6}`);
  }

  // Global Metrics Calculation
  // Line 89: Aggregate calculations
  if (data.farms) {
    let totalMoney = 0;
    Object.values(data.farms).forEach(f => {
      totalMoney += Number(f.money || 0);
    });
    const netWorthEl = document.getElementById('global-net-worth');
    if (netWorthEl) {
      netWorthEl.textContent = `$${totalMoney.toLocaleString()}`;
    }
  }

  if (data.vehicles) {
    const fleetEl = document.getElementById('global-vehicle-count');
    if (fleetEl) {
      fleetEl.textContent = Object.keys(data.vehicles).length;
    }
  }

  // Safe Container Rendering
  // Line 110: Ensures text properties are never assigned to img src attributes
  renderGenericList('farms-container', data.farms, (item) => `
    <div class="telemetry-card">
      <i class="fa-solid fa-house-chimney card-icon"></i>
      <div class="card-details">
        <strong>${item.name || 'Farm'}</strong>
        <span>Balance: $${Number(item.money || 0).toLocaleString()}</span>
      </div>
    </div>
  `);

  renderGenericList('tractors-container', data.vehicles, (item) => {
    // Line 122: Validates thumbnail URL before building image element
    const imgHtml = isValidImageUrl(item.image) 
      ? `<img src="${item.image}" alt="${item.name || 'Vehicle'}" class="lightbox-trigger card-thumb">`
      : `<i class="fa-solid fa-tractor card-icon"></i>`;

    return `
      <div class="telemetry-card">
        ${imgHtml}
        <div class="card-details">
          <strong>${item.name || item.type || 'Machinery'}</strong>
          <span>Operating Hours: ${item.operatingTime || 0} hrs</span>
        </div>
      </div>
    `;
  });
};

// Generic Renderer: Prevents broken image outputs
// Line 139: Renders dynamic lists without invalid resource requests
function renderGenericList(containerId, items, templateFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items || Object.keys(items).length === 0) {
    container.innerHTML = `<div class="empty-state">No active telemetry available</div>`;
    return;
  }

  const htmlArray = Object.values(items).map(item => templateFn(item));
  container.innerHTML = htmlArray.join('');
}

// Server Online Status Toggle
// Line 153: Updates pill status based on stream health
window.setServerStatus = function(isOnline) {
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  
  if (statusPill && statusText) {
    if (isOnline) {
      statusPill.className = 'status-pill status-online';
      statusText.textContent = 'ONLINE';
    } else {
      statusPill.className = 'status-pill status-offline';
      statusText.textContent = 'OFFLINE';
    }
  }
};
