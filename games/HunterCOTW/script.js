/* ============================================================================
   File: script.js
   Location: /games/HunterCOTW/script.js
   Description: theHunter: Call of the Wild Responsive RTDB + Firestore Engine
                - Loop-Free Live PSN Trophy Watcher (NPWR13211_00)
                - Single Player vs. Multiplayer Mode Toggle (Story Missions Gated)
                - Field Grind Telemetry: Weight (1-33 Drift), Fur, Difficulty Tiers
                - Ballistics: Shot Distance (Marksman Auto-Trophies), Weapon Class, Hit Organ
                - PS App Screenshot Upload to Firebase Storage with RTDB Ledger Binding
                - 4-Player Switcher (Werewolf, Raymystyro, Terrdog, DesdemonaTiger)
                - Geofenced Layton Lake 40-Point Anchor Auto-Fill
   Database: Cloud Firestore, Realtime Database & Firebase Storage (entertainment-71888)
   Build Version: 4.3.0
   Code Build Date: 2026-10-02 11:55:00 EDT (America/New_York)
   ============================================================================ */

import { initializeApp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from '//www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from '//www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue, set, update, push, off } from '//www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from '//www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

/* ----------------------------------------------------
 * SECTION 1: Build Metadata, User Map & Custom Themes
 * Lines 27-105: PSN handles, custom themes, asset icons
 * ---------------------------------------------------- */
const BUILD_VERSION = "4.3.0";
const CODE_BUILD_DATE = "2026-10-02 11:55:00 EDT";

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

const USER_PSN_MAP = {
    'Werewolf': 'wildhorse_spirit',
    'Werewolf3788': 'wildhorse_spirit',
    'Raymystyro': 'OneLIVIDMAN',
    'OneLIVIDMAN': 'OneLIVIDMAN',
    'Terrdog': 'Darkwing69420',
    'Darkwing69420': 'Darkwing69420',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const USER_THEMES = {
    'Werewolf': {
        accent: '#ff5500',
        accentGlow: 'rgba(255, 85, 0, 0.45)',
        secondary: '#0a0a0c',
        border: 'rgba(255, 85, 0, 0.35)',
        badgeBg: '#ff5500',
        badgeText: '#ffffff'
    },
    'Werewolf3788': {
        accent: '#ff5500',
        accentGlow: 'rgba(255, 85, 0, 0.45)',
        secondary: '#0a0a0c',
        border: 'rgba(255, 85, 0, 0.35)',
        badgeBg: '#ff5500',
        badgeText: '#ffffff'
    },
    'Raymystyro': {
        accent: '#2563eb',
        accentGlow: 'rgba(37, 99, 235, 0.45)',
        secondary: '#ef4444',
        border: 'rgba(37, 99, 235, 0.4)',
        badgeBg: '#ef4444',
        badgeText: '#ffffff'
    },
    'OneLIVIDMAN': {
        accent: '#2563eb',
        accentGlow: 'rgba(37, 99, 235, 0.45)',
        secondary: '#ef4444',
        border: 'rgba(37, 99, 235, 0.4)',
        badgeBg: '#ef4444',
        badgeText: '#ffffff'
    },
    'Terrdog': {
        accent: '#a855f7',
        accentGlow: 'rgba(168, 85, 247, 0.45)',
        secondary: '#581c87',
        border: 'rgba(168, 85, 247, 0.4)',
        badgeBg: '#a855f7',
        badgeText: '#ffffff'
    },
    'DesdemonaTiger': {
        accent: '#10b981',
        accentGlow: 'rgba(16, 185, 129, 0.45)',
        secondary: '#064e3b',
        border: 'rgba(16, 185, 129, 0.4)',
        badgeBg: '#10b981',
        badgeText: '#ffffff'
    }
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
 * SECTION 2: Master Helpers & Ground-Truth Anchor Grid
 * Lines 107-185: Checklists & 40 verified Layton anchors
 * ---------------------------------------------------- */
const checkSet = (items) => items.map(name => ({ name, done: false }));

const normalizePlatform = (inputPlatform) => {
    if (!inputPlatform) return 'playstation';
    const clean = String(inputPlatform).toLowerCase().trim();
    if (clean === 'psn' || clean === 'ps' || clean === 'playstation') return 'playstation';
    return clean;
};

const LAYTON_ANCHORS = [
    { id: 1, x: 10189, y: 11293, region: 'Lake District', subRegion: 'Balmont' },
    { id: 2, x: 10622, y: 10947, region: 'Lake District', subRegion: 'Balmont' },
    { id: 3, x: 10733, y: 10487, region: 'Lake District', subRegion: 'Balmont' },
    { id: 4, x: 12069, y: 11244, region: 'Southern Ridge', subRegion: 'Mount Leviathan' },
    { id: 5, x: 10912, y: 9521, region: 'Lake District', subRegion: 'Balmont' },
    { id: 6, x: 10353, y: 8123, region: 'Lake District', subRegion: 'High Lake' },
    { id: 7, x: 11033, y: 7990, region: 'Southern Ridge', subRegion: 'Cheelah' },
    { id: 8, x: 11835, y: 6884, region: 'Southern Ridge', subRegion: 'Cheelah' },
    { id: 9, x: 13135, y: 7245, region: 'Southern Ridge', subRegion: 'Cheelah' },
    { id: 10, x: 13403, y: 5942, region: 'Northern Ridge', subRegion: 'Calburn' },
    { id: 11, x: 13415, y: 4802, region: 'Northern Ridge', subRegion: 'Calburn' },
    { id: 12, x: 11887, y: 4841, region: 'Northern Ridge', subRegion: 'Norden' },
    { id: 13, x: 11048, y: 5299, region: 'Northern Ridge', subRegion: 'Norden' },
    { id: 14, x: 10468, y: 5120, region: 'Highton Peaks', subRegion: 'Chopeeka' },
    { id: 15, x: 9688, y: 4872, region: 'Highton Peaks', subRegion: 'Chopeeka' },
    { id: 16, x: 8872, y: 5027, region: 'Highton Peaks', subRegion: 'Willipeg' },
    { id: 17, x: 7557, y: 3821, region: 'Highton Peaks', subRegion: 'Willipeg' },
    { id: 18, x: 7529, y: 5260, region: 'Highton Peaks', subRegion: 'Willipeg' },
    { id: 19, x: 6801, y: 4843, region: 'Layton Lows', subRegion: 'Mount Kraken' },
    { id: 20, x: 6272, y: 6500, region: 'Layton Lows', subRegion: 'Mount Kraken' },
    { id: 21, x: 6578, y: 7146, region: 'Layton Lows', subRegion: 'Mount Kraken' },
    { id: 22, x: 6970, y: 8391, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 23, x: 6544, y: 8783, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 24, x: 7185, y: 9161, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 25, x: 6909, y: 10278, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 26, x: 6517, y: 10567, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 27, x: 7155, y: 10962, region: 'Layton Lows', subRegion: 'Roonachee' },
    { id: 28, x: 8666, y: 11472, region: 'Lake District', subRegion: 'Balmont' },
    { id: 29, x: 8603, y: 10354, region: 'Lake District', subRegion: 'Balmont' },
    { id: 30, x: 9923, y: 10329, region: 'Lake District', subRegion: 'Balmont' },
    { id: 31, x: 9656, y: 10072, region: 'Lake District', subRegion: 'Balmont' },
    { id: 32, x: 9852, y: 9647, region: 'Lake District', subRegion: 'Balmont' },
    { id: 33, x: 8315, y: 9405, region: 'Lake District', subRegion: 'Balmont' },
    { id: 34, x: 8932, y: 9063, region: 'Lake District', subRegion: 'Balmont' },
    { id: 35, x: 9046, y: 7822, region: 'Lake District', subRegion: 'High Lake' },
    { id: 36, x: 8941, y: 7455, region: 'Lake District', subRegion: 'High Lake' },
    { id: 37, x: 8555, y: 6533, region: 'Lake District', subRegion: 'High Lake' },
    { id: 38, x: 10104, y: 7008, region: 'Lake District', subRegion: 'High Lake' },
    { id: 39, x: 11164, y: 9156, region: 'Southern Ridge', subRegion: 'Cheelah' },
    { id: 40, x: 9622, y: 7176, region: 'Lake District', subRegion: 'High Lake' }
];

/* ----------------------------------------------------
 * SECTION 3: Raw Static Master Data Baseline
 * Lines 187-310: Complete trophy & mission database records
 * ---------------------------------------------------- */
const trophyData = [
    // --- BASE GAME TROPHIES ---
    { id: 'plat_cotw', cat: 'Base Game', name: 'theHunter', rank: 'platinum', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Collect every trophy.' },
    { id: 'head_shoulder_knees_toes', cat: 'Base Game', name: 'Head, Shoulders, Knees, And Toes', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: "Down an animal from each stance." },
    { id: 'the_mile', cat: 'Base Game', name: 'The Mile', rank: 'bronze', current: 0, goal: 1, type: 'numeric', plat: true, isArc: false, desc: 'Travel 1 mile on foot.' },
    { id: 'scand_mile', cat: 'Base Game', name: 'The Scandinavian Mile', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, isArc: false, desc: 'Travel 6.2 miles on foot.' },
    { id: 'marathon', cat: 'Base Game', name: 'The Marathon', rank: 'silver', current: 0, goal: 26.2, type: 'numeric', plat: true, isArc: false, desc: 'Travel 26.2 miles on foot.' },
    { id: 'ultra', cat: 'Base Game', name: 'The Ultramarathon', rank: 'gold', current: 0, goal: 100, type: 'numeric', plat: true, isArc: false, desc: 'Travel 100 miles on foot.' },
    { id: 'jager', cat: 'Base Game', name: 'Jäger Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Gerlinde Jäger's arc.", subItems: checkSet(["A Picture for Her Book", "Saving Sommer's Cornfields", "The Deer and the Sea", "The Lost Son", "Wrapping up the Book"]) },
    { id: 'sommer', cat: 'Base Game', name: 'Sommer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Robert Sommer's arc.", subItems: checkSet(["Mr. Sommer's Bow", "Smell Like a Deer", "Controlling the Land", "The Fox and the Scope", "Sommerfest"]) },
    { id: 'bhandari', cat: 'Base Game', name: 'Bhandari Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Vinay Bhandari's arc.", subItems: checkSet(["Investigating the Bison", "Stop the Disease", "Population Control", "Clashing With the Deer", "A Last Push"]) },
    { id: 'fleischer', cat: 'Base Game', name: 'Fleischer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Albertina Fleischer's arc.", subItems: checkSet(["A Trophy to Remember", "Red Deer Canyon", "Stuffin' Them All!", "Don't Ruin the Goods", "Returning the Favor"]) },
    { id: 'tressler', cat: 'Base Game', name: 'Tressler Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Marwin Tressler's arc.", subItems: checkSet(["Wild Boars Raving", "A Ton of Meat", "Hunting for Gold", "Boar Beast Boss", "The Radioactive Boars"]) },
    { id: 'hope', cat: 'Base Game', name: 'Hope Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Richard Hope's arc.", subItems: checkSet(["A Visitor", "Investigating Bears", "A Second Visit", "Unwelcome Guests", "Sick Papa Bear"]) },
    { id: 'trampfine', cat: 'Base Game', name: 'Trampfine Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Jonathan Trampfine's arc.", subItems: checkSet(["A Family Picture", "For a Few Samples of Poo", "A Picture of Mr. Black", "The Return of Bear Man", "Trampfine Is Lost"]) },
    { id: 'vualez', cat: 'Base Game', name: 'Vualez Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Fiona Vualez's arc.", subItems: checkSet(["Wildlife Control", "The Big Coyote Tour", "Late Nights with the Dogs", "The Silent Hunt", "The Werecoyote"]) },
    { id: 'connors', cat: 'Base Game', name: 'Connors Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Emily Connors's arc.", subItems: checkSet(["Lost Writings", "Capturing the Landscape", "Emily Heart Elk", "Putting Out the Fire", "End of Season"]) },
    { id: 'beatty', cat: 'Base Game', name: 'Beatty Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, isArc: true, desc: "Complete Paul Beatty's arc.", subItems: checkSet(["Waiting It Out", "To the Rescue", "Hunting Moose", "The Circle Route (Big 5: Moose, Elk, Coyote, Bear, Blacktail)", "Playing the Guide"]) },
    { id: 'hir_master', cat: 'Base Game', name: 'Hirschfelden Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: true, desc: 'Complete all Central Europe missions.' },
    { id: 'lay_master', cat: 'Base Game', name: 'Layton Lake District Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: true, desc: 'Complete all Pacific Northwest missions.' },
    { id: 'novice_m', cat: 'Base Game', name: 'Novice Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Hit animal from 50m+.' },
    { id: 'skilled_m', cat: 'Base Game', name: 'Skilled Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Hit animal from 100m+.' },
    { id: 'expert_m', cat: 'Base Game', name: 'Expert Marksman', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Hit animal from 200m+.' },
    { id: 'legend_m', cat: 'Base Game', name: 'Legendary Marksman', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Hit animal from 400m+.' },
    { id: 'moby_deer', cat: 'Base Game', name: 'Moby Deer', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Harvest albino deer.' },
    { id: 'hero_h', cat: 'Base Game', name: 'Hero Of Hirschfelden', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Harvest in every subregion.' },
    { id: 'lord_l', cat: 'Base Game', name: 'Lord Of The Lakes', rank: 'gold', current: 0, goal: 9, type: 'checklist', plat: true, isArc: false, desc: 'Harvest in every Layton subregion.', subItems: checkSet(["Balmont", "Calburn", "Cheelah", "Chopeeka", "High Lake", "Mount Kraken", "Mount Leviathan", "Norden", "Roonachee", "Willipeg"]) },
    { id: 'stay_target', cat: 'Base Game', name: 'Stay On Target', rank: 'bronze', current: 0, goal: 50, type: 'numeric', plat: true, isArc: false, desc: '50 tracks same animal.' },
    { id: 'persistence', cat: 'Base Game', name: 'Persistence Is Futile', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, isArc: false, desc: '100 tracks same animal.' },
    { id: 'stalker', cat: 'Base Game', name: 'Stalker', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, isArc: false, desc: 'Spot 100 animals.' },
    { id: 'leave_no', cat: 'Base Game', name: 'Leave No Animal Behind', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Harvest wounded animal.' },
    { id: 'scarecrow', cat: 'Base Game', name: 'Scarecrow', rank: 'bronze', current: 0, goal: 1000, type: 'numeric', plat: true, isArc: false, desc: 'Scare 1000 animals.' },
    { id: 'not_zombie', cat: 'Base Game', name: 'This Is Not A Zombie Game', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: true, isArc: false, desc: '10 brain hit kills.' },
    { id: 'diamonds_ever', cat: 'Base Game', name: 'Diamonds Are Forever', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Earn a diamond rating.' },
    { id: 'goldmember', cat: 'Base Game', name: 'Goldmember', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Earn a gold rating.' },
    { id: 'seeing_believing', cat: 'Base Game', name: 'Seeing Is Believing', rank: 'bronze', current: 0, goal: 10, type: 'numeric', plat: true, isArc: false, desc: 'Spot 10 animals.' },
    { id: 'jack_trades', cat: 'Base Game', name: 'Jack Of All Trades', rank: 'gold', current: 0, goal: 4, type: 'numeric', plat: true, isArc: false, desc: 'Harvest with 4 weapon types.' },
    { id: 'blind_shot', cat: 'Base Game', name: 'Blind Shot', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Hit animal barely visible.' },
    { id: 'calls_wild_play', cat: 'Base Game', name: 'Call Of The Wild', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Use all animal callers.' },
    { id: 'insomniac_hunt', cat: 'Base Game', name: 'Insomniac', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Harvest at night.' },
    { id: 'globetrotter_hunt', cat: 'Base Game', name: 'Globetrotter', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Visit all regions in Hirschfelden and Layton.' },
    { id: 'up_close_personal', cat: 'Base Game', name: 'Up Close And Personal', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Within 15m.' },
    { id: 'paparazzi_hunt', cat: 'Base Game', name: 'Wildlife Paparazzi', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, isArc: false, desc: 'Photo unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'potty_humor_hunt', cat: 'Base Game', name: 'Potty Humor', rank: 'bronze', current: 0, goal: 100, type: 'numeric', plat: true, isArc: false, desc: 'Examine 100 droppings.' },
    { id: 'make_it_count_hunt', cat: 'Base Game', name: 'Make It Count', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Last round in mag.' },
    { id: 'silver_lining_hunt', cat: 'Base Game', name: 'Silver Lining', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Silver rating.' },
    { id: 'something_hunt', cat: 'Base Game', name: "It's Something", rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Bronze rating.' },
    { id: 'bucket_list_hunt', cat: 'Base Game', name: 'Bucket List', rank: 'gold', current: 0, goal: 7, type: 'checklist', plat: true, isArc: false, desc: 'Spot unique species.', subItems: checkSet(["Moose", "Red Deer", "Roe Deer", "Wild Boar", "Red Fox", "European Bison", "Fallow Deer"]) },
    { id: 'eavesdropping_hunt', cat: 'Base Game', name: 'Eavesdropping', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Identify calls.' },
    { id: 'nerves_of_steel_hunt', cat: 'Base Game', name: 'Nerves Of Steel', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Elevated heart rate.' },
    { id: 'old_fashioned_way_hunt', cat: 'Base Game', name: 'The Old Fashioned Way', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Unscoped rifle.' },

    // --- MISSIONS & SIDE QUESTS ---
    { id: 'layton_side_doc', cat: 'Layton Lake Missions', name: 'Colton "Doc" Locke Side Registry (30 Missions)', rank: 'gold', current: 0, goal: 30, type: 'numeric', plat: false, isArc: true, desc: 'Complete Doc #1 through Doc #30.' },
    { id: 'layton_side_conners', cat: 'Layton Lake Missions', name: 'Emily Conners Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: false, isArc: true, desc: 'Complete Conners #1 through Conners #10.' },
    { id: 'layton_side_vualez', cat: 'Layton Lake Missions', name: 'Fiona Vualez Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: false, isArc: true, desc: 'Complete Vualez #1 through Vualez #10.' },
    { id: 'layton_side_beatty', cat: 'Layton Lake Missions', name: 'Paul Beatty Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: false, isArc: true, desc: 'Complete Beatty #1 through Beatty #10.' },
    { id: 'layton_side_hope', cat: 'Layton Lake Missions', name: 'Richard Hope Side Registry (10 Missions)', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: false, isArc: true, desc: 'Complete Hope #1 through Hope #10.' },

    // --- SILVER RIDGE PEAKS ---
    { id: 'srp_turkeys', cat: 'DLC: Silver Ridge', name: 'Gobble gobble', rank: 'silver', current: 0, goal: 50, type: 'numeric', plat: true, isArc: false, desc: 'Harvest 50 turkeys.' },
    { id: 'srp_badname', cat: 'DLC: Silver Ridge', name: 'You give love a bad name', rank: 'gold', current: 0, goal: 10, type: 'numeric', plat: true, isArc: false, desc: 'Down 10 animals in the heart with Alexander Longbow.' },
    { id: 'srp_thanks', cat: 'DLC: Silver Ridge', name: 'Thanksgiving!', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, isArc: false, desc: 'Harvest a diamond turkey.' }
];

const SPECIES_BENCHMARKS = {
    'Black Bear': { min: 40, max: 290, sweetLow: 80, sweetHigh: 115, diamondLevel: 9 },
    'Whitetail Deer': { min: 42, max: 100, sweetLow: 50, sweetHigh: 65, diamondLevel: 3 },
    'Red Deer': { min: 90, max: 240, sweetLow: 120, sweetHigh: 155, diamondLevel: 9 },
    'Moose': { min: 300, max: 620, sweetLow: 360, sweetHigh: 430, diamondLevel: 5 },
    'Fallow Deer': { min: 30, max: 100, sweetLow: 45, sweetHigh: 60, diamondLevel: 5 },
    'Gray Wolf': { min: 30, max: 80, sweetLow: 35, sweetHigh: 46, diamondLevel: 9 }
};

/* ----------------------------------------------------
 * SECTION 4: Application State & Core Telemetry Engine
 * ---------------------------------------------------- */
const appState = {
    activeHunter: localStorage.getItem('pinned_device_user') || 'Werewolf',
    activePlatform: normalizePlatform(localStorage.getItem('active_gaming_platform')),
    activeReserve: 'Layton Lake',
    activeSpecies: 'Black Bear',
    zoneType: 'main',
    sessionMode: 'single', // 'single' vs 'multi'
    selectedImageFile: null,
    hunterData: [],
    animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 },
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
    rtdbSpeciesRef: null,
    knownSpeciesList: [
        'Black Bear', 'Whitetail Deer', 'Moose', 'Red Deer', 
        'Fallow Deer', 'Roe Deer', 'Wild Boar', 'Gray Wolf', 
        'Merriam Turkey', 'Plains Bison', 'Roosevelt Elk', 
        'Mountain Lion', 'Mule Deer', 'Pronghorn'
    ],

    getFreshTrophyTemplate: function() {
        return JSON.parse(JSON.stringify(trophyData));
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

        if (this.activeReserve.toLowerCase().includes('layton')) {
            LAYTON_ANCHORS.forEach(pt => {
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

    renderSpeciesDropdown: function() {
        const datalist = document.getElementById('species-datalist');
        if (!datalist) return;
        datalist.innerHTML = '';
        const allSpecies = [...new Set(this.knownSpeciesList)].sort();
        allSpecies.forEach(sp => {
            const opt = document.createElement('option');
            opt.value = sp;
            datalist.appendChild(opt);
        });
        const inputEl = document.getElementById('grind-species-input');
        if (inputEl && !inputEl.value) inputEl.value = this.activeSpecies;
    },

    handleSpeciesChange: async function(val) {
        if (!val || !val.trim()) return;
        const cleanName = val.trim();
        this.activeSpecies = cleanName;
        if (!this.knownSpeciesList.includes(cleanName)) {
            this.knownSpeciesList.push(cleanName);
            this.renderSpeciesDropdown();
            if (this.rtdb) {
                const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
                await set(rtdbRef(this.rtdb, `shared_map_registry/${cleanMap}/known_species/${cleanName}`), true);
            }
        }
        this.bindGrindTelemetry();
    },

    bindSharedSpeciesList: function() {
        if (!this.rtdb) return;
        if (this.rtdbSpeciesRef) off(this.rtdbSpeciesRef);
        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        this.rtdbSpeciesRef = rtdbRef(this.rtdb, `shared_map_registry/${cleanMap}/known_species`);
        onValue(this.rtdbSpeciesRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const rtdbSpecies = Object.keys(snapshot.val() || {});
            this.knownSpeciesList = [...new Set([...this.knownSpeciesList, ...rtdbSpecies])];
            this.renderSpeciesDropdown();
        });
    },

    bindGrindTelemetry: function() {
        if (!this.rtdb) return;
        if (this.rtdbLedgerRef) off(this.rtdbLedgerRef);

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanSpecies = this.activeSpecies.replace(/[^a-zA-Z0-9]/g, '_');
        this.rtdbLedgerRef = rtdbRef(this.rtdb, `users/${this.activeHunter}/grind_tracker/${cleanMap}/${cleanSpecies}/harvests`);

        onValue(this.rtdbLedgerRef, (snapshot) => {
            const fill = document.getElementById('sweet-spot-gauge');
            const readout = document.getElementById('sweet-spot-readout');
            if (!snapshot.exists()) {
                if (fill) fill.style.width = '0%';
                if (readout) readout.innerText = "No harvest data recorded yet for active grind.";
                return;
            }

            const harvests = Object.values(snapshot.val());
            const recent = harvests.slice(-30);
            const totalWeight = recent.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0);
            const avgWeight = totalWeight / (recent.length || 1);

            const specMeta = SPECIES_BENCHMARKS[this.activeSpecies] || { min: 30, max: 150, sweetLow: 45, sweetHigh: 75 };
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
                    <br>Recent: ${recent.length} | Exterior Ratio: <strong>${extRatio}%</strong> ${extRatio < 20 ? '(⚠️ Check exterior lakes)' : '✓ Healthy Rotation'}
                `;
            }
        });
    },

    /* --- LOG HARVEST: Uploads Screenshot, Evaluates Ballistics & Respects Mode Gating --- */
    logHarvest: async function() {
        if (!this.rtdb || !this.auth.currentUser) return;
        const speciesInput = document.getElementById('grind-species-input');
        const chosenSpecies = speciesInput?.value?.trim() || this.activeSpecies || 'Unknown';
        this.activeSpecies = chosenSpecies;

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
        const weaponInput = document.getElementById('harvest-weapon');
        const organInput = document.getElementById('harvest-organ');

        const weight = parseFloat(weightInput?.value);
        if (isNaN(weight) || weight <= 0) {
            alert("Please enter a valid animal harvest weight.");
            return;
        }

        const distance = parseFloat(distInput?.value) || 0;
        const weapon = weaponInput?.value || 'Rifle';
        const organ = organInput?.value || 'Lungs';

        this.setStatus("⏳ Logging harvest & uploading screenshot...", "#e67e22");

        let downloadUrl = "";
        if (this.selectedImageFile && this.storage) {
            try {
                const imgPath = `harvest_captures/${this.activeHunter}/${Date.now()}_${this.selectedImageFile.name}`;
                const fileRef = storageRef(this.storage, imgPath);
                const snapshot = await uploadBytes(fileRef, this.selectedImageFile);
                downloadUrl = await getDownloadURL(snapshot.ref);
            } catch (err) {
                console.warn("Storage upload failed, continuing with telemetry save:", err.message);
            }
        }

        const harvestPayload = {
            species: chosenSpecies,
            weight: weight,
            level: parseInt(levelInput?.value, 10) || 1,
            levelName: levelInput?.options[levelInput.selectedIndex]?.text || 'Level 1',
            sex: sexInput?.value || 'male',
            fur: furInput?.value || 'Common',
            rating: ratingInput?.value || 'none',
            shotDistance: distance,
            weapon: weapon,
            hitOrgan: organ,
            sessionMode: this.sessionMode,
            zoneType: this.zoneType,
            imageUrl: downloadUrl,
            lat: parseFloat(latInput?.value) || 0,
            long: parseFloat(longInput?.value) || 0,
            region: regionInput?.value?.trim() || 'Unknown',
            subRegion: subregionInput?.value?.trim() || 'Unknown',
            timestamp: Date.now()
        };

        const cleanMap = this.activeReserve.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanSpecies = chosenSpecies.replace(/[^a-zA-Z0-9]/g, '_');

        try {
            // 1. Append immutable harvest to user's RTDB grind ledger
            const harvestsRef = rtdbRef(this.rtdb, `users/${this.activeHunter}/grind_tracker/${cleanMap}/${cleanSpecies}/harvests`);
            await push(harvestsRef, harvestPayload);

            // 2. Ensure new species is permanently saved to RTDB registry
            if (!this.knownSpeciesList.includes(chosenSpecies)) {
                this.knownSpeciesList.push(chosenSpecies);
                await set(rtdbRef(this.rtdb, `shared_map_registry/${cleanMap}/known_species/${chosenSpecies}`), true);
                this.renderSpeciesDropdown();
            }

            // 3. UNIVERSAL TROPHY CHECKS (Track in both Single & Multiplayer)
            let trophyStateChanged = false;

            // Distance Marksman Trophies
            if (distance >= 50) { const t = this.hunterData.find(x => x.id === 'novice_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 100) { const t = this.hunterData.find(x => x.id === 'skilled_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 200) { const t = this.hunterData.find(x => x.id === 'expert_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }
            if (distance >= 400) { const t = this.hunterData.find(x => x.id === 'legend_m'); if (t && t.current < t.goal) { t.current = t.goal; trophyStateChanged = true; } }

            // Brain Hits ("This Is Not A Zombie Game")
            if (organ.toLowerCase().includes('brain') || organ.toLowerCase().includes('skull')) {
                const zombieTrophy = this.hunterData.find(x => x.id === 'not_zombie');
                if (zombieTrophy && zombieTrophy.current < zombieTrophy.goal) {
                    zombieTrophy.current += 1;
                    trophyStateChanged = true;
                }
            }

            // Turkey Cull Bridge (SRP 50 turkeys)
            const isSilverRidge = this.activeReserve.toLowerCase().includes('silver ridge');
            const isTurkey = chosenSpecies.toLowerCase().includes('turkey');
            if (isSilverRidge && isTurkey) {
                const turkeyTrophy = this.hunterData.find(t => t.id === 'srp_turkeys');
                if (turkeyTrophy && turkeyTrophy.current < turkeyTrophy.goal) {
                    turkeyTrophy.current = Math.min(turkeyTrophy.goal, turkeyTrophy.current + 1);
                    trophyStateChanged = true;
                }
            }

            // Longbow Heart Shots (SRP "You give love a bad name")
            if (isSilverRidge && weapon.toLowerCase().includes('longbow') && organ.toLowerCase().includes('heart')) {
                const longbowTrophy = this.hunterData.find(t => t.id === 'srp_badname');
                if (longbowTrophy && longbowTrophy.current < longbowTrophy.goal) {
                    longbowTrophy.current += 1;
                    trophyStateChanged = true;
                }
            }

            // 4. Auto-Increment Career Animal Rank
            const ratingKey = harvestPayload.rating.toLowerCase();
            if (ratingKey !== 'none' && this.animalRankData[ratingKey] !== undefined) {
                this.adjRank(ratingKey, 1);
            }

            // 5. Commit trophy updates if any milestone met
            if (trophyStateChanged) {
                this.sync(true);
            }

            // Reset Form Inputs
            if (weightInput) weightInput.value = '';
            if (distInput) distInput.value = '';
            const previewContainer = document.getElementById('screenshot-preview-container');
            if (previewContainer) previewContainer.style.display = 'none';
            const fileInput = document.getElementById('harvest-screenshot-file');
            if (fileInput) fileInput.value = '';
            this.selectedImageFile = null;

            this.setStatus(`✓ Logged ${chosenSpecies} (${weight}kg) [Mode: ${this.sessionMode.toUpperCase()}]`, "#10b981");
        } catch (err) {
            console.error("Harvest Log Error:", err);
            this.setStatus(`❌ Harvest Save Failed: ${err.message}`, "#ef4444");
        }
    },

    bindRTDBTrophyWatcher: function(hunterKey) {
        if (!this.rtdb) return;
        const psnGamertag = USER_PSN_MAP[hunterKey] || USER_PSN_MAP[this.activeHunter] || 'wildhorse_spirit';
        if (!psnGamertag) return;

        const trophyPath = `psn/gamertags/${psnGamertag}/liveTrophyProgress/${NPWR_ID}`;
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
                console.log(`[RTDB Sync] Auto-verified PSN trophies for ${hunterKey} (${psnGamertag})`);
                this.render();
            }
        });
    },

    init: async function() {
        this.hunterData = this.getFreshTrophyTemplate();
        this.renderBuildMetadata();
        this.applyPlayerTheme(this.activeHunter);
        this.updatePinButtonUI();

        try {
            const app = initializeApp(firebaseConfig, 'COTW-Dual-Engine');
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            this.rtdb = getDatabase(app);
            this.storage = getStorage(app);

            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.setStatus(`✓ Connected [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
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

    loadHunter: function(userName, platform) {
        if (!this.auth || !this.auth.currentUser) return;
        if (this.masterUnsub) { this.masterUnsub(); this.masterUnsub = null; }
        if (this.legacyUnsub) { this.legacyUnsub(); this.legacyUnsub = null; }
        if (this.rtdbTrophyRef) { off(this.rtdbTrophyRef); this.rtdbTrophyRef = null; }

        this.activeHunter = userName || 'Werewolf';
        this.activePlatform = normalizePlatform(platform);
        this.hunterData = this.getFreshTrophyTemplate();
        this.animalRankData = { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0, albino: 0 };

        localStorage.setItem('active_gaming_nickname', this.activeHunter);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        this.applyPlayerTheme(this.activeHunter);
        this.updatePinButtonUI();

        const hunterHeader = document.getElementById('hunter-name');
        if (hunterHeader) hunterHeader.innerText = `${this.activeHunter.toUpperCase()} [${this.activePlatform.toUpperCase()}]`;

        this.render();
        this.updateRankUI();
        this.bindSharedSpeciesList();
        this.bindGrindTelemetry();

        const docRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);
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
            this.render();
        });

        this.bindRTDBTrophyWatcher(this.activeHunter);

        const rankRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
        this.legacyUnsub = onSnapshot(rankRef, (snap) => {
            if (snap.exists()) {
                const inc = snap.data();
                this.animalRankData = {
                    bronze: inc.bronze || 0,
                    silver: inc.silver || 0,
                    gold: inc.gold || 0,
                    diamond: inc.diamond || 0,
                    greatone: inc.greatone || inc.greatOne || 0,
                    albino: inc.albino || 0
                };
            }
            this.updateRankUI();
        });
    },

    applyPlayerTheme: function(gamerHandle) {
        const theme = USER_THEMES[gamerHandle] || USER_THEMES['Werewolf'];
        const root = document.documentElement;
        root.style.setProperty('--user-theme-accent', theme.accent);
        root.style.setProperty('--user-theme-glow', theme.accentGlow);
        root.style.setProperty('--user-theme-border', theme.border);
        root.style.setProperty('--user-theme-secondary', theme.secondary);
        root.style.setProperty('--user-theme-badge-bg', theme.badgeBg);
        root.style.setProperty('--user-theme-badge-text', theme.badgeText);
        document.body.setAttribute('data-active-user', gamerHandle);
    },

    togglePinDevice: function() {
        const currentPin = localStorage.getItem('pinned_device_user');
        if (currentPin === this.activeHunter) localStorage.removeItem('pinned_device_user');
        else localStorage.setItem('pinned_device_user', this.activeHunter);
        this.updatePinButtonUI();
    },

    updatePinButtonUI: function() {
        const pinBtn = document.getElementById('pin-device-btn');
        if (!pinBtn) return;
        const isPinned = localStorage.getItem('pinned_device_user') === this.activeHunter;
        pinBtn.className = isPinned ? 'pin-device-btn is-pinned' : 'pin-device-btn';
        pinBtn.innerText = isPinned ? '📌 Pinned as Primary Device' : '📌 Pin Device to This User';
    },

    switchHunter: function(name) { if (name) this.loadHunter(name, this.activePlatform); },
    switchPlatform: function(code) { if (code) this.loadHunter(this.activeHunter, code); },

    render: function() {
        const container = document.getElementById('section-container');
        const selector = document.getElementById('reserve-selector');
        if (!container) return;

        container.innerHTML = '';
        this.renderGrindTelemetryCard(container);

        const cats = [...new Set(this.hunterData.map(t => t.cat))];
        if (selector && selector.options.length <= 1) {
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.innerText = cat;
                selector.appendChild(opt);
            });
            selector.onchange = (e) => {
                this.activeReserve = e.target.value;
                this.bindSharedSpeciesList();
                this.bindGrindTelemetry();
                this.scrollToCategory(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
            };
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
                    <div style="font-weight:900; font-size: 0.85rem; color: var(--user-theme-accent);">${catMet}/${items.length} (${percent}%)</div>
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
                                ${t.isArc ? `<span class="mode-badge is-solo" title="Story mode only">🔒 Solo Arc</span>` : `<span class="mode-badge is-shared" title="Universal in Solo or Multiplayer">🌐 Universal</span>`}
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
        card.innerHTML = `
            <div class="grind-card-header">
                <div>
                    <h3 style="margin:0; color:var(--user-theme-accent);">🎯 Field Grind & Harvest Card</h3>
                    <span style="font-size:0.8rem; color:#94a3b8;">Reserve: <strong>${this.activeReserve}</strong></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" id="session-mode-btn" class="session-toggle-btn ${this.sessionMode === 'single' ? 'is-single' : 'is-multi'}" onclick="appState.toggleSessionMode()">
                        ${this.sessionMode === 'single' ? '🎮 Mode: Single Player (Story Active)' : '👥 Mode: Multiplayer (Story Muted)'}
                    </button>
                </div>
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
                    <label class="grind-input-label">Target Species</label>
                    <input type="text" id="grind-species-input" class="grind-input" list="species-datalist" value="${this.activeSpecies}" placeholder="e.g. Black Bear, Moose" onchange="appState.handleSpeciesChange(this.value)">
                    <datalist id="species-datalist"></datalist>
                </div>
                <div>
                    <label class="grind-input-label">Zone Rotation</label>
                    <button type="button" id="zone-toggle-btn" class="zone-toggle-btn is-main" onclick="appState.setZoneType(appState.zoneType === 'main' ? 'exterior' : 'main')">
                        🎯 Main Rotation Zone
                    </button>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Harvest Weight (kg / lbs)</label>
                    <input type="number" id="harvest-weight" class="grind-input" placeholder="e.g. 94.5" step="0.1">
                </div>
                <div>
                    <label class="grind-input-label">Difficulty / Level</label>
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
                    <input type="number" id="harvest-distance" class="grind-input" placeholder="e.g. 150 (400m+ for Legendary)">
                </div>
                <div>
                    <label class="grind-input-label">Weapon Class Used</label>
                    <select id="harvest-weapon" class="grind-select">
                        <option value="Rifle" selected>Rifle (.300, 7mm, .243, .30-06)</option>
                        <option value="Bow / Longbow">Bow / Longbow (Alexander Longbow)</option>
                        <option value="Handgun">Handgun (.44, .454)</option>
                        <option value="Shotgun">Shotgun (12G, 16G, 20G)</option>
                    </select>
                </div>
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Hit Organ / Placement</label>
                    <select id="harvest-organ" class="grind-select">
                        <option value="Both Lungs" selected>Both Lungs (Double Lung)</option>
                        <option value="Heart">Heart (Longbow Vital)</option>
                        <option value="Brain / Skull">Brain / Skull (Zombie Trophy)</option>
                        <option value="Left Lung">Left Lung</option>
                        <option value="Right Lung">Right Lung</option>
                        <option value="Spine / Neck">Spine / Neck</option>
                        <option value="Liver / Stomach">Liver / Stomach</option>
                    </select>
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
                    <label class="grind-input-label">Trophy Rating (Auto-Ranks)</label>
                    <select id="harvest-rating" class="grind-select">
                        <option value="none">No Rating</option>
                        <option value="bronze">Bronze 🥉</option>
                        <option value="silver">Silver 🥈</option>
                        <option value="gold">Gold 🥇</option>
                        <option value="diamond">Diamond 💎</option>
                        <option value="greatone">Great One 👑</option>
                        <option value="albino">Albino 🌟</option>
                    </select>
                </div>
                <div>
                    <label class="grind-input-label">PS App Trophy Screenshot</label>
                    <input type="file" id="harvest-screenshot-file" class="grind-input file-input" accept="image/*" onchange="appState.handleImageSelection(event)">
                </div>
            </div>

            <div id="screenshot-preview-container" class="preview-box" style="display:none;">
                <img id="screenshot-preview" src="" alt="PlayStation App Harvest Preview" class="preview-img">
            </div>

            <div class="grind-grid-2col">
                <div>
                    <label class="grind-input-label">Coordinates (Lat / Long) [Layton Auto-Fill]</label>
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

            <button type="button" class="log-harvest-btn" onclick="appState.logHarvest()">
                📝 Log Harvest & Sync Telemetry
            </button>
        `;
        container.appendChild(card);
        this.renderSpeciesDropdown();
    },

    getIcon: (t) => t.playstationImage ? t.playstationImage : (t.cat.includes('Collectibles') ? ICONS.TRACK : t.name.includes('Arc') || t.name.includes('Missions') ? ICONS.ARC : t.name.includes('Mile') ? ICONS.TRAVEL : t.name.includes('Marksman') ? ICONS.MARK : ICONS.GAME),
    adj: function(id, val) { const t = this.hunterData.find(x => x.id === id); if (t) { t.current = Math.min(t.goal, Math.max(0, Number(t.current) + val)); this.sync(); } },
    setVal: function(id, rawVal) { const t = this.hunterData.find(x => x.id === id); if (t) { const n = parseInt(rawVal, 10); t.current = isNaN(n) ? 0 : Math.min(t.goal, Math.max(0, n)); this.sync(); } },
    tog: function(id) { const t = this.hunterData.find(x => x.id === id); if (t) { t.current = t.current === 0 ? 1 : 0; this.sync(); } },
    check: function(id, idx) { const t = this.hunterData.find(x => x.id === id); if (t && t.subItems[idx]) { t.subItems[idx].done = !t.subItems[idx].done; this.sync(); } },
    
    adjRank: async function(tier, val) {
        this.animalRankData[tier] = Math.max(0, (this.animalRankData[tier] || 0) + val);
        this.updateRankUI();
        if (!this.db || !this.auth?.currentUser) return;
        try {
            const rankRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', `${GAME_ID}_Ranks`);
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
    scrollToCategory: function(id) { if (!id) return; this.collapsedSections[id] = false; this.render(); setTimeout(() => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }, 100); },

    sync: async function(silent = false) {
        this.render();
        this.updateRankUI();
        if (!this.db || !this.auth?.currentUser) return;
        if (!silent) this.setStatus("⏳ Saving to Cloud Firestore...", "#e67e22");
        try {
            const ref = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);
            await setDoc(ref, {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                trophies: this.hunterData,
                lastUpdate: Date.now()
            }, { merge: true });
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
            this.setStatus(`✓ Saved to Cloud Firestore at ${timeStr}`, "#10b981");
        } catch (e) {
            console.error("Firestore Write Error:", e);
            this.setStatus(`❌ Save Failed: ${e.message}`, "#ef4444");
        }
    }
};

window.appState = appState;
window.adjRank = (tier, val) => appState.adjRank(tier, val);
appState.init();
