/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands JSON + Firestore Direct Sync Engine
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

// Fallback registry in case GitHub Raw fetch is delayed
const DEFAULT_SKILL_CARDS = [
    { id: 'sk_weapon', cat: 'Weapon Skills', name: 'Weapon Skill Tree', goal: 8, subItems: [{name: 'Stable Aim', done: false}, {name: 'Hip Fire Spread', done: false}, {name: 'Grenade Launcher', done: true}, {name: 'Ammo Capacity', done: false}, {name: 'VHK Destruction', done: false}, {name: 'Adv Suppressor', done: true}, {name: 'Time to Aim', done: false}, {name: 'Ranged Elite (Epic)', done: false}] },
    { id: 'sk_drone', cat: 'Drone Skills', name: 'Drone Skill Tree', goal: 6, subItems: [{name: 'Battery Life', done: true}, {name: 'Night Vision', done: true}, {name: 'Signal Range', done: true}, {name: 'Speed Boost', done: false}, {name: 'Mark Area', done: false}, {name: 'Medic Drone (Epic)', done: false}] },
    { id: 'sk_item', cat: 'Item Skills', name: 'Item Equipment', goal: 6, subItems: [{name: 'Parachute', done: true}, {name: 'Binoculars 200m', done: true}, {name: 'Mine', done: true}, {name: 'Frag Grenade', done: false}, {name: 'C4 Charge', done: true}, {name: 'Explosion Radius (Epic)', done: false}] },
    { id: 'sk_physical', cat: 'Physical Skills', name: 'Physical Conditioning', goal: 5, subItems: [{name: 'Stamina Boost', done: true}, {name: 'No Pain', done: true}, {name: 'Car Shield', done: false}, {name: 'Bullet Resistance', done: false}, {name: 'Faster Regen (Epic)', done: false}] },
    { id: 'sk_squad', cat: 'Squad Skills', name: 'Squad Tactics', goal: 4, subItems: [{name: 'Revive Speed', done: true}, {name: 'Extra Sync Shot', done: true}, {name: 'Trained Rebels', done: false}, {name: 'Last Chance (Epic)', done: false}] },
    { id: 'sk_rebel', cat: 'Rebel Support', name: 'Rebel Support Network', goal: 4, subItems: [{name: 'Vehicle Drop-off', done: true}, {name: 'Guns for Hire', done: false}, {name: 'Mortar Strike', done: false}, {name: 'Rebel Spotting', done: true}] }
];

