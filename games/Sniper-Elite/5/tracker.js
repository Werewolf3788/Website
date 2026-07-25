/*
 * ==========================================
 * VERSION TIMESTAMP: Fri, July 24, 2026, 9:45 PM EDT
 * SYSTEM: Dynamic Universal Multi-User Sniper Elite 5 Tracker (tracker.js)
 * ARCHITECTURE: Path Hierarchy by User Name -> Game ID (/users/{userId}/progress/sniper-elite-5)
 * DEFAULT STATE: Sections closed by default on initial page load
 * ==========================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:fc70f96b04d0380a9aa692"
};

const GAME_ID = 'sniper-elite-5';

// --- DYNAMIC ALIAS & DOCUMENT MAP ---
const USER_DATA_MAP = {
    'werewolf3788': 'Werewolf3788',
    'Werewolf3788': 'Werewolf3788',
    
    'ray': 'Raymystyro',
    'Ray': 'Raymystyro',
    'raymystyro': 'Raymystyro',
    'Raymystyro': 'Raymystyro',
    
    'tj': 'terrdog420',
    'TJ': 'terrdog420',
    'terdog420': 'terrdog420',
    'terrdog420': 'terrdog420',
    'Terrdog420': 'terrdog420',
    
    'desdemonatiger': 'DesdemonaTiger',
    'DesdemonaTiger': 'DesdemonaTiger'
};

const sniperData = [
    // MISSION 1: THE ATLANTIC WALL
    { id: 'm1_pl1', cat: '1: The Atlantic Wall', name: 'Picked Some Violets', type: 'Personal Letter', desc: 'North-east map sector, on a chest inside a single building guarded by 2 soldiers.' },
    { id: 'm1_pl2', cat: '1: The Atlantic Wall', name: 'Upcoming Delivery', type: 'Personal Letter', desc: 'Central farm, inside the southern farmhouse upstairs; climb the attic ladder.' },
    { id: 'm1_pl3', cat: '1: The Atlantic Wall', name: 'Violets Are Wilting', type: 'Personal Letter', desc: 'Northern sector building near the AA gun objective; found upstairs in the attic.' },
    { id: 'm1_pl4', cat: '1: The Atlantic Wall', name: 'Violets Don\'t Wilt', type: 'Personal Letter', desc: 'Town hotel upstairs bedroom; locked inside the wall safe (requires code or charge).' },
    { id: 'm1_pl5', cat: '1: The Atlantic Wall', name: 'Pests in the Garden', type: 'Personal Letter', desc: 'Far south-west promenade tip, inside the open pagoda structure near rocket launchers.' },
    { id: 'm1_pl6', cat: '1: The Atlantic Wall', name: 'Boches at the Door', type: 'Personal Letter', desc: 'Inside Marcel\'s resistance house on the ground floor sofa.' },
    { id: 'm1_cd1', cat: '1: The Atlantic Wall', name: 'Resistance Captured', type: 'Classified Doc', desc: 'Bathhouse main objective item; automatically acquired during infiltration.' },
    { id: 'm1_cd2', cat: '1: The Atlantic Wall', name: 'Beach Defences', type: 'Classified Doc', desc: 'North-west corner armory building; locked inside the office safe.' },
    { id: 'm1_cd3', cat: '1: The Atlantic Wall', name: 'Lacking Air Support', type: 'Classified Doc', desc: 'Inside the generator bunker safe; requires a satchel charge to open.' },
    { id: 'm1_cd4', cat: '1: The Atlantic Wall', name: 'Atlantikwall Report', type: 'Classified Doc', desc: 'Northern AA gun sector building; downstairs office safe.' },
    { id: 'm1_hi1', cat: '1: The Atlantic Wall', name: 'Resistance Photo', type: 'Hidden Item', desc: 'South-west town sector, upstairs bedroom inside the Pharmacie building.' },
    { id: 'm1_hi2', cat: '1: The Atlantic Wall', name: 'Radio Tin', type: 'Hidden Item', desc: 'Central farm compound, located directly inside the animal stables.' },
    { id: 'm1_hi3', cat: '1: The Atlantic Wall', name: 'FFI Flag', type: 'Hidden Item', desc: 'Far west edge of the map, on the ground floor kitchen counter.' },
    { id: 'm1_se1', cat: '1: The Atlantic Wall', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'North-east map border; perched on a red-tiled chimney outside the play area.' },
    { id: 'm1_se2', cat: '1: The Atlantic Wall', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'South-west town sector; visible on the roof ridge of the coastal hotel.' },
    { id: 'm1_se3', cat: '1: The Atlantic Wall', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'South-east bunker beach; perched on the roof peak of the Vantage Point building.' },
    { id: 'm1_wb1', cat: '1: The Atlantic Wall', name: 'Rifle Workbench', type: 'Workbench', desc: 'Inside the locked room of the Vantage Point building.' },
    { id: 'm1_wb2', cat: '1: The Atlantic Wall', name: 'SMG Workbench', type: 'Workbench', desc: 'Marcel\'s resistance house attic floor; access via external wall vines.' },
    { id: 'm1_wb3', cat: '1: The Atlantic Wall', name: 'Pistol Workbench', type: 'Workbench', desc: 'North-west corner locked armory compound room.' },

    // MISSION 2: OCCUPIED RESIDENCE
    { id: 'm2_pl1', cat: '2: Occupied Residence', name: 'Do Not Fail Me, Nephew.', type: 'Personal Letter', desc: 'Chateau first floor, sitting on a desk inside the small office with red carpet.' },
    { id: 'm2_pl2', cat: '2: Occupied Residence', name: 'Need A Scapegoat', type: 'Personal Letter', desc: 'Chateau first floor, on a table directly at the foot of the bedroom bed.' },
    { id: 'm2_pl3', cat: '2: Occupied Residence', name: 'Brother, I Have A Plan.', type: 'Personal Letter', desc: 'Chateau top floor, on a nightstand in the servant\'s quarters dorm room.' },
    { id: 'm2_pl4', cat: '2: Occupied Residence', name: 'Good Plan, Let\'s Do It.', type: 'Personal Letter', desc: 'Inside the sniper outpost tower north of the chateau courtyard.' },
    { id: 'm2_cd1', cat: '2: Occupied Residence', name: 'Orders of the Day', type: 'Classified Doc', desc: 'Chateau first floor office. Alternates: Western tent, central outpost, or Woodland Ford.' },
    { id: 'm2_cd2', cat: '2: Occupied Residence', name: 'Renovations Completed', type: 'Classified Doc', desc: 'Chateau first floor, on the primary desk inside Möller\'s main office.' },
    { id: 'm2_cd3', cat: '2: Occupied Residence', name: 'Operation Kraken', type: 'Classified Doc', desc: 'Inside Möller\'s hidden wall study; reveal by interacting with office secret triggers.' },
    { id: 'm2_cd4', cat: '2: Occupied Residence', name: 'New Orders, Effective Immediately', type: 'Classified Doc', desc: 'Inside the locked weapons chamber at the north-east Waffenkammer building.' },
    { id: 'm2_cd5', cat: '2: Occupied Residence', name: 'Immediate Request For Attic Repairs', type: 'Classified Doc', desc: 'North-east Waffenkammer building table. Alternate: Chateau top floor padlock door.' },
    { id: 'm2_cd6', cat: '2: Occupied Residence', name: 'Grateful, Thanks.', type: 'Classified Doc', desc: 'Sitting directly on the desk inside Möller\'s secret document study room.' },
    { id: 'm2_hi1', cat: '2: Occupied Residence', name: 'Old Man Statuette', type: 'Hidden Item', desc: 'Chateau first floor bedroom; open the safe hidden behind the wall painting.' },
    { id: 'm2_hi2', cat: '2: Occupied Residence', name: 'Group Statuette', type: 'Hidden Item', desc: 'Chateau top floor servant room chest; unlockable via standard lockpicks.' },
    { id: 'm2_hi3', cat: '2: Occupied Residence', name: 'Soldier Statuette', type: 'Hidden Item', desc: 'Looted from the body of the Sniper positioned in the north tower outpost.' },
    { id: 'm2_se1', cat: '2: Occupied Residence', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched on the roof apex of the munitions farmhouse in the north-west.' },
    { id: 'm2_se2', cat: '2: Occupied Residence', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Look west from the central river bridge; sits on the jagged river cliffs.' },
    { id: 'm2_se3', cat: '2: Occupied Residence', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Sits on the roof ridge of the stone outbuilding north of the chateau.' },
    { id: 'm2_wb1', cat: '2: Occupied Residence', name: 'Rifle Workbench', type: 'Workbench', desc: 'Chateau basement cellar; access via the ramp in the south-east courtyard.' },
    { id: 'm2_wb2', cat: '2: Occupied Residence', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs room of the house west of the chateau; access via external wall vines.' },
    { id: 'm2_wb3', cat: '2: Occupied Residence', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside the locked weapon vault room at the north-east Waffenkammer building.' },

    // MISSION 3: SPY ACADEMY
    { id: 'm3_pl1', cat: '3: Spy Academy', name: 'Parking Problems', type: 'Personal Letter', desc: 'South-west town gate area, resting on top of a trash bin next to a white staff car.' },
    { id: 'm3_pl2', cat: '3: Spy Academy', name: 'Fragile, Do Not Break.', type: 'Personal Letter', desc: 'At the southern end of a long road leading to the town.' },
    { id: 'm3_pl3', cat: '3: Spy Academy', name: 'Do Not Be Late!', type: 'Personal Letter', desc: 'Looted from an enemy with a triangle-shaped hat patrolling west of the white car.' },
    { id: 'm3_pl4', cat: '3: Spy Academy', name: 'It\'s Easy Money', type: 'Personal Letter', desc: 'On a desk inside the stone sniper defense tower along the north-east wall.' },
    { id: 'm3_pl5', cat: '3: Spy Academy', name: 'Just Attend One!', type: 'Personal Letter', desc: 'Looted from the commanding officer at the very top of the eastern church belltower.' },
    { id: 'm3_cd1', cat: '3: Spy Academy', name: 'Priority Package!', type: 'Classified Doc', desc: 'On a counter inside the guardhouse next to the road checkpoint barrier.' },
    { id: 'm3_cd2', cat: '3: Spy Academy', name: 'Won\'t Be Attending', type: 'Classified Doc', desc: 'South-east section town building top floor room; resting on a table.' },
    { id: 'm3_cd3', cat: '3: Spy Academy', name: 'Training Scenarios', type: 'Classified Doc', desc: 'Found sitting directly on the desk inside the Spy Master\'s upper office.' },
    { id: 'm3_cd4', cat: '3: Spy Academy', name: 'Resource Request', type: 'Classified Doc', desc: 'Top floor room of the eastern church belltower, near the sniper position.' },
    { id: 'm3_cd5', cat: '3: Spy Academy', name: 'Armoury Exposed.', type: 'Classified Doc', desc: 'South-east section town building top floor room; resting on the couch.' },
    { id: 'm3_hi1', cat: '3: Spy Academy', name: 'Kriegsmarine Playing Cards', type: 'Hidden Item', desc: 'On a tavern table inside the drinking establishment in the western town sector.' },
    { id: 'm3_hi2', cat: '3: Spy Academy', name: 'Ornate Compass', type: 'Hidden Item', desc: 'Locked inside the wall safe within the upper Spy Master\'s Office room.' },
    { id: 'm3_hi3', cat: '3: Spy Academy', name: 'Covert Ops Field Manual', type: 'Hidden Item', desc: 'Northern sector large training hall; resting on a ground floor table.' },
    { id: 'm3_se1', cat: '3: Spy Academy', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Look back at the distant island castle from the southern beach starting view.' },
    { id: 'm3_se2', cat: '3: Spy Academy', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Sits on the side architectural tier of a small tower near the central town road.' },
    { id: 'm3_se3', cat: '3: Spy Academy', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Perched on top of sunken tower ruins in the water, in the very north.' },
    { id: 'm3_wb1', cat: '3: Spy Academy', name: 'Rifle Workbench', type: 'Workbench', desc: 'Northern castle ramparts room; clear the padlock or climb outer wall vines.' },
    { id: 'm3_wb2', cat: '3: Spy Academy', name: 'SMG Workbench', type: 'Workbench', desc: 'Ground floor of the central road building; open the padlocked door or climb in.' },
    { id: 'm3_wb3', cat: '3: Spy Academy', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside the secure weapons chamber vault of the Waffenkammer building.' },

    // MISSION 4: WAR FACTORY
    { id: 'm4_pl1', cat: '4: War Factory', name: 'Klaus! You Idiot!', type: 'Personal Letter', desc: 'On a table inside the gatehouse office at the eastern side of the dam walls.' },
    { id: 'm4_pl2', cat: '4: War Factory', name: 'The Suspense', type: 'Personal Letter', desc: 'Upstairs in the Machine Control Room building located at the far north edge.' },
    { id: 'm4_pl3', cat: '4: War Factory', name: 'Sheer\'s Notebook', type: 'Personal Letter', desc: 'West side of the Blast Furnace structure, upstairs inside the furnace area.' },
    { id: 'm4_pl4', cat: '4: War Factory', name: 'Losing The Time', type: 'Personal Letter', desc: 'Upstairs side room at the northern tip of the central factory warehouse hall.' },
    { id: 'm4_pl5', cat: '4: War Factory', name: 'Your Order Awaits', type: 'Personal Letter', desc: 'Ground floor corner desk inside the large industrial foundry warehouse.' },
    { id: 'm4_pl6', cat: '4: War Factory', name: 'Ehrlich\'s Done For', type: 'Personal Letter', desc: 'Behind the locked door inside the southwestern Trainyard Office room.' },
    { id: 'm4_cd1', cat: '4: War Factory', name: 'Shipping Orders', type: 'Classified Doc', desc: 'Logistics office safe item; mandatory main objective clear requirement.' },
    { id: 'm4_cd2', cat: '4: War Factory', name: 'No More Games.', type: 'Classified Doc', desc: 'Northern map scrapyard; sitting out in the open on a pile of raw logs.' },
    { id: 'm4_cd3', cat: '4: War Factory', name: 'Bureaucratic Oaf!', type: 'Classified Doc', desc: 'On a small desk inside the office shanty built near the wooden watchtower.' },
    { id: 'm4_cd4', cat: '4: War Factory', name: 'Increase Security!', type: 'Classified Doc', desc: 'Inside the locked ground floor side office of the Smelting Vat building.' },
    { id: 'm4_hi1', cat: '4: War Factory', name: 'Gold Pocket Watch', type: 'Hidden Item', desc: 'Northern scrapyard floor, sitting on structural metal beams near the alarm box.' },
    { id: 'm4_hi2', cat: '4: War Factory', name: 'Stealth Plating', type: 'Hidden Item', desc: 'Ground floor of the Logistics Office depot; resting on a wooden crate.' },
    { id: 'm4_hi3', cat: '4: War Factory', name: 'P.1000 Ratte Plans', type: 'Hidden Item', desc: 'Upstairs walkway tracking along the southern edge of the main locomotive hall.' },
    { id: 'm4_se1', cat: '4: War Factory', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched on old castle stone ruins viewable across the river along the west edge.' },
    { id: 'm4_se2', cat: '4: War Factory', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Sits on the roof apex of the circular red furnace building in the southeast.' },
    { id: 'm4_se3', cat: '4: War Factory', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Perched on the roof peak of the massive red brick factory by the southeast exit.' },
    { id: 'm4_wb1', cat: '4: War Factory', name: 'Rifle Workbench', type: 'Workbench', desc: 'Basement cellar of the industrial foundry warehouse; lockpick upper entry door.' },
    { id: 'm4_wb2', cat: '4: War Factory', name: 'SMG Workbench', type: 'Workbench', desc: 'Upstairs storage loft north of Logistics; use a satchel charge or officer key.' },
    { id: 'm4_wb3', cat: '4: War Factory', name: 'Pistol Workbench', type: 'Workbench', desc: 'Inside the ground floor secure vault room of the Smelting Vat building.' },

    // MISSION 5: FESTUNG GUERNSEY
    { id: 'm5_pl1', cat: '5: Festung Guernsey', name: 'No Need to Worry', type: 'Personal Letter', desc: 'Looted from the officer stationed inside the southeastern Martello defense tower.' },
    { id: 'm5_pl2', cat: '5: Festung Guernsey', name: 'Getting Off The Island.', type: 'Personal Letter', desc: 'In the underground concrete bunker room hidden below the small central farmhouse.' },
    { id: 'm5_pl3', cat: '5: Festung Guernsey', name: 'Confiscated Goods', type: 'Personal Letter', desc: 'Looted from the brown-uniform target patrolling the Mirus construction pit.' },
    { id: 'm5_pl4', cat: '5: Festung Guernsey', name: 'Escaping Islanders', type: 'Personal Letter', desc: 'Upstairs defensive platform room inside the large southwestern bunker.' },
    { id: 'm5_pl5', cat: '5: Festung Guernsey', name: 'Harass The Huns!', type: 'Personal Letter', desc: 'Hospital sector safehouse basement; crawl under the table to access the ladder.' },
    { id: 'm5_cd1', cat: '5: Festung Guernsey', name: 'Grin and Bear It!', type: 'Classified Doc', desc: 'Fort Hommet bunker safe item; climb external wall vines or use AP ammo on lock.' },
    { id: 'm5_cd2', cat: '5: Festung Guernsey', name: 'Cut Costs Cost Lives', type: 'Classified Doc', desc: 'Western main battery facility; resting on a desk directly in front of the core safe.' },
    { id: 'm5_cd3', cat: '5: Festung Guernsey', name: 'Oafish Officers', type: 'Classified Doc', desc: 'On a desk inside a side office tracking the west corridor of the underground hospital.' },
    { id: 'm5_cd4', cat: '5: Festung Guernsey', name: 'Transport Troubles', type: 'Classified Doc', desc: 'Underground hospital northern sector; main objective item (unmissable).' },
    { id: 'm5_cd5', cat: '5: Festung Guernsey', name: 'Drastic Measures', type: 'Classified Doc', desc: 'Western map zone; resting on a ground floor table inside the high observation tower.' },
    { id: 'm5_hi1', cat: '5: Festung Guernsey', name: 'Todt Uniform Badge', type: 'Hidden Item', desc: 'Inside the green tool shanty built along the upper tier of the Mirus site.' },
    { id: 'm5_hi2', cat: '5: Festung Guernsey', name: 'Crystal Radio', type: 'Hidden Item', desc: 'In the underground concrete bunker room hidden below the small central farmhouse.' },
    { id: 'm5_hi3', cat: '5: Festung Guernsey', name: 'Comfort Bag', type: 'Hidden Item', desc: 'Upstairs bedroom closet area inside the primary residential farmhouse.' },
    { id: 'm5_se1', cat: '5: Festung Guernsey', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched on the highest concrete peak of the central stone church tower.' },
    { id: 'm5_se2', cat: '5: Festung Guernsey', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Sits on a high stone retaining bank running parallel to the northeastern main road.' },
    { id: 'm5_se3', cat: '5: Festung Guernsey', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Perched directly on top of the western coastal defense observation tower structure.' },
    { id: 'm5_wb1', cat: '5: Festung Guernsey', name: 'Rifle Workbench', type: 'Workbench', desc: 'Inside the high church tower loft; scale the external wall vines to enter.' },
    { id: 'm5_wb2', cat: '5: Festung Guernsey', name: 'SMG Workbench', type: 'Workbench', desc: 'Hospital sector safehouse basement; crawl under the table entry corridor.' },
    { id: 'm5_wb3', cat: '5: Festung Guernsey', name: 'Pistol Workbench', type: 'Workbench', desc: 'Tucked inside a concrete trench segment right next to the northern AA gun.' },

    // MISSION 6: LIBÉRATION
    { id: 'm6_pl1', cat: '6: Libération', name: 'They\'re Out There', type: 'Personal Letter', desc: 'Looted from the bald, green-uniformed soldier in the southeastern farmhouse yard.' },
    { id: 'm6_pl2', cat: '6: Libération', name: 'Watch Your Back', type: 'Personal Letter', desc: 'Looted from the estate guard patrolling outside Major Trautmann\'s manor yard.' },
    { id: 'm6_pl3', cat: '6: Libération', name: 'Barely Escaped!', type: 'Personal Letter', desc: 'Northern artillery field fortifications; resting inside the trench network.' },
    { id: 'm6_pl4', cat: '6: Libération', name: 'Give Me Strength', type: 'Personal Letter', desc: 'Northeastern sector green barracks house; on a crate by the door frames.' },
    { id: 'm6_pl5', cat: '6: Libération', name: 'Vengeance Is Nigh!', type: 'Personal Letter', desc: 'Central farm sector; hidden upstairs inside the attic space of the old barn house.' },
    { id: 'm6_cd1', cat: '6: Libération', name: 'Hold The Line', type: 'Classified Doc', desc: 'Southern bridge sector; on a desk inside the primary radio communication bunker room.' },
    { id: 'm6_cd2', cat: '6: Libération', name: 'Incoming Armour', type: 'Classified Doc', desc: 'Northern trenches; resting on an equipment case inside a dug-out dugout node.' },
    { id: 'm6_cd3', cat: '6: Libération', name: 'Unfit for Duty', type: 'Classified Doc', desc: 'Southern farm cluster; found on an upper-floor bedroom nightstand.' },
    { id: 'm6_cd4', cat: '6: Libération', name: 'A Surplus Bridge', type: 'Classified Doc', desc: 'Eastern farmstead compound; resting out in the open yard on a wooden shipping box.' },
    { id: 'm6_cd5', cat: '6: Libération', name: 'Resistance Fanatic Located', type: 'Classified Doc', desc: 'Northwest sniper town; lockpick the locked upper room of the easternmost town block.' },
    { id: 'm6_hi1', cat: '6: Libération', name: 'Lucky Rabbit\'s Foot', type: 'Hidden Item', desc: 'Looted from the body of the green-uniformed soldier guarding the crashed aircraft.' },
    { id: 'm6_hi2', cat: '6: Libération', name: 'Stolen Medals', type: 'Hidden Item', desc: 'Central river house cache; pry open the loose ground floor boards to drop down.' },
    { id: 'm6_hi3', cat: '6: Libération', name: 'Engraved Lighter', type: 'Hidden Item', desc: 'Tiger tank sector house; upstairs on a bedroom nightstand right next to a briefcase.' },
    { id: 'm6_se1', cat: '6: Libération', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Sits on top of the wooden windmill structure in the southeastern poppy fields.' },
    { id: 'm6_se2', cat: '6: Libération', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Perched on the rear architecture roof peak of the ruined northwestern stone church.' },
    { id: 'm6_se3', cat: '6: Libération', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Tiger tank crossroad; sitting in the window alcove of the blown-out upper wall ruins.' },
    { id: 'm6_wb1', cat: '6: Libération', name: 'Rifle Workbench', type: 'Workbench', desc: 'Top floor of the fortification structure flanking the northern bridge explosion zone.' },
    { id: 'm6_wb2', cat: '6: Libération', name: 'SMG Workbench', type: 'Workbench', desc: 'Central river house cache; pry up loose floorboards to access the secret basement.' },
    { id: 'm6_wb3', cat: '6: Libération', name: 'Pistol Workbench', type: 'Workbench', desc: 'Southern sector tower block; scale roof tiles and drop through the broken attic gap.' },

    // MISSION 7: SECRET WEAPONS
    { id: 'm7_pl1', cat: '7: Secret Weapons', name: 'We Had a Deal', type: 'Personal Letter', desc: 'Eastern trainyard station office; sitting on the main desk directly in front of the safe.' },
    { id: 'm7_pl2', cat: '7: Secret Weapons', name: 'I\'m Done', type: 'Personal Letter', desc: 'Eastern abandoned house; scale external wall drainage pipe to access the upper room floor.' },
    { id: 'm7_pl3', cat: '7: Secret Weapons', name: 'I Can\'t Work Like This', type: 'Personal Letter', desc: 'Lake compound hangar; pinned to the side paneling of the hanging blue V2 rocket fuselage.' },
    { id: 'm7_pl4', cat: '7: Secret Weapons', name: 'The V2\'s Are Obsolete!', type: 'Personal Letter', desc: 'Guidance sector block bunker peak room; access via key looted from central platform officer.' },
    { id: 'm7_pl5', cat: '7: Secret Weapons', name: 'Thinking Outside The Box', type: 'Personal Letter', desc: 'Northern dome structure; follow the internal winding metal stairs to the top control tier.' },
    { id: 'm7_cd1', cat: '7: Secret Weapons', name: 'Inbound Deliveries', type: 'Classified Doc', desc: 'Looted from the brown-uniform target patrolling the locomotive engine rail tracking yard.' },
    { id: 'm7_cd2', cat: '7: Secret Weapons', name: 'Dr Jungers\' Schedule', type: 'Classified Doc', desc: 'Looted straight from the lab coat of Christian Jungers inside the VIP Weapons Lab.' },
    { id: 'm7_cd3', cat: '7: Secret Weapons', name: 'A-4B Logistical Issues', type: 'Classified Doc', desc: 'VIP Weapons Lab upper blueprint room; sitting out on the main blueprint table layout.' },
    { id: 'm7_cd4', cat: '7: Secret Weapons', name: 'Intruder Sighted', type: 'Classified Doc', desc: 'Looted from the dispatch motorcycle scout arriving at the default valley infiltration trail.' },
    { id: 'm7_cd5', cat: '7: Secret Weapons', name: 'Pressurisation Report', type: 'Classified Doc', desc: 'Southwest outpost station; dismantle tower layout boards or use an officer key.' },
    { id: 'm7_hi1', cat: '7: Secret Weapons', name: 'Peenemünde Lab ID', type: 'Hidden Item', desc: 'Northern dome structure cellar floor; crawl under the cafeteria canteen dining table.' },
    { id: 'm7_hi2', cat: '7: Secret Weapons', name: 'Luftwaffe Playing Cards', type: 'Hidden Item', desc: 'Northwest sector bridge security station; sitting out on the internal check office table.' },
    { id: 'm7_hi3', cat: '7: Secret Weapons', name: 'Prüfstand XII Plans', type: 'Hidden Item', desc: 'Southwest riverbank sector; resting on a rock shelf directly underneath the stone bridge vault.' },
    { id: 'm7_se1', cat: '7: Secret Weapons', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched on a rocky hill outcrop directly south of the eastern abandoned safehouse cabin.' },
    { id: 'm7_se2', cat: '7: Secret Weapons', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Look inside the middle drainage gate pipe spewing water from the northwest rail dam.' },
    { id: 'm7_se3', cat: '7: Secret Weapons', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Southwest military complex yard; scale wall vines and look tracking across the tower face.' },
    { id: 'm7_wb1', cat: '7: Secret Weapons', name: 'Rifle Workbench', type: 'Workbench', desc: 'Northwest compound armory; smash the floorboards from above or blow entry doors open.' },
    { id: 'm7_wb2', cat: '7: Secret Weapons', name: 'SMG Workbench', type: 'Workbench', desc: 'Northern dome structure corridor; unlock the side vault doors using keys from cellar details.' },
    { id: 'm7_wb3', cat: '7: Secret Weapons', name: 'Pistol Workbench', type: 'Workbench', desc: 'Southwest river waterfall compound; dismantle the hidden cache boards to enter the cave.' },

    // MISSION 8: RUBBLE AND RUIN
    { id: 'm8_pl1', cat: '8: Rubble and Ruin', name: 'It\'s Not Over Yet!', type: 'Personal Letter', desc: 'South-east hotel, ground floor; found inside a side office sitting on a table.' },
    { id: 'm8_pl2', cat: '8: Rubble and Ruin', name: 'Clean Out the Sewer', type: 'Personal Letter', desc: 'Sewer track entry tunnel floor; sitting on the floor directly left behind a box crate.' },
    { id: 'm8_pl3', cat: '8: Rubble and Ruin', name: 'He\'s Not The Sharpest', type: 'Personal Letter', desc: 'Burned theater segment upper tier; open the locked chest box utilizing a local crowbar.' },
    { id: 'm8_pl4', cat: '8: Rubble and Ruin', name: 'Your Man Talked!', type: 'Personal Letter', desc: 'South-west building upper locked room floor; scale the external side ladder path.' },
    { id: 'm8_pl5', cat: '8: Rubble and Ruin', name: 'Möller Is Moving!', type: 'Personal Letter', desc: 'South-east sector, ground floor room counter inside the Sea View Offices asset building.' },
    { id: 'm8_cd1', cat: '8: Rubble and Ruin', name: 'Secure Radio Lines', type: 'Classified Doc', desc: 'Default street spawn point; resting on top of a supply box left of the 3 troopers.' },
    { id: 'm8_cd2', cat: '8: Rubble and Ruin', name: 'Broken Resistance', type: 'Classified Doc', desc: 'South-west slide building; resting inside the office room immediately after sliding down.' },
    { id: 'm8_cd3', cat: '8: Rubble and Ruin', name: 'Resistance Report', type: 'Classified Doc', desc: 'Basement Interrogation Room layout; slip through the tunnel hole breakout section.' },
    { id: 'm8_cd4', cat: '8: Rubble and Ruin', name: 'Flagship Fuel Risks', type: 'Classified Doc', desc: 'Hotel upper floor room office safe; use the code from Letter #1 or a satchel charge.' },
    { id: 'm8_cd5', cat: '8: Rubble and Ruin', name: 'Priority Pick Up', type: 'Classified Doc', desc: 'West map sector building; climb the side layout walls to enter the hidden attic loft area.' },
    { id: 'm8_hi1', cat: '8: Rubble and Ruin', name: 'Stolen Tanto', type: 'Hidden Item', desc: 'Sewer secure vault area; pop open the locked storage chest utilizing a crowbar.' },
    { id: 'm8_hi2', cat: '8: Rubble and Ruin', name: 'I-400 V2 Hangar', type: 'Hidden Item', desc: 'Submarine dock structure, upstairs floor table immediately above the switch layout vault.' },
    { id: 'm8_hi3', cat: '8: Rubble and Ruin', name: 'An "Original" Adolf', type: 'Hidden Item', desc: 'Church layout tower mezzanine; scale the structural ladders and jump to the mid-tier beam.' },
    { id: 'm8_se1', cat: '8: Rubble and Ruin', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'South-west border exterior building; track alignment behind the red promenade cart.' },
    { id: 'm8_se2', cat: '8: Rubble and Ruin', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'North-east border layout rooftops; look past boundaries tracking east of the sewer entry.' },
    { id: 'm8_se3', cat: '8: Rubble and Ruin', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Town Hall building structural front facade peak; directly centered above the entry vault.' },
    { id: 'm8_wb1', cat: '8: Rubble and Ruin', name: 'Rifle Workbench', type: 'Workbench', desc: 'Sewer corridor armory vault room; loot keys from the two guards tracking the portal.' },
    { id: 'm8_wb2', cat: '8: Rubble and Ruin', name: 'SMG Workbench', type: 'Workbench', desc: 'West sector building attic loft; run and jump across the broken gap framework.' },
    { id: 'm8_wb3', cat: '8: Rubble and Ruin', name: 'Pistol Workbench', type: 'Workbench', desc: 'Church crypt floor section; drop through the broken northwestern tile floor gap.' },

    // MISSION 9: LOOSE ENDS (Trophies & Challenge Kills)
    { id: 'm9_tr1', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Brains of the Operation', type: 'Trophy / Challenge', desc: 'Kill Möller with a headshot. Customize rifle with high zoom on Civilian difficulty.' },
    { id: 'm9_tr2', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Can\'t Outrun A Bullet', type: 'Trophy / Challenge', desc: 'Kill Möller with a rifle at 600m+.' },
    { id: 'm9_tr3', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Sight Beyond Sights', type: 'Trophy / Challenge', desc: 'Kill Möller with a rifle while in Iron Sights.' },
    { id: 'm9_tr4', cat: '9: Loose Ends (Trophies & Challenges)', name: 'Möllertov Cocktail', type: 'Trophy / Challenge', desc: 'Kill Möller with an explosion.' },

    // MISSION 10: WOLF MOUNTAIN (DLC)
    { id: 'm10_pl1', cat: '10: Wolf Mountain (DLC)', name: 'Construction Halted', type: 'Personal Letter', desc: 'East Side of the map, in a small house, guarded by one guard.' },
    { id: 'm10_pl2', cat: '10: Wolf Mountain (DLC)', name: 'Vermin Infestation', type: 'Personal Letter', desc: 'Inside an office in the garage of the main house on a table.' },
    { id: 'm10_pl3', cat: '10: Wolf Mountain (DLC)', name: 'Führers Plans', type: 'Personal Letter', desc: 'In the main house, in the kitchen on a table.' },
    { id: 'm10_pl4', cat: '10: Wolf Mountain (DLC)', name: 'Perimeter Problems', type: 'Personal Letter', desc: 'In a house, guarded by many guards, on a table.' },
    { id: 'm10_pl5', cat: '10: Wolf Mountain (DLC)', name: 'Führer’s Personal Space', type: 'Personal Letter', desc: 'Main house in a room leading to the terrace; on a dresser next to a vase.' },
    { id: 'm10_cd1', cat: '10: Wolf Mountain (DLC)', name: 'Missing Inventory', type: 'Classified Doc', desc: 'On a box near the tent on the east side of the map.' },
    { id: 'm10_cd2', cat: '10: Wolf Mountain (DLC)', name: 'Guest of the Führer', type: 'Classified Doc', desc: 'Inside the main house, first floor small office on a table.' },
    { id: 'm10_cd3', cat: '10: Wolf Mountain (DLC)', name: 'Routine Reminder', type: 'Classified Doc', desc: 'Right of the tunnel in a bunker safe; use Satchel Charge or code from local guard.' },
    { id: 'm10_cd4', cat: '10: Wolf Mountain (DLC)', name: 'Communication Operation', type: 'Classified Doc', desc: 'On a crate in a sniper tower, Southwest area of the map.' },
    { id: 'm10_cd5', cat: '10: Wolf Mountain (DLC)', name: 'Additional Flak Positions', type: 'Classified Doc', desc: 'On a table next to the optional objective.' },
    { id: 'm10_hi1', cat: '10: Wolf Mountain (DLC)', name: 'Führermuseum Concept Model', type: 'Hidden Item', desc: 'Main house ground floor in a gangway with covered furniture.' },
    { id: 'm10_hi2', cat: '10: Wolf Mountain (DLC)', name: 'Practise Pose Photography', type: 'Hidden Item', desc: 'Safe in top floor main bedroom; open via Satchel Charge or key from house guard.' },
    { id: 'm10_hi3', cat: '10: Wolf Mountain (DLC)', name: 'Possible Hitler Disguises', type: 'Hidden Item', desc: 'East side of the map in the Tea House, ground floor on a table.' },
    { id: 'm10_se1', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'On top of the main house; shoot after exiting the tunnel.' },
    { id: 'm10_se2', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Above the tunnel leading to the main house.' },
    { id: 'm10_se3', cat: '10: Wolf Mountain (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Outside map boundary; follow Lakeside Path behind the main house.' },
    { id: 'm10_wb1', cat: '10: Wolf Mountain (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Southwest house basement; enter via Satchel Charge or key from nearby big house enemy.' },
    { id: 'm10_wb2', cat: '10: Wolf Mountain (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'House basement; crawl in from backside or loot key from AA Gun Officer.' },
    { id: 'm10_wb3', cat: '10: Wolf Mountain (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Main house basement armory; open with Satchel Charge or house enemy key.' },

    // MISSION 11: LANDING FORCE DLC
    { id: 'm11_pl1', cat: '11: Landing Force (DLC)', name: 'Munition Ignitions', type: 'Personal Letter', desc: 'Central map sector, resting on a heavy table inside the main objective fortification bunker.' },
    { id: 'm11_pl2', cat: '11: Landing Force (DLC)', name: 'Bread and Boredom', type: 'Personal Letter', desc: 'Northern coastal sector; resting on an old wooden table built inside the broken tower.' },
    { id: 'm11_pl3', cat: '11: Landing Force (DLC)', name: 'Heavy is the Crown', type: 'Personal Letter', desc: 'Southwest island sector, inside the primary stone Fort command briefing hall table.' },
    { id: 'm11_cd1', cat: '11: Landing Force (DLC)', name: 'Wine-Stained Warning', type: 'Classified Doc', desc: 'Western map sector building layout; resting on an office table inside the top floor room.' },
    { id: 'm11_cd2', cat: '11: Landing Force (DLC)', name: 'Security Measures', type: 'Classified Doc', desc: 'Eastern fishing sector house near the water; hidden under the desk framing opposite Workbench 2.' },
    { id: 'm11_hi1', cat: '11: Landing Force (DLC)', name: 'Military Flask', type: 'Hidden Item', desc: 'Central sector fortification bunker entry left room corner storage table.' },
    { id: 'm11_hi2', cat: '11: Landing Force (DLC)', name: 'Binoculars', type: 'Hidden Item', desc: 'Far southern cliff edge corridor; sitting on the stone hand railing behind the Lighthouse asset.' },
    { id: 'm11_se1', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Southwest watchtower architecture peak; immediately viewable directly from default spawn.' },
    { id: 'm11_se2', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Northern broken masonry layout; perched on high stone wall of ruined tower asset.' },
    { id: 'm11_se3', cat: '11: Landing Force (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Southeast coastal zone; perched on top of a low, shattered seaside stone building.' },
    { id: 'm11_wb1', cat: '11: Landing Force (DLC)', name: 'Resort Docks Workbench', type: 'Workbench', desc: 'West side of the map in a house upstairs.' },
    { id: 'm11_wb2', cat: '11: Landing Force (DLC)', name: 'Abandoned Fishing Workbench SMG', type: 'Workbench', desc: 'East side of the map in a small house near the water.' },
    { id: 'm11_wb3', cat: '11: Landing Force (DLC)', name: 'Military Fort Workbench', type: 'Workbench', desc: 'Southwest side of the map, inside the Fort behind a locked door (lockpick or bolt cutters).' },

    // MISSION 12: CONQUEROR DLC
    { id: 'm12_pl1', cat: '12: Conqueror (DLC)', name: 'Roughly-written Note', type: 'Personal Letter', desc: 'Northwest village sector house layout; sitting directly next to a civilian bedroom frame.' },
    { id: 'm12_pl2', cat: '12: Conqueror (DLC)', name: 'Debris-covered Love Letter', type: 'Personal Letter', desc: 'Central ruins sector; resting on top of a wooden supply crate within secondary goal radius.' },
    { id: 'm12_pl3', cat: '12: Conqueror (DLC)', name: 'An Unfinished Plea for Aid', type: 'Personal Letter', desc: 'Northern sector house floor; on a crate next to the sleeping bag.' },
    { id: 'm12_cd1', cat: '12: Conqueror (DLC)', name: 'King of the Tigers', type: 'Classified Doc', desc: 'Town entry roadblock checkpoint sector; resting on top of a plain raw wood shipping crate.' },
    { id: 'm12_cd2', cat: '12: Conqueror (DLC)', name: 'Operations Dossier', type: 'Classified Doc', desc: 'Northwest perimeter gardens; sitting out on the central table structure inside gazebo.' },
    { id: 'm12_hi1', cat: '12: Conqueror (DLC)', name: 'Wallet', type: 'Hidden Item', desc: 'Western sector hotel structure room; tracking location of yellow elimination target.' },
    { id: 'm12_hi2', cat: '12: Conqueror (DLC)', name: 'Bronze Statue', type: 'Hidden Item', desc: 'Castle keep interior sector; sitting directly on top of General König\'s command desk.' },
    { id: 'm12_se1', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Western town sector belfry peak; perched on high tower ledge near primary sniper track.' },
    { id: 'm12_se2', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Northern residential cluster; perched squarely on top of a red brick house chimney stack.' },
    { id: 'm12_se3', cat: '12: Conqueror (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Castle fortifications; perched inside an upper window slit of massive stone defense tower.' },
    { id: 'm12_wb1', cat: '12: Conqueror (DLC)', name: 'Town Entrance Bunker Workbench', type: 'Workbench', desc: 'Southwest sector defensive line; built inside entry concrete bunker fortification room.' },
    { id: 'm12_wb2', cat: '12: Conqueror (DLC)', name: 'Village Attic Workbench', type: 'Workbench', desc: 'Southeast sector cluster house; scale structural lofts to reach closed attic floor area.' },
    { id: 'm12_wb3', cat: '12: Conqueror (DLC)', name: 'Castle Grounds Bunker Workbench', type: 'Workbench', desc: 'Castle inner perimeter line; inside concrete layout bunker trailing blue asset goals.' },

    // MISSION 13: ROUGH LANDING DLC
    { id: 'm13_pl1', cat: '13: Rough Landing (DLC)', name: 'Emergency Landing', type: 'Personal Letter', desc: 'Western forest cabin area, sitting on a small wooden table.' },
    { id: 'm13_pl2', cat: '13: Rough Landing (DLC)', name: 'Silly Disagreement', type: 'Personal Letter', desc: 'Central village, upstairs bedroom inside the stone residential house.' },
    { id: 'm13_pl3', cat: '13: Rough Landing (DLC)', name: 'Imperial Orders', type: 'Personal Letter', desc: 'Eastern crash site command tent, resting on the main briefing desk.' },
    { id: 'm13_pl4', cat: '13: Rough Landing (DLC)', name: 'Secret Stash', type: 'Personal Letter', desc: 'Southern bridge guard post, inside the checkpoint booth on a crate.' },
    { id: 'm13_pl5', cat: '13: Rough Landing (DLC)', name: 'Plan of Action', type: 'Personal Letter', desc: 'Northern radar facility office, sitting on an administrative desk.' },
    { id: 'm13_cd1', cat: '13: Rough Landing (DLC)', name: 'Airforce Radar', type: 'Classified Doc', desc: 'Northern radar bunker vault room; unlock with key or satchel charge.' },
    { id: 'm13_cd2', cat: '13: Rough Landing (DLC)', name: 'Target Acquired', type: 'Classified Doc', desc: 'Eastern crash site area, on a supply crate beside downed aircraft wreckage.' },
    { id: 'm13_cd3', cat: '13: Rough Landing (DLC)', name: 'Broken Equipment', type: 'Classified Doc', desc: 'Central village repair workshop, ground floor bench table.' },
    { id: 'm13_cd4', cat: '13: Rough Landing (DLC)', name: 'Weather Report', type: 'Classified Doc', desc: 'Southern watchtower platform, next to the radio equipment frame.' },
    { id: 'm13_cd5', cat: '13: Rough Landing (DLC)', name: 'Patrol Routes', type: 'Classified Doc', desc: 'Western forest outpost, locked inside the officer command tent safe.' },
    { id: 'm13_hi1', cat: '13: Rough Landing (DLC)', name: 'RAF Pilot Badges', type: 'Hidden Item', desc: 'Looted from the patrolling officer guarding the pilot search zone.' },
    { id: 'm13_hi2', cat: '13: Rough Landing (DLC)', name: 'Ornate Compass', type: 'Hidden Item', desc: 'Inside the locked cellar chest in the central village stone house.' },
    { id: 'm13_hi3', cat: '13: Rough Landing (DLC)', name: 'Leather Flight Jacket', type: 'Hidden Item', desc: 'Hanging in the bedroom closet of the western forest cabin.' },
    { id: 'm13_se1', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: 'Perched atop the church belfry roof peak in the central village.' },
    { id: 'm13_se2', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: 'Sits on a high stone ridge overlooking the northern radar facility.' },
    { id: 'm13_se3', cat: '13: Rough Landing (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: 'Perched on the concrete arch support of the southern railway bridge.' },
    { id: 'm13_wb1', cat: '13: Rough Landing (DLC)', name: 'Rifle Workbench', type: 'Workbench', desc: 'Central village church crypt basement; unlock with key or satchel.' },
    { id: 'm13_wb2', cat: '13: Rough Landing (DLC)', name: 'SMG Workbench', type: 'Workbench', desc: 'Western forest bunker depot; crawl through the side air vent.' },
    { id: 'm13_wb3', cat: '13: Rough Landing (DLC)', name: 'Pistol Workbench', type: 'Workbench', desc: 'Northern radar bunker facility lower armory vault.' },

    // MISSION 14: KRAKEN AWAKES DLC
    { id: 'm14_pl2', cat: '14: Kraken Awakes (DLC)', name: 'Letter to Vogel', type: 'Personal Letter', desc: '[ON SHIP] Upper Island Superstructure inside Vogel\'s office safe. Code on desk nearby.' },
    { id: 'm14_hi2', cat: '14: Kraken Awakes (DLC)', name: 'Eagle Plaque', type: 'Hidden Item', desc: '[INSIDE SHIP] 2nd Level from bottom, near room with large red spotlight.' },
    { id: 'm14_se1', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #1', type: 'Stone Eagle', desc: '[ON SHIP] Perched on middle mast at very top of aircraft carrier.' },
    { id: 'm14_pl1', cat: '14: Kraken Awakes (DLC)', name: 'Boiler Room Inspection', type: 'Personal Letter', desc: '[NORTH-WEST DOCKS] Top floor control room inside dark facility building.' },
    { id: 'm14_cd2', cat: '14: Kraken Awakes (DLC)', name: 'Successful Raid', type: 'Classified Doc', desc: '[NORTH DOCKS] Inside 3rd dock building from ship\'s main access bridge.' },
    { id: 'm14_se2', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #2', type: 'Stone Eagle', desc: '[NORTH-WEST DOCKS] Perched on outer roof ridge of dark North-West building.' },
    { id: 'm14_wb2', cat: '14: Kraken Awakes (DLC)', name: 'Maintenance Workbench', type: 'Workbench', desc: '[NORTH-WEST DOCKS] Bottom floor of North-West facility. Grab key from table.' },
    { id: 'm14_pl3', cat: '14: Kraken Awakes (DLC)', name: 'Missing Tools', type: 'Personal Letter', desc: '[SOUTH-WEST] Top floor comms room of rectangular building.' },
    { id: 'm14_hi1', cat: '14: Kraken Awakes (DLC)', name: 'Backpack', type: 'Hidden Item', desc: '[SOUTH-WEST] Sitting on supply crate inside small corner storage shanty.' },
    { id: 'm14_se3', cat: '14: Kraken Awakes (DLC)', name: 'Stone Eagle #3', type: 'Stone Eagle', desc: '[SOUTH PERIMETER] Look high up on masonry chimney stack.' },
    { id: 'm14_wb1', cat: '14: Kraken Awakes (DLC)', name: 'Administration Workbench', type: 'Workbench', desc: '[SOUTH DOCKS] South dock building. Climb upper floor and slide through air vent.' },
    { id: 'm14_wb3', cat: '14: Kraken Awakes (DLC)', name: 'Resistance Storage Workbench', type: 'Workbench', desc: '[SOUTHERN COMPOUND] Slide under wall gap and clear barricade.' },
    { id: 'm14_cd1', cat: '14: Kraken Awakes (DLC)', name: 'Salvage Operation', type: 'Classified Doc', desc: '[EASTERN BORDER] On a desk inside easternmost border house.' }
];

const typeOrderMap = {
    'classified doc': 1,
    'workbench': 2,
    'personal letter': 3,
    'stone eagle': 4,
    'hidden item': 5
};

const appState = {
    activeHunter: 'Werewolf3788',
    hunterData: JSON.parse(JSON.stringify(sniperData)),
    auth: null,
    db: null,
    collapsedSections: {},
    masterUnsub: null,

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

    cleanNameFromUrl: function(urlStr) {
        if (!urlStr) return "Link";
        try {
            const cleanUrl = urlStr.split('?')[0].split('#')[0];
            const parsed = new URL(cleanUrl);
            const pathSegments = parsed.pathname.split('/').filter(Boolean);
            let name = pathSegments.pop() || parsed.hostname;
            name = name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ');
            if (name.toLowerCase() === 'index') {
                name = pathSegments.pop() || 'Home';
            }
            return name.charAt(0).toUpperCase() + name.slice(1);
        } catch(e) {
            return "Menu Link";
        }
    },

    buildMenuHTML: function(menuItems) {
        const navContainer = document.getElementById('dynamic-nav-links');
        if (!navContainer || !Array.isArray(menuItems)) return;

        const groups = {};
        const standalone = [];

        menuItems.forEach(item => {
            if (!item.url) return;

            let displayName = item.name && item.name.trim() !== '' ? item.name : '';
            if (!displayName || displayName.startsWith('http://') || displayName.startsWith('https://')) {
                displayName = this.cleanNameFromUrl(item.url);
            }

            let imgUrl = item.image || '';
            if (imgUrl && imgUrl.includes('drive.google.com')) {
                const driveMatch = imgUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                    imgUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                }
            }

            const nodeObj = { name: displayName, url: item.url, image: imgUrl };

            if (item.group && item.group.trim() !== '') {
                if (!groups[item.group]) groups[item.group] = [];
                groups[item.group].push(nodeObj);
            } else {
                standalone.push(nodeObj);
            }
        });

        let navHTML = '';

        Object.keys(groups).forEach(groupName => {
            const dropItems = groups[groupName].map(it => {
                const imgTag = it.image ? `<img src="${it.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
                return `<a href="${it.url}">${imgTag}<span>${it.name}</span></a>`;
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

        standalone.forEach(it => {
            const imgTag = it.image ? `<img src="${it.image}" class="nav-icon" alt="" onerror="this.style.display='none'">` : '';
            navHTML += `<a href="${it.url}">${imgTag}<span>${it.name}</span></a>`;
        });

        navContainer.innerHTML = navHTML;
    },

    loadNavigation: async function() {
        const sheetsCsvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv&v=${Date.now()}`;
        
        try {
            const res = await fetch(sheetsCsvUrl);
            if (res.ok) {
                const csvText = await res.text();
                const parsedRows = this.parseCSV(csvText);
                if (parsedRows.length > 1) {
                    const menuItems = [];
                    for (let i = 1; i < parsedRows.length; i++) {
                        const row = parsedRows[i];
                        if (!row || row.length === 0) continue;

                        const name = row[0] ? row[0].trim() : '';
                        const group = row[1] ? row[1].trim() : '';
                        const url = row[2] ? row[2].trim() : '';
                        const image = row[3] ? row[3].trim() : '';

                        if (url && url.startsWith('http')) {
                            menuItems.push({ name, url, group, image });
                        }
                    }

                    if (menuItems.length > 0) {
                        this.buildMenuHTML(menuItems);
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Google Sheet CSV Fetch Notice:", e.message);
        }

        const navContainer = document.getElementById('dynamic-nav-links');
        if (navContainer) {
            navContainer.innerHTML = `<a href="index.html">Home</a>`;
        }
    },

    init: async function() {
        const saved = localStorage.getItem('se5_active_id');
        if (saved && USER_DATA_MAP[saved]) {
            this.activeHunter = USER_DATA_MAP[saved];
        } else {
            this.activeHunter = 'Werewolf3788';
        }

        this.loadNavigation();
        this.setupProfilesUI();
        this.setupLifecycleListeners();

        try {
            const app = initializeApp(firebaseConfig, 'SE5-User-Hierarchy');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            // AUTO-AUTHENTICATE ANONYMOUSLY TO SATISFY FIRESTORE SECURITY RULES
            signInAnonymously(this.auth).catch(err => {
                console.error("Firebase Anonymous Auth Error:", err);
            });

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    console.log("Authenticated User Session:", user.uid);
                    this.loadHunter(this.activeHunter);
                }
            });

        } catch (err) {
            console.error("Firebase Init Error:", err);
        }

        this.render();
    },

    setupProfilesUI: function() {
        const profilesContainer = document.getElementById('hunter-profiles');
        if (profilesContainer) {
            profilesContainer.innerHTML = `
                <button class="profile-btn" data-profile="Werewolf3788" onclick="appState.switchHunter('Werewolf3788')">Werewolf3788</button>
                <button class="profile-btn" data-profile="Ray" onclick="appState.switchHunter('Ray')">Ray</button>
                <button class="profile-btn" data-profile="DesdemonaTiger" onclick="appState.switchHunter('DesdemonaTiger')">DesdemonaTiger</button>
            `;
        }

        const toggleBtn = document.getElementById('mobile-toggle');
        const navLinks = document.getElementById('dynamic-nav-links');
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', () => {
                navLinks.classList.toggle('mobile-active');
            });
        }
    },

    // SLEEP & WAKE CYCLE OBSERVER (PAGE VISIBILITY API)
    setupLifecycleListeners: function() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log("Tab regained focus: Re-verifying real-time sync listeners...");
                if (this.auth && this.auth.currentUser) {
                    this.loadHunter(this.activeHunter);
                }
            }
        });
    },

    loadHunter: function(name) {
        const dbDocName = USER_DATA_MAP[name] || name;

        // Local Storage Backup Check
        const localKey = `se5_progress_${dbDocName.toLowerCase()}`;
        const savedLocal = localStorage.getItem(localKey);
        let localCollectedIds = [];
        if (savedLocal) {
            try { localCollectedIds = JSON.parse(savedLocal); } catch(e) {}
        }

        this.hunterData = sniperData.map(item => ({
            ...item,
            collected: localCollectedIds.includes(item.id)
        }));

        this.activeHunter = dbDocName;
        localStorage.setItem('se5_active_id', dbDocName);

        const displayNode = document.getElementById('hunter-display');
        if (displayNode) displayNode.innerText = dbDocName.toUpperCase();

        document.querySelectorAll('.profile-btn').forEach(b => {
            const profAttr = b.getAttribute('data-profile');
            b.classList.toggle('active-btn', profAttr && (profAttr.toLowerCase() === name.toLowerCase() || USER_DATA_MAP[profAttr]?.toLowerCase() === dbDocName.toLowerCase()));
        });

        this.render();

        if (this.masterUnsub) this.masterUnsub();

        // REAL-TIME FIRESTORE STREAM WITH OPTIMISTIC WRITE FILTERING
        const userProgressRef = doc(this.db, 'users', dbDocName, 'progress', GAME_ID);
        this.masterUnsub = onSnapshot(userProgressRef, { includeMetadataChanges: true }, (snap) => {
            if (snap.metadata.hasPendingWrites) {
                return;
            }

            if (snap.exists()) {
                const data = snap.data();
                const incoming = data.progress || data.trophies || [];

                if (Array.isArray(incoming)) {
                    this.hunterData = sniperData.map(dt => {
                        const found = incoming.find(it => it.id === dt.id);
                        return { ...dt, collected: found ? (found.collected === true || found.done === true) : false };
                    });
                    this.saveLocalCache();
                    this.render();
                }
            }
        }, (error) => {
            console.warn("Firestore Listener Notice (Using Local Memory Backup):", error.message);
        });
    },

    saveLocalCache: function() {
        const localKey = `se5_progress_${this.activeHunter.toLowerCase()}`;
        const collectedIds = this.hunterData.filter(i => i.collected).map(i => i.id);
        localStorage.setItem(localKey, JSON.stringify(collectedIds));
    },

    switchHunter: function(name) {
        this.loadHunter(name);
    },

    toggleItem: function(id) {
        const item = this.hunterData.find(i => i.id === id);
        if (item) {
            item.collected = !item.collected;
            this.saveLocalCache();
            this.render();
            this.sync();
        }
    },

    sync: async function() {
        if (!this.db || !this.auth.currentUser) return;

        try {
            const userProgressRef = doc(this.db, 'users', this.activeHunter, 'progress', GAME_ID);
            const userRef = doc(this.db, 'users', this.activeHunter);

            const payload = {
                user: this.activeHunter,
                gameId: GAME_ID,
                progress: this.hunterData.map(i => ({ id: i.id, collected: i.collected })),
                lastUpdated: new Date().toISOString()
            };

            await setDoc(userRef, { displayName: this.activeHunter, lastUpdated: new Date().toISOString() }, { merge: true });
            await setDoc(userProgressRef, payload, { merge: true });

            console.log("Progress saved cleanly to /users/" + this.activeHunter + "/progress/" + GAME_ID);
        } catch (error) {
            console.error("FIREBASE LIVE SYNC ERROR:", error);
        }
    },

    toggleSection: function(sid) {
        // Sections default to collapsed unless explicitly opened (false)
        const isCurrentlyCollapsed = this.collapsedSections[sid] !== false;
        this.collapsedSections[sid] = !isCurrentlyCollapsed;
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

            const items = rawItems.sort((a, b) => {
                const orderA = typeOrderMap[a.type.toLowerCase()] || 99;
                const orderB = typeOrderMap[b.type.toLowerCase()] || 99;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return a.name.localeCompare(b.name);
            });

            const sid = cat.replace(/[^a-z0-9]/gi, '');
            const isCollapsed = this.collapsedSections[sid] !== false; // Defaults to TRUE (closed on page load)

            const section = document.createElement('div');
            section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;

            section.innerHTML = `
                <div class="category-header outlined-text" id="header-${sid}">
                    <h2>${cat}</h2>
                    <div style="font-weight:900; font-size: 16px; color: #ff8800;">${count}/${items.length} FOUND</div>
                </div>
                <div class="section-content" id="content-${sid}">
                    <div class="item-grid"></div>
                </div>
            `;

            section.querySelector(`#header-${sid}`).addEventListener('click', () => {
                this.toggleSection(sid);
            });

            const grid = section.querySelector('.item-grid');
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `item-card ${item.collected ? 'completed' : ''}`;
                card.innerHTML = `
                    <div>
                        <div class="item-type-tag">${item.type}</div>
                        <div class="outlined-text" style="font-weight:900; font-size:15px; margin-bottom:4px;">${item.name}</div>
                        <div class="outlined-text" style="font-size:12px; color:#ddd; font-style:italic; line-height:1.3;">${item.desc}</div>
                    </div>
                    <div class="action-zone"></div>
                `;

                const actionZone = card.querySelector('.action-zone');

                if (item.collected) {
                    actionZone.innerHTML = `<button class="lock-badge outlined-text toggle-btn" style="background:#00aa44; min-height:44px; cursor:pointer;">LOGGED REGISTRY (Click to Undo)</button>`;
                    actionZone.querySelector('button').addEventListener('click', () => this.toggleItem(item.id));
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'toggle-btn outlined-text';
                    btn.style.minHeight = '44px';
                    btn.innerText = 'Confirm Found';
                    btn.addEventListener('click', () => this.toggleItem(item.id));
                    actionZone.appendChild(btn);
                }

                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const percent = Math.round((totalFound / this.hunterData.length) * 100) || 0;
        const barNode = document.getElementById('overall-bar');
        const textNode = document.getElementById('percent-text');
        if (barNode) barNode.style.width = percent + '%';
        if (textNode) textNode.innerText = `TOTAL CAMPAIGN COLLECTION: ${percent}%`;
    }
};

window.appState = appState;
appState.init();
