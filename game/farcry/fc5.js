// ============================================================================
// * Project: Far Cry 5 Hope County Resistance Companion & Field Ledger
// * File: fc5.js
// * Location: /game/farcry/fc5.js
// * Build Version: v10.1.0-COTW-STRUCTURAL-ALIGNMENT
// * Deployment Timestamp: 2026-10-28 04:11:00 EDT (America/New_York)
// ============================================================================

// Section 1: Authoritative Firebase Engine Initialization
// Lines 10-34: Configuration bindings for entertainment-71888
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

const CURRENT_GAME_ID = "FarCry5";
let ACTIVE_COMM_ID = "NPWR12514_00";

// Section 2: Global State Engine & Dynamic Multi-Platform Store
// Lines 37-330: Dynamic item hydration and multi-platform isolation
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'pc', 'xbox', 'steam'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    psnGamertag: null,
    authInitialized: false,
    
    // Authoritative Root Document State
    activeMission: "Hope County Resistance",
    gameId: CURRENT_GAME_ID,
    trophies_earned: 0,
    trophies_total: 0,
    trophies_percent: 0,
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },

    getUserKey: function() {
        if (this.myFriendCode) return this.myFriendCode;
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
        
        // Multi-Platform Isolation: Load isolated progress for target platform
        this.loadProgress();
        if (this.currentUser) {
            this.syncFriendsProgress();
            if (this.platform === 'ps' && this.psnGamertag) {
                autoCheckUserPsnTrophies();
            }
        }
    },

    // Lines 86-215: Additive Schema Hydration (No hardcoded collectible limits)
    hydrateFromRawJson: function(data) {
        if (!data || typeof data !== 'object') return;
        this.gameData = data;

        if (data.psn_communication_id) {
            ACTIVE_COMM_ID = data.psn_communication_id;
        }

        // 1. Dynamic Collectibles Sets (Supports any custom key added to JSON)
        if (data.collectibles && typeof data.collectibles === 'object') {
            for (const cKey in data.collectibles) {
                const group = data.collectibles[cKey];
                const totalItems = (group && Array.isArray(group.items)) ? group.items.length : 0;

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
                        region: group.region || 'Hope County',
                        items: {}
                    };
                } else {
                    this.collectibles[cKey].total = totalItems;
                    this.collectibles[cKey].quest_name = group.quest_name || this.collectibles[cKey].quest_name;
                    this.collectibles[cKey].quest_giver = group.quest_giver || this.collectibles[cKey].quest_giver;
                    this.collectibles[cKey].quest_giver_location = group.quest_giver_location || this.collectibles[cKey].quest_giver_location;
                    this.collectibles[cKey].required_perk = group.required_perk || this.collectibles[cKey].required_perk;
                    if (!this.collectibles[cKey].items) this.collectibles[cKey].items = {};
                }

                if (group && Array.isArray(group.items)) {
                    group.items.forEach(cItem => {
                        if (!cItem || !cItem.id) return;
                        if (!this.collectibles[cKey].items[cItem.id]) {
                            this.collectibles[cKey].items[cItem.id] = {
                                collected: false,
                                name: cItem.name || '',
                                region: cItem.region || group.region || 'Hope County',
                                location: cItem.location || '',
                                guide: cItem.guide || '',
                                psnSynced: false
                            };
                        } else {
                            // Update display metadata without overriding completion status
                            this.collectibles[cKey].items[cItem.id].name = cItem.name || this.collectibles[cKey].items[cItem.id].name;
                            this.collectibles[cKey].items[cItem.id].region = cItem.region || this.collectibles[cKey].items[cItem.id].region;
                            this.collectibles[cKey].items[cItem.id].location = cItem.location || this.collectibles[cKey].items[cItem.id].location;
                            this.collectibles[cKey].items[cItem.id].guide = cItem.guide || this.collectibles[cKey].items[cItem.id].guide;
                        }
                    });
                }
            }
        }

        // 2. Perk & Survivalist Magazines
        if (data.survivalist_magazines && typeof data.survivalist_magazines === 'object') {
            if (!this.collectibles.survivalist_magazines) {
                this.collectibles.survivalist_magazines = {
                    collected: false,
                    count: 0,
                    psnSynced: false,
                    total: 0,
                    quest_name: "Survivalist Magazines",
                    items: {}
                };
            }
            let magTotal = 0;
            Object.entries(data.survivalist_magazines).forEach(([regKey, list]) => {
                if (Array.isArray(list)) {
                    magTotal += list.length;
                    list.forEach((m, idx) => {
                        const mId = m.id || `mag_${regKey}_${idx}`;
                        if (!this.collectibles.survivalist_magazines.items[mId]) {
                            this.collectibles.survivalist_magazines.items[mId] = {
                                collected: false,
                                name: m.name || `Perk Magazine ${idx + 1}`,
                                region: regKey,
                                location: m.location || '',
                                guide: m.guide || '',
                                psnSynced: false
                            };
                        } else {
                            this.collectibles.survivalist_magazines.items[mId].name = m.name || this.collectibles.survivalist_magazines.items[mId].name;
                            this.collectibles.survivalist_magazines.items[mId].location = m.location || this.collectibles.survivalist_magazines.items[mId].location;
                            this.collectibles.survivalist_magazines.items[mId].guide = m.guide || this.collectibles.survivalist_magazines.items[mId].guide;
                        }
                    });
                }
            });
            this.collectibles.survivalist_magazines.total = magTotal;
        }

        // 3. Prepper Stashes
        if (data.prepper_stashes && typeof data.prepper_stashes === 'object') {
            Object.entries(data.prepper_stashes).forEach(([regKey, list]) => {
                if (Array.isArray(list)) {
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
                            this.stashes[s.id].required_gear = s.required_gear || this.stashes[s.id].required_gear;
                            this.stashes[s.id].location = s.location || this.stashes[s.id].location;
                            this.stashes[s.id].guide = s.guide || this.stashes[s.id].guide;
                        }
                    });
                }
            });
        }

        // 4. Roster (Guns & Fangs for Hire)
        if (Array.isArray(data.guns_and_fangs_for_hire)) {
            data.guns_and_fangs_for_hire.forEach(h => {
                if (!h || !h.id) return;
                if (!this.roster[h.id]) {
                    this.roster[h.id] = {
                        unlocked: false,
                        name: h.name || '',
                        title: h.title || '',
                        type: h.type || 'Specialist',
                        unlock_mission: h.unlock_mission || '',
                        location: h.location || 'Hope County',
                        psnSynced: false
                    };
                } else {
                    this.roster[h.id].name = h.name || this.roster[h.id].name;
                    this.roster[h.id].title = h.title || this.roster[h.id].title;
                    this.roster[h.id].type = h.type || this.roster[h.id].type;
                    this.roster[h.id].unlock_mission = h.unlock_mission || this.roster[h.id].unlock_mission;
                    this.roster[h.id].location = h.location || this.roster[h.id].location;
                }
            });
        }

        // 5. Story Campaign & Side Walkthrough Missions
        if (Array.isArray(data.walkthrough_missions)) {
            data.walkthrough_missions.forEach(m => {
                if (!m || !m.id) return;
                if (!this.missions[m.id]) {
                    this.missions[m.id] = {
                        completed: false,
                        mission_name: m.mission_name || '',
                        region: m.region || 'Hope County',
                        guide: m.guide || '',
                        psnSynced: false
                    };
                } else {
                    this.missions[m.id].mission_name = m.mission_name || this.missions[m.id].mission_name;
                    this.missions[m.id].region = m.region || this.missions[m.id].region;
                    this.missions[m.id].guide = m.guide || this.missions[m.id].guide;
                }
            });
        }

        this.recalculateMetrics();
    },

    // Lines 218-280: Synchronize Base Trophy Skeleton from RTDB /psn/games/{commId}
    hydrateTrophiesFromSkeleton: function(skeleton) {
        if (!skeleton) return;
        this.psnSkeleton = skeleton;

        const rawList = skeleton.trophies 
            ? (Array.isArray(skeleton.trophies) ? skeleton.trophies : Object.values(skeleton.trophies))
            : [];

        rawList.forEach((t, idx) => {
            if (!t) return;
            const tId = t.trophyId !== undefined ? t.trophyId : idx;
            const cardKey = `trophy_fc5_${tId}`;

            if (!this.trophies[cardKey]) {
                this.trophies[cardKey] = {
                    earned: false,
                    name: t.name || t.trophyName || t.title || 'Trophy',
                    rank: (t.rank || t.type || t.trophyType || 'Bronze').toUpperCase(),
                    description: t.description || t.detail || '',
                    icon: toSecureUrl(t.icon || t.trophyIconUrl || ''),
                    trophyId: tId,
                    psnSynced: false
                };
            } else {
                this.trophies[cardKey].name = t.name || t.trophyName || this.trophies[cardKey].name;
                this.trophies[cardKey].rank = (t.rank || t.type || this.trophies[cardKey].rank).toUpperCase();
                this.trophies[cardKey].description = t.description || t.detail || this.trophies[cardKey].description;
                if (t.icon) this.trophies[cardKey].icon = toSecureUrl(t.icon);
            }
        });

        this.recalculateMetrics();
    },

    recalculateMetrics: function() {
        let stashesCount = 0;
        let rosterCount = 0;
        let perksCount = 0;
        let totalCollectiblesCount = 0;
        let calculatedRP = 0;

        Object.values(this.stashes).forEach(s => {
            if (s && s.collected) {
                stashesCount++;
                calculatedRP += 400;
            }
        });

        Object.values(this.roster).forEach(h => {
            if (h && h.unlocked) {
                rosterCount++;
                calculatedRP += 600;
            }
        });

        Object.values(this.missions).forEach(m => {
            if (m && m.completed) {
                calculatedRP += 600;
            }
        });

        if (this.collectibles) {
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
            if (this.collectibles.survivalist_magazines) {
                perksCount = this.collectibles.survivalist_magazines.count || 0;
            }
        }

        const earnedTrophies = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophies = Object.keys(this.trophies).length || 51;
        this.trophies_earned = earnedTrophies;
        this.trophies_total = totalTrophies;
        this.trophies_percent = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

        this.ranks.stashes = stashesCount;
        this.ranks.roster = rosterCount;
        this.ranks.perks = perksCount;
        this.ranks.collectibles = totalCollectiblesCount;
        this.ranks.rp = calculatedRP;

        this.updateRankDisplay('stashes', stashesCount);
        this.updateRankDisplay('roster', rosterCount);
        this.updateRankDisplay('perks', perksCount);
        this.updateRankDisplay('collectibles', totalCollectiblesCount);
        this.updateRankDisplay('rp', calculatedRP);
    },

    updateRankDisplay: function(rankKey, val) {
        const el = document.getElementById(`rank-val-${rankKey}`);
        if (el) el.innerText = val || 0;
    },

    buildPayload: function() {
        this.recalculateMetrics();
        return {
            activeMission: this.activeMission,
            gameId: CURRENT_GAME_ID,
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

    // Lines 305-345: Bidirectional Merging with Firestore
    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        this.activeMission = payload.activeMission || "Hope County Resistance";
        this.trophies_earned = payload.trophies_earned || 0;
        this.trophies_total = payload.trophies_total || this.trophies_total;
        this.trophies_percent = payload.trophies_percent || 0;
        
        // Merge Collectibles (preserves user checks while keeping new items from JSON)
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
                                // Restoration: Item was present in Firestore ledger, preserve it
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

// Section 3: Authoritative Persistence Engine & Firestore Seeder
// Lines 348-435: users/{friendKey}/platform/{platform}/game/FarCry5
window.appState.saveProgress = function() {
    const payload = this.buildPayload();
    const userKey = this.getUserKey();

    if (!userKey) {
        const guestKey = `fc5_guest_progress_${this.platform}`;
        try {
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress cached locally [${this.platform.toUpperCase()}].`);
        } catch (e) {
            console.warn("[Guest Storage]:", e);
        }
        return;
    }

    if (firestore) {
        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("game")
            .doc(CURRENT_GAME_ID);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] users/${userKey}/platform/${this.platform}/game/${CURRENT_GAME_ID}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
            this.updateStatus(`Cloud Sync Failed: ${err.message}`);
        });
    }
};

window.appState.loadProgress = function() {
    const userKey = this.getUserKey();
    
    // Always re-hydrate from active JSON and trophy skeleton to catch new items
    if (this.gameData) this.hydrateFromRawJson(this.gameData);
    if (this.psnSkeleton) this.hydrateTrophiesFromSkeleton(this.psnSkeleton);

    if (!userKey) {
        const guestKey = `fc5_guest_progress_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.applyPayload(parsed);
                this.updateStatus(`[Guest Mode] Restored progress from this device [${this.platform.toUpperCase()}].`);
                return;
            }
        } catch (e) {}

        this.applyStateToUI();
        this.updateStatus(`[Guest Mode] Clean Ledger [${this.platform.toUpperCase()}].`);
        return;
    }

    if (firestore) {
        this.updateStatus(`Reading cloud ledger: users/${userKey}/platform/${this.platform.toUpperCase()}...`);

        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("game")
            .doc(CURRENT_GAME_ID);

        docRef.get().then(doc => {
            if (doc.exists) {
                const cloudData = doc.data();
                this.applyPayload(cloudData);
                // Push any new items discovered in JSON into Firestore immediately
                this.saveProgress();
                this.updateStatus(`[Cloud Synced] users/${userKey}/platform/${this.platform}/game/${CURRENT_GAME_ID}`);
            } else {
                // Initial creation: Seed full schema parsed from JSON into Firestore
                this.applyStateToUI();
                this.saveProgress();
                this.updateStatus(`[Cloud Seeded] Pushed full game ledger to Firestore: users/${userKey}`);
            }
        }).catch(err => {
            console.warn("[Firestore Fetch Error]:", err);
            this.updateStatus(`Failed to read cloud save: ${err.message}`);
        });
    }
};

window.appState.migrateGuestProgressIfPresent = async function() {
    const userKey = this.getUserKey();
    if (!userKey) return;

    const guestKey = `fc5_guest_progress_${this.platform}`;
    let guestData = null;

    try {
        const raw = localStorage.getItem(guestKey);
        if (raw) guestData = JSON.parse(raw);
    } catch (e) {}

    if (guestData && (
        (guestData.ranks && guestData.ranks.rp > 0) ||
        Object.keys(guestData.stashes || {}).length > 0 ||
        Object.keys(guestData.collectibles || {}).length > 0 ||
        Object.keys(guestData.missions || {}).length > 0
    )) {
        this.updateStatus("Importing guest checks to your Cloud Ledger...");
        this.applyPayload(guestData);
        this.saveProgress();

        localStorage.removeItem(guestKey);
        this.updateStatus("Guest checks successfully synced to your cloud account.");
    }
};

// Section 4: UI Painting & Toggle Interactions
// Lines 438-515: Maps card clicks and updates state
window.appState.applyStateToUI = function() {
    this.recalculateMetrics();

    document.querySelectorAll('.fc5-item-card').forEach(card => {
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
        } else if (type === 'magazine') {
            if (this.collectibles.survivalist_magazines?.items?.[id]) {
                isDone = !!(this.collectibles.survivalist_magazines.items[id].collected);
            }
        } else if (type === 'trophy') {
            isDone = !!(this.trophies[id]?.earned);
        } else {
            isDone = !!(this.missions[id]?.completed);
        }

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
    } else if (type === 'magazine') {
        if (this.collectibles.survivalist_magazines?.items?.[itemId]) {
            this.collectibles.survivalist_magazines.items[itemId].collected = !this.collectibles.survivalist_magazines.items[itemId].collected;
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

window.adjRank = function(rankKey, delta) {
    if (!appState.ranks) appState.ranks = {};
    const current = Number(appState.ranks[rankKey] || 0);
    const nextVal = Math.max(0, current + delta);
    appState.ranks[rankKey] = nextVal;
    appState.updateRankDisplay(rankKey, nextVal);
    appState.saveProgress();
};

// Section 5: Squad Co-Op Bridge via RTDB Friend Codes
// Lines 518-595: Isolated query of friends' progress matching active platform
window.appState.fetchUserFriendCode = async function() {
    if (!this.currentUser || !this.currentUser.email || !rtdb) return;
    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    try {
        const snap = await rtdb.ref(`/users/${emailKey}/friend_code`).once('value');
        this.myFriendCode = snap.val() || 'GQGI0SWY';
        const display = document.getElementById('myFriendCodeDisplay');
        if (display) display.innerText = this.myFriendCode;

        // Strictly verify if an authenticated PSN Gamertag is registered
        const psnSnap = await rtdb.ref(`/users/${emailKey}/psn_username`).once('value');
        if (psnSnap.exists() && psnSnap.val()) {
            this.psnGamertag = String(psnSnap.val()).trim();
        } else {
            this.psnGamertag = null;
        }
    } catch (e) {
        console.warn("[Friend Code Fetch Error]:", e);
    }
};

window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    if (!rosterContainer) return;

    if (!this.currentUser || !this.currentUser.email || !rtdb) {
        rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
        return;
    }

    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');

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
            const friendTargetKey = fObj.friend_code || (fObj.email ? fObj.email.replace(/@/g, '_at_').replace(/\./g, '_') : fKey);

            let friendData = null;
            if (firestore) {
                try {
                    const fDoc = await firestore
                        .collection("users")
                        .doc(friendTargetKey)
                        .collection("platform")
                        .doc(this.platform)
                        .collection("game")
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
};

// Section 6: Dynamic Header & Programmatic Navbar (/utm_links)
// Lines 598-685: Sort-weighted top-level and dropdown menu generation
async function buildUtmNavigation() {
    const navContainer = document.getElementById('dynamicNavLinks');
    if (!rtdb) return;

    try {
        const snap = await rtdb.ref('/utm_links').once('value');
        const data = snap.val();
        if (!data) return;

        const settingsLogo = data?.Settings?.[0]?.image || data?.Settings?.image;
        if (settingsLogo) {
            const logoUrl = toSecureUrl(settingsLogo);
            const fav1 = document.getElementById('dynamicFavicon');
            const fav2 = document.getElementById('dynamicAppleIcon');
            const navLogo = document.getElementById('navHeaderLogo');
            if (fav1) fav1.href = logoUrl;
            if (fav2) fav2.href = logoUrl;
            if (navLogo) navLogo.src = logoUrl;
        }

        if (!navContainer) return;

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
        console.warn("[UTM Navigation Fetch Error]:", e);
    }
}

// Section 7: PSN Master Skeleton & Telemetry Auto-Check
// Lines 688-775: CommID telemetry from /psn/gamertags/{tag}/liveTrophyProgress/{commId}
async function syncPsnSkeleton() {
    if (!rtdb) return;
    const commId = ACTIVE_COMM_ID;

    try {
        // 1. Fetch master trophy structure from RTDB (static game ledger has no trophies)
        const snap = await rtdb.ref(`/psn/games/${commId}`).once('value');
        const skeleton = snap.val();
        if (skeleton) {
            appState.hydrateTrophiesFromSkeleton(skeleton);
            renderFarCry5Companion(appState.gameData);

            const posterUrl = toSecureUrl(skeleton.posterArt);
            if (posterUrl) {
                const fav1 = document.getElementById('dynamicFavicon');
                const fav2 = document.getElementById('dynamicAppleIcon');
                const navLogo = document.getElementById('navHeaderLogo');
                if (fav1 && !fav1.href.includes('/utm_links/')) fav1.href = posterUrl;
                if (fav2 && !fav2.href.includes('/utm_links/')) fav2.href = posterUrl;
                if (navLogo && !navLogo.src.includes('/utm_links/')) navLogo.src = posterUrl;
            }
        }

        // 2. Dynamic Favicon from linked user's recentGames (if registered)
        if (appState.psnGamertag) {
            const recentSnap = await rtdb.ref(`/psn/gamertags/${appState.psnGamertag}/recentGames`).once('value');
            const recentGames = recentSnap.val();
            if (Array.isArray(recentGames) && recentGames.length > 0) {
                const matchedGame = recentGames.find(g => g && (g.npCommunicationId === commId || g.npTitleId === commId)) || recentGames[0];
                if (matchedGame && matchedGame.imageUrl) {
                    const posterUrl = toSecureUrl(matchedGame.imageUrl);
                    const fav1 = document.getElementById('dynamicFavicon');
                    const fav2 = document.getElementById('dynamicAppleIcon');
                    const navLogo = document.getElementById('navHeaderLogo');
                    if (fav1) fav1.href = posterUrl;
                    if (fav2) fav2.href = posterUrl;
                    if (navLogo) navLogo.src = posterUrl;
                }
            }
        }

        // 3. Auto-check trophies ONLY if platform is PS and an account is explicitly linked
        if (appState.platform === 'ps' && appState.psnGamertag) {
            await autoCheckUserPsnTrophies();
        }
    } catch (e) {
        console.warn("[PSN Skeleton Sync Error]:", e);
    }
}

async function autoCheckUserPsnTrophies() {
    if (!rtdb || !appState.psnGamertag || appState.platform !== 'ps') return;
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
                const cardKey = `trophy_fc5_${parsedId}`;
                const isEarnedInPsn = (tObj.earned === true || tObj.isEarned === true);

                if (!appState.trophies[cardKey]) {
                    appState.trophies[cardKey] = {
                        earned: isEarnedInPsn,
                        name: tObj.name || tObj.title || tObj.gameTitle || 'Trophy',
                        rank: (tObj.rank || tObj.type || tObj.difficultyTier || 'Bronze').toUpperCase(),
                        description: tObj.description || '',
                        icon: toSecureUrl(tObj.icon || ''),
                        psnSynced: isEarnedInPsn
                    };
                    stateModified = true;
                } else {
                    if (tObj.name) appState.trophies[cardKey].name = tObj.name;
                    if (tObj.icon) appState.trophies[cardKey].icon = toSecureUrl(tObj.icon);
                    if (tObj.description) appState.trophies[cardKey].description = tObj.description;

                    if (isEarnedInPsn && !appState.trophies[cardKey].earned) {
                        appState.trophies[cardKey].earned = true;
                        appState.trophies[cardKey].psnSynced = true;
                        stateModified = true;
                    }
                }
            }

            if (stateModified) {
                appState.applyStateToUI();
                appState.saveProgress();
                appState.updateStatus(`[PSN Live Synced] Telemetry bound from ${gamertag}/${commId}`);
            }
        }
    } catch (e) {
        console.warn("[Live Trophy Auto-Check Error]:", e);
    }
}

// Section 8: Universal Section Renderer
// Lines 778-985: Automatically renders any new category added to farcry5.json
function renderFarCry5Companion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // 8A. Story Campaign & Side Walkthrough Missions
    if (Array.isArray(data.walkthrough_missions) && data.walkthrough_missions.length > 0) {
        html += `
        <section class="category-section" id="cat-walkthroughs">
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

    // 8B. Prepper Stashes by Region
    if (data.prepper_stashes && typeof data.prepper_stashes === 'object') {
        Object.entries(data.prepper_stashes).forEach(([regKey, list]) => {
            if (Array.isArray(list) && list.length > 0) {
                const regionName = regKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section" id="cat-stash-${regKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>📦 Prepper Stashes — ${escapeHtml(regionName)} (${list.length})</h2>
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

    // 8C. Perk & Survivalist Magazines
    if (data.survivalist_magazines && typeof data.survivalist_magazines === 'object') {
        let totalMags = 0;
        Object.values(data.survivalist_magazines).forEach(l => { if (Array.isArray(l)) totalMags += l.length; });

        if (totalMags > 0) {
            html += `
            <section class="category-section" id="cat-magazines">
                <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                    <h2>📚 Survivalist & Perk Magazines (${totalMags})</h2>
                    <span>▾</span>
                </div>
                <div class="section-content">
                    <div class="trophy-grid">
                        ${Object.entries(data.survivalist_magazines).flatMap(([regKey, list]) => 
                            (Array.isArray(list) ? list : []).map((m, idx) => {
                                const mId = m.id || `mag_${regKey}_${idx}`;
                                return `
                                    <div class="trophy-card fc5-item-card" data-id="${mId}" data-type="magazine">
                                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                            <div>
                                                <span class="trophy-rank rank-bronze">${escapeHtml(regKey.replace(/_/g, ' ').toUpperCase())}</span>
                                                <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(m.name || `Perk Magazine ${idx + 1}`)}</h3>
                                                <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(m.location || '')}</div>
                                            </div>
                                            <button type="button" class="check-btn" onclick="appState.toggleItem('${mId}', 'magazine')" aria-label="Toggle Magazine"></button>
                                        </div>
                                        <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(m.guide || '')}</p>
                                    </div>
                                `;
                            })
                        ).join('')}
                    </div>
                </div>
            </section>`;
        }
    }

    // 8D. Universal Collectibles Sets (Renders all keys present in data.collectibles)
    if (data.collectibles && typeof data.collectibles === 'object') {
        for (const cKey in data.collectibles) {
            const group = data.collectibles[cKey];
            if (group && Array.isArray(group.items) && group.items.length > 0) {
                const groupTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section" id="cat-col-${cKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(groupTitle)} (${group.items.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        ${(group.quest_giver || group.required_perk) ? `
                            <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; border-left:3px solid var(--user-theme-accent);">
                                ${group.quest_giver ? `<strong>Quest Giver:</strong> ${escapeHtml(group.quest_giver)} &bull; ` : ''}
                                ${group.quest_giver_location ? `<strong>Location:</strong> ${escapeHtml(group.quest_giver_location)}` : ''}
                                ${group.required_perk ? ` &bull; <strong>Required Perk:</strong> <span style="color:#38bdf8;">${escapeHtml(group.required_perk)}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="trophy-grid">
                            ${group.items.map(item => `
                                <div class="trophy-card fc5-item-card" data-id="${item.id}" data-type="collectible" data-group="${cKey}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || group.region || 'Hope County')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name)}</h3>
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

    // 8E. Guns & Fangs for Hire Roster
    if (Array.isArray(data.guns_and_fangs_for_hire) && data.guns_and_fangs_for_hire.length > 0) {
        html += `
        <section class="category-section" id="cat-roster">
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
                                    <div style="font-size:0.8rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(h.title || '')}</div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${h.id}', 'roster')" aria-label="Toggle Hire"></button>
                            </div>
                            <div style="font-size:0.78rem; color:#cbd5e1; margin-bottom:8px;">
                                <strong>Unlock Mission:</strong> ${escapeHtml(h.unlock_mission)} (${escapeHtml(h.location || 'Hope County')})
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 8F. Official PSN Master Trophies & Achievements (Sourced via RTDB /psn/games/{commId})
    const trophyEntries = Object.entries(appState.trophies);
    if (trophyEntries.length > 0) {
        html += `
        <section class="category-section" id="cat-trophies">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 Trophies & Achievements (${trophyEntries.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${trophyEntries.map(([tKey, t]) => {
                        const tName = t.name || 'Trophy';
                        const tDesc = t.description || '';
                        const tIcon = toSecureUrl(t.icon || '');
                        const tType = (t.rank || 'Bronze').toUpperCase();

                        let badgeClass = 'rank-bronze';
                        if (tType.includes('PLATINUM')) badgeClass = 'rank-platinum';
                        else if (tType.includes('GOLD')) badgeClass = 'rank-gold';
                        else if (tType.includes('SILVER')) badgeClass = 'rank-silver';

                        return `
                        <div class="trophy-card fc5-item-card" data-id="${tKey}" data-type="trophy">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${tIcon ? `<img src="${tIcon}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'">` : ''}
                                    <div>
                                        <span class="trophy-rank ${badgeClass}">${escapeHtml(tType)}</span>
                                        <h3 style="color:#fff; font-size:0.95rem; margin-top:2px;">${escapeHtml(tName)}</h3>
                                    </div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${tKey}', 'trophy')" aria-label="Toggle Trophy"></button>
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

// Section 9: Sanitization & URL Normalization
// Lines 988-1010: Relative protocol and PSN asset sanitization
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

// Section 10: Dynamic JSON Loader with Cache-Busting & Lifecycle Gate
// Lines 1013-1130: Bypasses browser cache, renders items, and binds auth
async function initFarCry5Engine() {
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

    // Auth State Observer
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

                await appState.fetchUserFriendCode();
                if (appState.gameData) {
                    await appState.loadProgress();
                    await appState.migrateGuestProgressIfPresent();
                    await appState.syncFriendsProgress();
                    if (appState.platform === 'ps' && appState.psnGamertag) {
                        await autoCheckUserPsnTrophies();
                    }
                }
            } else {
                appState.currentUser = null;
                appState.activeEmail = null;
                appState.activeUser = 'Guest';
                appState.psnGamertag = null;

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `GUEST [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');

                if (appState.gameData) appState.loadProgress();
            }
        });
    }

    // Dynamic Cache-Buster Time parameter: guarantees freshly added JSON items load instantly
    const cacheBuster = `?cb=${Date.now()}`;
    const jsonCandidates = [
        `./farcry5.json${cacheBuster}`,
        `/game/farcry/farcry5.json${cacheBuster}`,
        `./data/farcry5.json${cacheBuster}`,
        `/game/data/farcry5.json${cacheBuster}`,
        `//raw.githubusercontent.com/Werewolf3788/Website/main/game/farcry/farcry5.json${cacheBuster}`,
        `//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/farcry5.json${cacheBuster}`
    ];

    const fetchJson = async (idx) => {
        if (idx < jsonCandidates.length) {
            try {
                const res = await fetch(jsonCandidates[idx]);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const fullJson = await res.json();
                
                appState.hydrateFromRawJson(fullJson);
                appState.updateStatus(`[Hydrated] Loaded freshly from ${jsonCandidates[idx]}`);
                
                // Fetch trophy skeleton from RTDB and render UI
                await syncPsnSkeleton();
                renderFarCry5Companion(fullJson);
                appState.loadProgress();
                return;
            } catch (err) {
                fetchJson(idx + 1);
                return;
            }
        }

        // Final failover: Check RTDB for fallback ledger
        if (rtdb) {
            try {
                const rtdbSnap = await rtdb.ref('/game_data/farcry5').once('value');
                const rtdbJson = rtdbSnap.val();
                if (rtdbJson) {
                    appState.hydrateFromRawJson(rtdbJson);
                    appState.updateStatus("[Hydrated] Loaded game data from RTDB.");
                    await syncPsnSkeleton();
                    renderFarCry5Companion(rtdbJson);
                    appState.loadProgress();
                    return;
                }
            } catch (e) {}
        }

        appState.updateStatus("[Error] Unable to load farcry5.json. Verify file is in /game/farcry/.");
    };

    fetchJson(0);
}

// Universal Self-Starting Execution Gate
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFarCry5Engine);
} else {
    initFarCry5Engine();
}
