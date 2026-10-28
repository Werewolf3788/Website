// ============================================================================
// * Project: Universal Multi-Game Resistance Companion & Field Ledger
// * File: game.js
// * Location: /game/game.js
// * Build Version: v11.0.0-TRULY-UNIVERSAL-ENGINE
// * Change Log (v11.0.0):
// *   - UNIVERSAL SCHEMA ENGINE: Completely eliminated hardcoded FC5 keys/regions.
// *   - DYNAMIC CATEGORIES: Automatically parses ANY array or nested object in JSON.
// *   - UNIVERSAL HYDRATION: Any custom checklist item auto-binds to Firestore & LocalStorage.
// *   - DYNAMIC CARD DETAILS: Automatically renders rewards, images, notes, locations, and ammo.
// *   - ZERO-404 MANIFEST ROUTER: Dynamic path detection for index.json & game JSONs with cache-busting.
// *   - RETAIN: PSN live progress link, friends squad avatars, and 51-key Firebase contracts.
// * Deployment Timestamp: 2026-10-27 20:47:00 EDT (America/New_York)
// ============================================================================

// Section 1: Authoritative Firebase Credentials & Services
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

window.squadProgressCache = {};

// Section 2: Universal Global State Engine
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps',
    currentUser: null,
    gameData: null,
    psnSkeleton: null,
    myFriendCode: null,
    myPsnGamertag: null,
    myPsnAccountId: null,
    psnLinks: [],
    psnLive: null,
    isCloudLoaded: false,
    
    activeGame: "Universal Game",
    activeGameId: "game_default",
    activePsnCommId: null,
    activeMission: "Companion & Field Ledger",

    trophies_earned: 0,
    trophies_total: 0,
    trophies_percent: 0,
    
    // Core built-in state nodes
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    
    // Universal dynamic state store for ANY custom category in your JSON
    custom: {},
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
        await this.refreshPsnProgress();
        if (this.currentUser) {
            await this.syncFriendsProgress();
        }
    },

    // Truly universal hydration: parses whatever exists in the JSON file
    hydrateDefaultSchema: function() {
        if (!this.gameData) return;

        this.psnLinks = buildPsnLinks(this.gameData);
        if (!this.custom) this.custom = {};

        const data = this.gameData;
        const systemKeys = new Set(['game', 'gameId', 'commId', 'psn_communication_id', 'activeMission', 'version', 'ranks']);

        Object.entries(data).forEach(([catKey, catValue]) => {
            if (systemKeys.has(catKey) || !catValue) return;

            // 1. Array of items (e.g., walkthrough_missions, guns_and_fangs_for_hire, outposts, weapons)
            if (Array.isArray(catValue)) {
                if (!this.custom[catKey]) this.custom[catKey] = {};
                catValue.forEach((item, idx) => {
                    const itemId = item.id !== undefined ? String(item.id) : `${catKey}_${idx}`;
                    if (!this.custom[catKey][itemId]) {
                        this.custom[catKey][itemId] = {
                            completed: false,
                            name: item.name || item.mission_name || item.title || `Item ${idx + 1}`,
                            psnSynced: false
                        };
                    }
                });
            }
            // 2. Nested dictionary of regions/groups (e.g., prepper_stashes, collectibles, magazines)
            else if (typeof catValue === 'object') {
                if (catKey === 'collectibles') {
                    for (const cKey in catValue) {
                        const group = catValue[cKey];
                        const itemsList = (group && Array.isArray(group.items)) ? group.items : [];
                        if (!this.collectibles[cKey]) {
                            this.collectibles[cKey] = {
                                collected: false,
                                count: 0,
                                psnSynced: false,
                                total: itemsList.length,
                                quest_name: group.quest_name || cKey,
                                items: {}
                            };
                        }
                        itemsList.forEach((cItem, idx) => {
                            const cId = cItem.id !== undefined ? String(cItem.id) : `col_${cKey}_${idx}`;
                            if (!this.collectibles[cKey].items[cId]) {
                                this.collectibles[cKey].items[cId] = {
                                    collected: false,
                                    name: cItem.name || '',
                                    region: cItem.region || group.region || '',
                                    location: cItem.location || '',
                                    target: resolveItemTarget(cItem),
                                    count: 0,
                                    psnSynced: false
                                };
                            }
                        });
                    }
                } else {
                    // Universal sub-group processor (handles prepper_stashes or any arbitrary nested region objects)
                    if (!this.custom[catKey]) this.custom[catKey] = {};
                    Object.entries(catValue).forEach(([subGroup, subItems]) => {
                        if (Array.isArray(subItems)) {
                            subItems.forEach((item, idx) => {
                                const itemId = item.id !== undefined ? String(item.id) : `${subGroup}_${idx}`;
                                if (!this.custom[catKey][itemId]) {
                                    this.custom[catKey][itemId] = {
                                        completed: false,
                                        name: item.name || item.title || `Item ${idx + 1}`,
                                        group: subGroup,
                                        psnSynced: false
                                    };
                                }
                            });
                        }
                    });
                }
            }
        });

        // Trophies / Achievements
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

        this.ensureCounterTargets();
        this.recalculateMetrics();
    },

    recalculateMetrics: function() {
        let totalItemsCompleted = 0;
        let totalItemsOverall = 0;

        // Custom universal categories
        if (this.custom) {
            Object.values(this.custom).forEach(catGroup => {
                if (catGroup && typeof catGroup === 'object') {
                    Object.values(catGroup).forEach(item => {
                        totalItemsOverall++;
                        if (item && item.completed) totalItemsCompleted++;
                    });
                }
            });
        }

        // Collectibles
        let colCount = 0;
        if (this.collectibles) {
            for (const cKey in this.collectibles) {
                const group = this.collectibles[cKey];
                if (group && group.items) {
                    let gDone = 0;
                    Object.values(group.items).forEach(item => {
                        totalItemsOverall++;
                        if (item && item.collected) {
                            gDone++;
                            colCount++;
                            totalItemsCompleted++;
                        }
                    });
                    group.count = gDone;
                    group.collected = (group.total > 0 && gDone >= group.total);
                }
            }
        }

        const earnedTrophies = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophies = Object.keys(this.trophies).length || 0;
        this.trophies_earned = earnedTrophies;
        this.trophies_total = totalTrophies;
        this.trophies_percent = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

        if (!this.ranks) this.ranks = {};
        this.ranks.collectibles = colCount;
        this.updateRankDisplay('collectibles', colCount);
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
            custom: this.custom,
            trophies: this.trophies
        };
    },

    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        this.activeMission = payload.activeMission || this.activeMission;
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
                        this.collectibles[cKey].items = Object.assign({}, this.collectibles[cKey].items, payload.collectibles[cKey].items);
                    }
                }
            }
        }
        if (payload.custom) this.custom = Object.assign({}, this.custom, payload.custom);
        if (payload.stashes) this.stashes = Object.assign({}, this.stashes, payload.stashes);
        if (payload.roster) this.roster = Object.assign({}, this.roster, payload.roster);
        if (payload.missions) this.missions = Object.assign({}, this.missions, payload.missions);
        if (payload.trophies) this.trophies = Object.assign({}, this.trophies, payload.trophies);
        if (payload.ranks) this.ranks = Object.assign({}, this.ranks, payload.ranks);

        this.applyStateToUI();
    }
};

