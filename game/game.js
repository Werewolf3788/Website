/* ============================================================================
 * Project: Universal Multi-Game Resistance Companion & Field Ledger
 * File: game.js
 * Location: /game/game.js
 * Version: 11.4.0-EMBEDDED-DATA-ENGINE
 * Build Timestamp: 2026-10-27 22:35:00 EDT (America/New_York)
 * Primary Backend: entertainment-71888
 * ============================================================================ */

// Section 1: Cloud Credentials & Core Initializers
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

window.squadProgressCache = {};

// Embedded Far Cry 5 Master Data Catalog
const EMBEDDED_FARCRY5_DATA = {
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
      "quest_giver": "Sherri",
      "quest_giver_location": "Can of Worms Fishing Store, Silver Lake, Henbane River",
      "required_perk": "Human Fish",
      "total_count": 15,
      "items": [
        {
          "id": "whiskey_01",
          "region": "Henbane River",
          "name": "East of Can of Worms Fishing Store",
          "location": "Silver Lake shallows east of the fishing store",
          "guide": "Swim out from the shore and dive into the lake bed; the barrel sits in reeds beside a submerged log."
        },
        {
          "id": "whiskey_02",
          "region": "Henbane River",
          "name": "West of Drubman Marina",
          "location": "Silver Lake waters west of Drubman Marina",
          "guide": "Dive underwater between a large boulder and a fallen log to retrieve the barrel."
        },
        {
          "id": "whiskey_03",
          "region": "Henbane River",
          "name": "Silver Lake Campgrounds",
          "location": "Just north off the shoreline of Silver Lake Campgrounds",
          "guide": "Dive down next to a large rock and a floating Bliss barrel."
        },
        {
          "id": "whiskey_04",
          "region": "Henbane River",
          "name": "Tanami Residence",
          "location": "Island offshore from Tanami Residence",
          "guide": "Locate the metal shipping container suspended from a crane over the water; swim inside the open end to find the barrel at the bottom."
        },
        {
          "id": "whiskey_05",
          "region": "Whitetail Mountains",
          "name": "West of Tanami Residence",
          "location": "Lake inlet halfway toward the northern bridge",
          "guide": "Dive into a small underwater rocky cavern along the lake bed to locate the barrel."
        },
        {
          "id": "whiskey_06",
          "region": "Whitetail Mountains",
          "name": "East of Oberlin Picnic Area",
          "location": "Silver Lake inlet south of two small islands",
          "guide": "Submerge into another small rocky underwater alcove marked on the map."
        },
        {
          "id": "whiskey_07",
          "region": "Whitetail Mountains",
          "name": "South of Oberlin Picnic Area",
          "location": "Coastal rocky outcropping on an island south of Oberlin Picnic Area",
          "guide": "The barrel is on top of tall rocks above water. Grapple to Adelaide's helicopter or fly up to drop onto the high rock ledge."
        },
        {
          "id": "whiskey_08",
          "region": "Whitetail Mountains",
          "name": "Clagett Bay",
          "location": "Under the lake surface below the large island in Clagett Bay",
          "guide": "Dive down to locate a sunken helicopter; the barrel is resting inside the wreckage."
        },
        {
          "id": "whiskey_09",
          "region": "Dutch's Island",
          "name": "Forest Research Station",
          "location": "Off the coast of Dutch's Island near the Forest Research Station",
          "guide": "Dive beneath the water surface and retrieve the barrel pinned under a pile of submerged timber."
        },
        {
          "id": "whiskey_10",
          "region": "Holland Valley",
          "name": "West of Silver Lake Boathouse",
          "location": "Open water halfway between Dutch's Island and Holland shore",
          "guide": "Dive straight down roughly 150m southwest of the research station to find the barrel on the lake floor."
        },
        {
          "id": "whiskey_11",
          "region": "Henbane River",
          "name": "South of Central Radio Tower",
          "location": "Under the southern bridge near Dutch's Island border",
          "guide": "Locate the submerged cage near a large rock formation; swim around the open side to collect the barrel."
        },
        {
          "id": "whiskey_12",
          "region": "Whitetail Mountains",
          "name": "North of Dutch's Island",
          "location": "Lake waters north of Dutch's Island above two islets",
          "guide": "Dive through murky water to search the sunken debris field where the barrel is lodged."
        },
        {
          "id": "whiskey_13",
          "region": "Henbane River",
          "name": "North of Vasquez Residence",
          "location": "Under the bridge north of Vasquez Residence",
          "guide": "Enter the large metal pipe opening from the land side and swim through to retrieve the barrel at the end of the line."
        },
        {
          "id": "whiskey_14",
          "region": "Henbane River",
          "name": "South of Tanami Residence",
          "location": "Channel between islands south of Tanami Residence",
          "guide": "Dive down and enter the mouth of an underwater drainage culvert to collect the barrel."
        },
        {
          "id": "whiskey_15",
          "region": "Henbane River",
          "name": "West of Can of Worms Fishing Store",
          "location": "Bridge canal west of Can of Worms Fishing Store",
          "guide": "Locate the fully submerged shipping container among the wrecks, swim inside, and make an immediate left-then-right turn to grab the final barrel."
        }
      ]
    }
  },
  "prepper_stashes": {
    "holland_valley": [
      {
        "id": "stash_hv_01",
        "name": "Deep Dive",
        "location": "Laurel Residence, directly west of Rye & Son's Aviation",
        "required_gear": "None",
        "unique_rewards": null,
        "guide": "Read the note inside the house on the kitchen counter. Go out to the backyard shed, open the hatch beside it, and climb down the ladder into the water."
      },
      {
        "id": "stash_hv_02",
        "name": "D.I.Y. and D.O.A.",
        "location": "Doverspike Compound, foot of the mountains in northwest Holland Valley",
        "required_gear": "None",
        "unique_rewards": null,
        "guide": "Read the clue next to the shed door to the left of the house. Head inside the main house to the back bedroom dresser to retrieve the shed key."
      }
    ],
    "henbane_river": [
      {
        "id": "stash_hr_01",
        "name": "Animal Control",
        "location": "Howling Cave, down the hill north of Peaches Taxidermy",
        "required_gear": "Grappling Hook",
        "unique_rewards": null,
        "guide": "Read the note on the crate down the hill from the cave mouth. Eliminate the cultists outside and enter the cave."
      }
    ],
    "whitetail_mountains": [
      {
        "id": "stash_wm_01",
        "name": "Cliffhanger",
        "location": "Crashed truck beneath the bridge on the western edge of Whitetail Mountains",
        "required_gear": "Grappling Hook",
        "unique_rewards": null,
        "guide": "Inspect Ted's note beside the crashed truck in the ravine bottom. Follow the blood trail heading up the hill toward the waterfall cliff."
      }
    ]
  },
  "guns_and_fangs_for_hire": [
    {
      "id": "hire_01",
      "name": "Adelaide Drubman",
      "title": "The Chopper Queen",
      "type": "Guns For Hire",
      "region": "Henbane River",
      "location": "Drubman Marina",
      "unlock_mission": "Friendly Skies",
      "skills": [
        { "name": "Call a Chopper", "description": "Will provide air support and deliver a helicopter." },
        { "name": "Less Reload", "description": "Gun + Big Magazine = More shooting." }
      ]
    },
    {
      "id": "hire_02",
      "name": "Boomer",
      "title": "The Good Boy",
      "type": "Fangs For Hire",
      "region": "Holland Valley",
      "location": "Rae-Rae's Pumpkin Farm",
      "unlock_mission": "Man's Best Friend",
      "skills": [
        { "name": "Pointer", "description": "Will tag all enemies nearby." },
        { "name": "Retriever", "description": "Will sometimes fetch a weapon after an attack." }
      ]
    }
  ],
  "walkthrough_missions": [
    {
      "id": "walkthrough_prologue_01",
      "mission_name": "The Warrant",
      "region": "Dutch's Island (Prologue)",
      "guide": "Follow Sheriff Whitehorse on rails into the church. Approach Joseph Seed when instructed."
    }
  ]
};

