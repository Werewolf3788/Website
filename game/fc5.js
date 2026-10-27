// ============================================================================
// * Project: Far Cry 5 Hope County Resistance Companion & Field Ledger
// * File: script.js
// * Location: /games/FarCry5/script.js
// * Build Version: v8.0.0-FC5-CLOUD-AUTHORITATIVE
// * Deployment Timestamp: 2026-10-26 20:23:00 EDT (America/New_York)
// ============================================================================

// Section 1: Application State & Safe Initialization
window.appState = {
    activeUser: 'Werewolf',
    activeEmail: 'raykevin71888@gmail.com',
    platform: 'playstation',
    isPinned: false,
    currentUser: null,
    dbRef: null,
    rtdb: null,
    auth: null,
    gameData: null,
    state: {
        ranks: {
            rp: 0,
            outposts: 0,
            cultProperty: 0,
            stashes: 0,
            roster: 0,
            perks: 0
        },
        checks: {}
    },

    // Section 2: Header Navigation & Mobile Drawer
    toggleNavFolder: function(elementId, event) {
        if (event) event.stopPropagation();
        const nav = document.getElementById(elementId);
        if (nav) {
            nav.classList.toggle('is-open');
        }
    },

    // Section 3: Pin Device Persistence
    togglePinDevice: function() {
        this.isPinned = !this.isPinned;
        const btn = document.getElementById('pin-device-btn');
        if (btn) {
            if (this.isPinned) {
                btn.classList.add('is-pinned');
                btn.innerHTML = '📌 Pinned';
                localStorage.setItem('fc5_device_pinned', 'true');
            } else {
                btn.classList.remove('is-pinned');
                btn.innerHTML = '📌 Pin Device';
                localStorage.removeItem('fc5_device_pinned');
            }
        }
    },

    // Section 4: Profile & Platform Switching
    switchPlatform: function(newPlatform) {
        this.platform = newPlatform;
        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            nameEl.innerText = `${this.activeUser.toUpperCase()} [${newPlatform.toUpperCase()}]`;
        }
        this.loadProgress();
    },

    switchHunterEmail: function(newEmail) {
        this.activeEmail = newEmail;
        this.activeUser = (newEmail.indexOf('raykevin') !== -1) ? 'Werewolf' : 'Raymystyro';
        document.body.setAttribute('data-active-user', this.activeUser);
        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            nameEl.innerText = `${this.activeUser.toUpperCase()} [${this.platform.toUpperCase()}]`;
        }
        this.loadProgress();
    },

    // Section 5: State Read/Write (Firebase RTDB with LocalStorage Fallback)
    saveProgress: function() {
        const key = `fc5_progress_${this.activeUser}_${this.platform}`;
        
        // Always mirror to localStorage as cache / offline state
        try {
            localStorage.setItem(key, JSON.stringify(this.state));
        } catch (e) {
            console.warn('[Storage] Local cache write failed:', e);
        }

        // Write to Firebase if signed in
        if (this.currentUser && this.rtdb) {
            const userSanitized = this.activeUser.toLowerCase();
            const targetPath = `/far_cry_5_users/${userSanitized}/platforms/${this.platform}`;
            try {
                this.rtdb.ref(targetPath).set({
                    state: this.state,
                    lastUpdated: new Date().toISOString()
                }).then(() => {
                    this.updateStatus('Telemetry synced with Firebase cloud.');
                }).catch(err => {
                    console.error('[Firebase] Save failed:', err);
                    this.updateStatus('Cloud sync failed - cached locally.');
                });
            } catch (err) {
                console.warn('[Firebase] Write exception:', err);
            }
        } else {
            this.updateStatus('Saved locally (Offline Mode).');
        }
    },

    loadProgress: function() {
        const key = `fc5_progress_${this.activeUser}_${this.platform}`;
        let loaded = false;

        // Try Firebase first if authenticated
        if (this.currentUser && this.rtdb) {
            const userSanitized = this.activeUser.toLowerCase();
            const targetPath = `/far_cry_5_users/${userSanitized}/platforms/${this.platform}`;
            this.updateStatus('Fetching cloud telemetry...');

            this.rtdb.ref(targetPath).once('value').then(snapshot => {
                const cloudVal = snapshot.val();
                if (cloudVal && cloudVal.state) {
                    this.state = cloudVal.state;
                    loaded = true;
                    this.applyStateToUI();
                    this.updateStatus('Telemetry synced from Firebase.');
                } else {
                    this.fallbackLocalLoad(key);
                }
            }).catch(err => {
                console.warn('[Firebase] Fetch error, falling back to local:', err);
                this.fallbackLocalLoad(key);
            });
            return;
        }

        this.fallbackLocalLoad(key);
    },

    fallbackLocalLoad: function(storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    this.state = Object.assign({ ranks: {}, checks: {} }, parsed);
                    this.applyStateToUI();
                    this.updateStatus('Operating in Offline / LocalStorage mode.');
                    return;
                }
            }
        } catch (e) {
            console.warn('[Storage] Failed to read local progress:', e);
        }

        // Initialize fresh state if empty
        this.state = {
            ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0 },
            checks: {}
        };
        this.applyStateToUI();
        this.updateStatus('Fresh profile ready. Sign in to sync across devices.');
    },

    applyStateToUI: function() {
        // Update rank numbers
        if (this.state.ranks) {
            for (const r in this.state.ranks) {
                const el = document.getElementById(`rank-val-${r}`);
                if (el) el.innerText = this.state.ranks[r] || 0;
            }
        }

        // Update checklist buttons and cards
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
    }
};

