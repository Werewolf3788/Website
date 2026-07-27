/* === SECTION: File Header & Config === */
/*
 * ==========================================
 * VERSION TIMESTAMP: Mon, July 27, 2026, 06:35 PM EDT
 * SYSTEM: theHunter: Call of the Wild Master Tracker (script.js)
 * ARCHITECTURE: 100% Pure Firebase Firestore Real-Time Engine (Zero LocalStorage Data)
 * PATH STRUCTURE: /users/{userId}/progress/thehunter-call-of-the-wild
 * FEATURES: Rare Fur Animal Rank Mapping, Dual Data Consolidation, Google Auth Pipeline & PSN Tag Persistence
 * ==========================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692"
};

const GAME_ID = 'thehunter-call-of-the-wild';

// Strict Firestore Username Mapping Matrix
const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'Terrdog420': 'terrdog420',
    'TJ': 'terrdog420',
    'tj': 'terrdog420'
};

const ICONS = {
    GAME: "https://placehold.co/44x44/1e293b/ff8800?text=GAME",
    ARC: "https://placehold.co/44x44/1e293b/a855f7?text=ARC",
    PHOTO: "https://placehold.co/44x44/1e293b/ef4444?text=PIC",
    TRAVEL: "https://placehold.co/44x44/1e293b/3b82f6?text=MOVE",
    MARK: "https://placehold.co/44x44/1e293b/22c55e?text=AIM",
    TRACK: "https://placehold.co/44x44/1e293b/facc15?text=TRK"
};

const checkSet = (items) => items.map(name => ({name, done: false}));

const formatAlphaCheckset = (items) => {
    return items
        .sort((a, b) => {
            const nameA = typeof a === 'string' ? a : a.name;
            const nameB = typeof b === 'string' ? b : b.name;
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        })
        .map((item, idx) => {
            if (typeof item === 'string') {
                return { name: `${idx + 1}. ${item}`, done: false, images: [] };
            } else {
                return { name: `${idx + 1}. ${item.name}`, done: false, images: item.images || [] };
            }
        });
};

// --- FULL TROPHY & COLLECTIBLES REGISTRY ---
const trophyData = [
    // --- BASE GAME ---
    { id: 'plat_cotw', cat: 'Base Game', name: 'theHunter', rank: 'platinum', current: 0, goal: 1, type: 'toggle', plat: false, desc: 'Collect every trophy.' },
    { id: 'head_shoulder_knees_toes', cat: 'Base Game', name: 'Head Shoulders Knees & Toes', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: "Head Shoulders Knees & Toes" },
    { id: 'the_mile', cat: 'Base Game', name: 'The Mile', rank: 'bronze', current: 0, goal: 1, type: 'numeric', plat: true, desc: 'Travel 1 mile on foot.' },
    { id: 'scand_mile', cat: 'Base Game', name: 'Scandinavian Mile', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, desc: 'Travel 6.2 miles on foot.' },
    { id: 'marathon', cat: 'Base Game', name: 'The Marathon', rank: 'silver', current: 0, goal: 26.2, type: 'numeric', plat: true, desc: 'Travel 26.2 miles on foot.' },
    { id: 'ultra', cat: 'Base Game', name: 'Ultramarathon', rank: 'gold', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Travel 100 miles on foot.' },
    { id: 'jager', cat: 'Base Game', name: 'Jäger Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Gerlinde Jäger's arc.", subItems: checkSet(["Welcome to Hirschfelden", "First Impression", "The Jäger Family", "A New Friend", "Gerlinde's Request"]) },
    { id: 'sommer', cat: 'Base Game', name: 'Sommer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Robert Sommer's arc.", subItems: checkSet(["Sommer's Challenge", "Tracking the Pack", "Wild Boar Protection", "Corn Field Harvest", "The Red Deer King"]) },
    { id: 'bhandari', cat: 'Base Game', name: 'Bhandari Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Vinay Bhandari's arc.", subItems: checkSet(["Fox Den Tracking", "Bhandari's Concern", "Protecting the Wheat", "The Albino Fox", "Bhandari's Legacy"]) },
    { id: 'fleischer', cat: 'Base Game', name: 'Fleischer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Albertina Fleischer's arc.", subItems: checkSet(["Fallow Deer Hunt", "Fleischer's Land", "Subregion Harvest", "The Night Hunt", "Fleischer's Pride"]) },
    { id: 'tressler', cat: 'Base Game', name: 'Tressler Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Marwin Tressler's arc.", subItems: checkSet(["Roe Deer Tracking", "Tressler's Territory", "Invasive Species", "The European Bison", "Tressler's Final Call"]) },
    { id: 'hope', cat: 'Base Game', name: 'Hope Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Richard Hope's arc.", subItems: checkSet(["Welcome to Layton", "Hope's Camp", "The Blacktail Deer", "Hope's Resolve", "The Sick Bear"]) },
    { id: 'trampfine', cat: 'Base Game', name: 'Trampfine Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Jonathan Trampfine's arc.", subItems: checkSet(["The Coyote Problem", "Trampfine's Request", "Pest Control", "The Night Caller", "Trampfine's Success"]) },
    { id: 'vualez', cat: 'Base Game', name: 'Vualez Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Fiona Vualez's arc.", subItems: checkSet(["Vualez's Map", "The Elk Hunt", "Protecting the Forest", "The Ghost Elk", "Vualez's Findings"]) },
    { id: 'connors', cat: 'Base Game', name: 'Connors Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Emily Connors's arc.", subItems: checkSet(["Connors's Challenge", "The Black Bear Hunt", "Mountain Tracking", "The Legendary Bear", "Connors's Conclusion"]) },
    { id: 'beatty', cat: 'Base Game', name: 'Beatty Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Paul Beatty's arc.", subItems: checkSet(["Beatty's Request", "The Moose Harvest", "Subregion Control", "The Great Bull", "Beatty's Reward"]) },
    { id: 'hir_master', cat: 'Base Game', name: 'Hirschfelden Master', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Central Europe arcs.' },
    { id: 'lay_master', cat: 'Base Game', name: 'Layton Lake Master', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all PNW arcs.' },
    { id: 'novice_m', cat: 'Base Game', name: 'Novice Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 50m+.' },
    { id: 'skilled_m', cat: 'Base Game', name: 'Skilled Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 100m+.' },
    { id: 'expert_m', cat: 'Base Game', name: 'Expert Marksman', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 200m+.' },
    { id: 'legend_m', cat: 'Base Game', name: 'Legendary Marksman', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 400m+.' },
    { id: 'moby_deer', cat: 'Base Game', name: 'Moby Deer', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest albino deer.' },
    { id: 'hero_h', cat: 'Base Game', name: 'Hero of Hirschfelden', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest in every subregion.' },
    { id: 'lord_l', cat: 'Base Game', name: 'Lord of the Lakes', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest in every subregion.' },
    { id: 'stay_target', cat: 'Base Game', name: 'Stay On Target', rank: 'bronze', current: 0, goal: 50, type: 'numeric', plat: true, desc: '50 tracks same animal.' },
    { id: 'persistence', cat: 'Base Game', name: 'Persistence Is Futile', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: '100 tracks same animal.' },
    { id: 'stalker', cat: 'Base Game', name: 'Stalker', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Spot 100 animals.' },
    { id: 'leave_no', cat: 'Base Game', name: 'Leave No Animal Behind', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hidden Trophy.' },
    { id: 'scarecrow', cat: 'Base Game', name: 'Scarecrow', rank: 'bronze', current: 0, goal: 1000, type: 'numeric', plat: true, desc: 'Scare 1000 animals.' },
    { id: 'not_zombie', cat: 'Base Game', name: 'Not A Zombie Game', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: true, desc: '10 brain hit kills.' },
    { id: 'diamonds_ever', cat: 'Base Game', name: 'Diamonds Forever', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a diamond rating.' },
    { id: 'goldmember', cat: 'Base Game', name: 'Goldmember', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a gold rating.' },
    { id: 'seeing_believing', cat: 'Base Game', name: 'Seeing is Believing', rank: 'bronze', current: 0, goal: 10, type: 'numeric', plat: true, desc: 'Spot 10 animals.' },
    { id: 'jack_trades', cat: 'Base Game', name: 'Jack Of Trades', rank: 'gold', current: 0, goal: 4, type: 'numeric', plat: true, desc: '4 different weapons.' },
    { id: 'blind_shot', cat: 'Base Game', name: 'Blind Shot', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest barely visible.' },
    { id: 'calls_wild_play', cat: 'Base Game', name: 'Call of the Wild', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Use every animal caller.' },
    { id: 'insomniac_hunt', cat: 'Base Game', name: 'Insomniac', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest at night.' },
    { id: 'globetrotter_hunt', cat: 'Base Game', name: 'Globetrotter', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Every subregion.' },
    { id: 'up_close_personal', cat: 'Base Game', name: 'Up Close', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Within 15m.' },
    { id: 'paparazzi_hunt', cat: 'Base Game', name: 'Wildlife Paparazzi', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Photo unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'potty_humor_hunt', cat: 'Base Game', name: 'Potty Humor', rank: 'bronze', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Examine 100 droppings.' },
    { id: 'make_it_count_hunt', cat: 'Base Game', name: 'Make It Count', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Last round in mag.' },
    { id: 'silver_lining_hunt', cat: 'Base Game', name: 'Silver Lining', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Silver rating.' },
    { id: 'something_hunt', cat: 'Base Game', name: "It's Something", rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Bronze rating.' },
    { id: 'bucket_list_hunt', cat: 'Base Game', name: 'Bucket List', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Spot unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'eavesdropping_hunt', cat: 'Base Game', name: 'Eavesdropping', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Identify calls.' },
    { id: 'nerves_of_steel_hunt', cat: 'Base Game', name: 'Nerves of Steel', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Elevated heart rate.' },
    { id: 'old_fashioned_way_hunt', cat: 'Base Game', name: 'Old Fashioned', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Unscoped rifle.' },
    { id: 'head_shoulders_knees', cat: 'Base Game', name: 'Positional Mastery', rank: 'silver', current: 0, goal: 3, type: 'numeric', plat: true, desc: 'Stand, Kneel, Prone.' },

    // --- LIST OF COLLECTIBLES WRAPPER ---
    { 
        id: 'coll_layton_outposts', cat: 'List of Collectibles', name: 'Layton Lake - Outposts', rank: 'bronze', current: 0, goal: 18, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Balmont Northern Outpost [8689, 9040]", "Balmont Outpost [9919, 10265]", "Balmont Railroad Outpost [9557, 10760]", "Calburn Outpost [10956, 5643]",
            "Cheelah Outpost [10811, 8337]", "Cheelah Southern Outpost [12401, 9051]", "Chopeeka Outpost [8867, 4422]", "High Lake Outpost [8874, 6169]",
            "Highlake Southern Outpost [9271, 7636]", "Mount Leviathan Outpost [12291, 10108]", "Mount Kraken Outpost [7393, 7962]", "Norden Eastern Outpost [12815, 7068]",
            "Norden Northern Outpost [12651, 4186]", "Norden Outpost [11629, 7719]", "Roonachee Outpost [7417, 10161]", "Roonachee Western Outpost [6005, 10738]",
            "Willipeg Outpost [6723, 5209]", "Willipeg Southern Outpost [6667, 6601]"
        ])
    },
    { 
        id: 'coll_layton_lookouts', cat: 'List of Collectibles', name: 'Layton Lake - Lookout Points', rank: 'bronze', current: 0, goal: 16, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Balmont Eastern Lookout Point [9846, 10814]", "Balmont Northern Lookout Point [8308, 9512]", "Balmont Western Lookout Point [8298, 11106]", "Calburn Eastern Lookout Point [11535, 4763]",
            "Calburn Western Lookout Point [9763, 4971]", "Cheelah Lookout Point [11897, 8973]", "Chopeeka Eastern Lookout Point [8094, 4357]", "Chopeeka Western Lookout Point [5896, 4394]",
            "High Lake Northern Lookout Point [8758, 6524]", "High Lake Southern Lookout Point [9763, 8266]", "Mount Kraken Lookout Point [7628, 7544]", "Mount Leviathan Lookout Point [11447, 11119]",
            "Norden Eastern Lookout Point [12341, 7510]", "Norden Western Lookout Point [10984, 7205]", "Roonachee Lookout Point [6596, 10074]", "Willipeg Lookout Point [6795, 5879]"
        ])
    }
];

const appState = {
    activeHunter: 'Werewolf3788',
    psnUsername: 'werewolf3788',
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, rareFur: 0 },
    auth: null, db: null,
    collapsedSections: {},
    openDropdowns: {}, 
    psnSynced: false,
    liveUnsub: null,
    dataLoaded: false,
    refreshIntervalId: null,
    currentLightboxData: { categoryId: null, subIdx: null, imgIdx: 0 },

    /* === COOKIE PREFERENCE ENGINE === */
    setGamertagCookie: function(gamertag) {
        const d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = `cotw_active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    },

    getGamertagCookie: function() {
        const name = "cotw_active_gamertag=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },

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
                        <button class="nav-dropbtn">${groupName} ▾</button>
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

    init: async function() {
        // 1. URL Query Parameter auto-selection
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        if (userParam && USER_DATA_MAP[userParam]) {
            this.activeHunter = USER_DATA_MAP[userParam];
            this.setGamertagCookie(this.activeHunter);
        } else {
            // 2. Cookie Fallback
            const saved = this.getGamertagCookie();
            if (saved && USER_DATA_MAP[saved]) {
                this.activeHunter = USER_DATA_MAP[saved];
            } else {
                this.activeHunter = 'Werewolf3788';
            }
        }
        
        this.loadNavigation();
        this.setupAuthPipelineUI();
        
        try {
            const app = initializeApp(firebaseConfig, 'COTW-Master-App');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            signInAnonymously(this.auth).catch(err => {
                console.error("FIREBASE AUTH ERROR:", err);
            });

            onAuthStateChanged(this.auth, (user) => { 
                this.handleAuthState(user);
            });
        } catch (err) {
            console.error("Init Error:", err);
        }
        this.render();
    },

    setupAuthPipelineUI: function() {
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = this.activeHunter;
            userSelect.addEventListener('change', (e) => {
                this.switchHunter(e.target.value);
            });
        }

        const addCustomBtn = document.getElementById('addCustomUserBtn');
        if (addCustomBtn) {
            addCustomBtn.addEventListener('click', () => {
                const inputTag = prompt("Enter Custom Gamer Tag / Profile Handle:");
                if (inputTag && inputTag.trim() !== "") {
                    const cleanTag = inputTag.trim();
                    this.setGamertagCookie(cleanTag);
                    
                    if (userSelect) {
                        const opt = document.createElement('option');
                        opt.value = cleanTag;
                        opt.innerText = cleanTag;
                        opt.selected = true;
                        userSelect.appendChild(opt);
                    }
                    this.switchHunter(cleanTag);
                }
            });
        }

        const saveIdentityBtn = document.getElementById('saveIdentityBtn');
        if (saveIdentityBtn) {
            saveIdentityBtn.addEventListener('click', () => {
                const customName = document.getElementById('profileCustomName')?.value || this.activeHunter;
                const psnUser = document.getElementById('profilePsnUser')?.value || "";
                
                this.activeHunter = customName;
                this.psnUsername = psnUser;
                this.setGamertagCookie(customName);
                this.sync();
                alert(`Saved Identity: ${customName} (PSN: ${psnUser})`);
            });
        }
    },

    handleAuthState: function(user) {
        const googleSignInBtn = document.getElementById("googleSignInBtn");
        const signOutBtn = document.getElementById("signOutBtn");
        const userProfileStatus = document.getElementById("userProfileStatus");
        const userAvatar = document.getElementById("userAvatar");
        const demoBanner = document.getElementById("demoNotification");
        const adminBadge = document.getElementById("adminBadge");

        if (googleSignInBtn && !googleSignInBtn.dataset.listener) {
            googleSignInBtn.dataset.listener = "true";
            googleSignInBtn.addEventListener("click", () => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(this.auth, provider)
                    .then((result) => console.log("Logged in as:", result.user.displayName))
                    .catch((err) => console.error("Login rejected:", err));
            });
        }

        if (signOutBtn && !signOutBtn.dataset.listener) {
            signOutBtn.dataset.listener = "true";
            signOutBtn.addEventListener("click", () => {
                signOut(this.auth).then(() => {
                    if (demoBanner) demoBanner.style.display = "block";
                    if (adminBadge) adminBadge.style.display = "none";
                    if (googleSignInBtn) googleSignInBtn.style.display = "inline-block";
                    if (userProfileStatus) userProfileStatus.style.display = "none";
                });
            });
        }

        if (user) {
            this.loadHunter(this.activeHunter);
            
            if (!user.isAnonymous) {
                if (demoBanner) demoBanner.style.display = "none";
                if (googleSignInBtn) googleSignInBtn.style.display = "none";
                if (userProfileStatus) userProfileStatus.style.display = "flex";
                if (userAvatar) userAvatar.src = user.photoURL || "";

                if (user.email === "raykevin71888@gmail.com") {
                    if (adminBadge) adminBadge.style.display = "block";
                }
            }

            if (document.getElementById('stat-line')) {
                document.getElementById('stat-line').innerText = `SYNCED DB: ${firebaseConfig.projectId} | USER: ${user.uid}`;
            }
        }
    },

    // Consolidated Firestore Path: /users/{userId}/progress/thehunter-call-of-the-wild
    loadHunter: function(name) {
        if (!this.auth.currentUser) return;

        const dbDocName = USER_DATA_MAP[name] || name;

        this.hunterData = JSON.parse(JSON.stringify(trophyData));
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, rareFur: 0 };
        this.dataLoaded = false;

        this.activeHunter = dbDocName;
        this.setGamertagCookie(dbDocName);
        
        if (document.getElementById('hunter-name')) document.getElementById('hunter-name').innerText = dbDocName.toUpperCase();
        if (document.getElementById('profileCustomName')) document.getElementById('profileCustomName').value = dbDocName;

        if (this.liveUnsub) this.liveUnsub();

        const userProgressRef = doc(this.db, 'users', dbDocName, 'progress', GAME_ID);
        
        this.liveUnsub = onSnapshot(userProgressRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                let incoming = data.trophies || data.progress || [];
                
                if (data.animalRankData) {
                    this.animalRankData = { 
                        ...this.animalRankData, 
                        ...data.animalRankData,
                        rareFur: data.animalRankData.rareFur ?? data.animalRankData.albino ?? 0 
                    };
                    this.updateRankUI();
                }

                if (data.psnUsername) {
                    this.psnUsername = data.psnUsername;
                    if (document.getElementById('profilePsnUser')) document.getElementById('profilePsnUser').value = data.psnUsername;
                }

                this.hunterData = this.hunterData.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                const isDone = dbMatch?.done === true || dbMatch?.done === "true" || dbMatch?.completed === true;
                                return {...si, done: isDone};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            if (found.done === true || found.completed === true || found.collected === true) {
                                dt.current = dt.goal;
                            } else {
                                dt.current = Number(found.current) || 0; 
                            }
                        }
                    }
                    return dt;
                });
            } else {
                // First Time Auto-Initialize
                this.dataLoaded = true;
                this.sync();
            }
            this.dataLoaded = true;
            this.render();
        }, (error) => {
            console.error("Firestore Document Listener Error: ", error);
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
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', -1)">-</button>
                        <span style="flex-grow:1; text-align:center;">${displayVal}</span>
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', 1)">+</button>
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
                        return `<div class="sub-item" style="flex-direction: column; align-items: flex-start;">
                                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                        <span>${s.name}</span>
                                        <button class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : ''}</button>
                                    </div>
                                    ${galleryHTML}
                                </div>`;
                    }).join('');

                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? 'Audit Verified (Undo)' : 'Mark Harvested';
                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.tog('${t.id}')">${btnText}</button>`;
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
    
    adj: function(id, val) { const t = this.hunterData.find(x => x.id === id); t.current = Math.max(0, t.current + val); this.sync(); },
    
    tog: function(id) { const t = this.hunterData.find(x => x.id === id); t.current = t.current === 0 ? 1 : 0; this.sync(); },
    
    check: function(id, idx) { const t = this.hunterData.find(x => x.id === id); t.subItems[idx].done = !t.subItems[idx].done; this.sync(); },
    
    adjRank: function(tier, val) { 
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val); 
        this.updateRankUI(); 
        this.sync();
    },
    
    updateRankUI: function() { Object.keys(this.animalRankData).forEach(k => { const el = document.getElementById(`rank-val-${k}`); if (el) el.innerText = this.animalRankData[k]; }); },
    
    toggleSection: function(id) { const cur = this.collapsedSections[id] !== false; this.collapsedSections[id] = !cur; this.render(); },
    
    toggleDrop: function(id) { 
        const el = document.getElementById('drop-' + id);
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

    // --- Lightbox Controls ---
    openLightbox: function(categoryId, subIdx, imgIdx) {
        this.currentLightboxData = { categoryId, subIdx, imgIdx };
        this.updateLightboxView();
        document.getElementById('lightbox').style.display = 'block';
    },

    closeLightbox: function(e) {
        if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
            document.getElementById('lightbox').style.display = 'none';
        }
    },

    changeLightboxImage: function(direction) {
        const { categoryId, subIdx } = this.currentLightboxData;
        const t = this.hunterData.find(x => x.id === categoryId);
        const images = t.subItems[subIdx].images;
        
        this.currentLightboxData.imgIdx += direction;
        if (this.currentLightboxData.imgIdx < 0) this.currentLightboxData.imgIdx = images.length - 1;
        if (this.currentLightboxData.imgIdx >= images.length) this.currentLightboxData.imgIdx = 0;
        
        this.updateLightboxView();
    },

    updateLightboxView: function() {
        const { categoryId, subIdx, imgIdx } = this.currentLightboxData;
        const t = this.hunterData.find(x => x.id === categoryId);
        const subItem = t.subItems[subIdx];
        
        const imgEl = document.getElementById('lightbox-img');
        const captionEl = document.getElementById('lightbox-caption');
        
        imgEl.src = subItem.images[imgIdx];
        
        let viewType = "Angle View";
        if (imgIdx === 0) viewType = "Map View (Zoomed Out)";
        if (imgIdx === 1) viewType = "Map View (Zoomed In)";
        
        captionEl.innerText = `${subItem.name} - ${viewType} (${imgIdx + 1} of ${subItem.images.length})`;
    },
    
    // Direct Cloud Save to /users/{userId}/progress/thehunter-call-of-the-wild
    sync: async function() { 
        this.render(); 
        if (!this.db || !this.auth.currentUser || !this.dataLoaded) return;

        try {
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'progress', GAME_ID);
            const userRef = doc(this.db, 'users', this.activeHunter);

            const payload = {
                user: this.activeHunter,
                psnUsername: this.psnUsername,
                gameId: GAME_ID,
                animalRankData: this.animalRankData,
                trophies: this.hunterData,
                lastUpdated: new Date().toISOString()
            };

            await setDoc(userRef, { displayName: this.activeHunter, lastUpdated: new Date().toISOString() }, { merge: true });
            await setDoc(userProgressRef, payload, { merge: true }); 
            
            console.log(`Live broadcast pushed cleanly to Firestore for: ${this.activeHunter} at /users/${this.activeHunter}/progress/${GAME_ID}`);
        } catch (error) {
            console.error("FIREBASE TRACKER SAVE ERROR:", error);
            if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `TRACKER SYNC ERROR: ${error.message}`;
        }
    }
};

window.appState = appState; 
window.adjRank = (tier, val) => appState.adjRank(tier, val);

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
