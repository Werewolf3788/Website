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

// PlayStation data lives in its own project (written by Playstation/psn.js).
let psnRtdb = null, psnReady = Promise.resolve();
try {
    const appP = firebase.apps.find(a => a.name === 'psnstats') || firebase.initializeApp({
        apiKey: "AIzaSyBT3RHrZQCcBdcoPpM9hMjuzSB0KBtu5UI", authDomain: "playstation-stats.firebaseapp.com",
        databaseURL: "https://playstation-stats-default-rtdb.firebaseio.com", projectId: "playstation-stats",
        storageBucket: "playstation-stats.firebasestorage.app", messagingSenderId: "748816703249", appId: "1:748816703249:web:3413fac9800148aa42b6b0"
    }, 'psnstats');
    psnRtdb = firebase.database(appP);
    window.__psnFs = firebase.firestore ? firebase.firestore(appP) : null;
    psnReady = firebase.auth(appP).signInAnonymously().catch(() => {});
} catch (e) { console.warn('[PSN project]', e); }
// Read a player's trophy progress for one game; tries the exact name, then any case.
async function readPsnProgress(tag, commId) {
    if (!tag || !commId) return null;
    const dbs = [psnRtdb, rtdb].filter(Boolean);
    await psnReady;
    for (const db of dbs) {
        try {
            const v = (await db.ref(`/psn/gamertags/${tag}/liveTrophyProgress/${commId}`).once('value')).val();
            if (v) return v;
        } catch (e) { console.warn('[PSN read]', e && e.message); }
    }
    return null;
}

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
    inventory: [],
    loadouts: [],
    activeLoadout: null,
    carrySlots: 6,
    weaponSetups: [],
    carry: { primary: null, secondary: null, pack: [] },
    campaignRank: null,
    campaignRankSource: null,
    activeMission: null,
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
        this.inventory = [];
        this.loadouts = [];
        this.activeLoadout = null;
        this.carrySlots = 6;
        this.weaponSetups = [];
        this.carry = { primary: null, secondary: null, pack: [] };
        this.campaignRank = null;
        this.campaignRankSource = null;
        this.activeMission = null;
        this.ranks = {};

        document.querySelectorAll('.game-pill').forEach(pill => {
            const key = pill.getAttribute('data-game-key');
            if (key === CURRENT_GAME_KEY || (key === 'se5' && CURRENT_GAME_KEY === 'sniperelite5')) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        this.friendsProgress = [];
        await loadAndHydrateGame(CURRENT_GAME_KEY);
        if (this.currentUser) this.syncFriendsProgress();
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
        applyGameBackground(data);
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
            if (Number(it.goal) > 1 || it.psn_trophy) this.medals[it.id].progress = 0;
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
            inventory: this.inventory,
            loadouts: this.loadouts,
            activeLoadout: this.activeLoadout,
            carrySlots: this.carrySlots,
            weaponSetups: this.weaponSetups,
            carry: this.carry,
            campaignRank: this.campaignRank,
            campaignRankSource: this.campaignRankSource,
            activeMission: this.activeMission || null,
            trophies: this.trophies
        };
    },

    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        if (payload.wallet && typeof payload.wallet === 'object') this.wallet = Object.assign({ credits: 0, level: 1, xp: 0, xpNext: null, gameDay: 1, gameTime: '06:00' }, payload.wallet);
        if (Array.isArray(payload.harvestLog)) this.harvestLog = payload.harvestLog;
        if (Array.isArray(payload.wishlist)) this.wishlist = payload.wishlist;
        if (Array.isArray(payload.watchlist)) this.watchlist = payload.watchlist;
        if (Array.isArray(payload.inventory)) this.inventory = payload.inventory;
        if (Array.isArray(payload.loadouts)) this.loadouts = payload.loadouts;
        if (payload.activeLoadout !== undefined) this.activeLoadout = payload.activeLoadout;
        if (payload.carrySlots) this.carrySlots = payload.carrySlots;
        if (Array.isArray(payload.weaponSetups)) this.weaponSetups = payload.weaponSetups;
        if (payload.carry && typeof payload.carry === 'object') this.carry = Object.assign({ primary: null, secondary: null, pack: [] }, payload.carry);
        migrateLoadouts(this);
        if (payload.activeMission !== undefined) this.activeMission = payload.activeMission;
        if (payload.campaignRank !== undefined && payload.campaignRank !== null && !(this.campaignRankSource === 'psn' && payload.campaignRankSource !== 'psn')) {
            this.campaignRank = payload.campaignRank; this.campaignRankSource = payload.campaignRankSource || 'manual';
        }
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
                if (this.medals[medId]) {
                    this.medals[medId].earned = !!payload.medals[medId].earned;
                    if (payload.medals[medId].progress !== undefined) this.medals[medId].progress = Number(payload.medals[medId].progress) || 0;
                    if (payload.medals[medId].progressSource) this.medals[medId].progressSource = payload.medals[medId].progressSource;
                }
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
    if (typeof renderRankUI === 'function') renderRankUI();
    if (typeof renderMedalProgress === 'function') setTimeout(renderMedalProgress, 0);
    if (typeof renderActiveMission === 'function') renderActiveMission();
    // PS5 trophy progress (22/150, 25%) on every game's trophy cards
    document.querySelectorAll('.trophy-psn[data-trophy]').forEach(el => {
        const t = this.trophies[el.dataset.trophy];
        if (!t || t.earned || !(t.progressTarget || t.progressRate != null)) { el.hidden = true; return; }
        const max = t.progressTarget || 100, v = t.progressTarget ? (t.progressValue || 0) : Math.round(t.progressRate || 0);
        el.innerHTML = `🎮 PSN progress: ${t.progressTarget ? `${fmtNum(v)}/${fmtNum(max)}` : `${v}%`}` + meterHtml(max - v, max, '').replace(/^<span class="wm-num[^>]*>.*?<\/span>/, '');
        el.hidden = false;
    });
    Object.entries((this.gameData && this.gameData.missions) || {}).forEach(([mk, mm]) => {
        if (!mm || mm.completion_trophy === undefined) return;
        const t = this.trophies[`trophy_${this.gameId}_${mm.completion_trophy}`];
        if (t && t.earned) { this.missions[mk] = this.missions[mk] || {}; if (!this.missions[mk].completed) { this.missions[mk].completed = true; this.missions[mk].auto = true; } }
        else if (this.missions[mk]?.auto) { this.missions[mk].completed = false; delete this.missions[mk].auto; }
    });
    Object.values((this.gameData && this.gameData.missions) || {}).forEach(mm => {
        const g = mm && mm.gnomes; if (!g || !g.medal_id) return;
        const all = toArr(g.items).length && toArr(g.items).every(it => this.missions[it.id]?.completed);
        if (!this.medals[g.medal_id]) this.medals[g.medal_id] = { earned: false };
        if (all) { this.medals[g.medal_id].earned = true; this.medals[g.medal_id].auto = true; }
        else if (this.medals[g.medal_id].auto) { this.medals[g.medal_id].earned = false; delete this.medals[g.medal_id].auto; }
    });

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
    applyFriendMarks();
    updateGameMetrics();
};

// Game poster art as the page wallpaper (cards stay 75% opaque on top).
function applyGameBackground(data) {
    let layer = document.getElementById('gameBgLayer');
    if (!layer) {
        layer = document.createElement('div'); layer.id = 'gameBgLayer'; layer.setAttribute('aria-hidden', 'true');
        document.body.prepend(layer);
    }
    const art = data && data.art || {};
    const wide = window.matchMedia('(min-width: 900px)').matches;
    const candidates = [wide ? art.wallpaper : art.poster, wide ? art.poster : art.wallpaper, data && data.image_url].filter(Boolean).map(toSecureUrl);
    const token = String(Date.now()); layer.dataset.token = token;
    const tryNext = (i) => {
        if (i >= candidates.length) { layer.style.backgroundImage = ''; document.body.classList.remove('has-game-bg'); return; }
        const img = new Image();
        img.onload = () => { if (layer.dataset.token !== token) return; layer.style.backgroundImage = `url("${candidates[i]}")`; document.body.classList.add('has-game-bg'); };
        img.onerror = () => tryNext(i + 1);
        img.src = candidates[i];
    };
    tryNext(0);
}

// The three summary boxes under the game pills: built from whatever the
// selected game actually tracks (Far Cry keeps its original boxes).
function updateGameMetrics() {
    const grid = document.querySelector('.metrics-grid');
    if (!grid) return;
    if (grid.dataset.original === undefined) grid.dataset.original = grid.innerHTML;
    const st = window.appState, data = st.gameData || {};
    const box = (label, value, sub) => `<div class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><span class="metric-value">${value}</span>${sub ? `<span class="metric-sub">${sub}</span>` : ''}</div>`;
    const boxes = [];

    if (!isMissionSchema(data) && Array.isArray(data.species)) {
        const w = st.wallet || {};
        const species = new Set(toArr(st.harvestLog).map(h => h.species));
        const totalSpecies = toArr(data.species).length;
        const trophies = toArr(st.harvestLog).filter(h => h.taxidermy).length;
        boxes.push(box('Total Kills', fmtNum(toArr(st.harvestLog).length), `🏆 ${trophies} in Trophy Room`));
        boxes.push(box('Species Harvested', `${species.size}/${totalSpecies}`, `${toArr(st.watchlist).length} on watchlist`));
        boxes.push(box(`Level ${w.level || 1}`, `${fmtNum(w.credits)} cr`, (w.xpNext || xpNeededFor(w.level)) ? `${fmtNum(w.xp)}/${fmtNum(w.xpNext || xpNeededFor(w.level))} XP` : `${fmtNum(w.xp)} XP`));
    } else {
        const cards = [...document.querySelectorAll('#section-container .game-item-card')].filter(c => !/^(wpn_|gnome_|poi_)/.test(String(c.getAttribute('data-id'))));
        if (!cards.length) { if (grid.innerHTML !== grid.dataset.original) grid.innerHTML = grid.dataset.original; return; }
        const of = (type) => cards.filter(c => c.getAttribute('data-type') === type);
        const doneOf = (list) => list.filter(c => c.classList.contains('completed')).length;
        const missions = of('mission');
        const crk = data.campaign_rank;
        if (crk) boxes.push(`<div class="metric-card" role="button" tabindex="0" style="cursor:pointer" onclick="openRankPanel()" title="Open Campaign Rank & Arsenal"><span class="metric-label">Campaign Rank</span><span class="metric-value">${st.campaignRank || '—'}/${crk.max}</span><span class="metric-sub">${st.campaignRankSource === 'psn' ? 'Synced from PSN' : (st.campaignRank ? 'Tap to update' : 'Tap to set your rank')}</span></div>`);
        if (missions.length) {
            const mkeys = new Set(Object.keys(data.missions || {}));
            const story = missions.filter(c => mkeys.has(c.getAttribute('data-id')));
            const kills = missions.filter(c => /^kill_/.test(c.getAttribute('data-id')));
            const props = missions.filter(c => /^prop_/.test(c.getAttribute('data-id')));
            if (story.length) boxes.push(box('Missions', `${doneOf(story)}/${story.length}`, [kills.length ? `Kill challenges ${doneOf(kills)}/${kills.length}` : '', props.length ? `Propaganda ${doneOf(props)}/${props.length}` : ''].filter(Boolean).join(' · ')));
            else boxes.push(box('Missions', `${doneOf(missions)}/${missions.length}`));
        }
        const coll = of('collectible');
        if (coll.length) {
            const groups = {};
            coll.forEach(c => { const g = (c.getAttribute('data-group') || 'other').split('__').pop(); (groups[g] = groups[g] || []).push(c); });
            const sub = Object.entries(groups).map(([g, list]) => `${escapeHtml((COLLECTIBLE_LABELS[g] || humanize(g)).split(' ')[0])} ${doneOf(list)}/${list.length}`).join(' · ');
            boxes.push(box('Collectibles', `${doneOf(coll)}/${coll.length}`, sub));
        }
        const ribbons = of('ribbon');
        if (ribbons.length) {
            const earned = ribbons.reduce((n, c) => n + (st.ribbons[c.getAttribute('data-id')]?.count || 0), 0);
            boxes.push(box('Ribbons Earned', fmtNum(earned), `${doneOf(ribbons)}/${ribbons.length} types`));
        }
        const trophies = of('trophy');
        if (trophies.length && boxes.length < 4) boxes.push(box('Trophies', `${doneOf(trophies)}/${trophies.length}`));
        const medals = of('medal');
        if (medals.length && boxes.length < 4) boxes.push(box('Medals', `${doneOf(medals)}/${medals.length}`));
        if (!boxes.length) { if (grid.innerHTML !== grid.dataset.original) grid.innerHTML = grid.dataset.original; return; }
    }
    const html = boxes.slice(0, 4).join('');
    if (grid.innerHTML !== html) grid.innerHTML = html;
}

// The mission picked here shows on the stream overlay's tracker panel.
window.appState.setActiveMission = function(key) {
    this.activeMission = this.activeMission === key ? null : key;
    this.applyStateToUI(); this.saveProgress();
    this.updateStatus(this.activeMission ? `Stream overlay now shows ${key.replace(/_/g, ' ')}.` : 'Stream overlay mission cleared.');
};
function renderActiveMission() {
    document.querySelectorAll('.active-mission-btn').forEach(b => {
        const on = b.dataset.mission === appState.activeMission;
        b.classList.toggle('on', on); b.textContent = on ? '📺 On stream now (tap to clear)' : '📺 Show on stream overlay';
    });
}

