// ============================================================================
// * Project: Universal Game Companion & Live Telemetry Field Ledger
// * File: game-companion.js
// * Deployment Timestamp: 2026-10-29 20:30:00 EDT (America/New_York)
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

const app = (!firebase.apps || !firebase.apps.length) ? firebase.initializeApp(firebaseConfig) : firebase.app();
const auth = firebase.auth(app);
const rtdb = firebase.database(app);
const firestore = firebase.firestore(app);

try {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
    console.warn("[Auth Persistence Error]:", e);
}

// Section 2: Dynamic Game Resolver (URL Parameter or Root DOM Attribute)
function resolveActiveGameKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramKey = urlParams.get('game') || urlParams.get('id');
    if (paramKey) return paramKey.trim().toLowerCase();

    const rootElem = document.getElementById('app-root') || document.getElementById('section-container');
    if (rootElem && rootElem.getAttribute('data-game')) {
        return rootElem.getAttribute('data-game').trim().toLowerCase();
    }

    return "farcry5"; // Default fallback
}

let CURRENT_GAME_KEY = resolveActiveGameKey();
let ACTIVE_COMM_ID = null;

// Section 3: Global State Engine
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'xbox', 'steam', 'pc'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    psnGamertag: null,
    authInitialized: false,
    
    gameTitle: "Game Companion",
    gameId: CURRENT_GAME_KEY,
    trophies_earned: 0,
    trophies_total: 0,
    trophies_percent: 0,
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    ranks: {},

    getUserKey: function() {
        if (this.myFriendCode) return this.myFriendCode;
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    switchPlatform: async function(newPlatform, persistPin = true) {
        if (!newPlatform) return;
        const normalized = newPlatform.toLowerCase();
        const validPlatforms = ['ps', 'xbox', 'steam', 'pc'];
        this.platform = validPlatforms.includes(normalized) ? normalized : 'ps';
        
        const platformSelector = document.getElementById('platformSelector');
        if (platformSelector && platformSelector.value !== this.platform) {
            platformSelector.value = this.platform;
        }

        const nameEl = document.getElementById('resistance-name') || document.getElementById('user-header-status');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }

        if (persistPin && this.currentUser && this.currentUser.email && rtdb) {
            const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
            try {
                await rtdb.ref(`/users/${emailKey}/pinned_platform`).set(this.platform);
                this.updateStatus(`[Pinned Platform] Set to ${this.platform.toUpperCase()} in RTDB.`);
            } catch (pinErr) {
                console.warn("[Pinned Platform Write Error]:", pinErr);
            }
        }
        
        this.loadProgress();
        if (this.currentUser) {
            this.syncFriendsProgress();
            if (this.platform === 'ps' && this.psnGamertag) {
                autoCheckUserPsnTrophies();
            }
        }
    },

    // Dynamic hydration for any game loaded from /games/{gameId}
    hydrateFromRawJson: function(data) {
        if (!data || typeof data !== 'object') return;
        this.gameData = data;
        this.gameTitle = data.game || data.title || "Game Companion";
        this.gameId = data.gameId || CURRENT_GAME_KEY;

        // Auto-detect Sony Comm ID from top-level or platforms object
        ACTIVE_COMM_ID = data.commId || 
                         data.psn_communication_id || 
                         data.platforms?.playstation?.commId || 
                         null;

        const titleHeader = document.getElementById('companionGameTitle');
        if (titleHeader) titleHeader.innerText = this.gameTitle;

        // 1. Collectibles
        if (data.collectibles && typeof data.collectibles === 'object') {
            for (const cKey in data.collectibles) {
                const group = data.collectibles[cKey];
                const rawItems = group?.items ? (Array.isArray(group.items) ? group.items : Object.values(group.items)) : [];
                const totalItems = group?.total_count || rawItems.length;

                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = {
                        collected: false,
                        count: 0,
                        psnSynced: false,
                        total: totalItems,
                        quest_name: group.quest_name || cKey,
                        quest_giver: group.quest_giver || '',
                        quest_giver_location: group.quest_giver_location || '',
                        required_perk: group.required_perk || '',
                        region: group.region || 'Game World',
                        items: {}
                    };
                } else {
                    this.collectibles[cKey].total = totalItems;
                    if (!this.collectibles[cKey].items) this.collectibles[cKey].items = {};
                }

                rawItems.forEach(cItem => {
                    if (!cItem || !cItem.id) return;
                    if (!this.collectibles[cKey].items[cItem.id]) {
                        this.collectibles[cKey].items[cItem.id] = {
                            collected: false,
                            name: cItem.name || '',
                            region: cItem.region || group.region || '',
                            location: cItem.location || '',
                            guide: cItem.guide || '',
                            psnSynced: false
                        };
                    } else {
                        this.collectibles[cKey].items[cItem.id].name = cItem.name || this.collectibles[cKey].items[cItem.id].name;
                        this.collectibles[cKey].items[cItem.id].region = cItem.region || this.collectibles[cKey].items[cItem.id].region;
                        this.collectibles[cKey].items[cItem.id].location = cItem.location || this.collectibles[cKey].items[cItem.id].location;
                        this.collectibles[cKey].items[cItem.id].guide = cItem.guide || this.collectibles[cKey].items[cItem.id].guide;
                    }
                });
            }
        }

        // 2. Prepper Stashes / Treasure Hunts
        const stashesSource = data.prepper_stashes || data.treasure_hunts;
        if (stashesSource && typeof stashesSource === 'object') {
            Object.entries(stashesSource).forEach(([regKey, rawList]) => {
                const list = Array.isArray(rawList) ? rawList : (rawList ? Object.values(rawList) : []);
                list.forEach(s => {
                    if (!s || !s.id) return;
                    if (!this.stashes[s.id]) {
                        this.stashes[s.id] = {
                            collected: false,
                            name: s.name || '',
                            region: regKey,
                            required_gear: s.required_gear || 'None',
                            location: s.location || '',
                            guide: s.guide || '',
                            psnSynced: false
                        };
                    } else {
                        this.stashes[s.id].name = s.name || this.stashes[s.id].name;
                        this.stashes[s.id].location = s.location || this.stashes[s.id].location;
                        this.stashes[s.id].guide = s.guide || this.stashes[s.id].guide;
                    }
                });
            });
        }

        // 3. Roster / Amigos
        const rosterSource = data.guns_and_fangs_for_hire || data.amigos;
        const rawRoster = rosterSource ? (Array.isArray(rosterSource) ? rosterSource : Object.values(rosterSource)) : [];
        rawRoster.forEach(h => {
            const hId = h.id || h.name?.toLowerCase().replace(/\s+/g, '_');
            if (!hId) return;
            if (!this.roster[hId]) {
                this.roster[hId] = {
                    unlocked: false,
                    name: h.name || '',
                    title: h.title || '',
                    type: h.type || 'Companion',
                    unlock_mission: h.unlock_mission || h.recruitment_quest || '',
                    location: h.location || '',
                    psnSynced: false
                };
            }
        });

        // 4. Quests / Walkthrough Missions
        const rawMissions = data.walkthrough_missions ? (Array.isArray(data.walkthrough_missions) ? data.walkthrough_missions : Object.values(data.walkthrough_missions)) : [];
        rawMissions.forEach(m => {
            if (!m || !m.id) return;
            if (!this.missions[m.id]) {
                this.missions[m.id] = {
                    completed: false,
                    mission_name: m.mission_name || m.title || '',
                    region: m.region || '',
                    guide: m.guide || '',
                    psnSynced: false
                };
            }
        });

        // 5. Embedded Trophies List
        if (data.trophies) {
            this.hydrateTrophiesFromSkeleton(data);
        }

        this.recalculateMetrics();
    },

    hydrateTrophiesFromSkeleton: function(skeleton) {
        if (!skeleton) return;
        this.psnSkeleton = skeleton;

        const rawList = skeleton.trophies 
            ? (Array.isArray(skeleton.trophies) ? skeleton.trophies : Object.values(skeleton.trophies))
            : [];

        rawList.forEach((t, idx) => {
            if (!t) return;
            const tId = t.trophyId !== undefined ? t.trophyId : idx;
            const cardKey = `trophy_${this.gameId}_${tId}`;

            if (!this.trophies[cardKey]) {
                this.trophies[cardKey] = {
                    earned: false,
                    name: t.name || t.trophyName || t.title || 'Trophy',
                    rank: (t.rank || t.type || 'Bronze').toUpperCase(),
                    description: t.description || t.detail || '',
                    icon: toSecureUrl(t.icon || t.trophyIconUrl || ''),
                    trophyId: tId,
                    psnSynced: false
                };
            } else {
                this.trophies[cardKey].name = t.name || this.trophies[cardKey].name;
                this.trophies[cardKey].rank = (t.rank || this.trophies[cardKey].rank).toUpperCase();
                this.trophies[cardKey].description = t.description || this.trophies[cardKey].description;
                if (t.icon) this.trophies[cardKey].icon = toSecureUrl(t.icon);
            }
        });

        this.recalculateMetrics();
    },

    recalculateMetrics: function() {
        let stashesCount = 0;
        let rosterCount = 0;
        let totalCollectiblesCount = 0;

        Object.values(this.stashes).forEach(s => { if (s && s.collected) stashesCount++; });
        Object.values(this.roster).forEach(h => { if (h && h.unlocked) rosterCount++; });

        for (const cKey in this.collectibles) {
            const group = this.collectibles[cKey];
            if (group && group.items) {
                let groupCount = 0;
                Object.values(group.items).forEach(item => {
                    if (item && item.collected) {
                        groupCount++;
                        totalCollectiblesCount++;
                    }
                });
                group.count = groupCount;
                group.collected = (group.total > 0 && groupCount >= group.total);
            }
        }

        const earnedTrophies = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophies = Object.keys(this.trophies).length || 0;
        this.trophies_earned = earnedTrophies;
        this.trophies_total = totalTrophies;
        this.trophies_percent = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

        this.ranks.stashes = stashesCount;
        this.ranks.roster = rosterCount;
        this.ranks.collectibles = totalCollectiblesCount;

        this.updateRankDisplay('stashes', stashesCount);
        this.updateRankDisplay('roster', rosterCount);
        this.updateRankDisplay('collectibles', totalCollectiblesCount);
    },

    updateRankDisplay: function(rankKey, val) {
        const el = document.getElementById(`rank-val-${rankKey}`);
        if (el) el.innerText = val || 0;
    },

    buildPayload: function() {
        this.recalculateMetrics();
        return {
            gameId: this.gameId,
            platform: this.platform,
            trophies_earned: this.trophies_earned,
            trophies_total: this.trophies_total,
            trophies_percent: this.trophies_percent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ranks: this.ranks,
            collectibles: this.collectibles,
            stashes: this.stashes,
            roster: this.roster,
            missions: this.missions,
            trophies: this.trophies
        };
    },

    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        this.trophies_earned = payload.trophies_earned || 0;
        this.trophies_total = payload.trophies_total || this.trophies_total;
        this.trophies_percent = payload.trophies_percent || 0;
        
        if (payload.collectibles) {
            for (const cKey in payload.collectibles) {
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = payload.collectibles[cKey];
                } else {
                    this.collectibles[cKey].collected = !!payload.collectibles[cKey].collected;
                    this.collectibles[cKey].count = payload.collectibles[cKey].count || 0;
                    if (payload.collectibles[cKey].items) {
                        for (const itemId in payload.collectibles[cKey].items) {
                            if (!this.collectibles[cKey].items[itemId]) {
                                this.collectibles[cKey].items[itemId] = payload.collectibles[cKey].items[itemId];
                            } else {
                                this.collectibles[cKey].items[itemId].collected = !!payload.collectibles[cKey].items[itemId].collected;
                                this.collectibles[cKey].items[itemId].psnSynced = !!payload.collectibles[cKey].items[itemId].psnSynced;
                            }
                        }
                    }
                }
            }
        }

        if (payload.stashes) {
            for (const sId in payload.stashes) {
                if (!this.stashes[sId]) this.stashes[sId] = payload.stashes[sId];
                else this.stashes[sId].collected = !!payload.stashes[sId].collected;
            }
        }

        if (payload.roster) {
            for (const rId in payload.roster) {
                if (!this.roster[rId]) this.roster[rId] = payload.roster[rId];
                else this.roster[rId].unlocked = !!payload.roster[rId].unlocked;
            }
        }

        if (payload.missions) {
            for (const mId in payload.missions) {
                if (!this.missions[mId]) this.missions[mId] = payload.missions[mId];
                else this.missions[mId].completed = !!payload.missions[mId].completed;
            }
        }

        if (payload.trophies) {
            for (const tKey in payload.trophies) {
                if (!this.trophies[tKey]) this.trophies[tKey] = payload.trophies[tKey];
                else {
                    this.trophies[tKey].earned = !!payload.trophies[tKey].earned;
                    this.trophies[tKey].psnSynced = !!payload.trophies[tKey].psnSynced;
                }
            }
        }

        if (payload.ranks) this.ranks = Object.assign({}, this.ranks, payload.ranks);
        this.applyStateToUI();
    }
};

