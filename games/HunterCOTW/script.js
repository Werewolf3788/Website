/* ============================================================================
 * File: script.js
 * Location: //playstation-be938.web.app/games/HunterCOTW/script.js
 * Description: theHunter: Call of the Wild Master Tactical Companion & Telemetry Engine:
 *              1. Dynamic catalogs fetched from /data/cotw.json and /data/users.json.
 *              2. Google Authentication, session management, and profile dropdown modal.
 *              3. Scoped Firestore hierarchy: users/{emailKey}/platform/{platform}/progress/COTW
 *              4. Live RTDB need zones, grind tracking, and NPWR13211_00 PlayStation sync.
 *              5. Zero dropped lines: full reserve schedules, coordinates, and culls preserved.
 * Build Version: 7.0.0 - Unified Auth, Dynamic Users & Multi-Platform Engine
 * [Smart Cache-Buster Time: 2026-10-10 03:14 EDT | Firebase Sync Target: /utm_links | Version: 7.0.0]
 * ============================================================================ */

// Line 16: Google Tag Manager & Google Analytics 4 Deployment (G-CTYHDF4MSD)
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W3R9F47');

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-CTYHDF4MSD', {
    'send_page_view': true,
    'anonymize_ip': true,
    'cookie_flags': 'SameSite=None;Secure'
});

