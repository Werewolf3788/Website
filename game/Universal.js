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

// All ribbons as a tree: supports "campaign_ribbons": [...] keys and a
// nested "ribbons": { campaign: [...], multiplayer: { combat: [...] } } object.
// Lists named *_unverified are skipped.
function ribbonTreeOf(data) {
    const tree = {};
    ribbonKeys(data).forEach(k => { tree[k.replace(/_ribbons$/, '')] = data[k]; });
    if (data && data.ribbons && typeof data.ribbons === 'object' && !Array.isArray(data.ribbons)) {
        Object.entries(data.ribbons).forEach(([k, v]) => { if (!/_unverified$/.test(k)) tree[k] = v; });
    }
    return tree;
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
    wallet: { credits: 0, level: 1, xp: 0, xpNext: null, gameDay: 1, gameTime: '06:00' },
    harvestLog: [],
    wishlist: [],
    watchlist: [],
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
        this.wallet = { credits: 0, level: 1, xp: 0, xpNext: null, gameDay: 1, gameTime: '06:00' };
        this.harvestLog = [];
        this.wishlist = [];
        this.watchlist = [];
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
            this.ribbons[it.id] = { earned: false, count: 0, name: it.name || '', requirement: it.requirement || '' };
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
        walkLeaves(ribbonTreeOf(data), r => this.registerRibbon(r));
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
            wallet: this.wallet,
            harvestLog: this.harvestLog,
            wishlist: this.wishlist,
            watchlist: this.watchlist,
            trophies: this.trophies
        };
    },

    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        if (payload.wallet && typeof payload.wallet === 'object') this.wallet = Object.assign({ credits: 0, level: 1, xp: 0, xpNext: null, gameDay: 1, gameTime: '06:00' }, payload.wallet);
        if (Array.isArray(payload.harvestLog)) this.harvestLog = payload.harvestLog;
        if (Array.isArray(payload.wishlist)) this.wishlist = payload.wishlist;
        if (Array.isArray(payload.watchlist)) this.watchlist = payload.watchlist;
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
                if (this.ribbons[rbId]) {
                    const saved = payload.ribbons[rbId] || {};
                    const n = Number.isFinite(+saved.count) ? Math.max(0, Math.floor(+saved.count)) : (saved.earned ? 1 : 0);
                    this.ribbons[rbId].count = n;
                    this.ribbons[rbId].earned = n > 0;
                }
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
    if (typeof renderWalletUI === 'function') renderWalletUI();

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
            isDone = (this.ribbons[id]?.count || 0) > 0;
            const inp = card.querySelector('.ribbon-count');
            if (inp && document.activeElement !== inp) inp.value = this.ribbons[id]?.count || 0;
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
        const cards = sec.querySelectorAll('.game-item-card');
        const total = cards.length;
        const onlyRibbons = total && [...cards].every(c => c.getAttribute('data-type') === 'ribbon');
        if (onlyRibbons) {
            const earned = [...cards].reduce((n, c) => n + (this.ribbons[c.getAttribute('data-id')]?.count || 0), 0);
            badge.innerText = `${earned} earned`;
            return;
        }
        const done = sec.querySelectorAll('.game-item-card.completed').length;
        badge.innerText = total ? `${done}/${total}` : '';
    });
};

