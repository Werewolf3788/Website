// Line 1: Way of the Hunter 2 - Master Tactical Companion Engine
// [Smart Cache-Buster Time: 2026-10-07 17:42 EDT | Firebase Sync Target: /utm_links | Version: 4.3.0]

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";

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

  const CompanionApp = {
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
    watchlist: [],

    async init() {
      this.loadSavedState();
      this.bindUI();
      this.initAuth();
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
      const savedWatch = localStorage.getItem("woth2_watchlist");
      const savedName = localStorage.getItem("woth2_name");
      const savedLevel = localStorage.getItem("woth2_level");
      const savedCredits = localStorage.getItem("woth2_credits");

      const savedBonding = localStorage.getItem("woth2_dog_bonding");
      const savedFollowing = localStorage.getItem("woth2_dog_following");
      const savedBlood = localStorage.getItem("woth2_dog_blood");
      const savedSearch = localStorage.getItem("woth2_dog_search");

      if (savedDay) this.currentDay = parseInt(savedDay, 10);
      if (savedTime) this.currentTime = savedTime;
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

      this.safeSetValue("currentDayInput", this.currentDay);
      this.safeSetValue("currentTimeInput", this.currentTime);
      this.safeSetValue("hunterNameInput", this.hunterName);
      this.safeSetValue("hunterLevelInput", this.hunterLevel);
      this.safeSetValue("hunterCreditsInput", this.hunterCredits);
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

    saveSession() {
      const nameEl = document.getElementById("hunterNameInput");
      const lvlEl = document.getElementById("hunterLevelInput");
      const crdEl = document.getElementById("hunterCreditsInput");

      if (nameEl) this.hunterName = nameEl.value.trim() || "Hunter";
      if (lvlEl) this.hunterLevel = parseInt(lvlEl.value, 10) || 1;
      if (crdEl) this.hunterCredits = parseInt(crdEl.value, 10) || 0;

      localStorage.setItem("woth2_day", this.currentDay);
      localStorage.setItem("woth2_time", this.currentTime);
      localStorage.setItem("woth2_name", this.hunterName);
      localStorage.setItem("woth2_level", this.hunterLevel);
      localStorage.setItem("woth2_credits", this.hunterCredits);

      localStorage.setItem("woth2_dog_bonding", this.dogBondingLevel);
      localStorage.setItem("woth2_dog_following", this.dogFollowingCommandsLevel);
      localStorage.setItem("woth2_dog_blood", this.dogBloodTrackingLevel);
      localStorage.setItem("woth2_dog_search", this.dogSearchQuarteringLevel);
      localStorage.setItem("woth2_watchlist", JSON.stringify(this.watchlist));

      if (this.currentUser) {
        db.collection("users").doc(this.currentUser.uid).set({
          companion_day: this.currentDay,
          companion_time: this.currentTime,
          hunter_name: this.hunterName,
          hunter_level: this.hunterLevel,
          hunter_credits: this.hunterCredits,
          dog_stats: {
            bonding: this.dogBondingLevel,
            following: this.dogFollowingCommandsLevel,
            blood: this.dogBloodTrackingLevel,
            search: this.dogSearchQuarteringLevel
          },
          watchlist: this.watchlist,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.warn("Cloud save:", e));
      }

      alert("Telemetry, dog progress, and watchlist synced successfully!");
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

        this.syncWoth2Favicon(items, raw);
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

    syncWoth2Favicon(items, raw) {
      let woth2Img = "";
      let woth2Stamp = "";

      const taggedEntry = items.find(i => i.tag && i.tag.toLowerCase() === "woth2");

      if (taggedEntry) {
        woth2Img = taggedEntry.image;
        woth2Stamp = taggedEntry.updatedAt;
      } else if (raw.WOTH2 && raw.WOTH2[0] && raw.WOTH2[0].image) {
        woth2Img = raw.WOTH2[0].image;
        woth2Stamp = raw.WOTH2[0].updatedAt;
      } else {
        const titleMatch = items.find(i => {
          const t = i.title.toLowerCase();
          return t.includes("woth2") || t.includes("way of the hunter");
        });
        if (titleMatch) {
          woth2Img = titleMatch.image;
          woth2Stamp = titleMatch.updatedAt;
        }
      }

      if (woth2Img) {
        const favicon = document.getElementById("dynamicFavicon");
        const appleIcon = document.getElementById("dynamicAppleIcon");
        const brandLogo = document.getElementById("navBrandLogo");

        if (favicon) favicon.href = woth2Img;
        if (appleIcon) appleIcon.href = woth2Img;
        if (brandLogo) brandLogo.src = woth2Img;
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
        if (!item.group) {
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
          if (modalBtn) modalBtn.classList.add("hidden");
          if (profileBadge) profileBadge.classList.remove("hidden");

          let gamerTag = user.displayName || this.hunterName;
          let avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;

          try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) {
              const data = doc.data();
              if (data.username) gamerTag = data.username;
              if (data.avatar_url) avatarUrl = data.avatar_url;
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
              if (data.dog_stats) {
                this.dogBondingLevel = data.dog_stats.bonding ?? this.dogBondingLevel;
                this.dogFollowingCommandsLevel = data.dog_stats.following ?? this.dogFollowingCommandsLevel;
                this.dogBloodTrackingLevel = data.dog_stats.blood ?? this.dogBloodTrackingLevel;
                this.dogSearchQuarteringLevel = data.dog_stats.search ?? this.dogSearchQuarteringLevel;
                this.updateDogInputDisplay();
                this.renderDogProfile();
              }
              if (data.companion_day) {
                this.currentDay = data.companion_day;
                this.safeSetValue("currentDayInput", this.currentDay);
              }
              if (data.watchlist && Array.isArray(data.watchlist)) {
                this.watchlist = data.watchlist;
                this.renderWatchlist();
              }
            }
          } catch (e) {}

          if (nameEl) nameEl.textContent = gamerTag;
          if (avatarEl) avatarEl.src = avatarUrl;
        } else {
          this.currentUser = null;
          if (modalBtn) modalBtn.classList.remove("hidden");
          if (profileBadge) profileBadge.classList.add("hidden");
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

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => auth.signOut());
      }
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
      this.renderMissions();
      this.renderInfrastructure();
      this.renderTrails();
      this.renderSpeciesCatalog();
      this.updateDynamicHarvestSchema();
    },

    // Populates Region/Location Selects
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

    // Dynamic Filtering: Repopulates the target species select with ONLY animals that live in that region
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
      this.saveSession();
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
      this.saveSession();
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

    // Detailed multi-variable Inspection History Cards Grid
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
      alert("Harvest inspection record logged successfully!");
    },

    // Interactive Dog Companion Profile with Stepper Adjusters
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
      this.saveSession();
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

      // Regional dynamic filtering listeners
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

      const dayInput = document.getElementById("currentDayInput");
      if (dayInput) {
        dayInput.addEventListener("change", e => {
          this.currentDay = parseInt(e.target.value, 10) || 1;
          this.renderWatchlist();
        });
      }

      const advDayBtn = document.getElementById("advanceDayBtn");
      if (advDayBtn) {
        advDayBtn.addEventListener("click", () => {
          this.currentDay++;
          this.safeSetValue("currentDayInput", this.currentDay);
          this.renderWatchlist();
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
        });
      }

      const syncBtn = document.getElementById("saveSessionBtn");
      if (syncBtn) syncBtn.addEventListener("click", () => this.saveSession());

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
