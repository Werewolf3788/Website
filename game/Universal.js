// ============================================================================
// * Project: Universal Game Companion & Live Telemetry Field Ledger
// * File: game/Universal.js
// * Build Version: v11.7.0-SQUAD-PSN-MISSION-SCHEMA
// * Deployment Timestamp: 2026-10-30 03:46:00 EDT (America/New_York)
// ============================================================================

// Section 1: Authoritative Firebase Credentials (entertainment-71888)
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

// Section 2: Game Key Resolution
function resolveActiveGameKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramKey = urlParams.get('game') || urlParams.get('id');
    if (paramKey) return paramKey.trim().toLowerCase();

    const rootElem = document.getElementById('app-root') || document.getElementById('section-container');
    if (rootElem && rootElem.getAttribute('data-game')) {
        return rootElem.getAttribute('data-game').trim().toLowerCase();
    }

    return "snresistance";
}

let CURRENT_GAME_KEY = resolveActiveGameKey();
let ACTIVE_COMM_ID = null;
let LAST_APPLIED_POSTER = null;

// Helper functions for schema detection and data walking
function toArr(v) {
    return v ? (Array.isArray(v) ? v : Object.values(v)) : [];
}

function isLeafList(node) {
    if (Array.isArray(node)) return true;
    if (!node || typeof node !== 'object') return false;
    const keys = Object.keys(node);
    return keys.length > 0 && keys.every(k => /^\d+$/.test(k));
}

function isMissionSchema(data) {
    if (!data || !data.missions || typeof data.missions !== 'object' || Array.isArray(data.missions)) return false;
    return Object.values(data.missions).some(m =>
        m && typeof m === 'object' && m.number !== undefined && (m.collectibles || m.medals || m.trophies)
    );
}

function walkLeaves(node, visit) {
    if (!node || typeof node !== 'object') return;
    if (isLeafList(node)) {
        toArr(node).forEach(it => { if (it && typeof it === 'object') visit(it); });
        return;
    }
    Object.values(node).forEach(child => walkLeaves(child, visit));
}

function collectAllTrophies(data) {
    if (!data) return [];
    const list = [...toArr(data.trophies), ...toArr(data.general_trophies)];
    if (data.missions && typeof data.missions === 'object') {
        Object.values(data.missions).forEach(m => { if (m) list.push(...toArr(m.trophies)); });
    }
    return list;
}

function ribbonKeys(data) {
    return Object.keys(data || {}).filter(k => /_ribbons$/.test(k));
}

