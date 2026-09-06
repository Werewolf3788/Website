/* ============================================================================
   File: tracker.js
   Deployment Timestamp: Sat, Sep 5, 2026, 23:33 (EDT - New York)
   Project: entertainment-71888
   Version: v6.3.0-SE5-HYBRID-MEDALS-RIBBONS
   Firestore Path: users/{gamertag}/platform/playstation/progress/sniper-elite-5
   Google Analytics Tag: G-CTYHDF4MSD
   Notes: Direct manual number keyboard input + quick +/- stepper buttons for Medals.
          Simple clickable toggle button for Ribbons and 1-count objectives.
          Retains high-resolution tactical map images mapped to:
          - Mission 7: "Sniper Elite Secret Weapons.JPG"
          - Mission 8: "Sniper Elite Rubble and Ruin.JPG"
          - Collectibles: Personal Letters, Classified Docs, Eagles, Hidden Items, Workbenches
          Includes multi-user Team Intel sync and protocol-relative HTTP/HTTPS support.
   ============================================================================ */

/* === SECTION: Auto Cache Purge === */
(function purgeStaleTrackerCache() {
    const activeVersion = 'v6.3.0-20260905-2333';
    const storedVersion = localStorage.getItem('se5_tracker_build_version');
    if (storedVersion !== activeVersion) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('se5_progress_')) {
                localStorage.removeItem(key);
            }
        });
        localStorage.setItem('se5_tracker_build_version', activeVersion);
    }
})();

/* === SECTION: Core Imports & Firebase Initialization === */
import { initializeApp } from '//www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from '//www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from '//www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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

/* === SECTION: GitHub Raw Texture & Icon URLs === */
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

const MISSION_MAP_CONFIG = {
    '7SecretWeapons': { 
        imgUrl: `${GITHUB_RAW_BASE}Sniper%20Elite%20Secret%20Weapons.JPG`,
        w: 2048, 
        h: 2048 
    },
    '8RubbleandRuin': { 
        imgUrl: `${GITHUB_RAW_BASE}Sniper%20Elite%20Rubble%20and%20Ruin.JPG`,
        w: 2048, 
        h: 2048 
    }
};

