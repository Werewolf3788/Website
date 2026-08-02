/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands JSON-Driven Firestore Engine
   Target Path: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
   ============================================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

const GAME_ID = 'T.C.G.R.Wildlands';
const RAW_JSON_URL = 'https://raw.githubusercontent.com/Werewolf3788/Website/main/json/TCGRWildlands.json';

const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const DEFAULT_BLANK_STATS = {
    level: "--", playstyle: "--", avgDist: "--", tactical: 0, stealth: 0,
    lifetime: "--", longestShot: "--", precision: 0, favWeapon: "--", favWeapon2: "--"
};

const appState = {
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: localStorage.getItem('active_gaming_platform') || 'pc',
    activeCategory: 'WEAPON',
    jsonWeaponClasses: null,
    jsonSkillsBlueprint: null,
    hunterSkillsData: {},
    statsData: JSON.parse(JSON.stringify(DEFAULT_BLANK_STATS)),
    auth: null, db: null, masterUnsub: null,

    init: async function() {
        this.setupControlDropdowns();
        this.setupFormControls();

        // 1. Fetch JSON Blueprint File
        await this.fetchGitHubJSON();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-Direct-Sync');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            signInAnonymously(this.auth).catch(err => console.error("Auth Error:", err));

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.loadOperator(this.activeHunter, this.activePlatform);
                }
            });
        } catch (err) {
            console.error("Initialization Failure:", err);
            this.render();
        }
    },

    fetchGitHubJSON: async function() {
        try {
            const res = await fetch(`${RAW_JSON_URL}?v=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                this.jsonWeaponClasses = data.WILDLANDS_WEAPON_CLASSES || null;
                this.jsonSkillsBlueprint = data.BASELINE_SKILLS_BLUEPRINT || null;

                this.populateWeaponSelects();
                this.buildCategoryTabs();
                this.initializeBlankSkillsFromBlueprint();
            }
        } catch (e) {
            console.warn("Notice: Fetching raw JSON delayed.", e.message);
        }
    },

    populateWeaponSelects: function() {
        const fav1 = document.getElementById("editFav1");
        const fav2 = document.getElementById("editFav2");
        if (!fav1 || !fav2 || !this.jsonWeaponClasses) return;

        fav1.innerHTML = ""; fav2.innerHTML = "";

        Object.keys(this.jsonWeaponClasses).forEach(category => {
            const group1 = document.createElement("optgroup");
            group1.label = category;
            const group2 = document.createElement("optgroup");
            group2.label = category;

            this.jsonWeaponClasses[category].forEach(weapon => {
                group1.appendChild(new Option(weapon, weapon));
                group2.appendChild(new Option(weapon, weapon));
            });

            fav1.appendChild(group1);
            fav2.appendChild(group2);
        });
    },

    buildCategoryTabs: function() {
        const tabsContainer = document.getElementById("skillsCategoryTabs");
        if (!tabsContainer || !this.jsonSkillsBlueprint) return;

        tabsContainer.innerHTML = "";
        const categories = Object.keys(this.jsonSkillsBlueprint);

        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = `tab-link ${cat === this.activeCategory ? 'active' : ''}`;
            btn.innerText = cat;
            btn.addEventListener("click", () => {
                this.activeCategory = cat;
                document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.render();
            });
            tabsContainer.appendChild(btn);
        });
    },

    initializeBlankSkillsFromBlueprint: function() {
        if (!this.jsonSkillsBlueprint) return;

        this.hunterSkillsData = {};
        Object.keys(this.jsonSkillsBlueprint).forEach(cat => {
            this.hunterSkillsData[cat] = this.jsonSkillsBlueprint[cat].map(item => ({
                ...item,
                current: 0,
                collected: false
            }));
        });
    },

    setupControlDropdowns: function() {
        const userSelector = document.getElementById("userSelect");
        if (userSelector) {
            userSelector.value = this.activeHunter;
            userSelector.addEventListener("change", (e) => {
                this.switchOperator(e.target.value, this.activePlatform);
            });
        }

        const platformSelector = document.getElementById("platformSelect");
        if (platformSelector) {
            platformSelector.value = this.activePlatform;
            platformSelector.addEventListener("change", (e) => {
                this.switchOperator(this.activeHunter, e.target.value);
            });
        }
    },

    setupFormControls: function() {
        const toggleBtn = document.getElementById("toggleEditStats");
        const editPanel = document.getElementById("editStatsPanel");
        if (toggleBtn && editPanel) {
            toggleBtn.addEventListener("click", () => editPanel.classList.toggle("hidden"));
        }

        const saveBtn = document.getElementById("saveStatsBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

                this.statsData = {
                    level: parseInt(getVal("editTierLevel")) || "--",
                    playstyle: getVal("editPlaystyle") || "--",
                    avgDist: getVal("editAvgDist") || "--",
                    tactical: parseInt(getVal("editTactical")) || 0,
                    stealth: parseInt(getVal("editStealth")) || 0,
                    lifetime: getVal("editLifetime") || "--",
                    longestShot: getVal("editLongest") || "--",
                    precision: parseInt(getVal("editPrecision")) || 0,
                    favWeapon: getVal("editFav1") || "--",
                    favWeapon2: getVal("editFav2") || "--"
                };

                this.sync();
                if (editPanel) editPanel.classList.add("hidden");
            });
        }
    },

    loadOperator: function(userName, platform) {
        if (!this.auth || !this.auth.currentUser) return;

        const dbDocName = USER_DATA_MAP[userName] || userName;
        this.activeHunter = dbDocName;
        this.activePlatform = platform.toLowerCase();

        localStorage.setItem('active_gaming_nickname', dbDocName);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        if (this.masterUnsub) this.masterUnsub();

        // TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
        const docRef = doc(this.db, 'users', dbDocName, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.skills) this.hunterSkillsData = data.skills;
                if (data.stats) this.statsData = data.stats;
            } else {
                // Initialize clean uncompleted dataset on first load
                this.initializeBlankSkillsFromBlueprint();
                this.statsData = JSON.parse(JSON.stringify(DEFAULT_BLANK_STATS));
                this.sync();
            }
            this.render();
            this.updateStatsUI();
        }, (err) => {
            console.error("Firestore Read Error:", err);
            this.render();
        });
    },

    switchOperator: function(userName, platform) {
        this.loadOperator(userName, platform);
    },

    render: function() {
        const container = document.getElementById('section-container');
        if (!container) return;

        container.innerHTML = '';

        const currentCategorySkills = this.hunterSkillsData[this.activeCategory] || [];

        if (currentCategorySkills.length === 0) {
            container.innerHTML = `<div style="color:#8a99ad; text-align:center; padding:20px;">No skill items available under '${this.activeCategory}'.</div>`;
            return;
        }

        currentCategorySkills.forEach((skill, index) => {
            const currentRank = skill.current || 0;
            const maxRank = skill.max || 1;
            const isMaxed = currentRank === maxRank;

            const card = document.createElement("div");
            card.className = `skill-card unlocked ${isMaxed ? 'maxed' : ''} ${skill.isEpic ? 'epic-card' : ''}`;
            card.style.cssText = "background:#121820; border:1px solid #1c2430; padding:12px; border-radius:6px; margin-bottom:10px;";

            card.innerHTML = `
                <div class="card-top-action">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name}</h4>
                        ${skill.isEpic ? '<span style="color:#ffcc00; font-size:10px; font-weight:bold; border:1px solid #ffcc00; padding:1px 4px; border-radius:2px;">EPIC</span>' : ''}
                    </div>
                    <p style="font-size:11px; color:#8a99ad; margin:6px 0;">${skill.desc || ''}</p>
                    <div class="skill-meta-row" style="margin-top:8px;">
                        <div class="skill-rank-indicators" style="display:flex; gap:4px;">
                            ${Array.from({ length: maxRank }).map((_, rIdx) => `
                                <div class="rank-dot ${rIdx < currentRank ? 'active' : ''}" style="width:14px; height:6px; background:${rIdx < currentRank ? '#0076a8' : '#3d4f68'}; border-radius:1px;"></div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="card-bottom-action" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:#8a99ad;">Rank: ${currentRank}/${maxRank}</span>
                    <button class="medal-toggle-btn ${skill.collected ? 'medal-earned' : ''}" 
                            style="background:${skill.collected ? '#28a745' : '#161d26'}; color:#fff; border:1px solid ${skill.collected ? '#28a745' : '#3d4f68'}; padding:4px 10px; border-radius:4px; cursor:pointer; font-weight:bold;"
                            onclick="appState.mutateSkill('${this.activeCategory}', ${index}, ${currentRank}, ${maxRank}, ${!!skill.collected})">
                        ${skill.collected ? '✓ Maxed' : '⭐ Rank Up'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    updateStatsUI: function() {
        const data = this.statsData;
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val !== undefined ? val : "--";
        };

        setTxt("operatorName", this.activeHunter);
        setTxt("tierLevel", data.level);
        setTxt("playstyleType", data.playstyle);
        setTxt("avgKillDist", data.avgDist);
        setTxt("tacticalValue", (data.tactical || 0) + "%");
        setTxt("stealthValue", (data.stealth || 0) + "%");
        setTxt("statLifetime", data.lifetime);
        setTxt("longestShot", data.longestShot);
        setTxt("precisionValue", (data.precision || 0) + "%");
        setTxt("favWeapon", data.favWeapon);
        setTxt("favWeapon2", data.favWeapon2);

        const tacBar = document.getElementById("tacticalBar");
        if (tacBar) tacBar.style.width = `${data.tactical || 0}%`;
        const stBar = document.getElementById("stealthBar");
        if (stBar) stBar.style.width = `${data.stealth || 0}%`;
        const prBar = document.getElementById("precisionBar");
        if (prBar) prBar.style.width = `${data.precision || 0}%`;
    },

    mutateSkill: function(category, index, currentRank, maxRank, isCollected) {
        let nextRank = currentRank + 1;
        let nextCollected = isCollected;

        if (nextRank > maxRank) {
            nextRank = 0;
            nextCollected = !isCollected;
        } else if (nextRank === maxRank) {
            nextCollected = true;
        }

        if (this.hunterSkillsData[category] && this.hunterSkillsData[category][index]) {
            this.hunterSkillsData[category][index].current = nextRank;
            this.hunterSkillsData[category][index].collected = nextCollected;
            this.sync();
        }
    },

    sync: async function() {
        this.render();
        this.updateStatsUI();

        if (!this.db || !this.auth || !this.auth.currentUser) return;

        try {
            // TARGET DOC: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
            const ref = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);
            
            const payload = {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                skills: this.hunterSkillsData,
                stats: this.statsData,
                lastUpdate: Date.now()
            };

            await setDoc(ref, payload, { merge: true });
            console.log(`✓ Firestore updated at: /users/${this.activeHunter}/platform/${this.activePlatform}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("FIRESTORE SAVE ERROR:", error);
        }
    }
};

window.appState = appState;
appState.init();