// Section 4: Authoritative Storage Gate (LocalStorage vs Firestore)
window.appState.saveProgress = function() {
    const payload = this.buildPayload();
    const userKey = this.getUserKey();

    // RULE: If unauthenticated, save strictly to localStorage
    if (!this.currentUser || !userKey) {
        const guestKey = `guest_progress_${this.gameId}_${this.platform}`;
        try {
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress saved locally [${this.platform.toUpperCase()}].`);
        } catch (e) {}
        return;
    }

    // RULE: If logged in, save to Firestore user profile
    if (firestore) {
        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("game")
            .doc(this.gameId);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] users/${userKey}/platform/${this.platform}/game/${this.gameId}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
        });
    }
};

window.appState.loadProgress = function() {
    const userKey = this.getUserKey();
    
    if (this.gameData) this.hydrateFromRawJson(this.gameData);
    if (this.psnSkeleton) this.hydrateTrophiesFromSkeleton(this.psnSkeleton);

    if (!this.currentUser || !userKey) {
        const guestKey = `guest_progress_${this.gameId}_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                this.applyPayload(JSON.parse(raw));
                this.updateStatus(`[Guest Mode] Restored local progress [${this.platform.toUpperCase()}].`);
                return;
            }
        } catch (e) {}

        this.applyStateToUI();
        return;
    }

    if (firestore) {
        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("game")
            .doc(this.gameId);

        docRef.get().then(doc => {
            if (doc.exists) {
                this.applyPayload(doc.data());
                this.updateStatus(`[Cloud Synced] users/${userKey}/platform/${this.platform}/game/${this.gameId}`);
            } else {
                this.applyStateToUI();
                this.saveProgress();
            }
        }).catch(err => {
            console.warn("[Firestore Fetch Error]:", err);
        });
    }
};

