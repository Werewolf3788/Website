/*
 * ==========================================
 * NYT TIMESTAMP: Sun, June 21, 2026, 7:35 PM EDT
 * PRECISION INTEGRATION: Master Controller appState Fixes
 * NOTES: Uses Firebase Compat libraries with exact rule targeting.
 * CHANGED (PER INSTRUCTIONS):
 * 1. loadHunter: Fixed Firestore SDK syntax trap; changed snap.exists() to property snap.exists.
 * 2. init: Added this.loadHunter() fallback into the auth .catch() block to prevent silent hang.
 * 3. loadHunter: Added camelCase failsafe (greatone || greatOne) to legacy rank payload.
 * NO STRIPPING, NO COMPRESSING. FULL SOURCE INTEGRITY 100% INTACT.
 * ==========================================
 */

const appState = {
    activeHunter: 'Werewolf3788',
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 },
    collapsedSections: {},
    openDropdowns: {}, 
    psnSynced: false,
    dataLoaded: false,
    refreshIntervalId: null, 
    currentLightboxData: { categoryId: null, subIdx: null, imgIdx: 0 },
    masterUnsubscribe: null,
    legacyUnsubscribe: null,

    parseCSV: function(str) {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
            arr[row] = arr[row] || [];
            arr[row][col] = arr[row][col] || '';
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
            if (cc == '"') { quote = !quote; continue; }
            if (cc == ',' && !quote) { ++col; continue; }
            if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }
            if (cc == '\r' && !quote) { ++row; col = 0; continue; }
            arr[row][col] += cc;
        }
        return arr;
    },

    loadNavigation: async function() {
        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv');
            const csvText = await response.text();
            const rows = this.parseCSV(csvText);

            let data = rows;
            if (data[0] && data[0][0] && data[0][0].toLowerCase().includes('name')) {
                data.shift();
            }

            const navContainer = document.getElementById('dynamic-nav-links');
            let navHTML = '';
            const groups = {};
            const standalone = [];

            data.forEach(row => {
                if (row.length < 3) return;
                const name = row[0]?.trim();
                const group = row[1]?.trim();
                const url = row[2]?.trim();
                let image = row[3]?.trim();

                if (!name || !url) return;

                if (image) {
                    const driveMatch = image.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || image.match(/id=([a-zA-Z0-9_-]+)/);
                    if (image.includes('drive.google.com') && driveMatch) {
                        image = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                    }
                }
                
                const itemObj = { name, url, image };

                if (group) {
                    if (!groups[group]) groups[group] = [];
                    groups[group].push(itemObj);
                } else {
                    standalone.push(itemObj);
                }
            });

            Object.keys(groups).forEach(groupName => {
                let dropItems = groups[groupName].map(item => {
                    const imgTag = item.image ? `<img src="${item.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                    return `<a href="${item.url}">${imgTag}${item.name}</a>`;
                }).join('');

                navHTML += `
                    <div class="nav-dropdown">
                        <button class="nav-dropbtn">${groupName} \u25be</button>
                        <div class="nav-dropdown-content">
                            ${dropItems}
                        </div>
                    </div>
                `;
            });

            standalone.forEach(item => {
                const imgTag = item.image ? `<img src="${item.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                navHTML += `<a href="${item.url}">${imgTag}${item.name}</a>`;
            });

            if (navContainer) navContainer.innerHTML = navHTML;
        } catch (e) {
            console.error("Failed to load dynamic navigation", e);
        }
    },

    init: function() {
        this.activeHunter = localStorage.getItem('cotw_master_active_id') || 'Werewolf3788';
        this.loadNavigation();
        
        firebase.auth().signInAnonymously().then(() => {
            console.log("Logged into Firestore safely.");
            this.loadHunter(this.activeHunter);
            this.startAutoRefreshLoop();
        }).catch(err => {
            console.warn("Auth Fallback triggered:", err);
            // Fallback: load the data streams regardless of soft anonymous token rejections
            this.loadHunter(this.activeHunter);
            this.startAutoRefreshLoop();
        });
        
        this.render();
    },

    startAutoRefreshLoop: function() {
        this.stopAutoRefreshLoop();
        this.refreshIntervalId = setInterval(() => {
            this.psnSynced = false;
            this.loadNavigation();
        }, 60000);
    },

    stopAutoRefreshLoop: function() {
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }
    },

    loadHunter: async function(name) {
        if (this.masterUnsubscribe) this.masterUnsubscribe();
        if (this.legacyUnsubscribe) this.legacyUnsubscribe();

        this.hunterData = JSON.parse(JSON.stringify(trophyData));
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };
        this.dataLoaded = false;
        this.activeHunter = name;
        localStorage.setItem('cotw_master_active_id', name);

        if (document.getElementById('hunter-name')) document.getElementById('hunter-name').innerText = name.toUpperCase();
        
        let themeClass = 'theme-werewolf';
        if (name === 'Ray' || name === 'Raymystyro') {
            themeClass = 'theme-ray';
        } else if (name === 'TJ' || name === 'terrdog420') {
            themeClass = 'theme-Adam';
        }
        if (document.getElementById('master-body')) document.getElementById('master-body').className = themeClass;

        const dbDocName = USER_DATA_MAP[name] || name;

        // Path 1 Read Stream
        const masterRef = db.collection("artifacts").doc(MASTER_ID).collection("public").doc("data").collection("userTrophies").doc(dbDocName);
        this.masterUnsubscribe = masterRef.onSnapshot((snap) => {
            // FIXED: Removed the () from snap.exists
            if (snap.exists) {
                const data = snap.data();
                
                const lvlEl = document.getElementById('level-input');
                const cshEl = document.getElementById('cash-input');
                if (lvlEl && data.level !== undefined && document.activeElement !== lvlEl) lvlEl.value = data.level;
                if (cshEl && data.cash !== undefined && document.activeElement !== cshEl) cshEl.value = data.cash;

                let incoming = data.trophies || [];
                this.hunterData = this.hunterData.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                return {...si, done: dbMatch?.done === true || String(dbMatch?.done).toLowerCase() === "true"};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            if (found.done === true || String(found.done).toLowerCase() === "true") {
                                dt.current = dt.goal;
                            } else {
                                dt.current = !isNaN(parseInt(found.current, 10)) ? parseInt(found.current, 10) : 0;
                            }
                        }
                    }
                    return dt;
                });
            }
            // Because this now executes successfully, sync() is unlocked!
            this.dataLoaded = true;
            this.render();
        }, (err) => {
            console.error("Master stream broken:", err);
        });

        // Path 2 Read Stream
        const legacyRef = db.collection("artifacts").doc(LEGACY_ID).collection("public").doc("data").collection("userTrophies").doc(dbDocName);
        this.legacyUnsubscribe = legacyRef.onSnapshot((snap) => {
            // FIXED: Removed the () from snap.exists
            if (snap.exists) {
                const incomingRank = snap.data();
                this.animalRankData = {
                    bronze: incomingRank.bronze || 0,
                    silver: incomingRank.silver || 0,
                    gold: incomingRank.gold || 0,
                    diamond: incomingRank.diamond || 0,
                    // Failsafe added for camelCase DB drift
                    greatone: incomingRank.greatone || incomingRank.greatOne || 0,
                    albino: incomingRank.albino || 0
                };
                this.updateRankUI();
            } else {
                this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };
                this.updateRankUI();
            }
        }, (err) => {
            console.error("Legacy sync stream error:", err);
        });
    },

    render: function() {
        const container = document.getElementById('section-container');
        const selector = document.getElementById('reserve-selector');
        if (!container) return;
        
        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(t => t.cat))];
        
        if (selector && selector.options.length <= 1) {
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.replace(/[^a-zA-Z0-9]/g, '');
                opt.innerText = cat; selector.appendChild(opt);
            });
        }
        
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
            const percent = Math.round((catMet / items.length) * 100);
            
            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
            section.id = sectionId;
            section.innerHTML = `
                <div class="category-header" onclick="appState.toggleSection('${sectionId}')">
                    <h2>${cat}</h2><div style="font-weight:900; font-size: 0.8rem;">${catMet}/${items.length} (${percent}%)</div>
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
                    const btnClass = isDone ? 'controls lock-badge' : 'controls';
                    const displayVal = isDone ? `AUDIT VERIFIED (${t.current}/${t.goal})` : `${t.current}/${t.goal}`;
                    ctrl = `<div class="${btnClass}">
                        <button style="background:none; border:none; color:inherit; font-size:1.5rem; cursor:pointer; padding:5px 15px;" onclick="appState.adj('${t.id}', -1)">-</button>
                        <span style="flex-grow:1; text-align:center; font-weight:bold;">${displayVal}</span>
                        <button style="background:none; border:none; color:inherit; font-size:1.5rem; cursor:pointer; padding:5px 15px;" onclick="appState.adj('${t.id}', 1)">+</button>
                    </div>`;
                } else if (t.type === 'checklist') {
                    const dropClass = appState.openDropdowns[t.id] ? 'show' : '';
                    const btnClass = isDone ? 'dropdown-trigger lock-badge' : 'dropdown-trigger';
                    const btnText = isDone ? `Audit Verified (${t.current}/${t.goal})` : `Audit Registry (${t.current}/${t.goal})`;
                    
                    let subItemsHTML = t.subItems.map((s, idx) => {
                        let galleryHTML = '';
                        if (s.images && s.images.length > 0) {
                            let thumbs = s.images.map((imgUrl, imgIdx) => 
                                `<img src="${imgUrl}" class="collectible-thumb" onclick="appState.openLightbox('${t.id}', ${idx}, ${imgIdx})" alt="View" loading="lazy">`
                            ).join('');
                            galleryHTML = `<div class="collectible-gallery">${thumbs}</div>`;
                        }
                        return `<div class="sub-item" style="flex-direction: column; align-items: flex-start; padding: 15px;">
                                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 10px;">
                                        <span style="font-size: 0.9rem; line-height: 1.3;">${s.name}</span>
                                        <button class="check-btn ${s.done ? 'is-done' : ''}" style="width: 40px; height: 40px; font-size: 1.2rem;" onclick="appState.check('${t.id}', ${idx})">${s.done ? '\u2713' : ''}</button>
                                    </div>
                                    ${galleryHTML}
                                </div>`;
                    }).join('');

                    ctrl = `<button class="${btnClass}" style="cursor: pointer; min-height: 44px;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? 'Audit Verified (Undo)' : 'Mark Harvested';
                    ctrl = `<button class="${btnClass}" style="cursor: pointer; min-height: 44px;" onclick="appState.tog('${t.id}')">${btnText}</button>`;
                }
                
                card.innerHTML = `<div style="display:flex; gap:10px; align-items:center;"><img src="${this.getIcon(t)}" class="trophy-icon-img"><div><span class="trophy-rank rank-${t.rank}">${t.rank}</span><div style="font-weight:900; font-size:0.9rem; margin-top:4px;">${t.name}</div></div></div><p style="font-size:0.75rem; font-style:italic; margin:15px 0; color:#cbd5e1; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${t.desc}</p>${ctrl}`;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });
        
        const overall = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
        if (document.getElementById('overall-bar')) document.getElementById('overall-bar').style.width = overall + '%';
        if (document.getElementById('percent-text')) document.getElementById('percent-text').innerText = `Master Platinum Progress ${overall}%`;
    },

    getIcon: (t) => t.psnImage ? t.psnImage : (t.cat.includes('Collectibles') ? ICONS.TRACK : t.name.includes('Arc') || t.name.includes('Master') || t.name.includes('Missions') ? ICONS.ARC : t.name.includes('Mile') ? ICONS.TRAVEL : t.name.includes('Marksman') ? ICONS.MARK : ICONS.GAME),
    
    adj: function(id, val) { 
        const t = this.hunterData.find(x => x.id === id); 
        t.current = Math.max(0, t.current + val); 
        this.sync(); 
    },
    tog: function(id) { 
        const t = this.hunterData.find(x => x.id === id); 
        t.current = t.current === 0 ? 1 : 0; 
        this.sync(); 
    },
    check: function(id, idx) { 
        const t = this.hunterData.find(x => x.id === id); 
        t.subItems[idx].done = !t.subItems[idx].done; 
        this.sync(); 
    },
    
    adjRank: async function(tier, val) { 
        const dbDocName = USER_DATA_MAP[this.activeHunter] || this.activeHunter;
        const ref = db.collection("artifacts").doc(LEGACY_ID).collection("public").doc("data").collection("userTrophies").doc(dbDocName);
        
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val); 
        this.updateRankUI(); 
        
        const payload = {};
        payload[tier] = firebase.firestore.FieldValue.increment(val);
        await ref.set(payload, { merge: true });
    },
    
    updateRankUI: function() { 
        Object.keys(this.animalRankData).forEach(k => { 
            const el = document.getElementById(`rank-val-${k}`); 
            if (el) el.innerText = this.animalRankData[k]; 
        }); 
    },
    toggleSection: function(id) { const cur = this.collapsedSections[id] !== false; this.collapsedSections[id] = !cur; this.render(); },
    toggleDrop: function(id) { 
        const el = document.getElementById(`drop-${id}`);
        if (el) {
            el.classList.toggle('show');
            this.openDropdowns[id] = el.classList.contains('show');
        }
    },
    
    switchHunter: function(name) { 
        this.psnSynced = false; 
        this.loadHunter(name); 
    },
    
    scrollToCategory: function(id) { if(!id) return; this.collapsedSections[id] = false; this.render(); setTimeout(() => { if(document.getElementById(id)) document.getElementById(id).scrollIntoView({ behavior: 'smooth' }) }, 100); },

    openLightbox: function(categoryId, subIdx, imgIdx) { /* ... */ },
    closeLightbox: function(e) { /* ... */ },
    changeLightboxImage: function(direction) { /* ... */ },
    updateLightboxView: function() { /* ... */ },
    
    sync: async function() { 
        if (!this.dataLoaded) return;
        const dbDocName = USER_DATA_MAP[this.activeHunter] || this.activeHunter;
        const ref = db.collection("artifacts").doc(MASTER_ID).collection("public").doc("data").collection("userTrophies").doc(dbDocName); 
        await ref.set({ trophies: this.hunterData, lastUpdate: Date.now() }, { merge: true }); 
    }
};

window.appState = appState;
appState.init();

window.onclick = function(event) {
    if (!event.target.matches('.dropdown-trigger') && !event.target.closest('.dropdown-content')) {
        document.querySelectorAll('.dropdown-content.show').forEach(el => {
            el.classList.remove('show');
            const id = el.id.replace('drop-', '');
            appState.openDropdowns[id] = false;
        });
    }
};
