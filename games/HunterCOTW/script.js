/* === SECTION: File Header & Config === */
/*
 * ==========================================
 * VERSION TIMESTAMP: Mon, July 27, 2026, 06:45 PM EDT
 * SYSTEM: theHunter: Call of the Wild Master Tracker (script.js)
 * ARCHITECTURE: 100% Pure Firebase Firestore Real-Time Engine (Zero LocalStorage Data)
 * PATH STRUCTURE: /users/{userId}/progress/thehunter-call-of-the-wild
 * FEATURES: Active Map Selection Engine, Live Overlay Progress Broadcasting, Rare Fur Mapping & PSN Tag Persistence
 * ==========================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692"
};

const GAME_ID = 'thehunter-call-of-the-wild';

// Strict Firestore Username Mapping Matrix
const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'Terrdog420': 'terrdog420',
    'TJ': 'terrdog420',
    'tj': 'terrdog420'
};

const ICONS = {
    GAME: "https://placehold.co/44x44/1e293b/ff8800?text=GAME",
    ARC: "https://placehold.co/44x44/1e293b/a855f7?text=ARC",
    PHOTO: "https://placehold.co/44x44/1e293b/ef4444?text=PIC",
    TRAVEL: "https://placehold.co/44x44/1e293b/3b82f6?text=MOVE",
    MARK: "https://placehold.co/44x44/1e293b/22c55e?text=AIM",
    TRACK: "https://placehold.co/44x44/1e293b/facc15?text=TRK"
};

const checkSet = (items) => items.map(name => ({name, done: false}));

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

// --- FULL TROPHY & COLLECTIBLES REGISTRY ---
const trophyData = [
    // --- BASE GAME ---
    { id: 'plat_cotw', cat: 'Base Game', name: 'theHunter', rank: 'platinum', current: 0, goal: 1, type: 'toggle', plat: false, desc: 'Collect every trophy.' },
    { id: 'head_shoulder_knees_toes', cat: 'Base Game', name: 'Head Shoulders Knees & Toes', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: "Head Shoulders Knees & Toes" },
    { id: 'the_mile', cat: 'Base Game', name: 'The Mile', rank: 'bronze', current: 0, goal: 1, type: 'numeric', plat: true, desc: 'Travel 1 mile on foot.' },
    { id: 'scand_mile', cat: 'Base Game', name: 'Scandinavian Mile', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, desc: 'Travel 6.2 miles on foot.' },
    { id: 'marathon', cat: 'Base Game', name: 'The Marathon', rank: 'silver', current: 0, goal: 26.2, type: 'numeric', plat: true, desc: 'Travel 26.2 miles on foot.' },
    { id: 'ultra', cat: 'Base Game', name: 'Ultramarathon', rank: 'gold', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Travel 100 miles on foot.' },
    { id: 'jager', cat: 'Base Game', name: 'Jäger Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Gerlinde Jäger's arc.", subItems: checkSet(["Welcome to Hirschfelden", "First Impression", "The Jäger Family", "A New Friend", "Gerlinde's Request"]) },
    { id: 'sommer', cat: 'Base Game', name: 'Sommer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Robert Sommer's arc.", subItems: checkSet(["Sommer's Challenge", "Tracking the Pack", "Wild Boar Protection", "Corn Field Harvest", "The Red Deer King"]) },
    { id: 'bhandari', cat: 'Base Game', name: 'Bhandari Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Vinay Bhandari's arc.", subItems: checkSet(["Fox Den Tracking", "Bhandari's Concern", "Protecting the Wheat", "The Albino Fox", "Bhandari's Legacy"]) },
    { id: 'fleischer', cat: 'Base Game', name: 'Fleischer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Albertina Fleischer's arc.", subItems: checkSet(["Fallow Deer Hunt", "Fleischer's Land", "Subregion Harvest", "The Night Hunt", "Fleischer's Pride"]) },
    { id: 'tressler', cat: 'Base Game', name: 'Tressler Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Marwin Tressler's arc.", subItems: checkSet(["Roe Deer Tracking", "Tressler's Territory", "Invasive Species", "The European Bison", "Tressler's Final Call"]) },
    { id: 'hope', cat: 'Base Game', name: 'Hope Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Richard Hope's arc.", subItems: checkSet(["Welcome to Layton", "Hope's Camp", "The Blacktail Deer", "Hope's Resolve", "The Sick Bear"]) },
    { id: 'trampfine', cat: 'Base Game', name: 'Trampfine Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Jonathan Trampfine's arc.", subItems: checkSet(["The Coyote Problem", "Trampfine's Request", "Pest Control", "The Night Caller", "Trampfine's Success"]) },
    { id: 'vualez', cat: 'Base Game', name: 'Vualez Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Fiona Vualez's arc.", subItems: checkSet(["Vualez's Map", "The Elk Hunt", "Protecting the Forest", "The Ghost Elk", "Vualez's Findings"]) },
    { id: 'connors', cat: 'Base Game', name: 'Connors Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Emily Connors's arc.", subItems: checkSet(["Connors's Challenge", "The Black Bear Hunt", "Mountain Tracking", "The Legendary Bear", "Connors's Conclusion"]) },
    { id: 'beatty', cat: 'Base Game', name: 'Beatty Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Paul Beatty's arc.", subItems: checkSet(["Beatty's Request", "The Moose Harvest", "Subregion Control", "The Great Bull", "Beatty's Reward"]) },

    // --- SILVER RIDGE PEAKS ---
    { id: 'srp_narrative_arc', cat: 'DLC: Silver Ridge', name: 'Narrative Missions Arc (Allan Bradley)', rank: 'gold', current: 0, goal: 15, type: 'checklist', desc: 'Complete 15 story missions for Allan Bradley.', subItems: checkSet(["Missions 1-4", "Missions 5-8", "Missions 9-12", "Missions 13-15"]) },
    { id: 'srp_turkeys', cat: 'DLC: Silver Ridge', name: 'Gobble Gobble', rank: 'silver', current: 0, goal: 50, type: 'numeric', desc: 'Harvest 50 turkeys.' },

    // --- LIST OF COLLECTIBLES WRAPPER ---
    { 
        id: 'coll_layton_outposts', cat: 'List of Collectibles', name: 'Layton Lake - Outposts', rank: 'bronze', current: 0, goal: 18, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Balmont Northern Outpost [8689, 9040]", "Balmont Outpost [9919, 10265]", "Balmont Railroad Outpost [9557, 10760]", "Calburn Outpost [10956, 5643]",
            "Cheelah Outpost [10811, 8337]", "Cheelah Southern Outpost [12401, 9051]"
        ])
    }
];

const appState = {
    activeHunter: 'Werewolf3788',
    psnUsername: 'werewolf3788',
    activeMapCategory: 'DLC: Silver Ridge', // Default deployment map
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, rareFur: 0 },
    auth: null, db: null,
    collapsedSections: {},
    openDropdowns: {}, 
    psnSynced: false,
    liveUnsub: null,
    dataLoaded: false,
    currentLightboxData: { categoryId: null, subIdx: null, imgIdx: 0 },

    /* === COOKIE PREFERENCE ENGINE === */
    setGamertagCookie: function(gamertag) {
        const d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = `cotw_active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    },

    getGamertagCookie: function() {
        const name = "cotw_active_gamertag=";
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

    init: async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        if (userParam && USER_DATA_MAP[userParam]) {
            this.activeHunter = USER_DATA_MAP[userParam];
            this.setGamertagCookie(this.activeHunter);
        } else {
            const saved = this.getGamertagCookie();
            if (saved && USER_DATA_MAP[saved]) {
                this.activeHunter = USER_DATA_MAP[saved];
            } else {
                this.activeHunter = 'Werewolf3788';
            }
        }
        
        this.setupAuthPipelineUI();
        this.setupActiveMapControls();
        
        try {
            const app = initializeApp(firebaseConfig, 'COTW-Master-App');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            signInAnonymously(this.auth).catch(err => console.error("FIREBASE AUTH ERROR:", err));

            onAuthStateChanged(this.auth, (user) => { 
                this.handleAuthState(user);
            });
        } catch (err) {
            console.error("Init Error:", err);
        }
        this.render();
    },

    setupActiveMapControls: function() {
        const mapSelect = document.getElementById('activeMapSelector');
        if (mapSelect) {
            mapSelect.value = this.activeMapCategory;
            mapSelect.addEventListener('change', (e) => {
                this.activeMapCategory = e.target.value;
                this.updateActiveMapDisplay();
                this.sync(); // Instantly update active map broadcast on Firestore
            });
        }
    },

    updateActiveMapDisplay: function() {
        const titleEl = document.getElementById('activeMapTitle');
        const statsEl = document.getElementById('activeMapStatsText');
        
        let cleanName = this.activeMapCategory.replace('DLC: ', '');
        if (titleEl) titleEl.innerText = cleanName;

        // Calculate progress for active map
        const mapItems = this.hunterData.filter(t => t.cat === this.activeMapCategory);
        let completedCount = 0;
        
        mapItems.forEach(t => {
            if (t.type === 'checklist') {
                const completedSub = t.subItems.filter(s => s.done).length;
                if (completedSub >= t.goal) completedCount++;
            } else {
                if (t.current >= t.goal) completedCount++;
            }
        });

        const totalItems = mapItems.length;
        const percent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        if (statsEl) {
            statsEl.innerText = `Map Progress: ${completedCount} / ${totalItems} Completed (${percent}%)`;
        }
    },

    setupAuthPipelineUI: function() {
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = this.activeHunter;
            userSelect.addEventListener('change', (e) => {
                this.switchHunter(e.target.value);
            });
        }

        const saveIdentityBtn = document.getElementById('saveIdentityBtn');
        if (saveIdentityBtn) {
            saveIdentityBtn.addEventListener('click', () => {
                const customName = document.getElementById('profileCustomName')?.value || this.activeHunter;
                const psnUser = document.getElementById('profilePsnUser')?.value || "";
                
                this.activeHunter = customName;
                this.psnUsername = psnUser;
                this.setGamertagCookie(customName);
                this.sync();
                alert(`Saved Identity: ${customName} (PSN: ${psnUser})`);
            });
        }
    },

    handleAuthState: function(user) {
        if (user) {
            this.loadHunter(this.activeHunter);
            if (document.getElementById('stat-line')) {
                document.getElementById('stat-line').innerText = `SYNCED DB: ${firebaseConfig.projectId} | USER: ${user.uid}`;
            }
        }
    },

    loadHunter: function(name) {
        if (!this.auth.currentUser) return;

        const dbDocName = USER_DATA_MAP[name] || name;
        this.hunterData = JSON.parse(JSON.stringify(trophyData));
        this.activeHunter = dbDocName;
        this.setGamertagCookie(dbDocName);
        
        if (document.getElementById('hunter-name')) document.getElementById('hunter-name').innerText = dbDocName.toUpperCase();
        if (document.getElementById('profileCustomName')) document.getElementById('profileCustomName').value = dbDocName;

        if (this.liveUnsub) this.liveUnsub();

        const userProgressRef = doc(this.db, 'users', dbDocName, 'progress', GAME_ID);
        
        this.liveUnsub = onSnapshot(userProgressRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                let incoming = data.trophies || data.progress || [];
                
                if (data.activeMapCategory) {
                    this.activeMapCategory = data.activeMapCategory;
                    const mapSelect = document.getElementById('activeMapSelector');
                    if (mapSelect) mapSelect.value = data.activeMapCategory;
                }

                if (data.animalRankData) {
                    this.animalRankData = { 
                        ...this.animalRankData, 
                        ...data.animalRankData,
                        rareFur: data.animalRankData.rareFur ?? data.animalRankData.albino ?? 0 
                    };
                    this.updateRankUI();
                }

                if (data.psnUsername) {
                    this.psnUsername = data.psnUsername;
                    if (document.getElementById('profilePsnUser')) document.getElementById('profilePsnUser').value = data.psnUsername;
                }

                this.hunterData = this.hunterData.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                return {...si, done: dbMatch?.done === true || dbMatch?.completed === true};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            if (found.done === true || found.completed === true || found.collected === true) {
                                dt.current = dt.goal;
                            } else {
                                dt.current = Number(found.current) || 0; 
                            }
                        }
                    }
                    return dt;
                });
            } else {
                this.dataLoaded = true;
                this.sync();
            }
            this.dataLoaded = true;
            this.updateActiveMapDisplay();
            this.render();
        });
    },

    render: function() {
        const container = document.getElementById('section-container');
        if (!container) return; 
        
        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(t => t.cat))];
        
        cats.forEach(cat => {
            const items = this.hunterData.filter(t => t.cat === cat);
            let catMet = 0;
            items.forEach(t => {
                if (t.type === 'checklist') t.current = t.subItems.filter(s => s.done).length;
                if (t.current >= t.goal) catMet++;
            });
            
            const sectionId = cat.replace(/[^a-zA-Z0-9]/g, '');
            const isCollapsed = this.collapsedSections[sectionId] !== false;
            const percent = Math.round((catMet / items.length) * 100);
            
            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
            section.id = sectionId;
            section.innerHTML = `
                <div class="category-header" onclick="appState.toggleSection('${sectionId}')">
                    <h2>${cat}</h2><div style="font-weight:900; font-size: 0.8rem;">${catMet}/${items.length} (${percent}%)</div>
                </div>
                <div class="section-content"><div class="trophy-grid"></div></div>
            `;
            
            const grid = section.querySelector('.trophy-grid');
            items.forEach(t => {
                const card = document.createElement('div');
                const isDone = t.current >= t.goal;
                card.className = `trophy-card ${isDone ? 'completed' : ''}`;
                
                let ctrl = '';
                if (t.type === 'numeric') {
                    const btnClass = isDone ? 'controls lock-badge' : 'controls';
                    const displayVal = isDone ? `AUDIT VERIFIED (${t.current}/${t.goal})` : `${t.current}/${t.goal}`;
                    ctrl = `<div class="${btnClass}">
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', -1)">-</button>
                        <span style="flex-grow:1; text-align:center;">${displayVal}</span>
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', 1)">+</button>
                    </div>`;
                } else if (t.type === 'checklist') {
                    const dropClass = appState.openDropdowns[t.id] ? 'show' : '';
                    const btnClass = isDone ? 'dropdown-trigger lock-badge' : 'dropdown-trigger';
                    const btnText = isDone ? `Audit Verified (${t.current}/${t.goal})` : `Audit Registry (${t.current}/${t.goal})`;
                    
                    let subItemsHTML = t.subItems.map((s, idx) => {
                        return `<div class="sub-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #1e293b;">
                                    <span>${s.name}</span>
                                    <button class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : ''}</button>
                                </div>`;
                    }).join('');

                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? 'Audit Verified (Undo)' : 'Mark Harvested';
                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.tog('${t.id}')">${btnText}</button>`;
                }
                
                card.innerHTML = `<div style="display:flex; gap:10px; align-items:center;"><img src="${this.getIcon(t)}" class="trophy-icon-img"><div><span class="trophy-rank rank-${t.rank}">${t.rank}</span><div style="font-weight:900; font-size:0.9rem; margin-top:4px;">${t.name}</div></div></div><p style="font-size:0.75rem; font-style:italic; margin:15px 0; color:#cbd5e1;">${t.desc}</p>${ctrl}`;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });
        this.updateActiveMapDisplay();
    },

    getIcon: (t) => t.psnImage ? t.psnImage : ICONS.GAME,
    adj: function(id, val) { const t = this.hunterData.find(x => x.id === id); t.current = Math.max(0, t.current + val); this.sync(); },
    tog: function(id) { const t = this.hunterData.find(x => x.id === id); t.current = t.current === 0 ? 1 : 0; this.sync(); },
    check: function(id, idx) { const t = this.hunterData.find(x => x.id === id); t.subItems[idx].done = !t.subItems[idx].done; this.sync(); },
    adjRank: function(tier, val) { this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val); this.updateRankUI(); this.sync(); },
    updateRankUI: function() { Object.keys(this.animalRankData).forEach(k => { const el = document.getElementById(`rank-val-${k}`); if (el) el.innerText = this.animalRankData[k]; }); },
    toggleSection: function(id) { const cur = this.collapsedSections[id] !== false; this.collapsedSections[id] = !cur; this.render(); },
    toggleDrop: function(id) { const el = document.getElementById('drop-' + id); if (el) { el.classList.toggle('show'); this.openDropdowns[id] = el.classList.contains('show'); } },
    switchHunter: function(name) { this.loadHunter(name); },

    // Pure Cloud Save to /users/{userId}/progress/thehunter-call-of-the-wild
    sync: async function() { 
        this.updateActiveMapDisplay();
        this.render(); 
        if (!this.db || !this.auth.currentUser || !this.dataLoaded) return;

        try {
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'progress', GAME_ID);
            const userRef = doc(this.db, 'users', this.activeHunter);

            // Compute active map stats for overlay stream reading
            const mapItems = this.hunterData.filter(t => t.cat === this.activeMapCategory);
            let completedCount = 0;
            mapItems.forEach(t => {
                if (t.type === 'checklist') {
                    if (t.subItems.filter(s => s.done).length >= t.goal) completedCount++;
                } else if (t.current >= t.goal) completedCount++;
            });

            const activeMapStats = {
                category: this.activeMapCategory,
                cleanName: this.activeMapCategory.replace('DLC: ', ''),
                completed: completedCount,
                total: mapItems.length,
                percentage: mapItems.length > 0 ? Math.round((completedCount / mapItems.length) * 100) : 0
            };

            const payload = {
                user: this.activeHunter,
                psnUsername: this.psnUsername,
                gameId: GAME_ID,
                activeMapCategory: this.activeMapCategory,
                activeMapStats: activeMapStats,
                animalRankData: this.animalRankData,
                trophies: this.hunterData,
                lastUpdated: new Date().toISOString()
            };

            await setDoc(userRef, { displayName: this.activeHunter, lastUpdated: new Date().toISOString() }, { merge: true });
            await setDoc(userProgressRef, payload, { merge: true }); 
            
            console.log(`Live broadcast pushed cleanly for ${this.activeHunter} (Map: ${this.activeMapCategory})`);
        } catch (error) {
            console.error("FIREBASE TRACKER SAVE ERROR:", error);
        }
    }
};

window.appState = appState; 
window.adjRank = (tier, val) => appState.adjRank(tier, val);

appState.init();
