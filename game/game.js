// ============================================================================
// * Project: Universal Multi-Game Resistance Companion & Field Ledger
// * File: game.js
// * Location: /game/game.js
// * Build Version: v10.6.0-FRIEND-CODE-PERSISTENCE
// * Deployment Timestamp: 2026-10-27 02:31:00 EDT (America/New_York)
// ============================================================================

// Section 1: Authoritative Firebase Credentials & Services
// Lines 10-34: Cloud configuration bound to entertainment-71888
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
    console.warn("[Auth Persistence]:", e);
}

// Global cache for friends' progress to paint item tags on cards
window.squadProgressCache = {};

// Section 2: Universal Global State Engine
// Lines 37-295: Dynamic game context and friend-code-keyed structures
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'pc', 'xbox', 'steam'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    myPsnGamertag: null,
    myPsnAccountId: null,
    isCloudLoaded: false, // Critical write-protection gate
    
    // Active game anchors populated dynamically from the JSON
    activeGame: "Far Cry 5",
    activeGameId: "FarCry5",
    activePsnCommId: "NPWR12514_00",
    activeMission: "Hope County Resistance",

    trophies_earned: 0,
    trophies_total: 51,
    trophies_percent: 0,
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },

    getEmailKey: function() {
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    switchPlatform: async function(newPlatform) {
        if (!newPlatform) return;
        this.platform = newPlatform.toLowerCase();
        this.isCloudLoaded = false;
        
        const platformSelector = document.getElementById('platformSelect') || document.getElementById('platformSelector');
        if (platformSelector && platformSelector.value !== this.platform) {
            platformSelector.value = this.platform;
        }

        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }
        
        await this.loadProgress();
        if (this.currentUser) {
            await this.syncFriendsProgress();
        }
    },

    hydrateDefaultSchema: function() {
        if (!this.gameData) return;

        // 1. Collectibles
        if (this.gameData.collectibles) {
            for (const cKey in this.gameData.collectibles) {
                const group = this.gameData.collectibles[cKey];
                const totalItems = (group && Array.isArray(group.items)) ? group.items.length : 0;
                
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = {
                        collected: false,
                        count: 0,
                        psnSynced: false,
                        total: totalItems,
                        quest_name: group.quest_name || cKey,
                        items: {}
                    };
                }

                if (group && Array.isArray(group.items)) {
                    group.items.forEach(cItem => {
                        if (!this.collectibles[cKey].items[cItem.id]) {
                            this.collectibles[cKey].items[cItem.id] = {
                                collected: false,
                                name: cItem.name || '',
                                region: cItem.region || group.region || 'Hope County',
                                location: cItem.location || '',
                                psnSynced: false
                            };
                        }
                    });
                }
            }
        }

        // Perk Magazines
        if (this.gameData.survivalist_magazines) {
            if (!this.collectibles.survivalist_magazines) {
                this.collectibles.survivalist_magazines = {
                    collected: false,
                    count: 0,
                    psnSynced: false,
                    total: 0,
                    items: {}
                };
            }
            let magTotal = 0;
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.survivalist_magazines[reg] || [];
                magTotal += list.length;
                list.forEach((m, idx) => {
                    const mId = `mag_${reg}_${idx}`;
                    if (!this.collectibles.survivalist_magazines.items[mId]) {
                        this.collectibles.survivalist_magazines.items[mId] = {
                            collected: false,
                            name: m.name || `Perk Magazine ${idx + 1}`,
                            region: reg,
                            psnSynced: false
                        };
                    }
                });
            });
            this.collectibles.survivalist_magazines.total = magTotal;
        }

        // 2. Prepper Stashes
        if (this.gameData.prepper_stashes) {
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.prepper_stashes[reg] || [];
                list.forEach(s => {
                    if (!this.stashes[s.id]) {
                        this.stashes[s.id] = {
                            collected: false,
                            name: s.name || '',
                            region: reg,
                            required_gear: s.required_gear || 'None',
                            location: s.location || '',
                            psnSynced: false
                        };
                    }
                });
            });
        }

        // 3. Roster Map
        if (Array.isArray(this.gameData.guns_and_fangs_for_hire)) {
            this.gameData.guns_and_fangs_for_hire.forEach(h => {
                if (!this.roster[h.id]) {
                    this.roster[h.id] = {
                        unlocked: false,
                        name: h.name || '',
                        type: h.type || 'Specialist',
                        unlock_mission: h.unlock_mission || '',
                        psnSynced: false
                    };
                }
            });
        }

        // 4. Walkthrough Missions Map
        if (Array.isArray(this.gameData.walkthrough_missions)) {
            this.gameData.walkthrough_missions.forEach(m => {
                if (!this.missions[m.id]) {
                    this.missions[m.id] = {
                        completed: false,
                        mission_name: m.mission_name || '',
                        region: m.region || 'Hope County',
                        psnSynced: false
                    };
                }
            });
        }

        // 5. Trophies Map
        const trophySource = (this.psnSkeleton && this.psnSkeleton.trophies) 
            ? Object.values(this.psnSkeleton.trophies) 
            : (this.gameData?.trophies_and_achievements || []);

        if (Array.isArray(trophySource)) {
            trophySource.forEach((t, idx) => {
                const tId = t.trophyId !== undefined ? t.trophyId : idx;
                const cardKey = `trophy_${this.activeGameId}_${tId}`;
                if (!this.trophies[cardKey]) {
                    this.trophies[cardKey] = {
                        earned: false,
                        name: t.name || t.trophyName || 'Trophy',
                        rank: (t.type || t.rank || 'Bronze').toUpperCase(),
                        psnSynced: false
                    };
                }
            });
        }

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
            gameId: this.activeGameId,
            platform: this.platform,
            friend_code: this.myFriendCode,
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
        this.activeMission = payload.activeMission || "Hope County Resistance";
        this.trophies_earned = payload.trophies_earned || 0;
        this.trophies_total = payload.trophies_total || 51;
        this.trophies_percent = payload.trophies_percent || 0;
        
        if (payload.collectibles) {
            for (const cKey in payload.collectibles) {
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = payload.collectibles[cKey];
                } else {
                    this.collectibles[cKey].collected = !!payload.collectibles[cKey].collected;
                    this.collectibles[cKey].count = payload.collectibles[cKey].count || 0;
                    if (payload.collectibles[cKey].items) {
                        this.collectibles[cKey].items = Object.assign({}, this.collectibles[cKey].items, payload.collectibles[cKey].items);
                    }
                }
            }
        }
        if (payload.stashes) this.stashes = Object.assign({}, this.stashes, payload.stashes);
        if (payload.roster) this.roster = Object.assign({}, this.roster, payload.roster);
        if (payload.missions) this.missions = Object.assign({}, this.missions, payload.missions);
        if (payload.trophies) this.trophies = Object.assign({}, this.trophies, payload.trophies);
        if (payload.ranks) this.ranks = Object.assign({}, this.ranks, payload.ranks);

        this.applyStateToUI();
    }
};

