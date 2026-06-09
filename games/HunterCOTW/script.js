
/*
 * ==========================================
 * NYT TIMESTAMP: Tue, June 9, 2026, 3:54 PM EDT
 * PRECISION INTEGRATION: JS Nervous System
 * NOTES: Unstripped JS handling data sync and UI rendering.
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
     { id: 'head_shoulder_knees_toes', cat: 'Base Game', name: '	Head, Shoulders, Knees, And Toes', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, desc: '	Head, Shoulders, Knees, And Toes' },
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
    { id: 'par_species_audit', cat: 'DLC: Parque Fernando', name: 'Fernando Species Harvest', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Harvest every Fernando species.', subItems: checkSet(["Cinnamon Teal", "Blackbuck", "Axis Deer", "Collared Peccary", "Puma", "Mule Deer", "Red Deer", "Water Buffalo"]) },
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
    { id: 'srp_ascent', cat: 'DLC: Silver Ridge', name: 'The Ascent', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: "Complete 'The Ascent'." }
];

const appState = {
    activeHunter: 'Werewolf3788',
    hunterData: JSON.parse(JSON.stringify(trophyData)),
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 },
    auth: null, db: null,
    collapsedSections: {},
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
                data.shift(); // Skip the header row
            }

            const navContainer = document.getElementById('dynamic-nav-links');
            let navHTML = '';
            const groups = {};
            const standalone = [];

            data.forEach(row => {
                if (row.length < 3) return; // Skip invalid or empty rows
                const name = row[0]?.trim();
                const group = row[1]?.trim();
                const url = row[2]?.trim();
                let image = row[3]?.trim();

                if (!name || !url) return;

                // Auto-convert Google Drive links into direct image URLs
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

            // Render Dropdowns First
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

            // Render Standalone Items After
            standalone.forEach(item => {
                const imgTag = item.image ? `<img src="${item.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                navHTML += `<a href="${item.url}">${imgTag}${item.name}</a>`;
            });

            navContainer.innerHTML = navHTML;
        } catch (e) {
            console.error("Failed to load dynamic navigation", e);
            document.getElementById('dynamic-nav-links').innerHTML = `<span style="color: #ef4444; font-size: 0.8rem; padding: 8px;">Menu Sync Error</span>`;
        }
    },

    init: async function() {
        const saved = localStorage.getItem('cotw_master_active_id');
        if (saved) this.activeHunter = saved;
        
        this.loadNavigation(); // Load the Google Sheets Menu
        
        try {
            const app = initializeApp(firebaseConfig, 'COTW-Master-named');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            // Added direct error catching to auth to surface Anonymous Sign-in issues
            signInAnonymously(this.auth).catch(err => {
                console.error("FIREBASE AUTH ERROR: Is Anonymous Sign-In enabled in Firebase Console?", err);
                document.getElementById('stat-line').innerText = `AUTH FAILED: ${err.message}`;
            });

            onAuthStateChanged(this.auth, (user) => { 
                if (user) {
                    this.loadHunter(this.activeHunter);
                    document.getElementById('stat-line').innerText = `SYNCED DB: ${firebaseConfig.projectId} | USER: ${user.uid}`;
                    
                    // Trigger the automatic PSN JSON check shortly after login
                    setTimeout(() => this.syncWithPSNData(), 2500);
                } else {
                    document.getElementById('stat-line').innerText = `AUDIT STATUS: WAITING FOR AUTHENTICATION...`;
                }
            });
        } catch (err) {
            console.error("Init Error:", err);
        }
        this.render();
    },

    syncWithPSNData: async function() {
        // ONLY run PSN sync for Werewolf since it's pulling from Werewolf's GitHub
        if (this.psnSynced || this.activeHunter !== 'Werewolf3788') return;
        try {
            // Must use raw.githubusercontent to read actual JSON data, not the GitHub HTML webpage
            const url = 'https://raw.githubusercontent.com/Werewolf3788/Website/main/Playstation/psn_data.json';
            const response = await fetch(url, { cache: 'no-store' });
            
            if (!response.ok) throw new Error("JSON not populated yet");
            
            const data = await response.json();
            
            // Flexible parsing just in case the JSON structure varies
            let psnTrophies = Array.isArray(data) ? data : (data.trophies || data.data || []);
            let updated = false;

            this.hunterData.forEach(t => {
                const match = psnTrophies.find(p => p.name && p.name.toLowerCase() === t.name.toLowerCase());
                if (match) {
                    // 1. Map the custom image if it exists in the JSON
                    const imgUrl = match.iconUrl || match.icon || match.image;
                    if (imgUrl && t.psnImage !== imgUrl) {
                        t.psnImage = imgUrl;
                        updated = true;
                    }
                    
                    // 2. Auto-mark as complete if PSN says it's earned
                    const isEarned = match.earned === true || match.unlocked === true || match.achieved === true;
                    if (isEarned && t.current < t.goal && t.type !== 'checklist') {
                        t.current = t.goal;
                        updated = true;
                    }
                }
            });

            if (updated) {
                this.sync(); // Instantly save new images and auto-completions to Firebase
            }
            this.psnSynced = true;
            document.getElementById('stat-line').innerText += " | PSN AUTO-SYNC ACTIVE";
        } catch (err) {
            console.log("PSN Auto-Sync pending: waiting for JSON file to be generated on GitHub.");
        }
    },

    loadHunter: function(name) {
        if (!this.auth.currentUser) return;

        // FIX: Wipe the slate clean before loading a new profile
        this.hunterData = JSON.parse(JSON.stringify(trophyData));
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };
        this.dataLoaded = false; // Safety lock to prevent accidental overwrites during load

        this.activeHunter = name;
        localStorage.setItem('cotw_master_active_id', name);
        document.getElementById('hunter-name').innerText = name.toUpperCase();
        document.getElementById('master-body').className = `theme-${name === 'Werewolf3788' ? 'werewolf' : name === 'Raymystyro' ? 'ray' : 'Adam'}`;
        
        // Clear screen immediately
        this.render();
        this.updateRankUI();

        // Disconnect from the previous user's database stream
        if (this.masterUnsub) this.masterUnsub();
        if (this.legacyUnsub) this.legacyUnsub();

        const masterRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', name);
        this.masterUnsub = onSnapshot(masterRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                let incoming = data.trophies || [];
                
                // Failsafe: if data was saved as a direct array or object mapping in the past
                if (Array.isArray(data)) incoming = data;
                else if (Object.keys(data).length > 0 && !data.trophies) {
                    incoming = Object.values(data).filter(x => x && x.id);
                }

                this.hunterData = JSON.parse(JSON.stringify(trophyData)).map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                // UNIVERSAL TRANSLATOR: Accepts true, "true", or completed flags
                                const isDone = dbMatch?.done === true || dbMatch?.done === "true" || dbMatch?.completed === true;
                                return {...si, done: isDone};
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            // UNIVERSAL TRANSLATOR: Accepts booleans, strings, or strict numbers
                            if (found.done === true || found.completed === true) {
                                dt.current = dt.goal; // Force it to max if it was saved as a boolean 'true'
                            } else {
                                dt.current = Number(found.current) || 0; 
                            }
                        }
                    }
                    return dt;
                });
                this.dataLoaded = true; // Unlock saving
                this.render();
            } else {
                this.dataLoaded = true; // New profile, unlock saving
            }
        }, (error) => {
            console.error("Master Sync Error: ", error);
        });

        const legacyRef = doc(this.db, 'artifacts', LEGACY_ID, 'public', 'data', 'userTrophies', name);
        this.legacyUnsub = onSnapshot(legacyRef, (snap) => {
            if (snap.exists()) { 
                this.animalRankData = snap.data(); 
                this.updateRankUI(); 
            }
        }, (error) => {
            console.error("Legacy Sync Error: ", error);
        });
    },

    render: function() {
        const container = document.getElementById('section-container');
        const selector = document.getElementById('reserve-selector');
        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(t => t.cat))];
        
        if (selector.options.length <= 1) {
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
                if (t.plat !== false) { globalTotal++; if (done) globalMet++; }
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
                let ctrl = isDone ? `<div class="lock-badge">Audit Verified</div>` : '';
                if (!isDone) {
                    if (t.type === 'numeric') ctrl = `<div class="controls"><button onclick="appState.adj('${t.id}', -1)">-</button><span>${t.current}/${t.goal}</span><button onclick="appState.adj('${t.id}', 1)">+</button></div>`;
                    else if (t.type === 'checklist') ctrl = `<button class="dropdown-trigger" onclick="appState.toggleDrop('${t.id}')">Audit Registry (${t.current}/${t.goal})</button>
                        <div id="drop-${t.id}" class="dropdown-content">${t.subItems.map((s, idx) => `<div class="sub-item"><span>${s.name}</span><button class="check-btn ${s.done?'is-done':''}" onclick="appState.check('${t.id}', ${idx})">${s.done?'✓':''}</button></div>`).join('')}</div>`;
                    else ctrl = `<button class="toggle-btn" onclick="appState.tog('${t.id}')">Mark Harvested</button>`;
                }
                card.innerHTML = `<div style="display:flex; gap:10px; align-items:center;"><img src="${this.getIcon(t)}" class="trophy-icon-img"><div><span class="trophy-rank rank-${t.rank}">${t.rank}</span><div style="font-weight:900; font-size:0.9rem; margin-top:4px;">${t.name}</div></div></div><p style="font-size:0.75rem; font-style:italic; margin:15px 0; color:#cbd5e1; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${t.desc}</p>${ctrl}`;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });
        
        const overall = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
        document.getElementById('overall-bar').style.width = overall + '%';
        document.getElementById('percent-text').innerText = `Master Platinum Progress ${overall}%`;
    },

    getIcon: (t) => t.psnImage ? t.psnImage : (t.name.includes('Arc') || t.name.includes('Master') || t.name.includes('Missions') ? ICONS.ARC : t.name.includes('Mile') ? ICONS.TRAVEL : t.name.includes('Marksman') ? ICONS.MARK : ICONS.GAME),
    
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
            document.getElementById('stat-line').innerText = `RANK SYNC ERROR: Check console (Rules/Auth)`;
        }
    },
    
    updateRankUI: function() { Object.keys(this.animalRankData).forEach(k => { const el = document.getElementById(`rank-val-${k}`); if (el) el.innerText = this.animalRankData[k]; }); },
    toggleSection: function(id) { const cur = this.collapsedSections[id] !== false; this.collapsedSections[id] = !cur; this.render(); },
    toggleDrop: (id) => document.getElementById(`drop-${id}`).classList.toggle('show'),
    switchHunter: function(name) { this.loadHunter(name); },
    scrollToCategory: function(id) { if(!id) return; this.collapsedSections[id] = false; this.render(); setTimeout(() => document.getElementById(id).scrollIntoView({ behavior: 'smooth' }), 100); },
    
    sync: async function() { 
        this.render(); 
        // SAFETY LOCK: Block saves if data hasn't finished loading from Firebase yet
        if (!this.db || !this.auth.currentUser || !this.dataLoaded) {
            console.warn("Tracker Save Blocked: Waiting for data load or authentication.");
            return;
        } 
        try {
            const ref = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', this.activeHunter); 
            await setDoc(ref, { trophies: this.hunterData, lastUpdate: Date.now() }, { merge: true }); 
            console.log("Tracker successfully synced to Firebase.");
        } catch (error) {
            console.error("FIREBASE TRACKER SAVE ERROR:", error);
            document.getElementById('stat-line').innerText = `TRACKER SYNC ERROR: Check console (Rules/Auth)`;
        }
    }
};

window.appState = appState; 
appState.init();
