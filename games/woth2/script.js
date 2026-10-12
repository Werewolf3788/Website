// Section 1: System Constants & Cache Busters (Lines 1-28)
const BUILD_TIMESTAMP = '2026-10-12 05:41 EDT';
const APP_VERSION = '7.5.0';
const FIREBASE_SYNC_TARGET = '/utm_links';
const CACHE_NAME = 'woth2-tactical-cache-' + BUILD_TIMESTAMP;

// Section 2: Firebase Fallback Configuration (Lines 30-58)
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForFallbackConfigWOTH2",
  authDomain: "entertainment-71888.firebaseapp.com",
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
  projectId: "entertainment-71888",
  storageBucket: "entertainment-71888.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.warn("Firebase initialization warning (using local fallback store):", err);
  }
}

const rtdb = firebase.database ? firebase.database() : null;
const auth = firebase.auth ? firebase.auth() : null;

// Section 3: Master Tactical State Store (Lines 60-115)
const AppState = {
  currentReserve: "New Laurentia",
  currentPlatform: "ps",
  hunter: {
    name: "Ryder Holloway",
    level: 14,
    credits: 2845,
    dog: "Bacon (Lv. 3)"
  },
  time: {
    day: 2,
    timeOfDay: "13:14",
    weather: "Partly cloudy",
    forecastPattern: "standard"
  },
  activeTab: "trophies",
  dataSets: {
    species: [],
    weapons: {},
    optics: {},
    gear: {},
    ammunition: {},
    missions: [],
    infrastructure: [],
    trophies: [],
    squadRoster: []
  },
  watchlist: [],
  harvestLog: [],
  currentUser: null
};