// Section 2: Universal State Engine
window.appState = {
    activeUser: 'Guest',
    activeEmail: null,
    platform: 'ps',
    currentUser: null,
    gameData: EMBEDDED_FARCRY5_DATA,
    psnSkeleton: null,
    myFriendCode: null,
    myPsnGamertag: null,
    myPsnAccountId: null,
    psnLinks: [],
    psnLive: null,
    isCloudLoaded: false,
    
    activeGame: "Far Cry 5",
    activeGameId: "FarCry5",
    activePsnCommId: "NPWR12514_00",
    activeMission: "Hope County Resistance",

    trophies_earned: 0,
    trophies_total: 51,
    trophies_percent: 0,
    collectibles: {},
    stashes: {},
    roster: {},
    missions: {},
    trophies: {},
    custom: {},
    ranks: { rp: 0, outposts: 0, cultProperty: 0, stashes: 0, roster: 0, perks: 0, collectibles: 0 },

    getEmailKey: function() {
        if (!this.currentUser || !this.currentUser.email) return null;
        return this.currentUser.email.replace(/@/g, '_at_').replace(/\./g, '_');
    },

    switchPlatform: async function(newPlatform) {
        if (!newPlatform) return;
        this.platform = newPlatform.toLowerCase();
        this.isCloudLoaded = false;
        
        const platformSelector = document.getElementById('platformSelect');
        if (platformSelector && platformSelector.value !== this.platform) {
            platformSelector.value = this.platform;
        }

        const nameEl = document.getElementById('resistance-name');
        if (nameEl) {
            const displayName = this.currentUser ? this.activeUser.toUpperCase() : 'GUEST';
            nameEl.innerText = `${displayName} [${this.platform.toUpperCase()}]`;
        }
        
        await this.loadProgress();
        await this.refreshPsnProgress();
        if (this.currentUser) {
            await this.syncFriendsProgress();
        }
    },

    hydrateDefaultSchema: function() {
        if (!this.gameData) return;
        this.psnLinks = buildPsnLinks(this.gameData);
        if (!this.custom) this.custom = {};

        const data = this.gameData;
        const systemKeys = new Set(['game', 'gameId', 'commId', 'psn_communication_id', 'activeMission', 'version', 'ranks', 'trophies_and_achievements']);

        if (data.collectibles) {
            for (const cKey in data.collectibles) {
                const group = data.collectibles[cKey];
                const itemsList = (group && Array.isArray(group.items)) ? group.items : [];
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = {
                        collected: false,
                        count: 0,
                        psnSynced: false,
                        total: itemsList.length,
                        quest_name: group.quest_name || cKey,
                        items: {}
                    };
                }
                itemsList.forEach((cItem, idx) => {
                    const cId = cItem.id !== undefined ? String(cItem.id) : `col_${cKey}_${idx}`;
                    if (!this.collectibles[cKey].items[cId]) {
                        this.collectibles[cKey].items[cId] = {
                            collected: false,
                            name: cItem.name || '',
                            region: cItem.region || group.region || '',
                            location: cItem.location || '',
                            target: resolveItemTarget(cItem),
                            count: 0,
                            psnSynced: false
                        };
                    }
                });
            }
        }

        if (data.prepper_stashes) {
            Object.entries(data.prepper_stashes).forEach(([regKey, stashList]) => {
                if (Array.isArray(stashList)) {
                    stashList.forEach(s => {
                        const sId = String(s.id);
                        if (!this.stashes[sId]) {
                            this.stashes[sId] = {
                                collected: false,
                                name: s.name || '',
                                region: regKey,
                                required_gear: s.required_gear || 'None',
                                location: s.location || '',
                                psnSynced: false
                            };
                        }
                    });
                }
            });
        }

        if (Array.isArray(data.guns_and_fangs_for_hire)) {
            data.guns_and_fangs_for_hire.forEach(h => {
                const hId = String(h.id);
                if (!this.roster[hId]) {
                    this.roster[hId] = {
                        unlocked: false,
                        name: h.name || '',
                        type: h.type || 'Specialist',
                        unlock_mission: h.unlock_mission || '',
                        psnSynced: false
                    };
                }
            });
        }

        if (Array.isArray(data.walkthrough_missions)) {
            data.walkthrough_missions.forEach(m => {
                const mId = String(m.id);
                if (!this.missions[mId]) {
                    this.missions[mId] = {
                        completed: false,
                        mission_name: m.mission_name || '',
                        region: m.region || 'Hope County',
                        psnSynced: false
                    };
                }
            });
        }

        Object.entries(data).forEach(([catKey, catValue]) => {
            if (systemKeys.has(catKey) || ['collectibles', 'prepper_stashes', 'guns_and_fangs_for_hire', 'walkthrough_missions'].includes(catKey)) return;

            if (Array.isArray(catValue)) {
                if (!this.custom[catKey]) this.custom[catKey] = {};
                catValue.forEach((it, idx) => {
                    const itId = it.id !== undefined ? String(it.id) : `${catKey}_${idx}`;
                    if (!this.custom[catKey][itId]) {
                        this.custom[catKey][itId] = {
                            completed: false,
                            name: it.name || it.challenge || it.target || `Item ${idx + 1}`,
                            psnSynced: false
                        };
                    }
                });
            } else if (typeof catValue === 'object') {
                if (!this.custom[catKey]) this.custom[catKey] = {};
                Object.entries(catValue).forEach(([subKey, subItems]) => {
                    if (Array.isArray(subItems)) {
                        subItems.forEach((it, idx) => {
                            const itId = it.id !== undefined ? String(it.id) : `${subKey}_${idx}`;
                            if (!this.custom[catKey][itId]) {
                                this.custom[catKey][itId] = {
                                    completed: false,
                                    name: it.name || it.challenge || it.target || `Item ${idx + 1}`,
                                    group: subKey,
                                    psnSynced: false
                                };
                            }
                        });
                    }
                });
            }
        });

        this.ensureCounterTargets();
        this.recalculateMetrics();
    },

    recalculateMetrics: function() {
        let stashesCount = 0;
        let rosterCount = 0;
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
        }

        const earnedTrophies = Object.values(this.trophies).filter(t => t && t.earned).length;
        const totalTrophies = Object.keys(this.trophies).length || 51;
        this.trophies_earned = earnedTrophies;
        this.trophies_total = totalTrophies;
        this.trophies_percent = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

        this.ranks.stashes = stashesCount;
        this.ranks.roster = rosterCount;
        this.ranks.collectibles = totalCollectiblesCount;
        this.ranks.rp = calculatedRP;

        this.updateRankDisplay('stashes', stashesCount);
        this.updateRankDisplay('roster', rosterCount);
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
            gameId: this.activeGameId,
            platform: this.platform,
            friend_code: this.myFriendCode,
            trophies_earned: this.trophies_earned,
            trophies_total: this.trophies_total,
            trophies_percent: this.trophies_percent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ranks: this.ranks,
            collectibles: this.collectibles,
            stashes: this.stashes,
            roster: this.roster,
            missions: this.missions,
            custom: this.custom,
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
                if (!this.collectibles[cKey]) {
                    this.collectibles[cKey] = payload.collectibles[cKey];
                } else {
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
        if (payload.custom) this.custom = Object.assign({}, this.custom, payload.custom);
        if (payload.trophies) this.trophies = Object.assign({}, this.trophies, payload.trophies);
        if (payload.ranks) this.ranks = Object.assign({}, this.ranks, payload.ranks);

        this.applyStateToUI();
    }
};

