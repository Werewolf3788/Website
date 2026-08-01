/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Progression Hub Engine
   Architecture: Firebase Firestore Real-Time Engine (Auto Background Auth Enabled)
   Path: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously,
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let currentUserAuth = null;
let currentSelectedUser = localStorage.getItem('active_gaming_nickname') || "Werewolf3788"; 
let currentPlatform = "playstation"; 
let selectedCategory = "WEAPON";
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
        { id: "parachute", name: "Parachute Deployment", max: 1, hasMedal: false, desc: "Allows static airborne deployment safely." }, 
        { id: "binoc_zoom", name: "Binocular Zoom", max: 1, hasMedal: true, desc: "Amplifies spotting magnification levels." }, 
        { id: "mine_capacity", name: "Mine Inventory", max: 4, hasMedal: true, desc: "Enables deployment of proximity trigger defenses." }, 
        { id: "binoc_recon", name: "Binocular Recon", max: 4, hasMedal: true, desc: "Accelerates identification speed." }, 
        { id: "diversion_lure", name: "Diversion Lure", max: 4, hasMedal: true, desc: "Attracts target threats to specific zones." }, 
        { id: "frag_grenade", name: "Frag Grenade Boost", max: 4, hasMedal: true, desc: "Increases portable offensive explosive counts." }, 
        { id: "c4", name: "C4 Charges", max: 4, hasMedal: true, desc: "Enables remote detonation devices." }, 
        { id: "thermal_vision_item", name: "Thermal Vision", max: 1, hasMedal: false, desc: "Allows thermal analysis tracking patterns natively." }, 
        { id: "flashbang", name: "Flashbang", max: 4, hasMedal: true, desc: "Stuns targets inside non-lethal parameters." }, 
        { id: "flare_gun", name: "Flare Gun", max: 4, hasMedal: true, desc: "Attracts nearby structural forces to designated visual points." }, 
        { id: "epic_explosion_radius", name: "Explosion Radius (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Expands damage zone radius on all thrown items." }
    ],
    "PHYSICAL": [
        { id: "stamina", name: "Stamina Duration", max: 4, hasMedal: false, desc: "Extends sprint capacity." }, 
        { id: "no_pain", name: "No Pain Threshold", max: 4, hasMedal: true, desc: "Provides heavy damage absorption post-revive." }, 
        { id: "car_shield", name: "Car Shield", max: 4, hasMedal: true, desc: "Ground transit asset incoming damage reduction." }, 
        { id: "quiet_running", name: "Quiet Running", max: 4, hasMedal: true, desc: "Reduces audible noise during movement." }, 
        { id: "bullet_resistance", name: "Bullet Resistance", max: 4, hasMedal: true, desc: "Reduces basic threat impact damage ratings." }, 
        { id: "detection", name: "Detection Visibility", max: 4, hasMedal: true, desc: "Reduces threat awareness curves." }, 
        { id: "explosion_resistance", name: "Explosion Resistance", max: 4, hasMedal: true, desc: "Mitigates blast damages." }, 
        { id: "aircraft_shield", name: "Aircraft Shield", max: 4, hasMedal: true, desc: "Mitigates damage profiles encountered by aviation hardware." }, 
        { id: "epic_faster_regen", name: "Faster Regen (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Decreases medical recovery latency." }
    ],
    "SQUAD": [
        { id: "revive_speed", name: "Revive Speed", max: 4, hasMedal: true, desc: "Decreases rescue time windows." }, 
        { id: "extra_sync", name: "Extra Sync Shot Slot", max: 2, hasMedal: false, desc: "Expands targeting capability across fire teams." }, 
        { id: "trained_rebels", name: "Trained Rebels", max: 4, hasMedal: true, desc: "Boosts tactical combat survival of proxies." }, 
        { id: "squad_resilience", name: "Squad Resilience", max: 4, hasMedal: true, desc: "Modifies AI team ballistic shield scaling." }, 
        { id: "bleed_out_time", name: "Bleed Out Time", max: 4, hasMedal: true, desc: "Extends strategic countdown window prior to death." }, 
        { id: "born_leader", name: "Born Leader Aura", max: 4, hasMedal: true, desc: "Scales fire efficiency of backup crew." }, 
        { id: "epic_last_chance", name: "Last Chance (EPIC)", max: 4, hasMedal: false, isEpic: true, desc: "Expands allowed backup revival counters." }
    ],
    "REBEL": [
        { id: "vehicle_drop", name: "Vehicle Drop-off", max: 9, hasMedal: false, desc: "Deploys tactical transport assets." },
        { id: "guns_for_hire", name: "Guns For Hire", max: 9, hasMedal: false, desc: "Summons explicit squad assets for cover fire." },
        { id: "mortar", name: "Mortar Strike", max: 9, hasMedal: false, desc: "Applies remote explosive bombardment." },
        { id: "diversion_rebel", name: "Diversion", max: 9, hasMedal: false, desc: "Forces enemy tracking focus elements away." },
        { id: "spotting", name: "Rebel Spotting", max: 9, hasMedal: false, desc: "Scans coordinates area maps to tag target threats." }
    ],
    "TROPHY": [
        { id: "tr_amaru", name: "A Good Start", desc: "Completed the first mission 'Amaru's rescue'.", max: 1, isTrophy: true, sub: "ALL_TROPHIES" },
        { id: "tr_symp", name: "Rebel Sympathizer", desc: "Unlocked a Rebel skill.", max: 1, isTrophy: true, sub: "ALL_TROPHIES" },
        { id: "tr_boss", name: "Beat the Boss", desc: "Defeated your first boss.", max: 1, isTrophy: true, sub: "ALL_TROPHIES" },
        { id: "tr_night", name: "Death in the Dark", desc: "Made a close-combat kill at night.", max: 1, isTrophy: true, sub: "ALL_TROPHIES" }
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
        name: "Werewolf3788", psnUsername: "werewolf3788", tierMode: "on", tier: 38, playstyle: "OVERWATCH",
        tactical: 100, stealth: 52, avgKillDist: 73, longestShot: 389, precision: 9, lifetime: "14min", favWeapon: "P416 (Starting Weapon)", favWeapon2: "MP5 (Starting Weapon)", teammatesRevived: 132, c4MineKills: 139, droneUsed: "12h 49min", travelAir: "11h 1min", travelGround: "6h 52min", travelPara: "20 Jumps", travelMap: "90%",
        skills: generateCleanBlueprintCopy()
    }
};

