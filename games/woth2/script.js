// Line 1: Way of the Hunter Master Data Controller
// [Smart Cache-Buster Time: 2026-10-07 15:42 EDT | Firebase Sync Target: /utm_links | Version: 3.0.0]

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";

  // Production Config for entertainment-71888
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

  const App = {
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
      schemaUpdate: "woth2_schema-update.json",
      species: "woth2_species.json",
      stewardship: "woth2_stewardship.json",
      trails: "woth2_trails.json"
    },

    db: {},
    activeTab: "species",
    selectedReserve: "ALL",
    searchTerm: "",

    async init() {
      this.bindUI();
      this.initAuth();
      this.initRTDB();
      await this.loadAllJSONs();
    },

    // Resolves JSON data files with relative fallbacks
    async fetchJSON(fileName) {
      const paths = [
        "../../data/" + fileName,
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

    extractArray(payload) {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      const keys = Object.keys(payload);
      for (let i = 0; i < keys.length; i++) {
        const val = payload[keys[i]];
        if (Array.isArray(val)) return val;
      }
      return [];
    },

    async loadAllJSONs() {
      const badge = document.getElementById("recordCount");
      if (badge) badge.textContent = "Loading Data...";

      const keys = Object.keys(this.files);
      const promises = keys.map(k => this.fetchJSON(this.files[k]));
      const results = await Promise.all(promises);

      keys.forEach((k, idx) => {
        this.db[k] = this.extractArray(results[idx]);
      });

      this.render();
    },

    // Dynamic Navigation & Tag-Based Favicon Sync
    initRTDB() {
      try {
        const utmRef = rtdb.ref("/utm_links");
        utmRef.on("value", snapshot => {
          const raw = snapshot.val();
          const badge = document.getElementById("firebaseStatusBadge");
          if (badge) {
            badge.textContent = "RTDB: Live Connected";
            badge.className = "status-pill status-connected";
          }

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

          this.syncSettingsFavicon(items, raw);
          this.renderNav(items);
        });
      } catch (e) {
        console.warn("RTDB offline:", e);
      }
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

    syncSettingsFavicon(items, raw) {
      let settingsImg = "";
      let settingsStamp = "";

      const taggedEntry = items.find(i => i.tag && i.tag.toLowerCase() === "settings");

      if (taggedEntry) {
        settingsImg = taggedEntry.image;
        settingsStamp = taggedEntry.updatedAt;
      } else if (raw.Settings && raw.Settings[0] && raw.Settings[0].image) {
        settingsImg = raw.Settings[0].image;
        settingsStamp = raw.Settings[0].updatedAt;
      } else {
        const titleMatch = items.find(i => i.title.toLowerCase() === "settings");
        if (titleMatch) {
          settingsImg = titleMatch.image;
          settingsStamp = titleMatch.updatedAt;
        }
      }

      if (settingsImg) {
        const favicon = document.getElementById("dynamicFavicon");
        const appleIcon = document.getElementById("dynamicAppleIcon");
        const brandLogo = document.getElementById("navBrandLogo");

        if (favicon) favicon.href = settingsImg;
        if (appleIcon) appleIcon.href = settingsImg;
        if (brandLogo) brandLogo.src = settingsImg;
      }

      if (settingsStamp) {
        const stampEl = document.getElementById("nyBuildTimestamp");
        if (stampEl) stampEl.textContent = settingsStamp;
      }
    },

    renderNav(items) {
      const navList = document.getElementById("navList");
      if (!navList) return;
      navList.innerHTML = "";

      const standaloneLinks = [];
      const folderGroups = {};

      // Strict partition: Bare links vs true groups (No standalone folder created)
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
        topLevelBuckets.push({
          type: "bare_link",
          rank: link.rowNumber,
          data: link
        });
      });

      Object.values(folderGroups).forEach(grp => {
        grp.items.sort((a, b) => a.rowNumber - b.rowNumber);
        topLevelBuckets.push({
          type: "folder",
          rank: grp.minRow,
          data: grp
        });
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
              <span>${grp.name} ▾</span>
            </button>
            ${dropdownHtml}
          `;
        }
        navList.appendChild(li);
      });
    },

    // Authentication Binding
    initAuth() {
      auth.onAuthStateChanged(async user => {
        const modalBtn = document.getElementById("authModalBtn");
        const profileBadge = document.getElementById("userProfile");
        const nameEl = document.getElementById("userDisplayName");
        const avatarEl = document.getElementById("headerUserAvatar");

        if (user) {
          if (modalBtn) modalBtn.classList.add("hidden");
          if (profileBadge) profileBadge.classList.remove("hidden");

          let gamerTag = user.displayName || "Hunter";
          let avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;

          try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().username) gamerTag = doc.data().username;
            if (doc.exists && doc.data().avatar_url) avatarUrl = doc.data().avatar_url;
          } catch (e) {}

          if (nameEl) nameEl.textContent = gamerTag;
          if (avatarEl) avatarEl.src = avatarUrl;
        } else {
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
            if (modal) modal.style.display = "none";
          }).catch(e => alert("Auth Error: " + e.message));
        });
      }

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => auth.signOut());
      }
    },

    // Render Data Viewports
    render() {
      const container = document.getElementById("dataDisplayContainer");
      const title = document.getElementById("currentDisplayTitle");
      const badge = document.getElementById("recordCount");
      if (!container) return;

      container.innerHTML = "";

      if (this.activeTab === "species") {
        if (title) title.textContent = "Animals & Lifecycles";
        this.renderSpecies(container, badge);
      } else if (this.activeTab === "needZones") {
        if (title) title.textContent = "Need Zones & Schedules";
        this.renderNeedZones(container, badge);
      } else if (this.activeTab === "challenges") {
        if (title) title.textContent = "Challenges & Objectives";
        this.renderChallenges(container, badge);
      } else if (this.activeTab === "dogSkills") {
        if (title) title.textContent = "Hunting Dog Skills";
        this.renderDogSkills(container, badge);
      } else if (this.activeTab === "infrastructure") {
        if (title) title.textContent = "Cabins & Fast Travel";
        this.renderInfrastructure(container, badge);
      } else if (this.activeTab === "missions") {
        if (title) title.textContent = "Story Missions & Hunts";
        this.renderMissions(container, badge);
      }
    },

    renderSpecies(container, badge) {
      const list = (this.db.lifecycles && this.db.lifecycles.length) ? this.db.lifecycles : (this.db.species || []);
      const q = this.searchTerm.toLowerCase();
      const res = this.selectedReserve;

      const filtered = list.filter(item => {
        const name = (item.species || item.name || "").toLowerCase();
        const itemReserves = item.reserves || [];
        const matchQ = !q || name.includes(q);
        const matchRes = (res === "ALL") || itemReserves.includes(res);
        return matchQ && matchRes;
      });

      if (badge) badge.textContent = filtered.length + " Animals";

      if (filtered.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1;">No matching animal records found.</p>';
        return;
      }

      filtered.forEach(item => {
        const name = item.species || item.name || "Unknown Animal";
        const maxYears = item.max_age_years || (item.mature_years ? item.mature_years[item.mature_years.length - 1] : "N/A");
        const days = item.total_lifespan_days || (maxYears !== "N/A" ? maxYears * 3 : "N/A");
        const reservesStr = Array.isArray(item.reserves) ? item.reserves.join(", ") : "All Regions";
        const yLen = (item.young_years || [1]).length;
        const aLen = (item.adult_years || [1]).length;
        const mLen = (item.mature_years || [1]).length;

        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + name + '</div>' +
          '<div class="card-meta-row">' +
            '<span>Lifespan: <strong>' + maxYears + ' Yrs</strong> (' + days + ' Days)</span>' +
            '<span class="badge-tag">' + (item.reserves ? item.reserves.length + ' Reserves' : 'General') + '</span>' +
          '</div>' +
          '<div class="life-bar">' +
            '<div class="life-young" style="flex:' + yLen + '"></div>' +
            '<div class="life-adult" style="flex:' + aLen + '"></div>' +
            '<div class="life-mature" style="flex:' + mLen + '"></div>' +
          '</div>' +
          '<div class="advisory-box">' +
            '<strong>Advisory:</strong> ' + (item.cull_advisory || item.mortality_warning || "Target low-fitness mature specimens.") +
          '</div>' +
          '<div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">' +
            '<strong>Reserves:</strong> ' + reservesStr +
          '</div>';
        container.appendChild(card);
      });
    },

    renderNeedZones(container, badge) {
      const list = this.db.needZones || [];
      const q = this.searchTerm.toLowerCase();
      const res = this.selectedReserve;

      const filtered = list.filter(z => {
        const name = (z.species || z.animal || "").toLowerCase();
        const reserve = z.reserve || "";
        return (!q || name.includes(q)) && (res === "ALL" || reserve === res);
      });

      if (badge) badge.textContent = filtered.length + " Need Zones";

      if (filtered.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1;">No need zones found.</p>';
        return;
      }

      filtered.forEach(z => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + (z.species || z.animal) + '</div>' +
          '<div class="card-meta-row">' +
            '<span>Reserve: <strong>' + (z.reserve || "General") + '</strong></span>' +
            '<span class="badge-tag">' + (z.habitat || "Zone") + '</span>' +
          '</div>' +
          '<div class="zone-row">' +
            '<div>💧 <strong>Drink:</strong> ' + (z.drinking_time || z.drink || "N/A") + '</div>' +
            '<div>🌾 <strong>Feed:</strong> ' + (z.feeding_time || z.feed || "N/A") + '</div>' +
            '<div>💤 <strong>Rest:</strong> ' + (z.resting_time || z.rest || "N/A") + '</div>' +
            '<div>🎯 <strong>Tier:</strong> ' + (z.caller_tier || "Level 1-2") + '</div>' +
          '</div>';
        container.appendChild(card);
      });
    },

    renderChallenges(container, badge) {
      const list = this.db.challenges || [];
      const q = this.searchTerm.toLowerCase();

      const filtered = list.filter(c => {
        const title = (c.title || c.name || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        return !q || title.includes(q) || desc.includes(q);
      });

      if (badge) badge.textContent = filtered.length + " Challenges";

      filtered.forEach(c => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + (c.title || c.name) + '</div>' +
          '<p style="font-size:0.85rem; color:var(--text-muted);">' + (c.description || "") + '</p>' +
          '<div class="card-meta-row" style="margin-top:6px;">' +
            '<span>Target: <strong>' + (c.target || c.species || "Any") + '</strong></span>' +
            '<span class="badge-tag">Reward: ' + (c.reward || "XP") + '</span>' +
          '</div>';
        container.appendChild(card);
      });
    },

    renderDogSkills(container, badge) {
      const list = this.db.dogSkills || [];
      if (badge) badge.textContent = list.length + " Dog Skills";

      list.forEach(s => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + (s.name || s.skill) + '</div>' +
          '<div class="card-meta-row">' +
            '<span>Tier: <strong>' + (s.tier || "1") + '</strong></span>' +
            '<span class="badge-tag">' + (s.category || "Skill") + '</span>' +
          '</div>' +
          '<p style="font-size:0.85rem; color:var(--text-muted);">' + (s.description || "") + '</p>';
        container.appendChild(card);
      });
    },

    renderInfrastructure(container, badge) {
      const list = this.db.infrastructure || [];
      const res = this.selectedReserve;

      const filtered = list.filter(item => (res === "ALL" || item.reserve === res));
      if (badge) badge.textContent = filtered.length + " Cabins/Stands";

      filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + item.name + '</div>' +
          '<div class="card-meta-row">' +
            '<span>Reserve: <strong>' + item.reserve + '</strong></span>' +
            '<span class="badge-tag">' + (item.type || "Cabin") + '</span>' +
          '</div>' +
          '<p style="font-size:0.85rem; color:var(--text-muted);">Location: ' + (item.location || "General Map") + '</p>';
        container.appendChild(card);
      });
    },

    renderMissions(container, badge) {
      const list = this.db.missions || [];
      if (badge) badge.textContent = list.length + " Missions";

      list.forEach(m => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = 
          '<div class="card-title">' + (m.title || m.name) + '</div>' +
          '<div class="card-meta-row">' +
            '<span>Client: <strong>' + (m.client || "Story") + '</strong></span>' +
            '<span class="badge-tag">' + (m.reward || "Objective") + '</span>' +
          '</div>' +
          '<p style="font-size:0.85rem; color:var(--text-muted);">' + (m.description || "") + '</p>';
        container.appendChild(card);
      });
    },

    bindUI() {
      const catSelect = document.getElementById("categorySelect");
      const resSelect = document.getElementById("reserveSelect");
      const searchBox = document.getElementById("globalSearch");

      if (catSelect) {
        catSelect.addEventListener("change", (e) => {
          this.activeTab = e.target.value;
          this.render();
        });
      }

      if (resSelect) {
        resSelect.addEventListener("change", (e) => {
          this.selectedReserve = e.target.value;
          this.render();
        });
      }

      if (searchBox) {
        searchBox.addEventListener("input", (e) => {
          this.searchTerm = e.target.value.trim();
          this.render();
        });
      }

      const modal = document.getElementById("authModal");
      const openBtn = document.getElementById("authModalBtn");
      const closeBtn = document.getElementById("authModalClose");

      if (openBtn && modal) {
        openBtn.addEventListener("click", () => modal.style.display = "flex");
      }
      if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => modal.style.display = "none");
      }

      const menuToggle = document.getElementById("menuToggle");
      const dynamicNav = document.getElementById("dynamicNav");
      if (menuToggle && dynamicNav) {
        menuToggle.addEventListener("click", () => dynamicNav.classList.toggle("open"));
      }
    }
  };

  App.init();
});