// Section 3: Authoritative Global State Engine
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps',
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
    medals: {},
    ribbons: {},
    ranks: {},

    getUserKey: function() {
        if (this.myFriendCode) return this.myFriendCode;
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    getCanonicalGameName: function() {
        if (this.gameId === 'farcry5') return 'FarCry5';
        if (this.gameId === 'farcry6') return 'FarCry6';
        if (this.gameId === 'sniperelite5' || this.gameId === 'se5') return 'SniperElite5';
        if (this.gameId === 'snresistance') return 'SniperEliteResistance';
        return this.gameData?.gameId || this.gameId;
    },

    switchGame: async function(targetGameKey) {
        if (!targetGameKey) return;
        const normalized = targetGameKey.toLowerCase() === 'se5' ? 'sniperelite5' : targetGameKey.toLowerCase();
        if (normalized === this.gameId && this.gameData) return;

        CURRENT_GAME_KEY = normalized;
        this.gameId = CURRENT_GAME_KEY;

        const newUrl = `${window.location.pathname}?game=${CURRENT_GAME_KEY}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        this.collectibles = {};
        this.stashes = {};
        this.roster = {};
        this.missions = {};
        this.trophies = {};
        this.medals = {};
        this.ribbons = {};
        this.ranks = {};

        document.querySelectorAll('.game-pill').forEach(pill => {
            const key = pill.getAttribute('data-game-key');
            if (key === CURRENT_GAME_KEY || (key === 'se5' && CURRENT_GAME_KEY === 'sniperelite5')) {
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

        if (persistPin && this.currentUser && this.currentUser.email && rtdb) {
            const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
            try {
                await rtdb.ref(`/users/${emailKey}/primary_platform`).set(this.platform);
                this.updateStatus(`[Platform Pinned] Set primary_platform to ${this.platform.toUpperCase()}`);
            } catch (pinErr) {
                console.warn("[Primary Platform Write Error]:", pinErr);
            }
        }

        await this.loadProgress();
        if (this.currentUser) {
            this.syncFriendsProgress();
            if (this.psnGamertag) {
                await autoCheckUserPsnTrophies();
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
        if (pageTitle) pageTitle.innerText = `${this.gameTitle} — Field Companion`;

        searchGamePosterArt(ACTIVE_COMM_ID, this.gameTitle);

        // 1. Mission-by-Mission Schema (Sniper Elite Architecture)
        if (isMissionSchema(data)) {
            this.hydrateMissionSchema(data);
        }

        // 2. Legacy / Standard Collectibles & Walkthroughs
        if (data.collectibles && typeof data.collectibles === 'object') {
            for (const cKey in data.collectibles) {
                const group = data.collectibles[cKey];
                const rawItems = group?.items ? (Array.isArray(group.items) ? group.items : Object.values(group.items)) : [];
                if (!this.collectibles[cKey]) this.collectibles[cKey] = { items: {} };

                rawItems.forEach(cItem => {
                    if (!cItem || !cItem.id) return;
                    if (!this.collectibles[cKey].items[cItem.id]) {
                        this.collectibles[cKey].items[cItem.id] = {
                            collected: false,
                            name: cItem.name || '',
                            region: cItem.region || group.region || '',
                            location: cItem.location || '',
                            guide: cItem.guide || ''
                        };
                    }
                });
            }
        }

        const rawMissions = data.walkthrough_missions ? (Array.isArray(data.walkthrough_missions) ? data.walkthrough_missions : Object.values(data.walkthrough_missions)) : [];
        rawMissions.forEach(m => {
            if (!m || !m.id) return;
            if (!this.missions[m.id]) {
                this.missions[m.id] = {
                    completed: false,
                    mission_name: m.mission_name || m.title || '',
                    region: m.region || '',
                    guide: m.guide || ''
                };
            }
        });

        // 3. Trophies Hydration
        if (data.trophies || data.general_trophies || isMissionSchema(data)) {
            this.hydrateTrophiesFromSkeleton(data);
        }

        this.recalculateMetrics();
    },

    ensureMissionEntry: function(id, info) {
        if (!id) return;
        if (!this.missions[id]) {
            this.missions[id] = {
                completed: false,
                mission_name: info.name || '',
                region: info.region || '',
                guide: info.guide || ''
            };
        } else {
            this.missions[id].mission_name = info.name || this.missions[id].mission_name;
            this.missions[id].region = info.region || this.missions[id].region;
            this.missions[id].guide = info.guide || this.missions[id].guide;
        }
    },

    registerMedal: function(it) {
        if (!it || !it.id) return;
        if (!this.medals[it.id]) {
            this.medals[it.id] = { earned: false, name: it.name || '', description: it.description || '' };
        } else {
            this.medals[it.id].name = it.name || this.medals[it.id].name;
            this.medals[it.id].description = it.description || this.medals[it.id].description;
        }
    },

    registerRibbon: function(it) {
        if (!it || !it.id) return;
        if (!this.ribbons[it.id]) {
            this.ribbons[it.id] = { earned: false, name: it.name || '', requirement: it.requirement || '' };
        } else {
            this.ribbons[it.id].name = it.name || this.ribbons[it.id].name;
            this.ribbons[it.id].requirement = it.requirement || this.ribbons[it.id].requirement;
        }
    },

    hydrateMissionSchema: function(data) {
        Object.entries(data.missions).forEach(([mKey, m]) => {
            if (!m || typeof m !== 'object') return;
            const mLabel = `Mission ${m.number} — ${m.title || ''}`;
            this.ensureMissionEntry(mKey, { name: m.title || mLabel, region: m.region || '', guide: m.walkthrough || '' });

            Object.entries(m.collectibles || {}).forEach(([cat, list]) => {
                const items = toArr(list).filter(it => it && it.id);
                if (!items.length) return;
                const gKey = `${mKey}__${cat}`;
                if (!this.collectibles[gKey]) {
                    this.collectibles[gKey] = {
                        collected: false,
                        count: 0,
                        total: items.length,
                        quest_name: `${mLabel} — ${cat.replace(/_/g, ' ')}`,
                        region: m.region || 'Game World',
                        items: {}
                    };
                } else {
                    this.collectibles[gKey].total = items.length;
                    if (!this.collectibles[gKey].items) this.collectibles[gKey].items = {};
                }
                items.forEach(it => {
                    if (!this.collectibles[gKey].items[it.id]) {
                        this.collectibles[gKey].items[it.id] = {
                            collected: false,
                            name: it.name || '',
                            region: m.region || '',
                            location: it.location || ''
                        };
                    }
                });
            });

            if (m.kill_challenge && typeof m.kill_challenge === 'object') {
                const kc = m.kill_challenge;
                this.ensureMissionEntry(`kill_${mKey}`, {
                    name: `Kill List: ${kc.target_name || ''}`,
                    region: m.region || '',
                    guide: kc.strategy || ''
                });
            }

            if (m.propaganda_mission && m.propaganda_mission.id) {
                const p = m.propaganda_mission;
                this.ensureMissionEntry(p.id, { name: `Propaganda: ${p.title || ''}`, region: m.region || '', guide: p.briefing || '' });
            }

            walkLeaves(m.medals, it => this.registerMedal(it));
        });

        toArr(data.unassigned_propaganda_missions).forEach(p => {
            if (p && p.id) this.ensureMissionEntry(p.id, { name: `Propaganda: ${p.title || ''}`, region: '', guide: p.briefing || '' });
        });

        walkLeaves(data.medals, it => this.registerMedal(it));
        ribbonKeys(data).forEach(k => toArr(data[k]).forEach(r => this.registerRibbon(r)));
    },

    hydrateTrophiesFromSkeleton: function(skeleton) {
        if (!skeleton) return;
        this.psnSkeleton = skeleton;

        const rawList = collectAllTrophies(skeleton);
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
        let totalCollectiblesCount = 0;
        let totalPossibleCollectibles = 0;

        for (const cKey in this.collectibles) {
            const group = this.collectibles[cKey];
            if (group && group.items) {
                let groupCount = 0;
                Object.values(group.items).forEach(item => {
                    totalPossibleCollectibles++;
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

        this.ranks.collectibles = totalCollectiblesCount;
        this.updateRankDisplay('collectibles', `${totalCollectiblesCount}/${totalPossibleCollectibles}`);
        this.updateRankDisplay('trophies', `${earnedTrophies}/${totalTrophies}`);
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
            medals: this.medals,
            ribbons: this.ribbons,
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
                if (this.collectibles[cKey]?.items && payload.collectibles[cKey]?.items) {
                    for (const itemId in payload.collectibles[cKey].items) {
                        if (this.collectibles[cKey].items[itemId]) {
                            this.collectibles[cKey].items[itemId].collected = !!payload.collectibles[cKey].items[itemId].collected;
                        }
                    }
                }
            }
        }

        if (payload.missions) {
            for (const mId in payload.missions) {
                if (this.missions[mId]) this.missions[mId].completed = !!payload.missions[mId].completed;
            }
        }

        if (payload.trophies) {
            for (const tKey in payload.trophies) {
                if (this.trophies[tKey]) this.trophies[tKey].earned = !!payload.trophies[tKey].earned;
            }
        }

        if (payload.medals) {
            for (const medId in payload.medals) {
                if (this.medals[medId]) this.medals[medId].earned = !!payload.medals[medId].earned;
            }
        }

        if (payload.ribbons) {
            for (const rbId in payload.ribbons) {
                if (this.ribbons[rbId]) this.ribbons[rbId].earned = !!payload.ribbons[rbId].earned;
            }
        }

        this.applyStateToUI();
    }
};

// Section 4: Authoritative Storage Gate
window.appState.saveProgress = function() {
    const payload = this.buildPayload();
    const userKey = this.getUserKey();
    const gameName = this.getCanonicalGameName();

    if (!this.currentUser || !userKey) {
        const guestKey = `guest_progress_${this.gameId}_${this.platform}`;
        try {
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Saved locally [${this.platform.toUpperCase()}].`);
        } catch (e) {}
        return;
    }

    if (firestore) {
        const docRef = firestore
            .collection("user")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("game")
            .doc(gameName);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] user/${userKey}/platform/${this.platform}/game/${gameName}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
            this.updateStatus(`Firestore Sync Error: ${err.message}`);
        });
    }
};

