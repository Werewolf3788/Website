/* ============================================================================
   File: app.js
   Description: Ghost Recon Wildlands Hub Engine
   Architecture: Firebase Firestore Real-Time Engine (entertainment-71888)
   Path Structure: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- TARGET FIREBASE SDK CONFIGURATION (entertainment-71888) ---
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
let currentSelectedUser = localStorage.getItem('active_gaming_nickname') || "Werewolf3788"; 
let currentPlatform = "playstation"; 
let selectedCategory = "WEAPON";
let unsubscribers = [];

const SQUAD_PROFILES = {};

/* === App Initialization === */
document.addEventListener("DOMContentLoaded", async () => {
    populateWeaponSelectionDropdowns();
    setupInterfaceControls();
    await fetchGitHubJSONData();
    await initializeFirebaseApp();
});

async function fetchGitHubJSONData() {
    try {
        const jsonUrl = 'https://raw.githubusercontent.com/Werewolf3788/Website/main/json/TCGRWildlands.json';
        const response = await fetch(jsonUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.profiles) {
                Object.assign(SQUAD_PROFILES, data.profiles);
            }
            updateOperatorDropdownList(SQUAD_PROFILES);
        }
    } catch (e) {
        console.warn("Notice: Operating on live Firestore datasets:", e.message);
    }
}

async function initializeFirebaseApp() {
    try {
        const app = initializeApp(firebaseConfig, 'Wildlands-Engine-App');
        auth = getAuth(app);
        db = getFirestore(app);

        // Anonymous background auth allows instant Firestore reads/writes
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

    const activeUsers = Object.keys(SQUAD_PROFILES).length > 0 
        ? Object.keys(SQUAD_PROFILES) 
        : ['Werewolf3788', 'Raymystyro', 'terrdog420', 'DesdemonaTiger'];

    activeUsers.forEach(profileKey => {
        // Path: /users/{username}/platform/{platform}/progress/T.C.G.R.Wildlands
        const userProgressRef = doc(db, 'users', profileKey, 'platform', currentPlatform, 'progress', GAME_ID);

        const unsub = onSnapshot(userProgressRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                SQUAD_PROFILES[profileKey] = data;
                if (profileKey === currentSelectedUser) {
                    renderTargetProfileData(data);
                }
            } else if (profileKey === currentSelectedUser) {
                syncToFirestore();
            }
        }, (err) => {
            console.warn(`Firestore listener notice for ${profileKey} [${currentPlatform}]:`, err.message);
        });

        unsubscribers.push(unsub);
    });
}

function populateWeaponSelectionDropdowns() {
    const primarySelect = document.getElementById("profileFavWeapon") || document.getElementById("editFav1");
    const secondarySelect = document.getElementById("profileFavWeapon2") || document.getElementById("editFav2");
    if (!primarySelect || !secondarySelect) return;
    
    primarySelect.innerHTML = ""; secondarySelect.innerHTML = "";

    const weapons = [
        "P416 (Starting Weapon)", "AK-47 (Libertad)", "556xi (Caimanes)", "ACR (Media Luna)", "M4A1 (Flor De Oro)",
        "M40A5 (Itacua)", "SR-25 (Caimanes)", "HTI (Montuyoc)", "MP5 (Starting Weapon)", "Vector .45 ACP (Media Luna)"
    ];

    weapons.forEach(w => {
        const opt1 = document.createElement("option"); opt1.value = w; opt1.textContent = w; primarySelect.appendChild(opt1);
        const opt2 = document.createElement("option"); opt2.value = w; opt2.textContent = w; secondarySelect.appendChild(opt2);
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

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.value = val;
            else el.textContent = val;
        }
    };

    setVal("operatorName", operator.name || currentSelectedUser);
    setVal("tierLevel", operator.tier || 1);
    setVal("playstyleType", operator.playstyle || "OVERWATCH");
    setVal("avgKillDist", (operator.avgKillDist || 0) + "m");
    setVal("tacticalValue", (operator.tactical || 0) + "%");
    setVal("stealthValue", (operator.stealth || 0) + "%");
    setVal("statLifetime", operator.lifetime || "0h");
    setVal("longestShot", (operator.longestShot || 0) + "m");
    setVal("precisionValue", (operator.precision || 0) + "%");
    setVal("favWeapon", operator.favWeapon || "P416");
    setVal("favWeapon2", operator.favWeapon2 || "MP5");
    setVal("teammatesRevived", operator.teammatesRevived || 0);
    setVal("c4MineKills", operator.c4MineKills || 0);
    setVal("statDroneUsed", operator.droneUsed || "0h");
    setVal("travelAir", operator.travelAir || "0h");
    setVal("travelGround", operator.travelGround || "0h");
    setVal("travelPara", operator.travelPara || "0 Jumps");
    setVal("travelMap", operator.travelMap || "0%");

    const tacBar = document.getElementById("tacticalBar");
    if (tacBar) tacBar.style.width = `${operator.tactical || 0}%`;
    const stBar = document.getElementById("stealthBar");
    if (stBar) stBar.style.width = `${operator.stealth || 0}%`;
    const prBar = document.getElementById("precisionBar");
    if (prBar) prBar.style.width = `${operator.precision || 0}%`;
}

