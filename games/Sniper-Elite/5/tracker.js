/* Version Timestamp: 2026-07-11 23:59:59 CT
   LOGIC PROTOCOL: Full 7 Mission PowerPyx Map Registry Data Mapping Layout
*/
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
    { id: 'm7_pl5', cat: '7: Secret Weapons', name: 'Thinking Outside The Box', type: 'Secret Weapons', desc: 'Northern dome structure; follow the internal winding metal stairs to the top control tier.' },
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
    { id: 'm7_wb3', cat: '7: Secret Weapons', name: 'Pistol Workbench', type: 'Workbench', desc: 'Southwest river waterfall compound; dismantle the hidden cache boards to enter the cave.' }
];

const appState = {
    activeHunter: 'Werewolf3788',
    hunterData: [],
    collapsedSections: {}, 

    init: function() {
        this.hunterData = sniperData.map(item => ({ ...item, collected: false }));
        
        // Force sections closed by default
        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        cats.forEach(cat => {
            const sid = cat.replace(/[^a-z0-9]/gi, '');
            this.collapsedSections[sid] = true;
        });

        this.loadHunter(this.activeHunter);

        document.querySelectorAll('.profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedProfile = btn.getAttribute('data-profile');
                if (selectedProfile) {
                    this.loadHunter(selectedProfile);
                }
            });
        });
    },

    loadHunter: function(name) {
        this.activeHunter = name;
        document.getElementById('hunter-display').innerText = name.toUpperCase();
        
        document.querySelectorAll('.profile-btn').forEach(b => {
            const profAttr = b.getAttribute('data-profile');
            b.classList.toggle('active-btn', profAttr && profAttr.toLowerCase() === name.toLowerCase());
        });

        const storageKey = `se5_local_sync_${name}`;
        const localCache = localStorage.getItem(storageKey);
        if (localCache) {
            try {
                const savedProgress = JSON.parse(localCache);
                this.hunterData = sniperData.map(item => {
                    const status = savedProgress.find(s => s.id === item.id);
                    return { ...item, collected: status ? status.collected : false };
                });
            } catch(e) {
                this.hunterData = sniperData.map(item => ({ ...item, collected: false }));
            }
        } else {
            this.hunterData = sniperData.map(item => ({ ...item, collected: false }));
        }

        this.render();
    },

    render: function() {
        const container = document.getElementById('section-container');
        container.innerHTML = '';
        const cats = [...new Set(this.hunterData.map(i => i.cat))];
        let totalFound = 0;

        cats.forEach(cat => {
            const items = this.hunterData.filter(i => i.cat === cat);
            const count = items.filter(i => i.collected).length;
            totalFound += count;

            const sid = cat.replace(/[^a-z0-9]/gi, '');
            const section = document.createElement('div');
            section.className = `category-section ${this.collapsedSections[sid] ? 'section-collapsed' : ''}`;
            
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
                    actionZone.innerHTML = `<div class="lock-badge outlined-text">LOGGED REGISTRY</div>`;
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'toggle-btn outlined-text';
                    btn.innerText = 'Confirm Found';
                    btn.addEventListener('click', () => this.toggleItem(item.id));
                    actionZone.appendChild(btn);
                }

                grid.appendChild(card);
            });
            container.appendChild(section);
        });

        const percent = Math.round((totalFound / this.hunterData.length) * 100) || 0;
        document.getElementById('overall-bar').style.width = percent + '%';
        document.getElementById('percent-text').innerText = `TOTAL CAMPAIGN COLLECTION: ${percent}%`;
    },

    toggleItem: function(id) {
        const item = this.hunterData.find(i => i.id === id);
        if (item) {
            item.collected = true;
            this.render(); 
            this.sync();
        }
    },

    toggleSection: function(sid) {
        this.collapsedSections[sid] = !this.collapsedSections[sid];
        const contentNode = document.getElementById(`content-${sid}`);
        const sectionNode = contentNode.parentElement;
        if (this.collapsedSections[sid]) {
            sectionNode.classList.add('section-collapsed');
        } else {
            sectionNode.classList.remove('section-collapsed');
        }
    },

    sync: function() {
        const progress = this.hunterData.map(i => ({ id: i.id, collected: i.collected }));
        localStorage.setItem(`se5_local_sync_${this.activeHunter}`, JSON.stringify(progress));
    }
};

appState.init();

/* --- SPREADSHEET PARSER AND DEDUPLICATION TAB LAYER --- */
async function buildTopMenu() {
    try {
        const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv&t=" + Date.now();
        const response = await fetch(csvUrl);
        const textData = await response.text();
        
        const rows = textData.split('\n');
        const menuStructure = [];
        const groupMap = {};
        
        let startIdx = (rows[0] && rows[0].toLowerCase().includes("name")) ? 1 : 0;

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
        const chevron = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left:6px; display:inline-block; vertical-align:middle;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        menuStructure.forEach(item => {
            if (item.type === 'single') {
                html += `<a href="${item.url}" class="csv-single-btn intercepted-link outlined-text">${item.name}</a>`;
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
                    const imgTag = sub.img ? `<img src="${sub.img}" style="width:26px; height:26px; margin-right:12px; vertical-align:middle; border-radius:6px; object-fit:cover;">` : '';
                    html += `<a href="${sub.url}" class="csv-dropdown-item intercepted-link outlined-text">${imgTag}${sub.name}</a>`;
                });
                html += `</div></div>`;
            }
        });
        
        menuBar.innerHTML = html;

        const tabChannel = new BroadcastChannel('se5_tracker_channel');
        document.querySelectorAll('.intercepted-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetUrl = this.getAttribute('href');
                tabChannel.postMessage({ action: 'check_focus', url: targetUrl });
                window.open(targetUrl, 'SE5_ITC_Window');
            });
        });
        
    } catch(e) {
        console.error("Error generating menu:", e);
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
        const isOpen = targetDropdown.classList.contains('show');

        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
        if (!isOpen) targetDropdown.classList.add('show');
    } else {
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
    }
});

buildTopMenu();