window.appState.loadProgress = async function() {
    const userKey = this.getUserKey();
    const gameName = this.getCanonicalGameName();

    if (this.gameData) this.hydrateFromRawJson(this.gameData);

    if (!this.currentUser || !userKey) {
        const guestKey = `guest_progress_${this.gameId}_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                this.applyPayload(JSON.parse(raw));
                this.updateStatus(`[Guest Mode] Restored local progress.`);
                return;
            }
        } catch (e) {}
        this.applyStateToUI();
        return;
    }

    if (firestore) {
        try {
            const docRef = firestore
                .collection("user")
                .doc(userKey)
                .collection("platform")
                .doc(this.platform)
                .collection("game")
                .doc(gameName);

            const doc = await docRef.get();
            if (doc.exists) {
                this.applyPayload(doc.data());
                this.updateStatus(`[Cloud Synced] Loaded progress data.`);
            } else {
                this.applyStateToUI();
            }
        } catch (err) {
            console.warn("[Firestore Fetch Warning]:", err);
            this.applyStateToUI();
        }
    }
};

// Section 5: Theming, Profile Picture & Custom Colors from RTDB
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
        if (headerAvatar) headerAvatar.src = toSecureUrl(avatarUrl);
    }
}

// Section 6: UI State Toggles & Renderers
window.appState.applyStateToUI = function() {
    this.recalculateMetrics();

    document.querySelectorAll('.game-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'mission';
        const group = card.getAttribute('data-group') || null;
        let isDone = false;

        if (type === 'collectible') {
            if (group && this.collectibles[group]?.items?.[id]) {
                isDone = !!(this.collectibles[group].items[id].collected);
            }
        } else if (type === 'trophy') {
            isDone = !!(this.trophies[id]?.earned);
        } else if (type === 'medal') {
            isDone = !!(this.medals[id]?.earned);
        } else if (type === 'ribbon') {
            isDone = !!(this.ribbons[id]?.earned);
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

    document.querySelectorAll('.category-section').forEach(sec => {
        const badge = sec.querySelector(':scope > .category-header .sec-progress');
        if (!badge) return;
        const total = sec.querySelectorAll('.game-item-card').length;
        const done = sec.querySelectorAll('.game-item-card.completed').length;
        badge.innerText = total ? `${done}/${total}` : '';
    });
};

window.appState.toggleItem = function(itemId, type, group) {
    if (type === 'collectible') {
        if (group && this.collectibles[group]?.items?.[itemId]) {
            this.collectibles[group].items[itemId].collected = !this.collectibles[group].items[itemId].collected;
        }
    } else if (type === 'trophy') {
        if (!this.trophies[itemId]) this.trophies[itemId] = { earned: false };
        this.trophies[itemId].earned = !this.trophies[itemId].earned;
    } else if (type === 'medal') {
        if (!this.medals[itemId]) this.medals[itemId] = { earned: false };
        this.medals[itemId].earned = !this.medals[itemId].earned;
    } else if (type === 'ribbon') {
        if (!this.ribbons[itemId]) this.ribbons[itemId] = { earned: false };
        this.ribbons[itemId].earned = !this.ribbons[itemId].earned;
    } else {
        if (!this.missions[itemId]) this.missions[itemId] = { completed: false };
        this.missions[itemId].completed = !this.missions[itemId].completed;
    }

    this.applyStateToUI();
    this.saveProgress();
};

window.appState.updateStatus = function(msg) {
    const statLine = document.getElementById('stat-line');
    if (statLine) statLine.innerText = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`;
};

// Section 7: Squad Co-Op Ledger with Clean Avatar Cards & Friend Data
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
                        .collection("user")
                        .doc(friendTargetCode)
                        .collection("platform")
                        .doc(friendPlatform)
                        .collection("game")
                        .doc(gameName)
                        .get();

                    if (fDoc.exists) friendData = fDoc.data();
                } catch (err) {}
            }

            const colVal = friendData?.ranks?.collectibles || 0;
            const trophyPercent = friendData?.trophies_percent || 0;

            cardsHtml += `
                <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px; display:flex; align-items:center; gap:12px;">
                    ${friendAvatar ? `<img src="${toSecureUrl(friendAvatar)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-highlight);" onerror="this.style.display='none'">` : '<div style="width:40px; height:40px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center;"><i class="fas fa-user"></i></div>'}
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(friendUsername)}</div>
                            <span style="font-size:0.65rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                                ${escapeHtml(friendPlatform)}
                            </span>
                        </div>
                        <div style="font-size:0.75rem; color:#cbd5e1; display:flex; gap:10px;">
                            <span>Collectibles: <strong>${colVal}</strong></span>
                            <span>Trophies: <strong>${trophyPercent}%</strong></span>
                        </div>
                    </div>
                </div>
            `;
        }

        rosterContainer.innerHTML = cardsHtml;
    } catch (e) {
        console.warn("[Friends Roster Error]:", e);
    }
};

