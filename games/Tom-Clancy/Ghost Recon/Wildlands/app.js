/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Pure Firestore Engine
   Database: Cloud Firestore (entertainment-71888)
   Target Firestore Path: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
   ============================================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c"
};

const GAME_ID = 'T.C.G.R.Wildlands';
const RAW_JSON_URL = 'https://raw.githubusercontent.com/Werewolf3788/Website/main/json/TCGRWildlands.json';

const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const BLANK_STATS = {
    tierActive: "off",
    level: "--",
    playstyle: "--",
    avgDist: "--",
    tactical: "--",
    stealth: "--",
    lifetime: "--",
    longestShot: "--",
    precision: "--",
    favWeapon: "--",
    favWeapon2: "--",
    revives: "--",
    explosiveKills: "--",
    droneTime: "--",
    airTravel: "--",
    groundTravel: "--",
    paraTravel: "--",
    mapDisc: "--"
};

const appState = {
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: localStorage.getItem('active_gaming_platform') || 'pc',
    activeCategory: 'WEAPON',
    jsonWeaponClasses: null,
    jsonSkillsBlueprint: null,
    hunterSkillsData: {},
    statsData: JSON.parse(JSON.stringify(BLANK_STATS)),
    auth: null,
    db: null,
    masterUnsub: null,

    init: async function() {
        this.setupControlDropdowns();
        this.setupFormControls();

        await this.fetchGitHubJSON();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-Firestore-Direct');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.setStatus(`✓ Connected to Firestore [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
                    this.loadOperator(this.activeHunter, this.activePlatform);
                } else {
                    this.setStatus("❌ Auth Failed", "#ef4444");
                }
            });
        } catch (err) {
            console.error("Firestore Init Error:", err);
            this.setStatus(`❌ Connection Error: ${err.message}`, "#ef4444");
            this.render();
        }
    },

    setStatus: function(msg, color) {
        const el = document.getElementById("syncStatus");
        if (el) {
            el.innerText = msg;
            if (color) el.style.borderColor = color;
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
            console.warn("JSON fetch delayed.", e.message);
        }
    },

    populateWeaponSelects: function() {
        const fav1 = document.getElementById("editFav1");
        const fav2 = document.getElementById("editFav2");
        if (!fav1 || !fav2 || !this.jsonWeaponClasses) return;

        fav1.innerHTML = '<option value="--">-- Select Weapon --</option>';
        fav2.innerHTML = '<option value="--">-- Select Weapon --</option>';

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
                medalEarned: false
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

    populateFormWithCurrentData: function() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = (val && val !== "--") ? val : "";
        };

        const tierActiveSel = document.getElementById("editTierActive");
        if (tierActiveSel) tierActiveSel.value = this.statsData.tierActive || "off";

        setVal("editTierLevel", this.statsData.level);
        setVal("editPlaystyle", this.statsData.playstyle);
        setVal("editAvgDist", this.statsData.avgDist);
        setVal("editTactical", this.statsData.tactical);
        setVal("editStealth", this.statsData.stealth);
        setVal("editLifetime", this.statsData.lifetime);
        setVal("editLongest", this.statsData.longestShot);
        setVal("editPrecision", this.statsData.precision);
        setVal("editFav1", this.statsData.favWeapon);
        setVal("editFav2", this.statsData.favWeapon2);
        setVal("editRevives", this.statsData.revives);
        setVal("editExplosiveKills", this.statsData.explosiveKills);
        setVal("editDroneTime", this.statsData.droneTime);
        setVal("editAir", this.statsData.airTravel);
        setVal("editGround", this.statsData.groundTravel);
        setVal("editPara", this.statsData.paraTravel);
        setVal("editMap", this.statsData.mapDisc);
    },

    setupFormControls: function() {
        const toggleBtn = document.getElementById("toggleEditStats");
        const editPanel = document.getElementById("editStatsPanel");
        if (toggleBtn && editPanel) {
            toggleBtn.addEventListener("click", () => {
                editPanel.classList.toggle("hidden");
                if (!editPanel.classList.contains("hidden")) {
                    this.populateFormWithCurrentData();
                }
            });
        }

        const saveBtn = document.getElementById("saveStatsBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const getVal = (id) => {
                    const el = document.getElementById(id);
                    return el && el.value.trim() !== "" ? el.value.trim() : "--";
                };

                const tierActive = document.getElementById("editTierActive") ? document.getElementById("editTierActive").value : "off";

                this.statsData = {
                    tierActive: tierActive,
                    level: getVal("editTierLevel"),
                    playstyle: getVal("editPlaystyle"),
                    avgDist: getVal("editAvgDist"),
                    tactical: getVal("editTactical"),
                    stealth: getVal("editStealth"),
                    lifetime: getVal("editLifetime"),
                    longestShot: getVal("editLongest"),
                    precision: getVal("editPrecision"),
                    favWeapon: getVal("editFav1"),
                    favWeapon2: getVal("editFav2"),
                    revives: getVal("editRevives"),
                    explosiveKills: getVal("editExplosiveKills"),
                    droneTime: getVal("editDroneTime"),
                    airTravel: getVal("editAir"),
                    groundTravel: getVal("editGround"),
                    paraTravel: getVal("editPara"),
                    mapDisc: getVal("editMap")
                };

                this.sync();
                if (editPanel) editPanel.classList.add("hidden");
            });
        }

        const clearBtn = document.getElementById("clearStatsBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                this.statsData = JSON.parse(JSON.stringify(BLANK_STATS));
                this.initializeBlankSkillsFromBlueprint();
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

        // STRICT PLATFORM ISOLATION: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
        const docRef = doc(this.db, 'users', dbDocName, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.skills) this.hunterSkillsData = data.skills;
                if (data.stats) this.statsData = data.stats;
                this.setStatus(`✓ Loaded Cloud Data for ${dbDocName} [${this.activePlatform.toUpperCase()}]`, "#10b981");
            } else {
                // If doc doesn't exist for this platform, start 100% blank
                this.initializeBlankSkillsFromBlueprint();
                this.statsData = JSON.parse(JSON.stringify(BLANK_STATS));
                this.setStatus(`⚠️ No Saved Cloud Data for ${dbDocName} [${this.activePlatform.toUpperCase()}]`, "#ff8800");
            }
            this.render();
            this.updateStatsUI();
        }, (err) => {
            console.error("Firestore Listen Error:", err);
            this.setStatus(`❌ Read Error: ${err.message}`, "#ef4444");
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
            container.innerHTML = `<div style="color:#8a99ad; text-align:center; padding:20px;">No items available.</div>`;
            return;
        }

        currentCategorySkills.forEach((skill, index) => {
            const currentRank = skill.current || 0;
            const maxRank = skill.max || 1;
            const isMaxed = currentRank === maxRank;
            const medalEarned = !!skill.medalEarned;

            const card = document.createElement("div");
            card.className = `skill-card ${isMaxed ? 'maxed' : ''} ${skill.isEpic ? 'epic-card' : ''}`;
            card.style.cssText = "background:#121820; border:1px solid #1c2430; padding:12px; border-radius:6px; margin-bottom:12px;";

            card.innerHTML = `
                <div class="card-top-action">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name}</h4>
                        ${skill.isEpic ? '<span style="color:#ffcc00; font-size:10px; font-weight:bold; border:1px solid #ffcc00; padding:1px 4px; border-radius:2px;">EPIC</span>' : ''}
                    </div>
                    <p style="font-size:11px; color:#8a99ad; margin:6px 0;">${skill.desc || ''}</p>
                    
                    <div class="skill-meta-row" style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="font-size:10px; color:#8a99ad; text-transform:uppercase; font-weight:bold;">Skill Rank (${currentRank}/${maxRank})</span>
                            <div class="skill-rank-indicators" style="display:flex; gap:4px;">
                                ${Array.from({ length: maxRank }).map((_, rIdx) => `
                                    <div class="rank-dot" style="width:14px; height:6px; background:${rIdx < currentRank ? (isMaxed ? '#28a745' : '#0076a8') : '#3d4f68'}; border-radius:1px;"></div>
                                `).join('')}
                            </div>
                        </div>

                        ${skill.hasMedal ? `
                            <div style="text-align:right;">
                                <span style="font-size:10px; color:#8a99ad; text-transform:uppercase; font-weight:bold; display:block;">Bonus Medal</span>
                                <span style="font-size:11px; font-weight:bold; color:${medalEarned ? '#ffcc00' : '#4a5568'};">
                                    ${medalEarned ? '🏅 Acquired' : '🔒 Missing'}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="card-bottom-action" style="margin-top:12px; padding-top:10px; border-top:1px solid #1c2430; display:flex; justify-content:space-between; gap:8px;">
                    <button style="flex:1; background:${isMaxed ? '#112417' : '#161d26'}; color:${isMaxed ? '#28a745' : '#fff'}; border:1px solid ${isMaxed ? '#28a745' : '#3d4f68'}; padding:6px 8px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;"
                            onclick="appState.mutateSkillRank('${this.activeCategory}', ${index}, ${currentRank}, ${maxRank})">
                        ${isMaxed ? '✓ Skill Maxed' : '⭐ Rank Up'}
                    </button>

                    ${skill.hasMedal ? `
                        <button style="flex:1; background:${medalEarned ? '#242415' : '#161d26'}; color:${medalEarned ? '#ffcc00' : '#8a99ad'}; border:1px solid ${medalEarned ? '#ffcc00' : '#3d4f68'}; padding:6px 8px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;"
                                onclick="appState.toggleBonusMedal('${this.activeCategory}', ${index})">
                            ${medalEarned ? '🏅 Medal Found' : '🏅 Claim Medal'}
                        </button>
                    ` : ''}
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

        const tierValEl = document.getElementById("tierLevel");
        const tierBadgeContainer = document.getElementById("tierContainer");
        
        if (tierValEl && tierBadgeContainer) {
            if (data.tierActive === "on") {
                tierValEl.innerText = (data.level && data.level !== "--") ? data.level : "1";
                tierBadgeContainer.style.backgroundColor = "#e67e22";
                tierBadgeContainer.style.opacity = "1";
            } else {
                tierValEl.innerText = "OFF";
                tierBadgeContainer.style.backgroundColor = "#2c3a4e";
                tierBadgeContainer.style.opacity = "0.7";
            }
        }

        setTxt("operatorName", this.activeHunter);
        setTxt("playstyleType", data.playstyle);
        setTxt("avgKillDist", data.avgDist);
        setTxt("tacticalValue", data.tactical);
        setTxt("stealthValue", data.stealth);
        setTxt("statLifetime", data.lifetime);
        setTxt("longestShot", data.longestShot);
        setTxt("precisionValue", data.precision);
        setTxt("favWeapon", data.favWeapon);
        setTxt("favWeapon2", data.favWeapon2);
        setTxt("statRevives", data.revives);
        setTxt("statExplosiveKills", data.explosiveKills);
        setTxt("statDroneTime", data.droneTime);
        setTxt("statAir", data.airTravel);
        setTxt("statGround", data.groundTravel);
        setTxt("statPara", data.paraTravel);
        setTxt("statMap", data.mapDisc);
    },

    mutateSkillRank: function(category, index, currentRank, maxRank) {
        let nextRank = currentRank + 1;
        if (nextRank > maxRank) nextRank = 0;

        if (this.hunterSkillsData[category] && this.hunterSkillsData[category][index]) {
            this.hunterSkillsData[category][index].current = nextRank;
            this.sync();
        }
    },

    toggleBonusMedal: function(category, index) {
        if (this.hunterSkillsData[category] && this.hunterSkillsData[category][index]) {
            const currentState = !!this.hunterSkillsData[category][index].medalEarned;
            this.hunterSkillsData[category][index].medalEarned = !currentState;
            this.sync();
        }
    },

    sync: async function() {
        this.render();
        this.updateStatsUI();

        if (!this.db || !this.auth || !this.auth.currentUser) return;

        this.setStatus("⏳ Saving to Cloud Firestore...", "#e67e22");

        try {
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
            const timeStr = new Date().toLocaleTimeString();
            this.setStatus(`✓ Saved to Cloud Firestore at ${timeStr}`, "#10b981");
            console.log(`✓ Cloud Firestore updated: /users/${this.activeHunter}/platform/${this.activePlatform}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("FIRESTORE WRITE ERROR:", error);
            this.setStatus(`❌ Save Failed: ${error.message}`, "#ef4444");
        }
    }
};

window.appState = appState;
appState.init();
