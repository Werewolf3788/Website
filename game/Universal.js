// ============================================================================
// * Project: Universal Game Companion & Live Telemetry Field Ledger
// * File: game/Universal.js
// * Build Version: v10.7.0-FIRESTORE-PROGRESS-ALIGNMENT-THEMES
// * Deployment Timestamp: 2026-10-29 21:05:00 EDT (America/New_York)
// ============================================================================

// Section 1: Unified Firebase Configuration (entertainment-71888)
// Lines 10-34: Authoritative credentials and service bindings
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
// Lines 37-55: Resolves active game ID from ?game= / ?id= or data-game attribute
function resolveActiveGameKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramKey = urlParams.get('game') || urlParams.get('id');
    if (paramKey) return paramKey.trim().toLowerCase();

    const rootElem = document.getElementById('app-root') || document.getElementById('section-container');
    if (rootElem && rootElem.getAttribute('data-game')) {
        return rootElem.getAttribute('data-game').trim().toLowerCase();
    }

    return "farcry5";
}

let CURRENT_GAME_KEY = resolveActiveGameKey();
let ACTIVE_COMM_ID = null;

// Section 3: Global State Engine
// Lines 58-360: Additive item hydration and strict multi-platform ledger isolation
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'xbox', 'steam', 'pc'
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    psnGamertag: null,
    primaryColor: null,
    secondaryColor: null,
    avatarUrl: null,
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

    getCanonicalGameName: function() {
        if (this.gameId === 'farcry5') return 'FarCry5';
        if (this.gameId === 'farcry6') return 'FarCry6';
        return this.gameData?.gameId || this.gameId;
    },

    switchGame: async function(targetGameKey) {
        if (!targetGameKey || targetGameKey === this.gameId) return;
        CURRENT_GAME_KEY = targetGameKey.toLowerCase();
        this.gameId = CURRENT_GAME_KEY;

        const newUrl = `${window.location.pathname}?game=${CURRENT_GAME_KEY}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        this.collectibles = {};
        this.stashes = {};
        this.roster = {};
        this.missions = {};
        this.trophies = {};
        this.ranks = {};

        document.querySelectorAll('.game-pill').forEach(pill => {
            if (pill.getAttribute('data-game-key') === CURRENT_GAME_KEY) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        await loadAndHydrateGame(CURRENT_GAME_KEY);
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

        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }

        // Persist to RTDB primary_platform
        if (persistPin && this.currentUser && this.currentUser.email && rtdb) {
            const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
            try {
                await rtdb.ref(`/users/${emailKey}/primary_platform`).set(this.platform);
                this.updateStatus(`[Pinned Platform] Set primary_platform to ${this.platform.toUpperCase()} in RTDB.`);
            } catch (pinErr) {
                console.warn("[Primary Platform Write Error]:", pinErr);
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

    hydrateFromRawJson: function(data) {
        if (!data || typeof data !== 'object') return;
        this.gameData = data;
        this.gameTitle = data.game || data.title || "Game Companion";
        this.gameId = data.gameId ? data.gameId.toLowerCase() : CURRENT_GAME_KEY;

        ACTIVE_COMM_ID = data.commId || 
                         data.psn_communication_id || 
                         data.platforms?.playstation?.commId || 
                         null;

        const titleHeader = document.getElementById('companionGameTitle');
        if (titleHeader) titleHeader.innerText = this.gameTitle;
        const pageTitle = document.getElementById('pageHeaderTitle');
        if (pageTitle) pageTitle.innerText = `${this.gameTitle} — Universal Companion`;

        if (ACTIVE_COMM_ID) {
            applyGamePosterArt(ACTIVE_COMM_ID);
        }

        // 1. Dynamic Collectibles Sets
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

        // 3. Roster / Amigos / Guns & Fangs for Hire
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

        // 4. Quests / Operations / Walkthrough Missions
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
            gameId: this.getCanonicalGameName(),
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

// Section 4: Authoritative Storage Gate (Aligned to Firestore /progress/ Path)
// Lines 363-445: users/{friendCode}/platform/{platform}/progress/{canonicalGame}
window.appState.saveProgress = function() {
    const payload = this.buildPayload();
    const userKey = this.getUserKey();
    const gameName = this.getCanonicalGameName();

    if (!this.currentUser || !userKey) {
        const guestKey = `guest_progress_${this.gameId}_${this.platform}`;
        try {
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress saved locally [${this.platform.toUpperCase()}].`);
        } catch (e) {}
        return;
    }

    if (firestore) {
        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("progress")
            .doc(gameName);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] users/${userKey}/platform/${this.platform}/progress/${gameName}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
            this.updateStatus(`Firestore Sync Error: ${err.message}`);
        });
    }
};