// Section 3: Friend-Code-Keyed Firestore Persistence
window.appState.saveProgress = function() {
    const friendCode = this.myFriendCode;

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

    if (!this.isCloudLoaded) {
        console.warn("[Write Protected] Save blocked: Waiting for Firestore ledger fetch.");
        return;
    }

    const payload = this.buildPayload();
    if (firestore) {
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

    if (firestore) {
        this.updateStatus(`Reading cloud ledger for ${this.platform.toUpperCase()}...`);

        try {
            let doc = await firestore
                .collection("users")
                .doc(friendCode)
                .collection("platform")
                .doc(this.platform)
                .collection("progress")
                .doc(this.activeGameId)
                .get();

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
        (guestData.ranks && Object.values(guestData.ranks).some(v => v > 0)) ||
        Object.keys(guestData.custom || {}).length > 0 ||
        Object.keys(guestData.collectibles || {}).length > 0
    )) {
        this.updateStatus("Importing guest checks to your Cloud Ledger...");
        this.applyPayload(guestData);
        this.saveProgress();

        localStorage.removeItem(guestKey);
        this.updateStatus("Guest checks successfully synced to your cloud account.");
    }
};

// Section 4: Universal UI Painting & Multi-User Co-Op Card Badging
window.appState.applyStateToUI = function() {
    this.ensureCounterTargets();
    this.recalculateMetrics();

    const squadEntries = Object.values(window.squadProgressCache || {});
    const psnAuto = this.hasPsnAuto();

    document.querySelectorAll('.fc5-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'generic';
        const group = card.getAttribute('data-group') || null;
        const ref = this.getItemRef(type, id, group);
        let isDone = false;

        if (type === 'trophy') {
            isDone = !!(this.trophies[id]?.earned);
        } else if (type === 'collectible') {
            if (group && this.collectibles[group]?.items?.[id]) {
                isDone = !!(this.collectibles[group].items[id].collected);
            }
        } else if (type.startsWith('custom_')) {
            const catKey = type.replace('custom_', '');
            isDone = !!(this.custom[catKey]?.[id]?.completed);
        } else {
            isDone = !!(ref && (ref.completed || ref.collected || ref.unlocked || ref.earned));
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

        const locked = psnAuto && !!(ref && ref.psnSynced);
        if (btn) {
            btn.style.boxShadow = locked ? '0 0 0 2px #3b82f6' : '';
            btn.title = locked ? 'Verified by PlayStation Network' : '';
        }

        if (card.getAttribute('data-target')) updateCounterCard(card, ref, locked);

        let squadTagContainer = card.querySelector('.squad-earners-bar');
        if (!squadTagContainer) {
            squadTagContainer = document.createElement('div');
            squadTagContainer.className = 'squad-earners-bar';
            card.appendChild(squadTagContainer);
        }

        const earners = squadEntries.filter(entry => friendHasEarnedItem(entry.data, id, type, group));

        squadTagContainer.innerHTML = '';
        if (earners.length > 0) {
            squadTagContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;';
            earners.forEach(entry => squadTagContainer.appendChild(buildAvatarBadge(entry)));
        } else {
            squadTagContainer.style.cssText = 'display:none;';
        }
    });

    updateSectionProgress();
};

window.appState.toggleItem = function(itemId, type, group) {
    const ref = this.getItemRef(type, itemId, group);
    const wasDone = !!(ref && (ref.completed || ref.collected || ref.unlocked || ref.earned));
    const isCounter = !!(ref && Number(ref.target) > 0);

    if (this.isPsnLocked(ref) && (wasDone || isCounter)) {
        this.updateStatus('Verified by PlayStation Network. This updates automatically.');
        return;
    }

    if (type === 'collectible' && isCounter) {
        ref.count = wasDone ? 0 : Number(ref.target);
        ref.collected = !wasDone;
        this.applyStateToUI();
        this.saveProgress();
        return;
    }

    if (type === 'trophy') {
        if (!this.trophies[itemId]) this.trophies[itemId] = { earned: false, psnSynced: false };
        this.trophies[itemId].earned = !this.trophies[itemId].earned;
    } else if (type === 'collectible') {
        if (group && this.collectibles[group]?.items?.[itemId]) {
            this.collectibles[group].items[itemId].collected = !this.collectibles[group].items[itemId].collected;
        }
    } else if (type.startsWith('custom_')) {
        const catKey = type.replace('custom_', '');
        if (!this.custom[catKey]) this.custom[catKey] = {};
        if (!this.custom[catKey][itemId]) this.custom[catKey][itemId] = { completed: false, psnSynced: false };
        this.custom[catKey][itemId].completed = !this.custom[catKey][itemId].completed;
    } else if (ref) {
        if (ref.completed !== undefined) ref.completed = !ref.completed;
        else if (ref.collected !== undefined) ref.collected = !ref.collected;
        else if (ref.unlocked !== undefined) ref.unlocked = !ref.unlocked;
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

// Section 4C: Universal PSN Links, Counters & Section Progress
function resolveItemTarget(item, trophyIdOverride) {
    if (!item || typeof item !== 'object') return 0;
    const explicit = Number(item.target ?? item.count_target ?? item.psn_target ?? 0);
    if (explicit > 0) return explicit;
    if (item.counter === true) {
        const tid = trophyIdOverride ?? item.psn_trophy_id ?? item.trophy_id ?? item.psnTrophyId;
        const trophies = (appState.psnSkeleton && appState.psnSkeleton.trophies) ? Object.values(appState.psnSkeleton.trophies) : [];
        const match = trophies.find(t => t && String(t.trophyId) === String(tid));
        const fromSkeleton = Number(match && (match.targetValue ?? match.trophyProgressTargetValue) || 0);
        if (fromSkeleton > 0) return fromSkeleton;
    }
    return 0;
}

function buildPsnLinks(data) {
    const links = [];
    if (!data || typeof data !== 'object') return links;

    const read = (item, type, id, group) => {
        if (!item || typeof item !== 'object') return;
        const tid = item.psn_trophy_id ?? item.trophy_id ?? item.psnTrophyId;
        if (tid === undefined || tid === null || tid === '') return;
        links.push({ type: type, id: String(id), group: group || null, trophyId: String(tid), target: resolveItemTarget(item, tid) });
    };

    Object.entries(data).forEach(([catKey, catValue]) => {
        if (Array.isArray(catValue)) {
            catValue.forEach((it, idx) => read(it, `custom_${catKey}`, it.id !== undefined ? it.id : `${catKey}_${idx}`));
        } else if (catValue && typeof catValue === 'object') {
            if (catKey === 'collectibles') {
                for (const cKey in catValue) {
                    const group = catValue[cKey];
                    if (group && Array.isArray(group.items)) group.items.forEach(it => read(it, 'collectible', it.id, cKey));
                }
            } else {
                Object.entries(catValue).forEach(([subGroup, subItems]) => {
                    if (Array.isArray(subItems)) {
                        subItems.forEach((it, idx) => read(it, `custom_${catKey}`, it.id !== undefined ? it.id : `${subGroup}_${idx}`, subGroup));
                    }
                });
            }
        }
    });

    return links;
}

function normalizeLiveTrophy(tObj) {
    const earned = !!(tObj && (tObj.earned === true || tObj.isEarned === true));
    const target = Number(tObj && (tObj.targetValue ?? tObj.trophyProgressTargetValue) || 0) || 0;
    let current = Number(tObj && (tObj.currentValue ?? tObj.trophyProgress ?? 0) || 0) || 0;
    if (earned && target > 0) current = target;
    return {
        earned: earned,
        current: current,
        target: target,
        name: (tObj && (tObj.name || tObj.trophyName)) || 'Trophy',
        rank: String((tObj && (tObj.type || tObj.trophyType)) || 'Bronze').toUpperCase()
    };
}

function ledgerItem(ledger, link) {
    const ensure = (obj, key, fallback) => { if (!obj[key] || typeof obj[key] !== 'object') obj[key] = fallback; return obj[key]; };
    if (link.type === 'collectible') {
        const cols = ensure(ledger, 'collectibles', {});
        const g = ensure(cols, link.group, { items: {} });
        const items = ensure(g, 'items', {});
        return ensure(items, link.id, { collected: false });
    }
    if (link.type.startsWith('custom_')) {
        const catKey = link.type.replace('custom_', '');
        const customRoot = ensure(ledger, 'custom', {});
        const catGroup = ensure(customRoot, catKey, {});
        return ensure(catGroup, link.id, { completed: false });
    }
    return ensure(ensure(ledger, 'missions', {}), link.id, { completed: false });
}

function setLedgerItemDone(item, type, done) {
    if (type === 'collectible') item.collected = done;
    else item.completed = done;
}

function applyPsnLive(ledger, live, gameId, links) {
    if (!ledger || !live || typeof live !== 'object') return false;
    let modified = false;
    if (!ledger.trophies || typeof ledger.trophies !== 'object') ledger.trophies = {};

    Object.entries(live).forEach(([tId, raw]) => {
        const t = normalizeLiveTrophy(raw);
        if (!t.earned) return;
        const key = `trophy_${gameId}_${tId}`;
        const existing = ledger.trophies[key];
        if (!existing || !existing.earned || !existing.psnSynced) {
            ledger.trophies[key] = Object.assign({}, existing || {}, { earned: true, name: (existing && existing.name) || t.name, rank: (existing && existing.rank) || t.rank, psnSynced: true });
            modified = true;
        }
    });

    (links || []).forEach(link => {
        const raw = live[link.trophyId];
        if (!raw) return;
        const t = normalizeLiveTrophy(raw);
        const item = ledgerItem(ledger, link);

        if (link.target > 0) {
            const value = Math.max(0, Math.min(link.target, t.earned ? link.target : t.current));
            const done = value >= link.target;
            if (item.count !== value || item.collected !== done || item.psnSynced !== true || item.target !== link.target) {
                item.count = value;
                item.target = link.target;
                setLedgerItemDone(item, link.type, done);
                item.psnSynced = true;
                modified = true;
            }
        } else if (t.earned) {
            const isDone = item.completed || item.collected;
            if (!isDone || item.psnSynced !== true) {
                setLedgerItemDone(item, link.type, true);
                item.psnSynced = true;
                modified = true;
            }
        }
    });

    return modified;
}

window.appState.hasPsnAuto = function() {
    return this.platform === 'ps' && !!(this.myPsnGamertag || this.myPsnAccountId);
};

window.appState.getItemRef = function(type, id, group) {
    if (type === 'trophy') return this.trophies[id];
    if (type === 'collectible') return group ? this.collectibles[group]?.items?.[id] : undefined;
    if (type.startsWith('custom_')) {
        const catKey = type.replace('custom_', '');
        return this.custom?.[catKey]?.[id];
    }
    if (type === 'stash') return this.stashes[id] || this.custom?.prepper_stashes?.[id];
    if (type === 'roster') return this.roster[id] || this.custom?.guns_and_fangs_for_hire?.[id];
    return this.missions[id] || this.custom?.walkthrough_missions?.[id];
};

window.appState.isPsnLocked = function(ref) {
    return this.hasPsnAuto() && !!ref && ref.psnSynced === true;
};

window.appState.ensureCounterTargets = function() {
    if (!this.gameData) return;
    const processItems = (items, catKey) => {
        items.forEach(cItem => {
            const target = resolveItemTarget(cItem);
            if (target <= 0) return;
            if (!this.collectibles[catKey]) this.collectibles[catKey] = { collected: false, count: 0, psnSynced: false, total: items.length, items: {} };
            if (!this.collectibles[catKey].items) this.collectibles[catKey].items = {};
            if (!this.collectibles[catKey].items[cItem.id]) this.collectibles[catKey].items[cItem.id] = { collected: false, name: cItem.name || '', psnSynced: false };
            const ref = this.collectibles[catKey].items[cItem.id];
            ref.target = target;
            if (typeof ref.count !== 'number') ref.count = 0;
        });
    };

    if (this.gameData.collectibles) {
        for (const cKey in this.gameData.collectibles) {
            const grp = this.gameData.collectibles[cKey];
            if (grp && Array.isArray(grp.items)) processItems(grp.items, cKey);
        }
    }
};

window.appState.setCounter = function(group, itemId, value) {
    const ref = this.collectibles[group]?.items?.[itemId];
    if (!ref) return;
    if (this.isPsnLocked(ref)) {
        this.updateStatus('Synced from PlayStation. This count updates automatically.');
        this.applyStateToUI();
        return;
    }
    const target = Number(ref.target) || 0;
    let v = Math.floor(Number(value) || 0);
    v = Math.max(0, target > 0 ? Math.min(target, v) : v);
    ref.count = v;
    ref.collected = target > 0 ? v >= target : v > 0;
    this.applyStateToUI();
    this.saveProgress();
};

window.appState.adjCounter = function(group, itemId, delta) {
    const ref = this.collectibles[group]?.items?.[itemId];
    if (!ref) return;
    this.setCounter(group, itemId, (Number(ref.count) || 0) + delta);
};

window.appState.refreshPsnProgress = async function() {
    if (!this.hasPsnAuto() || !this.activePsnCommId) return false;
    const psnKey = await resolvePsnKey(this.myPsnGamertag, this.myPsnAccountId);
    const live = await fetchPsnLiveFor(psnKey);
    if (!live) return false;

    this.psnLive = live;
    const modified = applyPsnLive(this, live, this.activeGameId, this.psnLinks);
    if (modified) {
        this.applyStateToUI();
        if (this.isCloudLoaded) this.saveProgress();
    }
    return modified;
};

function updateCounterCard(card, ref, locked) {
    const target = Number(card.getAttribute('data-target')) || 0;
    const count = Math.max(0, Math.min(target, Number(ref && ref.count) || 0));
    const input = card.querySelector('.counter-input');
    const fill = card.querySelector('.counter-fill');
    const label = card.querySelector('.counter-label');

    if (input) {
        if (typeof document.activeElement === 'undefined' || document.activeElement !== input) input.value = count;
        input.disabled = !!locked;
    }
    if (fill) fill.style.width = `${target > 0 ? Math.round((count / target) * 100) : 0}%`;
    if (label) label.textContent = locked ? 'Synced from PlayStation' : '';
    card.querySelectorAll('.counter-btn').forEach(b => { b.disabled = !!locked; });
}

function updateSectionProgress() {
    document.querySelectorAll('.category-section').forEach(sec => {
        const chip = sec.querySelector('.section-progress');
        if (!chip) return;
        const cards = Array.from(sec.querySelectorAll('.fc5-item-card'));
        const total = cards.length;
        const done = cards.filter(c => c.classList.contains('completed')).length;
        const complete = total > 0 && done >= total;
        chip.textContent = `${done} / ${total}`;
        chip.style.color = complete ? '#34d399' : '#fff';
        chip.style.borderColor = complete ? '#34d399' : 'var(--user-theme-accent)';
        chip.style.background = complete ? 'rgba(52,211,153,0.15)' : 'rgba(255,85,0,0.18)';
    });
}

function progressChip(total) {
    return `<span class="section-progress" style="margin-left:10px; font-size:0.8rem; font-weight:800; padding:2px 10px; border-radius:12px; border:1px solid var(--user-theme-accent); background:rgba(255,85,0,0.18); color:#fff; white-space:nowrap; vertical-align:middle;">0 / ${total}</span>`;
}

function counterControlsHtml(group, id, target) {
    const btnStyle = 'width:30px; height:30px; border-radius:6px; border:1px solid rgba(255,255,255,0.2); background:#1e293b; color:#fff; font-weight:900; cursor:pointer;';
    return `
        <div style="display:flex; align-items:center; gap:8px; margin:6px 0;">
            <button type="button" class="counter-btn" style="${btnStyle}" onclick="appState.adjCounter('${group}', '${id}', -1)" aria-label="Decrease">−</button>
            <input type="number" class="counter-input" min="0" max="${target}" value="0" style="width:84px; height:30px; text-align:center; border-radius:6px; border:1px solid rgba(255,255,255,0.2); background:#0f172a; color:#fff; font-weight:800;" onchange="appState.setCounter('${group}', '${id}', this.value)">
            <span style="color:#94a3b8; font-size:0.85rem; font-weight:700;">/ ${target}</span>
            <button type="button" class="counter-btn" style="${btnStyle}" onclick="appState.adjCounter('${group}', '${id}', 1)" aria-label="Increase">+</button>
            <span class="counter-label" style="margin-left:auto; font-size:0.7rem; font-weight:800; color:#60a5fa;"></span>
        </div>
        <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:6px;">
            <div class="counter-fill" style="height:100%; width:0%; background:var(--user-theme-accent);"></div>
        </div>`;
}

function friendHasEarnedItem(sData, id, type, group) {
    if (!sData || typeof sData !== 'object') return false;
    if (type === 'trophy') return !!(sData.trophies?.[id]?.earned);
    if (type === 'collectible') return !!(group && sData.collectibles?.[group]?.items?.[id]?.collected);
    if (type.startsWith('custom_')) {
        const catKey = type.replace('custom_', '');
        return !!(sData.custom?.[catKey]?.[id]?.completed);
    }
    return !!(sData[type]?.[id]?.completed || sData[type]?.[id]?.collected || sData[type]?.[id]?.unlocked);
}

function buildAvatarBadge(entry) {
    const name = (entry && entry.username) ? String(entry.username) : 'Squad Member';
    const wrap = document.createElement('span');
    wrap.className = 'squad-avatar-badge';
    wrap.title = `${name} has this`;
    wrap.style.cssText = 'width:26px; height:26px; border-radius:50%; border:2px solid var(--user-theme-accent); overflow:hidden; display:inline-flex; align-items:center; justify-content:center; background:#1e293b; color:#fff; font-size:0.7rem; font-weight:800; flex:0 0 auto;';

    const initial = name.trim().charAt(0).toUpperCase() || '?';
    const avatarUrl = toSecureUrl(entry && entry.avatar ? entry.avatar : '');

    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = name;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
        img.onerror = function() {
            img.remove();
            wrap.textContent = initial;
        };
        wrap.appendChild(img);
    } else {
        wrap.textContent = initial;
    }
    return wrap;
}

// Section 5: Universal Profile & Squad Bridge via Friend Codes
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

function normalizePlatformKey(raw) {
    const p = String(raw || '').toLowerCase().trim();
    if (!p) return null;
    if (p === 'ps' || p === 'psn' || p === 'ps4' || p === 'ps5' || p.includes('playstation') || p.includes('sony')) return 'ps';
    if (p.includes('xbox')) return 'xbox';
    if (p.includes('steam')) return 'steam';
    if (p === 'pc' || p.includes('windows')) return 'pc';
    return null;
}

const PLATFORM_LABELS = { ps: 'PLAYSTATION', xbox: 'XBOX', pc: 'PC', steam: 'STEAM' };

function buildPlatformCandidates(friendPrimaryPlatform, viewerPlatform) {
    const list = [normalizePlatformKey(friendPrimaryPlatform), viewerPlatform, 'ps', 'pc', 'xbox', 'steam'].filter(Boolean);
    return Array.from(new Set(list));
}

async function fetchFriendProgressDoc(friendCode, platforms) {
    for (const plat of platforms) {
        const doc = await firestore
            .collection("users")
            .doc(friendCode)
            .collection("platform")
            .doc(plat)
            .collection("progress")
            .doc(appState.activeGameId)
            .get();
        if (doc.exists) return { data: doc.data() || {}, platform: plat };
    }
    return null;
}

window.psnIndexCache = null;
async function getPsnGamertagIndex() {
    const cached = window.psnIndexCache;
    if (cached && (Date.now() - cached.at) < 5 * 60 * 1000) return cached.map;
    const snap = await rtdb.ref('/psn/usersByGamerTag').once('value');
    const map = snap.val() || {};
    window.psnIndexCache = { at: Date.now(), map: map };
    return map;
}

async function resolvePsnKey(tag, accountId) {
    if (!rtdb) return tag || null;
    try {
        const map = await getPsnGamertagIndex();
        const keys = Object.keys(map);
        if (tag && map[tag] !== undefined) return tag;
        const lower = String(tag || '').toLowerCase();
        const byName = lower ? keys.find(k => k.toLowerCase() === lower) : null;
        if (byName) return byName;
        if (accountId) {
            const byId = keys.find(k => String(map[k]) === String(accountId));
            if (byId) return byId;
        }
    } catch (e) {
        console.warn("[PSN Index Lookup Error]:", e);
    }
    return tag || null;
}

async function fetchPsnLiveFor(psnKey) {
    if (!rtdb || !psnKey || !appState.activePsnCommId) return null;
    try {
        const snap = await rtdb.ref(`/psn/gamertags/${psnKey}/liveTrophyProgress/${appState.activePsnCommId}`).once('value');
        const live = snap.val();
        if (!live || typeof live !== 'object') return null;

        const out = {};
        Object.entries(live).forEach(([tId, tObj]) => {
            if (tObj && typeof tObj === 'object') out[String(tId)] = tObj;
        });
        return Object.keys(out).length ? out : null;
    } catch (e) {
        console.warn(`[PSN Live Trophy Error for ${psnKey}]:`, e);
        return null;
    }
}

async function fetchPsnAvatarFor(psnKey) {
    if (!rtdb || !psnKey) return '';
    try {
        const snap = await rtdb.ref(`/psn/gamertags/${psnKey}/avatar`).once('value');
        const val = snap.val();
        return (typeof val === 'string') ? val : '';
    } catch (e) {
        return '';
    }
}

function buildFriendLedger(friendData, psnLive) {
    const ledger = Object.assign({}, friendData || {});
    if (!ledger.trophies || typeof ledger.trophies !== 'object') ledger.trophies = {};

    if (psnLive) {
        applyPsnLive(ledger, psnLive, appState.activeGameId, appState.psnLinks);
    }

    const total = Object.keys(appState.trophies).length || appState.trophies_total || 51;
    const earned = Object.values(ledger.trophies).filter(t => t && t.earned).length;
    ledger.trophies_earned = Math.max(earned, Number(ledger.trophies_earned) || 0);
    ledger.trophies_percent = Math.max(total > 0 ? Math.round((earned / total) * 100) : 0, Number(ledger.trophies_percent) || 0);

    return ledger;
}

async function resolveFriendIdentity(fKey, fRaw) {
    const f = (fRaw && typeof fRaw === 'object') ? fRaw : {};
    const keyLooksLikeEmail = typeof fKey === 'string' && fKey.includes('_at_');
    const emailKey = f.email_key || f.emailKey || (keyLooksLikeEmail ? fKey : null);

    let profile = {};
    const missingSomething = !f.friend_code || !f.username || !(f.avatar_url || f.avatar) || !(f.psn_username || f.gamertag);
    if (emailKey && rtdb && missingSomething) {
        try {
            const snap = await rtdb.ref(`/users/${emailKey}`).once('value');
            profile = snap.val() || {};
        } catch (e) {
            profile = {};
        }
    }

    return {
        friendCode: f.friend_code || f.friendCode || profile.friend_code || (keyLooksLikeEmail ? null : fKey),
        username: f.username || profile.username || profile.display_name || profile.displayName || 'Squad Member',
        avatar: toSecureUrl(f.avatar_url || f.avatar || profile.avatar_url || profile.photoURL || profile.avatar || ''),
        psnTag: f.psn_username || f.gamertag || profile.psn_username || profile.gamertag || null,
        psnAccountId: f.psn_account_id || profile.psn_account_id || null,
        primaryPlatform: f.primary_platform || profile.primary_platform || null
    };
}

let friendsSyncInFlight = false;

window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    if (!rosterContainer) return;
    if (friendsSyncInFlight) return;

    const emailKey = this.getEmailKey();
    if (!emailKey) {
        rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
        return;
    }

    friendsSyncInFlight = true;
    try {
        const friendsSnap = await rtdb.ref(`/users/${emailKey}/friends`).once('value');
        const friendsData = friendsSnap.val();

        if (!friendsData || Object.keys(friendsData).length === 0) {
            window.squadProgressCache = {};
            rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked yet. Share your friend code to link co-op members.</div>';
            this.applyStateToUI();
            return;
        }

        const newCache = {};
        let cardsHtml = '';

        for (const [fKey, fRaw] of Object.entries(friendsData)) {
            const identity = await resolveFriendIdentity(fKey, fRaw);
            const platformCandidates = buildPlatformCandidates(identity.primaryPlatform, this.platform);

            let progress = null;
            let readError = null;
            if (firestore && identity.friendCode) {
                try {
                    progress = await fetchFriendProgressDoc(identity.friendCode, platformCandidates);
                } catch (err) {
                    readError = err;
                    console.warn(`[Squad Firestore Error for ${identity.friendCode}]:`, err);
                }
            }

            const usedPlatform = progress ? progress.platform : (platformCandidates[0] || this.platform);
            const psnKey = await resolvePsnKey(identity.psnTag, identity.psnAccountId);
            const psnLive = (psnKey && usedPlatform === 'ps') ? await fetchPsnLiveFor(psnKey) : null;
            const friendData = buildFriendLedger(progress ? progress.data : {}, psnLive);

            let avatar = identity.avatar;
            if (!avatar && psnKey) avatar = toSecureUrl(await fetchPsnAvatarFor(psnKey));

            const cacheKey = identity.friendCode || fKey;
            newCache[cacheKey] = {
                username: identity.username,
                avatar: avatar,
                platform: usedPlatform,
                data: friendData
            };

            const rpVal = friendData.ranks?.rp || 0;
            const trophyPercent = friendData.trophies_percent || 0;
            const platformLabel = PLATFORM_LABELS[usedPlatform] || String(usedPlatform).toUpperCase();

            let statusNote = '';
            if (readError) {
                statusNote = `<div style="font-size:0.7rem; color:#f87171; margin-top:2px;">Can't read this friend's saved progress (${escapeHtml(readError.code || 'error')}).</div>`;
            } else if (!progress && !psnLive) {
                statusNote = `<div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">No saved progress for this game yet.</div>`;
            }

            cardsHtml += `
                <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px; display:flex; gap:12px; align-items:center;">
                    ${avatar ? `<img src="${escapeHtml(avatar)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid var(--user-theme-accent);" onerror="this.style.display='none'">` : ''}
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(identity.username)}</div>
                            <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                                ${escapeHtml(platformLabel)}
                            </span>
                        </div>
                        <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">
                            <strong>Score/RP:</strong> ${rpVal}
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Trophy Progress: <strong style="color:#fff;">${trophyPercent}%</strong>
                        </div>
                        ${statusNote}
                    </div>
                </div>
            `;
        }

        window.squadProgressCache = newCache;
        rosterContainer.innerHTML = cardsHtml;
        this.applyStateToUI();
    } catch (e) {
        console.warn("[Friends Roster Sync Error]:", e);
    } finally {
        friendsSyncInFlight = false;
    }
};

// Section 6: Dynamic Top Navigation Bar (/utm_links)
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

// Section 7: PSN Game Skeleton Ingestion
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
    } catch (e) {
        console.warn("[PSN Skeleton Sync Error]:", e);
    }
}

