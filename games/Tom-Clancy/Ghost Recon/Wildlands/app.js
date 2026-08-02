/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands - Multi-Platform Cross-Save Engine
   Firebase Project: entertainment-71888
   Features: Separate progress tracking for PC, PlayStation, and Xbox
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

// Default Application State
let activeOperator = localStorage.getItem('active_gaming_nickname') || "Werewolf3788";
let activePlatform = localStorage.getItem('active_gaming_platform') || "pc"; // Options: 'pc', 'playstation', 'xbox'
let activeCategory = "WEAPON";

// 2. Cookie Helpers for Remembering Operator & Platform Preferences
function setCookie(key, value) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 Year Persistence
    document.cookie = `${key}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(key) {
    const name = `${key}=`;
    const decoded = decodeURIComponent(document.cookie);
    const ca = decoded.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return "";
}

// 3. Application Startup Lifecycle
document.addEventListener("DOMContentLoaded", () => {
    // Check URL Parameters for custom direct links (e.g., index.html?user=Werewolf3788&platform=pc)
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const platParam = urlParams.get('platform');

    if (userParam) {
        activeOperator = userParam;
        setCookie('active_operator', activeOperator);
    } else {
        const savedOperator = getCookie('active_operator');
        if (savedOperator) activeOperator = savedOperator;
    }

    if (platParam && ['pc', 'playstation', 'xbox'].includes(platParam.toLowerCase())) {
        activePlatform = platParam.toLowerCase();
        setCookie('active_platform', activePlatform);
    } else {
        const savedPlatform = getCookie('active_platform');
        if (savedPlatform) activePlatform = savedPlatform;
    }

    // Save active state to localStorage
    localStorage.setItem('active_gaming_nickname', activeOperator);
    localStorage.setItem('active_gaming_platform', activePlatform);

    // Background Auth Session
    auth.signInAnonymously().then(() => {
        console.log(`✓ Connected to Firebase. Active: ${activeOperator} [${activePlatform.toUpperCase()}]`);
        setupControlDropdowns();
        attachLivePlatformStreams(activeOperator, activePlatform);
    }).catch(err => {
        console.warn("Auth Notice:", err.message);
        setupControlDropdowns();
        attachLivePlatformStreams(activeOperator, activePlatform);
    });

    setupUIEvents();
});

// 4. Interface Dropdown Selectors
function setupControlDropdowns() {
    const userSelector = document.getElementById("userSelect");
    if (userSelector) {
        userSelector.innerHTML = `
            <option value="Werewolf3788">Kevin (Werewolf3788)</option>
            <option value="Raymystyro">Ray (Raymystyro)</option>
            <option value="terrdog420">TJ (terrdog420)</option>
            <option value="DesdemonaTiger">Marc (DesdemonaTiger)</option>
        `;
        userSelector.value = activeOperator;
        userSelector.addEventListener("change", (e) => {
            activeOperator = e.target.value;
            setCookie('active_operator', activeOperator);
            localStorage.setItem('active_gaming_nickname', activeOperator);
            attachLivePlatformStreams(activeOperator, activePlatform);
        });
    }

    const platformSelector = document.getElementById("platformSelect");
    if (platformSelector) {
        platformSelector.innerHTML = `
            <option value="pc">💻 PC (Ubisoft Connect)</option>
            <option value="playstation">🎮 PlayStation (PS5/PS4)</option>
            <option value="xbox">💚 Xbox (Series X/S/One)</option>
        `;
        platformSelector.value = activePlatform;
        platformSelector.addEventListener("change", (e) => {
            activePlatform = e.target.value;
            setCookie('active_platform', activePlatform);
            localStorage.setItem('active_gaming_platform', activePlatform);
            attachLivePlatformStreams(activeOperator, activePlatform);
        });
    }
}

// 5. Live Firebase Streams Isolated Per Platform Path
function attachLivePlatformStreams(operatorKey, platformKey) {
    const basePath = `users/${operatorKey}/platform/${platformKey}`;

    // Listen to Platform-Specific Stats
    rtdb.ref(`${basePath}/stats`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            renderStatsUI(snapshot.val());
        } else {
            // Default initial profile record for new platforms
            const initStats = {
                onlineId: operatorKey,
                platform: platformKey.toUpperCase(),
                level: 1,
                playstyle: "Tactical Operative",
                avgDist: "100m",
                tactical: 80,
                stealth: 75
            };
            rtdb.ref(`${basePath}/stats`).set(initStats);
            renderStatsUI(initStats);
        }
    });

    // Listen to Platform-Specific Skills Tree
    rtdb.ref(`${basePath}/skills`).on("value", (snapshot) => {
        const skillsData = snapshot.exists() ? snapshot.val() : {};
        renderSkillsUI(skillsData);
    });
}

// 6. Skill Toggle Mutator (Isolated to current platform)
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
        .then(() => console.log(`✓ Updated ${category} [${itemIndex}] for ${activeOperator} on ${activePlatform.toUpperCase()}`))
        .catch(err => console.error("Firebase Update Error:", err));
};

// 7. Render UI Functions
function renderStatsUI(data) {
    if (!data) return;
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || "--";
    };

    setTxt("operatorName", `${data.onlineId || activeOperator}`);
    setTxt("tierLevel", data.level || "1");
    setTxt("playstyleType", data.playstyle || "Tactical Operative");
    setTxt("avgKillDist", data.avgDist || "0m");
    setTxt("tacticalValue", (data.tactical || 0) + "%");
    setTxt("stealthValue", (data.stealth || 0) + "%");

    const tacBar = document.getElementById("tacticalBar");
    if (tacBar) tacBar.style.width = `${data.tactical || 0}%`;
}

function renderSkillsUI(skillsData) {
    const grid = document.getElementById("skillsTreeGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const categoryNodes = skillsData[activeCategory] || [];

    if (!Array.isArray(categoryNodes) || categoryNodes.length === 0) {
        grid.innerHTML = `<div style="color:#8a99ad; text-align:center; padding:20px; width:100%;">No entries recorded for '${activeCategory}' on ${activePlatform.toUpperCase()}.</div>`;
        return;
    }

    categoryNodes.forEach((skill, index) => {
        if (!skill) return;
        const currentRank = parseInt(skill.current) || 0;
        const maxRank = parseInt(skill.max) || 1;
        const isMaxed = currentRank === maxRank;

        const card = document.createElement("div");
        card.className = `skill-card unlocked ${isMaxed ? 'maxed' : ''}`;
        card.innerHTML = `
            <div class="card-top-action">
                <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name || 'Skill Node'}</h4>
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
        renderSkillsUI(snap.exists() ? snap.val() : {});
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
            const updates = {
                onlineId: activeOperator,
                platform: activePlatform.toUpperCase(),
                playstyle: document.getElementById("editPlaystyle")?.value || "Tactical Operative",
                avgDist: document.getElementById("editAvgDist")?.value || "150m",
                tactical: parseInt(document.getElementById("editTactical")?.value) || 85,
                stealth: parseInt(document.getElementById("editStealth")?.value) || 80
            };

            rtdb.ref(`users/${activeOperator}/platform/${activePlatform}/stats`).update(updates).then(() => {
                if (editPanel) editPanel.classList.add("hidden");
            });
        });
    }
}