// Section 3: Friend-Code-Keyed Firestore Persistence
// Lines 298-410: Eliminates email key mismatches by saving to users/{friend_code}
window.appState.saveProgress = function() {
    const friendCode = this.myFriendCode;

    // 1. Guest Mode: Unauthenticated visitors store strictly to local storage
    if (!friendCode || !this.currentUser) {
        const guestKey = `${this.activeGameId}_guest_progress_${this.platform}`;
        try {
            const payload = this.buildPayload();
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress retained on this device [${this.platform.toUpperCase()}].`);
        } catch (e) {
            console.warn("[Guest Storage]:", e);
        }
        return;
    }

    // 2. Authenticated Mode: Must pass the isCloudLoaded write gate
    if (!this.isCloudLoaded) {
        console.warn("[Write Protected] Save blocked: Waiting for Firestore ledger fetch.");
        return;
    }

    const payload = this.buildPayload();
    if (firestore) {
        // Primary authoritative path: /users/{friend_code}/platform/{platform}/progress/{gameId}
        const docRef = firestore
            .collection("users")
            .doc(friendCode)
            .collection("platform")
            .doc(this.platform)
            .collection("progress")
            .doc(this.activeGameId);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] users/${friendCode}/platform/${this.platform}/progress/${this.activeGameId}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
            this.updateStatus(`Cloud Sync Failed: ${err.message}`);
        });
    }
};

window.appState.loadProgress = async function() {
    const friendCode = this.myFriendCode;
    const emailKey = this.getEmailKey();

    this.hydrateDefaultSchema();

    // 1. Guest Mode
    if (!friendCode || !this.currentUser) {
        const guestKey = `${this.activeGameId}_guest_progress_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.applyPayload(parsed);
                this.updateStatus(`[Guest Mode] Restored progress from this device [${this.platform.toUpperCase()}].`);
                this.isCloudLoaded = true;
                return;
            }
        } catch (e) {}

        this.applyStateToUI();
        this.updateStatus(`[Guest Mode] Clean Ledger [${this.platform.toUpperCase()}].`);
        this.isCloudLoaded = true;
        return;
    }

    // 2. Authenticated Mode: Load from friend_code path with backward-compatible emailKey check
    if (firestore) {
        this.updateStatus(`Reading cloud ledger for ${this.platform.toUpperCase()}...`);

        try {
            // Check friend_code document path first
            let doc = await firestore
                .collection("users")
                .doc(friendCode)
                .collection("platform")
                .doc(this.platform)
                .collection("progress")
                .doc(this.activeGameId)
                .get();

            // Backward compatibility fallback for legacy data stored under emailKey
            if (!doc.exists && emailKey) {
                const legacyDoc = await firestore
                    .collection("users")
                    .doc(emailKey)
                    .collection("platform")
                    .doc(this.platform)
                    .collection("progress")
                    .doc(this.activeGameId)
                    .get();

                if (legacyDoc.exists) {
                    doc = legacyDoc;
                    // Migrate automatically into the friend_code document
                    firestore.collection("users").doc(friendCode).collection("platform").doc(this.platform).collection("progress").doc(this.activeGameId).set(legacyDoc.data(), { merge: true });
                }
            }

            if (doc.exists) {
                const cloudData = doc.data();
                this.applyPayload(cloudData);
                this.isCloudLoaded = true;
                this.updateStatus(`[Cloud Restored] Authoritative ledger loaded [${this.platform.toUpperCase()}].`);
            } else {
                this.applyStateToUI();
                this.isCloudLoaded = true;
                this.saveProgress();
                this.updateStatus(`[Cloud Initialized] Seeded new ledger in Firestore.`);
            }
        } catch (err) {
            console.error("[Firestore Fetch Error]:", err);
            this.isCloudLoaded = true;
            this.updateStatus(`Failed to read cloud save: ${err.message}`);
        }
    }
};