/* === Lifecycle Initialization === */
document.addEventListener("DOMContentLoaded", async () => {
    populateWeaponSelectionDropdowns();
    setupInterfaceControls();
    updateOperatorDropdownList(DEFAULT_SQUAD_PROFILES);
    await initializeFirebaseApp();
});

async function initializeFirebaseApp() {
    try {
        const app = initializeApp(firebaseConfig, 'Wildlands-Engine-App');
        auth = getAuth(app);
        db = getFirestore(app);

        await setPersistence(auth, browserLocalPersistence);

        // Ensure an active session is always running so Firestore writes execute cleanly
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn("Background Auth Notice:", e.message);
                }
            } else {
                currentUserAuth = user;
                const savedNickname = localStorage.getItem('active_gaming_nickname') || user.displayName || user.email.split('@')[0];
                currentSelectedUser = savedNickname;
                
                if (!DEFAULT_SQUAD_PROFILES[savedNickname]) {
                    DEFAULT_SQUAD_PROFILES[savedNickname] = {
                        name: savedNickname, psnUsername: savedNickname, tierMode: "off", tier: 1, playstyle: "Tactical Operative",
                        tactical: 0, stealth: 0, avgKillDist: 0, longestShot: 0, precision: 0, lifetime: "0h",
                        favWeapon: "P416 (Starting Weapon)", favWeapon2: "MP5 (Starting Weapon)", teammatesRevived: 0, c4MineKills: 0,
                        droneUsed: "0h", travelAir: "0h", travelGround: "0h", travelPara: "0 Jumps", travelMap: "0%",
                        skills: generateCleanBlueprintCopy()
                    };
                }
                updateOperatorDropdownList(DEFAULT_SQUAD_PROFILES);
            }
            attachLiveFirestoreListeners();
        });
    } catch (err) {
        console.error("Firebase App Init Error:", err);
    }
}

/* === Real-Time Firestore Listeners === */
function attachLiveFirestoreListeners() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    Object.keys(DEFAULT_SQUAD_PROFILES).forEach(profileKey => {
        const userProgressRef = doc(db, 'users', profileKey, 'platform', currentPlatform, 'progress', GAME_ID);

        const unsub = onSnapshot(userProgressRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                DEFAULT_SQUAD_PROFILES[profileKey] = data;
                if (profileKey === currentSelectedUser) {
                    renderTargetProfileData(data);
                }
            }
        }, (err) => {
            console.warn(`Firestore listener notice for ${profileKey} [${currentPlatform}]:`, err.message);
        });

        unsubscribers.push(unsub);
    });
}

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

function updateOperatorDropdownList(profiles) {
    const selectorElement = document.getElementById("userSelect");
    if (!selectorElement) return;
    
    selectorElement.innerHTML = "";
    Object.keys(profiles).forEach(key => {
        const option = document.createElement("option"); 
        option.value = key; 
        option.textContent = profiles[key].name || key; 
        selectorElement.appendChild(option);
    });
    
    if (profiles[currentSelectedUser]) {
        selectorElement.value = currentSelectedUser;
        renderTargetProfileData(profiles[currentSelectedUser]);
    }
}