// Section 8: Dynamic Poster Art Lookup via /psn/games
async function searchGamePosterArt(commId, gameName) {
    if (!rtdb) return;

    try {
        const snap = await rtdb.ref('/psn/games').once('value');
        const psnGames = snap.val();
        if (!psnGames || typeof psnGames !== 'object') return;

        let matchedPoster = null;
        for (const [titleId, gObj] of Object.entries(psnGames)) {
            if (!gObj) continue;
            const matchesCommId = commId && (gObj.commId === commId || gObj.npCommunicationId === commId);
            const matchesName = gameName && gObj.name && gObj.name.toLowerCase().trim() === gameName.toLowerCase().trim();

            if ((matchesCommId || matchesName) && gObj.posterArt) {
                matchedPoster = gObj.posterArt;
                break;
            }
        }

        if (matchedPoster && matchedPoster !== LAST_APPLIED_POSTER) {
            LAST_APPLIED_POSTER = matchedPoster;
            const posterUrl = toSecureUrl(matchedPoster);

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
        console.warn("[Poster Search Warning]:", e);
    }
}

// Section 9: Programmatic Navbar & Sorting (/utm_links)
async function buildUtmNavigation() {
    const navContainer = document.getElementById('dynamicNavLinks');
    if (!rtdb || !navContainer) return;

    try {
        const snap = await rtdb.ref('/utm_links').once('value');
        const data = snap.val();
        if (!data) return;

        const linksList = [];
        let latestTimestamp = 0;

        function walk(node) {
            if (!node || typeof node !== 'object') return;
            const url = node.url || node.link || node.href;
            if (url && typeof url === 'string') {
                if (node.updatedAt) {
                    const parsedTs = new Date(node.updatedAt).getTime();
                    if (!isNaN(parsedTs) && parsedTs > latestTimestamp) latestTimestamp = parsedTs;
                }
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

// Section 10: Universal PSN Trophy Telemetry Auto-Check (Cross-Platform Visual Sync)
async function autoCheckUserPsnTrophies() {
    if (!rtdb || !appState.psnGamertag || !ACTIVE_COMM_ID) return;
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

                if (appState.trophies[cardKey]) {
                    const card = appState.trophies[cardKey];
                    // Sync PlayStation visual metadata across all platforms
                    if (tObj.name) card.name = tObj.name;
                    if (tObj.description) card.description = tObj.description;
                    if (tObj.icon) card.icon = toSecureUrl(tObj.icon);
                    if (tObj.rank) card.rank = tObj.rank.toUpperCase();

                    // If earned on PSN, auto-mark earned
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
                appState.updateStatus(`[PSN Telemetry Synced] Visual assets mapped for ${gamertag}`);
            }
        }
    } catch (e) {
        console.warn("[Live Telemetry Error]:", e);
    }
}

// Section 11: Mission-Schema Dynamic Renderer with Folders and Search
function ensureUniversalStyles() {
    if (document.getElementById('universal-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'universal-extra-styles';
    style.textContent = `
        .search-hidden { display: none !important; }
        .category-section.section-collapsed > .section-content { display: none; }
        .category-section .category-section { margin-top: 10px; margin-left: 4px; }
        .category-section .category-section > .category-header { opacity: 0.95; }
        .category-section .category-section .category-header h2 { font-size: 0.95rem; }
        .sec-progress { font-size: 0.75rem; font-weight: 800; color: #94a3b8; margin-left: auto; margin-right: 10px; }
        .uni-search-wrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
        .uni-search-input { flex: 1 1 260px; background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px; padding: 10px 14px; font-size: 0.95rem; outline: none; }
        .uni-search-input:focus { border-color: var(--user-theme-accent, #ff5500); }
        .uni-search-btn { background: #1e293b; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px; padding: 10px 14px; font-size: 0.8rem; font-weight: 800; cursor: pointer; }
        .uni-search-btn:hover { border-color: var(--user-theme-accent, #ff5500); color: #fff; }
        .uni-search-count { flex-basis: 100%; font-size: 0.75rem; color: #94a3b8; min-height: 1em; }
        .mission-region { font-size: 0.7rem; font-weight: 700; color: #94a3b8; margin-left: 8px; }
    `;
    document.head.appendChild(style);
}

function humanize(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

const COLLECTIBLE_LABELS = {
    personal_letters: '✉️ Personal Letter',
    classified_documents: '📜 Classified Document',
    hidden_items: '🏷️ Hidden Item',
    stone_eagles: '🦅 Stone Eagle',
    workbenches: '⚙️ Workbench'
};

function buildFolder(titleHtml, innerHtml) {
    return `
    <section class="category-section section-collapsed">
        <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
            <h2>${titleHtml}</h2>
            <span class="sec-progress"></span>
            <span>▾</span>
        </div>
        <div class="section-content">${innerHtml}</div>
    </section>`;
}

function gridOf(cards) {
    return cards.length ? `<div class="trophy-grid">${cards.join('')}</div>` : '';
}

function buildItemCard(o) {
    const search = [o.title, o.sub, o.body, o.badge, o.ctx, o.type].filter(Boolean).join(' ').toLowerCase();
    const img = o.img ? toSecureUrl(o.img) : '';
    const groupAttr = o.group ? ` data-group="${escapeHtml(o.group)}"` : '';
    const groupArg = o.group ? `, '${escapeHtml(o.group)}'` : '';
    return `
    <div class="trophy-card game-item-card" data-id="${escapeHtml(o.id)}" data-type="${o.type}"${groupAttr} data-search="${escapeHtml(search)}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:10px; align-items:center;">
                ${img ? `<img src="${img}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
                <div>
                    <span class="trophy-rank ${o.badgeClass || 'rank-bronze'}">${escapeHtml(o.badge || '')}</span>
                    <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(o.title || '')}</h3>
                    ${o.sub ? `<div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(o.sub)}</div>` : ''}
                </div>
            </div>
            <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(o.id)}', '${o.type}'${groupArg})" aria-label="Toggle"></button>
        </div>
        ${o.body ? `<p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(o.body)}</p>` : ''}
        ${o.link ? `<a href="${escapeHtml(o.link)}" target="_blank" rel="noopener" style="font-size:0.75rem; font-weight:800; color:var(--user-theme-accent, #ff5500); text-decoration:none;">▶ ${escapeHtml(o.linkLabel || 'Watch')}</a>` : ''}
    </div>`;
}

function medalCard(m, ctx) {
    const tierClass = { bronze: 'rank-bronze', silver: 'rank-silver', gold: 'rank-gold' }[m.goal_tier] || 'rank-silver';
    const parts = [];
    if (m.goal !== undefined && m.goal !== null) parts.push(`Goal: ${m.goal}`);
    if (m.distance_m) parts.push(`Distance: ${m.distance_m} m`);
    return buildItemCard({
        id: m.id, type: 'medal', badge: (m.goal_tier || 'Medal'), badgeClass: tierClass,
        title: m.name, sub: m.description, body: parts.join(' | '), img: m.image_url, ctx: `medal ${ctx || ''}`
    });
}

function ribbonCard(r, ctx) {
    return buildItemCard({
        id: r.id, type: 'ribbon', badge: 'Ribbon', badgeClass: 'rank-silver',
        title: r.name, sub: r.requirement, img: r.image_url, ctx: `ribbon ${ctx || ''}`
    });
}

function trophyCardFor(tKey, ctx) {
    const t = appState.trophies[tKey];
    if (!t) return '';
    const tType = (t.rank || 'Bronze').toUpperCase();
    let badgeClass = 'rank-bronze';
    if (tType.includes('PLATINUM')) badgeClass = 'rank-platinum';
    else if (tType.includes('GOLD')) badgeClass = 'rank-gold';
    else if (tType.includes('SILVER')) badgeClass = 'rank-silver';
    return buildItemCard({
        id: tKey, type: 'trophy', badge: tType, badgeClass,
        title: t.name, body: t.description, img: t.icon, ctx: `trophy ${ctx || ''}`
    });
}

function renderTree(node, cardFn, path) {
    if (isLeafList(node)) {
        return gridOf(toArr(node).filter(Boolean).map(it => cardFn(it, path.map(humanize).join(' '))));
    }
    let out = '';
    Object.entries(node || {}).forEach(([k, v]) => {
        const inner = renderTree(v, cardFn, path.concat(k));
        if (inner) out += buildFolder(escapeHtml(humanize(k)), inner);
    });
    return out;
}

function renderMissionBlock(mKey, m, placedTrophyKeys) {
    const mLabel = `Mission ${m.number} ${m.title || ''}`;
    const ctx = `${mLabel} ${m.region || ''}`;

    let inner = gridOf([buildItemCard({
        id: mKey, type: 'mission', badge: m.region || 'Campaign', badgeClass: 'rank-gold',
        title: m.title || mLabel, sub: [`Mission ${m.number}`, m.date].filter(Boolean).join(' · '),
        body: m.walkthrough || '', img: m.image_url, ctx,
        link: m.guide_video && m.guide_video.url, linkLabel: m.guide_video ? `Full guide video (${m.guide_video.creator || 'YouTube'})` : ''
    })]);

    const colCards = [];
    Object.entries(m.collectibles || {}).forEach(([cat, list]) => {
        toArr(list).forEach(it => {
            if (!it || !it.id) return;
            colCards.push(buildItemCard({
                id: it.id, type: 'collectible', group: `${mKey}__${cat}`,
                badge: COLLECTIBLE_LABELS[cat] || humanize(cat), badgeClass: 'rank-bronze',
                title: it.name, sub: it.location,
                body: [it.headline, it.author ? `— ${it.author}` : '', it.summary, it.unlocks ? `Unlocks: ${it.unlocks}` : ''].filter(Boolean).join(' '),
                img: it.image_url, ctx,
                link: it.video_url, linkLabel: 'Watch guide'
            }));
        });
    });
    if (colCards.length) inner += buildFolder('🗂️ Collectibles', gridOf(colCards));

    const chCards = [];
    const kc = m.kill_challenge;
    if (kc && typeof kc === 'object') {
        const body = [kc.location, kc.strategy, kc.reward ? `Reward: ${kc.reward}` : ''].filter(Boolean).join(' ');
        chCards.push(buildItemCard({
            id: `kill_${mKey}`, type: 'mission', badge: 'Kill List', badgeClass: 'rank-silver',
            title: kc.target_name, sub: kc.challenge, body, img: kc.image_url, ctx
        }));
    }
    const pm = m.propaganda_mission;
    if (pm && pm.id) {
        chCards.push(buildItemCard({
            id: pm.id, type: 'mission', badge: 'Propaganda', badgeClass: 'rank-gold',
            title: pm.title, sub: pm.target_score ? `Target: ${pm.target_score}` : '', body: pm.briefing || '', img: pm.image_url, ctx
        }));
    }
    if (chCards.length) inner += buildFolder('🎯 Challenges', gridOf(chCards));

    const trophyCards = [];
    toArr(m.trophies).forEach(t => {
        if (!t) return;
        const tKey = `trophy_${appState.gameId}_${t.trophyId}`;
        placedTrophyKeys.add(tKey);
        const card = trophyCardFor(tKey, ctx);
        if (card) trophyCards.push(card);
    });
    if (trophyCards.length) inner += buildFolder('🏆 Trophies', gridOf(trophyCards));

    const title = `🎖️ Mission ${escapeHtml(m.number)} — ${escapeHtml(m.title || '')}` +
        (m.region ? `<span class="mission-region">${escapeHtml(m.region)}</span>` : '');
    return buildFolder(title, inner);
}

function renderMissionSchema(data) {
    const placedTrophyKeys = new Set();
    let html = `
        <div class="uni-search-wrap">
            <input type="search" id="universalSearchInput" class="uni-search-input" autocomplete="off"
                   placeholder="Search missions, medals, ribbons, collectibles, trophies...">
            <button type="button" class="uni-search-btn" id="uniExpandAll">Expand all</button>
            <button type="button" class="uni-search-btn" id="uniCollapseAll">Collapse all</button>
            <div class="uni-search-count" id="universalSearchCount"></div>
        </div>`;

    Object.entries(data.missions)
        .filter(([, m]) => m && typeof m === 'object')
        .sort((a, b) => (a[1].number || 0) - (b[1].number || 0))
        .forEach(([mKey, m]) => { html += renderMissionBlock(mKey, m, placedTrophyKeys); });

    const ribbonTree = {};
    ribbonKeys(data).forEach(k => { ribbonTree[k.replace(/_ribbons$/, '')] = data[k]; });
    const ribbonHtml = renderTree(ribbonTree, ribbonCard, []);
    if (ribbonHtml) html += buildFolder('🎗️ Ribbons', ribbonHtml);

    if (data.medals && typeof data.medals === 'object') {
        const medalHtml = renderTree(data.medals, medalCard, []);
        if (medalHtml) html += buildFolder('🏅 Medals', medalHtml);
    }

    const generalTrophies = Object.keys(appState.trophies)
        .filter(k => !placedTrophyKeys.has(k))
        .map(k => trophyCardFor(k, 'general'))
        .filter(Boolean);
    if (generalTrophies.length) html += buildFolder('🏆 General Trophies', gridOf(generalTrophies));

    return html;
}

function setupUniversalSearch() {
    const input = document.getElementById('universalSearchInput');
    const container = document.getElementById('section-container');
    if (!input || !container) return;

    let timer = null;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => runUniversalSearch(input.value), 120);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; runUniversalSearch(''); }
    });

    const expandBtn = document.getElementById('uniExpandAll');
    const collapseBtn = document.getElementById('uniCollapseAll');
    if (expandBtn) expandBtn.addEventListener('click', () => {
        container.querySelectorAll('.category-section').forEach(s => s.classList.remove('section-collapsed'));
    });
    if (collapseBtn) collapseBtn.addEventListener('click', () => {
        container.querySelectorAll('.category-section').forEach(s => s.classList.add('section-collapsed'));
    });
}

function runUniversalSearch(raw) {
    const container = document.getElementById('section-container');
    const countEl = document.getElementById('universalSearchCount');
    if (!container) return;

    const q = String(raw || '').trim().toLowerCase();
    const cards = container.querySelectorAll('.game-item-card');
    const sections = Array.from(container.querySelectorAll('.category-section'));

    if (!q) {
        cards.forEach(c => c.classList.remove('search-hidden'));
        sections.forEach(s => {
            s.classList.remove('search-hidden');
            if (s.dataset.prevCollapsed !== undefined) {
                s.classList.toggle('section-collapsed', s.dataset.prevCollapsed === '1');
                delete s.dataset.prevCollapsed;
            }
        });
        if (countEl) countEl.innerText = '';
        return;
    }

    const terms = q.split(/\s+/);
    let matches = 0;
    cards.forEach(c => {
        const hay = c.getAttribute('data-search') || '';
        const hit = terms.every(t => hay.includes(t));
        c.classList.toggle('search-hidden', !hit);
        if (hit) matches++;
    });

    sections.slice().reverse().forEach(s => {
        if (s.dataset.prevCollapsed === undefined) {
            s.dataset.prevCollapsed = s.classList.contains('section-collapsed') ? '1' : '0';
        }
        const hasMatch = !!s.querySelector('.game-item-card:not(.search-hidden)');
        s.classList.toggle('search-hidden', !hasMatch);
        if (hasMatch) s.classList.remove('section-collapsed');
    });

    if (countEl) countEl.innerText = matches ? `${matches} result${matches === 1 ? '' : 's'}` : 'No results';
}

function renderUniversalCompanion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    ensureUniversalStyles();

    if (isMissionSchema(data)) {
        container.innerHTML = renderMissionSchema(data);
        appState.applyStateToUI();
        setupUniversalSearch();
        return;
    }

    // Legacy fallback renderer
    let html = '';
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
    if (str === undefined || str === null || str === '') return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Section 12: Game Pills Bar
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
                await appState.loadProgress();

                if (appState.psnGamertag) {
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

// Section 13: Universal Bootstrapper
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

                const emailKey = user.email.replace(/@/g, '_at_').replace(/\./g, '_');
                try {
                    const snap = await rtdb.ref(`/users/${emailKey}`).once('value');
                    const uData = snap.val() || {};
                    appState.myFriendCode = uData.friend_code || null;
                    appState.psnGamertag = uData.psn_username || null;

                    const codeDisplay = document.getElementById('myFriendCodeDisplay');
                    if (codeDisplay && appState.myFriendCode) codeDisplay.innerText = appState.myFriendCode;

                    applyUserProfileStyling(uData);

                    if (uData.primary_platform) {
                        await appState.switchPlatform(uData.primary_platform.toLowerCase(), false);
                    }
                } catch (e) {}

                if (appState.gameData) {
                    await appState.loadProgress();
                    await appState.syncFriendsProgress();
                    if (appState.psnGamertag) {
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

                if (appState.gameData) await appState.loadProgress();
            }
        });
    }

    await loadAndHydrateGame(CURRENT_GAME_KEY);
}

// Universal Self-Starting Execution Gate
if (document.readyState === 'link' || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUniversalEngine);
} else {
    initUniversalEngine();
}
