/* ============================================================================
 * File: tracker.js
 * Project: entertainment-71888
 * Version: v8.4.0-SE5-CLOUD-AUTHORITATIVE
 * Deployment Timestamp: 2026-09-23 20:25:00 EDT (America/New_York)
 * PSN Communication ID: NPWR21465_00
 * Firestore Path: users/{gamertag}/platform/playstation/progress/sniper-elite-5
 * RTDB Path: psn/gamertags/{psn_id}/liveTrophyProgress/NPWR21465_00
 * Analytics: G-CTYHDF4MSD
 * ============================================================================ */

import { initializeApp } from '//www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from '//www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from '//www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, onValue } from '//www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

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

const PSN_COMMUNICATION_ID = 'NPWR21465_00';
const ALL_OPERATIVES = ['Werewolf3788', 'Raymystyro', 'Terrdog', 'Elu Cloud'];

const PSN_ACCOUNT_MAPPINGS = {
  'WildHorse_Spirit': 'Werewolf3788',
  'wildhorse_spirit': 'Werewolf3788',
  'OneLIVIDMAN': 'Raymystyro',
  'onelividman': 'Raymystyro',
  'Darkwing69420': 'Terrdog',
  'darkwing69420': 'Terrdog',
  'DesdemonaTiger': 'Elu Cloud',
  'desdemonatiger': 'Elu Cloud'
};

const OPERATIVE_ALIASES = {
  'Werewolf3788': ['Werewolf3788', 'wildhorse_spirit', 'WildHorse_Spirit'],
  'Raymystyro': ['Raymystyro', 'OneLIVIDMAN', 'onelividman'],
  'Terrdog': ['Terrdog', 'Darkwing69420', 'darkwing69420'],
  'Elu Cloud': ['Elu Cloud', 'DesdemonaTiger', 'desdemonatiger']
};

