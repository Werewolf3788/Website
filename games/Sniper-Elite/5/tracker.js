/* ============================================================================
   File: tracker.js
   Location: /games/Sniper-Elite/5/tracker.js
   Description: Sniper Elite 5 Live PSN RTDB + Firestore Tactical Tracker Engine
   Database: Cloud Firestore & Realtime Database (entertainment-71888)
   Firestore Target: /users/{gamertag}/platform/{platform}/progress/sniper-elite-5
   RTDB Trophy Source: /psn/gamertags/{psn_id}/liveTrophyProgress/NPWR21465_00
   Analytics Tag: G-CTYHDF4MSD
   Build Version: v8.2.0-SE5-PSN-SYNC
   Code Build Date: 2026-09-23 15:30:00 EDT (America/New_York)
   ============================================================================ */

import { initializeApp } from '//www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from '//www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from '//www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue, off } from '//www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

/* ----------------------------------------------------
 * SECTION 1: Build Metadata, User Map & Themes
 * ---------------------------------------------------- */
const BUILD_VERSION = "8.2.0";
const CODE_BUILD_DATE = "2026-09-23 15:30:00 EDT";
const GAME_ID = "sniper-elite-5";
const NPWR_ID = "NPWR21465_00";

const firebaseConfig = {
  apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
  authDomain: "entertainment-71888.firebaseapp.com",
  databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
  projectId: "entertainment-71888",
  storageBucket: "entertainment-71888.firebasestorage.app",
  messagingSenderId: "660524340277",
  appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
  measurementId: "G-CTYHDF4MSD"
};

const ALL_OPERATIVES = ['Werewolf3788', 'Raymystyro', 'Terrdog', 'Elu Cloud'];

const USER_PSN_MAP = {
  'Werewolf3788': 'WildHorse_Spirit',
  'Raymystyro': 'Raymystyro',
  'Terrdog': 'Darkwing69420',
  'Elu Cloud': 'DesdemonaTiger'
};

const USER_THEMES = {
  'Werewolf3788': {
    accent: '#ff5500',
    accentGlow: 'rgba(255, 85, 0, 0.45)',
    border: 'rgba(255, 85, 0, 0.35)',
    secondary: '#0a0a0c',
    badgeBg: '#ff5500',
    badgeText: '#ffffff',
    intColor: 0xff5500
  },
  'Raymystyro': {
    accent: '#2563eb',
    accentGlow: 'rgba(37, 99, 235, 0.45)',
    border: 'rgba(37, 99, 235, 0.4)',
    secondary: '#ef4444',
    badgeBg: '#ef4444',
    badgeText: '#ffffff',
    intColor: 0x2563eb
  },
  'Terrdog': {
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.45)',
    border: 'rgba(168, 85, 247, 0.4)',
    secondary: '#581c87',
    badgeBg: '#a855f7',
    badgeText: '#ffffff',
    intColor: 0xa855f7
  },
  'Elu Cloud': {
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    border: 'rgba(16, 185, 129, 0.4)',
    secondary: '#064e3b',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    intColor: 0x10b981
  }
};

const GITHUB_RAW_BASE = '//raw.githubusercontent.com/Werewolf3788/Website/main/games/Sniper-Elite/5/images/';

const GAME_TYPE_ICONS = {
  'Personal Letter': `${GITHUB_RAW_BASE}Sniper%20Elite%20Personal%20Letters.JPG`,
  'Classified Doc': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
  'Hidden Item': `${GITHUB_RAW_BASE}Sniper%20Elite%20Hidden%20Items.JPG`,
  'Stone Eagle': `${GITHUB_RAW_BASE}Sniper%20Elite%20Eagle.JPG`,
  'Workbench': `${GITHUB_RAW_BASE}Sniper%20Elite%20WorkBench.JPG`,
  'Challenge': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
  'Trophy': `${GITHUB_RAW_BASE}Sniper%20Elite%20Hidden%20Items.JPG`,
  'Medal': `${GITHUB_RAW_BASE}Sniper%20Elite%20Classified%20Documents.JPG`,
  'Ribbon': `${GITHUB_RAW_BASE}Sniper%20Elite%20Personal%20Letters.JPG`
};

const IN_GAME_TYPE_ORDER = {
  'Personal Letter': 1,
  'Classified Doc': 2,
  'Hidden Item': 3,
  'Stone Eagle': 4,
  'Workbench': 5,
  'Challenge': 6,
  'Trophy': 7,
  'Medal': 8,
  'Ribbon': 9
};

/* ----------------------------------------------------
 * SECTION 2: Master PSN Trophy ID Mapping (NPWR21465_00)
 * ---------------------------------------------------- */
