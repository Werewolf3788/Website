/*
 * ==========================================
 * NYT TIMESTAMP: Fri, June 12, 2026, 5:02 PM EDT
 * PRECISION INTEGRATION: Frontend JS Nervous System (script.js)
 * NOTES: Fixed deep merging bug within `loadGlobalCollectibles` that caused
 * checked items to drop back to zero upon hard browser refreshes. The system now
 * safeguards existing checked items if Firestore data is blank or uninitialized.
 * Completed components cleanly transform into static lock-badges but retain open
 * interactive dropdown access. Bypasses hunter profile filtering rules for open items.
 * NO STRIPPING, NO COMPRESSING. FULL REGISTRY 100% INTACT.
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

    // --- SILVER RIDGE PEAKS (DETAILED WIKI REGISTRY) ---
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
    // --- FULL MAP COLLECTIBLES REGISTRY (GLOBAL & OPEN) ---
    // ==========================================================
    
    // --- LAYTON LAKE DISTRICT ---
    { 
        id: 'coll_layton_outposts', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Outposts', 
        rank: 'bronze', current: 0, goal: 18, type: 'checklist', isGlobal: true,
        desc: 'Fast travel cabins and lockers located in each region.',
        subItems: checkSet([
            "1. Balmont Railroad Outpost [9557, 10760]", "2. Roonachee Western Outpost [6005, 10738]",
            "3. Balmont Outpost [9919, 10265]", "4. Roonachee Outpost [7417, 10161]",
            "5. Mount Leviathan Outpost [12291, 10108]", "6. Cheelah Southern Outpost [12401, 9051]",
            "7. Balmont Northern Outpost [8689, 9040]", "8. Cheelah Outpost [10811, 8337]",
            "9. Mount Kraken Outpost [7393, 7962]", "10. Norden Outpost [11629, 7719]",
            "11. Highlake Southern Outpost [9271, 7636]", "12. Norden Eastern Outpost [12815, 7068]",
            "13. Willipeg Southern Outpost [6667, 6601]", "14. High Lake Outpost [8874, 6169]",
            "15. Calburn Outpost [10956, 5643]", "16. Willipeg Outpost [6723, 5209]",
            "17. Chopeeka Outpost [8867, 4422]", "18. Norden Northern Outpost [12651, 4186]"
        ])
    },
    { 
        id: 'coll_layton_lookouts', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Lookout Points', 
        rank: 'bronze', current: 0, goal: 16, type: 'checklist', isGlobal: true,
        desc: 'Information board structures that reveal surrounding area marks.',
        subItems: checkSet([
            "1. Mount Leviathan Lookout Point [11447, 11119]", "2. Balmont Western Lookout Point [8298, 11106]",
            "3. Balmont Eastern Lookout Point [9846, 10814]", "4. Roonachee Lookout Point [6596, 10074]",
            "5. Balmont Northern Lookout Point [8308, 9512]", "6. Cheelah Lookout Point [11897, 8973]",
            "7. High Lake Southern Lookout Point [9763, 8266]", "8. Mount Kraken Lookout Point [7628, 7544]",
            "9. Norden Eastern Lookout Point [12341, 7510]", "10. Norden Western Lookout Point [10984, 7205]",
            "11. High Lake Northern Lookout Point [8758, 6524]", "12. Willipeg Lookout Point [6795, 5879]",
            "13. Calburn Western Lookout Point [9763, 4971]", "14. Calburn Eastern Lookout Point [11535, 4763]",
            "15. Chopeeka Western Lookout Point [5896, 4394]", "16. Chopeeka Eastern Lookout Point [8094, 4357]"
        ])
    },
    { 
        id: 'coll_layton_poi', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Points of Interest', 
        rank: 'bronze', current: 0, goal: 34, type: 'checklist', isGlobal: true,
        desc: 'Locations providing additional geographic and character narrative information.',
        subItems: checkSet([
            "1. Wildlife Varmint Control [10661, 11063]", "2. The Hummingbird [8117, 10996]", 
            "3. A Written Note [9935, 10997]", "4. Hunting Tip [6868, 10995]", 
            "5. The Bad Water [8676, 10982]", "6. Leviathan Volcano [11328, 10290]", 
            "7. Note by R. Hope [10182, 10195]", "8. About the Whitetail [9004, 10097]", 
            "9. The Deer Antlers [8266, 10012]", "10. The Oregon Trail [7149, 9970]", 
            "11. Camping Guidelines [11628, 9293]", "12. The Lake District Hiking Trail [9306, 9167]", 
            "13. About the Black Bear [6969, 9138]", "14. The Game Warden [10242, 9131]", 
            "15. The Balmont Poem [8372, 9050]", "16. The Coywolf [12993, 8823]", 
            "17. The Trickster [11627, 8156]", "18. Bear Cabbage [7895, 8149]", 
            "19. Note by J. Trampfine [7124, 8122]", "20. About the Whitetail [10122, 8057]", 
            "21. A Written Note [8835, 8016]", "22. The Land of Volcanos [9254, 7046]", 
            "23. The Moose [6625, 6810]", "24. Coal Mining [10489, 6801]", 
            "25. Fire Watch [11282, 6782]", "26. About the Blacktail [8198, 6683]", 
            "27. Layton Canyon [13233, 6607]", "28. The Calburn Poem [10170, 5813]", 
            "29. Note by P. Beatty [7175, 5082]", "30. A Written Note [8352, 5058]", 
            "31. The Conservationist President [9257, 4627]", "32. Layton River [12977, 4577]", 
            "33. Survivor's Camp [11100, 4400]", "34. Old World Diseases [7235, 4154]"
        ])
    },
    { 
        id: 'coll_layton_landmarks', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Landmarks', 
        rank: 'bronze', current: 0, goal: 12, type: 'checklist', isGlobal: true,
        desc: 'Structures giving insight into the map\'s historical and structural features.',
        subItems: checkSet([
            "1. Leviathan Cave [12053, 11240]", "2. Roonachee Church [6797, 11216]", 
            "3. Lake District Railway [7824, 10280]", "4. Lake District Survival Camp [8837, 10060]", 
            "5. Cheelah Hiking Village [11962, 9461]", "6. Kraken Rope Bridge [6952, 9056]", 
            "7. High Lake Rock Formations [9627, 8044]", "8. Norden Mining Structures [10702, 6595]", 
            "9. Willipeg Caves [6249, 6515]", "10. High Lake Mountain Lake [8507, 5865]", 
            "11. Chopeeka Natives Grounds [7794, 5422]", "12. Calburn Accident Site [11095, 4569]"
        ])
    },
    { 
        id: 'coll_layton_artifacts', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Artifacts', 
        rank: 'silver', current: 0, goal: 10, type: 'checklist', isGlobal: true,
        desc: 'Historical components discovered within the Pacific Northwest Wilderness zones.',
        subItems: checkSet([
            "Native Pot 1 [Balmont: 8664, 11471]",
            "Native Pot 2 [Mount Leviatan: 12065, 11243]",
            "Native Pot 3 [Willipeg: 6267, 6498]",
            "WW1 Badge 1 [Calburn: 10208, 5281]",
            "WW1 Badge 2 [Cheelah: 11164, 9155]",
            "WW1 Badge 3 [Mount Kraken: 7183, 9168]",
            "WW1 Badge 4 [Balmont: 9920, 10327]",
            "Native Axe 1 [Cheelah: 13446, 8529]",
            "Native Axe 2 [Chopeeka: 8868, 5025]",
            "Native Axe 3 [High Lake: 8551, 6539]"
        ])
    },
    { 
        id: 'coll_layton_sheds', 
        cat: 'List of Collectibles', 
        name: 'Layton Lake - Antler Sheds', 
        rank: 'bronze', current: 0, goal: 40, type: 'checklist', isGlobal: true,
        desc: 'Naturally cast antler fragments matching regional deer and moose herds.',
        subItems: checkSet([
            "Whitetail Deer Small Shed Antler [Balmont: 10186, 11292]",
            "Whitetail Deer Large Shed Antler [Roonachee: 7152, 10960]",
            "Whitetail Deer Large Shed Antler [Mount Leviatan: 10617, 10944]",
            "Whitetail Deer Small Shed Antler [Roonachee: 6515, 10574]",
            "Whitetail Deer Large Shed Antler [Balmont: 10728, 10486]",
            "Moose Small Shed Antler [Balmont: 8598, 10352]",
            "Moose Small Shed Antler [Roonachee: 6906, 10287]",
            "Fallow Deer Small Shed Antler [Balmont: 9652, 10071]",
            "Roosevelt Elk Large Shed Antler [Balmont: 9848, 9644]",
            "Roosevelt Elk Large Shed Antler [Mount Leviatan: 10908, 9519]",
            "Moose Large Shed Antler [Balmont: 8310, 9402]",
            "Whitetail Deer Large Shed Antler [Balmont: 8929, 9060]",
            "Whitetail Deer Large Shed Antler [Mount Kraken: 6542, 8790]",
            "Whitetail Deer Small Shed Antler [Mount Kraken: 6965, 8389]",
            "Whitetail Deer Large Shed Antler [High Lake: 10349, 8122]",
            "Moose Large Shed Antler [Cheelah: 11029, 7988]",
            "Whitetail Deer Large Shed Antler [Cheelah: 12255, 7918]",
            "Blacktail Deer Small Shed Antler [High Lake: 9042, 7820]",
            "Fallow Deer Small Shed Antler [Mount Kraken: 7342, 7609]",
            "Roosevelt Elk Small Shed Antler [High Lake: 8936, 7453]",
            "Roosevelt Elk Small Shed Antler [Norden: 13132, 7244]",
            "Moose Small Shed Antler [High Lake: 9622, 7176]",
            "Roosevelt Elk Large Shed Antler [Mount Kraken: 6575, 7143]",
            "Moose Small Shed Antler [Norden: 10101, 7006]",
            "Blacktail Deer Small Shed Antler [Norden: 11832, 6884]",
            "Roosevelt Elk Large Shed Antler [Norden: 11443, 6621]",
            "Fallow Deer Small Shed Antler [Norden: 13399, 5940]",
            "Whitetail Deer Large Shed Antler [Caliburn: 9427, 5744]",
            "Whitetail Deer Large Shed Antler [Willipeg: 6520, 5605]",
            "Blacktail Deer Small Shed Antler [Calburn: 11044, 5296]",
            "Moose Large Shed Antler [Chopeeka: 7526, 5258]",
            "Fallow Deer Small Shed Antler [Calburn: 10463, 5119]",
            "Moose Small Shed Antler [Chopeeka: 8235, 5062]",
            "Roosevelt Elk Small Shed Antler [Calburn: 9881, 5021]",
            "Fallow Deer Small Shed Antler [Calburn: 9683, 4871]",
            "Roosevelt Elk Large Shed Antler [Calburn: 11884, 4839]",
            "Whitetail Deer Large Shed Antler [Chopeeka: 6797, 4840]",
            "Fallow Deer Small Shed Antler [Norden: 13411, 4800]",
            "Roosevelt Elk Large Shed Antler [Chopeeka: 8354, 3829]",
            "Moose Large Shed Antler [Chopeeka: 7552, 3818]"
        ])
    },

    // --- HIRSCHFELDEN HUNTING RESERVE ---
    {
        id: 'coll_hirsch_artifacts',
        cat: 'List of Collectibles',
        name: 'Hirschfelden Hunting Reserve - Artifacts',
        rank: 'silver', current: 0, goal: 12, type: 'checklist', isGlobal: true,
        desc: 'Relics spanning ancient tribal crossings to European battle zone campaigns.',
        subItems: checkSet([
            "WW1 Russian Dog Tag [Tichenau: -8883, 12958]",
            "WW1 Helmet 2 [Tichenau: -10355, 12189]",
            "Viking Coin 1 [Rathenfeldt: -4416, 11665]",
            "WW1 Medal 1 [Schonfeldt: -6736, 11061]",
            "WW1 US Dog Tag [Ernsdorf: -10399, 10203]",
            "WW1 Medal 4 [Spreeberg: -6883, 9852]",
            "WW1 Medal 5 [Petershain: -4850, 9167]",
            "WW1 Medal 2 [Spreeberg: -7580, 8784]",
            "WW1 Medal 3 [Petershain: -4482, 8492]",
            "WW1 Helmet 1 [Jonsdorf: -8925, 7738]",
            "Viking Coin 2 [Ritterstein: -5781, 7263]",
            "WW1 German Dog Tag [Müllerwald: -5500, 5534]"
        ])
    },
    {
        id: 'coll_hirsch_sheds',
        cat: 'List of Collectibles',
        name: 'Hirschfelden Hunting Reserve - Sheds',
        rank: 'bronze', current: 0, goal: 41, type: 'checklist', isGlobal: true,
        desc: 'Cast bone remnants located within the central European dense forestry fields.',
        subItems: checkSet([
            "Roe Deer Large Shed Antler [Schonfeldt: -7666, 13216]",
            "Fallow Deer Large Shed Antler [Rathenfeldt: -5729, 12980]",
            "Roe Deer Large Shed Antler [Rathenfeldt: -4152, 12614]",
            "Fallow Deer Large Shed Antler [Rathenfeldt: -4650, 12594]",
            "Roe Deer Large Shed Antler [Schonfeldt: -6303, 12504]",
            "Fallow Deer Large Shed Antler [Tichenau: -8364, 12473]",
            "Fallow Deer Small Shed Antler [Rathenfeldt: -5080, 12184]",
            "Roe Deer Large Shed Antler [Tichenau: -8849, 12145]",
            "Fallow Deer Small Shed Antler [Schonfeldt: -7257, 12117]",
            "Roe Deer Large Shed Antler [Tichenau: -9461, 12100]",
            "Fallow Deer Large Shed Antler [Rathenfeldt: -3765, 11725]",
            "Roe Deer Large Shed Antler [Tichenau: -10149, 11684]",
            "Roe Deer Large Shed Antler [Schonfeldt: -6605, 11378]",
            "Roe Deer Large Shed Antler [Ernsdorf: -9422, 11343]",
            "Fallow Deer Large Shed Antler [Ernsdorf: -8363, 11291]",
            "Roe Deer Small Shed Antler [Rathenfeldt: -5781, 11118]",
            "Fallow Deer Large Shed Antler [Schonfeldt: -6627, 10902]",
            "Fallow Deer Small Shed Antler [Petershain: -3820, 10746]",
            "Fallow Deer Large Shed Antler [Schonfeldt: -7162, 10731]",
            "Roe Deer Large Shed Antler [Spreeberg: -6598, 10361]",
            "Fallow Deer Small Shed Antler [Spreeberg: -7914, 9623]",
            "Fallow Deer Large Shed Antler [Petershain: -4333, 9531]",
            "Fallow Deer Large Shed Antler [Spreeberg: -8915 , 9482]",
            "Fallow Deer Small Shed Antler [Petershain: -5539 , 9463]",
            "Roe Deer Large Shed Antler [Ernsdorf: -10556, 9304]",
            "Red Deer Large Shed Antler [Jonsdorf: -8839 , 8744]",
            "Roe Deer Large Shed Antler [Petershain: -5582, 8675]",
            "Red Deer Large Shed Antler [Ritterstein: -7300 , 7624]",
            "Roe Deer Large Shed Antler [Petershain: -4723 , 7400]",
            "Red Deer Small Shed Antler [Ritterstein: -7077 , 7153]",
            "Fallow Deer Large Shed Antler [Petershain: -4883 , 6877]",
            "Fallow Deer Large Shed Antler [Ritterstein: -6701 , 6841]",
            "Fallow Deer Small Shed Antler [Müllerwald: -5676 , 6524]",
            "Roe Deer Large Shed Antler [Müllerwald: -4364 , 6387]",
            "Roe Deer Large Shed Antler [Bohndorf: -9775 , 6019]",
            "Red Deer Small Shed Antler [Jonsdorf: -8567 , 5907]",
            "Roe Deer Large Shed Antler [Ritterstein: -7271 , 5756]",
            "Fallow Deer Large Shed Antler [Müllerwald: -5013 , 5690]",
            "Fallow Deer Large Shed Antler [Müllerwald: -3921, 5647]",
            "Red Deer Large Shed Antler [Bohndorf: -9228 , 5584]",
            "Red Deer Large Shed Antler [Ritterstein: -8601 , 5476]"
        ])
    },
    {
        id: 'coll_hirsch_poi',
        cat: 'List of Collectibles',
        name: 'Hirschfelden Hunting Reserve - Points of Interest',
        rank: 'bronze', current: 0, goal: 39, type: 'checklist', isGlobal: true,
        desc: 'Discover all 39 unique Points of Interest, local folklore, and regional history scattered across the reserve.',
        subItems: checkSet([
            "1. Red Deer Canyon", "2. Mount Burgen", "3. The Bohndorf Meteorite", "4. The Mullerwald Poem",
            "5. Konigsberg Lake", "6. The Rathenfeldt Poem", "7. A Written Note (1 of 4)", "8. A Written Note (2 of 4)",
            "9. A Written Note (3 of 4)", "10. A Written Note (4 of 4)", "11. Hunting Tip", "12. The Konigsberg Heir",
            "13. The Landslide", "14. Red Deer Water", "15. Robert \"Strong Elk\" Fog", "16. About The Red Fox",
            "17. Note By Dr. Otto Canella", "18. The Christmas Tree", "19. About the Wild Boar", "20. The German Peasants' War",
            "21. The Spree Nixe", "22. About the Bison", "23. The European Bison Advisory Organization", "24. Red Deer Venison",
            "25. Wild Boar Land", "26. Hirschdorf River", "27. A Warning", "28. Sommer's Land", "29. The World Famous Deer",
            "30. Red Deer Hill", "31. Star Hunting Tours", "32. Hunting with Birds", "33. The Deer Roast",
            "34. About the Fallow Deer", "35. The History of Spreeberg", "36. The Spruce Tree", "37. Note by G. Jager",
            "38. The Wurm Glaciation", "39. Bad Crop"
        ])
    },

    // --- MEDVED-TAIGA NATIONAL PARK ---
    {
        id: 'coll_medved_artifacts',
        cat: 'List of Collectibles',
        name: 'Medved-Taiga National Park - Artifacts',
        rank: 'silver', current: 0, goal: 20, type: 'checklist', isGlobal: true,
        desc: 'Siberian ice-age structural anomalies consisting of canine fragments and mammoth bone fossils.',
        subItems: checkSet([
            "Cave Lion Canine Tooth [Mamontovaya Tundra: -6730, -5066]",
            "Cave Lion Canine Tooth [Lesnye Lands: -9026, -5175]",
            "Mammoth Tusk [Mamontovaya Tundra: -5696, -5543]",
            "Mammoth Tusk [Mamontovaya Tundra: -4566, -5852]",
            "Mammoth Tusk [Pustaya Mountain: -6035, -5993]",
            "Mammoth Tusk [Mamontovaya Tundra: -5393, -6026]",
            "Cave Lion Canine Tooth [Pustaya Mountain: -7301, -6114]",
            "Mammoth Tusk [Mamontovaya Tundra: -4849, -6268]",
            "Mammoth Tusk [Mamontovaya Tundra: -4120, -6765]",
            "Mammoth Tusk [Mamontovaya Tundra: -5673, -6908]",
            "Cave Lion Canine Tooth [Pustaya Mountain: -6556, -7075]",
            "Mammoth Tusk [Mamontovaya Tundra: -4964, -7601]",
            "Mammoth Tusk [Mamontovaya Tundra: -6849, -7696]",
            "Cave Lion Canine Tooth [Rybatskiy Bay: -9955, -7703]",
            "Mammoth Tusk [Pustaya Mountain: -7881, -8567]",
            "Cave Lion Canine Tooth [Pustaya Mountain: -8291, -8619]",
            "Cave Lion Canine Tooth [Pustaya Mountain: -7755, -9499]",
            "Cave Lion Canine Tooth [Dikiy Coast: -6517, -10438]",
            "Cave Lion Canine Tooth [Dikiy Coast: -4984, -10568]",
            "Cave Lion Canine Tooth [Zverolova Hill: -9994, -11273]"
        ])
    },
    {
        id: 'coll_medved_sheds',
        cat: 'List of Collectibles',
        name: 'Medved-Taiga National Park - Sheds',
        rank: 'bronze', current: 0, goal: 30, type: 'checklist', isGlobal: true,
        desc: 'Taiga tundra ecosystem markers showcasing ancient ice cat skulls and massive antler sheds.',
        subItems: checkSet([
            "Moose Large Shed Antler [Priyut Dohloy Sobaki: -11188, -5091]",
            "Cave Lion Skull [Kostyanoy Priyut: -9338, -5191]",
            "Moose Large Shed Antler [Odinokie Dni: -6967, -6020]",
            "Reindeer Large Shed Antler [Odinokie Nochi: -9751, -6369]",
            "Reindeer Large Shed Antler [Belye Nochi: -4478, -6805]",
            "Reindeer Small Shed Antler [Sobach'ye Serdtse: -7980, -7105]",
            "Moose Small Shed Antler [Izluchina Viktora: -10210, -7241]",
            "Cave Lion Skull [Na Kulichkakh: -6403, -7281]",
            "Reindeer Large Shed Antler [Zhizn' i Sud'ba: -11402, -7593]",
            "Moose Large Shed Antler [Zapadnyy Ledyanoy Tonnel': -7765, -7673]",
            "Cave Lion Skull [Myortvye Dushi: -10047, -7985]",
            "Cave Lion Skull [Kaban'ya Tropa: -5425, -8032]",
            "Moose Large Shed Antler [Rakovyi Korpus: -8343, -8438]",
            "Cave Lion Skull [Vostochnyy Ledyanoy Tonnel': -6738, -8526]",
            "Reindeer Small Shed Antler [Chekurovka: -9117, -9000]",
            "Reindeer Large Shed Antler [Khizhina Anatoliya: -10078, -9267]",
            "Moose Large Shed Antler [Derevnya Dvukh Rek: -11650, -9423]",
            "Moose Large Shed Antler [Beliy Parokhod: -8034, -9581]",
            "Moose Large Shed Antler [Dvorets Chuchuni: -7103, -9655]",
            "Cave Lion Skull [Khizhina Nikolaya: -8976, -9863]",
            "Moose Small Shed Antler [Na Dne: -5548, -9905]",
            "Reindeer Large Shed Antler [Dom, Gde Razbivayutsa Serdtsa: -8133, -10264]",
            "Reindeer Small Shed Antler [Taras Bul'ba: -6457, -10363]",
            "Moose Small Shed Antler [Dvorets Kaban'yevo Tsarya: -7540, -10822]",
            "Reindeer Small Shed Antler [Tikhiy Don: -9204, -10889]",
            "Cave Lion Skull [Khizhina Gryankina: -8375, -10985]",
            "Moose Large Shed Antler [Khizhina Petra: -7963, -11039]",
            "Moose Large Shed Antler [Kabala Svyatosh: -9805, -11110]",
            "Moose Small Shed Antler [Ray Dikogo Poberezh'ya: -6556, -11123]",
            "Cave Lion Skull [Posledniy Priyut: -5772, -11130]"
        ])
    },

    // --- VURHONGA SAVANNA ---
    {
        id: 'coll_vurhonga_artifacts',
        cat: 'List of Collectibles',
        name: 'Vurhonga Savanna - Artifacts',
        rank: 'gold', current: 0, goal: 5, type: 'checklist', isGlobal: true,
        desc: 'Sacred tribal protections, ancient feline remains, and historical tracking assets.',
        subItems: checkSet([
            "The Golden Rhinoceros of Mapungubwe [Vupeladyambu / Vurhonga Plateau: 5317, -7567]",
            "Mask of Sangoma [Dzonga / Central Savanna: 8721, -7672]",
            "Scimitar-Toothed Cat [Vupeladyambu / Vurhonga Plateau, in a Cave: 4989, -8219]",
            "Dinofelis Skull [Vupeladyambu / Vurhonga Plateau, in a Cave: 5845, -8304]",
            "Nyaminyami [Dzonga / Central Savanna: 9134, -8504]"
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
                if (t.isGlobal) return;
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
                
                this.loadGlobalCollectibles();
            } else {
                this.loadGlobalCollectibles();
            }
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

    loadGlobalCollectibles: function() {
        const globalRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'globalCollectibles');
        onSnapshot(globalRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const incoming = data.collectibles || [];
                this.hunterData.forEach(dt => {
                    if (dt.isGlobal) {
                        const found = incoming.find(it => it.id === dt.id);
                        if (found && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                // CORE RESOLUTION SAFEGUARD: Merge database states but never wipe out local progress checks
                                const dbState = dbMatch?.done === true;
                                return {...si, done: dbState || si.done};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        }
                    }
                });
            }
            this.dataLoaded = true;
            this.render();
        }, (err) => {
            console.error("Global Collectibles Loading Error: ", err);
            this.dataLoaded = true;
            this.render();
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
                if (t.plat !== false && !t.isGlobal) { globalTotal++; if (done) globalMet++; }
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
                card.className = `trophy-card ${isDone ? 'completed' : ''} ${t.isGlobal ? 'global-card' : ''}`;
                
                let ctrl = '';
                
                if (t.type === 'numeric') {
                    const btnClass = isDone ? 'controls lock-badge' : 'controls';
                    const verifiedText = isDone ? (t.isGlobal ? 'GLOBAL VERIFIED' : 'AUDIT VERIFIED') : '';
                    const displayVal = isDone ? `${verifiedText} (${t.current}/${t.goal})` : `${t.current}/${t.goal}`;
                    ctrl = `<div class="${btnClass}">
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', -1)">-</button>
                        <span style="flex-grow:1; text-align:center;">${displayVal}</span>
                        <button style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer; padding:0 10px;" onclick="appState.adj('${t.id}', 1)">+</button>
                    </div>`;
                } else if (t.type === 'checklist') {
                    const dropClass = appState.openDropdowns[t.id] ? 'show' : '';
                    const btnClass = isDone ? 'dropdown-trigger lock-badge' : 'dropdown-trigger';
                    const btnText = isDone ? (t.isGlobal ? `Globally Verified (${t.current}/${t.goal})` : `Audit Verified (${t.current}/${t.goal})`) : `Audit Registry (${t.current}/${t.goal})`;
                    ctrl = `<button class="${btnClass}" style="cursor: pointer;" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                        <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${t.subItems.map((s, idx) => `<div class="sub-item"><span>${s.name}</span><button class="check-btn ${s.done?'is-done':''}" onclick="appState.check('${t.id}', ${idx})">${s.done?'✓':''}</button></div>`).join('')}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? (t.isGlobal ? 'Globally Verified (Undo)' : 'Audit Verified (Undo)') : 'Mark Harvested';
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
    
    adj: function(id, val) { const t = this.hunterData.find(x => x.id === id); t.current = Math.max(0, t.current + val); this.sync(t); },
    
    tog: function(id) { const t = this.hunterData.find(x => x.id === id); t.current = t.current === 0 ? 1 : 0; this.sync(t); },
    
    check: function(id, idx) { const t = this.hunterData.find(x => x.id === id); t.subItems[idx].done = !t.subItems[idx].done; this.sync(t); },
    
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
    
    sync: async function(changedItem) { 
        this.render(); 
        if (!this.db || !this.auth.currentUser || !this.dataLoaded) {
            console.warn("Tracker Save Blocked: Waiting for data load or authentication.");
            return;
        } 

        try {
            if (changedItem && changedItem.isGlobal) {
                const globalRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'globalCollectibles');
                const globalCollectiblesList = this.hunterData.filter(x => x.isGlobal);
                await setDoc(globalRef, { collectibles: globalCollectiblesList, lastUpdate: Date.now() }, { merge: true });
                console.log("Global Collectibles tracked securely.");
            } else {
                const ref = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', this.activeHunter); 
                await setDoc(ref, { trophies: this.hunterData.filter(x => !x.isGlobal), lastUpdate: Date.now() }, { merge: true }); 
                console.log("Tracker successfully synced to Firebase.");
            }
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
