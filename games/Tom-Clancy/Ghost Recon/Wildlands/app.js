/**
 * Ghost Recon Wildlands Progression Hub Engine
 * Verification: NYT-20260530-0453
 * * NO STRIPPING, NO COMPRESSING, DON'T CHANGE WHAT I DIDN'T SAY TO CHANGE
 * (Added dynamic Google Spreadsheets CSV publishing scraper parser tool routines)
 */

let database;
let currentSelectedUser = "";
let selectedCategory = "WEAPON";
let selectedSubCategory = "ALL_TROPHIES";

const BASELINE_SKILLS_BLUEPRINT = {
    "WEAPON": [
        { id: "stable_aim", name: "Stable Aim", max: 4, hasMedal: true }, 
        { id: "hip_fire", name: "Hip Fire Spread", max: 4, hasMedal: true }, 
        { id: "grenade_launcher", name: "Grenade Launcher", max: 4, hasMedal: false },
        { id: "ammo_capacity", name: "Ammo Capacity", max: 4, hasMedal: true }, 
        { id: "vhc_destruction", name: "VHC Destruction", max: 4, hasMedal: true }, 
        { id: "adv_suppressor", name: "ADV Suppressor", max: 1, hasMedal: false },
        { id: "time_to_aim", name: "Time To Aim", max: 4, hasMedal: true }, 
        { id: "ammo_retention", name: "Ammo Retention", max: 1, hasMedal: false }
    ],
    "DRONE": [
        { id: "battery_increase", name: "Battery Increase", max: 4, hasMedal: false },
        { id: "night_vision", name: "Night Vision", max: 1, hasMedal: false },
        { id: "range", name: "Range", max: 4, hasMedal: true }, 
        { id: "speed", name: "Speed", max: 2, hasMedal: true }, 
        { id: "mark_area", name: "Mark Area", max: 4, hasMedal: true }, 
        { id: "stealth", name: "Stealth", max: 1, hasMedal: false },
        { id: "cooldown", name: "Cooldown", max: 4, hasMedal: true }, 
        { id: "noisemaker", name: "NoiseMaker", max: 4, hasMedal: false },
        { id: "zoom", name: "Zoom", max: 1, hasMedal: false },
        { id: "explosive", name: "Explosive", max: 4, hasMedal: false },
        { id: "emp", name: "EMP", max: 4, hasMedal: false },
        { id: "armor", name: "Armor", max: 4, hasMedal: true }, 
        { id: "thermal_vision", name: "Thermal Vision", max: 1, hasMedal: false }
    ],
    "ITEM": [
        { id: "parachute", name: "Parachute Deployment", max: 1, hasMedal: false },
        { id: "binoc_zoom", name: "Binocular Zoom", max: 1, hasMedal: true }, 
        { id: "mine_capacity", name: "Mine Inventory", max: 4, hasMedal: true }, 
        { id: "binoc_recon", name: "Binocular Recon", max: 4, hasMedal: true }, 
        { id: "diversion_lure", name: "Diversion Lure", max: 4, hasMedal: true }, 
        { id: "frag_grenade", name: "Frag Grenade Boost", max: 4, hasMedal: true }, 
        { id: "c4", name: "C4 Charges", max: 4, hasMedal: true }, 
        { id: "thermal_vision_item", name: "Thermal Vision", max: 1, hasMedal: false },
        { id: "flashbang", name: "Flashbang", max: 4, hasMedal: true }, 
        { id: "flare_gun", name: "Flare Gun", max: 4, hasMedal: true }
    ],
    "PHYSICAL": [
        { id: "stamina", name: "Stamina Duration", max: 4, hasMedal: false }, 
        { id: "no_pain", name: "No Pain Threshold", max: 4, hasMedal: true }, 
        { id: "car_shield", name: "Car Shield", max: 4, hasMedal: true }, 
        { id: "quiet_running", name: "Quiet Running", max: 4, hasMedal: true }, 
        { id: "bullet_resistance", name: "Bullet Resistance", max: 4, hasMedal: true }, 
        { id: "detection", name: "Detection Visibility", max: 4, hasMedal: true }, 
        { id: "explosion_resistance", name: "Explosion Resistance", max: 4, hasMedal: true }, 
        { id: "aircraft_shield", name: "Aircraft Shield", max: 4, hasMedal: true }
    ],
    "SQUAD": [
        { id: "revive_speed", name: "Revive Speed", max: 4, hasMedal: true }, 
        { id: "extra_sync", name: "Extra Sync Shot Slot", max: 2, hasMedal: false }, 
        { id: "trained_rebels", name: "Trained Rebels", max: 4, hasMedal: true }, 
        { id: "squad_resilience", name: "Squad Resilience", max: 4, hasMedal: true }, 
        { id: "bleed_out_time", name: "Bleed Out Time", max: 4, hasMedal: true }, 
        { id: "born_leader", name: "Born Leader Aura", max: 4, hasMedal: true }
    ],
    "REBEL": [
        { id: "vehicle_drop", name: "Vehicle Drop-off", max: 9, hasMedal: false },
        { id: "guns_for_hire", name: "Guns For Hire", max: 9, hasMedal: false },
        { id: "mortar", name: "Mortar Strike", max: 9, hasMedal: false },
        { id: "diversion_rebel", name: "Diversion", max: 9, hasMedal: false },
        { id: "spotting", name: "Rebel Spotting", max: 9, hasMedal: false }
    ],
    "TROPHY": [
        { id: "col_av_sr3m", name: "SR3M (Assault Rifle)", desc: "Weapon Casing Location: Agua Verde", max: 1, sub: "WEAPONS" },
        { id: "col_av_pp19", name: "PP19 (Submachine Gun)", desc: "Weapon Casing Location: Agua Verde", max: 1, sub: "WEAPONS" },
        { id: "col_av_sasg12", name: "SASG-12 (Shotgun)", desc: "Weapon Casing Location: Agua Verde", max: 1, sub: "WEAPONS" },
        { id: "col_bv_mp7", name: "MP7 (Submachine Gun)", desc: "Weapon Casing Location: Barvechos", max: 1, sub: "WEAPONS" },
        { id: "col_bv_auga3", name: "AUG A3 (Assault Rifle)", desc: "Weapon Casing Location: Barvechos", max: 1, sub: "WEAPONS" },
        { id: "col_cm_sr25", name: "SR25 (Sniper Rifle)", desc: "Weapon Casing Location: Caimanes", max: 1, sub: "WEAPONS" },
        { id: "col_cm_556xi", name: "556xi (Assault Rifle)", desc: "Weapon Casing Location: Caimanes", max: 1, sub: "WEAPONS" },
        { id: "col_es_l85a2", name: "L85A2 (Assault Rifle)", desc: "Weapon Casing Location: Espiritu Santo", max: 1, sub: "WEAPONS" },
        { id: "col_es_mk48", name: "MK-48 (Light Machine Gun)", desc: "Weapon Casing Location: Espiritu Santo", max: 1, sub: "WEAPONS" },
        { id: "col_fd_mk17", name: "Mk17 (Assault Rifle)", desc: "Weapon Casing Location: Flor De Oro", max: 1, sub: "WEAPONS" },
        { id: "col_fd_m4a1", name: "M4A1 (Assault Rifle)", desc: "Weapon Casing Location: Flor De Oro", max: 1, sub: "WEAPONS" },
        { id: "col_ic_9x19vsn", name: "9x19VSN (Submachine Gun)", desc: "Weapon Casing Location: Inca Camina", max: 1, sub: "WEAPONS" },
        { id: "col_ic_g2", name: "G2 (Assault Rifle)", desc: "Weapon Casing Location: Inca Camina", max: 1, sub: "WEAPONS" },
        { id: "col_it_mg121", name: "MG121 (Light Machine Gun)", desc: "Weapon Casing Location: Itacua", max: 1, sub: "WEAPONS" },
        { id: "col_it_m40a5", name: "M40A5 (Sniper Rifle)", desc: "Weapon Casing Location: Itacua", max: 1, sub: "WEAPONS" },
        { id: "col_it_shorty", name: "Super Shorty (Shotgun)", desc: "Weapon Casing Location: Itacua", max: 1, sub: "WEAPONS" },
        { id: "col_ko_sr1", name: "SR-1 (Sniper Rifle)", desc: "Weapon Casing Location: Koani", max: 1, sub: "WEAPONS" },
        { id: "col_ko_mk14", name: "MK14 (Sniper Rifle)", desc: "Weapon Casing Location: Koani", max: 1, sub: "WEAPONS" },
        { id: "col_ko_scorp", name: "Scorpion EVO 3 (SMG)", desc: "Weapon Casing Location: Koani", max: 1, sub: "WEAPONS" },
        { id: "col_lc_spas12", name: "SPAS-12 (Shotgun)", desc: "Weapon Casing Location: La Cruz", max: 1, sub: "WEAPONS" },
        { id: "col_lc_m1891", name: "M1891 (Sniper Rifle)", desc: "Weapon Casing Location: La Cruz", max: 1, sub: "WEAPONS" },
        { id: "col_lc_p90", name: "P90 (Submachine Gun)", desc: "Weapon Casing Location: La Cruz", max: 1, sub: "WEAPONS" },
        { id: "col_li_d50", name: "D50 (Handgun)", desc: "Weapon Casing Location: Libertad", max: 1, sub: "WEAPONS" },
        { id: "col_li_ak47", name: "AK-47 (Assault Rifle)", desc: "Weapon Casing Location: Libertad", max: 1, sub: "WEAPONS" },
        { id: "col_ma_p227", name: "P227 (Handgun)", desc: "Weapon Casing Location: Malca", max: 1, sub: "WEAPONS" },
        { id: "col_ma_mk249", name: "Mk249 (Light Machine Gun)", desc: "Weapon Casing Location: Malca", max: 1, sub: "WEAPONS" },
        { id: "col_ml_6p41", name: "6P41 (Light Machine Gun)", desc: "Weapon Casing Location: Media Luna", max: 1, sub: "WEAPONS" },
        { id: "col_ml_acr", name: "ACR (Assault Rifle)", desc: "Weapon Casing Location: Media Luna", max: 1, sub: "WEAPONS" },
        { id: "col_ml_vector", name: "Vector .45 ACP (SMG)", desc: "Weapon Casing Location: Media Luna", max: 1, sub: "WEAPONS" },
        { id: "col_mo_mpx", name: "MPX (Submachine Gun)", desc: "Weapon Casing Location: Mojocoyo", max: 1, sub: "WEAPONS" },
        { id: "col_mo_srsa1", name: "SRSA1 (Sniper Rifle)", desc: "Weapon Casing Location: Mojocoyo", max: 1, sub: "WEAPONS" },
        { id: "col_mp_r5", name: "R5 RGP (Assault Rifle)", desc: "Weapon Casing Location: Monte Puncu", max: 1, sub: "WEAPONS" },
        { id: "col_mp_l115", name: "L115A3 (Sniper Rifle)", desc: "Weapon Casing Location: Monte Puncu", max: 1, sub: "WEAPONS" },
        { id: "col_my_tar21", name: "TAR-21 (Assault Rifle)", desc: "Weapon Casing Location: Montuyoc", max: 1, sub: "WEAPONS" },
        { id: "col_my_hti", name: "HTI (Sniper Rifle)", desc: "Weapon Casing Location: Montuyoc", max: 1, sub: "WEAPONS" },
        { id: "col_my_msr", name: "MSR (Sniper Rifle)", desc: "Weapon Casing Location: Montuyoc", max: 1, sub: "WEAPONS" },
        { id: "col_oc_57usg", name: "5.7 USG (Handgun)", desc: "Weapon Casing Location: Ocoro", max: 1, sub: "WEAPONS" },
        { id: "col_oc_m1911", name: "M1911 (Handgun)", desc: "Weapon Casing Location: Ocoro", max: 1, sub: "WEAPONS" },
        { id: "col_oc_sr635", name: "SR-635 (Submachine Gun)", desc: "Weapon Casing Location: Ocoro", max: 1, sub: "WEAPONS" },
        { id: "col_pu_smg11", name: "SMG-11 (Submachine Gun)", desc: "Weapon Casing Location: Pucara", max: 1, sub: "WEAPONS" },
        { id: "col_pu_stoner", name: "Stoner LMG A1 (LMG)", desc: "Weapon Casing Location: Pucara", max: 1, sub: "WEAPONS" },
        { id: "col_re_type95", name: "Type 95 (Light Machine Gun)", desc: "Weapon Casing Location: Remanzo", max: 1, sub: "WEAPONS" },
        { id: "col_re_skorp", name: "Skorpion (Machine Gun)", desc: "Weapon Casing Location: Remanzo", max: 1, sub: "WEAPONS" },
        { id: "col_re_9mmc1", name: "9mm C1 (Submachine Gun)", desc: "Weapon Casing Location: Remanzo", max: 1, sub: "WEAPONS" },
        { id: "col_sm_g28", name: "G28 (Sniper Rifle)", desc: "Weapon Casing Location: San Mateo", max: 1, sub: "WEAPONS" },
        { id: "col_sm_psg", name: "PSG (Submachine Gun)", desc: "Weapon Casing Location: San Mateo", max: 1, sub: "WEAPONS" },
        { id: "col_ta_p12", name: "P12 (Handgun)", desc: "Weapon Casing Location: Tabacal", max: 1, sub: "WEAPONS" },
        { id: "col_ta_ak12", name: "AK-12 LMG A1 (Assault)", desc: "Weapon Casing Location: Tabacal", max: 1, sub: "WEAPONS" },
        { id: "col_vv_805bren", name: "805 Bren A2 (Assault)", desc: "Weapon Casing Location: Villa Verde", max: 1, sub: "WEAPONS" },
        { id: "col_vv_svd", name: "Dragunov (SVD) (Sniper)", desc: "Weapon Casing Location: Villa Verde", max: 1, sub: "WEAPONS" },
        { id: "col_vv_m9", name: "M9 (Handgun)", desc: "Weapon Casing Location: Villa Verde", max: 1, sub: "WEAPONS" },
        { id: "md_air_sh", name: "Aircraft Shield", desc: "Bonus Medal Location: Barvechos", max: 1, sub: "MEDALS" },
        { id: "md_ammo_cap", name: "Ammo Capacity", desc: "Bonus Medal Location: Barvechos", max: 1, sub: "MEDALS" },
        { id: "md_bin_rec", name: "Binocular Recon", desc: "Bonus Medal Location: Caimanes", max: 1, sub: "MEDALS" },
        { id: "md_quiet", name: "Quiet Running", desc: "Bonus Medal Location: Espiritu Santo", max: 1, sub: "MEDALS" },
        { id: "md_bin_zm", name: "Binocular Zoom", desc: "Bonus Medal Location: Flor De Oro", max: 1, sub: "MEDALS" },
        { id: "md_bleed", name: "Bleed Out Time", desc: "Bonus Medal Location: Inca Camina", max: 1, sub: "MEDALS" },
        { id: "md_bullet_it", name: "Bullet Resistance", desc: "Bonus Medal Location: Itacua", max: 1, sub: "MEDALS" },
        { id: "md_leader", name: "Born Leader", desc: "Bonus Medal Location: Itacua", max: 1, sub: "MEDALS" },
        { id: "md_c4", name: "C4 Charges", desc: "Bonus Medal Location: Koani", max: 1, sub: "MEDALS" },
        { id: "md_car_sh", name: "Car Shield", desc: "Bonus Medal Location: Koani", max: 1, sub: "MEDALS" },
        { id: "md_detect", name: "Detection", desc: "Bonus Medal Location: La Cruz", max: 1, sub: "MEDALS" },
        { id: "md_lure", name: "Diversion Lure", desc: "Bonus Medal Location: Libertad", max: 1, sub: "MEDALS" },
        { id: "md_armor", name: "Armour", desc: "Bonus Medal Location: Libertad", max: 1, sub: "MEDALS" },
        { id: "md_explos", name: "Explosion Resistance", desc: "Bonus Medal Location: Malca", max: 1, sub: "MEDALS" },
        { id: "md_mark", name: "Mark Area", desc: "Bonus Medal Location: Media Luna", max: 1, sub: "MEDALS" },
        { id: "md_flare", name: "Flare Gun", desc: "Bonus Medal Location: Media Luna", max: 1, sub: "MEDALS" },
        { id: "md_flash", name: "Flash Grenade", desc: "Bonus Medal Location: Mojocoyo", max: 1, sub: "MEDALS" },
        { id: "md_range", name: "Range", desc: "Bonus Medal Location: Mojocoyo", max: 1, sub: "MEDALS" },
        { id: "md_mine", name: "Mine Inventory", desc: "Bonus Medal Location: Ocoro", max: 1, sub: "MEDALS" },
        { id: "md_bullet_oc", name: "Bullet Resistance", desc: "Bonus Medal Location: Ocoro", max: 1, sub: "MEDALS" },
        { id: "md_no_pain", name: "No Pain", desc: "Bonus Medal Location: P.N. De Agua Verde", max: 1, sub: "MEDALS" },
        { id: "md_rebels", name: "Trained Rebels", desc: "Bonus Medal Location: P.N. De Agua Verde", max: 1, sub: "MEDALS" },
        { id: "md_resil", name: "Squad Resilience", desc: "Bonus Medal Location: Remanzo", max: 1, sub: "MEDALS" },
        { id: "md_aim", name: "Stable Aim", desc: "Bonus Medal Location: San Mateo", max: 1, sub: "MEDALS" },
        { id: "md_time_aim", name: "Time To Aim", desc: "Bonus Medal Location: Tabacal", max: 1, sub: "MEDALS" },
        { id: "sc_ta31h", name: "TA31H Scope", desc: "Location: Espiritu Santo (AR, Sniper)", max: 1, sub: "SCOPES" },
        { id: "sc_pkas", name: "PK-AS Scope", desc: "Location: Itacua (SMG, AR)", max: 1, sub: "SCOPES" },
        { id: "sc_panoramic", name: "Panoramic Sight", desc: "Location: Itacua (SMG, Shotgun, AR, LMG)", max: 1, sub: "SCOPES" },
        { id: "sc_t5xi", name: "T5Xi Tactical", desc: "Location: Koani (Sniper Rifle)", max: 1, sub: "SCOPES" },
        { id: "sc_micro_g33", name: "Micro T-1 & G33", desc: "Location: Koani (SMG, AR)", max: 1, sub: "SCOPES" },
        { id: "sc_rus_g33", name: "RUS Red Dot & G33", desc: "Location: Media Luna (AR)", max: 1, sub: "SCOPES" },
        { id: "sc_pks07", name: "PKS-07 Scope", desc: "Location: San Mateo (Sniper Rifle)", max: 1, sub: "SCOPES" },
        { id: "sc_russian_rd", name: "Russian Red Dot", desc: "Location: Villa Verde (SMG, Shotgun, AR, LMG)", max: 1, sub: "SCOPES" },
        { id: "sc_exps3", name: "EXPS3 Scope", desc: "Location: Caimanes (SMG, Shotgun, AR, LMG)", max: 1, sub: "SCOPES" },
        { id: "sc_g28", name: "G28 Scope", desc: "Location: Inca Camina (Sniper Rifle)", max: 1, sub: "SCOPES" },
        { id: "sc_micro", name: "Micro T-1 Scope", desc: "Location: Malaca (SMG, Shotgun, AR, LMG)", max: 1, sub: "SCOPES" },
        { id: "sc_compm4", name: "CompM4 Scope", desc: "Location: Ocoro (SMG, AR)", max: 1, sub: "SCOPES" },
        { id: "sc_posp", name: "POSP Scope", desc: "Location: Koani (AR, Sniper)", max: 1, sub: "SCOPES" },
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
        { id: "tr_mousetrap", name: "A Better Mousetrap", desc: "Killed 7 enemies with a single mine.", max: 1, isTrophy: true, sub: "ALL_TROPHIES", psnName: "A Better Mousetrap" }
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

const werewolfSkills = generateCleanBlueprintCopy();
werewolfSkills.WEAPON["stable_aim"].current = 4; werewolfSkills.WEAPON["stable_aim"].medalEarned = true;
werewolfSkills.WEAPON["hip_fire"].current = 3; werewolfSkills.WEAPON["grenade_launcher"].current = 3;
werewolfSkills.WEAPON["ammo_capacity"].current = 4; werewolfSkills.WEAPON["vhc_destruction"].current = 4; werewolfSkills.WEAPON["vhc_destruction"].medalEarned = true;
werewolfSkills.WEAPON["adv_suppressor"].current = 1; werewolfSkills.WEAPON["time_to_aim"].current = 4; werewolfSkills.WEAPON["ammo_retention"].current = 1;

const DEFAULT_SQUAD_PROFILES = {
    "Werewolf3788": {
        name: "Werewolf3788", tierMode: "on", tier: 41, playstyle: "Overwatch",
        tactical: 100, stealth: 52, avgKillDist: "73 m", longestShot: "389 m", precision: 9, lifetime: "0h 14min", favWeapon: "556xi", favWeapon2: "M40A5", teammatesRevived: 132, c4MineKills: 139, droneUsed: "12h 49min", travelAir: "11h 1min", travelGround: "6h 52min", travelPara: "20 Jumps", travelMap: "90%",
        skills: werewolfSkills
    },
    "DesdemonaTiger": {
        name: "DesdemonaTiger", tierMode: "on", tier: 42, playstyle: "Overwatch",
        tactical: 17, stealth: 53, avgKillDist: "54 m", longestShot: "481 m", precision: 16, lifetime: "0h 24min", favWeapon: "GR*FS ACR", favWeapon2: "2nd Favorite Weapon", teammatesRevived: 43, c4MineKills: 42, droneUsed: "0h 41min", travelAir: "4h 30min", travelGround: "3h 24min", travelPara: "23 Jumps", travelMap: "86%",
        skills: generateCleanBlueprintCopy()
    },
    "DarkTerr": {
        name: "DarkTerr", tierMode: "off", tier: "--", playstyle: "Unassigned",
        tactical: 0, stealth: 0, avgKillDist: "0 m", longestShot: "0 m", precision: 0, lifetime: "0h 0min", favWeapon: "Unassigned", favWeapon2: "Unassigned", teammatesRevived: 0, c4MineKills: 0, droneUsed: "0h 0min", travelAir: "0h 0min", travelGround: "0h 0min", travelPara: "0 Jumps", travelMap: "0%",
        skills: generateCleanBlueprintCopy()
    },
    "OneLIVIDMAN": {
        name: "OneLIVIDMAN", tierMode: "off", tier: "--", playstyle: "Unassigned",
        tactical: 0, stealth: 0, avgKillDist: "0 m", longestShot: "0 m", precision: 0, lifetime: "0h 0min", favWeapon: "Unassigned", favWeapon2: "Unassigned", teammatesRevived: 0, c4MineKills: 0, droneUsed: "0h 0min", travelAir: "0h 0min", travelGround: "0h 0min", travelPara: "0 Jumps", travelMap: "0%",
        skills: generateCleanBlueprintCopy()
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initializeFirebaseApp();
    setupInterfaceControls();
    evaluateDynamicTimeTheme();
    loadTypographyPreferences();
    setupInterTabSynchronization();
    // Instantly bootstrap dynamic spreadsheet data retrieval channels on startup
    fetchTacticalIntelDirectory();
});

function initializeFirebaseApp() {
    const firebaseConfig = {
        apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
        authDomain: "game-tracker-5b2ef.firebaseapp.com",
        databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
        projectId: "game-tracker-5b2ef",
        storageBucket: "game-tracker-5b2ef.firebasestorage.app",
        messagingSenderId: "555667047127",
        appId: "1:555667047127:web:af6f468ca3cf06759aa692"
    };
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    synchronizeWithFirebaseDatabase();
    executeLivePsnTrophySync();
}

// GOOGLE SPREADSHEETS CSV PARSING AND RENDERING LOGIC LAYER
function fetchTacticalIntelDirectory() {
    const targetPublishedCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv";

    fetch(targetPublishedCsvUrl)
        .then(res => { if (!res.ok) throw new Error("CSV sheet unreadable"); return res.text(); })
        .then(csvRawText => {
            document.getElementById("directoryLoading").remove();
            processAndRenderDirectoryRows(csvRawText);
        })
        .catch(err => {
            document.getElementById("directoryLoading").textContent = "Intel Directory Offline.";
        });
}

function processAndRenderDirectoryRows(csvText) {
    const menuContainer = document.getElementById("directoryDropdownContent");
    
    // Split text cleanly by line breaks into array slots
    const rawLines = csvText.split(/\r?\n/);
    const folderGroupMaps = {};
    const standaloneDirectLinks = [];

    // Parse loop skips header row index 0 seamlessly
    for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        // Clean split commas tracking quotes safely
        const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (columns.length < 3) continue;

        const nameStr = columns[0].replace(/^"|"$/g, '').trim();
        const folderStr = columns[1].replace(/^"|"$/g, '').trim();
        const targetUrl = columns[2].replace(/^"|"$/g, '').trim();
        const thumbUrl = columns[3] ? columns[3].replace(/^"|"$/g, '').trim() : "";

        if (!nameStr || !targetUrl) continue;

        const linkObjectData = { name: nameStr, url: targetUrl, img: thumbUrl };

        if (folderStr) {
            if (!folderGroupMaps[folderStr]) folderGroupMaps[folderStr] = [];
            folderGroupMaps[folderStr].push(linkObjectData);
        } else {
            standaloneDirectLinks.push(linkObjectData);
        }
    }

    // Render grouped folders cleanly into the container dropdown
    Object.keys(folderGroupMaps).forEach(folderName => {
        const folderBlock = document.createElement("div");
        folderBlock.className = "dir-folder-container";

        const folderTitle = document.createElement("div");
        folderTitle.className = "dir-folder-title";
        folderTitle.innerHTML = `📁 ${folderName}`;
        folderBlock.appendChild(folderTitle);

        folderGroupMaps[folderName].forEach(item => {
            folderBlock.appendChild(createDirectoryItemAnchorElement(item));
        });

        menuContainer.appendChild(folderBlock);
    });

    // Append standard loose individual links onto the container dropdown bounds
    standaloneDirectLinks.forEach(item => {
        menuContainer.appendChild(createDirectoryItemAnchorElement(item));
    });
}

function createDirectoryItemAnchorElement(item) {
    const anchor = document.createElement("a");
    anchor.className = "dir-item-link";
    anchor.href = item.url;
    anchor.target = "_blank"; // Implement Cross-Tab Named targeting behavior safely
    anchor.setAttribute("rel", "noopener noreferrer");

    let imgHtml = "";
    if (item.img) {
        imgHtml = `<img src="${item.img}" class="dir-thumb-img" alt="">`;
    }

    anchor.innerHTML = `
        ${imgHtml}
        <span>${item.name}</span>
    `;
    return anchor;
}

function executeLivePsnTrophySync() {
    const targetRawJsonUrl = "https://raw.githack.com/Werewolf3788/Website/main/Playstation/psn_data.json";
    fetch(targetRawJsonUrl)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(psnPayload => processPsnTrophyMapping(psnPayload))
        .catch(err => console.warn("PSN Sync down: fallback mode active."));
}

function processPsnTrophyMapping(data) {
    if (!database) return;
    const operatorsList = ["Werewolf3788", "DesdemonaTiger", "DarkTerr", "OneLIVIDMAN"];
    
    operatorsList.forEach(operatorKey => {
        const userDataRecord = data.players ? data.players[operatorKey] : null;
        if (!userDataRecord) return;

        const wildlandsGame = userDataRecord.games ? Object.values(userDataRecord.games).find(g => g.name && g.name.includes("Wildlands")) : null;
        if (!wildlandsGame || !wildlandsGame.trophies) return;

        const trophyBlueprintList = BASELINE_SKILLS_BLUEPRINT["TROPHY"];
        trophyBlueprintList.forEach(blueprintTrophy => {
            if (!blueprintTrophy.isTrophy) return;
            const psnTrophyObj = Object.values(wildlandsGame.trophies).find(t => t.name === blueprintTrophy.psnName);
            if (psnTrophyObj) {
                database.ref(`ghost_squad/operators/${operatorKey}/skills/TROPHY/${blueprintTrophy.id}`).update({
                    id: blueprintTrophy.id, current: psnTrophyObj.earned === true ? 1 : 0
                });
            }
        });
    });
}

function synchronizeWithFirebaseDatabase() {
    const squadRef = database.ref("ghost_squad/operators");
    squadRef.once("value", snapshot => {
        if (!snapshot.exists()) {
            squadRef.set(DEFAULT_SQUAD_PROFILES);
        } else {
            squadRef.child("OneLIVIDMAN").once("value", userSnap => {
                if (!userSnap.exists()) {
                    squadRef.child("OneLIVIDMAN").set(DEFAULT_SQUAD_PROFILES.OneLIVIDMAN);
                }
            });
        }
    });

    squadRef.on("value", snapshot => {
        const directoryData = snapshot.val();
        if (directoryData) updateOperatorDropdownList(directoryData);
    });
}

function updateOperatorDropdownList(profiles) {
    const selectorElement = document.getElementById("userSelect");
    const activeSelectionBeforeUpdate = selectorElement.value || Object.keys(profiles)[0];
    
    selectorElement.innerHTML = "";
    Object.keys(profiles).forEach(key => {
        const option = document.createElement("option");
        option.value = key; option.textContent = profiles[key].name; selectorElement.appendChild(option);
    });
    
    selectorElement.value = activeSelectionBeforeUpdate; currentSelectedUser = activeSelectionBeforeUpdate;
    renderTargetProfileData(profiles[activeSelectionBeforeUpdate]);
}

function renderTargetProfileData(operator) {
    if (!operator) return;
    document.getElementById("operatorName").textContent = operator.name;
    document.getElementById("playstyleType").textContent = operator.playstyle;
    
    const tierContainer = document.getElementById("tierContainer");
    if (operator.tierMode === "off" || !operator.tierMode) {
        tierContainer.classList.add("tier-disabled"); document.getElementById("tierLevel").textContent = "--";
    } else {
        tierContainer.classList.remove("tier-disabled"); document.getElementById("tierLevel").textContent = operator.tier;
    }
    
    document.getElementById("avgKillDist").textContent = operator.avgKillDist || "--";
    document.getElementById("tacticalValue").textContent = `${operator.tactical || 0}%`;
    document.getElementById("tacticalBar").style.width = `${operator.tactical || 0}%`;
    document.getElementById("stealthValue").textContent = `${operator.stealth || 0}%`;
    document.getElementById("stealthBar").style.width = `${operator.stealth || 0}%`;
    
    document.getElementById("statLifetime").textContent = operator.lifetime || "--";
    document.getElementById("longestShot").textContent = operator.longestShot || "--";
    document.getElementById("precisionValue").textContent = `${operator.precision || 0}%`;
    document.getElementById("precisionBar").style.width = `${operator.precision || 0}%`;
    document.getElementById("favWeapon").textContent = operator.favWeapon || "--";
    document.getElementById("favWeapon2").textContent = operator.favWeapon2 || "--";

    document.getElementById("teammatesRevived").textContent = operator.teammatesRevived || 0;
    document.getElementById("c4MineKills").textContent = operator.c4MineKills || 0;
    document.getElementById("statDroneUsed").textContent = operator.droneUsed || "--";

    document.getElementById("travelAir").textContent = operator.travelAir || "--";
    document.getElementById("travelGround").textContent = operator.travelGround || "--";
    document.getElementById("travelPara").textContent = operator.travelPara || "--";
    document.getElementById("travelMap").textContent = operator.travelMap || "--";

    renderSkillsTree(operator.skills || {});
}

function renderSkillsTree(incomingDatabaseSkills) {
    const container = document.getElementById("skillsTreeGrid");
    container.innerHTML = "";
    
    const isTrophyTabActive = selectedCategory === "TROPHY";
    
    if (isTrophyTabActive) {
        const subNavWrapper = document.createElement("div");
        subNavWrapper.style.cssText = "grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; width:100%;";
        
        const filters = [
            { id: "ALL_TROPHIES", label: "🏆 Trophies (57)" },
            { id: "WEAPONS", label: "🔫 Weapons Case Intel" },
            { id: "MEDALS", label: "🎖️ Bonus Medals Grid" },
            { id: "SCOPES", label: "🔭 Accessory Cases" }
        ];

        filters.forEach(f => {
            const btn = document.createElement("button");
            btn.className = "tab-link";
            btn.style.cssText = "padding: 8px 12px; font-size: 11px; min-height: 34px; min-width: auto; flex: none;";
            if (selectedSubCategory === f.id) btn.style.backgroundColor = "var(--primary-orange)";
            btn.textContent = f.label;
            btn.addEventListener("click", () => {
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

        const isRebelSupportNode = blueprintSkill.max === 9;
        const isTrophyLayout = blueprintSkill.isTrophy === true || isTrophyTabActive;
        const isMaxed = currentLevel >= blueprintSkill.max; 
        const isUnlocked = currentLevel > 0;

        let cardStatusClass = "skill-card";
        if (isTrophyLayout) cardStatusClass += " trophy-node";
        if (isMaxed) cardStatusClass += " maxed"; 
        else if (isUnlocked) cardStatusClass += " unlocked";

        const card = document.createElement("div"); 
        card.className = cardStatusClass;
        
        let rankLabelText = `Rank: ${currentLevel}/${blueprintSkill.max}`;
        if (isRebelSupportNode) {
            const calculatedPowerLvl = Math.ceil(currentLevel / 3) || 1;
            rankLabelText = `Lvl: ${calculatedPowerLvl} (${currentLevel}/${blueprintSkill.max})`;
        } else if (isTrophyLayout) {
            rankLabelText = blueprintSkill.desc;
        }

        let indicatorsHtml = '<div class="skill-rank-indicators">';
        for (let idx = 1; idx <= blueprintSkill.max; idx++) {
            indicatorsHtml += `<span class="rank-dot ${idx <= currentLevel ? 'active' : ''}"></span>`;
        }
        indicatorsHtml += '</div>';

        let medalButtonHtml = '';
        if (blueprintSkill.hasMedal) {
            medalButtonHtml = `<button class="medal-toggle-btn ${medalEarned ? 'medal-earned' : ''}">★</button>`;
        }

        let baselineMetaRowContent = `<div class="rank-interactive-zone-dots" style="flex:1; cursor:pointer; display:flex; align-items:center; min-height:24px;">${indicatorsHtml}</div>${medalButtonHtml}`;
        if (isTrophyLayout) {
            baselineMetaRowContent = `<span class="trophy-checkbox-status">${isUnlocked ? 'COMPLETED' : 'LOCKED'}</span>`;
        }

        card.innerHTML = `
            <div class="card-top-action">
                <h4 class="outline-text" style="font-size:13px; font-weight:bold;">${blueprintSkill.name}</h4>
                <p style="font-size: 11px; color:#8a99ad; margin-top:2px; white-space: normal; text-overflow: clip;">${rankLabelText}</p>
                ${!isTrophyLayout ? `<div class="skill-meta-row" style="margin-top: 8px;">${indicatorsHtml}</div>` : ''}
            </div>
            ${blueprintSkill.hasMedal || isTrophyLayout ? `<div class="card-bottom-action">${baselineMetaRowContent}</div>` : ''}
        `;

        card.querySelector(".card-top-action").addEventListener("click", () => {
            incrementSkillRankLevel(selectedCategory, blueprintSkill.id, currentLevel, blueprintSkill.max, medalEarned);
        });

        if (blueprintSkill.hasMedal) {
            card.querySelector(".medal-toggle-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                toggleSkillMedalStatus(selectedCategory, blueprintSkill.id, currentLevel, !medalEarned);
            });
        }
        container.appendChild(card);
    });
}

function switchSkillCategory(categoryKey) {
    selectedCategory = categoryKey;
    document.querySelectorAll(".tab-link").forEach(tab => {
        const tabLabel = tab.textContent.toUpperCase();
        tab.classList.toggle("active", tabLabel === categoryKey || (categoryKey === 'REBEL' && tabLabel === 'REBEL') || (categoryKey === 'TROPHY' && tabLabel === 'TROPHIES & RECON'));
    });
    if (database) {
        database.ref(`ghost_squad/operators/${currentSelectedUser}`).once("value", snapshot => {
            if (snapshot.exists()) renderTargetProfileData(snapshot.val());
        });
    }
}

function incrementSkillRankLevel(category, skillId, currentLevel, maxAllowed, medalState) {
    if (!database) return;
    let nextLevel = currentLevel + 1; if (nextLevel > maxAllowed) nextLevel = 0; 
    database.ref(`ghost_squad/operators/${currentSelectedUser}/skills/${category}/${skillId}`).set({
        id: skillId, current: nextLevel, medalEarned: medalState
    });
}

function toggleSkillMedalStatus(category, skillId, currentLevel, nextMedalState) {
    if (!database) return;
    database.ref(`ghost_squad/operators/${currentSelectedUser}/skills/${category}/${skillId}`).set({
        id: skillId, current: currentLevel, medalEarned: nextMedalState
    });
}

function setupInterfaceControls() {
    // Dynamic Intel Directory popup click listener
    document.getElementById("directoryMenuBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("directoryDropdownContent").classList.toggle("hidden");
    });

    // Close directory click listener if tapping blank container fields outside drop pane boundaries
    document.addEventListener("click", () => {
        document.getElementById("directoryDropdownContent").classList.add("hidden");
    });

    document.getElementById("directoryDropdownContent").addEventListener("click", (e) => {
        e.stopPropagation();
    });

    const userSelect = document.getElementById("userSelect");
    userSelect.addEventListener("change", (e) => {
        currentSelectedUser = e.target.value; localStorage.setItem("itc_active_ghost_operator", currentSelectedUser);
        if (database) {
            database.ref(`ghost_squad/operators/${currentSelectedUser}`).once("value", snapshot => {
                if (snapshot.exists()) { renderTargetProfileData(snapshot.val()); populateEditorInputs(snapshot.val()); }
            });
        }
    });

    document.getElementById("toggleEditStats").addEventListener("click", () => {
        const panel = document.getElementById("editStatsPanel"); panel.classList.toggle("hidden");
        if (!panel.classList.contains("hidden") && database) {
            database.ref(`ghost_squad/operators/${currentSelectedUser}`).once("value", snapshot => {
                if (snapshot.exists()) populateEditorInputs(snapshot.val());
            });
        }
    });

    document.getElementById("saveStatsBtn").addEventListener("click", saveStatsFromEditor);
    document.getElementById("toggleUiSettings").addEventListener("click", () => { document.getElementById("uiSettingsPanel").classList.toggle("hidden"); });
    document.getElementById("themeModeSelect").addEventListener("change", (e) => {
        const mode = e.target.value; setCookiePreference("ui_theme_mode_setting", mode, 30); executeThemeChangeLogic(mode);
    });
    document.getElementById("outlineColorPicker").addEventListener("input", (e) => {
        const color = e.target.value; setCookiePreference("ui_text_outline_color", color, 30); applyConditionalTypographyLogic(color, document.getElementById("fontStyleSelect").value);
    });
    document.getElementById("fontStyleSelect").addEventListener("change", (e) => {
        const font = e.target.value; setCookiePreference("ui_font_style_setting", font, 30); applyConditionalTypographyLogic(document.getElementById("outlineColorPicker").value, font);
    });
}

function populateEditorInputs(operator) {
    document.getElementById("editTierMode").value = operator.tierMode || "off";
    document.getElementById("editTierLevel").value = operator.tier !== "--" ? operator.tier : "";
    document.getElementById("editPlaystyle").value = operator.playstyle || "";
    document.getElementById("editAvgDist").value = operator.avgKillDist || "";
    document.getElementById("editTactical").value = operator.tactical || 0;
    document.getElementById("editStealth").value = operator.stealth || 0;
    document.getElementById("editLifetime").value = operator.lifetime || "";
    document.getElementById("editLongest").value = operator.longestShot || "";
    document.getElementById("editPrecision").value = operator.precision || 0;
    document.getElementById("editFav1").value = operator.favWeapon || "";
    document.getElementById("editFav2").value = operator.favWeapon2 || "";
    document.getElementById("editRevives").value = operator.teammatesRevived || 0;
    document.getElementById("editExplosiveKills").value = operator.c4MineKills || 0;
    document.getElementById("editDroneTime").value = operator.droneUsed || "";
    document.getElementById("editAir").value = operator.travelAir || "";
    document.getElementById("editGround").value = operator.travelGround || "";
    document.getElementById("editPara").value = operator.travelPara || "";
    document.getElementById("editMap").value = operator.travelMap || "";
}

function saveStatsFromEditor() {
    if (!database) return;
    const updates = {
        tierMode: document.getElementById("editTierMode").value,
        tier: document.getElementById("editTierMode").value === "on" ? parseInt(document.getElementById("editTierLevel").value) || 50 : "--",
        playstyle: document.getElementById("editPlaystyle").value || "Unassigned",
        avgKillDist: document.getElementById("editAvgDist").value || "0 m",
        tactical: parseInt(document.getElementById("editTactical").value) || 0,
        stealth: parseInt(document.getElementById("editStealth").value) || 0,
        lifetime: document.getElementById("editLifetime").value || "0h 0min",
        longestShot: document.getElementById("editLongest").value || "0 m",
        precision: parseInt(document.getElementById("editPrecision").value) || 0,
        favWeapon: document.getElementById("editFav1").value || "Unassigned",
        favWeapon2: document.getElementById("editFav2").value || "Unassigned",
        teammatesRevived: parseInt(document.getElementById("editRevives").value) || 0,
        c4MineKills: parseInt(document.getElementById("editExplosiveKills").value) || 0,
        droneUsed: document.getElementById("editDroneTime").value || "0h 0min",
        travelAir: document.getElementById("editAir").value || "0h 0min",
        travelGround: document.getElementById("editGround").value || "0h 0min",
        travelPara: document.getElementById("editPara").value || "0 Jumps",
        travelMap: document.getElementById("editMap").value || "0%"
    };
    database.ref(`ghost_squad/operators/${currentSelectedUser}`).update(updates).then(() => {
        document.getElementById("editStatsPanel").classList.add("hidden");
    });
}

function applyConditionalTypographyLogic(outlineColor, fontStyle) {
    const textNodes = document.querySelectorAll(".outline-text");
    textNodes.forEach(node => {
        if (fontStyle !== "default") node.style.fontFamily = fontStyle; else node.style.fontFamily = "";
        if (outlineColor) {
            node.style.textShadow = `-1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor}`;
            node.style.fontWeight = "normal"; 
        } else { textNodes.style.textShadow = "none"; node.style.fontWeight = ""; }
    });
}

function evaluateDynamicTimeTheme() {
    const currentThemeCookie = getCookiePreference("ui_theme_mode_setting");
    if (currentThemeCookie) {
        document.getElementById("themeModeSelect").value = currentThemeCookie; executeThemeChangeLogic(currentThemeCookie); return;
    }
    const deviceHours = new Date().getHours(); executeThemeChangeLogic((deviceHours >= 18 || deviceHours < 6) ? "dark" : "bright");
}

function executeThemeChangeLogic(themeMode) {
    if (themeMode === "dark") { document.body.classList.remove("bright-mode"); document.getElementById("themeModeSelect").value = "dark"; }
    else if (themeMode === "bright") { document.body.classList.add("bright-mode"); document.getElementById("themeModeSelect").value = "bright"; }
    else if (themeMode === "system") { const dark = window.matchMedia("(prefers-color-scheme: dark)").matches; document.body.classList.toggle("bright-mode", !dark); }
}

function setupInterTabSynchronization() {
    window.addEventListener("storage", (event) => {
        if (event.key === "itc_active_ghost_operator" && event.newValue) {
            const incoming = event.newValue; const select = document.getElementById("userSelect");
            if (select && select.value !== incoming) {
                select.value = incoming; currentSelectedUser = incoming;
                if (database) { database.ref(`ghost_squad/operators/${incoming}`).once("value", snapshot => { if (snapshot.exists()) renderTargetProfileData(snapshot.val()); }); }
            }
        }
    });
}

function setCookiePreference(name, value, days) {
    const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + (value || "") + "; expires=" + date.toUTCString() + "; path=/; SameSite=Strict";
}

function getCookiePreference(name) {
    const nameEQ = name + "="; const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i]; while (c.charAt(0)==' ') c = c.substring(1,c.length); if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function loadTypographyPreferences() {
    const col = getCookiePreference("ui_text_outline_color") || "#000000"; const font = getCookiePreference("ui_font_style_setting") || "default";
    document.getElementById("outlineColorPicker").value = col; document.getElementById("fontStyleSelect").value = font;
    setTimeout(() => { applyConditionalTypographyLogic(col, font); }, 200);
}
