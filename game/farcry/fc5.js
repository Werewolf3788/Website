// ============================================================================
// * Project: Far Cry 5 Hope County Resistance Companion & Field Ledger
// * File: fc5.js
// * Location: /game/farcry/fc5.js
// * Build Version: v10.0.5-COTW-STRUCTURAL-ALIGNMENT
// * Deployment Timestamp: 2026-10-28 03:28:00 EDT (America/New_York)
// ============================================================================

// Section 1: Embedded Authoritative In-Memory Game Ledger
// Lines 11-370: Embedded JSON payload eliminating fetch 404 deadlocks
const fc5_embedded_data = {
  "game": "Far Cry 5",
  "gameId": "FarCry5",
  "psn_communication_id": "NPWR12514_00",
  "activeMission": "Hope County Resistance",
  "collectibles": {
    "baseball_cards": {
      "quest_name": "Grand Slam",
      "quest_giver": "George",
      "quest_giver_location": "Oberlin Picnic Area, Whitetail Mountains",
      "total_count": 9,
      "region": "Whitetail Mountains",
      "items": [
        {
          "id": "baseball_card_01",
          "name": "Southwest of F.A.N.G Center",
          "location": "House by a small body of water southwest of F.A.N.G Center",
          "guide": "Eliminate enemies outside to the left of the house. Enter the house; the card is on a shelf above the couch."
        },
        {
          "id": "baseball_card_02",
          "name": "North West of Cedar Lake",
          "location": "Lakeside house northwest of Cedar Lake",
          "guide": "Clear the enemies on the lakeside of the building. Head inside to find the card on the chest of drawers next to the bed."
        },
        {
          "id": "baseball_card_03",
          "name": "West of Cedar Lake",
          "location": "Mountain cabin west of Cedar Lake",
          "guide": "Access via grapple or flying vehicle. Clear enemies and enter through the front door; the card is immediately behind the opening door on a desk."
        },
        {
          "id": "baseball_card_04",
          "name": "North of Whitetail Park Visitor Center",
          "location": "Shack in the hills north of Whitetail Park Visitor Center",
          "guide": "Enter the enemy-free shack and turn left. The card sits on a shelf."
        },
        {
          "id": "baseball_card_05",
          "name": "South West of Clagett Boathouse",
          "location": "Petrol station on the road southwest of Clagett Boathouse",
          "guide": "Enter the petrol station building. The card is on a shelf underneath the 'Clothing' sign."
        },
        {
          "id": "baseball_card_06",
          "name": "Cooper Cabin",
          "location": "Cabin northeast of the Wolf's Den",
          "guide": "Head inside to the room with a mattress propped up against the wall. The card is on the shelf straight ahead."
        },
        {
          "id": "baseball_card_07",
          "name": "F.A.N.G Center",
          "location": "F.A.N.G Center gift shop",
          "guide": "Liberate or clear the cultists. Enter the building to the right of the main entrance; the card is on a merchandise shelf in the center of the gift shop."
        },
        {
          "id": "baseball_card_08",
          "name": "McNeil Residence",
          "location": "Northeast of F.A.N.G Center along the road",
          "guide": "Clear the cultists and enter the white shed to the left. The card is on a shelf on the wall behind the door."
        },
        {
          "id": "baseball_card_09",
          "name": "North East of Baron Lumber Mill",
          "location": "White shipping-container style house on race tracks behind Baron Lumber Mill",
          "guide": "Clear nearby enemies, kick down the boarded-up door, and take the card off the wall as you enter."
        }
      ]
    },
    "comic_books": {
      "quest_name": "Golden Age Nostalgia",
      "quest_giver": "Nadine Abercrombie",
      "quest_giver_location": "Dodd Residence (between Fall's End and Rae-Rae's Pumpkin Farm), Holland Valley",
      "total_count": 12,
      "items": [
        {
          "id": "comic_01",
          "region": "Holland Valley",
          "name": "Parker Laboratories",
          "location": "West of Fall's End",
          "guide": "Go up the stairs inside the house with the green roof. The comic book is directly ahead on the desk."
        },
        {
          "id": "comic_02",
          "region": "Holland Valley",
          "name": "Boyd Residence",
          "location": "Directly west of the Dodd Residence",
          "guide": "Enter the house, turn left into the bedroom, and find the comic book on the bed next to a hunting bow."
        },
        {
          "id": "comic_03",
          "region": "Holland Valley",
          "name": "Bradbury Farm",
          "location": "South of Lamb of God Church, below crop circle",
          "guide": "Enter the large barn to the right. Jump up to the second level via boxes in front of the blue tarp; the comic is on an old mattress."
        },
        {
          "id": "comic_04",
          "region": "Whitetail Mountains",
          "name": "Jefferson Lookout Tower",
          "location": "Mountain peak west of the Wolf's Den",
          "guide": "Go to the cliffside entrance and ascend the stairs into the tower. The comic sits on a table right inside the entrance."
        },
        {
          "id": "comic_05",
          "region": "Whitetail Mountains",
          "name": "McNeil Residence",
          "location": "On the road between F.A.N.G Center and Fort Drubman",
          "guide": "Break the boarded-up window around the back of the house. Enter into the second room, turn left into the bathroom, and grab the comic from the basin."
        },
        {
          "id": "comic_06",
          "region": "Whitetail Mountains",
          "name": "Elliot Residence",
          "location": "South of F.A.N.G Center",
          "guide": "Climb onto the verandah where the barbed wire is broken and enter through the broken window. The comic is on cases next to a lamp."
        },
        {
          "id": "comic_07",
          "region": "Henbane River",
          "name": "Peaches Taxidermy",
          "location": "Peaches Taxidermy workshop grounds",
          "guide": "Enter the grey house through the white door on the left side of the property. The comic is located right next to the television."
        },
        {
          "id": "comic_08",
          "region": "Henbane River",
          "name": "Chan Residence",
          "location": "Just south of Angel's Peak",
          "guide": "Go around the back of the house, enter through the blue door, and find the comic on a bed directly behind the door."
        },
        {
          "id": "comic_09",
          "region": "Henbane River",
          "name": "Vasquez Residence",
          "location": "Waterfront between Faith's region and Dutch's Island",
          "guide": "Dispatch the cultists outside, enter through the front door, and grab the comic from the living room couch."
        },
        {
          "id": "comic_10",
          "region": "Henbane River",
          "name": "O'Hara's Haunted House",
          "location": "Border of Faith and John's regions, northwest of Dead Man's River",
          "guide": "Climb the crate with blue ropes behind the house onto the roof, drop to the scaffolding, and crouch through the second-floor window. The comic is on a mattress."
        },
        {
          "id": "comic_11",
          "region": "Henbane River",
          "name": "Boshaw Manor",
          "location": "Southwest of Moonflower Trailer Park",
          "guide": "Walk up the ramp into the house marked with 'No Smoking' signs. Go to the rear bedroom; the comic is on the bedside table."
        },
        {
          "id": "comic_12",
          "region": "Henbane River",
          "name": "Camp Cougars",
          "location": "Campsite southeast of Peaches Taxidermy",
          "guide": "Clear cultists/predators at the campsite. The comic is lying on the ground directly in front of one of the tents."
        }
      ]
    },
    "bobbleheads": {
      "quest_name": "Mint Condition",
      "quest_giver": "Dave Fowler",
      "quest_giver_location": "Fowler's Retreat, Whitetail Mountains",
      "total_count": 10,
      "items": [
        {
          "id": "bobblehead_01",
          "region": "Whitetail Mountains",
          "name": "Baron Lumber Mill",
          "location": "Baron Lumber Mill main building",
          "guide": "Ascend the front stairs and enter through the window. The bobblehead is straight ahead in the kitchen."
        },
        {
          "id": "bobblehead_02",
          "region": "Whitetail Mountains",
          "name": "Whitetail Park Ranger Station",
          "location": "Southwest of F.A.N.G Center",
          "guide": "Enter the main office, go behind the front desk into the adjacent room, and grab the bobblehead from the chest of drawers on the left wall."
        },
        {
          "id": "bobblehead_03",
          "region": "Whitetail Mountains",
          "name": "Island North of Grand View Hotel",
          "location": "Small island cabin north of Grand View Hotel",
          "guide": "Swim north to the island log cabin. The bobblehead is located inside on a splash of blood on the bed."
        },
        {
          "id": "bobblehead_04",
          "region": "Whitetail Mountains",
          "name": "Lansdowne Airstrip",
          "location": "Hangar north of F.A.N.G Center (Inside 'Hangar Pains' Prepper Stash)",
          "guide": "Grapple the nearby radio tower, wingsuit/parachute onto the hangar roof, drop through the open skylight, and find the bobblehead on a shelf."
        },
        {
          "id": "bobblehead_05",
          "region": "Whitetail Mountains",
          "name": "Whitetail Park Visitor Center",
          "location": "Visitor Center gift shop",
          "guide": "Head up the stairs and turn left into the souvenir shop. The bobblehead sits directly in front on a merchandise display shelf."
        },
        {
          "id": "bobblehead_06",
          "region": "Whitetail Mountains",
          "name": "South Park Entrance",
          "location": "Border of Jacob's and John's regions, north of Rae-Rae's Pumpkin Farm",
          "guide": "Ascend the wooden stairs behind the buildings. The bobblehead is on the floor mixed with discarded junk."
        },
        {
          "id": "bobblehead_07",
          "region": "Holland Valley",
          "name": "St. Isidore School",
          "location": "Abandoned school northeast of Fall's End",
          "guide": "Climb onto the main school roof to retrieve the keys from the chimney. Zipline to the outbuilding, unlock it, and pick the bobblehead up from the shelf."
        },
        {
          "id": "bobblehead_08",
          "region": "Holland Valley",
          "name": "Bradbury Tractor Shed",
          "location": "North of the crop circle between Fall's End and Lamb of God Church",
          "guide": "Approach the small building next to the shed, break the wooden slats covering the window, and retrieve the bobblehead inside the broken refrigerator."
        },
        {
          "id": "bobblehead_09",
          "region": "Henbane River",
          "name": "8-Bit Pizza Bar",
          "location": "West of Hope County Jail",
          "guide": "Walk through the front door, pass behind the service counter into the kitchen, and grab the bobblehead off the shelf next to the dishware."
        },
        {
          "id": "bobblehead_10",
          "region": "Henbane River",
          "name": "Feeney Residence",
          "location": "Eastern outskirts of Henbane River",
          "guide": "Clear the cultists in the field and enter the house. The bobblehead is on the kitchen counter against the wall."
        }
      ]
    },
    "vietnam_lighters": {
      "quest_name": "What They Carried",
      "quest_giver": "Wendell Redler",
      "quest_giver_location": "Redler Residence, East of Fall's End",
      "total_count": 12,
      "items": [
        {
          "id": "lighter_01",
          "region": "Whitetail Mountains",
          "name": "West of Cedar Lake",
          "location": "Underground bunker west of Cedar Lake",
          "guide": "Climb down into the bunker and grab the lighter off the shelf next to two blue barrels."
        },
        {
          "id": "lighter_02",
          "region": "Whitetail Mountains",
          "name": "North West of Widow's Creek",
          "location": "Bunker off the main road northwest of Widow's Creek",
          "guide": "Enter the roadside bunker and retrieve the lighter located in the back room next to the television."
        },
        {
          "id": "lighter_03",
          "region": "Whitetail Mountains",
          "name": "Whitetail Park Visitor Center",
          "location": "Visitor Center information building",
          "guide": "Climb the stairs and turn left into the information center. The lighter is on a set of shelves in the second room to the left."
        },
        {
          "id": "lighter_04",
          "region": "Whitetail Mountains",
          "name": "Elliot Residence",
          "location": "Bunker at Elliot Residence (South of F.A.N.G Center)",
          "guide": "Enter the upper story via the broken window, navigate down to the kitchen for the keycard, shoot the bunker lock in the shed outside, and find the lighter on the bench."
        },
        {
          "id": "lighter_05",
          "region": "Holland Valley",
          "name": "Fillmore Residence",
          "location": "East of Fall's End, west of Dead Man's River",
          "guide": "Enter the antler-adorned shed and descend into the bunker. The lighter sits on shelves in the second room."
        },
        {
          "id": "lighter_06",
          "region": "Holland Valley",
          "name": "Miller Residence",
          "location": "Southwest of Fillmore Residence",
          "guide": "Head to the white shed and drop down into the bunker hatch. The lighter is on the floor beside the nightstand."
        },
        {
          "id": "lighter_07",
          "region": "Holland Valley",
          "name": "Harris Residence",
          "location": "Northwest Holland Valley",
          "guide": "Enter the bunker via the hatch inside the brown wooden shed. The lighter is on the shelves beside the bed."
        },
        {
          "id": "lighter_08",
          "region": "Holland Valley",
          "name": "Rae-Rae's Pumpkin Farm",
          "location": "North of Fall's End",
          "guide": "Find the bunker hatch out in the open behind the farm buildings. The lighter is on a chair beside the bed."
        },
        {
          "id": "lighter_09",
          "region": "Henbane River",
          "name": "McCoy Cabin",
          "location": "West of Peaches Taxidermy",
          "guide": "Locate the bunker hatch partially covered by green tarp. The lighter is on the shelving unit in the second room."
        },
        {
          "id": "lighter_10",
          "region": "Henbane River",
          "name": "McClean Residence",
          "location": "Border between Faith's region and Dutch's Island",
          "guide": "Clear any hostile cultists and access the bunker near the rear of the property. The lighter is on the bed in the rear room."
        },
        {
          "id": "lighter_11",
          "region": "Henbane River",
          "name": "Abercrombie Residence",
          "location": "East of Hope County Jail",
          "guide": "Go behind the main house to find the bunker entrance before the stairs. The lighter is on shelves in the second room."
        },
        {
          "id": "lighter_12",
          "region": "Henbane River",
          "name": "Counselor's Cabin",
          "location": "West and slightly south of Moonflower Trailer Park",
          "guide": "Walk between the house and shed to reach the backyard bunker hatch. The lighter is in the second room on the shelf near the couch."
        }
      ]
    },
    "vinyl_crates": {
      "quest_name": "Turn the Tables",
      "quest_giver": "Wheaty",
      "quest_giver_location": "Wolf's Den, Whitetail Mountains",
      "quest_prerequisite": "Gearing Up",
      "total_count": 10,
      "region": "Whitetail Mountains",
      "items": [
        {
          "id": "vinyl_01",
          "name": "Osprey Cabin",
          "location": "Directly south of Wolf's Den down the cliff",
          "guide": "Enter through the side door of the log cabin. The crate sits on the coffee table between the sofa and television."
        },
        {
          "id": "vinyl_02",
          "name": "Dansky Cabin",
          "location": "South of Wolf's Den between two roads",
          "guide": "Approach the front door with the keypad lock; the vinyl crate is located outside under a table to the left of the door."
        },
        {
          "id": "vinyl_03",
          "name": "Hunter's Pass Shelter",
          "location": "Northwest of Wolf's Den",
          "guide": "Clear the area around the small brick cabin and head inside. The crate is on a table immediately past the door."
        },
        {
          "id": "vinyl_04",
          "name": "Red Tail Cabin",
          "location": "Directly east of Wolf's Den",
          "guide": "Enter the large wooden house and turn left into the kitchen. The crate rests on the counter beside the window."
        },
        {
          "id": "vinyl_05",
          "name": "Breakthrough Camp",
          "location": "East of Red Tail Cabin",
          "guide": "Pass through the main camp gate and turn right to the first lock house. The crate is on a shelf along the entryway wall."
        },
        {
          "id": "vinyl_06",
          "name": "North Park Entrance",
          "location": "Road heading west from F.A.N.G Center",
          "guide": "Go inside the southern building. The vinyl crate is sitting on top of a low bookshelf."
        },
        {
          "id": "vinyl_07",
          "name": "The Grill Steak",
          "location": "Outdoor restaurant south of F.A.N.G Center",
          "guide": "Walk past the barbecue grill and truck toward the gazebo shelter. The crate is in front of a tent underneath."
        },
        {
          "id": "vinyl_08",
          "name": "MCA Mobile Lab",
          "location": "East of Baron Lumber Mill",
          "guide": "Dispatch any wolves roaming the perimeter. The crate is sitting directly under the open grey canopy tent."
        },
        {
          "id": "vinyl_09",
          "name": "Linero Building Supplies",
          "location": "North of Baron Lumber Mill, west of Fort Drubman",
          "guide": "Proceed to the construction trailer at the back of the site, enter the blue door, and retrieve the crate on a desk behind a filing cabinet."
        },
        {
          "id": "vinyl_10",
          "name": "South Park Entrance",
          "location": "Border road between Wolf's Den and Rae-Rae's Pumpkin Farm",
          "guide": "Enter the roadside office next to the ACROD parking spot. The crate is on the floor in front of tipped filing cabinets."
        }
      ]
    },
    "whiskey_barrels": {
      "quest_name": "Whiskey River",
      "quest_giver": "Sherri Woodhouse",
      "quest_giver_location": "Can of Worms Fishing Store, Silver Lake, Henbane River",
      "required_perk": "Human Fish",
      "total_count": 15,
      "region": "Henbane River",
      "items": [
        {
          "id": "whiskey_01",
          "name": "Can of Worms Shoreline",
          "location": "East of Can of Worms Fishing Store along the shoreline",
          "guide": "Follow the rope marker down to the lake bed; the barrel sits near a submerged rock."
        },
        {
          "id": "whiskey_02",
          "name": "West of Drubman Marina",
          "location": "Lake floor west-southwest of Drubman Marina island",
          "guide": "Swim underwater near the reedy rock formations to retrieve the cask."
        },
        {
          "id": "whiskey_03",
          "name": "Silver Lake Campgrounds",
          "location": "North of Silver Lake Campgrounds east of the bridge",
          "guide": "Dive underwater along the south shore amongst discarded Bliss containers to grab the barrel."
        },
        {
          "id": "whiskey_04",
          "name": "Tanami Residence Crane",
          "location": "Submerged shipping container beside Tanami island",
          "guide": "Swim through the hole in the top of the container hanging from the crane to retrieve the barrel at the bottom."
        },
        {
          "id": "whiskey_05",
          "name": "Northwest of Tanami Residence",
          "location": "Underwater cave northwest of Tanami island",
          "guide": "Dive off the small rock point and follow the marker into an underwater cavern."
        },
        {
          "id": "whiskey_06",
          "name": "East of Oberlin Picnic Area",
          "location": "Between two small rocky islands east of Oberlin Picnic Area",
          "guide": "Stop between the islands and dive down to find the cask inside a rocky crevice."
        },
        {
          "id": "whiskey_07",
          "name": "South of Oberlin Picnic Area",
          "location": "High rock outcrop island in northern Silver Lake",
          "guide": "Access via helicopter, plane, or low southeastern ledge; cask rests on a rocky perch above water."
        },
        {
          "id": "whiskey_08",
          "name": "Clagett Bay Helicopter",
          "location": "Underwater south of large island in Clagett Bay",
          "guide": "Dive down to the submerged wreckage of a helicopter and grab the barrel from the cockpit."
        },
        {
          "id": "whiskey_09",
          "name": "South of Dutch's Island Bridge",
          "location": "North of the bridge connecting Holland Valley and Henbane River",
          "guide": "Locate the submerged cage. Shoot the lock from above or underwater, then swim in to claim the barrel."
        },
        {
          "id": "whiskey_10",
          "name": "North of Dutch's Island",
          "location": "One-third distance between northern island and far shore",
          "guide": "Dive down into the structural wreckage along the lake bed to find the cask."
        },
        {
          "id": "whiskey_11",
          "name": "North of Vasquez Residence",
          "location": "Culvert pipe beneath the bridge to Joseph's Island",
          "guide": "Swim into the metal drainage pipe opening along the shoreline to reach the barrel inside."
        },
        {
          "id": "whiskey_12",
          "name": "South of Tanami Channel",
          "location": "Underwater drain system between islands south of Tanami Residence",
          "guide": "Locate the concrete drain pipe on the west side of the small island and grab the barrel inside."
        },
        {
          "id": "whiskey_13",
          "name": "West of Can of Worms Bridge",
          "location": "Fallen shipping containers under the bridge west of Can of Worms",
          "guide": "Dive down into the fully submerged shipping container; the cask is inside on the right."
        },
        {
          "id": "whiskey_14",
          "name": "Northwest of Dutch's Bunker",
          "location": "Ruins of submerged cabin northwest of Dutch's Bunker",
          "guide": "Follow the rope marker down to the flooded house foundation to retrieve the barrel."
        },
        {
          "id": "whiskey_15",
          "name": "Forest Research Station Dock",
          "location": "Lake floor just off the dock at Forest Research Station",
          "guide": "Dive down into the pile of sunken logs near the dock to pull out the final whiskey cask."
        }
      ]
    }
  }
};