const userThemes = {
  'Werewolf3788': { color: '#ff8800', glow: 'rgba(255, 136, 0, 0.6)' },
  'Raymystyro': { color: '#ff4444', glow: 'rgba(255, 68, 68, 0.6)' },
  'Terrdog': { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
  'Elu Cloud': { color: '#00ccff', glow: 'rgba(0, 204, 255, 0.6)' }
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

function normalizeString(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/* === SECTION 2: Complete PSN Trophy Mapping (NPWR21465_00) === */
const PSN_TROPHY_MAPPINGS_RAW = {
  // Platinum & Campaign Completion
  'Sniper Elite': 'trophy_sniper_elite_plat',
  'Meeting Resistance': 'trophy_meeting_resistance',
  'Confirming Suspicions': 'trophy_confirming_suspicions',
  'The Kraken Wakes': 'trophy_the_kraken_wakes',
  "It's Starting to Crack": 'trophy_starting_to_crack',
  'Change the Channel': 'trophy_change_channel',
  'Taking it back': 'trophy_taking_it_back',
  'Target America': 'trophy_target_america',
  'The Kraken Sleeps': 'trophy_kraken_sleeps',
  "Can't Outrun A Bullet": 'med_cantoutrun',
  'Climbing the Ladder': 'trophy_climbing_ladder',
  'Liberté': 'med_liberte',
  'Best of the Best': 'med_bestofbest',
  'No Stone Unturned': 'med_nostone',
  'Opposing Force': 'trophy_opposing_force',
  'Enemy at the Gates': 'trophy_enemy_at_gates',
  'Fields of Glory': 'trophy_fields_of_glory',
  'Just a Flesh Wound': 'med_fleshwound',
  'Organ Grinder': 'med_organgrinder',
  'Strategist': 'med_strategist',
  'Master of Pistols': 'med_masterpistols',
  'Master of Secondaries': 'med_mastersecond',
  'Master of Rifles': 'med_masterrifles',
  'Master-at-arms': 'med_masteratarms',
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
  'From Paris with Love': 'trophy_from_paris_with_love',
  'Burn after reading': 'trophy_burn_after_reading',
  'Souvenir hunter': 'trophy_souvenir_hunter',
  'Eagle Eyed': 'trophy_eagle_eyed',
  'Tinkerer': 'trophy_tinkerer',
  "It'll Buff Right Out": 'med_buffrightout',
  'Locomotion Commotion': 'med_locomotion',
  'Up Close and Personal': 'med_upclose',
  'Road Rage': 'med_roadrage',
  "Don't hold your breath": 'med_dontbreath',
  'Brains of the Operation': 'med_brainsop',
  'Sight Beyond Sights': 'med_sightbeyond',
  'Shoot for the Moon': 'trophy_shoot_for_moon',

  // DLC 1: Wolf Mountain
  'Führerious Repetition': 'trophy_dlc1_fuhrerious',
  'Reich To The Point': 'trophy_dlc1_reich_to_point',
  'From Führer Away': 'trophy_dlc1_from_fuhrer_away',
  'Covert Elimination': 'trophy_dlc1_covert_elim',
  'Alpha': 'trophy_dlc1_alpha',
  'Herr Today, Gone Tomorrow': 'trophy_dlc1_herr_today',
  'Operation Foxley': 'trophy_dlc1_op_foxley',
  'Das Familienjuwel': 'trophy_dlc1_familienjuwel',

  // DLC 2: Landing Force
  'Last Resort': 'trophy_dlc2_last_resort',

  // DLC 3: Conqueror
  'Siegebreaker': 'trophy_dlc3_siegebreaker',
  'Ghost of Falaise': 'trophy_dlc3_ghost_falaise',
  'Operation Overlord': 'trophy_dlc3_op_overlord',

  // DLC 4: Rough Landing
  'If You Go Down To The Woods Today': 'trophy_dlc4_woods_today',
  'Fight Another Day': 'trophy_dlc4_fight_another',
  'Stroll in the Woods': 'trophy_dlc4_stroll_woods',

  // DLC 5: Kraken Awakes
  'Shipbreaker': 'trophy_dlc5_shipbreaker',
  'Sink or Swim': 'trophy_dlc5_sink_or_swim',
  'Going Overboard': 'trophy_dlc5_going_overboard'
};

const PSN_TROPHY_MAPPINGS = {};
Object.entries(PSN_TROPHY_MAPPINGS_RAW).forEach(([rawName, trackerId]) => {
  PSN_TROPHY_MAPPINGS[normalizeString(rawName)] = trackerId;
});

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

function getTierStatus(percent) {
  if (percent >= 100) return { tier: 'Gold', icon: '🥇', label: 'GOLD TIER', color: '#ffd700', style: 'background: rgba(255, 215, 0, 0.2); color: #ffd700; border: 1px solid #ffd700;' };
  if (percent >= 50) return { tier: 'Silver', icon: '🥈', label: 'SILVER TIER', color: '#c0c0c0', style: 'background: rgba(192, 192, 192, 0.2); color: #e0e0e0; border: 1px solid #c0c0c0;' };
  if (percent >= 25) return { tier: 'Bronze', icon: '🥉', label: 'BRONZE TIER', color: '#cd7f32', style: 'background: rgba(205, 127, 50, 0.2); color: #e59866; border: 1px solid #cd7f32;' };
  return { tier: 'None', icon: '⚪', label: 'IN PROGRESS', color: '#888888', style: 'background: rgba(255, 255, 255, 0.08); color: #aaa; border: 1px solid rgba(255,255,255,0.15);' };
}

function getLongShotHeatmapStyle(val, minVal, maxVal) {
  const current = Number(val) || 0;
  const targetMax = Math.max(Number(maxVal) || 1, 1);
  const targetMin = Math.max(Number(minVal) || 0, 0);

  let ratio = 0;
  if (targetMax > targetMin) {
    ratio = (current - targetMin) / (targetMax - targetMin);
  } else if (current > 0) {
    ratio = 1;
  }
  ratio = Math.max(0, Math.min(1, ratio));

  const r = Math.round(239 + (34 - 239) * ratio);
  const g = Math.round(68 + (197 - 68) * ratio);
  const b = Math.round(68 + (94 - 68) * ratio);

  return {
    color: `rgb(${r}, ${g}, ${b})`,
    background: `rgba(${r}, ${g}, ${b}, 0.22)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.85)`
  };
}

/* === SECTION 3: Complete Sniper Elite 5 Dataset === */
const sniperData = [
  // --- Mission 1: The Atlantic Wall ---
  { id: 'trophy_meeting_resistance', cat: '1: The Atlantic Wall', name: 'Meeting Resistance', type: 'Trophy', desc: 'PSN Trophy: Weaken the Atlantic wall and rendezvous with Blue Viper.' },
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
  { id: 'trophy_confirming_suspicions', cat: '2: Occupied Residence', name: 'Confirming Suspicions', type: 'Trophy', desc: 'PSN Trophy: Raid Chateau de Berengar and Möller\'s Office.' },
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

  // --- Story Mission Trophies ---
  { id: 'trophy_the_kraken_wakes', cat: '3: Spy Academy', name: 'The Kraken Wakes', type: 'Trophy', desc: 'PSN Trophy: Infiltrate Beaumont-Saint-Denis and Uncover Operation Kraken.' },
  { id: 'trophy_starting_to_crack', cat: '4: War Factory', name: "It's Starting to Crack", type: 'Trophy', desc: 'PSN Trophy: Destroy Operation Kraken\'s production facility at Martressac.' },
  { id: 'trophy_change_channel', cat: '5: Festung Guernsey', name: 'Change the Channel', type: 'Trophy', desc: 'PSN Trophy: Destroy the Prototype Stealth U-Boat hidden in Festung Guernsey.' },
  { id: 'trophy_taking_it_back', cat: '6: Libération', name: 'Taking it back', type: 'Trophy', desc: 'PSN Trophy: Liberate Desponts-sur-Douve and secure Allied transport routes.' },
  { id: 'trophy_target_america', cat: '7: Secret Weapons', name: 'Target America', type: 'Trophy', desc: 'PSN Trophy: Destroy the V2 Launch Sites and Uncover the target of Operation Kraken.' },
  { id: 'trophy_kraken_sleeps', cat: '8: Rubble and Ruin', name: 'The Kraken Sleeps', type: 'Trophy', desc: 'PSN Trophy: Stop Operation Kraken and sink its deadly fleet.' },

  // --- Overall Campaign & Combat PSN Trophies ---
  { id: 'trophy_sniper_elite_plat', cat: '15: Campaign & Objective Medals', name: 'Sniper Elite', type: 'Trophy', desc: 'PSN Platinum Trophy: Obtain all Trophies.' },
  { id: 'trophy_climbing_ladder', cat: '15: Campaign & Objective Medals', name: 'Climbing the Ladder', type: 'Trophy', desc: 'PSN Trophy: Reach rank 40.', target: 40 },
  { id: 'med_liberte', cat: '15: Campaign & Objective Medals', name: 'Liberté', type: 'Medal', desc: 'Complete campaign across all tiers.' },
  { id: 'med_bestofbest', cat: '15: Campaign & Objective Medals', name: 'Best of the Best', type: 'Medal', desc: 'Complete entire campaign on Authentic difficulty.' },
  { id: 'med_nostone', cat: '15: Campaign & Objective Medals', name: 'No Stone Unturned', type: 'Medal', desc: 'Complete 16 campaign optional objectives.', target: 16 },
  { id: 'med_fleshwound', cat: '15: Campaign & Objective Medals', name: 'Just a Flesh Wound', type: 'Medal', desc: 'Complete a mission without healing.' },
  { id: 'med_cantoutrun', cat: '15: Campaign & Objective Medals', name: 'Can\'t Outrun A Bullet', type: 'Medal', desc: 'Kill Möller with a rifle at 600m+ (Mission 9).', target: 600, isLongShot: true },
  { id: 'trophy_from_paris_with_love', cat: '15: Campaign & Objective Medals', name: 'From Paris with Love', type: 'Trophy', desc: 'Collect 41 Personal Letters.', target: 41 },
  { id: 'trophy_burn_after_reading', cat: '15: Campaign & Objective Medals', name: 'Burn after reading', type: 'Trophy', desc: 'Collect 39 classified documents.', target: 39 },
  { id: 'trophy_souvenir_hunter', cat: '15: Campaign & Objective Medals', name: 'Souvenir hunter', type: 'Trophy', desc: 'Collect 24 Hidden Items.', target: 24 },
  { id: 'trophy_eagle_eyed', cat: '15: Campaign & Objective Medals', name: 'Eagle Eyed', type: 'Trophy', desc: 'Destroy 24 Dead-eye Targets.', target: 24 },
  { id: 'trophy_tinkerer', cat: '15: Campaign & Objective Medals', name: 'Tinkerer', type: 'Trophy', desc: 'Interact with 24 workbenches.', target: 24 },
  { id: 'med_buffrightout', cat: '15: Campaign & Objective Medals', name: "It'll Buff Right Out", type: 'Medal', desc: 'Destroy Möller\'s shiny new car.' },
  { id: 'med_locomotion', cat: '15: Campaign & Objective Medals', name: 'Locomotion Commotion', type: 'Medal', desc: 'In Martressac, create an accident that destroys the train.' },
  { id: 'med_upclose', cat: '15: Campaign & Objective Medals', name: 'Up Close and Personal', type: 'Medal', desc: 'Takedown 3 snipers guarding bridge.' },
  { id: 'med_roadrage', cat: '15: Campaign & Objective Medals', name: 'Road Rage', type: 'Medal', desc: 'In Secret Weapons, destroy one of each vehicle type.' },
  { id: 'med_dontbreath', cat: '15: Campaign & Objective Medals', name: "Don't hold your breath", type: 'Medal', desc: 'Make final shot without Empty Lung.' },
  { id: 'med_brainsop', cat: '15: Campaign & Objective Medals', name: 'Brains of the Operation', type: 'Medal', desc: 'Kill Möller with a headshot.' },
  { id: 'med_sightbeyond', cat: '15: Campaign & Objective Medals', name: 'Sight Beyond Sights', type: 'Medal', desc: 'Kill Möller with a rifle in Iron Sights.' },
  { id: 'trophy_shoot_for_moon', cat: '15: Campaign & Objective Medals', name: 'Shoot for the Moon', type: 'Trophy', desc: 'Complete three Survival missions.', target: 3 },
  { id: 'trophy_opposing_force', cat: '15: Campaign & Objective Medals', name: 'Opposing Force', type: 'Trophy', desc: 'Win one Axis Invasion as an Invader.' },
  { id: 'trophy_enemy_at_gates', cat: '15: Campaign & Objective Medals', name: 'Enemy at the Gates', type: 'Trophy', desc: 'Defeat an invading Sniper Jager.' },
  { id: 'trophy_fields_of_glory', cat: '15: Campaign & Objective Medals', name: 'Fields of Glory', type: 'Trophy', desc: 'Play one team-based PVP match.' },

  // --- Category 16: Combat Medals ---
  { id: 'med_longgame', cat: '16: Combat Medals', name: 'The Long Game', type: 'Medal', desc: 'Accumulate a cumulative kill distance of 100,000 meters.', target: 100000 },
  { id: 'med_sharpshooter', cat: '16: Combat Medals', name: 'Sharpshooter', type: 'Medal', desc: 'Kill 350 enemies with a Rifle.', target: 350 },
  { id: 'med_skirmisher', cat: '16: Combat Medals', name: 'Skirmisher', type: 'Medal', desc: 'Kill 300 enemies with a Secondary Weapon.', target: 300 },
  { id: 'med_gunslinger', cat: '16: Combat Medals', name: 'Gunslinger', type: 'Medal', desc: 'Kill 150 enemies with Pistols.', target: 150 },
  { id: 'med_ironprecision', cat: '16: Combat Medals', name: 'Precision Is Key', type: 'Medal', desc: 'Kill 150 enemies with any weapon in Iron Sights.', target: 150 },
  { id: 'med_outofscope', cat: '16: Combat Medals', name: 'Out of Scope', type: 'Medal', desc: 'Kill 150 enemies with a rifle in Iron Sights.', target: 150 },
  { id: 'med_resourceful', cat: '16: Combat Medals', name: 'Resourceful', type: 'Medal', desc: 'Kill 50 enemy soldiers with Found Weapons.', target: 50 },
  { id: 'med_littlefriend', cat: '16: Combat Medals', name: 'My Little Friend', type: 'Medal', desc: 'Kill 50 soldiers with heavy weapons.', target: 50 },
  { id: 'med_lordofwar', cat: '16: Combat Medals', name: 'Lord of War', type: 'Medal', desc: 'Get a kill with 20 different weapons.', target: 20 },
  { id: 'med_organgrinder', cat: '16: Combat Medals', name: 'Organ Grinder', type: 'Medal', desc: 'Hit every organ at least once with a rifle.' },
  { id: 'med_dergeist', cat: '16: Combat Medals', name: 'Der Geist', type: 'Medal', desc: 'Achieve 250 ghost kills.', target: 250 },
  { id: 'med_quietmouse', cat: '16: Combat Medals', name: 'As Quiet as a Mouse', type: 'Medal', desc: 'Kill 50 enemies during a Sound Mask.', target: 50 },
  { id: 'med_closequarters', cat: '16: Combat Medals', name: 'Close Quarters', type: 'Medal', desc: 'Perform 100 lethal takedowns.', target: 100 },
  { id: 'med_snaketallgrass', cat: '16: Combat Medals', name: 'Snake in the Grass', type: 'Medal', desc: 'While in Tall Grass, kill 50 soldiers.', target: 50 },
  { id: 'med_seteablaze', cat: '16: Combat Medals', name: 'Set Europe Ablaze', type: 'Medal', desc: 'Kill 50 enemies with traps.', target: 50 },
  { id: 'med_riggedtoblow', cat: '16: Combat Medals', name: 'Rigged to Blow', type: 'Medal', desc: 'Kill 20 soldiers using booby traps.', target: 20 },
  { id: 'med_explodeeffic', cat: '16: Combat Medals', name: 'Explosive Efficiency', type: 'Medal', desc: 'Kill 3 on-foot soldiers with one grenade.' },
  { id: 'med_nutcracker', cat: '16: Combat Medals', name: 'Die Nussknacker Sweet!', type: 'Medal', desc: 'Testicle shot with a rifle from 100 meters or more.' },
  { id: 'med_strategist', cat: '16: Combat Medals', name: 'Strategist', type: 'Medal', desc: 'Make a tank shoot and destroy another enemy vehicle.' },

  // --- Category 17: Weapon Mastery Medals ---
  { id: 'med_masterpistols', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Pistols', type: 'Medal', desc: 'Obtain six pistol-related mastery medals.', target: 6 },
  { id: 'med_mastersecond', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Secondaries', type: 'Medal', desc: 'Obtain six secondary-related mastery medals.', target: 6 },
  { id: 'med_masterrifles', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Rifles', type: 'Medal', desc: 'Obtain six rifle-related mastery medals.', target: 6 },
  { id: 'med_masteratarms', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master-at-arms', type: 'Medal', desc: 'Become the Master of each weapon.', target: 3 },

  // --- Category 18: DLC Packs Trophies ---
  { id: 'trophy_dlc1_fuhrerious', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Führerious Repetition', type: 'Trophy', desc: 'Kill Hitler 5 times.', target: 5 },
  { id: 'trophy_dlc1_reich_to_point', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Reich To The Point', type: 'Trophy', desc: 'Kill only Hitler and exfiltrate.' },
  { id: 'trophy_dlc1_from_fuhrer_away', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'From Führer Away', type: 'Trophy', desc: 'Kill Hitler at a distance of 300 meters or more.', target: 300, isLongShot: true },
  { id: 'trophy_dlc1_covert_elim', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Covert Elimination', type: 'Trophy', desc: 'Kill Hitler and exfiltrate without being detected.' },
  { id: 'trophy_dlc1_alpha', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Alpha', type: 'Trophy', desc: 'Complete Wolf Mountain on Authentic difficulty.' },
  { id: 'trophy_dlc1_herr_today', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Herr Today, Gone Tomorrow', type: 'Trophy', desc: 'Complete Wolf Mountain.' },
  { id: 'trophy_dlc1_op_foxley', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Operation Foxley', type: 'Trophy', desc: 'Complete Wolf Mountain with a 2-star rating.', target: 2 },
  { id: 'trophy_dlc1_familienjuwel', cat: '18: DLC Pack 1 (Wolf Mountain)', name: 'Das Familienjuwel', type: 'Trophy', desc: 'Kill Hitler with a testicle shot.' },
  { id: 'trophy_dlc2_last_resort', cat: '19: DLC Pack 2 (Landing Force)', name: 'Last Resort', type: 'Trophy', desc: 'Complete the campaign mission - Landing Force.' },
  { id: 'trophy_dlc3_siegebreaker', cat: '20: DLC Pack 3 (Conqueror)', name: 'Siegebreaker', type: 'Trophy', desc: 'Complete the campaign mission - Conqueror.' },
  { id: 'trophy_dlc3_ghost_falaise', cat: '20: DLC Pack 3 (Conqueror)', name: 'Ghost of Falaise', type: 'Trophy', desc: 'Conqueror - Complete mission with a 2-star rating.', target: 2 },
  { id: 'trophy_dlc3_op_overlord', cat: '20: DLC Pack 3 (Conqueror)', name: 'Operation Overlord', type: 'Trophy', desc: 'Conqueror - Complete mission on Authentic difficulty.' },
  { id: 'trophy_dlc4_woods_today', cat: '21: DLC Pack 4 (Rough Landing)', name: 'If You Go Down To The Woods Today', type: 'Trophy', desc: 'Complete the campaign mission - Rough Landing.' },
  { id: 'trophy_dlc4_fight_another', cat: '21: DLC Pack 4 (Rough Landing)', name: 'Fight Another Day', type: 'Trophy', desc: 'Rough Landing - Complete mission with a 2-star rating.', target: 2 },
  { id: 'trophy_dlc4_stroll_woods', cat: '21: DLC Pack 4 (Rough Landing)', name: 'Stroll in the Woods', type: 'Trophy', desc: 'Rough Landing - Complete mission on Authentic difficulty.' },
  { id: 'trophy_dlc5_shipbreaker', cat: '22: DLC Pack 5 (Kraken Awakes)', name: 'Shipbreaker', type: 'Trophy', desc: 'Complete the campaign mission - Kraken Awakes.' },
  { id: 'trophy_dlc5_sink_or_swim', cat: '22: DLC Pack 5 (Kraken Awakes)', name: 'Sink or Swim', type: 'Trophy', desc: 'Kraken Awakes - Complete mission with a 2-star rating.', target: 2 },
  { id: 'trophy_dlc5_going_overboard', cat: '22: DLC Pack 5 (Kraken Awakes)', name: 'Going Overboard', type: 'Trophy', desc: 'Kraken Awakes - Complete mission on Authentic difficulty.' },

  // --- Ribbons (All 47 Career Ribbons) ---
  { id: 'rib_camofleur', cat: '23: Ribbons - Stealth (Blue)', name: 'Camofleur', type: 'Ribbon', desc: 'Kill 15 enemies while in Tall Grass.', isRibbon: true },
  { id: 'rib_cleaner', cat: '23: Ribbons - Stealth (Blue)', name: 'Cleaner', type: 'Ribbon', desc: 'Hide 3 bodies in crates.', isRibbon: true },
  { id: 'rib_distraction_expert', cat: '23: Ribbons - Stealth (Blue)', name: 'Distraction Expert', type: 'Ribbon', desc: 'Kill 5 distracted enemies.', isRibbon: true },
  { id: 'rib_ghost', cat: '23: Ribbons - Stealth (Blue)', name: 'Ghost', type: 'Ribbon', desc: 'Whilst undetected, kill 15 soldiers.', isRibbon: true },
  { id: 'rib_sound_mask_expert', cat: '23: Ribbons - Stealth (Blue)', name: 'Sound Mask Expert', type: 'Ribbon', desc: 'Sabotage 3 entities to create sound masks.', isRibbon: true },
  { id: 'rib_assassin', cat: '23: Ribbons - Stealth (Blue)', name: 'Assassin', type: 'Ribbon', desc: 'Achieve 5 lethal takedowns as Ghost Kills.', isRibbon: true },
  { id: 'rib_circuit_breaker', cat: '23: Ribbons - Stealth (Blue)', name: 'Circuit Breaker', type: 'Ribbon', desc: 'Disable an alarm.', isRibbon: true },

  { id: 'rib_partisan', cat: '24: Ribbons - Tactics (Maroon)', name: 'Partisan', type: 'Ribbon', desc: 'Get 3 environmental kills.', isRibbon: true },
  { id: 'rib_trapper', cat: '24: Ribbons - Tactics (Maroon)', name: 'Trapper', type: 'Ribbon', desc: 'Kill 3 or more soldiers with booby traps.', isRibbon: true },
  { id: 'rib_demolitionist', cat: '24: Ribbons - Tactics (Maroon)', name: 'Demolitionist', type: 'Ribbon', desc: 'Kill 2 on-foot enemies simultaneously with explosives.', isRibbon: true },
  { id: 'rib_sapper', cat: '24: Ribbons - Tactics (Maroon)', name: 'Sapper', type: 'Ribbon', desc: 'Kill 2 on-foot enemies with a single trap.', isRibbon: true },
  { id: 'rib_tank_hunter', cat: '24: Ribbons - Tactics (Maroon)', name: 'Tank Hunter', type: 'Ribbon', desc: 'Destroy a tank.', isRibbon: true },
  { id: 'rib_v8_cylinder_hunter', cat: '24: Ribbons - Tactics (Maroon)', name: 'V8 Cylinder Hunter', type: 'Ribbon', desc: 'Destroy a 222 Armoured Car.', isRibbon: true },
  { id: 'rib_scout', cat: '24: Ribbons - Tactics (Maroon)', name: 'Scout', type: 'Ribbon', desc: 'Tag 20 enemies with your binoculars.', isRibbon: true },
  { id: 'rib_field_medic', cat: '24: Ribbons - Tactics (Maroon)', name: 'Field Medic', type: 'Ribbon', desc: 'Perform 1 teammate revive.', isRibbon: true },
  { id: 'rib_spotter', cat: '24: Ribbons - Tactics (Maroon)', name: 'Spotter', type: 'Ribbon', desc: 'Get 5 tag assists in Co-op.', isRibbon: true },
  { id: 'rib_second_gunner', cat: '24: Ribbons - Tactics (Maroon)', name: 'Second Gunner', type: 'Ribbon', desc: 'Get 3 kill assists in Co-op.', isRibbon: true },
  { id: 'rib_engineer', cat: '24: Ribbons - Tactics (Maroon)', name: 'Engineer', type: 'Ribbon', desc: 'Use traps to destroy a vehicle.', isRibbon: true },

  { id: 'rib_pistol_specialist', cat: '25: Ribbons - Lethal (Red)', name: 'Pistol Specialist', type: 'Ribbon', desc: 'Kill 20 enemies with a pistol.', isRibbon: true },
  { id: 'rib_secondary_specialist', cat: '25: Ribbons - Lethal (Red)', name: 'Secondary Specialist', type: 'Ribbon', desc: 'Kill 20 enemies with a secondary weapon.', isRibbon: true },
  { id: 'rib_butcher', cat: '25: Ribbons - Lethal (Red)', name: 'Butcher', type: 'Ribbon', desc: 'Get 10 organ shot kills.', isRibbon: true },
  { id: 'rib_wrecker', cat: '25: Ribbons - Lethal (Red)', name: 'Wrecker', type: 'Ribbon', desc: 'Destroy 5 manned vehicles.', isRibbon: true },
  { id: 'rib_speed_shooter', cat: '25: Ribbons - Lethal (Red)', name: 'Speed Shooter', type: 'Ribbon', desc: 'Achieve 5 kills in less than 60 seconds with a rifle.', isRibbon: true },
  { id: 'rib_grenadier', cat: '25: Ribbons - Lethal (Red)', name: 'Grenadier', type: 'Ribbon', desc: 'Get 5 grenade kills.', isRibbon: true },
  { id: 'rib_rifle_specialist', cat: '25: Ribbons - Lethal (Red)', name: 'Rifle Specialist', type: 'Ribbon', desc: 'Kill 20 enemies with a rifle.', isRibbon: true },
  { id: 'rib_brawler', cat: '25: Ribbons - Lethal (Red)', name: 'Brawler', type: 'Ribbon', desc: 'Perform 10 lethal takedowns.', isRibbon: true },
  { id: 'rib_skull_crusher', cat: '25: Ribbons - Lethal (Red)', name: 'Skull Crusher', type: 'Ribbon', desc: 'Get 10 headshot kills.', isRibbon: true },

  { id: 'rib_guerrilla', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Guerrilla', type: 'Ribbon', desc: 'Knock 3 enemies unconscious with Schu-mines.', isRibbon: true },
  { id: 'rib_pacifist', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Pacifist', type: 'Ribbon', desc: 'Complete mission with over 20 tagged living enemies.', isRibbon: true },
  { id: 'rib_head_doctor', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Head Doctor', type: 'Ribbon', desc: 'Get 15 non-lethal ammo headshots.', isRibbon: true },
  { id: 'rib_mechanic', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Mechanic', type: 'Ribbon', desc: 'Disable the engine of 3 vehicles.', isRibbon: true },
  { id: 'rib_merciful', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Merciful', type: 'Ribbon', desc: 'Knock 15 enemies unconscious with non-lethal ammo.', isRibbon: true },
  { id: 'rib_boxer', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Boxer', type: 'Ribbon', desc: 'Perform 10 non-lethal takedowns.', isRibbon: true },
  { id: 'rib_knockout_expert', cat: '26: Ribbons - Non-Lethal (Teal)', name: 'Knockout Expert', type: 'Ribbon', desc: 'Use throwable items to knockout enemies 4 times.', isRibbon: true },

  { id: 'rib_guard_duty', cat: '27: Ribbons - Survival (Gold)', name: 'Guard Duty', type: 'Ribbon', desc: 'Get 15 kills while defending command post.', isRibbon: true },
  { id: 'rib_to_fight_another_day', cat: '27: Ribbons - Survival (Gold)', name: 'To Fight Another Day', type: 'Ribbon', desc: 'Complete an entire Survival mission.', isRibbon: true },
  { id: 'rib_rocket_man', cat: '27: Ribbons - Survival (Gold)', name: 'Rocket Man', type: 'Ribbon', desc: 'Get 10 kills with a Panzerfaust.', isRibbon: true },
  { id: 'rib_heavy_hitter', cat: '27: Ribbons - Survival (Gold)', name: 'Heavy Hitter', type: 'Ribbon', desc: 'Get 10 kills each scoring 300+ points.', isRibbon: true },
  { id: 'rib_liberator', cat: '27: Ribbons - Survival (Gold)', name: 'Liberator', type: 'Ribbon', desc: 'Kill 5 enemies capturing a Command Post.', isRibbon: true },
  { id: 'rib_untouchable', cat: '27: Ribbons - Survival (Gold)', name: 'Untouchable', type: 'Ribbon', desc: 'Get 10 consecutive kills without damage.', isRibbon: true },
  { id: 'rib_fight_for_survival', cat: '27: Ribbons - Survival (Gold)', name: 'Fight for Survival', type: 'Ribbon', desc: 'Complete 2 consecutive waves with most kills.', isRibbon: true },
  { id: 'rib_never_give_ground', cat: '27: Ribbons - Survival (Gold)', name: 'Never Give Ground', type: 'Ribbon', desc: 'Complete a Survival Stage without losing post.', isRibbon: true },
  { id: 'rib_still_standing', cat: '27: Ribbons - Survival (Gold)', name: 'Still Standing', type: 'Ribbon', desc: 'Complete a Stage without being incapacitated.', isRibbon: true },
  { id: 'rib_counter_sniper', cat: '27: Ribbons - Survival (Gold)', name: 'Counter-Sniper', type: 'Ribbon', desc: 'Headshot 5 enemy snipers.', isRibbon: true },
  { id: 'rib_crash_test_dummies', cat: '27: Ribbons - Survival (Gold)', name: 'Crash Test Dummies', type: 'Ribbon', desc: 'Kill 10 enemies before they disembark.', isRibbon: true },
  { id: 'rib_top_guns', cat: '27: Ribbons - Survival (Gold)', name: 'Top Guns', type: 'Ribbon', desc: 'Get 10 kills with MG42.', isRibbon: true },
  { id: 'rib_perfect_defence', cat: '27: Ribbons - Survival (Gold)', name: 'Perfect Defence', type: 'Ribbon', desc: 'Complete a Stage without post breach.', isRibbon: true }
];

/* Helper to convert whatever Firestore has stored (array or map) into standard items */
function extractItemsFromPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object') {
    const list = [];
    Object.entries(payload).forEach(([k, v]) => {
      if (v === true) {
        list.push({ id: k, collected: true, count: 1 });
      } else if (v && typeof v === 'object') {
        list.push({
          id: v.id || k,
          collected: !!(v.collected || v.completed || v.done || (v.count && Number(v.count) > 0)),
          count: v.count !== undefined ? Number(v.count) : 0
        });
      }
    });
    return list;
  }
  return [];
}

/* === SECTION 4: App State Controller & Core Tactical Engine === */
const appState = {
  activeGamertag: localStorage.getItem('se5_pinned_user') || 'Werewolf3788',
  platform: 'playstation',
  activeMission: '1: The Atlantic Wall',
  hunterData: [],
  teamProgress: {},
  collapsedSections: {},
  db: null,
  rtdb: null,
  auth: null,
  user: null,
  unsubListeners: [],
  isLoaded: false,
  version: 'v8.4.0',
  buildDate: '2026-09-23 20:25:00 EDT',

  togglePinActiveUser: function() {
    const pinned = localStorage.getItem('se5_pinned_user');
    if (pinned === this.activeGamertag) {
      localStorage.removeItem('se5_pinned_user');
    } else {
      localStorage.setItem('se5_pinned_user', this.activeGamertag);
    }
    this.updatePinButtonUI();
  },

  updatePinButtonUI: function() {
    const btn = document.getElementById('pin-user-toggle-btn');
    if (!btn) return;
    const isPinned = localStorage.getItem('se5_pinned_user') === this.activeGamertag;
    btn.classList.toggle('is-pinned', isPinned);
    btn.innerText = isPinned ? `📌 Pinned: ${this.activeGamertag}` : '📌 Pin User';
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

    this.populateMissionSelector();
    this.renderStickyFooter();
    this.updatePinButtonUI();
    this.render();

    try {
      const app = initializeApp(firebaseConfig);
      this.auth = getAuth(app);
      this.db = getFirestore(app);
      this.rtdb = getDatabase(app);

      signInAnonymously(this.auth).catch(err => console.warn("Anonymous auth notice:", err.message));

      onAuthStateChanged(this.auth, async (u) => {
        this.user = u;
        const statEl = document.getElementById('stat-line');
        if (u) {
          if (statEl) statEl.innerText = `ID: ${u.uid.substring(0, 8)} | ONLINE (CLOUD-AUTHORITATIVE)`;
          this.attachAllTeamListeners();
          this.attachPsnRtdbListeners();
        } else {
          if (statEl) statEl.innerText = `CONNECTING SECURE CLOUD...`;
        }
      });
    } catch (e) {
      console.warn("Firebase Init notice:", e.message);
    }
  },

  attachAllTeamListeners: function() {
    this.unsubListeners.forEach(u => u());
    this.unsubListeners = [];

    ALL_OPERATIVES.forEach(op => {
      const aliases = OPERATIVE_ALIASES[op] || [op];
      aliases.forEach(alias => {
        const path = `users/${alias}/platform/${this.platform}/progress/sniper-elite-5`;
        const docRef = doc(this.db, path);

        const unsub = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const docData = snap.data();
            const rawProgress = docData.progress || docData.collectibles || docData;
            const remoteSaved = extractItemsFromPayload(rawProgress);

            if (remoteSaved.length > 0) {
              const currentList = this.teamProgress[op] || [];
              remoteSaved.forEach(item => {
                const idx = currentList.findIndex(e => e.id === item.id);
                if (idx >= 0) {
                  currentList[idx] = { ...currentList[idx], ...item };
                } else {
                  currentList.push(item);
                }
              });
              this.teamProgress[op] = currentList;

              if (op === this.activeGamertag) {
                if (docData.activeMission && docData.activeMission !== this.activeMission) {
                  this.activeMission = docData.activeMission;
                }

                this.hunterData = sniperData.map(item => {
                  const status = currentList.find(s => s.id === item.id);
                  const isDone = status ? !!(status.collected || status.completed || status.done || (status.count !== undefined && Number(status.count) > 0)) : false;
                  return {
                    ...item,
                    collected: isDone,
                    count: status && status.count !== undefined ? Number(status.count) : (isDone ? (item.target || 1) : 0)
                  };
                });
              }
            }
          }
          this.isLoaded = true;
          this.render();
        }, (err) => {
          console.warn(`Firestore snapshot notice for ${alias}:`, err.message);
        });

        this.unsubListeners.push(unsub);
      });
    });
  },

  attachPsnRtdbListeners: function() {
    if (!this.rtdb) return;

    Object.entries(PSN_ACCOUNT_MAPPINGS).forEach(([psnTag, operativeName]) => {
      const liveTrophyPath = `psn/gamertags/${psnTag}/liveTrophyProgress/${PSN_COMMUNICATION_ID}`;
      const trophyRef = rtdbRef(this.rtdb, liveTrophyPath);

      onValue(trophyRef, (snapshot) => {
        if (!snapshot.exists()) return;
        this.processPsnTrophies(operativeName, snapshot.val());
      }, (error) => {
        console.warn(`RTDB listener notice for ${psnTag}:`, error.message);
      });
    });
  },

  processPsnTrophies: function(operativeName, trophyPayload) {
    if (!trophyPayload) return;

    let opSaved = this.teamProgress[operativeName] || [];
    const trophyList = Array.isArray(trophyPayload)
      ? trophyPayload
      : (trophyPayload.trophies || Object.values(trophyPayload));

    trophyList.forEach(t => {
      if (!t) return;
      const trophyTitle = t.trophyName || t.name || t.title;
      const normalizedTitle = normalizeString(trophyTitle);
      const matchedTrackerId = PSN_TROPHY_MAPPINGS[normalizedTitle] || (t.trophyId !== undefined ? PSN_TROPHY_MAPPINGS[String(t.trophyId)] : null);

      if (matchedTrackerId) {
        let existing = opSaved.find(s => s.id === matchedTrackerId);
        const itemDef = sniperData.find(d => d.id === matchedTrackerId);
        const targetValue = (itemDef && itemDef.target) ? itemDef.target : 1;

        const psnProgressVal = t.currentValue !== undefined
          ? parseInt(t.currentValue, 10)
          : (t.trophyProgress !== undefined
              ? parseInt(t.trophyProgress, 10)
              : (t.progress !== undefined ? parseInt(t.progress, 10) : 0));

        const isEarned = (t.earned === true || t.earned === 1 || t.unlocked === true || (targetValue > 1 && psnProgressVal >= targetValue));

        if (existing) {
          if (psnProgressVal > (existing.count || 0)) existing.count = psnProgressVal;
          if (isEarned) existing.collected = true;
        } else {
          opSaved.push({
            id: matchedTrackerId,
            collected: isEarned || (psnProgressVal >= targetValue),
            count: isEarned ? targetValue : psnProgressVal
          });
        }
      }
    });

    this.teamProgress[operativeName] = opSaved;

    if (this.activeGamertag === operativeName) {
      this.hunterData = sniperData.map(item => {
        const status = opSaved.find(s => s.id === item.id);
        const isDone = status ? !!(status.collected || status.completed || status.done || (status.count !== undefined && Number(status.count) > 0)) : false;
        return {
          ...item,
          collected: isDone,
          count: status && status.count !== undefined ? Number(status.count) : (isDone ? (item.target || 1) : 0)
        };
      });
    }

    this.render();
  },

  switchHunter: function(gamertag) {
    this.activeGamertag = gamertag;
    const displayEl = document.getElementById('hunter-display');
    if (displayEl) displayEl.innerText = gamertag.toUpperCase();

    const theme = userThemes[gamertag] || userThemes['Werewolf3788'];
    document.documentElement.style.setProperty('--ser-color', theme.color);
    document.documentElement.style.setProperty('--ser-glow', theme.glow);

    document.querySelectorAll('.profile-btn').forEach(b => {
      b.classList.toggle('active-btn', b.innerText.trim().toLowerCase() === gamertag.toLowerCase());
    });

    this.updatePinButtonUI();

    const currentSaved = this.teamProgress[gamertag] || [];
    this.hunterData = sniperData.map(item => {
      const status = currentSaved.find(s => s.id === item.id);
      const isDone = status ? !!(status.collected || status.completed || status.done || (status.count !== undefined && Number(status.count) > 0)) : false;
      return {
        ...item,
        collected: isDone,
        count: status && status.count !== undefined ? Number(status.count) : (isDone ? (item.target || 1) : 0)
      };
    });

    this.render();
  },

  stepItemCount: function(id, delta) {
    const item = this.hunterData.find(i => i.id === id);
    if (!item) return;
    const currentVal = item.count || 0;
    const stepSize = item.isLongShot ? 5 : 1;
    const nextVal = Math.max(0, currentVal + (delta * stepSize));
    this.setManualItemCount(id, nextVal);
  },

  openDirectNumberEditor: function(id, currentVal, maxVal, isUncapped = false) {
    const container = document.getElementById(`val-box-${id}`);
    if (!container) return;

    const maxAttr = (isUncapped || !maxVal) ? '' : `max="${maxVal}"`;
    container.innerHTML = `<input type="number" id="input-edit-${id}" class="manual-inline-num-input" value="${currentVal}" min="0" ${maxAttr}>`;

    const inputEl = document.getElementById(`input-edit-${id}`);
    if (!inputEl) return;
    inputEl.focus();
    inputEl.select();

    const commitVal = () => {
      const rawVal = parseInt(inputEl.value, 10);
      const finalVal = isNaN(rawVal) || rawVal < 0 ? 0 : rawVal;
      this.setManualItemCount(id, finalVal);
    };

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inputEl.blur();
      else if (e.key === 'Escape') this.render();
    });

    inputEl.addEventListener('blur', commitVal, { once: true });
  },

  setManualItemCount: function(id, newCount) {
    const item = this.hunterData.find(i => i.id === id);
    if (!item) return;

    item.count = newCount;
    item.collected = item.target ? (item.count >= item.target) : (item.count > 0);

    const opSaved = this.teamProgress[this.activeGamertag] || [];
    const existing = opSaved.find(s => s.id === id);
    if (existing) {
      existing.count = item.count;
      existing.collected = item.collected;
    } else {
      opSaved.push({ id: item.id, count: item.count, collected: item.collected });
    }
    this.teamProgress[this.activeGamertag] = opSaved;

    this.render();
    this.sync();
  },

  toggleItem: async function(id) {
    const item = this.hunterData.find(i => i.id === id);
    if (!item) return;

    item.collected = !item.collected;
    item.count = item.collected ? (item.target || 1) : 0;

    const opSaved = this.teamProgress[this.activeGamertag] || [];
    const existing = opSaved.find(s => s.id === id);
    if (existing) {
      existing.collected = item.collected;
      existing.count = item.count;
    } else {
      opSaved.push({ id: item.id, collected: item.collected, count: item.count });
    }
    this.teamProgress[this.activeGamertag] = opSaved;

    this.render();
    this.sync();
  },

  populateMissionSelector: function() {
    const select = document.getElementById('mission-focus-select');
    if (!select) return;
    const cats = [...new Set(this.hunterData.map(i => i.cat))];
    select.innerHTML = '';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.innerText = cat.toUpperCase();
      if (cat === this.activeMission) opt.selected = true;
      select.appendChild(opt);
    });
  },

  setActiveMission: function(catName) {
    this.activeMission = catName;
    const cats = [...new Set(this.hunterData.map(i => i.cat))];

    cats.forEach(c => {
      const sid = c.replace(/[^a-z0-9]/gi, '');
      this.collapsedSections[sid] = (c !== catName);
    });

    const select = document.getElementById('mission-focus-select');
    if (select) select.value = catName;

    this.render();
    this.sync();
  },

  toggleSection: function(id) {
    this.collapsedSections[id] = !this.collapsedSections[id];
    this.render();
  },

  render: function() {
    const container = document.getElementById('section-container');
    if (!container) return;

    container.innerHTML = '';
    const cats = [...new Set(this.hunterData.map(i => i.cat))];
    let totalFound = 0;

    cats.forEach(cat => {
      const rawItems = this.hunterData.filter(i => i.cat === cat);
      const count = rawItems.filter(i => i.collected).length;
      totalFound += count;

      const items = [...rawItems].sort((a, b) => {
        const orderA = IN_GAME_TYPE_ORDER[a.type] || 99;
        const orderB = IN_GAME_TYPE_ORDER[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });

      const sid = cat.replace(/[^a-z0-9]/gi, '');
      const isActiveFocus = (cat === this.activeMission);
      const section = document.createElement('div');
      section.id = `section-${sid}`;
      section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''} ${isActiveFocus ? 'active-focus' : ''}`;

      const catPercent = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
      const tierInfo = getTierStatus(catPercent);

      section.innerHTML = `
        <div class="category-header outlined-text" onclick="window.appState.toggleSection('${sid}')">
          <div style="display:flex; align-items:center; gap: 8px; flex-wrap: wrap;">
            <h2 style="font-size: 1.1rem; font-weight: 900; letter-spacing: 1px; color: #fff; text-transform: uppercase;">${cat}</h2>
            <span style="${tierInfo.style} padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900;">
              ${tierInfo.icon} ${tierInfo.label} (${catPercent}%)
            </span>
          </div>
          <div style="font-weight:900; font-size: 14px; color: var(--ser-color, #ff8800); font-family: monospace;">${count}/${items.length}</div>
        </div>
        <div class="category-content section-content">
          <div class="item-grid"></div>
        </div>
      `;

      const grid = section.querySelector('.item-grid');
      items.forEach(item => {
        const isNumeric = (item.target !== undefined && item.target > 1) || !!item.isRibbon;
        const isLongShot = !!item.isLongShot;
        const isRibbon = !!item.isRibbon;
        const card = document.createElement('div');
        card.className = `item-card ${item.collected ? 'completed' : ''}`;

        const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

        let minTeamShot = 0;
        let maxTeamShot = 0;
        if (isLongShot) {
          const distances = ALL_OPERATIVES.map(op => {
            const opData = (this.teamProgress[op] || []).find(s => s.id === item.id);
            return opData && opData.count !== undefined ? Number(opData.count) : 0;
          });
          minTeamShot = Math.min(...distances, 0);
          maxTeamShot = Math.max(...distances, item.target || 0);
        }

        let teamBadgesHtml = '';
        ALL_OPERATIVES.forEach(op => {
          const opProgress = this.teamProgress[op] || [];
          const opStatus = opProgress.find(s => s.id === item.id);
          const isCollected = opStatus ? !!(opStatus.collected || opStatus.completed || opStatus.done || (opStatus.count && Number(opStatus.count) > 0)) : false;
          const opCount = opStatus && opStatus.count !== undefined ? Number(opStatus.count) : (isCollected ? '✓' : 0);

          let displayBadgeText = op.toUpperCase();
          let dynamicBadgeStyle = '';

          if (isLongShot) {
            displayBadgeText = `${op.toUpperCase()} (${opCount}m)`;
            const heat = getLongShotHeatmapStyle(opCount, minTeamShot, maxTeamShot);
            dynamicBadgeStyle = `background: ${heat.background} !important; color: ${heat.color} !important; border: ${heat.border} !important;`;
            if (opCount > 0 && opCount === maxTeamShot) displayBadgeText = `👑 ${displayBadgeText}`;
          } else if (isRibbon) {
            displayBadgeText = `${op.toUpperCase()} (${opCount}x)`;
          } else if (isNumeric) {
            displayBadgeText = `${op.toUpperCase()} (${opCount})`;
          }

          teamBadgesHtml += `<span class="team-badge ${isCollected ? 'is-collected' : ''}" style="${dynamicBadgeStyle}">${displayBadgeText}</span>`;
        });

        let actionControlsHtml = '';
        if (isNumeric) {
          const countVal = item.count || 0;
          const targetVal = item.target || 1;
          actionControlsHtml = `
            <div class="stepper-action-row">
              <button class="step-btn outlined-text" onclick="window.appState.stepItemCount('${item.id}', -1)">−</button>
              <div id="val-box-${item.id}" class="clickable-num-pill outlined-text" onclick="window.appState.openDirectNumberEditor('${item.id}', ${countVal}, ${targetVal}, ${isLongShot || isRibbon})">
                ${isLongShot ? `🎯 ${countVal}m / ${targetVal}m` : (isRibbon ? `🎖️ EARNED: ${countVal}x` : `✏️ ${countVal} /${targetVal}`)}
              </div>
              <button class="step-btn outlined-text" onclick="window.appState.stepItemCount('${item.id}', 1)">+</button>
            </div>
          `;
        } else {
          actionControlsHtml = `
            <div class="card-actions-row">
              ${item.yt ? `<a href="${item.yt}" target="_blank" rel="noopener noreferrer" class="watch-clip-btn outlined-text">🎥 CLIP</a>` : `<span></span>`}
              <button class="confirm-toggle-btn outlined-text ${item.collected ? 'completed-state' : ''}" onclick="window.appState.toggleItem('${item.id}')">
                ${item.collected ? 'COLLECTED (Undo)' : 'MARK FOUND'}
              </button>
            </div>
          `;
        }

        card.innerHTML = `
          <div>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
              <img src="${iconUrl}" style="width:20px; height:20px; border-radius:4px; object-fit:cover;" onerror="this.style.display='none'">
              <span class="item-type-badge">${item.type}</span>
            </div>
            <div class="item-title outlined-text">${item.name}</div>
            <div class="item-desc outlined-text">${item.desc}</div>
          </div>
          <div>
            <div class="team-intel-row">
              <span class="team-intel-label">SQUAD PROGRESS:</span>
              ${teamBadgesHtml}
            </div>
            ${actionControlsHtml}
          </div>
        `;
        grid.appendChild(card);
      });

      container.appendChild(section);
    });

    const percent = Math.round((totalFound / (this.hunterData.length || 1)) * 100) || 0;
    const overallTier = getTierStatus(percent);
    const bar = document.getElementById('overall-bar');
    const pct = document.getElementById('percent-text');
    if (bar) bar.style.width = `${percent}%`;
    if (pct) pct.innerText = `TOTAL COLLECTION: ${percent}% (${this.activeGamertag}) • [${overallTier.icon} ${overallTier.label}]`;
  },

  renderStickyFooter: function() {
    let footer = document.getElementById('se5-sticky-footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.id = 'se5-sticky-footer';
      document.body.appendChild(footer);
    }
    footer.innerHTML = `
      <div>
        <span class="footer-badge">${this.version}</span>
        <span style="margin-left:8px; color:var(--ser-color, #ff8800); font-weight:bold;">PSN ID: NPWR21465_00</span>
        <span style="margin-left:8px; color:#888;">BUILD: ${this.buildDate}</span>
      </div>
      <div id="ny-timestamp" style="font-size:11px; color:#aaa;" class="outlined-text">
        New York Time (24h): --:--:--
      </div>
    `;
  },

  sync: async function() {
    if (!this.db) return;

    const progress = this.hunterData.map(i => ({
      id: i.id,
      collected: !!i.collected,
      count: i.count || 0
    }));

    try {
      const docRef = doc(this.db, 'users', this.activeGamertag, 'platform', this.platform, 'progress', 'sniper-elite-5');
      await setDoc(docRef, {
        activeMission: this.activeMission,
        gameId: "sniper-elite-5",
        lastUpdate: Date.now(),
        platform: this.platform,
        progress: progress
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore save notice:", err.message);
    }
  }
};

window.appState = appState;
appState.init();

/* === SECTION 5: Centered Top Navigation Google Sheets Menu Engine === */
async function buildTopMenu() {
  try {
    const csvUrl = "//docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";
    const res = await fetch(csvUrl);
    if (!res.ok) return;

    const textData = await res.text();
    const rows = textData.split('\n');
    const groupMap = {};
    const singleItems = [];

    let startIdx = (rows[0] && rows[0].toLowerCase().includes("name")) ? 1 : 0;

    for (let i = startIdx; i < rows.length; i++) {
      const rowStr = rows[i].replace(/\r/g, '').trim();
      if (!rowStr) continue;

      const cols = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      let name = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';
      let group = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
      let url = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : '';

      if (!name || !url) continue;

      if (!group || group.toLowerCase() === 'none') {
        singleItems.push({ type: 'single', name, url });
      } else {
        if (!groupMap[group]) groupMap[group] = { type: 'group', name: group, items: [] };
        groupMap[group].items.push({ name, url });
      }
    }

    const menuBar = document.getElementById('csv-menu-bar');
    if (!menuBar) return;

    const isSameDomain = (linkUrl) => {
      try {
        const parsed = new URL(linkUrl, window.location.href);
        return parsed.origin === window.location.origin;
      } catch (e) { return true; }
    };

    let html = '';
    singleItems.forEach(s => {
      const target = isSameDomain(s.url) ? 'target="_self"' : 'target="_blank" rel="noopener noreferrer"';
      html += `<a href="${s.url}" ${target} class="csv-single-btn outlined-text">${s.name}</a>`;
    });

    Object.values(groupMap).forEach(g => {
      const safeId = g.name.replace(/[^a-zA-Z0-9]/g, '');
      html += `
        <div class="csv-dropdown">
          <button class="csv-dropdown-btn outlined-text" data-dropdown="${safeId}">${g.name} ▾</button>
          <div id="dropdown-${safeId}" class="csv-dropdown-content">
            ${g.items.map(sub => {
              const target = isSameDomain(sub.url) ? 'target="_self"' : 'target="_blank" rel="noopener noreferrer"';
              return `<a href="${sub.url}" ${target} class="csv-dropdown-item outlined-text">${sub.name}</a>`;
            }).join('')}
          </div>
        </div>
      `;
    });

    menuBar.innerHTML = html;
  } catch (e) {
    console.warn("CSV Menu notice:", e.message);
  }
}

window.addEventListener('click', function(e) {
  const btn = e.target.closest('.csv-dropdown-btn');
  const dropdowns = document.querySelectorAll(".csv-dropdown-content");
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const id = btn.getAttribute('data-dropdown');
    const target = document.getElementById('dropdown-' + id);
    const isOpen = target && target.classList.contains('show');
    dropdowns.forEach(d => d.classList.remove('show'));
    if (target && !isOpen) target.classList.add('show');
  } else {
    dropdowns.forEach(d => d.classList.remove('show'));
  }
});

buildTopMenu();

/* === SECTION 6: 24-Hour New York Time Clock Binding === */
function updateNewYorkClock() {
  const options = {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const clockEl = document.getElementById('ny-timestamp');
  if (clockEl) {
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
    clockEl.innerText = `New York Time (24h): ${timeStr} EDT`;
  }
}

updateNewYorkClock();
setInterval(updateNewYorkClock, 1000);