window.appState.loadProgress = function() {
    const userKey = this.getUserKey();
    const gameName = this.getCanonicalGameName();
    
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
            .collection("progress")
            .doc(gameName);

        docRef.get().then(doc => {
            if (doc.exists) {
                this.applyPayload(doc.data());
                this.updateStatus(`[Cloud Synced] users/${userKey}/platform/${this.platform}/progress/${gameName}`);
            } else {
                this.applyStateToUI();
                this.saveProgress();
            }
        }).catch(err => {
            console.warn("[Firestore Fetch Error]:", err);
        });
    }
};

// Section 5: Dynamic Theming & Colors from RTDB Profile
// Lines 448-475: Applies primary_color, secondary_color, and avatar_url
function applyUserProfileStyling(uData) {
    if (!uData || typeof uData !== 'object') return;

    if (uData.primary_color) {
        document.documentElement.style.setProperty('--user-theme-accent', uData.primary_color);
        document.documentElement.style.setProperty('--accent-glow', `${uData.primary_color}40`);
    }

    if (uData.secondary_color) {
        document.documentElement.style.setProperty('--border-highlight', uData.secondary_color);
    }

    const avatarUrl = uData.avatar_url;
    if (avatarUrl) {
        const headerAvatar = document.getElementById('headerUserAvatar');
        if (headerAvatar) {
            headerAvatar.src = toSecureUrl(avatarUrl);
        }
    }
}

// Section 6: UI Toggle Handlers
// Lines 478-540: Card toggles and state mutations
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