// Section 3: Persistence Engine
window.appState.saveProgress = function() {
    const friendCode = this.myFriendCode;

    if (!friendCode || !this.currentUser) {
        const guestKey = `${this.activeGameId}_guest_progress_${this.platform}`;
        try {
            const payload = this.buildPayload();
            localStorage.setItem(guestKey, JSON.stringify(payload));
            this.updateStatus(`[Guest Mode] Progress retained on this device [${this.platform.toUpperCase()}].`);
        } catch (e) {
            console.warn("[Guest Storage]:", e);
        }
        return;
    }

    if (!this.isCloudLoaded) return;

    const payload = this.buildPayload();
    if (firestore) {
        firestore.collection("users").doc(friendCode).collection("platform").doc(this.platform).collection("progress").doc(this.activeGameId)
            .set(payload, { merge: true }).then(() => {
                this.updateStatus(`[Cloud Saved]`);
            }).catch(err => {
                console.error("[Firestore Save Error]:", err);
            });
    }
};

window.appState.loadProgress = async function() {
    const friendCode = this.myFriendCode;
    this.hydrateDefaultSchema();

    if (!friendCode || !this.currentUser) {
        const guestKey = `${this.activeGameId}_guest_progress_${this.platform}`;
        try {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
                this.applyPayload(JSON.parse(raw));
                this.isCloudLoaded = true;
                return;
            }
        } catch (e) {}

        this.applyStateToUI();
        this.isCloudLoaded = true;
        return;
    }

    if (firestore) {
        try {
            const doc = await firestore.collection("users").doc(friendCode).collection("platform").doc(this.platform).collection("progress").doc(this.activeGameId).get();
            if (doc.exists) {
                this.applyPayload(doc.data());
            } else {
                this.applyStateToUI();
                this.saveProgress();
            }
            this.isCloudLoaded = true;
        } catch (err) {
            this.isCloudLoaded = true;
        }
    }
};

