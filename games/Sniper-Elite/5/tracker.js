/* ============================================================================
   File: tracker.js
   Version: 1.5.0 | Updated: 2026-07-30T00:58:00Z
   Description: Dynamic SPA Sniper Elite 5 Tracker Engine (entertainment-71888)
   Architecture: /users/{activeUsername}/progress/{platform}/games/sniper-elite-5
   ============================================================================ */

/* === SECTION: Core Imports & Module Setup === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js?v=20260730";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js?v=20260730";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=20260730";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onIdTokenChanged,
    deleteUser 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js?v=20260730";

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

const GAME_ID = "sniper-elite-5";
const DEFAULT_PLATFORM = "pc";
const RAW_JSON_DATA_URL = "https://raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/se.json";

/* === SECTION: SPA AppState Engine & Multi-Platform Firestore Logic === */
const appState = {
    targetUserId: 'Werewolf3788',
    targetDisplayName: 'Werewolf3788',
    targetPlatform: DEFAULT_PLATFORM,
    masterDataset: [],
    hunterData: [],
    app: null,
    auth: null,
    db: null,
    analytics: null,
    collapsedSections: {},
    masterUnsub: null,
    legacyUnsub: null,
    dataLoaded: false,
    lastSyncTime: 0,

    loadMasterDataset: async function() {
        // Order endpoints: Local same-directory JSON first to bypass CORS/network blocks
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
                        console.log(`[Data Engine] Successfully loaded ${data.length} items from: ${url}`);
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
            } catch (e) {
                // Try next fallback path
            }
        }

        const navContainer = document.getElementById('dynamic-nav-links');
        if (navContainer) {
            navContainer.innerHTML = `<span style="color: #ef4444; font-size: 0.85rem; padding: 8px; font-weight: 700;">Menu Load Failure</span>`;
        }
    },

    initSPARouter: function() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#/', '');
            if (hash) {
                const parts = hash.split('/');
                if (parts[0] === 'tracker' && parts[1]) {
                    this.switchHunter(parts[1], parts[2] || this.targetPlatform);
                }
            }
        });
    },

    init: async function() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.analytics = getAnalytics(this.app);

        // Run nav load without blocking execution flow
        this.loadNavigation().catch(e => console.warn("Nav load notice:", e));

        // Fetch master checklist dataset
        await this.loadMasterDataset();

        // Default-collapse category sections
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
                    window.location.hash = `#/tracker/${selected}/${this.targetPlatform}`;
                    this.switchHunter(selected, this.targetPlatform);
                }
            });
        });

        signInAnonymously(this.auth).catch(err => console.warn("Anon Auth notice:", err.message));

        onAuthStateChanged(this.auth, async (user) => {
            if (user && !user.isAnonymous) {
                const email = user.email ? user.email.toLowerCase() : '';

                if (email === 'raykevin71888@gmail.com') {
                    targetToLoad = localStorage.getItem('se5_selected_user_id') || 'Werewolf3788';
                    this.targetDisplayName = 'Werewolf3788';
                } else if (email === 'cartnalray9@gmail.com') {
                    targetToLoad = 'Ray';
                    this.targetDisplayName = 'Ray';
                } else {
                    targetToLoad = user.displayName || user.email.split('@')[0];
                    this.targetDisplayName = targetToLoad;
                }

                await setDoc(doc(this.db, "users", this.targetDisplayName), {
                    uid: user.uid,
                    email: user.email,
                    displayName: this.targetDisplayName,
                    photoURL: user.photoURL || '',
                    lastLogin: new Date().toISOString()
                }, { merge: true }).catch(err => console.warn("Profile sync delay:", err.message));
            }

            this.loadLiveProgress(targetToLoad, this.targetPlatform);
        });

        onIdTokenChanged(this.auth, (user) => {
            if (user) {
                this.loadLiveProgress(this.targetUserId, this.targetPlatform);
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const idleDuration = Date.now() - this.lastSyncTime;
                if (idleDuration > 60000) {
                    this.loadLiveProgress(this.targetUserId, this.targetPlatform);
                }
            }
        });

        window.addEventListener('online', () => {
            this.loadLiveProgress(this.targetUserId, this.targetPlatform);
        });

        // Trigger initial render immediately
        this.render();
    },

    /* === SECTION: Multi-Platform Real-Time Progress Stream === */
    loadLiveProgress: function(userId, platform = "pc") {
        this.targetUserId = userId;
        this.targetPlatform = platform.toLowerCase();
        localStorage.setItem('se5_selected_user_id', userId);

        this.hunterData = this.masterDataset.map(item => ({ ...item, collected: false }));

        const displayNode = document.getElementById('hunter-display');
        if (displayNode) displayNode.innerText = `${userId.toUpperCase()} [${this.targetPlatform.toUpperCase()}]`;

        document.querySelectorAll('.profile-btn').forEach(b => {
            const profAttr = b.getAttribute('data-profile');
            b.classList.toggle('active-btn', profAttr && profAttr.toLowerCase() === userId.toLowerCase());
        });

        if (this.masterUnsub) { this.masterUnsub(); this.masterUnsub = null; }
        if (this.legacyUnsub) { this.legacyUnsub(); this.legacyUnsub = null; }

        // Path: /users/{userId}/progress/{platform}/games/sniper-elite-5
        const primaryRef = doc(this.db, "users", userId, "progress", this.targetPlatform, "games", GAME_ID);

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
                    if (displayNode) displayNode.innerText = `${this.targetDisplayName.toUpperCase()} [${this.targetPlatform.toUpperCase()}]`;
                }
                this.dataLoaded = true;
                this.render();
            } else {
                // Legacy Fallback Check
                const legacyRef = doc(this.db, "users", userId, "progress", GAME_ID);
                this.legacyUnsub = onSnapshot(legacyRef, (legacySnap) => {
                    if (legacySnap.exists()) {
                        const legacyData = legacySnap.data();
                        const legacyIncoming = legacyData.progress || [];
                        if (Array.isArray(legacyIncoming)) {
                            this.hunterData = this.masterDataset.map(item => {
                                const status = legacyIncoming.find(s => s.id === item.id);
                                return { ...item, collected: status ? (status.collected || status.done || false) : false };
                            });
                        }
                    } else {
                        this.hunterData = this.masterDataset.map(item => ({ ...item, collected: false }));
                    }
                    this.dataLoaded = true;
                    this.render();
                }, (err) => console.warn("Legacy Snapshot Notice:", err.message));
            }
        }, (err) => {
            console.error("Multi-Platform Snapshot Stream Error:", err.message);
        });
    },

    switchHunter: function(name, platform = "pc") {
        this.loadLiveProgress(name, platform);
    },

    toggleItem: async function(id) {
        let currentUser = this.auth.currentUser;

        if (!currentUser || currentUser.isAnonymous) {
            const tempAnonUser = currentUser && currentUser.isAnonymous ? currentUser : null;
            
            try {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await signInWithPopup(this.auth, provider);
                currentUser = result.user;

                // Delete temporary anonymous account after successful real sign-in
                if (tempAnonUser) {
                    deleteUser(tempAnonUser).catch(() => {});
                }
            } catch (err) {
                alert("Sign in required to save changes.");
                return;
            }
        }

        const email = currentUser.email ? currentUser.email.toLowerCase() : '';
        const activeUsername = currentUser.displayName || email.split('@')[0];
        const isAdmin = email === 'raykevin71888@gmail.com';
        const isRay = email === 'cartnalray9@gmail.com' && ['ray', 'raymystyro'].includes(this.targetUserId.toLowerCase());
        const isOwner = activeUsername.toLowerCase() === this.targetUserId.toLowerCase() || isAdmin;

        if (!isAdmin && !isRay && !isOwner) {
            alert("Access Denied: You can only edit your own profile progress. Contact Admin to request edits.");
            return;
        }

        const item = this.hunterData.find(i => i.id === id);
        if (item) {
            item.collected = !item.collected;
            this.render();
            this.sync();
        }
    },

    sync: async function() {
        if (!this.db || !this.dataLoaded) return;

        const progress = this.hunterData.map(i => ({ id: i.id, collected: i.collected }));
        
        const platformRef = doc(this.db, "users", this.targetUserId, "progress", this.targetPlatform);
        await setDoc(platformRef, { platform: this.targetPlatform, lastActive: new Date().toISOString() }, { merge: true });

        const docRef = doc(this.db, "users", this.targetUserId, "progress", this.targetPlatform, "games", GAME_ID);

        try {
            await setDoc(docRef, {
                user: this.targetDisplayName,
                platform: this.targetPlatform,
                gameId: GAME_ID,
                lastUpdated: new Date().toISOString(),
                progress: progress
            }, { merge: true });
            
            console.log(`Successfully synced to nested path: /users/${this.targetUserId}/progress/${this.targetPlatform}/games/${GAME_ID}`);
        } catch (err) {
            console.error("Firestore Multi-Platform Write Error:", err);
            alert("Save failed: Check database security rules.");
        }
    },

    toggleSection: function(sid) {
        this.collapsedSections[sid] = !this.collapsedSections[sid];
        this.render();
    },

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