// Section 8: Universal Renderer for Any Game Schema
function renderUniversalCompanion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';
    const systemKeys = new Set(['game', 'gameId', 'commId', 'psn_communication_id', 'activeMission', 'version', 'ranks', 'trophies_and_achievements']);

    // Helper: builds a card for any item
    const renderCard = (item, type, groupName = '') => {
        const itemId = item.id !== undefined ? String(item.id) : (item.name ? item.name.replace(/\s+/g, '_') : 'item');
        const counterTarget = resolveItemTarget(item);
        const name = item.name || item.mission_name || item.title || 'Objective';
        const rankLabel = item.region || item.category || item.type || groupName || 'Intel';
        const guide = item.guide || item.description || item.detail || '';
        const location = item.location || item.coords || '';
        const gear = item.required_gear || item.gear || '';
        const reward = item.reward || item.unlock_mission || '';
        const img = toSecureUrl(item.image || item.icon || '');

        return `
            <div class="trophy-card fc5-item-card" data-id="${escapeHtml(itemId)}" data-type="${escapeHtml(type)}"${groupName ? ` data-group="${escapeHtml(groupName)}"` : ''}${counterTarget > 0 ? ` data-target="${counterTarget}"` : ''}>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        ${img ? `<img src="${img}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'">` : ''}
                        <div>
                            <span class="trophy-rank rank-silver">${escapeHtml(rankLabel)}</span>
                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(name)}</h3>
                            ${location ? `<div style="font-size:0.75rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(location)}</div>` : ''}
                        </div>
                    </div>
                    <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(itemId)}', '${escapeHtml(type)}'${groupName ? `,'${escapeHtml(groupName)}'` : ''})" aria-label="Toggle Item"></button>
                </div>
                ${gear ? `<div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;"><strong>Gear Needed:</strong> ${escapeHtml(gear)}</div>` : ''}
                ${reward ? `<div style="font-size:0.75rem; color:#f5a623; margin-bottom:4px;"><strong>Reward/Unlock:</strong> ${escapeHtml(reward)}</div>` : ''}
                ${guide ? `<p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(guide)}</p>` : ''}
                ${counterTarget > 0 ? counterControlsHtml(groupName || type, itemId, counterTarget) : ''}
                <div class="squad-earners-bar"></div>
            </div>
        `;
    };

    // 1. Process all categories found in the JSON dynamically
    Object.entries(data).forEach(([catKey, catValue]) => {
        if (systemKeys.has(catKey) || !catValue) return;

        const formattedCatTitle = catKey.replace(/_/g, ' ').toUpperCase();

        // 1A. Direct Array List (walkthroughs, rosters, weapons, animals, etc.)
        if (Array.isArray(catValue) && catValue.length > 0) {
            html += `
            <section class="category-section section-collapsed" id="cat-${catKey}">
                <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                    <h2>📋 ${escapeHtml(formattedCatTitle)} ${progressChip(catValue.length)}</h2>
                    <span>▾</span>
                </div>
                <div class="section-content">
                    <div class="trophy-grid">
                        ${catValue.map(item => renderCard(item, `custom_${catKey}`, formattedCatTitle)).join('')}
                    </div>
                </div>
            </section>`;
        }
        // 1B. Nested Dictionary of Groups (collectibles, regional stashes, etc.)
        else if (typeof catValue === 'object') {
            if (catKey === 'collectibles') {
                for (const cKey in catValue) {
                    const group = catValue[cKey];
                    const items = (group && Array.isArray(group.items)) ? group.items : [];
                    if (items.length > 0) {
                        const gTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                        html += `
                        <section class="category-section section-collapsed" id="cat-col-${cKey}">
                            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                                <h2>🗂️ Collectibles: ${escapeHtml(gTitle)} ${progressChip(items.length)}</h2>
                                <span>▾</span>
                            </div>
                            <div class="section-content">
                                <div class="trophy-grid">
                                    ${items.map(it => renderCard(it, 'collectible', cKey)).join('')}
                                </div>
                            </div>
                        </section>`;
                    }
                }
            } else {
                // Any other nested regional object (e.g., prepper_stashes, regional zones, etc.)
                Object.entries(catValue).forEach(([subKey, subItems]) => {
                    if (Array.isArray(subItems) && subItems.length > 0) {
                        const formattedSubTitle = `${formattedCatTitle} — ${subKey.replace(/_/g, ' ').toUpperCase()}`;
                        html += `
                        <section class="category-section section-collapsed" id="cat-${catKey}-${subKey}">
                            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                                <h2>📦 ${escapeHtml(formattedSubTitle)} ${progressChip(subItems.length)}</h2>
                                <span>▾</span>
                            </div>
                            <div class="section-content">
                                <div class="trophy-grid">
                                    ${subItems.map(it => renderCard(it, `custom_${catKey}`, subKey)).join('')}
                                </div>
                            </div>
                        </section>`;
                    }
                });
            }
        }
    });

    // 2. PSN Official Trophies & Achievements
    const trophiesList = (appState.psnSkeleton && appState.psnSkeleton.trophies) ? Object.values(appState.psnSkeleton.trophies) : (data.trophies_and_achievements || []);

    if (Array.isArray(trophiesList) && trophiesList.length > 0) {
        html += `
        <section class="category-section section-collapsed" id="cat-trophies">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 PSN Official Trophies & Achievements ${progressChip(trophiesList.length)}</h2>
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

