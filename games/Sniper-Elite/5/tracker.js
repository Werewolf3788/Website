// Line 1: Sniper Elite 5 - Master Tactical Companion Engine
// [Smart Cache-Buster Time: 2026-10-10 03:05 EDT | Firebase Sync Target: /utm_links | Version: 8.7.0]

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";
  const DEFAULT_GAME_POSTER = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/images/Sniper%20Elite%20Secret%20Weapons.JPG";
  const GITHUB_RAW_BASE = "//raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/images/";

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

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const rtdb = firebase.database();
  const db = firebase.firestore();

  function getResolvedPrimaryEmail(user) {
    if (!user) return "";
    const google = user.providerData && user.providerData.find(p => p && p.providerId === "google.com");
    if (google && google.email) return google.email.toLowerCase().trim();
    if (user.email) return user.email.toLowerCase().trim();
    return "operative@sniper.local";
  }

  function getEmailKey(email) {
    if (!email) return "unknown_user";
    return email.toLowerCase().replace(/@/g, "_at_").replace(/\./g, "_");
  }

  function normalizeString(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  const GAME_TYPE_ICONS = {
    'Personal Letter': `${GITHUB_RAW_BASE}Sniper%20Elite%20Personal%20Letters.JPG`,
    'Classified Doc': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
    'Hidden Item': `${GITHUB_RAW_BASE}Sniper%20Elite%20Hidden%20Items.JPG`,
    'Stone Eagle': `${GITHUB_RAW_BASE}Sniper%20Elite%20Eagle.JPG`,
    'Workbench': `${GITHUB_RAW_BASE}Sniper%20Elite%20WorkBench.JPG`,
    'Challenge': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
    'Trophy': `${GITHUB_RAW_BASE}Sniper%20Elite%20Hidden%20Items.JPG`,
    'Medal': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
    'Ribbon': `${GITHUB_RAW_BASE}Sniper%20Elite%20Personal%20Letters.JPG`
  };

  const IN_GAME_TYPE_ORDER = {
    'Personal Letter': 1,
    'Classified Doc': 2,
    'Hidden Item': 3,
    'Stone Eagle': 4,
    'Workbench': 5,
    'Challenge': 6,
    'Trophy': 7,
    'Medal': 8,
    'Ribbon': 9
  };

  const MISSION_MAP_CONFIG = {
    '7SecretWeapons': { imgUrl: `${GITHUB_RAW_BASE}Sniper%20Elite%20Secret%20Weapons.JPG`, w: 2048, h: 2048 },
    '8RubbleandRuin': { imgUrl: `${GITHUB_RAW_BASE}Sniper%20Elite%20Rubble%20and%20Ruin.JPG`, w: 2048, h: 2048 }
  };

  const PSN_TROPHY_MAPPINGS_RAW = {
    'Sniper Elite': 'trophy_sniper_elite_plat',
    'Meeting Resistance': 'trophy_meeting_resistance',
    'Confirming Suspicions': 'trophy_confirming_suspicions',
    'The Kraken Wakes': 'trophy_the_kraken_wakes',
    "It's Starting to Crack": 'trophy_starting_to_crack',
    'Change the Channel': 'trophy_change_channel',
    'Taking it back': 'trophy_taking_it_back',
    'Target America': 'trophy_target_america',
    'The Kraken Sleeps': 'trophy_kraken_sleeps',
    "Can't Outrun A Bullet": 'med_cantoutrun',
    'Climbing the Ladder': 'trophy_climbing_ladder',
    'Liberté': 'med_liberte',
    'Best of the Best': 'med_bestofbest',
    'No Stone Unturned': 'med_nostone',
    'Opposing Force': 'trophy_opposing_force',
    'Enemy at the Gates': 'trophy_enemy_at_gates',
    'Fields of Glory': 'trophy_fields_of_glory',
    'Just a Flesh Wound': 'med_fleshwound',
    'Organ Grinder': 'med_organgrinder',
    'Strategist': 'med_strategist',
    'Master of Pistols': 'med_masterpistols',
    'Master of Secondaries': 'med_mastersecond',
    'Master of Rifles': 'med_masterrifles',
    'Master-at-arms': 'med_masteratarms',
    'Gunslinger': 'med_gunslinger',
    'Skirmisher': 'med_skirmisher',
    'Sharpshooter': 'med_sharpshooter',
    'The Long Game': 'med_longgame',
    'Set Europe Ablaze': 'med_seteablaze',
    'Precision Is Key': 'med_ironprecision',
    'Out of Scope': 'med_outofscope',
    'Rigged to Blow': 'med_riggedtoblow',
    'My Little Friend': 'med_littlefriend',
    'Explosive Efficiency': 'med_explodeeffic',
    'Lord of War': 'med_lordofwar',
    'Die Nussknacker Sweet!': 'med_nutcracker',
    'Resourceful': 'med_resourceful',
    'Der Geist': 'med_dergeist',
    'As Quiet as a Mouse': 'med_quietmouse',
    'Close Quarters': 'med_closequarters',
    'Snake in the Grass': 'med_snaketallgrass',
    'From Paris with Love': 'trophy_from_paris_with_love',
    'Burn after reading': 'trophy_burn_after_reading',
    'Souvenir hunter': 'trophy_souvenir_hunter',
    'Eagle Eyed': 'trophy_eagle_eyed',
    'Tinkerer': 'trophy_tinkerer',
    "It'll Buff Right Out": 'med_buffrightout',
    'Locomotion Commotion': 'med_locomotion',
    'Up Close and Personal': 'med_upclose',
    'Road Rage': 'med_roadrage',
    "Don't hold your breath": 'med_dontbreath',
    'Brains of the Operation': 'med_brainsop',
    'Sight Beyond Sights': 'med_sightbeyond',
    'Shoot for the Moon': 'trophy_shoot_for_moon',
    'Führerious Repetition': 'trophy_dlc1_fuhrerious',
    'Reich To The Point': 'trophy_dlc1_reich_to_point',
    'From Führer Away': 'med_wm_fromfuhrer',
    'Covert Elimination': 'med_covertelim',
    'Alpha': 'med_wm_alpha',
    'Herr Today, Gone Tomorrow': 'med_wm_herrtoday',
    'Operation Foxley': 'med_wm_opfoxley',
    'Das Familienjuwel': 'med_wm_familienjuwel',
    'Last Resort': 'med_lastresort',
    'Siegebreaker': 'med_siegebreaker',
    'Ghost of Falaise': 'med_ghostoffalaise',
    'Operation Overlord': 'med_opoverlord',
    'If You Go Down to the Woods Today': 'med_m13_woods',
    'Fight Another Day': 'med_m13_fightanother',
    'Stroll in the Woods': 'med_m13_stroll',
    'Shipbreaker': 'med_m14_shipbreaker',
    'Sink or Swim': 'med_m14_sinkorswim',
    'Going Overboard': 'med_m14_goingover'
  };

  const PSN_TROPHY_MAPPINGS = {};
  Object.entries(PSN_TROPHY_MAPPINGS_RAW).forEach(([rawName, trackerId]) => {
    PSN_TROPHY_MAPPINGS[normalizeString(rawName)] = trackerId;
  });

  function getTierStatus(percent) {
    if (percent >= 100) return { tier: 'Gold', icon: '🥇', label: 'GOLD TIER', color: '#ffd700', style: 'background: rgba(255, 215, 0, 0.2); color: #ffd700; border: 1px solid #ffd700;' };
    if (percent >= 50) return { tier: 'Silver', icon: '🥈', label: 'SILVER TIER', color: '#c0c0c0', style: 'background: rgba(192, 192, 192, 0.2); color: #e0e0e0; border: 1px solid #c0c0c0;' };
    if (percent >= 25) return { tier: 'Bronze', icon: '🥉', label: 'BRONZE TIER', color: '#cd7f32', style: 'background: rgba(205, 127, 50, 0.2); color: #e59866; border: 1px solid #cd7f32;' };
    return { tier: 'None', icon: '⚪', label: 'IN PROGRESS', color: '#888888', style: 'background: rgba(255, 255, 255, 0.08); color: #aaa; border: 1px solid rgba(255,255,255,0.15);' };
  }

  function getLongShotHeatmapStyle(val, minVal, maxVal) {
    const current = Number(val) || 0;
    const targetMax = Math.max(Number(maxVal) || 1, 1);
    const targetMin = Math.max(Number(minVal) || 0, 0);

    let ratio = 0;
    if (targetMax > targetMin) {
      ratio = (current - targetMin) / (targetMax - targetMin);
    } else if (current > 0) {
      ratio = 1;
    }
    ratio = Math.max(0, Math.min(1, ratio));

    const r = Math.round(239 + (34 - 239) * ratio);
    const g = Math.round(68 + (197 - 68) * ratio);
    const b = Math.round(68 + (94 - 68) * ratio);

    return {
      color: `rgb(${r}, ${g}, ${b})`,
      background: `rgba(${r}, ${g}, ${b}, 0.22)`,
      border: `1px solid rgba(${r}, ${g}, ${b}, 0.85)`
    };
  }

  const CompanionApp = {
    titleId: "NPWR21465_00",
    gameDocId: "sniper-elite-5",
    files: {
      users: "users.json",
      gameData: "se5.json"
    },

    db: {},
    activeMission: "1: The Atlantic Wall",
    operativeRank: 1,
    operativeScore: 0,
    currentUser: null,
    currentEmail: "",
    currentEmailKey: "",
    currentPlatform: "ps",
    psnAccountId: "",
    psnOnlineId: "",
    masterIntelCatalog: [],
    userProgressMap: {},
    teamLiveTelemetry: {},
    collapsedSections: {},
    crossPlatformTelemetry: {
      ps: { earned: 0, total: 0, percent: 0 },
      pc: { earned: 0, total: 0, percent: 0 },
      xbox: { earned: 0, total: 0, percent: 0 }
    },
    friendsRoster: [],
    activeLeafletMaps: {},
    markerLayers: {},

    async init() {
      this.loadSavedState();
      this.bindUI();
      this.initAuth();
      this.initRTDB();
      await this.loadAllJSONs();
      this.applyUserThemeAndIdentity();
      this.integrateCatalogData();
      this.initDynamicFeatures();
      this.updateNewYorkClock();
      setInterval(() => this.updateNewYorkClock(), 1000);
    },

    async fetchJSON(fileName) {
      const paths = [
        "../../data/" + fileName,
        "../data/" + fileName,
        "./data/" + fileName,
        "data/" + fileName,
        "./" + fileName,
        "/Website/data/" + fileName,
        "//werewolf3788.github.io/Website/data/" + fileName
      ];

      for (let i = 0; i < paths.length; i++) {
        try {
          const res = await fetch(paths[i] + "?v=" + Date.now());
          if (res.ok) return await res.json();
        } catch (e) {}
      }
      return null;
    },

    async loadAllJSONs() {
      const keys = Object.keys(this.files);
      const promises = keys.map(k => this.fetchJSON(this.files[k]));
      const results = await Promise.all(promises);

      keys.forEach((k, idx) => {
        this.db[k] = results[idx] || (k === 'users' ? [] : []);
      });
    },

    applyUserThemeAndIdentity() {
      if (!this.db.users) return;
      const userList = Array.isArray(this.db.users)
        ? this.db.users
        : (this.db.users.users || Object.values(this.db.users));

      if (!Array.isArray(userList)) return;

      const activeEmail = (this.currentEmail || "").toLowerCase().trim();
      const activePSN = (this.psnAccountId || "").trim();
      const activeOnlineId = (this.psnOnlineId || "").toLowerCase().trim();

      const matchedUser = userList.find(u => {
        const uEmail = (u.email || "").toLowerCase().trim();
        const uPsnId = String(u.psn_id || "").trim();
        const uOnline = (u.psn_name || "").toLowerCase().trim();
        return (activeEmail && uEmail === activeEmail) ||
               (activePSN && uPsnId === activePSN) ||
               (activeOnlineId && uOnline === activeOnlineId);
      });

      if (matchedUser) {
        if (!this.psnAccountId && matchedUser.psn_id) {
          this.psnAccountId = String(matchedUser.psn_id);
        }
        if (!this.psnOnlineId && matchedUser.psn_name) {
          this.psnOnlineId = matchedUser.psn_name;
        }

        if (matchedUser.theme) {
          const root = document.documentElement;
          if (matchedUser.theme.primary_color) {
            root.style.setProperty("--theme-primary", matchedUser.theme.primary_color);
            root.style.setProperty("--ser-color", matchedUser.theme.primary_color);
          }
          if (matchedUser.theme.accent_color) {
            root.style.setProperty("--theme-accent", matchedUser.theme.accent_color);
            root.style.setProperty("--ser-glow", matchedUser.theme.accent_color);
          }
          if (matchedUser.theme.surface_color) {
            root.style.setProperty("--theme-surface", matchedUser.theme.surface_color);
          }
        }
      }
    },

    integrateCatalogData() {
      const list = Array.isArray(this.db.gameData)
        ? this.db.gameData
        : (this.db.gameData.intel || Object.values(this.db.gameData || {}));

      this.masterIntelCatalog = list;

      const cats = [...new Set(this.masterIntelCatalog.map(i => i.cat))];
      cats.forEach(cat => {
        const sid = cat.replace(/[^a-z0-9]/gi, '');
        if (this.collapsedSections[sid] === undefined) {
          this.collapsedSections[sid] = (cat !== this.activeMission);
        }
      });

      this.populateMissionSelector();
      this.recalculateCrossTrophyTelemetry();
      this.render();
    },

    loadSavedState() {
      const savedPlatform = localStorage.getItem("se5_platform");
      const savedMission = localStorage.getItem("se5_active_mission");
      const savedProgress = localStorage.getItem("se5_local_progress");

      if (savedPlatform) this.currentPlatform = savedPlatform;
      if (savedMission) this.activeMission = savedMission;

      if (savedProgress) {
        try { this.userProgressMap = JSON.parse(savedProgress); } catch (e) { this.userProgressMap = {}; }
      }

      this.safeSetValue("platformSelect", this.currentPlatform);
    },

    safeSetValue(id, val) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    },

    safeSetText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    },

    initRTDB() {
      rtdb.ref("/utm_links").on("value", snapshot => {
        const raw = snapshot.val();
        this.safeSetText("firebaseStatusBadge", "RTDB: Live Connected");
        const badge = document.getElementById("firebaseStatusBadge");
        if (badge) badge.className = "status-pill status-connected";
        if (!raw) return;

        const items = [];
        Object.entries(raw).forEach(([parentKey, val]) => {
          if (Array.isArray(val)) {
            val.forEach((entry, idx) => {
              if (entry) items.push(this.normalizeItem(entry, `${parentKey}_${idx}`));
            });
          } else if (typeof val === "object" && val !== null) {
            if (val.url || val.title) {
              items.push(this.normalizeItem(val, parentKey));
            } else {
              Object.entries(val).forEach(([childKey, childVal]) => {
                if (typeof childVal === "object" && childVal !== null) {
                  items.push(this.normalizeItem(childVal, `${parentKey}_${childKey}`));
                }
              });
            }
          }
        });

        this.renderNav(items);
      });
    },

    normalizeItem(item, fallbackKey) {
      return {
        title: item.title || fallbackKey,
        url: item.url || "#",
        image: (item.image && typeof item.image === "string") ? item.image.trim() : "",
        group: (item.group && typeof item.group === "string") ? item.group.trim() : "",
        tag: (item.tag && typeof item.tag === "string") ? item.tag.trim() : "",
        rowNumber: (item.rowNumber !== undefined && item.rowNumber !== null) ? Number(item.rowNumber) : 9999,
        updatedAt: item.updatedAt || ""
      };
    },

    renderNav(items) {
      const navList = document.getElementById("navList");
      if (!navList) return;
      navList.innerHTML = "";

      const standaloneLinks = [];
      const folderGroups = {};

      items.forEach(item => {
        const cleanGroup = (item.group || "").toLowerCase();
        const cleanTag = (item.tag || "").toLowerCase();
        const cleanTitle = (item.title || "").toLowerCase();
        const cleanUrl = (item.url || "").toLowerCase();

        if (cleanGroup === "settings" || cleanTag === "settings" || cleanTitle.includes("setting") || cleanUrl.includes("setting") ||
            cleanGroup === "privacy" || cleanTag === "privacy" || cleanTitle.includes("privacy") || cleanUrl.includes("privacy")) {
          return;
        }

        const isStandalone = !item.group || cleanGroup === "standalone";

        if (isStandalone) {
          standaloneLinks.push(item);
        } else {
          if (!folderGroups[item.group]) {
            folderGroups[item.group] = {
              name: item.group,
              items: [],
              minRow: item.rowNumber,
              folderImage: item.image
            };
          }
          folderGroups[item.group].items.push(item);
          if (item.rowNumber < folderGroups[item.group].minRow) {
            folderGroups[item.group].minRow = item.rowNumber;
            if (item.image) folderGroups[item.group].folderImage = item.image;
          }
        }
      });

      const topLevelBuckets = [];
      standaloneLinks.forEach(link => {
        topLevelBuckets.push({ type: "bare_link", rank: link.rowNumber, data: link });
      });

      Object.values(folderGroups).forEach(grp => {
        grp.items.sort((a, b) => a.rowNumber - b.rowNumber);
        topLevelBuckets.push({ type: "folder", rank: grp.minRow, data: grp });
      });

      topLevelBuckets.sort((a, b) => a.rank - b.rank);

      topLevelBuckets.forEach(bucket => {
        const li = document.createElement("li");
        li.className = "nav-item";

        if (bucket.type === "bare_link") {
          const item = bucket.data;
          const imgTag = item.image ? `<img src="${item.image}" alt="" class="nav-thumb">` : '';
          li.innerHTML = `
            <a href="${item.url}" class="nav-pill">
              ${imgTag}
              <span>${item.title}</span>
            </a>
          `;
        } else {
          const grp = bucket.data;
          const folderImg = grp.folderImage ? `<img src="${grp.folderImage}" alt="" class="nav-thumb">` : '';

          let dropdownHtml = `<div class="dropdown-menu">`;
          grp.items.forEach(child => {
            const childImg = child.image ? `<img src="${child.image}" alt="" class="nav-thumb">` : '';
            dropdownHtml += `
              <a href="${child.url}" class="dropdown-item">
                ${childImg}
                <span>${child.title}</span>
              </a>
            `;
          });
          dropdownHtml += `</div>`;

          li.innerHTML = `
            <button class="dropdown-trigger">
              ${folderImg}
              <span>${grp.name} &#9662;</span>
            </button>
            ${dropdownHtml}
          `;
        }
        navList.appendChild(li);
      });
    },

    initAuth() {
      auth.onAuthStateChanged(async user => {
        const modalBtn = document.getElementById("authModalBtn");
        const profileBadge = document.getElementById("userProfile");
        const nameEl = document.getElementById("userDisplayName");
        const avatarEl = document.getElementById("headerUserAvatar");

        if (user) {
          this.currentUser = user;
          this.currentEmail = getResolvedPrimaryEmail(user);
          this.currentEmailKey = getEmailKey(this.currentEmail);

          if (modalBtn) modalBtn.classList.add("hidden");
          if (profileBadge) profileBadge.classList.remove("hidden");

          this.applyUserThemeAndIdentity();

          rtdb.ref(`/users/${this.currentEmailKey}`).on("value", snapshot => {
            const rtdbProfile = snapshot.val() || {};
            const operativeTag = rtdbProfile.username || user.displayName || "Karl Fairburne";
            let avatarUrl = rtdbProfile.avatar_url || user.photoURL || DEFAULT_USER_AVATAR;

            if (rtdbProfile.avatar_source === "google") {
              avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;
            }

            if (nameEl) nameEl.textContent = operativeTag;
            if (avatarEl) avatarEl.src = avatarUrl;

            this.psnAccountId = rtdbProfile.psn_account_id || this.psnAccountId || "";
            this.psnOnlineId = rtdbProfile.psn_username || this.psnOnlineId || "";

            if (rtdbProfile.primary_platform) {
              this.currentPlatform = rtdbProfile.primary_platform.toLowerCase();
              this.safeSetValue("platformSelect", this.currentPlatform);
            }

            if (this.psnOnlineId || this.psnAccountId) {
              this.syncPlayStationTrophies(this.psnOnlineId, this.psnAccountId);
            }

            this.friendsRoster = rtdbProfile.friends ? Object.values(rtdbProfile.friends) : [];
            this.listenToSharedSquadTelemetry();
            this.loadAllPlatformTrophyProgress();
          });

          this.listenToOwnFirestoreProgress();
          this.renderProfileDropdown(true);

        } else {
          this.currentUser = null;
          this.currentEmail = "";
          this.currentEmailKey = "";
          if (modalBtn) modalBtn.classList.remove("hidden");
          if (profileBadge) profileBadge.classList.add("hidden");
          this.renderProfileDropdown(false);
        }
      });

      const googleBtn = document.getElementById("googleSignInBtn");
      if (googleBtn) {
        googleBtn.addEventListener("click", () => {
          const provider = new firebase.auth.GoogleAuthProvider();
          auth.signInWithPopup(provider).then(() => {
            const modal = document.getElementById("authModal");
            if (modal) modal.classList.add("hidden");
          }).catch(e => alert("Sign In Error: " + e.message));
        });
      }
    },

    listenToOwnFirestoreProgress() {
      if (!this.currentEmailKey) return;
      const docRef = db.collection("users")
        .doc(this.currentEmailKey)
        .collection("platform")
        .doc(this.currentPlatform)
        .collection("progress")
        .doc(this.gameDocId);

      docRef.onSnapshot(snap => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data.activeMission) this.activeMission = data.activeMission;
        if (data.rank) this.operativeRank = data.rank;
        if (data.score) this.operativeScore = data.score;

        const remoteItems = data.collectibles || data.progress || {};
        if (typeof remoteItems === 'object') {
          Object.entries(remoteItems).forEach(([id, entry]) => {
            if (entry && typeof entry === 'object') {
              this.userProgressMap[id] = {
                collected: Boolean(entry.collected || entry.completed || entry.done),
                count: entry.count !== undefined ? Number(entry.count) : (entry.collected ? 1 : 0),
                timestamp: entry.timestamp || null,
                source: entry.source || "firestore"
              };
            } else if (entry === true) {
              this.userProgressMap[id] = { collected: true, count: 1, source: "firestore" };
            }
          });
        }

        this.recalculateCrossTrophyTelemetry();
        this.render();
      }, err => console.warn("Firestore own progress listener error:", err));
    },

    listenToSharedSquadTelemetry() {
      const container = document.getElementById("friendsComparisonContainer");
      if (!this.friendsRoster.length) {
        if (container) container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No squad operatives linked yet. Link companions in Settings Hub to stream live intel.</p>`;
        return;
      }

      this.friendsRoster.forEach(friend => {
        const friendEmail = (friend.target_email || "").toLowerCase();
        if (!friendEmail) return;
        const friendKey = getEmailKey(friendEmail);
        const targetPlat = (friend.platform || this.currentPlatform || "ps").toLowerCase();

        db.collection("users")
          .doc(friendKey)
          .collection("platform")
          .doc(targetPlat)
          .collection("progress")
          .doc(this.gameDocId)
          .onSnapshot(snap => {
            if (!snap.exists) return;
            const data = snap.data();
            const opName = friend.username || "Operative";
            this.teamLiveTelemetry[opName] = {
              username: opName,
              avatar: friend.avatar_url || DEFAULT_USER_AVATAR,
              platform: targetPlat.toUpperCase(),
              collectibles: data.collectibles || data.progress || {},
              trophiesEarned: data.trophies_earned || 0,
              trophiesTotal: data.trophies_total || this.masterIntelCatalog.length,
              rank: data.rank || 1,
              score: data.score || 0
            };
            this.render();
            this.renderSquadComparisonDeck();
          }, err => console.warn("Squad live telemetry listener error:", err));
      });
    },

    syncPlayStationTrophies(psnOnlineId, accountId) {
      const targetGamerTag = (psnOnlineId || "").trim();
      let trophyRef = null;

      if (targetGamerTag) {
        trophyRef = rtdb.ref(`/psn/gamertags/${targetGamerTag}/liveTrophyProgress/${this.titleId}`);
      } else if (accountId) {
        trophyRef = rtdb.ref(`/psn/trophies/sniper-elite-5/${accountId}`);
      }

      if (!trophyRef) return;

      trophyRef.on("value", async snapshot => {
        const raw = snapshot.val();
        let parsedList = [];

        if (raw) {
          if (raw.trophies) {
            parsedList = Array.isArray(raw.trophies) ? raw.trophies : Object.values(raw.trophies);
          } else if (Array.isArray(raw)) {
            parsedList = raw;
          } else if (typeof raw === "object") {
            parsedList = Object.values(raw);
          }
        }

        if (parsedList.length > 0) {
          parsedList.forEach((t, idx) => {
            const rawTitle = t.trophyName || t.name || t.title;
            const normalized = normalizeString(rawTitle);
            const trackerId = PSN_TROPHY_MAPPINGS[normalized] || (t.trophyId !== undefined ? PSN_TROPHY_MAPPINGS[String(t.trophyId)] : null);

            if (trackerId) {
              const itemDef = this.masterIntelCatalog.find(d => d.id === trackerId);
              const targetVal = (itemDef && itemDef.target) ? itemDef.target : 1;
              const currentVal = t.currentValue !== undefined ? Number(t.currentValue) : (t.progress !== undefined ? Number(t.progress) : 0);
              const isEarned = Boolean(t.earned || t.unlocked || (targetVal > 1 && currentVal >= targetVal));

              this.userProgressMap[trackerId] = {
                collected: isEarned,
                count: isEarned ? targetVal : currentVal,
                timestamp: t.timestamp || t.earnedDateTime || new Date().toISOString(),
                source: "psn"
              };
            }
          });

          this.recalculateCrossTrophyTelemetry();
          this.render();
          await this.silentSaveGameTelemetry();
        }
      });
    },

    async silentSaveGameTelemetry() {
      localStorage.setItem("se5_platform", this.currentPlatform);
      localStorage.setItem("se5_active_mission", this.activeMission);
      localStorage.setItem("se5_local_progress", JSON.stringify(this.userProgressMap));

      this.recalculateCrossTrophyTelemetry();

      const activeUser = auth.currentUser;
      const targetUserKey = this.currentEmailKey || (this.currentEmail ? getEmailKey(this.currentEmail) : "");

      if (activeUser && targetUserKey) {
        try {
          const gameDocRef = db.collection("users")
            .doc(targetUserKey)
            .collection("platform")
            .doc(this.currentPlatform)
            .collection("progress")
            .doc(this.gameDocId);

          const totalItems = this.masterIntelCatalog.length || 1;
          const collectedCount = Object.values(this.userProgressMap).filter(t => t.collected).length;
          const pct = Math.round((collectedCount / totalItems) * 100);

          await gameDocRef.set({
            gameId: this.gameDocId,
            activeMission: this.activeMission,
            platform: this.currentPlatform,
            rank: this.operativeRank,
            score: this.operativeScore,
            psn_online_id: this.psnOnlineId || null,
            psn_account_id: this.psnAccountId || null,
            trophies_earned: collectedCount,
            trophies_total: totalItems,
            trophies_percent: pct,
            collectibles: this.userProgressMap,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

        } catch (e) {
          alert("⚠️ Telemetry Sync Failed: " + e.message);
        }
      }
    },

    async loadAllPlatformTrophyProgress() {
      const targetUserKey = this.currentEmailKey || (this.currentEmail ? getEmailKey(this.currentEmail) : "");
      if (!targetUserKey) return;

      const platforms = ["ps", "pc", "xbox"];
      const total = this.masterIntelCatalog.length || 1;

      for (const p of platforms) {
        try {
          const snap = await db.collection("users")
            .doc(targetUserKey)
            .collection("platform")
            .doc(p)
            .collection("progress")
            .doc(this.gameDocId)
            .get();

          if (snap.exists) {
            const data = snap.data();
            const earned = data.trophies_earned || 0;
            const pct = Math.round((earned / total) * 100);
            this.crossPlatformTelemetry[p] = { earned, total, percent: pct };
          } else {
            if (p === this.currentPlatform) {
              const currentEarned = Object.values(this.userProgressMap).filter(t => t.collected).length;
              this.crossPlatformTelemetry[p] = { earned: currentEarned, total, percent: Math.round((currentEarned / total) * 100) };
            } else {
              this.crossPlatformTelemetry[p] = { earned: 0, total, percent: 0 };
            }
          }
        } catch (e) {
          console.warn(`Error loading telemetry for platform ${p}:`, e);
        }
      }
      this.render();
    },

    recalculateCrossTrophyTelemetry() {
      const total = this.masterIntelCatalog.length || 1;
      const currentEarned = Object.values(this.userProgressMap).filter(t => t.collected).length;
      const pct = Math.round((currentEarned / total) * 100);

      this.crossPlatformTelemetry[this.currentPlatform] = {
        earned: currentEarned,
        total: total,
        percent: pct
      };
    },

    toggleItem(id) {
      const item = this.masterIntelCatalog.find(i => i.id === id);
      if (!item) return;

      const current = this.userProgressMap[id] || { collected: false, count: 0 };
      const nextCollected = !current.collected;
      const nextCount = nextCollected ? (item.target || 1) : 0;

      this.userProgressMap[id] = {
        collected: nextCollected,
        count: nextCount,
        timestamp: new Date().toISOString(),
        source: "manual"
      };

      this.updateMapPinVisibility(id, nextCollected);
      this.render();
      this.silentSaveGameTelemetry();
    },

    stepItemCount(id, delta) {
      const item = this.masterIntelCatalog.find(i => i.id === id);
      if (!item) return;
      const current = this.userProgressMap[id] || { collected: false, count: 0 };
      const stepSize = item.isLongShot ? 5 : 1;
      const nextCount = Math.max(0, (current.count || 0) + (delta * stepSize));
      const isCollected = item.target ? (nextCount >= item.target) : (nextCount > 0);

      this.userProgressMap[id] = {
        collected: isCollected,
        count: nextCount,
        timestamp: new Date().toISOString(),
        source: "manual"
      };

      this.render();
      this.silentSaveGameTelemetry();
    },

    openDirectNumberEditor(id, currentVal, maxVal, isUncapped = false) {
      const container = document.getElementById(`val-box-${id}`);
      if (!container) return;

      const maxAttr = (isUncapped || !maxVal) ? '' : `max="${maxVal}"`;
      container.innerHTML = `<input type="number" id="input-edit-${id}" class="manual-inline-num-input" value="${currentVal}" min="0" ${maxAttr}>`;

      const inputEl = document.getElementById(`input-edit-${id}`);
      if (!inputEl) return;
      inputEl.focus();
      inputEl.select();

      const commitVal = () => {
        const rawVal = parseInt(inputEl.value, 10);
        const finalVal = isNaN(rawVal) || rawVal < 0 ? 0 : rawVal;
        const item = this.masterIntelCatalog.find(i => i.id === id);
        const isCollected = (item && item.target) ? (finalVal >= item.target) : (finalVal > 0);

        this.userProgressMap[id] = {
          collected: isCollected,
          count: finalVal,
          timestamp: new Date().toISOString(),
          source: "manual"
        };
        this.render();
        this.silentSaveGameTelemetry();
      };

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') inputEl.blur();
        else if (e.key === 'Escape') this.render();
      });

      inputEl.addEventListener('blur', commitVal, { once: true });
    },

    toggleSection(sid) {
      this.collapsedSections[sid] = !this.collapsedSections[sid];
      this.render();
    },

    setActiveMission(catName) {
      this.activeMission = catName;
      const cats = [...new Set(this.masterIntelCatalog.map(i => i.cat))];
      cats.forEach(c => {
        const sid = c.replace(/[^a-z0-9]/gi, '');
        this.collapsedSections[sid] = (c !== catName);
      });
      const select = document.getElementById('mission-focus-select');
      if (select) select.value = catName;

      this.render();
      this.silentSaveGameTelemetry();
    },

    populateMissionSelector() {
      const select = document.getElementById('mission-focus-select');
      if (!select) return;
      const cats = [...new Set(this.masterIntelCatalog.map(i => i.cat))];
      select.innerHTML = '';
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat.toUpperCase();
        if (cat === this.activeMission) opt.selected = true;
        select.appendChild(opt);
      });
    },

    initDynamicFeatures() {
      const platSelect = document.getElementById("platformSelect");
      if (platSelect) {
        platSelect.addEventListener("change", (e) => {
          this.currentPlatform = e.target.value;
          this.recalculateCrossTrophyTelemetry();
          this.render();
          this.silentSaveGameTelemetry();
        });
      }

      const focusSelect = document.getElementById("mission-focus-select");
      if (focusSelect) {
        focusSelect.addEventListener("change", (e) => {
          this.setActiveMission(e.target.value);
        });
      }
    },

    render() {
      const container = document.getElementById("section-container") || document.getElementById("intelCatalogContainer");
      if (!container) return;

      container.innerHTML = "";
      const total = this.masterIntelCatalog.length || 1;
      const progressEntries = Object.values(this.userProgressMap);
      const earnedList = progressEntries.filter(t => t.collected);
      const earnedCount = earnedList.length;
      const progressPercent = Math.round((earnedCount / total) * 100);

      const isLivePS = this.currentPlatform === "ps" && (this.psnOnlineId || this.psnAccountId);
      const platformName = this.currentPlatform.toUpperCase();

      const psTel = this.crossPlatformTelemetry.ps || { earned: 0, percent: 0 };
      const pcTel = this.crossPlatformTelemetry.pc || { earned: 0, percent: 0 };
      const xboxTel = this.crossPlatformTelemetry.xbox || { earned: 0, percent: 0 };

      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = "grid-column: 1/-1; background:#151c27; padding:16px 20px; border-radius:10px; border:1px solid #273447; margin-bottom:14px; display:flex; flex-direction:column; gap:12px;";
      headerDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color:#fff; font-size:1.15rem;">
              ${isLivePS ? `🎮 PlayStation Live Sync &bull; ${this.psnOnlineId}` : `🎯 ${platformName} Tactical Operations Grid`}
            </strong>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
              ${isLivePS ? `Cloud-Authoritative Real-Time Link active via NPWR21465_00` : `Interactive tracking mode: Click items or adjust distance milestones`}
            </div>
          </div>
          <div style="text-align:right;">
            <span class="badge" style="background:#28374d; color:var(--accent-gold); font-size:0.9rem; padding:6px 12px;">
              ${earnedCount} / ${total} Recovered (${progressPercent}%)
            </span>
          </div>
        </div>

        <div style="width:100%; height:10px; background:rgba(255,255,255,0.06); border-radius:5px; overflow:hidden;">
          <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #0088ff, #2ecc71); border-radius:5px; transition: width 0.4s ease;"></div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:6px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border:1px solid #1c2738;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
              <span style="color:#00a6ed; font-weight:700;">🎮 PlayStation</span>
              <strong style="color:#fff;">${psTel.earned}/${total} (${psTel.percent}%)</strong>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
              <div style="width:${psTel.percent}%; height:100%; background:#00a6ed;"></div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
              <span style="color:#00d2d3; font-weight:700;">🖥️ PC / Steam</span>
              <strong style="color:#fff;">${pcTel.earned}/${total} (${pcTel.percent}%)</strong>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
              <div style="width:${pcTel.percent}%; height:100%; background:#00d2d3;"></div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
              <span style="color:#2ecc71; font-weight:700;">❎ Xbox Network</span>
              <strong style="color:#fff;">${xboxTel.earned}/${total} (${xboxTel.percent}%)</strong>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
              <div style="width:${xboxTel.percent}%; height:100%; background:#2ecc71;"></div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(headerDiv);

      const cats = [...new Set(this.masterIntelCatalog.map(i => i.cat))];
      cats.forEach(cat => {
        const rawItems = this.masterIntelCatalog.filter(i => i.cat === cat);
        const count = rawItems.filter(i => this.userProgressMap[i.id] && this.userProgressMap[i.id].collected).length;
        const sid = cat.replace(/[^a-z0-9]/gi, '');
        const isActiveFocus = (cat === this.activeMission);

        const items = [...rawItems].sort((a, b) => {
          const orderA = IN_GAME_TYPE_ORDER[a.type] || 99;
          const orderB = IN_GAME_TYPE_ORDER[b.type] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.id.localeCompare(b.id);
        });

        const catPercent = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
        const tierInfo = getTierStatus(catPercent);
        const hasMap = MISSION_MAP_CONFIG[sid] !== undefined;

        const section = document.createElement("div");
        section.id = `section-${sid}`;
        section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''} ${isActiveFocus ? 'active-focus' : ''}`;

        const mapHtml = hasMap ? `
          <div class="tactical-map-wrapper">
            <div class="tactical-map-bar outlined-text">
              <span>🗺️ TACTICAL MAP &bull; IN-GAME TEXTURE &bull; AUTO-HIDES PINS WHEN FOUND</span>
              <span style="color:#aaa; font-size:10px;">CLICK PIN FOR BRIEFING</span>
            </div>
            <div id="map-frame-${sid}" class="mission-map-frame"></div>
          </div>
        ` : '';

        section.innerHTML = `
          <div class="category-header outlined-text" onclick="window.CompanionApp.toggleSection('${sid}')">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h2 style="font-size:1.1rem; font-weight:900; letter-spacing:1px; color:#fff; text-transform:uppercase;">${cat}</h2>
              <span style="${tierInfo.style} padding:2px 8px; border-radius:4px; font-size:10px; font-weight:900;">
                ${tierInfo.icon} ${tierInfo.label} (${catPercent}%)
              </span>
            </div>
            <div style="font-weight:900; font-size:14px; color:var(--ser-color, #ff8800); font-family:monospace;">${count}/${items.length}</div>
          </div>
          <div class="category-content section-content">
            ${mapHtml}
            <div class="item-grid"></div>
          </div>
        `;

        const grid = section.querySelector(".item-grid");
        items.forEach(item => {
          const uState = this.userProgressMap[item.id] || { collected: false, count: 0 };
          const isDone = Boolean(uState.collected);
          const isNumeric = (item.target !== undefined && item.target > 1) || !!item.isRibbon;
          const isLongShot = !!item.isLongShot;
          const isRibbon = !!item.isRibbon;

          const card = document.createElement("div");
          card.className = `item-card ${isDone ? 'completed' : ''}`;

          const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

          let squadShotMax = item.target || 0;
          if (isLongShot) {
            Object.values(this.teamLiveTelemetry).forEach(op => {
              const col = op.collectibles || {};
              const match = col[item.id];
              if (match && match.count) {
                squadShotMax = Math.max(squadShotMax, Number(match.count));
              }
            });
            squadShotMax = Math.max(squadShotMax, uState.count || 0);
          }

          let squadBadgesHtml = '';
          Object.values(this.teamLiveTelemetry).forEach(op => {
            const opEntry = (op.collectibles && op.collectibles[item.id]) ? op.collectibles[item.id] : null;
            const opCollected = opEntry ? Boolean(opEntry.collected || (opEntry.count && Number(opEntry.count) > 0)) : false;
            const opCount = opEntry && opEntry.count !== undefined ? Number(opEntry.count) : (opCollected ? '✓' : 0);

            let displayBadgeText = op.username.toUpperCase();
            let dynamicStyle = '';

            if (isLongShot) {
              displayBadgeText = `${op.username.toUpperCase()} (${opCount}m)`;
              const heat = getLongShotHeatmapStyle(opCount, 0, squadShotMax);
              dynamicStyle = `background: ${heat.background} !important; color: ${heat.color} !important; border: ${heat.border} !important;`;
              if (opCount > 0 && opCount === squadShotMax) displayBadgeText = `👑 ${displayBadgeText}`;
            } else if (isRibbon) {
              displayBadgeText = `${op.username.toUpperCase()} (${opCount}x)`;
            } else if (isNumeric) {
              displayBadgeText = `${op.username.toUpperCase()} (${opCount})`;
            }

            squadBadgesHtml += `<span class="team-badge ${opCollected ? 'is-collected' : ''}" style="${dynamicStyle}">${displayBadgeText}</span>`;
          });

          let actionControlsHtml = '';
          if (isNumeric) {
            const countVal = uState.count || 0;
            const targetVal = item.target || 1;
            actionControlsHtml = `
              <div class="stepper-action-row">
                <button class="step-btn outlined-text" onclick="window.CompanionApp.stepItemCount('${item.id}', -1)">−</button>
                <div id="val-box-${item.id}" class="clickable-num-pill outlined-text" onclick="window.CompanionApp.openDirectNumberEditor('${item.id}', ${countVal}, ${targetVal}, ${isLongShot || isRibbon})">
                  ${isLongShot ? `🎯 ${countVal}m / ${targetVal}m` : (isRibbon ? `🎖️ EARNED: ${countVal}x` : `✏️ ${countVal} /${targetVal}`)}
                </div>
                <button class="step-btn outlined-text" onclick="window.CompanionApp.stepItemCount('${item.id}', 1)">+</button>
              </div>
            `;
          } else {
            actionControlsHtml = `
              <div class="card-actions-row">
                ${item.yt ? `<a href="${item.yt}" target="_blank" rel="noopener noreferrer" class="watch-clip-btn outlined-text">🎥 CLIP</a>` : `<span></span>`}
                <button class="confirm-toggle-btn outlined-text ${isDone ? 'completed-state' : ''}" onclick="window.CompanionApp.toggleItem('${item.id}')">
                  ${isDone ? 'COLLECTED (Undo)' : 'MARK FOUND'}
                </button>
              </div>
            `;
          }

          card.innerHTML = `
            <div>
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                <img src="${iconUrl}" style="width:20px; height:20px; border-radius:4px; object-fit:cover;" onerror="this.style.display='none'">
                <span class="item-type-badge">${item.type}</span>
              </div>
              <div class="item-title outlined-text">${item.name}</div>
              <div class="item-desc outlined-text">${item.desc}</div>
            </div>
            <div>
              ${squadBadgesHtml ? `
                <div class="team-intel-row">
                  <span class="team-intel-label">SQUAD PROGRESS:</span>
                  ${squadBadgesHtml}
                </div>
              ` : ''}
              ${actionControlsHtml}
            </div>
          `;
          grid.appendChild(card);
        });

        container.appendChild(section);

        if (!this.collapsedSections[sid] && hasMap) {
          setTimeout(() => this.initTacticalGameMapForSection(sid, cat), 50);
        }
      });
    },

    renderSquadComparisonDeck() {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;
      container.innerHTML = "";

      const ops = Object.values(this.teamLiveTelemetry);
      if (!ops.length) {
        container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No squad operatives active.</p>`;
        return;
      }

      ops.forEach(op => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.style.borderLeft = "3px solid #00d2d3";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${op.avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #00d2d3;">
              <strong style="color:#fff; font-size:0.95rem;">${op.username}</strong>
            </div>
            <span class="badge" style="background:#28374d; color:#00d2d3;">${op.platform}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; color:var(--text-muted);">
            <div>Rank: <strong style="color:#fff;">Rank ${op.rank}</strong></div>
            <div>Score: <strong style="color:var(--accent-amber);">${op.score} pts</strong></div>
            <div style="grid-column: 1/-1;">
              Achievements / Intel: <strong style="color:var(--accent-gold);">${op.trophiesEarned} / ${op.trophiesTotal}</strong>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    },

    initTacticalGameMapForSection(sid, catName) {
      const mapContainer = document.getElementById(`map-frame-${sid}`);
      if (!mapContainer || typeof L === 'undefined') return;

      if (this.activeLeafletMaps[sid]) {
        this.activeLeafletMaps[sid].remove();
        delete this.activeLeafletMaps[sid];
      }

      const mapConfig = MISSION_MAP_CONFIG[sid] || { imgUrl: DEFAULT_GAME_POSTER, w: 2048, h: 2048 };

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

      const sectionItems = this.masterIntelCatalog.filter(i => i.cat === catName && i.x !== undefined && i.y !== undefined);
      sectionItems.forEach(item => {
        const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

        const pinIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<img src="${iconUrl}" style="width:22px; height:22px; border-radius:50%; object-fit:cover; display:block;">`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const yCoord = mapConfig.h - item.y;
        const xCoord = item.x;

        const marker = L.marker([yCoord, xCoord], { icon: pinIcon })
          .bindPopup(`
            <div style="color:#000; font-family:sans-serif; font-size:12px;">
              <strong style="color:#d35400; text-transform:uppercase;">${item.type}</strong><br>
              <strong style="font-size:13px;">${item.name}</strong><br>
              <span style="color:#555; font-style:italic;">${item.desc}</span>
            </div>
          `);

        this.markerLayers[item.id] = marker;

        const isFound = this.userProgressMap[item.id] && this.userProgressMap[item.id].collected;
        if (!isFound) marker.addTo(map);
      });
    },

    updateMapPinVisibility(id, collected) {
      const marker = this.markerLayers[id];
      if (!marker) return;

      const item = this.masterIntelCatalog.find(i => i.id === id);
      if (!item) return;

      const sid = item.cat.replace(/[^a-z0-9]/gi, '');
      const map = this.activeLeafletMaps[sid];
      if (!map) return;

      if (collected) {
        map.removeLayer(marker);
      } else {
        marker.addTo(map);
      }
    },

    renderProfileDropdown(isAuthenticated) {
      let menu = document.getElementById("userProfileDropdownMenu");
      const profileBadge = document.getElementById("userProfile");

      if (!menu && profileBadge) {
        menu = document.createElement("div");
        menu.id = "userProfileDropdownMenu";
        menu.className = "profile-dropdown-menu hidden";
        menu.style.cssText = `
          position: absolute;
          top: 60px;
          right: 20px;
          background: #151c27;
          border: 1px solid #273447;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          z-index: 1005;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
        `;
        document.body.appendChild(menu);

        profileBadge.style.cursor = "pointer";
        profileBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          menu.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
          if (!menu.classList.contains("hidden")) menu.classList.add("hidden");
        });
      }

      if (!menu) return;

      if (isAuthenticated) {
        menu.innerHTML = `
          <a href="../../security/settings.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px; display:flex; align-items:center; gap:8px;">⚙️ Settings Hub</a>
          <a href="../../security/privacy.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px; display:flex; align-items:center; gap:8px;">🔒 Privacy Policy</a>
          <div style="height:1px; background:#273447; margin:2px 0;"></div>
          <button id="menuLogoutBtn" style="background:transparent; border:none; color:#e74c3c; text-align:left; padding:8px 12px; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:8px; font-weight:600;">🚪 Log Out</button>
        `;
        const logoutBtn = document.getElementById("menuLogoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", () => auth.signOut().then(() => window.location.reload()));
      } else {
        menu.innerHTML = `
          <button id="menuLoginBtn" style="background:transparent; border:none; color:#0088ff; text-align:left; padding:8px 12px; font-size:0.85rem; cursor:pointer; font-weight:600;">🔑 Log In</button>
          <a href="../../security/privacy.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px;">🔒 Privacy Policy</a>
        `;
        const loginBtn = document.getElementById("menuLoginBtn");
        if (loginBtn) {
          loginBtn.addEventListener("click", () => {
            const modal = document.getElementById("authModal");
            if (modal) modal.classList.remove("hidden");
          });
        }
      }
    },

    bindUI() {
      const modal = document.getElementById("authModal");
      const authBtn = document.getElementById("authModalBtn");
      const authClose = document.getElementById("authModalClose");

      if (authBtn && modal) authBtn.addEventListener("click", () => modal.classList.remove("hidden"));
      if (authClose && modal) authClose.addEventListener("click", () => modal.classList.add("hidden"));

      const menuBtn = document.getElementById("menuToggle");
      const nav = document.getElementById("dynamicNav");
      if (menuBtn && nav) {
        menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
      }
    },

    updateNewYorkClock() {
      const options = {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      const clockEl = document.getElementById('nyBuildTimestamp') || document.getElementById('ny-timestamp');
      if (clockEl) {
        const timeStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
        clockEl.textContent = `2026-10-10 ${timeStr} EDT`;
      }
    }
  };

  window.CompanionApp = CompanionApp;
  CompanionApp.init();
});