// Section 5: UI Toggle Handlers
window.appState.applyStateToUI = function() {
    this.recalculateMetrics();

    document.querySelectorAll('.game-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'mission';
        const group = card.getAttribute('data-group') || null;
        let isDone = false;

        if (type === 'stash') {
            isDone = !!(this.stashes[id]?.collected);
        } else if (type === 'roster') {
            isDone = !!(this.roster[id]?.unlocked);
        } else if (type === 'collectible') {
            if (group && this.collectibles[group]?.items?.[id]) {
                isDone = !!(this.collectibles[group].items[id].collected);
            }
        } else if (type === 'trophy') {
            isDone = !!(this.trophies[id]?.earned);
        } else {
            isDone = !!(this.missions[id]?.completed);
        }

        const btn = card.querySelector('.check-btn');
        if (isDone) {
            card.classList.add('completed');
            if (btn) { btn.classList.add('is-done'); btn.innerHTML = '✓'; }
        } else {
            card.classList.remove('completed');
            if (btn) { btn.classList.remove('is-done'); btn.innerHTML = ''; }
        }
    });
};

window.appState.toggleItem = function(itemId, type, group) {
    if (type === 'stash') {
        if (!this.stashes[itemId]) this.stashes[itemId] = { collected: false, psnSynced: false };
        this.stashes[itemId].collected = !this.stashes[itemId].collected;
    } else if (type === 'roster') {
        if (!this.roster[itemId]) this.roster[itemId] = { unlocked: false, psnSynced: false };
        this.roster[itemId].unlocked = !this.roster[itemId].unlocked;
    } else if (type === 'collectible') {
        if (group && this.collectibles[group]?.items?.[itemId]) {
            this.collectibles[group].items[itemId].collected = !this.collectibles[group].items[itemId].collected;
        }
    } else if (type === 'trophy') {
        if (!this.trophies[itemId]) this.trophies[itemId] = { earned: false, psnSynced: false };
        this.trophies[itemId].earned = !this.trophies[itemId].earned;
        this.trophies[itemId].psnSynced = (this.platform === 'ps' && !!this.psnGamertag);
    } else {
        if (!this.missions[itemId]) this.missions[itemId] = { completed: false, psnSynced: false };
        this.missions[itemId].completed = !this.missions[itemId].completed;
    }

    this.applyStateToUI();
    this.saveProgress();
};