// Section 2: Unified Firebase Configuration (entertainment-71888)
// Lines 373-397: Production credentials and authoritative service bindings
const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c",
    measurementId: "G-JDNSLD3GFE"
};

const app = (!firebase.apps || !firebase.apps.length) ? firebase.initializeApp(firebaseConfig) : firebase.app();
const auth = firebase.auth(app);
const rtdb = firebase.database(app);
const firestore = firebase.firestore(app);

try {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
    console.warn("[Auth Persistence]:", e);
}

const CURRENT_GAME_ID = "FarCry5";
const PSN_FC5_COMM_ID = "NPWR12514_00";

// Section 3: Global State Engine & COTW Hydration Core
// Lines 400-645: Structured entity trees matching COTW directly
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps', // 'ps', 'pc', 'xbox', 'steam'
    currentUser: null,
    gameData: fc5_embedded_data,
    psnSkeleton: null,
    myFriendCode: null,
    authInitialized: false,
    
    // Authoritative Root Schema
    activeMission: "Hope County Resistance",
    gameId: CURRENT_GAME_ID,
    trophies_earned: 0,
    trophies_total: 51,
    trophies_percent: 0,
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },

    // Resolves authoritative friend_code key (e.g., GQGI0SWY)
    getUserKey: function() {
        if (this.myFriendCode) return this.myFriendCode;
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    switchPlatform: function(newPlatform) {
        if (!newPlatform) return;
        this.platform = newPlatform.toLowerCase();
        
        const platformSelector = document.getElementById('platformSelector');
        if (platformSelector && platformSelector.value !== this.platform) {
            platformSelector.value = this.platform;
        }

        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }
        
        this.loadProgress();
        if (this.currentUser) {
            this.syncFriendsProgress();
        }
    },

    // Hydrate game JSON into COTW Map structures
    hydrateDefaultSchema: function() {
        if (!this.gameData) return;

        // 1. Collectibles (Baseball Cards, Comics, Bobbleheads, Lighters, Vinyl, Whiskey)
        if (this.gameData.collectibles) {
            for (const cKey in this.gameData.collectibles) {
                const group = this.gameData.collectibles[cKey];
                const totalItems = (group && Array.isArray(group.items)) ? group.items.length : 0;
                
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = {
                        collected: false,
                        count: 0,
                        psnSynced: false,
                        total: totalItems,
                        quest_name: group.quest_name || cKey,
                        items: {}
                    };
                }

                if (group && Array.isArray(group.items)) {
                    group.items.forEach(cItem => {
                        if (!this.collectibles[cKey].items[cItem.id]) {
                            this.collectibles[cKey].items[cItem.id] = {
                                collected: false,
                                name: cItem.name || '',
                                region: cItem.region || group.region || 'Hope County',
                                location: cItem.location || '',
                                psnSynced: false
                            };
                        }
                    });
                }
            }
        }

        // Perk Magazines mapped under collectibles tree
        if (this.gameData.survivalist_magazines) {
            if (!this.collectibles.survivalist_magazines) {
                this.collectibles.survivalist_magazines = {
                    collected: false,
                    count: 0,
                    psnSynced: false,
                    total: 0,
                    items: {}
                };
            }
            let magTotal = 0;
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.survivalist_magazines[reg] || [];
                magTotal += list.length;
                list.forEach((m, idx) => {
                    const mId = m.id || `mag_${reg}_${idx}`;
                    if (!this.collectibles.survivalist_magazines.items[mId]) {
                        this.collectibles.survivalist_magazines.items[mId] = {
                            collected: false,
                            name: m.name || `Perk Magazine ${idx + 1}`,
                            region: reg,
                            location: m.location || '',
                            psnSynced: false
                        };
                    }
                });
            });
            this.collectibles.survivalist_magazines.total = magTotal;
        }

        // 2. Prepper Stashes Map
        if (this.gameData.prepper_stashes) {
            ['holland_valley', 'henbane_river', 'whitetail_mountains'].forEach(reg => {
                const list = this.gameData.prepper_stashes[reg] || [];
                list.forEach(s => {
                    if (!this.stashes[s.id]) {
                        this.stashes[s.id] = {
                            collected: false,
                            name: s.name || '',
                            region: reg,
                            required_gear: s.required_gear || 'None',
                            location: s.location || '',
                            psnSynced: false
                        };
                    }
                });
            });
        }

        // 3. Roster Map (Guns & Fangs for Hire)
        if (Array.isArray(this.gameData.guns_and_fangs_for_hire)) {
            this.gameData.guns_and_fangs_for_hire.forEach(h => {
                if (!this.roster[h.id]) {
                    this.roster[h.id] = {
                        unlocked: false,
                        name: h.name || '',
                        type: h.type || 'Specialist',
                        unlock_mission: h.unlock_mission || '',
                        psnSynced: false
                    };
                }
            });
        }

        // 4. Walkthrough Missions Map
        if (Array.isArray(this.gameData.walkthrough_missions)) {
            this.gameData.walkthrough_missions.forEach(m => {
                if (!this.missions[m.id]) {
                    this.missions[m.id] = {
                        completed: false,
                        mission_name: m.mission_name || '',
                        region: m.region || 'Hope County',
                        psnSynced: false
                    };
                }
            });
        }

        // 5. Official Trophies Map
        const trophySource = (this.psnSkeleton && this.psnSkeleton.trophies) 
            ? Object.values(this.psnSkeleton.trophies) 
            : (this.gameData?.trophies_and_achievements || []);

        if (Array.isArray(trophySource)) {
            trophySource.forEach((t, idx) => {
                const tId = t.trophyId !== undefined ? t.trophyId : idx;
                const cardKey = `trophy_fc5_${tId}`;
                if (!this.trophies[cardKey]) {
                    this.trophies[cardKey] = {
                        earned: false,
                        name: t.name || t.trophyName || 'Trophy',
                        rank: (t.type || t.rank || 'Bronze').toUpperCase(),
                        psnSynced: false
                    };
                }
            });
        }

        this.recalculateMetrics();
    },

    recalculateMetrics: function() {
        let stashesCount = 0;
        let rosterCount = 0;
        let perksCount = 0;
        let totalCollectiblesCount = 0;
        let calculatedRP = 0;

        Object.values(this.stashes).forEach(s => {
            if (s && s.collected) {
                stashesCount++;
                calculatedRP += 400;
            }
        });

        Object.values(this.roster).forEach(h => {
            if (h && h.unlocked) {
                rosterCount++;
                calculatedRP += 600;
            }
        });

        Object.values(this.missions).forEach(m => {
            if (m && m.completed) {
                calculatedRP += 600;
            }
        });

        if (this.collectibles) {
            for (const cKey in this.collectibles) {
                const group = this.collectibles[cKey];
                if (group && group.items) {
                    let groupCount = 0;
                    Object.values(group.items).forEach(item => {
                        if (item && item.collected) {
                            groupCount++;
                            totalCollectiblesCount++;
                        }
                    });
                    group.count = groupCount;
                    group.collected = (group.total > 0 && groupCount >= group.total);
                }
            }
            if (this.collectibles.survivalist_magazines) {
                perksCount = this.collectibles.survivalist_magazines.count || 0;
            }
        }

        const earnedTrophies = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophies = Object.keys(this.trophies).length || 51;
        this.trophies_earned = earnedTrophies;
        this.trophies_total = totalTrophies;
        this.trophies_percent = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

        this.ranks.stashes = stashesCount;
        this.ranks.roster = rosterCount;
        this.ranks.perks = perksCount;
        this.ranks.collectibles = totalCollectiblesCount;
        this.ranks.rp = calculatedRP;

        this.updateRankDisplay('stashes', stashesCount);
        this.updateRankDisplay('roster', rosterCount);
        this.updateRankDisplay('perks', perksCount);
        this.updateRankDisplay('collectibles', totalCollectiblesCount);
        this.updateRankDisplay('rp', calculatedRP);
    },

    updateRankDisplay: function(rankKey, val) {
        const el = document.getElementById(`rank-val-${rankKey}`);
        if (el) el.innerText = val || 0;
    },

    buildPayload: function() {
        this.recalculateMetrics();
        return {
            activeMission: this.activeMission,
            gameId: CURRENT_GAME_ID,
            platform: this.platform,
            trophies_earned: this.trophies_earned,
            trophies_total: this.trophies_total,
            trophies_percent: this.trophies_percent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ranks: this.ranks,
            collectibles: this.collectibles,
            stashes: this.stashes,
            roster: this.roster,
            missions: this.missions,
            trophies: this.trophies
        };
    },

    applyPayload: function(payload) {
        if (!payload || typeof payload !== 'object') return;
        this.activeMission = payload.activeMission || "Hope County Resistance";
        this.trophies_earned = payload.trophies_earned || 0;
        this.trophies_total = payload.trophies_total || 51;
        this.trophies_percent = payload.trophies_percent || 0;
        
        if (payload.collectibles) {
            for (const cKey in payload.collectibles) {
                if (!this.collectibles[cKey]) this.collectibles[cKey] = payload.collectibles[cKey];
                else {
                    this.collectibles[cKey].collected = !!payload.collectibles[cKey].collected;
                    this.collectibles[cKey].count = payload.collectibles[cKey].count || 0;
                    if (payload.collectibles[cKey].items) {
                        this.collectibles[cKey].items = Object.assign({}, this.collectibles[cKey].items, payload.collectibles[cKey].items);
                    }
                }
            }
        }
        if (payload.stashes) this.stashes = Object.assign({}, this.stashes, payload.stashes);
        if (payload.roster) this.roster = Object.assign({}, this.roster, payload.roster);
        if (payload.missions) this.missions = Object.assign({}, this.missions, payload.missions);
        if (payload.trophies) this.trophies = Object.assign({}, this.trophies, payload.trophies);
        if (payload.ranks) this.ranks = Object.assign({}, this.ranks, payload.ranks);

        this.applyStateToUI();
    }
};

