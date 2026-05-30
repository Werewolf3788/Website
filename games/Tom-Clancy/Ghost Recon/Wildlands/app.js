/**
 * Ghost Recon Wildlands Progression Hub Engine
 * Verification: NYT-20260530-0239
 * * NO STRIPPING, NO COMPRESSING, DON'T CHANGE WHAT I DIDN'T SAY TO CHANGE
 * (Updated Drone tree data tracking structure array to represent 13 specific skill lines)
 */

// Global Variables Configuration Space Definitions
let database;
let currentSelectedUser = "";
let selectedCategory = "WEAPON";

// 1. Initial Default Tactical Profiles Framework Data Structure
const DEFAULT_SQUAD_PROFILES = {
    "Werewolf3788": {
        name: "Werewolf3788",
        tier: 41,
        playstyle: "Overwatch",
        tactical: 100,
        stealth: 52,
        avgKillDist: "73 m",
        longestShot: "389 m",
        teammatesRevived: 132,
        c4MineKills: 139,
        skills: {
            "WEAPON": [
                { id: "stable_aim", name: "Stable Aim", current: 4, max: 4 },
                { id: "hip_fire", name: "Hip Fire Spread", current: 2, max: 4 },
                { id: "grenade_launcher", name: "Grenade Launcher", current: 1, max: 1 },
                { id: "ammo_capacity", name: "Ammo Capacity", current: 4, max: 4 },
                { id: "vhc_destruction", name: "VHC Destruction", current: 4, max: 4 }
            ],
            "DRONE": [
                { id: "battery_increase", name: "Battery Increase", current: 4, max: 4 },
                { id: "night_vision", name: "Night Vision", current: 1, max: 1 },
                { id: "range", name: "Range", current: 4, max: 5 }, // 4 + Bonus Medal
                { id: "speed", name: "Speed", current: 2, max: 3 }, // 2 + Bonus Medal
                { id: "mark_area", name: "Mark Area", current: 4, max: 5 }, // 4 + Bonus Medal
                { id: "stealth", name: "Stealth", current: 1, max: 1 },
                { id: "cooldown", name: "Cooldown", current: 5, max: 5 }, // 4 + Bonus Medal (Maxed)
                { id: "noisemaker", name: "NoiseMaker", current: 2, max: 4 },
                { id: "zoom", name: "Zoom", current: 1, max: 1 },
                { id: "explosive", name: "Explosive", current: 2, max: 4 },
                { id: "emp", name: "EMP", current: 3, max: 4 },
                { id: "armor", name: "Armor", current: 4, max: 5 }, // 3 + Bonus Medal (Represented as 4/5)
                { id: "thermal_vision", name: "Thermal Vision", current: 1, max: 1 }
            ],
            "ITEM": [
                { id: "parachute", name: "Parachute Deployment", current: 1, max: 1 },
                { id: "binoc_zoom", name: "Binocular Zoom", current: 2, max: 3 },
                { id: "mine_capacity", name: "Mine Inventory", current: 4, max: 4 },
                { id: "frag_grenade", name: "Frag Grenade Boost", current: 4, max: 4 }
            ],
            "PHYSICAL": [
                { id: "stamina", name: "Stamina Duration", current: 3, max: 4 },
                { id: "no_pain", name: "No Pain Threshold", current: 1, max: 1 },
                { id: "quiet_running", name: "Quiet Running", current: 3, max: 4 },
                { id: "bullet_resistance", name: "Bullet Resistance", current: 4, max: 4 }
            ],
            "SQUAD": [
                { id: "revive_speed", name: "Revive Speed", current: 2, max: 4 },
                { id: "extra_sync", name: "Extra Sync Shot Slot", current: 3, max: 3 },
                { id: "born_leader", name: "Born Leader Aura", current: 2, max: 4 }
            ]
        }
    },
    "DesdemonaTiger": {
        name: "DesdemonaTiger",
        tier: 42,
        playstyle: "Overwatch",
        tactical: 17,
        stealth: 53,
        avgKillDist: "54 m",
        longestShot: "481 m",
        teammatesRevived: 43,
        c4MineKills: 42,
        skills: {
            "WEAPON": [
                { id: "stable_aim", name: "Stable Aim", current: 2, max: 4 },
                { id: "hip_fire", name: "Hip Fire Spread", current: 1, max: 4 },
                { id: "grenade_launcher", name: "Grenade Launcher", current: 0, max: 1 }
            ],
            "DRONE": [
                { id: "battery_increase", name: "Battery Increase", current: 4, max: 4 },
                { id: "night_vision", name: "Night Vision", current: 1, max: 1 }
            ]
        }
    }
};