// Section 10: Dynamic Manifest Catalog & Auto Pill Bar Loader
async function initGameCatalog() {
    const timestamp = Date.now();
    const manifestUrls = [
        `./data/games/index.json?t=${timestamp}`,
        `./data/index.json?t=${timestamp}`,
        `../game/data/games/index.json?t=${timestamp}`,
        `/game/data/games/index.json?t=${timestamp}`,
        `//werewolf3788.github.io/Website/game/data/games/index.json?t=${timestamp}`
    ];

    let manifest = null;
    let manifestLoadedFrom = '';

    for (const url of manifestUrls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                manifest = await res.json();
                manifestLoadedFrom = url;
                break;
            }
        } catch (e) {}
    }

    const urlParams = new URLSearchParams(window.location.search);
    const targetSlug = (urlParams.get('game') || manifest?.defaultGame || 'farcry5').toLowerCase();

    let selectedEntry = null;

    if (manifest && Array.isArray(manifest.games)) {
        renderGamePillsFromManifest(manifest.games);
        selectedEntry = manifest.games.find(g => g.id.toLowerCase() === targetSlug) || manifest.games[0];
        console.log(`[Manifest Loaded] Loaded index manifest from: ${manifestLoadedFrom}`);
    }

    const candidatePaths = selectedEntry?.path ? [selectedEntry.path] : [];
    candidatePaths.push(
        `./data/games/${targetSlug}.json`,
        `./data/${targetSlug}.json`,
        `../game/data/games/${targetSlug}.json`,
        `../game/data/${targetSlug}.json`,
        `/game/data/games/${targetSlug}.json`,
        `/game/data/${targetSlug}.json`,
        `//werewolf3788.github.io/Website/game/data/games/${targetSlug}.json`,
        `//werewolf3788.github.io/Website/game/data/${targetSlug}.json`,
        `//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/${targetSlug}.json`
    );

    let gameJson = null;
    let resolvedPath = '';

    for (const p of candidatePaths) {
        if (!p) continue;
        try {
            const fetchUrl = p.includes('?') ? p : `${p}?t=${timestamp}`;
            const res = await fetch(fetchUrl);
            if (res.ok) {
                gameJson = await res.json();
                resolvedPath = p;
                break;
            }
        } catch (e) {}
    }

    if (!gameJson) {
        console.error(`[Load Error] Failed to fetch game JSON for '${targetSlug}' across all candidate paths.`);
        return;
    }

    console.log(`[Game Loaded] Successfully fetched ${gameJson.game || targetSlug} from: ${resolvedPath}`);

    appState.gameData = gameJson;
    appState.activeGame = gameJson.game || selectedEntry?.name || "Game Companion";
    appState.activeGameId = gameJson.gameId || selectedEntry?.id || targetSlug;
    appState.activePsnCommId = gameJson.commId || gameJson.psn_communication_id || selectedEntry?.commId || null;
    if (gameJson.activeMission) appState.activeMission = gameJson.activeMission;

    // Dynamically update page titles
    const titleEl = document.getElementById('pageTitle');
    const displayEl = document.getElementById('gameTitleDisplay');
    const headerTitle = document.getElementById('resistance-name');
    if (titleEl) titleEl.innerText = `${appState.activeGame} — Companion & Field Ledger`;
    if (displayEl) displayEl.innerText = `${appState.activeGame} Hub`;
    if (headerTitle) headerTitle.innerText = `${appState.activeUser.toUpperCase()} [${appState.activeGame.toUpperCase()}]`;

    await syncPsnSkeleton();
    renderUniversalCompanion(gameJson);
}