/* === SECTION: Master Collectibles, Medals & Ribbons Dataset === */
const sniperData = [
    // ---------------- MISSION 1: THE ATLANTIC WALL (19 Items) ----------------
    { id: 'm1_pl1', cat: '1: The Atlantic Wall', name: 'Picked Some Violets', type: 'Personal Letter', desc: 'Far eastern side, south of radar tower, inside a small shack.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=25s' },
    { id: 'm1_pl2', cat: '1: The Atlantic Wall', name: 'Upcoming Delivery', type: 'Personal Letter', desc: 'Farm east of Steffen Beckendorf. Climb ladder on western side of outhouse.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=75s' },
    { id: 'm1_pl3', cat: '1: The Atlantic Wall', name: 'Violets Are Wilting', type: 'Personal Letter', desc: 'Attic of the building containing the Atlantikwall Report.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=112s' },
    { id: 'm1_pl4', cat: '1: The Atlantic Wall', name: 'Violets Don\'t Wilt', type: 'Personal Letter', desc: 'Inside hotel safe on the western side of the map.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=158s' },
    { id: 'm1_pl5', cat: '1: The Atlantic Wall', name: 'Pests in the Garden', type: 'Personal Letter', desc: 'Beneath the gazebo table on the pier (south-western map).', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=195s' },
    { id: 'm1_pl6', cat: '1: The Atlantic Wall', name: 'Boches at the Door', type: 'Personal Letter', desc: 'Downstairs sofa in the resistance safehouse.', yt: '//www.youtube.com/watch?v=k9Xg3Jc-2p8&t=230s' },
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

    // ---------------- MISSION 2: OCCUPIED RESIDENCE (19 Items) ----------------
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

    // ---------------- MISSION 3: SPY ACADEMY (19 Items) ----------------
    { id: 'm3_pl1', cat: '3: Spy Academy', name: 'Parking Problems', type: 'Personal Letter', desc: 'On a bin near benches opposite the white Nazi car in the west.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=18s' },
    { id: 'm3_pl2', cat: '3: Spy Academy', name: 'Fragile, Do Not Break', type: 'Personal Letter', desc: 'On top of a steel box at the start checkpoint before the beach.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=52s' },
    { id: 'm3_pl3', cat: '3: Spy Academy', name: 'Do Not Be Late', type: 'Personal Letter', desc: 'Looted from a pointed-hat guard patrolling near western turret.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=88s' },
    { id: 'm3_pl4', cat: '3: Spy Academy', name: 'It\'s Easy Money', type: 'Personal Letter', desc: 'Desk inside the far eastern sniper nest.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=124s' },
    { id: 'm3_pl5', cat: '3: Spy Academy', name: 'Just Attend One', type: 'Personal Letter', desc: 'Looted from an officer near the eastern church.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=160s' },
    { id: 'm3_cd1', cat: '3: Spy Academy', name: 'Priority Package', type: 'Classified Doc', desc: 'Shelf inside a small window-access room south of main buildings.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=195s' },
    { id: 'm3_cd2', cat: '3: Spy Academy', name: 'Won\'t Be Attending', type: 'Classified Doc', desc: 'Table in a well-furnished room slightly east of the main bridge.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=232s' },
    { id: 'm3_cd3', cat: '3: Spy Academy', name: 'Training Scenarios', type: 'Classified Doc', desc: 'Table next to cellar key in the northern sea-jutting room.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=268s' },
    { id: 'm3_cd4', cat: '3: Spy Academy', name: 'Resource Request', type: 'Classified Doc', desc: 'Table at the very top of the eastern church sniper nest.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=305s' },
    { id: 'm3_cd5', cat: '3: Spy Academy', name: 'Armoury Exposed', type: 'Classified Doc', desc: 'Bench chair in the same room as CD2.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=340s' },
    { id: 'm3_hi1', cat: '3: Spy Academy', name: 'Kriegsmarine Playing Cards', type: 'Hidden Item', desc: 'Table inside a pub on the upper western side.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=375s' },
    { id: 'm3_hi2', cat: '3: Spy Academy', name: 'Ornate Compass', type: 'Hidden Item', desc: 'Inside the safe in the northern sea-jutting room.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=410s' },
    { id: 'm3_hi3', cat: '3: Spy Academy', name: 'Covert Ops Field Manual', type: 'Hidden Item', desc: 'Table in the downstairs recreation area opposite the diner.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=445s' },
    { id: 'm3_se1', cat: '3: Spy Academy', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Facing the beach on a south-western building.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=480s' },
    { id: 'm3_se2', cat: '3: Spy Academy', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Beneath the roof of a small turret right of the main building.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=512s' },
    { id: 'm3_se3', cat: '3: Spy Academy', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Top of a sunken tower in the northern sea.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=545s' },
    { id: 'm3_wb1', cat: '3: Spy Academy', name: 'Rifle Workbench', type: 'Workbench', desc: 'Cellar north of Kraken training room (enter from west).', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=578s' },
    { id: 'm3_wb2', cat: '3: Spy Academy', name: 'SMG Workbench', type: 'Workbench', desc: 'Behind a locked resistance door east of the main square statue.', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=612s' },
    { id: 'm3_wb3', cat: '3: Spy Academy', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside south-central armoury (requires Satchel Charge).', yt: '//www.youtube.com/watch?v=DfZRz0n8R_g&t=645s' },

    // ---------------- MISSION 4: WAR FACTORY (19 Items) ----------------
    { id: 'm4_pl1', cat: '4: War Factory', name: 'Klaus! You Idiot', type: 'Personal Letter', desc: 'Desk in a small building on the bridge towards the north-west.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=22s' },
    { id: 'm4_pl2', cat: '4: War Factory', name: 'The Suspense', type: 'Personal Letter', desc: 'On radio equipment in the control room above the generator.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=60s' },
    { id: 'm4_pl3', cat: '4: War Factory', name: 'Sheers\' Notebook', type: 'Personal Letter', desc: 'Desk in the upstairs western office at the blast furnace.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=98s' },
    { id: 'm4_pl4', cat: '4: War Factory', name: 'Losing the Time', type: 'Personal Letter', desc: 'Desk on the upper level of the northern steelworks.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=135s' },
    { id: 'm4_pl5', cat: '4: War Factory', name: 'Your Order Awaits', type: 'Personal Letter', desc: 'On a box blocking a doorway in the central factory warehouse.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=172s' },
    { id: 'm4_pl6', cat: '4: War Factory', name: 'Ehrlich\'s Done For', type: 'Personal Letter', desc: 'Desk in the main station office (south-west train station).', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=210s' },
    { id: 'm4_cd1', cat: '4: War Factory', name: 'Shipping Orders', type: 'Classified Doc', desc: 'Inside safe in the shipping warehouse upstairs office.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=248s' },
    { id: 'm4_cd2', cat: '4: War Factory', name: 'No More Games', type: 'Classified Doc', desc: 'Atop wooden planks in the north-eastern construction area.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=285s' },
    { id: 'm4_cd3', cat: '4: War Factory', name: 'Bureaucratic Oaf', type: 'Classified Doc', desc: 'Table in a central upstairs room accessed via ladder.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=320s' },
    { id: 'm4_cd4', cat: '4: War Factory', name: 'Increase Security', type: 'Classified Doc', desc: 'Locked vat room table on the far eastern side.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=355s' },
    { id: 'm4_hi1', cat: '4: War Factory', name: 'Gold Pocket Watch', type: 'Hidden Item', desc: 'On a pile of wooden beams in the north-eastern scrapyard.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=390s' },
    { id: 'm4_hi2', cat: '4: War Factory', name: 'Stealth Plating', type: 'Hidden Item', desc: 'Atop stacked boxes on the shipping warehouse ground floor.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=425s' },
    { id: 'm4_hi3', cat: '4: War Factory', name: 'P.1000 Ratte Plans', type: 'Hidden Item', desc: 'End of southern walkway upstairs in the train station depot.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=460s' },
    { id: 'm4_se1', cat: '4: War Factory', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'South-eastern wall of a dilapidated turret in far east ruins.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=495s' },
    { id: 'm4_se2', cat: '4: War Factory', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Atop the blast furnace in the south-eastern corner.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=528s' },
    { id: 'm4_se3', cat: '4: War Factory', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Roof of an out-of-bounds building at the southern map tip.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=560s' },
    { id: 'm4_wb1', cat: '4: War Factory', name: 'Rifle Workbench', type: 'Workbench', desc: 'Central factory warehouse cellar (resistance safehouse).', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=592s' },
    { id: 'm4_wb2', cat: '4: War Factory', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs armoury north of the shipping warehouse.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=625s' },
    { id: 'm4_wb3', cat: '4: War Factory', name: 'Pistol Workbench', type: 'Workbench', desc: 'Armoury next to the eastern vat room.', yt: '//www.youtube.com/watch?v=gT8vWJ7E_bQ&t=658s' },

    // ---------------- MISSION 5: FESTUNG GUERNSEY (19 Items) ----------------
    { id: 'm5_pl1', cat: '5: Festung Guernsey', name: 'No Need to Worry', type: 'Personal Letter', desc: 'Looted from an officer in a tower in the south-east of the map.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=20s' },
    { id: 'm5_pl2', cat: '5: Festung Guernsey', name: 'Getting Off The Island', type: 'Personal Letter', desc: 'Found in the basement of a small house (alongside Crystal Radio).', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=55s' },
    { id: 'm5_pl3', cat: '5: Festung Guernsey', name: 'Confiscated Goods', type: 'Personal Letter', desc: 'Looted from a soldier in brown uniform in the south-side construction area.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=92s' },
    { id: 'm5_pl4', cat: '5: Festung Guernsey', name: 'Escaping Islanders', type: 'Personal Letter', desc: 'In the south-west of the map, inside an upstairs bunker room.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=128s' },
    { id: 'm5_pl5', cat: '5: Festung Guernsey', name: 'Harass The Huns!', type: 'Personal Letter', desc: 'Underground room in a small building; crawl under table to find ladder.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=165s' },
    { id: 'm5_cd1', cat: '5: Festung Guernsey', name: 'Grin and Bear It!', type: 'Classified Doc', desc: 'Inside safe in Fort Hommet; climb vines or shoot lock with AP ammo.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=200s' },
    { id: 'm5_cd2', cat: '5: Festung Guernsey', name: 'Cut Costs Cost Lives', type: 'Classified Doc', desc: 'Inside western bunker on the table in front of the main objective safe.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=238s' },
    { id: 'm5_cd3', cat: '5: Festung Guernsey', name: 'Oafish Officers', type: 'Classified Doc', desc: 'Inside underground hospital in a side room on west side of corridor.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=275s' },
    { id: 'm5_cd4', cat: '5: Festung Guernsey', name: 'Transport Troubles', type: 'Classified Doc', desc: 'Inside underground hospital in the north (mandatory main objective).', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=310s' },
    { id: 'm5_cd5', cat: '5: Festung Guernsey', name: 'Drastic Measures', type: 'Classified Doc', desc: 'In the west of the map, on ground floor of tower building table.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=348s' },
    { id: 'm5_hi1', cat: '5: Festung Guernsey', name: 'Todt Uniform Badge', type: 'Hidden Item', desc: 'In the north-east construction site inside the green building on a table.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=385s' },
    { id: 'm5_hi2', cat: '5: Festung Guernsey', name: 'Crystal Radio', type: 'Hidden Item', desc: 'In basement of small house (same room as Getting Off The Island letter).', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=420s' },
    { id: 'm5_hi3', cat: '5: Festung Guernsey', name: 'Comfort Bag', type: 'Hidden Item', desc: 'In the main farm building upstairs in the bedroom.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=455s' },
    { id: 'm5_se1', cat: '5: Festung Guernsey', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Near center of map on top of the church tower.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=490s' },
    { id: 'm5_se2', cat: '5: Festung Guernsey', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'In the north-east of the map sitting on a bank; shoot from main road.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=522s' },
    { id: 'm5_se3', cat: '5: Festung Guernsey', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'In the west of the map on top of a tower.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=555s' },
    { id: 'm5_wb1', cat: '5: Festung Guernsey', name: 'Rifle Workbench', type: 'Workbench', desc: 'In the church tower; climb vines on the side of the church.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=588s' },
    { id: 'm5_wb2', cat: '5: Festung Guernsey', name: 'SMG Workbench', type: 'Workbench', desc: 'In small building basement; crawl under table and down the ladder.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=620s' },
    { id: 'm5_wb3', cat: '5: Festung Guernsey', name: 'Pistol Workbench', type: 'Workbench', desc: 'In the trenches next to an anti-air gun.', yt: '//www.youtube.com/watch?v=wX8_vU5P9aA&t=652s' },

    // ---------------- MISSION 6: LIBÉRATION (19 Items) ----------------
    { id: 'm6_pl1', cat: '6: Libération', name: 'They\'re Out There', type: 'Personal Letter', desc: 'Looted from the bald soldier in southeastern farmhouse yard.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=0s' },
    { id: 'm6_pl2', cat: '6: Libération', name: 'Watch Your Back', type: 'Personal Letter', desc: 'Looted from estate guard outside Major Trautmann\'s manor yard.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=49s' },
    { id: 'm6_pl3', cat: '6: Libération', name: 'Barely Escaped!', type: 'Personal Letter', desc: 'Northern artillery field fortifications; inside trench network.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=73s' },
    { id: 'm6_pl4', cat: '6: Libération', name: 'Give Me Strength', type: 'Personal Letter', desc: 'Northeastern sector green barracks house on crate.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=93s' },
    { id: 'm6_pl5', cat: '6: Libération', name: 'Vengeance Is Nigh!', type: 'Personal Letter', desc: 'Central farm sector; upstairs inside old barn attic.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=115s' },
    { id: 'm6_cd1', cat: '6: Libération', name: 'Hold The Line', type: 'Classified Doc', desc: 'Southern bridge sector desk in radio bunker room.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=138s' },
    { id: 'm6_cd2', cat: '6: Libération', name: 'Incoming Armour', type: 'Classified Doc', desc: 'Northern trenches equipment case in dugout node.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=160s' },
    { id: 'm6_cd3', cat: '6: Libération', name: 'Unfit for Duty', type: 'Classified Doc', desc: 'Southern farm sector cluster bedroom nightstand.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=182s' },
    { id: 'm6_cd4', cat: '6: Libération', name: 'A Surplus Bridge', type: 'Classified Doc', desc: 'Wooden box in yard of eastern burnt buildings.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=205s' },
    { id: 'm6_cd5', cat: '6: Libération', name: 'Resistance Fanatic Located', type: 'Classified Doc', desc: 'Chest of drawers in locked 2nd-floor northern room.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=228s' },
    { id: 'm6_hi1', cat: '6: Libération', name: 'Lucky Rabbit\'s Foot', type: 'Hidden Item', desc: 'Looted from bald soldier near central crashed plane.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=250s' },
    { id: 'm6_hi2', cat: '6: Libération', name: 'Stolen Medals', type: 'Hidden Item', desc: 'Table in underground resistance cache beneath central L-building.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=275s' },
    { id: 'm6_hi3', cat: '6: Libération', name: 'Engraved Lighter', type: 'Hidden Item', desc: 'Next to briefcase upstairs in building right after bridge.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=300s' },
    { id: 'm6_se1', cat: '6: Libération', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched atop the eastern windmill near the start.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=325s' },
    { id: 'm6_se2', cat: '6: Libération', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Rear of the north-western church.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=348s' },
    { id: 'm6_se3', cat: '6: Libération', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Upstairs window frame behind northern tank target.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=370s' },
    { id: 'm6_wb1', cat: '6: Libération', name: 'Rifle Workbench', type: 'Workbench', desc: 'Northern resistance safehouse (climb wall before bridge).', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=392s' },
    { id: 'm6_wb2', cat: '6: Libération', name: 'SMG Workbench', type: 'Workbench', desc: 'Central underground cellar (same as HI2 Stolen Medals).', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=415s' },
    { id: 'm6_wb3', cat: '6: Libération', name: 'Pistol Workbench', type: 'Workbench', desc: 'Top floor room in southern C-shaped building via scaffolding.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=438s' },

    // ---------------- MISSION 7: SECRET WEAPONS (19 Items) ----------------
    { id: 'm7_pl1', cat: '7: Secret Weapons', name: 'We Had a Deal', type: 'Personal Letter', desc: 'Upstairs table in the eastern trainyard office.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=20s', x: 1480, y: 920, pin: 'PL1' },
    { id: 'm7_pl2', cat: '7: Secret Weapons', name: 'I\'m Done', type: 'Personal Letter', desc: 'Fireplace of far-eastern abandoned house.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=55s', x: 1620, y: 780, pin: 'PL2' },
    { id: 'm7_pl3', cat: '7: Secret Weapons', name: 'I Can\'t Work Like This', type: 'Personal Letter', desc: 'Table on steel grate near V2 rocket lower level.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=92s', x: 1140, y: 640, pin: 'PL3' },
    { id: 'm7_pl4', cat: '7: Secret Weapons', name: 'The V2\'s Are Obsolete', type: 'Personal Letter', desc: 'Chair opposite V2 Launch Site in central dome.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=128s', x: 1220, y: 680, pin: 'PL4' },
    { id: 'm7_pl5', cat: '7: Secret Weapons', name: 'Thinking Outside the Box', type: 'Personal Letter', desc: 'Top of zig-zag stairs in northern dome room.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=165s', x: 1240, y: 580, pin: 'PL5' },
    { id: 'm7_cd1', cat: '7: Secret Weapons', name: 'Inbound Deliveries', type: 'Classified Doc', desc: 'Looted from head engineer in eastern station safe.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=200s', x: 1420, y: 960, pin: 'CD1' },
    { id: 'm7_cd2', cat: '7: Secret Weapons', name: 'Dr Junger\'s Schedule', type: 'Classified Doc', desc: 'Near window in SE train station building.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=235s', x: 1360, y: 1040, pin: 'CD2' },
    { id: 'm7_cd3', cat: '7: Secret Weapons', name: 'A-4B Logistical Issues', type: 'Classified Doc', desc: 'Top floor locked room in northern Weapons Lab.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=270s', x: 1050, y: 440, pin: 'CD3' },
    { id: 'm7_cd4', cat: '7: Secret Weapons', name: 'Intruder Sighted', type: 'Classified Doc', desc: 'Looted from sniper behind tree west of bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=305s', x: 780, y: 840, pin: 'CD4' },
    { id: 'm7_cd5', cat: '7: Secret Weapons', name: 'Pressurisation Report', type: 'Classified Doc', desc: 'Two staircases up inside SW castle tower.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=340s', x: 580, y: 1360, pin: 'CD5' },
    { id: 'm7_hi1', cat: '7: Secret Weapons', name: 'Peenemünde Lab ID', type: 'Hidden Item', desc: 'Under table in canteen exiting V2 dome.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=375s', x: 1260, y: 720, pin: 'HI1' },
    { id: 'm7_hi2', cat: '7: Secret Weapons', name: 'Luftwaffe Playing Cards', type: 'Hidden Item', desc: 'Table inside guardhouse next to northern bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=410s', x: 920, y: 410, pin: 'HI2' },
    { id: 'm7_hi3', cat: '7: Secret Weapons', name: 'Prüfstand XII Plans', type: 'Hidden Item', desc: 'Rocky beach under eastern side of bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=445s', x: 860, y: 890, pin: 'HI3' },
    { id: 'm7_se1', cat: '7: Secret Weapons', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Among rocks south of eastern abandoned house.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=480s', x: 1650, y: 840, pin: 'SE1' },
    { id: 'm7_se2', cat: '7: Secret Weapons', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Inside dam filter water on western bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=512s', x: 640, y: 720, pin: 'SE2' },
    { id: 'm7_se3', cat: '7: Secret Weapons', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Wall alcove opposite eastern tower in SW castle.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=545s', x: 590, y: 1390, pin: 'SE3' },
    { id: 'm7_wb1', cat: '7: Secret Weapons', name: 'Rifle Workbench', type: 'Workbench', desc: 'Axis Armoury north of V2 rockets.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=578s', x: 1180, y: 560, pin: 'WB1' },
    { id: 'm7_wb2', cat: '7: Secret Weapons', name: 'SMG Workbench', type: 'Workbench', desc: 'Shower corridor from V2 dome spiral stairs.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=610s', x: 1290, y: 640, pin: 'WB2' },
    { id: 'm7_wb3', cat: '7: Secret Weapons', name: 'Pistol Workbench', type: 'Workbench', desc: 'Cave behind wooden panels next to SW waterfall.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=642s', x: 620, y: 1280, pin: 'WB3' },

    // ---------------- MISSION 8: RUBBLE AND RUIN (19 Items) ----------------
    { id: 'm8_pl1', cat: '8: Rubble and Ruin', name: 'It\'s Not Over Yet', type: 'Personal Letter', desc: 'Table in ground floor room of SE hotel.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=18s', x: 1440, y: 1380, pin: 'PL1' },
    { id: 'm8_pl2', cat: '8: Rubble and Ruin', name: 'Clean Out the Sewer', type: 'Personal Letter', desc: 'Floor behind boxes left of sewer entrance.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=52s', x: 1040, y: 1180, pin: 'PL2' },
    { id: 'm8_pl3', cat: '8: Rubble and Ruin', name: 'He\'s Not the Sharpest', type: 'Personal Letter', desc: 'Locked box on central theatre balcony.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=88s', x: 1120, y: 940, pin: 'PL3' },
    { id: 'm8_pl4', cat: '8: Rubble and Ruin', name: 'Your Man Talked', type: 'Personal Letter', desc: 'Table in locked building in south-central bombed area.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=124s', x: 920, y: 1340, pin: 'PL4' },
    { id: 'm8_pl5', cat: '8: Rubble and Ruin', name: 'Möller Is Moving', type: 'Personal Letter', desc: 'Ground floor back room of Sea View Offices.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=160s', x: 1520, y: 1420, pin: 'PL5' },
    { id: 'm8_cd1', cat: '8: Rubble and Ruin', name: 'Secure Radio Lines', type: 'Classified Doc', desc: 'Wooden box near Nazis at start restaurant.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=195s', x: 740, y: 1480, pin: 'CD1' },
    { id: 'm8_cd2', cat: '8: Rubble and Ruin', name: 'Broken Resistance', type: 'Classified Doc', desc: 'Box directly ahead after sliding into sewers.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=230s', x: 1080, y: 1220, pin: 'CD2' },
    { id: 'm8_cd3', cat: '8: Rubble and Ruin', name: 'Resistance Report', type: 'Classified Doc', desc: 'Table in basement interrogation room.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=265s', x: 620, y: 1140, pin: 'CD3' },
    { id: 'm8_cd4', cat: '8: Rubble and Ruin', name: 'Flagship Fuel Risks', type: 'Classified Doc', desc: 'Safe inside locked second-floor hotel room.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=300s', x: 1420, y: 1360, pin: 'CD4' },
    { id: 'm8_cd5', cat: '8: Rubble and Ruin', name: 'Priority Pick Up', type: 'Classified Doc', desc: 'Attic floor of western Metro Du Café.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=335s', x: 680, y: 1520, pin: 'CD5' },
    { id: 'm8_hi1', cat: '8: Rubble and Ruin', name: 'Hidden Tantō', type: 'Hidden Item', desc: 'Chest in locked sewer room opposite entrance.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=370s', x: 1060, y: 1240, pin: 'HI1' },
    { id: 'm8_hi2', cat: '8: Rubble and Ruin', name: 'I-400 V2 Hangar', type: 'Hidden Item', desc: '2nd-floor room at northern fuel system.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=405s', x: 880, y: 480, pin: 'HI2' },
    { id: 'm8_hi3', cat: '8: Rubble and Ruin', name: 'An \'Original\' Adolf', type: 'Hidden Item', desc: 'Next to sleeping bag on upper church floor.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=440s', x: 1140, y: 780, pin: 'HI3' },
    { id: 'm8_se1', cat: '8: Rubble and Ruin', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Outside boundaries, seen from Sea View Offices.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=475s', x: 420, y: 1460, pin: 'SE1' },
    { id: 'm8_se2', cat: '8: Rubble and Ruin', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Past mission boundary, left of giant silos.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=508s', x: 1680, y: 1240, pin: 'SE2' },
    { id: 'm8_se3', cat: '8: Rubble and Ruin', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Atop Yoshikawa\'s building from NW workbench.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=540s', x: 740, y: 620, pin: 'SE3' },
    { id: 'm8_wb1', cat: '8: Rubble and Ruin', name: 'Rifle Workbench', type: 'Workbench', desc: 'Armoury in first sewer combat area.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=572s', x: 1090, y: 1190, pin: 'WB1' },
    { id: 'm8_wb2', cat: '8: Rubble and Ruin', name: 'SMG Workbench', type: 'Workbench', desc: 'Resistance armoury opposite NW Yoshikawa estate.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=605s', x: 780, y: 660, pin: 'WB2' },
    { id: 'm8_wb3', cat: '8: Rubble and Ruin', name: 'Pistol Workbench', type: 'Workbench', desc: 'Floor hole in NW corner of central church crypt.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=638s', x: 1150, y: 790, pin: 'WB3' },

    // ---------------- MISSION 9: LOOSE ENDS (4 Items) ----------------
    { id: 'm9_ch1', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Kill Möller with a Rifle', type: 'Challenge', desc: 'Eliminate Abelard Möller with any rifle shot.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch2', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Kill Möller with Iron Sights', type: 'Challenge', desc: 'Kill Möller without using optical rifle scope attachments.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch3', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Sightless Strike Trophy', type: 'Trophy', desc: 'Kill Möller with a scoped rifle aiming purely down the iron sights.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch4', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Master Sniper Trophy', type: 'Trophy', desc: 'Complete entire campaign on Authentic difficulty.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },

    // ---------------- MISSION 10: WOLF MOUNTAIN (DLC) (31 Items) ----------------
    { id: 'm10_pl1', cat: '10: Wolf Mountain (DLC)', name: 'Construction Halted', type: 'Personal Letter', desc: 'Inside eastern guardhouse just before teahouse.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=22s' },
    { id: 'm10_pl2', cat: '10: Wolf Mountain (DLC)', name: 'Vermin Infestation', type: 'Personal Letter', desc: 'Garage back room north of Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=58s' },
    { id: 'm10_pl3', cat: '10: Wolf Mountain (DLC)', name: 'Führer\'s Plans', type: 'Personal Letter', desc: 'Berghof ground-floor southern kitchen.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=95s' },
    { id: 'm10_pl4', cat: '10: Wolf Mountain (DLC)', name: 'Perimeter Problems', type: 'Personal Letter', desc: 'Building next to road before tunnel.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=132s' },
    { id: 'm10_pl5', cat: '10: Wolf Mountain (DLC)', name: 'Führer\'s Personal Space', type: 'Personal Letter', desc: 'Chest of drawers in NW room of Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=168s' },
    { id: 'm10_cd1', cat: '10: Wolf Mountain (DLC)', name: 'Missing Inventory', type: 'Classified Doc', desc: 'Boxes near tents at SE anti-air gun.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=205s' },
    { id: 'm10_cd2', cat: '10: Wolf Mountain (DLC)', name: 'Guest of the Führer', type: 'Classified Doc', desc: 'Side-office on southern 2nd-floor Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=240s' },
    { id: 'm10_cd3', cat: '10: Wolf Mountain (DLC)', name: 'Routine Reminder', type: 'Classified Doc', desc: 'Building safe before Stone Eagle #2 tunnel.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=275s' },
    { id: 'm10_cd4', cat: '10: Wolf Mountain (DLC)', name: 'Communication Operations', type: 'Classified Doc', desc: 'Wooden box at SW sniper lookout.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=310s' },
    { id: 'm10_cd5', cat: '10: Wolf Mountain (DLC)', name: 'Additional Flak Positions', type: 'Classified Doc', desc: 'Downstairs table in SW resort building.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=345s' },
    { id: 'm10_hi1', cat: '10: Wolf Mountain (DLC)', name: 'Führermuseum Concept Model', type: 'Hidden Item', desc: 'Berghof foyer on covered art box.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=380s' },
    { id: 'm10_hi2', cat: '10: Wolf Mountain (DLC)', name: 'Practice Pose Photography', type: 'Hidden Item', desc: 'Safe in Hitler\'s top-floor Berghof quarters.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=415s' },
    { id: 'm10_hi3', cat: '10: Wolf Mountain (DLC)', name: 'Possible Hitler Disguises', type: 'Hidden Item', desc: 'Table in northern room of eastern tearooms.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=450s' },
    { id: 'm10_se1', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Eastern-facing roof of Berghof building.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=485s' },
    { id: 'm10_se2', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Top of eastern tunnel heading to Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=518s' },
    { id: 'm10_se3', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Top of shed across northern lake.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=550s' },
    { id: 'm10_wb1', cat: '10: Wolf Mountain (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Cellar of large SW building.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=582s' },
    { id: 'm10_wb2', cat: '10: Wolf Mountain (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Basement of abandoned shack near AA gun.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=615s' },
    { id: 'm10_wb3', cat: '10: Wolf Mountain (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Armoury in Berghof basement.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=648s' },
    // Wolf Mountain Specific Medals & Challenges
    { id: 'med_wm_fuhrerlong', cat: '10: Wolf Mountain (DLC)', name: 'Führer Long Shot', type: 'Medal', desc: 'Take a 412 meters shot in Wolf Mountain.', target: 412 },
    { id: 'med_wm_dasspook', cat: '10: Wolf Mountain (DLC)', name: 'Das Spook', type: 'Medal', desc: 'Perform a ghost takedown on Hitler.' },
    { id: 'med_wm_herrtoday', cat: '10: Wolf Mountain (DLC)', name: 'Herr Today, Gone Tomorrow', type: 'Medal', desc: 'Complete mission on Civilian/Cadet (Bronze), Sharpshooter (Silver), and Sniper Elite (Gold).', target: 3 },
    { id: 'med_wm_familienjuwel', cat: '10: Wolf Mountain (DLC)', name: 'Das Familienjuwel', type: 'Medal', desc: 'Kill Hitler with a testicle shot.' },
    { id: 'med_wm_fuhrerious', cat: '10: Wolf Mountain (DLC)', name: 'Führerious Repetition', type: 'Medal', desc: 'Kill Hitler 10 times.', target: 10 },
    { id: 'med_reichtopoint', cat: '10: Wolf Mountain (DLC)', name: 'Reich to the Point', type: 'Medal', desc: 'Kill only Hitler and exfiltrate on Wolf Mountain.' },
    { id: 'med_alpsmemories', cat: '10: Wolf Mountain (DLC)', name: 'Memories of the Alps', type: 'Medal', desc: 'Obtain 15 collectibles in Wolf Mountain.', target: 15 },
    { id: 'med_wm_opfoxley', cat: '10: Wolf Mountain (DLC)', name: 'Operation Foxley', type: 'Medal', desc: 'Complete Wolf Mountain with a 2-star rating.', target: 2 },
    { id: 'med_wm_alpha', cat: '10: Wolf Mountain (DLC)', name: 'Alpha', type: 'Medal', desc: 'Complete Wolf Mountain on Authentic difficulty.' },
    { id: 'med_wm_fromfuhrer', cat: '10: Wolf Mountain (DLC)', name: 'From Führer Away', type: 'Medal', desc: 'Kill Hitler at a distance of 300 meters or more.', target: 300 },
    { id: 'med_downfall', cat: '10: Wolf Mountain (DLC)', name: 'Downfall', type: 'Medal', desc: 'Kill Hitler by making him fall down a cliffside due to a tampered fence.' },
    { id: 'med_fuhrerlongshot', cat: '10: Wolf Mountain (DLC)', name: 'Führer Authentic Long Shot', type: 'Medal', desc: 'Take a 257 meters shot in Wolf Mountain, in Authentic difficulty.', target: 257 },
    { id: 'med_putapinit', cat: '10: Wolf Mountain (DLC)', name: 'Put a Pin in It', type: 'Medal', desc: 'Kill Hitler with a booby-trapped bowling pin.' },
    { id: 'med_covertelim', cat: '10: Wolf Mountain (DLC)', name: 'Covert Elimination', type: 'Medal', desc: 'Kill Hitler and exfiltrate without ever being detected.' },

    // ---------------- MISSION 11: LANDING FORCE (DLC) (16 Items) ----------------
    { id: 'm11_pl1', cat: '11: Landing Force (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Northern radio guardpost table.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_pl2', cat: '11: Landing Force (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Dock warehouse barracks trunk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_cd1', cat: '11: Landing Force (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Command bunker office safe.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_cd2', cat: '11: Landing Force (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Radar station basement communications desk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_hi1', cat: '11: Landing Force (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Ancient coin on lighthouse top floor.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_hi2', cat: '11: Landing Force (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Naval telescope in harbourmaster tower.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se1', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Ruined lighthouse spire peak.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se2', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Cliffside crane support beam.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se3', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Eastern battery bunker roof corner.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb1', cat: '11: Landing Force (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Underground armory under gun battery.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb2', cat: '11: Landing Force (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Locked boatyard warehouse.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb3', cat: '11: Landing Force (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Radar installation sub-level locker.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_ch1', cat: '11: Landing Force (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Disable heavy battery without combat alarms.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'med_lastresort', cat: '11: Landing Force (DLC)', name: 'Last Resort', type: 'Medal', desc: 'Complete the campaign mission - Landing Force.' },
    { id: 'med_m11longshot', cat: '11: Landing Force (DLC)', name: 'Mission 11 Long Shot', type: 'Medal', desc: 'Take a 350 meters shot in Landing Force.', target: 350 },
    { id: 'med_m11authlongshot', cat: '11: Landing Force (DLC)', name: 'Mission 11 Authentic Long Shot', type: 'Medal', desc: 'Take a 250 meters shot in Landing Force, in Authentic difficulty.', target: 250 },

    // ---------------- MISSION 12: CONQUEROR (DLC) (16 Items) ----------------
    { id: 'm12_pl1', cat: '12: Conqueror (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Town entrance bridge guard desk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_pl2', cat: '12: Conqueror (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Town square townhouse bedroom.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_cd1', cat: '12: Conqueror (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Castle fortress headquarters table.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_cd2', cat: '12: Conqueror (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Subterranean dungeon interrogation room.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_hi1', cat: '12: Conqueror (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Medieval knight dagger in castle hall.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_hi2', cat: '12: Conqueror (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Golden goblet in church sacristy safe.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se1', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Main castle keep battlements peak.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se2', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Ruined cathedral archway across river.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se3', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Southern bridge guardhouse chimney.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb1', cat: '12: Conqueror (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Castle courtyard stable armory.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb2', cat: '12: Conqueror (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Cellar beneath eastern town bakery.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb3', cat: '12: Conqueror (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Castle cellar weapons cache.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_ch1', cat: '12: Conqueror (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Eliminate general using environment hazards.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'med_siegebreaker', cat: '12: Conqueror (DLC)', name: 'Siegebreaker', type: 'Medal', desc: 'Complete the campaign mission - Conqueror.' },
    { id: 'med_ghostoffalaise', cat: '12: Conqueror (DLC)', name: 'Ghost of Falaise', type: 'Medal', desc: 'Conqueror - Complete the mission with a 2 star rating.', target: 2 },
    { id: 'med_opoverlord', cat: '12: Conqueror (DLC)', name: 'Operation Overlord', type: 'Medal', desc: 'Conqueror - Complete the mission on Authentic difficulty.' },
    { id: 'med_m12authlongshot', cat: '12: Conqueror (DLC)', name: 'Mission 12 Authentic Long Shot', type: 'Medal', desc: 'Take a 260 meters shot in Conqueror, in Authentic difficulty.', target: 260 },

    // ---------------- MISSION 13: ROUGH LANDING (DLC) (23 Items) ----------------
    { id: 'm13_pl1', cat: '13: Rough Landing (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Forest camp command tent cot.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_pl2', cat: '13: Rough Landing (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Crashed glider wreckage site.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_pl3', cat: '13: Rough Landing (DLC)', name: 'Personal Letter #3', type: 'Personal Letter', desc: 'Rail depot switchboard table.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_pl4', cat: '13: Rough Landing (DLC)', name: 'Personal Letter #4', type: 'Personal Letter', desc: 'Farmhouse attic crate.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_pl5', cat: '13: Rough Landing (DLC)', name: 'Personal Letter #5', type: 'Personal Letter', desc: 'Looted from patrolling squad officer.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_cd1', cat: '13: Rough Landing (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Airfield control tower radio room.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_cd2', cat: '13: Rough Landing (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Underground fuel storage facility safe.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_cd3', cat: '13: Rough Landing (DLC)', name: 'Classified Doc #3', type: 'Classified Doc', desc: 'Maintenance hangar planning office.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_cd4', cat: '13: Rough Landing (DLC)', name: 'Classified Doc #4', type: 'Classified Doc', desc: 'Railway siding cargo container.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_cd5', cat: '13: Rough Landing (DLC)', name: 'Classified Doc #5', type: 'Classified Doc', desc: 'Staff car glove box at checkpoint.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_hi1', cat: '13: Rough Landing (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Pilot flight goggles in crashed cockpit.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_hi2', cat: '13: Rough Landing (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Experimental jet turbine blueprints.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_hi3', cat: '13: Rough Landing (DLC)', name: 'Hidden Item #3', type: 'Hidden Item', desc: 'Iron cross inside officer quarters.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se1', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Aviation hangar roof girder apex.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se2', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Rail bridge central concrete pillar.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se3', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Forest water reservoir watchtower.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb1', cat: '13: Rough Landing (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Hangar maintenance trench underground.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb2', cat: '13: Rough Landing (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Rail freight staging depot armory.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb3', cat: '13: Rough Landing (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Forest checkpoint security bunker.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'med_m13_woods', cat: '13: Rough Landing (DLC)', name: 'If You Go Down to the Woods Today', type: 'Medal', desc: 'Complete the campaign mission - Rough Landing.' },
    { id: 'med_m13_fightanother', cat: '13: Rough Landing (DLC)', name: 'Fight Another Day', type: 'Medal', desc: 'Rough Landing - Complete the mission with a 2 star rating.', target: 2 },
    { id: 'med_m13_stroll', cat: '13: Rough Landing (DLC)', name: 'Stroll in the Woods', type: 'Medal', desc: 'Rough Landing - Complete the mission on Authentic difficulty.' },
    { id: 'med_m13_longshot', cat: '13: Rough Landing (DLC)', name: 'Mission 13 Long Shot', type: 'Medal', desc: 'Take a 240 meters shot in Rough Landing.', target: 240 },
    { id: 'med_m13_authlong', cat: '13: Rough Landing (DLC)', name: 'Mission 13 Authentic Long Shot', type: 'Medal', desc: 'Take a 250 meters shot in Rough Landing, in Authentic difficulty.', target: 250 },

    // ---------------- MISSION 14: KRAKEN AWAKES (DLC) (16 Items) ----------------
    { id: 'm14_pl1', cat: '14: Kraken Awakes (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Submarine dry dock office desk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_pl2', cat: '14: Kraken Awakes (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Carrier flight deck control station.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_cd1', cat: '14: Kraken Awakes (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Super-carrier reactor room logbook.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_cd2', cat: '14: Kraken Awakes (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Admiral sea-cabin master safe.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_hi1', cat: '14: Kraken Awakes (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Ceremonial naval sword in officer wardroom.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_hi2', cat: '14: Kraken Awakes (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Prototype torpedo guidance module.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_se1', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Carrier primary radar mast antenna top.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_se2', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Dry dock crane gantry pinnacle.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_se3', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Harbour entrance lighthouse cupola.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_wb1', cat: '14: Kraken Awakes (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Carrier forward munitions storage hold.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_wb2', cat: '14: Kraken Awakes (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Dry dock machine shop workshop.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_wb3', cat: '14: Kraken Awakes (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Docklands security station gun locker.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_ch1', cat: '14: Kraken Awakes (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Destroy carrier without triggering alarms.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'med_m14_shipbreaker', cat: '14: Kraken Awakes (DLC)', name: 'Shipbreaker', type: 'Medal', desc: 'Complete the campaign mission - Kraken Awakes.' },
    { id: 'med_m14_sinkorswim', cat: '14: Kraken Awakes (DLC)', name: 'Sink or Swim', type: 'Medal', desc: 'Kraken Awakes - Complete the mission with a 2 star rating.', target: 2 },
    { id: 'med_m14_goingover', cat: '14: Kraken Awakes (DLC)', name: 'Going Overboard', type: 'Medal', desc: 'Kraken Awakes - Complete the mission on Authentic difficulty.' },

    // ---------------- 15: CAMPAIGN & OBJECTIVE MEDALS (23 Items) ----------------
    { id: 'med_fleshwound', cat: '15: Campaign & Objective Medals', name: 'Just a Flesh Wound', type: 'Medal', desc: 'Complete a mission (excluding Loose Ends) on any difficulty without healing.' },
    { id: 'med_frenchconn', cat: '15: Campaign & Objective Medals', name: 'The French Connection', type: 'Medal', desc: 'Liberate Blue Viper in Colline-Sur-Mer (Mission 1).' },
    { id: 'med_buffrightout', cat: '15: Campaign & Objective Medals', name: 'It’ll Buff Right Out', type: 'Medal', desc: 'Destroy Möller’s shiny new car in the chateau courtyard (Mission 2).' },
    { id: 'med_confirming_susp', cat: '15: Campaign & Objective Medals', name: 'Confirming Suspicions', type: 'Medal', desc: 'Complete Occupied Residence with a 3 star rating.', target: 3 },
    { id: 'med_thekrakenwakes', cat: '15: Campaign & Objective Medals', name: 'The Kraken Wakes', type: 'Medal', desc: 'Complete Spy Academy with a 3 star rating.', target: 3 },
    { id: 'med_startstocrack', cat: '15: Campaign & Objective Medals', name: 'It’s Starting to Crack', type: 'Medal', desc: 'Complete War Factory with a 3 star rating.', target: 3 },
    { id: 'med_pigeonhunter', cat: '15: Campaign & Objective Medals', name: 'Pigeon Hunter', type: 'Medal', desc: 'Destroy 10 cardboard pigeons on Beaumont-Saint-Denis (Mission 3).', target: 10 },
    { id: 'med_showoff', cat: '15: Campaign & Objective Medals', name: 'Show Off', type: 'Medal', desc: 'Hit all practice targets on range in Spy Academy (Mission 3).' },
    { id: 'med_locomotion', cat: '15: Campaign & Objective Medals', name: 'Locomotion Commotion', type: 'Medal', desc: 'In Martressac, cause crane accident destroying train (Mission 4).' },
    { id: 'med_germaneng', cat: '15: Campaign & Objective Medals', name: 'German Engineering', type: 'Medal', desc: 'Destroy the Armoured Car in Martressac (Mission 4).' },
    { id: 'med_saboteur', cat: '15: Campaign & Objective Medals', name: 'Saboteur', type: 'Medal', desc: 'Sabotage fuses of all searchlights in Martressac without killing operators (Mission 4).' },
    { id: 'med_gnomeguard', cat: '15: Campaign & Objective Medals', name: 'The Gnome Guard', type: 'Medal', desc: 'Shoot and destroy the garden gnome hidden in Guernsey (Mission 5).' },
    { id: 'med_takeback', cat: '15: Campaign & Objective Medals', name: 'Taking It Back', type: 'Medal', desc: 'Complete Libération with a 3-star rating.', target: 3 },
    { id: 'med_upclose', cat: '15: Campaign & Objective Medals', name: 'Up Close and Personal', type: 'Medal', desc: 'Takedown all 3 snipers guarding 2nd river crossing in Desponts-sur-Douve (Mission 6).' },
    { id: 'med_targetamerica', cat: '15: Campaign & Objective Medals', name: 'Target America', type: 'Medal', desc: 'Complete Secret Weapons with a 3 star rating.', target: 3 },
    { id: 'med_roadrage', cat: '15: Campaign & Objective Medals', name: 'Road Rage', type: 'Medal', desc: 'In Secret Weapons, find and destroy one of each vehicle type present (Mission 7).' },
    { id: 'med_krakensleeps', cat: '15: Campaign & Objective Medals', name: 'The Kraken Sleeps', type: 'Medal', desc: 'Complete Rubble and Ruin with a 3 star rating.', target: 3 },
    { id: 'med_dontbreath', cat: '15: Campaign & Objective Medals', name: 'Don\'t Hold Your Breath', type: 'Medal', desc: 'Make final shot in St. Nazaire fuel tanks without using Empty Lung (Mission 8).' },
    { id: 'med_brainsop', cat: '15: Campaign & Objective Medals', name: 'Brains of the Operation', type: 'Medal', desc: 'Kill Möller with a headshot in Loose Ends (Mission 9).' },
    { id: 'med_sightbeyond', cat: '15: Campaign & Objective Medals', name: 'Sight Beyond Sights', type: 'Medal', desc: 'Kill Möller with a rifle while in Iron Sights (Mission 9).' },
    { id: 'med_cantoutrun', cat: '15: Campaign & Objective Medals', name: 'Can\'t Outrun a Bullet', type: 'Medal', desc: 'Kill Möller with a rifle at a distance of 600 meters or more (Mission 9).', target: 600 },
    { id: 'med_liberte', cat: '15: Campaign & Objective Medals', name: 'Liberté', type: 'Medal', desc: 'Complete campaign on Any difficulty (Bronze), Sharpshooter (Silver), and Sniper Elite (Gold).', target: 3 },
    { id: 'med_bestofbest', cat: '15: Campaign & Objective Medals', name: 'Best of the Best', type: 'Medal', desc: 'Complete the entire campaign on Authentic difficulty.' },

    // ---------------- 16: LONGSHOT & COMBAT MEDALS (30 Items) ----------------
    { id: 'med_ls_m1', cat: '16: Longshot & Combat Medals', name: 'Mission 1 Long Shot', type: 'Medal', desc: 'Make a 450 meters shot in Colline-Sur-Mer.', target: 450 },
    { id: 'med_ls_m1_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 1 Authentic Long Shot', type: 'Medal', desc: 'Take a 250 meters shot in Colline-Sur-Mer, in Authentic difficulty.', target: 250 },
    { id: 'med_ls_m2', cat: '16: Longshot & Combat Medals', name: 'Mission 2 Long Shot', type: 'Medal', desc: 'Take a 375 meters shot in Château de Berengar.', target: 375 },
    { id: 'med_ls_m2_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 2 Authentic Long Shot', type: 'Medal', desc: 'Take a 250 meters shot in Château de Berengar, in Authentic difficulty.', target: 250 },
    { id: 'med_ls_m3', cat: '16: Longshot & Combat Medals', name: 'Mission 3 Long Shot', type: 'Medal', desc: 'Take a 675 meters shot in Beaumont-Saint-Denis.', target: 675 },
    { id: 'med_ls_m3_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 3 Authentic Long Shot', type: 'Medal', desc: 'Take a 325 meters shot in Beaumont-Saint-Denis, in Authentic difficulty.', target: 325 },
    { id: 'med_ls_m4', cat: '16: Longshot & Combat Medals', name: 'Mission 4 Long Shot', type: 'Medal', desc: 'Take a 200 meters shot in War Factory.', target: 200 },
    { id: 'med_ls_m4_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 4 Authentic Long Shot', type: 'Medal', desc: 'Take an Authentic difficulty long shot in War Factory.', target: 200 },
    { id: 'med_ls_m5', cat: '16: Longshot & Combat Medals', name: 'Mission 5 Long Shot', type: 'Medal', desc: 'Take a 400 meters shot in Festung Guernsey.', target: 400 },
    { id: 'med_ls_m5_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 5 Authentic Long Shot', type: 'Medal', desc: 'Take a 400 meters shot in Festung Guernsey, in Authentic difficulty.', target: 400 },
    { id: 'med_ls_m6', cat: '16: Longshot & Combat Medals', name: 'Mission 6 Long Shot', type: 'Medal', desc: 'Take a 400 meters rifle shot in Desponts-Sur-Douve.', target: 400 },
    { id: 'med_ls_m6_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 6 Authentic Long Shot', type: 'Medal', desc: 'Take a 400 meters shot in Desponts-Sur-Douve, in Authentic difficulty.', target: 400 },
    { id: 'med_ls_m7', cat: '16: Longshot & Combat Medals', name: 'Mission 7 Long Shot', type: 'Medal', desc: 'Take a 350 meters shot in Secret Weapons.', target: 350 },
    { id: 'med_ls_m7_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 7 Authentic Long Shot', type: 'Medal', desc: 'Take a 200 meters shot in Secret Weapons, in Authentic difficulty.', target: 200 },
    { id: 'med_ls_m8', cat: '16: Longshot & Combat Medals', name: 'Mission 8 Long Shot', type: 'Medal', desc: 'Take a 200 meters shot in St. Nazaire.', target: 200 },
    { id: 'med_ls_m8_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 8 Authentic Long Shot', type: 'Medal', desc: 'Take a 200 meters shot in St. Nazaire, in Authentic difficulty.', target: 200 },
    { id: 'med_ls_m9', cat: '16: Longshot & Combat Medals', name: 'Mission 9 Long Shot', type: 'Medal', desc: 'Take a 500 meters shot in Loose Ends.', target: 500 },
    { id: 'med_ls_m9_auth', cat: '16: Longshot & Combat Medals', name: 'Mission 9 Authentic Long Shot', type: 'Medal', desc: 'Take a 200 meters shot in Loose Ends, in Authentic difficulty.', target: 200 },
    { id: 'med_longgame', cat: '16: Longshot & Combat Medals', name: 'The Long Game', type: 'Medal', desc: 'Accumulate a cumulative kill distance of 100,000 meters across all modes.', target: 100000 },
    { id: 'med_sharpshooter', cat: '16: Longshot & Combat Medals', name: 'Sharpshooter', type: 'Medal', desc: 'Kill 350 enemies with a Rifle.', target: 350 },
    { id: 'med_skirmisher', cat: '16: Longshot & Combat Medals', name: 'Skirmisher', type: 'Medal', desc: 'Kill 150 enemies with a Secondary Weapon.', target: 150 },
    { id: 'med_gunslinger', cat: '16: Longshot & Combat Medals', name: 'Gunslinger', type: 'Medal', desc: 'Kill 150 enemies with Pistols.', target: 150 },
    { id: 'med_ironprecision', cat: '16: Longshot & Combat Medals', name: 'Precision Is Key', type: 'Medal', desc: 'Kill 300 enemies with any weapon while in Iron Sights.', target: 300 },
    { id: 'med_outofscope', cat: '16: Longshot & Combat Medals', name: 'Out of Scope', type: 'Medal', desc: 'Kill 150 enemies with a rifle while in Iron Sights.', target: 150 },
    { id: 'med_resourceful', cat: '16: Longshot & Combat Medals', name: 'Resourceful', type: 'Medal', desc: 'Kill 50 enemy soldiers with Found Weapons.', target: 50 },
    { id: 'med_littlefriend', cat: '16: Longshot & Combat Medals', name: 'My Little Friend', type: 'Medal', desc: 'Kill 50 soldiers with heavy weapons (Panzerfaust or MG42).', target: 50 },
    { id: 'med_lordofwar', cat: '16: Longshot & Combat Medals', name: 'Lord of War', type: 'Medal', desc: 'Get a kill with 20 different base weapons.', target: 20 },
    { id: 'med_organgrinder', cat: '16: Longshot & Combat Medals', name: 'Organ Grinder', type: 'Medal', desc: 'Hit every organ (8 distinct types) at least once with a rifle.', target: 8 },
    { id: 'med_dergeist', cat: '16: Longshot & Combat Medals', name: 'Der Geist', type: 'Medal', desc: 'Achieve 250 ghost kills (unaware or suspicious).', target: 250 },
    { id: 'med_quietmouse', cat: '16: Longshot & Combat Medals', name: 'As Quiet as a Mouse', type: 'Medal', desc: 'Kill 50 enemies during a Sound Mask.', target: 50 },
    { id: 'med_closequarters', cat: '16: Longshot & Combat Medals', name: 'Close Quarters', type: 'Medal', desc: 'Perform 100 lethal takedowns.', target: 100 },
    { id: 'med_snaketallgrass', cat: '16: Longshot & Combat Medals', name: 'Snake in the Grass', type: 'Medal', desc: 'While in Tall Grass, kill 50 soldiers.', target: 50 },

    // ---------------- 17: WEAPON MASTERY & TACTICS MEDALS (12 Items) ----------------
    { id: 'med_masterrifles', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Rifles', type: 'Medal', desc: 'Obtain 6 rifle-related mastery medals (50 headshots from 100m+ each).', target: 6 },
    { id: 'med_mastersecond', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Secondaries', type: 'Medal', desc: 'Obtain 6 secondary-related mastery medals (150 kills each).', target: 6 },
    { id: 'med_masterpistols', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master of Pistols', type: 'Medal', desc: 'Obtain 6 pistol-related mastery medals (50 ghost kills each).', target: 6 },
    { id: 'med_double1866', cat: '17: Weapon Mastery & Tactics Medals', name: 'Double 1866 Master', type: 'Medal', desc: 'Ghost kill 5 enemies with the Double 1866.', target: 5 },
    { id: 'med_welrodmaster', cat: '17: Weapon Mastery & Tactics Medals', name: 'Welrod Master', type: 'Medal', desc: 'Ghost kill 5 enemies with the Welrod.', target: 5 },
    { id: 'med_masteratarms', cat: '17: Weapon Mastery & Tactics Medals', name: 'Master-at-Arms', type: 'Medal', desc: 'Master all weapons in the game across Rifles, Secondaries, and Pistols.', target: 3 },
    { id: 'med_seteablaze', cat: '17: Weapon Mastery & Tactics Medals', name: 'Set Europe Ablaze', type: 'Medal', desc: 'Kill 100 enemies with traps (TNT or teller mines).', target: 100 },
    { id: 'med_riggedtoblow', cat: '17: Weapon Mastery & Tactics Medals', name: 'Rigged to Blow', type: 'Medal', desc: 'Kill 40 soldiers using booby traps.', target: 40 },
    { id: 'med_explodeeffic', cat: '17: Weapon Mastery & Tactics Medals', name: 'Explosive Efficiency', type: 'Medal', desc: 'Kill 3 on-foot soldiers with a single hand grenade.' },
    { id: 'med_nutcracker', cat: '17: Weapon Mastery & Tactics Medals', name: 'Die Nussknacker Sweet!', type: 'Medal', desc: 'Get a testicle shot with a rifle from 100 meters or more.' },
    { id: 'med_strategist', cat: '17: Weapon Mastery & Tactics Medals', name: 'Strategist', type: 'Medal', desc: 'Make an enemy tank shoot and destroy another enemy vehicle.' },
    { id: 'med_nostone', cat: '17: Weapon Mastery & Tactics Medals', name: 'No Stone Unturned', type: 'Medal', desc: 'Complete 16 campaign optional objectives.', target: 16 },

    // ---------------- 18: CAREER RIBBONS (16 Items) ----------------
    { id: 'rib_camofleur', cat: '18: Career Ribbons', name: 'Camofleur', type: 'Ribbon', desc: 'Kill 15 enemies while concealed in Tall Grass in a single mission.' },
    { id: 'rib_assassin', cat: '18: Career Ribbons', name: 'Assassin', type: 'Ribbon', desc: 'Achieve 5 lethal takedowns classified as Ghost Kills.' },
    { id: 'rib_circuitbreaker', cat: '18: Career Ribbons', name: 'Circuit Breaker', type: 'Ribbon', desc: 'Disable or sabotage an enemy alarm node.' },
    { id: 'rib_scout', cat: '18: Career Ribbons', name: 'Scout', type: 'Ribbon', desc: 'Tag 20 enemies using your binoculars.' },
    { id: 'rib_demolitionist', cat: '18: Career Ribbons', name: 'Demolitionist', type: 'Ribbon', desc: 'Kill 2 on-foot enemies by detonating an environmental explosive.' },
    { id: 'rib_engineer', cat: '18: Career Ribbons', name: 'Engineer', type: 'Ribbon', desc: 'Use placed traps (mines/TNT) to destroy an enemy vehicle.' },
    { id: 'rib_grenadier', cat: '18: Career Ribbons', name: 'Grenadier', type: 'Ribbon', desc: 'Get 5 kills using hand grenades.' },
    { id: 'rib_butcher', cat: '18: Career Ribbons', name: 'Butcher', type: 'Ribbon', desc: 'Score 10 distinct organ shot kills with a rifle.' },
    { id: 'rib_wrecker', cat: '18: Career Ribbons', name: 'Wrecker', type: 'Ribbon', desc: 'Destroy 5 enemy vehicles in combat.' },
    { id: 'rib_skullcrusher', cat: '18: Career Ribbons', name: 'Skull Crusher', type: 'Ribbon', desc: 'Score 10 headshot kills.' },
    { id: 'rib_guerrilla', cat: '18: Career Ribbons', name: 'Guerrilla', type: 'Ribbon', desc: 'Incapacitate 3 enemies using non-lethal schu-mines.' },
    { id: 'rib_boxer', cat: '18: Career Ribbons', name: 'Boxer', type: 'Ribbon', desc: 'Perform 10 non-lethal melee takedowns.' },
    { id: 'rib_knockoutexpert', cat: '18: Career Ribbons', name: 'Knockout Expert', type: 'Ribbon', desc: 'Distract or pacify enemies using throwables 4 times.' },
    { id: 'rib_nevergiveground', cat: '18: Career Ribbons', name: 'Never Give Ground', type: 'Ribbon', desc: 'Complete a Survival Stage without losing the Command Post.' },
    { id: 'rib_heavyhitter', cat: '18: Career Ribbons', name: 'Heavy Hitter', type: 'Ribbon', desc: 'Score 10 kills each worth 300+ score points.' },
    { id: 'rib_fightforsurvival', cat: '18: Career Ribbons', name: 'Fight for Survival', type: 'Ribbon', desc: 'Complete 2 consecutive Waves with top kill honors.' }
];

/* Default Seeds for Werewolf3788 Profile */
const WEREWOLF_SEEDS = [
    { id: 'med_confirming_susp', count: 3, collected: true },
    { id: 'med_thekrakenwakes', count: 3, collected: true },
    { id: 'med_startstocrack', count: 3, collected: true },
    { id: 'med_takeback', count: 3, collected: true },
    { id: 'med_targetamerica', count: 3, collected: true },
    { id: 'med_krakensleeps', count: 3, collected: true },
    { id: 'med_cantoutrun', count: 600, collected: true },
    { id: 'med_liberte', count: 1, collected: false },
    { id: 'med_nostone', count: 16, collected: true },
    { id: 'med_bestofbest', count: 0, collected: false },
    { id: 'med_ls_m1', count: 373, collected: false },
    { id: 'med_ls_m1_auth', count: 146, collected: false },
    { id: 'med_ls_m2', count: 266, collected: false },
    { id: 'med_ls_m2_auth', count: 0, collected: false },
    { id: 'med_ls_m3', count: 516, collected: false },
    { id: 'med_ls_m3_auth', count: 325, collected: true },
    { id: 'med_wm_dasspook', count: 1, collected: true },
    { id: 'med_wm_herrtoday', count: 1, collected: false },
    { id: 'med_wm_familienjuwel', count: 1, collected: true },
    { id: 'med_wm_fuhrerious', count: 6, collected: false },
    { id: 'med_reichtopoint', count: 1, collected: true },
    { id: 'med_alpsmemories', count: 15, collected: true },
    { id: 'med_wm_opfoxley', count: 2, collected: true },
    { id: 'med_wm_fromfuhrer', count: 300, collected: true },
    { id: 'med_fuhrerlongshot', count: 196, collected: false },
    { id: 'med_sharpshooter', count: 350, collected: true },
    { id: 'med_ironprecision', count: 300, collected: true },
    { id: 'med_riggedtoblow', count: 40, collected: true },
    { id: 'med_outofscope', count: 150, collected: true },
    { id: 'med_seteablaze', count: 100, collected: true },
    { id: 'med_lordofwar', count: 20, collected: true },
    { id: 'med_resourceful', count: 50, collected: true },
    { id: 'med_skirmisher', count: 113, collected: false },
    { id: 'med_littlefriend', count: 49, collected: false },
    { id: 'med_gunslinger', count: 150, collected: true }
];

/* === SECTION: App State Controller & Tactical Engine === */
const appState = {
    activeGamertag: 'Werewolf3788',
    platform: 'playstation',
    activeMission: '7: Secret Weapons',
    hunterData: [],
    teamProgress: {},
    collapsedSections: {}, 
    db: null, auth: null, user: null,
    unsubListeners: [],
    isLoaded: false,
    version: 'v6.3.0',
    buildDate: '2026-09-05 23:33 EDT',
    
    activeLeafletMaps: {}, 
    markerLayers: {}, 

    getDocRefForGamertag: function(gamertag) {
        const path = `users/${gamertag}/platform/${this.platform}/progress/sniper-elite-5`;
        return doc(this.db, path);
    },

    init: async function() {
        this.hunterData = sniperData.map(item => ({ 
            ...item, 
            collected: false,
            count: 0
        }));
        
        ALL_OPERATIVES.forEach(op => {
            const localSaved = localStorage.getItem(`se5_progress_${op}`);
            if (localSaved) {
                this.teamProgress[op] = JSON.parse(localSaved);
            } else if (op === 'Werewolf3788') {
                this.teamProgress[op] = WEREWOLF_SEEDS;
                localStorage.setItem(`se5_progress_${op}`, JSON.stringify(WEREWOLF_SEEDS));
            } else {
                this.teamProgress[op] = [];
            }
        });

        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        cats.forEach(cat => {
            const sid = cat.replace(/[^a-z0-9]/gi, '');
            this.collapsedSections[sid] = (cat !== this.activeMission);
        });

        this.populateMissionSelector();
        this.render();
        this.renderStickyFooter();

        try {
            const app = initializeApp(firebaseConfig);
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            signInAnonymously(this.auth).catch((err) => console.warn("ℹ️ Anonymous auth notice:", err.message));

            onAuthStateChanged(this.auth, async (u) => {
                this.user = u;
                if (u) {
                    const statEl = document.getElementById('stat-line');
                    if (statEl) statEl.innerText = `ID: ${u.uid.substring(0,8)} | ONLINE`;
                    this.attachAllTeamListeners();
                } else {
                    const statEl = document.getElementById('stat-line');
                    if (statEl) statEl.innerText = `OFFLINE`;
                    this.loadHunterFromLocalStorage(this.activeGamertag);
                }
            });
        } catch (e) { 
            console.warn("⚠️ Firebase Init fallback:", e.message);
            this.loadHunterFromLocalStorage(this.activeGamertag);
        }
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
        this.render();
        this.sync();
        
        const targetSid = catName.replace(/[^a-z0-9]/gi, '');
        const targetEl = document.getElementById('section-' + targetSid);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    renderStickyFooter: function() {
        let footer = document.getElementById('se5-sticky-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.id = 'se5-sticky-footer';
            document.body.appendChild(footer);
        }
        footer.innerHTML = `
            <div>
                <span class="footer-badge">${this.version}</span>
                <span style="margin-left:8px; color:var(--ser-color, #ff8800); font-weight:bold;">BUILD: ${this.buildDate}</span>
            </div>
            <div style="font-size:10px; color:#aaa;" class="outlined-text">
                OPERATIVES: Werewolf3788, Raymystyro, Terrdog, ELU CLOUD
            </div>
        `;
    },

    attachAllTeamListeners: function() {
        this.unsubListeners.forEach(u => u());
        this.unsubListeners = [];

        ALL_OPERATIVES.forEach(op => {
            const docRef = this.getDocRefForGamertag(op);
            const unsub = onSnapshot(docRef, (snap) => {
                if (snap.exists()) {
                    const docData = snap.data();
                    const saved = docData.progress || [];
                    this.teamProgress[op] = saved;
                    localStorage.setItem(`se5_progress_${op}`, JSON.stringify(saved));
                    
                    if (op === this.activeGamertag) {
                        if (docData.activeMission) {
                            this.activeMission = docData.activeMission;
                            const select = document.getElementById('mission-focus-select');
                            if (select) select.value = this.activeMission;
                        }
                        this.hunterData = sniperData.map(item => {
                            const status = saved.find(s => s.id === item.id);
                            return { 
                                ...item, 
                                collected: status ? !!status.collected : false,
                                count: status && status.count !== undefined ? Number(status.count) : 0
                            };
                        });
                    }
                } else if (op === 'Werewolf3788' && !localStorage.getItem(`se5_progress_${op}`)) {
                    this.teamProgress[op] = WEREWOLF_SEEDS;
                    this.sync();
                }
                this.isLoaded = true;
                this.render();
            }, (err) => {
                console.warn(`Firestore snapshot fallback for ${op}:`, err.message);
                this.loadHunterFromLocalStorage(this.activeGamertag);
            });
            this.unsubListeners.push(unsub);
        });
    },

    loadHunterFromLocalStorage: function(gamertag) {
        const localSaved = localStorage.getItem(`se5_progress_${gamertag}`);
        const saved = localSaved ? JSON.parse(localSaved) : (gamertag === 'Werewolf3788' ? WEREWOLF_SEEDS : []);
        this.teamProgress[gamertag] = saved;
        this.hunterData = sniperData.map(item => {
            const status = saved.find(s => s.id === item.id);
            return { 
                ...item, 
                collected: status ? !!status.collected : false,
                count: status && status.count !== undefined ? Number(status.count) : 0
            };
        });
        this.isLoaded = true;
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
            b.classList.toggle('active-btn', b.innerText === gamertag);
        });

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

    initTacticalGameMapForSection: function(sid, catName) {
        const mapContainer = document.getElementById(`map-frame-${sid}`);
        if (!mapContainer || typeof L === 'undefined') return;

        if (this.activeLeafletMaps[sid]) {
            this.activeLeafletMaps[sid].remove();
            delete this.activeLeafletMaps[sid];
        }

        const mapConfig = MISSION_MAP_CONFIG[sid] || { imgUrl: `${GITHUB_RAW_BASE}Sniper%20Elite%20Secret%20Weapons.JPG`, w: 2048, h: 2048 };

        const map = L.map(`map-frame-${sid}`, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            zoomSnap: 0.25,
            attributionControl: false
        });

        const bounds = [[0, 0], [mapConfig.h, mapConfig.w]];
        L.imageOverlay(mapConfig.imgUrl, bounds).addTo(map);
        map.fitBounds(bounds);

        this.activeLeafletMaps[sid] = map;

        const sectionItems = this.hunterData.filter(i => i.cat === catName && i.x !== undefined && i.y !== undefined);
        sectionItems.forEach(item => {
            const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

            const pinIcon = L.divIcon({
                className: 'custom-map-pin',
                html: `<img src="${iconUrl}" style="width:22px; height:22px; border-radius:50%; object-fit:cover; display:block;">`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const yCoord = mapConfig.h - item.y;
            const xCoord = item.x;

            const marker = L.marker([yCoord, xCoord], { icon: pinIcon })
                .bindPopup(`
                    <div style="color:#000; font-family:sans-serif; font-size:12px;">
                        <strong style="color:#d35400; text-transform:uppercase;">${item.type}</strong><br>
                        <strong style="font-size:13px;">${item.name}</strong><br>
                        <span style="color:#555; font-style:italic;">${item.desc}</span>
                    </div>
                `);

            this.markerLayers[item.id] = marker;

            if (!item.collected) {
                marker.addTo(map);
            }
        });
    },

    updateMapPinVisibility: function(id, collected) {
        const marker = this.markerLayers[id];
        if (!marker) return;

        const item = this.hunterData.find(i => i.id === id);
        if (!item) return;

        const sid = item.cat.replace(/[^a-z0-9]/gi, '');
        const map = this.activeLeafletMaps[sid];
        if (!map) return;

        if (collected) {
            map.removeLayer(marker);
        } else {
            marker.addTo(map);
        }
    },

    stepItemCount: function(id, delta) {
        const item = this.hunterData.find(i => i.id === id);
        if (!item) return;
        const currentVal = item.count || 0;
        const nextVal = Math.max(0, currentVal + delta);
        this.setManualItemCount(id, nextVal);
    },

    openDirectNumberEditor: function(id, currentVal, maxVal) {
        const container = document.getElementById(`val-box-${id}`);
        if (!container) return;

        container.innerHTML = `
            <input type="number" id="input-edit-${id}" class="manual-inline-num-input" value="${currentVal}" min="0" ${maxVal ? `max="${maxVal}"` : ''}>
        `;

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
            if (e.key === 'Enter') {
                inputEl.blur();
            } else if (e.key === 'Escape') {
                this.render();
            }
        });

        inputEl.addEventListener('blur', commitVal, { once: true });
    },

    setManualItemCount: function(id, newCount) {
        const item = this.hunterData.find(i => i.id === id);
        if (!item) return;

        item.count = newCount;
        if (item.target) {
            item.collected = (item.count >= item.target);
        } else {
            item.collected = (item.count > 0);
        }

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

    render: function() {
        const container = document.getElementById('section-container');
        if (!container) return;
        
        if (!this.isLoaded) {
            const bar = document.getElementById('overall-bar');
            const pct = document.getElementById('percent-text');
            if (bar) bar.style.width = '0%';
            if (pct) pct.innerText = `SYNCING DATA...`;
            container.innerHTML = '<div style="text-align:center; padding: 50px 20px; color: var(--ser-color); font-weight: 900; letter-spacing: 2px; font-size: 18px;" class="outlined-text">ESTABLISHING SECURE LINK...<br><span style="font-size:12px; color:#aaa;">READING ENTERTAINMENT DATABASE</span></div>';
            return;
        }

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
            
            const hasMapTexture = MISSION_MAP_CONFIG[sid] !== undefined;
            const mapHtml = hasMapTexture ? `
                <div class="tactical-map-wrapper">
                    <div class="tactical-map-bar outlined-text">
                        <span>🗺️ TACTICAL MAP &bull; IN-GAME TEXTURE &bull; AUTO-HIDES PINS WHEN FOUND</span>
                        <span style="color:#aaa; font-size:10px;">CLICK PIN FOR BRIEFING</span>
                    </div>
                    <div id="map-frame-${sid}" class="mission-map-frame"></div>
                </div>
            ` : '';

            section.innerHTML = `
                <div class="category-header outlined-text" onclick="appState.toggleSection('${sid}')">
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <h2 style="font-size: 1rem; font-weight: 900; letter-spacing: 1px; color: #fff; text-transform: uppercase;">${cat}</h2>
                        ${isActiveFocus ? `<span style="color:var(--ser-color); font-size:11px; font-weight:900; letter-spacing:1px;">[ACTIVE TARGET]</span>` : ''}
                    </div>
                    <div style="font-weight:900; font-size: 15px; color: var(--ser-color); font-family: monospace;">${count}/${items.length}</div>
                </div>
                <div class="category-content">
                    ${mapHtml}
                    <div class="item-grid"></div>
                </div>
            `;

            const grid = section.querySelector('.item-grid');
            items.forEach(item => {
                const isNumericProgress = (item.target !== undefined && item.target > 1);
                const card = document.createElement('div');
                card.className = `item-card ${item.collected ? 'completed' : ''}`;
                
                const iconUrl = GAME_TYPE_ICONS[item.type] || GAME_TYPE_ICONS['Personal Letter'];

                let teamBadgesHtml = '';
                ALL_OPERATIVES.forEach(op => {
                    const opProgress = this.teamProgress[op] || [];
                    const opStatus = opProgress.find(s => s.id === item.id);
                    const isCollected = opStatus ? !!opStatus.collected : false;
                    const opCount = opStatus && opStatus.count !== undefined ? opStatus.count : (isCollected ? '✓' : 0);
                    const displayBadgeText = isNumericProgress ? `${op.toUpperCase()} (${opCount})` : op.toUpperCase();
                    teamBadgesHtml += `<span class="team-badge ${isCollected ? 'is-collected' : ''}">${displayBadgeText}</span>`;
                });

                let actionControlsHtml = '';
                if (isNumericProgress) {
                    const countVal = item.count || 0;
                    const targetVal = item.target;
                    
                    actionControlsHtml = `
                        <div class="stepper-action-row">
                            <button class="step-btn outlined-text" onclick="appState.stepItemCount('${item.id}', -1)">−</button>
                            <div id="val-box-${item.id}" class="clickable-num-pill outlined-text ${item.collected ? 'pill-completed' : ''}" onclick="appState.openDirectNumberEditor('${item.id}', ${countVal}, ${targetVal})">
                                ✏️ ${countVal} / ${targetVal}
                            </div>
                            <button class="step-btn outlined-text" onclick="appState.stepItemCount('${item.id}', 1)">+</button>
                        </div>
                    `;
                } else {
                    actionControlsHtml = `
                        <div class="card-actions-row">
                            ${item.yt 
                                ? `<a href="${item.yt}" target="_blank" rel="noopener noreferrer" class="watch-clip-btn outlined-text">🎥 WATCH CLIP</a>` 
                                : `<span></span>`}
                            <button class="confirm-toggle-btn outlined-text ${item.collected ? 'completed-state' : ''}" onclick="appState.toggleItem('${item.id}')">
                                ${item.collected ? 'GOT IT (Undo)' : 'MARK GOT IT'}
                            </button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                            <img src="${iconUrl}" style="width:20px; height:20px; border-radius:4px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
                            <span class="item-type-badge">${item.type}</span>
                            ${item.target && item.target > 1 ? `<span style="font-size:10px; color:#aaa; font-family:monospace; margin-left:auto;">GOAL: ${item.target}</span>` : ''}
                        </div>
                        <div class="item-title outlined-text">${item.name}</div>
                        <div class="item-desc outlined-text">${item.desc}</div>
                    </div>
                    <div>
                        <div class="team-intel-row">
                            <span class="team-intel-label">TEAM INTEL:</span>
                            ${teamBadgesHtml}
                        </div>
                        ${actionControlsHtml}
                    </div>
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);

            if (!this.collapsedSections[sid] && hasMapTexture) {
                setTimeout(() => this.initTacticalGameMapForSection(sid, cat), 50);
            }
        });

        const percent = Math.round((totalFound / this.hunterData.length) * 100) || 0;
        const bar = document.getElementById('overall-bar');
        const pct = document.getElementById('percent-text');
        if (bar) bar.style.width = percent + '%';
        if (pct) pct.innerText = `TOTAL COLLECTION: ${percent}%`;
    },

    toggleItem: async function(id) {
        const item = this.hunterData.find(i => i.id === id);
        if (item) {
            item.collected = !item.collected;
            if (item.collected && !item.count) item.count = 1;
            if (!item.collected) item.count = 0;
            
            const opSaved = this.teamProgress[this.activeGamertag] || [];
            const existing = opSaved.find(s => s.id === id);
            if (existing) {
                existing.collected = item.collected;
                existing.count = item.count;
            } else {
                opSaved.push({ id: item.id, collected: item.collected, count: item.count });
            }
            this.teamProgress[this.activeGamertag] = opSaved;

            this.updateMapPinVisibility(id, item.collected);

            this.render(); 
            this.sync();
        }
    },

    toggleSection: function(id) {
        this.collapsedSections[id] = !this.collapsedSections[id];
        this.render();
    },

    sync: async function() {
        const progress = this.hunterData.map(i => ({ 
            id: i.id, 
            collected: i.collected,
            count: i.count || 0
        }));
        
        localStorage.setItem(`se5_progress_${this.activeGamertag}`, JSON.stringify(progress));

        if (!this.db) return;
        
        try {
            const docRef = this.getDocRefForGamertag(this.activeGamertag);
            const payload = {
                activeMission: this.activeMission,
                gameId: "sniper-elite-5",
                lastUpdate: Date.now(),
                platform: this.platform,
                progress: progress
            };
            await setDoc(docRef, payload, { merge: true });
        } catch (err) {
            console.warn("Firestore save fallback error:", err.message);
        }
    }
};

window.appState = appState;
appState.init();

/* === SECTION: Dynamic CSV Spreadsheet Parser & Navigation Menu === */
async function buildTopMenu() {
    try {
        const csvUrl = "//docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";
        const response = await fetch(csvUrl);
        const textData = await response.text();
        
        const rows = textData.split('\n');
        const menuStructure = []; 
        const groupMap = {}; 
        
        let startIdx = 0;
        if(rows[0] && rows[0].toLowerCase().includes("name")) {
            startIdx = 1; 
        }

        for(let i = startIdx; i < rows.length; i++) {
            const rowStr = rows[i].replace(/\r/g, '').trim(); 
            if(!rowStr) continue;
            
            const cols = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            let name = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';
            let group = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
            let url = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : '';
            let img = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : '';

            if(!name || !url) continue;
            
            if(!group || group.toLowerCase() === 'none') {
                menuStructure.push({ type: 'single', name, url, img });
            } else {
                if(!groupMap[group]) {
                    const newGroup = { type: 'group', name: group, items: [] };
                    menuStructure.push(newGroup);
                    groupMap[group] = newGroup;
                }
                groupMap[group].items.push({name, url, img});
            }
        }

        const menuBar = document.getElementById('csv-menu-bar');
        if (!menuBar) return;
        let html = '';
        
        const chevron = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; display: inline-block; vertical-align: middle;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        menuStructure.forEach(item => {
            if (item.type === 'single') {
                html += `<a href="${item.url}" target="SE5_ITC_Window" class="csv-single-btn outlined-text">${item.name}</a>`;
            } else {
                const safeId = item.name.replace(/[^a-zA-Z0-9]/g, '');
                html += `
                    <div class="csv-dropdown">
                        <button class="csv-dropdown-btn outlined-text" data-dropdown="${safeId}">
                            ${item.name} ${chevron}
                        </button>
                        <div id="dropdown-${safeId}" class="csv-dropdown-content">
                `;
                
                item.items.forEach(sub => {
                    const imgTag = sub.img ? `<img src="${sub.img}" style="width:26px; height:26px; margin-right:12px; vertical-align:middle; border-radius:6px; object-fit:cover; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">` : '';
                    html += `<a href="${sub.url}" target="SE5_ITC_Window" class="csv-dropdown-item outlined-text">${imgTag}${sub.name}</a>`;
                });
                
                html += `</div></div>`;
            }
        });
        
        menuBar.innerHTML = html;
        
    } catch(e) {
        console.error("Error loading CSV Menu:", e);
    }
}

window.addEventListener('click', function(event) {
    const btn = event.target.closest('.csv-dropdown-btn');
    const dropdowns = document.getElementsByClassName("csv-dropdown-content");

    if (btn) {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-dropdown');
        const targetDropdown = document.getElementById('dropdown-' + id);
        const isCurrentlyOpen = targetDropdown.classList.contains('show');

        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
        
        if (!isCurrentlyOpen) {
            targetDropdown.classList.add('show');
        }
    } else {
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
    }
});

buildTopMenu();

/* === SECTION: Dynamic 24-Hour New York Time Clock === */
function updateNewYorkTimestamp() {
    const options = {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timeParts = formatter.format(now);

    const targetElement = document.getElementById('ny-timestamp');
    if (targetElement) {
        targetElement.textContent = `New York Time (24h): ${timeParts}`;
    }
}

updateNewYorkTimestamp();
setInterval(updateNewYorkTimestamp, 1000);
