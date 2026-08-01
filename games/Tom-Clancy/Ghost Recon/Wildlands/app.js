/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Progression Hub Engine
   Architecture: Pure Firebase Firestore Real-Time Engine (Multi-Platform Hierarchy)
   Path Structure: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE SDK CONFIGURATION ---
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

const GAME_ID = 'T.C.G.R.Wildlands';

/* === Global State Variables === */
let db;
let auth;
let currentSelectedUser = "Werewolf3788"; 
let currentPlatform = "playstation"; // Default platform set to PlayStation
let selectedCategory = "WEAPON";
let selectedSubCategory = "ALL_TROPHIES";
let unsubscribers = [];

/* === Weapon & Skill Registry Datasets === */
const WILDLANDS_WEAPON_CLASSES = {
    "Assault Rifles": [
        "P416 (Starting Weapon)", "AK-47 (Libertad)", "AK-12 (Tabacal)", "SR-3M (Agua Verde)", "556xi (Caimanes)",
        "AUG A3 (Barvechos)", "805 Bren A2 (Villa Verde)", "G2 (Inca Camina)", "L85A2 (Espiritu Santo)",
        "R5 RGP (Monte Puncu)", "ACR (Media Luna)", "M4A1 (Flor De Oro)", "TAR-21 (Montuyoc)", "Mk 17 (Flor De Oro)"
    ],
    "Sniper Rifles": [
        "M40A5 (Itacua)", "M1891 Mosina (La Cruz)", "SR-25 (Caimanes)", "Dragunov SVD (Villa Verde)", "G28 (San Mateo)",
        "SRSA1 (Mojocoyo)", "HTI (Montuyoc)", "L115A3 (Monte Puncu)", "MK14 (Koani)", "MSR (Montuyoc)", "SR-1 (Koani)"
    ],
    "Submachine Guns (SMGs)": [
        "MP5 (Starting Weapon)", "MP7 (Barvechos)", "9x19VSN (Inca Camina)", "PP-19 (Agua Verde)", "SR-635 (Ocoro)",
        "P90 (La Cruz)", "Vector .45 ACP (Media Luna)", "MPX (Mojocoyo)", "Scorpion EVO 3 (Koani)", "9mm C1 (Remanzo)",
        "PSG (San Mateo)"
    ],
    "Light Machine Guns (LMGs)": [
        "MG121 (Itacua)", "MK-48 (Espiritu Santo)", "6P41 (Media Luna)", "Type 95 (Remanzo)", "Mk249 (Malaca)"
    ],
    "Shotguns": [
        "Super Shorty (Itacua)", "SASG-12 (P.N. De Agua Verde)", "SPAS-12 (La Cruz)"
    ],
    "Handguns / Sidearms": [
        "P45T (Starting Weapon)", "M9 (Villa Verde)", "5.7 USG (Ocoro)", "M1911 (Ocoro)", "P12 (Tabacal)",
        "P227 (Malaca)", "Skorpion (Remanzo)", "D-50 (Libertad)"
    ],
    "Exotic / Special Program Rewards": [
        "Custom Cartel Buchone Variant Drop", "Prestige / Tier Reward Exotic Tier"
    ]
};