function renderGamePillsFromManifest(gamesList) {
    const pillBar = document.getElementById('gamePillsBar');
    if (!pillBar) return;

    const currentSlug = (new URLSearchParams(window.location.search).get('game') || 'farcry5').toLowerCase();

    pillBar.innerHTML = gamesList.map(g => {
        const isActive = g.id.toLowerCase() === currentSlug;
        return `
            <a href="?game=${encodeURIComponent(g.id)}" class="game-pill ${isActive ? 'active' : ''}" style="text-decoration:none;">
                <span>${g.icon || '🎮'}</span>
                <span>${escapeHtml(g.name)}</span>
            </a>
        `;
    }).join('');
}

// Section 11: Sequential Lifecycle
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

    // Step 1: Initialize Universal Manifest & Companion Render
    await initGameCatalog();

    // Step 2: Auth listener
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Player';

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

                await appState.fetchUserProfile();
                await appState.loadProgress();
                await appState.migrateGuestProgressIfPresent();
                await appState.refreshPsnProgress();
                await appState.syncFriendsProgress();
            } else {
                appState.currentUser = null;
                appState.activeEmail = null;
                appState.activeUser = 'Guest';
                appState.myFriendCode = null;
                appState.myPsnGamertag = null;
                window.squadProgressCache = {};

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `GUEST [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');

                await appState.loadProgress();
            }
        });
    }

    // Step 3: Squad polling interval
    setInterval(async () => {
        if (document.visibilityState === 'visible' && appState.currentUser && appState.isCloudLoaded) {
            await appState.refreshPsnProgress();
            appState.syncFriendsProgress();
        }
    }, 120000);
});
