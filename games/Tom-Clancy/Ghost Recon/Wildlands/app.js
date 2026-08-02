/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Direct Firestore Engine
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

const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

// MASTER UNCOMPLETED REGISTRY (Starts at ZERO progress for every new user/platform)
const UNCOMPLETED_WILDLANDS_DATA = [
    { 
        id: 'sk_weapon_tree', cat: 'Weapon Skills', name: 'Weapon Skill Progression', goal: 8, 
        subItems: [
            { name: '1. Stable Aim', done: false }, { name: '2. Hip Fire Spread', done: false },
            { name: '3. Grenade Launcher', done: false }, { name: '4. Ammo Capacity', done: false },
            { name: '5. VHK Destruction', done: false }, { name: '6. Adv Suppressor', done: false },
            { name: '7. Time to Aim', done: false }, { name: '8. Ranged Elite (Epic)', done: false }
        ] 
    },
    { 
        id: 'sk_drone_tree', cat: 'Drone Skills', name: 'Drone Skill Progression', goal: 6, 
        subItems: [
            { name: '1. Battery Life', done: false }, { name: '2. Night Vision', done: false },
            { name: '3. Signal Range', done: false }, { name: '4. Speed Boost', done: false },
            { name: '5. Mark Area', done: false }, { name: '6. Medic Drone (Epic)', done: false }
        ] 
    },
    { 
        id: 'sk_item_tree', cat: 'Item Skills', name: 'Item Equipment Progression', goal: 6, 
        subItems: [
            { name: '1. Parachute', done: false }, { name: '2. Binoculars 200m', done: false },
            { name: '3. Proximity Mine', done: false }, { name: '4. Frag Grenade', done: false },
            { name: '5. C4 Charge', done: false }, { name: '6. Explosion Radius (Epic)', done: false }
        ] 
    },
    { 
        id: 'sk_physical_tree', cat: 'Physical Skills', name: 'Physical Conditioning', goal: 5, 
        subItems: [
            { name: '1. Stamina Boost', done: false }, { name: '2. No Pain', done: false },
            { name: '3. Car Shield', done: false }, { name: '4. Bullet Resistance', done: false },
            { name: '5. Faster Regen (Epic)', done: false }
        ] 
    },
    { 
        id: 'sk_squad_tree', cat: 'Squad Skills', name: 'Squad Leadership', goal: 4, 
        subItems: [
            { name: '1. Revive Speed', done: false }, { name: '2. Extra Sync Shot', done: false },
            { name: '3. Trained Rebels', done: false }, { name: '4. Last Chance (Epic)', done: false }
        ] 
    },
    { 
        id: 'sk_rebel_tree', cat: 'Rebel Support', name: 'Rebel Support Networks', goal: 4, 
        subItems: [
            { name: '1. Vehicle Drop-off', done: false }, { name: '2. Guns for Hire', done: false },
            { name: '3. Mortar Strike', done: false }, { name: '4. Rebel Spotting', done: false }
        ] 
    }
];

const DEFAULT_BLANK_STATS = {
    level: "--", playstyle: "--", avgDist: "--", tactical: 0, stealth: 0,
    lifetime: "--", longestShot: "--", precision: 0, favWeapon: "--", favWeapon2: "--"
};

const appState = {
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: localStorage.getItem('active_gaming_platform') || 'pc',
    hunterData: JSON.parse(JSON.stringify(UNCOMPLETED_WILDLANDS_DATA)),
    statsData: JSON.parse(JSON.stringify(DEFAULT_BLANK_STATS)),
    auth: null, db: null, masterUnsub: null,

    init: async function() {
        this.setupControlDropdowns();
        this.setupFormControls();
        this.render(); // Render empty board immediately so page is NEVER blank

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

        // EXACT TARGET DOC: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
        const docRef = doc(this.db, 'users', dbDocName, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.trophies) this.hunterData = data.trophies;
                if (data.stats) this.statsData = data.stats;
            } else {
                // Document does not exist in Firebase yet! Set clean uncompleted defaults and create the doc!
                this.hunterData = JSON.parse(JSON.stringify(UNCOMPLETED_WILDLANDS_DATA));
                this.statsData = JSON.parse(JSON.stringify(DEFAULT_BLANK_STATS));
                this.sync(); // Instantly creates document in Firestore console!
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
                <div class="sub-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#1e293b; border:1px solid #2c3a4e; border-radius:4px; margin-top:6px;">
                    <span style="font-size:13px; color:#fff; font-weight:bold;">${s.name}</span>
                    <button class="check-btn ${s.done ? 'is-done' : ''}" 
                            style="background:${s.done ? '#28a745' : '#161d26'}; color:#fff; border:1px solid ${s.done ? '#28a745' : '#3d4f68'}; padding:5px 12px; border-radius:4px; cursor:pointer; font-weight:bold; min-width:110px;"
                            onclick="appState.check('${catCard.id}', ${idx})">
                        ${s.done ? '✓ Completed' : '◯ Mark Done'}
                    </button>
                </div>
            `).join('');

            const completedCount = catCard.subItems.filter(s => s.done).length;

            section.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2c3a4e; padding-bottom:4px; margin-bottom:8px;">
                    <h3 style="color:#ff8800; font-size:14px; text-transform:uppercase;">${catCard.cat}</h3>
                    <span style="font-size:12px; color:#8a99ad; font-weight:bold;">${completedCount}/${catCard.goal} Done</span>
                </div>
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