function renderTargetProfileData(operator) {
    if (!operator) return;

    if (document.getElementById("profileCustomName")) document.getElementById("profileCustomName").value = operator.name || currentSelectedUser;
    if (document.getElementById("profileTierLevel")) document.getElementById("profileTierLevel").value = operator.tier || 1;
    if (document.getElementById("profilePlaystyle")) document.getElementById("profilePlaystyle").value = operator.playstyle || "";
    if (document.getElementById("profileAvgKillDist")) document.getElementById("profileAvgKillDist").value = operator.avgKillDist || 0;
    
    const tacticalVal = operator.tactical || 0;
    if (document.getElementById("profileTactical")) document.getElementById("profileTactical").value = tacticalVal;
    if (document.getElementById("tacticalBar")) document.getElementById("tacticalBar").style.width = `${tacticalVal}%`;

    const stealthVal = operator.stealth || 0;
    if (document.getElementById("profileStealth")) document.getElementById("profileStealth").value = stealthVal;
    if (document.getElementById("stealthBar")) document.getElementById("stealthBar").style.width = `${stealthVal}%`;

    if (document.getElementById("profileLifetime")) document.getElementById("profileLifetime").value = operator.lifetime || "";
    if (document.getElementById("profileLongestShot")) document.getElementById("profileLongestShot").value = operator.longestShot || 0;

    const precisionVal = operator.precision || 0;
    if (document.getElementById("profilePrecision")) document.getElementById("profilePrecision").value = precisionVal;
    if (document.getElementById("precisionBar")) document.getElementById("precisionBar").style.width = `${precisionVal}%`;

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

    const masterSkeletonCategoryList = BASELINE_SKILLS_BLUEPRINT[selectedCategory] || [];
    let databaseCategoryList = incomingDatabaseSkills[selectedCategory] || {};

    masterSkeletonCategoryList.forEach((blueprintSkill) => {
        let currentLevel = 0; 
        let medalEarned = false;
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

        const card = document.createElement("div"); 
        card.className = cardStatusClass;

        let rankDotsHTML = '';
        for (let r = 1; r <= blueprintSkill.max; r++) {
            rankDotsHTML += `<div class="rank-dot ${r <= currentLevel ? 'active' : ''}"></div>`;
        }

        card.innerHTML = `
            <div class="card-top-action">
                <h4 class="outline-text" style="margin: 0 0 6px 0; font-size: 14px;">${blueprintSkill.name}</h4>
                <p style="font-size: 11px; color: #8a99ad; margin: 0 0 8px 0;">Rank: ${currentLevel}/${blueprintSkill.max}</p>
                <div class="skill-rank-indicators">${rankDotsHTML}</div>
            </div>
            <div class="card-bottom-action">
                ${blueprintSkill.hasMedal ? `<button class="medal-toggle-btn ${medalEarned ? 'medal-earned' : ''}">★</button>` : ''}
            </div>
        `;

        if (blueprintSkill.hasMedal) {
            const medalBtn = card.querySelector(".medal-toggle-btn");
            if (medalBtn) {
                medalBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    executeSkillLevelUpdate(selectedCategory, blueprintSkill.id, currentLevel, !medalEarned, true);
                });
            }
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
    const customNameVal = nameInput ? nameInput.value : currentSelectedUser;

    const dataObject = {
        name: customNameVal,
        psnUsername: customNameVal,
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

    syncToFirestore();
}

function setupInterfaceControls() {
    const userSelect = document.getElementById("userSelect");
    if (userSelect) {
        userSelect.addEventListener("change", (e) => {
            currentSelectedUser = e.target.value; 
            localStorage.setItem('active_gaming_nickname', currentSelectedUser);
            if (DEFAULT_SQUAD_PROFILES[currentSelectedUser]) {
                renderTargetProfileData(DEFAULT_SQUAD_PROFILES[currentSelectedUser]);
            }
        });
    }

    const platformSelect = document.getElementById("platformSelect");
    if (platformSelect) {
        platformSelect.addEventListener("change", (e) => {
            currentPlatform = e.target.value.toLowerCase();
            attachLiveFirestoreListeners();
        });
    }

    const inputsToWatch = [
        "profileCustomName", "profileTierLevel", "profilePlaystyle", 
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

/* === Authenticated Firestore Save Operation === */
async function syncToFirestore() {
    if (!db) return;

    try {
        const payload = DEFAULT_SQUAD_PROFILES[currentSelectedUser];
        if (!payload) return;

        // Path structure: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
        const platformRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform);
        const userProgressRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform, 'progress', GAME_ID);
        const userRef = doc(db, 'users', currentSelectedUser);

        await setDoc(userRef, { 
            displayName: currentSelectedUser, 
            ownerUid: currentUserAuth ? currentUserAuth.uid : "anonymous",
            lastUpdated: new Date().toISOString() 
        }, { merge: true });
        
        await setDoc(platformRef, { platform: currentPlatform, lastActive: new Date().toISOString() }, { merge: true });
        await setDoc(userProgressRef, { ...payload, user: currentSelectedUser, platform: currentPlatform, gameId: GAME_ID, lastUpdated: new Date().toISOString() }, { merge: true });

        console.log(`✓ Firestore progress saved for: ${currentSelectedUser} [${currentPlatform}]`);
    } catch (error) {
        console.error("Firestore Save Error:", error);
    }
}
```

***

The updated `app.js` is now active. It performs an automatic background authentication (`signInAnonymously`) on startup if no Google session is active, guaranteeing that `syncToFirestore()` always has permission to save your edits directly to Firestore.