window.appState.updateStatus = function(msg) {
    const statLine = document.getElementById('stat-line');
    if (statLine) {
        statLine.innerText = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`;
    }
};

// Section 6: Universal PSN Live Telemetry Engine
async function autoCheckUserPsnTrophies() {
    if (!rtdb || !appState.psnGamertag || appState.platform !== 'ps' || !ACTIVE_COMM_ID) return;
    const commId = ACTIVE_COMM_ID;
    const gamertag = appState.psnGamertag;

    try {
        const liveTrophiesSnap = await rtdb.ref(`/psn/gamertags/${gamertag}/liveTrophyProgress/${commId}`).once('value');
        const liveTrophies = liveTrophiesSnap.val();

        if (liveTrophies && (Array.isArray(liveTrophies) || typeof liveTrophies === 'object')) {
            let stateModified = false;
            const trophyEntries = Array.isArray(liveTrophies) ? liveTrophies.entries() : Object.entries(liveTrophies);

            for (const [tId, tObj] of trophyEntries) {
                if (!tObj) continue;
                const parsedId = tObj.trophyId !== undefined ? tObj.trophyId : tId;
                const cardKey = `trophy_${appState.gameId}_${parsedId}`;
                const isEarnedInPsn = (tObj.earned === true || tObj.isEarned === true);

                if (!appState.trophies[cardKey]) {
                    appState.trophies[cardKey] = {
                        trophyId: parsedId,
                        commId: commId,
                        earned: isEarnedInPsn,
                        name: tObj.name || tObj.title || 'Trophy',
                        rank: (tObj.rank || tObj.type || 'BRONZE').toUpperCase(),
                        description: tObj.description || tObj.detail || '',
                        icon: toSecureUrl(tObj.icon || ''),
                        earnedRate: tObj.earnedRate || null,
                        rarity: tObj.rarity || null,
                        currentValue: Number(tObj.currentValue || tObj.trophyProgress || 0),
                        targetValue: Number(tObj.targetValue || tObj.trophyProgressTargetValue || 0),
                        timestamp: tObj.timestamp || null,
                        psnSynced: isEarnedInPsn
                    };
                    stateModified = true;
                } else {
                    const card = appState.trophies[cardKey];
                    if (isEarnedInPsn && !card.earned) {
                        card.earned = true;
                        card.psnSynced = true;
                        stateModified = true;
                    }
                }
            }

            if (stateModified) {
                appState.applyStateToUI();
                appState.saveProgress();
                appState.updateStatus(`[PSN Live Synced] ${gamertag} / ${commId}`);
            }
        }
    } catch (e) {
        console.warn("[Live Telemetry Error]:", e);
    }
}

// Section 7: Universal Dynamic Renderer
function renderUniversalCompanion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // Render Quests / Operations
    const rawMissions = data.walkthrough_missions ? (Array.isArray(data.walkthrough_missions) ? data.walkthrough_missions : Object.values(data.walkthrough_missions)) : [];
    if (rawMissions.length > 0) {
        html += `
        <section class="category-section">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>📖 Story Operations & Quests (${rawMissions.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${rawMissions.map(m => `
                        <div class="trophy-card game-item-card" data-id="${m.id}" data-type="mission">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <span class="trophy-rank rank-gold">${escapeHtml(m.region || 'Campaign')}</span>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(m.mission_name || m.title)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${m.id}', 'mission')" aria-label="Toggle Mission"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(m.guide || '')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // Render Stashes / Treasure Hunts
    const stashesSource = data.prepper_stashes || data.treasure_hunts;
    if (stashesSource && typeof stashesSource === 'object') {
        Object.entries(stashesSource).forEach(([regKey, rawList]) => {
            const list = Array.isArray(rawList) ? rawList : (rawList ? Object.values(rawList) : []);
            if (list.length > 0) {
                html += `
                <section class="category-section">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>📦 Prepper Stashes & Hunts — ${escapeHtml(regKey.replace(/_/g, ' ').toUpperCase())} (${list.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${list.map(s => `
                                <div class="trophy-card game-item-card" data-id="${s.id}" data-type="stash">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div>
                                            <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'Reward')}</span>
                                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(s.name)}</h3>
                                            <div style="font-size:0.75rem; color:var(--user-theme-accent);">${escapeHtml(s.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${s.id}', 'stash')" aria-label="Toggle Stash"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(s.guide || s.solution || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        });
    }

    // Render Dynamic Collectibles
    if (data.collectibles && typeof data.collectibles === 'object') {
        for (const cKey in data.collectibles) {
            const group = data.collectibles[cKey];
            const rawItems = group?.items ? (Array.isArray(group.items) ? group.items : Object.values(group.items)) : [];
            if (rawItems.length > 0) {
                const groupTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(groupTitle)} (${rawItems.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${rawItems.map(item => `
                                <div class="trophy-card game-item-card" data-id="${item.id}" data-type="collectible" data-group="${cKey}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || group.region || '')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name || item.track_name || '')}</h3>
                                            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(item.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}', 'collectible', '${cKey}')" aria-label="Toggle Collectible"></button>
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

    // Render Master Trophies
    const trophyEntries = Object.entries(appState.trophies);
    if (trophyEntries.length > 0) {
        html += `
        <section class="category-section">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 Trophies & Achievements (${trophyEntries.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${trophyEntries.map(([tKey, t]) => {
                        const tIcon = toSecureUrl(t.icon || '');
                        const tType = (t.rank || 'Bronze').toUpperCase();
                        let badgeClass = 'rank-bronze';
                        if (tType.includes('PLATINUM')) badgeClass = 'rank-platinum';
                        else if (tType.includes('GOLD')) badgeClass = 'rank-gold';
                        else if (tType.includes('SILVER')) badgeClass = 'rank-silver';

                        return `
                        <div class="trophy-card game-item-card" data-id="${tKey}" data-type="trophy">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${tIcon ? `<img src="${tIcon}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
                                    <div>
                                        <span class="trophy-rank ${badgeClass}">${escapeHtml(tType)}</span>
                                        <h3 style="color:#fff; font-size:0.95rem; margin-top:2px;">${escapeHtml(t.name)}</h3>
                                    </div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${tKey}', 'trophy')" aria-label="Toggle Trophy"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(t.description)}</p>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </section>`;
    }

    container.innerHTML = html;
    appState.applyStateToUI();
}

function toSecureUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('/')) return trimmed;
    if (trimmed.startsWith('http://static-resource.np.community.playstation.net/')) {
        return trimmed.replace('http://static-resource.np.community.playstation.net/', 'https://static-resource.np.community.playstation.net/');
    }
    if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//i, 'https://');
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

// Section 8: Universal Initialization
async function initUniversalEngine() {
    const gameKey = CURRENT_GAME_KEY;
    appState.updateStatus(`Querying RTDB: /games/${gameKey}...`);

    const platformSelector = document.getElementById('platformSelector');
    if (platformSelector) {
        platformSelector.addEventListener('change', (e) => {
            appState.switchPlatform(e.target.value, true);
        });
    }

    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Guerilla Member';

                const emailKey = user.email.replace(/@/g, '_at_').replace(/\./g, '_');
                try {
                    const snap = await rtdb.ref(`/users/${emailKey}`).once('value');
                    const uData = snap.val() || {};
                    appState.myFriendCode = uData.friend_code || null;
                    appState.psnGamertag = uData.psn_username || null;
                    if (uData.pinned_platform) {
                        await appState.switchPlatform(uData.pinned_platform.toLowerCase(), false);
                    }
                } catch (e) {}

                if (appState.gameData) {
                    await appState.loadProgress();
                    if (appState.platform === 'ps' && appState.psnGamertag) {
                        await autoCheckUserPsnTrophies();
                    }
                }
            } else {
                appState.currentUser = null;
                appState.psnGamertag = null;
                if (appState.gameData) appState.loadProgress();
            }
        });
    }

    // PRIMARY READ: Pull dynamic game from RTDB /games/{gameKey}
    if (rtdb) {
        try {
            const snap = await rtdb.ref(`/games/${gameKey}`).once('value');
            const data = snap.val();
            if (data) {
                appState.hydrateFromRawJson(data);
                appState.updateStatus(`[Connected] Loaded authoritative game data for /games/${gameKey}`);
                renderUniversalCompanion(data);
                appState.loadProgress();
                return;
            }
        } catch (err) {
            console.warn("[RTDB Load Error]:", err);
        }
    }

    appState.updateStatus(`[Error] Game '/games/${gameKey}' not found in RTDB.`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUniversalEngine);
} else {
    initUniversalEngine();
}
