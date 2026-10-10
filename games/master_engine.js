// Line 1: Unified Multi-Game Tactical Command Deck Engine
// [Smart Cache-Buster Time: 2026-10-10 05:00 EDT | Firebase Sync Target: /utm_links | Version: 9.3.0]

/* === SECTION 1: Modular Firebase Imports === */
import { initializeApp, getApps } from '//www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from '//www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue, off } from '//www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
  authDomain: "entertainment-71888.firebaseapp.com",
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
  projectId: "entertainment-71888",
  storageBucket: "entertainment-71888.firebasestorage.app",
  messagingSenderId: "660524340277",
  appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
  measurementId: "G-CTYHDF4MSD"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const rtdb = getDatabase(app);
const db = getFirestore(app);

const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";
const GITHUB_SE5_IMG_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/images/";

/* === SECTION 2: Game Registry (Direct JSON in Root) === */
const GAME_REGISTRY = {
  se5: {
    title: "Sniper Elite 5",
    tabLabel: "[🎯 SE5]",
    docId: "sniper-elite-5",
    npCommunicationId: "NPWR21465_00",
    dataFile: "se5.json",
    accentColor: "#ff8800",
    hasMaps: true,
    hasRanks: false,
    posterUrl: ""
  },
  seresistance: {
    title: "Sniper Elite: Resistance",
    tabLabel: "[🇫🇷 Resistance]",
    docId: "sniper-elite-resistance",
    npCommunicationId: "NPWR40813_00",
    dataFile: "seresistance.json",
    accentColor: "#ff5500",
    hasMaps: false,
    hasRanks: false,
    posterUrl: ""
  },
  cotw: {
    title: "theHunter: Call of the Wild",
    tabLabel: "[🦌 COTW]",
    docId: "COTW",
    npCommunicationId: "NPWR13211_00",
    dataFile: "cotw.json",
    accentColor: "#2ecc71",
    hasMaps: false,
    hasRanks: true,
    posterUrl: ""
  }
};

const MISSION_MAP_CONFIG = {
  '7SecretWeapons': { imgUrl: `${GITHUB_SE5_IMG_BASE}Sniper%20Elite%20Secret%20Weapons.JPG`, w: 2048, h: 2048 },
  '8RubbleandRuin': { imgUrl: `${GITHUB_SE5_IMG_BASE}Sniper%20Elite%20Rubble%20and%20Ruin.JPG`, w: 2048, h: 2048 }
};

function getResolvedPrimaryEmail(user) {
  if (!user) return "";
  const google = user.providerData && user.providerData.find(p => p && p.providerId === "google.com");
  if (google && google.email) return google.email.toLowerCase().trim();
  if (user.email) return user.email.toLowerCase().trim();
  return "operative@sniper.local";
}

function getEmailKey(email) {
  if (!email) return "unknown_user";
  return String(email).trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_');
}

function normalizePlatform(inputPlatform) {
  if (!inputPlatform) return 'playstation';
  const clean = String(inputPlatform).toLowerCase().trim();
  if (clean === 'psn' || clean === 'ps' || clean === 'playstation') return 'playstation';
  if (clean === 'steam') return 'steam';
  if (clean === 'pc' || clean === 'windows' || clean === 'microsoft' || clean === 'ms') return 'pc';
  if (clean === 'xbox' || clean === 'xb') return 'xbox';
  return 'playstation';
}

function updateTabFavicon(url, gameTitle, tabLabel) {
  if (!url) return;
  const cleanUrl = url.trim();

  let favicon = document.getElementById("dynamicFavicon");
  let appleIcon = document.getElementById("dynamicAppleIcon");
  const brandLogo = document.getElementById("navBrandLogo");

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.id = "dynamicFavicon";
    favicon.rel = "icon";
    favicon.type = "image/png";
    document.head.appendChild(favicon);
  }
  if (!appleIcon) {
    appleIcon = document.createElement("link");
    appleIcon.id = "dynamicAppleIcon";
    appleIcon.rel = "apple-touch-icon";
    document.head.appendChild(appleIcon);
  }

  favicon.href = cleanUrl;
  appleIcon.href = cleanUrl;
  if (brandLogo) brandLogo.src = cleanUrl;

  document.title = `${tabLabel} ${gameTitle} — Master Tactical Deck`;
}