// Medal progress (counts like 234/350); PSN trophy progress fills it automatically.
function medalDef(id) {
    let found = null;
    const walk = (o) => { if (found || !o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (o.id === id && /^med_/.test(id)) { found = o; return; } Object.values(o).forEach(walk); };
    const d = appState.gameData || {}; walk(d.medals); walk(d.missions);
    return found;
}
function medalTiers(def) {
    if (!def) return [];
    const t = def.tier_goals ? Object.entries(def.tier_goals).filter(([, v]) => Number(v)).map(([k, v]) => ({ tier: k, goal: Number(v) })) : [];
    if (t.length) return t.sort((a, b) => a.goal - b.goal);
    return Number(def.goal) > 0 ? [{ tier: '', goal: Number(def.goal) }] : [];
}
function updateMedalFromProgress(id) {
    const m = appState.medals[id]; const def = medalDef(id); if (!m || !def) return;
    const tiers = medalTiers(def); if (!tiers.length) return;
    m.earned = (m.progress || 0) >= tiers[0].goal;
}
window.appState.setMedalProgress = function(id, value, source) {
    if (!this.medals[id]) this.medals[id] = { earned: false };
    this.medals[id].progress = Math.max(0, Math.floor(Number(value) || 0));
    this.medals[id].progressSource = source || 'manual';
    updateMedalFromProgress(id);
    this.applyStateToUI();
    clearTimeout(this._medalSaveTimer); this._medalSaveTimer = setTimeout(() => this.saveProgress(), 600);
};
window.appState.stepMedal = function(id, d) { this.setMedalProgress(id, (this.medals[id]?.progress || 0) + d); };
window.appState.stepRibbon = function(id, d) { this.setRibbonCount(id, (this.ribbons[id]?.count || 0) + d); };
function renderMedalProgress() {
    document.querySelectorAll('.medal-meter[data-medal]').forEach(el => {
        const id = el.dataset.medal, m = appState.medals[id] || {}, def = medalDef(id);
        const tiers = medalTiers(def); if (!tiers.length) return;
        const p = m.progress || 0;
        const next = tiers.find(t => p < t.goal) || tiers[tiers.length - 1];
        const done = tiers.filter(t => p >= t.goal).map(t => t.tier).filter(Boolean);
        el.innerHTML = `${fmtNum(p)}/${fmtNum(next.goal)}${next.tier ? ` (${next.tier})` : ''}${done.length ? ` · earned ${done.join(', ')}` : ''}${m.progressSource === 'psn' ? ' · from PSN' : ''}` + meterHtml(next.goal - p, next.goal, '').replace(/^<span class="wm-num[^>]*>.*?<\/span>/, '');
        const inp = el.closest('.game-item-card')?.querySelector('.medal-count');
        if (inp && document.activeElement !== inp) inp.value = p;
    });
}
// Link medals to PSN trophies by name (or "psn_trophy" in the JSON) and copy the trophy's counter.
function applyPsnToMedals(entries) {
    const data = appState.gameData || {};
    const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const trophyByName = {};
    [...toArr(data.general_trophies), ...toArr(data.trophies)].forEach(t => { trophyByName[norm(t.name)] = t; });
    const medals = [];
    const walk = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (typeof o.id === 'string' && /^med_/.test(o.id)) { medals.push(o); return; } Object.values(o).forEach(walk); };
    walk(data.medals); walk(data.missions);
    let changed = false;
    medals.forEach(md => {
        const t = psnTrophyForMedal(md);
        if (!t) return;
        const e = entries[String(t.trophyId)]; if (!e) return;
        const target = Number(e.targetValue || e.trophyProgressTargetValue) || Number((String(t.description).replace(/,/g, '').match(/\d+/) || [])[0]) || 0;
        let v = Number(e.currentValue ?? e.trophyProgress ?? e.progress);
        if (!v && e.progressRate && target) v = Math.round(parseFloat(e.progressRate) / 100 * target);
        if (e.earned === true || e.isEarned === true) {
            const top = Math.max(0, ...medalTiers(md).map(x => x.goal));
            v = Math.max(v || 0, target || 0, top || 1);
        }
        if (!v) return;
        const cur = appState.medals[md.id] || (appState.medals[md.id] = { earned: false });
        if ((cur.progress || 0) < v || cur.progressSource !== 'psn') { cur.progress = Math.max(cur.progressSource === 'manual' ? (cur.progress || 0) : 0, v); cur.progressSource = 'psn'; updateMedalFromProgress(md.id); changed = true; }
    });
    return changed;
}

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

// Mark (or clear) every collectible in one mission, with a one-step undo.
let markAllUndo = null;
window.appState.markAllCollectibles = function(missionKey, value) {
    const groups = Object.keys(this.collectibles).filter(g => g.startsWith(missionKey + '__'));
    const before = {};
    groups.forEach(g => Object.entries(this.collectibles[g].items || {}).forEach(([id, it]) => { before[g + '|' + id] = !!it.collected; it.collected = value; }));
    if (!groups.length) return;
    markAllUndo = { missionKey, before };
    document.querySelectorAll('.mark-all-bar .mark-undo').forEach(b => { b.hidden = b.closest('.mark-all-bar').dataset.mission !== missionKey; });
    this.applyStateToUI(); this.saveProgress();
    this.updateStatus(`${value ? 'Marked' : 'Cleared'} all collectibles in ${missionKey.replace(/_/g, ' ')}.`);
};
window.appState.undoMarkAll = function() {
    if (!markAllUndo) return;
    Object.entries(markAllUndo.before).forEach(([k, v]) => { const [g, id] = k.split('|'); const it = this.collectibles[g]?.items?.[id]; if (it) it.collected = v; });
    markAllUndo = null;
    document.querySelectorAll('.mark-all-bar .mark-undo').forEach(b => { b.hidden = true; });
    this.applyStateToUI(); this.saveProgress();
    this.updateStatus('Undone.');
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
// Squad progress: load every friend's save for this game (and their PSN
// trophies), then mark on each card which friends have it done.
const normPlatform = (p) => { const v = String(p || '').toLowerCase(); if (v.startsWith('play') || v === 'psn' || v === 'ps5' || v === 'ps4') return 'ps'; return ['ps', 'xbox', 'steam', 'pc'].includes(v) ? v : ''; };
window.appState.friendsProgress = [];
let friendSyncToken = 0;
async function readFriendSave(keys, platforms, gameName) {
    if (!firestore) return null;
    for (const key of keys) {
        for (const plat of platforms) {
            try {
                const doc = await firestore.collection('user').doc(key).collection('platform').doc(plat).collection('game').doc(gameName).get();
                if (doc.exists) return { data: doc.data(), key, platform: plat };
            } catch (err) { console.warn('[Squad] could not read', key, plat, err && err.message); }
        }
    }
    return null;
}
function friendDoneSet(save, psnEarned) {
    const done = new Set(), ribbons = {};
    const d = save || {};
    Object.values(d.collectibles || {}).forEach(g => Object.entries((g && g.items) || {}).forEach(([id, it]) => { if (it && it.collected) done.add(id); }));
    Object.entries(d.missions || {}).forEach(([id, m]) => { if (m && m.completed) done.add(id); });
    Object.entries(d.trophies || {}).forEach(([id, t]) => { if (t && t.earned) done.add(id); });
    Object.entries(d.medals || {}).forEach(([id, m]) => { if (m && m.earned) done.add(id); });
    Object.entries(d.ribbons || {}).forEach(([id, r]) => { const n = Number(r && r.count) || (r && r.earned ? 1 : 0); if (n) { ribbons[id] = n; done.add(id); } });
    (psnEarned || []).forEach(id => done.add(id));
    return { done, ribbons };
}
window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    const token = ++friendSyncToken;
    if (!this.currentUser || !this.currentUser.email || !rtdb) {
        this.friendsProgress = []; this.applyStateToUI();
        if (rosterContainer) rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to see your squad\'s progress.</div>';
        return;
    }
    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    const gameName = this.getCanonicalGameName();
    try {
        const friendsData = (await rtdb.ref(`/users/${emailKey}/friends`).once('value')).val();
        if (!friendsData || !Object.keys(friendsData).length) {
            this.friendsProgress = []; this.applyStateToUI();
            if (rosterContainer) rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked. Add friend codes to share progress.</div>';
            return;
        }
        if (rosterContainer) rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Loading squad progress…</div>';
        const results = await Promise.all(Object.entries(friendsData).map(async ([fKey, fObj]) => {
            fObj = fObj || {};
            const code = fObj.friend_code || fKey;
            let userKey = null, profile = {};
            try { const k = (await rtdb.ref(`/friend_codes/${code}`).once('value')).val(); if (typeof k === 'string') userKey = k; } catch (e) {}
            if (userKey) { try { profile = (await rtdb.ref(`/users/${userKey}`).once('value')).val() || {}; } catch (e) {} }
            const name = fObj.username || profile.username || profile.display_name || code;
            // Respect the friend's "Game & trophy tracking" setting (default: friends can see it).
            const scope = profile.tracking_scope || 'friends';
            let allowed = scope !== 'private';
            if (scope === 'close') {
                allowed = false;
                const myCode = this.myFriendCode;
                if (userKey && myCode) { try { allowed = (await rtdb.ref(`/users/${userKey}/friends/${myCode}/close_friend`).once('value')).val() === true; } catch (e) {} }
            }
            if (!allowed) return { code, userKey, name, avatar: fObj.avatar_url || profile.avatar_url || '', hidden: scope, done: new Set(), ribbons: {}, hasSave: false, psnCount: 0 };
            const avatar = fObj.avatar_url || profile.avatar_url || '';
            const plats = [...new Set([normPlatform(profile.primary_platform), normPlatform(fObj.primary_platform), this.platform, 'ps', 'xbox', 'steam', 'pc'].filter(Boolean))];
            const save = await readFriendSave([...new Set([code, userKey].filter(Boolean))], plats, gameName);
            const psnTag = profile.psn_username || fObj.psn_username || '';
            const psnEarned = [];
            let psnRank = null;
            if (psnTag && ACTIVE_COMM_ID) {
                try {
                    const live = await readPsnProgress(psnTag, ACTIVE_COMM_ID);
                    const entries = Array.isArray(live) ? [...live.entries()] : Object.entries(live || {});
                    const crf = this.gameData && this.gameData.campaign_rank;
                    entries.forEach(([tId, t]) => {
                        if (!t) return;
                        const id = t.trophyId !== undefined ? t.trophyId : tId;
                        if (t.earned === true || t.isEarned === true) psnEarned.push(`trophy_${this.gameId}_${id}`);
                        if (crf && String(id) === String(crf.trophyId)) psnRank = (t.earned === true || t.isEarned === true) ? crf.max : Number(t.currentValue ?? t.trophyProgress ?? 0) || null;
                    });
                } catch (e) {}
            }
            const { done, ribbons } = friendDoneSet(save && save.data, psnEarned);
            const rank = psnRank || (save && save.data && save.data.campaignRank) || null;
            return { code, userKey, name, avatar, plats, platform: save ? save.platform : (plats[0] || ''), hasSave: !!save, psnTag, psnCount: psnEarned.length, done, ribbons, rank, save: save && save.data };
        }));
        if (token !== friendSyncToken) return;
        this.friendsProgress = results;
        this.applyStateToUI();
        renderSquadRoster();
    } catch (e) {
        console.warn('[Friends Roster Error]:', e);
        if (rosterContainer) rosterContainer.innerHTML = `<div style="font-size:0.8rem; color:#f87171;">Couldn't load squad progress: ${escapeHtml(e.message || String(e))}</div>`;
    }
};
function friendInitials(n) { return String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function friendBadge(f, extra) {
    const first = String(f.name || '').trim().split(/\s+/)[0];
    return `<span class="fm-chip" title="${escapeHtml(f.name)}${extra ? ' — ' + escapeHtml(extra) : ' has this'}">${f.avatar ? `<img src="${toSecureUrl(f.avatar)}" alt="" onerror="this.remove()">` : `<b>${escapeHtml(friendInitials(f.name))}</b>`}✓ ${escapeHtml(first)}${extra ? ` <i>${escapeHtml(extra)}</i>` : ''}</span>`;
}
function renderSquadRoster() {
    const el = document.getElementById('friendsRosterContainer'); if (!el) return;
    const list = toArr(appState.friendsProgress);
    const cards = [...document.querySelectorAll('#section-container .game-item-card')].filter(c => !String(c.getAttribute('data-id')).startsWith('wpn_'));
    const total = cards.filter(c => c.getAttribute('data-type') !== 'ribbon').length;
    const data = appState.gameData || {};
    const hunting = !isMissionSchema(data) && Array.isArray(data.species);
    el.innerHTML = list.map(f => {
        const doneHere = cards.filter(c => c.getAttribute('data-type') !== 'ribbon' && f.done.has(c.getAttribute('data-id'))).length;
        const trophies = cards.filter(c => c.getAttribute('data-type') === 'trophy');
        const tDone = trophies.filter(c => f.done.has(c.getAttribute('data-id'))).length;
        const ribbonTotal = Object.values(f.ribbons).reduce((a, b) => a + b, 0);
        const sv = f.save || {};
        const stats = hunting
            ? `<span>Level <strong>${escapeHtml(String(sv.wallet?.level || '?'))}</strong></span><span>Kills <strong>${toArr(sv.harvestLog).length}</strong></span><span>🏆 <strong>${toArr(sv.harvestLog).filter(h => h.taxidermy).length}</strong></span>`
            : `${f.rank ? `<span>Rank <strong>${f.rank}</strong></span>` : ''}<span>Checklist <strong>${doneHere}/${total}</strong></span>${trophies.length ? `<span>Trophies <strong>${tDone}/${trophies.length}</strong></span>` : ''}${ribbonTotal ? `<span>Ribbons <strong>${fmtNum(ribbonTotal)}</strong></span>` : ''}`;
        if (f.hidden) return `<div class="squad-card">${f.avatar ? `<img src="${toSecureUrl(f.avatar)}" class="squad-av" onerror="this.style.display='none'">` : `<div class="squad-av squad-ini">${escapeHtml(friendInitials(f.name))}</div>`}
            <div style="flex:1;"><div style="font-weight:900;color:#fff;font-size:0.95rem;">${escapeHtml(f.name)}</div><div style="font-size:0.72rem;color:#94a3b8;">🔒 ${f.hidden === 'close' ? 'Shares tracking with close friends only' : 'Keeps game tracking private'}</div></div></div>`;
        const note = !f.hasSave && !f.psnCount ? 'No save for this game yet' : [f.hasSave ? `Save on ${f.platform.toUpperCase()}` : 'No site save', f.psnTag ? (f.psnCount ? `PSN ${f.psnTag}: ${f.psnCount} trophies` : `PSN ${f.psnTag}`) : ''].filter(Boolean).join(' · ');
        return `<div class="squad-card">
            ${f.avatar ? `<img src="${toSecureUrl(f.avatar)}" class="squad-av" onerror="this.style.display='none'">` : `<div class="squad-av squad-ini">${escapeHtml(friendInitials(f.name))}</div>`}
            <div style="flex:1;min-width:0;"><div style="font-weight:900;color:#fff;font-size:0.95rem;">${escapeHtml(f.name)}</div>
            <div class="squad-stats">${stats}</div><div style="font-size:0.68rem;color:#64748b;">${escapeHtml(note)}</div>
            <button type="button" class="pack-btn" style="margin-top:6px;" onclick="appState.showFriendAllGames('${escapeHtml(f.code)}', this)">📚 All games</button>
            <div class="squad-all" data-for="${escapeHtml(f.code)}"></div></div></div>`;
    }).join('') || '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked.</div>';
}
function canonicalFor(key, g) {
    const k = String(key).toLowerCase();
    if (k === 'farcry5') return 'FarCry5';
    if (k === 'farcry6') return 'FarCry6';
    if (k === 'sniperelite5' || k === 'se5') return 'SniperElite5';
    if (k === 'snresistance') return 'SniperEliteResistance';
    return (g && g.gameId) || key;
}
window.appState.showFriendAllGames = async function(code, btn) {
    const f = toArr(this.friendsProgress).find(x => x.code === code); if (!f) return;
    const box = document.querySelector(`.squad-all[data-for="${CSS.escape(code)}"]`); if (!box) return;
    if (box.innerHTML) { box.innerHTML = ''; return; }
    box.innerHTML = '<div style="font-size:0.72rem;color:#94a3b8;">Loading every game…</div>';
    const cat = window.__gamesCatalog || {};
    const rows = await Promise.all(Object.entries(cat).map(async ([gKey, g]) => {
        const save = await readFriendSave([...new Set([f.code, f.userKey].filter(Boolean))], f.plats || [this.platform], canonicalFor(gKey, g));
        const d = save && save.data;
        const title = (g && (g.game || g.title)) || gKey;
        if (!d) return `<div class="sa-row"><span>${escapeHtml(title)}</span><span style="color:#64748b;">No save</span></div>`;
        let col = 0; Object.values(d.collectibles || {}).forEach(gr => Object.values((gr && gr.items) || {}).forEach(it => { if (it && it.collected) col++; }));
        const missions = Object.values(d.missions || {}).filter(m => m && m.completed).length;
        const ribbons = Object.values(d.ribbons || {}).reduce((a, r) => a + (Number(r && r.count) || 0), 0);
        const parts = Array.isArray(d.harvestLog)
            ? [`Level ${(d.wallet && d.wallet.level) || '?'}`, `${d.harvestLog.length} kills`, `${d.harvestLog.filter(h => h.taxidermy).length} mounts`]
            : [missions ? `${missions} missions` : '', col ? `${col} collectibles` : '', d.trophies_total ? `Trophies ${d.trophies_percent || 0}%` : '', ribbons ? `${fmtNum(ribbons)} ribbons` : ''].filter(Boolean);
        return `<div class="sa-row"><a href="?game=${escapeHtml(gKey)}" onclick="event.preventDefault(); appState.switchGame('${escapeHtml(gKey)}')">${escapeHtml(title)}</a><span>${escapeHtml(parts.join(' · ') || 'Started')} <small>(${escapeHtml(save.platform.toUpperCase())})</small></span></div>`;
    }));
    box.innerHTML = rows.join('') || '<div style="font-size:0.72rem;color:#94a3b8;">No games found.</div>';
};
function applyFriendMarks() {
    const list = toArr(appState.friendsProgress);
    document.querySelectorAll('#section-container .game-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const isRibbon = card.getAttribute('data-type') === 'ribbon';
        const html = list.filter(f => f.done.has(id)).map(f => friendBadge(f, isRibbon ? `×${f.ribbons[id] || 0}` : '')).join('');
        let row = card.querySelector(':scope > .friend-marks');
        if (!html) { if (row) row.remove(); return; }
        if (!row) { row = document.createElement('div'); row.className = 'friend-marks'; card.appendChild(row); }
        if (row.innerHTML !== html) row.innerHTML = html;
    });
}

// Section 8: Dynamic Poster Art Lookup via /psn/games
async function searchGamePosterArt(commId, gameName) {
    if (!rtdb) return;

    try {
        await psnReady;
        let snap = psnRtdb ? await psnRtdb.ref('/psn/games').once('value').catch(() => null) : null;
        if (!snap || !snap.val()) snap = await rtdb.ref('/psn/games').once('value');
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
// Full PSN trophy list for a game (every trophy's icon, name, rank, rarity) from the
// playstation-stats skeleton: meta/gameIndex -> games/{key}.trophies. Works for any game.
const psnSkeletonCache = {};
async function loadPsnTrophySkeleton(commId) {
    if (!commId || !window.__psnFs) return null;
    const id = String(commId).toUpperCase();
    if (psnSkeletonCache[id] !== undefined) return psnSkeletonCache[id];
    psnSkeletonCache[id] = null;
    try {
        await psnReady;
        const idx = await window.__psnFs.collection('meta').doc('gameIndex').get();
        const entry = idx.exists && (idx.data().entries || {})[id];
        if (!entry || !entry.key) return null;
        const doc = await window.__psnFs.collection('games').doc(entry.key).get();
        psnSkeletonCache[id] = doc.exists ? doc.data() : null;
    } catch (e) { console.warn('[PSN skeleton]', e && e.message); }
    return psnSkeletonCache[id];
}
async function applyPsnTrophyIcons() {
    const sk = await loadPsnTrophySkeleton(ACTIVE_COMM_ID);
    const list = sk && (Array.isArray(sk.trophies) ? sk.trophies : Object.values(sk.trophies || {}));
    if (!list || !list.length) return;
    let changed = false;
    list.forEach(t => {
        if (!t || t.trophyId === undefined) return;
        const card = appState.trophies[`trophy_${appState.gameId}_${t.trophyId}`];
        if (!card) return;
        if (t.icon && card.icon !== toSecureUrl(t.icon)) { card.icon = toSecureUrl(t.icon); changed = true; }
        if (t.name && !card.name) { card.name = t.name; changed = true; }
        if (t.rarity && card.rarity !== t.rarity) { card.rarity = t.rarity; changed = true; }
    });
    if (changed) {
        document.querySelectorAll('[data-type="trophy"]').forEach(el => {
            const c = appState.trophies[el.dataset.id]; if (!c || !c.icon) return;
            let img = el.querySelector('img');
            if (!img) { const wrap = el.querySelector(':scope > div > div'); if (!wrap) return; img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.style.cssText = 'width:40px; height:40px; object-fit:cover; border-radius:6px; flex:0 0 auto;'; wrap.prepend(img); }
            if (img.src !== c.icon) img.src = c.icon;
        });
    }
}

async function autoCheckUserPsnTrophies() {
    if (!rtdb || !appState.psnGamertag || !ACTIVE_COMM_ID) return;
    const commId = ACTIVE_COMM_ID;
    const gamertag = appState.psnGamertag;

    try {
        const liveTrophies = await readPsnProgress(gamertag, commId);
        appState.psnStatus = liveTrophies ? 'ok' : 'none';

        if (liveTrophies && (Array.isArray(liveTrophies) || typeof liveTrophies === 'object')) {
            let stateModified = false;
            const trophyEntries = Array.isArray(liveTrophies) ? liveTrophies.entries() : Object.entries(liveTrophies);

            for (const [tId, tObj] of trophyEntries) {
                if (!tObj) continue;
                const parsedId = tObj.trophyId !== undefined ? tObj.trophyId : tId;
                const cardKey = `trophy_${appState.gameId}_${parsedId}`;
                const isEarnedInPsn = (tObj.earned === true || tObj.isEarned === true);
                const cr = appState.gameData && appState.gameData.campaign_rank;
                if (cr && String(parsedId) === String(cr.trophyId)) {
                    const v = isEarnedInPsn ? cr.max : Number(tObj.currentValue ?? tObj.trophyProgress ?? tObj.progress);
                    if (v && v !== appState.campaignRank) { appState.campaignRank = Math.min(cr.max, v); appState.campaignRankSource = 'psn'; stateModified = true; }
                }

                if (appState.trophies[cardKey]) {
                    const card = appState.trophies[cardKey];
                    // PS5 trophy progress (22/150 or 25%) for any game that has it
                    const pv = Number(tObj.currentValue ?? tObj.trophyProgress ?? 0) || 0;
                    const pt = Number(tObj.targetValue ?? tObj.trophyProgressTargetValue ?? 0) || 0;
                    const pr = tObj.progressRate != null ? parseFloat(tObj.progressRate) : null;
                    if ((pt && card.progressTarget !== pt) || card.progressValue !== pv || card.progressRate !== pr) {
                        card.progressValue = pv; card.progressTarget = pt; card.progressRate = (pr === null || isNaN(pr)) ? null : pr; stateModified = true;
                    }
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

            const byId = {};
            for (const [tId, tObj] of (Array.isArray(liveTrophies) ? liveTrophies.entries() : Object.entries(liveTrophies))) { if (tObj) byId[String(tObj.trophyId !== undefined ? tObj.trophyId : tId)] = tObj; }
            if (applyPsnToMedals(byId)) stateModified = true;
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
        .hunt-input { flex: 1 1 140px; padding: 8px 10px; min-width: 0; max-width: 100%; box-sizing: border-box; }
        select.hunt-input { text-overflow: ellipsis; }
        .ctl-wrap { overflow-x: auto; }
        .wpn-status { font-size: 0.72rem; color: #f59e0b; margin-top: 2px; }
        .wpn-status.ok { color: #10b981; }
        .col-group-title { color: #fff; font-size: 0.9rem; margin: 14px 0 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .step-btn { width: 26px; height: 26px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: 900; cursor: pointer; line-height: 1; }
        .step-btn:active { transform: scale(0.94); }
        .medal-count { width: 74px; text-align: center; background: #0f172a; color: #fff; border: 1px solid #334155; border-radius: 6px; padding: 3px 4px; }
        .active-mission-bar { margin-bottom: 10px; }
        .active-mission-btn.on { background: #7c3aed; border-color: #a78bfa; color: #fff; }
        .mark-all-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .loc-photo { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-top: 4px; display: block; }
        .friend-marks { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); width: 100%; }
        .fm-chip { display: inline-flex; align-items: center; gap: 3px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.5); border-radius: 999px; padding: 1px 6px 1px 1px; font-size: 0.65rem; color: #a7f3d0; }
        .fm-chip img, .fm-chip b { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; display: inline-flex; align-items: center; justify-content: center; background: #065f46; color: #fff; font-size: 0.55rem; }
        .fm-chip i { font-style: normal; font-weight: 700; }
        .squad-all { margin-top: 6px; }
        .sa-row { display: flex; justify-content: space-between; gap: 8px; font-size: 0.72rem; color: #cbd5e1; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .sa-row a { color: #fff; font-weight: 700; text-decoration: none; }
        .sa-row small { color: #64748b; }
        .squad-card { background: var(--bg-card, #1e293b); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; display: flex; align-items: center; gap: 12px; }
        .squad-av { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .squad-ini { background: #334155; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
        .squad-stats { font-size: 0.75rem; color: #cbd5e1; display: flex; flex-wrap: wrap; gap: 10px; }
        .form-title { color: #fff; font-size: 0.85rem; margin: 12px 0 6px; }
        .form-title:first-child { margin-top: 0; }
        .carry-panel { background: rgba(2,6,23,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; }
        .carry-head { font-size: 0.85rem; color: #e2e8f0; margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .carry-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px; }
        .carry-slot { min-height: 54px; border: 1px dashed #334155; border-radius: 8px; padding: 6px; font-size: 0.75rem; color: #64748b; display: flex; flex-direction: column; justify-content: center; }
        .carry-slot.filled { border-style: solid; border-color: var(--user-theme-accent, #f97316); color: #fff; background: rgba(249,115,22,0.08); }
        .cs-cat { font-size: 0.62rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.04em; }
        .lo-active { outline: 2px solid #10b981; }
        .wslots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
        .wslot { border: 1px solid var(--user-theme-accent, #f97316); background: rgba(249,115,22,0.08); border-radius: 10px; padding: 8px 10px; font-size: 0.8rem; color: #fff; display: flex; flex-direction: column; gap: 2px; }
        .wslot.empty { border-style: dashed; border-color: #334155; background: none; color: #64748b; }
        .wslot small, .ws-sub { color: #94a3b8; font-size: 0.74rem; }
        .pack-btn { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 6px; font-size: 0.7rem; padding: 2px 6px; cursor: pointer; white-space: nowrap; }
        .pack-btn.on { border-color: #10b981; color: #10b981; }
        .carry-slot.filled { cursor: pointer; }
        .lo-slots.over, .game-chip.over { background: #7f1d1d; }
        .storage-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
        .stor-group { background: var(--bg-card, #1e293b); border-radius: 10px; padding: 10px; }
        .stor-group h4 { color: #94a3b8; font-size: 0.72rem; text-transform: uppercase; margin-bottom: 6px; }
        .stor-item { display: flex; justify-content: space-between; gap: 6px; font-size: 0.82rem; color: #e2e8f0; padding: 3px 0; }
        .stor-item small { color: #94a3b8; }
        .stor-x { background: none; border: none; color: #64748b; cursor: pointer; }
        .kill-tally { grid-column: 1 / -1; margin-bottom: 10px; font-size: 0.85rem; color: #cbd5e1; }
        .kt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .ts-frame { position: relative; aspect-ratio: 16 / 9; max-height: 420px; width: 100%; border-radius: 12px; overflow: hidden; background: #020617; margin-bottom: 8px; }
        .ts-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s ease; cursor: pointer; }
        .ts-slide.active { opacity: 1; z-index: 1; }
        .ts-slide img { width: 100%; height: 100%; object-fit: cover; }
        .ts-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 14px; background: linear-gradient(transparent, rgba(2,6,23,0.9)); color: #fff; font-size: 0.9rem; }
        .ts-cap span { color: #facc15; }
        .ts-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; background: rgba(2,6,23,0.6); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 1.4rem; cursor: pointer; }
        .ts-prev { left: 8px; } .ts-next { right: 8px; }
        .ts-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 12px; }
        .ts-dot { width: 8px; height: 8px; border-radius: 50%; border: none; background: #475569; cursor: pointer; padding: 0; }
        .ts-dot.active { background: var(--user-theme-accent, #f97316); }
        .ts-empty { color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px; }
        .trophy-room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
        .trophy-tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 10px; background: var(--bg-card, #1e293b); border: 1px solid rgba(255,255,255,0.08); color: #fff; cursor: pointer; text-align: center; }
        .trophy-tile img, .tt-nophoto { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; background: #0f172a; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .tt-name { font-size: 0.82rem; font-weight: 700; } .tt-stars { color: #facc15; font-size: 0.8rem; } .tt-score { font-size: 0.72rem; color: #94a3b8; }
        .tm-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(2,6,23,0.8); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .tm-card { position: relative; width: min(560px, 100%); max-height: 92vh; overflow-y: auto; background: #131d31; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 16px; color: #e2e8f0; }
        .tm-close { position: absolute; top: 10px; right: 10px; z-index: 2; background: rgba(2,6,23,0.7); color: #fff; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
        .tm-photo { width: 100%; max-height: 340px; object-fit: cover; border-radius: 10px; background: #0f172a; }
        .tm-nophoto { height: 140px; display: flex; align-items: center; justify-content: center; color: #64748b; }
        .tm-card h3 { color: #fff; margin: 10px 0 2px; }
        .tm-stars { color: #facc15; font-size: 1.1rem; margin-bottom: 8px; }
        .tm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; font-size: 0.82rem; }
        .tm-grid div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 4px 0; }
        .tm-grid span { color: #94a3b8; }
        .tm-notes { margin-top: 8px; font-size: 0.82rem; color: #cbd5e1; }
        .tm-upload { display: inline-block; margin-top: 12px; cursor: pointer; }
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
                ? `<div class="ribbon-count-wrap" title="Times earned"><button type="button" class="step-btn" aria-label="Take one away" onclick="appState.stepRibbon('${escapeHtml(o.id)}', -1)">−</button><span>×</span><input type="number" min="0" step="1" inputmode="numeric" class="ribbon-count" value="0" aria-label="Times earned: ${escapeHtml(o.title || '')}" onchange="appState.setRibbonCount('${escapeHtml(o.id)}', this.value)"><button type="button" class="step-btn" aria-label="Add one" onclick="appState.stepRibbon('${escapeHtml(o.id)}', 1)">+</button></div>`
                : o.progressGoal
                ? `<div class="ribbon-count-wrap medal-progress-wrap" title="Progress"><button type="button" class="step-btn" aria-label="Take one away" onclick="appState.stepMedal('${escapeHtml(o.id)}', -1)">−</button><input type="number" min="0" step="1" inputmode="numeric" class="medal-count" value="0" aria-label="Progress: ${escapeHtml(o.title || '')}" onchange="appState.setMedalProgress('${escapeHtml(o.id)}', this.value)"><button type="button" class="step-btn" aria-label="Add one" onclick="appState.stepMedal('${escapeHtml(o.id)}', 1)">+</button></div>`
                : `<button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(o.id)}', '${o.type}'${groupArg})" aria-label="Toggle"></button>`}
        </div>
        ${o.body ? `<p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(o.body)}</p>` : ''}
        ${o.progressGoal ? `<div class="medal-meter wallet-meter" data-medal="${escapeHtml(o.id)}"></div>` : ''}
        ${o.type === 'trophy' ? `<div class="wallet-meter trophy-psn" data-trophy="${escapeHtml(o.id)}" hidden></div>` : ''}
        ${o.locImg ? `<img src="${escapeHtml(toSecureUrl(o.locImg))}" alt="Where to find ${escapeHtml(o.title || '')}" loading="lazy" class="loc-photo" title="Tap to enlarge" onerror="this.remove()">` : ''}
        ${o.price ? `<div class="price-meter wallet-meter" data-price="${Number(o.price) || 0}"></div>` : ''}
        ${o.link ? `<a href="${escapeHtml(o.link)}" target="_blank" rel="noopener" style="font-size:0.75rem; font-weight:800; color:var(--user-theme-accent, #ff5500); text-decoration:none;">▶ ${escapeHtml(o.linkLabel || 'Watch')}</a>` : ''}
    </div>`;
}

// Medals and PSN trophies with the same name (or "psn_trophy" in the JSON) are the same goal.
function psnTrophyForMedal(md) {
    const data = appState.gameData || {};
    const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const all = [...toArr(data.general_trophies), ...toArr(data.trophies), ...Object.values(data.missions || {}).flatMap(x => toArr(x && x.trophies))];
    if (md.psn_trophy !== undefined) return all.find(x => String(x.trophyId) === String(md.psn_trophy)) || null;
    return all.find(x => norm(x.name) === norm(md.name)) || null;
}
function medalCard(m, ctx) {
    const tierClass = { bronze: 'rank-bronze', silver: 'rank-silver', gold: 'rank-gold' }[m.goal_tier] || 'rank-silver';
    const parts = [];
    if (m.goal !== undefined && m.goal !== null) parts.push(`Goal: ${m.goal}`);
    if (m.distance_m) parts.push(`Distance: ${m.distance_m} m`);
    const tiers = m.tier_goals ? Object.values(m.tier_goals).filter(Number) : [];
    const linkedTrophy = psnTrophyForMedal(m);
    const progressGoal = Number(m.goal) > 1 || tiers.length || m.psn_trophy ? (tiers.length ? Math.max(...tiers) : Number(m.goal) || 1) : 0;
    return buildItemCard({
        progressGoal,
        id: m.id, type: 'medal', badge: (m.goal_tier || 'Medal'), badgeClass: tierClass,
        title: m.name, sub: m.description, body: [linkedTrophy ? `🔗 Synced with PSN trophy "${linkedTrophy.name}"` : '', parts.join(' | '), m.tip ? `Tip: ${m.tip}` : ''].filter(Boolean).join(' — '), img: m.image_url, ctx: `medal ${ctx || ''}`,
        locImg: m.location_image_url, link: m.map_url || m.video_url, linkLabel: m.map_url ? 'Open on map' : (m.video_url ? 'Watch guide' : '')
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
    // Pull guide extras (video link, tip) from the game JSON for this trophy.
    const tid = String(t.trophyId ?? tKey.split('_').pop());
    const data = appState.gameData || {};
    const raw = [...toArr(data.trophies), ...toArr(data.general_trophies), ...Object.values(data.missions || {}).flatMap(m => toArr(m && m.trophies))]
        .find(x => x && String(x.trophyId) === tid) || {};
    const bestM = raw.best_mission && data.missions && data.missions[raw.best_mission];
    return buildItemCard({
        id: tKey, type: 'trophy', badge: tType, badgeClass,
        title: t.name, sub: bestM ? `Best done in Mission ${bestM.number}: ${bestM.title}` : '',
        body: [t.description, raw.tip ? `Tip: ${raw.tip}` : ''].filter(Boolean).join(' '), img: t.icon, ctx: `trophy ${ctx || ''}`,
        link: raw.video_url, linkLabel: raw.video_url ? 'Watch guide' : ''
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

    let inner = `<div class="active-mission-bar"><button type="button" class="uni-search-btn active-mission-btn" data-mission="${escapeHtml(mKey)}" onclick="appState.setActiveMission('${escapeHtml(mKey)}')">📺 Show on stream overlay</button></div>` + gridOf([buildItemCard({
        id: mKey, type: 'mission', badge: m.region || 'Campaign', badgeClass: 'rank-gold',
        title: m.title || mLabel, sub: [`Mission ${m.number}`, m.date].filter(Boolean).join(' · '),
        body: m.walkthrough || '', img: m.image_url, ctx,
        link: m.guide_video && m.guide_video.url, linkLabel: m.guide_video ? `Full guide video (${m.guide_video.creator || 'YouTube'})` : ''
    })]);

    const colCards = [];
    const colGroups = [];
    const COL_ORDER = ['personal_letters', 'classified_documents', 'hidden_items', 'stone_eagles', 'workbenches'];
    Object.entries(m.collectibles || {})
        .sort((a, b) => { const ia = COL_ORDER.indexOf(a[0]), ib = COL_ORDER.indexOf(b[0]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); })
        .forEach(([cat, list]) => {
        const groupCards = [];
        toArr(list).forEach(it => {
            if (!it || !it.id) return;
            colCards.push(buildItemCard({
                id: it.id, type: 'collectible', group: `${mKey}__${cat}`,
                badge: COLLECTIBLE_LABELS[cat] || humanize(cat), badgeClass: 'rank-bronze',
                title: it.name, sub: it.location,
                body: [it.headline, it.author ? `— ${it.author}` : '', it.summary, it.unlocks ? `Unlocks: ${it.unlocks}` : ''].filter(Boolean).join(' '),
                img: it.image_url, ctx, locImg: it.location_image_url,
                link: it.video_url, linkLabel: 'Watch guide'
            }));
            groupCards.push(colCards[colCards.length - 1]);
        });
        if (groupCards.length) colGroups.push(`<h4 class="col-group-title">${escapeHtml(({ workbenches: "⚙️ Workbenches" })[cat] || (COLLECTIBLE_LABELS[cat] || humanize(cat)) + "s")} (${groupCards.length})</h4>` + gridOf(groupCards));
    });
    const detail = [];
    if (m.description) detail.push(`<div><h4>Description</h4><p>${escapeHtml(m.description)}</p></div>`);
    if (m.interactive_map && m.interactive_map.url) {
        const mc = m.interactive_map.marker_counts || {};
        const tools = [['bolt_cutters', 'Bolt cutters'], ['crowbar', 'Crowbars'], ['satchel_charges', 'Satchel charges'], ['coal_torpedoes', 'Coal torpedoes'], ['keys', 'Keys']].filter(([k]) => mc[k]).map(([k, l]) => `${l} ${mc[k]}`).join(' · ');
        detail.push(`<div><h4>🗺️ Collectible Map</h4><p><a href="${escapeHtml(m.interactive_map.url)}" target="_blank" rel="noopener" class="uni-search-btn" style="display:inline-block;">Open interactive map (${escapeHtml(m.interactive_map.source || 'map')})</a></p>${mc.starting_points ? `<p style="font-size:0.78rem;color:#94a3b8;">Starting points ${mc.starting_points} · Exfil ${mc.exfiltration_points || '?'}${tools ? ` · ${tools}` : ''}</p>` : ''}</div>`);
    }
    if (toArr(m.primary_objectives).length) detail.push(`<div><h4>Main Objectives</h4><ul>${toArr(m.primary_objectives).map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul></div>`);
    if (toArr(m.optional_objectives).length) detail.push(`<div><h4>Optional Objectives (${toArr(m.optional_objectives).length})</h4><ul>${toArr(m.optional_objectives).map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul></div>`);
    if (m.kill_target || (typeof m.kill_challenge === 'string' && m.kill_challenge)) {
        detail.push(`<div><h4>Kill List</h4>${m.kill_target ? `<p><strong>${escapeHtml(m.kill_target)}</strong></p>` : ''}${typeof m.kill_challenge === 'string' && m.kill_challenge ? `<p>Kill challenge: ${escapeHtml(m.kill_challenge)}</p>` : ''}</div>`);
    }
    const tot = m.collectible_totals;
    if (tot || m.starting_locations) {
        const rows = tot ? Object.entries(tot).filter(([k]) => k !== 'total').map(([k, v]) => `<li>${escapeHtml(COLLECTIBLE_LABELS[k] || humanize(k))}: ${v}</li>`).join('') : '';
        detail.push(`<div><h4>Collectibles${tot && tot.total ? ` (${tot.total})` : ''}</h4>${rows ? `<ul>${rows}</ul>` : ''}${m.starting_locations ? (toArr(m.starting_locations).some(sl => sl && sl.description) ? `<h4 style="margin-top:8px;">Starting Locations</h4><ul>${toArr(m.starting_locations).map(sl => { const v = m.guide_video && m.guide_video.video_id && sl.video_time !== undefined ? `https://www.youtube.com/watch?v=${m.guide_video.video_id}&t=${sl.video_time}s` : ''; return `<li><strong>${v ? `<a href="${escapeHtml(v)}" target="_blank" rel="noopener">${escapeHtml(sl.name)}</a>` : escapeHtml(sl.name)}</strong>${sl.default ? ' (default)' : ''}${sl.description ? ` — ${escapeHtml(sl.description)}` : ''}${sl.location_image_url ? `<br><img src="${escapeHtml(toSecureUrl(sl.location_image_url))}" class="loc-photo" style="max-width:420px" loading="lazy" alt="">` : ''}</li>`; }).join('')}</ul>` : `<p>Starting locations: ${typeof m.starting_locations === 'string' || typeof m.starting_locations === 'number' ? escapeHtml(String(m.starting_locations)) : toArr(m.starting_locations).map(sl => { const n = escapeHtml(sl.name || String(sl)); const v = m.guide_video && m.guide_video.video_id && sl.video_time !== undefined ? `https://www.youtube.com/watch?v=${m.guide_video.video_id}&t=${sl.video_time}s` : ''; return v ? `<a href="${escapeHtml(v)}" target="_blank" rel="noopener">${n}</a>` : n; }).join(', ')}</p>`) : ''}</div>`);
    }
    if (detail.length) inner = (m.image_url ? `<img class="mission-hero" src="${toSecureUrl(m.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '') + `<div class="mission-detail">${detail.join('')}</div>` + inner;

    if (m.gnomes && toArr(m.gnomes.items).length) {
        const g = m.gnomes;
        inner += buildFolder(`🧙 Gnomes — ${escapeHtml(g.medal_name || 'medal')}`, `<p style="font-size:0.8rem;color:#cbd5e1;margin-bottom:8px;">${escapeHtml(g.description || '')} Ticking all ${toArr(g.items).length} earns the medal. ${g.numbering_note ? escapeHtml(g.numbering_note) + ' ' : ''}${g.guide_video ? `<a href="${escapeHtml(g.guide_video.url)}" target="_blank" rel="noopener" style="color:var(--user-theme-accent,#ff5500);font-weight:800;">▶ Full gnome video (${escapeHtml(g.guide_video.creator || 'YouTube')})</a>` : ''}</p>`
            + gridOf(toArr(g.items).map(it => buildItemCard({ id: it.id, type: 'mission', badge: '🧙 Gnome', badgeClass: 'rank-bronze', title: it.name, sub: it.location || '', body: it.description || '', ctx: `${ctx} gnome`, link: it.video_url, linkLabel: 'Watch guide', locImg: it.location_image_url }))));
    }
    if (colCards.length) inner += buildFolder('🗂️ Collectibles', `<div class="mark-all-bar" data-mission="${escapeHtml(mKey)}">
        <button type="button" class="uni-search-btn" onclick="appState.markAllCollectibles('${escapeHtml(mKey)}', true)">✓ Mark all collected</button>
        <button type="button" class="uni-search-btn" onclick="appState.markAllCollectibles('${escapeHtml(mKey)}', false)">Clear all</button>
        <button type="button" class="uni-search-btn mark-undo" hidden onclick="appState.undoMarkAll()">↶ Undo</button>
    </div>` + colGroups.join(''));

    const chCards = [];
    const kc = m.kill_challenge;
    if (kc && typeof kc === 'object') {
        const body = [kc.location, kc.strategy, kc.reward ? `Reward: ${kc.reward}` : ''].filter(Boolean).join(' ');
        chCards.push(buildItemCard({
            id: `kill_${mKey}`, type: 'mission', badge: 'Kill List', badgeClass: 'rank-silver',
            title: kc.target_name, sub: kc.challenge, body: [kc.description, body].filter(Boolean).join(' '), locImg: kc.image_url, ctx
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
    if (toArr(m.points_of_interest).length) inner += buildFolder('📍 Other Spots (snipers, keys, tools)', gridOf(toArr(m.points_of_interest).map(pt => buildItemCard({
        id: pt.id, type: 'mission', badge: pt.type || 'Spot', badgeClass: 'rank-silver', title: pt.name, sub: pt.location || '', ctx: `${ctx} spot`, locImg: pt.location_image_url
    }))));
    if (m.medals && typeof m.medals === 'object') {
        const mh = renderTree(m.medals, medalCard, []);
        if (mh) inner += buildFolder('🏅 Medals', mh);
    }

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
    if (data.campaign_rank) html += rankPanelHtml(data);

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

// ---- trophy room: slideshow + bookmarked mounts + detail card
const starStr = (n) => n ? '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n)) : 'Not rated';
let trophySlideIdx = 0, trophySlideTimer = null, trophyRoomSig = '';
function trophyMounts() { return toArr(appState.harvestLog).filter(h => h.taxidermy).slice().reverse(); }
function trophyDetailHtml(h) {
    const photo = h.photoId && trophyPhotoCache[h.photoId];
    const row = (k, v) => (v || v === 0) && v !== '' ? `<div><span>${k}</span><b>${escapeHtml(String(v))}</b></div>` : '';
    return `${photo ? `<img class="tm-photo" src="${photo}" alt="${escapeHtml(h.species)} trophy">` : '<div class="tm-photo tm-nophoto">No photo yet</div>'}
        <h3>${escapeHtml(h.species)}${h.sex ? ` (${escapeHtml(h.sex)})` : ''}</h3>
        <div class="tm-stars">${starStr(h.stars)}</div>
        <div class="tm-grid">
            ${row('Trophy score', h.score)}${row('Hunt rating', h.huntRating)}${row('Fitness', h.fitness ? h.fitness + '%' : '')}
            ${row('Age', h.age ? h.age + ' yrs' : '')}${row('Weight', h.weight ? h.weight + ' lb' : '')}${row('Shot placement', h.hitOrgan)}
            ${row('Shot distance', h.shotDistance ? h.shotDistance + ' yd' : '')}${row('Credits', h.credits ? fmtNum(h.credits) : '')}${row('XP', h.xp ? fmtNum(h.xp) : '')}
            ${row('In-game day', h.gameDay ? `Day ${h.gameDay} ${h.gameTime || ''}` : '')}${row('Logged', h.date)}
        </div>
        ${h.notes ? `<p class="tm-notes">${escapeHtml(h.notes)}</p>` : ''}
        <label class="uni-search-btn tm-upload">📷 ${photo ? 'Replace photo' : 'Add photo'}<input type="file" accept="image/*" hidden onchange="appState.setTrophyPhoto('${escapeHtml(h.id)}', this)"></label>`;
}
function openTrophy(id) {
    const h = toArr(appState.harvestLog).find(x => x.id === id); if (!h) return;
    if (h.photoId) loadTrophyPhoto(h.photoId);
    let m = document.getElementById('trophyModal');
    if (!m) {
        m = document.createElement('div'); m.id = 'trophyModal'; m.className = 'tm-overlay';
        m.addEventListener('click', (e) => { if (e.target === m) closeTrophy(); });
        document.body.appendChild(m);
    }
    m.dataset.id = id;
    m.innerHTML = `<div class="tm-card" role="dialog" aria-label="Trophy details"><button type="button" class="tm-close" onclick="closeTrophy()" aria-label="Close">✕</button>${trophyDetailHtml(h)}</div>`;
}
function closeTrophy() { const m = document.getElementById('trophyModal'); if (m) m.remove(); }
window.openTrophy = openTrophy; window.closeTrophy = closeTrophy;
function showTrophySlide(i) {
    const slides = document.querySelectorAll('#trophySlideshow .ts-slide'); if (!slides.length) return;
    trophySlideIdx = (i + slides.length) % slides.length;
    slides.forEach((el, k) => el.classList.toggle('active', k === trophySlideIdx));
    document.querySelectorAll('#trophySlideshow .ts-dot').forEach((el, k) => el.classList.toggle('active', k === trophySlideIdx));
}
window.showTrophySlide = showTrophySlide;
function renderTrophyRoom() {
    const show = document.getElementById('trophySlideshow'), grid = document.getElementById('trophyGrid');
    if (!show || !grid) return;
    const mounts = trophyMounts();
    mounts.forEach(h => { if (h.photoId) loadTrophyPhoto(h.photoId); });
    const sig = mounts.map(h => `${h.id}:${h.photoId && trophyPhotoCache[h.photoId] ? 1 : 0}:${h.stars}:${h.score}`).join('|');
    if (sig === trophyRoomSig) return;
    trophyRoomSig = sig;
    const withPhoto = mounts.filter(h => h.photoId && trophyPhotoCache[h.photoId]);
    show.innerHTML = withPhoto.length ? `<div class="ts-frame">
        ${withPhoto.map((h, k) => `<div class="ts-slide${k === 0 ? ' active' : ''}" onclick="openTrophy('${escapeHtml(h.id)}')"><img src="${trophyPhotoCache[h.photoId]}" alt="${escapeHtml(h.species)}"><div class="ts-cap"><b>${escapeHtml(h.species)}</b> <span>${starStr(h.stars)}</span>${h.score ? ` · ${escapeHtml(String(h.score))}` : ''}</div></div>`).join('')}
        ${withPhoto.length > 1 ? `<button type="button" class="ts-nav ts-prev" onclick="showTrophySlide(trophySlideIdxGet()-1)" aria-label="Previous">‹</button><button type="button" class="ts-nav ts-next" onclick="showTrophySlide(trophySlideIdxGet()+1)" aria-label="Next">›</button>` : ''}
        </div>${withPhoto.length > 1 ? `<div class="ts-dots">${withPhoto.map((_, k) => `<button type="button" class="ts-dot${k === 0 ? ' active' : ''}" onclick="showTrophySlide(${k})" aria-label="Slide ${k + 1}"></button>`).join('')}</div>` : ''}`
        : (mounts.length ? '<p class="ts-empty">Add a photo to a mount below and it will show up in the slideshow.</p>' : '');
    trophySlideIdx = 0;
    clearInterval(trophySlideTimer);
    if (withPhoto.length > 1) trophySlideTimer = setInterval(() => { if (!document.getElementById('trophyModal')) showTrophySlide(trophySlideIdx + 1); }, 5000);
    grid.innerHTML = mounts.length ? mounts.map(h => {
        const photo = h.photoId && trophyPhotoCache[h.photoId];
        return `<button type="button" class="trophy-tile" onclick="openTrophy('${escapeHtml(h.id)}')">
            ${photo ? `<img src="${photo}" alt="">` : '<span class="tt-nophoto">🏆</span>'}
            <span class="tt-name">${escapeHtml(h.species)}</span><span class="tt-stars">${starStr(h.stars)}</span>
            ${h.score ? `<span class="tt-score">Score ${escapeHtml(String(h.score))}</span>` : ''}</button>`;
    }).join('') : '<p style="color:#94a3b8;font-size:0.85rem;">No mounts yet. Tick "Taxidermy" when you log a harvest, or press "Mount" on a harvest card.</p>';
}
window.trophySlideIdxGet = () => trophySlideIdx;

// ---- Hunter Locker: storage (everything owned), two weapon slots (primary /
// secondary: weapon + attachments + ammo) and a 6-slot gear pack, plus the shop.
const WEAPON_CATS = ['Rifle', 'Shotgun', 'Bow', 'Crossbow', 'Handgun', 'Weapon'];
const AMMO_CATS = ['Ammo', 'Arrow', 'Bolt', 'Shell'];
const ATTACH_CATS = ['Optic', 'Scope', 'Sight', 'Suppressor', 'Bipod', 'Sling', 'Attachment'];
const ITEM_CATS = ['Rifle', 'Shotgun', 'Bow', 'Crossbow', 'Handgun', 'Ammo', 'Arrow', 'Bolt', 'Optic', 'Suppressor', 'Bipod', 'Sling', 'Attachment', 'Binoculars', 'Rangefinder', 'Caller', 'Scent', 'Spray', 'Decoy', 'Tent / Blind', 'Gear', 'Other'];
const isWeapon = (it) => it && WEAPON_CATS.includes(it.category);
const isAmmo = (it) => it && AMMO_CATS.includes(it.category);
const isAttachment = (it) => it && ATTACH_CATS.includes(it.category);
const isPackItem = (it) => it && !isWeapon(it) && !isAmmo(it) && !isAttachment(it);
function migrateLoadouts(st) {
    if (!toArr(st.loadouts).length || toArr(st.weaponSetups).length) return;
    st.weaponSetups = st.loadouts.filter(lo => lo.weapon).map(lo => ({ id: lo.id, name: lo.name, weapon: lo.weapon, ammo: lo.ammo || '', attachments: toArr(lo.gear).filter(u => isAttachment(toArr(st.inventory).find(i => i.uid === u))) }));
    const act = st.loadouts.find(lo => lo.id === st.activeLoadout) || st.loadouts[0];
    st.carry = { primary: st.weaponSetups[0]?.id || null, secondary: st.weaponSetups[1]?.id || null, pack: act ? toArr(act.gear).filter(u => isPackItem(toArr(st.inventory).find(i => i.uid === u))) : [] };
    st.loadouts = []; st.activeLoadout = null;
}
function catalogItems() {
    const d = appState.gameData || {};
    if (toArr(d.shop?.items).length) return toArr(d.shop.items);
    const g = d.gear || {}, out = [];
    toArr(g.firearms).forEach(f => {
        out.push({ id: f.id, name: f.name, category: 'Rifle', caliber: f.caliber || '', price: f.price, level: f.required_level });
        if (f.ammo_brand) out.push({ id: `${f.id}_ammo`, name: `${f.ammo_brand}${f.recommended_ammo_type ? ` (${f.recommended_ammo_type})` : ''}`, category: 'Ammo', caliber: f.caliber || '' });
    });
    toArr(g.optics).forEach(o => out.push({ id: o.id, name: o.name, category: 'Optic', desc: o.description }));
    toArr(g.scents).forEach(sc => out.push({ id: sc.id || sc.name, name: sc.name, category: 'Scent', price: sc.price, level: sc.required_level, desc: toArr(sc.target_animals).join(', ') }));
    return out;
}
const invItem = (uid) => toArr(appState.inventory).find(i => i.uid === uid);
const ownedCount = (id) => toArr(appState.inventory).filter(i => i.id === id).length;
const setupById = (id) => toArr(appState.weaponSetups).find(x => x.id === id);
function setupLabel(su) {
    if (!su) return 'Empty';
    const w = invItem(su.weapon), a = invItem(su.ammo);
    return [w && w.name, a && a.name].filter(Boolean).join(' + ') || 'No weapon';
}
function addToInventory(src) {
    const item = { uid: 'i' + Date.now() + Math.floor(Math.random() * 1000), id: src.id || ('custom_' + Date.now()), name: src.name, category: src.category || 'Other', caliber: src.caliber || '', price: Number(src.price) || 0, level: src.level || '', notes: src.notes || '' };
    appState.inventory.push(item);
    return item;
}
function spendCredits(price) {
    if (!price) return true;
    if ((appState.wallet.credits || 0) < price) { appState.updateStatus(`Not enough credits: need ${fmtNum(price - (appState.wallet.credits || 0))} more.`); return false; }
    appState.wallet.credits -= price; return true;
}
window.appState.buyItem = function(id, pay) {
    const it = catalogItems().find(c => c.id === id); if (!it) return;
    if (pay && !spendCredits(Number(it.price) || 0)) return;
    addToInventory(it);
    this.applyStateToUI(); this.saveProgress();
    this.updateStatus(`${it.name} added to your storage${pay && it.price ? ` (-${fmtNum(it.price)} credits)` : ''}.`);
};
window.appState.addStorageItem = function(form) {
    const f = new FormData(form);
    const pick = f.get('catalog');
    const src = (pick && pick !== '__custom') ? catalogItems().find(c => c.id === pick)
        : { name: (f.get('name') || '').trim(), category: f.get('category'), caliber: (f.get('caliber') || '').trim(), price: f.get('price') };
    if (!src || !src.name) { this.updateStatus('Pick an item or type its name.'); return; }
    if (f.get('pay') && !spendCredits(Number(src.price) || 0)) return;
    addToInventory(src); form.reset(); toggleCustomItem(form);
    this.applyStateToUI(); this.saveProgress();
};
window.appState.removeStorageItem = function(uid) {
    this.inventory = this.inventory.filter(i => i.uid !== uid);
    this.weaponSetups.forEach(su => { if (su.weapon === uid) su.weapon = ''; if (su.ammo === uid) su.ammo = ''; su.attachments = toArr(su.attachments).filter(x => x !== uid); });
    this.carry.pack = toArr(this.carry.pack).filter(x => x !== uid);
    this.applyStateToUI(); this.saveProgress();
};
window.appState.setCarrySlots = function(v) { this.carrySlots = Math.max(1, Math.min(30, Math.floor(Number(v) || 6))); this.applyStateToUI(); this.saveProgress(); };
window.appState.togglePack = function(uid) {
    const pack = toArr(this.carry.pack);
    if (pack.includes(uid)) this.carry.pack = pack.filter(x => x !== uid);
    else {
        if (pack.length >= this.carrySlots) { this.updateStatus(`Gear pack is full (${this.carrySlots}/${this.carrySlots}). Take something out first.`); return; }
        this.carry.pack = [...pack, uid];
    }
    this.applyStateToUI(); this.saveProgress();
};
window.appState.saveSetup = function(form) {
    const f = new FormData(form);
    if (!f.get('weapon')) { this.updateStatus('Pick a weapon for this setup.'); return; }
    const su = { id: f.get('id') || ('s' + Date.now()), name: (f.get('name') || '').trim() || (invItem(f.get('weapon')) || {}).name || 'Weapon setup', weapon: f.get('weapon'), ammo: f.get('ammo') || '', attachments: f.getAll('attachments') };
    const i = this.weaponSetups.findIndex(x => x.id === su.id);
    if (i >= 0) this.weaponSetups[i] = su; else this.weaponSetups.push(su);
    const slot = f.get('slot');
    if (slot === 'primary' || slot === 'secondary') { this.carry[slot] = su.id; if (this.carry[slot === 'primary' ? 'secondary' : 'primary'] === su.id) this.carry[slot === 'primary' ? 'secondary' : 'primary'] = null; }
    else if (!this.carry.primary) this.carry.primary = su.id;
    form.reset(); form.id.value = ''; form.querySelector('[type=submit]').textContent = 'Save weapon setup';
    this.applyStateToUI(); this.saveProgress();
};
window.appState.editSetup = function(id) {
    const su = setupById(id); const form = document.getElementById('setupForm'); if (!su || !form) return;
    renderLockerSelects();
    form.id.value = su.id; form.name.value = su.name; form.weapon.value = su.weapon || '';
    fillAmmoSelect(form.ammo, su.weapon, su.ammo || ''); fillAttachments(form, su.weapon, su.attachments);
    form.slot.value = this.carry.primary === id ? 'primary' : this.carry.secondary === id ? 'secondary' : '';
    form.querySelector('[type=submit]').textContent = 'Save changes';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
window.appState.deleteSetup = function(id) {
    this.weaponSetups = this.weaponSetups.filter(x => x.id !== id);
    ['primary', 'secondary'].forEach(k => { if (this.carry[k] === id) this.carry[k] = null; });
    this.applyStateToUI(); this.saveProgress();
};
window.appState.equipSetup = function(id, slot) {
    const other = slot === 'primary' ? 'secondary' : 'primary';
    if (this.carry[other] === id) this.carry[other] = this.carry[slot] || null;
    this.carry[slot] = id;
    this.applyStateToUI(); this.saveProgress();
};
function fillAmmoSelect(sel, weaponUid, value) {
    if (!sel) return;
    const w = invItem(weaponUid);
    const ammo = toArr(appState.inventory).filter(isAmmo);
    const match = w && w.caliber ? ammo.filter(a => !a.caliber || a.caliber === w.caliber) : ammo;
    const list = match.length ? match : ammo;
    sel.innerHTML = '<option value="">Ammo</option>' + list.map(a => `<option value="${escapeHtml(a.uid)}">${escapeHtml(a.name)}${a.caliber ? ` (${escapeHtml(a.caliber)})` : ''}</option>`).join('');
    if (value !== undefined) sel.value = value;
    else if (list.length === 1) sel.value = list[0].uid;
}
window.fillAmmoSelect = fillAmmoSelect;
function fillAttachments(form, weaponUid, checked) {
    const box = form.querySelector('.su-attach'); if (!box) return;
    const keep = new Set(checked || [...box.querySelectorAll('input:checked')].map(c => c.value));
    const list = toArr(appState.inventory).filter(isAttachment);
    box.innerHTML = list.length ? list.map(o => `<label class="hunt-check"><input type="checkbox" name="attachments" value="${escapeHtml(o.uid)}"${keep.has(o.uid) ? ' checked' : ''}> ${escapeHtml(o.name)} <small>${escapeHtml(o.category)}</small></label>`).join('')
        : '<span style="font-size:0.75rem;color:#64748b;">Scopes, suppressors and other attachments you own show up here.</span>';
    box.dataset.sig = list.map(o => o.uid).join(',');
}
window.fillAttachments = fillAttachments;
function toggleCustomItem(form) { const custom = form.catalog.value === '__custom' || form.catalog.options.length <= 2; form.querySelectorAll('.custom-item').forEach(el => { el.hidden = !custom; }); }
window.toggleCustomItem = toggleCustomItem;
function applyLoadoutToHarvest(form, key) {
    const id = key === 'primary' || key === 'secondary' ? appState.carry[key] : key;
    const su = setupById(id);
    if (form.loadout) form.loadout.value = su ? key : '';
    if (!su) return;
    form.weapon.value = su.weapon || '';
    fillAmmoSelect(form.ammo, su.weapon, su.ammo || '');
}
window.applyLoadoutToHarvest = applyLoadoutToHarvest;
function setOptions(sel, html) { if (!sel) return; const v = sel.value; if (sel.innerHTML !== html) { sel.innerHTML = html; sel.value = v; } }
function renderLockerSelects() {
    const inv = toArr(appState.inventory), st = appState;
    const weaponOpts = '<option value="">Weapon</option>' + inv.filter(isWeapon).map(w => `<option value="${escapeHtml(w.uid)}">${escapeHtml(w.name)}${w.caliber ? ` (${escapeHtml(w.caliber)})` : ''}</option>`).join('');
    const ammoSig = (f) => inv.filter(isAmmo).map(a => a.uid).join(',') + '|' + f.weapon.value;
    const sf = document.getElementById('setupForm');
    if (sf) {
        setOptions(sf.weapon, weaponOpts);
        if (sf.ammo.dataset.sig !== ammoSig(sf)) { sf.ammo.dataset.sig = ammoSig(sf); fillAmmoSelect(sf.ammo, sf.weapon.value, sf.ammo.value); }
        const box = sf.querySelector('.su-attach');
        if (box && box.dataset.sig !== inv.filter(isAttachment).map(o => o.uid).join(',')) fillAttachments(sf, sf.weapon.value);
    }
    const hf = document.getElementById('harvestForm');
    if (hf && hf.weapon) {
        const p = setupById(st.carry.primary), s2 = setupById(st.carry.secondary);
        const others = toArr(st.weaponSetups).filter(x => x.id !== st.carry.primary && x.id !== st.carry.secondary);
        setOptions(hf.loadout, '<option value="">Weapon slot used</option>'
            + (p ? `<option value="primary">Primary: ${escapeHtml(p.name)}</option>` : '')
            + (s2 ? `<option value="secondary">Secondary: ${escapeHtml(s2.name)}</option>` : '')
            + others.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`).join(''));
        setOptions(hf.weapon, weaponOpts);
        if (!hf.dataset.touched && p && hf.loadout.value !== 'primary') applyLoadoutToHarvest(hf, 'primary');
        else if (hf.ammo.dataset.sig !== ammoSig(hf)) { hf.ammo.dataset.sig = ammoSig(hf); fillAmmoSelect(hf.ammo, hf.weapon.value, hf.ammo.value); }
    }
}
function renderLocker() {
    renderLockerSelects();
    const st = appState, inv = toArr(st.inventory);
    setVal('carrySlots', st.carrySlots);
    const pack = toArr(st.carry.pack).map(invItem).filter(Boolean);
    const weaponSlot = (key, label) => {
        const su = setupById(st.carry[key]);
        if (!su) return `<div class="wslot empty"><span class="cs-cat">${label}</span>Empty — pick a setup below</div>`;
        const att = toArr(su.attachments).map(invItem).filter(Boolean).map(x => x.name);
        const w = invItem(su.weapon), a = invItem(su.ammo);
        return `<div class="wslot"><span class="cs-cat">${label}</span><b>${escapeHtml(su.name)}</b>
            <div>${escapeHtml(w ? w.name : 'No weapon')}${w && w.caliber ? ` <small>${escapeHtml(w.caliber)}</small>` : ''}</div>
            <div class="ws-sub">🎯 ${escapeHtml(a ? a.name : 'No ammo')}</div>
            ${att.length ? `<div class="ws-sub">🔧 ${att.map(escapeHtml).join(' · ')}</div>` : ''}</div>`;
    };
    const carry = document.getElementById('carryPanel');
    if (carry) carry.innerHTML = `<div class="carry-head"><b>On your person</b></div>
        <div class="wslots">${weaponSlot('primary', 'Primary')}${weaponSlot('secondary', 'Secondary')}</div>
        <div class="carry-head" style="margin-top:10px;"><b>Gear pack</b> <span class="game-chip${pack.length > st.carrySlots ? ' over' : ''}">${pack.length}/${st.carrySlots} slots</span></div>
        <div class="carry-slots">${Array.from({ length: st.carrySlots }, (_, k) => pack[k] ? `<div class="carry-slot filled" onclick="appState.togglePack('${escapeHtml(pack[k].uid)}')" title="Take out of pack"><span class="cs-cat">${escapeHtml(pack[k].category)}</span>${escapeHtml(pack[k].name)}</div>` : '<div class="carry-slot">Empty</div>').join('')}</div>`;
    const los = document.getElementById('setupList');
    if (los) los.innerHTML = toArr(st.weaponSetups).map(su => {
        const tag = st.carry.primary === su.id ? 'Primary' : st.carry.secondary === su.id ? 'Secondary' : '';
        const att = toArr(su.attachments).map(invItem).filter(Boolean).map(x => x.name);
        return `<div class="trophy-card hunt-card${tag ? ' lo-active' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;"><div style="flex:1">
            ${tag ? `<span class="trophy-rank rank-gold">${tag}</span>` : ''}<h3 style="color:#fff;font-size:0.95rem;">${escapeHtml(su.name)}</h3>
            <div style="font-size:0.78rem;color:#cbd5e1;">${escapeHtml(setupLabel(su))}</div>
            ${att.length ? `<div style="font-size:0.72rem;color:#94a3b8;">🔧 ${att.map(escapeHtml).join(' · ')}</div>` : ''}</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
            ${tag !== 'Primary' ? `<button type="button" class="uni-search-btn" onclick="appState.equipSetup('${escapeHtml(su.id)}','primary')">Primary</button>` : ''}
            ${tag !== 'Secondary' ? `<button type="button" class="uni-search-btn" onclick="appState.equipSetup('${escapeHtml(su.id)}','secondary')">Secondary</button>` : ''}
            <button type="button" class="uni-search-btn" onclick="appState.editSetup('${escapeHtml(su.id)}')">Edit</button>
            <button type="button" class="uni-search-btn" onclick="appState.deleteSetup('${escapeHtml(su.id)}')">Delete</button></div></div></div>`;
    }).join('');
    const stor = document.getElementById('storageList');
    if (stor) {
        const groups = {};
        inv.forEach(i => { (groups[i.category] = groups[i.category] || []).push(i); });
        const inPack = new Set(toArr(st.carry.pack));
        stor.innerHTML = inv.length ? Object.keys(groups).sort((a, b) => ITEM_CATS.indexOf(a) - ITEM_CATS.indexOf(b)).map(cat => `<div class="stor-group"><h4>${escapeHtml(cat)} (${groups[cat].length})</h4>${groups[cat].map(i => `<div class="stor-item"><span>${escapeHtml(i.name)}${i.caliber ? ` <small>${escapeHtml(i.caliber)}</small>` : ''}</span><span style="display:flex;gap:4px;align-items:center;">${isPackItem(i) ? `<button type="button" class="pack-btn${inPack.has(i.uid) ? ' on' : ''}" onclick="appState.togglePack('${escapeHtml(i.uid)}')">${inPack.has(i.uid) ? '🎒 In pack' : '+ Pack'}</button>` : ''}<button type="button" class="stor-x" title="Remove from storage" onclick="appState.removeStorageItem('${escapeHtml(i.uid)}')">✕</button></span></div>`).join('')}</div>`).join('')
            : '<p style="color:#94a3b8;font-size:0.85rem;">Storage is empty. Add what you own, or buy it from the Shop.</p>';
    }
    document.querySelectorAll('[data-owned-for]').forEach(el => { const n = ownedCount(el.dataset.ownedFor); el.textContent = n ? `Owned ×${n}` : ''; });
}
function lockerPanelHtml(data) {
    const inp = 'class="uni-search-input hunt-input"';
    const cat = catalogItems();
    const byCat = {}; cat.forEach(c => { (byCat[c.category] = byCat[c.category] || []).push(c); });
    const catOpts = Object.keys(byCat).map(k => `<optgroup label="${escapeHtml(k)}">${byCat[k].map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.price ? ` — ${fmtNum(c.price)} cr` : ''}</option>`).join('')}</optgroup>`).join('');
    const hid = cat.length ? ' hidden' : '';
    const two = (a, b) => `<div class="hunt-2col"><div class="hunt-form-col">${a}</div><div class="hunt-cards-col">${b}</div></div>`;
    const left = `
        <h4 class="form-title">Add to storage</h4>
        <form class="harvest-form" onsubmit="event.preventDefault(); appState.addStorageItem(this);">
            <select name="catalog" ${inp} onchange="toggleCustomItem(this.form)"><option value="">Pick an item…</option>${catOpts}<option value="__custom">Other (type it in)</option></select>
            <input name="name" placeholder="Item name" class="uni-search-input hunt-input custom-item"${hid}>
            <select name="category" class="uni-search-input hunt-input custom-item"${hid}>${ITEM_CATS.map(c => `<option>${c}</option>`).join('')}</select>
            <input name="caliber" placeholder="Caliber / gauge (weapons & ammo)" class="uni-search-input hunt-input custom-item"${hid}>
            <input name="price" type="number" min="0" placeholder="Price (credits)" class="uni-search-input hunt-input custom-item"${hid}>
            <label class="hunt-check"><input type="checkbox" name="pay"> Bought it now (take credits off)</label>
            <button type="submit" class="uni-search-btn">Add to storage</button>
        </form>
        <h4 class="form-title">Weapon setup (gun + attachments + ammo)</h4>
        <form id="setupForm" class="harvest-form" onsubmit="event.preventDefault(); appState.saveSetup(this);">
            <input type="hidden" name="id">
            <input name="name" placeholder="Setup name (e.g. Big game .308)" ${inp}>
            <select name="weapon" ${inp} onchange="fillAmmoSelect(this.form.ammo, this.value)"></select>
            <select name="ammo" ${inp}></select>
            <div class="su-attach" style="flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;"></div>
            <select name="slot" ${inp}><option value="">Don't equip yet</option><option value="primary">Put in Primary slot</option><option value="secondary">Put in Secondary slot</option></select>
            <button type="submit" class="uni-search-btn">Save weapon setup</button>
        </form>
        <h4 class="form-title">Gear pack slots</h4>
        <div class="harvest-form"><input id="carrySlots" type="number" min="1" max="30" ${inp} onchange="appState.setCarrySlots(this.value)"><span style="font-size:0.75rem;color:#94a3b8;flex-basis:100%;">6 without a backpack. Sprays, scents, callers and other gear go in the pack with "+ Pack" in Storage; they stay there whatever gun you swap to.</span></div>`;
    const right = `<div id="carryPanel" class="carry-panel"></div><h4 class="form-title">Weapon setups</h4><div id="setupList" class="hunt-card-list" style="margin-bottom:10px;"></div><h4 class="form-title">Storage</h4><div id="storageList" class="storage-list"></div>`;
    let html = buildFolder('🎒 Hunter Locker (Storage & Loadout)', two(left, right));
    if (cat.length) {
        html += buildFolder('🏪 Shop' + (data.shop && data.shop.verified === false ? ' <span class="game-chip">Not confirmed yet</span>' : ''), gridOf(cat.map(c => `
            <div class="trophy-card hunt-card"><span class="trophy-rank rank-silver">${escapeHtml(c.category)}</span>
            <h3 style="color:#fff;font-size:0.95rem;">${escapeHtml(c.name)}</h3>
            <div style="font-size:0.75rem;color:#94a3b8;">${[c.caliber, c.level ? `Level ${c.level}` : '', c.price ? `${fmtNum(c.price)} credits` : 'Price not recorded yet'].filter(Boolean).map(escapeHtml).join(' · ')}</div>
            ${c.desc ? `<div style="font-size:0.75rem;color:#cbd5e1;">${escapeHtml(c.desc)}</div>` : ''}
            ${c.price ? `<div class="price-meter wallet-meter" data-price="${Number(c.price)}"></div>` : ''}
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${c.price ? `<button type="button" class="uni-search-btn" onclick="appState.buyItem('${escapeHtml(c.id)}', true)">Buy</button>` : ''}
            <button type="button" class="uni-search-btn" onclick="appState.buyItem('${escapeHtml(c.id)}', false)">I own this</button>
            <span class="game-chip" data-owned-for="${escapeHtml(c.id)}"></span></div></div>`)));
    }
    return html;
}

// ---- Campaign rank (from the "Climbing the Ranks" PSN trophy or typed in) + arsenal unlocks
const slugify = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
function arsenalList(data) {
    const w = data.weapons || {}, roster = data.weapon_roster || {};
    const out = [], seen = new Set();
    const add = (cat, x) => { const name = typeof x === 'string' ? x : x.name; const k = slugify(name).replace(/_/g, ''); if (seen.has(k)) return; seen.add(k); out.push({ cat, name, ...(typeof x === 'object' ? x : {}) }); };
    toArr(w.rifles).forEach(x => add('Rifle', x));
    toArr(w.pistols).forEach(x => add('Pistol', x));
    toArr(w.secondaries).forEach(x => add('Secondary', x));
    toArr(roster.rifles).forEach(x => add('Rifle', x));
    toArr(roster.secondaries).forEach(x => add('Secondary', x));
    toArr(roster.pistols).forEach(x => add('Pistol', x));
    return out;
}
function weaponUnlockStatus(wp) {
    const st = appState, data = st.gameData || {};
    if (wp.unlocked_by_default) return { ok: true, text: 'Available from the start' };
    const req = String(wp.unlockRequirement || '');
    if (!req) return { ok: null, text: 'Unlock requirement not recorded yet' };
    const missionKey = (n) => Object.keys(data.missions || {}).find(k => data.missions[k] && Number(data.missions[k].number) === Number(n));
    let m;
    if ((m = req.match(/rank\s*(\d+)/i))) { const n = +m[1]; return { ok: (st.campaignRank || 0) >= n, text: `Rank ${st.campaignRank || 0}/${n}` }; }
    if ((m = req.match(/Kill Challenge in Mission\s*(\d+)/i))) { const k = missionKey(m[1]); const done = !!(k && st.missions[`kill_${k}`]?.completed); return { ok: done, text: done ? 'Kill challenge done' : 'Kill challenge not done yet' }; }
    if ((m = req.match(/Complete Mission\s*(\d+)/i))) { const k = missionKey(m[1]); const done = !!(k && st.missions[k]?.completed); return { ok: done, text: done ? 'Mission complete' : 'Mission not complete yet' }; }
    if (/propaganda/i.test(req)) {
        const ids = Object.values(data.missions || {}).map(x => x && x.propaganda_mission && x.propaganda_mission.id).filter(Boolean);
        const done = ids.filter(id => st.missions[id]?.completed).length;
        // The data doesn't say which propaganda missions are which type, so this is a guide; tick it when the game unlocks it.
        return { ok: null, text: `${done} propaganda mission${done === 1 ? '' : 's'} ticked so far · tick the weapon when it unlocks` };
    }
    return { ok: null, text: 'Tick it when you have it' };
}
function openRankPanel() {
    const h = [...document.querySelectorAll('#section-container .category-section > .category-header h2')].find(x => /Campaign Rank/.test(x.innerText));
    if (!h) return;
    const sec = h.closest('.category-section'); sec.classList.remove('section-collapsed');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const i = document.getElementById('campaignRankInput'); if (i) i.focus({ preventScroll: true }); }, 500);
}
window.openRankPanel = openRankPanel;
function rankPanelHtml(data) {
    const cr = data.campaign_rank;
    const groups = {};
    arsenalList(data).forEach(wp => { (groups[wp.cat] = groups[wp.cat] || []).push(wp); });
    const cards = Object.entries(groups).map(([cat, list]) => `<h4 class="form-title">${escapeHtml(cat)}s</h4>` + gridOf(list.map(wp => buildItemCard({
        id: `wpn_${slugify(wp.name)}`, type: 'mission', badge: cat, badgeClass: 'rank-silver', title: wp.name,
        sub: wp.unlockRequirement || (wp.unlocked_by_default ? 'Available from the start' : ''),
        body: [wp.description, wp.audibleRange ? `Audible ${wp.audibleRange}` : '', wp.magazineSize ? `Mag ${wp.magazineSize}` : '', toArr(wp.pros).length ? `Pros: ${toArr(wp.pros).join(', ')}` : '', toArr(wp.cons).length ? `Cons: ${toArr(wp.cons).join(', ')}` : ''].filter(Boolean).join(' · '),
        ctx: 'weapon arsenal'
    }).replace("</h3>", `</h3><div class="wpn-status" data-wpn="${escapeHtml(slugify(wp.name))}"></div>`)))).join('');
    return buildFolder(`🎖️ Campaign Rank & Arsenal`, `
        <div class="rank-panel">
            <div><h4 class="form-title">Campaign rank</h4>
            <div class="harvest-form"><input id="campaignRankInput" type="number" min="1" max="${cr.max}" class="uni-search-input hunt-input" placeholder="Rank" onchange="appState.setCampaignRank(this.value)"></div>
            <div id="campaignRankMeter" class="wallet-meter"></div>
            <p id="campaignRankSource" style="font-size:0.72rem;color:#94a3b8;"></p>
            <p style="font-size:0.72rem;color:#64748b;">${escapeHtml(cr.note || '')}</p></div>
        </div>
        <p style="font-size:0.78rem;color:#cbd5e1;margin:8px 0;">Weapons unlock automatically here as you tick missions, kill challenges and propaganda missions, or as your rank goes up. Tick any weapon you already have.</p>
        ${cards}`);
}
window.appState.setCampaignRank = function(v) {
    const max = (this.gameData && this.gameData.campaign_rank && this.gameData.campaign_rank.max) || 40;
    const n = Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
    this.campaignRank = n || null; this.campaignRankSource = 'manual';
    this.applyStateToUI(); this.saveProgress();
};
function renderRankUI() {
    const data = appState.gameData || {}, cr = data.campaign_rank;
    if (!cr) return;
    const r = appState.campaignRank || 0;
    setVal('campaignRankInput', r || '');
    const meter = document.getElementById('campaignRankMeter');
    if (meter) meter.innerHTML = `Rank ${r}/${cr.max} ` + meterHtml(cr.max - r, cr.max, '').replace(/^<span class="wm-num[^>]*>.*?<\/span>/, '');
    const src = document.getElementById('campaignRankSource');
    if (src) src.textContent = appState.campaignRankSource === 'psn' ? 'Synced from your PlayStation trophy "Climbing the Ranks".' : (appState.psnStatus === 'none' ? `No PlayStation progress found for this game yet${appState.psnGamertag ? ` (${appState.psnGamertag})` : ''}. It appears after the PSN sync sees you play it.` : (r ? 'Entered by hand. Link your PSN in Settings to sync it.' : 'Type your rank or link your PSN in Settings.'));
    // Climbing the Ranks medal follows the rank
    if (cr.medal_id && appState.medals) {
        if (!appState.medals[cr.medal_id]) appState.medals[cr.medal_id] = { earned: false };
        appState.medals[cr.medal_id].earned = r >= cr.max;
        const mc = document.querySelector(`[data-id="${cr.medal_id}"]`);
        if (mc) { let el = mc.querySelector('.rank-progress'); if (!el) { el = document.createElement('div'); el.className = 'rank-progress wallet-meter'; mc.appendChild(el); } el.innerHTML = `Rank ${r}/${cr.max}`; }
    }
    // weapons: derived unlocks + manual ticks
    arsenalList(data).forEach(wp => {
        const id = `wpn_${slugify(wp.name)}`; const stt = weaponUnlockStatus(wp);
        if (stt.ok === true) { appState.missions[id] = appState.missions[id] || {}; appState.missions[id].completed = true; appState.missions[id].auto = true; }
        else if (appState.missions[id]?.auto) { appState.missions[id].completed = false; delete appState.missions[id].auto; }
        const el = document.querySelector(`.wpn-status[data-wpn="${slugify(wp.name)}"]`);
        if (el) { el.textContent = (stt.ok ? '🔓 ' : stt.ok === false ? '🔒 ' : '') + stt.text; el.className = 'wpn-status' + (stt.ok ? ' ok' : ''); }
    });
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

    const tally = document.getElementById('killTally');
    if (tally) {
        const counts = {};
        toArr(appState.harvestLog).forEach(h => { counts[h.species] = (counts[h.species] || 0) + 1; });
        const list = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        tally.innerHTML = list.length ? `<div class="kt-head">Total kills: <b>${fmtNum(appState.harvestLog.length)}</b> · ${list.length} species</div><div class="kt-chips">${list.map(([sp, n]) => `<span class="game-chip">${escapeHtml(sp)} × ${n}</span>`).join('')}</div>` : '';
    }
    renderTrophyRoom();
    renderLocker();
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
                <div style="font-size:0.8rem;color:#e2e8f0;">+${fmtNum(h.credits)} credits · +${fmtNum(h.xp)} XP ${h.weapon ? `· ${escapeHtml(h.weapon)}${h.ammo ? ` / ${escapeHtml(h.ammo)}` : ''}${toArr(h.attachments).length ? ` (${toArr(h.attachments).map(escapeHtml).join(', ')})` : ''}` : ''} ${h.hitOrgan ? `· ${escapeHtml(h.hitOrgan)}` : ''} ${h.shotDistance ? `· ${escapeHtml(String(h.shotDistance))} yd` : ''} ${h.notes ? `· ${escapeHtml(h.notes)}` : ''}</div>
                <div style="font-size:0.7rem;color:#64748b;">${h.gameDay ? `Game day ${escapeHtml(String(h.gameDay))} ${escapeHtml(h.gameTime || '')} · ` : ''}${escapeHtml(h.date || '')}</div></div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                <button type="button" class="uni-search-btn" onclick="appState.toggleTaxidermy('${escapeHtml(h.id)}')" title="${h.taxidermy ? 'Remove from Trophy Room' : 'Add to Trophy Room'}">${h.taxidermy ? 'Unmount' : '🏆 Mount'}</button>
                <button type="button" class="uni-search-btn" onclick="appState.deleteHarvest('${escapeHtml(h.id)}')" title="Remove and take the credits/XP back off">Remove</button></div>
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
        hitOrgan: f.get('hitOrgan') || '', shotDistance: f.get('shotDistance') || '',
        loadout: (() => { const k = f.get('loadout'); const su = setupById(k === 'primary' || k === 'secondary' ? appState.carry[k] : k); return su ? `${k === 'primary' ? 'Primary: ' : k === 'secondary' ? 'Secondary: ' : ''}${su.name}` : ''; })(),
        attachments: (() => { const k = f.get('loadout'); const su = setupById(k === 'primary' || k === 'secondary' ? appState.carry[k] : k); return su ? toArr(su.attachments).map(invItem).filter(Boolean).map(x => x.name) : []; })(),
        weapon: (invItem(f.get('weapon')) || {}).name || '', ammo: (invItem(f.get('ammo')) || {}).name || '',
        gameDay: this.wallet.gameDay, gameTime: this.wallet.gameTime, date: new Date().toLocaleString()
    };
    const file = f.get('photo');
    if (h.taxidermy && file && file.size) await uploadTrophyPhoto(h, file);
    this.harvestLog.push(h);
    this.wallet.credits = (this.wallet.credits || 0) + h.credits;
    this.wallet.xp = (this.wallet.xp || 0) + h.xp;
    this.applyLevelUps();
    form.reset();
    const pf = form.querySelector('.harvest-photo-field'); if (pf) pf.hidden = true;
    delete form.dataset.touched; if (this.carry.primary) applyLoadoutToHarvest(form, 'primary');
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
async function uploadTrophyPhoto(h, file) {
    const ref = photoDocRef(h.id);
    if (!ref) { appState.updateStatus('Sign in to save trophy photos (they are stored with your account).'); return false; }
    try {
        const data = await compressImage(file);
        await ref.set({ data, species: h.species, harvestId: h.id, createdAt: new Date().toISOString() });
        h.photoId = h.id; trophyPhotoCache[h.id] = data;
        return true;
    } catch (e) { console.warn('[Trophy photo]', e); appState.updateStatus(`Photo not saved: ${e.message}`); return false; }
}
window.appState.toggleTaxidermy = function(id) {
    const h = this.harvestLog.find(x => x.id === id); if (!h) return;
    h.taxidermy = !h.taxidermy;
    if (!h.taxidermy && h.photoId) { const ref = photoDocRef(h.photoId); if (ref) ref.delete().catch(() => {}); delete trophyPhotoCache[h.photoId]; delete h.photoId; }
    this.applyStateToUI(); this.saveProgress();
};
window.appState.setTrophyPhoto = async function(id, input) {
    const h = this.harvestLog.find(x => x.id === id); const file = input.files && input.files[0];
    if (!h || !h.taxidermy || !file) return;
    this.updateStatus('Uploading trophy photo...');
    if (await uploadTrophyPhoto(h, file)) { this.updateStatus('Trophy photo saved.'); this.saveProgress(); }
    this.applyStateToUI();
    if (document.getElementById('trophyModal')) openTrophy(id);
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
    ${buildFolder('📒 Harvest Log & Kill Tally', two(`
        <form id="harvestForm" class="harvest-form" onsubmit="event.preventDefault(); appState.addHarvest(this);">
            <select name="loadout" ${inp} onchange="this.form.dataset.touched='1'; applyLoadoutToHarvest(this.form, this.value)"></select>
            <select name="weapon" ${inp} onchange="this.form.dataset.touched='1'; fillAmmoSelect(this.form.ammo, this.value)"></select>
            <select name="ammo" ${inp} onchange="this.form.dataset.touched='1'"></select>
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
            <select name="hitOrgan" ${inp}><option value="">Shot placement</option><option>Heart</option><option>Lungs</option><option>Heart & lungs</option><option>Liver</option><option>Neck / spine</option><option>Head</option><option>Other</option></select>
            <input name="shotDistance" type="number" min="0" placeholder="Shot distance (yd)" ${inp}>
            <input name="notes" placeholder="Notes" ${inp}>
            <label class="hunt-check"><input type="checkbox" name="taxidermy" onchange="this.form.querySelector('.harvest-photo-field').hidden = !this.checked"> 🏆 Taxidermy (adds to Trophy Room)</label>
            <label class="hunt-file harvest-photo-field" hidden>📷 Trophy photo <input type="file" name="photo" accept="image/*"></label>
            <button type="submit" class="uni-search-btn">Save harvest</button>
        </form>`, '<div id="killTally" class="kill-tally"></div><div id="harvestLogList" class="hunt-card-list"></div>'))}
    ${buildFolder('🏆 Trophy Room (Taxidermy)', '<div id="trophySlideshow"></div><div id="trophyGrid" class="trophy-room-grid"></div>')}
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
    html += lockerPanelHtml(data);

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
        window.__gamesCatalog = gamesCatalog;

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

// Live game data: when GitHub syncs a new version of /games/{key}, re-render
// in place (keeping your progress, open sections and scroll position).
let gameWatch = null;
function watchGameData(gameKey, loadedSync) {
    if (!rtdb) return;
    if (gameWatch) { gameWatch.ref.off('value', gameWatch.cb); gameWatch = null; }
    const ref = rtdb.ref(`/games/${gameKey}/_meta/synced_at`);
    let current = loadedSync || null;
    const cb = async (snap) => {
        const v = snap.val();
        if (!v || v === current) return;
        if (!current) { current = v; return; }
        current = v;
        if (CURRENT_GAME_KEY !== gameKey) return;
        try {
            const data = (await rtdb.ref(`/games/${gameKey}`).once('value')).val();
            if (!data) return;
            const open = new Set([...document.querySelectorAll('#section-container .category-section:not(.section-collapsed) > .category-header h2')].map(h => h.innerText));
            const y = window.scrollY;
            const keep = appState.buildPayload();
            const friends = appState.friendsProgress;
            appState.hydrateFromRawJson(data);
            renderUniversalCompanion(data);
            appState.applyPayload(keep);
            appState.friendsProgress = friends;
            document.querySelectorAll('#section-container .category-section > .category-header h2').forEach(h => { if (open.has(h.innerText)) h.closest('.category-section').classList.remove('section-collapsed'); });
            appState.applyStateToUI();
            applyPsnTrophyIcons();
            window.scrollTo(0, y);
            appState.updateStatus(`[Live update] New game data synced ${new Date(v).toLocaleTimeString()}`);
        } catch (e) { console.warn('[Live game update]', e); }
    };
    ref.on('value', cb);
    gameWatch = { ref, cb };
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
                watchGameData(gameKey, data && data._meta && data._meta.synced_at);
                applyPsnTrophyIcons();

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
                    { const av = uData.avatar_url || user.photoURL || ''; try{if(av){localStorage.setItem('ww_user_avatar',av)}else{localStorage.removeItem('ww_user_avatar')}window.dispatchEvent(new Event('ww-avatar'))}catch(e){} }

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
                try { localStorage.removeItem('ww_user_avatar'); window.dispatchEvent(new Event('ww-avatar')); } catch (e) {}
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

// ---------------------------------------------------------------------------
// Lightbox: tap any picture on the page to see it full size, with the card's
// details beside it (where it is, what to do). Arrows/swipe move through the
// pictures in the same section.
// ---------------------------------------------------------------------------
(function setupLightbox() {
    if (window.__wwLightbox) return; window.__wwLightbox = true;
    let list = [], idx = 0, box = null, touchX = null;
    const usable = (img) => img && img.naturalWidth !== 0 && (img.classList.contains('loc-photo') || img.classList.contains('mission-hero') || img.clientWidth >= 90) && !img.closest('.trophy-tile, .ts-slide, .tm-card, .user-badge, header, .squad-card, .fm-chip, #ww-drawer, #ww-bottom-nav');
    function infoFor(img) {
        const card = img.closest('.game-item-card, .trophy-card');
        const parts = [];
        if (card) {
            const badge = card.querySelector('.trophy-rank'); const h = card.querySelector('h3');
            if (badge) parts.push(`<span class="trophy-rank ${badge.className.replace('trophy-rank', '')}">${badge.innerHTML}</span>`);
            if (h) parts.push(`<h3>${escapeHtml(h.innerText)}</h3>`);
            card.querySelectorAll(':scope > div > div > div > div, :scope > div > div > div[style*="font-size:0.75rem"], .wpn-status').forEach(el => { if (el.innerText.trim()) parts.push(`<p class="lb-sub">${escapeHtml(el.innerText.trim())}</p>`); });
            card.querySelectorAll(':scope > p, :scope > div > p').forEach(el => { if (el.innerText.trim()) parts.push(`<p>${escapeHtml(el.innerText.trim())}</p>`); });
            const link = card.querySelector('a[href]');
            if (link) parts.push(`<a class="lb-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.innerText.trim() || 'Open')}</a>`);
        } else {
            const li = img.closest('li');
            const sec = img.closest('.category-section');
            const head = sec && sec.querySelector(':scope > .category-header h2');
            if (head) parts.push(`<h3>${escapeHtml(head.innerText.trim())}</h3>`);
            if (li) parts.push(`<p>${escapeHtml(li.innerText.trim())}</p>`);
            else if (img.alt) parts.push(`<p>${escapeHtml(img.alt)}</p>`);
        }
        return parts.join('') || `<p>${escapeHtml(img.alt || '')}</p>`;
    }
    function show(i) {
        if (!list.length) return;
        idx = (i + list.length) % list.length;
        const img = list[idx];
        box.querySelector('.lb-img').src = img.currentSrc || img.src;
        box.querySelector('.lb-info').innerHTML = infoFor(img) + (list.length > 1 ? `<p class="lb-count">${idx + 1} / ${list.length}</p>` : '');
        box.querySelectorAll('.lb-nav').forEach(b => { b.hidden = list.length < 2; });
    }
    function open(img) {
        const scope = img.closest('.category-section') || document.getElementById('section-container') || document.body;
        list = [...scope.querySelectorAll('img')].filter(usable);
        if (!list.includes(img)) list = [img];
        if (!box) {
            box = document.createElement('div'); box.id = 'wwLightbox'; box.className = 'lb-overlay'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
            box.innerHTML = `<div class="lb-wrap"><button type="button" class="lb-close" aria-label="Close">✕</button>
                <div class="lb-media"><button type="button" class="lb-nav lb-prev" aria-label="Previous picture">‹</button><img class="lb-img" alt=""><button type="button" class="lb-nav lb-next" aria-label="Next picture">›</button></div>
                <div class="lb-info"></div></div>`;
            box.addEventListener('click', (e) => {
                if (e.target === box || e.target.closest('.lb-close')) close();
                else if (e.target.closest('.lb-prev')) show(idx - 1);
                else if (e.target.closest('.lb-next')) show(idx + 1);
            });
            box.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
            box.addEventListener('touchend', (e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; touchX = null; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
            document.body.appendChild(box);
        }
        box.hidden = false; document.documentElement.classList.add('lb-open');
        show(list.indexOf(img));
    }
    function close() { if (box) box.hidden = true; document.documentElement.classList.remove('lb-open'); }
    document.addEventListener('click', (e) => {
        const img = e.target.closest && e.target.closest('#section-container img');
        if (!img || !usable(img)) return;
        e.preventDefault(); e.stopPropagation(); open(img);
    }, true);
    document.addEventListener('keydown', (e) => {
        if (!box || box.hidden) return;
        if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1);
    });
    const css = document.createElement('style');
    css.textContent = `#section-container .loc-photo,#section-container .mission-hero{cursor:zoom-in}
        .lb-overlay{position:fixed;inset:0;z-index:10000;background:rgba(2,6,23,.92);display:flex;align-items:center;justify-content:center;padding:12px}
        .lb-overlay[hidden]{display:none}
        html.lb-open{overflow:hidden}
        .lb-wrap{position:relative;display:flex;gap:16px;width:min(1400px,100%);max-height:100%;align-items:stretch}
        .lb-media{position:relative;flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-width:0}
        .lb-img{max-width:100%;max-height:calc(100vh - 40px);object-fit:contain;border-radius:10px;background:#000}
        .lb-info{flex:0 0 340px;max-height:calc(100vh - 40px);overflow:auto;background:#131d31;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;color:#e2e8f0;font-size:.9rem;line-height:1.5}
        .lb-info h3{color:#fff;font-size:1.1rem;margin:6px 0}
        .lb-info p{margin:6px 0}.lb-sub{color:#94a3b8;font-size:.82rem}.lb-count{color:#64748b;font-size:.75rem}
        .lb-link{display:inline-block;margin-top:8px;color:var(--user-theme-accent,#ff5500);font-weight:800;text-decoration:none}
        .lb-close{position:absolute;top:-4px;right:-4px;z-index:3;width:38px;height:38px;border-radius:50%;border:none;background:#0f172a;color:#fff;font-size:1.1rem;cursor:pointer}
        .lb-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:44px;height:44px;border-radius:50%;border:none;background:rgba(15,23,42,.75);color:#fff;font-size:1.6rem;cursor:pointer}
        .lb-prev{left:8px}.lb-next{right:8px}
        @media (max-width:900px){.lb-wrap{flex-direction:column}.lb-info{flex:0 0 auto;max-height:38vh}.lb-img{max-height:55vh}.lb-close{top:4px;right:4px}}`;
    document.head.appendChild(css);
})();
