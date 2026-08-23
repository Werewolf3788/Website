/* ============================================================================
   File: tracker.js
   Deployment Timestamp: Sun, Aug 23, 2026, 00:45 (EDT - New York)
   Project: entertainment-71888
   Version: v4.5.0-CLEAN-SYNC
   Firestore Path: users/{gamertag}/platform/playstation/progress/sniper-elite-5
   Google Analytics Tag: G-CTYHDF4MSD
   Notes: Restores complete styling, team badges per collectible, active mission
          focus, all 19 PowerPyx collectibles for Mission 5, video clips, and 
          universal HTTP/HTTPS support.
   ============================================================================ */

/* === SECTION: Auto Cache Purge === */
(function purgeStaleTrackerCache() {
    const activeVersion = 'v4.5.0-20260823-0045';
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
    'Trophy': 7
};

/* === SECTION: Master Collectibles Dataset === */
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

    // ---------------- MISSION 5: FESTUNG GUERNSEY (19 Items - PowerPyx Order) ----------------
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

    // ---------------- MISSION 6: LIBÉRATION (19 Items - PowerPyx Order) ----------------
    { id: 'm6_pl1', cat: '6: Libération', name: 'They\'re Out There', type: 'Personal Letter', desc: 'Looted from the bald, green-uniformed soldier in the southeastern farmhouse yard.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=0s' },
    { id: 'm6_pl2', cat: '6: Libération', name: 'Watch Your Back', type: 'Personal Letter', desc: 'Looted from the estate guard patrolling outside Major Trautmann\'s manor yard.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=49s' },
    { id: 'm6_pl3', cat: '6: Libération', name: 'Barely Escaped!', type: 'Personal Letter', desc: 'Northern artillery field fortifications; resting inside the trench network.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=73s' },
    { id: 'm6_pl4', cat: '6: Libération', name: 'Give Me Strength', type: 'Personal Letter', desc: 'Northeastern sector green barracks house; on a crate by the door frames.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=93s' },
    { id: 'm6_pl5', cat: '6: Libération', name: 'Vengeance Is Nigh!', type: 'Personal Letter', desc: 'Central farm sector; hidden upstairs inside the attic space of the old barn house.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=115s' },
    { id: 'm6_cd1', cat: '6: Libération', name: 'Hold The Line', type: 'Classified Doc', desc: 'Southern bridge sector; on a desk inside the primary radio communication bunker room.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=138s' },
    { id: 'm6_cd2', cat: '6: Libération', name: 'Incoming Armour', type: 'Classified Doc', desc: 'Northern trenches; resting on an equipment case inside a dug-out dugout node.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=160s' },
    { id: 'm6_cd3', cat: '6: Libération', name: 'Unfit for Duty', type: 'Classified Doc', desc: 'Southern farm cluster; found on an upper-floor bedroom nightstand.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=182s' },
    { id: 'm6_cd4', cat: '6: Libération', name: 'A Surplus Bridge', type: 'Classified Doc', desc: 'On a wooden box in the yard of the eastern burnt buildings.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=205s' },
    { id: 'm6_cd5', cat: '6: Libération', name: 'Resistance Fanatic Located', type: 'Classified Doc', desc: 'Chest of drawers in locked 2nd-floor room (northern building).', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=228s' },
    { id: 'm6_hi1', cat: '6: Libération', name: 'Lucky Rabbit\'s Foot', type: 'Hidden Item', desc: 'Looted from bald Nazi near central crashed plane/AA gun.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=250s' },
    { id: 'm6_hi2', cat: '6: Libération', name: 'Stolen Medals', type: 'Hidden Item', desc: 'Table in underground resistance cache beneath central L-shaped building.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=275s' },
    { id: 'm6_hi3', cat: '6: Libération', name: 'Engraved Lighter', type: 'Hidden Item', desc: 'Next to a briefcase upstairs in building right after the bridge.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=300s' },
    { id: 'm6_se1', cat: '6: Libération', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched atop the eastern windmill near the start.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=325s' },
    { id: 'm6_se2', cat: '6: Libération', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Rear of the north-western church.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=348s' },
    { id: 'm6_se3', cat: '6: Libération', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Upstairs window frame behind northern tank target.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=370s' },
    { id: 'm6_wb1', cat: '6: Libération', name: 'Rifle Workbench', type: 'Workbench', desc: 'Northern resistance safehouse (climb wall before detonated bridge).', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=392s' },
    { id: 'm6_wb2', cat: '6: Libération', name: 'SMG Workbench', type: 'Workbench', desc: 'Central underground cellar (same as HI2 Stolen Medals).', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=415s' },
    { id: 'm6_wb3', cat: '6: Libération', name: 'Pistol Workbench', type: 'Workbench', desc: 'Top floor room in southern C-shaped building via scaffolding.', yt: '//www.youtube.com/watch?v=3HbMOkG9SMk&t=438s' },

    // ---------------- MISSION 7: SECRET WEAPONS (19 Items) ----------------
    { id: 'm7_pl1', cat: '7: Secret Weapons', name: 'We Had a Deal', type: 'Personal Letter', desc: 'Upstairs table in the eastern trainyard office.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=20s' },
    { id: 'm7_pl2', cat: '7: Secret Weapons', name: 'I\'m Done', type: 'Personal Letter', desc: 'Fireplace of far-eastern abandoned house (climb pipes to enter).', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=55s' },
    { id: 'm7_pl3', cat: '7: Secret Weapons', name: 'I Can\'t Work Like This', type: 'Personal Letter', desc: 'Table on steel grate near hoisting V2 rocket in lower level.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=92s' },
    { id: 'm7_pl4', cat: '7: Secret Weapons', name: 'The V2\'s Are Obsolete', type: 'Personal Letter', desc: 'Chair opposite the V2 Launch Site in the central dome.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=128s' },
    { id: 'm7_pl5', cat: '7: Secret Weapons', name: 'Thinking Outside the Box', type: 'Personal Letter', desc: 'Top of zig-zag stairs in the northern dome room.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=165s' },
    { id: 'm7_cd1', cat: '7: Secret Weapons', name: 'Inbound Deliveries', type: 'Classified Doc', desc: 'Looted from head engineer in eastern train station (or safe).', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=200s' },
    { id: 'm7_cd2', cat: '7: Secret Weapons', name: 'Dr Junger\'s Schedule', type: 'Classified Doc', desc: 'Near window in SE train station building or western tent.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=235s' },
    { id: 'm7_cd3', cat: '7: Secret Weapons', name: 'A-4B Logistical Issues', type: 'Classified Doc', desc: 'Top floor locked room in the northern Weapons Lab.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=270s' },
    { id: 'm7_cd4', cat: '7: Secret Weapons', name: 'Intruder Sighted', type: 'Classified Doc', desc: 'Looted from sniper behind a tree west of the bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=305s' },
    { id: 'm7_cd5', cat: '7: Secret Weapons', name: 'Pressurisation Report', type: 'Classified Doc', desc: 'Two staircases up inside the SW castle tower.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=340s' },
    { id: 'm7_hi1', cat: '7: Secret Weapons', name: 'Peenemünde Lab ID', type: 'Hidden Item', desc: 'Under a table in the canteen area exiting the V2 dome.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=375s' },
    { id: 'm7_hi2', cat: '7: Secret Weapons', name: 'Luftwaffe Playing Cards', type: 'Hidden Item', desc: 'Table inside guard house next to the blocked northern bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=410s' },
    { id: 'm7_hi3', cat: '7: Secret Weapons', name: 'Prüfstand XII Plans', type: 'Hidden Item', desc: 'Rocky beach riverbank under the eastern side of the bridge.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=445s' },
    { id: 'm7_se1', cat: '7: Secret Weapons', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Among rocks south of the eastern abandoned house.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=480s' },
    { id: 'm7_se2', cat: '7: Secret Weapons', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Inside a dam filter splashing water on the lower bridge out west.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=512s' },
    { id: 'm7_se3', cat: '7: Secret Weapons', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Wall alcove opposite eastern tower in SW castle area.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=545s' },
    { id: 'm7_wb1', cat: '7: Secret Weapons', name: 'Rifle Workbench', type: 'Workbench', desc: 'Axis Armoury north of V2 rockets (requires key or charge).', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=578s' },
    { id: 'm7_wb2', cat: '7: Secret Weapons', name: 'SMG Workbench', type: 'Workbench', desc: 'Locked room at end of shower corridor from V2 dome spiral stairs.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=610s' },
    { id: 'm7_wb3', cat: '7: Secret Weapons', name: 'Pistol Workbench', type: 'Workbench', desc: 'Cave behind wooden panels next to SW waterfall.', yt: '//www.youtube.com/watch?v=ZtN5V8Q1x4w&t=642s' },

    // ---------------- MISSION 8: RUBBLE AND RUIN (19 Items) ----------------
    { id: 'm8_pl1', cat: '8: Rubble and Ruin', name: 'It\'s Not Over Yet', type: 'Personal Letter', desc: 'Table in a ground floor side-room of the SE hotel.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=18s' },
    { id: 'm8_pl2', cat: '8: Rubble and Ruin', name: 'Clean Out the Sewer', type: 'Personal Letter', desc: 'Floor behind boxes left of the entrance into the sewers.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=52s' },
    { id: 'm8_pl3', cat: '8: Rubble and Ruin', name: 'He\'s Not the Sharpest', type: 'Personal Letter', desc: 'Locked box behind armoured gun on central theatre balcony.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=88s' },
    { id: 'm8_pl4', cat: '8: Rubble and Ruin', name: 'Your Man Talked', type: 'Personal Letter', desc: 'Table inside locked building in south-central bombed area.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=124s' },
    { id: 'm8_pl5', cat: '8: Rubble and Ruin', name: 'Möller Is Moving', type: 'Personal Letter', desc: 'Ground floor back room of the Sea View Offices (SE).', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=160s' },
    { id: 'm8_cd1', cat: '8: Rubble and Ruin', name: 'Secure Radio Lines', type: 'Classified Doc', desc: 'Atop wooden box near three Nazis at the start restaurant.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=195s' },
    { id: 'm8_cd2', cat: '8: Rubble and Ruin', name: 'Broken Resistance', type: 'Classified Doc', desc: 'On a box directly ahead after sliding into the sewers.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=230s' },
    { id: 'm8_cd3', cat: '8: Rubble and Ruin', name: 'Resistance Report', type: 'Classified Doc', desc: 'Table in basement interrogation room (western map).', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=265s' },
    { id: 'm8_cd4', cat: '8: Rubble and Ruin', name: 'Flagship Fuel Risks', type: 'Classified Doc', desc: 'Safe inside locked second-floor hotel room.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=300s' },
    { id: 'm8_cd5', cat: '8: Rubble and Ruin', name: 'Priority Pick Up', type: 'Classified Doc', desc: 'Attic floor of the western Metro Du Café starting location.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=335s' },
    { id: 'm8_hi1', cat: '8: Rubble and Ruin', name: 'Hidden Tantō', type: 'Hidden Item', desc: 'Inside chest in locked sewer room opposite entrance.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=370s' },
    { id: 'm8_hi2', cat: '8: Rubble and Ruin', name: 'I-400 V2 Hangar', type: 'Hidden Item', desc: 'Table in western 2nd-floor mainframe room at northern fuel system.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=405s' },
    { id: 'm8_hi3', cat: '8: Rubble and Ruin', name: 'An \'Original\' Adolf', type: 'Hidden Item', desc: 'Next to sleeping bag on upper church floor (climb up, then down).', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=440s' },
    { id: 'm8_se1', cat: '8: Rubble and Ruin', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Far west outside boundaries, viewable from front of Sea View Offices.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=475s' },
    { id: 'm8_se2', cat: '8: Rubble and Ruin', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Far east past mission boundary, left of giant silos.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=508s' },
    { id: 'm8_se3', cat: '8: Rubble and Ruin', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Atop Yoshikawa\'s building, visible from the NW rifle workbench.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=540s' },
    { id: 'm8_wb1', cat: '8: Rubble and Ruin', name: 'Rifle Workbench', type: 'Workbench', desc: 'Armoury in first sewer combat area (loot key from troops).', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=572s' },
    { id: 'm8_wb2', cat: '8: Rubble and Ruin', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs resistance armoury opposite NW Yoshikawa estate.', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=605s' },
    { id: 'm8_wb3', cat: '8: Rubble and Ruin', name: 'Pistol Workbench', type: 'Workbench', desc: 'Through floor hole in NW corner of central church (crypt key needed).', yt: '//www.youtube.com/watch?v=qE4hK6WfQ_M&t=638s' },

    // ---------------- MISSION 9: LOOSE ENDS (TROPHIES & CHALLENGES) (4 Items) ----------------
    { id: 'm9_ch1', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Kill Möller with a Rifle', type: 'Challenge', desc: 'Eliminate Abelard Möller with any rifle shot.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch2', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Kill Möller with Iron Sights', type: 'Challenge', desc: 'Kill Möller without using optical rifle scope attachments.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch3', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Sightless Strike Trophy', type: 'Trophy', desc: 'Kill Möller with a scoped rifle aiming purely down the iron sights.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },
    { id: 'm9_ch4', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Master Sniper Trophy', type: 'Trophy', desc: 'Complete entire campaign on Authentic difficulty.', yt: '//www.youtube.com/watch?v=3R4uO8Hq_sA' },

    // ---------------- MISSION 10: WOLF MOUNTAIN (DLC) (19 Items) ----------------
    { id: 'm10_pl1', cat: '10: Wolf Mountain (DLC)', name: 'Construction Halted', type: 'Personal Letter', desc: 'Inside eastern guardhouse just before the teahouse.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=22s' },
    { id: 'm10_pl2', cat: '10: Wolf Mountain (DLC)', name: 'Vermin Infestation', type: 'Personal Letter', desc: 'Metal table in the back room of garage north of Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=58s' },
    { id: 'm10_pl3', cat: '10: Wolf Mountain (DLC)', name: 'Führer\'s Plans', type: 'Personal Letter', desc: 'Side table in the Berghof\'s ground-floor southern kitchen.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=95s' },
    { id: 'm10_pl4', cat: '10: Wolf Mountain (DLC)', name: 'Perimeter Problems', type: 'Personal Letter', desc: 'Table inside small building next to winding road before tunnel.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=132s' },
    { id: 'm10_pl5', cat: '10: Wolf Mountain (DLC)', name: 'Führer\'s Personal Space', type: 'Personal Letter', desc: 'Chest of drawers in NW ground floor room of Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=168s' },
    { id: 'm10_cd1', cat: '10: Wolf Mountain (DLC)', name: 'Missing Inventory', type: 'Classified Doc', desc: 'Atop boxes near tents at the SE anti-air gun.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=205s' },
    { id: 'm10_cd2', cat: '10: Wolf Mountain (DLC)', name: 'Guest of the Führer', type: 'Classified Doc', desc: 'Inside side-office on the southern 2nd-floor Berghof corridor.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=240s' },
    { id: 'm10_cd3', cat: '10: Wolf Mountain (DLC)', name: 'Routine Reminder', type: 'Classified Doc', desc: 'Safe in a building just before the Stone Eagle #2 tunnel.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=275s' },
    { id: 'm10_cd4', cat: '10: Wolf Mountain (DLC)', name: 'Communication Operations', type: 'Classified Doc', desc: 'Wooden box at SW sniper lookout point.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=310s' },
    { id: 'm10_cd5', cat: '10: Wolf Mountain (DLC)', name: 'Additional Flak Positions', type: 'Classified Doc', desc: 'Downstairs table in SW resort-like building (radio objective).', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=345s' },
    { id: 'm10_hi1', cat: '10: Wolf Mountain (DLC)', name: 'Führermuseum Concept Model', type: 'Hidden Item', desc: 'On a box in Berghof foyer (room with covered artwork).', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=380s' },
    { id: 'm10_hi2', cat: '10: Wolf Mountain (DLC)', name: 'Practice Pose Photography', type: 'Hidden Item', desc: 'Safe in Hitler\'s top-floor Berghof quarters.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=415s' },
    { id: 'm10_hi3', cat: '10: Wolf Mountain (DLC)', name: 'Possible Hitler Disguises', type: 'Hidden Item', desc: 'Table in northern-most room of the eastern tearooms.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=450s' },
    { id: 'm10_se1', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Eastern-facing roof of the main Berghof building.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=485s' },
    { id: 'm10_se2', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Top of eastern tunnel heading to the Berghof.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=518s' },
    { id: 'm10_se3', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Top of a far shed across the northern lake.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=550s' },
    { id: 'm10_wb1', cat: '10: Wolf Mountain (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Cellar of large SW building (requires key or Satchel).', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=582s' },
    { id: 'm10_wb2', cat: '10: Wolf Mountain (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Basement of abandoned shack near eastern anti-air gun.', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=615s' },
    { id: 'm10_wb3', cat: '10: Wolf Mountain (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Armoury in Berghof basement (opposite bowling alley).', yt: '//www.youtube.com/watch?v=uK8_vJ9P9aQ&t=648s' },

    // ---------------- MISSION 11: LANDING FORCE (DLC) (13 Items) ----------------
    { id: 'm11_pl1', cat: '11: Landing Force (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Table inside the northern radio guardpost.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_pl2', cat: '11: Landing Force (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Barracks bedside trunk near dock warehouse.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_cd1', cat: '11: Landing Force (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Command bunker office safe overlooking the coast.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_cd2', cat: '11: Landing Force (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Radar station basement communications desk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_hi1', cat: '11: Landing Force (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Ancient coin artifact on lighthouse top floor.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_hi2', cat: '11: Landing Force (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Naval telescope inside harbourmaster tower.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se1', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched on top of the ruined lighthouse spire.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se2', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Cliffside crane support beam overlooking the beach.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_se3', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Eastern battery bunker roof corner.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb1', cat: '11: Landing Force (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Underground armory beneath the gun battery.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb2', cat: '11: Landing Force (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Inside the locked boatyard warehouse.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_wb3', cat: '11: Landing Force (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Radar installation sub-level storage locker.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm11_ch1', cat: '11: Landing Force (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Disable the heavy battery without setting off combat alarms.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },

    // ---------------- MISSION 12: CONQUEROR (DLC) (13 Items) ----------------
    { id: 'm12_pl1', cat: '12: Conqueror (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Guard outpost desk near the town entrance bridge.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_pl2', cat: '12: Conqueror (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Second floor bedroom of town square townhouse.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_cd1', cat: '12: Conqueror (DLC)', name: 'Classified Doc #1', type: 'Classified Doc', desc: 'Castle fortress headquarters map table.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_cd2', cat: '12: Conqueror (DLC)', name: 'Classified Doc #2', type: 'Classified Doc', desc: 'Subterranean dungeon interrogation room.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_hi1', cat: '12: Conqueror (DLC)', name: 'Hidden Item #1', type: 'Hidden Item', desc: 'Medieval knight dagger inside castle trophy hall.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_hi2', cat: '12: Conqueror (DLC)', name: 'Hidden Item #2', type: 'Hidden Item', desc: 'Golden goblet locked in church sacristy safe.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se1', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Main castle keep battlements peak.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se2', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Ruined cathedral archway across the river.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_se3', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Southern bridge guardhouse chimney.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb1', cat: '12: Conqueror (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Castle courtyard stable armory.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb2', cat: '12: Conqueror (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Cellar beneath the eastern town bakery.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_wb3', cat: '12: Conqueror (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Castle cellar weapons cache.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm12_ch1', cat: '12: Conqueror (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Eliminate general using only environment hazards.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },

    // ---------------- MISSION 13: ROUGH LANDING (DLC) (19 Items) ----------------
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
    { id: 'm13_hi3', cat: '13: Rough Landing (DLC)', name: 'Hidden Item #3', type: 'Hidden Item', desc: 'Decorated iron cross inside officer quarters.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se1', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Aviation hangar roof girder apex.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se2', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Rail bridge central concrete pillar.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_se3', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Forest water reservoir watchtower.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb1', cat: '13: Rough Landing (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Hangar maintenance trench underground.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb2', cat: '13: Rough Landing (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Rail freight staging depot armory.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm13_wb3', cat: '13: Rough Landing (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Forest checkpoint security bunker.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },

    // ---------------- MISSION 14: KRAKEN AWAKES (DLC) (13 Items) ----------------
    { id: 'm14_pl1', cat: '14: Kraken Awakes (DLC)', name: 'Personal Letter #1', type: 'Personal Letter', desc: 'Submarine dry dock office desk.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
    { id: 'm14_pl2', cat: '14: Kraken Awakes (DLC)', name: 'Personal Letter #2', type: 'Personal Letter', desc: 'Aircraft carrier flight deck control station.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' },
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
    { id: 'm14_ch1', cat: '14: Kraken Awakes (DLC)', name: 'Mission Challenge', type: 'Challenge', desc: 'Destroy the carrier without triggering general alarms.', yt: '//www.youtube.com/watch?v=9jJ5aT9wQ_M' }
];

/* === SECTION: App State & Multi-Player Firestore Synchronization === */
const appState = {
    activeGamertag: 'Werewolf3788',
    platform: 'playstation',
    activeMission: '6: Libération',
    hunterData: [],
    teamProgress: {}, // [gamertag]: [ {id, collected} ]
    collapsedSections: {}, 
    db: null, auth: null, user: null,
    unsubListeners: [],
    isLoaded: false,
    version: 'v4.5.0',
    buildDate: '2026-08-23 00:45 EDT',

    getDocRefForGamertag: function(gamertag) {
        const path = `users/${gamertag}/platform/${this.platform}/progress/sniper-elite-5`;
        return doc(this.db, path);
    },

    init: async function() {
        this.hunterData = sniperData.map(item => ({ ...item, collected: false }));
        
        ALL_OPERATIVES.forEach(op => {
            const localSaved = localStorage.getItem(`se5_progress_${op}`);
            this.teamProgress[op] = localSaved ? JSON.parse(localSaved) : [];
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
                            return { ...item, collected: status ? status.collected : false };
                        });
                    }
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
        const saved = localSaved ? JSON.parse(localSaved) : [];
        this.teamProgress[gamertag] = saved;
        this.hunterData = sniperData.map(item => {
            const status = saved.find(s => s.id === item.id);
            return { ...item, collected: status ? status.collected : false };
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
            return { ...item, collected: status ? status.collected : false };
        });

        this.render();
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
            
            section.innerHTML = `
                <div class="category-header outlined-text" onclick="appState.toggleSection('${sid}')">
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <h2 style="font-size: 1rem; font-weight: 900; letter-spacing: 1px; color: #fff; text-transform: uppercase;">${cat}</h2>
                        ${isActiveFocus ? `<span style="color:var(--ser-color); font-size:11px; font-weight:900; letter-spacing:1px;">[ACTIVE TARGET]</span>` : ''}
                    </div>
                    <div style="font-weight:900; font-size: 15px; color: var(--ser-color); font-family: monospace;">${count}/${items.length}</div>
                </div>
                <div class="category-content">
                    <div class="item-grid"></div>
                </div>
            `;

            const grid = section.querySelector('.item-grid');
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `item-card ${item.collected ? 'completed' : ''}`;
                
                let teamBadgesHtml = '';
                ALL_OPERATIVES.forEach(op => {
                    const opProgress = this.teamProgress[op] || [];
                    const opStatus = opProgress.find(s => s.id === item.id);
                    const isCollected = opStatus ? opStatus.collected : false;
                    teamBadgesHtml += `<span class="team-badge ${isCollected ? 'is-collected' : ''}">${op.toUpperCase()}</span>`;
                });

                card.innerHTML = `
                    <div>
                        <div class="item-type-badge">${item.type}</div>
                        <div class="item-title outlined-text">${item.name}</div>
                        <div class="item-desc outlined-text">${item.desc}</div>
                    </div>
                    <div>
                        <div class="team-intel-row">
                            <span class="team-intel-label">TEAM INTEL:</span>
                            ${teamBadgesHtml}
                        </div>
                        <div class="card-actions-row">
                            ${item.yt 
                                ? `<a href="${item.yt}" target="_blank" rel="noopener noreferrer" class="watch-clip-btn outlined-text">🎥 WATCH CLIP</a>` 
                                : `<span></span>`}
                            <button class="confirm-toggle-btn outlined-text ${item.collected ? 'completed-state' : ''}" onclick="appState.toggleItem('${item.id}')">
                                ${item.collected ? 'COLLECTED (Undo)' : 'CONFIRM FOUND'}
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);
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
            
            const opSaved = this.teamProgress[this.activeGamertag] || [];
            const existing = opSaved.find(s => s.id === id);
            if (existing) {
                existing.collected = item.collected;
            } else {
                opSaved.push({ id: item.id, collected: item.collected });
            }
            this.teamProgress[this.activeGamertag] = opSaved;

            this.render(); 
            this.sync();
        }
    },

    toggleSection: function(id) {
        this.collapsedSections[id] = !this.collapsedSections[id];
        this.render();
    },

    sync: async function() {
        const progress = this.hunterData.map(i => ({ id: i.id, collected: i.collected }));
        
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
