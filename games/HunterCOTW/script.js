/* === SECTION: File Header & Configuration === */
/*
 * ==========================================
 * VERSION TIMESTAMP: Tue, July 28, 2026, 07:00 AM EDT
 * SYSTEM: theHunter: Call of the Wild Master Tracker (script.js)
 * ARCHITECTURE: Pure Firebase Firestore Engine (Single-Sign-On & Platform Isolation)
 * RESTORATION: 100% FULL SOURCE REGISTRY RESTORED - ZERO STRIPPING / ZERO OMISSIONS
 * ==========================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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
const ADMIN_EMAIL = "raykevin71888@gmail.com";

// Strict Group Hierarchy Sorting Index (1 to 6 Left-to-Right)
const GROUP_ORDER = {
    'home': 1,
    'user': 2,
    'game': 3,
    'entertainment': 4,
    'discord': 5,
    'co-site': 6
};

// Primary Email -> Operator Nickname Mapping
const EMAIL_OPERATOR_MAP = {
    "raykevin71888@gmail.com": "Werewolf3788",
    "cartnalray9@gmail.com": "Raymystyro"
};

// Comprehensive Gamertag & Real Name Identity Mapping Matrix
const USER_DATA_MAP = {
    // Werewolf3788
    'Werewolf3788': 'Werewolf3788', 'werewolf3788': 'Werewolf3788',
    'WildHorse_Spirit': 'Werewolf3788', 'wildhorse_spirit': 'Werewolf3788',
    'Kevin_Ray': 'Werewolf3788', 'Kevin Ray': 'Werewolf3788', 'kevin ray': 'Werewolf3788', 'Kevin Frutiger': 'Werewolf3788',

    // Raymystyro
    'Raymystyro': 'Raymystyro', 'raymystyro': 'Raymystyro',
    'OneLIVIDMAN': 'Raymystyro', 'onelividman': 'Raymystyro',
    'Ray_Cartnal': 'Raymystyro', 'Ray Cartnal': 'Raymystyro', 'ray cartnal': 'Raymystyro',

    // terrdog420
    'terrdog420': 'terrdog420', 'Terrdog420': 'terrdog420',
    'Darkwing69420': 'terrdog420', 'darkwing69420': 'terrdog420',
    'TJ': 'terrdog420', 'tj': 'terrdog420', 'Terry_Johnson': 'terrdog420', 'Terry Johnson': 'terrdog420',

    // DesdemonaTiger
    'DesdemonaTiger': 'DesdemonaTiger', 'desdemonatiger': 'DesdemonaTiger', 'Desdemona Tiger': 'DesdemonaTiger'
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

// --- MASTER TROPHY & COLLECTIBLES REGISTRY (UNCOMPRESSED & UNSTRIPPED) ---
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

    // --- MEDVED TAIGA ---
    { id: 'med_campaign_main', cat: 'DLC: Medved-Taiga', name: 'Campaign Missions', rank: 'gold', current: 0, goal: 32, type: 'checklist', desc: 'The largest campaign in the game with 32 narrative missions.', subItems: checkSet(["Missions 1-8", "Missions 9-16", "Missions 17-24", "Missions 25-32"]) },
    { id: 'med_side_registry', cat: 'DLC: Medved-Taiga', name: 'Side Mission Registry', rank: 'gold', current: 0, goal: 50, type: 'numeric', desc: 'Complete all 50 side missions across the Taiga.' },
    { id: 'med_anatoly', cat: 'DLC: Medved-Taiga', name: 'Dr. Anatoly Barnyashev Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: 'Main arc.', subItems: checkSet(["The Best Defense", "Out of the Way", "The Lost One", "A Grave Concern", "A New Home"]) },
    { id: 'med_columbus', cat: 'DLC: Medved-Taiga', name: 'Dr. Columbus Neidell Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: 'Main arc.', subItems: checkSet(["The New World", "A Helping Hand", "Into the Unknown", "The High Ground", "The Heart of the Taiga"]) },
    { id: 'med_pushkin', cat: 'DLC: Medved-Taiga', name: 'Dimitri Pushkin Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Side arc.', subItems: checkSet(["The Frozen Eye", "The Dead of Night", "In the Shadows", "The Light of Day"]) },
    { id: 'med_georgy', cat: 'DLC: Medved-Taiga', name: 'Georgy Grankin Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Side arc.', subItems: checkSet(["A Ghost from the Past", "The Old Guard", "The Last Stand", "A Quiet Night"]) },
    { id: 'med_katerina', cat: 'DLC: Medved-Taiga', name: 'Katerina Khasavovna Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Side arc.', subItems: checkSet(["The Hunter's Path", "The Spirit of the Taiga", "The Great Bear", "The Final Test"]) },
    { id: 'med_svetlana', cat: 'DLC: Medved-Taiga', name: 'Dr. Svetlana Isakova Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Side arc.', subItems: checkSet(["The Heart of the Lake", "The Silent Sentinel", "The Frozen River", "The Eternal Winter"]) },

    // --- VURHONGA SAVANNA ---
    { id: 'vur_narrative_arc', cat: 'DLC: Vurhonga Savanna', name: 'Narrative Missions Arc', rank: 'silver', current: 0, goal: 16, type: 'checklist', desc: 'Grandfather Njabulo missions.', subItems: checkSet(["Missions 1-4", "Missions 5-8", "Missions 9-12", "Missions 13-16"]) },
    { id: 'vur_side_registry', cat: 'DLC: Vurhonga Savanna', name: 'Side Mission Registry', rank: 'silver', current: 0, goal: 46, type: 'numeric', desc: 'Complete all 46 side missions.' },

    // --- PARQUE FERNANDO ---
    { id: 'par_narrative_arc', cat: 'DLC: Parque Fernando', name: 'Narrative Missions Arc', rank: 'gold', current: 0, goal: 16, type: 'checklist', desc: 'Complete 16 story missions for Carolina Vargas.', subItems: checkSet(["Narrative 1-4", "Narrative 5-8", "Narrative 9-12", "Narrative 13-16"]) },
    { id: 'par_side_registry', cat: 'DLC: Parque Fernando', name: 'Side Mission Registry', rank: 'gold', current: 0, goal: 39, type: 'numeric', desc: 'Complete all 39 side missions.' },

    // --- YUKON VALLEY ---
    { id: 'yuk_main_arc', cat: 'DLC: Yukon Valley', name: 'Warden Jim Murray Arc', rank: 'gold', current: 0, goal: 10, type: 'checklist', desc: 'Full Main Mission Story.', subItems: checkSet(["Welcome to Alaska", "Quarantine", "The Cost of Control", "Picking Up, Dropping Off", "Raise the Barrier", "A Place to Hang Your Hat", "Flash Point", "Tech Support", "A Mine of information", "Gabriella Baden: Bigfoot Hunter"]) },

    // --- CUATRO COLINAS ---
    { id: 'cua_narrative_arc', cat: 'DLC: Cuatro Colinas', name: 'Narrative Missions Arc', rank: 'gold', current: 0, goal: 14, type: 'checklist', desc: 'Complete 14 story missions for Doña Alejandra.', subItems: checkSet(["Narrative 1-4", "Narrative 5-8", "Narrative 9-12", "Narrative 13-14"]) },

    // --- SILVER RIDGE PEAKS ---
    { id: 'srp_narrative_arc', cat: 'DLC: Silver Ridge', name: 'Allan Bradley Arc', rank: 'gold', current: 0, goal: 15, type: 'checklist', desc: 'Complete story missions.', subItems: checkSet(["Missions 1-4", "Missions 5-8", "Missions 9-12", "Missions 13-15"]) },
    { id: 'srp_species_audit', cat: 'DLC: Silver Ridge', name: 'Peaks Species Harvest', rank: 'gold', current: 0, goal: 9, type: 'checklist', desc: 'Harvest every Peaks species.', subItems: checkSet(["Merriam Turkey", "Pronghorn", "Mountain Goat", "Rocky Mountain Bighorn Sheep", "Mountain Lion", "Mule Deer", "Black Bear", "Rocky Mountain Elk", "Plains Bison"]) },

    // --- LAYTON LAKE COLLECTIBLES ---
    { id: 'coll_layton_outposts', cat: 'List of Collectibles', name: 'Layton Lake - Outposts', rank: 'bronze', current: 0, goal: 18, type: 'checklist', subItems: formatAlphaCheckset(["Balmont Northern Outpost [8689, 9040]", "Balmont Outpost [9919, 10265]", "Balmont Railroad Outpost [9557, 10760]", "Calburn Outpost [10956, 5643]", "Cheelah Outpost [10811, 8337]", "Cheelah Southern Outpost [12401, 9051]", "Chopeeka Outpost [8867, 4422]", "High Lake Outpost [8874, 6169]", "Highlake Southern Outpost [9271, 7636]", "Mount Leviathan Outpost [12291, 10108]", "Mount Kraken Outpost [7393, 7962]", "Norden Eastern Outpost [12815, 7068]", "Norden Northern Outpost [12651, 4186]", "Norden Outpost [11629, 7719]", "Roonachee Outpost [7417, 10161]", "Roonachee Western Outpost [6005, 10738]", "Willipeg Outpost [6723, 5209]", "Willipeg Southern Outpost [6667, 6601]"]) }
];

const appState = {
    activeHunter: 'Werewolf3788',
    activePlatform: 'ps5',
    loggedInOperator: null,
    isCurrentUserAdmin: false,
    activeMapCategory: 'DLC: Silver Ridge',
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, rareFur: 0 },
    auth: null, db: null,
    collapsedSections: {},
    openDropdowns: {}, 
    liveUnsub: null,
    dataLoaded: false,
    currentLightboxData: { categoryId: null, subIdx: null, imgIdx: 0 },

    applyTheme: function(primary, secondary) {
        const p = primary || '#ff8800';
        const s = secondary || '#38bdf8';
        document.documentElement.style.setProperty('--primary-color', p);
        document.documentElement.style.setProperty('--secondary-color', s);
        document.documentElement.style.setProperty('--hunter-color', p);
        document.documentElement.style.setProperty('--hunter-glow', `${p}99`);
    },

    syncUserTheme: async function(operatorHandle) {
        if (!this.db || !operatorHandle) return;
        try {
            const userDocRef = doc(this.db, 'users', operatorHandle);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.primaryColor || data.secondaryColor) {
                    this.applyTheme(data.primaryColor, data.secondaryColor);
                }
            }
        } catch (e) {
            console.warn("Theme sync notice:", e.message);
        }
    },

    canEditActiveHunter: function() {
        if (this.isCurrentUserAdmin) return true;
        if (!this.loggedInOperator) return false;
        return this.loggedInOperator.toLowerCase() === this.activeHunter.toLowerCase();
    },

    parseCSVLine: function(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
                current += '"'; i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    },

    checkIsActiveTab: function(targetUrl, targetName) {
        if (!targetUrl || targetUrl === '#') return false;

        const pageTitle = document.title.toLowerCase().trim();
        const cleanTargetUrl = targetUrl.split('?')[0].split('#')[0].toLowerCase().trim();
        const targetFilename = cleanTargetUrl.substring(cleanTargetUrl.lastIndexOf('/') + 1);

        const currentPath = window.location.pathname.toLowerCase();
        const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'cotw.html';
        const currentHash = window.location.hash.toLowerCase();

        if (currentHash && targetUrl.toLowerCase().includes(currentHash)) return true;
        if (targetFilename && targetFilename === currentFilename) return true;

        if (targetName) {
            const cleanName = targetName.toLowerCase().trim();
            if (pageTitle.includes(cleanName) || cleanName.includes(pageTitle)) return true;
        }

        return false;
    },

    /* === SECTION: Google Sheets Navigation Loader ("Website Menu" Tab) === */
    loadNavigation: async function() {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv&t=' + Date.now();

        try {
            const response = await fetch(csvUrl);
            const data = await response.text();
            const rows = data.split(/\r?\n/).filter(line => line.trim() !== "");

            const groupsMap = {};

            for (let i = 1; i < rows.length; i++) {
                const columns = this.parseCSVLine(rows[i]);
                if (columns.length >= 3) {
                    const name = columns[0];            // Column A (Name)
                    const groupName = columns[1];       // Column B (Group)
                    const targetUrl = columns[2];       // Column C (Url with UTM)
                    const imageUrl = columns[3] || '';  // Column D (Images)

                    if (!name || !groupName) continue;

                    if (!groupsMap[groupName]) {
                        groupsMap[groupName] = [];
                    }

                    groupsMap[groupName].push({
                        name: name,
                        url: targetUrl || '#',
                        image: imageUrl
                    });
                }
            }

            // Group Order Sorting: 1. Home -> 2. User -> 3. Game -> 4. Entertainment -> 5. Discord -> 6. Co-Site
            const sortedGroups = Object.keys(groupsMap).map(groupName => {
                const orderKey = groupName.toLowerCase().trim();
                return {
                    name: groupName,
                    weight: GROUP_ORDER[orderKey] || 99,
                    items: groupsMap[groupName]
                };
            }).sort((a, b) => a.weight - b.weight);

            this.renderNav(sortedGroups);

        } catch (err) {
            console.error("Error loading navigation CSV:", err);
        }
    },

    renderNav: function(sortedGroups) {
        const container = document.getElementById('dynamic-nav-links');
        if (!container) return;

        let html = '';

        sortedGroups.forEach(group => {
            const hasActiveChild = group.items.some(item => this.checkIsActiveTab(item.url, item.name));

            // Group Header: Yellow (#facc15) if active, Pure White (#ffffff) if inactive
            const groupBtnClass = hasActiveChild
                ? 'text-[#facc15] font-black border-b-2 border-[#facc15] drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                : 'text-white hover:text-[#facc15] font-bold';

            const dropdownItemsHtml = group.items.map(item => {
                const active = this.checkIsActiveTab(item.url, item.name);
                const itemClass = active
                    ? 'flex items-center gap-2 px-4 py-2 text-xs font-black text-[#facc15] bg-slate-800 border-l-4 border-[#facc15]'
                    : 'flex items-center gap-2 px-4 py-2 text-xs text-white hover:bg-slate-800 hover:text-[#facc15] transition-colors';

                const imgTag = item.image 
                    ? `<img src="${item.image}" class="w-4 h-4 rounded object-cover shrink-0" alt="" onerror="this.style.display='none'">` 
                    : '';

                return `<a href="${item.url}" class="${itemClass}">${imgTag}<span>${item.name}</span></a>`;
            }).join('');

            html += `
                <div class="relative group/dropdown inline-block">
                    <button class="${groupBtnClass} py-1 px-3 text-xs uppercase tracking-wider flex items-center gap-1 focus:outline-none">
                        <span>${group.name}</span>
                        <i class="fa-solid fa-chevron-down text-[10px] opacity-70"></i>
                    </button>
                    <div class="hidden group-hover/dropdown:block absolute right-0 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
                        ${dropdownItemsHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    init: async function() {
        this.loadNavigation();
        this.setupActiveMapControls();
        this.setupPlatformControls();

        try {
            const app = initializeApp(firebaseConfig, 'COTW-Master-App');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            await setPersistence(this.auth, browserLocalPersistence);

            this.setupAuthPipelineUI();

            onAuthStateChanged(this.auth, (user) => { 
                this.handleAuthState(user);
            });
        } catch (err) {
            console.error("Init Error:", err);
        }
    },

    setupActiveMapControls: function() {
        const mapSelect = document.getElementById('activeMapSelector');
        if (mapSelect) {
            mapSelect.value = this.activeMapCategory;
            mapSelect.addEventListener('change', (e) => {
                this.activeMapCategory = e.target.value;
                this.updateActiveMapDisplay();
                if (this.canEditActiveHunter()) this.sync();
            });
        }
    },

    setupPlatformControls: function() {
        const pSelect = document.getElementById('platformSelect');
        if (pSelect) {
            pSelect.value = this.activePlatform;
            pSelect.addEventListener('change', (e) => {
                this.activePlatform = e.target.value;
                this.loadHunter(this.activeHunter);
            });
        }
    },

    setupAuthPipelineUI: function() {
        const adminSelect = document.getElementById('adminUserSelect');
        if (adminSelect) {
            adminSelect.addEventListener('change', (e) => {
                const selectedHandle = USER_DATA_MAP[e.target.value] || e.target.value;
                this.loadHunter(selectedHandle);
            });
        }

        const googleBtn = document.getElementById("googleSignInBtn");
        if (googleBtn) {
            googleBtn.addEventListener("click", () => {
                if (this.auth) signInWithPopup(this.auth, new GoogleAuthProvider());
            });
        }

        const signOutBtn = document.getElementById("signOutBtn");
        if (signOutBtn) {
            signOutBtn.addEventListener("click", () => {
                if (this.auth) signOut(this.auth);
            });
        }
    },

    handleAuthState: function(user) {
        const googleBtn = document.getElementById("googleSignInBtn");
        const userStatus = document.getElementById("userProfileStatus");
        const userAvatar = document.getElementById("userAvatar");
        const demoBanner = document.getElementById("demoNotification");
        const adminBadge = document.getElementById("adminBadge");
        const adminWrapper = document.getElementById("adminOperatorSelectWrapper");

        if (user) {
            const userEmail = (user.email || "").toLowerCase();
            this.isCurrentUserAdmin = userEmail === ADMIN_EMAIL.toLowerCase();

            // Extract Operator Nickname Handle from Email or Matrix
            const rawName = user.displayName || userEmail.split('@')[0];
            this.loggedInOperator = EMAIL_OPERATOR_MAP[userEmail] || USER_DATA_MAP[rawName] || USER_DATA_MAP[user.displayName] || rawName;

            if (!this.isCurrentUserAdmin) {
                this.activeHunter = this.loggedInOperator;
            }

            if (demoBanner) demoBanner.style.display = "none";
            if (googleBtn) googleBtn.style.display = "none";
            if (userStatus) userStatus.style.display = "flex";
            if (userAvatar) {
                userAvatar.src = user.photoURL || "https://placehold.co/42x42/1e293b/ff8800?text=U";
                userAvatar.classList.remove('hidden');
            }

            if (this.isCurrentUserAdmin) {
                if (adminBadge) adminBadge.style.display = "block";
                if (adminWrapper) adminWrapper.style.display = "block";
            } else {
                if (adminBadge) adminBadge.style.display = "none";
                if (adminWrapper) adminWrapper.style.display = "none";
            }

            this.loadHunter(this.activeHunter);

        } else {
            this.loggedInOperator = null;
            this.isCurrentUserAdmin = false;

            if (googleBtn) googleBtn.style.display = "inline-block";
            if (userStatus) userStatus.style.display = "none";
            if (demoBanner) demoBanner.style.display = "block";
            if (adminBadge) adminBadge.style.display = "none";
            if (adminWrapper) adminWrapper.style.display = "none";

            this.loadHunter(this.activeHunter);
        }
    },

    loadHunter: function(name) {
        if (!this.db) return;

        const dbDocName = USER_DATA_MAP[name] || name;
        
        this.dataLoaded = false;
        if (this.liveUnsub) {
            this.liveUnsub();
            this.liveUnsub = null;
        }

        this.activeHunter = dbDocName;

        const nameEl = document.getElementById('hunter-name');
        const targetEl = document.getElementById('displayTargetOperator');
        if (nameEl) nameEl.innerText = dbDocName.toUpperCase();
        if (targetEl) targetEl.innerText = dbDocName;

        this.syncUserTheme(dbDocName);

        const userProgressRef = doc(this.db, 'users', dbDocName, 'progress', GAME_ID);

        this.liveUnsub = onSnapshot(userProgressRef, (snap) => {
            let freshTrophyData = JSON.parse(JSON.stringify(trophyData));
            let freshRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, rareFur: 0 };

            if (snap.exists()) {
                const data = snap.data();
                let incoming = data.trophies || data.progress || [];

                if (data.animalRankData) {
                    freshRankData = { ...freshRankData, ...data.animalRankData };
                }

                freshTrophyData = freshTrophyData.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                return {...si, done: dbMatch?.done === true || dbMatch?.completed === true};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            dt.current = found.done ? dt.goal : (Number(found.current) || 0);
                        }
                    }
                    return dt;
                });
            }

            this.hunterData = freshTrophyData;
            this.animalRankData = freshRankData;
            this.dataLoaded = true;

            this.updateRankUI();
            this.updateActiveMapDisplay();
            this.render();
        });
    },

    updateActiveMapDisplay: function() {
        const titleEl = document.getElementById('activeMapTitle');
        const statsEl = document.getElementById('activeMapStatsText');
        
        let cleanName = this.activeMapCategory.replace('DLC: ', '');
        if (titleEl) titleEl.innerText = cleanName;

        const mapItems = this.hunterData.filter(t => t.cat === this.activeMapCategory);
        let completedCount = 0;
        
        mapItems.forEach(t => {
            if (t.type === 'checklist') {
                if (t.subItems.filter(s => s.done).length >= t.goal) completedCount++;
            } else if (t.current >= t.goal) completedCount++;
        });

        const totalItems = mapItems.length;
        const percent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        if (statsEl) {
            statsEl.innerText = `Map Progress: ${completedCount} / ${totalItems} Completed (${percent}%)`;
        }
    },

    render: function() {
        const container = document.getElementById('section-container');
        const selector = document.getElementById('reserve-selector');
        if (!container) return; 
        
        const canEdit = this.canEditActiveHunter();

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
                const disabledAttr = canEdit ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"';
                
                if (t.type === 'numeric') {
                    const btnClass = isDone ? 'controls lock-badge' : 'controls';
                    const displayVal = isDone ? `AUDIT VERIFIED (${t.current}/${t.goal})` : `${t.current}/${t.goal}`;
                    ctrl = `<div class="${btnClass}">
                        <button ${disabledAttr} style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', -1)">-</button>
                        <span style="flex-grow:1; text-align:center;">${displayVal}</span>
                        <button ${disabledAttr} style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', 1)">+</button>
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
                                        <button ${disabledAttr} class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : ''}</button>
                                    </div>
                                    ${galleryHTML}
                                </div>`;
                    }).join('');

                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? (canEdit ? 'Audit Verified (Undo)' : 'Audit Verified') : 'Mark Harvested';
                    ctrl = `<button ${disabledAttr} class="${btnClass}" style="cursor: pointer;" onclick="appState.tog('${t.id}')">${btnText}</button>`;
                }
                
                card.innerHTML = `<div style="display:flex; gap:10px; align-items:center;"><img src="${this.getIcon(t)}" class="trophy-icon-img"><div><span class="trophy-rank rank-${t.rank}">${t.rank}</span><div style="font-weight:900; font-size:0.9rem; margin-top:4px;">${t.name}</div></div></div><p style="font-size:0.75rem; font-style:italic; margin:15px 0; color:#cbd5e1; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${t.desc}</p>${ctrl}`;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });
        
        const overall = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
        if (document.getElementById('overall-bar')) document.getElementById('overall-bar').style.width = overall + '%';
        if (document.getElementById('percent-text')) document.getElementById('percent-text').innerText = `Master Platinum Progress ${overall}% ${canEdit ? '' : '(READ-ONLY VIEW)'}`;
        
        this.updateActiveMapDisplay();
    },

    getIcon: (t) => t.psnImage ? t.psnImage : (t.cat.includes('Collectibles') ? ICONS.TRACK : t.name.includes('Arc') || t.name.includes('Master') || t.name.includes('Missions') ? ICONS.ARC : t.name.includes('Mile') ? ICONS.TRAVEL : t.name.includes('Marksman') ? ICONS.MARK : ICONS.GAME),

    adj: function(id, val) { 
        if (!this.dataLoaded || !this.canEditActiveHunter()) return;
        const t = this.hunterData.find(x => x.id === id); 
        if (t) { t.current = Math.max(0, t.current + val); this.sync(); }
    },
    
    tog: function(id) { 
        if (!this.dataLoaded || !this.canEditActiveHunter()) return;
        const t = this.hunterData.find(x => x.id === id); 
        if (t) { t.current = t.current === 0 ? 1 : 0; this.sync(); }
    },
    
    check: function(id, idx) { 
        if (!this.dataLoaded || !this.canEditActiveHunter()) return;
        const t = this.hunterData.find(x => x.id === id); 
        if (t && t.subItems && t.subItems[idx]) { t.subItems[idx].done = !t.subItems[idx].done; this.sync(); }
    },
    
    adjRank: function(tier, val) { 
        if (!this.dataLoaded || !this.canEditActiveHunter()) return;
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

    scrollToCategory: function(id) { if(!id) return; this.collapsedSections[id] = false; this.render(); setTimeout(() => { if(document.getElementById(id)) document.getElementById(id).scrollIntoView({ behavior: 'smooth' }) }, 100); },

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

    sync: async function() {
        this.render();
        if (!this.db || !this.dataLoaded || !this.canEditActiveHunter()) return;

        try {
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'progress', GAME_ID);
            
            const payload = {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                animalRankData: this.animalRankData,
                trophies: this.hunterData,
                lastUpdated: new Date().toISOString(),
                updatedBy: this.loggedInOperator
            };

            await setDoc(userProgressRef, payload, { merge: true });
            console.log(`✓ Progress saved under /users/${this.activeHunter}/progress/${GAME_ID}`);
        } catch (err) {
            console.error("Firestore Save Error:", err);
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