const PSN_TROPHY_MAPPINGS = {
  'Sniper Elite': 'tr_plat',
  'Meeting Resistance': 'med_frenchconn',
  'Confirming Suspicions': 'med_confirming_susp',
  'The Kraken Wakes': 'med_thekrakenwakes',
  'It\'s Starting to Crack': 'med_startstocrack',
  'Change the Channel': 'med_changechannel',
  'Taking it back': 'med_takeback',
  'Taking It Back': 'med_takeback',
  'Target America': 'med_targetamerica',
  'The Kraken Sleeps': 'med_krakensleeps',
  'Can\'t Outrun A Bullet': 'med_cantoutrun',
  'Can\'t Outrun a Bullet': 'med_cantoutrun',
  'Climbing the Ladder': 'med_climbing_ladder',
  'Liberté': 'med_liberte',
  'Best of the Best': 'med_bestofbest',
  'No Stone Unturned': 'med_nostone',
  'Opposing Force': 'med_opposing_force',
  'Enemy at the Gates': 'med_enemy_gates',
  'Fields of Glory': 'med_fields_glory',
  'Just a Flesh Wound': 'med_fleshwound',
  'Organ Grinder': 'med_organgrinder',
  'Strategist': 'med_strategist',
  'Master of Pistols': 'med_masterpistols',
  'Master of Secondaries': 'med_mastersecond',
  'Master of Rifles': 'med_masterrifles',
  'Master-at-arms': 'med_masteratarms',
  'Master-at-Arms': 'med_masteratarms',
  'Gunslinger': 'med_gunslinger',
  'Skirmisher': 'med_skirmisher',
  'Sharpshooter': 'med_sharpshooter',
  'The Long Game': 'med_longgame',
  'Set Europe Ablaze': 'med_seteablaze',
  'Precision Is Key': 'med_ironprecision',
  'Out of Scope': 'med_outofscope',
  'Rigged to Blow': 'med_riggedtoblow',
  'My Little Friend': 'med_littlefriend',
  'Explosive Efficiency': 'med_explodeeffic',
  'Lord of War': 'med_lordofwar',
  'Die Nussknacker Sweet!': 'med_nutcracker',
  'Resourceful': 'med_resourceful',
  'Der Geist': 'med_dergeist',
  'As Quiet as a Mouse': 'med_quietmouse',
  'Close Quarters': 'med_closequarters',
  'Snake in the Grass': 'med_snaketallgrass',
  'From Paris with Love': 'med_fromparis_love',
  'Burn after reading': 'med_burn_after_reading',
  'Burn After Reading': 'med_burn_after_reading',
  'Souvenir hunter': 'med_souvenir_hunter',
  'Souvenir Hunter': 'med_souvenir_hunter',
  'Eagle Eyed': 'med_eagle_eyed',
  'Tinkerer': 'med_tinkerer',
  'It\'ll Buff Right Out': 'med_buffrightout',
  'Locomotion Commotion': 'med_locomotion',
  'Up Close and Personal': 'med_upclose',
  'Road Rage': 'med_roadrage',
  'Don\'t hold your breath': 'med_dontbreath',
  'Don\'t Hold Your Breath': 'med_dontbreath',
  'Brains of the Operation': 'med_brainsop',
  'Sight Beyond Sights': 'med_sightbeyond',
  'Shoot for the Moon': 'med_shoot_moon',
  // DLC 1: Wolf Mountain
  'Führerious Repetition': 'med_wm_fuhrerious',
  'Reich To The Point': 'med_reichtopoint',
  'Reich to the Point': 'med_reichtopoint',
  'From Führer Away': 'med_wm_fromfuhrer',
  'Covert Elimination': 'med_covertelim',
  'Alpha': 'med_wm_alpha',
  'Herr Today, Gone Tomorrow': 'med_wm_herrtoday',
  'Operation Foxley': 'med_wm_opfoxley',
  'Das Familienjuwel': 'med_wm_familienjuwel',
  // DLC 2: Landing Force
  'Last Resort': 'med_lastresort',
  // DLC 3: Conqueror
  'Siegebreaker': 'med_siegebreaker',
  'Ghost of Falaise': 'med_ghostoffalaise',
  'Operation Overlord': 'med_opoverlord',
  // DLC 4: Rough Landing
  'If You Go Down To The Woods Today': 'med_m13_woods',
  'If You Go Down to the Woods Today': 'med_m13_woods',
  'Fight Another Day': 'med_m13_fightanother',
  'Stroll in the Woods': 'med_m13_stroll',
  // DLC 5: Kraken Awakes
  'Shipbreaker': 'med_m14_shipbreaker',
  'Sink or Swim': 'med_m14_sinkorswim',
  'Going Overboard': 'med_m14_goingover'
};

/* ----------------------------------------------------
 * SECTION 3: Sniper Elite 5 Master Dataset
 * (All items flagged with `plat: true` if synced with PSN)
 * ---------------------------------------------------- */