const BASELINE_SKILLS_BLUEPRINT = {
    "WEAPON": [
        { id: "stable_aim", name: "Stable Aim", max: 4, hasMedal: true, desc: "Adds extra stability when using a sniper scope." }, 
        { id: "hip_fire", name: "Hip Fire Spread", max: 4, hasMedal: true, desc: "Reduces bullet spray when firing weapons from the hip." }, 
        { id: "grenade_launcher", name: "Grenade Launcher", max: 4, hasMedal: false, desc: "Optional underbarrel explosive attachment." }, 
        { id: "ammo_capacity", name: "Ammo Capacity", max: 4, hasMedal: true, desc: "Increases maximum ammo capacity for all weapons." }, 
        { id: "vhc_destruction", name: "VHC Destruction", max: 4, hasMedal: true, desc: "Increases damage done to vehicles." }, 
        { id: "adv_suppressor", name: "ADV Suppressor", max: 1, hasMedal: false, desc: "Removes damage penalty from suppressors." }, 
        { id: "time_to_aim", name: "Time To Aim", max: 4, hasMedal: true, desc: "Reduces scope snap speed latency window." }, 
        { id: "ammo_retention", name: "Ammo Retention", max: 1, hasMedal: false, desc: "Respawning fully replenishes strategic munitions store." }, 
        { id: "epic_ranged_elite", name: "Ranged Elite (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Increases accuracy over extreme deployment vectors." }
    ],
    "DRONE": [
        { id: "battery_increase", name: "Battery Increase", max: 4, hasMedal: false, desc: "Extends flight uptime. Max rank awards infinity power." }, 
        { id: "night_vision", name: "Night Vision", max: 1, hasMedal: false, desc: "Enables illumination sensors in zero-light settings." }, 
        { id: "range", name: "Range", max: 4, hasMedal: true, desc: "Increases horizontal operation link metrics." }, 
        { id: "speed", name: "Speed", max: 2, hasMedal: true, desc: "Increases velocity inside operational parameters." }, 
        { id: "mark_area", name: "Mark Area", max: 4, hasMedal: true, desc: "Enhances localized automated tracking parameters." }, 
        { id: "stealth", name: "Stealth", max: 1, hasMedal: false, desc: "Reduces auditory acoustic detection limits." }, 
        { id: "cooldown", name: "Cooldown", max: 4, hasMedal: true, desc: "Reduces re-launch latency wait window parameters." }, 
        { id: "noisemaker", name: "NoiseMaker", max: 4, hasMedal: false, desc: "Audio emitter distraction payload module." }, 
        { id: "zoom", name: "Zoom", max: 1, hasMedal: false, desc: "Optical focal scaling amplification suite." }, 
        { id: "explosive", name: "Explosive", max: 4, hasMedal: false, desc: "Kinetic payload structure demolition system." }, 
        { id: "emp", name: "EMP", max: 4, hasMedal: false, desc: "Disables regional power grids, alarms and engines instantly." }, 
        { id: "armor", name: "Armor", max: 4, hasMedal: true, desc: "Reinforces plating frame threshold parameters." }, 
        { id: "thermal_vision", name: "Thermal Vision", max: 1, hasMedal: false, desc: "Infrared heat signature visual capture system." }, 
        { id: "epic_drone_medic", name: "Drone Medic (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Allows distance revival protocols on structural casualties." }
    ],
    "ITEM": [
        { id: "parachute", name: "Parachute Deployment", max: 1, hasMedal: false, desc: "Allows static airborne deployment from high vectors safely." }, 
        { id: "binoc_zoom", name: "Binocular Zoom", max: 1, hasMedal: true, desc: "Amplifies spotting magnification performance levels." }, 
        { id: "mine_capacity", name: "Mine Inventory", max: 4, hasMedal: true, desc: "Enables deployment of proximity trigger defenses." }, 
        { id: "binoc_recon", name: "Binocular Recon", max: 4, hasMedal: true, desc: "Accelerates identification speed algorithms." }, 
        { id: "diversion_lure", name: "Diversion Lure", max: 4, hasMedal: true, desc: "Attracts target threats to specific zones." }, 
        { id: "frag_grenade", name: "Frag Grenade Boost", max: 4, hasMedal: true, desc: "Increases portable offensive explosive counts." }, 
        { id: "c4", name: "C4 Charges", max: 4, hasMedal: true, desc: "Enables remote detonation high-damage devices." }, 
        { id: "thermal_vision_item", name: "Thermal Vision", max: 1, hasMedal: false, desc: "Allows thermal analysis tracking patterns natively." }, 
        { id: "flashbang", name: "Flashbang", max: 4, hasMedal: true, desc: "Stuns targets inside non-lethal tactical parameters." }, 
        { id: "flare_gun", name: "Flare Gun", max: 4, hasMedal: true, desc: "Attracts nearby structural forces to designated visual points." }, 
        { id: "epic_explosion_radius", name: "Explosion Radius (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Expands damage zone radius on all thrown items." }
    ],
    "PHYSICAL": [
        { id: "stamina", name: "Stamina Duration", max: 4, hasMedal: false, desc: "Extends target continuous maximum sprint capacity." }, 
        { id: "no_pain", name: "No Pain Threshold", max: 4, hasMedal: true, desc: "Provides heavy defensive damage absorption buffers post-revive." }, 
        { id: "car_shield", name: "Car Shield", max: 4, hasMedal: true, desc: "Ground transit asset incoming damage modifier reduction." }, 
        { id: "quiet_running", name: "Quiet Running", max: 4, hasMedal: true, desc: "Reduces audible noise threshold during movement loops." }, 
        { id: "bullet_resistance", name: "Bullet Resistance", max: 4, hasMedal: true, desc: "Reduces basic threat impact damage ratings." }, 
        { id: "detection", name: "Detection Visibility", max: 4, hasMedal: true, desc: "Reduces threat awareness curves inside low stances." }, 
        { id: "explosion_resistance", name: "Explosion Resistance", max: 4, hasMedal: true, desc: "Mitigates environmental splash tracking blast damages." }, 
        { id: "aircraft_shield", name: "Aircraft Shield", max: 4, hasMedal: true, desc: "Mitigates damage profiles encountered by aviation hardware assets." }, 
        { id: "epic_faster_regen", name: "Faster Regen (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Decreases internal target standard medical recovery latency loops." }
    ],
    "SQUAD": [
        { id: "revive_speed", name: "Revive Speed", max: 4, hasMedal: true, desc: "Decreases field interaction rescue time windows." }, 
        { id: "extra_sync", name: "Extra Sync Shot Slot", max: 2, hasMedal: false, desc: "Expands targeting capability across fire teams simultaneously." }, 
        { id: "trained_rebels", name: "Trained Rebels", max: 4, hasMedal: true, desc: "Boosts tactical baseline combat survival of localized proxies." }, 
        { id: "squad_resilience", name: "Squad Resilience", max: 4, hasMedal: true, desc: "Modifies AI team internal ballistic shield scaling variables." }, 
        { id: "bleed_out_time", name: "Bleed Out Time", max: 4, hasMedal: true, desc: "Extends strategic countdown window prior to structural death." }, 
        { id: "born_leader", name: "Born Leader Aura", max: 4, hasMedal: true, desc: "Drastically scales fire efficiency coefficients of backup crew." }, 
        { id: "epic_last_chance", name: "Last Chance (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Expands total allowed backup revival counters per engagement." }
    ],
    "REBEL": [
        { id: "vehicle_drop", name: "Vehicle Drop-off", max: 9, hasMedal: false, desc: "Deploys tactical transport assets directly into your operational sector." },
        { id: "guns_for_hire", name: "Guns For Hire", max: 9, hasMedal: false, desc: "Summons explicit squad assets to provide defensive cover support fire." },
        { id: "mortar", name: "Mortar Strike", max: 9, hasMedal: false, desc: "Applies heavy remote explosive bombardment over target zone area bounds." },
        { id: "diversion_rebel", name: "Diversion", max: 9, hasMedal: false, desc: "Forces enemy tracking focus elements away from actual entry points." },
        { id: "spotting", name: "Rebel Spotting", max: 9, hasMedal: false, desc: "Scans coordinates area maps to tag target threats within parameters." }
    ],
    "TROPHY": [
        { id: "tr_amaru", name: "A Good Start", desc: "Completed the first mission 'Amaru's rescue'.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "A Good Start" },
        { id: "tr_symp", name: "Rebel Sympathizer", desc: "Unlocked a Rebel skill.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Rebel Sympathizer" },
        { id: "tr_boss", name: "Beat the Boss", desc: "Defeated your first boss.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Beat the Boss" },
        { id: "tr_night", name: "Death in the Dark", desc: "Made a close-combat kill at night.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Death in the Dark" },
        { id: "tr_legend", name: "Legend Hunter", desc: "Discovered one legend.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Legend Hunter" },
        { id: "tr_drone_mark", name: "Eye in the Sky", desc: "Marked 100 enemies with a drone.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Eye in the Sky" },
        { id: "tr_pistol_snipe", name: "With a Pistol!", desc: "Took out a sniper with a pistol.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "With a Pistol!" },
        { id: "tr_road", name: "Road Warrior", desc: "Drove a vehicle for 100 km.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Road Warrior" },
        { id: "tr_rebel_max", name: "Real Rebel", desc: "Unlocked all the Rebel skills.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Real Rebel" },
        { id: "tr_spice", name: "Spice of Life", desc: "Played each type of side mission.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Spice of Life" },
        { id: "tr_team", name: "Teamwork!", desc: "Completed 3 missions with another player.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Teamwork!" },
        { id: "tr_highway", name: "Highway Bandit", desc: "Tagged 10 convoys.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Highway Bandit" },
        { id: "tr_long_shot", name: "Long Shot", desc: "Hit a target more than 400m away.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Long Shot" },
        { id: "tr_skydive", name: "Fearless", desc: "Skydived 10 times.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Fearless" },
        { id: "tr_interrogate", name: "Deadly Curious", desc: "Interrogated 20 sources.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Deadly Curious" },
        { id: "tr_champion", name: "The Champion", desc: "Maxed out your XP and levels.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "The Champion" },
        { id: "tr_drone_kill", name: "Death from Above", desc: "Killed an enemy with a drone.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Death from Above" },
        { id: "tr_locks", name: "Broken Locks", desc: "Completed the Security operation.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Broken Locks" },
        { id: "tr_bad_rep", name: "Bad Reputation", desc: "Completed the Influence operation.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Bad Reputation" },
        { id: "tr_shutdown", name: "Shut Down", desc: "Completed the Production operation.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Shut Down" },
        { id: "tr_end", name: "The End", desc: "Finished the story.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "The End" },
        { id: "tr_blues", name: "Smuggler's Blues", desc: "Completed the Smuggling operation.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Smuggler's Blues" },
        { id: "tr_c4_generator", name: "Black-out Boomer", desc: "Destroyed a generator with a C4 blast.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Black-out Boomer" },
        { id: "tr_binoc_mark", name: "Eagle-Eyed", desc: "Marked 100 enemies with the binoculars.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Eagle-Eyed" },
        { id: "tr_finish_job", name: "Finished the Job", desc: "Killed an enemy hurt by another player.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Finished the Job" },
        { id: "tr_collector_half", name: "Serious Collector", desc: "Found 50% of the documents in the game.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Serious Collector" },
        { id: "tr_mission_master", name: "Mission Master", desc: "Completed all Story missions.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Mission Master" },
        { id: "tr_ultimate_skill", name: "Ultimate Skill", desc: "Bought all updates of a Skill branch.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Ultimate Skill" },
        { id: "tr_lmg_fanatic", name: "Light Machine-Gun Fanatic", desc: "Collected all light machine-gun models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Light Machine-Gun Fanatic" },
        { id: "tr_shotgun_fanatic", name: "Shotguns Fanatic", desc: "Collected all shotguns models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Shotguns Fanatic" },
        { id: "tr_handgun_fanatic", name: "Handgun Fanatic", desc: "Collected all handguns models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Handgun Fanatic" },
        { id: "tr_heavy_medals", name: "Heavy Medals", desc: "Collected all the bonus medals.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Heavy Medals" },
        { id: "tr_sniper_fanatic", name: "Sniper Rifle Fanatic", desc: "Collected all sniper rifle models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Sniper Rifle Fanatic" },
        { id: "tr_smg_fanatic", name: "Submachine-Gun Fanatic", desc: "Collected all submachine-gun models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Submachine-Gun Fanatic" },
        { id: "tr_ar_fanatic", name: "Assault Rifle Fanatic", desc: "Collected all assault rifle models.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Assault Rifle Fanatic" },
        { id: "tr_no_better_rebel", name: "No Better Rebel", desc: "Maxed out each Rebel skill.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "No Better Rebel" },
        { id: "tr_top_drone", name: "Top Drone", desc: "Bought all drone-related upgrades.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Top Drone" },
        { id: "tr_pull", name: "Pull!", desc: "Shot an enemy chopper out of the air with a mortar.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Pull!" },
        { id: "tr_only_best", name: "Only the Best", desc: "Bought all upgrades.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Only the Best" },
        { id: "tr_whole_story", name: "The Whole Story", desc: "Found all documents.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "The Whole Story" },
        { id: "tr_legend_hunter", name: "Legendary Hunter", desc: "Discovered all legends.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Legendary Hunter" },
        { id: "tr_cluster", name: "Cluster Bomber", desc: "Killed 7 enemies with a single C4 blast.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "Cluster Bomber" },
        { id: "tr_mousetrap", name: "A Better Mousetrap", desc: "Killed 7 enemies with a single mine.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "A Better Mousetrap" },

        /* === RECON REWARD COLLECTIBLES === */
        { id: "wp_ak47", name: "AK-47 Case", desc: "Assault Rifle Intel Province: Libertad", max: 1, sub: "WEAPONS" },
        { id: "wp_aug", name: "AUG A3 Case", desc: "Assault Rifle Intel Province: Barvechos", max: 1, sub: "WEAPONS" },
        { id: "wp_556xi", name: "556xi Case", desc: "Assault Rifle Intel Province: Caimanes", max: 1, sub: "WEAPONS" },
        { id: "wp_l85a2", name: "L85A2 Case", desc: "Assault Rifle Intel Province: Espiritu Santo", max: 1, sub: "WEAPONS" },
        { id: "wp_m4a1", name: "M4A1 Case", desc: "Assault Rifle Intel Province: Flor De Oro", max: 1, sub: "WEAPONS" },
        { id: "wp_mk17", name: "MK17 Case", desc: "Assault Rifle Intel Province: Flor De Oro", max: 1, sub: "WEAPONS" },
        { id: "wp_g2", name: "G2 Case", desc: "Assault Rifle Intel Province: Inca Camina", max: 1, sub: "WEAPONS" },
        { id: "wp_acr", name: "ACR Case", desc: "Assault Rifle Intel Province: Media Luna", max: 1, sub: "WEAPONS" },
        { id: "wp_tar21", name: "TAR-21 Case", desc: "Assault Rifle Intel Province: Montuyoc", max: 1, sub: "WEAPONS" },
        { id: "wp_sr3m", name: "SR3M Case", desc: "Assault Rifle Intel Province: P.N. De Agua Verde", max: 1, sub: "WEAPONS" },
        { id: "wp_ak12", name: "AK-12 Case", desc: "Assault Rifle Intel Province: Tabacal", max: 1, sub: "WEAPONS" },
        { id: "wp_bren", name: "805 Bren A2 Case", desc: "Assault Rifle Intel Province: Villa Verde", max: 1, sub: "WEAPONS" },
        { id: "wp_mp7", name: "MP7 Case", desc: "SMG Intel Province: Barvechos", max: 1, sub: "WEAPONS" },
        { id: "wp_9x19vsn", name: "9x19VSN Case", desc: "SMG Intel Province: Inca Camina", max: 1, sub: "WEAPONS" },
        { id: "wp_scorpion", name: "Scorpion EVO 3 Case", desc: "SMG Intel Province: Koani", max: 1, sub: "WEAPONS" },
        { id: "wp_p90", name: "P90 Case", desc: "SMG Intel Province: La Cruz", max: 1, sub: "WEAPONS" },
        { id: "wp_vector", name: "Vector .45 ACP Case", desc: "SMG Intel Province: Media Luna", max: 1, sub: "WEAPONS" },
        { id: "wp_mpx", name: "MPX Case", desc: "SMG Intel Province: Mojocoyo", max: 1, sub: "WEAPONS" },
        { id: "wp_sr635", name: "SR-635 Case", desc: "SMG Intel Province: Ocoro", max: 1, sub: "WEAPONS" },
        { id: "wp_9mmc1", name: "9mm C1 Case", desc: "SMG Intel Province: Remanzo", max: 1, sub: "WEAPONS" },
        { id: "wp_psg", name: "PSG Case", desc: "SMG Intel Province: San Mateo", max: 1, sub: "WEAPONS" },

        /* === MAP BONUS MEDALS === */
        { id: "md_air_sh", name: "Aircraft Shield Medal", desc: "Bonus Medal Map Target: Barvechos", max: 1, sub: "MEDALS" },
        { id: "md_ammo_cap", name: "Ammo Capacity Medal", desc: "Bonus Medal Map Target: Barvechos", max: 1, sub: "MEDALS" },
        { id: "md_bin_rec", name: "Binocular Recon Medal", desc: "Bonus Medal Map Target: Caimanes", max: 1, sub: "MEDALS" },
        { id: "md_quiet", name: "Quiet Running Medal", desc: "Bonus Medal Map Target: Espiritu Santo", max: 1, sub: "MEDALS" },
        { id: "md_bin_zm", name: "Binocular Zoom Medal", desc: "Bonus Medal Map Target: Flor De Oro", max: 1, sub: "MEDALS" },
        { id: "md_bleed", name: "Bleed Out Time Medal", desc: "Bonus Medal Map Target: Inca Camina", max: 1, sub: "MEDALS" },
        { id: "md_bullet_it", name: "Bullet Resistance Medal", desc: "Bonus Medal Map Target: Itacua", max: 1, sub: "MEDALS" },
        { id: "md_leader", name: "Born Leader Medal", desc: "Bonus Medal Map Target: Itacua", max: 1, sub: "MEDALS" },
        { id: "md_c4", name: "C4 Charges Medal", desc: "Bonus Medal Map Target: Koani", max: 1, sub: "MEDALS" },
        { id: "md_car_sh", name: "Car Shield Medal", desc: "Bonus Medal Map Target: Koani", max: 1, sub: "MEDALS" },

        /* === ACCESSORY CASE PARTS === */
        { id: "sc_ta31h", name: "TA31H Scope Case", desc: "Part Vector: Espiritu Santo (AR, Sniper)", max: 1, sub: "SCOPES" },
        { id: "sc_pkas", name: "PK-AS Scope Case", desc: "Part Vector: Itacua (SMG, AR)", max: 1, sub: "SCOPES" },
        { id: "sc_panoramic", name: "Panoramic Sight Case", desc: "Part Vector: Itacua (SMG, Shotgun, AR)", max: 1, sub: "SCOPES" },
        { id: "sc_t5xi", name: "T5Xi Tactical Case", desc: "Part Vector: Koani (Sniper Rifle)", max: 1, sub: "SCOPES" },
        { id: "sc_micro_g33", name: "Micro T-1 & G33 Case", desc: "Part Vector: Koani (SMG, AR)", max: 1, sub: "SCOPES" }
    ]
};

function generateCleanBlueprintCopy() {
    const freshCopy = {};
    Object.keys(BASELINE_SKILLS_BLUEPRINT).forEach(cat => {
        freshCopy[cat] = freshCopy[cat] || {};
        BASELINE_SKILLS_BLUEPRINT[cat].forEach(skill => {
            freshCopy[cat][skill.id] = { id: skill.id, current: 0, medalEarned: false };
        });
    });
    return freshCopy;
}

const DEFAULT_SQUAD_PROFILES = {
    "Werewolf3788": {
        name: "Werewolf3788", psnUsername: "werewolf3788", tierMode: "on", tier: 41, playstyle: "Overwatch",
        tactical: 100, stealth: 52, avgKillDist: 73, longestShot: 389, precision: 9, lifetime: "0h 14min", favWeapon: "556xi (Caimanes)", favWeapon2: "M40A5 (Itacua)", teammatesRevived: 132, c4MineKills: 139, droneUsed: "12h 49min", travelAir: "11h 1min", travelGround: "6h 52min", travelPara: "20 Jumps", travelMap: "90%",
        skills: generateCleanBlueprintCopy()
    },
    "Raymystyro": {
        name: "Raymystyro", psnUsername: "Raymystyro", tierMode: "on", tier: 42, playstyle: "Overwatch",
        tactical: 17, stealth: 53, avgKillDist: 54, longestShot: 481, precision: 16, lifetime: "0h 24min", favWeapon: "ACR (Media Luna)", favWeapon2: "P416 (Starting Weapon)", teammatesRevived: 43, c4MineKills: 42, droneUsed: "0h 41min", travelAir: "4h 30min", travelGround: "3h 24min", travelPara: "23 Jumps", travelMap: "86%",
        skills: generateCleanBlueprintCopy()
    },
    "terrdog420": {
        name: "terrdog420", psnUsername: "terrdog420", tierMode: "off", tier: 1, playstyle: "Tactical Operative",
        tactical: 50, stealth: 50, avgKillDist: 100, longestShot: 200, precision: 30, lifetime: "1h 0min", favWeapon: "P416 (Starting Weapon)", favWeapon2: "MP5 (Starting Weapon)", teammatesRevived: 0, c4MineKills: 0, droneUsed: "0h 10min", travelAir: "0h 0min", travelGround: "0h 15min", travelPara: "0 Jumps", travelMap: "5%",
        skills: generateCleanBlueprintCopy()
    },
    "DesdemonaTiger": {
        name: "DesdemonaTiger", psnUsername: "DesdemonaTiger", tierMode: "on", tier: 42, playstyle: "Overwatch",
        tactical: 17, stealth: 53, avgKillDist: 54, longestShot: 481, precision: 16, lifetime: "0h 24min", favWeapon: "ACR (Media Luna)", favWeapon2: "P416 (Starting Weapon)", teammatesRevived: 43, c4MineKills: 42, droneUsed: "0h 41min", travelAir: "4h 30min", travelGround: "3h 24min", travelPara: "23 Jumps", travelMap: "86%",
        skills: generateCleanBlueprintCopy()
    }
};

/* === Cookie Preference Engine === */
function setGamertagCookie(gamertag) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `wildlands_active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getGamertagCookie() {
    const name = "wildlands_active_gamertag=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return "";
}

/* === Application Lifecycle & Initialization === */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const platformParam = urlParams.get('platform');

    // 1. Evaluate platform selection: URL param > Dropdown default ('playstation')
    const platformSelectElement = document.getElementById("platformSelect");
    if (platformParam) {
        currentPlatform = platformParam.toLowerCase();
        if (platformSelectElement) platformSelectElement.value = currentPlatform;
    } else if (platformSelectElement) {
        currentPlatform = platformSelectElement.value.toLowerCase() || "playstation";
    }

    // 2. Evaluate selected operative handle
    if (userParam && DEFAULT_SQUAD_PROFILES[userParam]) {
        currentSelectedUser = userParam;
        setGamertagCookie(currentSelectedUser);
    } else {
        const saved = getGamertagCookie();
        if (saved && DEFAULT_SQUAD_PROFILES[saved]) {
            currentSelectedUser = saved;
        } else {
            currentSelectedUser = "Werewolf3788";
        }
    }

    populateWeaponSelectionDropdowns();
    setupInterfaceControls();
    evaluateDynamicTimeTheme();
    setupInterTabSynchronization();
    
    updateOperatorDropdownList(DEFAULT_SQUAD_PROFILES);
    await initializeFirebaseApp();
});

function populateWeaponSelectionDropdowns() {
    const primarySelect = document.getElementById("profileFavWeapon");
    const secondarySelect = document.getElementById("profileFavWeapon2");
    if (!primarySelect || !secondarySelect) return;
    
    primarySelect.innerHTML = ""; secondarySelect.innerHTML = "";

    Object.keys(WILDLANDS_WEAPON_CLASSES).forEach(className => {
        const group1 = document.createElement("optgroup"); group1.label = className;
        const group2 = document.createElement("optgroup"); group2.label = className;

        WILDLANDS_WEAPON_CLASSES[className].forEach(weapon => {
            const opt1 = document.createElement("option"); opt1.value = weapon; opt1.textContent = weapon; group1.appendChild(opt1);
            const opt2 = document.createElement("option"); opt2.value = weapon; opt2.textContent = weapon; group2.appendChild(opt2);
        });

        primarySelect.appendChild(group1);
        secondarySelect.appendChild(group2);
    });
}

async function initializeFirebaseApp() {
    try {
        const app = initializeApp(firebaseConfig, 'Wildlands-Engine-App');
        auth = getAuth(app);
        db = getFirestore(app);

        // Transparent access for all squad mates without needing log in screens
        await signInAnonymously(auth);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                attachLiveFirestoreListeners();
            }
        });
    } catch (err) {
        console.error("Firebase Initialization Failure:", err);
    }
}

function attachLiveFirestoreListeners() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    // Ensure path structure exists immediately
    syncToFirestore();

    Object.keys(DEFAULT_SQUAD_PROFILES).forEach(profileKey => {
        // Path: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
        const userProgressRef = doc(db, 'users', profileKey, 'platform', currentPlatform, 'progress', GAME_ID);

        const unsub = onSnapshot(userProgressRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (DEFAULT_SQUAD_PROFILES[profileKey]) {
                    Object.assign(DEFAULT_SQUAD_PROFILES[profileKey], data);
                }
                if (profileKey === currentSelectedUser) {
                    renderTargetProfileData(data);
                }
            } else if (profileKey === currentSelectedUser) {
                syncToFirestore();
            }
        }, (err) => {
            console.warn(`Live Firestore listener warning for ${profileKey} on [${currentPlatform}]:`, err.message);
        });

        unsubscribers.push(unsub);
    });
}

function updateOperatorDropdownList(profiles) {
    const selectorElement = document.getElementById("userSelect");
    if (!selectorElement) return;
    const activeSelectionBeforeUpdate = selectorElement.value || currentSelectedUser;
    
    selectorElement.innerHTML = "";
    Object.keys(profiles).forEach(key => {
        const option = document.createElement("option"); 
        option.value = key; 
        option.textContent = profiles[key].name || key; 
        selectorElement.appendChild(option);
    });
    
    if (profiles[activeSelectionBeforeUpdate]) {
        selectorElement.value = activeSelectionBeforeUpdate;
        currentSelectedUser = activeSelectionBeforeUpdate;
        setGamertagCookie(currentSelectedUser);
        renderTargetProfileData(profiles[activeSelectionBeforeUpdate]);
    } else {
        const firstKey = Object.keys(profiles)[0];
        selectorElement.value = firstKey;
        currentSelectedUser = firstKey;
        setGamertagCookie(currentSelectedUser);
        renderTargetProfileData(profiles[firstKey]);
    }
}

function calculateDifficultyLabel(tierMode, level) {
    const lvl = parseInt(level) || 1;
    if (tierMode === "on") {
        if (lvl <= 10) return "Extreme Nightmare";
        if (lvl <= 25) return "Advanced Tactical";
        if (lvl <= 40) return "Hard Mode";
        return "Tier One Baseline (Easy)";
    } else {
        if (lvl <= 15) return "Recruit (Easy)";
        if (lvl <= 30) return "Veteran (Medium)";
        if (lvl <= 45) return "Elite Ghost (Hard)";
        return "Extreme Sandbox Cap";
    }
}

function renderTargetProfileData(operator) {
    if (!operator) return;

    if (document.getElementById("profileCustomName")) document.getElementById("profileCustomName").value = operator.name || "";
    if (document.getElementById("profilePsnUser")) document.getElementById("profilePsnUser").value = operator.psnUsername || "";
    if (document.getElementById("profileTierMode")) document.getElementById("profileTierMode").value = operator.tierMode || "off";
    if (document.getElementById("profileTierLevel")) document.getElementById("profileTierLevel").value = operator.tier || 1;
    
    const levelLabel = document.getElementById("tierLevelContextLabel");
    if (levelLabel) levelLabel.textContent = operator.tierMode === "on" ? "Tier Level Countdown (50 -> 1)" : "Base Character Level Progress (1 -> 50)";

    const diffOutput = document.getElementById("difficultyScalingOutput");
    if (diffOutput) diffOutput.textContent = calculateDifficultyLabel(operator.tierMode, operator.tier);
    
    if (document.getElementById("profilePlaystyle")) document.getElementById("profilePlaystyle").value = operator.playstyle || "";
    if (document.getElementById("profileAvgKillDist")) document.getElementById("profileAvgKillDist").value = operator.avgKillDist || 0;
    if (document.getElementById("profileTactical")) document.getElementById("profileTactical").value = operator.tactical || 0;
    if (document.getElementById("profileStealth")) document.getElementById("profileStealth").value = operator.stealth || 0;
    if (document.getElementById("profileLifetime")) document.getElementById("profileLifetime").value = operator.lifetime || "";
    if (document.getElementById("profileLongestShot")) document.getElementById("profileLongestShot").value = operator.longestShot || 0;
    if (document.getElementById("profilePrecision")) document.getElementById("profilePrecision").value = operator.precision || 0;
    if (document.getElementById("profileFavWeapon")) document.getElementById("profileFavWeapon").value = operator.favWeapon || "P416 (Starting Weapon)";
    if (document.getElementById("profileFavWeapon2")) document.getElementById("profileFavWeapon2").value = operator.favWeapon2 || "MP5 (Starting Weapon)";
    if (document.getElementById("profileRevives")) document.getElementById("profileRevives").value = operator.teammatesRevived || 0;
    if (document.getElementById("profileC4Kills")) document.getElementById("profileC4Kills").value = operator.c4MineKills || 0;
    if (document.getElementById("profileDroneUsed")) document.getElementById("profileDroneUsed").value = operator.droneUsed || "";
    if (document.getElementById("profileTravelAir")) document.getElementById("profileTravelAir").value = operator.travelAir || "";
    if (document.getElementById("profileTravelGround")) document.getElementById("profileTravelGround").value = operator.travelGround || "";
    if (document.getElementById("profileTravelPara")) document.getElementById("profileTravelPara").value = operator.travelPara || "";
    if (document.getElementById("profileTravelMap")) document.getElementById("profileTravelMap").value = operator.travelMap || "";

    renderSkillsTree(operator.skills || {});
}

function renderSkillsTree(incomingDatabaseSkills) {
    const container = document.getElementById("skillsTreeGrid");
    if (!container) return;
    container.innerHTML = "";
    const isTrophyTabActive = selectedCategory === "TROPHY";
    
    if (isTrophyTabActive) {
        const subNavWrapper = document.createElement("div");
        subNavWrapper.style.cssText = "grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; width:100%;";
        const filters = [
            { id: "ALL_TROPHIES", label: "🏆 Trophies Catalog" },
            { id: "WEAPONS", label: "🔫 Weapons Case Intel" },
            { id: "MEDALS", label: "🎖️ Bonus Medals Grid" },
            { id: "SCOPES", label: "🔭 Accessory Cases" }
        ];
        filters.forEach(f => {
            const btn = document.createElement("button"); btn.className = "tab-link";
            btn.style.cssText = "padding: 8px 12px; font-size: 11px; min-height: 34px; min-width: auto; flex: none;";
            if (selectedSubCategory === f.id) btn.style.backgroundColor = "var(--primary-orange)";
            btn.textContent = f.label;
            
            btn.addEventListener("click", (e) => { 
                e.stopPropagation(); 
                selectedSubCategory = f.id; 
                renderSkillsTree(incomingDatabaseSkills); 
            });
            
            subNavWrapper.appendChild(btn);
        });
        container.appendChild(subNavWrapper);
    }

    const masterSkeletonCategoryList = BASELINE_SKILLS_BLUEPRINT[selectedCategory] || [];
    let databaseCategoryList = incomingDatabaseSkills[selectedCategory] || {};

    masterSkeletonCategoryList.forEach((blueprintSkill) => {
        if (isTrophyTabActive && blueprintSkill.sub !== selectedSubCategory) return;

        let currentLevel = 0; let medalEarned = false;
        const foundSkill = databaseCategoryList[blueprintSkill.id];
        if (foundSkill) {
            currentLevel = parseInt(foundSkill.current) || 0; 
            medalEarned = foundSkill.medalEarned === true;
        }

        const isMaxed = currentLevel >= blueprintSkill.max; 
        const isUnlocked = currentLevel > 0;

        let cardStatusClass = "skill-card";
        if (blueprintSkill.isEpic) cardStatusClass += " epic-node";
        if (isMaxed) cardStatusClass += " maxed"; 
        else if (isUnlocked) cardStatusClass += " unlocked";

        const card = document.createElement("div"); card.className = cardStatusClass;
        let interactiveStatusMeta = isTrophyTabActive ? (isUnlocked ? "🎯 COMPLETED / UNLOCKED" : "🔒 LOCKED TACTICAL TARGET") : `Rank Level: ${currentLevel} / ${blueprintSkill.max}`;

        card.innerHTML = `
            <div class="card-top-content">
                <h4 class="outline-text" style="margin: 0 0 6px 0; font-size: 14px;">${blueprintSkill.name}</h4>
                <p style="font-size: 11px; color: #8a99ad; margin: 0 0 8px 0; line-height: 1.3;">${blueprintSkill.desc || ""}</p>
                <span style="font-size: 12px; font-weight: bold; color: var(--primary-orange);">${interactiveStatusMeta}</span>
            </div>
        `;

        if (blueprintSkill.hasMedal && !isTrophyTabActive) {
            const medalZone = document.createElement("div"); medalZone.className = "medal-indicator-zone";
            medalZone.innerHTML = `<span style="font-size: 11px; color: #888;">Bonus Medal Intel:</span><button class="medal-dot-btn ${medalEarned ? 'earned' : ''}">★</button>`;
            
            medalZone.querySelector(".medal-dot-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                executeSkillLevelUpdate(selectedCategory, blueprintSkill.id, currentLevel, !medalEarned, true);
            });
            card.appendChild(medalZone);
        }

        card.addEventListener("click", () => {
            let nextLevel = currentLevel + 1;
            if (nextLevel > blueprintSkill.max) nextLevel = 0;
            executeSkillLevelUpdate(selectedCategory, blueprintSkill.id, nextLevel, medalEarned, false);
        });
        container.appendChild(card);
    });
}

function executeSkillLevelUpdate(category, skillId, nextLevel, medalState, isOnlyMedalToggle = false) {
    const targetProfile = DEFAULT_SQUAD_PROFILES[currentSelectedUser];
    if (!targetProfile) return;

    targetProfile.skills[category] = targetProfile.skills[category] || {};
    targetProfile.skills[category][skillId] = targetProfile.skills[category][skillId] || { id: skillId, current: 0, medalEarned: false };
    
    targetProfile.skills[category][skillId].current = isOnlyMedalToggle ? targetProfile.skills[category][skillId].current : nextLevel;
    targetProfile.skills[category][skillId].medalEarned = medalState;
    
    renderTargetProfileData(targetProfile);
    syncToFirestore();
}

window.switchSkillCategory = function(categoryKey) {
    selectedCategory = categoryKey;
    document.querySelectorAll(".tab-link").forEach(tab => {
        const tabLabel = tab.textContent.toUpperCase();
        tab.classList.toggle("active", tabLabel.includes(categoryKey) || (categoryKey === 'REBEL' && tabLabel.includes('REBEL')));
    });
    
    const activeData = DEFAULT_SQUAD_PROFILES[currentSelectedUser];
    renderTargetProfileData(activeData);
};

function pushKeyboardInputStatsUpdate() {
    const nameInput = document.getElementById("profileCustomName");
    const psnInput = document.getElementById("profilePsnUser");
    const customNameVal = nameInput ? nameInput.value : "Unknown Ghost";
    const psnUsernameVal = psnInput ? psnInput.value : "";
    
    const dataObject = {
        name: customNameVal,
        psnUsername: psnUsernameVal,
        tierMode: document.getElementById("profileTierMode") ? document.getElementById("profileTierMode").value : "off",
        tier: document.getElementById("profileTierLevel") ? (parseInt(document.getElementById("profileTierLevel").value) || 1) : 1,
        playstyle: document.getElementById("profilePlaystyle") ? document.getElementById("profilePlaystyle").value : "Unassigned",
        avgKillDist: document.getElementById("profileAvgKillDist") ? (parseInt(document.getElementById("profileAvgKillDist").value) || 0) : 0,
        tactical: document.getElementById("profileTactical") ? (parseInt(document.getElementById("profileTactical").value) || 0) : 0,
        stealth: document.getElementById("profileStealth") ? (parseInt(document.getElementById("profileStealth").value) || 0) : 0,
        lifetime: document.getElementById("profileLifetime") ? document.getElementById("profileLifetime").value : "",
        longestShot: document.getElementById("profileLongestShot") ? (parseInt(document.getElementById("profileLongestShot").value) || 0) : 0,
        precision: document.getElementById("profilePrecision") ? (parseInt(document.getElementById("profilePrecision").value) || 0) : 0,
        favWeapon: document.getElementById("profileFavWeapon") ? document.getElementById("profileFavWeapon").value : "",
        favWeapon2: document.getElementById("profileFavWeapon2") ? document.getElementById("profileFavWeapon2").value : "",
        teammatesRevived: document.getElementById("profileRevives") ? (parseInt(document.getElementById("profileRevives").value) || 0) : 0,
        c4MineKills: document.getElementById("profileC4Kills") ? (parseInt(document.getElementById("profileC4Kills").value) || 0) : 0,
        droneUsed: document.getElementById("profileDroneUsed") ? document.getElementById("profileDroneUsed").value : "",
        travelAir: document.getElementById("profileTravelAir") ? document.getElementById("profileTravelAir").value : "",
        travelGround: document.getElementById("profileTravelGround") ? document.getElementById("profileTravelGround").value : "",
        travelPara: document.getElementById("profileTravelPara") ? document.getElementById("profileTravelPara").value : "",
        travelMap: document.getElementById("profileTravelMap") ? document.getElementById("profileTravelMap").value : ""
    };

    if (DEFAULT_SQUAD_PROFILES[currentSelectedUser]) {
        Object.assign(DEFAULT_SQUAD_PROFILES[currentSelectedUser], dataObject);
    }
    
    const diffOut = document.getElementById("difficultyScalingOutput");
    if (diffOut) diffOut.textContent = calculateDifficultyLabel(dataObject.tierMode, dataObject.tier);
    const levelLabel = document.getElementById("tierLevelContextLabel");
    if (levelLabel) levelLabel.textContent = dataObject.tierMode === "on" ? "Tier Level Countdown (50 -> 1)" : "Base Character Level Progress (1 -> 50)";

    syncToFirestore();
}

function setupInterfaceControls() {
    const userSelect = document.getElementById("userSelect");
    if (userSelect) {
        userSelect.addEventListener("change", (e) => {
            currentSelectedUser = e.target.value; 
            setGamertagCookie(currentSelectedUser);
            
            if (DEFAULT_SQUAD_PROFILES[currentSelectedUser]) {
                renderTargetProfileData(DEFAULT_SQUAD_PROFILES[currentSelectedUser]);
            }
            syncToFirestore();
        });
    }

    const platformSelect = document.getElementById("platformSelect");
    if (platformSelect) {
        platformSelect.addEventListener("change", (e) => {
            currentPlatform = e.target.value.toLowerCase();
            attachLiveFirestoreListeners();
        });
    }

    const addCustomUserBtn = document.getElementById("addCustomUserBtn");
    if (addCustomUserBtn) {
        addCustomUserBtn.addEventListener("click", () => {
            const inputTag = prompt("Enter Custom Gamer Tag / Profile Handle:");
            if (inputTag && inputTag.trim() !== "") {
                const cleanTag = inputTag.trim();
                setGamertagCookie(cleanTag);
                
                if (!DEFAULT_SQUAD_PROFILES[cleanTag]) {
                    DEFAULT_SQUAD_PROFILES[cleanTag] = {
                        name: cleanTag, psnUsername: cleanTag, tierMode: "off", tier: 1, playstyle: "Tactical Operative",
                        tactical: 50, stealth: 50, avgKillDist: 100, longestShot: 200, precision: 30,
                        lifetime: "1h 0min", favWeapon: "P416 (Starting Weapon)", favWeapon2: "MP5 (Starting Weapon)",
                        teammatesRevived: 0, c4MineKills: 0, droneUsed: "0h 10min",
                        travelAir: "0h 0min", travelGround: "0h 15min", travelPara: "0 Jumps", travelMap: "5%",
                        skills: generateCleanBlueprintCopy()
                    };
                }
                
                updateOperatorDropdownList(DEFAULT_SQUAD_PROFILES);
                userSelect.value = cleanTag;
                currentSelectedUser = cleanTag;
                renderTargetProfileData(DEFAULT_SQUAD_PROFILES[cleanTag]);
                
                attachLiveFirestoreListeners();
                syncToFirestore();
            }
        });
    }

    const inputsToWatch = [
        "profileCustomName", "profilePsnUser", "profileTierMode", "profileTierLevel", "profilePlaystyle", 
        "profileAvgKillDist", "profileTactical", "profileStealth", "profileLifetime", "profileLongestShot",
        "profilePrecision", "profileFavWeapon", "profileFavWeapon2", "profileRevives", "profileC4Kills", 
        "profileDroneUsed", "profileTravelAir", "profileTravelGround", "profileTravelPara", "profileTravelMap"
    ];
    inputsToWatch.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("input", pushKeyboardInputStatsUpdate);
            element.addEventListener("change", pushKeyboardInputStatsUpdate);
        }
    });
}

function evaluateDynamicTimeTheme() {
    const deviceHours = new Date().getHours(); 
    if (deviceHours >= 18 || deviceHours < 6) { document.body.classList.remove("bright-mode"); }
}

function setupInterTabSynchronization() {
    window.addEventListener("storage", (event) => {
        if (event.key === "wildlands_active_gamertag" && event.newValue) {
            const incoming = event.newValue; 
            const select = document.getElementById("userSelect");
            if (select && select.value !== incoming) {
                select.value = incoming; 
                currentSelectedUser = incoming;
                if (DEFAULT_SQUAD_PROFILES[incoming]) renderTargetProfileData(DEFAULT_SQUAD_PROFILES[incoming]);
            }
        }
    });
}

/* === DIRECT FIRESTORE CLOUD PUSH AT /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands === */
async function syncToFirestore() {
    if (!db || !auth.currentUser) return;

    try {
        const payload = DEFAULT_SQUAD_PROFILES[currentSelectedUser];
        if (!payload) return;

        // Path structure: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
        const platformRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform);
        const userProgressRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform, 'progress', GAME_ID);
        const userRef = doc(db, 'users', currentSelectedUser);

        // Parent metadata document sync
        await setDoc(userRef, { displayName: currentSelectedUser, lastUpdated: new Date().toISOString() }, { merge: true });
        await setDoc(platformRef, { platform: currentPlatform, lastActive: new Date().toISOString() }, { merge: true });
        
        // Save progress payload under current platform hierarchy
        await setDoc(userProgressRef, { ...payload, user: currentSelectedUser, platform: currentPlatform, gameId: GAME_ID, lastUpdated: new Date().toISOString() }, { merge: true });

        console.log(`Live broadcast pushed to Firestore for: ${currentSelectedUser} [${currentPlatform}] at /users/${currentSelectedUser}/platform/${currentPlatform}/progress/${GAME_ID}`);
    } catch (error) {
        console.error("CRITICAL FIRESTORE SAVE ERROR:", error);
    }
}