function setupInterfaceControls() {
    const userSelect = document.getElementById("userSelect");
    if (userSelect) {
        userSelect.addEventListener("change", (e) => {
            currentSelectedUser = e.target.value; 
            localStorage.setItem('active_gaming_nickname', currentSelectedUser);
            if (SQUAD_PROFILES[currentSelectedUser]) {
                renderTargetProfileData(SQUAD_PROFILES[currentSelectedUser]);
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

    const editBtn = document.getElementById("toggleEditStats");
    const editPanel = document.getElementById("editStatsPanel");
    if (editBtn && editPanel) {
        editBtn.addEventListener("click", () => editPanel.classList.toggle("hidden"));
    }

    const saveBtn = document.getElementById("saveStatsBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            pushFormUpdateToState();
            syncToFirestore();
            if (editPanel) editPanel.classList.add("hidden");
        });
    }
}

function pushFormUpdateToState() {
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    const updatedObj = {
        name: currentSelectedUser,
        tierMode: getVal("editTierMode") || "off",
        tier: parseInt(getVal("editTierLevel")) || 1,
        playstyle: getVal("editPlaystyle") || "Tactical Operative",
        avgKillDist: parseInt(getVal("editAvgDist")) || 0,
        tactical: parseInt(getVal("editTactical")) || 0,
        stealth: parseInt(getVal("editStealth")) || 0,
        lifetime: getVal("editLifetime") || "0h",
        longestShot: parseInt(getVal("editLongest")) || 0,
        precision: parseInt(getVal("editPrecision")) || 0,
        favWeapon: getVal("editFav1") || "P416",
        favWeapon2: getVal("editFav2") || "MP5",
        teammatesRevived: parseInt(getVal("editRevives")) || 0,
        c4MineKills: parseInt(getVal("editExplosiveKills")) || 0,
        droneUsed: getVal("editDroneTime") || "0h",
        travelAir: getVal("editAir") || "0h",
        travelGround: getVal("editGround") || "0h",
        travelPara: getVal("editPara") || "0 Jumps",
        travelMap: getVal("editMap") || "0%"
    };

    SQUAD_PROFILES[currentSelectedUser] = Object.assign(SQUAD_PROFILES[currentSelectedUser] || {}, updatedObj);
    renderTargetProfileData(SQUAD_PROFILES[currentSelectedUser]);
}

async function syncToFirestore() {
    if (!db) return;

    try {
        const payload = SQUAD_PROFILES[currentSelectedUser];
        if (!payload) return;

        const platformRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform);
        const userProgressRef = doc(db, 'users', currentSelectedUser, 'platform', currentPlatform, 'progress', GAME_ID);
        const userRef = doc(db, 'users', currentSelectedUser);

        await setDoc(userRef, { displayName: currentSelectedUser, lastUpdated: new Date().toISOString() }, { merge: true });
        await setDoc(platformRef, { platform: currentPlatform, lastActive: new Date().toISOString() }, { merge: true });
        await setDoc(userProgressRef, { ...payload, user: currentSelectedUser, platform: currentPlatform, gameId: GAME_ID, lastUpdated: new Date().toISOString() }, { merge: true });

        console.log(`✓ Synchronized to Firestore (entertainment-71888): ${currentSelectedUser} [${currentPlatform}]`);
    } catch (error) {
        console.error("Firestore Sync Error:", error);
    }
}