window.appState.migrateGuestProgressIfPresent = async function() {};

// Section 4: UI Painter
window.appState.applyStateToUI = function() {
    this.ensureCounterTargets();
    this.recalculateMetrics();

    document.querySelectorAll('.fc5-item-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type') || 'mission';
        const group = card.getAttribute('data-group') || null;
        let isDone = false;

        if (type === 'stash') isDone = !!(this.stashes[id]?.collected);
        else if (type === 'roster') isDone = !!(this.roster[id]?.unlocked);
        else if (type === 'collectible') isDone = !!(group && this.collectibles[group]?.items?.[id]?.collected);
        else if (type.startsWith('custom_')) isDone = !!(this.custom[type.replace('custom_', '')]?.[id]?.completed);
        else isDone = !!(this.missions[id]?.completed);

        const btn = card.querySelector('.check-btn');
        if (isDone) {
            card.classList.add('completed');
            if (btn) { btn.classList.add('is-done'); btn.innerHTML = '✓'; }
        } else {
            card.classList.remove('completed');
            if (btn) { btn.classList.remove('is-done'); btn.innerHTML = ''; }
        }
    });

    updateSectionProgress();
};

window.appState.toggleItem = function(itemId, type, group) {
    const wasDone = !!(this.getItemRef(type, itemId, group)?.completed || this.getItemRef(type, itemId, group)?.collected || this.getItemRef(type, itemId, group)?.unlocked);

    if (type === 'stash') {
        if (!this.stashes[itemId]) this.stashes[itemId] = { collected: false };
        this.stashes[itemId].collected = !this.stashes[itemId].collected;
    } else if (type === 'roster') {
        if (!this.roster[itemId]) this.roster[itemId] = { unlocked: false };
        this.roster[itemId].unlocked = !this.roster[itemId].unlocked;
    } else if (type === 'collectible') {
        if (group && this.collectibles[group]?.items?.[itemId]) {
            this.collectibles[group].items[itemId].collected = !this.collectibles[group].items[itemId].collected;
        }
    } else if (type.startsWith('custom_')) {
        const cat = type.replace('custom_', '');
        if (!this.custom[cat]) this.custom[cat] = {};
        if (!this.custom[cat][itemId]) this.custom[cat][itemId] = { completed: false };
        this.custom[cat][itemId].completed = !this.custom[cat][itemId].completed;
    } else {
        if (!this.missions[itemId]) this.missions[itemId] = { completed: false };
        this.missions[itemId].completed = !this.missions[itemId].completed;
    }

    this.applyStateToUI();
    this.saveProgress();
};