// 2. Core Operational Setup Implementation Routine
document.addEventListener("DOMContentLoaded", () => {
    initializeFirebaseApp();
    setupInterfaceControls();
    evaluateDynamicTimeTheme();
    loadTypographyPreferences();
    setupInterTabSynchronization();
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
}

// 3. Database Synchronization Operations Module Loop
function synchronizeWithFirebaseDatabase() {
    const squadRef = database.ref("ghost_squad/operators");
    
    squadRef.once("value", snapshot => {
        if (!snapshot.exists()) {
            squadRef.set(DEFAULT_SQUAD_PROFILES);
        }
    });

    squadRef.on("value", snapshot => {
        const directoryData = snapshot.val();
        if (directoryData) {
            updateOperatorDropdownList(directoryData);
        }
    });
}

function loadLocalSquadDirectory() {
    updateOperatorDropdownList(DEFAULT_SQUAD_PROFILES);
}

// 4. Component Presentation Mutation Handling Engine Rules
function updateOperatorDropdownList(profiles) {
    const selectorElement = document.getElementById("userSelect");
    const activeSelectionBeforeUpdate = selectorElement.value || Object.keys(profiles)[0];
    
    selectorElement.innerHTML = "";
    Object.keys(profiles).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = profiles[key].name;
        selectorElement.appendChild(option);
    });
    
    selectorElement.value = activeSelectionBeforeUpdate;
    currentSelectedUser = activeSelectionBeforeUpdate;
    renderTargetProfileData(profiles[activeSelectionBeforeUpdate]);
}

function renderTargetProfileData(operator) {
    if (!operator) return;

    document.getElementById("operatorName").textContent = operator.name;
    document.getElementById("tierLevel").textContent = operator.tier;
    document.getElementById("playstyleType").textContent = operator.playstyle;
    
    // Percent indicators mutation mechanics rule alignment configurations
    document.getElementById("tacticalValue").textContent = `${operator.tactical}%`;
    document.getElementById("tacticalBar").style.width = `${operator.tactical}%`;
    document.getElementById("stealthValue").textContent = `${operator.stealth}%`;
    document.getElementById("stealthBar").style.width = `${operator.stealth}%`;
    
    // Value stats strings configuration mapping blocks logic
    document.getElementById("avgKillDist").textContent = operator.avgKillDist;
    document.getElementById("longestShot").textContent = operator.longestShot;
    document.getElementById("teammatesRevived").textContent = operator.teammatesRevived;
    document.getElementById("c4MineKills").textContent = operator.c4MineKills;

    renderSkillsTree(operator.skills || {});
}

function renderSkillsTree(skillsCollection) {
    const container = document.getElementById("skillsTreeGrid");
    container.innerHTML = "";
    
    const activeCategorySkills = skillsCollection[selectedCategory] || [];
    
    if (activeCategorySkills.length === 0) {
        container.innerHTML = `<p class="empty-notice">No skills unlocked in this specific category tier branch yet.</p>`;
        return;
    }

    activeCategorySkills.forEach((skill, index) => {
        const isMaxed = skill.current >= skill.max;
        const isUnlocked = skill.current > 0;
        
        let cardStatusClass = "skill-card";
        if (isMaxed) cardStatusClass += " maxed";
        else if (isUnlocked) cardStatusClass += " unlocked";

        const card = document.createElement("div");
        card.className = cardStatusClass;
        
        let indicatorsHtml = '<div class="skill-rank-indicators">';
        for (let idx = 1; idx <= skill.max; idx++) {
            indicatorsHtml += `<span class="rank-dot ${idx <= skill.current ? 'active' : ''}"></span>`;
        }
        indicatorsHtml += '</div>';

        card.innerHTML = `
            <h4 class="outline-text">${skill.name}</h4>
            <p style="font-size: 11px; color:#8a99ad; margin-top:4px;">Rank: ${skill.current}/${skill.max}</p>
            ${indicatorsHtml}
        `;

        card.addEventListener("click", () => {
            incrementSkillLevelTrack(selectedCategory, index);
        });

        container.appendChild(card);
    });
}

