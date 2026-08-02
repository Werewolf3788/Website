/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Dynamic Engine (GitHub JSON Stream)
   Firebase Project: entertainment-71888
   ============================================================================ */

// 1. Firebase Credentials (entertainment-71888)
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

// Active Application State
let activeOperator = localStorage.getItem('active_gaming_nickname') || "Werewolf3788";
let activePlatform = localStorage.getItem('active_gaming_platform') || "pc";
let activeCategory = "WEAPON";
let dynamicJsonData = null; // Store GitHub JSON data dynamically

const RAW_JSON_URL = "https://raw.githubusercontent.com/Werewolf3788/Website/main/json/TCGRWildlands.json";

// 2. Application Startup
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Fetch JSON file from GitHub Repository first
    await fetchGitHubJSON();

    // 2. Read URL Parameters for Custom User/Platform Links
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('user')) activeOperator = urlParams.get('user');
    if (urlParams.get('platform')) activePlatform = urlParams.get('platform').toLowerCase();

    localStorage.setItem('active_gaming_nickname', activeOperator);
    localStorage.setItem('active_gaming_platform', activePlatform);

    // 3. Connect to Firebase Anonymously & Stream Data
    auth.signInAnonymously().then(() => {
        console.log(`✓ Connected to Firebase (entertainment-71888). Active: ${activeOperator} [${activePlatform.toUpperCase()}]`);
        setupControlDropdowns();
        attachLivePlatformStreams(activeOperator, activePlatform);
    }).catch(err => {
        console.warn("Auth Notice:", err.message);
        setupControlDropdowns();
        attachLivePlatformStreams(activeOperator, activePlatform);
    });

    setupUIEvents();
});

// 3. Fetch GitHub JSON File Live
async function fetchGitHubJSON() {
    try {
        const response = await fetch(`${RAW_JSON_URL}?v=${Date.now()}`);
        if (response.ok) {
            dynamicJsonData = await response.json();
            console.log("✓ Dynamic TCGRWildlands.json successfully loaded from GitHub!");
            populateWeaponDropdownsFromJSON();
        }
    } catch (e) {
        console.warn("Could not fetch raw GitHub JSON file. Operating on live database fallback.", e.message);
    }
}

// 4. Populate Dropdowns Dynamically from JSON
function populateWeaponDropdownsFromJSON() {
    const fav1 = document.getElementById("editFav1");
    const fav2 = document.getElementById("editFav2");
    if (!fav1 || !fav2) return;

    fav1.innerHTML = ""; fav2.innerHTML = "";

    // Pull weapon list from JSON if present, or fallback to default list
    const weapons = (dynamicJsonData && dynamicJsonData.weapons) ? dynamicJsonData.weapons : [
        "P45T (Handgun)", "M40A5 (Sniper Rifle)", "M4A1 (Assault Rifle)", "P416 (Assault Rifle)", 
        "AK-47 (Assault Rifle)", "ACR (Assault Rifle)", "HTI (Sniper Rifle)", "SR-25 (Sniper Rifle)",
        "MP5 (Submachine Gun)", "Vector .45 ACP (SMG)", "Stoner LMG (Machine Gun)"
    ];

    weapons.forEach(w => {
        const weaponName = (typeof w === 'object') ? (w.name || w.title) : w;
        fav1.appendChild(new Option(weaponName, weaponName));
        fav2.appendChild(new Option(weaponName, weaponName));
    });
}

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