window.appState.getItemRef = function(type, id, group) {
    if (type === 'stash') return this.stashes[id];
    if (type === 'roster') return this.roster[id];
    if (type === 'collectible') return group ? this.collectibles[group]?.items?.[id] : undefined;
    if (type.startsWith('custom_')) return this.custom?.[type.replace('custom_', '')]?.[id];
    return this.missions[id];
};

window.appState.ensureCounterTargets = function() {};
window.appState.updateStatus = function(msg) {};
window.adjRank = function(rankKey, delta) {
    appState.ranks[rankKey] = Math.max(0, Number(appState.ranks[rankKey] || 0) + delta);
    appState.updateRankDisplay(rankKey, appState.ranks[rankKey]);
    appState.saveProgress();
};

function resolveItemTarget(item) { return Number(item?.target || 0); }
function buildPsnLinks() { return []; }

function updateSectionProgress() {
    document.querySelectorAll('.category-section').forEach(sec => {
        const chip = sec.querySelector('.section-progress');
        if (!chip) return;
        const cards = Array.from(sec.querySelectorAll('.fc5-item-card'));
        const total = cards.length;
        const done = cards.filter(c => c.classList.contains('completed')).length;
        chip.textContent = `${done} / ${total}`;
    });
}

function progressChip(total) {
    return `<span class="section-progress" style="margin-left:10px; font-size:0.8rem; font-weight:800; padding:2px 10px; border-radius:12px; border:1px solid var(--user-theme-accent); background:rgba(255,85,0,0.18); color:#fff; white-space:nowrap; vertical-align:middle;">0 / ${total}</span>`;
}

