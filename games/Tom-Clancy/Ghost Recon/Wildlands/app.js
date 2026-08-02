/*
 * ==========================================
 * PRECISION INTEGRATION: Ghost Recon Wildlands Hub (app.js)
 * Architecture: Firestore Modular Pipeline
 * Target Database Path: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
 * NO STRIPPING, NO COMPRESSING. FULL SOURCE INTEGRITY 100% INTACT.
 * ==========================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// --- FIREBASE CONFIGURATION (entertainment-71888) ---
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

// Cleaned: Direct Database Document Strings
const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const checkSet = (items) => items.map(name => ({ name, done: false }));

const formatAlphaCheckset = (items) => {
    return items
        .sort((a, b) => {
            const nameA = typeof a === 'string' ? a : a.name;
            const nameB = typeof b === 'string' ? b : b.name;
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        })
        .map((item, idx) => {
            if (typeof item === 'string') {
                return { name: `${idx + 1}. ${item}`, done: false, images: [] };
            } else {
                return { name: `${idx + 1}. ${item.name}`, done: false, images: item.images || [] };
            }
        });
};

// --- GHOST RECON WILDLANDS FULL REGISTRY ---
const wildlandsData = [
    // --- SKILL TREES ---
    { id: 'sk_weapon_tree', cat: 'Weapon Skills', name: 'Weapon Skill Progression', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Unlock all weapon skill nodes.', subItems: checkSet(["Stable Aim", "Hip Fire Spread", "Grenade Launcher", "Ammo Capacity", "VHK Destruction", "Adv Suppressor", "Time to Aim", "Ranged Elite (Epic)"]) },
    { id: 'sk_drone_tree', cat: 'Drone Skills', name: 'Drone Skill Progression', rank: 'gold', current: 0, goal: 6, type: 'checklist', desc: 'Unlock all drone skill nodes.', subItems: checkSet(["Battery Life", "Night Vision", "Signal Range", "Speed Boost", "Mark Area", "Medic Drone (Epic)"]) },
    { id: 'sk_item_tree', cat: 'Item Skills', name: 'Item Equipment Progression', rank: 'gold', current: 0, goal: 6, type: 'checklist', desc: 'Unlock all equipment items.', subItems: checkSet(["Parachute", "Binoculars 200m", "Proximity Mine", "Frag Grenade", "C4 Charge", "Explosion Radius (Epic)"]) },
    { id: 'sk_physical_tree', cat: 'Physical Skills', name: 'Physical Conditioning', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: 'Unlock physical conditioning skills.', subItems: checkSet(["Stamina Boost", "No Pain", "Car Shield", "Bullet Resistance", "Faster Regen (Epic)"]) },
    { id: 'sk_squad_tree', cat: 'Squad Skills', name: 'Squad Leadership', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Unlock squad tactics.', subItems: checkSet(["Revive Speed", "Extra Sync Shot", "Trained Rebels", "Last Chance (Epic)"]) },
    { id: 'sk_rebel_tree', cat: 'Rebel Support', name: 'Rebel Support Networks', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Unlock rebel support abilities.', subItems: checkSet(["Vehicle Drop-off", "Guns for Hire", "Mortar Strike", "Rebel Spotting"]) },

    // --- REGIONAL COLLECTIBLES ---
    { id: 'col_itacua', cat: 'Itacua Region', name: 'Itacua Kingslayer & Weapons', rank: 'silver', current: 0, goal: 4, type: 'checklist', desc: 'Collect all items in Itacua.', subItems: checkSet(["Kingslayer File - El Sueño's World", "Weapon Case - M4A1", "Skill Point Crate (+3)", "Buceo & La Yuri Boss Defeated"]) },
    { id: 'col_san_mateo', cat: 'San Mateo Region', name: 'San Mateo Collectibles', rank: 'silver', current: 0, goal: 3, type: 'checklist', desc: 'Collect all items in San Mateo.', subItems: checkSet(["Kingslayer File - El Pozolero", "Weapon Case - G36C", "Skill Point Crate (+5)"]) }
];

const appState = {
    activeHunter: 'Werewolf3788',
    activePlatform: 'pc',
    hunterData: JSON.parse(JSON.stringify(wildlandsData)),
    statsData: {
        playstyle: 'Raider',
        avgDist: '38 m',
        tactical: 100,
        stealth: 74,
        lifetime: '0h 20min',
        longestShot: '89 m',
        precision: 8,
        favWeapon: 'P45T',
        favWeapon2: 'M40A5',
        level: 5
    },
    auth: null,
    db: null,
    collapsedSections: {},
    openDropdowns: {},
    masterUnsub: null,
    dataLoaded: false,

    init: async function() {
        const savedUser = localStorage.getItem('active_gaming_nickname');
        const savedPlat = localStorage.getItem('active_gaming_platform');
        
        if (savedUser && USER_DATA_MAP[savedUser]) this.activeHunter = savedUser;
        if (savedPlat) this.activePlatform = savedPlat.toLowerCase();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-Direct-Sync');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            signInAnonymously(this.auth).catch(err => {
                console.error("FIREBASE AUTH ERROR:", err);
            });

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.loadOperator(this.activeHunter, this.activePlatform);
                }
            });
        } catch (err) {
            console.error("Initialization Failure:", err);
        }
        this.setupControlDropdowns();
        this.setupFormControls();
        this.render();
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
        if (!this.auth.currentUser) return;

        const dbDocName = USER_DATA_MAP[userName] || userName;
        this.activeHunter = dbDocName;
        this.activePlatform = platform.toLowerCase();

        localStorage.setItem('active_gaming_nickname', dbDocName);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        if (this.masterUnsub) this.masterUnsub();

        // EXACT TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
        const docRef = doc(this.db, 'users', dbDocName, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.trophies) this.hunterData = data.trophies;
                if (data.stats) this.statsData = data.stats;
            } else {
                this.hunterData = JSON.parse(JSON.stringify(wildlandsData));
                this.sync();
            }
            this.dataLoaded = true;
            this.render();
            this.updateStatsUI();
        }, (err) => {
            console.error("Firestore Snapshot Error:", err);
        });
    },

    switchOperator: function(userName, platform) {
        this.loadOperator(userName, platform);
    },

    render: function() {
        const container = document.getElementById('section-container') || document.getElementById('skillsTreeGrid');
        if (!container) return;

        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(t => t.cat))];

        cats.forEach(cat => {
            const items = this.hunterData.filter(t => t.cat === cat);
            const section = document.createElement('div');
            section.className = 'category-section';

            let cardsHTML = '';
            items.forEach(t => {
                const isDone = t.current >= t.goal;
                
                let subItemsHTML = t.subItems.map((s, idx) => `
                    <div class="sub-item" style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span style="font-size:12px; color:#ccc;">${s.name}</span>
                        <button class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : '◯'}</button>
                    </div>
                `).join('');

                cardsHTML += `
                    <div class="trophy-card skill-card ${isDone ? 'completed maxed' : ''}" style="background:#161d26; border:1px solid #2c3a4e; padding:12px; border-radius:6px; margin-bottom:10px;">
                        <div style="font-weight:bold; color:#fff; font-size:14px;">${t.name}</div>
                        <p style="font-size:11px; color:#8a99ad; margin:4px 0;">${t.desc}</p>
                        <div class="sub-items-container">${subItemsHTML}</div>
                    </div>
                `;
            });

            section.innerHTML = `
                <h3 style="color:#ff8800; font-size:14px; text-transform:uppercase; margin:15px 0 8px 0; border-bottom:1px solid #2c3a4e; padding-bottom:4px;">${cat}</h3>
                <div class="trophy-grid">${cardsHTML}</div>
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
        t.subItems[idx].done = !t.subItems[idx].done;
        t.current = t.subItems.filter(s => s.done).length;
        this.sync();
    },

    sync: async function() {
        this.render();
        this.updateStatsUI();

        if (!this.db || !this.auth.currentUser) return;

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
            console.log(`✓ Data synced directly to: /users/${this.activeHunter}/platform/${this.activePlatform}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("FIRESTORE TRACKER SAVE ERROR:", error);
        }
    }
};

window.appState = appState;
appState.init();
