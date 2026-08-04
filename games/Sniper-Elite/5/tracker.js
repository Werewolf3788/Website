/* ============================================================================
   File: tracker.js
   Version: 1.8.0 | Updated: Tuesday, August 4, 2026
   Description: Dynamic SPA Sniper Elite 5 Tracker Engine (Auth-Free Engine)
   Project: entertainment-71888
   Architecture: /users/{userId}/platform/playstation/progress/sniper-elite-5
   Data Source: https://raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/se.json
   
   Section Notes:
     - Lines 21-36: Core Imports & Firebase Initialization (No Auth)
     - Lines 38-42: Target Configuration Constants (Locked to PlayStation)
     - Lines 44-105: Dataset & Dynamic Navigation Fetching
     - Lines 107-185: SPA AppState Lifecycle & Path Listeners
     - Lines 187-240: PlayStation Firestore Path Stream (/users/{userId}/platform/playstation/progress/sniper-elite-5)
     - Lines 242-290: Direct Auth-Free Toggle & Sync Engine
     - Lines 292-365: Dynamic DOM Renderer
   ============================================================================ */

/* === SECTION: Core Imports & Module Setup === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js?v=20260804";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js?v=20260804";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=20260804";

// Line 25: Active Firebase Credentials for entertainment-71888
const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
    measurementId: "G-CTYHDF4MSD" // Google Analytics Gaming/Entertainment Measurement ID
};

// Line 38: Target Configuration (Locked to PlayStation)
const GAME_ID = "sniper-elite-5";
const DEFAULT_PLATFORM = "playstation";
const RAW_JSON_DATA_URL = "https://raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/se.json";

/* === SECTION: SPA AppState Engine & User-First Firestore Logic === */
const appState = {
    targetUserId: 'Werewolf3788',
    targetDisplayName: 'Werewolf3788',
    targetPlatform: DEFAULT_PLATFORM,
    masterDataset: [],
    hunterData: [],
    app: null,
    db: null,
    analytics: null,
    collapsedSections: {},
    masterUnsub: null,
    dataLoaded: false,
    lastSyncTime: 0,

    /* --- DATA ENGINE: Resilient JSON Fetcher --- */
    // Line 60: Collectibles Master Dataset Loader
    loadMasterDataset: async function() {
        const endpoints = [
            `se.json?v=${Date.now()}`,
            `/Website/games/Sniper-Elite/5/se.json?v=${Date.now()}`,
            `${RAW_JSON_DATA_URL}?v=${Date.now()}`
        ];

        for (const url of endpoints) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    let text = await response.text();
                    text = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
                    const data = JSON.parse(text);
                    if (Array.isArray(data) && data.length > 0) {
                        this.masterDataset = data;
                        console.log(`[Data Engine] Loaded ${data.length} collectibles from: ${url}`);
                        return true;
                    }
                }
            } catch (err) {
                console.warn(`[Data Engine] Endpoint attempt failed (${url}):`, err.message);
            }
        }

        console.error("[Data Engine] Master dataset load failed across all endpoints.");
        this.masterDataset = [];
        return false;
    },

    /* --- NAVIGATION ENGINE --- */
    // Line 92: Dynamic Menu Renderer
    buildMenuHTML: function(menuItems) {
        const navContainer = document.getElementById('dynamic-nav-links');
        if (!navContainer || !Array.isArray(menuItems)) return;

        const groups = {};
        const standalone = [];

        menuItems.forEach(item => {
            if (!item.name || !item.url) return;

            let imgUrl = item.image || '';
            if (imgUrl && imgUrl.includes('drive.google.com')) {
                const driveMatch = imgUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                    imgUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                }
            }

            const nodeObj = { name: item.name, url: item.url, image: imgUrl };

            if (item.group) {
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
                return `<a href="${it.url}">${imgTag}${it.name}</a>`;
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
            navHTML += `<a href="${it.url}">${imgTag}${it.name}</a>`;
        });

        navContainer.innerHTML = navHTML;
        
        const warningNode = document.querySelector('div[style*="Menu Load Failure"]');
        if (warningNode) warningNode.style.display = 'none';
    },

    loadNavigation: async function() {
        const timeParam = `?v=${Date.now()}`;
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const repoName = pathname.split('/')[1] || 'Website';
        
        const pathsToTry = [
            `${origin}/${repoName}/Menu.json${timeParam}`,
            `/Website/Menu.json${timeParam}`,
            `../../../../Menu.json${timeParam}`
        ];

        for (const path of pathsToTry) {
            try {
                const res = await fetch(path);
                if (res.ok) {
                    let text = await res.text();
                    text = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
                    const data = JSON.parse(text);
                    if (data && Array.isArray(data)) {
                        this.buildMenuHTML(data);
                        return;
                    }
                }
            } catch (e) {}
        }

        const navContainer = document.getElementById('dynamic-nav-links');
        if (navContainer) {
            navContainer.innerHTML = `<span style="color: #ef4444; font-size: 0.85rem; padding: 8px; font-weight: 700;">Menu Load Failure</span>`;
        }
    },

    /* --- ROUTER & LIFECYCLE --- */
    initSPARouter: function() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#/', '');
            if (hash) {
                const parts = hash.split('/');
                if (parts[0] === 'tracker' && parts[1]) {
                    this.switchHunter(parts[1]);
                }
            }
        });
    },

    // Line 187: Auth-Free App Engine Initialization
    init: async function() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        
        try {
            this.analytics = getAnalytics(this.app);
        } catch (analyticsErr) {
            console.warn("Analytics blocked or unavailable:", analyticsErr.message);
        }

        this.loadNavigation().catch(e => console.warn("Nav load notice:", e));
        await this.loadMasterDataset();

        const cats = [...new Set(this.masterDataset.map(i => i.cat))];
        cats.forEach(cat => {
            const sid = cat.replace(/[^a-z0-9]/gi, '');
            this.collapsedSections[sid] = true;
        });

        this.initSPARouter();

        let targetToLoad = localStorage.getItem('se5_selected_user_id') || 'Werewolf3788';

        document.querySelectorAll('.profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const selected = btn.getAttribute('data-profile');
                if (selected) {
                    window.location.hash = `#/tracker/${selected}/playstation`;
                    this.switchHunter(selected);
                }
            });
        });

        // Load targeted profile progress directly
        this.loadLiveProgress(targetToLoad);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const idleDuration = Date.now() - this.lastSyncTime;
                if (idleDuration > 60000) {
                    this.loadLiveProgress(this.targetUserId);
                }
            }
        });

        window.addEventListener('online', () => {
            this.loadLiveProgress(this.targetUserId);
        });

        this.render();
    },

    /* === SECTION: Auth-Free PlayStation Progress Stream === */
    // Line 230: Direct listener targeting /users/{userId}/platform/playstation/progress/sniper-elite-5
    loadLiveProgress: function(userId) {
        this.targetUserId = userId;
        this.targetPlatform = DEFAULT_PLATFORM; // Locked to playstation
        this.targetDisplayName = userId;
        localStorage.setItem('se5_selected_user_id', userId);

        this.hunterData = this.masterDataset.map(item => ({ ...item, collected: false }));

        const displayNode = document.getElementById('hunter-display');
        if (displayNode) displayNode.innerText = `${userId.toUpperCase()} [PLAYSTATION]`;

        document.querySelectorAll('.profile-btn').forEach(b => {
            const profAttr = b.getAttribute('data-profile');
            b.classList.toggle('active-btn', profAttr && profAttr.toLowerCase() === userId.toLowerCase());
        });

        if (this.masterUnsub) { this.masterUnsub(); this.masterUnsub = null; }

        // Line 248: Target Path: /users/{userId}/platform/playstation/progress/sniper-elite-5
        const primaryRef = doc(this.db, "users", userId, "platform", "playstation", "progress", GAME_ID);

        this.masterUnsub = onSnapshot(primaryRef, (snap) => {
            this.lastSyncTime = Date.now();
            if (snap.exists()) {
                const data = snap.data();
                const incoming = data.progress || [];
                if (Array.isArray(incoming)) {
                    this.hunterData = this.masterDataset.map(item => {
                        const status = incoming.find(s => s.id === item.id);
                        return { ...item, collected: status ? (status.collected || status.done || false) : false };
                    });
                }
                if (data.user || data.displayName) {
                    this.targetDisplayName = data.user || data.displayName;
                    if (displayNode) displayNode.innerText = `${this.targetDisplayName.toUpperCase()} [PLAYSTATION]`;
                }
                this.dataLoaded = true;
                this.render();
            } else {
                this.hunterData = this.masterDataset.map(item => ({ ...item, collected: false }));
                this.dataLoaded = true;
                this.render();
            }
        }, (err) => {
            console.error("PlayStation Progress Stream Error:", err.message);
        });
    },

    switchHunter: function(name) {
        this.loadLiveProgress(name);
    },

    /* --- DIRECT TOGGLE & SYNC ENGINE --- */
    // Line 282: Instant item toggle with zero authentication checks
    toggleItem: function(id) {
        const item = this.hunterData.find(i => i.id === id);
        if (item) {
            item.collected = !item.collected;
            this.render();
            this.sync();
        }
    },

    // Line 292: Sync Payload directly into /users/{userId}/platform/playstation/progress/sniper-elite-5
    sync: async function() {
        if (!this.db || !this.dataLoaded) return;

        const progress = this.hunterData.map(i => ({ id: i.id, collected: i.collected }));
        
        // Ensure platform parent document exists
        const platformRef = doc(this.db, "users", this.targetUserId, "platform", "playstation");
        await setDoc(platformRef, { active: true, lastActive: new Date().toISOString() }, { merge: true });

        // User-first game progress document
        const docRef = doc(this.db, "users", this.targetUserId, "platform", "playstation", "progress", GAME_ID);

        try {
            await setDoc(docRef, {
                user: this.targetDisplayName,
                platform: "playstation",
                gameId: GAME_ID,
                lastUpdated: new Date().toISOString(),
                progress: progress
            }, { merge: true });
            
            console.log(`[Firestore Success] Synced to: /users/${this.targetUserId}/platform/playstation/progress/${GAME_ID}`);
        } catch (err) {
            console.error("Firestore PlayStation Write Error:", err);
        }
    },

    toggleSection: function(sid) {
        this.collapsedSections[sid] = !this.collapsedSections[sid];
        this.render();
    },

    /* --- DOM RENDERER --- */
    render: function() {
        const container = document.getElementById('section-container');
        if (!container) return;
        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        let totalFound = 0;

        cats.forEach(cat => {
            const items = this.hunterData.filter(i => i.cat === cat);
            const count = items.filter(i => i.collected).length;
            totalFound += count;

            const sid = cat.replace(/[^a-z0-9]/gi, '');
            const section = document.createElement('div');
            section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''}`;
            
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
                const card = document.createElement('div');
                card.className = `item-card ${item.collected ? 'completed' : ''}`;
                card.innerHTML = `
                    <div>
                        <div class="item-type-tag">${item.type}</div>
                        <div class="outlined-text" style="font-weight:900; font-size:15px; margin-bottom:4px;">${item.name}</div>
                        <div class="outlined-text" style="font-size:12px; color:#ddd; font-style:italic; line-height:1.3;">${item.desc}</div>
                    </div>
                    <div class="action-zone"></div>
                `;

                const actionZone = card.querySelector('.action-zone');

                if (item.collected) {
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

        const percent = Math.round((totalFound / (this.hunterData.length || 1)) * 100) || 0;
        const barNode = document.getElementById('overall-bar');
        const textNode = document.getElementById('percent-text');
        if (barNode) barNode.style.width = percent + '%';
        if (textNode) textNode.innerText = `TOTAL CAMPAIGN COLLECTION: ${percent}%`;
    }
};

window.appState = appState;
appState.init();
