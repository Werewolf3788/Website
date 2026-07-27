/* === SECTION: File Header & Config === */
/*
 * ==========================================
 * VERSION TIMESTAMP: Mon, July 27, 2026, 02:10 PM EDT
 * SYSTEM: Dynamic Universal Multi-User Ghost Recon Wildlands Tracker (tracker.js)
 * ARCHITECTURE: 100% Pure Firebase Firestore Real-Time Engine (Zero LocalStorage)
 * PATH STRUCTURE: /users/{userId}/progress/T.C.G.R.Wildlands
 * FEATURES: Direct Cloud Read/Write, Simultaneous Operative Stream Observers, Cookie Preference Engine & Dynamic Tip Widget
 * ==========================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE SDK CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:fc70f96b04d0380a9aa692"
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
    // EXAMPLE ENTRY MATRIX FOR WILDLANDS - ITACUA REGION
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
    // Pure in-memory state sourced strictly from live Firestore snapshots
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
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000)); // 365 Days Persistence
        document.cookie = `active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    },

    getGamertagCookie: function() {
        const name = "active_gamertag=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },

    /* === FLOATING TIP / DONATION WIDGET INJECTOR === */
    setupDonationWidget: function() {
        if (document.getElementById('floating-tip-btn')) return;

        const tipBtn = document.createElement('a');
        tipBtn.id = 'floating-tip-btn';
        tipBtn.href = 'https://streamelements.com/werewolf3788/tip';
        tipBtn.target = '_blank';
        tipBtn.rel = 'noopener noreferrer';
        tipBtn.innerHTML = `💳 <span>Tip / Support Stream</span>`;
        
        // Inline UI CSS styling ensuring standard contrast, zero overlaps, and 44px minimum touch targets
        tipBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: linear-gradient(135deg, #ff8800, #ff5500);
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            padding: 10px 16px;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 44px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        tipBtn.addEventListener('mouseenter', () => {
            tipBtn.style.transform = 'scale(1.05)';
            tipBtn.style.boxShadow = '0 6px 20px rgba(255, 136, 0, 0.6)';
        });

        tipBtn.addEventListener('mouseleave', () => {
            tipBtn.style.transform = 'scale(1)';
            tipBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)';
        });

        document.body.appendChild(tipBtn);
    },

    parseCSV: function(str) {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
            arr[row] = arr[row] || [];
            arr[row][col] = arr[row][col] || '';
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
            if (cc == '"') { quote = !quote; continue; }
            if (cc == ',' && !quote) { ++col; continue; }
            if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }
            if (cc == '\r' && !quote) { ++row; col = 0; continue; }
            arr[row][col] += cc;
        }
        return arr;
    },

    cleanNameFromUrl: function(urlStr) {
        if (!urlStr) return "Link";
        try {
            const cleanUrl = urlStr.split('?')[0].split('#')[0];
            const parsed = new URL(cleanUrl);
            const pathSegments = parsed.pathname.split('/').filter(Boolean);
            let name = pathSegments.pop() || parsed.hostname;
            name = name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ');
            if (name.toLowerCase() === 'index') {
                name = pathSegments.pop() || 'Home';
            }
            return name.charAt(0).toUpperCase() + name.slice(1);
        } catch(e) {
            return "Menu Link";
        }
    },

    buildMenuHTML: function(menuItems) {
        const navContainer = document.getElementById('dynamic-nav-links');
        if (!navContainer || !Array.isArray(menuItems)) return;

        const groups = {};
        const standalone = [];

        menuItems.forEach(item => {
            if (!item.url) return;

            let displayName = item.name && item.name.trim() !== '' ? item.name : '';
            if (!displayName || displayName.startsWith('http://') || displayName.startsWith('https://')) {
                displayName = this.cleanNameFromUrl(item.url);
            }

            let imgUrl = item.image || '';
            if (imgUrl && imgUrl.includes('drive.google.com')) {
                const driveMatch = imgUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                    imgUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                }
            }

            const nodeObj = { name: displayName, url: item.url, image: imgUrl };

            if (item.group && item.group.trim() !== '') {
                if (!groups[item.group]) groups[item.group] = [];
                groups[item.group].push(nodeObj);
            } else {
                standalone.push(nodeObj);
            }
        });

        let navHTML = '';

        Object.keys(groups).forEach(groupName => {
            const dropItems = groups[groupName].map(it => {
                const imgTag = it.image ? `<img src="${it.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                return `<a href="${it.url}">${imgTag}<span>${it.name}</span></a>`;
            }).join('');

            navHTML += `
                <div class="nav-dropdown">
                    <button class="nav-dropbtn">${groupName} ▾</button>
                    <div class="nav-dropdown-content">
                        ${dropItems}
                    </div>
                </div>
            `;
        });

        standalone.forEach(it => {
            const imgTag = it.image ? `<img src="${it.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
            navHTML += `<a href="${it.url}">${imgTag}<span>${it.name}</span></a>`;
        });

        navContainer.innerHTML = navHTML;
    },

    loadNavigation: async function() {
        const sheetsCsvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv&v=${Date.now()}`;
        
        try {
            const res = await fetch(sheetsCsvUrl);
            if (res.ok) {
                const csvText = await res.text();
                const parsedRows = this.parseCSV(csvText);
                if (parsedRows.length > 1) {
                    const menuItems = [];
                    for (let i = 1; i < parsedRows.length; i++) {
                        const row = parsedRows[i];
                        if (!row || row.length === 0) continue;

                        const name = row[0] ? row[0].trim() : '';
                        const group = row[1] ? row[1].trim() : '';
                        const url = row[2] ? row[2].trim() : '';
                        const image = row[3] ? row[3].trim() : '';

                        if (url && url.startsWith('http')) {
                            menuItems.push({ name, url, group, image });
                        }
                    }

                    if (menuItems.length > 0) {
                        this.buildMenuHTML(menuItems);
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Google Sheet CSV Fetch Notice:", e.message);
        }

        const navContainer = document.getElementById('dynamic-nav-links');
        if (navContainer) {
            navContainer.innerHTML = `<a href="index.html">Home</a>`;
        }
    },

    init: async function() {
        // 1. Check for URL auto-select parameter (e.g. tracker.html?user=Ray)
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        if (userParam && USER_DATA_MAP[userParam]) {
            this.activeHunter = USER_DATA_MAP[userParam];
            this.setGamertagCookie(this.activeHunter);
        } else {
            // 2. Read saved preference cookie; fall back to default if absent
            const savedTag = this.getGamertagCookie();
            if (savedTag && USER_DATA_MAP[savedTag]) {
                this.activeHunter = USER_DATA_MAP[savedTag];
            } else {
                this.activeHunter = 'Werewolf3788';
            }
        }

        this.loadNavigation();
        this.setupProfilesUI();
        this.setupLifecycleListeners();
        this.setupDonationWidget();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-User-Hierarchy');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            // AUTHENTICATE ANONYMOUSLY & ATTACH LIVE REALTIME LISTENERS
            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    console.log("Firebase Auth Active UID:", user.uid);
                    this.startLiveTeamListeners();
                }
            });

        } catch (err) {
            console.error("Firebase Initialization Failure:", err);
        }

        this.render();
    },

    setupProfilesUI: function() {
        const profilesContainer = document.getElementById('hunter-profiles');
        if (profilesContainer) {
            profilesContainer.innerHTML = `
                <button class="profile-btn active-btn" data-profile="Werewolf3788" onclick="appState.switchHunter('Werewolf3788')">Werewolf3788</button>
                <button class="profile-btn" data-profile="Ray" onclick="appState.switchHunter('Ray')">Ray</button>
                <button class="profile-btn" data-profile="TJ" onclick="appState.switchHunter('TJ')">TJ</button>
                <button class="profile-btn" data-profile="DesdemonaTiger" onclick="appState.switchHunter('DesdemonaTiger')">DesdemonaTiger</button>
            `;
        }

        const toggleBtn = document.getElementById('mobile-toggle');
        const navLinks = document.getElementById('dynamic-nav-links');
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', () => {
                navLinks.classList.toggle('mobile-active');
            });
        }
    },

    setupLifecycleListeners: function() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log("Tab focused: Refreshing multi-user real-time stream...");
                if (this.auth && this.auth.currentUser) {
                    this.startLiveTeamListeners();
                }
            }
        });
    },

    // 100% PURE FIRESTORE LIVE MULTI-USER OBSERVER
    // EXACT PATH: /users/{userId}/progress/T.C.G.R.Wildlands
    startLiveTeamListeners: function() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        TEAM_PROFILES.forEach(profile => {
            const docName = profile.dbDoc;
            const ref = doc(this.db, 'users', docName, 'progress', GAME_ID);

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
                }
            }, (err) => {
                console.warn(`Live Firestore listener warning for ${docName}:`, err.message);
            });

            this.unsubscribers.push(unsub);
        });
    },

    switchHunter: function(name) {
        const dbDocName = USER_DATA_MAP[name] || name;
        this.activeHunter = dbDocName;

        // Save preference cookie whenever a profile button is clicked
        this.setGamertagCookie(dbDocName);

        const displayNode = document.getElementById('hunter-display');
        if (displayNode) displayNode.innerText = dbDocName.toUpperCase();

        document.querySelectorAll('.profile-btn').forEach(b => {
            const profAttr = b.getAttribute('data-profile');
            b.classList.toggle('active-btn', profAttr && (profAttr.toLowerCase() === name.toLowerCase() || USER_DATA_MAP[profAttr]?.toLowerCase() === dbDocName.toLowerCase()));
        });

        this.render();
    },

    toggleItem: function(id) {
        const myMap = this.teamProgress[this.activeHunter] || {};
        myMap[id] = !myMap[id];
        this.teamProgress[this.activeHunter] = myMap;

        this.render();
        this.sync();
    },

    // DIRECT CLOUD SAVE TO FIRESTORE (NO LOCAL STORAGE)
    // EXACT PATH: /users/{userId}/progress/T.C.G.R.Wildlands
    sync: async function() {
        if (!this.auth.currentUser) {
            try {
                await signInAnonymously(this.auth);
            } catch (err) {
                console.error("Auth Failure during sync retry:", err);
                return;
            }
        }

        try {
            const myMap = this.teamProgress[this.activeHunter] || {};
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'progress', GAME_ID);
            const userRef = doc(this.db, 'users', this.activeHunter);

            const progressArr = wildlandsData.map(i => ({
                id: i.id,
                collected: !!myMap[i.id]
            }));

            const payload = {
                user: this.activeHunter,
                gameId: GAME_ID,
                progress: progressArr,
                lastUpdated: new Date().toISOString()
            };

            await setDoc(userRef, { displayName: this.activeHunter, lastUpdated: new Date().toISOString() }, { merge: true });
            await setDoc(userProgressRef, payload, { merge: true });

            console.log(`Live broadcast pushed cleanly to Firestore for: ${this.activeHunter} at /users/${this.activeHunter}/progress/${GAME_ID}`);
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
                    <h2>${cat}</h2>
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
        if (textNode) textNode.innerText = `TOTAL CAMPAIGN COLLECTION: ${percent}%`;
    }
};

window.appState = appState;
appState.init();