// Ribbons can be earned many times: store the number shown in game.
window.appState.setRibbonCount = function(itemId, value) {
    const n = Math.max(0, Math.min(999999, Math.floor(Number(value) || 0)));
    if (!this.ribbons[itemId]) this.ribbons[itemId] = { earned: false, count: 0 };
    this.ribbons[itemId].count = n;
    this.ribbons[itemId].earned = n > 0;
    this.applyStateToUI();
    clearTimeout(this._ribbonSaveTimer);
    this._ribbonSaveTimer = setTimeout(() => this.saveProgress(), 600);
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
        .ribbon-count-wrap { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; color: #94a3b8; font-weight: 800; }
        .ribbon-count { width: 68px; min-height: 40px; padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18);
            background: #0f172a; color: #fff; font-size: 1rem; font-weight: 800; text-align: center; }
        .ribbon-count:focus { outline: none; border-color: var(--user-theme-accent, #ff5500); }
        .mission-detail { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); margin-top: 10px; }
        .mission-detail h4 { margin: 0 0 4px; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; }
        .mission-detail p, .mission-detail li { margin: 0; font-size: 0.82rem; line-height: 1.45; color: #e2e8f0; }
        .mission-detail ul { margin: 0; padding-left: 18px; }
        .mission-hero { width: 100%; max-width: 560px; display: block; max-height: 220px; object-fit: cover; border-radius: 10px; margin-bottom: 10px; }
        .game-overview { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .game-chip { padding: 6px 12px; border-radius: 999px; background: #1e293b; border: 1px solid rgba(255,255,255,0.12); color: #e2e8f0; font-size: 0.78rem; font-weight: 700; }
        .game-chip.on { border-color: #22c55e; color: #86efac; }
        .wallet-meter { font-size: 0.78rem; color: #cbd5e1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; }
        .wm-num { font-weight: 800; color: #fbbf24; }
        .wm-num.ok { color: #86efac; }
        .wm-bar { flex: 1 1 120px; height: 6px; border-radius: 999px; background: #0f172a; overflow: hidden; min-width: 80px; }
        .wm-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #f59e0b, #22c55e); }
        .harvest-form { display: flex; flex-wrap: wrap; gap: 8px; }
        .hunt-input { flex: 1 1 140px; padding: 8px 10px; }
        .ctl-wrap { overflow-x: auto; }
        .guide-sec { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #cbd5e1; font-size: 0.85rem; line-height: 1.5; }
        .guide-sec h3 { color: #fff; font-size: 1rem; margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .guide-sec ul { margin: 6px 0 8px 18px; } .guide-sec li { margin: 3px 0; }
        .guide-src { font-size: 0.7rem; color: #64748b; margin-top: 6px; }
        .ctl-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; color: #e2e8f0; }
        .ctl-table th { text-align: left; color: #94a3b8; font-weight: 600; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .ctl-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
        .ctl-table kbd { display: inline-block; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 2px 7px; font-family: inherit; font-size: 0.78rem; color: #fff; }
        .ctl-how { display: block; font-size: 0.7rem; color: #64748b; margin-top: 2px; }
        .hunt-2col { display: grid; grid-template-columns: minmax(280px, 420px) 1fr; gap: 16px; align-items: start; }
        @media (max-width: 900px) { .hunt-2col { grid-template-columns: 1fr; } }
        .hunt-form-col { background: rgba(2,6,23,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; }
        .hunt-card-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; max-height: 760px; overflow-y: auto; }
        .hunt-card { display: flex; flex-direction: column; gap: 6px; }
        .hunt-photo { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; background: #0f172a; }
        .hunt-photo-empty { height: 80px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 0.75rem; }
        .hunt-check, .hunt-file { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #cbd5e1; flex: 1 1 140px; }
        .hunt-file input { max-width: 100%; color: #cbd5e1; font-size: 0.75rem; }
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
                ${img ? `<img src="${img}" alt="" loading="lazy" style="${o.wideImg ? 'width:96px; height:40px; object-fit:contain; background:#0f172a;' : 'width:40px; height:40px; object-fit:cover;'} border-radius:6px; flex:0 0 auto;" onerror="this.style.display='none'">` : ''}
                <div>
                    <span class="trophy-rank ${o.badgeClass || 'rank-bronze'}">${escapeHtml(o.badge || '')}</span>
                    <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(o.title || '')}</h3>
                    ${o.sub ? `<div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(o.sub)}</div>` : ''}
                </div>
            </div>
            ${o.counter
                ? `<label class="ribbon-count-wrap" title="Times earned"><span>×</span><input type="number" min="0" step="1" inputmode="numeric" class="ribbon-count" value="0" aria-label="Times earned: ${escapeHtml(o.title || '')}" onchange="appState.setRibbonCount('${escapeHtml(o.id)}', this.value)"></label>`
                : `<button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(o.id)}', '${o.type}'${groupArg})" aria-label="Toggle"></button>`}
        </div>
        ${o.body ? `<p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(o.body)}</p>` : ''}
        ${o.price ? `<div class="price-meter wallet-meter" data-price="${Number(o.price) || 0}"></div>` : ''}
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
        title: r.name, sub: r.requirement, img: r.image_url, ctx: `ribbon ${ctx || ''}`, counter: true, wideImg: true
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
    const detail = [];
    if (m.description) detail.push(`<div><h4>Description</h4><p>${escapeHtml(m.description)}</p></div>`);
    if (toArr(m.optional_objectives).length) detail.push(`<div><h4>Optional Objectives (${toArr(m.optional_objectives).length})</h4><ul>${toArr(m.optional_objectives).map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul></div>`);
    if (m.kill_target || (typeof m.kill_challenge === 'string' && m.kill_challenge)) {
        detail.push(`<div><h4>Kill List</h4>${m.kill_target ? `<p><strong>${escapeHtml(m.kill_target)}</strong></p>` : ''}${typeof m.kill_challenge === 'string' && m.kill_challenge ? `<p>Kill challenge: ${escapeHtml(m.kill_challenge)}</p>` : ''}</div>`);
    }
    const tot = m.collectible_totals;
    if (tot || m.starting_locations) {
        const rows = tot ? Object.entries(tot).filter(([k]) => k !== 'total').map(([k, v]) => `<li>${escapeHtml(COLLECTIBLE_LABELS[k] || humanize(k))}: ${v}</li>`).join('') : '';
        detail.push(`<div><h4>Collectibles${tot && tot.total ? ` (${tot.total})` : ''}</h4>${rows ? `<ul>${rows}</ul>` : ''}${m.starting_locations ? `<p>Starting locations: ${escapeHtml(String(m.starting_locations))}</p>` : ''}</div>`);
    }
    if (detail.length) inner = (m.image_url ? `<img class="mission-hero" src="${toSecureUrl(m.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '') + `<div class="mission-detail">${detail.join('')}</div>` + inner;

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

    const chips = [];
    if (data.crossplay && data.crossplay.supported) chips.push(`<span class="game-chip on" title="${escapeHtml(data.crossplay.toggle || '')}">✔ Cross-play</span>`);
    toArr(data.play_modes).forEach(pm => chips.push(`<span class="game-chip">${escapeHtml(pm)}</span>`));
    if (chips.length) html += `<div class="game-overview">${chips.join('')}</div>`;

    Object.entries(data.missions)
        .filter(([, m]) => m && typeof m === 'object')
        .sort((a, b) => (a[1].number || 0) - (b[1].number || 0))
        .forEach(([mKey, m]) => { html += renderMissionBlock(mKey, m, placedTrophyKeys); });

    const ribbonTree = ribbonTreeOf(data);
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

// ---------------------------------------------------------------------------
// Hunter tools (hunting games): wallet (credits, level/XP, level rewards),
// in-game clock, harvest log with trophy photos, watchlist countdowns,
// wishlist, and "credits needed/total" meters on anything with a price.
// ---------------------------------------------------------------------------
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const levelsData = () => appState.gameData?.player_levels || {};
function xpNeededFor(level) { const v = (levelsData().xp_to_next_level || {})[String(level)]; return v ? Number(v) : null; }
function levelReward(level) { return (levelsData().rewards || {})[String(level)] || null; }
function meterHtml(needed, total, unit) {
    const pct = total ? Math.min(100, Math.round(((total - needed) / total) * 100)) : 0;
    return `<span class="wm-num${needed <= 0 ? ' ok' : ''}">${needed <= 0 ? '✔ ' : ''}${fmtNum(Math.max(0, needed))}/${fmtNum(total)}${unit ? ' ' + unit : ''}</span><span class="wm-bar"><span style="width:${pct}%"></span></span>`;
}
const setVal = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v; };

// ---- in-game clock & lifecycles
function gameNowDays() {
    const w = appState.wallet || {};
    const [h, m] = String(w.gameTime || '00:00').split(':').map(Number);
    return (Number(w.gameDay) || 1) + ((h || 0) + (m || 0) / 60) / 24;
}
function lifecycleFor(species) {
    const key = String(species || '').toLowerCase().replace(/[^a-z]/g, '');
    const list = toArr(appState.gameData?.lifecycles?.species);
    const e = list.find(x => String(x.species).toLowerCase().replace(/[^a-z]/g, '') === key);
    if (!e) return null;
    if (e.max_age_years) return { max: e.max_age_years, young: e.young_years, adult: e.adult_years, mature: e.mature_years, conflict: false };
    const opts = toArr(e.stages_by_source);
    const pick = opts.slice().sort((x, y) => x.max - y.max)[0];
    return pick ? { max: pick.max, young: pick.young, adult: pick.adult, mature: pick.mature, conflict: true, reported: toArr(e.max_age_years_reported) } : null;
}
function stageForAge(lc, age) {
    if (!lc) return '';
    const inRange = (r) => { const [a, b] = String(r || '').split('-').map(Number); return age >= a && age <= (b || a); };
    if (inRange(lc.young)) return 'Young'; if (inRange(lc.adult)) return 'Adult'; if (inRange(lc.mature)) return 'Mature';
    return age > lc.max ? 'Past max age' : '';
}
function watchStatus(w) {
    const elapsed = Math.max(0, gameNowDays() - (Number(w.sightedDay) + (Number(String(w.sightedTime || '0:0').split(':')[0]) || 0) / 24));
    const ageNow = Number(w.age) + Math.floor(elapsed / 3);
    const daysLeft = (Number(w.maxAge) - Number(w.age)) * 3 - elapsed;
    const fit = parseFloat(w.fitness);
    let urgency = 'MONITOR', color = '#38bdf8', msg = 'Average genetics. Watch how its trophy develops.';
    if (daysLeft <= 0) { urgency = 'GONE?'; color = '#64748b'; msg = 'Past its max age; it has probably died of old age.'; }
    else if (daysLeft <= 3) { urgency = 'CRITICAL'; color = '#ef4444'; msg = 'Final year: harvest it before it dies of old age.'; }
    else if (fit >= 85) { urgency = 'PROTECT / GROW'; color = '#f59e0b'; msg = '5-star potential. Let it age further.'; }
    else if (fit < 55) { urgency = 'CULL'; color = '#ef4444'; msg = 'Low fitness. Remove before the year rolls over.'; }
    return { elapsed, ageNow, daysLeft, urgency, color, msg, dieDay: Number(w.sightedDay) + (Number(w.maxAge) - Number(w.age)) * 3 };
}
function fmtGameSpan(days) {
    if (days <= 0) return '0 days';
    const d = Math.floor(days), h = Math.round((days - d) * 24);
    return `${d} day${d === 1 ? '' : 's'}${h ? ` ${h} h` : ''}`;
}

// ---- trophy photos (compressed and stored in Firestore, one doc per photo)
const trophyPhotoCache = {};
function photoDocRef(id) {
    const key = appState.getUserKey(); if (!key || !firestore) return null;
    return firestore.collection('user').doc(key).collection('platform').doc(appState.platform)
        .collection('game').doc(appState.getCanonicalGameName()).collection('trophy_photos').doc(id);
}
function compressImage(file, maxSide = 1024, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const img = new Image(); const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
            let q = quality, data = c.toDataURL('image/jpeg', q);
            while (data.length > 700000 && q > 0.35) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
            resolve(data);
        };
        img.onerror = () => reject(new Error('Could not read that image'));
        img.src = url;
    });
}
async function loadTrophyPhoto(id) {
    if (trophyPhotoCache[id] !== undefined) return;
    trophyPhotoCache[id] = null;
    try { const ref = photoDocRef(id); if (!ref) return; const doc = await ref.get(); if (doc.exists) { trophyPhotoCache[id] = doc.data().data; renderWalletUI(); } }
    catch (e) { console.warn('[Trophy photo]', e); }
}

// ---- rendering
function renderWalletUI() {
    const w = appState.wallet || {};
    if (!document.getElementById('walletCredits')) return;
    setVal('walletCredits', w.credits || 0); setVal('walletLevel', w.level || 1); setVal('walletXp', w.xp || 0);
    const next = w.xpNext || xpNeededFor(w.level); setVal('walletXpNext', next || '');
    setVal('gameDay', w.gameDay || 1); setVal('gameTime', w.gameTime || '06:00');
    const reward = levelReward((w.level || 1) + 1);
    const lvMeter = document.getElementById('walletLevelMeter');
    if (lvMeter) lvMeter.innerHTML = (next ? `XP needed for level ${(w.level || 1) + 1}: ` + meterHtml(next - (w.xp || 0), next, 'XP') : 'Enter the XP needed for the next level (from the pause menu).')
        + (levelsData().max_level ? `<span class="game-chip">Max level ${levelsData().max_level}${levelsData().max_level_verified === false ? ' (unconfirmed)' : ''}</span>` : '')
        + (reward ? `<span class="game-chip">Level ${(w.level || 1) + 1} reward: ${fmtNum(reward.credits)} credits${reward.skill_points ? ` + ${reward.skill_points} skill point` : ''}${reward.unlocks ? ` + ${escapeHtml(reward.unlocks)}` : ''}${reward.inferred ? ' (estimated)' : ''}</span>` : '');
    document.querySelectorAll('.price-meter').forEach(el => { const p = Number(el.dataset.price || 0); el.innerHTML = 'Credits needed: ' + meterHtml(p - (w.credits || 0), p, ''); });

    const log = document.getElementById('harvestLogList');
    if (log) {
        log.innerHTML = appState.harvestLog.length ? appState.harvestLog.slice().reverse().map(h => {
            if (h.photoId) loadTrophyPhoto(h.photoId);
            const photo = h.photoId && trophyPhotoCache[h.photoId];
            return `<div class="trophy-card hunt-card">
                ${photo ? `<img class="hunt-photo" src="${photo}" alt="Trophy photo">` : (h.photoId ? '<div class="hunt-photo hunt-photo-empty">Loading photo…</div>' : '')}
                <div style="display:flex;justify-content:space-between;gap:8px;"><div>
                <span class="trophy-rank rank-gold">${escapeHtml(h.huntRating || 'Harvest')}</span> ${h.taxidermy ? '<span class="trophy-rank rank-silver">Taxidermy</span>' : ''}
                <h3 style="color:#fff;font-size:0.95rem;margin-top:4px;">${escapeHtml(h.species)}${h.sex ? ` (${escapeHtml(h.sex)})` : ''}</h3>
                <div style="font-size:0.75rem;color:#94a3b8;">${'★'.repeat(h.stars || 0)} ${h.score ? `· Score ${escapeHtml(String(h.score))}` : ''} ${h.fitness ? `· Fitness ${escapeHtml(String(h.fitness))}%` : ''} ${h.age ? `· ${escapeHtml(String(h.age))} yrs` : ''} ${h.weight ? `· ${escapeHtml(String(h.weight))} lb` : ''}</div>
                <div style="font-size:0.8rem;color:#e2e8f0;">+${fmtNum(h.credits)} credits · +${fmtNum(h.xp)} XP ${h.notes ? `· ${escapeHtml(h.notes)}` : ''}</div>
                <div style="font-size:0.7rem;color:#64748b;">${h.gameDay ? `Game day ${escapeHtml(String(h.gameDay))} ${escapeHtml(h.gameTime || '')} · ` : ''}${escapeHtml(h.date || '')}</div></div>
                <button type="button" class="uni-search-btn" onclick="appState.deleteHarvest('${escapeHtml(h.id)}')" title="Remove and take the credits/XP back off">Remove</button>
            </div></div>`; }).join('') : '<p style="color:#94a3b8;font-size:0.85rem;">No harvests logged yet.</p>';
    }

    const wl = document.getElementById('watchlistList');
    if (wl) {
        wl.innerHTML = appState.watchlist.length ? appState.watchlist.map(x => {
            const st = watchStatus(x); const lc = lifecycleFor(x.species); const stage = stageForAge(lc, st.ageNow);
            const pct = Math.max(0, Math.min(100, Math.round((st.daysLeft / Math.max(1, (x.maxAge - x.age) * 3)) * 100)));
            return `<div class="trophy-card hunt-card" style="border-left:4px solid ${st.color}">
                <div style="display:flex;justify-content:space-between;gap:8px;"><div style="flex:1">
                <span class="trophy-rank" style="background:${st.color};color:#020617">${st.urgency}</span>
                <h3 style="color:#fff;font-size:0.95rem;margin-top:4px;">${escapeHtml(x.name || 'Tracked animal')} — ${escapeHtml(x.species)}${x.sex ? ` (${escapeHtml(x.sex)})` : ''}</h3>
                <div style="font-size:0.78rem;color:#cbd5e1;">Age now ~${st.ageNow}/${escapeHtml(String(x.maxAge))} yrs${stage ? ` · ${stage}` : ''} · Fitness ${escapeHtml(String(x.fitness || '?'))}%${x.location ? ` · ${escapeHtml(x.location)}` : ''}</div>
                <div class="wallet-meter"><span class="wm-num">${st.daysLeft > 0 ? `${fmtGameSpan(st.daysLeft)} left` : 'Time is up'}</span><span class="wm-bar"><span style="width:${pct}%;background:${st.color}"></span></span></div>
                <div style="font-size:0.72rem;color:#94a3b8;">Seen game day ${escapeHtml(String(x.sightedDay))} ${escapeHtml(x.sightedTime || '')} · Dies around game day ${Math.floor(st.dieDay)}${lc && lc.conflict ? ' · lifecycle notes disagree, using the shorter max age' : ''}</div>
                <div style="font-size:0.78rem;color:#e2e8f0;margin-top:4px;">${st.msg}${x.notes ? ` · ${escapeHtml(x.notes)}` : ''}</div></div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <button type="button" class="uni-search-btn" onclick="appState.editWatch('${escapeHtml(x.id)}')">Edit</button>
                    <button type="button" class="uni-search-btn" onclick="appState.harvestWatch('${escapeHtml(x.id)}')">Harvested</button>
                    <button type="button" class="uni-search-btn" onclick="appState.removeWatch('${escapeHtml(x.id)}')">Remove</button>
                </div></div></div>`; }).join('') : '<p style="color:#94a3b8;font-size:0.85rem;">No animals on your watchlist.</p>';
    }

    const wish = document.getElementById('wishlistList');
    if (wish) {
        wish.innerHTML = appState.wishlist.map(it => `<div class="trophy-card hunt-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
            <div style="flex:1"><h3 style="color:#fff;font-size:0.95rem;">${escapeHtml(it.name)}</h3><div class="wallet-meter">Credits needed: ${meterHtml(Number(it.price) - (w.credits || 0), Number(it.price), '')}</div></div>
            <button type="button" class="uni-search-btn" onclick="appState.removeWish('${escapeHtml(it.id)}')">Remove</button></div></div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">Nothing on your wishlist.</p>';
    }
}

// ---- actions
window.appState.applyLevelUps = function() {
    const w = this.wallet;
    let next = w.xpNext || xpNeededFor(w.level);
    while (next && w.xp >= next) {
        w.xp -= next; w.level += 1; w.xpNext = null;
        const r = levelReward(w.level);
        if (r && r.credits) w.credits = (w.credits || 0) + Number(r.credits);
        this.updateStatus(`Level up! Now level ${w.level}${r && r.credits ? ` (+${fmtNum(r.credits)} credits${r.inferred ? ', estimated' : ''})` : ''}.`);
        next = xpNeededFor(w.level);
    }
};
window.appState.setWallet = function(field, value) {
    if (field === 'gameTime') this.wallet.gameTime = value || '00:00';
    else {
        const n = Math.max(0, Math.floor(Number(value) || 0));
        if (field === 'level') { this.wallet.level = Math.max(1, n); this.wallet.xpNext = null; }
        else if (field === 'xpNext') this.wallet.xpNext = n || null;
        else if (field === 'gameDay') this.wallet.gameDay = Math.max(1, n);
        else this.wallet[field] = n;
        if (field === 'xp') this.applyLevelUps();
    }
    this.applyStateToUI(); this.saveProgress();
};
window.appState.addHarvest = async function(form) {
    const f = new FormData(form);
    const h = {
        id: 'h' + Date.now(), species: f.get('species') || 'Unknown', sex: f.get('sex') || '',
        credits: Math.max(0, Math.floor(Number(f.get('credits')) || 0)), xp: Math.max(0, Math.floor(Number(f.get('xp')) || 0)),
        fitness: f.get('fitness') || '', score: f.get('score') || '', stars: Number(f.get('stars')) || 0, age: f.get('age') || '', weight: f.get('weight') || '',
        huntRating: f.get('huntRating') || '', notes: f.get('notes') || '', taxidermy: !!f.get('taxidermy'),
        gameDay: this.wallet.gameDay, gameTime: this.wallet.gameTime, date: new Date().toLocaleString()
    };
    const file = f.get('photo');
    if (file && file.size) {
        const ref = photoDocRef(h.id);
        if (!ref) { this.updateStatus('Sign in to save trophy photos. The harvest was saved without the photo.'); }
        else {
            try {
                const data = await compressImage(file);
                await ref.set({ data, species: h.species, harvestId: h.id, createdAt: new Date().toISOString() });
                h.photoId = h.id; trophyPhotoCache[h.id] = data;
            } catch (e) { console.warn('[Trophy photo]', e); this.updateStatus(`Photo not saved: ${e.message}`); }
        }
    }
    this.harvestLog.push(h);
    this.wallet.credits = (this.wallet.credits || 0) + h.credits;
    this.wallet.xp = (this.wallet.xp || 0) + h.xp;
    this.applyLevelUps();
    form.reset();
    this.applyStateToUI(); this.saveProgress();
    this.updateStatus(`Harvest saved: +${fmtNum(h.credits)} credits, +${fmtNum(h.xp)} XP.`);
};
window.appState.deleteHarvest = function(id) {
    const i = this.harvestLog.findIndex(h => h.id === id); if (i < 0) return;
    const h = this.harvestLog.splice(i, 1)[0];
    this.wallet.credits = Math.max(0, (this.wallet.credits || 0) - (h.credits || 0));
    this.wallet.xp = Math.max(0, (this.wallet.xp || 0) - (h.xp || 0));
    if (h.photoId) { const ref = photoDocRef(h.photoId); if (ref) ref.delete().catch(() => {}); delete trophyPhotoCache[h.photoId]; }
    this.applyStateToUI(); this.saveProgress();
};
window.appState.saveWatch = function(form) {
    const f = new FormData(form);
    const id = f.get('id') || ('w' + Date.now());
    const entry = {
        id, name: f.get('name') || '', species: f.get('species') || '', sex: f.get('sex') || '',
        fitness: f.get('fitness') || '', age: Math.max(1, Math.floor(Number(f.get('age')) || 1)),
        maxAge: Math.max(1, Math.floor(Number(f.get('maxAge')) || 1)), location: f.get('location') || '', notes: f.get('notes') || '',
        sightedDay: Math.max(1, Math.floor(Number(f.get('sightedDay')) || this.wallet.gameDay || 1)), sightedTime: f.get('sightedTime') || this.wallet.gameTime || '06:00'
    };
    const i = this.watchlist.findIndex(x => x.id === id);
    if (i >= 0) this.watchlist[i] = entry; else this.watchlist.push(entry);
    form.reset(); form.id.value = ''; form.querySelector('[type=submit]').textContent = 'Add to watchlist';
    fillWatchDefaults(form);
    this.applyStateToUI(); this.saveProgress();
};
window.appState.editWatch = function(id) {
    const x = this.watchlist.find(w => w.id === id); const form = document.getElementById('watchForm'); if (!x || !form) return;
    ['id', 'name', 'species', 'sex', 'fitness', 'age', 'maxAge', 'location', 'notes', 'sightedDay', 'sightedTime'].forEach(k => { if (form[k]) form[k].value = x[k] ?? ''; });
    form.querySelector('[type=submit]').textContent = 'Save changes';
    form.closest('.category-section')?.classList.remove('section-collapsed');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
window.appState.harvestWatch = function(id) {
    const x = this.watchlist.find(w => w.id === id); const form = document.getElementById('harvestForm'); if (!x || !form) return;
    form.species.value = x.species; form.sex.value = x.sex || ''; form.fitness.value = x.fitness || ''; form.age.value = watchStatus(x).ageNow;
    form.notes.value = x.name ? `Watchlist: ${x.name}` : '';
    this.watchlist = this.watchlist.filter(w => w.id !== id);
    this.applyStateToUI(); this.saveProgress();
    form.closest('.category-section')?.classList.remove('section-collapsed');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.updateStatus('Fill in the credits and XP from the harvest screen, then save.');
};
window.appState.removeWatch = function(id) { this.watchlist = this.watchlist.filter(w => w.id !== id); this.applyStateToUI(); this.saveProgress(); };
window.appState.addWish = function(form) {
    const f = new FormData(form); const price = Math.max(0, Math.floor(Number(f.get('price')) || 0));
    if (!f.get('name') || !price) return;
    this.wishlist.push({ id: 'w' + Date.now(), name: f.get('name'), price }); form.reset(); this.applyStateToUI(); this.saveProgress();
};
window.appState.removeWish = function(id) { this.wishlist = this.wishlist.filter(w => w.id !== id); this.applyStateToUI(); this.saveProgress(); };
function fillWatchDefaults(form) {
    const lc = lifecycleFor(form.species.value);
    if (lc && !form.maxAge.value) form.maxAge.value = lc.max;
    const hint = document.getElementById('watchLifeHint');
    if (hint) hint.textContent = lc ? `Lifecycle: max ${lc.max} yrs · Young ${lc.young} · Adult ${lc.adult} · Mature ${lc.mature}${lc.conflict ? ` (notes disagree: ${lc.reported.join(' or ')} yrs)` : ''}` : 'No lifecycle data for this species yet; enter its max age.';
}
window.fillWatchDefaults = fillWatchDefaults;

function walletPanelHtml(data) {
    const speciesOpts = toArr(data.species).map(s => s && s.name).filter(Boolean).sort().map(n => `<option>${escapeHtml(n)}</option>`).join('');
    const inp = 'class="uni-search-input hunt-input"';
    const two = (formHtml, cardsHtml) => `<div class="hunt-2col"><div class="hunt-form-col">${formHtml}</div><div class="hunt-cards-col">${cardsHtml}</div></div>`;
    return `
    <section class="category-section">
        <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')"><h2>💰 Hunter Wallet & Clock</h2><span class="sec-progress"></span><span>▾</span></div>
        <div class="section-content">
            <div class="mission-detail">
                <div><h4>Credits</h4><input id="walletCredits" type="number" min="0" ${inp} onchange="appState.setWallet('credits', this.value)"></div>
                <div><h4>Level</h4><input id="walletLevel" type="number" min="1" ${inp} onchange="appState.setWallet('level', this.value)"></div>
                <div><h4>Current XP</h4><input id="walletXp" type="number" min="0" ${inp} onchange="appState.setWallet('xp', this.value)"></div>
                <div><h4>XP needed for next level</h4><input id="walletXpNext" type="number" min="0" ${inp} onchange="appState.setWallet('xpNext', this.value)"></div>
                <div><h4>In-game day</h4><input id="gameDay" type="number" min="1" ${inp} onchange="appState.setWallet('gameDay', this.value)"></div>
                <div><h4>In-game time</h4><input id="gameTime" type="time" ${inp} onchange="appState.setWallet('gameTime', this.value)"></div>
            </div>
            <div id="walletLevelMeter" class="wallet-meter" style="margin:10px 0;"></div>
            <p style="font-size:0.75rem;color:#94a3b8;">Update the in-game day and time when you play; watchlist countdowns use it (3 in-game days = 1 year).</p>
        </div>
    </section>
    ${buildFolder('🎯 Watchlist (countdown to old age)', two(`
        <form id="watchForm" class="harvest-form" onsubmit="event.preventDefault(); appState.saveWatch(this);">
            <input type="hidden" name="id">
            <input name="name" placeholder="Name / label (e.g. Big 10-point)" ${inp}>
            <select name="species" ${inp} onchange="this.form.maxAge.value=''; fillWatchDefaults(this.form)">${speciesOpts}</select>
            <select name="sex" ${inp}><option value="">Sex</option><option>Male</option><option>Female</option></select>
            <input name="fitness" type="number" step="0.1" min="0" max="100" placeholder="Fitness %" ${inp}>
            <input name="age" type="number" min="1" placeholder="Age now (yrs)" required ${inp}>
            <input name="maxAge" type="number" min="1" placeholder="Max age (yrs)" required ${inp}>
            <input name="sightedDay" type="number" min="1" placeholder="Seen on game day (blank = now)" title="Leave blank to use the current in-game day/time" ${inp}>
            <input name="sightedTime" type="time" ${inp}>
            <input name="location" placeholder="Where (region / need zone)" ${inp}>
            <input name="notes" placeholder="Notes" ${inp}>
            <div id="watchLifeHint" style="font-size:0.72rem;color:#94a3b8;flex-basis:100%;"></div>
            <button type="submit" class="uni-search-btn">Add to watchlist</button>
        </form>`, '<div id="watchlistList" class="hunt-card-list"></div>'))}
    ${buildFolder('📒 Harvest Log & Trophy Photos', two(`
        <form id="harvestForm" class="harvest-form" onsubmit="event.preventDefault(); appState.addHarvest(this);">
            <select name="species" ${inp}>${speciesOpts}</select>
            <select name="sex" ${inp}><option value="">Sex</option><option>Male</option><option>Female</option></select>
            <input name="credits" type="number" min="0" placeholder="Credits earned (sell price)" required ${inp}>
            <input name="xp" type="number" min="0" placeholder="XP earned" ${inp}>
            <input name="fitness" type="number" step="0.1" min="0" max="100" placeholder="Fitness %" ${inp}>
            <input name="age" type="number" min="1" placeholder="Age (yrs)" ${inp}>
            <input name="weight" type="number" step="0.1" placeholder="Weight (lb)" ${inp}>
            <input name="score" type="number" step="0.1" placeholder="Total trophy score" ${inp}>
            <select name="stars" ${inp}><option value="0">Trophy stars</option><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option><option value="4">★★★★</option><option value="5">★★★★★</option></select>
            <input name="huntRating" placeholder="Hunt rating (e.g. S++)" ${inp}>
            <input name="notes" placeholder="Notes (weapon, distance...)" ${inp}>
            <label class="hunt-check"><input type="checkbox" name="taxidermy"> Taxidermy</label>
            <label class="hunt-file">📷 Trophy photo <input type="file" name="photo" accept="image/*"></label>
            <button type="submit" class="uni-search-btn">Save harvest</button>
        </form>`, '<div id="harvestLogList" class="hunt-card-list"></div>'))}
    ${buildFolder('🛒 Wishlist (weapons, gear...)', two(`
        <form class="harvest-form" onsubmit="event.preventDefault(); appState.addWish(this);">
            <input name="name" placeholder="Item (e.g. Primacy Superior 7700)" required ${inp}>
            <input name="price" type="number" min="1" placeholder="Price in credits" required ${inp}>
            <button type="submit" class="uni-search-btn">Add</button>
        </form>`, '<div id="wishlistList" class="hunt-card-list"></div>'))}`;
}

// Hunting games (e.g. Way of the Hunter 2): reserves, species, quests, challenges
function newPlayerGuideHtml(data) {
    const g = data.new_player_guide; if (!g) return '';
    const badge = (sec) => sec.verified ? '<span class="game-chip" style="background:#14532d;">Confirmed</span>' : '<span class="game-chip" style="background:#713f12;">Not confirmed yet</span>';
    const energyTable = () => {
        const rows = toArr(data.species).filter(sp => sp && sp.class).sort((a, b) => a.class - b.class || a.name.localeCompare(b.name)).map(sp => {
            const h = sp.recommended_hit || {};
            return `<tr><td>${escapeHtml(sp.name)}</td><td>${sp.class}</td><td>${escapeHtml(h.bullet || '—')}</td><td>${escapeHtml(h.buckshot || '—')}</td><td>${escapeHtml(h.slug || '—')}</td></tr>`;
        }).join('');
        return `<div class="ctl-wrap"><table class="ctl-table"><thead><tr><th>Animal</th><th>Class</th><th>Bullet energy</th><th>Buckshot</th><th>Slug</th></tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:0.72rem;color:#64748b;">"—" = not in your encyclopedia screenshots yet.</p>`;
    };
    const body = toArr(g.sections).map(sec => `
        <div class="guide-sec">
            <h3>${escapeHtml(sec.title)} ${badge(sec)}</h3>
            ${sec.body ? `<p>${escapeHtml(sec.body)}</p>` : ''}
            ${toArr(sec.bullets).length ? `<ul>${toArr(sec.bullets).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
            ${sec.auto_table === 'species_energy' ? energyTable() : ''}
            ${toArr(sec.weapons).length ? `<div class="ctl-wrap"><table class="ctl-table"><thead><tr><th>Weapon</th><th>Type</th><th>Caliber</th><th>In WOTH2?</th><th>Notes</th></tr></thead><tbody>${toArr(sec.weapons).map(w => `<tr><td>${escapeHtml(w.name)}</td><td>${escapeHtml(w.type || '')}</td><td>${escapeHtml(w.caliber || '')}</td><td>${w.seen_in_woth2 ? '✔ Seen' : 'Unconfirmed'}</td><td>${escapeHtml(w.note || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
            ${toArr(sec.first_game_only_likely).length ? `<p style="font-size:0.75rem;color:#94a3b8;">Probably first game only: ${toArr(sec.first_game_only_likely).map(escapeHtml).join(', ')}</p>` : ''}
            ${sec.source ? `<p class="guide-src">Source: ${escapeHtml(sec.source)}</p>` : ''}
        </div>`).join('');
    return buildFolder('📘 ' + escapeHtml(g.title || 'New Player Guide'), `<div class="guide">${body}</div>`);
}
function renderHuntingSchema(data) {
    const byName = {};
    toArr(data.species).forEach(sp => { if (sp && sp.name) byName[sp.name.toLowerCase()] = sp; });
    const speciesCard = (sp, ctx) => {
        const parts = [];
        if (sp.class) parts.push(`Class ${sp.class}`);
        if (sp.trophy && sp.trophy.type) parts.push(`Trophy: ${sp.trophy.type}${sp.trophy.estimated_range ? ` (${sp.trophy.estimated_range})` : ''}`);
        if (sp.daily_routine) parts.push(`${sp.daily_routine.type}: ${sp.daily_routine.detail || ''}`);
        if (sp.senses) parts.push(`Vision ${sp.senses.vision} · Smell ${sp.senses.smell} · Hearing ${sp.senses.hearing}`);
        const rh = sp.recommended_hit;
        if (rh) parts.push(`Bullet ${rh.bullet} · Slug ${rh.slug} · Arrow ${rh.arrow_bolt}`);
        if (toArr(sp.recommended_equipment).length) parts.push(`Calls: ${toArr(sp.recommended_equipment).join(', ')}`);
        return buildItemCard({
            id: `species_${sp.id}`, type: 'mission', badge: sp.class ? `Class ${sp.class}` : 'Species', badgeClass: 'rank-silver',
            title: sp.name, sub: sp.scientific_name || '', body: parts.join(' | '), img: sp.image_url, ctx: `species ${ctx || ''} ${sp.preferred_biomes || ''}`
        });
    };
    let html = `
        <div class="uni-search-wrap">
            <input type="search" id="universalSearchInput" class="uni-search-input" autocomplete="off" placeholder="Search animals, quests, challenges...">
            <button type="button" class="uni-search-btn" id="uniExpandAll">Expand all</button>
            <button type="button" class="uni-search-btn" id="uniCollapseAll">Collapse all</button>
            <div class="uni-search-count" id="universalSearchCount"></div>
        </div>`;
    const chips = [];
    if (data.crossplay) chips.push(`<span class="game-chip${data.crossplay.supported ? ' on' : ''}" title="${escapeHtml(data.crossplay.note || '')}">${data.crossplay.supported ? '✔ Cross-play' : '✖ No cross-play'}</span>`);
    if (data.multiplayer) chips.push(`<span class="game-chip">${escapeHtml(data.multiplayer)}</span>`);
    if (chips.length) html += `<div class="game-overview">${chips.join('')}</div>`;
    html += newPlayerGuideHtml(data);
    html += walletPanelHtml(data);

    const listed = new Set();
    toArr(data.reserves).forEach(r => {
        if (!r) return;
        let inner = r.map_image_url ? `<img class="mission-hero" src="${toSecureUrl(r.map_image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
        if (toArr(r.areas).length) inner += `<div class="mission-detail"><div><h4>Areas</h4><p>${toArr(r.areas).map(escapeHtml).join(', ')}</p></div></div>`;
        const cards = toArr(r.species).map(n => { const sp = byName[String(n).toLowerCase()]; if (sp) { listed.add(sp.id); return speciesCard(sp, r.name); }
            return buildItemCard({ id: `species_${String(n).toLowerCase().replace(/\W+/g, '_')}`, type: 'mission', badge: 'Species', badgeClass: 'rank-bronze', title: n, sub: 'Details not captured yet', ctx: r.name }); });
        if (cards.length) inner += buildFolder('🦌 Species', gridOf(cards));
        html += buildFolder(`🗺️ ${escapeHtml(r.name)}${r.region ? `<span class="mission-region">${escapeHtml(r.region)}</span>` : ''}`, inner);
    });
    const rest = toArr(data.species).filter(sp => sp && !listed.has(sp.id));
    if (rest.length) html += buildFolder('🦌 Other Species', gridOf(rest.map(sp => speciesCard(sp, ''))));

    const hr = data.harvest_ranking;
    if (hr) {
        const ex = toArr(hr.examples).map((e, i) => buildItemCard({
            id: `harvest_ex_${i}`, type: 'mission', badge: e.hunt_rating || 'Harvest', badgeClass: 'rank-gold',
            title: `${e.species} (${e.sex})`, sub: `${'★'.repeat(e.trophy_rating_stars || 0)} · Score ${e.total_trophy_score} · $${e.sell_price}`,
            body: toArr(e.measurements).map(m => `${m.name}: ${m.value} (${m.points} pts)`).join(' | '), ctx: 'harvest ranking'
        }));
        html += buildFolder('🏆 How Harvests Are Ranked', `<div class="mission-detail"><div><p>${escapeHtml(hr.explanation || '')}</p></div></div>` + gridOf(ex));
    }
    if (toArr(data.quests).length) {
        html += buildFolder('📜 Quests', gridOf(toArr(data.quests).map((q, i) => buildItemCard({
            id: `quest_${i}`, type: 'mission', badge: q.type || 'Quest', badgeClass: 'rank-gold', title: q.name,
            sub: [q.giver, q.reserve].filter(Boolean).join(' · '), body: [q.summary, ...toArr(q.objectives).map(o => `• ${o}`), q.rewards ? `Rewards: $${q.rewards.money}${q.rewards.xp != null ? ` · ${q.rewards.xp} XP` : ''}` : '', q.verified === false ? '(unverified)' : ''].filter(Boolean).join(' '), ctx: 'quest'
        }))));
    }
    if (data.challenges) {
        let ch = '';
        const trees = Array.isArray(data.challenges.trees) ? data.challenges.trees.map(t => [t.name, t.items || [], t])
            : Object.entries(data.challenges).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v, null]);
        trees.forEach(([cat, list, tree]) => {
            const head = tree ? `${escapeHtml(cat)} <span class="mission-region">${tree.total} challenges${list.length ? `, ${list.length} recorded` : ''}</span>` : escapeHtml(humanize(cat));
            ch += buildFolder(head, (tree && tree.description ? `<div class="mission-detail"><div><p>${escapeHtml(tree.description)}</p></div></div>` : '') + gridOf(list.map((c, i) => buildItemCard({
                id: `challenge_${cat}_${i}`, type: 'mission', badge: humanize(cat), badgeClass: 'rank-bronze', title: c.name,
                sub: toArr(c.tier_xp).filter(x => x).length ? `Tier XP: ${toArr(c.tier_xp).filter(x => x).join(' / ')}` : '', ctx: 'challenge'
            }))));
        });
        if (ch) html += buildFolder('🎯 Challenges', ch);
    }
    const unv = (sec) => sec && sec.verified === false ? ' <span class="mission-region">⚠ unverified notes</span>' : '';
    const textCard = (id, badge, title, sub, body) => buildItemCard({ id, type: 'mission', badge, badgeClass: 'rank-silver', title, sub, body, ctx: badge });
    if (data.lifecycles && toArr(data.lifecycles.species).length) {
        const lc = data.lifecycles;
        html += buildFolder('⏳ Life Cycles' + unv(lc), `<div class="mission-detail"><div><p>${escapeHtml(lc.rule || '')}</p></div></div>` + gridOf(toArr(lc.species).map((e, i) => textCard(
            `life_${i}`, e.conflict ? 'Sources disagree' : `Max ${e.max_age_years} yrs`, e.species,
            e.conflict ? `Reported max age: ${toArr(e.max_age_years_reported).join(' or ')} yrs` : `Young ${e.young_years} · Adult ${e.adult_years} · Mature ${e.mature_years} · ${e.total_lifespan_days} days`,
            toArr(e.advice).join(' ')))));
    }
    if (data.herd_management) {
        const hm = data.herd_management;
        const lv = toArr(hm.stewardship_levels).map((l, i) => textCard(`stew_${i}`, l.avg_fitness_range, l.level, '', l.status_desc));
        const fa = toArr(hm.fitness_advisor).map((f, i) => textCard(`fit_${i}`, f.range, f.label, f.status, f.action));
        const iv = Object.entries(hm.interventions || {}).map(([k, v], i) => textCard(`int_${i}`, 'Intervention', humanize(k), '', v));
        html += buildFolder('🧬 Herd Management' + unv(hm), buildFolder('Fitness Advisor', gridOf(fa)) + buildFolder('Stewardship Levels', gridOf(lv)) + buildFolder('Interventions', gridOf(iv)));
    }
    if (data.need_zone_clusters) {
        const nz = data.need_zone_clusters;
        html += buildFolder('💧 Need Zone Clusters' + unv(nz), gridOf(toArr(nz.clusters).map((c, i) => textCard(`nz_${i}`, c.region, c.species, c.cluster_notes,
            toArr(c.zones).map(z => `${z.type} ${z.schedule}: ${z.landmark}`).join(' | ')))));
    }
    if (data.tracking) {
        const t = data.tracking;
        html += buildFolder('🐾 Tracking & Corridors' + unv(t), `<div class="mission-detail"><div><p>${escapeHtml(t.rule || '')}</p></div></div>` + gridOf(toArr(t.seasonal_corridors).map((c, i) => textCard(
            `trail_${i}`, c.region, c.species, '', `Summer: ${c.summer_trail} Winter: ${c.winter_trail} Grazing: ${c.grazing_area}`))));
    }
    if (data.blood_diagnostics) {
        html += buildFolder('🩸 Blood Diagnostics' + unv(data.blood_diagnostics), gridOf(toArr(data.blood_diagnostics.types).map((b, i) => textCard(`blood_${i}`, b.lethality, b.label, b.organ, ''))));
    }
    if (data.hunting_dog) {
        html += buildFolder('🐕 Hunting Dog', gridOf(toArr(data.hunting_dog.skills).map((k, i) => textCard(`dog_${i}`, k.max ? `Max ${k.max}` : 'Skill', k.name, '', k.description))));
    }
    if (data.gear) {
        const g = data.gear;
        const cards = [...toArr(g.firearms).map((f, i) => textCard(`fa_${i}`, 'Firearm', f.name, f.caliber, `Ammo: ${f.ammo_brand || ''} ${f.recommended_ammo_type || ''}`)),
            ...toArr(g.optics).map((o, i) => textCard(`op_${i}`, 'Optic', o.name, o.magnification, o.description)),
            ...toArr(g.scents).map((sc, i) => buildItemCard({ id: `sc_${i}`, type: 'mission', badge: 'Scent', badgeClass: 'rank-silver', title: sc.name, sub: [sc.required_level ? `Level ${sc.required_level}` : '', sc.price ? `${sc.price} credits` : ''].filter(Boolean).join(' · '), body: toArr(sc.target_animals).join(', '), ctx: 'gear', price: sc.price }))];
        html += buildFolder('🎒 Gear' + unv(g), gridOf(cards));
    }
    if (data.controls) {
        // Reference only: what each button/key does (nothing to tick off).
        const binds = toArr(data.controls.bindings);
        const kb = (b) => b.keyboard_input || b.pc_input || '';
        const hasKb = binds.some(kb);
        const how = (t) => t ? `<span class="ctl-how">${escapeHtml(t)}</span>` : '';
        const rows = binds.map(b => `<tr><td>${escapeHtml(b.action)}</td><td><kbd>${escapeHtml(b.ps5_input || '')}</kbd>${how(b.ps5_trigger_type)}</td><td><kbd>${escapeHtml(b.xbox_input || '')}</kbd>${how(b.xbox_trigger_type)}</td>${hasKb ? `<td>${kb(b) ? `<kbd>${escapeHtml(kb(b))}</kbd>${how(b.keyboard_trigger_type)}` : '—'}</td>` : ''}</tr>`).join('');
        html += buildFolder('🎮 Controls' + unv(data.controls), `<div class="ctl-wrap"><table class="ctl-table"><thead><tr><th>What it does</th><th>PlayStation</th><th>Xbox</th>${hasKb ? '<th>Keyboard / Mouse</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>${data.controls.source ? `<p style="font-size:0.72rem;color:#64748b;margin-top:6px;">Source: ${escapeHtml(data.controls.source)}</p>` : ''}`);
    }
    if (toArr(data.land_management).length) {
        html += buildFolder('🌿 Land Management', gridOf(toArr(data.land_management).map((l, i) => buildItemCard({
            id: `land_${i}`, type: 'mission', badge: [l.type, l.impact, l.verified === false ? '⚠' : ''].filter(Boolean).join(' · '), badgeClass: 'rank-silver', title: `${l.name} — ${l.area}`,
            sub: `${l.reserve} · Cost ${l.cost}`, body: [l.description, toArr(l.affects).length ? `Affects: ${toArr(l.affects).join(', ')}.` : ''].filter(Boolean).join(' '), img: l.image_url, ctx: 'land', price: l.cost
        }))));
    }
    return html;
}

function renderUniversalCompanion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    ensureUniversalStyles();

    if (!isMissionSchema(data) && Array.isArray(data.species)) {
        container.innerHTML = renderHuntingSchema(data);
        const wf = document.getElementById('watchForm'); if (wf) fillWatchDefaults(wf);
        appState.applyStateToUI();
        setupUniversalSearch();
        return;
    }

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
