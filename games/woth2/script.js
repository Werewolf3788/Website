// Line 1: Way of the Hunter 2 - Master Tactical Companion Engine
// [Smart Cache-Buster Time: 2026-10-16 03:35 EDT | Firebase Sync Target: /utm_links | Version: 6.4.2]

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_USER_AVATAR = "//werewolf3788.github.io/Website/assets/logo.jpg";
  const DEFAULT_GAME_POSTER = "//werewolf3788.github.io/Website/assets/logo.jpg";

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
      gear: "woth2_gear.json",
      progressionGear: "woth2_progression_gear.json",
      harvestSchemas: "woth2_harvest_schemas.json",
      infrastructure: "woth2_infrastructure.json",
      lifecycles: "woth2_lifecycles.json",
      missions: "woth2_missions.json",
      needZones: "woth2_need_zones.json",
      newsUpdate: "woth2_news_update.json",
      regions: "woth2_regions.json",
      reserves: "woth2_reserves.json",
      runtimeSave: "woth2_runtime_save.json",
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
    currentPlatform: "ps",
    watchlist: [],
    psnAccountId: "",
    psnOnlineId: "",
    masterTrophies: [],
    userTrophyProgress: {},
    crossPlatformTelemetry: {
      ps: { earned: 0, total: 0, percent: 0 },
      pc: { earned: 0, total: 0, percent: 0 },
      xbox: { earned: 0, total: 0, percent: 0 }
    },
    trophyGroups: [],
    selectedTrophyGroup: "all",
    selectedGearCategory: "all",
    friendsRoster: [],
    completedMissions: {},

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
      // Prioritize relative local project paths first to eliminate CORB issues
      const paths = [
        "./data/" + fileName,
        "../data/" + fileName,
        "../../data/" + fileName,
        "/data/" + fileName,
        "/Website/data/" + fileName
      ];
      for (let i = 0; i < paths.length; i++) {
        try {
          const res = await fetch(paths[i] + "?v=" + Date.now());
          if (res.ok) {
            return await res.json();
          }
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

    applyUserThemeAndIdentity() {
      if (!this.db.users) return;
      const userList = Array.isArray(this.db.users)
        ? this.db.users
        : (this.db.users.users || Object.values(this.db.users));
      if (!Array.isArray(userList)) return;

      const activeEmail = (this.currentEmail || "").toLowerCase().trim();
      const matchedUser = userList.find(u => (u.email || "").toLowerCase().trim() === activeEmail);
      if (matchedUser && matchedUser.theme) {
        const root = document.documentElement;
        if (matchedUser.theme.primary_color) root.style.setProperty("--theme-primary", matchedUser.theme.primary_color);
        if (matchedUser.theme.accent_color) root.style.setProperty("--theme-accent", matchedUser.theme.accent_color);
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
                timestamp: t.timestamp || new Date().toISOString(),
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
      const savedDay = localStorage.getItem("woth2_day");
      const savedTime = localStorage.getItem("woth2_time");
      const savedCredits = localStorage.getItem("woth2_credits");
      const savedLevel = localStorage.getItem("woth2_level");
      const savedWatch = localStorage.getItem("woth2_watchlist");
      const savedCompletedMissions = localStorage.getItem("woth2_completed_missions");

      if (savedDay) this.currentDay = parseInt(savedDay, 10);
      if (savedTime) this.currentTime = savedTime;
      if (savedCredits) this.hunterCredits = parseInt(savedCredits, 10);
      if (savedLevel) this.hunterLevel = parseInt(savedLevel, 10);
      if (savedWatch) {
        try { this.watchlist = JSON.parse(savedWatch); } catch (e) { this.watchlist = []; }
      }
      if (savedCompletedMissions) {
        try { this.completedMissions = JSON.parse(savedCompletedMissions); } catch (e) { this.completedMissions = {}; }
      }

      this.safeSetValue("currentDayInput", this.currentDay);
      this.safeSetValue("currentTimeInput", this.currentTime);
      this.safeSetValue("hunterCreditsInput", this.hunterCredits);
      this.safeSetValue("hunterLevelInput", this.hunterLevel);
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

    initMasterGameData() {
      rtdb.ref(`/psn/games/${this.titleId}`).on("value", snapshot => {
        const game = snapshot.val();
        if (!game) return;
        let rawTrophies = [];
        if (game.rawSonyMetadata && game.rawSonyMetadata.trophies) {
          rawTrophies = Array.isArray(game.rawSonyMetadata.trophies) ? game.rawSonyMetadata.trophies : Object.values(game.rawSonyMetadata.trophies);
        }
        if (rawTrophies.length > 0) {
          this.masterTrophies = rawTrophies.map((t, idx) => ({
            trophyId: t.trophyId !== undefined ? String(t.trophyId) : String(idx),
            title: t.trophyName || `Trophy #${idx + 1}`,
            desc: t.trophyDetail || "Way of the Hunter 2 milestone.",
            icon: t.trophyIconUrl || DEFAULT_GAME_POSTER,
            grade: t.trophyType || "Bronze",
            groupId: t.trophyGroupId !== undefined ? String(t.trophyGroupId) : "default"
          }));
        }
        this.recalculateCrossTrophyTelemetry();
        this.renderTrophies();
      });
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
            items.push(this.normalizeItem(val, parentKey));
          }
        });
        this.renderNav(items);
      });
    },

    normalizeItem(item, fallbackKey) {
      return {
        title: item.title || fallbackKey,
        url: item.url || "#",
        image: item.image || "",
        group: item.group || "",
        rowNumber: Number(item.rowNumber || 9999)
      };
    },

    renderNav(items) {
      const navList = document.getElementById("navList");
      if (!navList) return;
      navList.innerHTML = "";
      items.sort((a, b) => a.rowNumber - b.rowNumber).slice(0, 10).forEach(item => {
        const li = document.createElement("li");
        li.className = "nav-item";
        li.innerHTML = `<a href="${item.url}" class="nav-pill"><span>${item.title}</span></a>`;
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
          if (nameEl) nameEl.textContent = user.displayName || this.hunterName;
          if (avatarEl) avatarEl.src = user.photoURL || DEFAULT_USER_AVATAR;

          // Listen directly to current user's friends list
          rtdb.ref(`/users/${this.currentEmailKey}/friends`).on("value", snapshot => {
            const rawFriends = snapshot.val() || {};
            this.friendsRoster = Object.entries(rawFriends).map(([codeKey, friendData]) => {
              const code = (typeof friendData === "object" && friendData !== null && friendData.friend_code)
                ? friendData.friend_code
                : codeKey;
              return { code: String(code).toUpperCase() };
            });
            this.loadRealFriendsTelemetry();
          });
        } else {
          this.currentUser = null;
          this.currentEmail = "";
          this.currentEmailKey = "";
          if (modalBtn) modalBtn.classList.remove("hidden");
          if (profileBadge) profileBadge.classList.add("hidden");
          this.friendsRoster = [];
          this.renderRealFriends([]);
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

    async addFriendByCode() {
      const codeInput = document.getElementById("friendCodeInput");
      if (!codeInput || !codeInput.value.trim()) return alert("Please enter an 8-character Friend Code.");
      const code = codeInput.value.trim().toUpperCase();

      if (!this.currentEmailKey) return alert("Please log in to link companion friends.");

      try {
        const usersSnap = await rtdb.ref("/users").once("value");
        const allUsers = usersSnap.val() || {};

        let foundKey = null;
        let foundData = null;

        Object.entries(allUsers).forEach(([userKey, userData]) => {
          if (userData && userData.friend_code && userData.friend_code.toUpperCase() === code) {
            foundKey = userKey;
            foundData = userData;
          }
        });

        if (!foundKey) {
          return alert(`⚠️ No registered hunter found with friend code: ${code}`);
        }

        await rtdb.ref(`/users/${this.currentEmailKey}/friends/${code}`).set({
          friend_code: code,
          user_key: foundKey,
          username: foundData.username || foundData.hunter_name || "Companion Hunter",
          linkedAt: new Date().toISOString()
        });

        codeInput.value = "";
        alert(`✅ Linked companion ${foundData.username || code}!`);
      } catch (err) {
        alert("Error linking friend: " + err.message);
      }
    },

    async loadRealFriendsTelemetry() {
      if (!this.friendsRoster.length) {
        this.renderRealFriends([]);
        return;
      }

      const cards = [];

      try {
        const usersSnap = await rtdb.ref("/users").once("value");
        const allUsers = usersSnap.val() || {};

        for (const f of this.friendsRoster) {
          const code = f.code;
          let matchedEmailKey = null;
          let rtdbUser = null;

          Object.entries(allUsers).forEach(([emailKey, userData]) => {
            if (userData && userData.friend_code && userData.friend_code.toUpperCase() === code) {
              matchedEmailKey = emailKey;
              rtdbUser = userData;
            }
          });

          if (!matchedEmailKey) continue;

          const targetPlatform = (rtdbUser.primary_platform || "ps").toLowerCase();

          try {
            const snap = await db.collection("users")
              .doc(matchedEmailKey)
              .collection("platform")
              .doc(targetPlatform)
              .collection("progress")
              .doc("woth2")
              .get();

            let tele = {};
            if (snap.exists) tele = snap.data();

            cards.push({
              code: code,
              username: tele.hunter_name || rtdbUser.username || "Companion Hunter",
              emailKey: matchedEmailKey,
              platform: (tele.platform || targetPlatform).toUpperCase(),
              level: tele.hunter_level || 1,
              credits: tele.hunter_credits || 0,
              day: tele.companion_day || 1,
              time: tele.companion_time || "08:00",
              weather: tele.weather || "Clear",
              harvests: tele.harvest_count || 0,
              trophiesEarned: tele.trophies_earned || 0,
              trophiesTotal: tele.trophies_total || 6
            });
          } catch (e) {
            console.warn("Companion Firestore progress fetch error:", e);
          }
        }
      } catch (e) {
        console.warn("RTDB user lookup error:", e);
      }

      this.renderRealFriends(cards);
    },

    renderRealFriends(cards) {
      const container = document.getElementById("friendsComparisonContainer");
      if (!container) return;
      container.innerHTML = "";

      if (!cards.length) {
        container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); padding:12px; grid-column:1/-1;">No companion friends linked yet. Link their 8-character code above to view their live telemetry.</p>`;
        return;
      }

      cards.forEach(c => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.style.borderLeft = "3px solid #00d2d3";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#fff; font-size:1rem;">${c.username}</strong>
              <div style="font-size:0.72rem; color:var(--accent-teal);">Code: <strong>${c.code}</strong> &bull; Node: ${c.emailKey}</div>
            </div>
            <span class="badge" style="color:#00d2d3;">${c.platform}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; color:var(--text-muted); margin-top:8px;">
            <div>Level: <strong style="color:#fff;">Lv. ${c.level}</strong></div>
            <div>Credits: <strong style="color:var(--accent-amber);">$${c.credits.toLocaleString()}</strong></div>
            <div>Time / Day: <strong style="color:#fff;">Day ${c.day} (${c.time})</strong></div>
            <div>Weather: <strong style="color:#ffe099;">${c.weather}</strong></div>
            <div>Harvests: <strong style="color:#2ecc71;">${c.harvests} Animals</strong></div>
            <div>Trophies: <strong style="color:var(--accent-gold);">${c.trophiesEarned} / ${c.trophiesTotal}</strong></div>
          </div>
        `;
        container.appendChild(div);
      });
    },

    cleanPrice(val) {
      if (val === undefined || val === null) return 0;
      if (typeof val === "number") return val;
      const stripped = String(val).replace(/[^0-9.]/g, "");
      return parseFloat(stripped) || 0;
    },

    renderGearCatalog() {
      const container = document.getElementById("gearCatalogContainer");
      if (!container) return;

      const rawGear = this.db.gear || {};
      const items = [];

      Object.entries(rawGear).forEach(([categoryKey, categoryBag]) => {
        if (categoryKey === "catalog_metadata" || typeof categoryBag !== "object" || categoryBag === null) return;

        Object.entries(categoryBag).forEach(([itemKey, item]) => {
          if (!item || typeof item !== "object") return;
          items.push({
            id: item.id || itemKey,
            name: item.name || item.title || itemKey,
            category: item.category || categoryKey,
            subgroup: categoryKey,
            price: this.cleanPrice(item.price || item.cost),
            tier: item.tier || (item.tier_min ? `${item.tier_min}-${item.tier_max}` : 1),
            caliber: item.caliber || item.arrow || "",
            image: item.image || item.thumbnail || DEFAULT_GAME_POSTER,
            description: item.description || "Field tactical gear item."
          });
        });
      });

      this.safeSetText("gearCatalogCount", `${items.length} Field Items`);
      container.innerHTML = "";

      const filtered = items.filter(i => {
        if (this.selectedGearCategory === "all") return true;
        return i.subgroup === this.selectedGearCategory;
      });

      filtered.forEach(item => {
        const canAfford = this.hunterCredits >= item.price;
        const diff = item.price - this.hunterCredits;

        const card = document.createElement("div");
        card.className = "telemetry-card";
        card.style.borderLeft = canAfford ? "3px solid var(--success)" : "3px solid var(--accent-amber)";
        card.innerHTML = `
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <img src="${item.image}" alt="" style="width:60px; height:60px; border-radius:6px; object-fit:cover; border:1px solid var(--border-color);" onerror="this.src='${DEFAULT_GAME_POSTER}'">
            <div style="flex-grow:1;">
              <div class="card-top-row">
                <span class="animal-title">${item.name}</span>
                <span class="badge" style="color:var(--accent-gold);">$${item.price.toLocaleString()}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                Category: <strong>${item.category}</strong> ${item.caliber ? `&bull; Caliber: <strong>${item.caliber}</strong>` : ''}
              </div>
              <p style="font-size:0.78rem; color:#cfd9e8; margin-top:6px; line-height:1.35;">${item.description}</p>
              <div class="action-banner ${canAfford ? 'banner-breeder' : 'banner-cull'}" style="margin-top:6px;">
                ${canAfford ? `Balance after: $${(this.hunterCredits - item.price).toLocaleString()}` : `Deficit: Need $${diff.toLocaleString()} more credits`}
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    },

    filterGearCategory(cat) {
      this.selectedGearCategory = cat;
      const pills = document.querySelectorAll("#gearFilterPills .trophy-group-pill");
      pills.forEach(p => p.classList.remove("active"));
      if (window.event && window.event.target) window.event.target.classList.add("active");
      this.renderGearCatalog();
    },

    renderChallenges() {
      const container = document.getElementById("challengeTreesGrid");
      if (!container) return;

      const raw = this.db.challenges || {};
      const trees = raw.trees || (raw.challenges ? raw.challenges.trees : {});

      container.innerHTML = "";
      let challengeCount = 0;

      Object.entries(trees).forEach(([key, tree]) => {
        const treeChallenges = tree.challenges || [];
        challengeCount += treeChallenges.length;

        const div = document.createElement("div");
        div.className = "info-box";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff; font-size:1.05rem;">${tree.name || key} Mastery</strong>
            <span class="badge">${treeChallenges.length || tree.total || 0} Challenges</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 8px;">${tree.description || "Master field skills in this tactical discipline."}</p>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${treeChallenges.map(c => `
              <div style="background:rgba(0,0,0,0.25); padding:6px 8px; border-radius:4px; font-size:0.78rem; border-left:2px solid var(--accent-amber);">
                <strong style="color:var(--text-main);">${c.title || c.name || "Challenge Task"}</strong>
                <div style="color:var(--text-muted); font-size:0.74rem;">${c.description || c.objective || ""}</div>
              </div>
            `).join("")}
          </div>
        `;
        container.appendChild(div);
      });

      this.safeSetText("challengesCount", `${challengeCount} Total Challenges`);
    },

    renderMissions() {
      const container = document.getElementById("missionsGrid");
      if (!container) return;

      const rawMissions = (this.db.missions && this.db.missions.missions) ? this.db.missions.missions : [];
      this.safeSetText("missionsCount", `${rawMissions.length} Missions`);
      container.innerHTML = "";

      rawMissions.forEach((m, idx) => {
        const missionId = `mission_${idx}`;
        const isCompleted = Boolean(this.completedMissions[missionId]);

        const div = document.createElement("div");
        div.className = "info-box";
        div.style.borderLeft = isCompleted ? "3px solid var(--success)" : "3px solid var(--border-color)";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:${isCompleted ? 'var(--success)' : '#fff'}; text-decoration:${isCompleted ? 'line-through' : 'none'};">${m.name}</strong>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.76rem; color:var(--text-muted);">
              <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="window.CompanionApp.toggleMissionComplete('${missionId}')"> Completed
            </label>
          </div>
          <div style="font-size:0.76rem; color:var(--accent-amber); margin-top:2px;">Source: ${m.source || "Warden"}</div>
          <ul style="font-size:0.8rem; color:var(--text-muted); padding-left:18px; margin-top:6px;">
            ${(m.objectives || []).map(o => `<li style="text-decoration:${isCompleted ? 'line-through' : 'none'};">${o}</li>`).join("")}
          </ul>
          <div style="font-size:0.78rem; color:var(--accent-gold); margin-top:6px;">
            Reward: ${m.money ? `$${m.money}` : 'XP'} ${m.xp ? `&bull; ${m.xp} XP` : ''}
          </div>
        `;
        container.appendChild(div);
      });
    },

    toggleMissionComplete(missionId) {
      this.completedMissions[missionId] = !this.completedMissions[missionId];
      localStorage.setItem("woth2_completed_missions", JSON.stringify(this.completedMissions));
      this.renderMissions();
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
        const cost = Number(t.cost || 0);
        const canAfford = this.hunterCredits >= cost;
        const deficit = cost - this.hunterCredits;

        const div = document.createElement("div");
        div.className = "info-box";
        div.style.borderLeft = canAfford ? "3px solid var(--success)" : "3px solid var(--danger)";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff;">${t.type}</strong>
            <span class="badge" style="color:var(--accent-gold);">$${cost.toLocaleString()}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Location: <strong>${t.location}</strong></div>
          <div class="action-banner ${canAfford ? 'banner-breeder' : 'banner-cull'}" style="margin-top:6px;">
            ${canAfford ? `✅ Fully Funded (Balance after: $${(this.hunterCredits - cost).toLocaleString()})` : `🔒 Insufficient Funds (Need $${deficit.toLocaleString()} more)`}
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
              Primary Specialization: <strong>Blood Tracking</strong> &bull; Obedience Score: <strong>Level ${this.dogBondingLevel}</strong>
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
            <p style="font-size:0.78rem; color:var(--text-muted);">Response speed to Heel, Sit, Stay.</p>
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
            <p style="font-size:0.78rem; color:var(--text-muted);">Tracks faint blood trails across terrain.</p>
          </div>
          <div class="stepper-controls">
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', -1)">&minus;</button>
            <strong style="color:#fff; font-size:0.95rem;">${this.dogBloodTrackingLevel} / 6</strong>
            <button type="button" class="stepper-btn" onclick="window.CompanionApp.adjustDogStat('blood', 1)">&plus;</button>
          </div>
        </div>
      `;
    },

    adjustDogStat(statName, delta) {
      if (statName === "bonding") this.dogBondingLevel = Math.max(1, Math.min(6, this.dogBondingLevel + delta));
      if (statName === "following") this.dogFollowingCommandsLevel = Math.max(0, Math.min(6, this.dogFollowingCommandsLevel + delta));
      if (statName === "blood") this.dogBloodTrackingLevel = Math.max(0, Math.min(6, this.dogBloodTrackingLevel + delta));
      this.updateDogInputDisplay();
      this.renderDogProfile();
    },

    submitHarvestInspection() {
      const species = document.getElementById("harvestSpeciesSelect") ? document.getElementById("harvestSpeciesSelect").value : "Elk";
      const location = document.getElementById("harvestLocationSelect") ? document.getElementById("harvestLocationSelect").value : "New Laurentia";
      const firearm = document.getElementById("harvestFirearm") ? document.getElementById("harvestFirearm").value : "Rifle";
      const caliber = document.getElementById("harvestCaliber") ? document.getElementById("harvestCaliber").value : ".308";
      const shotDist = document.getElementById("harvestShotDist") ? document.getElementById("harvestShotDist").value : 100;
      const trackDist = document.getElementById("harvestTrackDist") ? document.getElementById("harvestTrackDist").value : 20;
      const fitness = document.getElementById("harvestFitness") ? (parseFloat(document.getElementById("harvestFitness").value) || 60) : 60;
      const stars = document.getElementById("harvestRatingStars") ? parseInt(document.getElementById("harvestRatingStars").value, 10) : 1;
      const photoUrl = document.getElementById("harvestPhotoUrlInput") ? document.getElementById("harvestPhotoUrlInput").value.trim() : "";

      const newRecord = {
        species,
        location,
        firearm,
        caliber,
        shot_distance_yds: shotDist,
        tracking_distance_yds: trackDist,
        fitness_percentage: fitness,
        trophy_rating_stars: stars,
        photo_url: photoUrl || DEFAULT_GAME_POSTER,
        date: "October 16, 2026"
      };

      if (!this.db.gameData) this.db.gameData = {};
      if (!this.db.gameData.harvest_records) this.db.gameData.harvest_records = [];

      this.db.gameData.harvest_records.unshift(newRecord);
      this.renderHarvestHistory();
      alert("✅ Harvest logged with inspection photo!");
    },

    renderHarvestHistory() {
      const container = document.getElementById("harvestHistoryContainer");
      if (!container) return;
      const records = (this.db.gameData && this.db.gameData.harvest_records) ? this.db.gameData.harvest_records : [];

      this.safeSetText("harvestRecordCount", `${records.length} Records`);
      container.innerHTML = "";

      records.forEach(r => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.innerHTML = `
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <img src="${r.photo_url || DEFAULT_GAME_POSTER}" alt="" style="width:55px; height:55px; border-radius:6px; object-fit:cover; border:1px solid var(--border-color);">
            <div style="flex-grow:1;">
              <div class="card-top-row">
                <span class="animal-title">${r.species}</span>
                <span class="badge">${r.trophy_rating_stars}&#9733; Trophy</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                ${r.location} &bull; ${r.firearm} (${r.caliber})
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                Shot: <strong>${r.shot_distance_yds} yds</strong> &bull; Fitness: <strong>${r.fitness_percentage}%</strong>
              </div>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    },

    recalculateCrossTrophyTelemetry() {
      const total = this.masterTrophies.length || 6;
      const currentEarned = Object.values(this.userTrophyProgress).filter(t => t.earned).length;
      const pct = total > 0 ? Math.round((currentEarned / total) * 100) : 0;
      this.crossPlatformTelemetry[this.currentPlatform] = { earned: currentEarned, total, percent: pct };
    },

    renderTrophies() {
      const container = document.getElementById("trophyChamberGrid") || document.getElementById("psnTrophiesContainer");
      if (!container) return;

      container.innerHTML = "";
      this.masterTrophies.forEach(t => {
        const earned = this.userTrophyProgress[t.trophyId] && this.userTrophyProgress[t.trophyId].earned;
        const div = document.createElement("div");
        div.className = `telemetry-card ${earned ? 'trophy-card-earned' : ''}`;
        div.innerHTML = `
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <img src="${t.icon}" alt="" style="width:48px; height:48px; border-radius:6px; object-fit:cover;">
            <div>
              <div class="card-top-row">
                <span class="animal-title">${t.title}</span>
                <span class="badge">${t.grade}</span>
              </div>
              <p style="font-size:0.78rem; color:#cfd9e8; margin-top:4px;">${t.desc}</p>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    },

    initDynamicFeatures() {
      this.populateRegions();
      this.filterSpeciesByRegion("harvestLocationSelect", "harvestSpeciesSelect");
      this.filterSpeciesByRegion("watchRegionSelect", "watchSpeciesSelect");
      this.renderGearCatalog();
      this.renderHarvestHistory();
      this.renderChallenges();
      this.renderMissions();
      this.renderInfrastructure();
      this.renderNeedZones();
      this.renderLifeCycles();
      this.renderDogProfile();
      this.renderTrails();
      this.renderSpeciesCatalog();
    },

    populateRegions() {
      const regions = (this.db.regions && this.db.regions.regions) ? this.db.regions.regions : [];
      const locSelect = document.getElementById("harvestLocationSelect");
      const watchSelect = document.getElementById("watchRegionSelect");
      if (locSelect) locSelect.innerHTML = "";
      if (watchSelect) watchSelect.innerHTML = "";

      regions.forEach(r => {
        if (locSelect) locSelect.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        if (watchSelect) watchSelect.innerHTML += `<option value="${r.name}">${r.name}</option>`;
      });
    },

    filterSpeciesByRegion(regId, specId) {
      const reg = document.getElementById(regId);
      const spec = document.getElementById(specId);
      if (!reg || !spec) return;
      const allSpecies = (this.db.species && this.db.species.species) ? this.db.species.species : [];
      spec.innerHTML = "";
      allSpecies.filter(s => !s.regions || s.regions.includes(reg.value)).forEach(s => {
        spec.innerHTML += `<option value="${s.name}">${s.name}</option>`;
      });
    },

    bindUI() {
      const sandwichBtn = document.getElementById("moduleSandwichBtn");
      const dropdownMenu = document.getElementById("moduleDropdownMenu");
      const activeLabel = document.getElementById("activeModuleLabel");

      if (sandwichBtn && dropdownMenu) {
        sandwichBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("hidden");
        });
        document.addEventListener("click", () => {
          if (!dropdownMenu.classList.contains("hidden")) dropdownMenu.classList.add("hidden");
        });
      }

      document.querySelectorAll(".module-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".module-item-btn").forEach(b => b.classList.remove("active"));
          document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
          btn.classList.add("active");
          const target = document.getElementById(`tab-${btn.dataset.tab}`);
          if (target) target.classList.add("active");
          if (activeLabel) activeLabel.textContent = btn.querySelector("span").textContent;
          if (dropdownMenu) dropdownMenu.classList.add("hidden");
        });
      });

      const photoUrl = document.getElementById("harvestPhotoUrlInput");
      const photoFile = document.getElementById("harvestPhotoFileInput");
      const photoPrev = document.getElementById("harvestPhotoPreview");
      const photoName = document.getElementById("harvestPhotoFileName");

      if (photoUrl && photoPrev) {
        photoUrl.addEventListener("input", () => {
          if (photoUrl.value.trim()) photoPrev.src = photoUrl.value.trim();
        });
      }
      if (photoFile && photoPrev) {
        photoFile.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            photoPrev.src = evt.target.result;
            if (photoName) photoName.textContent = file.name;
          };
          reader.readAsDataURL(file);
        });
      }

      const harvestSubmit = document.getElementById("submitHarvestRecordBtn");
      if (harvestSubmit) harvestSubmit.addEventListener("click", () => this.submitHarvestInspection());

      const authModal = document.getElementById("authModal");
      const authBtn = document.getElementById("authModalBtn");
      const authClose = document.getElementById("authModalClose");
      if (authBtn && authModal) authBtn.addEventListener("click", () => authModal.classList.remove("hidden"));
      if (authClose && authModal) authClose.addEventListener("click", () => authModal.classList.add("hidden"));
    }
  };

  window.CompanionApp = CompanionApp;
  CompanionApp.init();
});