const sniperData = [
  // --- Mission 1: The Atlantic Wall ---
  { id: 'm1_pl1', cat: '1: The Atlantic Wall', name: 'Picked Some Violets', type: 'Personal Letter', desc: 'Far eastern side, south of radar tower, inside a small shack.', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=86s' },
  { id: 'm1_pl2', cat: '1: The Atlantic Wall', name: 'Upcoming Delivery', type: 'Personal Letter', desc: 'Farm east of Steffen Beckendorf. Climb ladder on western side of outhouse.', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=201s' },
  { id: 'm1_pl3', cat: '1: The Atlantic Wall', name: 'Violets Are Wilting', type: 'Personal Letter', desc: 'Attic of the building containing the Atlantikwall Report.', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=374s' },
  { id: 'm1_pl4', cat: '1: The Atlantic Wall', name: 'Violets Don\'t Wilt', type: 'Personal Letter', desc: 'Inside hotel safe on the western side of the map.', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=433s' },
  { id: 'm1_pl5', cat: '1: The Atlantic Wall', name: 'Pests in the Garden', type: 'Personal Letter', desc: 'Beneath the gazebo table on the pier (south-western map).', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=580s' },
  { id: 'm1_pl6', cat: '1: The Atlantic Wall', name: 'Boches at the Door', type: 'Personal Letter', desc: 'Downstairs sofa in the resistance safehouse.', yt: '//www.youtube.com/watch?v=9WbjkODyRio&t=639s' },
  { id: 'm1_cd1', cat: '1: The Atlantic Wall', name: 'Resistance Captured', type: 'Classified Doc', desc: 'Table inside the boathouse (requires boathouse key from officer).', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=268s' },
  { id: 'm1_cd2', cat: '1: The Atlantic Wall', name: 'Beach Defences', type: 'Classified Doc', desc: 'Inside a safe in the north-western shack (SMG workbench area).', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=305s' },
  { id: 'm1_cd3', cat: '1: The Atlantic Wall', name: 'Lacking Air Support', type: 'Classified Doc', desc: 'Inside a safe in the room under the radar tower.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=345s' },
  { id: 'm1_cd4', cat: '1: The Atlantic Wall', name: 'Atlantikwall Report', type: 'Classified Doc', desc: 'Kitchen safe in the northern town houses near anti-air gun.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=382s' },
  { id: 'm1_hi1', cat: '1: The Atlantic Wall', name: 'Resistance Photo', type: 'Hidden Item', desc: 'Upstairs table opposite the bed in the western beachfront pharmacy.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=420s' },
  { id: 'm1_hi2', cat: '1: The Atlantic Wall', name: 'Radio Tin', type: 'Hidden Item', desc: 'Table in the stable area of the central farm.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=455s' },
  { id: 'm1_hi3', cat: '1: The Atlantic Wall', name: 'FFI Flag', type: 'Hidden Item', desc: 'Draining board in the downstairs of the western farmhouse.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=490s' },
  { id: 'm1_se1', cat: '1: The Atlantic Wall', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Chimney top of an inaccessible house opposite the eastern shack.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=525s' },
  { id: 'm1_se2', cat: '1: The Atlantic Wall', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'On the roof of the western hotel.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=555s' },
  { id: 'm1_se3', cat: '1: The Atlantic Wall', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'On top of the Vantage Point building in the south-east.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=585s' },
  { id: 'm1_wb1', cat: '1: The Atlantic Wall', name: 'Rifle Workbench', type: 'Workbench', desc: 'Armoury room upstairs after rendezvousing with Blue Viper.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=615s' },
  { id: 'm1_wb2', cat: '1: The Atlantic Wall', name: 'SMG Workbench', type: 'Workbench', desc: 'Attic of the resistance safehouse on the western map edge.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=648s' },
  { id: 'm1_wb3', cat: '1: The Atlantic Wall', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside locked shack above gun battery in the north-west.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=680s' },
  { id: 'med_ls_m1', cat: '1: The Atlantic Wall', name: 'Mission 1 (The Atlantic Wall) Long Shot', type: 'Medal', desc: 'Take a 600 meters shot in Colline-Sur-Mer.', target: 600, isLongShot: true },
  { id: 'med_ls_m1_auth', cat: '1: The Atlantic Wall', name: 'Mission 1 (The Atlantic Wall) Authentic Long Shot', type: 'Medal', desc: 'Take a 725 meters shot in Colline-Sur-Mer, in Authentic difficulty.', target: 725, isLongShot: true },

  // --- Mission 2: Occupied Residence ---
  { id: 'm2_pl1', cat: '2: Occupied Residence', name: 'Do Not Fail Me, Nephew', type: 'Personal Letter', desc: 'Table in an open room upstairs overlooking the main courtyard.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=20s' },
  { id: 'm2_pl2', cat: '2: Occupied Residence', name: 'Need a Scapegoat', type: 'Personal Letter', desc: 'Box at foot of bed in Friedrich Kummler\'s quarters (second floor).', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=58s' },
  { id: 'm2_pl3', cat: '2: Occupied Residence', name: 'Brother, I Have a Plan', type: 'Personal Letter', desc: 'Third floor dorms in the central part of the chateau.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=95s' },
  { id: 'm2_pl4', cat: '2: Occupied Residence', name: 'Good Plan, Let\'s Do It', type: 'Personal Letter', desc: 'On a box in the sniper outhouse north-east of the garden.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=132s' },
  { id: 'm2_cd1', cat: '2: Occupied Residence', name: 'Orders of the Day', type: 'Classified Doc', desc: 'Inside a locked locker next to the central path lookout tower.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=168s' },
  { id: 'm2_cd2', cat: '2: Occupied Residence', name: 'Renovations Completed', type: 'Classified Doc', desc: 'On the desk inside Moller\'s office.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=204s' },
  { id: 'm2_cd3', cat: '2: Occupied Residence', name: 'Operation Kraken', type: 'Classified Doc', desc: 'In Moller\'s hidden study (pull the painting to enter).', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=242s' },
  { id: 'm2_cd4', cat: '2: Occupied Residence', name: 'New Orders, Effective Immediately', type: 'Classified Doc', desc: 'Table inside the far-west resistance safehouse.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=280s' },
  { id: 'm2_cd5', cat: '2: Occupied Residence', name: 'Immediate Request for Attic Repairs', type: 'Classified Doc', desc: 'Table in an outhouse on the far east side.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=315s' },
  { id: 'm2_cd6', cat: '2: Occupied Residence', name: 'Grateful Thanks', type: 'Classified Doc', desc: 'Table beneath Moller\'s painting in his hidden room.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=350s' },
  { id: 'm2_hi1', cat: '2: Occupied Residence', name: 'Old Man Statuette', type: 'Hidden Item', desc: 'Inside the safe hidden behind a painting in Kummler\'s quarters.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=388s' },
  { id: 'm2_hi2', cat: '2: Occupied Residence', name: 'Group Statuette', type: 'Hidden Item', desc: 'Inside a locked trunk in the third-floor dormitories.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=425s' },
  { id: 'm2_hi3', cat: '2: Occupied Residence', name: 'Soldier Statuette', type: 'Hidden Item', desc: 'Looted from the sniper in the north-east outhouse.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=460s' },
  { id: 'm2_se1', cat: '2: Occupied Residence', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'On the roof of the L-shaped farmhouse on the far west.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=498s' },
  { id: 'm2_se2', cat: '2: Occupied Residence', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Tip of a ledge looking west from the main gates bridge.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=530s' },
  { id: 'm2_se3', cat: '2: Occupied Residence', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Eastern side of an outhouse just north of the chateau.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=562s' },
  { id: 'm2_wb1', cat: '2: Occupied Residence', name: 'Rifle Workbench', type: 'Workbench', desc: 'Inside the eastern cellar armoury.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=595s' },
  { id: 'm2_wb2', cat: '2: Occupied Residence', name: 'SMG Workbench', type: 'Workbench', desc: 'Roof area of the western resistance safehouse (climb vines).', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=630s' },
  { id: 'm2_wb3', cat: '2: Occupied Residence', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside the eastern outhouse armoury.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA&t=665s' },
  { id: 'med_ls_m2', cat: '2: Occupied Residence', name: 'Mission 2 (Occupied Residence) Long Shot', type: 'Medal', desc: 'Take a 525 meters shot in Château de Berengar.', target: 525, isLongShot: true },
  { id: 'med_ls_m2_auth', cat: '2: Occupied Residence', name: 'Mission 2 (Occupied Residence) Authentic Long Shot', type: 'Medal', desc: 'Take a 250 meters shot in Château de Berengar, in Authentic difficulty.', target: 250, isLongShot: true },

  // --- Campaign Major Trophies & Storyline (PSN NPWR21465_00) ---
  { id: 'tr_plat', cat: '15: Campaign & Objective Medals', name: 'Sniper Elite', type: 'Trophy', plat: true, desc: 'Obtain all Sniper Elite 5 Trophies.' },
  { id: 'med_frenchconn', cat: '15: Campaign & Objective Medals', name: 'Meeting Resistance', type: 'Trophy', plat: true, desc: 'Weaken the Atlantic wall and rendezvous with Blue Viper.' },
  { id: 'med_confirming_susp', cat: '15: Campaign & Objective Medals', name: 'Confirming Suspicions', type: 'Trophy', plat: true, desc: 'Raid Chateau de Berengar and Möller\'s Office.' },
  { id: 'med_thekrakenwakes', cat: '15: Campaign & Objective Medals', name: 'The Kraken Wakes', type: 'Trophy', plat: true, desc: 'Infiltrate Beaumont-Saint-Denis and Uncover Operation Kraken.' },
  { id: 'med_startstocrack', cat: '15: Campaign & Objective Medals', name: 'It\'s Starting to Crack', type: 'Trophy', plat: true, desc: 'Destroy Operation Kraken\'s production facility at Martressac.' },
  { id: 'med_changechannel', cat: '15: Campaign & Objective Medals', name: 'Change the Channel', type: 'Trophy', plat: true, desc: 'Destroy the Prototype Stealth U-Boat hidden in Festung Guernsey.' },
  { id: 'med_takeback', cat: '15: Campaign & Objective Medals', name: 'Taking it back', type: 'Trophy', plat: true, desc: 'Liberate Desponts-sur-Douve and secure Allied transport routes.' },
  { id: 'med_targetamerica', cat: '15: Campaign & Objective Medals', name: 'Target America', type: 'Trophy', plat: true, desc: 'Destroy the V2 Launch Sites and Uncover the target of Operation Kraken.' },
  { id: 'med_krakensleeps', cat: '15: Campaign & Objective Medals', name: 'The Kraken Sleeps', type: 'Trophy', plat: true, desc: 'Stop Operation Kraken and sink its deadly fleet.' },
  { id: 'med_liberte', cat: '15: Campaign & Objective Medals', name: 'Liberté', type: 'Trophy', plat: true, desc: 'Complete the campaign.' },
  { id: 'med_bestofbest', cat: '15: Campaign & Objective Medals', name: 'Best of the Best', type: 'Trophy', plat: true, desc: 'Complete the entire campaign on Authentic difficulty.' },
  { id: 'med_climbing_ladder', cat: '15: Campaign & Objective Medals', name: 'Climbing the Ladder', type: 'Trophy', plat: true, desc: 'Reach rank 40.', target: 40 },
  { id: 'med_nostone', cat: '15: Campaign & Objective Medals', name: 'No Stone Unturned', type: 'Trophy', plat: true, desc: 'Complete 16 optional objectives.', target: 16 },
  { id: 'med_opposing_force', cat: '15: Campaign & Objective Medals', name: 'Opposing Force', type: 'Trophy', plat: true, desc: 'Win one Axis Invasion as an Invader.' },
  { id: 'med_enemy_gates', cat: '15: Campaign & Objective Medals', name: 'Enemy at the Gates', type: 'Trophy', plat: true, desc: 'Defeat an invading Sniper Jager.' },
  { id: 'med_fields_glory', cat: '15: Campaign & Objective Medals', name: 'Fields of Glory', type: 'Trophy', plat: true, desc: 'Play one team-based PVP match.' },
  { id: 'med_fleshwound', cat: '15: Campaign & Objective Medals', name: 'Just a Flesh Wound', type: 'Trophy', plat: true, desc: 'Complete a mission, excluding Loose Ends, in any difficulty without healing.' },
  { id: 'med_buffrightout', cat: '15: Campaign & Objective Medals', name: 'It\'ll Buff Right Out', type: 'Trophy', plat: true, desc: 'Destroy Möller\'s shiny new car.' },
  { id: 'med_locomotion', cat: '15: Campaign & Objective Medals', name: 'Locomotion Commotion', type: 'Trophy', plat: true, desc: 'In Martressac, create an accident that destroys the train in the storage area.' },
  { id: 'med_upclose', cat: '15: Campaign & Objective Medals', name: 'Up Close and Personal', type: 'Trophy', plat: true, desc: 'Melee takedown each one of the three snipers guarding the bridge.' },
  { id: 'med_roadrage', cat: '15: Campaign & Objective Medals', name: 'Road Rage', type: 'Trophy', plat: true, desc: 'In Secret Weapons, find and destroy one of each type of vehicle present.' },
  { id: 'med_dontbreath', cat: '15: Campaign & Objective Medals', name: 'Don\'t hold your breath', type: 'Trophy', plat: true, desc: 'Make the final shot in St Nazaire without using Empty Lung.' },
  { id: 'med_brainsop', cat: '15: Campaign & Objective Medals', name: 'Brains of the Operation', type: 'Trophy', plat: true, desc: 'Kill Möller with a headshot.' },
  { id: 'med_sightbeyond', cat: '15: Campaign & Objective Medals', name: 'Sight Beyond Sights', type: 'Trophy', plat: true, desc: 'Kill Möller with a rifle, while in Iron Sights.' },
  { id: 'med_cantoutrun', cat: '15: Campaign & Objective Medals', name: 'Can\'t Outrun A Bullet', type: 'Trophy', plat: true, desc: 'Kill Möller with a rifle at a distance of 600 meters or more.', target: 600, isLongShot: true },
  { id: 'med_shoot_moon', cat: '15: Campaign & Objective Medals', name: 'Shoot for the Moon', type: 'Trophy', plat: true, desc: 'Complete three Survival missions.', target: 3 },

  // --- Combat & Weapon PSN Trophies ---
  { id: 'med_organgrinder', cat: '16: Combat Medals', name: 'Organ Grinder', type: 'Trophy', plat: true, desc: 'Hit every organ at least once with a rifle.', target: 8 },
  { id: 'med_strategist', cat: '16: Combat Medals', name: 'Strategist', type: 'Trophy', plat: true, desc: 'Make a tank shoot and destroy another enemy vehicle.' },
  { id: 'med_gunslinger', cat: '16: Combat Medals', name: 'Gunslinger', type: 'Trophy', plat: true, desc: 'Kill 150 enemies with a Pistol.', target: 150 },
  { id: 'med_skirmisher', cat: '16: Combat Medals', name: 'Skirmisher', type: 'Trophy', plat: true, desc: 'Kill 300 enemies with a Secondary Weapon.', target: 300 },
  { id: 'med_sharpshooter', cat: '16: Combat Medals', name: 'Sharpshooter', type: 'Trophy', plat: true, desc: 'Kill 350 enemies with a Rifle.', target: 350 },
  { id: 'med_longgame', cat: '16: Combat Medals', name: 'The Long Game', type: 'Trophy', plat: true, desc: 'Total kill distance of 100,000 meters.', target: 100000 },
  { id: 'med_seteablaze', cat: '16: Combat Medals', name: 'Set Europe Ablaze', type: 'Trophy', plat: true, desc: 'Kill 50 enemies with traps.', target: 50 },
  { id: 'med_ironprecision', cat: '16: Combat Medals', name: 'Precision Is Key', type: 'Trophy', plat: true, desc: 'Kill 150 enemies with any weapon while in Iron Sights.', target: 150 },
  { id: 'med_outofscope', cat: '16: Combat Medals', name: 'Out of Scope', type: 'Trophy', plat: true, desc: 'Kill 150 enemies with a rifle while in Iron Sights.', target: 150 },
  { id: 'med_riggedtoblow', cat: '16: Combat Medals', name: 'Rigged to Blow', type: 'Trophy', plat: true, desc: 'Kill 20 soldiers using booby traps.', target: 20 },
  { id: 'med_littlefriend', cat: '16: Combat Medals', name: 'My Little Friend', type: 'Trophy', plat: true, desc: 'Kill 50 soldiers with heavy weapons.', target: 50 },
  { id: 'med_explodeeffic', cat: '16: Combat Medals', name: 'Explosive Efficiency', type: 'Trophy', plat: true, desc: 'Kill 3 on-foot soldiers with one grenade.' },
  { id: 'med_lordofwar', cat: '16: Combat Medals', name: 'Lord of War', type: 'Trophy', plat: true, desc: 'Get a kill with 20 different weapons.', target: 20 },
  { id: 'med_nutcracker', cat: '16: Combat Medals', name: 'Die Nussknacker Sweet!', type: 'Trophy', plat: true, desc: 'Get a testicle shot with a rifle from a distance of 100 meters or more.' },
  { id: 'med_resourceful', cat: '16: Combat Medals', name: 'Resourceful', type: 'Trophy', plat: true, desc: 'Kill 50 enemy soldiers with Found Weapons.', target: 50 },
  { id: 'med_dergeist', cat: '16: Combat Medals', name: 'Der Geist', type: 'Trophy', plat: true, desc: 'Achieve 250 ghost kills.', target: 250 },
  { id: 'med_quietmouse', cat: '16: Combat Medals', name: 'As Quiet as a Mouse', type: 'Trophy', plat: true, desc: 'Kill 50 enemies during a Sound Mask.', target: 50 },
  { id: 'med_closequarters', cat: '16: Combat Medals', name: 'Close Quarters', type: 'Trophy', plat: true, desc: 'Perform 100 lethal takedowns.', target: 100 },
  { id: 'med_snaketallgrass', cat: '16: Combat Medals', name: 'Snake in the Grass', type: 'Trophy', plat: true, desc: 'While in Tall Grass, kill 50 soldiers.', target: 50 },

  // --- Collectible Full Sets PSN Trophies ---
  { id: 'med_fromparis_love', cat: '16: Combat Medals', name: 'From Paris with Love', type: 'Trophy', plat: true, desc: 'Collect 41 Personal letters.', target: 41 },
  { id: 'med_burn_after_reading', cat: '16: Combat Medals', name: 'Burn after reading', type: 'Trophy', plat: true, desc: 'Collect 39 classified documents.', target: 39 },
  { id: 'med_souvenir_hunter', cat: '16: Combat Medals', name: 'Souvenir hunter', type: 'Trophy', plat: true, desc: 'Collect 24 Hidden Items.', target: 24 },
  { id: 'med_eagle_eyed', cat: '16: Combat Medals', name: 'Eagle Eyed', type: 'Trophy', plat: true, desc: 'Destroy 24 Dead-eye Targets.', target: 24 },
  { id: 'med_tinkerer', cat: '16: Combat Medals', name: 'Tinkerer', type: 'Trophy', plat: true, desc: 'Interact with 24 workbenches.', target: 24 },

  // --- Weapon Mastery PSN Trophies ---
  { id: 'med_masterpistols', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Pistols', type: 'Trophy', plat: true, desc: 'Obtain six pistol-related mastery medals.', target: 6 },
  { id: 'med_mastersecond', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Secondaries', type: 'Trophy', plat: true, desc: 'Obtain six secondary-related mastery medals.', target: 6 },
  { id: 'med_masterrifles', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Rifles', type: 'Trophy', plat: true, desc: 'Obtain six rifle-related mastery medals.', target: 6 },
  { id: 'med_masteratarms', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master-at-arms', type: 'Trophy', plat: true, desc: 'Become the Master of each weapon.', target: 3 },

  // --- DLC 1: Wolf Mountain PSN Trophies ---
  { id: 'med_wm_fuhrerious', cat: '10: Wolf Mountain (DLC)', name: 'Führerious Repetition', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Kill Hitler 5 times.', target: 5 },
  { id: 'med_reichtopoint', cat: '10: Wolf Mountain (DLC)', name: 'Reich To The Point', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Kill only Hitler and exfiltrate.' },
  { id: 'med_wm_fromfuhrer', cat: '10: Wolf Mountain (DLC)', name: 'From Führer Away', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Kill Hitler at a distance of 300 meters or more.', target: 300, isLongShot: true },
  { id: 'med_covertelim', cat: '10: Wolf Mountain (DLC)', name: 'Covert Elimination', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Kill Hitler and exfiltrate without ever being detected.' },
  { id: 'med_wm_alpha', cat: '10: Wolf Mountain (DLC)', name: 'Alpha', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Complete the mission on Authentic difficulty.' },
  { id: 'med_wm_herrtoday', cat: '10: Wolf Mountain (DLC)', name: 'Herr Today, Gone Tomorrow', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Complete the mission.' },
  { id: 'med_wm_opfoxley', cat: '10: Wolf Mountain (DLC)', name: 'Operation Foxley', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Complete the mission with a 2 star rating.', target: 2 },
  { id: 'med_wm_familienjuwel', cat: '10: Wolf Mountain (DLC)', name: 'Das Familienjuwel', type: 'Trophy', plat: true, desc: 'Wolf Mountain - Kill Hitler with a testicle shot.' },

  // --- DLC 2: Landing Force PSN Trophies ---
  { id: 'med_lastresort', cat: '11: Landing Force (DLC)', name: 'Last Resort', type: 'Trophy', plat: true, desc: 'Complete the campaign mission - Landing Force.' },

  // --- DLC 3: Conqueror PSN Trophies ---
  { id: 'med_siegebreaker', cat: '12: Conqueror (DLC)', name: 'Siegebreaker', type: 'Trophy', plat: true, desc: 'Complete the campaign mission - Conqueror.' },
  { id: 'med_ghostoffalaise', cat: '12: Conqueror (DLC)', name: 'Ghost of Falaise', type: 'Trophy', plat: true, desc: 'Conqueror - Complete the mission with a 2 star rating.', target: 2 },
  { id: 'med_opoverlord', cat: '12: Conqueror (DLC)', name: 'Operation Overlord', type: 'Trophy', plat: true, desc: 'Conqueror - Complete the mission on Authentic difficulty.' },

  // --- DLC 4: Rough Landing PSN Trophies ---
  { id: 'med_m13_woods', cat: '13: Rough Landing (DLC)', name: 'If You Go Down To The Woods Today', type: 'Trophy', plat: true, desc: 'Complete the campaign mission - Rough Landing.' },
  { id: 'med_m13_fightanother', cat: '13: Rough Landing (DLC)', name: 'Fight Another Day', type: 'Trophy', plat: true, desc: 'Rough Landing - Complete the mission with a 2 star rating.', target: 2 },
  { id: 'med_m13_stroll', cat: '13: Rough Landing (DLC)', name: 'Stroll in the Woods', type: 'Trophy', plat: true, desc: 'Rough Landing - Complete the mission on Authentic difficulty.' },

  // --- DLC 5: Kraken Awakes PSN Trophies ---
  { id: 'med_m14_shipbreaker', cat: '14: Kraken Awakes (DLC)', name: 'Shipbreaker', type: 'Trophy', plat: true, desc: 'Complete the campaign mission - Kraken Awakes.' },
  { id: 'med_m14_sinkorswim', cat: '14: Kraken Awakes (DLC)', name: 'Sink or Swim', type: 'Trophy', plat: true, desc: 'Kraken Awakes - Complete the mission with a 2 star rating.', target: 2 },
  { id: 'med_m14_goingover', cat: '14: Kraken Awakes (DLC)', name: 'Going Overboard', type: 'Trophy', plat: true, desc: 'Kraken Awakes - Complete the mission on Authentic difficulty.' }
];

/* ----------------------------------------------------
 * SECTION 4: Application State & Synchronizer
 * ---------------------------------------------------- */
const appState = {
  activeGamertag: localStorage.getItem('pinned_device_user') || localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
  platform: 'playstation',
  activeMission: '1: The Atlantic Wall',
  hunterData: [],
  teamProgress: {},
  collapsedSections: {},
  db: null,
  rtdb: null,
  auth: null,
  user: null,
  rtdbTrophyRef: null,
  unsubListeners: [],
  isLoaded: false,

  applyPlayerTheme: function(gamertag) {
    const theme = USER_THEMES[gamertag] || USER_THEMES['Werewolf3788'];
    const root = document.documentElement;

    root.style.setProperty('--user-theme-accent', theme.accent);
    root.style.setProperty('--user-theme-glow', theme.accentGlow);
    root.style.setProperty('--user-theme-border', theme.border);
    root.style.setProperty('--user-theme-secondary', theme.secondary);
    root.style.setProperty('--user-theme-badge-bg', theme.badgeBg);
    root.style.setProperty('--user-theme-badge-text', theme.badgeText);
  },

  togglePinDevice: function() {
    const currentPin = localStorage.getItem('pinned_device_user');
    if (currentPin === this.activeGamertag) {
      localStorage.removeItem('pinned_device_user');
    } else {
      localStorage.setItem('pinned_device_user', this.activeGamertag);
    }
    this.updatePinButtonUI();
  },

  updatePinButtonUI: function() {
    const pinBtn = document.getElementById('pin-device-btn');
    if (!pinBtn) return;
    const isPinned = localStorage.getItem('pinned_device_user') === this.activeGamertag;
    if (isPinned) {
      pinBtn.classList.add('is-pinned');
      pinBtn.innerText = '📌 Pinned as Primary Device';
    } else {
      pinBtn.classList.remove('is-pinned');
      pinBtn.innerText = '📌 Pin Device to This User';
    }
  },

  renderBuildMetadata: function() {
    const el = document.getElementById("build-meta-footer");
    if (el) {
      el.textContent = `Sniper Elite 5 Tactical Engine • v${BUILD_VERSION} • Build: ${CODE_BUILD_DATE}`;
      el.style.display = 'block';
    }
  },

  init: async function() {
    this.hunterData = sniperData.map(item => ({
      ...item,
      collected: false,
      count: 0
    }));

    ALL_OPERATIVES.forEach(op => {
      this.teamProgress[op] = [];
    });

    const cats = [...new Set(this.hunterData.map(i => i.cat))];
    cats.forEach(cat => {
      const sid = cat.replace(/[^a-z0-9]/gi, '');
      this.collapsedSections[sid] = (cat !== this.activeMission);
    });

    this.applyPlayerTheme(this.activeGamertag);
    this.renderBuildMetadata();
    this.updatePinButtonUI();
    this.render();

    try {
      const app = initializeApp(firebaseConfig, 'SE5-Tactical-Engine');
      this.auth = getAuth(app);
      this.db = getFirestore(app);
      this.rtdb = getDatabase(app);

      await signInAnonymously(this.auth);

      onAuthStateChanged(this.auth, (u) => {
        if (u) {
          this.user = u;
          this.attachFirestoreListeners();
          this.attachPsnRtdbWatcher(this.activeGamertag);
        }
      });
    } catch (err) {
      console.warn("⚠️ Firebase connection warning:", err.message);
    }
  },

  attachPsnRtdbWatcher: function(operativeName) {
    if (!this.rtdb) return;

    if (this.rtdbTrophyRef) {
      off(this.rtdbTrophyRef);
      this.rtdbTrophyRef = null;
    }

    const psnTag = USER_PSN_MAP[operativeName];
    if (!psnTag) return;

    const liveTrophyPath = `psn/gamertags/${psnTag}/liveTrophyProgress/${NPWR_ID}`;
    this.rtdbTrophyRef = rtdbRef(this.rtdb, liveTrophyPath);

    onValue(this.rtdbTrophyRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const trophyPayload = snapshot.val();
      this.processPsnTrophyPayload(operativeName, trophyPayload);
    }, (error) => {
      console.warn(`[RTDB Sync] Trophy listener notice for ${psnTag}:`, error.message);
    });
  },

  processPsnTrophyPayload: function(operativeName, trophyPayload) {
    if (!trophyPayload) return;

    let hasChanges = false;
    let opSaved = this.teamProgress[operativeName] || [];

    const trophyList = Array.isArray(trophyPayload)
      ? trophyPayload
      : (trophyPayload.trophies || Object.values(trophyPayload));

    trophyList.forEach(t => {
      if (!t) return;
      const trophyTitle = t.trophyName || t.name || t.title;
      const matchedTrackerId = PSN_TROPHY_MAPPINGS[trophyTitle] || (t.trophyId !== undefined ? PSN_TROPHY_MAPPINGS[t.trophyId] : null);

      if (matchedTrackerId) {
        let existing = opSaved.find(s => s.id === matchedTrackerId);
        const itemDef = sniperData.find(d => d.id === matchedTrackerId);
        const targetValue = (itemDef && itemDef.target) ? itemDef.target : 1;

        const psnProgressVal = t.currentValue !== undefined
          ? parseInt(t.currentValue, 10)
          : (t.trophyProgress !== undefined
              ? parseInt(t.trophyProgress, 10)
              : (t.progress !== undefined ? parseInt(t.progress, 10) : 0));

        const isEarned = (t.earned === true || t.earned === 1 || t.unlocked === true || t.isEarned === true || (targetValue > 1 && psnProgressVal >= targetValue));

        if (existing) {
          let updatedCount = existing.count || 0;
          let updatedCollected = existing.collected || isEarned;

          if (psnProgressVal > updatedCount) updatedCount = psnProgressVal;
          if (isEarned && updatedCount < targetValue) updatedCount = targetValue;
          if (updatedCount >= targetValue) updatedCollected = true;

          if (existing.count !== updatedCount || existing.collected !== updatedCollected) {
            existing.count = updatedCount;
            existing.collected = updatedCollected;
            hasChanges = true;
          }
        } else {
          const finalCount = isEarned ? targetValue : psnProgressVal;
          opSaved.push({
            id: matchedTrackerId,
            collected: isEarned || (finalCount >= targetValue),
            count: finalCount
          });
          hasChanges = true;
        }

        if (operativeName === this.activeGamertag) {
          const currentItem = this.hunterData.find(i => i.id === matchedTrackerId);
          if (currentItem) {
            const savedItem = opSaved.find(s => s.id === matchedTrackerId);
            if (savedItem) {
              currentItem.collected = savedItem.collected;
              currentItem.count = savedItem.count;
            }
          }
        }
      }
    });

    if (hasChanges) {
      this.teamProgress[operativeName] = opSaved;
      this.render();
      if (operativeName === this.activeGamertag) {
        this.sync();
      }
    }
  },

  attachFirestoreListeners: function() {
    this.unsubListeners.forEach(u => u());
    this.unsubListeners = [];

    ALL_OPERATIVES.forEach(op => {
      const path = `users/${op}/platform/${this.platform}/progress/sniper-elite-5`;
      const docRef = doc(this.db, path);

      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const docData = snap.data();
          const remoteSaved = docData.progress || [];
          this.teamProgress[op] = remoteSaved;

          if (op === this.activeGamertag) {
            this.hunterData = sniperData.map(item => {
              const status = remoteSaved.find(s => s.id === item.id);
              return {
                ...item,
                collected: status ? !!status.collected : false,
                count: status && status.count !== undefined ? Number(status.count) : 0
              };
            });
          }
        }
        this.isLoaded = true;
        this.render();
      }, (err) => {
        console.warn(`Firestore snapshot warning for ${op}:`, err.message);
      });

      this.unsubListeners.push(unsub);
    });
  },

  switchHunter: function(gamertag) {
    this.activeGamertag = gamertag;
    localStorage.setItem('active_gaming_nickname', gamertag);

    this.applyPlayerTheme(gamertag);
    this.updatePinButtonUI();
    this.attachPsnRtdbWatcher(gamertag);

    const currentSaved = this.teamProgress[gamertag] || [];
    this.hunterData = sniperData.map(item => {
      const status = currentSaved.find(s => s.id === item.id);
      return {
        ...item,
        collected: status ? !!status.collected : false,
        count: status && status.count !== undefined ? Number(status.count) : 0
      };
    });

    this.render();
  },

  render: function() {
    const container = document.getElementById('section-container');
    if (!container) return;

    container.innerHTML = '';
    const cats = [...new Set(this.hunterData.map(i => i.cat))];
    let totalFound = 0;

    cats.forEach(cat => {
      const items = this.hunterData.filter(i => i.cat === cat);
      const count = items.filter(i => i.collected).length;
      totalFound += count;

      const sid = cat.replace(/[^a-z0-9]/gi, '');
      const catPercent = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
      const isCollapsed = this.collapsedSections[sid] !== false;

      const section = document.createElement('div');
      section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
      section.id = `section-${sid}`;

      section.innerHTML = `
        <div class="category-header" onclick="appState.toggleSection('${sid}')" style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; cursor:pointer; user-select:none; background:rgba(30,41,59,0.4); border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 style="font-size:1.1rem; font-weight:800; color:#fff;">${cat}</h2>
          </div>
          <div style="font-weight:900; font-size:0.85rem; color:var(--user-theme-accent); font-family:monospace;">${count}/${items.length} (${catPercent}%)</div>
        </div>
        <div class="section-content" style="padding:16px;">
          <div class="trophy-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px;"></div>
        </div>
      `;

      const grid = section.querySelector('.trophy-grid');
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = `trophy-card ${item.collected ? 'completed' : ''}`;
        card.style.cssText = "background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;";

        const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

        // Badges: Auto-sync indicator (PSN) vs Manual
        const syncBadge = item.plat === true
          ? `<span class="sync-badge sync-badge-psn" style="background:rgba(234,179,8,0.2); color:#facc15; border:1px solid rgba(234,179,8,0.4); font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">🏆 PSN Auto-Sync</span>`
          : `<span class="sync-badge sync-badge-manual" style="background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.25); font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">📝 Manual Entry</span>`;

        let actionControl = '';
        if (item.target && item.target > 1) {
          actionControl = `
            <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
              <button type="button" style="background:#1e293b; color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; border:none; cursor:pointer;" onclick="appState.stepCount('${item.id}', -1)">-</button>
              <span style="font-family:monospace; font-weight:bold; font-size:0.9rem; color:var(--user-theme-accent);">${item.count || 0} / ${item.target}</span>
              <button type="button" style="background:#1e293b; color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; border:none; cursor:pointer;" onclick="appState.stepCount('${item.id}', 1)">+</button>
            </div>
          `;
        } else {
          actionControl = `
            <button type="button" onclick="appState.toggleItem('${item.id}')" style="width:100%; margin-top:10px; padding:8px 12px; border-radius:6px; font-weight:700; font-size:0.8rem; cursor:pointer; background:${item.collected ? 'var(--user-theme-badge-bg)' : '#1e293b'}; color:${item.collected ? 'var(--user-theme-badge-text)' : '#fff'}; border:1px solid rgba(255,255,255,0.15);">
              ${item.collected ? 'Audit Verified (Undo)' : 'Mark Harvested'}
            </button>
          `;
        }

        card.innerHTML = `
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <img src="${iconUrl}" style="width:32px; height:32px; border-radius:6px; object-fit:cover;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; gap:6px; align-items:center;">
                  <span style="font-size:0.65rem; font-weight:bold; text-transform:uppercase; color:#94a3b8;">${item.type}</span>
                  ${syncBadge}
                </div>
                <div style="font-weight:bold; font-size:0.9rem; color:#fff;">${item.name}</div>
              </div>
            </div>
            <p style="font-size:0.75rem; color:#cbd5e1; font-style:italic; margin-bottom:10px;">${item.desc}</p>
          </div>
          ${actionControl}
        `;

        grid.appendChild(card);
      });

      container.appendChild(section);
    });

    const overallPercent = Math.round((totalFound / this.hunterData.length) * 100) || 0;
    const bar = document.getElementById('overall-bar');
    const pct = document.getElementById('percent-text');
    if (bar) {
      bar.style.width = `${overallPercent}%`;
      bar.style.backgroundColor = 'var(--user-theme-accent)';
    }
    if (pct) {
      pct.innerText = `Master Completion Progress: ${overallPercent}% (${this.activeGamertag})`;
    }
  },

  stepCount: function(id, delta) {
    const item = this.hunterData.find(i => i.id === id);
    if (!item) return;
    const current = item.count || 0;
    item.count = Math.max(0, current + delta);
    if (item.target) {
      item.collected = item.count >= item.target;
    }
    this.render();
    this.sync();
  },

  toggleItem: function(id) {
    const item = this.hunterData.find(i => i.id === id);
    if (!item) return;
    item.collected = !item.collected;
    if (item.collected && item.target) item.count = item.target;
    if (!item.collected && item.target) item.count = 0;
    this.render();
    this.sync();
  },

  toggleSection: function(sid) {
    this.collapsedSections[sid] = !this.collapsedSections[sid];
    this.render();
  },

  sync: async function() {
    if (!this.db || !this.auth || !this.auth.currentUser) return;
    try {
      const docRef = doc(this.db, 'users', this.activeGamertag, 'platform', this.platform, 'progress', GAME_ID);
      const payload = {
        activeMission: this.activeMission,
        gameId: GAME_ID,
        lastUpdate: Date.now(),
        platform: this.platform,
        progress: this.hunterData.map(i => ({ id: i.id, collected: i.collected, count: i.count || 0 }))
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn("Firestore save warning:", e.message);
    }
  }
};

window.appState = appState;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => appState.init());
} else {
  appState.init();
}