// Section 4: Authoritative Persistence Engine (FriendKey / Firestore Path Target)
// Lines 648-765: users/{friendKey}/platform/{platform}/progress/FarCry5
window.appState.saveProgress = function() {
    const payload = this.buildPayload();
    const userKey = this.getUserKey();

    if (!userKey) {
        const guestKey = `fc5_guest_progress_${this.platform}`;
        try {
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress cached locally [${this.platform.toUpperCase()}].`);
        } catch (e) {
            console.warn("[Guest Storage]:", e);
        }
        return;
    }

    if (firestore) {
        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("progress")
            .doc(CURRENT_GAME_ID);

        docRef.set(payload, { merge: true }).then(() => {
            this.updateStatus(`[Cloud Saved] users/${userKey}/platform/${this.platform}/progress/${CURRENT_GAME_ID}`);
        }).catch(err => {
            console.error("[Firestore Save Error]:", err);
            this.updateStatus(`Cloud Sync Failed: ${err.message}`);
        });
    }
};

window.appState.loadProgress = function() {
    const userKey = this.getUserKey();
    this.hydrateDefaultSchema();

    if (!userKey) {
        const guestKey = `fc5_guest_progress_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.applyPayload(parsed);
                this.updateStatus(`[Guest Mode] Restored progress from this device [${this.platform.toUpperCase()}].`);
                return;
            }
        } catch (e) {}

        this.applyStateToUI();
        this.updateStatus(`[Guest Mode] Clean Ledger [${this.platform.toUpperCase()}].`);
        return;
    }

    if (firestore) {
        this.updateStatus(`Reading cloud ledger: users/${userKey}/platform/${this.platform.toUpperCase()}...`);

        const docRef = firestore
            .collection("users")
            .doc(userKey)
            .collection("platform")
            .doc(this.platform)
            .collection("progress")
            .doc(CURRENT_GAME_ID);

        docRef.get().then(doc => {
            if (doc.exists) {
                const cloudData = doc.data();
                this.applyPayload(cloudData);
                this.updateStatus(`[Cloud Restored] Loaded: users/${userKey}/platform/${this.platform}/progress/${CURRENT_GAME_ID}`);
            } else {
                // Seed entire embedded JSON payload into Firestore immediately
                this.applyStateToUI();
                this.saveProgress();
                this.updateStatus(`[Cloud Seeded] Pushed default JSON ledger to Firestore: users/${userKey}`);
            }
        }).catch(err => {
            console.warn("[Firestore Fetch Error]:", err);
            this.updateStatus(`Failed to read cloud save: ${err.message}`);
        });
    }
};

