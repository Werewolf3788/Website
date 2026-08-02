/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands - Instant Seed & Realtime Engine
   Target Firebase: entertainment-71888
   ============================================================================ */

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const rtdb = firebase.database();

let activeOperator = localStorage.getItem('active_gaming_nickname') || "Werewolf3788";
let activePlatform = localStorage.getItem('active_gaming_platform') || "pc";
let activeCategory = "WEAPON";

// Hardcoded In-Game Skill Trees Blueprint
const DEFAULT_SKILLS = {
    "WEAPON": [
        { name: "Stable Aim", current: 1, max: 3, collected: true },
        { name: "Hip Fire Spread", current: 2, max: 3, collected: false },
        { name: "Grenade Launcher", current: 1, max: 1, collected: true },
        { name: "Ammo Capacity", current: 2, max: 4, collected: false },
        { name: "VHK Destruction", current: 1, max: 3, collected: false },
        { name: "Adv Suppressor", current: 1, max: 1, collected: true },
        { name: "Time to Aim", current: 1, max: 3, collected: false },
        { name: "Ranged Elite (Epic)", current: 1, max: 1, collected: false, epic: true }
    ],
    "DRONE": [
        { name: "Battery", current: 2, max: 4, collected: true },
        { name: "Night Vision", current: 1, max: 1, collected: true },
        { name: "Range", current: 3, max: 4, collected: true },
        { name: "Speed", current: 1, max: 3, collected: false },
        { name: "Mark Area", current: 1, max: 3, collected: false },
        { name: "Medic Drone (Epic)", current: 1, max: 1, collected: false, epic: true }
    ],
    "ITEM": [
        { name: "Parachute", current: 1, max: 1, collected: true },
        { name: "Binocular 200m", current: 1, max: 1, collected: true },
        { name: "Mine", current: 1, max: 1, collected: true },
        { name: "Frag Grenade", current: 2, max: 3, collected: false },
        { name: "C4", current: 1, max: 1, collected: true },
        { name: "Explosion Radius (Epic)", current: 1, max: 1, collected: false, epic: true }
    ],
    "PHYSICAL": [
        { name: "Stamina", current: 2, max: 3, collected: true },
        { name: "No Pain", current: 1, max: 3, collected: true },
        { name: "Car Shield", current: 1, max: 3, collected: false },
        { name: "Bullet Resistance", current: 2, max: 4, collected: false },
        { name: "Faster Regen (Epic)", current: 1, max: 1, collected: false, epic: true }
    ],
    "SQUAD": [
        { name: "Revive Speed", current: 2, max: 3, collected: true },
        { name: "Extra Sync Shot", current: 3, max: 3, collected: true },
        { name: "Trained Rebels", current: 1, max: 3, collected: false },
        { name: "Last Chance (Epic)", current: 1, max: 1, collected: false, epic: true }
    ],
    "REBEL": [
        { name: "Vehicle Drop-off", current: 3, max: 3, collected: true },
        { name: "Guns for Hire", current: 2, max: 3, collected: false },
        { name: "Mortar", current: 1, max: 3, collected: false },
        { name: "Spotting", current: 3, max: 3, collected: true }
    ],
    "TROPHY": [
        { name: "Master Ghost Operative", current: 1, max: 1, collected: true },
        { name: "Kingslayer File Collector", current: 1, max: 1, collected: false }
    ]
};

document.addEventListener("DOMContentLoaded", () => {
    populateWeaponDropdowns();
    setupControlDropdowns();
    setupUIEvents();

    auth.signInAnonymously().then(() => {
        attachLivePlatformStreams(activeOperator, activePlatform);
    }).catch(err => {
        attachLivePlatformStreams(activeOperator, activePlatform);
    });
});

function setupControlDropdowns() {
    const userSelector = document.getElementById("userSelect");
    if (userSelector) {
        userSelector.value = activeOperator;
        userSelector.addEventListener("change", (e) => {
            activeOperator = e.target.value;
            localStorage.setItem('active_gaming_nickname', activeOperator);
            attachLivePlatformStreams(activeOperator, activePlatform);
        });
    }

    const platformSelector = document.getElementById("platformSelect");
    if (platformSelector) {
        platformSelector.value = activePlatform;
        platformSelector.addEventListener("change", (e) => {
            activePlatform = e.target.value;
            localStorage.setItem('active_gaming_platform', activePlatform);
            attachLivePlatformStreams(activeOperator, activePlatform);
        });
    }
}

function attachLivePlatformStreams(operatorKey, platformKey) {
    const basePath = `users/${operatorKey}/platform/${platformKey}`;

    rtdb.ref(`${basePath}/stats`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            renderStatsUI(snapshot.val());
        }
    });

    rtdb.ref(`${basePath}/skills`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            renderSkillsUI(snapshot.val());
        } else {
            rtdb.ref(`${basePath}/skills`).set(DEFAULT_SKILLS);
            renderSkillsUI(DEFAULT_SKILLS);
        }
    });
}

window.mutateSkillNode = function(category, itemIndex, currentRank, maxRank, isCollected) {
    let nextRank = currentRank + 1;
    let nextCollected = isCollected;

    if (nextRank > maxRank) {
        nextRank = 0;
        nextCollected = !isCollected;
    }

    const targetPath = `users/${activeOperator}/platform/${activePlatform}/skills/${category}/${itemIndex}`;
    const updates = {};
    updates[`${targetPath}/current`] = nextRank;
    updates[`${targetPath}/collected`] = nextCollected;

    rtdb.ref().update(updates);
};

