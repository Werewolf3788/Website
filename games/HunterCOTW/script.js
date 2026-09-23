/* ============================================================================
   File: script.js
   Location: /script.js
   Description: theHunter: Call of the Wild Responsive RTDB + Firestore Engine
   Database: Cloud Firestore & Realtime Database (entertainment-71888)
   Firestore Target: /users/{userId}/platform/{platform}/progress/COTW
   RTDB Trophy Source: /psn/gamertags/{Gamertag}/liveTrophyProgress/NPWR13211_00
   RTDB Navigation Source: /utm_links
   Analytics Tag: G-CTYHDF4MSD
   Date & Time Stamp: 2026-09-23 12:18:00 EDT (America/New_York)
   ============================================================================ */

import { initializeApp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from '//www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from '//www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue, off } from '//www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

/* ----------------------------------------------------
 * SECTION 1: Firebase Configuration & User Map
 * Lines 18-47: Environment credentials and normalized gamer handles
 * ---------------------------------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c"
};

const GAME_ID = 'COTW';
const NPWR_ID = 'NPWR13211_00';

// Live PSN Gamertag mapping for Firebase RTDB trophy syncing
// Strictly normalized gaming handles; personal names removed
const USER_PSN_MAP = {
    'Werewolf3788': 'WildHorse_Spirit',
    'OneLIVIDMAN': 'OneLIVIDMAN',
    'Terrdog': 'Darkwing69420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const ICONS = {
    GAME: "//placehold.co/44x44/1e293b/ff8800?text=GAME",
    ARC: "//placehold.co/44x44/1e293b/a855f7?text=ARC",
    PHOTO: "//placehold.co/44x44/1e293b/ef4444?text=PIC",
    TRAVEL: "//placehold.co/44x44/1e293b/3b82f6?text=MOVE",
    MARK: "//placehold.co/44x44/1e293b/22c55e?text=AIM",
    TRACK: "//placehold.co/44x44/1e293b/facc15?text=TRK"
};

/* ----------------------------------------------------
 * SECTION 2: Master Helpers
 * Lines 49-74: Checklist generator & alphabetic indexing
 * ---------------------------------------------------- */
const checkSet = (items) => items.map(name => ({ name, done: false }));

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

/* ----------------------------------------------------
 * SECTION 3: Raw Static Master Data Baseline
 * Lines 76-200: Base Game, Reserves, and Story Missions
 * ---------------------------------------------------- */
const trophyData = [
    // --- BASE GAME TROPHIES ---
    { id: 'plat_cotw', cat: 'Base Game', name: 'theHunter', rank: 'platinum', current: 0, goal: 1, type: 'toggle', plat: false, desc: 'Collect every trophy.' },
    { id: 'head_shoulder_knees_toes', cat: 'Base Game', name: 'Head, Shoulders, Knees, And Toes', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: "Down an animal from each stance." },
    { id: 'the_mile', cat: 'Base Game', name: 'The Mile', rank: 'bronze', current: 0, goal: 1, type: 'numeric', plat: true, desc: 'Travel 1 mile on foot.' },
    { id: 'scand_mile', cat: 'Base Game', name: 'The Scandinavian Mile', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, desc: 'Travel 6.2 miles on foot.' },
    { id: 'marathon', cat: 'Base Game', name: 'The Marathon', rank: 'silver', current: 0, goal: 26.2, type: 'numeric', plat: true, desc: 'Travel 26.2 miles on foot.' },
    { id: 'ultra', cat: 'Base Game', name: 'The Ultramarathon', rank: 'gold', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Travel 100 miles on foot.' },
    { id: 'jager', cat: 'Base Game', name: 'Jäger Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Gerlinde Jäger's arc.", subItems: checkSet(["A Picture for Her Book", "Saving Sommer's Cornfields", "The Deer and the Sea", "The Lost Son", "Wrapping up the Book"]) },
    { id: 'sommer', cat: 'Base Game', name: 'Sommer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Robert Sommer's arc.", subItems: checkSet(["Mr. Sommer's Bow", "Smell Like a Deer", "Controlling the Land", "The Fox and the Scope", "Sommerfest"]) },
    { id: 'bhandari', cat: 'Base Game', name: 'Bhandari Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Vinay Bhandari's arc.", subItems: checkSet(["Investigating the Bison", "Stop the Disease", "Population Control", "Clashing With the Deer", "A Last Push"]) },
    { id: 'fleischer', cat: 'Base Game', name: 'Fleischer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Albertina Fleischer's arc.", subItems: checkSet(["A Trophy to Remember", "Red Deer Canyon", "Stuffin' Them All!", "Don't Ruin the Goods", "Returning the Favor"]) },
    { id: 'tressler', cat: 'Base Game', name: 'Tressler Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Marwin Tressler's arc.", subItems: checkSet(["Wild Boars Raving", "A Ton of Meat", "Hunting for Gold", "Boar Beast Boss", "The Radioactive Boars"]) },
    { id: 'hope', cat: 'Base Game', name: 'Hope Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Richard Hope's arc.", subItems: checkSet(["A Visitor", "Investigating Bears", "A Second Visit", "Unwelcome Guests", "Sick Papa Bear"]) },
    { id: 'trampfine', cat: 'Base Game', name: 'Trampfine Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Jonathan Trampfine's arc.", subItems: checkSet(["A Family Picture", "For a Few Samples of Poo", "A Picture of Mr. Black", "The Return of Bear Man", "Trampfine Is Lost"]) },
    { id: 'vualez', cat: 'Base Game', name: 'Vualez Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Fiona Vualez's arc.", subItems: checkSet(["Wildlife Control", "The Big Coyote Tour", "Late Nights with the Dogs", "The Silent Hunt", "The Werecoyote"]) },
    { id: 'connors', cat: 'Base Game', name: 'Connors Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Emily Connors's arc.", subItems: checkSet(["Lost Writings", "Capturing the Landscape", "Emily Heart Elk", "Putting Out the Fire", "End of Season"]) },
    { id: 'beatty', cat: 'Base Game', name: 'Beatty Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Paul Beatty's arc.", subItems: checkSet(["Waiting It Out", "To the Rescue", "Hunting Moose", "The Circle Route (Big 5: Moose, Elk, Coyote, Bear, Blacktail)", "Playing the Guide"]) },
    { id: 'hir_master', cat: 'Base Game', name: 'Hirschfelden Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Central Europe missions.' },
    { id: 'lay_master', cat: 'Base Game', name: 'Layton Lake District Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Pacific Northwest missions.' },
    { id: 'novice_m', cat: 'Base Game', name: 'Novice Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 50m+.' },
    { id: 'skilled_m', cat: 'Base Game', name: 'Skilled Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 100m+.' },
    { id: 'expert_m', cat: 'Base Game', name: 'Expert Marksman', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 200m+.' },
    { id: 'legend_m', cat: 'Base Game', name: 'Legendary Marksman', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal from 400m+.' },
    { id: 'moby_deer', cat: 'Base Game', name: 'Moby Deer', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest albino deer.' },
    { id: 'hero_h', cat: 'Base Game', name: 'Hero Of Hirschfelden', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest in every subregion.' },
    { id: 'lord_l', cat: 'Base Game', name: 'Lord Of The Lakes', rank: 'gold', current: 0, goal: 9, type: 'checklist', plat: true, desc: 'Harvest in every Layton subregion.', subItems: checkSet(["Balmont", "Calburn", "Cheelah", "Chopeeka", "High Lake", "Mount Kraken", "Mount Leviathan", "Norden", "Roonachee", "Willipeg"]) },
    { id: 'stay_target', cat: 'Base Game', name: 'Stay On Target', rank: 'bronze', current: 0, goal: 50, type: 'numeric', plat: true, desc: '50 tracks same animal.' },
    { id: 'persistence', cat: 'Base Game', name: 'Persistence Is Futile', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: '100 tracks same animal.' },
    { id: 'stalker', cat: 'Base Game', name: 'Stalker', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Spot 100 animals.' },
    { id: 'leave_no', cat: 'Base Game', name: 'Leave No Animal Behind', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest wounded animal.' },
    { id: 'scarecrow', cat: 'Base Game', name: 'Scarecrow', rank: 'bronze', current: 0, goal: 1000, type: 'numeric', plat: true, desc: 'Scare 1000 animals.' },
    { id: 'not_zombie', cat: 'Base Game', name: 'This Is Not A Zombie Game', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: true, desc: '10 brain hit kills.' },
    { id: 'diamonds_ever', cat: 'Base Game', name: 'Diamonds Are Forever', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a diamond rating.' },
    { id: 'goldmember', cat: 'Base Game', name: 'Goldmember', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a gold rating.' },
    { id: 'seeing_believing', cat: 'Base Game', name: 'Seeing Is Believing', rank: 'bronze', current: 0, goal: 10, type: 'numeric', plat: true, desc: 'Spot 10 animals.' },
    { id: 'jack_trades', cat: 'Base Game', name: 'Jack Of All Trades', rank: 'gold', current: 0, goal: 4, type: 'numeric', plat: true, desc: 'Harvest with 4 weapon types.' },
    { id: 'blind_shot', cat: 'Base Game', name: 'Blind Shot', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit animal barely visible.' },
    { id: 'calls_wild_play', cat: 'Base Game', name: 'Call Of The Wild', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Use all animal callers.' },
    { id: 'insomniac_hunt', cat: 'Base Game', name: 'Insomniac', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest at night.' },
    { id: 'globetrotter_hunt', cat: 'Base Game', name: 'Globetrotter', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Visit all regions in Hirschfelden and Layton.' },
    { id: 'up_close_personal', cat: 'Base Game', name: 'Up Close And Personal', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Within 15m.' },
    { id: 'paparazzi_hunt', cat: 'Base Game', name: 'Wildlife Paparazzi', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Photo unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'potty_humor_hunt', cat: 'Base Game', name: 'Potty Humor', rank: 'bronze', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Examine 100 droppings.' },
    { id: 'make_it_count_hunt', cat: 'Base Game', name: 'Make It Count', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Last round in mag.' },
    { id: 'silver_lining_hunt', cat: 'Base Game', name: 'Silver Lining', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Silver rating.' },
    { id: 'something_hunt', cat: 'Base Game', name: "It's Something", rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Bronze rating.' },
    { id: 'bucket_list_hunt', cat: 'Base Game', name: 'Bucket List', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Spot unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'eavesdropping_hunt', cat: 'Base Game', name: 'Eavesdropping', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Identify calls.' },
    { id: 'nerves_of_steel_hunt', cat: 'Base Game', name: 'Nerves Of Steel', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Elevated heart rate.' },
    { id: 'old_fashioned_way_hunt', cat: 'Base Game', name: 'The Old Fashioned Way', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Unscoped rifle.' },

    // --- LAYTON LAKE MISSIONS & SIDE QUESTS ---
    { id: 'layton_side_doc', cat: 'Layton Lake Missions', name: 'Colton "Doc" Locke Side Registry (30 Missions)', rank: 'gold', current: 0, goal: 30, type: 'numeric', desc: 'Complete Doc #1 through Doc #30.' },
    { id: 'layton_side_conners', cat: 'Layton Lake Missions', name: 'Emily Conners Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Conners #1 through Conners #10.' },
    { id: 'layton_side_vualez', cat: 'Layton Lake Missions', name: 'Fiona Vualez Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Vualez #1 through Vualez #10.' },
    { id: 'layton_side_beatty', cat: 'Layton Lake Missions', name: 'Paul Beatty Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Beatty #1 through Beatty #10.' },
    { id: 'layton_side_hope', cat: 'Layton Lake Missions', name: 'Richard Hope Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Hope #1 through Hope #10.' },

    // --- HIRSCHFELDEN MISSIONS & SIDE QUESTS ---
    { id: 'hirsch_side_jager', cat: 'Hirschfelden Missions', name: 'Gerlinde Jäger Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Jäger #1 through Jäger #10.' },
    { id: 'hirsch_side_tressler', cat: 'Hirschfelden Missions', name: 'Marwin Tressler Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Tressler #1 through Tressler #10.' },
    { id: 'hirsch_side_bhandari', cat: 'Hirschfelden Missions', name: 'Vinay Bhandari Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Bhandari #1 through Bhandari #10.' },
    { id: 'hirsch_side_sommer', cat: 'Hirschfelden Missions', name: 'Robert Sommer Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Sommer #1 through Sommer #10.' },
    { id: 'hirsch_side_fleischer', cat: 'Hirschfelden Missions', name: 'Albertina Fleischer Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', desc: 'Complete Fleischer #1 through Fleischer #10.' },
    { id: 'hirsch_side_conni', cat: 'Hirschfelden Missions', name: 'Cornelia Holzer Side Registry (20 Missions)', rank: 'gold', current: 0, goal: 20, type: 'numeric', desc: 'Complete Conni #1 through Conni #20.' },

    // --- MEDVED TAIGA ---
    { id: 'med_anatoly', cat: 'DLC: Medved-Taiga', name: 'Dr. Anatoly Barnyashev Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: 'Main arc.', subItems: checkSet(["The Best Defense", "Out of the Way", "The Lost One", "A Grave Concern", "A New Home"]) },
    { id: 'med_columbus', cat: 'DLC: Medved-Taiga', name: 'Dr. Columbus Neidell Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: 'Main arc.', subItems: checkSet(["The New World", "A Helping Hand", "Into the Unknown", "The High Ground", "The Heart of the Taiga"]) },
    { id: 'med_pushkin', cat: 'DLC: Medved-Taiga', name: 'Dimitri "Dimi" Pushkin Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', plat: true, desc: 'Side arc.', subItems: checkSet(["The Frozen Eye", "The Dead of Night", "In the Shadows", "The Light of Day"]) },
    { id: 'med_georgy', cat: 'DLC: Medved-Taiga', name: 'Georgy Grankin Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', plat: true, desc: 'Side arc.', subItems: checkSet(["A Ghost from the Past", "The Old Guard", "The Last Stand", "A Quiet Night"]) },
    { id: 'med_katerina', cat: 'DLC: Medved-Taiga', name: 'Katerina Khasavovna Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', plat: true, desc: 'Side arc.', subItems: checkSet(["The Hunter's Path", "The Spirit of the Taiga", "The Great Bear", "The Final Test"]) },
    { id: 'med_svetlana', cat: 'DLC: Medved-Taiga', name: 'Dr. Svetlana Isakova Arc', rank: 'gold', current: 0, goal: 4, type: 'checklist', plat: true, desc: 'Side arc.', subItems: checkSet(["The Heart of the Lake", "The Silent Sentinel", "The Frozen River", "The Eternal Winter"]) },
    { id: 'med_park_arc', cat: 'DLC: Medved-Taiga', name: 'Medved-Taiga National Park Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Medved-Taiga National Park missions.' },
    { id: 'med_apex', cat: 'DLC: Medved-Taiga', name: 'The Apex Hunter', rank: 'gold', current: 0, goal: 8, type: 'checklist', plat: true, desc: "Complete Dr. Alena Khasavovna's mission arc.", subItems: checkSet(["Western Capercaillie", "Siberian Musk Deer", "Eurasian Lynx", "Wild Boar", "Gray Wolf", "Mountain Reindeer", "Eurasian Brown Bear", "Moose"]) },
    { id: 'med_sheds', cat: 'DLC: Medved-Taiga', name: 'Shed Hunter', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Collect all antler sheds.' },
    { id: 'med_paleo', cat: 'DLC: Medved-Taiga', name: 'Paleontology 101', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Find all artifacts.' },
    { id: 'med_critic', cat: 'DLC: Medved-Taiga', name: 'Art Critic', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Find all cave paintings.' },
    { id: 'med_pilgrim', cat: 'DLC: Medved-Taiga', name: 'Pilgrim', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Find all Nenet monuments.' },

    // --- VURHONGA SAVANNA ---
    { id: 'vur_arc', cat: 'DLC: Vurhonga Savanna', name: 'Vurhonga Savanna Arc', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all the Vurhonga Savanna Mission arcs.' },
    { id: 'vur_warden', cat: 'DLC: Vurhonga Savanna', name: 'Warden Missions Arc', rank: 'bronze', current: 0, goal: 16, type: 'checklist', plat: true, desc: 'Main warden storyline.', subItems: checkSet(["Welcome to Vurhonga", "Mind the Traps", "Across the Savanna", "Praise the Ancestors", "The History of All Tribes", "Mucking for Science", "Mampara", "The Last Rhino", "Traffic Jam", "Observe and Report", "Take Shelter", "Our Place at the Potholes", "Hunter and Hunted", "Crossing Over", "Cave of the Ghost Jackal", "The Ghost Tree"]) },
    { id: 'vur_mboweni', cat: 'DLC: Vurhonga Savanna', name: 'Mboweni Arc', rank: 'bronze', current: 0, goal: 7, type: 'checklist', plat: true, desc: "Maria Mboweni.", subItems: checkSet(["Legal Sources", "Trap Raid", "Ceremonial Warthog", "Canine Disease", "The Old Way", "Proof of Poachers", "Ceremonial Buffalo"]) },
    { id: 'vur_ospreay', cat: 'DLC: Vurhonga Savanna', name: 'Ospreay Arc', rank: 'bronze', current: 0, goal: 9, type: 'checklist', plat: true, desc: "Flip Ospreay.", subItems: checkSet(["Photo Sample", "Need Zones", "Lake View", "Variety Pack", "Museum Mpfundla", "Scene of the Tragedy", "Technical Demonstration", "Flip's Naked Eye Challenge", "Flip's Danger Action Gauntlet"]) },
    { id: 'vur_maritz', cat: 'DLC: Vurhonga Savanna', name: 'Maritz Arc', rank: 'bronze', current: 0, goal: 9, type: 'checklist', plat: true, desc: "Dr. Dana Maritz.", subItems: checkSet(["Begin the Maritz Test", "Brightest Day, Blackest Night", "Hog Collection", "Bogged Down", "The Maritz Standard", "King of Rifles", "Howl Like a Bunny", "Master of Widowmakers", "The Maritz Final Exam"]) },
    { id: 'vur_brother', cat: 'DLC: Vurhonga Savanna', name: 'Brother Arc', rank: 'bronze', current: 0, goal: 7, type: 'checklist', plat: true, desc: "Side arc.", subItems: checkSet(["Fecal Matters", "Show Off", "Muckraker", "Drinking Buddies", "Nocturnal Predator", "Blind Master", "Heart to Heart to Heart"]) },
    { id: 'vur_senior', cat: 'DLC: Vurhonga Savanna', name: 'An Experienced Senior Warden', rank: 'rare', current: 0, goal: 10, type: 'checklist', plat: true, desc: 'Harvest every Savanna species.', subItems: checkSet(["Blue Wildebeest", "Cape Buffalo", "Gemsbok", "Lesser Kudu", "Lion", "Side-Striped Jackal", "Springbok", "Scrub Hare", "Warthog", "Eurasian Wigeon"]) },
    { id: 'vur_njabulo', cat: 'DLC: Vurhonga Savanna', name: "Njabulo's Sorrow", rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Find Rambolo, the last rhino of Vurhonga Savanna.' },
    { id: 'vur_kudu', cat: 'DLC: Vurhonga Savanna', name: 'Camouflage', rank: 'bronze', current: 0, goal: 50, type: 'numeric', plat: true, desc: 'Spot 50 lesser kudu.' },
    { id: 'vur_widow', cat: 'DLC: Vurhonga Savanna', name: 'A Match for the Widowmaker', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Cape buffalo with .470.' },
    { id: 'vur_spring', cat: 'DLC: Vurhonga Savanna', name: 'Springbok City', rank: 'bronze', current: 0, goal: 25, type: 'numeric', plat: true, desc: 'Harvest 25 springbok.' },
    { id: 'vur_lion', cat: 'DLC: Vurhonga Savanna', name: 'The Lion of Vurhonga', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest in every subregion.' },

    // --- PARQUE FERNANDO ---
    { id: 'par_ave_maria', cat: 'DLC: Parque Fernando', name: 'Ave María, it works!', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Restore power to the lodge.' },
    { id: 'par_milanesa', cat: 'DLC: Parque Fernando', name: 'The Truth is in the Milanesa', rank: 'gold', current: 0, goal: 18, type: 'checklist', plat: true, desc: "Carolina Vargas story arc.", subItems: checkSet(["Welcome to Patagonia", "Building Blocks", "Be Our Guests", "Duck Decoys", "Salvage Operation", "Flip the Switch", "Testing the Wind", "Testing the Wind II", "Sol de Mayo", "The Last Hangup", "The Last Hangup II", "Best-in-Class", "3 Star Review", "Shot for Shot", "Animal Whisperer", "Special Delivery", "The Gold Mine", "Cornered"]) },
    { id: 'par_mark', cat: 'DLC: Parque Fernando', name: 'Hitting the Mark', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete one Challenge Target." },
    { id: 'par_targets_full', cat: 'DLC: Parque Fernando', name: "Carolina's Greatest Hits, Shot-For-Shot", rank: 'gold', current: 0, goal: 15, type: 'numeric', plat: true, desc: "Complete all Challenge Targets." },
    { id: 'par_lodge_diamond', cat: 'DLC: Parque Fernando', name: 'A Sample of Parque Fernando\'s Finest', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Diamond from each species.', subItems: checkSet(["Cinnamon Teal", "Blackbuck", "Axis Deer", "Puma", "Mule Deer", "Red Deer", "Water Buffalo"]) },
    { id: 'par_world_class', cat: 'DLC: Parque Fernando', name: 'A World Class Hunting Reserve', rank: 'gold', current: 0, goal: 7, type: 'numeric', plat: true, desc: 'Harvest seven unique species.' },
    { id: 'par_vicente', cat: 'DLC: Parque Fernando', name: 'Vicente Vargas Arc', rank: 'gold', current: 0, goal: 6, type: 'checklist', plat: true, desc: "Vicente Vargas.", subItems: checkSet(["Seal of Approval", "Sharpshooter Certification", "Scouting Certification", "Duck Soup", "Marksmanship and Finesse", "Dinner for Two"]) },
    { id: 'par_chinita', cat: 'DLC: Parque Fernando', name: 'Chinita Arc', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: "Beatriz Cabrera.", subItems: checkSet(["Gunslinger", "Mule Deer Roundup", "Night Tracker", "Random Sampling", "Buffalo Chaser", "A Flower for Vicente", "Puma Control"]) },
    { id: 'par_matmat', cat: 'DLC: Parque Fernando', name: 'Matmat Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Matias Mateo.", subItems: checkSet(["A Study in Blackbuck", "The Perfect Pelt", "Our Gift to Carolina", "Gold Medal Bird", "A Saddle for Beatriz"]) },
    { id: 'par_luna', cat: 'DLC: Parque Fernando', name: 'Dr. Mariana Luna Arc', rank: 'gold', current: 0, goal: 3, type: 'checklist', plat: true, desc: "Dr. Mariana Luna.", subItems: checkSet(["Poisoned Fruit", "Junto al Lago Spotting", "Resting Behavior"]) },
    { id: 'par_juliana', cat: 'DLC: Parque Fernando', name: 'Juliana Ferrari Arc', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, desc: "Juliana Ferrari.", subItems: checkSet(["Lodge Showcase", "Cultural Attractions", "Everybody Loves Ducks!", "The Office Trophy", "Where the Pumas Lie", "Yearbook Photos", "Word-of-Mouth"]) },

    // --- YUKON VALLEY ---
    { id: 'yuk_sandy_arc', cat: 'DLC: Yukon Valley', name: 'Sandy Murray Arc', rank: 'silver', current: 0, goal: 7, type: 'checklist', plat: true, desc: 'Side missions.', subItems: checkSet(["A Book By Its Cover", "A Study In Crimson", "From The Ashes", "Track Record", "Old Story, New Problems", "Mucking In", "Keep It Clean"]) },
    { id: 'yuk_oscar_arc', cat: 'DLC: Yukon Valley', name: 'Oscar Freeman Arc', rank: 'silver', current: 0, goal: 8, type: 'checklist', plat: true, desc: 'Side missions.', subItems: checkSet(["A Fine Specimen", "Managing Moose", "Moose Misfortune", "Hardware Upgrade", "The Balancing of Bison", "Herd Immunity", "At a Crossroads", "Predator Becomes the Prey"]) },
    { id: 'yuk_kayla_arc', cat: 'DLC: Yukon Valley', name: 'Kayla Johnson Arc', rank: 'gold', current: 0, goal: 8, type: 'checklist', plat: true, desc: 'Side missions.', subItems: checkSet(["Show Me Whatchoo Got", "Bearly Broke A Sweat", "Exact. Efficient. Effective.", "Old Skool", "Bears vs Bow", "Step Up Your Game", "The Apex Predator Challenge", "Becoming the Alpha"]) },
    { id: 'yuk_hank_arc', cat: 'DLC: Yukon Valley', name: 'Hank Pepper Arc', rank: 'silver', current: 0, goal: 6, type: 'checklist', plat: true, desc: 'Side missions.', subItems: checkSet(["The Perfect Shot", "Demand For Ducks", "Band of Bison", "A Pair of Perfect Pelts", "A Rare Sight", "Yukon Gold Rush"]) },
    { id: 'yuk_bev_arc', cat: 'DLC: Yukon Valley', name: 'Bev Parker Arc', rank: 'silver', current: 0, goal: 6, type: 'checklist', plat: true, desc: 'Side missions.', subItems: checkSet(["Attack is the Best Defense", "Caribou Conditions", "A Distinctive Look", "He's a Growing Boy", "Due Diligence", "Yukon Valley's Best View"]) },
    { id: 'yuk_fire_witness', cat: 'DLC: Yukon Valley', name: 'A spark, a blaze, ashes', rank: 'rare', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Witness the forest fire.' },
    { id: 'yuk_sourdough', cat: 'DLC: Yukon Valley', name: 'A Step Closer to Sourdough', rank: 'rare', current: 0, goal: 10, type: 'checklist', plat: true, desc: 'Complete main mission arc.', subItems: checkSet(["Welcome to Alaska", "Quarantine", "The Cost of Control", "Picking Up, Dropping Off", "Raise the Barrier", "A Place to Hang Your Hat", "Flash Point", "Tech Support", "A Mine of information", "Gabriella Baden: Bigfoot Hunter"]) },
    { id: 'yuk_master', cat: 'DLC: Yukon Valley', name: 'Yukon Valley Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all mission arcs.' },
    { id: 'yuk_grizzly', cat: 'DLC: Yukon Valley', name: 'Grizzled Veteran', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest your first grizzly bear.' },
    { id: 'yuk_ghost', cat: 'DLC: Yukon Valley', name: 'Ghost', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest an albino gray wolf.' },

    // --- CUATRO COLINAS ---
    { id: 'cua_red_carpet', cat: 'DLC: Cuatro Colinas', name: 'A Reddish Carpet', rank: 'rare', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete the mission 'Red Carpet'." },
    { id: 'cua_faith', cat: 'DLC: Cuatro Colinas', name: 'Faith', rank: 'gold', current: 0, goal: 9, type: 'checklist', plat: true, desc: "Complete Padre Abbas' mission arc.", subItems: checkSet(["Find Yourself in Nature", "Capture the Moment", "Our Night Companion", "Family Matters", "Iberia's Crowning Glory", "A Painter's Eye", "The Bigger Picture", "A View Fit For a Saint", "In the Pilgrim's Footsteps"]) },
    { id: 'cua_shady', cat: 'DLC: Cuatro Colinas', name: 'Shady Dealings', rank: 'gold', current: 0, goal: 3, type: 'checklist', plat: true, desc: 'Harvest Fantasma, Ogro, and Sombra.', subItems: checkSet(["Fantasma", "Ogro", "Sombra"]) },
    { id: 'cua_justice', cat: 'DLC: Cuatro Colinas', name: 'Justice is served', rank: 'rare', current: 0, goal: 14, type: 'checklist', plat: true, desc: 'Complete main mission arc.', subItems: checkSet(["Bienvenidos a Cuatro Colinas", "My Favourite Place", "Local Flavour", "Cuidado", "The Devil's Handiwork", "Doña Garcia", "Rabid Curiosity", "Field Work", "Bait & Switch", "Dearly Beloved", "The Red Carpet", "Water Worries", "The Secret in the Woods", "Divine Reckoning"]) },
    { id: 'cua_master', cat: 'DLC: Cuatro Colinas', name: 'Cuatro Colinas Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all mission arcs.' },
    { id: 'cua_slam', cat: 'DLC: Cuatro Colinas', name: 'The Slam of Glory', rank: 'gold', current: 0, goal: 4, type: 'checklist', plat: true, desc: 'Harvest 1 diamond male ibex of every species.', subItems: checkSet(["Gredos Ibex", "Beceite Ibex", "Southeastern Ibex", "Ronda Ibex"]) },
    { id: 'cua_hubris', cat: 'DLC: Cuatro Colinas', name: 'Hubris', rank: 'gold', current: 0, goal: 9, type: 'checklist', plat: true, desc: "Gerhardt Baden arc.", subItems: checkSet(["G.O.A.T", "Starting to Boar Me", "Feeling Sheepish?", "Hundred-Meter Hurdles", "A Bit of a Long Shot", "Take a Shot in the Dark", "Up & At Them", "The Golden Touch", "Baden's Folly"]) },
    { id: 'cua_tradition', cat: 'DLC: Cuatro Colinas', name: 'Tradition', rank: 'gold', current: 0, goal: 8, type: 'checklist', plat: true, desc: "Antonia Acosta Gonzalez arc.", subItems: checkSet(["Fresh Ingredients", "Professionally Pierced Pork", "Roe to Go", "A Wounded Hart", "Meat by Moonlight", "Peerless Pork = Champion Chorizo", "Diversity Breeds Innovation", "The Perfect Liebre"]) },
    { id: 'cua_commit', cat: 'DLC: Cuatro Colinas', name: 'Commitment', rank: 'gold', current: 0, goal: 9, type: 'checklist', plat: true, desc: "Sole Santiago Serrano arc.", subItems: checkSet(["Save Some For Me", "Packed Off", "Things Are Getting Harey", "Found Further Afield", "Pre-emptive Strike", "Butt Out, Buddy", "Thinning the Pack", "Can't Show Up Empty-Handed", "Lake Woe; Be Gone"]) },
    { id: 'cua_rebirth', cat: 'DLC: Cuatro Colinas', name: 'Rebirth', rank: 'gold', current: 0, goal: 10, type: 'checklist', plat: true, desc: "Don Miguel Del Bosque arc.", subItems: checkSet(["In Memoriam", "A Hunter's Reward", "A Crowning Achievement", "Spicing It Up", "Absolution", "The 'Marksman' Challenge", "The 'Stalker' Challenge", "The 'True' Grand Slam", "The Jewel in the Crown", "Just Like Old Times"]) },
    { id: 'cua_opport', cat: 'DLC: Cuatro Colinas', name: 'Opportunism', rank: 'gold', current: 0, goal: 8, type: 'checklist', plat: true, desc: "Jose Ruiz Hernandez arc.", subItems: checkSet(["Blow the House Down", "Keep the Wolves From the Door", "Not Ready to Rock", "A Little Gamey", "The Farmer's Friend", "The After-Party", "Award For Best Supporting Hunter", "Press the Flesh"]) },

    // --- SILVER RIDGE PEAKS ---
    { id: 'srp_turkeys', cat: 'DLC: Silver Ridge', name: 'Gobble gobble', rank: 'silver', current: 0, goal: 50, type: 'numeric', plat: true, desc: 'Harvest 50 turkeys.' },
    { id: 'srp_badname', cat: 'DLC: Silver Ridge', name: 'You give love a bad name', rank: 'gold', current: 0, goal: 10, type: 'numeric', plat: true, desc: 'Down 10 animals in the heart with Alexander Longbow.' },
    { id: 'srp_thanks', cat: 'DLC: Silver Ridge', name: 'Thanksgiving!', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest a diamond turkey.' },
    { id: 'srp_ruled', cat: 'DLC: Silver Ridge', name: 'When they ruled the earth', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Take a picture of the dinosaur footprints.' },
    { id: 'srp_heavy', cat: 'DLC: Silver Ridge', name: 'Heavy Weight', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Plains bison single shot Alexander Longbow.' },
    { id: 'srp_reaction', cat: 'DLC: Silver Ridge', name: 'Better put this back up', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete 'A Dangerous Reaction'." },
    { id: 'srp_bearme', cat: 'DLC: Silver Ridge', name: 'Bear with Me', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete 'Bear with Me'." },
    { id: 'srp_sabotage', cat: 'DLC: Silver Ridge', name: 'Sabotage', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete 'Old Haunts'." },
    { id: 'srp_bearher', cat: 'DLC: Silver Ridge', name: 'Bear... with Her!', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete 'Inner Peace, Outer Chaos'." },
    { id: 'srp_ascent', cat: 'DLC: Silver Ridge', name: 'Ascended', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: "Complete 'The Ascent'." },
    { id: 'srp_story_all', cat: 'DLC: Silver Ridge', name: 'Silver Ridge Peaks Full Story (15 Missions)', rank: 'gold', current: 0, goal: 15, type: 'checklist', desc: 'All Allan Bradley missions.', subItems: checkSet(["A Rockies Start", "The Poisoned Chalice", "Up High, Down Low", "A Dangerous Reaction", "An Ill-Advised Retreat", "Bear With Me", "Out of Her Comfort Zone", "Plans are Derailed", "Old Haunts", "Sawbones", "Lock It Down", "Inner Peace, Outer Chaos", "Setting Up", "Whodunnit?", "The Ascent"]) },

    // --- TE AWAROA NATIONAL PARK ---
    { id: 'tea_story_all', cat: 'DLC: Te Awaroa', name: 'Te Awaroa Story Arc (16 Missions)', rank: 'gold', current: 0, goal: 16, type: 'checklist', desc: 'Complete Kiri Taylor narrative.', subItems: checkSet(["Haere Mai!", "Propped Up", "Picture (Im)Perfect", "Mess On The Beach", "Up Close And Personal", "Elusive Prey", "A River Runs Through It", "A Trap In Time", "Toxicology Report", "The Battle Of Stonecastle Valley", "Left Behind", "The Hunt is On", "A Favor for a Friend", "Cry for Attention", "Last of its Kind", "To the Lighthouse"]) },

    // --- RANCHO DEL ARROYO ---
    { id: 'ran_story_all', cat: 'DLC: Rancho del Arroyo', name: 'Rancho del Arroyo Story Arc (12 Missions)', rank: 'gold', current: 0, goal: 12, type: 'checklist', desc: 'Complete Salvador Soto Muñoz narrative.', subItems: checkSet(["Bienvenidos a Mexico", "Fencing Champion", "Clear and Pheasant Danger", "Grounded", "A Safe Place", "Blast From the Past", "Abandoned Memories", "Target Practice", "Raúl the Revolutionary", "A Place to Rest", "Y Tambien tu Hermano", "Home on the Ranch"]) },

    // --- MISSISSIPPI ACRES PRESERVE ---
    { id: 'mis_story_all', cat: 'DLC: Mississippi Acres', name: 'Mississippi Acres Story Arc (12 Missions)', rank: 'gold', current: 0, goal: 12, type: 'checklist', desc: 'Complete Immi Davis narrative.', subItems: checkSet(["Hell or High Water", "Unwelcome Guests", "Southern Inhospitality", "Something Wicked This way Comes", "Gator Aid", "Lizard Brain", "Out of Reach", "B-side the Point", "Short Circuited", "Breaking and Entering", "Mississippi Goddamm", "Factory Farming"]) },

    // --- REVONTULI COAST ---
    { id: 'rev_story_all', cat: 'DLC: Revontuli Coast', name: 'Revontuli Guided Tour (8 Missions)', rank: 'gold', current: 0, goal: 8, type: 'checklist', desc: 'Complete Oiva Reijo Ikävalko guided tour.', subItems: checkSet(["Welcome to Suomi", "Guided Tour Starts", "Mosquito Madness", "Guided Tour Continues 1", "360 Degrees of Sauna", "Guided Tour Continues 2", "Steady Aim", "Guided Tour Ends"]) },
    { id: 'rev_side_19', cat: 'DLC: Revontuli Coast', name: 'Sekalaiset yhdeksäntoista (Miscellaneous 19)', rank: 'gold', current: 0, goal: 19, type: 'checklist', desc: 'Harvest 19 species Gold or better.', subItems: checkSet(["Bean Goose", "Canada Goose", "Eurasian Wigeon", "Eurasian Teal", "Moose", "Rock Ptarmigan", "Brown Bear", "Whitetail Deer", "Lynx", "Raccoon Dog", "Mountain Hare", "Willow Ptarmigan", "Tufted Duck", "Mallard", "Hazel Grouse", "Greylag Goose", "Goldeneye", "Black Grouse", "Western Capercaillie"]) },
    { id: 'rev_side_observer', cat: 'DLC: Revontuli Coast', name: 'The Observer', rank: 'silver', current: 0, goal: 19, type: 'checklist', desc: 'Photograph all 19 species.', subItems: checkSet(["Bean Goose", "Moose", "Brown Bear", "Whitetail Deer", "Lynx", "Raccoon Dog", "Mountain Hare", "Willow Ptarmigan", "Tufted Duck", "Mallard", "Hazel Grouse", "Greylag Goose", "Western Capercaillie", "Goldeneye", "Eurasian Wigeon", "Eurasian Teal", "Canada Goose", "Black Grouse", "Rock Ptarmigan"]) },

    // --- NEW ENGLAND MOUNTAINS ---
    { id: 'nem_story_all', cat: 'DLC: New England', name: 'New England Mountains Story Arc (7 Missions)', rank: 'gold', current: 0, goal: 7, type: 'checklist', desc: 'Complete Trevor Locke & Doc Locke narrative.', subItems: checkSet(["Off the beaten path", "Top-secret mission", "Same old same old", "A thousand words", "Second home", "Make a difference", "Cats and cradles"]) },
    { id: 'nem_coyotes', cat: 'DLC: New England', name: 'Responsible Culling', rank: 'bronze', current: 0, goal: 4, type: 'numeric', desc: 'Harvest 4 Coyotes.' },
    { id: 'nem_trophy_comp', cat: 'DLC: New England', name: 'Trophy Competition (15 Species)', rank: 'gold', current: 0, goal: 15, type: 'checklist', desc: 'Harvest 15 species Gold or Better.', subItems: checkSet(["Eastern Cottontail Rabbit", "Eastern Wild Turkey", "Green Wing Teal", "Golden Eye", "Mallard", "Northern Bobwhite Quail", "Ring Necked Pheasant", "Common Raccoon", "Coyote", "Gray Fox", "Red Fox", "Bobcat", "Whitetail Deer", "Black Bear", "Moose"]) },
    { id: 'nem_landmarks', cat: 'DLC: New England', name: 'New England Landmarks (13 Locations)', rank: 'bronze', current: 0, goal: 13, type: 'checklist', desc: 'Discover all reserve landmarks.', subItems: checkSet(["Laperrière Bridge", "Barmare Mansion Ruins", "Smith Scenic Railroad", "Tocqueville Cave", "Padavona Corn Maze", "The Old Toad", "Mafrousse Mines", "Gilman Pumpkin Fields", "Conway Pond Trail", "Favreau Boulder", "Mount Alcott Observatory", "Repair Bench at Observatory", "Tocqueville Cave Trash"]) },

    // --- EMERALD COAST ---
    { id: 'emc_story_all', cat: 'DLC: Emerald Coast', name: 'Emerald Coast Story Arc (9 Missions)', rank: 'gold', current: 0, goal: 9, type: 'checklist', desc: 'Complete Robbo & Soph storyline.', subItems: checkSet(["Neighbours", "Kangaroo Crossing", "Introduced Species", "By A Billabong", "The Beauty Of Nature", "Sanctuary", "Report All Sightings", "In Saltie Territory", "Well Played"]) },
    { id: 'emc_deer_plague', cat: 'DLC: Emerald Coast', name: 'Invasive Deer Plague', rank: 'gold', current: 0, goal: 150, type: 'numeric', desc: 'Harvest 150 of either Sambar, Red, or Rusa.' },
    { id: 'emc_going_gold', cat: 'DLC: Emerald Coast', name: 'Going For Gold (13 Species)', rank: 'gold', current: 0, goal: 13, type: 'checklist', desc: 'Harvest 13 species Gold or Better.', subItems: checkSet(["Magpie Goose", "Stubble Quail", "Red Fox", "Axis Deer", "Feral Goat", "Feral Pig", "Sambar Deer", "Hog Deer", "Javan Rusa", "Banteng", "Eastern Gray Kangaroo", "Fallow Deer", "Red Deer"]) },

    // --- SUNDARPATAN NEPAL ---
    { id: 'sun_story_all', cat: 'DLC: Sundarpatan', name: 'Sundarpatan Story Arc (9 Missions)', rank: 'gold', current: 0, goal: 9, type: 'checklist', desc: 'Complete Asmita Gurung & Birendra Majhi storyline.', subItems: checkSet(["Homestay", "Before The Storm", "Ghost Village", "The Man-Eater", "This Beloved Land of Ours", "Blood Bonds", "A Harsh Environment", "The Ghost of the Mountain", "At the Edge of the World"]) },
    { id: 'sun_nilgai_cull', cat: 'DLC: Sundarpatan', name: 'Antelope Wrangling', rank: 'gold', current: 0, goal: 50, type: 'numeric', desc: 'Harvest 50 Nilgai.' },

    // --- SALZWIESEN PARK ---
    { id: 'salz_pinch_salt', cat: 'DLC: Salzwiesen Park', name: 'Pinch Of Salt', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Complete the main intro mission.' },
    { id: 'salz_rabbit_hole', cat: 'DLC: Salzwiesen Park', name: 'Down The Rabbit Hole', rank: 'gold', current: 0, goal: 50, type: 'numeric', desc: 'Harvest 50 European Rabbits.' },
    { id: 'salz_bird_bingo', cat: 'DLC: Salzwiesen Park', name: 'Bird Bingo (11 Species)', rank: 'gold', current: 0, goal: 11, type: 'checklist', desc: 'Harvest 11 species Gold or Better.', subItems: checkSet(["Gadwall", "Ferruginous Duck", "Greylag Goose", "Tundra Bean Goose", "Eurasian Teal", "Eurasian Wigeon", "Goldeneye", "Mallard", "Tufted Duck", "Black Grouse", "Ring Necked Pheasant"]) },
    { id: 'salz_raccoons', cat: 'DLC: Salzwiesen Park', name: 'Black & White', rank: 'silver', current: 0, goal: 20, type: 'numeric', desc: 'Harvest 10 Common Raccoons and 10 Raccoon Dogs.' }
];

/* ----------------------------------------------------
 * SECTION 4: Platform Normalization
 * Lines 202-212: Maps diverse platform inputs to standards
 * ---------------------------------------------------- */
const normalizePlatform = (inputPlatform) => {
    if (!inputPlatform) return 'playstation';
    const clean = String(inputPlatform).toLowerCase().trim();
    if (clean === 'psn' || clean === 'ps' || clean === 'playstation') {
        return 'playstation';
    }
    return clean;
};

/* ----------------------------------------------------
 * SECTION 5: Dynamic Cross-Platform Responsive Styles Injection
 * Lines 214-358: Fluid desktop, tablet touch targets, and mobile layout
 * ---------------------------------------------------- */
const injectResponsiveNavbarStyles = () => {
    if (document.getElementById('cotw-responsive-nav-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'cotw-responsive-nav-styles';
    styleEl.innerHTML = `
        /* Top Navigation Stacking & Centering Context */
        .nav-wrapper-centered {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            position: relative;
            z-index: 99999;
            margin: 0 auto;
        }

        #dynamic-nav-links {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
            z-index: 99999;
        }

        #dynamic-nav-links a, .nav-dropbtn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #f8fafc;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            min-height: 40px;
        }

        #dynamic-nav-links a:hover, .nav-dropbtn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: #38bdf8;
        }

        .nav-icon {
            width: 22px;
            height: 22px;
            object-fit: contain;
            border-radius: 4px;
        }

        /* High-contrast, Top-of-Everything Dropdown Overlay */
        .nav-dropdown {
            position: relative;
            display: inline-block;
            z-index: 100000;
        }

        .nav-dropdown-content {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            min-width: 220px;
            max-width: 320px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 10px;
            padding: 8px;
            z-index: 100001;
            flex-direction: column;
            gap: 4px;
        }

        .nav-dropdown.active .nav-dropdown-content {
            display: flex;
        }

        .nav-dropdown-content a {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 6px;
            color: #e2e8f0;
            font-size: 0.85rem;
            background: rgba(30, 41, 59, 0.6);
            white-space: nowrap;
        }

        .nav-dropdown-content a:hover {
            background: #1e293b;
            color: #38bdf8;
        }

        /* Number Inputs with Direct Typing Support */
        .number-control-group {
            display: inline-flex;
            align-items: center;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            overflow: hidden;
            width: 100%;
            max-width: 240px;
        }

        .number-control-group button {
            background: #1e293b;
            color: #f8fafc;
            border: none;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: bold;
            transition: background 0.2s;
        }

        .number-control-group button:hover {
            background: #334155;
        }

        .number-control-group input[type="number"] {
            flex-grow: 1;
            width: 60px;
            background: transparent;
            border: none;
            color: #38bdf8;
            font-size: 0.95rem;
            font-weight: 700;
            text-align: center;
            padding: 6px;
            -moz-appearance: textfield;
        }

        .number-control-group input[type="number"]::-webkit-outer-spin-button,
        .number-control-group input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .number-goal-label {
            font-size: 0.8rem;
            color: #94a3b8;
            padding-right: 8px;
            white-space: nowrap;
        }

        /* Tablet Responsive (768px to 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
            #dynamic-nav-links a, .nav-dropbtn {
                min-height: 48px;
                padding: 10px 16px;
            }
            .nav-dropdown-content {
                min-width: 250px;
            }
        }

        /* Mobile Responsive (under 768px) */
        @media (max-width: 767px) {
            #dynamic-nav-links {
                flex-direction: column;
                width: 100%;
                border-radius: 8px;
                padding: 10px;
            }
            .nav-dropdown {
                width: 100%;
            }
            .nav-dropbtn {
                width: 100%;
                justify-content: space-between;
                min-height: 48px;
            }
            .nav-dropdown-content {
                position: static;
                transform: none;
                width: 100%;
                max-width: 100%;
                box-shadow: none;
                border: 1px solid rgba(255, 255, 255, 0.08);
                margin-top: 4px;
            }
        }
    `;
    document.head.appendChild(styleEl);
};

/* ----------------------------------------------------
 * SECTION 6: Main Application State & Engines
 * Lines 360-645: Profile binding, RTDB navigation, and live trophy sync
 * ---------------------------------------------------- */
const appState = {
    // Strictly gaming handle - default fallback Werewolf3788
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: normalizePlatform(localStorage.getItem('active_gaming_platform')),
    hunterData: [],
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 },
    auth: null,
    db: null,
    rtdb: null,
    collapsedSections: {},
    openDropdowns: {},
    masterUnsub: null,
    legacyUnsub: null,
    rtdbTrophyRef: null,

    getFreshTrophyTemplate: function() {
        return JSON.parse(JSON.stringify(trophyData));
    },

    /* ----------------------------------------------------
     * SECTION 6A: Dynamic RTDB Navigation Loader (/utm_links)
     * Enforces Strict Display Order:
     * 1. Home / Standalone (Left)
     * 2. User / Users (Second)
     * 3. Game / Games (Third)
     * 4. Everything else alphabetically
     * ---------------------------------------------------- */
    loadNavigationFromRTDB: function() {
        injectResponsiveNavbarStyles();
        const navContainer = document.getElementById('dynamic-nav-links');
        if (!this.rtdb || !navContainer) return;

        const linksRef = rtdbRef(this.rtdb, 'utm_links');
        onValue(linksRef, (snapshot) => {
            if (!snapshot.exists()) {
                navContainer.innerHTML = `<span style="color: #94a3b8; font-size: 0.8rem; padding: 8px;">No Navigation Items Found</span>`;
                return;
            }

            const rawData = snapshot.val();
            const groups = {};
            const standalone = [];

            // Protocol-relative sanitization helper
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
                    const groupKey = key;
                    if (!groups[groupKey]) groups[groupKey] = [];
                    node.forEach((arrItem, idx) => {
                        const parsed = parseItem(arrItem, `${groupKey}_${idx}`);
                        if (parsed) groups[groupKey].push(parsed);
                    });
                } else if (typeof node === 'object') {
                    if (node.title || node.url || node.link) {
                        const parsed = parseItem(node, key);
                        const f = parsed.folder.toLowerCase();
                        if (!f || f === 'home' || f === 'standalone' || f === 'none') {
                            standalone.push(parsed);
                        } else {
                            if (!groups[parsed.folder]) groups[parsed.folder] = [];
                            groups[parsed.folder].push(parsed);
                        }
                    } else {
                        const groupKey = key;
                        if (!groups[groupKey]) groups[groupKey] = [];
                        Object.keys(node).forEach(subKey => {
                            const parsed = parseItem(node[subKey], subKey);
                            if (parsed) groups[groupKey].push(parsed);
                        });
                    }
                }
            });

            let navHTML = '';

            // 1. Far Left: Home & Standalone links
            standalone.forEach(item => {
                const iconTag = item.icon ? `<img src="${item.icon}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                navHTML += `<a href="${item.url}">${iconTag}<span>${item.name}</span></a>`;
            });

            // Sorted Folders: User -> Game -> Alphabetical others
            const sortedFolderKeys = Object.keys(groups).sort((a, b) => {
                const lowA = a.toLowerCase();
                const lowB = b.toLowerCase();
                const isUserA = lowA === 'user' || lowA === 'users';
                const isUserB = lowB === 'user' || lowB === 'users';
                const isGameA = lowA === 'game' || lowA === 'games';
                const isGameB = lowB === 'game' || lowB === 'games';

                if (isUserA) return -1;
                if (isUserB) return 1;
                if (isGameA) return -1;
                if (isGameB) return 1;
                return lowA.localeCompare(lowB);
            });

            // 2. Render Folders
            sortedFolderKeys.forEach(folderName => {
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
                        <div class="nav-dropdown-content">
                            ${dropItems}
                        </div>
                    </div>
                `;
            });

            navContainer.innerHTML = navHTML;
        }, (err) => {
            console.error("RTDB Navigation Read Error:", err);
            navContainer.innerHTML = `<span style="color: #ef4444; font-size: 0.8rem; padding: 8px;">Navigation Offline</span>`;
        });
    },

    toggleNavFolder: function(folderId, event) {
        if (event) event.stopPropagation();
        const targetEl = document.getElementById(folderId);
        if (!targetEl) return;

        const isAlreadyActive = targetEl.classList.contains('active');
        document.querySelectorAll('.nav-dropdown').forEach(el => el.classList.remove('active'));

        if (!isAlreadyActive) {
            targetEl.classList.add('active');
        }
    },

    /* ----------------------------------------------------
     * SECTION 6B: Direct PSN RTDB Trophy Auto-Watcher
     * Path: /psn/gamertags/{Gamertag}/liveTrophyProgress/NPWR13211_00
     * Automatically scans and pulls completed trophies into the tracker.
     * ---------------------------------------------------- */
    bindRTDBTrophyWatcher: function(hunterKey) {
        if (!this.rtdb) return;

        const psnGamertag = USER_PSN_MAP[hunterKey] || hunterKey;
        const trophyPath = `psn/gamertags/${psnGamertag}/liveTrophyProgress/${NPWR_ID}`;
        this.rtdbTrophyRef = rtdbRef(this.rtdb, trophyPath);

        console.log(`[RTDB Sync] Watching PSN Trophies at: ${trophyPath}`);

        onValue(this.rtdbTrophyRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.log(`[RTDB Sync] No live PSN trophy progress found for ${psnGamertag} (${NPWR_ID})`);
                return;
            }

            const rtdbTrophies = snapshot.val();
            let stateMutated = false;
            const trophyEntries = Array.isArray(rtdbTrophies) ? rtdbTrophies : Object.values(rtdbTrophies);

            trophyEntries.forEach(rItem => {
                if (!rItem) return;
                const isEarned = rItem.earned === true || rItem.unlocked === true || rItem.achieved === 1;
                const rName = String(rItem.trophyName || rItem.name || '').trim().toLowerCase();

                if (isEarned && rName) {
                    const match = this.hunterData.find(t =>
                        t.name.trim().toLowerCase() === rName ||
                        t.id.toLowerCase() === rName
                    );

                    if (match && match.current < match.goal) {
                        match.current = match.goal;
                        if (match.type === 'checklist' && match.subItems) {
                            match.subItems.forEach(si => si.done = true);
                        }
                        stateMutated = true;
                    }
                }
            });

            if (stateMutated) {
                console.log(`[RTDB Sync] Auto-verified PSN trophies for ${hunterKey} (${psnGamertag})`);
                this.sync(true);
            }
        }, (err) => {
            console.warn("RTDB Trophy watcher error:", err.message);
        });
    },

    init: async function() {
        this.hunterData = this.getFreshTrophyTemplate();
        this.setupControlDropdowns();

        try {
            const app = initializeApp(firebaseConfig, 'COTW-Firestore-Engine');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            this.rtdb = getDatabase(app);

            this.loadNavigationFromRTDB();

            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.setStatus(`✓ Connected to Database [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
                    this.loadHunter(this.activeHunter, this.activePlatform);
                } else {
                    this.setStatus("❌ Auth Failed", "#ef4444");
                }
            });
        } catch (err) {
            console.error("Init Error:", err);
            this.setStatus(`❌ Connection Error: ${err.message}`, "#ef4444");
            this.render();
        }
    },

    setStatus: function(msg, color) {
        const el = document.getElementById("stat-line");
        if (el) {
            el.innerText = msg;
            if (color) el.style.color = color;
        }
    },

    setupControlDropdowns: function() {
        const platformSelector = document.getElementById("platform-selector");
        if (platformSelector) {
            platformSelector.value = this.activePlatform;
            platformSelector.addEventListener("change", (e) => {
                this.switchPlatform(e.target.value);
            });
        }

        const userSelector = document.getElementById("user-selector");
        if (userSelector) {
            userSelector.innerHTML = '';
            Object.keys(USER_PSN_MAP).forEach(handle => {
                const opt = document.createElement("option");
                opt.value = handle;
                opt.innerText = handle;
                if (handle === this.activeHunter) opt.selected = true;
                userSelector.appendChild(opt);
            });
            userSelector.addEventListener("change", (e) => {
                this.switchHunter(e.target.value);
            });
        }
    },

    loadHunter: function(userName, platform) {
        if (!this.auth || !this.auth.currentUser) return;

        if (this.masterUnsub) { this.masterUnsub(); this.masterUnsub = null; }
        if (this.legacyUnsub) { this.legacyUnsub(); this.legacyUnsub = null; }

        if (this.rtdbTrophyRef) {
            off(this.rtdbTrophyRef);
            this.rtdbTrophyRef = null;
        }

        // Standardize gamer handle
        this.activeHunter = userName || 'Werewolf3788';
        this.activePlatform = normalizePlatform(platform);

        this.hunterData = this.getFreshTrophyTemplate();
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };

        localStorage.setItem('active_gaming_nickname', this.activeHunter);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        if (document.getElementById('hunter-name')) {
            document.getElementById('hunter-name').innerText = `${this.activeHunter.toUpperCase()} [${this.activePlatform.toUpperCase()}]`;
        }

        const platformSelector = document.getElementById("platform-selector");
        if (platformSelector) {
            platformSelector.value = this.activePlatform;
        }

        const userSelector = document.getElementById("user-selector");
        if (userSelector) {
            userSelector.value = this.activeHunter;
        }

        this.render();
        this.updateRankUI();

        // 1. Cloud Firestore Progress Snapshot
        const docRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            const freshList = this.getFreshTrophyTemplate();

            if (snap.exists()) {
                const data = snap.data();
                const incoming = data.trophies || [];

                this.hunterData = freshList.map(dt => {
                    const found = incoming.find(it => it.id === dt.id);
                    if (found) {
                        if (dt.type === 'checklist' && found.subItems) {
                            dt.subItems = dt.subItems.map((si, i) => {
                                const dbMatch = found.subItems.find(x => x.name === si.name) || found.subItems[i];
                                const isDone = dbMatch?.done === true || dbMatch?.done === "true";
                                return { ...si, done: isDone };
                            });
                            dt.current = dt.subItems.filter(s => s.done).length;
                        } else {
                            if (found.done === true || found.completed === true) {
                                dt.current = dt.goal;
                            } else {
                                dt.current = Number(found.current) || 0;
                            }
                        }
                    } else {
                        dt.current = 0;
                    }
                    return dt;
                });
                this.setStatus(`✓ Live Firestore Sync [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
            } else {
                this.hunterData = freshList;
                this.setStatus(`⚠️ Initial State for ${this.activeHunter} [${this.activePlatform.toUpperCase()}]`, "#ff8800");
            }

            // Immediately scan & listen to live PSN trophies from RTDB
            this.bindRTDBTrophyWatcher(this.activeHunter);
            this.render();
        }, (err) => {
            console.error("Firestore Listen Error:", err);
            this.setStatus(`❌ Read Error: ${err.message}`, "#ef4444");
            this.render();
        });

        // 2. Animal Rank Snapshot
        const rankRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
        this.legacyUnsub = onSnapshot(rankRef, (snap) => {
            if (snap.exists()) {
                const incomingRank = snap.data();
                this.animalRankData = {
                    bronze: incomingRank.bronze || 0,
                    silver: incomingRank.silver || 0,
                    gold: incomingRank.gold || 0,
                    diamond: incomingRank.diamond || 0,
                    greatone: incomingRank.greatone || incomingRank.greatOne || 0,
                    albino: incomingRank.albino || 0
                };
            } else {
                this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };
            }
            this.updateRankUI();
        }, (err) => {
            console.error("Rank Sync Error:", err);
        });
    },

    switchHunter: function(name) {
        this.loadHunter(name, this.activePlatform);
    },

    switchPlatform: function(platformCode) {
        this.loadHunter(this.activeHunter, platformCode);
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
                opt.innerText = cat;
                selector.appendChild(opt);
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
            const percent = items.length > 0 ? Math.round((catMet / items.length) * 100) : 0;

            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
            section.id = sectionId;
            section.innerHTML = `
                <div class="category-header" onclick="appState.toggleSection('${sectionId}')">
                    <h2>${cat}</h2>
                    <div style="font-weight:900; font-size: 0.85rem; color:#38bdf8;">${catMet}/${items.length} (${percent}%)</div>
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
                    // Universal direct-typing support for counts
                    ctrl = `
                        <div class="number-control-group">
                            <button type="button" onclick="appState.adj('${t.id}', -1)">-</button>
                            <input type="number" value="${t.current}" min="0" max="${t.goal}" 
                                   onchange="appState.setVal('${t.id}', this.value)" 
                                   onkeydown="if(event.key==='Enter') this.blur();">
                            <span class="number-goal-label">/ ${t.goal}</span>
                            <button type="button" onclick="appState.adj('${t.id}', 1)">+</button>
                        </div>
                    `;
                } else if (t.type === 'checklist') {
                    const dropClass = appState.openDropdowns[t.id] ? 'show' : '';
                    const btnClass = isDone ? 'dropdown-trigger lock-badge' : 'dropdown-trigger';
                    const btnText = isDone ? `Audit Verified (${t.current}/${t.goal})` : `Audit Registry (${t.current}/${t.goal})`;

                    let subItemsHTML = t.subItems.map((s, idx) => {
                        return `<div class="sub-item" style="flex-direction: column; align-items: flex-start; margin-bottom: 6px;">
                                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                        <span style="font-size: 0.85rem;">${s.name}</span>
                                        <button type="button" class="check-btn ${s.done ? 'is-done' : ''}" onclick="appState.check('${t.id}', ${idx})">${s.done ? '✓' : ''}</button>
                                    </div>
                                </div>`;
                    }).join('');

                    ctrl = `<button type="button" class="${btnClass}" onclick="appState.toggleDrop('${t.id}')">${btnText}</button>
                            <div id="drop-${t.id}" class="dropdown-content ${dropClass}">${subItemsHTML}</div>`;
                } else {
                    const btnClass = isDone ? 'toggle-btn lock-badge' : 'toggle-btn';
                    const btnText = isDone ? 'Audit Verified (Undo)' : 'Mark Harvested';
                    ctrl = `<button type="button" class="${btnClass}" onclick="appState.tog('${t.id}')">${btnText}</button>`;
                }

                card.innerHTML = `
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${this.getIcon(t)}" class="trophy-icon-img" alt="">
                        <div>
                            <span class="trophy-rank rank-${t.rank}">${t.rank}</span>
                            <div style="font-weight:900; font-size:0.9rem; margin-top:4px;">${t.name}</div>
                        </div>
                    </div>
                    <p style="font-size:0.75rem; font-style:italic; margin:15px 0; color:#cbd5e1; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${t.desc}</p>
                    ${ctrl}
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const overall = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
        if (document.getElementById('overall-bar')) document.getElementById('overall-bar').style.width = overall + '%';
        if (document.getElementById('percent-text')) document.getElementById('percent-text').innerText = `Master Completion Progress ${overall}%`;
    },

    getIcon: (t) => t.playstationImage ? t.playstationImage : (t.cat.includes('Collectibles') ? ICONS.TRACK : t.name.includes('Arc') || t.name.includes('Master') || t.name.includes('Missions') || t.name.includes('Story') ? ICONS.ARC : t.name.includes('Mile') ? ICONS.TRAVEL : t.name.includes('Marksman') ? ICONS.MARK : ICONS.GAME),

    adj: function(id, val) {
        const t = this.hunterData.find(x => x.id === id);
        if (t) {
            t.current = Math.min(t.goal, Math.max(0, Number(t.current) + val));
            this.sync();
        }
    },

    setVal: function(id, rawVal) {
        const t = this.hunterData.find(x => x.id === id);
        if (t) {
            const num = parseInt(rawVal, 10);
            t.current = isNaN(num) ? 0 : Math.min(t.goal, Math.max(0, num));
            this.sync();
        }
    },

    tog: function(id) {
        const t = this.hunterData.find(x => x.id === id);
        if (t) {
            t.current = t.current === 0 ? 1 : 0;
            this.sync();
        }
    },

    check: function(id, idx) {
        const t = this.hunterData.find(x => x.id === id);
        if (t && t.subItems && t.subItems[idx]) {
            t.subItems[idx].done = !t.subItems[idx].done;
            this.sync();
        }
    },

    adjRank: async function(tier, val) {
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val);
        this.updateRankUI();

        if (!this.db || !this.auth || !this.auth.currentUser) return;

        try {
            const rankRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
            await setDoc(rankRef, this.animalRankData, { merge: true });
        } catch (error) {
            console.error("FIRESTORE RANK SAVE ERROR:", error);
        }
    },

    updateRankUI: function() {
        Object.keys(this.animalRankData).forEach(k => {
            const el = document.getElementById(`rank-val-${k}`);
            if (el) el.innerText = this.animalRankData[k];
        });
    },

    toggleSection: function(id) {
        const cur = this.collapsedSections[id] !== false;
        this.collapsedSections[id] = !cur;
        this.render();
    },

    toggleDrop: function(id) {
        const el = document.getElementById('drop-' + id);
        if (el) {
            el.classList.toggle('show');
            this.openDropdowns[id] = el.classList.contains('show');
        }
    },

    scrollToCategory: function(id) {
        if (!id) return;
        this.collapsedSections[id] = false;
        this.render();
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },

    /* ----------------------------------------------------
     * SECTION 7: Cloud Firestore Sync Writer
     * Lines 647-684: Writeback pipeline & analytics trigger
     * ---------------------------------------------------- */
    sync: async function(silent = false) {
        this.render();
        this.updateRankUI();

        if (!this.db || !this.auth || !this.auth.currentUser) return;

        if (!silent) this.setStatus("⏳ Saving to Cloud Firestore...", "#e67e22");

        try {
            if (typeof gtag === 'function') {
                gtag('event', 'tracker_sync', {
                    'event_category': 'Tracker',
                    'hunter_name': this.activeHunter,
                    'platform': this.activePlatform
                });
            }

            const ref = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);

            const payload = {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                trophies: this.hunterData,
                lastUpdate: Date.now()
            };

            await setDoc(ref, payload, { merge: true });
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
            this.setStatus(`✓ Saved to Cloud Firestore at ${timeStr}`, "#10b981");
        } catch (error) {
            console.error("FIRESTORE WRITE ERROR:", error);
            this.setStatus(`❌ Save Failed: ${error.message}`, "#ef4444");
        }
    }
};

window.appState = appState;
window.adjRank = (tier, val) => appState.adjRank(tier, val);

appState.init();

// Global click event to dismiss dropdown menus when clicking outside
window.addEventListener('click', function(event) {
    if (!event.target.closest('.nav-dropdown')) {
        document.querySelectorAll('.nav-dropdown.active').forEach(el => {
            el.classList.remove('active');
        });
    }

    if (!event.target.matches('.dropdown-trigger') && !event.target.closest('.dropdown-content')) {
        document.querySelectorAll('.dropdown-content.show').forEach(el => {
            el.classList.remove('show');
            const id = el.id.replace('drop-', '');
            appState.openDropdowns[id] = false;
        });
    }
});