window.appState.migrateGuestProgressIfPresent = async function() {
    const userKey = this.getUserKey();
    if (!userKey) return;

    const guestKey = `fc5_guest_progress_${this.platform}`;
    let guestData = null;

    try {
        const raw = localStorage.getItem(guestKey);
        if (raw) guestData = JSON.parse(raw);
    } catch (e) {}

    if (guestData && (
        (guestData.ranks && guestData.ranks.rp > 0) ||
        Object.keys(guestData.stashes || {}).length > 0 ||
        Object.keys(guestData.collectibles || {}).length > 0 ||
        Object.keys(guestData.missions || {}).length > 0
    )) {
        this.updateStatus("Importing guest checks to your Cloud Ledger...");
        this.applyPayload(guestData);
        this.saveProgress();

        localStorage.removeItem(guestKey);
        this.updateStatus("Guest checks successfully synced to your cloud account.");
    }
};

// Section 5: UI Painting & Toggle Interactions
// Lines 768-850: Instant check states
window.appState.applyStateToUI = function() {
    this.recalculateMetrics();

    document.querySelectorAll('.fc5-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'mission';
        const group = card.getAttribute('data-group') || null;
        let isDone = false;

        if (type === 'stash') {
            isDone = !!(this.stashes[id]?.collected);
        } else if (type === 'roster') {
            isDone = !!(this.roster[id]?.unlocked);
        } else if (type === 'collectible') {
            if (group && this.collectibles[group]?.items?.[id]) {
                isDone = !!(this.collectibles[group].items[id].collected);
            }
        } else if (type === 'magazine') {
            if (this.collectibles.survivalist_magazines?.items?.[id]) {
                isDone = !!(this.collectibles.survivalist_magazines.items[id].collected);
            }
        } else if (type === 'trophy') {
            isDone = !!(this.trophies[id]?.earned);
        } else {
            isDone = !!(this.missions[id]?.completed);
        }

        const btn = card.querySelector('.check-btn');
        if (isDone) {
            card.classList.add('completed');
            if (btn) {
                btn.classList.add('is-done');
                btn.innerHTML = '✓';
            }
        } else {
            card.classList.remove('completed');
            if (btn) {
                btn.classList.remove('is-done');
                btn.innerHTML = '';
            }
        }
    });
};

