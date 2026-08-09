/* ============================================================================
   File: tracker.js
   Version: 2.0.0 | Updated: Sunday, August 9, 2026
   Description: Dynamic SPA Sniper Elite 5 Tracker Engine (In-Game Category Sort)
   Project: entertainment-71888
   Firestore Path: artifacts/{appId}/public/data/sniper_elite_5/{userId}
   Data Source: Embedded Master Collectibles & Remote Google Sheets CSV Navigation
   ============================================================================ */

/* === SECTION: Core Imports & Firebase Initialization === */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Secure environment variable injection for Canvas compatibility
const appId = typeof __app_id !== 'undefined' ? __app_id : 'game-tracker-5b2ef';
let firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692",
    measurementId: "G-QJ7ZFH25ER"
};

if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
}

const userThemes = {
    'Kevin': { color: '#ff8800', glow: 'rgba(255, 136, 0, 0.6)' },
    'Ray': { color: '#ff4444', glow: 'rgba(255, 68, 68, 0.6)' },
    'TJ': { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
    'Elu Cloud': { color: '#00ccff', glow: 'rgba(0, 204, 255, 0.6)' }
};

// Strict In-Game Sorting Rank Order
const IN_GAME_TYPE_ORDER = {
    'Personal Letter': 1,
    'Classified Doc': 2,
    'Hidden Item': 3,
    'Workbench': 4,
    'Stone Eagle': 5
};

/* === SECTION: Embedded Master Collectibles Dataset === */
const sniperData = [
    // MISSION 1: THE ATLANTIC WALL
    { id: 'm1_pl1', cat: '1: The Atlantic Wall', name: 'Picked Some Violets', type: 'Personal Letter', desc: 'Far eastern side, south of radar tower, inside a small shack.' },
    { id: 'm1_pl2', cat: '1: The Atlantic Wall', name: 'Upcoming Delivery', type: 'Personal Letter', desc: 'Farm east of Steffen Beckendorf. Climb ladder on western side of outhouse.' },
    { id: 'm1_pl3', cat: '1: The Atlantic Wall', name: 'Violets Are Wilting', type: 'Personal Letter', desc: 'Attic of the building containing the Atlantikwall Report.' },
    { id: 'm1_pl4', cat: '1: The Atlantic Wall', name: 'Violets Don\'t Wilt', type: 'Personal Letter', desc: 'Inside hotel safe on the western side of the map.' },
    { id: 'm1_pl5', cat: '1: The Atlantic Wall', name: 'Pests in the Garden', type: 'Personal Letter', desc: 'Beneath the gazebo table on the pier (south-western map).' },
    { id: 'm1_pl6', cat: '1: The Atlantic Wall', name: 'Boches at the Door', type: 'Personal Letter', desc: 'Downstairs sofa in the resistance safehouse.' },
    { id: 'm1_cd1', cat: '1: The Atlantic Wall', name: 'Resistance Captured', type: 'Classified Doc', desc: 'Table inside the boathouse (requires boathouse key from officer).' },
    { id: 'm1_cd2', cat: '1: The Atlantic Wall', name: 'Beach Defences', type: 'Classified Doc', desc: 'Inside a safe in the north-western shack (SMG workbench area).' },
    { id: 'm1_cd3', cat: '1: The Atlantic Wall', name: 'Lacking Air Support', type: 'Classified Doc', desc: 'Inside a safe in the room under the radar tower.' },
    { id: 'm1_cd4', cat: '1: The Atlantic Wall', name: 'Atlantikwall Report', type: 'Classified Doc', desc: 'Kitchen safe in the northern town houses near anti-air gun.' },
    { id: 'm1_hi1', cat: '1: The Atlantic Wall', name: 'Resistance Photo', type: 'Hidden Item', desc: 'Upstairs table opposite the bed in the western beachfront pharmacy.' },
    { id: 'm1_hi2', cat: '1: The Atlantic Wall', name: 'Radio Tin', type: 'Hidden Item', desc: 'Table in the stable area of the central farm.' },
    { id: 'm1_hi3', cat: '1: The Atlantic Wall', name: 'FFI Flag', type: 'Hidden Item', desc: 'Draining board in the downstairs of the western farmhouse.' },
    { id: 'm1_se1', cat: '1: The Atlantic Wall', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Chimney top of an inaccessible house opposite the eastern shack.' },
    { id: 'm1_se2', cat: '1: The Atlantic Wall', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'On the roof of the western hotel.' },
    { id: 'm1_se3', cat: '1: The Atlantic Wall', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'On top of the Vantage Point building in the south-east.' },
    { id: 'm1_wb1', cat: '1: The Atlantic Wall', name: 'Rifle Workbench', type: 'Workbench', desc: 'Armoury room upstairs after rendezvousing with Blue Viper.' },
    { id: 'm1_wb2', cat: '1: The Atlantic Wall', name: 'SMG Workbench', type: 'Workbench', desc: 'Attic of the resistance safehouse on the western map edge.' },
    { id: 'm1_wb3', cat: '1: The Atlantic Wall', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside locked shack above gun battery in the north-west.' },

    // MISSION 2: OCCUPIED RESIDENCE
    { id: 'm2_pl1', cat: '2: Occupied Residence', name: 'Do Not Fail Me, Nephew', type: 'Personal Letter', desc: 'Table in an open room upstairs overlooking the main courtyard.' },
    { id: 'm2_pl2', cat: '2: Occupied Residence', name: 'Need a Scapegoat', type: 'Personal Letter', desc: 'Box at foot of bed in Friedrich Kummler\'s quarters (second floor).' },
    { id: 'm2_pl3', cat: '2: Occupied Residence', name: 'Brother, I Have a Plan', type: 'Personal Letter', desc: 'Third floor dorms in the central part of the chateau.' },
    { id: 'm2_pl4', cat: '2: Occupied Residence', name: 'Good Plan, Let\'s Do It', type: 'Personal Letter', desc: 'On a box in the sniper outhouse north-east of the garden.' },
    { id: 'm2_cd1', cat: '2: Occupied Residence', name: 'Orders of the Day', type: 'Classified Doc', desc: 'Inside a locked locker next to the central path lookout tower.' },
    { id: 'm2_cd2', cat: '2: Occupied Residence', name: 'Renovations Completed', type: 'Classified Doc', desc: 'On the desk inside Moller\'s office.' },
    { id: 'm2_cd3', cat: '2: Occupied Residence', name: 'Operation Kraken', type: 'Classified Doc', desc: 'In Moller\'s hidden study (pull the painting to enter).' },
    { id: 'm2_cd4', cat: '2: Occupied Residence', name: 'New Orders, Effective Immediately', type: 'Classified Doc', desc: 'Table inside the far-west resistance safehouse.' },
    { id: 'm2_cd5', cat: '2: Occupied Residence', name: 'Immediate Request for Attic Repairs', type: 'Classified Doc', desc: 'Table in an outhouse on the far east side.' },
    { id: 'm2_cd6', cat: '2: Occupied Residence', name: 'Grateful Thanks', type: 'Classified Doc', desc: 'Table beneath Moller\'s painting in his hidden room.' },
    { id: 'm2_hi1', cat: '2: Occupied Residence', name: 'Old Man Statuette', type: 'Hidden Item', desc: 'Inside the safe hidden behind a painting in Kummler\'s quarters.' },
    { id: 'm2_hi2', cat: '2: Occupied Residence', name: 'Group Statuette', type: 'Hidden Item', desc: 'Inside a locked trunk in the third-floor dormitories.' },
    { id: 'm2_hi3', cat: '2: Occupied Residence', name: 'Soldier Statuette', type: 'Hidden Item', desc: 'Looted from the sniper in the north-east outhouse.' },
    { id: 'm2_se1', cat: '2: Occupied Residence', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'On the roof of the L-shaped farmhouse on the far west.' },
    { id: 'm2_se2', cat: '2: Occupied Residence', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Tip of a ledge looking west from the main gates bridge.' },
    { id: 'm2_se3', cat: '2: Occupied Residence', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Eastern side of an outhouse just north of the chateau.' },
    { id: 'm2_wb1', cat: '2: Occupied Residence', name: 'Rifle Workbench', type: 'Workbench', desc: 'Inside the eastern cellar armoury.' },
    { id: 'm2_wb2', cat: '2: Occupied Residence', name: 'SMG Workbench', type: 'Workbench', desc: 'Roof area of the western resistance safehouse (climb vines).' },
    { id: 'm2_wb3', cat: '2: Occupied Residence', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside the eastern outhouse armoury.' },

    // MISSION 3: SPY ACADEMY
    { id: 'm3_pl1', cat: '3: Spy Academy', name: 'Parking Problems', type: 'Personal Letter', desc: 'On a bin near benches opposite the white Nazi car in the west.' },
    { id: 'm3_pl2', cat: '3: Spy Academy', name: 'Fragile, Do Not Break', type: 'Personal Letter', desc: 'On top of a steel box at the start checkpoint before the beach.' },
    { id: 'm3_pl3', cat: '3: Spy Academy', name: 'Do Not Be Late', type: 'Personal Letter', desc: 'Looted from a pointed-hat guard patrolling near western turret.' },
    { id: 'm3_pl4', cat: '3: Spy Academy', name: 'It\'s Easy Money', type: 'Personal Letter', desc: 'Desk inside the far eastern sniper nest.' },
    { id: 'm3_pl5', cat: '3: Spy Academy', name: 'Just Attend One', type: 'Personal Letter', desc: 'Looted from an officer near the eastern church.' },
    { id: 'm3_cd1', cat: '3: Spy Academy', name: 'Priority Package', type: 'Classified Doc', desc: 'Shelf inside a small window-access room south of main buildings.' },
    { id: 'm3_cd2', cat: '3: Spy Academy', name: 'Won\'t Be Attending', type: 'Classified Doc', desc: 'Table in a well-furnished room slightly east of the main bridge.' },
    { id: 'm3_cd3', cat: '3: Spy Academy', name: 'Training Scenarios', type: 'Classified Doc', desc: 'Table next to cellar key in the northern sea-jutting room.' },
    { id: 'm3_cd4', cat: '3: Spy Academy', name: 'Resource Request', type: 'Classified Doc', desc: 'Table at the very top of the eastern church sniper nest.' },
    { id: 'm3_cd5', cat: '3: Spy Academy', name: 'Armoury Exposed', type: 'Classified Doc', desc: 'Bench chair in the same room as CD2.' },
    { id: 'm3_hi1', cat: '3: Spy Academy', name: 'Kriegsmarine Playing Cards', type: 'Hidden Item', desc: 'Table inside a pub on the upper western side.' },
    { id: 'm3_hi2', cat: '3: Spy Academy', name: 'Ornate Compass', type: 'Hidden Item', desc: 'Inside the safe in the northern sea-jutting room.' },
    { id: 'm3_hi3', cat: '3: Spy Academy', name: 'Covert Ops Field Manual', type: 'Hidden Item', desc: 'Table in the downstairs recreation area opposite the diner.' },
    { id: 'm3_se1', cat: '3: Spy Academy', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Facing the beach on a south-western building.' },
    { id: 'm3_se2', cat: '3: Spy Academy', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Beneath the roof of a small turret right of the main building.' },
    { id: 'm3_se3', cat: '3: Spy Academy', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Top of a sunken tower in the northern sea.' },
    { id: 'm3_wb1', cat: '3: Spy Academy', name: 'Rifle Workbench', type: 'Workbench', desc: 'Cellar north of Kraken training room (enter from west).' },
    { id: 'm3_wb2', cat: '3: Spy Academy', name: 'SMG Workbench', type: 'Workbench', desc: 'Behind a locked resistance door east of the main square statue.' },
    { id: 'm3_wb3', cat: '3: Spy Academy', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside south-central armoury (requires Satchel Charge).' },

    // MISSION 4: WAR FACTORY
    { id: 'm4_pl1', cat: '4: War Factory', name: 'Klaus! You Idiot', type: 'Personal Letter', desc: 'Desk in a small building on the bridge towards the north-west.' },
    { id: 'm4_pl2', cat: '4: War Factory', name: 'The Suspense', type: 'Personal Letter', desc: 'On radio equipment in the control room above the generator.' },
    { id: 'm4_pl3', cat: '4: War Factory', name: 'Sheers\' Notebook', type: 'Personal Letter', desc: 'Desk in the upstairs western office at the blast furnace.' },
    { id: 'm4_pl4', cat: '4: War Factory', name: 'Losing the Time', type: 'Personal Letter', desc: 'Desk on the upper level of the northern steelworks.' },
    { id: 'm4_pl5', cat: '4: War Factory', name: 'Your Order Awaits', type: 'Personal Letter', desc: 'On a box blocking a doorway in the central factory warehouse.' },
    { id: 'm4_pl6', cat: '4: War Factory', name: 'Ehrlich\'s Done For', type: 'Personal Letter', desc: 'Desk in the main station office (south-west train station).' },
    { id: 'm4_cd1', cat: '4: War Factory', name: 'Shipping Orders', type: 'Classified Doc', desc: 'Inside safe in the shipping warehouse upstairs office.' },
    { id: 'm4_cd2', cat: '4: War Factory', name: 'No More Games', type: 'Classified Doc', desc: 'Atop wooden planks in the north-eastern construction area.' },
    { id: 'm4_cd3', cat: '4: War Factory', name: 'Bureaucratic Oaf', type: 'Classified Doc', desc: 'Table in a central upstairs room accessed via ladder.' },
    { id: 'm4_cd4', cat: '4: War Factory', name: 'Increase Security', type: 'Classified Doc', desc: 'Locked vat room table on the far eastern side.' },
    { id: 'm4_hi1', cat: '4: War Factory', name: 'Gold Pocket Watch', type: 'Hidden Item', desc: 'On a pile of wooden beams in the north-eastern scrapyard.' },
    { id: 'm4_hi2', cat: '4: War Factory', name: 'Stealth Plating', type: 'Hidden Item', desc: 'Atop stacked boxes on the shipping warehouse ground floor.' },
    { id: 'm4_hi3', cat: '4: War Factory', name: 'P.1000 Ratte Plans', type: 'Hidden Item', desc: 'End of southern walkway upstairs in the train station depot.' },
    { id: 'm4_se1', cat: '4: War Factory', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'South-eastern wall of a dilapidated turret in far east ruins.' },
    { id: 'm4_se2', cat: '4: War Factory', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Atop the blast furnace in the south-eastern corner.' },
    { id: 'm4_se3', cat: '4: War Factory', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Roof of an out-of-bounds building at the southern map tip.' },
    { id: 'm4_wb1', cat: '4: War Factory', name: 'Rifle Workbench', type: 'Workbench', desc: 'Central factory warehouse cellar (resistance safehouse).' },
    { id: 'm4_wb2', cat: '4: War Factory', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs armoury north of the shipping warehouse.' },
    { id: 'm4_wb3', cat: '4: War Factory', name: 'Pistol Workbench', type: 'Workbench', desc: 'Armoury next to the eastern vat room.' },

    // MISSION 5: FESTUNG GUERNSEY
    { id: 'm5_pl1', cat: '5: Festung Guernsey', name: 'No Need to Worry', type: 'Personal Letter', desc: 'Looted from officer near Martello Tower (south-central).' },
    { id: 'm5_pl2', cat: '5: Festung Guernsey', name: 'Getting Off the Island', type: 'Personal Letter', desc: 'Underground room beneath the north-eastern dilapidated farm outhouse.' },
    { id: 'm5_pl3', cat: '5: Festung Guernsey', name: 'Confiscated Goods', type: 'Personal Letter', desc: 'Looted from a brown-uniformed soldier at Mirus Construction Site.' },
    { id: 'm5_pl4', cat: '5: Festung Guernsey', name: 'Escaping Islanders', type: 'Personal Letter', desc: 'Table in second-floor front room of the western bunker.' },
    { id: 'm5_pl5', cat: '5: Festung Guernsey', name: 'Harass the Huns', type: 'Personal Letter', desc: 'Underground resistance safehouse near the hospital.' },
    { id: 'm5_cd1', cat: '5: Festung Guernsey', name: 'Grin and Bear It', type: 'Classified Doc', desc: 'Inside safe in Fort Hommet (climb vines outside to access room).' },
    { id: 'm5_cd2', cat: '5: Festung Guernsey', name: 'Cut Costs Cost Lives', type: 'Classified Doc', desc: 'Desk opposite safe in hidden facility Scuttle Code room.' },
    { id: 'm5_cd3', cat: '5: Festung Guernsey', name: 'Oafish Officers', type: 'Classified Doc', desc: 'Table under poster in the western hospital corridor.' },
    { id: 'm5_cd4', cat: '5: Festung Guernsey', name: 'Transport Troubles', type: 'Classified Doc', desc: 'Table in the library/radio area at the end of the hospital.' },
    { id: 'm5_cd5', cat: '5: Festung Guernsey', name: 'Drastic Measures', type: 'Classified Doc', desc: 'Table in the ground floor entrance room of the NW observation tower.' },
    { id: 'm5_hi1', cat: '5: Festung Guernsey', name: 'Todt Uniform Badge', type: 'Hidden Item', desc: 'Table in a green shed at the eastern construction area.' },
    { id: 'm5_hi2', cat: '5: Festung Guernsey', name: 'Crystal Radio', type: 'Hidden Item', desc: 'Underground room beneath central dilapidated farm (with PL2).' },
    { id: 'm5_hi3', cat: '5: Festung Guernsey', name: 'Comfort Bag', type: 'Hidden Item', desc: 'Bedroom chest of drawers, second floor of SW blue-window farmhouse.' },
    { id: 'm5_se1', cat: '5: Festung Guernsey', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Corner of the NW observation tower overlooking the sea.' },
    { id: 'm5_se2', cat: '5: Festung Guernsey', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Top of the eastern-most spire of the central church.' },
    { id: 'm5_se3', cat: '5: Festung Guernsey', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Atop the eastern Mirus Munitions Bunker.' },
    { id: 'm5_wb1', cat: '5: Festung Guernsey', name: 'Rifle Workbench', type: 'Workbench', desc: 'Climb vines to enter the central church\'s eastern spire safehouse.' },
    { id: 'm5_wb2', cat: '5: Festung Guernsey', name: 'SMG Workbench', type: 'Workbench', desc: 'In the underground safehouse near the hospital (with PL5).' },
    { id: 'm5_wb3', cat: '5: Festung Guernsey', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside an offshoot room in the northern trenches.' },

    // MISSION 6: LIBÉRATION
    { id: 'm6_pl1', cat: '6: Libération', name: 'They\'re Out There', type: 'Personal Letter', desc: 'Looted from one of two soldiers who exit a truck by the start poppy field.' },
    { id: 'm6_pl2', cat: '6: Libération', name: 'Watch Your Back', type: 'Personal Letter', desc: 'Looted from guard outside western estate (Trautmann target area).' },
    { id: 'm6_pl3', cat: '6: Libération', name: 'Barely Escaped', type: 'Personal Letter', desc: 'On a black box near the large northern artillery weapon.' },
    { id: 'm6_pl4', cat: '6: Libération', name: 'Give Me Strength', type: 'Personal Letter', desc: 'Near door inside green shed with wireframe beds (north-east).' },
    { id: 'm6_pl5', cat: '6: Libération', name: 'Vengeance Is Nigh', type: 'Personal Letter', desc: 'Next to a hole in the roof of the central abandoned outhouse.' },
    { id: 'm6_cd1', cat: '6: Libération', name: 'Hold the Line', type: 'Classified Doc', desc: 'Opposite radio equipment upstairs in the southern bridge building.' },
    { id: 'm6_cd2', cat: '6: Libération', name: 'Incoming Armour', type: 'Classified Doc', desc: 'Atop transport cases in a room branching from northern trenches.' },
    { id: 'm6_cd3', cat: '6: Libération', name: 'Unfit for Duty', type: 'Classified Doc', desc: 'Table in northern upstairs room of the western abandoned barn.' },
    { id: 'm6_cd4', cat: '6: Libération', name: 'A Surplus Bridge', type: 'Classified Doc', desc: 'On a wooden box in the yard of the eastern burnt buildings.' },
    { id: 'm6_cd5', cat: '6: Libération', name: 'Resistance Fanatic Located', type: 'Classified Doc', desc: 'Chest of drawers in locked 2nd-floor room (northern building).' },
    { id: 'm6_hi1', cat: '6: Libération', name: 'Lucky Rabbit\'s Foot', type: 'Hidden Item', desc: 'Looted from bald Nazi near central crashed plane/AA gun.' },
    { id: 'm6_hi2', cat: '6: Libération', name: 'Stolen Medals', type: 'Hidden Item', desc: 'Table in underground resistance cache beneath central L-shaped building.' },
    { id: 'm6_hi3', cat: '6: Libération', name: 'Engraved Lighter', type: 'Hidden Item', desc: 'Next to a briefcase upstairs in building right after the bridge.' },
    { id: 'm6_se1', cat: '6: Libération', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched atop the eastern windmill near the start.' },
    { id: 'm6_se2', cat: '6: Libération', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Rear of the north-western church.' },
    { id: 'm6_se3', cat: '6: Libération', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Upstairs window frame behind northern tank target.' },
    { id: 'm6_wb1', cat: '6: Libération', name: 'Rifle Workbench', type: 'Workbench', desc: 'Northern resistance safehouse (climb wall before detonated bridge).' },
    { id: 'm6_wb2', cat: '6: Libération', name: 'SMG Workbench', type: 'Workbench', desc: 'Central underground cellar (same as HI2 Stolen Medals).' },
    { id: 'm6_wb3', cat: '6: Libération', name: 'Pistol Workbench', type: 'Workbench', desc: 'Top floor room in southern C-shaped building via scaffolding.' },

    // MISSION 7: SECRET WEAPONS
    { id: 'm7_pl1', cat: '7: Secret Weapons', name: 'We Had a Deal', type: 'Personal Letter', desc: 'Upstairs table in the eastern trainyard office.' },
    { id: 'm7_pl2', cat: '7: Secret Weapons', name: 'I\'m Done', type: 'Personal Letter', desc: 'Fireplace of far-eastern abandoned house (climb pipes to enter).' },
    { id: 'm7_pl3', cat: '7: Secret Weapons', name: 'I Can\'t Work Like This', type: 'Personal Letter', desc: 'Table on steel grate near hoisting V2 rocket in lower level.' },
    { id: 'm7_pl4', cat: '7: Secret Weapons', name: 'The V2\'s Are Obsolete', type: 'Personal Letter', desc: 'Chair opposite the V2 Launch Site in the central dome.' },
    { id: 'm7_pl5', cat: '7: Secret Weapons', name: 'Thinking Outside the Box', type: 'Personal Letter', desc: 'Top of zig-zag stairs in the northern dome room.' },
    { id: 'm7_cd1', cat: '7: Secret Weapons', name: 'Inbound Deliveries', type: 'Classified Doc', desc: 'Looted from head engineer in eastern train station (or safe).' },
    { id: 'm7_cd2', cat: '7: Secret Weapons', name: 'Dr Junger\'s Schedule', type: 'Classified Doc', desc: 'Near window in SE train station building or western tent.' },
    { id: 'm7_cd3', cat: '7: Secret Weapons', name: 'A-4B Logistical Issues', type: 'Classified Doc', desc: 'Top floor locked room in the northern Weapons Lab.' },
    { id: 'm7_cd4', cat: '7: Secret Weapons', name: 'Intruder Sighted', type: 'Classified Doc', desc: 'Looted from sniper behind a tree west of the bridge.' },
    { id: 'm7_cd5', cat: '7: Secret Weapons', name: 'Pressurisation Report', type: 'Classified Doc', desc: 'Two staircases up inside the SW castle tower.' },
    { id: 'm7_hi1', cat: '7: Secret Weapons', name: 'Peenemünde Lab ID', type: 'Hidden Item', desc: 'Under a table in the canteen area exiting the V2 dome.' },
    { id: 'm7_hi2', cat: '7: Secret Weapons', name: 'Luftwaffe Playing Cards', type: 'Hidden Item', desc: 'Table inside guard house next to the blocked northern bridge.' },
    { id: 'm7_hi3', cat: '7: Secret Weapons', name: 'Prüfstand XII Plans', type: 'Hidden Item', desc: 'Rocky beach riverbank under the eastern side of the bridge.' },
    { id: 'm7_se1', cat: '7: Secret Weapons', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Among rocks south of the eastern abandoned house.' },
    { id: 'm7_se2', cat: '7: Secret Weapons', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Inside a dam filter splashing water on the lower bridge out west.' },
    { id: 'm7_se3', cat: '7: Secret Weapons', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Wall alcove opposite eastern tower in SW castle area.' },
    { id: 'm7_wb1', cat: '7: Secret Weapons', name: 'Rifle Workbench', type: 'Workbench', desc: 'Axis Armoury north of V2 rockets (requires key or charge).' },
    { id: 'm7_wb2', cat: '7: Secret Weapons', name: 'SMG Workbench', type: 'Workbench', desc: 'Locked room at end of shower corridor from V2 dome spiral stairs.' },
    { id: 'm7_wb3', cat: '7: Secret Weapons', name: 'Pistol Workbench', type: 'Workbench', desc: 'Cave behind wooden panels next to SW waterfall.' },

    // MISSION 8: RUBBLE AND RUIN
    { id: 'm8_pl1', cat: '8: Rubble and Ruin', name: 'It\'s Not Over Yet', type: 'Personal Letter', desc: 'Table in a ground floor side-room of the SE hotel.' },
    { id: 'm8_pl2', cat: '8: Rubble and Ruin', name: 'Clean Out the Sewer', type: 'Personal Letter', desc: 'Floor behind boxes left of the entrance into the sewers.' },
    { id: 'm8_pl3', cat: '8: Rubble and Ruin', name: 'He\'s Not the Sharpest', type: 'Personal Letter', desc: 'Locked box behind armoured gun on central theatre balcony.' },
    { id: 'm8_pl4', cat: '8: Rubble and Ruin', name: 'Your Man Talked', type: 'Personal Letter', desc: 'Table inside locked building in south-central bombed area.' },
    { id: 'm8_pl5', cat: '8: Rubble and Ruin', name: 'Möller Is Moving', type: 'Personal Letter', desc: 'Ground floor back room of the Sea View Offices (SE).' },
    { id: 'm8_cd1', cat: '8: Rubble and Ruin', name: 'Secure Radio Lines', type: 'Classified Doc', desc: 'Atop wooden box near three Nazis at the start restaurant.' },
    { id: 'm8_cd2', cat: '8: Rubble and Ruin', name: 'Broken Resistance', type: 'Classified Doc', desc: 'On a box directly ahead after sliding into the sewers.' },
    { id: 'm8_cd3', cat: '8: Rubble and Ruin', name: 'Resistance Report', type: 'Classified Doc', desc: 'Table in basement interrogation room (western map).' },
    { id: 'm8_cd4', cat: '8: Rubble and Ruin', name: 'Flagship Fuel Risks', type: 'Classified Doc', desc: 'Safe inside locked second-floor hotel room.' },
    { id: 'm8_cd5', cat: '8: Rubble and Ruin', name: 'Priority Pick Up', type: 'Classified Doc', desc: 'Attic floor of the western Metro Du Café starting location.' },
    { id: 'm8_hi1', cat: '8: Rubble and Ruin', name: 'Hidden Tantō', type: 'Hidden Item', desc: 'Inside chest in locked sewer room opposite entrance.' },
    { id: 'm8_hi2', cat: '8: Rubble and Ruin', name: 'I-400 V2 Hangar', type: 'Hidden Item', desc: 'Table in western 2nd-floor mainframe room at northern fuel system.' },
    { id: 'm8_hi3', cat: '8: Rubble and Ruin', name: 'An \'Original\' Adolf', type: 'Hidden Item', desc: 'Next to sleeping bag on upper church floor (climb up, then down).' },
    { id: 'm8_se1', cat: '8: Rubble and Ruin', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Far west outside boundaries, viewable from front of Sea View Offices.' },
    { id: 'm8_se2', cat: '8: Rubble and Ruin', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Far east past mission boundary, left of giant silos.' },
    { id: 'm8_se3', cat: '8: Rubble and Ruin', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Atop Yoshikawa\'s building, visible from the NW rifle workbench.' },
    { id: 'm8_wb1', cat: '8: Rubble and Ruin', name: 'Rifle Workbench', type: 'Workbench', desc: 'Armoury in first sewer combat area (loot key from troops).' },
    { id: 'm8_wb2', cat: '8: Rubble and Ruin', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs resistance armoury opposite NW Yoshikawa estate.' },
    { id: 'm8_wb3', cat: '8: Rubble and Ruin', name: 'Pistol Workbench', type: 'Workbench', desc: 'Through floor hole in NW corner of central church (crypt key needed).' },

    // MISSION 10: WOLF MOUNTAIN
    { id: 'm10_pl1', cat: '10: Wolf Mountain', name: 'Construction Halted', type: 'Personal Letter', desc: 'Inside eastern guardhouse just before the teahouse.' },
    { id: 'm10_pl2', cat: '10: Wolf Mountain', name: 'Vermin Infestation', type: 'Personal Letter', desc: 'Metal table in the back room of garage north of Berghof.' },
    { id: 'm10_pl3', cat: '10: Wolf Mountain', name: 'Führer\'s Plans', type: 'Personal Letter', desc: 'Side table in the Berghof\'s ground-floor southern kitchen.' },
    { id: 'm10_pl4', cat: '10: Wolf Mountain', name: 'Perimeter Problems', type: 'Personal Letter', desc: 'Table inside small building next to winding road before tunnel.' },
    { id: 'm10_pl5', cat: '10: Wolf Mountain', name: 'Führer\'s Personal Space', type: 'Personal Letter', desc: 'Chest of drawers in NW ground floor room of Berghof.' },
    { id: 'm10_cd1', cat: '10: Wolf Mountain', name: 'Missing Inventory', type: 'Classified Doc', desc: 'Atop boxes near tents at the SE anti-air gun.' },
    { id: 'm10_cd2', cat: '10: Wolf Mountain', name: 'Guest of the Führer', type: 'Classified Doc', desc: 'Inside side-office on the southern 2nd-floor Berghof corridor.' },
    { id: 'm10_cd3', cat: '10: Wolf Mountain', name: 'Routine Reminder', type: 'Classified Doc', desc: 'Safe in a building just before the Stone Eagle #2 tunnel.' },
    { id: 'm10_cd4', cat: '10: Wolf Mountain', name: 'Communication Operations', type: 'Classified Doc', desc: 'Wooden box at SW sniper lookout point.' },
    { id: 'm10_cd5', cat: '10: Wolf Mountain', name: 'Additional Flak Positions', type: 'Classified Doc', desc: 'Downstairs table in SW resort-like building (radio objective).' },
    { id: 'm10_hi1', cat: '10: Wolf Mountain', name: 'Führermuseum Concept Model', type: 'Hidden Item', desc: 'On a box in Berghof foyer (room with covered artwork).' },
    { id: 'm10_hi2', cat: '10: Wolf Mountain', name: 'Practice Pose Photography', type: 'Hidden Item', desc: 'Safe in Hitler\'s top-floor Berghof quarters.' },
    { id: 'm10_hi3', cat: '10: Wolf Mountain', name: 'Possible Hitler Disguises', type: 'Hidden Item', desc: 'Table in northern-most room of the eastern tearooms.' },
    { id: 'm10_se1', cat: '10: Wolf Mountain', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Eastern-facing roof of the main Berghof building.' },
    { id: 'm10_se2', cat: '10: Wolf Mountain', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Top of eastern tunnel heading to the Berghof.' },
    { id: 'm10_se3', cat: '10: Wolf Mountain', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Top of a far shed across the northern lake.' },
    { id: 'm10_wb1', cat: '10: Wolf Mountain', name: 'Rifle Workbench', type: 'Workbench', desc: 'Cellar of large SW building (requires key or Satchel).' },
    { id: 'm10_wb2', cat: '10: Wolf Mountain', name: 'SMG Workbench', type: 'Workbench', desc: 'Basement of abandoned shack near eastern anti-air gun.' },
    { id: 'm10_wb3', cat: '10: Wolf Mountain', name: 'Pistol Workbench', type: 'Workbench', desc: 'Armoury in Berghof basement (opposite bowling alley).' }
];

/* === SECTION: App State Controller === */
const appState = {
    activeHunter: 'Kevin',
    hunterData: [],
    collapsedSections: {}, 
    db: null, auth: null, user: null, unsub: null,
    isLoaded: false,

    init: async function() {
        this.hunterData = sniperData.map(item => ({ ...item, collected: false }));
        
        // Collapse all sections by default
        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        cats.forEach(cat => {
            const sid = cat.replace(/[^a-z0-9]/gi, '');
            this.collapsedSections[sid] = true;
        });

        this.render();

        try {
            const app = initializeApp(firebaseConfig);
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            const initAuth = async () => {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(this.auth, __initial_auth_token);
                } else {
                    await signInAnonymously(this.auth);
                }
            };
            await initAuth();

            onAuthStateChanged(this.auth, async (u) => {
                this.user = u;
                if (u) {
                    document.getElementById('stat-line').innerText = `ID: ${u.uid.substring(0,8)} | ONLINE`;
                    await this.bootstrapUsers();
                    this.loadHunter(this.activeHunter);
                } else {
                    document.getElementById('stat-line').innerText = `OFFLINE`;
                }
            });
        } catch (e) { 
            console.error("Firebase Init Error:", e);
        }
    },

    bootstrapUsers: async function() {
        const names = ['Kevin', 'Ray', 'TJ', 'Elu Cloud'];
        for (const name of names) {
            const path = `artifacts/${appId}/public/data/sniper_elite_5/${name}`;
            const docRef = doc(this.db, path);
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                await setDoc(docRef, { 
                    initialized: true, 
                    hunterName: name, 
                    progress: sniperData.map(i => ({ id: i.id, collected: false })) 
                });
            }
        }
    },

    loadHunter: function(name) {
        this.activeHunter = name;
        document.getElementById('hunter-display').innerText = name.toUpperCase();
        
        const theme = userThemes[name] || userThemes['Kevin'];
        document.documentElement.style.setProperty('--ser-color', theme.color);
        document.documentElement.style.setProperty('--ser-glow', theme.glow);

        document.querySelectorAll('.profile-btn').forEach(b => {
            b.classList.toggle('active-btn', b.innerText === name);
        });

        if (this.unsub) this.unsub();
        if (!this.user) return;

        this.isLoaded = false;
        this.render();

        const path = `artifacts/${appId}/public/data/sniper_elite_5/${name}`;
        const docRef = doc(this.db, path);
        
        this.unsub = onSnapshot(docRef, (snap) => {
            this.isLoaded = true;
            if (snap.exists()) {
                const saved = snap.data().progress || [];
                this.hunterData = sniperData.map(item => {
                    const status = saved.find(s => s.id === item.id);
                    return { ...item, collected: status ? status.collected : false };
                });
            }
            this.render();
        }, (error) => {
            console.error("Snapshot error:", error);
            this.isLoaded = true;
            this.render();
        });
    },

    render: function() {
        const container = document.getElementById('section-container');
        
        if (!this.isLoaded) {
            document.getElementById('overall-bar').style.width = '0%';
            document.getElementById('percent-text').innerText = `SYNCING DATA...`;
            container.innerHTML = '<div style="text-align:center; padding: 50px 20px; color: var(--ser-color); font-weight: 900; letter-spacing: 2px; font-size: 18px;" class="outlined-text">ESTABLISHING SECURE LINK...<br><span style="font-size:12px; color:#aaa;">READING FROM FIREBASE</span></div>';
            return;
        }

        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        let totalFound = 0;

        cats.forEach(cat => {
            const rawItems = this.hunterData.filter(i => i.cat === cat);
            const count = rawItems.filter(i => i.collected).length;
            totalFound += count;

            // Strict In-Game Category Sorting:
            // 1. Personal Letter -> 2. Classified Doc -> 3. Hidden Item -> 4. Workbench -> 5. Stone Eagle
            const items = [...rawItems].sort((a, b) => {
                const orderA = IN_GAME_TYPE_ORDER[a.type] || 99;
                const orderB = IN_GAME_TYPE_ORDER[b.type] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.id.localeCompare(b.id);
            });

            const sid = cat.replace(/[^a-z0-9]/gi, '');
            const section = document.createElement('div');
            section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''}`;
            section.innerHTML = `
                <div class="category-header outlined-text" onclick="appState.toggleSection('${sid}')">
                    <h2>${cat}</h2>
                    <div style="font-weight:900; font-size: 14px; color: var(--ser-color);">${count}/${items.length}</div>
                </div>
                <div class="section-content">
                    <div class="item-grid"></div>
                </div>
            `;

            const grid = section.querySelector('.item-grid');
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `item-card ${item.collected ? 'completed' : ''}`;
                card.innerHTML = `
                    <div>
                        <div class="item-type-tag">${item.type}</div>
                        <div class="outlined-text" style="font-weight:900; font-size:14px; margin-bottom:4px;">${item.name}</div>
                        <div class="outlined-text" style="font-size:11px; color:#ddd; font-style:italic; line-height:1.2;">${item.desc}</div>
                        ${item.reward ? `<span class="reward-tag outlined-text">${item.reward}</span>` : ''}
                    </div>
                    ${item.collected ? `<div class="lock-badge outlined-text">COLLECTED</div>` : `<button class="toggle-btn outlined-text" onclick="appState.toggleItem('${item.id}')">Confirm Found</button>`}
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const percent = Math.round((totalFound / this.hunterData.length) * 100) || 0;
        document.getElementById('overall-bar').style.width = percent + '%';
        document.getElementById('percent-text').innerText = `TOTAL COLLECTION: ${percent}%`;
    },

    toggleItem: async function(id) {
        const item = this.hunterData.find(i => i.id === id);
        item.collected = !item.collected;
        this.render(); 
        this.sync();
    },

    toggleSection: function(id) {
        this.collapsedSections[id] = !this.collapsedSections[id];
        this.render();
    },

    switchHunter: function(name) { this.loadHunter(name); },

    sync: async function() {
        if (!this.user) return;
        const path = `artifacts/${appId}/public/data/sniper_elite_5/${this.activeHunter}`;
        const progress = this.hunterData.map(i => ({ id: i.id, collected: i.collected }));
        await setDoc(doc(this.db, path), { progress, lastUpdate: Date.now() }, { merge: true });
    }
};

window.appState = appState;
appState.init();

/* === SECTION: CSV Spreadsheet Parser & Top Menu Builder === */
async function buildTopMenu() {
    try {
        const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";
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

// Dropdown Toggle Event Delegation
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

// Initialize CSV Navigation Menu
buildTopMenu();