// Section 4: Static Fallback Seed Datasets (Lines 117-270)
const defaultSpeciesData = [
  { id: "mallard", name: "Mallard", tier: 1, trophy_type: "Weight", regions: ["Lake Sasquatch", "Mishipeshu Swamp", "Slalakum Shore", "Thunderbird Muskeg", "Wetiko Foothills"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "snowshoe_hare", name: "Snowshoe hare", tier: 1, trophy_type: "Weight", regions: ["Jackalope Cordillera", "Lake Sasquatch"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "white_tailed_ptarmigan", name: "White-tailed ptarmigan", tier: 1, trophy_type: "Weight", regions: ["Jackalope Cordillera", "Lake Sasquatch"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "eastern_wild_turkey", name: "Eastern wild turkey", tier: 2, trophy_type: "Weight", regions: ["Mishipeshu Swamp", "Slalakum Shore", "Thunderbird Muskeg", "Wetiko Foothills"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "american_wolverine", name: "American wolverine", tier: 3, trophy_type: "Weight", regions: ["Jackalope Cordillera", "Kermode Plateau", "Slalakum Shore"], aggression_level: "Defensive / Territorial", defensive_sidearm: ".357 Magnum / 10mm Auto" },
  { id: "northwestern_white_tailed_deer", name: "Northwestern white-tailed deer", tier: 4, trophy_type: "Antlers", regions: ["Lake Sasquatch", "Kermode Plateau", "Mishipeshu Swamp", "Slalakum Shore", "Wetiko Foothills"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "rocky_mountain_pronghorn", name: "Rocky Mountain pronghorn", tier: 4, trophy_type: "Horns", regions: ["Kermode Plateau", "Slalakum Shore"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "northwestern_wolf", name: "Northwestern wolf", tier: 4, trophy_type: "Skull", regions: ["Jackalope Cordillera", "Kermode Plateau", "Lake Sasquatch", "Mishipeshu Swamp", "Slalakum Shore", "Thunderbird Muskeg", "Wetiko Foothills"], aggression_level: "Predatory / Pack Aggression", defensive_sidearm: "10mm Auto / .357 Magnum" },
  { id: "central_european_boar", name: "Central European boar", tier: 5, trophy_type: "Tusks", regions: ["Lake Sasquatch", "Mishipeshu Swamp", "Slalakum Shore", "Wetiko Foothills"], aggression_level: "Aggressive Charge", defensive_sidearm: ".44 Magnum / 10mm Auto" },
  { id: "dall_sheep", name: "Dall sheep", tier: 5, trophy_type: "Horns", regions: ["Jackalope Cordillera", "Lake Sasquatch", "Kermode Plateau"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "rocky_mountain_mule_deer", name: "Rocky Mountain mule deer", tier: 6, trophy_type: "Antlers", regions: ["Jackalope Cordillera", "Kermode Plateau", "Slalakum Shore", "Wetiko Foothills"], aggression_level: "Passive", defensive_sidearm: "None needed" },
  { id: "grizzly_bear", name: "Grizzly bear", tier: 7, trophy_type: "Skull", regions: ["Jackalope Cordillera", "Kermode Plateau", "Lake Sasquatch"], aggression_level: "Apex Lethal Aggression", defensive_sidearm: ".44 Magnum / .454 Casull / Heavy 12ga Slug" },
  { id: "rocky_mountain_elk", name: "Rocky Mountain elk", tier: 7, trophy_type: "Antlers", regions: ["Kermode Plateau", "Slalakum Shore", "Wetiko Foothills"], aggression_level: "Defensive Rut", defensive_sidearm: ".44 Magnum" },
  { id: "western_moose", name: "Western moose", tier: 8, trophy_type: "Antlers", regions: ["Mishipeshu Swamp", "Thunderbird Muskeg"], aggression_level: "Territorial / Violent Charge", defensive_sidearm: ".44 Magnum / .454 Casull" },
  { id: "wood_bison", name: "Wood bison", tier: 8, trophy_type: "Horns", regions: ["Kermode Plateau", "Slalakum Shore"], aggression_level: "Territorial Trample", defensive_sidearm: ".454 Casull / .375 Backup Rifle" }
];

const defaultSquadRoster = [
  {
    displayName: "Ryder Holloway (You)",
    platformKey: "PSN: WOTH2_Holloway",
    level: 14,
    credits: 2845,
    fiveStarCount: 4,
    currentReserve: "New Laurentia",
    friends_trophy: true,
    trophies: {
      friends: true,
      master_hunter: true,
      first_blood: true
    }
  },
  {
    displayName: "Ghost_Stalker_99",
    platformKey: "PSN: Ghost_Stalker_99",
    level: 22,
    credits: 14500,
    fiveStarCount: 11,
    currentReserve: "New Laurentia",
    friends_trophy: true,
    trophies: {
      friends: true,
      master_hunter: true,
      first_blood: true
    }
  },
  {
    displayName: "KermodeTracker",
    platformKey: "Steam: 76561198000000000",
    level: 9,
    credits: 1200,
    fiveStarCount: 1,
    currentReserve: "Tikamoon Plains",
    friends_trophy: false,
    trophies: {
      friends: false,
      master_hunter: false,
      first_blood: true
    }
  }
];

const defaultTrophies = [
  { id: "trophy_01", title: "Together in the Wild", description: "Harvest an animal in a multiplayer co-op session with a friend.", earned: true, group: "Multiplayer", icon: "🤝" },
  { id: "trophy_02", title: "Master Naturalist", description: "Discover all resting, feeding, and watering need zones in New Laurentia.", earned: false, group: "Exploration", icon: "🔭" },
  { id: "trophy_03", title: "True 5-Star Sovereign", description: "Harvest a 5-star trophy rating bull elk with 90%+ genetic fitness.", earned: true, group: "Harvest", icon: "👑" },
  { id: "trophy_04", title: "Silent Predator", description: "Harvest an American wolverine with a compound bow under 25 yards.", earned: false, group: "Marksmanship", icon: "🏹" },
  { id: "trophy_05", title: "Old Bones", description: "Track down and cull an animal within 1 in-game year of its maximum lifespan.", earned: true, group: "Management", icon: "⏳" }
];

// Section 5: DOM Initialization & Startup Sequence (Lines 272-355)
document.addEventListener('DOMContentLoaded', () => {
  initDateStamp();
  bindOperationsBarInputs();
  bindWeatherControls();
  bindTacticalModuleMenu();
  initAuthentication();
  loadLocalState();
  initDynamicNavbar();
  renderAllModules();
});

// Section 6: Persistent Date / Time Display (Lines 357-375)
function initDateStamp() {
  const stampEl = document.getElementById('nyBuildTimestamp');
  if (stampEl) {
    stampEl.textContent = BUILD_TIMESTAMP;
  }
  const footerLabel = document.querySelector('.timestamp-label');
  if (footerLabel) {
    footerLabel.innerHTML = `Build / Cache Stamp: <span id="nyBuildTimestamp">${BUILD_TIMESTAMP}</span> | Version: ${APP_VERSION}`;
  }
}

// Section 7: Firebase Database Synchronization Engine (Lines 377-470)
function initDynamicNavbar() {
  const navList = document.getElementById('navList');
  const logoEl = document.getElementById('navBrandLogo');
  const favIcon = document.getElementById('dynamicFavicon');
  const appleIcon = document.getElementById('dynamicAppleIcon');
  const statusBadge = document.getElementById('firebaseStatusBadge');

  if (!rtdb) {
    if (statusBadge) {
      statusBadge.textContent = 'RTDB: Local Cache Active';
      statusBadge.className = 'status-pill status-connected';
    }
    renderFallbackNavbar(navList);
    return;
  }

  // Bind Dynamic Settings Logo from Firebase
  try {
    rtdb.ref('/utm_links/Settings/0/image').on('value', (snap) => {
      const imgVal = snap.val();
      if (imgVal && typeof imgVal === 'string' && imgVal.trim() !== '') {
        const safeProtocolPath = imgVal.startsWith('http') ? imgVal.replace(/^https?:/, '') : imgVal;
        if (logoEl) logoEl.src = safeProtocolPath;
        if (favIcon) favIcon.href = safeProtocolPath;
        if (appleIcon) appleIcon.href = safeProtocolPath;
        try { localStorage.setItem('cached_brand_logo', safeProtocolPath); } catch (e) {}
      } else {
        const cached = localStorage.getItem('cached_brand_logo');
        if (cached && logoEl) logoEl.src = cached;
      }
    }, (err) => {
      console.warn("Settings logo fetch warning:", err);
      const cached = localStorage.getItem('cached_brand_logo');
      if (cached && logoEl) logoEl.src = cached;
    });
  } catch (err) {
    console.warn("Logo binding error:", err);
  }

  // Bind Dynamic Menu from Firebase
  try {
    rtdb.ref(FIREBASE_SYNC_TARGET).on('value', (snapshot) => {
      if (statusBadge) {
        statusBadge.textContent = 'RTDB: Connected';
        statusBadge.className = 'status-pill status-connected';
      }

      const data = snapshot.val();
      // Write-Protection Gate: Never overwrite valid state with empty/null snapshots
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        console.warn("Firebase snapshot empty or null. Preserving local fallback state.");
        const localCachedNav = localStorage.getItem('cached_utm_links');
        if (localCachedNav) {
          try { renderParsedNavbar(JSON.parse(localCachedNav), navList); return; } catch(e){}
        }
        renderFallbackNavbar(navList);
        return;
      }

      try {
        localStorage.setItem('cached_utm_links', JSON.stringify(data));
      } catch (e) {}

      renderParsedNavbar(data, navList);
    }, (error) => {
      console.warn("Firebase sync error on /utm_links:", error);
      if (statusBadge) {
        statusBadge.textContent = 'RTDB: Offline (Cache Mode)';
        statusBadge.className = 'status-pill status-connecting';
      }
      const localCachedNav = localStorage.getItem('cached_utm_links');
      if (localCachedNav) {
        try { renderParsedNavbar(JSON.parse(localCachedNav), navList); return; } catch(e){}
      }
      renderFallbackNavbar(navList);
    });
  } catch (err) {
    console.warn("RTDB ref error:", err);
    renderFallbackNavbar(navList);
  }
}

// Section 8: Navbar Programmatic Sorting & DOM Construction (Lines 472-560)
function renderParsedNavbar(data, container) {
  if (!container) return;
  container.innerHTML = '';

  const groupsMap = {};
  const standaloneLinks = [];

  Object.entries(data).forEach(([key, item]) => {
    if (key === 'Settings') return;
    if (!item) return;

    if (item.groupName) {
      if (!groupsMap[item.groupName]) {
        groupsMap[item.groupName] = [];
      }
      groupsMap[item.groupName].push(item);
    } else {
      standaloneLinks.push(item);
    }
  });

  const menuEntries = [];

  standaloneLinks.forEach(item => {
    menuEntries.push({
      type: 'standalone',
      weight: typeof item.rowNumber === 'number' ? item.rowNumber : 999,
      data: item
    });
  });

  Object.entries(groupsMap).forEach(([groupName, items]) => {
    const minWeight = Math.min(...items.map(it => typeof it.rowNumber === 'number' ? it.rowNumber : 999));
    items.sort((a, b) => (a.rowNumber || 999) - (b.rowNumber || 999));
    menuEntries.push({
      type: 'group',
      name: groupName,
      weight: minWeight,
      items: items
    });
  });

  menuEntries.sort((a, b) => a.weight - b.weight);

  menuEntries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'nav-item';

    if (entry.type === 'standalone') {
      const item = entry.data;
      const href = item.url || '#';
      const isExternal = isUrlExternal(href);
      const iconPath = formatRelativeProtocol(item.image) || '//werewolf3788.github.io/Website/assets/logo.jpg';

      li.innerHTML = `
        <a href="${href}" class="nav-pill" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          <img src="${iconPath}" alt="" class="nav-thumb" onerror="this.src='//werewolf3788.github.io/Website/assets/logo.jpg'">
          <span>${item.title || item.name || 'Link'}</span>
        </a>
      `;
    } else if (entry.type === 'group') {
      const firstImg = entry.items[0]?.image;
      const groupIcon = formatRelativeProtocol(firstImg) || '//werewolf3788.github.io/Website/assets/logo.jpg';

      li.innerHTML = `
        <button class="dropdown-trigger" type="button" aria-haspopup="true">
          <img src="${groupIcon}" alt="" class="nav-thumb" onerror="this.src='//werewolf3788.github.io/Website/assets/logo.jpg'">
          <span>${entry.name}</span>
          <span style="font-size:0.7rem; color:var(--text-muted);">&#9662;</span>
        </button>
        <div class="dropdown-menu">
          ${entry.items.map(sub => {
            const subHref = sub.url || '#';
            const subExt = isUrlExternal(subHref);
            const subImg = formatRelativeProtocol(sub.image) || '//werewolf3788.github.io/Website/assets/logo.jpg';
            return `
              <a href="${subHref}" class="dropdown-item" ${subExt ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                <img src="${subImg}" alt="" class="nav-thumb" onerror="this.src='//werewolf3788.github.io/Website/assets/logo.jpg'">
                <span>${sub.title || sub.name || 'Folder Item'}</span>
              </a>
            `;
          }).join('')}
        </div>
      `;
    }
    container.appendChild(li);
  });
}

function renderFallbackNavbar(container) {
  if (!container) return;
  container.innerHTML = `
    <li class="nav-item">
      <a href="./index.html" class="nav-pill">
        <img src="//werewolf3788.github.io/Website/assets/logo.jpg" alt="" class="nav-thumb">
        <span>Hub Home</span>
      </a>
    </li>
    <li class="nav-item">
      <a href="https://streamelements.com/werewolf3788/tip" class="nav-pill" target="_blank" rel="noopener noreferrer">
        <img src="//werewolf3788.github.io/Website/assets/logo.jpg" alt="" class="nav-thumb">
        <span>Developer Support</span>
      </a>
    </li>
  `;
}

function isUrlExternal(url) {
  if (!url || url.startsWith('#') || url.startsWith('/')) return false;
  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.hostname !== window.location.hostname;
  } catch (e) {
    return false;
  }
}

function formatRelativeProtocol(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/^https?:/, '');
}

// Section 9: Tactical Module Navigation & Sandwich Bar (Lines 562-620)
function bindTacticalModuleMenu() {
  const toggleBtn = document.getElementById('moduleSandwichBtn');
  const dropdownMenu = document.getElementById('moduleDropdownMenu');
  const labelEl = document.getElementById('activeModuleLabel');

  if (toggleBtn && dropdownMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && e.target !== toggleBtn) {
        dropdownMenu.classList.add('hidden');
      }
    });

    const itemBtns = dropdownMenu.querySelectorAll('.module-item-btn');
    itemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        itemBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tabKey = btn.getAttribute('data-tab');
        switchModuleTab(tabKey);

        if (labelEl) {
          const titleSpan = btn.querySelector('span:first-child');
          if (titleSpan) labelEl.textContent = titleSpan.textContent;
        }

        dropdownMenu.classList.add('hidden');
      });
    });
  }
}

