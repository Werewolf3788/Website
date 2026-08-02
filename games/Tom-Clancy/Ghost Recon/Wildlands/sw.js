/* === SECTION: File Header & Config === */
/*
 * ==========================================
 * VERSION TIMESTAMP: Sun, Aug 2, 2026, 01:15 AM EDT
 * SYSTEM: Universal Ghost Recon Wildlands Platform Tracker (tracker.js)
 * ARCHITECTURE: 100% Firestore Real-Time Engine
 * TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
 * ==========================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE SDK CONFIGURATION (entertainment-71888) ---
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

/* === SECTION: Team Profiles & User Mappings === */
const TEAM_PROFILES = [
    { key: 'Werewolf3788', display: 'Werewolf3788', dbDoc: 'Werewolf3788' },
    { key: 'Ray', display: 'Ray', dbDoc: 'Raymystyro' },
    { key: 'TJ', display: 'TJ', dbDoc: 'terrdog420' },
    { key: 'DesdemonaTiger', display: 'DesdemonaTiger', dbDoc: 'DesdemonaTiger' }
];

const USER_DATA_MAP = {
    'werewolf3788': 'Werewolf3788',
    'Werewolf3788': 'Werewolf3788',
    'ray': 'Raymystyro',
    'Ray': 'Raymystyro',
    'raymystyro': 'Raymystyro',
    'Raymystyro': 'Raymystyro',
    'tj': 'terrdog420',
    'TJ': 'terrdog420',
    'terdog420': 'terrdog420',
    'terrdog420': 'terrdog420',
    'Terrdog420': 'terrdog420',
    'desdemonatiger': 'DesdemonaTiger',
    'DesdemonaTiger': 'DesdemonaTiger'
};

/* === SECTION: Wildlands Progression Data Registry === */
const wildlandsData = [
    { id: 'itacua_ks1', cat: 'Itacua Region', name: 'Kingslayer File - El Sueño\'s World', type: 'Kingslayer File', desc: 'Found in the Cult Compound main building upstairs desk.' },
    { id: 'itacua_wp1', cat: 'Itacua Region', name: 'Weapon Case - M4A1', type: 'Weapon Case', desc: 'Armory building in the main Santa Blanca outpost.' },
    { id: 'itacua_sp1', cat: 'Itacua Region', name: 'Skill Point Crate (+3)', type: 'Skill Point', desc: 'Located at the rebel observation post near the ridge.' },
    { id: 'itacua_boss', cat: 'Itacua Region', name: 'Buceo & La Yuri (Bosses)', type: 'Buceo & La Yuri', desc: 'Eliminate or capture the Buchones operating in Itacua.' }
];

const typeOrderMap = {
    'kingslayer file': 1,
    'weapon case': 2,
    'skill point': 3,
    'buceo & la yuri': 4,
    'accessory case': 5
};