// Section 7: Squad Co-Op Bridge (Friends-Only Isolated Queries)
// Lines 543-625: Reads /users/{emailKey}/friends and loads their /progress/{gameName}
window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    if (!rosterContainer) return;

    if (!this.currentUser || !this.currentUser.email || !rtdb) {
        rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
        return;
    }

    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    const gameName = this.getCanonicalGameName();

    try {
        const friendsSnap = await rtdb.ref(`/users/${emailKey}/friends`).once('value');
        const friendsData = friendsSnap.val();

        if (!friendsData || Object.keys(friendsData).length === 0) {
            rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked. Add friend codes to share progress.</div>';
            return;
        }

        let cardsHtml = '';
        for (const [fKey, fObj] of Object.entries(friendsData)) {
            const friendUsername = fObj.username || fKey;
            const friendTargetCode = fObj.friend_code || fKey;
            const friendPlatform = fObj.primary_platform || this.platform;
            const friendAvatar = fObj.avatar_url || '';

            let friendData = null;
            if (firestore) {
                try {
                    const fDoc = await firestore
                        .collection("users")
                        .doc(friendTargetCode)
                        .collection("platform")
                        .doc(friendPlatform)
                        .collection("progress")
                        .doc(gameName)
                        .get();

                    if (fDoc.exists) {
                        friendData = fDoc.data();
                    }
                } catch (err) {
                    console.warn(`[Friend Progress Error for ${friendTargetCode}]:`, err);
                }
            }

            const rpVal = friendData?.ranks?.rp || 0;
            const stashesVal = friendData?.ranks?.stashes || 0;
            const colVal = friendData?.ranks?.collectibles || 0;
            const trophyPercent = friendData?.trophies_percent || 0;

            cardsHtml += `
                <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${friendAvatar ? `<img src="${toSecureUrl(friendAvatar)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">` : ''}
                            <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(friendUsername)}</div>
                        </div>
                        <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                            ${escapeHtml(friendPlatform)}
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

// Section 8: Dynamic PSN PosterArt Binding
// Lines 628-660: Queries RTDB /psn/games/{commId}/posterArt and binds to browser icons & header logo
async function applyGamePosterArt(commId) {
    if (!rtdb || !commId) return;

    try {
        const snap = await rtdb.ref(`/psn/games/${commId}/posterArt`).once('value');
        const rawPoster = snap.val();

        if (rawPoster && typeof rawPoster === 'string') {
            const posterUrl = toSecureUrl(rawPoster);

            const fav1 = document.getElementById('dynamicFavicon');
            const fav2 = document.getElementById('dynamicAppleIcon');
            const navLogo = document.getElementById('navHeaderLogo');

            if (fav1) fav1.href = posterUrl;
            if (fav2) fav2.href = posterUrl;
            if (navLogo) {
                navLogo.src = posterUrl;
                navLogo.style.display = 'inline-block';
            }
        }
    } catch (e) {
        console.warn(`[Poster Art Fetch Error for ${commId}]:`, e);
    }
}

// Section 9: Programmatic Navbar & Dynamic Menu Sorting Engine (/utm_links)
// Lines 663-780: Dynamic navbar generation with smart cache-busting
async function buildUtmNavigation() {
    const navContainer = document.getElementById('dynamicNavLinks');
    if (!rtdb) return;

    try {
        const snap = await rtdb.ref('/utm_links').once('value');
        const data = snap.val();
        if (!data) return;

        const settingsLogo = data?.Settings?.[0]?.image || data?.Settings?.image;
        if (settingsLogo && !ACTIVE_COMM_ID) {
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
        let latestTimestamp = 0;

        function walk(node) {
            if (!node || typeof node !== 'object') return;
            
            const url = node.url || node.link || node.href;
            if (url && typeof url === 'string') {
                if (node.updatedAt) {
                    const parsedTs = new Date(node.updatedAt).getTime();
                    if (!isNaN(parsedTs) && parsedTs > latestTimestamp) {
                        latestTimestamp = parsedTs;
                    }
                }

                linksList.push({
                    title: node.title || node.name || 'Link',
                    url: toSecureUrl(url),
                    image: toSecureUrl(node.image || node.thumb || null),
                    group: node.group ? String(node.group).trim() : 'Standalone',
                    rowNumber: Number(node.rowNumber || 999),
                    tag: node.tag || ''
                });
                return;
            }
            Object.values(node).forEach(child => walk(child));
        }
        walk(data);

        const cacheBusterParam = latestTimestamp > 0 ? `?v=${latestTimestamp}` : '';
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
                            ${entry.items.map(sub => {
                                const targetUrl = sub.url.includes('?') ? `${sub.url}&cb=${latestTimestamp}` : `${sub.url}${cacheBusterParam}`;
                                const isExternal = sub.url.startsWith('http') && !sub.url.includes(window.location.hostname);
                                return `
                                    <a href="${targetUrl}" class="nav-btn" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} style="width:100%; justify-content:flex-start;">
                                        ${sub.image ? `<img src="${sub.image}" class="nav-icon" onerror="this.style.display='none'">` : ''}
                                        <span class="truncate">${escapeHtml(sub.title)}</span>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } else {
                const targetUrl = entry.url.includes('?') ? `${entry.url}&cb=${latestTimestamp}` : `${entry.url}${cacheBusterParam}`;
                const isExternal = entry.url.startsWith('http') && !entry.url.includes(window.location.hostname);
                navHtml += `
                    <a href="${targetUrl}" class="nav-btn" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
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

// Section 10: Universal PSN Live Telemetry Engine
// Lines 783-860: Automatically checks live trophies from RTDB
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

// Section 11: Universal Dynamic Renderer
// Lines 863-1025: Automatically renders categories loaded from /games/{gameId}
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

// Section 12: Dynamic Game Pill Generator (/games in RTDB)
// Lines 1028-1065: Renders interactive pills for every game registered in RTDB
async function buildGamePillsBar() {
    const container = document.getElementById('gamePillsContainer');
    if (!container || !rtdb) return;

    try {
        const snap = await rtdb.ref('/games').once('value');
        const gamesCatalog = snap.val();
        if (!gamesCatalog) return;

        let pillsHtml = '';
        Object.keys(gamesCatalog).forEach(gKey => {
            const gData = gamesCatalog[gKey];
            const gTitle = gData?.game || gData?.title || gKey.toUpperCase();
            const isActive = (gKey.toLowerCase() === CURRENT_GAME_KEY);

            pillsHtml += `
                <button type="button" 
                        class="game-pill ${isActive ? 'active' : ''}" 
                        data-game-key="${escapeHtml(gKey)}"
                        onclick="appState.switchGame('${escapeHtml(gKey)}')">
                    <i class="fas fa-gamepad game-pill-icon"></i>
                    <span>${escapeHtml(gTitle)}</span>
                </button>
            `;
        });

        container.innerHTML = pillsHtml;
    } catch (err) {
        console.warn("[Game Pills Build Error]:", err);
    }
}

async function loadAndHydrateGame(gameKey) {
    appState.updateStatus(`Loading game data from RTDB: /games/${gameKey}...`);
    if (rtdb) {
        try {
            const snap = await rtdb.ref(`/games/${gameKey}`).once('value');
            const data = snap.val();
            if (data) {
                appState.hydrateFromRawJson(data);
                appState.updateStatus(`[Connected] Authoritative ledger active for /games/${gameKey}`);
                renderUniversalCompanion(data);
                appState.loadProgress();

                if (appState.platform === 'ps' && appState.psnGamertag) {
                    await autoCheckUserPsnTrophies();
                }
                return true;
            }
        } catch (err) {
            console.warn("[RTDB Load Error]:", err);
        }
    }
    appState.updateStatus(`[Error] Game '/games/${gameKey}' not found in RTDB.`);
    return false;
}

// Section 13: Universal Engine Bootstrapper
// Lines 1068-1150: Dynamic lifecycle gate & auth listener
async function initUniversalEngine() {
    await buildUtmNavigation();
    await buildGamePillsBar();

    const platformSelector = document.getElementById('platformSelector');
    if (platformSelector) {
        platformSelector.addEventListener('change', (e) => {
            appState.switchPlatform(e.target.value, true);
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
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Member';

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

                // Read authoritative user metadata from /users/{emailKey}
                const emailKey = user.email.replace(/@/g, '_at_').replace(/\./g, '_');
                try {
                    const snap = await rtdb.ref(`/users/${emailKey}`).once('value');
                    const uData = snap.val() || {};
                    appState.myFriendCode = uData.friend_code || null;
                    appState.psnGamertag = uData.psn_username || null;
                    
                    const codeDisplay = document.getElementById('myFriendCodeDisplay');
                    if (codeDisplay && appState.myFriendCode) codeDisplay.innerText = appState.myFriendCode;

                    // Apply custom theme colors & profile picture
                    applyUserProfileStyling(uData);

                    // Apply primary_platform pin
                    if (uData.primary_platform) {
                        await appState.switchPlatform(uData.primary_platform.toLowerCase(), false);
                    }
                } catch (e) {}

                if (appState.gameData) {
                    await appState.loadProgress();
                    await appState.syncFriendsProgress();
                    if (appState.platform === 'ps' && appState.psnGamertag) {
                        await autoCheckUserPsnTrophies();
                    }
                }
            } else {
                appState.currentUser = null;
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

    await loadAndHydrateGame(CURRENT_GAME_KEY);
}

// Universal Self-Starting Execution Gate
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUniversalEngine);
} else {
    initUniversalEngine();
}