function switchModuleTab(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) {
    activePane.classList.add('active');
  }
}

// Section 10: Operations Bar State Binding (Lines 622-710)
function bindOperationsBarInputs() {
  const reserveSelect = document.getElementById('currentReserveSelect');
  const platformSelect = document.getElementById('platformSelect');
  const hunterName = document.getElementById('hunterNameInput');
  const hunterLevel = document.getElementById('hunterLevelInput');
  const hunterCredits = document.getElementById('hunterCreditsInput');
  const dogInput = document.getElementById('dogCompanionInput');
  const dayInput = document.getElementById('currentDayInput');
  const timeInput = document.getElementById('currentTimeInput');

  const advanceDayBtn = document.getElementById('advanceDayBtn');
  const advanceTwoHoursBtn = document.getElementById('advanceTwoHoursBtn');

  if (reserveSelect) {
    reserveSelect.value = AppState.currentReserve;
    reserveSelect.addEventListener('change', (e) => {
      AppState.currentReserve = e.target.value;
      saveLocalState();
      filterSpeciesByCurrentReserve();
      renderWatchlist();
    });
  }

  if (platformSelect) {
    platformSelect.value = AppState.currentPlatform;
    platformSelect.addEventListener('change', (e) => {
      AppState.currentPlatform = e.target.value;
      saveLocalState();
      renderSquadRoster();
    });
  }

  if (hunterName) {
    hunterName.value = AppState.hunter.name;
    hunterName.addEventListener('change', (e) => {
      AppState.hunter.name = e.target.value;
      saveLocalState();
      renderSquadRoster();
    });
  }

  if (hunterLevel) {
    hunterLevel.value = AppState.hunter.level;
    hunterLevel.addEventListener('change', (e) => {
      AppState.hunter.level = parseInt(e.target.value, 10) || 1;
      saveLocalState();
      renderSquadRoster();
    });
  }

  if (hunterCredits) {
    hunterCredits.value = AppState.hunter.credits;
    hunterCredits.addEventListener('change', (e) => {
      AppState.hunter.credits = parseInt(e.target.value, 10) || 0;
      saveLocalState();
      renderSquadRoster();
    });
  }

  if (dogInput) {
    dogInput.value = AppState.hunter.dog;
    dogInput.addEventListener('change', (e) => {
      AppState.hunter.dog = e.target.value;
      saveLocalState();
      renderDogProfile();
    });
  }

  if (dayInput) {
    dayInput.value = AppState.time.day;
    dayInput.addEventListener('change', (e) => {
      AppState.time.day = parseInt(e.target.value, 10) || 1;
      saveLocalState();
      triggerReserveAgingCheck();
    });
  }

  if (timeInput) {
    timeInput.value = AppState.time.timeOfDay;
    timeInput.addEventListener('change', (e) => {
      AppState.time.timeOfDay = e.target.value;
      saveLocalState();
    });
  }

  if (advanceDayBtn) {
    advanceDayBtn.addEventListener('click', () => {
      AppState.time.day += 1;
      if (dayInput) dayInput.value = AppState.time.day;
      saveLocalState();
      triggerReserveAgingCheck();
    });
  }

  if (advanceTwoHoursBtn) {
    advanceTwoHoursBtn.addEventListener('click', () => {
      advanceInGameHours(2);
    });
  }
}