/* === SECTION: Application State & Logic Engine === */
const appState = {
    activeHunter: 'Werewolf3788',
    activePlatform: 'pc', // Default platform ('pc', 'playstation', 'xbox')
    teamProgress: {
        'Werewolf3788': {},
        'Raymystyro': {},
        'terrdog420': {},
        'DesdemonaTiger': {}
    },
    auth: null,
    db: null,
    collapsedSections: {},
    unsubscribers: [],

    /* === COOKIE PREFERENCE ENGINE === */
    setGamertagCookie: function(gamertag) {
        const d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = `active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    },

    getGamertagCookie: function() {
        const name = "active_gamertag=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return "";
    },

    setPlatformCookie: function(platform) {
        const d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = `active_platform=${encodeURIComponent(platform)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    },

    getPlatformCookie: function() {
        const name = "active_platform=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return "";
    },

    init: async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        const platParam = urlParams.get('platform');

        if (userParam && USER_DATA_MAP[userParam]) {
            this.activeHunter = USER_DATA_MAP[userParam];
            this.setGamertagCookie(this.activeHunter);
        } else {
            const savedTag = this.getGamertagCookie();
            if (savedTag && USER_DATA_MAP[savedTag]) this.activeHunter = USER_DATA_MAP[savedTag];
        }

        if (platParam && ['pc', 'playstation', 'xbox'].includes(platParam.toLowerCase())) {
            this.activePlatform = platParam.toLowerCase();
            this.setPlatformCookie(this.activePlatform);
        } else {
            const savedPlat = this.getPlatformCookie();
            if (savedPlat) this.activePlatform = savedPlat.toLowerCase();
        }

        this.setupProfilesUI();
        this.setupPlatformUI();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-Platform-Engine');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    console.log("✓ Authenticated on entertainment-71888:", user.uid);
                    this.startLiveTeamListeners();
                }
            });

        } catch (err) {
            console.error("Firebase Initialization Failure:", err);
        }

        this.render();
    },

    setupProfilesUI: function() {
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = this.activeHunter;
            userSelect.addEventListener('change', (e) => {
                this.switchHunter(e.target.value);
            });
        }
    },

    setupPlatformUI: function() {
        const platformSelect = document.getElementById('platformSelect');
        if (platformSelect) {
            platformSelect.value = this.activePlatform;
            platformSelect.addEventListener('change', (e) => {
                this.switchPlatform(e.target.value);
            });
        }
    },

    // REAL-TIME FIRESTORE OBSERVER ISOLATED PER USER + PLATFORM
    // TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
    startLiveTeamListeners: function() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        TEAM_PROFILES.forEach(profile => {
            const docName = profile.dbDoc;
            const ref = doc(this.db, 'users', docName, 'platform', this.activePlatform, 'progress', GAME_ID);

            const unsub = onSnapshot(ref, (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const incoming = data.progress || data.trophies || [];
                    if (Array.isArray(incoming)) {
                        const map = {};
                        incoming.forEach(it => {
                            if (it.collected === true || it.done === true) {
                                map[it.id] = true;
                            }
                        });
                        this.teamProgress[docName] = map;
                        this.render();
                    }
                } else {
                    this.teamProgress[docName] = {};
                    this.render();
                }
            }, (err) => {
                console.warn(`Firestore stream warning for ${docName} [${this.activePlatform}]:`, err.message);
            });

            this.unsubscribers.push(unsub);
        });
    },

    switchHunter: function(name) {
        const dbDocName = USER_DATA_MAP[name] || name;
        this.activeHunter = dbDocName;
        this.setGamertagCookie(dbDocName);
        this.startLiveTeamListeners();
        this.render();
    },

    switchPlatform: function(platformKey) {
        this.activePlatform = platformKey.toLowerCase();
        this.setPlatformCookie(this.activePlatform);
        this.startLiveTeamListeners();
        this.render();
    },

    toggleItem: function(id) {
        const myMap = this.teamProgress[this.activeHunter] || {};
        myMap[id] = !myMap[id];
        this.teamProgress[this.activeHunter] = myMap;

        this.render();
        this.sync();
    },

    // DIRECT CLOUD SAVE TO FIRESTORE UNDER USER PLATFORM SUB-COLLECTION
    // TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
    sync: async function() {
        if (!this.auth.currentUser) {
            try {
                await signInAnonymously(this.auth);
            } catch (err) {
                console.error("Auth Retry Error:", err);
                return;
            }
        }

        try {
            const myMap = this.teamProgress[this.activeHunter] || {};
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);
            const userRef = doc(this.db, 'users', this.activeHunter);

            const progressArr = wildlandsData.map(i => ({
                id: i.id,
                collected: !!myMap[i.id]
            }));

            const payload = {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                progress: progressArr,
                lastUpdated: new Date().toISOString()
            };

            await setDoc(userRef, { displayName: this.activeHunter, lastUpdated: new Date().toISOString() }, { merge: true });
            await setDoc(userProgressRef, payload, { merge: true });

            console.log(`✓ Saved to: /users/${this.activeHunter}/platform/${this.activePlatform}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("CRITICAL FIRESTORE SAVE ERROR:", error);
            alert(`Save Failed for ${this.activeHunter}. Check internet connection or Firestore rules.`);
        }
    },

    toggleSection: function(sid) {
        const isCurrentlyCollapsed = this.collapsedSections[sid] !== false;
        this.collapsedSections[sid] = !isCurrentlyCollapsed;
        this.render();
    },

    render: function() {
        const container = document.getElementById('section-container');
        if (!container) return;
        container.innerHTML = '';

        const cats = [...new Set(wildlandsData.map(i => i.cat))];
        let totalActiveFound = 0;

        const myMap = this.teamProgress[this.activeHunter] || {};

        cats.forEach(cat => {
            const rawItems = wildlandsData.filter(i => i.cat === cat);
            const count = rawItems.filter(i => myMap[i.id]).length;
            totalActiveFound += count;

            const items = rawItems.sort((a, b) => {
                const orderA = typeOrderMap[a.type.toLowerCase()] || 99;
                const orderB = typeOrderMap[b.type.toLowerCase()] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });

            const sid = cat.replace(/[^a-z0-9]/gi, '');
            const isCollapsed = this.collapsedSections[sid] !== false;

            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;

            section.innerHTML = `
                <div class="category-header outlined-text" id="header-${sid}">
                    <h2>${cat} (${this.activePlatform.toUpperCase()})</h2>
                    <div style="font-weight:900; font-size: 16px; color: #ff8800;">${count}/${items.length} FOUND</div>
                </div>
                <div class="section-content" id="content-${sid}">
                    <div class="item-grid"></div>
                </div>
            `;

            section.querySelector(`#header-${sid}`).addEventListener('click', () => {
                this.toggleSection(sid);
            });

            const grid = section.querySelector('.item-grid');
            items.forEach(item => {
                const isCollectedByMe = !!myMap[item.id];
                const card = document.createElement('div');
                card.className = `item-card ${isCollectedByMe ? 'completed' : ''}`;

                let teamBadgesHTML = '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">';
                TEAM_PROFILES.forEach(prof => {
                    const hasDone = !!(this.teamProgress[prof.dbDoc] && this.teamProgress[prof.dbDoc][item.id]);
                    const badgeBg = hasDone ? '#10b981' : '#333333';
                    const badgeText = hasDone ? `✓ ${prof.display}` : prof.display;
                    teamBadgesHTML += `<span style="background:${badgeBg}; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;">${badgeText}</span>`;
                });
                teamBadgesHTML += '</div>';

                card.innerHTML = `
                    <div>
                        <div class="item-type-tag">${item.type}</div>
                        <div class="outlined-text" style="font-weight:900; font-size:15px; margin-bottom:4px;">${item.name}</div>
                        <div class="outlined-text" style="font-size:12px; color:#ddd; font-style:italic; line-height:1.3;">${item.desc}</div>
                        ${teamBadgesHTML}
                    </div>
                    <div class="action-zone"></div>
                `;

                const actionZone = card.querySelector('.action-zone');

                if (isCollectedByMe) {
                    actionZone.innerHTML = `<button class="lock-badge outlined-text toggle-btn" style="background:#00aa44; min-height:44px; cursor:pointer;">LOGGED REGISTRY (Click to Undo)</button>`;
                    actionZone.querySelector('button').addEventListener('click', () => this.toggleItem(item.id));
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'toggle-btn outlined-text';
                    btn.style.minHeight = '44px';
                    btn.innerText = 'Confirm Found';
                    btn.addEventListener('click', () => this.toggleItem(item.id));
                    actionZone.appendChild(btn);
                }

                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const percent = Math.round((totalActiveFound / wildlandsData.length) * 100) || 0;
        const barNode = document.getElementById('overall-bar');
        const textNode = document.getElementById('percent-text');
        if (barNode) barNode.style.width = percent + '%';
        if (textNode) textNode.innerText = `TOTAL CAMPAIGN COLLECTION (${this.activePlatform.toUpperCase()}): ${percent}%`;
    }
};

window.appState = appState;
appState.init();
