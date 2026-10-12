// Line 1: Way of the Hunter 2 - Master Tactical Companion Engine
// [Smart Cache-Buster Time: 2026-10-12 01:36 EDT | Firebase Sync Target: /utm_links | Version: 7.3.0]

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";
  const DEFAULT_GAME_POSTER = "https://image.api.playstation.com/vulcan/ap/rnd/202206/0713/bU0e3xUa8F8ZqQvF8n0Lz.png";

  const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
    measurementId: "G-JDNSLD3GFE"
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
    return "hunter@guest.local";
  }

  function getEmailKey(email) {
    if (!email) return "unknown_user";
    return email.toLowerCase().replace(/@/g, "_at_").replace(/\./g, "_");
  }

  const CompanionApp = {
    titleId: "NPWR52231_00",
    files: {
      users: "users.json",
      challenges: "woth2_challenges.json",
      dogSkills: "woth2_dog_skills.json",
      gameData: "woth2_game_data.json",
      harvestSchemas: "woth2_harvest_schemas.json",
      infrastructure: "woth2_infrastructure.json",
      lifecycles: "woth2_lifecycles.json",
      missions: "woth2_missions.json",
      needZones: "woth2_need_zones.json",
      regions: "woth2_regions.json",
      reserves: "woth2_reserves.json",
      species: "woth2_species.json",
      stewardship: "woth2_stewardship.json",
      trails: "woth2_trails.json"
    },

    db: {},
    activeReserve: "Kilimaya Reserve",
    reserveClocks: {
      "Kilimaya Reserve": { day: 2, time: "09:50", weather: "Clear" },
      "Nez Perce Valley": { day: 1, time: "08:30", weather: "Clear / Morning Breeze" },
      "Tikamoon Plains": { day: 1, time: "06:00", weather: "Clear" },
      "Transylvania": { day: 1, time: "07:00", weather: "Partly Cloudy" }
    },
    
    currentDay: 2,
    currentTime: "09:50",
    currentWeather: "Clear",
    hunterName: "Ryder Holloway",
    hunterLevel: 14,
    hunterCredits: 2845,
    fiveStarKills: 1,
    dogCompanionName: "Bacon",
    dogBreed: "American Foxhound",
    dogBondingLevel: 3,
    dogFollowingCommandsLevel: 0,
    dogBloodTrackingLevel: 3,
    dogSearchQuarteringLevel: 0,
    currentUser: null,
    currentEmail: "",
    currentEmailKey: "",
    currentPlatform: "ps",
    watchlist: [],
    psnAccountId: "",
    psnOnlineId: "",
    userFriendCode: "",
    masterTrophies: [],
    userTrophyProgress: {},
    userChallengeProgress: {},
    unlockedSkills: {},
    restoredHazards: {},
    orderedMounts: {},
    crossPlatformTelemetry: {
      ps: { earned: 0, total: 0, percent: 0 },
      pc: { earned: 0, total: 0, percent: 0 },
      xbox: { earned: 0, total: 0, percent: 0 }
    },
    trophyGroups: [],
    selectedTrophyGroup: "all",
    gameMetadata: {},
    friendsRoster: [],
    teamLiveTelemetry: {},
    friendUnsubscribers: [],
    hasLoadedPrimaryPoster: false,

    lodgeCatalog: [
      { id: "gear_scope_overgaard", name: "Overgaard Night Hawk 4-1 Hunting Scope", category: "Optics", cost: 725, requiredLevel: 3, description: "Precision thermal optic with clear multi-coated glass and balanced zoom." },
      { id: "gear_rifle_primacy_270", name: "Primacy Superior 7700 (MDT Oryx Chassis)", category: "Firearms", cost: 2400, requiredLevel: 4, description: "Chassis rifle chambered in .270 Win optimized for flat trajectories." },
      { id: "gear_caller_predator", name: "Double Jackrabbit Predator Call", category: "Callers", cost: 350, requiredLevel: 1, description: "Simulates injured rabbit distress sounds to draw in wolves, lions, and jackals." },
      { id: "gear_caller_hog", name: "Primos Hog Squealer Call", category: "Callers", cost: 380, requiredLevel: 1, description: "Authentic pitch-tuned distress caller designed to bring in wild boars and warthogs." },
      { id: "gear_support_tallmono", name: "Trigger Stick Gen3 Tall Mono", category: "Field Gear", cost: 420, requiredLevel: 2, description: "Fast-deploying single-leg rifle rest for long-distance stability in tall brush." }
    ],

    async init() {
      this.loadSavedState();
      this.bindUI();
      this.initAuth();
      this.initMasterGameData();
      this.initRTDB();
      await this.loadAllJSONs();
      this.applyUserThemeAndIdentity();
      this.integrateJSONTrophies();
      this.initDynamicFeatures();
    },

    async fetchJSON(fileName) {
      const paths = [
        "../../data/" + fileName,
        "../data/" + fileName,
        "./data/" + fileName,
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
        this.db[k] = results[idx] || {};
      });
    },

    // Global Financial Transaction Engine
    processTransaction(amount, type, description) {
      const numericAmount = Number(amount) || 0;
      if (type === "expense" && this.hunterCredits < numericAmount) {
        alert(`⚠️ Insufficient Credits! You need $${numericAmount - this.hunterCredits} more credits for: ${description}`);
        return false;
      }

      if (type === "income") {
        this.hunterCredits += numericAmount;
      } else {
        this.hunterCredits -= numericAmount;
      }

      this.safeSetValue("hunterCreditsInput", this.hunterCredits);
      localStorage.setItem("woth2_credits", this.hunterCredits);
      
      this.renderLodgeForecaster();
      this.renderInfrastructure();
      this.silentSaveGameTelemetry();
      return true;
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
            root.style.setProperty("--accent-primary", matchedUser.theme.primary_color);
          }
          if (matchedUser.theme.accent_color) {
            root.style.setProperty("--theme-accent", matchedUser.theme.accent_color);
            root.style.setProperty("--accent-gold", matchedUser.theme.accent_color);
          }
          if (matchedUser.theme.surface_color) {
            root.style.setProperty("--theme-surface", matchedUser.theme.surface_color);
          }
        }
      }
    },

    integrateJSONTrophies() {
      if (this.db.gameData && this.db.gameData.trophies) {
        const jsonTrophies = Array.isArray(this.db.gameData.trophies)
          ? this.db.gameData.trophies
          : Object.values(this.db.gameData.trophies);

        jsonTrophies.forEach((t, idx) => {
          const id = t.trophyId !== undefined ? String(t.trophyId) : String(idx);
          if (t.earned || t.unlocked) {
            if (!this.userTrophyProgress[id] || !this.userTrophyProgress[id].earned) {
              this.userTrophyProgress[id] = {
                earned: true,
                timestamp: t.timestamp || t.date || new Date().toISOString(),
                currentValue: t.currentValue !== undefined ? Number(t.currentValue) : null,
                targetValue: t.targetValue !== undefined ? Number(t.targetValue) : null,
                manual: false,
                source: "json"
              };
            }
          }
        });
      }
      this.recalculateCrossTrophyTelemetry();
      this.renderTrophies();
    },

    loadSavedState() {
      const savedReserve = localStorage.getItem("woth2_active_reserve");
      if (savedReserve) this.activeReserve = savedReserve;

      const savedClocks = localStorage.getItem("woth2_reserve_clocks");
      if (savedClocks) {
        try { this.reserveClocks = JSON.parse(savedClocks); } catch (e) {}
      }

      const activeClock = this.reserveClocks[this.activeReserve] || { day: 2, time: "09:50", weather: "Clear" };
      this.currentDay = activeClock.day;
      this.currentTime = activeClock.time;
      this.currentWeather = activeClock.weather;

      const savedPlatform = localStorage.getItem("woth2_platform");
      const savedWatch = localStorage.getItem("woth2_watchlist");
      const savedName = localStorage.getItem("woth2_name");
      const savedLevel = localStorage.getItem("woth2_level");
      const savedCredits = localStorage.getItem("woth2_credits");
      const savedFiveStars = localStorage.getItem("woth2_five_stars");

      const savedBonding = localStorage.getItem("woth2_dog_bonding");
      const savedFollowing = localStorage.getItem("woth2_dog_following");
      const savedBlood = localStorage.getItem("woth2_dog_blood");
      const savedSearch = localStorage.getItem("woth2_dog_search");
      const savedTrophyProgress = localStorage.getItem("woth2_manual_trophies");
      const savedChallenges = localStorage.getItem("woth2_challenges_progress");
      const savedSkills = localStorage.getItem("woth2_unlocked_skills");
      const savedHazards = localStorage.getItem("woth2_restored_hazards");

      if (savedPlatform) this.currentPlatform = savedPlatform;
      if (savedName) this.hunterName = savedName;
      if (savedLevel) this.hunterLevel = parseInt(savedLevel, 10);
      if (savedCredits) this.hunterCredits = parseInt(savedCredits, 10);
      if (savedFiveStars) this.fiveStarKills = parseInt(savedFiveStars, 10);

      if (savedBonding) this.dogBondingLevel = parseInt(savedBonding, 10);
      if (savedFollowing) this.dogFollowingCommandsLevel = parseInt(savedFollowing, 10);
      if (savedBlood) this.dogBloodTrackingLevel = parseInt(savedBlood, 10);
      if (savedSearch) this.dogSearchQuarteringLevel = parseInt(savedSearch, 10);

      if (savedWatch) {
        try { this.watchlist = JSON.parse(savedWatch); } catch (e) { this.watchlist = []; }
      }
      if (savedTrophyProgress) {
        try { this.userTrophyProgress = JSON.parse(savedTrophyProgress); } catch (e) { this.userTrophyProgress = {}; }
      }
      if (savedChallenges) {
        try { this.userChallengeProgress = JSON.parse(savedChallenges); } catch (e) { this.userChallengeProgress = {}; }
      }
      if (savedSkills) {
        try { this.unlockedSkills = JSON.parse(savedSkills); } catch (e) { this.unlockedSkills = {}; }
      }
      if (savedHazards) {
        try { this.restoredHazards = JSON.parse(savedHazards); } catch (e) { this.restoredHazards = {}; }
      }

      this.safeSetValue("currentReserveSelect", this.activeReserve);
      this.safeSetValue("currentDayInput", this.currentDay);
      this.safeSetValue("currentTimeInput", this.currentTime);
      this.safeSetValue("hunterNameInput", this.hunterName);
      this.safeSetValue("hunterLevelInput", this.hunterLevel);
      this.safeSetValue("hunterCreditsInput", this.hunterCredits);
      this.safeSetValue("weatherConditionInput", this.currentWeather);
      this.safeSetValue("platformSelect", this.currentPlatform);
      this.updateDogInputDisplay();
    },

    safeSetValue(id, val) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    },

    safeSetText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    },

    updateDogInputDisplay() {
      this.safeSetValue("dogCompanionInput", `${this.dogCompanionName} (Lv. ${this.dogBondingLevel})`);
    },

    switchReserveClock(reserveName) {
      if (!reserveName) return;
      this.activeReserve = reserveName;
      localStorage.setItem("woth2_active_reserve", this.activeReserve);

      if (!this.reserveClocks[this.activeReserve]) {
        this.reserveClocks[this.activeReserve] = { day: 1, time: "07:00", weather: "Clear" };
      }

      const clk = this.reserveClocks[this.activeReserve];
      this.currentDay = clk.day;
      this.currentTime = clk.time;
      this.currentWeather = clk.weather;

      this.safeSetValue("currentDayInput", this.currentDay);
      this.safeSetValue("currentTimeInput", this.currentTime);
      this.safeSetValue("weatherConditionInput", this.currentWeather);

      this.populateRegions();
      this.renderWatchlist();
      this.silentSaveGameTelemetry();
    },

    applyBrandArt(imgUrl) {
      if (!imgUrl || typeof imgUrl !== "string") return;
      const cleanUrl = imgUrl.trim();
      const favicon = document.getElementById("dynamicFavicon");
      const appleIcon = document.getElementById("dynamicAppleIcon");
      const brandLogo = document.getElementById("navBrandLogo");

      if (favicon) favicon.href = cleanUrl;
      if (appleIcon) appleIcon.href = cleanUrl;
      if (brandLogo) brandLogo.src = cleanUrl;
    },

    initMasterGameData() {
      rtdb.ref(`/psn/games/${this.titleId}`).on("value", snapshot => {
        const game = snapshot.val();
        if (!game) return;
        this.gameMetadata = game;

        if (game.posterArt && typeof game.posterArt === "string" && game.posterArt.trim() !== "") {
          this.applyBrandArt(game.posterArt);
          this.hasLoadedPrimaryPoster = true;
        }

        if (game.groups) {
          this.trophyGroups = Array.isArray(game.groups) ? game.groups : Object.values(game.groups);
        }

        let rawTrophies = [];
        if (game.rawSonyMetadata && game.rawSonyMetadata.trophies) {
          rawTrophies = Array.isArray(game.rawSonyMetadata.trophies)
            ? game.rawSonyMetadata.trophies
            : Object.values(game.rawSonyMetadata.trophies);
        }

        if (rawTrophies.length > 0) {
          this.masterTrophies = rawTrophies.map((t, idx) => {
            let grade = t.trophyType || "Bronze";
            grade = grade.charAt(0).toUpperCase() + grade.slice(1).toLowerCase();
            return {
              trophyId: t.trophyId !== undefined ? String(t.trophyId) : String(idx),
              title: t.trophyName || `Trophy #${idx + 1}`,
              desc: t.trophyDetail || "Way of the Hunter 2 milestone.",
              icon: t.trophyIconUrl || game.posterArt || DEFAULT_GAME_POSTER,
              grade: grade,
              groupId: t.trophyGroupId !== undefined ? String(t.trophyGroupId) : "default",
              hidden: Boolean(t.trophyHidden)
            };
          });
        }

        this.recalculateCrossTrophyTelemetry();
        this.renderTrophies();
      });
    },

    getSanitizedTrophiesForFirestore() {
      const cleanMap = {};
      Object.entries(this.userTrophyProgress).forEach(([id, t]) => {
        if (!t) return;
        cleanMap[id] = {
          earned: Boolean(t.earned),
          timestamp: t.timestamp ? String(t.timestamp) : null,
          currentValue: (t.currentValue !== undefined && t.currentValue !== null) ? Number(t.currentValue) : null,
          targetValue: (t.targetValue !== undefined && t.targetValue !== null) ? Number(t.targetValue) : null,
          manual: Boolean(t.manual),
          source: t.source ? String(t.source) : "manual"
        };
      });
      return cleanMap;
    },

    async loadAllPlatformTrophyProgress() {
      const targetUserKey = this.currentEmailKey || (this.currentEmail ? getEmailKey(this.currentEmail) : "");
      if (!targetUserKey) return;

      const platforms = ["ps", "pc", "xbox"];
      const total = this.masterTrophies.length || 6;

      for (const p of platforms) {
        try {
          const snap = await db.collection("users")
            .doc(targetUserKey)
            .collection("platform")
            .doc(p)
            .collection("progress")
            .doc("woth2")
            .get();

          if (snap.exists) {
            const data = snap.data();
            const earned = data.trophies_earned || 0;
            const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
            this.crossPlatformTelemetry[p] = { earned, total, percent: pct };
          } else {
            if (p === this.currentPlatform) {
              const currentEarned = Object.values(this.userTrophyProgress).filter(t => t.earned).length;
              const pct = total > 0 ? Math.round((currentEarned / total) * 100) : 0;
              this.crossPlatformTelemetry[p] = { earned: currentEarned, total, percent: pct };
            } else {
              this.crossPlatformTelemetry[p] = { earned: 0, total, percent: 0 };
            }
          }
        } catch (e) {
          console.warn(`Error loading telemetry for platform ${p}:`, e);
        }
      }
      this.renderTrophies();
    },

    recalculateCrossTrophyTelemetry() {
      const total = this.masterTrophies.length || 6;
      const currentEarned = Object.values(this.userTrophyProgress).filter(t => t.earned).length;
      const pct = total > 0 ? Math.round((currentEarned / total) * 100) : 0;

      if (!this.crossPlatformTelemetry[this.currentPlatform]) {
        this.crossPlatformTelemetry[this.currentPlatform] = { earned: 0, total, percent: 0 };
      }
      this.crossPlatformTelemetry[this.currentPlatform] = {
        earned: currentEarned,
        total: total,
        percent: pct
      };
    },

    async silentSaveGameTelemetry() {
      const nameEl = document.getElementById("hunterNameInput");
      const lvlEl = document.getElementById("hunterLevelInput");
      const crdEl = document.getElementById("hunterCreditsInput");
      const dayEl = document.getElementById("currentDayInput");
      const timeEl = document.getElementById("currentTimeInput");
      const weatherEl = document.getElementById("weatherConditionInput");
      const platEl = document.getElementById("platformSelect");

      if (nameEl) this.hunterName = nameEl.value.trim() || "Hunter";
      if (lvlEl) this.hunterLevel = parseInt(lvlEl.value, 10) || 1;
      if (crdEl) this.hunterCredits = parseInt(crdEl.value, 10) || 0;
      if (dayEl) this.currentDay = parseInt(dayEl.value, 10) || 1;
      if (timeEl) this.currentTime = timeEl.value || "09:50";
      if (weatherEl) this.currentWeather = weatherEl.value || "Clear";
      if (platEl) this.currentPlatform = platEl.value || this.currentPlatform;

      this.reserveClocks[this.activeReserve] = {
        day: this.currentDay,
        time: this.currentTime,
        weather: this.currentWeather
      };

      localStorage.setItem("woth2_reserve_clocks", JSON.stringify(this.reserveClocks));
      localStorage.setItem("woth2_day", this.currentDay);
      localStorage.setItem("woth2_time", this.currentTime);
      localStorage.setItem("woth2_weather", this.currentWeather);
      localStorage.setItem("woth2_platform", this.currentPlatform);
      localStorage.setItem("woth2_name", this.hunterName);
      localStorage.setItem("woth2_level", this.hunterLevel);
      localStorage.setItem("woth2_credits", this.hunterCredits);
      localStorage.setItem("woth2_five_stars", this.fiveStarKills);

      localStorage.setItem("woth2_dog_bonding", this.dogBondingLevel);
      localStorage.setItem("woth2_dog_following", this.dogFollowingCommandsLevel);
      localStorage.setItem("woth2_dog_blood", this.dogBloodTrackingLevel);
      localStorage.setItem("woth2_dog_search", this.dogSearchQuarteringLevel);
      localStorage.setItem("woth2_watchlist", JSON.stringify(this.watchlist));
      localStorage.setItem("woth2_manual_trophies", JSON.stringify(this.userTrophyProgress));
      localStorage.setItem("woth2_challenges_progress", JSON.stringify(this.userChallengeProgress));
      localStorage.setItem("woth2_unlocked_skills", JSON.stringify(this.unlockedSkills));
      localStorage.setItem("woth2_restored_hazards", JSON.stringify(this.restoredHazards));

      this.recalculateCrossTrophyTelemetry();
      this.renderLodgeForecaster();

      const activeUser = auth.currentUser;
      const targetUserKey = this.currentEmailKey || (this.currentEmail ? getEmailKey(this.currentEmail) : "");

      if (activeUser && targetUserKey) {
        try {
          const gameDocRef = db.collection("users")
            .doc(targetUserKey)
            .collection("platform")
            .doc(this.currentPlatform)
            .collection("progress")
            .doc("woth2");

          const cleanTrophies = this.getSanitizedTrophiesForFirestore();
          const earnedCount = Object.values(cleanTrophies).filter(t => t.earned).length;
          const totalTrophies = this.masterTrophies.length || 6;
          const trophyPct = totalTrophies > 0 ? Math.round((earnedCount / totalTrophies) * 100) : 0;

          await gameDocRef.set({
            hunter_name: this.hunterName,
            hunter_level: this.hunterLevel,
            hunter_credits: this.hunterCredits,
            five_star_kills: this.fiveStarKills,
            friend_code: this.userFriendCode || null,
            active_reserve: this.activeReserve,
            reserve_clocks: this.reserveClocks,
            companion_day: this.currentDay,
            companion_time: this.currentTime,
            weather: this.currentWeather,
            platform: this.currentPlatform,
            psn_online_id: this.psnOnlineId || null,
            psn_account_id: this.psnAccountId || null,
            trophies_earned: earnedCount,
            trophies_total: totalTrophies,
            trophies_percent: trophyPct,
            trophies: cleanTrophies,
            challenges: this.userChallengeProgress,
            skills: this.unlockedSkills,
            restored_hazards: this.restoredHazards,
            dog_stats: {
              name: this.dogCompanionName,
              breed: this.dogBreed,
              bonding: this.dogBondingLevel,
              following: this.dogFollowingCommandsLevel,
              blood: this.dogBloodTrackingLevel,
              search: this.dogSearchQuarteringLevel
            },
            harvest_count: (this.db.gameData && this.db.gameData.harvest_records) ? this.db.gameData.harvest_records.length : 0,
            watchlist: this.watchlist,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

        } catch (e) {
          console.warn("⚠️ Telemetry Sync Failed: " + e.message);
        }
      }
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

        this.syncWoth2FaviconFallback(items, raw);
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

    syncWoth2FaviconFallback(items, raw) {
      let backupImg = "";
      let woth2Stamp = "";

      const taggedEntry = items.find(i => i.tag && i.tag.toLowerCase() === "woth2");

      if (taggedEntry) {
        backupImg = taggedEntry.image;
        woth2Stamp = taggedEntry.updatedAt;
      } else if (raw.WOTH2 && raw.WOTH2[0] && raw.WOTH2[0].image) {
        backupImg = raw.WOTH2[0].image;
        woth2Stamp = raw.WOTH2[0].updatedAt;
      } else {
        const titleMatch = items.find(i => {
          const t = i.title.toLowerCase();
          return t.includes("woth2") || t.includes("way of the hunter");
        });
        if (titleMatch) {
          backupImg = titleMatch.image;
          woth2Stamp = titleMatch.updatedAt;
        }
      }

      if (!this.hasLoadedPrimaryPoster && backupImg) {
        this.applyBrandArt(backupImg);
      }

      if (woth2Stamp) {
        this.safeSetText("nyBuildTimestamp", woth2Stamp);
      }
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
            const gamerTag = rtdbProfile.username || user.displayName || this.hunterName;
            let avatarUrl = rtdbProfile.avatar_url || user.photoURL || DEFAULT_USER_AVATAR;

            if (rtdbProfile.avatar_source === "google") {
              avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;
            }

            if (nameEl) nameEl.textContent = gamerTag;
            if (avatarEl) avatarEl.src = avatarUrl;

            this.psnAccountId = rtdbProfile.psn_account_id || this.psnAccountId || "";
            this.psnOnlineId = rtdbProfile.psn_username || this.psnOnlineId || "";
            this.userFriendCode = rtdbProfile.friend_code || this.userFriendCode || "";

            if (rtdbProfile.primary_platform) {
              this.currentPlatform = rtdbProfile.primary_platform.toLowerCase();
              this.safeSetValue("platformSelect", this.currentPlatform);
            }

            const isLivePS = this.currentPlatform === "ps" && Boolean(this.psnOnlineId || this.psnAccountId);
            if (isLivePS) {
              this.syncPlayStationTrophies(this.psnOnlineId, this.psnAccountId);
            }

            const rawFriends = rtdbProfile.friends || {};
            this.friendsRoster = Object.entries(rawFriends).map(([code, fData]) => {
              return {
                friend_code: code,
                username: fData.username || "Companion",
                avatar_url: fData.avatar_url || DEFAULT_USER_AVATAR,
                primary_platform: fData.primary_platform || "ps",
                target_email: fData.email || fData.target_email || "",
                linked_at: fData.linked_at || ""
              };
            });

            this.loadFriendsComparisonTelemetry();
            this.loadAllPlatformTrophyProgress();
          });

          try {
            const gameSnap = await db.collection("users")
              .doc(this.currentEmailKey)
              .collection("platform")
              .doc(this.currentPlatform)
              .collection("progress")
              .doc("woth2")
              .get();

            if (gameSnap.exists) {
              const data = gameSnap.data();
              if (data.hunter_name) {
                this.hunterName = data.hunter_name;
                this.safeSetValue("hunterNameInput", this.hunterName);
              }
              if (data.hunter_level) {
                this.hunterLevel = data.hunter_level;
                this.safeSetValue("hunterLevelInput", this.hunterLevel);
              }
              if (data.hunter_credits !== undefined) {
                this.hunterCredits = data.hunter_credits;
                this.safeSetValue("hunterCreditsInput", this.hunterCredits);
              }
              if (data.five_star_kills !== undefined) {
                this.fiveStarKills = data.five_star_kills;
              }
              if (data.active_reserve) {
                this.activeReserve = data.active_reserve;
                this.safeSetValue("currentReserveSelect", this.activeReserve);
              }
              if (data.reserve_clocks) {
                this.reserveClocks = data.reserve_clocks;
              }
              if (data.companion_day) {
                this.currentDay = data.companion_day;
                this.safeSetValue("currentDayInput", this.currentDay);
              }
              if (data.companion_time) {
                this.currentTime = data.companion_time;
                this.safeSetValue("currentTimeInput", this.currentTime);
              }
              if (data.weather) {
                this.currentWeather = data.weather;
                this.safeSetValue("weatherConditionInput", this.currentWeather);
              }
              if (data.challenges) {
                this.userChallengeProgress = data.challenges;
                this.renderChallenges();
              }
              if (data.skills) {
                this.unlockedSkills = data.skills;
                this.renderSkills();
              }
              if (data.restored_hazards) {
                this.restoredHazards = data.restored_hazards;
                this.renderInfrastructure();
              }
              if (data.dog_stats) {
                this.dogBondingLevel = data.dog_stats.bonding ?? this.dogBondingLevel;
                this.dogFollowingCommandsLevel = data.dog_stats.following ?? this.dogFollowingCommandsLevel;
                this.dogBloodTrackingLevel = data.dog_stats.blood ?? this.dogBloodTrackingLevel;
                this.dogSearchQuarteringLevel = data.dog_stats.search ?? this.dogSearchQuarteringLevel;
                this.updateDogInputDisplay();
                this.renderDogProfile();
              }
              if (data.watchlist && Array.isArray(data.watchlist)) {
                this.watchlist = data.watchlist;
                this.renderWatchlist();
              }

              if (data.trophies && typeof data.trophies === "object") {
                Object.entries(data.trophies).forEach(([id, t]) => {
                  if (t.earned) {
                    this.userTrophyProgress[id] = {
                      earned: true,
                      timestamp: t.timestamp || null,
                      currentValue: t.currentValue !== undefined ? t.currentValue : null,
                      targetValue: t.targetValue !== undefined ? t.targetValue : null,
                      manual: Boolean(t.manual),
                      source: t.source || "firestore"
                    };
                  }
                });
                this.recalculateCrossTrophyTelemetry();
                this.renderTrophies();
              }
            }
          } catch (e) {
            console.warn("Firestore progress read warning:", e);
          }

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

    syncPlayStationTrophies(psnOnlineId, accountId) {
      const targetGamerTag = (psnOnlineId || "").trim();
      let trophyRef = null;

      if (targetGamerTag) {
        trophyRef = rtdb.ref(`/psn/gamertags/${targetGamerTag}/liveTrophyProgress/${this.titleId}`);
      } else if (accountId) {
        trophyRef = rtdb.ref(`/psn/trophies/woth2/${accountId}`);
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
            const id = t.trophyId !== undefined ? String(t.trophyId) : String(idx);
            const isEarned = Boolean(t.earned || t.unlocked || t.timestamp || t.earnedDateTime);
            const dateStr = t.timestamp || t.earnedDateTime || (isEarned ? (t.updatedAt || new Date().toISOString()) : null);

            const existing = this.userTrophyProgress[id] || {};

            this.userTrophyProgress[id] = {
              earned: isEarned || existing.earned || false,
              timestamp: dateStr || existing.timestamp || null,
              currentValue: t.currentValue !== undefined ? Number(t.currentValue) : (existing.currentValue !== undefined ? existing.currentValue : null),
              targetValue: t.targetValue !== undefined ? Number(t.targetValue) : (existing.targetValue !== undefined ? existing.targetValue : null),
              manual: false,
              source: isEarned ? "psn" : (existing.source || "psn")
            };
          });

          this.recalculateCrossTrophyTelemetry();
          this.renderTrophies();
          await this.silentSaveGameTelemetry();
        }
      });
    },

    toggleManualTrophy(trophyId) {
      const isLivePSAutomated = (this.currentPlatform === "ps") && Boolean(this.psnAccountId || this.psnOnlineId);
      if (isLivePSAutomated) {
        return;
      }

      const id = String(trophyId);
      const current = this.userTrophyProgress[id] || { earned: false };

      if (current.earned) {
        this.userTrophyProgress[id] = {
          earned: false,
          timestamp: null,
          currentValue: null,
          targetValue: null,
          manual: true,
          source: "manual"
        };
      } else {
        this.userTrophyProgress[id] = {
          earned: true,
          timestamp: new Date().toISOString(),
          currentValue: null,
          targetValue: null,
          manual: true,
          source: "manual"
        };
      }

      this.recalculateCrossTrophyTelemetry();
      this.renderTrophies();
      this.silentSaveGameTelemetry();
    },

    renderTrophies() {
      const container = document.getElementById("trophyChamberGrid") || document.getElementById("psnTrophiesContainer");
      if (!container) return;

      const total = this.masterTrophies.length || 21;
      const progressEntries = Object.values(this.userTrophyProgress);
      const earnedList = progressEntries.filter(t => t.earned);
      const earnedCount = earnedList.length;
      const progressPercent = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

      let firstTrophyText = "No milestones earned yet across platforms";
      if (earnedList.length > 0) {
        const sortedEarned = [...earnedList].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        const first = sortedEarned[0];
        const firstId = Object.keys(this.userTrophyProgress).find(k => this.userTrophyProgress[k] === first);
        const firstMaster = this.masterTrophies.find(m => m.trophyId === firstId);
        const firstTitle = firstMaster ? firstMaster.title : "Milestone Complete";
        const firstDate = new Date(first.timestamp);
        const dateFormatted = !isNaN(firstDate.getTime())
          ? firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : "Recorded";
        firstTrophyText = `🏆 First Unlocked: <strong>${firstTitle}</strong> (${dateFormatted})`;
      }

      const isLivePSAutomated = (this.currentPlatform === "ps") && Boolean(this.psnAccountId || this.psnOnlineId);
      const platformName = this.currentPlatform.toUpperCase();

      const psTelemetry = this.crossPlatformTelemetry.ps || { earned: 0, percent: 0 };
      const pcTelemetry = this.crossPlatformTelemetry.pc || { earned: 0, percent: 0 };
      const xboxTelemetry = this.crossPlatformTelemetry.xbox || { earned: 0, percent: 0 };

      let groupTabsHtml = "";
      if (this.trophyGroups && this.trophyGroups.length > 0) {
        groupTabsHtml = `
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button class="trophy-group-pill ${this.selectedTrophyGroup === 'all' ? 'active' : ''}" onclick="window.CompanionApp.filterTrophyGroup('all')">All Trophies (${total})</button>
            <button class="trophy-group-pill ${this.selectedTrophyGroup === 'default' ? 'active' : ''}" onclick="window.CompanionApp.filterTrophyGroup('default')">Base Game</button>
            ${this.trophyGroups.filter(g => g.trophyGroupId !== "default" && g.trophyGroupId !== 0).map(g => `
              <button class="trophy-group-pill ${this.selectedTrophyGroup === String(g.trophyGroupId) ? 'active' : ''}" onclick="window.CompanionApp.filterTrophyGroup('${g.trophyGroupId}')">
                ${g.trophyGroupName || g.name || `Expansion ${g.trophyGroupId}`}
              </button>
            `).join("")}
          </div>
        `;
      }

      container.innerHTML = `
        <div style="grid-column: 1/-1; background:#151c27; padding:16px 20px; border-radius:10px; border:1px solid #273447; margin-bottom:14px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="color:#fff; font-size:1.15rem;">
                ${isLivePSAutomated ? `🎮 PlayStation Live Sync &bull; ${this.psnOnlineId || 'Connected'}` : `🎯 ${platformName} Trophy Engine (${isLivePSAutomated ? 'Auto Sync' : 'Interactive Manual Mode'})`}
              </strong>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
                ${isLivePSAutomated ? `Real-time synchronization active via NPWR52231_00` : `Click any trophy card below to manually toggle progress`}
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:#28374d; color:var(--accent-gold); font-size:0.9rem; padding:6px 12px;">
                ${earnedCount} / ${total} Active Session (${progressPercent}%)
              </span>
            </div>
          </div>

          <div style="width:100%; height:10px; background:rgba(255,255,255,0.06); border-radius:5px; overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #0088ff, #2ecc71); border-radius:5px; transition: width 0.4s ease;"></div>
          </div>

          <!-- Cross-Platform Trophy Telemetry Deck -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:6px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border:1px solid #1c2738;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <span style="color:#00a6ed; font-weight:700;">🎮 PlayStation</span>
                <strong style="color:#fff;">${psTelemetry.earned}/${total} (${psTelemetry.percent}%)</strong>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                <div style="width:${psTelemetry.percent}%; height:100%; background:#00a6ed;"></div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <span style="color:#00d2d3; font-weight:700;">🖥️ PC / Steam</span>
                <strong style="color:#fff;">${pcTelemetry.earned}/${total} (${pcTelemetry.percent}%)</strong>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                <div style="width:${pcTelemetry.percent}%; height:100%; background:#00d2d3;"></div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <span style="color:#2ecc71; font-weight:700;">❎ Xbox Network</span>
                <strong style="color:#fff;">${xboxTelemetry.earned}/${total} (${xboxTelemetry.percent}%)</strong>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                <div style="width:${xboxTelemetry.percent}%; height:100%; background:#2ecc71;"></div>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="font-size:0.8rem; color:#ffe0b3;">
              ${firstTrophyText}
            </div>
            ${groupTabsHtml}
          </div>
        </div>
      `;

      const displayTrophies = this.masterTrophies.filter(t => {
        if (this.selectedTrophyGroup === "all") return true;
        if (this.selectedTrophyGroup === "default") return t.groupId === "default" || t.groupId === "0" || !t.groupId;
        return String(t.groupId) === String(this.selectedTrophyGroup);
      });

      displayTrophies.forEach(t => {
        const userState = this.userTrophyProgress[t.trophyId] || { earned: false };
        const isEarned = Boolean(userState.earned);
        const div = document.createElement("div");
        div.className = `telemetry-card ${isEarned ? 'trophy-card-earned' : ''}`;
        div.style.cssText = `
          cursor: ${isLivePSAutomated ? "default" : "pointer"};
          border-left: 4px solid ${isEarned ? 'var(--success)' : '#273447'};
          transition: transform 0.2s ease, border-color 0.2s ease;
        `;

        if (!isLivePSAutomated) {
          div.onclick = () => window.CompanionApp.toggleManualTrophy(t.trophyId);
        }

        const gradeColor = t.grade === "Platinum" ? "#00d2d3" : (t.grade === "Gold" ? "#f5a623" : (t.grade === "Silver" ? "#bdc3c7" : "#cd7f32"));

        let formattedTimestamp = "";
        if (isEarned && userState.timestamp) {
          const d = new Date(userState.timestamp);
          formattedTimestamp = !isNaN(d.getTime())
            ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "Recorded";
        }

        let milestoneHtml = "";
        if (userState.targetValue && userState.targetValue > 0) {
          const cur = userState.currentValue || 0;
          const tar = userState.targetValue;
          const milePct = Math.min(100, Math.round((cur / tar) * 100));
          milestoneHtml = `
            <div style="margin-top:8px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:3px;">
                <span>Milestone Step</span>
                <strong style="color:#fff;">${cur} / ${tar} (${milePct}%)</strong>
              </div>
              <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                <div style="width:${milePct}%; height:100%; background:var(--accent-gold);"></div>
              </div>
            </div>
          `;
        }

        // Live Squad Badges for this Specific Trophy (Direct from /friends Code Lookup)
        let squadBadgesHtml = "";
        const ops = Object.values(this.teamLiveTelemetry);
        if (ops.length > 0) {
          let badges = "";
          ops.forEach(op => {
            const hasEarned = op.trophies && op.trophies[t.trophyId] && op.trophies[t.trophyId].earned;
            badges += `
              <span style="font-size:10px; font-weight:700; background:${hasEarned ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${hasEarned ? '#2ecc71' : '#33445b'}; color:${hasEarned ? '#2ecc71' : '#7b8c9e'}; padding:2px 6px; border-radius:3px; display:inline-flex; align-items:center; gap:4px;">
                <img src="${op.avatar}" style="width:12px; height:12px; border-radius:50%;">
                ${op.friendCode || op.username}: ${hasEarned ? '✔' : '🔒'}
              </span>
            `;
          });
          squadBadgesHtml = `
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.08);">
              ${badges}
            </div>
          `;
        }

        let statusBadge = `<span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">🔒 Locked</span>`;
        if (isEarned) {
          if (userState.source === "psn") {
            statusBadge = `<span style="font-size:0.8rem; font-weight:700; color:var(--success);">✔ Earned (PSN Sync)</span>`;
          } else if (userState.source === "json") {
            statusBadge = `<span style="font-size:0.8rem; font-weight:700; color:var(--success);">✔ Earned (Game Data)</span>`;
          } else if (userState.source === "firestore") {
            statusBadge = `<span style="font-size:0.8rem; font-weight:700; color:var(--success);">✔ Earned (Synced)</span>`;
          } else {
            statusBadge = `<span style="font-size:0.8rem; font-weight:700; color:var(--success);">✔ Earned (Manual)</span>`;
          }
        }

        div.innerHTML = `
          <div style="display:flex; gap:14px; align-items:flex-start;">
            <img src="${t.icon}" alt="" style="width:54px; height:54px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
            <div style="flex-grow:1;">
              <div class="card-top-row">
                <span class="animal-title" style="font-size:1rem;">${t.title}</span>
                <span class="badge" style="border-color:${gradeColor}; color:${gradeColor}; font-weight:700;">${t.grade}</span>
              </div>
              <p style="font-size:0.82rem; color:#cfd9e8; margin-top:5px; line-height:1.4;">${t.desc}</p>
              ${milestoneHtml}
              ${squadBadgesHtml}
            </div>
          </div>
          <div class="card-footer-row" style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
            <div>
              ${statusBadge}
              ${isEarned && formattedTimestamp ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Unlocked: ${formattedTimestamp}</div>` : ''}
            </div>
            ${!isLivePSAutomated ? `<span style="font-size:0.72rem; color:var(--accent-amber);">Click to toggle</span>` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    filterTrophyGroup(groupId) {
      this.selectedTrophyGroup = groupId;
      this.renderTrophies();
    },

    async loadFriendsComparisonTelemetry() {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;

      this.friendUnsubscribers.forEach(u => u());
      this.friendUnsubscribers = [];
      this.teamLiveTelemetry = {};

      if (!this.friendsRoster.length) {
        container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No companions linked yet. Link friend codes in Settings to stream live comparative telemetry.</p>`;
        this.renderSquadStatusPills();
        return;
      }

      for (const friend of this.friendsRoster) {
        const friendEmail = (friend.target_email || "").toLowerCase();
        const friendKey = friendEmail ? getEmailKey(friendEmail) : friend.friend_code;
        const targetPlatform = (friend.primary_platform || "ps").toLowerCase();

        const unsub = db.collection("users")
          .doc(friendKey)
          .collection("platform")
          .doc(targetPlatform)
          .collection("progress")
          .doc("woth2")
          .onSnapshot(snap => {
            if (snap.exists) {
              const data = snap.data();
              this.teamLiveTelemetry[friendKey] = {
                friendCode: friend.friend_code,
                username: friend.username || data.hunter_name || "Companion",
                avatar: friend.avatar_url || DEFAULT_USER_AVATAR,
                platform: (data.platform || targetPlatform).toUpperCase(),
                level: data.hunter_level || 1,
                credits: data.hunter_credits || 0,
                fiveStarKills: data.five_star_kills !== undefined ? data.five_star_kills : 0,
                day: data.companion_day || 1,
                time: data.companion_time || "07:00",
                weather: data.weather || "Clear",
                trophiesEarned: data.trophies_earned || 0,
                trophiesTotal: data.trophies_total || this.masterTrophies.length,
                trophiesPct: data.trophies_percent || 0,
                trophies: data.trophies || {},
                harvestCount: data.harvest_count || 0,
                watchlistCount: (data.watchlist && data.watchlist.length) ? data.watchlist.length : 0,
                dogStats: data.dog_stats || null
              };
            }
            this.renderFriendsComparison();
            this.renderSquadStatusPills();
            this.renderTrophies();
          }, err => console.warn("Friend stream error:", err));

        this.friendUnsubscribers.push(unsub);
      }
    },

    renderSquadStatusPills() {
      const container = document.getElementById("squadPillsContainer");
      if (!container) return;
      container.innerHTML = "";

      const ops = Object.values(this.teamLiveTelemetry);
      if (!ops.length) {
        container.style.display = "none";
        return;
      }
      container.style.display = "flex";

      ops.forEach(op => {
        const pill = document.createElement("div");
        pill.className = "squad-quick-pill";
        pill.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #151c27;
          border: 1px solid #28374d;
          border-left: 3px solid #00d2d3;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          color: #fff;
          white-space: nowrap;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        `;
        pill.innerHTML = `
          <img src="${op.avatar}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; border:1px solid #00d2d3;">
          <strong style="color:#fff;">${op.username}</strong>
          <span style="color:#7b8c9e; font-size:10px;">(${op.friendCode})</span>
          <span style="color:var(--text-muted);">&bull;</span>
          <span style="color:#00a6ed; font-weight:700;">Lv.${op.level}</span>
          <span style="color:var(--text-muted);">&bull;</span>
          <span style="color:var(--accent-amber); font-weight:700;">$${op.credits}</span>
          <span style="color:var(--text-muted);">&bull;</span>
          <span style="color:var(--accent-gold); font-weight:800;">⭐ ${op.fiveStarKills} (5★)</span>
        `;
        container.appendChild(pill);
      });
    },

    renderFriendsComparison() {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;
      container.innerHTML = "";

      const cards = Object.values(this.teamLiveTelemetry);
      if (!cards.length) {
        container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No active companion telemetry recorded yet.</p>`;
        return;
      }

      cards.forEach(c => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.style.borderLeft = "3px solid #00d2d3";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${c.avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #00d2d3;">
              <div>
                <strong style="color:#fff; font-size:0.95rem;">${c.username}</strong>
                <span style="font-size:10px; color:#7b8c9e; margin-left:4px;">[${c.friendCode}]</span>
              </div>
            </div>
            <span class="badge" style="background:#28374d; color:#00d2d3;">${c.platform}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; color:var(--text-muted);">
            <div>Level: <strong style="color:#fff;">Lv. ${c.level}</strong></div>
            <div>Credits: <strong style="color:var(--accent-amber);">$${c.credits}</strong></div>
            <div>Day / Clock: <strong style="color:#fff;">Day ${c.day} (${c.time})</strong></div>
            <div>Weather: <strong style="color:#ffe099;">${c.weather}</strong></div>
            <div>Harvests: <strong style="color:#2ecc71;">${c.harvestCount} Animals</strong></div>
            <div>5-Star Kills: <strong style="color:var(--accent-gold); font-weight:800;">⭐ ${c.fiveStarKills} Specimens</strong></div>
            <div>Watchlist: <strong style="color:#f5a623;">${c.watchlistCount} Targets</strong></div>
            <div style="grid-column: 1/-1; margin-top:2px;">
              Achievements: <strong style="color:var(--accent-gold);">${c.trophiesEarned} / ${c.trophiesTotal} (${c.trophiesPct}%)</strong>
            </div>
          </div>

          ${c.dogStats ? `
            <div style="font-size:0.75rem; background:rgba(0,0,0,0.25); padding:6px; border-radius:4px; margin-top:8px;">
              🐕 <strong>${c.dogStats.name}</strong> (${c.dogStats.breed}) &bull; Bonding Lv.${c.dogStats.bonding}
            </div>
          ` : ''}
        `;
        container.appendChild(div);
      });
    },

    initDynamicFeatures() {
      this.populateRegions();
      this.filterSpeciesByRegion("harvestLocationSelect", "harvestSpeciesSelect");
      this.filterSpeciesByRegion("watchRegionSelect", "watchSpeciesSelect");

      this.renderHarvestHistory();
      this.renderWatchlist();
      this.renderNeedZones();
      this.renderLifeCycles();
      this.renderDogProfile();
      this.renderChallenges();
      this.renderSkills();
      this.renderMissions();
      this.renderInfrastructure();
      this.renderTrails();
      this.renderSpeciesCatalog();
      this.renderLodgeForecaster();
      this.updateDynamicHarvestSchema();
    },

    renderLodgeForecaster() {
      const container = document.getElementById("lodgeForecasterContainer") || document.getElementById("lodgeRequisitionGrid");
      if (!container) return;

      const items = (this.db.gameData && this.db.gameData.lodge_store) ? this.db.gameData.lodge_store : this.lodgeCatalog;
      container.innerHTML = "";

      items.forEach(item => {
        const canAfford = this.hunterCredits >= item.cost;
        const balanceAfter = this.hunterCredits - item.cost;
        const isLevelUnlocked = this.hunterLevel >= item.requiredLevel;
        const levelsToGo = Math.max(0, item.requiredLevel - this.hunterLevel);

        let balanceBadgeClass = canAfford ? "banner-breeder" : "banner-cull";
        let balanceBadgeText = canAfford
          ? `Balance After Purchase: $${balanceAfter} credits ($${this.hunterCredits} - $${item.cost})`
          : `Deficit: Need $${Math.abs(balanceAfter)} more credits (Have $${this.hunterCredits} / Need $${item.cost})`;

        let levelBadgeText = isLevelUnlocked
          ? `✅ Requisition Clearance: Unlocked (Required Lv. ${item.requiredLevel})`
          : `🔒 Locked: Requires Hunter Level ${item.requiredLevel} (${levelsToGo} ${levelsToGo === 1 ? 'level' : 'levels'} to go)`;

        const card = document.createElement("div");
        card.className = "telemetry-card";
        card.style.borderLeft = isLevelUnlocked ? (canAfford ? "4px solid var(--success)" : "4px solid var(--accent-amber)") : "4px solid #e74c3c";
        card.innerHTML = `
          <div>
            <div class="card-top-row">
              <span class="animal-title">${item.name}</span>
              <span class="badge" style="background:#28374d; color:var(--accent-gold); font-weight:700;">$${item.cost}</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Category: <strong>${item.category}</strong> &bull; Requisition Gate: <strong>Level ${item.requiredLevel}</strong>
            </div>
            <p style="font-size:0.8rem; color:#cfd9e8; margin-top:5px; line-height:1.35;">${item.description}</p>
            <div class="action-banner ${balanceBadgeClass}" style="margin-top:8px;">
              ${balanceBadgeText}
            </div>
            <div style="font-size:0.75rem; color:${isLevelUnlocked ? 'var(--success)' : '#ff9999'}; margin-top:4px; font-weight:600;">
              ${levelBadgeText}
            </div>
          </div>
          <div class="card-footer-row" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">Current: <strong>$${this.hunterCredits}</strong> | Lv. <strong>${this.hunterLevel}</strong></span>
            <button type="button" class="btn-link" style="color:${(canAfford && isLevelUnlocked) ? 'var(--accent-gold)' : 'var(--text-muted)'}; font-weight:700; cursor:${(canAfford && isLevelUnlocked) ? 'pointer' : 'not-allowed'};" 
              onclick="window.CompanionApp.purchaseLodgeItem('${item.id}', ${item.cost}, ${item.requiredLevel})">
              ${(canAfford && isLevelUnlocked) ? "Acquire" : "Unavailable"}
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    },

    purchaseLodgeItem(itemId, cost, requiredLevel) {
      if (this.hunterLevel < requiredLevel) {
        alert(`🔒 Requisition locked. You need ${requiredLevel - this.hunterLevel} more level(s) to unlock this item.`);
        return;
      }
      
      const success = this.processTransaction(cost, "expense", "Lodge Requisition");
      if (success) {
        alert(`✅ Requisition approved! Purchased item for $${cost}. Remaining balance: $${this.hunterCredits} credits.`);
      }
    },

    populateRegions() {
      const regions = (this.db.regions && this.db.regions.regions) ? this.db.regions.regions : [];
      const locationSelect = document.getElementById("harvestLocationSelect");
      const watchRegionSelect = document.getElementById("watchRegionSelect");

      if (locationSelect) locationSelect.innerHTML = "";
      if (watchRegionSelect) watchRegionSelect.innerHTML = "";

      const activeFiltered = regions.filter(r => !r.reserve || r.reserve === this.activeReserve);

      activeFiltered.forEach(r => {
        if (locationSelect) {
          const opt1 = document.createElement("option");
          opt1.value = r.name;
          opt1.textContent = r.name;
          locationSelect.appendChild(opt1);
        }
        if (watchRegionSelect) {
          const opt2 = document.createElement("option");
          opt2.value = r.name;
          opt2.textContent = r.name;
          watchRegionSelect.appendChild(opt2);
        }
      });
    },

    filterSpeciesByRegion(regionSelectId, speciesSelectId) {
      const regionEl = document.getElementById(regionSelectId);
      const speciesEl = document.getElementById(speciesSelectId);
      if (!regionEl || !speciesEl) return;

      const selectedRegion = regionEl.value;
      const allSpecies = (this.db.species && this.db.species.species) ? this.db.species.species : [];

      speciesEl.innerHTML = "";

      const filtered = allSpecies.filter(s => {
        if (s.reserves && Array.isArray(s.reserves) && !s.reserves.includes(this.activeReserve)) {
          return false;
        }
        if (!s.regions || !Array.isArray(s.regions)) return true;
        return s.regions.includes(selectedRegion);
      });

      filtered.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = `${s.name} (Tier ${s.tier})`;
        speciesEl.appendChild(opt);
      });

      if (speciesSelectId === "watchSpeciesSelect") {
        this.updateWatchlistMaxAge();
      } else if (speciesSelectId === "harvestSpeciesSelect") {
        this.updateDynamicHarvestSchema();
      }
    },

    updateDynamicHarvestSchema() {
      const container = document.getElementById("dynamicSchemaFieldsContainer");
      const speciesEl = document.getElementById("harvestSpeciesSelect");
      if (!container || !speciesEl || !speciesEl.value) return;

      const selectedSpecies = speciesEl.value.toLowerCase();
      let category = "Antlers";
      let fields = [
        { id: "main_beam", label: "Main Beam", unit: "in", ph: "24.5" },
        { id: "inside_spread", label: "Inside Spread", unit: "in", ph: "18.2" },
        { id: "points_count", label: "Total Points", unit: "count", ph: "10" }
      ];

      if (selectedSpecies.includes("warthog") || selectedSpecies.includes("boar") || selectedSpecies.includes("pig")) {
        category = "Suid Tusks";
        fields = [
          { id: "main_beam_tusks", label: "Length of main beam", unit: "in", ph: "26" },
          { id: "circ_at_base", label: "Circumference at base", unit: "in", ph: "4" }
        ];
      } else if (selectedSpecies.includes("lion") || selectedSpecies.includes("bear") || selectedSpecies.includes("wolf") || selectedSpecies.includes("badger") || selectedSpecies.includes("wolverine")) {
        category = "Predator Skull";
        fields = [
          { id: "skull_length", label: "Skull length", unit: "in", ph: "15" },
          { id: "skull_width", label: "Skull width", unit: "in", ph: "10" },
          { id: "body_weight", label: "Body Weight", unit: "lbs", ph: "571.9" }
        ];
      } else if (selectedSpecies.includes("sheep") || selectedSpecies.includes("kudu") || selectedSpecies.includes("buffalo") || selectedSpecies.includes("wildebeest")) {
        category = "Horns (Bovidae)";
        fields = [
          { id: "horn_length", label: "Horn Length", unit: "in", ph: "36.8" },
          { id: "base_circ", label: "Base Circumference", unit: "in", ph: "14.2" },
          { id: "curl_spread", label: "Tip Spread", unit: "in", ph: "22.0" }
        ];
      } else if (selectedSpecies.includes("zebra") || selectedSpecies.includes("hare") || selectedSpecies.includes("ostrich") || selectedSpecies.includes("duck")) {
        category = "Weight Specimen";
        fields = [
          { id: "body_weight", label: "Total Body Weight", unit: "lbs", ph: "881.8" }
        ];
      }

      container.innerHTML = `<span style="grid-column: 1/-1; font-size: 0.76rem; color: var(--accent-amber); font-weight: 700;">Active Harvest Scoring: ${category}</span>`;

      fields.forEach(f => {
        const div = document.createElement("div");
        div.className = "input-group";
        div.innerHTML = `
          <label for="schema_${f.id}">${f.label} (${f.unit})</label>
          <input type="text" id="schema_${f.id}" placeholder="${f.ph}">
        `;
        container.appendChild(div);
      });
    },

    updateWatchlistMaxAge() {
      const speciesEl = document.getElementById("watchSpeciesSelect");
      const maxAgeEl = document.getElementById("watchMaxAge");
      if (!speciesEl || !maxAgeEl || !speciesEl.value) return;

      const selectedSpecies = speciesEl.value;
      const lifecycles = (this.db.lifecycles && this.db.lifecycles.species_lifecycles) ? this.db.lifecycles.species_lifecycles : [];
      const match = lifecycles.find(l => l.species.toLowerCase() === selectedSpecies.toLowerCase());
      maxAgeEl.value = match ? match.max_age_years : 15;
    },

    saveWatchlistEntry() {
      const editId = document.getElementById("editWatchlistId") ? document.getElementById("editWatchlistId").value : "";
      const tag = document.getElementById("watchIdentifier") ? document.getElementById("watchIdentifier").value.trim() : "";
      const species = document.getElementById("watchSpeciesSelect") ? document.getElementById("watchSpeciesSelect").value : "";
      const region = document.getElementById("watchRegionSelect") ? document.getElementById("watchRegionSelect").value : "";
      const landmark = document.getElementById("watchLandmark") ? document.getElementById("watchLandmark").value.trim() : "";
      const fitness = document.getElementById("watchFitness") ? parseFloat(document.getElementById("watchFitness").value) : NaN;
      const age = document.getElementById("watchAge") ? parseInt(document.getElementById("watchAge").value, 10) : NaN;
      const maxAge = document.getElementById("watchMaxAge") ? parseInt(document.getElementById("watchMaxAge").value, 10) : 15;
      const stars = document.getElementById("watchStars") ? parseInt(document.getElementById("watchStars").value, 10) : 1;

      if (!tag || isNaN(fitness) || isNaN(age) || !landmark) {
        return alert("Please enter the animal identifier, fitness %, age, and need zone landmark.");
      }

      const activeClock = this.reserveClocks[this.activeReserve] || { day: this.currentDay };

      if (editId) {
        const idx = this.watchlist.findIndex(w => w.id === editId);
        if (idx !== -1) {
          this.watchlist[idx] = { ...this.watchlist[idx], tag, species, reserve: this.activeReserve, region, landmark, fitness, age, maxAge, stars };
        }
      } else {
        const newEntry = {
          id: "target_" + Date.now(),
          tag, species, reserve: this.activeReserve, region, landmark, fitness, sightedAge: age, age, maxAge, stars, sightedDay: activeClock.day
        };
        this.watchlist.unshift(newEntry);
      }

      this.resetWatchlistForm();
      this.renderWatchlist();
      this.silentSaveGameTelemetry();
    },

    resetWatchlistForm() {
      this.safeSetValue("editWatchlistId", "");
      this.safeSetValue("watchIdentifier", "");
      this.safeSetValue("watchFitness", "");
      this.safeSetValue("watchAge", "12");
      this.safeSetValue("watchLandmark", "");
      this.safeSetText("watchlistFormHeader", "Add Live Animal to Watchlist");
      this.safeSetText("saveWatchlistBtn", "Add to Watchlist");
      const cancelBtn = document.getElementById("cancelEditWatchlistBtn");
      if (cancelBtn) cancelBtn.classList.add("hidden");
    },

    editWatchlistEntry(id) {
      const item = this.watchlist.find(w => w.id === id);
      if (!item) return;

      this.safeSetValue("editWatchlistId", item.id);
      this.safeSetValue("watchIdentifier", item.tag);
      this.safeSetValue("watchRegionSelect", item.region || "Kaggen Karoo");
      this.filterSpeciesByRegion("watchRegionSelect", "watchSpeciesSelect");
      this.safeSetValue("watchSpeciesSelect", item.species);
      this.safeSetValue("watchLandmark", item.landmark || "");
      this.safeSetValue("watchFitness", item.fitness);
      this.safeSetValue("watchAge", item.age);
      this.safeSetValue("watchMaxAge", item.maxAge);
      this.safeSetValue("watchStars", item.stars);

      this.safeSetText("watchlistFormHeader", "Edit Watchlist Target");
      this.safeSetText("saveWatchlistBtn", "Update Target");
      const cancelBtn = document.getElementById("cancelEditWatchlistBtn");
      if (cancelBtn) cancelBtn.classList.remove("hidden");
    },

    deleteWatchlistEntry(id) {
      if (!confirm("Harvested or remove this target from the watchlist?")) return;
      this.watchlist = this.watchlist.filter(w => w.id !== id);
      this.renderWatchlist();
      this.silentSaveGameTelemetry();
    },

    renderWatchlist() {
      const container = document.getElementById("watchlistContainer");
      if (!container) return;

      this.safeSetText("watchlistCount", `${this.watchlist.length} Tracked Animals`);
      container.innerHTML = "";

      if (this.watchlist.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding:12px; grid-column:1/-1;">No animals currently on the watchlist. Add spotted animals on the left.</p>';
        return;
      }

      this.watchlist.forEach(item => {
        const itemReserve = item.reserve || this.activeReserve;
        const currentReserveDay = (this.reserveClocks[itemReserve] ? this.reserveClocks[itemReserve].day : this.currentDay);
        const elapsedDays = Math.max(0, currentReserveDay - (item.sightedDay || 1));
        const effectiveAge = (item.sightedAge || item.age) + Math.floor(elapsedDays / 3);
        const daysLeft = Math.max(0, (item.maxAge - effectiveAge) * 3);
        const daysIntoCurrentYear = elapsedDays % 3;
        const daysUntilNextYear = 3 - daysIntoCurrentYear;
        const matureThresholdAge = Math.max(1, item.maxAge - 3);
        const yearsToMature = Math.max(0, matureThresholdAge - effectiveAge);
        const daysToMature = yearsToMature * 3;

        let actionClass = "banner-balanced";
        let actionText = "⚖️ BALANCED: Stable genetics. Monitor.";

        if (item.fitness < 50.0) {
          actionClass = "banner-cull";
          actionText = `🚨 CULL: Low Fitness (${item.fitness}%). Despawn deadline in ${daysLeft} days.`;
        } else if (item.fitness >= 80.0 && effectiveAge < item.maxAge) {
          actionClass = "banner-breeder";
          actionText = `⭐ 5-STAR BREEDER (${item.fitness}%): Prime trophy rack. ${daysLeft} days left.`;
        } else if (item.stars === 1 && effectiveAge >= (item.maxAge - 2)) {
          actionClass = "banner-cull";
          actionText = `⚠️ CULL MATURE: 1-Star rack at end of cycle. Natural despawn in ${daysLeft} days.`;
        }

        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.innerHTML = `
          <div>
            <div class="card-top-row">
              <span class="animal-title">${item.tag}</span>
              <span class="badge" style="background:#28374d; border-color:#486082;">${item.stars}&#9733;</span>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              <strong>${item.species}</strong> &bull; ${itemReserve} (${item.region || 'Region'})
            </div>
            <div style="font-size:0.75rem; color:#ffe099; margin-top:2px;">
              Zone: <strong>${item.landmark || 'Waterway'}</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Age: <strong>${effectiveAge}/${item.maxAge} yrs</strong> (Aging in ${daysUntilNextYear}d) &bull; Fit: <strong>${item.fitness}%</strong>
            </div>
            <div style="font-size:0.73rem; background:rgba(0,0,0,0.3); border:1px solid #1c2738; padding:5px 8px; border-radius:4px; margin-top:5px; color:#d2dae4;">
              ⏳ Despawn Clock: <strong style="color:${daysLeft <= 6 ? '#ff7675' : '#55efc4'}">${daysLeft} in-game days left</strong>
              ${effectiveAge < matureThresholdAge ? ` &bull; Prime: <strong style="color:var(--accent-gold);">in ${daysToMature} days (${yearsToMature} yrs)</strong>` : ' &bull; <strong style="color:#f5a623;">Peak Trophy Phase</strong>'}
            </div>
            <div class="action-banner ${actionClass}">${actionText}</div>
          </div>
          <div class="card-footer-row">
            <span>Sighted Day <strong>${item.sightedDay || 1}</strong> &rarr; Map Day <strong>${currentReserveDay}</strong></span>
            <div class="card-actions">
              <button type="button" class="btn-link btn-link-edit" onclick="window.CompanionApp.editWatchlistEntry('${item.id}')">Edit</button>
              <button type="button" class="btn-link btn-link-delete" onclick="window.CompanionApp.deleteWatchlistEntry('${item.id}')">Harvest</button>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderHarvestHistory() {
      const container = document.getElementById("harvestHistoryContainer");
      if (!container) return;
      const records = (this.db.gameData && this.db.gameData.harvest_records) ? this.db.gameData.harvest_records : [];

      this.safeSetText("harvestRecordCount", `${records.length} Harvest Records`);
      container.innerHTML = "";

      records.forEach(r => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.innerHTML = `
          <div>
            <div class="card-top-row">
              <span class="animal-title">${r.species} (${r.gender || 'Specimen'})</span>
              <span class="badge" style="background:#28374d; color:var(--accent-gold); font-weight:700;">${r.trophy_rating_stars}&#9733; Trophy</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Tier: <strong>${r.animal_tier}</strong> &bull; Reserve: <strong>${r.location || this.activeReserve}</strong>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Firearm: <strong>${r.firearm} (${r.caliber})</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Shot: <strong>${r.shot_distance_yds} yds</strong> &bull; Tracking: <strong>${r.tracking_distance_yds || 0} yds</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Fitness: <strong>${r.fitness_percentage}%</strong> &bull; Sold: <strong>+$${r.sell_price || 200}</strong>
            </div>
            <div class="action-banner ${r.fitness_percentage < 50 ? 'banner-cull' : 'banner-breeder'}" style="margin-top:6px;">
              ${r.cull_decision || 'Keeper Specimen'}
            </div>
          </div>
          <div class="card-footer-row">
            <span>Score: <strong>${r.trophy_score || 'N/A'}</strong></span>
            <span style="color:var(--accent-amber); font-weight:700;">Rank: ${r.hunt_rating || 'S++'}</span>
          </div>
        `;
        container.appendChild(div);
      });
    },

    submitHarvestInspection() {
      const species = document.getElementById("harvestSpeciesSelect") ? document.getElementById("harvestSpeciesSelect").value : "Southern Lion";
      const location = document.getElementById("harvestLocationSelect") ? document.getElementById("harvestLocationSelect").value : "Kaggen Karoo";
      const firearm = document.getElementById("harvestFirearm") ? document.getElementById("harvestFirearm").value : "Primacy Superior 7700";
      const caliber = document.getElementById("harvestCaliber") ? document.getElementById("harvestCaliber").value : ".270 Winchester";
      const shotDist = document.getElementById("harvestShotDist") ? document.getElementById("harvestShotDist").value : 63;
      const trackDist = document.getElementById("harvestTrackDist") ? document.getElementById("harvestTrackDist").value : 29;
      const fitness = document.getElementById("harvestFitness") ? (parseFloat(document.getElementById("harvestFitness").value) || 93.5) : 93.5;
      const stars = document.getElementById("harvestRatingStars") ? parseInt(document.getElementById("harvestRatingStars").value, 10) : 5;
      const sellPrice = document.getElementById("harvestSellPrice") ? Number(document.getElementById("harvestSellPrice").value) : 455;

      if (stars === 5) {
        this.fiveStarKills++;
      }

      const newRecord = {
        species,
        animal_tier: 6,
        location: `${this.activeReserve} (${location})`,
        firearm,
        caliber,
        shot_distance_yds: shotDist,
        tracking_distance_yds: trackDist,
        fitness_percentage: fitness,
        trophy_rating_stars: stars,
        sell_price: sellPrice,
        cull_decision: fitness < 50 ? "Cull (Low Fitness)" : "5-Star Trophy Specimen",
        date: "October 12, 2026",
        hunt_rating: "S+"
      };

      if (!this.db.gameData) this.db.gameData = {};
      if (!this.db.gameData.harvest_records) this.db.gameData.harvest_records = [];

      this.db.gameData.harvest_records.unshift(newRecord);
      
      this.processTransaction(sellPrice, "income", `Harvest Sale: ${species}`);
      this.renderHarvestHistory();
      alert(`✅ Harvest logged! Added $${sellPrice} credits to wallet.`);
    },

    renderChallenges() {
      const container = document.getElementById("challengeTreesGrid");
      if (!container) return;
      const trees = (this.db.challenges && this.db.challenges.trees) ? this.db.challenges.trees : {};

      container.innerHTML = "";
      Object.entries(trees).forEach(([key, tree]) => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.style.marginBottom = "14px";

        let tasksHtml = "";
        if (tree.tasks && Array.isArray(tree.tasks)) {
          tree.tasks.forEach(t => {
            const currentCount = this.userChallengeProgress[t.id] || 0;
            const target = t.target || 1;
            const isCompleted = currentCount >= target;

            tasksHtml += `
              <div style="background:rgba(0,0,0,0.25); border:1px solid ${isCompleted ? '#2ecc71' : '#273447'}; padding:8px 12px; border-radius:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <strong style="color:${isCompleted ? '#2ecc71' : '#fff'}; font-size:0.85rem;">${t.name}</strong>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${t.description || ''}</div>
                </div>
                <div class="stepper-controls" style="display:flex; align-items:center; gap:6px;">
                  <button type="button" class="stepper-btn" onclick="window.CompanionApp.stepChallenge('${t.id}', -1)">&minus;</button>
                  <strong style="color:var(--accent-gold); font-size:0.88rem; min-width:50px; text-align:center;">${currentCount} / ${target}</strong>
                  <button type="button" class="stepper-btn" onclick="window.CompanionApp.stepChallenge('${t.id}', 1)">&plus;</button>
                </div>
              </div>
            `;
          });
        }

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff; font-size:1.05rem;">${tree.name} Mastery</strong>
            <span class="badge" style="background:#28374d; color:var(--accent-gold);">${tree.total || 12} Challenges</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">${tree.description || 'Mastery tree challenges.'}</p>
          <div style="margin-top:8px;">${tasksHtml}</div>
        `;
        container.appendChild(div);
      });
    },

    stepChallenge(taskId, delta) {
      const cur = this.userChallengeProgress[taskId] || 0;
      const next = Math.max(0, cur + delta);
      this.userChallengeProgress[taskId] = next;
      localStorage.setItem("woth2_challenges_progress", JSON.stringify(this.userChallengeProgress));
      this.renderChallenges();
      this.silentSaveGameTelemetry();
    },

    renderSkills() {
      const container = document.getElementById("hunterSkillsGrid");
      if (!container) return;
      const skills = (this.db.gameData && this.db.gameData.skills) ? this.db.gameData.skills : [];

      container.innerHTML = "";
      skills.forEach(s => {
        const isUnlocked = Boolean(this.unlockedSkills[s.id]);
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.style.cssText = `cursor:pointer; border-left:4px solid ${isUnlocked ? '#2ecc71' : '#273447'};`;
        div.onclick = () => window.CompanionApp.toggleSkill(s.id);

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff; font-size:0.95rem;">${s.name}</strong>
            <span class="badge" style="background:${isUnlocked ? '#2ecc71' : '#28374d'}; color:${isUnlocked ? '#000' : '#fff'}; font-weight:700;">
              ${isUnlocked ? 'LEARNED' : 'LOCKED'}
            </span>
          </div>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">${s.description || 'Hunter ability perk.'}</p>
          <div style="font-size:0.72rem; color:var(--accent-amber); margin-top:4px;">Click to toggle perk unlock status</div>
        `;
        container.appendChild(div);
      });
    },

    toggleSkill(skillId) {
      this.unlockedSkills[skillId] = !this.unlockedSkills[skillId];
      localStorage.setItem("woth2_unlocked_skills", JSON.stringify(this.unlockedSkills));
      this.renderSkills();
      this.silentSaveGameTelemetry();
    },

    renderInfrastructure() {
      const container = document.getElementById("infrastructureGrid");
      if (!container) return;
      const infra = this.db.infrastructure || {};
      const tasks = infra.tasks || [];

      this.safeSetText("infrastructureCount", `${tasks.length} Enhancements`);
      container.innerHTML = "";

      tasks.forEach(t => {
        const isRestored = Boolean(this.restoredHazards[t.id]);
        const canAfford = this.hunterCredits >= t.cost;
        const div = document.createElement("div");
        div.className = "info-box";
        div.style.borderLeft = isRestored ? "4px solid #2ecc71" : (canAfford ? "4px solid var(--accent-gold)" : "4px solid #e74c3c");

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${t.type}: ${t.name || t.location}</strong>
            <span class="badge" style="background:#28374d; color:var(--accent-gold);">$${t.cost}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
            Region: <strong>${t.location}</strong> &bull; Impact: <strong>${t.impact || 'High'}</strong>
          </div>
          <p style="font-size:0.78rem; color:#cfd9e8; margin-top:4px;">${t.description || 'Remediate habitat to lift animal fitness penalties.'}</p>
          <div class="card-footer-row" style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:6px;">
            <span style="font-size:0.75rem; color:${isRestored ? '#2ecc71' : 'var(--text-muted)'}; font-weight:700;">
              ${isRestored ? '✅ HABITAT REMEDIATED' : `Cleanup Cost: $${t.cost}`}
            </span>
            ${!isRestored ? `
              <button type="button" class="btn-link" style="color:${canAfford ? 'var(--accent-gold)' : 'var(--text-muted)'}; font-weight:700; cursor:${canAfford ? 'pointer' : 'not-allowed'};"
                onclick="window.CompanionApp.remediateHabitat('${t.id}',${t.cost})">
                ${canAfford ? 'Fund Cleanup' : 'Need Credits'}
              </button>
            ` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    remediateHabitat(hazardId, cost) {
      const success = this.processTransaction(cost, "expense", `Habitat Remediation: ${hazardId}`);
      if (success) {
        this.restoredHazards[hazardId] = true;
        localStorage.setItem("woth2_restored_hazards", JSON.stringify(this.restoredHazards));
        this.renderInfrastructure();
        alert(`✅ Habitat restored! Penalties lifted. Remaining balance: $${this.hunterCredits} credits.`);
      }
    },

    renderMissions() {
      const container = document.getElementById("missionsGrid");
      if (!container) return;
      const list = (this.db.missions && this.db.missions.missions) ? this.db.missions.missions : [];

      this.safeSetText("missionsCount", `${list.length} Missions`);
      container.innerHTML = "";

      list.forEach(m => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${m.name}</strong>
            <span class="badge">${m.source || 'Story'}</span>
          </div>
          <p style="font-size:0.8rem; color:#cfd9e8; margin-top:4px;">${m.description || ''}</p>
          <ul style="font-size:0.78rem; color:var(--text-muted); padding-left:18px; margin-top:6px;">
            ${m.objectives ? m.objectives.map(o => `<li>${o}</li>`).join("") : ''}
          </ul>
          <div style="font-size:0.78rem; color:var(--accent-amber); margin-top:6px;">
            Reward: ${m.money ? `$${m.money}` : 'XP'} ${m.xp ? `&bull; ${m.xp} XP` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderNeedZones() {
      const container = document.getElementById("needZoneClustersGrid");
      if (!container) return;
      const clusters = (this.db.needZones && this.db.needZones.clusters) ? this.db.needZones.clusters : [];

      this.safeSetText("needZoneCount", `${clusters.length} Tactical Clusters`);
      container.innerHTML = "";

      const activeClusters = clusters.filter(c => !c.reserve || c.reserve === this.activeReserve);

      activeClusters.forEach(c => {
        const div = document.createElement("div");
        div.className = "info-box";
        let zonesHtml = "";
        if (c.zones && Array.isArray(c.zones)) {
          c.zones.forEach(z => {
            zonesHtml += `
              <div style="font-size:0.8rem; background:rgba(0,0,0,0.2); padding:6px; border-radius:4px; margin-top:4px;">
                <strong>${z.type} (${z.schedule}):</strong> ${z.landmark} (+${z.proximity_to_center_yds} yds)
              </div>
            `;
          });
        }

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${c.species}</strong>
            <span class="badge">${c.region}</span>
          </div>
          <p style="font-size:0.78rem; color:var(--text-muted);">${c.cluster_notes || ''}</p>
          <div style="margin-top:4px;">${zonesHtml}</div>
        `;
        container.appendChild(div);
      });
    },

    renderLifeCycles() {
      const container = document.getElementById("lifecyclesGrid");
      if (!container) return;
      const list = (this.db.lifecycles && this.db.lifecycles.species_lifecycles) ? this.db.lifecycles.species_lifecycles : [];

      this.safeSetText("lifecycleCount", `${list.length} Species Cycles`);
      container.innerHTML = "";

      list.forEach(item => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${item.species}</strong>
            <span class="badge">${item.max_age_years} Yrs (${item.total_lifespan_days} Days)</span>
          </div>
          <div class="advisory-callout" style="margin-top:6px;">
            <strong>Cull Advisory:</strong> ${item.cull_advisory}
          </div>
          <div style="font-size:0.78rem; color:#ff9999; margin-top:4px;">
            <strong>Despawn Rule:</strong> ${item.mortality_warning}
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderTrails() {
      const container = document.getElementById("trailsGrid");
      if (!container) return;
      const list = (this.db.trails && this.db.trails.seasonal_corridors) ? this.db.trails.seasonal_corridors : [];

      container.innerHTML = "";
      list.forEach(t => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${t.species}</strong>
            <span class="badge">${t.region}</span>
          </div>
          <div style="font-size:0.8rem; margin-top:6px;">
            <strong>Summer:</strong> <span style="color:var(--text-muted);">${t.summer_trail}</span>
          </div>
          <div style="font-size:0.8rem; margin-top:4px;">
            <strong>Winter:</strong> <span style="color:var(--text-muted);">${t.winter_trail}</span>
          </div>
          <div style="font-size:0.78rem; color:var(--accent-amber); margin-top:6px;">
            <strong>Grazing:</strong> ${t.grazing_area}
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderSpeciesCatalog() {
      const container = document.getElementById("speciesCatalogGrid");
      if (!container) return;
      const list = (this.db.species && this.db.species.species) ? this.db.species.species : [];

      this.safeSetText("speciesCatalogCount", `${list.length} Reserve Species`);
      container.innerHTML = "";

      list.forEach(s => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${s.name}</strong>
            <span class="badge">Tier ${s.tier}</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">${s.scientific_name}</div>
          <div style="font-size:0.8rem; margin-top:6px;">
            <strong>Aggression:</strong> <span style="color:#ff9999;">${s.aggression_level}</span>
          </div>
          <div style="font-size:0.8rem; margin-top:2px;">
            <strong>Defense Sidearm:</strong> <span style="color:var(--accent-amber);">${s.defensive_sidearm}</span>
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderDogProfile() {
      const summaryContainer = document.getElementById("dogSummaryCard");
      const skillsContainer = document.getElementById("dogSkillsGrid");
      if (!summaryContainer || !skillsContainer) return;

      summaryContainer.innerHTML = `
        <div class="telemetry-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="color:#fff; font-size:1.1rem;">${this.dogCompanionName} (${this.dogBreed})</h4>
            <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
              Primary Specialization: <strong>Blood Tracking</strong> &bull; Total Obedience Score: <strong>Level ${this.dogBondingLevel}</strong>
            </div>
          </div>
          <div class="stepper-controls">
            <span style="font-size:0.8rem; color:var(--text-muted);">Bonding:</span>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('bonding', -1)">&minus;</button>
            <strong style="color:var(--accent-amber); font-size:0.95rem;">${this.dogBondingLevel} / 6</strong>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('bonding', 1)">&plus;</button>
          </div>
        </div>
      `;

      skillsContainer.innerHTML = `
        <div class="dog-stepper-row">
          <div>
            <strong style="color:var(--accent-amber);">Following Commands</strong>
            <p style="font-size:0.78rem; color:var(--text-muted);">Controls response speed to Heel, Sit, Stay. Stops brush rustling.</p>
          </div>
          <div class="stepper-controls">
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('following', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogFollowingCommandsLevel} / 6</strong>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('following', 1)">&plus;</button>
          </div>
        </div>

        <div class="dog-stepper-row">
          <div>
            <strong style="color:var(--accent-amber);">Blood Tracking</strong>
            <p style="font-size:0.78rem; color:var(--text-muted);">Follows faint blood tracks over water and rain to stop meat degradation.</p>
          </div>
          <div class="stepper-controls">
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogBloodTrackingLevel} / 6</strong>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', 1)">&plus;</button>
          </div>
        </div>

        <div class="dog-stepper-row">
          <div>
            <strong style="color:var(--accent-amber);">Search &amp; Quartering</strong>
            <p style="font-size:0.78rem; color:var(--text-muted);">Weaves ahead in zig-zag patterns to flush birds and retrieve small game.</p>
          </div>
          <div class="stepper-controls">
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('search', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogSearchQuarteringLevel} / 6</strong>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('search', 1)">&plus;</button>
          </div>
        </div>
      `;
    },

    adjustDogStat(statName, delta) {
      if (statName === "bonding") {
        this.dogBondingLevel = Math.max(1, Math.min(6, this.dogBondingLevel + delta));
      } else if (statName === "following") {
        this.dogFollowingCommandsLevel = Math.max(0, Math.min(6, this.dogFollowingCommandsLevel + delta));
      } else if (statName === "blood") {
        this.dogBloodTrackingLevel = Math.max(0, Math.min(6, this.dogBloodTrackingLevel + delta));
      } else if (statName === "search") {
        this.dogSearchQuarteringLevel = Math.max(0, Math.min(6, this.dogSearchQuarteringLevel + delta));
      }

      this.updateDogInputDisplay();
      this.renderDogProfile();
      this.silentSaveGameTelemetry();
    },

    bindUI() {
      const reserveSelect = document.getElementById("currentReserveSelect");
      if (reserveSelect) {
        reserveSelect.value = this.activeReserve;
        reserveSelect.addEventListener("change", e => this.switchReserveClock(e.target.value));
      }

      const sandwichBtn = document.getElementById("moduleSandwichBtn");
      const dropdownMenu = document.getElementById("moduleDropdownMenu");
      const activeLabel = document.getElementById("activeModuleLabel");

      if (sandwichBtn && dropdownMenu) {
        sandwichBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("hidden");
        });

        document.addEventListener("click", (e) => {
          if (!dropdownMenu.classList.contains("hidden")) {
            if (!dropdownMenu.contains(e.target) && e.target !== sandwichBtn) {
              dropdownMenu.classList.add("hidden");
            }
          }
        });
      }

      document.querySelectorAll(".module-item-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          document.querySelectorAll(".module-item-btn").forEach(b => b.classList.remove("active"));
          document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
          
          btn.classList.add("active");
          const targetTab = btn.dataset.tab;
          const targetPane = document.getElementById(`tab-${targetTab}`);
          if (targetPane) targetPane.classList.add("active");

          if (activeLabel) {
            const firstSpan = btn.querySelector("span");
            if (firstSpan) activeLabel.textContent = firstSpan.textContent;
          }

          if (dropdownMenu) dropdownMenu.classList.add("hidden");
        });
      });

      const platSelect = document.getElementById("platformSelect");
      if (platSelect) {
        platSelect.addEventListener("change", (e) => {
          this.currentPlatform = e.target.value;
          this.recalculateCrossTrophyTelemetry();
          this.renderTrophies();
          this.silentSaveGameTelemetry();
        });
      }

      const autoSyncInputs = [
        "hunterNameInput", "hunterLevelInput", "hunterCreditsInput",
        "currentDayInput", "currentTimeInput", "weatherConditionInput"
      ];

      autoSyncInputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("input", () => {
          if (id === "hunterCreditsInput" || id === "hunterLevelInput") {
            const lvlEl = document.getElementById("hunterLevelInput");
            const crdEl = document.getElementById("hunterCreditsInput");
            if (lvlEl) this.hunterLevel = parseInt(lvlEl.value, 10) || 1;
            if (crdEl) this.hunterCredits = parseInt(crdEl.value, 10) || 0;
            this.renderLodgeForecaster();
          }
        });

        el.addEventListener("blur", () => this.silentSaveGameTelemetry());
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            el.blur();
          }
        });
      });

      const locSelect = document.getElementById("harvestLocationSelect");
      if (locSelect) {
        locSelect.addEventListener("change", () => {
          this.filterSpeciesByRegion("harvestLocationSelect", "harvestSpeciesSelect");
        });
      }

      const watchRegSelect = document.getElementById("watchRegionSelect");
      if (watchRegSelect) {
        watchRegSelect.addEventListener("change", () => {
          this.filterSpeciesByRegion("watchRegionSelect", "watchSpeciesSelect");
        });
      }

      const advDayBtn = document.getElementById("advanceDayBtn");
      if (advDayBtn) {
        advDayBtn.addEventListener("click", () => {
          this.currentDay++;
          this.safeSetValue("currentDayInput", this.currentDay);
          this.renderWatchlist();
          this.silentSaveGameTelemetry();
        });
      }

      const advTwoHrsBtn = document.getElementById("advanceTwoHoursBtn");
      if (advTwoHrsBtn) {
        advTwoHrsBtn.addEventListener("click", () => {
          const timeInput = document.getElementById("currentTimeInput");
          if (!timeInput) return;
          let [hours, mins] = timeInput.value.split(":").map(Number);
          hours = (hours + 2) % 24;
          if (hours === 0 || hours === 1) {
            this.currentDay++;
            this.safeSetValue("currentDayInput", this.currentDay);
          }
          const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
          this.currentTime = timeStr;
          timeInput.value = timeStr;
          this.renderWatchlist();
          this.silentSaveGameTelemetry();
        });
      }

      const watchSpecies = document.getElementById("watchSpeciesSelect");
      if (watchSpecies) watchSpecies.addEventListener("change", () => this.updateWatchlistMaxAge());

      const saveWatchBtn = document.getElementById("saveWatchlistBtn");
      if (saveWatchBtn) {
        saveWatchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.saveWatchlistEntry();
        });
      }

      const cancelWatchBtn = document.getElementById("cancelEditWatchlistBtn");
      if (cancelWatchBtn) {
        cancelWatchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.resetWatchlistForm();
        });
      }

      const harvestSpecies = document.getElementById("harvestSpeciesSelect");
      if (harvestSpecies) harvestSpecies.addEventListener("change", () => this.updateDynamicHarvestSchema());

      const submitHarvestBtn = document.getElementById("submitHarvestRecordBtn");
      if (submitHarvestBtn) {
        submitHarvestBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.submitHarvestInspection();
        });
      }

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
    }
  };

  window.CompanionApp = CompanionApp;
  CompanionApp.init();
});
