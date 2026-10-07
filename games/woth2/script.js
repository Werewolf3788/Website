// Line 1: Way of the Hunter Master Data Controller
// [Smart Cache-Buster Time: 2026-10-07 13:21 EDT | Firebase Sync Target: /utm_links | Version: 2.9.4]

document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // Exact file targets in /Website/data/
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
      this.initRTDB();
      await this.loadAllJSONs();
    },

    // Line 36: Resolves relative paths or live site root
    async fetchJSON(fileName) {
      const paths = [
        "../../data/" + fileName,
        "/Website/data/" + fileName,
        "//werewolf3788.github.io/Website/data/" + fileName
      ];

      for (let i = 0; i < paths.length; i++) {
        try {
          const res = await fetch(paths[i] + "?v=" + Date.now());
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          // Continue to next path
        }
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
    },

    initRTDB() {
      try {
        if (typeof firebase !== "undefined" && firebase.database) {
          const rtdb = firebase.database();
          rtdb.ref("/utm_links").on("value", snap => {
            const data = snap.val();
            if (data) this.renderNav(data);
          });
        }
      } catch (e) {
        console.warn("RTDB offline:", e);
      }
    },

    renderNav(data) {
      const list = document.getElementById("navList");
      if (!list || !data) return;
      list.innerHTML = "";

      const groups = {};
      const standalone = [];

      Object.entries(data).forEach(([k, v]) => {
        if (v.group && v.group.trim()) {
          const g = v.group.trim();
          if (!groups[g]) groups[g] = [];
          groups[g].push({ k, ...v });
        } else {
          standalone.push({ k, ...v });
        }
      });

      Object.entries(groups).forEach(([name, items]) => {
        const li = document.createElement("li");
        li.className = "nav-item";
        
        let innerLinks = "";
        items.forEach(i => {
          innerLinks += '<a class="dropdown-item" href="' + (i.url || '#') + '">' + (i.title || i.k) + '</a>';
        });

        li.innerHTML = 
          '<button class="dropdown-trigger">' + name + ' ▾</button>' +
          '<div class="dropdown-menu">' + innerLinks + '</div>';
        list.appendChild(li);
      });

      standalone.forEach(i => {
        const li = document.createElement("li");
        li.className = "nav-item";
        li.innerHTML = '<a class="nav-link" href="' + (i.url || '#') + '">' + (i.title || i.k) + '</a>';
        list.appendChild(li);
      });
    }
  };

  App.init();
});