// Line 33: Relative Protocol SDK Imports
import { initializeApp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from '//www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue, get, set, update, push, off } from '//www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from '//www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const BUILD_VERSION = "7.0.0";
const CODE_BUILD_DATE = "2026-10-10 03:14:00 EDT";
const DEFAULT_USER_AVATAR = "https://digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png";

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

const GAME_ID = 'COTW';
const NPWR_ID = 'NPWR13211_00';

function getResolvedPrimaryEmail(user) {
    if (!user) return "";
    const google = user.providerData && user.providerData.find(p => p && p.providerId === "google.com");
    if (google && google.email) return google.email.toLowerCase().trim();
    if (user.email) return user.email.toLowerCase().trim();
    return "hunter@guest.local";
}

function getEmailKey(email) {
    if (!email) return "unknown_user";
    return String(email).trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_');
}

const normalizePlatform = (inputPlatform) => {
    if (!inputPlatform) return 'playstation';
    const clean = String(inputPlatform).toLowerCase().trim();
    if (clean === 'psn' || clean === 'ps' || clean === 'playstation') return 'playstation';
    return clean;
};

// Application State with Full Multi-Path JSON & Dynamic User Synchronization
const appState = {
    files: {
        cotw: "cotw.json",
        users: "users.json"
    },

    currentUser: null,
    activeHunterEmail: localStorage.getItem('active_hunter_email') || 'raykevin71888@gmail.com',
    activeSanitizedKey: getEmailKey(localStorage.getItem('active_hunter_email') || 'raykevin71888@gmail.com'),
    activePlatform: normalizePlatform(localStorage.getItem('active_gaming_platform')),
    psnAccountId: "",
    psnOnlineId: "",
    activeReserve: 'Layton Lake',
    activeSpecies: 'Black Bear (Class 7)',
    zoneType: 'main',
    sessionMode: 'single',
    selectedImageFile: null,

    masterCatalog: null,
    usersCatalog: [],
    hunterData: [],
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, Fur: 0 },
    activeReserveCullCounts: {},
    friendsRoster: [],
    teamLiveTelemetry: {},
    crossPlatformTelemetry: {
        playstation: { earned: 0, total: 0, percent: 0 },
        pc: { earned: 0, total: 0, percent: 0 },
        xbox: { earned: 0, total: 0, percent: 0 }
    },

    auth: null,
    db: null,
    rtdb: null,
    storage: null,
    collapsedSections: {},
    openDropdowns: {},
    masterUnsub: null,
    legacyUnsub: null,
    rtdbTrophyRef: null,
    rtdbLedgerRef: null,
    rtdbReserveCullRef: null,

    knownWeaponsList: [],
    knownOrgansList: [],

    async fetchJSON(fileName) {
        const paths = [
            "../../data/" + fileName,
            "../data/" + fileName,
            "./data/" + fileName,
            "data/" + fileName,
            "./" + fileName,
            "/Website/data/" + fileName,
            "//werewolf3788.github.io/Website/data/" + fileName
        ];

        for (let i = 0; i < paths.length; i++) {
            try {
                const res = await fetch(paths[i] + "?v=" + Date.now());
                if (res.ok) return await res.json();
            } catch (e) {}
        }
        return null;
    },

    async loadAllJSONs() {
        const cotwData = await this.fetchJSON(this.files.cotw);
        if (cotwData) {
            this.masterCatalog = cotwData;
            try { localStorage.setItem('cached_cotw_json', JSON.stringify(cotwData)); } catch (e) {}
        } else {
            const cached = localStorage.getItem('cached_cotw_json');
            this.masterCatalog = cached ? JSON.parse(cached) : { reserves: {}, equipment: { weapons: [], hitOrgans: [] }, trophies: [] };
        }

        const usersData = await this.fetchJSON(this.files.users);
        if (usersData) {
            this.usersCatalog = Array.isArray(usersData) ? usersData : (usersData.users || Object.values(usersData));
        }

        const eq = this.masterCatalog.equipment || {};
        this.knownWeaponsList = (eq.weapons || []).map(w => typeof w === 'string' ? w : w.name);
        this.knownOrgansList = eq.hitOrgans || [
            'Both Lungs (Double Lung)', 'Heart', 'Brain / Skull',
            'Left Lung', 'Right Lung', 'Neck / Spine', 'Liver / Stomach'
        ];
    },

    applyUserThemeAndIdentity() {
        if (!this.usersCatalog || !this.usersCatalog.length) return;

        const activeEmail = (this.activeHunterEmail || "").toLowerCase().trim();
        const activePSN = (this.psnAccountId || "").trim();
        const activeOnlineId = (this.psnOnlineId || "").toLowerCase().trim();

        const matchedUser = this.usersCatalog.find(u => {
            const uEmail = (u.email || "").toLowerCase().trim();
            const uPsnId = String(u.psn_id || "").trim();
            const uOnline = (u.psn_name || "").toLowerCase().trim();
            return (activeEmail && uEmail === activeEmail) ||
                   (activePSN && uPsnId === activePSN) ||
                   (activeOnlineId && uOnline === activeOnlineId);
        });

        if (matchedUser) {
            if (!this.psnAccountId && matchedUser.psn_id) this.psnAccountId = String(matchedUser.psn_id);
            if (!this.psnOnlineId && matchedUser.psn_name) this.psnOnlineId = matchedUser.psn_name;

            if (matchedUser.theme) {
                const root = document.documentElement;
                if (matchedUser.theme.primary_color) {
                    root.style.setProperty("--theme-primary", matchedUser.theme.primary_color);
                    root.style.setProperty("--accent-primary", matchedUser.theme.primary_color);
                }
                if (matchedUser.theme.accent_color) {
                    root.style.setProperty("--theme-accent", matchedUser.theme.accent_color);
                    root.style.setProperty("--accent-gold", matchedUser.theme.accent_color);
                }
                if (matchedUser.theme.surface_color) {
                    root.style.setProperty("--theme-surface", matchedUser.theme.surface_color);
                }
            }
        }
    },

    getFreshTrophyTemplate: function() {
        if (this.masterCatalog && this.masterCatalog.trophies) {
            return JSON.parse(JSON.stringify(this.masterCatalog.trophies));
        }
        return [];
    },

    toggleSessionMode: function() {
        this.sessionMode = this.sessionMode === 'single' ? 'multi' : 'single';
        const btn = document.getElementById('session-mode-btn');
        if (btn) {
            if (this.sessionMode === 'single') {
                btn.className = 'session-toggle-btn is-single';
                btn.innerText = '🎮 Mode: Single Player (Story Active)';
            } else {
                btn.className = 'session-toggle-btn is-multi';
                btn.innerText = '👥 Mode: Multiplayer (Story Muted)';
            }
        }
    },

    setZoneType: function(type) {
        this.zoneType = type;
        const btn = document.getElementById('zone-toggle-btn');
        if (!btn) return;
        if (type === 'main') {
            btn.className = 'zone-toggle-btn is-main';
            btn.innerText = '🎯 Main Rotation Zone';
        } else {
            btn.className = 'zone-toggle-btn is-exterior';
            btn.innerText = '⚠️ Exterior Zone (Seed Check)';
        }
    },

    onCoordinateInput: function() {
        const latVal = parseFloat(document.getElementById('coord-lat')?.value);
        const longVal = parseFloat(document.getElementById('coord-long')?.value);
        if (isNaN(latVal) || isNaN(longVal)) return;

        let closest = null;
        let minDistance = Infinity;

        const anchors = this.masterCatalog?.laytonAnchors || [];
        if (this.activeReserve.toLowerCase().includes('layton') && anchors.length > 0) {
            anchors.forEach(pt => {
                const dist = Math.hypot(pt.x - longVal, pt.y - latVal);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = pt;
                }
            });
        }

        if (closest && minDistance < 1200) {
            const regInput = document.getElementById('harvest-region');
            const subInput = document.getElementById('harvest-subregion');
            if (regInput && !regInput.value) regInput.value = closest.region || '';
            if (subInput && !subInput.value) subInput.value = closest.subRegion || '';
        }
    },

    handleImageSelection: function(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('screenshot-preview');
        const previewContainer = document.getElementById('screenshot-preview-container');

        if (file) {
            this.selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                if (preview) preview.src = e.target.result;
                if (previewContainer) previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            this.selectedImageFile = null;
            if (previewContainer) previewContainer.style.display = 'none';
        }
    },

    handleReserveChange: function(selectedVal) {
        if (!selectedVal) return;
        const customWrap = document.getElementById('custom-reserve-wrap');

        if (selectedVal === '__CUSTOM__') {
            if (customWrap) customWrap.style.display = 'block';
            const customInput = document.getElementById('custom-reserve-input');
            this.activeReserve = customInput?.value?.trim() || 'Custom Reserve';
        } else {
            if (customWrap) customWrap.style.display = 'none';
            this.activeReserve = selectedVal.trim();
        }

        this.updateSpeciesDropdown();
        this.bindGrindTelemetry();
        this.bindReserveCullWatcher();

        const targetSection = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '');
        const sectionEl = document.getElementById(targetSection);
        if (sectionEl) {
            this.collapsedSections[targetSection] = false;
            sectionEl.classList.remove('section-collapsed');
            sectionEl.scrollIntoView({ behavior: 'smooth' });
        }
    },

    updateSpeciesDropdown: function() {
        const specSelect = document.getElementById('grind-species-select');
        if (!specSelect) return;

        const resObj = this.masterCatalog?.reserves?.[this.activeReserve];
        let animals = [];

        if (resObj && Array.isArray(resObj.animals)) {
            animals = resObj.animals.map(a => typeof a === 'string' ? a : `${a.name} (Class ${a.class})`);
        } else {
            animals = [
                'Whitetail Deer (Class 4)', 'Black Bear (Class 7)', 'Moose (Class 8)',
                'Red Deer (Class 6)', 'Fallow Deer (Class 4)', 'Wild Boar (Class 4)'
            ];
        }

        specSelect.innerHTML = '';
        animals.forEach((anim, i) => {
            const opt = document.createElement('option');
            opt.value = anim;
            opt.innerText = anim;
            if (i === 0) opt.selected = true;
            specSelect.appendChild(opt);
        });

        const customOpt = document.createElement('option');
        customOpt.value = '__CUSTOM__';
        customOpt.innerText = '✍️ + Enter Custom Species...';
        specSelect.appendChild(customOpt);

        this.activeSpecies = specSelect.value;
        const customSpecWrap = document.getElementById('custom-species-wrap');
        if (customSpecWrap) customSpecWrap.style.display = 'none';

        this.updateNeedZoneSchedule();
        this.renderReserveCullBoard();
    },

    handleSpeciesSelectChange: function(val) {
        const customWrap = document.getElementById('custom-species-wrap');
        if (val === '__CUSTOM__') {
            if (customWrap) customWrap.style.display = 'block';
            const customInput = document.getElementById('custom-species-input');
            this.activeSpecies = customInput?.value?.trim() || 'Custom Animal';
        } else {
            if (customWrap) customWrap.style.display = 'none';
            this.activeSpecies = val;
        }
        this.updateNeedZoneSchedule();
        this.bindGrindTelemetry();
        this.renderReserveCullBoard();
    },

    updateNeedZoneSchedule: function() {
        const typeSelect = document.getElementById('needzone-type-select');
        const timeInput = document.getElementById('needzone-time-input');
        if (!typeSelect || !timeInput) return;

        const cleanSpecies = this.activeSpecies.split('(')[0].trim();
        const schedules = this.masterCatalog?.needZoneSchedules || {};
        const schedule = schedules[cleanSpecies];
        const activity = typeSelect.value.toLowerCase();

        if (schedule && schedule[activity]) {
            timeInput.value = schedule[activity];
        } else if (activity === 'none') {
            timeInput.value = 'Roaming / No Zone';
        } else if (!timeInput.value) {
            timeInput.value = '08:00 - 12:00';
        }
    },

    pinNeedZone: async function() {
        if (!this.rtdb || !this.auth.currentUser) {
            this.setStatus("❌ Database not connected. Please reload.", "#ef4444");
            return;
        }

        const latVal = parseFloat(document.getElementById('coord-lat')?.value) || 0;
        const longVal = parseFloat(document.getElementById('coord-long')?.value) || 0;
        const regionVal = document.getElementById('harvest-region')?.value?.trim() || 'Unknown';
        const subregionVal = document.getElementById('harvest-subregion')?.value?.trim() || 'Unknown';
        const zoneType = document.getElementById('needzone-type-select')?.value || 'Drinking';
        const zoneTime = document.getElementById('needzone-time-input')?.value?.trim() || 'Active Hours';

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanSpecies = this.activeSpecies.replace(/[^a-zA-Z0-9]/g, '_');

        const userZonePath = `users/${this.activeSanitizedKey}/need_zones/${cleanMap}/${cleanSpecies}`;
        const userZoneRef = rtdbRef(this.rtdb, userZonePath);

        this.setStatus(`⏳ Verifying need zones for ${this.activeHunterEmail}...`, "#e67e22");

        try {
            const snapshot = await get(userZoneRef);
            let personalDuplicateKey = null;

            if (snapshot.exists()) {
                const userPins = snapshot.val();
                for (const [key, pin] of Object.entries(userPins)) {
                    if (pin.zoneType && pin.zoneType.toLowerCase() === zoneType.toLowerCase()) {
                        const dist = Math.hypot((pin.long || 0) - longVal, (pin.lat || 0) - latVal);
                        if (dist <= 50) {
                            personalDuplicateKey = key;
                            break;
                        }
                    }
                }
            }

            if (personalDuplicateKey) {
                await update(rtdbRef(this.rtdb, `${userZonePath}/${personalDuplicateKey}`), {
                    activeTime: zoneTime,
                    region: regionVal,
                    subRegion: subregionVal,
                    lastVerified: Date.now()
                });
                this.setStatus(`ℹ️ Need zone refreshed & verified.`, "#eab308");
                alert(`You have already logged this ${zoneType} zone for ${this.activeSpecies} here. Timestamp updated!`);
            } else {
                const needZonePayload = {
                    reserve: this.activeReserve,
                    species: this.activeSpecies,
                    zoneType: zoneType,
                    activeTime: zoneTime,
                    lat: latVal,
                    long: longVal,
                    region: regionVal,
                    subRegion: subregionVal,
                    sessionMode: this.sessionMode,
                    pinnedByEmail: this.activeHunterEmail,
                    sanitizedKey: this.activeSanitizedKey,
                    timestamp: Date.now()
                };

                await push(userZoneRef, needZonePayload);
                this.setStatus(`📌 Need Zone pinned for ${this.activeSpecies} [${subregionVal}]`, "#10b981");
            }
        } catch (err) {
            console.error("Need Zone Save Error:", err);
            this.setStatus(`❌ Failed to Pin Need Zone: ${err.message}`, "#ef4444");
        }
    },

    populateDatalist: function(listId, items) {
        const datalist = document.getElementById(listId);
        if (!datalist) return;
        datalist.innerHTML = '';
        [...new Set(items)].sort().forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            datalist.appendChild(opt);
        });
    },

    bindReserveCullWatcher: function() {
        if (!this.rtdb) return;
        if (this.rtdbReserveCullRef) off(this.rtdbReserveCullRef);

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        this.rtdbReserveCullRef = rtdbRef(this.rtdb, `users/${this.activeSanitizedKey}/grind_tracker/${cleanMap}`);

        onValue(this.rtdbReserveCullRef, (snapshot) => {
            this.activeReserveCullCounts = {};
            if (snapshot.exists()) {
                const mapData = snapshot.val();
                Object.keys(mapData).forEach(speciesKey => {
                    const node = mapData[speciesKey];
                    if (node && node.harvests) {
                        this.activeReserveCullCounts[speciesKey] = Object.keys(node.harvests).length;
                    }
                });
            }
            this.renderReserveCullBoard();
        });
    },

    renderReserveCullBoard: function() {
        const boardEl = document.getElementById('reserve-cull-board');
        const activeCountBadge = document.getElementById('active-species-count-badge');
        if (!boardEl) return;

        const resObj = this.masterCatalog?.reserves?.[this.activeReserve];
        let animals = (resObj && Array.isArray(resObj.animals)) 
            ? resObj.animals.map(a => typeof a === 'string' ? a : `${a.name} (Class ${a.class})`)
            : [];

        let totalMapHarvests = 0;
        let activeSpeciesKills = 0;

        let chipsHTML = animals.map(anim => {
            const animKey = anim.replace(/[^a-zA-Z0-9]/g, '_');
            const killCount = this.activeReserveCullCounts[animKey] || 0;
            totalMapHarvests += killCount;

            const isCurrent = (anim === this.activeSpecies);
            if (isCurrent) activeSpeciesKills = killCount;

            return `
                <div class="cull-chip ${isCurrent ? 'active-cull-chip' : ''}" 
                     onclick="appState.selectSpeciesFromCull('${anim.replace(/'/g, "\\'")}')" 
                     title="Select ${anim}">
                    <span class="cull-chip-name">${anim}</span>
                    <span class="cull-chip-count">${killCount}</span>
                </div>
            `;
        }).join('');

        boardEl.innerHTML = chipsHTML || '<div style="font-size:0.75rem; color:#94a3b8;">No harvests logged for this reserve yet.</div>';

        if (activeCountBadge) {
            activeCountBadge.innerHTML = `🎯 <strong>${this.activeSpecies}</strong> Total: <strong>${activeSpeciesKills}</strong> | Reserve Total: <strong>${totalMapHarvests}</strong>`;
        }
    },

    selectSpeciesFromCull: function(speciesName) {
        const specSelect = document.getElementById('grind-species-select');
        if (!specSelect) return;

        let matchedOpt = Array.from(specSelect.options).find(o => o.value === speciesName);
        if (matchedOpt) {
            specSelect.value = speciesName;
            this.handleSpeciesSelectChange(speciesName);
        } else {
            specSelect.value = '__CUSTOM__';
            this.handleSpeciesSelectChange('__CUSTOM__');
            const customInput = document.getElementById('custom-species-input');
            if (customInput) customInput.value = speciesName.replace(/_/g, ' ');
            this.activeSpecies = speciesName.replace(/_/g, ' ');
            this.updateNeedZoneSchedule();
            this.bindGrindTelemetry();
            this.renderReserveCullBoard();
        }
    },

    bindGrindTelemetry: function() {
        if (!this.rtdb) return;
        if (this.rtdbLedgerRef) off(this.rtdbLedgerRef);

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanSpecies = this.activeSpecies.replace(/[^a-zA-Z0-9]/g, '_');
        this.rtdbLedgerRef = rtdbRef(this.rtdb, `users/${this.activeSanitizedKey}/grind_tracker/${cleanMap}/${cleanSpecies}/harvests`);

        onValue(this.rtdbLedgerRef, (snapshot) => {
            const fill = document.getElementById('sweet-spot-gauge');
            const readout = document.getElementById('sweet-spot-readout');
            if (!snapshot.exists()) {
                if (fill) fill.style.width = '0%';
                if (readout) readout.innerText = `No harvests recorded yet for ${this.activeSpecies} on ${this.activeReserve}.`;
                return;
            }

            const harvests = Object.values(snapshot.val());
            const recent = harvests.slice(-30);
            const totalWeight = recent.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0);
            const avgWeight = totalWeight / (recent.length || 1);

            const rawSpeciesName = this.activeSpecies.split('(')[0].trim();
            const benchmarks = this.masterCatalog?.speciesBenchmarks || {};
            const specMeta = benchmarks[rawSpeciesName] || { min: 30, max: 150, sweetLow: 45, sweetHigh: 75 };
            const range = specMeta.max - specMeta.min;
            const pct = Math.min(100, Math.max(0, ((avgWeight - specMeta.min) / range) * 100));

            if (fill) fill.style.width = `${pct}%`;
            if (readout) {
                const isOptimal = avgWeight >= specMeta.sweetLow && avgWeight <= specMeta.sweetHigh;
                const extCount = recent.filter(h => h.zoneType === 'exterior').length;
                const extRatio = Math.round((extCount / recent.length) * 100);

                let statusBadge = isOptimal ? '🎯 OPTIMAL SWEET SPOT' : (avgWeight > specMeta.sweetHigh ? '⚠️ ELEVATED WEIGHT' : '⬇️ MINIMUM TIERS');
                readout.innerHTML = `
                    <strong>${statusBadge}</strong> | Moving Avg: <strong>${avgWeight.toFixed(1)} kg</strong> (${specMeta.sweetLow}-${specMeta.sweetHigh}kg)
                    <br>Recent: ${recent.length} (Total Logged: ${harvests.length}) | Exterior Ratio: <strong>${extRatio}%</strong>
                `;
            }
        });
    },

    logHarvest: async function() {
        if (!this.rtdb || !this.auth.currentUser) {
            this.setStatus("❌ Database not connected. Please reload.", "#ef4444");
            return;
        }

        const weightInput = document.getElementById('harvest-weight');
        const levelInput = document.getElementById('harvest-level');
        const sexInput = document.getElementById('harvest-sex');
        const furInput = document.getElementById('harvest-fur');
        const ratingInput = document.getElementById('harvest-rating');
        const latInput = document.getElementById('coord-lat');
        const longInput = document.getElementById('coord-long');
        const regionInput = document.getElementById('harvest-region');
        const subregionInput = document.getElementById('harvest-subregion');
        const distInput = document.getElementById('harvest-distance');
        const weaponInput = document.getElementById('harvest-weapon-input');
        const organInput = document.getElementById('harvest-organ-input');
        const zoneTypeSelect = document.getElementById('needzone-type-select');
        const zoneTimeInput = document.getElementById('needzone-time-input');

        const weight = parseFloat(weightInput?.value);
        if (isNaN(weight) || weight <= 0) {
            alert("Please enter a valid animal harvest weight.");
            return;
        }

        const distance = parseFloat(distInput?.value) || 0;
        const weapon = weaponInput?.value?.trim() || '.300 Canning Magnum Frontier';
        const organ = organInput?.value?.trim() || 'Both Lungs (Double Lung)';
        const furVariant = furInput?.value || 'Common';
        const needZoneType = zoneTypeSelect?.value || 'None';
        const needZoneTime = zoneTimeInput?.value?.trim() || 'Roaming';

        if (!this.knownWeaponsList.includes(weapon)) {
            this.knownWeaponsList.push(weapon);
            this.populateDatalist('weapons-datalist', this.knownWeaponsList);
        }
        if (!this.knownOrgansList.includes(organ)) {
            this.knownOrgansList.push(organ);
            this.populateDatalist('organs-datalist', this.knownOrgansList);
        }

        this.setStatus(`⏳ Logging ${this.activeSpecies} to ${this.activeReserve}...`, "#e67e22");

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanSpecies = this.activeSpecies.replace(/[^a-zA-Z0-9]/g, '_');

        const harvestPayload = {
            species: this.activeSpecies,
            weight: weight,
            level: parseInt(levelInput?.value, 10) || 1,
            levelName: levelInput?.options[levelInput.selectedIndex]?.text || 'Level 1',
            sex: sexInput?.value || 'male',
            fur: furVariant,
            rating: ratingInput?.value || 'none',
            shotDistance: distance,
            weapon: weapon,
            hitOrgan: organ,
            sessionMode: this.sessionMode,
            zoneType: this.zoneType,
            needZoneType: needZoneType,
            needZoneTime: needZoneTime,
            imageUrl: "",
            lat: parseFloat(latInput?.value) || 0,
            long: parseFloat(longInput?.value) || 0,
            region: regionInput?.value?.trim() || 'Unknown',
            subRegion: subregionInput?.value?.trim() || 'Unknown',
            hunterEmail: this.activeHunterEmail,
            sanitizedKey: this.activeSanitizedKey,
            timestamp: Date.now()
        };

        try {
            const harvestsRef = rtdbRef(this.rtdb, `users/${this.activeSanitizedKey}/grind_tracker/${cleanMap}/${cleanSpecies}/harvests`);
            const newHarvestRecord = await push(harvestsRef, harvestPayload);
            const recordKey = newHarvestRecord.key;

            const savedImageFile = this.selectedImageFile;
            if (weightInput) weightInput.value = '';
            if (distInput) distInput.value = '';
            const previewContainer = document.getElementById('screenshot-preview-container');
            if (previewContainer) previewContainer.style.display = 'none';
            const fileInput = document.getElementById('harvest-screenshot-file');
            if (fileInput) fileInput.value = '';
            this.selectedImageFile = null;

            this.setStatus(`✓ Logged ${this.activeSpecies} (${weight}kg) [${this.activeReserve}]`, "#10b981");

            let trophyStateChanged = false;
            if (distance >= 50) { const t = this.hunterData.find(x => x.id === 'novice_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 100) { const t = this.hunterData.find(x => x.id === 'skilled_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 200) { const t = this.hunterData.find(x => x.id === 'expert_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 400) { const t = this.hunterData.find(x => x.id === 'legend_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }

            if (organ.toLowerCase().includes('brain') || organ.toLowerCase().includes('skull')) {
                const zombieTrophy = this.hunterData.find(x => x.id === 'not_zombie');
                if (zombieTrophy && zombieTrophy.current < zombieTrophy.goal) {
                    zombieTrophy.current += 1;
                    trophyStateChanged = true;
                }
            }

            const ratingKey = harvestPayload.rating.toLowerCase();
            if (ratingKey !== 'none' && this.animalRankData[ratingKey] !== undefined) {
                this.adjRank(ratingKey, 1);
            }
            if (furVariant.toLowerCase() !== 'common') {
                this.adjRank('Fur', 1);
            }

            if (trophyStateChanged) this.sync(true);

            if (savedImageFile && this.storage && recordKey) {
                (async () => {
                    try {
                        const imgPath = `harvest_captures/${this.activeSanitizedKey}/${Date.now()}_${savedImageFile.name}`;
                        const fileRef = storageRef(this.storage, imgPath);
                        const snapshot = await uploadBytes(fileRef, savedImageFile);
                        const downloadUrl = await getDownloadURL(snapshot.ref);

                        await update(rtdbRef(this.rtdb, `users/${this.activeSanitizedKey}/grind_tracker/${cleanMap}/${cleanSpecies}/harvests/${recordKey}`), {
                            imageUrl: downloadUrl
                        });
                    } catch (storageErr) {
                        console.warn("[Storage Warning] Upload failed:", storageErr.message);
                    }
                })();
            }
        } catch (err) {
            console.error("Harvest Log Error:", err);
            this.setStatus(`❌ Harvest Save Failed: ${err.message}`, "#ef4444");
        }
    },

    bindRTDBTrophyWatcher: function() {
        if (!this.rtdb) return;
        const targetGamerTag = this.psnOnlineId || 'wildhorse_spirit';
        const trophyPath = `psn/gamertags/${targetGamerTag}/liveTrophyProgress/${NPWR_ID}`;
        this.rtdbTrophyRef = rtdbRef(this.rtdb, trophyPath);

        onValue(this.rtdbTrophyRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const rtdbTrophies = snapshot.val();
            let stateMutated = false;
            const trophyEntries = Array.isArray(rtdbTrophies) 
                ? rtdbTrophies 
                : Object.entries(rtdbTrophies).map(([k, v]) => ({ _index: k, ...v }));

            trophyEntries.forEach(rItem => {
                if (!rItem) return;
                const isEarned = rItem.earned === true || rItem.unlocked === true || rItem.achieved === 1;
                const psnTitle = String(rItem.title || rItem.trophyName || rItem.name || '').trim().toLowerCase();
                const psnIdNum = rItem.trophyId !== undefined ? Number(rItem.trophyId) : null;

                const match = this.hunterData.find((t, idx) => {
                    const localName = t.name.trim().toLowerCase();
                    return (psnTitle && localName === psnTitle) || (psnIdNum !== null && psnIdNum === idx);
                });

                if (match) {
                    if (rItem.icon && !match.playstationImage) {
                        match.playstationImage = rItem.icon;
                        stateMutated = true;
                    }
                    if (isEarned && match.current < match.goal) {
                        match.current = match.goal;
                        if (match.type === 'checklist' && match.subItems) {
                            match.subItems.forEach(si => si.done = true);
                        }
                        stateMutated = true;
                    }
                }
            });

            if (stateMutated) {
                this.recalculateCrossTrophyTelemetry();
                this.render();
            }
        });
    },

    loadNavigationFromRTDB: function() {
        const navContainer = document.getElementById('dynamic-nav-links');
        if (!this.rtdb || !navContainer) return;

        const linksRef = rtdbRef(this.rtdb, 'utm_links');
        onValue(linksRef, (snapshot) => {
            let rawData = null;
            if (snapshot.exists()) {
                rawData = snapshot.val();
                try { localStorage.setItem('cached_utm_links', JSON.stringify(rawData)); } catch (e) {}
            } else {
                const cached = localStorage.getItem('cached_utm_links');
                if (cached) rawData = JSON.parse(cached);
            }

            if (!rawData) return;
            const standalone = [];
            const groups = {};

            const cleanUrl = (u) => {
                if (!u) return '#';
                let res = String(u).trim();
                if (res.startsWith('http://')) res = '//' + res.substring(7);
                else if (res.startsWith('https://')) res = '//' + res.substring(8);
                return res;
            };

            const parseItem = (item, fallbackKey) => {
                if (!item) return null;
                const name = item.name || item.title || fallbackKey;
                const url = cleanUrl(item.url || item.link);
                const folder = String(item.group || item.folder || '').trim();
                const icon = cleanUrl(item.image || item.icon || '');
                return { name, url, icon, folder };
            };

            Object.keys(rawData).forEach(key => {
                const node = rawData[key];
                if (!node) return;
                if (Array.isArray(node)) {
                    if (!groups[key]) groups[key] = [];
                    node.forEach((arrItem, idx) => {
                        const parsed = parseItem(arrItem, `${key}_${idx}`);
                        if (parsed) groups[key].push(parsed);
                    });
                } else if (typeof node === 'object') {
                    if (node.title || node.url || node.link) {
                        const parsed = parseItem(node, key);
                        const f = parsed.folder.toLowerCase();
                        if (!f || f === 'home' || f === 'standalone' || f === 'none') standalone.push(parsed);
                        else {
                            if (!groups[parsed.folder]) groups[parsed.folder] = [];
                            groups[parsed.folder].push(parsed);
                        }
                    } else {
                        if (!groups[key]) groups[key] = [];
                        Object.keys(node).forEach(subKey => {
                            const parsed = parseItem(node[subKey], subKey);
                            if (parsed) groups[key].push(parsed);
                        });
                    }
                }
            });

            let navHTML = '';
            standalone.forEach(item => {
                const iconTag = item.icon ? `<img src="${item.icon}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                navHTML += `<a href="${item.url}">${iconTag}<span>${item.name}</span></a>`;
            });

            Object.keys(groups).sort().forEach(folderName => {
                const folderId = folderName.replace(/[^a-zA-Z0-9]/g, '_');
                const dropItems = groups[folderName].map(item => {
                    const iconTag = item.icon ? `<img src="${item.icon}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                    return `<a href="${item.url}">${iconTag}<span>${item.name}</span></a>`;
                }).join('');

                navHTML += `
                    <div class="nav-dropdown" id="dropdown-${folderId}">
                        <button type="button" class="nav-dropbtn" onclick="appState.toggleNavFolder('dropdown-${folderId}', event)">
                            <span>${folderName}</span> ▾
                        </button>
                        <div class="nav-dropdown-content">${dropItems}</div>
                    </div>
                `;
            });

            navContainer.innerHTML = navHTML;
        });
    },

    toggleNavFolder: function(folderId, event) {
        if (event) event.stopPropagation();
        const targetEl = document.getElementById(folderId);
        if (!targetEl) return;
        const isAlreadyActive = targetEl.classList.contains('active');
        document.querySelectorAll('.nav-dropdown').forEach(el => el.classList.remove('active'));
        if (!isAlreadyActive) targetEl.classList.add('active');
    },

    cleanupOrphanedElements: function() {
        const selects = document.querySelectorAll('select');
        selects.forEach(sel => {
            const firstOptText = sel.options[0]?.text?.toLowerCase() || '';
            if (firstOptText.includes('jump to reserve')) {
                sel.remove();
            }
        });
    },

    init: async function() {
        this.cleanupOrphanedElements();
        await this.loadAllJSONs();
        this.hunterData = this.getFreshTrophyTemplate();
        this.renderBuildMetadata();
        this.updatePinButtonUI();
        this.bindUI();

        try {
            const app = initializeApp(firebaseConfig, 'COTW-Dual-Engine');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            this.rtdb = getDatabase(app);
            this.storage = getStorage(app);

            this.loadNavigationFromRTDB();

            onAuthStateChanged(this.auth, (user) => {
                const modalBtn = document.getElementById("authModalBtn");
                const profileBadge = document.getElementById("userProfile");
                const nameEl = document.getElementById("userDisplayName");
                const avatarEl = document.getElementById("headerUserAvatar");

                if (user) {
                    this.currentUser = user;
                    this.activeHunterEmail = getResolvedPrimaryEmail(user);
                    this.activeSanitizedKey = getEmailKey(this.activeHunterEmail);

                    if (modalBtn) modalBtn.classList.add("hidden");
                    if (profileBadge) profileBadge.classList.remove("hidden");

                    this.applyUserThemeAndIdentity();

                    rtdbRef(this.rtdb, `users/${this.activeSanitizedKey}`).onValue = (snapshot) => {
                        const rtdbProfile = snapshot.val() || {};
                        const hunterTag = rtdbProfile.username || user.displayName || "Hunter";
                        let avatarUrl = rtdbProfile.avatar_url || user.photoURL || DEFAULT_USER_AVATAR;

                        if (rtdbProfile.avatar_source === "google") {
                            avatarUrl = user.photoURL || DEFAULT_USER_AVATAR;
                        }

                        if (nameEl) nameEl.textContent = hunterTag;
                        if (avatarEl) avatarEl.src = avatarUrl;

                        this.psnAccountId = rtdbProfile.psn_account_id || this.psnAccountId || "";
                        this.psnOnlineId = rtdbProfile.psn_username || this.psnOnlineId || "";

                        if (rtdbProfile.primary_platform) {
                            this.activePlatform = normalizePlatform(rtdbProfile.primary_platform);
                            this.safeSetValue("platformSelect", this.activePlatform);
                        }

                        this.friendsRoster = rtdbProfile.friends ? Object.values(rtdbProfile.friends) : [];
                        this.listenToSharedSquadTelemetry();
                        this.loadAllPlatformTrophyProgress();
                    };

                    this.setStatus(`✓ Connected [${this.activeHunterEmail}]`, "#10b981");
                    this.loadHunterByEmail(this.activeHunterEmail, this.activePlatform);
                    this.renderProfileDropdown(true);
                } else {
                    this.currentUser = null;
                    if (modalBtn) modalBtn.classList.remove("hidden");
                    if (profileBadge) profileBadge.classList.add("hidden");
                    this.renderProfileDropdown(false);
                    this.setStatus("🔑 Ready for Authentication", "#94a3b8");
                }
            });
        } catch (err) {
            console.error("Init Error:", err);
            this.setStatus(`❌ Connection Error: ${err.message}`, "#ef4444");
            this.render();
        }
    },

    bindUI() {
        const googleBtn = document.getElementById("googleSignInBtn");
        if (googleBtn) {
            googleBtn.addEventListener("click", () => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(this.auth, provider).then(() => {
                    const modal = document.getElementById("authModal");
                    if (modal) modal.classList.add("hidden");
                }).catch(e => alert("Sign In Error: " + e.message));
            });
        }

        const modal = document.getElementById("authModal");
        const authBtn = document.getElementById("authModalBtn");
        const authClose = document.getElementById("authModalClose");

        if (authBtn && modal) authBtn.addEventListener("click", () => modal.classList.remove("hidden"));
        if (authClose && modal) authClose.addEventListener("click", () => modal.classList.add("hidden"));

        const platSelect = document.getElementById("platformSelect");
        if (platSelect) {
            platSelect.addEventListener("change", (e) => {
                this.switchPlatform(e.target.value);
            });
        }
    },

    renderProfileDropdown(isAuthenticated) {
        let menu = document.getElementById("userProfileDropdownMenu");
        const profileBadge = document.getElementById("userProfile");

        if (!menu && profileBadge) {
            menu = document.createElement("div");
            menu.id = "userProfileDropdownMenu";
            menu.className = "profile-dropdown-menu hidden";
            menu.style.cssText = `
                position: absolute;
                top: 60px;
                right: 20px;
                background: #151c27;
                border: 1px solid #273447;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                z-index: 1005;
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 180px;
            `;
            document.body.appendChild(menu);

            profileBadge.style.cursor = "pointer";
            profileBadge.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.classList.toggle("hidden");
            });

            document.addEventListener("click", () => {
                if (!menu.classList.contains("hidden")) menu.classList.add("hidden");
            });
        }

        if (!menu) return;

        if (isAuthenticated) {
            menu.innerHTML = `
                <a href="../../security/settings.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px; display:flex; align-items:center; gap:8px;">⚙️ Settings Hub</a>
                <a href="../../security/privacy.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px; display:flex; align-items:center; gap:8px;">🔒 Privacy Policy</a>
                <div style="height:1px; background:#273447; margin:2px 0;"></div>
                <button id="menuLogoutBtn" style="background:transparent; border:none; color:#e74c3c; text-align:left; padding:8px 12px; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:8px; font-weight:600;">🚪 Log Out</button>
            `;
            const logoutBtn = document.getElementById("menuLogoutBtn");
            if (logoutBtn) logoutBtn.addEventListener("click", () => signOut(this.auth).then(() => window.location.reload()));
        } else {
            menu.innerHTML = `
                <button id="menuLoginBtn" style="background:transparent; border:none; color:#0088ff; text-align:left; padding:8px 12px; font-size:0.85rem; cursor:pointer; font-weight:600;">🔑 Log In</button>
                <a href="../../security/privacy.html" style="color:#f0f4f8; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:6px;">🔒 Privacy Policy</a>
            `;
            const loginBtn = document.getElementById("menuLoginBtn");
            if (loginBtn) {
                loginBtn.addEventListener("click", () => {
                    const modal = document.getElementById("authModal");
                    if (modal) modal.classList.remove("hidden");
                });
            }
        }
    },

    renderBuildMetadata: function() {
        const el = document.getElementById("build-meta-footer");
        if (el) el.innerText = `Werewolf Project Engine • v${BUILD_VERSION} • Build: ${CODE_BUILD_DATE}`;
    },

    setStatus: function(msg, color) {
        const el = document.getElementById("stat-line");
        if (el) {
            el.innerText = msg;
            if (color) el.style.color = color;
        }
    },

    loadHunterByEmail: function(userEmail, platform) {
        if (!this.auth || !this.auth.currentUser) return;
        if (this.masterUnsub) { this.masterUnsub(); this.masterUnsub = null; }
        if (this.legacyUnsub) { this.legacyUnsub(); this.legacyUnsub = null; }
        if (this.rtdbTrophyRef) { off(this.rtdbTrophyRef); this.rtdbTrophyRef = null; }
        if (this.rtdbReserveCullRef) { off(this.rtdbReserveCullRef); this.rtdbReserveCullRef = null; }

        this.activeHunterEmail = userEmail || 'raykevin71888@gmail.com';
        this.activeSanitizedKey = getEmailKey(this.activeHunterEmail);
        this.activePlatform = normalizePlatform(platform);
        this.hunterData = this.getFreshTrophyTemplate();
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, Fur: 0 };
        this.activeReserveCullCounts = {};

        localStorage.setItem('active_hunter_email', this.activeHunterEmail);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        this.updatePinButtonUI();

        const hunterHeader = document.getElementById('hunter-name');
        if (hunterHeader) hunterHeader.innerText = `${this.activeHunterEmail} [${this.activePlatform.toUpperCase()}]`;

        this.render();
        this.updateRankUI();
        this.bindGrindTelemetry();
        this.bindReserveCullWatcher();

        // FIRESTORE PROGRESS LISTENER
        const docRef = doc(this.db, 'users', this.activeSanitizedKey, 'platform', this.activePlatform, 'progress', GAME_ID);
        this.masterUnsub = onSnapshot(docRef, (snap) => {
            const freshList = this.getFreshTrophyTemplate();
            if (snap.exists()) {
                const incoming = snap.data().trophies || [];
                this.hunterData = freshList.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                return { ...si, done: dbMatch?.done === true };
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            dt.current = (found.done === true || found.completed === true) ? dt.goal : (Number(found.current) || 0);
                        }
                    }
                    return dt;
                });
            }
            this.recalculateCrossTrophyTelemetry();
            this.render();
        });

        this.bindRTDBTrophyWatcher();

        // FIRESTORE RANKS LISTENER
        const rankRef = doc(this.db, 'users', this.activeSanitizedKey, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
        this.legacyUnsub = onSnapshot(rankRef, (snap) => {
            if (snap.exists()) {
                const inc = snap.data();
                this.animalRankData = {
                    bronze: inc.bronze || 0,
                    silver: inc.silver || 0,
                    gold: inc.gold || 0,
                    diamond: inc.diamond || 0,
                    greatone: inc.greatone || inc.greatOne || 0,
                    Fur: inc.Fur || inc.fur || inc.albino || 0
                };
            }
            this.updateRankUI();
        });
    },

    listenToSharedSquadTelemetry() {
        const container = document.getElementById("friendsComparisonContainer");
        if (!this.friendsRoster.length) {
            if (container) container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No squad companions linked. Share friend codes in Settings to view shared telemetry.</p>`;
            return;
        }

        this.friendsRoster.forEach(friend => {
            const friendEmail = (friend.target_email || "").toLowerCase();
            if (!friendEmail) return;
            const friendKey = getEmailKey(friendEmail);
            const targetPlat = normalizePlatform(friend.platform || this.activePlatform);

            const friendDoc = doc(this.db, 'users', friendKey, 'platform', targetPlat, 'progress', GAME_ID);
            onSnapshot(friendDoc, snap => {
                if (!snap.exists()) return;
                const data = snap.data();
                const opName = friend.username || "Companion";
                const totalTrophies = this.hunterData.length || 1;
                const earnedCount = (data.trophies || []).filter(t => t.current >= t.goal).length;

                this.teamLiveTelemetry[opName] = {
                    username: opName,
                    avatar: friend.avatar_url || DEFAULT_USER_AVATAR,
                    platform: targetPlat.toUpperCase(),
                    trophiesEarned: earnedCount,
                    trophiesTotal: totalTrophies,
                    percent: Math.round((earnedCount / totalTrophies) * 100)
                };
                this.renderSquadComparisonDeck();
            });
        });
    },

    renderSquadComparisonDeck() {
        const container = document.getElementById("friendsComparisonContainer");
        if (!container) return;
        container.innerHTML = "";

        const ops = Object.values(this.teamLiveTelemetry);
        if (!ops.length) {
            container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:12px;">No companion telemetry live yet.</p>`;
            return;
        }

        ops.forEach(op => {
            const div = document.createElement("div");
            div.className = "telemetry-card";
            div.style.cssText = "background:#151c27; border:1px solid #273447; border-left:3px solid #00d2d3; padding:12px; border-radius:8px; margin-bottom:8px;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${op.avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #00d2d3;">
                        <strong style="color:#fff; font-size:0.95rem;">${op.username}</strong>
                    </div>
                    <span class="badge" style="background:#28374d; color:#00d2d3; padding:4px 8px; border-radius:4px; font-size:0.75rem;">${op.platform}</span>
                </div>
                <div style="font-size:0.78rem; color:#94a3b8;">
                    Milestones Complete: <strong style="color:var(--accent-gold);">${op.trophiesEarned} / ${op.trophiesTotal} (${op.percent}%)</strong>
                </div>
            `;
            container.appendChild(div);
        });
    },

    async loadAllPlatformTrophyProgress() {
        if (!this.activeSanitizedKey) return;
        const platforms = ["playstation", "pc", "xbox"];
        const total = this.hunterData.length || 1;

        for (const p of platforms) {
            try {
                const snapDoc = doc(this.db, 'users', this.activeSanitizedKey, 'platform', p, 'progress', GAME_ID);
                const snap = await get(snapDoc);
                if (snap.exists()) {
                    const data = snap.data();
                    const earned = (data.trophies || []).filter(t => t.current >= t.goal).length;
                    this.crossPlatformTelemetry[p] = { earned, total, percent: Math.round((earned / total) * 100) };
                } else {
                    if (p === this.activePlatform) {
                        const earned = this.hunterData.filter(t => t.current >= t.goal).length;
                        this.crossPlatformTelemetry[p] = { earned, total, percent: Math.round((earned / total) * 100) };
                    } else {
                        this.crossPlatformTelemetry[p] = { earned: 0, total, percent: 0 };
                    }
                }
            } catch (e) {
                console.warn(`Error loading ${p} telemetry:`, e);
            }
        }
        this.render();
    },

    recalculateCrossTrophyTelemetry() {
        const total = this.hunterData.length || 1;
        const earned = this.hunterData.filter(t => t.current >= t.goal).length;
        const pct = Math.round((earned / total) * 100);

        this.crossPlatformTelemetry[this.activePlatform] = {
            earned: earned,
            total: total,
            percent: pct
        };
    },

    togglePinDevice: function() {
        const currentPin = localStorage.getItem('pinned_device_user');
        if (currentPin === this.activeHunterEmail) localStorage.removeItem('pinned_device_user');
        else localStorage.setItem('pinned_device_user', this.activeHunterEmail);
        this.updatePinButtonUI();
    },

    updatePinButtonUI: function() {
        const pinBtn = document.getElementById('pin-device-btn');
        if (!pinBtn) return;
        const isPinned = localStorage.getItem('pinned_device_user') === this.activeHunterEmail;
        pinBtn.className = isPinned ? 'pin-device-btn is-pinned' : 'pin-device-btn';
        pinBtn.innerText = isPinned ? '📌 Device Pinned to This Email' : '📌 Pin Device to This Email';
    },

    switchHunterEmail: function(newEmail) { 
        if (newEmail) this.loadHunterByEmail(newEmail, this.activePlatform); 
    },
    switchPlatform: function(code) { 
        if (code) this.loadHunterByEmail(this.activeHunterEmail, code); 
    },

    render: function() {
        this.cleanupOrphanedElements();
        const container = document.getElementById('section-container');
        if (!container) return;

        container.innerHTML = '';

        // Cross-Platform Telemetry Header Deck
        const total = this.hunterData.length || 1;
        const earnedCount = this.hunterData.filter(t => t.current >= t.goal).length;
        const progressPercent = Math.round((earnedCount / total) * 100);

        const psTel = this.crossPlatformTelemetry.playstation || { earned: 0, percent: 0 };
        const pcTel = this.crossPlatformTelemetry.pc || { earned: 0, percent: 0 };
        const xboxTel = this.crossPlatformTelemetry.xbox || { earned: 0, percent: 0 };

        const headerDeck = document.createElement("div");
        headerDeck.style.cssText = "grid-column: 1/-1; background:#151c27; padding:16px 20px; border-radius:10px; border:1px solid #273447; margin-bottom:14px; display:flex; flex-direction:column; gap:12px;";
        headerDeck.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <strong style="color:#fff; font-size:1.15rem;">🎯 COTW Cross-Platform Milestone Telemetry</strong>
                    <div style="font-size:0.8rem; color:#94a3b8; margin-top:3px;">
                        Active Sync: <strong>${this.activeHunterEmail}</strong> &bull; Platform: <strong>${this.activePlatform.toUpperCase()}</strong>
                    </div>
                </div>
                <div>
                    <span class="badge" style="background:#28374d; color:var(--accent-gold); font-size:0.9rem; padding:6px 12px; border-radius:4px;">
                        ${earnedCount} / ${total} Complete (${progressPercent}%)
                    </span>
                </div>
            </div>

            <div style="width:100%; height:10px; background:rgba(255,255,255,0.06); border-radius:5px; overflow:hidden;">
                <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #0088ff, #2ecc71); border-radius:5px; transition: width 0.4s ease;"></div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:4px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border:1px solid #1c2738;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                        <span style="color:#00a6ed; font-weight:700;">🎮 PlayStation</span>
                        <strong style="color:#fff;">${psTel.earned}/${total} (${psTel.percent}%)</strong>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                        <div style="width:${psTel.percent}%; height:100%; background:#00a6ed;"></div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                        <span style="color:#00d2d3; font-weight:700;">🖥️ PC / Steam</span>
                        <strong style="color:#fff;">${pcTel.earned}/${total} (${pcTel.percent}%)</strong>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                        <div style="width:${pcTel.percent}%; height:100%; background:#00d2d3;"></div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                        <span style="color:#2ecc71; font-weight:700;">❎ Xbox Network</span>
                        <strong style="color:#fff;">${xboxTel.earned}/${total} (${xboxTel.percent}%)</strong>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                        <div style="width:${xboxTel.percent}%; height:100%; background:#2ecc71;"></div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(headerDeck);

        this.renderGrindTelemetryCard(container);

        const cats = [...new Set(this.hunterData.map(t => t.cat))];
        let globalMet = 0, globalTotal = 0;

        cats.forEach(cat => {
            const items = this.hunterData.filter(t => t.cat === cat);
            let catMet = 0;
            items.forEach(t => {
                if (t.type === 'checklist') t.current = t.subItems.filter(s => s.done).length;
                const done = t.current >= t.goal;
                if (done) catMet++;
                globalTotal++;
                if (done) globalMet++;
            });

            const sectionId = cat.replace(/[^a-zA-Z0-9]/g, '');
            const isCollapsed = this.collapsedSections[sectionId] !== false;
            const percent = items.length > 0 ? Math.round((catMet / items.length) * 100) : 0;

            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
            section.id = sectionId;
            section.innerHTML = `
                <div class="category-header" onclick="appState.toggleSection('${sectionId}')">
                    <h2>${cat}</h2>
                    <div style="font-weight:900; font-size: 0.85rem; color: #ff5500;">${catMet}/${items.length} (${percent}%)</div>
                </div>
                <div class="section-content"><div class="trophy-grid"></div></div>
            `;

            const grid = section.querySelector('.trophy-grid');
            items.forEach(t => {
                const card = document.createElement('div');
                const isDone = t.current >= t.goal;
                card.className = `trophy-card ${isDone ? 'completed' : ''}`;

                let ctrl = '';
                if (t.type === 'numeric') {
                    ctrl = `
                        <div class="number-control-group">
                            <button type="button" onclick="appState.adj('${t.id}', -1)">-</button>
                            <input type="number" value="${t.current}" min="0" max="${t.goal}" onchange="appState.setVal('${t.id}', this.value)">
                            <span class="number-goal-label">/ ${t.goal}</span>
                            <button type="button" onclick="appState.adj('${t.id}', 1)">+</button>
                        </div>
                    `;
                } else if (t.type === 'checklist') {
                    const dropClass = appState.openDropdowns[t.id] ? 'show' : '';
                    let subItemsHTML = t.subItems.map((s, idx) => `
                        <div class="sub-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:0.85rem;">${s.name}</span>
                            <button type="button" class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : ''}</button>
                        </div>
                    `).join('');
                    ctrl = `<button type="button" class="dropdown-trigger ${isDone ? 'lock-badge' : ''}" onclick="appState.toggleDrop('${t.id}')">Audit Registry (${t.current}/${t.goal})</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    ctrl = `<button type="button" class="toggle-btn ${isDone ? 'lock-badge' : ''}" onclick="appState.tog('${t.id}')">${isDone ? 'Audit Verified' : 'Mark Harvested'}</button>`;
                }

                card.innerHTML = `
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${this.getIcon(t)}" class="trophy-icon-img" alt="">
                        <div>
                            <div class="trophy-badges-row">
                                <span class="trophy-rank rank-${t.rank}">${t.rank}</span>
                                ${t.isArc ? `<span class="mode-badge is-solo">🔒 Solo Arc</span>` : `<span class="mode-badge is-shared">🌐 Universal</span>`}
                            </div>
                            <div style="font-weight:900; font-size:0.9rem;">${t.name}</div>
                        </div>
                    </div>
                    <p style="font-size:0.75rem; color:#cbd5e1; margin:12px 0;">${t.desc}</p>
                    ${ctrl}
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const overall = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
        const bar = document.getElementById('overall-bar');
        if (bar) bar.style.width = overall + '%';
        const pText = document.getElementById('percent-text');
        if (pText) pText.innerText = `Master Completion Progress ${overall}%`;
    },

    renderGrindTelemetryCard: function(container) {
        const card = document.createElement('div');
        card.className = 'grind-card-container';

        const reserves = this.masterCatalog?.reserves || {};
        const reserveOptions = Object.keys(reserves).map(res => 
            `<option value="${res}" ${res === this.activeReserve ? 'selected' : ''}>${res}</option>`
        ).join('');

        card.innerHTML = `
            <div class="grind-card-header">
                <div>
                    <h3 style="margin:0; color:#ff5500;">🎯 Field Grind & Harvest Card</h3>
                    <span style="font-size:0.8rem; color:#94a3b8;">Reserve: <strong>${this.activeReserve}</strong></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" id="session-mode-btn" class="session-toggle-btn ${this.sessionMode === 'single' ? 'is-single' : 'is-multi'}" onclick="appState.toggleSessionMode()">
                        ${this.sessionMode === 'single' ? '🎮 Mode: Single Player (Story Active)' : '👥 Mode: Multiplayer (Story Muted)'}
                    </button>
                </div>
            </div>

            <!-- LIVE CULL BOARD -->
            <div style="background: rgba(15, 23, 42, 0.65); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 85, 0, 0.35); margin-bottom: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-weight:900; font-size:0.85rem; color:#ff5500;">🏹 Active Reserve Cull Board</span>
                    <span id="active-species-count-badge" style="font-size:0.8rem; color:#f8fafc; font-weight:700;">Loading map culls...</span>
                </div>
                <div id="reserve-cull-board" class="reserve-cull-grid" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
            </div>

            <div class="gauge-container">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
                    <span>Min Tier</span>
                    <span>Sweet Spot (1-33 Drift Window)</span>
                    <span>Max Tier</span>
                </div>
                <div class="gauge-bar-bg"><div id="sweet-spot-gauge" class="gauge-bar-fill"></div></div>
                <div id="sweet-spot-readout" style="font-size:0.8rem; color:#f8fafc;">Calculating moving average...</div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Select Active Reserve Map</label>
                    <select id="grind-reserve-select" class="grind-select" onchange="appState.handleReserveChange(this.value)">
                        ${reserveOptions}
                        <option value="__CUSTOM__">✍️ + Enter Custom Reserve...</option>
                    </select>
                    <div id="custom-reserve-wrap" style="display:none; margin-top:6px;">
                        <input type="text" id="custom-reserve-input" class="grind-input" placeholder="Type custom reserve..." oninput="appState.activeReserve = this.value.trim()">
                    </div>
                </div>
                <div>
                    <label class="grind-input-label">Select Target Species</label>
                    <select id="grind-species-select" class="grind-select" onchange="appState.handleSpeciesSelectChange(this.value)"></select>
                    <div id="custom-species-wrap" style="display:none; margin-top:6px;">
                        <input type="text" id="custom-species-input" class="grind-input" placeholder="Type custom species..." oninput="appState.activeSpecies = this.value.trim()">
                    </div>
                </div>
            </div>

            <!-- NEED ZONE SCHEDULE -->
            <div class="grind-grid-2col" style="background: rgba(30, 41, 59, 0.4); padding: 12px; border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.15); margin-top:10px;">
                <div>
                    <label class="grind-input-label">Need Zone Activity</label>
                    <select id="needzone-type-select" class="grind-select" onchange="appState.updateNeedZoneSchedule()">
                        <option value="Drinking" selected>Drinking 💧</option>
                        <option value="Feeding">Feeding 🌾</option>
                        <option value="Resting">Resting 💤</option>
                        <option value="None">None / Travelling</option>
                    </select>
                </div>
                <div>
                    <label class="grind-input-label">In-Game Active Hours</label>
                    <input type="text" id="needzone-time-input" class="grind-input" placeholder="e.g. 08:00 - 12:00">
                </div>
            </div>

            <div style="margin: 8px 0;">
                <button type="button" class="pin-device-btn" style="width: 100%; min-height: 40px; background: #0284c7; color: #fff; font-size: 0.85rem;" onclick="appState.pinNeedZone()">
                    📌 Pin Need Zone to Map Ledger (/need_zones)
                </button>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Harvest Weight (kg / lbs) *Required</label>
                    <input type="number" id="harvest-weight" class="grind-input" placeholder="e.g. 94.5" step="0.1">
                </div>
                <div>
                    <label class="grind-input-label">Difficulty Level</label>
                    <select id="harvest-level" class="grind-select">
                        <option value="1">1 - Trivial</option>
                        <option value="2">2 - Minor</option>
                        <option value="3">3 - Very Easy</option>
                        <option value="4">4 - Easy</option>
                        <option value="5" selected>5 - Medium</option>
                        <option value="6">6 - Hard</option>
                        <option value="7">7 - Very Hard</option>
                        <option value="8">8 - Mythical</option>
                        <option value="9">9 - Legendary (Diamond)</option>
                        <option value="10">10 - Fabled (Great One 👑)</option>
                    </select>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Shot Distance (Meters)</label>
                    <input type="number" id="harvest-distance" class="grind-input" placeholder="e.g. 150">
                </div>
                <div>
                    <label class="grind-input-label">Weapon</label>
                    <input type="text" id="harvest-weapon-input" class="grind-input" list="weapons-datalist" placeholder="Select or type weapon...">
                    <datalist id="weapons-datalist"></datalist>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Hit Organ / Placement</label>
                    <input type="text" id="harvest-organ-input" class="grind-input" list="organs-datalist" placeholder="Select or type placement...">
                    <datalist id="organs-datalist"></datalist>
                </div>
                <div>
                    <label class="grind-input-label">Fur Variant & Sex</label>
                    <div style="display:flex; gap:8px;">
                        <select id="harvest-fur" class="grind-select" style="width:60%;">
                            <option value="Common" selected>Common</option>
                            <option value="Albino">Albino 🐇</option>
                            <option value="Melanistic">Melanistic 🖤</option>
                            <option value="Piebald">Piebald ⚪</option>
                            <option value="Leucistic">Leucistic ❄</option>
                            <option value="Fabled">Fabled 👑</option>
                        </select>
                        <select id="harvest-sex" class="grind-select" style="width:40%;">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Trophy Rating</label>
                    <select id="harvest-rating" class="grind-select">
                        <option value="none">No Rating</option>
                        <option value="bronze">Bronze 🥉</option>
                        <option value="silver">Silver 🥈</option>
                        <option value="gold">Gold 🥇</option>
                        <option value="diamond">Diamond 💎</option>
                        <option value="greatone">Great One 👑</option>
                    </select>
                </div>
                <div>
                    <label class="grind-input-label">Zone Rotation Mode</label>
                    <button type="button" id="zone-toggle-btn" class="zone-toggle-btn is-main" onclick="appState.setZoneType(appState.zoneType === 'main' ? 'exterior' : 'main')">
                        🎯 Main Rotation Zone
                    </button>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Coordinates (Lat / Long)</label>
                    <div style="display:flex; gap:8px;">
                        <input type="number" id="coord-lat" class="grind-input" placeholder="Lat (Y)" oninput="appState.onCoordinateInput()">
                        <input type="number" id="coord-long" class="grind-input" placeholder="Long (X)" oninput="appState.onCoordinateInput()">
                    </div>
                </div>
                <div>
                    <label class="grind-input-label">Region & Sub-Region</label>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="harvest-region" class="grind-input" placeholder="Region" style="width:50%;">
                        <input type="text" id="harvest-subregion" class="grind-input" placeholder="Sub-Region" style="width:50%;">
                    </div>
                </div>
            </div>

            <div>
                <label class="grind-input-label">Trophy Screenshot (Optional)</label>
                <input type="file" id="harvest-screenshot-file" class="grind-input file-input" accept="image/*" onchange="appState.handleImageSelection(event)">
            </div>

            <div id="screenshot-preview-container" class="preview-box" style="display:none;">
                <img id="screenshot-preview" src="" alt="Harvest Preview" class="preview-img">
            </div>

            <button type="button" class="log-harvest-btn" onclick="appState.logHarvest()">
                📝 Log Harvest & Sync Telemetry
            </button>
        `;

        container.appendChild(card);
        this.populateDatalist('weapons-datalist', this.knownWeaponsList);
        this.populateDatalist('organs-datalist', this.knownOrgansList);
        this.updateSpeciesDropdown();
    },

    getIcon: (t) => t.playstationImage ? t.playstationImage : (t.cat.includes('Collectibles') ? '//placehold.co/44x44/1e293b/facc15?text=TRK' : t.name.includes('Arc') || t.name.includes('Missions') ? '//placehold.co/44x44/1e293b/a855f7?text=ARC' : '//placehold.co/44x44/1e293b/ff8800?text=GAME'),
    adj: function(id, val) { const t = this.hunterData.find(x => x.id === id); if (t) { t.current = Math.min(t.goal, Math.max(0, Number(t.current) + val)); this.sync(); } },
    setVal: function(id, rawVal) { const t = this.hunterData.find(x => x.id === id); if (t) { const n = parseInt(rawVal, 10); t.current = isNaN(n) ? 0 : Math.min(t.goal, Math.max(0, n)); this.sync(); } },
    tog: function(id) { const t = this.hunterData.find(x => x.id === id); if (t) { t.current = t.current === 0 ? 1 : 0; this.sync(); } },
    check: function(id, idx) { const t = this.hunterData.find(x => x.id === id); if (t && t.subItems[idx]) { t.subItems[idx].done = !t.subItems[idx].done; this.sync(); } },

    adjRank: async function(tier, val) {
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val);
        this.updateRankUI();
        if (!this.db || !this.auth?.currentUser) return;
        try {
            const rankRef = doc(this.db, 'users', this.activeSanitizedKey, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
            await setDoc(rankRef, this.animalRankData, { merge: true });
        } catch (e) { console.error("Rank Save Error:", e); }
    },

    updateRankUI: function() {
        Object.keys(this.animalRankData).forEach(k => {
            const el = document.getElementById(`rank-val-${k}`);
            if (el) el.innerText = this.animalRankData[k];
        });
    },

    toggleSection: function(id) { this.collapsedSections[id] = !this.collapsedSections[id]; this.render(); },
    toggleDrop: function(id) { const el = document.getElementById('drop-' + id); if (el) { el.classList.toggle('show'); this.openDropdowns[id] = el.classList.contains('show'); } },

    safeSetValue: function(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    },

    sync: async function(silent = false) {
        this.recalculateCrossTrophyTelemetry();
        this.render();
        this.updateRankUI();
        if (!this.db || !this.auth?.currentUser) return;
        if (!silent) this.setStatus("⏳ Saving to Cloud Firestore...", "#e67e22");
        try {
            const ref = doc(this.db, 'users', this.activeSanitizedKey, 'platform', this.activePlatform, 'progress', GAME_ID);
            await setDoc(ref, {
                userEmail: this.activeHunterEmail,
                sanitizedKey: this.activeSanitizedKey,
                platform: this.activePlatform,
                gameId: GAME_ID,
                trophies: this.hunterData,
                lastUpdate: Date.now()
            }, { merge: true });
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
            this.setStatus(`✓ Saved to Cloud Firestore [${this.activeHunterEmail}] at ${timeStr}`, "#10b981");
        } catch (e) {
            console.error("Firestore Write Error:", e);
            this.setStatus(`❌ Save Failed: ${e.message}`, "#ef4444");
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    window.appState = appState;
    window.adjRank = (tier, val) => appState.adjRank(tier, val);
    appState.init();
});