window.appState.toggleItem = function(itemId, type, group) {
    if (type === 'stash') {
        if (!this.stashes[itemId]) this.stashes[itemId] = { collected: false, psnSynced: false };
        this.stashes[itemId].collected = !this.stashes[itemId].collected;
    } else if (type === 'roster') {
        if (!this.roster[itemId]) this.roster[itemId] = { unlocked: false, psnSynced: false };
        this.roster[itemId].unlocked = !this.roster[itemId].unlocked;
    } else if (type === 'collectible') {
        if (group && this.collectibles[group]?.items?.[itemId]) {
            this.collectibles[group].items[itemId].collected = !this.collectibles[group].items[itemId].collected;
        }
    } else if (type === 'magazine') {
        if (this.collectibles.survivalist_magazines?.items?.[itemId]) {
            this.collectibles.survivalist_magazines.items[itemId].collected = !this.collectibles.survivalist_magazines.items[itemId].collected;
        }
    } else if (type === 'trophy') {
        if (!this.trophies[itemId]) this.trophies[itemId] = { earned: false, psnSynced: false };
        this.trophies[itemId].earned = !this.trophies[itemId].earned;
    } else {
        if (!this.missions[itemId]) this.missions[itemId] = { completed: false, psnSynced: false };
        this.missions[itemId].completed = !this.missions[itemId].completed;
    }

    this.applyStateToUI();
    this.saveProgress();
};