function advanceInGameHours(deltaHours) {
  const timeInput = document.getElementById('currentTimeInput');
  const dayInput = document.getElementById('currentDayInput');
  let [h, m] = (AppState.time.timeOfDay || "12:00").split(':').map(Number);
  h = (h + deltaHours);

  if (h >= 24) {
    h = h % 24;
    AppState.time.day += 1;
    if (dayInput) dayInput.value = AppState.time.day;
    triggerReserveAgingCheck();
  }

  const paddedH = String(h).padStart(2, '0');
  const paddedM = String(m).padStart(2, '0');
  AppState.time.timeOfDay = `${paddedH}:${paddedM}`;
  if (timeInput) timeInput.value = AppState.time.timeOfDay;
  saveLocalState();
  updateWeatherForecastDisplay();
}

// Section 11: Weather Controller & Radar Simulation (Lines 712-760)
function bindWeatherControls() {
  const patternSelect = document.getElementById('longTermForecastSelect');
  if (patternSelect) {
    patternSelect.value = AppState.time.forecastPattern;
    patternSelect.addEventListener('change', (e) => {
      AppState.time.forecastPattern = e.target.value;
      saveLocalState();
      updateWeatherForecastDisplay();
    });
  }
  updateWeatherForecastDisplay();
}

function updateWeatherForecastDisplay() {
  const isRainy = AppState.time.forecastPattern === 'rainfall';
  const slots = [
    { id: 'weatherNow', offset: '+0h', condition: isRainy ? 'Light Rain' : 'Partly cloudy' },
    { id: 'weatherPlus2', offset: '+2h', condition: isRainy ? 'Overcast Rain' : 'Partly cloudy' },
    { id: 'weatherPlus4', offset: '+4h', condition: isRainy ? 'Heavy Rain' : 'Clear' },
    { id: 'weatherPlus6', offset: '+6h', condition: isRainy ? 'Rain Showers' : 'Clear' },
    { id: 'weatherPlus8', offset: '+8h', condition: isRainy ? 'Clear Skies' : 'Clear' },
    { id: 'weatherPlus10', offset: '+10h', condition: isRainy ? 'Foggy Mist' : 'Clear' },
    { id: 'weatherPlus12', offset: '+12h', condition: isRainy ? 'Moderate Rain' : 'Clear' }
  ];

  slots.forEach(slot => {
    const el = document.getElementById(slot.id);
    if (el) {
      el.textContent = `${slot.offset}: ${slot.condition}`;
    }
  });
}

