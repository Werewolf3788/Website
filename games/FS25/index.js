<header class="top-bar">
  <div class="server-status">
    <span id="status-indicator" class="status-dot offline"></span>
    <div>
      <h1 id="server-title" class="glow-text-red">GRID LINK DATA DISCONNECTED</h1>
      <small class="server-type-badge">🔒 FS25 Dedicated Server | Map: <span id="server-map-name">Awaiting Sync...</span> | Max Capacity: 6 Players</small>
    </div>
  </div>
  
  <div class="global-bank-center-node">
    <div class="stats-label">Combined Global Fleet Reserves</div>
    <div class="money-display" id="global-combined-money">$0</div>
    <div class="individual-farm-sub-balances" id="farm-sub-balances-grid">
      </div>
  </div>
  
  <div class="server-telemetry">
    <div class="telemetry-item neon-border-blue">⏰ Time: <span id="game-time">--:--</span></div>
    <div class="telemetry-item neon-border-purple">👥 Slots: <span id="player-count">0/6</span></div>
    <div class="telemetry-item neon-border-gold">💓 Sync: <span id="sync-heartbeat">PENDING</span></div>
  </div>

  <div id="player-roster" class="player-roster"></div>
</header>

<nav class="farm-tabs" id="farm-tabs-container">
  <button class="tab-btn active" id="global-tab-btn" onclick="switchFarm('all')">🛰️ Global Fleet Overview</button>
  </nav>

<div class="global-metrics-strip centered-container">
  <div class="metric-node">🌾 Total Hectares: <span id="total-hectares">0.00 ha</span></div>
  <div class="metric-node">🚜 Tractors: <span id="total-tractors-count">0</span></div>
  <div class="metric-node">🚛 Trailers: <span id="total-trailers-count">0</span></div>
  <div class="metric-node">🔧 Attachments: <span id="total-attachments-count">0</span></div>
</div>

<main class="dashboard-grid">
  
  <section class="grid-column">
    
    <div class="dashboard-card glass-panel card-glow-blue">
      <h2 class="header-blue">🚜 Active Fleet Array & Connected Attachments</h2>
      
      <div class="fleet-sub-tabs">
        <button class="sub-tab-btn active" onclick="switchFleetSubTab('tractors')">Tractors</button>
        <button class="sub-tab-btn" onclick="switchFleetSubTab('trailers')">Trailers / Logistics</button>
        <button class="sub-tab-btn" onclick="switchFleetSubTab('attachments')">Implements & Attachments</button>
      </div>

      <div class="fleet-list entry-separated" id="fleet-matrix">
        </div>
    </div>

    <div class="dashboard-card glass-panel card-glow-purple" id="factory-section-wrapper">
      <h2 class="header-purple">🏭 Production Points & Warehouse Manifests</h2>
      <div class="production-list" id="production-ledger"></div>
    </div>
  </section>

  <section class="grid-column">
    
    <div class="dashboard-card glass-panel card-glow-blue">
      <h2 class="header-blue">🌱 Comprehensive Field Parcel Registry</h2>
      <div class="field-card-grid-layout" id="parcel-registry">
        </div>
    </div>

    <div class="dashboard-card glass-panel card-glow-gold" id="missions-section-wrapper">
      <h2 class="header-gold">📋 Live Server Operations Contract Board</h2>
      <div class="contract-list" id="contract-board"></div>
    </div>
  </section>

</main>