// 5. Live Firebase Streams with JSON Auto-Seeding
function attachLivePlatformStreams(operatorKey, platformKey) {
    const basePath = `users/${operatorKey}/platform/${platformKey}`;

    // Stream Profile Stats
    rtdb.ref(`${basePath}/stats`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            renderStatsUI(snapshot.val());
        } else {
            // Get default profile from JSON or fallback
            const defaultStats = (dynamicJsonData && dynamicJsonData.defaultStats) ? dynamicJsonData.defaultStats : {
                onlineId: operatorKey,
                platform: platformKey.toUpperCase(),
                level: 5,
                playstyle: "Raider",
                avgDist: "38 m",
                tactical: 100,
                stealth: 74,
                lifetime: "0h 20min",
                longestShot: "89 m",
                precision: 8,
                favWeapon: "P45T",
                favWeapon2: "M40A5",
                revives: 0,
                explosiveKills: 0,
                droneTime: "0h 8min",
                airTravel: "0h 7min",
                groundTravel: "0h 7min",
                paraTravel: "0 Jumps",
                mapDisc: "5%"
            };
            rtdb.ref(`${basePath}/stats`).set(defaultStats);
            renderStatsUI(defaultStats);
        }
    });

    // Stream Skill Trees from Firebase / JSON
    rtdb.ref(`${basePath}/skills`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            renderSkillsUI(snapshot.val());
        } else if (dynamicJsonData && dynamicJsonData.skills) {
            // Automatically seed brand new database using JSON blueprints!
            rtdb.ref(`${basePath}/skills`).set(dynamicJsonData.skills);
            renderSkillsUI(dynamicJsonData.skills);
        }
    });
}

// 6. Skill Node Toggle Mutator
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

    rtdb.ref().update(updates)
        .then(() => console.log(`✓ Skill Updated: ${category} Node [${itemIndex}] for ${activeOperator} on ${activePlatform}`))
        .catch(err => console.error("Firebase Update Error:", err));
};

// 7. Render UI Functions
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

    // Pre-fill keyboard form inputs
    const setVal = (id, val) => {
        const input = document.getElementById(id);
        if (input && val !== undefined) input.value = val;
    };

    setVal("editPlaystyle", data.playstyle);
    setVal("editAvgDist", data.avgDist);
    setVal("editTactical", data.tactical);
    setVal("editStealth", data.stealth);
    setVal("editLifetime", data.lifetime);
    setVal("editLongest", data.longestShot);
    setVal("editPrecision", data.precision);
    setVal("editFav1", data.favWeapon);
    setVal("editFav2", data.favWeapon2);
    setVal("editRevives", data.revives);
    setVal("editExplosiveKills", data.explosiveKills);
    setVal("editDroneTime", data.droneTime);
    setVal("editAir", data.airTravel);
    setVal("editGround", data.groundTravel);
    setVal("editPara", data.paraTravel);
    setVal("editMap", data.mapDisc);
    setVal("editTierLevel", data.level);
}

function renderSkillsUI(skillsData) {
    const grid = document.getElementById("skillsTreeGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const categoryNodes = skillsData[activeCategory] || (dynamicJsonData && dynamicJsonData.skills ? dynamicJsonData.skills[activeCategory] : []);

    if (!Array.isArray(categoryNodes) || categoryNodes.length === 0) {
        grid.innerHTML = `<div style="color:#8a99ad; text-align:center; padding:20px; width:100%;">No entries mapped under '${activeCategory}'.</div>`;
        return;
    }

    categoryNodes.forEach((skill, index) => {
        if (!skill) return;
        const currentRank = parseInt(skill.current) || 0;
        const maxRank = parseInt(skill.max) || 1;
        const isMaxed = currentRank === maxRank;

        const card = document.createElement("div");
        card.className = `skill-card unlocked ${isMaxed ? 'maxed' : ''} ${skill.epic ? 'epic-card' : ''}`;
        card.innerHTML = `
            <div class="card-top-action">
                <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name}</h4>
                ${skill.location ? `<span style="font-size:11px; color:#8a99ad; display:block; margin-top:2px;">📍 ${skill.location}</span>` : ''}
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
        renderSkillsUI(snap.exists() ? snap.val() : (dynamicJsonData && dynamicJsonData.skills ? dynamicJsonData.skills : {}));
    });
};

function setupUIEvents() {
    const toggleBtn = document.getElementById("toggleEditStats");
    const editPanel = document.getElementById("editStatsPanel");
    if (toggleBtn && editPanel) {
        toggleBtn.addEventListener("click", () => editPanel.classList.toggle("hidden"));
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
                console.log("✓ Profile inputs updated successfully!");
                if (editPanel) editPanel.classList.add("hidden");
            }).catch(err => console.error("Save Error:", err));
        });
    }
}