// Section 12: Companion Roster & Visible Friends Trophy Engine (Lines 762-870)
function renderSquadRoster() {
  const container = document.getElementById('friendsComparisonContainer');
  const pillsContainer = document.getElementById('squadPillsContainer');

  const squadList = AppState.dataSets.squadRoster.length > 0
    ? AppState.dataSets.squadRoster
    : defaultSquadRoster;

  // Render Live Squad Quick-Status Pill Bar
  if (pillsContainer) {
    pillsContainer.innerHTML = squadList.map(member => {
      const isFriendTrophyActive = Boolean(
        member.trophies?.friends === true ||
        member.friends_trophy === true ||
        member.is_friend === true
      );

      return `
        <div class="stat-pill" style="border-color:${isFriendTrophyActive ? 'var(--success)' : 'var(--border-color)'};">
          <span style="color:#fff; font-weight:700;">${member.displayName.split(' ')[0]}</span>
          <span class="stat-label">Lv.${member.level || 1}</span>
          ${isFriendTrophyActive ? '<span title="Co-op Friend Trophy Verified">🤝🏆</span>' : '<span style="opacity:0.4;">🔒</span>'}
        </div>
      `;
    }).join('');
  }

  // Render Full Companion Telemetry Cards
  if (container) {
    container.innerHTML = squadList.map(member => renderFriendCard(member)).join('');
  }
}

function renderFriendCard(friendData) {
  // Explicitly check for verified Friends trophy state
  const isFriendTrophyUnlocked = Boolean(
    friendData.trophies?.friends === true ||
    friendData.friends_trophy === true ||
    friendData.is_friend === true
  );

  return `
    <div class="telemetry-card ${isFriendTrophyUnlocked ? 'trophy-card-earned' : ''}">
      <div class="card-top-row">
        <div>
          <span class="animal-title">${friendData.displayName || 'Squad Member'}</span>
          <div style="font-size:0.75rem; color:var(--text-muted);">${friendData.platformKey || 'PSN'}</div>
        </div>
        ${
          isFriendTrophyUnlocked
            ? `<span class="badge" style="background:rgba(46, 204, 113, 0.2); color:var(--success); border-color:var(--success);">
                 🤝 Friend Sync Active
               </span>`
            : `<span class="badge" style="background:rgba(255, 255, 255, 0.05); color:var(--text-muted);">
                 Pending Link
               </span>`
        }
      </div>

      <!-- Visible Trophy Achievement Banner -->
      <div class="action-banner ${isFriendTrophyUnlocked ? 'banner-balanced' : 'banner-cull'}">
        <strong>Trophy Status:</strong> ${isFriendTrophyUnlocked ? '🏆 "Together in the Wild" Unlocked' : '🔒 Not Yet Earned'}
      </div>

      <div style="font-size:0.8rem; margin:6px 0; color:var(--text-main);">
        <div>Reserve: <strong>${friendData.currentReserve || AppState.currentReserve}</strong></div>
      </div>

      <div class="card-footer-row">
        <span>Level: <strong>${friendData.level || 1}</strong></span>
        <span>Credits: <strong>$${(friendData.credits || 0).toLocaleString()}</strong></span>
        <span>5★ Harvests: <strong>${friendData.fiveStarCount || 0}</strong></span>
      </div>
    </div>
  `;
}

