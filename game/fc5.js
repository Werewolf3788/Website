// ============================================================================
// * Project: Far Cry 5 Hope County Resistance Companion & Field Ledger
// * File: fc5.js
// * Location: /game/fc5.js
// * Build Version: v9.6.0-FC5-AUTH-STORAGE-PARTITIONED
// * Deployment Timestamp: 2026-10-27 00:26:00 EDT (America/New_York)
// ============================================================================

// Section 1: Unified Firebase Configuration (entertainment-71888)
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

// Initialize authoritative Firebase instance
const app = (!firebase.apps || !firebase.apps.length) ? firebase.initializeApp(firebaseConfig) : firebase.app();
const auth = firebase.auth(app);
const rtdb = firebase.database(app);
const firestore = firebase.firestore(app);

try {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
    console.warn("[Auth Persistence]:", e);
}

const CURRENT_GAME_ID = "FarCry5";
const PSN_FC5_COMM_ID = "NPWR12514_00";

// Section 2: Global State Engine
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'pc', 'xbox', 'steam'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    authInitialized: false,
    
    // COTW-aligned schema
    activeMission: "Hope County Resistance",
    ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},

    getEmailKey: function() {
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    switchPlatform: function(newPlatform) {
        if (!newPlatform) return;
        this.platform = newPlatform.toLowerCase();
        
        const platformSelector = document.getElementById('platformSelector');
        if (platformSelector && platformSelector.value !== this.platform) {
            platformSelector.value = this.platform;
        }

        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }
        
        this.loadProgress();
        if (this.currentUser) {
            this.syncFriendsProgress();
        }
    },

    recalculateMetrics: function() {
        if (!this.gameData) return;

        let stashesCount = 0;
        let rosterCount = 0;
        let perksCount = 0;
        let collectiblesCount = 0;
        let calculatedRP = 0;

        // Tally Prepper Stashes (+400 RP each)
        if (this.gameData.prepper_stashes) {
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.prepper_stashes[reg] || [];
                list.forEach(s => {
                    if (this.stashes[s.id] && this.stashes[s.id].collected) {
                        stashesCount++;
                        calculatedRP += 400;
                    }
                });
            });
        }

        // Tally Roster & Fangs (+600 RP each)
        if (Array.isArray(this.gameData.guns_and_fangs_for_hire)) {
            this.gameData.guns_and_fangs_for_hire.forEach(h => {
                if (this.roster[h.id] && this.roster[h.id].unlocked) {
                    rosterCount++;
                    calculatedRP += 600;
                }
            });
        }

        // Tally Perk Magazines
        if (this.gameData.survivalist_magazines) {
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.survivalist_magazines[reg] || [];
                list.forEach((m, idx) => {
                    const mId = `mag_${reg}_${idx}`;
                    if (this.collectibles[mId] && this.collectibles[mId].collected) {
                        perksCount++;
                    }
                });
            });
        }

        // Tally Walkthrough Missions (+600 RP each)
        if (Array.isArray(this.gameData.walkthrough_missions)) {
            this.gameData.walkthrough_missions.forEach(m => {
                if (this.missions[m.id] && this.missions[m.id].completed) {
                    calculatedRP += 600;
                }
            });
        }

        // Tally Quest Collectibles
        if (this.gameData.collectibles) {
            for (const cKey in this.gameData.collectibles) {
                const group = this.gameData.collectibles[cKey];
                if (group && Array.isArray(group.items)) {
                    group.items.forEach(cItem => {
                        if (this.collectibles[cItem.id] && this.collectibles[cItem.id].collected) {
                            collectiblesCount++;
                        }
                    });
                }
            }
        }

        this.ranks.stashes = stashesCount;
        this.ranks.roster = rosterCount;
        this.ranks.perks = perksCount;
        this.ranks.collectibles = collectiblesCount;
        this.ranks.rp = calculatedRP;

        this.updateRankDisplay('stashes', stashesCount);
        this.updateRankDisplay('roster', rosterCount);
        this.updateRankDisplay('perks', perksCount);
        this.updateRankDisplay('collectibles', collectiblesCount);
        this.updateRankDisplay('rp', calculatedRP);
    },

    updateRankDisplay: function(rankKey, val) {
        const el = document.getElementById(`rank-val-${rankKey}`);
        if (el) el.innerText = val || 0;
    },

    // Save Progress: Strictly partitioned between Cloud and Guest LocalStorage
    saveProgress: function() {
        this.recalculateMetrics();
        const emailKey = this.getEmailKey();

        const earnedTrophiesCount = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophiesCount = (this.psnSkeleton && this.psnSkeleton.trophies) 
            ? Object.keys(this.psnSkeleton.trophies).length 
            : (this.gameData?.trophies_and_achievements?.length || 51);
        const percentTrophies = totalTrophiesCount > 0 ? Math.round((earnedTrophiesCount / totalTrophiesCount) * 100) : 0;

        // 1. GUEST MODE (Not signed in): Save exclusively to guest local storage
        if (!emailKey) {
            const guestKey = `fc5_guest_progress_${this.platform}`;
            try {
                localStorage.setItem(guestKey, JSON.stringify({
                    ranks: this.ranks,
                    collectibles: this.collectibles,
                    stashes: this.stashes,
                    roster: this.roster,
                    missions: this.missions,
                    trophies: this.trophies
                }));
                this.updateStatus(`[Guest Mode] Progress retained on this device [${this.platform.toUpperCase()}].`);
            } catch (e) {
                console.warn("[Guest Storage Write]:", e);
            }
            return;
        }

        // 2. AUTHENTICATED MODE (Signed in): Save directly to Cloud Firestore
        const payload = {
            gameId: CURRENT_GAME_ID,
            platform: this.platform,
            activeMission: this.activeMission,
            trophies_earned: earnedTrophiesCount,
            trophies_total: totalTrophiesCount,
            trophies_percent: percentTrophies,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ranks: this.ranks,
            collectibles: this.collectibles,
            stashes: this.stashes,
            roster: this.roster,
            missions: this.missions,
            trophies: this.trophies
        };

        if (firestore) {
            const targetDocRef = firestore
                .collection("users")
                .doc(emailKey)
                .collection("platform")
                .doc(this.platform)
                .collection("progress")
                .doc(CURRENT_GAME_ID);

            targetDocRef.set(payload, { merge: true }).then(() => {
                this.updateStatus(`[Cloud Saved] Synchronized to users/${emailKey}/platform/${this.platform}/progress/${CURRENT_GAME_ID}`);
            }).catch(err => {
                console.error("[Firestore Save Error]:", err);
                this.updateStatus(`Cloud Sync Failed: ${err.message}`);
            });
        }
    },

    // Load Progress: Persistent across refreshes
    loadProgress: function() {
        const emailKey = this.getEmailKey();

        // 1. GUEST MODE: Read from persistent guest local storage
        if (!emailKey) {
            const guestKey = `fc5_guest_progress_${this.platform}`;
            try {
                const raw = localStorage.getItem(guestKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this.applyStatePayload(parsed);
                    this.updateStatus(`[Guest Mode] Restored progress from this device [${this.platform.toUpperCase()}].`);
                    return;
                }
            } catch (e) {}

            // Clean pristine state if no guest data has been marked yet
            this.resetToCleanState();
            this.updateStatus(`[Guest Mode] Ready [${this.platform.toUpperCase()}].`);
            return;
        }

        // 2. AUTHENTICATED MODE: Read authoritative state from Cloud Firestore
        if (firestore) {
            this.updateStatus(`Loading cloud save for ${this.platform.toUpperCase()}...`);

            firestore
                .collection("users")
                .doc(emailKey)
                .collection("platform")
                .doc(this.platform)
                .collection("progress")
                .doc(CURRENT_GAME_ID)
                .get()
                .then(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.applyStatePayload(data);
                        this.updateStatus(`[Cloud Restored] Authoritative ledger loaded [${this.platform.toUpperCase()}].`);
                        return;
                    }
                    // If no cloud document exists yet, start clean
                    this.resetToCleanState();
                    this.updateStatus(`[Cloud Ready] New cloud ledger initialized for ${this.platform.toUpperCase()}.`);
                }).catch(err => {
                    console.warn("[Firestore Fetch Error]:", err);
                    this.updateStatus(`Failed to read cloud save: ${err.message}`);
                });
            return;
        }

        this.resetToCleanState();
    },

    resetToCleanState: function() {
        this.ranks = { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 };
        this.collectibles = {};
        this.stashes = {};
        this.roster = {};
        this.missions = {};
        this.trophies = {};
        this.applyStateToUI();
    },

    applyStatePayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        this.ranks = Object.assign({ rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 }, payload.ranks || {});
        this.collectibles = payload.collectibles || {};
        this.stashes = payload.stashes || {};
        this.roster = payload.roster || {};
        this.missions = payload.missions || {};
        this.trophies = payload.trophies || {};
        this.applyStateToUI();
    },

    // Migrates local Guest ticks into Firestore upon login
    migrateGuestProgressIfPresent: async function() {
        const emailKey = this.getEmailKey();
        if (!emailKey) return;

        const guestKey = `fc5_guest_progress_${this.platform}`;
        let guestData = null;

        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) guestData = JSON.parse(raw);
        } catch (e) {}

        if (guestData && (
            Object.keys(guestData.stashes || {}).length > 0 ||
            Object.keys(guestData.collectibles || {}).length > 0 ||
            Object.keys(guestData.missions || {}).length > 0 ||
            Object.keys(guestData.roster || {}).length > 0 ||
            Object.keys(guestData.trophies || {}).length > 0
        )) {
            this.updateStatus("Importing guest checks to your Cloud Ledger...");

            // Deep merge guest items with any existing cloud state
            this.collectibles = Object.assign({}, this.collectibles, guestData.collectibles || {});
            this.stashes = Object.assign({}, this.stashes, guestData.stashes || {});
            this.roster = Object.assign({}, this.roster, guestData.roster || {});
            this.missions = Object.assign({}, this.missions, guestData.missions || {});
            this.trophies = Object.assign({}, this.trophies, guestData.trophies || {});

            this.applyStateToUI();
            this.saveProgress();

            // Clear guest key now that it is stored in the cloud
            localStorage.removeItem(guestKey);
            this.updateStatus("Guest checks successfully synced to your account.");
        }
    },

    applyStateToUI: function() {
        for (const r in this.ranks) {
            this.updateRankDisplay(r, this.ranks[r]);
        }

        document.querySelectorAll('.fc5-item-card').forEach(card => {
            const id = card.getAttribute('data-id');
            const type = card.getAttribute('data-type') || 'mission';
            let isDone = false;

            if (type === 'stash') isDone = !!(this.stashes[id]?.collected);
            else if (type === 'roster') isDone = !!(this.roster[id]?.unlocked);
            else if (type === 'collectible' || type === 'magazine') isDone = !!(this.collectibles[id]?.collected);
            else if (type === 'trophy') isDone = !!(this.trophies[id]?.earned);
            else isDone = !!(this.missions[id]?.completed);

            const btn = card.querySelector('.check-btn');

            if (isDone) {
                card.classList.add('completed');
                if (btn) {
                    btn.classList.add('is-done');
                    btn.innerHTML = '✓';
                }
            } else {
                card.classList.remove('completed');
                if (btn) {
                    btn.classList.remove('is-done');
                    btn.innerHTML = '';
                }
            }
        });
    },

    toggleItem: function(itemId, type) {
        if (type === 'stash') {
            if (!this.stashes[itemId]) this.stashes[itemId] = { collected: false, psnSynced: false };
            this.stashes[itemId].collected = !this.stashes[itemId].collected;
        } else if (type === 'roster') {
            if (!this.roster[itemId]) this.roster[itemId] = { unlocked: false, psnSynced: false };
            this.roster[itemId].unlocked = !this.roster[itemId].unlocked;
        } else if (type === 'collectible' || type === 'magazine') {
            if (!this.collectibles[itemId]) this.collectibles[itemId] = { collected: false, psnSynced: false };
            this.collectibles[itemId].collected = !this.collectibles[itemId].collected;
        } else if (type === 'trophy') {
            if (!this.trophies[itemId]) this.trophies[itemId] = { earned: false, psnSynced: false };
            this.trophies[itemId].earned = !this.trophies[itemId].earned;
        } else {
            if (!this.missions[itemId]) this.missions[itemId] = { completed: false, psnSynced: false };
            this.missions[itemId].completed = !this.missions[itemId].completed;
        }

        this.applyStateToUI();
        this.saveProgress();
    },

    updateStatus: function(msg) {
        const statLine = document.getElementById('stat-line');
        if (statLine) {
            statLine.innerText = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`;
        }
    },

    fetchUserFriendCode: async function() {
        const emailKey = this.getEmailKey();
        if (!rtdb || !emailKey) return;
        try {
            const snap = await rtdb.ref(`/users/${emailKey}/friend_code`).once('value');
            this.myFriendCode = snap.val() || 'TLWWTSNU';
            const display = document.getElementById('myFriendCodeDisplay');
            if (display) display.innerText = this.myFriendCode;
        } catch (e) {
            console.warn("[Friend Code Fetch]:", e);
        }
    },

    syncFriendsProgress: async function() {
        const rosterContainer = document.getElementById('friendsRosterContainer');
        if (!rosterContainer) return;

        const emailKey = this.getEmailKey();
        if (!emailKey) {
            rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
            return;
        }

        try {
            const friendsSnap = await rtdb.ref(`/users/${emailKey}/friends`).once('value');
            const friendsData = friendsSnap.val();

            if (!friendsData || Object.keys(friendsData).length === 0) {
                rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked yet. Share your friend code to link co-op members.</div>';
                return;
            }

            let cardsHtml = '';
            for (const [fKey, fObj] of Object.entries(friendsData)) {
                const friendUsername = fObj.username || fKey;
                const friendTargetKey = fObj.email ? fObj.email.replace(/@/g, '_at_').replace(/\./g, '_') : fKey;

                let friendData = null;
                if (firestore) {
                    try {
                        const fDoc = await firestore
                            .collection("users")
                            .doc(friendTargetKey)
                            .collection("platform")
                            .doc(this.platform)
                            .collection("progress")
                            .doc(CURRENT_GAME_ID)
                            .get();

                        if (fDoc.exists) {
                            friendData = fDoc.data();
                        }
                    } catch (err) {}
                }

                const rpVal = friendData?.ranks?.rp || 0;
                const stashesVal = friendData?.ranks?.stashes || 0;
                const colVal = friendData?.ranks?.collectibles || 0;
                const trophyPercent = friendData?.trophies_percent || 0;

                cardsHtml += `
                    <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(friendUsername)}</div>
                            <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                                ${escapeHtml(this.platform)}
                            </span>
                        </div>
                        <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;">
                            <strong>RP:</strong> ${rpVal} • <strong>Stashes:</strong> ${stashesVal} • <strong>Collectibles:</strong> ${colVal}
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Trophy Progress: <strong>${trophyPercent}%</strong>
                        </div>
                    </div>
                `;
            }

            rosterContainer.innerHTML = cardsHtml;
        } catch (e) {
            console.warn("[Friends Roster Error]:", e);
        }
    }
};

window.adjRank = function(rankKey, delta) {
    if (!appState.ranks) appState.ranks = {};
    const current = Number(appState.ranks[rankKey] || 0);
    const nextVal = Math.max(0, current + delta);
    appState.ranks[rankKey] = nextVal;
    appState.updateRankDisplay(rankKey, nextVal);
    appState.saveProgress();
};

// Section 3: Dynamic Top Navigation Bar (/utm_links)
async function buildUtmNavigation() {
    const navContainer = document.getElementById('dynamicNavLinks');
    if (!navContainer || !rtdb) return;

    try {
        const snap = await rtdb.ref('/utm_links').once('value');
        const data = snap.val();
        if (!data) return;

        const linksList = [];
        function walk(node) {
            if (!node || typeof node !== 'object') return;
            const url = node.url || node.link || node.href;
            if (url && typeof url === 'string') {
                linksList.push({
                    title: node.title || node.name || 'Link',
                    url: toSecureUrl(url),
                    image: toSecureUrl(node.image || node.thumb || null),
                    group: node.group ? String(node.group).trim() : 'Standalone',
                    rowNumber: Number(node.rowNumber || 999)
                });
                return;
            }
            Object.values(node).forEach(child => walk(child));
        }
        walk(data);

        const standalone = [];
        const groups = {};

        linksList.forEach(item => {
            const grp = item.group;
            if (grp.toLowerCase() === 'standalone' || grp === '') {
                standalone.push(item);
            } else {
                if (!groups[grp]) groups[grp] = [];
                groups[grp].push(item);
            }
        });

        const groupCards = Object.entries(groups).map(([gName, items]) => {
            items.sort((a, b) => a.rowNumber - b.rowNumber);
            return {
                title: gName,
                isGroup: true,
                items: items,
                sortWeight: Math.min(...items.map(i => i.rowNumber))
            };
        });

        const standaloneCards = standalone.map(item => ({
            ...item,
            isGroup: false,
            sortWeight: item.rowNumber
        }));

        const unifiedMenu = [...groupCards, ...standaloneCards].sort((a, b) => a.sortWeight - b.sortWeight);

        let navHtml = '';
        unifiedMenu.forEach(entry => {
            if (entry.isGroup) {
                navHtml += `
                    <div class="nav-folder">
                        <button type="button" class="nav-btn" onclick="this.parentElement.classList.toggle('active')">
                            <i class="fas fa-folder text-yellow-400"></i>
                            <span>${escapeHtml(entry.title)}</span>
                            <span style="font-size:9px;">▾</span>
                        </button>
                        <div class="folder-menu">
                            ${entry.items.map(sub => `
                                <a href="${sub.url}" class="nav-btn" style="width:100%; justify-content:flex-start;">
                                    ${sub.image ? `<img src="${sub.image}" class="nav-icon" onerror="this.style.display='none'">` : ''}
                                    <span class="truncate">${escapeHtml(sub.title)}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                navHtml += `
                    <a href="${entry.url}" class="nav-btn">
                        ${entry.image ? `<img src="${entry.image}" class="nav-icon" onerror="this.style.display='none'">` : ''}
                        <span>${escapeHtml(entry.title)}</span>
                    </a>
                `;
            }
        });

        navContainer.innerHTML = navHtml;
    } catch (e) {
        console.warn("[UTM Navigation Fetch]:", e);
    }
}

// Section 4: PSN Game Skeleton & Live Trophy Tracking
async function syncPsnSkeleton() {
    if (!rtdb) return;
    try {
        const snap = await rtdb.ref(`/psn/games/${PSN_FC5_COMM_ID}`).once('value');
        const skeleton = snap.val();
        if (!skeleton) return;

        appState.psnSkeleton = skeleton;

        const posterUrl = toSecureUrl(skeleton.posterArt);
        if (posterUrl) {
            const fav1 = document.getElementById('dynamicFavicon');
            const fav2 = document.getElementById('dynamicAppleIcon');
            const navLogo = document.getElementById('navHeaderLogo');
            if (fav1) fav1.href = posterUrl;
            if (fav2) fav2.href = posterUrl;
            if (navLogo) navLogo.src = posterUrl;
        }

        // Only sync PSN trophies automatically if user is authenticated and is on PS platform
        if (appState.currentUser && appState.platform === 'ps') {
            await autoCheckUserPsnTrophies();
        }
    } catch (e) {
        console.warn("[PSN Skeleton Sync]:", e);
    }
}

async function autoCheckUserPsnTrophies() {
    const emailKey = appState.getEmailKey();
    if (!rtdb || !emailKey) return;

    try {
        const userProfileSnap = await rtdb.ref(`/users/${emailKey}/psn_username`).once('value');
        const gamertag = userProfileSnap.val() || 'wildhorse_spirit';

        const liveTrophiesSnap = await rtdb.ref(`/psn/gamertags/${gamertag}/liveTrophyProgress/${PSN_FC5_COMM_ID}`).once('value');
        const liveTrophies = liveTrophiesSnap.val();

        if (liveTrophies && typeof liveTrophies === 'object') {
            let stateModified = false;
            Object.entries(liveTrophies).forEach(([tId, tObj]) => {
                if (tObj && (tObj.earned === true || tObj.isEarned === true)) {
                    const cardKey = `trophy_fc5_${tId}`;
                    if (!appState.trophies[cardKey] || !appState.trophies[cardKey].earned) {
                        appState.trophies[cardKey] = { earned: true, psnSynced: true };
                        stateModified = true;
                    }
                }
            });

            if (stateModified) {
                appState.applyStateToUI();
                appState.saveProgress();
            }
        }
    } catch (e) {
        console.warn("[Live Trophy Auto-Check]:", e);
    }
}

// Section 5: Render Far Cry 5 Tactical Accordion Sections
function renderFarCry5Companion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // 5A. Walkthrough Missions
    if (Array.isArray(data.walkthrough_missions)) {
        html += `
        <section class="category-section section-collapsed" id="cat-walkthroughs">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>📖 Story Campaign & Boss Encounters (${data.walkthrough_missions.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.walkthrough_missions.map(item => `
                        <div class="trophy-card fc5-item-card" data-id="${item.id}" data-type="mission">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-gold">${escapeHtml(item.region || 'Hope County')}</span>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(item.mission_name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}', 'mission')" aria-label="Toggle Mission"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 5B. Prepper Stashes
    if (data.prepper_stashes) {
        const regions = [
            { key: 'holland_valley', label: 'Holland Valley (John)' },
            { key: 'henbane_river', label: 'Henbane River (Faith)' },
            { key: 'whitetail_mountains', label: 'Whitetail Mountains (Jacob)' }
        ];

        regions.forEach(reg => {
            const list = data.prepper_stashes[reg.key];
            if (Array.isArray(list) && list.length > 0) {
                html += `
                <section class="category-section section-collapsed" id="cat-stash-${reg.key}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>📦 Prepper Stashes — ${reg.label} (${list.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${list.map(s => `
                                <div class="trophy-card fc5-item-card" data-id="${s.id}" data-type="stash">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'No Gear Required')}</span>
                                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(s.name)}</h3>
                                            <div style="font-size:0.75rem; color:var(--user-theme-accent);">${escapeHtml(s.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${s.id}', 'stash')" aria-label="Toggle Stash"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(s.guide || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        });
    }

    // 5C. Collectibles (6 Sets)
    if (data.collectibles) {
        for (const cKey in data.collectibles) {
            const group = data.collectibles[cKey];
            if (group && Array.isArray(group.items)) {
                const groupTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section section-collapsed" id="cat-col-${cKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(groupTitle)} (${group.items.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${group.items.map(item => `
                                <div class="trophy-card fc5-item-card" data-id="${item.id}" data-type="collectible">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || group.region || 'Hope County')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name)}</h3>
                                            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(item.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}', 'collectible')" aria-label="Toggle Collectible"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        }
    }

    // 5D. Guns & Fangs for Hire
    if (Array.isArray(data.guns_and_fangs_for_hire)) {
        html += `
        <section class="category-section section-collapsed" id="cat-roster">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🐾 Guns & Fangs for Hire (${data.guns_and_fangs_for_hire.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.guns_and_fangs_for_hire.map(h => `
                        <div class="trophy-card fc5-item-card" data-id="${h.id}" data-type="roster">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-platinum">${escapeHtml(h.type)}</span>
                                    <h3 style="color:#fff; font-size:1.05rem; margin-top:4px;">${escapeHtml(h.name)}</h3>
                                    <div style="font-size:0.8rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(h.title)}</div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${h.id}', 'roster')" aria-label="Toggle Hire"></button>
                            </div>
                            <div style="font-size:0.78rem; color:#cbd5e1; margin-bottom:8px;">
                                <strong>Unlock Mission:</strong> ${escapeHtml(h.unlock_mission)} (${escapeHtml(h.location)})
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 5E. Trophies & Achievements
    const trophiesList = (appState.psnSkeleton && appState.psnSkeleton.trophies) ? Object.values(appState.psnSkeleton.trophies) : (data.trophies_and_achievements || []);

    if (Array.isArray(trophiesList) && trophiesList.length > 0) {
        html += `
        <section class="category-section section-collapsed" id="cat-trophies">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 PSN Official Trophies & Achievements (${trophiesList.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${trophiesList.map((t, idx) => {
                        const tId = t.trophyId !== undefined ? t.trophyId : idx;
                        const trophyCardId = `trophy_fc5_${tId}`;
                        const tName = t.name || t.trophyName || 'Trophy';
                        const tDesc = t.detail || t.description || '';
                        const tIcon = toSecureUrl(t.icon || t.trophyIconUrl || '');
                        const tType = (t.type || t.rank || 'Bronze').toUpperCase();

                        let badgeClass = 'rank-bronze';
                        if (tType.includes('PLATINUM')) badgeClass = 'rank-platinum';
                        else if (tType.includes('GOLD')) badgeClass = 'rank-gold';
                        else if (tType.includes('SILVER')) badgeClass = 'rank-silver';

                        return `
                        <div class="trophy-card fc5-item-card" data-id="${trophyCardId}" data-type="trophy">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${tIcon ? `<img src="${tIcon}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'">` : ''}
                                    <div>
                                        <span class="trophy-rank ${badgeClass}">${escapeHtml(tType)}</span>
                                        <h3 style="color:#fff; font-size:0.95rem; margin-top:2px;">${escapeHtml(tName)}</h3>
                                    </div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${trophyCardId}', 'trophy')" aria-label="Toggle Trophy"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(tDesc)}</p>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </section>`;
    }

    container.innerHTML = html;
    appState.applyStateToUI();
}

// Section 6: Helpers
function toSecureUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('/')) return trimmed;
    if (trimmed.startsWith('http://static-resource.np.community.playstation.net/')) {
        return trimmed.replace('http://static-resource.np.community.playstation.net/', 'https://static-resource.np.community.playstation.net/');
    }
    if (trimmed.startsWith('http://')) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return trimmed;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Section 7: Primary Lifecycle Gate
document.addEventListener('DOMContentLoaded', async () => {
    await buildUtmNavigation();

    const platformSelector = document.getElementById('platformSelector');
    if (platformSelector) {
        platformSelector.value = appState.platform;
        platformSelector.addEventListener('change', (e) => {
            appState.switchPlatform(e.target.value);
        });
    }

    const menuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('dynamicNavLinks');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('is-open');
        });
    }

    const authBtn = document.getElementById('authModalBtn');
    const authModal = document.getElementById('authModal');
    const authClose = document.getElementById('authModalClose');
    const googleBtn = document.getElementById('googleSignInBtn');

    if (authBtn && authModal) authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
    if (authClose && authModal) authClose.addEventListener('click', () => authModal.classList.add('hidden'));

    if (googleBtn && auth) {
        googleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(err => {
                console.error("[Auth Popup Error]:", err);
                alert(`Sign-in error: ${err.message}`);
            });
        });
    }

    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            appState.authInitialized = true;
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Resistance Member';

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `${appState.activeUser.toUpperCase()} [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.add('hidden');
                const badge = document.getElementById('userProfileBadge');
                const avatar = document.getElementById('headerUserAvatar');
                const nameBadge = document.getElementById('userDisplayName');
                if (badge) badge.classList.remove('hidden');
                if (avatar && user.photoURL) avatar.src = user.photoURL;
                if (nameBadge) nameBadge.innerText = appState.activeUser;
                if (authModal) authModal.classList.add('hidden');

                // 1. Fetch friend code
                await appState.fetchUserFriendCode();
                // 2. Load authoritative cloud ledger (multi-device)
                await appState.loadProgress();
                // 3. Migrate any guest ticks made before signing in
                await appState.migrateGuestProgressIfPresent();
                // 4. Load squad co-op roster
                await appState.syncFriendsProgress();
            } else {
                appState.currentUser = null;
                appState.activeEmail = null;
                appState.activeUser = 'Guest';

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `GUEST [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');

                // Load persistent guest storage
                appState.loadProgress();
            }
        });
    }

    const dataUrls = [
        './data/farcry5.json',
        './farcry5.json',
        '../game/data/farcry5.json',
        '//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/farcry5.json'
    ];

    const loadData = async (idx) => {
        if (idx >= dataUrls.length) return;
        try {
            const res = await fetch(dataUrls[idx]);
            if (!res.ok) throw new Error();
            const json = await res.json();
            appState.gameData = json;
            await syncPsnSkeleton();
            renderFarCry5Companion(json);
            
            // Only trigger fallback load if auth listener has not fired yet
            if (appState.authInitialized) {
                appState.loadProgress();
            }
        } catch (e) {
            loadData(idx + 1);
        }
    };
    loadData(0);
});