function renderStatsUI(data) {
    if (!data) return;
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val !== undefined && val !== null ? val : "--";
    };

    setTxt("operatorName", data.onlineId || activeOperator);
    setTxt("tierLevel", data.level || "05");
    setTxt("playstyleType", data.playstyle || "Raider");
    setTxt("avgKillDist", data.avgDist || "38 m");
    setTxt("tacticalValue", (data.tactical || 0) + "%");
    setTxt("stealthValue", (data.stealth || 0) + "%");
    setTxt("statLifetime", data.lifetime || "0h 20min");
    setTxt("longestShot", data.longestShot || "89 m");
    setTxt("precisionValue", (data.precision || 0) + "%");
    setTxt("favWeapon", data.favWeapon || "P45T");
    setTxt("favWeapon2", data.favWeapon2 || "M40A5");
    setTxt("teammatesRevived", (data.revives || 0) + " Teammates");
    setTxt("c4MineKills", (data.explosiveKills || 0) + " Kills");
    setTxt("statDroneUsed", data.droneTime || "0h 8min");
    setTxt("travelAir", data.airTravel || "0h 7min");
    setTxt("travelGround", data.groundTravel || "0h 7min");
    setTxt("travelPara", data.paraTravel || "0 Jumps");
    setTxt("travelMap", data.mapDisc || "5%");

    const tacBar = document.getElementById("tacticalBar");
    if (tacBar) tacBar.style.width = `${data.tactical || 0}%`;
    const stBar = document.getElementById("stealthBar");
    if (stBar) stBar.style.width = `${data.stealth || 0}%`;
    const prBar = document.getElementById("precisionBar");
    if (prBar) prBar.style.width = `${data.precision || 0}%`;
}

function renderSkillsUI(skillsData) {
    const grid = document.getElementById("skillsTreeGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const categoryNodes = skillsData[activeCategory] || DEFAULT_SKILLS[activeCategory] || [];

    categoryNodes.forEach((skill, index) => {
        if (!skill) return;
        const currentRank = parseInt(skill.current) || 0;
        const maxRank = parseInt(skill.max) || 1;
        const isMaxed = currentRank === maxRank;

        const card = document.createElement("div");
        card.className = `skill-card unlocked ${isMaxed ? 'maxed' : ''}`;
        card.innerHTML = `
            <div class="card-top-action">
                <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name}</h4>
                <div class="skill-meta-row" style="margin-top:8px;">
                    <div class="skill-rank-indicators">
                        ${Array.from({ length: maxRank }).map((_, rIdx) => `
                            <div class="rank-dot ${rIdx < currentRank ? 'active' : ''}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card-bottom-action">
                <button class="medal-toggle-btn ${skill.collected ? 'medal-earned' : ''}" 
                        onclick="mutateSkillNode('${activeCategory}', ${index}, ${currentRank}, ${maxRank}, ${!!skill.collected})">
                    ⭐
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.switchSkillCategory = function(categoryName) {
    activeCategory = categoryName;
    document.querySelectorAll(".tab-link").forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(categoryName)) {
            btn.classList.add("active");
        }
    });

    rtdb.ref(`users/${activeOperator}/platform/${activePlatform}/skills`).once("value").then(snap => {
        renderSkillsUI(snap.exists() ? snap.val() : DEFAULT_SKILLS);
    });
};

function populateWeaponDropdowns() {
    const fav1 = document.getElementById("editFav1");
    const fav2 = document.getElementById("editFav2");
    if (!fav1 || !fav2) return;

    fav1.innerHTML = ""; fav2.innerHTML = "";
    const weapons = ["P45T", "M40A5", "M4A1", "P416", "AK-47", "ACR", "HTI", "SR-25", "MP5", "Vector .45"];
    weapons.forEach(w => {
        fav1.appendChild(new Option(w, w));
        fav2.appendChild(new Option(w, w));
    });
}

function setupUIEvents() {
    const toggleBtn = document.getElementById("toggleEditStats");
    const editPanel = document.getElementById("editStatsPanel");
    if (toggleBtn && editPanel) {
        toggleBtn.addEventListener("click", () => {
            editPanel.classList.toggle("hidden");
        });
    }

    const saveBtn = document.getElementById("saveStatsBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

            const updates = {
                onlineId: activeOperator,
                platform: activePlatform.toUpperCase(),
                level: parseInt(getVal("editTierLevel")) || 5,
                playstyle: getVal("editPlaystyle") || "Raider",
                avgDist: getVal("editAvgDist") || "38 m",
                tactical: parseInt(getVal("editTactical")) || 100,
                stealth: parseInt(getVal("editStealth")) || 74,
                lifetime: getVal("editLifetime") || "0h 20min",
                longestShot: getVal("editLongest") || "89 m",
                precision: parseInt(getVal("editPrecision")) || 8,
                favWeapon: getVal("editFav1") || "P45T",
                favWeapon2: getVal("editFav2") || "M40A5",
                revives: parseInt(getVal("editRevives")) || 0,
                explosiveKills: parseInt(getVal("editExplosiveKills")) || 0,
                droneTime: getVal("editDroneTime") || "0h 8min",
                airTravel: getVal("editAir") || "0h 7min",
                groundTravel: getVal("editGround") || "0h 7min",
                paraTravel: getVal("editPara") || "0 Jumps",
                mapDisc: getVal("editMap") || "5%"
            };

            rtdb.ref(`users/${activeOperator}/platform/${activePlatform}/stats`).update(updates).then(() => {
                if (editPanel) editPanel.classList.add("hidden");
            });
        });
    }
}