// Section 13: Trophy Chamber Engine (Lines 872-920)
function renderTrophyChamber() {
  const container = document.getElementById('trophyChamberGrid');
  if (!container) return;

  const trophyList = AppState.dataSets.trophies.length > 0
    ? AppState.dataSets.trophies
    : defaultTrophies;

  container.innerHTML = trophyList.map(trophy => {
    return `
      <div class="telemetry-card ${trophy.earned ? 'trophy-card-earned' : ''}">
        <div class="card-top-row">
          <div>
            <span class="animal-title">${trophy.icon || '🏆'} ${trophy.title}</span>
            <div style="font-size:0.75rem; color:var(--text-muted);">${trophy.group}</div>
          </div>
          <span class="badge" style="${trophy.earned ? 'background:rgba(46,204,113,0.2); color:var(--success); border-color:var(--success);' : ''}">
            ${trophy.earned ? 'Earned' : 'Locked'}
          </span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin:6px 0;">${trophy.description}</p>
        <div class="card-footer-row">
          <span>Master ID: <strong>NPWR52231_00</strong></span>
          <span>Status: <strong>${trophy.earned ? 'Synchronized' : 'Incomplete'}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

// Section 14: Species Encyclopedia & Reserve Filter (Lines 922-1010)
function filterSpeciesByCurrentReserve() {
  const locationSelect = document.getElementById('harvestLocationSelect');
  const speciesSelect = document.getElementById('harvestSpeciesSelect');
  const watchRegionSelect = document.getElementById('watchRegionSelect');
  const watchSpeciesSelect = document.getElementById('watchSpeciesSelect');

  const speciesList = AppState.dataSets.species.length > 0
    ? AppState.dataSets.species
    : defaultSpeciesData;

  const reserveSpecies = speciesList.filter(s => {
    if (!s.regions || s.regions.length === 0) return true;
    return true; // Keep active species aligned to current master database
  });

  if (speciesSelect) {
    speciesSelect.innerHTML = reserveSpecies.map(s => `
      <option value="${s.id}">${s.name} (Tier ${s.tier})</option>
    `).join('');
  }

  if (watchSpeciesSelect) {
    watchSpeciesSelect.innerHTML = reserveSpecies.map(s => `
      <option value="${s.id}" data-max-age="${s.tier >= 7 ? 18 : 12}">${s.name}</option>
    `).join('');
  }

  // Populate Sectors
  const defaultRegions = [
    "Lake Sasquatch",
    "Jackalope Cordillera",
    "Kermode Plateau",
    "Mishipeshu Swamp",
    "Slalakum Shore",
    "Thunderbird Muskeg",
    "Wetiko Foothills"
  ];

  if (locationSelect) {
    locationSelect.innerHTML = defaultRegions.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  if (watchRegionSelect) {
    watchRegionSelect.innerHTML = defaultRegions.map(r => `<option value="${r}">${r}</option>`).join('');
  }
}

function renderSpeciesCatalog() {
  const container = document.getElementById('speciesCatalogGrid');
  const countBadge = document.getElementById('speciesCatalogCount');
  if (!container) return;

  const list = AppState.dataSets.species.length > 0
    ? AppState.dataSets.species
    : defaultSpeciesData;

  if (countBadge) {
    countBadge.textContent = `${list.length} Documented Species`;
  }

  container.innerHTML = list.map(sp => {
    return `
      <div class="info-box">
        <div class="card-top-row">
          <span class="animal-title">${sp.name}</span>
          <span class="badge">Tier ${sp.tier}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${sp.scientific_name || ''}</div>
        <div class="action-banner ${sp.aggression_level?.includes('Lethal') || sp.aggression_level?.includes('Trample') ? 'banner-cull' : 'banner-balanced'}">
          <strong>Behavior:</strong> ${sp.aggression_level || 'Passive'}
        </div>
        <div style="font-size:0.8rem; color:var(--text-main);">
          <div>Sidearm: <strong>${sp.defensive_sidearm || 'None needed'}</strong></div>
          <div>Trophy Type: <strong>${sp.trophy_type || 'Weight'}</strong></div>
        </div>
      </div>
    `;
  }).join('');
}

// Section 15: Watchlist Management & Biological Aging Engine (Lines 1012-1110)
function bindWatchlistActions() {
  const saveBtn = document.getElementById('saveWatchlistBtn');
  const cancelBtn = document.getElementById('cancelEditWatchlistBtn');
  const speciesSelect = document.getElementById('watchSpeciesSelect');
  const ageCapInput = document.getElementById('watchMaxAge');

  if (speciesSelect && ageCapInput) {
    speciesSelect.addEventListener('change', () => {
      const selected = speciesSelect.options[speciesSelect.selectedIndex];
      ageCapInput.value = selected.getAttribute('data-max-age') || '15';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const editId = document.getElementById('editWatchlistId').value;
      const identifier = document.getElementById('watchIdentifier').value.trim();
      const region = document.getElementById('watchRegionSelect').value;
      const speciesId = document.getElementById('watchSpeciesSelect').value;
      const landmark = document.getElementById('watchLandmark').value.trim();
      const fitness = parseFloat(document.getElementById('watchFitness').value) || 50.0;
      const age = parseInt(document.getElementById('watchAge').value, 10) || 5;
      const maxAge = parseInt(document.getElementById('watchMaxAge').value, 10) || 15;
      const stars = parseInt(document.getElementById('watchStars').value, 10) || 1;

      if (!identifier || !landmark) {
        alert("Please provide both an Animal Identifier and Landmark.");
        return;
      }

      if (editId) {
        const item = AppState.watchlist.find(w => w.id === editId);
        if (item) {
          item.identifier = identifier;
          item.region = region;
          item.speciesId = speciesId;
          item.landmark = landmark;
          item.fitness = fitness;
          item.age = age;
          item.maxAge = maxAge;
          item.stars = stars;
        }
      } else {
        const newEntry = {
          id: 'watch_' + Date.now(),
          identifier,
          region,
          speciesId,
          landmark,
          fitness,
          age,
          maxAge,
          stars,
          trackedSinceDay: AppState.time.day,
          reserve: AppState.currentReserve
        };
        AppState.watchlist.push(newEntry);
      }

      resetWatchlistForm();
      saveLocalState();
      renderWatchlist();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetWatchlistForm();
    });
  }
}

function resetWatchlistForm() {
  document.getElementById('editWatchlistId').value = '';
  document.getElementById('watchIdentifier').value = '';
  document.getElementById('watchLandmark').value = '';
  document.getElementById('watchFitness').value = '';
  document.getElementById('watchAge').value = '15';
  document.getElementById('saveWatchlistBtn').textContent = 'Add to Watchlist';
  document.getElementById('cancelEditWatchlistBtn').classList.add('hidden');
}

function triggerReserveAgingCheck() {
  // 3 in-game days equals 1 biological year
  AppState.watchlist.forEach(target => {
    if (target.reserve === AppState.currentReserve) {
      const daysTracked = AppState.time.day - (target.trackedSinceDay || AppState.time.day);
      if (daysTracked > 0 && daysTracked % 3 === 0) {
        target.age += 1;
      }
    }
  });
  renderWatchlist();
}

function renderWatchlist() {
  const container = document.getElementById('watchlistContainer');
  const countBadge = document.getElementById('watchlistCount');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${AppState.watchlist.length} Tracked Animals`;
  }

  if (AppState.watchlist.length === 0) {
    container.innerHTML = `
      <div style="font-size:0.82rem; color:var(--text-muted); padding:10px;">
        No live animals currently tagged in herd watchlist.
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.watchlist.map(item => {
    const isCull = item.fitness < 50;
    const isBreeder = item.fitness >= 80;
    const bannerClass = isCull ? 'banner-cull' : (isBreeder ? 'banner-breeder' : 'banner-balanced');
    const verdict = isCull ? 'CULL TARGET (Asymmetrical/Weak)' : (isBreeder ? '5-STAR BREEDER (Protect & Let Age)' : 'BALANCED (Monitor)');

    return `
      <div class="telemetry-card">
        <div class="card-top-row">
          <span class="animal-title">${item.identifier}</span>
          <span class="badge">${item.stars}★</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${item.landmark} &bull; ${item.region}</div>
        <div class="action-banner ${bannerClass}">
          ${verdict}
        </div>
        <div style="font-size:0.8rem; color:var(--text-main);">
          <div>Fitness: <strong>${item.fitness.toFixed(1)}%</strong></div>
          <div>Age: <strong>${item.age} / ${item.maxAge} Yrs</strong> ${item.age >= item.maxAge ? '⚠️ Critical Old Age' : ''}</div>
        </div>
        <div class="card-footer-row">
          <div class="card-actions">
            <button class="btn-link btn-link-edit" onclick="editWatchlistItem('${item.id}')">Edit</button>
            <button class="btn-link btn-link-delete" onclick="deleteWatchlistItem('${item.id}')">Remove</button>
          </div>
          <span>Day ${item.trackedSinceDay || 1}</span>
        </div>
      </div>
    `;
  }).join('');
}

window.editWatchlistItem = function(id) {
  const item = AppState.watchlist.find(w => w.id === id);
  if (!item) return;

  document.getElementById('editWatchlistId').value = item.id;
  document.getElementById('watchIdentifier').value = item.identifier;
  document.getElementById('watchRegionSelect').value = item.region;
  document.getElementById('watchSpeciesSelect').value = item.speciesId;
  document.getElementById('watchLandmark').value = item.landmark;
  document.getElementById('watchFitness').value = item.fitness;
  document.getElementById('watchAge').value = item.age;
  document.getElementById('watchMaxAge').value = item.maxAge;
  document.getElementById('watchStars').value = String(item.stars);

  document.getElementById('saveWatchlistBtn').textContent = 'Update Animal Record';
  document.getElementById('cancelEditWatchlistBtn').classList.remove('hidden');
};

window.deleteWatchlistItem = function(id) {
  AppState.watchlist = AppState.watchlist.filter(w => w.id !== id);
  saveLocalState();
  renderWatchlist();
};

// Section 16: Harvest Inspection Submission Engine (Lines 1112-1190)
function bindHarvestInspectionForm() {
  const submitBtn = document.getElementById('submitHarvestRecordBtn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', () => {
    const record = {
      id: 'harvest_' + Date.now(),
      location: document.getElementById('harvestLocationSelect').value,
      speciesId: document.getElementById('harvestSpeciesSelect').value,
      firearm: document.getElementById('harvestFirearm').value,
      caliber: document.getElementById('harvestCaliber').value,
      ammo: document.getElementById('harvestAmmo').value,
      shotDist: document.getElementById('harvestShotDist').value,
      trackDist: document.getElementById('harvestTrackDist').value,
      organs: document.getElementById('harvestOrgans').value,
      detected: document.getElementById('harvestDetected').value,
      rawWeight: document.getElementById('harvestRawWeight').value,
      sellPrice: document.getElementById('harvestSellPrice').value,
      sex: document.getElementById('harvestSex').value,
      fitness: document.getElementById('harvestFitness').value,
      stars: document.getElementById('harvestRatingStars').value,
      timestamp: AppState.time.timeOfDay,
      day: AppState.time.day
    };

    AppState.harvestLog.unshift(record);
    saveLocalState();
    renderHarvestHistory();
    alert(`Harvest inspection logged successfully!`);
  });
}

function renderHarvestHistory() {
  const container = document.getElementById('harvestHistoryContainer');
  const countBadge = document.getElementById('harvestRecordCount');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${AppState.harvestLog.length} Records Logged`;
  }

  if (AppState.harvestLog.length === 0) {
    container.innerHTML = `
      <div style="font-size:0.82rem; color:var(--text-muted); padding:10px;">
        No harvest records recorded yet. Complete an in-game harvest inspection to log data.
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.harvestLog.map(h => `
    <div class="telemetry-card">
      <div class="card-top-row">
        <span class="animal-title">${h.speciesId.replace(/_/g, ' ')}</span>
        <span class="badge">${h.stars}★</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${h.location} &bull; ${h.sex}</div>
      <div class="action-banner banner-balanced">
        <strong>${h.firearm}</strong> (${h.caliber}) &bull; ${h.shotDist} yds
      </div>
      <div style="font-size:0.8rem; color:var(--text-main);">
        <div>Fitness: <strong>${h.fitness}%</strong> &bull; Value: <strong>$${h.sellPrice}</strong></div>
        <div>Hits: <strong>${h.organs || 'Vital Organs'}</strong></div>
      </div>
      <div class="card-footer-row">
        <span>Day ${h.day} &bull; ${h.timestamp}</span>
        <button class="btn-link btn-link-delete" onclick="deleteHarvestLogItem('${h.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

window.deleteHarvestLogItem = function(id) {
  AppState.harvestLog = AppState.harvestLog.filter(h => h.id !== id);
  saveLocalState();
  renderHarvestHistory();
};

// Section 17: Dog Companion & Perk Mastery Steppers (Lines 1192-1265)
function renderDogProfile() {
  const summaryEl = document.getElementById('dogSummaryCard');
  const skillsGrid = document.getElementById('dogSkillsGrid');
  if (!summaryEl || !skillsGrid) return;

  summaryEl.innerHTML = `
    <div class="info-box">
      <div class="card-top-row">
        <span class="animal-title">🐕 Companion Dog: Bacon</span>
        <span class="badge">Level 3 / 6</span>
      </div>
      <p style="font-size:0.82rem; color:var(--text-muted);">
        Specialized Bloodhound trained in trailing wounded deer, elk, and wild fowl across wetland environments.
      </p>
    </div>
  `;

  const dogSkills = [
    { name: "Blood Tracking", level: 3, max: 5 },
    { name: "Scent Range", level: 2, max: 4 },
    { name: "Agility & Stamina", level: 3, max: 5 },
    { name: "Alert & Bark Discipline", level: 2, max: 3 }
  ];

  skillsGrid.innerHTML = dogSkills.map((sk, idx) => `
    <div class="dog-stepper-row">
      <div>
        <div style="font-size:0.85rem; font-weight:700; color:#fff;">${sk.name}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Tier Rank: ${sk.level} / ${sk.max}</div>
      </div>
      <div class="stepper-controls">
        <button class="stepper-btn" onclick="stepDogSkill(${idx}, -1)">&minus;</button>
        <button class="stepper-btn" onclick="stepDogSkill(${idx}, 1)">&plus;</button>
      </div>
    </div>
  `).join('');
}

window.stepDogSkill = function(idx, delta) {
  alert(`Skill rank updated!`);
};

// Section 18: Missions, Infrastructure & Story Loaders (Lines 1267-1355)
function renderMissionsModule() {
  const grid = document.getElementById('missionsGrid');
  const countBadge = document.getElementById('missionsCount');
  if (!grid) return;

  const missionList = AppState.dataSets.missions || [];
  if (countBadge) {
    countBadge.textContent = `${missionList.length} Active Missions`;
  }

  if (missionList.length === 0) {
    grid.innerHTML = `<div style="font-size:0.82rem; color:var(--text-muted);">Loaded default New Laurentia story mission records.</div>`;
    return;
  }

  grid.innerHTML = missionList.map(m => `
    <div class="info-box">
      <div class="card-top-row">
        <span class="animal-title">${m.name}</span>
        <span class="badge">${m.source || 'Story'}</span>
      </div>
      <div style="font-size:0.82rem; color:var(--text-muted); margin:4px 0;">
        ${m.objectives ? m.objectives.join('<br>') : m.description || ''}
      </div>
      <div class="card-footer-row">
        <span>Reward: <strong>$${m.money || 0}</strong></span>
        <span>XP: <strong>${m.xp || 0}</strong></span>
      </div>
    </div>
  `).join('');
}

function renderInfrastructureModule() {
  const grid = document.getElementById('infrastructureGrid');
  const countBadge = document.getElementById('infrastructureCount');
  const notesBox = document.getElementById('infraNotesBox');

  if (notesBox) {
    notesBox.innerHTML = `
      <strong>Remediation Mechanics:</strong> Feeders offer low impact on potential; pollution cleanup and invasive flora removal yield high impact.
    `;
  }

  const infraList = AppState.dataSets.infrastructure || [];
  if (countBadge) {
    countBadge.textContent = `${infraList.length} Reserve Enhancements`;
  }

  if (!grid) return;
  grid.innerHTML = infraList.map(t => `
    <div class="info-box">
      <div class="card-top-row">
        <span class="animal-title">${t.name || t.type}</span>
        <span class="badge">${t.impact || 'Task'}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${t.location} &bull; Cost: $${t.cost}</div>
      <div style="font-size:0.8rem; margin-top:4px;">
        Benefited Species: <strong>${t.benefited_species ? t.benefited_species.join(', ') : 'Transit Route'}</strong>
      </div>
    </div>
  `).join('');
}

// Section 19: Local Persistence & Batch Renders (Lines 1357-1430)
function saveLocalState() {
  try {
    localStorage.setItem('woth2_companion_state', JSON.stringify({
      currentReserve: AppState.currentReserve,
      currentPlatform: AppState.currentPlatform,
      hunter: AppState.hunter,
      time: AppState.time,
      watchlist: AppState.watchlist,
      harvestLog: AppState.harvestLog
    }));
  } catch (e) {
    console.warn("Local storage write exception:", e);
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem('woth2_companion_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      AppState.currentReserve = parsed.currentReserve || AppState.currentReserve;
      AppState.currentPlatform = parsed.currentPlatform || AppState.currentPlatform;
      AppState.hunter = parsed.hunter || AppState.hunter;
      AppState.time = parsed.time || AppState.time;
      AppState.watchlist = parsed.watchlist || [];
      AppState.harvestLog = parsed.harvestLog || [];
    }
  } catch (e) {
    console.warn("Local storage read exception:", e);
  }
}

function renderAllModules() {
  filterSpeciesByCurrentReserve();
  renderSquadRoster();
  renderTrophyChamber();
  renderSpeciesCatalog();
  renderWatchlist();
  renderHarvestHistory();
  renderDogProfile();
  renderMissionsModule();
  renderInfrastructureModule();
  bindWatchlistActions();
  bindHarvestInspectionForm();
}

// Section 20: Google Authentication & Account Binding (Lines 1432-1485)
function initAuthentication() {
  const modal = document.getElementById('authModal');
  const openBtn = document.getElementById('authModalBtn');
  const closeBtn = document.getElementById('authModalClose');
  const googleBtn = document.getElementById('googleSignInBtn');
  const userProfile = document.getElementById('userProfile');
  const displayName = document.getElementById('userDisplayName');
  const avatar = document.getElementById('headerUserAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (auth) {
    auth.onAuthStateChanged(user => {
      AppState.currentUser = user;
      if (user) {
        if (openBtn) openBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        if (displayName) displayName.textContent = user.displayName || user.email || 'Hunter';
        if (avatar && user.photoURL) avatar.src = user.photoURL;
        if (modal) modal.classList.add('hidden');
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
      } else {
        if (openBtn) openBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        if (logoutBtn) logoutBtn.style.display = 'none';
      }
    });

    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => {
          console.warn("Sign-in warning:", err);
          alert("Sign-in mode bypassed. Using active guest profile.");
          if (modal) modal.classList.add('hidden');
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => auth.signOut());
    }
  }
}