window.appState.updateStatus = function(msg) {
    const statLine = document.getElementById('stat-line');
    if (statLine) {
        statLine.innerText = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`;
    }
};

window.adjRank = function(rankKey, delta) {
    if (!appState.ranks) appState.ranks = {};
    const current = Number(appState.ranks[rankKey] || 0);
    const nextVal = Math.max(0, current + delta);
    appState.ranks[rankKey] = nextVal;
    appState.updateRankDisplay(rankKey, nextVal);
    appState.saveProgress();
};

// Section 6: Squad Co-Op Bridge via RTDB Friend Codes
// Lines 853-935: Realtime squad sync querying users/{friendTargetKey}/platform/{platform}/progress/FarCry5
window.appState.fetchUserFriendCode = async function() {
    if (!this.currentUser || !this.currentUser.email || !rtdb) return;
    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    try {
        const snap = await rtdb.ref(`/users/${emailKey}/friend_code`).once('value');
        this.myFriendCode = snap.val() || 'GQGI0SWY';
        const display = document.getElementById('myFriendCodeDisplay');
        if (display) display.innerText = this.myFriendCode;
    } catch (e) {
        console.warn("[Friend Code Fetch]:", e);
    }
};

window.appState.syncFriendsProgress = async function() {
    const rosterContainer = document.getElementById('friendsRosterContainer');
    if (!rosterContainer) return;

    if (!this.currentUser || !this.currentUser.email || !rtdb) {
        rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Sign in to view your Squad Co-Op Ledger.</div>';
        return;
    }

    const emailKey = this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');

    try {
        const friendsSnap = await rtdb.ref(`/users/${emailKey}/friends`).once('value');
        const friendsData = friendsSnap.val();

        if (!friendsData || Object.keys(friendsData).length === 0) {
            rosterContainer.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">No squad members linked yet. Share your friend code to link co-op members.</div>';
            return;
        }

        let cardsHtml = '';
        for (const [fKey, fObj] of Object.entries(friendsData)) {
            const friendUsername = fObj.username || fKey;
            // Target friend code or sanitized email
            const friendTargetKey = fObj.friend_code || (fObj.email ? fObj.email.replace(/@/g, '_at_').replace(/\./g, '_') : fKey);

            let friendData = null;
            if (firestore) {
                try {
                    const fDoc = await firestore
                        .collection("users")
                        .doc(friendTargetKey)
                        .collection("platform")
                        .doc(this.platform)
                        .collection("progress")
                        .doc(CURRENT_GAME_ID)
                        .get();

                    if (fDoc.exists) {
                        friendData = fDoc.data();
                    }
                } catch (err) {}
            }

            const rpVal = friendData?.ranks?.rp || 0;
            const stashesVal = friendData?.ranks?.stashes || 0;
            const colVal = friendData?.ranks?.collectibles || 0;
            const trophyPercent = friendData?.trophies_percent || 0;

            cardsHtml += `
                <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="font-weight:900; color:#fff; font-size:0.95rem;">${escapeHtml(friendUsername)}</div>
                        <span style="font-size:0.7rem; font-weight:800; background:rgba(255,85,0,0.2); color:var(--user-theme-accent); padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                            ${escapeHtml(this.platform)}
                        </span>
                    </div>
                    <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;">
                        <strong>RP:</strong> ${rpVal} • <strong>Stashes:</strong> ${stashesVal} • <strong>Collectibles:</strong> ${colVal}
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8;">
                        Trophy Progress: <strong>${trophyPercent}%</strong>
                    </div>
                </div>
            `;
        }

        rosterContainer.innerHTML = cardsHtml;
    } catch (e) {
        console.warn("[Friends Roster Error]:", e);
    }
};

// Section 7: Dynamic Navbar & Branding (/utm_links)
// Lines 938-1030: Strict rowNumber sorting and logo/favicon dynamic binding
async function buildUtmNavigation() {
    const navContainer = document.getElementById('dynamicNavLinks');
    if (!rtdb) return;

    try {
        const snap = await rtdb.ref('/utm_links').once('value');
        const data = snap.val();
        if (!data) return;

        const settingsLogo = data?.Settings?.[0]?.image || data?.Settings?.image;
        if (settingsLogo) {
            const logoUrl = toSecureUrl(settingsLogo);
            const fav1 = document.getElementById('dynamicFavicon');
            const fav2 = document.getElementById('dynamicAppleIcon');
            const navLogo = document.getElementById('navHeaderLogo');
            if (fav1) fav1.href = logoUrl;
            if (fav2) fav2.href = logoUrl;
            if (navLogo) navLogo.src = logoUrl;
        }

        if (!navContainer) return;

        const linksList = [];
        function walk(node) {
            if (!node || typeof node !== 'object') return;
            const url = node.url || node.link || node.href;
            if (url && typeof url === 'string') {
                linksList.push({
                    title: node.title || node.name || 'Link',
                    url: toSecureUrl(url),
                    image: toSecureUrl(node.image || node.thumb || null),
                    group: node.group ? String(node.group).trim() : 'Standalone',
                    rowNumber: Number(node.rowNumber || 999)
                });
                return;
            }
            Object.values(node).forEach(child => walk(child));
        }
        walk(data);

        const standalone = [];
        const groups = {};

        linksList.forEach(item => {
            const grp = item.group;
            if (grp.toLowerCase() === 'standalone' || grp === '') {
                standalone.push(item);
            } else {
                if (!groups[grp]) groups[grp] = [];
                groups[grp].push(item);
            }
        });

        const groupCards = Object.entries(groups).map(([gName, items]) => {
            items.sort((a, b) => a.rowNumber - b.rowNumber);
            return {
                title: gName,
                isGroup: true,
                items: items,
                sortWeight: Math.min(...items.map(i => i.rowNumber))
            };
        });

        const standaloneCards = standalone.map(item => ({
            ...item,
            isGroup: false,
            sortWeight: item.rowNumber
        }));

        const unifiedMenu = [...groupCards, ...standaloneCards].sort((a, b) => a.sortWeight - b.sortWeight);

        let navHtml = '';
        unifiedMenu.forEach(entry => {
            if (entry.isGroup) {
                navHtml += `
                    <div class="nav-folder">
                        <button type="button" class="nav-btn" onclick="this.parentElement.classList.toggle('active')">
                            <i class="fas fa-folder text-yellow-400"></i>
                            <span>${escapeHtml(entry.title)}</span>
                            <span style="font-size:9px;">▾</span>
                        </button>
                        <div class="folder-menu">
                            ${entry.items.map(sub => `
                                <a href="${sub.url}" class="nav-btn" style="width:100%; justify-content:flex-start;">
                                    ${sub.image ? `<img src="${sub.image}" class="nav-icon" onerror="this.style.display='none'">` : ''}
                                    <span class="truncate">${escapeHtml(sub.title)}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                navHtml += `
                    <a href="${entry.url}" class="nav-btn">
                        ${entry.image ? `<img src="${entry.image}" class="nav-icon" onerror="this.style.display='none'">` : ''}
                        <span>${escapeHtml(entry.title)}</span>
                    </a>
                `;
            }
        });

        navContainer.innerHTML = navHtml;
    } catch (e) {
        console.warn("[UTM Navigation Fetch]:", e);
    }
}

// Section 8: PSN Skeleton & Live Trophy Tracking
// Lines 1033-1095: CommID NPWR12514_00 telemetry
async function syncPsnSkeleton() {
    if (!rtdb) return;
    try {
        const snap = await rtdb.ref(`/psn/games/${PSN_FC5_COMM_ID}`).once('value');
        const skeleton = snap.val();
        if (!skeleton) return;

        appState.psnSkeleton = skeleton;

        const posterUrl = toSecureUrl(skeleton.posterArt);
        if (posterUrl) {
            const fav1 = document.getElementById('dynamicFavicon');
            const fav2 = document.getElementById('dynamicAppleIcon');
            const navLogo = document.getElementById('navHeaderLogo');
            if (fav1 && !fav1.href.includes('/utm_links/')) fav1.href = posterUrl;
            if (fav2 && !fav2.href.includes('/utm_links/')) fav2.href = posterUrl;
            if (navLogo && !navLogo.src.includes('/utm_links/')) navLogo.src = posterUrl;
        }

        if (appState.currentUser && appState.platform === 'ps') {
            await autoCheckUserPsnTrophies();
        }
    } catch (e) {
        console.warn("[PSN Skeleton Sync]:", e);
    }
}

async function autoCheckUserPsnTrophies() {
    if (!appState.currentUser || !appState.currentUser.email || !rtdb) return;
    const emailKey = appState.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');

    try {
        const userProfileSnap = await rtdb.ref(`/users/${emailKey}/psn_username`).once('value');
        const gamertag = userProfileSnap.val() || 'wildhorse_spirit';

        const liveTrophiesSnap = await rtdb.ref(`/psn/gamertags/${gamertag}/liveTrophyProgress/${PSN_FC5_COMM_ID}`).once('value');
        const liveTrophies = liveTrophiesSnap.val();

        if (liveTrophies && typeof liveTrophies === 'object') {
            let stateModified = false;
            Object.entries(liveTrophies).forEach(([tId, tObj]) => {
                if (tObj && (tObj.earned === true || tObj.isEarned === true)) {
                    const cardKey = `trophy_fc5_${tId}`;
                    if (!appState.trophies[cardKey] || !appState.trophies[cardKey].earned) {
                        appState.trophies[cardKey] = {
                            earned: true,
                            name: tObj.trophyName || appState.trophies[cardKey]?.name || 'Trophy',
                            rank: (tObj.trophyType || 'Bronze').toUpperCase(),
                            psnSynced: true
                        };
                        stateModified = true;
                    }
                }
            });

            if (stateModified) {
                appState.applyStateToUI();
                appState.saveProgress();
            }
        }
    } catch (e) {
        console.warn("[Live Trophy Auto-Check]:", e);
    }
}

// Section 9: Render Far Cry 5 Tactical Sections (EXPANDED BY DEFAULT)
// Lines 1098-1300: Content is immediately visible on screen
function renderFarCry5Companion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // 9A. Walkthrough Missions
    if (Array.isArray(data.walkthrough_missions)) {
        html += `
        <section class="category-section" id="cat-walkthroughs">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>📖 Story Campaign & Boss Encounters (${data.walkthrough_missions.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.walkthrough_missions.map(item => `
                        <div class="trophy-card fc5-item-card" data-id="${item.id}" data-type="mission">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-gold">${escapeHtml(item.region || 'Hope County')}</span>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(item.mission_name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}', 'mission')" aria-label="Toggle Mission"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 9B. Prepper Stashes
    if (data.prepper_stashes) {
        const regions = [
            { key: 'holland_valley', label: 'Holland Valley (John)' },
            { key: 'henbane_river', label: 'Henbane River (Faith)' },
            { key: 'whitetail_mountains', label: 'Whitetail Mountains (Jacob)' }
        ];

        regions.forEach(reg => {
            const list = data.prepper_stashes[reg.key];
            if (Array.isArray(list) && list.length > 0) {
                html += `
                <section class="category-section" id="cat-stash-${reg.key}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>📦 Prepper Stashes — ${reg.label} (${list.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${list.map(s => `
                                <div class="trophy-card fc5-item-card" data-id="${s.id}" data-type="stash">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'No Gear Required')}</span>
                                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(s.name)}</h3>
                                            <div style="font-size:0.75rem; color:var(--user-theme-accent);">${escapeHtml(s.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${s.id}', 'stash')" aria-label="Toggle Stash"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(s.guide || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        });
    }

    // 9C. Survivalist & Perk Magazines
    if (data.survivalist_magazines) {
        const regions = [
            { key: 'holland_valley', label: 'Holland Valley' },
            { key: 'henbane_river', label: 'Henbane River' },
            { key: 'whitetail_mountains', label: 'Whitetail Mountains' }
        ];

        let totalMags = 0;
        regions.forEach(r => totalMags += (data.survivalist_magazines[r.key] || []).length);

        if (totalMags > 0) {
            html += `
            <section class="category-section" id="cat-magazines">
                <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                    <h2>📚 Survivalist & Perk Magazines (${totalMags})</h2>
                    <span>▾</span>
                </div>
                <div class="section-content">
                    <div class="trophy-grid">
                        ${regions.flatMap(reg => (data.survivalist_magazines[reg.key] || []).map((m, idx) => {
                            const mId = m.id || `mag_${reg.key}_${idx}`;
                            return `
                                <div class="trophy-card fc5-item-card" data-id="${mId}" data-type="magazine">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(reg.label)}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(m.name || `Perk Magazine ${idx + 1}`)}</h3>
                                            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(m.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${mId}', 'magazine')" aria-label="Toggle Magazine"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(m.guide || '')}</p>
                                </div>
                            `;
                        })).join('')}
                    </div>
                </div>
            </section>`;
        }
    }

    // 9D. Hope County Collectibles (Baseball Cards, Comic Books, Bobbleheads, Lighters, Vinyl Crates, Whiskey Barrels)
    if (data.collectibles) {
        for (const cKey in data.collectibles) {
            const group = data.collectibles[cKey];
            if (group && Array.isArray(group.items)) {
                const groupTitle = group.quest_name ? `${group.quest_name} (${cKey.replace(/_/g, ' ').toUpperCase()})` : cKey.replace(/_/g, ' ').toUpperCase();
                html += `
                <section class="category-section" id="cat-col-${cKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(groupTitle)} (${group.items.length})</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        ${group.quest_giver ? `
                            <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; border-left:3px solid var(--user-theme-accent);">
                                <strong>Quest Giver:</strong> ${escapeHtml(group.quest_giver)} &bull; 
                                <strong>Location:</strong> ${escapeHtml(group.quest_giver_location || 'Hope County')}
                                ${group.required_perk ? ` &bull; <strong>Required Perk:</strong> <span style="color:#38bdf8;">${escapeHtml(group.required_perk)}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="trophy-grid">
                            ${group.items.map(item => `
                                <div class="trophy-card fc5-item-card" data-id="${item.id}" data-type="collectible" data-group="${cKey}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || group.region || 'Hope County')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name)}</h3>
                                            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(item.location || '')}</div>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${item.id}', 'collectible', '${cKey}')" aria-label="Toggle Collectible"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        }
    }

    // 9E. Guns & Fangs for Hire
    if (Array.isArray(data.guns_and_fangs_for_hire)) {
        html += `
        <section class="category-section" id="cat-roster">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🐾 Guns & Fangs for Hire (${data.guns_and_fangs_for_hire.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.guns_and_fangs_for_hire.map(h => `
                        <div class="trophy-card fc5-item-card" data-id="${h.id}" data-type="roster">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-platinum">${escapeHtml(h.type)}</span>
                                    <h3 style="color:#fff; font-size:1.05rem; margin-top:4px;">${escapeHtml(h.name)}</h3>
                                    <div style="font-size:0.8rem; color:var(--user-theme-accent); font-weight:700;">${escapeHtml(h.title || '')}</div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${h.id}', 'roster')" aria-label="Toggle Hire"></button>
                            </div>
                            <div style="font-size:0.78rem; color:#cbd5e1; margin-bottom:8px;">
                                <strong>Unlock Mission:</strong> ${escapeHtml(h.unlock_mission)} (${escapeHtml(h.location || 'Hope County')})
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // 9F. PSN Official Trophies & Achievements
    const trophiesList = (appState.psnSkeleton && appState.psnSkeleton.trophies) ? Object.values(appState.psnSkeleton.trophies) : (data.trophies_and_achievements || []);

    if (Array.isArray(trophiesList) && trophiesList.length > 0) {
        html += `
        <section class="category-section" id="cat-trophies">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🏆 PSN Official Trophies & Achievements (${trophiesList.length})</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${trophiesList.map((t, idx) => {
                        const tId = t.trophyId !== undefined ? t.trophyId : idx;
                        const trophyCardId = `trophy_fc5_${tId}`;
                        const tName = t.name || t.trophyName || 'Trophy';
                        const tDesc = t.detail || t.description || '';
                        const tIcon = toSecureUrl(t.icon || t.trophyIconUrl || '');
                        const tType = (t.type || t.rank || 'Bronze').toUpperCase();

                        let badgeClass = 'rank-bronze';
                        if (tType.includes('PLATINUM')) badgeClass = 'rank-platinum';
                        else if (tType.includes('GOLD')) badgeClass = 'rank-gold';
                        else if (tType.includes('SILVER')) badgeClass = 'rank-silver';

                        return `
                        <div class="trophy-card fc5-item-card" data-id="${trophyCardId}" data-type="trophy">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${tIcon ? `<img src="${tIcon}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'">` : ''}
                                    <div>
                                        <span class="trophy-rank ${badgeClass}">${escapeHtml(tType)}</span>
                                        <h3 style="color:#fff; font-size:0.95rem; margin-top:2px;">${escapeHtml(tName)}</h3>
                                    </div>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${trophyCardId}', 'trophy')" aria-label="Toggle Trophy"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(tDesc)}</p>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </section>`;
    }

    container.innerHTML = html;
    appState.applyStateToUI();
}

// Section 10: Sanitization & URL Normalization
// Lines 1303-1325: Protocol sanitization
function toSecureUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('/')) return trimmed;
    if (trimmed.startsWith('http://static-resource.np.community.playstation.net/')) {
        return trimmed.replace('http://static-resource.np.community.playstation.net/', 'https://static-resource.np.community.playstation.net/');
    }
    if (trimmed.startsWith('http://')) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return trimmed;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Section 11: Universal Self-Starting Lifecycle Gate
// Lines 1328-1430: Guarantees immediate painting regardless of loader timing
async function initFarCry5Engine() {
    await buildUtmNavigation();

    const platformSelector = document.getElementById('platformSelector');
    if (platformSelector) {
        platformSelector.value = appState.platform;
        platformSelector.addEventListener('change', (e) => {
            appState.switchPlatform(e.target.value);
        });
    }

    const menuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('dynamicNavLinks');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('is-open');
        });
    }

    const authBtn = document.getElementById('authModalBtn');
    const authModal = document.getElementById('authModal');
    const authClose = document.getElementById('authModalClose');
    const googleBtn = document.getElementById('googleSignInBtn');

    if (authBtn && authModal) authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
    if (authClose && authModal) authClose.addEventListener('click', () => authModal.classList.add('hidden'));

    if (googleBtn && auth) {
        googleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(err => {
                console.error("[Auth Popup Error]:", err);
                alert(`Sign-in error: ${err.message}`);
            });
        });
    }

    // 1. Instant painting of embedded ledger directly to the DOM
    renderFarCry5Companion(fc5_embedded_data);
    await syncPsnSkeleton();
    appState.loadProgress();

    // 2. Auth State Changed Listener
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            appState.authInitialized = true;
            if (user) {
                appState.currentUser = user;
                appState.activeEmail = user.email;
                appState.activeUser = user.displayName || 'Resistance Member';

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `${appState.activeUser.toUpperCase()} [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.add('hidden');
                const badge = document.getElementById('userProfileBadge');
                const avatar = document.getElementById('headerUserAvatar');
                const nameBadge = document.getElementById('userDisplayName');
                if (badge) badge.classList.remove('hidden');
                if (avatar && user.photoURL) avatar.src = user.photoURL;
                if (nameBadge) nameBadge.innerText = appState.activeUser;
                if (authModal) authModal.classList.add('hidden');

                // Retrieve friend code (e.g. GQGI0SWY) then load/seed cloud ledger
                await appState.fetchUserFriendCode();
                await appState.loadProgress();
                await appState.migrateGuestProgressIfPresent();
                await appState.syncFriendsProgress();
            } else {
                appState.currentUser = null;
                appState.activeEmail = null;
                appState.activeUser = 'Guest';

                const nameEl = document.getElementById('resistance-name');
                if (nameEl) nameEl.innerText = `GUEST [${appState.platform.toUpperCase()}]`;

                if (authBtn) authBtn.classList.remove('hidden');
                const badge = document.getElementById('userProfileBadge');
                if (badge) badge.classList.add('hidden');

                appState.loadProgress();
            }
        });
    }

    // 3. Optional Remote Merge Check (/game_data/farcry5)
    if (rtdb) {
        try {
            const rtdbSnap = await rtdb.ref('/game_data/farcry5').once('value');
            const rtdbJson = rtdbSnap.val();
            if (rtdbJson) {
                appState.gameData = Object.assign({}, fc5_embedded_data, rtdbJson);
                renderFarCry5Companion(appState.gameData);
                appState.loadProgress();
            }
        } catch (e) {}
    }
}

// Authoritative Execution Gate: Fire immediately if document is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFarCry5Engine);
} else {
    initFarCry5Engine();
}