// Section 6: Rank Counter Adjustments
window.adjRank = function(rankKey, delta) {
    if (!appState.state.ranks) appState.state.ranks = {};
    const current = Number(appState.state.ranks[rankKey] || 0);
    const nextVal = Math.max(0, current + delta);
    appState.state.ranks[rankKey] = nextVal;
    
    const valEl = document.getElementById(`rank-val-${rankKey}`);
    if (valEl) valEl.innerText = nextVal;

    appState.saveProgress();
};

// Section 7: Render Dynamic Sections from farcry5.json
function renderFarCry5Companion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // 7A. Story & Boss Walkthroughs
    if (Array.isArray(data.walkthrough_missions)) {
        html += `
        <section class="category-section" id="cat-walkthroughs">
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
                                    <div class="trophy-badges-row">
                                        <span class="trophy-rank rank-gold">${escapeHtml(item.region || 'Hope County')}</span>
                                    </div>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(item.mission_name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}')" aria-label="Toggle Mission"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:10px; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                            ${item.objectives ? `
                                <ul style="padding-left:18px; color:#cbd5e1; font-size:0.75rem;">
                                    ${item.objectives.map(obj => `<li>${escapeHtml(obj)}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 7B. Prepper Stashes
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
                <section class="category-section" id="cat-stash-${reg.key}">
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
                                            <div class="trophy-badges-row">
                                                <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'No Gear Required')}</span>
                                                ${s.unique_rewards ? `<span class="mode-badge is-shared">${escapeHtml(s.unique_rewards)}</span>` : ''}
                                            </div>
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

    // 7C. Hope County Collectibles
    if (data.collectibles) {
        for (const cKey in data.collectibles) {
            const group = data.collectibles[cKey];
            if (group && Array.isArray(group.items)) {
                const groupTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section" id="cat-col-${cKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(groupTitle)} (${group.items.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div style="margin-bottom:12px; font-size:0.8rem; color:var(--text-muted);">
                            <strong>Quest Giver:</strong> ${escapeHtml(group.quest_giver || 'N/A')} • 
                            <strong>Location:</strong> ${escapeHtml(group.quest_giver_location || 'Hope County')}
                        </div>
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

    // 7D. Guns & Fangs for Hire
    if (Array.isArray(data.guns_and_fangs_for_hire)) {
        html += `
        <section class="category-section" id="cat-roster">
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
                                    <div class="trophy-badges-row">
                                        <span class="trophy-rank rank-platinum">${escapeHtml(h.type)}</span>
                                        <span class="mode-badge is-shared">${escapeHtml(h.region)}</span>
                                    </div>
                                    <h3 style="color:#fff; font-size:1.05rem; margin-top:4px;">${escapeHtml(h.name)}</h3>
                                    <div style="font-size:0.8rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(h.title)}</div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${h.id}')" aria-label="Toggle Hire"></button>
                            </div>
                            <div style="font-size:0.78rem; color:#cbd5e1; margin-bottom:8px;">
                                <strong>Unlock Mission:</strong> ${escapeHtml(h.unlock_mission)} (${escapeHtml(h.location)})
                            </div>
                            ${h.skills ? `
                                <div style="background:rgba(0,0,0,0.25); padding:8px; border-radius:6px;">
                                    ${h.skills.map(sk => `<div style="font-size:0.75rem; margin-bottom:2px;"><strong>${escapeHtml(sk.name)}:</strong> <span style="color:var(--text-muted);">${escapeHtml(sk.description)}</span></div>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 7E. Trophies & Achievements
    if (Array.isArray(data.trophies_and_achievements)) {
        html += `
        <section class="category-section" id="cat-trophies">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 Trophies & Achievements (${data.trophies_and_achievements.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.trophies_and_achievements.map((t, idx) => {
                        const trophyId = `trophy_fc5_${idx}`;
                        let badgeClass = 'rank-bronze';
                        if (t.type && t.type.toLowerCase().includes('platinum')) badgeClass = 'rank-platinum';
                        else if (t.type && t.type.toLowerCase().includes('gold')) badgeClass = 'rank-gold';
                        else if (t.type && t.type.toLowerCase().includes('silver')) badgeClass = 'rank-silver';

                        return `
                        <div class="trophy-card fc5-item-card" data-id="${trophyId}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank ${badgeClass}">${escapeHtml(t.type || 'Trophy')}</span>
                                    <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(t.name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${trophyId}')" aria-label="Toggle Trophy"></button>
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

// Section 8: Helpers & Sanitization
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Section 9: Primary DOM Initialization Gate
document.addEventListener('DOMContentLoaded', () => {
    // 9A. Load Pin Device Setting
    if (localStorage.getItem('fc5_device_pinned') === 'true') {
        appState.isPinned = true;
        const btn = document.getElementById('pin-device-btn');
        if (btn) {
            btn.classList.add('is-pinned');
            btn.innerHTML = '📌 Pinned';
        }
    }

    // 9B. Fetch Far Cry 5 Data JSON
    const dataUrls = [
        './game/data/farcry5.json',
        '/game/data/farcry5.json',
        '../../game/data/farcry5.json',
        '//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/farcry5.json'
    ];

    const tryFetchData = async (index) => {
        if (index >= dataUrls.length) {
            appState.updateStatus('Error: Unable to locate farcry5.json data file.');
            return;
        }
        try {
            const resp = await fetch(dataUrls[index]);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            appState.gameData = json;
            renderFarCry5Companion(json);
            appState.loadProgress();
        } catch (e) {
            tryFetchData(index + 1);
        }
    };

    tryFetchData(0);

    // 9C. Authentication Modal Controls
    const authBtn = document.getElementById('authModalBtn');
    const authModal = document.getElementById('authModal');
    const authClose = document.getElementById('authModalClose');

    if (authBtn && authModal) {
        authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
    }
    if (authClose && authModal) {
        authClose.addEventListener('click', () => authModal.classList.add('hidden'));
    }

    // 9D. Optional Firebase SDK Hook
    if (window.firebase) {
        try {
            appState.rtdb = firebase.database();
            appState.auth = firebase.auth();
            appState.auth.onAuthStateChanged(user => {
                if (user) {
                    appState.currentUser = user;
                    if (authBtn) authBtn.classList.add('hidden');
                    const userProfile = document.getElementById('userProfile');
                    const userAvatar = document.getElementById('headerUserAvatar');
                    const userName = document.getElementById('userDisplayName');
                    if (userProfile) userProfile.classList.remove('hidden');
                    if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
                    if (userName) userName.innerText = user.displayName || user.email || 'Resistance Fighter';
                    if (authModal) authModal.classList.add('hidden');
                } else {
                    appState.currentUser = null;
                    if (authBtn) authBtn.classList.remove('hidden');
                    const userProfile = document.getElementById('userProfile');
                    if (userProfile) userProfile.classList.add('hidden');
                }
                appState.loadProgress();
            });

            const googleBtn = document.getElementById('googleSignInBtn');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    firebase.auth().signInWithPopup(provider).catch(err => {
                        console.error('[Auth Error]', err);
                        alert(`Sign-in could not be completed: ${err.message}`);
                    });
                });
            }
        } catch (err) {
            console.warn('[Firebase] SDK detected but init skipped:', err);
        }
    }
});
