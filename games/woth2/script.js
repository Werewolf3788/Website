// Line 1: Way of the Hunter Master Data Controller with Offline/Local Fallback
// [Smart Cache-Buster Time: 2026-10-07 13:10 EDT | Firebase Sync Target: /utm_links | Version: 2.9.0]

document.addEventListener("DOMContentLoaded", () => {
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

    // Embedded Master Animals Fallback (Loads instantly if local file:/// blocks fetch)
    fallbackSpecies: [
      {
        species: "Rocky Mountain Mule Deer",
        max_age_years: 12,
        total_lifespan_days: 36,
        young_years: [1, 2, 3],
        adult_years: [4, 5, 6, 7, 8],
        mature_years: [9, 10, 11, 12],
        reserves: ["Nez Perce Valley"],
        cull_advisory: "Do not harvest in Young stage (1-3 yrs) unless rack is heavily deformed. Harvest 1-2 star Mature before year 12.",
        mortality_warning: "5-Star potential locks in Mature stage. Dies of old age at 36 in-game days."
      },
      {
        species: "Northwestern White-Tailed Deer",
        max_age_years: 10,
        total_lifespan_days: 30,
        young_years: [1, 2],
        adult_years: [3, 4, 5, 6, 7],
        mature_years: [8, 9, 10],
        reserves: ["Nez Perce Valley", "Matariki Park"],
        cull_advisory: "Allow 80%+ fitness bucks to reach Mature stage (8-10 yrs) for 5-star trophy rack spread.",
        mortality_warning: "Trophy antlers peak in Mature Years 9-10. Must be harvested before Year 11 turnover."
      },
      {
        species: "Rocky Mountain Elk",
        max_age_years: 15,
        total_lifespan_days: 45,
        young_years: [1, 2, 3, 4],
        adult_years: [5, 6, 7, 8, 9, 10],
        mature_years: [11, 12, 13, 14, 15],
        reserves: ["Nez Perce Valley", "Matariki Park"],
        cull_advisory: "Pass on spike bulls. Target low-mass mature bulls with uneven main beams.",
        mortality_warning: "Bulls reach maximum 5-star beam spread at Year 13-14. Despawns after Year 15."
      },
      {
        species: "Western Moose",
        max_age_years: 16,
        total_lifespan_days: 48,
        young_years: [1, 2, 3, 4],
        adult_years: [5, 6, 7, 8, 9, 10, 11],
        mature_years: [12, 13, 14, 15, 16],
        reserves: ["Nez Perce Valley"],
        cull_advisory: "Moose paddle width and point count peak at year 13-15.",
        mortality_warning: "Highest trophy paddle weight is achieved in late Mature stage before old age death."
      },
      {
        species: "Gray Wolf",
        max_age_years: 8,
        total_lifespan_days: 24,
        young_years: [1, 2],
        adult_years: [3, 4, 5],
        mature_years: [6, 7, 8],
        reserves: ["Nez Perce Valley", "Transylvania", "Aurora Shores", "Lintukoto Reserve", "Elkcrest Island"],
        cull_advisory: "High mortality rate; cull pack leaders with sub-60% fitness.",
        mortality_warning: "Alpha status shifts at Year 8 death. Despawns permanently after 24 in-game days."
      },
      {
        species: "Brown Bear",
        max_age_years: 25,
        total_lifespan_days: 75,
        young_years: [1, 2, 3, 4, 5],
        adult_years: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        mature_years: [17, 18, 19, 20, 21, 22, 23, 24, 25],
        reserves: ["Transylvania", "Lintukoto Reserve"],
        cull_advisory: "Skull volume reaches maximum potential late in the Mature phase (22-25 yrs).",
        mortality_warning: "Generational recovery takes over 70 in-game days; cull carefully."
      },
      {
        species: "Wild Boar",
        max_age_years: 11,
        total_lifespan_days: 33,
        young_years: [1, 2, 3],
        adult_years: [4, 5, 6, 7],
        mature_years: [8, 9, 10, 11],
        reserves: ["Transylvania", "Matariki Park", "Lintukoto Reserve"],
        cull_advisory: "Tusk length scales with mature boar skull size. Cull 1-star adults to keep herd genetics high.",
        mortality_warning: "Tusks reach max trophy score in Mature Year 11. Dies if unhunted."
      },
      {
        species: "American Badger",
        max_age_years: 8,
        total_lifespan_days: 24,
        young_years: [1, 2],
        adult_years: [3, 4, 5],
        mature_years: [6, 7, 8],
        reserves: ["Nez Perce Valley"],
        cull_advisory: "Target 1-star matures around burrows to elevate sett fitness.",
        mortality_warning: "Natural mortality occurs after Year 8."
      }
    ],

    db: {},
    activeTab: "species",
    selectedReserve: "ALL",
    searchTerm: "",

    async init() {
      this.bindUI();
      this.initRTDB();
      await this.loadAllJSONs();
    },

    async fetchJSON(fileName) {
      const paths = [
        `../../data/${fileName}`,
        `/Website/data/${fileName}`,
        `//werewolf3788.github.io/Website/data/${fileName}`
      ];

      for (const p of paths) {
        try {
          const res = await fetch(`${p}?v=${Date.now()}`);
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          // If running locally as file:///, fetch fails silently to fallback
        }
      }
      return null;
    },

    extractArray(payload) {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      for (const key of Object.keys(payload)) {
        if (Array.isArray(payload[key])) return payload[key];
      }
      return [];
    },

    async loadAllJSONs() {
      const badge = document.getElementById("recordCount");
      if (badge) badge.textContent = "Loading Data...";

      const keys = Object.keys(this.files);
      const promises = keys.map(k => this.fetchJSON(this.files[k]));
      const results = await Promise.all(promises);

      let fetchedCount = 0;
      keys.forEach((k, idx) => {
        const arr = this.extractArray(results[idx]);
        this.db[k] = arr;
        if (arr.length > 0) fetchedCount += arr.length;
      });

      // If local file:/// blocked all fetches, load the fallback animals immediately
      if ((!this.db.lifecycles || this.db.lifecycles.length === 0) && (!this.db.species || this.db.species.length === 0)) {
        console.warn("Local fetch blocked by file:/// protocol. Rendering fallback master dataset.");
        this.db.lifecycles = this.fallbackSpecies;
      }

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

      if (badge) badge.textContent = `${filtered.length} Animals`;

      if (filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">No matching animal records found.</p>`;
        return;
      }

      filtered.forEach(item => {
        const name = item.species || item.name || "Unknown Animal";
        const maxYears = item.max_age_years || (item.mature_years ? item.mature_years[item.mature_years.length - 1] : "N/A");
        const days = item.total_lifespan_days || (maxYears !== "N/A" ? maxYears * 3 : "N/A");
        const reservesStr = Array.isArray(item.reserves) ? item.reserves.join(", ") : "All Regions";

        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${name}</div>
          <div class="card-meta-row">
            <span>Lifespan: <strong>${maxYears} Yrs</strong> (${days} Days)</span>
            <span class="badge-tag">${item.reserves ? item.reserves.length + ' Reserves' : 'General'}</span>
          </div>
          <div class="life-bar">
            <div class="life-young" style="flex: ${(item.young_years || [1]).length}"></div>
            <div class="life-adult" style="flex: ${(item.adult_years || [1]).length}"></div>
            <div class="life-mature" style="flex: ${(item.mature_years || [1]).length}"></div>
          </div>
          <div class="advisory-box">
            <strong>Advisory:</strong> ${item.cull_advisory || item.mortality_warning || "Target low-fitness mature specimens."}
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
            <strong>Reserves:</strong> ${reservesStr}
          </div>
        `;
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

      if (badge) badge.textContent = `${filtered.length} Need Zones`;

      if (filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">No need zones loaded yet. Run on Live Server to read woth2_need_zones.json.</p>`;
        return;
      }

      filtered.forEach(z => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${z.species || z.animal}</div>
          <div class="card-meta-row">
            <span>Reserve: <strong>${z.reserve || "General"}</strong></span>
            <span class="badge-tag">${z.habitat || "Zone"}</span>
          </div>
          <div class="zone-row">
            <div>💧 <strong>Drink:</strong> ${z.drinking_time || z.drink || "N/A"}</div>
            <div>🌾 <strong>Feed:</strong> ${z.feeding_time || z.feed || "N/A"}</div>
            <div>💤 <strong>Rest:</strong> ${z.resting_time || z.rest || "N/A"}</div>
            <div>🎯 <strong>Tier:</strong> ${z.caller_tier || "Level 1-2"}</div>
          </div>
        `;
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

      if (badge) badge.textContent = `${filtered.length} Challenges`;

      filtered.forEach(c => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${c.title || c.name}</div>
          <p style="font-size:0.85rem; color:var(--text-muted);">${c.description || ""}</p>
          <div class="card-meta-row" style="margin-top:6px;">
            <span>Target: <strong>${c.target || c.species || "Any"}</strong></span>
            <span class="badge-tag">Reward: ${c.reward || "XP"}</span>
          </div>
        `;
        container.appendChild(card);
      });
    },

    renderDogSkills(container, badge) {
      const list = this.db.dogSkills || [];
      if (badge) badge.textContent = `${list.length} Dog Skills`;

      list.forEach(s => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${s.name || s.skill}</div>
          <div class="card-meta-row">
            <span>Tier: <strong>${s.tier || "1"}</strong></span>
            <span class="badge-tag">${s.category || "Skill"}</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">${s.description || ""}</p>
        `;
        container.appendChild(card);
      });
    },

    renderInfrastructure(container, badge) {
      const list = this.db.infrastructure || [];
      const res = this.selectedReserve;

      const filtered = list.filter(item => (res === "ALL" || item.reserve === res));
      if (badge) badge.textContent = `${filtered.length} Cabins/Stands`;

      filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${item.name}</div>
          <div class="card-meta-row">
            <span>Reserve: <strong>${item.reserve}</strong></span>
            <span class="badge-tag">${item.type || "Cabin"}</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">Location: ${item.location || "General Map"}</p>
        `;
        container.appendChild(card);
      });
    },

    renderMissions(container, badge) {
      const list = this.db.missions || [];
      if (badge) badge.textContent = `${list.length} Missions`;

      list.forEach(m => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <div class="card-title">${m.title || m.name}</div>
          <div class="card-meta-row">
            <span>Client: <strong>${m.client || "Story"}</strong></span>
            <span class="badge-tag">${m.reward || "Objective"}</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">${m.description || ""}</p>
        `;
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
        li.innerHTML = `
          <button class="dropdown-trigger">${name} ▾</button>
          <div class="dropdown-menu">
            ${items.map(i => `<a class="dropdown-item" href="${i.url \vert{}\vert{} '#'}">${i.title || i.k}</a>`).join('')}
          </div>
        `;
        list.appendChild(li);
      });

      standalone.forEach(i => {
        const li = document.createElement("li");
        li.className = "nav-item";
        li.innerHTML = `<a class="nav-link" href="${i.url || '#'}">${i.title || i.k}</a>`;
        list.appendChild(li);
      });
    }
  };

  App.init();
});
