/**
 * settings.js - Dynamic Settings & Menu Controller
 * Stat Watcher Entertainment
 */

// ==========================================
// 1. CONFIGURATION & URLS
// ==========================================
// Replace YOUR_USERNAME and YOUR_REPO with your actual GitHub details
const GITHUB_USERNAME = "YOUR_USERNAME";
const REPO_NAME = "stat-watcher";
const BRANCH = "main";

const REMOTE_SETTINGS_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/www/data/settings.json`;
const LOCAL_FALLBACK_URL = "./data/settings.json";

const STORAGE_KEYS = {
  PREFS: "user_pinned_platforms",
  CONFIG_CACHE: "cached_settings_config"
};

// ==========================================
// 2. CONFIG LOADER (Remote + Local Fallback)
// ==========================================
async function loadSettingsConfig() {
  try {
    // Attempt to fetch fresh data from GitHub (cache-buster prevents stale CDN files)
    const response = await fetch(`${REMOTE_SETTINGS_URL}?_=${Date.now()}`);
    if (!response.ok) throw new Error("GitHub Raw fetch failed");

    const config = await response.json();
    // Cache the fresh config locally
    localStorage.setItem(STORAGE_KEYS.CONFIG_CACHE, JSON.stringify(config));
    return config;
  } catch (err) {
    console.warn("Could not fetch remote settings from GitHub. Falling back...", err);

    // Try reading cached version first
    const cached = localStorage.getItem(STORAGE_KEYS.CONFIG_CACHE);
    if (cached) return JSON.parse(cached);

    // Finally fallback to local file bundled inside the app
    const localResponse = await fetch(LOCAL_FALLBACK_URL);
    return await localResponse.json();
  }
}

// ==========================================
// 3. UI RENDERING: DYNAMIC MENU LINKS
// ==========================================
function renderMenuSections(sections) {
  const container = document.getElementById("settings-sections-container");
  if (!container) return;

  container.innerHTML = "";

  sections.forEach((section) => {
    const sectionCard = document.createElement("div");
    sectionCard.className = "settings-card";

    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "settings-card-title";
    sectionTitle.textContent = section.title;
    sectionCard.appendChild(sectionTitle);

    const list = document.createElement("ul");
    list.className = "settings-list";

    section.links.forEach((linkItem) => {
      const listItem = document.createElement("li");
      listItem.className = "settings-list-item";

      const link = document.createElement("a");
      link.href = linkItem.url;
      link.textContent = linkItem.label;

      // Handle external links (open in browser or new tab)
      if (linkItem.external) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      // Add badge if specified in JSON (e.g. "New", "Beta")
      if (linkItem.badge) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = linkItem.badge;
        link.appendChild(badge);
      }

      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    sectionCard.appendChild(list);
    container.appendChild(sectionCard);
  });
}

// ==========================================
// 4. PLATFORM PINNING (Movies, Music, Games)
// ==========================================
function renderPlatformPinning(platformsConfig, savedPrefs) {
  const container = document.getElementById("platform-pinning-container");
  if (!container || !platformsConfig) return;

  container.innerHTML = "";

  // Categories: movies, music, games
  Object.keys(platformsConfig).forEach((category) => {
    const card = document.createElement("div");
    card.className = "settings-card";

    const title = document.createElement("h3");
    title.className = "settings-card-title";
    title.textContent = `Default ${category.toUpperCase()} Platform`;
    card.appendChild(title);

    const select = document.createElement("select");
    select.className = "platform-select";
    select.dataset.category = category;

    // Default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = `-- Choose preferred ${category} provider --`;
    select.appendChild(defaultOption);

    // Populate platform options
    platformsConfig[category].forEach((platform) => {
      const option = document.createElement("option");
      option.value = platform.id;
      option.textContent = platform.name;

      // Mark selected if matches user's saved preference
      if (savedPrefs[category] === platform.id) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    // Listen for changes
    select.addEventListener("change", (e) => {
      updatePinnedPlatform(category, e.target.value);
    });

    card.appendChild(select);
    container.appendChild(card);
  });
}

// Update pinned platform in localStorage and Cloud
async function updatePinnedPlatform(category, platformId) {
  let prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS)) || {};
  prefs[category] = platformId;

  // 1. Save locally
  localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));

  // 2. Save to Firebase (if available)
  if (window.StorageService && typeof window.StorageService.saveProgress === "function") {
    await window.StorageService.saveProgress("preferences", prefs);
  }

  showToast(`Saved ${platformId || "None"} as your default!`);
}

// ==========================================
// 5. AFFILIATE & APP INFO
// ==========================================
function renderAppMeta(meta) {
  const disclaimerEl = document.getElementById("affiliate-disclaimer");
  const versionEl = document.getElementById("app-version");

  if (disclaimerEl && meta.affiliateDisclaimer) {
    disclaimerEl.textContent = meta.affiliateDisclaimer;
  }

  if (versionEl && meta.version) {
    versionEl.textContent = `v${meta.version}`;
  }
}

// Simple Toast Notification
function showToast(message) {
  const toast = document.getElementById("toast") || createToastElement();
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function createToastElement() {
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = "toast";
  document.body.appendChild(toast);
  return toast;
}

// ==========================================
// 6. INITIALIZATION
// ==========================================
async function initSettings() {
  // 1. Load preferences
  let savedPrefs = {};
  if (window.StorageService && typeof window.StorageService.loadProgress === "function") {
    savedPrefs = (await window.StorageService.loadProgress("preferences")) || {};
  } else {
    savedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS)) || {};
  }

  // 2. Fetch config (GitHub / Local)
  const config = await loadSettingsConfig();

  // 3. Render all UI elements
  if (config.sections) renderMenuSections(config.sections);
  if (config.platforms) renderPlatformPinning(config.platforms, savedPrefs);
  if (config.meta) renderAppMeta(config.meta);
}

// Run as soon as DOM is ready
document.addEventListener("DOMContentLoaded", initSettings);