const appState = {
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: localStorage.getItem('active_gaming_platform') || 'pc',
    hunterData: JSON.parse(JSON.stringify(DEFAULT_SKILL_CARDS)),
    statsData: {
        level: 5, playstyle: "Raider", avgDist: "38 m", tactical: 100, stealth: 74,
        lifetime: "0h 20min", longestShot: "89 m", precision: 8, favWeapon: "P45T", favWeapon2: "M40A5"
    },
    auth: null, db: null, masterUnsub: null,

    init: async function() {
        // Fetch raw GitHub JSON file
        await this.fetchGitHubJSON();

        this.setupControlDropdowns();
        this.setupFormControls();

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
                if (data.skills) {
                    this.hunterData = Object.keys(data.skills).map(catKey => {
                        const items = data.skills[catKey];
                        return {
                            id: `sk_${catKey.toLowerCase()}`,
                            cat: `${catKey} Skills`,
                            name: `${catKey} Progression`,
                            goal: items.length,
                            subItems: items.map(i => ({ name: i.name || i.id, done: !!i.collected, location: i.location || '' }))
                        };
                    });
                    console.log("✓ Successfully parsed skill cards from GitHub JSON!");
                }
            }
        } catch (e) {
            console.warn("Notice: Fetching raw JSON delayed, rendering defaults.", e.message);
        }
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
                    level: parseInt(getVal("editTierLevel")) || 5,
                    playstyle: getVal("editPlaystyle") || "Raider",
                    avgDist: getVal("editAvgDist") || "38 m",
                    tactical: parseInt(getVal("editTactical")) || 100,
                    stealth: parseInt(getVal("editStealth")) || 74,
                    lifetime: getVal("editLifetime") || "0h 20min",
                    longestShot: getVal("editLongest") || "89 m",
                    precision: parseInt(getVal("editPrecision")) || 8,
                    favWeapon: getVal("editFav1") || "P45T",
                    favWeapon2: getVal("editFav2") || "M40A5"
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

        // EXACT TARGET DOCUMENT PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
        const docRef = doc(this.db, 'users', dbDocName, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.trophies) this.hunterData = data.trophies;
                if (data.stats) this.statsData = data.stats;
            } else {
                this.sync();
            }
            this.render();
            this.updateStatsUI();
        }, (err) => {
            console.error("Firestore Error:", err);
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

        this.hunterData.forEach(catCard => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.style.marginBottom = "20px";

            let subItemsHTML = catCard.subItems.map((s, idx) => `
                <div class="sub-item" style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:#1e293b; border:1px solid #2c3a4e; border-radius:4px; margin-top:6px;">
                    <div>
                        <span style="font-size:13px; color:#fff; font-weight:bold;">${s.name}</span>
                        ${s.location ? `<span style="font-size:10px; color:#8a99ad; display:block;">📍 ${s.location}</span>` : ''}
                    </div>
                    <button class="check-btn ${s.done ? 'is-done' : ''}" 
                            style="background:${s.done ? '#28a745' : '#161d26'}; color:#fff; border:1px solid #3d4f68; padding:4px 10px; border-radius:4px; cursor:pointer; font-weight:bold;"
                            onclick="appState.check('${catCard.id}', ${idx})">
                        ${s.done ? '✓ Completed' : '◯ Mark Done'}
                    </button>
                </div>
            `).join('');

            section.innerHTML = `
                <h3 style="color:#ff8800; font-size:14px; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #2c3a4e; padding-bottom:4px;">${catCard.cat}</h3>
                <div style="background:#121820; border:1px solid #1c2430; padding:12px; border-radius:6px;">
                    <div style="font-weight:bold; color:#fff; font-size:14px; margin-bottom:6px;">${catCard.name}</div>
                    <div class="sub-items-container">${subItemsHTML}</div>
                </div>
            `;
            container.appendChild(section);
        });
    },

    updateStatsUI: function() {
        const data = this.statsData;
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val !== undefined ? val : "--";
        };

        setTxt("operatorName", this.activeHunter);
        setTxt("tierLevel", data.level || "05");
        setTxt("playstyleType", data.playstyle || "Raider");
        setTxt("avgKillDist", data.avgDist || "38 m");
        setTxt("tacticalValue", (data.tactical || 0) + "%");
        setTxt("stealthValue", (data.stealth || 0) + "%");
        setTxt("statLifetime", data.lifetime || "0h 20min");
        setTxt("longestShot", data.longestShot || "89 m");
        setTxt("precisionValue", (data.precision || 0) + "%");
        setTxt("favWeapon", data.favWeapon || "P45T");
        setTxt("favWeapon2", data.favWeapon2 || "M40A5");

        const tacBar = document.getElementById("tacticalBar");
        if (tacBar) tacBar.style.width = `${data.tactical || 0}%`;
        const stBar = document.getElementById("stealthBar");
        if (stBar) stBar.style.width = `${data.stealth || 0}%`;
        const prBar = document.getElementById("precisionBar");
        if (prBar) prBar.style.width = `${data.precision || 0}%`;
    },

    check: function(id, idx) {
        const t = this.hunterData.find(x => x.id === id);
        if (t && t.subItems[idx]) {
            t.subItems[idx].done = !t.subItems[idx].done;
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
                trophies: this.hunterData,
                stats: this.statsData,
                lastUpdate: Date.now()
            };

            await setDoc(ref, payload, { merge: true });
            console.log(`✓ Data successfully pushed to: /users/${this.activeHunter}/platform/${this.activePlatform}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("FIRESTORE SAVE ERROR:", error);
        }
    }
};

window.appState = appState;
appState.init();