function toSecureUrl(url) { return url || ''; }
function escapeHtml(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }

// Section 5: Full Companion Renderer
function renderFullCompanion(data) {
    const container = document.getElementById('section-container');
    if (!container || !data) return;

    let html = '';

    // Walkthrough Missions
    if (Array.isArray(data.walkthrough_missions)) {
        html += `
        <section class="category-section section-collapsed" id="cat-walkthroughs">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>📖 Story Campaign & Encounters ${progressChip(data.walkthrough_missions.length)}</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.walkthrough_missions.map(item => `
                        <div class="trophy-card fc5-item-card" data-id="${escapeHtml(item.id)}" data-type="mission">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-gold">${escapeHtml(item.region || 'Hope County')}</span>
                                    <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(item.mission_name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(item.id)}', 'mission')"></button>
                            </div>
                            <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    // Prepper Stashes
    if (data.prepper_stashes) {
        Object.entries(data.prepper_stashes).forEach(([regKey, list]) => {
            if (Array.isArray(list) && list.length > 0) {
                html += `
                <section class="category-section section-collapsed" id="cat-stash-${regKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>📦 Prepper Stashes — ${escapeHtml(regKey.replace(/_/g, ' ').toUpperCase())} ${progressChip(list.length)}</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${list.map(s => `
                                <div class="trophy-card fc5-item-card" data-id="${escapeHtml(s.id)}" data-type="stash">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-silver">${escapeHtml(s.required_gear || 'No Gear Required')}</span>
                                            <h3 style="color:#fff; font-size:1rem; margin-top:4px;">${escapeHtml(s.name)}</h3>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(s.id)}', 'stash')"></button>
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

    // Collectibles
    if (data.collectibles) {
        Object.entries(data.collectibles).forEach(([cKey, group]) => {
            if (group && Array.isArray(group.items)) {
                html += `
                <section class="category-section section-collapsed" id="cat-col-${cKey}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                        <h2>🗂️ Collectibles: ${escapeHtml(cKey.replace(/_/g, ' ').toUpperCase())} ${progressChip(group.items.length)}</h2>
                        <span>▾</span>
                    </div>
                    <div class="section-content">
                        <div class="trophy-grid">
                            ${group.items.map(item => `
                                <div class="trophy-card fc5-item-card" data-id="${escapeHtml(item.id)}" data-type="collectible" data-group="${cKey}">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                        <div>
                                            <span class="trophy-rank rank-bronze">${escapeHtml(item.region || 'Hope County')}</span>
                                            <h3 style="color:#fff; font-size:0.95rem; margin-top:4px;">${escapeHtml(item.name)}</h3>
                                        </div>
                                        <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(item.id)}', 'collectible', '${cKey}')"></button>
                                    </div>
                                    <p style="color:var(--text-muted); font-size:0.8rem; line-height:1.4;">${escapeHtml(item.guide || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>`;
            }
        });
    }

    // Guns & Fangs for Hire
    if (Array.isArray(data.guns_and_fangs_for_hire)) {
        html += `
        <section class="category-section section-collapsed" id="cat-roster">
            <div class="category-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
                <h2>🐾 Guns & Fangs for Hire ${progressChip(data.guns_and_fangs_for_hire.length)}</h2>
                <span>▾</span>
            </div>
            <div class="section-content">
                <div class="trophy-grid">
                    ${data.guns_and_fangs_for_hire.map(h => `
                        <div class="trophy-card fc5-item-card" data-id="${escapeHtml(h.id)}" data-type="roster">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <span class="trophy-rank rank-platinum">${escapeHtml(h.type)}</span>
                                    <h3 style="color:#fff; font-size:1.05rem; margin-top:4px;">${escapeHtml(h.name)}</h3>
                                </div>
                                <button type="button" class="check-btn" onclick="appState.toggleItem('${escapeHtml(h.id)}', 'roster')"></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }

    container.innerHTML = html;
}

// Section 6: Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const json = EMBEDDED_FARCRY5_DATA;
    appState.gameData = json;
    appState.hydrateDefaultSchema();
    renderFullCompanion(json);
    appState.applyStateToUI();
    console.log("[Engine Ready] Loaded Far Cry 5 from embedded script catalog.");
});