function switchSkillCategory(categoryKey) {
    selectedCategory = categoryKey;
    document.querySelectorAll(".tab-link").forEach(tab => {
        tab.classList.toggle("active", tab.textContent.toUpperCase() === categoryKey);
    });
    
    if (database) {
        database.ref(`ghost_squad/operators/${currentSelectedUser}`).once("value", snapshot => {
            if (snapshot.exists()) renderTargetProfileData(snapshot.val());
        });
    } else {
        renderTargetProfileData(DEFAULT_SQUAD_PROFILES[currentSelectedUser]);
    }
}

function incrementSkillLevelTrack(category, index) {
    if (database) {
        const skillRef = database.ref(`ghost_squad/operators/${currentSelectedUser}/skills/${category}/${index}`);
        skillRef.once("value", snapshot => {
            if (snapshot.exists()) {
                let currentSkill = snapshot.val();
                if (currentSkill.current < currentSkill.max) {
                    skillRef.child("current").set(currentSkill.current + 1);
                } else {
                    skillRef.child("current").set(0); // Reset loop option functionality toggle state
                }
            }
        });
    } else {
        let skill = DEFAULT_SQUAD_PROFILES[currentSelectedUser].skills[category][index];
        if (skill.current < skill.max) skill.current++;
        else skill.current = 0;
        renderTargetProfileData(DEFAULT_SQUAD_PROFILES[currentSelectedUser]);
    }
}

// 5. Interface Control Mechanisms & Setup Logic UI Hooks Block
function setupInterfaceControls() {
    const userSelect = document.getElementById("userSelect");
    userSelect.addEventListener("change", (e) => {
        currentSelectedUser = e.target.value;
        
        // Named Window Targeting Inter-Tab Communication implementation rule alignment action
        localStorage.setItem("itc_active_ghost_operator", currentSelectedUser);
        
        if (database) {
            database.ref(`ghost_squad/operators/${currentSelectedUser}`).once("value", snapshot => {
                if (snapshot.exists()) renderTargetProfileData(snapshot.val());
            });
        } else {
            renderTargetProfileData(DEFAULT_SQUAD_PROFILES[currentSelectedUser]);
        }
    });

    document.getElementById("toggleUiSettings").addEventListener("click", () => {
        document.getElementById("uiSettingsPanel").classList.toggle("hidden");
    });

    // Theme Selector Dropdowns Listener Logic Core implementation
    document.getElementById("themeModeSelect").addEventListener("change", (e) => {
        const mode = e.target.value;
        setCookiePreference("ui_theme_mode_setting", mode, 30);
        executeThemeChangeLogic(mode);
    });

    // Typography customization outline configuration rules
    document.getElementById("outlineColorPicker").addEventListener("input", (e) => {
        const color = e.target.value;
        setCookiePreference("ui_text_outline_color", color, 30);
        applyConditionalTypographyLogic(color, document.getElementById("fontStyleSelect").value);
    });

    document.getElementById("fontStyleSelect").addEventListener("change", (e) => {
        const font = e.target.value;
        setCookiePreference("ui_font_style_setting", font, 30);
        applyConditionalTypographyLogic(document.getElementById("outlineColorPicker").value, font);
    });
}

// 6. Language & Localization / Typography Logic Layer Interface Controls Implementation
function applyConditionalTypographyLogic(outlineColor, fontStyle) {
    const textNodes = document.querySelectorAll(".outline-text");
    
    textNodes.forEach(node => {
        // Font Selection Routing Mechanics
        if (fontStyle !== "default") {
            node.style.fontFamily = fontStyle;
        } else {
            node.style.fontFamily = ""; // Cascades cleanly onto base definitions structural framework fallback parameters
        }

        // Color Dependency Core Configuration Checking Loop Implementation
        if (outlineColor) {
            node.style.textShadow = `-1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor}`;
            node.style.fontWeight = "normal"; // Force explicit tracking execution overrides state logic safely
        } else {
            node.style.textShadow = "none";
            node.style.fontWeight = ""; // Defaults accurately down into stylesheet system definitions base metrics layer configuration
        }
    });
}

// 7. Auto Night-Mode Rule Infrastructure Block Evaluator Functions
function evaluateDynamicTimeTheme() {
    const currentThemeCookie = getCookiePreference("ui_theme_mode_setting");
    if (currentThemeCookie) {
        document.getElementById("themeModeSelect").value = currentThemeCookie;
        executeThemeChangeLogic(currentThemeCookie);
        return;
    }

    // Default Fallback Evaluator State Routine Initialization Core Device Context execution paths
    const deviceHours = new Date().getHours();
    const isNighttime = deviceHours >= 18 || deviceHours < 6;
    
    if (isNighttime) {
        executeThemeChangeLogic("dark");
        document.getElementById("themeMode