window.appState.migrateGuestProgressIfPresent = async function() {
    const friendCode = this.myFriendCode;
    if (!friendCode) return;

    const guestKey = `${this.activeGameId}_guest_progress_${this.platform}`;
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

// Section 4: UI Painting & Multi-User Co-Op Card Badging
// Lines 413-520: Renders active user's checks and authorized friends' earner badges
window.appState.applyStateToUI = function() {
    this.recalculateMetrics();

    document.querySelectorAll('.fc5-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'mission';
        const group = card.getAttribute('data-group') || null;
        let isDone = false;

        // Active logged-in user checkmark state
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

        // Shared squad earner badge bar
        let squadTagContainer = card.querySelector('.squad-earners-bar');
        if (!squadTagContainer) {
            squadTagContainer = document.createElement('div');
            squadTagContainer.className = 'squad-earners-bar';
            squadTagContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;';
            card.appendChild(squadTagContainer);
        }

        let earnersHtml = '';
        if (window.squadProgressCache && Object.keys(window.squadProgressCache).length > 0) {
            for (const [friendUsername, sData] of Object.entries(window.squadProgressCache)) {
                let friendHasItem = false;

                if (type === 'stash') {
                    friendHasItem = !!(sData.stashes?.[id]?.collected);
                } else if (type === 'roster') {
                    friendHasItem = !!(sData.roster?.[id]?.unlocked);
                } else if (type === 'collectible') {
                    if (group && sData.collectibles?.[group]?.items?.[id]) {
                        friendHasItem = !!(sData.collectibles[group].items[id].collected);
                    }
                } else if (type === 'magazine') {
                    if (sData.collectibles?.survivalist_magazines?.items?.[id]) {
                        friendHasItem = !!(sData.collectibles.survivalist_magazines.items[id].collected);
                    }
                } else if (type === 'trophy') {
                    friendHasItem = !!(sData.trophies?.[id]?.earned);
                } else {
                    friendHasItem = !!(sData.missions?.[id]?.completed);
                }

                if (friendHasItem) {
                    earnersHtml += `
                        <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.18); border:1px solid var(--user-theme-accent); color:#fff; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                            <span style="color:var(--user-theme-accent);">✓</span> ${escapeHtml(friendUsername)}
                        </span>
                    `;
                }
            }
        }

        squadTagContainer.innerHTML = earnersHtml;
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

// Section 5: Universal Profile & Squad Bridge via Friend Codes
// Lines 523-640: Queries user RTDB profiles and synchronizes authorized friend ledgers
window.appState.fetchUserProfile = async function() {
    const emailKey = this.getEmailKey();
    if (!rtdb || !emailKey) return;

    try {
        const snap = await rtdb.ref(`/users/${emailKey}`).once('value');
        const userProfile = snap.val() || {};

        this.myFriendCode = userProfile.friend_code || null;
        this.myPsnGamertag = userProfile.psn_username || userProfile.gamertag || null;
        this.myPsnAccountId = userProfile.psn_account_id || userProfile.accountId || null;

        const display = document.getElementById('myFriendCodeDisplay');
        if (display && this.myFriendCode) {
            display.innerText = this.myFriendCode;
        }
    } catch (e) {
        console.warn("[User Profile Fetch Error]:", e);
    }
};

window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    if (!rosterContainer) return;

    const emailKey = this.getEmailKey();
    if (!emailKey) {
        rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
        return;
    }

    try {
        // Query strictly the active user's authorized friends list
        const friendsSnap = await rtdb.ref(`/users/${emailKey}/friends`).once('value');
        const friendsData = friendsSnap.val();

        if (!friendsData || Object.keys(friendsData).length === 0) {
            rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked yet. Share your friend code to link co-op members.</div>';
            return;
        }

        window.squadProgressCache = {};
        let cardsHtml = '';

        for (const [fKey, fObj] of Object.entries(friendsData)) {
            // The friend's code is the node key or explicit attribute
            const friendCode = fObj.friend_code || fKey;
            const friendUsername = fObj.username || 'Squad Member';
            const friendAvatar = toSecureUrl(fObj.avatar_url || '');
            const targetPlatform = (fObj.primary_platform || this.platform).toLowerCase();

            let friendData = null;
            if (firestore && friendCode) {
                try {
                    // Query directly: /users/{friend_code}/platform/{platform}/progress/{gameId}
                    const fDoc = await firestore
                        .collection("users")
                        .doc(friendCode)
                        .collection("platform")
                        .doc(targetPlatform)
                        .collection("progress")
                        .doc(this.activeGameId)
                        .get();

                    if (fDoc.exists) {
                        friendData = fDoc.data();
                        // Cache for card-level earner badges
                        window.squadProgressCache[friendUsername] = friendData;
                    }
                } catch (err) {
                    console.warn(`[Squad Firestore Error for ${friendCode}]:`, err);
                }
            }

            const rpVal = friendData?.ranks?.rp || 0;
            const stashesVal = friendData?.ranks?.stashes || 0;
            const colVal = friendData?.ranks?.collectibles || 0;
            const trophyPercent = friendData?.trophies_percent || 0;

            cardsHtml += `
                <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px; display:flex; gap:12px; align-items:center;">
                    ${friendAvatar ? `<img src="${friendAvatar}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid var(--user-theme-accent);" onerror="this.style.display='none'">` : ''}
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(friendUsername)}</div>
                            <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                                ${escapeHtml(targetPlatform)}
                            </span>
                        </div>
                        <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">
                            <strong>RP:</strong> ${rpVal} • <strong>Stashes:</strong> ${stashesVal} • <strong>Collectibles:</strong> ${colVal}
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Trophy Progress: <strong style="color:#fff;">${trophyPercent}%</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        rosterContainer.innerHTML = cardsHtml;
        // Paint earner tags onto the category cards
        this.applyStateToUI();
    } catch (e) {
        console.warn("[Friends Roster Sync Error]:", e);
    }
};

// Section 6: Dynamic Top Navigation Bar (/utm_links)
// Lines 643-730: Dynamic folder and link hierarchy
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
        console.warn("[UTM Navigation Fetch Error]:", e);
    }
}

// Section 7: PSN Game Skeleton & Live User Trophy Sync
// Lines 733-810: Queries user gamertag and matches commId to pull live trophies
async function syncPsnSkeleton() {
    if (!rtdb || !appState.activePsnCommId) return;
    try {
        const snap = await rtdb.ref(`/psn/games/${appState.activePsnCommId}`).once('value');
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

        if (appState.currentUser && appState.platform === 'ps') {
            await autoCheckUserPsnTrophies();
        }
    } catch (e) {
        console.warn("[PSN Skeleton Sync Error]:", e);
    }
}

async function autoCheckUserPsnTrophies() {
    if (!rtdb || !appState.myPsnGamertag || !appState.activePsnCommId) return;

    try {
        const liveTrophiesSnap = await rtdb.ref(`/psn/gamertags/${appState.myPsnGamertag}/liveTrophyProgress/${appState.activePsnCommId}`).once('value');
        const liveTrophies = liveTrophiesSnap.val();

        if (liveTrophies && typeof liveTrophies === 'object') {
            let stateModified = false;
            Object.entries(liveTrophies).forEach(([tId, tObj]) => {
                if (tObj && (tObj.earned === true || tObj.isEarned === true)) {
                    const cardKey = `trophy_${appState.activeGameId}_${tId}`;
                    if (!appState.trophies[cardKey] || !appState.trophies[cardKey].earned) {
                        appState.trophies[cardKey] = {
                            earned: true,
                            name: tObj.trophyName || appState.trophies[cardKey]?.name || 'Trophy',
                            rank: (tObj.trophyType || 'Bronze').toUpperCase(),
                            psnSynced: true
                        };
                        stateModified = true;
                    }
                }
            });

            if (stateModified && appState.isCloudLoaded) {
                appState.applyStateToUI();
                appState.saveProgress();
            }
        }
    } catch (e) {
        console.warn("[Live Trophy Auto-Check Error]:", e);
    }
}

// Section 8: Render Game Companion Content Cards
// Lines 813-980: Generates accordion categories with shared earner tag containers
function renderFarCry5Companion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // 8A. Walkthrough Missions
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
                            <div class="squad-earners-bar"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 8B. Prepper Stashes
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
                                    <div class="squad-earners-bar"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        });
    }

    // 8C. Collectibles
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
                                    <div class="squad-earners-bar"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        }
    }

    // 8D. Guns & Fangs for Hire
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
                            <div class="squad-earners-bar"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 8E. PSN Trophies
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
                        const trophyCardId = `trophy_${appState.activeGameId}_${tId}`;
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
                            <div class="squad-earners-bar"></div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </section>`;
    }

    container.innerHTML = html;
}

// Section 9: Helpers
// Lines 983-1007: Url normalization & character sanitization
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

// Section 10: Strict Sequential Lifecycle
// Lines 1010-1090: Controlled initialization eliminating premature overwrite race conditions
document.addEventListener('DOMContentLoaded', async () => {
    await buildUtmNavigation();

    const platformSelector = document.getElementById('platformSelect') || document.getElementById('platformSelector');
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

    // Step 1: Fetch game JSON & bind metadata anchors
    const dataUrls = [
        './data/farcry5.json',
        './farcry5.json',
        '../game/data/farcry5.json',
        '//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/farcry5.json'
    ];

    const loadData = async (idx) => {
        if (idx >= dataUrls.length) return false;
        try {
            const res = await fetch(dataUrls[idx]);
            if (!res.ok) throw new Error();
            const json = await res.json();
            
            appState.gameData = json;
            if (json.game) appState.activeGame = json.game;
            if (json.gameId) appState.activeGameId = json.gameId;
            if (json.psn_communication_id) appState.activePsnCommId = json.psn_communication_id;
            if (json.activeMission) appState.activeMission = json.activeMission;

            await syncPsnSkeleton();
            renderFarCry5Companion(json);
            return true;
        } catch (e) {
            return await loadData(idx + 1);
        }
    };

    await loadData(0);

    // Step 2: Auth listener (Triggers only after DOM cards exist)
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
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

                // 1. Fetch user's own profile (friend_code and psn_username)
                await appState.fetchUserProfile();
                // 2. Load live PlayStation trophies for this user
                if (appState.platform === 'ps') {
                    await autoCheckUserPsnTrophies();
                }
                // 3. Load authoritative progress from /users/{friend_code}/
                await appState.loadProgress();
                // 4. Migrate any offline guest progress
                await appState.migrateGuestProgressIfPresent();
                // 5. Query authorized friends and paint squad badges on cards
                await appState.syncFriendsProgress();
            } else {
                appState.currentUser = null;
                appState.activeEmail = null;
                appState.activeUser = 'Guest';
                appState.myFriendCode = null;
                appState.myPsnGamertag = null;

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `GUEST [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');

                await appState.loadProgress();
            }
        });
    }
});
