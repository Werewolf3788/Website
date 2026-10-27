// ============================================================================
// * Project: Far Cry 5 Hope County Resistance Companion & Field Ledger
// * File: fc5.js
// * Location: /game/fc5.js
// * Build Version: v9.4.0-FC5-FIRESTORE-COTW-ALIGNED
// * Deployment Timestamp: 2026-10-27 00:01:00 EDT (America/New_York)
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

// Initialize single authoritative Firebase App
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
    activeUser: 'Werewolf',
    activeEmail: 'raykevin71888@gmail.com', // Admin Account
    platform: 'ps', // 'ps', 'pc', 'xbox', 'steam'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    state: {
        ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },
        checks: {}
    },

    getEmailKey: function(email) {
        const target = email || (this.currentUser ? this.currentUser.email : this.activeEmail);
        return target.replace(/@/g, '_at_').replace(/\./g, '_');
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
            nameEl.innerText = `${this.activeUser.toUpperCase()} [${this.platform.toUpperCase()}]`;
        }
        
        this.loadProgress();
        this.syncFriendsProgress();
    },

    // Recalculate Resistance Metrics based on completed checks
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
                    if (this.state.checks && this.state.checks[s.id]) {
                        stashesCount++;
                        calculatedRP += 400;
                    }
                });
            });
        }

        // Tally Roster & Fangs (+600 RP each)
        if (Array.isArray(this.gameData.guns_and_fangs_for_hire)) {
            this.gameData.guns_and_fangs_for_hire.forEach(h => {
                if (this.state.checks && this.state.checks[h.id]) {
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
                    if (this.state.checks && this.state.checks[mId]) {
                        perksCount++;
                    }
                });
            });
        }

        // Tally Story Missions (+600 RP each)
        if (Array.isArray(this.gameData.walkthrough_missions)) {
            this.gameData.walkthrough_missions.forEach(m => {
                if (this.state.checks && this.state.checks[m.id]) {
                    calculatedRP += 600;
                }
            });
        }

        // Tally Collectibles across all 6 quest sets
        if (this.gameData.collectibles) {
            for (const cKey in this.gameData.collectibles) {
                const group = this.gameData.collectibles[cKey];
                if (group && Array.isArray(group.items)) {
                    group.items.forEach(cItem => {
                        if (this.state.checks && this.state.checks[cItem.id]) {
                            collectiblesCount++;
                        }
                    });
                }
            }
        }

        this.state.ranks.stashes = stashesCount;
        this.state.ranks.roster = rosterCount;
        this.state.ranks.perks = perksCount;
        this.state.ranks.collectibles = collectiblesCount;
        this.state.ranks.rp = calculatedRP;

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

    // Save Progress: users > {emailKey} > platform > {platform} > progress > FarCry5
    saveProgress: function() {
        this.recalculateMetrics();
        const emailKey = this.getEmailKey();
        const storageKey = `fc5_progress_${emailKey}_${this.platform}`;

        try {
            localStorage.setItem(storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn("[Storage] Local write failure:", e);
        }

        if (firestore) {
            const targetDocRef = firestore
                .collection("users")
                .doc(emailKey)
                .collection("platform")
                .doc(this.platform)
                .collection("progress")
                .doc(CURRENT_GAME_ID);

            targetDocRef.set({
                game: "Far Cry 5",
                platform: this.platform,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                state: this.state
            }, { merge: true }).then(() => {
                this.updateStatus(`[Cloud] Saved to: users/.../platform/${this.platform}/progress/${CURRENT_GAME_ID}`);
            }).catch(err => {
                console.error("[Firestore Save Error]:", err);
                this.updateStatus(`Firestore Sync Failed: ${err.message}`);
            });
        } else {
            this.updateStatus("Saved locally (Offline Mode).");
        }
    },

    // Load Progress: users > {emailKey} > platform > {platform} > progress > FarCry5
    loadProgress: function() {
        const emailKey = this.getEmailKey();
        const storageKey = `fc5_progress_${emailKey}_${this.platform}`;

        if (firestore) {
            this.updateStatus(`Fetching: platform/${this.platform}/progress/${CURRENT_GAME_ID}...`);

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
                        if (data && data.state) {
                            this.state = data.state;
                            this.applyStateToUI();
                            this.updateStatus(`Telemetry loaded [${this.platform.toUpperCase()}]`);
                            return;
                        }
                    }
                    this.fallbackLocalLoad(storageKey);
                }).catch(err => {
                    console.warn("[Firestore Fetch Error]:", err);
                    this.fallbackLocalLoad(storageKey);
                });
            return;
        }

        this.fallbackLocalLoad(storageKey);
    },

    fallbackLocalLoad: function(storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    this.state = Object.assign({
                        ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },
                        checks: {}
                    }, parsed);
                    this.applyStateToUI();
                    this.updateStatus(`Operating in LocalStorage mode [${this.platform.toUpperCase()}].`);
                    return;
                }
            }
        } catch (e) {}

        this.state = {
            ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },
            checks: {}
        };
        this.applyStateToUI();
        this.updateStatus(`Profile initialized [${this.platform.toUpperCase()}].`);
    },

    applyStateToUI: function() {
        if (this.state.ranks) {
            for (const r in this.state.ranks) {
                this.updateRankDisplay(r, this.state.ranks[r]);
            }
        }

        document.querySelectorAll('.fc5-item-card').forEach(card => {
            const id = card.getAttribute('data-id');
            const isDone = !!(this.state.checks && this.state.checks[id]);
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

    toggleItem: function(itemId) {
        if (!this.state.checks) this.state.checks = {};
        this.state.checks[itemId] = !this.state.checks[itemId];
        this.applyStateToUI();
        this.saveProgress();
    },

    updateStatus: function(msg) {
        const statLine = document.getElementById('stat-line');
        if (statLine) {
            statLine.innerText = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`;
        }
    },

    // Friend Code & Friends Progress Integration
    fetchUserFriendCode: async function() {
        if (!rtdb) return;
        const emailKey = this.getEmailKey();
        try {
            const snap = await rtdb.ref(`/users/${emailKey}/friend_code`).once('value');
            this.myFriendCode = snap.val() || 'TLWWTSNU';
            const display = document.getElementById('myFriendCodeDisplay');
            if (display) display.innerText = this.myFriendCode;
        } catch (e) {
            console.warn("[Friend Code Fetch]:", e);
        }
    },

    // Resolves squad members from RTDB and queries Firestore under this.platform
    syncFriendsProgress: async function() {
        const rosterContainer = document.getElementById('friendsRosterContainer');
        if (!rosterContainer) return;

        const emailKey = this.getEmailKey();
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

                let friendState = null;
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
                            friendState = fDoc.data()?.state;
                        }
                    } catch (err) {
                        console.warn(`[Friend Query Error]: ${friendTargetKey}`, err);
                    }
                }

                const checksCount = friendState?.checks ? Object.values(friendState.checks).filter(Boolean).length : 0;
                const rpVal = friendState?.ranks?.rp || 0;
                const stashesVal = friendState?.ranks?.stashes || 0;
                const colVal = friendState?.ranks?.collectibles || 0;

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
                            Total Items Completed: <strong>${checksCount}</strong>
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
    if (!appState.state.ranks) appState.state.ranks = {};
    const current = Number(appState.state.ranks[rankKey] || 0);
    const nextVal = Math.max(0, current + delta);
    appState.state.ranks[rankKey] = nextVal;
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

        await autoCheckUserPsnTrophies();
    } catch (e) {
        console.warn("[PSN Skeleton Sync]:", e);
    }
}

async function autoCheckUserPsnTrophies() {
    if (!rtdb) return;
    const gamertag = 'wildhorse_spirit';

    try {
        const liveTrophiesSnap = await rtdb.ref(`/psn/gamertags/${gamertag}/liveTrophyProgress/${PSN_FC5_COMM_ID}`).once('value');
        const liveTrophies = liveTrophiesSnap.val();

        if (liveTrophies && typeof liveTrophies === 'object') {
            let stateModified = false;
            Object.entries(liveTrophies).forEach(([tId, tObj]) => {
                if (tObj && (tObj.earned === true || tObj.isEarned === true)) {
                    const cardKey = `trophy_fc5_${tId}`;
                    if (!appState.state.checks[cardKey]) {
                        appState.state.checks[cardKey] = true;
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

// Section 5: Render Accordion Sections (All Collapsed by Default)
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
                        <div class="trophy-card fc5-item-card" data-id="${item.id}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-gold">${escapeHtml(item.region || 'Hope County')}</span>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(item.mission_name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}')" aria-label="Toggle Mission"></button>
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
                                <div class="trophy-card fc5-item-card" data-id="${s.id}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'No Gear Required')}</span>
                                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(s.name)}</h3>
                                            <div style="font-size:0.75rem; color:var(--user-theme-accent);">${escapeHtml(s.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${s.id}')" aria-label="Toggle Stash"></button>
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
                                <div class="trophy-card fc5-item-card" data-id="${item.id}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || group.region || 'Hope County')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name)}</h3>
                                            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(item.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}')" aria-label="Toggle Collectible"></button>
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
                        <div class="trophy-card fc5-item-card" data-id="${h.id}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-platinum">${escapeHtml(h.type)}</span>
                                    <h3 style="color:#fff; font-size:1.05rem; margin-top:4px;">${escapeHtml(h.name)}</h3>
                                    <div style="font-size:0.8rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(h.title)}</div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${h.id}')" aria-label="Toggle Hire"></button>
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
                        <div class="trophy-card fc5-item-card" data-id="${trophyCardId}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${tIcon ? `<img src="${tIcon}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'">` : ''}
                                    <div>
                                        <span class="trophy-rank ${badgeClass}">${escapeHtml(tType)}</span>
                                        <h3 style="color:#fff; font-size:0.95rem; margin-top:2px;">${escapeHtml(tName)}</h3>
                                    </div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${trophyCardId}')" aria-label="Toggle Trophy"></button>
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
    if (trimmed.startsWith('/')) return trimmed; // Supports clean relative routes like /fc5
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

    // Hook platform dropdown listener if present on page
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
        auth.onAuthStateChanged(user => {
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Werewolf';

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
            } else {
                appState.currentUser = null;
                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');
            }
            appState.fetchUserFriendCode();
            appState.loadProgress();
            appState.syncFriendsProgress();
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
            appState.loadProgress();
        } catch (e) {
            loadData(idx + 1);
        }
    };
    loadData(0);
});
