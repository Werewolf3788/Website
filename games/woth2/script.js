// Line 1: Way of the Hunter 2 - Master Tactical Companion Engine
// [Smart Cache-Buster Time: 2026-10-07 22:56 EDT | Firebase Sync Target: /utm_links | Version: 5.7.0]

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
    currentDay: 1,
    currentTime: "08:30",
    currentWeather: "Clear / Morning Breeze",
    hunterName: "Ryder Holloway",
    hunterLevel: 2,
    hunterCredits: 318,
    dogCompanionName: "Bacon",
    dogBreed: "American Foxhound",
    dogBondingLevel: 3,
    dogFollowingCommandsLevel: 0,
    dogBloodTrackingLevel: 3,
    dogSearchQuarteringLevel: 0,
    currentUser: null,
    currentEmail: "",
    currentEmailKey: "",
    currentPlatform: "ps", // Supported: "ps", "xbox", "steam", "microsoft"
    watchlist: [],
    psnAccountId: "",
    psnOnlineId: "",
    masterTrophies: [],
    userTrophyProgress: {}, // trophyId -> { earned, timestamp, currentValue, targetValue, manual }
    trophyGroups: [],
    gameMetadata: {},
    friendsRoster: [],
    hasLoadedPrimaryPoster: false,

    async init() {
      this.loadSavedState();
      this.bindUI();
      this.initAuth();
      this.initMasterGameData();
      this.initRTDB();
      await this.loadAllJSONs();
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

    loadSavedState() {
      const savedDay = localStorage.getItem("woth2_day");
      const savedTime = localStorage.getItem("woth2_time");
      const savedWeather = localStorage.getItem("woth2_weather");
      const savedPlatform = localStorage.getItem("woth2_platform");
      const savedWatch = localStorage.getItem("woth2_watchlist");
      const savedName = localStorage.getItem("woth2_name");
      const savedLevel = localStorage.getItem("woth2_level");
      const savedCredits = localStorage.getItem("woth2_credits");

      const savedBonding = localStorage.getItem("woth2_dog_bonding");
      const savedFollowing = localStorage.getItem("woth2_dog_following");
      const savedBlood = localStorage.getItem("woth2_dog_blood");
      const savedSearch = localStorage.getItem("woth2_dog_search");
      const savedTrophyProgress = localStorage.getItem("woth2_manual_trophies");

      if (savedDay) this.currentDay = parseInt(savedDay, 10);
      if (savedTime) this.currentTime = savedTime;
      if (savedWeather) this.currentWeather = savedWeather;
      if (savedPlatform) this.currentPlatform = savedPlatform;
      if (savedName) this.hunterName = savedName;
      if (savedLevel) this.hunterLevel = parseInt(savedLevel, 10);
      if (savedCredits) this.hunterCredits = parseInt(savedCredits, 10);

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

    // Central Brand Visual Engine: Sets Favicon, Apple Touch Icon, and Nav Brand Logo
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

    // 1. Primary Game Encyclopedia & Poster Art Listener: /psn/games/NPWR52231_00
    initMasterGameData() {
      rtdb.ref(`/psn/games/${this.titleId}`).on("value", snapshot => {
        const game = snapshot.val();
        if (!game) return;
        this.gameMetadata = game;

        // Primary Visual Asset: PlayStation Game Poster Art
        if (game.posterArt && typeof game.posterArt === "string" && game.posterArt.trim() !== "") {
          this.applyBrandArt(game.posterArt);
          this.hasLoadedPrimaryPoster = true;
        }

        // Parse DLC / Expansion Groups
        if (game.groups) {
          this.trophyGroups = Array.isArray(game.groups) ? game.groups : Object.values(game.groups);
        }

        // Parse Master Trophies
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
              groupId: t.trophyGroupId || "default",
              hidden: Boolean(t.trophyHidden)
            };
          });
        }

        this.renderTrophies();
      });
    },

    // 2. Silent Background Telemetry Sync: Writes directly to users/{emailKey}/platform/{platform}/progress/woth2
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
      if (timeEl) this.currentTime = timeEl.value || "08:30";
      if (weatherEl) this.currentWeather = weatherEl.value || "Clear";
      if (platEl) this.currentPlatform = platEl.value || this.currentPlatform;

      localStorage.setItem("woth2_day", this.currentDay);
      localStorage.setItem("woth2_time", this.currentTime);
      localStorage.setItem("woth2_weather", this.currentWeather);
      localStorage.setItem("woth2_platform", this.currentPlatform);
      localStorage.setItem("woth2_name", this.hunterName);
      localStorage.setItem("woth2_level", this.hunterLevel);
      localStorage.setItem("woth2_credits", this.hunterCredits);

      localStorage.setItem("woth2_dog_bonding", this.dogBondingLevel);
      localStorage.setItem("woth2_dog_following", this.dogFollowingCommandsLevel);
      localStorage.setItem("woth2_dog_blood", this.dogBloodTrackingLevel);
      localStorage.setItem("woth2_dog_search", this.dogSearchQuarteringLevel);
      localStorage.setItem("woth2_watchlist", JSON.stringify(this.watchlist));
      localStorage.setItem("woth2_manual_trophies", JSON.stringify(this.userTrophyProgress));

      const activeUser = auth.currentUser;
      const targetUserKey = this.currentEmailKey || (this.currentEmail ? getEmailKey(this.currentEmail) : "");

      // Execute write using matching Firestore rules target: users/{emailKey}/platform/{platform}/progress/woth2
      if (activeUser && targetUserKey) {
        try {
          const gameDocRef = db.collection("users")
            .doc(targetUserKey)
            .collection("platform")
            .doc(this.currentPlatform)
            .collection("progress")
            .doc("woth2");

          const earnedCount = Object.values(this.userTrophyProgress).filter(t => t.earned).length;
          const totalTrophies = this.masterTrophies.length || 6;
          const trophyPct = totalTrophies > 0 ? Math.round((earnedCount / totalTrophies) * 100) : 0;

          await gameDocRef.set({
            hunter_name: this.hunterName,
            hunter_level: this.hunterLevel,
            hunter_credits: this.hunterCredits,
            companion_day: this.currentDay,
            companion_time: this.currentTime,
            weather: this.currentWeather,
            platform: this.currentPlatform,
            trophies_earned: earnedCount,
            trophies_total: totalTrophies,
            trophies_percent: trophyPct,
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
          // Alert strictly upon write failure
          alert("⚠️ Telemetry Sync Failed: " + e.message);
        }
      }
    },

    // 3. Navbar Architecture & Secondary Fallback Asset Engine
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

        // Backup Favicon / Branding Cascade
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

      // Only apply backup visual asset if primary PlayStation poster art has not loaded
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

        // Exclude Settings and Privacy from top bar (routed to profile menu)
        if (cleanGroup === "settings" || cleanTag === "settings" || cleanTitle.includes("setting") || cleanUrl.includes("setting") ||
            cleanGroup === "privacy" || cleanTag === "privacy" || cleanTitle.includes("privacy") || cleanUrl.includes("privacy")) {
          return;
        }

        // Prevent accidental "Standalone" folder creation
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

    // 4. User Identity & Multi-Platform Telemetry Binding
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

          // RTDB Identity Hook (/users/{emailKey})
          rtdb.ref(`/users/${this.currentEmailKey}`).on("value", snapshot => {
            const rtdbProfile = snapshot.val() || {};
            const gamerTag = rtdbProfile.username || user.displayName || this.hunterName;
            let avatarUrl = rtdbProfile.avatar_url || user.photoURL || DEFAULT_USER_AVATAR;

            if (rtdbProfile.avatar_source === "google") {
              avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;
            }

            if (nameEl) nameEl.textContent = gamerTag;
            if (avatarEl) avatarEl.src = avatarUrl;

            this.psnAccountId = rtdbProfile.psn_account_id || "";
            this.psnOnlineId = rtdbProfile.psn_username || "";

            // User primary platform or detection
            if (rtdbProfile.primary_platform) {
              this.currentPlatform = rtdbProfile.primary_platform.toLowerCase();
              this.safeSetValue("platformSelect", this.currentPlatform);
            }

            // Sync PSN Telemetry if connected
            if (this.psnOnlineId || this.psnAccountId) {
              this.syncPlayStationTrophies(this.psnOnlineId, this.psnAccountId);
            }

            // Real-time friend telemetry tracking
            this.friendsRoster = rtdbProfile.friends ? Object.values(rtdbProfile.friends) : [];
            this.loadFriendsComparisonTelemetry();
          });

          // Firestore Progress Hook: users/{emailKey}/platform/{platform}/progress/woth2
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
              if (data.hunter_credits) {
                this.hunterCredits = data.hunter_credits;
                this.safeSetValue("hunterCreditsInput", this.hunterCredits);
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

    // 5. PlayStation Live Trophy Telemetry Sync Engine
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

            this.userTrophyProgress[id] = {
              earned: isEarned,
              timestamp: dateStr,
              currentValue: t.currentValue !== undefined ? Number(t.currentValue) : null,
              targetValue: t.targetValue !== undefined ? Number(t.targetValue) : null,
              manual: false
            };
          });

          this.renderTrophies();
          await this.silentSaveGameTelemetry();
        }
      });
    },

    // Manual Click-To-Toggle for non-PSN / manual players
    toggleManualTrophy(trophyId) {
      if (this.currentPlatform === "ps" && (this.psnOnlineId || this.psnAccountId)) {
        return; // Auto-sync locks manual clicking on verified PlayStation accounts
      }

      const id = String(trophyId);
      const current = this.userTrophyProgress[id] || { earned: false };

      if (current.earned) {
        // Toggle OFF (accidental click reversal)
        this.userTrophyProgress[id] = {
          earned: false,
          timestamp: null,
          currentValue: null,
          targetValue: null,
          manual: true
        };
      } else {
        // Toggle ON
        this.userTrophyProgress[id] = {
          earned: true,
          timestamp: new Date().toISOString(),
          currentValue: null,
          targetValue: null,
          manual: true
        };
      }

      this.renderTrophies();
      this.silentSaveGameTelemetry();
    },

    // 6. Unified Trophy & Achievement Renderer (Supports PS, Xbox, Steam, Microsoft)
    renderTrophies() {
      const container = document.getElementById("psnTrophiesContainer");
      if (!container) return;

      const total = this.masterTrophies.length || 6;
      const progressEntries = Object.values(this.userTrophyProgress);
      const earnedList = progressEntries.filter(t => t.earned);
      const earnedCount = earnedList.length;
      const progressPercent = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

      // Calculate earliest trophy unlocked milestone
      let firstTrophyText = "No trophies or achievements recorded yet";
      if (earnedList.length > 0) {
        const sortedEarned = [...earnedList].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        const first = sortedEarned[0];
        const firstMaster = this.masterTrophies.find(m => m.trophyId === Object.keys(this.userTrophyProgress).find(k => this.userTrophyProgress[k] === first));
        const firstTitle = firstMaster ? firstMaster.title : "Milestone Complete";
        const firstDate = new Date(first.timestamp);
        const dateFormatted = !isNaN(firstDate.getTime())
          ? firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : "Recorded";
        firstTrophyText = `🏆 First Unlocked: <strong>${firstTitle}</strong> (${dateFormatted})`;
      }

      const isLivePS = this.currentPlatform === "ps" && (this.psnOnlineId || this.psnAccountId);
      const platformName = this.currentPlatform.toUpperCase();

      container.innerHTML = `
        <div style="grid-column: 1/-1; background:#151c27; padding:14px 18px; border-radius:8px; border:1px solid #273447; margin-bottom:12px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong style="color:#fff; font-size:1.05rem;">
                ${isLivePS ? `PlayStation Sync &bull; ${this.psnOnlineId}` : `${platformName} Achievement Tracker`}
              </strong>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                ${isLivePS ? `Tracking Live via NPWR52231_00` : `Click any trophy card below to mark/unmark completion`}
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:#28374d; color:var(--accent-gold); font-size:0.85rem;">
                ${earnedCount} / ${total} Unlocked (${progressPercent}%)
              </span>
            </div>
          </div>

          <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #0088ff, #2ecc71); border-radius:4px; transition: width 0.4s ease;"></div>
          </div>

          <div style="font-size:0.78rem; color:#ffe0b3; display:flex; align-items:center; gap:6px;">
            ${firstTrophyText}
          </div>
        </div>
      `;

      // Render Every Trophy from Master Catalog with Progressive State
      this.masterTrophies.forEach(t => {
        const userState = this.userTrophyProgress[t.trophyId] || { earned: false };
        const isEarned = userState.earned;
        const div = document.createElement("div");
        div.className = `telemetry-card ${isEarned ? 'trophy-card-earned' : ''}`;
        div.style.cursor = isLivePS ? "default" : "pointer";

        if (!isLivePS) {
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

        // Milestone Progress bar (X / X)
        let milestoneHtml = "";
        if (userState.targetValue && userState.targetValue > 0) {
          const cur = userState.currentValue || 0;
          const tar = userState.targetValue;
          const milePct = Math.min(100, Math.round((cur / tar) * 100));
          milestoneHtml = `
            <div style="margin-top:6px;">
              <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-bottom:2px;">
                <span>Milestone Progress</span>
                <strong style="color:#fff;">${cur} / ${tar} (${milePct}%)</strong>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                <div style="width:${milePct}%; height:100%; background:var(--accent-gold);"></div>
              </div>
            </div>
          `;
        }

        div.innerHTML = `
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <img src="${t.icon}" alt="" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
            <div style="flex-grow:1;">
              <div class="card-top-row">
                <span class="animal-title">${t.title}</span>
                <span class="badge" style="border-color:${gradeColor}; color:${gradeColor};">${t.grade}</span>
              </div>
              <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${t.desc}</p>
              ${milestoneHtml}
            </div>
          </div>
          <div class="card-footer-row" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
            <div>
              <span style="font-size:0.8rem; font-weight:600; color:${isEarned ? 'var(--success)' : 'var(--text-muted)'};">
                ${isEarned ? (userState.manual ? '✔ Earned (Manual)' : '✔ Earned') : '🔒 Locked'}
              </span>
              ${isEarned && formattedTimestamp ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Unlocked: ${formattedTimestamp}</div>` : ''}
            </div>
            ${!isLivePS ? `<span style="font-size:0.7rem; color:var(--text-muted);">Click to toggle</span>` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    // 7. Companion Telemetry Comparison (Cross-Platform Roster using emailKey)
    async loadFriendsComparisonTelemetry() {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;

      if (!this.friendsRoster.length) {
        container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No companions linked yet. Share your 8-character Friend Code in Settings to compare telemetry.</p>`;
        return;
      }

      container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:10px;">Loading live companion telemetry...</div>`;
      const comparisonCards = [];

      for (const friend of this.friendsRoster) {
        const friendEmail = (friend.target_email || "").toLowerCase();
        if (!friendEmail) continue;
        const friendKey = getEmailKey(friendEmail);

        try {
          const targetPlatform = (friend.platform || this.currentPlatform || "ps").toLowerCase();
          const snap = await db.collection("users")
            .doc(friendKey)
            .collection("platform")
            .doc(targetPlatform)
            .collection("progress")
            .doc("woth2")
            .get();

          if (snap.exists) {
            const data = snap.data();
            comparisonCards.push({
              username: friend.username || "Companion",
              avatar: friend.avatar_url || DEFAULT_USER_AVATAR,
              platform: (data.platform || targetPlatform).toUpperCase(),
              level: data.hunter_level || 1,
              credits: data.hunter_credits || 0,
              day: data.companion_day || 1,
              time: data.companion_time || "08:00",
              weather: data.weather || "Clear",
              trophiesEarned: data.trophies_earned || 0,
              trophiesTotal: data.trophies_total || 6,
              trophiesPct: data.trophies_percent || 0,
              harvestCount: data.harvest_count || 0,
              watchlistCount: (data.watchlist && data.watchlist.length) ? data.watchlist.length : 0,
              dogStats: data.dog_stats || null
            });
          }
        } catch (e) {
          console.warn("Companion fetch warning:", e);
        }
      }

      this.renderFriendsComparison(comparisonCards);
    },

    renderFriendsComparison(cards) {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;
      container.innerHTML = "";

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
              <strong style="color:#fff; font-size:0.95rem;">${c.username}</strong>
            </div>
            <span class="badge" style="background:#28374d; color:#00d2d3;">${c.platform}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; color:var(--text-muted);">
            <div>Level: <strong style="color:#fff;">Lv. ${c.level}</strong></div>
            <div>Credits: <strong style="color:var(--accent-amber);">$${c.credits}</strong></div>
            <div>Time / Day: <strong style="color:#fff;">Day ${c.day} (${c.time})</strong></div>
            <div>Weather: <strong style="color:#ffe099;">${c.weather}</strong></div>
            <div>Harvests: <strong style="color:#2ecc71;">${c.harvestCount} Animals</strong></div>
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

    // 8. Dynamic Features & Static JSON Integrations
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
      this.renderMissions();
      this.renderInfrastructure();
      this.renderTrails();
      this.renderSpeciesCatalog();
      this.updateDynamicHarvestSchema();
    },

    populateRegions() {
      const regions = (this.db.regions && this.db.regions.regions) ? this.db.regions.regions : [];
      const locationSelect = document.getElementById("harvestLocationSelect");
      const watchRegionSelect = document.getElementById("watchRegionSelect");

      if (locationSelect) locationSelect.innerHTML = "";
      if (watchRegionSelect) watchRegionSelect.innerHTML = "";

      regions.forEach(r => {
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

      if (selectedSpecies.includes("bear") || selectedSpecies.includes("wolf") || selectedSpecies.includes("badger") || selectedSpecies.includes("wolverine")) {
        category = "Skull & Weight (Predator)";
        fields = [
          { id: "skull_length", label: "Skull Length", unit: "in", ph: "15.4" },
          { id: "skull_width", label: "Skull Width", unit: "in", ph: "10.2" },
          { id: "body_weight", label: "Body Weight", unit: "lbs", ph: "379.7" }
        ];
      } else if (selectedSpecies.includes("boar") || selectedSpecies.includes("pig")) {
        category = "Tusks & Skull";
        fields = [
          { id: "tusk_length", label: "Lower Tusk Length", unit: "in", ph: "7.8" },
          { id: "tusk_thickness", label: "Tusk Circumference", unit: "in", ph: "3.2" }
        ];
      } else if (selectedSpecies.includes("sheep") || selectedSpecies.includes("goat") || selectedSpecies.includes("bison") || selectedSpecies.includes("pronghorn")) {
        category = "Horns (Bovidae)";
        fields = [
          { id: "horn_length", label: "Horn Length", unit: "in", ph: "36.8" },
          { id: "base_circ", label: "Base Circumference", unit: "in", ph: "14.2" },
          { id: "curl_spread", label: "Tip Spread", unit: "in", ph: "22.0" }
        ];
      } else if (selectedSpecies.includes("moose")) {
        category = "Palmate Antlers";
        fields = [
          { id: "palm_len", label: "Palm Length", unit: "in", ph: "32.0" },
          { id: "palm_width", label: "Palm Width", unit: "in", ph: "12.5" },
          { id: "points_left", label: "Points Left", unit: "count", ph: "9" },
          { id: "points_right", label: "Points Right", unit: "count", ph: "8" }
        ];
      } else if (selectedSpecies.includes("turkey") || selectedSpecies.includes("mallard") || selectedSpecies.includes("ptarmigan") || selectedSpecies.includes("hare")) {
        category = "Body Weight & Plumage";
        fields = [
          { id: "body_weight", label: "Total Body Weight", unit: "lbs", ph: "18.5" },
          { id: "beard_len", label: "Beard Length", unit: "in", ph: "10.5" },
          { id: "spur_len", label: "Spur Length", unit: "in", ph: "1.25" }
        ];
      }

      container.innerHTML = `<span style="grid-column: 1/-1; font-size: 0.76rem; color: var(--accent-amber); font-weight: 700;">Trophy Type: ${category}</span>`;

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
      maxAgeEl.value = match ? match.max_age_years : 12;
    },

    saveWatchlistEntry() {
      const editId = document.getElementById("editWatchlistId").value;
      const tag = document.getElementById("watchIdentifier").value.trim();
      const species = document.getElementById("watchSpeciesSelect").value;
      const region = document.getElementById("watchRegionSelect").value;
      const landmark = document.getElementById("watchLandmark").value.trim();
      const fitness = parseFloat(document.getElementById("watchFitness").value);
      const age = parseInt(document.getElementById("watchAge").value, 10);
      const maxAge = parseInt(document.getElementById("watchMaxAge").value, 10);
      const stars = parseInt(document.getElementById("watchStars").value, 10);

      if (!tag || isNaN(fitness) || isNaN(age) || !landmark) {
        return alert("Please enter the animal identifier, fitness %, age, and need zone landmark.");
      }

      if (editId) {
        const idx = this.watchlist.findIndex(w => w.id === editId);
        if (idx !== -1) {
          this.watchlist[idx] = { ...this.watchlist[idx], tag, species, region, landmark, fitness, age, maxAge, stars };
        }
      } else {
        const newEntry = {
          id: "target_" + Date.now(),
          tag, species, region, landmark, fitness, sightedAge: age, age, maxAge, stars, sightedDay: this.currentDay
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
      this.safeSetValue("watchAge", "8");
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
      this.safeSetValue("watchRegionSelect", item.region || "Jackalope Cordillera");
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
        const elapsedDays = Math.max(0, this.currentDay - (item.sightedDay || 1));
        const effectiveAge = (item.sightedAge || item.age) + Math.floor(elapsedDays / 3);
        const daysLeft = Math.max(0, (item.maxAge - effectiveAge) * 3);

        let actionClass = "banner-balanced";
        let actionText = "⚖️ BALANCED: Stable genetics. Monitor.";

        if (item.fitness < 50.0) {
          actionClass = "banner-cull";
          actionText = `🚨 CULL: Low Fitness (${item.fitness}%). Asymmetry degrades herd.`;
        } else if (item.fitness >= 80.0 && effectiveAge < item.maxAge) {
          actionClass = "banner-breeder";
          actionText = `⭐ 5-STAR BREEDER (${item.fitness}%): Allow rack to mature.`;
        } else if (item.stars === 1 && effectiveAge >= (item.maxAge - 2)) {
          actionClass = "banner-cull";
          actionText = "⚠️ CULL MATURE: 1-Star rack at end of lifecycle.";
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
              <strong>${item.species}</strong> &bull; ${item.region || 'Region'}
            </div>
            <div style="font-size:0.75rem; color:#ffe099; margin-top:2px;">
              Zone: <strong>${item.landmark || 'Waterway'}</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Age: <strong>${effectiveAge}/${item.maxAge} yrs</strong> (${daysLeft}d left) &bull; Fit: <strong>${item.fitness}%</strong>
            </div>
            <div class="action-banner ${actionClass}">${actionText}</div>
          </div>
          <div class="card-footer-row">
            <span>Day: <strong>${item.sightedDay || 1}</strong> &rarr; <strong>${this.currentDay}</strong></span>
            <div class="card-actions">
              <button class="btn-link btn-link-edit" onclick="window.CompanionApp.editWatchlistEntry('${item.id}')">Edit</button>
              <button class="btn-link btn-link-delete" onclick="window.CompanionApp.deleteWatchlistEntry('${item.id}')">Harvest</button>
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
              <span class="animal-title">${r.species}</span>
              <span class="badge">${r.trophy_rating_stars}&#9733; Trophy</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Tier: <strong>${r.animal_tier}</strong> &bull; Location: <strong>${r.location || 'New Laurentia'}</strong>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Firearm: <strong>${r.firearm} (${r.caliber})</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Shot: <strong>${r.shot_distance_yds} yds</strong> &bull; Tracking: <strong>${r.tracking_distance_yds || 0} yds</strong>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">
              Fitness: <strong>${r.fitness_percentage}%</strong> &bull; Age: <strong>${r.age_years || 'Adult'} Yrs</strong> &bull; Sell: <strong>$${r.sell_price || 149}</strong>
            </div>
            <div class="action-banner ${r.fitness_percentage < 50 ? 'banner-cull' : 'banner-breeder'}" style="margin-top:6px;">
              ${r.cull_decision || 'Keeper Specimen'}
            </div>
          </div>
          <div class="card-footer-row">
            <span>Date: <strong>${r.date || 'Active Session'}</strong></span>
            <span style="color:var(--accent-amber); font-weight:700;">Rank: ${r.hunt_rating || 'S++'}</span>
          </div>
        `;
        container.appendChild(div);
      });
    },

    submitHarvestInspection() {
      const species = document.getElementById("harvestSpeciesSelect").value;
      const location = document.getElementById("harvestLocationSelect").value;
      const firearm = document.getElementById("harvestFirearm").value;
      const caliber = document.getElementById("harvestCaliber").value;
      const shotDist = document.getElementById("harvestShotDist").value;
      const trackDist = document.getElementById("harvestTrackDist").value;
      const fitness = parseFloat(document.getElementById("harvestFitness").value) || 60;
      const stars = parseInt(document.getElementById("harvestRatingStars").value, 10);
      const sellPrice = document.getElementById("harvestSellPrice").value;

      const newRecord = {
        species,
        animal_tier: 5,
        location,
        firearm,
        caliber,
        shot_distance_yds: shotDist,
        tracking_distance_yds: trackDist,
        fitness_percentage: fitness,
        trophy_rating_stars: stars,
        sell_price: sellPrice,
        cull_decision: fitness < 50 ? "Cull (Low Fitness)" : "Keeper / Trophy",
        date: "October 7, 2026",
        hunt_rating: "A++"
      };

      if (!this.db.gameData) this.db.gameData = {};
      if (!this.db.gameData.harvest_records) this.db.gameData.harvest_records = [];

      this.db.gameData.harvest_records.unshift(newRecord);
      this.renderHarvestHistory();
      this.silentSaveGameTelemetry();
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
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('bonding', -1)">&minus;</button>
            <strong style="color:var(--accent-amber); font-size:0.95rem;">${this.dogBondingLevel} / 6</strong>
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('bonding', 1)">&plus;</button>
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
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('following', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogFollowingCommandsLevel} / 6</strong>
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('following', 1)">&plus;</button>
          </div>
        </div>

        <div class="dog-stepper-row">
          <div>
            <strong style="color:var(--accent-amber);">Blood Tracking</strong>
            <p style="font-size:0.78rem; color:var(--text-muted);">Follows faint blood tracks over water and rain to stop meat degradation.</p>
          </div>
          <div class="stepper-controls">
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogBloodTrackingLevel} / 6</strong>
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', 1)">&plus;</button>
          </div>
        </div>

        <div class="dog-stepper-row">
          <div>
            <strong style="color:var(--accent-amber);">Search &amp; Quartering</strong>
            <p style="font-size:0.78rem; color:var(--text-muted);">Weaves ahead in zig-zag patterns to flush birds and retrieve small game.</p>
          </div>
          <div class="stepper-controls">
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('search', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogSearchQuarteringLevel} / 6</strong>
            <button class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('search', 1)">&plus;</button>
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

    renderNeedZones() {
      const container = document.getElementById("needZoneClustersGrid");
      if (!container) return;
      const clusters = (this.db.needZones && this.db.needZones.clusters) ? this.db.needZones.clusters : [];

      this.safeSetText("needZoneCount", `${clusters.length} Tactical Clusters`);
      container.innerHTML = "";

      clusters.forEach(c => {
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

    renderChallenges() {
      const container = document.getElementById("challengeTreesGrid");
      if (!container) return;
      const trees = (this.db.challenges && this.db.challenges.trees) ? this.db.challenges.trees : {};

      container.innerHTML = "";
      Object.entries(trees).forEach(([k, t]) => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${t.name} Mastery</strong>
            <span class="badge">${t.total} Challenges</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-top:6px;">${t.description}</p>
        `;
        container.appendChild(div);
      });
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
            <span class="badge">${m.source}</span>
          </div>
          <ul style="font-size:0.8rem; color:var(--text-muted); padding-left:18px; margin-top:6px;">
            ${m.objectives.map(o => `<li>${o}</li>`).join("")}
          </ul>
          <div style="font-size:0.78rem; color:var(--accent-amber); margin-top:6px;">
            Reward: ${m.money ? `$${m.money}` : 'XP'} ${m.xp ? `&bull; ${m.xp} XP` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    renderInfrastructure() {
      const container = document.getElementById("infrastructureGrid");
      if (!container) return;
      const infra = this.db.infrastructure || {};
      const tasks = infra.tasks || [];

      this.safeSetText("infrastructureCount", `${tasks.length} Enhancements`);
      const notesBox = document.getElementById("infraNotesBox");
      if (notesBox) {
        notesBox.innerHTML = `<strong>Warden Protocol:</strong> ${infra.mechanic_notes || "Feeders and pollution removal impact genetic ceilings."}`;
      }

      container.innerHTML = "";
      tasks.forEach(t => {
        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${t.type}</strong>
            <span class="badge">$${t.cost}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
            Location: <strong>${t.location}</strong>
          </div>
          <div style="font-size:0.76rem; color:var(--accent-amber); margin-top:4px;">
            Affected: ${t.affected_species && t.affected_species.length ? t.affected_species.join(", ") : "Regional Infrastructure"}
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

    // 9. Input Listeners: Silent Blur & Enter Auto-Sync Engine
    bindUI() {
      document.querySelectorAll(".ribbon-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".ribbon-btn").forEach(b => b.classList.remove("active"));
          document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
          btn.classList.add("active");
          const target = document.getElementById(`tab-${btn.dataset.tab}`);
          if (target) target.classList.add("active");
        });
      });

      // Platform Selector Listener
      const platSelect = document.getElementById("platformSelect");
      if (platSelect) {
        platSelect.addEventListener("change", (e) => {
          this.currentPlatform = e.target.value;
          this.renderTrophies();
          this.silentSaveGameTelemetry();
        });
      }

      // Silent Auto-Sync on Blur and Enter
      const autoSyncInputs = [
        "hunterNameInput", "hunterLevelInput", "hunterCreditsInput",
        "currentDayInput", "currentTimeInput", "weatherConditionInput"
      ];

      autoSyncInputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

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
      if (saveWatchBtn) saveWatchBtn.addEventListener("click", () => this.saveWatchlistEntry());

      const cancelWatchBtn = document.getElementById("cancelEditWatchlistBtn");
      if (cancelWatchBtn) cancelWatchBtn.addEventListener("click", () => this.resetWatchlistForm());

      const harvestSpecies = document.getElementById("harvestSpeciesSelect");
      if (harvestSpecies) harvestSpecies.addEventListener("change", () => this.updateDynamicHarvestSchema());

      const submitHarvestBtn = document.getElementById("submitHarvestRecordBtn");
      if (submitHarvestBtn) submitHarvestBtn.addEventListener("click", () => this.submitHarvestInspection());

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