/* === SECTION 3: Master Engine Object === */
const masterEngine = {
  activeGameKey: localStorage.getItem("deck_active_game") || "se5",
  currentUser: null,
  currentEmail: "",
  currentEmailKey: "",
  currentPlatform: normalizePlatform(localStorage.getItem("deck_platform")),
  psnAccountId: "",
  psnOnlineId: "",

  catalogs: {},
  usersList: [],
  masterCatalog: [],
  userProgressMap: {},
  animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, Fur: 0 },
  collapsedSections: {},
  activeMission: "",

  crossPlatformTelemetry: {
    playstation: { earned: 0, total: 0, percent: 0 },
    xbox: { earned: 0, total: 0, percent: 0 },
    pc: { earned: 0, total: 0, percent: 0 },
    steam: { earned: 0, total: 0, percent: 0 }
  },

  teamLiveTelemetry: {},
  friendsRoster: [],
  activeLeafletMaps: {},
  markerLayers: {},

  firestoreProgressUnsub: null,
  firestoreRankUnsub: null,

  async init() {
    this.bindUI();
    this.initAuth();
    this.initAllPillPosters();
    await this.loadUsersCatalog();
    await this.switchGame(this.activeGameKey, false);
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  },

  // Direct Flat/Root-Relative Fetch Engine
  async fetchJSON(fileName) {
    const paths = [
      "./" + fileName,
      fileName,
      "/" + fileName,
      "./data/" + fileName,
      "/data/" + fileName,
      "https://raw.githubusercontent.com/Werewolf3788/Website/main/" + fileName,
      "https://raw.githubusercontent.com/Werewolf3788/Website/main/data/" + fileName
    ];

    for (let i = 0; i < paths.length; i++) {
      try {
        const res = await fetch(paths[i] + "?v=" + Date.now());
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    console.warn(`[JSON Resolver] Could not load ${fileName}. Verify file location.`);
    return null;
  },

  async loadUsersCatalog() {
    const data = await this.fetchJSON("users.json");
    if (data) {
      this.usersList = Array.isArray(data) ? data : (data.users || Object.values(data));
      this.applyUserThemeAndIdentity();
    }
  },

  applyUserThemeAndIdentity() {
    if (!this.usersList.length) return;
    const activeEmail = (this.currentEmail || "").toLowerCase().trim();
    const activePSN = (this.psnAccountId || "").trim();
    const activeOnlineId = (this.psnOnlineId || "").toLowerCase().trim();

    const matchedUser = this.usersList.find(u => {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uPsnId = String(u.psn_id || "").trim();
      const uOnline = (u.psn_name || "").toLowerCase().trim();
      return (activeEmail && uEmail === activeEmail) ||
             (activePSN && uPsnId === activePSN) ||
             (activeOnlineId && uOnline === activeOnlineId);
    });

    if (matchedUser) {
      if (!this.psnAccountId && matchedUser.psn_id) this.psnAccountId = String(matchedUser.psn_id);
      if (!this.psnOnlineId && matchedUser.psn_name) this.psnOnlineId = matchedUser.psn_name;

      if (matchedUser.theme) {
        const root = document.documentElement;
        if (matchedUser.theme.primary_color) {
          root.style.setProperty("--user-theme-accent", matchedUser.theme.primary_color);
        }
        if (matchedUser.theme.surface_color) {
          root.style.setProperty("--card-surface", matchedUser.theme.surface_color);
        }
      }
    }
  },

  // Stream RTDB Poster Art directly to both pill thumbnails and active favicon
  initAllPillPosters() {
    Object.entries(GAME_REGISTRY).forEach(([key, game]) => {
      const posterPath = `/psn/games/${game.npCommunicationId}/posterArt`;
      const posterRef = rtdbRef(rtdb, posterPath);

      onValue(posterRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const art = typeof val === 'string' ? val : (val.posterArt || '');
          if (art) {
            game.posterUrl = art;

            const thumbEl = document.getElementById(`pill-thumb-${key}`);
            if (thumbEl) thumbEl.src = art;

            if (this.activeGameKey === key) {
              updateTabFavicon(art, game.title, game.tabLabel);
            }
          }
        }
      });
    });
  },

  async switchGame(gameKey, saveState = true) {
    if (!GAME_REGISTRY[gameKey]) return;
    this.activeGameKey = gameKey;
    if (saveState) localStorage.setItem("deck_active_game", gameKey);

    const config = GAME_REGISTRY[gameKey];

    // 1. Update Pill States
    document.querySelectorAll(".game-pill").forEach(p => p.classList.remove("active"));
    const activePill = document.getElementById(`pill-${gameKey}`);
    if (activePill) activePill.classList.add("active");

    // 2. Immediately update Tab Favicon & Title to this game's poster
    if (config.posterUrl) {
      updateTabFavicon(config.posterUrl, config.title, config.tabLabel);
    } else {
      document.title = `${config.tabLabel} ${config.title} — Master Tactical Deck`;
    }

    // 3. Update Title & Footer Meta
    const titleEl = document.getElementById("deckAppTitle");
    const footerPsnEl = document.getElementById("footerPsnId");
    if (titleEl) titleEl.textContent = config.title.toUpperCase();
    if (footerPsnEl) footerPsnEl.textContent = `PSN ID: ${config.npCommunicationId}`;

    // 4. Load or Retrieve Cached Game Catalog
    if (!this.catalogs[gameKey]) {
      const raw = await this.fetchJSON(config.dataFile);
      this.catalogs[gameKey] = Array.isArray(raw) ? raw : (raw?.intel || raw?.trophies || Object.values(raw || {}));
    }
    this.masterCatalog = this.catalogs[gameKey] || [];

    // 5. Toggle COTW Animal Rank Strip
    const cotwContainer = document.getElementById("cotwRanksContainer");
    if (cotwContainer) {
      cotwContainer.classList.toggle("hidden", !config.hasRanks);
    }

    // 6. Populate Missions/Reserves in Dropdown
    this.populateMissionSelector();

    // 7. Rebind Scoped Database Listeners
    this.userProgressMap = {};
    this.listenToOwnFirestoreProgress();
    this.listenToSharedSquadTelemetry();
    this.loadAllPlatformTrophyProgress();

    if (config.hasRanks) {
      this.listenToCotwRanks();
    }

    this.render();
  },

  populateMissionSelector() {
    const select = document.getElementById("mission-focus-select");
    if (!select) return;

    const cats = [...new Set(this.masterCatalog.map(i => i.cat || "General"))];
    this.activeMission = cats[0] || "";
    select.innerHTML = "";

    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c.toUpperCase();
      select.appendChild(opt);
    });

    cats.forEach(cat => {
      const sid = cat.replace(/[^a-zA-Z0-9]/gi, "");
      this.collapsedSections[sid] = (cat !== this.activeMission);
    });
  },

  listenToOwnFirestoreProgress() {
    if (this.firestoreProgressUnsub) { this.firestoreProgressUnsub(); this.firestoreProgressUnsub = null; }
    if (!this.currentEmailKey) return;

    const config = GAME_REGISTRY[this.activeGameKey];
    const docRef = doc(db, "users", this.currentEmailKey, "platform", this.currentPlatform, "progress", config.docId);

    this.firestoreProgressUnsub = onSnapshot(docRef, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remoteItems = data.collectibles || data.trophies || data.progress || {};

      if (Array.isArray(remoteItems)) {
        remoteItems.forEach(t => {
          this.userProgressMap[t.id] = { collected: Boolean(t.current >= t.goal || t.collected), count: Number(t.current || t.count || 0) };
        });
      } else if (typeof remoteItems === "object") {
        Object.entries(remoteItems).forEach(([id, entry]) => {
          if (entry && typeof entry === "object") {
            this.userProgressMap[id] = {
              collected: Boolean(entry.collected || entry.completed || entry.done),
              count: entry.count !== undefined ? Number(entry.count) : (entry.collected ? 1 : 0)
            };
          } else if (entry === true) {
            this.userProgressMap[id] = { collected: true, count: 1 };
          }
        });
      }

      this.recalculateCrossTrophyTelemetry();
      this.render();
    }, err => console.warn("Firestore own progress listener error:", err));
  },

  // Dedicated COTW Career Animal Ranks Isolation
  listenToCotwRanks() {
    if (this.firestoreRankUnsub) { this.firestoreRankUnsub(); this.firestoreRankUnsub = null; }
    if (!this.currentEmailKey) return;

    const rankRef = doc(db, "users", this.currentEmailKey, "platform", this.currentPlatform, "progress", "COTW_Ranks");
    this.firestoreRankUnsub = onSnapshot(rankRef, snap => {
      if (!snap.exists()) return;
      const inc = snap.data();
      this.animalRankData = {
        bronze: inc.bronze || 0,
        silver: inc.silver || 0,
        gold: inc.gold || 0,
        diamond: inc.diamond || 0,
        greatone: inc.greatone || inc.greatOne || 0,
        Fur: inc.Fur || inc.fur || inc.albino || 0
      };
      this.updateRankUI();
    });
  },

  async adjRank(tier, delta) {
    this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + delta);
    this.updateRankUI();

    if (!this.currentEmailKey) return;
    try {
      const rankRef = doc(db, "users", this.currentEmailKey, "platform", this.currentPlatform, "progress", "COTW_Ranks");
      await setDoc(rankRef, { ...this.animalRankData, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error("COTW Rank Save Error:", e);
    }
  },

  updateRankUI() {
    Object.keys(this.animalRankData).forEach(k => {
      const el = document.getElementById(`rank-val-${k}`);
      if (el) el.textContent = this.animalRankData[k];
    });
  },

  async silentSaveGameTelemetry() {
    this.recalculateCrossTrophyTelemetry();
    if (!this.currentEmailKey) return;

    const config = GAME_REGISTRY[this.activeGameKey];
    const totalItems = this.masterCatalog.length || 1;
    const collectedCount = Object.values(this.userProgressMap).filter(t => t.collected).length;

    try {
      const gameDocRef = doc(db, "users", this.currentEmailKey, "platform", this.currentPlatform, "progress", config.docId);
      await setDoc(gameDocRef, {
        gameId: config.docId,
        platform: this.currentPlatform,
        activeMission: this.activeMission,
        trophies_earned: collectedCount,
        trophies_total: totalItems,
        trophies_percent: Math.round((collectedCount / totalItems) * 100),
        collectibles: this.userProgressMap,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Silent save failed:", e.message);
    }
  },

  toggleItem(id) {
    const item = this.masterCatalog.find(i => i.id === id);
    if (!item) return;

    const current = this.userProgressMap[id] || { collected: false, count: 0 };
    const nextCollected = !current.collected;
    this.userProgressMap[id] = {
      collected: nextCollected,
      count: nextCollected ? (item.target || item.goal || 1) : 0
    };

    this.render();
    this.silentSaveGameTelemetry();
  },

  stepItemCount(id, delta) {
    const item = this.masterCatalog.find(i => i.id === id);
    if (!item) return;
    const current = this.userProgressMap[id] || { collected: false, count: 0 };
    const nextCount = Math.max(0, (current.count || 0) + delta);
    const target = item.target || item.goal || 1;

    this.userProgressMap[id] = {
      collected: nextCount >= target,
      count: nextCount
    };

    this.render();
    this.silentSaveGameTelemetry();
  },

  recalculateCrossTrophyTelemetry() {
    const total = this.masterCatalog.length || 1;
    const currentEarned = Object.values(this.userProgressMap).filter(t => t.collected).length;
    this.crossPlatformTelemetry[this.currentPlatform] = {
      earned: currentEarned,
      total: total,
      percent: Math.round((currentEarned / total) * 100)
    };
  },

  async loadAllPlatformTrophyProgress() {
    if (!this.currentEmailKey) return;
    const platforms = ["playstation", "xbox", "pc", "steam"];
    const config = GAME_REGISTRY[this.activeGameKey];
    const total = this.masterCatalog.length || 1;

    platforms.forEach(p => {
      try {
        const platformDoc = doc(db, "users", this.currentEmailKey, "platform", p, "progress", config.docId);
        onSnapshot(platformDoc, snap => {
          if (snap.exists()) {
            const data = snap.data();
            const earned = data.trophies_earned || 0;
            this.crossPlatformTelemetry[p] = { earned, total, percent: Math.round((earned / total) * 100) };
          } else if (p === this.currentPlatform) {
            const earned = Object.values(this.userProgressMap).filter(t => t.collected).length;
            this.crossPlatformTelemetry[p] = { earned, total, percent: Math.round((earned / total) * 100) };
          } else {
            this.crossPlatformTelemetry[p] = { earned: 0, total, percent: 0 };
          }
          this.render();
        });
      } catch (e) {}
    });
  },

  listenToSharedSquadTelemetry() {
    const container = document.getElementById("friendsComparisonContainer");
    if (!this.friendsRoster.length) {
      if (container) container.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); padding:10px;">No companion operatives linked. Share friend codes in Settings to stream live intel.</p>`;
      return;
    }

    const config = GAME_REGISTRY[this.activeGameKey];

    this.friendsRoster.forEach(friend => {
      const rawEmail = friend.target_email || friend.email || "";
      const friendKey = rawEmail ? getEmailKey(rawEmail) : (friend.userKey || friend.username || "");
      if (!friendKey) return;

      const targetPlat = normalizePlatform(friend.platform || this.currentPlatform);
      const friendDocRef = doc(db, "users", friendKey, "platform", targetPlat, "progress", config.docId);

      onSnapshot(friendDocRef, snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        const opName = friend.username || "Operative";

        this.teamLiveTelemetry[opName] = {
          username: opName,
          avatar: friend.avatar_url || DEFAULT_USER_AVATAR,
          platform: targetPlat.toUpperCase(),
          collectibles: data.collectibles || data.progress || {},
          trophiesEarned: data.trophies_earned || 0,
          trophiesTotal: data.trophies_total || this.masterCatalog.length
        };
        this.render();
        this.renderSquadComparisonDeck();
      });
    });
  },

  renderSquadComparisonDeck() {
    const container = document.getElementById("friendsComparisonContainer");
    if (!container) return;
    container.innerHTML = "";

    const ops = Object.values(this.teamLiveTelemetry);
    if (!ops.length) return;

    ops.forEach(op => {
      const div = document.createElement("div");
      div.style.cssText = "background:var(--card-bg); border:1px solid var(--card-border); border-left:3px solid #00d2d3; padding:10px 14px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;";
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${op.avatar}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; border:1px solid #00d2d3;">
          <strong style="color:#fff; font-size:0.88rem;">${op.username}</strong>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          ${op.platform}: <strong style="color:var(--accent-gold);">${op.trophiesEarned} / ${op.trophiesTotal}</strong>
        </div>
      `;
      container.appendChild(div);
    });
  },

  render() {
    const container = document.getElementById("section-container");
    if (!container) return;
    container.innerHTML = "";

    const total = this.masterCatalog.length || 1;
    const earnedCount = Object.values(this.userProgressMap).filter(t => t.collected).length;
    const progressPercent = Math.round((earnedCount / total) * 100);

    const psTel = this.crossPlatformTelemetry.playstation || { earned: 0, percent: 0 };
    const xbTel = this.crossPlatformTelemetry.xbox || { earned: 0, percent: 0 };
    const pcTel = this.crossPlatformTelemetry.pc || { earned: 0, percent: 0 };
    const stTel = this.crossPlatformTelemetry.steam || { earned: 0, percent: 0 };

    const config = GAME_REGISTRY[this.activeGameKey];

    // Status Deck Card
    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "background:var(--card-bg); padding:16px 20px; border-radius:10px; border:1px solid var(--card-border); margin-bottom:14px; display:flex; flex-direction:column; gap:12px;";
    headerDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <strong style="color:#fff; font-size:1.1rem;">${config.title} Multi-Platform Status</strong>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">User Key: ${this.currentEmailKey}</div>
        </div>
        <span class="badge" style="background:#161c28; color:var(--accent-gold); padding:6px 12px; border-radius:4px; font-weight:800;">
          ${earnedCount} / ${total} Complete (${progressPercent}%)
        </span>
      </div>

      <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
        <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--user-theme-accent), #2ecc71); border-radius:4px; transition: width 0.3s ease;"></div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-top:4px; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:#00a6ed; font-weight:700;">PlayStation</span>
            <strong style="color:#fff;">${psTel.earned}/${total}</strong>
          </div>
          <div style="width:100%; height:3px; background:rgba(255,255,255,0.08); margin-top:2px;"><div style="width:${psTel.percent}%; height:100%; background:#00a6ed;"></div></div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:#2ecc71; font-weight:700;">Xbox</span>
            <strong style="color:#fff;">${xbTel.earned}/${total}</strong>
          </div>
          <div style="width:100%; height:3px; background:rgba(255,255,255,0.08); margin-top:2px;"><div style="width:${xbTel.percent}%; height:100%; background:#2ecc71;"></div></div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:#f5a623; font-weight:700;">PC (MS)</span>
            <strong style="color:#fff;">${pcTel.earned}/${total}</strong>
          </div>
          <div style="width:100%; height:3px; background:rgba(255,255,255,0.08); margin-top:2px;"><div style="width:${pcTel.percent}%; height:100%; background:#f5a623;"></div></div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:#00d2d3; font-weight:700;">Steam</span>
            <strong style="color:#fff;">${stTel.earned}/${total}</strong>
          </div>
          <div style="width:100%; height:3px; background:rgba(255,255,255,0.08); margin-top:2px;"><div style="width:${stTel.percent}%; height:100%; background:#00d2d3;"></div></div>
        </div>
      </div>
    `;
    container.appendChild(headerDiv);

    const cats = [...new Set(this.masterCatalog.map(i => i.cat || "General"))];
    cats.forEach(cat => {
      const rawItems = this.masterCatalog.filter(i => (i.cat || "General") === cat);
      const count = rawItems.filter(i => this.userProgressMap[i.id]?.collected).length;
      const sid = cat.replace(/[^a-zA-Z0-9]/gi, "");
      const isActiveFocus = (cat === this.activeMission);
      const hasMap = config.hasMaps && MISSION_MAP_CONFIG[sid] !== undefined;

      const section = document.createElement("div");
      section.id = `section-${sid}`;
      section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''} ${isActiveFocus ? 'active-focus' : ''}`;

      const mapHtml = hasMap ? `
        <div class="tactical-map-wrapper">
          <div class="tactical-map-bar">
            <span>🗺️ IN-GAME TACTICAL MAP &bull; AUTO-HIDES RETRIEVED PINS</span>
          </div>
          <div id="map-frame-${sid}" class="mission-map-frame"></div>
        </div>
      ` : '';

      section.innerHTML = `
        <div class="category-header outlined-text" onclick="window.masterEngine.toggleSection('${sid}')">
          <h2 style="font-size:1.05rem; font-weight:900; color:#fff; text-transform:uppercase;">${cat}</h2>
          <div style="font-weight:900; font-size:13px; color:var(--user-theme-accent); font-family:monospace;">${count}/${rawItems.length}</div>
        </div>
        <div class="category-content">
          ${mapHtml}
          <div class="item-grid"></div>
        </div>
      `;

      const grid = section.querySelector(".item-grid");
      rawItems.forEach(item => {
        const uState = this.userProgressMap[item.id] || { collected: false, count: 0 };
        const isNumeric = (item.target !== undefined && item.target > 1) || (item.goal !== undefined && item.goal > 1);
        const card = document.createElement("div");
        card.className = `item-card ${uState.collected ? 'completed' : ''}`;

        let squadBadgesHtml = '';
        Object.values(this.teamLiveTelemetry).forEach(op => {
          const opMatch = op.collectibles?.[item.id];
          const opCollected = opMatch ? Boolean(opMatch.collected || opMatch.count > 0) : false;
          squadBadgesHtml += `<span class="team-badge ${opCollected ? 'is-collected' : ''}">${op.username}</span>`;
        });

        let actionControlsHtml = '';
        if (isNumeric) {
          const target = item.target || item.goal || 1;
          actionControlsHtml = `
            <div class="stepper-action-row">
              <button class="step-btn" onclick="window.masterEngine.stepItemCount('${item.id}', -1)">−</button>
              <div class="clickable-num-pill">${uState.count} / ${target}</div>
              <button class="step-btn" onclick="window.masterEngine.stepItemCount('${item.id}', 1)">+</button>
            </div>
          `;
        } else {
          actionControlsHtml = `
            <div class="card-actions-row">
              <button class="confirm-toggle-btn ${uState.collected ? 'completed-state' : ''}" onclick="window.masterEngine.toggleItem('${item.id}')">
                ${uState.collected ? 'COLLECTED (Undo)' : 'MARK COMPLETED'}
              </button>
            </div>
          `;
        }

        card.innerHTML = `
          <div>
            <div style="font-size:10px; font-weight:800; color:var(--user-theme-accent); text-transform:uppercase; margin-bottom:4px;">${item.type || 'OBJECTIVE'}</div>
            <div style="font-size:14px; font-weight:800; color:#fff; margin-bottom:4px;">${item.name}</div>
            <div style="font-size:12px; color:var(--text-muted); line-height:1.4;">${item.desc || ''}</div>
          </div>
          <div>
            ${squadBadgesHtml ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">${squadBadgesHtml}</div>` : ''}
            ${actionControlsHtml}
          </div>
        `;
        grid.appendChild(card);
      });

      container.appendChild(section);

      if (!this.collapsedSections[sid] && hasMap) {
        setTimeout(() => this.initLeafletMap(sid, cat), 50);
      }
    });
  },

  initLeafletMap(sid, catName) {
    const mapContainer = document.getElementById(`map-frame-${sid}`);
    if (!mapContainer || typeof L === 'undefined') return;

    if (this.activeLeafletMaps[sid]) {
      this.activeLeafletMaps[sid].remove();
      delete this.activeLeafletMaps[sid];
    }

    const mapConfig = MISSION_MAP_CONFIG[sid];
    if (!mapConfig) return;

    const map = L.map(`map-frame-${sid}`, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomSnap: 0.25,
      attributionControl: false
    });

    const bounds = [[0, 0], [mapConfig.h, mapConfig.w]];
    L.imageOverlay(mapConfig.imgUrl, bounds).addTo(map);
    map.fitBounds(bounds);

    this.activeLeafletMaps[sid] = map;

    const sectionItems = this.masterCatalog.filter(i => (i.cat || "General") === catName && i.x !== undefined && i.y !== undefined);
    sectionItems.forEach(item => {
      const pinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="width:16px; height:16px; background:#ff8800; border:2px solid #fff; border-radius:50%; box-shadow:0 0 6px rgba(0,0,0,0.8);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const yCoord = mapConfig.h - item.y;
      const xCoord = item.x;
      const marker = L.marker([yCoord, xCoord], { icon: pinIcon })
        .bindPopup(`<strong>${item.name}</strong><br><em>${item.desc}</em>`);

      this.markerLayers[item.id] = marker;
      if (!this.userProgressMap[item.id]?.collected) marker.addTo(map);
    });
  },

  toggleSection(sid) {
    this.collapsedSections[sid] = !this.collapsedSections[sid];
    this.render();
  },

  initAuth() {
    onAuthStateChanged(auth, user => {
      const modalBtn = document.getElementById("authModalBtn");
      const profileBadge = document.getElementById("userProfile");
      const nameEl = document.getElementById("userDisplayName");
      const avatarEl = document.getElementById("headerUserAvatar");
      const statLine = document.getElementById("stat-line");

      if (user) {
        this.currentUser = user;
        this.currentEmail = getResolvedPrimaryEmail(user);
        this.currentEmailKey = getEmailKey(this.currentEmail);

        if (modalBtn) modalBtn.classList.add("hidden");
        if (profileBadge) profileBadge.classList.remove("hidden");
        if (nameEl) nameEl.textContent = user.displayName || "Operative";
        if (avatarEl) avatarEl.src = user.photoURL || DEFAULT_USER_AVATAR;
        if (statLine) statLine.textContent = `AUTHENTICATED: ${this.currentEmail}`;

        this.applyUserThemeAndIdentity();
        this.listenToOwnFirestoreProgress();
        this.listenToSharedSquadTelemetry();
        this.loadAllPlatformTrophyProgress();

        if (GAME_REGISTRY[this.activeGameKey].hasRanks) {
          this.listenToCotwRanks();
        }
      } else {
        this.currentUser = null;
        this.currentEmail = "";
        this.currentEmailKey = "";
        if (modalBtn) modalBtn.classList.remove("hidden");
        if (profileBadge) profileBadge.classList.add("hidden");
        if (statLine) statLine.textContent = `GUEST BROWSING MODE`;
      }
    });
  },

  bindUI() {
    const platSelect = document.getElementById("platformSelect");
    if (platSelect) {
      platSelect.value = this.currentPlatform;
      platSelect.addEventListener("change", e => {
        this.currentPlatform = normalizePlatform(e.target.value);
        localStorage.setItem("deck_platform", this.currentPlatform);
        this.listenToOwnFirestoreProgress();
        this.loadAllPlatformTrophyProgress();
      });
    }

    const missionSelect = document.getElementById("mission-focus-select");
    if (missionSelect) {
      missionSelect.addEventListener("change", e => {
        this.activeMission = e.target.value;
        const cats = [...new Set(this.masterCatalog.map(i => i.cat || "General"))];
        cats.forEach(c => {
          const sid = c.replace(/[^a-zA-Z0-9]/gi, "");
          this.collapsedSections[sid] = (c !== this.activeMission);
        });
        this.render();
      });
    }

    const authModal = document.getElementById("authModal");
    const authBtn = document.getElementById("authModalBtn");
    const authClose = document.getElementById("authModalClose");
    const googleBtn = document.getElementById("googleSignInBtn");

    if (authBtn && authModal) authBtn.addEventListener("click", () => authModal.classList.remove("hidden"));
    if (authClose && authModal) authClose.addEventListener("click", () => authModal.classList.add("hidden"));

    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).then(() => {
          if (authModal) authModal.classList.add("hidden");
        }).catch(e => alert("Sign In Error: " + e.message));
      });
    }
  },

  updateClock() {
    const clockEl = document.getElementById("ny-timestamp");
    if (clockEl) {
      const options = { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" };
      const timeStr = new Intl.DateTimeFormat("en-US", options).format(new Date());
      clockEl.textContent = `2026-10-10 ${timeStr} EDT`;
    }
  }
};

window.masterEngine = masterEngine;
document.addEventListener("DOMContentLoaded", () => masterEngine.init());
