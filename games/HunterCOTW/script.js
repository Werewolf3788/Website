/*
 * ==========================================
 * NYT TIMESTAMP: Fri, June 12, 2026, 7:40 PM EDT
 * PRECISION INTEGRATION: Frontend JS Nervous System (script.js)
 * NOTES: FIXED CRITICAL SELF-REFERENCE INLINE ARRAY ARTIFACT CRASH.
 * Cleaned up the broken conditional ternary operators inside the early base game arc objects.
 * Reverted registries to pristine standalone checkSet pipelines to guarantee error-free compilation.
 * Formatted and re-indexed all map collectible lists (Layton, Hirschfelden, Medved, Vurhonga) 
 * alphabetically and sequentially with explicit numerical markers.
 * Real-time snapshots track exclusively via independent hunter document nodes to preserve site-wide websocket replication.
 * NO STRIPPING, NO COMPRESSING. FULL SOURCE INTEGRITY 100% INTACT.
 * ==========================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692"
};

const MASTER_ID = 'cotw-master';
const LEGACY_ID = 'cotw-trophy-display';

// --- FRONTEND PROFILE TO BACKEND SCRAPER JSON MAP ---
const USER_DATA_MAP = {
    'Werewolf3788': 'werewolf',
    'Ray': 'ray',
    'Raymystyro': 'ray'
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
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map((name, idx) => ({ name: `${idx + 1}. ${name}`, done: false }));
};

// --- FULL REGISTRY (UNCOMPRESSED & UNSTRIPPED) ---
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
    { id: 'med_park_arc', cat: 'DLC: Medved-Taiga', name: 'Medved Master', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'All missions.' },
    { id: 'med_apex', cat: 'DLC: Medved-Taiga', name: 'The Apex Hunter', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Harvest Taiga species.', subItems: checkSet(["Western Capercaillie", "Siberian Musk Deer", "Eurasian Lynx", "Wild Boar", "Gray Wolf", "Mountain Reindeer", "Eurasian Brown Bear", "Moose"]) },
    { id: 'med_sheds', cat: 'DLC: Medved-Taiga', name: 'Shed Hunter', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Collect all antler sheds.' },
    { id: 'med_paleo', cat: 'DLC: Medved-Taiga', name: 'Paleontology 101', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Find all artifacts.' },
    { id: 'med_critic', cat: 'DLC: Medved-Taiga', name: 'Art Critic', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Find all cave paintings.' },
    { id: 'med_pilgrim', cat: 'DLC: Medved-Taiga', name: 'Pilgrim', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Find all monuments.' },
    { id: 'med_field_notes', cat: 'DLC: Medved-Taiga', name: 'Field Notes', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Collect all field notes.' },
    { id: 'med_traps', cat: 'DLC: Medved-Taiga', name: 'Snares of the Taiga', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Find all traps with hares.' },

    // --- VURHONGA SAVANNA ---
    { id: 'vur_narrative_arc', cat: 'DLC: Vurhonga Savanna', name: 'Narrative Missions Arc', rank: 'silver', current: 0, goal: 16, type: 'checklist', desc: 'Grandfather Njabulo missions.', subItems: checkSet(["Missions 1-4", "Missions 5-8", "Missions 9-12", "Missions 13-16"]) },
    { id: 'vur_side_registry', cat: 'DLC: Vurhonga Savanna', name: 'Side Mission Registry', rank: 'silver', current: 0, goal: 46, type: 'numeric', desc: 'Complete all 46 side missions.' },
    { id: 'vur_species_audit', cat: 'DLC: Vurhonga Savanna', name: 'Savanna Species Harvest', rank: 'gold', current: 0, goal: 10, type: 'checklist', desc: 'Harvest every Savanna species.', subItems: checkSet(["Eurasian Wigeon", "Scrub Hare", "Side-Striped Jackal", "Springbok", "Warthog", "Lesser Kudu", "Blue Wildebeest", "Gemsbok", "Cape Buffalo", "Lion"]) },
    { id: 'vur_arc', cat: 'DLC: Vurhonga Savanna', name: 'Vurhonga Master Arc', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: 'All arcs.' },
    { id: 'vur_warden', cat: 'DLC: Vurhonga Savanna', name: 'Warden Missions Arc', rank: 'bronze', current: 0, goal: 10, type: 'checklist', desc: 'Main arc.', subItems: checkSet(["Welcome to Vurhonga", "Mind the Traps", "Across the Savanna", "Praise the Ancestors", "The History of All Tribes", "Mucking for Science", "Mampara", "The Last Rhino", "Traffic Jam", "Observe and Report"]) },
    { id: 'vur_mboweni', cat: 'DLC: Vurhonga Savanna', name: 'Mboweni Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Maria Mboweni.", subItems: checkSet(["Research", "Poachers", "Buffalo", "Tracking the King", "Mboweni's Legacy"]) },
    { id: 'vur_ospreay', cat: 'DLC: Vurhonga Savanna', name: 'Ospreay Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Flip Ospreay.", subItems: checkSet(["Ospreay's Outlook", "The Waterhole Hunt", "Pest Management", "Lion's Den", "Ospreay's Reward"]) },
    { id: 'vur_maritz', cat: 'DLC: Vurhonga Savanna', name: 'Maritz Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Dana Maritz.", subItems: checkSet(["Maritz's Findings", "The Rhino Tracking", "Illegal Traps", "The Poacher Catch", "Maritz's Gratitude"]) },
    { id: 'vur_brother', cat: 'DLC: Vurhonga Savanna', name: 'Brother Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Side arc.", subItems: checkSet(["A Brother's Call", "Traditional Hunting", "Savannah Spirit", "Ancestral Path", "A Brother's Bond"]) },
    { id: 'vur_senior', cat: 'DLC: Vurhonga Savanna', name: 'Senior Warden', rank: 'bronze', current: 0, goal: 7, type: 'checklist', desc: 'Harvest Savanna species.', subItems: checkSet(["Blue Wildebeest", "Cape Buffalo", "Gemsbok", "Lesser Kudu", "Lion", "Side-Striped Jackal", "Springbok"]) },
    { id: 'vur_njabulo', cat: 'DLC: Vurhonga Savanna', name: "Njabulo's Sorrow", rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Find Rambolo.' },
    { id: 'vur_kudu', cat: 'DLC: Vurhonga Savanna', name: 'Camouflage', rank: 'bronze', current: 0, goal: 50, type: 'numeric', desc: 'Spot 50 kudu.' },
    { id: 'vur_widow', cat: 'DLC: Vurhonga Savanna', name: 'Match for the Widowmaker', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Buffalo with .470.' },
    { id: 'vur_spring', cat: 'DLC: Vurhonga Savanna', name: 'Springbok City', rank: 'bronze', current: 0, goal: 25, type: 'numeric', desc: 'Harvest 25 springbok.' },
    { id: 'vur_lion', cat: 'DLC: Vurhonga Savanna', name: 'The Lion of Vurhonga', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Every subregion.' },

    // --- PARQUE FERNANDO ---
    { id: 'par_narrative_arc', cat: 'DLC: Parque Fernando', name: 'Narrative Missions Arc', rank: 'gold', current: 0, goal: 16, type: 'checklist', desc: 'Complete 16 story missions for Carolina Vargas.', subItems: checkSet(["Narrative 1-4", "Narrative 5-8", "Narrative 9-12", "Narrative 13-16"]) },
    { id: 'par_side_registry', cat: 'DLC: Parque Fernando', name: 'Side Mission Registry', rank: 'gold', current: 0, goal: 39, type: 'numeric', desc: 'Complete all 39 side missions.' },
    { id: 'par_species_audit', cat: 'DLC: Parque Fernando', name: 'Fernando Species Harvest', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Harvest every Parque Fernando species.', subItems: checkSet(["Cinnamon Teal", "Blackbuck", "Axis Deer", "Collared Peccary", "Puma", "Mule Deer", "Red Deer", "Water Buffalo"]) },
    { id: 'par_lodge_diamond', cat: 'DLC: Parque Fernando', name: 'Diamond Collection', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'One Diamond from each species for the lodge.', subItems: checkSet(["Teal", "Blackbuck", "Axis", "Peccary", "Puma", "Mule", "Red Deer", "Buffalo"]) },
    { id: 'par_ave_maria', cat: 'DLC: Parque Fernando', name: 'Ave María Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'All arcs.' },
    { id: 'par_milanesa', cat: 'DLC: Parque Fernando', name: 'Milanesa Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Carolina Vargas.", subItems: checkSet(["Welcome", "Mystery", "Puma", "Lake", "Secret"]) },
    { id: 'par_mark', cat: 'DLC: Parque Fernando', name: 'Hitting the Mark', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: "Challenge target." },
    { id: 'par_targets_full', cat: 'DLC: Parque Fernando', name: "Greatest Hits", rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: "All challenge targets." },
    { id: 'par_world_class', cat: 'DLC: Parque Fernando', name: 'World Class Reserve', rank: 'gold', current: 0, goal: 7, type: 'numeric', desc: 'Harvest 7 species.' },
    { id: 'par_vicente', cat: 'DLC: Parque Fernando', name: 'Vicente Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Vicente Vargas.", subItems: checkSet(["Arrival", "Buffalo", "Puma", "World Class", "Pride"]) },
    { id: 'par_chinita', cat: 'DLC: Parque Fernando', name: 'Chinita Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Beatriz Cabrera.", subItems: checkSet(["Greeting", "Axis", "Blackbuck", "Teal", "Success"]) },
    { id: 'par_matmat', cat: 'DLC: Parque Fernando', name: 'Matmat Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Matias Mateo.", subItems: checkSet(["Territory", "Mule", "Buffalo", "Red Deer", "Legacy"]) },
    { id: 'par_luna', cat: 'DLC: Parque Fernando', name: 'Luna Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Dr. Mariana Luna.", subItems: checkSet(["Arrival", "Axis", "Blackbuck", "Puma", "Findings"]) },
    { id: 'par_juliana', cat: 'DLC: Parque Fernando', name: 'Juliana Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Juliana Ferrari.", subItems: checkSet(["Challenge", "Buffalo", "Mule", "Teal", "Gratitude"]) },

    // --- YUKON VALLEY ---
    { id: 'yuk_main_arc', cat: 'DLC: Yukon Valley', name: 'Warden Jim Murray Arc', rank: 'gold', current: 0, goal: 10, type: 'checklist', desc: 'Full Main Mission Story.', subItems: checkSet(["Welcome to Alaska", "Quarantine", "The Cost of Control", "Picking Up, Dropping Off", "Raise the Barrier", "A Place to Hang Your Hat", "Flash Point", "Tech Support", "A Mine of information", "Gabriella Baden: Bigfoot Hunter"]) },
    { id: 'yuk_kayla_arc', cat: 'DLC: Yukon Valley', name: 'Kayla Johnson Side Arc', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Side Missions.', subItems: checkSet(["Show Me Whatchoo Got", "Bearly Broke A Sweat", "Exact. Efficient. Effective.", "Old Skool", "Bears vs Bow", "Step Up Your Game", "The Apex Predator Challenge", "Becoming the Alpha"]) },
    { id: 'yuk_bev_arc', cat: 'DLC: Yukon Valley', name: 'Bev Parker Side Arc', rank: 'silver', current: 0, goal: 6, type: 'checklist', desc: 'Side Missions.', subItems: checkSet(["Attack is the Best Defense", "Caribou Conditions", "A Distinctive Look", "He's a Growing Boy", "Due Diligence", "Yukon Valley's Best View"]) },
    { id: 'yuk_sandy_arc', cat: 'DLC: Yukon Valley', name: 'Sandy Murray Side Arc', rank: 'silver', current: 0, goal: 7, type: 'checklist', desc: 'Side Missions.', subItems: checkSet(["A Book By Its Cover", "A Study In Crimson", "From The Ashes", "Track Record", "Old Story, New Problems", "Mucking In", "Keep It Clean"]) },
    { id: 'yuk_hank_arc', cat: 'DLC: Yukon Valley', name: 'Hank Pepper Side Arc', rank: 'silver', current: 0, goal: 6, type: 'checklist', desc: 'Side Missions.', subItems: checkSet(["The Perfect Shot", "Demand For Ducks", "Band of Bison", "A Pair of Perfect Pelts", "A Rare Sight", "Yukon Gold Rush"]) },
    { id: 'yuk_oscar_arc', cat: 'DLC: Yukon Valley', name: 'Oscar Freeman Side Arc', rank: 'silver', current: 0, goal: 8, type: 'checklist', desc: 'Side Missions.', subItems: checkSet(["A Fine Specimen", "Managing Moose", "Moose Misfortune", "Hardware Upgrade", "The Balancing of Bison", "Herd Immunity", "At a Crossroads", "Predator Becomes the Prey"]) },
    { id: 'yuk_grizzly', cat: 'DLC: Yukon Valley', name: 'Grizzled Veteran', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Harvest grizzly.' },
    { id: 'yuk_ghost', cat: 'DLC: Yukon Valley', name: 'Ghost', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Albino wolf.' },

    // --- CUATRO COLINAS ---
    { id: 'cua_narrative_arc', cat: 'DLC: Cuatro Colinas', name: 'Narrative Missions Arc', rank: 'gold', current: 0, goal: 14, type: 'checklist', desc: 'Complete 14 story missions for Doña Alejandra.', subItems: checkSet(["Narrative 1-4", "Narrative 5-8", "Narrative 9-12", "Narrative 13-14"]) },
    { id: 'cua_side_registry', cat: 'DLC: Cuatro Colinas', name: 'Side Mission Registry', rank: 'gold', current: 0, goal: 55, type: 'numeric', desc: 'Complete all 55 side missions.' },
    { id: 'cua_species_audit', cat: 'DLC: Cuatro Colinas', name: 'Cuatro Species Harvest', rank: 'gold', current: 0, goal: 11, type: 'checklist', desc: 'Harvest every Cuatro species.', subItems: checkSet(["Ring-Necked Pheasant", "European Hare", "Roe Deer", "Ronda Ibex", "Beceite Ibex", "Gredos Ibex", "Southeastern Spanish Ibex", "Iberian Mouflon", "Wild Boar", "Iberian Wolf", "Red Deer"]) },
    { id: 'cua_slam', cat: 'DLC: Cuatro Colinas', name: 'The Slam of Glory', rank: 'gold', current: 0, goal: 4, type: 'checklist', desc: 'Harvest 1 diamond male ibex of every breed.', subItems: checkSet(["Gredos Ibex", "Beceite Ibex", "Southeastern Ibex", "Ronda Ibex"]) },
    { id: 'cua_faith', cat: 'DLC: Cuatro Colinas', name: 'Faith Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Padre Abbas arc.", subItems: checkSet(["Monastery Welcome", "Sacred Tracking", "Sheep Protection", "Faith's Trial", "Abbas's Blessing"]) },
    { id: 'cua_hubris', cat: 'DLC: Cuatro Colinas', name: 'Hubris Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Gerhardt Baden arc.", subItems: checkSet(["Challenge", "Mouflon Track", "Boar Harvest", "Roe Peak", "Success"]) },
    { id: 'cua_tradition', cat: 'DLC: Cuatro Colinas', name: 'Tradition Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Antonia Acosta arc.", subItems: checkSet(["Land", "Red Deer", "Wolf Sighting", "Mouflon", "Legacy"]) },
    { id: 'cua_commit', cat: 'DLC: Cuatro Colinas', name: 'Commitment Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Sole Santiago arc.", subItems: checkSet(["Arrival", "Boar Nuisance", "Red Deer", "Roe Track", "Gratitude"]) },
    { id: 'cua_rebirth', cat: 'DLC: Cuatro Colinas', name: 'Rebirth Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Don Del Bosque arc.", subItems: checkSet(["Greeting", "Ibex Hunt", "Wolf Encounter", "Red King", "Resolve"]) },
    { id: 'cua_opport', cat: 'DLC: Cuatro Colinas', name: 'Opportunism Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', desc: "Jose Ruiz arc.", subItems: checkSet(["Map", "Mouflon Study", "Boar Behavior", "Red Peak", "Findings"]) },
    { id: 'cua_shady', cat: 'DLC: Cuatro Colinas', name: 'Shady Dealings', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Hidden: Truth about reserve.' },
    { id: 'cua_justice', cat: 'DLC: Cuatro Colinas', name: 'Justice Served', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Main mission arc.' },
    { id: 'cua_master', cat: 'DLC: Cuatro Colinas', name: 'Cuatro Master', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'All arcs.' },

    // --- SILVER RIDGE PEAKS ---
    { id: 'srp_narrative_arc', cat: 'DLC: Silver Ridge', name: 'Narrative Missions Arc (Allan Bradley)', rank: 'gold', current: 0, goal: 15, type: 'checklist', desc: 'Complete 15 story missions for Allan Bradley.', subItems: checkSet(["Missions 1-4", "Missions 5-8", "Missions 9-12", "Missions 13-15"]) },
    { id: 'srp_species_audit', cat: 'DLC: Silver Ridge', name: 'Peaks Species Harvest', rank: 'gold', current: 0, goal: 9, type: 'checklist', desc: 'Harvest every Peaks species.', subItems: checkSet(["Merriam Turkey", "Pronghorn", "Mountain Goat", "Rocky Mountain Bighorn Sheep", "Mountain Lion", "Mule Deer", "Black Bear", "Rocky Mountain Elk", "Plains Bison"]) },
    { id: 'srp_turkeys', cat: 'DLC: Silver Ridge', name: 'Gobble Gobble', rank: 'silver', current: 0, goal: 50, type: 'numeric', desc: 'Harvest 50 turkeys.' },
    { id: 'srp_badname', cat: 'DLC: Silver Ridge', name: 'Bad Name', rank: 'gold', current: 0, goal: 10, type: 'numeric', desc: 'Down 10 animals hitting them in the heart with Alexander Longbow.' },
    { id: 'srp_thanks', cat: 'DLC: Silver Ridge', name: 'Thanksgiving', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Harvest a diamond turkey.' },
    { id: 'srp_ruled', cat: 'DLC: Silver Ridge', name: 'Ruled Earth', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: 'Take a picture of the dinosaur footprints.' },
    { id: 'srp_heavy', cat: 'DLC: Silver Ridge', name: 'Heavy Weight', rank: 'gold', current: 0, goal: 1, type: 'toggle', desc: 'Down a plains bison with one single shot using the Alexander Longbow.' },
    { id: 'srp_reaction', cat: 'DLC: Silver Ridge', name: 'Dangerous Reaction', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'A Dangerous Reaction'." },
    { id: 'srp_bearme', cat: 'DLC: Silver Ridge', name: 'Bear with Me', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'Bear with Me'." },
    { id: 'srp_bearher', cat: 'DLC: Silver Ridge', name: 'Bear... with Her', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'Bear... With Her'." },
    { id: 'srp_sabotage', cat: 'DLC: Silver Ridge', name: 'Sabotage', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'Old Haunts'." },
    { id: 'srp_peace', cat: 'DLC: Silver Ridge', name: 'Inner Peace', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'Inner Peace, Outer Chaos'." },
    { id: 'srp_ascent', cat: 'DLC: Silver Ridge', name: 'The Ascent', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'The Ascent'." },

    // ==========================================================
    // --- LIST OF COLLECTIBLES WRAPPER (ALPHA SORTED & NUMBERED) ---
    // ==========================================================
    
    // --- LAYTON LAKE DISTRICT ---
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
    },
    { 
        id: 'coll_layton_poi', cat: 'List of Collectibles', name: 'Layton Lake - Points of Interest', rank: 'bronze', current: 0, goal: 34, type: 'checklist',
        subItems: formatAlphaCheckset([
            "About the Black Bear [6969, 9138]", "About the Blacktail [8198, 6683]", "About the Whitetail (A) [8266, 10012]", "About the Whitetail (B) [10122, 8057]", "About the Whitetail (C) [9004, 10097]",
            "A Written Note (A) [9935, 10997]", "A Written Note (B) [8835, 8016]", "A Written Note (C) [8352, 5058]", "Camping Guidelines [11628, 9293]", "Coal Mining [10489, 6801]",
            "Fire Watch [11282, 6782]", "Hunting Tip [6868, 10995]", "Layton Canyon [13233, 6607]", "Layton River [12977, 4577]", "Leviathan Volcano [11328, 10290]",
            "Note by J. Trampfine [7124, 8122]", "Note by P. Beatty [7175, 5082]", "Note by R. Hope [10182, 10195]", "Old World Diseases [7235, 4154]", "Survivor's Camp [11100, 4400]",
            "Bear Cabbage [7895, 8149]", "The Bad Water [8676, 10982]", "The Balmont Poem [8372, 9050]", "The Calburn Poem [10170, 5813]", "The Conservationist President [9257, 4627]",
            "The Coywolf [12993, 8823]", "The Game Warden [10242, 9131]", "The Hummingbird [8117, 10996]", "The Lake District Hiking Trail [9306, 9167]", "The Land of Volcanos [9254, 7046]",
            "The Moose [6625, 6810]", "The Oregon Trail [7149, 9970]", "The Trickster [11627, 8156]", "Wildlife Varmint Control [10661, 11063]"
        ])
    },
    { 
        id: 'coll_layton_landmarks', cat: 'List of Collectibles', name: 'Layton Lake - Landmarks', rank: 'bronze', current: 0, goal: 12, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Calburn Accident Site [11095, 4569]", "Cheelah Hiking Village [11962, 9461]", "Chopeeka Natives Grounds [7794, 5422]", "High Lake Mountain Lake [8507, 5865]",
            "High Lake Rock Formations [9627, 8044]", "Kraken Rope Bridge [6952, 9056]", "Lake District Railway [7824, 10280]", "Lake District Survival Camp [8837, 10060]",
            "Leviathan Cave [12053, 11240]", "Norden Mining Structures [10702, 6595]", "Roonachee Church [6797, 11216]", "Willipeg Caves [6249, 6515]"
        ])
    },
    { 
        id: 'coll_layton_artifacts', cat: 'List of Collectibles', name: 'Layton Lake - Artifacts', rank: 'silver', current: 0, goal: 10, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Native Axe 1 [Cheelah: 13446, 8529]", "Native Axe 2 [Chopeeka: 8868, 5025]", "Native Axe 3 [High Lake: 8551, 6539]", "Native Pot 1 [Balmont: 8664, 11471]",
            "Native Pot 2 [Mount Leviatan: 12065, 11243]", "Native Pot 3 [Willipeg: 6267, 6498]", "WW1 Badge 1 [Calburn: 10208, 5281]", "WW1 Badge 2 [Cheelah: 11164, 9155]",
            "WW1 Badge 3 [Mount Kraken: 7183, 9168]", "WW1 Badge 4 [Balmont: 9920, 10327]"
        ])
    },
    { 
        id: 'coll_layton_sheds', cat: 'List of Collectibles', name: 'Layton Lake - Antler Sheds', rank: 'bronze', current: 0, goal: 40, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Blacktail Deer Small Shed Antler [Calburn: 11044, 5296]", "Blacktail Deer Small Shed Antler [High Lake: 9042, 7820]", "Blacktail Deer Small Shed Antler [Norden: 11832, 6884]", "Fallow Deer Small Shed Antler [Balmont: 9652, 10071]",
            "Fallow Deer Small Shed in Wheel Barrol next to house Antler [Calburn Canyon: 11043.800, 5295]", "Fallow Deer Small Shed Antler [Calburn: 9683, 4871]", "Fallow Deer Small Shed Antler [Mount Kraken: 7342, 7609]", "Fallow Deer Small Shed Antler [Norden: 13399, 5940]",
            "Fallow Deer Small Shed Antler [Norden: 13411, 4800]", "Moose Large Shed Antler [Balmont: 8310, 9402]", "Moose Large Shed Antler [Cheelah: 11029, 7988]", "Moose Large Shed Antler [Chopeeka: 7526, 5258]",
            "Moose Large Shed Antler [Chopeeka: 7552, 3818]", "Moose Small Shed Antler [Balmont: 8598, 10352]", "Moose Small Shed Antler [Chopeeka: 8235, 5062]", "Moose Small Shed Antler [High Lake: 9622, 7176]",
            "Moose Small Shed Antler [Norden: 10101, 7006]", "Moose Small Shed Antler [Roonachee: 6906, 10287]", "Roosevelt Elk Large Shed Antler [Balmont: 9848, 9644]", "Roosevelt Elk Large Shed Antler [Chopeeka: 8354, 3829]",
            "Roosevelt Elk Large Shed Antler [Mount Leviatan: 10908, 9519]", "Roosevelt Elk Large Shed Antler [Norden: 11443, 6621]", "Roosevelt Elk Small Shed Antler [Calburn: 9881, 5021]",  "Roosevelt Elk Small Shed Antler [Calburn Canyon: 11882, 4840]","Roosevelt Elk Small Shed Antler [High Lake: 8936, 7453]",
            "Roosevelt Elk Small Shed Antler [Norden: 13132, 7244]", "Roosevelt Elk Large Shed Antler [Mount Kraken: 6575, 7143]", "Whitetail Deer Large Shed Antler [Balmont: 8929, 9060]", "Whitetail Deer Large Shed Antler [Balmont: 10728, 10486]",
            "Whitetail Deer Large Shed Antler [Caliburn: 9427, 5744]", "Whitetail Deer Large Shed Antler [Cheelah: 12255, 7918]", "Whitetail Deer Large Shed Antler [Chopeeka: 6797, 4840]", "Whitetail Deer Large Shed Antler [High Lake: 10349, 8122]",
            "Whitetail Deer Large Shed Antler [Mount Kraken: 6542, 8790]", "Whitetail Deer Large Shed Antler [Mount Leviatan: 10617, 10944]", "Whitetail Deer Large Shed Antler [Roonachee: 7152, 10960]", "Whitetail Deer Large Shed Antler [Willipeg: 6520, 5605]",
            "Whitetail Deer Small Shed Antler [Balmont: 10186, 11292]", "Whitetail Deer Small Shed Antler [Mount Kraken: 6965, 8389]", "Whitetail Deer Small Shed Antler [Roonachee: 6515, 10574]"
        ])
    },

    // --- HIRSCHFELDEN HUNTING RESERVE ---
    { 
        id: 'coll_hirsch_outposts', cat: 'List of Collectibles', name: 'Hirschfelden - Outposts & Range', rank: 'bronze', current: 0, goal: 18, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Bohndorf Outpost [-9113, 6020]", "Ernsdorf Outpost [-9737, 11305]", "Hirschdorf River Outpost [-4463, 10971]", "Jonsdorf Outpost [-9834, 8241]",
            "Müllerwald Outpost [-5284, 6002]", "Müllerwald Western Outpost [-6743, 5643]", "Rathenfeldt Outpost [-4637, 12596]", "Rathenfeldt Schießstand (Shooting Range) [-3818, 12658]",
            "Rathenfeldt Northern Outpost [-5833, 11167]", "Ritterstein Outpost [-7286, 7335]", "Ritterstein Lake Outpost [-5737, 7266]", "Schonfeldt Eastern Outpost [-6907, 12948]",
            "Schonfeldt Outpost [-8022, 11484]", "Schonfeldt Western Outpost [-8011, 13125]", "Spreeberg Outpost [-7197, 9449]", "Spreeberg Western Outpost [-8898, 9499]",
            "Petershain Outpost [-5153, 9052]", "Tichenau Outpost [-10085, 12570]"
        ])
    },
    { 
        id: 'coll_hirsch_lookouts', cat: 'List of Collectibles', name: 'Hirschfelden - Lookout Points', rank: 'bronze', current: 0, goal: 18, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Bohndorf Lookout [-9480, 6806]", "Ernsdorf Lookout [-9453, 10915]", "Jonsdorf Eastern Lookout [-7924, 7279]", "Jonsdorf Western Lookout [-9567, 7859]",
            "Müllerwald Eastern Lookout [-5064, 5769]", "Müllerwald Western Lookout [-6861, 5730]", "Nethenfeldt Northern Lookout [-5662, 11435]", "Petershain Eastern Lookout [-4482, 8499]",
            "Petershain Northern Lookout [-5597, 8090]", "Petershain Southern Lookout [-4341, 10214]", "Rathenfeldt Eastern Lookout [-4473, 11908]", "Rathenfeldt Southern Lookout [-4611, 12987]",
            "Ritterstein Lookout [-8042, 5594]", "Schonfeldt Southern Lookout [-6957, 12139]", "Schonfeldt Northern Lookout [-7790, 10734]", "Spreeberg Eastern Lookout [-5974, 9905]",
            "Spreeberg Western Lookout [-7572, 8760]", "Tichenau Lookout [-9601, 12065]"
        ])
    },
    {
        id: 'coll_hirsch_poi', cat: 'List of Collectibles', name: 'Hirschfelden - Points of Interest', rank: 'bronze', current: 0, goal: 39, type: 'checklist',
        subItems: formatAlphaCheckset([
            "About the Bison [-9842, 12604]", "About the Fallow Deer [-7790, 11430]", "About the Red Fox [-7858, 7991]", "About the Wild Boar [-7287, 6373]", "A Warning [-7486, 5714]",
            "A Written Note (A) [-8986, 11755]", "A Written Note (B) [-4747, 11584]", "A Written Note (C) [-4388, 8588]", "A Written Note (D) [-6461, 7097]", "Bad Crop [-6032, 8516]",
            "Hunting Tip [-6651, 12636]", "Hunting with Birds [-5335, 7934]", "Hirschdorf River [-5545, 10887]", "Königsberg Lake [-4377, 9617]", "Mount Bürgen [-10730, 8885]",
            "Note by G. Jäger [-5775, 10823]", "Note by Dr. Otto Canella [-5403, 6618]", "Red Deer Canyon [-9957, 6321]", "Red Deer Hill [-8614, 6637]", "Red Deer Water [-10979, 7676]",
            "Red Deer Venison [-8438, 7611]", "Robert \"Strong Elk\" Fog [-10403, 11094]", "Sommer's Land [-7895, 12646]", "Star Hunting Tours [-6483, 5941]", "The Bohndorf Meteorite [-9456, 7284]",
            "The Christmas Tree [-4999, 9082]", "The Deer Roast [-5708, 11776]", "The European Bison Advisory Organization [-10656, 9618]", "The German Peasants' War [-6732, 11838]", "The History of Spreeberg [-9347, 9725]",
            "The Königsberg Heir [-6216, 9509]", "The Müllerwald Poem [-4358, 5719]", "The Rathenfeldt Poem [-4631, 12820]", "The Spree Nixe [-7931, 9180]", "The Spruce Tree [-9783, 11700]",
            "The World-Famous Deer [-8390, 8910]", "The Würm Glaciation [-10537, 12895]", "Wild Boar Land [-5889, 5989]"
        ])
    },
    { 
        id: 'coll_hirsch_landmarks', cat: 'List of Collectibles', name: 'Hirschfelden - Landmarks', rank: 'bronze', current: 0, goal: 17, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Bohndorf Hilltop [-9464, 7282]", "Bohndorf Lake Fishing Cabin [-8603, 5898]", "Ernsdorf Bridge [-9936, 10026]", "Ernsdorf Cave [-10365, 10170]", "Ikotz Bridge [-6135, 10268]",
            "Müllerwald Logging Area [-4539, 5906]", "Old Müller [-5983, 5676]", "Petershain Ruin Village [-5779, 7458]", "Petershain Tower Ruin [-5931, 8063]", "Petershain Turbines [-4727, 9439]",
            "Rathenfeldt Grave Mounds [-4941, 13294]", "Rinderland Gorge [-10087, 12080]", "Schonfeldt Bunkers [-7273, 12953]", "Schonfeldt Windmills [-7297, 10713]", "Spree Bathing Area [-7032, 7780]",
            "Spreeberg Castle [-7574, 8845]", "Tichenau Lonely Windmill [-8846, 12145]"
        ])
    },
    {
        id: 'coll_hirsch_artifacts', cat: 'List of Collectibles', name: 'Hirschfelden - Artifacts', rank: 'silver', current: 0, goal: 12, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Viking Coin 1 [Rathenfeldt: -4416, 11665]", "Viking Coin 2 [Ritterstein: -5781, 7263]", "WW1 German Dog Tag [Müllerwald: -5500, 5534]", "WW1 Helmet 1 [Jonsdorf: -8925, 7738]",
            "WW1 Helmet 2 [Tichenau: -10355, 12189]", "WW1 Medal 1 [Schonfeldt: -6736, 11061]", "WW1 Medal 2 [Spreeberg: -7580, 8784]", "WW1 Medal 3 [Petershain: -4482, 8492]",
            "WW1 Medal 4 [Spreeberg: -6883, 9852]", "WW1 Medal 5 [Petershain: -4850, 9167]", "WW1 Russian Dog Tag [Tichenau: -8883, 12958]", "WW1 US Dog Tag [Ernsdorf: -10399, 10203]"
        ])
    },
    {
        id: 'coll_hirsch_sheds', cat: 'List of Collectibles', name: 'Hirschfelden - Sheds', rank: 'bronze', current: 0, goal: 41, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Fallow Deer Large Shed Antler [-3921, 5647]", "Fallow Deer Large Shed Antler [Ernsdorf: -8363, 11291]", "Fallow Deer Large Shed Antler [Müllerwald: -5013, 5690]", "Fallow Deer Large Shed Antler [Petershain: -4883, 6877]",
            "Fallow Deer Large Shed Antler [Petershain: -4333, 9531]", "Fallow Deer Large Shed Antler [Rathenfeldt: -5729, 12980]", "Fallow Deer Large Shed Antler [Rathenfeldt: -4650, 12594]", "Fallow Deer Large Shed Antler [Rathenfeldt: -3765, 11725]",
            "Fallow Deer Large Shed Antler [Ritterstein: -6701, 6841]", "Fallow Deer Large Shed Antler [Schonfeldt: -6627, 10902]", "Fallow Deer Large Shed Antler [Schonfeldt: -7162, 10731]", "Fallow Deer Large Shed Antler [Spreeberg: -8915, 9482]",
            "Fallow Deer Large Shed Antler [Tichenau: -8364, 12473]", "Fallow Deer Small Shed Antler [Müllerwald: -5676, 6524]", "Fallow Deer Small Shed Antler [Petershain: -3820, 10746]", "Fallow Deer Small Shed Antler [Petershain: -5539, 9463]",
            "Fallow Deer Small Shed Antler [Rathenfeldt: -5080, 12184]", "Fallow Deer Small Shed Antler [Schonfeldt: -7257, 12117]", "Fallow Deer Small Shed Antler [Spreeberg: -7914, 9623]", "Red Deer Large Shed Antler [Bohndorf: -9228, 5584]",
            "Red Deer Large Shed Antler [Jonsdorf: -8839, 8744]", "Red Deer Large Shed Antler [Ritterstein: -7300, 7624]", "Red Deer Large Shed Antler [Ritterstein: -8601, 5476]", "Red Deer Small Shed Antler [Jonsdorf: -8567, 5907]",
            "Red Deer Small Shed Antler [Ritterstein: -7077, 7153]", "Roe Deer Large Shed Antler [Bohndorf: -9775, 6019]", "Roe Deer Large Shed Antler [Ernsdorf: -9422, 11343]", "Roe Deer Large Shed Antler [Ernsdorf: -10556, 9304]",
            "Roe Deer Large Shed Antler [Müllerwald: -4364, 6387]", "Roe Deer Large Shed Antler [Petershain: -5582, 8675]", "Roe Deer Large Shed Antler [Petershain: -4723, 7400]", "Roe Deer Large Shed Antler [Rathenfeldt: -4152, 12614]",
            "Roe Deer Large Shed Antler [Ritterstein: -7271, 5756]", "Roe Deer Large Shed Antler [Schonfeldt: -7666, 13216]", "Roe Deer Large Shed Antler [Schonfeldt: -6303, 12504]", "Roe Deer Large Shed Antler [Schonfeldt: -6605, 11378]",
            "Roe Deer Large Shed Antler [Spreeberg: -6598, 10361]", "Roe Deer Large Shed Antler [Tichenau: -8849, 12145]", "Roe Deer Large Shed Antler [Tichenau: -9461, 12100]", "Roe Deer Large Shed Antler [Tichenau: -10149, 11684]",
            "Roe Deer Small Shed Antler [Rathenfeldt: -5781, 11118]"
        ])
    },

    // --- MEDVED-TAIGA NATIONAL PARK ---
    {
        id: 'coll_medved_outposts', cat: 'List of Collectibles', name: 'Medved-Taiga - Outposts', rank: 'bronze', current: 0, goal: 16, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Besplodnoye Plateau Eastern Outpost [-5124, -7029]", "Besplodnoye Plateau Northern Outpost [-7441, -8445]", "Besplodnoye Plateau Southern Outpost [-4724, -5763]", "Besplodnoye Plateau Western Outpost [-6689, -5990]",
            "Ledyanoy Bay Eastern Outpost [-9824, -9029]", "Ledyanoy Bay Southern Outpost [-10343, -7579]", "Ledyanoy Bay Western Outpost [-11519, -8509]", "P'yanaya Taiga Northern Outpost (A) [-11577, -6323]",
            "P'yanaya Taiga Northern Outpost (B) [-8596, -7202]", "P'yanaya Taiga Southern Outpost [-8567, -5169]", "P'yanaya Taiga Western Outpost [-10137, -6110]", "Vetrenyye Plains Northern Outpost [-4955, -10917]",
            "Vetrenyye Plains Southern Outpost [-5332, -8875]", "Vetrenyye Plains Western Outpost [-6687, -9959]", "Zverolova Hill Eastern Outpost [-8564, -10298]", "Zverolova Hill Western Outpost [-9705, -10896]"
        ])
    },
    {
        id: 'coll_medved_lookouts', cat: 'List of Collectibles', name: 'Medved-Taiga - Lookout Points', rank: 'bronze', current: 0, goal: 9, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Besplodnoye Plateau Northern Lookout [-6855, -7988]", "Besplodnoye Plateau Southern Lookout [-5071, -6171]", "Ledyanoy Bay Eastern Lookout [-9643, -8175]", "Ledyanoy Bay Southern Lookout [-4492, -9009]",
            "Ledyanoy Bay Western Lookout [-11331, -7811]", "P'yanaya Taiga Eastern Lookout [-8602, -6395]", "P'yanaya Taiga Western Lookout [-10261, -6442]", "Vetrenyye Plains Northern Lookout [-5921, -10553]",
            "Zverolova Hill Lookout [-8837, -10994]"
        ])
    },
    {
        id: 'coll_medved_poi', cat: 'List of Collectibles', name: 'Medved-Taiga - Points of Interest', rank: 'bronze', current: 0, goal: 30, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Expedition Note 1 [-10170, -10269]", "Expedition Note 2 [-4700, -10198]", "Expedition Note 3 [-7642, -8744]", "Expedition Note 4 [-10412, -8232]", "Expedition Note 5 [-11834, -8328]",
            "Expedition Note 6 [-10967, -6549]", "Expedition Note 7 [-9904, -5692]", "Expedition Note 8 [-6476, -7052]", "Expedition Note 9 [-6855, -5259]", "Expedition Note 10 [-5567, -5402]",
            "Nenets Monument 1 [-9089, -11441]", "Nenets Monument 2 [-6818, -10674]", "Nenets Monument 3 [-5872, -8969]", "Nenets Monument 4 [-4216, -7747]", "Nenets Monument 5 [-12133, -8936]",
            "Nenets Monument 6 [-9789, -7643]", "Nenets Monument 7 [-9070, -6781]", "Nenets Monument 8 [-11831, -5791]", "Nenets Monument 9 [-7711, -6301]", "Nenets Monument 10 [-6704, -6551]",
            "Trapper Note 1 [-9210, -10648]", "Trapper Note 2 [-7996, -10379]", "Trapper Note 3 [-4790, -11201]", "Trapper Note 4 [-6503, -8908]", "Trapper Note 5 [-4676, -7984]",
            "Trapper Note 6 [-10503, -9362]", "Trapper Note 7 [-9399, -8168]", "Trapper Note 8 [-10595, -7073]", "Trapper Note 9 [-8463, -5591]", "Trapper Note 10 [-10283, -5310]"
        ])
    },
    {
        id: 'coll_medved_landmarks', cat: 'List of Collectibles', name: 'Medved-Taiga - Landmarks', rank: 'bronze', current: 0, goal: 30, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Cave Painting 1: Rechnaya Rybalka [-6681, -5078]", "Cave Painting 2: Irish-Elk Hunting [-8957, -5183]", "Cave Painting 6: Stolby Pillars [-7186, -6061]", "Cave Painting 10: Underworld Ritual [-6582, -7202]",
            "Cave Painting 16: Fishing Man in Boat [-9919, -7704]", "Cave Painting 17: Cave Bear Hunting [-8217, -8679]", "Cave Painting 24: Sun God Ritual [-7703, -9564]", "Cave Painting 26: Mammoth Hunting [-6457, -10394]",
            "Cave Painting 27: Cave Lion Hunting [-5046, -10592]", "Cave Painting 30: Marine Expedition [-10003, -11214]", "Landmark Sign 3: Chuchunya [-9473, -5234]", "Landmark Sign 4: Lena Pillars [-7597, -5619]",
            "Landmark Sign 5: Gateway to the Underworld [-10537, -5840]", "Landmark Sign 7: Mammoth Boneyard [-5964, -6207]", "Landmark Sign 8: Fat Trout Run [-8110, -6570]", "Landmark Sign 9: Drunken Forest [-11540, -6778]",
            "Landmark Sign 11: Victor's Bend [-10320, -7271]", "Landmark Sign 12: Hollowed Mountain [-6483, -7432]", "Landmark Sign 13: North Link Railroad [-11117, -7575]", "Landmark Sign 14: Chekurovka Star [-8683, -7618]",
            "Landmark Sign 15: Frozen Passage [-7815, -7660]", "Landmark Sign 18: Many Small Lakes [-10931, -8854]", "Landmark Sign 19: Great Vista [-7321, -8879]", "Landmark Sign 20: Chekurovka [-9075, -8879]",
            "Landmark Sign 21: Tusida Without Fire [-6011, -9037]", "Landmark Sign 22: Two River Village [-11631, -9342]", "Landmark Sign 23: Spring of Life [-5230, -9550]", "Landmark Sign 25: Cave Exploration [-7640, -10077]",
            "Landmark Sign 28: Chekurovka Bay [-10453, -11000]", "Landmark Sign 29: Wild Coast Paradise [-6580, -11199]"
        ])
    },
    {
        id: 'coll_medved_artifacts', cat: 'List of Collectibles', name: 'Medved-Taiga - Artifacts', rank: 'silver', current: 0, goal: 20, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Cave Lion Canine Tooth [Dikiy Coast: -6517, -10438]", "Cave Lion Canine Tooth [Dikiy Coast: -4984, -10568]", "Cave Lion Canine Tooth [Mamontovaya Tundra: -6730, -5066]", "Cave Lion Canine Tooth [Lesnye Lands: -9026, -5175]",
            "Cave Lion Canine Tooth [Pustaya Mountain: -7301, -6114]", "Cave Lion Canine Tooth [Pustaya Mountain: -6556, -7075]", "Cave Lion Canine Tooth [Pustaya Mountain: -8291, -8619]", "Cave Lion Canine Tooth [Pustaya Mountain: -7755, -9499]",
            "Cave Lion Canine Tooth [Rybatskiy Bay: -9955, -7703]", "Cave Lion Canine Tooth [Zverolova Hill: -9994, -11273]", "Mammoth Tusk [Mamontovaya Tundra: -5696, -5543]", "Mammoth Tusk [Mamontovaya Tundra: -4566, -5852]",
            "Mammoth Tusk [Mamontovaya Tundra: -5393, -6026]", "Mammoth Tusk [Mamontovaya Tundra: -4849, -6268]", "Mammoth Tusk [Mamontovaya Tundra: -4120, -6765]", "Mammoth Tusk [Mamontovaya Tundra: -5673, -6908]",
            "Mammoth Tusk [Mamontovaya Tundra: -4964, -7601]", "Mammoth Tusk [Mamontovaya Tundra: -6849, -7696]", "Mammoth Tusk [Pustaya Mountain: -6035, -5993]", "Mammoth Tusk [Pustaya Mountain: -7881, -8567]"
        ])
    },
    {
        id: 'coll_medved_sheds', cat: 'List of Collectibles', name: 'Medved-Taiga - Sheds & Skulls', rank: 'bronze', current: 0, goal: 30, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Cave Lion Skull [Kaban'ya Tropa: -5425, -8032]", "Cave Lion Skull [Khizhina Gryankina: -8375, -10985]", "Cave Lion Skull [Khizhina Nikolaya: -8976, -9863]", "Cave Lion Skull [Kostyanoy Priyut: -9338, -5191]",
            "Cave Lion Skull [Myortvye Dushi: -10047, -7985]", "Cave Lion Skull [Na Kulichkakh: -6403, -7281]", "Cave Lion Skull [Posledniy Priyut: -5772, -11130]", "Cave Lion Skull [Vostochnyy Ledyanoy Tonnel': -6738, -8526]",
            "Moose Large Shed Antler [Beliy Parokhod: -8034, -9581]", "Moose Large Shed Antler [Derevnya Dvukh Rek: -11650, -9423]", "Moose Large Shed Antler [Dvorets Chuchuni: -7103, -9655]", "Moose Large Shed Antler [Khizhina Petra: -7963, -11039]",
            "Moose Large Shed Antler [Kabala Svyatosh: -9805, -11110]", "Moose Large Shed Antler [Odinokie Dni: -6967, -6020]", "Moose Large Shed Antler [Priyut Dohloy Sobaki: -11188, -5091]", "Moose Large Shed Antler [Rakovyi Korpus: -8343, -8438]",
            "Moose Large Shed Antler [Zapadnyy Ledyanoy Tonnel': -7765, -7673]", "Moose Small Shed Antler [Dvorets Kaban'yevo Tsarya: -7540, -10822]", "Moose Small Shed Antler [Izluchina Viktora: -10210, -7241]", "Moose Small Shed Antler [Na Dne: -5548, -9905]",
            "Moose Small Shed Antler [Ray Dikogo Poberezh'ya: -6556, -11123]", "Reindeer Large Shed Antler [Belye Nochi: -4478, -6805]", "Reindeer Large Shed Antler [Dom Gde Razbivayutsa Serdtsa: -8133, -10264]", "Reindeer Large Shed Antler [Khizhina Anatoliya: -10078, -9267]",
            "Reindeer Large Shed Antler [Odinokie Nochi: -9751, -6369]", "Reindeer Large Shed Antler [Zhizn' i Sud'ba: -11402, -7593]", "Reindeer Small Shed Antler [Chekurovka: -9117, -9000]", "Reindeer Small Shed Antler [Sobach'ye Serdtse: -7980, -7105]",
            "Reindeer Small Shed Antler [Taras Bul'ba: -6457, -10363]", "Reindeer Small Shed Antler [Tikhiy Don: -9204, -10889]"
        ])
    },

    // --- VURHONGA SAVANNA ---
    {
        id: 'coll_vurhonga_outposts', cat: 'List of Collectibles', name: 'Vurhonga Savanna - Outposts', rank: 'bronze', current: 0, goal: 18, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Dari Dari Hollow [6104, -6017]", "Fisherman's Outpost [11304, -10875]", "Henhla Ndhawu [6198, -9836]", "Khensani N'wana [11903, -7240]",
            "Kule Rila [8189, -10278]", "Mbali's Place [4691, -8128]", "Nambu Tlhelo [5885, -11145]", "Navelela Mpfula [11062, -9248]",
            "Ndzhuti Hollow [7232, -6045]", "Nsuku Nyeleti [10100, -11332]", "Oma Vona [9998, -5576]", "Rhilaza Byanyi [8600, -8655]",
            "Sungula Place [8533, -7685]", "Xibodlo Ehenhla [8735, -5787]", "Xikarhi Outpost [5673, -7402]", "Xikwembu Yimelo [8753, -11652]",
            "Ximixweni Yimelo [10037, -8054]", "Xipembele Rila [11320, -5767]"
        ])
    },
    {
        id: 'coll_vurhonga_lookouts', cat: 'List of Collectibles', name: 'Vurhonga Savanna - Lookout Points', rank: 'bronze', current: 0, goal: 9, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Bilankulu Lookout [10177, -9006]", "Hlungwani Lookout [7051, -5518]", "Maceke Lookout [11405, -6783]", "Makasela Lookout [8780, -5193]",
            "Mbhokota Lookout [9075, -10713]", "Nukeri Lookout [6233, -7637]", "Rikhotso Lookout [10786, -10332]", "Xigalo Lookout [6497, -10904]",
            "Xirimani Lookout [8329, -7482]"
        ])
    },
    {
        id: 'coll_vurhonga_poi', cat: 'List of Collectibles', name: 'Vurhonga Savanna - Points of Interest', rank: 'bronze', current: 0, goal: 8, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Amukelani's Healing Hut [5437, -6101]", "Blue Stalk Gardens [4919, -10097]", "Madiba's Freedom [10847, -11747]", "Memories of 2010 [9463, -9156]",
            "Rhangani's Hideaway [6494, -9165]", "Serpent Players Playhouse [11407, -7258]", "Sol Plaatje Hut [6800, -5127]", "Xitshembhiso [9109, -6496]"
        ])
    },
    {
        id: 'coll_vurhonga_landmarks', cat: 'List of Collectibles', name: 'Vurhonga Savanna - Landmarks', rank: 'bronze', current: 0, goal: 29, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Adansonia Digitata [9127, -8491]", "Beyond Vurhonga [7822, -5264]", "Bounder Cave [6283, -8453]", "Diamphidia [6859, -10331]", "East African Rift [6860, -8354]",
            "Foot of the Mountain [7842, -7465]", "Gorgeous Hiking [8871, -12547]", "Jedidiah's Wall [11082, -5413]", "Lightning Bird [8918, -9895]", "Lonely Road [5408, -9422]",
            "Nyaminyami [7737, -11647]", "Poacher Routes [9501, -5201]", "Potholes [4331, -7072]", "Prehistoric Art [11923, -8496]", "San Folklore I [10136, -10217]",
            "San Folklore II [8437, -10901]", "San Folklore III [7748, -9100]", "Sangomas & Inyangas [10337, -6231]", "Swamped [11840, -6747]", "The Eloko [5505, -5928]",
            "The First People [4987, -10556]", "The Grand Escarpment [5281, -8061]", "Theron Gorge [10840, -11598]", "Tstetse Problems [12248, -6445]", "Twin Lakes [10491, -7386]",
            "Vachellia Xanthophloea [6626, -5930]", "Vurhonga Heights [8670, -7666]", "Water Sources [7629, -7835]", "Weeping Face [4867, -8443]"
        ])
    },
    {
        id: 'coll_vurhonga_artifacts', cat: 'List of Collectibles', name: 'Vurhonga Savanna - Artifacts', rank: 'gold', current: 0, goal: 5, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Dinofelis Skull [Vupeladyambu / Vurhonga Plateau Cave: 5845, -8304]", "Mask of Sangoma [Dzonga / Central Savanna: 8721, -7672]", "Nyaminyami [Dzonga / Central Savanna: 9134, -8504]", "Scimitar-Toothed Cat [Vupeladyambu / Vurhonga Plateau Cave: 4989, -8219]",
            "The Golden Rhinoceros of Mapungubwe [Vupeladyambu / Vurhonga Plateau: 5317, -7567]"
        ])
    },

    // --- PARQUE FERNANDO ---
    {
        id: 'coll_parque_outposts', cat: 'List of Collectibles', name: 'Parque Fernando - Outposts & Range', rank: 'bronze', current: 0, goal: 14, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Archery Range [S-8437, 7872]", "Casita de Bariloche [-7158, 4675]", "Casita de Cordoba (A) [-10396, 9779]", "Casita de Cordoba (B) [-10309, 7136]",
            "Casita de Cornaro [-10505, 5000]", "Casita de Cristal [-5534, 6910]", "Casita de Mendoza [-9325, 10633]", "Casita de Martita [-8362, 7819]",
            "Casita de La Negra [-6561, 10432]", "Casita de Pappo [-4746, 9695]", "Casita de Sabina [-7433, 6654]", "Casita de Bíró [-8333, 5368]",
            "Casita del Papa Francisco [-5294, 5110]", "Casita de Ushuaia [-6130, 8225]"
        ])
    },
    {
        id: 'coll_parque_lookouts', cat: 'List of Collectibles', name: 'Parque Fernando - Lookout Points', rank: 'bronze', current: 0, goal: 9, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Mirador de Ameghino [-11453, 5110]", "Mirador de Fontana [-8569, 4900]", "Mirador de Guevara [-5948, 5264]", "Mirador de Frey [-10209, 7660]",
            "Mirador de Magallanes [-8481, 8384]", "Mirador de Pastore [-7908, 6406]", "Mirador de Perito Moreno [-5812, 10060]", "Mirador de Solís [-9876, 9804]",
            "Mirador de Tito [-5852, 7651]"
        ])
    },
    {
        id: 'coll_parque_landmarks', cat: 'List of Collectibles', name: 'Parque Fernando - Landmarks', rank: 'bronze', current: 0, goal: 12, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Cementerio del Penitente [-7795, 7141]", "Cueva de las Manos [-7191, 10482]", "Ebothrium Coccineum [-6738, 6395]", "El Fin del Mundo [-11460, 11470]",
            "Guarida de los Pumas Mimados [-9647, 11236]", "Lagos Subterráneos [-9637, 6610]", "Leyenda de la Baya de Calafate [-8475, 8771]", "Los Bagualeros [-10431, 4444]",
            "Los Gauchos [-6177, 9230]", "Nothofagus [-5198, 7390]", "Paso de Vientos Cambiantes [-6801, 6972]", "Titanosaurio [-8902, 4320]"
        ])
    },
    {
        id: 'coll_parque_targets', cat: 'List of Collectibles', name: 'Parque Fernando - Challenge Targets', rank: 'gold', current: 0, goal: 15, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Target 1: Ring Distance [-8858 : 8294]", "Target 2: Underground Cave Circle [-6137 : 5463]", "Target 3: Ring Distance [-7135 : 7475]", "Target 4: Ring Distance [-6173 : 9950]",
            "Target 5: Ring Distance [-10266 : 9263]", "Target 6: Ring Distance [-7066 : 6789]", "Target 7: Ring Distance [-5991 : 6379]", "Target 8: Ring Distance [-8411 : 7777]",
            "Target 9: Ring Distance [-7610 : 5952]", "Target 10: Ring Distance [-6421 : 7423]", "Target 11: Ring Distance [-6173 : 5800]", "Target 12: Ring Distance [-8506 : 7793]",
            "Target 13: Ring Distance [-7525 : 4497]", "Target 14: Ring Distance [-9513 : 9554]", "Target 15: Ring Distance [-8088 : 8767]"
        ])
    },

    // --- YUKON VALLEY ---
    {
        id: 'coll_yukon_outposts', cat: 'List of Collectibles', name: 'Yukon Valley - Outposts', rank: 'bronze', current: 0, goal: 17, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Basri Memorial Outpost [-11662, -11000]", "Calmwater Cabin [-5495, -5965]", "Copperbowl Lake [-11162, -7098]", "Coppertop Hill [-8313, -8647]",
            "Crimson Ridge [-6950, -8534]", "Fisherman's Ford [-6823, -6567]", "Frontier Vista [-5588, -11398]", "Hunter's Den [-4867, -9650]",
            "Loggers Point [-6065, -9778]", "Murphy's Landing [-6042, -9279]", "Pioneer Crossing [-5561, -7478]", "Prospector's Overlook [-7900, -11718]",
            "Riverbend Rest [-8342, -6639]", "Timbergold Trailhead [-10018, -8408]", "Trapper's Peak [-9652, -10117]", "Wolfhead Lake [-11470, -9593]",
            "Woodsman's Respite [-7077, -10486]"
        ])
    },
    {
        id: 'coll_yukon_lookouts', cat: 'List of Collectibles', name: 'Yukon Valley - Lookout Points', rank: 'bronze', current: 0, goal: 11, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Lookout Alpha [-5942, -9963]", "Lookout Beta [-8567, -10298]", "Lookout Charlie [-6661, -11624]", "Lookout Delta [-8529, -7878]",
            "Lookout Echo [-11160, -9123]", "Lookout Foxtrot [-6575, -6999]", "Lookout Golf [-9044, -6584]", "Lookout Hotel [-10305, -6344]",
            "Lookout India [-5407, -5322]", "Lookout Juliet [-4999, -8668]", "Lookout Kilo [-11171, -11400]"
        ])
    },
    {
        id: 'coll_yukon_landmarks', cat: 'List of Collectibles', name: 'Yukon Valley - Landmarks', rank: 'bronze', current: 0, goal: 17, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Alaska's Ancient Inhabitants [-6929, -7709]", "Alaska's Big Dog [-9145, -7962]", "Alaska's Otter-Folk [-5415, -10626]", "Alaska's Spruce Beetle Quandary [-6919, -10590]",
            "Anthony's Gambit [-5427, -6693]", "Beatrice Ward's Bus [-10464, -12747]", "Elusive Giants [-8334, -6874]", "Frontier Bridge [-4813, -11177]",
            "Layton Bridges [-5709, -8261]", "Millerwood Copper Mine [-9893, -6610]", "Opening Up The Last Frontier [-7956, -11280]", "That's My Jam [-7493, -9718]",
            "The Hairy Men [-9645, -11070]", "The Rush To The Yukon [-7160, -6113]", "The Yukon's Original Residents [-7695, -12542]", "Tiny Timber [-11099, -8027]",
            "Yukon Valley Wildfires [-11422, -10484]"
        ])
    },

    // --- CUATRO COLINAS GAME RESERVE ---
    {
        id: 'coll_cuatro_outposts', cat: 'List of Collectibles', name: 'Cuatro Colinas - Outposts', rank: 'bronze', current: 0, goal: 24, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Cabaña de la dama [-8207, 7281]", "Cabaña de la lavanda [-11047, 4378]", "Cabaña de la rivera [-9987, 7617]", "Cabaña Del Pintor [-11433, 7223]",
            "Casa Alfonso [-10346, 6091]", "Casa Del Rey [-6167, 12335]", "Casa del noble [-10580, 10971]", "Cresta De La Colina [-8625, 11454]",
            "Cresta Del Granjero [-11498, 10285]", "Cresta Ribereña 1 [-4476, 10931]", "Cresta Ribereña 2 [-5108, 10898]", "El Descanso Del Santo [-7325, 8192]",
            "Escondite Del Leñador [-4652, 8552]", "Establo Del Soldado [-7015, 12197]", "Fuerte De Pascal [-9238, 5785]", "Granja Alta Arboleda [-11242, 5570]",
            "Granja Lago [-9613, 9187]", "Granja Sanchez [-5939, 5286]", "Logia De La Reina [-7807, 5248]", "Mirador del lago [-12121, 9725]",
            "Retiro de Isidoro [-9630, 11013]", "Valle Del Cazador [-9463, 9833]", "Balconada De Víctor [-6045, 8105]", "Vista Del Santo [-7435, 9181]"
        ])
    },
    {
        id: 'coll_cuatro_lookouts', cat: 'List of Collectibles', name: 'Cuatro Colinas - Lookout Points', rank: 'bronze', current: 0, goal: 12, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Balcón Del Rey [-10303, 11863]", "Balcón De Los Beatos [-6253, 9370]", "Bosque Vista [-10489, 5095]", "Cresta De Almena [-10216, 8917]",
            "Fuerte De Domingo [-5242, 11954]", "Mirador Del Valle [-7469, 11164]", "Torre De Doña Emilia [-8654, 5378]", "Torre De Javier [-5761, 6494]",
            "Torre Del Cid [-11716, 8938]", "Vista De Cantera [-7485, 6631]", "Vista Del Granjero [-11031, 7759]", "Vista Del Prado [-5332, 7662]"
        ])
    },
    {
        id: 'coll_cuatro_poi', cat: 'List of Collectibles', name: 'Cuatro Colinas - Points of Interest', rank: 'bronze', current: 0, goal: 2, type: 'checklist',
        subItems: formatAlphaCheckset([
            "The memorial to Doña Angelica Garcia [-6203, 7631]", "The goat statue in marble [-9245, 7113]"
        ])
    },
    {
        id: 'coll_cuatro_landmarks', cat: 'List of Collectibles', name: 'Cuatro Colinas - Landmarks', rank: 'bronze', current: 0, goal: 15, type: 'checklist',
        subItems: formatAlphaCheckset([
            "A Safe Haven [-5910, 10013]", "A Solid Economy [-7362, 7017]", "A Farming Legacy [-9631, 4384]", "Becoming Neighbours [-11243, 8149]",
            "Big Business [-10829, 6412]", "Eyes On The Road [-6647, 8694]", "Farming Remotely [-5092, 8958]", "Lasting Military Presence [-6322, 5849]",
            "Life Springs Eternal [-5765, 11088]", "Making It Work [-8653, 8448]", "Reclaimed For God [-11534, 9407]", "Reconquista [-8914, 5052]",
            "Settling In [-7868, 11414]", "Small Batch [-10828, 10809]", "Strong Foundations [-10431, 5382]"
        ])
    },

    // --- SILVER RIDGE PEAKS ---
    {
        id: 'coll_srp_outposts', cat: 'List of Collectibles', name: 'Silver Ridge Peaks - Outposts', rank: 'bronze', current: 0, goal: 21, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Bighorn Sheep Outpost [-5848, -13089]", "Black Bear Outpost [-4106, -6663]", "Chipeta Outpost [-2186, -7137]", "Climber Outpost [-7345, -10419]",
            "Colorado Outpost [-6028, -8395]", "Hunter Outpost [-3631, -10757]", "Mountain Lion Outpost [-6843, -12491]", "Mountain Goat Outpost [-2999, -12758]",
            "Mule Deer Outpost [-6393, -7387]", "Ouray Outpost [-3723, -9612]", "Plains Bison Outpost [-1090, -7479]", "Pronghorn Outpost [-1108, -5618]",
            "Rocky Mountain Elk Outpost [-1872, -9283]", "San Juan Outpost [-7839, -8867]", "Silver Outpost [-4541, -8897]", "Sneffels Outpost [-7977, -11333]",
            "Tabeguache Outpost [-1355, -11301]", "Uintah Outpost [-5174, -11332]", "Uncompahgre Outpost [-6075, -10004]", "Utah Outpost [-8272, -7010]",
            "Wild Turkey Outpost [-649, -8552]"
        ])
    },
    {
        id: 'coll_srp_lookouts', cat: 'List of Collectibles', name: 'Silver Ridge Peaks - Lookout Points', rank: 'bronze', current: 0, goal: 10, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Post One [-6672, -13080]", "Post Two [-1966, -10626]", "Post Three [-3730, -11645]", "Post Four [-5942, -10267]", "Post Five [-8310, -9561]",
            "Post Six [-448, -7695]", "Post Seven [-2717, -6525]", "Post Eight [-3632, -9032]", "Post Nine [-6501, -7942]", "Post Ten [-8223, -6687]"
        ])
    },
    {
        id: 'coll_srp_landmarks', cat: 'List of Collectibles', name: 'Silver Ridge Peaks - Landmarks', rank: 'bronze', current: 0, goal: 21, type: 'checklist',
        subItems: formatAlphaCheckset([
            "A Painful Legacy [-2575, -8192]", "A Mammoth Discovery [-7886, -9178]", "Balanced Rock [-4702, -10864]", "Burnt into Memory [-4639, -11339]",
            "Colorado's Last Grizzly [-5142, -6984]", "Frontier Service [-978, -10432]", "Frozen in Time [-1356, -10521]", "Go Wild Outside [-4307, -9088]",
            "Haunted by History [-9019, -6901]", "Miner Threat [-3931, -9650]", "Pitchblende Pit [-3356, -10006]", "Prosperity Pass [-7079, -8137]",
            "Shot on Sight [-6913, -12188]", "Take a Hike [-6787, -7191]", "Ticker Lake [-3230, -10508]", "The Bear Dance [-583, -8961]",
            "The Ute People [-5759, -9517]", "The Wilde West [-2302, -6268]", "Traces of History [-1440, -7727]", "The Water's Perfect [-4123, -8112]",
            "Wandering Fathers [-6234, -12123]"
        ])
    },

    // --- TE AWAROA NATIONAL PARK ---
    {
        id: 'coll_te_outposts', cat: 'List of Collectibles', name: 'Te Awaroa - Outposts', rank: 'bronze', current: 0, goal: 20, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Akiaki Hut [8645, 11497]", "Kakaruwai Hut [4718, 10939]", "Kākāriki Hut [10362, 10712]", "Kārearea Hut [9527, 10672]", "Korimako Hut [10750, 11235]",
            "Kākā Hut [5300, 8115]", "Kiwi Hut [9329, 6772]", "Koekoeā Hut [5750, 9160]", "Kōkako Hut [9232, 9696]", "Mōhua Hut [9616, 11916]",
            "Ngirungiru Hut [4852, 7553]", "Pīwakawaka Hut [6482, 10339]", "Riroriro Hut [4598, 9910]", "Ruru Hut [9293, 8833]", "Kea Hut [7859, 8387]",
            "Tauhou Hut [6434, 7199]", "Tīeke Hut [4471, 9062]", "Tītitipounamu Hut [11196, 10551]", "Tūī Hut [10520, 8441]", "Weka Hut [12503, 9705]"
        ])
    },
    {
        id: 'coll_te_lookouts', cat: 'List of Collectibles', name: 'Te Awaroa - Lookout Points', rank: 'bronze', current: 0, goal: 13, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Harakeke Point [10368, 9607]", "Kahikatea Point [6627, 7760]", "Kātote Point [12024, 8497]", "Kawakawa Point [7435, 9386]", "Māhoe Point [5688, 10179]",
            "Mingimingi Point [8263, 8174]", "Ponga Point [11616, 11289]", "Pātītī Point [5414, 6767]", "Rārahu Point [10552, 7254]", "Rimu Point [5445, 8792]",
            "Tāwhai Point [10309, 12720]", "Tī Kōuka Point [8487, 11511]", "Wī Kura Point [4050, 10433]"
        ])
    },
    {
        id: 'coll_te_landmarks', cat: 'List of Collectibles', name: 'Te Awaroa - Landmarks', rank: 'bronze', current: 0, goal: 21, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Adapt or Perish [4721, 7641]", "Alpine Ops [6282, 7794]", "An Unlikely Celebrity [4836, 10804]", "As Good as Gold? [10684, 7159]", "A Proud History [8333, 7796]",
            "A Poisonous Debate [5162, 8891]", "Castle Crashers [5517, 7180]", "If These Walls Could Talk [6693, 9065]", "Karst into Darkness [8625, 9204]", "Movie Magic [9565, 11363]",
            "Pomp and Ceremony [10730, 11837]", "Preserving the Past [4997, 9281]", "Sand Stones [11131, 11143]", "Tat'll Do It [12218, 10040]", "Tree-rific [9139, 10765]",
            "Try, Try Again [9543, 8842]", "The Fairy Folk [9200, 10083]", "The Legend of the Lost Tribe [5906, 10169]", "The Legend of Poutini [5359, 9967]", "The Treaty of Waitangi [10673, 9518]",
            "Weaving Stories [4579, 9933]"
        ])
    },

    // --- RANCHO DEL ARROYO ---
    {
        id: 'coll_rancho_outposts', cat: 'List of Collectibles', name: 'Rancho del Arroyo - Outposts', rank: 'bronze', current: 0, goal: 21, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Casa de los Domínguez [-8781, 6783]", "Casa de los Flores [-10938, 9117]", "Casa de los García [-11422, 6705]", "Casa de los Gil [-7610, 6352]", "Casa de los González [-4269, 11018]",
            "Casa de los Gutiérrez [-9858, 7232]", "Casa de los Juárez [-9913, 10821]", "Casa de los López [-10341, 7986]", "Casa de los Martínez [-11396, 5035]", "Casa de los Moreno [-7046, 7847]",
            "Casa de los Ortega [-10900, 10462]", "Casa de los Pérez [-9712, 4847]", "Casa de los Reyes [-5543, 12296]", "Casa de los Ruiz [-8885, 5961]", "Casa de los Torres [-7588, 11883]",
            "Casa de los Valenzuela [-7171, 9839]", "Casa de los Vasquez [-10204, 9254]", "Casa de los Velásquez [-9806, 11884]", "Casa de los Zárate [-9207, 10057]", "Casa de los Castro [-8025, 9142]",
            "La Casa Grande [-8777, 8336]"
        ])
    },
    {
        id: 'coll_rancho_lookouts', cat: 'List of Collectibles', name: 'Rancho del Arroyo - Lookout Points', rank: 'bronze', current: 0, goal: 11, type: 'checklist',
        subItems: formatAlphaCheckset([
            "Mirador Alto [-6487, 6950]", "Mirador Bajavista [-9201, 7077]", "Mirador de la Laguna [-7761, 5189]", "Mirador de los Charcos [-6113, 9550]", "Mirador de los Mártires [-10202, 5319]",
            "Mirador del Aguaje [-7864, 8707]", "Mirador del Paso [-5410, 12019]", "Mirador del Río [-8281, 11205]", "Mirador del Sahuaro [-10080, 9091]", "Mirador del Seco [-11524, 7500]",
            "Mirador Eusebio Kino [-10738, 11619]"
        ])
    },
    {
        id: 'coll_rancho_landmarks', cat: 'List of Collectibles', name: 'Rancho del Arroyo - Landmarks', rank: 'bronze', current: 0, goal: 16, type: 'checklist',
        subItems: formatAlphaCheckset([
            "A Hard Living [-8831, 7556]", "A Violent Start [-10610, 6881]", "Animal Magic [-9599, 8552]", "Beggar Thy Neighbor [-4411, 6507]", "Conservation in the Borderlands [-7174, 11770]",
            "Día de Muertos [-7474, 9178]", "El Centauro del Norte [-6941, 10396]", "Extracting Justice [-10377, 10564]", "Hotspot [-10203, 8700]", "Immigrant Songs [-4938, 9796]",
            "Indigenous Peoples of Sonora [-9556, 9335]", "Macabra [-11007, 9351]", "Miracle Workers [-11217, 12082]", "The Secret of Sonora [-5085, 11813]", "Unfinished Business [-8795, 10194]",
            "Working Women [-1023, 110718]"
        ])
    }
];

const appState = {
    activeHunter: 'Werewolf3788',
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 },
    auth: null, db: null,
    collapsedSections: {},
    openDropdowns: {}, 
    psnSynced: false,
    masterUnsub: null,
    legacyUnsub: null,
    dataLoaded: false,

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
            if (document.getElementById('dynamic-nav-links')) {
                document.getElementById('dynamic-nav-links').innerHTML = `<span style="color: #ef4444; font-size: 0.8rem; padding: 8px;">Menu Sync Error</span>`;
            }
        }
    },

    init: async function() {
        const saved = localStorage.getItem('cotw_master_active_id');
        if (saved) this.activeHunter = saved;
        
        this.loadNavigation();
        
        try {
            const app = initializeApp(firebaseConfig, 'COTW-Master-named');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            signInAnonymously(this.auth).catch(err => {
                console.error("FIREBASE AUTH ERROR:", err);
                if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `AUTH FAILED: ${err.message}`;
            });

            onAuthStateChanged(this.auth, (user) => { 
                if (user) {
                    this.loadHunter(this.activeHunter);
                    if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `SYNCED DB: ${firebaseConfig.projectId} | USER: ${user.uid}`;
                    
                    setTimeout(() => this.syncWithPSNData(), 2500);
                } else {
                    if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `AUDIT STATUS: WAITING FOR AUTHENTICATION...`;
                }
            });
        } catch (err) {
            console.error("Init Error:", err);
        }
        this.render();
    },

    syncWithPSNData: async function() {
        if (this.psnSynced) return;
        
        const jsonUserKey = USER_DATA_MAP[this.activeHunter];
        if (!jsonUserKey) {
            console.log(`No matching JSON object configuration found for tracker name: ${this.activeHunter}. Skipping PSN Sync.`);
            return;
        }

        try {
            const url = 'https://raw.githubusercontent.com/Werewolf3788/Website/main/Playstation/psn_data.json';
            const response = await fetch(url + '?nocache=' + new Date().getTime());
            if (!response.ok) throw new Error("JSON profile payload missing on GitHub repository.");
            
            const fullJsonDump = await response.json();
            
            let userWrapper = fullJsonDump?.users?.[jsonUserKey];
            if (!userWrapper) {
                console.log(`No nested user key matched inside JSON structure for profile lookups: ${jsonUserKey}`);
                return; 
            }

            let psnTrophies = userWrapper?.trophies || [];
            
            if (psnTrophies.length === 0 && userWrapper?.activeHunt?.trophies) {
                psnTrophies = userWrapper.activeHunt.trophies;
            }

            let updated = false;

            this.hunterData.forEach(t => {
                const match = psnTrophies.find(p => p.name && p.name.toLowerCase().trim() === t.name.toLowerCase().trim());
                
                if (match) {
                    const imgUrl = match.iconUrl || match.icon || match.image;
                    if (imgUrl && t.psnImage !== imgUrl) {
                        t.psnImage = imgUrl;
                        updated = true;
                    }
                    
                    const isEarned = match.earned === true || match.unlocked === true || match.achieved === true || match.progress >= 100;
                    
                    if (isEarned) {
                        if (t.type === 'checklist') {
                            const allDone = t.subItems.every(s => s.done);
                            if (!allDone) {
                                t.subItems.forEach(s => s.done = true);
                                t.current = t.goal;
                                updated = true;
                            }
                        } else {
                            if (t.current < t.goal) {
                                t.current = t.goal;
                                updated = true;
                            }
                        }
                    }
                }
            });

            if (updated) {
                this.sync(); 
            }
            
            this.psnSynced = true;
            if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = document.getElementById('stat-line').innerText.replace(' | PSN AUTO-SYNC ACTIVE', '') + " | PSN AUTO-SYNC ACTIVE";
            
        } catch (err) {
            console.log("PSN Auto-Sync processing delay:", err);
        }
    },

    loadHunter: function(name) {
        if (!this.auth.currentUser) return;

        this.hunterData = JSON.parse(JSON.stringify(trophyData));
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };
        this.dataLoaded = false;

        this.activeHunter = name;
        localStorage.setItem('cotw_master_active_id', name);
        if (document.getElementById('hunter-name')) document.getElementById('hunter-name').innerText = name.toUpperCase();
        if (document.getElementById('master-body')) document.getElementById('master-body').className = `theme-${name === 'Werewolf3788' ? 'werewolf' : name === 'Ray' || name === 'Raymystyro' ? 'ray' : 'Adam'}`;
        
        this.render();
        this.updateRankUI();

        if (this.masterUnsub) this.masterUnsub();
        if (this.legacyUnsub) this.legacyUnsub();

        const masterRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', name);
        this.masterUnsub = onSnapshot(masterRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                let incoming = data.trophies || [];
                
                if (Array.isArray(data)) incoming = data;
                else if (Object.keys(data).length > 0 && !data.trophies) {
                    incoming = Object.values(data).filter(x => x && x.id);
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
                            if (found.done === true || found.completed === true) {
                                dt.current = dt.goal;
                            } else {
                                dt.current = Number(found.current) || 0; 
                            }
                        }
                    }
                    return dt;
                });
            }
            this.dataLoaded = true;
            this.render();
        }, (error) => {
            console.error("Master Document Sync Error: ", error);
        });

        const legacyRef = doc(this.db, 'artifacts', LEGACY_ID, 'public', 'data', 'userTrophies', name);
        this.legacyUnsub = onSnapshot(legacyRef, (snap) => {
            if (snap.exists()) { 
                this.animalRankData = snap.data(); 
                this.updateRankUI(); 
            }
        }, (error) => {
            console.error("Legacy Document Sync Error: ", error);
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
                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                        <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${t.subItems.map((s, idx) => `<div class="sub-item"><span>${s.name}</span><button class="check-btn ${s.done?'is-done':''}" onclick="appState.check('${t.id}', ${idx})">${s.done?'✓':''}</button></div>`).join('')}</div>`;
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
    
    adjRank: async function(tier, val) { 
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val); 
        this.updateRankUI(); 
        if (!this.db || !this.auth.currentUser) {
            console.warn("Rank Save Blocked: No active Firebase Auth session.");
            return;
        }
        try {
            await setDoc(doc(this.db, 'artifacts', LEGACY_ID, 'public', 'data', 'userTrophies', this.activeHunter), this.animalRankData, { merge: true }); 
            console.log("Rank successfully synced to Firebase.");
        } catch (error) {
            console.error("FIREBASE RANK SAVE ERROR:", error);
            if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `RANK SYNC ERROR: Check console (Rules/Auth)`;
        }
    },
    
    updateRankUI: function() { Object.keys(this.animalRankData).forEach(k => { const el = document.getElementById(`rank-val-${k}`); if (el) el.innerText = this.animalRankData[k]; }); },
    
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
    
    sync: async function() { 
        this.render(); 
        if (!this.db || !this.auth.currentUser || !this.dataLoaded) {
            console.warn("Tracker Save Blocked: Waiting for data load or authentication.");
            return;
        } 

        try {
            const ref = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', this.activeHunter); 
            await setDoc(ref, { trophies: this.hunterData, lastUpdate: Date.now() }, { merge: true }); 
            console.log("Tracker data successfully pushed via database pipeline.");
        } catch (error) {
            console.error("FIREBASE TRACKER SAVE ERROR:", error);
            if (document.getElementById('stat-line')) document.getElementById('stat-line').innerText = `TRACKER SYNC ERROR: Check console (Rules/Auth)`;
        }
    }
};

window.appState = appState; 
appState.init();

// --- GLOBAL CLICK LISTENER FOR DROPDOWNS ---
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-trigger') && !event.target.closest('.dropdown-content')) {
        document.querySelectorAll('.dropdown-content.show').forEach(el => {
            el.classList.remove('show');
            const id = el.id.replace('drop-', '');
            appState.openDropdowns[id] = false;
        });
    }
};
